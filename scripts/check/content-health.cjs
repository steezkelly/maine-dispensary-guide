#!/usr/bin/env node
/**
 * Content health QA script for Maine Dispensary Guide
 * Runs bounded source-level and rendered-output checks. Source-level checks
 * avoid a full build; sitemap, OG metadata, CSS-warning, and rendered-crawl
 * checks require built output/build execution.
 *
 * Usage: node scripts/content/check-content-health.cjs
 *   (or: npm run check:content-health)
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages');
const ROOT = path.resolve(process.env.CONTENT_HEALTH_ROOT || DEFAULT_ROOT);
const SITEMAP = path.resolve(process.env.CONTENT_HEALTH_SITEMAP || path.resolve(__dirname, '..', '..', 'dist', 'sitemap-0.xml'));
const DIST = path.resolve(process.env.CONTENT_HEALTH_DIST || path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'dist'));
const PUBLIC_DIR = path.resolve(process.env.CONTENT_HEALTH_PUBLIC || path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'public'));
const ADMIN_DIRS = new Set(['admin', 'experiments']);

function parseArgs(argv) {
  const flags = new Set(argv);
  const sourceOnly = flags.has('--source-only');
  const renderedOnly = flags.has('--rendered-only');
  if (sourceOnly && renderedOnly) {
    console.error('Cannot combine --source-only and --rendered-only');
    process.exit(2);
  }
  return {
    build: flags.has('--build'),
    noBuild: flags.has('--no-build'),
    sourceOnly,
    renderedOnly,
  };
}

const OPTIONS = parseArgs(process.argv.slice(2));

function runBuildPreflight() {
  if (OPTIONS.noBuild || OPTIONS.sourceOnly || ROOT !== DEFAULT_ROOT) return [];
  if (!OPTIONS.build && process.env.CONTENT_HEALTH_SKIP_CSS_BUILD === '1') return [];

  const { execSync } = require('node:child_process');
  try {
    const out = execSync('npm run build 2>&1', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 20 * 1024 * 1024,
    });
    const lines = out.split('\n');
    const cssWarnings = [];
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.includes('warn') && (lower.includes('css') || lower.includes('style'))) {
        cssWarnings.push(line.trim());
      }
      if (lower.includes('deprecated') && lower.includes('style')) {
        cssWarnings.push(line.trim());
      }
    });
    return cssWarnings.filter(l =>
      l.match(/\[warn\]/i) ||
      l.match(/warning:/i) ||
      l.match(/css.*warning/i) ||
      l.includes('deprecated') && l.includes('style')
    ).slice(0, 10);
  } catch (err) {
    const message = err && err.message ? err.message.split('\n')[0] : String(err);
    return [`build failed while scanning CSS warnings: ${message}`];
  }
}

function buildAuditCache() {
  const sourceFiles = walk(ROOT).map(file => {
    const text = fs.readFileSync(file, 'utf8');
    return { file, rel: path.relative(ROOT, file).replace(/\\/g, '/'), text, lines: text.split(/\r?\n/) };
  });
  const renderedHtmlFiles = htmlFiles(DIST).map(file => {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(DIST, file).replace(/\\/g, '/');
    return { file, rel, route: routeForHtml(DIST, file), text };
  });
  const routeSet = new Set(renderedHtmlFiles.map(entry => entry.route));
  const sitemapXml = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
  return { sourceFiles, renderedHtmlFiles, routeSet, sitemapXml };
}

function sourceEntry(cache, rel) {
  const normalized = rel.replace(/\\/g, '/');
  return cache.sourceFiles.find(entry => entry.rel === normalized);
}

// ─── Check 1: no href="#" ───────────────────────────────────────────────────
function checkHrefHash(cache) {
  const results = [];
  cache.sourceFiles.forEach(({ file, rel, text, lines }) => {
    lines.forEach((line, idx) => {
      // Match href="#" inside HTML — but allow href="#section-id" anchors
      if (/href\s*=\s*["']#["']/.test(line)) {
        results.push(`${rel}:${idx + 1}: bare href=\"#\" found`);
      }
    });
  });
  return results;
}

// ─── Check 2: malformed frontmatter shape ──────────────────────────────────
const FRONTMATTER_BAD = /---\s+import\s+\w+\s+from\s+['"][^'"]+['"]/;
function checkFrontmatter(cache) {
  const results = [];
  cache.sourceFiles.forEach(({ rel, lines }) => {
    // Must have at least one --- line, then import, then --- <Layout
    let state = 'search';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (state === 'search' && l === '---') { state = 'frontmatter'; continue; }
      if (state === 'frontmatter') {
        if (FRONTMATTER_BAD.test(l)) {
          results.push(`${rel}:${i + 1}: malformed frontmatter import (--- import, --- <Layout): ${l}`);
        }
        if (l.startsWith('<')) { state = 'done'; }
        if (l === '---') { state = 'done'; }
      }
      if (state === 'done') break;
    }
  });
  return results;
}

// ─── Check 3: noindex pages in sitemap ─────────────────────────────────────
function checkNoindexInSitemap(cache) {
  const results = [];
  if (!fs.existsSync(SITEMAP)) {
    return ['sitemap-0.xml not found — run build first'];
  }
  const xml = cache.sitemapXml;
  // Pages that should NOT be in sitemap (noindex pages).
  // /admin/, /experiments/, /link-dashboard — already excluded via
  // sitemap-config.json noindexPathPrefixes. The /download/* lead-magnet
  // pages are intentionally indexable (they have indexable copy and a
  // lead-magnet form) — only /download/roadmap is noindex={true} on the
  // page itself. Other download pages are marketing surfaces and should
  // be crawled.
  const noindexPages = [
    '/download/roadmap',
  ];
  noindexPages.forEach(p => {
    if (xml.includes(`<loc>https://mainedispensaryguide.com${p}`)) {
      results.push(`noindex page found in sitemap: ${p}`);
    }
  });
  return results;
}

// ─── Check 4: fake "Menu"/"Directions" buttons (store-cards array) ──────────
// The stores array in find-a-dispensary.astro should not produce href="#"
function checkFakeAnchorsInStores(cache) {
  const entry = sourceEntry(cache, 'find-a-dispensary.astro');
  if (!entry) return [];
  const { rel, text } = entry;
  const results = [];

  // Check that store card buttons don't have href="#"
  const cardRegex = /<a[^>]+href\s*=\s*["']#["'][^>]*>(Directions|Menu|Visit|View)<\/a>/gi;
  const lines = entry.lines;
  lines.forEach((line, idx) => {
    if (cardRegex.test(line)) {
      results.push(`${rel}:${idx + 1}: fake anchor button found: ${line.trim()}`);
    }
    cardRegex.lastIndex = 0;
  });

  // Also catch if the stores JS array contains menu: "#" or directions: "#"
  const badStoreProp = /(?:menu|directions|menuUrl|mapUrl)\s*:\s*["']#["']/g;
  lines.forEach((line, idx) => {
    if (badStoreProp.test(line)) {
      results.push(`${rel}:${idx + 1}: store prop set to bare '#': ${line.trim()}`);
    }
    badStoreProp.lastIndex = 0;
  });

  return results;
}

// ─── Check 5: typo literals ────────────────────────────────────────────────
const KNOWN_BAD = ['retaillaunch'];
function checkTypoLiterals(cache) {
  const results = [];
  cache.sourceFiles.forEach(({ file, rel, text, lines }) => {
    KNOWN_BAD.forEach(typo => {
      const re = new RegExp(`\\b${typo}\\b`, 'i');
      lines.forEach((line, idx) => {
        if (re.test(line)) {
          results.push(`${rel}:${idx + 1}: typo literal '${typo}': ${line.trim().slice(0, 100)}`);
        }
      });
    });
  });
  return results;
}

// ─── Check 6: internal static links to missing pages ───────────────────────
function checkDeadInternalLinks(cache) {
  // Build list of valid pages from sitemap
  const validPages = new Set();
  if (cache.sitemapXml) {
    const locMatches = cache.sitemapXml.matchAll(/<loc>https:\/\/mainedispensaryguide\.com([^<]*)<\/loc>/g);
    for (const m of locMatches) {
      const p = m[1] || '/';
      validPages.add(p);
    }
  }

  // Also trust concrete Astro source routes. Some valid pages are intentionally
  // noindex and excluded from the sitemap (download funnels, 404, search), but
  // internal links to them are not dead links.
  cache.sourceFiles.forEach(({ rel }) => {
    let route = '/' + rel.replace(/\.astro$/, '');
    route = route.replace(/\/index$/, '') || '/';
    validPages.add(route);
  });

  const results = [];
  const internalLinkRe = /href\s*=\s*["'](?!https?:\/\/|tel:|mailto:|\/\/)([^"']+)["']/g;
  const skipRe = /^#|^javascript:/;

  cache.sourceFiles.forEach(({ file, rel, text }) => {
    const fileDir = path.dirname(file);
    let m;
    while ((m = internalLinkRe.exec(text)) !== null) {
      const raw = m[1];
      const pagePath = raw.split('#')[0].split('?')[0];
      if (skipRe.test(pagePath) || pagePath.includes('\\')) continue;

      let target;
      if (pagePath.startsWith('/')) {
        target = pagePath.replace(/\/$/, '');
      } else {
        target = '/' + path.relative(
          ROOT,
          path.resolve(fileDir, pagePath)
        ).replace(/\\/g, '/').replace(/\/$/, '');
      }
      target = target.replace(/\/$/, '');

      if (target.startsWith('/images/') || target.startsWith('/_astro/') ||
          target.startsWith('/fonts/') || target.includes('.')) continue;

      if (!validPages.has(target) && !validPages.has(target + '/')) {
        if (target === '/' && validPages.has('/')) continue;
        const lineNum = text.slice(0, m.index).split(/\r?\n/).length;
        results.push(`${rel}:${lineNum}: dead internal link → ${target}`);
      }
    }
  });
  return results;
}

// ─── Check 7: malformed \\1 hrefs (from bad regex replacements) ─────────────
function checkMalformedBackrefHrefs(cache) {
  const badHrefPattern = /href=["']\\1["']/g;
  const results = [];
  cache.sourceFiles.forEach(({ file, rel, text, lines }) => {
    lines.forEach((line, idx) => {
      if (badHrefPattern.test(line)) {
        results.push(`${rel}:${idx + 1}: malformed \\1 href: ${line.trim()}`);
      }
      badHrefPattern.lastIndex = 0;
    });
  });
  return results;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const parts = full.split(path.sep);
      if (!ADMIN_DIRS.has(parts[parts.length - 1])) walk(full, out);
    } else if (entry.isFile() && full.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
}

// ─── Check 8: production pages missing complete OG image metadata ───────────
// ─── Check 10: OG image dimensions ────────────────────────────────────────────

function checkOGImageDimensions(cache) {
  const results = [];
  const distPath = DIST;

  if (!fs.existsSync(distPath)) {
    return ['dist/ not found — run build first'];
  }

  // Read actual image dimensions from /public/ so we can validate the
  // og:image:width / og:image:height meta tags match the real file.
  // Falls back to the documented 1200x630 default if the image isn't local.
  const dimsCache = new Map();
  const DEFAULT_OG_WIDTH = 1200;
  const DEFAULT_OG_HEIGHT = 630;
  function readLocalImageDims(url) {
    // url is absolute (e.g. https://mainedispensaryguide.com/images/heroes/x.jpg)
    // or relative (/images/heroes/x.jpg). Only resolve /images/* against public/.
    let rel;
    if (url.startsWith('/images/')) rel = url.slice(1);
    else {
      const m = url.match(/^https?:\/\/[^/]+(\/.*)$/);
      if (!m || !m[1].startsWith('/images/')) return null;
      rel = m[1].slice(1);
    }
    if (dimsCache.has(rel)) return dimsCache.get(rel);
    const filePath = path.join(PUBLIC_DIR, rel);
    let data;
    try { data = fs.readFileSync(filePath); }
    catch { dimsCache.set(rel, null); return null; }
    // Walk JPEG markers looking for SOF0/1/2/3
    let i = 2;
    while (i < data.length - 9) {
      if (data[i] !== 0xFF) break;
      const marker = data[i + 1];
      if (marker === 0xD8 || marker === 0xD9 || marker === 0x00) { i += 2; continue; }
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3) {
        const h = data.readUInt16BE(i + 5);
        const w = data.readUInt16BE(i + 7);
        const result = { w, h };
        dimsCache.set(rel, result);
        return result;
      }
      if (marker === 0xDA) break;
      if (i + 4 > data.length) break;
      const segLen = data.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
    dimsCache.set(rel, null);
    return null;
  }

  // Walk built HTML pages from the shared cache.
  for (const { rel, text } of cache.renderedHtmlFiles) {
    const ogImageRe = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/;
    const ogImageMatch = text.match(ogImageRe);
    const ogImageUrl = ogImageMatch ? ogImageMatch[1] : '';

    const robotsRe = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/;
    const robotsMatch = text.match(robotsRe);
    const robots = robotsMatch ? robotsMatch[1].toLowerCase() : '';
    if (robots.includes('noindex')) continue;

    const wRe = /<meta\s+property=["']og:image:width["']\s+content=["']([^"']*)["']/;
    const hRe = /<meta\s+property=["']og:image:height["']\s+content=["']([^"']*)["']/;
    const wMatch = text.match(wRe);
    const hMatch = text.match(hRe);

    if (!ogImageUrl) {
      results.push(`${rel}: missing og:image`);
      continue;
    }
    if (!wMatch) {
      results.push(`${rel}: missing og:image:width`);
    } else if (!hMatch) {
      results.push(`${rel}: missing og:image:height`);
    } else {
      const reportedW = parseInt(wMatch[1], 10);
      const reportedH = parseInt(hMatch[1], 10);
      if (Number.isFinite(reportedW) && Number.isFinite(reportedH)) {
        const local = readLocalImageDims(ogImageUrl);
        if (local) {
          if (reportedW !== local.w) results.push(`${rel}: og:image:width=${reportedW} doesn't match actual image width ${local.w} (${ogImageUrl})`);
          if (reportedH !== local.h) results.push(`${rel}: og:image:height=${reportedH} doesn't match actual image height ${local.h} (${ogImageUrl})`);
        } else if (reportedW < 200 || reportedH < 100) {
          results.push(`${rel}: og:image dimensions look too small (${reportedW}x${reportedH}) for ${ogImageUrl}`);
        }
      }
    }
  }
  return results;
}

// ─── Check 9: CSS build warnings ─────────────────────────────────────────────
// Runs `astro build` and scans stdout/stderr for CSS warnings
function checkCSSBuildWarnings(cache) {
  return cache.cssBuildWarnings || [];
}



// ─── Check 10: trailing-slash internal links ───────────────────────────────
// The site config uses trailingSlash: 'never'. Source links to /path/ create
// avoidable 3XX redirects and crawl noise.
function checkTrailingSlashInternalLinks(cache) {
  const results = [];
  const quotedInternalRouteRe = /["'](\/[^\"'?]+\/)(?=[#']|["'])/g;
  // JS code that uses path strings inside .includes() / .test() / RegExp()
  // is a false-positive source for the regex above. Skip lines whose
  // content contains a JS string-method call on the path literal.
  const jsContextRe = /\.(?:includes|test|match|exec|search|indexOf|concat)\s*\(|new\s+RegExp\s*\(|`[^`]*\$\{|\/\//;
  const skipPrefixes = ['/images/', '/fonts/', '/_astro/', '/downloads/', '/pdfs/'];

  cache.sourceFiles.forEach(({ file, rel, text, lines }) => {
    let m;
    while ((m = quotedInternalRouteRe.exec(text)) !== null) {
      const href = m[1];
      if (href === '/' || skipPrefixes.some(prefix => href.startsWith(prefix))) continue;
      const lastSegment = href.replace(/\/$/, '').split('/').pop() || '';
      if (path.extname(lastSegment)) continue;
      // Skip lines that are JS code, not link hrefs.
      const lineNum = text.slice(0, m.index).split(/\r?\n/).length;
      const line = lines[lineNum - 1] || '';
      // Sprint 78ab: also skip JSX string-concat expressions like
      // `currentPath={'/guides/' + cluster.slug}`. The static `/guides/` is
      // part of a JS expression that produces `/guides/{slug}` at render-time —
      // no trailing slash in the rendered output. Detect by:
      //   - the line contains `<` (JSX element) AND
      //   - the static part is followed by `+ ` (string concat) within the same attr
      // Most general heuristic: if the line contains `+ cluster` or `+ slug` or `+ slug)`
      // on the same logical line as our match, it's a JSX expression, not a route literal.
      const jsxStringConcatExpr = /\{\s*['"`][^'"`]*['"`]\s*\+/;
      if (jsxStringConcatExpr.test(line)) continue;
      if (jsContextRe.test(line)) continue;
      results.push(`${rel}:${lineNum}: trailing-slash internal route string → ${href}`);
    }
  });

  return results;
}

function routeForHtml(distPath, filePath) {
  const rel = path.relative(distPath, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

function htmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function htmlDecode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractAttr(tag, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? htmlDecode(m[1]) : '';
}

// ─── Check 11: rendered crawl basics ─────────────────────────────────────────
// Mirrors the Ahrefs issue classes that have regressed before: broken rendered
// images/assets, internal page links to missing routes, overlong SEO metadata,
// malformed JSON-LD, and /download parent breadcrumbs.
function checkRenderedCrawlBasics(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];

  const routes = cache.routeSet;
  const skipHrefPrefixes = ['/images/', '/fonts/', '/_astro/', '/downloads/', '/pdfs/'];

  function assetExists(urlPath) {
    const clean = urlPath.split('#')[0].split('?')[0];
    return fs.existsSync(path.join(PUBLIC_DIR, clean.replace(/^\//, ''))) ||
      fs.existsSync(path.join(DIST, clean.replace(/^\//, '')));
  }

  for (const { rel, route, text } of cache.renderedHtmlFiles) {

    const title = htmlDecode((text.match(/<title>(.*?)<\/title>/is)?.[1] || '').replace(/\s+/g, ' ').trim());
    if (title.length > 60) results.push(`${rel}: title too long (${title.length})`);

    const descTag = text.match(/<meta\s+[^>]*name=["']description["'][^>]*>/i)?.[0] || '';
    const desc = extractAttr(descTag, 'content');
    if (desc.length > 160) results.push(`${rel}: meta description too long (${desc.length})`);

    const mediaRe = /<(?:img|source)\s+[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*>/gi;
    let mediaMatch;
    while ((mediaMatch = mediaRe.exec(text)) !== null) {
      const raw = mediaMatch[1].split(',')[0].trim().split(/\s+/)[0];
      if (!raw || raw.startsWith('http') || raw.startsWith('data:')) continue;
      if (raw.startsWith('/') && !assetExists(raw)) results.push(`${rel}: broken rendered media → ${raw}`);
    }

    const hrefRe = /href=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRe.exec(text)) !== null) {
      const raw = htmlDecode(hrefMatch[1]);
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
      let target = '';
      try {
        if (raw.startsWith('http')) {
          const parsed = new URL(raw);
          if (!['mainedispensaryguide.com', 'www.mainedispensaryguide.com'].includes(parsed.hostname)) continue;
          target = parsed.pathname || '/';
        } else if (raw.startsWith('/')) {
          target = raw;
        }
      } catch {
        continue;
      }
      if (!target) continue;
      target = decodeURIComponent(target.split('#')[0].split('?')[0]);
      const normalized = target.replace(/\/$/, '') || '/';
      if (skipHrefPrefixes.some(prefix => target.startsWith(prefix)) || path.extname(target)) {
        if (!assetExists(target)) results.push(`${rel}: broken rendered asset link → ${target}`);
      } else if (target !== '/' && target.endsWith('/') && routes.has(normalized)) {
        results.push(`${rel}: rendered internal link redirects under trailingSlash=never → ${target}`);
      } else if (!routes.has(normalized)) {
        results.push(`${rel}: broken rendered internal link → ${target} from ${route}`);
      }
    }

    const scriptRe = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let scriptMatch;
    while ((scriptMatch = scriptRe.exec(text)) !== null) {
      const jsonText = htmlDecode(scriptMatch[1].trim());
      try {
        const data = JSON.parse(jsonText);
        if (data && data['@type'] === 'BreadcrumbList') {
          for (const item of data.itemListElement || []) {
            const href = item && item.item ? String(item.item) : '';
            if (href.endsWith('/download') || href.endsWith('/download/')) {
              results.push(`${rel}: breadcrumb points to missing /download parent`);
            }
          }
        }
      } catch (err) {
        results.push(`${rel}: invalid JSON-LD (${err.message})`);
      }
    }
  }

  return results;
}

// ─── Check 12: sitemap XML escaping ────────────────────────────────────────
// Sitemap parsers require '&' to be escaped as '&amp;' in XML content.
function checkSitemapXmlEntities(cache) {
  if (!fs.existsSync(SITEMAP)) {
    return ['sitemap-0.xml not found — run build first'];
  }

  const xml = cache.sitemapXml;
  const invalid = [...xml.matchAll(/&(?![a-zA-Z0-9#]+;)/g)];
  if (invalid.length === 0) return [];
  const positions = invalid.slice(0, 5).map(m => m.index);
  const sample = positions.length ? ` (sample positions: ${positions.join(', ')})` : '';
  const more = invalid.length > 5 ? ` (+${invalid.length - 5} more)` : '';
  return [`sitemap-0.xml contains ${invalid.length} unescaped '&' entity violation${invalid.length > 1 ? 's' : ''}${sample}${more}`];
}

// ─── Check 19: meta description uniqueness ──────────────────────────────────
//
// Catches duplicate meta descriptions across pages. Each page should have
// a unique description — duplicates dilute the page's value in search
// snippets and signal low content diversity to Google. The 2026-07-02
// senior SEO sweep confirmed 0 duplicates; this check prevents regressions.
function checkMetaDescriptionUniqueness(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const seen = new Map(); // desc -> first route
  for (const { route, text } of cache.renderedHtmlFiles) {
    const m = text.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (!m) continue;
    const desc = m[1].trim();
    if (!desc) continue;
    if (seen.has(desc)) {
      if (results.length < 5) results.push(`duplicate description on ${route} (also on ${seen.get(desc)})`);
    } else {
      seen.set(desc, route);
    }
  }
  return results;
}

// ─── Check 18: sitemap lastmod coverage ────────────────────────────────────
//
// Catches the "sitemap URL emitted without a <lastmod> child" bug. Google's
// crawl prioritization uses <lastmod>; missing it means Googlebot guesses
// (it picks the build date, not the actual content update). The 2026-07-02
// senior SEO sweep found 25 of 222 URLs missing lastmod (every page
// without an `article={...}` frontmatter prop). The fix in astro.config.mjs
// falls back to source-file mtime when no article-modifiedDate exists;
// this check prevents regressions.
function checkSitemapLastmod(cache) {
  const results = [];
  if (!fs.existsSync(SITEMAP)) return ['sitemap-0.xml not found — run build first'];
  const xml = cache.sitemapXml;
  // Match each <url>...</url> entry. Per-entry scan is more reliable than the
  // old per-tag regex (which fails when whitespace falls between </loc> and
  // <lastmod>; produced 5 false-positives on 2026-07-08 against a sitemap
  // where every entry actually had a lastmod).
  const entryRe = /<url>([\s\S]*?)<\/url>/g;
  const entryLastmodRe = /<lastmod>([^<]+)<\/lastmod>/;
  const entryLocRe = /<loc>([^<]+)<\/loc>/;
  const matches = [...xml.matchAll(entryRe)];
  let missing = 0;
  for (const m of matches) {
    const block = m[1];
    const url = (block.match(entryLocRe) || [])[1] || '';
    const hasLastmod = entryLastmodRe.test(block);
    if (!hasLastmod) {
      missing++;
      if (results.length < 5) results.push(`no <lastmod>: ${url}`);
    }
  }
  if (missing > 0 && results.length === 0) results.push(`${missing} URLs missing <lastmod>`);
  return results;
}

// ─── Check 17: orphan pages (no inbound internal link) ─────────────────────
//
// Catches public, indexed pages that have zero inbound links from any
// other page on the site. Such pages don't get PageRank flow, are crawled
// less efficiently by Googlebot, and don't surface in user navigation.
//
// The 2026-07-02 senior SEO sweep found 30+ real orphans (mostly smaller
// city guides and a handful of blog posts). The full link-building fix
// is a content-sprint decision (requires Hub sign-off — touching the
// homepage and 30+ guide pages). This check makes the problem
// non-regressing: future PRs that add a new page without linking to it
// from at least one other page will be caught.
function checkOrphanPages(cache) {
  if (ROOT !== DEFAULT_ROOT) return [];
  const results = [];
  if (!fs.existsSync(ROOT)) return ['pages/ not found'];
  const NOINDEX_PATHS = new Set([
    '/404', '/admin', '/experiments', '/search', '/download/roadmap',
    '/embed/opt-in-tracker', '/guides/all-cities',
  ]);
  function routeForSource(rel) {
    const relRaw = rel.replace(/\.astro$/, '');
    return '/' + (relRaw === 'index' ? '' : relRaw.replace(/\/index$/, ''));
  }
  function isNoindex(entry) {
    return /noindex\s*=\s*\{\s*true\s*\}/.test(entry.text);
  }
  function findInboundLink(needle, excludeFile, targetRoute) {
    const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re1 = new RegExp(`href\\s*=\\s*["']\\/?${escaped}(?:["'#?]|$)`);
    const re2 = new RegExp(`href\\s*:\\s*["']\\/?${escaped}(?:["'#?]|$)`);
    const hrefRe = /href\s*=\s*["'](?!https?:\/\/|tel:|mailto:|\/\/)([^"']+)["']/g;
    for (const entry of cache.sourceFiles) {
      if (entry.file === excludeFile) continue;
      if (re1.test(entry.text) || re2.test(entry.text)) return entry.file;
      let m;
      while ((m = hrefRe.exec(entry.text)) !== null) {
        const raw = m[1];
        const pagePath = raw.split('#')[0].split('?')[0];
        if (!pagePath || pagePath.startsWith('#') || pagePath.includes('\\')) continue;
        const resolved = pagePath.startsWith('/')
          ? pagePath.replace(/\/$/, '') || '/'
          : '/' + path.relative(ROOT, path.resolve(path.dirname(entry.file), pagePath)).replace(/\\/g, '/').replace(/\/$/, '');
        if ((resolved || '/') === targetRoute) return entry.file;
      }
    }
    return '';
  }
  function findInboundFromRendered(needle, route) {
    const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`href\\s*=\\s*["']\\/?${escaped}(?:["'/#?]|$)`, 'm');
    for (const entry of cache.renderedHtmlFiles) {
      if (entry.route === route) continue;
      if (re.test(entry.text)) return entry.file;
    }
    return '';
  }
  for (const entry of cache.sourceFiles) {
    if (isNoindex(entry)) continue;
    const rel = routeForSource(entry.rel);
    if (rel === '/') continue;
    const normalized = rel.replace(/\/$/, '') || '/';
    if (NOINDEX_PATHS.has(normalized)) continue;
    const needle = rel.replace(/^\//, '');
    const foundSrc = findInboundLink(needle, entry.file, normalized);
    const foundDist = findInboundFromRendered(needle, normalized);
    if (!foundSrc && !foundDist) results.push(`${normalized}: no inbound link from any other page`);
  }
  return results;
}

// ─── Check 16: og:type matches page role ───────────────────────────────────
//
// Catches hub pages (homepage, /about, /all-guides, /blog, /guides, /learn)
// that emit og:type=article instead of og:type=website. Article type is
// only correct for single-content pages; hub/index pages should be
// `website`. The 2026-07-02 QA sweep found 4 hub pages emitting
// `og:type=article`. Hub pages are identified by Layout.astro's
// isHub={true} prop or by being one of the canonical hub routes below.
function checkOgTypeMatchesRole(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const HUB_ROUTES = new Set([
    '/', '/about', '/blog', '/all-guides', '/guides', '/learn', '/glossary',
    '/find-a-dispensary', '/resources', '/directory', '/blog/index',
  ]);
  for (const { route, text } of cache.renderedHtmlFiles) {
    const rel = route.replace(/\/$/, '') || '/';
    if (!HUB_ROUTES.has(rel)) continue;
    const m = text.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i);
    if (m && m[1] !== 'website') results.push(`${rel}: hub page emits og:type=${m[1]} (should be website)`);
  }
  return results;
}

// ─── Check 15: title not truncated mid-sentence ────────────────────────────
//
// Catches the "60-char guard cut a title at a word/punctuation boundary and
// left it visibly broken" class — the Sprint 74 audit pass 2 found 4 such
// cases in the new B2B guides, but the same audit didn't run across the 47
// existing tech guides, 35 blog posts, and 109 city guides. A 2026-07-02 QA
// sweep found 13 more (see docs/SENIOR_REVIEW_2026-07-02.md). The fix lives
// in lib/seo.ts buildFullTitle; this check makes the fix non-regressing.
function checkTitleTruncation(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const ALLOWLIST = new Set(['/404']);
  const TRAILING_PUNCT = /[,;:—\-–]$/;
  const TRAILING_CONNECTOR = /\s+(?:and|or|the|for|to|of|a|an|in|with|on|by|at|from)$/i;
  for (const { route, text } of cache.renderedHtmlFiles) {
    if (ALLOWLIST.has(route.replace(/\/$/, '') || '/')) continue;
    const title = htmlDecode((text.match(/<title>(.*?)<\/title>/is)?.[1] || '').replace(/\s+/g, ' ').trim());
    if (!title) continue;
    if (TRAILING_PUNCT.test(title)) results.push(`${route}: title ends with trailing punctuation → ${title}`);
    else if (TRAILING_CONNECTOR.test(title)) results.push(`${route}: title ends with connector word → ${title}`);
  }
  return results;
}

// ─── Check 14: duplicate hero image content (MD5 sweep) ─────────────────────
//
// Catches the directory-coverage copy-paste bug: a single stock image saved
// to many filenames. Path-existence checks don't catch this — same path, same
// content, just different filenames. All town/region hero images should be
// unique content so the page they reference shows a town-specific photo.
//
// Operators can whitelist intentional shared fallbacks (granite hero, generic
// compliance graphics) by adding the MD5 to
// `scripts/content/known-shared-hero-hashes.txt`.
function checkDuplicateHeroImages() {
  const results = [];
  if (!fs.existsSync(PUBLIC_DIR)) {
    return [`public/ directory not found at ${PUBLIC_DIR}`];
  }
  const heroesDir = path.join(PUBLIC_DIR, 'images', 'heroes');
  if (!fs.existsSync(heroesDir)) {
    return [];  // no heroes directory is fine
  }
  const crypto = require('node:crypto');
  // Load whitelist (one MD5 per line, # comments OK, blank lines OK)
  const whitelistPath = path.join(__dirname, 'known-shared-hero-hashes.txt');
  const whitelisted = new Set();
  if (fs.existsSync(whitelistPath)) {
    for (const line of fs.readFileSync(whitelistPath, 'utf8').split('\n')) {
      const stripped = line.replace(/#.*/, '').trim().toLowerCase();
      if (/^[0-9a-f]{32}$/.test(stripped)) whitelisted.add(stripped);
    }
  }
  // Sweep hero images, group by MD5
  const hashToFiles = new Map();
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  for (const f of fs.readdirSync(heroesDir)) {
    const p = path.join(heroesDir, f);
    if (!fs.statSync(p).isFile()) continue;
    if (!imageExts.includes(path.extname(f).toLowerCase())) continue;
    const buf = fs.readFileSync(p);
    const h = crypto.createHash('md5').update(buf).digest('hex');
    if (!hashToFiles.has(h)) hashToFiles.set(h, []);
    hashToFiles.get(h).push(f);
  }
  // Report every hash that appears in 2+ files, unless whitelisted.
  for (const [h, files] of hashToFiles) {
    if (files.length < 2) continue;
    if (whitelisted.has(h)) continue;
    results.push(
      `hash ${h.slice(0, 8)}... shared across ${files.length} files: ${files.slice(0, 6).join(', ')}${files.length > 6 ? ` (+${files.length - 6} more)` : ''}`
    );
  }
  return results;
}

