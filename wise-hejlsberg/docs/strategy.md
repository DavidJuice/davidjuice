# Strategy & scoring rubric

This document explains every score the indicator produces, the weights that
combine them, and the design choices that follow from "I want to hold for at
least a month" and "I want to minimize trading fees."

## Style A — long-term confluence

Style A is a positional model. Every component returns a signed score; the
final composite is a weighted sum, multiplied by a volume factor.

### Per-component scores

| Component | Range | Triggers |
| --- | --- | --- |
| MA | -2 … +2 | +2 within 10 bars of 50/200 golden cross; +1 if price > both MAs and slow SMA rising; mirror for bearish; 0 otherwise. |
| RSI / divergence | -2 … +2 | +2 regular bullish div (price LL, RSI HL); -2 regular bearish (HH, LH); +1 hidden bullish (price HL, RSI LL, only in uptrend); -1 hidden bearish; ±0.5 for plain OB/OS. Hidden divs only score when the slow SMA confirms the trend, since they're continuation signals. |
| MACD | -1.5 … +1.5 | ±1.5 on zero-line cross; ±1.0 on signal-line cross from oversold/overbought; ±0.5 for histogram momentum. |
| Bollinger | -1 … +1 | +1 lower-band tag + RSI < 35 (mean-reversion buy); -1 upper-band tag + RSI > 65. Squeeze flagged but neutral score (volatility expansion is direction-agnostic). |
| Volume Profile (매물대) | -1 … +1 | +1 if price within 0.5×ATR of VAL and above it (bouncing from value-area floor); -1 mirror at VAH; ±0.5 at POC. |
| Fibonacci | -1 … +1 | +1 if low taps the 0.5–0.618 "golden pocket" with a bullish close in an uptrend; -1 mirror; ±1 on rejections at the 1.272 / 1.618 extensions. |

### Default weights and rationale

| Weight | Default | Why |
| --- | --- | --- |
| `wMA` | 1.0 | Trend filter, but lags badly. Useful as a tie-breaker, not a leader. |
| `wRSI` | 1.5 | Divergences are the highest-signal pattern in this set; weighted up. |
| `wMACD` | 1.0 | Confirms momentum changes flagged by RSI. |
| `wBB` | 0.5 | Mean-reversion edge is real but smaller in trending instruments. |
| `wVP` | 1.0 | POC / VAH / VAL are sticky levels. Strong S/R when respected. |
| `wFib` | 1.0 | Golden-pocket reactions are reliable; extensions are clean profit-take zones. |

`scoreA = (wMA·MA + wRSI·RSI + wMACD·MACD + wBB·BB + wVP·VP + wFib·Fib) ×
volMult`, where `volMult` = 1.25 when current bar's volume > `1.5 × Volume MA`,
else 1.0. Maximum theoretical magnitude ≈ 10.

### Entry / exit conditions

- **BUY** fires when `scoreA ≥ buyTh` (default +6) **and** at least
  `minBars` (default 22) bars have passed since the last signal **and** the
  HTF slow SMA is not falling.
- **SELL / EXIT** fires symmetrically at `scoreA ≤ sellTh` (default −6).

### Why 22 bars?

22 trading days ≈ one calendar month on the daily timeframe. This single knob
is doing two jobs:

1. **Forces month-plus holds.** A new entry can't fire within 22 bars of the
   prior one; the position has to either ride for a month or hit the trailing
   stop.
2. **Slashes trading fees.** At 0.05% commission, 5 round-trips per year on a
   single instrument cost 0.5% in fees vs. 5%+ for a strategy that flips
   weekly. Style A targets the first regime by construction.

You'll miss some shorter swings. That's the point — your stated edge is on
month-plus holds, and the design refuses to fight that with churn.

### HTF agreement filter

`useHTF = true` (default) requires `htfSlowSma` (typically daily SMA-200 when
on intraday) to not be sloping against the trade. This filters out
counter-trend entries on the lower TF.

## Style B — ICT price-action

Style B uses a discrete 0–4 score per direction. No weights — each component
is a binary "yes / no":

| +1 if … | Bullish | Bearish |
| --- | --- | --- |
| Liquidity sweep on chart TF or HTF | sellside (low) swept and reclaimed | buyside (high) swept and rejected |
| SMT divergence vs. paired symbol | chart LL while pair HL | chart HH while pair LH |
| Active OB *or* unfilled FVG *or* inversion tap | bullish variant | bearish variant |
| Confirmation candle | bullish pin at zone, or fresh bullish FVG this bar | bearish mirror |

`buyB` fires when bullish score ≥ `ictBuyTh` (default 3 — i.e. at least 3 of
4 conditions). Cooldown is short (default 2 bars) since this is a
daily-frequency setup.

### Trade management

Per your stated rules:

- **Stop** = swept low for longs (recent 5-bar low), swept high for shorts.
  Tight; the setup is invalidated if price closes back beyond it.
- **TP1** = nearest external liquidity (the closest unbroken `pivothigh`
  above for longs, `pivotlow` below for shorts).

In the strategy variant, `strategy.exit(stop=, limit=)` enforces these
automatically.

## Why two styles in one file?

You actually trade both. They have **different time-scales, different score
schemes, and different exit rules**, so trying to merge them into a single
score would just average their signals and weaken both. Running them as
parallel modules with their own thresholds keeps each one honest.

In `Mode = Both` the indicator draws everything but only the active mode's
arrows fire alerts — you never have to wonder which lane a signal came from.

## Tunable knobs

If you backtest and find a knob isn't earning its keep, lower its weight or
disable it; don't rip it out. The list below is roughly in order of "things
worth tuning first":

1. `Min bars between signals` (Style A): the most consequential single knob.
2. `Buy/sell threshold` (Style A): how strict confluence has to be.
3. `wRSI`, `wFib`, `wVP` (Style A): divergence and S/R have the most edge.
4. `ICT score threshold` (Style B): start at 3, drop to 2 only if signals
   are too rare; never go below 2 with confirmations off.
5. `FVG min % of ATR14` (Style B): at 25%, you skip noise gaps; at 0% you
   get every micro-imbalance, which makes the chart unreadable.

## Honest limitations

- **Volume Profile is bin-approximated**, not tick-true. POC/VAH/VAL drift
  by a bin's width vs. a real per-tick profile. For swing S/R that's fine.
- **HTF lookahead is OFF.** The indicator never peeks at unfinished higher
  timeframe bars (`barmerge.lookahead_off`). This is correct for live use
  but means HTF confirms appear with a small lag in backtests.
- **`barstate.islast` rebuilds.** Volume profile and Fibonacci redraw on bar
  close every `vpRefresh` bars (default 20) or on the last bar. Live values
  are correct; historical bars use the most recent rebuild's anchors, which
  is intentional but means historical visualizations aren't the values that
  fired the past signals.
