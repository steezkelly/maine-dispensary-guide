const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { validateTaskContract } = require('../validate-task-contract.cjs');
const cliPath = path.resolve(__dirname, '../validate-task-contract.cjs');

function validContract() {
  return {
    id: 'MDG-WORKFLOW-002',
    parent: 'MDG-WORKFLOW-001',
    role: 'codex-author',
    base_sha: 'ae1cf4518acfd86c1ba2931dc5ca46e122d0c1f6',
    branch: 'feat/mdg-task-contract-validator',
    worktree: '/tmp/mdg-task-contract-validator',
    allowed_paths: ['scripts/agent/validate-task-contract.cjs'],
    acceptance: ['Validator exports validateTaskContract.'],
    depends_on: [],
    lease_ttl_minutes: 60,
    stop_condition: 'Stop after tests and CLI checks pass.'
  };
}

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8'
  });
}

test('accepts a fully valid task contract', () => {
  assert.deepEqual(validateTaskContract(validContract()), []);
});

test('rejects non-object task contracts with a deterministic error', () => {
  for (const contract of [null, [], 'not a contract']) {
    assert.deepEqual(validateTaskContract(contract), ['contract must be an object']);
  }
});

test('reports every required field when it is missing', () => {
  const errors = validateTaskContract({});
  for (const field of [
    'id', 'parent', 'role', 'base_sha', 'branch', 'worktree', 'allowed_paths',
    'acceptance', 'depends_on', 'lease_ttl_minutes', 'stop_condition'
  ]) {
    assert.ok(errors.some((error) => error.includes(field)), `missing error for ${field}`);
  }
});

test('reports meaningful errors for every constrained validation category', () => {
  const contract = validContract();
  Object.assign(contract, {
    id: 'workflow-002',
    role: 'writer',
    base_sha: 'A'.repeat(40),
    worktree: 'relative/worktree',
    allowed_paths: [''],
    acceptance: [''],
    depends_on: 'MDG-WORKFLOW-001',
    lease_ttl_minutes: 10,
    stop_condition: ''
  });

  const errors = validateTaskContract(contract);
  for (const field of [
    'id', 'role', 'base_sha', 'worktree', 'allowed_paths', 'acceptance',
    'depends_on', 'lease_ttl_minutes', 'stop_condition'
  ]) {
    assert.ok(errors.some((error) => error.includes(field)), `missing error for ${field}`);
  }
});

test('requires parent and branch to be non-empty strings', () => {
  const contract = validContract();
  contract.parent = '  ';
  contract.branch = 42;

  const errors = validateTaskContract(contract);
  assert.ok(errors.some((error) => error.includes('parent')));
  assert.ok(errors.some((error) => error.includes('branch')));
});

test('requires non-empty strings in array fields and an integer lease ttl in range', () => {
  const contract = validContract();
  contract.allowed_paths = [];
  contract.acceptance = ['ok', 3];
  contract.lease_ttl_minutes = 60.5;

  const errors = validateTaskContract(contract);
  assert.ok(errors.some((error) => error.includes('allowed_paths')));
  assert.ok(errors.some((error) => error.includes('acceptance')));
  assert.ok(errors.some((error) => error.includes('lease_ttl_minutes')));
});

test('CLI returns status and stderr that match the contract validation result', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-task-contract-'));
  const validPath = path.join(tempDirectory, 'valid.json');
  const malformedPath = path.join(tempDirectory, 'malformed.json');
  const invalidPath = path.join(tempDirectory, 'invalid.json');
  const missingPath = path.join(tempDirectory, 'missing.json');

  try {
    fs.writeFileSync(validPath, JSON.stringify(validContract()));
    fs.writeFileSync(malformedPath, '{');
    fs.writeFileSync(invalidPath, JSON.stringify({}));

    const validResult = runCli([validPath]);
    assert.equal(validResult.status, 0);
    assert.equal(validResult.stderr, '');

    const noArgumentResult = runCli();
    assert.equal(noArgumentResult.status, 1);
    assert.equal(noArgumentResult.stderr, 'contract path is required\n');

    const unreadableResult = runCli([missingPath]);
    assert.equal(unreadableResult.status, 1);
    assert.equal(unreadableResult.stderr, `unable to read contract: ${missingPath}\n`);

    const malformedResult = runCli([malformedPath]);
    assert.equal(malformedResult.status, 1);
    assert.equal(malformedResult.stderr, `invalid JSON: ${malformedPath}\n`);

    const invalidResult = runCli([invalidPath]);
    assert.equal(invalidResult.status, 1);
    assert.equal(invalidResult.stderr, `id is required
parent is required
role is required
base_sha is required
branch is required
worktree is required
allowed_paths is required
acceptance is required
depends_on is required
lease_ttl_minutes is required
stop_condition is required
`);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
