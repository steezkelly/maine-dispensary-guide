#!/usr/bin/env node
'use strict';
/**
 * Clean up unused imports and variables in city guides that surface as
 * ts(6133) warnings when all 111 files are in the changed-files set.
 *
 * Removes:
 * - `import Callout from ...` when <Callout is never used in the body
 * - `const faqPageJsonLd = JSON.stringify({...});` when only referenced once (declaration)
 */
const fs = require('fs');
const path = require('path');

const GUIDES = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
const DRY = process.argv.includes('--dry-run');

const files = fs.readdirSync(GUIDES).filter(f => f.endsWith('-dispensary-guide.astro'));
let calloutRemoved = 0, faqRemoved = 0;

for (const f of files.sort()) {
  const fp = path.join(GUIDES, f);
  let src = fs.readFileSync(fp, 'utf8');
  let changed = false;

  // Remove unused Callout import
  if (src.includes("import Callout from") && !src.includes("<Callout")) {
    src = src.replace(/import Callout from '[^']*';\n?/, '');
    calloutRemoved++;
    changed = true;
  }

  // Remove unused faqPageJsonLd (only 1 reference = declaration itself)
  const faqCount = (src.match(/faqPageJsonLd/g) || []).length;
  if (faqCount === 1 && src.includes("const faqPageJsonLd = JSON.stringify(")) {
    // Remove the entire const declaration (may span multiple lines)
    src = src.replace(/const faqPageJsonLd = JSON\.stringify\([\s\S]*?\);\n?/, '');
    faqRemoved++;
    changed = true;
  }

  if (changed && !DRY) {
    fs.writeFileSync(fp, src, 'utf8');
  }
}

console.log(`\n=== cleanup ${DRY ? '(DRY RUN)' : '(APPLIED)'} ===`);
console.log(`Callout imports removed: ${calloutRemoved}`);
console.log(`faqPageJsonLd declarations removed: ${faqRemoved}`);
