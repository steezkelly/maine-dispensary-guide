const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { inspectGscHealth, renderHealth } = require('./gsc-ledger-health.cjs');

function dailyRecord(sourceDate = '2026-07-18') {
  return {
    snapshotDate: '2026-07-21',
    sourceStartDate: sourceDate,
    sourceEndDate: sourceDate,
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: 'final',
    query: 'never print this private query',
    page: 'https://mainedispensaryguide.com/guides/never-print-this',
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    position: 4,
  };
}

function aggregateSnapshot(kind, sourceDate = '2026-07-18') {
  const dimensions = kind === 'query-by-page' ? ['query', 'page'] : [kind];
  return {
    snapshotKind: kind,
    snapshotDate: '2026-07-21',
    sourceWindow: {
      sourceStartDate: sourceDate,
      sourceEndDate: sourceDate,
      sourceTimezone: 'America/Los_Angeles',
      sourceDataState: 'final',
    },
    dimensions,
    rows: [{
      keys: dimensions.map(dimension => `never print this private ${dimension}`),
      clicks: 1,
      impressions: 10,
      ctr: 0.1,
      position: 4,
    }],
  };
}

function fixture(sourceDate = '2026-07-18') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-health-'));
  const ledger = path.join(root, 'gsc-search-analytics.jsonl');
  const log = path.join(root, 'cron.log');
  const daily = path.join(root, 'mdg-gsc-daily.sh');
  const weekly = path.join(root, 'mdg-gsc-weekly.sh');
  const snapshotDir = path.join(root, 'gsc-search-analytics-snapshots');
  fs.mkdirSync(snapshotDir, { mode: 0o700 });
  fs.writeFileSync(ledger, `${JSON.stringify(dailyRecord(sourceDate))}\n`, { mode: 0o600 });
  for (const kind of ['query', 'page', 'query-by-page']) {
    fs.writeFileSync(path.join(snapshotDir, `${kind}.jsonl`), `${JSON.stringify(aggregateSnapshot(kind, sourceDate))}\n`, { mode: 0o600 });
  }
  fs.writeFileSync(log, 'query-free fixture log\n', { mode: 0o600 });
  fs.writeFileSync(daily, '#!/bin/sh\n', { mode: 0o700 });
  fs.writeFileSync(weekly, '#!/bin/sh\n', { mode: 0o700 });
  return { root, ledger, log, daily, weekly, snapshotDir };
}

test('healthy status covers finalized ledger freshness, permissions, logs, cron, and wrappers without query-bearing output', () => {
  const f = fixture();
  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `0 6 * * * ${f.daily}\n0 7 * * 1 ${f.weekly}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
    maxLogAgeHours: 24,
  });
  const output = renderHealth(health);

  assert.equal(health.ok, true);
  assert.equal(health.ledger.latestFinalizedSourceDay, '2026-07-18');
  assert.equal(health.ledger.expectedFinalizedSourceDay, '2026-07-18');
  assert.equal(health.ledger.uniqueSourceDays, 1);
  assert.equal(health.snapshots.query.acceptedRows, 1);
  assert.match(output, /GSC ledger health: PASS/);
  assert.doesNotMatch(output, /never print this private query|never-print-this|"query"|"page"/);
});

test('health fails closed for stale data, permissive mode, dirty rows, missing cron registration, and missing wrappers', () => {
  const f = fixture('2026-07-17');
  fs.appendFileSync(f.ledger, `${JSON.stringify(dailyRecord('2026-07-01'), null, 0).replace('2026-07-01","sourceEndDate":"2026-07-01', '2026-07-01","sourceEndDate":"2026-07-02')}\n`);
  fs.chmodSync(f.ledger, 0o644);
  fs.unlinkSync(f.weekly);

  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `0 6 * * * ${f.daily}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
    maxLogAgeHours: 24,
  });

  assert.equal(health.ok, false);
  assert.ok(health.failures.some(failure => failure.includes('stale')));
  assert.ok(health.failures.some(failure => failure.includes('0600')));
  assert.ok(health.failures.some(failure => failure.includes('quarantinable')));
  assert.ok(health.failures.some(failure => failure.includes('weekly cron')));
  assert.ok(health.failures.some(failure => failure.includes('weekly wrapper')));
});

test('health fails closed when the private data root is accessible to group or other users', () => {
  const f = fixture();
  fs.chmodSync(f.root, 0o755);
  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `0 6 * * * ${f.daily}\n0 7 * * 1 ${f.weekly}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
  });
  assert.equal(health.ok, false);
  assert.ok(health.failures.some(failure => failure.includes('0700')));
});

test('health fails closed without following a symlinked ledger outside private storage', () => {
  const f = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-health-outside-'));
  const outsideLedger = path.join(outside, 'ledger.jsonl');
  fs.writeFileSync(outsideLedger, `${JSON.stringify(dailyRecord())}\n`, { mode: 0o600 });
  fs.unlinkSync(f.ledger);
  fs.symlinkSync(outsideLedger, f.ledger);

  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `0 6 * * * ${f.daily}\n0 7 * * 1 ${f.weekly}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
  });

  assert.equal(health.ok, false);
  assert.ok(health.failures.some(failure => /ledger.*symlink/i.test(failure)));
  assert.equal(health.ledger.finalizedDailyRows, 0);
});

test('health validates snapshot contents, permissions, and symlink boundaries without private rows in output', () => {
  const f = fixture();
  const queryPath = path.join(f.snapshotDir, 'query.jsonl');
  const pagePath = path.join(f.snapshotDir, 'page.jsonl');
  const queryByPagePath = path.join(f.snapshotDir, 'query-by-page.jsonl');
  fs.writeFileSync(queryPath, `${JSON.stringify({ ...aggregateSnapshot('query'), dimensions: ['page'] })}\n`);
  fs.chmodSync(pagePath, 0o644);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-health-snapshot-outside-'));
  const outsideSnapshot = path.join(outside, 'query-by-page.jsonl');
  fs.writeFileSync(outsideSnapshot, `${JSON.stringify(aggregateSnapshot('query-by-page'))}\n`, { mode: 0o600 });
  fs.unlinkSync(queryByPagePath);
  fs.symlinkSync(outsideSnapshot, queryByPagePath);

  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `0 6 * * * ${f.daily}\n0 7 * * 1 ${f.weekly}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
  });
  const output = renderHealth(health);

  assert.equal(health.ok, false);
  assert.ok(health.failures.some(failure => /query snapshot.*quarantinable/i.test(failure)));
  assert.ok(health.failures.some(failure => /page snapshot.*0600/i.test(failure)));
  assert.ok(health.failures.some(failure => /query-by-page snapshot.*symlink/i.test(failure)));
  assert.doesNotMatch(output, /never print this private|"query"|"page"/);
});

test('health ignores commented crontab entries and rejects a permissive cron log', () => {
  const f = fixture();
  fs.chmodSync(f.log, 0o644);
  const health = inspectGscHealth({
    dataRoot: f.root,
    now: new Date('2026-07-22T04:00:00.000Z'),
    cronActive: true,
    crontab: `# 0 6 * * * ${f.daily}\n# 0 7 * * 1 ${f.weekly}\n`,
    dailyWrapper: f.daily,
    weeklyWrapper: f.weekly,
  });

  assert.equal(health.ok, false);
  assert.equal(health.scheduler.dailyCronRegistered, false);
  assert.equal(health.scheduler.weeklyCronRegistered, false);
  assert.ok(health.failures.some(failure => /cron log.*0600/i.test(failure)));
});
