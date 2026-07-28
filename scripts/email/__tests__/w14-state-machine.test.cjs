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

// --- activation cutover safety (W14 cutover/request-id correction) ---

test('migration uses an activation cutover, not a seven-day proxy', () => {
  // The unsafe seven-day backfill proxy must be gone.
  assert.doesNotMatch(migration, /interval '7 days'/);
  // An activation control singleton stores the cutover timestamp.
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.mdg_w14_activation/);
  assert.match(migration, /activation_cutover_at timestamptz/);
  // The cutover is initially NULL (no lead claimable until the operator sets it).
  assert.match(migration, /INSERT INTO public\.mdg_w14_activation[\s\S]*?NULL/);
});

test('migration backfill marks every pre-existing row not_applicable', () => {
  // All rows present at migration time are excluded from automatic fulfillment.
  assert.match(migration, /SET fulfillment_status = 'not_applicable',[\s\S]*?WHERE fulfillment_status IS NULL/);
});

test('mdg_w14_claim independently verifies the cutover (defense in depth)', () => {
  // The claim function reads the cutover and returns nothing while it is NULL.
  assert.match(migration, /SELECT activation_cutover_at INTO v_cutover[\s\S]*?FROM public\.mdg_w14_activation/);
  assert.match(migration, /IF v_cutover IS NULL THEN[\s\S]*?RETURN;/);
  // Eligibility requires received_at >= cutover, so an incorrectly marked
  // pre-cutover 'pending' row is still rejected by the claim function.
  assert.match(migration, /AND l\.received_at >= v_cutover/);
});

test('mdg_w14_activate_cutover is transactional, idempotent, and non-destructive', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.mdg_w14_activate_cutover/);
  // Requires operator identity + audited reason.
  assert.match(migration, /operator identity and an audited reason/);
  // Locks the singleton for the transaction.
  assert.match(migration, /FOR UPDATE/);
  // Idempotent: once set, reports already_active and changes nothing.
  assert.match(migration, /already_active/);
  // Never rewrites rows that already have an attempt or are claimed/sent.
  assert.match(migration, /l\.claimed_at IS NULL/);
  assert.match(migration, /l\.current_attempt_id IS NULL/);
  assert.match(migration, /NOT EXISTS \([\s\S]*?mdg_fulfillment_attempts a WHERE a\.lead_id = l\.id/);
});

test('mdg_w14_activate_cutover REVOKE EXECUTE FROM PUBLIC is unconditional', () => {
  const revokeLines = migration.split('\n').filter((l) => l.trim().startsWith('REVOKE EXECUTE'));
  const cutoverRevoke = revokeLines.find((l) => l.includes('mdg_w14_activate_cutover'));
  assert.ok(cutoverRevoke, 'activate_cutover must have a REVOKE EXECUTE statement');
  assert.doesNotMatch(cutoverRevoke, /IF EXISTS/i);
});
