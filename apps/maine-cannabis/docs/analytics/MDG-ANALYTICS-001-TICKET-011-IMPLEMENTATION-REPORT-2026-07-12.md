# MDG-ANALYTICS-001 Ticket 011 — Implementation Report

**Status:** IMPLEMENTED — governed opportunity/investigation engine
**Date:** 2026-07-12
**Authorization:** Steve explicitly authorized Ticket 011 in-session after Ticket 010 completion
**Spec:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/011-opportunity-engine.md`
**Contracts implemented:** `ticket-011.v1`, `opportunity.v0.5`, intervention-proposal validation contract

## Scope delivered

- `apps/maine-cannabis/scripts/analytics/ticket011-opportunity-engine.cjs`
  - consumes `INVESTIGATION_ELIGIBLE` settled transitions only
  - creates durable investigation packets rather than raw-metric rankings
  - preserves stable opportunity IDs across settled-window refreshes
  - prevents duplicate unresolved cases through a stable deduplication key
  - freezes an immutable detection snapshot at first eligibility
  - maintains current evidence separately from the immutable snapshot
  - assigns mandatory E0–E4 grades, defaulting descriptive opportunity packets to E1
  - constrains causal language for E0/E1
  - preserves tail-selection and change-contamination flags
  - creates bounded competing hypotheses:
    - no action/noise
    - measurement/classification
    - demand/query mix
    - packaging/task promise
    - page content/UX
    - change contamination
  - routes promise/task mismatch through task-ownership investigation
  - declares read-only diagnostics and which hypotheses they discriminate
  - updates every live hypothesis through an append-only diagnostic ledger
  - supports zero-intervention resolutions
  - validates typed intervention proposal drafts without authorizing or executing them
  - machine-reads A1 investigation authority and A4 production authority requirement
  - enforces no production-touch diagnostics
  - emits no production edits, recommendations, or automatic causal conclusions

- `apps/maine-cannabis/scripts/analytics/ticket011-opportunity-engine.test.cjs`
  - 39 passing tests covering durable identity, deduplication, immutable snapshots, hypothesis coverage, diagnostics, resolution codes, task ownership, typed proposals, authority, causal constraints, and production-mutation boundaries.

- `apps/maine-cannabis/package.json`
  - added `data:mdg:analytics:opportunities` CLI entry point.

## Verification evidence

```text
Ticket 011: 39/39 passed
Ticket 010 regression: 34/34 passed
Ticket 009 regression: 35/35 passed
Ticket 008 regression: 32/32 passed
Ticket 007 regression: 25/25 passed
Data-integrity: all docs match reality
verify:iterate: clean
```

The CLI was exercised with local Ticket 010-shaped fixture evidence. No production analytics data was fabricated or committed.

## 2026-07-17 reconciliation amendment

- Final packets now require the upstream `detected_at` timestamp and preserve Ticket 010 top-level canonical/acquisition release IDs in the immutable snapshot.
- Diagnostic, resolution, and proposal APIs require explicit operation timestamps instead of substituting wall-clock time.
- Identical timestamped evidence produces byte-identical final packets; the focused suite now passes 45/45 tests.

## Authority boundary

- Investigation packets: A1 read-only authority.
- Proposal drafting: A2-shaped artifact only after an allowed investigation resolution.
- Material production change: A4 required.
- A3 remains disabled by default.
- Proposal drafts begin `DRAFT`, `NOT_AUTHORIZED`, with no authorization scope hash.
- Diagnostics with `production_touch: true` are rejected.

## Explicit non-actions

- No production SEO/content/UX/CTA/internal-link changes.
- No intervention execution.
- No automatic recommendation generation.
- No Ticket 012 commissioning handback.
- No A5 Speed Insights work.
- No parked MDG-DATA workstreams.

## Rollback

```bash
git revert <ticket-011-commit-sha>
npm run verify:push
```

## Next boundary

Stop at Ticket 011. Ticket 012 commissioning and handback require separate authorization/review and remain the stopping boundary.
