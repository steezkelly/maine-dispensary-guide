#!/usr/bin/env node
/**
 * gsc-indexing-check.cjs
 *
 * Google Search Console URL Inspection for every URL in the MDG sitemap.
 * Reports which URLs are indexed vs not, so we know what to fix.
 *
 * Usage:
 *   node scripts/seo/gsc-indexing-check.cjs                    # full sitemap (251 URLs)
 *   node scripts/seo/gsc-indexing-check.cjs --limit=10         # first 10 only (smoke test)
 *   node scripts/seo/gsc-indexing-check.cjs --url=/about        # single URL
 *   node scripts/seo/gsc-indexing-check.cjs --refresh          # bypass cache
 *
 * Output:
 *   - console: human-readable summary grouped by status
 *   - data/gsc-indexing-report-<date>.json: full-sitemap per-URL result, archived
 *   - data/gsc-indexing-report-<date>-<scope>.json: partial per-URL result,
 *     kept separate so a smoke test cannot overwrite full-site evidence
 *   - data/gsc-indexing-cache.json: latest result, 24h TTL
 *
 * Required:
 *   GCP service-account JSON with webmasters.readonly scope.
 *   Discovery doc in handover notes; see "Setup" section below.
 *
 * Setup (one-time):
 *   1. Create GCP service account with role "Search Console Reader"
 *      (or custom role with webmasters.readonly scope).
 *   2. In Google Search Console (https://search.google.com/search-console),
 *      Settings → Users and permissions → Add user → paste the service
 *      account email address from the JSON file.
 *   3. Save the JSON at one of:
 *        ~/.hermes/secrets/gcp-mdg-reader.json
 *        $GOOGLE_APPLICATION_CREDENTIALS (path to JSON)
 *   4. Run: node scripts/seo/gsc-indexing-check.cjs --limit=5
 *      If creds work, you should see inspection results.
 *
 * Rate limit: GSC URL Inspection API is ~600 req/min per project.
 * Full sitemap = 251 URLs → ~25s. Cached results skip the API call.
 *
 * Why this exists:
 *   HANDOVER_TO_HERMES.md (2026-05-12) flagged "42 pages not indexed"
 *   in GSC. Without a script, this was a manual UI check that was never
 *   done. Sprint 78c (2026-07-13) wires the API call so the answer is
 *   one command away and the report is on disk for diff-over-time.
 */

const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');
const { URL } = require('node:url');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SITEMAP_URL = 'https://mainedispensaryguide.com/sitemap-0.xml';
// GSC stores the property URL with a trailing slash (verified via sites.list 2026-07-13).
// URL Inspection API does exact-match on siteUrl — without the trailing slash it returns
// "You do not own this site, or the inspected URL is not part of this property." for
// every URL even when permissions are correct. Hardcode the canonical form here.
const SITE_URL = 'https://mainedispensaryguide.com/';
const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'gsc-indexing-cache.json');
const REPORT_DIR = path.join(__dirname, '..', '..', 'data');

const CRED_PATHS = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.join(process.env.HOME || '', '.hermes', 'secrets', 'gcp-mdg-reader.json'),
  path.join(process.env.HOME || '', '.config', 'maine-dispensary-guide', 'gcp-mdg-reader.json'),
].filter(Boolean);

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

