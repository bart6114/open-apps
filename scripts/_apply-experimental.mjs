#!/usr/bin/env node
/**
 * Build a new README-LEGACY.md in memory with per-category
 * "#### Experimental" sub-section.
 *
 * Rules:
 *   - For each entry, if stars >= 500 OR lastCommitAt within 6 months
 *     (cutoff = today - 6 months), it's MAIN.
 *   - Otherwise EXPERIMENTAL.
 *   - If a category has no entries classified (no cache data), leave it
 *     untouched.
 *   - If a category has SOME entries classified, split into MAIN
 *     (preserving order, removing experimental) and a new
 *     "#### Experimental" sub-section at the end (preserving order).
 *   - Entries that are not in the cache yet stay in the MAIN list
 *     (we don't know yet), unless the category is fully cached and they
 *     happen to be PENDING (then we leave them in MAIN — they'll be
 *     re-classified when cache fills).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const README = join(ROOT, "README-LEGACY.md");
const CACHE = "/tmp/legacy-cache.json";
const REPOS = "/tmp/legacy-repos.json";

const cache = JSON.parse(await readFile(CACHE, "utf8"));
const repos = JSON.parse(await readFile(REPOS, "utf8"));
const repoBySlug = new Map(repos.map((r) => [r.slug, r]));

const CUTOFF = new Date();
CUTOFF.setMonth(CUTOFF.getMonth() - 6);
const cutoffISO = CUTOFF.toISOString().slice(0, 10);

function classify(slug) {
  const stat = cache.results[slug];
  if (!stat || stat.__error || stat.__notFound) return "PENDING";
  if (stat.stars >= 500) return "MAIN";
  if (stat.lastCommitAt && stat.lastCommitAt >= cutoffISO) return "MAIN";
  return "EXPERIMENTAL";
}

const text = await readFile(README, "utf8");
const lines = text.split(/\r?\n/);

const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const h3 = line.match(/^###\s+(.+?)\s*$/);
  if (!h3) {
    out.push(line);
    i++;
    continue;
  }
  const category = h3[1].trim();
  out.push(line);
  i++;

  // Collect bullet lines for this category
  // Skip blank lines right after the ### header
  while (i < lines.length && lines[i].trim() === "") i++;
  const bullets = [];
  while (i < lines.length && /^\s*-\s/.test(lines[i])) {
    bullets.push({ lineNo: i, raw: lines[i] });
    i++;
  }

  if (bullets.length === 0) {
    continue;
  }

  // Map bullets to repos
  const classified = bullets.map((b) => {
    // Extract slug from raw line by matching name in cache
    // Use the parseEntry-style extraction inline
    const m = b.raw.match(/^\s*-\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (!m) return { bullet: b, slug: null, classified: "PENDING" };
    const name = m[1];
    const url = m[2];
    let entry = repos.find((r) => r.name === name && r.repoUrl === url);
    if (!entry) {
      // try slug
      const slugGuess = name
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      entry = repos.find((r) => r.slug === slugGuess);
    }
    if (!entry) return { bullet: b, slug: null, classified: "PENDING" };
    return { bullet: b, slug: entry.slug, classified: classify(entry.slug), category };
  });

  const main = classified.filter((c) => c.classified === "MAIN" || c.classified === "PENDING");
  const experimental = classified.filter((c) => c.classified === "EXPERIMENTAL");
  const hasAnyClassified = classified.some((c) => c.classified !== "PENDING");

  // Emit the main list
  for (const c of main) out.push(c.bullet.raw);

  if (hasAnyClassified && experimental.length > 0) {
    // Add a blank line + Experimental sub-section
    if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
    out.push("#### Experimental");
    out.push("");
    for (const c of experimental) {
      const r = repoBySlug.get(c.slug);
      const stat = cache.results[c.slug];
      const reason = stat
        ? `${stat.stars}⭐, last commit ${stat.lastCommitAt || "unknown"}`
        : "no data";
      out.push(`${c.bullet.raw} <!-- experimental: ${reason} -->`);
    }
  }
}

// Write
const newText = out.join("\n");
await writeFile(README, newText, "utf8");

// Diff stats
const oldLines = (await readFile("/tmp/README-LEGACY.backup.md", "utf8")).split(/\r?\n/);
const newLines = newText.split(/\r?\n/);
let added = 0, removed = 0;
const oldSet = new Set(oldLines);
const newSet = new Set(newLines);
for (const l of newLines) if (!oldSet.has(l)) added++;
for (const l of oldLines) if (!newSet.has(l)) removed++;
console.log(`[apply] old=${oldLines.length} new=${newLines.length} added=${added} removed=${removed}`);

const expLines = newLines.filter((l) => l.includes("#### Experimental"));
console.log(`[apply] Experimental sub-sections added: ${expLines.length}`);
