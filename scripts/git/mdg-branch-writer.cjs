'use strict';

/**
 * mdg-branch-writer.cjs — atomic single-writer ownership of active candidate
 * branches (OPS-06B-HARDEN-R1: atomic acquisition + per-acquisition identity +
 * live remote-head verification + workflow wiring).
 *
 * Design (fail-closed throughout):
 *   - writer_label: human-readable agent/session name (NOT an authenticator).
 *   - acquisition_id: a unique identity for ONE lock acquisition (crypto UUID by
 *     default, or a caller-supplied token validated for format). Ownership is
 *     authenticated by acquisition_id, never by writer_label alone.
 *   - Atomicity: acquisition holds an exclusive per-branch LOCK DIRECTORY
 *     (`mkdir` is atomic) across the read-check-write cycle, with a race-safe
 *     stale-lock reclamation procedure. The record itself is written with an
 *     exclusive `wx` temp file + rename.
 *   - Live remote-head verification: acquisition queries the live remote branch
 *     and fails before creating ownership when the head differs from the
 *     expected head (or when a new branch is expected absent but exists).
 *
 * Records live in the shared git-common directory `.git/mdg-branch-writers/`
 * (outside every worktree). The directory and records are owner-only (0700/0600).
 * Symlink/non-regular or malformed records fail closed.
 *
 * ENFORCEMENT SCOPE (honest): this is mechanically enforced WITHIN the canonical
 * repository workflow (author launch wrapper, task preflight, continuity
 * dispatch, candidate push boundary). It is manually bypassable through direct
 * external Hermes/Codex/Git commands, is NOT GitHub-wide enforcement, and is NOT
 * a security boundary against an actor deliberately deleting lock files.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

// --- stable error codes -----------------------------------------------------
const ERR = Object.freeze({
  HELD: 'BRANCH_WRITER_HELD',
  HEAD_CHANGED: 'BRANCH_HEAD_CHANGED',
  HEAD_EXPECTED_MISSING: 'BRANCH_HEAD_EXPECTED_MISSING',
  HEAD_ACTUAL_MISSING: 'BRANCH_HEAD_ACTUAL_MISSING',
  REMOTE_HEAD_UNDETERMINED: 'BRANCH_WRITER_REMOTE_HEAD_UNDETERMINED',
  RECORD_MALFORMED: 'BRANCH_WRITER_RECORD_MALFORMED',
  RECORD_NOT_REGULAR: 'BRANCH_WRITER_RECORD_NOT_REGULAR',
  TOKEN_INVALID: 'BRANCH_WRITER_TOKEN_INVALID',
  TTL_INVALID: 'BRANCH_WRITER_TTL_INVALID',
  ACQUISITION_MISMATCH: 'BRANCH_WRITER_ACQUISITION_MISMATCH',
  NOT_OWNER: 'BRANCH_WRITER_NOT_OWNER',
  LOCK_BUSY: 'BRANCH_WRITER_LOCK_BUSY',
});

const DEFAULT_TTL_MINUTES = 120;
const MAX_TTL_MINUTES = 10080; // 7 days — anything larger is unreasonable overflow.
const STALE_LOCK_MS = 5 * 60 * 1000; // a lock older than this with no live owner is reclaimable.
const TOKEN_RE = /^[A-Za-z0-9._-]{8,128}$/;

function defaultGit(repoDir, args) {
  return execFileSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function defaultNow() {
  return Date.now();
}

/** Shared git-common directory for branch-writer records (outside worktrees). */
function writerDirectory(root, git = defaultGit) {
  const commonDir = git(root, ['rev-parse', '--git-common-dir']);
  return path.resolve(root, commonDir, 'mdg-branch-writers');
}

function writerFilename(branch) {
  return `${Buffer.from(branch).toString('base64url')}.json`;
}

function lockDirFor(directory, branch) {
  return path.join(directory, `${Buffer.from(branch).toString('base64url')}.lock`);
}

// --- validation helpers (pure) ---------------------------------------------

