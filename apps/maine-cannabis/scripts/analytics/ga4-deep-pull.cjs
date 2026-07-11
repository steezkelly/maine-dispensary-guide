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

function writeMeta(rawDir, summary, failures, elapsed) {
  const totalRows = summary.reduce((acc, s) => acc + (s.rows || 0), 0);
  const truncated = summary.filter(s => s.truncated).map(s => `${s.name}:hit rowCap`);
  const meta = {
    runAt: new Date().toISOString(),
    propertyId: process.env.GA4_PROPERTY_ID,
    measurementId: 'G-614GHG67ZQ',
    queriesRun: summary.length,
    queriesFailed: failures.length,
    totalRows,
    dateRange: { start: '2020-01-01', end: 'today' },
    truncated,
    partial: failures.length > 0,
    elapsedSeconds: parseFloat(elapsed),
  };
  fs.writeFileSync(path.join(rawDir, 'meta.json'), JSON.stringify(meta, null, 2));
  return meta;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split('\n').map(line => JSON.parse(line));
}

function tableFromRows(rows, dimKeys, metKeys) {
  if (!rows.length) return '_no rows_';
  const header = '| ' + [...dimKeys, ...metKeys].join(' | ') + ' |';
  const sep = '|' + [...dimKeys, ...metKeys].map(() => '---').join('|') + '|';
  const body = rows.slice(0, 20).map(r => {
    const dims = dimKeys.map(k => String(r.dimensions[k] ?? '').replace(/\|/g, '\\|')).join(' | ');
    const mets = metKeys.map(k => String(r.metrics[k] ?? '')).join(' | ');
    return `| ${dims} | ${mets} |`;
  }).join('\n');
  return `${header}\n${sep}\n${body}`;
}

function writeIndexMd(dir, meta, summary) {
  const rawDir = path.join(dir, 'raw');
  const timeseries = readJsonl(path.join(rawDir, 'timeseries.jsonl'));
  const pageviews = readJsonl(path.join(rawDir, 'pageviews.jsonl'));
  const geo = readJsonl(path.join(rawDir, 'geography.jsonl'));
  const acq = readJsonl(path.join(rawDir, 'acquisition.jsonl'));
  const tech = readJsonl(path.join(rawDir, 'technology.jsonl'));
  const leads = readJsonl(path.join(rawDir, 'lead_capture.jsonl'));
  const newRet = readJsonl(path.join(rawDir, 'new_vs_returning.jsonl'));

  const totalUsers = timeseries.reduce((s, r) => s + (r.metrics.users || 0), 0);
  const totalSessions = timeseries.reduce((s, r) => s + (r.metrics.sessions || 0), 0);
  const totalPageviews = timeseries.reduce((s, r) => s + (r.metrics.screenPageViews || 0), 0);
  const totalEvents = timeseries.reduce((s, r) => s + (r.metrics.eventCount || 0), 0);

  const sortBy = (rows, metric) => [...rows].sort((a, b) => (b.metrics[metric] || 0) - (a.metrics[metric] || 0));

  const lines = [
    `# GA4 Deep Pull — ${meta.runAt.slice(0, 10)}`,
    ``,
    `**Property:** ${meta.propertyId} (G-614GHG67ZQ) | **Date range:** ${meta.dateRange.start} to ${meta.dateRange.end} | **Rows:** ${meta.totalRows}`,
    ``,
    `## Headline`,
    ``,
    `- **Total users:** ${totalUsers.toLocaleString()}`,
    `- **Total sessions:** ${totalSessions.toLocaleString()}`,
    `- **Total pageviews:** ${totalPageviews.toLocaleString()}`,
    `- **Total events:** ${totalEvents.toLocaleString()}`,
    `- **lead_capture events:** ${leads.reduce((s, r) => s + (r.metrics.eventCount || 0), 0).toLocaleString()}`,
    ``,
    `## By page (top 20 of ${pageviews.length})`,
    ``,
    tableFromRows(sortBy(pageviews, 'screenPageViews'), ['pagePath', 'pageTitle'], ['screenPageViews', 'engagementDuration', 'bounceRate']),
    ``,
    `## By geography (top 20 of ${geo.length})`,
    ``,
    tableFromRows(sortBy(geo, 'totalUsers'), ['country', 'city', 'region'], ['totalUsers', 'sessions']),
    ``,
    `## By source (top 20 of ${acq.length})`,
    ``,
    tableFromRows(sortBy(acq, 'sessions'), ['sessionSource', 'sessionMedium', 'sessionCampaignName'], ['sessions', 'engagedSessions', 'engagementRate']),
    ``,
    `## By device (top 20 of ${tech.length})`,
    ``,
    tableFromRows(sortBy(tech, 'users'), ['deviceCategory', 'browser', 'operatingSystem'], ['users']),
    ``,
    `## Lead capture funnel (${leads.length} rows)`,
    ``,
    tableFromRows(sortBy(leads, 'eventCount'), ['form_name', 'page_path', 'stage'], ['eventCount']),
    ``,
    `## New vs returning`,
    ``,
    tableFromRows(newRet, ['newVsReturning'], ['totalUsers', 'engagementRate', 'sessions']),
    ``,
    `## Time series`,
    ``,
    `Full time-series chart in \`dashboard.html\`. Raw: \`raw/timeseries.jsonl\` (${timeseries.length} rows).`,
    ``,
    `## Files`,
    ``,
    summary.map(s => `- \`raw/${s.name}.jsonl\` — ${s.rows} rows${s.failed ? ' (FAILED)' : ''}${s.truncated ? ' (TRUNCATED)' : ''}`).join('\n'),
    ``,
  ];
  fs.writeFileSync(path.join(dir, 'index.md'), lines.join('\n'));
}

