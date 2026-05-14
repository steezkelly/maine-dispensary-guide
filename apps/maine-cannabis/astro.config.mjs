import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pages that receive noindex via Layout.astro — exclude from sitemap
const noindexPathPrefixes = ['/download/', '/experiments', '/admin/'];

// Map a sitemap URL to its .astro source file path
function urlToSrcPath(loc, site, pagesDir) {
  try {
    const u = new URL(loc);
    const pathname = u.pathname.replace(/\/$/, '');
    const p = pathname || '/';
    const srcPath = path.join(pagesDir, p + '.astro');
    return fs.existsSync(srcPath) ? srcPath : null;
  } catch { return null; }
}

// Extract lastmod + image from frontmatter of an .astro file
// Frontmatter in .astro is a JS module, not pure YAML — parse it with regex
function extractMeta(srcPath) {
  const raw = fs.readFileSync(srcPath, 'utf8');
  const fm = raw.match(/^---([\s\S]+?)---/m);
  if (!fm) return {};
  const code = fm[1];
  // Look for top-level heroImage assignment in frontmatter or Layout prop in template
  // heroImage="/images/..." pattern (in Layout component)
  const heroImageMatch = raw.match(/heroImage\s*=\s*["']([^"']+)["']/);
  // Look for article = { ... modifiedDate: ..., publishDate: ... } in frontmatter
  const articleMatch = code.match(/article\s*=\s*\{([^}]+)\}/);
  let lastmod = null, image = null;
  if (articleMatch) {
    const articleBody = articleMatch[1];
    const modMatch = articleBody.match(/modifiedDate\s*:\s*["']([^"']+)["']/);
    const pubMatch = articleBody.match(/publishDate\s*:\s*["']([^"']+)["']/);
    lastmod = modMatch ? modMatch[1] : (pubMatch ? pubMatch[1] : null);
  }
  if (heroImageMatch) {
    image = heroImageMatch[1].startsWith('http') ? heroImageMatch[1] : site + heroImageMatch[1];
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
    // Post-process: remove any noindex pages the filter missed
    // and inject lastmod/image metadata from frontmatter
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

          let changed = false;
          const newUrlEntries = [];

          for (const loc of locs) {
            try {
              const url = new URL(loc);
              const pathname = url.pathname.replace(/\/$/, '');
              // Exclude noindex paths
              if (noindexPathPrefixes.some(p => pathname.startsWith(p))) {
                changed = true;
                continue;
              }
              // Extract frontmatter metadata
              const srcPath = urlToSrcPath(loc, 'https://mainedispensaryguide.com', pagesDir);
              const { lastmod, image } = srcPath ? extractMeta(srcPath) : {};
              let entry = `<url><loc>${loc}</loc>`;
              if (lastmod) entry += `<lastmod>${lastmod}</lastmod>`;
              if (image) entry += `<image:image><image:loc>${image}</image:loc></image:image>`;
              entry += '</url>';
              newUrlEntries.push(entry);
            } catch { /* keep invalid URLs */ }
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