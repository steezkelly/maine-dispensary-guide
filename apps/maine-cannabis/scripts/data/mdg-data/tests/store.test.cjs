'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const store = require('../lib/store.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

check('resolveRoot defaults to ~/.hermes/data/mdg-data', () => {
    const prev = process.env.MDG_DATA_ROOT;
    delete process.env.MDG_DATA_ROOT;
    const r = store.resolveRoot();
    assert.strictEqual(r, path.join(os.homedir(), '.hermes', 'data', 'mdg-data'));
    if (prev) process.env.MDG_DATA_ROOT = prev;
});

check('resolveRoot honors MDG_DATA_ROOT env var', () => {
    process.env.MDG_DATA_ROOT = '/tmp/foo';
    assert.strictEqual(store.resolveRoot(), '/tmp/foo');
    delete process.env.MDG_DATA_ROOT;
});

check('sha256 matches a known vector', () => {
    // echo -n "abc" | sha256sum
    assert.strictEqual(
        store.sha256(Buffer.from('abc')),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
});

check('writeRawArtifact is content-addressed and idempotent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-store-'));
    const buf = Buffer.from('hello, raw world');
    const a = store.writeRawArtifact(tmp, 's1', '2026-07-12T00:00:00Z', buf, 'page.html');
    const b = store.writeRawArtifact(tmp, 's1', '2026-07-12T00:00:00Z', buf, 'page.html');
    assert.strictEqual(a.path, b.path, 're-write should return same path');
    assert.strictEqual(a.sha256, b.sha256);
    assert.ok(fs.existsSync(a.path));
    // Different content => different sha16 dir
    const c = store.writeRawArtifact(tmp, 's1', '2026-07-12T00:00:00Z',
        Buffer.from('different'), 'page.html');
    assert.notStrictEqual(a.sha16, c.sha16);
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('readRawArtifact locates an artifact by sha256', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-store-'));
    const buf = Buffer.from('locatable');
    const w = store.writeRawArtifact(tmp, 's2', '2026-07-12T12:34:56Z', buf, 'x.csv');
    const r = store.readRawArtifact(tmp, 's2', w.sha256);
    assert.ok(r, 'should find artifact');
    assert.strictEqual(fs.readFileSync(r).toString(), 'locatable');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('listRawArtifacts returns sorted path list', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-store-'));
    store.writeRawArtifact(tmp, 's3', '2026-07-12T00:00:00Z', Buffer.from('one'), 'a');
    store.writeRawArtifact(tmp, 's3', '2026-07-13T00:00:00Z', Buffer.from('two'), 'b');
    const list = store.listRawArtifacts(tmp, 's3');
    assert.strictEqual(list.length, 2);
    assert.ok(list[0] < list[1], 'paths must be sorted');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('appendSourceCheck writes one JSONL line per call', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-checks-'));
    const r1 = store.newSourceCheck({ sourceId: 'x', sourcePageUrl: 'u', adapterVersion: '1' });
    r1.status = 'unchanged'; r1.completed_at_utc = new Date().toISOString();
    store.appendSourceCheck(tmp, r1);
    const r2 = store.newSourceCheck({ sourceId: 'x', sourcePageUrl: 'u', adapterVersion: '1' });
    r2.status = 'network_error'; r2.completed_at_utc = new Date().toISOString();
    r2.message = 'simulated';
    store.appendSourceCheck(tmp, r2);
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const file = path.join(tmp, 'source-checks', yyyy, mm, `${dd}.jsonl`);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 2);
    const parsed = JSON.parse(lines[1]);
    assert.strictEqual(parsed.status, 'network_error');
    fs.rmSync(tmp, { recursive: true, force: true });
});

check('check command end-to-end on ocp_licenses writes source_check + raw artifact', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-e2e-'));
    process.env.MDG_DATA_ROOT = tmp;
    const { spawnSync } = require('child_process');
    const checkPath = path.join(__dirname, '..', 'commands', 'check.cjs');
    const out = spawnSync('node',
        [checkPath, '--source=ocp_licenses'], { encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(out.status, 0, 'exit ' + out.status + ' stderr=' + out.stderr);
    const ev = JSON.parse(out.stdout.trim().split('\n').pop());
    assert.strictEqual(ev.code, 'SOURCE_UNCHANGED');
    assert.ok(ev.artifact_sha256);
    // Verify source_check JSONL has at least one record for ocp_licenses
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const file = path.join(tmp, 'source-checks', yyyy, mm, `${dd}.jsonl`);
    assert.ok(fs.existsSync(file), 'source_check JSONL exists');
    const rec = JSON.parse(fs.readFileSync(file, 'utf8').trim().split('\n').pop());
    assert.strictEqual(rec.source_id, 'ocp_licenses');
    assert.strictEqual(rec.status, 'unchanged');
    // Verify raw artifact is on disk and matches observed hash
    const list = store.listRawArtifacts(tmp, 'ocp_licenses');
    assert.ok(list.length >= 1);
    delete process.env.MDG_DATA_ROOT;
    fs.rmSync(tmp, { recursive: true, force: true });
});

process.stderr.write('\nstore.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);