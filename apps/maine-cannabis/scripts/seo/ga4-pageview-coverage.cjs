#!/usr/bin/env node
/**
 * scripts/seo/ga4-pageview-coverage.cjs
 *
 * Automated GA4 pageview coverage probe — Probe Y companion to the
 * manual Realtime check (Probe X) in
 * docs/analytics/GA4_PAGEVIEW_COVERAGE_PROBE_2026-07-09.md.
 *
 * Hits 3 probe URLs with a randomized User-Agent, waits for GA4 to
 * process (Realtime has ~30s ingestion latency), then calls
 * runRealtimeReport to assert each URL produced a distinct page_path
 * entry in GA4.
 *
 * Pass criterion (β): runRealtimeReport returns 3 distinct pagePath
 * values matching the 3 probe URLs (modulo trailing-slash).
 *
 * PREREQUISITE (one-time operator action):
 *   The service account at $GOOGLE_APPLICATION_CREDENTIALS must be
 *   granted "Viewer" role on the GA4 property. See
 *   docs/GA4_ACCESS_INSTRUCTIONS_2026-07-08.md for the 5-minute
 *   procedure. Same account as GSC; already verified to work for GSC.
 *
 * Once access is granted:
 *   GA4 numeric property ID is needed (NOT the G-XXXX Measurement ID).
 *   Find it at analytics.google.com → Admin → Property Settings →
 *   "Property ID" (a 9-digit numeric value like 123456789). Set
 *   GA4_PROPERTY_ID env.
 *
 * Usage:
 *   GA4_PROPERTY_ID=123456789 node apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs
 *
 * Output: appends one JSONL row per run to data/ga4-pageview-coverage.jsonl
 *
 * Exit codes:
 *   0  PASS — 3/3 probe URLs visible in GA4 Realtime
 *   1  PARTIAL — 1-2/3 visible (under-count confirmed)
 *   2  FAIL — 0/3 visible (gtag not firing; see probe-doc failure triage)
 *   3  Setup error (env / creds / network)
 *   4  Operator action required (service account not granted)
 *
 * Companion wrapper for cron:
 *   ~/.local/bin/mdg-ga4-pageview-coverage.sh
 *   crontab line: 0 9 * * * /home/steve/.local/bin/mdg-ga4-pageview-coverage.sh
 *   (daily at 9am — GA4 Realtime has 30-min retention; daily cron
 *   captures the previous day's coverage without losing data)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
if (!GA4_PROPERTY_ID || !/^\d{9,12}$/.test(GA4_PROPERTY_ID)) {
    console.error('[ga4-pageview-coverage] FAIL — GA4_PROPERTY_ID env not set.');
    console.error('Required: numeric Property ID (9-12 digits). Find at:');
    console.error('  analytics.google.com → Admin → Property Settings → Property ID');
    console.error('NOT the G-XXXX Measurement ID from site-config.json.');
    console.error('Example: GA4_PROPERTY_ID=123456789 node ga4-pageview-coverage.cjs');
    process.exit(3);
}

const CRED_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '/home/steve/.config/maine-dispensary-guide/gcp-mdg-reader.json';

if (!fs.existsSync(CRED_PATH)) {
    console.error(`[ga4-pageview-coverage] FAIL — credentials not at ${CRED_PATH}`);
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

const OUTPUT = path.join(REPO, 'apps', 'maine-cannabis', 'data', 'ga4-pageview-coverage.jsonl');

// The 3 probe URLs. Pinned (not parameterized) so the script's pass/fail
// semantics stay tied to the probe-doc's specific test design.
//   - Homepage: ensures the global Layout.astro gtag fires.
//   - Portland town guide: highest-impression guide from 2026-07-08 audit.
//   - Acadia blog post: highest-impression of the Acadia pair from audit;
//     also exercises the blog route shape (no lead form).
const PROBE_URLS = [
    'https://mainedispensaryguide.com/',
    'https://mainedispensaryguide.com/guides/portland-dispensary-guide/',
    'https://mainedispensaryguide.com/blog/recreational-cannabis-near-acadia/',
];

// Realistic desktop User-Agent pool. GA4 may dedupe or filter based on
// UA; rotating avoids collapsing all 3 hits into a single session.
// Randomized per-run, not per-request, because the entire probe is one
// logical session in GA4's eyes.
const UA_POOL = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
];
const pickUA = () => UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

// Same Python-via-subprocess token mint as ga4-lead-capture-daily.cjs.
// Avoids reimplementing JWT-sign in Node; the SA keyfile's scope is
// analytics.readonly. Reuse pattern; do not fork.
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
    const os = require('os');
    const tmp = path.join(os.tmpdir(), `ga4-pv-mint-${process.pid}-${Date.now()}.py`);
    fs.writeFileSync(tmp, TOKEN_SCRIPT, { mode: 0o600 });
    try {
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

// Realtime endpoint is separate from runReport. Different URL, no
// dateRange (Realtime is "now minus 30 minutes" by definition).
async function ga4RealtimeQuery(token, body) {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runRealtimeReport`;
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
        throw new Error(`GA4 Realtime API ${resp.status}: ${err}`);
    }
    return resp.json();
}

// Hit each URL with a real GET. Browser-shaped headers so the response
// triggers any prerender or static-cache logic on Vercel's edge. We
// don't parse the body — the goal is just to trigger the gtag pageview
// in the rendered HTML, which then fires from the user's browser. Since
// this script runs server-side (no JS execution), the pageview fires
// ONLY because the gtag tag is in the static HTML — if Layout.astro
// strips the script tag at build time, no JS will ever load it client
// side, and this probe will see 0/3 in GA4.
async function hitUrl(url, ua) {
    const t0 = Date.now();
    const resp = await fetch(url, {
        headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        },
    });
    const body = await resp.text();
    const gtagInHtml = /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/.test(body);
    return {
        url,
        status: resp.status,
        ms: Date.now() - t0,
        gtagInHtml,
    };
}

async function main() {
    const runId = new Date().toISOString();
    console.error(`[ga4-pageview-coverage] starting run ${runId}`);

    // Step 1: mint token. Failures here are setup errors.
    let token;
    try {
        token = mintToken();
    } catch (err) {
        console.error('[ga4-pageview-coverage] FAIL — auth: ' + err.message);
        process.exit(3);
    }

    // Step 2: hit each probe URL with a single browser-shaped GET.
    // All 3 use the same UA so they collapse into one session in GA4,
    // which is what we want — three distinct pageview events, one
    // session, three page_paths.
    const ua = pickUA();
    const hits = [];
    for (const url of PROBE_URLS) {
        try {
            const r = await hitUrl(url, ua);
            hits.push(r);
            console.error(`[ga4-pageview-coverage]   ${r.status} ${r.ms}ms ${url} gtagInHtml=${r.gtagInHtml}`);
        } catch (err) {
            hits.push({ url, status: 'ERR', ms: 0, gtagInHtml: false, error: err.message });
            console.error(`[ga4-pageview-coverage]   ERR ${url} ${err.message}`);
        }
    }

    // Step 3: wait for GA4 ingestion. Realtime has ~5-30s latency from
    // pageview event to dashboard visibility. 60s is the conservative
    // upper bound. Document this in the JSONL row.
    const ingestWaitSec = 60;
    console.error(`[ga4-pageview-coverage] waiting ${ingestWaitSec}s for GA4 Realtime ingestion…`);
    await new Promise(r => setTimeout(r, ingestWaitSec * 1000));

    // Step 4: query runRealtimeReport for the last 30 min (the only
    // window Realtime supports), filtered to just our 3 page_paths.
    // Realtime dimensions: pagePath, pageTitle, etc. Filter via
    // dimensionFilter OR-clause so we get any of the 3 URLs back.
    const realtimeBody = {
        dimensions: [
            { name: 'pagePath' },
            { name: 'pageTitle' },
        ],
        metrics: [
            { name: 'screenPageViews' },
        ],
        dimensionFilter: {
            orGroup: {
                expressions: PROBE_URLS.map(url => {
                    // Match the pagePath the way GA4 records it. Vercel
                    // strips trailing slashes for the static path, so
                    // "/guides/portland-maine-dispensary-guide/" becomes
                    // "/guides/portland-maine-dispensary-guide" in the
                    // page_path dimension.
                    const path = new URL(url).pathname.replace(/\/$/, '') || '/';
                    return {
                        filter: {
                            fieldName: 'pagePath',
                            stringFilter: { value: path, matchType: 'EXACT' },
                        },
                    };
                }),
            },
        },
        // limit is required; Realtime caps at a small N anyway.
        limit: 50,
        minuteRanges: [{ name: '0' }],  // last 30 min (Realtime's only window)
    };

    let realtimeReport;
    try {
        realtimeReport = await ga4RealtimeQuery(token, realtimeBody);
    } catch (err) {
        const msg = err.message || '';
        if (/403|permission|denied|PERMISSION_DENIED/i.test(msg)) {
            console.error('[ga4-pageview-coverage] FAIL — GA4 access not granted to service account yet.');
            console.error('');
            console.error('One-time operator action required:');
            console.error('  1. Open https://analytics.google.com/ → Admin → Property Access Management');
            console.error('  2. Add user: mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com');
            console.error('  3. Role: Viewer');
            console.error('  4. Re-run this script after ~60s');
            console.error('');
            console.error('Underlying error: ' + msg.slice(0, 400));
            process.exit(4);
        }
        if (/not found|404|GA4_PROPERTY/i.test(msg)) {
            console.error('[ga4-pageview-coverage] FAIL — Property ID looks wrong or empty account:');
            console.error('  ' + msg.slice(0, 400));
            console.error('Verify GA4_PROPERTY_ID matches the numeric ID from GA Admin → Property Settings.');
            process.exit(3);
        }
        throw err;
    }

    const realtimeRows = (realtimeReport.rows || []).map(r => ({
        page_path: r.dimensionValues[0]?.value,
        page_title: r.dimensionValues[1]?.value,
        screen_page_views: parseInt(r.metricValues[0]?.value || '0'),
    }));

    // Match each probe URL against what Realtime returned. Trailing-slash
    // normalization applies (Vercel serves /foo, GA4 records /foo).
    const seen = new Set();
    for (const row of realtimeRows) {
        seen.add(row.page_path);
    }
    const probeResults = PROBE_URLS.map(url => {
        const path = new URL(url).pathname.replace(/\/$/, '') || '/';
        const match = realtimeRows.find(r => r.page_path === path);
        return {
            url,
            page_path: path,
            visible: !!match,
            screen_page_views: match?.screen_page_views || 0,
            page_title: match?.page_title || null,
        };
    });
    const visibleCount = probeResults.filter(r => r.visible).length;

    // Build the JSONL row.
    const snapshot = {
        run_id: runId,
        property_id: GA4_PROPERTY_ID,
        ua,
        hits,
        ingest_wait_sec: ingestWaitSec,
        realtime_row_count: realtimeRows.length,
        realtime_rows: realtimeRows,
        probe_results: probeResults,
        visible_count: visibleCount,
        probe_total: PROBE_URLS.length,
        verdict: visibleCount === PROBE_URLS.length ? 'PASS'
            : visibleCount === 0 ? 'FAIL'
            : 'PARTIAL',
    };

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.appendFileSync(OUTPUT, JSON.stringify(snapshot) + '\n');

    console.log(`[ga4-pageview-coverage] ${snapshot.verdict} — ${visibleCount}/${PROBE_URLS.length} probe URLs visible in GA4 Realtime | appended to ${path.basename(OUTPUT)}`);

    if (visibleCount === PROBE_URLS.length) process.exit(0);
    if (visibleCount === 0) process.exit(2);
    process.exit(1);
}

main().catch(err => {
    console.error('[ga4-pageview-coverage] ERR — uncaught:', err.message);
    process.exit(3);
});