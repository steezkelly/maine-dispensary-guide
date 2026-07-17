#!/usr/bin/env node
'use strict';

const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_PRIVATE_DATA_ROOT = path.join(process.env.HOME || '', '.hermes', 'data', 'mdg-gsc');

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function privateDataRoot(configured = process.env.MDG_GSC_DATA_ROOT || DEFAULT_PRIVATE_DATA_ROOT) {
  const root = path.resolve(configured);
  if (isWithin(REPO_ROOT, root)) {
    throw new Error(`MDG_GSC_DATA_ROOT must be outside the repository: ${REPO_ROOT}`);
  }
  return root;
}

function privateOutputPath(target, root = privateDataRoot()) {
  const output = path.resolve(target);
  if (!isWithin(root, output)) {
    throw new Error(`Raw-query reports must be written under the private GSC data root: ${root}`);
  }
  return output;
}

module.exports = { DEFAULT_PRIVATE_DATA_ROOT, REPO_ROOT, isWithin, privateDataRoot, privateOutputPath };
