# POST-MDG-ANALYTICS-001 Capability Inventory

**Date:** 2026-07-12
**Purpose:** capability and readiness inventory after Tickets 000–011
**Boundary:** this document does not authorize production optimization

## Capability matrix

| Capability | State | Authority / evidence |
|---|---|---|
| GA4 Data API observation | READY | Ticket 007 source client and live release artifact. |
| GA4 BigQuery observation | READY WITH SOURCE LIMITS | Sanitized query layer, per-day routing, G1–G10 PASS. |
| GSC API observation | READY AS SOURCE-SPECIFIC | Existing GSC scripts and reports; BDE deliberately retired. |
| Vercel A4 validation | READY WHEN A4 EVIDENCE IS SUPPLIED | Ticket 008 accepts A4 rows but does not fabricate missing production rows. |
| A5 Speed Insights | BLOCKED / DEFERRED | No A5 drain evidence; no performance label when blocked. |
| Canonical page-path normalization | READY | Ticket 008 `ticket-008.v1`. |
| Release identity/provenance | READY | GA4 canonical/acquisition release IDs and downstream provenance fields. |
| Query-intent distributions | READY | Ticket 009 `query-intent.v1`; deterministic classifier, evidence counts, version. |
| Metric-specific peer context | READY | Ticket 009 `metric-peer-policy.v1`; no universal peer group. |
| Posterior shrinkage | READY | Empirical-Bayes Beta-Binomial product with 80%/95% intervals. |
| Practical-effect probabilities | READY | Metric-family configuration, not magic constants. |
| Sample-state classification | READY | `insufficient`, `directional`, `decision_eligible`. |
| Measurement-blocked classification | READY | Source, window, task, comparability, and contamination blockers. |
| WATCH state creation | READY | Ticket 010 state machine; unchanged WATCH suppression. |
| Persistence detection | READY | Settled-window persistence and corroboration fields. |
| Change-context gating | READY | Eligibility requires evaluated change context. |
| Core Web Vitals semantics | READY AS FIELD-SEMANTICS CONTRACT | Field percentile/source preserved; blocked rows cannot receive performance labels. |
| Opportunity deduplication | READY | Ticket 011 stable `deduplication_key` and opportunity ID. |
| Immutable detection snapshot | READY | Ticket 011 packet contract. |
| Hypothesis ledger | READY | Six bounded families; every diagnostic updates supporting/contradicting paths. |
| Read-only diagnostics | READY | Diagnostic catalog declares `production_touch=false`. |
| Task-ownership investigation | READY | Mismatch routes to task-ownership packet; no rewrite implication. |
| Zero-intervention resolution | READY | `NO_ACTION_SUPPORTED` and other resolution codes. |
| Proposal drafting | READY AS NON-AUTHORIZED ARTIFACT | Typed proposal validator; A4 required; authorization hash null until human signoff. |
| A3 bounded execution | NOT READY | Disabled by default; no exact allowlist, max scope, verification, rollback, and owner package commissioned. |
| Structured E2 evaluation | NOT READY | Requires separately approved intervention and fixed measurement/evaluation contract. |
| E3 quasi-experiment | NOT READY | Requires defensible controls, pre-period fit, contamination checks, and sensitivity analysis. |
| E4 randomized experiment | NOT READY | Requires assignment, exposure, primary metric, guardrails, stopping rule, exclusion, SRM, and simulation. |
| Autonomous production optimization | PROHIBITED | A4 required for analytics-triggered material changes; A3 disabled. |

## Operational commands

```bash
node apps/maine-cannabis/scripts/analytics/ga4-source-ingest.cjs --from=YYYY-MM-DD --to=YYYY-MM-DD --out=...
node apps/maine-cannabis/scripts/analytics/ticket009-sufficiency-baselines.cjs --observations=... --manifest=... --out=...
node apps/maine-cannabis/scripts/analytics/ticket010-derived-evidence-state-machine.cjs --baselines=... --out=...
node apps/maine-cannabis/scripts/analytics/ticket011-opportunity-engine.cjs --derived=... --out=...
```

All downstream artifacts must preserve input release IDs, window settlement, page manifest version, policy versions, and measurement state.

## Known gaps

1. Exact-run synthetic probe and synthetic exclusion proof are not commissioned.
2. FAQ/CTA surface coverage remains measurement-limited where attributes are absent.
3. R2 session metrics BigQuery query remains a code-side follow-up.
4. Vercel A4 rows are optional validation input and must not be fabricated.
5. No E2/E3/E4 evaluation is active.
6. No A3 production allowlist exists.

## Readiness rule

Capability readiness is per capability. `proposal drafting ready` never implies `production execution ready`. This inventory is a handback record, not authorization for changes.
