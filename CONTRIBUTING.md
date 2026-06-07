# Contributing to Open Source Apps

Thanks for helping build a directory of real, useful open-source applications.
This guide covers how to add, fix, or curate entries.

The goal: a structured directory whose data stays fresh by itself. Every app
gets a YAML file under `data/apps/`, the build pipeline turns it into JSON,
and the Astro site renders it. App metadata (stars, last commit) is refreshed
daily by GitHub Actions.

## The bar for inclusion

A repo is included only if it **passes both**:

- **stars ≥ 50** on its primary public repo
- **totalCommits ≥ 50** in the lifetime of the project

Apps failing either signal are excluded from the directory. Archived, demo,
template, and tutorial repos are excluded by the curation tier but the bar
applies uniformly — popularity is not a substitute for substance, and a
small, clean codebase is more useful than a popular one that no one can read.

The build script (`scripts/build-apps-json.mjs`) drops apps whose last
commit is older than 180 days, so even a passing app can fall out of the
listing if it goes quiet.

## Adding a new app

1. Fork the repo.
2. Create a new file: `data/apps/<slug>.yml`, where `<slug>` is the
   kebab-cased app name (e.g. `invoice-ninja.yml`).
3. Fill in the schema (see `README.md` → "The schema" for the full
   reference). At minimum:
   ```yaml
   slug: my-app
   name: My App
   repoUrl: https://github.com/owner/my-app
   description: One-line description.
   stack: Flutter            # primary stack (see src/data/stacks.ts)
   platforms: [Android, iOS]
   category: Productivity
   ```
4. Optionally add hand-curated fields: `bestFor`, `whyListed`, `caveats`,
   `scores`, `homepageUrl`, `license`, `status`. The activity block
   (`stars`, `lastCommitAt`, etc.) is auto-populated by the daily
   workflow; don't write it by hand.
5. Run `npm run build:data` locally to confirm your yml parses.
6. Run `npm run build` to confirm the site still builds.
7. Open a pull request.

## Updating an existing app

- Edit the yml file directly. Keep `activity:` block as-is — the next
  workflow run will refresh it.
- If you're adding a new curation field (e.g. `whyListed`) for an app
  that has none, prefer copy-pasting from a similar app as a template.
- If the app moved (repo URL changed), update `repoUrl` only after
  confirming the new repo is the canonical one.

## Removing an app

- If the app's repo was deleted, marked as malware, or no longer fits
  the bar, the build will drop it automatically. No manual action needed.
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
- Don't edit the `activity:` block by hand; the daily GitHub Action
  overwrites it. The PR template checks for this.
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
