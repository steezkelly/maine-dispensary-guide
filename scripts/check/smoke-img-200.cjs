#!/usr/bin/env node
/**
 * smoke-img-200.cjs
 *
 * Walks every HTML file in dist/, extracts every <img src="..."> URL,
 * HEADs each one against MDG_BASE, reports any non-200 response. Catches
 * the "shipped with a 404 image asset" bug class — see the /learn/
 * consumer hub regression on 2026-07-02 (the brand-new page referenced
 * /images/heroes/homepage.jpg which 404'd, shipped through build green,
 * CI green, and smoke-200 green because the asset request is
 * client-side, not server-side).
 *
 * Why a separate script: smoke-200.cjs tests rendered HTML pages against
 * the base URL, but does not follow <img> refs. Pages render fine even
 * when their images 404. This script closes that gap.
 *
 * Scope: same-origin <img src> only. External CDN URLs (formspree,
 * brave, etc.) are skipped to avoid noise. Data URIs are skipped.
 * <source srcset> in <picture> elements is also walked, since the
 * Layout emits the modern format (avif/webp) there.
 *
 * Usage:
 *   node scripts/build/smoke-img-200.cjs                       # test dist/ against MDG_BASE
 *   MDG_BASE=https://preview-abc.vercel.app node ...          # test against a Vercel preview
 *   MDG_BASE=http://localhost:4321 node ...                   # test against a dev server
 *   --skip-external                                              # (default) skip non-same-origin URLs
 *
 * Exit codes:
 *   0  all image refs return 200 (or skipped as external/data)
 *   1  one or more image refs return non-200
 */

const fs = require('node:fs');
const path = require('node:path');
const { rootDist, warnIfRenderedOutputStale } = require('./lib/paths.cjs');
const { headOrGet, runWithConcurrency } = require('./lib/http-status.cjs');
const { extractImgRefs } = require('./lib/rendered-refs.cjs');

const DIST = rootDist;
const MDG_BASE = process.env.MDG_BASE || process.env.PREVIEW_URL || 'https://mainedispensaryguide.com';
const CONCURRENCY = parseInt(process.env.SMOKE_CONCURRENCY || '8', 10);
const SKIP_EXTERNAL = !process.argv.includes('--include-external');

const SKIP_SCHEMES = ['data:', 'blob:', 'javascript:'];

function listHtmlFiles(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_astro' || e.name === 'admin' || e.name === '.vercel' || e.name === 'data') continue;
      listHtmlFiles(p, out);
    } else if (e.isFile() && e.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function isExternal(u) {
  if (u.startsWith('//')) return true;
  if (u.startsWith('http://') || u.startsWith('https://')) {
    try {
      const base = new URL(MDG_BASE);
      const target = new URL(u);
      return target.host !== base.host;
    } catch { return true; }
  }
  return false;
}

function normalizeUrl(ref) {
  if (ref.startsWith('//')) return 'https:' + ref;
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  if (ref.startsWith('/')) return MDG_BASE.replace(/\/+$/, '') + ref;
  return MDG_BASE.replace(/\/+$/, '') + '/' + ref;
}

async function main() {
  console.log(`📁 smoke-img-200 rendered output: ${DIST}`);
  warnIfRenderedOutputStale({ distDir: DIST, label: 'smoke-img-200 rendered output' });
  if (!fs.existsSync(DIST)) {
    console.error(`dist/ not found at ${DIST}. Run \`npm run build\` first.`);
    process.exit(1);
  }
  const base = MDG_BASE.replace(/\/+$/, '');
  let htmlFiles = listHtmlFiles(DIST);
  console.log(`🖼️  smoke-img-200: scanning ${htmlFiles.length} HTML files × ${base} (concurrency=${CONCURRENCY}, skip-external=${SKIP_EXTERNAL})`);

  // Operator-unrelated filter (env SMOKE_IMG_FILTER_PAGES):
  // when set, only check image refs in dist pages whose relative path matches one
  // of the comma-separated substrings (matches against path.relative(DIST, file)).
  // Used by pre-push-verify.cjs --ignore-unrelated to skip pre-existing broken
  // image refs that the current diff didn't touch. The trade-off: a still-broken
  // image on a touched page WILL fail this check, which is the right behavior —
  // the only refs being silenced are ones we're not responsible for right now.
  const filterRaw = process.env.SMOKE_IMG_FILTER_PAGES;
  if (filterRaw) {
    const filters = filterRaw.split(',').map(s => s.trim()).filter(Boolean);
    const before = htmlFiles.length;
    htmlFiles = htmlFiles.filter(f => {
      const rel = path.relative(DIST, f);
      return filters.some(sub => rel.includes(sub));
    });
    if (htmlFiles.length === 0) {
      console.error(`🖼️  smoke-img-200: SMOKE_IMG_FILTER_PAGES='${filterRaw}' matched 0 of ${before} HTML files — refusing to silently pass.`);
      process.exit(2);
    }
    console.log(`   filter SMOKE_IMG_FILTER_PAGES='${filterRaw}' → ${htmlFiles.length} of ${before} HTML files`);
  }

  // Collect every <img src> reference across all pages, deduped.
  const allRefs = new Map(); // ref -> { pages: Set, url }
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf-8');
    const refs = extractImgRefs(html);
    for (const r of refs) {
      if (SKIP_SCHEMES.some((s) => r.startsWith(s))) continue;
      if (SKIP_EXTERNAL && isExternal(r)) continue;
      if (!allRefs.has(r)) allRefs.set(r, { pages: new Set(), url: normalizeUrl(r) });
      allRefs.get(r).pages.add(path.relative(DIST, f));
    }
  }

  const items = [...allRefs.entries()].map(([ref, info]) => ({ ref, url: info.url, pages: [...info.pages] }));
  console.log(`   ${items.length} unique same-origin image refs to check`);

  const startedAt = Date.now();
  const results = await runWithConcurrency(items, async (item) => {
    const r = await headOrGet(item.url);
    return { ...item, ...r };
  }, CONCURRENCY);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  let ok = 0, broken = 0;
  const brokenSamples = [];
  for (const r of results) {
    if (r.status === 200) ok++;
    else {
      broken++;
      if (brokenSamples.length < 10) brokenSamples.push(r);
    }
  }
  console.log(`   ${ok} ok, ${broken} broken (${elapsed}s)`);
  if (brokenSamples.length) {
    console.log(`\n❌ Broken image refs:`);
    for (const r of brokenSamples) {
      const pageList = r.pages.slice(0, 3).join(', ') + (r.pages.length > 3 ? ` (+${r.pages.length - 3} more)` : '');
      console.log(`   ${r.status || r.error}  ${r.ref}`);
      console.log(`     referenced from: ${pageList}`);
    }
  }

  if (broken > 0) process.exit(1);
  process.exit(0);
}

main();
