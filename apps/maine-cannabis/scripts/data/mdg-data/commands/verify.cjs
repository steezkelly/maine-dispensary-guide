#!/usr/bin/env node
/**
 * commands/verify.cjs — mdg-data:verify
 *
 * Offline. Re-derive from a release directory and confirm identical
 * canonical bytes for every product file. This is the deterministic
 * guarantee test.
 *
 * Usage:
 *   node verify.cjs --release-dir=<path>
 *
 * Exit codes per AGENT-EXECUTION-CONTRACT.md.
 *
 * Ticket 001: stub. Real verification lands in Ticket 011.
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');

function parseArgs(argv) {
    const out = {};
    for (const a of argv) {
        if (!a.startsWith('--')) {
            throw new Error(`unexpected positional arg: ${a}`);
        }
        const eq = a.indexOf('=');
        if (eq < 0) throw new Error(`expected --key=value form: ${a}`);
        out[a.slice(2, eq)] = a.slice(eq + 1);
    }
    return out;
}

function emit(ev) {
    process.stdout.write(JSON.stringify(ev) + '\n');
}

function sha256(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function main() {
    let args;
    try {
        args = parseArgs(process.argv.slice(2));
    } catch (err) {
        emit({
            schema_version: 1, component: 'mdg-data', command: 'verify',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message
        });
        process.exit(64);
    }
    if (!args['release-dir']) {
        emit({
            schema_version: 1, component: 'mdg-data', command: 'verify',
            status: 'failed', code: 'USAGE_ERROR', retryable: false,
            message: 'missing required --release-dir=<path>'
        });
        process.exit(64);
    }
    const dir = args['release-dir'].replace(/\/$/, '');
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
    } catch (err) {
        emit({
            schema_version: 1, component: 'mdg-data', command: 'verify',
            status: 'failed', code: 'RELEASE_MANIFEST_INVALID', retryable: false,
            message: `cannot read manifest: ${err.message}`
        });
        process.exit(64);
    }
    if (!Array.isArray(manifest.files)) {
        emit({
            schema_version: 1, component: 'mdg-data', command: 'verify',
            status: 'failed', code: 'RELEASE_MANIFEST_INVALID', retryable: false,
            message: 'manifest.files must be an array of {path,sha256}'
        });
        process.exit(64);
    }

    const mismatches = [];
    for (const f of manifest.files) {
        const abs = `${dir}/${f.path}`;
        let actual;
        try {
            actual = sha256(abs);
        } catch (err) {
            mismatches.push(`${f.path}: missing (${err.message})`);
            continue;
        }
        if (actual !== f.sha256) {
            mismatches.push(`${f.path}: expected ${f.sha256}, got ${actual}`);
        }
    }

    if (mismatches.length > 0) {
        emit({
            schema_version: 1, component: 'mdg-data', command: 'verify',
            status: 'failed', source_id: null,
            release_id: manifest.release_id || null,
            changed: false, retryable: false, code: 'MANIFEST_HASH_MISMATCH',
            message: `${mismatches.length} file(s) failed hash check`,
            metrics: { mismatches }
        });
        process.exit(50);
    }

    process.stderr.write(`verify: ${manifest.files.length} file(s) match manifest hashes for release_id=${manifest.release_id}\n`);
    emit({
        schema_version: 1, component: 'mdg-data', command: 'verify',
        status: 'unchanged', source_id: null, release_id: manifest.release_id,
        changed: false, retryable: false, code: 'OK',
        message: 'verify command stub: deterministic rerun lands in Ticket 011',
        metrics: { files_checked: manifest.files.length }
    });
    process.exit(0);
}

main();