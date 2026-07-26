#!/usr/bin/env node
/**
 * install-hooks.cjs
 *
 * Installs the repository pre-push hook into Git's untracked hooks directory.
 * This avoids executing hook code from the checked-out branch. Idempotent. Run on first clone (or whenever a
 * new teammate pulls).
 *
 * Usage:  node scripts/git/install-hooks.cjs
 */

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = (() => {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
})();

const VERSIONED_PRE_PUSH = path.join(REPO_ROOT, '.githooks', 'pre-push');

if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
    console.error('[install-hooks] not a git repo:', REPO_ROOT);
    process.exit(1);
}
if (!fs.existsSync(VERSIONED_PRE_PUSH)) {
    console.error('[install-hooks] hook not found at', VERSIONED_PRE_PUSH);
    process.exit(1);
}

const gitCommonDir = execSync('git rev-parse --git-common-dir', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
const HOOKS_DIR = path.resolve(REPO_ROOT, gitCommonDir, 'hooks');
const PRE_PUSH = path.join(HOOKS_DIR, 'pre-push');
fs.mkdirSync(HOOKS_DIR, { recursive: true });
fs.copyFileSync(VERSIONED_PRE_PUSH, PRE_PUSH);
try { fs.chmodSync(PRE_PUSH, 0o755); } catch {}

const current = (() => {
    try { return execSync('git config core.hooksPath', { cwd: REPO_ROOT, encoding: 'utf8' }).trim(); }
    catch { return ''; }
})();

if (current === HOOKS_DIR) {
    console.log(`[install-hooks] core.hooksPath already set to ${HOOKS_DIR} ✓`);
} else {
    execFileSync('git', ['config', 'core.hooksPath', HOOKS_DIR], { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log(`[install-hooks] core.hooksPath set to ${HOOKS_DIR} ✓`);
}

console.log('[install-hooks] Pre-push hook will run `node scripts/git/pre-push-verify.cjs` on every push.');
console.log('[install-hooks] If the hook fails, treat that as a verifier problem to fix: re-run `node scripts/git/install-hooks.cjs`, repair the verifier, or pull the latest main. Do not bypass the hook — a fail-open path is exactly the failure mode this hook exists to prevent.');