/**
 * Validate an acquisition token. A caller-supplied token must be 8-128 chars of
 * [A-Za-z0-9._-]. Returns a canonical acquisition_id (generated UUID when none
 * supplied). Fails closed (BRANCH_WRITER_TOKEN_INVALID) on a bad supplied token.
 */
function resolveAcquisitionId(supplied) {
  if (supplied === undefined || supplied === null || supplied === '') {
    return crypto.randomUUID();
  }
  if (typeof supplied !== 'string' || !TOKEN_RE.test(supplied)) {
    throw new Error(`${ERR.TOKEN_INVALID}: acquisition_id must match ${TOKEN_RE}`);
  }
  return supplied;
}

/**
 * Validate a TTL in minutes. Must be a finite integer >= 1 and <= MAX_TTL_MINUTES.
 * Zero (prohibited), negative, NaN, infinity, fractional, and overflow fail closed.
 */
function validateTtlMinutes(ttlMinutes) {
  if (typeof ttlMinutes !== 'number' || !Number.isInteger(ttlMinutes)) {
    throw new Error(`${ERR.TTL_INVALID}: ttl must be an integer number of minutes`);
  }
  if (ttlMinutes < 1) {
    throw new Error(`${ERR.TTL_INVALID}: ttl must be >= 1 minute`);
  }
  if (ttlMinutes > MAX_TTL_MINUTES) {
    throw new Error(`${ERR.TTL_INVALID}: ttl must be <= ${MAX_TTL_MINUTES} minutes`);
  }
  return ttlMinutes;
}

/**
 * Validate a parsed ownership record's shape. Fails closed
 * (BRANCH_WRITER_RECORD_MALFORMED) on any missing/incorrectly-typed field.
 */
function assertValidRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(ERR.RECORD_MALFORMED);
  }
  const requiredStrings = ['branch', 'writer_label', 'acquisition_id', 'acquired_at', 'expires_at'];
  for (const key of requiredStrings) {
    if (typeof record[key] !== 'string' || !record[key]) throw new Error(ERR.RECORD_MALFORMED);
  }
  if (record.expected_remote_head !== null && typeof record.expected_remote_head !== 'string') {
    throw new Error(ERR.RECORD_MALFORMED);
  }
  if (record.worktree !== null && typeof record.worktree !== 'string') {
    throw new Error(ERR.RECORD_MALFORMED);
  }
  if (Number.isNaN(Date.parse(record.acquired_at)) || Number.isNaN(Date.parse(record.expires_at))) {
    throw new Error(ERR.RECORD_MALFORMED);
  }
  return record;
}

// --- record IO (fail-closed) ------------------------------------------------

/**
 * Read the ownership record for a branch. Returns null when absent. Fails closed
 * on a symlink/non-regular file (BRANCH_WRITER_RECORD_NOT_REGULAR) or malformed
 * JSON/shape (BRANCH_WRITER_RECORD_MALFORMED).
 */
function readWriter(root, branch, deps = {}) {
  const git = deps.git || defaultGit;
  const file = path.join(writerDirectory(root, git), writerFilename(branch));
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${ERR.RECORD_NOT_REGULAR}: ${file}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(ERR.RECORD_MALFORMED);
  }
  return assertValidRecord(parsed);
}

function writeRecordAtomic(directory, branch, record) {
  const file = path.join(directory, writerFilename(branch));
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  // Exclusive create: if a temp already exists (should not), fail closed.
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeSync(fd, `${JSON.stringify(record, null, 2)}\n`);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporary, file);
}

// --- exclusive lock (atomic mkdir + race-safe reclamation) ------------------

function lockAgeMs(lockDir, now) {
  try {
    return now - fs.statSync(lockDir).mtimeMs;
  } catch (error) {
    return null;
  }
}

/**
 * Acquire the exclusive per-branch lock directory. Atomic across processes via
 * `mkdir` (EEXIST => someone else holds it). A stale lock (older than
 * STALE_LOCK_MS) whose branch has NO live owner is reclaimed exactly once: the
 * reclaiming process removes the stale directory and retries the atomic mkdir,
 * so two simultaneous reclaimers cannot both succeed and stale-record cleanup
 * cannot delete a new owner (the live-owner check runs under the lock).
 */
