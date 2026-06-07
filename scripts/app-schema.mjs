import { parse, stringify } from "yaml";
import { z } from "zod";

const isoLike = z.string().min(4).nullable().optional();

const githubLicenseSchema = z
  .object({
    key: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    spdx_id: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const githubRepositorySchema = z
  .object({
    id: z.number().optional(),
    node_id: z.string().optional(),
    name: z.string().optional(),
    full_name: z.string().optional(),
    html_url: z.string().url().optional(),
    clone_url: z.string().optional(),
    ssh_url: z.string().optional(),
    homepage: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    fork: z.boolean().optional(),
    archived: z.boolean().optional(),
    disabled: z.boolean().optional(),
    private: z.boolean().optional(),
    is_template: z.boolean().optional(),
    visibility: z.string().optional(),
    default_branch: z.string().optional(),
    language: z.string().nullable().optional(),
    topics: z.array(z.string()).optional(),
    license: githubLicenseSchema,
    stargazers_count: z.number().optional(),
    watchers_count: z.number().optional(),
    forks_count: z.number().optional(),
    open_issues_count: z.number().optional(),
    subscribers_count: z.number().optional(),
    size: z.number().optional(),
    created_at: isoLike,
    updated_at: isoLike,
    pushed_at: isoLike,
  })
  .passthrough();

const finalAppSchema = z
  .object({
    schemaVersion: z.number().optional(),
    id: z.string().optional(),
    slug: z.string().min(1),
    source: z
      .object({
        provider: z.literal("github"),
        owner: z.string().min(1),
        repo: z.string().min(1),
        url: z.string().url().optional(),
      })
      .passthrough(),
    app: z
      .object({
        name: z.string().min(1),
        description: z.string().min(1),
        category: z.string().min(1),
        projectType: z.string().optional(),
        platforms: z.array(z.string()).min(1),
        tags: z.array(z.string()).optional(),
      })
      .passthrough(),
    stack: z
      .object({
        primary: z.string().min(1),
        families: z.array(z.string()).optional(),
        technologies: z
          .array(
            z
              .object({
                id: z.string().min(1),
                role: z.string().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
    github: z
      .object({
        repository: githubRepositorySchema.optional(),
        languages: z.record(z.string(), z.number()).optional(),
        latestRelease: z.record(z.string(), z.unknown()).nullable().optional(),
        activity: z.record(z.string(), z.unknown()).optional(),
        files: z.record(z.string(), z.boolean()).optional(),
        labels: z.array(z.record(z.string(), z.unknown())).optional(),
        sync: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    health: z.record(z.string(), z.unknown()).optional(),
    curation: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const legacyAppSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    repoUrl: z.string().url(),
    description: z.string().min(1),
    stack: z.union([z.string(), z.record(z.string(), z.unknown())]),
    stacks: z.array(z.string()).optional(),
    platforms: z.array(z.string()).default([]),
    category: z.string().min(1),
  })
  .passthrough();

export function parseAppYaml(text, fileSlug) {
  const raw = parse(text) ?? {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${fileSlug}: app file must contain a YAML mapping`);
  }
  return raw;
}

export function stringifyAppYaml(app) {
  return stringify(app, {
    lineWidth: 100,
    singleQuote: false,
    defaultStringType: "PLAIN",
  });
}

export function getOwnerRepoFromUrl(repoUrl) {
  if (!repoUrl) return null;
  const m = String(repoUrl).match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function compactArray(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function formatDateOnly(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return String(value);
  return d.toISOString().slice(0, 10);
}

function daysSince(value) {
  if (!value) return Infinity;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return Infinity;
  return (Date.now() - d.valueOf()) / 86_400_000;
}

function healthFromSignals({ repo, monthlyCommits, legacyStatus }) {
  const stars = repo?.stargazers_count ?? 0;
  const lastCommitAt = repo?.pushed_at;
  const archived = Boolean(repo?.archived);
  const disabled = Boolean(repo?.disabled);
  const staleDays = daysSince(lastCommitAt);
  const activeMonths = Array.isArray(monthlyCommits)
    ? monthlyCommits.filter((m) => {
        const commits = typeof m === "number" ? m : m?.commits;
        return Number(commits) > 0;
      }).length
    : 0;

  const status = archived
    ? "archived"
    : disabled
      ? "unavailable"
      : staleDays <= 180
        ? "active"
        : staleDays <= 365
          ? "quiet"
          : "stale";

  const tier =
    status === "archived" || status === "unavailable"
      ? "hidden"
      : stars >= 500 || activeMonths >= 4
        ? "curated"
        : stars >= 50
          ? "listed"
          : "experimental";

  return {
    status: legacyStatus ?? status,
    tier,
    visibility: tier === "hidden" ? "hidden" : "listed",
    cleanupCandidate: status === "stale" || status === "archived" || status === "unavailable",
    staleReason:
      status === "stale"
        ? "no_commits_365_days"
        : status === "archived"
          ? "github_archived"
          : status === "unavailable"
            ? "github_unavailable"
            : null,
  };
}

function normalizeFinal(raw, fileSlug) {
  const parsed = finalAppSchema.parse(raw);
  const repo = parsed.github?.repository;
  const repoUrl = parsed.source.url ?? repo?.html_url ?? `https://github.com/${parsed.source.owner}/${parsed.source.repo}`;
  const activity = parsed.github?.activity ?? {};
  const monthlyCommits = activity.monthlyCommits;
  const health = {
    ...healthFromSignals({ repo, monthlyCommits }),
    ...(parsed.health ?? {}),
  };
  const technologies = compactArray((parsed.stack.technologies ?? []).map((t) => t.id));
  const secondaryStacks = technologies.filter((id) => id !== parsed.stack.primary);

  return {
    ...parsed,
    slug: parsed.slug || fileSlug,
    name: parsed.app.name,
    description: parsed.app.description,
    repoUrl,
    homepageUrl: repo?.homepage || raw.homepageUrl || undefined,
    stack: parsed.stack.primary,
    stacks: secondaryStacks,
    platforms: parsed.app.platforms,
    category: parsed.app.category,
    tags: compactArray([...(parsed.app.tags ?? []), ...(repo?.topics ?? [])]),
    license: repo?.license?.spdx_id || undefined,
    status: health.status,
    stars: repo?.stargazers_count,
    lastCommitAt: formatDateOnly(repo?.pushed_at),
    projectType: parsed.app.projectType,
    bestFor: parsed.curation?.bestFor,
    whyListed: parsed.curation?.whyListed,
    caveats: parsed.curation?.caveats,
    scores: parsed.curation?.scores,
    curation: parsed.curation,
    health,
    tier: health.tier,
  };
}

function normalizeLegacy(raw, fileSlug) {
  const parsed = legacyAppSchema.parse({ ...raw, slug: raw.slug ?? fileSlug });
  const ownerRepo = getOwnerRepoFromUrl(parsed.repoUrl);
  const activity = parsed.activity ?? {};
  const repo = {
    full_name: ownerRepo ? `${ownerRepo.owner}/${ownerRepo.repo}` : undefined,
    name: ownerRepo?.repo,
    html_url: parsed.repoUrl,
    homepage: parsed.homepageUrl,
    description: parsed.description,
    fork: false,
    archived: parsed.status === "archived",
    disabled: false,
    private: false,
    visibility: "public",
    language: typeof parsed.stack === "string" ? parsed.stack : undefined,
    license: parsed.license ? { spdx_id: parsed.license } : undefined,
    stargazers_count: activity.stars ?? parsed.stars,
    forks_count: activity.forks,
    subscribers_count: activity.contributors,
    pushed_at: activity.lastCommitAt,
    updated_at: activity.updatedAt,
  };
  const monthlyCommits = activity.monthlyCommits ?? [];
  const primaryStack = typeof parsed.stack === "string" ? parsed.stack : parsed.stack.primary;
  const health = healthFromSignals({ repo, monthlyCommits, legacyStatus: parsed.status });

  return {
    ...parsed,
    schemaVersion: 0,
    id: ownerRepo ? `github:${ownerRepo.owner}/${ownerRepo.repo}` : undefined,
    source: ownerRepo
      ? {
          provider: "github",
          owner: ownerRepo.owner,
          repo: ownerRepo.repo,
          url: parsed.repoUrl,
        }
      : undefined,
    app: {
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      projectType: parsed.projectType,
      platforms: parsed.platforms,
      tags: parsed.tags,
    },
    stack: primaryStack,
    stackModel: {
      primary: primaryStack,
      technologies: compactArray([primaryStack, ...(parsed.stacks ?? [])]).map((id) => ({ id })),
    },
    github: {
      repository: repo,
      activity: {
        monthlyCommits,
        totalCommitsKnown: activity.totalCommitsKnown,
        contributorsKnown: activity.contributors,
      },
      sync: {
        syncedAt: activity.updatedAt,
        source: "legacy-activity-block",
      },
    },
    health,
    tier: health.tier,
    stars: repo.stargazers_count,
    lastCommitAt: formatDateOnly(repo.pushed_at),
  };
}

export function normalizeAppRecord(raw, fileSlug) {
  if (raw.app && raw.source && raw.github !== undefined) {
    return normalizeFinal(raw, fileSlug);
  }
  return normalizeLegacy(raw, fileSlug);
}

export function validateAppRecord(raw, fileSlug) {
  try {
    normalizeAppRecord(raw, fileSlug);
    return [];
  } catch (err) {
    if (err instanceof z.ZodError) {
      return err.issues.map((issue) => `${fileSlug}: ${issue.path.join(".") || "(root)"} ${issue.message}`);
    }
    return [`${fileSlug}: ${err.message}`];
  }
}

export function toIndexApp(app) {
  return {
    slug: app.slug,
    name: app.name,
    description: app.description,
    repoUrl: app.repoUrl,
    homepageUrl: app.homepageUrl,
    category: app.category,
    platforms: app.platforms ?? [],
    primaryStack: app.stack,
    stack: app.stack,
    stacks: app.stacks ?? [],
    technologies: compactArray([app.stack, ...(app.stacks ?? [])]),
    tier: app.health?.tier ?? app.tier,
    status: app.health?.status ?? app.status,
    visibility: app.health?.visibility ?? "listed",
    stars: app.github?.repository?.stargazers_count ?? app.stars,
    forks: app.github?.repository?.forks_count,
    openIssues: app.github?.repository?.open_issues_count,
    license: app.github?.repository?.license?.spdx_id ?? app.license,
    lastCommitAt: formatDateOnly(app.github?.repository?.pushed_at ?? app.lastCommitAt),
    tags: app.tags ?? [],
  };
}
