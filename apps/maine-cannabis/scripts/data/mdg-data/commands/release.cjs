'use strict';
const fs = require('fs');
const path = require('path');
const promote = require('../adapters/atomic-promote.cjs');

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

function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'release',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message });
        process.exit(64);
    }
    if (!args['release-dir']) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'release',
            status: 'failed', code: 'USAGE_ERROR', retryable: false,
            message: 'missing required --release-dir=<path>' });
        process.exit(64);
    }
    let result;
    try {
        result = promote.promote(args['release-dir'], { dryRun: !!args['dry-run'] });
    } catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'release',
            status: 'failed', source_id: null,
            release_id: null, changed: false, retryable: false,
            code: err.code || 'RELEASE_ERROR', message: err.message });
        process.exit(60);
    }
    emit({
        schema_version: 1, component: 'mdg-data', command: 'release',
        status: 'released', source_id: null,
        release_id: result.release_id, changed: result.promoted,
        retryable: false, code: result.dry_run ? 'DRY_RUN' : 'OK',
        message: result.promoted
            ? 'release promoted to current/'
            : (result.dry_run ? 'dry run; manifest validated' : 'no promotion'),
        metrics: {
            promoted: result.promoted,
            manifest_file_count: result.manifest.files.length,
            current_dir: promote.CURRENT_DIR,
            inputs: result.manifest.inputs
        }
    });
    process.exit(0);
}

main();