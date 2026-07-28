#!/usr/bin/env node
'use strict';

/**
 * Concurrency + workflow-integration tests for mdg-branch-writer.cjs
 * (OPS-06B-HARDEN-R1 §7). These exercise the REAL commands and workflow
 * boundaries — not just pure helpers:
 *   1. two real child processes synchronize at a barrier and attempt acquisition:
 *      exactly one exits with ownership;
 *   2. same writer_label, different acquisition_id: exactly one owns the branch;
 *   3. canonical author launch refuses to start a fake Codex when another owner
 *      holds the branch;
 *   4. canonical author launch acquires, runs the fake author, releases on exit;
 *   5. canonical author launch releases/leaves a recoverable record after failure;
 *   6. task preflight rejects another active acquisition;
 *   7. continuity does not dispatch a ready task whose branch is actively owned;
 *   8. push/candidate-boundary check rejects missing/wrong/expired acquisition and
 *      remote-head drift;
 *   9. author→handoff→coordinator transfer succeeds using different acquisition IDs;
 *  10. repo-wide wiring test proves the mechanism is invoked from the canonical
 *      launch and candidate-boundary paths.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync, spawnSync, spawn } = require('node:child_process');

const WRITER = require('../mdg-branch-writer.cjs');
const { launchAuthor } = require('../../agent/mdg-author-launch.cjs');
const { evaluateTaskPreflight } = require('../../agent/mdg-task-preflight.cjs');
const { nextAction } = require('../../agent/mdg-continuity-check.cjs');

const CHILD = path.join(__dirname, 'fixtures', 'bw-acquire-child.cjs');

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-bw-int-'));
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'test\n');
  git(['add', 'README.md']);
  git(['commit', '-q', '-m', 'init']);
  return dir;
}

function gitStub(head) {
  return (repoDir, args) => {
    if (args[0] === 'rev-parse' && args[1] === '--git-common-dir') return '.git';
    if (args[0] === 'ls-remote') return head === null ? '' : `${head}\trefs/heads/x`;
    throw new Error(`unexpected git args: ${args.join(' ')}`);
  };
}

// A fake author "executable": a node script that records it ran and exits with a
// configurable code. Returns the path to the script.
function makeFakeAuthor(exitCode, markerPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-fake-author-'));
  const script = path.join(dir, 'fake-author.cjs');
  fs.writeFileSync(script, `#!/usr/bin/env node
require('fs').writeFileSync(${JSON.stringify(markerPath)}, 'ran:' + (process.env.MDG_BRANCH_WRITER_ACQUISITION_ID || 'none'));
process.exit(${exitCode});
`);
  return script;
}

// --- §7.1 + §7.2: real-process atomic acquisition --------------------------

test('§7.1 two real child processes: exactly one acquires ownership', async () => {
  const repo = makeTempRepo();
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-bw-barrier-'));
  try {
    const branch = 'feat/race';
    const head = 'abc123';
    const barrierDir = path.join(scratch, 'barrier');
    fs.mkdirSync(barrierDir, { recursive: true });
    const N = 2;
    const results = [];
    // Spawn all children CONCURRENTLY so they can synchronize at the barrier.
    const childPromises = [];
    for (let i = 0; i < N; i += 1) {
      const resultFile = path.join(scratch, `result-${i}.json`);
      results.push(resultFile);
      childPromises.push(new Promise((resolve) => {
        const child = spawn(process.execPath, [CHILD], {
          env: {
            ...process.env,
            BW_REPO: repo,
            BW_BRANCH: branch,
            BW_HEAD: head,
            BW_TOKEN: `acq-child-${i}`,
            BW_RESULT: resultFile,
            BW_BARRIER: barrierDir,
            BW_ID: String(i),
            BW_N: String(N),
            BW_TTL: '60',
          },
        });
        child.on('close', (code) => resolve({ i, code }));
      }));
    }
    const exits = await Promise.all(childPromises);
    for (const e of exits) assert.equal(e.code, 0, `child ${e.i} exited ${e.code}`);
    const outcomes = results.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    const winners = outcomes.filter((o) => o.ok);
    const losers = outcomes.filter((o) => !o.ok);
    assert.equal(winners.length, 1, `exactly one winner, got ${JSON.stringify(outcomes)}`);
    assert.equal(losers.length, 1);
    // The loser failed with a stable conflict/busy code (not a crash).
    assert.match(losers[0].code, /BRANCH_WRITER_HELD|BRANCH_WRITER_LOCK_BUSY/);
    // The branch record exists and is owned by exactly the winner.
    const rec = WRITER.readWriter(repo, branch, { git: gitStub(head) });
    assert.equal(rec.acquisition_id, winners[0].token);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('§7.2 same writer_label, different acquisition_id: exactly one owns', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/same-label';
    const git = gitStub('abc123');
    WRITER.acquireWriter(repo, { branch, writer_label: 'shared-agent', acquisition_id: 'acq-first-1', expected_remote_head: 'abc123' }, { git });
    // Same label, different acquisition_id => conflict (not silently overwritten).
    assert.throws(
      () => WRITER.acquireWriter(repo, { branch, writer_label: 'shared-agent', acquisition_id: 'acq-second-2', expected_remote_head: 'abc123' }, { git }),
      /BRANCH_WRITER_HELD/,
    );
    // The original owner is intact (not overwritten).
    const rec = WRITER.readWriter(repo, branch, { git });
    assert.equal(rec.acquisition_id, 'acq-first-1');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// --- §7.3 / §7.4 / §7.5: canonical author launch ---------------------------

test('§7.3 author launch refuses to start fake Codex when another owner holds the branch', () => {
  const repo = makeTempRepo();
  const marker = path.join(os.tmpdir(), `mdg-author-marker-${process.pid}-${Date.now()}.txt`);
  try {
    const branch = 'feat/author-blocked';
    const git = gitStub('abc123');
    // Another owner holds the branch.
    WRITER.acquireWriter(repo, { branch, writer_label: 'other-agent', acquisition_id: 'acq-other-1', expected_remote_head: 'abc123' }, { git });
    const fakeAuthor = makeFakeAuthor(0, marker);
    assert.throws(
      () => launchAuthor({
        repoRoot: repo,
        contract: { branch, worktree: repo, writer_label: 'my-agent', acquisition_id: 'acq-mine-99', expected_remote_head: 'abc123' },
        authorBin: process.execPath,
        authorArgs: [fakeAuthor],
        git,
      }),
      /BRANCH_WRITER_HELD/,
    );
    // The fake author must NOT have run.
    assert.equal(fs.existsSync(marker), false, 'fake author must not launch when acquisition fails');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(marker, { force: true });
  }
});

test('§7.4 author launch acquires, runs fake author, releases on normal exit', () => {
  const repo = makeTempRepo();
  const marker = path.join(os.tmpdir(), `mdg-author-marker-${process.pid}-${Date.now()}-ok.txt`);
  try {
    const branch = 'feat/author-ok';
    const git = gitStub('abc123');
    const fakeAuthor = makeFakeAuthor(0, marker);
    const result = launchAuthor({
      repoRoot: repo,
      contract: { branch, worktree: repo, writer_label: 'my-agent', acquisition_id: 'acq-launch-1', expected_remote_head: 'abc123' },
      authorBin: process.execPath,
      authorArgs: [fakeAuthor],
      git,
    });
    // The fake author ran with the acquisition_id in its env.
    assert.equal(fs.existsSync(marker), true);
    assert.match(fs.readFileSync(marker, 'utf8'), /^ran:acq-launch-1$/);
    assert.equal(result.author.status, 0);
    // Ownership was released after exit.
    assert.equal(result.released, true);
    assert.equal(WRITER.readWriter(repo, branch, { git }), null);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(marker, { force: true });
  }
});

test('§7.5 author launch releases after author failure (recoverable record)', () => {
  const repo = makeTempRepo();
  const marker = path.join(os.tmpdir(), `mdg-author-marker-${process.pid}-${Date.now()}-fail.txt`);
  try {
    const branch = 'feat/author-fail';
    const git = gitStub('abc123');
    const fakeAuthor = makeFakeAuthor(3, marker); // author exits non-zero
    const result = launchAuthor({
      repoRoot: repo,
      contract: { branch, worktree: repo, writer_label: 'my-agent', acquisition_id: 'acq-fail-77', expected_remote_head: 'abc123' },
      authorBin: process.execPath,
      authorArgs: [fakeAuthor],
      git,
    });
    assert.equal(result.author.status, 3);
    // Even after failure, ownership is released (no stranded lock).
    assert.equal(result.released, true);
    assert.equal(WRITER.readWriter(repo, branch, { git }), null);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(marker, { force: true });
  }
});

// --- §7.6: task preflight rejects another active acquisition ---------------

test('§7.6 task preflight blocks a task whose branch is actively owned', () => {
  const writerSnapshot = [
    { branch: 'feat/owned', worktree: '/tmp/wt-owned', writer_label: 'other', acquisition_id: 'acq-other-1', expired: false, expected_remote_head: 'abc', expires_at: '2999-01-01T00:00:00Z' },
  ];
  const contract = { branch: 'feat/owned', worktree: '/tmp/wt-owned', allowed_paths: [], base_sha: 'abc' };
  const result = evaluateTaskPreflight({ contract, leases: [], originMain: 'abc', candidateBase: 'abc', boardState: {}, writerSnapshot });
  assert.equal(result.verdict, 'blocked');
  assert.ok(result.blockers.some((b) => b.code === 'BRANCH_WRITER_HELD'));
  // A task on an unowned branch is not blocked by the writer guard.
  const free = evaluateTaskPreflight({ contract: { branch: 'feat/free', allowed_paths: [], base_sha: 'abc' }, leases: [], originMain: 'abc', candidateBase: 'abc', boardState: {}, writerSnapshot });
  assert.ok(!free.blockers.some((b) => b.code === 'BRANCH_WRITER_HELD'));
});

test('§7.6 task preflight fails closed on malformed writer state', () => {
  assert.throws(
    () => evaluateTaskPreflight({ contract: { branch: 'feat/x', base_sha: 'abc' }, leases: [], originMain: 'abc', candidateBase: 'abc', boardState: {}, writerSnapshot: 'not-an-array' }),
    /BRANCH_WRITER_RECORD_MALFORMED/,
  );
});

// --- §7.7: continuity does not dispatch an actively-owned ready task -------

test('§7.7 continuity skips a ready task whose branch is actively owned', () => {
  const tasks = [
    { id: 't-owned', status: 'ready', branch: 'feat/owned' },
    { id: 't-free', status: 'ready', branch: 'feat/free' },
  ];
  const writerSnapshot = [
    { branch: 'feat/owned', worktree: null, writer_label: 'other', acquisition_id: 'acq-other-1', expired: false, expected_remote_head: 'abc', expires_at: '2999-01-01T00:00:00Z' },
  ];
  const decision = nextAction(tasks, new Date(), writerSnapshot);
  assert.equal(decision.kind, 'dispatch');
  // The owned task must NOT be selected; the free task is.
  assert.equal(decision.taskId, 't-free');
  // If ONLY the owned task is ready, nothing is dispatchable.
  const onlyOwned = nextAction([{ id: 't-owned', status: 'ready', branch: 'feat/owned' }], new Date(), writerSnapshot);
  assert.notEqual(onlyOwned.kind, 'dispatch');
});

// --- §7.8: push/candidate-boundary check -----------------------------------

test('§7.8 push boundary rejects missing/wrong/expired acquisition and drift', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/push';
    const git = gitStub('abc123');
    // Missing acquisition (no record).
    assert.throws(() => WRITER.verifyPushBoundary(repo, { branch, acquisition_id: 'acq-ghost-1' }, { git }), /BRANCH_WRITER_NOT_OWNER/);
    // Acquire, then wrong acquisition.
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent', acquisition_id: 'acq-right-1', expected_remote_head: 'abc123' }, { git });
    assert.throws(() => WRITER.verifyPushBoundary(repo, { branch, acquisition_id: 'acq-wrong-2' }, { git }), /BRANCH_WRITER_NOT_OWNER/);
    // Correct acquisition + matching head passes.
    assert.equal(WRITER.verifyPushBoundary(repo, { branch, acquisition_id: 'acq-right-1', expected_remote_head: 'abc123' }, { git }).ok, true);
    // Remote-head drift fails closed.
    const drifted = gitStub('zzz999');
    assert.throws(() => WRITER.verifyPushBoundary(repo, { branch, acquisition_id: 'acq-right-1', expected_remote_head: 'abc123' }, { git: drifted }), /BRANCH_HEAD_CHANGED/);
    // Expired acquisition fails closed.
    const t0 = 1_000_000_000_000;
    WRITER.releaseWriter(repo, { branch, acquisition_id: 'acq-right-1' }, { git });
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent', acquisition_id: 'acq-exp-3', expected_remote_head: 'abc123', ttlMinutes: 1 }, { git, now: () => t0 });
    assert.throws(() => WRITER.verifyPushBoundary(repo, { branch, acquisition_id: 'acq-exp-3' }, { git, now: () => t0 + 2 * 60 * 1000 }), /BRANCH_WRITER_NOT_OWNER/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// --- §7.9: author→handoff→coordinator transfer -----------------------------

test('§7.9 author releases, coordinator acquires with a different acquisition_id', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/handoff';
    const git = gitStub('abc123');
    // Author acquires.
    WRITER.acquireWriter(repo, { branch, writer_label: 'author', acquisition_id: 'acq-author-1', expected_remote_head: 'abc123' }, { git });
    // Author releases after the unstaged-diff handoff.
    assert.equal(WRITER.releaseWriter(repo, { branch, acquisition_id: 'acq-author-1' }, { git }), true);
    // Coordinator acquires before candidate commit/push with its OWN token.
    const coord = WRITER.acquireWriter(repo, { branch, writer_label: 'coordinator', acquisition_id: 'acq-coord-9', expected_remote_head: 'abc123' }, { git });
    assert.equal(coord.acquisition_id, 'acq-coord-9');
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-coord-9' }, { git }).sole, true);
    // The author's old token no longer owns the branch.
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-author-1' }, { git }).sole, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// --- §7.10: repo-wide wiring reference test --------------------------------

test('§7.10 branch-writer mechanism is wired into canonical launch + push boundary', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  // Canonical author launch requires/acquires the branch writer.
  const launch = read('scripts/agent/mdg-author-launch.cjs');
  assert.match(launch, /mdg-branch-writer\.cjs/);
  assert.match(launch, /acquireWriter/);
  assert.match(launch, /releaseWriter/);
  // Candidate push boundary consults the writer state (scoped by env token).
  const prePush = read('scripts/git/pre-push-verify.cjs');
  assert.match(prePush, /MDG_BRANCH_WRITER_ACQUISITION_ID/);
  assert.match(prePush, /verifyPushBoundary/);
  // Task preflight + continuity consult the writer snapshot.
  assert.match(read('scripts/agent/mdg-task-preflight.cjs'), /taskBlocker/);
  assert.match(read('scripts/agent/mdg-continuity-check.cjs'), /taskBlocker/);
  // Package scripts expose the canonical commands.
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['workflow:branch-writer'], /mdg-branch-writer\.cjs/);
  assert.match(pkg.scripts['agents:author-launch'], /mdg-author-launch\.cjs/);
});
