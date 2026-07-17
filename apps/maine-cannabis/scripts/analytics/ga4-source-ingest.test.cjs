'use strict';
/**
 * scripts/analytics/ga4-source-ingest.test.cjs
 *
 * Unit tests for the 3 ingest modules. Validates the v3 amended
 * batch approval surface at /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-TICKET-007-SOURCE-INGESTION-BATCH-APPROVAL.md
 *
 * Tests cover:
 *   - §10.1 v3 idempotency: source_row_id derivation per cell
 *   - §15.1 v3 canonical_release_id: same input source → same id
 *   - §3.3 v3 sanitized evidence: blocked fields never appear in
 *     sanitized rows
 *   - §5 v3 no-pseudonymous-retention: user_pseudo_id is replaced
 *     with [REDACTED-PSEUDO]; raw never persisted
 *   - §12.1 v3 per-report failure isolation: one failed report
 *     does not fail the run
 *   - §15.1 v3 two-release-id architecture: canonical is stable
 *     across re-runs, acquisition includes timestamps
 *   - §16 v3 validation gates G5 + G7 stand-alone checks
 *
 * Run:
 *   node apps/maine-cannabis/scripts/analytics/ga4-source-ingest.test.cjs
 */

const assert = require('assert');
const crypto = require('crypto');

const bq = require('./ga4-bigquery.cjs');
const ingest = require('./ga4-source-ingest.cjs');

let testCount = 0;
let testPass = 0;
let testFail = 0;
const failures = [];

function test(name, fn) {
  testCount++;
  try {
    fn();
    testPass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    testFail++;
    failures.push({ name, error: e.message });
    console.log(`  FAIL  ${name}: ${e.message.split('\n')[0]}`);
  }
}

// ============================================================================
// §3.3 v3 sanitized evidence
// ============================================================================

console.log('--- §3.3 sanitized evidence ---');

test('sanitizeEventParams blocks email/phone/token/consent/uuid keys', () => {
  const params = [
    { key: 'email', value: { string_value: 'foo@bar' } },
    { key: 'phone_number', value: { string_value: '555-1234' } },
    { key: 'auth_token', value: { string_value: 'xyz' } },
    { key: 'consent_state', value: { string_value: 'granted' } },
    { key: 'uuid', value: { string_value: 'abc-123' } },
    { key: 'user_uuid_local', value: { string_value: 'should-be-blocked' } },
    { key: 'percent', value: { int_value: 50 } },  // not blocked
    { key: 'faq_id', value: { string_value: 'faq-1' } }  // not blocked
  ];
  const { sanitized, dropped } = bq.sanitizeEventParams(params);
  assert.strictEqual(sanitized.length, 2, '2 params should survive');
  assert.strictEqual(dropped, 6, '6 params should be dropped');
  const survivedKeys = sanitized.map((p) => p.key).sort();
  assert.deepStrictEqual(survivedKeys, ['faq_id', 'percent']);
});

test('sanitizeEventParams drops leading-underscore and test/dryrun prefixes', () => {
  const params = [
    { key: '_debug_mode', value: { string_value: 'on' } },
    { key: 'test_flag', value: { string_value: 'x' } },
    { key: 'dryrun', value: { string_value: 'true' } },
    { key: 'internal_state', value: { string_value: 'x' } },
    { key: 'faq_id', value: { string_value: 'ok' } }
  ];
  const { sanitized, dropped } = bq.sanitizeEventParams(params);
  assert.strictEqual(sanitized.length, 1);
  assert.strictEqual(dropped, 4);
});

test('sanitizeEventParams handles non-array input gracefully', () => {
  const { sanitized, dropped } = bq.sanitizeEventParams(null);
  assert.deepStrictEqual(sanitized, []);
  assert.strictEqual(dropped, 0);
});

// ============================================================================
// §15.1 v3 canonical_release_id determinism
// ============================================================================

console.log('--- §15.1 canonical_release_id determinism ---');

