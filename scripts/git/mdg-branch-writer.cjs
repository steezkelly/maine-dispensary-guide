'use strict';

/**
 * mdg-branch-writer.cjs — single-writer ownership of active candidate branches
 * (t_76934df3 / OPS-06B-P1 branch-writer hardening).
 *
 * Records ONE active writer per branch, independently from the mainline
 * integration reservation. Provides:
 *   - pre-edit / pre-commit remote-head equality checks (fail before authoring
 *     when the remote branch head changed unexpectedly);
 *   - detection of another process claiming the same branch;
 *   - blocking auto-dispatch into an actively-owned candidate branch.
 *
 * Ownership records live in the shared git-common directory
 * `.git/mdg-branch-writers/<branch>.json` (outside every worktree), mirroring
 * the worktree-lease pattern. The pure helpers (assertRemoteHeadUnchanged,
 * assertSoleWriter) are exported for direct testing.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function defaultGit(repoDir, args) {
  return execFileSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

/** Shared git-common directory for branch-writer records (outside worktrees). */
function writerDirectory(root) {
  const commonDir = defaultGit(root, ['rev-parse', '--git-common-dir']);
  return path.resolve(root, commonDir, 'mdg-branch-writers');
}

function writerFilename(branch) {
  return `${Buffer.from(branch).toString('base64url')}.json`;
}

function readWriter(root, branch) {
  const file = path.join(writerDirectory(root), writerFilename(branch));
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`branch-writer entry must be a regular file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Claim single-writer ownership of a branch. Fails closed (BRANCH_WRITER_HELD)
 * if a different, non-expired writer already owns the branch.
 */
function acquireWriter(root, { branch, writer, expectedHead, ttlMinutes = 120 }) {
  if (!branch || !writer) throw new Error('branch and writer are required');
  const directory = writerDirectory(root);
  fs.mkdirSync(directory, { recursive: true });
  const existing = readWriter(root, branch);
  const now = Date.now();
  if (existing && existing.writer !== writer && Date.parse(existing.expiresAt) > now) {
    throw new Error(`BRANCH_WRITER_HELD: ${branch} is owned by ${existing.writer}`);
  }
  const record = {
    branch,
    writer,
    expectedHead: expectedHead || null,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
  };
  const file = path.join(directory, writerFilename(branch));
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
  return record;
}

/** Release single-writer ownership of a branch (idempotent). */
function releaseWriter(root, { branch, writer }) {
  const existing = readWriter(root, branch);
  if (!existing) return false;
  if (writer && existing.writer !== writer) {
    throw new Error(`BRANCH_WRITER_HELD: ${branch} is owned by ${existing.writer}`);
  }
  fs.rmSync(path.join(writerDirectory(root), writerFilename(branch)), { force: true });
  return true;
}

/**
 * Pre-edit / pre-commit remote-head equality check. Fails closed
 * (BRANCH_HEAD_CHANGED) when the live remote head differs from the expected
 * head — i.e. another process pushed to the branch since authoring began.
 * @returns {true} when the remote head equals the expected head
 */
function assertRemoteHeadUnchanged(actualHead, expectedHead) {
  if (typeof expectedHead !== 'string' || !expectedHead) {
    throw new Error('BRANCH_HEAD_EXPECTED_MISSING');
  }
  if (typeof actualHead !== 'string' || !actualHead) {
    throw new Error('BRANCH_HEAD_ACTUAL_MISSING');
  }
  if (actualHead.trim().toLowerCase() !== expectedHead.trim().toLowerCase()) {
    throw new Error(`BRANCH_HEAD_CHANGED: expected ${expectedHead}, found ${actualHead}`);
  }
  return true;
}

/**
 * Detect whether another writer currently owns the branch (auto-dispatch guard).
 * Returns { sole: boolean, owner: string|null, expired: boolean }.
 */
function assertSoleWriter(root, { branch, writer }) {
  const existing = readWriter(root, branch);
  if (!existing) return { sole: true, owner: null, expired: false };
  const expired = Date.parse(existing.expiresAt) <= Date.now();
  if (expired) return { sole: true, owner: existing.writer, expired: true };
  if (existing.writer === writer) return { sole: true, owner: existing.writer, expired: false };
  return { sole: false, owner: existing.writer, expired: false };
}

function parseArguments(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${argument}`);
    const key = argument.slice(2);
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(value);
    index += 1;
  }
  return values;
}

function one(values, key, { required = true } = {}) {
  const matches = values.get(key) || [];
  if (!matches.length && !required) return undefined;
  if (matches.length !== 1) throw new Error(`${key} must be provided exactly once`);
  return matches[0];
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!['acquire', 'release', 'check'].includes(command)) {
    throw new Error('usage: mdg-branch-writer.cjs <acquire|release|check> [options]');
  }
  const root = process.cwd();
  const values = parseArguments(args);
  const branch = one(values, 'branch');
  const writer = one(values, 'writer');
  if (command === 'acquire') {
    const record = acquireWriter(root, {
      branch,
      writer,
      expectedHead: one(values, 'expected-head', { required: false }),
      ttlMinutes: Number(one(values, 'ttl-minutes', { required: false }) || 120),
    });
    console.log(`acquired branch-writer ownership of ${branch} by ${writer} (expires ${record.expiresAt})`);
  } else if (command === 'release') {
    const released = releaseWriter(root, { branch, writer });
    console.log(released ? `released branch-writer ownership of ${branch}` : `no ownership record for ${branch}`);
  } else {
    const expectedHead = one(values, 'expected-head', { required: false });
    const sole = assertSoleWriter(root, { branch, writer });
    if (!sole.sole) throw new Error(`BRANCH_WRITER_HELD: ${branch} is owned by ${sole.owner}`);
    if (expectedHead) {
      const actualHead = defaultGit(root, ['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s+/)[0] || '';
      assertRemoteHeadUnchanged(actualHead, expectedHead);
    }
    console.log(`OK: ${writer} is the sole writer of ${branch}${expectedHead ? ' and remote head is unchanged' : ''}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(String(error && error.message ? error.message : error));
    process.exit(1);
  }
}

module.exports = {
  acquireWriter,
  releaseWriter,
  assertRemoteHeadUnchanged,
  assertSoleWriter,
  readWriter,
  writerFilename,
};
