#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1 Child 1 — CI-wiring contract for the dedicated Operations Suite job.
 *
 * This test asserts that `.github/workflows/ci.yml` keeps a dedicated
 * "Operations Suite" job with the exact operations-test command, so the
 * operations suite cannot silently disappear from CI during later edits.
 *
 * It is intentionally part of the operations suite itself
 * (scripts/operations/tests/*.test.cjs): if someone removes the CI job AND this
 * test, the removal of this test is itself a visible diff; if they remove only
 * the CI job, this test fails. It follows the repo's existing CI-wiring contract
 * pattern (see scripts/check/market-stats-video-ci-wiring.test.cjs).
 *
 * Node built-in test runner. No dependency. Reads the workflow as text and
 * asserts stable patterns — no YAML parser dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const CI_WORKFLOW = path.join(ROOT, '.github/workflows/ci.yml');

function workflow() {
  assert.ok(fs.existsSync(CI_WORKFLOW), 'ci.yml must exist');
  return fs.readFileSync(CI_WORKFLOW, 'utf8');
}

/** Extract one top-level job block by its job key (up to the next top-level job or EOF). */
function jobBlock(yaml, jobKey) {
  // Top-level job keys are exactly 2-space indented (`  build:`, `  operations-suite:`),
  // unlike a job's inner keys (`    name:`, `    steps:` — 4 spaces) or step list
  // items. Slice from the job's line to the next 2-space job key (or EOF).
  const lines = yaml.split('\n');
  const startIdx = lines.findIndex((line) => line === `  ${jobKey}:`);
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^  [a-z0-9][\w-]*:\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n');
}

test('ci.yml has a dedicated Operations Suite job (not hidden inside build)', () => {
  const yaml = workflow();
  const block = jobBlock(yaml, 'operations-suite');
  assert.ok(block, 'ci.yml must define a top-level operations-suite job');
  assert.match(block, /name:\s*Operations Suite/, 'job name must be exactly "Operations Suite" (stable check context)');
});

test('Operations Suite job runs on pull_request to main and push to main', () => {
  const yaml = workflow();
  // The workflow-level triggers cover both; assert they are present and target main.
  assert.match(yaml, /^on:\n\s*push:\n\s*branches:\s*\[main\]\n\s*pull_request:\n\s*branches:\s*\[main\]/m,
    'workflow must trigger on push to main and pull_request to main');
  // The operations-suite job must NOT be gated by an event condition that would
  // skip it on PRs or pushes (no `if:` that restricts it away from main).
  const block = jobBlock(yaml, 'operations-suite');
  assert.ok(!/^\s*if:/m.test(block), 'operations-suite job must run unconditionally on every eligible trigger');
});

test('Operations Suite job uses the pinned Node version and npm ci', () => {
  const yaml = workflow();
  const block = jobBlock(yaml, 'operations-suite');
  assert.match(block, /node-version:\s*\$\{\{\s*env\.NODE_VERSION\s*\}\}/, 'must use the repo-pinned NODE_VERSION');
  assert.match(block, /run:\s*npm ci/, 'must install with npm ci');
});

test('Operations Suite job runs exactly the operations test command', () => {
  const yaml = workflow();
  const block = jobBlock(yaml, 'operations-suite');
  assert.match(block, /run:\s*node --test scripts\/operations\/tests\/\*\.test\.cjs\s*$/,
    'must run exactly: node --test scripts/operations/tests/*.test.cjs');
});

test('Operations Suite job does not require a private ledger or deploy', () => {
  const yaml = workflow();
  const block = jobBlock(yaml, 'operations-suite');
  assert.ok(!/MDG_OPS_ROOT/.test(block), 'job must not reference MDG_OPS_ROOT (synthetic fixtures only)');
  assert.ok(!/vercel/i.test(block), 'job must not invoke Vercel / deploy');
  assert.match(block, /permissions:\n\s*contents:\s*read/, 'job needs only contents: read');
});

test('Operations Suite job is its own job, distinct from the Astro Build job', () => {
  const yaml = workflow();
  const buildBlock = jobBlock(yaml, 'build');
  assert.ok(buildBlock, 'build job must still exist');
  // The operations command must NOT live inside the build job (no hiding).
  assert.ok(!/node --test scripts\/operations\/tests\/\*\.test\.cjs/.test(buildBlock),
    'operations suite must not be hidden inside the general build job');
  // And the dedicated job must exist separately.
  assert.ok(jobBlock(yaml, 'operations-suite'), 'dedicated operations-suite job must exist');
});

test('CI keeps Vercel-App preview verification without a duplicate Vercel CLI deploy path', () => {
  const yaml = workflow();
  for (const jobKey of ['build', 'smoke-test-preview']) {
    assert.ok(jobBlock(yaml, jobKey), `${jobKey} job must remain present`);
  }
  for (const jobKey of ['deploy-preview', 'deploy-production', 'smoke-test-production']) {
    assert.equal(jobBlock(yaml, jobKey), null, `${jobKey} must not duplicate the Vercel App and post-deploy verifier`);
  }
  const smokePreview = jobBlock(yaml, 'smoke-test-preview');
  assert.ok(!/needs:\s*deploy-preview/.test(smokePreview), 'preview smoke must resolve the Vercel App preview directly');
  assert.match(smokePreview, /resolve-preview-url\.cjs/, 'preview smoke must resolve the Vercel App preview URL');
});
