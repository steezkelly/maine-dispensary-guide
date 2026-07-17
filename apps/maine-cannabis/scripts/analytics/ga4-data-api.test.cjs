'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { fetchAllReportPages, reportCompleteness } = require('./ga4-data-api.cjs');

test('marks a response with unfetched rows incomplete', () => {
  assert.equal(reportCompleteness(100001, 100000), 'partial');
});

test('marks a complete response complete', () => {
  assert.equal(reportCompleteness(2, 2), 'ok');
});

test('fetches every GA4 report page before completing a report', async () => {
  const offsets = [];
  const result = await fetchAllReportPages(async (requestBody) => {
    offsets.push(requestBody.offset);
    const rows = requestBody.offset === 0 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }];
    return { data: { rowCount: 3, rows } };
  }, { dateRanges: [] }, 2);
  assert.deepEqual(offsets, [0, 2]);
  assert.equal(result.rowCount, 3);
  assert.deepEqual(result.rows, [{ id: 1 }, { id: 2 }, { id: 3 }]);
});
