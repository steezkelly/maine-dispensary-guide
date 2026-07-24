'use strict';
/**
 * apps/maine-cannabis/scripts/analytics/ga4-key-event-digest.cjs
 *
 * Weekly key-event funnel digest for MDG property 532778727.
 *
 * Reuses the Data API client in ./ga4-data-api.cjs. Pulls the four key
 * events configured in GA4 Admin (lead_capture, mdg_action_select,
 * mdg_partner_referral, plus page_view as a baseline), the auto-click
 * event (capped because the GA4 Advisor workflow explicitly recommends
 * not marking it), and the v1 instrumentation events
 * (cta_view, mdg_action_exposure, mdg_active_attention) for ratio
 * analysis.
 *
 * Emits a private dated Markdown file:
 *   ~/.hermes/data/mdg-analytics/ga4-key-event-digest-<YYYY-MM-DD>.md
 *
 * This digest is the smallest piece of work that turns the ad-hoc
 * key-event reporting that was performed in chat on 2026-07-23
 * into a recurring artefact. It is the operator-facing
 * counterpart to the existing dual-source ingestion batch.
 *
 * It does not ingest, mutate, or alter any GA4 configuration. It
 * only reads.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '532778727';
const ANALYTICS = {
  propertyId: PROPERTY_ID,
  measurementId: 'G-614GHG67ZQ',
};

const KEY_EVENTS = ['lead_capture', 'mdg_action_select', 'mdg_partner_referral'];
const RATIO_EVENTS = ['cta_view', 'mdg_action_exposure', 'mdg_active_attention', 'page_engaged'];
const BASELINE_EVENTS = ['page_view', 'session_start', 'click'];
const ALL_EVENTS = [...KEY_EVENTS, ...RATIO_EVENTS, ...BASELINE_EVENTS];

const PRIVATE_DATA_ROOT = process.env.MDG_GA4_DATA_ROOT
  || path.join(process.env.HOME || '/home/steve', '.hermes', 'data', 'mdg-analytics');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function blockedNotice(reason) {
  return [
    '# GA4 Key-Event Digest — BLOCKED',
    '',
    `> ${reason}`,
    '',
    'The Data API read scope is `analytics.readonly`. Verify the service',
    'account `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com`',
    'still has GA4 Viewer access. After the fix, re-run with `--live`.',
    '',
  ].join('\n');
}

function dryRunPlan() {
  return [
    '# GA4 Key-Event Digest — Dry Run',
    '',
    `Property: ${ANALYTICS.propertyId} (${ANALYTICS.measurementId})`,
    `Planned window: 7 days, ${daysAgo(7)} to ${todayIso()}`,
    '',
    '## Planned queries (1 fetch each)',
    '',
    '1. `runReport`',
    '   - dimensions: `eventName`',
    '   - metrics: `eventCount`, `totalUsers`, `sessions`',
    `   - dimensionFilter: eventName in (${ALL_EVENTS.join(', ')})`,
    '   - limit: 200',
    '',
    '2. `runReport`',
    '   - dimensions: `eventName`, `pagePath`',
    '   - metrics: `eventCount`',
    `   - dimensionFilter: eventName in (${KEY_EVENTS.join(', ')})`,
    '   - orderBys: eventCount desc',
    '   - limit: 50',
    '',
    '3. `runReport`',
    '   - dimensions: `eventName`, `linkDomain`',
    '   - metrics: `eventCount`',
    "   - dimensionFilter: eventName = 'click'",
    '   - orderBys: eventCount desc',
    '   - limit: 50',
    '',
    '4. `runReport`',
    '   - dimensions: `sessionDefaultChannelGroup`',
    '   - metrics: `sessions`, `totalUsers`, `engagedSessions`',
    '   - orderBys: sessions desc',
    '   - limit: 20',
    '',
    '5. `runReport`',
    '   - dimensions: `pagePath`',
    '   - metrics: `eventCount`',
    "   - dimensionFilter: eventName = 'mdg_action_select'",
    '   - orderBys: eventCount desc',
    '   - limit: 20',
    '',
  ].join('\n');
}

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  return await auth.getClient();
}

function flattenRow(row, dimensions, metrics) {
  const dimObj = {};
  const metricObj = {};
  (row.dimensionValues || []).forEach((v, i) => { dimObj[dimensions[i]] = v.value; });
  (row.metricValues || []).forEach((v, i) => {
    const raw = v.value;
    metricObj[metrics[i]] = raw === undefined || raw === '' ? 0 : (Number.isFinite(+raw) ? +raw : raw);
  });
  return { dimensions: dimObj, metrics: metricObj };
}

async function runReport(client, body) {
  const resp = await client.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: body,
  });
  const dims = (body.dimensions || []).map((d) => d.name);
  const mets = (body.metrics || []).map((m) => m.name);
  return (resp.data.rows || []).map((row) => flattenRow(row, dims, mets));
}

async function liveRun() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  const client = await getAuthClient();
  const analytics = google.analyticsdata({ version: 'v1beta', auth: client });
  const dateRanges = [{ startDate: daysAgo(7), endDate: daysAgo(1) }];

  const totals = await runReport(analytics, {
    dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }, { name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ALL_EVENTS } } },
    limit: 200,
  });
  const byKeyEventPage = await runReport(analytics, {
    dateRanges,
    dimensions: [{ name: 'eventName' }, { name: 'pagePath' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: KEY_EVENTS } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 50,
  });
  const outbound = await runReport(analytics, {
    dateRanges,
    dimensions: [{ name: 'eventName' }, { name: 'linkDomain' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'click' } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 50,
  });
  const channels = await runReport(analytics, {
    dateRanges,
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });
  const keyEventPages = await runReport(analytics, {
    dateRanges,
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'mdg_action_select' } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 20,
  });
  return formatReport({ totals, byKeyEventPage, outbound, channels, keyEventPages, from: dateRanges[0].startDate, to: dateRanges[0].endDate });
}

function fmt(n) {
  if (n === null || n === undefined) return '0';
  if (typeof n === 'string') return n;
  return Number(n).toLocaleString('en-US');
}

function ratio(numerator, denominator) {
  if (!denominator) return '0.0%';
  return ((Number(numerator) / Number(denominator)) * 100).toFixed(1) + '%';
}

function formatReport({ totals, byKeyEventPage, outbound, channels, keyEventPages, from, to }) {
  const t = Object.fromEntries(totals.map((r) => [r.dimensions.eventName, r.metrics]));
  const lines = [
    `# GA4 Key-Event Digest — ${todayIso()}`,
    '',
    `> Property: ${ANALYTICS.propertyId} (${ANALYTICS.measurementId})`,
    `> Window: ${from} to ${to} (finalized 7-day lag)`,
    `> Fetched: ${new Date().toISOString()}`,
    '',
    '## 1. Key-event totals (the GA4 key-event configuration)',
    '',
    '| Event | Count | Users | Sessions |',
    '|---|---:|---:|---:|',
    ...KEY_EVENTS.map((e) => `| ${e} | ${fmt(t[e]?.eventCount)} | ${fmt(t[e]?.totalUsers)} | ${fmt(t[e]?.sessions)} |`),
    '',
    '## 2. Ratio events (exposure and engagement)',
    '',
    '| Event | Count | Users | Sessions |',
    '|---|---:|---:|---:|',
    ...RATIO_EVENTS.map((e) => `| ${e} | ${fmt(t[e]?.eventCount)} | ${fmt(t[e]?.totalUsers)} | ${fmt(t[e]?.sessions)} |`),
    '',
    '## 3. Baseline events',
    '',
    '| Event | Count | Users | Sessions |',
    '|---|---:|---:|---:|',
    ...BASELINE_EVENTS.map((e) => `| ${e} | ${fmt(t[e]?.eventCount)} | ${fmt(t[e]?.totalUsers)} | ${fmt(t[e]?.sessions)} |`),
    '',
    '## 4. Conversion ratios',
    '',
    '- `mdg_action_select` / `mdg_action_exposure` (selection rate): ' + ratio(t.mdg_action_select?.eventCount, t.mdg_action_exposure?.eventCount),
    '- `mdg_partner_referral` / `mdg_action_select` (referral rate): ' + ratio(t.mdg_partner_referral?.eventCount, t.mdg_action_select?.eventCount),
    '- `lead_capture` / `mdg_partner_referral` (capture rate): ' + ratio(t.lead_capture?.eventCount, t.mdg_partner_referral?.eventCount),
    '- `lead_capture` / `page_view` (overall capture rate): ' + ratio(t.lead_capture?.eventCount, t.page_view?.eventCount),
    '- `cta_view` / `page_view` (CTA density per pageview): ' + ratio(t.cta_view?.eventCount, t.page_view?.eventCount),
    '',
    '## 5. Outbound click destinations (Enhanced Measurement `click`)',
    '',
    "Note: this is the raw Enhanced Measurement click stream. It mixes dispensary referrals, Maps, government citations, software vendors, and other outbound links. Do not use it as a key event — `mdg_partner_referral` is the curated dispensary-handoff signal.",
    '',
    '| Domain | Count | Users |',
    '|---|---:|---:|',
    ...outbound.map((r) => `| ${r.dimensions.linkDomain} | ${fmt(r.metrics.eventCount)} | ${fmt(r.metrics.totalUsers)} |`),
    '',
    '## 6. Top pages by `mdg_action_select`',
    '',
    '| Page | Count |',
    '|---|---:|',
    ...keyEventPages.map((r) => `| ${r.dimensions.pagePath} | ${fmt(r.metrics.eventCount)} |`),
    '',
    '## 7. Acquisition by channel',
    '',
    '| Channel | Sessions | Users | Engaged |',
    '|---|---:|---:|---:|',
    ...channels.map((r) => `| ${r.dimensions.sessionDefaultChannelGroup} | ${fmt(r.metrics.sessions)} | ${fmt(r.metrics.totalUsers)} | ${fmt(r.metrics.engagedSessions)} |`),
    '',
    '## 8. Findings to flag',
    '',
    '- `cta_view` is overcounted (it fires for every marked CTA on entry, not on click). Treat exposure ratios as upper bounds, not facts.',
    '- The `click` event is dominated by Maps and government citations. Do not mark it as a key event. Use `mdg_partner_referral` for the dispensary referral funnel.',
    '- `page_unload_before_gtag` is a known measurement gap. It is reported by the existing dual-source ingestion; consult that report for the latest count.',
    '- Post-deploy for `mdg_partner_referral` is recent. If the key-event total is 0, the 7-day window has not yet caught the deployment. Widen the window to 28 days or wait.',
    '',
    '## 9. Privacy boundary',
    '',
    '- No pseudonymous identifiers (user_pseudo_id, session_id) are written to disk.',
    '- No raw event parameters are persisted; this digest uses only event names, page paths, and link domains.',
    '- All values are aggregate counts.',
    '',
  ];
  return lines.join('\n');
}

function writeOutput(content) {
  fs.mkdirSync(PRIVATE_DATA_ROOT, { recursive: true });
  const file = path.join(PRIVATE_DATA_ROOT, `ga4-key-event-digest-${todayIso()}.md`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = args[0] || '--probe';
  if (flag === '--probe' || flag === '--status') {
    console.log(blockedNotice('Service-account credentials are not currently reachable from this shell.'));
    return 0;
  }
  if (flag === '--dry-run') {
    console.log(dryRunPlan());
    return 0;
  }
  if (flag === '--live') {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS not set. Run --probe for setup.');
      process.exit(1);
    }
    const content = await liveRun();
    const file = writeOutput(content);
    console.log('Wrote', file);
    return 0;
  }
  console.error('Usage: ga4-key-event-digest.cjs [--probe|--dry-run|--live]');
  return 2;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code || 0))
    .catch((e) => { console.error(e.message || e); process.exit(1); });
}

module.exports = { ALL_EVENTS, KEY_EVENTS, RATIO_EVENTS, BASELINE_EVENTS, formatReport, ratio };
