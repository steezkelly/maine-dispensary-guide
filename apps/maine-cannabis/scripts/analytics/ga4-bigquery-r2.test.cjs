'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildBqSql, queryBqReport } = require('./ga4-bigquery.cjs');

test('R2 is explicitly unavailable from the intraday-only BigQuery source', () => {
  assert.throws(
    () => buildBqSql('R2_session_metrics_daily', '2026-07-10', '2026-07-12'),
    /not available from events_intraday/,
  );
});

test('R2 does not claim to mirror session-scoped Data API attribution from intraday data', () => {
  assert.throws(
    () => buildBqSql('R2_session_metrics_daily', '2026-07-10', '2026-07-12'),
    /session-scoped attribution/,
  );
});

test('R2 is recorded as unavailable without constructing a BigQuery client', async () => {
  const result = await queryBqReport('R2_session_metrics_daily', '2026-07-10', '2026-07-12');
  assert.equal(result.status, 'unavailable_intraday');
  assert.equal(result.compat_status, 'not_comparable');
  assert.deepEqual(result.rows, []);
});

test('R6 mirrors engagedSessions alongside users and sessions', () => {
  const sql = buildBqSql('R6_new_vs_returning_daily', '2026-07-10', '2026-07-12');

  assert.match(sql, /WITH session_events AS/);
  assert.match(sql, /AS totalUsers/);
  assert.match(sql, /AS sessions/);
  assert.match(sql, /AS engagedSessions/);
});

test('R6 classifies each session once when it contains first_visit', () => {
  const sql = buildBqSql('R6_new_vs_returning_daily', '2026-07-10', '2026-07-12');

  assert.match(sql, /COUNTIF\(event_name = 'first_visit'\) > 0 THEN 'new'/);
  assert.doesNotMatch(sql, /CASE WHEN event_name = 'first_visit' THEN 'new' ELSE 'returning' END/);
  assert.doesNotMatch(sql, /GROUP BY event_date, newVsReturning, user_pseudo_id, session_key/);
  assert.match(sql, /GROUP BY event_date, user_pseudo_id, session_key/);
});

test('R1, R4, and R5 cast integer session IDs before concatenating them', () => {
  for (const reportKey of ['R1_pageview_daily', 'R4_geo_daily', 'R5_device_daily']) {
    const sql = buildBqSql(reportKey, '2026-07-10', '2026-07-12');
    assert.match(sql, /CAST\(\(SELECT value\.int_value FROM UNNEST\(event_params\) WHERE key='ga_session_id'\) AS STRING\)\s*\|\|/);
  }
});

test('page reports normalize BQ page_location URLs to paths before grouping', () => {
  const sql = buildBqSql('R1_pageview_daily', '2026-07-10', '2026-07-12');

  assert.match(sql, /REGEXP_EXTRACT/);
  assert.match(sql, /page_location/);
  assert.match(sql, /AS pagePath/);
});

test('R3 retains pagePath at the same grain as the Data API event report', () => {
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12');

  assert.match(sql, /REGEXP_EXTRACT/);
  assert.match(sql, /AS pagePath/);
  assert.match(sql, /GROUP BY event_date, pagePath, event_name/);
});

test('analytics workspace declares the BigQuery client required by its ingestion module', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '../../package-lock.json'), 'utf8'));

  assert.ok(manifest.dependencies['@google-cloud/bigquery']);
  assert.ok(lock.packages['node_modules/@google-cloud/bigquery']);
});

test('R3 groups event counts by normalized page path', () => {
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12');
  assert.match(sql, /AS pagePath/);
  assert.match(sql, /GROUP BY event_date, pagePath, event_name/);
});

test('R3 BigQuery mirror includes emitted conversion events', () => {
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12');
  assert.match(sql, /'lead_capture'/);
  assert.match(sql, /'affiliate_click'/);
});

test('BQ reconciliation reads completed days from daily shards and only the current day from intraday shards', () => {
  const sql = buildBqSql('R1_pageview_daily', '2026-07-10', '2026-07-12');

  assert.match(sql, /events_\*`/);
  assert.match(sql, /REGEXP_CONTAINS\(_TABLE_SUFFIX, r'\^\[0-9\]\{8\}\$'\)/);
  assert.match(sql, /_TABLE_SUFFIX < FORMAT_DATE\('%Y%m%d', CURRENT_DATE\('America\/New_York'\)\)/);
  assert.match(sql, /events_intraday_\*`/);
  assert.match(sql, /_TABLE_SUFFIX = FORMAT_DATE\('%Y%m%d', CURRENT_DATE\('America\/New_York'\)\)/);
  assert.match(sql, /ANY_VALUE\(_mdg_source_table\) AS bq_source_table/);
});
