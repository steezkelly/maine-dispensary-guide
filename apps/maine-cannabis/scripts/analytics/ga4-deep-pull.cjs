#!/usr/bin/env node
/**
 * GA4 Deep Pull — one-time comprehensive pull of all available GA4 data
 * for property 532778727. Run with:
 *
 *   GA4_PROPERTY_ID=532778727 \
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/maine-dispensary-guide/gcp-mdg-reader.json \
 *   node apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs
 *
 * Output: apps/maine-cannabis/data/ga4-pull-<YYYY-MM-DD>/
 */

const fs = require('node:fs');
const path = require('node:path');

function validateEnv() {
  if (!process.env.GA4_PROPERTY_ID) {
    throw new Error('GA4_PROPERTY_ID env var required');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS env var required');
  }
}

function getOutputDir() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(
    __dirname,
    '..',
    '..',
    'data',
    `ga4-pull-${today}`
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
}

const QUERIES = [
  {
    name: 'pageviews',
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'engagementDuration' }, { name: 'bounceRate' }],
    rowCap: 10000,
  },
  {
    name: 'geography',
    dimensions: [{ name: 'country' }, { name: 'city' }, { name: 'region' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
    rowCap: 10000,
  },
  {
    name: 'acquisition',
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'engagementRate' }],
    rowCap: 5000,
  },
  {
    name: 'technology',
    dimensions: [{ name: 'deviceCategory' }, { name: 'browser' }, { name: 'operatingSystem' }, { name: 'screenResolution' }],
    metrics: [{ name: 'users' }],
    rowCap: 5000,
  },
  {
    name: 'lead_capture',
    dimensions: [{ name: 'customEvent:form_name' }, { name: 'customEvent:page_path' }, { name: 'customEvent:stage' }],
    metrics: [{ name: 'eventCount' }],
    rowCap: 5000,
    note: 'Custom event scope. Returns 0 rows if lead_capture never fired.',
  },
  {
    name: 'user_journey',
    dimensions: [{ name: 'userPseudoId' }, { name: 'sessionId' }, { name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    rowCap: 10000,
  },
  {
    name: 'new_vs_returning',
    dimensions: [{ name: 'newVsReturning' }],
    metrics: [{ name: 'totalUsers' }, { name: 'engagementRate' }, { name: 'sessions' }],
    rowCap: 10,
  },
  {
    name: 'timeseries',
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'users' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'eventCount' }],
    rowCap: 1000,
  },
  {
    name: 'landing_pages',
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
    rowCap: 5000,
  },
  {
    name: 'exit_pages',
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'exits' }],
    rowCap: 5000,
  },
];

async function runQuery(client, propertyId, queryDef, dateRange = { startDate: '2020-01-01', endDate: 'today' }) {
  const rows = [];
  const { dimensions, metrics, rowCap = 10000, pageSize = 10000 } = queryDef;
  let offset = 0;
  let truncated = false;
  let totalInResponse = 0;

  while (true) {
    const res = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [dateRange],
        dimensions,
        metrics,
        limit: Math.min(pageSize, rowCap - rows.length),
        offset,
      },
    });
    const data = res.data;
    if (!data.rows) break;
    totalInResponse = parseInt(data.rowCount || '0', 10);

    for (const row of data.rows) {
      const dimObj = {};
      dimensions.forEach((d, i) => {
        dimObj[d.name] = row.dimensionValues[i]?.value;
      });
      const metObj = {};
      metrics.forEach((m, i) => {
        const raw = row.metricValues[i]?.value || '0';
        metObj[m.name] = Number.isFinite(+raw) && raw !== '' ? +raw : raw;
      });
      rows.push({ dimensions: dimObj, metrics: metObj });
      if (rows.length >= rowCap) {
        truncated = true;
        break;
      }
    }

    if (truncated) break;
    if (rows.length >= totalInResponse) break;
    offset += data.rows.length;
  }

  return { rows, truncated, totalInResponse };
}

module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES };

const { google } = require('googleapis');

async function run() {
  validateEnv();
  const dir = getOutputDir();
  ensureDir(dir);
  const rawDir = path.join(dir, 'raw');
  const failuresPath = path.join(rawDir, '_failures.jsonl');

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const authClient = await auth.getClient();
  const client = google.analyticsdata({ version: 'v1beta', auth: authClient });

  const failures = [];
  const summary = [];
  const startTime = Date.now();

  for (const q of QUERIES) {
    try {
      const { rows, truncated, totalInResponse } = await runQuery(
        client,
        process.env.GA4_PROPERTY_ID,
        q
      );
      const outPath = path.join(rawDir, `${q.name}.jsonl`);
      const lines = rows.map(r =>
        JSON.stringify({
          dimensions: r.dimensions,
          metrics: r.metrics,
          _dateRange: '2020-01-01_to_today',
          _truncated: truncated || undefined,
          _totalAvailable: totalInResponse,
        })
      );
      fs.writeFileSync(outPath, lines.join('\n') + (lines.length ? '\n' : ''));
      const sample = rows.slice(0, 3);
      console.log(`[${q.name}] ${rows.length} rows → raw/${q.name}.jsonl${truncated ? ' (TRUNCATED)' : ''}`);
      console.log(`  sample: ${JSON.stringify(sample[0] || {})}`);
      summary.push({
        name: q.name,
        rows: rows.length,
        truncated,
        totalAvailable: totalInResponse,
        path: `raw/${q.name}.jsonl`,
        note: q.note,
      });
    } catch (err) {
      const failure = {
        query: q.name,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(failuresPath, JSON.stringify(failure) + '\n');
      failures.push(q.name);
      console.error(`[${q.name}] FAIL — ${err.message}`);
      summary.push({ name: q.name, rows: 0, failed: true, error: err.message });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[ga4-deep-pull] Done in ${elapsed}s — ${summary.length - failures.length}/${summary.length} queries OK, ${failures.length} failed`);

  fs.writeFileSync(
    path.join(rawDir, '_summary.json'),
    JSON.stringify({ summary, failures, elapsed, propertyId: process.env.GA4_PROPERTY_ID }, null, 2)
  );
}

if (require.main === module) {
  run().catch(err => {
    console.error(`[ga4-deep-pull] FATAL — ${err.message}`);
    process.exit(1);
  });
}