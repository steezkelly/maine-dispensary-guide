'use strict';
/**
 * MDG-ANALYTICS-001 Ticket 008 — cross-source page-window join.
 *
 * Scope: approved G4=4c proposal, §3 only.
 * Authorization scope-hash: see
 * MDG-ANALYTICS-001-TICKET-008-CROSS-SOURCE-PAGE-WINDOW-JOIN-BATCH-APPROVAL.scope_hash.md
 * Revert: git revert <ticket-008-commit-sha>
 * Inputs are already-acquired GA4 R1 and Vercel A4 evidence. This module
 * performs no network access, no production writes, and no user-level joins.
 *
 * Contract:
 * - join identity: (canonical_page_path, measurement_date)
 * - source observations remain separate; no averaging/summing/min/max
 * - A5 Speed Insights is always MEASUREMENT_BLOCKED
 * - pre-2026-07-12 conversion-bearing windows are degraded
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CONTRACT_VERSION = 'ticket-008.v1';
const CSP_FIX_DATE = '2026-07-12';
const SETTLEMENT_LAG_DAYS = 3;
const METRIC_SOURCES = Object.freeze({
  sessions: 'ga4_data_api',
  engagement_rate: 'ga4_data_api',
  bounce_rate: 'ga4_data_api',
  average_session_duration: 'ga4_data_api',
  pageviews: 'ga4_bigquery',
  custom_events: 'ga4_bigquery',
  vercel_visits: 'vercel_a4',
  vercel_pageviews: 'vercel_a4',
  speed_insights: null,
});
const CONVERSION_EVENT_RE = /lead_capture|affiliate_click|conversion/i;

function normalizeDate(value) {
  if (value == null || value === '') return null;
  const s = String(value);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function canonicalizePagePath(value) {
  if (value == null || value === '') return null;
  let raw = String(value).trim();
  if (!raw) return null;
  try {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) raw = new URL(raw).pathname;
  } catch {
    return null;
  }
  raw = raw.split('#', 1)[0].split('?', 1)[0];
  if (!raw.startsWith('/')) raw = `/${raw}`;
  raw = raw.replace(/\/+/g, '/');
  if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
  try { raw = decodeURI(raw); } catch { /* preserve evidence; path remains usable */ }
  return raw || '/';
}

