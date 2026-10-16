# GA4 Lead-Capture Reporting Runbook

## Purpose

`ga4-lead-capture-daily.cjs` writes a privacy-safe aggregate report for the
`lead_capture` event. It is diagnostic evidence, not proof that a lead was
accepted by the downstream form provider or delivered to a mailbox.

## Commands

From `apps/maine-cannabis`:

```bash
node scripts/seo/ga4-lead-capture-daily.cjs --dry-run
GOOGLE_APPLICATION_CREDENTIALS="$HOME/.hermes/secrets/gcp-mdg-reader.json" \
  GA4_PROPERTY_ID=532778727 \
  node scripts/seo/ga4-lead-capture-daily.cjs --live
```

The default data root is `~/.hermes/data/mdg-analytics`. Override it only with
`MDG_GA4_DATA_ROOT` pointing at a private owner-controlled directory. The root
is mode `0700`; each dated JSON report is mode `0600`.

## Reporting grain

The script reads GA4 property metadata before querying. It orders every requested
dimension and paginates to GA4's reported row count. A row-count mismatch or a
duplicate dimension key aborts the run without writing a report, rather than
producing a plausible partial aggregate.

- `per_form`: available only when GA4 reports the event-scoped custom dimension
  `customEvent:form_name`. Output includes a form name only when it is on the
  reporter's explicit allowlist of stable MDG labels. Unknown values are omitted
  and counted in `redacted_form_name_count` without retaining the raw value.
- `page_level_fallback`: used when `form_name` is not registered or not yet
  reportable. Output is limited to `date`, `page_path`, event count, and
  sessions. It must not be interpreted as form-level attribution.

As of 2026-08-05, property `532778727` is in `page_level_fallback` mode:
`pagePath` and `eventName` are reportable; `customEvent:form_name` is not.

## Future per-form reporting

A GA4 property administrator must register `form_name` as an event-scoped
custom dimension in GA4 Admin → Custom definitions. Registration enables
future reporting only; it does not backfill historical parameter values. After
GA4 processing has settled, rerun the live command and verify the report labels
itself `per_form` before using a form-level table.

Do not register parameters containing email addresses, free text, or other
personal data.

## Scheduler relationship

The weekly `MDG GA4 Key-Event Digest` scheduler job remains the broad funnel
summary. This report is the focused lead-capture diagnostic and may be run
alongside it after a settled measurement window or during lead-form analysis.
It is intentionally not an automatic GA4 Admin configuration action.

## Interpretation limits

- `lead_capture` is a client-side event. A nonzero count indicates reported
  capture activity, not downstream provider acceptance or fulfillment.
- A zero count can indicate no event delivery, sparse traffic, consent/DNT
  suppression, a form-flow issue, or no submissions. Investigate the relevant
  layer before drawing a product conclusion.
- The report preserves aggregate page paths only. It stores no raw URLs,
  user/session IDs, form field values, query text, credentials, or event
  parameters other than a registered bounded form name in `per_form` mode.
