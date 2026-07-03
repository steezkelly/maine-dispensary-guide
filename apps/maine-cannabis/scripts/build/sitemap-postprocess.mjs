// scripts/build/sitemap-postprocess.mjs
//
// Pure functions for postprocessing the @astrojs/sitemap output. Extracted
// from apps/maine-cannabis/astro.config.mjs in 2026-07-02 so they can be
// unit-tested without booting Astro. The integration in astro.config.mjs
// imports postprocessSitemap() and calls it from the astro:build:done hook.
//
// Three responsibilities:
//   1. Filter out noindex pages (by URL pathname prefix, then by source-file
//      noindex={true} attribute — the prefix check alone misses /download/roadmap
//      and similar files that live outside the prefix dirs).
//   2. Inject <lastmod> from article.modifiedDate > article.publishDate >
//      source-file mtime. The mtime fallback ensures every URL gets a real
//      lastmod even when the page has no article prop.
//   3. Inject <image:image> from the heroImage frontmatter.
//
// All three are sensitive to the input shape (the @astrojs/sitemap stream
// output, and the .astro file frontmatter). Two distinct bug classes live
// in this file:
//   - The dead-code cascade: removing a const (like the `site` constant in
//     extractMeta's image-line collapse) silently breaks the output, dropping
//     the sitemap from 222 URLs to 7. Caught by the URL-count assertion in
//     the test.
//   - The lastmod gap: before the mtime fallback, 25 of 222 URLs were missing
//     lastmod, which makes Googlebot guess (and get wrong) crawl priorities.
//     Caught by the per-URL lastmod assertion in the test.

import fs from 'node:fs';
import path from 'node:path';

// Pages with Layout noindex={true} should stay out of the public sitemap.
// Matches the @astrojs/sitemap filter in astro.config.mjs.
export const NOINDEX_PATH_PREFIXES = ['/experiments', '/search', '/admin/'];

/**
 * Read a source .astro file and report whether the page declares
 * noindex={true} (i.e. it should be excluded from the public sitemap).
 * Also returns true for routes that are always noindex (e.g. /404,
 * and any path under the NOINDEX_PATH_PREFIXES list).
 */
export function isNoindexSource(srcPath, route) {
  if (route === '/404') return true;
  if (NOINDEX_PATH_PREFIXES.some(
    (prefix) => route === prefix.replace(/\/$/, '') || route.startsWith(prefix),
  )) return true;
  try {
    const raw = fs.readFileSync(srcPath, 'utf8');
    return /noindex\s*=\s*\{\s*true\s*\}/.test(raw);
  } catch {
    // File unreadable — treat as not-noindex so we don't accidentally
    // exclude pages on transient filesystem errors.
    return false;
  }
}

/**
 * XML-escape a string for safe inclusion in sitemap content. Required
 * because the postprocessor composes XML by string concatenation, not
 * via a DOM library. Sitemap parsers reject unescaped `&` and `<`.
 */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Map a sitemap URL back to its .astro source file path. Returns null
 * if no source file matches. Tries three locations in order:
 *   1. pagesDir/{pathname}/index.astro  (directory index)
 *   2. pagesDir/{pathname}.astro        (direct file)
 *   3. pagesDir/{firstSegment}/index.astro  (parent index for nested routes)
 */
export function urlToSrcPath(loc, pagesDir) {
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
  } catch {
    return null;
  }
}

/**
 * Extract lastmod + image from frontmatter of an .astro file.
 * Frontmatter in .astro is a JS module, not pure YAML — parse it with regex.
 * lastmod precedence: article.modifiedDate > article.publishDate > source-file
 * mtime. The mtime fallback ensures even pages without an article prop
 * (homepage, about, contact, etc.) get a real lastmod signal.
 */
export function extractMeta(srcPath) {
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
  // Fall back to source file mtime. Format as YYYY-MM-DD (sitemap standard).
  if (!lastmod) {
    try {
      const stat = fs.statSync(srcPath);
      lastmod = stat.mtime.toISOString().slice(0, 10);
    } catch {}
  }
  if (heroImageMatch) {
    const img = heroImageMatch[1];
    image = img.startsWith('http') ? img : 'https://mainedispensaryguide.com' + img;
  }
  return { lastmod, image };
}

/**
 * Build a single <url>...</url> entry for the sitemap.
 * Always emits <loc>. Conditionally emits <lastmod> and <image:image>.
 */
export function buildUrlEntry(loc, pagesDir, options = {}) {
  const { lastmod, image } = (options.extractMeta || extractMeta)(
    urlToSrcPath(loc, pagesDir),
  );
  let entry = `<url><loc>${escapeXml(loc)}</loc>`;
  if (lastmod) entry += `<lastmod>${escapeXml(lastmod)}</lastmod>`;
  if (image) entry += `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`;
  entry += '</url>';
  return entry;
}

/**
 * Postprocess a raw @astrojs/sitemap XML string. Filters out noindex pages,
 * injects <lastmod> and <image:image>, returns the rewritten XML.
 *
 * Exported as a pure function (no filesystem I/O on the output) so the
 * unit test can construct an in-memory sitemap and verify behavior.
 *
 * @param {string} rawSitemap - The XML content of the input sitemap.
 * @param {object} options
 * @param {string} options.pagesDir - Path to the .astro pages dir (used by
 *   urlToSrcPath and extractMeta to resolve source files for lastmod/image).
 * @returns {string} The rewritten sitemap XML.
 */
export function postprocessSitemap(rawSitemap, options) {
  const { pagesDir } = options;
  const locMatches = [...rawSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)];
  const locs = locMatches.map((m) => m[1]);

  const newUrlEntries = [];
  for (const loc of locs) {
    try {
      const url = new URL(loc);
      const pathname = url.pathname;
      if (NOINDEX_PATH_PREFIXES.some((p) => pathname.startsWith(p))) continue;
      const srcPath = urlToSrcPath(loc, pagesDir);
      if (srcPath && isNoindexSource(srcPath, pathname)) continue;
      newUrlEntries.push(buildUrlEntry(loc, pagesDir, { extractMeta }));
    } catch {
      /* skip invalid URLs */
    }
  }

  const urlsetOpen = rawSitemap.match(/<urlset[^>]*>/)?.[0]
    || '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
  return urlsetOpen + newUrlEntries.join('') + '</urlset>';
}

/**
 * Run the postprocessor on the sitemap at `sitemapPath` in-place.
 * Convenience wrapper for the Astro integration.
 */
export function postprocessSitemapFile(sitemapPath, pagesDir) {
  if (!fs.existsSync(sitemapPath)) return;
  const content = fs.readFileSync(sitemapPath, 'utf8');
  const newContent = postprocessSitemap(content, { pagesDir });
  fs.writeFileSync(sitemapPath, newContent, 'utf8');
}
