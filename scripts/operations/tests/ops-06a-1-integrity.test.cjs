#!/usr/bin/env node
'use strict';

/** OPS-06A-1 CLI contract tests. Core gate scenarios live in ops-06a-integrity.test.cjs. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '../integrity/cli.cjs');

function git(repo, ...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-integrity-cli-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Integrity CLI Test');
  git(repo, 'config', 'user.email', 'integrity-cli@example.test');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-m', 'base');
  return repo;
}

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('worktree-status exits zero for a clean integration worktree', () => {
  const repo = makeRepo();
  const result = run('worktree-status', '--repo', repo);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { clean: true, problems: [] });
});

test('worktree-status exits nonzero and reports untracked files', () => {
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'dirty.txt'), 'dirty\n');
  const result = run('worktree-status', '--repo', repo);
  assert.equal(result.status, 1);
  const status = JSON.parse(result.stdout);
  assert.equal(status.clean, false);
  assert.ok(status.problems.some((problem) => problem.includes('dirty.txt')));
});

test('verify fails closed when independent base, head, checks, or evidence inputs are missing', () => {
  const result = run('verify');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /verify requires --checks|verify requires --evidence/);
});
