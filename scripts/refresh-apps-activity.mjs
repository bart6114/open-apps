#!/usr/bin/env node

// SPDX-License-Identifier: MIT


/**
 * Refresh script: data/apps/*.yml → updated activity from GitHub.
 *
 * For every yml in data/apps/, parse it, call the GitHub REST API
 * for the repo, and update the `activity:` block in place:
 *   - stars        (stargazers_count)
 *   - forks        (forks_count)
 *   - lastCommitAt (default branch's most recent commit)
 *   - contributors (GitHub contributors endpoint count)
 *   - updatedAt    (today)
 *
 * Run with: `node scripts/refresh-apps-activity.mjs [limit]`
 * Requires GITHUB_TOKEN env var (60k req/hr with token, 60/hr
 * without — use a token).
 *
 * Uses a 2-attempt retry with exponential backoff for transient
 * 5xx errors and pauses for the X-RateLimit-Reset window on 403/429
 * instead of killing the whole run.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { ghFetch, pLimit } from "./_github.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");

const limitArg = process.argv[2] || "0";
const LIMIT = parseInt(limitArg, 10) || 0;

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("[refresh] GITHUB_TOKEN env var is required");
  process.exit(1);
}

function parseRepo(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function gh(path) {
  const res = await ghFetch(path, { token: TOKEN });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub API ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function ghWithHeaders(path) {
  const res = await ghFetch(path, { token: TOKEN });
  if (res.status === 404) return { data: null, headers: res.headers };
  if (!res.ok) {
    throw new Error(`GitHub API ${path} → ${res.status} ${res.statusText}`);
  }
  return { data: await res.json(), headers: res.headers };
}

function countFromLinkHeader(linkHeader, fallbackCount) {
  if (!linkHeader) return fallbackCount;
  const last = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.includes('rel="last"'));
  if (!last) return fallbackCount;
  const match = last.match(/[?&]page=(\d+)/);
  return match ? Number(match[1]) : fallbackCount;
}

async function countEndpoint(path) {
  const { data, headers } = await ghWithHeaders(`${path}${path.includes("?") ? "&" : "?"}per_page=1`);
  if (!Array.isArray(data)) return 0;
  return countFromLinkHeader(headers.get("link"), data.length);
}

function emptyMonthlyBuckets() {
  const buckets = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() - i);
    buckets.set(d.toISOString().slice(0, 7), 0);
  }
  return buckets;
}

async function fetchMonthlyCommits(owner, repo) {
  const buckets = emptyMonthlyBuckets();

  // Preferred endpoint: one request, 52 weeks of cached commit activity.
  // GitHub can return 202 while computing stats; fallback below keeps sync robust.
  try {
    const weeks = await gh(`/repos/${owner}/${repo}/stats/commit_activity`);
    if (Array.isArray(weeks)) {
      for (const week of weeks) {
        if (!week?.week) continue;
        const month = new Date(week.week * 1000).toISOString().slice(0, 7);
        if (buckets.has(month)) buckets.set(month, buckets.get(month) + (week.total ?? 0));
      }
      return [...buckets.values()];
    }
  } catch {
    // Fall back to commits API below.
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  for (let page = 1; page <= 10; page++) {
    const commits = await gh(
      `/repos/${owner}/${repo}/commits?per_page=100&page=${page}&since=${sixMonthsAgo.toISOString()}`,
    );
    if (!Array.isArray(commits) || commits.length === 0) break;
    for (const commit of commits) {
      const date = commit.commit?.committer?.date || commit.commit?.author?.date;
      if (!date) continue;
      const month = new Date(date).toISOString().slice(0, 7);
      if (buckets.has(month)) buckets.set(month, buckets.get(month) + 1);
    }
    if (commits.length < 100) break;
  }

  return [...buckets.values()];
}

async function fetchActivity(repoUrl) {
  const parsed = parseRepo(repoUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const data = await gh(`/repos/${owner}/${repo}`);
  if (!data) return null;

  let lastCommitAt = data.pushed_at || data.updated_at;
  const [monthly, contributors, totalCommitsKnown, openPullRequests] = await Promise.all([
    fetchMonthlyCommits(owner, repo),
    countEndpoint(`/repos/${owner}/${repo}/contributors?anon=true`),
    countEndpoint(`/repos/${owner}/${repo}/commits`),
    countEndpoint(`/repos/${owner}/${repo}/pulls?state=open`),
  ]);

  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    watchers: data.watchers_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    monthlyCommits: monthly,
    lastCommitAt: lastCommitAt ? lastCommitAt.slice(0, 10) : null,
    totalCommitsKnown,
    contributors,
    openPullRequests,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

function patchYmlActivity(text, activity) {
  // Replace the entire `activity:` block (key + 6 nested lines)
  // with a freshly-rendered version. Keeps the rest of the yml
  // untouched so hand-curated fields survive.
  const monthly = Array.isArray(activity.monthlyCommits)
    ? `[${activity.monthlyCommits.join(", ")}]`
    : "[]";
  const block = [
    "activity:",
    `  stars: ${activity.stars}`,
    `  forks: ${activity.forks}`,
    `  watchers: ${activity.watchers}`,
    `  openIssues: ${activity.openIssues}`,
    `  monthlyCommits: ${monthly}`,
    `  lastCommitAt: ${activity.lastCommitAt ?? "null"}`,
    `  totalCommitsKnown: ${activity.totalCommitsKnown}`,
    `  contributors: ${activity.contributors}`,
    `  openPullRequests: ${activity.openPullRequests}`,
    `  updatedAt: ${activity.updatedAt}`,
  ].join("\n");

  if (/^activity:\s*$/m.test(text)) {
    // Replace existing block (up to 8 indented lines after `activity:`).
    return text.replace(
      /^activity:\s*\n(?:[ \t].*\n){0,20}/m,
      block + "\n",
    );
  }
  // No existing block — append.
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

async function processFile(file) {
  const slug = basename(file, ".yml");
  const path = join(APPS_DIR, file);
  const text = await readFile(path, "utf8");
  const repoMatch = text.match(/^repoUrl:\s*(\S+)/m);
  if (!repoMatch) {
    console.warn(`[refresh] ${slug}: no repoUrl, skipping`);
    return { updated: 0, failed: 0 };
  }
  try {
    const activity = await fetchActivity(repoMatch[1]);
    if (!activity) {
      console.warn(`[refresh] ${slug}: repo not found, skipping`);
      return { updated: 0, failed: 1 };
    }
    const updated_yml = patchYmlActivity(text, activity);
    if (updated_yml !== text) {
      await writeFile(path, updated_yml, "utf8");
      console.log(
        `[refresh] ${slug}: stars=${activity.stars} forks=${activity.forks} last=${activity.lastCommitAt}`,
      );
      return { updated: 1, failed: 0 };
    }
    console.log(`[refresh] ${slug}: no change`);
    return { updated: 0, failed: 0 };
  } catch (err) {
    console.error(`[refresh] ${slug}: ${err.message}`);
    return { updated: 0, failed: 1 };
  }
}

async function main() {
  const entries = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml"));
  const files = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;
  console.log(`[refresh] processing ${files.length} of ${entries.length} apps`);

  // 5 in-flight requests is well within the 5000/hr token rate limit
  // for 85 apps × 5 endpoints ≈ 425 reqs. Tune CONCURRENCY down if
  // the 06:00 UTC job starts tripping the secondary rate limiter.
  const CONCURRENCY = 5;
  const results = await pLimit(CONCURRENCY, files, processFile);
  const updated = results.reduce((s, r) => s + r.updated, 0);
  const failed = results.reduce((s, r) => s + r.failed, 0);

  console.log(`[refresh] done. updated=${updated} failed=${failed} total=${files.length}`);
}

main().catch((err) => {
  console.error("[refresh] failed:", err);
  process.exit(1);
});
