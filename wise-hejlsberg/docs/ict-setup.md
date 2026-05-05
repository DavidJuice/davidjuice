# ICT setup — definitions and detection

This is the price-action / market-structure module (Style B). It mirrors
the daily setup you described:

> **Signal:** liquidity sweep (higher-TF preferably) or SMT divergence with ES.
> **Trigger:** look for an FVG to be run through and an OB to form, or enter
> on an inversion tap. Confirm with a pin bar or fresh FVG showing momentum.
> **Stop:** the low (or high) that got swept.
> **Target:** external liquidity.

Below: what each term means, and how the code detects it.

## Concepts

### Liquidity sweep

Stop-loss orders cluster just beyond obvious swing highs ("buyside liquidity",
BSL) and lows ("sellside liquidity", SSL). Smart money intentionally pushes
price through those levels to fill their orders against the resulting stop
runs, then reverses.

A **bullish sweep** = price wicks below a recent swing low **and** closes back
above it on the same bar. A **bearish sweep** mirrors above a swing high.

### Fair Value Gap (FVG)

A 3-bar imbalance:

- **Bullish FVG:** `low[bar 0] > high[bar 2]` with bar 1 being a strong
  bullish candle. The gap is the zone `[high[bar 2], low[bar 0]]`.
- **Bearish FVG:** `high[bar 0] < low[bar 2]` with bar 1 strong bearish.
  The gap is `[high[bar 0], low[bar 2]]`.

Markets tend to revisit FVGs to fill the inefficiency.

### Inversion

An FVG that gets fully traded through is "filled". After the fill it
**inverts**: a former bullish FVG (which was support) now acts as resistance,
and vice versa. Tapping the inverted zone is a high-quality re-entry trigger.

### Order Block (OB)

The last opposite-color candle before a strong displacement (a candle that
moves > N×ATR). A **bullish OB** is the last red candle before a sharp
push up; price often retraces to its zone before continuing. The OB zone
is that candle's high–low range.

### SMT divergence

When two correlated assets disagree at a swing point: e.g., NQ makes a new
higher high but ES makes only a lower high. The divergence implies the
higher high in NQ was driven by stop hunts rather than genuine demand —
a smart-money signal that the move is exhausted. Common pairs: NQ↔ES,
BTC↔ETH, ES↔YM.

### External liquidity

Liquidity resting **outside** the recent range — the next obvious swing
high above current price (long target) or swing low below (short target).
The setup expects price to reach for it before reversing.

### Pin bar

A candle with a long wick in one direction and a small body. Bullish pin =
long lower wick + small body near the top of the range; bearish mirror.
Used here as the confirmation candle when a sweep / OB / inversion tap
prints.

## Detection in code

All detection lives in `wise-hejlsberg.pine` under the "Style B" section.

### Liquidity levels

- `swingHiPv = ta.pivothigh(high, ictPivLen, ictPivLen)`
- `swingLoPv = ta.pivotlow(low,  ictPivLen, ictPivLen)`

Persisted in `var float lastBSL, lastSSL`. Sweep flags:

```pine
bullSweep = not na(lastSSL) and low < lastSSL and close > lastSSL
bearSweep = not na(lastBSL) and high > lastBSL and close < lastBSL
```

HTF version uses `request.security(syminfo.tickerid, ictHtf, ...)` with
`barmerge.lookahead_off` to confirm the swept level was meaningful on a
higher timeframe.

### FVGs

Detected on bar close (3-bar pattern, evaluated using `[2]` lookback).
Filtered by `(zone height) ≥ fvgMinAtrPct% × ATR14` to skip noise.

Each FVG is stored in a Pine `type FVG` with its `box`, edges, direction,
and an `inverted` flag. On every bar the array is walked:

- If price has crossed fully through, set `inverted = true` and recolor.
- Else if price is currently inside the zone, set the appropriate
  "unfilled" flag.
- If `inverted` and price taps back into it, set the `inversionTap` flag
  in the *opposite* direction (former bullish FVG becomes a bearish
  inversion-tap entry trigger, and vice versa).

### Order Blocks

Detected when `|close − open| > obDispMult × ATR14` and the previous
candle was opposite color. Stored in a parallel `type OB` array. An OB
is "active" while price is currently inside its zone and hasn't traded
fully through against it.

### SMT

Compares the chart symbol's swing pivots to the paired symbol's swings
fetched via `request.security(smtSymbol, timeframe.period, [pivothigh,
pivotlow])`. On each new chart-symbol pivot, compare to the paired
symbol's same-bar pivot:

```pine
if shi > lastChartHi and smtPh < lastSmtHi
    bearSMT := true
```

Disabled when `smtSymbol` input is blank.

### Score → entry

```
ictBullScore = (bullSweep | htfBullSweep ? 1 : 0)
             + (bullSMT                 ? 1 : 0)
             + (unfilledBullFvg | activeBullOB | inversionTapBull ? 1 : 0)
             + (bullConfirm             ? 1 : 0)
```

`buyB = ictBullScore ≥ ictBuyTh` (default 3). Cooldown of `ictCooldown`
bars between signals (default 2).

### Stop / target rendering

On `buyB` the indicator draws:

- A dashed red line at `ta.lowest(low, 5)` — the swept low.
- A dashed green line at `lastBSL` (nearest external buyside liquidity) —
  TP1.

The strategy file uses these as `strategy.exit(stop=, limit=)` so the
backtester closes the position at exactly those levels.

## Tuning notes

- **`ictPivLen` (default 10)** controls how "obvious" a swing has to be
  before it's considered liquidity. Lower = more sweeps detected, more
  noise. Higher = only major liquidity counts.
- **`fvgMinAtrPct` (default 25)** is the noise filter. Below 25% you'll
  see micro-FVGs everywhere; above 50% only displacement-grade gaps remain.
- **`obDispMult` (default 1.0×ATR14)** decides what counts as a
  displacement candle for OB creation. 1.5× makes OBs rarer but cleaner.
- **`smtSymbol`** — set this for any pair you actively trade together.
  Suggested: `CME_MINI:ES1!` when on `CME_MINI:NQ1!`,
  `BINANCE:ETHUSDT` when on `BINANCE:BTCUSDT`.

## Placeholders for screenshots

When you have time, drop screenshots in this directory and reference them
here so future-you remembers what each detection looks like in practice:

- `ict-bull-sweep.png` — sweep below SSL, close back above.
- `ict-fvg-bull.png` — bullish FVG and its inversion months later.
- `ict-ob.png` — OB created during displacement, retested cleanly.
- `ict-smt.png` — NQ HH while ES makes LH on the same swing.
- `ict-full-setup.png` — sweep + FVG + OB + pin bar + score=4.
