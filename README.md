# Open Source Apps

A static, community-curated directory of real open-source application codebases.

The project started from the [Open Source Flutter Apps](https://github.com/tortuvshin/open-source-flutter-apps) collection and is now being expanded into a broader directory, starting with mobile apps.

The goal is simple: **make real open-source apps easier to find, understand, compare, and learn from.**

## What this is

- A static site (Astro 5, no backend, no database)
- A hand-curated directory of real open-source application codebases
- Mobile-first — Flutter is the strongest starting point; other stacks are being added
- Open data — the app list lives in this repository as `src/data/apps.ts`
- Open curation — anyone can suggest apps, fix metadata, or challenge a score

## What this is not

- Not a SaaS
- Not a Product Hunt competitor
- Not a GitHub scraper
- Not an "AI coding platform"

A plain README list becomes hard to scan as the number of apps grows. Open Source Apps turns that list into a structured directory.

## The data model

Each app in [`src/data/apps.ts`](./src/data/apps.ts) has the shape defined in [`src/data/types.ts`](./src/data/types.ts). Required fields are name, repository URL, stack, platforms, and category. Curated fields (scores, `bestFor`, `whyListed`, `caveats`, etc.) are optional and improve the detail page when present.

```ts
{
  slug: "invoice-ninja",
  name: "Invoice Ninja",
  repoUrl: "https://github.com/invoiceninja/flutter-mobile",
  description: "Companion app for the Invoice Ninja platform.",
  stack: "Flutter",
  platforms: ["Android", "iOS"],
  category: "Business",
  stars: 1800,
  license: "AGPL-3.0",
  status: "active",
  // Curated (optional)
  bestFor: ["Real commercial product with open codebase", ...],
  whyListed: ["Real production app used by paying customers", ...],
  caveats: ["Tightly coupled to the hosted Invoice Ninja platform", ...],
  scores: { activity: 65, maturity: 92, learning: 78, contribution: 70, docs: 62, overall: 76 },
}
```

The build is fully static — no runtime API, no scraping. All metadata is reviewed by humans before it ships.

## Project layout

```
src/
├── pages/         # Astro pages
│   ├── index.astro         # home
│   ├── apps/               # /apps list + /apps/[slug] detail
│   └── about.astro         # /about
├── components/    # UI components (cards, grids, header, footer)
├── data/          # apps.ts, types.ts, stacks.ts, categories.ts, stats.ts
├── lib/           # search, scoring, repo helpers
└── styles/        # global.css
```

## Local development

```sh
npm install
npm run dev      # dev server on http://localhost:4321
npm run build    # static build into dist/
npm run preview  # preview the build
```

Before the first build, the icon-fetching step runs and pulls the SVG icons for each stack and platform referenced in `apps.ts` into `public/icons/`.

## Adding an app

1. Add a new entry to [`src/data/apps.ts`](./src/data/apps.ts). Required fields are documented in [`src/data/types.ts`](./src/data/types.ts).
2. The build will pick it up automatically. Verify locally with `npm run dev`.
3. Open a pull request. A reviewer may ask for additional curation fields (`bestFor`, `whyListed`, `caveats`, scores) if the app is going to anchor a stack.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the original submission format used by the legacy Flutter list.

## Why this list is still needed

A lot of developer attention right now is on AI coding tools. The pitch is familiar: describe the app, the model builds it, ship it.

This project does not pretend to compete with that. It does something different.

AI can generate code. It can also generate code that *looks like an app, runs like an app, and breaks like an app*.

A generated prototype is not the same as a real application. Real apps have structure that survives years of changes, decisions, edge cases, and contributors. They handle authentication, navigation, storage, releases, deprecation. They have bugs and they fix them. That part does not come from prompting a model.

If you are using an AI tool to build something, you can also use this directory to find real apps to point it at. *"Build me an app like this one"* is a stronger instruction than *"build me an app."*

## License

App metadata is released under [CC BY-SA 4.0](./LICENSE). The website code is MIT.

The original Flutter list, which seeded this directory, lives at [`README-LEGACY.md`](./README-LEGACY.md) and is preserved for attribution.
