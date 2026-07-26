# MDG Operations Metric Contract v1

**Date:** 2026-07-25
**Status:** Accepted (operator acceptance 2026-07-26; amended by OPS-06A-3 — see ADR Amendment 1)
**Authority:** ADR `docs/adr/2026-07-25-mdg-operations-control-plane-v1.md`
**Source schema:** `mdg-operations-event-v1`, `mdg-operations-snapshot-v1`

This contract defines every operations metric's numerator, denominator, grain,
window, included/excluded states, source events, censoring treatment,
duplicate handling, and minimum-evidence warning. It does **not** compute
metrics (that is OPS-04) and sets **no** permanent WIP threshold or production
priority weight.

---

## Universal rules

1. **UTC internally.** All timestamps normalized to UTC before any arithmetic.
2. **Deterministic quantiles.** P50/P85/P95 use a fixed, documented method
   (linear interpolation, R-7) so repeated runs agree exactly.
3. **Empty ⇒ insufficient_data.** Any metric over an empty or unsupported
   sample resolves to `insufficient_data`, never zero.
4. **Censored tasks are explicit.** Left-censored and right-censored tasks are
   either excluded from a metric or reported in a separate labeled bucket —
   never silently mixed into the primary value.
5. **No timestamp fabrication.** Missing ready/entry times are not replaced
   with creation time, commit time, or any inferred value without a separate,
   explicitly named metric definition.
6. **Observation time ≠ occurrence time.** Window membership uses
   `observed_at` for coverage and `occurred_at` for rate denominators, stated
   per metric.
7. **Idempotency.** Duplicate observations (identical `source_sha256` at the
   same `observed_at`) contribute once. Duplicate `event_id` with differing
   content is a guardrail violation, not a metric input.
8. **Console aggregates only.** Public/console output carries aggregates,
   rates, and distributions. Task-level detail stays under the private root.
9. **Provenance is preserved.** Events carry `provenance` (`live_observer` or
   `historical_import`) and, for imports, an `import_batch` labeling source and
   cutoff. Metrics that span the 2026-07-14 import cutoff must state which
   provenance buckets they draw from; imported structured history (Hermes
   `task_events`/`task_runs`) is trustworthy but must remain distinguishable
   from live observation. Pre-cutoff tasks are left-censored; post-cutoff
   lifecycle is recoverable and is not treated as unobservable.

---

## Primary outcome metrics

### M1. Verified release throughput (λ)

- **Numerator:** count of distinct tasks with `completion.verified_production_release == true`
  evidenced by a `release_recorded` event whose `release_evidence.verifier_pass`
  and `release_evidence.post_deploy_verified` are both true, within the window.
- **Denominator:** window duration (stated units, e.g. weeks).
- **Grain:** task. **Window:** stated per report (weekly and monthly).
- **Included states:** `released` with verified production release evidence.
- **Excluded:** authored work, branch creation, commits, HTTP 200 responses,
  `card_completed`, `initiative_completed`, `verification_pass`,
  `accepted_candidate`, `integration_completed` without post-deploy evidence.
- **Source events:** `release_recorded`.
- **Censoring:** right-censored (in-flight, not yet released) tasks are not
  counted in the numerator and do not reduce the rate.
- **Duplicate handling:** distinct `task_id`; one release per task.
- **Minimum-evidence warning:** fewer than a stated number of releases in the
  window ⇒ report value with `coverage_state: insufficient_data` warning.
- **Measurement state (OPS-06A-3):** M1 reports one of `measured_nonzero`
  (releases in window), `measured_zero` (instrumentation present — at least one
  `release_recorded` event exists — but none in window), or
  `instrumentation_missing` (no `release_recorded` events anywhere in the event
  stream). A valid window with no `release_recorded` events is NEVER silently a
  measured zero; it is `instrumentation_missing`. Each report carries
  `evidence_count`, `coverage_state`, `instrumentation_state`, and
  `minimum_evidence_warning`.

### M2. Ready-to-release flow time (W)

- **Definition:** `W_i = t(released)_i − t(ready)_i` for tasks with trustworthy
  ready-entry and release timestamps.
