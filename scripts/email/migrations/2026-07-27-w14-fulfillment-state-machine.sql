-- MDG-W14-001 durable lead-asset fulfillment state machine.
-- PostgreSQL 15+. Additive and idempotent for the reviewed zero-row baseline.
-- No historical reconstruction, no hard deletes, no credential material.

BEGIN;

-- Fail closed before adding source-message uniqueness. The migration must not
-- guess how to collapse real duplicates.
DO $w14$
DECLARE
  duplicate_groups bigint;
BEGIN
  SELECT count(*) INTO duplicate_groups
  FROM (
    SELECT source_message_id
    FROM public.mdg_leads
    WHERE source_message_id IS NOT NULL AND btrim(source_message_id) <> ''
    GROUP BY source_message_id
    HAVING count(*) > 1
  ) d;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION 'W14 migration blocked: % duplicate source_message_id group(s)', duplicate_groups;
  END IF;
END
$w14$;

ALTER TABLE public.mdg_leads
  ADD COLUMN IF NOT EXISTS fulfillment_status text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by text,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS outbound_message_id text,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS current_attempt_id bigint,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS manual_review_reason text,
  ADD COLUMN IF NOT EXISTS resend_authorized_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operator_resend_by text,
  ADD COLUMN IF NOT EXISTS operator_resend_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_resend_reason text;

-- Backfill only recent rows to pending. Historical rows (older than 7 days)
-- are marked not_applicable to prevent accidental re-fulfillment of leads
-- that predate W14. The production baseline was verified as zero pending rows.
UPDATE public.mdg_leads
SET fulfillment_status = CASE
      WHEN received_at >= now() - interval '7 days' THEN 'pending'
      ELSE 'not_applicable'
    END,
    next_attempt_at = CASE
      WHEN received_at >= now() - interval '7 days' THEN COALESCE(next_attempt_at, now())
      ELSE NULL
    END,
    status_updated_at = now()
WHERE fulfillment_status IS NULL;

ALTER TABLE public.mdg_leads
  ALTER COLUMN fulfillment_status SET DEFAULT 'pending',
  ALTER COLUMN fulfillment_status SET NOT NULL,
  ALTER COLUMN next_attempt_at SET DEFAULT now();

ALTER TABLE public.mdg_leads
  DROP CONSTRAINT IF EXISTS mdg_leads_fulfillment_status_chk,
  DROP CONSTRAINT IF EXISTS mdg_leads_attempt_count_chk,
  DROP CONSTRAINT IF EXISTS mdg_leads_resend_authorized_count_chk;

UPDATE public.mdg_leads
SET fulfillment_status = 'not_applicable',
    next_attempt_at = NULL,
    status_updated_at = now()
WHERE fulfillment_status = 'pending'
  AND NULLIF(btrim(promised_asset), '') IS NULL;

