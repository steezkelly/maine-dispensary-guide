#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const APP = path.resolve(__dirname, '..', '..');
const DEFAULT_MANIFEST = path.join(APP, 'docs/content-maintenance/claims.v1.json');
const DEFAULT_GSC = path.join(APP, 'data/gsc-spike-investigation-2026-07-07.jsonl');
const DEFAULT_GA4 = path.join(APP, 'data/ga4-pull-2026-07-11/raw/pageviews.jsonl');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}
function canonicalPath(value) {
  if (!value) return null;
  try { return new URL(value).pathname.replace(/\/$/, '') || '/'; }
  catch { return value.replace(/\/$/, '') || '/'; }
}
function daysBetween(start, end) { return Math.floor((Date.parse(end) - Date.parse(start)) / 86400000); }
function dueStatus(claim, asOf) {
  const age = daysBetween(claim.mdg_verification_date, asOf);
  const remaining = claim.review_cadence_days - age;
  return { age, remaining, status: remaining < 0 ? 'expired' : remaining <= 14 ? 'due_soon' : 'current' };
}
function aggregateTraffic(gscRows, ga4Rows) {
  const map = new Map();
  const add = (page, key, value) => {
    const p = canonicalPath(page); if (!p) return;
    const row = map.get(p) || { gsc_clicks: 0, gsc_impressions: 0, ga4_pageviews: 0 };
    row[key] += Number(value || 0); map.set(p, row);
  };
  for (const row of gscRows) { add(row.page, 'gsc_clicks', row.clicks); add(row.page, 'gsc_impressions', row.impressions); }
  for (const row of ga4Rows) add(row.dimensions?.pagePath, 'ga4_pageviews', row.metrics?.screenPageViews);
  return map;
}
function buildReport({ manifest, gscRows, ga4Rows, asOf }) {
  const traffic = aggregateTraffic(gscRows, ga4Rows);
  return manifest.claims.map((claim) => {
    const due = dueStatus(claim, asOf);
    const metric = traffic.get(claim.canonical_path) || { gsc_clicks: 0, gsc_impressions: 0, ga4_pageviews: 0 };
    const exposure = metric.gsc_impressions + metric.gsc_clicks * 5 + metric.ga4_pageviews;
    const urgency = due.status === 'expired' ? 3 : due.status === 'due_soon' ? 2 : 0;
    return { ...claim, ...due, ...metric, exposure, priority_score: exposure * urgency };
  }).sort((a, b) => b.priority_score - a.priority_score || b.exposure - a.exposure || a.claim_id.localeCompare(b.claim_id));
}
function markdown(rows, asOf) {
  const actionRows = rows.filter((r) => r.status !== 'current');
  const lines = [
    '# Source-review priority report', '',
    `**As of:** ${asOf}`, '',
    'This report joins page-level GSC impressions/clicks and GA4 pageviews to evidence freshness. It creates **small source-review tasks before content expansion**: review the source and dependent pages first; do not expand copy until the task is closed.', '',
    '## Prioritized source-review tasks', '',
    '| Priority | Claim | Canonical page | Evidence status | Organic impressions | GA4 pageviews | Correction / propagation | Small task |',
    '| ---: | --- | --- | --- | ---: | ---: | --- | --- |'
  ];
  for (const r of actionRows) lines.push(`| ${r.priority_score} | \`${r.claim_id}\` | ${r.canonical_path} | ${r.status.replace('_', ' ')} (${r.remaining}d) | ${r.gsc_impressions} | ${r.ga4_pageviews} | ${r.correction_log_reference || '—'}; ${r.dependent_pages.length} dependent page(s), ${r.propagation_sla_days}d SLA | Revalidate \`${r.source_id}\`; correct source claim and propagate before expansion. |`);
  if (!actionRows.length) lines.push('| — | No expired or soon-due evidence | — | — | — | — | — | No source-review task created. |');
  lines.push('', '## Method and limits', '', '- GSC facts are aggregated by canonical page from the supplied page-dimension export. GA4 facts are aggregate pageviews; neither dataset identifies a person.', '- `mdg_source_select` is an optional trust/verification signal only. A click indicates that a visitor opened a marked source/reference link; it is **not** evidence that the claim is accurate, that the source was read, or that there is commercial intent.', '- Pages without page-dimension GSC data receive zero GSC exposure rather than an invented value. Reviewers must replace fixture/legacy extracts with current finalized exports before acting on a production priority.', '- Correction references and propagation SLAs are workflow controls. Record the actual dependent-page completion date in the correction entry or task evidence.', '', '## Full claim register', ''
  );
  for (const r of rows) lines.push(`- **${r.claim_id}** — ${r.canonical_path}; ${r.source_class}; source date ${r.source_publication_or_effective_date}; verified ${r.mdg_verification_date}; owner ${r.owner}; cadence ${r.review_cadence_days}d; status ${r.status}.`);
  return `${lines.join('\n')}\n`;
}
function main(argv) {
  const asOfArg = argv.find((arg) => arg.startsWith('--as-of='));
  const asOf = asOfArg ? asOfArg.slice(8) : new Date().toISOString().slice(0, 10);
  const outputArg = argv.find((arg) => arg.startsWith('--output='));
  const manifest = JSON.parse(fs.readFileSync(DEFAULT_MANIFEST, 'utf8'));
  const rows = buildReport({ manifest, gscRows: readJsonl(DEFAULT_GSC), ga4Rows: readJsonl(DEFAULT_GA4), asOf });
  const report = markdown(rows, asOf);
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice(9)), report);
  else process.stdout.write(report);
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { aggregateTraffic, buildReport, canonicalPath, dueStatus, markdown };
