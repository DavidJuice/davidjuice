/** Number, money and date formatting shared by the chart, tooltip and tables. */

const DATE_FULL = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** Compact money for labels: $23.77b, $412m, $1.2k, -$3.4b. */
export function money(value, { decimals } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  const [divisor, suffix] =
    abs >= 1e12 ? [1e12, "t"]
    : abs >= 1e9 ? [1e9, "b"]
    : abs >= 1e6 ? [1e6, "m"]
    : abs >= 1e3 ? [1e3, "k"]
    : [1, ""];

  const scaled = abs / divisor;
  // Two decimals in the billions keeps 23.77b readable; whole units below that.
  const places = decimals ?? (suffix === "" ? 2 : scaled < 10 ? 2 : scaled < 100 ? 1 : 0);
  return `${sign}$${trimZeros(scaled.toFixed(places))}${suffix}`;
}

/** Axis ticks: same scale as `money` but terser — $25b, $700. */
export function moneyTick(value) {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e9) return `${sign}$${trimZeros((abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1))}b`;
  if (abs >= 1e6) return `${sign}$${trimZeros((abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1))}m`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}k`;
  return `${sign}$${trimZeros(abs.toFixed(abs < 10 ? 2 : 0))}`;
}

/** Exact price with cents, thousands-separated. */
export function price(value, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/** Signed percentage: +156.7%, -12.4%. */
export function percent(value, { decimals = 1, signed = true } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function date(ms) {
  return DATE_FULL.format(new Date(ms));
}

export function year(ms) {
  return new Date(ms).getUTCFullYear();
}

const trimZeros = (s) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);
