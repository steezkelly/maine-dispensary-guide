'use strict';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');
const { loadRegistry, getSource } = require('../lib/registry.cjs');
const ocpLic = require('../adapters/ocp-licenses.cjs');
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

async function fetchOcpLicenses(rootDir, src) {
    // Reuse the latest archived page HTML for discovery.
    const pageHtmlBuf = await fetchLatestPageHtml(rootDir, src.source_id);
    if (!pageHtmlBuf) {
        return { code: 'NO_PAGE_HTML',
            message: 'no archived page HTML found; run check first' };
    }
    try {
        const out = await ocpLic.run(pageHtmlBuf, src.authoritative_page_url, rootDir);
        // Append a source_check reflecting the fetch.
        const sc = store.newSourceCheck({
            sourceId: src.source_id,
            sourcePageUrl: src.authoritative_page_url,
            adapterVersion: src.adapter_version
        });
        sc.discovered_artifact_url = out.csv_url;
        sc.observed_sha256 = out.raw_sha256;
        sc.completed_at_utc = new Date().toISOString();
        sc.status = 'new_artifact';
        sc.message = 'CSV fetched: ' + out.csv_filename + ' rows=' + out.profile.total_rows;
        store.appendSourceCheck(rootDir, sc);
        return { code: 'OK', ...out };
    } catch (err) {
        const sc = store.newSourceCheck({
            sourceId: src.source_id,
            sourcePageUrl: src.authoritative_page_url,
            adapterVersion: src.adapter_version
        });
        sc.status = 'schema_error';
        sc.completed_at_utc = new Date().toISOString();
        sc.message = err.message;
        store.appendSourceCheck(rootDir, sc);
        return { code: err.code || 'ADAPTER_ERROR', message: err.message };
    }
}

async function fetchLatestPageHtml(rootDir, sourceId) {
    // Prefer the most recently modified page.html if multiple exist.
    const arts = store.listRawArtifacts(rootDir, sourceId);
    const pages = arts.filter(p => p.endsWith('/page.html'));
    if (!pages.length) return null;
    pages.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return fs.readFileSync(pages[0]);
}

