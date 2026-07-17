'use strict';
const assert = require('node:assert/strict');
const join = require('./ticket008-page-window-join.cjs');

let pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`PASS ${name}`); }
  catch (err) { console.error(`FAIL ${name}: ${err.message}`); process.exitCode = 1; }
}

console.log('Ticket 008 — canonicalizer and cross-source join tests');

test('root path remains root', () => assert.equal(join.canonicalizePagePath('/'), '/'));
test('terminal slash is removed', () => assert.equal(join.canonicalizePagePath('/guides/'), '/guides'));
test('query and fragment are removed', () => assert.equal(join.canonicalizePagePath('/guides/x/?utm=1#faq'), '/guides/x'));
test('absolute URL becomes pathname', () => assert.equal(join.canonicalizePagePath('https://mainedispensaryguide.com/guides/x?x=1'), '/guides/x'));
test('repeated slashes are normalized', () => assert.equal(join.canonicalizePagePath('//guides///x//'), '/guides/x'));
test('missing leading slash is added', () => assert.equal(join.canonicalizePagePath('guides/x'), '/guides/x'));
test('invalid empty path returns null', () => assert.equal(join.canonicalizePagePath(''), null));
test('GA4 compact date normalizes', () => assert.equal(join.normalizeDate('20260712'), '2026-07-12'));
test('ISO date remains stable', () => assert.equal(join.normalizeDate('2026-07-12'), '2026-07-12'));
test('invalid date returns null', () => assert.equal(join.normalizeDate('yesterday'), null));

test('GA4 release extracts page path rows', () => {
  const rows = join.normalizeGa4Release({ rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 4, bq_value: null }] }] });
  assert.equal(rows.length, 1); assert.equal(rows[0].canonical_page_path, '/x'); assert.equal(rows[0].date, '2026-07-12');
});

test('GA4 page-window rows prefer canonical BigQuery values with Data API fallback', () => {
  const bqRows = join.normalizeGa4Release({ rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 4, bq_value: 7 }] }] });
  assert.equal(bqRows[0].value, 7);

  const fallbackRows = join.normalizeGa4Release({ rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 4, bq_value: null }] }] });
  assert.equal(fallbackRows[0].value, 4);
});
test('R1 sessions use the Data API canonical value at metric granularity', () => {
  const rows = join.normalizeGa4Release({ rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, metric_name: 'sessions', data_api_value: 4, bq_value: 7 }] }] });
  assert.equal(rows[0].value, 4); assert.equal(rows[0].metric_source, 'ga4_data_api');
});

test('GA4 release ignores non-page-window rows', () => {
  const rows = join.normalizeGa4Release({ rows: [{ report_key: 'R2_session_metrics_daily', sanitized_rows: [{ row_key: { date: '20260712', channel: 'Organic' }, data_api_value: 4 }] }] });
  assert.equal(rows.length, 0);
});
test('Vercel rows accept requestPath', () => {
  const rows = join.normalizeVercelRows([{ day: '2026-07-12', requestPath: '/x/', value: 3 }]);
  assert.equal(rows[0].canonical_page_path, '/x'); assert.equal(rows[0].value, 3);
});
test('Vercel rows accept a rows envelope', () => {
  const rows = join.normalizeVercelRows({ rows: [{ date: '2026-07-12', request_path: '/x', metrics: { visits: 3 } }] });
  assert.equal(rows.length, 1); assert.equal(rows[0].value, 3);
});

test('both sources produce one joined row', () => {
  const rows = join.joinPageWindow({
    ga4Release: { canonical_release_id: 'rel_a', rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 4 }] }] },
    vercelRows: [{ day: '2026-07-12', requestPath: '/x/', value: 4 }],
    sourceReleaseIds: { canonical_release_id: 'rel_a', acquisition_release_id: 'run_a' },
  });
  assert.equal(rows.length, 1); assert.equal(rows[0].source_presence, 'both'); assert.equal(rows[0].reconciliation_status, 'matched');
});
test('GA4-only rows are explicit', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 4 }] }] }, vercelRows: [] });
  assert.equal(rows[0].source_presence, 'ga4_only'); assert.equal(rows[0].reconciliation_status, 'missing_vercel');
});
test('Vercel-only rows are explicit', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [] }, vercelRows: [{ day: '2026-07-12', requestPath: '/x', value: 4 }] });
  assert.equal(rows[0].source_presence, 'vercel_only'); assert.equal(rows[0].reconciliation_status, 'missing_ga4');
});
test('source delta preserves both values', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 8 }] }] }, vercelRows: [{ day: '2026-07-12', requestPath: '/x', value: 6 }] });
  assert.equal(rows[0].reconciliation_status, 'source_delta'); assert.equal(rows[0].ga4_r1.value, 8); assert.equal(rows[0].vercel_a4.value, 6); assert.equal(rows[0].delta_fields.value.absolute, 2);
});

