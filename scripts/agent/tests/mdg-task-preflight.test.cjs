const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { evaluateTaskPreflight } = require('../mdg-task-preflight.cjs');

const cliPath = path.resolve(__dirname, '../mdg-task-preflight.cjs');

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

function withTempWorkspace(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-preflight-'));
  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value));
}

function writeStatusScript(root, options = {}) {
  const payload = options.payload || {
    originMain: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
    leases: [],
    worktrees: [],
  };
  const logFile = options.logFile || null;
  const scriptPath = path.join(root, 'status-fixture.cjs');
  const scriptSource = `
    const fs = require('node:fs');
    const logFile = ${JSON.stringify(logFile)};
    if (logFile) {
      fs.writeFileSync(logFile, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }), { encoding: 'utf8' });
    }
    process.stdout.write(${JSON.stringify(JSON.stringify(payload))});
  `;
  fs.writeFileSync(scriptPath, scriptSource, { encoding: 'utf8' });
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function readJson(pathToFile) {
  return JSON.parse(fs.readFileSync(pathToFile, 'utf8'));
}

function baseContract() {
  return {
    id: 'MDG-WORKFLOW-004',
    parent: 'MDG-WORKFLOW-003',
    role: 'codex-author',
    base_sha: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
    branch: 'feat/mdg-task-preflight-2026-07-14',
    worktree: '/tmp/mdg-task-preflight-20260714',
    allowed_paths: ['scripts/agent/mdg-task-preflight.cjs'],
    acceptance: ['node --test scripts/agent/tests/mdg-task-preflight.test.cjs'],
    depends_on: ['MDG-WORKFLOW-002'],
    lease_ttl_minutes: 120,
    stop_condition: 'Stop after tests pass.',
  };
}

test('returns ready when base matches origin and no lease overlaps scoped paths', () => {
  const result = evaluateTaskPreflight({
    contract: {
      ...baseContract(),
      depends_on: ['MDG-WORKFLOW-002', 'MDG-WORKFLOW-003'],
    },
    leases: {
      leases: [{ paths: ['scripts/agent/tests/validate-task-contract.test.cjs'] }],
      worktrees: [],
    },
    originMain: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
    candidateBase: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
    boardState: {
      'MDG-WORKFLOW-002': 'accepted',
      'MDG-WORKFLOW-003': 'released',
    },
  });

  assert.equal(result.verdict, 'ready');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 0);
});

test('blocks when any shared lease overlaps allowed paths', () => {
  const result = evaluateTaskPreflight({
    contract: baseContract(),
    leases: {
      leases: [
        { paths: ['scripts/agent/mdg-task-preflight.cjs'] },
        { paths: ['scripts/agent/tests/validate-task-contract.test.cjs'] },
      ],
      worktrees: [],
    },
    originMain: baseContract().base_sha,
    candidateBase: baseContract().base_sha,
    boardState: { 'MDG-WORKFLOW-002': 'accepted' },
  });

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.blockers.some((entry) => entry.code === 'SCOPED_LEASE'), true);
});

test('blocks when contract base differs from origin main', () => {
  const contract = baseContract();
  const result = evaluateTaskPreflight({
    contract: { ...contract, base_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    leases: { leases: [], worktrees: [] },
    originMain: contract.base_sha,
    candidateBase: contract.base_sha,
    boardState: { 'MDG-WORKFLOW-002': 'accepted' },
  });

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.blockers.some((entry) => entry.code === 'BASE_MISMATCH'), true);
});

test('warns but does not block for unrelated dirty or diverged worktrees', () => {
  const result = evaluateTaskPreflight({
    contract: baseContract(),
    leases: {
      leases: [],
      worktrees: [
        { branch: 'feature/other', path: '/tmp/other-worktree', classification: 'dirty' },
        { branch: 'feature/stale', path: '/tmp/stale-worktree', classification: 'diverged' },
      ],
    },
    originMain: baseContract().base_sha,
    candidateBase: baseContract().base_sha,
    boardState: { 'MDG-WORKFLOW-002': 'accepted' },
  });

  assert.equal(result.verdict, 'ready');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 2);
});

test('blocks when a declared dependency is not accepted or released', () => {
  const result = evaluateTaskPreflight({
    contract: {
      ...baseContract(),
      depends_on: ['MDG-WORKFLOW-002', 'MDG-WORKFLOW-999'],
    },
    leases: { leases: [], worktrees: [] },
    originMain: baseContract().base_sha,
    candidateBase: baseContract().base_sha,
    boardState: {
      'MDG-WORKFLOW-002': 'accepted',
      'MDG-WORKFLOW-999': 'in_progress',
    },
  });

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.blockers.some((entry) => entry.code === 'DEPENDENCY_NOT_READY'), true);
});

test('cli rejects malformed required input with non-zero status', () => {
  const result = runCli(['--contract', path.join(os.tmpdir(), 'missing.json'), '--board-state', path.join(os.tmpdir(), 'missing.json')]);
  assert.equal(result.status, 1);
  assert.equal(result.stderr.includes('unable to read'), true);
});

test('cli validates required inputs before git/status calls', () => {
  withTempWorkspace((root) => {
    const contractPath = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    const nested = path.join(root, 'subdir');
    fs.mkdirSync(nested);
    const result = runCli(
      ['--json', '--contract', contractPath, '--board-state', boardPath],
      {
        cwd: nested,
      },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stderr.includes('fatal: not a git repository'), false);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.verdict, 'blocked');
    assert.equal(parsed.blockers.some((entry) => entry.code === 'UNREADABLE_INPUT'), true);
  });
});

