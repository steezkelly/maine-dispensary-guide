# MDG-ANALYTICS-001 Ticket 010 — Implementation Report

**Status:** IMPLEMENTED — derived evidence and pre-investigation state machine
**Date:** 2026-07-12
**Authorization:** Steve explicitly authorized Ticket 010 in-session after Ticket 009 completion
**Spec:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/010-derived-evidence-and-experience-context.md`
**Contract:** `ticket-010.v1`

## Scope delivered

- `apps/maine-cannabis/scripts/analytics/ticket010-derived-evidence-state-machine.cjs`
  - states: `NORMAL`, `WATCH`, `PERSISTENT_SHIFT_CANDIDATE`, `INVESTIGATION_ELIGIBLE`, `MEASUREMENT_BLOCKED`
  - consumes Ticket 009 posterior evidence and explicit measurement/window/change context
  - requires settled windows for persistence
  - uses configurable metric-family practical-effect probabilities
  - requires an additional settled eligibility window after persistence by default
  - permits independent-source corroboration to promote to persistent candidate, not to bypass settled persistence
  - suppresses duplicate operator items when WATCH remains unchanged
  - joins change/deployment context before investigation eligibility
  - preserves Core Web Vitals field-percentile/source semantics
  - blocks performance labels when measurement is blocked
  - emits stable opportunity deduplication keys and an immutable investigation snapshot when eligible
  - emits no recommendations, edit instructions, causal conclusions, or Ticket 011 opportunity actions
  - writes no production data and makes no network calls

- `apps/maine-cannabis/scripts/analytics/ticket010-derived-evidence-state-machine.test.cjs`
  - 34 passing tests covering all required states, blocking conditions, persistence, corroboration, duplicate suppression, deduplication, C WV semantics, investigation snapshots, and no-recommendation invariants.

- `apps/maine-cannabis/package.json`
  - added `data:mdg:analytics:derived` CLI entry point.

## Verification evidence

```text
Ticket 010: 34/34 passed
Ticket 009 regression: 35/35 passed
Ticket 008 regression: 32/32 passed
Ticket 007 regression: 25/25 passed
Data-integrity: all docs match reality
verify:iterate: clean
```

The CLI was exercised with local fixture baseline evidence. Fixture output is not production analytics evidence and was not committed.

## State contract

- `NORMAL`: no configured practical shift or insufficient evidence.
- `WATCH`: first practical shift candidate.
- `PERSISTENT_SHIFT_CANDIDATE`: practical shift persists across the configured settled windows or has independent corroboration.
- `INVESTIGATION_ELIGIBLE`: persistence threshold, change-context evaluation, task contract, measurement health, and settled-window requirements all pass.
- `MEASUREMENT_BLOCKED`: source, window, task, comparability, or change-contamination conditions prevent performance classification.

`INVESTIGATION_ELIGIBLE` means diagnostic effort is justified. It is not a recommendation or edit instruction.

## 2026-07-17 reconciliation amendment

- Durable opportunity output now requires an explicit `detected_at` timestamp; the CLI can inject it with `--detected_at=ISO-8601`.
- Identical inputs plus the same timestamp produce byte-identical Ticket 010 JSON artifacts.
- The focused suite now passes 43/43 tests, including a durable-file byte-stability regression.

## Invariants preserved

- No raw-rate leaderboard classifier.
- No causal language at the emitted evidence grade.
- No measurement-blocked performance label.
- No universal peer group introduced.
- Core Web Vitals retain field percentile semantics.
- Unchanged WATCH states do not create duplicate operator items.
- Stable deduplication key prevents repeated cases for the same page/task/metric/signal scope.

## Explicit non-actions

- No Ticket 011 opportunity engine.
- No production SEO/content/UX changes.
- No parked MDG-DATA workstreams.
- No A5 Speed Insights work.
- No live API pulls or fabricated production baselines.

## Rollback

```bash
git revert <ticket-010-commit-sha>
npm run verify:push
```

## Next boundary

Stop at Ticket 010. Ticket 011 requires separate authorization and may consume only the versioned derived-evidence/state contract.
