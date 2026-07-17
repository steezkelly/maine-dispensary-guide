'use strict';
const assert = require('node:assert/strict');
const b = require('./ticket009-sufficiency-baselines.cjs');
let pass = 0;
function test(name, fn) { try { fn(); pass++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
console.log('Ticket 009 — sufficiency, peer policy, query-intent, posterior tests');

test('named operator intent is deterministic', () => assert.equal(b.classifyQueryIntent('Landrace Cannabis Casco hours'), 'named_operator'));
test('near-me intent is local discovery', () => assert.equal(b.classifyQueryIntent('dispensary near me'), 'local_store_discovery'));
test('licensing intent is regulatory', () => assert.equal(b.classifyQueryIntent('Maine cannabis license requirements'), 'licensing_regulatory'));
test('open-a-business intent is market entry', () => assert.equal(b.classifyQueryIntent('how to open a Maine dispensary'), 'market_entry'));
test('visitor intent is visitor local', () => assert.equal(b.classifyQueryIntent('visiting Portland where can I buy cannabis'), 'visitor_local'));
test('how-to intent is how_to', () => assert.equal(b.classifyQueryIntent('how to store cannabis'), 'how_to'));
test('data intent is data research', () => assert.equal(b.classifyQueryIntent('Maine cannabis sales statistics report'), 'data_research'));
test('unknown intent is explicit', () => assert.equal(b.classifyQueryIntent('pine tree topic'), 'unknown'));

test('query distributions are page-window scoped', () => {
  const rows = b.buildQueryIntentDistributions([
    { canonical_page_path: '/x', window_start: '2026-07-01', window_end: '2026-07-07', query: 'dispensary near me', impressions: 3 },
    { canonical_page_path: '/x', window_start: '2026-07-01', window_end: '2026-07-07', query: 'how to store cannabis', impressions: 1 },
    { canonical_page_path: '/y', window_start: '2026-07-01', window_end: '2026-07-07', query: 'Maine cannabis license', impressions: 4 },
  ]);
  assert.equal(rows.length, 2); assert.equal(rows[0].evidence_total, 4); assert.equal(rows[0].intent_distribution.local_store_discovery, 0.75);
});
test('query distributions are versioned and auditable', () => {
  const row = b.buildQueryIntentDistributions([{ canonical_page_path: '/x', date: '2026-07-01', query: 'x', impressions: 1 }])[0];
  assert.equal(row.schema_version, 'query-intent.v1'); assert.equal(row.classifier, 'deterministic-regex-v1');
});

test('policy registry is metric-specific', () => {
  assert.notDeepEqual(b.POLICIES.gsc_ctr.dimensions, b.POLICIES.progression_rate.dimensions);
  assert.ok(!('peer_group_id' in b.POLICIES.gsc_ctr));
});
test('gsc policy includes position and intent context', () => {
  assert.ok(b.POLICIES.gsc_ctr.dimensions.includes('position_band')); assert.ok(b.POLICIES.gsc_ctr.dimensions.includes('query_intent'));
});
test('progression policy includes progression family', () => assert.ok(b.POLICIES.progression_rate.dimensions.includes('progression_family')));
test('action policy includes action family and exposure semantics', () => {
  assert.ok(b.POLICIES.action_selection_rate.dimensions.includes('action_family')); assert.ok(b.POLICIES.action_selection_rate.dimensions.includes('exposure_semantics'));
});

test('beta quantile is centered for symmetric prior', () => {
  const q = b.betaQuantile(0.5, 10, 10); assert.ok(Math.abs(q - 0.5) < 0.01);
});
test('beta quantile is ordered', () => {
  const lo = b.betaQuantile(0.1, 4, 6); const hi = b.betaQuantile(0.9, 4, 6); assert.ok(lo < hi); assert.ok(lo > 0 && hi < 1);
});
test('regularized beta boundaries are exact', () => { assert.equal(b.regularizedBeta(0, 2, 3), 0); assert.equal(b.regularizedBeta(1, 2, 3), 1); });
test('prior is estimated from peer aggregate', () => {
  const p = b.estimatePrior([{ numerator: 8, denominator: 10 }, { numerator: 2, denominator: 10 }], 20);
  assert.equal(p.peer_numerator, 10); assert.equal(p.peer_denominator, 20); assert.equal(p.mean, 0.5);
});

test('exact peer cell is selected when minimum count is met', () => {
  const target = { metric_family: 'gsc_ctr', query_intent: 'how_to', branded_status: 'nonbranded', position_band: '1-3', device: 'mobile', serp_promise_family: 'generic' };
  const peers = [1, 2, 3].map((n) => ({ ...target, canonical_page_path: `/peer-${n}`, numerator: n, denominator: 10 }));
  const out = b.selectPeers(target, [target, ...peers], b.POLICIES.gsc_ctr, 3);
  assert.equal(out.level, 0); assert.equal(out.peers.length, 3); assert.match(out.cell_id, /^gsc_ctr:0:/);
});
test('sparse exact cell falls back explicitly', () => {
  const target = { metric_family: 'gsc_ctr', query_intent: 'how_to', branded_status: 'branded', position_band: '1-3', device: 'mobile', serp_promise_family: 'generic' };
  const peers = [
    { ...target, canonical_page_path: '/peer-1', branded_status: 'nonbranded', numerator: 1, denominator: 10 },
    { ...target, canonical_page_path: '/peer-2', branded_status: 'nonbranded', numerator: 2, denominator: 10 },
    { ...target, canonical_page_path: '/peer-3', branded_status: 'nonbranded', numerator: 3, denominator: 10 },
  ];
  const out = b.selectPeers(target, [target, ...peers], b.POLICIES.gsc_ctr, 3);
  assert.equal(out.level, 1); assert.equal(out.dimensions.includes('branded_status'), false);
});
test('peer selection excludes every observation for the target page', () => {
  const target = { canonical_page_path: '/target', metric_family: 'gsc_ctr', query_intent: 'how_to', branded_status: 'nonbranded', position_band: '1-3', device: 'mobile', serp_promise_family: 'generic', numerator: 1, denominator: 10 };
  const priorWindow = { ...target, numerator: 9, denominator: 10, window_start: '2026-06-01' };
  const peer = { ...target, canonical_page_path: '/peer', numerator: 2, denominator: 10 };
  const out = b.selectPeers(target, [target, priorWindow, peer], b.POLICIES.gsc_ctr, 1);
  assert.deepEqual(out.peers.map((row) => row.canonical_page_path), ['/peer']);
});
test('peer selection excludes canonical-path variants of the target across windows', () => {
  const target = { canonical_page_path: '/target', metric_family: 'gsc_ctr', query_intent: 'how_to', branded_status: 'nonbranded', position_band: '1-3', device: 'mobile', serp_promise_family: 'generic', numerator: 1, denominator: 10 };
  const priorWindow = { ...target, canonical_page_path: 'https://mainedispensaryguide.com/target/?utm=prior', numerator: 9, denominator: 10, window_start: '2026-06-01' };
  const peer = { ...target, canonical_page_path: '/peer', numerator: 2, denominator: 10 };
  const out = b.selectPeers(target, [target, priorWindow, peer], b.POLICIES.gsc_ctr, 1);
  assert.deepEqual(out.peers.map((row) => row.canonical_page_path), ['/peer']);
});
test('site fallback is explicit when no peers exist', () => {
  const target = { metric_family: 'progression_rate', numerator: 1, denominator: 10 };
  const out = b.selectPeers(target, [target], b.POLICIES.progression_rate, 3);
  assert.equal(out.level, 'site_fallback'); assert.equal(out.dimensions.length, 0);
});

test('posterior contains required evidence fields', () => {
  const target = { numerator: 1, denominator: 2, raw_rate: 0.5, policy: b.POLICIES.gsc_ctr };
  const p = b.posteriorFor(target, [{ numerator: 20, denominator: 100 }, { numerator: 30, denominator: 100 }]);
  for (const key of ['raw_rate', 'peer_prior_alpha', 'peer_prior_beta', 'posterior_alpha', 'posterior_beta', 'posterior_mean', 'posterior_interval_80_low', 'posterior_interval_95_high', 'probability_above_practical_delta', 'sample_state']) assert.ok(key in p, key);
});
test('posterior shrinks sparse page toward peer prior', () => {
  const target = { numerator: 1, denominator: 2, raw_rate: 0.5, policy: b.POLICIES.gsc_ctr };
  const p = b.posteriorFor(target, [{ numerator: 20, denominator: 100 }, { numerator: 20, denominator: 100 }], { prior_strength: 20 });
  assert.ok(Math.abs(p.posterior_mean - 0.2) < Math.abs(p.raw_rate - 0.2));
});
test('posterior intervals are ordered', () => {
  const p = b.posteriorFor({ numerator: 40, denominator: 100, raw_rate: 0.4, policy: b.POLICIES.gsc_ctr }, [{ numerator: 40, denominator: 100 }]);
  assert.ok(p.posterior_interval_95_low < p.posterior_interval_80_low); assert.ok(p.posterior_interval_80_high < p.posterior_interval_95_high);
});
test('zero denominator is insufficient', () => {
  const p = b.posteriorFor({ numerator: null, denominator: 0, raw_rate: null, policy: b.POLICIES.gsc_ctr }, []);
  assert.equal(p.sample_state, 'insufficient');
});

test('unresolved task is measurement blocked', () => {
  const out = b.buildBaselines({ observations: [{ canonical_page_path: '/x', metric_family: 'progression_rate', numerator: 2, denominator: 10, task_contract_status: 'UNRESOLVED' }], manifest: [] });
  assert.equal(out.baselines[0].measurement_status, 'MEASUREMENT_BLOCKED: TASK_CONTRACT_UNRESOLVED'); assert.equal(out.baselines[0].peer_fallback_level, 'blocked');
});
test('build output keeps raw leaderboard ineligible', () => {
  const out = b.buildBaselines({ observations: [
    { canonical_page_path: '/a', metric_family: 'gsc_ctr', numerator: 1, denominator: 2, query_intent: 'how_to', position_band: '1-3' },
    { canonical_page_path: '/b', metric_family: 'gsc_ctr', numerator: 50, denominator: 100, query_intent: 'how_to', position_band: '1-3' },
  ], manifest: [] });
  assert.equal(out.baselines[0].raw_rate_leaderboard_eligible, false); assert.equal(out.schema_version, 'ticket-009.v1');
});
test('build output has metric-specific fallback metadata', () => {
  const out = b.buildBaselines({ observations: [{ canonical_page_path: '/x', metric_family: 'action_selection_rate', numerator: 2, denominator: 10, action_family: 'map', primary_task_family: 'local_store_discovery' }], manifest: [] });
  assert.ok('peer_policy_version' in out.baselines[0]); assert.ok('peer_dimensions' in out.baselines[0]);
});
test('manifest context is used but not itself treated as a peer ID', () => {
  const out = b.buildBaselines({ observations: [{ canonical_page_path: '/x', metric_family: 'active_attention_rate', numerator: 5, denominator: 10 }], manifest: [{ canonical_path: '/x', reporting_archetype: 'calculator', primary_task_family: 'calculator_decision_tool' }] });
  assert.equal(out.baselines[0].reporting_archetype, 'calculator'); assert.equal(out.baselines[0].peer_cell_id.includes('calculator'), false);
});
test('query intent distribution feeds observation context', () => {
  const out = b.buildBaselines({ observations: [{ canonical_page_path: '/x', date: '2026-07-01', metric_family: 'gsc_ctr', numerator: 1, denominator: 10 }], queries: [{ canonical_page_path: '/x', date: '2026-07-01', query: 'dispensary near me', impressions: 10 }], manifest: [] });
  assert.equal(out.baselines[0].query_intent, 'local_store_discovery');
});
test('all output rows have provenance', () => {
  const out = b.buildBaselines({ observations: [{ canonical_page_path: '/x', metric_family: 'gsc_ctr', numerator: 1, denominator: 10 }], manifest: [] });
  assert.equal(out.baselines[0].provenance.contract_version, 'ticket-009.v1');
});
test('no universal policy object exists', () => assert.equal(b.POLICIES.universal, undefined));

test('posterior practical probabilities are bounded', () => {
  const p = b.posteriorFor({ numerator: 20, denominator: 100, raw_rate: 0.2, policy: b.POLICIES.gsc_ctr }, [{ numerator: 20, denominator: 100 }]);
  assert.ok(p.probability_above_practical_delta >= 0 && p.probability_above_practical_delta <= 1); assert.ok(p.probability_below_practical_delta >= 0 && p.probability_below_practical_delta <= 1);
});
test('query intent set is stable', () => assert.deepEqual(b.QUERY_INTENTS, ['named_operator','local_store_discovery','visitor_local','market_entry','licensing_regulatory','how_to','data_research','unknown']));
test('policy version is explicit', () => assert.equal(b.POLICY_VERSION, 'metric-peer-policy.v1'));

console.log(`Tests: ${pass}/37 passed.`);
if (process.exitCode) process.exit(1);
