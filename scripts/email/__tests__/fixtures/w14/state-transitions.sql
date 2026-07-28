-- Runs after the W14 migration inside a disposable PostgreSQL database.
-- Every address and source ID is synthetic; no network transport is involved.
\set ON_ERROR_STOP on

-- Cutover safety: while activation_cutover_at is NULL, NO lead is claimable for
-- automatic fulfillment, even a well-formed pending asset lead.
DO $test$
DECLARE
  n bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:cutover-null', 'w14-cutover-null@example.invalid',
          'maine_dispensary_roadmap_2026', t0 - interval '1 hour', 'pending');
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-cutover-null', t0);
  IF n <> 0 THEN RAISE EXCEPTION 'lead was claimable while activation cutover was null'; END IF;
  -- Isolate this pre-cutover row from later queue tests: it is received before
  -- the cutover that is about to be established, so it must never be claimed.
  -- Park it in manual_review (a state mdg_w14_claim never selects).
  UPDATE mdg_leads
  SET fulfillment_status = 'manual_review', next_attempt_at = NULL,
      manual_review_reason = 'synthetic_cutover_null_isolation'
  WHERE source_message_id = 'synthetic:cutover-null';
END
$test$;

-- Establish the activation cutover (operator-only, transactional, idempotent).
-- The cutover is set to "now"; every subsequent test row uses received_at =
-- clock_timestamp() (>= cutover) and is therefore post-cutover. The pre-existing
-- bootstrap row (30 days old) and the cutover-null row above are pre-cutover and
-- remain not_applicable.
SELECT * FROM mdg_w14_activate_cutover(
  'ops-disposable-suite',
  'Establish disposable-suite activation cutover for testing',
  now()
);

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

-- Cutover classification of EXISTING rows: a post-cutover asset lead is pending
-- and claimable; a post-cutover non-asset lead stays not_applicable; a recent
-- pre-cutover row is not_applicable and unclaimable; an incorrectly marked
-- pre-cutover 'pending' row is rejected by mdg_w14_claim (defense in depth).
DO $test$
DECLARE
  c record;
  n bigint;
  v_cutover timestamptz;
BEGIN
  SELECT activation_cutover_at INTO v_cutover FROM mdg_w14_activation WHERE singleton = true;
  IF v_cutover IS NULL THEN RAISE EXCEPTION 'cutover was not established'; END IF;

  -- A recent pre-cutover row (received just before the cutover) is excluded.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:recent-precutover', 'w14-recent-pre@example.invalid',
          'maine_dispensary_roadmap_2026', v_cutover - interval '1 second', 'not_applicable');
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-recent-pre', v_cutover + interval '5 seconds');
  -- The claim above must not have claimed the pre-cutover row.
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:recent-precutover' AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'recent pre-cutover row was not excluded'; END IF;

  -- An incorrectly marked pre-cutover 'pending' row is still rejected by claim.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:bad-precutover-pending', 'w14-bad-pre@example.invalid',
          'maine_dispensary_roadmap_2026', v_cutover - interval '2 seconds', 'pending');
  -- Drain any legitimately claimable post-cutover rows first, then confirm the
  -- bad pre-cutover row is never claimed.
  PERFORM * FROM mdg_w14_claim('worker-drain-1', v_cutover + interval '10 seconds');
  PERFORM * FROM mdg_w14_claim('worker-drain-2', v_cutover + interval '10 seconds');
  PERFORM * FROM mdg_w14_claim('worker-drain-3', v_cutover + interval '10 seconds');
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:bad-precutover-pending' AND fulfillment_status = 'pending';
  IF n <> 1 THEN RAISE EXCEPTION 'incorrectly marked pre-cutover pending row was claimed'; END IF;
END
$test$;

-- Post-cutover asset lead becomes pending and is claimable; post-cutover
-- non-asset lead stays not_applicable.
DO $test$
DECLARE
  c record;
  n bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at)
  VALUES ('synthetic:postcutover-asset', 'w14-post-asset@example.invalid',
          'maine_dispensary_roadmap_2026', t0);
  SELECT * INTO c FROM mdg_w14_claim('worker-post-asset', t0);
  IF c.source_message_id <> 'synthetic:postcutover-asset' THEN
    RAISE EXCEPTION 'post-cutover asset lead was not claimable';
  END IF;

  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:postcutover-nonasset', 'w14-post-nonasset@example.invalid', NULL, t0, 'not_applicable');
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:postcutover-nonasset' AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'post-cutover non-asset lead did not stay not_applicable'; END IF;
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-post-nonasset', t0);
  IF n <> 0 THEN RAISE EXCEPTION 'post-cutover non-asset lead was claimed'; END IF;
END
$test$;

-- The activation cutover is idempotent: re-running it reports already_active and
-- does not move the cutover or reclassify rows.
DO $test$
DECLARE
  r record;
  v_before timestamptz;
  v_after timestamptz;
BEGIN
  SELECT activation_cutover_at INTO v_before FROM mdg_w14_activation WHERE singleton = true;
  SELECT * INTO r FROM mdg_w14_activate_cutover(
    'ops-disposable-suite',
    'Second idempotent cutover call must change nothing',
    now()
  );
  IF NOT r.already_active THEN RAISE EXCEPTION 'cutover re-run was not idempotent'; END IF;
  IF r.made_pending <> 0 OR r.made_not_applicable <> 0 THEN
    RAISE EXCEPTION 'idempotent cutover re-run reclassified rows';
  END IF;
  SELECT activation_cutover_at INTO v_after FROM mdg_w14_activation WHERE singleton = true;
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'idempotent cutover re-run moved the cutover timestamp';
  END IF;
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
