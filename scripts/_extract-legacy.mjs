#!/usr/bin/env node
/**
 * Read README-LEGACY.md and emit all project entries grouped by category.
 * Output JSON: [{ category, name, repoUrl, slug, lineNo }]
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const README = join(ROOT, "README-LEGACY.md");

function extractLinks(text) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) != null) out.push({ label: m[1], href: m[2] });
  return out;
}

function parseEntry(line) {
  const body = line.replace(/^\s*-\s+/, "").trim();
  const links = extractLinks(body);
  if (!links.length) return null;
  const app = links[0];
  if (!/^https?:\/\/(github|gitlab)\.com\//i.test(app.href)) return null;
  return { name: app.label, repoUrl: app.href };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const text = await readFile(README, "utf8");
const lines = text.split(/\r?\n/);

const byCategory = new Map();
let current = null;
for (let i = 0; i < lines.length; i++) {
  const cat = lines[i].match(/^###\s+(.+?)\s*$/);
  if (cat) {
    current = cat[1].trim();
    if (!byCategory.has(current)) byCategory.set(current, []);
    continue;
  }
  if (current && /^\s*-\s/.test(lines[i])) {
    const e = parseEntry(lines[i]);
    if (e) {
      let slug = slugify(e.name);
      const existing = byCategory.get(current);
      // resolve dup slug within the same category
      const sameCount = existing.filter((x) => x.slug === slug).length;
      if (sameCount > 0) slug = `${slug}-${sameCount + 1}`;
      e.slug = slug;
      e.lineNo = i + 1;
      existing.push(e);
    }
  }
}

const result = [];
for (const [category, entries] of byCategory) {
  for (const e of entries) result.push({ category, ...e });
}

console.log(JSON.stringify(result, null, 2));
