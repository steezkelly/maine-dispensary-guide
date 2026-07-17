'use strict';
/**
 * MDG-ANALYTICS-001 Ticket 009 — metric-specific peer context and posterior baselines.
 *
 * Read-only, deterministic, offline. Consumes supplied page-window observations,
 * query rows, and page manifest evidence. No network calls, no production writes,
 * no page edits, and no universal peer_group_id.
 */
const fs = require('node:fs');
const path = require('node:path');

const CONTRACT_VERSION = 'ticket-009.v1';
const QUERY_INTENT_VERSION = 'query-intent.v1';
const POLICY_VERSION = 'metric-peer-policy.v1';

const QUERY_INTENTS = Object.freeze([
  'named_operator', 'local_store_discovery', 'visitor_local', 'market_entry',
  'licensing_regulatory', 'how_to', 'data_research', 'unknown'
]);

const POLICIES = Object.freeze({
  gsc_ctr: {
    metric_family: 'gsc_ctr', numerator: 'clicks', denominator: 'impressions',
    dimensions: ['query_intent', 'branded_status', 'position_band', 'device', 'serp_promise_family'],
    fallback: [
      ['query_intent', 'branded_status', 'position_band', 'device'],
      ['query_intent', 'position_band', 'device'],
      ['query_intent', 'position_band'],
      ['serp_promise_family', 'position_band'],
      ['position_band']
    ],
    practical_delta: 0.02,
    required_task_compatibility: false,
  },
  active_attention_rate: {
    metric_family: 'active_attention_rate', numerator: 'active_attention', denominator: 'eligible_sessions',
    dimensions: ['primary_task_family', 'content_depth_band', 'device', 'interaction_structure'],
    fallback: [
      ['primary_task_family', 'content_depth_band', 'device'],
      ['primary_task_family', 'content_depth_band'],
      ['primary_task_family'],
      []
    ],
    practical_delta: 0.03,
    required_task_compatibility: true,
  },
  action_selection_rate: {
    metric_family: 'action_selection_rate', numerator: 'selections', denominator: 'eligible_exposures',
    dimensions: ['action_family', 'exposure_semantics', 'placement_role', 'primary_task_family'],
    fallback: [
      ['action_family', 'exposure_semantics', 'placement_role'],
      ['action_family', 'primary_task_family'],
      ['action_family'],
      []
    ],
    practical_delta: 0.03,
    required_task_compatibility: true,
  },
  progression_rate: {
    metric_family: 'progression_rate', numerator: 'progressions', denominator: 'eligible_sessions',
    dimensions: ['primary_task_family', 'progression_family', 'task_contract_status'],
    fallback: [
      ['primary_task_family', 'progression_family'],
      ['primary_task_family'],
      ['progression_family'],
      []
    ],
    practical_delta: 0.03,
    required_task_compatibility: true,
  },
});

