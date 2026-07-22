const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const audit = require('./gsc-misroute-audit.cjs');

function dailyRecord(overrides = {}) {
  return {
    snapshotDate: '2026-03-04',
    sourceStartDate: '2026-03-03',
    sourceEndDate: '2026-03-03',
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: 'final',
    query: 'maine dispensaries',
    page: 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/',
    clicks: 3,
    impressions: 12,
    ctr: 0.25,
    position: 3,
    ...overrides,
  };
}

test('rejects raw-query misroute audit output paths outside private GSC storage', () => {
  const { privateOutputPath, PRIVATE_DATA_ROOT } = require('./gsc-misroute-audit.cjs');
  assert.match(privateOutputPath(`${PRIVATE_DATA_ROOT}/reports/misroute.md`), /mdg-gsc\/reports\/misroute\.md$/);
  assert.throws(() => privateOutputPath('docs/analytics/misroute.md'), /private GSC data root/);
});

test('CLI refuses to render a query-bearing report to stdout when --output is omitted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-audit-private-'));
  fs.writeFileSync(path.join(root, 'gsc-search-analytics.jsonl'), `${JSON.stringify(dailyRecord({ query: 'never emit this query' }))}\n`);
  const result = spawnSync(process.execPath, [path.join(__dirname, 'gsc-misroute-audit.cjs')], {
    encoding: 'utf8',
    env: { ...process.env, MDG_GSC_DATA_ROOT: root },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--output.*required/i);
  assert.doesNotMatch(result.stdout + result.stderr, /never emit this query/);
});

test('CLI writes query-bearing reports with owner-only permissions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-audit-mode-'));
  const output = path.join(root, 'reports', 'audit.md');
  fs.writeFileSync(path.join(root, 'gsc-search-analytics.jsonl'), `${JSON.stringify(dailyRecord())}\n`);
  const result = spawnSync(process.execPath, [path.join(__dirname, 'gsc-misroute-audit.cjs'), `--output=${output}`], {
    encoding: 'utf8',
    env: { ...process.env, MDG_GSC_DATA_ROOT: root },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(path.dirname(output)).mode & 0o777, 0o700);
  assert.equal(fs.statSync(output).mode & 0o777, 0o600);
});

test('filters by finalized source dates across the Los Angeles DST transition', () => {
  const now = new Date('2026-03-09T19:00:00Z'); // March 9 in Los Angeles, after DST begins.
  const records = [
    dailyRecord({ sourceStartDate: '2026-03-03', sourceEndDate: '2026-03-03' }),
    dailyRecord({ sourceStartDate: '2026-03-09', sourceEndDate: '2026-03-09' }),
    dailyRecord({ sourceStartDate: '2026-03-02', sourceEndDate: '2026-03-02' }),
    dailyRecord({ sourceStartDate: '2026-03-03', sourceEndDate: '2026-03-04' }),
    { query: 'legacy', page: 'https://mainedispensaryguide.com/blog/legacy/', snapshotDate: '2026-03-09' },
  ];

  const filtered = audit.filterByDays(records, 7, now);
  assert.deepEqual(filtered.map(record => record.sourceEndDate), ['2026-03-03', '2026-03-09']);
});

test('reads raw query-level ledgers from the private GSC data root by default', () => {
  assert.match(audit.JSONL_PATH, /\.hermes\/data\/mdg-gsc\/gsc-search-analytics\.jsonl$/);
  assert.doesNotMatch(audit.JSONL_PATH, /apps\/maine-cannabis\/data/);
});

test('deduplicates a repeated source day and aggregates compatible daily facts', () => {
  const records = [
    dailyRecord(),
    dailyRecord({ snapshotDate: '2026-03-05', clicks: 4, impressions: 16, ctr: 0.25, position: 4 }),
    dailyRecord({
      snapshotDate: '2026-03-05',
      sourceStartDate: '2026-03-04',
      sourceEndDate: '2026-03-04',
      clicks: 5,
      impressions: 20,
      ctr: 0.25,
      position: 6,
    }),
    { query: 'legacy', page: 'https://mainedispensaryguide.com/blog/legacy/', snapshotDate: '2026-03-05', clicks: 99, impressions: 999, position: 1 },
  ];

  const deduped = audit.dedupeDailyRecords(records);
  assert.equal(deduped.length, 2);

  const aggregated = audit.aggregateDailyRecords(deduped);
  assert.equal(aggregated.length, 1);
  assert.deepEqual(aggregated[0], {
    query: 'maine dispensaries',
    page: 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/',
    clicks: 9,
    impressions: 36,
    ctr: 0.25,
    position: (16 * 4 + 20 * 6) / 36,
    sourceDates: ['2026-03-03', '2026-03-04'],
  });
});
