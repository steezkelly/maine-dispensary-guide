#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_PRIVATE_DATA_ROOT = process.env.HOME
  ? path.join(process.env.HOME, '.hermes', 'data', 'mdg-gsc')
  : null;

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function resolvedForContainment(candidate, seen = new Set()) {
  const resolved = path.resolve(candidate);
  const parsed = path.parse(resolved);
  const segments = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let cursor = parsed.root;

  for (const [index, segment] of segments.entries()) {
    const next = path.join(cursor, segment);
    let stat;
    try {
      stat = fs.lstatSync(next);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return path.join(cursor, ...segments.slice(index));
    }
    if (!stat.isSymbolicLink()) {
      cursor = next;
      continue;
    }
    if (seen.has(next)) throw new Error(`Symlink cycle in private GSC path: ${next}`);
    seen.add(next);
    const target = fs.readlinkSync(next);
    cursor = resolvedForContainment(path.resolve(path.dirname(next), target), seen);
  }
  return cursor;
}

function assertNoExistingSymlinks(candidate) {
  const resolved = path.resolve(candidate);
  const parsed = path.parse(resolved);
  const segments = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let cursor = parsed.root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed in the private GSC data root: ${cursor}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }

  const visit = target => {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the private GSC data root: ${target}`);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
    }
  };
  visit(resolved);
}

function privateDataRoot(configured = process.env.MDG_GSC_DATA_ROOT || DEFAULT_PRIVATE_DATA_ROOT) {
  if (!configured) throw new Error('Default MDG_GSC_DATA_ROOT requires HOME; configure an absolute private root explicitly.');
  const root = path.resolve(configured);
  if (isWithin(REPO_ROOT, root) || isWithin(fs.realpathSync(REPO_ROOT), resolvedForContainment(root))) {
    throw new Error(`MDG_GSC_DATA_ROOT must be outside the repository: ${REPO_ROOT}`);
  }
  assertNoExistingSymlinks(root);
  return root;
}

function privateOutputPath(target, root = privateDataRoot()) {
  const validatedRoot = privateDataRoot(root);
  const output = path.resolve(target);
  if (!isWithin(validatedRoot, output) || !isWithin(resolvedForContainment(validatedRoot), resolvedForContainment(output))) {
    throw new Error(`Raw-query reports must be written under the private GSC data root: ${validatedRoot}`);
  }
  return output;
}

module.exports = { assertNoExistingSymlinks, DEFAULT_PRIVATE_DATA_ROOT, REPO_ROOT, isWithin, privateDataRoot, privateOutputPath, resolvedForContainment };
