const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  backupPrivateState,
  inspectLedger,
  inspectSnapshots,
  normalizePrivateState,
  storePrivateCollection,
  upsertDailyRecords,
} = require('./gsc-ledger.cjs');

function dailyRecord(overrides = {}) {
  return {
    snapshotDate: '2026-07-21',
    sourceStartDate: '2026-07-18',
    sourceEndDate: '2026-07-18',
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: 'final',
    query: 'private fixture query',
    page: 'https://mainedispensaryguide.com/guides/private-fixture',
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    position: 4.5,
    ...overrides,
  };
}

function snapshot(kind = 'query', overrides = {}) {
  const dimensionsByKind = {
    query: ['query'],
    page: ['page'],
    'query-by-page': ['query', 'page'],
  };
  const dimensions = dimensionsByKind[kind];
  return {
    schemaVersion: 1,
    snapshotKind: kind,
    extractedAt: '2026-07-21T12:00:00.000Z',
    snapshotDate: '2026-07-21',
    sourceWindow: {
      sourceStartDate: '2026-07-18',
      sourceEndDate: '2026-07-18',
      sourceTimezone: 'America/Los_Angeles',
      sourceDataState: 'final',
    },
    searchType: 'web',
    filters: { country: null, device: null, searchAppearance: null },
    dimensions,
    rowLimit: 1000,
    rowCount: 1,
    completeness: { status: 'top_rows_truncated_or_unknown', rowLimitReached: false },
    rows: [{ keys: dimensions.map(dimension => `private fixture ${dimension}`), clicks: 1, impressions: 10, ctr: 0.1, position: 4.5 }],
    ...overrides,
  };
}

function privateFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-ledger-'));
  const snapshotDir = path.join(root, 'gsc-search-analytics-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });
  return { root, ledger: path.join(root, 'gsc-search-analytics.jsonl'), snapshotDir };
}

test('inspection fails closed on malformed, rolling-window, invalid-shape, and duplicate rows without returning query text', () => {
  const duplicate = dailyRecord({ snapshotDate: '2026-07-22', clicks: 2 });
  const text = [
    JSON.stringify(dailyRecord()),
    JSON.stringify(duplicate),
    JSON.stringify(dailyRecord({ sourceStartDate: '2026-07-01' })),
    JSON.stringify(dailyRecord({ query: '' })),
    '{bad json',
  ].join('\n');

  const result = inspectLedger(text);
  assert.equal(result.summary.totalRows, 5);
  assert.equal(result.summary.acceptedRows, 1);
  assert.equal(result.summary.duplicateRows, 1);
  assert.equal(result.summary.quarantinedRows, 3);
  assert.equal(result.records[0].clicks, 2);
  assert.doesNotMatch(JSON.stringify(result.summary), /private fixture query|private-fixture/);
});

test('inspection rejects impossible calendar dates', () => {
  const impossible = dailyRecord({
    snapshotDate: '2026-02-31',
    sourceStartDate: '2026-02-31',
    sourceEndDate: '2026-02-31',
  });
  const result = inspectLedger(`${JSON.stringify(impossible)}\n`);
  assert.equal(result.summary.acceptedRows, 0);
  assert.equal(result.summary.quarantinedRows, 1);
});

test('normalization backs up all private ledgers, quarantines rejected rows, deduplicates facts, and locks files to owner-only', () => {
  const { root, ledger, snapshotDir } = privateFixture();
  fs.writeFileSync(ledger, [
    JSON.stringify(dailyRecord()),
    JSON.stringify(dailyRecord({ snapshotDate: '2026-07-22', clicks: 2 })),
    JSON.stringify(dailyRecord({ sourceStartDate: '2026-07-01' })),
  ].join('\n') + '\n', { mode: 0o644 });
  for (const kind of ['query', 'page', 'query-by-page']) {
    fs.writeFileSync(path.join(snapshotDir, `${kind}.jsonl`), [
      JSON.stringify(snapshot(kind)),
      JSON.stringify(snapshot(kind, { extractedAt: '2026-07-22T12:00:00.000Z', snapshotDate: '2026-07-22' })),
      JSON.stringify(snapshot(kind, { sourceWindow: { ...snapshot(kind).sourceWindow, sourceStartDate: '2026-07-01' } })),
    ].join('\n') + '\n');
  }

  const result = normalizePrivateState(root, { timestamp: '20260722T010203Z' });
  assert.equal(result.ledger.acceptedRows, 1);
  assert.equal(result.ledger.duplicateRows, 1);
  assert.equal(result.ledger.quarantinedRows, 1);
  assert.equal(result.snapshots.query.acceptedRows, 1);
  assert.equal(result.snapshots.query.duplicateRows, 1);
  assert.equal(result.snapshots.query.quarantinedRows, 1);
  assert.ok(fs.existsSync(path.join(result.backupDir, 'SHA256SUMS')));
  assert.ok(fs.existsSync(result.quarantinePath));
  assert.equal(fs.statSync(ledger).mode & 0o777, 0o600);
  assert.equal(fs.readFileSync(ledger, 'utf8').trim().split('\n').length, 1);
});

