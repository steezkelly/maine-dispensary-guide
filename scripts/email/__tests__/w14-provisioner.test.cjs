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

test('W13 insert preserves nullable fields and delegates classification to the database', () => {
  const insert = updatedInsertContract();
  // Nullable request fields are still passed through (undefined -> null), so the
  // database function receives explicit NULLs rather than the string 'undefined'.
  assert.match(insert.queryReplacement, /v === undefined \? null : v/);
  assert.doesNotMatch(insert.queryReplacement, /v === null \? '' : v/);
  // The nullable identity/asset fields are present in the replacement list.
  assert.match(insert.queryReplacement, /\$json\.from_name/);
  assert.match(insert.queryReplacement, /\$json\.message_body/);
  assert.match(insert.queryReplacement, /\$json\.form_name, \$json\.success_path/);
  // The caller no longer marks non-assets not_applicable: classification is
  // database-authoritative (BEFORE INSERT trigger), so the caller value is gone.
  assert.doesNotMatch(insert.queryReplacement, /promised_asset \? 'pending' : 'not_applicable'/);
  // The function call carries all 20 positional parameters.
  assert.match(insert.query, /\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10/);
  assert.match(insert.query, /\$11, \$12, \$13, \$14, \$15, \$16, \$17, \$18, \$19, \$20/);
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
  // The pending/not_applicable routing is database-authoritative (BEFORE INSERT
  // trigger), reached via the fail-closed insert function — not the caller.
  const insert = updatedInsertContract();
  assert.match(insert.query, /SELECT mdg_w14_insert_lead\(/);
  assert.doesNotMatch(insert.queryReplacement, /promised_asset \? 'pending' : 'not_applicable'/);
});

test('migration REVOKE EXECUTE FROM PUBLIC is unconditional', () => {
  const migration = fs.readFileSync(
    path.resolve(__dirname, '../migrations/2026-07-27-w14-fulfillment-state-machine.sql'),
    'utf8',
  );
  // REVOKE must appear outside any DO block / IF EXISTS guard.
  const revokeLines = migration.split('\n').filter((l) => l.trim().startsWith('REVOKE EXECUTE'));
  assert.ok(revokeLines.length >= 6, 'expected at least six unconditional REVOKE statements');
  for (const line of revokeLines) {
    assert.doesNotMatch(line, /IF EXISTS/i, 'REVOKE must not be conditional');
  }
});

// --- request_id idempotency identity (W14 cutover/request-id correction) ---

const { runNormalizeCode } = require('../provision-w14-workflows.cjs');
// Canonical RFC-4122 UUID v4 (version nibble 4, variant nibble in [89ab]).
const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';
const VALID_UUID_2 = '9b2f3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

test('W13 normalize requires a canonical UUID v4 request_id', () => {
  // Valid canonical UUID v4 passes and is lowercased/trimmed.
  const ok = runNormalizeCode({ email: 'a@b.com', page_path: '/download-checklist', request_id: VALID_UUID });
  assert.equal(ok.request_id, VALID_UUID);
  // Uppercase UUID is normalized to lowercase canonical form.
  const upper = runNormalizeCode({ email: 'a@b.com', page_path: '/download-checklist', request_id: VALID_UUID.toUpperCase() });
  assert.equal(upper.request_id, VALID_UUID);
  // Missing request_id is rejected cleanly.
  assert.throws(() => runNormalizeCode({ email: 'a@b.com', page_path: '/download-checklist' }), /missing_request_id/);
  // Malformed request_id is rejected cleanly.
  assert.throws(() => runNormalizeCode({ email: 'a@b.com', page_path: '/download-checklist', request_id: 'not-a-uuid' }), /invalid_request_id/);
  assert.throws(() => runNormalizeCode({ email: 'a@b.com', page_path: '/download-checklist', request_id: '12345' }), /invalid_request_id/);
});

test('W13 normalize enforces RFC-4122 v4 version and variant bits', () => {
  // Wrong version nibble (v1: version=1) is rejected even though it is a
  // well-formed canonical UUID.
  const v1 = '123e4567-e89b-12d3-a456-426614174000';
  assert.throws(() => runNormalizeCode({ email: 'a@b.com', page_path: '/x', request_id: v1 }), /invalid_request_id/);
  // Wrong variant nibble (variant not in [89ab]) is rejected.
  const badVariant = '123e4567-e89b-42d3-0456-426614174000';
  assert.throws(() => runNormalizeCode({ email: 'a@b.com', page_path: '/x', request_id: badVariant }), /invalid_request_id/);
  // A correct v4 with each allowed variant nibble is accepted.
  for (const variant of ['8', '9', 'a', 'b']) {
    const uuid = `123e4567-e89b-42d3-${variant}456-426614174000`;
    const j = runNormalizeCode({ email: 'a@b.com', page_path: '/x', request_id: uuid });
    assert.equal(j.request_id, uuid);
  }
});

test('source_message_id is derived solely from the request_id (no PII)', () => {
  const j = runNormalizeCode({
    email: 'person@example.com', page_path: '/download-checklist', name: 'Person Name',
    request_id: VALID_UUID,
  });
  assert.equal(j.source_message_id, 'api_post:' + VALID_UUID);
  // No email, name, or page path appears in the source identity.
  assert.ok(!j.source_message_id.includes('person@example.com'));
  assert.ok(!j.source_message_id.includes('Person'));
  assert.ok(!j.source_message_id.includes('download-checklist'));
  assert.ok(!j.source_message_id.includes('@'));
});

test('same UUID yields the same source_message_id; different UUIDs differ', () => {
  const a = runNormalizeCode({ email: 'x@y.com', page_path: '/download-checklist', request_id: VALID_UUID });
  const b = runNormalizeCode({ email: 'x@y.com', page_path: '/download-checklist', request_id: VALID_UUID });
  assert.equal(a.source_message_id, b.source_message_id);
  const c = runNormalizeCode({ email: 'x@y.com', page_path: '/download-checklist', request_id: VALID_UUID_2 });
  assert.notEqual(a.source_message_id, c.source_message_id);
});

test('same email/page/form with a new request_id creates a distinct identity', () => {
  // A legitimate repeat submission by the same address for the same asset,
  // carrying a NEW request_id, must produce a different source_message_id so it
  // inserts as a new lead (not deduplicated against the first).
  const first = runNormalizeCode({ email: 'repeat@y.com', page_path: '/download/founders-bible', request_id: VALID_UUID });
  const second = runNormalizeCode({ email: 'repeat@y.com', page_path: '/download/founders-bible', request_id: VALID_UUID_2 });
  assert.equal(first.promised_asset, second.promised_asset);
  assert.notEqual(first.source_message_id, second.source_message_id);
});

test('ts is observational only and not part of the identity', () => {
  // Two submissions identical except for ts must produce the SAME identity
  // (proving ts is not part of the idempotency key).
  const a = runNormalizeCode({ email: 't@y.com', page_path: '/download-checklist', request_id: VALID_UUID, ts: '2026-01-01T00:00:00Z' });
  const b = runNormalizeCode({ email: 't@y.com', page_path: '/download-checklist', request_id: VALID_UUID, ts: '2026-06-06T06:06:06Z' });
  assert.equal(a.source_message_id, b.source_message_id);
});

test('FNV-1a is no longer used for lead identity', () => {
  const code = buildNormalizeCode();
  assert.doesNotMatch(code, /fnv1a/);
  assert.doesNotMatch(code, /0x811c9dc5/);
  assert.match(code, /api_post:' \+ requestId|api_post:" \+ requestId|'api_post:' \+ requestId/);
});

test('W13 insert routes through the fail-closed mdg_w14_insert_lead function', () => {
  const insert = updatedInsertContract();
  // The insert is a single call to the restricted database function, which
  // resolves the idempotency key and fails closed on mismatch.
  assert.match(insert.query, /SELECT mdg_w14_insert_lead\(/);
  assert.match(insert.query, /AS id/);
  // The raw ON CONFLICT upsert is gone (classification + idempotency now live
  // in the database function + BEFORE INSERT trigger).
  assert.doesNotMatch(insert.query, /ON CONFLICT/);
  // The queryReplacement passes source_message_id first and request_id last,
  // matching the function's (p_source_message_id, ..., p_request_id) signature.
  assert.match(insert.queryReplacement, /\$json\.source_message_id/);
  assert.match(insert.queryReplacement, /\$json\.request_id/);
  // The caller no longer supplies a meaningful fulfillment_status (the trigger
  // classifies database-authoritatively).
  assert.doesNotMatch(insert.queryReplacement, /promised_asset \? 'pending' : 'not_applicable'/);
});