// ─── Run all checks ───────────────────────────────────────────────────────────
// ─── Check 13: duplicate FAQPage JSON-LD ─────────────────────────────────────
//
// A page that has both an inline `<script type="application/ld+json">` with
// `@type: FAQPage` AND a `<Faq />` component (which auto-injects the same
// schema) ends up with two identical blocks in dist/. Wastes bytes and may
// confuse Google structured-data parsers. Catches the regression that
// shipped in 116 pages before Sprint 80.
function checkDuplicateFaqPageSchema(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const FAQ_GENERATOR_PAGES = new Set(['/guides/faq']);
  for (const { rel, route, text } of cache.renderedHtmlFiles) {
    if (FAQ_GENERATOR_PAGES.has(route)) continue;
    const scriptRe = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
    let count = 0;
    for (const m of text.matchAll(scriptRe)) {
      if (/"@type"\s*:\s*"FAQPage"/.test(m[1])) count++;
    }
    if (count > 1) results.push(rel);
  }
  return results;
}

// ─── Check 20: YMYL reviewer-byline coverage ─────────────────────────────
// Sprint 83: Every YMYL blog post must declare a reviewer in frontmatter.
// Source-level check — does not require a build.
//
// YMYL = pages where inaccurate content could harm a reader making
// decisions about health, safety, money, or legal status. For this
// site the YMYL blog list is hardcoded below because the surface is
// bounded and stable (YMYL review is content-team-driven, not
// algorithmic). Adding a new YMYL page requires updating this list.
const YMYL_BLOG_PAGES = [
  'blog/maine-rso-guide.astro',
  'blog/buying-cannabis-by-effect-2026.astro',
  'blog/cannabis-terpenes-explained-maine-2026.astro',
  'blog/best-maine-edibles-2026.astro',
  'blog/maine-medical-marijuana-patient-guide.astro',
  'blog/recreational-cannabis-near-acadia.astro',
  'blog/cannabis-friendly-maine-travel.astro',
  'blog/maine-cannabis-budtender-careers.astro',
  'blog/ibogaine-federal-executive-order-maine-2026.astro',
  'blog/trump-psychedelic-executive-order-maine-psilocybin-2026.astro',
  'blog/maine-medical-cannabis-pesticide-advisory-2026.astro',
  'blog/maine-psilocybin-2026-guide.astro',
  'blog/maine-home-grow-cannabis-guide-2026.astro',
];

