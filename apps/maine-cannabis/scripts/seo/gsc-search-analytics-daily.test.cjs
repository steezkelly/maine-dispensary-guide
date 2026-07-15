const assert = require('node:assert/strict');
const test = require('node:test');

const producer = require('./gsc-search-analytics-daily.cjs');

test('uses Los Angeles calendar arithmetic for a finalized daily window across DST', () => {
  const now = new Date('2026-03-09T19:00:00Z'); // March 9 in Los Angeles, after DST begins.
  assert.deepEqual(producer.getSourceWindow(now, 1, 3), {
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
  });
  assert.deepEqual(producer.getSourceWindow(now, 7, 3), {
    sourceStartDate: '2026-02-28',
    sourceEndDate: '2026-03-06',
  });
});

test('writes finalized one-day provenance onto every GSC row', () => {
  const records = producer.recordsFromRows([
    { keys: ['maine dispensaries', 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/'], clicks: 2, impressions: 10, ctr: 0.2, position: 4 },
  ], {
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
  }, '2026-03-09');

  assert.deepEqual(records, [{
    snapshotDate: '2026-03-09',
    sourceStartDate: '2026-03-06',
    sourceEndDate: '2026-03-06',
    sourceTimezone: 'America/Los_Angeles',
    sourceDataState: 'final',
    query: 'maine dispensaries',
    page: 'https://mainedispensaryguide.com/guides/maine-dispensary-guide/',
    clicks: 2,
    impressions: 10,
    ctr: 0.2,
    position: 4,
  }]);
});
