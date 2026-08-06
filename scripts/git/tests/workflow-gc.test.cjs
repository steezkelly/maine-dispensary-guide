#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const SCRIPT = path.resolve(__dirname, '..', 'workflow-gc.cjs');

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' });
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-workflow-gc-'));
  const bin = path.join(root, 'bin');
  const worktree = path.join(root, 'merged-worktree');
  fs.mkdirSync(bin);

  run('git', ['init', '-b', 'main'], root);
  run('git', ['config', 'user.name', 'Workflow GC test'], root);
  run('git', ['config', 'user.email', 'workflow-gc@example.test'], root);
  fs.writeFileSync(path.join(root, 'README.md'), 'fixture\n');
  run('git', ['add', 'README.md'], root);
  run('git', ['commit', '-m', 'fixture'], root);
  run('git', ['branch', 'feature/merged'], root);
  run('git', ['worktree', 'add', worktree, 'feature/merged'], root);
  fs.writeFileSync(path.join(worktree, 'merged-pr-change.txt'), 'squash-merged in GitHub, not in this fixture\n');
  run('git', ['add', 'merged-pr-change.txt'], worktree);
  run('git', ['commit', '-m', 'fixture branch-only change'], worktree);

  const gh = path.join(bin, 'gh');
  const headRefOid = run('git', ['rev-parse', 'feature/merged'], root).trim();
  fs.writeFileSync(
    gh,
    `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify([{headRefName: "feature/merged", headRefOid: "${headRefOid}", mergedAt: "2026-01-01T00:00:00Z"}]));\n`,
    { mode: 0o755 },
  );

  return { root, worktree, bin, gh };
}

function makeReusedBranchFixture() {
  const fixture = makeFixture();
  const worktree = path.join(fixture.root, 'reused-live-worktree');
  const oldMergedHead = run('git', ['rev-parse', 'main'], fixture.root).trim();
  run('git', ['branch', 'feature/reused', oldMergedHead], fixture.root);
  run('git', ['worktree', 'add', worktree, 'feature/reused'], fixture.root);
  fs.writeFileSync(path.join(worktree, 'new-live-work.txt'), 'this branch reuses an old merged PR name\n');
  run('git', ['add', 'new-live-work.txt'], worktree);
  run('git', ['commit', '-m', 'new unmerged branch reusing a PR name'], worktree);
  fs.writeFileSync(
    fixture.gh,
    `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify([{headRefName: "feature/reused", headRefOid: "${oldMergedHead}", mergedAt: "2026-01-01T00:00:00Z"}]));\n`,
    { mode: 0o755 },
  );
  return { ...fixture, worktree };
}

function runGc(fixture, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fixture.bin}${path.delimiter}${process.env.PATH}` },
  });
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('dry-run identifies an old clean worktree on a merged pull-request branch without deleting it', () => {
  const fixture = makeFixture();
  try {
    const result = runGc(fixture, ['--dry-run', '--older-than-days', '0']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /would remove worktree .*merged-worktree.*feature\/merged/);
    assert.match(result.stdout, /worktrees: 1 candidate/);
    assert.equal(fs.existsSync(fixture.worktree), true);
  } finally {
    cleanup(fixture.root);
  }
});

test('execute never removes a dirty worktree, even when its branch is merged', () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(path.join(fixture.worktree, 'WIP.txt'), 'do not remove\n');
    const result = runGc(fixture, ['--execute', '--older-than-days', '0']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /skipped dirty worktree .*merged-worktree/);
    assert.equal(fs.existsSync(fixture.worktree), true);
    assert.equal(fs.existsSync(path.join(fixture.worktree, 'WIP.txt')), true);
  } finally {
    cleanup(fixture.root);
  }
});

test('execute preserves a clean unmerged worktree when its branch name was reused by an old merged PR', () => {
  const fixture = makeReusedBranchFixture();
  try {
    const result = runGc(fixture, ['--execute', '--older-than-days', '0']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /skipped worktree .*reused-live-worktree.*does not match merged pull-request head/);
    assert.equal(fs.existsSync(fixture.worktree), true);
    assert.equal(fs.existsSync(path.join(fixture.worktree, 'new-live-work.txt')), true);
  } finally {
    cleanup(fixture.root);
  }
});

test('execute requires --force-merged before deleting a merged branch whose ancestry cannot be proven', () => {
  const fixture = makeFixture();
  try {
    run('git', ['worktree', 'remove', fixture.worktree], fixture.root);
    const result = runGc(fixture, ['--execute', '--older-than-days', '0']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /skipped merged branch feature\/merged .*--force-merged/);
    assert.equal(run('git', ['branch', '--list', 'feature/merged'], fixture.root).trim(), 'feature/merged');
  } finally {
    cleanup(fixture.root);
  }
});

test('CI executes the workflow-gc regression suite', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /node --test scripts\/git\/tests\/workflow-gc\.test\.cjs/);
});
