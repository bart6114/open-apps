# `data/`

The files in this directory are produced and consumed by the Grove
framework. Do not hand-edit any of the following — the next sync
will clobber the changes:

- `health.yml` — auto-generated per-record health snapshot
  (`status`, `tier`, `cleanupCandidate`, `confidence`, `reasons`)
  produced by `pnpm exec grove sync` from the GitHub API metadata
  in each `data/records/<slug>.yml`. ~10k lines, churns on every
  sync; PRs that touch it for reasons other than the `sync`
  commit are almost always wrong.
- `generated/contributors.json` — auto-generated list of human
  contributors to this repository (bots filtered out at the
  framework level). Produced by the `sync-contributors` workflow.

Files you CAN hand-edit:

- `data/records/<slug>.yml` — one file per record. Schema lives
  in the framework; `pnpm exec grove validate` enforces it.
- `data/collections/<slug>.yml` — one file per curated list.
  Each must include an auditable `selectionNote`.
- `data/taxonomy/{categories,stacks,topics,licenses}.yml` —
  curated vocabulary. The `licenses` taxonomy uses SPDX ids
  plus a `noassertion` family for the GitHub `NOASSERTION`
  placeholder; the `topics` taxonomy has a `open-source` /
  `foss-alternative` split documented in-file.
