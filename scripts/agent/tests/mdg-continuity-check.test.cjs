const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const { nextAction } = require('../mdg-continuity-check.cjs');

const cliPath = path.resolve(__dirname, '../mdg-continuity-check.cjs');

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function readJson(payload) {
  return JSON.parse(payload);
}

test('first ready task dispatches', () => {
  const decision = nextAction([
    { id: 'alpha', state: 'ready' },
    { id: 'bravo', state: 'ready' },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'alpha');
});

test('an in-progress author does not block dispatching a ready task', () => {
  const decision = nextAction([
    { id: 'author', state: 'in_progress', paths: ['apps/maine-cannabis/src/pages/blocked.astro'] },
    { id: 'ready-task', state: 'ready', depends_on: ['parent-1'] },
    { id: 'parent-1', state: 'accepted' },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'ready-task');
});

test('whole-board blocked tasks with complete handoff data return inactive-with-trigger before check time', () => {
  const now = new Date('2026-07-14T10:30:00Z');
  const decision = nextAction([
    {
      id: 'blocked-1',
      state: 'blocked',
      blocking_reason: 'waiting for external handoff',
      blocked_by: 'team',
      next_action: 'poll dependency',
      nextCheckAt: '2026-07-14T11:00:00Z',
    },
    {
      id: 'blocked-2',
      state: 'blocked',
      blocking_reason: 'waiting for reviewer',
      blocked_by: 'reviewer',
      next_action: 'await release',
      nextCheckAt: '2026-07-14T10:45:00Z',
    },
  ], now);

  assert.equal(decision.kind, 'inactive-with-trigger');
  assert.equal(decision.taskId, 'blocked-2');
  assert.equal(decision.details.nextCheckAt, '2026-07-14T10:45:00.000Z');
});

test('a blocked task missing required handoff fields escalates', () => {
  const decision = nextAction([
    {
      id: 'blocked-bad',
      state: 'blocked',
      blocking_reason: 'waiting for owner',
      blocked_by: 'coordinator',
      nextCheckAt: '2026-07-14T11:00:00Z',
    },
  ]);

  assert.equal(decision.kind, 'escalate-missing-trigger');
  assert.equal(decision.taskId, 'blocked-bad');
  assert.deepEqual(decision.details.missing, ['next_action']);
});

test('only ready tasks with satisfied dependencies are dispatchable', () => {
  const decision = nextAction([
    { id: 'parent', state: 'accepted' },
    { id: 'blocked-ready', state: 'ready', depends_on: ['parent'] },
    { id: 'waiting-ready', state: 'ready', depends_on: ['parent-2'] },
    { id: 'parent-2', state: 'in_progress' },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'blocked-ready');
});

test('ready task colliding with an active lease path is filtered out', () => {
  const decision = nextAction([
    {
      id: 'in-progress-task',
      state: 'in_progress',
      paths: ['apps/maine-cannabis/src/components/Header.astro'],
    },
    {
      id: 'blocked-by-lease',
      state: 'ready',
      paths: ['apps/maine-cannabis/src/components/Header.astro'],
    },
    {
      id: 'safe-task',
      state: 'ready',
      paths: ['apps/maine-cannabis/src/components/Footer.astro'],
    },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'safe-task');
});

test('reports continue-reconnaissance when no tasks can be dispatched and authors are running', () => {
  const decision = nextAction([
    { id: 'author', state: 'in_progress', role: 'continuity-watcher' },
    { id: 'blocked-task', state: 'blocked', blocking_reason: 'waiting', blocked_by: 'ops', next_action: 'resume', nextCheckAt: '2026-07-14T12:00:00Z' },
  ]);

  assert.equal(decision.kind, 'continue-reconnaissance');
  assert.equal(decision.taskId, 'author');
  assert.equal(decision.details.runningTasks[0], 'author');
});

test('dispatches ready tasks even when a different blocked task has malformed handoff metadata', () => {
  const decision = nextAction([
    { id: 'ready-task', status: 'ready' },
    {
      id: 'blocked-bad',
      state: 'blocked',
      blocking_reason: 'waiting for owner',
      blocked_by: 'coordinator',
      nextCheckAt: '2026-07-14T11:00:00Z',
    },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'ready-task');
});

test('continues in-progress work when a malformed blocked task is present but no task is dispatchable', () => {
  const decision = nextAction([
    { id: 'author', status: 'in_progress', role: 'continuity-watcher' },
    {
      id: 'blocked-bad',
      state: 'blocked',
      blocking_reason: 'waiting for owner',
      blocked_by: 'coordinator',
      nextCheckAt: '2026-07-14T11:00:00Z',
    },
  ]);

  assert.equal(decision.kind, 'continue-reconnaissance');
  assert.equal(decision.taskId, 'author');
});

test('respects status over legacy state when both are present', () => {
  const decision = nextAction([
    { id: 'ready-by-status', state: 'blocked', status: 'ready' },
    { id: 'blocked', status: 'blocked', blocking_reason: 'waiting', blocked_by: 'owner', next_action: 'pause', nextCheckAt: '2026-07-14T11:00:00Z' },
  ]);

  assert.equal(decision.kind, 'dispatch');
  assert.equal(decision.taskId, 'ready-by-status');
});

test('cli emits stable JSON and deterministic dispatch with --json', () => {
  const boardState = {
    tasks: [
      { id: 'ready-1', state: 'ready' },
      { id: 'ready-2', state: 'ready' },
    ],
  };

  const result = runCli([
    '--json',
    '--board-state',
    JSON.stringify(boardState),
    '--now',
    '2026-07-14T09:00:00Z',
  ]);

  assert.equal(result.status, 0);
  const parsed = readJson(result.stdout);
  assert.equal(parsed.schema, 'mdg-agent-continuity/v1');
  assert.equal(parsed.kind, 'dispatch');
  assert.equal(parsed.taskId, 'ready-1');
});

test('cli exits non-zero for blocked task missing trigger metadata', () => {
  const result = runCli([
    '--json',
    '--board-state',
    JSON.stringify({
      tasks: [
        {
          id: 'blocked-bad',
          state: 'blocked',
          blocking_reason: 'waiting',
          blocked_by: 'owner',
          nextCheckAt: '2026-07-14T11:00:00Z',
        },
      ],
    }),
    '--now',
    '2026-07-14T10:00:00Z',
  ]);

  assert.equal(result.status, 1);
  const parsed = readJson(result.stdout);
  assert.equal(parsed.kind, 'escalate-missing-trigger');
  assert.equal(parsed.taskId, 'blocked-bad');
});