function withBranchLock(directory, branch, now, ttlMs, callback) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  // Best-effort owner-only on the directory (mkdir mode is umask-masked).
  try { fs.chmodSync(directory, 0o700); } catch (error) { /* ignore */ }
  const lockDir = lockDirFor(directory, branch);

  const tryCreate = () => {
    try {
      fs.mkdirSync(lockDir);
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') return false;
      throw error;
    }
  };

  if (tryCreate()) {
    try {
      return callback();
    } finally {
      try { fs.rmdirSync(lockDir); } catch (error) { /* ignore */ }
    }
  }

  // Lock exists. Reclaim only if stale AND no live owner holds the branch.
  const age = lockAgeMs(lockDir, now);
  if (age !== null && age > STALE_LOCK_MS) {
    const recordFile = path.join(directory, writerFilename(branch));
    let liveOwner = false;
    if (fs.existsSync(recordFile)) {
      try {
        const rec = assertValidRecord(JSON.parse(fs.readFileSync(recordFile, 'utf8')));
        liveOwner = Date.parse(rec.expires_at) > now;
      } catch (error) {
        // Malformed record under a stale lock: treat as reclaimable (fail-closed
        // re-acquisition will rewrite it under the lock).
        liveOwner = false;
      }
    }
    if (!liveOwner) {
      try { fs.rmdirSync(lockDir); } catch (error) { /* someone reclaimed first */ }
      if (tryCreate()) {
        try {
          return callback();
        } finally {
          try { fs.rmdirSync(lockDir); } catch (error) { /* ignore */ }
        }
      }
    }
  }
  throw new Error(`${ERR.LOCK_BUSY}: ${branch} lock is busy; retry shortly`);
}

// --- remote-head verification (§5) -----------------------------------------

/**
 * Query the live remote branch head. Returns the SHA string, or null when the
 * branch is absent on the remote. Fails closed (BRANCH_WRITER_REMOTE_HEAD_
 * UNDETERMINED) when the remote state cannot be determined.
 */
function queryRemoteHead(root, branch, deps = {}) {
  const git = deps.git || defaultGit;
  let out;
  try {
    out = git(root, ['ls-remote', 'origin', `refs/heads/${branch}`]);
  } catch (error) {
    throw new Error(`${ERR.REMOTE_HEAD_UNDETERMINED}: ${error.message}`);
  }
  const first = String(out || '').trim().split(/\s+/)[0];
  return first || null;
}

/**
 * Verify the live remote head against an expectation BEFORE creating ownership.
 *   - expectedRemoteHead === 'absent': the branch must NOT exist on the remote.
 *   - expectedRemoteHead === '<sha>': the live head must equal it (case-insensitive).
 * Fails closed on mismatch, on an undetermined remote, or on a missing expectation.
 */
function verifyRemoteHead(root, branch, expectedRemoteHead, deps = {}) {
  if (typeof expectedRemoteHead !== 'string' || !expectedRemoteHead) {
    throw new Error(ERR.HEAD_EXPECTED_MISSING);
  }
  const actual = queryRemoteHead(root, branch, deps);
  if (expectedRemoteHead.toLowerCase() === 'absent') {
    if (actual !== null) {
      throw new Error(`${ERR.HEAD_CHANGED}: expected branch ${branch} absent on remote, found ${actual}`);
    }
    return { actual: null };
  }
  if (actual === null) {
    throw new Error(`${ERR.HEAD_ACTUAL_MISSING}: branch ${branch} not found on remote`);
  }
  if (actual.toLowerCase() !== expectedRemoteHead.trim().toLowerCase()) {
    throw new Error(`${ERR.HEAD_CHANGED}: expected ${expectedRemoteHead}, found ${actual}`);
  }
  return { actual };
}

/**
 * Pure remote-head equality check (used by the candidate push boundary). Fails
 * closed (BRANCH_HEAD_CHANGED) when the live head differs from the expected head.
 */
