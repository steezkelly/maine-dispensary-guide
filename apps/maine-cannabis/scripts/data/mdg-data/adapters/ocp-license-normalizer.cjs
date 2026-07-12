'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ocpLic = require('./ocp-licenses.cjs');
const xw = require('../lib/crosswalk.cjs');

/**
 * adapters/ocp-license-normalizer.cjs
 *
 * Ticket 006 — License Normalizer and Retail Identity Approval.
 *
 * Inputs:
 *   rawCsvPath:    absolute path to the OCP raw CSV (Ticket 003)
 *   crosswalk:     loaded crosswalk object (Ticket 005)
 *
 * Outputs (DATA-MODEL.md §License snapshots):
 *   license_snapshot: {
 *     snapshot_id, source_sha256, source_as_of (null for OCP — see
 *     §Time semantics below), fetched_at_utc
 *   }
 *   license_record[]: {
 *     snapshot_id, source_row_ordinal, source_row_hash,
 *     identity_key, license_number,
 *     license_status_raw, license_status_norm,
 *     license_type_raw, license_type_norm,
 *     legal_name, dba_name,
 *     host_municipality_raw, normalized_municipality, geoid,
 *     unmatched_municipality (bool),
 *     issue_date, expiration_date,
 *     raw_record_json
 *   }
 *
 * Approved retail identity rule (Ticket 006, deviation
 * DEVIATION-20260711-retail-identity-rule):
 *
 *   identity_key = LICENSE
 *     — when LICENSE is non-null.
 *
 *   identity_key = sha256(LICENSE_TYPE + "|" + DBA + "|" + LICENSE_CITY)[0:16]
 *     — when LICENSE is null (rare; OCP records that have a license
 *     type and host city but no license number).
 *
 * Why LICENSE alone:
 *
 *   The OCP CSV is denormalized: one row per (license, owner) pair.
 *   The same establishment appears multiple times under the same
 *   LICENSE with different BUSINESS_ENTITY_MEMBER values. The
 *   establishment identity is LICENSE; the redundant rows must
 *   collapse. See DEVIATION-20260711 for evidence and rationale.
 *
 * Time semantics (DATA-MODEL.md §Time):
 *
 *   `source_as_of` for the OCP license CSV is null because OCP does
 *   not publish a per-row "as of" date. The CSV is a snapshot in
 *   time at monthly granularity. We carry `fetched_at_utc` and the
 *   page-level "last updated" string in metadata. Public copy must
 *   say "data as of <fetched_at_utc>" — not "as of <license issue
 *   date>".
 */

function canonicalIdentityKey(rec) {
    if (rec.license_number && rec.license_number.trim()) {
        return rec.license_number.trim();
    }
    const parts = [
        rec.license_type_raw || '',
        (rec.dba_name || '').toLowerCase().trim(),
        (rec.host_municipality_raw || '').toLowerCase().trim()
    ];
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}


/**
 * Extract the OCP source snapshot date from the canonical filename
 * pattern (e.g. ..._2026_06_01.csv -> '2026-06-01'). Returns null
 * if the filename doesn't match the pattern; callers must treat
 * null as "unknown source date, do not publish as_of".
 */
function extractSnapshotDate(filename) {
    const m = /_(\d{4})_(\d{2})_(\d{2})\.csv$/.exec(filename);
    if (!m) return null;
    return m[1] + '-' + m[2] + '-' + m[3];
}

function sourceRowHash(rec) {
    return crypto.createHash('sha256').update(JSON.stringify(rec)).digest('hex');
}

function normStatus(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    if (s === 'active') return 'active';
    if (s === 'conditional, jurisdiction approved') return 'conditional_jurisdiction_approved';
    if (s === 'conditional') return 'conditional';
    if (s === 'pending conditional') return 'pending_conditional';
    return s.replace(/\s+/g, '_');
}

function normType(raw) {
    if (!raw) return null;
    const t = String(raw).trim().toLowerCase();
    if (t === 'store') return 'cannabis_store';
    return t.replace(/,/g, '').replace(/\s+/g, '_');
}

/**
 * Normalize the raw OCP CSV into the canonical DATA-MODEL records.
 *
 * Returns:
 *   { snapshot, records, profile }
 *
 * profile fields:
 *   - total_rows
 *   - license_number null/uniqueness
 *   - identity_uniqueness (within snapshot using approved key)
 *   - distinct_identities_in_active_store_universe
 *   - active_store_geoid_count
 *   - unmatched_municipality_count
 *   - unmatched_municipality_sample
 *   - identity_collisions (should be 0)
 */
