/**
 * Outbound HTTP helper shared by the providers.
 *
 * Yahoo in particular returns HTML error pages (or nothing at all) to clients
 * that do not look like a browser, so every request carries a UA and a timeout.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export class UpstreamError extends Error {
  constructor(message, { status = 502, provider } = {}) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.provider = provider;
  }
}

/** GET a URL and parse it as JSON, with a timeout and a useful error message. */
export async function getJson(url, { timeoutMs = 12000, provider, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*", ...headers },
    });
  } catch (err) {
    const reason = err.name === "AbortError" ? `timed out after ${timeoutMs}ms` : err.message;
    throw new UpstreamError(`${provider}: request failed (${reason})`, { provider });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new UpstreamError(`${provider}: upstream returned HTTP ${res.status}`, {
      provider,
      // Pass rate limiting and "no such symbol" through to the client as-is.
      status: res.status === 404 || res.status === 429 ? res.status : 502,
    });
  }

  const body = await res.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new UpstreamError(`${provider}: upstream returned a non-JSON body`, { provider });
  }
}
