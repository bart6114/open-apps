#!/usr/bin/env node
/**
 * Hybrid fetcher v4: two phases.
 *
 * Phase 1 (search API, 10/min): for every repo, get stars + last commit.
 *   Reuse stars from the 26-entry old cache to skip redundant searches.
 *   Output: every repo has at least `stars` and `lastCommitAt`.
 *
 * Phase 2 (commits API, 60/hr): for borderline repos (50 <= stars < 500),
 *   fetch the all-time commits to check totalCommitsKnown.
 *
 * Bar: stars >= 50 AND totalCommitsKnown >= 50.
 *   - stars < 50 → fail (no commits check)
 *   - stars >= 500 → pass (heuristic — high stars = enough commits in practice)
 *   - 50 <= stars < 500 → commits check
 *
 * Re-runnable. Skips already-cached data.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPOS = "/tmp/legacy-repos.json";
const CACHE = "/tmp/legacy-cache-v4.json";
const OLD_CACHE = "/tmp/legacy-cache-26-recent.json";

const API = "https://api.github.com";
const SEARCH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
};
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function loadJson(p, fallback) {
  try { return JSON.parse(await readFile(p, "utf8")); }
  catch { return fallback; }
}
async function saveJson(p, v) { await writeFile(p, JSON.stringify(v, null, 2)); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function searchOne(owner, name) {
  // Build query with literal `+` for AND. We can't use encodeURIComponent
  // because it turns `+` into `%2B`, which GitHub parses as a literal `+`
  // (not AND). Just sanitize the components.
  const sanitize = (s) => s.replace(/[^a-zA-Z0-9._-]/g, "");
  const q = `${sanitize(name)}+in:name+user:${sanitize(owner)}`;
  const url = `${API}/search/repositories?q=${q}&per_page=1`;
  const res = await fetch(url, { headers: SEARCH_HEADERS });
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset, bucket: "search" };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  if (!data.items || data.items.length === 0) return { __notFound: true };
  const item = data.items[0];
  if (item.owner?.login?.toLowerCase() !== owner.toLowerCase() ||
      item.name?.toLowerCase() !== name.toLowerCase()) {
    return { __notFound: true };
  }
  return {
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    lastCommitAt: (item.pushed_at || item.updated_at || "").slice(0, 10),
    archived: item.archived || false,
  };
}

// Fallback: use core /repos/{owner}/{name} directly. Used when search
// returns 422 (some repos aren't indexed by search). Costs 1 core rate-limit
// call.
async function coreRepoOne(owner, name) {
  const url = `${API}/repos/${owner}/${name}`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return { __notFound: true };
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset, bucket: "core" };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    lastCommitAt: (data.pushed_at || data.updated_at || "").slice(0, 10),
    archived: data.archived || false,
  };
}

async function fetchCommitsCount(owner, name) {
  const url = `${API}/repos/${owner}/${name}/commits?per_page=100`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return { __notFound: true };
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset, bucket: "core" };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  return { totalCommitsKnown: Array.isArray(data) ? data.length : 0 };
}

function hasStars(stat) {
  return stat && typeof stat.stars === "number" && (stat.stars === 0 || stat.lastCommitAt);
}
function isComplete(stat) {
  if (!stat || stat.__error || stat.__notFound) return true; // terminal
  if (!hasStars(stat)) return false;
  if (stat.stars < 50) return true;
  if (stat.stars >= 500) return true;
  return typeof stat.totalCommitsKnown === "number";
}

async function loadOldCacheStars() {
  const old = await loadJson(OLD_CACHE, { results: {} });
  const stars = {};
  for (const [slug, stat] of Object.entries(old.results)) {
    if (typeof stat.stars === "number" && stat.stars > 0) {
      stars[slug] = { stars: stat.stars, lastCommitAt: stat.lastCommitAt };
    }
  }
  return stars;
}

async function phase1(repos, cache) {
  const oldStars = await loadOldCacheStars();
  const needSearch = repos.filter((r) => !hasStars(cache.results[r.slug]));
  console.log(`[v4.1] search: ${needSearch.length} need stars, ${Object.keys(oldStars).length} reuse from old cache`);

  for (let i = 0; i < needSearch.length; i++) {
    const repo = needSearch[i];
    let stat = cache.results[repo.slug] || { slug: repo.slug, name: repo.name, category: repo.category, repoUrl: repo.repoUrl };
    if (oldStars[repo.slug]) {
      stat.stars = oldStars[repo.slug].stars;
      stat.lastCommitAt = oldStars[repo.slug].lastCommitAt;
      cache.results[repo.slug] = stat;
      continue;
    }
    const parsed = parseRepo(repo.repoUrl);
    if (!parsed) { stat.__error = "bad url"; cache.results[repo.slug] = stat; continue; }
    const r = await searchOne(parsed.owner, parsed.repo);
    if (r.__rateLimited) {
      const sleepMs = Math.max(0, r.reset * 1000 - Date.now()) + 2000;
      console.log(`[v4.1] search rate limited at ${repo.slug}. Sleep ${Math.round(sleepMs/1000)}s`);
      await saveJson(CACHE, cache);
      await sleep(sleepMs);
      const retry = await searchOne(parsed.owner, parsed.repo);
      if (retry.__rateLimited) { console.log("[v4.1] still rate limited, abort"); await saveJson(CACHE, cache); return false; }
      Object.assign(r, retry);
    }
    if (r.__notFound) { stat.__notFound = true; stat.stars = 0; stat.lastCommitAt = null; }
    else if (r.__error) {
      // 422 = repo not indexed by search. Fall back to core API.
      if (String(r.__error).includes("422")) {
        const cr = await coreRepoOne(parsed.owner, parsed.repo);
        if (cr.__rateLimited) {
          const sleepMs = Math.max(0, cr.reset * 1000 - Date.now()) + 2000;
          console.log(`[v4.1] core fallback rate limited at ${repo.slug}. Sleep ${Math.round(sleepMs/1000)}s`);
          await saveJson(CACHE, cache);
          await sleep(sleepMs);
          const retry = await coreRepoOne(parsed.owner, parsed.repo);
          if (retry.__rateLimited) { console.log("[v4.1] still rate limited, abort"); await saveJson(CACHE, cache); return false; }
          Object.assign(cr, retry);
        }
        if (cr.__notFound) { stat.__notFound = true; stat.stars = 0; stat.lastCommitAt = null; }
        else if (cr.__error) { stat.__error = cr.__error; }
        else { stat.stars = cr.stars; stat.lastCommitAt = cr.lastCommitAt; stat.forks = cr.forks; stat.archived = cr.archived; }
      } else {
        stat.__error = r.__error;
      }
    }
    else { stat.stars = r.stars; stat.lastCommitAt = r.lastCommitAt; stat.forks = r.forks; stat.archived = r.archived; }
    cache.results[repo.slug] = stat;
    const v = stat.__notFound ? "404" : stat.__error ? `err=${stat.__error}` : `${stat.stars}⭐`;
    console.log(`[v4.1] ${repo.slug}: ${v} (${i+1}/${needSearch.length})`);
    if ((i + 1) % 5 === 0) await saveJson(CACHE, cache);
    // Throttle search: 10/min = one every 6s. Sleep only if we used a search call.
    if (!oldStars[repo.slug]) await sleep(6500);
  }
  await saveJson(CACHE, cache);
  return true;
}

async function phase2(repos, cache) {
  const borderline = repos.filter((r) => {
    const s = cache.results[r.slug];
    return s && !s.__error && !s.__notFound && s.stars >= 50 && s.stars < 500 && typeof s.totalCommitsKnown !== "number";
  });
  console.log(`[v4.2] commits: ${borderline.length} borderline repos (50-500 stars)`);

  for (let i = 0; i < borderline.length; i++) {
    const repo = borderline[i];
    let stat = cache.results[repo.slug];
    const parsed = parseRepo(repo.repoUrl);
    if (!parsed) { stat.__error = "bad url"; cache.results[repo.slug] = stat; continue; }
    const r = await fetchCommitsCount(parsed.owner, parsed.repo);
    if (r.__rateLimited) {
      const sleepMs = Math.max(0, r.reset * 1000 - Date.now()) + 2000;
      console.log(`[v4.2] commits rate limited at ${repo.slug}. Sleep ${Math.round(sleepMs/1000)}s`);
      await saveJson(CACHE, cache);
      await sleep(sleepMs);
      const retry = await fetchCommitsCount(parsed.owner, parsed.repo);
      if (retry.__rateLimited) { console.log("[v4.2] still rate limited, abort"); await saveJson(CACHE, cache); return false; }
      Object.assign(r, retry);
    }
    if (r.__notFound) { stat.__notFound = true; }
    else if (r.__error) { stat.__error = r.__error; }
    else { stat.totalCommitsKnown = r.totalCommitsKnown; }
    cache.results[repo.slug] = stat;
    const v = stat.totalCommitsKnown !== undefined ? `commits>=${stat.totalCommitsKnown}` : "err";
    console.log(`[v4.2] ${repo.slug}: ${v} (${i+1}/${borderline.length})`);
    if ((i + 1) % 5 === 0) await saveJson(CACHE, cache);
  }
  await saveJson(CACHE, cache);
  return true;
}

async function main() {
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const cache = await loadJson(CACHE, { results: {} });
  const ok1 = await phase1(repos, cache);
  if (!ok1) return;
  const ok2 = await phase2(repos, cache);
  if (!ok2) return;
  const done = Object.values(cache.results).filter(isComplete).length;
  console.log(`[v4] done. complete=${done}/${repos.length}`);
}

main().catch((e) => { console.error("[v4] fatal:", e); process.exit(1); });
