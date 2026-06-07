# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once
we tag a 1.0.0 release.

## [Unreleased]

### Added
- Astro + Tailwind static site for browsing curated open-source apps,
  including home, apps index, app detail, about, and submit pages.
- YAML-first app catalog in `data/apps/`, taxonomy files in `data/taxonomy/`,
  and schema documentation in `docs/SCHEMA.md`.
- Build and validation pipeline for app data:
  `scripts/app-schema.mjs`, `scripts/validate-apps.mjs`,
  `scripts/build-apps-json.mjs`, and generated JSON outputs.
- GitHub metadata tooling and automation:
  `scripts/refresh-apps-activity.mjs`,
  `scripts/sync-github-metadata.mjs`, cleanup reporting, and scheduled
  GitHub Actions workflows.
- Search, filtering, sorting, pagination, density controls, smart lenses,
  scoring helpers, and contributor/category/stack summary sections.
- Platform and stack icon system with fetched SVG assets and theme-aware
  rendering.
- App distribution channel schema and UI for download/source links.
- Open-source readiness pass: MIT `LICENSE`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/`, and
  `.github/pull_request_template.md`.
- Initial unit tests for `scripts/build-apps-json.mjs` and
  `scripts/parse-legacy-readme.mjs`.
- `engines` field in `package.json` pinning Node >= 20.

### Changed
- Reworked the repository from a legacy Flutter app list into a structured,
  self-refreshing directory of real open-source application codebases.
- Replaced one-page README content with project overview, schema guidance,
  data freshness model, local development instructions, and contribution flow.
- Preserved the original collection as `README-LEGACY.md` while moving
  curated records into individual YAML files.
- Updated GitHub repository links to point at `tortuvshin/open-apps`.
- Reworked contributor display to highlight top contributors separately from
  the broader contributor grid.
- Updated `CONTRIBUTING.md` for app submission, app updates, data validation,
  and review expectations.
- Updated `.gitignore` to exclude local IDE files, generated data, and
  temporary assets.

### Removed
- `art/new flutter jobs.gif` (a 7.5 MB demo asset, not used by the site)
- `.idea/` (IntelliJ project files)
- `main.dart` (a 42-byte Flutter "hello world" stub, not part of this
  project)
- One-off dev scripts under `scripts/_*.mjs` that were used to fetch
  legacy data and are no longer needed for the current data pipeline

## [0.1.0] — 2024

Initial extraction from `tortuvshin/open-source-flutter-apps`. The legacy
`README-LEGACY.md` (CC0 1.0) is preserved verbatim as the seed for
`data/apps/`. The directory is rendered as a static Astro site; activity
metadata is refreshed daily by `.github/workflows/update-apps.yml`.

[Unreleased]: https://github.com/tortuvshin/open-apps/compare/main...HEAD
[0.1.0]: https://github.com/tortuvshin/open-apps/releases/tag/v0.1.0
