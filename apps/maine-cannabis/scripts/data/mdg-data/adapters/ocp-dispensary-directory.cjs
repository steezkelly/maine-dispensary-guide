'use strict';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-dispensary-directory.cjs
 *
 * Reads the OCP license-CSV-derived dispensary directory
 * ($MDG_DATA_ROOT/raw/ocp_dispensaries_firecrawl/*.json) and
 * produces a normalized dispensary record per active-store license.
 *
 * Inputs (per file):
 *   [{license, business_name, dba, license_category, license_type,
 *     license_status, address, city, county, state, website,
 *     contact_email, contact_phone, issue_date, first_issue_date}, ...]
 *
 * Outputs (normalized, DATA-MODEL.md dispensary shape):
 *   { source_id, snapshot_id, dispensaries: [{...}] }
 *
 * Schema mapping (OCP column -> canonical field):
 *   LICENSE_NAME -> legal_name
 *   DBA -> dba
 *   LICENSE -> license_id
 *   LICENSE_TYPE -> license_type_raw
 *   LICENSE_STATUS -> license_status_raw
 *   LICENSE_ADDRESS -> street_address_raw
 *   LICENSE_CITY -> city_raw
 *   LICENSE_COUNTY -> county_raw
 *   LICENSE_STATE -> state
 *   LICENSE_WEBSITE -> website_raw
 *   PRIMARY_CONTACT_EMAIL -> contact_email
 *   PRIMARY_CONTACT_NUMBER -> contact_phone
 *   LICENSE_ISSUE_DATE -> issue_date
 *   LICENSE_FIRST_ISSUE_DATE -> first_issue_date
 */

const OCMA = require('./ocp-license-normalizer.cjs').OCMA || null;

/**
 * Discover JSON files under raw/ocp_dispensaries_firecrawl/
 * Returns [{file_path, source_id, fetched_at}] sorted by mtime desc.
 */
function discoverArtifacts(rootDir) {
    const dir = path.join(rootDir, 'raw', 'ocp_dispensaries_firecrawl');
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        // Skip findall-run results (they have a different schema)
        if (f.startsWith('findall-')) {
            out.push({
                file_path: full,
                filename: f,
                artifact_kind: 'findall_results',
                mtime: stat.mtimeMs
            });
        } else {
            out.push({
                file_path: full,
                filename: f,
                artifact_kind: 'ocp_csv_enumeration',
                mtime: stat.mtimeMs
            });
        }
    }
    return out.sort((a, b) => b.mtime - a.mtime);
}

/**
 * Read an OCP CSV enumeration JSON file and return normalized records.
 * Each record is the canonical dispensary shape.
 */
function readOcpEnumeration(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(raw)) {
        return { dispensaries: [], note: 'expected array, got ' + typeof raw };
    }
    const dispensaries = raw.map(d => normalizeOcpRecord(d));
    return { dispensaries, source_kind: 'ocp_csv_enumeration' };
}

function normalizeOcpRecord(d) {
    return {
        license_id: d.license || '',
        legal_name: d.business_name || '',
        dba: d.dba || '',
        license_type_raw: d.license_type || '',
        license_category: d.license_category || '',
        license_status: d.license_status || '',
        street_address_raw: d.address || '',
        city_raw: d.city || '',
        county_raw: d.county || '',
        state: d.state || 'ME',
        website_raw: d.website || '',
        contact_email: d.contact_email || '',
        contact_phone: d.contact_phone || '',
        issue_date: d.issue_date || '',
        first_issue_date: d.first_issue_date || '',
        // Provisional booleans surfaced so downstream consumers know
        // which fields still need review.
        geoid_provisional: null,  // populated by derive via crosswalk
        price_capture_status: 'not_attempted'
    };
}

/**
 * Findall result files have a different schema:
 *   { findall_id, status, candidates: [{name, url, description, ...}] }
 * We extract name+url+description for each candidate and surface them
 * as parallel-discovery records (not authoritative dispensary data).
 */
function readFindallResults(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
    return {
        candidates: candidates.map(c => ({
            name: c.name || '',
            url: c.url || '',
            description: c.description || '',
            match_status: c.match_status || null
        })),
        source_kind: 'findall_results',
        findall_id: raw.findall_id || ''
    };
}

/**
 * Top-level: discover + normalize all available artifacts.
 * Returns { dispensaries: [...], findall_runs: [...] }.
 */
function run(rootDir) {
    const arts = discoverArtifacts(rootDir);
    if (!arts.length) {
        return {
            dispensaries: [],
            findall_runs: [],
            note: 'no artifacts under raw/ocp_dispensaries_firecrawl/; ' +
                'copy ocp-active-stores-YYYY-MM-DD.json there to seed'
        };
    }
    const dispensaries = [];
    const findall_runs = [];
    for (const a of arts) {
        const body = fs.readFileSync(a.file_path);
        const sha = store.sha256(body);
        // Archive content-addressed (best-effort; do not fail the run)
        try {
            store.writeRawArtifact(rootDir, 'ocp_dispensaries_firecrawl',
                new Date(a.mtime).toISOString(), body, 'firecrawl/' + a.filename);
        } catch (e) {
            // Archive failure is non-fatal — proceed with normalization.
        }
        if (a.artifact_kind === 'ocp_csv_enumeration') {
            const out = readOcpEnumeration(a.file_path);
            for (const d of out.dispensaries) {
                d.raw_record_json = { source_file: a.file_path, raw_sha256: sha };
                dispensaries.push(d);
            }
        } else if (a.artifact_kind === 'findall_results') {
            const out = readFindallResults(a.file_path);
            findall_runs.push({
                file: a.file_path,
                findall_id: out.findall_id,
                candidate_count: out.candidates.length
            });
        }
    }
    return { dispensaries, findall_runs };
}

module.exports = {
    run,
    discoverArtifacts,
    readOcpEnumeration,
    readFindallResults,
    normalizeOcpRecord
};