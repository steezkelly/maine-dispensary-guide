#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  detectLeaseConflict,
  readLeases,
} = require(path.resolve(__dirname, '../git/mdg-worktree-status.cjs'));

// OPS-06B-HARDEN-R1: branch-writer ownership guard. A task whose branch/worktree
// is actively owned by another acquisition is blocked before dispatch. Malformed
// writer state fails closed.
const { taskBlocker } = require(path.resolve(__dirname, '../git/mdg-branch-writer.cjs'));

const statusScriptPath = path.resolve(__dirname, '../git/mdg-worktree-status.cjs');
const scriptPath = path.resolve(__dirname, 'mdg-task-preflight.cjs');

function normalizePath(value) {
  return typeof value === 'string' ? value.trim().replace(/\\/g, '/').replace(/\/+$/, '') : '';
}

function findRepoRoot(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);
  while (true) {
    const gitPath = path.join(currentDir, '.git');
    if (fs.existsSync(gitPath)) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function resolveInputPath(inputPath, repoRoot) {
  const baseDir = repoRoot || process.cwd();
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(baseDir, inputPath);
}

function isAcceptedDependencyStatus(value) {
  return value === 'accepted' || value === 'released';
}

function getDependencyStatus(boardState, taskId) {
  if (!boardState || typeof taskId !== 'string') return undefined;
  if (typeof boardState === 'object' && !Array.isArray(boardState)) {
    const direct = boardState[taskId];
    if (typeof direct === 'string') return direct.toLowerCase();
    if (direct && typeof direct === 'object' && typeof direct.status === 'string') return direct.status.toLowerCase();
    if (direct && typeof direct === 'object' && typeof direct.state === 'string') return direct.state.toLowerCase();
  }

  const rows = Array.isArray(boardState)
    ? boardState
    : Array.isArray(boardState?.tasks)
      ? boardState.tasks
      : Array.isArray(boardState?.items)
        ? boardState.items
        : [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rowId = row.taskId || row.id || row.task || row.name;
    if (rowId !== taskId) continue;
    if (typeof row.status === 'string') return row.status.toLowerCase();
    if (typeof row.state === 'string') return row.state.toLowerCase();
  }

  return undefined;
}

function evaluateTaskPreflight({
  contract,
  leases,
  originMain,
  candidateBase,
  boardState,
  writerSnapshot,
}) {
  const blockers = [];
  const warnings = [];

  if (!contract || typeof contract !== 'object') {
    blockers.push({ code: 'MALFORMED_INPUT', message: 'contract must be an object' });
    return { verdict: 'blocked', blockers, warnings };
  }

  // OPS-06B-HARDEN-R1 (§6.C): block before dispatch when the contract's
  // branch/worktree is actively owned by another acquisition. A writerSnapshot
  // of [] means "no active owners". Malformed snapshot fails closed (throws).
  if (writerSnapshot !== undefined) {
    const owned = taskBlocker(
      { branch: contract.branch, worktree: contract.worktree },
      writerSnapshot,
      contract.acquisition_id,
    );
    if (owned) {
      blockers.push({
        code: 'BRANCH_WRITER_HELD',
        message: `${owned.branch} is actively owned by ${owned.owner_label} (acquisition ${owned.owner_acquisition_id})`,
      });
    }
  }

  const allowedPaths = Array.isArray(contract.allowed_paths)
    ? contract.allowed_paths.map(normalizePath).filter(Boolean)
    : [];
  const expectedBase = candidateBase || originMain;

  if (typeof contract.base_sha === 'string' && typeof expectedBase === 'string' && contract.base_sha !== expectedBase) {
    blockers.push({ code: 'BASE_MISMATCH', message: `contract base ${contract.base_sha} does not match origin/main ${expectedBase}` });
  }

  const worktrees = Array.isArray(leases?.worktrees)
    ? leases.worktrees
    : [];

  for (const worktree of worktrees) {
    if (!worktree || typeof worktree !== 'object') continue;
    const state = String(worktree.classification || '').toLowerCase();
    if (state === 'dirty' || state === 'diverged') {
      const name = worktree.path || worktree.branch || 'unknown';
      warnings.push({ code: 'WORKTREE_STATE', message: `${name} is ${state}` });
    }
  }

  const leaseEntries = Array.isArray(leases)
    ? leases
    : Array.isArray(leases?.leases)
      ? leases.leases
      : [];
  if (allowedPaths.length && leaseEntries.length) {
    const overlappingLease = leaseEntries.find((lease) => {
      if (!lease || !Array.isArray(lease.paths)) return false;
      return lease.paths.some((leasePath) => {
        const normalizedLeasePath = normalizePath(leasePath);
        return allowedPaths.some((allowedPath) => detectLeaseConflict([normalizedLeasePath], [allowedPath]));
      });
    });

    if (overlappingLease) {
      blockers.push({
        code: 'SCOPED_LEASE',
        message: `scoped lease overlap on ${overlappingLease.paths?.join(', ')}`,
      });
    }
  }

  const dependencies = Array.isArray(contract.depends_on) ? contract.depends_on : [];
  for (const dependency of dependencies) {
    if (typeof dependency !== 'string') {
      blockers.push({ code: 'DEPENDENCY_FORMAT', message: 'depends_on must be a list of task IDs' });
      continue;
    }

    const state = getDependencyStatus(boardState, dependency);
    if (!isAcceptedDependencyStatus(state)) {
      blockers.push({
        code: 'DEPENDENCY_NOT_READY',
        message: `${dependency} is not accepted/released`,
      });
    }
  }

  return {
    verdict: blockers.length ? 'blocked' : 'ready',
    blockers,
    warnings,
  };
}

function runGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function outputJsonPayload(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function writeInputErrorResult(mode, code, message, additional) {
  const result = {
    verdict: 'blocked',
    blockers: [
      {
        code,
        message,
        ...additional,
      },
    ],
    warnings: [],
  };

  if (mode === 'json') {
    outputJsonPayload(result, 1);
    return;
  }

  console.error(message);
  process.exitCode = 1;
}

function parseArguments() {
  const args = new Map();
  const values = process.argv.slice(2);
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (!current.startsWith('--')) {
      throw new Error(`unexpected argument: ${current}`);
    }
    if (current === '--json') {
      args.set('json', true);
      continue;
    }
    if (current === '--fetch') {
      args.set('fetch', true);
      continue;
    }

    const value = values[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${current}`);
    }
    args.set(current.slice(2), value);
    index += 1;
  }
  return args;
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function readStatus(root, shouldFetch) {
  const statusCommand = process.env.MDG_TASK_PREFLIGHT_STATUS_SCRIPT || statusScriptPath;
  const args = ['--json'];
  if (shouldFetch) args.push('--fetch');
  const report = execFileSync(process.execPath, [statusCommand, ...args], {
    encoding: 'utf8',
    cwd: root || process.cwd(),
  });
  return JSON.parse(report);
}

function main() {
  let args;
  let useJson;
  let shouldFetch;
  let contractPath;
  let boardStatePath;
  let contract;
  let boardState;
  let contractResolved;
  let boardStateResolved;

  try {
    args = parseArguments();
  } catch (error) {
    const isJson = process.argv.includes('--json');
    if (isJson) {
      outputJsonPayload({
        verdict: 'blocked',
        blockers: [{ code: 'INVALID_ARGUMENT', message: error.message }],
        warnings: [],
      }, 1);
      return;
    }
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  useJson = args.get('json') === true;
  shouldFetch = args.get('fetch') === true;
  contractPath = args.get('contract');
  boardStatePath = args.get('board-state');

  if (!contractPath) {
    if (useJson) {
      writeInputErrorResult('json', 'MISSING_INPUT', 'required argument: --contract');
    } else {
      console.error('required argument: --contract');
      process.exitCode = 1;
    }
    return;
  }

  if (!boardStatePath) {
    if (useJson) {
      writeInputErrorResult('json', 'MISSING_INPUT', 'required argument: --board-state');
    } else {
      console.error('required argument: --board-state');
      process.exitCode = 1;
    }
    return;
  }

  try {
    const repoRoot = findRepoRoot(process.cwd());
    contractResolved = resolveInputPath(contractPath, repoRoot);
    boardStateResolved = resolveInputPath(boardStatePath, repoRoot);
    contract = readJsonFile(contractResolved);
    boardState = readJsonFile(boardStateResolved);
    const status = readStatus(repoRoot, shouldFetch);
    const leaseReportFromStatus = Array.isArray(status.leases) ? status.leases : readLeases(repoRoot).leases;
    leaseReportFromStatus.sort((a, b) => {
      if (!a.file || !b.file) return 0;
      return a.file.localeCompare(b.file);
    });
    const leasesReport = {
      leases: leaseReportFromStatus,
      worktrees: status.worktrees || [],
    };
    // OPS-06B-HARDEN-R1 (§6.C): read the branch-writer snapshot through the CLI
    // boundary. Malformed writer state fails closed (snapshot() throws).
    let writerSnapshot;
    try {
      writerSnapshot = require(path.resolve(__dirname, '../git/mdg-branch-writer.cjs')).snapshot(repoRoot);
    } catch (error) {
      writerSnapshot = undefined; // no writer directory / unreadable -> not blocked here
      if (error && /BRANCH_WRITER_RECORD/.test(String(error.message))) {
        // Malformed writer state must fail closed.
        if (useJson) {
          writeInputErrorResult('json', 'BRANCH_WRITER_STATE_MALFORMED', error.message);
          return;
        }
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
    }
    const result = evaluateTaskPreflight({
      contract,
      leases: leasesReport,
      originMain: status.originMain,
      candidateBase: status.originMain,
      boardState,
      writerSnapshot,
    });

    if (useJson) {
      outputJsonPayload(result, result.verdict === 'blocked' ? 1 : 0);
      return;
    }

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.verdict === 'blocked') process.exitCode = 1;
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (error.path) {
        if (error.path === contractPath || error.path === contractResolved) {
          if (useJson) {
            writeInputErrorResult('json', 'UNREADABLE_INPUT', `unable to read ${contractResolved}`);
            return;
          }
          console.error(`unable to read ${contractResolved}`);
        } else if (error.path === boardStatePath || error.path === boardStateResolved) {
          if (useJson) {
            writeInputErrorResult('json', 'UNREADABLE_INPUT', `unable to read ${boardStateResolved}`);
            return;
          }
          console.error(`unable to read ${boardStateResolved}`);
        } else {
          if (useJson) {
            writeInputErrorResult('json', 'READ_ERROR', error.message);
            return;
          }
          console.error(error.message);
        }
      } else {
        if (useJson) {
          writeInputErrorResult('json', 'READ_ERROR', error.message);
          return;
        }
        console.error(error.message);
      }
    } else if (error instanceof SyntaxError) {
      if (error.path) {
        if (useJson) {
          writeInputErrorResult('json', 'MALFORMED_INPUT', `invalid JSON ${error.path}: ${error.message}`);
          return;
        }
        console.error(`invalid JSON: ${error.message}`);
      } else {
        if (useJson) {
          writeInputErrorResult('json', 'MALFORMED_INPUT', `invalid JSON: ${error.message}`);
          return;
        }
        console.error(`invalid JSON: ${error.message}`);
      }
    } else {
      if (useJson) {
        writeInputErrorResult('json', 'PRELIGHT_ERROR', error.message);
        return;
      }
      console.error(error.message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { evaluateTaskPreflight };
