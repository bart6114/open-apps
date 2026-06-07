// @ts-check
// SPDX-License-Identifier: MIT
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
//
// Note on `site`: this is the canonical URL the build uses for absolute
// links (sitemap, RSS, OpenGraph, canonical tags). If you fork and host
// elsewhere, change this to your deployment URL.
export default defineConfig({
  site: 'https://open-apps.dev',
  trailingSlash: 'ignore',
  integrations: [
    // Sitemap at /sitemap-index.xml + /sitemap-0.xml. The `filter`
    // excludes /submit (a thin wrapper that POSTs to GitHub Issues;
    // the page itself is noindex,nofollow). See public/robots.txt
    // for the matching Disallow directive.
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !/\/submit\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
