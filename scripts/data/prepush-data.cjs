#!/usr/bin/env node
/**
 * prepush-data.cjs
 *
 * Pre-push data registry refresh step.
 *
 * Owns the regeneration + `git add` cycle for generated data files
 * (currently `apps/maine-cannabis/src/data/autoRelatedData.json`).
 * Lives outside the verifier so the verifier remains read-only and
 * fail-closed on stale data (PR #97, governance 2026-07-20).
 *
 * Usage:
 *   node scripts/data/prepush-data.cjs             # regen + stage
 *   node scripts/data/prepush-data.cjs --check    # freshness probe (no writes)
 *   node scripts/data/prepush-data.cjs --dry-run   # report what would change
 *
 * Exit codes:
 *   0  success (regen + stage; check when fresh)
 *   1  --check: data file is stale (regen needed)
 *   2  regen script failed
 *   3  tool/env error
 *
 * Environment overrides (used by the focused test suite):
 *   - MDG_PREPUSH_REGEN_OVERRIDE: alternate regen script path
 *   - MDG_PREPUSH_ROOT: alternate project root (default: __dirname/../..)
 *   - MDG_PREPUSH_STAGE_TARGET: alternate git-stage path; used in
 *     MDG_PREPUSH_TEST_MODE=1 to stage by a path the test owns.
 *
 * Typical flow:
 *   1. An author adds a new .astro page under apps/maine-cannabis/src/pages/.
 *   2. Their pre-push gate runs `npm run data:regen:prepush`, which
 *      regenerates autoRelatedData.json and stages just that file.
 *   3. The pre-push verifier's autoRelated-freshness check (PR #97) now
 *      passes, because the data file mtime is current relative to the
 *      changed page.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = process.env.MDG_PREPUSH_ROOT || path.resolve(__dirname, '..', '..');
const DEFAULT_REGEN = path.join(ROOT, 'scripts/data/regen-auto-related.cjs');
const DATA_FILE = process.env.MDG_PREPUSH_STAGE_TARGET
  || path.join(ROOT, 'apps/maine-cannabis/src/data/autoRelatedData.json');

function regenScriptPath() {
  return process.env.MDG_PREPUSH_REGEN_OVERRIDE || DEFAULT_REGEN;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    check: args.includes('--check'),
  };
}

function spawnRegen(scriptPath, args, env) {
  return spawnSync('node', [scriptPath, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
    env: env || process.env,
    timeout: 120_000,
  });
}

function gitDiffCachedNameOnly(cwd) {
  const result = spawnSync('git', ['-C', cwd, 'diff', '--cached', '--name-only'], {
    encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return result.stdout.toString().trim();
}

function stageDataFile() {
  // Stage target: when override is set, the test owns the path,
  // so use it directly; otherwise, use the repo-relative path so the
  // project-root invariant holds under normal caller cwd.
  let stageTarget;
  if (process.env.MDG_PREPUSH_STAGE_TARGET) {
    stageTarget = DATA_FILE;
  } else {
    stageTarget = path.relative(ROOT, DATA_FILE);
  }
  const add = spawnSync('git', ['add', '--', stageTarget], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (add.status !== 0) {
    return { ok: false, error: (add.stderr || add.stdout || '').trim() };
  }
  return { ok: true };
}

function DATA_FILE_REL() {
  return path.relative(ROOT, DATA_FILE);
}

function main() {
  const args = parseArgs(process.argv);
  const scriptPath = regenScriptPath();

  if (!fs.existsSync(scriptPath)) {
    console.error(`prepush-data: regen script not found at ${scriptPath}`);
    process.exit(3);
  }

  if (args.check) {
    const result = spawnRegen(scriptPath, ['--check'], process.env);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status === null ? 3 : result.status);
  }

  if (args.dryRun) {
    const result = spawnRegen(scriptPath, ['--dry-run'], process.env);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status === null ? 3 : result.status);
  }

  // Default mode: regen + stage the data file only.
  const result = spawnRegen(scriptPath, [], process.env);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`prepush-data: regen failed (exit ${result.status}); NOT staging any file`);
    process.exit(2);
  }

  const stage = stageDataFile();
  if (!stage.ok) {
    console.error(`prepush-data: failed to stage ${DATA_FILE}: ${stage.error}`);
    process.exit(3);
  }

  process.exit(0);
}

if (require.main === module) main();
module.exports = { ROOT, DATA_FILE, DATA_FILE_REL, regenScriptPath, parseArgs };