function assertRemoteHeadUnchanged(actualHead, expectedHead) {
  if (typeof expectedHead !== 'string' || !expectedHead) {
    throw new Error(ERR.HEAD_EXPECTED_MISSING);
  }
  if (typeof actualHead !== 'string' || !actualHead) {
    throw new Error(ERR.HEAD_ACTUAL_MISSING);
  }
  if (actualHead.trim().toLowerCase() !== expectedHead.trim().toLowerCase()) {
    throw new Error(`${ERR.HEAD_CHANGED}: expected ${expectedHead}, found ${actualHead}`);
  }
  return true;
}

// --- acquire / check / release / verify (§3, §4) ---------------------------

/**
 * Atomically acquire single-writer ownership of a branch.
 *
 * Identity rules:
 *   - same acquisition_id => idempotent reacquisition (returns the live record);
 *   - same writer_label but a DIFFERENT acquisition_id => conflicting writer
 *     (BRANCH_WRITER_HELD);
 *   - a different, non-expired owner => BRANCH_WRITER_HELD;
 *   - an expired owner => replaced (race-safe under the lock).
 *
 * Verifies the live remote head before creating ownership (unless skipped via
 * skipRemoteCheck for offline tests). Returns the record (with acquisition_id).
 */
function acquireWriter(root, opts = {}, deps = {}) {
  const git = deps.git || defaultGit;
  const now = (deps.now || defaultNow)();
  const branch = opts.branch;
  const writerLabel = opts.writer_label !== undefined ? opts.writer_label : opts.writer;
  if (!branch || typeof branch !== 'string') throw new Error('branch is required');
  if (!writerLabel || typeof writerLabel !== 'string') throw new Error('writer_label is required');

  const acquisitionId = resolveAcquisitionId(opts.acquisition_id);
  const ttlMinutes = validateTtlMinutes(
    opts.ttlMinutes === undefined ? DEFAULT_TTL_MINUTES : opts.ttlMinutes,
  );
  const expectedRemoteHead = opts.expected_remote_head !== undefined
    ? opts.expected_remote_head
    : opts.expectedHead;

  // §5: verify the live remote head BEFORE creating ownership.
  let verifiedHead = null;
  if (!opts.skipRemoteCheck) {
    if (expectedRemoteHead === undefined || expectedRemoteHead === null || expectedRemoteHead === '') {
      throw new Error(ERR.HEAD_EXPECTED_MISSING);
    }
    verifiedHead = verifyRemoteHead(root, branch, expectedRemoteHead, deps).actual;
  }

  const directory = writerDirectory(root, git);
  const worktree = opts.worktree !== undefined ? opts.worktree : null;

  return withBranchLock(directory, branch, now, ttlMinutes * 60 * 1000, () => {
    const existing = readWriter(root, branch, deps);
    if (existing) {
      const expired = Date.parse(existing.expires_at) <= now;
      if (!expired) {
        if (existing.acquisition_id === acquisitionId) {
          // Idempotent reacquisition by the exact same acquisition.
          return existing;
        }
        // Any other live owner (even the same writer_label) is a conflict.
        throw new Error(`${ERR.HELD}: ${branch} is owned by ${existing.writer_label} (acquisition ${existing.acquisition_id})`);
      }
      // Expired owner: fall through and replace (race-safe — we hold the lock).
    }
    const record = {
      branch,
      writer_label: writerLabel,
      acquisition_id: acquisitionId,
      worktree,
      expected_remote_head: expectedRemoteHead === undefined ? null : expectedRemoteHead,
      verified_remote_head: verifiedHead,
      acquired_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
    };
    writeRecordAtomic(directory, branch, record);
    return record;
  });
}

/**
 * Check sole-writer status for an acquisition. Requires the EXACT acquisition_id.
 * Returns { sole, owner_label, owner_acquisition_id, expired }.
 *   - no record / expired record => sole:true;
 *   - record with the same acquisition_id => sole:true;
 *   - record with a different acquisition_id (live) => sole:false.
 * A wrong acquisition_id against a live record is NOT sole.
 */
