# Open Apps Record Schema

This document is the canonical reference for the structure and ownership of records in the Open Apps directory (`data/records/*.yml`).

## Overview

Each app in the directory is represented as a single YAML file in `data/records/`. Fields are grouped by **ownership**:

- **Human-curated** fields are edited directly by contributors and curators in pull requests
- **Automation-owned** fields are written by GitHub Actions (sync workflows) and should never be hand-edited

See the **Ownership** section below for the complete field-by-field breakdown.

## Field Reference

All fields are **optional** unless otherwise noted.

### App Identity
| Field | Type | Ownership | Description |
|-------|------|-----------|-------------|
| `kind` | enum: `project` | human | Kind of record (Open Apps uses `project` for the project-directory blueprint). |
| `name` | string | human | Display name of the app. |
| `slug` | string | human | URL-safe identifier; must match the filename (without `.yml`). |
| `description` | string | human | One-sentence curator-written summary of what the app does. |
| `summary` | string | human | **NEW (0.5.0):** Editorial lead paragraph. When set, rendered as the first paragraph on the detail page; otherwise falls back to `description`. Allows curators to write a more expressive introduction distinct from the brief one-liner. |
| `sourceDescription` | string | human | **NEW (0.5.0):** Preserved original description, typically from the project's README or GitHub repository description. When present and distinct from `summary`, rendered as a secondary "From the project's README:" paragraph on the detail page. Mechanically backfilled from `github.repository.description` where available. |
| `category` | string | human | Single category ID (e.g., `tools`, `productivity`). Must exist in `data/taxonomy/categories.yml`. |
| `tags` | array of strings | human | Free-form tags/keywords (e.g., `["cross-platform", "offline-first"]`). Tag IDs should be curated against `data/taxonomy/topics.yml` to avoid spam. |
| `projectType` | string | human | Maturity indicator; typically `real-app` or `experiment`. |
| `difficulty` | string | human | Optional; how challenging the codebase is to learn from. |
| `codebaseSize` | string | human | Optional; e.g., `small`, `medium`, `large`. |
| `repoUrl` | string | human | GitHub repository URL (e.g., `https://github.com/immich-app/immich`). Required for GitHub metadata sync. |

### Technology & Distribution
| Field | Type | Ownership | Description |
|-------|------|-----------|-------------|
| `stack` | string | human | Primary development stack/language (e.g., `flutter`, `react-native`, `swiftui`). |
| `platforms` | array of strings | human | Target platforms (e.g., `["ios", "android", "web", "macos", "windows", "linux"]`). Must exist in `data/taxonomy/platforms.yml`. |
| `licenses` | array of strings | human | SPDX license IDs (e.g., `["MIT", "Apache-2.0"]`). Optional; `github` sync can populate from GitHub. |
| `links` | object | human | Additional project links: `{ github, website, docs, source }` (all URLs). |
| `distribution.channels` | array of objects | human | Where users can download/install. Each entry: `{ type (channel ID from data/taxonomy/distribution-channels.yml, e.g. "play-store"), url (required store/download URL), platform?, label?, verified?, notes? }`. |
| `content` | string | human | Path to the record's long-form Markdown notes, e.g. `./content/records/<slug>.md`. The referenced file is rendered on the detail page and should ship in the same PR as the record. |
| `screenshots` | array of objects | human | **NEW (0.5.0):** Curated screenshots for the detail page. Each entry: `{ src (URL), alt (string), source? (URL), width? (number), height? (number) }`. Currently optional/deferred; schema-ready but not yet populated in the catalog. |

### Curation & Context
| Field | Type | Ownership | Description |
|-------|------|-----------|-------------|
| `bestFor` | array of strings | human | What this app is best for (free-form, e.g., `["photo backup", "privacy"]`). |
| `whyListed` | array of strings | human | Why it belongs in this directory (free-form, e.g., `["good codebase", "well-documented"]`). |
| `caveats` | array of strings | human | Known limitations or things to be aware of. |
| `curation.reviewed` | boolean | human | Has a curator reviewed this record? |
| `curation.reviewedAt` | string (date) | human | When the review happened (ISO 8601). |
| `curation.reviewedBy` | string | human | Who reviewed it. |
| `curation.notes` | string | human | Free-form curation notes (internal documentation). |
| `curation.labels` | array of strings | human | Curator-assigned labels: `["hot", "mature", "featured", ...]`. |
| `curation.lenses` | array of strings | human | Lens IDs this app is good for (e.g., `["good-to-learn"]`). |
| `visibility` | string | human | `keep` (default) or `hide` (soft-exclude, e.g., for archived projects to review later). |

