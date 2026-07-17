const Module = require('node:module');
const assert = require('node:assert/strict');
const test = require('node:test');

const originalLoad = Module._load;
Module._load = function loadGoogleapisForUnitTests(request, parent, isMain) {
  if (request === 'googleapis') return { google: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const { archiveFilename, coverageMetadata, sameUrlSet } = require('./gsc-indexing-check.cjs');
Module._load = originalLoad;

test('marks a limited sitemap inspection as incomplete and archives it separately', () => {
  const coverage = coverageMetadata({ sitemapUrlCount: 251, inspectedUrls: ['https://mainedispensaryguide.com/'], flags: { limit: '1' } });
  assert.deepEqual(coverage, { scope: 'limited_sitemap', complete: false, sitemapUrlCount: 251, inspectedUrlCount: 1, limit: 1, requestedUrl: null });
  assert.equal(archiveFilename('2026-07-17', coverage, 'run-a'), 'gsc-indexing-report-2026-07-17-limited_sitemap-run-a.json');
  assert.notEqual(archiveFilename('2026-07-17', coverage, 'run-a'), archiveFilename('2026-07-17', coverage, 'run-b'));
});

test('marks an unbounded sitemap inspection as complete and retains its established archive name', () => {
  const coverage = coverageMetadata({ sitemapUrlCount: 2, inspectedUrls: ['https://mainedispensaryguide.com/a', 'https://mainedispensaryguide.com/b'], flags: {} });
  assert.equal(coverage.complete, true);
  assert.equal(archiveFilename('2026-07-17', coverage), 'gsc-indexing-report-2026-07-17.json');
});

test('only reuses a cache for the exact requested URL sequence', () => {
  assert.equal(sameUrlSet(['https://mainedispensaryguide.com/a'], ['https://mainedispensaryguide.com/a']), true);
  assert.equal(sameUrlSet(['https://mainedispensaryguide.com/a'], ['https://mainedispensaryguide.com/b']), false);
});
