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
  github?: {
    repository?: {
      stargazers_count?: number;
      forks_count?: number;
    };
    activity?: {
      contributorsKnown?: number;
    };
  };
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
let totalContributors = 0;
let contributorsKnown = 0;
for (const a of apps) {
  for (const p of a.platforms ?? []) platforms.add(p);
  const forks = a.github?.repository?.forks_count ?? a.activity?.forks;
  const stars = a.github?.repository?.stargazers_count ?? a.activity?.stars;
  const contributorsCount = a.github?.activity?.contributorsKnown ?? a.activity?.contributors;

  if (typeof forks === "number" && forks > 0) {
    totalForks += forks;
  }
  if (typeof stars === "number" && stars > 0) {
    totalStars += stars;
    starsKnown += 1;
  }
  if (typeof contributorsCount === "number" && contributorsCount > 0) {
    totalContributors += contributorsCount;
    contributorsKnown += 1;
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
  contributors: totalContributors || contributors.length,
  stars: totalStars,
  forks: totalForks,
  categories: categories.length,
  stacks: new Set(apps.map((a) => a.stack).filter(Boolean)).size,
  platforms: platforms.size,
  originalRepo: "https://github.com/tortuvshin/open-source-flutter-apps",
};

// Counts of apps with synced readings. Useful for honest diagnostics.
export const statsDebug = { starsKnown, contributorsKnown };
