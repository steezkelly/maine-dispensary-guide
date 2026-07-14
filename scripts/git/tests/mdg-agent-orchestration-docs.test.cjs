const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PROTOCOL_PATH = path.join(ROOT, 'docs/governance/mdg-agent-orchestration-v1.md');
const TEMPLATE_PATH = path.join(ROOT, 'docs/governance/templates/mdg-task-contract.md');

function hasWholeWord(content, term) {
  return new RegExp(`\\b${term}\\b`, 'i').test(content);
}

test('MDG agent orchestration protocol defines the required workflow controls', () => {
  const protocol = fs.readFileSync(PROTOCOL_PATH, 'utf8');

  for (const term of [
    'Coordinator',
    'Codex Author',
    'Verifier',
    'Integrator',
    'blocked',
    'ready',
    'in_progress',
    'accepted',
    'released',
  ]) {
    assert.ok(hasWholeWord(protocol, term), `protocol must include ${term}`);
  }

  assert.match(
    protocol,
    /Only the integration worktree[\s\S]*?origin\/main/i,
    'protocol must reserve origin/main updates for the integration worktree',
  );
  assert.match(protocol, /do not[\s\S]*?git add -A/i, 'protocol must prohibit git add -A');
});

test('MDG agent orchestration protocol makes role boundaries independently enforceable', () => {
  const protocol = fs.readFileSync(PROTOCOL_PATH, 'utf8');

  assert.match(protocol, /Coordinator[\s\S]*?may reserve[\s\S]*?worktree[\s\S]*?lease/i);
  assert.match(protocol, /Coordinator[\s\S]*?dispatch[\s\S]*?Codex/i);
  assert.match(protocol, /Coordinator[\s\S]*?independently\s+verify/i);
  assert.match(protocol, /Coordinator[\s\S]*?must not accept[\s\S]*?self-report[\s\S]*?evidence/i);
  assert.match(protocol, /Coordinator[\s\S]*?must not write[\s\S]*?another writer[\s\S]*?leased paths/i);

  assert.match(protocol, /Verifier[\s\S]*?must read[\s\S]*?contract/i);
  assert.match(protocol, /Verifier[\s\S]*?inspect[\s\S]*?actual diff/i);
  assert.match(protocol, /Verifier[\s\S]*?reproduce[\s\S]*?contract tests/i);
  assert.match(protocol, /Verifier[\s\S]*?explicit PASS\/FAIL/i);
  assert.match(protocol, /Verifier[\s\S]*?must\s+not\s+author fixes/i);
  assert.match(protocol, /Verifier[\s\S]*?must\s+not\s+waive[\s\S]*?acceptance criteria/i);

  assert.match(protocol, /Integrator[\s\S]*?cherry-pick one accepted candidate/i);
  assert.match(protocol, /Integrator[\s\S]*?npm run\s+verify:iterate/i);
  assert.match(protocol, /Integrator[\s\S]*?npm run\s+verify:push/i);
  assert.match(protocol, /Integrator[\s\S]*?deploy verification/i);
  assert.match(protocol, /Integrator[\s\S]*?must\s+not\s+merge[\s\S]*?unverified batch work/i);
  assert.match(protocol, /Integrator[\s\S]*?must\s+not[\s\S]*?primary checkout/i);

  assert.match(protocol, /Continuity Watcher[\s\S]*?may unblock[\s\S]*?create\s+next ready work/i);
  assert.match(protocol, /Continuity Watcher[\s\S]*?must\s+not\s+claim[\s\S]*?implementation task[\s\S]*?another\s+worker/i);
});

test('MDG task contract template is forward-compatible with the Task 2 validator', () => {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  for (const key of [
    'id:',
    'parent:',
    'role:',
    'base_sha:',
    'branch:',
    'worktree:',
    'allowed_paths:',
    'acceptance:',
    'depends_on:',
    'lease_ttl_minutes:',
    'stop_condition:',
  ]) {
    assert.match(template, new RegExp(`^${key}`, 'm'), `template must retain ${key}`);
  }

  assert.match(template, /^parent: MDG-WORKFLOW$/m);
  assert.match(template, /^role: codex-author$/m);
  assert.match(template, /^allowed_paths:\n\s+- docs\/governance\/example\.md$/m);
  assert.match(template, /^acceptance:\n\s+- node scripts\/git\/tests\/example\.test\.cjs$/m);
});
