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

const ROOT = path.resolve(process.env.CONTENT_HEALTH_ROOT || path.resolve(__dirname, '../../src/pages'));
const SITEMAP = path.resolve(process.env.CONTENT_HEALTH_SITEMAP || path.resolve(__dirname, '../../dist/sitemap-0.xml'));
const DIST = path.resolve(process.env.CONTENT_HEALTH_DIST || path.resolve(__dirname, '../../dist'));
const PUBLIC_DIR = path.resolve(process.env.CONTENT_HEALTH_PUBLIC || path.resolve(__dirname, '../../public'));
const ADMIN_DIRS = new Set(['admin', 'experiments']);

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
  // Pages that should NOT be in sitemap (noindex pages)
  const noindexPages = [
    '/admin/', '/experiments/', '/link-dashboard',
    '/download/founders-bible', '/download/roadmap',
    '/download/metrc-reconciliation-checklist', '/download/compliance-self-assessment',
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
  if (fs.existsSync(SITEMAP)) {
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
      const pagePath = raw.split('#')[0];
      if (skipRe.test(pagePath) || pagePath.includes('\\')) continue;

      let target;
      if (pagePath.startsWith('/')) {
        target = pagePath.replace(/\/$/, '');
      } else {
        target = '/' + path.relative(
          path.resolve(ROOT, '..'),
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
// Every production HTML page should have og:image, og:image:width, og:image:height
const REQUIRED_OG_WIDTH = '1200';
const REQUIRED_OG_HEIGHT = '630';

function checkOGImageDimensions() {
  const results = [];
  const distPath = DIST;

  if (!fs.existsSync(distPath)) {
    return ['dist/ not found — run build first'];
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

        let hasOgImage = false;
        let hasOgWidth = false;
        let hasOgHeight = false;
        let wrongWidth = false;
        let wrongHeight = false;

        const tagRe = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/g;
        let m;
        while ((m = tagRe.exec(text)) !== null) {
          const prop = m[1];
          const val = m[2];
          if (prop === 'og:image') hasOgImage = val.length > 0;
          if (prop === 'og:image:width') hasOgWidth = val === REQUIRED_OG_WIDTH;
          if (prop === 'og:image:height') hasOgHeight = val === REQUIRED_OG_HEIGHT;
        }

        // Also catch width/height that are wrong values
        const widthRe = /<meta\s+(?:property|name)=["']og:image:width["']\s+content=["']([^"']*)["']/g;
        const heightRe = /<meta\s+(?:property|name)=["']og:image:height["']\s+content=["']([^"']*)["']/g;
        const wm = widthRe.exec(text); if (wm && wm[1] !== REQUIRED_OG_WIDTH) wrongWidth = wm[1];
        const hm = heightRe.exec(text); if (hm && hm[1] !== REQUIRED_OG_HEIGHT) wrongHeight = hm[1];

        if (!hasOgImage) {
          results.push(`${rel}: missing og:image`);
        } else {
          if (wrongWidth) results.push(`${rel}: wrong og:image:width="${wrongWidth}" (expected ${REQUIRED_OG_WIDTH})`);
          if (wrongHeight) results.push(`${rel}: wrong og:image:height="${wrongHeight}" (expected ${REQUIRED_OG_HEIGHT})`);
          if (!hasOgWidth && !wrongWidth) results.push(`${rel}: missing og:image:width`);
          if (!hasOgHeight && !wrongHeight) results.push(`${rel}: missing og:image:height`);
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
  const { execSync } = require('node:child_process');
  try {
    const out = execSync('npm run build 2>&1', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8',
      timeout: 180000,
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


// ─── Check 10: trailing-slash internal links ──────────────────────────────────
// The site config uses trailingSlash: 'never'. Source links to /path/ create
// avoidable 3XX redirects and crawl noise.
function checkTrailingSlashInternalLinks() {
  const results = [];
  const quotedInternalRouteRe = /["'](\/[^"'?]+\/)(?=[#']|["'])/g;
  const skipPrefixes = ['/images/', '/fonts/', '/_astro/', '/downloads/', '/pdfs/'];

  walk(ROOT).forEach(file => {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = quotedInternalRouteRe.exec(text)) !== null) {
      const href = m[1];
      if (href === '/' || skipPrefixes.some(prefix => href.startsWith(prefix))) continue;
      const lastSegment = href.replace(/\/$/, '').split('/').pop() || '';
      if (path.extname(lastSegment)) continue;
      const rel = path.relative(ROOT, file);
      const lineNum = text.slice(0, m.index).split(/\r?\n/).length;
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

// ─── Run all checks ───────────────────────────────────────────────────────────
const CHECKS = [
  { name: 'bare href="#" links', fn: checkHrefHash },
  { name: 'malformed frontmatter', fn: checkFrontmatter },
  { name: 'noindex pages in sitemap', fn: checkNoindexInSitemap },
  { name: 'fake anchor buttons', fn: checkFakeAnchorsInStores },
  { name: 'typo literals', fn: checkTypoLiterals },
  { name: 'dead internal links', fn: checkDeadInternalLinks },
  { name: 'malformed \\1 hrefs', fn: checkMalformedBackrefHrefs },
  { name: 'trailing-slash internal links', fn: checkTrailingSlashInternalLinks },
  { name: 'OG image dimensions', fn: checkOGImageDimensions },
  { name: 'CSS build warnings', fn: checkCSSBuildWarnings },
  { name: 'rendered crawl basics', fn: checkRenderedCrawlBasics },
];

let totalFailures = 0;
let totalWarnings = 0;

console.log('🔍 Content Health QA\n');

CHECKS.forEach(({ name, fn }) => {
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