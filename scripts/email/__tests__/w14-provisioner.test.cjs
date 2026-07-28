'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildNormalizeCode,
  buildW14Workflow,
  privacySettings,
  updatedInsertContract,
} = require('../provision-w14-workflows.cjs');

test('W13 normalization derives allowlisted assets from exact page paths', () => {
  const code = buildNormalizeCode();
  for (const asset of [
    'maine_dispensary_roadmap_2026',
    'maine_cannabis_founders_bible_2026',
    'maine_first_timer_field_guide',
    'maine_metrc_reconciliation_checklist',
    'maine_dispensary_compliance_self_assessment',
    'maine_cannabis_industry_report_q3_2026',
  ]) assert.match(code, new RegExp(asset));
  assert.doesNotMatch(code, /raw\.promised_asset/);
  assert.doesNotMatch(code, /raw\.asset_id/);
  assert.match(code, /throw new Error\('invalid_email'\)/);
  assert.doesNotMatch(code, /invalid_email.*\+.*email/);
});

test('W13 insert preserves nullable fields and marks non-assets not applicable', () => {
  const insert = updatedInsertContract();
  assert.match(insert.query, /form_name, success_path, fulfillment_status/);
  assert.match(insert.queryReplacement, /\$json\.form_name, \$json\.success_path/);
  assert.match(insert.queryReplacement, /\$json\.promised_asset \? 'pending' : 'not_applicable'/);
  assert.match(insert.queryReplacement, /v === undefined \? null : v/);
  assert.doesNotMatch(insert.queryReplacement, /v === null \? '' : v/);
  assert.match(insert.query, /\$18, \$19, \$20/);
});

test('W14 is one-row, one-send-path, two-outcome workflow with no retries', () => {
  const workflow = buildW14Workflow(
    { id: 'pg-test', name: 'Postgres test' },
    { id: 'smtp-test', name: 'SMTP test' },
  );
  assert.equal(workflow.name, 'W14: Durable Lead Asset Fulfillment');
  assert.equal(workflow.settings.saveDataSuccessExecution, 'none');
  assert.equal(workflow.settings.saveDataErrorExecution, 'none');
  assert.equal(workflow.settings.saveManualExecutions, false);
  assert.equal(workflow.settings.saveExecutionProgress, false);

  const sendNodes = workflow.nodes.filter((node) => node.type === 'CUSTOM.mdgSmtpSend');
  assert.equal(sendNodes.length, 1);
  assert.equal(sendNodes[0].retryOnFail, false);
  assert.equal(sendNodes[0].parameters.messageId, '={{ $json.outbound_message_id }}');
  assert.equal(workflow.connections['Submit one SMTP message'].main.length, 2);
  assert.equal(workflow.connections['Submit one SMTP message'].main[0][0].node, 'Mark fulfilled');
  assert.equal(workflow.connections['Submit one SMTP message'].main[1][0].node, 'Mark bounded failure');
});

test('SQL workflow calls only parameterized W14 state functions', () => {
  const workflow = buildW14Workflow(
    { id: 'pg-test', name: 'Postgres test' },
    { id: 'smtp-test', name: 'SMTP test' },
  );
  const pg = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.postgres');
  assert.equal(pg.length, 5);
  for (const node of pg) {
    assert.equal(node.retryOnFail, false);
    assert.doesNotMatch(node.parameters.query, /\{\{/);
  }
  assert.match(pg.find((node) => node.name === 'Claim one due lead').parameters.query, /mdg_w14_claim\(\$1/);
  assert.match(pg.find((node) => node.name === 'Prepare durable send').parameters.query, /mdg_w14_prepare_send\(\$1/);
});

test('provisioner cannot activate workflows or persist raw exports', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../provision-w14-workflows.cjs'), 'utf8');
  assert.doesNotMatch(source, /\/activate['"`]/);
  assert.doesNotMatch(source, /writeFileSync/);
  assert.match(source, /refusing to mutate active W14 workflow/);
});

test('privacy settings preserve unrelated settings while failing PII retention closed', () => {
  assert.deepEqual(privacySettings({ callerPolicy: 'workflowsFromSameOwner' }), {
    callerPolicy: 'workflowsFromSameOwner',
    executionOrder: 'v1',
    saveExecutionProgress: false,
    saveDataSuccessExecution: 'none',
    saveDataErrorExecution: 'none',
    saveManualExecutions: false,
  });
});

test('JSON allowlist and SQL migration allowlist are in parity', () => {
  const assets = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../fulfillment-assets.json'), 'utf8'),
  );
  const migration = fs.readFileSync(
    path.resolve(__dirname, '../migrations/2026-07-27-w14-fulfillment-state-machine.sql'),
    'utf8',
  );
  const list = assets.assets;
  assert.equal(list.length, 6, 'expected six allowlisted assets in JSON');
  for (const entry of list) {
    const id = entry.promised_asset;
    assert.match(migration, new RegExp(`'${id}'`), `migration missing asset ${id}`);
    assert.match(migration, new RegExp(entry.canonical_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `migration missing canonical URL for ${id}`);
    assert.match(migration, new RegExp(entry.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `migration missing subject for ${id}`);
  }
});

test('W13 normalization documents trust boundary and rejects unknown paths', () => {
  const code = buildNormalizeCode();
  assert.match(code, /TRUST BOUNDARY/);
  assert.match(code, /routeContract\[pagePath\] \|\| null/);
  assert.doesNotMatch(code, /raw\.promised_asset/);
  assert.doesNotMatch(code, /raw\.asset_id/);
  // The pending/not_applicable routing lives in the insert contract, not normalize.
  const insert = updatedInsertContract();
  assert.match(insert.queryReplacement, /\$json\.promised_asset \? 'pending' : 'not_applicable'/);
});
