/** Wiring: search, fetching, and the header / legend / stats / table around the chart. */

import { renderChart, SERIES } from "./chart.js";
import { money, price as fmtPrice, percent, date as fmtDate } from "./format.js";

const $ = (id) => document.getElementById(id);

const dom = {
  form: $("search-form"),
  input: $("search-input"),
  results: $("search-results"),
  sourceBadge: $("source-badge"),
  demoBanner: $("demo-banner"),
  errorBanner: $("error-banner"),
  quote: $("quote"),
  quoteAvatar: $("quote-avatar"),
  quoteName: $("quote-name"),
  quoteMeta: $("quote-meta"),
  quoteLast: $("quote-last"),
  quoteChange: $("quote-change"),
  controls: $("controls"),
  chartCard: $("chart-card"),
  chartTitle: $("chart-title"),
  chartBody: $("chart-body"),
  chartNote: $("chart-note"),
  tooltip: $("chart-tooltip"),
  legend: $("legend"),
  stats: $("stats"),
  tableWrap: $("table-wrap"),
  table: $("data-table"),
  toggleTable: $("toggle-table"),
  toggleLabels: $("toggle-labels"),
  empty: $("empty"),
};

const state = {
  symbol: null,
  range: "10y",
  scale: "dual",
  showLabels: true,
  showTable: false,
  visible: { netIncome: true, revenue: true, price: true },
  data: null,
  chart: null,
};

/* ── Data access ────────────────────────────────────────────────────────── */

