#!/usr/bin/env node
'use strict';

/**
 * Turns an immutable query-by-page aggregate snapshot into an editorial queue.
 * It never creates pages: query/page conflicts and canonical competitors are
 * explicitly review signals. The default 20-impression floor is intentionally
 * documented here so sparse GSC rows cannot become ranked "opportunities".
 */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');
const PRIVATE_DATA_ROOT = process.env.MDG_GSC_DATA_ROOT || path.join(process.env.HOME || '', '.hermes', 'data', 'mdg-gsc');
const SNAPSHOTS = path.join(PRIVATE_DATA_ROOT, 'gsc-search-analytics-snapshots', 'query-by-page.jsonl');
const MANIFEST = path.join(ROOT, 'docs', 'analytics', 'page_task_manifest.v1.jsonl');
const CANONICALS = path.join(ROOT, 'src', 'data', 'canonical-overrides.json');
const SITE = 'https://mainedispensaryguide.com';

function privateOutputPath(target) {
  const output = path.resolve(target);
  const root = path.resolve(PRIVATE_DATA_ROOT);
  if (output !== root && !output.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Raw-query reports must be written under the private GSC data root: ${root}`);
  }
  return output;
}
function readJsonl(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []; }
function latestSnapshot(file = SNAPSHOTS) { return readJsonl(file).at(-1) || null; }
function normalizePage(url) { try { const u = new URL(url); return u.pathname.replace(/\/$/, '') || '/'; } catch { return url; } }
function loadManifest(file = MANIFEST) { return new Map(readJsonl(file).map(row => [row.canonical_path, row])); }
function clusterFor(row, page) {
  if (row?.route_family === 'city_guide') return 'city guides';
  if (row?.route_family === 'operator_profile') return 'operator profiles';
  if (row?.route_family === 'hub') return 'hubs';
  if (row?.route_family === 'editorial_blog') return 'blogs';
  if (row?.route_family === 'calculator') return 'calculators';
  if (page.startsWith('/download/')) return 'downloads';
  // The manifest's current long_form_guide family needs a transparent split.
  return /(?:license|business|operator|tax|compliance|metrc|real-estate|roi)/.test(page) ? 'business guides' : 'consumer guides';
}
function canonicalTargets(file = CANONICALS) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(Object.entries(registry).filter(([key]) => key !== '_meta').map(([source, value]) => [`/${source}`, normalizePage(value.target)]));
}
function buildReport(snapshot, manifest, canonicals, minimumImpressions = 20) {
  const pages = new Map(); const queryPages = new Map();
  for (const row of snapshot.rows || []) {
    const [query, rawPage] = row.keys; const page = normalizePage(rawPage);
    const cluster = clusterFor(manifest.get(page), page);
    const current = pages.get(cluster) || { cluster, clicks: 0, impressions: 0, rows: 0 };
    current.clicks += row.clicks; current.impressions += row.impressions; current.rows++; pages.set(cluster, current);
    if (!queryPages.has(query)) queryPages.set(query, []);
    queryPages.get(query).push({ query, page, clicks: row.clicks, impressions: row.impressions, position: row.position, cluster });
  }
  const opportunities = []; const mismatches = []; const canonicalCompetitors = [];
  for (const [query, rows] of queryPages) {
    const total = rows.reduce((sum, row) => sum + row.impressions, 0);
    if (total < minimumImpressions) continue;
    const ordered = rows.toSorted((a, b) => b.impressions - a.impressions);
    const top = ordered[0];
    if (top.position > 4 && top.position <= 20) opportunities.push({ query, impressions: total, page: top.page, position: top.position, cluster: top.cluster });
    if (ordered.length > 1) mismatches.push({ query, impressions: total, pages: ordered });
    for (const row of ordered) {
      const target = canonicals.get(row.page);
      if (target && ordered.some(other => other.page === target)) canonicalCompetitors.push({ query, impressions: total, source: row.page, canonical: target });
    }
  }
  return { minimumImpressions, completeness: snapshot.completeness, sourceWindow: snapshot.sourceWindow, scope: { searchType: snapshot.searchType || 'web', filters: snapshot.filters || {} }, clusters: [...pages.values()].sort((a, b) => b.impressions - a.impressions), opportunities: opportunities.sort((a, b) => b.impressions - a.impressions), mismatches: mismatches.sort((a, b) => b.impressions - a.impressions), canonicalCompetitors };
}
function markdown(report) {
  const filters = Object.entries(report.scope.filters).filter(([, value]) => value).map(([name, value]) => `${name}=${value}`);
  const scope = `Scope: search type ${report.scope.searchType}; ${filters.length ? `filters ${filters.join(', ')}` : 'no dimension filters'}.`;
  const lines = ['# GSC Cluster Editorial Review', '', `Source window: ${report.sourceWindow.sourceStartDate} to ${report.sourceWindow.sourceEndDate}. Snapshot completeness: **${report.completeness.status}**.`, scope, '', `Opportunities are ranked only at **${report.minimumImpressions}+ impressions**; this is a review queue, not page-generation input.`, '', '## Clusters', '', '| Cluster | Impressions | Clicks | Rows |', '|---|---:|---:|---:|'];
  report.clusters.forEach(r => lines.push(`| ${r.cluster} | ${r.impressions} | ${r.clicks} | ${r.rows} |`));
  lines.push('', '## Ranked opportunities', '', '| Query | Cluster | Page | Impressions | Position |', '|---|---|---|---:|---:|');
  report.opportunities.forEach(r => lines.push(`| ${r.query} | ${r.cluster} | \`${r.page}\` | ${r.impressions} | ${r.position.toFixed(1)} |`));
  lines.push('', '## Query-to-page mismatches — editorial review required', '');
  report.mismatches.forEach(r => lines.push(`- **${r.query}** (${r.impressions} impressions): ${r.pages.map(p => `\`${p.page}\``).join(' vs ')}.`));
  lines.push('', '## Competing canonical pages — editorial review required', '');
  report.canonicalCompetitors.forEach(r => lines.push(`- **${r.query}**: \`${r.source}\` competes with its declared canonical \`${r.canonical}\` (${r.impressions} impressions).`));
  return `${lines.join('\n')}\n`;
}
function main() {
  const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v || true]; }));
  const snapshot = latestSnapshot(flags.input || SNAPSHOTS); if (!snapshot) throw new Error('No query-by-page aggregate snapshot found; run seo:gsc-search-analytics first.');
  const report = buildReport(snapshot, loadManifest(), canonicalTargets(), Number(flags['minimum-impressions'] || 20));
  const output = markdown(report); if (flags.output) fs.writeFileSync(privateOutputPath(flags.output), output); else process.stdout.write(output);
}
if (require.main === module) main();
module.exports = { buildReport, clusterFor, markdown, normalizePage, privateOutputPath, PRIVATE_DATA_ROOT, SNAPSHOTS };
