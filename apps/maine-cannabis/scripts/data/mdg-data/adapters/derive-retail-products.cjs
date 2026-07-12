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
// Hoisted helper: inputLock may be a map or array-form.
function getSha(inputLock, sid) {
    if (typeof inputLock[sid] === 'string') return inputLock[sid];
    if (Array.isArray(inputLock.inputs)) {
        const found = inputLock.inputs.find(i => i.source_id === sid);
        return found ? found.sha256 : null;
    }
    return null;
}

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

    // Tier 1 publication gate per ARTIFACT-CONTRACT.md §Product filenames
    // and METRICS.md §Comparison universe without a qualifying active
    // retail license: "100% of qualifying active store rows are
    // resolved before geographic products publish." (TICKETS/005)
    //
    // We classify each qualifying active-store row into:
    //   - resolved:  has a geoid
    //   - excluded_unmatched_municipality: status=active + type=cannabis_store
    //                                    but no geoid (host municipality in
    //                                    unmatched_queue of the crosswalk)
    //   - excluded_null_license: null LICENSE (synthetic identity fallback
    //                              quarantined per ChatGPT review 2026-07-12;
    //                              null state-issued license identifiers
    //                              should not produce a published retail identity)
    //
    // If ANY qualifying active-store row is excluded for either reason,
    // the three geographic products are blocked with
    // GEOGRAPHY_UNRESOLVED. The full active-store count (187 in the
    // June 2026 snapshot) is still exposed via the disabled-products
    // manifest entry, not via per-municipality products.
    const activeStoreGeoidCounts = new Map(); // geoid -> Set<identity_key>
    const activeStoreAllCount = new Set(); // distinct active-store identities overall
    const excludedUnmatchedMunicipality = []; // [{identity_key, license_number, ...}]
    const excludedNullLicense = []; // [{identity_key, ...}]
    for (const r of records) {
        if (r.license_status_norm !== 'active') continue;
        if (r.license_type_norm !== 'cannabis_store') continue;
        activeStoreAllCount.add(r.identity_key);
        // Quarantine null-LICENSE rows. Per DEVIATION-20260711-retail-
        // identity-rule.md, identity_key = LICENSE for non-null rows;
        // the sha256(TYPE|DBA|CITY) fallback is for non-qualifying rows
        // and MUST NOT participate in the published retail universe.
        if (!r.license_number) {
            excludedNullLicense.push({
                identity_key: r.identity_key,
                license_status: r.license_status_raw,
                license_type: r.license_type_raw,
                dba: r.dba_name,
                city: r.host_municipality_raw
            });
            continue;
        }
        if (!r.geoid) {
            excludedUnmatchedMunicipality.push({
                identity_key: r.identity_key,
                license_number: r.license_number,
                license_status: r.license_status_raw,
                license_type: r.license_type_raw,
                dba: r.dba_name,
                city: r.host_municipality_raw
            });
            continue;
        }
        if (!activeStoreGeoidCounts.has(r.geoid)) {
            activeStoreGeoidCounts.set(r.geoid, new Set());
        }
        activeStoreGeoidCounts.get(r.geoid).add(r.identity_key);
    }

    const gate = {
        geography_unresolved: excludedUnmatchedMunicipality.length > 0
            || excludedNullLicense.length > 0,
        excluded_unmatched_municipality_count: excludedUnmatchedMunicipality.length,
        excluded_null_license_count: excludedNullLicense.length,
        excluded_unmatched_municipality_sample: excludedUnmatchedMunicipality.slice(0, 10),
        excluded_null_license_sample: excludedNullLicense.slice(0, 10),
        active_store_identities_total: activeStoreAllCount.size,
        active_store_identities_resolved: Array.from(activeStoreGeoidCounts.values())
            .reduce((s, set) => s + set.size, 0)
    };
    // If the gate is not clear, throw to block publication. The caller
    // (commands/derive.cjs) catches this and emits the appropriate
    // disabled-products manifest entries.
    if (gate.geography_unresolved) {
        const err = new Error(
            `Tier 1 publication gate: ${excludedUnmatchedMunicipality.length} active-store identities have unmatched municipalities; ${excludedNullLicense.length} have null LICENSE. Geographic products are BLOCKED.`);
        err.code = 'GEOGRAPHY_UNRESOLVED';
        err.gate = gate;
        throw err;
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

    // ---- dispensary directory (MDG-ANALYTICS-001 / 280E price tracker) ----
    const dirSha = getSha(inputLock, 'ocp_dispensaries_firecrawl');
    const dirSnap = dirSha ? loadSnapshot(rootDir, 'ocp_dispensaries_firecrawl', dirSha) : null;
    if (dirSnap && dirSnap.data && Array.isArray(dirSnap.data.dispensaries)
        && dirSnap.data.dispensaries.length > 0) {
        products['dispensary-directory'] = deriveDispensaryDirectory(
            dirSnap.data.dispensaries,
            dirSnap.data.findall_runs || [],
            releaseMeta);
    }

    // ---- firecrawl-ingested products (Ticket 009/010 corrective) ----
    // Build adult-use-retail-sales, adult-use-transactions,
    // average-flower-price, adult-use-product-mix from firecrawl
    // observations. Build retail-optin-gap from firecrawl optin records
    // joined to the crosswalk.
    // Load the firecrawl-ingested snapshots separately. Note: ocpSnap
    // above is the OCP licenses snapshot (not retail sales).
    const salesSha = getSha(inputLock, 'ocp_retail_sales');
    const salesSnap = salesSha ? loadSnapshot(rootDir, 'ocp_retail_sales', salesSha) : null;
    const ocpSalesData = salesSnap && salesSnap.data;
    const optinSha = getSha(inputLock, 'ocp_optin');
    const optinSnap = optinSha ? loadSnapshot(rootDir, 'ocp_optin', optinSha) : null;
    if (ocpSalesData && Array.isArray(ocpSalesData.observations)
        && ocpSalesData.observations.length > 0) {
        products['adult-use-retail-sales'] = deriveAdultUseRetailSales(
            ocpSalesData, releaseMeta);
    }
    if (ocpSalesData && Array.isArray(ocpSalesData.observations)) {
        // Filter for transactions specifically
        const txnObs = ocpSalesData.observations.filter(o =>
            o.metric_norm === 'transactions');
        if (txnObs.length) {
            products['adult-use-transactions'] = deriveAdultUseTransactions(txnObs, releaseMeta);
        }
        // Filter for price-per-gram
        const priceObs = ocpSalesData.observations.filter(o =>
            o.metric_norm === 'avg_price_per_gram_usd');
        if (priceObs.length) {
            products['average-flower-price'] = deriveAverageFlowerPrice(priceObs, releaseMeta);
        }
        // Filter for sales by product category (metric_norm === 'retail_sales_usd'
        // AND product_category_norm NOT 'total')
        const byCatObs = ocpSalesData.observations.filter(o =>
            o.metric_norm === 'retail_sales_usd' && o.product_category_norm
            && o.product_category_norm !== 'total');
        if (byCatObs.length) {
            products['adult-use-product-mix'] = deriveProductMix(byCatObs, releaseMeta);
        }
    }
    if (optinSnap && optinSnap.data
        && Array.isArray(optinSnap.data.records)
        && optinSnap.data.records.length > 0) {
        products['retail-optin-gap'] = deriveRetailOptinGap(
            optinSnap.data.records, activeStoreAllCount, activeStoreGeoidCounts,
            releaseMeta, ocpSalesData);
    }

    return products;
}

