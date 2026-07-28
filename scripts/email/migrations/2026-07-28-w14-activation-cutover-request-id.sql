-- MDG-W14-001 R1 remediation: activation cutover + request-id idempotency.
-- PostgreSQL 15+. ADDITIVE and independently idempotent. Safe to apply AFTER the
-- original 2026-07-27 W14 state-machine migration on an already-migrated
-- production database. The historical 2026-07-27 migration is immutable and is
-- NOT the delivery mechanism for this remediation.
--
-- This migration:
--   * adds the activation-control singleton (cutover initially NULL);
--   * excludes every pre-remediation unattempted row from automatic fulfillment;
--   * makes the database insertion boundary participate in the cutover lock via
--     a BEFORE INSERT trigger (database-authoritative classification);
--   * adds an operator-only cutover establishment function;
--   * adds a restricted, fail-closed idempotent insert function keyed on the
--     client request_id (exact replay returns the existing id; reuse with
--     different immutable request data fails closed).
-- No credential material, no hard deletes, no historical reconstruction.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Activation-control singleton.
--    activation_cutover_at is initially NULL: while NULL, no lead is claimable
--    for automatic fulfillment (mdg_w14_claim verifies this independently, and
--    the BEFORE INSERT trigger classifies new rows not_applicable). Exactly one
--    row may exist (singleton PRIMARY KEY constrained to TRUE). No recipient or
--    credential data is stored here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mdg_w14_activation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  activation_cutover_at timestamptz,
  established_by text,
  established_at timestamptz,
  established_reason text
);

INSERT INTO public.mdg_w14_activation (singleton, activation_cutover_at)
VALUES (true, NULL)
ON CONFLICT (singleton) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Remediation backfill: exclude every pre-remediation UNATTEMPTED row from
--    automatic fulfillment. The original 2026-07-27 migration used a seven-day
--    proxy that could leave recent pre-W14 rows 'pending'; while W13 stays live
--    between a zero-row checkpoint and activation, such a row could be
--    auto-emailed after activation. Here, every row that already exists and has
--    never been attempted is set to not_applicable regardless of its current
--    status. Rows already claimed/sending/fulfilled/terminal/manual_review or
--    with an existing attempt are NEVER rewritten. Idempotent: on re-run the
--    eligible set is empty (rows are already not_applicable with no attempt).
-- ---------------------------------------------------------------------------
UPDATE public.mdg_leads l
SET fulfillment_status = 'not_applicable',
    next_attempt_at = NULL,
    status_updated_at = now()
WHERE l.fulfillment_status IN ('not_applicable', 'pending')
  AND l.fulfilled_at IS NULL
  AND l.claimed_at IS NULL
  AND l.current_attempt_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.mdg_fulfillment_attempts a WHERE a.lead_id = l.id
  );

-- ---------------------------------------------------------------------------
-- 3. Database-authoritative classification trigger.
--    The insertion boundary participates in the cutover lock. The trigger reads
--    the singleton with FOR SHARE, which blocks behind mdg_w14_activate_cutover
--    while that function holds its FOR UPDATE singleton-row lock. After the
--    cutover transaction commits, the trigger classifies the new row using the
--    committed cutover timestamp and OVERRIDES any unsafe caller-supplied
--    fulfillment_status:
--      * no promised asset            -> not_applicable
--      * cutover NULL                 -> not_applicable
--      * received_at before cutover   -> not_applicable
--      * received_at >= cutover + asset -> pending
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mdg_w14_classify_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cutover timestamptz;
BEGIN
  -- FOR SHARE blocks behind mdg_w14_activate_cutover's FOR UPDATE lock, so an
  -- insert that races the cutover waits until the cutover commits, then reads
  -- the committed timestamp.
  SELECT activation_cutover_at INTO v_cutover
  FROM public.mdg_w14_activation
  WHERE singleton = true
  FOR SHARE;

  IF NOT FOUND THEN
    -- Fail closed: no control row means no safe classification.
    RAISE EXCEPTION 'W14 activation control row is missing; run the migration first';
  END IF;

  IF NULLIF(btrim(NEW.promised_asset), '') IS NULL THEN
    NEW.fulfillment_status := 'not_applicable';
    NEW.next_attempt_at := NULL;
  ELSIF v_cutover IS NULL THEN
    NEW.fulfillment_status := 'not_applicable';
    NEW.next_attempt_at := NULL;
  ELSIF NEW.received_at < v_cutover THEN
    NEW.fulfillment_status := 'not_applicable';
    NEW.next_attempt_at := NULL;
  ELSE
    NEW.fulfillment_status := 'pending';
    NEW.next_attempt_at := COALESCE(NEW.next_attempt_at, v_cutover);
  END IF;

  NEW.status_updated_at := now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS mdg_leads_w14_classify_insert ON public.mdg_leads;
