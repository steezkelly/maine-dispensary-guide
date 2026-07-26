'use strict';

/**
 * Versioned, type-safe coverage-evidence contracts (OPS-06A-R3 finding A).
 *
 * One small versioned schema for coverage evidence:
 *
 *   {
 *     "schema": "mdg-operations-coverage-v1",
 *     "coverage_kind": "observation" | "release_emitter" | "opening_state",
 *     "state": "complete" | "partial" | "unmeasured",
 *     "window_start": "<UTC date-time>",
 *     "window_end": "<UTC date-time>",
 *     "source": "<non-empty source identifier>",
 *     "source_sha256": "<64-hex; optional unless a design requires it>",
 *     "opening_snapshot_at": "<UTC date-time; required for opening_state>"
 *   }
 *
 * Validation is REAL structural validation, not a bare JSON.parse:
 *   - schema discriminator must be exactly mdg-operations-coverage-v1;
 *   - coverage_kind must be one of the three known kinds;
 *   - state must be one of complete/partial/unmeasured;
 *   - window_start/window_end must be valid UTC date-times with start < end;
 *   - source must be a non-empty string;
 *   - source_sha256, if present, must be a 64-char lowercase hex string;
 *   - opening_snapshot_at is REQUIRED when coverage_kind === 'opening_state'
 *     and must be a valid UTC date-time;
 *   - UNKNOWN fields fail closed (strict allowlist);
 *   - malformed contracts fail closed.
 *
 * Kind-mismatch guards (used by callers, enforced here as helpers):
 *   - an `observation` contract cannot serve as release-emitter evidence;
 *   - a `release_emitter` contract cannot serve as opening-state evidence;
 *   - each consumer requires the exact coverage_kind it needs.
 *
 * Synthetic contracts remain acceptable for tests; OPS-06B is the future
 * production source. No dependency. Node built-ins only.
 */

const SCHEMA_ID = 'mdg-operations-coverage-v1';
const COVERAGE_KINDS = Object.freeze(['observation', 'release_emitter', 'opening_state']);
const STATES = Object.freeze(['complete', 'partial', 'unmeasured']);
const ALLOWED_FIELDS = Object.freeze([
  'schema', 'coverage_kind', 'state', 'window_start', 'window_end',
  'source', 'source_sha256', 'opening_snapshot_at',
]);

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

/**
 * Validate a UTC date-time string. Accepts a trailing 'Z' or an explicit offset;
 * requires the value to parse to a finite epoch. Returns the epoch ms or null.
 */
function parseUtc(value) {
  if (typeof value !== 'string' || !ISO_UTC_RE.test(value)) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Validate a coverage contract. Returns { ok: true, contract } on success or
 * { ok: false, errors: [...] } on failure. Fails closed on unknown fields and
 * malformed contracts. Never throws.
 */
function validateCoverageContract(input) {
  const errors = [];

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['contract must be a JSON object'] };
  }

  // Strict allowlist: unknown fields fail closed.
  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors.push(`unknown field: ${key}`);
    }
  }

  // Schema discriminator.
  if (input.schema !== SCHEMA_ID) {
    errors.push(`schema must be exactly ${SCHEMA_ID} (got ${JSON.stringify(input.schema)})`);
  }

  // coverage_kind.
  if (!COVERAGE_KINDS.includes(input.coverage_kind)) {
    errors.push(`coverage_kind must be one of ${COVERAGE_KINDS.join(', ')} (got ${JSON.stringify(input.coverage_kind)})`);
  }

  // state.
  if (!STATES.includes(input.state)) {
    errors.push(`state must be one of ${STATES.join(', ')} (got ${JSON.stringify(input.state)})`);
  }

  // window_start / window_end.
  const startMs = parseUtc(input.window_start);
  const endMs = parseUtc(input.window_end);
  if (startMs === null) errors.push('window_start must be a valid UTC date-time');
  if (endMs === null) errors.push('window_end must be a valid UTC date-time');
  if (startMs !== null && endMs !== null && !(startMs < endMs)) {
    errors.push('window_start must be strictly before window_end');
  }

  // source.
  if (typeof input.source !== 'string' || input.source.trim() === '') {
    errors.push('source must be a non-empty string');
  }

  // source_sha256 (optional, but if present must be 64-hex).
  if (input.source_sha256 !== undefined) {
    if (typeof input.source_sha256 !== 'string' || !HEX64_RE.test(input.source_sha256)) {
      errors.push('source_sha256, if present, must be a 64-char lowercase hex string');
    }
  }

  // opening_snapshot_at required for opening_state evidence.
  if (input.coverage_kind === 'opening_state') {
    if (parseUtc(input.opening_snapshot_at) === null) {
      errors.push('opening_snapshot_at is required (valid UTC date-time) for opening_state evidence');
    }
  } else if (input.opening_snapshot_at !== undefined && parseUtc(input.opening_snapshot_at) === null) {
    errors.push('opening_snapshot_at, if present, must be a valid UTC date-time');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, contract: input };
}

/**
 * Assert a contract is a specific coverage_kind. Returns { ok, errors }.
 * This enforces the kind-mismatch guards: an observation contract cannot be
 * used as release-emitter evidence, a release-emitter contract cannot be used
 * as opening-state evidence, etc.
 */
function requireKind(input, expectedKind) {
  const base = validateCoverageContract(input);
  if (!base.ok) return base;
  if (base.contract.coverage_kind !== expectedKind) {
    return {
      ok: false,
      errors: [`coverage_kind mismatch: expected ${expectedKind}, got ${base.contract.coverage_kind} (a ${base.contract.coverage_kind} contract cannot serve as ${expectedKind} evidence)`],
    };
  }
  return base;
}

/**
 * Does a validated contract of the given kind prove coverage of the requested
 * window [windowStartMs, windowEndMs]? Requires state === 'complete' and the
 * contract window to fully contain the requested window.
 */
function coversWindow(contract, windowStartMs, windowEndMs) {
  if (!contract || contract.state !== 'complete') return false;
  const startMs = parseUtc(contract.window_start);
  const endMs = parseUtc(contract.window_end);
  if (startMs === null || endMs === null) return false;
  return startMs <= windowStartMs && endMs >= windowEndMs;
}

module.exports = {
  SCHEMA_ID,
  COVERAGE_KINDS,
  STATES,
  parseUtc,
  validateCoverageContract,
  requireKind,
  coversWindow,
};