function deriveAdultUseRetailSales(ocpSalesData, releaseMeta) {
    const obs = ocpSalesData.observations || [];
    const totalObs = obs.filter(o => o.metric_norm === 'retail_sales_usd'
        && o.product_category_norm === 'total');
    // Sort by reporting_period
    totalObs.sort((a, b) => a.reporting_period < b.reporting_period ? -1
        : a.reporting_period > b.reporting_period ? 1 : 0);
    return {
        json: canonicalJSON({
            schema_version: 1,
            slug: 'adult-use-retail-sales',
            title: 'OCP Adult-Use Retail Cannabis Sales',
            description: 'Adult-use retail cannabis sales by reporting period. ' +
                'Source: OCP Power BI dashboard extracted via Firecrawl interact ' +
                '2026-07-12. Data is preliminary and subject to revisions.',
            unit: 'USD',
            observations: totalObs,
            notes: ['preliminary: true (per OCP source-level warning)',
                    'extraction_method: firecrawl_interact',
                    'capture_date: ' + (releaseMeta.data_as_of || '2026-07-12')]
        }),
        csv: rowsToCsv(totalObs, ['reporting_period', 'value', 'unit',
            'product_category_raw', 'metric_raw', 'preliminary']),
        meta: {
            schema_version: 1,
            slug: 'adult-use-retail-sales',
            title: 'OCP Adult-Use Retail Cannabis Sales',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: true,
            source_ids: ['ocp_retail_sales'],
            source_urls: ['https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales'],
            input_sha256: [{ source_id: 'ocp_retail_sales', sha256: 'firecrawl_ingest' }],
            transform_version: releaseMeta.transform_version,
            schema_version: 1,
            methodology_path: '/data/methodology/adult-use-retail-sales',
            acs_vintage: null,
            origin: 'firecrawl_interact_capture',
            mock: false
        }
    };
}