function clean(value) { return value == null || value === '' ? null : String(value); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function stableKey(values) { return values.map((v) => clean(v) ?? '(null)').join('|'); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function classifyQueryIntent(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return 'unknown';
  if (/\b(landrace|the joint|above all greenery|great atlantic puffin|hidden greens|eclipse|founding farmers)\b/.test(q)) return 'named_operator';
  if (/\b(near me|nearby|closest|nearest)\b/.test(q)) return 'local_store_discovery';
  if (/\b(license|licensing|zoning|regulation|regulatory|rule|permit|compliance|law)\b/.test(q)) return 'licensing_regulatory';
  if (/\b(open|opening|start|starting|launch|business plan|roi|investment|operate|operating)\b/.test(q)) return 'market_entry';
  if (/\b(visitor|visiting|vacation|tourist|recreational)\b/.test(q)) return 'visitor_local';
  if (/\b(dispensary|store|shop|weed|cannabis)\b/.test(q) && /\b(in|near|[a-z]+ maine)\b/.test(q)) return 'local_store_discovery';
  if (/\b(how|guide|ways|steps|what is|best way)\b/.test(q)) return 'how_to';
  if (/\b(data|statistics|stats|report|sales|market size|research|source)\b/.test(q)) return 'data_research';
  return 'unknown';
}

function queryWindowKey(row) {
  const page = clean(row.canonical_page_path || row.canonical_path || row.page_path || row.path) || '(unknown-page)';
  const start = clean(row.window_start || row.start_date || row.date) || '(unknown-start)';
  const end = clean(row.window_end || row.end_date || row.date) || start;
  return `${page}|${start}|${end}`;
}

function buildQueryIntentDistributions(queryRows, options = {}) {
  const grouped = new Map();
  for (const row of queryRows || []) {
    const key = queryWindowKey(row);
    if (!grouped.has(key)) grouped.set(key, { key, page: row.canonical_page_path || row.canonical_path || row.page_path || row.path || null, window_start: row.window_start || row.start_date || row.date || null, window_end: row.window_end || row.end_date || row.date || null, counts: {}, total: 0 });
    const group = grouped.get(key);
    const intent = row.query_intent || classifyQueryIntent(row.query || row.query_text || row.search_query);
    const weight = Math.max(0, num(row.impressions ?? row.exposures ?? row.weight ?? 1) || 0);
    group.counts[intent] = (group.counts[intent] || 0) + weight;
    group.total += weight;
  }
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map((group) => ({
    schema_version: QUERY_INTENT_VERSION,
    canonical_page_path: group.page,
    window_start: group.window_start,
    window_end: group.window_end,
    intent_distribution: Object.fromEntries(QUERY_INTENTS.map((i) => [i, group.total ? (group.counts[i] || 0) / group.total : 0])),
    evidence_counts: Object.fromEntries(QUERY_INTENTS.map((i) => [i, group.counts[i] || 0])),
    evidence_total: group.total,
    classifier: 'deterministic-regex-v1',
  }));
}

function getPolicy(metric) {
  return POLICIES[metric] || null;
}

function normalizeObservation(row, queryDistributions, manifestByPath) {
  const page = clean(row.canonical_page_path || row.canonical_path || row.page_path || row.path);
  const manifest = manifestByPath.get(page) || {};
  const metric = clean(row.metric_family || row.metric || row.metric_name);
  const policy = getPolicy(metric);
  const numerator = num(row.numerator ?? (policy ? row[policy.numerator] : null) ?? row.successes);
  const denominator = num(row.denominator ?? (policy ? row[policy.denominator] : null) ?? row.exposures);
  const rowStart = row.window_start || row.start_date || row.date;
  const rowEnd = row.window_end || row.end_date || row.date || rowStart;
  const q = queryDistributions.find((x) => x.canonical_page_path === page && x.window_start === rowStart && x.window_end === rowEnd);
  const queryIntent = row.query_intent || (q ? dominantIntent(q.intent_distribution) : null);
  const context = {
    ...manifest,
    ...row,
    canonical_page_path: page,
    query_intent: queryIntent || 'unknown',
    branded_status: row.branded_status || 'unknown',
    position_band: row.position_band || 'unknown',
    device: row.device || 'all',
    interaction_structure: row.interaction_structure || row.template_family || 'unknown',
    progression_family: row.progression_family || 'unknown',
  };
  return { ...context, metric_family: metric, numerator, denominator, raw_rate: denominator > 0 && numerator != null ? numerator / denominator : null, policy };
}

function dominantIntent(dist) {
  if (!dist) return 'unknown';
  return Object.entries(dist).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'unknown';
}

function peerCellId(metric, level, values) { return `${metric}:${level}:${stableKey(values)}`; }

function isEligiblePeer(row, requireChangeContext = false) {
  const settlement = String(row.settlement_state || row.window_status || '').toLowerCase();
  const measurement = String(row.measurement_status || row.measurement_health || '').toUpperCase();
  const change = String(row.change_contamination_status || row.change_status || '').toUpperCase();
  const task = String(row.task_contract_status || '').toUpperCase();
  if (settlement && settlement !== 'settled') return false;
  if (measurement.startsWith('MEASUREMENT_BLOCKED') || ['SOURCE_UNAVAILABLE', 'WINDOW_NOT_COMPARABLE', 'WINDOW_MEASUREMENT_DEGRADED'].includes(measurement)) return false;
  if (row.window_comparable === false) return false;
  if (requireChangeContext && row.change_context_evaluated !== true) return false;
  if (change === 'CONTAMINATED' || change === 'CHANGE_CONTAMINATED') return false;
  if (!['CONFIRMED', 'RESOLVED'].includes(task)) return false;
  return true;
}

function matchesTargetWindow(target, peer) {
  const targetStart = clean(target.window_start || target.start_date || target.date);
  const targetEnd = clean(target.window_end || target.end_date || target.date);
  const peerStart = clean(peer.window_start || peer.start_date || peer.date);
  const peerEnd = clean(peer.window_end || peer.end_date || peer.date);
  if (!targetStart && !targetEnd && !peerStart && !peerEnd) return true;
  return targetStart === peerStart && targetEnd === peerEnd;
}

function peerEvidenceIdentity(peer) {
  return [
    clean(peer.canonical_page_path) || '(unknown-page)',
    clean(peer.window_start || peer.start_date || peer.date) || '(unknown-start)',
    clean(peer.window_end || peer.end_date || peer.date || peer.window_start || peer.start_date) || '(unknown-end)',
  ].join('|');
}

function uniquePeerEvidence(peers) {
  const counts = new Map();
  for (const peer of peers) {
    const key = peerEvidenceIdentity(peer);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return peers.filter((peer) => counts.get(peerEvidenceIdentity(peer)) === 1);
}

function selectPeers(target, observations, policy, minPeerCount) {
  const peers = uniquePeerEvidence(observations.filter((row) => row !== target && clean(row.canonical_page_path) !== clean(target.canonical_page_path) && row.metric_family === target.metric_family && row.denominator > 0 && row.numerator != null && isEligiblePeer(row, target.change_context_evaluated === true) && matchesTargetWindow(target, row) && (!policy.required_task_compatibility || clean(row.primary_task_family) === clean(target.primary_task_family))));
  for (let level = 0; level < policy.fallback.length; level++) {
    const dims = policy.fallback[level];
    const candidate = peers.filter((peer) => dims.every((d) => clean(peer[d]) === clean(target[d])));
    if (candidate.length >= minPeerCount) return { peers: candidate, level, dimensions: dims, cell_id: peerCellId(policy.metric_family, level, dims.map((d) => target[d])) };
  }
  return { peers: [], level: 'insufficient', dimensions: [], cell_id: peerCellId(policy.metric_family, 'insufficient', []) };
}

function logGamma(z) {
  const coefficients = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = 0.99999999999980993;
  z -= 1;
  for (let i = 0; i < coefficients.length; i++) x += coefficients[i] / (z + i + 1);
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a, b, x) {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const fpmin = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d; let h = d;
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d; const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betaContinuedFraction(a, b, x) / a;
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

function betaQuantile(probability, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedBeta(mid, a, b) < probability) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function estimatePrior(peers, strength = 20) {
  const totalN = peers.reduce((sum, p) => sum + p.denominator, 0);
  const totalK = peers.reduce((sum, p) => sum + p.numerator, 0);
  const mean = totalN > 0 ? clamp(totalK / totalN, 0.001, 0.999) : 0.5;
  const priorStrength = Math.max(2, Math.min(100, strength));
  return { alpha: mean * priorStrength, beta: (1 - mean) * priorStrength, peer_numerator: totalK, peer_denominator: totalN, mean };
}

function posteriorFor(target, peers, config = {}) {
  const prior = estimatePrior(peers, config.prior_strength || 20);
  const alpha = prior.alpha + Math.max(0, target.numerator || 0);
  const beta = prior.beta + Math.max(0, (target.denominator || 0) - (target.numerator || 0));
  const rawRate = target.raw_rate;
  const mean = alpha / (alpha + beta);
  const interval80 = [betaQuantile(0.10, alpha, beta), betaQuantile(0.90, alpha, beta)];
  const interval95 = [betaQuantile(0.025, alpha, beta), betaQuantile(0.975, alpha, beta)];
  const practicalDelta = config.practical_delta ?? target.policy.practical_delta;
  const peerRate = prior.mean;
  const pAbove = 1 - regularizedBeta(clamp(peerRate + practicalDelta, 0, 1), alpha, beta);
  const pBelow = regularizedBeta(clamp(peerRate - practicalDelta, 0, 1), alpha, beta);
  const width80 = interval80[1] - interval80[0];
  let sampleState = 'insufficient';
  let reason = 'posterior remains too broad or denominator is absent';
  if (target.denominator > 0 && width80 <= (config.directional_width || 0.25)) {
    sampleState = 'directional'; reason = 'posterior has informative movement but remains broad';
  }
  if (target.denominator > 0 && width80 <= (config.decision_width || 0.12) && Math.max(pAbove, pBelow) >= (config.practical_probability || 0.8)) {
    sampleState = 'decision_eligible'; reason = 'posterior is concentrated and practical-effect probability passes configured threshold';
  }
  return {
    raw_numerator: target.numerator, raw_denominator: target.denominator, raw_rate: rawRate,
    peer_prior_alpha: prior.alpha, peer_prior_beta: prior.beta,
    posterior_alpha: alpha, posterior_beta: beta, posterior_mean: mean,
    posterior_interval_80_low: interval80[0], posterior_interval_80_high: interval80[1],
    posterior_interval_95_low: interval95[0], posterior_interval_95_high: interval95[1],
    peer_rate: peerRate, practical_delta: practicalDelta,
    probability_above_practical_delta: pAbove, probability_below_practical_delta: pBelow,
    sample_state: sampleState, sample_state_reason: reason,
  };
}

function buildBaselines({ observations = [], queries = [], manifest = [], config = {} }) {
  const manifestByPath = new Map((manifest || []).map((row) => [row.canonical_path || row.canonical_page_path, row]));
  const queryDistributions = buildQueryIntentDistributions(queries, config);
  const normalized = observations.map((row) => normalizeObservation(row, queryDistributions, manifestByPath));
  const outputs = normalized.map((target) => {
    if (!target.policy) {
      return {
        ...target,
        window_start: target.window_start || target.date || null,
        window_end: target.window_end || target.date || null,
        peer_policy_version: POLICY_VERSION,
        peer_cell_id: peerCellId(target.metric_family || 'unknown', 'unsupported', []),
        peer_fallback_level: 'blocked',
        peer_dimensions: [],
        peer_count: 0,
        peer_exclusions: ['unsupported_metric_family'],
        sample_state: 'insufficient',
        sample_state_reason: 'rate numerator and denominator semantics are unavailable for this source observation',
        raw_rate_leaderboard_eligible: false,
        measurement_status: 'MEASUREMENT_BLOCKED: RATE_SEMANTICS_UNAVAILABLE',
        provenance: { source: target.source || 'supplied_observation', contract_version: CONTRACT_VERSION },
      };
    }
    if (target.task_contract_status === 'UNRESOLVED' || target.task_contract_status === 'NEEDS_EDITORIAL_REVIEW') {
      return { ...target, peer_policy_version: POLICY_VERSION, sample_state: 'insufficient', measurement_status: 'MEASUREMENT_BLOCKED: TASK_CONTRACT_UNRESOLVED', peer_fallback_level: 'blocked', peer_count: 0, metric_family: target.metric_family };
    }
    const policy = target.policy;
    const selected = selectPeers(target, normalized, policy, config.minimum_peer_count || 3);
    const posterior = selected.peers.length >= (config.minimum_peer_count || 3) && target.denominator > 0 && target.numerator != null ? posteriorFor(target, selected.peers, config) : { sample_state: 'insufficient', sample_state_reason: selected.peers.length ? 'required numerator/denominator absent' : 'minimum peer context unavailable' };
    return {
      canonical_page_path: target.canonical_page_path,
      window_start: target.window_start || target.date || null,
      window_end: target.window_end || target.date || null,
      metric_family: target.metric_family,
      reporting_archetype: target.reporting_archetype || null,
      primary_task_family: target.primary_task_family || null,
      promise_task_alignment: target.promise_task_alignment || null,
      query_intent: target.query_intent,
      task_contract_status: target.task_contract_status || 'UNKNOWN',
      settlement_state: target.settlement_state || null,
      change_context_evaluated: target.change_context_evaluated === true,
      change_contamination_status: target.change_contamination_status || target.change_status || null,
      window_comparable: target.window_comparable,
      canonical_release_id: target.canonical_release_id || null,
      acquisition_release_id: target.acquisition_release_id || null,
      reconciliation_status: target.reconciliation_status || null,
      peer_policy_version: POLICY_VERSION,
      peer_cell_id: selected.cell_id,
      peer_fallback_level: selected.level,
      peer_dimensions: selected.dimensions,
      peer_count: selected.peers.length,
      peer_exclusions: ['self', 'missing_denominator', 'metric_family_mismatch', 'incompatible_context'],
      ...posterior,
      raw_rate_leaderboard_eligible: false,
      measurement_status: target.measurement_status || 'MEASURED',
      provenance: { source: target.source || 'supplied_observation', contract_version: CONTRACT_VERSION },
    };
  });
  return { schema_version: CONTRACT_VERSION, policy_version: POLICY_VERSION, query_intent_version: QUERY_INTENT_VERSION, query_intent_distributions: queryDistributions, baselines: outputs };
}

function parseArgs(argv) { const out = {}; for (const a of argv) { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) out[m[1]] = m[2]; } return out; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse); }
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.observations || !args.manifest || !args.out) { console.error('Usage: --observations=JSON --manifest=JSONL --out=JSON [--queries=JSONL]'); process.exitCode = 2; return; }
  const input = readJson(args.observations);
  const observations = Array.isArray(input) ? input : (input.rows || input.baselines || input.observations || []);
  const queries = args.queries ? (args.queries.endsWith('.jsonl') ? readJsonl(args.queries) : readJson(args.queries)) : [];
  const manifest = args.manifest.endsWith('.jsonl') ? readJsonl(args.manifest) : readJson(args.manifest);
  const result = buildBaselines({ observations, queries, manifest });
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(args.out.replace(/\.json$/, '.manifest.json'), JSON.stringify({ schema_version: CONTRACT_VERSION, row_count: result.baselines.length, query_distribution_count: result.query_intent_distributions.length, sample_state_counts: result.baselines.reduce((a, r) => { a[r.sample_state] = (a[r.sample_state] || 0) + 1; return a; }, {}), output_hash: require('node:crypto').createHash('sha256').update(JSON.stringify(result.baselines)).digest('hex') }, null, 2) + '\n');
  console.log(`Ticket 009 baselines: ${result.baselines.length} rows written to ${args.out}`);
}

module.exports = { CONTRACT_VERSION, QUERY_INTENT_VERSION, POLICY_VERSION, QUERY_INTENTS, POLICIES, classifyQueryIntent, buildQueryIntentDistributions, normalizeObservation, selectPeers, regularizedBeta, betaQuantile, estimatePrior, posteriorFor, buildBaselines };
if (require.main === module) main();
