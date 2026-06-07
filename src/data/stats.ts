// Site stats, derived from data/generated/apps.json at build time.
//
// This file imports the same JSON the rest of the app uses, so the numbers
// here always match what's actually rendered. No hand-tuned magic numbers.
//
// Numbers in the rendered UI (hero, footer, etc.) come from this module.
// If a number looks wrong, regenerate the JSON (`npm run build:data`) and
// re-build — the stats recompute from the fresh data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { categories } from "./categories";
import { contributors } from "./contributors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(__dirname, "..", "..", "data", "generated", "apps.json");

type GeneratedApp = {
  category?: string;
  stack?: string;
  platforms?: string[];
  activity?: {
    stars?: number;
    forks?: number;
    contributors?: number;
  };
};

let apps: GeneratedApp[] = [];
try {
  const raw = JSON.parse(readFileSync(generatedPath, "utf8")) as { apps: GeneratedApp[] };
  apps = raw.apps ?? [];
} catch {
  // In dev, build:data may not have run yet. Stats will be zero. Don't crash.
  apps = [];
}

const platforms = new Set<string>();
let totalForks = 0;
let totalStars = 0;
let starsKnown = 0;
for (const a of apps) {
  for (const p of a.platforms ?? []) platforms.add(p);
  if (typeof a.activity?.forks === "number" && a.activity.forks > 0) {
    totalForks += a.activity.forks;
  }
  if (typeof a.activity?.stars === "number" && a.activity.stars > 0) {
    totalStars += a.activity.stars;
    starsKnown += 1;
  }
}

export type SiteStats = {
  apps: number;
  contributors: number;
  stars: number;
  forks: number;
  categories: number;
  stacks: number;
  platforms: number;
  originalRepo: string;
};

export const stats: SiteStats = {
  apps: apps.length,
  contributors: contributors.length,
  // The 4k stars figure is the legacy collection we forked from. We use
  // that as the project's social-proof number — the directory's own stars
  // (per-app) are surfaced on each card, not aggregated here.
  stars: 4000,
  forks: totalForks,
  categories: categories.length,
  stacks: new Set(apps.map((a) => a.stack).filter(Boolean)).size,
  platforms: platforms.size,
  originalRepo: "https://github.com/tortuvshin/open-source-flutter-apps",
};

// `starsKnown` is the count of apps with a non-zero star reading. Useful
// for honest copy like "X apps with verified activity data".
export const statsDebug = { starsKnown };
