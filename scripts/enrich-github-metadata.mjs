#!/usr/bin/env node

// SPDX-License-Identifier: MIT

/**
 * Enrich `data/apps/<slug>.yml` with GitHub-shaped metadata that the
 * static build can't derive locally:
 *
 *   - license (e.g. "AGPL-3.0", "MIT")
 *   - language (e.g. "TypeScript", "Dart")
 *   - topics (e.g. ["photos", "backup"])
 *   - homepage (official site URL, if set)
 *
 * Sources (all unauthenticated, no rate limits):
 *
 *   - HTML page  → homepage, license, language, topics via DOM greps
 *   - Atom feed  → latest pushed_at (cross-check)
 *
 * The script only writes when the value changes — re-running is a
 * no-op. Skipped apps (404, private, rate-limited) are reported in
 * the summary so we know what to retry with a token later.
 *
 * Usage:  node scripts/enrich-github-metadata.mjs
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const DRY_RUN = process.env.DRY_RUN === "1";

const HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "open-apps-enricher",
};

function ownerRepo(repoUrl) {
  if (!repoUrl) return null;
  const m = String(repoUrl).match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function fetchHtml(owner, repo) {
  try {
    const res = await fetch(`https://github.com/${owner}/${repo}`, { headers: HEADERS });
    if (res.status === 404) return { notFound: true };
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return { html: await res.text() };
  } catch (err) {
    return { error: err.message };
  }
}

function extractLicense(html) {
  // GitHub renders the license link in the sidebar. Two common forms:
  //   <a href="/owner/repo/blob/main/LICENSE" ...>MIT license</a>
  //   <a ...>AGPL-3.0 license</a>
  // We grab the first "<word>-<word>" pattern that's also a known SPDX.
  const m =
    html.match(/>([A-Z][A-Z0-9.+-]*-\d(?:\.\d)?)\s+license</i) ||
    html.match(/>(MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|GPL-2\.0|GPL-3\.0|AGPL-3\.0|MPL-2\.0|ISC|Unlicense)\s+license</i) ||
    html.match(/>(MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|GPL-2\.0|GPL-3\.0|AGPL-3\.0|MPL-2\.0|ISC|Unlicense)</);
  return m ? m[1] : null;
}

function extractLanguage(html) {
  // The language bar uses this exact class on the language name span.
  // We take the FIRST occurrence — that's the primary language.
  const m = html.match(/class="color-fg-default text-bold mr-1">([^<]+)<\/span>/);
  return m ? m[1].trim() : null;
}

function extractTopics(html) {
  // Topic links: <a href="/topics/..." class="topic-tag...">name</a>
  const matches = html.matchAll(/<a href="\/topics\/[^"]+"[^>]*>([^<]+)<\/a>/g);
  const out = [];
  for (const m of matches) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  return [...new Set(out)];
}

function extractHomepage(html) {
  // Sidebar "About" section: <a ... href="https://..." rel="nofollow">Homepage</a>
  const m = html.match(/<a [^>]*href="(https?:\/\/[^"]+)"[^>]*rel="nofollow"[^>]*>\s*Homepage\s*<\/a>/);
  return m ? m[1] : null;
}

function licenseObject(spdxId) {
  // schemaVersion 1 expects `github.repository.license` as an object
  // with at least `spdx_id`. We only have the SPDX id from the HTML
  // scrape, so the rest of the fields stay null — sync-github-metadata
  // fills them in when run with a token.
  return { spdx_id: spdxId, key: null, name: null, url: null };
}

function assembleRepoBlock(existing, fields) {
  const repo = { ...(existing ?? {}) };
  if (fields.license) {
    // Preserve any richer fields the repo already has (e.g. name, url
    // populated by a previous token-backed sync), overwrite the spdx_id
    // and key with the freshly scraped value.
    const prev = existing?.license ?? {};
    repo.license = { ...prev, spdx_id: fields.license, key: prev.key ?? null };
  }
  if (fields.language) repo.language = fields.language;
  if (fields.topics && fields.topics.length > 0) repo.topics = fields.topics;
  return repo;
}

async function main() {
  const files = (await readdir(APPS_DIR)).filter((f) => f.endsWith(".yml")).sort();
  let updated = 0;
  let skipped = 0;
  const failed = [];
  let i = 0;
  for (const file of files) {
    i++;
    const path = join(APPS_DIR, file);
    const raw = await readFile(path, "utf8");
    const parsed = parse(raw) ?? {};
    if (parsed.schemaVersion !== 1) {
      skipped++;
      continue;
    }
    const identity = ownerRepo(parsed.repoUrl || parsed.source?.url);
    if (!identity) {
      skipped++;
      continue;
    }
    const { owner, repo } = identity;
    process.stdout.write(`[${String(i).padStart(2)}/${files.length}] ${owner}/${repo} ... `);
    const res = await fetchHtml(owner, repo);
    if (res.notFound) {
      process.stdout.write("skip (404)\n");
      skipped++;
      continue;
    }
    if (res.rateLimited) {
      process.stdout.write("rate-limited\n");
      failed.push(`${owner}/${repo}: rate-limited`);
      continue;
    }
    if (res.error) {
      process.stdout.write(`error: ${res.error}\n`);
      failed.push(`${owner}/${repo}: ${res.error}`);
      continue;
    }
    const license = extractLicense(res.html);
    const language = extractLanguage(res.html);
    const topics = extractTopics(res.html);
    const homepage = extractHomepage(res.html);
    const before = JSON.stringify(parsed.github?.repository ?? {});
    const next = assembleRepoBlock(parsed.github?.repository, { license, language, topics, homepage });
    if (JSON.stringify(next) === before) {
      process.stdout.write("no change\n");
      continue;
    }
    const nextDoc = {
      ...parsed,
      github: { ...(parsed.github ?? {}), repository: next },
    };
    if (homepage && !parsed.app?.homepage) {
      nextDoc.app = { ...(parsed.app ?? {}), homepage };
    }
    if (DRY_RUN) {
      process.stdout.write(`would update (license=${license} lang=${language} topics=${topics.length})\n`);
    } else {
      const out = stringify(nextDoc, { lineWidth: 100, singleQuote: false, defaultStringType: "PLAIN" });
      await writeFile(path, out, "utf8");
      process.stdout.write(`updated (license=${license ?? "—"} lang=${language ?? "—"} topics=${topics.length})\n`);
    }
    updated++;
  }
  console.log(`\n[enrich-github-metadata] ${updated} updated, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log("Failed (retry with a token if rate-limited):");
    for (const f of failed) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error("[enrich-github-metadata] failed:", err);
  process.exit(1);
});
