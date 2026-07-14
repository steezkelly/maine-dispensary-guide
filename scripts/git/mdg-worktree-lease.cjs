'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  sharedLeaseDirectory,
  parseLease,
  detectLeaseConflict,
} = require('./mdg-worktree-status.cjs');

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

function leaseFilename(branch, worktree) {
  return `${Buffer.from(`${branch}\0${worktree}`).toString('base64url')}.json`;
}

function readLeaseEntries(root) {
  const directory = sharedLeaseDirectory(root);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`lease entry must be a regular file: ${file}`);
      return { file, lease: parseLease(root, JSON.parse(fs.readFileSync(file, 'utf8'))) };
    });
}

function withLeaseLock(directory, callback) {
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, '.lease.lock');
  try {
    fs.mkdirSync(lock);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('lease directory is busy; retry acquire or release');
    throw error;
  }
  try {
    return callback();
  } finally {
    fs.rmdirSync(lock);
  }
}

function acquire(root, values) {
  const branch = one(values, 'branch');
  const worktree = path.resolve(one(values, 'worktree'));
  const ttlMinutes = Number(one(values, 'ttl-minutes'));
  if (!Number.isInteger(ttlMinutes) || ttlMinutes <= 0) throw new Error('ttl-minutes must be a positive integer');
  const rawPaths = values.get('path') || [];
  if (!rawPaths.length) throw new Error('path must be provided at least once');
  const now = new Date();
  const lease = parseLease(root, {
    agent: one(values, 'agent'),
    branch,
    worktree,
    paths: rawPaths,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString(),
  });
  const taskId = one(values, 'task-id', { required: false });
  const ownerRole = one(values, 'owner-role', { required: false });
  const document = { ...lease, ...(taskId === undefined ? {} : { taskId }), ...(ownerRole === undefined ? {} : { ownerRole }) };
  const directory = sharedLeaseDirectory(root);
  return withLeaseLock(directory, () => {
    const existing = readLeaseEntries(root);
    const expired = existing.find(({ lease: current }) => Date.parse(current.expiresAt) <= Date.now());
    if (expired) throw new Error(`expired lease must be reconciled before acquisition: ${expired.file}`);
    const conflict = existing.find(({ lease: current }) => detectLeaseConflict(current.paths, lease.paths));
    if (conflict) throw new Error(`lease conflict with ${conflict.file}`);
    const file = path.join(directory, leaseFilename(branch, worktree));
    if (fs.existsSync(file)) throw new Error(`lease already exists: ${file}`);
    const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
    try {
      fs.writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, { flag: 'wx' });
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
    return file;
  });
}

function release(root, values) {
  const branch = one(values, 'branch');
  const worktree = path.resolve(one(values, 'worktree'));
  const directory = sharedLeaseDirectory(root);
  return withLeaseLock(directory, () => {
    const matches = readLeaseEntries(root).filter(({ lease }) => lease.branch === branch && lease.worktree === worktree);
    for (const { file } of matches) fs.unlinkSync(file);
    return matches.length;
  });
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!['acquire', 'release'].includes(command)) throw new Error('usage: mdg-worktree-lease.cjs <acquire|release> [options]');
  const root = require('node:child_process').execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const result = command === 'acquire' ? acquire(root, parseArguments(args)) : release(root, parseArguments(args));
  console.log(command === 'acquire' ? `acquired ${result}` : `released ${result} lease(s)`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { acquire, release, leaseFilename, parseArguments };