test('collector upsert refuses a dirty ledger and leaves it byte-identical', () => {
  const { root, ledger } = privateFixture();
  const dirty = `${JSON.stringify(dailyRecord({ sourceStartDate: '2026-07-01' }))}\n`;
  fs.writeFileSync(ledger, dirty);

  assert.throws(() => upsertDailyRecords(ledger, [dailyRecord()], { root }), /normalize/i);
  assert.equal(fs.readFileSync(ledger, 'utf8'), dirty);
});

test('collector upsert replaces a repeated source-day fact instead of duplicating it', () => {
  const { root, ledger } = privateFixture();
  fs.writeFileSync(ledger, `${JSON.stringify(dailyRecord())}\n`);

  const result = upsertDailyRecords(ledger, [dailyRecord({ snapshotDate: '2026-07-22', clicks: 3 })], { root });
  const rows = fs.readFileSync(ledger, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(result.totalRows, 1);
  assert.equal(result.replacedRows, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].clicks, 3);
  assert.equal(fs.statSync(ledger).mode & 0o777, 0o600);
});

test('collector upsert rejects a symlinked output parent that escapes the private root', () => {
  const { root } = privateFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-outside-'));
  fs.symlinkSync(outside, path.join(root, 'escaped-snapshots'));
  const target = path.join(root, 'escaped-snapshots', 'gsc-search-analytics.jsonl');

  assert.throws(
    () => upsertDailyRecords(target, [dailyRecord()], { root }),
    /private GSC data root/i,
  );
  assert.equal(fs.existsSync(path.join(outside, 'gsc-search-analytics.jsonl')), false);
});

test('backup manifest contains hashes and relative paths but no raw row content', () => {
  const { root, ledger } = privateFixture();
  fs.writeFileSync(ledger, `${JSON.stringify(dailyRecord())}\n`);
  const backupDir = backupPrivateState(root, '20260722T020304Z');
  const manifest = fs.readFileSync(path.join(backupDir, 'SHA256SUMS'), 'utf8');
  assert.match(manifest, /^[a-f0-9]{64}  gsc-search-analytics\.jsonl\n$/);
  assert.doesNotMatch(manifest, /private fixture query|private-fixture/);
});

test('backup destination is owner-only before private bytes are copied', () => {
  const { root, ledger } = privateFixture();
  fs.writeFileSync(ledger, 'private bytes\n', { mode: 0o644 });
  const originalCopy = fs.copyFileSync;
  let observedMode = null;
  fs.copyFileSync = (source, target) => {
    observedMode = fs.statSync(target).mode & 0o777;
    return originalCopy(source, target);
  };
  try {
    backupPrivateState(root, '20260722T010101Z');
  } finally {
    fs.copyFileSync = originalCopy;
  }
  assert.equal(observedMode, 0o600);
});

test('snapshot inspection quarantines malformed private rows instead of preserving them', () => {
  const malformed = snapshot('query', {
    rows: [{ keys: [], clicks: -1, impressions: 10, ctr: 0.1, position: 4 }],
  });
  const result = inspectSnapshots(`${JSON.stringify(malformed)}\n`, 'query');
  assert.equal(result.summary.acceptedRows, 0);
  assert.equal(result.summary.quarantinedRows, 1);
});

test('snapshot inspection rejects impossible extraction dates', () => {
  const impossible = snapshot('query', { snapshotDate: '2026-02-31' });
  const result = inspectSnapshots(`${JSON.stringify(impossible)}\n`, 'query');
  assert.equal(result.summary.acceptedRows, 0);
  assert.equal(result.summary.quarantinedRows, 1);
});

test('snapshot inspection rejects dimensions that do not match the declared snapshot kind', () => {
  const malformed = snapshot('query', { dimensions: ['page'] });
  const result = inspectSnapshots(`${JSON.stringify(malformed)}\n`, 'query');
  assert.equal(result.summary.acceptedRows, 0);
  assert.equal(result.rejected[0].reason, 'unexpected_dimensions');
});

test('collection validates every private target before writing any file', () => {
  const { root, ledger, snapshotDir } = privateFixture();
  const original = `${JSON.stringify(dailyRecord())}\n`;
  fs.writeFileSync(ledger, original);
  fs.writeFileSync(path.join(snapshotDir, 'query.jsonl'), `${JSON.stringify(snapshot('query', {
    sourceWindow: { ...snapshot('query').sourceWindow, sourceStartDate: '2026-07-01' },
  }))}\n`);

  assert.throws(() => storePrivateCollection({
    root,
    ledgerPath: ledger,
    records: [dailyRecord({ sourceStartDate: '2026-07-19', sourceEndDate: '2026-07-19' })],
    snapshotDir,
    snapshots: ['query', 'page', 'query-by-page'].map(kind => snapshot(kind)),
  }), /normalize/i);
  assert.equal(fs.readFileSync(ledger, 'utf8'), original);
});
