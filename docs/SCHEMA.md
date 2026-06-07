# App Schema

The catalog is optimized for 1k+ app records, daily GitHub sync, cleanup
automation, and a web-based submit flow. The source of truth is still one file
per app:

```text
data/apps/<slug>.yml
```

Generated JSON is derived at build time and is not committed.

## Ownership

Each block has a clear owner:

| Block | Owner | Notes |
|-------|-------|-------|
| `source` | submit flow / curator | Canonical repo identity. |
| `app` | contributor / curator | Human-facing app metadata. |
| `stack` | contributor / curator, taxonomy-backed | Technical classification. |
| `github` | GitHub Actions | GitHub-shaped API metadata. Preserve GitHub field names. |
| `health` | build / cleanup automation | Computed listing status. Do not hand-edit. |
| `curation` | curator / AI-assisted draft | Review notes and learning value. |

GitHub API fields are stored under `github` with their original names
(`full_name`, `html_url`, `stargazers_count`, `pushed_at`, etc.). The site
normalizes them only when generating `data/generated/*.json`.

## Required Shape

```yaml
schemaVersion: 1

id: github:immich-app/immich
slug: immich

source:
  provider: github
  owner: immich-app
  repo: immich
  url: https://github.com/immich-app/immich

app:
  name: Immich
  description: Self-hosted photo and video backup solution.
  category: media
  projectType: production
  platforms:
    - ios
    - android
    - web
  tags:
    - self-hosted
    - backup
    - photos

stack:
  primary: flutter
  families:
    - cross-platform
    - backend
  technologies:
    - id: flutter
      role: mobile-framework
    - id: dart
      role: language
    - id: nodejs
      role: backend-runtime
    - id: typescript
      role: backend-language
    - id: postgresql
      role: database

github:
  repository:
    full_name: immich-app/immich
    html_url: https://github.com/immich-app/immich
    homepage: https://immich.app
    description: High performance self-hosted photo and video management solution.
    fork: false
    archived: false
    disabled: false
    private: false
    visibility: public
    default_branch: main
    language: TypeScript
    topics:
      - photos
      - backup
      - self-hosted
    license:
      key: agpl-3.0
      name: GNU Affero General Public License v3.0
      spdx_id: AGPL-3.0
    stargazers_count: 102744
    watchers_count: 102744
    forks_count: 5799
    open_issues_count: 500
    subscribers_count: 1200
    size: 123456
    created_at: 2022-02-03T00:00:00Z
    updated_at: 2026-06-07T00:00:00Z
    pushed_at: 2026-06-06T00:00:00Z
  languages:
    TypeScript: 1234567
    Dart: 456789
  latestRelease:
    tag_name: v1.120.0
    name: v1.120.0
    draft: false
    prerelease: false
    published_at: 2026-06-01T00:00:00Z
    html_url: https://github.com/immich-app/immich/releases/tag/v1.120.0
  activity:
    monthlyCommits:
      - month: 2026-01
        commits: 180
      - month: 2026-02
        commits: 220
      - month: 2026-03
        commits: 190
      - month: 2026-04
        commits: 230
      - month: 2026-05
        commits: 200
      - month: 2026-06
        commits: 210
    totalCommitsKnown: 12000
    contributorsKnown: 500
    openPullRequests: 40
  files:
    readme: true
    contributing: true
    codeOfConduct: true
    security: true
    issueTemplates: true
    pullRequestTemplate: true
  labels:
    - name: good first issue
      open_issues_count: 12
    - name: help wanted
      open_issues_count: 30
  sync:
    syncedAt: 2026-06-07T00:00:00Z
    apiVersion: rest-v3
    source: github-actions

health:
  status: active
  tier: curated
  visibility: listed
  cleanupCandidate: false
  staleReason: null

curation:
  reviewed: false
  reviewedBy: null
  reviewedAt: null
  bestFor:
    - Studying production-scale mobile architecture.
  caveats:
    - Large multi-service codebase.
```

## Taxonomy

Form inputs and validation should use registry IDs, not free text:

```text
data/taxonomy/stacks.yml
data/taxonomy/platforms.yml
data/taxonomy/categories.yml
```

Important distinction:

- `app.platforms` means where the app runs: `ios`, `android`, `web`.
- `stack.primary` means the discovery family: `flutter`, `react-native`,
  `ios`, `android`, `capacitor`.
- `stack.technologies` means actual technology inside the repo.

## Generated Data

Build output is split by use case:

```text
data/generated/apps.full.json   # complete normalized records
data/generated/apps.index.json  # lightweight list/search records
data/generated/apps.json        # compatibility alias for current site code
```

The browser should use index-shaped data for list pages and full data only on
detail pages.

## Submit Flow

The web submit page should:

1. Accept a GitHub repository URL.
2. Fetch GitHub repository metadata.
3. Store that metadata under `github.repository` using GitHub field names.
4. Infer `app`, `stack`, and `platforms` as editable form fields.
5. Generate `data/apps/<slug>.yml`.
6. Open a PR after validation.

Contributor-facing forms should not require users to know YAML field names.

## Cleanup Policy

Cleanup should change `health.visibility` or open a PR; it should not
immediately delete records.

Suggested policy:

| Tier | Rule |
|------|------|
| `curated` | `stargazers_count >= 500` or activity in at least 4 of last 6 months. |
| `listed` | Public, non-archived, at least 50 stars. |
| `experimental` | Lower-confidence but still useful. |
| `hidden` | Archived, unavailable, or stale beyond policy. |

Deletion is reserved for spam, malware, duplicates, or non-app repositories.
