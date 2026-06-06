#!/usr/bin/env node
/**
 * Build script: data/apps/*.yml → data/generated/apps.json
 *
 * Walks every .yml in data/apps/, parses it, and writes a single
 * `apps.json` that the Astro site imports. Apps whose
 * `activity.lastCommitAt` is more than STALE_DAYS days ago are
 * dropped from the listing (the yml stays in the repo, but the
 * site won't show it).
 *
 * Run with: `node scripts/build-apps-json.mjs`
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APPS_DIR = join(ROOT, "data", "apps");
const OUT_DIR = join(ROOT, "data", "generated");
const OUT_FILE = join(OUT_DIR, "apps.json");

const STALE_DAYS = 180;
const MIN_STARS = 500;
/** Number of recent months of commit activity we look at for the
 *  "consistent activity" branch of the bar. */
const MONTHS_WINDOW = 6;
/** Required minimum commits in each of those months. */
const MIN_MONTHLY_COMMITS = 1;

/**
 * Minimal YAML parser — supports the shape we actually use in
 * data/apps/. Avoids pulling in a heavy dependency for what is
 * fundamentally a flat-ish key/value list with one nested block
 * (activity). For anything more complex, swap in `js-yaml`.
 *
 * Supported:
 *   key: value
 *   key: >-
 *     multi-line value
 *   key: [a, b, c]
 *   nested:
 *     key: value
 *   # comment
 */
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/#.*$/, "").replace(/\s+$/, "");
    if (!line) {
      i++;
      continue;
    }

    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const [, key, valueRaw] = m;
    const value = valueRaw.trim();

    // Inline flow list: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      out[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      i++;
      continue;
    }

    // Folded scalar: >-
    if (value === ">-") {
      const buf = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (/^\s/.test(next) && next.trim() !== "") {
          buf.push(next.trim());
          i++;
        } else {
          break;
        }
      }
      out[key] = buf.join(" ");
      continue;
    }

    // Nested mapping (2-space indent) OR list of strings ("  - value")
    if (value === "") {
      i++;
      // Peek: is this a list of strings?
      const listItems = [];
      while (i < lines.length) {
        const next = lines[i];
        const listMatch = next.match(/^ {2}-\s+(.*)$/);
        if (listMatch) {
          listItems.push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
          i++;
          continue;
        }
        if (next.trim() === "" || next.trim().startsWith("#")) {
          i++;
          continue;
        }
        break;
      }
      if (listItems.length > 0) {
        out[key] = listItems;
        continue;
      }
      // Otherwise: nested mapping
      const nested = {};
      while (i < lines.length) {
        const nextRaw = lines[i].replace(/#.*$/, "").replace(/\s+$/, "");
        if (!nextRaw) {
          i++;
          continue;
        }
        // Nested mapping can be either:
        //   "  key: value"        → flat
        //   "  - value"           → list (we already handled that above)
        // So we only consume `  key: value` lines.
        const nestedMatch = nextRaw.match(/^ {2}([A-Za-z_][\w-]*):\s*(.*)$/);
        if (!nestedMatch) break;
        const [, nKey, nValRaw] = nestedMatch;
        const nVal = nValRaw.trim();
        if (nVal === "" || nVal === "null") {
          nested[nKey] = null;
        } else if (nVal === "true") {
          nested[nKey] = true;
        } else if (nVal === "false") {
          nested[nKey] = false;
        } else {
          nested[nKey] = isNaN(+nVal) ? nVal : +nVal;
        }
        i++;
      }
      out[key] = nested;
      continue;
    }

    // Plain scalar
    if (value === "null" || value === "~") {
      out[key] = null;
    } else if (value === "true") {
      out[key] = true;
    } else if (value === "false") {
      out[key] = false;
    } else if (!isNaN(+value) && value !== "") {
      out[key] = +value;
    } else {
      out[key] = value.replace(/^["']|["']$/g, "");
    }
    i++;
  }

  return out;
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (isNaN(t)) return Infinity;
  const ms = Date.now() - t;
  return ms / (1000 * 60 * 60 * 24);
}

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

  const files = entries.filter((f) => f.endsWith(".yml"));
  const apps = [];
  const dropped = [];

  for (const file of files) {
    const text = await readFile(join(APPS_DIR, file), "utf8");
    const app = parseYaml(text);
    if (!app.slug) {
      console.warn(`[build-apps-json] ${file} has no slug, skipping`);
      continue;
    }
    // Force slug to match the filename — files are named <slug>.yml
    // so this is the source of truth and prevents typos.
    const fileSlug = basename(file, ".yml");
    if (app.slug !== fileSlug) {
      console.warn(
        `[build-apps-json] ${file}: slug "${app.slug}" doesn't match filename "${fileSlug}", using filename`,
      );
      app.slug = fileSlug;
    }

    const lastCommit = app.activity?.lastCommitAt;
    const stale = lastCommit ? daysSince(lastCommit) : null;
    const stars = app.activity?.stars ?? 0;
    // Last 6 calendar months of commit counts, oldest first. Populated
    // by .github/workflows/update-apps.yml from the GitHub API.
    const monthly = Array.isArray(app.activity?.monthlyCommits)
      ? app.activity.monthlyCommits.slice(-MONTHS_WINDOW)
      : null;

    // Bar for inclusion (OR):
    //   - stars ≥ MIN_STARS, OR
    //   - commit in each of the last MONTHS_WINDOW months (≥ MIN_MONTHLY_COMMITS each).
    // Apps missing BOTH signals are dropped. The yml stays in the
    // repo as the source of truth; the JSON is the surfaced subset.
    const reasons = [];
    let passes = false;

    if (stars >= MIN_STARS) {
      passes = true;
    } else {
      reasons.push(`stars=${stars}<${MIN_STARS}`);
    }

    if (monthly && monthly.length === MONTHS_WINDOW) {
      const tooQuiet = monthly.find((n) => n < MIN_MONTHLY_COMMITS);
      if (tooQuiet === undefined) {
        passes = true;
      } else {
        reasons.push(`monthlyCommits=${JSON.stringify(monthly)}(some<${MIN_MONTHLY_COMMITS})`);
      }
    } else {
      reasons.push("monthlyCommits=unknown");
    }

    if (stale === null) reasons.push("lastCommit=unknown");
    else if (stale > STALE_DAYS && !passes) {
      // Only flag staleness as a problem if neither pass branch covers
      // the app — a 4k-star app that's been quiet 7 months still passes
      // on the stars branch.
      reasons.push(`lastCommit=${Math.round(stale)}d>${STALE_DAYS}d`);
    }

    if (!passes) {
      dropped.push({
        slug: app.slug,
        lastCommitAt: lastCommit,
        stars,
        reasons,
      });
      continue;
    }
    apps.push(app);
  }

  // Stable order: by stars desc, then name asc.
  apps.sort((a, b) => {
    const sa = a.activity?.stars ?? 0;
    const sb = b.activity?.stars ?? 0;
    if (sb !== sa) return sb - sa;
    return (a.name || "").localeCompare(b.name || "");
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalApps: apps.length,
        droppedApps: dropped.length,
        bar: {
          mode: "OR",
          minStars: MIN_STARS,
          monthlyWindow: { months: MONTHS_WINDOW, minPerMonth: MIN_MONTHLY_COMMITS },
          maxStaleDays: STALE_DAYS,
        },
        apps,
      },
      null,
      2,
    ),
  );

  console.log(
    `[build-apps-json] wrote ${apps.length} apps to ${OUT_FILE}\n` +
      `  bar: stars≥${MIN_STARS} OR monthly≥${MIN_MONTHLY_COMMITS}/month for ${MONTHS_WINDOW} months\n` +
      `  ${dropped.length} dropped`,
  );
}

main().catch((err) => {
  console.error("[build-apps-json] failed:", err);
  process.exit(1);
});
