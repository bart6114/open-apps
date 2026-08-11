import { defineConfig } from "@grove-dev/core";

/** Open Apps is a Grove-powered directory of production open-source apps. */
export default defineConfig({
  blueprint: "project-directory",

  site: {
    name: "Open Apps",
    tagline: "Discover real open-source apps and the stacks behind them.",
    description:
      "A searchable directory of real open-source applications, organized by stack, category, platform, activity, and maturity.",
    url: "https://open-apps.dev.mn",
    repoUrl: "https://github.com/tortuvshin/open-apps",
  },

  analytics: {
    googleAnalyticsId: "G-MB9GWW1LVX",
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "Browse", href: "/apps" },
    { label: "Collections", href: "/collections" },
    { label: "Community", href: "/contributors" },
    { label: "About", href: "/about" },
  ],

  footer: {
    columns: [
      {
        heading: "Discover",
        items: [
          { label: "Browse apps", href: "/apps" },
          { label: "Contributors", href: "/contributors" },
        ],
      },
      {
        heading: "Contribute",
        items: [
          { label: "Submit an app", href: "/submit" },
          { label: "Report an issue", href: "https://github.com/tortuvshin/open-apps/issues", external: true },
        ],
      },
      {
        heading: "Project",
        items: [
          { label: "Source on GitHub", href: "https://github.com/tortuvshin/open-apps", external: true },
          { label: "About", href: "/about" },
        ],
      },
    ],
    copyright: "Open Apps contributors",
    license: "Code is MIT licensed. The legacy seed collection remains CC0.",
  },

  submission: {
    eyebrow: "Open app submission",
    title: "Add an open-source app",
    description:
      "Generate a Grove record from a public GitHub repository, review the app taxonomy, then open a pull request.",
    good: [
      "A usable application that people can install or run",
      "A public repository with a clear license and enough documentation to evaluate",
      "A category, primary stack, and platforms chosen from this directory's taxonomy",
    ],
    avoid: [
      "Closed-source products or marketing-only landing pages",
      "Libraries, tutorials, snippets, or duplicate entries",
      "Abandoned experiments without documentation or a verifiable license",
    ],
  },

  facets: ["category", "stack", "platform", "license", "tags"],
  routes: { directory: "apps", item: "app" },
  labels: { singular: "app", plural: "apps" },

  integrations: { github: false },

  theme: {
    primaryColor: "#1f6feb",
    radius: "soft",
    density: "comfortable",
    containerWidth: "72rem",
  },

  // Per-user contribution counts are noisy here — the contributors
  // grid is a community wall, not a leaderboard, so we hide the
  // "N contributions" label and just show the avatar + handle.
  contributors: { showContributionCount: false },

  audit: {
    baseUrl: "http://127.0.0.1:4321",
    pages: [
      { path: "/", type: "home", label: "Homepage" },
      { path: "/apps/", type: "directory", label: "Directory index" },
      { path: "/collections/top-flutter-apps/", type: "collection", label: "Top Flutter Apps collection" },
      { path: "/apps/immich/", type: "record", label: "Record detail" },
      { path: "/about/", type: "content", label: "About page" },
      { path: "/empty/", type: "empty", label: "Empty state" },
      { path: "/this-page-does-not-exist/", type: "404", label: "404 page" },
    ],
  },

  readme: {
    title: "Open Apps — a directory of real open-source applications",
    tagline: "Hand-picked apps worth running, studying, and extending.",
    url: "https://open-apps.dev.mn",
    browseLabel: "Browse the directory →",
    intro: [
      "## Why this list",
      "",
      "Each app below is **actively maintained**, **well documented**, and",
      "**useful in production**. Submit a new entry via the web form or",
      "by opening a pull request against `data/records/`.",
    ].join("\n"),
  },
});
