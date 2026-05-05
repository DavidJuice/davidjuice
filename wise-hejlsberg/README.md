# Wise Hejlsberg

A two-style TradingView indicator that combines a long-term confluence model
with the ICT price-action setup, exposed in a single Pine v5 file with a
mode switch. A sibling `strategy{}` variant is included for honest, fee-aware
backtesting.

## What's in the box

| File | Purpose |
| --- | --- |
| `wise-hejlsberg.pine` | The indicator: draws every component, fires alerts. |
| `wise-hejlsberg-strategy.pine` | The same scoring wrapped in `strategy{}` for backtesting with commission + slippage. |
| `docs/strategy.md` | Scoring rubric, weights, why each weight, monthly-hold rationale. |
| `docs/ict-setup.md` | FVG / OB / liquidity-sweep / SMT / inversion definitions and how each is detected. |
| `docs/roadmap.md` | Phase 2 (Python broker bot) and Phase 3 (news sentiment) outlines. |

## Two styles, one indicator

- **Style A — Long-term confluence (≥ 1-month holds, low churn).** MA golden /
  death cross, RSI with regular & hidden divergence, MACD, Bollinger Bands,
  Volume, Volume Profile / 매물대 (POC / VAH / VAL), Fibonacci retracement
  & extension. Every component contributes a weighted score; BUY / SELL fires
  only when the composite crosses the configured threshold and at least
  `Min bars between signals` (default 22 ≈ one trading month on the daily) have
  passed since the last signal. This is the knob that enforces month-plus holds
  and keeps trading fees from grinding you down.
- **Style B — ICT price-action.** Liquidity sweep on chart TF or higher TF,
  Fair Value Gaps with inversion tracking, Order Blocks with displacement
  filter, SMT divergence vs. a paired symbol (NQ↔ES, BTC↔ETH), pin-bar /
  fresh-FVG confirmation, and TP lines drawn at the nearest external liquidity.
  Score is 0–4 per direction; BUY / SELL fires when ≥ 3 (configurable).

Choose with the top-level **Mode** input (`Long-term`, `ICT`, `Both`).
In `Both`, every drawing renders but **only the active mode's arrows
fire alerts** — circles for Style A, triangles for Style B, so they're
never visually conflated.

## Install (indicator)

1. Open TradingView → **Pine Editor** (bottom panel).
2. Paste the contents of `wise-hejlsberg.pine`.
3. Click **Save** (give it a name), then **Add to chart**.
4. Open the indicator settings (gear icon) and pick a `Mode`.
5. Tune thresholds and weights from the inputs panel — all grouped by module.

## Install (strategy / backtest)

1. Same steps as above with `wise-hejlsberg-strategy.pine`.
2. Open the **Strategy Tester** tab (bottom panel) for performance stats.
3. The strategy's `Mode` input only offers `Long-term` or `ICT` (one lane at
   a time, so each style is benchmarked cleanly).
4. Set realistic `commission_value` and `slippage` for your broker. Defaults
   are 0.05% commission + 2-tick slippage — change them to match Alpaca,
   Coinbase, Binance, etc.

## Signal legend

| Marker | Meaning |
| --- | --- |
| Green circle "A▲" below bar | Style A composite BUY |
| Red circle "A▼" above bar | Style A composite SELL |
| Lime triangle "ICT▲" | Style B BUY (liquidity sweep / FVG / OB / inversion confluence) |
| Fuchsia triangle "ICT▼" | Style B SELL |
| "Golden" / "Death" label | 50/200 SMA cross |
| Solid green/red diagonal line | Regular RSI divergence (high-signal) |
| Dashed green/red diagonal line | Hidden RSI divergence (continuation) |
| Yellow horizontal line | Volume Profile POC (매물대) |
| Faint yellow horizontals | VAH / VAL bounding 70% of volume |
| Dotted teal/purple horizontals | Fibonacci retracement / extension |
| Translucent green/red box | Active Fair Value Gap |
| Translucent maroon/lime box | Inverted FVG (filled and flipped) |
| Translucent aqua/fuchsia box | Bullish/Bearish Order Block |
| "BSL/SSL swept" triangle | Liquidity sweep on chart TF |
| Dashed red horizontal | ICT trade stop (most recent swept low/high ± 5 bars) |
| Dashed green horizontal | ICT trade target (nearest external liquidity) |
| Faint green background | Style A position is open |