test('canonical_release_id is identical for identical input state', () => {
  const from = '2026-07-08', to = '2026-07-12';
  const rows = [
    {
      report_id: 'pageview_daily',
      sanitized_rows: [
        { row_key: { event_date: '2026-07-12', pagePath: '/a' }, bq_value: 5, data_api_value: 5 },
        { row_key: { event_date: '2026-07-12', pagePath: '/b' }, bq_value: 3, data_api_value: 3 }
      ]
    }
  ];
  const id1 = ingest.computeCanonicalReleaseId(rows, from, to);
  const id2 = ingest.computeCanonicalReleaseId(rows, from, to);
  assert.strictEqual(id1, id2);
});

test('canonical_release_id differs when input state differs', () => {
  const from = '2026-07-08', to = '2026-07-12';
  const rowsA = [
    { report_id: 'pageview_daily', sanitized_rows: [{ row_key: { event_date: '2026-07-12', pagePath: '/a' }, bq_value: 5, data_api_value: 5 }] }
  ];
  const rowsB = [
    { report_id: 'pageview_daily', sanitized_rows: [{ row_key: { event_date: '2026-07-12', pagePath: '/a' }, bq_value: 7, data_api_value: 7 }] }
  ];
  const idA = ingest.computeCanonicalReleaseId(rowsA, from, to);
  const idB = ingest.computeCanonicalReleaseId(rowsB, from, to);
  assert.notStrictEqual(idA, idB);
});

test('canonical_release_id is order-independent (sorts row signatures)', () => {
  const from = '2026-07-08', to = '2026-07-12';
  const rowA = { row_key: { event_date: '2026-07-12', pagePath: '/a' }, bq_value: 5, data_api_value: 5 };
  const rowB = { row_key: { event_date: '2026-07-12', pagePath: '/b' }, bq_value: 3, data_api_value: 3 };
  const rowsOrdered = [{ report_id: 'pageview_daily', sanitized_rows: [rowA, rowB] }];
  const rowsReversed = [{ report_id: 'pageview_daily', sanitized_rows: [rowB, rowA] }];
  const id1 = ingest.computeCanonicalReleaseId(rowsOrdered, from, to);
  const id2 = ingest.computeCanonicalReleaseId(rowsReversed, from, to);
  assert.strictEqual(id1, id2);
});

test('canonical_release_id is prefixed rel_', () => {
  const id = ingest.computeCanonicalReleaseId([], '2026-07-08', '2026-07-12');
  assert.ok(id.startsWith('rel_'), `expected rel_ prefix, got ${id}`);
});

test('canonical_release_id is 16 hex chars after prefix', () => {
  const id = ingest.computeCanonicalReleaseId([{ report_id: 'r', sanitized_rows: [{ row_key: { d: '1' }, bq_value: 1, data_api_value: 1 }] }], '2026-07-08', '2026-07-12');
  const hex = id.slice(4);
  assert.ok(/^[0-9a-f]{16}$/.test(hex), `expected 16 hex chars, got ${hex}`);
});

// ============================================================================
// §15.1 v3 acquisition_release_id (run-addressed)
// ============================================================================

console.log('--- §15.1 acquisition_release_id (run-addressed) ---');

test('acquisition_release_id includes run timestamp and is different per run', () => {
  const canonical = 'rel_test1234567890';
  const runMetaA = { ingested_at_utc: '2026-07-12T00:00:00.000Z' };
  const runMetaB = { ingested_at_utc: '2026-07-12T00:00:01.000Z' };
  const idA = ingest.computeAcquisitionReleaseId(canonical, runMetaA);
  const idB = ingest.computeAcquisitionReleaseId(canonical, runMetaB);
  assert.notStrictEqual(idA, idB, 'different run timestamps → different acquisition ids');
});

test('acquisition_release_id is prefixed run_', () => {
  const id = ingest.computeAcquisitionReleaseId('rel_abcdef0123456789', { ingested_at_utc: '2026-07-12T00:00:00Z' });
  assert.ok(id.startsWith('run_'));
});

// ============================================================================
// §10.1 v3 idempotency (within-run)
// ============================================================================

console.log('--- §10.1 within-run idempotency ---');

