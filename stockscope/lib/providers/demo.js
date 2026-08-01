/**
 * Demo provider — deterministic synthetic data, no network at all.
 *
 * This exists so the UI can be run, developed and screenshotted without an API
 * key or an internet connection. The numbers are invented: seeded from the
 * ticker string, so "ADBE" always draws the same chart, and never anything to
 * do with the real company. Responses are flagged `synthetic: true` and the UI
 * shows a banner whenever that flag is set.
 */

export const id = "demo";
export const label = "Demo (synthetic)";
export const needsKey = false;

const CATALOG = [
  ["ADBE", "Adobe Inc.", "NASDAQ"],
  ["AAPL", "Apple Inc.", "NASDAQ"],
  ["MSFT", "Microsoft Corporation", "NASDAQ"],
  ["NVDA", "NVIDIA Corporation", "NASDAQ"],
  ["GOOGL", "Alphabet Inc.", "NASDAQ"],
  ["AMZN", "Amazon.com, Inc.", "NASDAQ"],
  ["META", "Meta Platforms, Inc.", "NASDAQ"],
  ["TSLA", "Tesla, Inc.", "NASDAQ"],
  ["CRM", "Salesforce, Inc.", "NYSE"],
  ["NFLX", "Netflix, Inc.", "NASDAQ"],
];

const YEARS = { "1y": 1, "5y": 5, "10y": 10, max: 12 };
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function search(query) {
  const q = query.trim().toUpperCase();
  const matches = CATALOG.filter(([sym, name]) => sym.includes(q) || name.toUpperCase().includes(q));
  const rows = matches.length ? matches : [[q, `${q} (synthetic)`, "DEMO"]];
  return rows.map(([symbol, name, exchange]) => ({ symbol, name, exchange, type: "EQUITY" }));
}

export async function fetchStock(symbol, range) {
  const sym = symbol.toUpperCase();
  const rand = mulberry32(hash(sym));
  const years = YEARS[range] || 10;

  const known = CATALOG.find(([s]) => s === sym);
  const financials = buildFinancials(rand, years);
  const prices = buildPrices(rand, financials, years);

  return {
    symbol: sym,
    name: known ? known[1] : `${sym} (synthetic)`,
    currency: "USD",
    prices,
    financials,
    source: id,
    synthetic: true,
  };
}

/** One row per fiscal year: revenue compounding, margin drifting. */
function buildFinancials(rand, years) {
  const now = new Date();
  const rows = [];

  let revenue = 2e9 + rand() * 12e9;
  let margin = 0.08 + rand() * 0.16;

  for (let i = years - 1; i >= 0; i--) {
    const end = new Date(Date.UTC(now.getUTCFullYear() - i, 11, 1));
    if (end.getTime() > now.getTime()) continue;

    revenue *= 1 + 0.06 + rand() * 0.22;
    margin = clamp(margin + (rand() - 0.5) * 0.05, 0.03, 0.42);

    rows.push({
      endDate: end.toISOString().slice(0, 10),
      fy: end.getUTCFullYear(),
      revenue: Math.round(revenue),
      netIncome: Math.round(revenue * margin),
    });
  }
  return rows;
}

/** Weekly closes: a random walk with drift, pulled toward the earnings trend. */
function buildPrices(rand, financials, years) {
  const now = Date.now();
  const start = now - years * 365.25 * 24 * 60 * 60 * 1000;
  const prices = [];

  const shares = 4e8 + rand() * 8e8;
  const multiple = 18 + rand() * 22;
  const vol = 0.03 + rand() * 0.03;

  let price = ((financials[0]?.netIncome ?? 1e9) / shares) * multiple;

  for (let t = start; t <= now; t += WEEK) {
    // Fair value from whichever fiscal year is in effect at time t.
    const fy = latestBefore(financials, t) ?? financials[0];
    const fair = ((fy?.netIncome ?? 1e9) / shares) * multiple;

    const drift = Math.log(fair / price) * 0.02; // slow pull toward fair value
    const shock = (rand() - 0.5) * vol * 2;
    price = Math.max(1, price * Math.exp(drift + shock));

    prices.push({ t, c: Math.round(price * 100) / 100 });
  }
  return prices;
}

function latestBefore(rows, t) {
  let found = null;
  for (const row of rows) {
    if (Date.parse(`${row.endDate}T00:00:00Z`) <= t) found = row;
  }
  return found;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, seeded PRNG. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
