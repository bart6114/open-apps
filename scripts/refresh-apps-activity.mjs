#!/usr/bin/env node
/**
 * Refresh script: data/apps/*.yml → updated activity from GitHub.
 *
 * For every yml in data/apps/, parse it, call the GitHub REST API
 * for the repo, and update the `activity:` block in place:
 *   - stars        (stargazers_count)
 *   - forks        (forks_count)
 *   - lastCommitAt (default branch's most recent commit)
 *   - contributors (subscribers_count as a cheap proxy; swap to a
 *                    contributors API call if you need accuracy)
 *   - updatedAt    (today)
 *
 * Run with: `node scripts/refresh-apps-activity.mjs [limit]`
 * Requires GITHUB_TOKEN env var (60k req/hr with token, 60/hr
 * without — use a token).
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

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

const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${TOKEN}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-apps-bot",
};

function parseRepo(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function gh(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return null;
    if (res.status === 403) {
      const reset = res.headers.get("x-ratelimit-reset");
      console.error(`[refresh] rate limited until ${reset}`);
      process.exit(1);
    }
    throw new Error(`GitHub API ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchActivity(repoUrl) {
  const parsed = parseRepo(repoUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const data = await gh(`/repos/${owner}/${repo}`);
  if (!data) return null;

  // Pull last 6 months of commit activity in one paginated request.
  // The GitHub Commits API returns up to 100 per page; 6 months of
  // activity rarely exceeds that, so a single page is enough for
  // our purposes. Increase this if a repo has very heavy monthly
  // commit volume (>100 in the last 6 months).
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthly = [0, 0, 0, 0, 0, 0];
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  let lastCommitAt = data.pushed_at || data.updated_at;
  try {
    // per_page=100 covers the vast majority of monthly commit volumes
    // in a 6-month window. We could paginate if needed, but for the
    // bar logic (>= 1 commit per month) we just need a presence check.
    const commits = await gh(
      `/repos/${owner}/${repo}/commits?per_page=100&since=${sixMonthsAgo.toISOString()}`,
    );
    if (Array.isArray(commits)) {
      // Reset and recount.
      for (let i = 0; i < 6; i++) monthly[i] = 0;
      for (const c of commits) {
        const d = c.commit?.committer?.date || c.commit?.author?.date;
        if (!d) continue;
        const date = new Date(d);
        const monthsAgo =
          (currentYear - date.getUTCFullYear()) * 12 +
          (currentMonth - date.getUTCMonth());
        if (monthsAgo >= 0 && monthsAgo < 6) {
          monthly[5 - monthsAgo]++;
        }
        if (!lastCommitAt || d > lastCommitAt) {
          lastCommitAt = d;
        }
      }
    }
  } catch {
    // keep the fallback
  }

  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    monthlyCommits: monthly,
    lastCommitAt: lastCommitAt ? lastCommitAt.slice(0, 10) : null,
    contributors: data.subscribers_count ?? 0,
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
    `  monthlyCommits: ${monthly}`,
    `  lastCommitAt: ${activity.lastCommitAt ?? "null"}`,
    `  contributors: ${activity.contributors}`,
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

async function main() {
  const entries = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml"));
  const files = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;
  console.log(`[refresh] processing ${files.length} of ${entries.length} apps`);

  let updated = 0;
  let failed = 0;

  for (const file of files) {
    const slug = basename(file, ".yml");
    const path = join(APPS_DIR, file);
    const text = await readFile(path, "utf8");
    const repoMatch = text.match(/^repoUrl:\s*(\S+)/m);
    if (!repoMatch) {
      console.warn(`[refresh] ${slug}: no repoUrl, skipping`);
      continue;
    }
    try {
      const activity = await fetchActivity(repoMatch[1]);
      if (!activity) {
        console.warn(`[refresh] ${slug}: repo not found, skipping`);
        failed++;
        continue;
      }
      const updated_yml = patchYmlActivity(text, activity);
      if (updated_yml !== text) {
        await writeFile(path, updated_yml, "utf8");
        updated++;
        console.log(
          `[refresh] ${slug}: stars=${activity.stars} forks=${activity.forks} last=${activity.lastCommitAt}`,
        );
      } else {
        console.log(`[refresh] ${slug}: no change`);
      }
    } catch (err) {
      failed++;
      console.error(`[refresh] ${slug}: ${err.message}`);
    }
  }

  console.log(`[refresh] done. updated=${updated} failed=${failed} total=${files.length}`);
}

main().catch((err) => {
  console.error("[refresh] failed:", err);
  process.exit(1);
});
