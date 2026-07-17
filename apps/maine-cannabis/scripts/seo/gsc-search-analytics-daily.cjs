#!/usr/bin/env node
/**
 * gsc-search-analytics-daily.cjs
 *
 * Daily GSC Search Analytics dump for MDG. Pulls finalized query+page rows
 * for a non-overlapping source window and appends them to
 * apps/maine-cannabis/data/gsc-search-analytics.jsonl. Each row records its
 * extraction date plus source-window provenance.
 *
 * Usage:
 *   node scripts/seo/gsc-search-analytics-daily.cjs              # one finalized day (default: 3-day lag)
 *   node scripts/seo/gsc-search-analytics-daily.cjs --days=28    # explicit 28-day source window
 *   node scripts/seo/gsc-search-analytics-daily.cjs --days=1 --end-offset-days=1
 *                                                               # a finalized day one day ago
 *
 * Why default one day with a three-day lag: finalized, non-overlapping daily
 * facts can be summed safely by downstream consumers. Multi-day windows are
 * useful investigations but are not composable daily facts.
 *
 * Cron setup (one-time, in your crontab):
 *   0 6 * * * cd /home/steve/projects/maine-dispensary-guide && \
 *     node apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs \
 *     >> /home/steve/.local/log/gsc-daily.log 2>&1
 *
 * Output schema (one JSON object per line):
 *   {
 *     "snapshotDate": "2026-07-06",   // date the row was written
 *     "sourceStartDate": "2026-07-03", // GSC request provenance
 *     "sourceEndDate": "2026-07-03",
 *     "sourceTimezone": "America/Los_Angeles",
 *     "sourceDataState": "final",
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
 * Cost: one Search Analytics API call per run; the API applies the date filter
 * and row limit server-side.
 *
 * Required creds: same as gsc-indexing-check.cjs (webmasters.readonly).
 */

const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'data', 'gsc-search-analytics.jsonl');
const SNAPSHOT_DIR = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'data', 'gsc-search-analytics-snapshots');
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
const SEARCH_TYPE = flags['search-type'] || 'web';
const COUNTRY = flags.country || null;
const DEVICE = flags.device || null;
const SEARCH_APPEARANCE = flags['search-appearance'] || null;

function logErr(m) { console.error(`\x1b[31m${m}\x1b[0m`); }
function logOk(m) { console.log(`\x1b[32m${m}\x1b[0m`); }
function logInfo(m) { console.log(`\x1b[36m${m}\x1b[0m`); }

function findCreds() {
  for (const p of CRED_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const SOURCE_TIMEZONE = 'America/Los_Angeles';

function ymd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOURCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftYmd(date, calendarDays) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + calendarDays);
  return shifted.toISOString().slice(0, 10);
}

function getSourceWindow(now = new Date(), sourceDays = days, offsetDays = endOffsetDays) {
  const sourceEndDate = shiftYmd(ymd(now), -offsetDays);
  return {
    sourceStartDate: shiftYmd(sourceEndDate, -(sourceDays - 1)),
    sourceEndDate,
  };
}

function dimensionFilterGroups() {
  const filters = [
    COUNTRY && { dimension: 'country', operator: 'equals', expression: COUNTRY },
    DEVICE && { dimension: 'device', operator: 'equals', expression: DEVICE },
    SEARCH_APPEARANCE && { dimension: 'searchAppearance', operator: 'equals', expression: SEARCH_APPEARANCE },
  ].filter(Boolean);
  return filters.length ? [{ groupType: 'and', filters }] : undefined;
}

function requestBody(sourceWindow, dimensions) {
  return {
    startDate: sourceWindow.sourceStartDate,
    endDate: sourceWindow.sourceEndDate,
    dimensions,
    rowLimit: ROW_LIMIT,
    dataState: 'final',
    searchType: SEARCH_TYPE,
    dimensionFilterGroups: dimensionFilterGroups(),
    orderBy: dimensions.length ? [{ field: 'impressions', sortOrder: 'DESCENDING' }] : undefined,
  };
}

async function fetchAnalytics(sc, sourceWindow = getSourceWindow()) {
  // GSC searchanalytics.query returns search traffic data. We ask for top
  // ROW_LIMIT queries by impressions over the last `days` days, broken down by query.
  // rowLimit > 1000 is allowed but server caps at 25k max.
  //
  // Dimensions: ['query', 'page'] gives per-query URL attribution — tells us
  // which page Google is routing each query to. Critical for diagnosing
  // cannibalization (e.g. /guides/cannabis-microdosing-anxiety-maine ranking
  // for "dispensary fryeburg maine" when /guides/fryeburg-dispensary-guide
  // should rank instead). Without page dimension, query-level data is half-blind.
  const { sourceStartDate: startDate, sourceEndDate: endDate } = sourceWindow;
  logInfo(`Fetching finalized searchanalytics: ${startDate} → ${endDate} (top ${ROW_LIMIT} query+page pairs)…`);
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: requestBody(sourceWindow, ['query', 'page']),
  });
  return { rows: res.data.rows || [], sourceWindow };
}

