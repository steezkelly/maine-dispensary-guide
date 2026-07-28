-- W14 state-transition suite for the TWO-MIGRATION production path.
-- The harness applies, in production order:
--   1. 2026-07-27-w14-fulfillment-state-machine.sql (original; immutable)
--   2. 2026-07-28-w14-activation-cutover-request-id.sql (R1 remediation)
--   3. the R1 remediation again (idempotency)
-- Every address and source ID is synthetic; no network transport is involved.
\set ON_ERROR_STOP on

-- Cutover safety: while activation_cutover_at is NULL, NO lead is claimable for
-- automatic fulfillment, even a well-formed pending asset lead inserted via the
-- fail-closed insert function.
DO $test$
DECLARE
  n bigint;
  v_id bigint;
BEGIN
  v_id := mdg_w14_insert_lead(
    'api_post:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'w14-cutover-null@example.invalid', NULL, NULL, NULL,
    'maine_dispensary_roadmap_2026', NULL, now(), '/download-checklist',
    NULL, NULL, NULL, NULL, 'api_post', NULL, NULL, NULL,
    'cutover_null_form', NULL, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  -- Trigger classified it not_applicable (cutover NULL).
  SELECT count(*) INTO n FROM mdg_leads
  WHERE id = v_id AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'insert while cutover NULL was not not_applicable'; END IF;
  -- Nothing is claimable while the cutover is NULL.
  SELECT count(*) INTO n FROM mdg_w14_claim('worker-cutover-null', now());
  IF n <> 0 THEN RAISE EXCEPTION 'lead was claimable while activation cutover was null'; END IF;
END
$test$;

-- Establish the activation cutover (operator-only, transactional, idempotent).
SELECT * FROM mdg_w14_activate_cutover(
  'ops-disposable-suite',
  'Establish disposable-suite activation cutover for testing',
  now()
);

-- Full lifecycle on a post-cutover asset lead inserted via the fail-closed
-- function: pending -> claimed -> sending -> fulfilled.
DO $test$
DECLARE
  c record;
  p record;
  state text;
  n bigint;
  v_id bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  v_id := mdg_w14_insert_lead(
    'api_post:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'w14-lifecycle@example.invalid', NULL, NULL, NULL,
    'maine_dispensary_roadmap_2026', NULL, t0, '/download-checklist',
    NULL, NULL, NULL, NULL, 'api_post', NULL, NULL, NULL,
    'lifecycle_form', NULL, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  -- Post-cutover asset lead is pending and claimable.
  SELECT * INTO c FROM mdg_w14_claim('worker-lifecycle', t0);
  IF c.lead_id <> v_id THEN RAISE EXCEPTION 'post-cutover asset lead was not claimed'; END IF;

  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-lifecycle', t0);
  IF NOT p.ready THEN RAISE EXCEPTION 'prepare_send was not ready for an active asset'; END IF;

  PERFORM * FROM mdg_w14_mark_success(c.lead_id, p.attempt_id, 'provider-msg-1', t0);
  SELECT fulfillment_status INTO state FROM mdg_leads WHERE id = c.lead_id;
  IF state <> 'fulfilled' THEN RAISE EXCEPTION 'expected fulfilled, got %', state; END IF;
END
$test$;

-- Failure paths: (a) retryable_pre_acceptance exhausts the three-attempt cap and
-- lands in manual_review; (b) a terminal failure class lands in terminal_failure.
DO $test$
DECLARE
  c record;
  p record;
  state text;
  v_id bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  -- (a) Three retryable pre-acceptance failures -> manual_review (cap reached).
  v_id := mdg_w14_insert_lead(
    'api_post:cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'w14-retryable@example.invalid', NULL, NULL, NULL,
    'maine_dispensary_roadmap_2026', NULL, t0, '/download-checklist',
    NULL, NULL, NULL, NULL, 'api_post', NULL, NULL, NULL,
    'retryable_form', NULL, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  FOR i IN 1..3 LOOP
    SELECT * INTO c FROM mdg_w14_claim('worker-retryable', t0 + (i * 40 || ' minutes')::interval);
    IF c.lead_id IS NULL THEN RAISE EXCEPTION 'expected a claim on retryable attempt %', i; END IF;
    SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-retryable', t0);
    PERFORM * FROM mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'retryable_pre_acceptance', 'smtp_connect_timeout', 'connect', t0);
  END LOOP;
  SELECT fulfillment_status INTO state FROM mdg_leads WHERE id = v_id;
  IF state <> 'manual_review' THEN RAISE EXCEPTION 'expected manual_review after cap, got %', state; END IF;

  -- (b) A terminal failure class -> terminal_failure immediately.
  v_id := mdg_w14_insert_lead(
    'api_post:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'w14-terminal@example.invalid', NULL, NULL, NULL,
    'maine_dispensary_roadmap_2026', NULL, t0, '/download-checklist',
    NULL, NULL, NULL, NULL, 'api_post', NULL, NULL, NULL,
    'terminal_form', NULL, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  SELECT * INTO c FROM mdg_w14_claim('worker-terminal', t0);
  SELECT * INTO p FROM mdg_w14_prepare_send(c.lead_id, 'worker-terminal', t0);
  PERFORM * FROM mdg_w14_mark_failure(c.lead_id, p.attempt_id, 'terminal', 'smtp_550_rejected', 'data', t0);
  SELECT fulfillment_status INTO state FROM mdg_leads WHERE id = v_id;
  IF state <> 'terminal_failure' THEN RAISE EXCEPTION 'expected terminal_failure, got %', state; END IF;
END
$test$;

-- Non-asset lead stays not_applicable and is never claimable.
DO $test$
DECLARE
  n bigint;
  v_id bigint;
  t0 timestamptz := clock_timestamp();
BEGIN
  v_id := mdg_w14_insert_lead(
    'api_post:dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'w14-nonasset@example.invalid', NULL, NULL, NULL,
    NULL, NULL, t0, '/contact', NULL, NULL, NULL, NULL,
    'api_post', NULL, NULL, NULL, 'contact_form', NULL,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  SELECT count(*) INTO n FROM mdg_leads WHERE id = v_id AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'non-asset lead did not stay not_applicable'; END IF;
END
$test$;

-- Cutover classification of EXISTING rows + defense in depth.
DO $test$
DECLARE
  n bigint;
  v_cutover timestamptz;
BEGIN
  SELECT activation_cutover_at INTO v_cutover FROM mdg_w14_activation WHERE singleton = true;
  IF v_cutover IS NULL THEN RAISE EXCEPTION 'cutover was not established'; END IF;

  -- A recent pre-cutover row (received just before the cutover) is excluded and
  -- never claimed, even though it carries an asset. A raw INSERT with a
  -- caller-supplied 'pending' is reclassified not_applicable by the trigger.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:recent-precutover', 'w14-recent-pre@example.invalid',
          'maine_dispensary_roadmap_2026', v_cutover - interval '1 second', 'pending');
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:recent-precutover' AND fulfillment_status = 'not_applicable';
  IF n <> 1 THEN RAISE EXCEPTION 'recent pre-cutover row was not reclassified not_applicable by the trigger'; END IF;

  -- Defense in depth at the claim boundary: create a genuinely mis-marked
  -- pre-cutover 'pending' row via UPDATE (which bypasses the INSERT trigger),
  -- then confirm mdg_w14_claim rejects it via received_at >= cutover.
  INSERT INTO mdg_leads(source_message_id, from_email, promised_asset, received_at, fulfillment_status)
  VALUES ('synthetic:bad-precutover-pending', 'w14-bad-pre@example.invalid',
          'maine_dispensary_roadmap_2026', v_cutover - interval '2 seconds', 'not_applicable');
  UPDATE mdg_leads
  SET fulfillment_status = 'pending', next_attempt_at = v_cutover - interval '2 seconds'
  WHERE source_message_id = 'synthetic:bad-precutover-pending';
  PERFORM * FROM mdg_w14_claim('worker-drain-1', v_cutover + interval '10 seconds');
  PERFORM * FROM mdg_w14_claim('worker-drain-2', v_cutover + interval '10 seconds');
  PERFORM * FROM mdg_w14_claim('worker-drain-3', v_cutover + interval '10 seconds');
  SELECT count(*) INTO n FROM mdg_leads
  WHERE source_message_id = 'synthetic:bad-precutover-pending' AND fulfillment_status = 'pending';
  IF n <> 1 THEN RAISE EXCEPTION 'incorrectly marked pre-cutover pending row was claimed'; END IF;
END
$test$;

-- The activation cutover is idempotent: re-running reports already_active and
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
  count(*) FILTER (WHERE fulfillment_status='terminal_failure') AS terminal_failure,
  count(*) FILTER (WHERE fulfillment_status='not_applicable') AS not_applicable,
  count(*) AS total_rows
FROM mdg_leads;
