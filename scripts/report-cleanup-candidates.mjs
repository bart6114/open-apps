#!/usr/bin/env node

// SPDX-License-Identifier: MIT

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAppRecord, parseAppYaml } from "./app-schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const OUT_DIR = join(ROOT, "data", "generated");
const OUT_FILE = join(OUT_DIR, "cleanup-report.json");

async function main() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  const candidates = [];

  for (const file of files) {
    const fileSlug = basename(file, ".yml");
    const raw = parseAppYaml(await readFile(join(APPS_DIR, file), "utf8"), fileSlug);
    const app = normalizeAppRecord(raw, fileSlug);
    if (app.health?.cleanupCandidate) {
      candidates.push({
        slug: app.slug,
        name: app.name,
        repoUrl: app.repoUrl,
        status: app.health.status,
        tier: app.health.tier,
        staleReason: app.health.staleReason,
        lastCommitAt: app.lastCommitAt ?? null,
        stars: app.stars ?? 0,
      });
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalCandidates: candidates.length,
        candidates,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[cleanup-report] wrote ${candidates.length} candidate(s) to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("[cleanup-report] failed:", err);
  process.exit(1);
});
