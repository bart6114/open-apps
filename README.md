# Open Apps

[Open Apps](https://open-apps.dev.mn) is a curated directory of real
open-source applications with codebases developers can run, study, compare,
and contribute to.

The catalog currently contains 149 mobile and cross-platform apps. It began
with the public-domain Open Source Flutter Apps collection and now includes
Flutter, React Native, native iOS, and other production app stacks.

## What belongs here

Open Apps favors complete applications with:

- a public source repository and clear license;
- enough documentation or project structure to evaluate;
- meaningful product scope beyond a demo, tutorial, or starter;
- useful architecture, UI, data, testing, or deployment patterns.

Stars and recent activity are signals, not the sole inclusion criteria.
Long-running or historically useful projects can remain valuable learning
resources.

## Repository structure

```text
data/records/       one validated YAML file per app
data/taxonomy/      controlled categories, stacks, and platforms
data/generated/     Grove-managed metadata committed only when CI needs it
src/pages/          Open Apps-owned Astro pages
public/icons/       custom stack and platform assets
grove.config.ts     brand, navigation, footer, analytics, facets, and routes
```

Grove owns the reusable data contracts, UI components, generated artifacts,
and maintenance commands. This repository permanently owns its pages, copy,
data, deployment, and any future product-specific features.

## Local development

Node.js 22.12 or newer and pnpm are required.

```sh
corepack enable
pnpm install
pnpm dev
```

Before opening a pull request:

```sh
pnpm exec grove check
pnpm build
```

No repository-owned generation scripts are required. The Grove Astro
integration prepares normalized data, sitemap, robots, social preview, and
LLM-readable files when Astro starts.

## Maintenance

```sh
pnpm exec grove sync github
pnpm exec grove sync contributors
pnpm exec grove cleanup
```

The five workflows under `.github/workflows/` validate builds, report cleanup
candidates, refresh GitHub metadata, sync contributors, and produce the static
production artifact. Cloudflare deploys `dist/` through the repository's
existing Git integration and `wrangler.jsonc`.

## Contributing and license

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the app criteria and YAML workflow,
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community expectations, and
[SECURITY.md](./SECURITY.md) for private vulnerability reporting.

The application code is MIT licensed. The legacy seed collection is retained
under CC0 provenance; see [README-LEGACY.md](./README-LEGACY.md).
