'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function latestRawAny(rootDir, sourceId) {
    // Return the most recent raw file (not directory) under raw/{sourceId}.
    // listRawArtifacts returns every path including directories; we
    // need a file. We also pick the .csv with the most recent mtime.
    const arts = store.listRawArtifacts(rootDir, sourceId);
    if (!arts.length) return null;
    const files = arts.filter(p => fs.statSync(p).isFile()
        && !p.includes('source-checks') && !p.endsWith('manual'));
    // Prefer CSV (manual exports are CSVs)
    const csvs = files.filter(p => p.endsWith('.csv'));
    if (csvs.length) {
        csvs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        return csvs[0];
    }
    files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return files[0] || null;
}

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

    // Firecrawl-ingest path (Ticket 009/010 corrective, second
    // production path). Triggered when firecrawl-captured markdown
    // reports are present under raw/ocp_{sales,optin}_firecrawl/.
    const firecrawlSrcIds = ['ocp_retail_sales', 'ocp_optin'];
    if (firecrawlSrcIds.includes(src.source_id)) {
        const fcDirMap = { ocp_retail_sales: 'ocp_sales_firecrawl', ocp_optin: 'ocp_optin_firecrawl' };
        const fcDir = path.join(root, 'raw', fcDirMap[src.source_id]);
        if (fs.existsSync(fcDir) && fs.readdirSync(fcDir).some(f => f.endsWith('.md'))) {
            const fc = require('../adapters/ocp-firecrawl-ingest.cjs');
            const out = fc.run(src.source_id, root);
            const hasObs = out.observations && out.observations.length > 0;
            const hasRec = out.records && out.records.length > 0;
            if (hasObs || hasRec) {
                // PUBLICATION GATE per 2026-07-12 corrective review.
                //
                // INFERRED rows have a `period_source='INFERRED'` flag with
                // reporting_period=null. They are positional extraction
                // artifacts (we know value[7] but not which year it maps
                // to). Per finding 1, INFERRED rows MUST NOT be published
                // as canonical observations. We split them out:
                //   - canonical: OBSERVED only, written to data.json
                //   - artifacts: every non-OBSERVED row, written to
                //                data.json.annotations (separate file;
                //                preserves the data so future
                //                axis-label capture can re-pair by
                //                series_index)
                //
                // Tickets 007+ cannot use INFERRED rows until axis
                // labels are captured. See MDG-DATA-001-COMMISSIONING.md.
                let canonicalObs = [];
                let inferredObs = [];
                if (hasObs) {
                    for (const o of out.observations) {
                        const src = o.period_source;
                        if (!src || src === 'OBSERVED') {
                            canonicalObs.push(o);
                        } else {
                            inferredObs.push(o);
                        }
                    }
                }
                // Content hash of all firecrawl markdown files for stable snapshot id
                const files = fs.readdirSync(fcDir).filter(f => f.endsWith('.md')).sort();
                let sha = '';
                for (const f of files) {
                    sha += crypto.createHash('sha256')
                        .update(fs.readFileSync(path.join(fcDir, f))).digest('hex');
                }
                sha = crypto.createHash('sha256').update(sha).digest('hex');
                const snapshotId = 'snap-' + crypto.createHash('sha256')
                    .update(src.source_id + '|' + sha + '|schema_version=1').digest('hex').slice(0, 16);
                const normDir = path.join(root, 'normalized', src.source_id, sha, 'schema_version=1');
                fs.mkdirSync(normDir, { recursive: true });
                fs.writeFileSync(path.join(normDir, 'data.json'), JSON.stringify({
                    source_id: src.source_id, snapshot_id: snapshotId,
                    observations: canonicalObs,
                    records: out.records || []
                }, null, 2) + '\n');
                if (inferredObs.length > 0) {
                    fs.writeFileSync(path.join(normDir, 'data.json.annotations'), JSON.stringify({
                        source_id: src.source_id, snapshot_id: snapshotId,
                        reason: 'INFERRED rows preserved separately; not eligible for publication. Re-pair by series_index + series_direction when axis labels become available.',
                        observations: inferredObs
                    }, null, 2) + '\n');
                } else if (fs.existsSync(path.join(normDir, 'data.json.annotations'))) {
                    // Stale annotation file from a prior run with INFERREDs
                    // that have since been labeled — remove it so downstream
                    // publishers can re-evaluate.
                    fs.unlinkSync(path.join(normDir, 'data.json.annotations'));
                }
                fs.writeFileSync(path.join(normDir, 'profile.json'), JSON.stringify({
                    source: 'firecrawl_interact',
                    origin: 'firecrawl_interact_capture',
                    observations: canonicalObs.length,
                    observations_inferred_deferred: inferredObs.length,
                    records: (out.records || []).length,
                    capture_date: new Date().toISOString().slice(0, 10)
                }, null, 2) + '\n');
                fs.writeFileSync(path.join(normDir, 'provenance.json'), JSON.stringify({
                    source_id: src.source_id, raw_sha256: sha,
                    snapshot_id: snapshotId, origin: 'firecrawl_interact_capture',
                    adapter_version: '1-firecrawl', schema_version: 1
                }, null, 2) + '\n');
                const key = hasObs ? 'observations' : 'records';
                emit({
                    schema_version: 1, component: 'mdg-data', command: 'normalize',
                    status: 'unchanged', source_id: src.source_id, release_id: null,
                    changed: true, retryable: false, code: 'OK',
                    artifact_sha256: sha,
                    message: `firecrawl-captured dashboard data normalized; ${canonicalObs.length} canonical + ${inferredObs.length} inferred rows ${inferredObs.length > 0 ? '(inferred saved as annotations file; not eligible for publication)' : '(no inferred rows)'}`,
                    metrics: {
                        source: 'firecrawl_interact',
                        origin: 'firecrawl_interact_capture',
                        [key]: hasObs ? canonicalObs.length : (out.records || []).length,
                        observations_inferred_deferred: inferredObs.length,
                        snapshot_id: snapshotId,
                        normalized_path: normDir
                    }
                });
                process.exit(0);
            }
        }
    }

    // Manual artifact normalize path (Ticket 009/010 corrective).
    // Triggered when the most-recent raw artifact is under a manual/
    // subdirectory of the raw source path.
    const manualSrcIds = ['ocp_retail_sales', 'ocp_optin'];
    if (manualSrcIds.includes(src.source_id)) {
        const latestRaw = latestRawAny(root, src.source_id);
        if (latestRaw && latestRaw.includes('/manual/')) {
            const manualNorm = require('../adapters/ocp-manual-normalize.cjs');
            let out;
            try {
                out = src.source_id === 'ocp_retail_sales'
                    ? manualNorm.normalizeManualSales(latestRaw,
                        { fetched_at_utc: new Date().toISOString() })
                    : manualNorm.normalizeManualOptin(latestRaw,
                        { fetched_at_utc: new Date().toISOString() });
            } catch (err) {
                emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
                    status: 'failed', source_id: src.source_id, release_id: null,
                    changed: false, retryable: false, code: 'NORMALIZE_ERROR',
                    message: err.message });
                process.exit(50);
            }
            const sha = store.sha256(fs.readFileSync(latestRaw));
            const normDir = path.join(root, 'normalized', src.source_id, sha, 'schema_version=1');
            fs.mkdirSync(normDir, { recursive: true });
            fs.writeFileSync(path.join(normDir, 'data.json'),
                JSON.stringify(out, null, 2) + '\n');
            fs.writeFileSync(path.join(normDir, 'provenance.json'),
                JSON.stringify(Object.assign(out.snapshot, { source_id: src.source_id }), null, 2) + '\n');
            const observationKey = src.source_id === 'ocp_retail_sales'
                ? 'observations' : 'records';
            emit({
                schema_version: 1, component: 'mdg-data', command: 'normalize',
                status: 'unchanged', source_id: src.source_id, release_id: null,
                changed: true, retryable: false, code: 'OK',
                artifact_sha256: sha,
                message: 'manual artifact normalized; ' + (out[observationKey] || []).length
                    + ' ' + observationKey + ' emitted (schema_needs_review)',
                metrics: {
                    source: 'manual',
                    origin: 'manual_csv_export',
                    [observationKey]: (out[observationKey] || []).length,
                    snapshot_id: out.snapshot.snapshot_id,
                    normalized_path: normDir,
                    note: 'metric_norm and activity_norm are placeholder; operator ' +
                        'should update ocp-manual-normalize.cjs to map column headers ' +
                        'to canonical metric/activity names.'
                }
            });
            process.exit(0);
        }
    }

    // Dispensary directory (MDG-ANALYTICS-001 / 280E price tracker path).
    if (src.source_id === 'ocp_dispensaries_firecrawl') {
        const dir = require('../adapters/ocp-dispensary-directory.cjs');
        const out = dir.run(root);
        if (!out.dispensaries.length && !out.findall_runs.length) {
            emit({ schema_version: 1, component: 'mdg-data', command: 'normalize',
                status: 'unchanged', source_id: src.source_id, release_id: null,
                changed: false, retryable: false, code: 'NO_ARTIFACTS',
                message: out.note || 'no dispensary artifacts present' });
            process.exit(0);
        }
        // Content hash of all artifacts
        const dir2 = require('path').join(root, 'raw', 'ocp_dispensaries_firecrawl');
        let sha = '';
        for (const f of require('fs').readdirSync(dir2).filter(f => f.endsWith('.json')).sort()) {
            sha += require('crypto').createHash('sha256')
                .update(require('fs').readFileSync(require('path').join(dir2, f))).digest('hex');
        }
        sha = require('crypto').createHash('sha256').update(sha).digest('hex');
        const snapshotId = 'snap-' + require('crypto').createHash('sha256')
            .update(src.source_id + '|' + sha + '|schema_version=1').digest('hex').slice(0, 16);
        const normDir = require('path').join(root, 'normalized', src.source_id, sha, 'schema_version=1');
        require('fs').mkdirSync(normDir, { recursive: true });
        require('fs').writeFileSync(require('path').join(normDir, 'data.json'), JSON.stringify({
            source_id: src.source_id, snapshot_id: snapshotId,
            dispensaries: out.dispensaries, findall_runs: out.findall_runs
        }, null, 2) + '\n');
        require('fs').writeFileSync(require('path').join(normDir, 'profile.json'), JSON.stringify({
            source: 'ocp_csv_enumeration+findall',
            dispensaries: out.dispensaries.length,
            findall_runs: out.findall_runs.length
        }, null, 2) + '\n');
        require('fs').writeFileSync(require('path').join(normDir, 'provenance.json'), JSON.stringify({
            source_id: src.source_id, raw_sha256: sha,
            snapshot_id: snapshotId, origin: 'ocp_csv_enumeration',
            adapter_version: '1-dispensary-directory', schema_version: 1
        }, null, 2) + '\n');
        emit({
            schema_version: 1, component: 'mdg-data', command: 'normalize',
            status: 'unchanged', source_id: src.source_id, release_id: null,
            changed: true, retryable: false, code: 'OK',
            artifact_sha256: sha,
            message: 'dispensary directory normalized; ' + out.dispensaries.length +
                ' dispensaries, ' + out.findall_runs.length + ' findall runs',
            metrics: {
                dispensaries: out.dispensaries.length,
                findall_runs: out.findall_runs.length,
                snapshot_id: snapshotId,
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