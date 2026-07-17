'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/pr-review-attention.yml');

function jobPermissions(yaml, jobName) {
  const permissionsBlock = yaml.match(new RegExp(
    String.raw`^  ${jobName}:\n[\s\S]*?^    permissions:\n([\s\S]*?)^    steps:`,
    'm',
  ))?.[1];

  return permissionsBlock?.trim().split(/\r?\n/).map((line) => line.trim()).join('\n');
}

function source() {
  assert.equal(existsSync(WORKFLOW), true, 'PR review-attention workflow must exist');
  return readFileSync(WORKFLOW, 'utf8');
}

test('review-attention workflow requests review when a PR becomes reviewable', () => {
  const yaml = source();

  assert.match(yaml, /^name:\s*PR review attention\s*$/m);
  assert.match(
    yaml,
    /^concurrency:\s*\n\s*group:\s*pr-review-attention-\$\{\{ github\.repository \}\}\s*\n\s*cancel-in-progress:\s*false\s*$/m,
    'all watchdog runs must serialize without cancelling a pending reminder',
  );
  assert.match(yaml, /^\s*pull_request:\s*\n\s*types:\s*\[opened, reopened, ready_for_review\]/m);
  assert.match(yaml, /^permissions: \{\}$/m, 'top-level permissions must deny every unneeded scope');
  assert.equal(jobPermissions(yaml, 'request-review'), 'issues: write');
  assert.equal(jobPermissions(yaml, 'remind-unreviewed'), 'pull-requests: read\nissues: write');
  assert.match(yaml, /actions\/github-script@v7/);
  assert.match(yaml, /<!-- pr-review-attention:opening -->/);
  assert.match(yaml, /const alreadyPinged = comments\.some\(\(comment\) => comment\.body\.includes\(marker\)\)/);
  assert.match(yaml, /if \(alreadyPinged\)/);
  assert.match(yaml, /!github\.event\.pull_request\.draft/);
  assert.match(yaml, /github\.event\.pull_request\.head\.repo\.fork == false/);
});

test('review-attention workflow sends only one 48-hour no-review reminder', () => {
  const yaml = source();

  assert.match(yaml, /^\s*schedule:\s*\n\s*-\s*cron:\s*'17 14 \* \* 1-5'\s*$/m);
  assert.match(yaml, /^\s*workflow_dispatch:\s*$/m);
  assert.match(yaml, /github\.rest\.pulls\.listReviews/);
  assert.match(yaml, /48 \* 60 \* 60 \* 1000/);
  assert.match(yaml, /<!-- pr-review-attention:reminder -->/);
  assert.match(
    yaml,
    /const hasSubmittedReview = reviews\.some\(\(review\) => \(\s*review\.commit_id === pr\.head\.sha\s*&&\s*\(review\.state === 'APPROVED' \|\| review\.state === 'CHANGES_REQUESTED' \|\| review\.state === 'COMMENTED'\)\s*\)\);/,
    'only a submitted review on the current head may suppress a reminder',
  );
  assert.match(yaml, /if \(pr\.draft\) continue;/);
  assert.match(yaml, /if \(alreadyReminded\) continue;/);
});
