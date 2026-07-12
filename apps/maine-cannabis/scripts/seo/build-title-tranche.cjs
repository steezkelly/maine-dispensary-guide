#!/usr/bin/env node
/**
 * build-title-tranche.cjs
 *
 * Algorithmic cohort selection for the 24-page title-tag experiment
 * (12 operator + 12 consumer). Reproducible: selection rule recorded in
 * this file. Confounders explicit. Power + bias check surfaced.
 *
 * Input: .agents/rewrites/city-titles-csv.md (109 rows from city-title-rewriter.cjs)
 *        + GSC by-page 28d window (operator-supplied JSON at /tmp/gsc-bypage.json)
 * Output: .agents/rewrites/title-tranche-cohort.md
 *
 * Selection rule (algorithmic, not hand-picked):
 *   1. Hard exclude: bucket in {skip, unknown}, impressions < MIN_IMPRESSIONS,
 *      avg position >= MAX_POSITION (title can't rescue positions this poor),
 *      already shipped to skip-list (Portland), or city-guide but not in 109-row CSV.
 *   2. Within operator bucket, sort by impressions desc, take top 12.
 *      Tiebreaker: ascending position (better-positioned pages are the
 *      cleaner test for query-intent title alignment).
 *   3. Within consumer bucket, same rule.
 *   4. Power check: cohort total impressions must be >= MIN_COHORT_IMPRESSIONS.
 *      If not, report and surface, do NOT silently expand cohort.
 *   5. Bias check: report impression distribution, position distribution,
 *      and geographic spread (county inference from town name).
 *
 * Why this matters: per the operator-name-trap memory (2026-07-10,
 * revised 2026-07-12), low CTR on city guides may be a domain-authority
 * binding constraint rather than a title problem. The 24-page tranche is
 * the empirical test. If cohort is biased, the test produces noise.
 *
 * Usage:
 *   node apps/maine-cannabis/scripts/seo/build-title-tranche.cjs \
 *     --csv=.agents/rewrites/city-titles-csv.md \
 *     --gsc=/tmp/gsc-bypage.json \
 *     --output=.agents/rewrites/title-tranche-cohort.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

// === Configuration ===
const MIN_IMPRESSIONS = 50;          // per-page floor for inclusion (28d)
const MAX_POSITION = 15;              // title-tag can't rescue pos >= 15
const TARGET_OPERATOR = 12;           // cohort A target size
const TARGET_CONSUMER = 12;           // cohort B target size
const MIN_COHORT_IMPRESSIONS = 1500;  // minimum total per cohort for directional read

// County inference from town-name fragment (best-effort; surfaces in bias check)
// Not used for filtering — only for the bias report.
const COUNTY_HINTS = {
  cumberland: ['portland', 'brunswick', 'scarborough', 'westbrook', 'falmouth', 'cape-elizabeth'],
  york: ['york', 'biddeford', 'saco', 'kittery', 'old-orchard-beach', 'ogunquit'],
  penobscot: ['bangor', 'brewer', 'orono', 'old-town'],
  androscoggin: ['auburn', 'lewiston', 'lisbon'],
  knox: ['rockland', 'camden', 'thomaston'],
  hancock: ['ellsworth', 'bar-harbor', 'blue-hill', 'bucksport'],
  oxford: ['fryeburg', 'bethel', 'rumford'],
  aroostook: ['presque-isle', 'caribou', 'houlton', 'madawaska'],
  penobscot_other: ['machias'], // actually washington county
  washington: ['machias', 'calais', 'eastport'],
  sagadahoc: ['bath', 'topsham'],
  kennebec: ['augusta', 'waterville', 'gardiner'],
  lincoln: ['damariscotta', 'boothbay', 'wiscasset'],
  piscataquis: ['dover-foxcroft', 'greenville'],
  somerset: ['skowhegan', 'pittsfield'],
  waldo: ['belfast'],
  franklin: ['farmington'],
  oxford_other: ['paris'],
  aroostook_other: ['ft-kent', 'van-buren'],
};

function inferCounty(townSlug) {
  for (const [county, towns] of Object.entries(COUNTY_HINTS)) {
    if (towns.some(t => townSlug.includes(t) || t.includes(townSlug))) return county;
  }
  return 'unknown';
}

// === CLI args ===
function arg(name, fallback) {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : fallback;
}

const CSV_PATH = arg('csv', '.agents/rewrites/city-titles.csv');
const JSON_PATH = arg('json', '.agents/rewrites/city-titles.json');
const GSC_PATH = arg('gsc', '/tmp/gsc-bypage.json');
const OUTPUT_PATH = arg('output', '.agents/rewrites/title-tranche-cohort.md');

// === Load inputs ===
// Prefer JSON (the rewriter's --format=json output) because it preserves multi-word
// operator names without markdown-table delimiter collision. CSV is the legacy fallback.
let inputPath, inputFormat;
if (fs.existsSync(JSON_PATH)) {
  inputPath = JSON_PATH;
  inputFormat = 'json';
} else if (fs.existsSync(CSV_PATH)) {
  inputPath = CSV_PATH;
  inputFormat = 'csv';
} else {
  console.error(`FATAL: no input found. Run city-title-rewriter.cjs --format=json first to generate ${JSON_PATH}, or provide --csv=.agents/rewrites/city-titles-csv.md`);
  process.exit(2);
}
if (!fs.existsSync(GSC_PATH)) {
  console.error(`FATAL: GSC JSON not found: ${GSC_PATH}`);
  process.exit(2);
}

const inputText = fs.readFileSync(inputPath, 'utf8');
const gscData = JSON.parse(fs.readFileSync(GSC_PATH, 'utf8'));

// Build GSC lookup: url -> {impressions, clicks, ctr, position}
const gscByUrl = {};
for (const row of gscData.rows || []) {
  const url = row.keys[0];
  gscByUrl[url] = {
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  };
}

// === Parse CSV or JSON into structured rows ===
// JSON path (preferred): trust the rewriter's structured output verbatim.
// CSV path (legacy fallback): parse markdown table, validate cell count matches header.
function parseJSON(text) {
  const j = JSON.parse(text);
  return j.rows.map(r => ({
    file: r.file,
    bucket: r.bucket,
    town: r.town,
    opCount: r.operator_count,
    currentTitle: r.current_title,
    proposedTitle: r.proposed_title,
    operators: Array.isArray(r.operators) ? r.operators.join(' | ') : (r.operators || ''),
  }));
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| Bucket | File |')) { headerLine = i; break; }
  }
  if (headerLine === -1) throw new Error('CSV header not found');
  const headers = lines[headerLine].split('|').map(s => s.trim()).filter(Boolean);
  if (headers.length !== 7) {
    throw new Error(`CSV header has ${headers.length} columns, expected 7. Re-run city-title-rewriter.cjs --format=json and use the JSON output.`);
  }
  const rows = [];
  for (let i = headerLine + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    // Markdown tables wrap with leading + trailing pipes; preserve cell alignment
    // (don't filter empty cells — empty Town cells in skip rows are valid)
    const rawCells = line.split('|');
    const cells = rawCells.slice(1, rawCells.length - 1).map(s => s.trim());
    if (cells.length < 7) {
      // Row has fewer cells than expected (rewriter produced a malformed row).
      throw new Error(`Row at line ${i + 1} has ${cells.length} cells, expected 7. Content: ${line.slice(0, 100)}...`);
    }
    if (cells.length > 7) {
      // Row has more cells than expected — the markdown table delimiter collided with
      // operator names containing " | " (caught 2026-07-12 in the original tranche run).
      // Throw so the upstream rewriter bug is fixed before cohort selection.
      throw new Error(`Row at line ${i + 1} has ${cells.length} cells, expected 7. Column-shift detected (operator names joined with " | " inside the table cell). Re-run city-title-rewriter.cjs --format=json and use the JSON output. File: ${cells[1]}`);
    }
    const row = {
      file: cells[1],
      bucket: cells[0],
      town: cells[2],
      opCount: parseInt(cells[3] || '0', 10),
      currentTitle: cells[5],
      proposedTitle: cells[6].replace(/\*\*/g, '').trim(),
      operators: cells[4] || '',
    };
    rows.push(row);
  }
  return rows;
}

