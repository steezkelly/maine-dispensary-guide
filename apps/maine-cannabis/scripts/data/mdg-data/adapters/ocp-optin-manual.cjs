'use strict';
const fs = require('fs');
const path = require('path');
const ocpLic = require('./ocp-licenses.cjs');
const sales = require('./ocp-retail-sales-manual.cjs');  // reuse discover/profile pattern
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-optin-manual.cjs
 *
 * Ticket 010 — manual CSV ingest path for OCP opt-in communities.
 *
 * Same pattern as ocp-retail-sales-manual.cjs but for the opt-in
 * dashboard. Expected manual artifact filename:
 *   optin_by_municipality.csv
 * Columns: operator-dependent (the Power BI export shape).
 *
 * Tier 1 gate: until the operator confirms which activity category
 * maps to "adult-use store/retail", the normalized observations
 * stay in a quarantine dataset and the retail-optin-gap product
 * remains blocked with SOURCE_SEMANTICS_UNAPPROVED.
 */

const TAB = { slug: 'optin_by_municipality', label: 'Opt-in Communities' };

function discoverManualArtifacts(rootDir) {
    const base = path.join(rootDir, 'raw', 'ocp_optin', 'manual');
    if (!fs.existsSync(base)) return [];
    const out = [];
    for (const yyyy of fs.readdirSync(base).sort().reverse()) {
        for (const mm of fs.readdirSync(path.join(base, yyyy)).sort().reverse()) {
            for (const dd of fs.readdirSync(path.join(base, yyyy, mm)).sort().reverse()) {
                const dayDir = path.join(base, yyyy, mm, dd);
                for (const f of fs.readdirSync(dayDir)) {
                    if (!f.endsWith('.csv')) continue;
                    const tab = f.startsWith(TAB.slug) ? TAB : { slug: 'unknown', label: 'Unknown tab' };
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

function profileCsv(csvPath) {
    const text = fs.readFileSync(csvPath, 'utf8');
    const parsed = ocpLic.parseCsv(text);
    const colProfiles = {};
    for (const h of parsed.headers) {
        let nonNull = 0, intLike = 0, boolLike = 0;
        const uniq = new Set();
        for (const r of parsed.rows) {
            const v = r[h];
            if (v === null || v === undefined || v === '') continue;
            nonNull++;
            uniq.add(v);
            if (/^-?\d+(\.\d+)?$/.test(String(v).trim())) intLike++;
            if (/^(true|false|yes|no|allowed|not allowed)$/i.test(String(v).trim())) boolLike++;
        }
        colProfiles[h] = {
            non_null: nonNull,
            null_count: parsed.rows.length - nonNull,
            distinct: uniq.size,
            int_like: intLike,
            bool_like: boolLike,
            sample_values: Array.from(uniq).slice(0, 5)
        };
    }
    return {
        headers: parsed.headers,
        row_count: parsed.rows.length,
        sample_rows: parsed.rows.slice(0, 3),
        column_profiles: colProfiles
    };
}

function run(rootDir) {
    const artifacts = discoverManualArtifacts(rootDir);
    if (!artifacts.length) {
        return { artifacts: [], note: 'no manual artifacts found; ' +
            'drop CSVs into $MDG_DATA_ROOT/raw/ocp_optin/manual/{yyyy}/{mm}/{dd}/' };
    }
    const out = [];
    for (const a of artifacts) {
        const body = fs.readFileSync(a.file_path);
        const sha = store.sha256(body);
        const wrote = store.writeRawArtifact(rootDir, 'ocp_optin',
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

module.exports = { run, discoverManualArtifacts, profileCsv, TAB };