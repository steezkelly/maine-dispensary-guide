# MDG-ANALYTICS-001 Ticket 005 — Deterministic Measurement Health Probes

**Ticket:** `TICKETS/005-measurement-health-probes.md`
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/` (v0.5, verified)
**Sources of truth:** `EVENT-TAXONOMY.md`, `DERIVED-SIGNALS.md`, `PRIVACY-BOUNDARY.md`, `TICKETS/005-measurement-health-probes.md`, `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md`
**Working agreement:** `/home/steve/projects/maine-dispensary-guide/AGENTS.md`
**Author:** Hermes (parent agent), 2026-07-12
**Status:** PROTOCOL DESIGN. Probe-runner code lands in a separate, narrowly-scoped follow-up ticket (not this one) under A2 authority; the *protocol* is what this ticket ships.

## 1. Required property (one sentence)

**A probe PASS must prove that the event created by the current probe run arrived. Page-path presence in a multi-day aggregate is insufficient.**

This sentence is the spec's verbatim. It defines what distinguishes a real "the event arrived" signal from a "the page is on the route map, so we assume events happen" signal.

## 2. Probe v1 protocol — what PASS means

A probe is a single, deterministic, **run-attributed** synthetic event created with a probe-only identifier (e.g. `probe_id = mdg_probe_<date>_<site>_<run-id>`), and the probe PASS condition is that **the same probe_id is observed in the destination analytics source within a defined timeout window**.

PASS = (probe_id was created) ∧ (probe_id was observed arriving at source) ∧ (probe_id arrived before SLA deadline) ∧ (probe_id arrived with expected schema_version)

Otherwise the probe is in one of: TIMEOUT, ARRIVAL_LOST, SCHEMA_MISMATCH, DENIED_BY_DESTINATION (e.g. CSP block), NOT_RUN, DECLARATION_MISMATCH (no destination known), or RUN_INTERNAL_ERROR.

## 3. Probe categories (per ticket spec acceptance)

### 3.1 Pageview/collection delivery probe (acceptance: pageview/collection delivery probe exists)

The probe calls the same gtag / dataLayer path that production uses, with a probe-only flag in event parameters and an opt-in synthetic traffic tag. PASS condition: a `page_view` (or equivalent auto-event) for the probe path arrives within `probe_delivery_sla_seconds` of probe creation.

Operative detail:
- Probe MUST go through the production tracker stack (Layout.astro) so it tests the *same* deployment as production.
- Probe MUST set a `traffic_type = 'synthetic_probe'` parameter (a probe-tagged pseudo-identifier) so post-hoc exclusion is deterministic.
- The synthetic tag is REQUIRED to be excluded from analytics reporting (per SOURCES.md §A3 "synthetic/test traffic exclusions"). The reporting filter must exist in BigQuery extraction or GA4 reporting view before any synthetic probe counts as PASS.

### 3.2 Archetype-context probe (acceptance: archetype-context probe exists)

The probe fires a `page_engaged` (v0) or `mdg_active_attention` (v1) event with a probe-only `page_type` value pre-registered in the page manifest. PASS condition: the destination analytics source can join the probe_id to its expected `page_type` and recover the canonical `page_id` from the page_task_manifest within the SLA.

This probe's purpose is to catch the D5 reconciliation finding: `data-page-type` missing on every page. The probe establishes that the archetype context can be transmitted at all; until it PASSes for each page manifest, archetype-specific reporting is `MEASUREMENT_BLOCKED` per spec.

### 3.3 Event-schema probe (acceptance: event schema probe exists)

The probe fires one event per registered schema (`event_name`) with schema-compliant parameters and the probe_id. PASS condition: the destination analytics source logs the event with `event_name` exactly matching schema, parameters matching the declared type, and `schema_version` matching the registered value.

For each `event_name`, the probe asserts:
- `schema_version: 'v1'` (or `'v0'` for legacy events);
- `event_name` string equals the registered name;
- each parameter's type matches the schema (canonical enum, not free text);
- no parameter outside the declared list is present;
- no parameter violates `PRIVACY_RULES_V1`.

### 3.4 Action exposure/select pairing probe (acceptance: action exposure/select pairing probe exists)

The probe fires one `mdg_action_exposure` followed by a matching `mdg_action_select` with the same `action_id` and `placement_id`. PASS condition: the destination analytics source records both events for the same `action_id` + `placement_id`, with `select.exposed_at ≤ select.at`.

This proves the v1 exposure↔select pairing works end-to-end. Without it, `action_selection_rate` is uncomputable because the eligible-exposure denominator can't be built.

### 3.5 Expected surface coverage probe (acceptance: expected surface coverage is measurable)

The probe enumerates every page in `page_task_manifest.v1.jsonl` and verifies that each page has the expected set of surfaces (FAQ, CTA, etc.) per the page_task_manifest entries. PASS condition: every indexable page either has its expected surfaces instrumented OR is recorded as `WIRED_BUT_SILENT` in `instrumentation_surface_manifest.v1.jsonl` — no silently missing instrumentation.

This probe enforces Ticket 003's surface manifest integrity. The output is the same shape as the per-page `coverage_status` field, allowing diff-time surface drift detection.

### 3.6 Failed-reporting-not-zero probe (acceptance: failed reporting is not rendered as zero behavior)

The probe verifies that when GA4 reporting fails for a custom-dimension query (e.g. `data-page-type`), the failure mode is `REPORTING_UNAVAILABLE`, NOT silently `0`. PASS condition: an exploratory report that would have produced `count = 0` because `data-page-type` is unset reports `REPORTING_UNAVAILABLE` with explicit reason, not zero.

This implements DERIVED-SIGNALS.md §"Zero versus unavailable" — the spec's hard distinction between `event_count = 0` and `event_count = unknown because custom dimension query failed`.

## 4. Implementation (Ticket 005 follow-up, not this ticket)

A probe runner is its own ticket because:
- Probe runner instantiation requires deploying a probe-tagged GA4 client-side cookie + filter (A4 authority).
- Probe results shape a measurement_health ledger that's read by Ticket 008 (cross-source join).
- Daily probe schedule is a cron — Ticket 009 / 012 cadence.

The probe DESIGN (this ticket) is enough for Tickets 007/008/009 to design their consumers against.

## 5. Settlement / observability

Each probe run records:

- `probe_id` (probe-only identifier)
- `probe_run_at` (RFC 3339 UTC)
- `probe_category` (one of §3.1–§3.6)
- `probe_status` (`PASS` / `TIMEOUT` / `ARRIVAL_LOST` / `SCHEMA_MISMATCH` / `DENIED_BY_DESTINATION` / `NOT_RUN` / `DECLARATION_MISMATCH` / `RUN_INTERNAL_ERROR`)
- `probe_destination` (GA4 Data API? GA4 BigQuery? Vercel? — set per run)
- `expected_arrival_by` (timeout)
- `actual_arrival_at` (set if observed)
- `evidence_pointer` (URL or path to the recorded event — BigQuery row pointer, GA4 realtime URL, etc.)
- `evidence_quality` (`strong` / `partial` / `anecdotal`)
- `extract_id` (referencing SOURCES.md §A1 provenance requirement)
- `extract_version` (script version)

This is appended to `measurement_health_probes.jsonl`. Any consecutive failures (`probe_status != PASS` for the same `probe_category`) trigger measurement-blocked state per spec, and surface in Ticket 008's measurement_health column.

## 6. Synthetic-test exclusion

The probe traffic MUST be excluded from analytical reporting. The exclusion mechanism:
- A `traffic_type = 'synthetic_probe'` parameter on the probe event;
- A reporting view (`excluded_from_aggregate`) that filters probe IDs out;
- The reporting view is tested by an explicit assertion probe (probe checks that the exclusion works).

While the reporting view does not yet exist, NO probe results are usable for ticket 008 onward. The probe runner awaits the operator-side BigQuery / GA4 view creation.

## 7. Acceptance vs ticket spec

| Spec acceptance criterion | Status |
|---|---|
| exact probe-run attribution exists | §5 — `probe_id`, `probe_run_at`, `evidence_pointer` |
| synthetic/test traffic is identifiable or excluded | §6 — `traffic_type = 'synthetic_probe'` + reporting view |
| pageview/collection delivery probe exists | §3.1 |
| archetype-context probe exists | §3.2 |
| event schema probe exists | §3.3 |
| action exposure/select pairing probe exists | §3.4 |
| expected surface coverage is measurable | §3.5 |
| failed reporting is not rendered as zero behavior | §3.6 |

## 8. Files written

- `apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-005-measurement-health-probes.md` (this document — protocol)

(No code files in this ticket — that's Ticket 005 follow-up under separate authority review.)

## 9. Stop condition

No production mutation, no probe deployed. Tier 1 invariants preserved. Probe design only.

## 10. Forward dependencies

- Ticket 006 (instrumentation v1): requires probes to PASS before classifying any v1 event as INSTRUMENTED.
- Ticket 008 (cross-source page-window join): consumes measurement_health_probes.jsonl as the source of truth for per-page-window measurement health.
- Ticket 011 (opportunity engine): per spec, `INVESTIGATION_ELIGIBLE` requires "measurement health PASS" — this probe protocol defines what that means.
- Ticket 012 (commissioning handback): probes PASS for every category across the suite of pages is a commissioning acceptance criterion.
