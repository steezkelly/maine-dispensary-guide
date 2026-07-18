'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const s = require('./ticket010-derived-evidence-state-machine.cjs');
const ticket011 = require('./ticket011-opportunity-engine.cjs');
let pass = 0;
function test(name, fn) { try { fn(); pass++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
function row(overrides = {}) { return { page_id: 'page-x', canonical_page_path: '/x', primary_task_family: 'how_to_task', metric_family: 'gsc_ctr', signal_family: 'acquisition_discovery', window_start: '2026-07-01', window_end: '2026-07-01', detected_at: '2026-07-17T20:00:00.000Z', settlement_state: 'settled', measurement_status: 'MEASURED', window_comparable: true, change_context_evaluated: true, task_contract_status: 'CONFIRMED', sample_state: 'directional', probability_above_practical_delta: 0.9, probability_below_practical_delta: 0.05, peer_policy_version: 'metric-peer-policy.v1', peer_cell_id: 'gsc_ctr:0:how_to', peer_fallback_level: 0, peer_count: 4, posterior_mean: 0.1, posterior_interval_80_low: 0.05, posterior_interval_80_high: 0.15, posterior_interval_95_low: 0.02, posterior_interval_95_high: 0.2, practical_delta: 0.02, ...overrides }; }
function eligibleRows() { return [row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-08', window_end: '2026-07-08' }), row({ window_start: '2026-07-15', window_end: '2026-07-15', independent_source_corroborated: true })]; }

test('required states exist', () => { for (const x of ['NORMAL','WATCH','PERSISTENT_SHIFT_CANDIDATE','INVESTIGATION_ELIGIBLE','MEASUREMENT_BLOCKED']) assert.ok(s.STATES.includes(x)); });
test('stable dedup key is deterministic', () => assert.equal(s.stableDeduplicationKey(row()), s.stableDeduplicationKey(row())));
test('different metric changes dedup key', () => assert.notEqual(s.stableDeduplicationKey(row()), s.stableDeduplicationKey(row({ metric_family: 'progression_rate' }))));
test('different peer cells change the persistence identity', () => assert.notEqual(s.stableDeduplicationKey(row()), s.stableDeduplicationKey(row({ peer_cell_id: 'gsc_ctr:1:how_to' }))));
test('signal families are metric-specific', () => { assert.equal(s.signalFamily(row({ metric_family: 'gsc_ctr' })), 'acquisition_discovery'); assert.equal(s.signalFamily(row({ metric_family: 'progression_rate' })), 'progression'); });
test('healthy settled comparable row passes evidence checks', () => { const e = s.requiredEvidence(row()); assert.equal(e.source_contract_healthy, true); assert.equal(e.source_window_settled, true); assert.equal(e.source_window_comparable, true); assert.equal(e.measurement_block_reason, null); });
test('unsettled row is blocked', () => assert.equal(s.measurementBlockReason(row({ settlement_state: 'fresh' })), 'WINDOW_UNSETTLED'));
test('incomparable row is blocked', () => assert.equal(s.measurementBlockReason(row({ window_comparable: false })), 'WINDOW_NOT_COMPARABLE'));
test('unhealthy row is blocked', () => assert.equal(s.measurementBlockReason(row({ measurement_status: 'SOURCE_UNAVAILABLE' })), 'SOURCE_UNAVAILABLE'));
test('change-contaminated row is blocked', () => assert.equal(s.measurementBlockReason(row({ change_contamination_status: 'CONTAMINATED' })), 'CHANGE_CONTAMINATED'));
test('unresolved task is blocked', () => assert.equal(s.measurementBlockReason(row({ task_contract_status: 'UNRESOLVED' })), 'TASK_CONTRACT_UNRESOLVED'));
test('measurement blocked state has no performance label', () => { const out = s.deriveEvidence([row({ measurement_status: 'SOURCE_UNAVAILABLE' })]); assert.equal(out.derived_evidence[0].state, 'MEASUREMENT_BLOCKED'); assert.equal(out.derived_evidence[0].cwv_evidence, null); });
test('no practical posterior shift becomes NORMAL', () => { const out = s.deriveEvidence([row({ probability_above_practical_delta: 0.2, probability_below_practical_delta: 0.1 })]); assert.equal(out.derived_evidence[0].state, 'NORMAL'); });
test('first practical shift becomes WATCH', () => { const out = s.deriveEvidence([row()]); assert.equal(out.derived_evidence[0].state, 'WATCH'); });
test('two settled practical windows become persistent candidate', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-08', window_end: '2026-07-08' })]); assert.equal(out.derived_evidence[1].state, 'PERSISTENT_SHIFT_CANDIDATE'); });
test('successive shifts from different peer cells cannot manufacture persistence', () => {
  const out = s.deriveEvidence([
    row({ window_end: '2026-07-01', peer_cell_id: 'gsc_ctr:device:desktop' }),
    row({ window_start: '2026-07-08', window_end: '2026-07-08', peer_cell_id: 'gsc_ctr:device:mobile' }),
    row({ window_start: '2026-07-15', window_end: '2026-07-15', peer_cell_id: 'gsc_ctr:fallback:task' }),
  ]);
  assert.ok(out.derived_evidence.every((evidence) => evidence.state === 'WATCH'));
  assert.equal(out.opportunities.length, 0);
});
test('a settled normal window resets directional persistence', () => {
  const out = s.deriveEvidence([
    row({ window_end: '2026-07-01' }),
    row({ window_start: '2026-07-08', window_end: '2026-07-08', probability_above_practical_delta: 0.2, probability_below_practical_delta: 0.1 }),
    row({ window_start: '2026-07-15', window_end: '2026-07-15' }),
  ]);
  assert.equal(out.derived_evidence[2].state, 'WATCH');
});
test('an unsettled window resets directional persistence', () => {
  const out = s.deriveEvidence([
    row({ window_end: '2026-07-01' }),
    row({ window_start: '2026-07-08', window_end: '2026-07-08', settlement_state: 'fresh' }),
    row({ window_start: '2026-07-15', window_end: '2026-07-15' }),
  ]);
  assert.equal(out.derived_evidence[2].state, 'WATCH');
  assert.equal(out.derived_evidence[2].persistence.settled_signal_windows, 1);
});
test('duplicate evidence for one settled window cannot manufacture persistence', () => {
  const duplicate = row({ window_start: '2026-07-01', window_end: '2026-07-07' });
  const out = s.deriveEvidence([duplicate, { ...duplicate }, { ...duplicate }]);
  assert.ok(out.derived_evidence.every((evidence) => evidence.state !== 'PERSISTENT_SHIFT_CANDIDATE' && evidence.state !== 'INVESTIGATION_ELIGIBLE'));
  assert.equal(out.opportunities.length, 0);
});
test('overlapping settled windows cannot manufacture persistence', () => {
  const out = s.deriveEvidence([
    row({ window_start: '2026-07-01', window_end: '2026-07-28' }),
    row({ window_start: '2026-07-08', window_end: '2026-08-04' }),
    row({ window_start: '2026-07-15', window_end: '2026-08-11' }),
  ]);
  assert.ok(out.derived_evidence.every((evidence) => evidence.state !== 'PERSISTENT_SHIFT_CANDIDATE' && evidence.state !== 'INVESTIGATION_ELIGIBLE'));
});
test('gaps between settled windows reset directional persistence', () => {
  const out = s.deriveEvidence([
    row({ window_start: '2026-07-01', window_end: '2026-07-01' }),
    row({ window_start: '2026-09-01', window_end: '2026-09-01' }),
    row({ window_start: '2026-11-01', window_end: '2026-11-01' }),
  ]);
  assert.ok(out.derived_evidence.every((evidence) => evidence.state === 'WATCH'));
  assert.ok(out.derived_evidence.every((evidence) => evidence.persistence.settled_signal_windows === 1));
  assert.equal(out.opportunities.length, 0);
});
test('configured daily cadence permits consecutive daily persistence', () => {
  const out = s.deriveEvidence([
    row({ window_start: '2026-07-01', window_end: '2026-07-01' }),
    row({ window_start: '2026-07-02', window_end: '2026-07-02' }),
    row({ window_start: '2026-07-03', window_end: '2026-07-03' }),
  ], { window_cadence_days: 1 });
  assert.equal(out.derived_evidence[2].state, 'INVESTIGATION_ELIGIBLE');
});
test('CLI preserves row-level daily cadence when no override is supplied', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket010-daily-cadence-'));
  try {
    const input = path.join(dir, 'baselines.json');
    const output = path.join(dir, 'evidence.json');
    fs.writeFileSync(input, JSON.stringify({ baselines: [
      row({ window_start: '2026-07-01', window_end: '2026-07-01', window_cadence_days: 1 }),
      row({ window_start: '2026-07-02', window_end: '2026-07-02', window_cadence_days: 1 }),
      row({ window_start: '2026-07-03', window_end: '2026-07-03', window_cadence_days: 1 }),
    ] }));
    const script = path.join(__dirname, 'ticket010-derived-evidence-state-machine.cjs');
    const result = spawnSync(process.execPath, [script, `--baselines=${input}`, `--out=${output}`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).derived_evidence.at(-1).state, 'INVESTIGATION_ELIGIBLE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('two settled windows with change context become investigation eligible', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-08', window_end: '2026-07-08' }), row({ window_start: '2026-07-15', window_end: '2026-07-15' })]); assert.equal(out.derived_evidence[2].state, 'INVESTIGATION_ELIGIBLE'); });
test('custom persistence threshold is honored', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-08', window_end: '2026-07-08' })], { required_settled_windows: 3 }); assert.equal(out.derived_evidence[1].state, 'WATCH'); });
test('corroboration can promote a single settled window', () => { const out = s.deriveEvidence([row({ independent_source_corroborated: true })]); assert.equal(out.derived_evidence[0].state, 'PERSISTENT_SHIFT_CANDIDATE'); });
test('unchanged WATCH does not emit duplicate operator item', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-02', window_end: '2026-07-02', independent_source_corroborated: false })], { required_settled_windows: 3 }); assert.equal(out.derived_evidence[0].state, 'WATCH'); assert.equal(out.derived_evidence[1].state, 'WATCH'); assert.equal(out.derived_evidence[1].operator_item_emitted, false); });
test('state transition ledger records only emitted items', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-02', window_end: '2026-07-02' })], { required_settled_windows: 3 }); assert.equal(out.state_transitions.length, 1); });
test('opportunity snapshot is not a recommendation', () => { const out = s.deriveEvidence(eligibleRows()); assert.equal(out.opportunities.length, 1); assert.equal(out.opportunities[0].recommendation_or_edit_instruction, null); assert.equal(out.opportunities[0].causal_language_allowed, false); });
test('opportunity emission requires an explicit detected_at timestamp', () => {
  assert.throws(() => s.deriveEvidence(eligibleRows().map((entry) => ({ ...entry, detected_at: null }))), /detected_at/);
});
test('Ticket 010 durable output is byte-stable for the same explicit timestamp', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket010-determinism-'));
  try {
    const input = path.join(dir, 'baselines.json');
    const first = path.join(dir, 'first.json');
    const second = path.join(dir, 'second.json');
    fs.writeFileSync(input, JSON.stringify({ baselines: eligibleRows().map(({ detected_at, ...entry }) => entry) }));
    const script = path.join(__dirname, 'ticket010-derived-evidence-state-machine.cjs');
    const common = [`--baselines=${input}`, '--detected_at=2026-07-17T20:00:00.000Z'];
    const a = spawnSync(process.execPath, [script, ...common, `--out=${first}`], { encoding: 'utf8' });
    const b = spawnSync(process.execPath, [script, ...common, `--out=${second}`], { encoding: 'utf8' });
    assert.equal(a.status, 0, a.stderr);
    assert.equal(b.status, 0, b.stderr);
    assert.equal(fs.readFileSync(first, 'utf8'), fs.readFileSync(second, 'utf8'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('stable opportunity deduplication key is emitted', () => { const out = s.deriveEvidence(eligibleRows()); assert.match(out.opportunities[0].deduplication_key, /^oppkey_[0-9a-f]+$/); });
test('opportunity ID remains stable across refreshes', () => { const a = s.deriveEvidence(eligibleRows()).opportunities[0]; const b = s.deriveEvidence(eligibleRows().map((r, i) => i === 2 ? { ...r, posterior_mean: 0.2 } : r)).opportunities[0]; assert.equal(a.opportunity_id, b.opportunity_id); });
test('release provenance survives Ticket 010 into Ticket 011 immutable packets', () => {
  const evidence = s.deriveEvidence(eligibleRows().map((entry) => ({ ...entry, canonical_release_id: 'rel_chain', acquisition_release_id: 'run_chain' })));
  const packet = ticket011.buildOpportunityEngine(evidence.opportunities).cases[0];
  assert.deepEqual(packet.immutable_detection_snapshot.source_release_ids, { canonical_release_id: 'rel_chain', acquisition_release_id: 'run_chain' });
});
test('opportunity evidence grade is E1', () => { const out = s.deriveEvidence(eligibleRows()); assert.equal(out.opportunities[0].evidence_grade, 'E1'); });
test('opportunity requires hypothesis set but does not execute it', () => { const out = s.deriveEvidence(eligibleRows()); assert.equal(out.opportunities[0].hypothesis_set_required, true); assert.equal(out.opportunities[0].proposal_ids.length, 0); });
test('Core Web Vitals preserve field percentile semantics', () => { const out = s.deriveEvidence([row({ metric_family: 'core_web_vitals_lcp', field_percentile: 0.75, source: 'CrUX', independent_source_corroborated: true })]); assert.equal(out.derived_evidence[0].cwv_evidence.semantic_type, 'field_percentile'); assert.equal(out.derived_evidence[0].cwv_evidence.percentile, 0.75); });
test('blocked Core Web Vitals cannot receive performance labels', () => { const out = s.deriveEvidence([row({ metric_family: 'core_web_vitals_lcp', field_percentile: 0.75, measurement_status: 'MEASUREMENT_BLOCKED' })]); assert.equal(out.derived_evidence[0].state, 'MEASUREMENT_BLOCKED'); assert.equal(out.derived_evidence[0].cwv_evidence.performance_label_blocked, true); });
test('change context is required for eligibility', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-08', window_end: '2026-07-08', change_context_evaluated: false })]); assert.equal(out.derived_evidence[1].state, 'MEASUREMENT_BLOCKED'); });
test('fresh rows cannot create investigation eligibility', () => { const out = s.deriveEvidence([row({ settlement_state: 'fresh', independent_source_corroborated: true })]); assert.equal(out.derived_evidence[0].state, 'MEASUREMENT_BLOCKED'); });
test('measurement blocked does not create opportunity', () => { const out = s.deriveEvidence([row({ measurement_status: 'SOURCE_UNAVAILABLE', independent_source_corroborated: true })]); assert.equal(out.opportunities.length, 0); });
test('no recommendations assertion is true', () => { const out = s.deriveEvidence([row(), row({ measurement_status: 'SOURCE_UNAVAILABLE' })]); assert.equal(out.no_recommendations_assertion, true); });
test('state version increments per evidence row', () => { const out = s.deriveEvidence([row({ window_end: '2026-07-01' }), row({ window_start: '2026-07-02', window_end: '2026-07-02' })], { required_settled_windows: 3 }); assert.equal(out.derived_evidence[1].state_version, 2); });
test('multiple pages get separate cases', () => { const out = s.deriveEvidence([row({ canonical_page_path: '/a' }), row({ canonical_page_path: '/b' })]); assert.equal(out.derived_evidence.length, 2); assert.notEqual(out.derived_evidence[0].deduplication_key, out.derived_evidence[1].deduplication_key); });
test('performance labels list is descriptive only', () => assert.ok(s.PERFORMANCE_LABELS.includes('SERP_PACKAGING_OPPORTUNITY')));
test('contract version is explicit', () => assert.equal(s.CONTRACT_VERSION, 'ticket-010.v1'));

test('omitted or UNKNOWN task context blocks eligibility', () => { const inputs = [row({ window_end: '2026-07-01', task_contract_status: 'UNKNOWN' }), row({ window_start: '2026-07-08', window_end: '2026-07-08', task_contract_status: 'UNKNOWN' }), row({ window_start: '2026-07-15', window_end: '2026-07-15', task_contract_status: 'UNKNOWN' })]; assert.equal(s.deriveEvidence(inputs).derived_evidence.at(-1).state, 'MEASUREMENT_BLOCKED'); });
test('omitted change evaluation blocks eligibility', () => { const inputs = [row({ window_end: '2026-07-01', change_context_evaluated: undefined }), row({ window_start: '2026-07-08', window_end: '2026-07-08', change_context_evaluated: undefined }), row({ window_start: '2026-07-15', window_end: '2026-07-15', change_context_evaluated: undefined })]; assert.equal(s.deriveEvidence(inputs).derived_evidence.at(-1).state, 'MEASUREMENT_BLOCKED'); });

console.log(`Tests: ${pass}/48 passed.`);
if (process.exitCode) process.exit(1);
