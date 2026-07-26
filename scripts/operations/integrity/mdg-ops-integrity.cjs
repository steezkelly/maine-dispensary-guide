'use strict';

/**
 * Deterministic verified-candidate integrity gate (OPS-06A-1).
 *
 * The verifier captures an unstaged author worktree, including explicitly
 * authorized untracked files. After the coordinator creates the candidate
 * commit, bindAcceptedCandidate proves that the commit has exactly the captured
 * path/status/content manifest. The integrator later re-runs verifyCandidate.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const EVIDENCE_SCHEMA = 'mdg-ops-candidate-evidence-v1';

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function canonPath(value) {
  return String(value).replace(/\\/g, '/');
}

function canonicalizePaths(values) {
  const normalized = values.map(canonPath);
  for (const candidate of normalized) {
    if (!candidate || candidate.startsWith('/') || candidate === '..' || candidate.startsWith('../')) {
      throw new Error(`path must be repository-relative: ${JSON.stringify(candidate)}`);
    }
  }
  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) throw new Error('duplicate path after canonical normalization');
  return unique.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
}

function sortForCanonicalJson(value) {
  if (Array.isArray(value)) return value.map(sortForCanonicalJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)))
      .map((key) => [key, sortForCanonicalJson(value[key])]),
  );
}

function canonicalJson(value) {
  return `${JSON.stringify(sortForCanonicalJson(value))}\n`;
}

function git(repoDir, args, { encoding = 'utf8' } = {}) {
  return execFileSync('git', args, {
    cwd: repoDir,
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
}

function gitText(repoDir, args) {
  return git(repoDir, args).replace(/\n$/, '');
}

function resolveSha(repoDir, ref) {
  return gitText(repoDir, ['rev-parse', '--verify', `${ref}^{commit}`]);
}

/**
 * Parse `git diff --raw -z` output, capturing the Git mode AND status for each
 * changed path (OPS-06A-R1 finding E). Binding mode/type detects chmod
 * (100644 -> 100755) and regular-file/symlink type changes (100644 -> 120000)
 * that do not alter file content but DO alter the committed tree.
 *
 * Raw -z format: ":<oldMode> <newMode> <oldSha> <newSha> <status>\0<path>\0"
 * (two paths for renames/copies, which are disabled via --no-renames).
 */
function parseRawDiff(raw) {
  if (!raw.length) return [];
  const fields = raw.split('\0');
  if (fields.at(-1) === '') fields.pop();
  if (fields.length % 2 !== 0) throw new Error('unexpected git --raw output');
  const entries = [];
  for (let index = 0; index < fields.length; index += 2) {
    const meta = fields[index];
    const changedPath = canonPath(fields[index + 1]);
    // meta = ":<oldMode> <newMode> <oldSha> <newSha> <status>"
    const match = meta.match(/^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])(\d*)$/);
    if (!match) throw new Error(`unexpected git --raw record: ${meta}`);
    const oldMode = match[1];
    const newMode = match[2];
    let status = match[3];
    if (!['A', 'M', 'D', 'T'].includes(status)) {
      throw new Error(`unsupported changed-path status: ${status}`);
    }
    if (status === 'T') status = 'M';
    // Bind the effective mode: new mode for A/M/T, old mode for D (the content
    // digest is null for deletions, but the mode is still part of the tree).
    const mode = status === 'D' ? oldMode : newMode;
    entries.push({ status, path: changedPath, mode });
  }
  return entries;
}

function readWorktreeBlob(repoDir, relativePath) {
  const absolute = path.resolve(repoDir, relativePath);
  const relative = path.relative(path.resolve(repoDir), absolute);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`path escapes repository: ${relativePath}`);
  }
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return Buffer.from(fs.readlinkSync(absolute));
  if (!stat.isFile()) throw new Error(`changed path is not a regular file or symlink: ${relativePath}`);
  return fs.readFileSync(absolute);
}

/**
 * Compute the Git object mode for a worktree path: 120000 for symlinks,
 * 100755 for executable regular files, 100644 otherwise (OPS-06A-R1 finding E).
 */
function worktreeGitMode(repoDir, relativePath) {
  const absolute = path.resolve(repoDir, relativePath);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return '120000';
  if (!stat.isFile()) throw new Error(`changed path is not a regular file or symlink: ${relativePath}`);
  return (stat.mode & 0o111) !== 0 ? '100755' : '100644';
}

