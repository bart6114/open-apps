#!/usr/bin/env node
/**
 * Background fetcher v2: for each repo in /tmp/legacy-repos.json, call the
 * GitHub REST API and cache stars + lastCommit + totalCommitsKnown
 * to /tmp/legacy-cache.json.
 *
 * Bar: stars >= 50 AND totalCommitsKnown >= 50.
 * TotalCommitsKnown is "we know there are at least N commits". If the
 * per_page=100 fetch returns 100 entries, we know it's >= 100. If less,
 * we know the exact count.
 *
 * Rate limit: 60/hr unauth. 2 calls per repo (1 /repos + 1 /commits).
 * Re-runnable. Already-cached slugs that already have totalCommitsKnown
 * are skipped.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPOS = "/tmp/legacy-repos.json";
const CACHE = "/tmp/legacy-cache.json";

const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "open-apps-bot",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    return { results: {}, rateLimit: null, startedAt: new Date().toISOString() };
  }
}

async function saveCache(c) {
  await writeFile(CACHE, JSON.stringify(c, null, 2));
}

function parseRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function gh(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS, redirect: "follow" });
  if (res.status === 404) return { __notFound: true };
  if (res.status === 403 || res.status === 429) {
    const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
    return { __rateLimited: true, reset };
  }
  if (!res.ok) return { __error: `HTTP ${res.status} ${res.statusText}` };
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasFullData(stat) {
  return (
    stat &&
    !stat.__error &&
    !stat.__notFound &&
    !stat.__rateLimited &&
    typeof stat.stars === "number" &&
    typeof stat.totalCommitsKnown === "number" &&
    typeof stat.lastCommitAt === "string"
  );
}

async function fetchOne(repo) {
  const parsed = parseRepo(repo.repoUrl);
  if (!parsed) return { slug: repo.slug, __error: "bad url" };
  const { owner, repo: name } = parsed;

  // 1) Repo metadata
  const data = await gh(`/repos/${owner}/${name}`);
  if (data.__rateLimited) return { slug: repo.slug, __rateLimited: true, reset: data.reset };
  if (data.__notFound) return { slug: repo.slug, __notFound: true };
  if (data.__error) return { slug: repo.slug, __error: data.__error };

  // 2) All-time commits (no since filter). per_page=100 caps response size.
  const commits = await gh(`/repos/${owner}/${name}/commits?per_page=100`);
  if (commits.__rateLimited) {
    return {
      slug: repo.slug,
      partial: true,
      stars: data.stargazers_count ?? 0,
      lastCommitAt: (data.pushed_at || "").slice(0, 10),
      __rateLimited: true,
      reset: commits.reset,
    };
  }
  if (commits.__error) {
    return {
      slug: repo.slug,
      stars: data.stargazers_count ?? 0,
      lastCommitAt: (data.pushed_at || "").slice(0, 10),
      __error: commits.__error,
    };
  }

  let lastCommitAt = data.pushed_at || data.updated_at;
  let totalCommitsKnown = 0;
  if (Array.isArray(commits)) {
    totalCommitsKnown = commits.length; // up to 100
    for (const c of commits) {
      const d = c.commit?.committer?.date || c.commit?.author?.date;
      if (d && (!lastCommitAt || d > lastCommitAt)) lastCommitAt = d;
    }
  }

  return {
    slug: repo.slug,
    name: repo.name,
    category: repo.category,
    repoUrl: repo.repoUrl,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    lastCommitAt: (lastCommitAt || "").slice(0, 10),
    totalCommitsKnown, // >= this number, exact if < 100
    archived: data.archived || false,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const cache = await loadCache();
  const remaining = repos.filter((r) => !hasFullData(cache.results[r.slug]));
  console.log(
    `[fetch2] ${repos.length} total, ${repos.length - remaining.length} cached, ${remaining.length} to fetch`,
  );

  for (let i = 0; i < remaining.length; i++) {
    const repo = remaining[i];
    const result = await fetchOne(repo);
    if (result.__rateLimited) {
      const sleepMs = Math.max(0, result.reset * 1000 - Date.now()) + 2000;
      console.log(
        `[fetch2] rate limited at ${repo.slug} (${i + 1}/${remaining.length}). Sleeping ${Math.round(sleepMs / 1000)}s until reset`,
      );
      await saveCache(cache);
      await sleep(sleepMs);
      const retry = await fetchOne(repo);
      if (retry.__rateLimited) {
        console.log(`[fetch2] still rate limited, aborting. cached=${Object.keys(cache.results).length}`);
        await saveCache(cache);
        return;
      }
      Object.assign(result, retry);
    }
    cache.results[repo.slug] = result;
    if (result.__error) {
      console.log(`[fetch2] ${repo.slug}: error=${result.__error}`);
    } else if (result.__notFound) {
      console.log(`[fetch2] ${repo.slug}: 404`);
    } else {
      console.log(
        `[fetch2] ${repo.slug}: stars=${result.stars} commits>=${result.totalCommitsKnown} last=${result.lastCommitAt} (${i + 1}/${remaining.length})`,
      );
    }
    if ((i + 1) % 5 === 0) await saveCache(cache);
  }
  await saveCache(cache);
  console.log(`[fetch2] done. cached=${Object.keys(cache.results).length}`);
}

main().catch((e) => {
  console.error("[fetch2] fatal:", e);
  process.exit(1);
});
