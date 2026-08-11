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

### Fixed

- Recently added is now a sort across all records instead of a label filter.
- Trending, Established, Production-like, and Good to learn use explicit
  curation signals and no longer collapse the result list unexpectedly.
- Category, primary stack, platforms, and free-form tags remain separate
  discovery dimensions.
- Restored contributor data, repository statistics, the Tauri icon, legal
  documents, security reporting, and legacy collection provenance.

### Deferred

- The long-form `MarkdownBody` slot is wired but every record still falls
  back to the placeholder copy, because no record carries a `content:`
  field yet. Populating `content/records/<slug>.md` for a curated subset
  of records is a follow-up.
- Per-record `licenses: []` enrichment: `filterRecords` is already
  license-aware, but the record YAMLs do not declare their SPDX id yet.
  Wiring `github.repository.license.spdx_id` into a top-level `licenses:`
  array on each record (or running `grove import` on the source awesome
  list to refresh metadata) is a follow-up.

## [0.1.0] — 2024

Initial extraction of the Open Source Flutter Apps collection into a
structured Astro directory.
