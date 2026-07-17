const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSnapshot, fetchSitemapUrls } = require('./gsc-technical-snapshot.cjs');

test('retains first-seen state and records unobserved coverage rather than passing it', () => {
  const snapshot = buildSnapshot({ sitemapUrls: ['https://mainedispensaryguide.com/guides/a'], manifestRows: [{ canonical_path: '/guides/a' }], coverageRows: [], pageChecks: { '/guides/a': { checked: false } }, extractedAt: '2026-07-17T12:00:00.000Z', prior: { routes: [{ route: '/guides/a', firstSeenAt: '2026-07-01T00:00:00.000Z' }] } });
  const row = snapshot.routes.find(candidate => candidate.route === '/guides/a');
  assert.equal(row.firstSeenAt, '2026-07-01T00:00:00.000Z');
  assert.deepEqual(row.reasonCodes, ['GSC_COVERAGE_UNOBSERVED', 'PRODUCTION_HTML_UNOBSERVED']);
  assert.equal(row.state, 'REVIEW');
});

test('marks absent production checks as unobserved rather than passing the route', () => {
  const snapshot = buildSnapshot({ sitemapUrls: ['https://mainedispensaryguide.com/guides/a'], manifestRows: [{ canonical_path: '/guides/a' }], coverageRows: [{ url: 'https://mainedispensaryguide.com/guides/a', status: 'INDEXED' }], redirectSources: [], extractedAt: '2026-07-17T12:00:00.000Z' });
  const row = snapshot.routes[0];
  assert.deepEqual(row.reasonCodes, ['PRODUCTION_HTML_UNOBSERVED']);
  assert.equal(row.state, 'REVIEW');
});
test('rejects non-success sitemap responses before parsing their bodies', async () => {
  let readBody = false;
  await assert.rejects(() => fetchSitemapUrls(async () => ({ ok: false, status: 500, text: async () => { readBody = true; return ''; } })), /sitemap fetch 500/);
  assert.equal(readBody, false);
});

test('classifies unknown GSC inspections as review evidence', () => {
  const snapshot = buildSnapshot({ sitemapUrls: ['https://mainedispensaryguide.com/about/authors'], manifestRows: [{ canonical_path: '/about/authors' }], coverageRows: [{ url: 'https://mainedispensaryguide.com/about/authors', status: 'CRAWLED_PENDING' }], redirectSources: [], pageChecks: { '/about/authors': { checked: true, fetchStatus: 200 } }, extractedAt: '2026-07-17T12:00:00.000Z' });
  assert.deepEqual(snapshot.routes[0].reasonCodes, ['GSC_UNRECOGNIZED_STATUS_REQUIRES_REVIEW']);
  assert.equal(snapshot.routes[0].state, 'REVIEW');
});

test('classifies NEUTRAL GSC inspections as review evidence', async () => {
  const snapshot = buildSnapshot({ sitemapUrls: ['https://mainedispensaryguide.com/about/authors'], manifestRows: [{ canonical_path: '/about/authors' }], coverageRows: [{ url: 'https://mainedispensaryguide.com/about/authors', status: 'NEUTRAL' }], pageChecks: { '/about/authors': { checked: true, fetchStatus: 200 } }, extractedAt: '2026-07-17T12:00:00.000Z' });
  const row = snapshot.routes.find(candidate => candidate.route === '/about/authors');
  assert.deepEqual(row.reasonCodes, ['GSC_NEUTRAL_REQUIRES_REVIEW']);
  assert.equal(row.state, 'REVIEW');
});
