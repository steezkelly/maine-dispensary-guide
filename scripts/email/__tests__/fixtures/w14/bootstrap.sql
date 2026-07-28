-- Disposable PostgreSQL fixture for W14 migration/integration tests.
-- Mirrors the production mdg_leads columns the W13 insert and the R1
-- mdg_w14_insert_lead function rely on. Created BEFORE any migration so the
-- historical row below exists prior to the 2026-07-27 migration (and therefore
-- prior to the R1 classification trigger).
CREATE TABLE public.mdg_leads (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_message_id text,
  from_email text NOT NULL,
  from_name text,
  subject text,
  lead_type text,
  promised_asset text,
  message_body text,
  received_at timestamptz NOT NULL DEFAULT now(),
  page_path text,
  referrer text,
  user_agent text,
  consent_ts timestamptz,
  asset_id text,
  transport_kind text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  form_name text,
  success_path text
);

-- Pre-migration historical row: exists before the migration adds
-- fulfillment_status, so the backfill logic must mark it not_applicable.
INSERT INTO public.mdg_leads (source_message_id, from_email, promised_asset, received_at)
VALUES ('synthetic:historical', 'w14-historical@example.invalid',
        'maine_dispensary_roadmap_2026', now() - interval '30 days');
