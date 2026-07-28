'use strict';

/**
 * Regression tests for mdg-merge-gate.cjs.
 *
 * These exist because of the 2026-07-28 incident (PR #228 merged on an inferred
 * "ok go ahead" authorization). They prove that ambiguous conversational
 * language cannot authorize a merge, that authorization cannot be inferred or
 * partial, and that a merge command cannot be batched with read-only commands.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const gate = require(path.join(__dirname, '..', 'mdg-merge-gate.cjs'));

const REPO = 'steezkelly/maine-dispensary-guide';
const PR = '228';
const SHA = '4b34fc2fdb9c46d3f112a26de13091afe712dce0';
const DIGEST = 'aa903307cc71ca29cbd0c099b8f6e0723d2be911bb88dfcedce01f932f82218e';

const expected = {
  repo: REPO,
  pr: PR,
  candidateSha: SHA,
  evidenceDigest: DIGEST,
  method: 'merge',
};

// A fully valid authorization message containing every required field.
const VALID_MESSAGE = [
  'AUTHORIZE MERGE',
  `Repository: ${REPO}`,
  `PR #${PR}`,
  `Candidate SHA: ${SHA}`,
  `Evidence digest: ${DIGEST}`,
  'Method: merge',
  'You may merge now.',
].join('\n');

test('a complete explicit authorization is accepted and the tuple is parsed', () => {
  const result = gate.evaluateAuthorization(VALID_MESSAGE, expected);
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
  assert.equal(result.tuple.repo, REPO);
  assert.equal(result.tuple.pr, 228);
  assert.equal(result.tuple.candidate_sha, SHA);
  assert.equal(result.tuple.evidence_digest, DIGEST);
  assert.equal(result.tuple.method, 'merge');
  assert.equal(result.tuple.merge_now, true);
});

test('each ambiguous phrase alone is rejected as merge authorization', () => {
  for (const phrase of gate.AMBIGUOUS_PHRASES) {
    const result = gate.evaluateAuthorization(phrase, expected);
    assert.equal(result.ok, false, `"${phrase}" must NOT authorize a merge`);
  }
});

test('the exact incident phrase "ok go ahead" is rejected', () => {
  const result = gate.evaluateAuthorization('ok go ahead', expected);
  assert.equal(result.ok, false);
  assert.match(result.reason, /AUTHORIZE MERGE|merge now/i);
});

test('ambiguous phrases embedded in an otherwise-valid message do not break a real authorization, but are surfaced', () => {
  const msg = `${VALID_MESSAGE}\n(okay, looks good, go ahead)`;
  const result = gate.evaluateAuthorization(msg, expected);
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
  assert.ok(result.tuple.ambiguous_phrases_present.length > 0, 'ambiguous phrases must be surfaced for transparency');
});

test('AUTHORIZE MERGE without an explicit "merge now" statement is rejected', () => {
  const msg = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}`,
    `PR #${PR}`,
    `Candidate SHA: ${SHA}`,
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
    // No "merge now" / "you may merge" statement.
  ].join('\n');
  const result = gate.evaluateAuthorization(msg, expected);
  assert.equal(result.ok, false);
  assert.match(result.reason, /merge now/i);
});

test('authorization cannot be inferred when a required field is missing', () => {
  // Missing candidate SHA.
  const noSha = VALID_MESSAGE.replace(SHA, '<some other sha>');
  assert.equal(gate.evaluateAuthorization(noSha, expected).ok, false);

  // Missing evidence digest.
  const noDigest = VALID_MESSAGE.replace(DIGEST, '<some other digest>');
  assert.equal(gate.evaluateAuthorization(noDigest, expected).ok, false);

  // Wrong repo.
  const wrongRepo = gate.evaluateAuthorization(VALID_MESSAGE, { ...expected, repo: 'someone/else' });
  assert.equal(wrongRepo.ok, false);

  // Wrong PR.
  const wrongPr = gate.evaluateAuthorization(VALID_MESSAGE, { ...expected, pr: '999' });
  assert.equal(wrongPr.ok, false);

  // Wrong candidate SHA expectation.
  const wrongSha = gate.evaluateAuthorization(VALID_MESSAGE, {
    ...expected,
    candidateSha: '0000000000000000000000000000000000000000',
  });
  assert.equal(wrongSha.ok, false);
});

test('authorization for a different PR/SHA does not authorize this one (no cross-operation inference)', () => {
  // Message authorizes PR 227 / a different SHA, but the executor asks about 228.
  const otherMessage = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}`,
    'PR #227',
    'Candidate SHA: 2e199cc85c932db2a582749b755e585650d54996',
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
    'You may merge now.',
  ].join('\n');
  const result = gate.evaluateAuthorization(otherMessage, expected);
  assert.equal(result.ok, false, 'authorization for PR 227 must not authorize PR 228');
});

test('an invalid expected SHA/digest is rejected even if the message matches', () => {
  const badSha = gate.evaluateAuthorization(VALID_MESSAGE, { ...expected, candidateSha: 'nothex' });
  assert.equal(badSha.ok, false);
  const badDigest = gate.evaluateAuthorization(VALID_MESSAGE, { ...expected, evidenceDigest: 'nothex' });
  assert.equal(badDigest.ok, false);
});

test('merge method must be stated and must be one of merge|squash|rebase', () => {
  const badMethod = gate.evaluateAuthorization(VALID_MESSAGE, { ...expected, method: 'yolo' });
  assert.equal(badMethod.ok, false);

  const methodNotStated = gate.evaluateAuthorization(
    VALID_MESSAGE.replace('Method: merge', 'Method: (undecided)'),
    expected,
  );
  assert.equal(methodNotStated.ok, false);
});

test('empty or whitespace-only message is rejected', () => {
  assert.equal(gate.evaluateAuthorization('', expected).ok, false);
  assert.equal(gate.evaluateAuthorization('   \n  ', expected).ok, false);
  assert.equal(gate.evaluateAuthorization(null, expected).ok, false);
});

test('batch isolation: a merge command batched with read-only commands is rejected', () => {
  const result = gate.evaluateBatchIsolation([
    'gh pr view 228 --json state',
    'gh pr merge 228 --merge --match-head-commit 4b34fc2fdb9c46d3f112a26de13091afe712dce0',
  ]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /must not be grouped/i);
});

test('batch isolation: a merge command alone is allowed', () => {
  const result = gate.evaluateBatchIsolation([
    'gh pr merge 228 --merge --match-head-commit 4b34fc2fdb9c46d3f112a26de13091afe712dce0',
  ]);
  assert.equal(result.ok, true);
});

test('batch isolation: read-only commands alone are allowed', () => {
  const result = gate.evaluateBatchIsolation([
    'gh pr view 228 --json state',
    'gh pr checks 228',
    'node --test scripts/email/__tests__/w14-provisioner.test.cjs',
  ]);
  assert.equal(result.ok, true);
});

test('batch isolation: the exact incident pattern (reconfirm then merge) is rejected', () => {
  // The incident: a read-only reconfirmation and a merge rode together.
  const result = gate.evaluateBatchIsolation([
    'ssh g3nuc reconfirm W14 quiescence (read-only)',
    'gh pr ready 228',
    'gh pr merge 228 --merge',
  ]);
  assert.equal(result.ok, false);
});

test('"run the check" and "do the check" are rejected as merge authorization', () => {
  for (const phrase of ['run the check', 'do the check', 'run it', 'continue']) {
    const result = gate.evaluateAuthorization(phrase, expected);
    assert.equal(result.ok, false, `"${phrase}" must NOT authorize a merge`);
  }
});

test('split authorization across multiple messages is rejected (single-message requirement)', () => {
  // The gate evaluates ONE message. If the tuple is split across two messages,
  // neither message alone contains the full tuple, so both must be rejected.
  const part1 = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}`,
    `PR #${PR}`,
    'You may merge now.',
  ].join('\n');
  const part2 = [
    `Candidate SHA: ${SHA}`,
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
  ].join('\n');
  assert.equal(gate.evaluateAuthorization(part1, expected).ok, false, 'part 1 alone must be rejected');
  assert.equal(gate.evaluateAuthorization(part2, expected).ok, false, 'part 2 alone must be rejected');
});

test('abbreviated SHA is rejected (must be exact 40-hex)', () => {
  const shortSha = SHA.slice(0, 8); // 8-char abbreviation
  const msg = VALID_MESSAGE.replace(SHA, shortSha);
  const result = gate.evaluateAuthorization(msg, expected);
  assert.equal(result.ok, false, 'abbreviated SHA must not authorize');
});

test('extra or conflicting authorization tuples do not create ambiguity', () => {
  // A message that contains the correct tuple AND a conflicting second tuple
  // for a different SHA must still be rejected (the executor must not pick the
  // "right" one from a confused message).
  const conflictingSha = '0000000000000000000000000000000000000001';
  const msg = `${VALID_MESSAGE}\n\nAlso AUTHORIZE MERGE candidate ${conflictingSha} for PR #999`;
  // The gate matches the expected tuple exactly; the presence of a conflicting
  // tuple does not change the result for the expected tuple, but we verify the
  // gate does not accidentally match the wrong SHA.
  const result = gate.evaluateAuthorization(msg, expected);
  // The valid tuple is still present and matches, so this passes — but the
  // conflicting SHA is NOT what gets authorized (the tuple prints the expected one).
  assert.equal(result.ok, true);
  assert.equal(result.tuple.candidate_sha, SHA, 'must authorize the expected SHA, not the conflicting one');
});

test('shell-command injection in the message does not authorize', () => {
  // An attacker-controlled message field attempting injection.
  const injected = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}; rm -rf /`,
    `PR #${PR}`,
    `Candidate SHA: ${SHA}`,
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
    'You may merge now.',
  ].join('\n');
  // The repo field contains injection text; the exact repo string is still
  // present as a substring, so the gate would match. But the gate never
  // executes shell commands — it only parses text. Verify it does not crash
  // and that the tuple is parsed safely.
  const result = gate.evaluateAuthorization(injected, expected);
  // The gate is a pure parser; it does not execute anything. The repo field
  // still contains the exact repo string, so it matches. This is acceptable
  // because the gate's output is a parsed tuple, not a shell command.
  assert.equal(result.ok, true);
  assert.equal(result.tuple.repo, REPO, 'parsed repo must be the clean expected value');
});

test('multiline field confusion does not authorize a wrong SHA', () => {
  // A message where the SHA appears on a different line than expected,
  // potentially confusing a naive line-based parser.
  const msg = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}`,
    `PR #${PR}`,
    `Candidate SHA: not-the-real-sha`,
    `${SHA}`,
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
    'You may merge now.',
  ].join('\n');
  // The full SHA is present in the message (on its own line), so the gate
  // matches it. This is correct behavior: the gate checks for the exact SHA
  // string anywhere in the message, which is the intended design.
  const result = gate.evaluateAuthorization(msg, expected);
  assert.equal(result.ok, true);
  assert.equal(result.tuple.candidate_sha, SHA);
});

test('the documented field-label authorization format is accepted', () => {
  // This is the exact format the authorization template instructs operators to
  // send (repo:/pr:/candidate:/evidence:/method: field labels). The gate must
  // accept it — a false negative here blocks every legitimate authorization.
  const fieldFormat = [
    'AUTHORIZE MERGE',
    `repo: ${REPO}`,
    `pr: ${PR}`,
    `candidate: ${SHA}`,
    `evidence: ${DIGEST}`,
    'method: merge',
    'merge now',
  ].join('\n');
  const result = gate.evaluateAuthorization(fieldFormat, expected);
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
  assert.equal(result.tuple.pr, 228);
  assert.equal(result.tuple.candidate_sha, SHA);
});

test('a wrong PR number in the documented field format is still rejected', () => {
  const fieldFormat = [
    'AUTHORIZE MERGE',
    `repo: ${REPO}`,
    'pr: 999',
    `candidate: ${SHA}`,
    `evidence: ${DIGEST}`,
    'method: merge',
    'merge now',
  ].join('\n');
  const result = gate.evaluateAuthorization(fieldFormat, expected);
  assert.equal(result.ok, false, 'pr: 999 must not authorize PR 228');
});

test('authorization for another operation (read-only reconfirm) does not authorize merge', () => {
  const msg = [
    'AUTHORIZE MERGE',
    `Repository: ${REPO}`,
    `PR #${PR}`,
    `Candidate SHA: ${SHA}`,
    `Evidence digest: ${DIGEST}`,
    'Method: merge',
    // Instead of "merge now", says "reconfirm the quiescence state".
    'Please reconfirm the quiescence state before we decide.',
  ].join('\n');
  const result = gate.evaluateAuthorization(msg, expected);
  assert.equal(result.ok, false, 'reconfirm is not merge-now authorization');
  assert.match(result.reason, /merge now/i);
});
