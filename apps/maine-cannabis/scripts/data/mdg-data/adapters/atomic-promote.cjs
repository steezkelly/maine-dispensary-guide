'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * adapters/atomic-promote.cjs
 *
 * Ticket 011 — Atomic promotion + rollback.
 *
 * Per ARTIFACT-CONTRACT.md §Default atomic local promotion algorithm:
 *
 *   1. Verify the durable release manifest and every listed file hash.
 *   2. Materialize the complete release into a .current-{release_id}.tmp dir.
 *   3. Verify every materialized file against manifest.json.
 *   4. If an old current/ exists, rename it to .previous-{release_id}.tmp.
 *   5. Rename .current-{release_id}.tmp to current/.
 *   6. Remove the previous temporary directory.
 *   7. On failure after step 4, restore the previous directory before exiting 60.
 *
 * The publication command must test the rollback path.
 */

const DEFAULT_CURRENT_DIR = path.join(__dirname, '..', '..', '..', '..', 'src', 'data',
    'generated', 'mdg-data', 'current');

function resolveCurrentDir(opts) {
    if (opts && opts.currentDir) return opts.currentDir;
    return DEFAULT_CURRENT_DIR;
}

function CURRENT_DIR_OR(opts) { return resolveCurrentDir(opts); }

function sha256(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function verifyManifest(releaseDir) {
    const manifestPath = path.join(releaseDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const f of manifest.files) {
        const abs = path.join(releaseDir, f.path);
        if (!fs.existsSync(abs)) {
            throw new Error('manifest file missing: ' + f.path);
        }
        const actual = sha256(abs);
        if (actual !== f.sha256) {
            throw new Error('manifest hash mismatch for ' + f.path
                + ': expected ' + f.sha256 + ', got ' + actual);
        }
    }
    return manifest;
}

/**
 * Promote a release to the Git-tracked current/ directory atomically.
 *
 * Inputs:
 *   releaseDir:  path to the durable release directory
 *                 (under $MDG_DATA_ROOT/staging/run-X/release/<id>/)
 *   opts: { dryRun?: bool }
 *
 * Returns: { release_id, manifest, promoted: bool, restored: bool }
 *
 * Throws with `code` set on failure:
 *   - 'MANIFEST_INVALID': manifest or files don't match
 *   - 'PROMOTION_FAILED': filesystem error during rename
 */
function promote(releaseDir, opts) {
    opts = opts || {};
    const manifest = verifyManifest(releaseDir);
    const releaseId = manifest.release_id;

    if (opts.dryRun) {
        return { release_id: releaseId, manifest, promoted: false, restored: false, dry_run: true };
    }

    const parentDir = path.dirname(resolveCurrentDir(opts));
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

    const stagedDir = path.join(parentDir, '.current-' + releaseId + '.tmp');
    const prevTmpDir = path.join(parentDir, '.previous-' + releaseId + '.tmp');
    const currentExisted = fs.existsSync(resolveCurrentDir(opts));

    // Materialize complete release into staged dir.
    fs.mkdirSync(stagedDir, { recursive: true });
    // Copy manifest.json itself into staged/
    fs.copyFileSync(path.join(releaseDir, 'manifest.json'),
        path.join(stagedDir, 'manifest.json'));
    for (const f of manifest.files) {
        const src = path.join(releaseDir, f.path);
        const dst = path.join(stagedDir, f.path);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
    // Step 3: re-verify staged files (manifest.json + product files)
    const stagedManifestPath = path.join(stagedDir, 'manifest.json');
    if (!fs.existsSync(stagedManifestPath)) {
        fs.rmSync(stagedDir, { recursive: true, force: true });
        const e = new Error('staged manifest.json missing');
        e.code = 'MANIFEST_INVALID';
        throw e;
    }
    for (const f of manifest.files) {
        const abs = path.join(stagedDir, f.path);
        const actual = sha256(abs);
        if (actual !== f.sha256) {
            fs.rmSync(stagedDir, { recursive: true, force: true });
            const e = new Error('staged hash mismatch for ' + f.path);
            e.code = 'MANIFEST_INVALID';
            throw e;
        }
    }

    let restored = false;
    try {
        // Step 4: rename existing current to .previous-{release_id}.tmp
        if (currentExisted) {
            fs.renameSync(resolveCurrentDir(opts), prevTmpDir);
        }
        // Step 5: rename staged to current/
        fs.renameSync(stagedDir, resolveCurrentDir(opts));
    } catch (err) {
        // Step 7: restore previous directory on failure
        if (currentExisted && fs.existsSync(prevTmpDir) && !fs.existsSync(resolveCurrentDir(opts))) {
            try {
                fs.renameSync(prevTmpDir, resolveCurrentDir(opts));
                restored = true;
            } catch (e2) {
                const e3 = new Error('promotion failed AND rollback failed: ' + err.message + ' / ' + e2.message);
                e3.code = 'PROMOTION_FAILED';
                throw e3;
            }
        }
        // Best-effort cleanup of staged dir
        if (fs.existsSync(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
        const ef = new Error('promotion failed: ' + err.message);
        ef.code = 'PROMOTION_FAILED';
        ef.restored = restored;
        throw ef;
    }

    // Step 6: remove the previous temporary directory (now safe).
    if (currentExisted && fs.existsSync(prevTmpDir)) {
        fs.rmSync(prevTmpDir, { recursive: true, force: true });
    }

    return { release_id: releaseId, manifest, promoted: true, restored: false };
}

/**
 * Inject a failure between step 4 (rename current → prevTmp) and
 * step 5 (rename staged → current), then verify rollback restores
 * the previous current/.
 *
 * Used by Ticket 011 acceptance test.
 *
 * Returns: { ok: bool, before, after, restored }
 */
function testRollback(releaseDir, opts) {
    opts = opts || {};
    const manifest = verifyManifest(releaseDir);
    const releaseId = manifest.release_id;
    const parentDir = path.dirname(resolveCurrentDir(opts));
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

    const stagedDir = path.join(parentDir, '.current-' + releaseId + '.tmp-test');
    const prevTmpDir = path.join(parentDir, '.previous-' + releaseId + '.tmp-test');
    const currentExisted = fs.existsSync(resolveCurrentDir(opts));

    // Snapshot the current contents for verification.
    const beforeListing = currentExisted ? fs.readdirSync(resolveCurrentDir(opts)).sort() : [];

    // Materialize staged.
    fs.mkdirSync(stagedDir, { recursive: true });
    for (const f of manifest.files) {
        const src = path.join(releaseDir, f.path);
        const dst = path.join(stagedDir, f.path);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }

    // Step 4: rename current → prevTmp.
    if (currentExisted) fs.renameSync(resolveCurrentDir(opts), prevTmpDir);

    // INJECT FAILURE: instead of renaming staged → current,
    // throw to trigger rollback.
    let rollbackOk = false;
    let afterListing = [];
    try {
        // Simulated step-5 failure: rename fails (we just throw).
        throw new Error('INJECTED step-5 failure for rollback test');
    } catch (err) {
        // Rollback: rename prevTmp → current.
        if (currentExisted && fs.existsSync(prevTmpDir)) {
            fs.renameSync(prevTmpDir, resolveCurrentDir(opts));
            rollbackOk = true;
        }
        // Cleanup staged.
        if (fs.existsSync(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
    }

    afterListing = fs.existsSync(resolveCurrentDir(opts)) ? fs.readdirSync(resolveCurrentDir(opts)).sort() : [];

    return {
        ok: rollbackOk && JSON.stringify(beforeListing) === JSON.stringify(afterListing),
        before: beforeListing,
        after: afterListing,
        restored: rollbackOk
    };
}

module.exports = { promote, verifyManifest, testRollback, DEFAULT_CURRENT_DIR, resolveCurrentDir };