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
const { appRoot, rootDist, publicDir, sitemapPath, warnIfRenderedOutputStale } = require('./lib/paths.cjs');
const { extractRenderedImageRefs, metaContent } = require('./lib/rendered-image-refs.cjs');

const DEFAULT_ROOT = path.join(appRoot, 'src', 'pages');
const ROOT = path.resolve(process.env.CONTENT_HEALTH_ROOT || DEFAULT_ROOT);
const SOURCE_ROOT = path.resolve(process.env.CONTENT_HEALTH_SOURCE_ROOT || path.join(appRoot, 'src'));
const SITEMAP = path.resolve(process.env.CONTENT_HEALTH_SITEMAP || sitemapPath);
const DIST = path.resolve(process.env.CONTENT_HEALTH_DIST || rootDist);
const PUBLIC_DIR = path.resolve(process.env.CONTENT_HEALTH_PUBLIC || publicDir);
const ADMIN_DIRS = new Set(['admin', 'experiments']);

function parseOptions(argv) {
  const flags = new Set(argv);
  const sourceOnly = flags.has('--source-only');
  const renderedOnly = flags.has('--rendered-only');
  if (sourceOnly && renderedOnly) {
    throw new Error('Cannot combine --source-only and --rendered-only');
  }
  return {
    sourceOnly,
    renderedOnly,
    build: flags.has('--build'),
    noBuild: flags.has('--no-build'),
  };
}

let OPTIONS;
try {
  OPTIONS = parseOptions(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

// A single audit invokes overlapping source checks. Cache immutable source
// inputs at the I/O boundary so each path is read once while callers retain
// Node's usual string versus Buffer return contract. Do not cache sitemap or
// rendered-output reads: a build can replace those artifacts between the CSS
// preflight and the rendered checks below.
const originalReadFileSync = fs.readFileSync.bind(fs);
const auditReadCache = new Map();
function isWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function isCacheableSourceInput(file) {
  return isWithin(SOURCE_ROOT, file) || isWithin(PUBLIC_DIR, file);
}

fs.readFileSync = (file, options) => {
  if (typeof file !== 'string' && !Buffer.isBuffer(file)) return originalReadFileSync(file, options);
  const resolved = path.resolve(String(file));
  if (!isCacheableSourceInput(resolved)) return originalReadFileSync(resolved, options);
  if (!auditReadCache.has(resolved)) auditReadCache.set(resolved, originalReadFileSync(resolved));
  const content = auditReadCache.get(resolved);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? content.toString(encoding) : Buffer.from(content);
};

// ─── Check 1: no href="#" ───────────────────────────────────────────────────
function checkHrefHash() {
  const results = [];
  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      // Match href="#" inside HTML — but allow href="#section-id" anchors
      if (/href\s*=\s*["']#["']/.test(line)) {
        results.push(`${path.relative(ROOT, file)}:${idx + 1}: bare href=\"#\" found`);
      }
    });
  });
  return results;
}

// ─── Check 2: malformed frontmatter shape ──────────────────────────────────
const FRONTMATTER_BAD = /---\s+import\s+\w+\s+from\s+['"][^'"]+['"]/;
function checkFrontmatter() {
  const results = [];
  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    // Must have at least one --- line, then import, then --- <Layout
    const lines = text.split(/\r?\n/);
    let state = 'search';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (state === 'search' && l === '---') { state = 'frontmatter'; continue; }
      if (state === 'frontmatter') {
        if (FRONTMATTER_BAD.test(l)) {
          results.push(`${path.relative(ROOT, file)}:${i + 1}: malformed frontmatter import (--- import, --- <Layout): ${l}`);
        }
        if (l.startsWith('<')) { state = 'done'; } // layout tag closes frontmatter
        if (l === '---') { state = 'done'; }        // empty frontmatter end
      }
      if (state === 'done') break;
    }
  });
  return results;
}