CREATE TRIGGER mdg_leads_w14_classify_insert
  BEFORE INSERT ON public.mdg_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.mdg_w14_classify_insert();

-- ---------------------------------------------------------------------------
-- 4. Claim defense in depth. Supersedes the July 27 mdg_w14_claim (same
--    signature; CREATE OR REPLACE) to independently verify the activation
--    cutover and received_at >= cutover. While the cutover is NULL, no lead is
--    claimable. An incorrectly marked pre-cutover 'pending' row is rejected here
--    regardless of its stored status. All other claim semantics (FOR UPDATE
--    SKIP LOCKED, single row, worker identity) are preserved from July 27.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mdg_w14_claim(
  p_worker text,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  lead_id bigint,
  source_message_id text,
  recipient_email text,
  promised_asset text,
  attempt_count integer,
  claimed_at timestamptz
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cutover timestamptz;
BEGIN
  IF p_worker IS NULL OR btrim(p_worker) = '' THEN
    RAISE EXCEPTION 'worker identity is required';
  END IF;

  -- Defense in depth: independently verify the activation cutover. While the
  -- cutover is NULL, no lead is claimable for automatic fulfillment. A lead is
  -- eligible only if it was received at or after the cutover.
  SELECT activation_cutover_at INTO v_cutover
  FROM public.mdg_w14_activation
  WHERE singleton = true;

  IF v_cutover IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT l.id
    FROM public.mdg_leads l
    WHERE l.fulfillment_status IN ('pending', 'retryable_failure')
      AND l.fulfilled_at IS NULL
      AND NULLIF(btrim(l.source_message_id), '') IS NOT NULL
      AND l.received_at >= v_cutover
      AND COALESCE(l.next_attempt_at, p_now) <= p_now
    ORDER BY COALESCE(l.next_attempt_at, l.received_at, p_now), l.id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ), claimed AS (
    UPDATE public.mdg_leads l
    SET fulfillment_status = 'claimed',
        claimed_at = p_now,
        claimed_by = p_worker,
        status_updated_at = p_now,
        last_error_code = NULL,
        manual_review_reason = NULL
    FROM candidate c
    WHERE l.id = c.id
    RETURNING l.id, l.source_message_id, l.from_email, l.promised_asset,
              l.attempt_count, l.claimed_at
  )
  SELECT c.id::bigint, c.source_message_id, c.from_email, c.promised_asset,
         c.attempt_count, c.claimed_at
  FROM claimed c;
END
$function$;

