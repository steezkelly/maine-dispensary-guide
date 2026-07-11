#!/usr/bin/env node
/**
 * Apply the operator-link fix from commit 4eb306c7 across all town-guide
 * pages that the scanner (find-missing-operator-links.cjs) flagged.
 *
 * Strategy: for each (town, operator) pair flagged by the scanner:
 *   1. Find the FIRST <p>...</p> body paragraph (skip FAQ JSON, table cells,
 *      h1-h3 headings) that contains the operator's display name.
 *   2. Wrap the operator's display name as an anchor link to the profile.
 *   3. Write back.
 *
 * Idempotent: re-runs are no-ops if the link is already in place.
 *
 * Usage:  node scripts/analytics/apply-operator-link-fixes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const GUIDES_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');

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

const SCANNER = require('child_process').execSync(
  'node ' + path.join(__dirname, 'find-missing-operator-links.cjs'),
  { encoding: 'utf8' }
);

// Parse scanner output: lines like
//   "<file> mentions \"<name>\" (<n>x) but does NOT link to <path>"
//   "    line(s): <list>"
const FLAGGED = [];
let cur = null;
for (const rawLine of SCANNER.split('\n')) {
  // Lines are 2-space-indented: '  <file>.astro mentions "<name>" (Nx) but does NOT link to <path>'
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

  // Build the anchor link with the operator's display name
  const escapedName = flag.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRe = new RegExp(`\\b${escapedName}\\b`);
  const linkRe = new RegExp(`<a[^>]*href=["']${profilePath.replace(/\//g, '\\/')}["'][^>]*>${escapedName}</a>`);
  const tagOpenRe = new RegExp(`<a\\b[^>]*>(?!</a>)`);
  const tagCloseRe = /<\/a>/;

  const lines = content.split('\n');
  let applied = false;
  // Build a separate regex that detects "is the operator name inside an
  // existing <a>...</a> block on this line?". Used to avoid nesting
  // anchors. We split the line into segments-by-existing-anchor and
  // only insert the new link in segments that don't have one.
  const anchorSegmentRe = /<a\b[^>]*>.*?<\/a>/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!nameRe.test(line)) continue;
    if (linkRe.test(line)) continue; // operator name already linked
    // Skip lines that are inside JSON.stringify FAQ (frontmatter const)
    if (/^const faqPageJsonLd\s*=/.test(line) || /^const \w+PageJsonLd\s*=/.test(line)) continue;
    if (/faqPageJsonLd|PageJsonLd/.test(line)) continue;
    // Skip h1-h6 headings (operate on body paragraphs, list items, table cells)
    if (/<h[1-6][\s>]/.test(line)) continue;

    // Find segments of the line that are NOT inside an existing anchor.
    // We do this by replacing anchor segments with sentinels, then
    // applying the name match only to non-sentinel segments.
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
    break; // only fix the first eligible match per (town, operator) pair
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