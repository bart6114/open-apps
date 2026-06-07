# Schema reference

Every app in `data/apps/*.yml` follows this shape. Only the fields marked
**required** must be present; everything else is optional curation.

## Required

| Field | Type | Notes |
|-------|------|-------|
| `slug` | string | URL-safe identifier, matches the filename. Kebab-case, lowercase, ASCII only. |
| `name` | string | Human-readable name. |
| `repoUrl` | string | Canonical GitHub/GitLab URL. |
| `description` | string | One-line, ends with a period. 5–15 words is the sweet spot. |
| `stack` | string | Primary stack. Must be one of `src/data/stacks.ts`. |
| `platforms` | string[] | Subset of `src/data/stacks.ts → platforms`. |
| `category` | string | One of `src/data/categories.ts`. |

## Activity (auto-updated)

The `activity:` block is owned by `.github/workflows/update-apps.yml` — the
daily GitHub Action overwrites it. Don't edit by hand; the next workflow
run will undo your changes.

| Field | Type | Source |
|-------|------|--------|
| `stars` | number | `stargazers_count` from the repo API. |
| `forks` | number | `forks_count`. |
| `monthlyCommits` | number[6] | Last 6 calendar months of commit counts, oldest first. |
| `lastCommitAt` | string (ISO date) | `pushed_at` from the repo API. |
| `totalCommitsKnown` | number | Lower bound on lifetime commits (we know it's at least this many). |
| `contributors` | number | `subscribers_count` proxy. |
| `updatedAt` | string (ISO date) | When the workflow last touched this file. |

## Curation (optional)

These fields are hand-written and slow to change. The site renders them in
the "Curation" panel of each app's page.

| Field | Type | Notes |
|-------|------|-------|
| `homepageUrl` | string | Live demo or marketing site. |
| `license` | string | SPDX identifier (e.g. `MIT`, `Apache-2.0`, `AGPL-3.0`). |
| `status` | enum | `active`, `quiet`, `stale`, `archived`, `unknown`. |
| `labels` | enum[] | `new`, `hot`, `mature`, `featured`. If absent, computed from activity. |
| `projectType` | enum | `real-app`, `production`, `reference`, `demo`, `template`. |
| `stateManagement` | string | Free text (e.g. `Provider`, `BLoC`, `Redux`). |
| `backend` | string | Free text (e.g. `REST API (Laravel)`). |
| `architecture` | string | Free text (e.g. `Feature-based`, `Clean`). |
| `difficulty` | enum | `beginner`, `intermediate`, `advanced`. |
| `codebaseSize` | enum | `small`, `medium`, `large`, `huge`. |
| `bestFor` | string[] | 1–5 bullets about what makes this app worth reading. |
| `whyListed` | string[] | 1–5 bullets about why it earned its spot in the directory. |
| `caveats` | string[] | 1–5 bullets about known limitations or sharp edges. |
| `goodFirstIssues` | string | URL of the `good first issue` label search. |
| `contributionGuide` | string | URL of the upstream CONTRIBUTING.md. |
| `scores` | object | 0–100 per dimension: `activity`, `maturity`, `learning`, `contribution`, `docs`, `overall`. |
| `launchedBy` | string | Org or person that originally created the app. |
| `launchAsk` | string | What the app needs (e.g. "Maintainer", "Funding"). |
| `lenses` | object | Curated lens tags for the apps-search facets. |
| `curation` | object | `{ reviewed: bool, by: string, notes: string }` provenance. |

## Bar for inclusion

A yml file in `data/apps/` is shown on the live site only if:

- `activity.stars >= 50` (popularity)
- `activity.totalCommitsKnown >= 50` (real history, not a one-commit
  stunt)

The `scripts/build-apps-json.mjs` build step enforces both. Apps failing
either rule are written into yml but **dropped from the JSON output** and
the site. To add an app that fails the bar, you have to either wait for it
to mature or hand-curate an exception with a `launchAsk` explaining why.

## Example minimal yml

```yaml
slug: my-app
name: My App
repoUrl: https://github.com/owner/my-app
description: A simple example app.
stack: Flutter
platforms: [Android, iOS]
category: Tools
```

The next workflow run will populate the `activity:` block.
