-- MDG W13/W14 lead pipeline — schema reconciliation
-- 2026-07-29
--
-- Background: the mdg_w14_insert_lead() function was deployed referencing
-- mdg_leads.form_name and mdg_leads.success_path, but the table never
-- received those columns. Every W13 webhook insert failed with
-- "column l.form_name does not exist" and n8n swallowed the error as an
-- empty 200 response, so the lead queue stayed at zero rows from
-- 2026-07-23 through 2026-07-29 despite the public intake URL being live.
--
-- This migration is additive and idempotent. It touches no data and
-- modifies no existing column. Safe to run against a fresh or populated
-- database.
--
-- Apply: psql -U n8n -d n8n -f 2026-07-29-mdg-leads-form-name-success-path.sql

ALTER TABLE public.mdg_leads
  ADD COLUMN IF NOT EXISTS form_name text,
  ADD COLUMN IF NOT EXISTS success_path text;

COMMENT ON COLUMN public.mdg_leads.form_name IS
  'Logical form identifier derived from page_path by the W13 route contract '
  '(e.g. download_checklist, founders_bible). Used by mdg_w14_insert_lead() '
  'for idempotent replay detection.';

COMMENT ON COLUMN public.mdg_leads.success_path IS
  'Client redirect target returned in the W13 webhook response after a '
  'successful insert. Defaults to page_path when unset.';