function checkYMYLReviewerCoverage(cache) {
  if (ROOT !== DEFAULT_ROOT) return [];
  const results = [];
  YMYL_BLOG_PAGES.forEach(rel => {
    const entry = sourceEntry(cache, rel);
    if (!entry) {
      results.push(`${rel}: file not found`);
      return;
    }
    const text = entry.text;
    const hasReviewerField = /reviewer\s*:\s*complianceReviewer\s*\?/.test(text)
      || /reviewer\s*:\s*\{\s*name\s*:/.test(text)
      || /reviewer\s*:\s*undefined/.test(text);
    const hasReviewedByByline = /Reviewed by\s+/i.test(text);
    const hasComplianceReviewerImport = /const complianceReviewer\s*=\s*authors\.find/.test(text);

    if (!hasReviewerField && !(hasReviewedByByline && hasComplianceReviewerImport)) {
      results.push(`${rel}: YMYL page missing reviewer (no reviewer: frontmatter field AND no "Reviewed by" byline in body)`);
    }
  });
  return results;
}

const CHECKS = [
  { name: 'bare href="#" links', phase: 'source', fn: checkHrefHash },
  { name: 'malformed frontmatter', phase: 'source', fn: checkFrontmatter },
  { name: 'fake anchor buttons', phase: 'source', fn: checkFakeAnchorsInStores },
  { name: 'typo literals', phase: 'source', fn: checkTypoLiterals },
  { name: 'dead internal links', phase: 'source', fn: checkDeadInternalLinks },
  { name: 'malformed \\1 hrefs', phase: 'source', fn: checkMalformedBackrefHrefs },
  { name: 'trailing-slash internal links', phase: 'source', fn: checkTrailingSlashInternalLinks },
  { name: 'CSS build warnings', phase: 'preflight', fn: checkCSSBuildWarnings },
  { name: 'noindex pages in sitemap', phase: 'rendered', fn: checkNoindexInSitemap },
  { name: 'OG image dimensions', phase: 'rendered', fn: checkOGImageDimensions },
  { name: 'sitemap XML entities', phase: 'rendered', fn: checkSitemapXmlEntities },
  { name: 'rendered crawl basics', phase: 'rendered', fn: checkRenderedCrawlBasics },
  { name: 'duplicate hero image content', phase: 'source', fn: checkDuplicateHeroImages },
  { name: 'duplicate FAQPage JSON-LD', phase: 'rendered', fn: checkDuplicateFaqPageSchema },
  { name: 'title not truncated mid-sentence', phase: 'rendered', fn: checkTitleTruncation },
  { name: 'og:type matches page role', phase: 'rendered', fn: checkOgTypeMatchesRole },
  { name: 'orphan pages (no inbound link)', phase: 'rendered', fn: checkOrphanPages },
  { name: 'sitemap lastmod coverage', phase: 'rendered', fn: checkSitemapLastmod },
  { name: 'meta description uniqueness', phase: 'rendered', fn: checkMetaDescriptionUniqueness },
  { name: 'YMYL reviewer-byline coverage', phase: 'source', fn: checkYMYLReviewerCoverage },
  { name: 'body-internal-link minimum (Sprint 84)', phase: 'rendered', fn: checkBodyInternalLinkMinimum },
];

// ─── Check 21: body-internal-link minimum ──────────────────────────────
// Sprint 84: ensures every guide has at least N body-contextual internal
// links. The RelatedArticles sidebar already provides 50+ links per page,
// but those are siloed in the sidebar. This check catches the case where
// the BODY has zero contextual links — a known SEO signal of orphan-thin
// content. A real failure example: 2 city guides (Auburn, Kittery) had
// 0 body-internal links before Sprint 84's linkifier ran.
//
// Built-output check (requires dist/). Uses the rendered HTML (not source)
// because the body of an Astro page is the post-render tree, and the
// related-articles sidebar lives in a different DOM scope (a sibling
// <aside>), so the two surfaces are measured independently.
//
// MIN_BODY_INTERNAL_LINKS = 3 (excluding self-references). Pages that
// fail this check either need: (a) more body content with contextual
// references, (b) hand-curated sibling links, or (c) the linkifier
// re-run with additional rules.
function checkBodyInternalLinkMinimum(cache) {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const MIN_BODY_INTERNAL_LINKS = 3;
  const SCOPE_RE = /^\/(guides|blog|learn)(?:\/|$)/;
  for (const { route, rel, text } of cache.renderedHtmlFiles) {
    if (!SCOPE_RE.test(route)) continue;
    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (!mainMatch) continue;
    const mainNoSidebar = mainMatch[1].replace(/<aside class="related-articles[\s\S]*?<\/aside>/g, '');
    const hrefs = new Set();
    for (const m of mainNoSidebar.matchAll(/href="(\/[^"#?]+)"/g)) hrefs.add(m[1]);
    hrefs.delete(route);
    if (hrefs.size < MIN_BODY_INTERNAL_LINKS) results.push(rel);
  }
  return results;
}


let totalFailures = 0;
let totalWarnings = 0;

console.log('🔍 Content Health QA\n');

const cssBuildWarnings = runBuildPreflight();
const cache = buildAuditCache();
cache.cssBuildWarnings = cssBuildWarnings;

const activeChecks = CHECKS.filter(({ phase }) => {
  if (OPTIONS.sourceOnly) return phase === 'source';
  if (OPTIONS.renderedOnly) return phase === 'rendered' || phase === 'preflight';
  return true;
});

activeChecks.forEach(({ name, fn }) => {
  try {
    const issues = fn(cache);
    if (issues.length === 0) {
      console.log(`✅  ${name}: OK`);
    } else {
      totalFailures += issues.length;
      console.log(`❌  ${name}: ${issues.length} issue(s)`);
      issues.slice(0, 5).forEach(i => console.log(`    → ${i}`));
      if (issues.length > 5) console.log(`    … and ${issues.length - 5} more`);
    }
  } catch (err) {
    console.log(`⚠️   ${name}: ERROR — ${err.message}`);
    totalWarnings++;
  }
});

console.log(`\n──`);
console.log(`Total: ${totalFailures} failure(s), ${totalWarnings} warning(s)`);

if (totalFailures > 0) {
  console.log('\nFix all failures before shipping. Run with --verbose for full output.');
  process.exit(1);
} else if (totalWarnings > 0) {
  process.exit(2);
} else {
  console.log('\n✅ All content health checks passed.');
  process.exit(0);
}
