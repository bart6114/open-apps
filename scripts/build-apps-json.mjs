#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Build script: data/apps/*.yml -> normalized generated JSON.
 *
 * Source data stays one YAML file per app. The build layer accepts both:
 *   - schemaVersion: 1 final records with GitHub-shaped metadata
 *   - legacy flat records while the existing catalog is migrated later
 *
 * Generated files are build artifacts and should not be committed.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAppRecord, parseAppYaml, toIndexApp } from "./app-schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const OUT_DIR = join(ROOT, "data", "generated");
const FULL_FILE = join(OUT_DIR, "apps.full.json");
const INDEX_FILE = join(OUT_DIR, "apps.index.json");
const COMPAT_FILE = join(OUT_DIR, "apps.json");

async function main() {
  let entries;
  try {
    entries = await readdir(APPS_DIR);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`[build-apps-json] ${APPS_DIR} does not exist. Run from the repo root.`);
      process.exit(1);
    }
    throw err;
  }

  const files = entries.filter((f) => f.endsWith(".yml")).sort();
  const apps = [];
  const errors = [];

  for (const file of files) {
    const fileSlug = basename(file, ".yml");
    try {
      const text = await readFile(join(APPS_DIR, file), "utf8");
      const raw = parseAppYaml(text, fileSlug);
      const app = normalizeAppRecord(raw, fileSlug);
      if (app.slug !== fileSlug) {
        console.warn(
          `[build-apps-json] ${file}: slug "${app.slug}" does not match filename "${fileSlug}", using filename`,
        );
        app.slug = fileSlug;
      }
      apps.push(app);
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("[build-apps-json] schema errors:");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  apps.sort((a, b) => {
    const sa = a.github?.repository?.stargazers_count ?? a.stars ?? 0;
    const sb = b.github?.repository?.stargazers_count ?? b.stars ?? 0;
    if (sb !== sa) return sb - sa;
    return (a.name || "").localeCompare(b.name || "");
  });

  const indexApps = apps
    .map(toIndexApp)
    .filter((app) => app.visibility !== "hidden");

  const generatedAt = new Date().toISOString();
  const fullPayload = {
    schemaVersion: 1,
    generatedAt,
    totalApps: apps.length,
    visibleApps: indexApps.length,
    apps,
  };
  const indexPayload = {
    schemaVersion: 1,
    generatedAt,
    totalApps: indexApps.length,
    apps: indexApps,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(FULL_FILE, JSON.stringify(fullPayload, null, 2), "utf8");
  await writeFile(INDEX_FILE, JSON.stringify(indexPayload, null, 2), "utf8");
  await writeFile(COMPAT_FILE, JSON.stringify(fullPayload, null, 2), "utf8");

  console.log(
    `[build-apps-json] wrote ${apps.length} full apps and ${indexApps.length} visible index apps\n` +
      `  full:  ${FULL_FILE}\n` +
      `  index: ${INDEX_FILE}`,
  );
}

main().catch((err) => {
  console.error("[build-apps-json] failed:", err);
  process.exit(1);
});