test('GA4 screenPageViews reconcile with Vercel pageviews while Vercel visits remain distinct', () => {
  const rows = join.joinPageWindow({
    ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{
      row_key: { date: '20260712', page_path: '/x', metric_name: 'screenPageViews' }, metric_name: 'screenPageViews', data_api_value: 8,
    }] }] },
    vercelRows: [
      { day: '2026-07-12', requestPath: '/x', metric_name: 'pageviews', value: 6 },
      { day: '2026-07-12', requestPath: '/x', metric_name: 'visits', value: 4 },
    ],
  });
  const pageviews = rows.find((row) => row.observation_identity === 'metric:pageviews');
  const visits = rows.find((row) => row.observation_identity === 'metric:visits');
  assert.equal(rows.length, 2);
  assert.equal(pageviews.source_presence, 'both');
  assert.equal(pageviews.reconciliation_status, 'source_delta');
  assert.equal(pageviews.delta_fields.value.absolute, 2);
  assert.equal(visits.source_presence, 'vercel_only');
});
test('page manifest identity is attached', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [], manifestRows: [{ page_id: 'page-x', canonical_path: '/x' }] });
  assert.equal(rows[0].page_manifest_row_key, 'page-x');
});
test('row key joins query variants to same page', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: 'https://example.com/x/?utm=1' }, data_api_value: 1 }] }] }, vercelRows: [{ day: '2026-07-12', requestPath: '/x/', value: 1 }] });
  assert.equal(rows.length, 1); assert.equal(rows[0].source_presence, 'both');
});
test('different dates do not cross-join', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260711', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [{ day: '2026-07-12', requestPath: '/x', value: 1 }] });
  assert.equal(rows.length, 2);
});
test('pre-CSP conversion window is degraded', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R3_event_count_daily', sanitized_rows: [{ row_key: { date: '20260711', page_path: '/x', event_name: 'lead_capture' }, data_api_value: 1 }] }] }, vercelRows: [] });
  assert.equal(rows[0].measurement_status, 'WINDOW_MEASUREMENT_DEGRADED');
});
test('post-CSP conversion window is measured', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R3_event_count_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x', event_name: 'lead_capture' }, data_api_value: 1 }] }] }, vercelRows: [] });
  assert.equal(rows[0].measurement_status, 'MEASURED');
});
test('A5 rows are blocked', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [] }, vercelRows: [{ day: '2026-07-12', requestPath: '/x', value: 1, source: 'A5', source_family: 'speed_insights' }] });
  assert.equal(rows[0].measurement_status, 'MEASUREMENT_BLOCKED'); assert.equal(rows[0].measurement_block_reason, 'A5_SPEED_INSIGHTS_DEFERRED');
});
test('release IDs are preserved', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [], sourceReleaseIds: { canonical_release_id: 'rel_x', acquisition_release_id: 'run_y' } });
  assert.equal(rows[0].canonical_release_id, 'rel_x'); assert.equal(rows[0].acquisition_release_id, 'run_y');
});
test('privacy assertion is explicit', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [] });
  assert.equal(rows[0].privacy_redaction_status, 'asserted_no_user_level_join');
});
test('manifest evidence counts statuses', () => {
  const rows = [{ reconciliation_status: 'matched', source_presence: 'both', measurement_status: 'MEASURED', measurement_block_reason: null, privacy_redaction_status: 'asserted_no_user_level_join' }, { reconciliation_status: 'missing_vercel', source_presence: 'ga4_only', measurement_status: 'MEASURED', measurement_block_reason: null, privacy_redaction_status: 'asserted_no_user_level_join' }];
  const m = join.buildEvidenceManifest(rows, { sourceReleaseIds: { canonical_release_id: 'rel_x' }, windowStart: '2026-07-12', windowEnd: '2026-07-12' });
  assert.equal(m.row_count, 2); assert.equal(m.reconciliation_status_counts.matched, 1); assert.equal(m.source_presence_counts.ga4_only, 1); assert.equal(m.privacy_redaction_assertion, true);
});
test('a post-CSP window settles after the arrival-lag threshold', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [], asOf: '2026-07-16' });
  assert.equal(rows[0].settlement_state, 'settled');
});
test('a recent window remains fresh until the arrival-lag threshold passes', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260714', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [], asOf: '2026-07-16' });
  assert.equal(rows[0].settlement_state, 'fresh');
});

