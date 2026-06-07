# Open Source Apps

> A curated directory of real open-source apps you can run, study, and contribute to.

**Live site: [open-apps.dev.mn](https://open-apps.dev.mn)** · 79 apps · Updated daily

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Apps tracked](https://img.shields.io/badge/apps-79-lightgrey.svg)](./data/apps)
[![For LLMs](https://img.shields.io/badge/llms.txt-available-6ee7b7.svg)](https://open-apps.dev.mn/llms.txt)

## Why this exists

GitHub is full of repositories, but only a small slice are useful as examples of real application engineering. This directory keeps that slice visible — apps with readable architecture, active maintainers, clear licenses, and enough substance to study.

The site is static, the data is structured, and visitors never hit GitHub's API just to browse.

## What you'll find here

Every entry is one real application, not a tutorial, demo, or library. Each has:

- **App metadata** — name, repo, description, license, supported platforms
- **Curation notes** from a human reviewer — what's good to study, what to watch out for
- **GitHub signals** — stars, forks, last commit, contributors
- **Six scores** — activity, maturity, learning value, contribution readiness, docs, overall

Detail pages mirror this on the live site at `/apps/{slug}`.

## Browse the directory

- [All apps](https://open-apps.dev.mn/apps) — filter by stack, category, platform, license
- [New apps](https://open-apps.dev.mn/apps?label=new) — recently added
- [Hot apps](https://open-apps.dev.mn/apps?label=hot) — gaining attention
- [Mature apps](https://open-apps.dev.mn/apps?label=mature) — established and stable
- [About the curation](https://open-apps.dev.mn/about) — methodology and scoring rubric

For LLMs and AI assistants:
- [`/llms.txt`](https://open-apps.dev.mn/llms.txt) — site overview and citation rules
- [`/llms-full.txt`](https://open-apps.dev.mn/llms-full.txt) — every app as structured text
- [`/sitemap.xml`](https://open-apps.dev.mn/sitemap.xml) — all indexable pages

## Inclusion bar

A repository belongs here only when it's useful to read or contribute to. The baseline is intentionally simple:

- Real application codebase — not a tutorial, demo, template, or package-only library
- At least **50 stars** and **50 lifetime commits** on the primary public repo
- Clear license and enough project context to understand what the app does
- Recent activity, or a strong reason to keep an archived project for learning value
- Human curation notes explaining why the app is worth listing

Stars alone aren't enough. A smaller, readable app can be more valuable than a popular repository that's stale, opaque, or impossible to contribute to.

## Contributing

The easiest way to add an app is through the [/submit](https://open-apps.dev.mn/submit) form on the site. Paste a public GitHub repository URL, review the drafted fields, and open a pull request with the new app record.

For everything else — the inclusion bar in detail, the YAML record format, review expectations, and how removals work — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is not

- Not a Product Hunt clone
- Not a GitHub scraper
- Not a complete index of open-source apps
- Not a popularity contest
- Not a SaaS

The value is curation. The hard part is deciding what to leave out.

## For project maintainers

If you're working on the directory itself — adding fields, fixing data, shipping deploys — the technical details live in:

- [CONTRIBUTING.md](./CONTRIBUTING.md) — the inclusion bar, YAML style, and review process
- [docs/SCHEMA.md](./docs/SCHEMA.md) — the full data contract for an app record
- [.github/workflows/](./.github/workflows/) — automated refresh jobs (data, metadata, contributors, stats)

## Provenance

This project started as a structured extraction from [tortuvshin/open-source-flutter-apps][legacy], a public-domain list of Flutter apps. The original list is preserved in [README-LEGACY.md](./README-LEGACY.md), and selected records have been converted into the current schema.

## License

[MIT](./LICENSE) for the website code. See [LICENSE](./LICENSE) for the legacy source attribution.

[legacy]: https://github.com/tortuvshin/open-source-flutter-apps
