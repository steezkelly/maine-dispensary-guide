#!/usr/bin/env node
/**
 * Apply the operator-link fix from commit 4eb306c7 across all town-guide
 * pages that the scanner (find-missing-operator-links.cjs) flagged.
 *
 * Strategy: for each (town, operator) pair flagged by the scanner:
 *   1. Skip lines inside the frontmatter (--- ... ---) block — those are
 *      JS code, not HTML body, and inserting <a> tags there breaks the page.
 *   2. Skip lines inside h1-h6 headings.
 *   3. Skip lines without body HTML tags (defensive).
 *   4. Skip lines where the operator name is already inside an existing <a> tag.
 *   5. Find the FIRST body paragraph / list item / table cell with the
 *      operator name, wrap it as an anchor link to the profile.
 *   6. Write back.
 *
 * Idempotent: re-runs are no-ops if the link is already in place.
 *
 * Usage:  node scripts/analytics/apply-operator-link-fixes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

const GUIDES_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');

// Operator display names used as the search needle in town pages.
const OPERATOR_DISPLAY = {
  'above-all-greenery-dispensary': 'Above All Greenery',
  'eclipse-cannabis-company': 'Eclipse',
  'founding-farmers-dispensary': 'Founding Farmers',
  'great-atlantic-puffin-company': 'Puffin',
  'hidden-greens-dispensary': 'Hidden Greens',
  'lifted-cannabis-maine': 'Lifted',
  'puffin-co': 'Puffin',
  'white-mountain-craft-cannabis': 'White Mountain',
  '420-mules-bar-harbor': '420 Mules',
};

const SCANNER = execSync(
  'node ' + path.join(__dirname, 'find-missing-operator-links.cjs'),
  { encoding: 'utf8' }
);

// Parse scanner output: 2-space-indented "file mentions name (Nx) ..." + "    line(s): ..." pair
const FLAGGED = [];
let cur = null;
for (const rawLine of SCANNER.split('\n')) {
  const line = rawLine.replace(/^\s+/, '');
  const m = line.match(/^(\S+\.astro) mentions "([^"]+)" \((\d+)x\) but does NOT link to (\S+)/);
  if (m) {
    cur = { town: m[1], name: m[2], count: parseInt(m[3], 10), profile: m[4] };
    FLAGGED.push(cur);
  } else if (cur && /line\(s\):/.test(line)) {
    cur.lines = line.match(/line\(s\): ([\d, ]+)/)[1].split(',').map(s => parseInt(s.trim(), 10));
  }
}

console.log(`Applying fixes to ${FLAGGED.length} (town, operator) pairs:\n`);

let fixed = 0, skipped = 0, errors = 0;

function findFrontmatterRanges(content) {
  const lines = content.split('\n');
  const ranges = [];
  let inFm = false;
  let fmStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^---$/.test(lines[i])) {
      if (!inFm) {
        inFm = true;
        fmStart = i;
      } else {
        inFm = false;
        ranges.push({ start: fmStart, end: i });
      }
    }
  }
  return ranges;
}

for (const flag of FLAGGED) {
  const filePath = path.join(GUIDES_DIR, flag.town);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING FILE: ${filePath}`);
    errors++;
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  const profilePath = flag.profile;

  // Idempotency: skip if link already exists
  if (content.includes(`href="${profilePath}"`)) {
    skipped++;
    continue;
  }

  // Identify lines inside frontmatter (--- block) — off-limits
  const frontmatterRanges = findFrontmatterRanges(content);

  // Build the regexes for this operator
  const escapedName = flag.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRe = new RegExp(`\\b${escapedName}\\b`);
  const linkRe = new RegExp(`<a[^>]*href=["']${profilePath.replace(/\//g, '\\/')}["'][^>]*>${escapedName}</a>`);
  // Detect any existing <a>...</a> segment on the line (greedy match for nested)
  const anchorSegmentRe = /<a\b[^>]*>.*?<\/a>/g;

  const lines = content.split('\n');
  let applied = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-indexed
    if (!nameRe.test(line)) continue;
    if (linkRe.test(line)) continue; // operator name already linked
    // Skip if line is inside frontmatter (--- block) — those are JS code
    if (frontmatterRanges.some(r => lineNum >= r.start + 1 && lineNum <= r.end + 1)) continue;
    // Skip h1-h6 headings
    if (/<h[1-6][\s>]/.test(line)) continue;
    // Skip lines that don't have body HTML tags (defensive — would catch
    // any frontmatter leftovers the frontmatter detector missed)
    if (!/<(p|li|td|th|dd|blockquote)\b/.test(line)) continue;

    // Find segments of the line that are NOT inside an existing anchor
    const anchorRanges = [];
    let m;
    anchorSegmentRe.lastIndex = 0;
    while ((m = anchorSegmentRe.exec(line)) !== null) {
      anchorRanges.push([m.index, m.index + m[0].length]);
    }
    const inAnchor = (idx) => anchorRanges.some(([s, e]) => idx >= s && idx < e);
    const match = nameRe.exec(line);
    if (!match || inAnchor(match.index)) continue;
    const start = match.index;
    const matched = match[0];
    const before = line.slice(0, start);
    const after = line.slice(start + matched.length);
    const newLine = `${before}<a href="${profilePath}">${matched}</a>${after}`;
    lines[i] = newLine;
    applied = true;
    break; // one fix per (town, operator) pair
  }

  if (!applied) {
    console.warn(`  NO MATCH (skipped): ${flag.town} → ${flag.name}`);
    skipped++;
    continue;
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  fixed++;
  console.log(`  ${flag.town.padEnd(50)} → ${flag.profile} (1 link added)`);
}

console.log(`\nDone. fixed=${fixed}, skipped=${skipped}, errors=${errors}`);