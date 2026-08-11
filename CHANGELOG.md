# Changelog

All notable changes to Open Apps are documented here.

## [Unreleased]

### Changed

- Rebuilt the directory as a consumer-owned Astro application powered by
  Grove packages.
- Migrated 149 app records into the Grove schema under `data/records/` while
  preserving project identity, taxonomy, repository metadata, curation, and
  original added dates.
- Replaced repository-owned generation scripts with Grove CLI and Astro
  integration commands.
- Kept Open Apps pages, copy, analytics, assets, and Cloudflare deployment
  configuration in this repository so the product remains fully customizable.
- Adopted the Grove `0.5.0-next.0` canary (`@grove-dev/astro`, `cli`, and
  `core`) and rewrote the record detail page on the canary components
  (`RecordHeader`, `EditorialSummary`, `TableOfContents`, `MarkdownBody`,
  `RecordSidebar`). The detail page dropped from 527 lines to 87.
- Added the optional Grove config blocks that ship in `0.5.0`: an `audit`
  page manifest (so `pnpm exec grove audit` has something to hit against
  `127.0.0.1:4321`), a `readme` preamble (so `pnpm exec grove readme
  generate` can fill in the awesome-list section between
  `<!-- grove-readme:start/end -->` markers), and the `licenses` taxonomy
  (`data/taxonomy/licenses.yml`) wired into the `facets` list.
- Added `src/pages/licenses/[name].astro` and `src/pages/empty.astro`,
  plus a shared `src/components/TaxonomyList.astro` body used by all three
  taxonomy pages.
- Enriched 126 records with a top-level `licenses: [<spdx_id>]` field
  sourced from `github.repository.license.spdx_id`. The `licenses`
  facet is now exercised end-to-end: the MIT page lists 48 records,
  AGPL-3.0 lists 12, etc.
- Added long-form `MarkdownBody` prose for five flagship records
  (immich, appflowy, joplin, cap, bluewallet) plus the `content:`
  field on each. Each body follows the same four-section structure
  (Why it matters / How it works / Caveats / Deployment notes) so
  the rendered `TableOfContents` and sidebar reading-metrics are
  consistent across records.
- Added the matching `categories/[name].astro` and `stacks/[name].astro`
  taxonomy pages, retargeted to the `apps` vocabulary and reusing the
  shared `TaxonomyList` body.
- Moved the about page prose to `content/pages/about.md` and wired
  the canary `getPageContentHtml("about")` resolver in `about.astro`.
  The hand-written breadcrumb, header, and CTA button row stay; only
  the four prose cards move into markdown.
- First real use of `pnpm exec grove readme generate` against this
  repository. The script injected an awesome-list section (150 records,
  16 categories) between the `<!-- grove-readme:start/end -->` markers
  without touching the hand-written intro or the Security / License
  tail. README grew from 220 to 448 lines.

### Fixed

- Recently added is now a sort across all records instead of a label filter.
- Trending, Established, Production-like, and Good to learn use explicit
  curation signals and no longer collapse the result list unexpectedly.
- Category, primary stack, platforms, and free-form tags remain separate
  discovery dimensions.
- Restored contributor data, repository statistics, the Tauri icon, legal
  documents, security reporting, and legacy collection provenance.

### Deferred

- The 24 records without a synced `github.repository.license` cannot be
  enriched automatically; their `licenses: []` field requires curator
  input (the license is on the README, not on the GitHub API).
- Only 5 of 150 records have a `content: ./content/records/<slug>.md`
  body. The MarkdownBody pipeline is wired and exercised; expanding the
  coverage is content work, not framework work.
- `pnpm exec grove audit` has its `grove.config.ts` manifest in place
  but has not been run against a live build yet — the manifest exists
  as a fixture that the next Lighthouse CI run will validate.

## [0.1.0] — 2024

Initial extraction of the Open Source Flutter Apps collection into a
structured Astro directory.
