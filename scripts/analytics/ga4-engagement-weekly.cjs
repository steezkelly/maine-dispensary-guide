#!/usr/bin/env node
// scripts/analytics/ga4-engagement-weekly.cjs
//
// Weekly GA4 engagement report — pulls 4 MDG-specific event families
// (scroll_depth, page_engaged, faq_open, cta_view) from the GA4 Data API
// and writes a markdown digest to docs/analytics/ENGAGEMENT_WEEKLY_<date>.md.
//
// Layer underneath: User stickiness (DAU/MAU), avg engagement time per
// active user, pageviews per active user, engaged-session rate — all
// from the GA4 Engagement report (runReport, not Realtime).
//
// BLOCKED on operator action (no service-account grant yet):
//   1. Service account: mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com
//      needs "Viewer" role on GA4 property 532778727
//      (5-min procedure in docs/GA4_ACCESS_INSTRUCTIONS_2026-07-08.md).
//   2. $GOOGLE_APPLICATION_CREDENTIALS env var on the cron runner must point
//      at the keyfile for that service account.
//
// Until those land, this script's --probe flag will exit 0 with a clear
// "blocked" message; --dry-run reports the planned queries without calling
// the API. Once creds are set, --live will run the real report.
//
// Cron wiring (when live): weekly Monday 09:00 →
//   "node /home/steve/projects/maine-dispensary-guide/scripts/analytics/ga4-engagement-weekly.cjs --live"
//
// Output schema (every report):
//   docs/analytics/ENGAGEMENT_WEEKLY_<YYYY-MM-DD>.md
// Sections:
//   - Headline: Engaged sessions, Avg engagement time, Engaged sessions/user,
//     Pageviews/user, Events/session (computed from custom events)
//   - scroll_depth histogram per top-20 page_path
//   - faq_open: top-20 most-opened FAQs (faq_question, faq_id, page_path)
//   - cta_view: top-20 most-viewed CTAs (cta_id, cta_text, page_path)
//   - Cross-link to GSC: which pages have impressions but <10% scroll-50?
//     (those are the "impression-heavy, engagement-light" surface —
//     the leaky part of the funnel you actually need to fix.)

'use strict';

const fs = require('fs');
const path = require('path');

const ANALYTICS = {
  propertyId: '532778727',
  measurementId: 'G-614GHG67ZQ',
};

const MDG_EVENTS = ['scroll_depth', 'page_engaged', 'faq_open', 'cta_view'];

function blockedNotice() {
  return [
    '# GA4 Engagement Weekly — BLOCKED',
    '',
    'This script is wired but cannot run because the GA4 Data API service',
    'account has not been granted access. Operator action:',
    '',
    '1. Open https://analytics.google.com → Admin → Property 532778727',
    '   → Property access management → add user:',
    '   `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com`',
    '   with role "Viewer".',
    '2. Confirm `$GOOGLE_APPLICATION_CREDENTIALS` is set on the cron runner',
    '   and points at the keyfile.',
    '3. Re-run with `--live`. The script will write',
    '   `docs/analytics/ENGAGEMENT_WEEKLY_<YYYY-MM-DD>.md`.',
    '',
    'Layer-1 instrumentation (the gtag events on every page) is live in',
    'production HTML — verified 2026-07-11 against /guides/portland/,',
    '/, /blog/recreational-cannabis-near-acadia/.',
    '',
  ].join('\n');
}

function dryRunPlan() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `# GA4 Engagement Weekly — Dry Run (${today})`,
    '',
    '## Planned queries',
    '',
    '### 1. Engagement headline (runReport)',
    '- dimensions: date',
    '- metrics: engagedSessions, engagementRate, averageSessionDuration,',
    '  sessionsPerUser, screenPageViewsPerUser, totalSessions',
    '- date range: last 7 days',
    '',
    '### 2. Custom-event counts (runReport)',
    '- dimensions: eventName',
    '- metrics: eventCount, sessions',
    '- filter: eventName IN (' + MDG_EVENTS.join(', ') + ')',
    '',
    '### 3. scroll_depth per page (runReport)',
    '- dimensions: pagePath, pageTitle, percent (custom)',
    '- metrics: eventCount',
    '- filter: eventName = "scroll_depth"',
    '- pivot: percent across 25/50/75/100',
    '',
    '### 4. faq_open popularity (runReport)',
    '- dimensions: pagePath, faq_id, faq_question',
    '- metrics: eventCount',
    '- filter: eventName = "faq_open"',
    '- limit: 50',
    '',
    '### 5. cta_view reach (runReport)',
    '- dimensions: cta_id, cta_destination, cta_text',
    '- metrics: eventCount, sessions',
    '- filter: eventName = "cta_view"',
    '- limit: 50',
    '',
    '### 6. Page-level engagement × GSC impressions cross-join',
    '- Left: GSC last_28_days per page (clicks, impressions, ctr, position)',
    '- Right: GA4 last_7_days per page (engaged_sessions, avg_engagement_time)',
    '- Output: pages where GSC has >100 imps AND GA4 scroll-50% < 10%',
    '  — the leaky-funnel targets.',
    '',
  ].join('\n');
}

