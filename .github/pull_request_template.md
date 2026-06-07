<!--
Thanks for contributing! A few things to confirm before you submit.

If you are adding a NEW app, please also fill in the "New app details"
section below — this gives reviewers what they need to verify the bar
(stars ≥ 50 AND totalCommits ≥ 50) without having to fetch the repo
metadata themselves.
-->

## What this PR does

<!-- One or two sentences. "Adds <app> to data/apps/" or "Fixes typo in
     2048.yml" or "Refreshes synced GitHub metadata for ..." -->

- [ ] Adds a new app (`data/apps/<slug>.yml`)
- [ ] Updates an existing app
- [ ] Fixes a bug in scripts or the build pipeline
- [ ] Updates docs / metadata (README, CONTRIBUTING, etc.)
- [ ] Other (describe below)

## New app details

<!-- Required for new apps. Skip if you're not adding one. -->

- **Repo URL**: https://github.com/owner/name
- **App name**:
- **Category** (Business, Communication, Education, etc.):
- **Primary stack** (Flutter, React Native, etc.):
- **Platforms** (Android, iOS, Web, etc.):
- **Stars (today)**: <!-- look at github.com/owner/name -->
- **Total commits (lifetime)**: <!-- rough order of magnitude is fine -->
- **One-line description**:
- **Homepage** (optional):
- **License** (MIT, Apache-2.0, etc.):

## Checklist

- [ ] I read [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [ ] I did NOT hand-edit synced `github:` / `health:` data unless this PR
      is explicitly fixing automation output.
- [ ] I ran `pnpm run build:data` and `pnpm run build` locally and both
      succeeded
- [ ] The yml file is named `<slug>.yml` and `slug:` inside matches the
      filename
- [ ] The new app passes the bar (stars ≥ 50 AND totalCommits ≥ 50)

## Notes for reviewers

<!-- Anything else — context, screenshots, links to similar PRs, etc. -->
