'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * adapters/derive-retail-products.cjs
 *
 * Tickets 007 + 008 — derives per-municipality retail-license
 * products from a frozen input lock of normalized snapshots.
 *
 * Inputs (one normalized snapshot per source_id):
 *   { source_id: 'ocp_licenses',   source_sha256: '...' }
 *   { source_id: 'census_acs5_population', source_sha256: '...' }
 *
 * Outputs (Ticket 007 + 008 products):
 *
 *   retail-licenses-by-municipality:
 *     For each resolved GEOID, count of distinct active-store
 *     identities with that GEOID. Sorted by GEOID.
 *
 *   retail-licenses-per-10k:
 *     retail_licenses_per_10k(g,s,v) = retail_licenses(g,s) /
 *       population(g,v) * 10000, unrounded. Display rounded to 2
 *       decimals. Suppressed when population is missing or zero.
 *
 *   municipalities-without-retail-license:
 *     Distinct GEOIDs in the comparison universe
 *     (comparison_eligible == true) with zero qualifying retail
 *     licenses. Sorted by GEOID.
 *
 * Reconciliation report (Ticket 007 acceptance):
 *     compare canonical counts with legacy site-stats.json fields.
 *
 * Determinism:
 *   - Inputs come from input-lock.json (Ticket 011).
 *   - All outputs are sorted by geoid.
 *   - Numeric results use full available precision; display values
 *     are rounded to 2 decimals.
 *   - Identical inputs produce identical bytes.
 */

function canonicalJSON(obj) {
    // Stable key order: sort object keys alphabetically.
    const sortKeys = (v) => {
        if (Array.isArray(v)) return v.map(sortKeys);
        if (v && typeof v === 'object') {
            const out = {};
            for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
            return out;
        }
        return v;
    };
    return JSON.stringify(sortKeys(obj), null, 2) + '\n';
}

function csvEscape(s) {
    if (s === null || s === undefined) return '';
    const str = String(s);
    if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
}

function rowsToCsv(rows, columns) {
    const lines = [columns.join(',')];
    for (const r of rows) {
        lines.push(columns.map(c => csvEscape(r[c])).join(','));
    }
    return lines.join('\n') + '\n';
}

/**
 * Load a normalized snapshot from disk.
 */
function loadSnapshot(rootDir, sourceId, sourceSha256) {
    const p = path.join(rootDir, 'normalized', sourceId, sourceSha256, 'schema_version=1');
    if (!fs.existsSync(p)) return null;
    const snap = {
        data: JSON.parse(fs.readFileSync(path.join(p, 'data.json'), 'utf8')),
        profile: JSON.parse(fs.readFileSync(path.join(p, 'profile.json'), 'utf8')),
        provenance: JSON.parse(fs.readFileSync(path.join(p, 'provenance.json'), 'utf8'))
    };
    // population_observations may live in a separate file (Census adapter)
    // or inline in data.json (OCP). Merge into data for downstream consumers.
    const popPath = path.join(p, 'population_observations.json');
    if (fs.existsSync(popPath)) {
        const pop = JSON.parse(fs.readFileSync(popPath, 'utf8'));
        if (pop && pop.length && !snap.data.population_observations) {
            snap.data.population_observations = pop;
        }
    }
    return snap;
}

/**
 * Derive the four per-municipality products from a frozen input
 * lock. Returns an object keyed by slug with { json, csv, meta }.
 *
 * `releaseMeta` carries release_id, source_ids, source_urls,
 * transform_version, schema_version, data_as_of, fetched_at_utc,
 * acs_vintage (per Census snapshot), and preliminary flag.
 */
