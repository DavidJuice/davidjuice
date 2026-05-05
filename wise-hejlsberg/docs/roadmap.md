# Roadmap

This is what's _not_ in Phase 1, why it's not, and how to add it.

## Phase 2 — Python broker bot (paper trading)

**Goal:** Same scoring as the Pine indicator, running in Python, scanning a
watchlist on a schedule, routing paper orders to Alpaca (US stocks + crypto)
and Coinbase Advanced (crypto). No webhooks needed — the bot pulls market
data itself.

### Why a separate Python service

- TradingView free plan can't send webhooks, so we can't push signals out
  of TV.
- TV's screener can't be driven from Pine, so multi-symbol scanning has to
  happen elsewhere.
- Auto-execution requires holding API keys, which has no place in Pine.

### Architecture sketch

```
┌─────────────────┐     yfinance / ccxt     ┌──────────────┐
│ Python bot      │ ◀───────────────────────│ Market data  │
│                 │                          └──────────────┘
│  - watchlist    │
│  - scoring (=)  │     Alpaca SDK           ┌──────────────┐
│  - cooldown     │ ────────────────────────▶│ Paper broker │
│  - PnL tracking │     CCXT                 └──────────────┘
└─────────────────┘
```

Suggested layout:

```
bot/
├── pyproject.toml
├── wise_hejlsberg/
│   ├── data.py         # yfinance + ccxt fetchers, OHLCV cache
│   ├── indicators.py   # MA, RSI, MACD, BB, ATR (numpy/pandas, no TA-Lib req)
│   ├── divergence.py   # pivot detection + regular/hidden divergence
│   ├── volume_profile.py  # bin-based POC/VAH/VAL (mirrors Pine logic)
│   ├── ict.py          # liquidity, FVG, OB, SMT, pin-bar
│   ├── score.py        # Style A + Style B → BUY/SELL verdict
│   ├── broker.py       # Alpaca + Coinbase Advanced wrappers
│   ├── runner.py       # CLI: scan watchlist, place paper orders
│   └── config.py       # weights, thresholds, watchlist, broker creds
└── tests/
    ├── test_score_parity.py  # asserts Python scores match Pine on fixtures
    └── ...
```

### Critical: parity tests

Before letting the bot place a single order, write a parity test that
exports a few hundred bars of OHLCV from TradingView, runs both the Pine
indicator and the Python scorer over them, and asserts the BUY/SELL
verdicts match bar-for-bar. **Without parity, the bot is a different
strategy from the indicator** and you've quietly forked the logic.

### Brokers

| Broker | Stocks | Crypto | API quality | Recommendation |
| --- | --- | --- | --- | --- |
| Alpaca | ✅ | ✅ (US-only spot) | Clean, free paper, websocket | **Start here.** |
| Coinbase Advanced | ❌ | ✅ | Decent REST, no margin | Add when you want a 2nd crypto venue. |
| Binance.US | ❌ | ✅ (limited assets) | Workable but less liquid | Skip unless you specifically need its assets. |

### Watchlist scanner loop

```python
for symbol in watchlist:
    bars = data.fetch(symbol, timeframe="1d", lookback=500)
    verdict = score.compute(bars)        # same logic as Pine
    state   = state_store.get(symbol)
    if verdict == "BUY" and state.cooldown_ok():
        broker.submit(symbol, side="buy", qty=position_sizing(verdict))
        state.record_entry()
    elif verdict == "SELL":
        broker.close(symbol)
```

Run the loop on a cron / k8s schedule that matches your timeframe — daily
EOD for Style A, every 15 minutes for Style B.

### Position sizing & fee math

- Style A: **1/N of equity** across N watchlist symbols, rebalanced on
  signals. Hold ≥ 22 trading days enforced as in Pine.
- Style B: **risk-based sizing** — qty = (equity × `risk_per_trade`) /
  (entry − stop). Default `risk_per_trade = 0.5%`. Stop is the swept
  low/high. TP1 is external liquidity; close 50% there and trail the rest.

### Don't go live until

1. Parity tests pass.
2. Strategy backtest in `wise-hejlsberg-strategy.pine` shows positive
   profit factor at your real broker's fees + slippage on at least 5 years
   of data.
3. Paper-traded for 30+ days with results matching the backtest within
   reason.

## Phase 3 — News sentiment overlay

**Goal:** A sentiment score per symbol that nudges (not overrides) the
composite score. Lifts BUY thresholds when news is broadly negative;
relaxes them when news is broadly positive.

### Data sources

| Source | Coverage | Cost | Notes |
| --- | --- | --- | --- |
| NewsAPI | General news | Free dev tier; paid for live | Aggregates AP, Reuters, Bloomberg headlines, etc. |
| Marketaux | Financial news | Free 100/day | Symbol-tagged. Easiest fit. |
| Finnhub | Financial + symbol news | Free 60/min | Has its own sentiment field. |
| Tiingo | Financial news | Paid | Clean, but $30/mo. |

**You will not get a real-time Bloomberg Terminal feed without a
$24k/yr Bloomberg subscription.** "News from Bloomberg, CNN, Fox, Yahoo"
in practice means whatever those aggregators license — usually
headlines + first paragraph, lagged by minutes. That's sufficient for
this use case.

### Sentiment scoring

Two options, in order of build cost:

1. **Aggregator-provided sentiment** — Finnhub returns a `sentiment` field
   per article. Average over the last 24h, weight recent articles higher.
   Cheapest; coarse.
2. **FinBERT or Claude classifier** — pull headlines + first paragraph,
   classify each as bullish/bearish/neutral. Aggregate per symbol per day.
   More accurate, more expensive (a few cents per symbol per day with
   Claude Haiku).

### Integration

Sentiment becomes a multiplicative factor on the composite score, capped:

```python
sentiment = compute_sentiment(symbol)  # in [-1, 1]
adj = 1.0 + 0.3 * sentiment            # cap effect at ±30%
final_score = base_score * adj
```

Add as an input flag — default off, so its effect is opt-in once
calibrated.

### Risk

Models read sentiment, not _causation_. A negative-sentiment day after a
huge rally is contrarian-bullish; a positive-sentiment day at the top is
not. Don't let sentiment _veto_ the technical setup; only let it adjust
position size or threshold.

## Phase 4 — Optional extensions

- **Order management UI:** simple FastAPI + React dashboard showing
  open positions, the indicator's current score per watchlist symbol,
  and a kill-switch.
- **Discord/Telegram notifications:** ping on every signal with the score
  breakdown so you have a chance to override before the bot fires.
- **Multi-account routing:** equity sleeve to Alpaca, crypto sleeve to
  Coinbase, with allocation rules per account.
- **Walk-forward optimization:** roll the strategy file's parameter
  search forward in time to detect regime changes in your edge.

## What we deliberately won't build

- A homegrown order-router. Alpaca and Coinbase already do this well.
- A custom market-data feed. yfinance and ccxt are cheaper and good
  enough for daily and even 15m timeframes.
- Anything that bypasses TradingView's TOS (scraping streaming WS data,
  reverse-engineering charts).
- Sub-minute scalping. Latency, fees, and slippage make this a different
  game with a different stack.
