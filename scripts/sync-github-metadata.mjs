#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Sync GitHub-shaped metadata for schemaVersion: 1 app records.
 *
 * This intentionally skips legacy flat YAML files until the catalog migration
 * happens, because stringifying legacy files would erase comments and create a
 * noisy PR. After migration, this becomes the main metadata sync job.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAppYaml, stringifyAppYaml } from "./app-schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const LIMIT = Number.parseInt(process.argv[2] ?? "0", 10) || 0;
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("[sync-github] GITHUB_TOKEN env var is required");
  process.exit(1);
}

const HEADERS = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${TOKEN}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-apps-bot",
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function exists(path) {
  const result = await gh(path);
  return Boolean(result);
}

async function syncOne(raw) {
  const owner = raw.source?.owner;
  const repo = raw.source?.repo;
  if (!owner || !repo) return raw;

  const [repository, languages, latestRelease, labels, pulls] = await Promise.all([
    gh(`/repos/${owner}/${repo}`),
    gh(`/repos/${owner}/${repo}/languages`),
    gh(`/repos/${owner}/${repo}/releases/latest`),
    gh(`/repos/${owner}/${repo}/labels?per_page=100`),
    gh(`/repos/${owner}/${repo}/pulls?state=open&per_page=1`),
  ]);

  if (!repository) return raw;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const commits = await gh(
    `/repos/${owner}/${repo}/commits?per_page=100&since=${sixMonthsAgo.toISOString()}`,
  );
  const monthly = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    monthly.set(d.toISOString().slice(0, 7), 0);
  }
  for (const commit of Array.isArray(commits) ? commits : []) {
    const date = commit.commit?.committer?.date || commit.commit?.author?.date;
    if (!date) continue;
    const key = new Date(date).toISOString().slice(0, 7);
    if (monthly.has(key)) monthly.set(key, monthly.get(key) + 1);
  }

  const [readme, contributing, codeOfConduct, security, issueTemplates, pullRequestTemplate] =
    await Promise.all([
      exists(`/repos/${owner}/${repo}/readme`),
      exists(`/repos/${owner}/${repo}/contents/CONTRIBUTING.md`),
      exists(`/repos/${owner}/${repo}/community/code_of_conduct`),
      exists(`/repos/${owner}/${repo}/contents/SECURITY.md`),
      exists(`/repos/${owner}/${repo}/contents/.github/ISSUE_TEMPLATE`),
      exists(`/repos/${owner}/${repo}/contents/.github/pull_request_template.md`),
    ]);

  raw.github = {
    ...(raw.github ?? {}),
    repository,
    languages: languages ?? {},
    latestRelease,
    activity: {
      ...(raw.github?.activity ?? {}),
      monthlyCommits: [...monthly.entries()].map(([month, count]) => ({ month, commits: count })),
      openPullRequests: Number(pulls?.length ?? 0),
    },
    files: {
      readme,
      contributing,
      codeOfConduct,
      security,
      issueTemplates,
      pullRequestTemplate,
    },
    labels: Array.isArray(labels)
      ? labels
          .filter((label) => ["good first issue", "help wanted"].includes(String(label.name).toLowerCase()))
          .map((label) => ({
            name: label.name,
            color: label.color,
            description: label.description,
          }))
      : [],
    sync: {
      syncedAt: new Date().toISOString(),
      apiVersion: "rest-v3",
      source: "github-actions",
    },
  };

  return raw;
}

async function main() {
  const entries = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  const files = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(APPS_DIR, file);
    const slug = basename(file, ".yml");
    const original = await readFile(path, "utf8");
    const raw = parseAppYaml(original, slug);
    if (raw.schemaVersion !== 1) {
      skipped++;
      continue;
    }
    const next = stringifyAppYaml(await syncOne(raw));
    if (next !== original) {
      await writeFile(path, next, "utf8");
      updated++;
      console.log(`[sync-github] ${slug}: updated`);
    }
  }

  console.log(`[sync-github] done updated=${updated} skipped=${skipped} total=${files.length}`);
}

main().catch((err) => {
  console.error("[sync-github] failed:", err);
  process.exit(1);
});