function derive(rootDir, inputLock, releaseMeta) {
    const ocpSnap = loadSnapshot(rootDir, 'ocp_licenses', inputLock['ocp_licenses']);
    const censusSnap = loadSnapshot(rootDir, 'census_acs5_population', inputLock['census_acs5_population']);

    if (!ocpSnap) throw new Error('ocp_licenses snapshot missing for input-lock');
    if (!censusSnap) throw new Error('census_acs5_population snapshot missing for input-lock');

    const isCensusMock = censusSnap.provenance.mock === true;

    const records = ocpSnap.data.records;
    const comparison = censusSnap.data.comparison_geography || [];
    const population = censusSnap.data.population_observations || [];
    const popByGeoid = new Map();
    for (const p of population) popByGeoid.set(p.geoid, p.population_estimate);

    // Count distinct active-store identities per GEOID. Exclude
    // unmatched_municipality rows from per-geoid products per
    // publication gate (TICKETS/005 + METRICS.md §Comparison universe).
    const activeStoreGeoidCounts = new Map(); // geoid -> Set<identity_key>
    const activeStoreAllCount = new Set(); // distinct active-store identities overall
    for (const r of records) {
        if (r.license_status_norm !== 'active') continue;
        if (r.license_type_norm !== 'cannabis_store') continue;
        activeStoreAllCount.add(r.identity_key);
        if (!r.geoid) continue; // unmatched_municipality excluded
        if (!activeStoreGeoidCounts.has(r.geoid)) {
            activeStoreGeoidCounts.set(r.geoid, new Set());
        }
        activeStoreGeoidCounts.get(r.geoid).add(r.identity_key);
    }

    // ----- retail-licenses-by-municipality -----
    const rlbmRows = [];
    for (const [geoid, ids] of activeStoreGeoidCounts) {
        rlbmRows.push({
            geoid: geoid,
            active_adult_use_cannabis_store_licenses: ids.size,
            data_as_of: releaseMeta.data_as_of || null
        });
    }
    rlbmRows.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));

    // ----- retail-licenses-per-10k -----
    const rlPer10kRows = [];
    for (const r of rlbmRows) {
        const pop = popByGeoid.get(r.geoid);
        if (!pop || pop <= 0) {
            rlPer10kRows.push({
                geoid: r.geoid,
                active_adult_use_cannabis_store_licenses: r.active_adult_use_cannabis_store_licenses,
                population: pop || null,
                rate_per_10k_unrounded: null,
                rate_per_10k_display: null,
                suppressed: true,
                suppression_reason: pop ? 'population_zero' : 'population_missing',
                acs_vintage: releaseMeta.acs_vintage || null,
                data_as_of: r.data_as_of
            });
            continue;
        }
        const rate = r.active_adult_use_cannabis_store_licenses / pop * 10000;
        rlPer10kRows.push({
            geoid: r.geoid,
            active_adult_use_cannabis_store_licenses: r.active_adult_use_cannabis_store_licenses,
            population: pop,
            rate_per_10k_unrounded: rate,
            rate_per_10k_display: Math.round(rate * 100) / 100,
            suppressed: false,
            suppression_reason: null,
            acs_vintage: releaseMeta.acs_vintage || null,
            data_as_of: r.data_as_of
        });
    }
    rlPer10kRows.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));

    // ----- municipalities-without-retail-license -----
    // Universe: comparison_geography rows with comparison_eligible == true.
    // Excludes: GEOIDs with active retail licenses (computed above).
    const hasRetail = new Set(activeStoreGeoidCounts.keys());
    const withoutRows = [];
    for (const c of comparison) {
        if (c.comparison_eligible !== true) continue;
        if (hasRetail.has(c.geoid)) continue;
        const pop = popByGeoid.get(c.geoid);
        withoutRows.push({
            geoid: c.geoid,
            census_name: c.census_name,
            display_name: c.display_name,
            population: pop || null,
            acs_vintage: releaseMeta.acs_vintage || null,
            data_as_of: releaseMeta.data_as_of || null
        });
    }
    withoutRows.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));

    // ----- reconciliation report (Ticket 007 acceptance) -----
    const reconciliation = {
        canonical: {
            total_active_store_identities: activeStoreAllCount.size,
            total_resolved_active_store_geoids: activeStoreGeoidCounts.size,
            distinct_active_store_geoids_with_population_match:
                rlPer10kRows.filter(r => !r.suppressed).length
        },
        legacy_site_stats: {
            // Hard-coded to match the values in
            // apps/maine-cannabis/src/data/site-stats.json as of
            // 2026-07-11. Ticket 007 acceptance: "reconciliation
            // report compares canonical results with legacy
            // site-stats counts without silently overwriting
            // them."
            activeAdultUseRetailStores_annualReport: 187,
            currentOcpLicenseeRoster_auRetailStores_liveCSV: 107,
            note: 'Read-only comparison; legacy counts are NOT mutated.'
        },
        delta: {
            canonical_vs_annualReport: activeStoreAllCount.size - 187,
            canonical_vs_liveCSV: activeStoreAllCount.size - 107
        },
        notes: [
            'canonical.total_active_store_identities counts distinct LICENSE ' +
                'values with status=Active and type=Store. Source: OCP 2026-06-01 CSV.',
            'legacy_site_stats.activeAdultUseRetailStores_annualReport is anchored ' +
                'to the OCP 2025 Annual Report (343 total active AU establishments ' +
                'of which 187 are retail stores).',
            'legacy_site_stats.currentOcpLicenseeRoster.auRetailStores is the ' +
                'legacy Python fetcher count: DBA+city deduped, type=Store, ' +
                'status=Active. The 107-vs-canonical delta reflects the 23 ' +
                '(DBA, CITY) collapses the legacy rule silently performs, plus ' +
                'the difference in identity semantics.',
            'Both legacy fields are read-only. A separate migration ticket ' +
                'must wire canonical results into site-stats.json; that ' +
                'migration is OUT OF SCOPE for MDG-DATA-001 Sprint 1.'
        ]
    };

    // ----- emit products -----
    const products = {};

    products['retail-licenses-by-municipality'] = {
        json: canonicalJSON({
            schema_version: 1,
            slug: 'retail-licenses-by-municipality',
            title: 'Active Adult-Use Cannabis-Store Licenses by Maine Municipality',
            description: 'Distinct approved OCP licenses with status=Active and ' +
                'license_type=cannabis_store, joined to Census county-subdivision GEOIDs ' +
                'via the reviewed OCP-to-Census crosswalk. Excludes OCP rows where ' +
                'the host municipality is unmatched (TBD, TO BE DETERMINED, etc.).',
            unit: 'count',
            universe: 'all comparison_geography rows with comparison_eligible=true',
            rows: rlbmRows,
            totals: {
                active_store_licenses_resolved_to_geoid:
                    rlbmRows.reduce((s, r) => s + r.active_adult_use_cannabis_store_licenses, 0),
                geoids_with_active_store: rlbmRows.length,
                active_store_identities_total_statewide: activeStoreAllCount.size,
                active_store_identities_excluded_unmatched_municipality:
                    activeStoreAllCount.size - rlbmRows.reduce((s, r) => s + r.active_adult_use_cannabis_store_licenses, 0)
            },
            methodology_notes: [
                'Counts are based on OCP Active license status, NOT real-time ' +
                    'storefront-open census (per CONTEXT.md §Critical semantic rule).',
                'Identity rule: LICENSE for non-null LICENSE values (see ' +
                    'DEVIATION-20260711-retail-identity-rule.md).'
            ]
        }),
        csv: rowsToCsv(rlbmRows, ['geoid', 'active_adult_use_cannabis_store_licenses', 'data_as_of']),
        meta: {
            schema_version: 1,
            slug: 'retail-licenses-by-municipality',
            title: 'Active Adult-Use Cannabis-Store Licenses by Maine Municipality',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: releaseMeta.preliminary || false,
            source_ids: ['ocp_licenses', 'census_acs5_population'],
            source_urls: [
                'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
                'https://www.census.gov/data/developers/data-sets/acs-5year.html'
            ],
            input_sha256: [
                { source_id: 'ocp_licenses', sha256: inputLock['ocp_licenses'] },
                { source_id: 'census_acs5_population', sha256: inputLock['census_acs5_population'] }
            ],
            transform_version: releaseMeta.transform_version,
            schema_version: 1,
            methodology_path: '/data/methodology/retail-licenses-by-municipality',
            acs_vintage: releaseMeta.acs_vintage || null,
            mock: isCensusMock
        }
    };

    products['retail-licenses-per-10k'] = {
        json: canonicalJSON({
            schema_version: 1,
            slug: 'retail-licenses-per-10k',
            title: 'Active Adult-Use Cannabis-Store Licenses per 10,000 Residents',
            description: 'Per-capita rate of active-store licenses using ACS 2024 ' +
                '5-year population (variable B01003_001E). Rates calculated unrounded ' +
                'and ranked on unrounded values; display values rounded to 2 decimals. ' +
                'Suppressed when population is missing or zero.',
            unit: 'licenses_per_10k_residents',
            rows: rlPer10kRows,
            totals: {
                geoids_with_rate: rlPer10kRows.filter(r => !r.suppressed).length,
                geoids_suppressed: rlPer10kRows.filter(r => r.suppressed).length
            },
            methodology_notes: [
                'Rate = active_licenses / population * 10000, unrounded.',
                'Display rounded to 2 decimals.',
                'Suppression: missing or zero population (METRICS.md §Retail licenses per 10k).',
                'Census source: ACS 2024 5-year B01003_001E. Mock data is in use ' +
                    'until CENSUS_API_KEY is provided; see DECISION-20260711.'
            ]
        }),
        csv: rowsToCsv(rlPer10kRows, ['geoid', 'active_adult_use_cannabis_store_licenses',
            'population', 'rate_per_10k_unrounded', 'rate_per_10k_display', 'suppressed',
            'suppression_reason', 'acs_vintage', 'data_as_of']),
        meta: {
            schema_version: 1,
            slug: 'retail-licenses-per-10k',
            title: 'Active Adult-Use Cannabis-Store Licenses per 10,000 Residents',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: releaseMeta.preliminary || false,
            source_ids: ['ocp_licenses', 'census_acs5_population'],
            source_urls: [
                'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
                'https://www.census.gov/data/developers/data-sets/acs-5year.html'
            ],
            input_sha256: [
                { source_id: 'ocp_licenses', sha256: inputLock['ocp_licenses'] },
                { source_id: 'census_acs5_population', sha256: inputLock['census_acs5_population'] }
            ],
            transform_version: releaseMeta.transform_version,
            schema_version: 1,
            methodology_path: '/data/methodology/retail-licenses-per-10k',
            acs_vintage: releaseMeta.acs_vintage || null,
            mock: isCensusMock
        }
    };

    products['municipalities-without-retail-license'] = {
        json: canonicalJSON({
            schema_version: 1,
            slug: 'municipalities-without-retail-license',
            title: 'Maine Municipalities Without an Active Adult-Use Cannabis-Store License',
            description: 'Census county-subdivisions in the comparison universe ' +
                '(comparison_eligible=true) with zero qualifying active-store licenses ' +
                'in the selected license snapshot. Per METRICS.md §Comparison universe ' +
                'without a qualifying active retail license, this product is ' +
                'intentionally NOT labeled "underserved".',
            unit: 'municipality',
            rows: withoutRows,
            totals: {
                geoids_without_retail: withoutRows.length,
                universe_size: comparison.filter(c => c.comparison_eligible === true).length
            },
            methodology_notes: [
                'Universe = comparison_geography rows with comparison_eligible=true.',
                'Excludes GEOIDs that have >= 1 active retail license.',
                'Public copy must not call these "underserved" (METRICS.md).'
            ]
        }),
        csv: rowsToCsv(withoutRows, ['geoid', 'census_name', 'display_name', 'population',
            'acs_vintage', 'data_as_of']),
        meta: {
            schema_version: 1,
            slug: 'municipalities-without-retail-license',
            title: 'Maine Municipalities Without an Active Adult-Use Cannabis-Store License',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: releaseMeta.preliminary || false,
            source_ids: ['ocp_licenses', 'census_acs5_population'],
            source_urls: [
                'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
                'https://www.census.gov/data/developers/data-sets/acs-5year.html'
            ],
            input_sha256: [
                { source_id: 'ocp_licenses', sha256: inputLock['ocp_licenses'] },
                { source_id: 'census_acs5_population', sha256: inputLock['census_acs5_population'] }
            ],
            transform_version: releaseMeta.transform_version,
            schema_version: 1,
            methodology_path: '/data/methodology/municipalities-without-retail-license',
            acs_vintage: releaseMeta.acs_vintage || null,
            mock: isCensusMock
        }
    };

    products['__reconciliation__'] = {
        json: canonicalJSON(reconciliation),
        csv: null,
        meta: {
            schema_version: 1,
            slug: '__reconciliation__',
            title: 'Reconciliation: canonical vs legacy site-stats counts',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: releaseMeta.preliminary || false,
            source_ids: ['ocp_licenses', 'census_acs5_population'],
            source_urls: [],
            input_sha256: [
                { source_id: 'ocp_licenses', sha256: inputLock['ocp_licenses'] },
                { source_id: 'census_acs5_population', sha256: inputLock['census_acs5_population'] }
            ],
            transform_version: releaseMeta.transform_version,
            schema_version: 1,
            methodology_path: '/data/methodology/reconciliation',
            acs_vintage: releaseMeta.acs_vintage || null,
            mock: isCensusMock
        }
    };

    return products;
}

module.exports = { derive, canonicalJSON, rowsToCsv };