# Contributing to Open Source Apps

Thanks for helping build a directory of real, useful open-source applications.
This guide covers how to add, fix, or curate entries.

The goal: a structured directory whose data stays fresh by itself. Every app
gets a YAML file under `data/apps/`, the build pipeline validates and
normalizes it, and the Astro site renders generated JSON. GitHub-shaped
metadata lives under `github:` and is refreshed by GitHub Actions.

## The bar for inclusion

A repo is included only if it **passes both**:

- **stars ≥ 50** on its primary public repo
- **totalCommits ≥ 50** in the lifetime of the project

Apps failing either signal are excluded from the directory. Archived, demo,
template, and tutorial repos are excluded by the curation tier but the bar
applies uniformly — popularity is not a substitute for substance, and a
small, clean codebase is more useful than a popular one that no one can read.

The build script (`scripts/build-apps-json.mjs`) computes health and listing
tier from GitHub signals. Cleanup automation reports stale apps first; hiding
or deleting records should happen through reviewable PRs.

## Adding a new app

1. Open `/submit` locally or on the deployed site.
2. Paste a public GitHub repository URL.
3. Review the drafted name, description, category, platforms, stack, tags,
   and curation notes.
4. Open a PR with the generated `data/apps/<slug>.yml`.
5. CI runs `npm run validate:data` and `npm run build:data`.

Advanced contributors may still write YAML by hand. Use
[`docs/SCHEMA.md`](./docs/SCHEMA.md) as the contract and prefer
`schemaVersion: 1`.

## Updating an existing app

- Edit human-owned blocks directly: `app`, `stack`, and `curation`.
- Avoid hand-editing `github` and `health`; automation owns those blocks.
- If you're adding a new curation field (e.g. `whyListed`) for an app
  that has none, prefer copy-pasting from a similar app as a template.
- If the app moved (repo URL changed), update `repoUrl` only after
  confirming the new repo is the canonical one.

## Removing an app

- If the app's repo was deleted, marked as malware, or no longer fits
  the bar, cleanup automation should mark it as a candidate first.
- If you want to force a removal (e.g. copyright issue, take-down
  request), open an issue first describing the reason, then a PR that
  deletes the yml.

## Reporting issues

- **Bug or data error**: open an issue with the slug and what's wrong.
- **App submission**: open a PR with the new yml file.
- **Security or DMCA**: see `SECURITY.md` — do not open a public issue.

## Style

- One app per pull request. Group updates (e.g. fixing typos across many
  yml files) into a single PR.
- Don't edit `github` or `health` by hand unless the PR is explicitly fixing
  automation output.
- Match the formatting of nearby yml files (2-space indent, sorted keys
  where it makes sense).
- Don't mention the framework in the description — it's implied by
  `stack`.
- End descriptions with a full stop.
- No trailing whitespace.

## Local development

```sh
npm install
npm run build:data   # yml → json, drops stale entries
npm run build        # full Astro build
npm run dev          # local dev server
npm run check        # astro type / lint check
```

## Tests

```sh
node --test scripts/*.test.mjs
```

See `scripts/build-apps-json.test.mjs` and
`scripts/parse-legacy-readme.test.mjs` for examples.

## Code of Conduct

By participating, you agree to abide by the
[Contributor Covenant](CODE_OF_CONDUCT.md). Be welcoming, be precise,
be patient with first-time contributors.