ALTER TABLE public.mdg_leads
  ADD CONSTRAINT mdg_leads_fulfillment_status_chk CHECK (
    fulfillment_status IN (
      'not_applicable',
      'pending',
      'claimed',
      'sending',
      'fulfilled',
      'retryable_failure',
      'terminal_failure',
      'manual_review'
    )
  ),
  ADD CONSTRAINT mdg_leads_attempt_count_chk CHECK (attempt_count >= 0),
  ADD CONSTRAINT mdg_leads_resend_authorized_count_chk CHECK (resend_authorized_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS mdg_leads_source_message_id_uq
  ON public.mdg_leads (source_message_id)
  WHERE source_message_id IS NOT NULL AND btrim(source_message_id) <> '';

DROP INDEX IF EXISTS public.mdg_leads_w14_claim_idx;
CREATE INDEX mdg_leads_w14_claim_idx
  ON public.mdg_leads (next_attempt_at, received_at, id)
  WHERE fulfillment_status IN ('pending', 'retryable_failure');

CREATE INDEX IF NOT EXISTS mdg_leads_w14_review_idx
  ON public.mdg_leads (status_updated_at, id)
  WHERE fulfillment_status IN ('sending', 'manual_review', 'terminal_failure');

-- Server-side allowlist. W14 cannot prepare a send unless the durable asset ID
-- is present and active here. No recipient or credential data is stored.
CREATE TABLE IF NOT EXISTS public.mdg_fulfillment_assets (
  promised_asset text PRIMARY KEY,
  canonical_url text NOT NULL,
  template_id text NOT NULL,
  template_version text NOT NULL,
  subject text NOT NULL,
  sender_identity text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mdg_fulfillment_assets_https_chk CHECK (canonical_url ~ '^https://'),
  CONSTRAINT mdg_fulfillment_assets_nonempty_chk CHECK (
    btrim(promised_asset) <> '' AND
    btrim(template_id) <> '' AND
    btrim(template_version) <> '' AND
    btrim(subject) <> '' AND
    btrim(sender_identity) <> ''
  )
);

-- Attempt ledger deliberately omits recipient address, name, message body, and
-- credentials. outcome_certainty distinguishes safe retry from possible
-- provider acceptance.
CREATE TABLE IF NOT EXISTS public.mdg_fulfillment_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES public.mdg_leads(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL,
  outbound_message_id text NOT NULL UNIQUE,
  promised_asset text NOT NULL REFERENCES public.mdg_fulfillment_assets(promised_asset),
  template_version text NOT NULL,
  status text NOT NULL,
  outcome_certainty text NOT NULL DEFAULT 'not_submitted',
  prepared_at timestamptz NOT NULL DEFAULT now(),
  submission_started_at timestamptz,
  completed_at timestamptz,
  provider_message_id text,
  error_code text,
  error_stage text,
  operator_decision_by text,
  operator_decision_at timestamptz,
  operator_decision_reason text,
  CONSTRAINT mdg_fulfillment_attempts_number_chk CHECK (attempt_number > 0),
  CONSTRAINT mdg_fulfillment_attempts_status_chk CHECK (
    status IN ('sending', 'accepted', 'retryable_failure', 'terminal_failure', 'manual_review')
  ),
  CONSTRAINT mdg_fulfillment_attempts_certainty_chk CHECK (
    outcome_certainty IN ('not_submitted', 'pre_acceptance_failure', 'accepted', 'uncertain')
  ),
  CONSTRAINT mdg_fulfillment_attempts_lead_number_uq UNIQUE (lead_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS mdg_fulfillment_attempts_lead_idx
  ON public.mdg_fulfillment_attempts (lead_id, id DESC);

DO $w14$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mdg_leads_current_attempt_fk'
      AND conrelid = 'public.mdg_leads'::regclass
  ) THEN
    ALTER TABLE public.mdg_leads
      ADD CONSTRAINT mdg_leads_current_attempt_fk
      FOREIGN KEY (current_attempt_id)
      REFERENCES public.mdg_fulfillment_attempts(id)
      ON DELETE RESTRICT;
  END IF;
END
$w14$;

-- Current production allowlist. Existing identifiers are stable machine IDs;
-- additions require a reviewed migration and a W14 template test.
INSERT INTO public.mdg_fulfillment_assets (
  promised_asset, canonical_url, template_id, template_version, subject, sender_identity, active
) VALUES
  ('maine_dispensary_roadmap_2026',
   'https://mainedispensaryguide.com/downloads/maine-dispensary-roadmap-2026.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine Dispensary Roadmap',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true),
  ('maine_cannabis_founders_bible_2026',
   'https://mainedispensaryguide.com/downloads/maine-dispensary-founders-bible-2026.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine Cannabis Founders Bible',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true),
  ('maine_first_timer_field_guide',
   'https://mainedispensaryguide.com/downloads/maine-first-timer-field-guide.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine First-Timer Field Guide',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true),
  ('maine_metrc_reconciliation_checklist',
   'https://mainedispensaryguide.com/downloads/maine-metrc-reconciliation-checklist.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine METRC Reconciliation Checklist',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true),
  ('maine_dispensary_compliance_self_assessment',
   'https://mainedispensaryguide.com/downloads/maine-dispensary-compliance-self-assessment.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine Dispensary Compliance Self-Assessment',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true),
  ('maine_cannabis_industry_report_q3_2026',
   'https://mainedispensaryguide.com/pdfs/maine-cannabis-industry-report-q3-2026.pdf',
   'mdg_asset_link', '1.0.0',
   'Your Maine Cannabis Industry Report — Q3 2026',
   'Maine Dispensary Guide <leads@mainedispensaryguide.com>', true)
ON CONFLICT (promised_asset) DO UPDATE SET
  canonical_url = EXCLUDED.canonical_url,
  template_id = EXCLUDED.template_id,
  template_version = EXCLUDED.template_version,
  subject = EXCLUDED.subject,
  sender_identity = EXCLUDED.sender_identity,
  updated_at = now();

-- Claim one due lead atomically. SKIP LOCKED prevents two W14 executions from
-- claiming the same row. This function does no network work.
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
BEGIN
  IF p_worker IS NULL OR btrim(p_worker) = '' THEN
    RAISE EXCEPTION 'worker identity is required';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT l.id
    FROM public.mdg_leads l
    WHERE l.fulfillment_status IN ('pending', 'retryable_failure')
      AND l.fulfilled_at IS NULL
      AND NULLIF(btrim(l.source_message_id), '') IS NOT NULL
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

-- Validate the claimed row against the durable allowlist and create the exact
-- attempt/Message-ID before SMTP submission. A ready=false row is a durable
-- manual-review transition and must not flow into the email node.
CREATE OR REPLACE FUNCTION public.mdg_w14_prepare_send(
  p_lead_id bigint,
  p_worker text,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  ready boolean,
  lead_id bigint,
  attempt_id bigint,
  attempt_number integer,
  recipient_email text,
  promised_asset text,
  canonical_url text,
  template_id text,
  template_version text,
  subject text,
  sender_identity text,
  outbound_message_id text,
  error_code text
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  l public.mdg_leads%ROWTYPE;
  a public.mdg_fulfillment_assets%ROWTYPE;
  v_attempt_number integer;
  v_attempt_id bigint;
  v_message_id text;
BEGIN
  SELECT * INTO l
  FROM public.mdg_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead not found';
  END IF;

  IF l.fulfillment_status <> 'claimed' OR l.claimed_by IS DISTINCT FROM p_worker THEN
    RAISE EXCEPTION 'lead is not claimed by this worker';
  END IF;

  IF l.from_email IS NULL OR btrim(l.from_email) = '' OR
     l.from_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    UPDATE public.mdg_leads
    SET fulfillment_status = 'manual_review',
        manual_review_reason = 'malformed_recipient',
        last_error_code = 'MALFORMED_RECIPIENT',
        last_error_at = p_now,
        status_updated_at = p_now
    WHERE id = p_lead_id;

    RETURN QUERY SELECT false, p_lead_id, NULL::bigint, l.attempt_count,
      NULL::text, l.promised_asset, NULL::text, NULL::text, NULL::text,
      NULL::text, NULL::text, NULL::text, 'MALFORMED_RECIPIENT'::text;
    RETURN;
  END IF;

  SELECT * INTO a
  FROM public.mdg_fulfillment_assets
  WHERE mdg_fulfillment_assets.promised_asset = l.promised_asset
    AND active = true;

  IF NOT FOUND THEN
    UPDATE public.mdg_leads
    SET fulfillment_status = 'manual_review',
        manual_review_reason = 'unknown_or_inactive_asset',
        last_error_code = 'UNKNOWN_ASSET',
        last_error_at = p_now,
        status_updated_at = p_now
    WHERE id = p_lead_id;

    RETURN QUERY SELECT false, p_lead_id, NULL::bigint, l.attempt_count,
      NULL::text, l.promised_asset, NULL::text, NULL::text, NULL::text,
      NULL::text, NULL::text, NULL::text, 'UNKNOWN_ASSET'::text;
    RETURN;
  END IF;

  IF l.attempt_count >= (3 + l.resend_authorized_count) THEN
    UPDATE public.mdg_leads
    SET fulfillment_status = 'manual_review',
        manual_review_reason = 'maximum_attempts_reached',
        last_error_code = 'MAX_ATTEMPTS',
        last_error_at = p_now,
        status_updated_at = p_now
    WHERE id = p_lead_id;

    RETURN QUERY SELECT false, p_lead_id, NULL::bigint, l.attempt_count,
      NULL::text, l.promised_asset, NULL::text, NULL::text, NULL::text,
      NULL::text, NULL::text, NULL::text, 'MAX_ATTEMPTS'::text;
    RETURN;
  END IF;

  v_attempt_number := l.attempt_count + 1;
  v_message_id := format('<mdg-w14-%s-a%s@mainedispensaryguide.com>', l.id, v_attempt_number);

  INSERT INTO public.mdg_fulfillment_attempts (
    lead_id, attempt_number, outbound_message_id, promised_asset,
    template_version, status, outcome_certainty, prepared_at,
    submission_started_at
  ) VALUES (
    l.id, v_attempt_number, v_message_id, a.promised_asset,
    a.template_version, 'sending', 'not_submitted', p_now, p_now
  )
  RETURNING id INTO v_attempt_id;

  UPDATE public.mdg_leads
  SET fulfillment_status = 'sending',
      attempt_count = v_attempt_number,
      current_attempt_id = v_attempt_id,
      outbound_message_id = v_message_id,
      template_version = a.template_version,
      status_updated_at = p_now,
      last_error_code = NULL,
      manual_review_reason = NULL
  WHERE id = l.id;

  RETURN QUERY SELECT true, l.id::bigint, v_attempt_id, v_attempt_number,
    l.from_email, a.promised_asset, a.canonical_url, a.template_id,
    a.template_version, a.subject, a.sender_identity, v_message_id,
    NULL::text;
END
$function$;

CREATE OR REPLACE FUNCTION public.mdg_w14_mark_success(
  p_lead_id bigint,
  p_attempt_id bigint,
  p_provider_message_id text,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  changed bigint;
BEGIN
  -- Lock lead first to match mark_failure/reconcile_stale lock ordering and
  -- prevent deadlocks between concurrent success and failure callbacks.
  PERFORM 1 FROM public.mdg_leads
  WHERE id = p_lead_id AND fulfillment_status = 'sending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.mdg_fulfillment_attempts a
  SET status = 'accepted',
      outcome_certainty = 'accepted',
      provider_message_id = NULLIF(left(p_provider_message_id, 255), ''),
      completed_at = p_now,
      error_code = NULL,
      error_stage = NULL
  WHERE a.id = p_attempt_id
    AND a.lead_id = p_lead_id
    AND a.status = 'sending';
  GET DIAGNOSTICS changed = ROW_COUNT;

  IF changed <> 1 THEN
    RETURN false;
  END IF;

  UPDATE public.mdg_leads l
  SET fulfillment_status = 'fulfilled',
      fulfilled_at = p_now,
      provider_message_id = NULLIF(left(p_provider_message_id, 255), ''),
      status_updated_at = p_now,
      next_attempt_at = NULL,
      last_error_code = NULL,
      manual_review_reason = NULL
  WHERE l.id = p_lead_id
    AND l.current_attempt_id = p_attempt_id
    AND l.fulfillment_status = 'sending';
  GET DIAGNOSTICS changed = ROW_COUNT;

  IF changed <> 1 THEN
    RAISE EXCEPTION 'lead success transition lost its sending precondition';
  END IF;

  RETURN true;
END
$function$;

-- p_failure_class is intentionally narrow:
--   retryable_pre_acceptance: network/provider failure proven before DATA acceptance
--   terminal: permanent rejection or malformed record
--   uncertain: possible provider acceptance; automatic resend forbidden
--   authentication: credential/configuration failure; immediate manual review
CREATE OR REPLACE FUNCTION public.mdg_w14_mark_failure(
  p_lead_id bigint,
  p_attempt_id bigint,
  p_failure_class text,
  p_error_code text,
  p_error_stage text DEFAULT NULL,
  p_now timestamptz DEFAULT now()
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  l public.mdg_leads%ROWTYPE;
  v_error_code text;
  v_error_stage text;
  v_next_status text;
  v_certainty text;
  v_next_attempt_at timestamptz;
  v_delay interval;
  v_jitter integer;
BEGIN
  SELECT * INTO l
  FROM public.mdg_leads
  WHERE id = p_lead_id
    AND current_attempt_id = p_attempt_id
    AND fulfillment_status = 'sending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead/attempt is not in sending state';
  END IF;

  v_error_code := upper(regexp_replace(COALESCE(p_error_code, 'UNCLASSIFIED'), '[^A-Za-z0-9_.:-]', '_', 'g'));
  v_error_code := left(v_error_code, 64);
  v_error_stage := left(COALESCE(NULLIF(p_error_stage, ''), 'unknown'), 64);

  CASE p_failure_class
    WHEN 'retryable_pre_acceptance' THEN
      v_certainty := 'pre_acceptance_failure';
      IF l.attempt_count >= (3 + l.resend_authorized_count) THEN
        v_next_status := 'manual_review';
        v_next_attempt_at := NULL;
      ELSE
        v_next_status := 'retryable_failure';
        v_jitter := ((l.id * 37 + l.attempt_count * 17) % 61)::integer;
        v_delay := CASE l.attempt_count
          WHEN 1 THEN interval '5 minutes'
          WHEN 2 THEN interval '30 minutes'
          ELSE interval '2 hours'
        END;
        v_next_attempt_at := p_now + v_delay + make_interval(secs => v_jitter);
      END IF;
    WHEN 'terminal' THEN
      v_certainty := 'pre_acceptance_failure';
      v_next_status := 'terminal_failure';
      v_next_attempt_at := NULL;
    WHEN 'uncertain' THEN
      v_certainty := 'uncertain';
      v_next_status := 'manual_review';
      v_next_attempt_at := NULL;
    WHEN 'authentication' THEN
      v_certainty := 'pre_acceptance_failure';
      v_next_status := 'manual_review';
      v_next_attempt_at := NULL;
    ELSE
      RAISE EXCEPTION 'unsupported failure class';
  END CASE;

  UPDATE public.mdg_fulfillment_attempts
  SET status = CASE v_next_status
      WHEN 'retryable_failure' THEN 'retryable_failure'
      WHEN 'terminal_failure' THEN 'terminal_failure'
      ELSE 'manual_review'
    END,
    outcome_certainty = v_certainty,
    completed_at = p_now,
    error_code = v_error_code,
    error_stage = v_error_stage
  WHERE id = p_attempt_id AND lead_id = p_lead_id AND status = 'sending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt failure transition lost its sending precondition';
  END IF;

  UPDATE public.mdg_leads
  SET fulfillment_status = v_next_status,
      next_attempt_at = v_next_attempt_at,
      last_error_code = v_error_code,
      last_error_at = p_now,
      status_updated_at = p_now,
      manual_review_reason = CASE
        WHEN v_next_status = 'manual_review' AND p_failure_class = 'uncertain'
          THEN 'uncertain_after_possible_provider_acceptance'
        WHEN v_next_status = 'manual_review' AND p_failure_class = 'authentication'
          THEN 'authentication_or_configuration_failure'
        WHEN v_next_status = 'manual_review'
          THEN 'maximum_attempts_reached'
        ELSE NULL
      END
  WHERE id = p_lead_id;

  RETURN v_next_status;
END
$function$;

-- A stale claim is safe to release because prepare-send has not run. A stale
-- sending row is never requeued: possible provider acceptance is uncertain.
CREATE OR REPLACE FUNCTION public.mdg_w14_reconcile_stale(
  p_claim_timeout interval DEFAULT interval '15 minutes',
  p_sending_timeout interval DEFAULT interval '15 minutes',
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (released_claims bigint, reviewed_sends bigint)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_released bigint;
  v_reviewed bigint;
BEGIN
  UPDATE public.mdg_leads
  SET fulfillment_status = CASE
        WHEN NULLIF(btrim(promised_asset), '') IS NULL THEN 'manual_review'
        ELSE 'retryable_failure'
      END,
      next_attempt_at = CASE
        WHEN NULLIF(btrim(promised_asset), '') IS NULL THEN NULL
        ELSE p_now
      END,
      claimed_by = NULL,
      claimed_at = NULL,
      status_updated_at = p_now,
      last_error_code = CASE
        WHEN NULLIF(btrim(promised_asset), '') IS NULL THEN 'MISSING_PROMISED_ASSET'
        ELSE 'STALE_CLAIM_RELEASED'
      END,
      last_error_at = p_now,
      manual_review_reason = CASE
        WHEN NULLIF(btrim(promised_asset), '') IS NULL THEN 'malformed_fulfillment_record'
        ELSE NULL
      END
  WHERE fulfillment_status = 'claimed'
    AND claimed_at < p_now - p_claim_timeout;
  GET DIAGNOSTICS v_released = ROW_COUNT;

  WITH stale AS (
    UPDATE public.mdg_leads
    SET fulfillment_status = 'manual_review',
        next_attempt_at = NULL,
        status_updated_at = p_now,
        last_error_code = 'STALE_SENDING_UNCERTAIN',
        last_error_at = p_now,
        manual_review_reason = 'stale_sending_possible_provider_acceptance'
    WHERE fulfillment_status = 'sending'
      AND status_updated_at < p_now - p_sending_timeout
    RETURNING current_attempt_id
  )
  UPDATE public.mdg_fulfillment_attempts a
  SET status = 'manual_review',
      outcome_certainty = 'uncertain',
      completed_at = p_now,
      error_code = 'STALE_SENDING_UNCERTAIN',
      error_stage = 'post_prepare'
  FROM stale s
  WHERE a.id = s.current_attempt_id
    AND a.status = 'sending';
  GET DIAGNOSTICS v_reviewed = ROW_COUNT;

  RETURN QUERY SELECT v_released, v_reviewed;
END
$function$;

-- Explicit operator-only escape hatch. It never erases attempt history and
-- grants one extra attempt beyond the normal cap. Caller identity/reason are
-- mandatory and written to the last attempt.
CREATE OR REPLACE FUNCTION public.mdg_w14_authorize_resend(
  p_lead_id bigint,
  p_operator text,
  p_reason text,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  l public.mdg_leads%ROWTYPE;
BEGIN
  IF p_operator IS NULL OR btrim(p_operator) = '' OR
     p_reason IS NULL OR length(btrim(p_reason)) < 12 THEN
    RAISE EXCEPTION 'operator identity and an audited reason (>=12 chars) are required';
  END IF;

  SELECT * INTO l
  FROM public.mdg_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND OR l.fulfillment_status <> 'manual_review' THEN
    RETURN false;
  END IF;

  IF l.current_attempt_id IS NOT NULL THEN
    UPDATE public.mdg_fulfillment_attempts
    SET operator_decision_by = left(p_operator, 128),
        operator_decision_at = p_now,
        operator_decision_reason = left(p_reason, 1000)
    WHERE id = l.current_attempt_id;
  END IF;

  UPDATE public.mdg_leads
  SET fulfillment_status = 'retryable_failure',
      resend_authorized_count = resend_authorized_count + 1,
      next_attempt_at = p_now,
      status_updated_at = p_now,
      manual_review_reason = NULL,
      last_error_code = 'OPERATOR_RESEND_AUTHORIZED',
      last_error_at = p_now,
      operator_resend_by = left(p_operator, 128),
      operator_resend_at = p_now,
      operator_resend_reason = left(p_reason, 1000)
  WHERE id = p_lead_id;

  RETURN true;
END
$function$;

-- Restrict execution to the n8n application role. PUBLIC must not call state
-- functions directly; the n8n Postgres credential role is the only intended
-- caller. REVOKE is unconditional; GRANT is conditional on the role existing.
REVOKE EXECUTE ON FUNCTION public.mdg_w14_claim(text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_prepare_send(bigint, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_mark_success(bigint, bigint, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_mark_failure(bigint, bigint, text, text, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_reconcile_stale(interval, interval, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mdg_w14_authorize_resend(bigint, text, text, timestamptz) FROM PUBLIC;

DO $w14$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n') THEN
    GRANT EXECUTE ON FUNCTION public.mdg_w14_claim(text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_prepare_send(bigint, text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_mark_success(bigint, bigint, text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_mark_failure(bigint, bigint, text, text, text, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_reconcile_stale(interval, interval, timestamptz) TO n8n;
    GRANT EXECUTE ON FUNCTION public.mdg_w14_authorize_resend(bigint, text, text, timestamptz) TO n8n;
  END IF;
END
$w14$;

-- PII guard: operator fields must not contain email addresses or long
-- free-text that could carry recipient data. Enforce at the column level.
ALTER TABLE public.mdg_fulfillment_attempts
  DROP CONSTRAINT IF EXISTS mdg_fulfillment_attempts_operator_pii_chk,
  ADD CONSTRAINT mdg_fulfillment_attempts_operator_pii_chk CHECK (
    (operator_decision_by IS NULL OR operator_decision_by !~ '@') AND
    (operator_decision_reason IS NULL OR (
      length(operator_decision_reason) <= 1000 AND
      operator_decision_reason !~ '@'
    ))
  );

ALTER TABLE public.mdg_leads
  DROP CONSTRAINT IF EXISTS mdg_leads_operator_pii_chk,
  ADD CONSTRAINT mdg_leads_operator_pii_chk CHECK (
    (operator_resend_by IS NULL OR operator_resend_by !~ '@') AND
    (operator_resend_reason IS NULL OR (
      length(operator_resend_reason) <= 1000 AND
      operator_resend_reason !~ '@'
    ))
  );

-- Rollback procedure (documented, not auto-executed):
--   1. Deactivate W14 in n8n (operator action).
--   2. Wait for in-flight executions to drain (check execution_entity).
--   3. Run: UPDATE mdg_leads SET fulfillment_status='manual_review',
--      next_attempt_at=NULL WHERE fulfillment_status IN ('claimed','sending');
--   4. Drop functions: DROP FUNCTION IF EXISTS public.mdg_w14_claim,
--      public.mdg_w14_prepare_send, public.mdg_w14_mark_success,
--      public.mdg_w14_mark_failure, public.mdg_w14_reconcile_stale,
--      public.mdg_w14_authorize_resend;
--   5. Drop tables: DROP TABLE IF EXISTS public.mdg_fulfillment_attempts;
--      DROP TABLE IF EXISTS public.mdg_fulfillment_assets;
--   6. Remove columns from mdg_leads (ALTER TABLE ... DROP COLUMN IF EXISTS).
--   7. Remove indexes and constraints added by this migration.
--   8. Restore from pre-change backup if column removal is not acceptable.
-- No hard deletes of mdg_leads rows are performed in any rollback path.

COMMIT;
