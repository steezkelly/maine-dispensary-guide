'use strict';

/**
 * Shared Tier-0 private-output safety helper (OPS-06A-R2 findings E and F).
 *
 * One authoritative implementation used by BOTH the metrics CLI (detailed
 * report output) and the integrity CLI (evidence capture/bind output and
 * evidence reads). Maintaining a single security implementation avoids two
 * subtly divergent path/permission checks.
 *
 * Guarantees:
 *   - Output paths are validated to be beneath the REAL MDG_OPS_ROOT
 *     (symlink-resolved). Repository-local destinations, lexical `..` escapes,
 *     symlink-ancestor escapes, and unsafe output-file symlinks are rejected.
 *   - Private directories are created/chmodded 0700 ONLY from the real private
 *     root downward. The walk STOPS exactly at the real private root and never
 *     chmods the user's home directory, /home, /tmp, or any ancestor above the
 *     private root (OPS-06A-R2 finding E).
 *   - Permission failures INSIDE the private root fail closed (throw); they are
 *     never silently ignored.
 *   - Files are written through an owner-only temporary file and atomic rename;
 *     the final file is enforced 0600 even when replacing a pre-existing 0644.
 *   - Evidence reads are validated beneath the root, reject unsafe symlinks,
 *     and fail closed on group/other-readable permissions (Tier 0).
 *
 * No dependency. Node built-ins only.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Resolve the real (symlink-free) private root. Throws if the root does not
 * exist or is not a directory (fail closed).
 */
function realPrivateRoot(root) {
  const resolved = path.resolve(root);
  let st;
  try {
    st = fs.statSync(resolved);
  } catch (err) {
    throw new Error(`OPS_PRIVATE_ROOT_MISSING: private root ${resolved} does not exist: ${err.message}`);
  }
  if (!st.isDirectory()) {
    throw new Error(`OPS_PRIVATE_ROOT_NOT_DIR: private root ${resolved} is not a directory`);
  }
  return fs.realpathSync(resolved);
}

/**
 * Fail-closed validation of a private OUTPUT path. Returns the resolved
 * absolute path (beneath the real root). Rejects:
 *   - lexical `..` escape (caught before touching the filesystem);
 *   - a repository-local destination (output inside the repo);
 *   - an output file that is itself an unsafe symlink;
 *   - an existing symlink ancestor that escapes the private root.
 */
function validatePrivateOutputPath(root, outputPath, repoRoot) {
  const realRoot = realPrivateRoot(root);
  const resolved = path.resolve(outputPath);

  // Lexical containment first.
  if (resolved !== realRoot && !resolved.startsWith(realRoot + path.sep)) {
    throw new Error(`OPS_OUTPUT_ESCAPE: output path ${outputPath} is not beneath private root ${realRoot}`);
  }

  // Reject a repository-local destination.
  if (repoRoot) {
    const realRepo = fs.realpathSync(path.resolve(repoRoot));
    if (resolved === realRepo || resolved.startsWith(realRepo + path.sep)) {
      throw new Error(`OPS_OUTPUT_INSIDE_REPO: output path ${outputPath} is inside repository ${realRepo}`);
    }
  }

  // Reject an output file that is itself an unsafe symlink.
  if (fs.existsSync(resolved)) {
    const st = fs.lstatSync(resolved);
    if (st.isSymbolicLink()) {
      const linkReal = fs.realpathSync(resolved);
      if (linkReal !== realRoot && !linkReal.startsWith(realRoot + path.sep)) {
        throw new Error(`OPS_OUTPUT_SYMLINK_ESCAPE: output file ${outputPath} is a symlink escaping the private root`);
      }
    }
  }

  // Reject an existing symlink ancestor that escapes the private root.
  let cursor = path.dirname(resolved);
  while (cursor !== path.dirname(cursor)) {
    if (fs.existsSync(cursor)) {
      const realAncestor = fs.realpathSync(cursor);
      const ancestorUnderRoot = realAncestor === realRoot || realAncestor.startsWith(realRoot + path.sep);
      const rootUnderAncestor = realRoot.startsWith(realAncestor + path.sep);
      if (!ancestorUnderRoot && !rootUnderAncestor) {
        throw new Error(`OPS_OUTPUT_ANCESTOR_ESCAPE: ancestor ${cursor} resolves outside the private root`);
      }
    }
    cursor = path.dirname(cursor);
  }

  return resolved;
}