test('page-window join retains separate metrics for the same page-day', () => {
  const rows = join.joinPageWindow({
    ga4Release: { rows: [
      { report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 8 }] },
      { report_key: 'R3_event_count_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x', event_name: 'lead_capture' }, data_api_value: 2 }] },
    ] },
    vercelRows: [
      { day: '2026-07-12', requestPath: '/x', value: 8, source_family: 'pageviews' },
      { day: '2026-07-12', requestPath: '/x', value: 2, source_family: 'custom_events', event_name: 'lead_capture' },
    ],
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.metric_family), ['custom_events', 'pageviews']);
  assert.deepEqual(rows.map((row) => row.reconciliation_status), ['matched', 'matched']);
});

test('page-window join preserves each R1 metric and R3 event observation for one page-day', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [
    { report_key: 'R1_pageview_daily', sanitized_rows: [
      { row_key: { date: '20260712', page_path: '/x', metric_name: 'screenPageViews' }, metric_name: 'screenPageViews', data_api_value: 8 },
      { row_key: { date: '20260712', page_path: '/x', metric_name: 'totalUsers' }, metric_name: 'totalUsers', data_api_value: 5 },
      { row_key: { date: '20260712', page_path: '/x', metric_name: 'sessions' }, metric_name: 'sessions', data_api_value: 6 },
    ] },
    { report_key: 'R3_event_count_daily', sanitized_rows: [
      { row_key: { date: '20260712', page_path: '/x', event_name: 'lead_capture', metric_name: 'eventCount' }, metric_name: 'eventCount', data_api_value: 2 },
      { row_key: { date: '20260712', page_path: '/x', event_name: 'affiliate_click', metric_name: 'eventCount' }, metric_name: 'eventCount', data_api_value: 3 },
    ] },
  ] }, vercelRows: [] });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((row) => row.ga4_r1.value).sort((a, b) => a - b), [2, 3, 5, 6, 8]);
  assert.deepEqual(rows.filter((row) => row.metric_family === 'pageviews').map((row) => row.metric_name).sort(), ['screenPageViews', 'sessions', 'totalUsers']);
  assert.deepEqual(rows.filter((row) => row.metric_family === 'custom_events').map((row) => row.event_name).sort(), ['affiliate_click', 'lead_capture']);
});
test('R3 eventCount falls back to custom-event source policy and retains the canonical BQ value', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R3_event_count_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x', event_name: 'lead_capture', metric_name: 'eventCount' }, metric_name: 'eventCount', data_api_value: 2, bq_value: 5 }] }] }, vercelRows: [] });
  assert.equal(rows[0].ga4_r1.value, 5);
  assert.equal(rows[0].canonical_metric_source, 'ga4_bigquery');
});

test('page-window join retains every FAQ and CTA observation for one page-day', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [
    { report_key: 'R7_custom_event_faq_daily', sanitized_rows: [
      { row_key: { date: '20260712', page_path: '/x', 'customEvent:faq_id': 'faq-a' }, data_api_value: 2 },
      { row_key: { date: '20260712', page_path: '/x', 'customEvent:faq_id': 'faq-b' }, data_api_value: 3 },
    ] },
    { report_key: 'R8_custom_event_cta_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x', 'customEvent:cta_id': 'cta-a' }, data_api_value: 4 }] },
  ] }, vercelRows: [] });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.ga4_r1.value), [2, 3, 4]);
});

test('page-window join rejects explicitly invalid canonical releases', () => {
  assert.throws(() => join.joinPageWindow({ ga4Release: { release_status: 'INVALID', rows: [] }, vercelRows: [] }), /invalid canonical release/);
});

test('contract version is stable', () => assert.equal(join.CONTRACT_VERSION, 'ticket-008.v1'));
test('A5 source family classification is blocked by source', () => assert.equal(join.classifyReconciliation({ source: 'a5', value: 1 }, { value: 1 }), 'measurement_blocked'));
test('unknown nonnumeric values remain source deltas', () => assert.equal(join.classifyReconciliation({ value: '4' }, { value: 4 }), 'source_delta'));
test('empty groups classify as blocked', () => assert.equal(join.classifyReconciliation(null, null), 'measurement_blocked'));
test('joined rows are deterministic in sort order', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/z' }, data_api_value: 1 }, { row_key: { date: '20260711', page_path: '/a' }, data_api_value: 1 }] }] }, vercelRows: [] });
  assert.deepEqual(rows.map((r) => r.canonical_page_path), ['/a', '/z']);
});
test('title variants aggregate rather than retaining an input-order-first value', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [
    { row_key: { date: '20260712', page_path: '/x', page_title: 'A' }, metric_name: 'screenPageViews', data_api_value: 2 },
    { row_key: { date: '20260712', page_path: '/x', page_title: 'B' }, metric_name: 'screenPageViews', data_api_value: 3 },
  ] }] }, vercelRows: [] });
  assert.equal(rows.length, 1); assert.equal(rows[0].ga4_r1.value, 5);
});

