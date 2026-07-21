#!/usr/bin/env node
'use strict';
/**
 * Migrate city guides from inline <Layout> + <style> + <article> to the shared
 * CityGuide.astro component. Removes the 17 duplicated base CSS rules from each
 * page's inline <style>, keeping only page-specific extras.
 *
 * Usage:
 *   node scripts/migrate/city-guide-to-component.cjs --dry-run   # report only
 *   node scripts/migrate/city-guide-to-component.cjs             # apply
 *   node scripts/migrate/city-guide-to-component.cjs --only=alfred  # single file
 */
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis');
const GUIDES = path.join(APP, 'src', 'pages', 'guides');
const DRY = process.argv.includes('--dry-run');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : null;

// The 17 shared base rules, normalized for comparison.
function normalizeRule(r) {
  return r
    .replace(/\s+/g, '')
    .replace(/;}/g, '}')
    .replace(/0\.(\d)/g, '.$1')
    .toLowerCase();
}

const BASE_RULES_RAW = [
  'article{max-width:720px;margin:0 auto}',
  '.article-header{margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--color-border)}',
  '.subtitle{font-size:1.125rem;color:var(--color-text-light)}',
  'section{margin-bottom:2.5rem}',
  'section h2,section h3{margin-top:1.5rem}',
  'section h2:first-child{margin-top:0}',
  'table{width:100%;border-collapse:collapse;margin:1rem 0}',
  'th,td{padding:0.6rem 0.75rem;text-align:left;border-bottom:1px solid var(--color-border)}',
  'th{background:var(--color-background)}',
  'ul,ol{padding-left:1.5rem}',
  'li{margin-bottom:0.4rem}',
  '.disclaimer{background:var(--color-disclaimer-bg);border:1px solid var(--color-disclaimer-border);padding:1rem;border-radius:0.5rem;font-size:0.875rem;color:var(--color-disclaimer-text)}',
  '.fact-box{background:color-mix(in oklab,var(--color-soft-green) 10%,transparent);padding:1.75rem;border-radius:1rem;border-left:4px solid var(--color-primary)}',
  '.fact-box h2{margin-top:0;font-size:1.25rem}',
  '.fact-box table{margin:0}',
  '.further-reading{background:color-mix(in oklab,var(--color-soft-green) 5%,transparent);padding:1.5rem;border-radius:1rem;margin-top:3rem}',
  '.further-reading h2{margin-top:0;font-size:1.25rem}',
];
const BASE_NORM = new Set(BASE_RULES_RAW.map(normalizeRule));

function splitRules(body) {
  const rules = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { rules.push(body.slice(start, i + 1)); start = i + 1; } }
  }
  return rules.map(r => r.trim()).filter(Boolean);
}

const files = fs.readdirSync(GUIDES).filter(f => f.endsWith('-dispensary-guide.astro'));
let converted = 0, skipped = 0, errors = [];
const report = [];

for (const f of files.sort()) {
  if (ONLY && !f.includes(ONLY)) continue;
  const fp = path.join(GUIDES, f);
  let src = fs.readFileSync(fp, 'utf8');

  // Skip if already converted
  if (src.includes("import CityGuide from")) {
    report.push(`SKIP(already)  ${f}`);
    skipped++;
    continue;
  }

  // Must have Layout import
  if (!src.includes("import Layout from")) {
    report.push(`SKIP(no-layout)  ${f}`);
    skipped++;
    continue;
  }

  try {
    // 1. Replace Layout import with CityGuide import
    src = src.replace(
      /import Layout from '\.\.\/\.\.\/layouts\/Layout\.astro';/,
      "import CityGuide from '../../components/CityGuide.astro';"
    );

    // 2. Replace <Layout ...> with <CityGuide ...> (handle single-line and multi-line)
    src = src.replace(/<Layout(\s)/g, '<CityGuide$1');

    // 3. Handle <style> block: remove base rules, keep extras
    const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      const rules = splitRules(styleMatch[1]);
      const kept = rules.filter(r => !BASE_NORM.has(normalizeRule(r)));
      if (kept.length === 0) {
        // Full extraction: remove entire <style> block
        src = src.replace(/\n?<style>[\s\S]*?<\/style>/, '');
      } else {
        // Partial: keep only extras
        const extrasPretty = kept.map(r => '  ' + r.replace(/\s+/g, ' ').trim()).join('\n');
        src = src.replace(/<style>[\s\S]*?<\/style>/, `<style>\n${extrasPretty}\n</style>`);
      }
    }

    // 4. Remove <article> opening tag (always on its own line)
    src = src.replace(/\n<article>\n/, '\n');

    // 5. Remove </article> closing tag (may be at end of another element's line)
    // Replace the LAST </article> before </Layout> (now </CityGuide>)
    src = src.replace(/<\/article>\s*\n\s*<\/Layout>/, '\n</CityGuide>');
    // Fallback: if </article> is on same line as content
    src = src.replace(/<\/article>\s*<\/Layout>/, '</CityGuide>');
    // Another fallback: </article> on its own line followed by </Layout>
    src = src.replace(/<\/article>\n<\/Layout>/, '</CityGuide>');

    // 6. Replace remaining </Layout> with </CityGuide> (safety net)
    src = src.replace(/<\/Layout>/g, '</CityGuide>');

    if (!DRY) fs.writeFileSync(fp, src, 'utf8');
    converted++;
    const keptCount = styleMatch ? splitRules(styleMatch[1]).filter(r => !BASE_NORM.has(normalizeRule(r))).length : 0;
    report.push(`${keptCount === 0 ? 'FULL' : 'PARTIAL(keep ' + keptCount + ')'}  ${f}`);
  } catch (e) {
    errors.push({ file: f, error: e.message });
    report.push(`ERROR  ${f}: ${e.message}`);
  }
}

console.log(`\n=== city-guide-to-component ${DRY ? '(DRY RUN)' : '(APPLIED)'} ===`);
console.log(`files: ${files.length} | converted: ${converted} | skipped: ${skipped} | errors: ${errors.length}`);
console.log(report.slice(0, 40).join('\n'));
if (report.length > 40) console.log(`... and ${report.length - 40} more`);
if (errors.length > 0) {
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log(`  ${e.file}: ${e.error}`));
}
