/**
 * Alpha Vantage provider — needs ALPHAVANTAGE_API_KEY.
 *
 * Five annual periods and monthly price bars, on a free tier that allows very
 * few calls per day. Useful as a cross-check on Yahoo's numbers; the cache in
 * front of it is doing real work.
 */

import { getJson, UpstreamError } from "../http.js";

export const id = "alphavantage";
export const label = "Alpha Vantage";
export const needsKey = true;

const BASE = "https://www.alphavantage.co/query";

function key() {
  const value = process.env.ALPHAVANTAGE_API_KEY;
  if (!value) {
    throw new UpstreamError("alphavantage: ALPHAVANTAGE_API_KEY is not set", {
      provider: id,
      status: 500,
    });
  }
  return value;
}

/** Alpha Vantage reports throttling as a 200 with a prose field. */
function assertNotThrottled(json) {
  const notice = json?.Note || json?.Information || json?.["Error Message"];
  if (notice) {
    throw new UpstreamError(`alphavantage: ${notice}`, { provider: id, status: 429 });
  }
}

export async function search(query) {
  const url = `${BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${key()}`;
  const json = await getJson(url, { provider: id });
  assertNotThrottled(json);
  return (json.bestMatches || []).map((m) => ({
    symbol: m["1. symbol"],
    name: m["2. name"] || m["1. symbol"],
    exchange: m["4. region"] || "",
    type: "EQUITY",
  }));
}

export async function fetchStock(symbol, range) {
  const [prices, financials] = await Promise.all([
    fetchPrices(symbol),
    fetchFinancials(symbol).catch(() => []),
  ]);

  const cutoff = rangeStart(range);
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    currency: "USD",
    prices: prices.filter((p) => p.t >= cutoff),
    financials: financials.filter((f) => Date.parse(f.endDate) >= cutoff),
    source: id,
  };
}

async function fetchPrices(symbol) {
  const url =
    `${BASE}?function=TIME_SERIES_MONTHLY_ADJUSTED` +
    `&symbol=${encodeURIComponent(symbol)}&apikey=${key()}`;
  const json = await getJson(url, { provider: id });
  assertNotThrottled(json);

  const series = json["Monthly Adjusted Time Series"];
  if (!series) {
    throw new UpstreamError(`alphavantage: no price data for "${symbol}"`, {
      provider: id,
      status: 404,
    });
  }

  return Object.entries(series)
    .map(([date, bar]) => ({
      t: Date.parse(`${date}T00:00:00Z`),
      c: Number(bar["5. adjusted close"] ?? bar["4. close"]),
    }))
    .filter((p) => Number.isFinite(p.c))
    .sort((a, b) => a.t - b.t);
}

async function fetchFinancials(symbol) {
  const url = `${BASE}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${key()}`;
  const json = await getJson(url, { provider: id });
  assertNotThrottled(json);

  return (json.annualReports || [])
    .map((r) => ({
      endDate: r.fiscalDateEnding,
      fy: Number(r.fiscalDateEnding.slice(0, 4)),
      revenue: num(r.totalRevenue),
      netIncome: num(r.netIncome),
    }))
    .filter((r) => r.endDate)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function rangeStart(range) {
  const years = { "1y": 1, "5y": 5, "10y": 10, max: 100 }[range] ?? 10;
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.getTime();
}

const num = (v) => {
  if (v == null || v === "None" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
