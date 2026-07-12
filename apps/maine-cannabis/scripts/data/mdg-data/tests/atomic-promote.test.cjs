'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const assert = require('assert');
const promote = require('../adapters/atomic-promote.cjs');

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

function sha256(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function buildFakeRelease(releaseId) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-release-'));
    fs.mkdirSync(path.join(dir, 'products'), { recursive: true });
    const files = [
        { path: 'manifest.json', content: '{"schema_version":1,"release_id":"'
            + releaseId + '","transform_version":"1","inputs":[],"files":[]}' },
        { path: 'products/a.json', content: '{"hello":"world"}\n' },
        { path: 'products/a.csv', content: 'col\nval\n' },
        { path: 'products/a.meta.json', content: '{"title":"a"}\n' }
    ];
    for (const f of files) {
        fs.writeFileSync(path.join(dir, f.path), f.content);
    }
    // Rewrite manifest with correct sha256s
    const manifest = {
        schema_version: 1,
        release_id: releaseId,
        transform_version: '1',
        inputs: [],
        files: files.slice(1).map(f => ({
            path: f.path, sha256: sha256(path.join(dir, f.path))
        }))
    };
    fs.writeFileSync(path.join(dir, 'manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n');
    return dir;
}

// Use an isolated current/ inside a temp directory so we don't touch
// the real publication path during tests.
const TEST_PUB_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-pub-'));
const TEST_CURRENT = path.join(TEST_PUB_ROOT, 'current');
function opt() { return { currentDir: TEST_CURRENT }; }

// Monkey-patch the exports' CURRENT_DIR getter for any legacy callers
Object.defineProperty(promote, 'CURRENT_DIR', {
    get() { return TEST_CURRENT; }
});

check('verifyManifest validates a fresh release', () => {
    const dir = buildFakeRelease('verify-test-1');
    const m = promote.verifyManifest(dir);
    assert.strictEqual(m.release_id, 'verify-test-1');
    assert.strictEqual(m.files.length, 3);
});

check('verifyManifest rejects manifest hash mismatch', () => {
    const dir = buildFakeRelease('verify-test-2');
    fs.writeFileSync(path.join(dir, 'products/a.json'), '{"tampered":true}\n');
    try { promote.verifyManifest(dir); assert.fail('should throw'); }
    catch (err) { assert.ok(/hash mismatch/.test(err.message), err.message); }
});

check('promote with no prior current/ succeeds', () => {
    const dir = buildFakeRelease('promote-test-1');
    const r = promote.promote(dir, opt());
    assert.strictEqual(r.promoted, true);
    assert.ok(fs.existsSync(TEST_CURRENT));
    assert.ok(fs.existsSync(path.join(TEST_CURRENT, 'products/a.json')));
    const allFiles = fs.readdirSync(TEST_PUB_ROOT);
    assert.ok(!allFiles.some(f => f.startsWith('.current-')));
    assert.ok(!allFiles.some(f => f.startsWith('.previous-')));
});

check('promote over existing current/ replaces atomically', () => {
    const dir1 = buildFakeRelease('promote-test-2a');
    promote.promote(dir1, opt());
    const dir2 = buildFakeRelease('promote-test-2b');
    const r = promote.promote(dir2, opt());
    assert.strictEqual(r.promoted, true);
    assert.ok(fs.existsSync(path.join(TEST_CURRENT, 'products/a.json')));
    const m = JSON.parse(fs.readFileSync(path.join(TEST_CURRENT, 'manifest.json'), 'utf8'));
    assert.strictEqual(m.release_id, 'promote-test-2b');
    const all = fs.readdirSync(TEST_PUB_ROOT);
    assert.ok(!all.some(f => f.startsWith('.')));
});

check('testRollback restores the previous current/ on injected failure', () => {
    const dir1 = buildFakeRelease('rollback-baseline');
    promote.promote(dir1, opt());
    const before = fs.readdirSync(TEST_CURRENT).sort();
    const dir2 = buildFakeRelease('rollback-attempted');
    const r = promote.testRollback(dir2, opt());
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.restored, true);
    assert.deepStrictEqual(r.after, before);
    const cur = JSON.parse(fs.readFileSync(path.join(TEST_CURRENT, 'manifest.json'), 'utf8'));
    assert.strictEqual(cur.release_id, 'rollback-baseline');
    const all = fs.readdirSync(TEST_PUB_ROOT);
    assert.ok(!all.some(f => f.includes('.tmp-test')));
});

// Cleanup
fs.rmSync(TEST_PUB_ROOT, { recursive: true, force: true });

process.stderr.write('\natomic-promote.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);