#!/usr/bin/env node
/**
 * gsc-misroute-audit.cjs
 *
 * Audit the GSC search-analytics JSONL for routing problems:
 * - Multi-page queries: same query ranks on multiple MDG pages
 * - Misroutes: blog/home/learn ranks above a /guides/ page for the same query
 * - Cannibalization: two /guides/ pages competing for the same query
 * - Top pages: which MDG pages get the most impressions (proxy for topical authority)
 *
 * Output: human-readable Markdown report + a small JSON sidecar for diffing
 * over time.
 *
 * Usage:
 *   node scripts/seo/gsc-misroute-audit.cjs                    # full report to stdout
 *   node scripts/seo/gsc-misroute-audit.cjs --output=audit.md  # write to file
 *   node scripts/seo/gsc-misroute-audit.cjs --days=7           # only last 7d rows
 *
 * Why this exists:
 *   The v2 analytics dump gives us query+page attribution. By itself, that's
 *   a data file. To make it actionable for operators, we need a derived view
 *   that surfaces "wrong page is winning" cases — the things an operator
 *   should fix. This script is that view.
 *
 *   Run weekly after the daily cron has accumulated enough rows. Diff the
 *   output to track which misroutes are being resolved (or appearing).
 *
 *   Sprint 78d actions 4, 5 (FAQ schema, license page title reopt) should
 *   show up here as resolved misroutes 2-4 weeks after deploy. This script
 *   is the measurement loop for those fixes.
 *
 * Output schema (audit-report-<date>.md):
 *   # GSC Misroute Audit — 2026-07-13
 *   - Top 10 pages by total impressions
 *   - Top 10 multi-page queries (queries ranking on multiple MDG pages)
 *   - Top misroutes: blog/home/learn outranks a /guides/ page
 *   - Cross-guide cannibalization: two /guides/ pages competing
 *   - Top CTR losers: page-1 ranks with 0 clicks
 *
 * Optional sidecar (audit-data-<date>.json):
 *   Machine-readable version of the same data for trend diffing.
 */

const fs = require('node:fs');
const path = require('node:path');

const PRIVATE_DATA_ROOT = process.env.MDG_GSC_DATA_ROOT || path.join(process.env.HOME || '', '.hermes', 'data', 'mdg-gsc');
const JSONL_PATH = path.join(PRIVATE_DATA_ROOT, 'gsc-search-analytics.jsonl');

