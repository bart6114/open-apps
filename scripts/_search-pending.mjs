#!/usr/bin/env node
/**
 * Quick search-only run for the 33 PENDING repos.
 * Uses search API (10/min). Marks each cache entry with stars + lastCommitAt.
 * After this, all 163 have stars. The apply-bar.mjs run will then
 * check commits for borderline and apply the bar.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = "/tmp/legacy-cache-v4.json";
const REPOS = "/tmp/legacy-repos.json";

const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadJson(p, fb) {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return fb; }
}
async function saveJson(p, v) { await writeFile(p, JSON.stringify(v, null, 2)); }

function sanitize(s) { return s.replace(/[^a-zA-Z0-9._-]/g, ""); }

async function searchOne(owner, name) {
  const q = `${sanitize(name)}+in:name+user:${sanitize(owner)}`;
  const url = `${API}/search/repositories?q=${q}&per_page=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset };
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

async function main() {
  const cache = await loadJson(CACHE, { results: {} });
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const pending = repos.filter((r) => !cache.results[r.slug]);
  console.log(`[search] ${pending.length} PENDING repos to fetch stars for`);

  for (let i = 0; i < pending.length; i++) {
    const repo = pending[i];
    let stat = cache.results[repo.slug] || {
      slug: repo.slug, name: repo.name, category: repo.category, repoUrl: repo.repoUrl,
    };
    const m = repo.repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) {
      stat.__error = "bad url";
      cache.results[repo.slug] = stat;
      continue;
    }
    const owner = m[1], name = m[2].replace(/\.git$/, "");
    const r = await searchOne(owner, name);
    if (r.__rateLimited) {
      const sleepMs = Math.max(0, r.reset * 1000 - Date.now()) + 2000;
      console.log(`[search] rate limited at ${repo.slug}. Sleep ${Math.round(sleepMs/1000)}s`);
      await saveJson(CACHE, cache);
      await sleep(sleepMs);
      const retry = await searchOne(owner, name);
      if (retry.__rateLimited) { console.log("[search] still rate limited, abort"); await saveJson(CACHE, cache); return; }
      Object.assign(r, retry);
    }
    if (r.__notFound) { stat.__notFound = true; stat.stars = 0; stat.lastCommitAt = null; }
    else if (r.__error) { stat.__error = r.__error; }
    else { stat.stars = r.stars; stat.lastCommitAt = r.lastCommitAt; stat.forks = r.forks; stat.archived = r.archived; }
    cache.results[repo.slug] = stat;
    const v = stat.__notFound ? "404" : stat.__error ? "err="+stat.__error : `${stat.stars}⭐ last=${stat.lastCommitAt}`;
    console.log(`[search] ${repo.slug}: ${v} (${i+1}/${pending.length})`);
    if ((i + 1) % 5 === 0) await saveJson(CACHE, cache);
    // Throttle search: 10/min = one every 6s
    await sleep(6500);
  }
  await saveJson(CACHE, cache);
  const total = Object.values(cache.results).filter(s => s && (typeof s.stars === "number" || s.__notFound || s.__error)).length;
  console.log(`[search] done. ${total}/163 have stars.`);
}

main().catch((e) => { console.error("[search] fatal:", e); process.exit(1); });
