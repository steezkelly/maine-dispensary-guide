const assert = require('node:assert/strict');
const test = require('node:test');
const { buildReport } = require('./gsc-cluster-report.cjs');

test('only ranks opportunities at the documented impression floor and flags conflicts for review', () => {
  const report = buildReport({
    sourceWindow: { sourceStartDate: '2026-07-01', sourceEndDate: '2026-07-01' }, completeness: { status: 'complete_within_requested_dimensions' },
    rows: [
      { keys: ['maine dispensary license', 'https://mainedispensaryguide.com/guides/maine-dispensary-license'], impressions: 24, clicks: 0, position: 9 },
      { keys: ['maine dispensary license', 'https://mainedispensaryguide.com/blog/maine-dispensary-how-to-open'], impressions: 20, clicks: 0, position: 10 },
      { keys: ['small query', 'https://mainedispensaryguide.com/guides/maine-dispensary-license'], impressions: 19, clicks: 0, position: 9 },
    ],
  }, new Map([['/guides/maine-dispensary-license', { route_family: 'long_form_guide' }], ['/blog/maine-dispensary-how-to-open', { route_family: 'editorial_blog' }]]), new Map([['/blog/maine-dispensary-how-to-open', '/guides/maine-dispensary-license']]), 20);
  assert.equal(report.opportunities.length, 1);
  assert.equal(report.mismatches.length, 1);
  assert.equal(report.canonicalCompetitors.length, 1);
  assert.equal(report.clusters.find(row => row.cluster === 'business guides').impressions, 43);
});
