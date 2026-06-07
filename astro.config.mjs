// @ts-check
// SPDX-License-Identifier: MIT
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
//
// Note on `site`: this is the canonical URL the build uses for absolute
// links (sitemap, RSS, OpenGraph, canonical tags). If you fork and host
// elsewhere, change this to your deployment URL.
export default defineConfig({
  site: 'https://open-apps.dev',
  trailingSlash: 'ignore',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  build: {
    format: 'directory',
  },
});
