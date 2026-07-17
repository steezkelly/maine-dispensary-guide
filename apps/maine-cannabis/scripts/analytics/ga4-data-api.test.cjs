'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { reportCompleteness } = require('./ga4-data-api.cjs');

test('marks a response with unfetched rows incomplete', () => {
  assert.equal(reportCompleteness(100001, 100000), 'partial');
});

test('marks a complete response complete', () => {
  assert.equal(reportCompleteness(2, 2), 'ok');
});