test('non-additive title variants fail closed and remain deterministic across input order', () => {
  const variants = [
    { row_key: { date: '20260712', page_path: '/x', page_title: 'A' }, metric_name: 'sessions', data_api_value: 2 },
    { row_key: { date: '20260712', page_path: '/x', page_title: 'B' }, metric_name: 'sessions', data_api_value: 3 },
  ];
  const build = (rows) => join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: rows }] }, vercelRows: [] });
  const forward = build(variants);
  const reverse = build([...variants].reverse());
  assert.equal(forward[0].ga4_r1.value, null);
  assert.equal(forward[0].measurement_status, 'MEASUREMENT_BLOCKED');
  assert.deepEqual(forward, reverse);
  assert.equal(join.buildEvidenceManifest(forward).output_hash, join.buildEvidenceManifest(reverse).output_hash);
});

test('equal-valued non-additive title variants still fail closed', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [
    { row_key: { date: '20260712', page_path: '/x', page_title: 'A' }, metric_name: 'sessions', data_api_value: 2 },
    { row_key: { date: '20260712', page_path: '/x', page_title: 'B' }, metric_name: 'sessions', data_api_value: 2 },
  ] }] }, vercelRows: [] });
  assert.equal(rows[0].ga4_r1.value, null);
  assert.equal(rows[0].measurement_status, 'MEASUREMENT_BLOCKED');
  assert.equal(rows[0].measurement_block_reason, 'NON_ADDITIVE_TITLE_VARIANT_AMBIGUITY');
});

test('evidence manifest is byte-stable with an explicit deterministic timestamp', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R1_pageview_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x' }, data_api_value: 1 }] }] }, vercelRows: [] });
  const inputs = { generatedAt: '2026-07-16T00:00:00.000Z' };
  const first = join.buildEvidenceManifest(rows, inputs);
  const second = join.buildEvidenceManifest(rows, inputs);
  assert.equal(first.generated_at_utc, inputs.generatedAt);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('page-scoped R3 event rows survive independently for different pages', () => {
  const rows = join.joinPageWindow({ ga4Release: { rows: [{ report_key: 'R3_event_count_daily', sanitized_rows: [
    { row_key: { date: '20260712', page_path: '/a', event_name: 'lead_capture' }, data_api_value: 2 },
    { row_key: { date: '20260712', page_path: '/b', event_name: 'lead_capture' }, data_api_value: 3 },
  ] }] }, vercelRows: [] });
  assert.deepEqual(rows.map((row) => [row.canonical_page_path, row.ga4_r1.value]), [['/a', 2], ['/b', 3]]);
});

test('R7 observations retain distinct FAQ IDs even with metric names', () => { const release = { release_status: 'VALID', rows: [{ report_key: 'R7_custom_event_faq_daily', sanitized_rows: [{ row_key: { date: '20260712', page_path: '/x', faq_id: 'faq-a' }, metric_name: 'eventCount', bq_value: 2 }, { row_key: { date: '20260712', page_path: '/x', faq_id: 'faq-b' }, metric_name: 'eventCount', bq_value: 3 }] }] }; assert.equal(join.joinPageWindow({ ga4Release: release, vercelRows: [], asOf: '2026-07-20' }).length, 2); });
test('Data API fallback is labeled as fallback rather than BigQuery', () => assert.equal(join.metricSource({ bq_value: null, data_api_value: 4 }, { report_key: 'R1_pageview_daily' }), 'ga4_data_api_fallback'));
test('release provenance rejects invalid status and mismatched manifest IDs', () => { assert.throws(() => join.validateReleaseProvenance({ release_status: 'INVALID' }, {}, { canonical_release_id: 'rel_0123456789abcdef', acquisition_release_id: 'run_0123456789abcdef' }), /VALID/); assert.throws(() => join.validateReleaseProvenance({ release_status: 'VALID' }, { canonical_release_id: 'rel_ffffffffffffffff', acquisition_release_id: 'run_0123456789abcdef' }, { canonical_release_id: 'rel_0123456789abcdef', acquisition_release_id: 'run_0123456789abcdef' }), /match/); });

console.log(`Tests: ${pass}/49 passed.`);
if (process.exitCode) process.exit(1);
