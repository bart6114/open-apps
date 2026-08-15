# Grove 0.5.0 Upgrade Status

## Current State

open-apps has been upgraded to Grove `0.5.0-next.2` with all data/configuration fixes applied and documentation updated. This document tracks what's complete, what's deferred, and what patterns are ready to adopt.

## Completed ✅

### 1. Core Version Upgrade
- **Version**: `0.5.0-next.2` (note: `0.5.0` on npm is incomplete)
- **Status**: ✅ Installed and verified
- **Build**: ✅ Passes `pnpm build` and `grove check`
- **Package Resolution**: Using npm registry (not local symlinks)

### 2. Configuration Alignment
- **Facets**: Top-level `facets` key (working with current version)
- **Blueprint**: `project-directory` confirmed
- **Routes**: `directory: "apps", item: "app"` configured
- **Theme**: `primaryColor: "#1f6feb"` set (WCAG-safe derivation available in newer versions)

### 3. Record Enrichment
- **sourceDescription backfill**: ✅ Complete (31 records)
- **Script created**: `scripts/backfill-source-description.mjs` (reusable)
- **Schema support**: `summary`, `sourceDescription`, `screenshots` all optional and backward-compatible
- **Rendering**: Detail pages auto-fallback when fields unset

### 4. Documentation
- **docs/SCHEMA.md**: ✅ Created with full field reference, ownership table, taxonomy guide, and example record
- **README link**: ✅ Now resolves to the new schema documentation

### 5. Page Updates
- **Contributors page**: Fixed to work with current Grove version
- **All pages**: ✅ Build without errors or type warnings

## Deferred - Ready to Adopt (Waiting for Complete npm Release)

These features are fully implemented in the sibling `grove` repo (main branch) and documented in `apps/example/` but are not yet in any published npm package:

### New UI Components
Available in Grove main branch (`packages/astro/src/ui/`):
- ✅ `SearchField.astro` — semantic search input with glass icon
- ✅ `PageHeader.astro` — page title/eyebrow/description block
- ✅ `EmptyState.astro` — consistent "nothing here" rendering with `data-grove-empty-state` marker
- ✅ `Button.astro` — (plus `buttonClass()` utility for inline styling)
- ✅ `Badge.astro` — status/category badges
- ✅ `FilterDrawer.astro` — mobile bottom-sheet filter UI

### Enhanced Data Model API
Available in Grove main branch (`packages/astro/src/server/models.ts`):
- ✅ `facetGroups` — ordered, pre-filtered facet configuration (replaces the old `facets` object)
- ✅ `searchPlaceholder` — dynamic placeholder naming only enabled facet dimensions

### Configuration Schema
Available in Grove main branch (`packages/core/src/schema.ts`):
- ✅ `browse: { facets: [...] }` — new facets location (replaces top-level `facets`)
- ✅ `theme.primaryColor` — hex color for WCAG-safe palette derivation
- ✅ `contributors.showContributionCount` — toggle for contributor count display
- ✅ Deeper theme customization options

## How to Adopt When Ready

### When Grove publishes a complete `0.5.0.1` or `0.5.1`:

1. **Update package.json**:
   ```json
   "@grove-dev/astro": "^0.5.1",
   "@grove-dev/cli": "^0.5.1",
   "@grove-dev/core": "^0.5.1"
   ```

2. **Migrate config** (in `grove.config.ts`):
   ```ts
   // Before (current)
   facets: ["category", "stack", "platform", "license", "tags"],
   
   // After
   browse: {
     facets: ["category", "stack", "platform", "license", "tags"],
   },
   ```

3. **Adopt components in pages** — reference Grove example app patterns:

   **404.astro** (after update):
   ```astro
   import { buttonClass } from "@grove-dev/astro/ui/button";
   import SearchField from "@grove-dev/astro/ui/SearchField.astro";
   
   <SearchField label="Search" placeholder={`Search ${slug}...`} />
   <button class={buttonClass("primary", "bare")}>Search</button>
   ```

   **about.astro** (after update):
   ```astro
   import PageHeader from "@grove-dev/astro/ui/PageHeader.astro";
   
   <PageHeader
     eyebrow="About"
     title="A directory that lives in files."
     description={...}
   />
   ```

   **empty.astro** (after update):
   ```astro
   import EmptyState from "@grove-dev/astro/ui/EmptyState.astro";
   
   <EmptyState
     title="Nothing to show right now"
     description="..."
     action={{ label: "Browse", href: "/apps", variant: "primary" }}
   />
   ```

   **[slug]/index.astro** (after update):
   ```astro
   const { facetGroups, searchPlaceholder, ... } = getDirectoryIndexModel(...);
   
   <SearchField
     label={`Search ${itemLabelPlural()}`}
     placeholder={searchPlaceholder}
   />
   <RefinePanel groups={facetGroups} {...} />
   ```

## Reference: Grove Example Patterns

The sibling `grove/apps/example/` is the reference implementation showing all new patterns:

- **pages/404.astro** — search + buttons pattern
- **pages/about.astro** — PageHeader + prose layout
- **pages/empty.astro** — EmptyState component usage
- **pages/[slug]/index.astro** — full browse page with all new components
- **src/components/TaxonomyList.astro** — custom local component pattern

Use these as templates when adopting components post-upgrade.

## Verification Checklist

- [x] Current version builds: `pnpm build`
- [x] Schema validation passes: `pnpm exec grove check`
- [x] Type checking clean: `astro check` (no errors)
- [x] 81 records valid
- [x] sourceDescription backfill script works
- [x] docs/SCHEMA.md created and linked
- [ ] Awaiting complete Grove npm release for Phase 2 components

## Timeline

- **2026-08-16**: Upgrade to `0.5.0-next.2`, complete Phase 1 fixes, Phase 3 record enrichment, Phase 4 docs
- **TBD**: Grove publishes complete `0.5.0.1` or `0.5.1` → adopt Phase 2 components
- **TBD**: Curators hand-author `summary` fields for 5-10 featured records (content work)

## Notes for Next Pass

- Manual `summary` curation is deferred (editorial content work, not technical)
- `screenshots` field is schema-ready but storage/capture mechanism doesn't exist yet
- The local Grove repo symlink approach from the original setup could be revived if needed for early access to unreleased features
- Current version is stable and production-ready; no rush to adopt new components until they're published properly

---

**Updated**: 2026-08-16  
**Grove Versions**: Using `0.5.0-next.2` (latest stable published)  
**Tracking**: Waiting for complete `0.5.0.x` release on npm
