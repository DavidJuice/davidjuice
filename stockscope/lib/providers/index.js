/**
 * Provider registry and selection.
 *
 * DATA_SOURCE picks one explicitly (yahoo | fmp | alphavantage | demo).
 * Left unset, "auto" prefers whichever keyed provider is configured, because a
 * key buys deeper financial history, and falls back to keyless Yahoo.
 */

import * as yahoo from "./yahoo.js";
import * as fmp from "./fmp.js";
import * as alphavantage from "./alphavantage.js";
import * as demo from "./demo.js";

export const providers = { yahoo, fmp, alphavantage, demo };

export function selectProvider() {
  const choice = (process.env.DATA_SOURCE || "auto").toLowerCase();
  if (choice !== "auto") {
    const provider = providers[choice];
    if (!provider) {
      const known = Object.keys(providers).join(", ");
      throw new Error(`Unknown DATA_SOURCE "${choice}". Expected one of: ${known}`);
    }
    return provider;
  }

  if (process.env.FMP_API_KEY) return fmp;
  if (process.env.ALPHAVANTAGE_API_KEY) return alphavantage;
  return yahoo;
}

/**
 * Whether to answer a failed upstream call with synthetic data.
 *
 * Off unless asked for: quietly swapping invented numbers in for real ones is
 * the worst thing a finance chart can do. When it is on, the payload still
 * carries `synthetic: true` and the UI keeps its banner up.
 */
export function demoFallbackEnabled() {
  return /^(1|true|on|yes)$/i.test(process.env.DEMO_FALLBACK || "");
}

export function describe(provider) {
  return {
    id: provider.id,
    label: provider.label,
    synthetic: provider.id === demo.id,
    demoFallback: demoFallbackEnabled(),
  };
}