function assertSoleWriter(root, opts = {}, deps = {}) {
  const git = deps.git || defaultGit;
  const now = (deps.now || defaultNow)();
  const branch = opts.branch;
  const acquisitionId = opts.acquisition_id !== undefined ? opts.acquisition_id : opts.writer;
  const existing = readWriter(root, branch, { git });
  if (!existing) return { sole: true, owner_label: null, owner_acquisition_id: null, expired: false };
  const expired = Date.parse(existing.expires_at) <= now;
  if (expired) return { sole: true, owner_label: existing.writer_label, owner_acquisition_id: existing.acquisition_id, expired: true };
  if (existing.acquisition_id === acquisitionId) {
    return { sole: true, owner_label: existing.writer_label, owner_acquisition_id: existing.acquisition_id, expired: false };
  }
  return { sole: false, owner_label: existing.writer_label, owner_acquisition_id: existing.acquisition_id, expired: false };
}

/**
 * Release ownership. Requires the EXACT acquisition_id (one acquisition cannot
 * release another). Idempotent when no record exists. Fails closed
 * (BRANCH_WRITER_ACQUISITION_MISMATCH) when a different live acquisition owns it.
 */
function releaseWriter(root, opts = {}, deps = {}) {
  const git = deps.git || defaultGit;
  const now = (deps.now || defaultNow)();
  const branch = opts.branch;
  const acquisitionId = opts.acquisition_id !== undefined ? opts.acquisition_id : opts.writer;
  const directory = writerDirectory(root, git);
  return withBranchLock(directory, branch, now, DEFAULT_TTL_MINUTES * 60 * 1000, () => {
    const existing = readWriter(root, branch, { git });
    if (!existing) return false;
    const expired = Date.parse(existing.expires_at) <= now;
    if (!expired && existing.acquisition_id !== acquisitionId) {
      throw new Error(`${ERR.ACQUISITION_MISMATCH}: ${branch} is owned by acquisition ${existing.acquisition_id}`);
    }
    fs.rmSync(path.join(directory, writerFilename(branch)), { force: true });
    return true;
  });
}

/**
 * Renew/refresh an acquisition's expiry. Requires the EXACT acquisition_id.
 * Fails closed when a different acquisition owns the branch.
 */
function refreshWriter(root, opts = {}, deps = {}) {
  const git = deps.git || defaultGit;
  const now = (deps.now || defaultNow)();
  const branch = opts.branch;
  const acquisitionId = opts.acquisition_id;
  if (!acquisitionId) throw new Error(`${ERR.ACQUISITION_MISMATCH}: acquisition_id is required to refresh`);
  const ttlMinutes = validateTtlMinutes(opts.ttlMinutes === undefined ? DEFAULT_TTL_MINUTES : opts.ttlMinutes);
  const directory = writerDirectory(root, git);
  return withBranchLock(directory, branch, now, ttlMinutes * 60 * 1000, () => {
    const existing = readWriter(root, branch, { git });
    if (!existing || existing.acquisition_id !== acquisitionId) {
      throw new Error(`${ERR.ACQUISITION_MISMATCH}: ${branch} is not owned by acquisition ${acquisitionId}`);
    }
    const updated = { ...existing, expires_at: new Date(now + ttlMinutes * 60 * 1000).toISOString() };
    writeRecordAtomic(directory, branch, updated);
    return updated;
  });
}

/**
 * Candidate commit/push boundary check (§6.E). Proves, fail-closed:
 *   - the branch is owned by the exact acquisition_id (unexpired);
 *   - the worktree matches the recorded worktree (when recorded);
 *   - the live remote head equals the expected head (no drift).
 * Returns { ok: true, record } or throws a stable error code.
 */
