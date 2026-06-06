/**
 * Watchlist — a small client-side list of app slugs the user has
 * starred. Persisted in localStorage. No backend, no auth, just a
 * single JSON array of slugs.
 *
 * Two surfaces:
 *   - A read-side helper used by Astro pages to render an
 *     initial "is watched" state.
 *   - A write-side script that runs after the page is interactive
 *     and keeps the UI in sync with localStorage.
 *
 * Because Astro pages render server-side, we read from a `<script>`
 * tag that emits the current list as JSON; the rest of the page
 * hydrates against that.
 */

export const WATCHLIST_KEY = "open-apps:watchlist";
export const WATCHLIST_EVENT = "open-apps:watchlist:change";

export type Watchlist = string[];

/**
 * Read the current watchlist from localStorage. Safe to call in the
 * browser only — returns an empty array on the server.
 */
export function readWatchlist(): Watchlist {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Write the watchlist back to localStorage and notify listeners.
 * Other tabs receive a `storage` event automatically.
 */
export function writeWatchlist(list: Watchlist): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: list }));
  } catch {
    // Storage full / disabled — silently fail; the user's toggle
    // will revert on next render.
  }
}

export function isWatched(slug: string, list: Watchlist = readWatchlist()): boolean {
  return list.includes(slug);
}

export function toggleWatched(slug: string): boolean {
  const list = readWatchlist();
  const idx = list.indexOf(slug);
  let watched: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    watched = false;
  } else {
    list.push(slug);
    watched = true;
  }
  writeWatchlist(list);
  return watched;
}
