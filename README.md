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
- `github.repository.pushed_at` — is anyone merging PRs this quarter?
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
   │  (GitHub Actions: sync GitHub-shaped metadata)
   ▼
data/apps/*.yml        ← github.repository / github.activity updated in place
   │  (build step: validate + normalize)
   ▼
data/generated/apps.full.json
data/generated/apps.index.json
   │
   ▼
src/pages/**/*.astro       ← static pages, fully cacheable
```

You do not maintain a list. You maintain a **bar**. A daily GitHub Action
([`.github/workflows/update-apps.yml`](./.github/workflows/update-apps.yml))
keeps activity fresh for legacy records, while
[`sync-github-metadata.yml`](./.github/workflows/sync-github-metadata.yml)
syncs final `schemaVersion: 1` records using GitHub's own field names. Cleanup
automation reports stale apps before they are hidden or removed.

The rendered site never calls the GitHub API per visitor. Stars, forks,
contributors, open issues, pull requests, releases, and commit activity are
synced on a schedule, committed through reviewable bot PRs, and served as
static generated data.

---

## The schema

One app, one file. Contributors should use `/submit`; the form drafts YAML from
a GitHub URL and taxonomy-backed choices. Hand-write curation, let automation
own the `github:` and `health:` blocks.

```yaml
schemaVersion: 1
id: github:invoiceninja/flutter-mobile
slug: invoice-ninja

source:
  provider: github
  owner: invoiceninja
  repo: flutter-mobile
  url: https://github.com/invoiceninja/flutter-mobile

app:
  name: Invoice Ninja
  description: Companion app for the Invoice Ninja platform.
  category: business
  projectType: production
  platforms: [android, ios]
  tags: [invoicing, payments]

stack:
  primary: flutter
  technologies:
    - id: flutter
      role: mobile-framework
    - id: dart
      role: language

github:
  repository:
    full_name: invoiceninja/flutter-mobile
    html_url: https://github.com/invoiceninja/flutter-mobile
    stargazers_count: 1744
    pushed_at: 2026-06-04T00:00:00Z

curation:
  reviewed: false
  bestFor:
    - Real commercial product with open codebase.
```

See [`docs/SCHEMA.md`](./docs/SCHEMA.md) for the complete contract and
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for the adding / updating / removing
flow.

---

## Project layout

```
.
├── data/
│   ├── apps/                 # one yml per app (source of truth, 79 files)
│   └── generated/
│       ├── apps.full.json    # build artifact, gitignored
│       ├── apps.index.json   # build artifact, gitignored
│       └── apps.json         # compatibility alias, gitignored
├── scripts/
│   ├── build-apps-json.mjs   # yml → full/index json
│   ├── validate-apps.mjs
│   ├── sync-github-metadata.mjs
│   ├── refresh-apps-activity.mjs
│   ├── seed-from-github.mjs
│   ├── parse-legacy-readme.mjs
│   ├── fetch-icons.mjs
│   └── *.test.mjs            # node --test
├── .github/workflows/
│   ├── validate-data.yml
│   ├── sync-github-metadata.yml
│   └── update-apps.yml       # legacy activity refresh
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
npm run build        # astro build, reads generated app data
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