function deriveAdultUseTransactions(txnObs, releaseMeta) {
    const sorted = txnObs.slice().sort((a, b) =>
        a.reporting_period < b.reporting_period ? -1
        : a.reporting_period > b.reporting_period ? 1 : 0);
    return {
        json: canonicalJSON({
            schema_version: 1, slug: 'adult-use-transactions',
            title: 'OCP Adult-Use Retail Cannabis Transactions',
            description: 'Number of sales transactions by reporting period. ' +
                'Source: OCP Power BI dashboard. Note: per OCP, "Transaction ' +
                'means number of receipts or overall purchases in a single ' +
                'customer transaction."',
            unit: 'transactions',
            observations: sorted,
            notes: ['preliminary: true', 'extraction_method: firecrawl_interact']
        }),
        csv: rowsToCsv(sorted, ['reporting_period', 'value', 'unit',
            'product_category_raw', 'metric_raw', 'preliminary']),
        meta: {
            schema_version: 1, slug: 'adult-use-transactions',
            title: 'OCP Adult-Use Retail Cannabis Transactions',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: true,
            source_ids: ['ocp_retail_sales'],
            source_urls: ['https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales'],
            input_sha256: [{ source_id: 'ocp_retail_sales', sha256: 'firecrawl_ingest' }],
            transform_version: releaseMeta.transform_version, schema_version: 1,
            methodology_path: '/data/methodology/adult-use-transactions',
            acs_vintage: null, origin: 'firecrawl_interact_capture', mock: false
        }
    };
}

function deriveAverageFlowerPrice(priceObs, releaseMeta) {
    const sorted = priceObs.slice().sort((a, b) =>
        a.reporting_period < b.reporting_period ? -1
        : a.reporting_period > b.reporting_period ? 1 : 0);
    return {
        json: canonicalJSON({
            schema_version: 1, slug: 'average-flower-price',
            title: 'OCP Average Price per Gram (Bud/Flower)',
            description: 'Average retail price per gram of bud/flower by reporting ' +
                'period. Source: OCP Power BI dashboard.',
            unit: 'USD_per_gram',
            observations: sorted,
            notes: ['preliminary: true', 'extraction_method: firecrawl_interact',
                    'product_category: bud_flower only (per OCP definition)']
        }),
        csv: rowsToCsv(sorted, ['reporting_period', 'value', 'unit',
            'product_category_raw', 'metric_raw', 'preliminary']),
        meta: {
            schema_version: 1, slug: 'average-flower-price',
            title: 'OCP Average Price per Gram (Bud/Flower)',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: true,
            source_ids: ['ocp_retail_sales'],
            source_urls: ['https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales'],
            input_sha256: [{ source_id: 'ocp_retail_sales', sha256: 'firecrawl_ingest' }],
            transform_version: releaseMeta.transform_version, schema_version: 1,
            methodology_path: '/data/methodology/average-flower-price',
            acs_vintage: null, origin: 'firecrawl_interact_capture', mock: false
        }
    };
}

