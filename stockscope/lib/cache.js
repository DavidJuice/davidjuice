/**
 * Tiny in-memory TTL cache.
 *
 * Upstream providers all rate-limit, and a page reload asks for the exact same
 * series again, so every provider call goes through here.
 */

const store = new Map();

/** Read a live entry, or undefined if missing/expired. */
export function get(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

/** Store a value for `ttlMs` milliseconds. */
export function set(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/** get-or-fill. `fn` only runs on a miss, and a rejection is never cached. */
export async function wrap(key, ttlMs, fn) {
  const hit = get(key);
  if (hit !== undefined) return hit;
  return set(key, await fn(), ttlMs);
}

export function clear() {
  store.clear();
}
