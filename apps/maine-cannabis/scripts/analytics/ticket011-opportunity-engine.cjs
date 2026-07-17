'use strict';
/**
 * MDG-ANALYTICS-001 Ticket 011 — governed opportunity/investigation engine.
 *
 * Consumes Ticket 010 INVESTIGATION_ELIGIBLE transitions only. This module
 * creates durable read-only investigation packets, not recommendations or
 * production edits. Intervention proposal drafting is schema-validated and
 * remains A4-authorized work outside automatic execution.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CONTRACT_VERSION = 'ticket-011.v1';
const OPPORTUNITY_SCHEMA_VERSION = 'opportunity.v0.5';
const STATES = Object.freeze(['INVESTIGATION_ELIGIBLE', 'INVESTIGATING', 'INVESTIGATION_RESOLVED', 'INTERVENTION_PROPOSED', 'AWAITING_AUTHORIZATION', 'MEASUREMENT_BLOCKED']);
const EVIDENCE_GRADES = Object.freeze(['E0', 'E1', 'E2', 'E3', 'E4']);
const RESOLUTION_CODES = Object.freeze(['NO_ACTION_SUPPORTED', 'MEASUREMENT_REPAIR_REQUIRED', 'MANIFEST_RECLASSIFICATION_REQUIRED', 'MONITOR_QUERY_MIX', 'INTERVENTION_CANDIDATE', 'EDITORIAL_TASK_OWNERSHIP_REVIEW', 'INSUFFICIENT_DISCRIMINATING_EVIDENCE']);
const HYPOTHESIS_FAMILIES = Object.freeze([
  ['H0_NO_ACTION_OR_NOISE', 'No actionable effect or practical irrelevance explains the signal.'],
  ['MEASUREMENT_OR_CLASSIFICATION', 'Measurement, source coverage, canonicalization, or task classification explains the signal.'],
  ['DEMAND_OR_QUERY_MIX', 'Demand, query-intent, position, device, or geography mix explains the signal.'],
  ['PACKAGING_OR_TASK_PROMISE', 'SERP/title/promise and declared task alignment explains the signal.'],
  ['PAGE_CONTENT_OR_UX', 'Page content, interaction, exposure, or progression explains the signal.'],
  ['CHANGE_CONTAMINATION', 'Deployment, instrumentation, template, or overlapping change explains the signal.'],
]);
const DIAGNOSTIC_CATALOG = Object.freeze([
  { diagnostic_id: 'D_QUERY_INTENT_DECOMPOSITION', question: 'Did query-intent, position, device, or geography mix change?', evidence_source: 'query_intent_distributions + settled acquisition rows', supports: ['DEMAND_OR_QUERY_MIX'], weakens: ['PACKAGING_OR_TASK_PROMISE'], information_value_class: 'HIGH', cost_class: 'LOW' },
  { diagnostic_id: 'D_PROMISE_BODY_CONTRACT_AUDIT', question: 'Does the SERP promise align with the declared task and body contract?', evidence_source: 'page_task_manifest + page content metadata', supports: ['PACKAGING_OR_TASK_PROMISE', 'MEASUREMENT_OR_CLASSIFICATION'], weakens: ['H0_NO_ACTION_OR_NOISE'], information_value_class: 'HIGH', cost_class: 'TRIVIAL' },
  { diagnostic_id: 'D_EXPOSURE_FUNNEL_AUDIT', question: 'Are eligible users exposed to and selecting the approved progression surface?', evidence_source: 'Ticket 007/008 event and exposure observations', supports: ['PAGE_CONTENT_OR_UX'], weakens: ['DEMAND_OR_QUERY_MIX'], information_value_class: 'HIGH', cost_class: 'LOW' },
  { diagnostic_id: 'D_CHANGE_MANIFEST_JOIN', question: 'Did a deployment or material change overlap the evidence window?', evidence_source: 'deployment/change manifest', supports: ['CHANGE_CONTAMINATION'], weakens: ['PAGE_CONTENT_OR_UX'], information_value_class: 'HIGH', cost_class: 'TRIVIAL' },
  { diagnostic_id: 'D_COMPETING_URL_AUDIT', question: 'Do multiple MDG URLs appear to own overlapping task/query families?', evidence_source: 'page manifest + query/page distribution', supports: ['PACKAGING_OR_TASK_PROMISE'], weakens: ['H0_NO_ACTION_OR_NOISE'], information_value_class: 'MEDIUM', cost_class: 'LOW' },
]);

function hash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
function clean(value) { return value == null || value === '' ? null : String(value); }
function requireTimestamp(value, field) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an explicit ISO-8601 timestamp`);
  return String(value);
}
function stableDeduplicationKey(row) { return row.deduplication_key || `oppkey_${hash([row.page_id || '(page)', row.canonical_page_path || row.canonical_path || '(path)', row.primary_task_family || '(task)', row.metric_family || '(metric)', row.signal_family || 'derived_metric'].join('|'))}`; }
function stableOpportunityId(row, deduplicationKey) { return row.opportunity_id || `opp_${String(row.window_end || row.window_start || 'unknown').replaceAll('-', '')}_${hash(deduplicationKey)}`; }
function settled(row) { return row.settlement_state === 'settled' || row.window_status === 'settled' || row.settled === true; }
function isEligible(row) { return row.state === 'INVESTIGATION_ELIGIBLE' && settled(row) && !String(row.measurement_status || '').startsWith('MEASUREMENT_BLOCKED'); }
function causalLanguageAllowed(grade) { return ['E2', 'E3', 'E4'].includes(grade); }

function buildHypotheses(row) {
  const taskMismatch = ['PROMISE_BODY_MISMATCH', 'QUERY_BODY_MISMATCH', 'QUERY_PROMISE_MISMATCH', 'MULTI_INTENT_LANDING'].includes(row.promise_task_alignment);
  const families = HYPOTHESIS_FAMILIES.map(([hypothesis_id, statement]) => ({ hypothesis_id, family: hypothesis_id, statement, prior_plausibility_class: 'UNSET', supporting_observations: [], contradicting_observations: [], required_discriminating_evidence: [], status: 'LIVE', status_reason: 'No diagnostic has updated this hypothesis yet.' }));
  if (taskMismatch) families.push({ hypothesis_id: 'TASK_OWNERSHIP_REVIEW', family: 'TASK_OWNERSHIP_REVIEW', statement: 'The declared URL task requires editorial task-ownership investigation before any material change.', prior_plausibility_class: 'HIGH', supporting_observations: ['promise_task_alignment'], contradicting_observations: [], required_discriminating_evidence: ['page task contract audit', 'competing URL audit'], status: 'LIVE', status_reason: 'Task mismatch is an investigation target, not an edit instruction.' });
  return families;
}

function buildDiagnosticPlan(row) {
  const taskMismatch = ['PROMISE_BODY_MISMATCH', 'QUERY_BODY_MISMATCH', 'QUERY_PROMISE_MISMATCH', 'MULTI_INTENT_LANDING'].includes(row.promise_task_alignment);
  return DIAGNOSTIC_CATALOG.map((d) => ({
    diagnostic_id: d.diagnostic_id, question: d.question, evidence_source: d.evidence_source,
    hypotheses_supported_if_positive: d.supports, hypotheses_weakened_if_positive: d.weakens,
    information_value_class: d.information_value_class, cost_class: d.cost_class,
    production_touch: false, required_capability: 'read_only', stop_condition: 'stop after budget or when evidence remains non-discriminating', status: 'PLANNED'
  })).concat(taskMismatch ? [{ diagnostic_id: 'D_TASK_OWNERSHIP_PACKET', question: 'Which user task should this URL own?', evidence_source: 'page contract, query mix, competing URLs, body task map', hypotheses_supported_if_positive: ['TASK_OWNERSHIP_REVIEW'], hypotheses_weakened_if_positive: ['H0_NO_ACTION_OR_NOISE'], information_value_class: 'HIGH', cost_class: 'LOW', production_touch: false, required_capability: 'read_only', stop_condition: 'route to editorial task-ownership review; do not rewrite', status: 'PLANNED' }] : []);
}

function sourceReleaseIds(row) {
  if (row.source_release_ids && typeof row.source_release_ids === 'object') return row.source_release_ids;
  if (row.canonical_release_id || row.acquisition_release_id) {
    return {
      canonical_release_id: row.canonical_release_id || null,
      acquisition_release_id: row.acquisition_release_id || null,
    };
  }
  return {};
}

function makeInvestigationPacket(row) {
  const deduplicationKey = stableDeduplicationKey(row);
  const evidenceGrade = EVIDENCE_GRADES.includes(row.evidence_grade) ? row.evidence_grade : 'E1';
  const observation = row.observation_statement || `Observed ${row.metric_family || 'derived metric'} evidence for settled window ${row.window_start || '(unknown)'} through ${row.window_end || '(unknown)'} relative to metric-specific peer context.`;
  const detectedAt = requireTimestamp(row.detected_at, 'detected_at');
  return {
    opportunity_id: stableOpportunityId(row, deduplicationKey), opportunity_schema_version: OPPORTUNITY_SCHEMA_VERSION,
    created_at: detectedAt, updated_at: detectedAt,
    state: 'INVESTIGATION_ELIGIBLE', state_version: 1, deduplication_key: deduplicationKey,
    page_id: row.page_id || null, canonical_path: row.canonical_page_path || row.canonical_path || null,
    metric_family: row.metric_family || null, signal_family: row.signal_family || 'derived_metric',
    evidence_grade: evidenceGrade, causal_language_allowed: causalLanguageAllowed(evidenceGrade), selected_from_extreme_tail: Boolean(row.selected_from_extreme_tail),
    change_contamination_status: row.change_contamination_status || 'NOT_CONTAMINATED',
    observation_statement: observation,
    task_context: { declared_primary_task: row.primary_task_family || null, secondary_tasks: row.secondary_task_families || [], serp_promise_family: row.serp_promise_family || null, promise_task_alignment: row.promise_task_alignment || null, observed_query_intent_distribution: row.query_intent_distribution || row.query_intent || 'unknown', entity_scope: row.entity_scope || null, approved_progression_families: row.approved_progression_families || [], task_contract_status: row.task_contract_status || 'UNKNOWN' },
    immutable_detection_snapshot: { detected_at: detectedAt, window_start: row.window_start || row.date || null, window_end: row.window_end || row.date || null, settlement_state: row.settlement_state || row.window_status || null, source_release_ids: sourceReleaseIds(row), page_manifest_version: row.page_manifest_version || null, query_intent_classifier_version: row.query_intent_classifier_version || 'query-intent.v1', peer_policy_version: row.peer_policy_version || null, peer_cell_id: row.peer_cell_id || null, peer_fallback_level: row.peer_fallback_level ?? null, posterior_summary: { posterior_mean: row.posterior_mean ?? null, interval_80: [row.posterior_interval_80_low ?? null, row.posterior_interval_80_high ?? null], interval_95: [row.posterior_interval_95_low ?? null, row.posterior_interval_95_high ?? null], practical_delta: row.practical_delta ?? null, probability_above_practical_delta: row.probability_above_practical_delta ?? null, probability_below_practical_delta: row.probability_below_practical_delta ?? null }, measurement_health_state: row.measurement_status || row.measurement_health || null, change_contamination_state: row.change_contamination_status || 'NOT_CONTAMINATED', selected_from_extreme_tail: Boolean(row.selected_from_extreme_tail) },
    current_evidence_summary: { posterior_mean: row.posterior_mean ?? null, interval_80: [row.posterior_interval_80_low ?? null, row.posterior_interval_80_high ?? null], interval_95: [row.posterior_interval_95_low ?? null, row.posterior_interval_95_high ?? null], probability_above_practical_delta: row.probability_above_practical_delta ?? null, probability_below_practical_delta: row.probability_below_practical_delta ?? null, sample_state: row.sample_state || null, persistence_state: row.state, evidence_grade: evidenceGrade },
    hypotheses: buildHypotheses(row), diagnostic_plan: buildDiagnosticPlan(row), diagnostic_ledger: [], resolution: null,
    authority: { investigation_authority_level: 'A1', production_edit_authority: 'A4_REQUIRED', current_authorization_state: 'NOT_AUTHORIZED', authorization_scope_hash: null },
    proposal_ids: [], recommendation_or_edit_instruction: null,
  };
}

function mergeCurrentEvidence(packet, row) {
  return { ...packet, updated_at: requireTimestamp(row.detected_at, 'detected_at'), current_evidence_summary: { ...packet.current_evidence_summary, posterior_mean: row.posterior_mean ?? packet.current_evidence_summary.posterior_mean, interval_80: [row.posterior_interval_80_low ?? packet.current_evidence_summary.interval_80[0], row.posterior_interval_80_high ?? packet.current_evidence_summary.interval_80[1]], interval_95: [row.posterior_interval_95_low ?? packet.current_evidence_summary.interval_95[0], row.posterior_interval_95_high ?? packet.current_evidence_summary.interval_95[1]], probability_above_practical_delta: row.probability_above_practical_delta ?? packet.current_evidence_summary.probability_above_practical_delta, probability_below_practical_delta: row.probability_below_practical_delta ?? packet.current_evidence_summary.probability_below_practical_delta, sample_state: row.sample_state || packet.current_evidence_summary.sample_state, persistence_state: row.state || packet.current_evidence_summary.persistence_state }, recommendation_or_edit_instruction: null };
}

function buildOpportunityEngine(input) {
  const rows = Array.isArray(input) ? input : (input?.derived_evidence || input?.rows || []);
  const cases = new Map();
  const eventLedger = [];
  for (const row of rows) {
    if (!isEligible(row)) continue;
    const detectedAt = requireTimestamp(row.detected_at, 'detected_at');
    const key = stableDeduplicationKey(row);
    if (!cases.has(key)) cases.set(key, makeInvestigationPacket(row));
    else cases.set(key, mergeCurrentEvidence(cases.get(key), row));
    eventLedger.push({ event: 'EVIDENCE_REFRESH', opportunity_id: cases.get(key).opportunity_id, deduplication_key: key, window_start: row.window_start || row.date || null, window_end: row.window_end || row.date || null, state: row.state, appended_at: detectedAt });
  }
  return { schema_version: CONTRACT_VERSION, opportunity_schema_version: OPPORTUNITY_SCHEMA_VERSION, cases: [...cases.values()], event_ledger: eventLedger, case_count: cases.size, duplicate_unresolved_cases: 0, no_production_mutation: true, no_recommendations_assertion: [...cases.values()].every((c) => c.recommendation_or_edit_instruction === null) };
}

function applyDiagnosticUpdate(packet, result) {
  if (!packet || !result || !result.diagnostic_id) throw new Error('diagnostic_id and packet are required');
  const planned = packet.diagnostic_plan.find((d) => d.diagnostic_id === result.diagnostic_id);
  if (!planned) throw new Error(`diagnostic is not declared: ${result.diagnostic_id}`);
  if (result.production_touch === true || planned.production_touch === true) throw new Error('production edits are not diagnostics');
  const supporting = new Set(result.supporting_hypotheses || planned.hypotheses_supported_if_positive || []);
  const contradicting = new Set(result.contradicting_hypotheses || planned.hypotheses_weakened_if_positive || []);
  const hypotheses = packet.hypotheses.map((h) => {
    const next = { ...h, supporting_observations: [...h.supporting_observations], contradicting_observations: [...h.contradicting_observations] };
    if (supporting.has(h.hypothesis_id)) next.supporting_observations.push(result.observation || result.result_summary || 'diagnostic positive');
    if (contradicting.has(h.hypothesis_id)) next.contradicting_observations.push(result.observation || result.result_summary || 'diagnostic positive');
    if (result.rejected_hypotheses?.includes(h.hypothesis_id)) { next.status = 'REJECTED'; next.status_reason = result.result_summary || 'diagnostic result rejected hypothesis'; }
    else if (result.supported_hypotheses?.includes(h.hypothesis_id)) { next.status = 'SUPPORTED_NOT_CAUSAL'; next.status_reason = result.result_summary || 'diagnostic supports hypothesis without causal proof'; }
    return next;
  });
  const ledgerEntry = { diagnostic_id: result.diagnostic_id, executed_at: requireTimestamp(result.executed_at, 'executed_at'), input_provenance: result.input_provenance || null, output_artifact: result.output_artifact || null, result_summary: result.result_summary || null, evidence_quality: result.evidence_quality || 'partial', hypothesis_updates: { supporting: [...supporting], contradicting: [...contradicting] }, production_touch: false };
  return { ...packet, state: 'INVESTIGATING', state_version: packet.state_version + 1, hypotheses, diagnostic_ledger: [...packet.diagnostic_ledger, ledgerEntry], updated_at: ledgerEntry.executed_at, recommendation_or_edit_instruction: null };
}

function resolveInvestigation(packet, resolution) {
  if (!packet || packet.state !== 'INVESTIGATING' && packet.state !== 'INVESTIGATION_ELIGIBLE') throw new Error('packet must be active investigation');
  if (!RESOLUTION_CODES.includes(resolution.resolution_code)) throw new Error(`invalid resolution code: ${resolution.resolution_code}`);
  const intervention = resolution.resolution_code === 'INTERVENTION_CANDIDATE';
  const resolvedAt = requireTimestamp(resolution.resolved_at, 'resolved_at');
  return { ...packet, state: 'INVESTIGATION_RESOLVED', state_version: packet.state_version + 1, resolution: { resolution_code: resolution.resolution_code, resolution_summary: resolution.resolution_summary || null, remaining_uncertainty: resolution.remaining_uncertainty || null, leading_hypotheses: resolution.leading_hypotheses || [], rejected_hypotheses: resolution.rejected_hypotheses || [], evidence_grade: resolution.evidence_grade || 'E1', proposal_allowed: intervention, resolved_at: resolvedAt }, updated_at: resolvedAt, recommendation_or_edit_instruction: null };
}

function validateInterventionProposal(proposal) {
  const required = ['proposal_id', 'opportunity_id', 'proposal_schema_version', 'status', 'intervention_hypothesis', 'change_surface', 'exact_routes_or_components', 'proposed_treatment', 'primary_metric', 'eligible_population', 'minimum_practical_effect', 'harm_threshold', 'guardrail_metrics', 'maximum_horizon', 'decision_rule', 'rollback_procedure', 'required_authority_level', 'current_authorization_state'];
  const missing = required.filter((key) => proposal?.[key] == null);
  const errors = [...missing.map((key) => `missing:${key}`)];
  if (proposal?.production_touch !== false) errors.push('production_touch must be false until authorized');
  if (!['A4', 'A3_ALLOWLISTED'].includes(proposal?.required_authority_level)) errors.push('material intervention requires A4 or explicit A3 allowlist');
  if (!['DRAFT', 'AWAITING_AUTHORIZATION'].includes(proposal?.status)) errors.push('proposal must begin DRAFT or AWAITING_AUTHORIZATION');
  if (!['E2', 'E3', 'E4'].includes(proposal?.causal_evidence_target)) errors.push('causal_evidence_target must target E2/E3/E4');
  return { valid: errors.length === 0, errors };
}

function buildProposalDraft(packet, input = {}) {
  if (!packet?.resolution || !['INTERVENTION_CANDIDATE', 'EDITORIAL_TASK_OWNERSHIP_REVIEW'].includes(packet.resolution.resolution_code)) throw new Error('proposal requires eligible investigation resolution');
  const proposal = { proposal_id: `prop_${hash(packet.opportunity_id)}`, opportunity_id: packet.opportunity_id, proposal_schema_version: 'intervention-proposal.v0.5', created_at: requireTimestamp(input.created_at, 'created_at'), status: 'DRAFT', intervention_hypothesis: input.intervention_hypothesis || null, leading_investigation_hypothesis_ids: packet.resolution.leading_hypotheses, evidence_grade_before_intervention: packet.resolution.evidence_grade, causal_evidence_target: input.causal_evidence_target || 'E2', change_surface: input.change_surface || null, exact_routes_or_components: input.exact_routes_or_components || null, proposed_treatment: input.proposed_treatment || null, excluded_changes: input.excluded_changes || [], scope_size: input.scope_size || null, reversibility_class: input.reversibility_class || null, rollback_procedure: input.rollback_procedure || null, primary_metric: input.primary_metric || packet.metric_family, metric_contract_version: input.metric_contract_version || 'ticket-009.v1', eligible_population: input.eligible_population || null, minimum_practical_effect: input.minimum_practical_effect || null, harm_threshold: input.harm_threshold || null, guardrail_metrics: input.guardrail_metrics || [], maximum_horizon: input.maximum_horizon || null, decision_rule: input.decision_rule || null, settlement_lag: input.settlement_lag || null, contamination_policy: input.contamination_policy || null, required_authority_level: 'A4', current_authorization_state: 'NOT_AUTHORIZED', authorizer: null, authorization_timestamp: null, authorization_scope_hash: null, production_touch: false };
  const validation = validateInterventionProposal(proposal);
  return { proposal, validation };
}

function updateHypothesisLedger(packet, result) { return applyDiagnosticUpdate(packet, result); }

function parseArgs(argv) { const out = {}; for (const a of argv) { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) out[m[1]] = m[2]; } return out; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.derived || !args.out) { console.error('Usage: --derived=Ticket010.json --out=Ticket011.json'); process.exitCode = 2; return; }
  const result = buildOpportunityEngine(readJson(args.derived));
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(args.out.replace(/\.json$/, '.manifest.json'), JSON.stringify({ schema_version: CONTRACT_VERSION, case_count: result.case_count, event_count: result.event_ledger.length, duplicate_unresolved_cases: result.duplicate_unresolved_cases, no_production_mutation: result.no_production_mutation, no_recommendations_assertion: result.no_recommendations_assertion, output_hash: hash(JSON.stringify(result.cases)) }, null, 2) + '\n');
  console.log(`Ticket 011 opportunity packets: ${result.case_count} cases written to ${args.out}`);
}

module.exports = { CONTRACT_VERSION, OPPORTUNITY_SCHEMA_VERSION, STATES, EVIDENCE_GRADES, RESOLUTION_CODES, HYPOTHESIS_FAMILIES, DIAGNOSTIC_CATALOG, stableDeduplicationKey, stableOpportunityId, buildHypotheses, buildDiagnosticPlan, makeInvestigationPacket, buildOpportunityEngine, applyDiagnosticUpdate, updateHypothesisLedger, resolveInvestigation, validateInterventionProposal, buildProposalDraft, causalLanguageAllowed };
if (require.main === module) main();
