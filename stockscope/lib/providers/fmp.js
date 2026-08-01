/**
 * Financial Modeling Prep provider — needs FMP_API_KEY, and in exchange gives
 * the deep annual history the Qualtrim-style chart is really built for
 * (10+ fiscal years of revenue and net income instead of Yahoo's ~4).
 *
 * FMP has more than one live API generation. If your key is on a plan that
 * serves a different base path, set FMP_BASE_URL rather than editing this file.
 */

import { getJson, UpstreamError } from "../http.js";

export const id = "fmp";
export const label = "Financial Modeling Prep";
export const needsKey = true;

const BASE = process.env.FMP_BASE_URL || "https://financialmodelingprep.com/api/v3";
const YEARS = { "1y": 1, "5y": 5, "10y": 10, max: 25 };

function key() {
  const value = process.env.FMP_API_KEY;
  if (!value) throw new UpstreamError("fmp: FMP_API_KEY is not set", { provider: id, status: 500 });
  return value;
}

export async function search(query) {
  const url = `${BASE}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${key()}`;
  const json = await getJson(url, { provider: id });
  return (Array.isArray(json) ? json : []).map((q) => ({
    symbol: q.symbol,
    name: q.name || q.symbol,
    exchange: q.exchangeShortName || q.stockExchange || "",
    type: "EQUITY",
  }));
}

export async function fetchStock(symbol, range) {
  const years = YEARS[range] || 10;
  const [profile, prices, financials] = await Promise.all([
    fetchProfile(symbol).catch(() => null),
    fetchPrices(symbol, years),
    fetchFinancials(symbol, years).catch(() => []),
  ]);

  return {
    symbol: symbol.toUpperCase(),
    name: profile?.companyName || symbol.toUpperCase(),
    currency: profile?.currency || "USD",
    prices,
    financials,
    source: id,
  };
}

async function fetchProfile(symbol) {
  const url = `${BASE}/profile/${encodeURIComponent(symbol)}?apikey=${key()}`;
  const json = await getJson(url, { provider: id });
  return Array.isArray(json) ? json[0] : null;
}

async function fetchPrices(symbol, years) {
  const to = new Date();
  const from = new Date(to.getFullYear() - years, to.getMonth(), to.getDate());
  const url =
    `${BASE}/historical-price-full/${encodeURIComponent(symbol)}` +
    `?from=${iso(from)}&to=${iso(to)}&apikey=${key()}`;

  const json = await getJson(url, { provider: id });
  const rows = json?.historical;
  if (!Array.isArray(rows) || !rows.length) {
    throw new UpstreamError(`fmp: no price data for "${symbol}"`, { provider: id, status: 404 });
  }

  // FMP returns newest-first daily bars; the chart only resolves to about a
  // week, so keep every fifth bar and stay under a few hundred KB of JSON.
  const ascending = rows.slice().reverse();
  const step = ascending.length > 1500 ? 5 : 1;
  const prices = [];
  for (let i = 0; i < ascending.length; i += step) {
    const row = ascending[i];
    const close = row.adjClose ?? row.close;
    if (close == null) continue;
    prices.push({ t: Date.parse(`${row.date}T00:00:00Z`), c: close });
  }

  // Always keep the most recent bar, whatever the stride landed on.
  const last = ascending[ascending.length - 1];
  const lastClose = last.adjClose ?? last.close;
  const lastT = Date.parse(`${last.date}T00:00:00Z`);
  if (lastClose != null && prices[prices.length - 1]?.t !== lastT) {
    prices.push({ t: lastT, c: lastClose });
  }
  return prices;
}

async function fetchFinancials(symbol, years) {
  const url =
    `${BASE}/income-statement/${encodeURIComponent(symbol)}` +
    `?period=annual&limit=${Math.max(years + 1, 6)}&apikey=${key()}`;

  const json = await getJson(url, { provider: id });
  return (Array.isArray(json) ? json : [])
    .filter((row) => row.date)
    .map((row) => ({
      endDate: row.date,
      fy: Number(row.calendarYear || row.date.slice(0, 4)),
      revenue: num(row.revenue),
      netIncome: num(row.netIncome),
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
const iso = (d) => d.toISOString().slice(0, 10);
