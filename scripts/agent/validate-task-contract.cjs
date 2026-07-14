const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FIELDS = [
  'id',
  'parent',
  'role',
  'base_sha',
  'branch',
  'worktree',
  'allowed_paths',
  'acceptance',
  'depends_on',
  'lease_ttl_minutes',
  'stop_condition'
];

const ROLES = new Set([
  'coordinator',
  'codex-author',
  'verifier',
  'integrator',
  'continuity-watcher'
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateNonEmptyStringArray(contract, field, errors) {
  const value = contract[field];
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${field} must be a non-empty array of non-empty strings`);
    return;
  }

  if (value.some((item) => !isNonEmptyString(item))) {
    errors.push(`${field} must contain only non-empty strings`);
  }
}

function validateTaskContract(contract) {
  const errors = [];
  if (contract === null || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['contract must be an object'];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in contract)) {
      errors.push(`${field} is required`);
    }
  }

  if ('id' in contract && (!isNonEmptyString(contract.id) || !/^MDG-[A-Z0-9-]+$/.test(contract.id))) {
    errors.push('id must match ^MDG-[A-Z0-9-]+$');
  }
  if ('parent' in contract && !isNonEmptyString(contract.parent)) {
    errors.push('parent must be a non-empty string');
  }
  if ('role' in contract && !ROLES.has(contract.role)) {
    errors.push('role must be one of coordinator, codex-author, verifier, integrator, continuity-watcher');
  }
  if ('base_sha' in contract && (typeof contract.base_sha !== 'string' || !/^[0-9a-f]{40}$/.test(contract.base_sha))) {
    errors.push('base_sha must be exactly 40 lowercase hexadecimal characters');
  }
  if ('branch' in contract && !isNonEmptyString(contract.branch)) {
    errors.push('branch must be a non-empty string');
  }
  if ('worktree' in contract && (typeof contract.worktree !== 'string' || !path.isAbsolute(contract.worktree))) {
    errors.push('worktree must be an absolute path');
  }
  if ('allowed_paths' in contract) {
    validateNonEmptyStringArray(contract, 'allowed_paths', errors);
  }
  if ('acceptance' in contract) {
    validateNonEmptyStringArray(contract, 'acceptance', errors);
  }
  if ('depends_on' in contract && !Array.isArray(contract.depends_on)) {
    errors.push('depends_on must be an array');
  }
  if ('lease_ttl_minutes' in contract &&
      (!Number.isInteger(contract.lease_ttl_minutes) || contract.lease_ttl_minutes < 15 || contract.lease_ttl_minutes > 240)) {
    errors.push('lease_ttl_minutes must be an integer between 15 and 240');
  }
  if ('stop_condition' in contract && !isNonEmptyString(contract.stop_condition)) {
    errors.push('stop_condition must be a non-empty string');
  }

  return errors;
}

function runCli(argumentsList) {
  const filePath = argumentsList[0];
  if (!filePath) {
    return ['contract path is required'];
  }

  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [`unable to read contract: ${filePath}`];
  }

  let contract;
  try {
    contract = JSON.parse(text);
  } catch {
    return [`invalid JSON: ${filePath}`];
  }

  return validateTaskContract(contract);
}

if (require.main === module) {
  const errors = runCli(process.argv.slice(2));
  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validateTaskContract };
