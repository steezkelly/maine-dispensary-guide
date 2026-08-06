#!/usr/bin/env node
'use strict';

/**
 * workflow-gc.cjs — safely identify and optionally remove clean worktrees and
 * local branches whose upstream pull request has been merged.
 *
 * Default is dry-run. `--execute` is required for any deletion. Branches that
 * Git cannot prove merged (for example squash-merged PRs) require the separate
 * `--force-merged` acknowledgement.
 */

const { execFileSync, spawnSync } = require('node:child_process');

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

function output(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' });
}

function parseArgs(argv) {
  const options = { execute: false, forceMerged: false, olderThanDays: 7 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.execute = false;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--force-merged') options.forceMerged = true;
    else if (arg === '--older-than-days') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 0) throw new Error('--older-than-days must be a non-negative integer');
      options.olderThanDays = value;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write('usage: workflow-gc.cjs [--dry-run|--execute] [--force-merged] [--older-than-days N]\n');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function mergedBranches(olderThanDays) {
  const rows = JSON.parse(output('gh', ['pr', 'list', '--state', 'merged', '--limit', '200', '--json', 'headRefName,headRefOid,mergedAt']));
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  return new Map(rows
    .filter((row) => row.headRefName && row.headRefOid && row.mergedAt && new Date(row.mergedAt).getTime() <= cutoff)
    .map((row) => [row.headRefName, { headRefOid: row.headRefOid, mergedAt: row.mergedAt }]));
}

function refOid(ref, worktreePath) {
  const args = worktreePath ? ['-C', worktreePath, 'rev-parse', 'HEAD'] : ['rev-parse', ref];
  return output('git', args).trim();
}

function matchesMergedPullRequestHead(ref, details, worktreePath) {
  return refOid(ref, worktreePath) === details.headRefOid;
}

function worktrees() {
  const blocks = output('git', ['worktree', 'list', '--porcelain']).trim().split('\n\n').filter(Boolean);
  return blocks.map((block) => {
    const values = {};
    for (const line of block.split('\n')) {
      const [key, ...rest] = line.split(' ');
      values[key] = rest.join(' ');
    }
    return { path: values.worktree, branch: values.branch?.replace('refs/heads/', '') };
  });
}

function isClean(worktreePath) {
  return output('git', ['-C', worktreePath, 'status', '--porcelain']).trim() === '';
}

function checkedOutBranches(entries) {
  return new Set(entries.map((entry) => entry.branch).filter(Boolean));
}

function localBranches() {
  return output('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads']).trim().split('\n').filter(Boolean);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const merged = mergedBranches(options.olderThanDays);
  const entries = worktrees();
  const stats = { worktreeCandidates: 0, worktreesRemoved: 0, dirtySkipped: 0, unmatchedSkipped: 0, branchCandidates: 0, branchesDeleted: 0, squashSkipped: 0 };

  for (const entry of entries) {
    const details = entry.branch && merged.get(entry.branch);
    if (!details) continue;
    if (!matchesMergedPullRequestHead(entry.branch, details, entry.path)) {
      stats.unmatchedSkipped += 1;
      process.stdout.write(`skipped worktree ${entry.path} (branch ${entry.branch} does not match merged pull-request head)\n`);
      continue;
    }
    if (!isClean(entry.path)) {
      stats.dirtySkipped += 1;
      process.stdout.write(`skipped dirty worktree ${entry.path} (branch ${entry.branch})\n`);
      continue;
    }
    stats.worktreeCandidates += 1;
    if (!options.execute) {
      process.stdout.write(`would remove worktree ${entry.path} (branch ${entry.branch}, merged ${details.mergedAt})\n`);
      continue;
    }
    run('git', ['worktree', 'remove', entry.path]);
    stats.worktreesRemoved += 1;
    process.stdout.write(`removed worktree ${entry.path} (branch ${entry.branch})\n`);
  }

  if (options.execute && stats.worktreesRemoved > 0) run('git', ['worktree', 'prune']);

  const activeBranches = checkedOutBranches(worktrees());
  for (const branch of localBranches()) {
    const details = merged.get(branch);
    if (!details || activeBranches.has(branch)) continue;
    if (!matchesMergedPullRequestHead(branch, details)) {
      stats.unmatchedSkipped += 1;
      process.stdout.write(`skipped branch ${branch} (current tip does not match merged pull-request head)\n`);
      continue;
    }
    stats.branchCandidates += 1;
    if (!options.execute) {
      process.stdout.write(`would delete merged branch ${branch} (merged ${details.mergedAt})\n`);
      continue;
    }
    const deletion = run('git', ['branch', '-d', branch], { allowFailure: true });
    if (deletion.status === 0) {
      stats.branchesDeleted += 1;
      process.stdout.write(`deleted merged branch ${branch}\n`);
    } else if (options.forceMerged) {
      run('git', ['branch', '-D', branch]);
      stats.branchesDeleted += 1;
      process.stdout.write(`force-deleted squash-merged branch ${branch}\n`);
    } else {
      stats.squashSkipped += 1;
      process.stdout.write(`skipped merged branch ${branch} (Git cannot prove ancestry; use --force-merged to delete)\n`);
    }
  }

  const mode = options.execute ? 'execute' : 'dry-run';
  process.stdout.write(`summary (${mode}): worktrees: ${stats.worktreeCandidates} candidate, ${stats.worktreesRemoved} removed, ${stats.dirtySkipped} dirty skipped, ${stats.unmatchedSkipped} ref-mismatch skipped; branches: ${stats.branchCandidates} candidate, ${stats.branchesDeleted} deleted, ${stats.squashSkipped} require --force-merged\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`workflow-gc: ${error.message}\n`);
  process.exitCode = 1;
}