function buildSnapshot(baseSha, candidateSha, entries, readBlob, authorizedUntrackedPaths = []) {
  const entryByPath = new Map();
  for (const entry of entries) {
    const normalized = canonPath(entry.path);
    if (entryByPath.has(normalized)) throw new Error(`duplicate changed path: ${normalized}`);
    entryByPath.set(normalized, { status: entry.status, path: normalized, mode: entry.mode ?? null });
  }
  const changedPaths = canonicalizePaths([...entryByPath.keys()]);
  const fileSha256 = {};
  const gitMode = {};
  const canonicalEntries = [];
  for (const changedPath of changedPaths) {
    const entry = entryByPath.get(changedPath);
    const digest = entry.status === 'D' ? null : sha256Hex(readBlob(changedPath));
    if (digest !== null) fileSha256[changedPath] = digest;
    gitMode[changedPath] = entry.mode;
    // Bind path, status, mode, AND content digest into the canonical entry so
    // canonical_diff_sha256 covers Git mode/type changes (chmod, file<->symlink)
    // that do not alter content (OPS-06A-R1 finding E).
    canonicalEntries.push({ path: changedPath, status: entry.status, mode: entry.mode ?? null, sha256: digest });
  }
  const canonicalDiffSha256 = sha256Hex(canonicalJson(canonicalEntries));
  const authorizedSet = new Set(canonicalizePaths(authorizedUntrackedPaths));
  const authorizedUntrackedSha256 = {};
  for (const changedPath of changedPaths) {
    if (authorizedSet.has(changedPath)) authorizedUntrackedSha256[changedPath] = fileSha256[changedPath];
  }
  return {
    base_sha: baseSha,
    candidate_sha: candidateSha,
    changed_paths: changedPaths,
    canonical_diff_sha256: canonicalDiffSha256,
    file_sha256: fileSha256,
    git_mode: gitMode,
    authorized_untracked_sha256: authorizedUntrackedSha256,
  };
}

function computeCommitManifest(repoDir, base, candidate, authorizedUntrackedPaths = []) {
  const baseSha = resolveSha(repoDir, base);
  const candidateSha = resolveSha(repoDir, candidate);
  const entries = parseRawDiff(git(repoDir, [
    'diff', '--raw', '-z', '--no-renames', '--no-abbrev', `${baseSha}..${candidateSha}`, '--',
  ]));
  return buildSnapshot(
    baseSha,
    candidateSha,
    entries,
    (changedPath) => git(repoDir, ['show', `${candidateSha}:${changedPath}`], { encoding: null }),
    authorizedUntrackedPaths,
  );
}

function computeWorktreeManifest(repoDir, base, authorizedUntrackedPaths = []) {
  const baseSha = resolveSha(repoDir, base);
  const authorized = canonicalizePaths(authorizedUntrackedPaths);
  const authorizedSet = new Set(authorized);
  const trackedEntries = parseRawDiff(git(repoDir, [
    'diff', '--raw', '-z', '--no-renames', '--no-abbrev', baseSha, '--',
  ]));
  const untracked = canonicalizePaths(
    git(repoDir, ['ls-files', '--others', '--exclude-standard', '-z'])
      .split('\0')
      .filter(Boolean),
  );
  const unauthorized = untracked.filter((changedPath) => !authorizedSet.has(changedPath));
  if (unauthorized.length) throw new Error(`unauthorized untracked file(s): ${unauthorized.join(', ')}`);
  const absentAuthorized = authorized.filter((changedPath) => !untracked.includes(changedPath));
  if (absentAuthorized.length) throw new Error(`authorized untracked file(s) not present as untracked: ${absentAuthorized.join(', ')}`);
  // Untracked files are additions; capture their worktree Git mode (100644 /
  // 100755 / 120000) so the manifest binds mode/type for new files too.
  const untrackedEntries = untracked.map((changedPath) => ({
    status: 'A',
    path: changedPath,
    mode: worktreeGitMode(repoDir, changedPath),
  }));
  const entries = [...trackedEntries, ...untrackedEntries];
  return buildSnapshot(
    baseSha,
    null,
    entries,
    (changedPath) => readWorktreeBlob(repoDir, changedPath),
    authorized,
  );
}

function sealEvidence(body) {
  const withoutDigest = { ...body };
  delete withoutDigest.evidence_sha256;
  return { ...withoutDigest, evidence_sha256: sha256Hex(canonicalJson(withoutDigest)) };
}

function evidenceSelfConsistent(evidence) {
  if (!evidence || typeof evidence !== 'object' || typeof evidence.evidence_sha256 !== 'string') return false;
  return sealEvidence(evidence).evidence_sha256 === evidence.evidence_sha256;
}