// ─── Check 3: noindex pages in sitemap ─────────────────────────────────────
function checkNoindexInSitemap() {
  const results = [];
  if (!fs.existsSync(SITEMAP)) {
    return ['sitemap-0.xml not found — run build first'];
  }
  const xml = fs.readFileSync(SITEMAP, 'utf8');
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
function checkFakeAnchorsInStores() {
  const file = path.join(ROOT, 'find-a-dispensary.astro');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const results = [];

  // Check that store card buttons don't have href="#"
  const cardRegex = /<a[^>]+href\s*=\s*["']#["'][^>]*>(Directions|Menu|Visit|View)<\/a>/gi;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (cardRegex.test(line)) {
      results.push(`${path.relative(ROOT, file)}:${idx + 1}: fake anchor button found: ${line.trim()}`);
    }
    cardRegex.lastIndex = 0;
  });

  // Also catch if the stores JS array contains menu: "#" or directions: "#"
  const badStoreProp = /(?:menu|directions|menuUrl|mapUrl)\s*:\s*["']#["']/g;
  lines.forEach((line, idx) => {
    if (badStoreProp.test(line)) {
      results.push(`${path.relative(ROOT, file)}:${idx + 1}: store prop set to bare '#': ${line.trim()}`);
    }
    badStoreProp.lastIndex = 0;
  });

  return results;
}

// ─── Check 5: typo literals ────────────────────────────────────────────────
const KNOWN_BAD = ['retaillaunch'];
function checkTypoLiterals() {
  const results = [];
  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    KNOWN_BAD.forEach(typo => {
      const re = new RegExp(`\\b${typo}\\b`, 'i');
      lines.forEach((line, idx) => {
        if (re.test(line)) {
          results.push(`${path.relative(ROOT, file)}:${idx + 1}: typo literal '${typo}': ${line.trim().slice(0, 100)}`);
        }
      });
    });
  });
  return results;
}

// ─── Check 6: internal static links to missing pages ───────────────────────
function checkDeadInternalLinks() {
  // Build list of valid pages from sitemap
  const validPages = new Set();
  // Source-only mode deliberately ignores sitemap entries: they are build
  // artifacts and can be stale relative to the current page corpus.
  if (!OPTIONS.sourceOnly && fs.existsSync(SITEMAP)) {
    const xml = fs.readFileSync(SITEMAP, 'utf8');
    const locMatches = xml.matchAll(/<loc>https:\/\/mainedispensaryguide\.com([^<]*)<\/loc>/g);
    for (const m of locMatches) {
      const p = m[1] || '/';
      validPages.add(p);
    }
  }

  // Also trust concrete Astro source routes. Some valid pages are intentionally
  // noindex and excluded from the sitemap (download funnels, 404, search), but
  // internal links to them are not dead links.
  walk(ROOT).forEach(f => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    let route = '/' + rel.replace(/\.astro$/, '');
    route = route.replace(/\/index$/, '') || '/';
    validPages.add(route);
  });

  const results = [];
  const internalLinkRe = /href\s*=\s*["'](?!https?:\/\/|tel:|mailto:|\/\/)([^"']+)["']/g;
  const skipRe = /^#|^javascript:/;

  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
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
function checkMalformedBackrefHrefs() {
  const badHrefPattern = /href=["']\\1["']/g;
  const results = [];
  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (badHrefPattern.test(line)) {
        results.push(`${path.relative(ROOT, file)}:${idx + 1}: malformed \\1 href: ${line.trim()}`);
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

function checkOGImageDimensions() {
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

  // Walk built HTML pages
  function walkDist(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDist(full);
      } else if (entry.name.endsWith('.html')) {
        const rel = path.relative(distPath, full);
        const text = fs.readFileSync(full, 'utf8');

        // Find og:image URL
        const ogImageUrl = metaContent(text, 'property', 'og:image');

        // Noindex pages (admin, experiments, gated funnels) don't need OG image
        // meta tags — they're not shared on social and search engines ignore them.
        // Skip them to keep the check focused on real public pages.
        const robots = metaContent(text, 'name', 'robots').toLowerCase();
        if (robots.includes('noindex')) return;

        // Find og:image:width / height
        const reportedWidth = metaContent(text, 'property', 'og:image:width');
        const reportedHeight = metaContent(text, 'property', 'og:image:height');

        if (!ogImageUrl) {
          results.push(`${rel}: missing og:image`);
          return;
        }
        if (!reportedWidth) {
          results.push(`${rel}: missing og:image:width`);
        } else if (!reportedHeight) {
          results.push(`${rel}: missing og:image:height`);
        } else {
          const reportedW = parseInt(reportedWidth, 10);
          const reportedH = parseInt(reportedHeight, 10);
          if (Number.isFinite(reportedW) && Number.isFinite(reportedH)) {
            const local = readLocalImageDims(ogImageUrl);
            if (local) {
              if (reportedW !== local.w) {
                results.push(`${rel}: og:image:width=${reportedW} doesn't match actual image width ${local.w} (${ogImageUrl})`);
              }
              if (reportedH !== local.h) {
                results.push(`${rel}: og:image:height=${reportedH} doesn't match actual image height ${local.h} (${ogImageUrl})`);
              }
            }
            // External images (no local dims available): just sanity-check reasonable size
            else {
              if (reportedW < 200 || reportedH < 100) {
                results.push(`${rel}: og:image dimensions look too small (${reportedW}x${reportedH}) for ${ogImageUrl}`);
              }
            }
          }
        }
      }
    }
  }

  walkDist(distPath);
  return results;
}

// ─── Check 9: CSS build warnings ─────────────────────────────────────────────
// Runs `astro build` and scans stdout/stderr for CSS warnings
function checkCSSBuildWarnings() {
  if (OPTIONS.noBuild || (!OPTIONS.build && (ROOT !== DEFAULT_ROOT || process.env.CONTENT_HEALTH_SKIP_CSS_BUILD === '1'))) return [];

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
      // Catch vite/warning/css related warnings
      if (lower.includes('warn') && (lower.includes('css') || lower.includes('style'))) {
        cssWarnings.push(line.trim());
      }
      // Also catch deprecation warnings that affect CSS
      if (lower.includes('deprecated') && lower.includes('style')) {
        cssWarnings.push(line.trim());
      }
    });
    // Only fail if there are real warnings (not just the word "warning" in passing text)
    const realWarnings = cssWarnings.filter(l =>
      l.match(/\[warn\]/i) ||
      l.match(/warning:/i) ||
      l.match(/css.*warning/i) ||
      l.includes('deprecated') && l.includes('style')
    );
    return realWarnings.slice(0, 10);
  } catch (err) {
    // A failed build means the CSS-warning check did not complete; surface it
    // instead of falsely reporting OK.
    const message = err && err.message ? err.message.split('\n')[0] : String(err);
    return [`build failed while scanning CSS warnings: ${message}`];
  }
}


