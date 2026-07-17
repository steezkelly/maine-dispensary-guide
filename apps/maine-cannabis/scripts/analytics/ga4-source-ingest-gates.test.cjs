'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runGates, writeReleaseArtifact } = require('./ga4-source-ingest.cjs');

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

test('a failed rerun removes a stale canonical release artifact', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ga4-ingest-'));
  try {
    writeReleaseArtifact(outDir, { release_status: 'VALID', acquisition_release_id: 'run_prior' }, true);
    writeReleaseArtifact(outDir, { release_status: 'INVALID', acquisition_release_id: 'run_failed' }, false);

    assert.equal(fs.existsSync(path.join(outDir, 'canonical_release.json')), false);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(outDir, 'rejected_release.json'), 'utf8')),
      { release_status: 'INVALID', acquisition_release_id: 'run_failed' }
    );
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