/**
 * Create the directory chain for `dir` beneath the real private root and chmod
 * each created/needed directory to 0700, STOPPING exactly at the real private
 * root. Never chmods any ancestor above the private root. Permission failures
 * inside the private root fail closed (throw).
 */
function ensurePrivateDirs(realRoot, dir) {
  // Build the chain from dir up to (and including) realRoot.
  const chain = [];
  let cursor = dir;
  while (true) {
    chain.push(cursor);
    if (cursor === realRoot) break;
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      // Should not happen: dir is validated beneath realRoot.
      throw new Error(`OPS_PRIVATE_DIR_ESCAPE: directory ${dir} is not beneath private root ${realRoot}`);
    }
    cursor = parent;
  }
  // chain = [dir, ..., realRoot]. Create top-down (realRoot first) so parents
  // exist, then chmod each to 0700 fail-closed.
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const d = chain[i];
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { mode: 0o700 });
    }
    try {
      fs.chmodSync(d, 0o700);
    } catch (err) {
      throw new Error(`OPS_PRIVATE_CHMOD_FAIL: cannot set 0700 on private directory ${d}: ${err.message}`);
    }
  }
}

/**
 * Write `content` to a validated private output path beneath the real private
 * root. Owner-only directories (0700, stopping at the root), owner-only file
 * (0600, enforced even over a pre-existing 0644), written through a temporary
 * file and atomic rename. Fails closed on any permission error inside the root.
 * Returns the resolved safe path.
 */
function writePrivateFile(root, outputPath, content, repoRoot) {
  const safePath = validatePrivateOutputPath(root, outputPath, repoRoot);
  const realRoot = realPrivateRoot(root);
  const dir = path.dirname(safePath);
  ensurePrivateDirs(realRoot, dir);

  const tmp = path.join(dir, `.tmp.${process.pid}.${crypto.randomBytes(6).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, content, { mode: 0o600 });
    try {
      fs.chmodSync(tmp, 0o600);
    } catch (err) {
      throw new Error(`OPS_PRIVATE_CHMOD_FAIL: cannot set 0600 on temp file: ${err.message}`);
    }
    fs.renameSync(tmp, safePath);
    try {
      fs.chmodSync(safePath, 0o600); // enforce 0600 even over a pre-existing 0644
    } catch (err) {
      throw new Error(`OPS_PRIVATE_CHMOD_FAIL: cannot set 0600 on output file ${safePath}: ${err.message}`);
    }
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* tmp may not exist after rename */ }
  }
  return safePath;
}

/**
 * Fail-closed validation of a private READ path (e.g. integrity evidence).
 * Returns the resolved absolute path. Rejects paths not beneath the real root,
 * unsafe symlinks, and files with group/other permission bits set (Tier 0
 * evidence must be owner-only). Fails closed if the file does not exist.
 */
function validatePrivateReadPath(root, inputPath) {
  const realRoot = realPrivateRoot(root);
  const resolved = path.resolve(inputPath);

  if (resolved !== realRoot && !resolved.startsWith(realRoot + path.sep)) {
    throw new Error(`OPS_EVIDENCE_ESCAPE: evidence path ${inputPath} is not beneath private root ${realRoot}`);
  }

  let lst;
  try {
    lst = fs.lstatSync(resolved);
  } catch (err) {
    throw new Error(`OPS_EVIDENCE_MISSING: evidence file ${inputPath} does not exist: ${err.message}`);
  }

  if (lst.isSymbolicLink()) {
    const linkReal = fs.realpathSync(resolved);
    if (linkReal !== realRoot && !linkReal.startsWith(realRoot + path.sep)) {
      throw new Error(`OPS_EVIDENCE_SYMLINK_ESCAPE: evidence file ${inputPath} is an unsafe symlink`);
    }
  }

  const st = fs.statSync(resolved);
  if (!st.isFile()) {
    throw new Error(`OPS_EVIDENCE_NOT_FILE: evidence path ${inputPath} is not a regular file`);
  }
  if ((st.mode & 0o077) !== 0) {
    throw new Error(`OPS_EVIDENCE_PERM: evidence file ${inputPath} has unsafe permissions (group/other bits set); Tier 0 evidence must be owner-only`);
  }

  return resolved;
}

module.exports = {
  realPrivateRoot,
  validatePrivateOutputPath,
  ensurePrivateDirs,
  writePrivateFile,
  validatePrivateReadPath,
};
