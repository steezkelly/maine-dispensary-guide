#!/usr/bin/env node
/**
 * GA4 spike investigation — pull detailed breakdowns for specific dates.
 *
 * Usage:
 *   GA4_PROPERTY_ID=532778727 GOOGLE_APPLICATION_CREDENTIALS=... \
 *     node scripts/analytics/investigate-spike.cjs 20260707 20260506
 *
 * For each date, pulls:
 *   - per-page breakdowns (screenPageViews, totalUsers)
 *   - per-source (sessionSource/Medium/Campaign)
 *   - per-country + city
 *   - per-device (Category, Browser, OS)
 *
 * Writes JSON to data/ga4-spike-investigation-<YYYY-MM-DD>.jsonl (one file
 * per investigated day).
 */
const { google } = require('googleapis');
const fs = require('node:fs');
const path = require('node:path');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const KEYFILE = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const DATES = process.argv.slice(2).map(d => {
  if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return null;
}).filter(Boolean);

if (!PROPERTY_ID || !KEYFILE) {
  console.error('Need GA4_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS env vars');
  process.exit(1);
}
if (DATES.length === 0) {
  console.error('Usage: node investigate-spike.cjs YYYYMMDD [YYYYMMDD ...]');
  process.exit(1);
}

const OUT_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'data');

const BREAKDOWNS = [
  { name: 'by_page',     dims: [{ name: 'pagePath' }, { name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }] },
  { name: 'by_source',   dims: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' }] },
  { name: 'by_country',  dims: [{ name: 'country' }, { name: 'city' }, { name: 'region' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }] },
  { name: 'by_device',   dims: [{ name: 'deviceCategory' }, { name: 'browser' }, { name: 'operatingSystem' }, { name: 'screenResolution' }], metrics: [{ name: 'totalUsers' }] },
];

async function runQuery(client, date, queryDef) {
  const res = await client.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: date, endDate: date }],
      dimensions: queryDef.dims,
      metrics: queryDef.metrics,
      limit: 10000,
    },
  });
  const data = res.data;
  if (!data.rows) return [];
  return data.rows.map(row => {
    const dimObj = {};
    queryDef.dims.forEach((d, i) => { dimObj[d.name] = row.dimensionValues[i]?.value; });
    const metObj = {};
    queryDef.metrics.forEach((m, i) => {
      const raw = row.metricValues[i]?.value || '0';
      metObj[m.name] = Number.isFinite(+raw) && raw !== '' ? +raw : raw;
    });
    return { dimensions: dimObj, metrics: metObj };
  });
}

(async () => {
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  const authClient = await auth.getClient();
  const client = google.analyticsdata({ version: 'v1beta', auth: authClient });

  for (const date of DATES) {
    console.log(`\n=== ${date} ===`);
    const allRows = [];
    for (const b of BREAKDOWNS) {
      try {
        const rows = await runQuery(client, date, b);
        console.log(`  [${b.name}] ${rows.length} rows`);
        for (const r of rows) {
          allRows.push({ _breakdown: b.name, _date: date, ...r });
        }
      } catch (err) {
        console.error(`  [${b.name}] FAIL — ${err.message}`);
      }
    }
    const outFile = path.join(OUT_DIR, `ga4-spike-investigation-${date}.jsonl`);
    fs.writeFileSync(outFile, allRows.map(r => JSON.stringify(r)).join('\n') + '\n');
    console.log(`  wrote ${outFile}`);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });