/**
 * The chart: share price against annual revenue and net income.
 *
 * Hand-rolled SVG rather than a charting library, because the layout has a few
 * demands an off-the-shelf line chart does not cover — a weekly price series
 * and two annual series in one frame, value pills that step aside instead of
 * overlapping, and a crosshair that reads the fiscal year in effect.
 *
 * A note on the two y-axes: dual-scale charts can imply a relationship that
 * isn't there, since either axis can be re-scaled to make the lines "cross" or
 * "diverge" wherever you like. It is the whole point of this view, so it is the
 * default — but both axes are anchored at zero so neither is stretched, and the
 * "Indexed to 100" scale puts every series on one axis for an honest comparison.
 */

import { money, moneyTick, price as fmtPrice, date as fmtDate } from "./format.js";

const NS = "http://www.w3.org/2000/svg";

export const SERIES = [
  { id: "netIncome", label: "Net income", color: "#199e70", axis: "left", kind: "annual" },
  { id: "revenue", label: "Revenue", color: "#ea580c", axis: "left", kind: "annual" },
  { id: "price", label: "Share price", color: "#4763ff", axis: "right", kind: "daily" },
];

const M = { top: 22, right: 76, bottom: 34, left: 76 };
const SURFACE = "#111c30";
const GRID = "#1b2942";
const INK_3 = "#6b7c9c";
const INK_2 = "#a3b3d1";

/**
 * Draw the chart into `container`.
 * Returns a handle with `destroy()` so callers can tear down listeners.
 */
export function renderChart({ container, tooltip, data, visible, scale, showLabels, currency }) {
  container.querySelectorAll("svg").forEach((node) => node.remove());

  const width = Math.max(320, container.clientWidth || 900);
  const height = Math.round(Math.min(540, Math.max(380, width * 0.5)));
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;

  const indexed = scale === "indexed";
  const series = buildSeries(data, visible, indexed);
  const active = series.filter((s) => s.points.length > 0);
  const omitted = series.filter((s) => s.omitted).map((s) => s.label);

  const svg = el("svg", {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: "img",
    tabindex: "0",
    "aria-label": describe(data, active, indexed),
  });

  // Mount before drawing: the value pills size themselves with
  // getComputedTextLength(), which only reports real widths once the SVG is in
  // the document.
  container.prepend(svg);

  if (!active.length) {
    svg.append(
      text(width / 2, height / 2, "No data to plot for this selection", {
        fill: INK_3,
        anchor: "middle",
        size: 13,
      }),
    );
    return { omitted, destroy() {} };
  }

  // ── Scales ────────────────────────────────────────────────────────────
  const xs = active.flatMap((s) => s.points.map((p) => p.t));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const x = (t) => M.left + ((t - xMin) / Math.max(1, xMax - xMin)) * innerW;

  const { leftAxis, rightAxis } = chooseAxes(
    active.filter((s) => indexed || s.axis === "left"),
    indexed ? [] : active.filter((s) => s.axis === "right"),
  );

  const yFor = (s) => {
    const axis = indexed || s.axis === "left" ? leftAxis : rightAxis;
    return (v) => M.top + innerH - ((v - axis.lo) / (axis.hi - axis.lo)) * innerH;
  };

  // ── Grid, axes ────────────────────────────────────────────────────────
  const gridGroup = el("g", { "aria-hidden": "true" });
  leftAxis.ticks.forEach((tick, i) => {
    const gy = M.top + innerH - ((tick - leftAxis.lo) / (leftAxis.hi - leftAxis.lo)) * innerH;
    gridGroup.append(
      el("line", { x1: M.left, x2: M.left + innerW, y1: gy, y2: gy, stroke: GRID, "stroke-width": 1 }),
    );
    gridGroup.append(
      text(M.left - 10, gy + 4, indexed ? Math.round(tick).toLocaleString("en-US") : moneyTick(tick), {
        fill: INK_3,
        anchor: "end",
        size: 11,
      }),
    );
    // A share price is never negative, so ticks below the shared zero line
    // carry the gridline but no nonsensical label.
    const rightTick = rightAxis?.ticks[i];
    if (rightTick != null && rightTick >= 0) {
      gridGroup.append(
        text(M.left + innerW + 10, gy + 4, moneyTick(rightTick), {
          fill: INK_3,
          anchor: "start",
          size: 11,
        }),
      );
    }
  });

  for (const tick of yearTicks(xMin, xMax, innerW)) {
    const gx = x(tick);
    gridGroup.append(
      el("line", { x1: gx, x2: gx, y1: M.top, y2: M.top + innerH, stroke: GRID, "stroke-width": 1 }),
    );
    gridGroup.append(
      text(gx, height - 12, String(new Date(tick).getUTCFullYear()), {
        fill: INK_3,
        anchor: "middle",
        size: 11,
      }),
    );
  }

  const leftTitle = indexed ? "Index (start = 100)" : "Revenue / net income";
  gridGroup.append(axisTitle(14, M.top + innerH / 2, leftTitle, -90));
  if (rightAxis) {
    gridGroup.append(axisTitle(width - 12, M.top + innerH / 2, "Share price", 90));
  }
  svg.append(gridGroup);

  // ── Series lines ──────────────────────────────────────────────────────
  const linesGroup = el("g", { fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" });
  for (const s of active) {
    const y = yFor(s);
    const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`).join(" ");
    linesGroup.append(el("path", { d, stroke: s.color, "stroke-width": 2 }));
  }
  svg.append(linesGroup);

  // ── End dots ──────────────────────────────────────────────────────────
  const dotsGroup = el("g");
  for (const s of active) {
    const last = s.points[s.points.length - 1];
    dotsGroup.append(
      el("circle", {
        cx: x(last.t),
        cy: yFor(s)(last.v),
        r: 4,
        fill: s.color,
        stroke: SURFACE,
        "stroke-width": 2,
      }),
    );
  }
  svg.append(dotsGroup);

  // ── Value pills on the annual series ──────────────────────────────────
  if (showLabels) {
    const labelGroup = el("g");
    svg.append(labelGroup);
    const placed = [];
    for (const s of active.filter((s) => s.kind === "annual")) {
      placePills(labelGroup, s, x, yFor(s), placed, { indexed, top: M.top });
    }
  }

  // ── Crosshair + tooltip ───────────────────────────────────────────────
  return attachCrosshair({
    omitted,
    svg,
    container,
    tooltip,
    active,
    data,
    currency,
    indexed,
    geom: { x, yFor, xMin, xMax, innerW, innerH, top: M.top, left: M.left },
  });
}

/* ── Data shaping ───────────────────────────────────────────────────────── */

function buildSeries(data, visible, indexed) {
  const financials = data.financials || [];

  return SERIES.filter((s) => visible[s.id]).map((s) => {
    const raw =
      s.id === "price"
        ? (data.prices || []).map((p) => ({ t: p.t, v: p.c }))
        : financials
            .filter((f) => f[s.id] != null)
            .map((f) => ({ t: Date.parse(`${f.endDate}T00:00:00Z`), v: f[s.id], fy: f.fy }));

    const points = raw.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
    const base = points[0]?.v;
    // Rebasing needs a positive starting point. A company that began the window
    // at a loss has no meaningful index, and plotting its raw dollars on an
    // index axis would put two different units on one scale — so it is dropped
    // from this view and named in the caption instead.
    const canIndex = base != null && base > 0;
    if (indexed && !canIndex) return { ...s, raw: points, points: [], omitted: points.length > 0 };

    return {
      ...s,
      raw: points,
      points: indexed ? points.map((p) => ({ ...p, v: (p.v / base) * 100 })) : points,
      indexed,
    };
  });
}

/**
 * Pick the two axes together.
 *
 * They have to share gridlines — the same number of intervals and the same zero
 * line — or the right-hand labels sit at heights that do not match the values
 * they name. But letting one axis dictate the interval count strands the other
 * (a $420 price axis forced onto four intervals runs to $800, wasting half its
 * height). So try a few counts and keep whichever fills both axes best.
 */
function chooseAxes(leftSeries, rightSeries) {
  const leftValues = valuesOf(leftSeries);
  const rightValues = valuesOf(rightSeries);
  if (!leftValues.length) return { leftAxis: emptyAxis(), rightAxis: null };

  const leftMin = Math.min(0, ...leftValues);
  const leftMax = Math.max(...leftValues);

  let best = null;
  for (const count of [4, 5, 6]) {
    const leftAxis = niceScale(leftMin, leftMax, count);
    const rightAxis = rightValues.length ? alignedAxis(rightValues, leftAxis) : null;

    // "Fill" is how much of each axis the data actually occupies. Score on the
    // worse of the two: one axis running to twice its data is the failure worth
    // avoiding, and averaging would let a well-filled left axis hide it.
    const leftFill = span(leftMax - leftMin, leftAxis);
    const rightFill = rightAxis ? span(Math.max(...rightValues), rightAxis) : 1;
    const score = Math.min(leftFill, rightFill);

    if (!best || score > best.score) best = { score, leftAxis, rightAxis };
  }
  return best;
}

const valuesOf = (seriesList) => seriesList.flatMap((s) => s.points.map((p) => p.v));
const span = (used, axis) => (axis.hi - axis.lo > 0 ? used / (axis.hi - axis.lo) : 0);
const emptyAxis = () => ({ lo: 0, hi: 1, step: 1, ticks: [0, 1] });

/**
 * The right-hand axis, built to share the left axis's gridlines exactly: the
 * same number of intervals and the same zero line.
 */
function alignedAxis(values, leftAxis) {
  if (!values.length) return null;

  const intervals = leftAxis.ticks.length - 1;
  const below = Math.round((0 - leftAxis.lo) / leftAxis.step); // intervals under zero
  const above = Math.max(1, intervals - below);

  const max = Math.max(...values, 0);
  const step = niceStep(max / above);
  const lo = round(-step * below);
  const hi = round(step * above);

  const ticks = [];
  for (let i = 0; i <= intervals; i++) ticks.push(round(lo + i * step));
  return { lo, hi, step, ticks };
}

function niceScale(min, max, count) {
  if (max === min) max = min + 1;
  const step = niceStep((max - min) / count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;

  const ticks = [];
  // Accumulate with a rounded index to keep floating point out of the labels.
  for (let i = 0; lo + i * step <= hi + step / 1000; i++) ticks.push(round(lo + i * step));
  return { lo, hi, step, ticks };
}

/**
 * Round a rough step up to a readable one. The ladder is finer than the usual
 * 1/2/5 because the two axes have to agree on an interval count: with only
 * three rungs, every candidate count rounds to the same step and an axis ends
 * up running to twice its data.
 */
const STEP_LADDER = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceStep(rough) {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rough) || 1)));
  const norm = Math.abs(rough) / mag;
  const factor = STEP_LADDER.find((f) => norm <= f + 1e-9) ?? 10;
  return factor * mag;
}

const round = (v) => Number(v.toPrecision(12));

function yearTicks(xMin, xMax, innerW) {
  const first = new Date(xMin).getUTCFullYear();
  const last = new Date(xMax).getUTCFullYear();
  const span = Math.max(1, last - first);

  // Thin the ticks until each year label has ~46px to itself, so a narrow
  // viewport drops to every other year instead of overprinting.
  const perYear = innerW / span;
  let step = 1;
  for (const candidate of [1, 2, 5, 10]) {
    step = candidate;
    if (perYear * candidate >= 46) break;
  }

  const ticks = [];
  for (let y = first + 1; y <= last; y += step) {
    const t = Date.UTC(y, 0, 1);
    if (t >= xMin && t <= xMax) ticks.push(t);
  }
  return ticks;
}

/* ── Value pills ────────────────────────────────────────────────────────── */

/**
 * Label every annual point that has room for it. Pills are measured after they
 * are in the DOM, and one that would collide with an already-placed pill is
 * dropped rather than nudged — the value stays in the tooltip and table.
 */
function placePills(group, series, x, y, placed, { indexed, top }) {
  const order = [];
  if (series.points.length) order.push(series.points.length - 1); // the endpoint always earns its label
  for (let i = 0; i < series.points.length - 1; i++) order.push(i);

  for (const i of order) {
    const point = series.points[i];
    const label = indexed ? Math.round(point.v).toLocaleString("en-US") : money(series.raw[i].v);

    const cx = x(point.t);
    const cy = y(point.v);
    const node = text(cx, 0, label, { fill: "#f4f7ff", anchor: "middle", size: 11.5, weight: 650 });
    group.append(node);

    const textWidth = node.getComputedTextLength ? node.getComputedTextLength() : label.length * 6.4;
    const boxW = textWidth + 12;
    const boxH = 19;
    const box = { x1: cx - boxW / 2 - 3, x2: cx + boxW / 2 + 3, y1: 0, y2: 0 };

    // Prefer sitting above the point; flip below when that would clip the top.
    const above = cy - 11 - boxH;
    box.y1 = above < top ? cy + 11 : above;
    box.y2 = box.y1 + boxH;

    if (placed.some((p) => overlaps(p, box))) {
      node.remove();
      continue;
    }

    node.setAttribute("y", box.y1 + 13.5);
    const rect = el("rect", {
      x: cx - boxW / 2,
      y: box.y1,
      width: boxW,
      height: boxH,
      rx: 5,
      fill: "#080e1b",
      "fill-opacity": 0.92,
      stroke: "rgba(255,255,255,0.09)",
    });
    group.insertBefore(rect, node);
    placed.push(box);
  }
}

const overlaps = (a, b) => a.x1 < b.x2 + 4 && b.x1 < a.x2 + 4 && a.y1 < b.y2 + 3 && b.y1 < a.y2 + 3;

/* ── Interaction ────────────────────────────────────────────────────────── */

function attachCrosshair({ omitted, svg, container, tooltip, active, data, currency, indexed, geom }) {
  // The crosshair snaps to whichever series has the finest resolution.
  const anchor = active.find((s) => s.id === "price") || active[0];
  const stamps = anchor.points.map((p) => p.t);

  const layer = el("g", { "aria-hidden": "true", visibility: "hidden" });
  const rule = el("line", {
    y1: geom.top,
    y2: geom.top + geom.innerH,
    stroke: INK_2,
    "stroke-width": 1,
    "stroke-opacity": 0.5,
  });
  layer.append(rule);

  const markers = active.map((s) =>
    el("circle", { r: 4.5, fill: s.color, stroke: SURFACE, "stroke-width": 2 }),
  );
  markers.forEach((m) => layer.append(m));
  svg.append(layer);

  const hit = el("rect", {
    x: geom.left,
    y: geom.top,
    width: geom.innerW,
    height: geom.innerH,
    fill: "transparent",
    style: "cursor:crosshair",
  });
  svg.append(hit);

  let index = -1;

  function show(i) {
    index = Math.max(0, Math.min(stamps.length - 1, i));
    const t = stamps[index];
    const cx = geom.x(t);

    rule.setAttribute("x1", cx);
    rule.setAttribute("x2", cx);

    const rows = [];
    active.forEach((s, si) => {
      const point = valueAt(s, t);
      const marker = markers[si];
      if (!point) {
        marker.setAttribute("visibility", "hidden");
        return;
      }
      marker.setAttribute("visibility", "visible");
      marker.setAttribute("cx", geom.x(point.t));
      marker.setAttribute("cy", geom.yFor(s)(point.v));
      rows.push({ series: s, point });
    });

    layer.setAttribute("visibility", "visible");
    paintTooltip(tooltip, container, { t, cx, rows, indexed, currency });
  }

  function hide() {
    layer.setAttribute("visibility", "hidden");
    tooltip.hidden = true;
    index = -1;
  }

  const onMove = (event) => {
    const box = svg.getBoundingClientRect();
    // The SVG is width-responsive, so client pixels need the viewBox ratio.
    const ratio = svg.viewBox.baseVal.width / box.width;
    const localX = (event.clientX - box.left) * ratio;
    const t = geom.xMin + ((localX - geom.left) / geom.innerW) * (geom.xMax - geom.xMin);
    show(nearestIndex(stamps, t));
  };

  const onKey = (event) => {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowRight") show((index < 0 ? stamps.length - 1 : index) + step);
    else if (event.key === "ArrowLeft") show((index < 0 ? stamps.length - 1 : index) - step);
    else if (event.key === "Home") show(0);
    else if (event.key === "End") show(stamps.length - 1);
    else if (event.key === "Escape") hide();
    else return;
    event.preventDefault();
  };

  hit.addEventListener("pointermove", onMove);
  hit.addEventListener("pointerdown", onMove);
  hit.addEventListener("pointerleave", hide);
  svg.addEventListener("keydown", onKey);
  svg.addEventListener("blur", hide);

  return {
    omitted,
    destroy() {
      hit.removeEventListener("pointermove", onMove);
      hit.removeEventListener("pointerdown", onMove);
      hit.removeEventListener("pointerleave", hide);
      svg.removeEventListener("keydown", onKey);
      svg.removeEventListener("blur", hide);
      tooltip.hidden = true;
    },
  };
}

/**
 * The value of a series at time t. Price interpolates to the nearest bar;
 * annual series hold their last reported figure, because that is what was
 * actually known to the market on that date.
 */
function valueAt(series, t) {
  if (series.kind === "annual") {
    let found = null;
    for (let i = 0; i < series.points.length; i++) {
      if (series.points[i].t <= t) found = { ...series.points[i], reported: series.raw[i].v };
      else break;
    }
    return found;
  }
  const i = nearestIndex(series.points.map((p) => p.t), t);
  const point = series.points[i];
  return point ? { ...point, reported: series.raw[i].v } : null;
}

function nearestIndex(stamps, t) {
  let lo = 0;
  let hi = stamps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (stamps[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(stamps[lo - 1] - t) < Math.abs(stamps[lo] - t)) return lo - 1;
  return lo;
}

function paintTooltip(tooltip, container, { t, cx, rows, indexed, currency }) {
  tooltip.replaceChildren();

  const head = document.createElement("div");
  head.className = "tt-date";
  head.textContent = fmtDate(t);
  tooltip.append(head);

  let fyNote = "";
  for (const { series, point } of rows) {
    const row = document.createElement("div");
    row.className = "tt-row";

    const key = document.createElement("span");
    key.className = "tt-key";
    key.style.background = series.color;

    const label = document.createElement("span");
    label.className = "tt-label";
    label.textContent = series.label;

    const value = document.createElement("span");
    value.className = "tt-value";
    value.textContent = indexed
      ? Math.round(point.v).toLocaleString("en-US")
      : series.id === "price"
        ? fmtPrice(point.reported, currency)
        : money(point.reported);

    row.append(key, label, value);
    tooltip.append(row);

    if (series.kind === "annual" && point.fy) fyNote = `Fiscal year ${point.fy} figures`;
  }

  if (fyNote) {
    const note = document.createElement("div");
    note.className = "tt-fy";
    note.textContent = fyNote;
    tooltip.append(note);
  }

  tooltip.hidden = false;

  // Keep the tooltip inside the card, flipping sides near the right edge.
  const scale = container.clientWidth / (container.querySelector("svg")?.viewBox.baseVal.width || 1);
  const px = cx * scale;
  const half = tooltip.offsetWidth / 2;
  const clamped = Math.min(Math.max(px, half + 4), container.clientWidth - half - 4);
  tooltip.style.left = `${clamped}px`;
  tooltip.style.top = `${Math.max(tooltip.offsetHeight + 8, 96)}px`;
}

/* ── SVG helpers ────────────────────────────────────────────────────────── */

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function text(x, y, content, { fill, anchor = "start", size = 12, weight = 400 } = {}) {
  const node = el("text", {
    x,
    y,
    fill,
    "text-anchor": anchor,
    "font-size": size,
    "font-weight": weight,
    "font-family": "inherit",
  });
  node.textContent = content; // series and company names are untrusted input
  return node;
}

function axisTitle(x, y, content, rotate) {
  const node = text(0, 0, content, { fill: INK_3, anchor: "middle", size: 11 });
  node.setAttribute("transform", `translate(${x} ${y}) rotate(${rotate})`);
  return node;
}

function describe(data, active, indexed) {
  const names = active.map((s) => s.label).join(", ");
  const scale = indexed ? "indexed to 100 at the start of the window" : "in actual units";
  return `${data.symbol}: ${names} over time, ${scale}. Use the table view for the underlying figures.`;
}
