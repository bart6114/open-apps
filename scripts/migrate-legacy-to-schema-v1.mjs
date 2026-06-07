#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Migrate legacy `data/apps/<slug>.yml` files (schemaVersion 0) to
 * the v1 shape described in `docs/SCHEMA.md`:
 *
 *   - `schemaVersion: 1`
 *   - `id: github:<owner>/<repo>`
 *   - `source: { provider, owner, repo, url }`
 *   - `app:  { name, description, category, projectType, platforms, tags }`
 *   - `stack: { primary, families, technologies }`
 *   - `github.repository: { ...GitHub-shaped metadata... }`
 *   - `github.activity: { monthlyCommits, totalCommitsKnown, openPullRequests }`
 *   - `github.sync: { syncedAt, apiVersion, source }`
 *   - `health: { status, tier, visibility, cleanupCandidate, staleReason }`
 *   - `curation: { reviewed, bestFor, caveats, ... }`
 *
 * Refreshes `pushed_at` from the per-repo Atom feed (no rate limit) so
 * the new `health.status` reflects real activity, not the legacy
 * `lastCommitAt` (which was a daily snapshot from `refresh-apps-activity`).
 *
 * Idempotent. Re-run on a v1 file leaves it alone. Fields that need a
 * GitHub API call (license, language, topics, languages breakdown,
 * files, labels, latest release, contributors) stay as `null`/empty —
 * the next run of `scripts/sync-github-metadata.mjs` (with a token)
 * fills those in.
 *
 * Usage:
 *   node scripts/migrate-legacy-to-schema-v1.mjs
 *   DRY_RUN=1 node scripts/migrate-legacy-to-schema-v1.mjs
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const DRY_RUN = process.env.DRY_RUN === "1";

const HEADERS = { "User-Agent": "open-apps-migrator" };

// ── Taxonomy IDs (from data/taxonomy/*.yml) ────────────────────────────
// Lowercase ids per the schema. Anything not listed here falls back to
// lowercased input so the validator never sees a TitleCase category.

const CATEGORY_IDS = new Set([
  "productivity", "finance", "education", "tools", "communication",
  "health-and-fitness", "business", "games", "media", "entertainment",
  "social-network", "shopping", "news", "travel", "lifestyle", "personalization",
]);
const PLATFORM_IDS = new Set(["ios", "android", "web", "macos", "windows", "linux", "desktop"]);
const STACK_IDS = new Set(["flutter", "react-native", "ios", "android", "capacitor", "kmp"]);

function categoryToId(raw) {
  const s = String(raw ?? "").trim();
  if (CATEGORY_IDS.has(s.toLowerCase().replace(/\s+and\s+/g, "-and-").replace(/\s+/g, "-"))) {
    return s.toLowerCase().replace(/\s+and\s+/g, "-and-").replace(/\s+/g, "-");
  }
  return s.toLowerCase().replace(/\s+/g, "-");
}
function platformToId(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  return PLATFORM_IDS.has(s) ? s : s;
}
function stackToId(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "react native") return "react-native";
  return STACK_IDS.has(s) ? s : s;
}

function ownerRepoFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86_400_000;
}

function computeHealth({ stars, pushedAt, status: legacyStatus }) {
  const d = daysSince(pushedAt);
  const status = legacyStatus === "archived" ? "archived"
    : legacyStatus === "unavailable" ? "unavailable"
    : d <= 180 ? "active"
    : d <= 365 ? "quiet"
    : "stale";
  const tier = status === "archived" || status === "unavailable" ? "hidden"
    : stars >= 500 ? "curated"
    : stars >= 50 ? "listed"
    : "experimental";
  return {
    status,
    tier,
    visibility: tier === "hidden" ? "hidden" : "listed",
    cleanupCandidate: status === "stale" || status === "archived" || status === "unavailable",
    staleReason: status === "stale" ? "no_commits_365_days"
      : status === "archived" ? "github_archived"
      : status === "unavailable" ? "github_unavailable"
      : null,
  };
}