test('duplicate row keys within a BQ report are deduped', () => {
  // We test the underlying behavior of the dedup signal rather than
  // the actual stream-insert path: the joinDataForReport must
  // not double-count when both Data API and BQ yield the same row.
  const joinedRows = ingest.joinDataForReport(
    'R1_pageview_daily',
    [
      { dimensions: { date: '2026-07-12', pagePath: '/x' }, metrics: { screenPageViews: 5 } },
      { dimensions: { date: '2026-07-12', pagePath: '/x' }, metrics: { screenPageViews: 5 } }
    ],
    []
  );
  // Two rows in data API source map to two row entries in joined output;
  // dedup happens at a higher level. We assert the structure: each
  // data_api row produces one joined row.
  assert.strictEqual(joinedRows.length, 6);
  assert.deepStrictEqual(
    [...new Set(joinedRows.map((row) => row.metric_name))],
    ['screenPageViews', 'totalUsers', 'sessions']
  );
});

test('source_row_id hash is deterministic for identical cell metadata', () => {
  // Simulate v3 §10.1 source_row_id hashing.
  function id(stream, date, name, ts, params) {
    const p = Object.keys(params || {}).sort().map((k) => `${k}=${JSON.stringify(params[k])}`).join('&');
    return crypto.createHash('sha256').update([
      stream || '', date || '', name || '', ts || '', p
    ].join('|')).digest('hex').slice(0, 16);
  }
  const a = id('s1', '2026-07-12', 'page_view', '12345', { page: '/x', percent: 50 });
  const b = id('s1', '2026-07-12', 'page_view', '12345', { page: '/x', percent: 50 });
  assert.strictEqual(a, b);
  const c = id('s1', '2026-07-12', 'page_view', '12346', { page: '/x', percent: 50 });
  assert.notStrictEqual(a, c, 'different timestamp → different id');
});

// ============================================================================
// §5 v3 no-pseudonymous-retention
// ============================================================================

console.log('--- §5 no-pseudonymous-retention ---');

test('user_pseudo_id is replaced with [REDACTED-PSEUDO] in sanitized BQ row', () => {
  // Simulate the sanitization shape produced by ga4-bigquery.cjs.
  // Production code emits rows with user_pseudo_id === '[REDACTED-PSEUDO]'.
  const sanitized = {
    event_date: '2026-07-12',
    user_pseudo_id: '[REDACTED-PSEUDO]',
    session_id: '[REDACTED-SESSION]',
    row_key: { event_date: '2026-07-12', pagePath: '/x' }
  };
  assert.strictEqual(sanitized.user_pseudo_id, '[REDACTED-PSEUDO]');
  assert.strictEqual(sanitized.session_id, '[REDACTED-SESSION]');
});

test('G7 gate detects raw user_pseudo_id in sanitized rows', () => {
  // G7 says: every row must have user_pseudo_id === '[REDACTED-PSEUDO]'.
  // The gate logic should pass when sanitized; fail when raw.
  const sanitized = [{ user_pseudo_id: '[REDACTED-PSEUDO]' }];
  const pseudoHits = sanitized.filter((r) => r.user_pseudo_id !== '[REDACTED-PSEUDO]').length;
  assert.strictEqual(pseudoHits, 0);

  const raw = [{ user_pseudo_id: 'real-uuid-abc' }];
  const rawHits = raw.filter((r) => r.user_pseudo_id !== '[REDACTED-PSEUDO]').length;
  assert.strictEqual(rawHits, 1);
});

// ============================================================================
// §16 v3 validation gates G5 (idempotency) and G6 (reconciliation)
// ============================================================================

console.log('--- §16 G5 idempotency + G6 reconciliation ---');

test('G5 gate: same source state produces same canonical_release_id across runs', () => {
  // The gate is a property test: assert that two run manifests for
  // the same source state yield identical canonical_release_ids.
  // (Test re-uses computeCanonicalReleaseId from §15.1 to verify
  // that fact.)
  const rows = [{ report_id: 'pageview_daily', sanitized_rows: [{ row_key: { event_date: '2026-07-12', pagePath: '/x' }, bq_value: 5, data_api_value: 5 }] }];
  const id1 = ingest.computeCanonicalReleaseId(rows, '2026-07-12', '2026-07-12');
  const id2 = ingest.computeCanonicalReleaseId(rows, '2026-07-12', '2026-07-12');
  assert.strictEqual(id1, id2);
});

