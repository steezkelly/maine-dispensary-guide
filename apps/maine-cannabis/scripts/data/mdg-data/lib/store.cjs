'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * Resolve MDG_DATA_ROOT.
 * Honors env var; defaults to ~/.hermes/data/mdg-data per Ticket 000.
 */
function resolveRoot() {
    const r = process.env.MDG_DATA_ROOT || path.join(os.homedir(), '.hermes', 'data', 'mdg-data');
    return r.replace(/\/$/, '');
}

/**
 * Append one source_check to the JSONL log for its UTC date.
 * Returns the same record (for downstream use).
 *
 * Ticket 002 acceptance: every attempted run records a source check.
 */
function appendSourceCheck(rootDir, record) {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const dir = path.join(rootDir, 'source-checks', yyyy, mm);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${dd}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(record) + '\n');
    return record;
}

/**
 * Compose a source_check record. Caller fills status + observed fields.
 */
function newSourceCheck({ sourceId, sourcePageUrl, adapterVersion }) {
    const now = new Date();
    return {
        check_id: crypto.randomBytes(8).toString('hex'),
        source_id: sourceId,
        started_at_utc: now.toISOString(),
        completed_at_utc: null,
        source_page_url: sourcePageUrl,
        discovered_artifact_url: null,
        http_status: null,
        etag: null,
        last_modified: null,
        observed_sha256: null,
        adapter_version: adapterVersion || '1',
        status: 'unchanged',
        message: null
    };
}

/**
 * Compute SHA-256 over exact bytes (sync).
 */
function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Write raw bytes to a content-addressed immutable path:
 *   $MDG_DATA_ROOT/raw/{source_id}/{yyyy}/{mm}/{dd}/{sha16}/{filename}
 *
 * Returns the absolute path written. Never overwrites: if the path
 * already exists for the same hash, returns the existing path.
 */
function writeRawArtifact(rootDir, sourceId, fetchedAtUtc, buf, originalName) {
    const sha = sha256(buf);
    const sha16 = sha.slice(0, 16);
    const d = fetchedAtUtc instanceof Date ? fetchedAtUtc : new Date(fetchedAtUtc);
    const yyyy = String(d.getUTCFullYear());
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dir = path.join(rootDir, 'raw', sourceId, yyyy, mm, dd, sha16);
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, originalName || `${sha16}.bin`);
    if (!fs.existsSync(target)) {
        fs.writeFileSync(target, buf);
    }
    return { path: target, sha256: sha, sha16 };
}

/**
 * Read a raw artifact by source + sha256 (any date partition).
 * Returns first match or null.
 */
function readRawArtifact(rootDir, sourceId, sha) {
    const base = path.join(rootDir, 'raw', sourceId);
    if (!fs.existsSync(base)) return null;
    for (const yyyy of fs.readdirSync(base).sort()) {
        for (const mm of fs.readdirSync(path.join(base, yyyy)).sort()) {
            for (const dd of fs.readdirSync(path.join(base, yyyy, mm)).sort()) {
                const p = path.join(base, yyyy, mm, dd, sha.slice(0, 16));
                if (!fs.existsSync(p)) continue;
                const file = fs.readdirSync(p).find(f => fs.statSync(path.join(p, f)).isFile());
                if (file) return path.join(p, file);
            }
        }
    }
    return null;
}

/**
 * List all raw artifact paths for a source (sorted by path = by date).
 */
function listRawArtifacts(rootDir, sourceId) {
    const base = path.join(rootDir, 'raw', sourceId);
    if (!fs.existsSync(base)) return [];
    const out = [];
    for (const yyyy of fs.readdirSync(base).sort())
        for (const mm of fs.readdirSync(path.join(base, yyyy)).sort())
            for (const dd of fs.readdirSync(path.join(base, yyyy, mm)).sort())
                for (const sha16 of fs.readdirSync(path.join(base, yyyy, mm, dd)).sort())
                    for (const f of fs.readdirSync(path.join(base, yyyy, mm, dd, sha16)))
                        out.push(path.join(base, yyyy, mm, dd, sha16, f));
    return out;
}

/**
 * Synchronous HTTPS/HTTP GET. Returns { status, headers, body } or throws.
 * No redirects followed past the first hop; no retry.
 */
function httpGet(url, opts) {
    const lib = url.startsWith('https:') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        const req = lib.get(url, {
            headers: {
                'User-Agent': opts && opts.userAgent
                    ? opts.userAgent
                    : 'Maine-Dispensary-Guide-MDG-DATA-001 (+https://mainedispensaryguide.com/data)',
                'Accept': opts && opts.accept ? opts.accept : '*/*'
            },
            timeout: (opts && opts.timeoutMs) || 30000
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks)
            }));
        });
        req.on('timeout', () => req.destroy(new Error('request timeout')));
        req.on('error', reject);
    });
}

module.exports = {
    resolveRoot,
    appendSourceCheck,
    newSourceCheck,
    sha256,
    writeRawArtifact,
    readRawArtifact,
    listRawArtifacts,
    httpGet
};