-- ---------------------------------------------------------------------------
-- 5. Operator-only cutover establishment. Transactional and idempotent. Locks
--    the singleton FOR UPDATE (so concurrent inserts block on the trigger's
--    FOR SHARE until this commits), then safely classifies existing UNATTEMPTED
--    rows: post-cutover asset leads -> pending; pre-cutover -> not_applicable.
--    Never rewrites claimed/sending/fulfilled/terminal/manual_review rows or
--    rows with an existing attempt. Once a cutover is set it cannot be moved or
--    cleared by re-running (already_active path changes nothing).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mdg_w14_activate_cutover(
  p_operator text,
  p_reason text,
  p_cutover_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  cutover_at timestamptz,
  made_pending bigint,
  made_not_applicable bigint,
  already_active boolean
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_existing timestamptz;
  v_pending bigint;
  v_not_applicable bigint;
BEGIN
  IF p_operator IS NULL OR btrim(p_operator) = '' OR
     p_reason IS NULL OR length(btrim(p_reason)) < 12 THEN
    RAISE EXCEPTION 'operator identity and an audited reason (>=12 chars) are required';
  END IF;

  IF p_cutover_at IS NULL THEN
    RAISE EXCEPTION 'activation cutover timestamp is required';
  END IF;

  -- Lock the singleton for the duration of the transaction. Concurrent inserts
  -- (trigger FOR SHARE) block here until this transaction commits.
  SELECT activation_cutover_at INTO v_existing
  FROM public.mdg_w14_activation
  WHERE singleton = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'W14 activation control row is missing; run the migration first';
  END IF;

  IF v_existing IS NOT NULL THEN
    -- Idempotent: report the established cutover and change nothing.
    RETURN QUERY SELECT v_existing, 0::bigint, 0::bigint, true;
    RETURN;
  END IF;

  UPDATE public.mdg_w14_activation
  SET activation_cutover_at = p_cutover_at,
      established_by = left(p_operator, 128),
      established_at = now(),
      established_reason = left(p_reason, 1000)
  WHERE singleton = true;

  -- Promote unattempted asset leads received at or after the cutover to
  -- pending. Unattempted = no attempt row and never claimed/sent.
  WITH eligible AS (
    UPDATE public.mdg_leads l
    SET fulfillment_status = 'pending',
        next_attempt_at = COALESCE(l.next_attempt_at, p_cutover_at),
        status_updated_at = now()
    WHERE l.fulfillment_status IN ('not_applicable', 'pending')
      AND l.received_at >= p_cutover_at
      AND NULLIF(btrim(l.promised_asset), '') IS NOT NULL
      AND l.fulfilled_at IS NULL
      AND l.claimed_at IS NULL
      AND l.current_attempt_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.mdg_fulfillment_attempts a WHERE a.lead_id = l.id
      )
    RETURNING l.id
  )
  SELECT count(*) INTO v_pending FROM eligible;

  -- Everything else still unattempted and received before the cutover is
  -- excluded from automatic fulfillment.
  WITH excluded AS (
    UPDATE public.mdg_leads l
    SET fulfillment_status = 'not_applicable',
        next_attempt_at = NULL,
        status_updated_at = now()
    WHERE l.fulfillment_status IN ('not_applicable', 'pending')
      AND l.received_at < p_cutover_at
      AND l.fulfilled_at IS NULL
      AND l.claimed_at IS NULL
      AND l.current_attempt_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.mdg_fulfillment_attempts a WHERE a.lead_id = l.id
      )
    RETURNING l.id
  )
  SELECT count(*) INTO v_not_applicable FROM excluded;

  RETURN QUERY SELECT p_cutover_at, v_pending, v_not_applicable, false;
END
$function$;

-- ---------------------------------------------------------------------------
-- 6. Restricted, fail-closed idempotent insert keyed on the client request_id.
--    source_message_id = 'api_post:' + request_id (no PII). Behavior:
--      * exact replay (same request_id AND same immutable request identity:
--        normalized email, page_path, form_name, promised_asset,
--        transport_kind) -> returns the existing lead id; creates no row;
--        changes no fulfillment state; creates no attempt;
--      * same request_id with DIFFERENT immutable request data -> fails closed
--        with a stable error; creates no row; mutates no existing row;
--      * new request_id -> inserts normally (the BEFORE INSERT trigger
--        classifies fulfillment_status database-authoritatively).
--    The trigger fires on the INSERT and overrides the caller-supplied
--    fulfillment_status, so the caller value is intentionally ignored.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mdg_w14_insert_lead(
  p_source_message_id text,
  p_from_email text,
  p_from_name text,
  p_subject text,
  p_lead_type text,
  p_promised_asset text,
  p_message_body text,
  p_received_at timestamptz,
  p_page_path text,
  p_referrer text,
  p_user_agent text,
  p_consent_ts timestamptz,
  p_asset_id text,
  p_transport_kind text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_form_name text,
  p_success_path text,
  p_request_id text
)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_existing record;
  v_norm_email text;
  v_id bigint;