test('cli --json returns blocked preflight JSON and exit 1', () => {
  withTempWorkspace((root) => {
    const contractPath = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    const statusLog = path.join(root, 'status.log');
    fs.mkdirSync(path.join(root, '.git'));
    writeJsonFile(contractPath, { ...baseContract(), base_sha: '0000000000000000000000000000000000000000' });
    writeJsonFile(boardPath, { 'MDG-WORKFLOW-002': 'accepted' });

    const statusPath = writeStatusScript(root, {
      payload: {
        originMain: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
        leases: [],
        worktrees: [],
      },
      logFile: statusLog,
    });

    const result = runCli(
      ['--json', '--contract', contractPath, '--board-state', boardPath],
      { env: { MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath } },
    );
    assert.equal(result.status, 1);
    const parsed = readJson(contractPath);
    assert.equal(parsed.base_sha, '0000000000000000000000000000000000000000');
    const parsedResult = JSON.parse(result.stdout);
    assert.equal(parsedResult.verdict, 'blocked');
    assert.equal(parsedResult.blockers.some((entry) => entry.code === 'BASE_MISMATCH'), true);
  });
});

test('cli --json malformed input returns structured blocked JSON and exit 1', () => {
  withTempWorkspace((root) => {
    const malformedContract = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    const statusLog = path.join(root, 'status.log');
    fs.writeFileSync(malformedContract, '{"id":1');
    writeJsonFile(boardPath, { 'MDG-WORKFLOW-002': 'accepted' });
    const statusPath = writeStatusScript(root, {
      logFile: statusLog,
      payload: {
        originMain: '2d91d0a05c9510d27bc793627f9db58d87ffe858',
        leases: [],
        worktrees: [],
      },
    });

    const result = runCli(
      ['--json', '--contract', malformedContract, '--board-state', boardPath],
      { env: { MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath } },
    );

    assert.equal(result.status, 1);
    assert.doesNotThrow(() => {
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.verdict, 'blocked');
      assert.equal(parsed.blockers.some((entry) => entry.code === 'MALFORMED_INPUT'), true);
    });
    assert.equal(fs.existsSync(statusLog), false);
  });
});

test('cli only passes --fetch to status when requested', () => {
  withTempWorkspace((root) => {
    const contractPath = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    const statusLog = path.join(root, 'status.log');
    writeJsonFile(contractPath, baseContract());
    writeJsonFile(boardPath, { 'MDG-WORKFLOW-002': 'accepted' });

    const statusPath = writeStatusScript(root, {
      logFile: statusLog,
      payload: {
        originMain: baseContract().base_sha,
        leases: [],
        worktrees: [],
      },
    });

    const first = runCli(
      ['--json', '--contract', contractPath, '--board-state', boardPath],
      { env: { MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath } },
    );
    assert.equal(first.status, 0);
    const withoutFetchArgs = JSON.parse(fs.readFileSync(statusLog, 'utf8'));
    assert.equal(withoutFetchArgs.args.includes('--fetch'), false);

    const second = runCli(
      ['--json', '--fetch', '--contract', contractPath, '--board-state', boardPath],
      { env: { MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath } },
    );
    assert.equal(second.status, 0);
    const withFetchArgs = JSON.parse(fs.readFileSync(statusLog, 'utf8'));
    assert.equal(withFetchArgs.args.includes('--fetch'), true);
  });
});

test('cli resolves required inputs from repo root when run from nested working directory', () => {
  withTempWorkspace((root) => {
    const contractPath = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    const statusLog = path.join(root, 'status.log');
    const nested = path.join(root, 'a', 'b', 'c');
    fs.mkdirSync(nested, { recursive: true });
    fs.mkdirSync(path.join(root, '.git'));

    writeJsonFile(contractPath, baseContract());
    writeJsonFile(boardPath, { 'MDG-WORKFLOW-002': 'accepted' });

    const statusPath = writeStatusScript(root, {
      logFile: statusLog,
      payload: {
        originMain: baseContract().base_sha,
        leases: [],
        worktrees: [],
      },
    });

    const result = runCli(
      ['--json', '--contract', 'contract.json', '--board-state', 'board.json'],
      {
        cwd: nested,
        env: {
          MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath,
        },
      },
    );

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.verdict, 'ready');
    const statusRun = JSON.parse(fs.readFileSync(statusLog, 'utf8'));
    assert.equal(path.normalize(statusRun.cwd), path.normalize(root));
  });
});

test('cli does not block on unrelated lease paths', () => {
  withTempWorkspace((root) => {
    const contractPath = path.join(root, 'contract.json');
    const boardPath = path.join(root, 'board.json');
    writeJsonFile(contractPath, baseContract());
    writeJsonFile(boardPath, { 'MDG-WORKFLOW-002': 'accepted' });

    const statusLog = path.join(root, 'status.log');
    const statusPath = writeStatusScript(root, {
      logFile: statusLog,
      payload: {
        originMain: baseContract().base_sha,
        leases: [{ paths: ['scripts/agent/tests/other.test.cjs'] }],
        worktrees: [],
      },
    });

    const result = runCli(
      ['--json', '--contract', contractPath, '--board-state', boardPath],
      {
        env: {
          MDG_TASK_PREFLIGHT_STATUS_SCRIPT: statusPath,
        },
      },
    );

    assert.equal(result.status, 0);
    assert.doesNotThrow(() => {
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.verdict, 'ready');
      assert.equal(parsed.blockers.some((entry) => entry.code === 'SCOPED_LEASE'), false);
    });
    const statusRun = JSON.parse(fs.readFileSync(statusLog, 'utf8'));
    assert.equal(Array.isArray(statusRun.args), true);
  });
});
