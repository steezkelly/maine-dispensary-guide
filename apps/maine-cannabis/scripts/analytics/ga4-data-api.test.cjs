'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { google } = require('googleapis');
const { REPORTS, reportCompleteness, buildReportRequest, runReport } = require('./ga4-data-api.cjs');

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
  assert.deepEqual(body.dimensionFilter.filter.inListFilter.values, ['page_view', 'scroll', 'scroll_depth', 'click', 'page_engaged', 'fa_open', 'faq_open', 'cta_view', 'mdg_action_select', 'lead_capture', 'affiliate_click', 'user_engagement', 'session_start']);
});

test('R3 Data API query includes the emitted action-intent event alongside the BigQuery mirror', () => {
  const body = buildReportRequest(REPORTS.R3_event_count_daily, { from: '2026-07-01', to: '2026-07-07' });
  assert.ok(body.dimensionFilter.filter.inListFilter.values.includes('mdg_action_select'));
});

test('R7 Data API query uses the same faq_open population as the BigQuery mirror', () => {
  const body = buildReportRequest(REPORTS.R7_custom_event_faq_daily, { from: '2026-07-01', to: '2026-07-07' });
  assert.deepEqual(body.dimensionFilter.filter.inListFilter.values, ['faq_open']);
});

test('R8 Data API query uses the same cta_view population as the BigQuery mirror', () => {
  const body = buildReportRequest(REPORTS.R8_custom_event_cta_daily, { from: '2026-07-01', to: '2026-07-07' });
  assert.deepEqual(body.dimensionFilter.filter.inListFilter.values, ['cta_view']);
});

test('runReport paginates until every row the GA4 API reports has been retrieved', async () => {
  const originalAnalyticsData = google.analyticsdata;
  const calls = [];
  const rows = Array.from({ length: 5 }, (_, index) => ({
    dimensionValues: [{ value: `2026070${index + 1}` }, { value: `/page-${index}` }, { value: `Title ${index}` }],
    metricValues: [{ value: String(index + 1) }, { value: '1' }, { value: '1' }]
  }));
  google.analyticsdata = () => ({
    properties: {
      runReport: async ({ requestBody }) => {
        calls.push(requestBody);
        const offset = Number(requestBody.offset || 0);
        return { data: { rowCount: String(rows.length), rows: rows.slice(offset, offset + requestBody.limit) } };
      }
    }
  });

  try {
    const result = await runReport({}, 'R1_pageview_daily', { from: '2026-07-01', to: '2026-07-07', limit: 2 });
    assert.equal(result.status, 'ok');
    assert.equal(result.rowCount, 5);
    assert.equal(result.rows.length, 5);
    assert.deepEqual(calls.map((request) => request.offset), [0, 2, 4]);
  } finally {
    google.analyticsdata = originalAnalyticsData;
  }
});

test('runReport fails on missing, invalid, or inconsistent paginated row counts', async () => {
  const originalAnalyticsData = google.analyticsdata;
  const rows = Array.from({ length: 5 }, (_, index) => ({
    dimensionValues: [{ value: `2026070${index + 1}` }, { value: `/page-${index}` }, { value: `Title ${index}` }],
    metricValues: [{ value: String(index + 1) }, { value: '1' }, { value: '1' }]
  }));
  const scenarios = [
    { name: 'missing later count', counts: ['5', undefined] },
    { name: 'inconsistent later count', counts: ['5', '4'] },
    { name: 'invalid initial count', counts: ['not-a-number'] },
  ];

  try {
    for (const scenario of scenarios) {
      let call = 0;
      google.analyticsdata = () => ({ properties: { runReport: async () => {
        const index = call++;
        const rowCount = scenario.counts[index];
        return { data: { ...(rowCount === undefined ? {} : { rowCount }), rows: index < 2 ? rows.slice(index * 2, index * 2 + 2) : [] } };
      } } });
      const result = await runReport({}, 'R1_pageview_daily', { from: '2026-07-01', to: '2026-07-07', limit: 2 });
      assert.equal(result.status, 'failed', scenario.name);
      assert.equal(result.error.code, 'INVALID_ROW_COUNT', scenario.name);
    }
  } finally {
    google.analyticsdata = originalAnalyticsData;
  }
});
