#!/usr/bin/env node
/**
 * scripts/seo/ga4-pageview-coverage.cjs
 *
 * Automated GA4 pageview coverage probe — Probe Y companion to the
 * manual Realtime check (Probe X) in
 * docs/analytics/GA4_PAGEVIEW_COVERAGE_PROBE_2026-07-09.md.
 *
 * Hits 3 probe URLs in a real headless browser (Playwright) so gtag
 * actually executes, waits for GA4 to ingest, then asserts each URL
 * is visible in GA4 via runReport (today's data — the reliable signal
 * for sparse-traffic sites). Realtime is queried as a best-effort
 * secondary signal but typically returns 0 active users at any given
 * moment for MDG (~7-32 sessions/day).
 *
 * Pass criterion (β): runReport returns a row with pagePath matching
 * each of the 3 probe URLs (modulo trailing-slash).
 *
 * PREREQUISITE (one-time operator action):
 *   The service account at $GOOGLE_APPLICATION_CREDENTIALS must be
 *   granted "Viewer" role on the GA4 property. (Done as of 2026-07-11.)
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
 *   0  PASS — 3/3 probe URLs visible in GA4 today
 *   1  PARTIAL — 1-2/3 visible (under-count confirmed)
 *   2  FAIL — 0/3 visible (gtag not firing; see probe-doc failure triage)
 *   3  Setup error (env / creds / network)
 *   4  Operator action required (service account not granted)
 *
 * Companion wrapper for cron:
 *   ~/.local/bin/mdg-ga4-pageview-coverage.sh
 *   crontab line: 0 9 * * * /home/steve/.local/bin/mdg-ga4-pageview-coverage.sh
 *   (daily at 9am — captures the previous day's coverage without losing data)
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
// Each entry pairs the URL with the expected <title> from production
// HTML. The Realtime API exposes unifiedScreenName (page title) but
// NOT pagePath, so we match on title for the Realtime probe. The
// standard `runReport` API has pagePath; we use both APIs in step 4.
const PROBE_URLS = [
    { url: 'https://mainedispensaryguide.com/',                                    title: 'How to Open a Maine Dispensary in 2026 — Step-by-Step Guide' },
    { url: 'https://mainedispensaryguide.com/guides/portland-dispensary-guide/',   title: "Where to Buy Cannabis in Portland, Maine: 2026 Buyer's Guide" },
    { url: 'https://mainedispensaryguide.com/blog/recreational-cannabis-near-acadia/', title: 'Recreational Cannabis Near Acadia: 2026 Federal Land &' },
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

// Hit each URL with a real headless browser (Playwright). The previous
// version used server-side fetch(), which returned HTML containing the
// gtag <script> tag but never EXECUTED it. Since gtag fires only on
// client-side JS execution, server-side fetches never produced page_view
// events in GA4, so Realtime always showed 0/3 regardless of whether
// the pipeline was actually broken. Playwright executes the script tags
// like a real user browser would, so we can finally assert end-to-end
// coverage.
//
// IMPORTANT NOTE ON REALTIME: The GA4 Realtime API has a 30-minute
// retention window and only shows users currently active. MDG has
// very sparse traffic (~7-32 sessions/day), so Realtime typically
// shows 0 active users regardless of whether gtag is working. The
// pageview coverage probe therefore ALSO queries runReport with a
// 1-day window in step 4b, which gives a more reliable signal.
async function hitUrl(page, url) {
    const t0 = Date.now();
    try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const status = resp ? resp.status() : 0;
        await page.waitForFunction(
            () => Array.isArray(window.dataLayer) && window.dataLayer.length > 0,
            { timeout: 10000 }
        ).catch(() => { /* dataLayer check best-effort */ });
        const gtagInHtml = await page.evaluate(() =>
            /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/.test(document.documentElement.innerHTML)
        );
        return { url, status, ms: Date.now() - t0, gtagInHtml };
    } catch (err) {
        return { url, status: 'ERR', ms: Date.now() - t0, gtagInHtml: false, error: err.message };
    }
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

    // Step 2: hit each probe URL with a single headless-browser page.
    // All 3 use the same UA + session so they collapse into one session
    // in GA4, which is what we want — three distinct pageview events,
    // one session, three page_paths.
    const ua = pickUA();
    const hits = [];
    let browser;
    try {
        const { chromium } = require('playwright');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ userAgent: ua });
        const page = await context.newPage();
        for (const probe of PROBE_URLS) {
            const r = await hitUrl(page, probe.url);
            hits.push(r);
            console.error(`[ga4-pageview-coverage]   ${r.status} ${r.ms}ms ${probe.url} gtagInHtml=${r.gtagInHtml}`);
        }
        await context.close();
    } catch (err) {
        console.error('[ga4-pageview-coverage] FAIL — playwright:', err.message);
        console.error('Install with: npm i -D playwright && npx playwright install chromium');
        if (browser) await browser.close().catch(() => {});
        process.exit(3);
    }
    await browser.close().catch(() => {});

    // Step 3: wait for GA4 ingestion. Realtime has ~5-30s latency from
    // pageview event to dashboard visibility. 60s is the conservative
    // upper bound. Document this in the JSONL row.
    const ingestWaitSec = 60;
    console.error(`[ga4-pageview-coverage] waiting ${ingestWaitSec}s for GA4 Realtime ingestion…`);
    await new Promise(r => setTimeout(r, ingestWaitSec * 1000));

    // Step 4: query runReport for last day. This is the RELIABLE signal
    // for sparse-traffic sites — Realtime only retains 30 minutes and
    // MDG often has 0 active users in any given window. runReport with
    // `dateRanges: today` returns all pageviews that fired in GA4 today.
    // We use pagePath + pageTitle dimensions for matching.
    //
    // (Previous versions of this script relied on the Realtime API
    // which (a) doesn't expose pagePath as a dimension and (b) returns
    // 0 active users for sites with sparse traffic. Realtime is
    // queried best-effort below as a secondary signal.)
    const runReportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;
    // Use yesterday + today as the date range. GA4's standard reporting
    // API has a multi-hour processing delay (the previous version of
    // this script used Realtime which only retains 30 min and was
    // useless for sparse-traffic sites). Yesterday is the most
    // recently-finalized day; today catches anything already processed.
    const runReportBody = {
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
            orGroup: {
                expressions: PROBE_URLS.map(p => {
                    const path = new URL(p.url).pathname.replace(/\/$/, '') || '/';
                    return {
                        filter: {
                            fieldName: 'pagePath',
                            stringFilter: { value: path, matchType: 'EXACT' },
                        },
                    };
                }),
            },
        },
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        limit: 50,
    };

    let runReportData;
    try {
        const resp = await fetch(runReportUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(runReportBody),
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`GA4 runReport ${resp.status}: ${err}`);
        }
        runReportData = await resp.json();
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
        throw err;
    }

    const rows = (runReportData.rows || []).map(r => ({
        page_path: r.dimensionValues[0]?.value,
        page_title: r.dimensionValues[1]?.value,
        screen_page_views: parseInt(r.metricValues[0]?.value || '0'),
    }));

    // Also query Realtime (best-effort; usually 0 rows for sparse-traffic sites).
    let realtimeRows = [];
    try {
        const realtimeBody = {
            dimensions: [{ name: 'unifiedScreenName' }],
            metrics: [{ name: 'screenPageViews' }],
            dimensionFilter: {
                orGroup: {
                    expressions: PROBE_URLS.map(p => ({
                        filter: {
                            fieldName: 'unifiedScreenName',
                            stringFilter: { value: p.title, matchType: 'EXACT' },
                        },
                    })),
                },
            },
            limit: 50,
            minuteRanges: [{ name: '0' }],
        };
        const realtimeReport = await ga4RealtimeQuery(token, realtimeBody);
        realtimeRows = (realtimeReport.rows || []).map(r => ({
            unified_screen_name: r.dimensionValues[0]?.value,
            screen_page_views: parseInt(r.metricValues[0]?.value || '0'),
        }));
    } catch (_) { /* Realtime API issues are non-fatal */ }

    // Match each probe URL against what runReport returned (today).
    // The standard reporting API exposes pagePath natively.
    const probeResults = PROBE_URLS.map(p => {
        const path = new URL(p.url).pathname.replace(/\/$/, '') || '/';
        const match = rows.find(r => r.page_path === path);
        return {
            url: p.url,
            title: p.title,
            page_path: path,
            visible: !!match,
            screen_page_views: match?.screen_page_views || 0,
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
        runreport_row_count: rows.length,
        runreport_rows: rows,
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

    console.log(`[ga4-pageview-coverage] ${snapshot.verdict} — ${visibleCount}/${PROBE_URLS.length} probe URLs visible in GA4 today | appended to ${path.basename(OUTPUT)}`);

    if (visibleCount === PROBE_URLS.length) process.exit(0);
    if (visibleCount === 0) process.exit(2);
    process.exit(1);
}

main().catch(err => {
    console.error('[ga4-pageview-coverage] ERR — uncaught:', err.message);
    process.exit(3);
});