function verifyPushBoundary(root, opts = {}, deps = {}) {
  const git = deps.git || defaultGit;
  const branch = opts.branch;
  const acquisitionId = opts.acquisition_id;
  if (!branch || !acquisitionId) throw new Error(`${ERR.ACQUISITION_MISMATCH}: branch and acquisition_id are required`);
  const status = assertSoleWriter(root, { branch, acquisition_id: acquisitionId }, deps);
  if (!status.sole) {
    throw new Error(`${ERR.NOT_OWNER}: ${branch} is owned by acquisition ${status.owner_acquisition_id}`);
  }
  if (status.expired || status.owner_acquisition_id === null) {
    throw new Error(`${ERR.NOT_OWNER}: no live ownership for ${branch} by acquisition ${acquisitionId}`);
  }
  const record = readWriter(root, branch, { git });
  if (opts.worktree !== undefined && record.worktree !== null && record.worktree !== opts.worktree) {
    throw new Error(`${ERR.NOT_OWNER}: worktree mismatch (recorded ${record.worktree}, got ${opts.worktree})`);
  }
  const expectedHead = opts.expected_remote_head !== undefined ? opts.expected_remote_head : record.expected_remote_head;
  if (expectedHead && expectedHead !== 'absent') {
    const actual = queryRemoteHead(root, branch, { git });
    assertRemoteHeadUnchanged(actual || '', expectedHead);
  }
  return { ok: true, record };
}

/**
 * Snapshot of all ownership records (for preflight / continuity). Reads every
 * record in the writer directory. Symlink/non-regular records fail closed
 * (BRANCH_WRITER_RECORD_NOT_REGULAR). Unparseable or old-schema records are
 * SKIPPED defensively (with a warning) so a stale/legacy artifact cannot wedge
 * the dispatch workflow; strict fail-closed validation still governs the
 * acquisition path (readWriter) and the dispatch decision (taskBlocker).
 * Returns an array of { branch, writer_label, acquisition_id, worktree, expired,
 * expected_remote_head, expires_at } evaluated at `now`.
 */
