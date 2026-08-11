# Changelog

All notable changes to Open Apps are documented here.

## [Unreleased]

### Grove rebuild context (PR #212)

The directory was rebuilt as a consumer-owned Astro application powered by
Grove packages (see #212). The lines below record the rebuild so the
canary work in the next subsection can be read in context.

- Migrated 150 app records into the Grove schema under `data/records/` while
  preserving project identity, taxonomy, repository metadata, curation, and
  original added dates.
- Replaced repository-owned generation scripts with Grove CLI and Astro
  integration commands.
- Kept Open Apps pages, copy, analytics, assets, and Cloudflare deployment
  configuration in this repository so the product remains fully customizable.

### Changed — 0.5.0-next.0 canary adoption

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
  AGPL-3.0 lists 12, etc. A `noassertion` family was added to the
  licenses taxonomy so the 14 records whose GitHub license is
  `NOASSERTION` are surfaced under "Unknown / undetected" rather than
  dropping out of the facet.
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

### Restored from the Grove rebuild

- Contributor data, repository statistics, the Tauri icon, legal
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

### Notes

- **Canary pin (intentional).** The `@grove-dev/*` dependencies in
  `package.json` are exact-pinned to `0.5.0-next.0` (not `^`). npm
  semver excludes pre-release versions from caret ranges by default,
  so a caret on a canary does not match. When the canary promotes to
  `latest` and ships as `0.5.0`, the follow-up bump is a deliberate
  single-line change. Do not "loosen" the pin in a drive-by edit —
  it is load-bearing for this branch.
- The 92-record stale cut from the 0.5.0-next.0 branch is documented
  in `docs/stale-exclusion-2026-08-11.md` for future sweeps to
  reference.

### Audit follow-up (2026-08-11)

Address every P0 trust-breaking issue and the higher-impact Phase 2-4
findings from the product / UX / SEO audit. Companion work landed in
the `grove` monorepo on the `audit/phase-1-trust-fixes` branch; this
branch (`feat/canary-v0.5-next.0`) consumes those canary changes.

**Phase 1 — Trust fixes:**
- `licenseDisplay(spdxId)` normalizes `NOASSERTION` / `NONE` /
  `OTHER` / `UNLICENSED` to "License not detected" / "Other" in
  every license render path (detail sidebar, browse cards,
  JSON-LD). 15 NOASSERTION records now show readable copy.
- Bot accounts filtered from the contributors sync + page; the
  page header reads "83 human contributors" instead of "85
  community contributors" (was including
  `github-actions[bot]` and `dependabot[bot]`).
- CHANGELOG and `public/og-image.svg` corrected from 149 to
  150; counts now match across every UI surface.
- Each curated collection has an auditable inclusion rule
  printed on the page (`selectionNote` with `Stack`, `Stars`,
  `Exclude`, `License` clauses). New `minStars` / `minForks`
  fields on `CollectionQuery`; the four collections now
  declare 80 / 95 / 80 / 53 records respectively, with real
  thresholds (was 80 / 80 / 80 / 80 before).
- 8 broken Markdown descriptions rewritten with complete
  sentences; `extractDescription` regex hardened so future
  imports do not re-introduce malformed links.
- 45 truncated descriptions (under 40 chars) expanded to
  complete sentences.
- Submit form gates the `Open PR draft` link behind validation:
  category / stack / platforms must come from the taxonomy,
  description must be >= 40 chars, slug must be unique.

**Phase 2 — Detail-page value:**
- New `summary` (Open Apps-written) and `sourceDescription`
  (original GitHub) fields on records; the detail page lead
  paragraph now renders `summary` and the secondary "From the
  project's README" block renders `sourceDescription`.
  Populated on the five flagship records that already had a
  content body.
- Detail pages now show "Also in: ..." with links to every
  curated collection the record belongs to (via
  `findCollectionsFor`).
- Five flagship records marked as curator-reviewed
  (`curation.reviewed: true`, `reviewedBy: "Open Apps curators"`,
  `reviewedAt: "2026-08-11"`).
- New `screenshots[]` field on records + gallery renderer in
  `RecordHeader` (no screenshots added yet — curators populate
  in follow-ups).

**Phase 3 — Discovery architecture:**
- Tag dropdown filtered against a curated
  `data/taxonomy/topics.yml` (36 stable ids). Records still
  carry arbitrary tags on disk; only curated ids contribute to
  the browse dropdown counts. 81 raw unique tags reduced to a
  scannable subset.
- Intersection counts: after selecting Flutter, the Platform
  facet shows Flutter+Platform counts, not the global count.
  `buildFacets(items, { filters })` re-runs each facet's count
  against records that satisfy every OTHER filter.
- Browse page HTML drops from 1.19 MB to 358 KB (-70%) by
  server-paginating the SSR markup (`paginate(sorted, page,
  PAGE_SIZE)` in `getDirectoryIndexModel`).
- Tag chip link on detail pages switches from `?q=` to `?tag=`
  for consistency with the Tag facet.
- Collection pages emit an `ItemList` JSON-LD block listing
  each entry as a `ListItem` whose `item` is a
  `SoftwareApplication`. Capped at 50 per page.
- Browse filter URLs (anything beyond `?page=` and `?sort=`)
  are tagged with `noindex,follow` via a small client-side
  script. Bare `/apps/` and pagination states stay indexable.

**Phase 4 — Visual simplification:**
- Homepage drops one of the three near-identical 6-card lens
  sections (Established) and trims the other two to 3 cards.
  The full contributors grid moves from the homepage to its
  dedicated page; the homepage now shows a single one-line
  link to `/contributors`.
- Header nav adds Collections and Community entries between
  Browse and About.

### Still deferred (after audit follow-up)

- Per-record and per-collection OG images (the audit's D4
  recommendation) — requires a new build-time image
  generator. Documented as the next PR.

## [0.1.0] — 2024

Initial extraction of the Open Source Flutter Apps collection into a
structured Astro directory.
