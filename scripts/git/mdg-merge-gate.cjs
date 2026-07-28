#!/usr/bin/env node
'use strict';

/**
 * mdg-merge-gate.cjs — explicit merge-authorization gate.
 *
 * Created after the 2026-07-28 incident in which PR #228 was merged on an
 * inferred ("ok go ahead") authorization that actually referred only to a
 * read-only reconfirmation. See:
 *   docs/postmortems/2026-07-28-w14-unauthorized-merge-incident.md
 *
 * A merge to main may proceed ONLY after this gate parses an authorization
 * tuple from a SINGLE explicit owner message and every field matches exactly.
 *
 * Required authorization fields (all must be present in one message):
 *   1. The literal phrase:            AUTHORIZE MERGE
 *   2. Exact repository full name:    e.g. steezkelly/maine-dispensary-guide
 *   3. Exact PR number:               e.g. 228
 *   4. Exact candidate SHA:           full 40-hex commit SHA
 *   5. Exact bound evidence digest:   full 64-hex SHA-256
 *   6. Intended merge method:         merge | squash | rebase
 *   7. An explicit "merge now" statement permitting merging at this time.
 *
 * Ambiguous language NEVER counts as authorization. The gate rejects
 * authorization inferred from earlier messages, nearby context, implied
 * consent, or authorization granted for a different operation.
 *
 * Usage:
 *   node mdg-merge-gate.cjs validate \
 *     --message-file <path>          (the single owner authorization message)
 *     --repo <owner/name> \
 *     --pr <number> \
 *     --candidate-sha <40-hex> \
 *     --evidence-digest <64-hex> \
 *     --method <merge|squash|rebase>
 *
 *   node mdg-merge-gate.cjs check-batch-isolation --commands-file <path>
 *     (asserts a merge command is not batched with read-only/verification cmds)
 *
 * Exit codes:
 *   0 = authorized / safe
 *   1 = not authorized / unsafe (gate FAILED CLOSED)
 *   2 = usage error
 *
 * The gate prints the parsed authorization tuple on success so the executor
 * and any reviewer can confirm exact matching before any merge command runs.
 */

const fs = require('node:fs');

const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;
const METHODS = ['merge', 'squash', 'rebase'];

// Phrases that must NEVER be treated as merge authorization, even if they
// appear in the same message. These are conversational acknowledgements /
// read-only operation consents, not merge consents.
const AMBIGUOUS_PHRASES = [
  'go ahead',
  'proceed',
  'continue',
  'run it',
  'do the check',
  'reconfirm',
  'looks good',
  'okay',
  'ok',
  'yes',
  'sure',
  'fine',
  'lgtm',
  'ship it',
];

// A merge command is only authorized when the message ALSO contains an explicit
// "merge now" statement. We require one of these explicit markers in addition
// to the AUTHORIZE MERGE phrase, so that a bare "AUTHORIZE MERGE" quoted in
// discussion cannot authorize by itself.
const MERGE_NOW_MARKERS = [
  'merge now',
  'merge it now',
  'you may merge',
  'authorized to merge',
  'permit merge',
  'permit merging',
];

function fail(msg) {
  process.stderr.write(`MERGE_GATE_DENIED: ${msg}\n`);
  process.exit(1);
}

