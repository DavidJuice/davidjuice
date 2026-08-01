/**
 * Yahoo Finance provider — the default, because it needs no API key.
 *
 * Caveat worth knowing before you trust the chart: the free fundamentals
 * timeseries endpoint only returns about four annual periods. Price history
 * goes back decades, so a 10Y chart will show a full price line next to a
 * short revenue/net-income line. Set FMP_API_KEY for deeper financials.
 */

import { getJson, UpstreamError } from "../http.js";

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";
const TIMESERIES =
  "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries";

export const id = "yahoo";
export const label = "Yahoo Finance";
export const needsKey = false;

// Yahoo wants a coarser interval for longer windows or it truncates the series.
const INTERVAL = { "1y": "1d", "5y": "1wk", "10y": "1wk", max: "1mo" };

export async function search(query) {
  const url = `${SEARCH}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
  const json = await getJson(url, { provider: id });
  return (json.quotes || [])
    .filter((q) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
    .map((q) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || q.exchange || "",
      type: q.quoteType,
    }));
}

export async function fetchStock(symbol, range) {
  // Financials are the slower, more failure-prone half; run both together and
  // let a fundamentals outage still produce a price-only chart.
  const [priceData, financials] = await Promise.all([
    fetchPrices(symbol, range),
    fetchFinancials(symbol).catch(() => []),
  ]);

  return {
    symbol: priceData.symbol,
    name: priceData.name,
    currency: priceData.currency,
    prices: priceData.prices,
    financials,
    source: id,
  };
}

async function fetchPrices(symbol, range) {
  const interval = INTERVAL[range] || "1wk";
  const url = `${CHART}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const json = await getJson(url, { provider: id });

  const result = json?.chart?.result?.[0];
  if (!result) {
    const message = json?.chart?.error?.description || `no price data for "${symbol}"`;
    throw new UpstreamError(`${id}: ${message}`, { provider: id, status: 404 });
  }

  const stamps = result.timestamp || [];
  // Adjusted closes keep splits from showing up as cliffs in the price line.
  const closes =
    result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close || [];

  const prices = [];
  for (let i = 0; i < stamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue; // holidays come back as nulls
    prices.push({ t: stamps[i] * 1000, c: close });
  }

  const meta = result.meta || {};
  return {
    symbol: meta.symbol || symbol.toUpperCase(),
    name: meta.longName || meta.shortName || meta.symbol || symbol.toUpperCase(),
    currency: meta.currency || "USD",
    prices,
  };
}

async function fetchFinancials(symbol) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 20 * 365 * 24 * 60 * 60; // ask wide; Yahoo returns what it has
  const sym = encodeURIComponent(symbol);
  const url =
    `${TIMESERIES}/${sym}?symbol=${sym}` +
    `&type=annualTotalRevenue,annualNetIncome&period1=${period1}&period2=${period2}&merge=false`;

  const json = await getJson(url, { provider: id });
  const results = json?.timeseries?.result || [];

  // Revenue and net income arrive as two separate series; index them by the
  // fiscal period-end date so they can be zipped into one row per year.
  const byDate = new Map();
  for (const series of results) {
    const type = series?.meta?.type?.[0];
    const key = type === "annualTotalRevenue" ? "revenue" : type === "annualNetIncome" ? "netIncome" : null;
    if (!key) continue;

    for (const point of series[type] || []) {
      const value = point?.reportedValue?.raw;
      const asOf = point?.asOfDate;
      if (asOf == null || value == null) continue;
      const row = byDate.get(asOf) || { endDate: asOf };
      row[key] = value;
      byDate.set(asOf, row);
    }
  }

  return [...byDate.values()]
    .filter((row) => row.revenue != null || row.netIncome != null)
    .map((row) => ({
      endDate: row.endDate,
      fy: Number(row.endDate.slice(0, 4)),
      revenue: row.revenue ?? null,
      netIncome: row.netIncome ?? null,
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}
