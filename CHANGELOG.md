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

### Fixed

- Recently added is now a sort across all records instead of a label filter.
- Trending, Established, Production-like, and Good to learn use explicit
  curation signals and no longer collapse the result list unexpectedly.
- Category, primary stack, platforms, and free-form tags remain separate
  discovery dimensions.
- Restored contributor data, repository statistics, the Tauri icon, legal
  documents, security reporting, and legacy collection provenance.

## [0.1.0] — 2024

Initial extraction of the Open Source Flutter Apps collection into a
structured Astro directory.
