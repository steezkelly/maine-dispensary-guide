# Content-maintenance claim manifest schema

`claims.v1.json` is the source-of-record seed for **material regulatory, licensing, market, and operator-data claims**. It is keyed by `canonical_path` plus a durable `claim_id`; a `source_id` may be reused only when the source itself is identical.

Required fields per claim: `claim_id`, `canonical_path`, `claim_class`, `claim_summary`, `source_id`, `source_url`, `source_class`, `source_publication_or_effective_date`, `mdg_verification_date`, `owner`, `review_cadence_days`, `dependent_pages`, and `propagation_sla_days`. `correction_log_reference` is required when a correction exists and otherwise must be `null`.

On correction, update the factual claim and its verification date first, then update every `dependent_pages` entry within `propagation_sla_days`. The review report measures elapsed time from the new verification date to completion of that dependent-page propagation; it does not infer publication correctness from a source-link click.

Source/reference anchors may opt into the bounded GA4 event by adding `data-mdg-source-id`, `data-mdg-source-family`, and `data-mdg-source-placement`. IDs must be stable slugs from this manifest; never place source URL, claim text, search terms, or visitor data in an event parameter.
