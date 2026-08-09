#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1-R2-MR — mainline reconciliation correctness tests.
 *
 * Asserts that the semantic reconciliation onto the locked main base preserved
 * all three bodies of protection without mechanical ours/theirs:
 *   A. PR #219 release-governance protections;
 *   B. PR #221 data-integrity protections;
 *   C. OPS-06B enforcement protections;
 * and that the governance docs express ONE noncontradictory canonical sequence.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------------------------------------------------------------------------
// ci.yml — both PR #219 and PR #221 Build steps AND the separate Operations Suite job
// ---------------------------------------------------------------------------

test('MR-ci: PR #219 pre-push governance test remains in the Build job', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /Test pre-push governance and worktree-hygiene contracts/);
  assert.match(ci, /node scripts\/git\/tests\/pre-push-verify-governance\.test\.cjs/);
  assert.match(ci, /node scripts\/git\/tests\/pre-push-verify-diagnostics\.test\.cjs/);
});

test('MR-ci: PR #221 data-integrity Build step remains', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /Test data-integrity check \(AGENTS\.md blog\/component counts\)/);
  assert.match(ci, /node scripts\/admin\/data-integrity-check\.cjs/);
});

test('MR-ci: Operations Suite remains a SEPARATE top-level job (not folded into Build)', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /^  operations-suite:\n/m);
  assert.match(ci, /name: Operations Suite/);
  assert.match(ci, /node --test scripts\/operations\/tests\/\*\.test\.cjs/);
  const lines = ci.split('\n');
  const buildStart = lines.findIndex((l) => l === '  build:');
  const opsStart = lines.findIndex((l) => l === '  operations-suite:');
  assert.ok(buildStart !== -1 && opsStart !== -1, 'both build and operations-suite jobs must exist');
  assert.ok(opsStart > buildStart, 'operations-suite must be a separate job after build');
  const buildBlock = lines.slice(buildStart, opsStart).join('\n');
  assert.ok(!/node --test scripts\/operations\/tests/.test(buildBlock),
    'operations suite command must NOT be inside the build job');
  // The operations-suite job is unconditional (no `if:` gate) and contents:read.
  const opsBlock = lines.slice(opsStart, lines.findIndex((l, i) => i > opsStart && /^  [a-z][a-z-]*:$/.test(l))).join('\n');
  assert.ok(!/\n\s+if:/.test(opsBlock), 'operations-suite must be unconditional (no if: gate)');
  assert.match(opsBlock, /contents: read/);
});

// ---------------------------------------------------------------------------
// maintenance-script-tests.yml — PR #221 path filters + test command
// ---------------------------------------------------------------------------

test('MR-maint: PR #221 maintenance workflow path filters remain', () => {
  const wf = read('.github/workflows/maintenance-script-tests.yml');
  for (const p of [
    'scripts/admin/data-integrity-check.cjs',
    'scripts/admin/data-integrity-extractors.cjs',
    'scripts/admin/tests/data-integrity-check.test.cjs',
    'AGENTS.md',
    'apps/maine-cannabis/src/pages/blog/**',
    'apps/maine-cannabis/src/components/**',
  ]) {
    assert.ok(wf.includes(p), `maintenance workflow must trigger on ${p}`);
  }
});

test('MR-maint: PR #221 data-integrity test is in the maintenance fixture-test command', () => {
  const wf = read('.github/workflows/maintenance-script-tests.yml');
  assert.match(wf, /scripts\/admin\/tests\/data-integrity-check\.test\.cjs/);
});

// ---------------------------------------------------------------------------
// package.json — both scripts present
// ---------------------------------------------------------------------------

test('MR-pkg: package.json contains both test:data-integrity and ops:integrate', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['test:data-integrity'], 'test:data-integrity must be present');
  assert.equal(pkg.scripts['ops:integrate'], 'node scripts/operations/integration/cli.cjs');
});

// ---------------------------------------------------------------------------
// Governance docs — ONE noncontradictory canonical sequence
// ---------------------------------------------------------------------------

