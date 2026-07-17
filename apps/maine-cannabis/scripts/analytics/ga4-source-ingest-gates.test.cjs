'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { runGates } = require('./ga4-source-ingest.cjs');

test('G1 fails when a BigQuery report fails', () => {
  const gates = runGates({
    dataApiReports: [],
    bqReports: [
      { report_id: 'R2_session_metrics_daily', status: 'failed', rows: [] },
    ],
    canonicalReleaseId: 'rel_test',
    acquisitionReleaseId: 'run_test',
    sanitization: {},
    raw_record_json_sample: [],
  });

  assert.equal(gates.G1.status, 'FAIL');
  assert.deepEqual(gates.G1.failed_bq_reports, ['R2_session_metrics_daily']);
});

test('G1 records unavailable intraday attribution without misclassifying it as a source failure', () => {
  const gates = runGates({
    dataApiReports: [],
    bqReports: [
      { report_id: 'R2_session_metrics_daily', status: 'unavailable_intraday', compat_status: 'not_comparable', rows: [] },
    ],
    canonicalReleaseId: 'rel_test',
    acquisitionReleaseId: 'run_test',
    sanitization: {},
    raw_record_json_sample: [],
  });

  assert.equal(gates.G1.status, 'PASS');
  assert.deepEqual(gates.G1.failed_bq_reports, []);
});

test('G1 fails when a Data API report fails', () => {
  const gates = runGates({
    dataApiReports: [
      { report_id: 'R1_pageview_daily', status: 'failed', rows: [] },
    ],
    bqReports: [],
    canonicalReleaseId: 'rel_test',
    acquisitionReleaseId: 'run_test',
    sanitization: {},
    raw_record_json_sample: [],
  });

  assert.equal(gates.G1.status, 'FAIL');
  assert.deepEqual(gates.G1.failed_data_api_reports, ['R1_pageview_daily']);
});
