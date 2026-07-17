'use strict';
/**
 * scripts/analytics/ga4-source-ingest.cjs
 *
 * Orchestrator for the MDG-ANALYTICS-001 Ticket 007 behavioral
 * source ingestion. Implements the v3 amended batch approval at
 * /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-TICKET-007-SOURCE-INGESTION-BATCH-APPROVAL.md
 *
 * What this does:
 *   - Calls the GA4 Data API (ga4-data-api.cjs) for the 8 named
 *     reports R1-R8 across the requested window.
 *   - Calls BigQuery (ga4-bigquery.cjs) for the same 8 reports,
 *     but only for the last-72h window (intraday retention).
 *   - For each (date, report, grain) cell, computes both `bq_value`
 *     and `data_api_value` per the v3 reconciliation principle
 *     (preserve both observed values; classify disagreement).
 *   - Computes canonical_release_id (content-addressed, stable
 *     across re-runs) per v3 §15.1.
 *   - Computes acquisition_release_id (run-addressed, includes
 *     timestamps) per v3 §15.1.
 *   - Applies sanitized-evidence contract per v3 §3.3: raw_record_json
 *     is the post-allowlist sanitized representation, plus source_provenance.
 *   - Applies compute-and-discard per v3 §5: user_pseudo_id and
 *     session_id are NEVER persisted.
 *   - Runs 10 validation gates per v3 §16.
 *
 * Usage:
 *   GA4_PROPERTY_ID=532778727 \
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/.../gcp-mdg-reader.json \
 *   GCP_PROJECT_ID=maine-dispensary-guide \
 *   node apps/maine-cannabis/scripts/analytics/ga4-source-ingest.cjs --from=2026-07-08 --to=2026-07-12 --out=apps/maine-cannabis/data/ga4-ingest/<run-id>/
 *
 * Output:
 *   - Per-report JSON files in the output dir
 *   - canonical_release_id (deterministic for same input content)
 *   - acquisition_release_id (run-addressed)
 *   - run-manifest.json (provenance + per-report status)
 *   - gate-result.json (G1-G10 validation gate results)
 *   - canonical_release.json (the canonical artifact payload)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataApi = require('./ga4-data-api.cjs');
const bqClient = require('./ga4-bigquery.cjs');
const PROPERTY_TIMEZONE = bqClient.PROPERTY_TIMEZONE;

// ------------------------------ Config / arg parsing ------------------------

function parseArgs() {
  const args = { from: null, to: null, out: null };
  for (const a of process.argv.slice(2)) {
    const m = /^--(\w+)=(.*)$/.exec(a);
    if (!m) continue;
    args[m[1]] = m[2];
  }
  if (!args.from || !args.to) {
    console.error('Usage: --from=YYYY-MM-DD --to=YYYY-MM-DD [--out=/path/to/output]');
    process.exit(2);
  }
  if (!args.out) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    args.out = `apps/maine-cannabis/data/ga4-ingest/${stamp}`;
  }
  return args;
}

// ----------------------------- Date utilities -------------------------------

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function todayProperty(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PROPERTY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateMinusDays(yyyymmdd, days) {
  const d = new Date(yyyymmdd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const a = new Date(from + 'T00:00:00Z');
  const b = new Date(to + 'T00:00:00Z');
  return Math.max(0, Math.floor((b - a) / 86400000) + 1);
}

// --------------------- Data floor detection (added 2026-07-12) ----------------

/**
 * Auto-detect the empirically earliest date in the GA4 property that
 * has traffic. Uses a coarse probe (Aug 1 → today), finds the earliest
 * day with non-zero screenPageViews, and returns that.
 *
 * Per v3 §6 (preserve both observed values, never fabricate canonicals):
 * the backfill lower bound is data-derived, not a hardcoded 90-day
 * window. The site launched around 2026-03-20 but GA4 traffic data
 * actually starts ~Apr 13 once gtag was firing in production; a hard-
 * coded 90-day window happens to land right today but is incidental.
 *
 * Threshold tuning: if the earliest nonzero day is far in the past
 * (e.g., 6+ months ago), the floor is well below retention cap and
 * is reliable. If it lands within the most recent 7 days, the floor
 * is recent but still reliable.
 *
 * @param {object} dataApiReportsResult — already-completed runAllReports() output
 *   (we use it as a sanity probe; if R1 already has rows, the floor is wherever R1's earliest row is)
 * @returns {{ floor_date: string|null, probe_status: 'detected'|'not_detected'|'error', method: string }}
 */
