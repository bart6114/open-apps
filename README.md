# Open Source Apps

> A hand-picked, self-refreshing directory of real open-source application
> codebases — chosen for what you can **learn** from them and what you can
> actually **contribute** to.

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥ 20](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](./package.json)
[![Astro](https://img.shields.io/badge/built%20with-Astro-FF5D01.svg)](https://astro.build)
[![Apps tracked](https://img.shields.io/badge/apps-79-lightgrey.svg)](./data/apps)

GitHub hosts tens of millions of public repos. Most of them are not worth your
time as either a reader or a contributor. This directory is an attempt to
surface the few that are: real applications, with architecture worth reading,
maintainers worth talking to, and recent commits worth tracking.

---

## What you can do here

### Learn — read how real apps are built

Every entry in the directory has hand-written notes on the _patterns_ inside
the repo, not just the description from the README.

```yaml
# data/apps/invoice-ninja.yml (excerpt)
bestFor:
  - Real commercial product with open codebase
  - Subscription & payment integration patterns
  - Multi-currency / multi-language business app
  - Companion-app architecture (mobile + hosted backend)
whyListed:
  - Real production app used by paying customers
  - Active commercial sponsor (Hillel Coren)
caveats:
  - Tightly coupled to the hosted Invoice Ninja platform
```

Pick a category you care about — payments, offline-first sync, plugin
systems, theming, real-time, search — and you'll find at least one app
that solved it for real, with code you can actually read.

### Contribute — find projects that will answer your PR

"Open source" and "welcoming to new contributors" are not the same thing.
The directory tracks contribution-readiness per app:

- `goodFirstIssues` — direct link to labelled issues
- `contributionGuide` — link to the project's own CONTRIBUTING.md
- `activity.lastCommitAt` — is anyone merging PRs this quarter?
- `labels: [new]` — apps with low-friction entry points

If the last commit is over a year old, the app falls out of the directory
automatically. Stale projects do not waste your time here.

### Discover — a curated view across millions of repos

The seed for this directory was [tortuvshin/open-source-flutter-apps][legacy]
(254 hand-picked Flutter apps, still preserved verbatim in
[`README-LEGACY.md`](./README-LEGACY.md)). From there, we apply a single
honest bar:

- **Real application codebase** — not a tutorial, demo, or template
- **Active** — a commit in the last 180 days, or it falls off
- **Substance** — at least 50 stars **and** 50 lifetime commits
- **Clear license** — MIT / Apache / BSD / etc.
- **Readable** — a README, examples, a contribution guide

Stars alone are not enough. A small clean app beats a popular one that
no one can read. An archived app can stay if it teaches a pattern clearly.
Everything is decided in the open, in pull requests, on `data/apps/`.

---

## How the data stays honest

```
data/apps/*.yml
   │  (GitHub Actions: daily, fetch stars/forks/last-commit/contributors)
   ▼
data/apps/*.yml        ← activity block updated in place
   │  (build step: yml → json, drop stale + below-bar entries)
   ▼
data/generated/apps.json   ← single source for the site
   │
   ▼
src/pages/**/*.astro       ← static pages, fully cacheable
```

You do not maintain a list. You maintain a **bar**. A daily GitHub Action
([`.github/workflows/update-apps.yml`](./.github/workflows/update-apps.yml))
refreshes the `activity:` block on every YAML; the build drops anything
whose last commit is older than 180 days. PRs that hand-edit the activity
block are accepted — the next workflow run will overwrite them. That is
the point.

---

## The schema

One app, one file. Hand-write the curation fields, let automation handle
the activity block.

```yaml
# Required — the app record. These never move without a rename PR.
slug: invoice-ninja
name: Invoice Ninja
repoUrl: https://github.com/invoiceninja/flutter-mobile
description: >-
  Companion app for the Invoice Ninja platform. Invoicing, expenses,
  time-billing, payments.
stack: Flutter
platforms: [Android, iOS]
category: Business

# Curated by hand, optional, slow to change.
homepageUrl: https://invoiceninja.com
license: AGPL-3.0
status: active
stateManagement: Provider
backend: REST API (Laravel)
architecture: Feature-based
difficulty: intermediate
codebaseSize: large
bestFor:
  - Real commercial product with open codebase
  - Subscription & payment integration patterns
whyListed:
  - Real production app used by paying customers
caveats:
  - Tightly coupled to the hosted Invoice Ninja platform
goodFirstIssues: https://github.com/invoiceninja/flutter-mobile/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
contributionGuide: https://github.com/invoiceninja/flutter-mobile/blob/master/CONTRIBUTING.md
scores:
  activity: 65
  maturity: 92
  learning: 78
  contribution: 70
  docs: 62
  overall: 76

# Auto-updated daily by .github/workflows/update-apps.yml.
# Don't edit by hand — the next workflow run will overwrite it.
activity:
  stars: 1744
  lastCommitAt: 2026-06-04
  updatedAt: 2026-06-06
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full bar, the adding /
updating / removing flow, and the style guide.

---

## Project layout

```
.
├── data/
│   ├── apps/                 # one yml per app (source of truth, 79 files)
│   └── generated/
│       └── apps.json         # build artifact, gitignored
├── scripts/
│   ├── build-apps-json.mjs   # yml → json + bar + staleness filter
│   ├── refresh-apps-activity.mjs
│   ├── seed-from-github.mjs
│   ├── parse-legacy-readme.mjs
│   ├── fetch-icons.mjs
│   └── *.test.mjs            # node --test
├── .github/workflows/
│   └── update-apps.yml       # daily activity refresh
├── src/
│   ├── pages/                # Astro pages
│   ├── components/           # UI
│   └── lib/                  # search, scoring, repo helpers
└── public/icons/             # platform + stack svgs, fetched
```

## Local development

```sh
npm install
npm run build:data   # yml → json, drops stale + below-bar entries
npm run build        # astro build, reads data/generated/apps.json
npm run dev          # local dev server
npm run check        # astro type / lint check
node --test scripts/*.test.mjs
```

## What this project is not

- Not a SaaS
- Not a Product Hunt competitor
- Not a GitHub scraper
- Not an "AI coding platform"

It is a directory. The work is curation, not scale. The hard part is
deciding what to leave out.

## License

App metadata is released under [CC BY-SA 4.0](./LICENSE) (see file for
the original CC0 attribution preserved for `README-LEGACY.md`). The
website code is MIT.

The original Flutter list, which seeded this directory, lives at
[`README-LEGACY.md`](./README-LEGACY.md) and
[tortuvshin/open-source-flutter-apps][legacy].
