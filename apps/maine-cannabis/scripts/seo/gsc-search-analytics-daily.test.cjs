const Module = require('node:module');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const originalLoad = Module._load;
Module._load = function loadGoogleapisForUnitTests(request, parent, isMain) {
  if (request === 'googleapis') return { google: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const producer = require('./gsc-search-analytics-daily.cjs');
Module._load = originalLoad;

test('uses Los Angeles calendar arithmetic for a finalized daily window across DST', () => {
  const now = new Date('2026-03-09T19:00:00Z'); // March 9 in Los Angeles, after DST begins.
  assert.deepEqual(producer.getSourceWindow(now, 1, 3), {
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
  });
  assert.deepEqual(producer.getSourceWindow(now, 7, 3), {
    sourceStartDate: '2026-02-28',
    sourceEndDate: '2026-03-06',
  });
});

test('keeps every scheduled GSC snapshot outside the repository by default', () => {
  assert.match(producer.OUTPUT_PATH, /\.hermes\/data\/mdg-gsc\/gsc-search-analytics\.jsonl$/);
  assert.match(producer.SNAPSHOT_DIR, /\.hermes\/data\/mdg-gsc\/gsc-search-analytics-snapshots$/);
  assert.match(producer.PAGE_SNAPSHOT_DIR, /\.hermes\/data\/mdg-gsc\/gsc-search-analytics-snapshots$/);
  assert.doesNotMatch(producer.OUTPUT_PATH, /apps\/maine-cannabis\/data/);
  assert.doesNotMatch(producer.PAGE_SNAPSHOT_DIR, /apps\/maine-cannabis\/data/);
});

test('writes finalized one-day provenance onto every GSC row', () => {
  const records = producer.recordsFromRows([
    { keys: ['maine dispensaries', 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/'], clicks: 2, impressions: 10, ctr: 0.2, position: 4 },
  ], {
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
  }, '2026-03-09');

  assert.deepEqual(records, [{
    snapshotDate: '2026-03-09',
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: 'final',
    query: 'maine dispensaries',
    page: 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/',
    clicks: 2,
    impressions: 10,
    ctr: 0.2,
    position: 4,
  }]);
});

test('separate page snapshot treats sub-limit GSC rows as incomplete or unknown because the API returns only top rows', () => {
  const snapshot = producer.snapshotFromRows({
    name: 'page', dimensions: ['page'], sourceWindow: { sourceStartDate: '2026-03-06', sourceEndDate: '2026-03-06' },
    extractedAt: '2026-03-09T20:00:00.000Z', siteTotals: { clicks: 100, impressions: 1000, ctr: .1, position: 2 },
    rows: [{ keys: ['https://example.test/'], clicks: 10, impressions: 100, ctr: .1, position: 5 }],
  });
  assert.equal(snapshot.completeness.status, 'top_rows_truncated_or_unknown');
  assert.equal(snapshot.completeness.rowLimitReached, false);
  assert.equal(snapshot.coverageOfSiteTotals.impressions, 0.1);
});

test('separate page snapshot exposes a row-limit truncation and site-total coverage', () => {
  const snapshot = producer.snapshotFromRows({
    name: 'page', dimensions: ['page'], sourceWindow: { sourceStartDate: '2026-03-06', sourceEndDate: '2026-03-06' },
    extractedAt: '2026-03-09T20:00:00.000Z', siteTotals: { clicks: 10, impressions: 100, ctr: .1, position: 2 },
    rows: Array.from({ length: 1000 }, (_, index) => ({ keys: [`https://example.test/${index}`], clicks: 0, impressions: 0.05, ctr: 0, position: 5 })),
  });
  assert.equal(snapshot.snapshotKind, 'page');
  assert.equal(snapshot.completeness.status, 'top_rows_truncated_or_unknown');
  assert.equal(snapshot.completeness.rowLimitReached, true);
  assert.ok(Math.abs(snapshot.coverageOfSiteTotals.impressions - 0.5) < 1e-10);
  assert.equal(snapshot.filters.country, null);
});

test('dry-run collection summary never includes query or page values', () => {
  const summary = producer.collectionSummary([
    {
      query: 'never print this query',
      page: 'https://mainedispensaryguide.com/guides/never-print-this',
      clicks: 2,
      impressions: 10,
    },
  ], [{ snapshotKind: 'query', rowCount: 1, completeness: { status: 'top_rows_truncated_or_unknown' }, coverageOfSiteTotals: { impressions: 0.5 } }]);

  assert.deepEqual(summary, {
    rows: 1,
    clicks: 2,
    impressions: 10,
    snapshots: [{ kind: 'query', rows: 1, completeness: 'top_rows_truncated_or_unknown', impressionCoveragePercent: 50 }],
  });
  assert.doesNotMatch(JSON.stringify(summary), /never print this query|never-print-this/);
});

test('missing-credential failure does not print credential paths or identifiers', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-no-creds-'));
  const sentinel = path.join(home, 'private-credential-name.json');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'gsc-search-analytics-daily.cjs')], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GOOGLE_APPLICATION_CREDENTIALS: sentinel },
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /No GSC service-account credentials found/);
  assert.doesNotMatch(result.stdout + result.stderr, /private-credential-name|gcp-mdg-reader|\.hermes\/secrets/);
});