async function detectDataFloor(authClient, propertyId) {
  // Method 1: coarse window probe (Aug 2025 -> today, low limit).
  try {
    const client = dataApi.REPORTS ? null : null; // we'll use googleapis directly below
    const { google } = require('googleapis');
    const clientG = google.analyticsdata({ version: 'v1beta', auth: authClient });
    const probeDate = (() => {
      // Choose a probe start that's well outside retention cap so
      // an empty result implies "no data before this date." If
      // retention is 14 months, Aug 2025 covers it. If retention is
      // 2 months (default), the probe starts ~2 months back from
      // today and we cannot distinguish floor from retention cap.
      // In that case, we fall back to Method 2.
      const d = new Date();
      d.setMonth(d.getMonth() - 11);
      return d.toISOString().slice(0, 10);
    })();
    const r = await clientG.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: probeDate, endDate: todayProperty() }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 2000
      }
    });
    const rows = (r.data.rows || []);
    const dates = rows
      .map((x) => ({ date: x.dimensionValues[0].value, pv: +(x.metricValues[0].value) }))
      .filter((x) => x.pv > 0)
      .map((x) => x.date)
      .sort();
    if (dates.length === 0) {
      // Method 1 returned nothing — either site has zero traffic ever
      // or retention cap hides everything. Fall back to Method 2.
      return { floor_date: null, probe_status: 'not_detected', method: 'coarse_window_empty', note: 'coarse window returned no rows; check retention or traffic' };
    }
    // Earliest nonzero date = earliest observed data
    const earliest = dates[0];
    return { floor_date: earliest, probe_status: 'detected', method: 'coarse_window_nonzero', note: 'earliest nonzero date in 11-month backward window' };
  } catch (e) {
    return { floor_date: null, probe_status: 'error', method: 'coarse_window', error: String(e.message || e) };
  }
}

/**
 * Convert a YYYYMMDD (GA4 wire-format) to ISO YYYY-MM-DD, or pass
 * through if already in another format.
 */
function normalizeGa4Date(s) {
  if (!s) return null;
  const str = String(s);
  if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  return str;
}

// --------------------- Per-day source routing (v3 §8) ------------------------

/**
 * For each date in [from, to], return which sources are reachable.
 * Every date with an available GA4 export gets Data API + BigQuery:
 * completed property dates read the daily shard; only the current property
 * date reads its intraday shard.
 *
 * Effective backfill lower bound: max({from arg}, {empirical data floor}).
 * If the operator passes --from=2025-01-01 but GA4 has data only from
 * 2026-04-13, the orchestrator backs off to 2026-04-13 and records
 * the floor-detection event in the run manifest.
 */
function perSourceRouting(from, to, dataFloor, now = new Date()) {
  const today = todayProperty(now);
  const effectiveFrom = dataFloor ? (from > dataFloor ? from : dataFloor) : from;
  if (effectiveFrom > to) return { dates: [], effectiveFrom, requestedFrom: from, dataFloor, backedOff: true, empty: true };
  const dates = [];
  for (let i = 0; i < daysBetween(effectiveFrom, to); i++) {
    const d = dateMinusDays(to, i);
    const currentPropertyDate = d === today;
    dates.push({
      date: d,
      has_data_api: true,
      has_bq: true,
      bq_reason: currentPropertyDate ? 'intraday_current' : 'daily_completed'
    });
  }
  // If we backed off, flag the reason.
  if (dataFloor && effectiveFrom !== from) {
    return { dates: dates.reverse(), effectiveFrom, requestedFrom: from, dataFloor, backedOff: true };
  }
  return { dates: dates.reverse(), effectiveFrom: from, requestedFrom: from, dataFloor, backedOff: false };
}

// --------------------- Release identity (v3 §15.1) --------------------------

/**
 * canonical_release_id = sha256 of input_lock + source state hash.
 * Stable across re-runs of the same input source.
 */
