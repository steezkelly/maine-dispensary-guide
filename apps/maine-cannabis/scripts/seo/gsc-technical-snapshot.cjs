#!/usr/bin/env node
'use strict';

/**
 * Durable technical/indexation state. GSC URL Inspection export is optional:
 * absent coverage is recorded as unobserved, never converted into a pass.
 */
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..'); const APP = path.join(ROOT, 'apps', 'maine-cannabis');
const DATA = path.join(APP, 'data'); const OUT = path.join(DATA, 'gsc-technical-snapshots.jsonl'); const SITE = 'https://mainedispensaryguide.com';
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []; }
function route(url) { return new URL(url).pathname.replace(/\/$/, '') || '/'; }
function latestCoverage() { const files = fs.readdirSync(DATA).filter(name => /^gsc-indexing-report-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort(); return files.length ? json(path.join(DATA, files.at(-1))).results || [] : []; }
function declaredRedirects() { return (json(path.join(ROOT, 'vercel.json')).redirects || []).map(row => row.source); }
function priorState(prior, key, now) { const old = prior?.routes?.find(row => row.route === key); return { firstSeenAt: old?.firstSeenAt || now, lastSeenAt: now }; }
function buildSnapshot({ sitemapUrls, manifestRows, coverageRows, redirectSources = declaredRedirects(), pageChecks = {}, prior, extractedAt = new Date().toISOString() }) {
  const sitemap = new Set(sitemapUrls.map(route)); const manifest = new Set(manifestRows.map(row => row.canonical_path)); const coverage = new Map(coverageRows.map(row => [route(row.url), row]));
  const redirects = new Set(redirectSources.filter(source => !/[()*]/.test(source))); const all = new Set([...sitemap, ...manifest, ...coverage.keys(), ...redirects]);
  const routes = [...all].sort().map(key => { const inspection = coverage.get(key); const check = pageChecks[key] || {}; const reasons = [];
    if (!sitemap.has(key)) reasons.push('NOT_IN_PRODUCTION_SITEMAP'); if (!manifest.has(key)) reasons.push('NOT_IN_CANONICAL_ROUTE_MANIFEST'); if (redirects.has(key)) reasons.push('DECLARED_REDIRECT_SOURCE');
    if (inspection?.status === 'ERROR') reasons.push('GSC_CRAWL_FAILURE'); if (inspection?.status === 'NOT_INDEXED') reasons.push('GSC_NOT_INDEXED'); if (inspection?.status === 'NEUTRAL') reasons.push('GSC_NEUTRAL_REQUIRES_REVIEW'); if (inspection && !['INDEXED', 'ERROR', 'NOT_INDEXED', 'NEUTRAL'].includes(inspection.status)) reasons.push('GSC_UNRECOGNIZED_STATUS_REQUIRES_REVIEW');
    if (check.fetchStatus && check.fetchStatus >= 400) reasons.push('PRODUCTION_HTTP_FAILURE'); if (check.noindex) reasons.push('NOINDEX');
    if (check.canonical && check.canonical !== `${SITE}${key}`) reasons.push('CANONICAL_POINTS_ELSEWHERE'); if (!inspection) reasons.push('GSC_COVERAGE_UNOBSERVED'); if (check.checked !== true) reasons.push('PRODUCTION_HTML_UNOBSERVED');
    return { route: key, ...priorState(prior, key, extractedAt), sitemap: sitemap.has(key), canonicalManifest: manifest.has(key), inspection: inspection || null, production: check, reasonCodes: reasons, state: reasons.length ? 'REVIEW' : 'PASS' };
  });
  return { schemaVersion: 1, snapshotKind: 'indexation-technical', extractedAt, sources: { productionSitemap: true, canonicalRouteManifest: true, gscCoverageExport: coverageRows.length > 0, redirects: redirectSources }, routes };
}
async function checksFor(routes) { const results = {}; for (const key of routes) { try { const response = await fetch(`${SITE}${key}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) }); const body = await response.text(); const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || null; results[key] = { checked: true, fetchStatus: response.status, canonical, noindex: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(body) }; } catch (error) { results[key] = { checked: true, fetchStatus: 599, error: error.message }; } } return results; }
async function fetchSitemapUrls(fetchImpl = fetch) { const response = await fetchImpl(`${SITE}/sitemap-0.xml`, { signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error(`sitemap fetch ${response.status}`); const sitemapText = await response.text(); return [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]); }
async function main() { const flags = new Set(process.argv.slice(2)); const sitemapUrls = await fetchSitemapUrls(); const manifestRows = readJsonl(path.join(APP, 'docs', 'analytics', 'page_task_manifest.v1.jsonl')); const previous = readJsonl(OUT).at(-1); const pageChecks = flags.has('--fetch-pages') ? await checksFor(sitemapUrls.map(route)) : {}; const snapshot = buildSnapshot({ sitemapUrls, manifestRows, coverageRows: latestCoverage(), pageChecks, prior: previous }); if (flags.has('--dry-run')) process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`); else { fs.appendFileSync(OUT, `${JSON.stringify(snapshot)}\n`); console.log(`Appended ${snapshot.routes.length} technical route states to ${OUT}`); } }
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exit(1); });
module.exports = { buildSnapshot, route, fetchSitemapUrls };
