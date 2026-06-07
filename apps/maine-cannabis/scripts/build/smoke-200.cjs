#!/usr/bin/env node
/**
 * smoke-200.cjs
 *
 * Hits every URL in dist/ (mapped to MDG_BASE or MDG_PREVIEW_URL) with HEAD
 * requests, reports any non-200 response. Catches the case where a build
 * goes green but a specific page fails to serve (404, 500, redirect loop).
 *
 * Exits 0 if all pages are 200, exits 1 with a list of broken URLs otherwise.
 *
 * Usage:
 *   node scripts/build/smoke-200.cjs                       # test dist/ against MDG_BASE (default mainedispensaryguide.com)
 *   MDG_BASE=https://preview-abc.vercel.app node ...      # test against a Vercel preview
 *   MDG_BASE=http://localhost:4321 node ...               # test against a dev server
 *   --from-sitemap  # read URLs from dist/sitemap-0.xml instead of dist/ HTML
 *
 * Sprint 77 observability: closes gap #9 from the 2026-06-07 MDG tracking
 * audit. The existing tests/smoke.spec.ts only checks the homepage; this
 * checks all 224 published pages in one fast pass.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const DIST = path.join(REPO, 'dist');
const SITEMAP = path.join(DIST, 'sitemap-0.xml');
const MDG_BASE = process.env.MDG_BASE || process.env.PREVIEW_URL || 'https://mainedispensaryguide.com';
const FROM_SITEMAP = process.argv.includes('--from-sitemap');
const CONCURRENCY = parseInt(process.env.SMOKE_CONCURRENCY || '8', 10);

function listHtmlPages() {
  const out = [];
  function walk(d, rel = '') {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === '_astro' || e.name === 'admin' || e.name === '.vercel') continue;
        walk(p, r);
      } else if (e.isFile() && e.name.endsWith('.html')) {
        if (rel === '' && e.name === '404.html') continue;
        if (rel === '' && e.name === 'index.html') { out.push('/'); continue; }
        let route = '/' + r.replace(/\/index\.html$/, '').replace(/\.html$/, '');
        if (route === '/') route = '/';
        else if (route.endsWith('/')) route = route.slice(0, -1);
        out.push(route);
      }
    }
  }
  walk(DIST);
  return out;
}

function listSitemapUrls() {
  if (!fs.existsSync(SITEMAP)) return [];
  const xml = fs.readFileSync(SITEMAP, 'utf-8');
  const out = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = new URL(m[1]);
    out.push(u.pathname);
  }
  return out;
}

function headOnce(target) {
  return new Promise((resolve) => {
    const lib = target.startsWith('https:') ? https : http;
    const req = lib.request(target, { method: 'HEAD', timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode, location: res.headers.location || '' });
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
  const base = MDG_BASE.replace(/\/+$/, '');
  const routes = FROM_SITEMAP ? listSitemapUrls() : listHtmlPages();
  if (routes.length === 0) {
    console.error(`No routes found. dist exists: ${fs.existsSync(DIST)}, sitemap exists: ${fs.existsSync(SITEMAP)}`);
    process.exit(1);
  }
  console.log(`🩺 smoke-200: ${routes.length} routes × ${base} (concurrency=${CONCURRENCY})`);

  const startedAt = Date.now();
  const results = await runWithConcurrency(routes, async (route) => {
    const url = base + route;
    const r = await headOnce(url);
    return { route, ...r };
  }, CONCURRENCY);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  let ok = 0, redirected = 0, broken = 0;
  const brokenSamples = [];
  const redirectedSamples = [];
  for (const r of results) {
    if (r.status === 200) ok++;
    else if (r.status >= 300 && r.status < 400) { redirected++; if (redirectedSamples.length < 5) redirectedSamples.push(r); }
    else { broken++; if (brokenSamples.length < 10) brokenSamples.push(r); }
  }
  console.log(`   ${ok} ok, ${redirected} redirects, ${broken} broken (${elapsed}s)`);
  if (brokenSamples.length) {
    console.log(`\n❌ Broken:`);
    for (const r of brokenSamples) console.log(`   ${r.status || r.error}  ${base}${r.route}`);
  }
  if (redirectedSamples.length) {
    console.log(`\n⚠️  Redirects (informational):`);
    for (const r of redirectedSamples) console.log(`   ${r.status}  ${base}${r.route}  →  ${r.location}`);
  }

  if (broken > 0) process.exit(1);
  process.exit(0);
}

main();