function usageError(msg) {
  process.stderr.write(`MERGE_GATE_USAGE: ${msg}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const values = Object.create(null);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      values[key] = argv[i + 1];
      i += 1;
    } else {
      values[key] = true;
    }
  }
  return values;
}

/**
 * Parse and validate an authorization message against the expected tuple.
 * Returns { ok: true, tuple } or { ok: false, reason }.
 * Exported for regression testing.
 */
function evaluateAuthorization(message, expected) {
  const text = String(message || '');
  const lower = text.toLowerCase();

  // 1. Literal AUTHORIZE MERGE phrase (case-insensitive but must be the phrase).
  if (!/authorize\s+merge/i.test(text)) {
    return { ok: false, reason: 'missing literal "AUTHORIZE MERGE" phrase' };
  }

  // 2. Explicit "merge now" marker must also be present.
  const hasMergeNow = MERGE_NOW_MARKERS.some((m) => lower.includes(m));
  if (!hasMergeNow) {
    return {
      ok: false,
      reason:
        'missing explicit "merge now" statement (e.g. "merge now", "you may merge", "authorized to merge")',
    };
  }

  // 3. Reject if the message is ONLY ambiguous language with no real tuple —
  //    and surface which ambiguous phrases were detected for transparency.
  const detectedAmbiguous = AMBIGUOUS_PHRASES.filter((p) =>
    new RegExp(`\\b${p.replace(/\s+/g, '\\s+')}\\b`, 'i').test(lower),
  );

  // 4. Exact repo.
  if (!expected.repo || !text.includes(expected.repo)) {
    return { ok: false, reason: `exact repository "${expected.repo}" not stated in the message` };
  }

  // 5. Exact PR number. Accept the documented field format ("pr: 229") as well
  //    as natural-language forms ("PR 229", "#229", "pull request 229"). The
  //    field-label form is what the authorization template instructs operators
  //    to send, so it must be accepted.
  const prToken = new RegExp(
    `(pr\\s*[:=]\\s*|#|PR\\s*#?|pull\\s+request\\s*#?\\s*)${expected.pr}\\b`,
    'i',
  );
  if (!prToken.test(text)) {
    return { ok: false, reason: `exact PR number "${expected.pr}" not stated in the message` };
  }

  // 6. Exact candidate SHA (full 40-hex present in the message).
  if (!SHA_RE.test(expected.candidateSha || '')) {
    return { ok: false, reason: 'expected candidate SHA is not a valid 40-hex SHA' };
  }
  if (!text.includes(expected.candidateSha)) {
    return { ok: false, reason: `exact candidate SHA "${expected.candidateSha}" not stated in the message` };
  }

  // 7. Exact evidence digest (full 64-hex present in the message).
  if (!DIGEST_RE.test(expected.evidenceDigest || '')) {
    return { ok: false, reason: 'expected evidence digest is not a valid 64-hex SHA-256' };
  }
  if (!text.includes(expected.evidenceDigest)) {
    return { ok: false, reason: `exact evidence digest "${expected.evidenceDigest}" not stated in the message` };
  }

  // 8. Merge method stated on a dedicated "method:" line and matching. We do
  //    NOT accept a bare word match, because "merge" also appears in the
  //    mandatory "AUTHORIZE MERGE" phrase and would otherwise always match.
  if (!METHODS.includes(expected.method)) {
    return { ok: false, reason: `merge method must be one of ${METHODS.join(', ')}` };
  }
  const methodLine = new RegExp(`method\\s*[:=]\\s*${expected.method}\\b`, 'i');
  if (!methodLine.test(text)) {
    return { ok: false, reason: `intended merge method "${expected.method}" not stated on a "method:" line in the message` };
  }

  return {
    ok: true,
    tuple: {
      repo: expected.repo,
      pr: Number(expected.pr),
      candidate_sha: expected.candidateSha,
      evidence_digest: expected.evidenceDigest,
      method: expected.method,
      merge_now: true,
      // Transparency: record any ambiguous phrases that were ALSO present, so a
      // reviewer can see the authorization did not rely on them.
      ambiguous_phrases_present: detectedAmbiguous,
    },
  };
}

/**
 * Assert a merge command is not batched with read-only/verification commands.
 * `commands` is an array of command strings that would run in one batch.
 * Returns { ok: true } or { ok: false, reason }.
 */
function evaluateBatchIsolation(commands) {
  const list = Array.isArray(commands) ? commands : [];
  const isMerge = (c) => /\bgh\s+pr\s+merge\b|\bmerge\b.*--match-head-commit|git\s+merge\b/.test(String(c));
  const isReadOnly = (c) =>
    /\bgh\s+pr\s+(view|checks|diff)\b|--inspect|verify|smoke|curl\s|psql\s|node\s+--test|git\s+(status|log|diff|rev-parse|fetch)\b|reconfirm|read-only/.test(
      String(c),
    );

  const mergeCmds = list.filter(isMerge);
  const readOnlyCmds = list.filter(isReadOnly);
  if (mergeCmds.length > 0 && readOnlyCmds.length > 0) {
    return {
      ok: false,
      reason:
        'a merge command must not be grouped in the same batch as read-only/verification commands',
      merge_commands: mergeCmds,
      read_only_commands: readOnlyCmds,
    };
  }
  return { ok: true, merge_commands: mergeCmds };
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const values = parseArgs(rest);

  if (command === 'validate') {
    const messageFile = values['message-file'];
    if (!messageFile || typeof messageFile !== 'string') usageError('--message-file is required');
    let message;
    try {
      message = fs.readFileSync(messageFile, 'utf8');
    } catch (err) {
      usageError(`cannot read message file: ${err.message}`);
    }
    const expected = {
      repo: values.repo,
      pr: values.pr,
      candidateSha: values['candidate-sha'],
      evidenceDigest: values['evidence-digest'],
      method: values.method,
    };
    if (!expected.repo || !expected.pr || !expected.candidateSha || !expected.evidenceDigest || !expected.method) {
      usageError('--repo, --pr, --candidate-sha, --evidence-digest, and --method are all required');
    }
    const result = evaluateAuthorization(message, expected);
    if (!result.ok) fail(result.reason);
    process.stdout.write(`MERGE_GATE_AUTHORIZED\n${JSON.stringify(result.tuple, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'check-batch-isolation') {
    const commandsFile = values['commands-file'];
    if (!commandsFile || typeof commandsFile !== 'string') usageError('--commands-file is required');
    let commands;
    try {
      commands = JSON.parse(fs.readFileSync(commandsFile, 'utf8'));
    } catch (err) {
      usageError(`cannot parse commands file (expected JSON array): ${err.message}`);
    }
    const result = evaluateBatchIsolation(commands);
    if (!result.ok) fail(`${result.reason}: ${JSON.stringify(result.read_only_commands)}`);
    process.stdout.write(`MERGE_GATE_BATCH_ISOLATED\n${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
  }

  usageError('usage: mdg-merge-gate.cjs <validate|check-batch-isolation> [options]');
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateAuthorization,
  evaluateBatchIsolation,
  AMBIGUOUS_PHRASES,
  MERGE_NOW_MARKERS,
  METHODS,
  SHA_RE,
  DIGEST_RE,
};
