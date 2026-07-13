'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function runGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function summarizeStatus(lines) {
  const entries = lines.filter(Boolean);
  return entries.reduce((summary, line) => {
    const index = line[0] || ' ';
    const worktree = line[1] || ' ';
    summary.entries += 1;
    if (index !== ' ' && index !== '?') summary.staged += 1;
    if (index === '?' && worktree === '?') summary.untracked += 1;
    if (!(index === '?' && worktree === '?')) summary.trackedModified += 1;
    return summary;
  }, { entries: 0, staged: 0, trackedModified: 0, untracked: 0 });
}

function classifyWorktree({ ahead, behind, dirty }) {
  if (dirty) return 'dirty';
  if (ahead > 0 && behind > 0) return 'diverged';
  if (ahead > 0) return 'candidate-ready';
  if (behind > 0) return 'stale-base';
  return 'synced-clean';
}

function normalizeLeasePath(root, candidate) {
  const absolute = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative === '.') return '.';
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Lease path is outside repository: ${candidate}`);
  }
  return relative.split(path.sep).join('/');
}

function detectLeaseConflict(firstPaths, secondPaths) {
  return firstPaths.some((firstPath) => secondPaths.some((secondPath) => {
    const first = firstPath.replaceAll('\\', '/').replace(/\/+$/, '');
    const second = secondPath.replaceAll('\\', '/').replace(/\/+$/, '');
    return first === second || first.startsWith(`${second}/`) || second.startsWith(`${first}/`);
  }));
}

function parseStatus(raw) {
  const records = raw.split('\0').filter(Boolean);
  const parsed = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const paths = [record.slice(3)];
    if ((status.includes('R') || status.includes('C')) && records[index + 1] !== undefined) {
      paths.push(records[index + 1]);
      index += 1;
    }
    parsed.push({ status, paths });
  }
  return parsed;
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const canonical = new Date(timestamp).toISOString();
  return value === canonical || value === canonical.replace('.000Z', 'Z');
}

function parseLease(root, lease) {
  if (!lease || typeof lease !== 'object' || Array.isArray(lease)) throw new Error('lease must be an object');
  for (const field of ['agent', 'branch']) {
    if (typeof lease[field] !== 'string' || !lease[field].trim()) throw new Error(`lease.${field} must be a non-empty string`);
  }
  if (typeof lease.worktree !== 'string' || !path.isAbsolute(lease.worktree)) throw new Error('lease.worktree must be an absolute path');
  if (!isIsoTimestamp(lease.startedAt)) throw new Error('lease.startedAt must be a valid timestamp');
  if (!Array.isArray(lease.paths) || lease.paths.length === 0 || lease.paths.some((item) => typeof item !== 'string')) {
    throw new Error('lease.paths must be a non-empty array of paths');
  }
  if (!isIsoTimestamp(lease.expiresAt)) {
    throw new Error('lease.expiresAt must be a valid timestamp');
  }
  const paths = lease.paths.map((item) => normalizeLeasePath(root, item));
  if (paths.includes('.')) throw new Error('lease.paths cannot claim repository root');
  return {
    agent: lease.agent,
    branch: lease.branch,
    worktree: lease.worktree,
    paths,
    startedAt: lease.startedAt,
    expiresAt: lease.expiresAt,
  };
}

function parseWorktrees(root) {
  const fields = runGit(root, ['worktree', 'list', '--porcelain']).split('\n\n').filter(Boolean);
  return fields.map((block) => {
    const values = Object.fromEntries(block.split('\n').map((line) => {
      const [key, ...rest] = line.split(' ');
      return [key, rest.join(' ')];
    }));
    return { path: values.worktree, head: values.HEAD, branch: values.branch?.replace('refs/heads/', '') || null };
  });
}

function readLeases(root) {
  const directory = path.join(root, '.agents', 'leases');
  if (!fs.existsSync(directory)) return { leases: [], invalidLeases: [] };
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .reduce((result, name) => {
      const file = path.join(directory, name);
      try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('lease entry must be a regular file');
        result.leases.push({ ...parseLease(root, JSON.parse(fs.readFileSync(file, 'utf8'))), file });
      } catch (error) {
        result.invalidLeases.push({ file, reason: error.message });
      }
      return result;
    }, { leases: [], invalidLeases: [] });
}

function branchDelta(root, branch) {
  if (!branch) return { ahead: 0, behind: 0 };
  const counts = runGit(root, ['rev-list', '--left-right', '--count', `origin/main...${branch}`]).split(/\s+/).map(Number);
  return { behind: counts[0] || 0, ahead: counts[1] || 0 };
}

function worktreeRow(root, worktree) {
  const changes = parseStatus(execFileSync('git', ['-C', worktree.path, 'status', '--porcelain=v1', '-z'], { encoding: 'utf8' }));
  const status = summarizeStatus(changes.map(({ status: code }) => code));
  const delta = branchDelta(root, worktree.branch || worktree.head);
  return {
    ...worktree,
    originMain: runGit(root, ['rev-parse', 'origin/main']),
    ...delta,
    status,
    dirty: status.entries > 0,
    classification: classifyWorktree({ ...delta, dirty: status.entries > 0 }),
    changes,
    changedPaths: changes.flatMap(({ paths }) => paths),
  };
}

function main() {
  const root = runGit(process.cwd(), ['rev-parse', '--show-toplevel']);
  const args = new Set(process.argv.slice(2));
  if (args.has('--fetch')) runGit(root, ['fetch', 'origin', '--prune']);

  const rows = parseWorktrees(root).map((worktree) => worktreeRow(root, worktree));
  const now = Date.now();
  const leaseReport = readLeases(root);
  const leases = leaseReport.leases.map((lease) => ({
    ...lease,
    expired: Date.parse(lease.expiresAt) <= now,
  }));
  const conflicts = [];
  for (let index = 0; index < leases.length; index += 1) {
    for (let compare = index + 1; compare < leases.length; compare += 1) {
      if (detectLeaseConflict(leases[index].paths, leases[compare].paths)) {
        conflicts.push([leases[index].file, leases[compare].file]);
      }
    }
  }

  const expiredLeases = leases.filter((lease) => lease.expired);
  const report = { root, originMain: runGit(root, ['rev-parse', 'origin/main']), worktrees: rows, leases, expiredLeases, invalidLeases: leaseReport.invalidLeases, conflicts };
  if (args.has('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const row of rows) {
      console.log(`${row.classification.padEnd(16)} ${row.branch || 'DETACHED'} ${row.ahead}/${row.behind} dirty=${row.status.entries} ${row.path}`);
    }
    if (leases.length) console.log(`leases=${leases.length} conflicts=${conflicts.length}`);
  }
  if (args.has('--assert-no-conflicts') && (conflicts.length || expiredLeases.length || leaseReport.invalidLeases.length)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { classifyWorktree, summarizeStatus, normalizeLeasePath, detectLeaseConflict, parseLease, parseStatus };
