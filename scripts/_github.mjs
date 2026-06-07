// SPDX-License-Identifier: MIT

/**
 * Shared GitHub API helpers used by the sync scripts in this folder.
 *
 *   - ghFetch:      fetch + JSON parse + 2-attempt exponential backoff
 *   - rateLimited:  wait until the X-RateLimit-Reset window elapses
 *   - pLimit:       tiny concurrency cap (no external deps)
 *
 * These exist so a single transient 5xx doesn't fail an entire daily
 * refresh, and so we can run the per-app loop with bounded concurrency
 * instead of one round-trip at a time.
 */

const DEFAULT_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-apps-bot",
};

/**
 * Read the GitHub rate-limit reset timestamp from a Response's headers
 * and return the number of milliseconds to wait (0 if not set / in the
 * past, capped to 5 minutes so a corrupt header can't hang us).
 */
export function rateLimitWaitMs(res, capMs = 5 * 60_000) {
  const reset = res.headers.get("x-ratelimit-reset");
  if (!reset) return 0;
  const resetMs = Number(reset) * 1000 - Date.now();
  if (!Number.isFinite(resetMs) || resetMs <= 0) return 0;
  return Math.min(resetMs, capMs);
}

/**
 * Sleep helper.
 */
export function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a GitHub URL with auth, JSON parsing, and a 2-attempt retry
 * for transient 5xx errors. Caller decides how to handle 404 / 403.
 *
 * Options:
 *   token: optional bearer token (omit for unauthenticated calls)
 *   userAgent: override the default UA
 *   attempts: total attempts before giving up (default 2 = 1 retry)
 *   onRateLimited: optional async () => number hook — invoked when we
 *     hit a 429/403 with rate-limit headers, and should return ms to
 *     wait. Default: honor X-RateLimit-Reset.
 */
export async function ghFetch(path, options = {}) {
  const { token, userAgent, attempts = 2, onRateLimited } = options;
  const headers = {
    ...DEFAULT_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userAgent ? { "User-Agent": userAgent } : {}),
  };
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    let res;
    try {
      res = await fetch(`https://api.github.com${path}`, { headers });
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(500 * Math.pow(2, i));
        continue;
      }
      throw err;
    }
    if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
      const wait = onRateLimited ? onRateLimited() : rateLimitWaitMs(res);
      if (wait > 0) {
        console.warn(`[ghFetch] rate limited, waiting ${Math.round(wait / 1000)}s for ${path}`);
        await sleep(wait);
        continue;
      }
    }
    if (res.status >= 500 && i < attempts - 1) {
      lastErr = new Error(`GitHub ${res.status} ${res.statusText} for ${path}`);
      await sleep(500 * Math.pow(2, i));
      continue;
    }
    return res;
  }
  throw lastErr ?? new Error(`ghFetch: gave up after ${attempts} attempts for ${path}`);
}

/**
 * Tiny p-limit implementation: a promise-pool that caps how many
 * `fn(item)` calls run at once. Await the returned promise to get the
 * full results array in input order.
 */
export function pLimit(concurrency, items, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  return Promise.all(workers).then(() => out);
}
