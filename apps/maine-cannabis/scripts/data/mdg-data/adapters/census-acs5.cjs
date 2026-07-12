'use strict';
const path = require('path');
const store = require('../lib/store.cjs');

/**
 * adapters/census-acs5.cjs
 *
 * Ticket 004 — Census Geography and Population Adapter.
 *
 * Fetches ACS 2024 5-year population (variable B01003_001E) for every
 * Maine county subdivision via the Census API. If CENSUS_API_KEY is
 * not set, falls back to a clearly-labeled deterministic mock fixture
 * under docs/data/mdg-data/fixtures/census_acs5_2024_mock.json. The
 * mock is gated so it cannot silently masquerade as a production
 * release.
 *
 * Outputs:
 *   population_observation rows (DATA-MODEL.md §Population):
 *     { acs_vintage, geoid, variable_id, population_estimate, source_name }
 *   canonical comparison_geography rows (DATA-MODEL.md §Canonical):
 *     { geoid, state_fips, county_fips, cousub_fips, census_name,
 *       display_name, geography_type, acs_vintage, comparison_eligible,
 *       note }
 *
 * ACS GEOID canonical composition (per spec):
 *   state_fips + county_fips + county_subdivision_fips
 *   For Maine: 23 + '001' + '99999' etc.
 *
 * Census returns GEOIDs like "2300199999" (state 23 + county 001 +
 * cousub 99999). Maine county subdivisions are typically 5-digit
 * cousub codes.
 */

const VARIABLE_ID = 'B01003_001E';
const ACS_VINTAGE = 2024;
const STATE_FIPS = '23';
const BASE_URL = 'https://api.census.gov/data/2024/acs/acs5';
const MAINE_COUNTY_SUBDIVISION_FIXTURE = require('../../../../docs/data/mdg-data/fixtures/census_acs5_2024_mock.json');

function buildUrl(apiKey) {
    const u = new URL(BASE_URL);
    u.searchParams.set('get', `NAME,${VARIABLE_ID}`);
    u.searchParams.set('for', 'county subdivision:*');
    u.searchParams.set('in', `state:${STATE_FIPS}`);
    if (apiKey) u.searchParams.set('key', apiKey);
    return u.toString();
}

/**
 * Validate a 10-digit Census GEOID: 2 state + 3 county + 5 cousub.
 */
function isValidGeoid(g) {
    return typeof g === 'string' && /^[0-9]{10}$/.test(g);
}

/**
 * Compose canonical GEOID from component FIPS codes.
 */
function composeGeoid(state, county, cousub) {
    return String(state).padStart(2, '0') + String(county).padStart(3, '0')
        + String(cousub).padStart(5, '0');
}

/**
 * Convert a Census API response (header row + data rows) into
 * normalized rows.
 *
 * Returns:
 *   { rows: [...], diagnostics: {...} }
 *
 * Each row: { geoid, state_fips, county_fips, cousub_fips, census_name,
 *             population_estimate, name_components }
 */
function parseApiResponse(apiJson) {
    if (!Array.isArray(apiJson) || apiJson.length < 2) {
        const err = new Error('Census API response is not [header, ...rows]');
        err.code = 'CENSUS_BAD_SHAPE';
        throw err;
    }
    const header = apiJson[0];
    const idxName = header.indexOf('NAME');
    const idxPop = header.indexOf(VARIABLE_ID);
    const idxState = header.indexOf('state');
    const idxCounty = header.indexOf('county');
    const idxCousub = header.indexOf('county subdivision');
    if (idxName < 0 || idxPop < 0 || idxState < 0
        || idxCounty < 0 || idxCousub < 0) {
        const err = new Error('Census API response missing required columns');
        err.code = 'CENSUS_BAD_SHAPE';
        throw err;
    }
    const out = [];
    const diagnostics = {
        total_rows: apiJson.length - 1,
        null_population: 0,
        negative_population: 0,
        invalid_geoid: 0,
        valid_rows: 0
    };
    for (let i = 1; i < apiJson.length; i++) {
        const r = apiJson[i];
        const popRaw = r[idxPop];
        const pop = popRaw === null || popRaw === undefined || popRaw === '' ? null : Number(popRaw);
        const state = r[idxState];
        const county = r[idxCounty];
        const cousub = r[idxCousub];
        if (pop === null) {
            diagnostics.null_population++;
            continue;
        }
        if (!Number.isFinite(pop) || pop < 0) {
            diagnostics.negative_population++;
            continue;
        }
        if (!state || !county || !cousub) {
            diagnostics.invalid_geoid++;
            continue;
        }
        const geoid = composeGeoid(state, county, cousub);
        if (!isValidGeoid(geoid)) {
            diagnostics.invalid_geoid++;
            continue;
        }
        diagnostics.valid_rows++;
        out.push({
            geoid,
            state_fips: String(state).padStart(2, '0'),
            county_fips: String(county).padStart(3, '0'),
            cousub_fips: String(cousub).padStart(5, '0'),
            census_name: r[idxName] || null,
            population_estimate: Math.trunc(pop)
        });
    }
    // Sort by geoid for determinism.
    out.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));
    return { rows: out, diagnostics };
}

