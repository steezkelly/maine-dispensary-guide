'use strict';
/**
 * scripts/analytics/ga4-data-api.cjs
 *
 * GA4 Data API v1beta client for the 8 named reports (R1-R8)
 * defined in MDG-ANALYTICS-001-TICKET-007-SOURCE-INGESTION-BATCH-APPROVAL.md §2.
 *
 * Per-report shape, dimensions, metrics, grain, intended use, and
 * BQ mirror are documented in that spec. This file is the Data-API
 * half of the dual-source ingestion strategy.
 *
 * No raw event-params are stored here. The returned rows have
 * already been sanitized per the §3.3 sanitized-evidence contract.
 *
 * No pseudonymous identifiers are persisted at any point. See
 * ga4-source-ingest.cjs §5 (compute-and-discard).
 */

const { google } = require('googleapis');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '532778727';

const REPORTS = {
  R1_pageview_daily: {
    report_id: 'pageview_daily',
    dimensions: ['date', 'pagePath', 'pageTitle'],
    metrics: ['screenPageViews', 'totalUsers', 'sessions'],
    grain: 'day_pagePath_pageTitle',
    compat_status: 'VALIDATED',
    intended_use: 'Time series; cross-source join key with Vercel A4'
  },
  R2_session_metrics_daily: {
    report_id: 'session_metrics_daily',
    dimensions: ['date', 'sessionDefaultChannelGroup'],
    metrics: ['sessions', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'bounceRate'],
    grain: 'day_channel',
    compat_status: 'VALIDATED',
    intended_use: 'Engagement; channel attribution'
  },
  R3_event_count_daily: {
    report_id: 'event_count_daily',
    dimensions: ['date', 'pagePath', 'eventName'],
    metrics: ['eventCount'],
    event_names: ['page_view', 'scroll', 'scroll_depth', 'click', 'page_engaged', 'fa_open', 'faq_open', 'cta_view', 'lead_capture', 'affiliate_click', 'user_engagement', 'session_start'],
    grain: 'day_pagePath_event',
    compat_status: 'VALIDATED',
    intended_use: 'Per-page custom event totals (page_view, scroll_depth, page_engaged, faq_open, cta_view)'
  },
  R4_geo_daily: {
    report_id: 'geo_daily',
    dimensions: ['date', 'country', 'region', 'city'],
    metrics: ['totalUsers', 'sessions'],
    grain: 'day_geo',
    compat_status: 'VALIDATED',
    intended_use: 'Maine-focused geo distribution'
  },
  R5_device_daily: {
    report_id: 'device_daily',
    dimensions: ['date', 'deviceCategory', 'browser', 'operatingSystem'],
    metrics: ['totalUsers', 'sessions'],
    grain: 'day_device',
    compat_status: 'VALIDATED',
    intended_use: 'Cross-ref with Vercel A4 device data'
  },
  R6_new_vs_returning_daily: {
    report_id: 'new_vs_returning_daily',
    dimensions: ['date', 'newVsReturning'],
    metrics: ['totalUsers', 'sessions', 'engagedSessions'],
    grain: 'day_newVsReturning',
    compat_status: 'VALIDATED',
    intended_use: 'Five-stage funnel input'
  },
  R7_custom_event_faq_daily: {
    report_id: 'custom_event_faq_daily',
    dimensions: ['date', 'pagePath', 'customEvent:faq_id'],
    metrics: ['eventCount'],
    grain: 'day_page_FAQ',
    compat_status: 'VALIDATED',
    intended_use: 'Per-FAQ reach',
    registered_dim_id: 'properties/532778727/customDimensions/15244515003',
    registered_at: '2026-07-12'
  },
  R8_custom_event_cta_daily: {
    report_id: 'custom_event_cta_daily',
    dimensions: ['date', 'pagePath', 'customEvent:cta_id'],
    metrics: ['eventCount'],
    grain: 'day_page_CTA',
    compat_status: 'VALIDATED',
    intended_use: 'Per-CTA reach',
    registered_dim_id: 'properties/532778727/customDimensions/15244436311',
    registered_at: '2026-07-12'
  }
};

