# MDG-ANALYTICS Authority Readiness Handback

**Date:** 2026-07-12
**Status:** READ-ONLY OBSERVATION / INVESTIGATION READY; PRODUCTION EXECUTION NOT AUTHORIZED

## Authority model

| Level | Capability | Readiness | Constraint |
|---|---|---|---|
| A0 | Observation, normalization, ingestion, posterior recomputation, WATCH transitions, audits, deduplication, packet updates | READY | Commissioned capability and provenance required; no production mutation. |
| A1 | Autonomous read-only investigation | READY WITH BUDGET | Measurement health must pass; task must be resolved or diagnostic must specifically investigate classification; every diagnostic updates the full ledger. |
| A2 | Proposal drafting | READY AS NON-AUTHORIZED ARTIFACT | Typed proposal may be drafted after an allowed resolution. Draft is not authority to execute. |
| A3 | Bounded autonomous execution | NOT READY / DISABLED | No exact allowlisted surface/action, maximum scope, verification command, rollback, and evaluation owner have been commissioned. |
| A4 | Human-authorized material intervention | AVAILABLE ONLY AFTER HUMAN AUTHORIZATION | Required for title/meta, H1/task promise, material copy, CTA, internal-link, structured-data, experiment, and retain/revert decisions triggered by analytics. |
| A5 | Prohibited autonomous actions | PROHIBITED | No deletion, redirect/canonicalization, fabricated facts/citations, identity joins, sensitive personalization, or guardrail bypass. |

## Required readiness decisions

| Decision surface | Readiness | Reason |
|---|---|---|
| Observation only | READY | Tickets 007–008 source and normalization contracts passed. |
| Automated WATCH creation | READY | Ticket 010 persistence and blocked-state tests passed. |
| Investigation opportunity creation | READY | Ticket 011 consumes settled eligible transitions and deduplicates cases. |
| Autonomous read-only investigation | READY WITH CONDITIONS | A1 budget, measurement health, task-contract, settlement, and hypothesis-ledger conditions apply. |
| Proposal drafting | READY WITH CONDITIONS | A2-shaped draft only; typed change surface; no authorization hash; no execution. |
| A3 exact allowlisted execution | NOT READY | Disabled by default for MDG-ANALYTICS-001 commissioning. |
| Structured E2 evaluation | NOT READY | Needs approved intervention, primary metric, guardrails, horizon, settlement, and contamination plan. |
| E3 quasi-experimental evaluation | NOT READY | Needs pre-specified control selection, pre-period fit, contamination checks, and sensitivity analysis. |
| E4 randomized experiment | NOT READY | Needs assignment/exposure contract, fixed or valid sequential analysis, exclusion, SRM, integrity, and calibrated simulation. |
| Autonomous production optimization | NOT AUTHORIZED | Ticket 012 handback is not an optimization authorization. |

## Denial conditions

The system must deny or block the following:

1. A raw metric ranking presented as an opportunity without a Ticket 010 state transition.
2. A fresh/unsettled row used to create an opportunity packet.
3. An unresolved measurement or task contract used for performance labeling.
4. A diagnostic with `production_touch=true`.
5. A proposal without typed `change_surface`, exact routes/components, primary metric, guardrails, horizon, decision rule, rollback, and authority fields.
6. A material proposal claiming A0/A1 authority.
7. A proposal with a causal target below E2.
8. Execution without a matching human authorization scope hash.
9. An E0/E1 causal conclusion.
10. A production optimization triggered by a single tail-selected observation.

## Authorization record

- Current production-edit authority: `A4_REQUIRED`.
- Current proposal authorization state: `NOT_AUTHORIZED`.
- Authorization scope hash: null until a human authorizes a specific proposal.
- A3: disabled by default.
- A5: prohibited.
- No authorization is granted by this handback document.

## Evidence

```text
Ticket 007: 25/25
Ticket 008: 32/32
Ticket 009: 35/35
Ticket 010: 34/34
Ticket 011: 39/39
Data integrity: clean
verify:iterate: clean
```

## Human review checklist before any future material intervention

- Confirm the investigation resolution and leading hypotheses.
- Confirm evidence grade and permitted language.
- Confirm exact typed change surface and excluded changes.
- Confirm primary metric, minimum practical effect, harm threshold, guardrails, horizon, settlement lag, and contamination policy.
- Confirm rollback and repository verification plan.
- Generate and authorize an exact scope hash.
- Require execution scope to match the authorized hash.
- Verify production realization separately from code/build correctness.

This handback closes Ticket 012 and intentionally stops before autonomous optimization implementation.
