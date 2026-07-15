'use strict';

const assert = require('node:assert/strict');
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
