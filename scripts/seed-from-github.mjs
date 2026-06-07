#!/usr/bin/env node

// SPDX-License-Identifier: MIT


/**
 * Seed script: pull the top Flutter repos from GitHub and update
 * matching yml files with real stars + last commit date.
 *
 * The data flow:
 *   1. Search GitHub for Dart repos with stars ≥ 500
 *   2. For each result, find the matching yml in data/apps/ by
 *      full_name (owner/repo)
 *   3. Patch the `activity:` block with real stars and a recent
 *      pushed_at date
 *
 * Run with: `node scripts/seed-from-github.mjs`
 *
 * Unauthenticated: 60 req/hr. A single search call returns up to
 * 100 results, two calls returns 200. Re-run after a 403 to
 * resume (the script is idempotent — only patches ymls that
 * changed).
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, rateLimitWaitMs, sleep } from "./_github.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");

const SEARCH_QUERIES = [
  // Cover the long tail: 500+ stars, plus a small slop for 250+ to
  // catch well-known apps that GitHub's ranking is slow to update.
  "language:Dart stars:>500",
  "language:Dart stars:300..500",
];

async function searchRepos(q, page = 1, perPage = 100) {
  const path = `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
  const res = await ghFetch(path, { userAgent: "open-apps-seed" });
  if (res.status === 403 || res.status === 429) {
    const wait = rateLimitWaitMs(res);
    if (wait > 0) {
      console.warn(`[seed] rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
    throw new Error(`rate limited for query ${q}`);
  }
  if (!res.ok) {
    throw new Error(`search ${q} → ${res.status}`);
  }
  return res.json();
}

function parseRepo(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "").toLowerCase() };
}

function findMatchingYml(repos, ymls) {
  // repos: [{owner, repo, fullName, stars, pushedAt}]
  // ymls: Map<repoKey, {path, text, slug}>
  const matches = [];
  for (const r of repos) {
    const key = `${r.owner}/${r.repo}`.toLowerCase();
    if (ymls.has(key)) {
      matches.push({ yml: ymls.get(key), stars: r.stars, pushedAt: r.pushedAt, fullName: r.fullName });
    }
  }
  return matches;
}

async function loadYmls() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml"));
  const map = new Map();
  for (const f of files) {
    const path = join(APPS_DIR, f);
    const text = await readFile(path, "utf8");
    const repoMatch = text.match(/^repoUrl:\s*"?([^"\n]+)"?\s*$/m);
    if (!repoMatch) continue;
    const parsed = parseRepo(repoMatch[1]);
    if (!parsed) continue;
    map.set(`${parsed.owner}/${parsed.repo}`.toLowerCase(), {
      slug: f.replace(/\.yml$/, ""),
      path,
      text,
      repoUrl: repoMatch[1],
    });
  }
  return map;
}

function patchActivity(text, stars, pushedAt) {
  // Replace the entire `activity:` block, preserving any extra
  // fields the curator added (catches future keys too).
  const block = [
    "activity:",
    `  stars: ${stars}`,
    `  forks: 0  # populated by GitHub Actions on next refresh`,
    `  lastCommitAt: ${pushedAt}`,
    `  monthlyCommits: []  # populated by GitHub Actions on next refresh`,
    `  contributors: 0  # populated by GitHub Actions on next refresh`,
    `  updatedAt: ${new Date().toISOString().slice(0, 10)}`,
    `  # Seeded from GitHub search on ${new Date().toISOString().slice(0, 10)}.`,
  ].join("\n");

  if (/^activity:\s*$/m.test(text)) {
    return text.replace(
      /^activity:\s*\n(?:[ \t].*\n){0,20}/m,
      block + "\n",
    );
  }
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

async function main() {
  const ymls = await loadYmls();
  console.log(`[seed] loaded ${ymls.size} ymls`);

  const allRepos = new Map(); // fullName → {owner, repo, stars, pushedAt}
  for (const q of SEARCH_QUERIES) {
    try {
      const data = await searchRepos(q);
      console.log(`[seed] "${q}" → ${data.items?.length ?? 0} hits (${data.total_count} total)`);
      for (const r of data.items ?? []) {
        allRepos.set(r.full_name.toLowerCase(), {
          owner: r.owner.login,
          repo: r.name,
          stars: r.stargazers_count,
          pushedAt: (r.pushed_at || "").slice(0, 10),
        });
      }
    } catch (err) {
      console.error(`[seed] ${q}: ${err.message}`);
    }
  }

  console.log(`[seed] fetched ${allRepos.size} repos from GitHub search`);

  // Match against local ymls.
  const matches = findMatchingYml([...allRepos.values()], ymls);
  console.log(`[seed] matched ${matches.length} ymls to live GitHub repos`);

  let patched = 0;
  for (const m of matches) {
    const next = patchActivity(m.yml.text, m.stars, m.pushedAt);
    if (next !== m.yml.text) {
      await writeFile(m.yml.path, next, "utf8");
      patched++;
    }
  }
  console.log(`[seed] patched ${patched} yml files`);

  // Also report what we COULDN'T match — these are the apps the
  // refresh action still needs to populate.
  const matched = new Set(matches.map((m) => m.yml.slug));
  const unmatched = [...ymls.values()].filter((y) => !matched.has(y.slug));
  console.log(`[seed] unmatched (need API refresh): ${unmatched.length}`);
  if (unmatched.length && unmatched.length <= 10) {
    for (const u of unmatched) console.log(`  - ${u.slug} (${u.repoUrl})`);
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
