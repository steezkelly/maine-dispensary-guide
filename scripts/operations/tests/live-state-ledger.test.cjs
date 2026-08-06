#!/usr/bin/env node
'use strict';

/**
 * Regression coverage for the private live-state coordination ledger.
 * Every subprocess receives an isolated external ledger path; tests never
 * write to the repository or the real operator ledger.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(REPO_ROOT, 'scripts', 'operations', 'live-state-ledger.cjs');

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-live-state-ledger-test-'));
  return { root, ledgerPath: path.join(root, 'state', 'ledger.jsonl') };
}

function run(args, ledgerPath) {
  return childProcess.spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, MDG_LIVE_STATE_LEDGER_PATH: ledgerPath },
  });
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('record creates a private append-only entry with the intentional workflow state', () => {
  const fixture = makeFixture();
  try {
    const result = run([
      'record', '--workflow', 'W14', '--action', 'activate', '--actor', 'operator',
      '--reason', 'Manual activation for lead-email testing', '--source', 'n8n-cli',
    ], fixture.ledgerPath);

    assert.equal(result.status, 0, result.stderr);
    const response = JSON.parse(result.stdout);
    assert.equal(response.outcome, 'recorded');
    assert.equal(response.entry.workflow, 'W14');
    assert.equal(response.entry.action, 'activate');
    assert.equal(response.entry.actor, 'operator');
    assert.equal(response.entry.source, 'n8n-cli');
    assert.match(response.entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(fs.statSync(fixture.ledgerPath).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.dirname(fixture.ledgerPath)).mode & 0o777, 0o700);
  } finally {
    cleanup(fixture.root);
  }
});

test('check returns the most recent unexpired intentional change for a workflow', () => {
  const fixture = makeFixture();
  try {
    assert.equal(run([
      'record', '--workflow', 'W14', '--action', 'activate', '--actor', 'operator',
      '--reason', 'Manual activation for lead-email testing', '--source', 'ui',
    ], fixture.ledgerPath).status, 0);
    assert.equal(run([
      'record', '--workflow', 'W99', '--action', 'deactivate', '--actor', 'agent:review-1',
      '--reason', 'Synthetic unrelated state change', '--source', 'api',
    ], fixture.ledgerPath).status, 0);

    const result = run(['check', '--workflow', 'W14', '--max-age-hours', '24'], fixture.ledgerPath);
    assert.equal(result.status, 0, result.stderr);
    const response = JSON.parse(result.stdout);
    assert.equal(response.outcome, 'recent-entry');
    assert.equal(response.entry.workflow, 'W14');
    assert.equal(response.entry.action, 'activate');
  } finally {
    cleanup(fixture.root);
  }
});

test('check fails closed for an unexplained workflow and tail is read-only', () => {
  const fixture = makeFixture();
  try {
    assert.equal(run([
      'record', '--workflow', 'W14', '--action', 'activate', '--actor', 'operator',
      '--reason', 'Manual activation for lead-email testing', '--source', 'ui',
    ], fixture.ledgerPath).status, 0);
    const before = fs.readFileSync(fixture.ledgerPath, 'utf8');

    const unknown = run(['check', '--workflow', 'W00'], fixture.ledgerPath);
    assert.equal(unknown.status, 1);
    assert.deepEqual(JSON.parse(unknown.stdout), { outcome: 'no-recent-entry', workflow: 'W00' });

    const tail = run(['tail', '--limit', '10'], fixture.ledgerPath);
    assert.equal(tail.status, 0, tail.stderr);
    assert.equal(JSON.parse(tail.stdout).entries.length, 1);
    assert.equal(fs.readFileSync(fixture.ledgerPath, 'utf8'), before);
  } finally {
    cleanup(fixture.root);
  }
});

test('refuses invalid records and a ledger path inside the repository', () => {
  const fixture = makeFixture();
  try {
    const invalid = run([
      'record', '--workflow', 'W14', '--action', 'restart', '--actor', 'operator',
      '--reason', 'Invalid action', '--source', 'ui',
    ], fixture.ledgerPath);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /LIVE_STATE_LEDGER_INVALID_ACTION/);

    const insideRepo = path.join(REPO_ROOT, '.live-state-ledger-test.jsonl');
    const unsafe = run(['tail'], insideRepo);
    assert.equal(unsafe.status, 1);
    assert.match(unsafe.stderr, /LIVE_STATE_LEDGER_PATH_INSIDE_REPO/);

    const symlinkParent = path.join(fixture.root, 'repo-alias');
    fs.symlinkSync(REPO_ROOT, symlinkParent);
    const escaped = run([
      'record', '--workflow', 'W14', '--action', 'activate', '--actor', 'operator',
      '--reason', 'Must not follow a path into the repository', '--source', 'ui',
    ], path.join(symlinkParent, '.live-state-ledger-test.jsonl'));
    assert.equal(escaped.status, 1);
    assert.match(escaped.stderr, /LIVE_STATE_LEDGER_PATH_INSIDE_REPO/);
  } finally {
    cleanup(fixture.root);
  }
});
