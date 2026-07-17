const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSnapshot } = require('./gsc-technical-snapshot.cjs');

test('retains first-seen state and records unobserved coverage rather than passing it', () => {
  const snapshot = buildSnapshot({ sitemapUrls: ['https://mainedispensaryguide.com/guides/a'], manifestRows: [{ canonical_path: '/guides/a' }], coverageRows: [], pageChecks: { '/guides/a': { checked: false } }, extractedAt: '2026-07-17T12:00:00.000Z', prior: { routes: [{ route: '/guides/a', firstSeenAt: '2026-07-01T00:00:00.000Z' }] } });
  const row = snapshot.routes.find(candidate => candidate.route === '/guides/a');
  assert.equal(row.firstSeenAt, '2026-07-01T00:00:00.000Z');
  assert.deepEqual(row.reasonCodes, ['GSC_COVERAGE_UNOBSERVED', 'PRODUCTION_HTML_UNOBSERVED']);
  assert.equal(row.state, 'REVIEW');
});
