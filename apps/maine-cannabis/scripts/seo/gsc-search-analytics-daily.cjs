#!/usr/bin/env node
/**
 * gsc-search-analytics-daily.cjs
 *
 * Daily GSC Search Analytics dump for MDG. Pulls finalized query+page rows
 * for a non-overlapping Search Console date window and appends a snapshot to
 * apps/maine-cannabis/data/gsc-search-analytics.jsonl. Each row records the
 * extraction date plus the source date window; do not sum older rolling
 * snapshots that lack sourceStartDate/sourceEndDate metadata.
 *
 * Usage:
 *   node scripts/seo/gsc-search-analytics-daily.cjs              # one finalized GSC day (default: 3-day lag)
 *   node scripts/seo/gsc-search-analytics-daily.cjs --days=28    # 28-day window ending at default lag
 *   node scripts/seo/gsc-search-analytics-daily.cjs --days=1     # one finalized GSC day (override lag with --end-offset-days=1)
 *
 * Why default 1 day with a 3-day lag: GSC Search Analytics has processing
 * latency. A lagged one-day window avoids overlapping daily snapshots while
 * staying on finalized data by default. Use --days=N only for explicit rolling
 * investigations; such windows are not daily facts and cannot be summed.
 *
 * Cron setup (one-time, in your crontab):
 *   0 6 * * * cd /home/steve/projects/maine-dispensary-guide && \
 *     node apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs \
 *     >> /home/steve/.local/log/gsc-daily.log 2>&1
 *
 * Output schema (one JSON object per line):
 *   {
 *     "snapshotDate": "2026-07-06",   // date the row was written
 *     "sourceStartDate": "2026-07-03",
 *     "sourceEndDate": "2026-07-03",
 *     "sourceTimezone": "America/Los_Angeles",
 *     "sourceSortOrder": "clicks_desc_ties_arbitrary",
 *     "query": "maine edibles laws",
 *     "page": "https://mainedispensaryguide.com/guides/maine-cannabis-edibles-compliance/",
 *     "clicks": 1,
 *     "impressions": 106,
 *     "ctr": 0.0094,
 *     "position": 9.23
 *   }
 *
 * v2 (2026-07-13): added `page` dimension. Without page attribution we can't
 * distinguish "FAQ page ranks for the right query" from "wrong page ranks
 * for the query (cannibalization)". Enables Action 4 measurement and Action 3
 * (microdosing-page audit).
 *
 * Note: this changes the JSONL schema. Existing analytics dumps from v1
 * (no `page` field) are still valid — the field is just absent on older rows.
 *
 * Why this exists:
 *   The 2026-07-04 manual CSV export (175 rows, 17 clicks, 5062 impressions,
 *   0% median CTR) showed that MDG has 90 days of data but no trend tracking.
 *   This script makes GSC data a continuous stream instead of a one-shot
 *   artifact. Future analysis (position movement, click gain, seasonal
 *   patterns) becomes answerable from the rolling JSONL.
 *
 * Cost: one Search Analytics API call per run; the API applies the date
 * filter and row limit server-side.
 *
 * Required creds: same as gsc-indexing-check.cjs (webmasters.readonly).
 */

const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'data', 'gsc-search-analytics.jsonl');
const SITE_URL = 'https://mainedispensaryguide.com/';

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
const days = parseInt(flags.days, 10) || 1;
const endOffsetDays = parseInt(flags['end-offset-days'], 10) || 3;
const ROW_LIMIT = parseInt(flags.limit, 10) || 1000;
const DRY_RUN = !!flags['dry-run'];

function logErr(m) { console.error(`\x1b[31m${m}\x1b[0m`); }
function logOk(m) { console.log(`\x1b[32m${m}\x1b[0m`); }
function logInfo(m) { console.log(`\x1b[36m${m}\x1b[0m`); }

function findCreds() {
  for (const p of CRED_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function ymd(d) {
  // Search Console request dates use America/Los_Angeles calendar semantics.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function shiftedDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 86400 * 1000);
}

async function fetchAnalytics(sc) {
  // GSC searchanalytics.query returns search traffic data. We ask for top
  // ROW_LIMIT query+page rows for the requested source window.
  // rowLimit > 1000 is allowed but server caps at 25k max.
  //
  // Dimensions: ['query', 'page'] gives per-query URL attribution — tells us
  // which page Google is routing each query to. Critical for diagnosing
  // cannibalization (e.g. /guides/cannabis-microdosing-anxiety-maine ranking
  // for "dispensary fryeburg maine" when /guides/fryeburg-dispensary-guide
  // should rank instead). Without page dimension, query-level data is half-blind.
  const endDate = ymd(shiftedDate(endOffsetDays));
  const startDate = ymd(shiftedDate(endOffsetDays + days - 1));
  logInfo(`Fetching searchanalytics: ${startDate} → ${endDate} (top ${ROW_LIMIT} query+page pairs; API sorts by clicks desc)…`);
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: ROW_LIMIT,
      dataState: 'final',
    },
  });
  return { rows: res.data.rows || [], request: { startDate, endDate, dimensions: ['query', 'page'], rowLimit: ROW_LIMIT, dataState: 'final' } };
}

async function main() {
  const credPath = findCreds();
  if (!credPath) {
    logErr('\n✗ No GSC service-account credentials found.\n');
    logErr('Tried these paths:');
    CRED_PATHS.forEach(p => logErr(`  ${p}${fs.existsSync(p) ? ' (exists)' : ' (missing)'}`));
    logErr('\nSetup instructions: see gsc-indexing-check.cjs header.\n');
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
  const { rows, request } = await fetchAnalytics(sc);

  const snapshotDate = ymd(new Date());
  const records = rows.map(r => ({
    snapshotDate,
    sourceStartDate: request.startDate,
    sourceEndDate: request.endDate,
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: request.dataState,
    sourceSortOrder: 'clicks_desc_ties_arbitrary',
    query: r.keys[0],
    page: r.keys[1],  // second dimension = page URL (relative or absolute per GSC)
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));

  const totalClicks = records.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = records.reduce((s, r) => s + r.impressions, 0);
  logOk(`Got ${records.length} query rows: ${totalClicks} clicks, ${totalImpressions} impressions`);
  if (records.length === 0 && !flags['allow-no-data']) {
    logErr(`No GSC rows returned for ${request.startDate} → ${request.endDate}. Not appending an empty success snapshot; rerun with --allow-no-data to accept this explicitly.`);
    process.exit(4);
  }

  if (DRY_RUN) {
    logInfo('Dry-run: would append to ' + OUTPUT_PATH);
    logInfo('Request contract: ' + JSON.stringify(request));
    logInfo('First 3 rows:');
    records.slice(0, 3).forEach(r => logInfo('  ' + JSON.stringify(r)));
    return;
  }

  // Append to JSONL (one snapshot per day). Use append mode so re-runs don't clobber history.
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(OUTPUT_PATH, lines);
  logOk(`Appended ${records.length} rows to ${OUTPUT_PATH}`);
  logInfo(`Daily cron-friendly. Re-run tomorrow for trend delta.`);
}

main().catch(e => {
  logErr(`\n✗ FATAL: ${e.message || e}`);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});