function reportCompleteness(rowCount, fetchedRows) { return Number(rowCount) > Number(fetchedRows) ? 'partial' : 'ok'; }

function buildReportRequest(def, opts) {
  const request = {
    dateRanges: [{ startDate: opts.from, endDate: opts.to }],
    dimensions: def.dimensions.map((name) => ({ name })),
    metrics: def.metrics.map((name) => ({ name })),
    limit: opts.limit || 100000,
  };
  if (Array.isArray(def.event_names) && def.event_names.length) {
    request.dimensionFilter = { filter: { fieldName: 'eventName', inListFilter: { values: def.event_names } } };
  }
  return request;
}

/**
 * Run a single named report against the GA4 Data API.
 *
 * @param {object} authClient - authenticated googleapis auth client
 * @param {string} reportKey - one of REPORTS keys (e.g. 'R1_pageview_daily')
 * @param {object} opts - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', limit?: number }
 * @returns {Promise<{ status: 'ok'|'partial'|'failed', report_id, rows, raw, error? }>}
 */
async function runReport(authClient, reportKey, opts) {
  const def = REPORTS[reportKey];
  if (!def) throw new Error('Unknown report: ' + reportKey);

  const client = google.analyticsdata({ version: 'v1beta', auth: authClient });

  try {
    const resp = await client.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: buildReportRequest(def, opts)
    });
    const data = resp.data;
    const rows = (data.rows || []).map((row) => {
      const dimObj = {};
      const metricObj = {};
      def.dimensions.forEach((d, i) => {
        dimObj[d] = row.dimensionValues[i]?.value || null;
      });
      def.metrics.forEach((m, i) => {
        const v = row.metricValues[i]?.value;
        metricObj[m] = v === undefined || v === '' ? null : (Number.isFinite(+v) ? +v : v);
      });
      return { dimensions: dimObj, metrics: metricObj };
    });
    const completeness = reportCompleteness(data.rowCount || rows.length, rows.length);
    return {
      status: completeness === 'ok' ? 'ok' : 'failed',
      report_id: def.report_id,
      report_key: reportKey,
      grain: def.grain,
      intended_use: def.intended_use,
      compat_status: def.compat_status,
      from: opts.from,
      to: opts.to,
      rowCount: data.rowCount || rows.length,
      rows,
      ...(completeness === 'partial' ? { error: { code: 'TRUNCATED_RESPONSE', message: `GA4 returned ${data.rowCount} rows but only ${rows.length} were fetched` } } : {}),
      fetched_at_utc: new Date().toISOString()
    };
  } catch (e) {
    const status = e.code || e.response?.status || 'unknown';
    return {
      status: 'failed',
      report_id: def.report_id,
      report_key: reportKey,
      grain: def.grain,
      intended_use: def.intended_use,
      compat_status: def.compat_status,
      from: opts.from,
      to: opts.to,
      rowCount: 0,
      rows: [],
      error: { code: status, message: String(e.message || e) },
      fetched_at_utc: new Date().toISOString()
    };
  }
}

/**
 * Get an authenticated client with the analytics.readonly scope.
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  });
  return await auth.getClient();
}

/**
 * Run all 8 named reports for the given date window in parallel.
 * Per-report failure isolation: a single failed report does NOT
 * fail the others (per v2 §12.1).
 */
async function runAllReports(from, to) {
  const authClient = await getAuthClient();
  const reportKeys = Object.keys(REPORTS);
  const results = await Promise.all(
    reportKeys.map((k) => runReport(authClient, k, { from, to }))
  );
  // Build a map by report_key for the orchestrator.
  const resultMap = {};
  for (const r of results) resultMap[r.report_key] = r;
  return {
    from, to,
    fetched_at_utc: new Date().toISOString(),
    reports: resultMap,
    report_status: Object.fromEntries(
      Object.entries(resultMap).map(([k, v]) => [k, v.status])
    )
  };
}

module.exports = {
  PROPERTY_ID,
  REPORTS,
  reportCompleteness,
  buildReportRequest,
  getAuthClient,
  runReport,
  runAllReports
};