function normalize(rawCsvPath, crosswalk, snapshotMeta) {
    const csv = fs.readFileSync(rawCsvPath, 'utf8');
    const parsed = ocpLic.parseCsv(csv);
    const sourceSha = crypto.createHash('sha256').update(csv).digest('hex');
    // Per ChatGPT review 2026-07-12: snapshot_id must be deterministic
    // from the source content + schema, not from a filesystem path that
    // would change between two runs at different paths.
    const snapshotId = 'snap-' + crypto.createHash('sha256')
        .update('ocp_licenses' + '|' + sourceSha + '|schema_version=1').digest('hex').slice(0, 16);
    const records = [];
    let activeStoreCount = 0;
    const activeIdentityKeys = new Set();
    const activeMunis = new Set();
    let unmatchedCount = 0;
    const unmatchedSample = [];
    const seenIdentityKeys = new Map(); // identity_key -> raw row count
    let licenseNumNull = 0;
    const licNumUniq = new Set();

    for (let i = 0; i < parsed.rows.length; i++) {
        const raw = parsed.rows[i];
        const ord = i + 1;
        const rec = {
            snapshot_id: snapshotId,
            source_row_ordinal: ord,
            license_number: (raw.LICENSE || '').trim() || null,
            license_status_raw: raw.LICENSE_STATUS || null,
            license_status_norm: normStatus(raw.LICENSE_STATUS),
            license_type_raw: raw.LICENSE_TYPE || null,
            license_type_norm: normType(raw.LICENSE_TYPE),
            legal_name: raw.LICENSE_NAME || null,
            dba_name: raw.DBA || null,
            host_municipality_raw: raw.LICENSE_CITY || null,
            issue_date: raw.LICENSE_ISSUE_DATE || null,
            expiration_date: raw.LICENSE_EXPIRATION_DATE || null,
            raw_record_json: raw
        };
        const x = xw.resolve(crosswalk, raw.LICENSE_CITY);
        rec.geoid = x.geoid;
        rec.normalized_municipality = x.normalized_value;
        rec.unmatched_municipality = (x.unmatched === true);
        if (rec.unmatched_municipality) {
            unmatchedCount++;
            if (unmatchedSample.length < 10) {
                unmatchedSample.push({
                    source_value: raw.LICENSE_CITY,
                    license_number: rec.license_number,
                    license_status: rec.license_status_raw,
                    license_type: rec.license_type_raw
                });
            }
        }
        rec.identity_key = canonicalIdentityKey(rec);
        rec.source_row_hash = sourceRowHash(raw);
        // Collision check: the same identity_key appears in
        // multiple raw rows. This is EXPECTED for OCP because
        // the CSV is denormalized (one row per owner). We do
        // NOT count these as collisions; we just record the
        // total raw-row-to-identity mapping.
        if (seenIdentityKeys.has(rec.identity_key)) {
            seenIdentityKeys.set(rec.identity_key, seenIdentityKeys.get(rec.identity_key) + 1);
        } else {
            seenIdentityKeys.set(rec.identity_key, 1);
        }
        if (rec.license_number) {
            licNumUniq.add(rec.license_number);
        } else {
            licenseNumNull++;
        }
        // Active-store universe metrics
        if (rec.license_status_norm === 'active'
            && rec.license_type_norm === 'cannabis_store') {
            activeStoreCount++;
            activeIdentityKeys.add(rec.identity_key);
            if (rec.geoid) activeMunis.add(rec.geoid);
        }
        records.push(rec);
    }

    // Sort records by identity_key for determinism
    records.sort((a, b) => (a.identity_key < b.identity_key ? -1
        : a.identity_key > b.identity_key ? 1 : 0));

    const snapshot = {
        snapshot_id: snapshotId,
        source_sha256: crypto.createHash('sha256').update(csv).digest('hex'),
        // Per ChatGPT review 2026-07-12: OCP source files encode
        // a snapshot date in the filename (e.g. ..._2026_06_01.csv).
        // Extract that as source_snapshot_date and preserve the
        // page-level last-modified separately. We retain the
        // legacy source_as_of field as null (OCP does not expose a
        // per-row as-of) and use source_snapshot_date as the
        // authoritative data-as-of for public copy. This is a
        // Tier-2 deviation: source_snapshot_date is the file-level
        // publication date, not a per-row observation timestamp.
        source_as_of: null,
        source_snapshot_date: extractSnapshotDate(path.basename(rawCsvPath)),
        source_filename: path.basename(rawCsvPath),
        fetched_at_utc: snapshotMeta && snapshotMeta.fetched_at_utc
            ? snapshotMeta.fetched_at_utc : new Date().toISOString(),
        adapter_version: '1',
        schema_version: 1
    };

    const profile = {
        total_rows: records.length,
        license_number: {
            null_count: licenseNumNull,
            null_rate: records.length ? licenseNumNull / records.length : null,
            distinct: licNumUniq.size
        },
        identity_uniqueness: {
            unique_identity_keys: seenIdentityKeys.size,
            total_rows: records.length,
            uniqueness_rate: records.length ? seenIdentityKeys.size / records.length : null,
            // Each key's raw-row count. For OCP this is >= 1
            // because the CSV is denormalized. A row count > 1
            // for the same identity_key is expected.
            identity_key_raw_row_counts: Array.from(seenIdentityKeys.values())
        },
        active_store_row_count: activeStoreCount,
        distinct_active_store_identities: activeIdentityKeys.size,
        active_store_geoid_count: activeMunis.size,
        unmatched_municipality_count: unmatchedCount,
        unmatched_municipality_sample: unmatchedSample
    };

    return { snapshot, records, profile };
}

module.exports = {
    normalize,
    canonicalIdentityKey,
    sourceRowHash,
    normStatus,
    normType
};