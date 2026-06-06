#!/usr/bin/env node
/**
 * One-shot bar check on /tmp/legacy-cache-v4.json.
 *
 * 1. Mark feeel as notFound (gitlab, not GitHub).
 * 2. Retry the 4 HTTP 422 errors with core API.
 * 3. For borderline repos (50 <= stars < 500), do commits API check.
 * 4. Output a final classification per slug.
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
  "X-GitHub-Api-Version": "2022-11-28",
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadJson(p, fb) {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return fb; }
}
async function saveJson(p, v) { await writeFile(p, JSON.stringify(v, null, 2)); }

function parseRepo(url) {
  if (!url.includes("github.com")) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function coreRepoOne(owner, name) {
  const url = `${API}/repos/${owner}/${name}`;
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return { __notFound: true };
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset };
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
    return { __rateLimited: true, reset };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  const data = await res.json();
  return { totalCommitsKnown: Array.isArray(data) ? data.length : 0 };
}

async function main() {
  const cache = await loadJson(CACHE, { results: {} });
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const repoBySlug = new Map(repos.map((r) => [r.slug, r]));

  // 1) Mark feeel (gitlab) as notFound
  for (const [slug, stat] of Object.entries(cache.results)) {
    if (stat.__error === "bad url" && stat.repoUrl?.includes("gitlab")) {
      stat.__notFound = true;
      stat.stars = 0;
      stat.lastCommitAt = null;
      delete stat.__error;
    }
  }

  // 2) Retry 422s with core API
  const err422 = Object.values(cache.results).filter(
    (s) => s.__error && String(s.__error).includes("422"),
  );
  console.log(`[bar] retrying ${err422.length} 422 errors with core API`);
  for (const stat of err422) {
    const r = repoBySlug.get(stat.slug);
    if (!r) continue;
    const parsed = parseRepo(r.repoUrl);
    if (!parsed) continue;
    const got = await coreRepoOne(parsed.owner, parsed.repo);
    if (got.__rateLimited) {
      const sleepMs = Math.max(0, got.reset * 1000 - Date.now()) + 2000;
      console.log(`[bar] rate limited. Sleep ${Math.round(sleepMs/1000)}s`);
      await saveJson(CACHE, cache);
      await sleep(sleepMs);
      const retry = await coreRepoOne(parsed.owner, parsed.repo);
      if (retry.__rateLimited) { console.log("[bar] still rate limited, abort"); await saveJson(CACHE, cache); return; }
      Object.assign(got, retry);
    }
    if (got.__notFound) { stat.__notFound = true; stat.stars = 0; stat.lastCommitAt = null; }
    else if (got.__error) { stat.__error = got.__error; } // still error
    else {
      delete stat.__error;
      stat.stars = got.stars;
      stat.lastCommitAt = got.lastCommitAt;
      stat.forks = got.forks;
      stat.archived = got.archived;
    }
    console.log(`[bar] ${stat.slug}: ${stat.__notFound ? "404" : stat.__error ? "err="+stat.__error : stat.stars+"⭐"}`);
  }

  // 3) Commits check for borderline (50 <= stars < 500)
  const borderline = Object.values(cache.results).filter(
    (s) => !s.__error && !s.__notFound && typeof s.stars === "number" && s.stars >= 50 && s.stars < 500 && typeof s.totalCommitsKnown !== "number",
  );
  console.log(`[bar] commits check for ${borderline.length} borderline (50-500⭐) repos`);
  for (const stat of borderline) {
    const r = repoBySlug.get(stat.slug);
    if (!r) continue;
    const parsed = parseRepo(r.repoUrl);
    if (!parsed) continue;
    const got = await fetchCommitsCount(parsed.owner, parsed.repo);
    if (got.__rateLimited) {
      const sleepMs = Math.max(0, got.reset * 1000 - Date.now()) + 2000;
      console.log(`[bar] rate limited. Sleep ${Math.round(sleepMs/1000)}s`);
      await saveJson(CACHE, cache);
      await sleep(sleepMs);
      const retry = await fetchCommitsCount(parsed.owner, parsed.repo);
      if (retry.__rateLimited) { console.log("[bar] still rate limited, abort"); await saveJson(CACHE, cache); return; }
      Object.assign(got, retry);
    }
    if (got.__notFound) { stat.__notFound = true; }
    else if (got.__error) { stat.__error = got.__error; }
    else { stat.totalCommitsKnown = got.totalCommitsKnown; }
    console.log(`[bar] ${stat.slug}: commits>=${stat.totalCommitsKnown ?? "?"} stars=${stat.stars}`);
  }

  await saveJson(CACHE, cache);

  // 4) Final classification
  const all = Object.values(cache.results);
  let pass = 0, fail = 0, unverified = 0;
  for (const s of all) {
    if (s.__error) { unverified++; continue; }
    if (s.__notFound) { fail++; continue; }
    if (typeof s.stars !== "number") { unverified++; continue; }
    if (s.stars < 50) { fail++; continue; }
    if (s.stars >= 500) { pass++; continue; }
    if (typeof s.totalCommitsKnown === "number") {
      if (s.totalCommitsKnown >= 50) pass++; else fail++;
    } else { unverified++; }
  }
  console.log(`[bar] done. pass=${pass} fail=${fail} unverified=${unverified} total=${all.length}`);
}

main().catch((e) => { console.error("[bar] fatal:", e); process.exit(1); });
