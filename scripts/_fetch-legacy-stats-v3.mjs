#!/usr/bin/env node
/**
 * Hybrid fetcher v3: GitHub search API (10/min) for stars + last commit,
 * plus commits API (60/hr) only for borderline repos (50-500 stars).
 *
 * Bar: stars >= 50 AND totalCommitsKnown >= 50.
 *   - stars < 50 → fail (no commits check needed)
 *   - stars >= 500 → pass on stars, assume commits ok (heuristic)
 *   - 50 <= stars < 500 → fetch commits, check totalCommitsKnown
 *
 * Re-runnable. Skips already-classified entries.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPOS = "/tmp/legacy-repos.json";
const CACHE = "/tmp/legacy-cache-v3.json";
const OLD_CACHE = "/tmp/legacy-cache-26-recent.json"; // has stars for 26

const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
  "X-GitHub-Api-Version": "2022-11-28",
};
const SEARCH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
};

async function loadJson(p, fallback) {
  try { return JSON.parse(await readFile(p, "utf8")); }
  catch { return fallback; }
}
async function saveJson(p, v) { await writeFile(p, JSON.stringify(v, null, 2)); }

function parseRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

async function searchOne(owner, name) {
  // search/repositories?q=repo:owner/name (the q "repo:owner/name" syntax
  // doesn't work, but exact full_name does)
  const q = `${name}+in:name+user:${owner}`;
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=1`;
  const res = await fetch(url, { headers: SEARCH_HEADERS });
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  if (!data.items || data.items.length === 0) return { __notFound: true };
  const item = data.items[0];
  // Verify owner/name match (search may return other repos with similar name)
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

async function fetchCommits(owner, name) {
  const url = `${API}/repos/${owner}/${name}/commits?per_page=100`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return { __notFound: true };
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  return { totalCommitsKnown: Array.isArray(data) ? data.length : 0 };
}

function isComplete(stat) {
  if (!stat || stat.__error || stat.__notFound) return false;
  if (typeof stat.stars !== "number") return false;
  if (stat.stars < 50) return true; // failed by stars, no need to check commits
  if (stat.stars >= 500) return true; // passed by stars (heuristic)
  // 50 <= stars < 500 → need commits
  return typeof stat.totalCommitsKnown === "number";
}

async function main() {
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const cache = await loadJson(CACHE, { results: {} });
  const oldStars = await loadOldCacheStars();
  const toProcess = repos.filter((r) => !isComplete(cache.results[r.slug]));
  console.log(
    `[v3] ${repos.length} total, ${repos.length - toProcess.length} complete, ${toProcess.length} to process`,
  );
  console.log(`[v3] ${Object.keys(oldStars).length} repos have stars from old cache`);

  let lastRateCheck = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const repo = toProcess[i];
    let stat = cache.results[repo.slug] || { slug: repo.slug, name: repo.name, category: repo.category, repoUrl: repo.repoUrl };
    const parsed = parseRepo(repo.repoUrl);
    if (!parsed) {
      stat.__error = "bad url";
      cache.results[repo.slug] = stat;
      continue;
    }
    const { owner, name } = parsed;

    // Step 1: stars (reuse old cache if available, else search)
    if (typeof stat.stars !== "number") {
      if (oldStars[repo.slug]) {
        stat.stars = oldStars[repo.slug].stars;
        stat.lastCommitAt = oldStars[repo.slug].lastCommitAt;
      } else {
        const r = await searchOne(owner, name);
        if (r.__rateLimited) {
          const sleepMs = Math.max(0, r.reset * 1000 - Date.now()) + 2000;
          console.log(`[v3] search rate limited at ${repo.slug} (${i+1}/${toProcess.length}). Sleep ${Math.round(sleepMs/1000)}s`);
          await saveJson(CACHE, cache);
          await sleep(sleepMs);
          const retry = await searchOne(owner, name);
          if (retry.__rateLimited) { console.log("[v3] still rate limited, abort"); await saveJson(CACHE, cache); return; }
          Object.assign(r, retry);
        }
        if (r.__notFound) { stat.__notFound = true; stat.stars = 0; }
        else if (r.__error) { stat.__error = r.__error; }
        else {
          stat.stars = r.stars;
          stat.lastCommitAt = r.lastCommitAt;
          stat.forks = r.forks;
          stat.archived = r.archived;
        }
        // Throttle search: 10/min = one every 6s
        await sleep(6500);
      }
    }

    // Step 2: commits if borderline
    if (!stat.__error && !stat.__notFound && stat.stars >= 50 && stat.stars < 500 && typeof stat.totalCommitsKnown !== "number") {
      const r = await fetchCommits(owner, name);
      if (r.__rateLimited) {
        const sleepMs = Math.max(0, r.reset * 1000 - Date.now()) + 2000;
        console.log(`[v3] commits rate limited at ${repo.slug}. Sleep ${Math.round(sleepMs/1000)}s`);
        await saveJson(CACHE, cache);
        await sleep(sleepMs);
        const retry = await fetchCommits(owner, name);
        if (retry.__rateLimited) { console.log("[v3] still rate limited, abort"); await saveJson(CACHE, cache); return; }
        Object.assign(r, retry);
      }
      if (r.__notFound) { stat.__notFound = true; }
      else if (r.__error) { stat.__error = r.__error; }
      else { stat.totalCommitsKnown = r.totalCommitsKnown; }
    }

    stat.fetchedAt = new Date().toISOString();
    cache.results[repo.slug] = stat;
    const verdict = stat.__error ? "ERR" : (stat.__notFound ? "404" : `${stat.stars}⭐ commits>=${stat.totalCommitsKnown ?? "?"}`);
    console.log(`[v3] ${repo.slug}: ${verdict} (${i+1}/${toProcess.length})`);
    if ((i + 1) % 5 === 0) await saveJson(CACHE, cache);
  }
  await saveJson(CACHE, cache);
  const done = Object.values(cache.results).filter(isComplete).length;
  console.log(`[v3] done. complete=${done}/${repos.length}`);
}

main().catch((e) => { console.error("[v3] fatal:", e); process.exit(1); });
