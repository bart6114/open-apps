#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Sync the open-apps repo's own metadata from GitHub into two files:
 *
 *   src/data/contributors.ts             — homepage contributors grid + hero/footer stat
 *   data/generated/repo-stats.json       — stars/forks/issues shown in the header
 *                                           GitHub button, hero, and OriginalCollection
 *
 * Both files were previously hand-curated (the contributors list was
 * the "V1 static list" comment that never got a V2). This script is
 * the V2 — the single source of truth, refreshed weekly by
 * `.github/workflows/sync-contributors.yml`.
 *
 * Idempotent: re-running with no upstream changes is a no-op (writes
 * nothing, exits 0). The generated files are git-tracked so builds
 * stay deterministic and offline-friendly.
 *
 * Usage:
 *   node scripts/sync-contributors.mjs
 *   OPEN_APPS_REPO=owner/name node scripts/sync-contributors.mjs
 *
 * Optional auth:
 *   GITHUB_TOKEN=ghp_xxx node scripts/sync-contributors.mjs
 * (Unauth works for public repos at 60 req/hr; token raises to 5000.)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTRIBUTORS_TARGET = join(ROOT, "src", "data", "contributors.ts");
const REPO_STATS_TARGET = join(ROOT, "data", "generated", "repo-stats.json");

const REPO = process.env.OPEN_APPS_REPO ?? "tortuvshin/open-apps";
const TOKEN = process.env.GITHUB_TOKEN;

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-apps-contributors-sync",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  const next = linkHeader
    .split(",")
    .map((s) => s.trim())
    .find((s) => s.includes('rel="next"'));
  if (!next) return null;
  const match = next.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

async function* paginate(path) {
  const base = `https://api.github.com${path}`;
  const sep = base.includes("?") ? "&" : "?";
  let url = `${base}${sep}per_page=100&anon=1`;
  while (url) {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${url}: ${res.status} ${res.statusText}\n${body.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(`${url}: expected an array, got ${typeof data}`);
    }
    yield data;
    url = nextPageUrl(res.headers.get("link"));
  }
}

function normalizeAvatar(url) {
  if (!url) return url;
  // Pin ?v=4 for cache-busting — the GitHub API sometimes omits it.
  if (url.includes("?")) return url;
  return `${url}?v=4`;
}

async function fetchContributors() {
  const out = [];
  for await (const page of paginate(`/repos/${REPO}/contributors`)) {
    for (const c of page) {
      // Anonymous contributors have no login/avatar link target, so the
      // homepage grid (which renders <a> avatars) has nothing sensible
      // to show. Drop them; the footer/hero count uses `contributors.length`.
      if (c.type === "Anonymous" || !c.login || !c.html_url || !c.avatar_url) continue;
      out.push({
        username: c.login,
        avatarUrl: normalizeAvatar(c.avatar_url),
        profileUrl: c.html_url,
        contributions: typeof c.contributions === "number" ? c.contributions : undefined,
      });
    }
  }
  out.sort((a, b) => (b.contributions ?? 0) - (a.contributions ?? 0));
  return out;
}

async function fetchRepoStats() {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET /repos/${REPO}: ${res.status} ${res.statusText}\n${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (typeof data.stargazers_count !== "number" || typeof data.forks_count !== "number") {
    throw new Error(
      `Unexpected payload for ${REPO}: stars=${data.stargazers_count} forks=${data.forks_count} — aborting to avoid writing garbage.`,
    );
  }
  // No `syncedAt` here on purpose — it would change every run and break
  // the diff-stable check, producing a "no real change" PR weekly.
  // Git history already records when the file was last touched; the
  // `pushedAt` field tracks the upstream state.
  return {
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.subscribers_count,
    openIssues: data.open_issues_count,
    defaultBranch: data.default_branch,
    pushedAt: data.pushed_at,
  };
}

function renderContributors(contributors) {
  const lines = [];
  lines.push("export type Contributor = {");
  lines.push("  username: string;");
  lines.push("  name?: string;");
  lines.push("  avatarUrl: string;");
  lines.push("  profileUrl: string;");
  lines.push("  contributions?: number;");
  lines.push("};");
  lines.push("");
  lines.push(
    "// AUTO-GENERATED by scripts/sync-contributors.mjs — do not edit by hand.",
  );
  lines.push(
    "// Re-run the script (or wait for the weekly workflow) to refresh from GitHub.",
  );
  lines.push(
    `// Source: GET /repos/${REPO}/contributors (${contributors.length} named contributors).`,
  );
  lines.push(
    "// Anonymous contributors are excluded — the homepage grid renders <a> avatars with no anonymous target.",
  );
  lines.push("export const contributors: Contributor[] = [");
  for (const c of contributors) {
    const fields = [
      `username: ${JSON.stringify(c.username)}`,
      `avatarUrl: ${JSON.stringify(c.avatarUrl)}`,
      `profileUrl: ${JSON.stringify(c.profileUrl)}`,
    ];
    if (typeof c.contributions === "number") {
      fields.push(`contributions: ${c.contributions}`);
    }
    lines.push(`  { ${fields.join(", ")} },`);
  }
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

function renderRepoStats(stats) {
  return JSON.stringify(stats, null, 2) + "\n";
}

async function writeIfChanged(path, next) {
  const current = await readFile(path, "utf8").catch(() => "");
  if (current === next) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next, "utf8");
  return true;
}

async function main() {
  // Run in parallel — independent endpoints, no shared state.
  const [contributors, repoStats] = await Promise.all([
    fetchContributors(),
    fetchRepoStats(),
  ]);

  if (contributors.length === 0) {
    throw new Error(
      `No named contributors returned for ${REPO}. Aborting to avoid wiping the file.`,
    );
  }

  const contribChanged = await writeIfChanged(
    CONTRIBUTORS_TARGET,
    renderContributors(contributors),
  );
  const statsChanged = await writeIfChanged(
    REPO_STATS_TARGET,
    renderRepoStats(repoStats),
  );

  if (!contribChanged && !statsChanged) {
    console.log(
      `[sync-contributors] ${REPO}: no changes (contributors=${contributors.length}, stars=${repoStats.stars}, forks=${repoStats.forks}).`,
    );
    return;
  }
  const parts = [];
  if (contribChanged) parts.push(`contributors.ts (${contributors.length})`);
  if (statsChanged) parts.push(`repo-stats.json (stars=${repoStats.stars} forks=${repoStats.forks})`);
  console.log(`[sync-contributors] ${REPO}: wrote ${parts.join(", ")}.`);
}

main().catch((err) => {
  console.error("[sync-contributors] failed:", err.message);
  process.exit(1);
});
