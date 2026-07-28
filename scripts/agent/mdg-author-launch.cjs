#!/usr/bin/env node
'use strict';

/**
 * mdg-author-launch.cjs — canonical author-launch wrapper (OPS-06B-HARDEN-R1 §6.B).
 *
 * Replaces the bare `codex --yolo exec ...` launch procedure with a guarded
 * wrapper that:
 *   1. reads the validated task contract;
 *   2. resolves branch and worktree;
 *   3. atomically acquires branch ownership (unique acquisition_id);
 *   4. validates the expected live remote head (fails before launch on drift);
 *   5. launches the bounded author in the declared worktree;
 *   6. releases ownership in a controlled finally/closeout path;
 *   7. FAILS WITHOUT LAUNCHING the author when acquisition fails.
 *
 * A direct `codex --yolo exec ...` command is NONCANONICAL debugging guidance
 * only — it is not the normal author path and bypasses this guard.
 *
 * ENFORCEMENT SCOPE (honest): mechanically enforced within this canonical
 * workflow; manually bypassable through direct external Hermes/Codex/Git
 * commands; NOT GitHub-wide enforcement; NOT a security boundary against an
 * actor deliberately deleting lock files.
 *
 * The author executable is injectable via MDG_AUTHOR_BIN (default: codex) so the
 * workflow can be tested with a fake author without launching the real Codex.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const WRITER = require(path.resolve(__dirname, '../git/mdg-branch-writer.cjs'));

function fail(code, message) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  throw err;
}

function readContract(contractPath) {
  let raw;
  try {
    raw = fs.readFileSync(contractPath, 'utf8');
  } catch (error) {
    fail('CONTRACT_UNREADABLE', `cannot read task contract ${contractPath}`);
  }
  let contract;
  try {
    contract = JSON.parse(raw);
  } catch (error) {
    fail('CONTRACT_MALFORMED', `invalid JSON in task contract: ${error.message}`);
  }
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    fail('CONTRACT_MALFORMED', 'task contract must be an object');
  }
  return contract;
}

/**
 * Launch the bounded author under branch-writer ownership.
 *
 * @param {object} opts
 * @param {string} opts.repoRoot      repository root (git-common dir host)
 * @param {object} opts.contract      validated task contract { branch, worktree,
 *                                    expected_remote_head, writer_label, ttl_minutes }
 * @param {string[]} [opts.authorArgs] args passed to the author executable
 * @param {string} [opts.authorBin]   author executable (default MDG_AUTHOR_BIN || codex)
 * @param {Function} [opts.spawn]     injectable spawnSync (for tests)
 * @param {Function} [opts.now]       injectable clock (for tests)
 * @returns {{ acquired: object, author: object, released: boolean }}
 */
function launchAuthor(opts) {
  const repoRoot = opts.repoRoot;
  const contract = opts.contract;
  const spawn = opts.spawn || spawnSync;
  const now = opts.now;
  const git = opts.git; // optional injectable git runner (for tests)
  const authorBin = opts.authorBin || process.env.MDG_AUTHOR_BIN || 'codex';

  const branch = contract.branch;
  const worktree = contract.worktree || null;
  const writerLabel = contract.writer_label || 'author';
  const expectedRemoteHead = contract.expected_remote_head;
  const ttlMinutes = contract.ttl_minutes === undefined ? 120 : contract.ttl_minutes;
  // A unique acquisition identity for THIS launch (caller may supply one).
  const acquisitionId = contract.acquisition_id || crypto.randomUUID();

  if (!branch || typeof branch !== 'string') fail('CONTRACT_MALFORMED', 'contract.branch is required');
  if (expectedRemoteHead === undefined || expectedRemoteHead === null || expectedRemoteHead === '') {
    fail('CONTRACT_MALFORMED', 'contract.expected_remote_head is required (use "absent" for a new branch)');
  }

  // Steps 3+4: atomically acquire ownership AND validate the live remote head.
  // If acquisition fails (another owner, head drift, malformed state), we throw
  // BEFORE launching the author.
  const acquired = WRITER.acquireWriter(repoRoot, {
    branch,
    writer_label: writerLabel,
    acquisition_id: acquisitionId,
    worktree,
    expected_remote_head: expectedRemoteHead,
    ttlMinutes,
  }, { now, git });

  // Step 5+6: launch the author, then ALWAYS release in a finally path.
  let author;
  let released = false;
  try {
    author = spawn(authorBin, opts.authorArgs || [], {
      cwd: worktree || repoRoot,
      stdio: 'inherit',
      env: { ...process.env, MDG_BRANCH_WRITER_ACQUISITION_ID: acquisitionId, MDG_BRANCH_WRITER_BRANCH: branch },
    });
  } finally {
    // Step 6: controlled release. A crashed/failed author still releases so the
    // record does not strand the branch (recoverable expired-or-released state).
    try {
      released = WRITER.releaseWriter(repoRoot, { branch, acquisition_id: acquisitionId }, { now, git });
    } catch (error) {
      // Release failure is reported but does not mask the author result.
      released = false;
    }
  }

  return { acquired, author, released, acquisition_id: acquisitionId };
}

function parseArguments(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      // Positional args after `--` are author args.
      if (arg === '--') {
        args.set('authorArgs', argv.slice(i + 1));
        break;
      }
      throw new Error(`unexpected argument: ${arg}`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${arg}`);
    args.set(arg.slice(2), value);
    i += 1;
  }
  return args;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const contractPath = args.get('contract');
  if (!contractPath) fail('MISSING_INPUT', 'required argument: --contract');
  const repoRoot = args.get('repo') || process.cwd();
  const contract = readContract(path.isAbsolute(contractPath) ? contractPath : path.resolve(repoRoot, contractPath));
  const result = launchAuthor({
    repoRoot,
    contract,
    authorArgs: args.get('authorArgs') || [],
  });
  const status = result.author && typeof result.author.status === 'number' ? result.author.status : 1;
  console.error(`author-launch: acquired=${result.acquired.acquisition_id} released=${result.released} author-exit=${status}`);
  process.exitCode = status;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(String(error && error.message ? error.message : error));
    process.exit(1);
  }
}

module.exports = { launchAuthor, readContract };