BEGIN
  IF p_source_message_id IS NULL OR btrim(p_source_message_id) = '' THEN
    RAISE EXCEPTION 'missing_source_message_id';
  END IF;
  IF p_request_id IS NULL OR btrim(p_request_id) = '' THEN
    RAISE EXCEPTION 'missing_request_id';
  END IF;
  IF p_source_message_id <> 'api_post:' || p_request_id THEN
    RAISE EXCEPTION 'source_message_id_request_id_mismatch';
  END IF;
  IF p_from_email IS NULL OR btrim(p_from_email) = '' THEN
    RAISE EXCEPTION 'missing_required';
  END IF;

  v_norm_email := lower(btrim(p_from_email));

  -- Idempotency-key resolution. An existing row for this source_message_id may
  -- be returned as success ONLY when the immutable request identity matches.
  SELECT l.id, l.from_email, l.page_path, l.form_name, l.promised_asset,
         l.transport_kind
    INTO v_existing
  FROM public.mdg_leads l
  WHERE l.source_message_id = p_source_message_id;

  IF FOUND THEN
    IF lower(btrim(v_existing.from_email)) = v_norm_email
       AND COALESCE(v_existing.page_path, '') = COALESCE(p_page_path, '')
       AND COALESCE(v_existing.form_name, '') = COALESCE(p_form_name, '')
       AND COALESCE(v_existing.promised_asset, '') = COALESCE(p_promised_asset, '')
       AND COALESCE(v_existing.transport_kind, '') = COALESCE(p_transport_kind, '') THEN
      -- Exact replay: return the existing id; no row, no state change, no
      -- attempt.
      RETURN v_existing.id;
    END IF;
    -- Same request_id, different immutable request data: fail closed. Do not
    -- return the unrelated existing lead, do not create a row, do not mutate.
    RAISE EXCEPTION 'request_id_reuse_mismatch';
  END IF;

  -- New request_id: insert normally. The BEFORE INSERT trigger classifies
  -- fulfillment_status database-authoritatively (caller value ignored).
  INSERT INTO public.mdg_leads (
    source_message_id, from_email, from_name, subject, lead_type, promised_asset,
    message_body, received_at, page_path, referrer, user_agent, consent_ts,
    asset_id, transport_kind, utm_source, utm_medium, utm_campaign, form_name,
    success_path, fulfillment_status
  ) VALUES (
    p_source_message_id, p_from_email, p_from_name, p_subject, p_lead_type,
    p_promised_asset, p_message_body, p_received_at, p_page_path, p_referrer,
    p_user_agent, p_consent_ts, p_asset_id, p_transport_kind, p_utm_source,
    p_utm_medium, p_utm_campaign, p_form_name, p_success_path, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$function$;

-- ---------------------------------------------------------------------------
-- 7. Privilege boundary. REVOKE is unconditional; GRANT is conditional on the
--    n8n role existing. PUBLIC must not call these functions directly.
--
--    Documented exception: mdg_w14_classify_insert is NOT revoked from PUBLIC.
--    A BEFORE INSERT trigger function MUST be executable by whichever role
--    performs the INSERT, and this function can only set fulfillment_status /
--    next_attempt_at / status_updated_at on the row being inserted — it cannot
--    send email, create attempts, or touch any other row. Revoking it would
--    break every lead insert. All state-changing functions below are revoked.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.mdg_w14_claim(text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_activate_cutover(text, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_insert_lead(text, text, text, text, text, text, text, timestamptz, text, text, text, timestamptz, text, text, text, text, text, text, text, text) FROM PUBLIC;

DO $w14r1$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n') THEN
    GRANT EXECUTE ON FUNCTION public.mdg_w14_claim(text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_activate_cutover(text, text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_insert_lead(text, text, text, text, text, text, text, timestamptz, text, text, text, timestamptz, text, text, text, text, text, text, text, text) TO n8n;
  END IF;
END
$w14r1$;

-- Rollback procedure (documented, not auto-executed):
--   1. Deactivate W14 in n8n (operator action).
--   2. DROP TRIGGER IF EXISTS mdg_leads_w14_classify_insert ON public.mdg_leads;
--   3. DROP FUNCTION IF EXISTS public.mdg_w14_classify_insert();
--      DROP FUNCTION IF EXISTS public.mdg_w14_activate_cutover(text,text,timestamptz);
--      DROP FUNCTION IF EXISTS public.mdg_w14_insert_lead(...20 args...);
--   4. DROP TABLE IF EXISTS public.mdg_w14_activation;
--   5. The 2026-07-27 migration remains the baseline; re-apply its rollback
--      separately if the original W14 objects must also be removed.
-- No hard deletes of mdg_leads rows are performed in any rollback path.

COMMIT;
