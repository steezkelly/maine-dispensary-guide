'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReport, canonicalPath, markdown } = require('./source-review-report.cjs');

test('canonicalPath normalizes a production URL and slash-less path', () => {
  assert.equal(canonicalPath('https://mainedispensaryguide.com/market-stats/'), '/market-stats');
  assert.equal(canonicalPath('/market-stats/'), '/market-stats');
});
test('prioritizes exposed expired evidence ahead of current evidence', () => {
  const manifest = { claims: [
    { claim_id: 'current', canonical_path: '/current', mdg_verification_date: '2026-07-15', review_cadence_days: 30 },
    { claim_id: 'expired', canonical_path: '/expired', mdg_verification_date: '2026-06-01', review_cadence_days: 7 },
  ] };
  const rows = buildReport({ manifest, asOf: '2026-07-17', gscRows: [{ page: 'https://mainedispensaryguide.com/expired', clicks: 2, impressions: 20 }], ga4Rows: [{ dimensions: { pagePath: '/expired' }, metrics: { screenPageViews: 10 } }] });
  assert.equal(rows[0].claim_id, 'expired');
  assert.equal(rows[0].status, 'expired');
  assert.equal(rows[0].priority_score, 120);
});
test('report labels source selection as optional and non-probative', () => {
  const report = markdown([], '2026-07-17');
  assert.match(report, /optional trust\/verification signal only/);
  assert.match(report, /not\*\* evidence that the claim is accurate/);
});
