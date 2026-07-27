#!/usr/bin/env node
'use strict';

/**
 * Canonical Integrator gate CLI.
 * (OPS-06B-P1 Child 2; hardened by OPS-06B-P1-R1 and OPS-06B-P1-R2.)
 *
 * Thin CLI wrapper over the side-effect-free gate core (./gate.cjs). Supplies
 * the real git + GitHub API runners. See ./gate.cjs, ./remote-state.cjs, and
 * ./check-rollup.cjs for the full contract and trust model.
 *
 * Usage (R1-A identity; R2-A manual trust anchor; R2-D draft allowance):
 *   npm run ops:integrate -- \
 *     --repo-full-name steezkelly/maine-dispensary-guide \
 *     --pr-number <number> \
 *     --evidence <private-bound-evidence.json> \
 *     --expect-evidence-sha256 <64-hex-digest> \
 *     [--base-branch main] [--allow-draft] \
 *     [--repo <path>] [--detail-out <private-detail.json>]
 *
 * --expect-evidence-sha256 is REQUIRED (R2-A): the local A+ manual trust anchor.
 * The gate compares the operator-authorized digest with the evidence document's
 * exact bound evidence_sha256; self-consistency alone is insufficient.
 *
 * --allow-draft (R2-D) is required when the PR is a draft, because the canonical
 * order runs the gate before marking the PR ready.
 *
 * The gate DERIVES the actual origin/<base> SHA, the actual remote PR head, and
 * the live required-check rollup independently; it never accepts a user-supplied
 * --current-head / --expected-base as evidence of remote state.
 *
 * Output is REDACTED by default; full detail (check names, run IDs, URLs,
 * app id/slug, timestamps, conclusions) is written ONLY to a validated Tier-0
 * --detail-out file.
 */

const ledger = require('../ledger/mdg-ops-ledger.cjs');
const privateOutput = require('../private/mdg-ops-private-output.cjs');
const { defaultGit, defaultGhApi } = require('./remote-state.cjs');
const { defaultGhApiCheckRuns } = require('./check-rollup.cjs');
const { runGate, findRepoRoot } = require('./gate.cjs');

/** Flags that take no value. */
const BOOLEAN_FLAGS = new Set(['allowDraft']);

function parseArgs(argv) {
  const args = { _: [] };
  const toCamel = (key) => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith('--')) {
      const camel = toCamel(argument.slice(2));
      if (BOOLEAN_FLAGS.has(camel)) {
        args[camel] = true;
        continue;
      }
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${argument}`);
      args[camel] = value;
      index += 1;
      continue;
    }
    args._.push(argument);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runGate(args, {
    git: defaultGit,
    ghApi: defaultGhApi,
    ghApiCheckRuns: defaultGhApiCheckRuns,
  });
  const redacted = { ok: result.ok, reason_count: result.reasons.length, reason_codes: result.reasonCodes };
  process.stdout.write(`${JSON.stringify(redacted, null, 2)}\n`);

  // Full detail ONLY to an explicitly requested, validated Tier-0 file.
  if (args.detailOut) {
    const repoDir = args.repo ? require('node:path').resolve(args.repo) : findRepoRoot();
    const root = ledger.resolveRoot({ repoRoot: repoDir });
    const payload = {
      command: 'integration-gate',
      ok: result.ok,
      reason_count: result.reasons.length,
      reason_codes: result.reasonCodes,
      reasons: result.reasons,
      detail: result.detail,
    };
    privateOutput.writePrivateFile(root, args.detailOut, `${JSON.stringify(payload, null, 2)}\n`, repoDir);
    process.stdout.write(`detailed reasons written beneath private root (owner-only)\n`);
  }

  if (!result.ok) {
    process.stderr.write(`GATE_REJECTED: ${result.reasons.length} reason(s); codes: ${result.reasonCodes.join(', ') || 'none'}\n`);
    process.stderr.write(`GATE_REJECTED: do NOT merge. Re-run with --detail-out <private-path> for full reasons (Tier 0).\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('GATE_ACCEPTED: candidate matches verifier evidence and live remote state; cleared for the authorized GitHub merge commit\n');
  }
}

try {
  main();
} catch (error) {
  const msg = String(error && error.message ? error.message : 'unknown error');
  let code = 'GATE_FAILED';
  if (/^GATE_MISSING_ARG:/.test(msg)) code = msg;
  else if (msg === 'GATE_NO_REPO') code = 'GATE_NO_REPO';
  else if (msg === 'GATE_EXPECT_EVIDENCE_DIGEST_INVALID') code = 'GATE_EXPECT_EVIDENCE_DIGEST_INVALID';
  else if (/^OPS_ROOT_INSIDE_REPO/.test(msg)) code = 'GATE_ROOT_INSIDE_REPO';
  else if (/^OPS_EVIDENCE_/.test(msg)) code = 'EVIDENCE_READ_REJECTED';
  else if (/^OPS_OUTPUT_/.test(msg)) code = 'OUTPUT_PATH_REJECTED';
  else if (/^OPS_PRIVATE_/.test(msg)) code = 'PRIVATE_WRITE_REJECTED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
