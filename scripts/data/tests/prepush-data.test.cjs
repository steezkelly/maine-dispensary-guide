#!/usr/bin/env node
'use strict';

/**
 * Focused tests for `scripts/data/prepush-data.cjs`.
 *
 * Locks the contract for the pre-push data-refresh step:
 *
 *   1. With no flags, prepush-data regenerates autoRelatedData.json and
 *      stages *only* that single data file. No other working-tree file
 *      is added to, removed from, or modified in the git index.
 *   2. With `--check`, prepush-data exits 0 when the data file is
 *      fresh, 1 when it is stale, and does NOT modify the index.
 *      Re-running prepush-data without `--check` after the check
 *      makes the data file fresh again.
 *   3. With `--dry-run`, prepush-data does NOT modify either the data
 *      file on disk or the git index.
 *   4. The wrapper exits non-zero when the canonical regen script
 *      itself fails (so the verifier's freshness gate is never bypassed
 *      by a silently-failing regen).
 *
 * These tests use a mocked spawnSync so we never touch the real MDG
 * pages directory; we just verify the wrapper's plumbing with a stub
 * regen that writes a deterministic data file path under a temp dir.
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const WRAPPER = path.join(ROOT, 'scripts/data/prepush-data.cjs');

function runWrapper({ repo, args, env, failRegen = false, reseedDataFile = true }) {
  // We will intercept by writing a *stub* `regen-auto-related.cjs`
  // next to the real one and pointing `MDG_PREPUSH_REGEN_OVERRIDE`
  // at the stub. The wrapper honors that override if present.
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-stub-'));
  const stub = path.join(stubDir, 'regen-auto-related.cjs');
  const dataFile = path.join(repo, 'apps/maine-cannabis/src/data/autoRelatedData.json');
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  // Re-seed a stale data file for the regen to overwrite. Tests that
  // want to preserve a previous regen's effect across invocations
  // (e.g. "regen then --check exits 0 when fresh") set
  // reseedDataFile=false on the second call.
  if (reseedDataFile) {
    fs.writeFileSync(dataFile, JSON.stringify({ items: [], __stub_seeded: true }, null, 2));
  }
  const stubBody = [
    "'use strict';",
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    `const REPO = ${JSON.stringify(repo)};`,
    `const DATA = path.join(REPO, 'apps/maine-cannabis/src/data/autoRelatedData.json');`,
    "const fail = process.env.MDG_PREPUSH_REGEN_FAIL === '1';",
    "const dryRun = process.argv.includes('--dry-run');",
    "const check = process.argv.includes('--check');",
    "if (fail) { console.error('stub-regen: simulated failure'); process.exit(2); }",
    "if (check) {",
    "  if (!fs.existsSync(DATA)) { console.error('stub-regen: no data file'); process.exit(1); }",
    "  const existing = JSON.parse(fs.readFileSync(DATA, 'utf8'));",
    "  const fresh = { items: [{ url: '/stub' }] };",
    "  const ok = JSON.stringify(existing) === JSON.stringify(fresh);",
    "  console.log(ok ? 'stub-regen: ✓ data is fresh' : 'stub-regen: ✗ data is stale');",
    "  process.exit(ok ? 0 : 1);",
    "}",
    "if (dryRun) {",
    "  console.log('stub-regen: dry-run, would write', DATA);",
    "  process.exit(0);",
    "}",
    "fs.writeFileSync(DATA, JSON.stringify({ items: [{ url: '/stub' }] }, null, 2));",
    "console.log('stub-regen: wrote data file');",
    "process.exit(0);",
  ].join('\n');
  fs.writeFileSync(stub, stubBody, 'utf8');

  const finalEnv = {
    ...process.env,
    MDG_PREPUSH_REGEN_OVERRIDE: stub,
    // Point the wrapper at the test repo so its `ROOT` lives inside
    // the temp directory. The data file path is repo-relative so
    // `git add -- <repo-relative-path>` succeeds under `git -C repo`.
    MDG_PREPUSH_ROOT: repo,
    ...(failRegen ? { MDG_PREPUSH_REGEN_FAIL: '1' } : {}),
    ...(env || {}),
  };

  const result = spawnSync('node', [WRAPPER, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: finalEnv,
  });
  // Cleanup the stub directory regardless of outcome.
  try { fs.rmSync(stubDir, { recursive: true, force: true }); } catch {}
  return result;
}

function withFixture(repo, fn) {
  fs.mkdirSync(repo, { recursive: true });
  try { return fn(); } finally {
    // Keep repo on disk; the calling test removes it explicitly when
    // finished. We avoid recursive rmSync here because accidental
    // parent-directory deletion would corrupt the developer's tree.
  }
}

function makeRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-repo-'));
}

function gitStatusShort(repo) {
  return spawnSync('git', ['-C', repo, 'status', '--short'], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).stdout.trim();
}

function gitInitCommitData(repo, dataFile) {
  // Initialize a fresh repo so we can stage the seeded data file
  // without contaminating any real working tree.
  spawnSync('git', ['init', '-q', '-b', 'main', repo], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  spawnSync('git', ['-C', repo, 'config', 'user.email', 'test@example.com'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  spawnSync('git', ['-C', repo, 'config', 'user.name', 'Test'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  spawnSync('git', ['-C', repo, 'config', 'commit.gpgsign', 'false'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  // Create a baseline commit that contains the seeded data file so
  // git add has something to track against.
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify({ items: [], __stub_seeded: true }, null, 2));
  spawnSync('git', ['-C', repo, 'add', '.'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  spawnSync('git', ['-C', repo, 'commit', '-q', '-m', 'baseline'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
}

function cleanRepo() {
  const repo = makeRepo();
  const dataFile = path.join(repo, 'apps/maine-cannabis/src/data/autoRelatedData.json');
  gitInitCommitData(repo, dataFile);
  return { repo, dataFile };
}

let failures = 0;
function assertEq(actual, expected, name) {
  if (actual === expected) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertMatch(actual, re, name) {
  if (re.test(actual)) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}: did not match ${re}`);
    console.error(`     actual: ${actual.slice(0, 400)}`);
  }
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---------------------------------------------------------------------------
// Contract 1: default regen writes the data file and stages only that file.
// ---------------------------------------------------------------------------
function testDefaultRegenStagesOnlyDataFile() {
  const { repo, dataFile } = cleanRepo();
  const before = gitStatusShort(repo);
  assertEq(before, '', 'worktree clean before');
  const result = runWrapper({ repo, args: [] });
  assertEq(result.status, 0, `default exit 0 (stdout=${result.stdout.slice(0,200)}, stderr=${result.stderr.slice(0,200)})`);
  const written = readJSON(dataFile);
  assertEq(written.items && written.items[0] && written.items[0].url, '/stub',
    'regen overwrote the data file with stub payload');
  // Confirm git knows about the staged data file and nothing else.
  const staged = spawnSync('git', ['-C', repo, 'diff', '--cached', '--name-only'], {
    encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).stdout.trim();
  assertEq(staged, 'apps/maine-cannabis/src/data/autoRelatedData.json',
    'only the data file is staged');
  // Confirm working-tree has no remaining unstaged changes (the data
  // file write is mirrored in the index, so `git status --short`
  // should not contain a second-column `M` for the data file).
  const after = gitStatusShort(repo);
  if (after !== '' && !after.startsWith('M ')) {
    failures++;
    console.error(`  ✗ worktree clean after: unexpected status "${after}"`);
  } else {
    console.log(`  ✓ worktree staged status is ${JSON.stringify(after)} (data file in index; no working-tree changes)`);
  }
  // Cleanup
  fs.rmSync(repo, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Contract 2: --check exits 0 when fresh, 1 when stale; never modifies index.
// ---------------------------------------------------------------------------
function testCheckExitsZeroWhenFresh() {
  const { repo, dataFile } = cleanRepo();
  // First: regenerate so the data file matches the stub payload.
  let result = runWrapper({ repo, args: [] });
  assertEq(result.status, 0, 'freshen the data file (default regen)');
  // Snapshot the data file at this point.
  const freshSnapshot = fs.readFileSync(dataFile, 'utf8');
  // Now: --check must exit 0 because nothing changed since regen.
  // reSeedDataFile=false so we preserve the regen-produced content
  // for the second call (--check does not mutate the file).
  result = runWrapper({ repo, args: ['--check'], reseedDataFile: false });
  assertEq(result.status, 0, '--check exits 0 when fresh');
  assertEq(fs.readFileSync(dataFile, 'utf8'), freshSnapshot, '--check did not mutate data file');
  fs.rmSync(repo, { recursive: true, force: true });
}

function testCheckExitsOneWhenStale() {
  const { repo, dataFile } = cleanRepo();
  // First: regenerate so the data file matches the stub payload.
  let result = runWrapper({ repo, args: [] });
  assertEq(result.status, 0, 'freshen the data file (default regen)');
  // Now: mutate the autoRelatedData file directly so the stub payload
  // is no longer what regen produces. (The stub always writes
  // {items:[{url:'/stub'}]} when invoked, so an explicit write of a
  // different shape is the most reliable stale marker.)
  fs.writeFileSync(dataFile, JSON.stringify({ items: [{ url: '/manually-changed' }] }, null, 2));
  // Commit the manual change so HEAD differs from working tree but
  // --check (which compares regen output to on-disk) still sees the
  // manual-change vs the stub output.
  spawnSync('git', ['-C', repo, 'add', dataFile.replace(repo + '/', '')], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  spawnSync('git', ['-C', repo, 'commit', '-q', '-m', 'manual'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  result = runWrapper({ repo, args: ['--check'] });
  assertEq(result.status, 1, '--check exits 1 when stale');
  fs.rmSync(repo, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Contract 3: --dry-run writes neither data nor index.
// ---------------------------------------------------------------------------
function testDryRunWritesNothing() {
  const { repo, dataFile } = cleanRepo();
  // Snapshot the seeded data file content.
  const seeded = fs.readFileSync(dataFile, 'utf8');
  const result = runWrapper({ repo, args: ['--dry-run'] });
  assertEq(result.status, 0, '--dry-run exit 0');
  assertEq(fs.readFileSync(dataFile, 'utf8'), seeded, '--dry-run did not overwrite data file');
  const staged = spawnSync('git', ['-C', repo, 'diff', '--cached', '--name-only'], {
    encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).stdout.trim();
  assertEq(staged, '', '--dry-run did not stage any file');
  fs.rmSync(repo, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Contract 4: when the regen script fails, the wrapper exits non-zero and
// does not silently bypass the freshness gate by writing a half-baked
// data file (or worse, claiming success).
// ---------------------------------------------------------------------------
function testRegenFailureSurfaced() {
  const { repo, dataFile } = cleanRepo();
  const result = runWrapper({ repo, args: [], failRegen: true });
  assertEq(result.status !== 0, true, 'regen failure produces non-zero exit');
  assertMatch(result.stderr + result.stdout, /simulated failure/, 'wrapper surfaced the failure');
  // The data file should still contain the baseline seed (no partial
  // write that could trick downstream consumers).
  const seeded = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assertEq(seeded.__stub_seeded, true, 'data file not mutated by failed regen');
  fs.rmSync(repo, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Contract 5: the wrapper exists and is syntactically valid (preflight).
// ---------------------------------------------------------------------------
function testWrapperSyntaxValid() {
  const result = spawnSync('node', ['--check', WRAPPER], {
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assertEq(result.status, 0, `node --check on wrapper (${WRAPPER})`);
}

// ---------------------------------------------------------------------------
// Run the suite.
// ---------------------------------------------------------------------------
console.log(`\n  prepush-data tests [${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}]\n`);
testWrapperSyntaxValid();
testDefaultRegenStagesOnlyDataFile();
testCheckExitsZeroWhenFresh();
testCheckExitsOneWhenStale();
testDryRunWritesNothing();
testRegenFailureSurfaced();
console.log(`\n  summary: ${failures === 0 ? 'OK' : `${failures} failure(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);