function captureEvidence(repoDir, verifier, { base, authorizedUntrackedPaths = [] }) {
  if (!verifier || typeof verifier !== 'object') throw new Error('verifier evidence is required');
  if (!verifier.task_id) throw new Error('task_id is required');
  if (!Array.isArray(verifier.acceptance_commands)) throw new Error('acceptance_commands must be an array');
  if (!verifier.verification_timestamp || Number.isNaN(Date.parse(verifier.verification_timestamp))) {
    throw new Error('verification_timestamp must be an ISO-compatible timestamp');
  }
  if (!verifier.verifier_outcome) throw new Error('verifier_outcome is required');

  const manifest = computeWorktreeManifest(repoDir, base, authorizedUntrackedPaths);
  return sealEvidence({
    schema: EVIDENCE_SCHEMA,
    task_id: verifier.task_id,
    base_sha: manifest.base_sha,
    accepted_candidate_sha: null,
    changed_paths: manifest.changed_paths,
    canonical_diff_sha256: manifest.canonical_diff_sha256,
    file_sha256: manifest.file_sha256,
    git_mode: manifest.git_mode,
    authorized_untracked_sha256: manifest.authorized_untracked_sha256,
    acceptance_commands: verifier.acceptance_commands,
    verification_timestamp: verifier.verification_timestamp,
    verifier_outcome: verifier.verifier_outcome,
  });
}

function manifestMismatchReasons(evidence, manifest) {
  const reasons = [];
  const expectedPaths = Array.isArray(evidence.changed_paths) ? evidence.changed_paths : [];
  const actualPaths = manifest.changed_paths;
  const expectedSet = new Set(expectedPaths);
  const actualSet = new Set(actualPaths);
  const omitted = expectedPaths.filter((changedPath) => !actualSet.has(changedPath));
  const added = actualPaths.filter((changedPath) => !expectedSet.has(changedPath));
  if (omitted.length) reasons.push(`expected file(s) omitted: ${omitted.join(', ')}`);
  if (added.length) reasons.push(`unexpected additional file(s): ${added.join(', ')}`);
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)) {
    reasons.push('changed-path manifest differs or is not in canonical order');
  }
  if (manifest.canonical_diff_sha256 !== evidence.canonical_diff_sha256) {
    reasons.push(`canonical diff hash ${manifest.canonical_diff_sha256} != recorded ${evidence.canonical_diff_sha256}`);
  }
  for (const changedPath of expectedPaths) {
    const expectedDigest = evidence.file_sha256?.[changedPath];
    const actualDigest = manifest.file_sha256[changedPath];
    if (expectedDigest !== actualDigest) {
      reasons.push(`${changedPath} changed after verification (${expectedDigest ?? 'deleted'} -> ${actualDigest ?? 'deleted'})`);
    }
    // Explicit per-file Git mode/type comparison (OPS-06A-R1 finding E). The
    // canonical diff hash also binds mode, but this yields a precise reason.
    const expectedMode = evidence.git_mode?.[changedPath] ?? null;
    const actualMode = manifest.git_mode?.[changedPath] ?? null;
    if (expectedMode !== actualMode) {
      reasons.push(`${changedPath} mode/type changed after verification (${expectedMode ?? 'none'} -> ${actualMode ?? 'none'})`);
    }
  }
  return reasons;
}

function bindAcceptedCandidate(repoDir, evidence, candidateRef) {
  if (!evidenceSelfConsistent(evidence)) throw new Error('evidence document is not self-consistent');
  if (evidence.verifier_outcome !== 'PASS') throw new Error('cannot bind candidate without verifier PASS');
  if (evidence.acceptance_commands.some((entry) => !Number.isInteger(entry.exit_code) || entry.exit_code !== 0)) {
    throw new Error('cannot bind candidate with missing or non-zero acceptance command exit code');
  }
  if (evidence.accepted_candidate_sha !== null) throw new Error('evidence is already bound to a candidate');
  const manifest = computeCommitManifest(
    repoDir,
    evidence.base_sha,
    candidateRef,
    Object.keys(evidence.authorized_untracked_sha256 || {}),
  );
  const reasons = manifestMismatchReasons(evidence, manifest);
  if (reasons.length) throw new Error(`candidate does not match verifier evidence: ${reasons.join('; ')}`);
  return sealEvidence({ ...evidence, accepted_candidate_sha: manifest.candidate_sha });
}

