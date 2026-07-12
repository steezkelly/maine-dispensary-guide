'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../lib/store.cjs');

/**
 * adpater/ocp-licenses.cjs
 *
 * Ticket 003 — OCP License Adapter: discovery + profile.
 *
 * Responsibilities:
 *   1. Read the archived authoritative page HTML (from store).
 *   2. Discover the current CSV link by anchor title="Adult Use Data csv".
 *      No filename pattern is hard-coded — we look for any
 *      `Adult_Use_Establishments_And_Contacts_<DATE>.csv` link.
 *   3. Fetch the CSV body, store as a new raw artifact.
 *   4. Parse and emit an observed-schema profile:
 *        - headers (raw + cleaned)
 *        - row count
 *        - per-column primitive type profile (string/int/date/null_rate)
 *        - status vocabulary (enum of LICENSE_STATUS values)
 *        - license-type vocabulary (enum of LICENSE_TYPE values)
 *        - license-number null/uniqueness profile
 *        - exact duplicate row profile
 *        - repeated (DBA, CITY) pairs with distinct license numbers
 *        - municipality vocabulary
 *   5. Emit a small source-derived parser fixture (header + a handful
 *      of redacted rows) for use by Ticket 006.
 *
 * No DBA/city identity, no normalized CSV — that's Ticket 006.
 */

const ADULT_USE_CSV_TITLE = 'Adult Use Data csv';

function resolveAbsoluteUrl(basePage, href) {
    if (!href) return null;
    if (/^https?:\/\//i.test(href)) return href;
    const u = new URL(href, basePage);
    return u.toString();
}

/**
 * Discover the CSV URL from an already-archived HTML page buffer.
 * Returns { url, filename, linkText } or null.
 */
function discoverCsvUrl(htmlBuf, pageUrl) {
    const html = htmlBuf.toString('utf8');
    // Match anchors whose title attribute equals "Adult Use Data csv".
    // Capture the href and any visible link text.
    const re = /<a\b[^>]*\bhref="([^"]+\.csv)"[^>]*\btitle="Adult Use Data csv"[^>]*>([\s\S]*?)<\/a>/i;
    const m = re.exec(html);
    if (!m) return null;
    const href = m[1].replace(/&amp;/g, '&');
    const url = resolveAbsoluteUrl(pageUrl, href);
    const filename = path.posix.basename(new URL(url).pathname);
    // Strip tags from link text
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    return { url, filename, linkText: text || null };
}

/**
 * Parse a CSV string. Returns { headers, rows }.
 * Handles RFC-4180 quoting. Does not assume any specific column order.
 */
function parseCsv(text) {
    const out = [];
    let row = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else { inQ = false; }
            } else {
                cur += c;
            }
        } else {
            if (c === '"') { inQ = true; }
            else if (c === ',') { row.push(cur); cur = ''; }
            else if (c === '\n') {
                row.push(cur); cur = '';
                out.push(row); row = [];
            } else if (c === '\r') {
                // ignore (LF will end the row)
            } else {
                cur += c;
            }
        }
    }
    if (cur !== '' || row.length) { row.push(cur); out.push(row); }
    if (out.length && out[out.length - 1].length === 1 && out[out.length - 1][0] === '') {
        out.pop();
    }
    const headers = out.shift();
    const rows = out.map(arr => {
        const obj = {};
        for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = arr[i] === undefined ? null : arr[i];
        }
        return obj;
    });
    return { headers, rows };
}

/**
 * Profile a parsed OCP license CSV. Returns a profile JSON object.
 */
function profile(rows, headers) {
    const totalRows = rows.length;
    const colStats = {};
    for (const h of headers) {
        let nonNull = 0, intish = 0, dateish = 0;
        const uniq = new Set();
        for (const r of rows) {
            const v = r[h];
            if (v === null || v === undefined || v === '') continue;
            nonNull++;
            uniq.add(v);
            if (/^-?\d+$/.test(String(v).trim())) intish++;
            // crude date: 30-JUL-25, 2026-07-08, etc.
            if (/^\d{1,2}-[A-Z]{3}-\d{2}$/.test(String(v).trim())
                || /^\d{4}-\d{2}-\d{2}$/.test(String(v).trim())) dateish++;
        }
        colStats[h] = {
            non_null: nonNull,
            null_count: totalRows - nonNull,
            null_rate: totalRows ? (totalRows - nonNull) / totalRows : null,
            distinct: uniq.size,
            int_like: intish,
            date_like: dateish
        };
    }

    const status = new Set();
    const licType = new Set();
    const city = new Set();
    const licNum = new Set();
    let licNumNull = 0;
    for (const r of rows) {
        if (r.LICENSE_STATUS) status.add(r.LICENSE_STATUS);
        if (r.LICENSE_TYPE) licType.add(r.LICENSE_TYPE);
        if (r.LICENSE_CITY) city.add(r.LICENSE_CITY);
        if (r.LICENSE === null || r.LICENSE === undefined || r.LICENSE === '') {
            licNumNull++;
        } else {
            licNum.add(r.LICENSE);
        }
    }

    // Exact duplicate rows: serialize the row deterministically (sort keys).
    const sortedKey = (r) => JSON.stringify(
        Object.keys(r).sort().reduce((acc, k) => { acc[k] = r[k]; return acc; }, {})
    );
    const seen = new Map();
    let exactDupRows = 0;
    let exactDupGroups = 0;
    for (const r of rows) {
        const k = sortedKey(r);
        const c = (seen.get(k) || 0) + 1;
        seen.set(k, c);
    }
    for (const v of seen.values()) {
        if (v > 1) exactDupGroups++;
        exactDupRows += Math.max(0, v - 1);
    }

    // Repeated (DBA, CITY) pairs with distinct LICENSE numbers.
    const pairMap = new Map(); // "DBA\tCITY" -> Set(LICENSE)
    for (const r of rows) {
        const dba = (r.DBA || '').toLowerCase().trim();
        const city = (r.LICENSE_CITY || '').toLowerCase().trim();
        if (!dba || !city) continue;
        const k = dba + '\t' + city;
        let set = pairMap.get(k);
        if (!set) { set = new Set(); pairMap.set(k, set); }
        if (r.LICENSE) set.add(r.LICENSE);
    }
    const repeatedPairsWithDistinctLicenses = [];
    for (const [k, set] of pairMap) {
        if (set.size > 1) {
            const [dba, city] = k.split('\t');
            repeatedPairsWithDistinctLicenses.push({
                dba_normalized: dba,
                city_normalized: city,
                distinct_license_count: set.size,
                sample_licenses: Array.from(set).slice(0, 5)
            });
        }
    }

    return {
        total_rows: totalRows,
        column_stats: colStats,
        license_status_vocabulary: Array.from(status).sort(),
        license_type_vocabulary: Array.from(licType).sort(),
        municipality_vocabulary_size: city.size,
        municipality_vocabulary_sample: Array.from(city).sort().slice(0, 50),
        license_number: {
            null_count: licNumNull,
            null_rate: totalRows ? licNumNull / totalRows : null,
            distinct: licNum.size,
            unique_among_non_null: totalRows - licNumNull === licNum.size
        },
        exact_duplicate_rows: {
            duplicate_row_count: exactDupRows,
            groups_with_duplicates: exactDupGroups
        },
        repeated_dba_city_with_distinct_license_numbers: {
            count: repeatedPairsWithDistinctLicenses.length,
            sample: repeatedPairsWithDistinctLicenses.slice(0, 20)
        }
    };
}