function findCreds() {
  for (const p of CRED_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function logErr(msg) { console.error(`\x1b[31m${msg}\x1b[0m`); }
function logOk(msg) { console.log(`\x1b[32m${msg}\x1b[0m`); }
function logInfo(msg) { console.log(`\x1b[36m${msg}\x1b[0m`); }
function logWarn(msg) { console.log(`\x1b[33m${msg}\x1b[0m`); }

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  // Cheap URL extraction. Sitemap URLs are in <loc>...</loc>.
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return urls;
}

async function inspectOne(sc, url) {
  // GSC URL Inspection API: inspect single URL. Returns inspectionResult indexed
  // status. See https://developers.google.com/webmasters/v1/urlInspection.index/inspect
  const res = await sc.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: url,
      siteUrl: SITE_URL,
    },
  });
  const result = res.data.inspectionResult;
  if (!result) return { url, status: 'ERROR', reason: 'no inspectionResult' };

  // result.indexStatusResult.verdict: 'PASS' (indexed), 'FAIL', 'NEUTRAL', etc.
  // result.indexStatusResult.coverageState: human-readable, e.g. 'Indexed, not submitted in sitemap'
  // result.indexStatusResult.lastCrawlTime, robotsTxtState, etc.
  const verdict = result.indexStatusResult?.verdict || 'UNKNOWN';
  const coverage = result.indexStatusResult?.coverageState || '';
  const lastCrawl = result.indexStatusResult?.lastCrawlTime || '';
  const robotsTxt = result.indexStatusResult?.robotsTxtState || '';

  // Bucket into 4 categories the operator cares about
  let status;
  if (verdict === 'PASS') status = 'INDEXED';
  else if (verdict === 'FAIL') status = 'NOT_INDEXED';
  else if (verdict === 'NEUTRAL') status = 'NEUTRAL';
  else status = verdict;

  return { url, status, verdict, coverage, lastCrawl, robotsTxt };
}

// Run inspections with bounded concurrency. GSC URL Inspection API is rate-limited at
// ~600 req/min per project (10/sec). Concurrency 8 leaves headroom for transient retries.
// For 251 URLs at avg 1.2s/req serialized = 5min. At concurrency 8 = ~40s.
async function inspectAll(sc, urls, concurrency = 8) {
  const results = new Array(urls.length);
  let next = 0;
  let completed = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= urls.length) return;
      const url = urls[i];
      try {
        results[i] = await inspectOne(sc, url);
      } catch (e) {
        results[i] = { url, status: 'ERROR', reason: e.message?.split('\n')[0] || String(e) };
      }
      completed++;
      process.stdout.write(`  [${completed}/${urls.length}] ${url.replace(SITE_URL, '')}\r`);
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');
  return results;
}

function coverageMetadata({ sitemapUrlCount, inspectedUrls, flags }) {
  const scope = flags.url ? 'single_url' : flags.limit ? 'limited_sitemap' : 'full_sitemap';
  return {
    scope,
    complete: scope === 'full_sitemap' && inspectedUrls.length === sitemapUrlCount,
    sitemapUrlCount,
    inspectedUrlCount: inspectedUrls.length,
    limit: flags.limit ? Number(flags.limit) : null,
    requestedUrl: flags.url || null,
  };
}

function sameUrlSet(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((url, index) => url === right[index]);
}

function archiveFilename(dateStamp, coverage, runId = process.hrtime.bigint().toString()) {
  return `gsc-indexing-report-${dateStamp}${coverage.scope === 'full_sitemap' ? '' : `-${coverage.scope}-${runId}`}.json`;
}

