'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildBqSql } = require('./ga4-bigquery.cjs');

test('R2 rolls events into sessions without unnesting record traffic sources', () => {
  const sql = buildBqSql('R2_session_metrics_daily', '2026-07-10', '2026-07-12');

  assert.doesNotMatch(sql, /UNNEST\(traffic_source\)/);
  assert.match(sql, /WITH session_events AS/);
  assert.match(sql, /session_traffic_source_last_click\.cross_channel_campaign\.default_channel_group/);
  assert.match(sql, /event_name = 'page_view'/);
  assert.match(sql, /key='session_engaged'/);
});

test('analytics workspace declares the BigQuery client required by its ingestion module', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(workspaceRoot, '../../package-lock.json'), 'utf8'));

  assert.ok(manifest.dependencies['@google-cloud/bigquery']);
  assert.ok(lock.packages['node_modules/@google-cloud/bigquery']);
});