async function api(path, params) {
  const url = new URL(path, location.origin);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (HTTP ${res.status})`);
  return body;
}

async function loadConfig() {
  try {
    const config = await api("/api/config");
    dom.sourceBadge.textContent = config.label;
    if (config.synthetic) showDemoBanner("Demo mode: every figure on this page is synthetic.");
  } catch {
    dom.sourceBadge.textContent = "offline";
  }
}

async function loadStock(symbol, { pushUrl = true } = {}) {
  state.symbol = symbol;
  dom.errorBanner.hidden = true;
  dom.empty.hidden = true;
  dom.chartCard.classList.add("is-loading");
  dom.stats.classList.add("is-loading");

  if (pushUrl) {
    const url = new URL(location.href);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("range", state.range);
    history.replaceState({}, "", url);
  }

  try {
    const data = await api("/api/stock", { symbol, range: state.range });
    // A slow request for an abandoned ticker must not overwrite the new one.
    if (state.symbol !== symbol) return;

    state.data = data;
    document.title = `${data.symbol} — StockScope`;
    render();
  } catch (err) {
    showError(err.message);
  } finally {
    dom.chartCard.classList.remove("is-loading");
    dom.stats.classList.remove("is-loading");
  }
}

/* ── Render ─────────────────────────────────────────────────────────────── */

function render() {
  const data = state.data;
  if (!data) return;

  for (const node of [dom.quote, dom.controls, dom.chartCard, dom.stats]) node.hidden = false;

  renderQuote(data);
  renderLegend();
  renderChartCard(data);
  renderStats(data);
  renderTable(data);

  if (data.synthetic) {
    showDemoBanner(
      data.fallbackFrom
        ? `${data.fallbackFrom} could not be reached (${data.fallbackReason}). Showing synthetic data.`
        : "Demo mode: every figure on this page is synthetic.",
    );
  }
}

function renderQuote(data) {
  const prices = data.prices || [];
  const last = prices[prices.length - 1];
  const first = prices[0];

  dom.quoteAvatar.textContent = data.symbol.slice(0, 2);
  dom.quoteName.textContent = data.name;

  const parts = [data.symbol];
  if (prices.length) parts.push(`${fmtDate(first.t)} – ${fmtDate(last.t)}`);
  dom.quoteMeta.textContent = parts.join(" · ");

  dom.quoteLast.textContent = last ? fmtPrice(last.c, data.currency) : "—";

  if (first && last && first.c > 0) {
    const change = ((last.c - first.c) / first.c) * 100;
    dom.quoteChange.textContent = `${percent(change)} over window`;
    dom.quoteChange.className = `quote-change ${change >= 0 ? "is-up" : "is-down"}`;
  } else {
    dom.quoteChange.textContent = "";
  }
}

function renderLegend() {
  dom.legend.replaceChildren();

  for (const series of SERIES) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.visible[series.id]));
    button.title = `Show or hide ${series.label}`;

    const key = document.createElement("span");
    key.className = "key";
    key.style.color = series.color;

    const label = document.createElement("span");
    label.textContent = series.label;

    button.append(key, label);
    button.addEventListener("click", () => {
      const others = SERIES.filter((s) => s.id !== series.id).some((s) => state.visible[s.id]);
      if (!others && state.visible[series.id]) return; // never hide the last series
      state.visible[series.id] = !state.visible[series.id];
      render();
    });

    item.append(button);
    dom.legend.append(item);
  }
}

function renderChartCard(data) {
  dom.chartTitle.textContent = `${data.symbol} — price vs revenue & net income`;

  state.chart?.destroy();
  state.chart = renderChart({
    container: dom.chartBody,
    tooltip: dom.tooltip,
    data,
    visible: state.visible,
    scale: state.scale,
    showLabels: state.showLabels,
    currency: data.currency,
  });

  const notes = [];
  const years = (data.financials || []).length;
  notes.push(
    years
      ? `${years} fiscal ${years === 1 ? "year" : "years"} of reported figures.`
      : "No income-statement data available for this symbol.",
  );
  if (state.scale === "dual") {
    notes.push("Left axis: revenue and net income. Right axis: share price. Both start at zero.");
  } else {
    notes.push("Each series rebased to 100 at its own first point in the window, on a single axis.");
    for (const label of state.chart.omitted || []) {
      notes.push(`${label} is not shown: it starts the window at or below zero, so it cannot be rebased.`);
    }
  }
  dom.chartNote.textContent = notes.join(" ");
}

function renderStats(data) {
  const prices = data.prices || [];
  const financials = data.financials || [];
  const firstFy = financials[0];
  const lastFy = financials[financials.length - 1];
  const years = firstFy && lastFy ? Math.max(1, lastFy.fy - firstFy.fy) : 0;

  const tiles = [
    {
      label: "Price total",
      ...growth(prices[0]?.c, prices[prices.length - 1]?.c),
      sub: prices.length ? `${prices.length.toLocaleString("en-US")} closes` : "",
    },
    {
      label: "Net inc CAGR",
      ...cagr(firstFy?.netIncome, lastFy?.netIncome, years),
      sub: years ? `${years}-year` : "",
    },
    {
      label: "Net inc total",
      ...growth(firstFy?.netIncome, lastFy?.netIncome),
      sub: lastFy ? `now ${money(lastFy.netIncome)}` : "",
    },
    {
      label: "Rev CAGR",
      ...cagr(firstFy?.revenue, lastFy?.revenue, years),
      sub: years ? `${years}-year` : "",
    },
    {
      label: "Rev total",
      ...growth(firstFy?.revenue, lastFy?.revenue),
      sub: lastFy ? `now ${money(lastFy.revenue)}` : "",
    },
  ];

  dom.stats.replaceChildren();
  for (const tile of tiles) {
    const card = document.createElement("div");
    card.className = "stat";

    const label = document.createElement("div");
    label.className = "stat-label";
    label.textContent = tile.label;

    const value = document.createElement("div");
    value.className = `stat-value ${tile.tone || ""}`;
    value.textContent = tile.value;

    const sub = document.createElement("div");
    sub.className = "stat-sub";
    sub.textContent = tile.sub || "";

    card.append(label, value, sub);
    dom.stats.append(card);
  }
}

function renderTable(data) {
  const financials = data.financials || [];
  dom.table.replaceChildren();

  const caption = document.createElement("caption");
  caption.textContent = `${data.symbol} — reported annual figures. Share price is the last close on or before each fiscal period end.`;
  dom.table.append(caption);

  const head = document.createElement("thead");
  head.append(
    row("th", ["Fiscal year", "Period end", "Revenue", "Net income", "Net margin", "Share price"]),
  );
  dom.table.append(head);

  const body = document.createElement("tbody");
  for (const fy of financials) {
    const at = Date.parse(`${fy.endDate}T00:00:00Z`);
    const close = lastCloseBefore(data.prices || [], at);
    const margin =
      fy.revenue && fy.netIncome != null ? percent((fy.netIncome / fy.revenue) * 100, { signed: false }) : "—";

    body.append(
      row("td", [
        String(fy.fy),
        fy.endDate,
        money(fy.revenue),
        money(fy.netIncome),
        margin,
        close == null ? "—" : fmtPrice(close, data.currency),
      ]),
    );
  }

  if (!financials.length) {
    const empty = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No income-statement data available for this symbol.";
    empty.append(cell);
    body.append(empty);
  }

  dom.table.append(body);
}

function row(tag, cells) {
  const tr = document.createElement("tr");
  for (const value of cells) {
    const cell = document.createElement(tag);
    if (tag === "th") cell.scope = "col";
    cell.textContent = value;
    tr.append(cell);
  }
  return tr;
}

/* ── Stat maths ─────────────────────────────────────────────────────────── */

function growth(from, to) {
  if (from == null || to == null || from === 0) return { value: "—" };
  const pct = ((to - from) / Math.abs(from)) * 100;
  return { value: percent(pct), tone: pct >= 0 ? "is-up" : "is-down" };
}

/** CAGR is only defined when both endpoints are positive — a loss year has no growth rate. */
function cagr(from, to, years) {
  if (from == null || to == null || years <= 0) return { value: "—" };
  if (from <= 0 || to <= 0) return { value: "n/a" };
  const pct = (Math.pow(to / from, 1 / years) - 1) * 100;
  return { value: percent(pct), tone: pct >= 0 ? "is-up" : "is-down" };
}

function lastCloseBefore(prices, t) {
  let close = null;
  for (const p of prices) {
    if (p.t <= t) close = p.c;
    else break;
  }
  return close;
}

/* ── Search ─────────────────────────────────────────────────────────────── */

let searchTimer;
let searchResults = [];
let highlighted = -1;

dom.input.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const query = dom.input.value.trim();
  if (query.length < 1) return closeResults();
  searchTimer = setTimeout(() => runSearch(query), 180);
});

async function runSearch(query) {
  try {
    const { results } = await api("/api/search", { q: query });
    searchResults = results;
    highlighted = results.length ? 0 : -1;
    paintResults();
  } catch {
    closeResults();
  }
}

function paintResults() {
  dom.results.replaceChildren();
  if (!searchResults.length) return closeResults();

  searchResults.forEach((result, i) => {
    const item = document.createElement("li");
    item.role = "option";
    item.id = `search-option-${i}`;
    item.setAttribute("aria-selected", String(i === highlighted));

    const sym = document.createElement("span");
    sym.className = "sym";
    sym.textContent = result.symbol;

    const name = document.createElement("span");
    name.className = "nm";
    name.textContent = result.name;

    const exch = document.createElement("span");
    exch.className = "exch";
    exch.textContent = result.exchange || "";

    item.append(sym, name, exch);
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      choose(i);
    });
    dom.results.append(item);
  });

  dom.results.hidden = false;
  dom.input.setAttribute("aria-expanded", "true");
}

function closeResults() {
  dom.results.hidden = true;
  dom.results.replaceChildren();
  dom.input.setAttribute("aria-expanded", "false");
  searchResults = [];
  highlighted = -1;
}

function choose(i) {
  const result = searchResults[i];
  if (!result) return;
  dom.input.value = result.symbol;
  closeResults();
  dom.input.blur();
  loadStock(result.symbol);
}

dom.input.addEventListener("keydown", (event) => {
  if (dom.results.hidden) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    highlighted = (highlighted + delta + searchResults.length) % searchResults.length;
    paintResults();
  } else if (event.key === "Enter" && highlighted >= 0) {
    event.preventDefault();
    choose(highlighted);
  } else if (event.key === "Escape") {
    closeResults();
  }
});

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (highlighted >= 0 && searchResults.length) return choose(highlighted);

  const typed = dom.input.value.trim().toUpperCase();
  if (typed) {
    closeResults();
    loadStock(typed);
  }
});

document.addEventListener("click", (event) => {
  if (!dom.form.contains(event.target)) closeResults();
});

/* ── Controls ───────────────────────────────────────────────────────────── */

dom.controls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-range], button[data-scale]");
  if (!button) return;

  if (button.dataset.range) {
    setActive(button, "[data-range]");
    state.range = button.dataset.range;
    if (state.symbol) loadStock(state.symbol);
  } else {
    setActive(button, "[data-scale]");
    state.scale = button.dataset.scale;
    render();
  }
});

function setActive(button, selector) {
  for (const sibling of dom.controls.querySelectorAll(selector)) {
    sibling.classList.toggle("is-active", sibling === button);
  }
}

dom.toggleLabels.addEventListener("change", () => {
  state.showLabels = dom.toggleLabels.checked;
  if (state.data) renderChartCard(state.data);
});

dom.toggleTable.addEventListener("click", () => {
  state.showTable = !state.showTable;
  dom.tableWrap.hidden = !state.showTable;
  dom.toggleTable.setAttribute("aria-expanded", String(state.showTable));
  dom.toggleTable.classList.toggle("is-active", state.showTable);
});

dom.empty.addEventListener("click", (event) => {
  const button = event.target.closest("[data-example]");
  if (!button) return;
  dom.input.value = button.dataset.example;
  loadStock(button.dataset.example);
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => state.data && renderChartCard(state.data), 150);
});

/* ── Banners ────────────────────────────────────────────────────────────── */

function showDemoBanner(message) {
  dom.demoBanner.textContent = message;
  dom.demoBanner.hidden = false;
}

function showError(message) {
  dom.errorBanner.textContent = message;
  dom.errorBanner.hidden = false;
  if (!state.data) dom.empty.hidden = false;
}

/* ── Boot ───────────────────────────────────────────────────────────────── */

(function start() {
  loadConfig();

  const params = new URLSearchParams(location.search);
  const range = params.get("range");
  if (range) {
    const button = dom.controls.querySelector(`[data-range="${CSS.escape(range)}"]`);
    if (button) {
      setActive(button, "[data-range]");
      state.range = range;
    }
  }

  const symbol = params.get("symbol");
  if (symbol) {
    dom.input.value = symbol.toUpperCase();
    loadStock(symbol.toUpperCase(), { pushUrl: false });
  }
})();