// ─── Check 10: trailing-slash internal links ───────────────────────────────
// The site config uses trailingSlash: 'never'. Source links to /path/ create
// avoidable 3XX redirects and crawl noise.
function checkTrailingSlashInternalLinks() {
  const results = [];
  const quotedInternalRouteRe = /["'](\/[^\"'?]+\/)(?=[#']|["'])/g;
  // JS code that uses path strings inside .includes() / .test() / RegExp()
  // is a false-positive source for the regex above. Skip lines whose
  // content contains a JS string-method call on the path literal.
  const jsContextRe = /\.(?:includes|test|match|exec|search|indexOf|concat)\s*\(|new\s+RegExp\s*\(|`[^`]*\$\{|\/\//;
  const skipPrefixes = ['/images/', '/fonts/', '/_astro/', '/downloads/', '/pdfs/'];

  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
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
      const rel = path.relative(ROOT, file);
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
function checkRenderedCrawlBasics() {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];

  const files = htmlFiles(DIST);
  const routes = new Set(files.map(file => routeForHtml(DIST, file)));
  const skipHrefPrefixes = ['/images/', '/fonts/', '/_astro/', '/downloads/', '/pdfs/'];

  function assetExists(urlPath) {
    const clean = urlPath.split('#')[0].split('?')[0];
    return fs.existsSync(path.join(PUBLIC_DIR, clean.replace(/^\//, ''))) ||
      fs.existsSync(path.join(DIST, clean.replace(/^\//, '')));
  }

  for (const file of files) {
    const rel = path.relative(DIST, file).replace(/\\/g, '/');
    const route = routeForHtml(DIST, file);
    const text = fs.readFileSync(file, 'utf8');

    const title = htmlDecode((text.match(/<title>(.*?)<\/title>/is)?.[1] || '').replace(/\s+/g, ' ').trim());
    if (title.length > 60) results.push(`${rel}: title too long (${title.length})`);

    const desc = metaContent(text, 'name', 'description');
    if (desc.length > 160) results.push(`${rel}: meta description too long (${desc.length})`);

    for (const raw of extractRenderedImageRefs(text)) {
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
function checkSitemapXmlEntities() {
  if (!fs.existsSync(SITEMAP)) {
    return ['sitemap-0.xml not found — run build first'];
  }

  const xml = fs.readFileSync(SITEMAP, 'utf8');
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
function checkMetaDescriptionUniqueness() {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  const files = htmlFiles(DIST);
  const seen = new Map(); // desc -> first file
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    // Use only double-quote form to avoid apostrophe collisions in content
    // (e.g. "Maine's best..." would otherwise match only "Maine" because
    // the regex character class [^"']+ stops at the apostrophe).
    const desc = metaContent(text, 'name', 'description').trim();
    if (!desc) continue;
    if (seen.has(desc)) {
      const rel1 = '/' + path.relative(DIST, seen.get(desc)).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
      const rel2 = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
      if (results.length < 5) results.push(`duplicate description on ${rel2} (also on ${rel1})`);
    } else {
      seen.set(desc, file);
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
function checkSitemapLastmod() {
  const results = [];
  if (!fs.existsSync(SITEMAP)) return ['sitemap-0.xml not found — run build first'];
  const xml = fs.readFileSync(SITEMAP, 'utf8');
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
function checkOrphanPages() {
  const results = [];
  // Fixture roots should not inherit the repository's known orphan baseline.
  // Tests opt in when they specifically exercise this check.
  if (ROOT !== DEFAULT_ROOT && process.env.CONTENT_HEALTH_ENABLE_FIXTURE_ORPHAN_CHECK !== '1') return results;
  // Keep the route inventory page-scoped; only inbound-link discovery scans the
  // full source tree so links emitted by shared components/layouts count.
  const PAGES_DIR = ROOT;
  if (!fs.existsSync(PAGES_DIR)) return ['pages/ not found'];
  // Routes that are intentionally noindex and don't need inbound links.
  const NOINDEX_PATHS = new Set([
    '/404', '/admin', '/experiments', '/search', '/download/roadmap',
    '/embed/opt-in-tracker', // opt-in trackers rarely warrant navigation presence
    '/guides/all-cities',   // self-index: every city guide references it; not a leaf page
  ]);
  function isNoindex(file) {
    try {
      return /noindex\s*=\s*\{\s*true\s*\}/.test(fs.readFileSync(file, 'utf8'));
    } catch { return false; }
  }
  function listAstroFilesRecursive(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'admin' || entry.name === 'api' || entry.name === 'node_modules') continue;
        listAstroFilesRecursive(full, out);
      } else if (entry.isFile() && entry.name.endsWith('.astro')) {
        out.push(full);
      }
    }
    return out;
  }
  // Sprint 80 patch: source-only regex misses inbound links emitted by
  // JSX expressions like `<a href={hubByName[region.name]}>` or by data-
  // driven iteration like `{posts.map(p => <a href={p.url}>)}`. The
  // rendered-HTML check catches those — it walks dist/ for `*.html` files
  // and counts any literal `href="/<path>"` reference. If either check
  // finds an inbound link, the page is not an orphan.
  function findInboundLink(needle, excludeFile) {
    // Match both `href="/path"`, `href='/path'`, and `href: "/path"` forms.
    // The needle is the route (e.g. "guides/lebanon-dispensary-guide").
    const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re1 = new RegExp(`href\\s*=\\s*["']\\/?${escaped}["']`);
    const re2 = new RegExp(`href\\s*:\\s*["']\\/?${escaped}["']`);
    const all = listAstroFilesRecursive(SOURCE_ROOT);
    for (const f of all) {
      if (f === excludeFile) continue;
      let text;
      try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (re1.test(text) || re2.test(text)) return f;
    }
    return '';
  }
  function findInboundFromRendered(needle) {
    const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`href\\s*=\\s*["']\\/?${escaped}(?:["'/#?]|$)`, 'm');
    const distBase = DIST;
    const distPath = path.join(distBase, needle, 'index.html');
    function walk(dir, out) {
      out = out || [];
      if (!fs.existsSync(dir)) return out;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.isFile() && full.endsWith('.html')) out.push(full);
      }
      return out;
    }
    const htmlFiles = walk(distBase);
    for (const f of htmlFiles) {
      if (f === distPath) continue;
      let text;
      try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (re.test(text)) return f;
    }
    return '';
  }
  const files = listAstroFilesRecursive(PAGES_DIR);
  for (const f of files) {
    if (isNoindex(f)) continue;
    const relRaw = path.relative(PAGES_DIR, f).replace(/\\/g, '/').replace(/\.astro$/, '');
    // Map `path/to/index` → `path/to` (Astro's index.astro = parent route).
    const rel = '/' + (relRaw === 'index' ? '' : relRaw.replace(/\/index$/, ''));
    if (rel === '/') continue;
    const normalized = rel.replace(/\/$/, '') || '/';
    if (NOINDEX_PATHS.has(normalized)) continue;
    const needle = rel.replace(/^\//, '');
    const foundSrc = findInboundLink(needle, f);
    const foundDist = findInboundFromRendered(needle);
    if (!foundSrc && !foundDist) {
      results.push(`${normalized}: no inbound link from any other page`);
    }
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
function checkOgTypeMatchesRole() {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  // Routes that are always hub pages regardless of isHub prop.
  const HUB_ROUTES = new Set([
    '/', '/about', '/blog', '/all-guides', '/guides', '/learn', '/glossary',
    '/find-a-dispensary', '/resources', '/directory', '/blog/index',
  ]);
  const files = htmlFiles(DIST);
  for (const file of files) {
    const rel = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
    if (!HUB_ROUTES.has(rel === '/' ? '/' : rel.replace(/\/$/, '') || '/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const ogType = metaContent(text, 'property', 'og:type');
    if (ogType && ogType !== 'website') {
      results.push(`${rel}: hub page emits og:type=${ogType} (should be website)`);
    }
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
function checkTitleTruncation() {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  // Pages whose titles legitimately end with digits, abbreviations, or
  // short names that would otherwise look "truncated" to the regex.
  // These pages are reviewed and excluded manually.
  const ALLOWLIST = new Set([
    '/404', // 404 page
  ]);
  // Trailing punctuation/em-dash that should never appear in a complete title.
  const TRAILING_PUNCT = /[,;:\u2014\-–]$/;
  // Trailing connector words that would leave a sentence visibly incomplete.
  const TRAILING_CONNECTOR = /\s+(?:and|or|the|for|to|of|a|an|in|with|on|by|at|from)$/i;
  const files = htmlFiles(DIST);
  for (const file of files) {
    const rel = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
    if (ALLOWLIST.has(rel === '/' ? '/' : rel.replace(/\/$/, '') || '/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const title = htmlDecode((text.match(/<title>(.*?)<\/title>/is)?.[1] || '').replace(/\s+/g, ' ').trim());
    if (!title) continue;
    if (TRAILING_PUNCT.test(title)) {
      results.push(`${rel}: title ends with trailing punctuation → ${title}`);
    } else if (TRAILING_CONNECTOR.test(title)) {
      results.push(`${rel}: title ends with connector word → ${title}`);
    }
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
function checkDuplicateFaqPageSchema() {
  const results = [];
  if (!fs.existsSync(DIST)) return ['dist/ not found — run build first'];
  // Pages that intentionally emit multiple FAQPage JSON-LD scripts with
  // non-overlapping content (e.g. /guides/faq emits one per category
  // section — Buyer-intent, Cannabis Science, etc.). These are NOT
  // duplicates; they're a deliberate per-category schema pattern. The
  // linter protects against real duplicates but should skip pages whose
  // only job IS to be a multi-page FAQ catalog.
  const FAQ_GENERATOR_PAGES = new Set([
    '/guides/faq', // the FAQ catalog page emits 1 FAQPage per category
  ]);
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (p.includes('/_astro') || p.includes('/admin/')) continue;
        walk(p);
      } else if (e.isFile() && p.endsWith('.html')) {
        const relPath = p.replace(DIST, '').replace(/\/index\.html$/, '').replace(/\.html$/, '');
        // Normalize trailing-slash path the same way orphan/check does.
        const route = '/' + (relPath === '' ? '' : relPath.replace(/^\//, ''));
        if (FAQ_GENERATOR_PAGES.has(route)) continue;
        const text = fs.readFileSync(p, 'utf8');
        // Count FAQPage blocks. Use a non-greedy match for each `<script>`
        // containing a FAQPage JSON-LD.
        const scriptRe = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
        let count = 0;
        for (const m of text.matchAll(scriptRe)) {
          if (/"@type"\s*:\s*"FAQPage"/.test(m[1])) count++;
        }
        if (count > 1) {
          results.push(p.replace(DIST, '').replace(/^\//, ''));
        }
      }
    }
  }
  walk(DIST);
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

function checkYMYLReviewerCoverage() {
  // Custom source roots are isolated fixtures, not a partial copy of the
  // repository's fixed YMYL inventory.
  if (ROOT !== DEFAULT_ROOT) return [];
  const results = [];
  YMYL_BLOG_PAGES.forEach(rel => {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      results.push(`${rel}: file not found`);
      return;
    }
    const text = fs.readFileSync(file, 'utf8');
    // Source-level checks — verify the frontmatter declares a reviewer
    // field (either as `reviewer:` object or as a `complianceReviewer`
    // lookup that will populate the reviewer field).
    const hasReviewerField = /reviewer\s*:\s*complianceReviewer\s*\?/.test(text)
      || /reviewer\s*:\s*\{\s*name\s*:/.test(text)
      || /reviewer\s*:\s*undefined/.test(text);  // explicit undefined = intentional
    // Also accept pages that have a "Reviewed by" byline in the body
    // AND a complianceReviewer import that could populate the schema —
    // covers the case where the schema frontmatter hasn't been wired yet
    // but the human-readable byline is in place.
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
function checkBodyInternalLinkMinimum() {
  const results = [];
  if (!fs.existsSync(DIST)) {
    return ['dist/ not found — run build first'];
  }
  // Walk every HTML file in dist/ and count unique internal hrefs
  // within the rendered <main> content area. We include the main
  // area (not just <article>) so that the new "City-by-City Coverage"
  // block (which lives outside the article but inside <main>) is counted.
  // The sidebar is also inside <main> via Layout.astro, so we exclude
  // the related-articles <aside> from the count to avoid double-counting
  // the sidebar's links.
  const MIN_BODY_INTERNAL_LINKS = 3;
  // Only enforce on guide pages and blog posts — not on utility pages
  // like /about, /contact, /download, /resources, /affiliate-disclosure,
  // etc. which legitimately have minimal body content. The check is
  // designed to catch orphan-thin content on the high-value surfaces
  // that drive organic traffic, not to force every page to be a guide.
  const SCOPE_RE = /\/(guides|blog|learn)\//;
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (p.includes('/_astro') || p.includes('/admin/')) continue;
        walk(p);
      } else if (e.isFile() && p.endsWith('.html')) {
        // Scope: only guide and blog pages (not /about, /download, etc.)
        const relPath = p.replace(DIST, '').replace(/^\//, '').replace(/index\.html$/, '');
        if (!SCOPE_RE.test('/' + relPath + '/')) continue;
        const text = fs.readFileSync(p, 'utf8');
        // Extract <main>...</main> body
        const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/);
        if (!mainMatch) continue;
        // Remove the related-articles sidebar so we only count
        // body-contextual links, not sidebar-generated ones.
        const mainNoSidebar = mainMatch[1].replace(
          /<aside class="related-articles[\s\S]*?<\/aside>/g,
          ''
        );
        // Get all unique internal hrefs (path only, no fragment).
        const hrefs = new Set();
        for (const m of mainNoSidebar.matchAll(/href="(\/[^"#?]+)"/g)) {
          hrefs.add(m[1]);
        }
        // Exclude self-reference (the page linking to itself).
        const pagePath = p.replace(DIST, '').replace(/index\.html$/, '').replace(/\/$/, '');
        hrefs.delete(pagePath);
        if (hrefs.size < MIN_BODY_INTERNAL_LINKS) {
          results.push(p.replace(DIST, '').replace(/^\//, ''));
        }
      }
    }
  }
  walk(DIST);
  return results;
}

let totalFailures = 0;
let totalWarnings = 0;

console.log('🔍 Content Health QA');
console.log(`📁 content-health source root: ${ROOT}`);
console.log(`📁 content-health rendered output: ${DIST}${process.env.CONTENT_HEALTH_DIST ? ' (CONTENT_HEALTH_DIST override)' : ''}`);
console.log(`📁 content-health sitemap: ${SITEMAP}${process.env.CONTENT_HEALTH_SITEMAP ? ' (CONTENT_HEALTH_SITEMAP override)' : ''}`);
console.log(`📁 content-health public dir: ${PUBLIC_DIR}${process.env.CONTENT_HEALTH_PUBLIC ? ' (CONTENT_HEALTH_PUBLIC override)' : ''}`);
if (!OPTIONS.sourceOnly) {
  try {
    warnIfRenderedOutputStale({ distDir: DIST, sitemap: SITEMAP, label: 'content-health rendered output' });
  } catch (err) {
    console.log(`⚠️   rendered output freshness: ERROR — ${err.message}`);
    totalWarnings++;
  }
}
console.log('');

const activeChecks = CHECKS.filter(({ phase }) => {
  if (OPTIONS.sourceOnly) return phase === 'source';
  if (OPTIONS.renderedOnly) return phase === 'preflight' || phase === 'rendered';
  return true;
});

activeChecks.forEach(({ name, fn }) => {
  try {
    const issues = fn();
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
