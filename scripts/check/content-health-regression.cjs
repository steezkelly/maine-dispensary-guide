#!/usr/bin/env node
/**
 * check-content-health-regression.cjs
 *
 * Regression detector for content health. Runs check-content-health and
 * compares the per-check failure count against a stored baseline. Fails
 * CI if any check's count goes UP, posts a warning if it goes DOWN.
 *
 * Why this exists: check-content-health has ~23 known baseline failures
 * (duplicate hero hashes for cross-page fallback pairs, 404 page missing
 * og:image, noindex-in-sitemap for /download/*, etc.) that the team has
 * explicitly chosen not to fix. Hard-failing CI on those would block
 * every PR. Regression-detecting catches NEW failures without blocking
 * the existing backlog.
 *
 * Baseline file: scripts/check/.content-health-baseline.json
 * Format: { "checkName": failureCount, ... }
 *
 * Usage:
 *   node ./scripts/check/content-health-regression.cjs
 *   node ./scripts/check/content-health-regression.cjs --update-baseline
 *   CI usage: `node ./scripts/check/content-health-regression.cjs`
 *     (non-zero exit on regression or a missing baseline; baseline writes
 *      require the explicit --update-baseline maintenance flag)
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT_DIR = __dirname;
const CHECK_SCRIPT = path.join(SCRIPT_DIR, 'check-content-health.cjs');
const BASELINE_FILE = path.join(SCRIPT_DIR, '.content-health-baseline.json');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

let baseline = {};
if (fs.existsSync(BASELINE_FILE)) {
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  } catch (e) {
    console.error(`⚠️  Baseline file malformed: ${e.message}. Treating as empty.`);
    baseline = {};
  }
}

let stdout = '';
let checkFailed = false;
try {
  stdout = execSync(`node ${JSON.stringify(CHECK_SCRIPT)}`, {
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  // check-content-health exits 1 on any failure. Capture output anyway.
  checkFailed = true;
  stdout = (err.stdout || '') + (err.stderr || '');
}

// Parse ❌  <check name>: N issue(s) lines
const failureLineRe = /^❌\s+(.+?):\s+(\d+)\s+issue/;
const current = {};
for (const line of stdout.split(/\r?\n/)) {
  const m = line.match(failureLineRe);
  if (m) {
    current[m[1].trim()] = parseInt(m[2], 10);
  }
}

const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
const regressions = [];
const improvements = [];
const newChecks = [];

for (const k of allKeys) {
  const base = baseline[k] || 0;
  const cur = current[k] || 0;
  if (!(k in baseline)) {
    newChecks.push({ name: k, count: cur });
  } else if (cur > base) {
    regressions.push({ name: k, baseline: base, current: cur, delta: cur - base });
  } else if (cur < base) {
    improvements.push({ name: k, baseline: base, current: cur, delta: base - cur });
  }
}

console.log('📊 content-health regression check');
console.log('');

if (Object.keys(baseline).length === 0) {
  console.log(`ℹ️  No baseline found. Current state has ${Object.keys(current).length} failing checks and ${Object.values(current).reduce((a, b) => a + b, 0)} total failures.`);
  if (UPDATE_BASELINE) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n');
    console.log(`   Written to ${path.relative(process.cwd(), BASELINE_FILE)}`);
    console.log('   Commit this file to lock in the baseline.');
    process.exit(0);
  }
  console.log('   Baseline not written. Re-run with --update-baseline to record it as an explicit maintenance action.');
  process.exit(1);
}

if (newChecks.length > 0) {
  console.log('🆕 NEW failing checks (not in baseline):');
  for (const { name, count } of newChecks) {
    console.log(`   ❌ ${name}: ${count}`);
  }
  console.log('   → Add these to the baseline or fix them in the PR.');
  console.log('');
}

if (regressions.length > 0) {
  console.log('🔴 REGRESSIONS (baseline → current):');
  for (const { name, baseline, current, delta } of regressions) {
    console.log(`   ❌ ${name}: ${baseline} → ${current} (+${delta})`);
  }
}

if (improvements.length > 0) {
  console.log('🟢 IMPROVEMENTS (baseline → current):');
  for (const { name, baseline, current, delta } of improvements) {
    console.log(`   ✓ ${name}: ${baseline} → ${current} (-${delta})`);
  }
  if (UPDATE_BASELINE) {
    for (const { name, current } of improvements) {
      baseline[name] = current;
    }
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n');
    console.log('   → Baseline updated to reflect improvements.');
  } else {
    console.log('   → Baseline not updated. Re-run with --update-baseline to accept these improvements.');
  }
}

if (newChecks.length === 0 && regressions.length === 0 && improvements.length === 0) {
  console.log('✅  No change from baseline. All checks holding steady.');
}

console.log('');
const totalBaseline = Object.values(baseline).reduce((a, b) => a + b, 0);
const totalCurrent = Object.values(current).reduce((a, b) => a + b, 0);
console.log(`Total: baseline=${totalBaseline} current=${totalCurrent}`);

if (regressions.length > 0 || newChecks.length > 0) {
  console.log('');
  console.log('❌  content-health regression detected. Fix the new failures or update the baseline if intentional.');
  process.exit(1);
}

console.log('');
console.log('✅  content-health: no regressions.');
process.exit(0);
