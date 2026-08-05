'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'ga4-lead-capture-daily.cjs');
const { makeSnapshot, reportabilityMode, runLeadCaptureReport, writeSnapshot } = require(script);

function run(args = [], env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

(function dryRunIsPrivateAndNetworkFree() {
  const result = run(['--dry-run'], {
    GA4_PROPERTY_ID: '532778727',
    MDG_GA4_DATA_ROOT: '/tmp/mdg-ga4-test-root',
  });

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /GA4 lead-capture report — dry run/i);
  assert.match(result.stdout, /output root: \/tmp\/mdg-ga4-test-root/i);
  assert.match(result.stdout, /page_level_fallback/i);
  assert.doesNotMatch(result.stdout + result.stderr, /googleauth|credential|token|https?:\/\//i);
})();

(function fallbackSnapshotIsPrivateAndOmitsFormName() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ga4-lead-'));
  try {
    const snapshot = makeSnapshot({
      propertyId: '532778727',
      mode: 'page_level_fallback',
      rows: [{ date: '2026-08-04', pagePath: '/contact', eventName: 'lead_capture', eventCount: 2, sessions: 2 }],
    });
    const target = writeSnapshot(root, snapshot);
    const saved = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.strictEqual(saved.reportability_mode, 'page_level_fallback');
    assert.strictEqual(saved.rows[0].form_name, undefined);
    assert.strictEqual(fs.statSync(root).mode & 0o777, 0o700);
    assert.strictEqual(fs.statSync(target).mode & 0o777, 0o600);
    assert.doesNotMatch(JSON.stringify(saved), /https?:\/\/|@|user_pseudo_id|session_id/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})();

async function metadataAndPaginationAreComplete() {
  const metadataClient = {
    properties: {
      getMetadata: async () => ({ data: { dimensions: [{ apiName: 'customEvent:form_name' }] } }),
    },
  };
  assert.strictEqual(await reportabilityMode(metadataClient, '532778727'), 'per_form');
  const fallbackMetadataClient = {
    properties: {
      getMetadata: async () => ({ data: { dimensions: [{ apiName: 'pagePath' }] } }),
    },
  };
  assert.strictEqual(await reportabilityMode(fallbackMetadataClient, '532778727'), 'page_level_fallback');

  const calls = [];
  const makeRow = (index) => ({
    dimensionValues: [{ value: '20260804' }, { value: `/form-${index}` }, { value: 'lead_capture' }, { value: 'download_checklist' }],
    metricValues: [{ value: '1' }, { value: '1' }],
  });
  const analytics = {
    properties: {
      runReport: async ({ requestBody }) => {
        calls.push(requestBody);
        const offset = requestBody.offset || 0;
        return { data: { rowCount: 5001, rows: offset === 0 ? Array.from({ length: 5000 }, (_, i) => makeRow(i)) : [makeRow(5000)] } };
      },
    },
  };
  const rows = await runLeadCaptureReport(analytics, '532778727', 'per_form');
  assert.strictEqual(rows.length, 5001);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].dimensions.at(-1).name, 'customEvent:form_name');
  assert.deepStrictEqual(calls[0].orderBys.map((order) => order.dimension.dimensionName), ['date', 'pagePath', 'eventName', 'customEvent:form_name']);
  assert.strictEqual(calls[1].offset, 5000);

  await assert.rejects(
    runLeadCaptureReport({
      properties: {
        runReport: async ({ requestBody }) => ({
          data: {
            rowCount: 5001,
            rows: (requestBody.offset || 0) === 0 ? Array.from({ length: 5000 }, (_, i) => makeRow(i)) : [makeRow(0)],
          },
        }),
      },
    }, '532778727', 'per_form'),
    /duplicate GA4 row/i,
  );

  const fallbackCalls = [];
  await runLeadCaptureReport({
    properties: {
      runReport: async ({ requestBody }) => {
        fallbackCalls.push(requestBody);
        return { data: { rowCount: 0, rows: [] } };
      },
    },
  }, '532778727', 'page_level_fallback');
  assert.strictEqual(fallbackCalls.length, 1);
  assert.ok(!fallbackCalls[0].dimensions.some((dimension) => dimension.name === 'customEvent:form_name'));
}

(function unexpectedFormLabelsAreRedacted() {
  const snapshot = makeSnapshot({
    propertyId: '532778727',
    mode: 'per_form',
    rows: [{ date: '20260804', pagePath: '/contact', eventName: 'lead_capture', eventCount: 1, sessions: 1, 'customEvent:form_name': 'email@example.com' }],
  });
  assert.strictEqual(snapshot.redacted_form_name_count, 1);
  assert.strictEqual(snapshot.rows[0].form_name, undefined);
})();

(function allowlistedFormLabelsArePersisted() {
  const snapshot = makeSnapshot({
    propertyId: '532778727',
    mode: 'per_form',
    rows: [{ date: '20260804', pagePath: '/download-checklist', eventName: 'lead_capture', eventCount: 1, sessions: 1, 'customEvent:form_name': 'download_checklist' }],
  });
  assert.strictEqual(snapshot.redacted_form_name_count, 0);
  assert.strictEqual(snapshot.rows[0].form_name, 'download_checklist');
})();

metadataAndPaginationAreComplete()
  .then(() => console.log('ga4-lead-capture-daily tests: PASS'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