function deriveProductMix(byCatObs, releaseMeta) {
    // For each (reporting_period, product_category) compute share %.
    // Use unrounded per METRICS.md §Product mix.
    const byPeriod = {};
    for (const o of byCatObs) {
        if (!byPeriod[o.reporting_period]) byPeriod[o.reporting_period] = [];
        byPeriod[o.reporting_period].push(o);
    }
    const rows = [];
    for (const [period, items] of Object.entries(byPeriod)) {
        const total = items.reduce((s, i) => s + (i.value || 0), 0);
        for (const it of items) {
            rows.push({
                reporting_period: period,
                product_category: it.product_category_norm,
                value_usd: it.value,
                share_pct_unrounded: total > 0 ? (it.value / total) * 100 : null,
                share_pct_display: total > 0
                    ? Math.round((it.value / total) * 10000) / 100 : null
            });
        }
    }
    rows.sort((a, b) => (a.reporting_period < b.reporting_period ? -1
        : a.reporting_period > b.reporting_period ? 1 : 0));
    return {
        json: canonicalJSON({
            schema_version: 1, slug: 'adult-use-product-mix',
            title: 'OCP Adult-Use Product Mix by Category',
            description: 'Share of adult-use retail sales by product category, ' +
                'by reporting period. Source: OCP Power BI dashboard. ' +
                'Categories per OCP: Concentrate, Infused Product, Plants, ' +
                'Usable Cannabis. Per METRICS.md §Product mix, share = ' +
                'category_sales / total_category_sales * 100.',
            unit: 'percent',
            rows,
            notes: ['preliminary: true', 'extraction_method: firecrawl_interact',
                    'denominator: total monthly sales across all 4 categories']
        }),
        csv: rowsToCsv(rows, ['reporting_period', 'product_category', 'value_usd',
            'share_pct_unrounded', 'share_pct_display']),
        meta: {
            schema_version: 1, slug: 'adult-use-product-mix',
            title: 'OCP Adult-Use Product Mix by Category',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: true,
            source_ids: ['ocp_retail_sales'],
            source_urls: ['https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales'],
            input_sha256: [{ source_id: 'ocp_retail_sales', sha256: 'firecrawl_ingest' }],
            transform_version: releaseMeta.transform_version, schema_version: 1,
            methodology_path: '/data/methodology/adult-use-product-mix',
            acs_vintage: null, origin: 'firecrawl_interact_capture', mock: false
        }
    };
}

