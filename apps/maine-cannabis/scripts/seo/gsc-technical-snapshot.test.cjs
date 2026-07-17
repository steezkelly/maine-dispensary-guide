const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSnapshot, fetchSitemapUrls, indexabilityFor, latestCoverage } = require('./gsc-technical-snapshot.cjs');

test('rejects a newer partial export and selects the newest demonstrably complete coverage export', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-coverage-'));
  try {
    fs.writeFileSync(path.join(directory, 'gsc-indexing-report-2026-07-10.json'), JSON.stringify({ coverage: { scope: 'full_sitemap', complete: true, sitemapUrlCount: 2, inspectedUrlCount: 2 }, results: [{ url: 'https://mainedispensaryguide.com/a', status: 'INDEXED' }, { url: 'https://mainedispensaryguide.com/b', status: 'INDEXED' }] }));
    fs.writeFileSync(path.join(directory, 'gsc-indexing-report-2026-07-11-limited_sitemap.json'), JSON.stringify({ coverage: { scope: 'limited_sitemap', complete: false, sitemapUrlCount: 2, inspectedUrlCount: 1, limit: 1 }, results: [{ url: 'https://mainedispensaryguide.com/a', status: 'NOT_INDEXED' }] }));
    const coverage = latestCoverage(directory);
    assert.equal(coverage.file, 'gsc-indexing-report-2026-07-10.json');
    assert.equal(coverage.results.length, 2);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('does not trust legacy exports without explicit completeness metadata', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-gsc-coverage-'));
  try {
    fs.writeFileSync(path.join(directory, 'gsc-indexing-report-2026-07-10.json'), JSON.stringify({ results: [{ url: 'https://mainedispensaryguide.com/a', status: 'INDEXED' }] }));
    assert.deepEqual(latestCoverage(directory), { file: null, report: null, results: [] });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

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

test('omits wildcard redirect patterns from concrete route states', () => {
  const snapshot = buildSnapshot({ sitemapUrls: [], manifestRows: [], coverageRows: [], redirectSources: ['/(.*)', '/legacy'] });
  assert.deepEqual(snapshot.routes.map((row) => row.route), ['/legacy']);
});

test('models configured noindex routes as ineligible for sitemap and indexation review', () => {
  assert.deepEqual(indexabilityFor('/admin/email-dashboard'), { indexable: false, sitemapEligible: false, reason: 'CONFIGURED_NOINDEX_ROUTE' });
  assert.deepEqual(indexabilityFor('/search'), { indexable: false, sitemapEligible: false, reason: 'CONFIGURED_NOINDEX_ROUTE' });
  assert.deepEqual(indexabilityFor('/404'), { indexable: false, sitemapEligible: false, reason: 'NOT_FOUND_ROUTE' });
  assert.deepEqual(indexabilityFor('/guides/a'), { indexable: true, sitemapEligible: true, reason: null });
});

test('excludes intentionally non-indexable manifest routes from route-state review', () => {
  const snapshot = buildSnapshot({
    sitemapUrls: ['https://mainedispensaryguide.com/guides/a'],
    manifestRows: [
      { canonical_path: '/guides/a' },
      { canonical_path: '/admin/email-dashboard' },
      { canonical_path: '/search' },
      { canonical_path: '/404' },
    ],
    coverageRows: [{ url: 'https://mainedispensaryguide.com/guides/a', status: 'INDEXED' }],
    redirectSources: [],
    pageChecks: { '/guides/a': { checked: true, fetchStatus: 200 } },
  });
  assert.deepEqual(snapshot.routes.map(row => row.route), ['/guides/a']);
  assert.deepEqual(snapshot.sources.excludedManifestRoutes, ['/404', '/admin/email-dashboard', '/search']);
  assert.equal(snapshot.routes[0].state, 'PASS');
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
