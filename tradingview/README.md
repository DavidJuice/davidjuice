# Financials Overlay — a Pine Script indicator

Puts revenue, net income, EBITDA and anything else TradingView publishes **on
top of the price chart**, instead of in a pane underneath it.

`financials-overlay.pine` — Pine Script v6, one file, paste-and-go.

## Install

1. Open a chart on TradingView → **Pine Editor** (bottom panel).
2. Paste the contents of `financials-overlay.pine`.
3. **Save**, then **Add to chart**.
4. Open the indicator's settings to pick metrics, period and scale.

Financial data on TradingView is symbol-dependent: it works on stocks with
published fundamentals, not on indices, forex or most crypto.

## Why an overlay needs a decision about scale

Revenue is in billions, price is in tens or hundreds. They cannot share one
axis without something being rescaled — that is exactly why TradingView's own
financial indicators sit in a separate pane. The script offers both honest
answers:

### `Raw values (pin to scale)` — the one to trust

Plots the true numbers, unscaled, and hands the problem to TradingView:

1. Set **Overlay mode** to `Raw values (pin to scale)`.
2. Right-click the financial line on the chart → **Pin to scale** → **No Scale
   (Full screen)**.

TradingView then auto-fits those plots to the pane on their own scale while
price keeps the right-hand one. Nothing in this script touches the geometry, and
all the financial series share that one auto scale — so net income still reads
as a fraction of revenue, which is the layout from the reference chart.

### `Fit to price range` — the default

Maps the financial series linearly into a band of the chart's price range, so it
works the moment you add it with no right-clicking. To keep it honest:

- Every point is labelled with its **real reported value**, and a small value
  axis is drawn to the right of the last bar, so a height in the band can be
  read as a number.
- **One shared scale** (on by default) keeps the metrics sized relative to each
  other. Turn it off and each is fitted independently — shape survives, the
  comparison does not.
- **Anchor at zero** keeps the bottom of the value scale at 0 rather than the
  smallest reported figure, so growth is not visually exaggerated.
- The Data Window always reports the published figures, never mapped ones.

The band is adjustable (`Band bottom` / `Band top`, as a percentage of the price
range) — the defaults tuck the financials into the lower ~70% so the price line
stays readable above them.

Worth saying plainly: where the financial lines sit relative to price in this
mode is a choice of band, not a fact about the company. Crossings mean nothing.
That is true of every dual-scale chart, including the reference one.

## Metrics

Four configurable slots, each with its own colour. The dropdown covers the
common income-statement, balance-sheet and cash-flow lines:

Revenue · Net income · Gross profit · Operating income · EBITDA · Free cash flow ·
Cash from operations · Operating expenses · R&D expenses · Total assets ·
Total equity · Total debt · Cash & equivalents · EPS (basic) · EPS (diluted) ·
Book value per share · Shares outstanding · Market cap

Pick **`Custom…`** and type an id into the *Custom financial id* field to reach
any of the 200+ metrics TradingView exposes — the dropdown is a shortcut, not a
limit. The authoritative list is TradingView's
[What financial data is available in Pine?](https://www.tradingview.com/support/solutions/43000564727-what-financial-data-is-available-in-pine/)
and the [`request.financial` reference](https://www.tradingview.com/pine-script-reference/v6/#fun_request.financial).

### About the metric ids — read this before filing a bug

I could not reach `tradingview.com` from the environment this was written in
(every request returned 403), so **the id strings in `f_id()` are not all
verified**. Confirmed against a published working script and search results:
`TOTAL_REVENUE`, `NET_INCOME`, `EBITDA`, `GROSS_PROFIT`, `TOTAL_SHARES_OUTSTANDING`,
`BOOK_VALUE_PER_SHARE`. The rest — `OPER_INCOME`, `CASH_F_OPERATING_ACTIVITIES`,
`OPERATING_EXPENSES`, `RESEARCH_AND_DEV`, `TOTAL_EQUITY`, `CASH_N_EQUIVALENTS`,
`MARKET_CAP_BASIC`, `EARNINGS_PER_SHARE_BASIC`, `EARNINGS_PER_SHARE_DILUTED` —
are best-effort and may be wrong. One known doubt: an existing script uses plain
`EARNINGS_PER_SHARE` rather than the `_BASIC` suffix.

The script is built so a wrong id fails loudly instead of silently: the request
uses `ignore_invalid_symbol = true`, and a metric that returns nothing draws a
**`No data: <ID> (<period>)`** label on the chart. When you see that, look the id
up on the page above and either fix the `switch` in `f_id()` or drop it into a
`Custom…` slot. Corrections to `f_id()` are welcome.

## Periods

`FY` (fiscal year), `FQ` (quarter), `FH` (half-year), `TTM` (trailing twelve
months). Not every metric publishes on every period — TTM in particular covers
only a few. A metric that works on FY and comes back empty on TTM is normal, not
a bug.

## Not tested on a chart

This has not been compiled or run in the Pine Editor — there is no way to do
that from where it was written. The logic and Pine v6 semantics were worked
through carefully, but expect the possibility of a compile error on first paste.
The likeliest spots, in order:

1. A metric id that does not exist (shows as a `No data:` label, not an error).
2. `plot(..., linewidth = lineWidth)` — if the editor rejects an input there,
   replace `lineWidth` with a literal `2` in the four `plot()` calls.
3. `ignore_invalid_symbol` on `request.financial` — if it is rejected, drop the
   argument (a bad custom id then becomes a hard error instead of a label).

Tell me what the editor says and I'll fix it.

## Known limits

- Four metric slots. More is easy — each costs one `request.financial` call, and
  TradingView allows 40.
- Values come back in the company's **reporting currency**, which is not always
  the chart's quote currency. The table shows the symbol's currency as a hint;
  `request.financial` also takes a `currency` argument if you need conversion.
- Financial points are placed on the bar where TradingView releases the figure,
  which is the reporting date, not the fiscal period end.
- Drawings are rebuilt on the last bar on every tick. Fine for daily and weekly
  charts, heavier on fast intraday ones.