function first(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return null;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function rowKey(pathValue, date) {
  return `${date}|${pathValue}`;
}

function sourceFamily(reportKey) {
  const key = String(reportKey || '').toLowerCase();
  if (key.includes('session')) return 'sessions';
  if (key.includes('event')) return 'custom_events';
  if (key.includes('pageview') || key.includes('page_view')) return 'pageviews';
  if (key.includes('speed') || key.includes('vital')) return 'speed_insights';
  return 'pageviews';
}

function preferredMetricSource(row, report) {
  const metric = canonicalComparableMetricName(first(row, ['metric_name', 'metricName', 'metric']));
  return METRIC_SOURCES[metric] || METRIC_SOURCES[sourceFamily(report?.report_key || report?.report_id || '')] || null;
}

function metricValue(row, report) {
  if (row.value !== undefined) return row.value;

  const preferredSource = preferredMetricSource(row, report);
  if (row.data_api_value !== undefined || row.bq_value !== undefined) {
    if (preferredSource === 'ga4_bigquery') {
      if (row.bq_value !== undefined && row.bq_value !== null) return row.bq_value;
      if (row.data_api_value !== undefined && row.data_api_value !== null) return row.data_api_value;
    }
    if (preferredSource === 'ga4_data_api') {
      if (row.data_api_value !== undefined && row.data_api_value !== null) return row.data_api_value;
      if (row.bq_value !== undefined && row.bq_value !== null) return row.bq_value;
    }
    if (row.data_api_value !== undefined && row.data_api_value !== null) return row.data_api_value;
    if (row.bq_value !== undefined && row.bq_value !== null) return row.bq_value;
    return null;
  }

  if (row.metrics && typeof row.metrics === 'object') {
    const keys = Object.keys(row.metrics);
    if (keys.length === 1) return row.metrics[keys[0]];
    return row.metrics;
  }
  return null;
}

function metricSource(row, report) {
  const preferredSource = preferredMetricSource(row, report);
  if (preferredSource === 'ga4_bigquery') return row.bq_value != null ? 'ga4_bigquery' : (row.data_api_value != null ? 'ga4_data_api_fallback' : null);
  if (preferredSource === 'ga4_data_api') return row.data_api_value != null ? 'ga4_data_api' : (row.bq_value != null ? 'ga4_bigquery_fallback' : null);
  return null;
}

function normalizeManifestRows(rows) {
  const out = new Map();
  for (const row of rows || []) {
    const canonical = canonicalizePagePath(first(row, ['canonical_page_path', 'canonical_path', 'page_path', 'path']));
    if (canonical) out.set(canonical, row);
  }
  return out;
}

function normalizeGa4Release(release) {
  const records = [];
  const reports = Array.isArray(release) ? release : (release && Array.isArray(release.rows) ? release.rows : []);
  for (const report of reports) {
    const reportKey = report.report_key || report.report_id || '';
    const family = sourceFamily(reportKey);
    for (const raw of report.sanitized_rows || report.rows || []) {
      const key = raw.row_key || raw.dimensions || raw;
      const date = normalizeDate(first(key, ['date', 'event_date', 'day']));
      const page = canonicalizePagePath(first(key, ['page_path', 'pagePath', 'requestPath', 'path', 'page_location']));
      if (!date || !page) continue;
      const eventName = first(key, ['event_name', 'eventName', 'event']) || null;
      const metricName = first(raw, ['metric_name', 'metricName', 'metric'])
        || first(key, ['metric_name', 'metricName', 'metric'])
        || null;
      const value = metricValue(raw, report);
      records.push({
        source: 'ga4', source_family: family, report_key: reportKey,
        date, canonical_page_path: page, event_name: eventName, metric_name: metricName,
        value, metric_source: metricSource(raw, report), observed: { bq_value: raw.bq_value ?? null, data_api_value: raw.data_api_value ?? null },
        row_key: raw.row_key || key,
      });
    }
  }
  return records;
}

function normalizeVercelRows(input) {
  const rows = Array.isArray(input) ? input : (input && Array.isArray(input.rows) ? input.rows : []);
  return rows.map((raw) => {
    const date = normalizeDate(first(raw, ['date', 'day', 'measurement_date', 'window_date']));
    const page = canonicalizePagePath(first(raw, ['canonical_page_path', 'requestPath', 'request_path', 'page_path', 'path']));
    const family = String(first(raw, ['source_family', 'dataset', 'metric_family']) || 'vercel_a4').toLowerCase();
    const a5 = family.includes('speed') || family.includes('vital') || String(raw.source || '').toUpperCase() === 'A5';
    const reportKey = raw.report_key || raw.dataset || 'vercel_a4_visits';
    const metricFamily = family === 'vercel_a4' ? sourceFamily(reportKey) : family;
    return {
      source: a5 ? 'a5' : 'vercel', source_family: a5 ? 'speed_insights' : metricFamily,
      report_key: reportKey, date,
      canonical_page_path: page, event_name: raw.event_name || raw.eventName || null,
      metric_name: raw.metric_name || raw.metricName || raw.metric || null,
      value: metricValue(raw, raw), observed: raw,
      row_key: raw.row_key || raw,
    };
  }).filter((row) => row.date && row.canonical_page_path);
}

function classifyPresence(ga4, vercel) {
  if (ga4 && vercel) return 'both';
  if (ga4) return 'ga4_only';
  if (vercel) return 'vercel_only';
  return 'neither';
}

function classifyReconciliation(ga4, vercel) {
  if (!ga4 && !vercel) return 'measurement_blocked';
  if (!ga4) return 'missing_ga4';
  if (!vercel) return 'missing_vercel';
  if (ga4.source === 'a5' || vercel.source === 'a5') return 'measurement_blocked';
  if (ga4.value == null && vercel.value == null) return 'matched';
  if (typeof ga4.value !== 'number' || typeof vercel.value !== 'number') return 'source_delta';
  return ga4.value === vercel.value ? 'matched' : 'source_delta';
}

function measurementStatus(date, records) {
  const conversion = records.some((r) => CONVERSION_EVENT_RE.test(String(r.event_name || r.report_key || '')));
  if (conversion && date < CSP_FIX_DATE) return 'WINDOW_MEASUREMENT_DEGRADED';
  if (records.some((r) => r.source === 'a5')) return 'MEASUREMENT_BLOCKED';
  return 'MEASURED';
}

function settlementState(date, asOf) {
  const observed = normalizeDate(date);
  const reference = normalizeDate(asOf) || new Date().toISOString().slice(0, 10);
  if (!observed) return 'fresh';
  const cutoff = new Date(`${reference}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - SETTLEMENT_LAG_DAYS);
  return observed <= cutoff.toISOString().slice(0, 10) ? 'settled' : 'fresh';
}

function deltaFields(ga4, vercel) {
  if (!ga4 || !vercel) return {};
  if (typeof ga4.value !== 'number' || typeof vercel.value !== 'number') return { observed: true };
  return { value: { ga4: ga4.value, vercel: vercel.value, absolute: ga4.value - vercel.value } };
}

function canonicalComparableMetricName(metricName) {
  if (metricName == null || metricName === '') return null;
  const normalized = String(metricName).trim().replace(/[\s_-]+/g, '').toLowerCase();
  // GA4's screenPageViews and Vercel A4's pageviews describe the comparable
  // page-view count. Keep the original metric name in output evidence, but use
  // this shared identity so the observations reconcile in one page-day group.
  if (['screenpageviews', 'pageviews', 'pageview'].includes(normalized)) return 'pageviews';
  return String(metricName);
}

function isNonAdditiveMetric(metricName) {
  return ['sessions', 'totalUsers', 'activeUsers', 'newUsers'].includes(canonicalComparableMetricName(metricName));
}

function observationIdentity(record) {
  if (/^R[78]_custom_event_/.test(record.report_key)) return `row:${record.report_key}|${stableHash(record.row_key)}`;
  const metricName = canonicalComparableMetricName(record.metric_name);
  if (metricName && record.event_name) return `metric:${metricName}|event:${record.event_name}`;
  if (metricName) return `metric:${metricName}`;
  if (record.event_name) return `event:${record.event_name}`;
  return null;
}

function validateReleaseProvenance(ga4Release, runManifest, sourceReleaseIds) {
  if (ga4Release?.release_status !== 'VALID') throw new Error('only a VALID canonical release can be joined');
  if (!/^rel_[0-9a-f]{16}$/.test(sourceReleaseIds.canonical_release_id || '')) throw new Error('valid canonical_release_id is required');
  if (!/^run_[0-9a-f]{16}$/.test(sourceReleaseIds.acquisition_release_id || '')) throw new Error('valid acquisition_release_id is required');
  if (runManifest && Object.keys(runManifest).length && (runManifest.canonical_release_id !== sourceReleaseIds.canonical_release_id || runManifest.acquisition_release_id !== sourceReleaseIds.acquisition_release_id)) throw new Error('run manifest release IDs must match canonical release IDs');
}

function joinPageWindow({ ga4Release, vercelRows, manifestRows = [], windowStart = null, windowEnd = null, sourceReleaseIds = {}, asOf = null }) {
  if (ga4Release?.release_status === 'INVALID') throw new Error('invalid canonical release cannot be joined');
  const ga4 = normalizeGa4Release(ga4Release);
  const vercel = normalizeVercelRows(vercelRows);
  const manifest = normalizeManifestRows(manifestRows);
  const groups = new Map();
  const add = (record) => {
    const identity = observationIdentity(record);
    const key = `${rowKey(record.canonical_page_path, record.date)}|${record.source_family}|${identity || ''}`;
    if (!groups.has(key)) groups.set(key, { date: record.date, canonical_page_path: record.canonical_page_path, metric_family: record.source_family, observation_identity: identity, ga4: [], vercel: [], a5: [] });
    const group = groups.get(key);
    if (record.source === 'ga4') group.ga4.push(record);
    else if (record.source === 'a5') group.a5.push(record);
    else group.vercel.push(record);
  };
  ga4.forEach(add); vercel.forEach(add);

  const rows = [];
  for (const group of groups.values()) {
    // Same page/day/metric title variants are one observation. Additive metrics
    // can be summed, but user/session metrics cannot: title variants can
    // overlap and their union is not recoverable from the aggregate rows.
    const aggregate = (records) => {
      if (!records.length) return null;
      const ordered = [...records].sort((a, b) => JSON.stringify(a.row_key).localeCompare(JSON.stringify(b.row_key)));
      const values = ordered.map((record) => record.value);
      const ambiguousNonAdditive = isNonAdditiveMetric(ordered[0].metric_name) && ordered.length > 1;
      return {
        ...ordered[0],
        value: ambiguousNonAdditive ? null : (values.every((value) => typeof value === 'number') ? values.reduce((sum, value) => sum + value, 0) : ordered[0].value),
        row_key: ordered.map((record) => record.row_key),
        aggregation_blocked: ambiguousNonAdditive,
      };
    };
    const ga = aggregate(group.ga4);
    const ve = aggregate(group.vercel);
    const a5 = group.a5[0] || null;
    const records = [...group.ga4, ...group.vercel, ...group.a5];
    // Vercel A4 is the required counterpart for pageview validation. Other
    // GA4 families (for example, custom conversion events) do not have an
    // A4-equivalent and remain governed by their own measurement contracts.
    const missingRequiredVercel = Boolean(ga && !ve && group.metric_family === 'pageviews');
    const reconciliationBlocked = Boolean(a5 || ga?.aggregation_blocked || ve?.aggregation_blocked);
    const measurementBlocked = reconciliationBlocked || missingRequiredVercel;
    const primaryStatus = reconciliationBlocked ? 'MEASUREMENT_BLOCKED' : classifyReconciliation(ga, ve);
    rows.push({
      canonical_page_path: group.canonical_page_path,
      metric_family: group.metric_family,
      metric_name: ga?.metric_name || ve?.metric_name || a5?.metric_name || null,
      event_name: ga?.event_name || ve?.event_name || a5?.event_name || null,
      observation_identity: group.observation_identity,
      measurement_date: group.date,
      window_start: windowStart,
      window_end: windowEnd,
      property_timezone: 'America/New_York',
      ga4_r1: ga ? { row_key: ga.row_key, value: ga.value, report_key: ga.report_key, observed: ga.observed } : null,
      vercel_a4: ve ? { row_key: ve.row_key, value: ve.value, report_key: ve.report_key, observed: ve.observed } : null,
      page_manifest_row_key: manifest.get(group.canonical_page_path)?.page_id || null,
      source_presence: classifyPresence(ga, ve),
      reconciliation_status: reconciliationBlocked ? 'measurement_blocked' : primaryStatus,
      measurement_status: measurementBlocked ? 'MEASUREMENT_BLOCKED' : measurementStatus(group.date, records),
      delta_fields: deltaFields(ga, ve),
      canonical_metric_source: measurementBlocked ? null : ga?.metric_source || METRIC_SOURCES[ga?.source_family || ve?.source_family] || null,
      canonical_release_id: sourceReleaseIds.canonical_release_id || null,
      acquisition_release_id: sourceReleaseIds.acquisition_release_id || null,
      privacy_redaction_status: 'asserted_no_user_level_join',
      join_contract_version: CONTRACT_VERSION,
      settlement_state: settlementState(group.date, asOf),
      measurement_block_reason: a5 ? 'A5_SPEED_INSIGHTS_DEFERRED' : ((ga?.aggregation_blocked || ve?.aggregation_blocked) ? 'NON_ADDITIVE_TITLE_VARIANT_AMBIGUITY' : (missingRequiredVercel ? 'VERCEL_A4_COUNTERPART_MISSING' : null)),
    });
  }
  rows.sort((a, b) => `${a.measurement_date}|${a.canonical_page_path}|${a.metric_family}|${a.observation_identity || ''}`.localeCompare(`${b.measurement_date}|${b.canonical_page_path}|${b.metric_family}|${b.observation_identity || ''}`));
  return rows;
}

function buildEvidenceManifest(rows, inputs = {}) {
  const counts = {};
  for (const row of rows) {
    counts[row.reconciliation_status] = (counts[row.reconciliation_status] || 0) + 1;
  }
  return {
    schema_version: CONTRACT_VERSION,
    generated_at_utc: inputs.generatedAt || null,
    input_release_ids: inputs.sourceReleaseIds || {},
    window: { start: inputs.windowStart || null, end: inputs.windowEnd || null, timezone: 'America/New_York' },
    row_count: rows.length,
    reconciliation_status_counts: counts,
    source_presence_counts: rows.reduce((a, r) => { a[r.source_presence] = (a[r.source_presence] || 0) + 1; return a; }, {}),
    measurement_status_counts: rows.reduce((a, r) => { a[r.measurement_status] = (a[r.measurement_status] || 0) + 1; return a; }, {}),
    a5_blocked_count: rows.filter((r) => r.measurement_block_reason === 'A5_SPEED_INSIGHTS_DEFERRED').length,
    privacy_redaction_assertion: rows.every((r) => r.privacy_redaction_status === 'asserted_no_user_level_join'),
    output_hash: stableHash(rows),
  };
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function parseArgs(argv) {
  const out = {};
  for (const arg of argv) { const m = /^--([^=]+)=(.*)$/.exec(arg); if (m) out[m[1]] = m[2]; }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ga4 || !args.vercel || !args.out) {
    console.error('Usage: node ticket008-page-window-join.cjs --ga4=... --vercel=... --out=... [--manifest=...]');
    process.exitCode = 2; return;
  }
  const ga4 = readJson(args.ga4);
  const vercel = readJson(args.vercel);
  const manifest = args.manifest ? fs.readFileSync(args.manifest, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
  const runManifest = args.run_manifest ? readJson(args.run_manifest) : {};
  const sourceReleaseIds = {
    canonical_release_id: runManifest.canonical_release_id || ga4.canonical_release_id || null,
    acquisition_release_id: runManifest.acquisition_release_id || ga4.acquisition_release_id || null,
  };
  validateReleaseProvenance(ga4, runManifest, sourceReleaseIds);
  if (!normalizeDate(args.as_of)) throw new Error('a deterministic --as_of=YYYY-MM-DD is required');
  const rows = joinPageWindow({ ga4Release: ga4, vercelRows: vercel, manifestRows: manifest, windowStart: args.window_start || ga4.from || null, windowEnd: args.window_end || ga4.to || null, sourceReleaseIds, asOf: args.as_of });
  const output = { schema_version: CONTRACT_VERSION, rows };
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(args.out.replace(/\.json$/, '.manifest.json'), JSON.stringify(buildEvidenceManifest(rows, { sourceReleaseIds, windowStart: args.window_start || ga4.from, windowEnd: args.window_end || ga4.to, generatedAt: `${args.as_of}T00:00:00.000Z` }), null, 2) + '\n');
  console.log(`Ticket 008 join: ${rows.length} rows written to ${args.out}`);
}

module.exports = { CONTRACT_VERSION, CSP_FIX_DATE, canonicalizePagePath, canonicalComparableMetricName, normalizeDate, normalizeGa4Release, normalizeVercelRows, joinPageWindow, buildEvidenceManifest, classifyPresence, classifyReconciliation, measurementStatus, metricSource, validateReleaseProvenance };

if (require.main === module) main();