- **Report:** arithmetic `mean_hours` (the value Little's Law uses as `W`), plus
  median (P50), P85, P95 as descriptive outputs (OPS-06A-R1 finding A). The
  arithmetic mean and the percentiles are computed over the SAME eligible
  population; P50/P85/P95 are never substituted for the mean.
- **Grain:** task. **Window:** stated.
- **Included:** tasks with non-null, non-censored `ready` entry time and a
  verified release time.
- **Excluded / separated:** left-censored tasks (unknown ready-entry time) and
  right-censored tasks (not yet released) are reported in separate buckets.
- **Source events:** `task_state_changed` (into ready), `release_recorded`.
- **Censoring:** left-censored excluded from primary; right-censored excluded
  from primary; both reported separately with counts.
- **Minimum-evidence warning:** small eligible sample ⇒ wide-quantile warning.

### M3. First-pass verification yield (FPY)

- **Numerator:** tasks whose **first** independent verification is PASS.
- **Denominator:** tasks receiving a first independent verification.
- **Grain:** task. **Window:** stated.
- **Included:** tasks with at least one `verification_completed` event.
- **Excluded:** tasks with no verifier evidence (missing evidence ≠ PASS).
- **Source events:** `verification_completed`.
- **Rework:** a repeated verification is counted as rework, never as a first
  pass.
- **Minimum-evidence warning:** small denominator ⇒ `insufficient_data` warning.

---

## Diagnostic metrics

| Metric | Definition | Censoring / notes |
|---|---|---|
| Arrivals per week | new `task_created_observed` / window | left-censored pre-existing tasks excluded |
| Active WIP by state | count of tasks per `normalized_state` at window end | blocked reported separately |
| Queue length by state | count awaiting service per station | distinguish average vs peak |
| State residence time | time in each `normalized_state` | unknown entry ⇒ `unknown`, not zero |
| Blocked age | now − blocked-entry for `blocked` tasks | unknown entry ⇒ `unknown` |
| Verification queue age | age of tasks in `verifying` | — |
| Integration queue age | age of tasks in `accepted`/`integrating` | one-integrator serialization noted |
| Rework loops | count of `needs_fix` cycles per task | repeated verification = rework |
| Stale / expired leases | leases past `expires_at` or unreleased | from lease observations |
| Dependency errors | missing-dependency and cycle counts | from graph analysis (OPS-05) |
| Dispatch-advice agreement | fraction shadow advisor agrees with first-eligible | `insufficient_scoring_data` markers reported |
| Observation coverage | fraction of window with trustworthy snapshots | missed intervals reported |

---

## Guardrail metrics (alerts, not KPIs)

scope violation; author self-approval; missing verification evidence; failed
integration check; failed post-deploy check; malformed event; duplicate
`event_id` with conflicting content; unsafe private-root permissions;
unobserved period; any attempt to use analytics as task authority.

Each guardrail fires a structured alert and is counted; none is silently
absorbed into a primary metric.

---

## Little's Law reconciliation

Reported only when all preconditions hold:

- **Population boundary** explicitly defined (which states count as "in system").
- **Window** explicitly stated.
- **WIP (L), throughput (λ), and flow time (W)** share the same boundary.
- **Coverage** adequate; missed intervals disclosed.
- **Censoring** handled (left/right-censored excluded or separated).

Always report: `L`, `λ`, `W`, residual `L − λW`, population definition,
window, and a coverage warning. A confident result is **not** displayed merely
because all three quantities are mechanically computable; if steady-state
assumptions are doubtful (e.g. one-time migration, sparse sample), the warning
must say so.

**L is time-average WIP (OPS-06A-3).** `L` is the time-average number of tasks
in the system over the stated window, computed from the event trajectory (or
snapshots): `L = (1/T) ∫ WIP(t) dt`. It is **not** an average of end-of-window
state-bucket counts (that earlier approximation is removed). `W` is the
arithmetic **mean** ready-to-release flow time for the same population; P50/P85/
P95 remain descriptive metrics and are **not** substituted for mean `W`. `λ`
uses releases for the same population and window. The population boundary,
blocked treatment, and left/right censoring are explicit. Adequate observation
at the window start must be established; sparse or unstable windows remain
`insufficient_data`. If trustworthy time-average WIP cannot be calculated, the
result is `insufficient_data`, **never** an approximation.

**V1 population boundary and fail-closed coverage (OPS-06A-R1 findings B, C).**
The modeled population is **ready → verified production release**:

- **Entry** is a trustworthy transition into `ready` with a real timestamp.
- **Exit** is a verified `release_recorded` event with `verifier_pass == true`
  AND `post_deploy_verified == true`. `accepted`, `card_completed`, `done`,
  `completed`, an ordinary `released` state, branch creation, merge, and HTTP
  success do **not** independently count as exits for this population.
- A task that leaves the system through cancellation, abandonment, or another
  non-release terminal outcome makes the population/window **incompatible**;
  such departures are never silently mixed into release throughput.

Little's Law returns `computable=false` and `residual=insufficient_data` when:
the opening WIP population is unknown; active left-censored tasks exist at the
window start; no trustworthy opening snapshot exists; observation coverage is
materially incomplete (window < 7 days or too few distinct timestamps); the
window is sparse or unstable; L, λ, and W do not share the same population; or
any required component is `instrumentation_missing` / `insufficient_data`.
"At least one event occurred in the window" is **not** complete coverage.

The report carries explicit fields: `opening_state_known`,
`left_censored_at_start`, `nonrelease_departures`, `in_flight_at_end`,
`released_in_window`, `coverage_state`, `boundary_compatible`, `computable`,
`insufficiency_reasons`, plus `L`, `lambda_per_week`, `W_hours`, `residual`.

---

## What this contract deliberately does not set

- No permanent WIP threshold.
- No production priority weights.
- No dispatch policy change.
- No simulation parameters.

Those require OPS-06 evidence, OPS-07 simulation, and an OPS-08 ADR.
