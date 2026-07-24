#!/usr/bin/env node
/**
 * Add cross-links to the 3 new outdoor-cluster pages from all existing
 * home-grow-maine cluster pages. Inserts links into the existing
 * "Related Maine Home Grow Guides" or "further-reading" sections.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(REPO, 'apps/maine-cannabis/src/pages');

const NEW_PAGES = [
  { path: 'blog/outdoor-cannabis-grow-maine-2026.astro', title: 'Growing Cannabis Outdoors in Maine 2026', desc: 'zone selection, site prep, planting calendar, and harvest timing' },
  { path: 'blog/cannabis-soil-maine-2026.astro', title: 'Cannabis Soil in Maine 2026', desc: 'native soil types, pH correction, raised beds, and fabric pots' },
  { path: 'blog/cannabis-pests-mold-maine-2026.astro', title: 'Cannabis Pests & Mold in Maine 2026', desc: 'botrytis prevention, powdery mildew, deer, and IPM' },
];

const EXISTING_PAGES = [
  'blog/maine-home-grow-cannabis-guide-2026.astro',
  'blog/best-cannabis-strains-maine-outdoor-2026.astro',
  'blog/when-to-start-cannabis-seeds-maine-2026.astro',
  'blog/indoor-cannabis-grow-setup-maine-cost-2026.astro',
  'blog/drying-cannabis-maine-humidity-2026.astro',
  'blog/autoflower-vs-feminized-maine-2026.astro',
  'blog/cannabis-clones-vs-seeds-maine-2026.astro',
  'blog/greenhouse-cannabis-maine-2026.astro',
  'resources/buy-cannabis-seeds-maine.astro',
];

function buildLinks() {
  return NEW_PAGES.map(p => {
    const url = '/' + p.path.replace(/\.astro$/, '');
    return `      <li><a href="${url}">${p.title}</a> — ${p.desc}</li>`;
  }).join('\n');
}

function addLinks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const links = buildLinks();

  // Check if already has the links
  if (content.includes('outdoor-cannabis-grow-maine-2026')) {
    console.log(`  SKIP: ${path.basename(filePath)} (already has links)`);
    return false;
  }

  // Strategy 1: compressed single-line — find the last <li> with a blog/guides link before </ul>
  // Strategy 2: multi-line — find the last </li>\n      </ul> pair in a further-reading section

  // Try compressed: insert before closing </ul> that follows the last /blog/ or /guides/ or /resources/ link
  // Pattern: <li><a href="...blog or guides...">...</a></li>\s*</ul>
  const compressedPattern = /(<li><a href="\/(?:blog|guides|resources)\/[^"]*"[^>]*>[^<]*<\/a>[^<]*<\/li>)(\s*<\/ul>)/;
  const m1 = content.match(compressedPattern);
  if (m1) {
    content = content.replace(compressedPattern, `$1${links}$2`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  OK: ${path.basename(filePath)} (compressed)`);
    return true;
  }

  // Try multi-line
  const multiLinePattern = /(<li><a href="\/(?:blog|guides|resources)\/[^"]*"[^>]*>[^<]*<\/a>[^<]*<\/li>\n)(\s*<\/ul>)/;
  const m2 = content.match(multiLinePattern);
  if (m2) {
    content = content.replace(multiLinePattern, `$1${links}\n$2`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  OK: ${path.basename(filePath)} (multi-line)`);
    return true;
  }

  console.log(`  FAIL: ${path.basename(filePath)} (no insertion point found)`);
  return false;
}

console.log('Adding outdoor-cluster cross-links to existing home-grow pages...\n');

let updated = 0;
for (const pagePath of EXISTING_PAGES) {
  const filePath = path.join(PAGES_DIR, pagePath);
  if (!fs.existsSync(filePath)) {
    console.log(`  MISSING: ${pagePath}`);
    continue;
  }
  if (addLinks(filePath)) updated++;
}

console.log(`\nDone: ${updated}/${EXISTING_PAGES.length} pages updated.`);
