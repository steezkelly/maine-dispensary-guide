import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
export const config = {
  runtime: 'nodejs22.x',
  supportsResponseStreaming: true,
};
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOINDEX_PATH_PREFIXES,
  postprocessSitemapFile,
} from '../../scripts/check/sitemap-postprocess.mjs';

// Pages with Layout noindex={true} should stay out of the public sitemap.
const noindexPathPrefixes = NOINDEX_PATH_PREFIXES;

export default defineConfig({
  site: 'https://mainedispensaryguide.com',
  trailingSlash: 'never',
  output: 'static',
  adapter: vercel(),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        if (page.includes('/admin/')) return false;
        for (const prefix of noindexPathPrefixes) {
          if (page.startsWith(prefix)) return false;
        }
        return true;
      },
    }),
    // Post-process: rewrite sitemap to:
    // 1. Exclude noindex paths (by checking URL pathname, not prefix)
    // 2. Inject lastmod from article.modifiedDate/publishDate/mtime
    // 3. Inject <image:image> from heroImage frontmatter
    // The implementation lives in scripts/build/sitemap-postprocess.mjs so
    // it can be unit-tested without booting Astro (Sprint 80 refactor,
    // 2026-07-02). See scripts/build/sitemap-postprocess.test.mjs.
    {
      name: 'sitemap-postprocess',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const sitemapPath = path.join(fileURLToPath(dir), 'sitemap-0.xml');
          const pagesDir = path.join(process.cwd(), 'src/pages');
          postprocessSitemapFile(sitemapPath, pagesDir);
        },
      },
    },
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  // Sprint 81 (2026-07-11) PSI mobile follow-up: inline small CSS files into
  // HTML so the homepage critical-path CSS chain becomes just the page-scoped
  // stylesheet. Previously the chain was Layout (4.6KB) + index (8.4KB) +
  // seo (7.6KB) = ~1,320ms render-blocking. With assetsInlineLimit=32KB,
  // Layout (15.7KB raw) and seo (27.1KB raw) get inlined into the HTML
  // (gzipped ~9KB total, but no extra network round-trip); only the page-
  // scoped index.css (44.7KB raw, homepage-specific) stays external.
  // Trade-off: ~9KB added to HTML on every page (gzipped), so cache benefit
  // for repeat visits to other pages goes away — but those are visited less
  // than the homepage and the LCP win dominates.
  vite: {
    build: {
      assetsInlineLimit: 32768,
    },
  },
});
