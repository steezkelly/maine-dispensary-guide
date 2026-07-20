#!/usr/bin/env node
/**
 * install-hooks.cjs
 *
 * Sets core.hooksPath to .githooks/ so the pre-push hook ships
 * with the repo. Idempotent. Run on first clone (or whenever a
 * new teammate pulls).
 *
 * Usage:  node scripts/git/install-hooks.cjs
 */

const { execSync } = require('child_process');
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

const HOOKS_DIR = path.join(REPO_ROOT, '.githooks');
const PRE_PUSH = path.join(HOOKS_DIR, 'pre-push');

if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
    console.error('[install-hooks] not a git repo:', REPO_ROOT);
    process.exit(1);
}
if (!fs.existsSync(PRE_PUSH)) {
    console.error('[install-hooks] hook not found at', PRE_PUSH);
    process.exit(1);
}

// Ensure the hook is executable
try { fs.chmodSync(PRE_PUSH, 0o755); } catch {}

const current = (() => {
    try { return execSync('git config core.hooksPath', { cwd: REPO_ROOT, encoding: 'utf8' }).trim(); }
    catch { return ''; }
})();

if (current === '.githooks' || current === path.relative(REPO_ROOT, HOOKS_DIR)) {
    console.log('[install-hooks] core.hooksPath already set to .githooks ✓');
} else {
    execSync('git config core.hooksPath .githooks', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('[install-hooks] core.hooksPath set to .githooks ✓');
}

console.log('[install-hooks] Pre-push hook will run `node scripts/git/pre-push-verify.cjs` on every push.');
console.log('[install-hooks] If the hook fails, treat that as a verifier problem to fix: re-run `node scripts/git/install-hooks.cjs`, repair the verifier, or pull the latest main. Do not bypass with `git push --no-verify` — a fail-open bypass is exactly the failure mode this hook exists to prevent.');
