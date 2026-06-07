# Security Policy

## Reporting a vulnerability

If you find a security issue in **this repository** (the directory site,
build scripts, or GitHub Actions), please report it privately:

- **Open a private security advisory** on GitHub:
  <https://github.com/tortuvshin/open-source-flutter-apps/security/advisories/new>
- Or email a maintainer (see `git log` for active committers; the address
  is the one on the commit metadata).

Do **not** open a public GitHub issue for a security problem — it gives
attackers a head start.

## What to expect

- **Acknowledgement** within 3 working days.
- **Status update** within 7 working days, with a triage outcome
  (accepted / won't fix / duplicate) and a tentative fix timeline.
- **Credit** in the fix commit unless you prefer to stay anonymous.
- **Disclosure timeline** agreed on a case-by-case basis. We aim to
  patch critical issues within 30 days of confirmation.

## Scope

In scope: the build pipeline (`scripts/`), the Astro site (`src/`), the
GitHub Actions workflows (`.github/workflows/`), and any committed
dependencies. The yml files in `data/apps/` describe external repos —
issues with those repos should go to **their** maintainers, not here.
Same for `README-LEGACY.md` which is a curated index of public URLs.

## Supported versions

Only the latest commit on `main` receives security fixes. Older tags
are not maintained.

## Out of scope

- Repos linked from `data/apps/*.yml` — those are external projects.
  File issues in their own trackers.
- The `dist/` build output — it's regenerated on every build; if you
  find a problem in the live site, file a regular bug.
- Dependency CVEs without a working PoC — we'll bump when there's
  reason to.
