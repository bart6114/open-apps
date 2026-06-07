#!/usr/bin/env node

// SPDX-License-Identifier: MIT


/**
 * Parse README-LEGACY.md → data/apps/<slug>.yml
 *
 * The legacy README is a flat list of `- [Name](repoUrl) - desc`
 * bullets grouped under `### Category` headers. This script walks
 * it, classifies each entry under its category, and writes one
 * YML per app into data/apps/.
 *
 * Run with: `node scripts/parse-legacy-readme.mjs`
 *
 * Re-runnable. Existing yml files are overwritten (the hand-curated
 * yml files already in data/apps/ will be re-emitted with whatever
 * metadata the legacy list has — re-add curation fields after).
 */

import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const README = join(ROOT, "README-LEGACY.md");
const APPS_DIR = join(ROOT, "data", "apps");


function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function ymlEscape(s) {
  if (s == null) return '""';
  // Quote with double-quotes, escape internal " and \.
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function extractLinks(text) {
  // Returns [{label, href}] for every [label](href) in the text.
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) != null) {
    out.push({ label: m[1], href: m[2] });
  }
  return out;
}

/**
 * Parse one `- [Name](repoUrl) - desc` line.
 * Returns { name, repoUrl, description, author } or null on miss.
 */
export function parseEntry(line) {
  // Strip the leading bullet + whitespace.
  const body = line.replace(/^\s*-\s+/, "").trim();
  if (!body) return null;

  const links = extractLinks(body);
  if (links.length === 0) return null;

  // First link is the app itself; the rest are author/live-code/etc.
  const app = links[0];
  if (!/^https?:\/\/(github|gitlab)\.com\//i.test(app.href)) return null;

  // Strip the first "[Name](url)" from the body to get the rest.
  let afterApp = body
    .replace(/^\s*\[([^\]]+)\]\(([^)]+)\)\s*/, "")
    .replace(/^[-—–]\s*/, "") // leading dash / em-dash
    .trim();

  // Strip trailing parenthesised groups, but tolerate nested parens
  // by counting paren balance. Repeats until the string doesn't
  // end with a balanced group any more.
  while (/\s*\([^)]*\)\s*$/.test(afterApp)) {
    // Find the matching `(` for the trailing `)`.
    let depth = 0;
    let i = afterApp.length;
    for (; i > 0; i--) {
      const c = afterApp[i - 1];
      if (c === ")") depth++;
      else if (c === "(") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (i <= 0) break;
    afterApp = afterApp.slice(0, i).trim();
  }

  // Now look for " by [author]" at the end.
  // The author link is the LAST link in the by-clause.
  let description = afterApp;
  let author = null;

  // Find position of " by [" (or " by " followed by a name).
  const byLinkIdx = afterApp.lastIndexOf(" by [");
  if (byLinkIdx >= 0) {
    description = afterApp.slice(0, byLinkIdx).trim();
    // Author label is inside the brackets.
    const close = afterApp.indexOf("]", byLinkIdx);
    if (close > 0) {
      author = afterApp.slice(byLinkIdx + 5, close).trim();
    }
  } else {
    // Plain text author, e.g. "Description by Chechu" (rare).
    const byPlain = afterApp.match(/^(.*?)\s+by\s+([A-Z][\w .'-]+?)\s*$/);
    if (byPlain) {
      description = byPlain[1].trim();
      author = byPlain[2].trim();
    }
  }

  // Trim trailing punctuation.
  description = description.replace(/[.\s]+$/, "").trim();
  if (!description) description = app.label;

  return {
    name: app.label,
    repoUrl: app.href,
    description,
    author,
  };
}

function ymlFor(entry, category) {
  const slug = slugify(entry.name);
  const lines = [
    `# ${entry.name} — auto-generated from README-LEGACY.md.`,
    `# Hand-curate bestFor / whyListed / caveats / scores after import.`,
    `slug: ${ymlEscape(slug)}`,
    `name: ${ymlEscape(entry.name)}`,
    `repoUrl: ${ymlEscape(entry.repoUrl)}`,
    `description: ${ymlEscape(entry.description)}`,
    `stack: Flutter`,
    `platforms: [Android, iOS]`,
    `category: ${ymlEscape(category)}`,
  ];
  if (entry.author) {
    lines.push(`# Original submitter: ${entry.author}`);
  }
  lines.push(
    `activity:`,
    `  stars: 0`,
    `  forks: 0`,
    `  lastCommitAt: null  # populated by GitHub Actions on first refresh`,
    `  contributors: 0`,
    `  updatedAt: ${new Date().toISOString().slice(0, 10)}`,
  );
  return lines.join("\n") + "\n";
}

async function main() {
  const text = await readFile(README, "utf8");
  const lines = text.split(/\r?\n/);

  // Group entries by category.
  const byCategory = new Map();
  let current = null;

  for (const line of lines) {
    const catMatch = line.match(/^###\s+(.+?)\s*$/);
    if (catMatch) {
      current = catMatch[1].trim();
      if (!byCategory.has(current)) byCategory.set(current, []);
      continue;
    }
    if (current && /^\s*-\s/.test(line)) {
      byCategory.get(current).push(line);
    }
  }

  // Clean the apps dir of any non-curated yml files (we'll regenerate
  // from the legacy list). The hand-curated invoice-ninja.yml is
  // preserved by re-importing it from the legacy list as-is.
  await mkdir(APPS_DIR, { recursive: true });

  const seenSlugs = new Map(); // slug → count, to deduplicate
  let written = 0;
  let skipped = 0;

  for (const [category, entries] of byCategory) {
    for (const line of entries) {
      const entry = parseEntry(line);
      if (!entry) {
        skipped++;
        continue;
      }
      let slug = slugify(entry.name);
      if (seenSlugs.has(slug)) {
        const n = (seenSlugs.get(slug) ?? 1) + 1;
        seenSlugs.set(slug, n);
        slug = `${slug}-${n}`;
      } else {
        seenSlugs.set(slug, 1);
      }
      const path = join(APPS_DIR, `${slug}.yml`);
      await writeFile(path, ymlFor(entry, category), "utf8");
      written++;
    }
  }

  console.log(
    `[parse-legacy] wrote ${written} yml files to ${APPS_DIR} (${skipped} entries skipped)`,
  );
  console.log(
    `[parse-legacy] categories: ${[...byCategory.keys()].join(", ")}`,
  );
}

// Only run main() when this file is invoked directly, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[parse-legacy] failed:", err);
    process.exit(1);
  });
}

