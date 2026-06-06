#!/usr/bin/env node
/**
 * Background fetcher: for each repo in /tmp/legacy-repos.json, call the
 * GitHub REST API and cache stars + lastCommit info to /tmp/legacy-cache.json.
 *
 * Rate limit aware: 60/hr unauth. If 429/403, sleep until the reset header
 * and resume. Re-runnable — already-cached slugs are skipped.
 *
 * No GITHUB_TOKEN required.
 *
 * Run: node scripts/_fetch-legacy-stats.mjs
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
    const text = await readFile(CACHE, "utf8");
    return JSON.parse(text);
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
  if (!res.ok) {
    return { __error: `HTTP ${res.status} ${res.statusText}` };
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOne(repo) {
  const { owner, repo: name } = parseRepo(repo.repoUrl);
  if (!owner) return { slug: repo.slug, __error: "bad url" };

  // 1) Repo metadata (stars, pushed_at)
  const data = await gh(`/repos/${owner}/${name}`);
  if (data.__rateLimited) return { slug: repo.slug, __rateLimited: true, reset: data.reset };
  if (data.__notFound) return { slug: repo.slug, __notFound: true };
  if (data.__error) return { slug: repo.slug, __error: data.__error };

  // 2) Last commit. Just the first page; if it's <100 in last 6 months, that's
  //    the bar we care about (>= 1 commit).
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  let recentCommitCount = 0;
  let lastCommitAt = data.pushed_at || data.updated_at;
  try {
    const commits = await gh(
      `/repos/${owner}/${name}/commits?per_page=100&since=${sixMonthsAgo.toISOString()}`,
    );
    if (Array.isArray(commits)) {
      recentCommitCount = commits.length;
      for (const c of commits) {
        const d = c.commit?.committer?.date || c.commit?.author?.date;
        if (d && (!lastCommitAt || d > lastCommitAt)) lastCommitAt = d;
      }
    } else if (commits.__rateLimited) {
      return { slug: repo.slug, partial: true, stars: data.stargazers_count, lastCommitAt: (lastCommitAt || "").slice(0, 10), __rateLimited: true, reset: commits.reset };
    }
  } catch (e) {
    // ignore — keep pushed_at fallback
  }

  return {
    slug: repo.slug,
    name: repo.name,
    category: repo.category,
    repoUrl: repo.repoUrl,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    pushedAt: (data.pushed_at || "").slice(0, 10),
    lastCommitAt: (lastCommitAt || "").slice(0, 10),
    recentCommitCount,
    archived: data.archived || false,
    fetchedAt: new Date().toISOString(),
  };
}

async function getRateLimit() {
  const res = await fetch(`${API}/rate_limit`, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  return data.resources.core;
}

async function main() {
  const repos = JSON.parse(await readFile(REPOS, "utf8"));
  const cache = await loadCache();
  const remaining = repos.filter((r) => !cache.results[r.slug]);
  console.log(
    `[fetch] ${repos.length} total, ${Object.keys(cache.results).length} cached, ${remaining.length} to fetch`,
  );

  for (let i = 0; i < remaining.length; i++) {
    const repo = remaining[i];
    const result = await fetchOne(repo);
    if (result.__rateLimited) {
      const sleepMs = Math.max(0, result.reset * 1000 - Date.now()) + 2000;
      console.log(
        `[fetch] rate limited at ${repo.slug} (${i + 1}/${remaining.length}). Sleeping ${Math.round(sleepMs / 1000)}s until reset ${result.reset}`,
      );
      await saveCache(cache); // persist what we have
      await sleep(sleepMs);
      // retry this one
      const retry = await fetchOne(repo);
      if (retry.__rateLimited) {
        console.log(`[fetch] still rate limited, aborting. cached=${Object.keys(cache.results).length}`);
        await saveCache(cache);
        return;
      }
      Object.assign(result, retry, { slug: repo.slug });
    }
    cache.results[repo.slug] = result;
    if (result.__error) {
      console.log(`[fetch] ${repo.slug}: error=${result.__error}`);
    } else if (result.__notFound) {
      console.log(`[fetch] ${repo.slug}: 404`);
    } else {
      console.log(
        `[fetch] ${repo.slug}: stars=${result.stars} last=${result.lastCommitAt} recentCommits=${result.recentCommitCount} (${i + 1}/${remaining.length})`,
      );
    }
    // Save every 5 entries so a crash doesn't lose progress.
    if ((i + 1) % 5 === 0) await saveCache(cache);
  }
  await saveCache(cache);
  const final = await getRateLimit();
  console.log(`[fetch] done. cached=${Object.keys(cache.results).length} rateLimit=${JSON.stringify(final)}`);
}

main().catch((e) => {
  console.error("[fetch] fatal:", e);
  process.exit(1);
});