### Repository & Metadata (Automation-Owned)
| Field | Type | Ownership | Description |
|-------|------|-----------|-------------|
| `source` | object | human | Source tracking (how the record was created): `{ type, provider, owner, repo, url }`. e.g., `{ type: "import", provider: "github", owner: "immich-app", repo: "immich", url: "https://..." }`. |
| `github.repository` | object | automation | **Do not hand-edit.** Full GitHub API response for the repository. Includes `description`, `stargazers_count`, `forks_count`, `language`, `license`, `pushed_at`, `archived`, `disabled`, etc. Synced daily by `sync-github` GitHub Action. |
| `github.languages` | object | automation | **Do not hand-edit.** Language breakdown from GitHub API (e.g., `{ Dart: 500000, Kotlin: 250000 }`). |
| `github.latestRelease` | object | automation | **Do not hand-edit.** Info about the latest GitHub release (if any). |
| `github.activity` | object | automation | **Do not hand-edit.** Monthly commit counts and other activity metrics. |
| `github.files` | object | automation | **Do not hand-edit.** File existence checks (e.g., `{ "README.md": true, "CONTRIBUTING.md": false }`). |
| `github.labels` | array | automation | **Do not hand-edit.** Topic/label tags from GitHub's topics API. |
| `github.sync` | object | automation | **Do not hand-edit.** Metadata about when the sync happened. |

### Health & Quality
| Field | Type | Ownership | Description |
|-------|------|-----------|-------------|
| `health.status` | string | automation | **Do not hand-edit.** Record-level health status (e.g., `active`, `stale`, `archived`, `orphaned`). Computed from `github.pushed_at` and configured thresholds. |
| `health.maturity` | string | automation | **Do not hand-edit.** Maturity indicator (e.g., `beta`, `production`). |
| `health.tier` | string | automation | **Do not hand-edit.** Tier/category (e.g., `featured`, `learning`, `experimental`). |
| `health.visibility` | string | automation | **Do not hand-edit.** Internal visibility decision (may soft-exclude from some views). |
| `health.cleanupCandidate` | boolean | automation | **Do not hand-edit.** Flagged for potential removal (e.g., if archived/unmaintained). |
| `health.staleReason` | string | automation | **Do not hand-edit.** Why it's considered stale (if applicable). |
| `health.confidence` | number | automation | **Do not hand-edit.** Confidence score (0–1) of the health assessment. |
| `health.reasons` | array | automation | **Do not hand-edit.** Detailed reasons for the health assessment. |
| `scores` | object | human | Optional; curator-assigned quality/learning scores. |

## Ownership Table

### Human-Curated Sections
Edit these fields directly in pull requests:

- **app**: `kind`, `name`, `slug`, `description`, `summary`, `sourceDescription`, `category`, `tags`, `projectType`, `difficulty`, `codebaseSize`, `repoUrl`
- **stack**: `stack`, `platforms`, `licenses`, `links`, `distribution.channels`, `screenshots`
- **curation**: `bestFor`, `whyListed`, `caveats`, `reviewed`, `reviewedAt`, `reviewedBy`, `notes`, `labels`, `lenses`, `visibility`, `scores`
- **source**: Tracking metadata (populated at creation; rarely changed)

### Automation-Owned Sections
**Never hand-edit these** — they're overwritten by GitHub Actions:

- **github**: All sub-fields (`repository`, `languages`, `latestRelease`, `activity`, `files`, `labels`, `sync`)
- **health**: All sub-fields (`status`, `maturity`, `tier`, `visibility`, `cleanupCandidate`, `staleReason`, `confidence`, `reasons`)

## Taxonomy Reference

Tags, platforms, categories, and licenses in records must exist in the corresponding taxonomy files.

### Categories
Defined in `data/taxonomy/categories.yml`:
- `productivity`, `finance`, `education`, `tools`, `developer-tools`, `communication`, `health-and-fitness`, `business`, `games`, `media`, `entertainment`, `social-network`, `shopping`, `news-and-magazine`

### Stacks
Defined in `data/taxonomy/stacks.yml`:
- `flutter`, `react-native`, `ios`, `android`, `capacitor`, `kmp`, `tauri`, `swiftui`, `jetpack-compose`, and others

### Platforms
Defined in `data/taxonomy/platforms.yml`:
- `ios`, `android`, `web`, `macos`, `windows`, `linux`, `tvos`, `watchos`, and others

### Licenses
Defined in `data/taxonomy/licenses.yml`:
- `mit`, `apache-2.0`, `bsd-3-clause`, `gpl-3.0`, `gpl-2.0`, `lgpl-2.1`, `lgpl-3.0`, `mpl-2.0`, `isc`, `unlicense`, and others

### Topics (Tags)
Defined in `data/taxonomy/topics.yml`:
- Curated, free-form tag vocabulary to guide consistent tagging across records