async function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'fetch',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message });
        process.exit(64);
    }
    if (!args.source) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'fetch',
            status: 'failed', code: 'USAGE_ERROR', retryable: false,
            message: 'missing required --source=<source_id>' });
        process.exit(64);
    }

    const root = store.resolveRoot();
    const reg = loadRegistry();
    const src = getSource(reg, args.source);

    if (src.source_id === 'ocp_licenses') {
        const r = await fetchOcpLicenses(root, src);
        if (r.code !== 'OK') {
            emit({ schema_version: 1, component: 'mdg-data', command: 'fetch',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: r.code, message: r.message });
            process.exit(50);
        }
        emit({
            schema_version: 1, component: 'mdg-data', command: 'fetch',
            status: 'new_artifact', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: r.raw_sha256,
            message: 'CSV fetched and archived; profile emitted',
            metrics: {
                csv_url: r.csv_url,
                csv_filename: r.csv_filename,
                total_rows: r.profile.total_rows,
                raw_path: r.raw_path
            }
        });
        // Also write the profile + fixture to durable normalized path (Ticket 003 acceptance).
        const normDir = path.join(root, 'normalized', src.source_id, r.raw_sha256, 'schema_version=1');
        fs.mkdirSync(normDir, { recursive: true });
        fs.writeFileSync(path.join(normDir, 'data.json'), JSON.stringify({
            source_id: src.source_id, headers: Object.keys(r.fixture.sample_rows[0] || {}),
            fixture: r.fixture, raw_sha256: r.raw_sha256, csv_url: r.csv_url
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify(r.profile) + '\n');
        fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, raw_sha256: r.raw_sha256,
            csv_url: r.csv_url, csv_filename: r.csv_filename,
            adapter_version: src.adapter_version, schema_version: 1
        }) + '\n');
        // Commit a small fixture to the repo (Ticket 003 acceptance:
        // "source-derived parser fixture committed").
        // __dirname is apps/maine-cannabis/scripts/data/mdg-data/commands.
        // 4 levels up lands in apps/maine-cannabis/.
        const fixturePath = path.join(__dirname, '..', '..', '..', '..',
            'docs', 'data', 'mdg-data', 'fixtures', 'ocp_licenses_observed_fixture.json');
        fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
        fs.writeFileSync(fixturePath, JSON.stringify({
            source_id: src.source_id,
            raw_sha256: r.raw_sha256,
            csv_url: r.csv_url,
            headers: Object.keys(r.fixture.sample_rows[0] || {}),
            dropped_columns: r.fixture.dropped_columns,
            sample_rows: r.fixture.sample_rows,
            profile_summary: {
                total_rows: r.profile.total_rows,
                license_status_vocabulary: r.profile.license_status_vocabulary,
                license_type_vocabulary: r.profile.license_type_vocabulary,
                license_number: r.profile.license_number,
                exact_duplicate_rows: r.profile.exact_duplicate_rows,
                repeated_dba_city_count: r.profile.repeated_dba_city_with_distinct_license_numbers.count
            }
        }, null, 2) + '\n');
        process.exit(0);
    }

    if (src.source_id === 'census_acs5_population') {
        let r;
        try {
            r = await censusAcs5.run(root);
        } catch (err) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'fetch',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: err.code || 'CENSUS_ERROR',
                message: err.message });
            process.exit(50);
        }
        const normDir = path.join(root, 'normalized', src.source_id, r.raw_sha256, 'schema_version=1');
        fs.mkdirSync(normDir, { recursive: true });
        fs.writeFileSync(path.join(normDir, 'data.json'), JSON.stringify({
            source_id: src.source_id,
            acs_vintage: r.acs_vintage,
            variable_id: r.variable_id,
            comparison_geography: r.comparison_geography,
            raw_sha256: r.raw_sha256,
            mock: r.source === 'mock',
            fixture_note: r.fixture_note
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'population_observations.json'),
            JSON.stringify(r.population_observations) + '\n');
        fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify({
            source: r.source,
            acs_vintage: r.acs_vintage,
            variable_id: r.variable_id,
            state_fips: r.state_fips,
            diagnostics: r.diagnostics,
            fixture_note: r.fixture_note
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, raw_sha256: r.raw_sha256,
            acs_vintage: r.acs_vintage, variable_id: r.variable_id,
            adapter_version: src.adapter_version, schema_version: 1,
            mock: r.source === 'mock'
        }) + '\n');
        emit({
            schema_version: 1, component: 'mdg-data', command: 'fetch',
            status: 'new_artifact', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: r.raw_sha256,
            message: r.source === 'mock'
                ? 'ACS 2024 mock fixture used (CENSUS_API_KEY not set); see DECISION-20260711'
                : 'ACS 2024 census_acs5_population snapshot archived',
            metrics: {
                source: r.source,
                acs_vintage: r.acs_vintage,
                variable_id: r.variable_id,
                valid_rows: r.diagnostics.valid_rows,
                null_population: r.diagnostics.null_population,
                invalid_geoid: r.diagnostics.invalid_geoid,
                raw_path: r.raw_path
            }
        });
        process.exit(0);
    }

    const dashSrcIds = ['ocp_retail_sales', 'ocp_optin'];
    if (dashSrcIds.includes(src.source_id)) {
        // First: check for manual artifacts. If present, prefer them
        // over the Power BI dashboard (per operator override 2026-07-12).
        // Manual artifacts are CSVs the operator exported from the
        // Power BI UI and dropped into $MDG_DATA_ROOT/raw/<source>/manual/.
        const manualAdapter = src.source_id === 'ocp_retail_sales'
            ? require('../adapters/ocp-retail-sales-manual.cjs')
            : require('../adapters/ocp-optin-manual.cjs');
        const manualOut = manualAdapter.run(root);
        if (manualOut.artifacts.length > 0) {
            // Archive each manual artifact and write a profile + provenance
            // to a normalized path keyed by the manual sha.
            for (const a of manualOut.artifacts) {
                const normDir = path.join(root, 'normalized', src.source_id, a.raw_sha256, 'schema_version=1');
                fs.mkdirSync(normDir, { recursive: true });
                fs.writeFileSync(path.join(normDir, 'profile.json'),
                    JSON.stringify({ source: 'manual', tab_slug: a.tab_slug,
                        tab_label: a.tab_label, schema: a.profile }, null, 2) + '\n');
                fs.writeFileSync(path.join(normDir, 'provenance.json'),
                    JSON.stringify({ source_id: src.source_id,
                        raw_sha256: a.raw_sha256, origin: 'manual_csv_export',
                        tab_slug: a.tab_slug, original_path: a.original_path,
                        adapter_version: '1-manual', schema_version: 1 }, null, 2) + '\n');
            }
            const code = manualOut.artifacts.length === 1 ? 'OK' : 'OK';
            emit({
                schema_version: 1, component: 'mdg-data', command: 'fetch',
                status: 'new_artifact', source_id: src.source_id, release_id: null,
                changed: true, retryable: false, code: code,
                artifact_sha256: manualOut.artifacts[0].raw_sha256,
                message: 'manual artifacts ingested: ' + manualOut.artifacts.length + ' tab(s)',
                metrics: {
                    source: 'manual',
                    tabs: manualOut.artifacts.map(a => a.tab_slug),
                    headers: manualOut.artifacts[0].profile.headers,
                    row_count: manualOut.artifacts[0].profile.row_count,
                    raw_paths: manualOut.artifacts.map(a => a.raw_path)
                }
            });
            process.exit(0);
        }
        // No manual artifacts: fall back to the Power BI dashboard
        // transport-discovery path (Ticket 009/010).
        const ocpDash = require('../adapters/ocp-dashboard-discovery.cjs');
        let r;
        try {
            r = await ocpDash.run(root, src);
        } catch (err) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'fetch',
                status: 'failed', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: err.code || 'DASHBOARD_ERROR',
                message: err.message });
            process.exit(50);
        }
        const reportJson = JSON.stringify(r.transport_discovery, null, 2) + '\n';
        const reportSha = store.sha256(Buffer.from(reportJson));
        const normDir = path.join(root, 'normalized', src.source_id, reportSha, 'schema_version=1');
        fs.mkdirSync(normDir, { recursive: true });
        fs.writeFileSync(path.join(normDir, 'transport_discovery.json'), reportJson);
        fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify({
            dashboard_family: r.transport_discovery.dashboard_family,
            iframe_url: r.transport_discovery.iframe_url,
            programmatic_data_api: r.transport_discovery.programmatic_data_api
        }) + '\n');
        fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, transport_discovery_sha256: reportSha,
            adapter_version: '0-discovery', schema_version: 1
        }) + '\n');
        emit({
            schema_version: 1, component: 'mdg-data', command: 'fetch',
            status: 'unchanged', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: reportSha,
            message: 'dashboard transport discovery archived; production parser pending operator approval',
            metrics: {
                dashboard_family: r.transport_discovery.dashboard_family,
                iframe_url: r.transport_discovery.iframe_url,
                programmatic_data_api: r.transport_discovery.programmatic_data_api,
                normalized_path: normDir
            }
        });
        process.exit(0);
    }

    emit({
        schema_version: 1, component: 'mdg-data', command: 'fetch',
        status: 'unchanged', source_id: src.source_id, release_id: null,
        changed: false, retryable: false, code: 'ADAPTER_NOT_YET_WIRED',
        message: 'fetch command for ' + src.source_id + ' is not yet implemented'
    });
    process.exit(0);
}

main();