## Status table (top right)

Shows each component's current score, plus the per-mode verdict
(`BUY` / `SELL` / `HOLD long` / `FLAT`).

## Alerts

Each style has its own buy/sell alert condition:

- `WH Style A BUY` / `WH Style A SELL`
- `WH Style B BUY` / `WH Style B SELL`

On free TradingView, set them up via right-click → **Add alert** → Condition.
You'll get in-app or email notifications.

The indicator also calls `alert()` with a JSON payload every time a signal
fires:

```json
{"action":"buy","style":"A","ticker":"AAPL","price":189.42,"score":7.25}
{"action":"buy","style":"B","ticker":"NQ1!","price":18020.5,"stop":17985.0,"tp1":18120.0}
```

These payloads are dormant on free plans (you'd need TV Essential+ to wire
them to a webhook). They're already structured for the Phase 2 Python broker
bot — no Pine changes needed when you upgrade.

## Recommended starting points

- **Long-term swing on US equities:** SPY / QQQ on the **daily** timeframe,
  `Mode = Long-term`, default thresholds. You should see ~6–10 signals per
  year per symbol.
- **Long-term crypto:** BTCUSD on the **weekly** timeframe, `Mode = Long-term`,
  same thresholds. Even fewer signals — that's the point.
- **ICT intraday:** NQ1! on **15m**, `Mode = ICT`, set
  `SMT pair = CME_MINI:ES1!`. Replay through a recent session to verify the
  FVG / OB / sweep boxes render correctly before going live.

## Known limitations

- **Volume Profile is approximated.** Real per-bar tick volume profile is a
  paid TradingView feature. The bin-based approximation here assigns each
  bar's volume to the bin containing its `hlc3`. Good enough for swing-trade
  S/R; not tick-accurate.
- **Free TV won't send webhooks.** `alert()` JSON is pre-staged but webhook
  delivery requires Essential+ tier.
- **No multi-symbol scanning.** Pine only sees the chart's symbol. The
  watchlist scanner is a Phase 2 backend job (see `docs/roadmap.md`).
- **No news / sentiment.** Pine cannot fetch HTTP. Phase 3.

## Verifying it works

Pine has no local toolchain, so testing happens inside the TradingView Pine
Editor. Suggested replay-mode checks:

1. **SPY daily, Mode = Long-term, 2020-01-01 → today.** The 2020-Q3 golden
   cross should print a Style A BUY arrow within ≤ 3 bars; the March 2022
   death cross should print a SELL. You should see roughly 6–10 signals per
   year on this timeframe — that's the 22-bar cooldown working.
2. **BTCUSD weekly, Mode = Long-term.** Confirm signals fire and that the VP
   / fib lines render without exceeding `max_lines_count` (TradingView shows
   a warning at the bottom-right if you do).
3. **NQ1! 15m, Mode = ICT, SMT pair = `CME_MINI:ES1!`.** Replay through a
   recent session that contained a known liquidity sweep. Confirm: a
   sweep marker on the wick bar, an FVG box drawn after, an OB box on
   displacement, and an ICT BUY/SELL arrow only when the score reaches the
   threshold. Check the dashed red stop line matches the swept low/high
   you would have used by hand.
4. **Data Window** (right side panel): every component score should be a
   real number after the warmup period (no NaNs).
5. **Add alert** via right-click → confirm the "WH Style A BUY" /
   "WH Style B BUY" conditions appear and fire on replay bars that match.

If you spot a divergence between what your eyes see and what the table
reports, that's the bug to chase first — the table is the source of truth
for what the score is doing on the current bar.
