-- Runs after the W14 migration inside a disposable PostgreSQL database.
-- Every address and source ID is synthetic; no network transport is involved.
\set ON_ERROR_STOP on

DO $test$
DECLARE
  c record;
  p record;
  state text;
  n bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  -- Non-asset forms are durable leads but never enter the fulfillment queue.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:not-applicable', 'w14-na@example.invalid', NULL, t0, 'not_applicable');
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-na', t0);
  IF n <> 0 THEN RAISE EXCEPTION 'not-applicable lead entered fulfillment queue'; END IF;

  -- A malformed pending record is reviewable, including across a stale pre-send claim.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:malformed-stale', 'w14-malformed-stale@example.invalid', NULL, t0, 'pending');
  SELECT * INTO c FROM mdg_w14_claim('worker-malformed-stale', t0);
  PERFORM mdg_w14_reconcile_stale(interval '15 minutes', interval '15 minutes', t0 + interval '1 hour');
  SELECT count(*) INTO n FROM mdg_leads
  WHERE id=c.lead_id AND fulfillment_status='manual_review'
    AND last_error_code='MISSING_PROMISED_ASSET';
  IF n <> 1 THEN RAISE EXCEPTION 'stale malformed claim did not route to review'; END IF;

  -- Success + duplicate execution no-op.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:success', 'w14-success@example.invalid', 'maine_dispensary_roadmap_2026', t0);
  SELECT * INTO c FROM mdg_w14_claim('worker-success', t0);
  IF c.source_message_id <> 'synthetic:success' THEN RAISE EXCEPTION 'success claim failed'; END IF;
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-success', t0);
  IF NOT p.ready OR p.outbound_message_id <> format('<mdg-w14-%s-a1@mainedispensaryguide.com>', c.lead_id) THEN
    RAISE EXCEPTION 'deterministic prepare failed';
  END IF;
  IF NOT mdg_w14_mark_success(c.lead_id, p.attempt_id, 'provider-synthetic-1', t0 + interval '1 second') THEN
    RAISE EXCEPTION 'success transition failed';
  END IF;
  IF mdg_w14_mark_success(c.lead_id, p.attempt_id, 'provider-duplicate', t0 + interval '2 seconds') THEN
    RAISE EXCEPTION 'duplicate success unexpectedly changed state';
  END IF;

  -- Retryable pre-acceptance failure schedules attempt 2 after ~5m.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:retry', 'w14-retry@example.invalid', 'maine_cannabis_founders_bible_2026', t0 + interval '1 second');
  SELECT * INTO c FROM mdg_w14_claim('worker-retry', t0 + interval '1 second');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-retry', t0 + interval '1 second');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'retryable_pre_acceptance', 'ECONNREFUSED', 'CONN', t0 + interval '2 seconds');
  IF state <> 'retryable_failure' THEN RAISE EXCEPTION 'retryable classification failed'; END IF;
  SELECT count(*) INTO n FROM mdg_leads WHERE id=c.lead_id AND next_attempt_at > t0 + interval '5 minutes';
  IF n <> 1 THEN RAISE EXCEPTION 'retry schedule failed'; END IF;
  -- Keep this isolated case out of later queue-order tests.
  UPDATE mdg_leads
  SET fulfillment_status='manual_review', next_attempt_at=NULL,
      manual_review_reason='synthetic_fixture_isolation'
  WHERE id=c.lead_id;

  -- Permanent rejection is terminal.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:terminal', 'w14-terminal@example.invalid', 'maine_first_timer_field_guide', t0 + interval '2 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-terminal', t0 + interval '2 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-terminal', t0 + interval '2 seconds');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'terminal', 'SMTP_550', 'RCPT_TO', t0 + interval '3 seconds');
  IF state <> 'terminal_failure' THEN RAISE EXCEPTION 'terminal classification failed'; END IF;

  -- Possible provider acceptance is manual review and never auto-retry.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:uncertain', 'w14-uncertain@example.invalid', 'maine_metrc_reconciliation_checklist', t0 + interval '3 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-uncertain', t0 + interval '3 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-uncertain', t0 + interval '3 seconds');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'uncertain', 'SOCKET_CLOSED', 'DATA', t0 + interval '4 seconds');
  IF state <> 'manual_review' THEN RAISE EXCEPTION 'uncertain classification failed'; END IF;

  -- Unknown asset and malformed recipient never reach a sending attempt.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:unknown', 'w14-unknown@example.invalid', 'not_allowlisted', t0 + interval '4 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-unknown', t0 + interval '4 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-unknown', t0 + interval '4 seconds');
  IF p.ready OR p.error_code <> 'UNKNOWN_ASSET' THEN RAISE EXCEPTION 'unknown asset did not fail closed'; END IF;

  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:bad-email', '', 'maine_dispensary_compliance_self_assessment', t0 + interval '5 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-bad-email', t0 + interval '5 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-bad-email', t0 + interval '5 seconds');
  IF p.ready OR p.error_code <> 'MALFORMED_RECIPIENT' THEN RAISE EXCEPTION 'malformed recipient did not fail closed'; END IF;

  -- Three provider submissions maximum; third retryable failure -> review.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:max', 'w14-max@example.invalid', 'maine_cannabis_industry_report_q3_2026', t0 + interval '6 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-max-1', t0 + interval '6 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-max-1', t0 + interval '6 seconds');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'retryable_pre_acceptance', 'EAI_AGAIN', 'CONN', t0 + interval '7 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-max-2', t0 + interval '1 hour');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-max-2', t0 + interval '1 hour');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'retryable_pre_acceptance', 'SMTP_451', 'RCPT_TO', t0 + interval '1 hour 1 second');
  SELECT * INTO c FROM mdg_w14_claim('worker-max-3', t0 + interval '2 hours');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-max-3', t0 + interval '2 hours');
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'retryable_pre_acceptance', 'ETIMEDOUT', 'CONN', t0 + interval '2 hours 1 second');
  IF state <> 'manual_review' THEN RAISE EXCEPTION 'maximum attempts did not enter manual review'; END IF;

  -- Stale claimed is safe to release; stale sending is uncertain/manual review.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:stale-claim', 'w14-stale-claim@example.invalid', 'maine_dispensary_roadmap_2026', t0 + interval '7 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-stale-claim', t0 + interval '7 seconds');
  PERFORM * FROM mdg_w14_reconcile_stale(interval '15 minutes', interval '15 minutes', t0 + interval '31 minutes');
  SELECT count(*) INTO n FROM mdg_leads WHERE id=c.lead_id AND fulfillment_status='retryable_failure';
  IF n <> 1 THEN RAISE EXCEPTION 'stale claim not safely released'; END IF;

  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:stale-send', 'w14-stale-send@example.invalid', 'maine_dispensary_roadmap_2026', t0 + interval '8 seconds');
  SELECT * INTO c FROM mdg_w14_claim('worker-stale-send', t0 + interval '8 seconds');
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-stale-send', t0 + interval '8 seconds');
  PERFORM * FROM mdg_w14_reconcile_stale(interval '15 minutes', interval '15 minutes', t0 + interval '31 minutes');
  SELECT count(*) INTO n FROM mdg_leads WHERE id=c.lead_id AND fulfillment_status='manual_review' AND next_attempt_at IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'stale sending was not quarantined'; END IF;