async function fetchLastCommit(owner, repo) {
  try {
    const res = await fetch(`https://github.com/${owner}/${repo}/commits.atom`, { headers: HEADERS });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/<updated>([^<]+)<\/updated>/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function buildV1(legacy, freshPushedAt) {
  const identity = ownerRepoFromUrl(legacy.repoUrl);
  const owner = identity?.owner;
  const repo = identity?.repo;
  const stars = typeof legacy.activity?.stars === "number" ? legacy.activity.stars : 0;
  const forks = typeof legacy.activity?.forks === "number" ? legacy.activity.forks : 0;
  const primaryStack = stackToId(legacy.stack);

  // Prefer fresh atom-feed pushed_at over the legacy daily snapshot.
  const pushedAt = freshPushedAt
    ?? (legacy.activity?.lastCommitAt ? `${legacy.activity.lastCommitAt}T00:00:00Z` : null);

  const repository = {
    full_name: `${owner}/${repo}`,
    html_url: legacy.repoUrl,
    description: legacy.description ?? null,
    fork: false,
    archived: legacy.status === "archived",
    disabled: false,
    private: false,
    visibility: "public",
    stargazers_count: stars,
    forks_count: forks,
    pushed_at: pushedAt,
  };

  const appBlock = {
    name: legacy.name,
    description: legacy.description,
    category: categoryToId(legacy.category),
    projectType: legacy.projectType ?? "real-app",
    platforms: (legacy.platforms ?? []).map(platformToId),
    tags: legacy.tags ?? [],
  };
  if (legacy.distribution) appBlock.distribution = legacy.distribution;
  if (legacy.homepageUrl) appBlock.homepage = legacy.homepageUrl;
  if (legacy.license) appBlock.license = legacy.license;

  const stackBlock = {
    primary: primaryStack,
    families: primaryStack === "flutter" || primaryStack === "react-native" || primaryStack === "capacitor"
      ? ["cross-platform"]
      : primaryStack === "kmp" ? ["cross-platform"] : [],
    technologies: [{ id: primaryStack, role: "mobile-framework" }],
  };
  if (legacy.stacks && Array.isArray(legacy.stacks)) {
    for (const s of legacy.stacks) {
      const id = stackToId(s);
      if (id !== primaryStack) stackBlock.technologies.push({ id, role: "supporting" });
    }
  }

  const githubBlock = {
    repository,
    activity: {
      monthlyCommits: legacy.activity?.monthlyCommits ?? [],
      totalCommitsKnown: legacy.activity?.totalCommitsKnown ?? 0,
      openPullRequests: legacy.activity?.openPullRequests ?? 0,
    },
    sync: {
      syncedAt: new Date().toISOString(),
      apiVersion: "rest-v3",
      source: "migrate-legacy",
    },
  };

  const curationBlock = {
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    bestFor: legacy.bestFor ?? [],
    caveats: legacy.caveats ?? [],
  };

  const v1 = {
    schemaVersion: 1,
    id: `github:${owner}/${repo}`,
    slug: legacy.slug,
    source: {
      provider: "github",
      owner,
      repo,
      url: legacy.repoUrl,
    },
    app: appBlock,
    stack: stackBlock,
    github: githubBlock,
    health: computeHealth({ stars, pushedAt, status: legacy.status }),
    curation: curationBlock,
  };

  return v1;
}

function renderV1(v1) {
  // Add a leading comment to mark the v1 records. Hand-curated fields
  // (`curation.bestFor`, `curation.caveats`, `curation.scores`) are the
  // human-facing fields; everything else is auto-derived.
  const out = stringify(v1, {
    lineWidth: 100,
    singleQuote: false,
    defaultStringType: "PLAIN",
  });
  return out + "\n";
}

async function main() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  for (const file of files) {
    const path = join(APPS_DIR, file);
    const raw = await readFile(path, "utf8");
    const parsed = parse(raw) ?? {};
    if (parsed.schemaVersion === 1) {
      skipped++;
      continue;
    }
    const identity = ownerRepoFromUrl(parsed.repoUrl);
    if (!identity) {
      console.log(`[migrate] SKIP ${file} (no owner/repo in repoUrl)`);
      skipped++;
      continue;
    }
    const freshPushedAt = await fetchLastCommit(identity.owner, identity.repo);
    const v1 = buildV1(parsed, freshPushedAt);
    const out = renderV1(v1);
    if (DRY_RUN) {
      console.log(`[migrate] DRY-RUN would write ${file} (pushed_at=${(freshPushedAt || parsed.activity?.lastCommitAt || "—").slice(0, 10)})`);
    } else {
      await writeFile(path, out, "utf8");
      console.log(`[migrate] ${file} → schemaVersion 1 (pushed_at=${(freshPushedAt || parsed.activity?.lastCommitAt || "—").slice(0, 10)})`);
    }
    converted++;
  }
  console.log(`\n[migrate] done: ${converted} converted, ${skipped} skipped (already v1), ${failed} failed`);
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