function worktreeStatus(repoDir) {
  const porcelain = gitText(repoDir, ['status', '--porcelain', '--untracked-files=all']);
  const problems = porcelain.split('\n').filter(Boolean);
  return { clean: problems.length === 0, problems };
}

function verifyRequiredChecks(requiredChecks) {
  if (!Array.isArray(requiredChecks)) return ['required check evidence is missing'];
  const reasons = [];
  const pending = requiredChecks.filter((check) => String(check.status).toLowerCase() !== 'completed');
  const failing = requiredChecks.filter((check) => (
    String(check.status).toLowerCase() === 'completed'
    && String(check.conclusion).toLowerCase() !== 'success'
  ));
  if (pending.length) reasons.push(`required checks pending: ${pending.map((check) => check.name).join(', ')}`);
  if (failing.length) reasons.push(`required checks failing: ${failing.map((check) => check.name).join(', ')}`);
  return reasons;
}

function verifyCandidate(repoDir, evidence, candidateRef, options = {}) {
  const reasons = [];
  if (!evidenceSelfConsistent(evidence)) reasons.push('evidence document is not self-consistent (evidence_sha256 mismatch)');
  if (evidence?.schema !== EVIDENCE_SCHEMA) reasons.push(`unsupported evidence schema: ${evidence?.schema}`);
  if (evidence?.verifier_outcome !== 'PASS') reasons.push(`verifier_outcome is ${JSON.stringify(evidence?.verifier_outcome)}, not "PASS"`);
  if (evidence?.acceptance_commands?.some((entry) => entry.exit_code !== 0)) {
    reasons.push('one or more acceptance commands did not exit 0');
  }
  if (!evidence?.accepted_candidate_sha) reasons.push('evidence is not bound to an accepted candidate SHA');

  let candidateSha;
  try {
    candidateSha = resolveSha(repoDir, candidateRef);
  } catch (error) {
    reasons.push(`cannot resolve candidate ref ${JSON.stringify(candidateRef)}: ${error.message.split('\n')[0]}`);
    return { ok: false, reasons, manifest: null };
  }

  if (candidateSha !== evidence?.accepted_candidate_sha) {
    reasons.push(`candidate SHA ${candidateSha} != accepted SHA ${evidence?.accepted_candidate_sha}`);
  }

  if (!options.expectedBaseSha) {
    reasons.push('expected integration base SHA is missing');
  } else {
    try {
      const expectedBaseSha = resolveSha(repoDir, options.expectedBaseSha);
      if (expectedBaseSha !== evidence?.base_sha) {
        reasons.push(`expected base SHA ${expectedBaseSha} != recorded base ${evidence?.base_sha}`);
      }
    } catch (error) {
      reasons.push(`cannot resolve expected base SHA ${JSON.stringify(options.expectedBaseSha)}`);
    }
  }

  if (!options.currentHeadSha) {
    reasons.push('current PR/head SHA is missing');
  } else {
    try {
      const currentHeadSha = resolveSha(repoDir, options.currentHeadSha);
      if (currentHeadSha !== evidence?.accepted_candidate_sha) {
        reasons.push(`current PR/head SHA ${currentHeadSha} != accepted SHA ${evidence?.accepted_candidate_sha}`);
      }
    } catch (error) {
      reasons.push(`cannot resolve current PR/head SHA ${JSON.stringify(options.currentHeadSha)}`);
    }
  }

  let manifest = null;
  try {
    manifest = computeCommitManifest(
      repoDir,
      evidence.base_sha,
      candidateSha,
      Object.keys(evidence.authorized_untracked_sha256 || {}),
    );
    reasons.push(...manifestMismatchReasons(evidence, manifest));
  } catch (error) {
    reasons.push(`cannot compute candidate manifest against recorded base: ${error.message.split('\n')[0]}`);
  }

  if (options.requireCleanWorktree !== false) {
    const status = worktreeStatus(repoDir);
    if (!status.clean) reasons.push(`integration worktree is dirty: ${status.problems.join(', ')}`);
  }
  reasons.push(...verifyRequiredChecks(options.requiredChecks));
  return { ok: reasons.length === 0, reasons, manifest };
}

module.exports = {
  EVIDENCE_SCHEMA,
  sha256Hex,
  canonPath,
  canonicalizePaths,
  computeCommitManifest,
  computeWorktreeManifest,
  captureEvidence,
  bindAcceptedCandidate,
  evidenceSelfConsistent,
  worktreeStatus,
  verifyCandidate,
};
