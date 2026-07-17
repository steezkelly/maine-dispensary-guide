'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { REPORTS, reportCompleteness, buildReportRequest } = require('./ga4-data-api.cjs');

test('marks a response with unfetched rows incomplete', () => {
  assert.equal(reportCompleteness(100001, 100000), 'partial');
});

test('marks a complete response complete', () => {
  assert.equal(reportCompleteness(2, 2), 'ok');
});

test('R3 event rows are scoped to their page path', () => {
  assert.deepEqual(REPORTS.R3_event_count_daily.dimensions, ['date', 'pagePath', 'eventName']);
  assert.equal(REPORTS.R3_event_count_daily.grain, 'day_pagePath_event');
});
test('R3 Data API query uses the same event population as the BigQuery mirror', () => {
  const body = buildReportRequest(REPORTS.R3_event_count_daily, { from: '2026-07-01', to: '2026-07-07' });
  assert.deepEqual(body.dimensionFilter.filter.inListFilter.values, ['page_view', 'scroll', 'scroll_depth', 'click', 'page_engaged', 'fa_open', 'faq_open', 'cta_view', 'lead_capture', 'affiliate_click', 'user_engagement', 'session_start']);
});
