#!/usr/bin/env node
/**
 * scripts/seo/ga4-lead-capture-daily.cjs
 *
 * Daily GA4 lead_capture event dump — parallel of gsc-search-analytics-daily.cjs.
 * Pulls the last 7 days of `lead_capture` events segmented by form location
 * (generated_lead event may be its own; verify), producing a rows×columns JSONL
 * feed for the GA4 dashboard panel.
 *
 * PREREQUISITE: the service account at $GOOGLE_APPLICATION_CREDENTIALS must
 * be granted "Viewer" role on the GA4 property via the GA Admin UI
 * (analytics.google.com → Admin → Property Access Management). The same
 * service account that powers GSC has been verified to work for GSC; this
 * script will start returning real numbers as soon as GA4 access is added.
 *
 * Setup (one-time, operator action):
 *   1. Open https://analytics.google.com/ → Admin → Property column →
 *      Property Access Management.
 *   2. Click "Add users" → paste mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com
 *      (the same service account already used for GSC).
 *   3. Role: Viewer (read-only is sufficient for this script).
 *   4. Click Add. Within 60 seconds this script will start returning rows.
 *
 * Once access is granted:
 *   - GA4 numeric property ID is needed (NOT the G-XXXX Measurement ID).
 *     Find it at analytics.google.com → Admin → Property Settings → "Property ID"
 *     (a 9-digit numeric value like 123456789). Set GA4_PROPERTY_ID env.
 *   - Lead form names (custom dimensions) are the form_id or page_path of the
 *     form submission; LeadFormTracker.astro emits them in event params.
 *
 * Usage:
 *   GA4_PROPERTY_ID=123456789 node apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs
 *
 * Output: appends one JSONL row per day to data/ga4-lead-capture.jsonl
 *
 * Cron pattern (companion to mdg-gsc-daily.sh):
 *   0 8 * * * /usr/bin/node /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs >> /home/steve/.local/log/ga4-lead-capture.log 2>&1
 *
 * Exit codes:
 *   0  clean run (snapshot written or no rows in window)
 *   1  GA4 not yet granted to service account (operator-action blocker)
 *   2  GA4_PROPERTY_ID env not set
 *   3  auth/credential error
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
if (!GA4_PROPERTY_ID || !/^\d{9,12}$/.test(GA4_PROPERTY_ID)) {
    console.error('[ga4-lead-capture-daily] FAIL — GA4_PROPERTY_ID env not set.');
    console.error('Required: numeric Property ID (9-12 digits). Find at:');
    console.error('  analytics.google.com → Admin → Property Settings → Property ID');
    console.error('NOT the G-XXXX Measurement ID from site-config.json.');
    console.error('Example: GA4_PROPERTY_ID=123456789 node ga4-lead-capture-daily.cjs');
    process.exit(2);
}

const CRED_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '/home/steve/.config/maine-dispensary-guide/gcp-mdg-reader.json';

if (!fs.existsSync(CRED_PATH)) {
    console.error(`[ga4-lead-capture-daily] FAIL — credentials not at ${CRED_PATH}`);
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS env or drop the SA key at that path.');
    process.exit(3);
}

const REPO = (() => {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
})();

const OUTPUT = path.join(REPO, 'apps', 'maine-cannabis', 'data', 'ga4-lead-capture.jsonl');

// Use python + google-auth via a one-off subprocess (vends OAuth Bearer token
// from the SA keyfile). Keeps the cjs script zero-dep and avoids reimplementing
// the JWT-sign + token-mint dance.
const TOKEN_SCRIPT = `
import json, sys, urllib.request, urllib.error
from google.oauth2 import service_account
import google.auth.transport.requests

creds = service_account.Credentials.from_service_account_file(
    '${CRED_PATH}',
    scopes=['https://www.googleapis.com/auth/analytics.readonly'])
creds.refresh(google.auth.transport.requests.Request())
print(creds.token)
`;

function mintToken() {
    // Write the Python helper to a temp file and run it. Avoids the multi-layer
    // bash-quoting problem with passing inline Python through `bash -lc` —
    // newlines and double quotes get double-escaped and the resulting `python3 -c`
    // payload becomes invalid Python. Single-file exec + read stdout.
    const os = require('os');
    const tmp = path.join(os.tmpdir(), `ga4-mint-${process.pid}-${Date.now()}.py`);
    fs.writeFileSync(tmp, TOKEN_SCRIPT, { mode: 0o600 });
    try {
        // Prefer the Hermes shared venv (has google-auth installed for GSC +
        // GA4). Fall back to system python3 (will surface a ModuleNotFoundError
        // if the dependency isn't installed there; that's the operator signal
        // to install it via `pip install google-auth` into the active env).
        const py = process.env.PYTHON ||
            (fs.existsSync('/home/steve/.local/share/hermes-cli-tools/venv/bin/python3')
                ? '/home/steve/.local/share/hermes-cli-tools/venv/bin/python3'
                : 'python3');
        const res = execSync(`"${py}" "${tmp}"`, {
            encoding: 'utf8',
            timeout: 30_000,
            shell: '/bin/bash',
        });
        return res.trim().split('\n').pop().trim();
    } finally {
        try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    }
}

async function ga4Query(token, body) {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;
    const init = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };
    const resp = await fetch(url, init);
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`GA4 Data API ${resp.status}: ${err}`);
    }
    return resp.json();
}

async function main() {
    let token;
    try {
        token = mintToken();
    } catch (err) {
        console.error('[ga4-lead-capture-daily] FAIL — auth: ' + err.message);
        process.exit(3);
    }

    // Last-7-days window, lead_capture event broken down by page_path and
    // event_name. Single call.
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
    const fmt = d => d.toISOString().slice(0, 10);

    const body = {
        dateRanges: [{ startDate: fmt(sevenDaysAgo), endDate: fmt(today) }],
        dimensions: [
            { name: 'date' },
            { name: 'pagePath' },
            { name: 'eventName' },
            // formId is a custom dimension that needs to be registered in the
            // GA4 Admin UI under Events > Custom Definitions. Until registered,
            // this script omits it to avoid 400 INVALID_ARGUMENT.
            // { name: 'formId' },
        ],
        metrics: [
            { name: 'eventCount' },
            { name: 'sessions' },
        ],
        dimensionFilter: {
            filter: {
                fieldName: 'eventName',
                stringFilter: {
                    value: 'lead_capture',
                    matchType: 'EXACT',
                },
            },
        },
        // GA4 Data API v1beta: the correct field is `limit` (not `rowLimit`).
        // GA4 returns 400 INVALID_ARGUMENT for `Unknown name "rowLimit"`.
        // Field is optional; defaults to 10,000 rows.
        limit: 5000,
    };

    let report;
    try {
        report = await ga4Query(token, body);
    } catch (err) {
        const msg = err.message || '';
        if (/403|permission|denied|PERMISSION_DENIED/i.test(msg)) {
            console.error('[ga4-lead-capture-daily] FAIL — GA4 access not granted to service account yet.');
            console.error('');
            console.error('One-time operator action required:');
            console.error('  1. Open https://analytics.google.com/ → Admin → Property Access Management');
            console.error('  2. Add user: mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com');
            console.error('  3. Role: Viewer');
            console.error('  4. Re-run this script after ~60s');
            console.error('');
            console.error('Underlying error: ' + msg.slice(0, 400));
            process.exit(1);
        }
        if (/not found|404|GA4_PROPERTY/i.test(msg)) {
            console.error('[ga4-lead-capture-daily] FAIL — Property ID looks wrong or empty account:');
            console.error('  ' + msg.slice(0, 400));
            console.error('Verify GA4_PROPERTY_ID matches the numeric ID from GA Admin → Property Settings.');
            process.exit(2);
        }
        throw err;
    }

    const rows = (report.rows || []).map(r => ({
        date: r.dimensionValues[0]?.value,
        page_path: r.dimensionValues[1]?.value,
        event_name: r.dimensionValues[2]?.value,
        // form_id slot retained in output schema for forward compat with custom dimensions
        form_id: null,
        event_count: parseInt(r.metricValues[0]?.value || '0'),
        sessions: parseInt(r.metricValues[1]?.value || '0'),
    }));

    const snapshot = {
        generated: new Date().toISOString(),
        property_id: GA4_PROPERTY_ID,
        window: { start: fmt(sevenDaysAgo), end: fmt(today) },
        row_count: rows.length,
        total_events: rows.reduce((s, r) => s + r.event_count, 0),
        rows,
    };

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.appendFileSync(OUTPUT, JSON.stringify(snapshot) + '\n');

    console.log(`[ga4-lead-capture-daily] OK — ${rows.length} rows | ${snapshot.total_events} lead_capture events | appended to ${path.basename(OUTPUT)}`);
}

main().catch(err => {
    console.error('[ga4-lead-capture-daily] ERR — uncaught:', err.message);
    process.exit(3);
});