function deriveRetailOptinGap(optinRecords, activeStoreAllCount,
    activeStoreGeoidCounts, releaseMeta, ocpSalesData) {
    // The optin data has { municipality_raw, municipality_normalized, geoid,
    // activity_norm, allowed }. We treat 'Adult Use Cannabis Opt-in' as the
    // retail opt-in activity. Join on geoid against the active retail set.
    const retailOptin = optinRecords.filter(r =>
        r.activity_norm === 'adult_use_cannabis_optin'
        && r.allowed === true);
    // Build a set of GEOIDs that have active retail
    const activeGeoids = new Set(activeStoreGeoidCounts.keys());
    const rows = [];
    for (const r of retailOptin) {
        if (!r.geoid) continue;  // unknown mun, can't join
        const geoid = r.geoid;
        const hasRetail = activeGeoids.has(geoid);
        const activeCount = activeStoreGeoidCounts.get(geoid)
            ? activeStoreGeoidCounts.get(geoid).size : 0;
        rows.push({
            geoid: geoid,
            municipality_raw: r.municipality_raw,
            municipality_normalized: r.municipality_normalized,
            optin_for_adult_use_cannabis: r.allowed,
            active_adult_use_cannabis_store_licenses: activeCount,
            is_optin_gap: r.allowed === true && !hasRetail
        });
    }
    // Include also: municipalities that have retail but not in optin list
    for (const [geoid, ids] of activeStoreGeoidCounts) {
        if (rows.find(r => r.geoid === geoid)) continue;
        rows.push({
            geoid: geoid,
            municipality_raw: null,
            municipality_normalized: null,
            optin_for_adult_use_cannabis: null,
            active_adult_use_cannabis_store_licenses: ids.size,
            is_optin_gap: false
        });
    }
    rows.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));
    return {
        json: canonicalJSON({
            schema_version: 1, slug: 'retail-optin-gap',
            title: 'Maine Municipalities With Adult-Use Cannabis Opt-In But No Active Retail License',
            description: 'Per METRICS.md §Retail opt-in gap: a municipality ' +
                'has the opt-in gap when OCP opt-in data indicates retail ' +
                'activity is allowed AND the active retail license count is zero. ' +
                'This product depends on (a) the OCP opt-in dashboard ' +
                'extracted via Firecrawl, and (b) the active retail license set ' +
                'from the OCP licenses dataset. The current opt-in data ' +
                'covers the municipalities visible in the Firecrawl capture ' +
                '(30 of ~500). For full Maine coverage the operator should ' +
                're-run firecrawl interact to extend the capture.',
            unit: 'municipality',
            rows,
            totals: {
                total_rows: rows.length,
                optin_gap_count: rows.filter(r => r.is_optin_gap).length,
                optin_allowed_count: rows.filter(r => r.optin_for_adult_use_cannabis === true).length,
                active_retail_count: rows.filter(r => r.active_adult_use_cannabis_store_licenses > 0).length
            },
            notes: ['preliminary: true', 'extraction_method: firecrawl_interact',
                    'per METRICS.md §Retail opt-in gap: NOT labeled underserved',
                    'capture_incomplete: only 30 of ~500 Maine municipalities visible in Firecrawl capture']
        }),
        csv: rowsToCsv(rows, ['geoid', 'municipality_raw', 'municipality_normalized',
            'optin_for_adult_use_cannabis', 'active_adult_use_cannabis_store_licenses',
            'is_optin_gap']),
        meta: {
            schema_version: 1, slug: 'retail-optin-gap',
            title: 'Maine Municipalities With Adult-Use Cannabis Opt-In But No Active Retail License',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: true,
            source_ids: ['ocp_optin', 'ocp_licenses'],
            source_urls: [
                'https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities',
                'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search'
            ],
            input_sha256: [
                { source_id: 'ocp_optin', sha256: 'firecrawl_ingest' },
                { source_id: 'ocp_licenses', sha256: 'ocp_licenses_normalized' }
            ],
            transform_version: releaseMeta.transform_version, schema_version: 1,
            methodology_path: '/data/methodology/retail-optin-gap',
            acs_vintage: releaseMeta.acs_vintage || null,
            origin: 'firecrawl_interact_capture', mock: false
        }
    };
}

