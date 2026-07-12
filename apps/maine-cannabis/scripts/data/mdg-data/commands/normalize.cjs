'use strict';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');
const { loadRegistry, getSource } = require('../lib/registry.cjs');
const xw = require('../lib/crosswalk.cjs');
const norm = require('../adapters/ocp-license-normalizer.cjs');
const censusAcs5 = require('../adapters/census-acs5.cjs');

function parseArgs(argv) {
    const out = {};
    for (const a of argv) {
        if (!a.startsWith('--')) throw new Error('unexpected positional arg: ' + a);
        const eq = a.indexOf('=');
        if (eq < 0) throw new Error('expected --key=value form: ' + a);
        out[a.slice(2, eq)] = a.slice(eq + 1);
    }
    return out;
}
function emit(ev) { process.stdout.write(JSON.stringify(ev) + '\n'); }

function latestRawJson(rootDir, sourceId) {
    const arts = store.listRawArtifacts(rootDir, sourceId);
    const jsons = arts.filter(p => p.endsWith('.json') && !p.includes('source-checks'));
    if (!jsons.length) return null;
    jsons.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return jsons[0];
}

function latestRawCsv(rootDir, sourceId) {
    const arts = store.listRawArtifacts(rootDir, sourceId);
    const csvs = arts.filter(p => p.endsWith('.csv'));
    if (!csvs.length) return null;
    csvs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return csvs[0];
}

async function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message });
        process.exit(64);
    }
    if (!args.source) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
            status: 'failed', code: 'USAGE_ERROR', retryable: false,
            message: 'missing required --source=<source_id>' });
        process.exit(64);
    }
    const root = store.resolveRoot();
    const reg = loadRegistry();
    const src = getSource(reg, args.source);

    if (src.source_id === 'ocp_licenses') {
        const csv = latestRawCsv(root, src.source_id);
        if (!csv) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: 'NO_RAW_ARTIFACT',
                message: 'no raw CSV found; run data:mdg:fetch first' });
            process.exit(30);
        }
        const crosswalk = xw.loadCrosswalk();
        let out;
        try { out = norm.normalize(csv, crosswalk, { fetched_at_utc: new Date().toISOString() }); }
        catch (err) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: 'NORMALIZE_ERROR',
                message: err.message });
            process.exit(50);
        }
        const normDir = path.join(root, 'normalized', src.source_id, out.snapshot.source_sha256, 'schema_version=1');
        fs.mkdirSync(normDir, { recursive: true });
        fs.writeFileSync(path.join(normDir, 'data.json'),
            JSON.stringify({ snapshot: out.snapshot, records: out.records }) + '\n');
        fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify(out.profile) + '\n');
        fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, source_sha256: out.snapshot.source_sha256,
            adapter_version: src.adapter_version, schema_version: 1,
            identity_rule: 'LICENSE for non-null; sha256(TYPE|DBA|CITY)[0:16] for null'
        }) + '\n');
        emit({
            schema_version: 1, component: 'mdg-data', command: 'normalize',
            status: 'unchanged', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: out.snapshot.source_sha256,
            message: 'normalized OCP licenses; identity rule = LICENSE',
            metrics: {
                total_rows: out.profile.total_rows,
                unique_identity_keys: out.profile.identity_uniqueness.unique_identity_keys,
                distinct_active_store_identities: out.profile.distinct_active_store_identities,
                active_store_geoid_count: out.profile.active_store_geoid_count,
                unmatched_municipality_count: out.profile.unmatched_municipality_count,
                normalized_path: normDir
            }
        });
        process.exit(0);
    }

    if (src.source_id === 'census_acs5_population') {
        // Re-derive canonical records from the archived raw artifact
        // (no network — the raw JSON was archived by data:mdg:fetch).
        const latestRaw = latestRawJson(root, src.source_id);
        if (!latestRaw) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: 'NO_RAW_ARTIFACT',
                message: 'no raw JSON found; run data:mdg:fetch first' });
            process.exit(30);
        }
        const env = JSON.parse(fs.readFileSync(latestRaw, 'utf8'));
        const apiJson = env.response || env; // unwrap mock envelope
        const parsed = censusAcs5.parseApiResponse(apiJson);
        const canonical = censusAcs5.toCanonicalRecords(parsed.rows);
        const sha = store.sha256(fs.readFileSync(latestRaw));
        const isMock = /\.mock\.json$/.test(latestRaw);
        const normDir = path.join(root, 'normalized', src.source_id, sha, 'schema_version=1');
        fs.mkdirSync(normDir, { recursive: true });
        fs.writeFileSync(path.join(normDir, 'data.json'), JSON.stringify({
            source_id: src.source_id, acs_vintage: 2024,
            variable_id: 'B01003_001E',
            comparison_geography: canonical.comparison,
            raw_sha256: sha, mock: isMock,
            fixture_note: isMock ? 'Census API key not present; using deterministic mock fixture.'
                : null
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'population_observations.json'),
            JSON.stringify(canonical.population) + '\n');
        fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify({
            source: isMock ? 'mock' : 'live',
            acs_vintage: 2024, variable_id: 'B01003_001E',
            state_fips: '23', diagnostics: parsed.diagnostics
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, raw_sha256: sha,
            acs_vintage: 2024, variable_id: 'B01003_001E',
            adapter_version: src.adapter_version, schema_version: 1, mock: isMock
        }) + '\n');
        emit({
            schema_version: 1, component: 'mdg-data', command: 'normalize',
            status: 'unchanged', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: sha,
            message: isMock
                ? 'ACS 2024 mock fixture normalized; set CENSUS_API_KEY for live data'
                : 'ACS 2024 census_acs5_population normalized',
            metrics: {
                source: isMock ? 'mock' : 'live',
                acs_vintage: 2024, variable_id: 'B01003_001E',
                valid_rows: parsed.diagnostics.valid_rows,
                comparison_geography_count: canonical.comparison.length,
                population_observation_count: canonical.population.length,
                normalized_path: normDir
            }
        });
        process.exit(0);
    }

    emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
        status: 'unchanged', source_id: src.source_id, release_id: null,
        changed: false, retryable: false, code: 'ADAPTER_NOT_YET_WIRED',
        message: 'normalize command for ' + src.source_id + ' is not yet implemented' });
    process.exit(0);
}

main();