function privateOutputPath(target) {
  const output = path.resolve(target);
  const root = path.resolve(PRIVATE_DATA_ROOT);
  if (output !== root && !output.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Raw-query reports must be written under the private GSC data root: ${root}`);
  }
  return output;
}

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const days = parseInt(flags.days, 10) || 0; // 0 = all
const TOP_N = parseInt(flags.top, 10) || 10;
const OUT_PATH = flags.output || null;

function logErr(m) { console.error(`\x1b[31m${m}\x1b[0m`); }
function logOk(m) { console.log(`\x1b[32m${m}\x1b[0m`); }

function pageCategory(path) {
  const p = path.replace('https://mainedispensaryguide.com', '').replace(/\/$/, '');
  if (p === '') return 'home';
  if (p.startsWith('/blog/')) return 'blog';
  if (p.startsWith('/learn')) return 'learn';
  if (p.startsWith('/guides/')) return 'guide';
  if (p.startsWith('/about')) return 'about';
  if (p.startsWith('/site-health') || p.startsWith('/market-stats') || p.startsWith('/all-guides') || p.startsWith('/glossary')) return 'meta';
  if (p.startsWith('/resources/')) return 'resource';
  if (p.startsWith('/download/')) return 'download';
  return 'other';
}

function loadJsonl() {
  if (!fs.existsSync(JSONL_PATH)) {
    logErr(`No JSONL data at ${JSONL_PATH}. Run seo:gsc-search-analytics first.`);
    process.exit(1);
  }
  const records = [];
  for (const line of fs.readFileSync(JSONL_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const r = JSON.parse(trimmed);
      if ('page' in r) records.push(r); // v2 only
    } catch (_) {}
  }
  return records;
}

const SOURCE_TIMEZONE = 'America/Los_Angeles';

function laYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOURCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftYmd(date, calendarDays) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + calendarDays);
  return shifted.toISOString().slice(0, 10);
}

function isFinalizedDailyRecord(record) {
  return record.sourceTimezone === SOURCE_TIMEZONE
    && record.sourceDataState === 'final'
    && /^\d{4}-\d{2}-\d{2}$/.test(record.sourceStartDate || '')
    && record.sourceStartDate === record.sourceEndDate;
}

function filterByDays(records, days, now = new Date()) {
  const finalized = records.filter(isFinalizedDailyRecord);
  if (!days) return finalized;

  const today = laYmd(now);
  const cutoff = shiftYmd(today, -(days - 1));
  return finalized.filter(record => record.sourceEndDate >= cutoff && record.sourceEndDate <= today);
}

function dedupeDailyRecords(records) {
  const latest = new Map();
  for (const record of records.filter(isFinalizedDailyRecord)) {
    const key = `${record.sourceEndDate}|||${record.query}|||${record.page}`;
    const prior = latest.get(key);
    if (!prior || String(record.snapshotDate || '') >= String(prior.snapshotDate || '')) {
      latest.set(key, record);
    }
  }
  return Array.from(latest.values());
}

function aggregateDailyRecords(records) {
  const aggregates = new Map();
  for (const record of records) {
    const key = `${record.query}|||${record.page}`;
    if (!aggregates.has(key)) {
      aggregates.set(key, {
        query: record.query,
        page: record.page,
        clicks: 0,
        impressions: 0,
        positionWeight: 0,
        sourceDates: new Set(),
      });
    }
    const aggregate = aggregates.get(key);
    aggregate.clicks += record.clicks || 0;
    aggregate.impressions += record.impressions || 0;
    aggregate.positionWeight += (record.position || 0) * (record.impressions || 0);
    aggregate.sourceDates.add(record.sourceEndDate);
  }

  return Array.from(aggregates.values()).map(aggregate => ({
    query: aggregate.query,
    page: aggregate.page,
    clicks: aggregate.clicks,
    impressions: aggregate.impressions,
    ctr: aggregate.impressions ? aggregate.clicks / aggregate.impressions : 0,
    position: aggregate.impressions ? aggregate.positionWeight / aggregate.impressions : 0,
    sourceDates: Array.from(aggregate.sourceDates).sort(),
  }));
}

function aggregate(records) {
  // Top pages by total impressions
  const pageImp = new Map();
  for (const r of records) {
    pageImp.set(r.page, (pageImp.get(r.page) || 0) + r.impressions);
  }

  // Group by query
  const queryPages = new Map();
  for (const r of records) {
    if (!queryPages.has(r.query)) queryPages.set(r.query, []);
    queryPages.get(r.query).push(r);
  }

  // Multi-page queries
  const multi = [];
  for (const [q, pages] of queryPages) {
    if (pages.length < 2) continue;
    const sorted = pages.sort((a, b) => b.impressions - a.impressions);
    multi.push({ query: q, pages: sorted });
  }
  multi.sort((a, b) => {
    const aTotal = a.pages.reduce((s, p) => s + p.impressions, 0);
    const bTotal = b.pages.reduce((s, p) => s + p.impressions, 0);
    return bTotal - aTotal;
  });

  // Misroutes: blog/home/learn outranks a /guides/ page
  const misroutes = [];
  for (const m of multi) {
    const top = m.pages[0];
    const topCat = pageCategory(top.page);
    if (topCat !== 'blog' && topCat !== 'home' && topCat !== 'learn') continue;
    for (const p of m.pages.slice(1)) {
      if (pageCategory(p.page) === 'guide') {
        const totalImp = m.pages.reduce((s, x) => s + x.impressions, 0);
        misroutes.push({ query: m.query, top, guide: p, totalImp });
        break;
      }
    }
  }

  // CTR losers: page-1 ranks (pos < 11) with impressions >= 10 and 0 clicks
  const ctrLosers = [];
  for (const r of records) {
    if (r.position < 11 && r.impressions >= 10 && r.clicks === 0) {
      ctrLosers.push(r);
    }
  }
  ctrLosers.sort((a, b) => b.impressions - a.impressions);

  return {
    topPages: Array.from(pageImp.entries())
      .map(([page, imp]) => ({ page, imp }))
      .sort((a, b) => b.imp - a.imp)
      .slice(0, TOP_N),
    misroutes: misroutes.slice(0, TOP_N),
    ctrLosers: ctrLosers.slice(0, TOP_N),
    multiPageCount: multi.length,
    totalQueries: queryPages.size,
    totalImpressions: records.reduce((s, r) => s + r.impressions, 0),
    totalClicks: records.reduce((s, r) => s + r.clicks, 0),
    sourceDays: [...new Set(records.flatMap(record => record.sourceDates || []))].length,
  };
}

function renderMarkdown(stats) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# GSC Misroute Audit — ${date}`);
  lines.push('');
  lines.push(`*Window: ${days ? "last " + days + " day(s)" : "all-time"} of finalized one-day GSC facts. Source: gsc-search-analytics.jsonl (${stats.sourceDays} source day(s)); provenance-free rolling snapshots are excluded.*`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push(`- Total queries: **${stats.totalQueries}**`);
  lines.push(`- Total impressions: **${stats.totalImpressions}**`);
  lines.push(`- Total clicks: **${stats.totalClicks}**`);
  lines.push(`- CTR: **${(100 * stats.totalClicks / Math.max(1, stats.totalImpressions)).toFixed(2)}%**`);
  lines.push(`- Multi-page queries: **${stats.multiPageCount}**`);
  lines.push('');

  lines.push(`## Top ${TOP_N} Pages by Total Impressions`);
  lines.push('');
  lines.push('| Page | Total Impressions |');
  lines.push('|------|-------------------:|');
  for (const p of stats.topPages) {
    const short = p.page.replace('https://mainedispensaryguide.com', '').replace(/\/$/, '') || '/';
    lines.push(`| \`${short}\` | ${p.imp} |`);
  }
  lines.push('');

  if (stats.misroutes.length > 0) {
    lines.push(`## Misroutes: blog/home/learn outranks a /guides/ page`);
    lines.push('');
    lines.push('*Fix candidates: a blog post is ranking above the canonical guide page for a buyer-intent query. Either add internal links to the guide, sharpen the guide title, or consolidate the blog post into the guide.*');
    lines.push('');
    lines.push('| Query | Total Imp | Top (blog/home/learn) | Pos | Top Imp | Top Clicks | Guide | Guide Pos | Guide Imp |');
    lines.push('|-------|----------:|----------------------|----:|--------:|-----------:|-------|---------:|----------:|');
    for (const m of stats.misroutes) {
      const top = m.top;
      const g = m.guide;
      const topShort = top.page.replace('https://mainedispensaryguide.com', '').replace(/\/$/, '') || '/';
      const gShort = g.page.replace('https://mainedispensaryguide.com', '').replace(/\/$/, '') || '/';
      lines.push(`| \`${m.query}\` | ${m.totalImp} | \`${topShort}\` | ${top.position.toFixed(1)} | ${top.impressions} | ${top.clicks} | \`${gShort}\` | ${g.position.toFixed(1)} | ${g.impressions} |`);
    }
    lines.push('');
  } else {
    lines.push(`## Misroutes: NONE FOUND`);
    lines.push('');
    lines.push('All multi-page queries have the /guides/ page ranking highest. No action needed.');
    lines.push('');
  }

  if (stats.ctrLosers.length > 0) {
    lines.push(`## Top CTR Losers: page-1 ranks (pos < 11) with 10+ imp and 0 clicks`);
    lines.push('');
    lines.push('*Fix candidates: page-1 visibility but no clicks suggests a title/meta description that doesn\'t match searcher intent, or content that fails to satisfy the query.*');
    lines.push('');
    lines.push('| Query | Page | Impressions | Position |');
    lines.push('|-------|------|------------:|---------:|');
    for (const r of stats.ctrLosers) {
      const short = r.page.replace('https://mainedispensaryguide.com', '').replace(/\/$/, '') || '/';
      lines.push(`| \`${r.query}\` | \`${short}\` | ${r.impressions} | ${r.position.toFixed(1)} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by scripts/seo/gsc-misroute-audit.cjs at ${new Date().toISOString()}*`);
  return lines.join('\n');
}

async function main() {
  const loaded = loadJsonl();
  const records = filterByDays(loaded, days);
  const excluded = loaded.length - records.length;
  logOk(`Loaded ${loaded.length} v2 records; retained ${records.length} finalized one-day provenance records`);
  if (excluded) logOk(`Excluded ${excluded} legacy, rolling-window, or non-final records`);
  if (days) {
    logOk(`Filtered to ${records.length} records within the last ${days} Los Angeles source day(s)`);
  }
  if (records.length === 0) {
    logErr('No finalized one-day provenance records to analyze. Run seo:gsc-search-analytics-daily after the daily contract is deployed.');
    process.exit(1);
  }
  const deduped = dedupeDailyRecords(records);
  const aggregated = aggregateDailyRecords(deduped);
  const stats = aggregate(aggregated);
  const md = renderMarkdown(stats);

  if (OUT_PATH) {
    const out = privateOutputPath(OUT_PATH);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, md);
    logOk(`Wrote audit report to ${out}`);
  } else {
    console.log(md);
  }
}

if (require.main === module) {
  main().catch(e => {
    logErr(`\n✗ FATAL: ${e.message || e}`);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  });
}

module.exports = {
  aggregateDailyRecords,
  dedupeDailyRecords,
  filterByDays,
  isFinalizedDailyRecord,
  PRIVATE_DATA_ROOT,
  JSONL_PATH,
  privateOutputPath,
};