## Example Record

Here's a fully annotated real example (`immich.yml`), showing both curator-written and synced fields:

```yaml
# =============================================================================
# HUMAN-CURATED SECTIONS
# =============================================================================

kind: project
name: Immich
slug: immich
description: Self-hosted photo and video backup solution directly from your mobile phone

# New in Grove 0.5.0: curator-written lead paragraph for the detail page
summary: A feature-rich, self-hosted photo and video management platform built with Flutter and NestJS, supporting full end-to-end encrypted backups from iOS and Android.

# New in Grove 0.5.0: GitHub-sourced description (backfilled from github.repository.description)
sourceDescription: High performance self-hosted photo and video management solution.

category: tools
tags:
  - cross-platform
  - privacy-first
  - self-hosted
stack: flutter
platforms:
  - android
  - ios
projectType: real-app
repoUrl: https://github.com/immich-app/immich

links:
  github: https://github.com/immich-app/immich
  website: https://immich.app

distribution:
  channels:
    - type: play-store
      platform: android
      label: Play Store
      url: https://play.google.com/store/apps/details?id=app.alextran.immich
      verified: false

bestFor:
  - Personal photo/video backup
  - Privacy-conscious users

whyListed:
  - Well-architected, production-ready app
  - Excellent documentation
  - Active development and community

caveats: []

source:
  type: import
  provider: github
  owner: immich-app
  repo: immich
  url: https://github.com/immich-app/immich

curation:
  reviewed: true
  reviewedAt: 2026-08-11
  reviewedBy: Open Apps curators
  labels:
    - mature
    - hot
  lenses: []

visibility: keep

# =============================================================================
# AUTOMATION-OWNED SECTIONS (synced by GitHub Actions, do not edit)
# =============================================================================

github:
  repository:
    id: 455229168
    name: immich
    full_name: immich-app/immich
    description: High performance self-hosted photo and video management solution.
    stargazers_count: 48000
    forks_count: 2400
    language: Dart
    license:
      spdx_id: AGPL-3.0-or-later
    pushed_at: 2026-08-16T10:30:00Z
    archived: false
    disabled: false
    # ... (more GitHub API fields omitted for brevity)
  
  languages:
    Dart: 500000
    Kotlin: 250000
    TypeScript: 200000
  
  # Additional synced fields (latestRelease, activity, files, labels, sync)
  # omitted for brevity. These are populated by automation.

health:
  status: active
  maturity: production
  tier: featured
  confidence: 0.95
  reasons:
    - Regular releases
    - Active community
    - Well-documented
  # ... (other health fields omitted)
```

## Contributing Records

When submitting a new app or updating an existing one:

1. **Use the web form** at `/submit` to generate a draft YAML record from a GitHub URL
2. **Review and refine**: adjust `description`, `bestFor`, `whyListed`, `caveats`, and `tags` as needed
3. **Respect ownership**: only edit human-curated fields (see **Ownership Table** above)
4. **Add evidence**: link issues or examples in `curation.notes` that justify inclusion
5. **Open a pull request**: CI will validate schema, GitHub sync will populate automation fields

For detailed submission guidelines, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Synchronization

### GitHub Metadata Sync
The `sync-github` GitHub Action runs daily and:
- Fetches current `repository`, `languages`, `latestRelease`, and `activity` data from the GitHub API
- Overwrites `github.*` fields in all records
- Opens a pull request with changes for curator review

**Do not hand-edit `github.*` fields** — they'll be overwritten on the next sync run.

### Incremental Backfills
Certain fields (like `sourceDescription`) are backfilled mechanically from synced data:
- The `scripts/backfill-source-description.mjs` script copies `github.repository.description` to `sourceDescription` where unset
- Safe to re-run any time; skips records already populated

### Health & Cleanup
A separate workflow flags stale, archived, and orphaned projects for curator review. See `docs/stale-exclusion-2026-08-11.md` for the last sweep's notes.

## Schema Version & Changelog

Grove 0.5.0 added:
- `summary` (editorial lead paragraph)
- `sourceDescription` (GitHub README text)
- `screenshots` (gallery; schema-ready, currently deferred)

These fields are all **optional** and **backward-compatible** — records without them render correctly with fallbacks to existing fields.

Earlier versions of this catalog used different structures; see [CHANGELOG.md](../CHANGELOG.md) and the release notes for migration details if updating from older schemas.

---

**Last updated**: 2026-08-16 (Grove 0.5.0)  
**File structure**: `data/records/*.yml`  
**Validation**: `grove check` / `pnpm exec grove check`  
**For questions**: See [CONTRIBUTING.md](../CONTRIBUTING.md) or [README.md](../README.md)
