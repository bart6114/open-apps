import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { OpenSourceApp } from "./types";

// ──────────────────────────────────────────────────────────────────────
// Source of truth: data/generated/apps.json, produced at build time
// from data/apps/*.yml by scripts/build-apps-json.mjs. The yml files
// are the human-edited source; this file is just a typed re-export
// that fills in safe defaults so consumers don't have to guard every
// optional field.
//
// When adding a new app: write a yml in data/apps/, run
// `npm run build:data`, and it will appear here.
// ──────────────────────────────────────────────────────────────────────

// We read the JSON at module init via Node's fs because the file
// is generated (gitignored) and Vite/rollup can't statically resolve
// gitignored JSON imports.
const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(__dirname, "..", "..", "data", "generated", "apps.json");

let generated: { apps: unknown[] };
try {
  generated = JSON.parse(readFileSync(generatedPath, "utf8"));
} catch (err) {
  // In dev mode the JSON may not exist yet if `npm run build:data`
  // wasn't run. Surface a clear error instead of failing later.
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(
      `data/generated/apps.json not found. Run \`npm run build:data\` first.`,
    );
  }
  throw err;
}

type GeneratedApp = Partial<OpenSourceApp> & {
  slug: string;
  name: string;
  repoUrl: string;
  description?: string;
  stack: string;
  platforms: string[];
  category: string;
  activity?: {
    stars?: number;
    forks?: number;
    lastCommitAt?: string | null;
    contributors?: number;
    updatedAt?: string;
  };
};

/**
 * Map a generated yml-shaped record to the OpenSourceApp shape that
 * pages expect. Fills defaults, flattens `activity.stars` → `stars`,
 * and tolerates missing curation fields.
 */
function normalize(g: GeneratedApp): OpenSourceApp {
  const a = g.activity ?? {};
  return {
    slug: g.slug,
    name: g.name,
    description: g.description ?? "",
    repoUrl: g.repoUrl,
    homepageUrl: g.homepageUrl,
    stack: g.stack,
    stacks: g.stacks,
    platforms: g.platforms ?? [],
    category: g.category,
    tags: g.tags,
    logoUrl: g.logoUrl,
    stars: typeof a.stars === "number" ? a.stars : g.stars,
    license: g.license,
    status: g.status,
    addedAt: g.addedAt,
    lastCommitAt: a.lastCommitAt ?? g.lastCommitAt,
    labels: g.labels,
    // Curation (optional)
    projectType: g.projectType,
    stateManagement: g.stateManagement,
    backend: g.backend,
    architecture: g.architecture,
    difficulty: g.difficulty,
    codebaseSize: g.codebaseSize,
    bestFor: g.bestFor,
    whyListed: g.whyListed,
    caveats: g.caveats,
    goodFirstIssues: g.goodFirstIssues,
    contributionGuide: g.contributionGuide,
    launchedBy: g.launchedBy,
    launchAsk: g.launchAsk,
    lenses: g.lenses,
    scores: g.scores,
    curation: g.curation,
  };
}

const generatedApps = generated.apps as GeneratedApp[];

export const apps: OpenSourceApp[] = generatedApps.map(normalize);

// ── Convenience filters ──────────────────────────────────────────────

export function newApps(): OpenSourceApp[] {
  return apps.filter((a) => a.labels?.includes("new"));
}
export function hotApps(): OpenSourceApp[] {
  return apps.filter((a) => a.labels?.includes("hot"));
}
export function matureApps(): OpenSourceApp[] {
  return apps.filter((a) => a.labels?.includes("mature"));
}

// ── Lookups ──────────────────────────────────────────────────────────

const bySlug = new Map(apps.map((a) => [a.slug, a]));

export function appBySlug(slug: string): OpenSourceApp | undefined {
  return bySlug.get(slug);
}

// ── Stats helpers used by home + apps pages ─────────────────────────

export function appsByCategory(): Map<string, OpenSourceApp[]> {
  const m = new Map<string, OpenSourceApp[]>();
  for (const a of apps) {
    const k = a.category || "Other";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(a);
  }
  return m;
}

export function appsByStack(): Map<string, OpenSourceApp[]> {
  const m = new Map<string, OpenSourceApp[]>();
  for (const a of apps) {
    const k = a.stack || "Other";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(a);
  }
  return m;
}
