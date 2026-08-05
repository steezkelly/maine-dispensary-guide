'use strict';
/**
 * Private, aggregate GA4 lead-capture report.
 *
 * The report uses GA4 Data API metadata to select its reporting grain:
 * - per_form when customEvent:form_name is registered and queryable;
 * - page_level_fallback otherwise.
 *
 * It never writes into the repository and never persists raw URLs, event
 * parameters, credentials, or user/session identifiers.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const DEFAULT_PROPERTY_ID = '532778727';
const PAGE_SIZE = 5000;
const PRIVATE_ROOT = process.env.MDG_GA4_DATA_ROOT
  || path.join(process.env.HOME || '/home/steve', '.hermes', 'data', 'mdg-analytics');
const ALLOWED_FORM_NAMES = new Set([
  'compliance_self_assessment',
  'contact',
  'download_checklist',
  'first_timer_field_guide',
  'founders_bible',
  'market_stats_data_request',
  'metrc_checklist',
  'newsletter_homepage',
  'newsletter_inline',
  'q3_2026_industry_report',
  'q3_2026_report_funnel',
  'referral_request',
]);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function parseArgs(args) {
  const known = new Set(['--dry-run', '--live']);
  const unknown = args.filter((arg) => !known.has(arg));
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);
  return { dryRun: args.includes('--dry-run') };
}

function outputPath(root, date = todayIso()) {
  return path.join(root, `ga4-lead-capture-report-${date}.json`);
}

function dryRunReport({ propertyId, root }) {
  return [
    '# GA4 lead-capture report — dry run',
    `property: ${propertyId}`,
    `output root: ${root}`,
    `output: ${outputPath(root)}`,
    'reportability_mode: page_level_fallback',
    'planned dimensions: date, pagePath, eventName',
    'note: live mode upgrades to per_form only when GA4 metadata exposes customEvent:form_name.',
  ].join('\n');
}

async function getAnalyticsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const authClient = await auth.getClient();
  return google.analyticsdata({ version: 'v1beta', auth: authClient });
}

function flattenRow(row, dimensions, metrics) {
  const values = {};
  (row.dimensionValues || []).forEach((value, index) => {
    values[dimensions[index]] = value.value || '';
  });
  (row.metricValues || []).forEach((value, index) => {
    values[metrics[index]] = Number(value.value || 0);
  });
  return values;
}

async function reportabilityMode(analytics, propertyId) {
  const metadata = await analytics.properties.getMetadata({
    name: `properties/${propertyId}/metadata`,
  });
  const dimensions = new Set((metadata.data.dimensions || []).map((dimension) => dimension.apiName));
  return dimensions.has('customEvent:form_name') ? 'per_form' : 'page_level_fallback';
}

async function runLeadCaptureReport(analytics, propertyId, mode) {
  const dimensions = [{ name: 'date' }, { name: 'pagePath' }, { name: 'eventName' }];
  if (mode === 'per_form') dimensions.push({ name: 'customEvent:form_name' });

  const dimensionNames = dimensions.map((dimension) => dimension.name);
  const metricNames = ['eventCount', 'sessions'];
  const rows = [];
  let offset = 0;
  let rowCount = null;

  while (rowCount === null || rows.length < rowCount) {
    const response = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: daysAgo(7), endDate: daysAgo(1) }],
        dimensions,
        metrics: [{ name: 'eventCount' }, { name: 'sessions' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { value: 'lead_capture', matchType: 'EXACT' },
          },
        },
        orderBys: dimensions.map((dimension) => ({
          dimension: { dimensionName: dimension.name },
          desc: false,
        })),
        limit: PAGE_SIZE,
        offset,
      },
    });
    const pageRows = response.data.rows || [];
    if (rowCount === null) rowCount = Number(response.data.rowCount ?? pageRows.length);
    rows.push(...pageRows.map((row) => flattenRow(row, dimensionNames, metricNames)));
    if (rows.length >= rowCount) break;
    if (pageRows.length === 0) throw new Error(`GA4 returned ${rowCount} rows but no rows at offset ${offset}.`);
    offset += PAGE_SIZE;
  }

  const expectedRows = rowCount || 0;
  if (rows.length !== expectedRows) {
    throw new Error(`GA4 pagination expected ${expectedRows} rows but received ${rows.length}.`);
  }
  const seen = new Set();
  for (const row of rows) {
    const key = JSON.stringify(dimensionNames.map((dimension) => row[dimension]));
    if (seen.has(key)) throw new Error('Duplicate GA4 row encountered during pagination; report was not written.');
    seen.add(key);
  }
  return rows;
}

function makeSnapshot({ propertyId, mode, rows }) {
  const totalEvents = rows.reduce((sum, row) => sum + row.eventCount, 0);
  let redactedFormNameCount = 0;
  const outputRows = rows.map((row) => {
    const base = {
      date: row.date,
      page_path: row.pagePath,
      event_name: row.eventName,
      event_count: row.eventCount,
      sessions: row.sessions,
    };
    if (mode === 'per_form') {
      const formName = row['customEvent:form_name'];
      if (ALLOWED_FORM_NAMES.has(formName)) base.form_name = formName;
      else redactedFormNameCount += 1;
    }
    return base;
  });

  return {
    generated_at: new Date().toISOString(),
    property_id: propertyId,
    window: { start: daysAgo(7), end: daysAgo(1) },
    reportability_mode: mode,
    interpretation: mode === 'per_form'
      ? 'GA4 event-level lead_capture aggregates by an allowlisted form name; it measures client-side capture event delivery, not downstream acceptance.'
      : 'GA4 form_name is not reportable; aggregates are by page path only and do not establish per-form attribution or downstream acceptance.',
    row_count: outputRows.length,
    total_lead_capture_events: totalEvents,
    redacted_form_name_count: redactedFormNameCount,
    rows: outputRows,
  };
}

function writeSnapshot(root, snapshot) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const target = outputPath(root);
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, target);
  fs.chmodSync(target, 0o600);
  return target;
}

async function main(argv = process.argv.slice(2)) {
  const { dryRun } = parseArgs(argv);
  const propertyId = process.env.GA4_PROPERTY_ID || DEFAULT_PROPERTY_ID;
  if (!/^\d{9,12}$/.test(propertyId)) throw new Error('GA4_PROPERTY_ID must be a 9-12 digit numeric property ID.');

  if (dryRun) {
    console.log(dryRunReport({ propertyId, root: PRIVATE_ROOT }));
    return 0;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required for live GA4 reads.');
  }

  const analytics = await getAnalyticsClient();
  const mode = await reportabilityMode(analytics, propertyId);
  const rows = await runLeadCaptureReport(analytics, propertyId, mode);
  const snapshot = makeSnapshot({ propertyId, mode, rows });
  const target = writeSnapshot(PRIVATE_ROOT, snapshot);
  console.log(`GA4 lead-capture report: ${snapshot.total_lead_capture_events} events, ${snapshot.row_count} row(s), ${mode}; wrote ${target}`);
  return 0;
}

if (require.main === module) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(`[ga4-lead-capture-report] FAIL — ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  dryRunReport,
  makeSnapshot,
  outputPath,
  parseArgs,
  reportabilityMode,
  runLeadCaptureReport,
  writeSnapshot,
};
