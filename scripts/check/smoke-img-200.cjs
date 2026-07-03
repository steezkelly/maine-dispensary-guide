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
const https = require('node:https');
const http = require('node:http');

const REPO = path.resolve(__dirname, '..', '..');
const DIST = path.join(REPO, 'dist');
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

function extractImgRefs(html) {
  const refs = new Set();
  // 1. <img src=...>, <source srcset=...>, <video poster=...>
  //    Intentionally permissive — we want to catch everything that could
  //    produce a 404 image request.
  const attrRe = /\b(?:src|srcset|poster)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const v = m[1];
    // srcset can be "url 1x, url 2x" — split on commas at end-of-token
    for (const part of v.split(',')) {
      const token = part.trim().split(/\s+/)[0]; // drop descriptor
      if (token) refs.add(token);
    }
  }
  // 2. <link rel="preload" as="image" href="..."> — Layout emits this
  //    for every page that has a heroImage. Catches the case where the
  //    preload target 404s (e.g. the /learn/ consumer hub regression
  //    on 2026-07-02: heroImage pointed at a 404 path, the build was
  //    green, smoke-200 was green, but the browser was preloading a
  //    404 image and the social-share OG image was 404 too).
  const preloadRe = /<link[^>]+rel\s*=\s*"preload"[^>]+as\s*=\s*"image"[^>]+href\s*=\s*"([^"]+)"/g;
  while ((m = preloadRe.exec(html)) !== null) refs.add(m[1]);
  // 3. <meta property="og:image" content="..."> — Layout emits this for
  //    every page with a heroImage. Catches the same regression as
  //    #2 but via the social-share metadata path.
  const ogRe = /<meta[^>]+property\s*=\s*"og:image"[^>]+content\s*=\s*"([^"]+)"/g;
  while ((m = ogRe.exec(html)) !== null) refs.add(m[1]);
  return [...refs];
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

function headOnce(target) {
  return new Promise((resolve) => {
    const lib = target.startsWith('https:') ? https : http;
    const req = lib.request(target, { method: 'HEAD', timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.end();
  });
}

async function runWithConcurrency(items, fn, limit) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`dist/ not found at ${DIST}. Run \`npm run build\` first.`);
    process.exit(1);
  }
  const base = MDG_BASE.replace(/\/+$/, '');
  const htmlFiles = listHtmlFiles(DIST);
  console.log(`🖼️  smoke-img-200: scanning ${htmlFiles.length} HTML files × ${base} (concurrency=${CONCURRENCY}, skip-external=${SKIP_EXTERNAL})`);

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
    const r = await headOnce(item.url);
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
