'use strict';
const fs = require('fs');
const path = require('path');
const ocpLic = require('./ocp-licenses.cjs');  // for parseCsv
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-manual-normalize.cjs
 *
 * Normalize the operator's manual CSV exports for OCP retail sales
 * and opt-in communities into DATA-MODEL.md shape.
 *
 * The schema is whatever the operator's Power BI export produced.
 * We don't infer column meanings — we preserve them as the raw
 * observed shape. A future commit can name columns once the operator
 * has confirmed what Power BI exports.
 *
 * Per DATA-MODEL.md:
 *   sales_observation: { snapshot_id, reporting_period, metric_raw,
 *     metric_norm, product_category_raw, product_category_norm,
 *     value, unit, preliminary, raw_record_json }
 *   optin_record: { snapshot_id, source_row_ordinal,
 *     municipality_raw, geoid, activity_raw, activity_norm,
 *     allowed, raw_record_json }
 *
 * For Sprint 1 the schema is intentionally permissive: we preserve
 * every column from the manual export in raw_record_json and emit
 * minimal canonical fields. The unit / category / metric semantics
 * require the operator to confirm what Power BI exports and to
 * update the schema mapping in this file.
 */

function normalizeManualSales(rawCsvPath, snapshotMeta) {
    const csv = fs.readFileSync(rawCsvPath, 'utf8');
    const parsed = ocpLic.parseCsv(csv);
    const sourceSha = store.sha256(csv);
    const snapshotId = 'snap-' + store.sha256(
        Buffer.from('ocp_retail_sales|' + sourceSha + '|schema_version=1')).slice(0, 16);
    const observations = [];
    let rowOrdinal = 0;
    for (const r of parsed.rows) {
        rowOrdinal++;
        // Find a "month" / "period" column heuristically (first date_like)
        let reportingPeriod = null;
        for (const h of parsed.headers) {
            const v = r[h];
            if (v && /^\d{4}-\d{2}/.test(String(v).trim())) {
                reportingPeriod = String(v).trim();
                break;
            }
            if (v && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(String(v).trim())) {
                reportingPeriod = String(v).trim();
                break;
            }
        }
        // Find a "value" column heuristically: the first int_like column
        // after the period column.
        let value = null;
        let unit = null;
        let sawPeriod = false;
        for (const h of parsed.headers) {
            const v = r[h];
            if (reportingPeriod && v && r[h] === reportingPeriod) { sawPeriod = true; continue; }
            if (sawPeriod && /^-?\d+(\.\d+)?$/.test(String(v || '').trim())) {
                value = Number(v);
                // Unit: try to infer from column header
                const headerLower = h.toLowerCase();
                if (headerLower.includes('$') || headerLower.includes('sales')
                    || headerLower.includes('revenue') || headerLower.includes('price')) {
                    unit = 'USD';
                } else if (headerLower.includes('transaction')) {
                    unit = 'transactions';
                } else if (headerLower.includes('gram')) {
                    unit = 'grams';
                } else {
                    unit = 'count';
                }
                break;
            }
        }
        observations.push({
            snapshot_id: snapshotId,
            reporting_period: reportingPeriod,
            metric_raw: parsed.headers.find(h => h !== reportingPeriod
                && /^-?\d+(\.\d+)?$/.test(String(r[h] || '').trim())) || 'unknown',
            metric_norm: 'metric_needs_review',
            product_category_raw: null,
            product_category_norm: null,
            value: value,
            unit: unit,
            preliminary: true,
            raw_record_json: r
        });
    }
    return {
        snapshot: {
            snapshot_id: snapshotId,
            source_sha256: sourceSha,
            source_as_of: null,
            source_filename: path.basename(rawCsvPath),
            fetched_at_utc: (snapshotMeta && snapshotMeta.fetched_at_utc)
                || new Date().toISOString(),
            adapter_version: '1-manual',
            schema_version: 1,
            origin: 'manual_csv_export'
        },
        observations
    };
}

function normalizeManualOptin(rawCsvPath, snapshotMeta) {
    const csv = fs.readFileSync(rawCsvPath, 'utf8');
    const parsed = ocpLic.parseCsv(csv);
    const sourceSha = store.sha256(csv);
    const snapshotId = 'snap-' + store.sha256(
        Buffer.from('ocp_optin|' + sourceSha + '|schema_version=1')).slice(0, 16);
    const records = [];
    let rowOrdinal = 0;
    for (const r of parsed.rows) {
        rowOrdinal++;
        // Find a "municipality" column
        let municipality = null;
        for (const h of parsed.headers) {
            const v = r[h];
            if (v && /[A-Za-z]/.test(String(v)) && !/^(true|false|yes|no)$/i.test(String(v))) {
                municipality = String(v).trim();
                break;
            }
        }
        // Find boolean / "opt-in" columns. For each non-municipality
        // column, emit a record with the column header as activity_raw
        // and the cell value as allowed.
        for (const h of parsed.headers) {
            if (h.toLowerCase().includes('municipality')) continue;
            if (h.toLowerCase().includes('city')) continue;
            if (h.toLowerCase().includes('town')) continue;
            const v = r[h];
            if (v === null || v === undefined || v === '') continue;
            const vLower = String(v).toLowerCase().trim();
            let allowed = null;
            if (vLower === 'true' || vLower === 'yes' || vLower === 'allowed') allowed = true;
            else if (vLower === 'false' || vLower === 'no' || vLower === 'not allowed') allowed = false;
            if (allowed === null) continue;
            records.push({
                snapshot_id: snapshotId,
                source_row_ordinal: rowOrdinal,
                municipality_raw: municipality,
                geoid: null,  // not resolved by this adapter
                activity_raw: h,
                activity_norm: 'activity_needs_review',
                allowed: allowed,
                raw_record_json: r
            });
        }
    }
    return {
        snapshot: {
            snapshot_id: snapshotId,
            source_sha256: sourceSha,
            source_as_of: null,
            source_filename: path.basename(rawCsvPath),
            fetched_at_utc: (snapshotMeta && snapshotMeta.fetched_at_utc)
                || new Date().toISOString(),
            adapter_version: '1-manual',
            schema_version: 1,
            origin: 'manual_csv_export'
        },
        records
    };
}

module.exports = { normalizeManualSales, normalizeManualOptin };
