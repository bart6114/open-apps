# Open Source Apps

> A curated, self-refreshing directory of real open-source application
> codebases - built for developers who want to learn from production apps and
> find projects worth contributing to.

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](./package.json)
[![Astro](https://img.shields.io/badge/built%20with-Astro-FF5D01.svg)](https://astro.build)
[![Apps tracked](https://img.shields.io/badge/apps-79-lightgrey.svg)](./data/apps)

GitHub is full of repositories, but only a small slice are useful as examples
of real application engineering. This project keeps that slice visible: apps
with readable architecture, active maintainers, clear licenses, and enough
substance to study.

The site is static. The data is structured. GitHub metadata is synced ahead of
time. Visitors never trigger GitHub API calls just to browse the directory.

## What This Is

Open Source Apps is a directory of application codebases, not a scraped list of
links. Every app is represented by one YAML file, enriched with curation notes,
taxonomy-backed platform and stack data, and scheduled GitHub activity signals.

Use it to:

- **Learn from real apps:** inspect production patterns, architecture choices,
  platform support, and implementation tradeoffs.
- **Find contribution targets:** look for active repos with issue templates,
  contribution docs, good-first-issue labels, and recent commits.
- **Compare ecosystems:** browse apps by category, stack, platform, activity,
  contribution readiness, and distribution channel.
- **Maintain a living catalog:** let automation refresh GitHub-shaped metadata
  while humans focus on curation.

## Inclusion Bar

A repository belongs here only when it is useful to read or contribute to. The
baseline bar is intentionally simple:

- Real application codebase, not a tutorial, demo, template, or package-only
  library.
- At least **50 stars** and **50 lifetime commits** on the primary public repo.
- Clear license and enough project context to understand what the app does.
- Recent activity, or a strong reason to keep an archived project for learning
  value.
- Human curation notes that explain why the app is worth listing.

Stars alone are not enough. A smaller, readable app can be more valuable than a
popular repository that is stale, opaque, or impossible to contribute to.

## How The Data Works

```text
data/apps/*.yml
   |
   |  validate schema and normalize records
   v
data/generated/apps.full.json
data/generated/apps.index.json
   |
   |  render static Astro routes
   v
dist/
```

The source of truth is `data/apps/*.yml`. Generated JSON is created during the
build and stays out of git.

GitHub metadata is stored under `github:` using GitHub's own field names
(`full_name`, `html_url`, `stargazers_count`, `pushed_at`, and so on). Scheduled
workflows update that metadata and create reviewable changes. Human-owned
fields live in `app:`, `stack:`, and `curation:`.

Key automation:

- [`validate-data.yml`](./.github/workflows/validate-data.yml) checks schema
  and data integrity in PRs.
- [`update-apps.yml`](./.github/workflows/update-apps.yml) refreshes legacy
  activity data.
- [`sync-github-metadata.yml`](./.github/workflows/sync-github-metadata.yml)
  syncs `schemaVersion: 1` GitHub metadata.
- [`cleanup-stale-apps.yml`](./.github/workflows/cleanup-stale-apps.yml)
  reports stale or below-bar entries before removal.

## App Record Shape

One app, one file:

```text
data/apps/<slug>.yml
```

Short example:

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

curation:
  reviewed: false
  bestFor:
    - Studying a real commercial mobile companion app.
  caveats:
    - Tightly coupled to the hosted Invoice Ninja platform.
```

See [`docs/SCHEMA.md`](./docs/SCHEMA.md) for the full contract, including
GitHub metadata, health fields, distribution channels, and ownership rules.

## Project Layout

```text
.
|-- data/
|   |-- apps/                 # one YAML source file per app
|   |-- generated/            # build artifacts, gitignored
|   `-- taxonomy/             # categories, stacks, platforms, channels
|-- docs/
|   `-- SCHEMA.md             # app data contract
|-- scripts/
|   |-- app-schema.mjs
|   |-- build-apps-json.mjs
|   |-- validate-apps.mjs
|   |-- sync-github-metadata.mjs
|   |-- refresh-apps-activity.mjs
|   |-- report-cleanup-candidates.mjs
|   |-- fetch-icons.mjs
|   `-- *.test.mjs
|-- src/
|   |-- components/           # Astro UI components
|   |-- data/                 # typed data loaders and summaries
|   |-- lib/                  # search, scoring, taxonomy helpers
|   `-- pages/                # static routes
`-- public/icons/             # platform and stack SVG icons
```

## Local Development

Requirements:

- Node.js 20 or newer
- npm

```sh
npm install
npm run build:data
npm run build
npm run dev
```

Useful commands:

| Command | Purpose |
|---------|---------|
| `npm run validate:data` | Validate `data/apps/*.yml` against the schema. |
| `npm run build:data` | Validate and generate app JSON. |
| `npm run build` | Build the full static Astro site. |
| `npm run dev` | Generate data and start the local dev server. |
| `npm run check` | Run Astro type checks. |
| `npm test` | Run Node test files under `scripts/`. |

## Contributing

The easiest way to add an app is through `/submit` on the site. Paste a public
GitHub repository URL, review the drafted fields, then open a PR with the new
`data/apps/<slug>.yml` file.

Before opening a PR:

```sh
npm run build:data
npm run build
npm test
```

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the inclusion bar, YAML style,
review expectations, and removal process.

## What This Is Not

- Not a Product Hunt clone.
- Not a GitHub scraper.
- Not a complete index of open-source apps.
- Not a popularity contest.
- Not a SaaS.

The value is curation. The hard part is deciding what to leave out.

## Provenance

This project began as a structured extraction from
[`tortuvshin/open-source-flutter-apps`][legacy], a public-domain collection of
Flutter apps. The original list is preserved in
[`README-LEGACY.md`](./README-LEGACY.md), and selected records have been
converted into the current YAML schema.

## License

The website code and project files are released under the [MIT License](./LICENSE).

The legacy source list is preserved with its original CC0 provenance in
[`README-LEGACY.md`](./README-LEGACY.md). See the note at the bottom of
[`LICENSE`](./LICENSE) for details.

[legacy]: https://github.com/tortuvshin/open-source-flutter-apps
