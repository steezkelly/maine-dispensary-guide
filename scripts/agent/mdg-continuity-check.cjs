#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
const { resolve: resolvePath, isAbsolute } = require('node:path');

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeState(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeTaskStatus(task) {
  if (!task || typeof task !== 'object') return '';

  if (Object.prototype.hasOwnProperty.call(task, 'status')) {
    return normalizeState(task.status);
  }

  return normalizeState(task.state);
}

function toDateTime(value) {
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid datetime: ${String(value)}`);
  }

  return parsed;
}

function normalizeLeasePaths(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim().replace(/\\/g, '/').replace(/\/+$/, ''))
    .filter(Boolean)
    .sort();
}

function getLeasePaths(task) {
  if (!task || typeof task !== 'object') return [];

  const candidates = [
    task.lease_paths,
    task.leasePaths,
    task.lease,
    task.leases,
    task.paths,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLeasePaths(candidate);
    if (normalized.length) return normalized;
  }

  return [];
}

function getHandoffFields(task) {
  return {
    blockingReason: normalizeField(task.blocking_reason || task.blockingReason),
    blockedBy: normalizeField(task.blocked_by || task.blockedBy),
    nextAction: normalizeField(task.next_action || task.nextAction),
    nextCheckAt: normalizeField(task.nextCheckAt || task.next_check_at),
  };
}

function normalizeField(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '';
  }

  if (typeof value === 'number') return String(value);

  return '';
}

function hasPathOverlap(left, right) {
  if (!left || !right || left === right) return left === right;
  const leftPath = left.endsWith('/') ? left.slice(0, -1) : left;
  const rightPath = right.endsWith('/') ? right.slice(0, -1) : right;
  return leftPath.startsWith(`${rightPath}/`) || rightPath.startsWith(`${leftPath}/`);
}

function hasLeaseCollision(candidatePaths, inProgressTask) {
  if (!candidatePaths.length) return false;
  const activePaths = getLeasePaths(inProgressTask);
  if (!activePaths.length) return false;

  return candidatePaths.some((candidatePath) =>
    activePaths.some((activePath) => hasPathOverlap(candidatePath, activePath)),
  );
}

function isDependencySatisfied(task, dependencyTaskMap) {
  if (!Array.isArray(task)) return true;

  return task.every((dependencyId) => {
    if (typeof dependencyId !== 'string') return false;
    const dependency = dependencyTaskMap.get(normalizeId(dependencyId));
    if (!dependency || typeof dependency !== 'object') return false;

    const state = normalizeTaskStatus(dependency);
    return state === 'accepted' || state === 'released';
  });
}

function getSortedBlockedByNextCheck(blockedTasks) {
  return blockedTasks
    .map((task) => {
      const fields = getHandoffFields(task);
      return {
        id: normalizeId(task.id),
        nextCheckAt: toDateTime(fields.nextCheckAt),
      };
    })
    .sort((a, b) => a.nextCheckAt.getTime() - b.nextCheckAt.getTime());
}

function getBlockedHandoffProblem(task) {
  const fields = getHandoffFields(task);
  const missing = [];

  if (!fields.blockingReason) missing.push('blocking_reason');
  if (!fields.blockedBy) missing.push('blocked_by');
  if (!fields.nextAction) missing.push('next_action');
  if (!fields.nextCheckAt) missing.push('nextCheckAt');

  if (!missing.length) {
    try {
      toDateTime(fields.nextCheckAt);
    } catch {
      missing.push('nextCheckAt');
    }
  }

  if (!missing.length) return null;

  return {
    taskId: normalizeId(task.id),
    missing,
  };
}

function nextAction(tasks, now) {
  const nowDate = now ? toDateTime(now) : new Date();
  const taskList = Array.isArray(tasks) ? tasks : [];

  const byId = new Map();
  for (const task of taskList) {
    if (!task || typeof task !== 'object') continue;
    const id = normalizeId(task.id);
    if (id) byId.set(id, task);
  }

  const inProgressTasks = taskList.filter((task) => normalizeTaskStatus(task) === 'in_progress');
  const blockedTasks = taskList.filter((task) => normalizeTaskStatus(task) === 'blocked');

  const dispatchable = taskList
    .filter((task) => {
      if (!task || typeof task !== 'object') return false;
      if (normalizeTaskStatus(task) !== 'ready') return false;
      if (!isDependencySatisfied(Array.isArray(task.depends_on) ? task.depends_on : [], byId)) return false;
      const candidatePaths = getLeasePaths(task);
      return !inProgressTasks.some((activeTask) => hasLeaseCollision(candidatePaths, activeTask));
    });

  if (dispatchable.length > 0) {
    const selectedTask = dispatchable[0];
    return {
      kind: 'dispatch',
      action: 'dispatch',
      taskId: normalizeId(selectedTask.id),
      details: {
        reason: 'ready task selected',
      },
    };
  }

  if (inProgressTasks.length > 0) {
    return {
      kind: 'continue-reconnaissance',
      action: 'continue-reconnaissance',
      taskId: normalizeId(inProgressTasks[0].id),
      details: {
        reason: 'in-progress tasks require continuation while no ready tasks exist',
        runningTasks: inProgressTasks
          .map((task) => normalizeId(task.id))
          .filter(Boolean),
      },
    };
  }

  if (blockedTasks.length > 0) {
    for (const task of blockedTasks) {
      const problem = getBlockedHandoffProblem(task);
      if (problem) {
        return {
          kind: 'escalate-missing-trigger',
          action: 'escalate-missing-trigger',
          taskId: problem.taskId,
          details: {
            reason: 'blocked task missing required handoff metadata',
            missing: problem.missing,
          },
        };
      }
    }

    const ordered = getSortedBlockedByNextCheck(blockedTasks);
    if (ordered.length > 0) {
      const earliest = ordered[0];
      if (nowDate < earliest.nextCheckAt) {
        return {
          kind: 'inactive-with-trigger',
          action: 'inactive-with-trigger',
          taskId: earliest.id,
          details: {
            reason: 'board is blocked until trigger time',
            nextCheckAt: earliest.nextCheckAt.toISOString(),
          },
        };
      }

      return {
        kind: 'inactive-with-trigger',
        action: 'inactive-with-trigger',
        taskId: earliest.id,
        details: {
          reason: 'board is blocked and next trigger time has been reached',
          nextCheckAt: earliest.nextCheckAt.toISOString(),
          now: nowDate.toISOString(),
        },
      };
    }
  }

  return {
    kind: 'idle',
    action: 'idle',
    taskId: null,
    details: {
      reason: 'no ready tasks and no active continuity signal',
    },
  };
}

function parseArguments(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`unexpected argument: ${arg}`);
    }

    if (arg === '--json') {
      args.set('json', true);
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${arg}`);
    }

    args.set(arg.slice(2), value);
    index += 1;
  }

  return args;
}

