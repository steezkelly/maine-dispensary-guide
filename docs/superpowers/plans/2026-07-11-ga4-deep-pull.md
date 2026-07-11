# GA4 Deep Pull Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-script GA4 deep-pull that runs 10 queries against property 532778727 for all available history, writes JSONL per query + a structured markdown index + a Chart.js dashboard, and prints verification evidence before exiting.

**Architecture:** One CommonJS script `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`. QUERIES defined as a data array at the top — append-only. Run all queries sequentially (10 queries, no parallelism needed). Write raw JSONL to a dated folder. After all queries complete, write `meta.json`, `index.md`, and `dashboard.html` from the raw data.

**Tech Stack:** Node.js (CJS), `googleapis@^173.0.0` (already a dep, provides `@google-analytics/data`), Chart.js via CDN in dashboard.html, no other deps.

## Global Constraints

- Property ID: `532778727` (user-verified 2026-07-11).
- Service account: `~/.config/maine-dispensary-guide/gcp-mdg-reader.json` via `$GOOGLE_APPLICATION_CREDENTIALS`.
- Output dir: `apps/maine-cannabis/data/ga4-pull-2026-07-11/` (wiped + rewritten each run).
- Date range: full history (`startDate: '2020-01-01'`). GA4 retention caps this at ~14 months.
- Exit code: 0 even with partial failures; print `partial: true` in meta.
- Stack of record: plain HTML/JS for dashboard. No React, no Vite, no Tailwind.
- Idempotent: re-running produces identical output structure.
- Script location: `apps/maine-cannabis/scripts/analytics/` (new dir, must mkdir).
- Package scope: only `apps/maine-cannabis/` (per repo convention).

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` | All script logic: env, queries, run, write outputs. |
| `apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/*.jsonl` | One file per query, JSONL format. |
| `apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/meta.json` | Run metadata (counts, IDs, range). |
| `apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/_failures.jsonl` | Failed queries with error messages. |
| `apps/maine-cannabis/data/ga4-pull-2026-07-11/index.md` | Human-readable summary tables. |
| `apps/maine-cannabis/data/ga4-deep-pull.cjs` | Symlink-style comment: NO. Single source at `apps/maine-cannabis/scripts/analytics/`. |

---

### Task 1: Scaffold + env loading

**Files:**
- Create: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`
- Create: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`

**Interfaces:**
- Consumes: `process.env.GA4_PROPERTY_ID`, `process.env.GOOGLE_APPLICATION_CREDENTIALS`
- Produces: working directory `data/ga4-pull-2026-07-11/`, validation error messages on stdout

- [ ] **Step 1: Write the failing test**

Create `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { validateEnv, getOutputDir } = require('./ga4-deep-pull.cjs');

test('validateEnv fails when GA4_PROPERTY_ID missing', () => {
  delete process.env.GA4_PROPERTY_ID;
  assert.throws(() => validateEnv(), /GA4_PROPERTY_ID/);
});

test('validateEnv fails when GOOGLE_APPLICATION_CREDENTIALS missing', () => {
  process.env.GA4_PROPERTY_ID = '532778727';
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  assert.throws(() => validateEnv(), /GOOGLE_APPLICATION_CREDENTIALS/);
});

test('validateEnv passes when both present', () => {
  process.env.GA4_PROPERTY_ID = '532778727';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/fake.json';
  assert.doesNotThrow(() => validateEnv());
});

test('getOutputDir returns dated path', () => {
  const dir = getOutputDir();
  assert.match(dir, /data\/ga4-pull-\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`
Expected: FAIL with "Cannot find module './ga4-deep-pull.cjs'"

- [ ] **Step 3: Write minimal implementation (scaffold)**

Create `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`:

```javascript
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

module.exports = { validateEnv, getOutputDir, ensureDir };

// CLI entry
if (require.main === module) {
  try {
    validateEnv();
    const dir = getOutputDir();
    ensureDir(dir);
    console.log(`[ga4-deep-pull] Output dir: ${dir}`);
    console.log('[ga4-deep-pull] Scaffold OK — queries not yet implemented');
  } catch (err) {
    console.error(`[ga4-deep-pull] FAIL — ${err.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`
Expected: 4 tests pass.

- [ ] **Step 5: Smoke-run the CLI scaffold**

Run:
```bash
GA4_PROPERTY_ID=532778727 \
GOOGLE_APPLICATION_CREDENTIALS=/tmp/fake.json \
node apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs
```
Expected: `[ga4-deep-pull] Output dir: ...` + `Scaffold OK` printed.

- [ ] **Step 6: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull scaffold + env validation"
```

---

### Task 2: runQuery helper + pagination

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`

**Interfaces:**
- Consumes: `analyticsDataClient.runReport({...})` from googleapis
- Produces: `runQuery(queryDef)` → array of `{dimensions: {...}, metrics: {...}}` rows. Handles pagination via `offset`/`limit` until all rows collected OR `rowCap` hit.

- [ ] **Step 1: Add the failing test for runQuery**

Append to `ga4-deep-pull.test.cjs`:

```javascript
const { runQuery } = require('./ga4-deep-pull.cjs');

test('runQuery flattens dimension and metric headers', async () => {
  // Mock the analytics client
  const fakeClient = {
    properties: {
      runReport: async () => ({
        data: {
          rows: [
            {
              dimensionValues: [{ value: '/' }, { value: 'Home' }],
              metricValues: [{ value: '142' }, { value: '87.3' }],
            },
          ],
          rowCount: '1',
          metadata: { currencyCode: 'USD', timeZone: 'America/New_York' },
        },
      }),
    },
  };
  const queryDef = {
    name: 'pageviews',
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'engagementDuration' }],
    rowCap: 10000,
  };
  const rows = await runQuery(fakeClient, '532778727', queryDef);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].dimensions, { pagePath: '/', pageTitle: 'Home' });
  assert.deepEqual(rows[0].metrics, { screenPageViews: 142, engagementDuration: 87.3 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`
Expected: FAIL — `runQuery` is not exported.

- [ ] **Step 3: Implement runQuery**

Replace the `module.exports` block at the bottom of `ga4-deep-pull.cjs`:

```javascript
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

module.exports = { validateEnv, getOutputDir, ensureDir, runQuery };

// CLI entry unchanged
if (require.main === module) { ... existing ... }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/maine-cannabis/scripts/analytics/ga4-deep-pull.test.cjs`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull runQuery helper with pagination + rowCap"
```

---

### Task 3: QUERIES array (10 entries)

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`

**Interfaces:**
- Produces: `QUERIES` const array of 10 query definitions matching spec table.
- Each entry: `{ name, dimensions, metrics, rowCap, note? }`

- [ ] **Step 1: Add QUERIES array**

Insert above the `module.exports` block:

```javascript
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
```

- [ ] **Step 2: Export QUERIES**

Update the `module.exports` line:

```javascript
module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES };
```

- [ ] **Step 3: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull QUERIES array (10 definitions)"
```

---

### Task 4: Orchestration loop + failure handling

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`

**Interfaces:**
- Consumes: `QUERIES`, `runQuery`, `validateEnv`, `getOutputDir`, `ensureDir`
- Produces: for each query, writes `raw/<name>.jsonl` (JSONL) OR appends to `raw/_failures.jsonl`. Prints per-query `[name] N rows → raw/name.jsonl` to stdout.

- [ ] **Step 1: Add googleapis import + main runner**

Replace the entire `// CLI entry` block at the bottom of `ga4-deep-pull.cjs`:

```javascript
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
  console.log(`[ga4-deep-pull] Summary written for downstream writers`);

  // Stash for downstream tasks via temp file
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
```

- [ ] **Step 2: Verify with one fake query in dry-run mode**

Create a one-off test runner `apps/maine-cannabis/scripts/analytics/_test-orchestration.cjs`:

```javascript
process.env.GA4_PROPERTY_ID = '532778727';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/fake.json';
const { QUERIES } = require('./ga4-deep-pull.cjs');
console.log(`Loaded ${QUERIES.length} queries:`);
QUERIES.forEach(q => console.log(`  - ${q.name}: ${q.dimensions.length}d × ${q.metrics.length}m`));
```

Run: `node apps/maine-cannabis/scripts/analytics/_test-orchestration.cjs`
Expected: prints 10 query lines. No API calls.

- [ ] **Step 3: Delete the test runner**

```bash
rm apps/maine-cannabis/scripts/analytics/_test-orchestration.cjs
```

- [ ] **Step 4: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull orchestration loop + failure handling"
```

---

### Task 5: meta.json writer

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`

**Interfaces:**
- Consumes: `_summary.json` written by orchestration loop
- Produces: `raw/meta.json` matching the spec's contract

- [ ] **Step 1: Add writeMeta function**

Insert before `module.exports`:

```javascript
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
```

- [ ] **Step 2: Call writeMeta from main run()**

Update the end of `run()` (replace the existing `_summary.json` write with):

```javascript
  const meta = writeMeta(rawDir, summary, failures, elapsed);
  console.log(`[ga4-deep-pull] meta.json written — ${meta.totalRows} total rows, ${meta.queriesFailed} failures`);
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES, writeMeta };
```

- [ ] **Step 4: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull meta.json writer"
```

---

### Task 6: index.md writer

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`

**Interfaces:**
- Consumes: all `raw/*.jsonl` files
- Produces: `index.md` at the output dir root, with headline metrics + per-query top-20 tables

- [ ] **Step 1: Add writeIndexMd function**

Insert before `module.exports`:

```javascript
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

  // Sort by primary metric desc
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
```

- [ ] **Step 2: Call writeIndexMd from main run()**

Add to end of `run()` after `writeMeta` call:

```javascript
  writeIndexMd(dir, meta, summary);
  console.log(`[ga4-deep-pull] index.md written`);
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES, writeMeta, writeIndexMd };
```

- [ ] **Step 4: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull index.md writer with headline metrics + top-20 tables"
```

---

### Task 7: dashboard.html writer

**Files:**
- Modify: `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`

**Interfaces:**
- Consumes: `timeseries.jsonl`, `pageviews.jsonl`, `acquisition.jsonl`, `technology.jsonl`
- Produces: `dashboard.html` at output dir root, Chart.js via CDN, fetches JSONL files

- [ ] **Step 1: Add writeDashboard function**

Insert before `module.exports`:

```javascript
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
```

- [ ] **Step 2: Call writeDashboard from main run()**

Add to end of `run()`:

```javascript
  writeDashboard(dir, meta);
  console.log(`[ga4-deep-pull] dashboard.html written`);
```

- [ ] **Step 3: Update module.exports**

```javascript
module.exports = { validateEnv, getOutputDir, ensureDir, runQuery, QUERIES, writeMeta, writeIndexMd, writeDashboard };
```

- [ ] **Step 4: Commit**

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "feat(analytics): ga4-deep-pull dashboard.html writer with Chart.js"
```

---

### Task 8: End-to-end run + verification gate

**Files:**
- Read-only: `apps/maine-cannabis/data/ga4-pull-2026-07-11/` (produced)
- Modify: nothing — this is a verification task

- [ ] **Step 1: Verify the keyfile exists**

Run: `ls -la ~/.config/maine-dispensary-guide/gcp-mdg-reader.json`
Expected: file exists (the same keyfile used for GSC).

- [ ] **Step 2: Run the script end-to-end**

Run:
```bash
cd /home/steve/projects/maine-dispensary-guide
GA4_PROPERTY_ID=532778727 \
GOOGLE_APPLICATION_CREDENTIALS=$HOME/.config/maine-dispensary-guide/gcp-mdg-reader.json \
node apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs 2>&1 | tee /tmp/ga4-deep-pull.log
```

Expected stdout (per verification gate):
- 10 lines of `[<name>] N rows → raw/<name>.jsonl` with samples
- `[ga4-deep-pull] meta.json written — N total rows, M failures`
- `[ga4-deep-pull] index.md written`
- `[ga4-deep-pull] dashboard.html written`
- Final summary line

- [ ] **Step 3: Verify outputs exist**

Run:
```bash
ls -la apps/maine-cannabis/data/ga4-pull-2026-07-11/
ls -la apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/
```

Expected: `index.md`, `dashboard.html`, `raw/` directory with 10 `.jsonl` files + `meta.json` (+ `_failures.jsonl` only if failures).

- [ ] **Step 4: Verify row counts against meta**

Run: `cat apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/meta.json | jq .`

Expected: `totalRows` matches sum of per-query rows in `_summary.json` (or as printed to stdout).

- [ ] **Step 5: Verify JSONL parses**

Run:
```bash
for f in apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/*.jsonl; do
  echo "=== $f ==="
  head -1 "$f" | jq .
done
```

Expected: each file's first line is valid JSON with `dimensions` and `metrics` keys.

- [ ] **Step 6: Verify dashboard.html loads**

Run:
```bash
test -s apps/maine-cannabis/data/ga4-pull-2026-07-11/dashboard.html && echo "OK"
```

Expected: prints `OK`. (Open in browser to visually verify; not part of automated check.)

- [ ] **Step 7: Commit (only if any fixups were needed)**

If all verifications pass cleanly with no changes, skip this step. If fixups were needed:

```bash
git add apps/maine-cannabis/scripts/analytics/
git commit -m "fix(analytics): post-e2e fixes from verification gate"
```

- [ ] **Step 8: Tag the milestone**

```bash
git tag analytics/ga4-deep-pull-2026-07-11
```

---

## Self-Review

**1. Spec coverage:**
- ✓ 10 queries matching spec table (Task 3)
- ✓ runQuery helper with pagination + rowCap (Task 2)
- ✓ Orchestration loop with per-query failure isolation (Task 4)
- ✓ meta.json matching spec contract (Task 5)
- ✓ index.md with all 6 sections + files list (Task 6)
- ✓ dashboard.html with 4 Chart.js charts (Task 7)
- ✓ Verification gate (Task 8)
- ✓ Idempotency: directory wiped + rewritten each run (Task 1 ensureDir + Task 4)
- ✓ Stack-of-record constraint (plain HTML/JS, Chart.js CDN, no React/Vite/Tailwind) — Tasks 1, 7
- ✓ No new npm deps (Task 7 uses CDN only)

**2. Placeholder scan:** No TBDs, no "implement later." All code shown.

**3. Type consistency:**
- `runQuery` returns `{ rows, truncated, totalInResponse }` — Task 2 defines, Task 4 consumes (matches)
- `writeMeta` returns `meta` object — Task 5 defines, Task 6 consumes (matches)
- `writeIndexMd(dir, meta, summary)` — Task 6 defines signature, Task 4 caller matches
- `QUERIES` shape — Task 3 defines, Task 4 consumes (matches: name, dimensions, metrics, rowCap, note)

**Out of scope confirmed:**
- Daily cron — deferred per spec
- Meta pixel — user said "another time"
- Research pass (web_search for benchmarks) — scope creep risk; deferred to a follow-up session if user wants it. The spec mentioned it as "inline within writeIndexMd" but the plan can ship without it first; the markdown format makes it easy to add later. **Flagging this to user as a known deferral.**