function writeDashboard(dir, meta) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GA4 Deep Pull — ${meta.runAt.slice(0, 10)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 2rem auto; max-width: 1100px; padding: 0 1rem; color: #101820; }
    h1 { color: #0D4E50; border-bottom: 2px solid #588157; padding-bottom: 0.5rem; }
    .chart-box { background: #fff; border: 1px solid #D1D1C1; border-radius: 0.75rem; padding: 1.5rem; margin: 1.5rem 0; }
    .meta { background: #F2F2E2; padding: 1rem; border-radius: 0.5rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>GA4 Deep Pull — ${meta.runAt.slice(0, 10)}</h1>
  <div class="meta">
    <strong>Property:</strong> ${meta.propertyId} (G-614GHG67ZQ) ·
    <strong>Range:</strong> ${meta.dateRange.start} to ${meta.dateRange.end} ·
    <strong>Rows:</strong> ${meta.totalRows} ·
    <strong>Queries:</strong> ${meta.queriesRun - meta.queriesFailed}/${meta.queriesRun}
  </div>

  <div class="chart-box"><canvas id="tsChart"></canvas></div>
  <div class="chart-box"><canvas id="pageChart"></canvas></div>
  <div class="chart-box"><canvas id="srcChart"></canvas></div>
  <div class="chart-box"><canvas id="devChart"></canvas></div>

<script>
async function loadJsonl(p) {
  const r = await fetch(p);
  const t = await r.text();
  return t.trim().split('\\n').map(l => JSON.parse(l));
}

(async () => {
  const [timeseries, pageviews, acquisition, technology] = await Promise.all([
    loadJsonl('raw/timeseries.jsonl'),
    loadJsonl('raw/pageviews.jsonl'),
    loadJsonl('raw/acquisition.jsonl'),
    loadJsonl('raw/technology.jsonl'),
  ]);

  // Time series
  new Chart(document.getElementById('tsChart'), {
    type: 'line',
    data: {
      labels: timeseries.map(r => r.dimensions.date),
      datasets: [
        { label: 'Users', data: timeseries.map(r => r.metrics.users), borderColor: '#0D4E50', tension: 0.2 },
        { label: 'Sessions', data: timeseries.map(r => r.metrics.sessions), borderColor: '#588157', tension: 0.2 },
        { label: 'Pageviews', data: timeseries.map(r => r.metrics.screenPageViews), borderColor: '#C4D4B6', tension: 0.2 },
      ],
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Daily users / sessions / pageviews' } } },
  });

  // Top 10 pages
  const topPages = [...pageviews].sort((a, b) => b.metrics.screenPageViews - a.metrics.screenPageViews).slice(0, 10);
  new Chart(document.getElementById('pageChart'), {
    type: 'bar',
    data: {
      labels: topPages.map(r => r.dimensions.pagePath || '/'),
      datasets: [{ label: 'Pageviews', data: topPages.map(r => r.metrics.screenPageViews), backgroundColor: '#0D4E50' }],
    },
    options: { responsive: true, indexAxis: 'y', plugins: { title: { display: true, text: 'Top 10 pages by pageviews' } } },
  });

  // Top 10 sources
  const topSrc = [...acquisition].sort((a, b) => b.metrics.sessions - a.metrics.sessions).slice(0, 10);
  new Chart(document.getElementById('srcChart'), {
    type: 'bar',
    data: {
      labels: topSrc.map(r => (r.dimensions.sessionSource || '(direct)') + ' / ' + (r.dimensions.sessionMedium || '')),
      datasets: [{ label: 'Sessions', data: topSrc.map(r => r.metrics.sessions), backgroundColor: '#588157' }],
    },
    options: { responsive: true, indexAxis: 'y', plugins: { title: { display: true, text: 'Top 10 acquisition sources' } } },
  });

  // Device split (aggregate by deviceCategory)
  const devMap = {};
  technology.forEach(r => {
    const k = r.dimensions.deviceCategory || '(unknown)';
    devMap[k] = (devMap[k] || 0) + (r.metrics.users || 0);
  });
  new Chart(document.getElementById('devChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(devMap),
      datasets: [{ data: Object.values(devMap), backgroundColor: ['#0D4E50', '#588157', '#C4D4B6', '#7A9A6A', '#F2F2E2'] }],
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Users by device category' } } },
  });
})();
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(dir, 'dashboard.html'), html);
}

module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES, writeMeta, writeIndexMd, writeDashboard, tableFromRows };

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

  // Write summary (for downstream writer passes)
  fs.writeFileSync(
    path.join(rawDir, '_summary.json'),
    JSON.stringify({ summary, failures, elapsed, propertyId: process.env.GA4_PROPERTY_ID }, null, 2)
  );

  // Write meta.json
  const meta = writeMeta(rawDir, summary, failures, elapsed);
  console.log(`[ga4-deep-pull] meta.json written — ${meta.totalRows} total rows, ${meta.queriesFailed} failures`);

  // Write index.md
  writeIndexMd(dir, meta, summary);
  console.log(`[ga4-deep-pull] index.md written`);

  // Write dashboard.html
  writeDashboard(dir, meta);
  console.log(`[ga4-deep-pull] dashboard.html written`);
}

if (require.main === module) {
  run().catch(err => {
    console.error(`[ga4-deep-pull] FATAL — ${err.message}`);
    process.exit(1);
  });
}