test('MR-docs: checklist expresses the combined canonical sequence (gate + exact-target + build:isolated + merge commit + reconciliation)', () => {
  const cl = read('docs/governance/templates/mdg-integrator-checklist.md');
  // OPS-06B evidence-bound gate (with required anchor + draft allowance).
  assert.match(cl, /npm run ops:integrate/);
  assert.match(cl, /--expect-evidence-sha256/);
  assert.match(cl, /--allow-draft/);
  // PR #219 exact-target pre-push verification.
  assert.match(cl, /node scripts\/git\/pre-push-verify\.cjs --ref="\$LOCKED_BASE_SHA" --target="\$CANDIDATE_SHA"/);
  const executableBlocks = [...cl.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]).join('\n');
  assert.doesNotMatch(executableBlocks, /<(?:locked-base-sha|exact-candidate-sha)>/,
    'executable command blocks must use shell-safe substitutions, not angle-bracket placeholders');
  // PR #219 isolated build.
  assert.match(cl, /npm run build:isolated/);
  // PR #219 preview verification before merge.
  assert.match(cl, /MDG_PREVIEW_URL=https:\/\/your-exact-preview\.vercel\.app npm run verify:post-deploy/);
  // GitHub merge commit canonical.
  assert.match(cl, /gh pr merge "\$PR_NUMBER" --merge/);
  // Post-merge tree reconciliation.
  assert.match(cl, /Post-merge reconciliation/);
  assert.match(cl, /\^\{tree\}/);
  // Final-main operations tests.
  assert.match(cl, /node --test scripts\/operations\/tests\/\*\.test\.cjs/);
  // PR #219 production smoke after merge.
  assert.match(cl, /MDG_ALLOW_PROD_SMOKE=1/);
  // Emergency mode only (not the normal path).
  assert.match(cl, /Emergency mode/i);
  assert.ok(!/^4\. .*cherry-pick/m.test(cl), 'cherry-pick must not be a canonical required-order step');
});

test('MR-docs: checklist does NOT regress (no direct-push normal path, no pre-deploy prod smoke)', () => {
  const cl = read('docs/governance/templates/mdg-integrator-checklist.md');
  // The NORMAL path (the Required order section, before Emergency mode) must not
  // push directly to main. The Emergency-mode section legitimately documents the
  // direct-push emergency procedure, so scope the check to the normal path.
  const normalPath = cl.split(/## Emergency mode/i)[0];
  assert.ok(!/git push origin HEAD:refs\/heads\/main/.test(normalPath),
    'direct push to main must not be in the normal (required-order) path');
  // Release closeout must be evidence-first.
  assert.match(cl, /Gather closeout evidence/);
  assert.match(cl, /evidence-first/i);
});

test('MR-docs: orchestration doc expresses the merge-commit canonical topology + gate', () => {
  const orch = read('docs/governance/mdg-agent-orchestration-v1.md');
  assert.match(orch, /GitHub merge commit/);
  assert.match(orch, /npm run ops:integrate/);
  assert.match(orch, /--expect-evidence-sha256/);
  assert.match(orch, /node scripts\/git\/pre-push-verify\.cjs --ref="\$LOCKED_BASE_SHA" --target="\$CANDIDATE_SHA"/);
  const executableBlocks = [...orch.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]).join('\n');
  assert.doesNotMatch(executableBlocks, /<(?:locked-base-sha|exact-candidate-sha)>/,
    'executable command blocks must use shell-safe substitutions, not angle-bracket placeholders');
  assert.match(orch, /build:isolated/);
  assert.match(orch, /derives the actual\s+state independently/i);
});

// ---------------------------------------------------------------------------
// OPS-06B enforcement code present (category A+ honesty preserved)
// ---------------------------------------------------------------------------

test('MR-ops: ADR Amendments 6 + 7 preserve the honest category-A+ classification', () => {
  const adr = read('docs/adr/2026-07-25-mdg-operations-control-plane-v1.md');
  assert.match(adr, /Amendment 6 — Attestation trust model correction/);
  assert.match(adr, /Amendment 7 — Operations-Suite trust qualification/);
  assert.match(adr, /Candidate-integrity remains category A\+/);
  assert.match(adr, /NOT an independent authorization mechanism/i);
});