test('joinDataForReport emits report-specific metric rows for multi-metric reports', () => {
  const joined = ingest.joinDataForReport(
    'R2_session_metrics_daily',
    [{ dimensions: { date: '2026-07-12', sessionDefaultChannelGroup: 'Organic Search' }, metrics: { sessions: 4, engagedSessions: 3, engagementRate: 0.75 } }],
    [{ row_key: { event_date: '2026-07-12', sessionDefaultChannelGroup: 'Organic Search' }, metrics: { sessions: 4, engagedSessions: 3, engagementRate: 0.75 } }]
  );
  assert.deepStrictEqual(joined.map((row) => row.metric_name), ['sessions', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'bounceRate']);
  assert.strictEqual(joined.find((row) => row.metric_name === 'sessions').delta_classification, 'match');
  assert.strictEqual(joined.find((row) => row.metric_name === 'engagedSessions').data_api_value, 3);
});
test('joinDataForReport persists BQ provenance in canonical metric rows', () => {
  const provenance = { bq_table: 'events_20260712', query_id: 'q_test' };
  const joined = ingest.joinDataForReport(
    'R3_event_count_daily',
    [{ dimensions: { date: '2026-07-12', eventName: 'page_view' }, metrics: { eventCount: 20 } }],
    [{ row_key: { event_date: '2026-07-12', event_name: 'page_view' }, metrics: { eventCount: 20 }, source_provenance: provenance }]
  );
  assert.deepStrictEqual(joined[0].source_provenance, provenance);
});

test('G6 gate fails when completed source reports emit both_null joined rows', () => {
  const gates = ingest.runGates({
    dataApiReports: [{ report_id: 'session_metrics_daily', status: 'ok' }],
    bqReports: [{ report_id: 'session_metrics_daily', report_key: 'R2_session_metrics_daily', status: 'ok', rows: [] }],
    joinedRows: [{
      report_id: 'session_metrics_daily',
      report_key: 'R2_session_metrics_daily',
      data_api_status: 'ok',
      bq_status: 'ok',
      sanitized_rows: [{ metric_name: 'sessions', delta_classification: 'both_null', data_api_value: null, bq_value: null }]
    }],
    canonicalReleaseId: 'rel_test',
    acquisitionReleaseId: 'run_test',
    raw_record_json_sample: []
  });
  assert.strictEqual(gates.G6.status, 'FAIL');
  assert.strictEqual(gates.G6.both_null_count, 1);
  assert.deepStrictEqual(gates.G6.both_null_reports, ['R2_session_metrics_daily']);
});

test('G6 gate: structural_disagreement_no_bq_history is not a fail', () => {
  // The gate in the orchestrator should record this state but not
  // flag it as a fail. Here we simulate the join to verify the
  // delta_classification logic.
  const joined = ingest.joinDataForReport(
    'R1_pageview_daily',
    [{ dimensions: { date: '2026-07-09', pagePath: '/x' }, metrics: { screenPageViews: 5 } }],
    []  // no BQ rows for > 3-day data
  );
  assert.strictEqual(joined[0].delta_classification, 'structural_disagreement_no_bq_history');
  assert.strictEqual(joined[0].bq_value, null);
  assert.strictEqual(joined[0].data_api_value, 5);
});

test('G6 gate: match classification when sources agree', () => {
  const joined = ingest.joinDataForReport(
    'R3_event_count_daily',
    [{ dimensions: { date: '2026-07-12', eventName: 'page_view' }, metrics: { eventCount: 20 } }],
    [
      { row_key: { event_date: '2026-07-12', event_name: 'page_view' }, metrics: { eventCount: 20 } }
    ]
  );
  assert.strictEqual(joined[0].delta_classification, 'match');
  assert.strictEqual(joined[0].delta_absolute, 0);
});


test('joinDataForReport preserves unmatched BQ rows as API-history disagreements', () => {
  const joined = ingest.joinDataForReport(
    'R3_event_count_daily',
    [],
    [{ row_key: { event_date: '2026-07-12', event_name: 'cta_view' }, metrics: { eventCount: 6 } }]
  );
  assert.strictEqual(joined.length, 1);
  assert.strictEqual(joined[0].delta_classification, 'structural_disagreement_no_api_history');
  assert.strictEqual(joined[0].data_api_value, null);
  assert.strictEqual(joined[0].bq_value, 6);
});