/**
 * Promote a parsed row to the canonical DATA-MODEL records:
 *   - comparison_geography (always)
 *   - population_observation (always, with the pinned variable)
 *
 * Sprint 1: comparison_eligible is true for every Maine county
 * subdivision. Tighter eligibility logic is a future migration ticket.
 */
function toCanonicalRecords(rows) {
    const comparison = [];
    const population = [];
    for (const r of rows) {
        const displayName = (r.census_name || '').split(',')[0].trim() || null;
        comparison.push({
            geoid: r.geoid,
            state_fips: r.state_fips,
            county_fips: r.county_fips,
            cousub_fips: r.cousub_fips,
            census_name: r.census_name,
            display_name: displayName,
            geography_type: 'county_subdivision',
            acs_vintage: ACS_VINTAGE,
            comparison_eligible: true,
            note: null
        });
        population.push({
            acs_vintage: ACS_VINTAGE,
            geoid: r.geoid,
            variable_id: VARIABLE_ID,
            population_estimate: r.population_estimate,
            source_name: 'census_acs5_population'
        });
    }
    return { comparison, population };
}

/**
 * Top-level adapter entry.
 *
 * Inputs:
 *   rootDir: $MDG_DATA_ROOT
 *   opts: { apiKey?: string }
 *
 * Returns:
 *   { source: 'live'|'mock', raw_path, raw_sha256, rows, diagnostics,
 *     comparison_geography, population_observations, fixture_note }
 */
async function run(rootDir, opts) {
    opts = opts || {};
    const apiKey = opts.apiKey || process.env.CENSUS_API_KEY || null;
    let body;
    let sourceLabel;
    let rawFilename;
    if (apiKey) {
        const url = buildUrl(apiKey);
        const r = await store.httpGet(url, {
            accept: 'application/json,*/*',
            timeoutMs: 60000
        });
        if (r.status < 200 || r.status >= 300) {
            const err = new Error('Census API HTTP ' + r.status);
            err.code = 'CENSUS_HTTP_ERROR';
            err.httpStatus = r.status;
            throw err;
        }
        body = r.body;
        sourceLabel = 'live';
        rawFilename = 'census_acs5_2024_B01003_001E_state23.json';
    } else {
        // Mock fixture path. The fixture wraps the live-API-shape array
        // in an envelope so we can attach _mock_meta. Unwrap here.
        body = Buffer.from(JSON.stringify(MAINE_COUNTY_SUBDIVISION_FIXTURE), 'utf8');
        const env = JSON.parse(body.toString('utf8'));
        body = Buffer.from(JSON.stringify(env.response || env), 'utf8');
        sourceLabel = 'mock';
        rawFilename = 'census_acs5_2024_B01003_001E_state23.mock.json';
    }
    const sha = store.sha256(body);
    const wrote = store.writeRawArtifact(rootDir, 'census_acs5_population',
        new Date().toISOString(), body, rawFilename);
    const apiJson = JSON.parse(body.toString('utf8'));
    const parsed = parseApiResponse(apiJson);
    const canonical = toCanonicalRecords(parsed.rows);
    return {
        source: sourceLabel,
        acs_vintage: ACS_VINTAGE,
        variable_id: VARIABLE_ID,
        state_fips: STATE_FIPS,
        raw_path: wrote.path,
        raw_sha256: sha,
        diagnostics: parsed.diagnostics,
        comparison_geography: canonical.comparison,
        population_observations: canonical.population,
        fixture_note: sourceLabel === 'mock'
            ? 'Census API key not present; using deterministic mock fixture. '
              + 'Set CENSUS_API_KEY to fetch the real ACS 2024 dataset.'
            : null
    };
}

module.exports = {
    run,
    parseApiResponse,
    toCanonicalRecords,
    composeGeoid,
    isValidGeoid,
    VARIABLE_ID,
    ACS_VINTAGE,
    STATE_FIPS,
    BASE_URL
};