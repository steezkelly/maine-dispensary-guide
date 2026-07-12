'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const assert = require('assert');

const REG_PATH = path.join(__dirname, '..', 'sources.json');
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');
const REGISTRY = require('../lib/registry.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

check('real registry file loads with schema_version 1', () => {
    const reg = REGISTRY.loadRegistry(REG_PATH);
    assert.strictEqual(reg.schema_version, 1);
});

check('real registry lists all four required source_ids (sorted)', () => {
    const reg = REGISTRY.loadRegistry(REG_PATH);
    const ids = REGISTRY.listSourceIds(reg);
    assert.deepStrictEqual(ids, [
        'census_acs5_population',
        'ocp_licenses',
        'ocp_optin',
        'ocp_retail_sales'
    ]);
});

check('census source has vintage=2024 and variable_id=B01003_001E', () => {
    const reg = REGISTRY.loadRegistry(REG_PATH);
    const c = REGISTRY.getSource(reg, 'census_acs5_population');
    assert.strictEqual(c.acs.vintage, 2024);
    assert.strictEqual(c.acs.variable_id, 'B01003_001E');
});

check('no OCP source hard-codes an April 2026 CSV URL', () => {
    const reg = REGISTRY.loadRegistry(REG_PATH);
    for (const s of reg.sources) {
        if (s.family !== 'ocp') continue;
        const j = JSON.stringify(s);
        assert.ok(!j.includes('2026_04_01'), s.source_id + ' hard-codes April 2026');
        assert.ok(!j.includes('2026-04-01'), s.source_id + ' hard-codes April 2026');
    }
});

check('registry validator rejects duplicate source_id', () => {
    const bad = {
        schema_version: 1,
        sources: [
            { source_id: 'a', family: 'x', authoritative_page_url: 'u',
              adapter_version: '1', schema_policy: 'p', freshness_policy: 'p' },
            { source_id: 'a', family: 'x', authoritative_page_url: 'u',
              adapter_version: '1', schema_policy: 'p', freshness_policy: 'p' }
        ]
    };
    const errs = REGISTRY.validate(bad);
    assert.ok(errs.some(e => e.includes('duplicate')), 'expected duplicate error');
});

check('registry validator rejects non-2024 ACS vintage', () => {
    const bad = {
        schema_version: 1,
        sources: [
            { source_id: 'census_acs5_population', family: 'census',
              authoritative_page_url: 'u', adapter_version: '1',
              schema_policy: 'p', freshness_policy: 'p',
              acs: { vintage: 2023, variable_id: 'B01003_001E' } }
        ]
    };
    const errs = REGISTRY.validate(bad);
    assert.ok(errs.some(e => e.includes('vintage')), 'expected vintage error');
});

check('registry validator rejects hard-coded April 2026 URL', () => {
    const bad = {
        schema_version: 1,
        sources: [
            { source_id: 'ocp_licenses', family: 'ocp',
              authoritative_page_url: 'https://x.gov/Adult_Use_Establishments_2026_04_01.csv',
              adapter_version: '1', schema_policy: 'p', freshness_policy: 'p' }
        ]
    };
    const errs = REGISTRY.validate(bad);
    assert.ok(errs.some(e => e.includes('April 2026')), 'expected April 2026 error');
});

process.stderr.write('\nregistry.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
if (fail > 0) process.exit(1);

check('verify command passes on a hand-built release dir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-verify-'));
    const f1 = path.join(tmp, 'a.json');
    fs.writeFileSync(f1, JSON.stringify({ ok: 1 }) + '\n');
    const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    const manifest = { release_id: 'test-release-id', files: [{ path: 'a.json', sha256: sha(f1) }] };
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(manifest));
    const { spawnSync } = require('child_process');
    const verifyPath = path.join(COMMANDS_DIR, 'verify.cjs');
    const out = spawnSync('node', [verifyPath, '--release-dir=' + tmp], { encoding: 'utf8' });
    assert.strictEqual(out.status, 0, 'verify exit ' + out.status + ' stderr=' + out.stderr);
    const ev = JSON.parse(out.stdout.trim().split('\n').pop());
    assert.strictEqual(ev.command, 'verify');
    assert.strictEqual(ev.code, 'OK');
    assert.strictEqual(ev.release_id, 'test-release-id');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('verify command fails on tampered release file (exit 50)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-verify-'));
    fs.writeFileSync(path.join(tmp, 'a.json'), JSON.stringify({ ok: 1 }) + '\n');
    fs.writeFileSync(path.join(tmp, 'manifest.json'),
        JSON.stringify({ release_id: 'tampered', files: [{ path: 'a.json', sha256: '0'.repeat(64) }] }));
    const { spawnSync } = require('child_process');
    const out = spawnSync('node',
        [path.join(COMMANDS_DIR, 'verify.cjs'), '--release-dir=' + tmp],
        { encoding: 'utf8' });
    assert.strictEqual(out.status, 50, 'expected 50, got ' + out.status);
    const ev = JSON.parse(out.stdout.trim().split('\n').pop());
    assert.strictEqual(ev.code, 'MANIFEST_HASH_MISMATCH');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('check command skeleton accepts known source_id (exit 0)', () => {
    const { spawnSync } = require('child_process');
    const out = spawnSync('node',
        [path.join(COMMANDS_DIR, 'check.cjs'), '--source=ocp_licenses'],
        { encoding: 'utf8' });
    assert.strictEqual(out.status, 0, 'expected 0, got ' + out.status);
    const ev = JSON.parse(out.stdout.trim().split('\n').pop());
    assert.strictEqual(ev.command, 'check');
    assert.strictEqual(ev.source_id, 'ocp_licenses');
});

check('check command skeleton rejects unknown source_id (exit 64)', () => {
    const { spawnSync } = require('child_process');
    const out = spawnSync('node',
        [path.join(COMMANDS_DIR, 'check.cjs'), '--source=does_not_exist'],
        { encoding: 'utf8' });
    assert.strictEqual(out.status, 64, 'expected 64, got ' + out.status);
    const ev = JSON.parse(out.stdout.trim().split('\n').pop());
    assert.strictEqual(ev.code, 'UNKNOWN_SOURCE_ID');
});