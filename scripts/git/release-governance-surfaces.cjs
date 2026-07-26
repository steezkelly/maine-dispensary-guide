'use strict';

/**
 * Canonical release-governance surface inventory.
 *
 * Every required authority, package mapping, hook, verifier, and active
 * operator-guidance surface belongs here. Both the verifier and its governance
 * contract import this module so trigger coverage cannot drift from scanning.
 */
const REQUIRED_GOVERNANCE_SURFACES = Object.freeze([
  '.github/workflows/ci.yml',
  '.githooks/pre-push',
  'AGENTS.md',
  'CONTEXT.md',
  'MDG_AGENT_HANDBOOK.md',
  'PROJECT_STATE.md',
  'SCRIPTS.md',
  'apps/maine-cannabis/package.json',
  'apps/maine-cannabis/scripts/seo/city-title-rewriter.cjs',
  'docs/README.md',
  'docs/agents/domain.md',
  'docs/governance/AGENT_WORKING_ORDERS.md',
  'docs/governance/mdg-agent-orchestration-v1.md',
  'docs/governance/templates/mdg-integrator-checklist.md',
  'docs/governance/templates/mdg-kanban-card-body.md',
  'docs/governance/templates/mdg-verifier-prompt.md',
  'docs/governance/verifier-governance-migration-notes-2026-07-20.md',
  'docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md',
  'package.json',
  'project-todos.md',
  'scripts/git/install-hooks.cjs',
  'scripts/git/pre-push-verify.cjs',
]);

const GOVERNANCE_TRIGGER_FILES = Object.freeze([
  ...REQUIRED_GOVERNANCE_SURFACES,
  'scripts/git/release-governance-surfaces.cjs',
  'scripts/git/tests/pre-push-verify-governance.test.cjs',
]);

module.exports = {
  REQUIRED_GOVERNANCE_SURFACES,
  GOVERNANCE_TRIGGER_FILES,
};
