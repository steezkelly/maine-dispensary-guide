'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/email/fulfillment-assets.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/email/w14-workflow-contract.json'), 'utf8'));
const migration = fs.readFileSync(path.join(ROOT, 'scripts/email/migrations/2026-07-27-w14-fulfillment-state-machine.sql'), 'utf8');
// R1 remediation migration: activation cutover + request-id idempotency. Applied
// AFTER the July 27 migration in production; the cutover/trigger/insert-function
// assertions below target this file.
const remediation = fs.readFileSync(path.join(ROOT, 'scripts/email/migrations/2026-07-28-w14-activation-cutover-request-id.sql'), 'utf8');

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

// --- activation cutover safety (R1 remediation migration) ---
// The historical July 27 migration is immutable and still contains the seven-day
// proxy (that is what production applied). The R1 remediation migration is the
// delivery mechanism: it is additive, independently idempotent, and applied
// AFTER July 27. These assertions target the remediation file.

test('remediation migration is additive, idempotent, and safe after July 27', () => {
  // Idempotent object creation.
  assert.match(remediation, /CREATE TABLE IF NOT EXISTS public\.mdg_w14_activation/);
  assert.match(remediation, /ON CONFLICT \(singleton\) DO NOTHING/);
  assert.match(remediation, /CREATE OR REPLACE FUNCTION public\.mdg_w14_activate_cutover/);
  assert.match(remediation, /CREATE OR REPLACE FUNCTION public\.mdg_w14_insert_lead/);
  assert.match(remediation, /DROP TRIGGER IF EXISTS mdg_leads_w14_classify_insert/);
  // Transactional.
  assert.match(remediation, /^BEGIN;/m);
  assert.match(remediation, /^COMMIT;/m);
});

test('remediation backfill excludes every pre-remediation unattempted row', () => {
  // Every unattempted row present at remediation time is set not_applicable
  // regardless of its current status; active/attempted rows are never touched.
  assert.match(remediation, /SET fulfillment_status = 'not_applicable',[\s\S]*?WHERE l\.fulfillment_status IN \('not_applicable', 'pending'\)/);
  assert.match(remediation, /AND NOT EXISTS \([\s\S]*?mdg_fulfillment_attempts a WHERE a\.lead_id = l\.id/);
});

test('BEFORE INSERT trigger classifies database-authoritatively and blocks on the cutover lock', () => {
  assert.match(remediation, /CREATE OR REPLACE FUNCTION public\.mdg_w14_classify_insert\(\)/);
  assert.match(remediation, /RETURNS trigger/);
  // FOR SHARE blocks behind mdg_w14_activate_cutover's FOR UPDATE singleton lock.
  assert.match(remediation, /FOR SHARE/);
  assert.match(remediation, /CREATE TRIGGER mdg_leads_w14_classify_insert[\s\S]*?BEFORE INSERT ON public\.mdg_leads/);
  // Classification rules: no asset / NULL cutover / pre-cutover -> not_applicable;
  // post-cutover asset -> pending. Caller status is overridden.
  assert.match(remediation, /NEW\.fulfillment_status := 'not_applicable'/);
  assert.match(remediation, /NEW\.fulfillment_status := 'pending'/);
  assert.match(remediation, /ELSIF NEW\.received_at < v_cutover THEN/);
});

test('mdg_w14_activate_cutover is transactional, idempotent, and non-destructive', () => {
  // Requires operator identity + audited reason.
  assert.match(remediation, /operator identity and an audited reason/);
  // Locks the singleton for the transaction (so concurrent inserts block).
  assert.match(remediation, /FOR UPDATE/);
  // Idempotent: once set, reports already_active and changes nothing.
  assert.match(remediation, /already_active/);
  // Never rewrites rows that already have an attempt or are claimed/sent.
  assert.match(remediation, /l\.claimed_at IS NULL/);
  assert.match(remediation, /l\.current_attempt_id IS NULL/);
});

test('mdg_w14_insert_lead fails closed on request-id reuse with different data', () => {
  assert.match(remediation, /CREATE OR REPLACE FUNCTION public\.mdg_w14_insert_lead/);
  // Exact replay returns the existing id.
  assert.match(remediation, /RETURN v_existing\.id/);
  // Mismatch raises a stable error and creates no row.
  assert.match(remediation, /RAISE EXCEPTION 'request_id_reuse_mismatch'/);
  // Immutable identity compared: normalized email, page_path, form_name,
  // promised_asset, transport_kind.
  assert.match(remediation, /lower\(btrim\(v_existing\.from_email\)\) = v_norm_email/);
  assert.match(remediation, /v_existing\.page_path/);
  assert.match(remediation, /v_existing\.form_name/);
  assert.match(remediation, /v_existing\.promised_asset/);
  assert.match(remediation, /v_existing\.transport_kind/);
  // source_message_id must equal 'api_post:' + request_id.
  assert.match(remediation, /source_message_id_request_id_mismatch/);
});

test('mdg_w14_claim independently verifies the cutover (defense in depth)', () => {
  // R1 supersedes mdg_w14_claim (same signature) to independently verify the
  // cutover and received_at >= cutover.
  assert.match(remediation, /CREATE OR REPLACE FUNCTION public\.mdg_w14_claim\(/);
  assert.match(remediation, /SELECT activation_cutover_at INTO v_cutover[\s\S]*?FROM public\.mdg_w14_activation/);
  assert.match(remediation, /IF v_cutover IS NULL THEN[\s\S]*?RETURN;/);
  // Eligibility requires received_at >= cutover, so an incorrectly marked
  // pre-cutover 'pending' row is still rejected by the claim function.
  assert.match(remediation, /AND l\.received_at >= v_cutover/);
  // Single-row SKIP LOCKED claim semantics preserved.
  assert.match(remediation, /FOR UPDATE SKIP LOCKED/);
});

test('remediation REVOKE EXECUTE FROM PUBLIC is unconditional', () => {
  const revokeLines = remediation.split('\n').filter((l) => l.trim().startsWith('REVOKE EXECUTE'));
  for (const fn of ['mdg_w14_claim', 'mdg_w14_activate_cutover', 'mdg_w14_insert_lead']) {
    const line = revokeLines.find((l) => l.includes(fn));
    assert.ok(line, `${fn} must have a REVOKE EXECUTE statement`);
    assert.doesNotMatch(line, /IF EXISTS/i);
  }
});