function snapshot(root, deps = {}) {
  const git = deps.git || defaultGit;
  const now = (deps.now || defaultNow)();
  const directory = writerDirectory(root, git);
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${ERR.RECORD_NOT_REGULAR}: ${file}`);
    let record;
    try {
      record = assertValidRecord(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (error) {
      // Defensive: skip unparseable/old-schema records (stale artifacts). The
      // strict acquisition path still fails closed on these under the lock.
      process.stderr.write(`branch-writer: skipping unreadable record ${file} (${error.message})\n`);
      continue;
    }
    out.push({
      branch: record.branch,
      writer_label: record.writer_label,
      acquisition_id: record.acquisition_id,
      worktree: record.worktree,
      expected_remote_head: record.expected_remote_head,
      expires_at: record.expires_at,
      expired: Date.parse(record.expires_at) <= now,
    });
  }
  return out;
}

/**
 * Determine whether a branch OR worktree is actively owned by another live
 * acquisition (auto-dispatch / preflight guard). `acquisition_id` (optional)
 * excludes the caller's own acquisition. Malformed state fails closed (throws).
 * Returns { owned: boolean, owner_label, owner_acquisition_id, branch }.
 */
function isActivelyOwned(root, { branch, worktree, acquisition_id } = {}, deps = {}) {
  const records = snapshot(root, deps);
  for (const rec of records) {
    if (rec.expired) continue;
    if (acquisition_id && rec.acquisition_id === acquisition_id) continue;
    const branchMatch = branch && rec.branch === branch;
    const worktreeMatch = worktree && rec.worktree && rec.worktree === worktree;
    if (branchMatch || worktreeMatch) {
      return { owned: true, owner_label: rec.writer_label, owner_acquisition_id: rec.acquisition_id, branch: rec.branch };
    }
  }
  return { owned: false, owner_label: null, owner_acquisition_id: null, branch: null };
}

/**
 * Determine whether a TASK is blocked from dispatch because its branch or
 * worktree is actively owned by another live acquisition (preflight + continuity
 * guard, §6.C/§6.D). Deterministic and testable: it consumes a writer-state
 * snapshot (array of records from `snapshot()`); malformed state fails closed
 * (throws). `acquisition_id` (optional) excludes the task's own acquisition.
 * Returns { owned, owner_label, owner_acquisition_id, branch } or null when the
 * task is not blocked.
 */
function taskBlocker(task, writerSnapshot, acquisition_id) {
  if (!task || typeof task !== 'object') return null;
  if (!Array.isArray(writerSnapshot)) throw new Error(ERR.RECORD_MALFORMED);
  const branch = typeof task.branch === 'string' ? task.branch : '';
  const worktree = typeof task.worktree === 'string' ? task.worktree : '';
  if (!branch && !worktree) return null;
  for (const rec of writerSnapshot) {
    if (!rec || typeof rec !== 'object') throw new Error(ERR.RECORD_MALFORMED);
    if (rec.expired) continue;
    if (acquisition_id && rec.acquisition_id === acquisition_id) continue;
    const branchMatch = branch && rec.branch === branch;
    const worktreeMatch = worktree && rec.worktree && rec.worktree === worktree;
    if (branchMatch || worktreeMatch) {
      return { owned: true, owner_label: rec.writer_label, owner_acquisition_id: rec.acquisition_id, branch: rec.branch };
    }
  }
  return null;
}

// --- CLI --------------------------------------------------------------------

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
  const valid = ['acquire', 'release', 'check', 'refresh', 'verify-push', 'snapshot'];
  if (!valid.includes(command)) {
    throw new Error(`usage: mdg-branch-writer.cjs <${valid.join('|')}> [options]`);
  }
  const root = process.cwd();
  const values = parseArguments(args);
  const branch = one(values, 'branch', { required: command !== 'snapshot' });
  const writerLabel = one(values, 'writer', { required: false });
  const acquisitionId = one(values, 'acquisition-id', { required: false });
  const expectedHead = one(values, 'expected-head', { required: false });
  const worktree = one(values, 'worktree', { required: false });
  const ttlRaw = one(values, 'ttl-minutes', { required: false });
  const ttlMinutes = ttlRaw === undefined ? undefined : Number(ttlRaw);

  if (command === 'acquire') {
    const record = acquireWriter(root, {
      branch,
      writer_label: writerLabel,
      acquisition_id: acquisitionId,
      expected_remote_head: expectedHead,
      worktree,
      ttlMinutes,
    });
    console.log(JSON.stringify({ ok: true, acquisition_id: record.acquisition_id, expires_at: record.expires_at }));
  } else if (command === 'release') {
    const released = releaseWriter(root, { branch, acquisition_id: acquisitionId, writer: writerLabel });
    console.log(JSON.stringify({ ok: true, released }));
  } else if (command === 'refresh') {
    const record = refreshWriter(root, { branch, acquisition_id: acquisitionId, ttlMinutes });
    console.log(JSON.stringify({ ok: true, expires_at: record.expires_at }));
  } else if (command === 'check') {
    const status = assertSoleWriter(root, { branch, acquisition_id: acquisitionId, writer: writerLabel });
    if (!status.sole) throw new Error(`${ERR.HELD}: ${branch} is owned by ${status.owner_label} (acquisition ${status.owner_acquisition_id})`);
    if (expectedHead && expectedHead !== 'absent') {
      const actual = queryRemoteHead(root, branch);
      assertRemoteHeadUnchanged(actual || '', expectedHead);
    }
    console.log(JSON.stringify({ ok: true, ...status }));
  } else if (command === 'verify-push') {
    const result = verifyPushBoundary(root, { branch, acquisition_id: acquisitionId, worktree, expected_remote_head: expectedHead });
    console.log(JSON.stringify(result));
  } else if (command === 'snapshot') {
    console.log(JSON.stringify(snapshot(root), null, 2));
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
  ERR,
  acquireWriter,
  releaseWriter,
  refreshWriter,
  assertSoleWriter,
  assertRemoteHeadUnchanged,
  verifyRemoteHead,
  verifyPushBoundary,
  queryRemoteHead,
  resolveAcquisitionId,
  validateTtlMinutes,
  assertValidRecord,
  readWriter,
  snapshot,
  isActivelyOwned,
  taskBlocker,
  writerFilename,
  writerDirectory,
  TOKEN_RE,
  MAX_TTL_MINUTES,
};