function readBoardState(rawBoardState) {
  if (typeof rawBoardState !== 'string') {
    throw new Error('BOARD_STATE_MISSING');
  }

  const trimmed = rawBoardState.trim();

  if ((trimmed.startsWith('[') || trimmed.startsWith('{')) && trimmed.endsWith(trimmed.startsWith('[') ? ']' : '}')) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`invalid JSON for --board-state: ${error.message}`);
    }
  }

  const boardPath = isAbsolute(trimmed) ? trimmed : resolvePath(process.cwd(), trimmed);
  try {
    const raw = readFileSync(boardPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`unable to read board state file: ${boardPath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`invalid JSON in board state file ${boardPath}: ${error.message}`);
    }
    throw new Error(error.message);
  }
}

function extractTaskList(boardState) {
  if (Array.isArray(boardState)) return boardState;
  if (boardState && Array.isArray(boardState.tasks)) return boardState.tasks;
  if (boardState && typeof boardState === 'object') return [];
  return [];
}

function outputJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function outputHuman(payload) {
  process.stdout.write(
    `${payload.kind} ${payload.taskId || ''}\n${JSON.stringify(payload.details)}\n`,
  );
}

function runCli() {
  let args;
  try {
    args = parseArguments(process.argv.slice(2));
  } catch (error) {
    if (process.argv.includes('--json')) {
      outputJson({
        kind: 'blocked',
        action: 'blocked',
        taskId: null,
        details: {
          reason: error.message,
        },
      }, 1);
      return;
    }

    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const useJson = args.get('json') === true;
  const boardStateInput = args.get('board-state');
  const nowInput = args.get('now');

  if (!boardStateInput) {
    if (useJson) {
      outputJson({
        kind: 'blocked',
        action: 'blocked',
        taskId: null,
        details: { reason: 'required argument --board-state' },
      }, 1);
      return;
    }

    console.error('required argument --board-state');
    process.exitCode = 1;
    return;
  }

  let tasks;
  try {
    const boardState = readBoardState(boardStateInput);
    tasks = extractTaskList(boardState);
  } catch (error) {
    if (useJson) {
      outputJson({
        kind: 'blocked',
        action: 'blocked',
        taskId: null,
        details: { reason: error.message },
      }, 1);
      return;
    }

    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  let parsedNow = null;
  try {
    parsedNow = nowInput ? toDateTime(nowInput) : new Date();
  } catch (error) {
    if (useJson) {
      outputJson({
        kind: 'blocked',
        action: 'blocked',
        taskId: null,
        details: { reason: error.message },
      }, 1);
      return;
    }

    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const decision = nextAction(tasks, parsedNow);
  const payload = {
    schema: 'mdg-agent-continuity/v1',
    now: parsedNow.toISOString(),
    ...decision,
  };

  if (useJson) {
    outputJson(payload, decision.kind === 'escalate-missing-trigger' ? 1 : 0);
    return;
  }

  if (decision.kind === 'escalate-missing-trigger') {
    outputHuman(payload);
    process.exitCode = 1;
    return;
  }

  outputHuman(payload);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  nextAction,
};
