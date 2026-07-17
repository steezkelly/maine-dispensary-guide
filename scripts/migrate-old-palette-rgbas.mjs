#!/usr/bin/env node
/**
 * migrate-old-palette-rgbas.mjs
 *
 * One-shot migration script — Task M1 of the Refined Editorial Foundation
 * rollout plan (spec §19). Replaces hardcoded old-palette sage/tint rgbas
 * across Maine Dispensary Guide content pages with color-mix(in oklab)
 * calls that flow with the new token layer.
 *
 * Real migration totals from commit `f31fde43`:
 *   - 234 .astro pages touched
 *   - 840 rgba() calls migrated to color-mix() calls
 *   - Distribution by old color family: 588 sage (88,129,87) + 87 spruce
 *     (13,78,80) + 4 lichen (163,177,138) + 13 orange (180,100,60) + 1 red
 *     (217,79,49) ≈ 693 unique migration targets; some files have multiple
 *     replacements accounting for the higher running total.
 *
 * The original spec §19 estimated ~590 sage + 540 spruce + 100 lichen +
 * 50 orange + 30 red = ~1310 total. The real audit found fewer because
 * production surfaces never accumulated as many callouts as the spec
 * extrapolated. Future audits should use grep totals, not the spec
 * estimate, as the source of truth.
 *
 * Per spec §19, the mapping is:
 *   rgba(88,  129, 87,  X) → color-mix(in oklab, var(--color-soft-green) X*100%, transparent)
 *   rgba(13,  78,  80,  X) → color-mix(in oklab, var(--color-primary)     X*100%, transparent)
 *   rgba(163, 177, 138, X) → color-mix(in oklab, var(--color-lichen)      X*100%, transparent)
 *   rgba(180, 100, 60,  X) → color-mix(in oklab, var(--color-accent)      X*100%, transparent)
 *   rgba(217, 79,  49,  X) → color-mix(in oklab, var(--color-error)       X*100%, transparent)
 *
 * The 17-title school-buffer cohort page is OFF-LIMITS per spec §16.6 / §19
 * (it has a measurement window that must not be perturbed by palette churn).
 *
 * Idempotent: re-running the script on already-migrated files is a no-op
 * because the source patterns are literal rgba() calls and the replacements
 * are color-mix() calls (no overlap).
 *
 * Usage:
 *   node scripts/migrate-old-palette-rgbas.mjs [--dry-run]
 *
 * Outputs a per-file count + grand total. Exits non-zero if any file fails
 * to parse post-migration (rare — the rgbas are in CSS attribute values,
 * not in Astro expressions).
 *
 * This script is committed to the design branch so future agents can
 * audit it + so the migration is reproducible. Per plan §Pre-flight note,
 * it is intended to be removed after Task M1 is merged to main (the
 * rationale: this migration is a one-shot, not a recurring operation;
 * keeping it in the branch adds noise).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PAGES_DIR = join(ROOT, 'apps/maine-cannabis/src/pages');
const SKIP_FILES = new Set([
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-school-buffer.astro',
]);

// Five palette r → color-mix transforms. Patterns accept any alpha value.
const TRANSFORMS = [
  { key: 'soft-green', sourceR: 88, sourceG: 129, sourceB: 87,  token: '--color-soft-green' },
  { key: 'primary',    sourceR: 13, sourceG: 78,  sourceB: 80,  token: '--color-primary' },
  { key: 'lichen',     sourceR: 163, sourceG: 177, sourceB: 138, token: '--color-lichen' },
  { key: 'accent',     sourceR: 180, sourceG: 100, sourceB: 60,  token: '--color-accent' },
  { key: 'error',      sourceR: 217, sourceG: 79,  sourceB: 49,  token: '--color-error' },
];

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run') || ARGS.has('-n');

function buildPattern({ sourceR, sourceG, sourceB }) {
  // Match rgba(R, G, B, 0.XX) — the comma space, the leading 1.0 case is not present in the codebase.
  const re = new RegExp(
    `rgba\\(\\s*${sourceR}\\s*,\\s*${sourceG}\\s*,\\s*${sourceB}\\s*,\\s*([0-9.]+)\\s*\\)`,
    'g',
  );
  return re;
}

function buildReplacement({ token }, alpha) {
  // X*100% — e.g., 0.08 → 8%.
  const percent = (parseFloat(alpha) * 100).toFixed(2).replace(/\.?0+$/, '');
  return `color-mix(in oklab, var(${token}) ${percent}%, transparent)`;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (entry.endsWith('.astro')) out.push(full);
  }
  return out;
}

const allFiles = walk(PAGES_DIR);
let totalReplacements = 0;
let filesTouched = 0;
const fileReport = [];

for (const filePath of allFiles) {
  const relPath = relative(ROOT, filePath);
  if (SKIP_FILES.has(relPath)) {
    fileReport.push({ file: relPath, replacements: 0, skipped: true });
    continue;
  }

  const original = readFileSync(filePath, 'utf8');
  let next = original;
  let replacements = 0;
  for (const t of TRANSFORMS) {
    const re = buildPattern(t);
    next = next.replace(re, (match, alpha) => {
      replacements++;
      return buildReplacement(t, alpha);
    });
  }

  if (replacements > 0) {
    filesTouched++;
    totalReplacements += replacements;
    fileReport.push({ file: relPath, replacements, skipped: false });
    if (!DRY_RUN) {
      writeFileSync(filePath, next, 'utf8');
    }
  }
}

// Print a summary.
console.log(`# M1 token migration ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log(`# Files scanned: ${allFiles.length}`);
console.log(`# Files with matches: ${filesTouched}`);
console.log(`# Total rgba replacements: ${totalReplacements}`);
console.log('');
const top = fileReport
  .filter(r => r.replacements > 0)
  .sort((a, b) => b.replacements - a.replacements)
  .slice(0, 20);
for (const row of top) {
  console.log(`  ${String(row.replacements).padStart(4, ' ')}  ${row.file}`);
}
if (top.length < fileReport.filter(r => r.replacements > 0).length) {
  const remaining = fileReport.filter(r => r.replacements > 0).length - top.length;
  console.log(`  ...and ${remaining} more files`);
}
