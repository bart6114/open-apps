# Open Source Apps

A static, community-curated directory of real open-source application codebases.

The goal is to find **10,000 useful open-source apps** and keep the directory honest about which ones are still alive, which ones matter, and which ones have been quiet for a year.

## How it works

Each registered app is a single YAML file under [`data/apps/`](./data/apps/). GitHub Actions refreshes activity metadata daily, and the build pipeline turns all YAML files into one JSON datasource that the Astro site reads at build time. Stale projects — no commit in over a year — are dropped from the listing automatically.

```
data/apps/*.yml
   │  (GitHub Actions: daily, fetch stars/forks/last-commit/contributors)
   ▼
data/apps/*.yml        ← metadata updated in place
   │  (build step: yml → json)
   ▼
data/generated/apps.json   ← single source for the site
   │
   ▼
src/pages/**/*.astro       ← static pages, fully cacheable
```

## The source

The original seed is [`README-LEGACY.md`](./README-LEGACY.md) — 254 hand-picked Flutter apps from the [tortuvshin/open-source-flutter-apps](https://github.com/tortuvshin/open-source-flutter-apps) collection. It is preserved for attribution and is still the first place to look when adding a new app.

New apps can come from anywhere: a PR, a GitHub search, a Hacker News post. The bar is the same: it must be a real application codebase, not a tutorial or a demo.

## The bar for a useful app

Not every repository is useful in the same way. The directory tracks signals that matter:

- **Real application codebase** — not a tutorial, demo, or template
- **Active development** — commits in the last year
- **Mature history** — at least one stable release or production usage
- **Clear license** — MIT / Apache / BSD / etc.
- **Good documentation** — README, examples, contributing guide
- **Useful architecture patterns** — something worth reading
- **Contribution readiness** — open issues, recent merged PRs
- **Learning value** — readable code, useful patterns
- **Honest caveats** — known limitations
- **Similar alternatives** — other apps in the same space

Stars matter, but they are not enough. A smaller app with clean structure can be more useful than a popular project that is too large to understand. An archived app can still be valuable if it teaches a pattern clearly.

## The schema

One app, one file. `data/apps/invoice-ninja.yml`:

```yaml
# Required — the app record. These never move.
slug: invoice-ninja
name: Invoice Ninja
repoUrl: https://github.com/invoiceninja/flutter-mobile
description: Companion app for the Invoice Ninja platform.
stack: Flutter
platforms: [Android, iOS]
category: Business

# Curated by hand, optional, slow to change.
bestFor:
  - Real commercial product with open codebase
  - Subscription & payment integration patterns
whyListed:
  - Real production app used by paying customers
caveats:
  - Tightly coupled to the hosted Invoice Ninja platform

# Auto-updated daily by GitHub Actions. Don't edit by hand.
activity:
  stars: 1800
  forks: 510
  lastCommitAt: 2025-11-12
  contributors: 42
  updatedAt: 2026-06-06
```

The `activity` block is owned by automation. PRs that change it directly will be merged, but the next workflow run will overwrite them. That is the point.

## Build pipeline

```sh
npm install
npm run build:data   # yml → json, drops stale entries (>365 days no commit)
npm run build        # astro build, reads data/generated/apps.json
```

The first step runs the script in [`scripts/build-apps-json.mjs`](./scripts/build-apps-json.mjs). It walks `data/apps/`, parses each YAML, drops any app whose `activity.lastCommitAt` is more than 365 days ago, and writes the result to `data/generated/apps.json`. The Astro site then imports that JSON as its single data source.

## GitHub Actions

[`update-apps.yml`](./.github/workflows/update-apps.yml) runs daily on a cron schedule. For every YAML in `data/apps/`, it:

1. Calls the GitHub REST API for the repo.
2. Updates `activity.stars`, `activity.forks`, `activity.lastCommitAt`, `activity.contributors`.
3. Writes the updated YAML back in place.
4. Opens a PR if anything changed.

The site is rebuilt automatically on merge. No manual edits, no drift.

## Project layout

```
.
├── data/
│   ├── apps/                 # one yml per app (source of truth)
│   └── generated/
│       └── apps.json         # build artifact, gitignored
├── scripts/
│   └── build-apps-json.mjs   # yml → json + stale filter
├── .github/workflows/
│   └── update-apps.yml       # daily activity refresh
├── src/
│   ├── pages/                # Astro pages
│   ├── components/           # UI
│   └── lib/                  # search, scoring, repo helpers
└── public/icons/             # platform + stack svgs, fetched
```

## What this is not

- Not a SaaS
- Not a Product Hunt competitor
- Not a GitHub scraper
- Not an "AI coding platform"

A plain README list becomes hard to scan as the number of apps grows. Open Source Apps turns that list into a structured directory whose data stays fresh by itself.

## Why this list is still needed

A lot of developer attention right now is on AI coding tools. The pitch is familiar: describe the app, the model builds it, ship it.

This project does not pretend to compete with that. It does something different.

AI can generate code. It can also generate code that *looks like an app, runs like an app, and breaks like an app*. A generated prototype is not the same as a real application. Real apps have structure that survives years of changes, decisions, edge cases, and contributors. That part does not come from prompting a model.

If you are using an AI tool to build something, you can also use this directory to find real apps to point it at. *"Build me an app like this one"* is a stronger instruction than *"build me an app."*

## License

App metadata is released under [CC BY-SA 4.0](./LICENSE). The website code is MIT.

The original Flutter list, which seeded this directory, lives at [`README-LEGACY.md`](./README-LEGACY.md).
