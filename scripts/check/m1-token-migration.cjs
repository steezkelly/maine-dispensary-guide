// m1-token-migration.cjs
//
// Implements design-spec ticket M1: replace hardcoded old-palette rgba()
// values in content pages with color-mix() expressions so that hardcoded
// callout backgrounds now resolve through the design tokens.
//
// Ticket M1 scope (design-spec section 19):
//   - Scope: apps/maine-cannabis/src/pages/**/*.astro
//   - DO NOT TOUCH: apps/maine-cannabis/src/pages/guides/maine-cannabis-school-buffer.astro
//   - Mappings per ticket:
//       rgba(88, 129, 87, ...) -> var(--color-soft-green)
//       rgba(13, 78, 80, ...)  -> var(--color-primary)
//   - Phase 2 surfaces ship after this land and after Phase 1 token
//     definitions already exist in apps/maine-cannabis/src/styles/theme-2026.css.

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = parseArgs(process.argv.slice(2));

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCOPE_GLOB = path.join(REPO_ROOT, 'apps/maine-cannabis/src/pages');
const DO_NOT_TOUCH = path.join(
  REPO_ROOT,
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-school-buffer.astro',
);

const MAPPINGS = [
  {
    label: 'old sage-green tint',
    rgbBytes: [88, 129, 87],
    token: 'var(--color-soft-green)',
    specNote:
      'rgba(88, 129, 87, X) old sage-tint callout bg. Maps to var(--color-soft-green) which is #5F7E50 in current theme-2026.css.',
  },
  {
    label: 'old deep-spruce primary tint',
    rgbBytes: [13, 78, 80],
    token: 'var(--color-primary)',
    specNote:
      'rgba(13, 78, 80, X) old deep-spruce primary tint. Maps to var(--color-primary) which is #1F4D3A in current theme-2026.css.',
  },
];

function buildRgbaRegex(rgbBytes) {
  const [r, g, b] = rgbBytes;
  return new RegExp(
    'rgba\\(\\s*' + r + '\\s*,\\s*' + g + '\\s*,\\s*' + b + '\\s*,\\s*([01]?\\.[0-9]+|[01])\\s*\\)',
    'g',
  );
}

function rgbaToColorMix(_rgbaCall, alpha, token) {
  // Alpha fraction [0, 1] -> CSS color-mix percentage [1%, 100%].
  // Clamp to avoid 0% which CSS color-mix treats as fully transparent
  // rather than "no presence" of the token, and avoid 100% which
  // would lose the original transparency cue.
  const pct = Math.round(parseFloat(alpha) * 100);
  const pctClamped = Math.max(1, Math.min(100, pct));
  return 'color-mix(in oklab, ' + token + ' ' + pctClamped + '%, transparent)';
}

function processFile(textOrPath, _unused) {
  // Two-mode entry: either a string (test mode) or a file path (real mode).
  let text;
  let sourcePath = null;
  if (typeof textOrPath === 'string' && fs.existsSync(textOrPath)) {
    sourcePath = textOrPath;
    text = fs.readFileSync(textOrPath, 'utf8');
  } else {
    text = textOrPath;
  }

  let mutated = text;
  const replacements = [];

  for (const m of MAPPINGS) {
    const re = buildRgbaRegex(m.rgbBytes);
    mutated = mutated.replace(re, (match, alpha) => {
      const replacement = rgbaToColorMix(match, alpha, m.token);
      replacements.push({ from: match, to: replacement, mapping: m.label, file: sourcePath });
      return replacement;
    });
  }

  return { mutated, replacements, changed: mutated !== text };
}

function* walkPages() {
  function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.astro') && full !== DO_NOT_TOUCH) {
        yield full;
      }
    }
  }
  yield* walk(SCOPE_GLOB);
}

function printHumanSummary(stats) {
  const lines = [];
  lines.push('');
  lines.push('=== m1-token-migration summary ===');
  lines.push('  mode:                     ' + stats.mode);
  lines.push('  scope:                    ' + stats.scope);
  lines.push('  files inspected:          ' + stats.filesInspected);
  lines.push('  files skipped (cohort):   ' + stats.filesSkipped);
  lines.push('  files matched:            ' + stats.filesMatched);
  lines.push('  files written:            ' + stats.filesWritten);
  lines.push('  total rgba->color-mix:    ' + stats.totalReplacements);
  lines.push('');
  lines.push('  by mapping:');
  for (const [label, count] of Object.entries(stats.byMapping)) {
    lines.push('    ' + String(count).padStart(4) + '  ' + label);
  }
  if (stats.dryRun && stats.totalReplacements > 0) {
    lines.push('');
    lines.push('  (dry-run - no files were modified. Re-run with --apply to write changes.)');
  }
  console.log(lines.join('\n'));
}

function parseArgs(argv) {
  const out = { mode: 'status' };
  for (const a of argv) {
    if (a === '--dry-run') out.mode = 'dry-run';
    else if (a === '--apply') out.mode = 'apply';
    else if (a === '--status') out.mode = 'status';
    else {
      console.error('Unknown arg: ' + a);
      process.exit(2);
    }
  }
  return out;
}

function fail(msg) {
  console.error('m1-token-migration: ' + msg);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(SCOPE_GLOB)) {
    fail('scope path missing: ' + SCOPE_GLOB);
  }
  if (!fs.existsSync(DO_NOT_TOUCH)) {
    fail('do-not-touch file missing (cannot verify cohort exclusion): ' + DO_NOT_TOUCH);
  }

  let filesInspected = 0;
  let filesMatched = 0;
  let filesWritten = 0;
  let totalReplacements = 0;
  const byMapping = {};
  for (const m of MAPPINGS) byMapping[m.label] = 0;

  for (const filePath of walkPages()) {
    filesInspected++;
    const { mutated, replacements, changed } = processFile(filePath);
    if (replacements.length === 0) continue;
    filesMatched++;
    for (const r of replacements) {
      totalReplacements++;
      byMapping[r.mapping] = (byMapping[r.mapping] || 0) + 1;
    }
    if (changed && ARGS.mode === 'apply') {
      fs.writeFileSync(filePath, mutated, 'utf8');
      filesWritten++;
    }
  }

  const stats = {
    mode: ARGS.mode,
    scope: path.relative(REPO_ROOT, SCOPE_GLOB),
    filesInspected,
    filesSkipped: 1, // school-buffer cohort
    filesMatched,
    filesWritten,
    totalReplacements,
    byMapping,
    dryRun: ARGS.mode !== 'apply',
  };
  printHumanSummary(stats);

  if (ARGS.mode === 'apply' && filesWritten !== filesMatched) {
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRgbaRegex,
  rgbaToColorMix,
  processFile,
  MAPPINGS,
  SCOPE_GLOB,
  DO_NOT_TOUCH,
};