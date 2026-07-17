const assert = require('node:assert/strict');
const test = require('node:test');
const { buildReport, markdown } = require('./gsc-cluster-report.cjs');

test('rejects raw-query cluster report output paths outside private GSC storage', () => {
  const { privateOutputPath } = require('./gsc-cluster-report.cjs');
  assert.match(privateOutputPath('/home/steve/.hermes/data/mdg-gsc/reports/cluster.md'), /mdg-gsc\/reports\/cluster\.md$/);
  assert.throws(() => privateOutputPath('docs/analytics/cluster.md'), /private GSC data root/);
  assert.match(require('./gsc-cluster-report.cjs').SNAPSHOTS, /\.hermes\/data\/mdg-gsc\/gsc-search-analytics-snapshots\/query-by-page\.jsonl$/);
});

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

test('carries query snapshot filters into the report and visible markdown scope', () => {
  const report = buildReport({
    sourceWindow: { sourceStartDate: '2026-07-01', sourceEndDate: '2026-07-01' },
    completeness: { status: 'top_rows_truncated_or_unknown' },
    searchType: 'web', filters: { country: 'USA', device: 'MOBILE', searchAppearance: null },
    rows: [],
  }, new Map(), new Map());
  assert.deepEqual(report.scope, { searchType: 'web', filters: { country: 'USA', device: 'MOBILE', searchAppearance: null } });
  assert.match(markdown(report), /Scope: search type web; filters country=USA, device=MOBILE\./);
});
