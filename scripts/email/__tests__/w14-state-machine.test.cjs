'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/email/fulfillment-assets.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/email/w14-workflow-contract.json'), 'utf8'));
const migration = fs.readFileSync(path.join(ROOT, 'scripts/email/migrations/2026-07-27-w14-fulfillment-state-machine.sql'), 'utf8');

test('asset allowlist is explicit, unique, HTTPS, and link-only', () => {
  assert.equal(assets.assets.length, 6);
  assert.equal(new Set(assets.assets.map((x) => x.promised_asset)).size, 6);
  assert.equal(new Set(assets.assets.map((x) => x.source_page)).size, 6);
  for (const asset of assets.assets) {
    const url = new URL(asset.canonical_url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'mainedispensaryguide.com');
    assert.match(url.pathname, /\.pdf$/);
    assert.equal(asset.active, true);
  }
  assert.equal(assets.template.attachment_policy, 'canonical_https_link_only');
});

test('migration encodes every conceptual state and race-safe claim', () => {
  for (const state of ['pending', 'claimed', 'sending', 'fulfilled', 'retryable_failure', 'terminal_failure', 'manual_review']) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /UPDATE public\.mdg_leads[\s\S]+RETURNING/);
  assert.match(migration, /mdg_leads_source_message_id_uq/);
  assert.match(migration, /mdg_fulfillment_attempts/);
});

test('deterministic Message-ID is persisted before the transport boundary', () => {
  const messagePosition = migration.indexOf("format('<mdg-w14-%s-a%s@mainedispensaryguide.com>'");
  const ledgerPosition = migration.indexOf('INSERT INTO public.mdg_fulfillment_attempts', messagePosition);
  const sendingPosition = migration.indexOf("SET fulfillment_status = 'sending'", ledgerPosition);
  assert.ok(messagePosition > 0);
  assert.ok(ledgerPosition > messagePosition);
  assert.ok(sendingPosition > ledgerPosition);
});

test('uncertain and stale sending outcomes never auto-requeue', () => {
  assert.match(migration, /WHEN 'uncertain'[\s\S]+v_next_status := 'manual_review'/);
  assert.match(migration, /STALE_SENDING_UNCERTAIN/);
  assert.match(migration, /stale_sending_possible_provider_acceptance/);
});

test('normal automatic retry cap is three provider submissions', () => {
  assert.equal(contract.retry_policy.maximum_provider_submissions, 3);
  assert.equal(contract.retry_policy.after_maximum, 'manual_review');
  assert.match(migration, /attempt_count >= \(3 \+ l\.resend_authorized_count\)/);
  assert.match(migration, /mdg_w14_authorize_resend/);
  assert.match(migration, /operator identity and an audited reason/);
});

test('workflow contract disables retained execution payloads and retry amplification', () => {
  assert.equal(contract.execution_retention.saveDataSuccessExecution, 'none');
  assert.equal(contract.execution_retention.saveDataErrorExecution, 'none');
  assert.equal(contract.execution_retention.saveManualExecutions, false);
  assert.equal(contract.transport.node_retry_on_fail, false);
  assert.equal(contract.transport.workflow_retry_on_fail, false);
  assert.equal(contract.transport.automatic_send_paths, 1);
});
