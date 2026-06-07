#!/usr/bin/env node

// SPDX-License-Identifier: MIT

import { readdir, readFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAppYaml, validateAppRecord } from "./app-schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");

async function main() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  const errors = [];
  const seenSlugs = new Set();
  const seenRepos = new Map();

  for (const file of files) {
    const fileSlug = basename(file, ".yml");
    const text = await readFile(join(APPS_DIR, file), "utf8");
    const raw = parseAppYaml(text, fileSlug);
    errors.push(...validateAppRecord(raw, fileSlug));

    const slug = raw.slug ?? fileSlug;
    if (seenSlugs.has(slug)) errors.push(`${fileSlug}: duplicate slug "${slug}"`);
    seenSlugs.add(slug);

    const repoUrl = raw.repoUrl ?? raw.source?.url ?? raw.github?.repository?.html_url;
    if (repoUrl) {
      const normalizedRepo = String(repoUrl).replace(/\.git$/, "").toLowerCase();
      const previous = seenRepos.get(normalizedRepo);
      if (previous) errors.push(`${fileSlug}: duplicate repoUrl with ${previous}`);
      seenRepos.set(normalizedRepo, fileSlug);
    }

    if (slug !== fileSlug) {
      errors.push(`${fileSlug}: slug "${slug}" must match filename`);
    }
  }

  if (errors.length > 0) {
    console.error(`[validate-apps] ${errors.length} error(s):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(`[validate-apps] ${files.length} app files passed schema validation`);
}

main().catch((err) => {
  console.error("[validate-apps] failed:", err);
  process.exit(1);
});