/**
 * Build a small source-derived fixture: header + 5 redacted sample rows.
 * Drops principal/owner columns to keep the fixture small and PII-light.
 */
function buildFixture(rows, headers) {
    const dropCols = new Set([
        'PRIMARY_LICENSE_CONTACT',
        'PRIMARY_CONTACT_NUMBER',
        'PRIMARY_CONTACT_EMAIL',
        'BUSINESS_ENTITY_MEMBER',
        'BUSINESS_ENTITY_ROLE',
        'BUSINESS_ENTITY_ROLE_DESCRIPTION',
        'BUSINESS_ENTITY_MEMBER_CITY',
        'LICENSE_WEBSITE',
        'LICENSE_ADDRESS'
    ]);
    const keptHeaders = headers.filter(h => !dropCols.has(h));
    // Pick a deterministic sample: 2 Active + 1 non-Active + 1 non-Store + 1 duplicate if any.
    const sample = [];
    const push = (r) => {
        const out = {};
        for (const h of keptHeaders) out[h] = r[h] === undefined ? null : r[h];
        sample.push(out);
    };
    const activeStore = rows.find(r => r.LICENSE_STATUS === 'Active' && r.LICENSE_TYPE === 'Store');
    if (activeStore) push(activeStore);
    const nonActive = rows.find(r => r.LICENSE_STATUS && r.LICENSE_STATUS !== 'Active');
    if (nonActive) push(nonActive);
    const nonStore = rows.find(r => r.LICENSE_TYPE && r.LICENSE_TYPE !== 'Store');
    if (nonStore) push(nonStore);
    if (sample.length < 5) {
        for (const r of rows) {
            if (sample.length >= 5) break;
            push(r);
        }
    }
    // One row from a (DBA, CITY) pair with distinct license numbers (if any).
    const dupPair = rows.find(r => r.DBA && r.LICENSE_CITY && r.LICENSE);
    if (dupPair && sample.length < 5) push(dupPair);
    return {
        kept_headers: keptHeaders,
        dropped_columns: Array.from(dropCols).sort(),
        sample_rows: sample
    };
}

/**
 * Discover + fetch + profile for `ocp_licenses`.
 *
 * Inputs:
 *   pageHtmlBuf: buffer of the archived authoritative HTML page
 *   pageUrl:     the URL the page came from (for resolving relative links)
 *   rootDir:     $MDG_DATA_ROOT
 *
 * Returns: { profile, fixture, rawPath, sha256, csvFilename, csvUrl }
 */
async function run(pageHtmlBuf, pageUrl, rootDir) {
    const disc = discoverCsvUrl(pageHtmlBuf, pageUrl);
    if (!disc) {
        const err = new Error('OCP license page did not link to an Adult Use CSV');
        err.code = 'CSV_LINK_NOT_FOUND';
        throw err;
    }

    // Fetch the CSV
    const r = await store.httpGet(disc.url, { accept: 'text/csv,*/*' });
    if (r.status < 200 || r.status >= 300) {
        const err = new Error('CSV fetch HTTP ' + r.status);
        err.code = 'CSV_HTTP_ERROR';
        err.httpStatus = r.status;
        throw err;
    }
    const sha = store.sha256(r.body);
    const wrote = store.writeRawArtifact(rootDir, 'ocp_licenses',
        new Date().toISOString(), r.body, disc.filename);

    const parsed = parseCsv(r.body.toString('utf8'));
    const profileJson = profile(parsed.rows, parsed.headers);
    const fixture = buildFixture(parsed.rows, parsed.headers);

    return {
        csv_url: disc.url,
        csv_filename: disc.filename,
        raw_path: wrote.path,
        raw_sha256: sha,
        profile: profileJson,
        fixture
    };
}

module.exports = {
    discoverCsvUrl,
    parseCsv,
    profile,
    buildFixture,
    run,
    ADULT_USE_CSV_TITLE
};