END
$test$;

-- Source-message idempotency must reject a duplicate durable source ID.
DO $test$
BEGIN
  BEGIN
    INSERT INTO mdg_leads(source_message_id, from_email, promised_asset)
    VALUES ('synthetic:success', 'w14-duplicate@example.invalid', 'maine_dispensary_roadmap_2026');
    RAISE EXCEPTION 'duplicate source_message_id unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$test$;

-- Null/blank source_message_id rows must never be claimed.
DO $test$
DECLARE
  n bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES (NULL, 'w14-null-sid@example.invalid', 'maine_dispensary_roadmap_2026', t0, 'pending');
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('', 'w14-blank-sid@example.invalid', 'maine_dispensary_roadmap_2026', t0, 'pending');
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-null-sid', t0);
  IF n <> 0 THEN RAISE EXCEPTION 'null/blank source_message_id was claimed'; END IF;
END
$test$;

-- Authentication failure routes immediately to manual review.
DO $test$
DECLARE
  c record;
  p record;
  state text;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:auth-fail', 'w14-auth@example.invalid', 'maine_dispensary_roadmap_2026', t0);
  SELECT * INTO c FROM mdg_w14_claim('worker-auth', t0);
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-auth', t0);
  state := mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'authentication', 'SMTP_535', 'AUTH', t0 + interval '1 second');
  IF state <> 'manual_review' THEN RAISE EXCEPTION 'authentication failure did not route to manual_review'; END IF;
END
$test$;

-- Operator resend is audited on the lead row even when no attempt exists.
DO $test$
DECLARE
  c record;
  ok boolean;
  n bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status, manual_review_reason)
  VALUES ('synthetic:resend-no-attempt', 'w14-resend@example.invalid', 'maine_dispensary_roadmap_2026', t0, 'manual_review', 'unknown_or_inactive_asset');
  SELECT id INTO c FROM mdg_leads WHERE source_message_id = 'synthetic:resend-no-attempt';
  ok := mdg_w14_authorize_resend(c.id, 'ops-admin', 'Verified asset reactivated after review', t0);
  IF NOT ok THEN RAISE EXCEPTION 'operator resend failed'; END IF;
  SELECT count(*) INTO n FROM mdg_leads
  WHERE id = c.id AND operator_resend_by = 'ops-admin'
    AND operator_resend_reason = 'Verified asset reactivated after review'
    AND fulfillment_status = 'retryable_failure';
  IF n <> 1 THEN RAISE EXCEPTION 'operator resend audit not persisted on lead row'; END IF;
END
$test$;

-- PII guard: operator fields containing email addresses are rejected.
DO $test$
DECLARE
  c record;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status, manual_review_reason)
  VALUES ('synthetic:pii-canary', 'w14-pii@example.invalid', 'maine_dispensary_roadmap_2026', t0, 'manual_review', 'test');
  SELECT id INTO c FROM mdg_leads WHERE source_message_id = 'synthetic:pii-canary';
  BEGIN
    PERFORM mdg_w14_authorize_resend(c.id, 'admin@example.com', 'Reason with email leak', t0);
    RAISE EXCEPTION 'PII canary: operator email address was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$test$;

-- Historical rows (older than 7 days) are not backfilled to pending.
-- The bootstrap fixture inserts a 30-day-old row before the migration runs;
-- the migration backfill must have marked it not_applicable.
DO $test$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:historical' AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'historical row was backfilled to pending'; END IF;
END
$test$;

SELECT
  count(*) FILTER (WHERE fulfillment_status='fulfilled') AS fulfilled,
  count(*) FILTER (WHERE fulfillment_status='retryable_failure') AS retryable_failure,
  count(*) FILTER (WHERE fulfillment_status='terminal_failure') AS terminal_failure,
  count(*) FILTER (WHERE fulfillment_status='manual_review') AS manual_review,
  count(*) FILTER (WHERE fulfillment_status='not_applicable') AS not_applicable,
  count(*) AS synthetic_rows
FROM mdg_leads;