async function main() {
  // Resolve target URLs
  let urls;
  if (flags.url) {
    urls = [flags.url.startsWith('http') ? flags.url : SITE_URL + flags.url];
  } else {
    logInfo('Fetching sitemap…');
    urls = await fetchSitemapUrls();
    logInfo(`Found ${urls.length} URL(s) in sitemap.`);
  }
  const sitemapUrlCount = urls.length;
  if (flags.limit) urls = urls.slice(0, parseInt(flags.limit, 10));
  const coverage = coverageMetadata({ sitemapUrlCount, inspectedUrls: urls, flags });

  // Cache: skip API calls if we have a fresh result for this exact URL set
  let cache = null;
  if (!flags.refresh && fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      if (cache.timestamp && sameUrlSet(cache.requestedUrls, urls) && Date.now() - new Date(cache.timestamp).getTime() < 24 * 3600 * 1000) {
        logInfo(`Cache hit (${cache.results.length} URLs, age <24h). Pass --refresh to bypass.`);
        summarize(cache.results);
        return;
      }
    } catch (_) {}
  }

  // Auth
  const credPath = findCreds();
  if (!credPath) {
    logErr('\n✗ No GSC service-account credentials found.\n');
    console.error('Tried these paths:');
    CRED_PATHS.forEach(p => console.error(`  ${p}${fs.existsSync(p) ? ' (exists)' : ' (missing)'}`));
    console.error('\nSetup instructions (one-time):');
    console.error('  1. Create a GCP service account with webmasters.readonly scope.');
    console.error('  2. In Google Search Console → Settings → Users and permissions,');
    console.error('     add the service-account email as a user with "Full" or "Restricted" permission.');
    console.error('  3. Save the JSON at ~/.hermes/secrets/gcp-mdg-reader.json');
    console.error('     (or set $GOOGLE_APPLICATION_CREDENTIALS to its path).');
    console.error('  4. Re-run: node scripts/seo/gsc-indexing-check.cjs --limit=5\n');
    process.exit(2);
  }
  logInfo(`Using credentials: ${credPath}`);

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const client = await auth.getClient();
  logInfo(`Authenticated as: ${client.email}`);

  const sc = google.searchconsole({ version: 'v1', auth: client });

  // Verify the site is registered
  const sitesRes = await sc.sites.list();
  const sites = sitesRes.data.siteEntry || [];
  const hasMdg = sites.some(s => s.siteUrl === SITE_URL || s.siteUrl === SITE_URL + '/');
  if (!hasMdg) {
    logErr(`\n✗ Service account does not have access to ${SITE_URL} in GSC.`);
    logErr('  Add the service-account email as a user in GSC Settings → Users and permissions.\n');
    logErr(`Service-account email: ${client.email}`);
    logErr(`GSC sites accessible to this account:`);
    sites.forEach(s => logErr(`  - ${s.siteUrl} (${s.permissionLevel})`));
    process.exit(3);
  }
  logOk(`Site access verified: ${SITE_URL}`);

  // Inspect each URL. GSC URL Inspection rate limit is ~600 req/min; we use bounded
  // concurrency (8 workers) to stay well under the limit while finishing in ~40s instead
  // of ~5min for a serialized 251-URL run.
  logInfo(`Inspecting ${urls.length} URL(s) (this takes ~${Math.round(urls.length * 1.2 / 8)}s)…\n`);
  const results = await inspectAll(sc, urls, 8);

  // Persist
  const record = { timestamp: new Date().toISOString(), sourceUrl: SITE_URL, requestedUrls: urls, coverage, results };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(record, null, 2));
  const dateStamp = new Date().toISOString().slice(0, 10);
  const archivePath = path.join(REPORT_DIR, archiveFilename(dateStamp, coverage));
  fs.writeFileSync(archivePath, JSON.stringify(record, null, 2));
  logInfo(`Cache: ${CACHE_PATH}`);
  logInfo(`Archive: ${archivePath}`);

  summarize(results);
}

function summarize(results) {
  const groups = { INDEXED: [], NOT_INDEXED: [], NEUTRAL: [], ERROR: [], OTHER: [] };
  for (const r of results) {
    const bucket = groups[r.status] || groups.OTHER;
    bucket.push(r);
  }
  console.log('\n=== Summary ===');
  for (const [k, v] of Object.entries(groups)) {
    if (v.length === 0) continue;
    console.log(`  ${k.padEnd(14)} ${v.length}`);
  }
  console.log(`  TOTAL         ${results.length}`);
  if (groups.NOT_INDEXED.length > 0) {
    console.log('\n=== NOT_INDEXED URLs (first 20) ===');
    for (const r of groups.NOT_INDEXED.slice(0, 20)) {
      const path = r.url.replace(SITE_URL, '');
      const cov = r.coverage ? ` [${r.coverage}]` : '';
      console.log(`  ${path}${cov}`);
    }
    if (groups.NOT_INDEXED.length > 20) {
      console.log(`  … and ${groups.NOT_INDEXED.length - 20} more (see report JSON)`);
    }
  }
  if (groups.ERROR.length > 0) {
    console.log('\n=== ERROR URLs (first 10) ===');
    for (const r of groups.ERROR.slice(0, 10)) {
      console.log(`  ${r.url.replace(SITE_URL, '')}: ${r.reason}`);
    }
  }
}

if (require.main === module) main().catch(e => {
  logErr(`\n✗ FATAL: ${e.message || e}`);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});

module.exports = { archiveFilename, coverageMetadata, sameUrlSet };