function totals(rows) {
  const impressions = rows.reduce((sum, row) => sum + (row.impressions || 0), 0);
  const clicks = rows.reduce((sum, row) => sum + (row.clicks || 0), 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0,
    position: impressions ? rows.reduce((sum, row) => sum + (row.position || 0) * (row.impressions || 0), 0) / impressions : 0 };
}

function snapshotFromRows({ name, dimensions, rows, sourceWindow, siteTotals, extractedAt }) {
  const observedTotals = totals(rows);
  const complete = rows.length < ROW_LIMIT;
  return {
    schemaVersion: 1,
    snapshotKind: name,
    extractedAt,
    snapshotDate: ymd(new Date(extractedAt)),
    sourceWindow: { ...sourceWindow, sourceTimezone: SOURCE_TIMEZONE, sourceDataState: 'final' },
    searchType: SEARCH_TYPE,
    filters: { country: COUNTRY, device: DEVICE, searchAppearance: SEARCH_APPEARANCE },
    dimensions,
    rowLimit: ROW_LIMIT,
    rowCount: rows.length,
    completeness: { status: complete ? 'complete_within_requested_dimensions' : 'top_rows_truncated_or_unknown', rowLimitReached: !complete },
    siteTotals,
    observedTotals,
    coverageOfSiteTotals: {
      impressions: siteTotals.impressions ? observedTotals.impressions / siteTotals.impressions : null,
      clicks: siteTotals.clicks ? observedTotals.clicks / siteTotals.clicks : null,
    },
    rows: rows.map(row => ({ keys: row.keys || [], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 })),
  };
}

function appendSnapshot(snapshot, outputDir = SNAPSHOT_DIR) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.appendFileSync(path.join(outputDir, `${snapshot.snapshotKind}.jsonl`), `${JSON.stringify(snapshot)}\n`);
}

async function collectAggregateSnapshots(sc, sourceWindow, extractedAt = new Date().toISOString()) {
  const kinds = [
    ['query', ['query']],
    ['page', ['page']],
    ['query-by-page', ['query', 'page']],
  ];
  const totalResponse = await sc.searchanalytics.query({ siteUrl: SITE_URL, requestBody: requestBody(sourceWindow, []) });
  const siteTotals = totals(totalResponse.data.rows || []);
  const snapshots = [];
  for (const [name, dimensions] of kinds) {
    const response = await sc.searchanalytics.query({ siteUrl: SITE_URL, requestBody: requestBody(sourceWindow, dimensions) });
    snapshots.push(snapshotFromRows({ name, dimensions, rows: response.data.rows || [], sourceWindow, siteTotals, extractedAt }));
  }
  return snapshots;
}

function recordsFromRows(rows, sourceWindow, snapshotDate = ymd(new Date())) {
  return rows.map(row => ({
    snapshotDate,
    sourceStartDate: sourceWindow.sourceStartDate,
    sourceEndDate: sourceWindow.sourceEndDate,
    sourceTimezone: SOURCE_TIMEZONE,
    sourceDataState: 'final',
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
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
  const sourceWindow = getSourceWindow();
  const { rows } = await fetchAnalytics(sc, sourceWindow);
  const records = recordsFromRows(rows, sourceWindow);
  const aggregateSnapshots = await collectAggregateSnapshots(sc, sourceWindow);

  const totalClicks = records.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = records.reduce((s, r) => s + r.impressions, 0);
  logOk(`Got ${records.length} query rows: ${totalClicks} clicks, ${totalImpressions} impressions`);
  if (records.length === 0 && !flags['allow-no-data']) {
    logErr(`No GSC rows returned for ${sourceWindow.sourceStartDate} → ${sourceWindow.sourceEndDate}; refusing to append an empty success snapshot. Re-run with --allow-no-data only when the absence is expected.`);
    process.exit(4);
  }

  if (DRY_RUN) {
    logInfo('Dry-run: would append to ' + OUTPUT_PATH);
    logInfo('Source window: ' + JSON.stringify(sourceWindow));
    logInfo('First 3 rows:');
    records.slice(0, 3).forEach(r => logInfo('  ' + JSON.stringify(r)));
    aggregateSnapshots.forEach(snapshot => logInfo(`Would append ${snapshot.snapshotKind} snapshot: ${snapshot.rowCount} rows; ${snapshot.completeness.status}; ${Math.round((snapshot.coverageOfSiteTotals.impressions || 0) * 100)}% impression coverage.`));
    return;
  }

  // Append to JSONL (one snapshot per day). Use append mode so re-runs don't clobber history.
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(OUTPUT_PATH, lines);
  aggregateSnapshots.forEach(appendSnapshot);
  logOk(`Appended ${records.length} rows to ${OUTPUT_PATH}`);
  logOk(`Appended separate query, page, and query-by-page aggregate snapshots to ${SNAPSHOT_DIR}`);
  logInfo(`Daily cron-friendly. Re-run tomorrow for trend delta.`);
}

if (require.main === module) {
  main().catch(e => {
    logErr(`\n✗ FATAL: ${e.message || e}`);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  });
}

module.exports = {
  getSourceWindow,
  recordsFromRows,
  snapshotFromRows,
  totals,
  requestBody,
};
