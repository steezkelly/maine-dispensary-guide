'use strict';
const path = require('path');
const { loadRegistry, getSource } = require('../lib/registry.cjs');
const store = require('../lib/store.cjs');

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

async function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (err) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'check',
            status: 'failed', code: 'USAGE_ERROR', retryable: false, message: err.message });
        process.exit(64);
    }
    if (!args.source) {
        emit({ schema_version: 1, component: 'mdg-data', command: 'check',
            status: 'failed', code: 'USAGE_ERROR', retryable: false,
            message: 'missing required --source=<source_id>' });
        process.exit(64);
    }

    const reg = loadRegistry();
    const src = getSource(reg, args.source);

    const root = store.resolveRoot();
    const sc = store.newSourceCheck({
        sourceId: src.source_id,
        sourcePageUrl: src.authoritative_page_url,
        adapterVersion: src.adapter_version
    });

    // Network phase
    let httpErr = null;
    try {
        const r = await store.httpGet(src.authoritative_page_url, {
            accept: src.discovery && src.discovery.strategy === 'scrape_html_for_csv_link'
                ? 'text/html,application/xhtml+xml,*/*' : '*/*'
        });
        sc.http_status = r.status;
        sc.etag = r.headers.etag || null;
        sc.last_modified = r.headers['last-modified'] || null;
        sc.observed_sha256 = store.sha256(r.body);
        sc.completed_at_utc = new Date().toISOString();

        // Store the page HTML when the content hash is new.
        const wrote = store.writeRawArtifact(
            root, src.source_id, sc.completed_at_utc, r.body,
            'page.html'
        );
        sc.discovered_artifact_url = src.authoritative_page_url;
        sc.status = (r.status >= 200 && r.status < 300) ? 'unchanged' : 'blocked';
        sc.message = 'page fetched, sha256=' + sc.observed_sha256.slice(0, 16)
            + ' raw_path=' + wrote.path;
        emit({
            schema_version: 1, component: 'mdg-data', command: 'check',
            status: sc.status, source_id: src.source_id, release_id: null,
            changed: false, retryable: false, code: sc.status === 'blocked'
                ? 'SOURCE_BLOCKED' : 'SOURCE_UNCHANGED',
            artifact_sha256: sc.observed_sha256,
            message: sc.message,
            metrics: { http_status: sc.http_status, etag: sc.etag,
                       last_modified: sc.last_modified, raw_path: wrote.path }
        });
        store.appendSourceCheck(root, sc);
        process.exit(sc.status === 'blocked' ? 30 : 0);
    } catch (err) {
        httpErr = err;
        sc.status = 'network_error';
        sc.message = err.message;
        sc.completed_at_utc = new Date().toISOString();
        store.appendSourceCheck(root, sc);
        emit({
            schema_version: 1, component: 'mdg-data', command: 'check',
            status: 'failed', source_id: src.source_id, release_id: null,
            changed: false, retryable: true, code: 'NETWORK_ERROR',
            message: 'http failure: ' + err.message,
            decision_note: 'see source_check JSONL for full record'
        });
        process.exit(20);
    }
}

main();