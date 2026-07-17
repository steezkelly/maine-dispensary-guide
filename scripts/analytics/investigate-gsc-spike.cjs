#!/usr/bin/env node
/**
 * One-off: pull GSC search analytics for a specific date, broken down by
 * query + page + date. Used to investigate spikes.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/analytics/investigate-gsc-spike.cjs 2026-07-07
 */
const { google } = require('googleapis');
const fs = require('node:fs');
const path = require('node:path');

const DATE = process.argv[2];
if (!DATE || !/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error('Usage: node investigate-gsc-spike.cjs YYYY-MM-DD');
  process.exit(1);
}

const { privateDataRoot } = require('../../apps/maine-cannabis/scripts/seo/gsc-private-data-root.cjs');
const OUT_DIR = privateDataRoot();
const SITE_URL = 'https://mainedispensaryguide.com/';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const client = await auth.getClient();
  const sc = google.searchconsole({ version: 'v1', auth: client });

  // Fetch all data for this single day (queries × pages)
  const all = [];
  let startRow = 0;
  const limit = 25000;
  while (true) {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: DATE,
        endDate: DATE,
        dimensions: ['query', 'page', 'date'],
        rowLimit: limit,
        startRow,
      },
    });
    const rows = res.data.rows || [];
    all.push(...rows);
    console.log(`fetched ${rows.length} rows (startRow=${startRow}, total=${all.length})`);
    if (rows.length < limit) break;
    startRow += limit;
  }

  console.log(`\n=== TOTAL: ${all.length} query×page rows for ${DATE} ===`);

  // Group by query (sum across pages) and by page (sum across queries)
  const byQuery = new Map();
  const byPage = new Map();
  for (const r of all) {
    const [q, p, d] = r.keys;
    const imp = r.impressions || 0, clk = r.clicks || 0;
    if (!byQuery.has(q)) byQuery.set(q, { impressions: 0, clicks: 0 });
    byQuery.get(q).impressions += imp;
    byQuery.get(q).clicks += clk;
    if (!byPage.has(p)) byPage.set(p, { impressions: 0, clicks: 0 });
    byPage.get(p).impressions += imp;
    byPage.get(p).clicks += clk;
  }

  const topQueries = [...byQuery.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 30);
  const topPages = [...byPage.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 30);

  console.log('\n=== TOP 30 QUERIES BY IMPRESSIONS ===');
  for (const [q, s] of topQueries) {
    const ctr = s.impressions > 0 ? (s.clicks / s.impressions * 100).toFixed(1) : '0';
    console.log(`  ${String(s.impressions).padStart(4)} imp  ${String(s.clicks).padStart(2)} cl  CTR=${ctr.padStart(4)}%  ${q.slice(0, 70)}`);
  }

  console.log('\n=== TOP 30 PAGES BY IMPRESSIONS ===');
  for (const [p, s] of topPages) {
    const ctr = s.impressions > 0 ? (s.clicks / s.impressions * 100).toFixed(1) : '0';
    console.log(`  ${String(s.impressions).padStart(4)} imp  ${String(s.clicks).padStart(2)} cl  CTR=${ctr.padStart(4)}%  ${p.replace(SITE_URL, '/').slice(0, 70)}`);
  }

  // Write raw + summary
  const outFile = path.join(OUT_DIR, `gsc-spike-investigation-${DATE}.jsonl`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outFile, all.map(r => JSON.stringify({
    date: r.keys[2],
    query: r.keys[0],
    page: r.keys[1],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  })).join('\n') + '\n');
  console.log(`\nWrote ${outFile} (${all.length} rows)`);
})().catch(e => {
  console.error('FATAL:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});