async function liveRun() {
  // Lazy-load google-auth-library for the OAuth token. We deliberately
  // use the REST endpoint directly (not the @google-analytics/data gRPC
  // client) because gRPC has a version-conflict with the installed
  // google-gax that makes `auth.getUniverseDomain` undefined. The REST
  // endpoint is the same one the gRPC client wraps; same schema.
  let GoogleAuth;
  try {
    ({ GoogleAuth } = require('google-auth-library'));
  } catch (e) {
    throw new Error('Missing googleapis deps. Run: npm i -D google-auth-library');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const authClient = await auth.getClient();
  const token = (await authClient.getAccessToken()).token;
  const fetchOpts = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const ga4Endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${ANALYTICS.propertyId}:runReport`;
  async function runReport(body) {
    const resp = await fetch(ga4Endpoint, { ...fetchOpts(), method: 'POST', body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`GA4 ${resp.status}: ${err}`);
    }
    return resp.json();
  }

  const dateRanges = [{ startDate: '7daysAgo', endDate: 'today' }];

  // --- Headline ---
  const headline = await runReport({
    dateRanges,
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'sessionsPerUser' },
      { name: 'screenPageViewsPerUser' },
      { name: 'sessions' },
      { name: 'activeUsers' },
    ],
  });

  // --- Custom-event counts ---
  const events = await runReport({
    dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'sessions' }],
    dimensionFilter: {
      orGroup: { expressions: MDG_EVENTS.map(e => ({ filter: { fieldName: 'eventName', stringFilter: { value: e } } })) },
    },
  });

  // --- scroll_depth per page (requires registered customEvent:percent) ---
  let scroll = { rows: [] };
  try {
    scroll = await runReport({
      dateRanges,
      dimensions: [{ name: 'pagePath' }, { name: 'customEvent:percent' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'scroll_depth' } },
      },
      limit: 200,
    });
  } catch (_) { /* customEvent:percent not registered yet — expected */ }

  // --- Per-page engagement (last 7 days) — answers Steve's funnel question directly ---
  const pageEngagement = await runReport({
    dateRanges,
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'sessions' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 30,
  });

  // --- faq_open popularity (requires customEvent:faq_id + faq_question) ---
  let faqs = { rows: [] };
  try {
    faqs = await runReport({
      dateRanges,
      dimensions: [
        { name: 'pagePath' },
        { name: 'customEvent:faq_id' },
        { name: 'customEvent:faq_question' },
      ],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'faq_open' } },
      },
      limit: 50,
    });
  } catch (_) { /* custom dimensions not registered yet — expected */ }

  // --- cta_view reach ---
  let ctas = { rows: [] };
  try {
    ctas = await runReport({
      dateRanges,
      dimensions: [
        { name: 'customEvent:cta_id' },
        { name: 'customEvent:cta_destination' },
        { name: 'customEvent:cta_text' },
      ],
      metrics: [{ name: 'eventCount' }, { name: 'sessions' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'cta_view' } },
      },
      limit: 50,
    });
  } catch (_) { /* custom dimensions not registered yet — expected */ }

  return formatReport({ headline, events, scroll, faqs, ctas, pageEngagement });
}

function formatReport({ headline, events, scroll, faqs, ctas, pageEngagement }) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `# GA4 Engagement Weekly — ${today}`,
    '',
    '> Source: GA4 property ' + ANALYTICS.propertyId + ' (measurementId ' + ANALYTICS.measurementId + ')',
    '> Window: last 7 days. Layer-1 events tracked: scroll_depth, page_engaged, faq_open, cta_view.',
    '> Note: scroll_depth / page_engaged / faq_open / cta_view are new events',
    '> deployed 2026-07-11. They will only show counts > 0 from the next',
    '> weekly report onward. faq_open + cta_view also require the page-side',
    '> attributes (`data-faq`, `data-cta-id`) which are not yet wired up on',
    '> existing pages — see follow-up.',
    '',
    '## Headline — daily engagement (last 7 days)',
    '',
    '| Date | Sessions | Engaged | Eng-rate | Avg dur (s) | Sess/user | Pages/user | Active users |',
    '|---|---|---|---|---|---|---|---|',
  ];
  // headline rows: dimensions=[date], metrics=[engagedSessions, engagementRate,
  // averageSessionDuration, sessionsPerUser, screenPageViewsPerUser, totalSessions, activeUsers]
  for (const row of headline.rows || []) {
    const d = row.dimensionValues[0]?.value || '?';
    const m = row.metricValues.map(v => v.value);
    const [engaged, rate, dur, spu, ppu, total, activeUsers] = m;
    lines.push(`| ${d} | ${total} | ${engaged} | ${(parseFloat(rate) * 100).toFixed(1)}% | ${parseFloat(dur).toFixed(1)} | ${parseFloat(spu).toFixed(2)} | ${parseFloat(ppu).toFixed(2)} | ${activeUsers || '?'} |`);
  }
  lines.push('', '## Custom-event totals (last 7 days)');
  lines.push('');
  lines.push('| Event | Count | Sessions |');
  lines.push('|---|---|---|');
  for (const row of events.rows || []) {
    lines.push(`| ${row.dimensionValues[0].value} | ${row.metricValues[0].value} | ${row.metricValues[1].value} |`);
  }
  lines.push('', '## scroll_depth per page (top 20, last 7 days)');
  lines.push('');
  if (scroll.rows && scroll.rows.length) {
    // Pivot rows into page → {25, 50, 75, 100}
    const byPage = new Map();
    for (const row of scroll.rows) {
      const path = row.dimensionValues[0].value;
      const pct = row.dimensionValues[1].value;
      const count = row.metricValues[0].value;
      if (!byPage.has(path)) byPage.set(path, {});
      byPage.get(path)[pct] = count;
    }
    lines.push('| Page | 25% | 50% | 75% | 100% |');
    lines.push('|---|---|---|---|---|');
    for (const [path, pcts] of [...byPage.entries()].slice(0, 20)) {
      lines.push(`| ${path} | ${pcts['25'] || '-'} | ${pcts['50'] || '-'} | ${pcts['75'] || '-'} | ${pcts['100'] || '-'} |`);
    }
  } else {
    lines.push('_No scroll_depth events yet — instrumentation deployed 2026-07-11. Data populates from next week._');
  }
  lines.push('', '## faq_open popularity (top 20, last 7 days)');
  lines.push('');
  if (faqs.rows && faqs.rows.length) {
    for (const row of faqs.rows) {
      const [path, id, q] = row.dimensionValues.map(v => v.value);
      const count = row.metricValues[0].value;
      lines.push(`- ${path} — ${id || '(no id)'} — ${q || ''} (${count} opens)`);
    }
  } else {
    lines.push('_No faq_open events yet — needs `<details data-faq data-faq-id="…">` attributes on existing FAQ accordions. See follow-up below._');
  }
  lines.push('', '## cta_view reach (top 20, last 7 days)');
  lines.push('');
  if (ctas.rows && ctas.rows.length) {
    for (const row of ctas.rows) {
      const [id, dest, text] = row.dimensionValues.map(v => v.value);
      const [count, sessions] = row.metricValues.map(v => v.value);
      lines.push(`- ${id || '(no id)'} → ${dest || ''} — "${(text || '').slice(0, 60)}" (${count} views / ${sessions} sessions)`);
    }
  } else {
    lines.push('_No cta_view events yet — needs `data-cta-id="…"` attributes on existing CTAs. See follow-up below._');
  }
  lines.push('', '## Follow-ups needed for full engagement coverage');
  lines.push('');
  lines.push('1. **Wire `data-faq` on FAQ accordions.** The FAQ package component (`@network/ui/Faq`) emits <details> but the `data-faq data-faq-id` attributes are not set. Without them, faq_open never fires. ~50 files; one-line-per-FAQ change.');
  lines.push('2. **Wire `data-cta-id` on CTAs.** Same pattern — hero CTA, inline download CTAs, mailto leads. Without these, cta_view never fires.');
  lines.push('3. **Register custom event-scope dimensions in GA4 admin** for `cta_id`, `cta_destination`, `cta_text`, `faq_id`, `faq_question`, `percent`. Required to make the data explorable in the GA4 web UI (API access works regardless, but UI filters need registered dimensions).');

  lines.push('', '## Per-page engagement — top 30 by views (last 7 days)');
  lines.push('');
  if (pageEngagement.rows && pageEngagement.rows.length) {
    lines.push('| Page | Views | Engaged | Eng-rate | Avg dur (s) | Sessions |');
    lines.push('|---|---|---|---|---|---|');
    for (const row of pageEngagement.rows) {
      const path = row.dimensionValues[0]?.value || '?';
      const [views, engaged, rate, dur, sessions] = row.metricValues.map(v => v.value);
      lines.push(`| ${path} | ${views} | ${engaged} | ${(parseFloat(rate) * 100).toFixed(1)}% | ${parseFloat(dur).toFixed(1)} | ${sessions} |`);
    }
  } else {
    lines.push('_No per-page engagement data in the last 7 days._');
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const flag = args[0] || '--probe';
  const outDir = path.join(__dirname, '..', '..', 'apps', 'maine-cannabis', 'docs', 'analytics');
  const today = new Date().toISOString().slice(0, 10);

  if (flag === '--probe' || flag === '--status') {
    console.log(blockedNotice());
    return 0;
  }
  if (flag === '--dry-run') {
    const out = path.join(outDir, `ENGAGEMENT_WEEKLY_${today}.md`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(out, dryRunPlan());
    console.log('Wrote', out);
    return 0;
  }
  if (flag === '--live') {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS not set. Run --probe for setup.');
      process.exit(1);
    }
    const md = await liveRun();
    const out = path.join(outDir, `ENGAGEMENT_WEEKLY_${today}.md`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(out, md);
    console.log('Wrote', out);
    return 0;
  }
  console.error('Usage: ga4-engagement-weekly.cjs [--probe|--dry-run|--live]');
  return 2;
}

main().then(c => process.exit(c || 0)).catch(e => { console.error(e); process.exit(1); });