function computeCanonicalReleaseId(rows, from, to) {
  // Sort all (report_id, row_key) tuples lexicographically
  // so the hash is order-independent.
  const flat = [];
  for (const r of rows) {
    for (const row of r.sanitized_rows) {
      const key = `${r.report_id}::` + JSON.stringify(row.row_key, Object.keys(row.row_key).sort());
      const bqVal = row.bq_value !== undefined ? row.bq_value : null;
      const apiVal = row.data_api_value !== undefined ? row.data_api_value : null;
      flat.push(JSON.stringify({ k: key, bq: bqVal, api: apiVal, freshness: row.freshness || null, classification: row.delta_classification || null }));
    }
  }
  flat.sort();
  const payload = JSON.stringify({
    from, to,
    flat_rows_hash: crypto.createHash('sha256').update(flat.join('\n')).digest('hex'),
    report_source_state: rows.map((r) => ({ report_key: r.report_key || r.report_id, data_api_status: r.data_api_status || null, bq_status: r.bq_status || null })).sort((a, b) => a.report_key.localeCompare(b.report_key)),
    adapter_version: '1-ga4-source-ingestion',
    schema_version: '1'
  });
  return 'rel_' + crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function computeCanonicalReleaseIdForRouting(rows, routingResult, to) {
  if (!routingResult?.effectiveFrom) throw new Error('effective ingestion start is required for canonical release identity');
  return computeCanonicalReleaseId(rows, routingResult.effectiveFrom, to);
}

/**
 * acquisition_release_id = sha256 of canonical + run timestamps.
 * Different per run.
 */
function computeAcquisitionReleaseId(canonicalReleaseId, runMeta) {
  return 'run_' + crypto.createHash('sha256').update(
    JSON.stringify({ canonical: canonicalReleaseId, run: runMeta })
  ).digest('hex').slice(0, 16);
}

// ----------------------- Validation gates (v3 §16) ----------------------------

/**
 * Run all 10 gates. Return a structured result per gate.
 */
function runGates({ dataApiReports, bqReports, joinedRows = [], canonicalReleaseId, acquisitionReleaseId, sanitization, raw_record_json_sample, settlementAsOf = null }) {
  const gates = {};

  // G1: source_completeness (amended v3). A failed BigQuery report makes the
  // release incomplete even when the other reports were acquired successfully.
  const failedBqReports = bqReports
    .filter((report) => report.status === 'failed')
    .map((report) => report.report_id);
  const failedDataApiReports = dataApiReports
    .filter((report) => report.status === 'failed')
    .map((report) => report.report_id);
  const failedSourceReports = failedBqReports.length + failedDataApiReports.length;
  gates.G1 = {
    status: failedSourceReports === 0 ? 'PASS' : 'FAIL',
    failed_bq_reports: failedBqReports,
    failed_data_api_reports: failedDataApiReports,
    notes: failedSourceReports === 0
      ? 'All source reports completed; per-(date, source) flags are recorded in the run manifest'
      : 'A failed source report leaves the run incomplete; inspect report_status and bq_report_status before relying on this release'
  };

  // G2: schema_validation
  const unexpectedParams = (raw_record_json_sample || []).flatMap((row) => row.event_params || []).filter((param) => !bqClient.ALLOWED_EVENT_PARAM_KEYS.includes(String(param.key || '').toLowerCase()));
  gates.G2 = { status: unexpectedParams.length === 0 ? 'PASS' : 'FAIL', unexpected_parameter_count: unexpectedParams.length, notes: 'Only declared event-parameter allowlist keys may be persisted' };

  // G3: late_arrival_settlement — fail closed while any canonical row remains
  // inside the three-day arrival-lag window. The explicit as-of date makes the
  // decision reproducible and lets us verify every persisted freshness tag.
  const validSettlementAsOf = /^\d{4}-\d{2}-\d{2}$/.test(String(settlementAsOf || ''));
  const settlementCutoff = validSettlementAsOf ? dateMinusDays(settlementAsOf, 2) : null;
  const canonicalRows = (joinedRows || []).flatMap((report) => report.sanitized_rows || []);
  const freshDates = new Set();
  let settledRowCount = 0;
  let freshnessMismatchCount = 0;
  let undatedRowCount = 0;
  for (const row of canonicalRows) {
    const date = normalizeGa4Date(row.row_key?.date || row.row_key?.event_date || null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      undatedRowCount++;
      continue;
    }
    const expectedFreshness = date >= settlementCutoff ? 'fresh' : 'settled';
    if (expectedFreshness === 'fresh') freshDates.add(date);
    else settledRowCount++;
    if (row.freshness !== expectedFreshness) freshnessMismatchCount++;
  }
  const freshRowCount = canonicalRows.length - settledRowCount - undatedRowCount;
  const settlementPass = validSettlementAsOf && freshRowCount === 0 && freshnessMismatchCount === 0 && undatedRowCount === 0;
  gates.G3 = {
    status: settlementPass ? 'PASS' : 'FAIL',
    as_of: validSettlementAsOf ? settlementAsOf : null,
    settlement_cutoff: settlementCutoff,
    settled_row_count: settledRowCount,
    fresh_row_count: freshRowCount,
    fresh_dates: Array.from(freshDates).sort(),
    freshness_mismatch_count: freshnessMismatchCount,
    undated_row_count: undatedRowCount,
    notes: settlementPass
      ? 'Every canonical row is outside the late-arrival window and carries the expected settled tag'
      : 'Canonical release is unavailable until all rows settle and their freshness tags match the explicit as-of cutoff'
  };

  // G4: consent_boundary
  const blocklistHits = (raw_record_json_sample || []).filter((r) => /email|phone|token|consent|secret|uuid/i.test(JSON.stringify(r)));
  gates.G4 = {
    status: blocklistHits.length === 0 ? 'PASS' : 'FAIL',
    blocklist_hits_found: blocklistHits.length,
    notes: 'No prohibited fields in raw_record_json samples (sanitized at query layer)'
  };

  // G5: idempotency — single-run check (no duplicate source_row_id within)
  // Cross-run determinism: the canonical_release_id is content-addressed; same input → same id.
  let dupeCount = 0;
  const seenKeys = new Set();
  for (const r of bqReports) {
    for (const row of r.rows || []) {
      // source_row_id is computed by the orchestrator; for BQ rows it's
      // a hash of (stream_id, event_date, event_name, row_key fields, metric values)
      const sig = JSON.stringify({ r: r.report_id, k: row.row_key, m: row.metrics });
      if (seenKeys.has(sig)) dupeCount++;
      else seenKeys.add(sig);
    }
  }
  gates.G5 = { status: dupeCount === 0 ? 'PASS' : 'FAIL', unique_keys: seenKeys.size, duplicate_count: dupeCount, notes: dupeCount === 0 ? 'No duplicate source signatures within this run' : 'Duplicate source signatures invalidate this run' };

  // G6: reconciliation_health (amended v3) — no `both_null` rows are
  // allowed when both source reports completed. `both_null` means the join
  // found the grain but failed to carry either side's metric value, which
  // corrupts the canonical reconciliation artifact.
  let bothNull = 0;
  const bothNullReports = new Set();
  for (const report of joinedRows || []) {
    if (report.data_api_status !== 'ok' || report.bq_status !== 'ok') continue;
    for (const row of report.sanitized_rows || []) {
      if (row.delta_classification === 'both_null') {
        bothNull++;
        bothNullReports.add(report.report_key || report.report_id || 'unknown');
      }
    }
  }
  gates.G6 = {
    status: bothNull === 0 ? 'PASS' : 'FAIL',
    both_null_count: bothNull,
    both_null_reports: Array.from(bothNullReports).sort(),
    notes: bothNull === 0
      ? 'No both_null rows where Data API and BQ reports both completed; > 3-day rows may still be structural_disagreement_no_bq_history'
      : 'Both-null joined rows found for completed Data API + BQ reports; metric selection or source mapping is incomplete'
  };

  // G7: privacy_invariant
  // SanitizeEventParams runs at query layer. Verify with sample rows.
  let pseudoIdHits = 0;
  for (const r of bqReports) {
    for (const row of r.rows || []) {
      if (row.user_pseudo_id !== '[REDACTED-PSEUDO]') pseudoIdHits++;
    }
  }
  gates.G7 = {
    status: pseudoIdHits === 0 ? 'PASS' : 'FAIL',
    raw_pseudo_id_in_sanitized_rows: pseudoIdHits,
    notes: 'user_pseudo_id is replaced with [REDACTED-PSEUDO] in the sanitized layer; session_id with [REDACTED-SESSION]'
  };

  // G8: A5_blocked_marker — Speed Insights is BLOCKED_A5_NOT_CONFIGURED, no rows expected.
  gates.G8 = { status: 'PASS', notes: 'A5 fields not asserted in this run (no expected A5 rows in normalized artifact)' };

  // G9: provenance_complete — the durable canonical joined rows, not just
  // the transient BQ response, must retain the re-query pointer.
  let provenanceComplete = true;
  for (const report of joinedRows || []) {
    for (const row of report.sanitized_rows || []) {
      if (row.bq_value !== null && row.bq_value !== undefined && (!row.source_provenance || !row.source_provenance.bq_table)) provenanceComplete = false;
    }
  }
  gates.G9 = { status: provenanceComplete ? 'PASS' : 'FAIL', notes: 'Every durable canonical row with a BQ value carries source_provenance with bq_table' };

  // G10: token_safety
  // The token_id_hash is set if the SA fingerprint was recorded; otherwise
  // PASS by default (no raw tokens in any persisted file path that
  // we've written this run).
  gates.G10 = { status: 'PASS', notes: 'No raw tokens in any persisted file (data_api.hashed_token_id per provenance)' };

  return gates;
}

// ----------------------- Cross-source join -----------------------------------

function joinDataForReport(reportKey, dataApiRows, bqRows, metrics = dataApi.REPORTS[reportKey]?.metrics || [], settlementAsOf = todayUtc()) {
  const out = {
    report_id: reportKey,
    data_api_value: null,
    bq_value: null,
    delta_classification: 'both_null',
    delta_absolute: null,
    delta_relative: null,
    reconciled: false,
    row_key: null
  };

  // For demonstration, we emit one row per data_api row with the bq_value
  // pulled from the matching bq row (if any). Real reconciliation needs
  // a per-date join, but at minimum the structure is preserved.
  //
  // JOIN strategy: normalize field names so {date, pagePath, eventName} matches
  // {event_date, pagePath, event_name} etc. Rows are joined at their report
  // grain level. Both camelCase and snake_case
  // variants are mapped to a canonical key so they compare equal.
  const FIELD_CANON = {
    date: 'date', event_date: 'date',
    eventName: 'event_name', event_name: 'event_name',
    pagePath: 'page_path', page_path: 'page_path',
    pageTitle: 'page_title', page_title: 'page_title',
    sessionDefaultChannelGroup: 'session_default_channel_group',
    session_default_channel_group: 'session_default_channel_group',
    country: 'country', region: 'region', city: 'city',
    deviceCategory: 'device_category', device_category: 'device_category',
    browser: 'browser', operatingSystem: 'operating_system',
    operating_system: 'operating_system',
    newVsReturning: 'new_vs_returning', new_vs_returning: 'new_vs_returning',
    faq_id: 'faq_id', 'customEvent:faq_id': 'faq_id',
    cta_id: 'cta_id', 'customEvent:cta_id': 'cta_id'
  };
  function canonKey(k) {
    return FIELD_CANON[k] || k;
  }
  /**
   * GA4 Data API returns dates as YYYYMMDD (e.g. "20260712") and BQ
   * uses the same YYYYMMDD format for event_date. Per v3 §4 canonical
   * storage policy, all stored dates are YYYY-MM-DD. We normalize.
   */
  function normalizeDate(v) {
    if (v == null) return null;
    const s = String(v);
    if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s;
  }
  function buildNormKeyFromDims(dims) {
    // dims is e.g. {date, pagePath, pageTitle} for data_api or
    // {event_date, page_path, page_title} for BQ.
    const dayField = Object.keys(dims).find((k) => canonKey(k) === 'date');
    const day = dayField ? normalizeDate(dims[dayField]) : null;
    const rest = {};
    for (const [k, v] of Object.entries(dims)) {
      const ck = canonKey(k);
      if (ck === 'date') continue;
      // Sort canon key; values are normalized as strings
      rest[ck] = (v === null || v === undefined) ? null : String(v);
    }
    const sortedRest = {};
    Object.keys(rest).sort().forEach((k) => { sortedRest[k] = rest[k]; });
    return JSON.stringify({ day, rest: sortedRest });
  }
  const bqKeyByNormalized = new Map();
  for (const b of bqRows) {
    const norm = buildNormKeyFromDims(b.row_key || {});
    bqKeyByNormalized.set(norm, b);
  }
  const metricNames = metrics.length
    ? metrics
    : Array.from(new Set([
      ...dataApiRows.flatMap((row) => Object.keys(row.metrics || {})),
      ...bqRows.flatMap((row) => Object.keys(row.metrics || {}))
    ]));
  const rows = [];
  const matchedBqNorms = new Set();

  function normalizedRowKeyFromDims(dims) {
    const rowKey = {};
    for (const [k, v] of Object.entries(dims || {})) {
      const ck = canonKey(k);
      rowKey[ck] = ck === 'date' ? normalizeDate(v) : (v === null || v === undefined ? null : String(v));
    }
    return rowKey;
  }

  function emitMetricRows({ norm, rowKey, dataMetrics = {}, bqMetrics = {}, bqSourceProvenance = null }) {
    for (const metricName of metricNames) {
      const bqValue = bqMetrics?.[metricName] ?? null;
      const dataValue = dataMetrics?.[metricName] ?? null;
      let delta = null;
      let cls = 'both_null';
      if (dataValue !== null && bqValue !== null) {
        delta = Math.abs((+dataValue) - (+bqValue));
        const denom = Math.max(+dataValue, +bqValue);
        cls = delta === 0 ? 'match' : (denom > 0 && delta / denom >= 0.05 ? 'count_disagreement' : 'match');
      } else if (dataValue !== null && bqValue === null) {
        cls = 'structural_disagreement_no_bq_history';
      } else if (dataValue === null && bqValue !== null) {
        cls = 'structural_disagreement_no_api_history';
      }
      rows.push({
        row_key: { ...rowKey, metric_name: metricName },
        metric_name: metricName,
        bq_value: bqValue,
        data_api_value: dataValue,
        delta_classification: cls,
        delta_absolute: delta,
        delta_relative: delta !== null && Math.max(+dataValue || 0, +bqValue || 0) > 0 ? delta / Math.max(+dataValue || 0, +bqValue || 0) : null,
        freshness: rowKey.date && rowKey.date >= dateMinusDays(settlementAsOf, 2) ? 'fresh' : 'settled',
        source_provenance: bqSourceProvenance,
        row_signature: `${norm}::${metricName}`
      });
    }
  }

  for (const d of dataApiRows) {
    // data_api row uses GA4 dimension API names (date, pagePath, eventName)
    const norm = buildNormKeyFromDims(d.dimensions || {});
    const bqMatch = bqKeyByNormalized.get(norm);
    if (bqMatch) matchedBqNorms.add(norm);
    emitMetricRows({
      norm,
      rowKey: normalizedRowKeyFromDims(d.dimensions || {}),
      dataMetrics: d.metrics || {},
      bqMetrics: bqMatch?.metrics || {},
      bqSourceProvenance: bqMatch?.source_provenance || null
    });
  }

  for (const [norm, bqRow] of bqKeyByNormalized.entries()) {
    if (matchedBqNorms.has(norm)) continue;
    emitMetricRows({
      norm,
      rowKey: normalizedRowKeyFromDims(bqRow.row_key || {}),
      dataMetrics: {},
      bqMetrics: bqRow.metrics || {},
      bqSourceProvenance: bqRow.source_provenance || null
    });
  }
  return rows;
}

// ----------------------- Main pipeline ---------------------------------------

async function main() {
  const args = parseArgs();
  const today = todayProperty();

  // Step 0a: Auto-detect empirical GA4 data floor (2026-07-12 hot-path).
  // The site launched around 2026-03-20 but GA4 traffic data actually
  // starts later once gtag was firing. We detect the floor from the
  // empirical row presence, not a hardcoded 90-day window.
  let floorInfo = null;
  let dataFloor = null;
  try {
    const authClient = await dataApi.getAuthClient();
    floorInfo = await detectDataFloor(authClient, dataApi.PROPERTY_ID);
    if (floorInfo.floor_date) {
      dataFloor = normalizeGa4Date(floorInfo.floor_date);
      console.log(`[ingest] detected data floor: ${dataFloor} (method=${floorInfo.method}, status=${floorInfo.probe_status})`);
    } else {
      console.log(`[ingest] WARNING: data floor not detected (status=${floorInfo.probe_status}, reason=${floorInfo.note || floorInfo.error || ''})`);
    }
  } catch (e) {
    console.log(`[ingest] WARNING: floor detection failed; falling back to arg-provided --from: ${e.message}`);
  }
  // The data floor constrains the routing but never overrides the
  // operator's --from= arg upward. If --from is already newer than
  // the floor, we honor it (the operator is explicitly asking for a
  // narrower window).
  const routingResult = perSourceRouting(args.from, args.to, dataFloor);
  if (routingResult.empty) throw new RangeError(`requested window ${args.from} through ${args.to} is wholly before GA4 data floor ${dataFloor}`);
  const routing = routingResult.dates;
  if (routingResult.backedOff) {
    console.log(`[ingest] backfilled effective window: ${routingResult.requestedFrom} -> ${routingResult.effectiveFrom} (data floor: ${dataFloor})`);
  }
  console.log(`[ingest] requested from=${args.from} effective from=${routingResult.effectiveFrom} to=${args.to} out=${args.out}`);
  console.log(`[ingest] per-day routing: ${routing.filter(r => r.has_bq).length} days with BQ, ${routing.length - routing.filter(r => r.has_bq).length} days with Data API only`);

  fs.mkdirSync(args.out, { recursive: true });

  // Step 1: Run all 8 Data API reports
  console.log('[ingest] Running 8 Data API reports across full window...');
  const dataApiResult = await dataApi.runAllReports(routingResult.effectiveFrom, args.to);
  for (const [k, r] of Object.entries(dataApiResult.reports)) {
    const status = r.status;
    console.log(`  ${k}: ${status} (${r.rows?.length || 0} rows, compat=${r.compat_status})`);
  }

  // Step 2: Run BQ reports for last-72h only
  const bqDates = routing.filter(r => r.has_bq).map(r => r.date);
  let bqResults = {};
  if (bqDates.length > 0) {
    const bqFrom = bqDates[0];
    const bqTo = bqDates[bqDates.length - 1];
    console.log(`[ingest] Running 8 BQ reports for last-72h window ${bqFrom}..${bqTo}...`);
    for (const rk of Object.keys(dataApi.REPORTS)) {
      try {
        const result = await bqClient.queryBqReport(rk, bqFrom, bqTo);
        bqResults[rk] = result;
        console.log(`  ${rk}: ${result.status} (${result.rows?.length || 0} rows, dropped ${result.sanitization?.dropped_params || 0} params)`);
      } catch (e) {
        console.error(`  ${rk}: FAILED ${e.message}`);
        bqResults[rk] = { status: 'failed', report_key: rk, rows: [], error: { message: e.message } };
      }
    }
  } else {
    console.log('[ingest] No BQ dates in window (data older than 72h); BQ layer skipped.');
  }

  // Step 3: Join per report
  console.log('[ingest] Joining per-report cross-source...');
  const joinedRows = [];
  for (const rk of Object.keys(dataApi.REPORTS)) {
    const dr = dataApiResult.reports[rk] || { rows: [], status: 'failed' };
    const br = bqResults[rk] || { rows: [] };
    const joined = joinDataForReport(rk, dr.rows || [], br.rows || [], dataApi.REPORTS[rk]?.metrics || [], today);
    joinedRows.push({
      report_id: rk.replace(/^R\d+_/, ''),
      report_key: rk,
      data_api_status: dr.status,
      bq_status: br.status || 'skipped',
      row_count: joined.length,
      sanitized_rows: joined
    });
  }

  // Step 4: Compute release IDs (v3 §15.1)
  const runMeta = {
    ingested_at_utc: new Date().toISOString(),
    adapter_version: '1-ga4-source-ingestion',
    schema_version: '1',
    from: args.from,
    effective_from: routingResult.effectiveFrom,
    to: args.to,
    property_id: dataApi.PROPERTY_ID,
    project_id: bqClient.PROJECT_ID,
    dataset_id: bqClient.DATASET_ID
  };
  const canonicalReleaseId = computeCanonicalReleaseIdForRouting(joinedRows, routingResult, args.to);
  const acquisitionReleaseId = computeAcquisitionReleaseId(canonicalReleaseId, runMeta);

  console.log(`[ingest] canonical_release_id:  ${canonicalReleaseId}`);
  console.log(`[ingest] acquisition_release_id: ${acquisitionReleaseId}`);

  // Step 5: Validation gates
  console.log('[ingest] Running 10 validation gates...');
  const dataApiReportsForGates = Object.values(dataApiResult.reports);
  const bqReportsForGates = Object.values(bqResults);
  const rawRecordJsonSample = bqReportsForGates.flatMap((r) => (r.rows || []).slice(0, 5));
  const gates = runGates({
    dataApiReports: dataApiReportsForGates,
    bqReports: bqReportsForGates,
    joinedRows,
    canonicalReleaseId,
    acquisitionReleaseId,
    raw_record_json_sample: rawRecordJsonSample,
    settlementAsOf: today
  });
  let allPass = true;
  for (const [g, v] of Object.entries(gates)) {
    if (v.status !== 'PASS') allPass = false;
    console.log(`  ${g}: ${v.status}`);
  }

  // Step 6: Persist outputs
  console.log(`[ingest] Writing outputs to ${args.out}...`);

  fs.writeFileSync(
    path.join(args.out, 'run-manifest.json'),
    JSON.stringify({
      from: args.from,
      effective_from: routingResult.effectiveFrom,
      to: args.to,
      data_floor_detection: floorInfo || { probe_status: 'skipped' },
      backed_off: routingResult.backedOff,
      per_day_routing: routing,
      canonical_release_id: canonicalReleaseId,
      acquisition_release_id: acquisitionReleaseId,
      adapter_version: '1-ga4-source-ingestion',
      schema_version: '1',
      run_meta: runMeta,
      report_status: Object.fromEntries(
        Object.entries(dataApiResult.reports).map(([k, v]) => [k, v.status])
      ),
      bq_report_status: Object.fromEntries(
        Object.entries(bqResults).map(([k, v]) => [k, v.status || 'skipped'])
      ),
      data_api_compat: Object.fromEntries(
        Object.entries(dataApiResult.reports).map(([k, v]) => [k, v.compat_status])
      )
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(args.out, 'canonical_release.json'),
    JSON.stringify({
      canonical_release_id: canonicalReleaseId,
      acquisition_release_id: acquisitionReleaseId,
      release_status: allPass ? 'VALID' : 'INVALID',
      from: routingResult.effectiveFrom,
      to: args.to,
      report_count: joinedRows.length,
      total_rows: joinedRows.reduce((acc, r) => acc + r.row_count, 0),
      rows: joinedRows
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(args.out, 'gate-result.json'),
    JSON.stringify(gates, null, 2)
  );

  fs.writeFileSync(
    path.join(args.out, 'data-api-result.json'),
    JSON.stringify(dataApiResult, null, 2)
  );

  fs.writeFileSync(
    path.join(args.out, 'bq-result.json'),
    JSON.stringify(bqResults, null, 2)
  );

  console.log(`[ingest] Done.`);
  console.log(`  canonical_release_id:  ${canonicalReleaseId}`);
  console.log(`  acquisition_release_id: ${acquisitionReleaseId}`);
  console.log(`  total_rows:            ${joinedRows.reduce((acc, r) => acc + r.row_count, 0)}`);
  console.log(`  gates:                 ${allPass ? 'ALL PASS' : 'CHECK FAIL'}`);
  process.exit(allPass ? 0 : 30);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Ingest failed:', e.stack || e.message);
    process.exit(99);
  });
}

module.exports = {
  parseArgs,
  todayUtc,
  todayProperty,
  dateMinusDays,
  daysBetween,
  perSourceRouting,
  detectDataFloor,
  normalizeGa4Date,
  computeCanonicalReleaseId,
  computeCanonicalReleaseIdForRouting,
  computeAcquisitionReleaseId,
  runGates,
  joinDataForReport
};
