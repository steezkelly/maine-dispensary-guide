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
 * Fail-closed validation of a private READ path (e.g. integrity evidence or a
 * coverage contract) — OPS-06A-R3 finding E.
 *
 * Closes the symlink-ancestor escape:
 *   - resolves the FINAL real path (fs.realpathSync) and proves it is beneath
 *     the real (symlink-resolved) MDG_OPS_ROOT — this catches an ancestor that
 *     is a symlink pointing outside the root even when the lexical path looks
 *     contained;
 *   - rejects a symlinked evidence path ENTIRELY (the final component must not
 *     be a symlink); there is no documented need to permit internal symlinks
 *     for Tier-0 reads;
 *   - inspects each existing path component beneath the root and rejects any
 *     escaping symlink ancestor;
 *   - validates the final object is a regular owner-only file (no group/other
 *     bits — strict 0600);
 *   - validates private ancestor directories beneath the root are not
 *     group/other-WRITABLE. Accepted directory rule: `(mode & 0o022) === 0`
 *     for every directory from the file's parent up to and including the real
 *     root. This permits conventional 0755/0700 private directories but rejects
 *     any group/other-writable ancestor (e.g. 0775/0777/0757), which is the
 *     property that would let another local user plant or redirect a symlink.
 *     The evidence FILE itself is held to the stricter owner-only (0600) rule;
 *   - fails closed on races or permission errors (any thrown stat/realpath
 *     error is converted to a fail-closed rejection).
 *
 * Returns the resolved real path (beneath the real root). Never returns a path
 * outside the root.
 */
function validatePrivateReadPath(root, inputPath) {
  const realRoot = realPrivateRoot(root);
  const resolved = path.resolve(inputPath);

  // Lexical containment first (catches `..` escapes before touching the fs).
  if (resolved !== realRoot && !resolved.startsWith(realRoot + path.sep)) {
    throw new Error(`OPS_EVIDENCE_ESCAPE: evidence path ${inputPath} is not beneath private root ${realRoot}`);
  }

  // The final component must exist and must NOT be a symlink (reject symlinked
  // evidence paths entirely).
  let lst;
  try {
    lst = fs.lstatSync(resolved);
  } catch (err) {
    throw new Error(`OPS_EVIDENCE_MISSING: evidence file ${inputPath} does not exist: ${err.message}`);
  }
  if (lst.isSymbolicLink()) {
    throw new Error(`OPS_EVIDENCE_SYMLINK: evidence path ${inputPath} is a symlink; symlinked Tier-0 evidence is rejected`);
  }

  // Resolve the final REAL path and prove it remains beneath the real root.
  // This is the core symlink-ancestor-escape closure: if any ancestor is a
  // symlink pointing outside the root, realpath lands outside and we reject.
  let realPath;
  try {
    realPath = fs.realpathSync(resolved);
  } catch (err) {
    throw new Error(`OPS_EVIDENCE_RACE: cannot resolve evidence path ${inputPath}: ${err.message}`);
  }
  if (realPath !== realRoot && !realPath.startsWith(realRoot + path.sep)) {
    throw new Error(`OPS_EVIDENCE_ANCESTOR_ESCAPE: evidence path ${inputPath} resolves outside the private root (symlink ancestor)`);
  }

  // Inspect each existing path component beneath the root; reject any escaping
  // symlink ancestor (defense in depth alongside the realpath proof above).
  let cursor = path.dirname(realPath);
  while (cursor === realRoot || cursor.startsWith(realRoot + path.sep)) {
    let compStat;
    try {
      compStat = fs.lstatSync(cursor);
    } catch (err) {
      throw new Error(`OPS_EVIDENCE_RACE: cannot stat ancestor ${cursor}: ${err.message}`);
    }
    if (compStat.isSymbolicLink()) {
      throw new Error(`OPS_EVIDENCE_ANCESTOR_ESCAPE: ancestor ${cursor} is a symlink beneath the private root`);
    }
    if (cursor === realRoot) break;
    cursor = path.dirname(cursor);
  }

  // Final object must be a regular owner-only file.
  let st;
  try {
    st = fs.statSync(realPath);
  } catch (err) {
    throw new Error(`OPS_EVIDENCE_RACE: cannot stat evidence file ${inputPath}: ${err.message}`);
  }
  if (!st.isFile()) {
    throw new Error(`OPS_EVIDENCE_NOT_FILE: evidence path ${inputPath} is not a regular file`);
  }
  if ((st.mode & 0o077) !== 0) {
    throw new Error(`OPS_EVIDENCE_PERM: evidence file ${inputPath} has unsafe permissions (group/other bits set); Tier 0 evidence must be owner-only`);
  }

  // Private ancestor directories beneath the root must not be group/other-
  // writable (documented accepted directory rule: (mode & 0o022) === 0). This
  // permits conventional 0755/0700 dirs but rejects 0775/0777/0757 ancestors.
  let dirCursor = path.dirname(realPath);
  while (dirCursor === realRoot || dirCursor.startsWith(realRoot + path.sep)) {
    let dirStat;
    try {
      dirStat = fs.statSync(dirCursor);
    } catch (err) {
      throw new Error(`OPS_EVIDENCE_RACE: cannot stat directory ${dirCursor}: ${err.message}`);
    }
    if ((dirStat.mode & 0o022) !== 0) {
      throw new Error(`OPS_EVIDENCE_DIR_PERM: private directory ${dirCursor} is group/other-writable; Tier 0 ancestor directories must not be group/other-writable`);
    }
    if (dirCursor === realRoot) break;
    dirCursor = path.dirname(dirCursor);
  }

  return realPath;
}

module.exports = {
  realPrivateRoot,
  validatePrivateOutputPath,
  ensurePrivateDirs,
  writePrivateFile,
  validatePrivateReadPath,
};
