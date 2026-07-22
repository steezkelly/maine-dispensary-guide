'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { execFileSync } = require('node:child_process');
const { ensureWorktreeDependencies } = require('../mdg-worktree-bootstrap.cjs');

const repoRoot = path.resolve(__dirname, '../../..');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-worktree-bootstrap-'));
  const primary = path.join(root, 'primary');
  const worktree = path.join(root, 'worktree');
  const tsserver = path.join(primary, 'node_modules', 'typescript', 'lib', 'tsserver.js');
  fs.mkdirSync(path.dirname(tsserver), { recursive: true });
  fs.mkdirSync(worktree, { recursive: true });
  fs.writeFileSync(tsserver, '// fixture\n');
  return { root, primary, worktree };
}

test('links a new worktree to the primary dependency installation', () => {
  const { root, primary, worktree } = fixture();
  try {
    const result = ensureWorktreeDependencies({ cwd: worktree, primaryWorktree: primary });
    const target = path.join(worktree, 'node_modules', 'typescript');

    assert.equal(result.action, 'linked');
    assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(target), fs.realpathSync(path.join(primary, 'node_modules', 'typescript')));
    assert.equal(fs.existsSync(path.join(target, 'lib', 'tsserver.js')), true);
    assert.equal(fs.existsSync(path.join(worktree, 'node_modules', '@network')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('preserves existing local dependencies while adding TypeScript', () => {
  const { root, primary, worktree } = fixture();
  try {
    const target = path.join(worktree, 'node_modules');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'local-marker'), 'keep\n');

    const result = ensureWorktreeDependencies({ cwd: worktree, primaryWorktree: primary });

    assert.equal(result.action, 'linked');
    assert.equal(fs.lstatSync(target).isDirectory(), true);
    assert.equal(fs.readFileSync(path.join(target, 'local-marker'), 'utf8'), 'keep\n');
    assert.equal(fs.lstatSync(path.join(target, 'typescript')).isSymbolicLink(), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('does not create a link when the primary TypeScript installation is unavailable', () => {
  const { root, primary, worktree } = fixture();
  try {
    fs.rmSync(path.join(primary, 'node_modules'), { recursive: true, force: true });

    const result = ensureWorktreeDependencies({ cwd: worktree, primaryWorktree: primary });

    assert.equal(result.action, 'unavailable');
    assert.equal(fs.existsSync(path.join(worktree, 'node_modules')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('post-checkout automatically bootstraps dependencies for a newly added worktree', () => {
  const primary = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-worktree-hook-'));
  const linked = `${primary}-linked`;
  const git = (...args) => execFileSync('git', ['-C', primary, ...args], { encoding: 'utf8' });
  try {
    fs.mkdirSync(path.join(primary, '.githooks'), { recursive: true });
    fs.mkdirSync(path.join(primary, 'scripts', 'git'), { recursive: true });
    fs.mkdirSync(path.join(primary, 'node_modules', 'typescript', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, '.githooks', 'post-checkout'), path.join(primary, '.githooks', 'post-checkout'));
    fs.copyFileSync(
      path.join(repoRoot, 'scripts', 'git', 'mdg-worktree-bootstrap.cjs'),
      path.join(primary, 'scripts', 'git', 'mdg-worktree-bootstrap.cjs'),
    );
    fs.writeFileSync(path.join(primary, 'node_modules', 'typescript', 'lib', 'tsserver.js'), '// fixture\n');

    git('init', '--initial-branch=main');
    git('config', 'user.name', 'Test User');
    git('config', 'user.email', 'test@example.com');
    git('config', 'core.hooksPath', '.githooks');
    git('add', '.githooks/post-checkout', 'scripts/git/mdg-worktree-bootstrap.cjs');
    git('commit', '-m', 'fixture');
    git('worktree', 'add', '-b', 'linked', linked);

    assert.equal(fs.lstatSync(path.join(linked, 'node_modules')).isDirectory(), true);
    assert.equal(fs.lstatSync(path.join(linked, 'node_modules', 'typescript')).isSymbolicLink(), true);
    assert.equal(fs.existsSync(path.join(linked, 'node_modules', 'typescript', 'lib', 'tsserver.js')), true);
  } finally {
    try {
      git('worktree', 'remove', '--force', linked);
    } catch {
      // The worktree may not have been created if fixture setup failed.
    }
    fs.rmSync(primary, { recursive: true, force: true });
    fs.rmSync(linked, { recursive: true, force: true });
  }
});