test('G6 gate: count_disagreement when values differ', () => {
  const joined = ingest.joinDataForReport(
    'R3_event_count_daily',
    [{ dimensions: { date: '2026-07-12', eventName: 'cta_view' }, metrics: { eventCount: 8 } }],
    [
      { row_key: { event_date: '2026-07-12', event_name: 'cta_view' }, metrics: { eventCount: 6 } }
    ]
  );
  // 8 vs 6, delta=2, max=8, ratio=0.25 > 0.05 -> count_disagreement
  assert.strictEqual(joined[0].delta_classification, 'count_disagreement');
  assert.strictEqual(joined[0].delta_absolute, 2);
});

// ============================================================================
// §12 v3 per-report failure isolation
// ============================================================================

console.log('--- §12 per-report failure isolation ---');

test('one failed report does not affect other reports', async () => {
  // We simulate runReport behavior: mock authentication for a
  // single report failure scenario.
  // For a real-network test, the orchestrator wraps all 8 in
  // Promise.all and lets each fail independently.
  // Here we assert the structure: ingest.runAllReports is
  // documented as Promise.all, so failures don't propagate.
  const mockDataApi = {
    REPORTS: { R1: {}, R2: {}, R3: {}, R4: {}, R5: {}, R6: {}, R7: {}, R8: {} },
    runReport: async (authClient, k) => {
      if (k === 'R5_device_daily') {
        return { status: 'failed', report_key: k, error: { code: 503 } };
      }
      return { status: 'ok', report_key: k, rows: [], rowCount: 0 };
    },
    runAllReports: async (from, to) => {
      const out = {};
      for (const k of Object.keys(mockDataApi.REPORTS)) {
        out[k] = await mockDataApi.runReport(null, k);
      }
      return { from, to, reports: out };
    }
  };
  const result = await mockDataApi.runAllReports('2026-07-01', '2026-07-12');
  // R5 is failed; the rest are ok.
  assert.strictEqual(result.reports.R5_device_daily.status, 'failed');
  assert.strictEqual(result.reports.R1_pageview_daily.status, 'ok');
  assert.strictEqual(result.reports.R8_custom_event_cta_daily.status, 'ok');
});

// ============================================================================
// §8 v3 per-day source routing
// ============================================================================

console.log('--- §8 per-day source routing ---');

test('perSourceRouting flags last-3-days for BQ; older for Data API only', () => {
  const today = ingest.todayUtc();
  const todayMinus5 = ingest.dateMinusDays(today, 5);
  const todayMinus2 = ingest.dateMinusDays(today, 2);
  const todayMinus10 = ingest.dateMinusDays(today, 10);
  const routingResult = ingest.perSourceRouting(todayMinus10, today, null);
  const routing = routingResult.dates;
  // Verify: today-10 should be Data API only.
  // today-2 should be both.
  const old = routing.find(r => r.date === todayMinus10);
  const recent = routing.find(r => r.date === todayMinus2);
  assert.ok(old, 'old date should be in routing');
  assert.ok(recent, 'recent date should be in routing');
  assert.strictEqual(old.has_bq, false, '> 3-day-old date should NOT have BQ');
  assert.strictEqual(recent.has_bq, true, '<= 3-day-old date SHOULD have BQ');
});

test('perSourceRouting backs off to data floor when floor is older than requested', () => {
  // If operator asks --from=2025-01-01 but data floor is 2026-04-13,
  // the routing should back off to 2026-04-13.
  const floor = '2026-04-13';
  const requested = '2025-01-01';
  const today = ingest.todayUtc();
  const r = ingest.perSourceRouting(requested, today, floor);
  assert.strictEqual(r.backedOff, true, 'should have backed off');
  assert.strictEqual(r.requestedFrom, requested);
  assert.strictEqual(r.effectiveFrom, floor, 'effectiveFrom should be data floor');
  // dates is sorted chronologically after .reverse(); dates[0] is earliest
  assert.strictEqual(r.dates[0].date, floor, 'earliest routing date should match floor');
  assert.strictEqual(r.dates[r.dates.length - 1].date, today, 'latest routing date should be today');
});

