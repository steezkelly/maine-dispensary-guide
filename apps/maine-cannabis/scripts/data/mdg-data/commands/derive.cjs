'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../lib/store.cjs');
const derive = require('../adapters/derive-retail-products.cjs');

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

function canonicalJSON(obj) {
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

function sha256(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function listNormalizedSources(rootDir) {
    // Find all (source_id, sha256) pairs that have a schema_version=1 snapshot.
    const base = path.join(rootDir, 'normalized');
    if (!fs.existsSync(base)) return [];
    const out = [];
    for (const sourceId of fs.readdirSync(base).sort()) {
        const sdir = path.join(base, sourceId);
        if (!fs.statSync(sdir).isDirectory()) continue;
        for (const sha of fs.readdirSync(sdir).sort()) {
            const snapDir = path.join(sdir, sha, 'schema_version=1');
            if (fs.existsSync(snapDir)) out.push({ source_id: sourceId, sha256: sha });
        }
    }
    return out;
}

function makeInputLock(sources, runId) {
    const lock = { schema_version: 1, run_id: runId,
        inputs: sources.map(s => ({ source_id: s.source_id, sha256: s.sha256 })) };
    lock.inputs.sort((a, b) => (a.source_id < b.source_id ? -1
        : a.source_id > b.source_id ? 1 : 0));
    return lock;
}

function makeReleaseId(inputLock) {
    // Per spec: release_id = sha256(canonical sorted input hashes +
    // transform_version + schema_version)[0:16]
    const h = crypto.createHash('sha256');
    for (const i of inputLock.inputs) {
        h.update(i.source_id + ':' + i.sha256 + '\n');
    }
    h.update('transform_version:1\n');
    h.update('schema_version:1\n');
    return h.digest('hex').slice(0, 16);
}

function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'derive',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message });
        process.exit(64);
    }
    const root = store.resolveRoot();
    const sources = listNormalizedSources(root);
    if (!sources.length) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'derive',
            status: 'failed', code: 'NO_NORMALIZED_SOURCES',
            retryable: false, message: 'no normalized snapshots; run data:mdg:normalize first' });
        process.exit(30);
    }
    const runId = 'run-' + Date.now();
    const stagingDir = path.join(root, 'staging', runId);
    fs.mkdirSync(stagingDir, { recursive: true });

    const inputLock = makeInputLock(sources, runId);
    fs.writeFileSync(path.join(stagingDir, 'input-lock.json'), canonicalJSON(inputLock));

    // Determine release metadata
    const ocpSnapDir = path.join(root, 'normalized', 'ocp_licenses',
        inputLock.inputs.find(i => i.source_id === 'ocp_licenses').sha256, 'schema_version=1');
    const ocpProv = JSON.parse(fs.readFileSync(path.join(ocpSnapDir, 'provenance.json'), 'utf8'));
    const ocpProf = JSON.parse(fs.readFileSync(path.join(ocpSnapDir, 'profile.json'), 'utf8'));
    const censusSnapDir = path.join(root, 'normalized', 'census_acs5_population',
        inputLock.inputs.find(i => i.source_id === 'census_acs5_population').sha256, 'schema_version=1');
    const censusProv = JSON.parse(fs.readFileSync(path.join(censusSnapDir, 'provenance.json'), 'utf8'));
    const censusProf = JSON.parse(fs.readFileSync(path.join(censusSnapDir, 'profile.json'), 'utf8'));

    const releaseId = makeReleaseId(inputLock);
    const releaseDir = path.join(stagingDir, 'release', releaseId);
    fs.mkdirSync(path.join(releaseDir, 'products'), { recursive: true });

    let products;
    let blockedGate = null;
    try {
        products = derive.derive(root, {
            ocp_licenses: inputLock.inputs.find(i => i.source_id === 'ocp_licenses').sha256,
            census_acs5_population: inputLock.inputs.find(i => i.source_id === 'census_acs5_population').sha256
        }, {
            release_id: releaseId,
            data_as_of: (() => {
                try {
                    const ocpData = JSON.parse(require('fs').readFileSync(
                        require('path').join(ocpSnapDir, 'data.json'), 'utf8'));
                    return ocpData.snapshot && ocpData.snapshot.source_snapshot_date
                        || null;
                } catch (e) { return null; }
            })(),
            fetched_at_utc: ocpProv.fetched_at_utc || new Date().toISOString(),
            acs_vintage: censusProv.acs_vintage || 2024,
            transform_version: '1',
            preliminary: false
        });
    } catch (err) {
        if (err.code === 'GEOGRAPHY_UNRESOLVED') {
            // Tier 1 publication gate blocked. We do NOT promote a release;
            // we materialize a "blocked" manifest for operator review
            // and exit 50. The excluded rows are recorded in the manifest
            // so the operator can resolve the crosswalk or quarantine the
            // problematic identities and re-run.
            blockedGate = err.gate;
            process.stderr.write(
                'derive: Tier 1 publication gate blocked publication.\n' +
                '  excluded_unmatched_municipality: ' + blockedGate.excluded_unmatched_municipality_count + '\n' +
                '  excluded_null_license: ' + blockedGate.excluded_null_license_count + '\n' +
                '  active_store_identities_total: ' + blockedGate.active_store_identities_total + '\n' +
                '  active_store_identities_resolved: ' + blockedGate.active_store_identities_resolved + '\n' +
                '  No products emitted. Resolve the excluded rows, then re-run.\n');
            const blockedManifest = {
                schema_version: 1,
                release_id: releaseId,
                transform_version: '1',
                inputs: inputLock.inputs,
                files: [],
                disabled_products: [
                    { slug: 'retail-licenses-by-municipality',
                      reason_code: 'GEOGRAPHY_UNRESOLVED',
                      note: 'Tier 1 publication gate: ' + blockedGate.excluded_unmatched_municipality_count + ' active-store identities have unmatched municipalities; ' + blockedGate.excluded_null_license_count + ' have null LICENSE.' },
                    { slug: 'retail-licenses-per-10k',
                      reason_code: 'GEOGRAPHY_UNRESOLVED',
                      note: 'Same Tier 1 publication gate as retail-licenses-by-municipality.' },
                    { slug: 'municipalities-without-retail-license',
                      reason_code: 'GEOGRAPHY_UNRESOLVED',
                      note: 'Same Tier 1 publication gate as retail-licenses-by-municipality.' }
                ],
                blocked_by_gate: blockedGate
            };
            fs.writeFileSync(path.join(releaseDir, 'manifest.json'),
                JSON.stringify(blockedManifest, null, 2) + '\n');
            emit({
                schema_version: 1, component: 'mdg-data', command: 'derive',
                status: 'failed', source_id: null, release_id: releaseId,
                changed: false, retryable: false, code: 'GEOGRAPHY_UNRESOLVED',
                message: 'Tier 1 publication gate blocked. No products emitted.',
                metrics: {
                    release_id: releaseId,
                    release_dir: releaseDir,
                    manifest_path: path.join(releaseDir, 'manifest.json'),
                    gate: blockedGate
                }
            });
            process.exit(50);
        }
        emit({ schema_version: 1, component: 'mdg-data', command: 'derive',
            status: 'failed', code: 'DERIVE_ERROR', retryable: false,
            message: err.message });
        process.exit(50);
    }

    // Materialize products on disk
    const productFiles = [];
    for (const [slug, p] of Object.entries(products)) {
        const jsonPath = path.join(releaseDir, 'products', slug + '.json');
        fs.writeFileSync(jsonPath, p.json);
        productFiles.push({ path: 'products/' + slug + '.json', sha256: sha256(jsonPath) });
        if (p.csv) {
            const csvPath = path.join(releaseDir, 'products', slug + '.csv');
            fs.writeFileSync(csvPath, p.csv);
            productFiles.push({ path: 'products/' + slug + '.csv', sha256: sha256(csvPath) });
        }
        const metaPath = path.join(releaseDir, 'products', slug + '.meta.json');
        fs.writeFileSync(metaPath, JSON.stringify(p.meta, null, 2) + '\n');
        productFiles.push({ path: 'products/' + slug + '.meta.json', sha256: sha256(metaPath) });
    }

    // Manifest
    const manifest = {
        schema_version: 1,
        release_id: releaseId,
        transform_version: '1',
        inputs: inputLock.inputs,
        files: productFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    };
    // The reconciliation product is for internal use; we exclude it
    // from the published manifest but still keep it on disk for
    // operator reference.
    manifest.files = manifest.files.filter(f => !f.path.includes('__reconciliation__'));
    manifest.disabled_products = [];
    const hasOcpSales = inputLock.inputs.some(i => i.source_id === 'ocp_retail_sales');
    const hasOcpOptin = inputLock.inputs.some(i => i.source_id === 'ocp_optin');
    if (censusProv.mock === true) {
        manifest.disabled_products.push({
            slug: 'retail-licenses-per-10k',
            reason_code: 'SOURCE_MOCK_FOR_TESTING',
            note: 'Built from Census API mock fixture; rate values are illustrative.'
        });
        manifest.disabled_products.push({
            slug: 'municipalities-without-retail-license',
            reason_code: 'SOURCE_MOCK_FOR_TESTING',
            note: 'Built from Census API mock fixture; universe is partial.'
        });
    }
    if (hasOcpSales) {
        // Power BI embed — see DECISION-20260711-ocp-powerbi-embed.md
        ['adult-use-retail-sales', 'adult-use-transactions',
         'average-flower-price', 'adult-use-product-mix'].forEach(slug => {
            manifest.disabled_products.push({
                slug: slug,
                reason_code: 'SOURCE_SEMANTICS_UNAPPROVED',
                note: 'OCP retail-sales page embeds a Power BI dashboard with no ' +
                    'documented programmatic data API. See DECISION-20260711-ocp-powerbi-embed.md.'
            });
        });
    }
    if (hasOcpOptin) {
        manifest.disabled_products.push({
            slug: 'retail-optin-gap',
            reason_code: 'SOURCE_SEMANTICS_UNAPPROVED',
            note: 'OCP opt-in page embeds a Power BI dashboard with no ' +
                'documented programmatic data API. See DECISION-20260711-ocp-powerbi-embed.md.'
        });
    }
    fs.writeFileSync(path.join(releaseDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    emit({
        schema_version: 1, component: 'mdg-data', command: 'derive',
        status: 'new_artifact', source_id: null, release_id: releaseId,
        changed: true, retryable: false, code: 'OK',
        message: 'derived ' + manifest.files.length + ' product files',
        metrics: {
            release_id: releaseId,
            input_lock: path.join(stagingDir, 'input-lock.json'),
            release_dir: releaseDir,
            manifest_path: path.join(releaseDir, 'manifest.json'),
            product_count: manifest.files.filter(f => f.path.endsWith('.json')).length,
            mock_derived: censusProv.mock === true
        }
    });
    process.exit(0);
}

main();