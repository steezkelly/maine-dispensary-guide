import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemapConfig from './apps/maine-cannabis/src/data/sitemap-config.json';

// Pages that receive noindex via Layout.astro — exclude from sitemap
const noindexPathPrefixes = sitemapConfig.noindexPathPrefixes;

// Map a sitemap URL to its .astro source file path
// sitemap URL pathname → source file
// /guides → guides/index.astro
// /guides/portland → guides/portland.astro
// / → index.astro
function urlToSrcPath(loc, site, pagesDir) {
  try {
    const u = new URL(loc);
    let pathname = u.pathname.replace(/\/$/, '') || '/';
    if (pathname === '/') {
      const index = path.join(pagesDir, 'index.astro');
      return fs.existsSync(index) ? index : null;
    }
    const indexPath = path.join(pagesDir, pathname, 'index.astro');
    if (fs.existsSync(indexPath)) return indexPath;
    const directPath = path.join(pagesDir, pathname + '.astro');
    if (fs.existsSync(directPath)) return directPath;
    const segments = pathname.split('/');
    if (segments.length > 1) {
      const parentIndex = path.join(pagesDir, segments[0], 'index.astro');
      if (fs.existsSync(parentIndex)) return parentIndex;
    }
    return null;
  } catch { return null; }
}

// Extract lastmod + image from frontmatter of an .astro file
function extractMeta(srcPath, site) {
  if (!srcPath || !fs.existsSync(srcPath)) return {};
  const raw = fs.readFileSync(srcPath, 'utf8');
  const fm = raw.match(/^---([\s\S]+?)---/m);
  if (!fm) return {};
  const code = fm[1];
  const heroImageMatch = raw.match(/heroImage\s*=\s*["']([^"']+)["']/);
  const articleMatch = code.match(/article\s*=\s*\{([^}]+)\}/);
  let lastmod = null, image = null;
  if (articleMatch) {
    const articleBody = articleMatch[1];
    const modMatch = articleBody.match(/modifiedDate\s*:\s*["']([^"']+)["']/);
    const pubMatch = articleBody.match(/publishDate\s*:\s*["']([^"']+)["']/);
    lastmod = modMatch ? modMatch[1] : (pubMatch ? pubMatch[1] : null);
  }
  if (heroImageMatch) {
    const img = heroImageMatch[1];
    image = img.startsWith('http') ? img : site + img;
  }
  return { lastmod, image };
}

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
    // Post-process: rewrite sitemap to inject lastmod/image metadata
    {
      name: 'sitemap-postprocess',
      hooks: {
        'astro:build:done': async ({ dir, pages }) => {
          const sitemapPath = path.join(fileURLToPath(dir), 'sitemap-0.xml');
          if (!fs.existsSync(sitemapPath)) return;

          const pagesDir = path.join(process.cwd(), 'src/pages');
          let content = fs.readFileSync(sitemapPath, 'utf8');
          const locMatches = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)];
          const locs = locMatches.map(m => m[1]);

          const newUrlEntries = [];

          for (const loc of locs) {
            try {
              const url = new URL(loc);
              const pathname = url.pathname;
              if (noindexPathPrefixes.some(p => pathname.startsWith(p))) continue;
              const srcPath = urlToSrcPath(loc, 'https://mainedispensaryguide.com', pagesDir);
              if (!srcPath) continue;
              const { lastmod, image } = extractMeta(srcPath, 'https://mainedispensaryguide.com');
              let entry = `<url><loc>${loc}</loc>`;
              if (lastmod) entry += `<lastmod>${lastmod}</lastmod>`;
              if (image) entry += `<image:image><image:loc>${image}</image:loc></image:image>`;
              entry += '</url>';
              newUrlEntries.push(entry);
            } catch { /* skip invalid URLs */ }
          }

          const urlsetOpen = content.match(/<urlset[^>]*>/)?.[0]
            || '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
          const newContent = urlsetOpen + newUrlEntries.join('') + '</urlset>';
          fs.writeFileSync(sitemapPath, newContent, 'utf8');
        },
      },
    },
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});