'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildBqSql, queryBqReport } = require('./ga4-bigquery.cjs');

test('R2 uses completed daily shards without reading intraday attribution', () => {
  const sql = buildBqSql('R2_session_metrics_daily', '2026-07-10', '2026-07-12', '2026-07-12');
  assert.match(sql, /session_traffic_source_last_click\.cross_channel_campaign\.default_channel_group/);
  assert.match(sql, /events_\*`/);
  assert.match(sql, /_TABLE_SUFFIX < REPLACE\('2026-07-12','-',''\)/);
  assert.doesNotMatch(sql, /events_intraday_/);
});

test('R2 returns reconciled completed-day rows through an injected BigQuery client', async () => {
  const client = { query: async ({ query }) => {
    assert.doesNotMatch(query, /events_intraday_/);
    return [[{
      event_date: '20260710',
      sessionDefaultChannelGroup: 'Organic Search',
      sessions: 2,
      engagedSessions: 1,
      engagementRate: 0.5,
      averageSessionDuration: 12,
      bounceRate: 0.5,
      bq_source_table: 'maine-dispensary-guide.analytics_532778727.events_20260710',
    }]];
  }};
  const result = await queryBqReport('R2_session_metrics_daily', '2026-07-10', '2026-07-12', '2026-07-12', client);
  assert.equal(result.status, 'ok');
  assert.equal(result.rows[0].row_key.sessionDefaultChannelGroup, 'Organic Search');
  assert.equal(result.rows[0].metrics.sessions, 2);
});

test('R6 mirrors engagedSessions alongside users and sessions', () => {
  const sql = buildBqSql('R6_new_vs_returning_daily', '2026-07-10', '2026-07-12', '2026-07-12');

  assert.match(sql, /WITH session_events AS/);
  assert.match(sql, /AS totalUsers/);
  assert.match(sql, /AS sessions/);
  assert.match(sql, /AS engagedSessions/);
});

test('R6 classifies each session once when it contains first_visit', () => {
  const sql = buildBqSql('R6_new_vs_returning_daily', '2026-07-10', '2026-07-12', '2026-07-12');

  assert.match(sql, /COUNTIF\(event_name = 'first_visit'\) > 0 THEN 'new'/);
  assert.doesNotMatch(sql, /CASE WHEN event_name = 'first_visit' THEN 'new' ELSE 'returning' END/);
  assert.doesNotMatch(sql, /GROUP BY event_date, newVsReturning, user_pseudo_id, session_key/);
  assert.match(sql, /GROUP BY event_date, user_pseudo_id, session_key/);
});

test('R1, R4, and R5 cast integer session IDs before concatenating them', () => {
  for (const reportKey of ['R1_pageview_daily', 'R4_geo_daily', 'R5_device_daily']) {
    const sql = buildBqSql(reportKey, '2026-07-10', '2026-07-12', '2026-07-12');
    assert.match(sql, /CAST\(\(SELECT value\.int_value FROM UNNEST\(event_params\) WHERE key='ga_session_id'\) AS STRING\)\s*\|\|/);
  }
});

test('page reports normalize BQ page_location URLs to paths before grouping', () => {
  const sql = buildBqSql('R1_pageview_daily', '2026-07-10', '2026-07-12', '2026-07-12');

  assert.match(sql, /REGEXP_EXTRACT/);
  assert.match(sql, /page_location/);
  assert.match(sql, /AS pagePath/);
});

test('R3 retains pagePath at the same grain as the Data API event report', () => {
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12', '2026-07-12');

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
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12', '2026-07-12');
  assert.match(sql, /AS pagePath/);
  assert.match(sql, /GROUP BY event_date, pagePath, event_name/);
});

test('R3 BigQuery mirror includes emitted conversion and action-intent events', () => {
  const sql = buildBqSql('R3_event_count_daily', '2026-07-10', '2026-07-12', '2026-07-12');
  assert.match(sql, /'lead_capture'/);
  assert.match(sql, /'affiliate_click'/);
  assert.match(sql, /'mdg_action_select'/);
});

test('BQ reconciliation requires an explicit frozen property-day snapshot', () => {
  assert.throws(
    () => buildBqSql('R1_pageview_daily', '2026-07-10', '2026-07-12'),
    /property date snapshot/,
  );
});

test('BQ reconciliation reads completed days from daily shards and only the frozen property day from intraday shards', () => {
  const sql = buildBqSql('R1_pageview_daily', '2026-07-10', '2026-07-12', '2026-07-12');

  assert.match(sql, /events_\*`/);
  assert.match(sql, /REGEXP_CONTAINS\(_TABLE_SUFFIX, r'\^\[0-9\]\{8\}\$'\)/);
  assert.match(sql, /_TABLE_SUFFIX < REPLACE\('2026-07-12','-',''\)/);
  assert.match(sql, /events_intraday_\*`/);
  assert.match(sql, /_TABLE_SUFFIX = REPLACE\('2026-07-12','-',''\)/);
  assert.doesNotMatch(sql, /CURRENT_DATE/);
  assert.match(sql, /ANY_VALUE\(_mdg_source_table\) AS bq_source_table/);
});