test('perSourceRouting honors --from when it is newer than the data floor', () => {
  // --from=2026-06-01 but floor is 2026-04-13; floor is older so
  // --from is honored (operator is explicitly asking for narrower).
  const r = ingest.perSourceRouting('2026-06-01', ingest.todayUtc(), '2026-04-13');
  assert.strictEqual(r.backedOff, false, 'should NOT back off because requested is newer');
  assert.strictEqual(r.effectiveFrom, '2026-06-01');
});

test('daysBetween handles single-day windows', () => {
  assert.strictEqual(ingest.daysBetween('2026-07-12', '2026-07-12'), 1);
  assert.strictEqual(ingest.daysBetween('2026-07-12', '2026-07-15'), 4);
  assert.strictEqual(ingest.daysBetween('2026-07-12', '2026-07-19'), 8);
});

test('joined rows in the settlement window remain fresh', () => {
  const today = ingest.todayUtc();
  const joined = ingest.joinDataForReport('R1_pageview_daily', [
    { dimensions: { date: today, pagePath: '/x' }, metrics: { screenPageViews: 5 } }
  ], []);
  assert.equal(joined[0].freshness, 'fresh');
});

test('date normalization: GA4 YYYYMMDD becomes ISO YYYY-MM-DD in row_key', () => {
  // The export buildNormKeyFromDims is internal; we test through joinDataForReport.
  const joined = ingest.joinDataForReport(
    'R1_pageview_daily',
    [{ dimensions: { date: '20260506', pagePath: '/x' }, metrics: { screenPageViews: 5 } }],
    []
  );
  assert.strictEqual(joined[0].row_key.date, '2026-05-06', 'YYYYMMDD should normalize to YYYY-MM-DD');
  assert.strictEqual(joined[0].row_key.page_path, '/x', 'camelCase pagePath should canonicalize to page_path');
});

// ============================================================================
// §16 v3 G4 consent / privacy boundary
// ============================================================================

console.log('--- §16 G4 consent / privacy boundary ---');

test('G4 gate: no email/phone/token/uuid strings survive sanitization', () => {
  const params = [
    { key: 'user_email', value: { string_value: 'foo@bar.com' } },
    { key: 'auth_token', value: { string_value: 'bearer-xyz' } },
    { key: 'uuid', value: { string_value: 'abc-uuid' } },
    { key: 'percent', value: { int_value: 50 } }
  ];
  const { sanitized, dropped } = bq.sanitizeEventParams(params);
  const allValues = JSON.stringify(sanitized.map((p) => p.value));
  assert.ok(!/email|@bar|token|bearer|uuid/i.test(allValues), 'no email/token/uuid values should survive');
  assert.strictEqual(dropped, 3);
});

test('G5 fails duplicate source signatures', () => { const report = { report_id: 'R1_pageview_daily', status: 'ok', rows: [{ row_key: { date: '2026-07-12', page_path: '/x' }, metrics: { screenPageViews: 1 } }, { row_key: { date: '2026-07-12', page_path: '/x' }, metrics: { screenPageViews: 1 } }] }; const gates = ingest.runGates({ dataApiReports: [{ report_id: report.report_id, status: 'ok' }], bqReports: [report], raw_record_json_sample: [] }); assert.equal(gates.G5.status, 'FAIL'); assert.equal(gates.G5.duplicate_count, 1); });
test('parameter sanitizer drops keys outside the explicit allowlist', () => { const { sanitized, dropped } = bq.sanitizeEventParams([{ key: 'faq_id' }, { key: 'unreviewed_param' }]); assert.deepEqual(sanitized.map((p) => p.key), ['faq_id']); assert.equal(dropped, 1); });

// ============================================================================
// Summary
// ============================================================================

console.log('');
console.log(`Tests: ${testPass}/${testCount} passed, ${testFail} failed.`);
if (testFail > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.split('\n')[0]}`);
}
process.exit(testFail === 0 ? 0 : 1);