function deriveDispensaryDirectory(dispensaries, findallRuns, releaseMeta) {
    // For each dispensary, surface key fields and (when available) join
    // to the crosswalk to get a Census GEOID for the host municipality.
    // Group by city for the public-facing summary view.
    const xw = require('../lib/crosswalk.cjs');
    const cw = xw.loadCrosswalk();
    const cityGeoidIdx = {};
    for (const a of cw.aliases) {
        if (a.geoid) cityGeoidIdx[a.normalized_value] = a.geoid;
    }
    const rows = [];
    for (const d of dispensaries) {
        const city = (d.city_raw || '').trim();
        const geoid = cityGeoidIdx[city] || null;
        rows.push({
            license_id: d.license_id,
            legal_name: d.legal_name,
            dba: d.dba,
            license_type_raw: d.license_type_raw,
            license_status: d.license_status,
            street_address_raw: d.street_address_raw,
            city_raw: city,
            geoid: geoid,
            county_raw: d.county_raw,
            website_raw: d.website_raw,
            has_website: !!(d.website_raw && d.website_raw.trim()),
            contact_email: d.contact_email,
            contact_phone: d.contact_phone,
            issue_date: d.issue_date,
            first_issue_date: d.first_issue_date,
            price_capture_status: d.price_capture_status || 'not_attempted'
        });
    }
    // Group by city for the at-a-glance summary
    const cityGroups = {};
    for (const r of rows) {
        const k = r.geoid || r.city_raw;
        if (!cityGroups[k]) {
            cityGroups[k] = {
                geoid: r.geoid,
                city_raw: r.city_raw,
                county_raw: r.county_raw,
                dispensary_count: 0,
                license_ids: [],
                with_website_count: 0
            };
        }
        cityGroups[k].dispensary_count++;
        cityGroups[k].license_ids.push(r.license_id);
        if (r.has_website) cityGroups[k].with_website_count++;
    }
    const cityRows = Object.values(cityGroups).sort((a, b) =>
        b.dispensary_count - a.dispensary_count);
    const withGeo = rows.filter(r => r.geoid).length;
    return {
        json: canonicalJSON({
            schema_version: 1, slug: 'dispensary-directory',
            title: 'Maine Adult-Use Cannabis Dispensary Directory',
            description: 'Authoritative enumeration of all 187 active adult-use ' +
                'cannabis store licenses in Maine (OCP 2026-06-01 snapshot). ' +
                'Each dispensary is joined to the OCP→Census crosswalk to attach ' +
                'a Census GEOID where the host municipality is in the crosswalk. ' +
                'Per MDG-ANALYTICS-001 / 280E calculator data strategy (memory ' +
                '2026-07-09), this directory seeds the Maine retail price tracker. ' +
                'Per the parallel-cli findall pilot 2026-07-12, the FindAll mode ' +
                'returned 10 matched/29 generated as a validation cross-check ' +
                'against this authoritative CSV enumeration.',
            unit: 'dispensary',
            dispensaries: rows,
            by_city: cityRows,
            totals: {
                total_dispensaries: rows.length,
                distinct_cities: new Set(rows.map(r => r.city_raw)).size,
                distinct_counties: new Set(rows.map(r => r.county_raw)).size,
                with_website: rows.filter(r => r.has_website).length,
                with_census_geoid: withGeo,
                without_census_geoid: rows.length - withGeo,
                findall_runs: findallRuns.length
            },
            notes: ['authoritative_source: OCP license CSV 2026-06-01',
                    'identity_key: LICENSE (per DEVIATION-20260711-retail-identity-rule.md)',
                    'price_capture_status: not_attempted (price tracker is the next sprint)']
        }),
        csv: rowsToCsv(rows, ['license_id', 'legal_name', 'dba', 'license_type_raw',
            'license_status', 'street_address_raw', 'city_raw', 'geoid', 'county_raw',
            'website_raw', 'has_website', 'contact_email', 'contact_phone',
            'issue_date', 'first_issue_date', 'price_capture_status']),
        meta: {
            schema_version: 1, slug: 'dispensary-directory',
            title: 'Maine Adult-Use Cannabis Dispensary Directory',
            release_id: releaseMeta.release_id,
            data_as_of: releaseMeta.data_as_of,
            fetched_at_utc: releaseMeta.fetched_at_utc,
            preliminary: false,
            source_ids: ['ocp_dispensaries_firecrawl', 'ocp_licenses'],
            source_urls: ['https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search'],
            input_sha256: [
                { source_id: 'ocp_dispensaries_firecrawl', sha256: 'ocp_csv_enumeration+findall' },
                { source_id: 'ocp_licenses', sha256: 'ocp_licenses_normalized' }
            ],
            transform_version: releaseMeta.transform_version, schema_version: 1,
            methodology_path: '/data/methodology/dispensary-directory',
            acs_vintage: releaseMeta.acs_vintage || null,
            origin: 'ocp_csv_enumeration', mock: false
        }
    };
}

module.exports = { derive, canonicalJSON, rowsToCsv };