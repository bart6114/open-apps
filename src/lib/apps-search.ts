import type { OpenSourceApp } from "../data/types";

/**
 * URL-driven filter state for the /apps discovery page.
 *
 * Multi-value fields use repeated keys in the URL: `?stack=Flutter&stack=React+Native`.
 * Empty / undefined fields mean "no filter on this dimension".
 */
export type AppsFilters = {
  q?: string;
  stacks?: string[];
  platforms?: string[];
  categories?: string[];
  labels?: string[];
  licenses?: string[];
};

const KEYS = {
  q: "q",
  stacks: "stack",
  platforms: "platform",
  categories: "category",
  labels: "label",
  licenses: "license",
} as const;

/**
 * Read filters from a URLSearchParams (or anything URLSearchParams-shaped,
 * e.g. the result of `new URL(req.url).searchParams`).
 */
export function filtersFromSearchParams(sp: URLSearchParams): AppsFilters {
  return {
    q: sp.get(KEYS.q) ?? undefined,
    stacks: sp.getAll(KEYS.stacks).filter(Boolean),
    platforms: sp.getAll(KEYS.platforms).filter(Boolean),
    categories: sp.getAll(KEYS.categories).filter(Boolean),
    labels: sp.getAll(KEYS.labels).filter(Boolean),
    licenses: sp.getAll(KEYS.licenses).filter(Boolean),
  };
}

/**
 * Serialize a filters object back to URLSearchParams.
 * Undefined / empty values are dropped.
 */
export function searchParamsFromFilters(f: AppsFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set(KEYS.q, f.q);
  for (const v of f.stacks ?? []) sp.append(KEYS.stacks, v);
  for (const v of f.platforms ?? []) sp.append(KEYS.platforms, v);
  for (const v of f.categories ?? []) sp.append(KEYS.categories, v);
  for (const v of f.labels ?? []) sp.append(KEYS.labels, v);
  for (const v of f.licenses ?? []) sp.append(KEYS.licenses, v);
  return sp;
}

/** True if any filter is active (i.e. the result list isn't "all apps"). */
export function hasAnyFilter(f: AppsFilters): boolean {
  if (f.q && f.q.trim()) return true;
  return Boolean(
    (f.stacks?.length ?? 0) +
      (f.platforms?.length ?? 0) +
      (f.categories?.length ?? 0) +
      (f.labels?.length ?? 0) +
      (f.licenses?.length ?? 0),
  );
}

/**
 * Return the subset of apps that match all active filters (AND across
 * dimensions, OR within a dimension).
 *
 * `q` is a case-insensitive substring search across name, owner,
 * description, and category. Other dimensions are exact match.
 */
export function filterApps(apps: OpenSourceApp[], f: AppsFilters): OpenSourceApp[] {
  const q = f.q?.trim().toLowerCase();
  const stacks = f.stacks?.length ? new Set(f.stacks) : null;
  const platforms = f.platforms?.length ? new Set(f.platforms) : null;
  const categories = f.categories?.length ? new Set(f.categories) : null;
  const labels = f.labels?.length ? new Set(f.labels) : null;
  const licenses = f.licenses?.length ? new Set(f.licenses) : null;

  return apps.filter((a) => {
    // Text search — match any of: name, owner (from repoUrl), description, category
    if (q) {
      const ownerMatch = /github\.com\/([^/]+)\//.exec(a.repoUrl)?.[1]?.toLowerCase() ?? "";
      const haystack = [a.name, ownerMatch, a.description, a.category]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (stacks) {
      const allStacks = [a.stack, ...(a.stacks ?? [])];
      if (!allStacks.some((s) => stacks.has(s))) return false;
    }

    if (platforms) {
      if (!a.platforms.some((p) => platforms.has(p))) return false;
    }

    if (categories) {
      if (!categories.has(a.category)) return false;
    }

    if (labels) {
      if (!a.labels?.some((l) => labels.has(l))) return false;
    }

    if (licenses) {
      if (!a.license || !licenses.has(a.license)) return false;
    }

    return true;
  });
}

/** Build a flat list of "active filter" chips for display + removal. */
export function activeFilterChips(
  f: AppsFilters,
): { key: keyof AppsFilters; value: string; label: string }[] {
  const out: { key: keyof AppsFilters; value: string; label: string }[] = [];

  if (f.q && f.q.trim()) {
    out.push({ key: "q", value: "", label: `“${f.q}”` });
  }
  for (const v of f.stacks ?? []) {
    out.push({ key: "stacks", value: v, label: `stack: ${v}` });
  }
  for (const v of f.platforms ?? []) {
    out.push({ key: "platforms", value: v, label: `platform: ${v}` });
  }
  for (const v of f.categories ?? []) {
    out.push({ key: "categories", value: v, label: `category: ${v}` });
  }
  for (const v of f.labels ?? []) {
    out.push({ key: "labels", value: v, label: v });
  }
  for (const v of f.licenses ?? []) {
    out.push({ key: "licenses", value: v, label: `license: ${v}` });
  }

  return out;
}

/**
 * Return a new filters object with one (key, value) removed.
 * - key="q" → clears the search string
 * - multi-value keys → removes the single matching value
 * Used by the "x" button on each active filter chip.
 */
export function removeFilter(
  f: AppsFilters,
  key: keyof AppsFilters,
  value: string,
): AppsFilters {
  if (key === "q") return { ...f, q: undefined };
  const current = f[key] as string[] | undefined;
  if (!current) return f;
  const next = current.filter((v) => v !== value);
  return { ...f, [key]: next.length ? next : undefined };
}

/**
 * Build the full list of facet values from the apps array, preserving
 * a sensible order (frequency desc, then alphabetical for ties).
 */
export function buildFacets(apps: OpenSourceApp[]) {
  const counts = {
    stack: new Map<string, number>(),
    platform: new Map<string, number>(),
    category: new Map<string, number>(),
    label: new Map<string, number>(),
    license: new Map<string, number>(),
  };
  for (const a of apps) {
    const allStacks = new Set([a.stack, ...(a.stacks ?? [])]);
    for (const s of allStacks) counts.stack.set(s, (counts.stack.get(s) ?? 0) + 1);
    for (const p of a.platforms) counts.platform.set(p, (counts.platform.get(p) ?? 0) + 1);
    counts.category.set(a.category, (counts.category.get(a.category) ?? 0) + 1);
    for (const l of a.labels ?? []) counts.label.set(l, (counts.label.get(l) ?? 0) + 1);
    if (a.license) counts.license.set(a.license, (counts.license.get(a.license) ?? 0) + 1);
  }
  const sortByCountThenName = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  return {
    stacks: sortByCountThenName(counts.stack),
    platforms: sortByCountThenName(counts.platform),
    categories: sortByCountThenName(counts.category),
    labels: sortByCountThenName(counts.label),
    licenses: sortByCountThenName(counts.license),
  };
}
