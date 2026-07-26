#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R3-A — versioned, type-safe coverage-contract validation tests.
 *
 * Validates mdg-operations-coverage-v1: schema discriminator, coverage_kind
 * enum, state enum, UTC timestamps with start<end, non-empty source, 64-hex
 * source_sha256 (if present), opening_snapshot_at required for opening_state,
 * strict field allowlist (unknown fields fail closed), kind-mismatch guards,
 * and coversWindow(). JSON.parse alone is NOT validation.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const cc = require('../coverage/mdg-ops-coverage-contract.cjs');

const SCHEMA = 'mdg-operations-coverage-v1';
const W = { windowStartMs: Date.parse('2026-07-01T00:00:00Z'), windowEndMs: Date.parse('2026-07-08T00:00:00Z') };

function base(overrides = {}) {
  return {
    schema: SCHEMA,
    coverage_kind: 'observation',
    state: 'complete',
    window_start: '2026-07-01T00:00:00Z',
    window_end: '2026-07-08T00:00:00Z',
    source: 'synthetic_test',
    ...overrides,
  };
}

test('R3-A: a valid observation contract validates', () => {
  const r = cc.validateCoverageContract(base());
  assert.equal(r.ok, true, r.errors && r.errors.join('; '));
});

test('R3-A: schema discriminator must be exact', () => {
  const r = cc.validateCoverageContract(base({ schema: 'mdg-operations-coverage-v2' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /schema must be exactly/.test(e)));
});

test('R3-A: missing schema fails closed', () => {
  const c = base();
  delete c.schema;
  const r = cc.validateCoverageContract(c);
  assert.equal(r.ok, false);
});

test('R3-A: coverage_kind must be a known kind', () => {
  const r = cc.validateCoverageContract(base({ coverage_kind: 'bogus_kind' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /coverage_kind must be one of/.test(e)));
});

test('R3-A: state must be a known enum value', () => {
  const r = cc.validateCoverageContract(base({ state: 'finished' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /state must be one of/.test(e)));
});

test('R3-A: window_start must be a valid UTC date-time', () => {
  const r = cc.validateCoverageContract(base({ window_start: 'not-a-date' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /window_start must be a valid UTC/.test(e)));
});

test('R3-A: window_start < window_end is required', () => {
  const r = cc.validateCoverageContract(base({ window_start: '2026-07-08T00:00:00Z', window_end: '2026-07-01T00:00:00Z' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /strictly before/.test(e)));
});

test('R3-A: equal window_start and window_end fails closed', () => {
  const r = cc.validateCoverageContract(base({ window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-01T00:00:00Z' }));
  assert.equal(r.ok, false);
});

test('R3-A: source must be a non-empty string', () => {
  const r = cc.validateCoverageContract(base({ source: '   ' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /source must be a non-empty/.test(e)));
});

test('R3-A: source_sha256, if present, must be 64-hex', () => {
  const ok = cc.validateCoverageContract(base({ source_sha256: 'a'.repeat(64) }));
  assert.equal(ok.ok, true);
  const bad = cc.validateCoverageContract(base({ source_sha256: 'xyz' }));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /source_sha256/.test(e)));
});

test('R3-A: opening_snapshot_at is REQUIRED for opening_state evidence', () => {
  const missing = cc.validateCoverageContract(base({ coverage_kind: 'opening_state' }));
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((e) => /opening_snapshot_at is required/.test(e)));
  const present = cc.validateCoverageContract(base({ coverage_kind: 'opening_state', opening_snapshot_at: '2026-07-01T00:00:00Z' }));
  assert.equal(present.ok, true, present.errors && present.errors.join('; '));
});

test('R3-A: unknown fields fail closed (strict allowlist)', () => {
  const r = cc.validateCoverageContract(base({ sneaky_field: 'x' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /unknown field: sneaky_field/.test(e)));
});

test('R3-A: malformed (non-object) contracts fail closed', () => {
  assert.equal(cc.validateCoverageContract(null).ok, false);
  assert.equal(cc.validateCoverageContract('string').ok, false);
  assert.equal(cc.validateCoverageContract([1, 2]).ok, false);
  assert.equal(cc.validateCoverageContract(42).ok, false);
});

test('R3-A: an observation contract cannot be used as release-emitter evidence', () => {
  const r = cc.requireKind(base({ coverage_kind: 'observation' }), 'release_emitter');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /coverage_kind mismatch/.test(e)));
});

test('R3-A: a release-emitter contract cannot be used as opening-state evidence', () => {
  const r = cc.requireKind(base({ coverage_kind: 'release_emitter' }), 'opening_state');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /coverage_kind mismatch/.test(e)));
});

test('R3-A: requireKind passes for the matching kind', () => {
  const r = cc.requireKind(base({ coverage_kind: 'release_emitter' }), 'release_emitter');
  assert.equal(r.ok, true);
});

test('R3-A: requireKind fails closed when the contract is structurally invalid', () => {
  const r = cc.requireKind(base({ coverage_kind: 'observation', state: 'bogus' }), 'observation');
  assert.equal(r.ok, false);
});

test('R3-A: coversWindow requires state=complete and full containment', () => {
  const complete = base({ state: 'complete', window_start: '2026-06-01T00:00:00Z', window_end: '2026-12-31T00:00:00Z' });
  assert.equal(cc.coversWindow(complete, W.windowStartMs, W.windowEndMs), true);
  // Partial state never covers.
  const partial = base({ state: 'partial', window_start: '2026-06-01T00:00:00Z', window_end: '2026-12-31T00:00:00Z' });
  assert.equal(cc.coversWindow(partial, W.windowStartMs, W.windowEndMs), false);
  // Complete but window does not contain the request.
  const tooNarrow = base({ state: 'complete', window_start: '2026-07-02T00:00:00Z', window_end: '2026-07-05T00:00:00Z' });
  assert.equal(cc.coversWindow(tooNarrow, W.windowStartMs, W.windowEndMs), false);
  // Null contract.
  assert.equal(cc.coversWindow(null, W.windowStartMs, W.windowEndMs), false);
});
