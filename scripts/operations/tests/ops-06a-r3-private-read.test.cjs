#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R3-E — private READ symlink-ancestor escape tests.
 *
 * validatePrivateReadPath must close the symlink-ancestor escape: resolve the
 * final real path and prove it is beneath the real MDG_OPS_ROOT, reject
 * symlinked evidence paths entirely, inspect each component beneath the root,
 * validate the final object is a regular owner-only file, validate ancestor
 * directories are not group/other-writable, and fail closed on races.
 *
 * These tests exercise READ validation specifically (not output validation).
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const privateOutput = require('../private/mdg-ops-private-output.cjs');

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3e-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function writeEvidence(root, rel, content = '{}') {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, content, { mode: 0o600 });
  return p;
}

test('R3-E: safe ordinary evidence path validates and returns the real path', () => {
  const root = makeRoot();
  const p = writeEvidence(root, 'evidence.json');
  const resolved = privateOutput.validatePrivateReadPath(root, p);
  assert.equal(resolved, fs.realpathSync(p));
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-E: root/linkdir/evidence.json where linkdir points OUTSIDE root is rejected', () => {
  const root = makeRoot();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3e-outside-'));
  const realFile = path.join(outside, 'evidence.json');
  fs.writeFileSync(realFile, '{}', { mode: 0o600 });
  // linkdir inside root -> outside; evidence.json is a regular 0600 file outside.
  const linkDir = path.join(root, 'linkdir');
  fs.symlinkSync(outside, linkDir);
  const evidencePath = path.join(linkDir, 'evidence.json');
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, evidencePath),
    /OPS_EVIDENCE_ANCESTOR_ESCAPE|OPS_EVIDENCE_RACE/,
    'symlink ancestor escaping the root must be rejected on READ',
  );
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('R3-E: nested symlink-ancestor escape for a coverage contract is rejected', () => {
  const root = makeRoot();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3e-outside2-'));
  const realContract = path.join(outside, 'contract.json');
  fs.writeFileSync(realContract, '{}', { mode: 0o600 });
  // Nested: root/a/b -> outside (b is the symlink), contract under it.
  fs.mkdirSync(path.join(root, 'a'), { mode: 0o700 });
  fs.symlinkSync(outside, path.join(root, 'a', 'b'));
  const contractPath = path.join(root, 'a', 'b', 'contract.json');
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, contractPath),
    /OPS_EVIDENCE_ANCESTOR_ESCAPE|OPS_EVIDENCE_RACE/,
  );
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('R3-E: a symlinked evidence FILE (even to a safe target) is rejected entirely', () => {
  const root = makeRoot();
  const target = writeEvidence(root, 'real.json');
  const linkFile = path.join(root, 'link.json');
  fs.symlinkSync(target, linkFile); // symlink, even though target is inside root
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, linkFile),
    /OPS_EVIDENCE_SYMLINK/,
    'symlinked evidence paths are rejected entirely',
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-E: unsafe ancestor directory permissions (group-writable) are rejected', () => {
  const root = makeRoot();
  const sub = path.join(root, 'sub');
  fs.mkdirSync(sub, { mode: 0o775 }); // group-writable -> unsafe
  const p = path.join(sub, 'evidence.json');
  fs.writeFileSync(p, '{}', { mode: 0o600 });
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, p),
    /OPS_EVIDENCE_DIR_PERM/,
    'group/other-writable ancestor directory must be rejected',
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-E: a 0755 ancestor directory is ACCEPTED (not group/other-writable)', () => {
  const root = makeRoot();
  const sub = path.join(root, 'sub');
  fs.mkdirSync(sub, { mode: 0o755 }); // readable/traversable, not writable by group/other
  const p = path.join(sub, 'evidence.json');
  fs.writeFileSync(p, '{}', { mode: 0o600 });
  const resolved = privateOutput.validatePrivateReadPath(root, p);
  assert.equal(resolved, fs.realpathSync(p));
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-E: evidence file with group/other perms is rejected (owner-only required)', () => {
  const root = makeRoot();
  const p = path.join(root, 'evidence.json');
  fs.writeFileSync(p, '{}', { mode: 0o644 });
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, p),
    /OPS_EVIDENCE_PERM/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-E: lexical .. escape is rejected on READ', () => {
  const root = makeRoot();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3e-outside3-'));
  const p = path.join(outside, 'evidence.json');
  fs.writeFileSync(p, '{}', { mode: 0o600 });
  const escape = path.join(root, '..', path.basename(outside), 'evidence.json');
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, escape),
    /OPS_EVIDENCE_ESCAPE/,
  );
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('R3-E: missing evidence file fails closed', () => {
  const root = makeRoot();
  assert.throws(
    () => privateOutput.validatePrivateReadPath(root, path.join(root, 'nope.json')),
    /OPS_EVIDENCE_MISSING/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});
