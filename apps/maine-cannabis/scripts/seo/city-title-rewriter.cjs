#!/usr/bin/env node
/**
 * city-title-rewriter.cjs
 *
 * Generate a reviewable CSV proposing title + meta-description rewrites
 * for the 109 city guides under /guides/*-dispensary-guide.astro
 * (excludes 2 region/cluster pages: sebago-lakes-region, western-maine-lakes).
 *
 * Why this exists:
 *   The 111 city guides share a generic title template
 *     "<Town> Maine Dispensary Guide — <N> Cannabis Dispensaries (2026)"
 *   that doesn't mirror the operator-specific queries that drive GSC
 *   impressions. Result: 0-2.8% CTR on the highest-impression pages
 *   despite position 6-9 rankings.
 *
 *   The 109 city guides are NOT one shape — they're three audience
 *   buckets (consumer / hybrid / operator) plus a small "needs manual
 *   review" group. This script classifies each page by subtitle signal
 *   + H3 operator count, then applies the right template per bucket.
 *
 *   The script does NOT touch any .astro file. Output is a CSV/markdown
 *   for operator review. Patching happens after operator sign-off.
 *
 * Usage:
 *   node scripts/seo/city-title-rewriter.cjs                          # markdown table to stdout
 *   node scripts/seo/city-title-rewriter.cjs --output=rewrites.md     # write to file
 *   node scripts/seo/city-title-rewriter.cjs --format=csv             # CSV format
 *   node scripts/seo/city-title-rewriter.cjs --bucket=operator        # filter to one bucket
 *
 * Sprint 79 follow-on: see .agents/rewrites/city-guide-titles-proposal.md
 * for the diagnosis and the original Move C audit.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', '..', 'src', 'pages', 'guides');
const EXCLUDE_RE = /(region|cluster|greater|western|eastern|counties|county|corridor|mountains|area|shoreline|midcoast|aroostook|mid-maine)/;

// Audience classification signals — match against lowercase H1 + subtitle text.
// IMPORTANT: signals must use word boundaries; otherwise "operators serving [town]"
// gets misclassified as operator when it's actually consumer content.
const CONSUMER_SIGNALS = [
  'where to buy', 'licensed dispensar', 'cannabis dispensaries in',
  'dispensaries in', 'storefront', 'medical cannabis dispensar',
  'adult-use retail is not currently', 'adult-use retail pending',
  'cannabis access for', 'nearest options', 'cannabis options near',
  'medical cannabis in', 'cannabis market', 'the meristem',
  'operators serving',  // consumer-language phrasing
];
const OPERATOR_SIGNALS = [
  'how to open', 'opening a dispensary', 'startup cost', 'business plan',
  'build out', 'buildout', 'investment requirement', 'zoning requirement',
  'site selection', 'real estate', 'commercial rent',
];

function classify(h1, subtitle, operatorH3Count) {
  const text = `${h1} ${subtitle}`.toLowerCase();
  let consumerScore = 0;
  let operatorScore = 0;
  for (const s of CONSUMER_SIGNALS) if (text.includes(s)) consumerScore++;
  for (const s of OPERATOR_SIGNALS) if (text.includes(s)) operatorScore++;

  // Operator pages have an explicit "how to open" / "investment" / "build out" signal in the
  // H1+subtitle. Without that signal, even pages with 4 operator H3s should be classified as
  // consumer (they list operators for buyers, not for prospective operators).
  if (operatorScore > 0) return 'operator';
  if (consumerScore > 0) return 'consumer';
  // Fallback by H3 count only
  if (operatorH3Count >= 2) return 'consumer';  // has real operators listed for buyers
  if (operatorH3Count === 1) return 'consumer';
  return 'unknown';
}

function extractOperatorNames(body, currentTitle, maxN) {
  // Match H3 contents that look like operator names (not FAQ/Related/External/section headers).
  // Real operators tend to have one of these forms:
  //   "White Mountain Craft Cannabis"
  //   "The Glass Cook (Medical + Glassblowing)"  → strip parenthetical type
  //   "Purple Haze — Medical"  → strip trailing type qualifier
  //   "Cannabis Cured"  → bare name
  // Section headers / page-chapter H3s to skip include phrases like
  // "Route 114 Corridor", "Delivery Hub", "Roosevelt Trail", "Nearby Windham Options",
  // "Regulatory Requirements", "Why X Is on the Map", "Local Regulations", "Midcoast Regional Draw", etc.
  const skipPatterns = /^(frequently asked|see also|related|external|read more|last reviewed|continue reading)/i;
  // Phrases that indicate a section/chapter H3 rather than an operator H3.
  // These are not exhaustive — the skipPatterns below catch the common ones in MDG.
  const sectionHeaderPatterns = [
    /^(route|road|street|highway|corridor|bridge|tunnel)\s/i,
    /^(delivery|recreational|medical|hybrid)\s+(hub|service|option|differentiat|opportunity|market)/i,
    /^(roosevelt trail|midcoast regional|lakes region|nearby |why .* is on the map|local regulations)/i,
    /^(regulatory requirements|investment requirements|build[ -]?out|operator |tourism |seasonal )/i,
    /^(the bowdoin college|why .+ is|midcoast |tourism and seasonal)/i,
    /^delivery (as|hub|opportunity)/i,
    /^standalone /i,
    /^on the map$/i,
    /^closest /i,
    /^(town center|non-retail|delivery-first|near route|near |why bath|why brewer|why .+ is on)/i,
    /^(local operator|local regulations|the market|the opportunity|land use|zoning|fees|timeline)/i,
    // Round 2 fixes (caught 2026-07-12 via tranche artifact corruption):
    /^site selection/i,                      // "Site Selection Options" (Windham)
    /\w+ corner \/ .+ area/i,                 // "Standish Corner / Steep Falls Area" (Standish)
    /^\w+ (corridor|cluster|district)$/i,    // generic region/area labels
    /^(the \w+ college|the .+ (effect|draw|market|opportunity))$/i,
  ];

  const h3s = [];
  const re = /<h3[^>]*>([^<]+)<\/h3>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1].trim().replace(/\s+/g, ' ');
    if (skipPatterns.test(name)) continue;
    if (sectionHeaderPatterns.some(p => p.test(name))) continue;
    h3s.push(name);
  }
  // Clean: strip parenthetical type qualifiers and trailing " — Type" segments
  const cleaned = h3s.map(h =>
    h
      .replace(/\s*\((recreational|medical|medical \+ recreational|medical &amp; recreational|delivery|rec \+ med|rec)\)\s*$/i, '')
      .replace(/\s+—\s+(recreational|medical|delivery|rec|rec \+ med)\s*$/i, '')
      .replace(/\s+—\s+(medical|recreational)\s+cannabis\s*$/i, '')
      .trim()
  );
  // De-dup
  const seen = new Set();
  const out = [];
  for (const n of cleaned) {
    if (!n) continue;
    if (!seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }

  // Fallback: if H3 extraction yielded nothing, try to pull operator names from the current title.
  // Pattern: "... — Founding Farmers Dispensary (2026)" or "... — 3 Cannabis Dispensaries (2026)"
  //          "... — Landrace & Blue Lobster (2026)" — split on " & " or " and " or " / "
  if (out.length === 0 && currentTitle) {
    // Strip the year parenthetical
    const cleaned_title = currentTitle.replace(/\s*\((2026|2025)\)\s*$/, '').trim();
    // Look for " — " separator (MDG title convention)
    const afterDash = cleaned_title.split(/\s+[—–-]\s+/).pop();
    if (afterDash && afterDash !== cleaned_title) {
      // Split on common separators, strip type words
      const candidates = afterDash
        .split(/\s+(?:&|and|\/|\|)\s+/i)
        .map(s => s.replace(/\b(recreational|medical|delivery|rec|med|cannabis|dispensaries|dispensary)\b/gi, '').replace(/\s+/g, ' ').trim())
        .filter(s => s.length >= 3 && !/^\d+$/.test(s) && !sectionHeaderPatterns.some(p => p.test(s)));
      for (const c of candidates) {
        if (!seen.has(c.toLowerCase()) && c.length >= 3) {
          seen.add(c.toLowerCase());
          out.push(c);
        }
      }
    }
  }

  return out.slice(0, maxN);
}

// Pages whose current title already mirrors their top query — skip rewriting.
// These are proven winners per GSC. Don't touch unless evidence says so.
const SKIP_PAGES = new Set([
  'portland-dispensary-guide.astro', // current: "Where to Buy Cannabis in Portland, Maine: 2026 Buyer's Guide"
  'cannabis-friendly-maine-travel.astro', // blog, not in scope but guarded
  'best-maine-edibles-2026.astro',     // blog, not in scope
]);

function titleCaseFromSlug(slug) {
  // town-name-from-slug → Town Name
  return slug
    .split('-')
    .map(w => w.length <= 2 && w.match(/[a-z]/) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractCurrentTitleAndMeta(body) {
  // Astro frontmatter layout: title="..." description="..." (single or multi-line)
  const tM = body.match(/<Layout[\s\S]*?title="([^"]+)"[\s\S]*?description="([^"]+)"/);
  if (tM) return { title: tM[1], description: tM[2] };
  return { title: '', description: '' };
}

function buildProposed(bucket, town, operators) {
  const townShort = town.length > 18 ? town.slice(0, 18) + '…' : town; // crude length guard
  let title, description;

  if (bucket === 'consumer' || bucket === 'consumer-thin') {
    // Operator-named listing title
    if (operators.length === 0) {
      title = `${townShort}, ME Dispensaries (2026 List)`;
    } else if (operators.length === 1) {
      title = `${townShort}, ME Dispensaries: ${operators[0]} & More (2026)`;
    } else {
      const top2 = operators.slice(0, 2).join(', ');
      title = `${townShort}, ME Dispensaries: ${top2} & More (2026 List)`;
    }
    const opList = operators.slice(0, 4).join(', ') || 'licensed local operators';
    description = `${townShort}, ME dispensaries: addresses, hours, rec vs. medical status, and what each store stocks. ${opList} — 2026 list.`;
  } else if (bucket === 'hybrid') {
    // Hybrid has operator H3s but ambiguous subtitle; lean consumer with operator names
    if (operators.length >= 2) {
      const top2 = operators.slice(0, 2).join(', ');
      title = `${townShort}, ME Dispensaries: ${top2} & More (2026 List)`;
    } else if (operators.length === 1) {
      title = `${townShort}, ME Dispensaries: ${operators[0]} & More (2026)`;
    } else {
      title = `${townShort}, ME Dispensary Guide (2026)`;
    }
    const opList = operators.slice(0, 3).join(', ') || 'local operators';
    description = `${townShort}, ME dispensary guide: hours, addresses, rec vs. medical status, and what each store stocks. ${opList} — 2026.`;
  } else if (bucket === 'operator') {
    // Operator / B2B: "How to open" pages
    title = `How to Open a Dispensary in ${townShort}, Maine: License, Costs & 2026 Plan`;
    description = `How to open a cannabis dispensary in ${townShort}, Maine: OCP license process, costs, school buffer, zoning, and real-estate site selection. 2026 operator plan.`;
  } else {
    // unknown — minimal-safe proposal, operator should review manually
    title = `${townShort}, ME Dispensary Guide (2026)`;
    description = `${townShort}, ME dispensary guide — addresses, hours, rec vs. medical status. 2026 list.`;
  }

  return { title, description };
}

function buildRows() {
  const files = fs.readdirSync(GUIDES_DIR).filter(f =>
    f.endsWith('-dispensary-guide.astro') && !EXCLUDE_RE.test(f)
  );

  const out = [];
  for (const f of files) {
    const fp = path.join(GUIDES_DIR, f);
    const body = fs.readFileSync(fp, 'utf8');

    // Skip-list check first: if page is in skip list, record a "skip" row and continue.
    if (SKIP_PAGES.has(f)) {
      const { title: curTitle, description: curDesc } = extractCurrentTitleAndMeta(body);
      out.push({
        file: f,
        bucket: 'skip',
        town: '',
        h1: '',
        subtitle: '',
        operator_count: 0,
        operators: '',
        current_title: curTitle,
        proposed_title: curTitle, // unchanged
        current_desc_len: curDesc.length,
        proposed_description: curDesc,
        skip_reason: 'Current title already mirrors top query per GSC',
      });
      continue;
    }

    // Title + meta from layout frontmatter
    const { title: curTitle, description: curDesc } = extractCurrentTitleAndMeta(body);

    // H1
    const h1M = body.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const h1 = h1M ? h1M[1].trim() : '';

    // Subtitle
    const subM = body.match(/class="subtitle">([^<]+)</);
    const subtitle = subM ? subM[1].trim() : '';

    // Operators from H3s (with current-title fallback)
    const operators = extractOperatorNames(body, curTitle, 6);

    // Town name from slug (e.g., "fryeburg-dispensary-guide" → "Fryeburg")
    const slug = f.replace('-dispensary-guide.astro', '');
    const town = titleCaseFromSlug(slug);

    // Classify
    const bucket = classify(h1, subtitle, operators.length);

    // Build proposed
    const proposed = buildProposed(bucket, town, operators);

    out.push({
      file: f,
      bucket,
      town,
      h1,
      subtitle: subtitle.length > 80 ? subtitle.slice(0, 80) + '…' : subtitle,
      operator_count: operators.length,
      operators: operators.slice(0, 4).join(' | '),
      current_title: curTitle,
      proposed_title: proposed.title,
      current_desc_len: curDesc.length,
      proposed_description: proposed.description,
    });
  }

  // Sort: skip first, then bucket (operator first for revenue-priority), then file
  const bucketOrder = { skip: 0, operator: 1, hybrid: 2, consumer: 3, 'consumer-thin': 4, unknown: 5 };
  out.sort((a, b) => {
    const bo = (bucketOrder[a.bucket] ?? 9) - (bucketOrder[b.bucket] ?? 9);
    if (bo !== 0) return bo;
    return a.file.localeCompare(b.file);
  });

  return out;
}

// === CLI ===
const args = process.argv.slice(2);
const outputArg = args.find(a => a.startsWith('--output='));
const outputPath = outputArg ? outputArg.split('=')[1] : null;
const formatArg = args.find(a => a.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'md';
const bucketArg = args.find(a => a.startsWith('--bucket='));
const bucketFilter = bucketArg ? bucketArg.split('=')[1] : null;

let rows = buildRows();
if (bucketFilter) rows = rows.filter(r => r.bucket === bucketFilter);

// Bucket tally
const tally = rows.reduce((acc, r) => { acc[r.bucket] = (acc[r.bucket] || 0) + 1; return acc; }, {});

let out;
if (format === 'json') {
  // Clean structured output — preserves multi-word operator names without delimiter collision.
  // The markdown-table format can have operator names joined with " | " which collides with
  // markdown cell delimiters when 4+ operators are extracted (caught 2026-07-12 in tranche run).
  out = JSON.stringify({
    generated: new Date().toISOString(),
    total: rows.length,
    buckets: tally,
    rows: rows.map(r => ({
      file: r.file,
      bucket: r.bucket,
      town: r.town,
      operator_count: r.operator_count,
      operators: r.operators ? r.operators.split(' | ') : [],
      current_title: r.current_title,
      proposed_title: r.proposed_title,
      current_desc_len: r.current_desc_len,
      proposed_description: r.proposed_description,
    })),
  }, null, 2);
} else if (format === 'csv') {
  const headers = ['file', 'bucket', 'town', 'operator_count', 'operators', 'current_title', 'proposed_title', 'proposed_description'];
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))
  ).join('\n');
  out = `# City guide title rewrite proposals — generated ${new Date().toISOString().slice(0, 10)}\n# Total: ${rows.length} files\n# Buckets: ${Object.entries(tally).map(([k,v]) => `${k}=${v}`).join(', ')}\n\n${csv}\n`;
} else {
  // Markdown table
  let md = `# City guide title rewrite proposals\n\n_Generated ${new Date().toISOString().slice(0, 10)} from \`scripts/seo/city-title-rewriter.cjs\`._\n\n## Bucket tally (${rows.length} files)\n\n| Bucket | Count |\n|---|---|\n`;
  for (const [bucket, count] of Object.entries(tally)) {
    md += `| ${bucket} | ${count} |\n`;
  }
  md += `\n## Per-file proposals\n\n| Bucket | File | Town | Op count | Top operators | Current title | Proposed title |\n|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.bucket} | \`${r.file}\` | ${r.town} | ${r.operator_count} | ${r.operators || '—'} | ${r.current_title} | **${r.proposed_title}** |\n`;
  }
  md += `\n## How to apply\n\nThis script does NOT touch any .astro file. Output is for operator review.\n\n1. Review the bucket tally — confirm the consumer/operator/hybrid split makes sense.\n2. Spot-check 5-10 titles per bucket against the actual page body (operator names correct, town formatting correct, no truncation issues).\n3. Approve the bucket + template rule (or amend the rule in the script).\n4. Apply per-file patches via the patch tool with auto-generated strings.\n5. Run \`verify:iterate\` and \`verify:push\`.\n6. Commit + push.\n7. Re-measure GSC in 14-28d; expect CTR lift from 0.5-2% baseline toward 2-4% range.\n`;
  out = md;
}

if (outputPath) {
  fs.writeFileSync(outputPath, out);
  console.error(`Wrote ${rows.length} rows to ${outputPath}`);
} else {
  process.stdout.write(out);
}