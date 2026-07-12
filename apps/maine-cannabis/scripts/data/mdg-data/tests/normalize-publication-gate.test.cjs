'use strict';

// Regression test for the publication gate established by the 2026-07-12
// corrective review of MDG-DATA-001.
//
// Contract: when the firecrawl-ingest adapter emits observations with
// period_source=INFERRED (or unset/UNKNOWN), the normalize step MUST NOT
// include them in data.json. They MUST be preserved separately in
// data.json.annotations. The publisher (Ticket 007 downstream) reads only
// data.json — so INFERRED rows are blocked from publication.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

// Helper: build a minimal MDG_DATA_ROOT with a fake capture.
function buildTmpRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-normalize-gate-'));
    const fcDir = path.join(root, 'raw', 'ocp_sales_firecrawl');
    fs.mkdirSync(fcDir, { recursive: true });
    // Write a capture with the Format-B shape (no axis labels).
    fs.writeFileSync(path.join(fcDir, 'ocp-retail-sales-tab1.md'),
        'Sales Revenue,4278391,81967831,158902699,216934352,264636896,254331366,251825300\n');
    t.cleanup.push(() => {
        try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) { /* noop */ }
    });
    return { root, fcDir };
}

// Helper: invoke normalize.cjs with the given MDG_DATA_ROOT, return its
// normalized snapshot dir.
function normalizeOnce(root) {
    const { spawnSync } = require('child_process');
    const result = spawnSync('node',
        [path.resolve(__dirname, '../commands/normalize.cjs'), '--source=ocp_retail_sales'],
        { encoding: 'utf8', env: { ...process.env, MDG_DATA_ROOT: root } });
    if (result.status !== 0) {
        // Diagnostic
        console.error('normalize stdout:', result.stdout);
        console.error('normalize stderr:', result.stderr);
    }
    return result;
}

function run() {
    let pass = 0, fail = 0;

    function t(name, fn) {
        try { fn(); console.log(`ok ${name}`); pass++; }
        catch (e) { console.log(`not ok ${name}`); console.log(`  ${e.message}`); fail++; }
    }

    t('INFERRED rows are split out to data.json.annotations', () => {
        const tlCleanup = [];
        const { root } = buildTmpRoot({ cleanup: tlCleanup });
        try {
            const result = normalizeOnce(root);
            assert.strictEqual(result.status, 0,
                `normalize.cjs exited non-zero:\n${result.stderr}\n${result.stdout}`);
            // Locate normalized dir.
            const normDir = path.join(root, 'normalized/ocp_retail_sales');
            const shaDirs = fs.readdirSync(normDir).filter(s => s !== 'annotations');
            assert.ok(shaDirs.length > 0, 'expected at least one sha-dir under normalized/');
            const inner = fs.readdirSync(path.join(normDir, shaDirs[0]));
            const schemaVersionDirs = inner.filter(n => n.startsWith('schema_version='));
            assert.ok(schemaVersionDirs.length > 0,
                'expected at least one schema_version subdir');
            const snapshotDir = path.join(normDir, shaDirs[0], schemaVersionDirs[0]);
            const dataJson = JSON.parse(fs.readFileSync(path.join(snapshotDir, 'data.json'), 'utf8'));
            // All INFERRED rows should be ABSENT from data.json (the
            // capture above produces ~7 annual values, 12 monthly
            // values, 48 by-category values = 67 INFERRED). data.json
            // contains ZERO observations.
            assert.deepStrictEqual(dataJson.observations, [],
                `data.json should not contain INFERRED rows; got ${dataJson.observations.length}`);
            assert.deepStrictEqual(dataJson.records || [], [],
                'data.json should not contain records (capture was sales)');
            // The artifacts file SHOULD exist and contain them.
            const annPath = path.join(snapshotDir, 'data.json.annotations');
            assert.ok(fs.existsSync(annPath),
                'data.json.annotations should exist when INFERRED rows were filtered');
            const annotations = JSON.parse(fs.readFileSync(annPath, 'utf8'));
            assert.ok(annotations.observations.length > 0,
                `annotations file should contain INFERRED rows; got ${annotations.observations.length}`);
            // Each preserved row must have reporting_period=null and period_source=INFERRED.
            for (const o of annotations.observations) {
                assert.strictEqual(o.reporting_period, null,
                    `INFERRED row has reporting_period=${o.reporting_period}, expected null`);
                assert.strictEqual(o.period_source, 'INFERRED',
                    `INFERRED row missing period_source=INFERRED, got ${o.period_source}`);
                assert.strictEqual(typeof o.series_index, 'number',
                    'INFERRED row missing series_index for re-pairing');
            }
        } finally {
            tlCleanup.forEach(fn => fn());
        }
    });

    t('profile.json records the inferred-defer count', () => {
        const tlCleanup = [];
        const { root } = buildTmpRoot({ cleanup: tlCleanup });
        try {
            const result = normalizeOnce(root);
            assert.strictEqual(result.status, 0);
            // Find the profile.
            const findProfile = (dir) => {
                for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                    const p = path.join(dir, e.name);
                    if (e.isDirectory()) {
                        if (e.name.startsWith('schema_version=')) {
                            return p;
                        }
                        const found = findProfile(p);
                        if (found) return found;
                    }
                }
                return null;
            };
            const root2 = path.join(root, 'normalized/ocp_retail_sales');
            // Walk one sha-dir.
            const sha = fs.readdirSync(root2).find(s => s !== 'annotations');
            const schema = fs.readdirSync(path.join(root2, sha)).find(n => n.startsWith('schema_version='));
            const snapshotDir = path.join(root2, sha, schema);
            const profile = JSON.parse(fs.readFileSync(path.join(snapshotDir, 'profile.json'), 'utf8'));
            assert.strictEqual(profile.observations_inferred_deferred > 0, true,
                `profile.observations_inferred_deferred should be > 0, got ${profile.observations_inferred_deferred}`);
            assert.strictEqual(profile.observations, 0,
                'profile.observations should be 0 (canonical OBSERVED count)');
        } finally {
            tlCleanup.forEach(fn => fn());
        }
    });

    console.log(`\n${pass}/${pass + fail} tests pass`);
    if (fail > 0) process.exit(1);
}

if (require.main === module) run();