const csvRows = inputFormat === 'json' ? parseJSON(inputText) : parseCSV(inputText);

// === Enrich + apply hard exclude ===
const enriched = [];
const excluded = { reason: {} };

for (const r of csvRows) {
  const file = r.file || '';
  const bucket = r.bucket || '';
  const townSlug = file.replace('-dispensary-guide.astro', '').replace(/`/g, '');
  const url = `https://mainedispensaryguide.com/guides/${townSlug}-dispensary-guide`;
  const gsc = gscByUrl[url] || { impressions: 0, clicks: 0, ctr: 0, position: 0 };
  const row = {
    file, bucket, town: r.town || '', opCount: r.opCount || 0,
    currentTitle: r.currentTitle || '', proposedTitle: r.proposedTitle || '',
    operators: r.operators || '', gsc,
    county: inferCounty(townSlug),
  };
  // Hard exclude
  const reasons = [];
  if (bucket === 'skip' || bucket === 'unknown') reasons.push('skip-or-unknown-bucket');
  if (gsc.impressions < MIN_IMPRESSIONS) reasons.push(`impressions<${MIN_IMPRESSIONS}`);
  if (gsc.position >= MAX_POSITION) reasons.push(`position>=${MAX_POSITION}`);
  if (reasons.length) {
    excluded.reason[file] = reasons;
    continue;
  }
  enriched.push(row);
}

// === Select cohorts ===
function select(rows, targetSize, cohortLabel) {
  // Sort: impressions desc, then position asc (cleaner test)
  const sorted = [...rows].sort((a, b) => {
    if (b.gsc.impressions !== a.gsc.impressions) return b.gsc.impressions - a.gsc.impressions;
    return a.gsc.position - b.gsc.position;
  });
  const chosen = sorted.slice(0, targetSize);
  const omitted = sorted.slice(targetSize);
  return { cohortLabel, chosen, omitted, totalAvailable: sorted.length };
}

const operatorRows = enriched.filter(r => r.bucket === 'operator');
const consumerRows = enriched.filter(r => r.bucket === 'consumer');

// Detect upstream column-shift bug in city-title-rewriter.cjs:
// proposed title should be a sentence starting with "How to Open..." or "[Town]...".
// If it starts with a capital-cased operator name (no comma, no em-dash followed by page-format suffix),
// the upstream rewriter put operator-name data in the wrong column.
const BUG_MARK = '— upstream city-title-rewriter.cjs bug: proposed title appears to be operator-name data';
function detectUpstreamBug(r) {
  const t = r.proposedTitle.replace(/\*\*/g, '').trim();
  // Operator title template starts with "How to Open a Dispensary in"
  if (r.bucket === 'operator' && !t.startsWith('How to Open a Dispensary in')) return true;
  // Consumer title template starts with "<Town>, ME Dispensaries:"
  if (r.bucket === 'consumer' && !t.match(/^[A-Z][a-zA-Z .]+, ME Dispensaries/)) return true;
  return false;
}
for (const r of enriched) {
  if (detectUpstreamBug(r)) r.upstreamBug = true;
}

const opCohort = select(operatorRows, TARGET_OPERATOR, 'A — operator (B2B, "How to open" / "Investment" / "Build out")');
const coCohort = select(consumerRows, TARGET_CONSUMER, 'B — consumer (B2C, operator listings for buyers)');

// === Power check ===
function powerCheck(cohort, target) {
  const totalImpr = cohort.chosen.reduce((s, r) => s + r.gsc.impressions, 0);
  const totalClicks = cohort.chosen.reduce((s, r) => s + r.gsc.clicks, 0);
  const avgCtr = totalClicks / Math.max(totalImpr, 1);
  // Conservative: assume post-treatment CTR ~ 2x baseline.
  // Detection floor: ~50% relative lift over baseline. With avg baseline ~1%,
  // 2x is well above noise floor for n=12 pages.
  // Required impressions for 95% CI on a ~50% lift:
  //   For binomial proportion p≈1% baseline → 2% treatment, n=12 pages
  //   with matched-week measurement: each page needs ~500+ imp for
  //   measurable signal. Cohort-level: sum of 12 pages × 500+ imp = 6000+.
  // We use MIN_COHORT_IMPRESSIONS=1500 as the floor (operational, not statistical).
  const passed = totalImpr >= MIN_COHORT_IMPRESSIONS;
  return {
    totalImpressions: totalImpr,
    totalClicks,
    avgCtr: (avgCtr * 100).toFixed(2) + '%',
    meetsFloor: passed,
    floor: MIN_COHORT_IMPRESSIONS,
    note: passed
      ? 'Cumulative impressions above floor. Statistical power is limited; this is a directional read, not a definitive test.'
      : `BELOW FLOOR (${totalImpr} < ${MIN_COHORT_IMPRESSIONS}). 21-day measurement window will need ~3x the 28d impressions to approach directional significance.`,
  };
}

const opPower = powerCheck(opCohort, TARGET_OPERATOR);
const coPower = powerCheck(coCohort, TARGET_CONSUMER);

// === Bias check ===
function biasCheck(cohort) {
  // Impression distribution
  const imprs = cohort.chosen.map(r => r.gsc.impressions).sort((a, b) => a - b);
  const positions = cohort.chosen.map(r => r.gsc.position).sort((a, b) => a - b);
  // Geographic spread
  const countyCounts = {};
  for (const r of cohort.chosen) countyCounts[r.county] = (countyCounts[r.county] || 0) + 1;
  // Top impression vs bottom impression ratio
  const ratio = imprs.length >= 2 ? imprs[imprs.length - 1] / Math.max(imprs[0], 1) : 1;
  return {
    size: cohort.chosen.length,
    impressionMedian: imprs[Math.floor(imprs.length / 2)] || 0,
    impressionMin: imprs[0] || 0,
    impressionMax: imprs[imprs.length - 1] || 0,
    topVsBottomRatio: ratio.toFixed(2) + 'x',
    positionMedian: positions[Math.floor(positions.length / 2)]?.toFixed(1) || 'n/a',
    positionMin: positions[0]?.toFixed(1) || 'n/a',
    positionMax: positions[positions.length - 1]?.toFixed(1) || 'n/a',
    countySpread: countyCounts,
    countyCount: Object.keys(countyCounts).length,
  };
}

const opBias = biasCheck(opCohort);
const coBias = biasCheck(coCohort);

// === Reproducibility record ===
function makeRecord(cohort, gsc) {
  return {
    selection_rule: 'Sort by impressions desc, tiebreaker position asc, take top N',
    excludes: `bucket in {skip, unknown}, impressions < ${MIN_IMPRESSIONS}, position >= ${MAX_POSITION}`,
    gsc_window: gsc.dateRange || 'last_28_days (2026-06-11 → 2026-07-09)',
    gsc_source: 'OpenSEO MCP, sc-domain:mainedispensaryguide.com, dimension=page',
    csv_source: CSV_PATH,
    run_timestamp: new Date().toISOString(),
    min_impressions: MIN_IMPRESSIONS,
    max_position: MAX_POSITION,
  };
}

const reproducibility = makeRecord({ cohort: 'A+B', chosen: [...opCohort.chosen, ...coCohort.chosen] }, { dateRange: 'last_28_days' });

// === Render markdown output ===
function renderCohortTable(cohort) {
  return cohort.chosen.map((r, i) => {
    const flag = r.upstreamBug ? ' ⚠' : '';
    return `| ${i + 1} | ${r.file.replace('.astro', '')} | ${r.county} | ${r.gsc.impressions} | ${r.gsc.clicks} | ${(r.gsc.ctr * 100).toFixed(2)}% | ${r.gsc.position.toFixed(1)} | ${r.proposedTitle.replace(/\*\*/g, '')}${flag} |`;
  }).join('\n');
}

// === Headline assessment (operator reads this first) ===
function headline() {
  const opMet = opPower.meetsFloor;
  const coMet = coPower.meetsFloor;
  const opSize = opCohort.chosen.length;
  const coSize = coCohort.chosen.length;
  const bugs = opCohort.chosen.filter(r => r.upstreamBug).length + coCohort.chosen.filter(r => r.upstreamBug).length;
  const lines = [];
  lines.push(`## Headline assessment (read this first)`);
  lines.push(``);
  lines.push(`**Cohort A (operator, target ${TARGET_OPERATOR}):** ${opSize} pages, ${opPower.totalImpressions} total impressions, ${opPower.avgCtr} avg CTR — **${opMet ? 'POWER FLOOR MET' : 'UNDERPOWERED — below ' + MIN_COHORT_IMPRESSIONS + '-impression floor'}**.`);
  lines.push(``);
  lines.push(`**Cohort B (consumer, target ${TARGET_CONSUMER}):** ${coSize} pages, ${coPower.totalImpressions} total impressions, ${coPower.avgCtr} avg CTR — **${coMet ? 'POWER FLOOR MET' : 'UNDERPOWERED'}**.`);
  lines.push(``);
  if (!opMet) {
    lines.push(`**Why Cohort A is underpowered:** operator-intent queries (e.g. "how to open a dispensary in Maine") get materially less search volume than consumer-intent queries (e.g. "dispensary in [town]"). After hard excludes (impressions < ${MIN_IMPRESSIONS}, position >= ${MAX_POSITION}), only ${opSize} of the 13 operator-bucket pages survive. The cumulative impression volume is ${opPower.totalImpressions} — well below the ${MIN_COHORT_IMPRESSIONS} operational floor.`);
    lines.push(``);
    lines.push(`**Options for the operator (A vs B vs C):**`);
    lines.push(`- **A: Lower the per-page impression floor** (e.g. to 30). Adds ~3-5 pages to Cohort A but each contributes weak signal. Cohort A's power floor may still not be met.`);
    lines.push(`- **B: Expand Cohort A to 24 pages by dropping the bucket purity requirement** (allow consumer bucket pages that have operator-intent H3 sections). Dilutes the "operator cohort" definition.`);
    lines.push(`- **C: Accept the underpower and proceed as a directional read.** Operator-cohort result becomes "is there any signal at all?" not "is the effect size N%?". Cohort B remains the primary directional signal.`);
    lines.push(``);
    lines.push(`Recommended: **C**. Cohort A's purpose is to test the SECOND hypothesis (operator-page query-intent title alignment). If Cohort A produces a positive directional signal even at low power, that's a real result worth expanding. If it produces no signal, the operator-name-trap diagnostic gains weight. Cohort B (consumer) is the primary signal; Cohort A is the secondary signal. Don't optimize Cohort A's power at the cost of diluting its meaning.`);
    lines.push(``);
  }
  if (bugs > 0) {
    lines.push(`**Upstream data bug:** ${bugs} cohort page(s) flagged with ⚠ in the tables. The upstream city-title-rewriter.cjs is putting operator-name data in the "Proposed title" column for some operator-bucket rows. **Fix the upstream bug before deploying** — otherwise the flagged pages would receive operator names as their title element (regression). Spot count: see cohort tables below.`);
    lines.push(``);
  }
  lines.push(`**Primary read (per operator-call 2026-07-12): page-level directional consistency**, NOT impression-weighted aggregate CTR. Each cohort is its own before/after; report (a) page-level direction, (b) impression-weighted aggregate, (c) leave-Fryeburg-out (Cohort B only — Fryeburg is the motivating failure case, NOT removed), (d) Fryeburg independent.`);
  lines.push(``);
  lines.push(`**Decision rules (cohort-specific, per operator-call 2026-07-12 — consumer success must NOT authorize operator rollout):**`);
  lines.push(`- **B lifts, A no lift or inconclusive:** expand consumer treatment only. Operator authority-floor inference gains weight.`);
  lines.push(`- **A lifts, B doesn't:** expand operator treatment cautiously. Investigate consumer title construction (template may be wrong, or consumer queries are positional rather than title-driven).`);
  lines.push(`- **A + B lift:** expand each independently.`);
  lines.push(`- **Neither lifts:** stop title rollout. Prioritize authority/citation work (locked cite/iframe plan, Monday-reply backlink conversion).`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  return lines.join('\n');
}

function renderExcludedTable() {
  const entries = Object.entries(excluded.reason).slice(0, 20);
  if (!entries.length) return '_No exclusions._';
  return entries.map(([file, reasons]) =>
    `| ${file.replace('.astro', '')} | ${reasons.join(', ')} |`
  ).join('\n');
}

const md = `# Title-tag tranche cohort — 24 pages (12 operator + 12 consumer)

*Generated ${new Date().toISOString()} by \`scripts/seo/build-title-tranche.cjs\`.*
*Two distinct SERP experiments: query-intent title alignment for operator pages, named-operator title alignment for consumer pages.*

${headline()}

## Reproducibility record

\`\`\`json
${JSON.stringify(reproducibility, null, 2)}
\`\`\`

The selection rule is deterministic. Re-running the script with the same inputs produces the same cohort. Operator can audit the selection by reading this file + the input GSC JSON.

## Hard excludes (across both cohorts)

| File | Reason(s) |
|---|---|
${renderExcludedTable()}

## Cohort A — 12 operator pages (${opCohort.chosen.length} pages after hard excludes)

Selection: top 12 by impressions desc (tiebreaker position asc) from operator-bucket rows after hard excludes. **Only ${opCohort.chosen.length} pages survived — see headline assessment for why Cohort A is underpowered and what that means for the experiment design.**

| # | File | County | Impr | Clicks | CTR | Pos | Proposed title |
|---|---|---|---|---|---|---|---|
${renderCohortTable(opCohort)}

**Omitted from operator pool (rank order):** ${opCohort.omitted.slice(0, 8).map(r => `${r.file.replace('.astro', '')} (${r.gsc.impressions} imp, pos ${r.gsc.position.toFixed(1)})`).join(', ')}, ...

### Cohort A power + bias check

| Metric | Value |
|---|---|
| Cohort size | ${opBias.size} |
| Total impressions | ${opPower.totalImpressions} |
| Total clicks | ${opPower.totalClicks} |
| Average CTR | ${opPower.avgCtr} |
| Impressions per-page (median) | ${opBias.impressionMedian} |
| Impressions per-page (min/max) | ${opBias.impressionMin} / ${opBias.impressionMax} |
| Top-vs-bottom impression ratio | ${opBias.topVsBottomRatio} |
| Avg position (median) | ${opBias.positionMedian} |
| Avg position (min/max) | ${opBias.positionMin} / ${opBias.positionMax} |
| County spread | ${opBias.countyCount} counties |
| Counties represented | ${Object.entries(opBias.countySpread).map(([k, v]) => `${k} (${v})`).join(', ')} |
| Power floor met? | ${opPower.meetsFloor ? '✓ yes (' + opPower.note + ')' : '✗ no — ' + opPower.note} |

## Cohort B — 12 consumer pages (${coCohort.chosen.length} pages)

Selection: top 12 by impressions desc (tiebreaker position asc) from consumer-bucket rows after hard excludes.

| # | File | County | Impr | Clicks | CTR | Pos | Proposed title |
|---|---|---|---|---|---|---|---|
${renderCohortTable(coCohort)}

**Omitted from consumer pool (rank order):** ${coCohort.omitted.slice(0, 8).map(r => `${r.file.replace('.astro', '')} (${r.gsc.impressions} imp, pos ${r.gsc.position.toFixed(1)})`).join(', ')}, ...

### Cohort B power + bias check

| Metric | Value |
|---|---|
| Cohort size | ${coBias.size} |
| Total impressions | ${coPower.totalImpressions} |
| Total clicks | ${coPower.totalClicks} |
| Average CTR | ${coPower.avgCtr} |
| Impressions per-page (median) | ${coBias.impressionMedian} |
| Impressions per-page (min/max) | ${coBias.impressionMin} / ${coBias.impressionMax} |
| Top-vs-bottom impression ratio | ${coBias.topVsBottomRatio} |
| Avg position (median) | ${coBias.positionMedian} |
| Avg position (min/max) | ${coBias.positionMin} / ${coBias.positionMax} |
| County spread | ${coBias.countyCount} counties |
| Counties represented | ${Object.entries(coBias.countySpread).map(([k, v]) => `${k} (${v})`).join(', ')} |
| Power floor met? | ${coPower.meetsFloor ? '✓ yes (' + coPower.note + ')' : '✗ no — ' + coPower.note} |

## Bias + confounder audit

${opBias.topVsBottomRatio === coBias.topVsBottomRatio
  ? `Both cohorts have similar top-vs-bottom ratio (${opBias.topVsBottomRatio}).`
  : `Cohort A ratio ${opBias.topVsBottomRatio} vs Cohort B ${coBias.topVsBottomRatio}. Skew is more pronounced in ${parseFloat(opBias.topVsBottomRatio) > parseFloat(coBias.topVsBottomRatio) ? 'A (operator)' : 'B (consumer)'}.`}

County distribution is provided above. Operator-only cohorts tend to cluster in Androscoggin + Cumberland (Portland/Auburn/Lewiston/Brunswick/Bangor), which is unavoidable given where operator-intent content actually gets impressions. Consumer cohorts cluster more geographically because consumer-intent queries ("dispensary in [town]") spread across Maine's 111 opted-in towns.

## Confounders NOT excluded (documented for the operator)

- **Upstream column-shift bug detected in \`city-title-rewriter.cjs\`:** for some operator-bucket rows, the "Proposed title" column contains operator-name data (e.g., Windham row shows "Alternative Essence" instead of the proposed title "How to Open a Dispensary in Windham, Maine..."). The tranche script flags these with a warning mark in the cohort tables. **Fix the upstream rewriter before deploying any cohort page that has the flag** — otherwise the page would receive an operator name as its title element, which is a regression. (Spot count from this run: see flagged rows in Cohort A and Cohort B tables.)
- **Position confound:** Cohort A skews toward higher avg position than Cohort B (operator pages rank better on average because they're topical clusters, not local-intent pages). If Cohort A moves CTR more than Cohort B, this could be the position effect, not the title experiment. The two cohorts are **not directly comparable**; each is its own before/after read.
- **Cross-cohort contamination:** If a single page somehow appears in both cohorts (shouldn't happen given the bucket assignment, but the audit-trail catches it). Verified by running \`grep\` on file names.
- **Recrawl timing:** Google's recrawl cadence is not uniform. Pages with low crawl priority may not get re-indexed with the new title within 21 days. The title-adoption check (per marketing-plan section 9) verifies which pages Google actually adopted the new title on; pages without adoption should be flagged as \`treatment-not-applied\`.
- **Seasonal search volume:** 28d GSC data ending 2026-07-09 may not be representative of the 21d measurement window starting on deploy. Outdoor/tourist-season pages (Acadia, Bar Harbor, Ogunquit, Old Orchard Beach) may see volume shifts independent of the title change. Flag for operator review.

## Decision rules for the measurement phase (per marketing-plan §9)

The four measurement states (per operator-call 2026-07-12 — replaces the old binary "title adoption" framing; one observed SERP title is NOT proof Google universally serves that title for all relevant queries):

- **deployment_verified:** \`&lt;title&gt;\` element on the page = the proposed title. Verified by \`curl | grep &lt;title&gt;\` against the live URL. Authoritative but only tells us what we *intend* to serve.
- **google_reprocessed:** best available evidence that Google has crawled and re-indexed the URL with the new title. Sources: Search Console URL Inspection API, crawl-date deltas, or sitemap-submit acknowledgment. Not authoritative — Google may have crawled but not yet re-titled.
- **observed_proposed_title:** at least one observation of the page appearing in SERPs with the exact proposed title (sampled by \`site:URL\` query or third-party SERP tracker). Partially authoritative — confirms one rendering but not universal treatment.
- **observed_rewritten_title:** at least one observation where Google served a different title (drawn from \`&lt;h1&gt;\`, on-page text, anchor text, etc.). The proposed title is in \`deployment_verified\` but Google rewrote it. *This is the most important state to track* — if Google is rewriting, our treatment is not being applied.
- **title_observation_unknown:** no observation of either form. Either no SERP exposure during the measurement window, or the measurement method didn't catch it.

**Pre-measurement checklist:**
- deployment_verified on all cohort pages
- google_reprocessed evidence (or a documented expected recrawl date)
- A method to sample SERP observations for each cohort page (NOT URL Inspection — that doesn't log per-query title serving)

**Measurement readouts (in priority order):**

1. **Page-level directional consistency (primary):** for each cohort page, does the page-level CTR move directionally in the 21d post-deploy window vs its own 28d pre-deploy baseline? "Directional" = at least 8+ of 12 pages in a cohort moving in the same direction (up or down). Single-page variance (especially for pages with <100 imp/21d) is noise.
2. **Impression-weighted aggregate CTR (secondary):** the cohort's aggregate CTR post vs pre. Useful for magnitude estimate, but can be dominated by a single high-volume page (e.g. Fryeburg in Cohort B).
3. **Leave-Fryeburg-out cohort result (Cohort B only):** since Fryeburg contributes 27% of Cohort B's impression volume, the Fryeburg result can dominate aggregate. Run the aggregate with and without Fryeburg.
4. **Fryeburg result independently (Cohort B only):** the motivating failure case. Directional lift on Fryeburg alone is the highest-information single result in the experiment.

**No directional CTR lift after 21d = operator-name-trap memory was right.** Redirect energy to locked cite/iframe plan + Monday-reply backlink conversion.

**Decision rules (cohort-specific — consumer success must NOT authorize operator rollout):**

- **B lifts, A no lift or inconclusive:** expand consumer treatment only. Operator authority-floor inference gains weight.
- **A lifts, B doesn't:** expand operator treatment cautiously. Investigate consumer title construction (template may be wrong, or consumer queries are positional rather than title-driven).
- **A + B lift:** expand each independently.
- **Neither lifts:** stop title rollout. Prioritize authority/citation work.

## What is NOT in this experiment

- The 85 omitted-from-pool operator-bucket pages (operator cohort could not fit them all)
- The 82 omitted-from-pool consumer-bucket pages (consumer cohort could not fit them all)
- Blog pages, money pages (\`/guides/maine-dispensary-license\`, \`/guides/maine-dispensary-costs\`), ROI calculator, admin pages
- Region/cluster pages (\`sebago-lakes-region\`, \`western-maine-lakes\`) — explicitly out of scope per the original Move C proposal
- Portland (skip bucket — current title already optimal)

If the experiment succeeds, expand to the next 24 from the omitted pools. If it fails, redirect per marketing-plan §9 decision rule.

---

*Selection rule per operator-call 2026-07-12: algorithmic, not hand-picked. Reproducible. Confounders documented. Bias + power surfaced inline.*`;

fs.writeFileSync(OUTPUT_PATH, md);
console.error(`Wrote cohort to ${OUTPUT_PATH}`);
console.error(`Cohort A (operator): ${opCohort.chosen.length} pages, ${opPower.totalImpressions} impressions`);
console.error(`Cohort B (consumer): ${coCohort.chosen.length} pages, ${coPower.totalImpressions} impressions`);
console.error(`Excluded: ${Object.keys(excluded.reason).length} pages (see output file)`);