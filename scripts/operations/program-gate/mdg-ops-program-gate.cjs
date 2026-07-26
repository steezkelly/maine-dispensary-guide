'use strict';

/**
 * mdg-ops-program-gate.cjs — outcome-aware program gate (OPS-06A-2).
 *
 * Task COMPLETION alone is not sufficient to unlock a conditionally-dependent
 * downstream task. The predecessor must also record an ALLOWED analytical
 * outcome. This is the lesson of the OPS-07 auto-claim: OPS-06 completed with
 * INSUFFICIENT_EVIDENCE, which must NOT unlock OPS-07.
 *
 * Authority model:
 *   - The ANALYTICAL result (the recorded outcome) is EVIDENCE, not authority.
 *   - The authoritative gate decision lives in the Kanban / task-contract
 *     control plane. This module only COMPUTES the decision; the control plane
 *     applies it (blocks/unblocks the card). The analytics ledger is never
 *     authoritative.
 *
 * Fail-closed: an unknown, missing, or disallowed outcome never unlocks a
 * downstream task. No priority scoring, no change to first-eligible ordering.
 *
 * Node built-ins only. No dependency. Pure functions.
 */

/** Outcomes that satisfy a conditional program dependency. */
const ALLOWED_OUTCOMES = Object.freeze([
  'BOTTLENECK_IDENTIFIED',
  'POLICY_CANDIDATE',
  'EVIDENCE_SUFFICIENT',
]);

/** Outcomes that explicitly do NOT satisfy the gate. */
const DISALLOWED_OUTCOMES = Object.freeze([
  'INSUFFICIENT_EVIDENCE',
  'INSUFFICIENT_DATA',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
]);

/** Terminal-success task statuses (completion). */
const COMPLETED_STATUSES = Object.freeze(['completed', 'done', 'accepted', 'released']);

function normalize(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isCompleted(status) {
  return COMPLETED_STATUSES.includes(normalize(status).toLowerCase());
}

/**
 * Evaluate whether a single predecessor satisfies the gate for a downstream
 * task. Returns { satisfied, reason, outcome, required_outcome }.
 *
 * Rules (fail-closed):
 *   - predecessor not completed            -> not satisfied
 *   - completed but no recorded outcome    -> not satisfied (completion alone insufficient)
 *   - recorded outcome in DISALLOWED set   -> not satisfied
 *   - recorded outcome unrecognized        -> not satisfied (fail-closed)
 *   - recorded outcome in ALLOWED set      -> satisfied
 */
function evaluatePredecessor(predecessor, { requiredOutcome = null } = {}) {
  const p = predecessor || {};
  const status = normalize(p.status);
  const outcome = normalize(p.outcome).toUpperCase();
  const required = requiredOutcome ? normalize(requiredOutcome).toUpperCase() : null;

  if (!isCompleted(status)) {
    return {
      satisfied: false,
      reason: `predecessor ${p.task_id || '(unknown)'} is not completed (status=${status || 'none'})`,
      outcome: outcome || null,
      required_outcome: required || ALLOWED_OUTCOMES,
    };
  }

  if (!outcome) {
    return {
      satisfied: false,
      reason: `predecessor ${p.task_id || '(unknown)'} completed but recorded NO outcome — completion alone is insufficient`,
      outcome: null,
      required_outcome: required || ALLOWED_OUTCOMES,
    };
  }

  if (required && outcome !== required) {
    return {
      satisfied: false,
      reason: `predecessor outcome ${outcome} does not match the required outcome ${required}`,
      outcome,
      required_outcome: required,
    };
  }

  if (DISALLOWED_OUTCOMES.includes(outcome)) {
    return {
      satisfied: false,
      reason: `predecessor outcome ${outcome} is explicitly disallowed — does not unlock downstream work`,
      outcome,
      required_outcome: required || ALLOWED_OUTCOMES,
    };
  }

  if (ALLOWED_OUTCOMES.includes(outcome)) {
    return {
      satisfied: true,
      reason: `predecessor outcome ${outcome} satisfies the gate`,
      outcome,
      required_outcome: required || ALLOWED_OUTCOMES,
    };
  }

  // Unrecognized outcome -> fail closed.
  return {
    satisfied: false,
    reason: `predecessor outcome ${outcome} is not a recognized allowed outcome (fail-closed)`,
    outcome,
    required_outcome: required || ALLOWED_OUTCOMES,
  };
}

/**
 * Evaluate a set of predecessors. The downstream task is dispatchable only if
 * EVERY predecessor satisfies the gate (AND semantics). Returns
 * { dispatchable, unsatisfied[], satisfied[], required_outcome }.
 */
function evaluateGate(predecessors, { requiredOutcome = null } = {}) {
  const list = Array.isArray(predecessors) ? predecessors : [];
  const results = list.map((p) => evaluatePredecessor(p, { requiredOutcome }));
  const unsatisfied = results.filter((r) => !r.satisfied);
  const satisfied = results.filter((r) => r.satisfied);
  return {
    dispatchable: unsatisfied.length === 0 && list.length > 0,
    unsatisfied,
    satisfied,
    required_outcome: requiredOutcome ? normalize(requiredOutcome).toUpperCase() : ALLOWED_OUTCOMES,
  };
}

/**
 * Render the structured blocked-card annotation required for a gated card:
 * blocker owner, evidence reference, required next action, measurable resume
 * trigger, required outcome. Pure formatting — the control plane writes it.
 */
function blockAnnotation({ gatedTaskId, predecessorTaskId, evidenceRef, requiredOutcome, nextAction, resumeTrigger, blockerOwner }) {
  return {
    gated_task_id: gatedTaskId,
    blocker_owner: blockerOwner || 'coordinator',
    blocked_by: predecessorTaskId,
    evidence_reference: evidenceRef,
    required_outcome: requiredOutcome || ALLOWED_OUTCOMES,
    required_next_action: nextAction,
    measurable_resume_trigger: resumeTrigger,
    gate: 'outcome-aware (completion alone insufficient)',
  };
}

module.exports = {
  ALLOWED_OUTCOMES,
  DISALLOWED_OUTCOMES,
  COMPLETED_STATUSES,
  isCompleted,
  evaluatePredecessor,
  evaluateGate,
  blockAnnotation,
};
