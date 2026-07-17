'use strict';
/**
 * MDG-ANALYTICS-001 Ticket 010 — derived evidence and pre-investigation state machine.
 *
 * Offline/read-only. Consumes Ticket 009 baseline rows plus explicit window,
 * measurement-health, change-context, and prior-state evidence. It never emits
 * recommendations or production edits. Ticket 011 opportunity generation is
 * deliberately out of scope.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CONTRACT_VERSION = 'ticket-010.v1';
const STATES = Object.freeze(['NORMAL', 'WATCH', 'PERSISTENT_SHIFT_CANDIDATE', 'INVESTIGATION_ELIGIBLE', 'MEASUREMENT_BLOCKED']);
const PERFORMANCE_LABELS = Object.freeze(['WINNER_CANDIDATE', 'SERP_PACKAGING_OPPORTUNITY', 'INTENT_OR_LANDING_RISK', 'WEAK_OR_IMMATURE_ASSET', 'HIGH_SATISFACTION_LOW_PROGRESSION', 'HIGH_SATISFACTION_LOW_DISCOVERY', 'EXPERIENCE_CORRELATED_RISK', 'CONTENT_DECAY_CANDIDATE']);
const BLOCKED_REASONS = Object.freeze({ HEALTH: 'MEASUREMENT_BLOCKED', UNSETTLED: 'WINDOW_UNSETTLED', INCOMPARABLE: 'WINDOW_NOT_COMPARABLE', CHANGE: 'CHANGE_CONTAMINATED', CHANGE_CONTEXT: 'CHANGE_CONTEXT_UNEVALUATED', TASK: 'TASK_CONTRACT_UNRESOLVED', SOURCE: 'SOURCE_UNAVAILABLE' });

function clean(v) { return v == null || v === '' ? null : String(v); }
function bool(v, fallback = false) { return v == null ? fallback : Boolean(v); }
function hash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
function stableDeduplicationKey(row) {
  return `oppkey_${hash([row.page_id || '(page)', row.canonical_page_path || row.canonical_path || '(path)', row.primary_task_family || '(task)', row.metric_family || '(metric)', row.signal_family || signalFamily(row)].join('|'))}`;
}
function signalFamily(row) {
  const metric = String(row.metric_family || '').toLowerCase();
  if (metric.includes('ctr')) return 'acquisition_discovery';
  if (metric.includes('progress')) return 'progression';
  if (metric.includes('attention') || metric.includes('satisfaction')) return 'satisfaction_attention';
  if (metric.includes('action')) return 'action_selection';
  if (metric.includes('vital') || metric.includes('lcp') || metric.includes('inp') || metric.includes('cls')) return 'experience';
  return 'derived_metric';
}
function isSettled(row) { return row.settlement_state === 'settled' || row.window_status === 'settled' || row.settled === true; }
function isHealthy(row) { return row.measurement_status === 'MEASURED' || row.measurement_status === 'HEALTHY' || row.measurement_health === 'HEALTHY' || row.measurement_health_status === 'PASS'; }
function isTaskResolved(row) { return ['CONFIRMED', 'RESOLVED'].includes(String(row.task_contract_status || '').toUpperCase()) && row.measurement_status !== 'MEASUREMENT_BLOCKED: TASK_CONTRACT_UNRESOLVED'; }
function isComparable(row) { return row.window_comparable !== false && row.measurement_status !== 'WINDOW_NOT_COMPARABLE' && row.measurement_status !== 'WINDOW_MEASUREMENT_DEGRADED'; }
function changeState(row) { return String(row.change_contamination_status || row.change_status || '').toUpperCase(); }
function signalProbability(row) { return Math.max(Number(row.probability_above_practical_delta) || 0, Number(row.probability_below_practical_delta) || 0); }
function practicalDirection(row) {
  const above = Number(row.probability_above_practical_delta) || 0;
  const below = Number(row.probability_below_practical_delta) || 0;
  if (above === 0 && below === 0) return 'none';
  return above >= below ? 'above_peer' : 'below_peer';
}
function opportunityId(row) { return `opp_${String(row.window_end || row.window_start || 'unknown').replaceAll('-', '')}_${hash(row.deduplication_key || stableDeduplicationKey(row))}`; }
function hasOverlappingPriorWindow(row, history) {
  const start = String(row.window_start || row.date || '');
  const end = String(row.window_end || row.date || row.window_start || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return false;
  return history.some((prior) => {
    const priorStart = String(prior.window_start || prior.date || '');
    const priorEnd = String(prior.window_end || prior.date || prior.window_start || '');
    return /^\d{4}-\d{2}-\d{2}$/.test(priorStart) && /^\d{4}-\d{2}-\d{2}$/.test(priorEnd) && priorStart <= end && start <= priorEnd;
  });
}

function measurementBlockReason(row) {
  if (row.duplicate_window_evidence) return 'DUPLICATE_WINDOW_EVIDENCE';
  if (row.overlapping_window_evidence) return 'OVERLAPPING_WINDOW_EVIDENCE';
  if (String(row.measurement_status || '').startsWith('MEASUREMENT_BLOCKED')) return row.measurement_status;
  if (!isHealthy(row)) return row.measurement_status || BLOCKED_REASONS.HEALTH;
  if (!isSettled(row)) return BLOCKED_REASONS.UNSETTLED;
  if (!isComparable(row)) return BLOCKED_REASONS.INCOMPARABLE;
  if (row.change_context_evaluated !== true) return BLOCKED_REASONS.CHANGE_CONTEXT;
  if (changeState(row) === 'CONTAMINATED' || changeState(row) === 'CHANGE_CONTAMINATED') return BLOCKED_REASONS.CHANGE;
  if (!isTaskResolved(row)) return BLOCKED_REASONS.TASK;
  return null;
}

function requiredEvidence(row) {
  const blocked = measurementBlockReason(row);
  const cwv = /core_web_vitals|speed_insights|lcp|inp|cls/i.test(String(row.metric_family || row.signal_family || ''));
  return {
    source_contract_healthy: isHealthy(row),
    source_window_settled: isSettled(row),
    source_window_comparable: isComparable(row),
    page_manifest_match: row.page_manifest_match !== false && Boolean(row.page_id || row.canonical_page_path || row.canonical_path),
    task_contract_resolved: isTaskResolved(row),
    measurement_block_reason: blocked,
    change_context_evaluated: row.change_context_evaluated === true,
    cwv_field_percentile_semantics: cwv ? Boolean(row.field_percentile || row.percentile || row.source_semantics === 'field') : null,
  };
}

function classifySignal(row, config = {}) {
  const probability = signalProbability(row);
  const threshold = Number(config.practical_probability ?? row.practical_probability_threshold ?? 0.8);
  const sample = row.sample_state || 'insufficient';
  const blocked = measurementBlockReason(row);
  if (blocked) return { signal: 'blocked', direction: 'none', probability, threshold, practical_effect_plausible: false };
  const practical = ['directional', 'decision_eligible'].includes(sample) && probability >= threshold;
  return { signal: practical ? 'practical_shift' : 'no_practical_shift', direction: practical ? practicalDirection(row) : 'none', probability, threshold, practical_effect_plausible: practical };
}

function transitionForEvidence(row, history = [], config = {}) {
  const evidence = requiredEvidence(row);
  const signal = classifySignal(row, config);
  const prior = history.length ? history[history.length - 1] : null;
  if (evidence.measurement_block_reason) {
    return { state: 'MEASUREMENT_BLOCKED', reason: evidence.measurement_block_reason, signal, evidence, operator_item_emitted: prior?.state !== 'MEASUREMENT_BLOCKED' };
  }
  if (!signal.practical_effect_plausible) {
    return { state: 'NORMAL', reason: 'no_practical_effect_or_insufficient_sample', signal, evidence, operator_item_emitted: prior?.state && prior.state !== 'NORMAL' };
  }
  // Persistence is directional and contiguous: an above/below reversal or a
  // settled normal window starts a new run.
  const directionalRun = [];
  const evidenceHistory = [...history, { ...row, signal }];
  for (let i = evidenceHistory.length - 1; i >= 0; i--) {
    const candidate = evidenceHistory[i];
    if (!isSettled(candidate)) break;
    if (!candidate.signal?.practical_effect_plausible || candidate.signal.direction !== signal.direction) break;
    directionalRun.unshift(candidate);
  }
  const requiredSettled = Number(config.required_settled_windows || 2);
  const eligibilitySettled = Number(config.eligibility_settled_windows || (requiredSettled + 1));
  const persistent = directionalRun.length >= requiredSettled;
  const corroborated = bool(row.independent_source_corroborated, false) || bool(row.corroborated, false);
  const changeEvaluated = evidence.change_context_evaluated;
  let state = 'WATCH';
  let reason = 'new practical posterior shift';
  if (persistent || (corroborated && signal.probability >= Number(config.corroboration_probability || 0.9))) {
    state = 'PERSISTENT_SHIFT_CANDIDATE'; reason = persistent ? `practical shift persisted across ${directionalRun.length} settled windows` : 'practical shift corroborated by independent source';
  }
  if (state === 'PERSISTENT_SHIFT_CANDIDATE' && directionalRun.length >= eligibilitySettled && changeEvaluated && isTaskResolved(row)) {
    state = 'INVESTIGATION_ELIGIBLE'; reason = 'settled persistence/corroboration and change context evaluated';
  }
  const operatorItem = !prior || prior.state !== state || (prior.state !== 'INVESTIGATION_ELIGIBLE' && state === 'INVESTIGATION_ELIGIBLE');
  return { state, reason, signal, evidence, operator_item_emitted: operatorItem, persistence: { settled_signal_windows: directionalRun.length, required_settled_windows: requiredSettled, corroborated, change_context_evaluated: changeEvaluated } };
}

function cwvEvidence(row) {
  if (!/core_web_vitals|speed_insights|lcp|inp|cls/i.test(String(row.metric_family || row.signal_family || ''))) return null;
  return {
    source: row.source || row.source_family || 'unknown',
    field_percentile: row.field_percentile ?? row.percentile ?? null,
    percentile: row.percentile ?? row.field_percentile ?? null,
    semantic_type: 'field_percentile',
    performance_label_blocked: measurementBlockReason(row) !== null,
  };
}

function makeOpportunitySnapshot(row, transition) {
  if (transition.state !== 'INVESTIGATION_ELIGIBLE') return null;
  const deduplicationKey = stableDeduplicationKey(row);
  return {
    opportunity_id: opportunityId({ ...row, deduplication_key: deduplicationKey }),
    opportunity_schema_version: 'opportunity.v0.5',
    created_at: row.detected_at || new Date().toISOString(),
    updated_at: row.detected_at || new Date().toISOString(),
    state: 'INVESTIGATION_ELIGIBLE', state_version: 1, deduplication_key: deduplicationKey,
    page_id: row.page_id || null, canonical_path: row.canonical_page_path || row.canonical_path || null,
    settlement_state: row.settlement_state || row.window_status || null,
    measurement_status: row.measurement_status || null,
    canonical_release_id: row.canonical_release_id || null,
    acquisition_release_id: row.acquisition_release_id || null,
    source_release_ids: row.source_release_ids || {
      canonical_release_id: row.canonical_release_id || null,
      acquisition_release_id: row.acquisition_release_id || null,
    },
    metric_family: row.metric_family, signal_family: row.signal_family || signalFamily(row),
    evidence_grade: 'E1', causal_language_allowed: false,
    selected_from_extreme_tail: false,
    change_contamination_status: changeState(row) || 'NOT_CONTAMINATED',
    observation_statement: `For settled window ${row.window_start || '(unknown)'} through ${row.window_end || '(unknown)'}, the ${row.metric_family} posterior shows a ${transition.signal.direction} practical shift relative to its metric-specific peer context; this is an investigation signal, not a causal conclusion or edit instruction.`,
    task_context: { primary_task_family: row.primary_task_family || null, secondary_task_families: row.secondary_task_families || [], serp_promise_family: row.serp_promise_family || null, promise_task_alignment: row.promise_task_alignment || null, query_intent: row.query_intent || 'unknown', task_contract_status: row.task_contract_status || 'UNKNOWN' },
    posterior_snapshot: { posterior_mean: row.posterior_mean ?? null, posterior_interval_80_low: row.posterior_interval_80_low ?? null, posterior_interval_80_high: row.posterior_interval_80_high ?? null, posterior_interval_95_low: row.posterior_interval_95_low ?? null, posterior_interval_95_high: row.posterior_interval_95_high ?? null, probability_above_practical_delta: row.probability_above_practical_delta ?? null, probability_below_practical_delta: row.probability_below_practical_delta ?? null, practical_delta: row.practical_delta ?? null },
    peer_snapshot: { peer_policy_version: row.peer_policy_version || null, peer_cell_id: row.peer_cell_id || null, peer_fallback_level: row.peer_fallback_level ?? null, peer_count: row.peer_count ?? null },
    hypothesis_set_required: true, recommendation_or_edit_instruction: null, proposal_ids: [],
  };
}

function deriveEvidence(rows, config = {}) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = stableDeduplicationKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, deduplication_key: key });
  }
  const derived = [], transitions = [], opportunities = [];
  for (const [key, group] of groups) {
    group.sort((a, b) => String(a.window_end || a.window_start || '').localeCompare(String(b.window_end || b.window_start || '')));
    const history = [];
    const seenWindowIdentities = new Set();
    for (const row of group) {
      const windowIdentity = `${row.window_start || row.date || '(unknown-start)'}|${row.window_end || row.date || row.window_start || '(unknown-end)'}`;
      const evidenceRow = { ...row, duplicate_window_evidence: seenWindowIdentities.has(windowIdentity), overlapping_window_evidence: hasOverlappingPriorWindow(row, history) };
      seenWindowIdentities.add(windowIdentity);
      const transition = transitionForEvidence(evidenceRow, history, config);
      const current = { ...evidenceRow, deduplication_key: key, signal_family: evidenceRow.signal_family || signalFamily(evidenceRow), state: transition.state, state_reason: transition.reason, state_version: (history.at(-1)?.state_version || 0) + 1, signal: transition.signal, required_evidence: transition.evidence, cwv_evidence: cwvEvidence(evidenceRow), operator_item_emitted: transition.operator_item_emitted, persistence: transition.persistence || null, recommendation_or_edit_instruction: null, causal_language_allowed: false };
      derived.push(current);
      if (transition.operator_item_emitted) transitions.push({ deduplication_key: key, from_state: history.at(-1)?.state || null, to_state: transition.state, window_start: row.window_start || row.date || null, window_end: row.window_end || row.date || null, reason: transition.reason, emitted_operator_item: true });
      const opportunity = makeOpportunitySnapshot(current, transition);
      if (opportunity && !opportunities.some((x) => x.deduplication_key === key)) opportunities.push(opportunity);
      history.push(current);
    }
  }
  return { schema_version: CONTRACT_VERSION, states: STATES, performance_labels: PERFORMANCE_LABELS, derived_evidence: derived, state_transitions: transitions, opportunities: opportunities.map((o) => ({ ...o, state: 'INVESTIGATION_ELIGIBLE' })), no_recommendations_assertion: derived.every((r) => r.recommendation_or_edit_instruction === null), unchanged_watch_suppression: true };
}

function parseArgs(argv) { const out = {}; for (const a of argv) { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) out[m[1]] = m[2]; } return out; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.baselines || !args.out) { console.error('Usage: --baselines=Ticket009.json --out=Ticket010.json'); process.exitCode = 2; return; }
  const input = readJson(args.baselines);
  const rows = Array.isArray(input) ? input : (input.baselines || input.rows || []);
  const result = deriveEvidence(rows, { required_settled_windows: args.required_settled_windows ? Number(args.required_settled_windows) : 2 });
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(args.out.replace(/\.json$/, '.manifest.json'), JSON.stringify({ schema_version: CONTRACT_VERSION, derived_row_count: result.derived_evidence.length, transition_count: result.state_transitions.length, opportunity_count: result.opportunities.length, state_counts: result.derived_evidence.reduce((a, r) => { a[r.state] = (a[r.state] || 0) + 1; return a; }, {}), no_recommendations_assertion: result.no_recommendations_assertion, output_hash: hash(JSON.stringify(result.derived_evidence)) }, null, 2) + '\n');
  console.log(`Ticket 010 derived evidence: ${result.derived_evidence.length} rows written to ${args.out}`);
}

module.exports = { CONTRACT_VERSION, STATES, PERFORMANCE_LABELS, stableDeduplicationKey, signalFamily, measurementBlockReason, requiredEvidence, classifySignal, transitionForEvidence, cwvEvidence, makeOpportunitySnapshot, deriveEvidence };
if (require.main === module) main();
