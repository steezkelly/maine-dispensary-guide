'use strict';
const fs = require('fs');
const path = require('path');
const ocpLic = require('./ocp-licenses.cjs');  // for parseCsv
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-retail-sales-manual.cjs
 *
 * Ticket 009 — manual CSV ingest path for OCP retail sales.
 *
 * Per the operator's explicit override (2026-07-12) and the memory
 * context for the 280E calculator data strategy, the operator
 * manually exports the three Power BI tabs (Sales Revenue, Sales
 * Transactions, Price Per Gram) as CSVs and drops them into
 * $MDG_DATA_ROOT/raw/ocp_retail_sales/manual/{yyyy}/{mm}/{dd}/.
 *
 * This adapter:
 *   1. Discovers manual artifacts under .../manual/...
 *   2. Archives them content-addressed (same as live fetches)
 *   3. Profiles the columns (header detection + value types)
 *   4. Emits a schema-discovery JSON next to the file so a future
 *      parser commit can be reviewed against actual observed schema
 *
 * Path-of-least-friction: the schema is whatever the operator's
 * Power BI export produced. We don't infer or guess.
 */

const TABS = [
    { slug: 'sales_revenue',       label: 'Sales Revenue' },
    { slug: 'sales_transactions',  label: 'Sales Transactions' },
    { slug: 'price_per_gram',      label: 'Price Per Gram' }
];

/**
 * Find manual artifacts. Path layout:
 *   $MDG_DATA_ROOT/raw/ocp_retail_sales/manual/{yyyy}/{mm}/{dd}/*.csv
 * Returns [{tab_slug, file_path, stat}].
 */
function discoverManualArtifacts(rootDir) {
    const base = path.join(rootDir, 'raw', 'ocp_retail_sales', 'manual');
    if (!fs.existsSync(base)) return [];
    const out = [];
    for (const yyyy of fs.readdirSync(base).sort().reverse()) {
        for (const mm of fs.readdirSync(path.join(base, yyyy)).sort().reverse()) {
            for (const dd of fs.readdirSync(path.join(base, yyyy, mm)).sort().reverse()) {
                const dayDir = path.join(base, yyyy, mm, dd);
                for (const f of fs.readdirSync(dayDir)) {
                    if (!f.endsWith('.csv')) continue;
                    // Match tab slug by prefix
                    let tab = TABS.find(t => f.startsWith(t.slug + '.') || f === t.slug + '.csv');
                    if (!tab) tab = { slug: 'unknown', label: 'Unknown tab' };
                    out.push({
                        tab_slug: tab.slug,
                        tab_label: tab.label,
                        filename: f,
                        file_path: path.join(dayDir, f),
                        mtime: fs.statSync(path.join(dayDir, f)).mtimeMs
                    });
                }
            }
        }
    }
    return out;
}

/**
 * Profile a single CSV's schema. Returns:
 *   { headers, row_count, column_profiles: { col: {non_null, distinct, int_like, date_like} } }
 */
function profileCsv(csvPath) {
    const text = fs.readFileSync(csvPath, 'utf8');
    const parsed = ocpLic.parseCsv(text);
    const colProfiles = {};
    for (const h of parsed.headers) {
        let nonNull = 0, intLike = 0, dateLike = 0;
        const uniq = new Set();
        for (const r of parsed.rows) {
            const v = r[h];
            if (v === null || v === undefined || v === '') continue;
            nonNull++;
            uniq.add(v);
            if (/^-?\d+(\.\d+)?$/.test(String(v).trim())) intLike++;
            if (/^\d{4}-\d{2}-\d{2}/.test(String(v).trim())) dateLike++;
        }
        colProfiles[h] = {
            non_null: nonNull,
            null_count: parsed.rows.length - nonNull,
            distinct: uniq.size,
            int_like: intLike,
            date_like: dateLike,
            sample_values: Array.from(uniq).slice(0, 3)
        };
    }
    return {
        headers: parsed.headers,
        row_count: parsed.rows.length,
        sample_rows: parsed.rows.slice(0, 3),
        column_profiles: colProfiles
    };
}

/**
 * Top-level: discover + archive + profile.
 *
 * Returns: { artifacts: [{tab_slug, original_path, raw_path, raw_sha256,
 *                          profile}] }
 */
function run(rootDir) {
    const artifacts = discoverManualArtifacts(rootDir);
    if (!artifacts.length) {
        return { artifacts: [], note: 'no manual artifacts found; ' +
            'drop CSVs into $MDG_DATA_ROOT/raw/ocp_retail_sales/manual/{yyyy}/{mm}/{dd}/' };
    }
    const out = [];
    for (const a of artifacts) {
        const body = fs.readFileSync(a.file_path);
        const sha = store.sha256(body);
        // Archive content-addressed, preserving the original filename
        const wrote = store.writeRawArtifact(rootDir, 'ocp_retail_sales',
            new Date(a.mtime).toISOString(), body, 'manual/' + a.filename);
        const profile = profileCsv(a.file_path);
        out.push({
            tab_slug: a.tab_slug,
            tab_label: a.tab_label,
            original_path: a.file_path,
            raw_path: wrote.path,
            raw_sha256: sha,
            profile
        });
    }
    return { artifacts: out };
}

module.exports = { run, discoverManualArtifacts, profileCsv, TABS };