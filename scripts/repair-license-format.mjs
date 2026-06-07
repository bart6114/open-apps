#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Repair a YAML serialization bug in `github.repository.license`.
 *
 * The earlier enrich script (805291e) wrote a string SPDX id into a
 * position that should have been an object, and yaml.stringify
 * helpfully expanded each character into a numeric-keyed entry:
 *
 *   license:
 *     "0": A
 *     "1": G
 *     "2": P
 *     "3": L
 *     "4": "-"
 *     "5": "3"
 *     "6": .
 *     "7": "0"
 *     spdx_id: AGPL-3.0
 *     key: null
 *
 * The schema validation accepts it (Zod is permissive on this field)
 * but the rendered output is wrong. This script walks every yml,
 * detects the broken shape (numeric keys alongside `spdx_id`), and
 * rewrites the license as `{ spdx_id, key: null, name: null, url: null }`.
 *
 * Idempotent. Re-running on a fixed file is a no-op.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const DRY_RUN = process.env.DRY_RUN === "1";

function isBrokenLicense(license) {
  if (!license || typeof license !== "object") return false;
  // A broken license has numeric string keys ("0", "1", ...) alongside
  // a real "spdx_id" field. A healthy one has only string fields like
  // "spdx_id", "key", "name", "url".
  const keys = Object.keys(license);
  return keys.some((k) => /^\d+$/.test(k));
}

function reconstructSpdxId(license) {
  // If spdx_id is already set and looks correct, use it.
  if (typeof license.spdx_id === "string" && /^[A-Z0-9.+-]+$/.test(license.spdx_id)) {
    return license.spdx_id;
  }
  // Otherwise rebuild from the numeric-keyed characters.
  const chars = [];
  for (const [k, v] of Object.entries(license)) {
    if (/^\d+$/.test(k) && typeof v === "string" && v.length === 1) {
      chars[Number(k)] = v;
    }
  }
  return chars.join("") || null;
}

function repair(parsed) {
  let changed = false;
  const repo = parsed.github?.repository;
  if (!repo) return { parsed, changed };
  const license = repo.license;
  if (!isBrokenLicense(license)) return { parsed, changed };

  const spdx = reconstructSpdxId(license);
  const next = {
    spdx_id: spdx,
    key: typeof license?.key === "string" ? license.key : null,
    name: typeof license?.name === "string" ? license.name : null,
    url: typeof license?.url === "string" ? license.url : null,
  };
  return {
    parsed: { ...parsed, github: { ...(parsed.github ?? {}), repository: { ...repo, license: next } } },
    changed: true,
  };
}

async function main() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  let updated = 0;
  let skipped = 0;
  for (const file of files) {
    const path = join(APPS_DIR, file);
    const raw = await readFile(path, "utf8");
    const parsed = parse(raw) ?? {};
    const { parsed: next, changed } = repair(parsed);
    if (!changed) {
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      const prev = parsed.github?.repository?.license;
      const newSpdx = next.github.repository.license.spdx_id;
      process.stdout.write(`[repair-license] would repair ${file}: ${JSON.stringify(prev).slice(0, 60)} → spdx_id=${newSpdx}\n`);
    } else {
      const out = stringify(next, { lineWidth: 100, singleQuote: false, defaultStringType: "PLAIN" });
      await writeFile(path, out, "utf8");
      process.stdout.write(`[repair-license] ${file}: license → {spdx_id: ${next.github.repository.license.spdx_id}}\n`);
    }
    updated++;
  }
  console.log(`\n[repair-license] ${updated} updated, ${skipped} unchanged`);
}

main().catch((err) => {
  console.error("[repair-license] failed:", err);
  process.exit(1);
});
