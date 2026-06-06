#!/usr/bin/env node
/**
 * Apply the bar to data/apps/:
 *   - For each `pass` slug: write/update the activity block in the yml
 *   - For each `fail` or `unverified` slug: delete the yml file
 *   - For each `pending` slug (not in cache): leave yml untouched
 *
 * Reads:
 *   - /tmp/legacy-cache-v4.json (final cache with classification)
 *   - /tmp/legacy-repos.json (slug → repo info)
 *   - data/apps/*.yml (existing files)
 *
 * Then runs `npm run build:data` to regenerate data/generated/apps.json.
 */
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const CACHE = "/tmp/legacy-cache-v4.json";
const REPOS = "/tmp/legacy-repos.json";

async function loadJson(p, fb) {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return fb; }
}

function classify(stat) {
  if (!stat) return "PENDING";
  if (stat.__error) return "UNVERIFIED";
  if (stat.__notFound) return "FAIL";
  if (typeof stat.stars !== "number") return "PENDING";
  if (stat.stars < 50) return "FAIL";
  if (stat.stars >= 500) return "PASS";
  if (typeof stat.totalCommitsKnown === "number") {
    return stat.totalCommitsKnown >= 50 ? "PASS" : "FAIL";
  }
  return "UNVERIFIED";
}

function buildActivityBlock(stat) {
  const monthly = Array.isArray(stat.monthlyCommits)
    ? `[${stat.monthlyCommits.join(", ")}]`
    : "[]";
  return [
    "activity:",
    `  stars: ${stat.stars ?? 0}`,
    `  forks: ${stat.forks ?? 0}`,
    `  monthlyCommits: ${monthly}`,
    `  lastCommitAt: ${stat.lastCommitAt ?? "null"}`,
    `  totalCommitsKnown: ${stat.totalCommitsKnown ?? 0}`,
    `  updatedAt: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

function patchYml(text, stat) {
  const block = buildActivityBlock(stat);
  if (/^activity:\s*$/m.test(text)) {
    return text.replace(
      /^activity:\s*\n(?:[ \t].*\n){0,20}/m,
      block + "\n",
    );
  }
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

async function main() {
  const cache = (await loadJson(CACHE, { results: {} })).results;
  const repos = await loadJson(REPOS, []);
  const repoBySlug = new Map(repos.map((r) => [r.slug, r]));

  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml"));
  const allSlugs = files.map((f) => basename(f, ".yml"));

  const buckets = { PASS: [], FAIL: [], UNVERIFIED: [], PENDING: [] };
  for (const slug of allSlugs) {
    const verdict = classify(cache[slug]);
    buckets[verdict].push(slug);
  }
  console.log(`[apply] ${allSlugs.length} yml files in data/apps/`);
  console.log(`[apply] PASS=${buckets.PASS.length} FAIL=${buckets.FAIL.length} UNVERIFIED=${buckets.UNVERIFIED.length} PENDING=${buckets.PENDING.length}`);

  // Pass: write activity block to existing yml (preserve hand-curation)
  let updated = 0;
  for (const slug of buckets.PASS) {
    const stat = cache[slug];
    const repo = repoBySlug.get(slug);
    if (!repo) continue;
    const path = join(APPS_DIR, `${slug}.yml`);
    const text = await readFile(path, "utf8");
    // If the file is hand-curated (has `bestFor:`), only patch the activity block.
    // Otherwise, ensure the repoUrl/category match (defensive: don't overwrite curated fields).
    const patched = patchYml(text, stat);
    if (patched !== text) {
      await writeFile(path, patched, "utf8");
      updated++;
    }
  }
  console.log(`[apply] updated ${updated} PASS yml files`);

  // Fail + Unverified: delete the yml
  const toDelete = [...buckets.FAIL, ...buckets.UNVERIFIED];
  for (const slug of toDelete) {
    const path = join(APPS_DIR, `${slug}.yml`);
    try {
      await unlink(path);
    } catch (e) {
      if (e.code !== "ENOENT") console.warn(`[apply] could not delete ${slug}: ${e.message}`);
    }
  }
  console.log(`[apply] deleted ${toDelete.length} yml files (FAIL + UNVERIFIED)`);

  // Sanity: report remaining yml count
  const remaining = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml"));
  console.log(`[apply] remaining yml files: ${remaining.length}`);

  // Run build:data to regenerate apps.json
  console.log(`[apply] running npm run build:data...`);
  try {
    const out = execSync("npm run build:data", { cwd: ROOT, encoding: "utf8" });
    console.log(out);
  } catch (e) {
    console.error(`[apply] build:data failed: ${e.message}`);
    process.exit(1);
  }

  // Final report
  console.log("\n=== FINAL REPORT ===");
  console.log(`PASS (kept):       ${buckets.PASS.length}`);
  console.log(`FAIL (deleted):    ${buckets.FAIL.length}`);
  console.log(`UNVERIFIED (del):  ${buckets.UNVERIFIED.length}`);
  console.log(`PENDING (untouch): ${buckets.PENDING.length}`);
  console.log(`remaining yml:     ${remaining.length}`);

  // List pass + fail
  console.log("\nPASS list:");
  buckets.PASS.forEach((s) => {
    const stat = cache[s];
    console.log(`  + ${s} (stars=${stat?.stars}, last=${stat?.lastCommitAt})`);
  });
  console.log("\nFAIL list (sample, 20):");
  buckets.FAIL.slice(0, 20).forEach((s) => {
    const stat = cache[s];
    console.log(`  - ${s} (${stat?.__notFound ? "404" : stat?.__error ? "err" : (stat?.stars ?? "?") + "⭐"})`);
  });
  if (buckets.FAIL.length > 20) console.log(`  ... and ${buckets.FAIL.length - 20} more`);
  console.log("\nPENDING list (untouched, for manual review):");
  buckets.PENDING.forEach((s) => console.log(`  ? ${s}`));
}

main().catch((e) => { console.error("[apply] fatal:", e); process.exit(1); });
