/**
 * StockScope — a small zero-dependency server that fronts a market-data
 * provider and serves the chart UI out of public/.
 *
 *   npm start        real data (Yahoo by default, no key needed)
 *   npm run demo     synthetic data, no network
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as cache from "./lib/cache.js";
import { providers, selectProvider, demoFallbackEnabled, describe } from "./lib/providers/index.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

const RANGES = new Set(["1y", "5y", "10y", "max"]);
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,15}$/;

// Prices move all day; income statements move four times a year.
const TTL = { search: 10 * 60_000, prices: 5 * 60_000, stock: 5 * 60_000 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const provider = selectProvider();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Only GET is supported" });
    }
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(url, res);
    }
    return await serveStatic(url.pathname, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    sendJson(res, status, { error: err.message || "Internal error", provider: err.provider });
  }
});

async function handleApi(url, res) {
  switch (url.pathname) {
    case "/api/config":
      return sendJson(res, 200, {
        ...describe(provider),
        available: Object.values(providers).map((p) => ({
          id: p.id,
          label: p.label,
          needsKey: p.needsKey,
        })),
      });

    case "/api/search": {
      const q = (url.searchParams.get("q") || "").trim();
      if (q.length < 1) return sendJson(res, 200, { results: [] });

      const results = await cache.wrap(`search:${provider.id}:${q.toLowerCase()}`, TTL.search, () =>
        provider.search(q),
      );
      return sendJson(res, 200, { results });
    }

    case "/api/stock": {
      const symbol = (url.searchParams.get("symbol") || "").trim();
      const range = url.searchParams.get("range") || "10y";

      if (!SYMBOL_RE.test(symbol)) {
        return sendJson(res, 400, { error: `"${symbol}" is not a valid ticker symbol` });
      }
      if (!RANGES.has(range)) {
        return sendJson(res, 400, { error: `Unsupported range "${range}"` });
      }

      const data = await loadStock(symbol.toUpperCase(), range);
      return sendJson(res, 200, data);
    }

    case "/api/health":
      return sendJson(res, 200, { ok: true, source: provider.id });

    default:
      return sendJson(res, 404, { error: `No such endpoint: ${url.pathname}` });
  }
}

async function loadStock(symbol, range) {
  const key = `stock:${provider.id}:${symbol}:${range}`;
  try {
    return await cache.wrap(key, TTL.stock, async () => ({
      ...(await provider.fetchStock(symbol, range)),
      fetchedAt: Date.now(),
    }));
  } catch (err) {
    if (!demoFallbackEnabled() || provider.id === "demo") throw err;

    console.warn(`[stockscope] ${provider.id} failed for ${symbol}: ${err.message} — using demo data`);
    return {
      ...(await providers.demo.fetchStock(symbol, range)),
      fetchedAt: Date.now(),
      fallbackFrom: provider.id,
      fallbackReason: err.message,
    };
  }
}

async function serveStatic(pathname, res) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, rel);

  // Refuse anything that escaped the public directory via ".." segments.
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  let body;
  try {
    body = await fs.readFile(filePath);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  res.end(body);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

server.listen(PORT, HOST, () => {
  console.log(`StockScope → http://${HOST}:${PORT}`);
  console.log(`Data source: ${provider.label}${provider.id === "demo" ? " — numbers are invented" : ""}`);
  if (demoFallbackEnabled()) console.log("DEMO_FALLBACK is on: upstream failures return synthetic data.");
});
