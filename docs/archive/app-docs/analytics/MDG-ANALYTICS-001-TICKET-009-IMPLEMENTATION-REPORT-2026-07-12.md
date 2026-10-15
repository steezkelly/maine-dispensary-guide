# MDG-ANALYTICS-001 Ticket 009 — Implementation Report

**Status:** IMPLEMENTED — read-only sufficiency and baseline engine
**Date:** 2026-07-12
**Authorization:** Steve explicitly authorized Ticket 009 in-session after Ticket 008 completion
**Spec:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/009-sufficiency-and-archetype-baselines.md`
**Contracts:** `ticket-009.v1`, `query-intent.v1`, `metric-peer-policy.v1`

## Scope delivered

- `apps/maine-cannabis/scripts/analytics/ticket009-sufficiency-baselines.cjs`
  - deterministic, versioned query-intent distributions
  - intents: named operator, local store discovery, visitor local, market entry, licensing/regulatory, how-to, data research, unknown
  - metric-specific peer policies for:
    - GSC CTR
    - active attention rate
    - action selection rate
    - progression rate
  - contextual peer dimensions only; no universal page peer group
  - explicit hierarchical fallback levels and peer counts
  - sparse-cell fallback is recorded, never silent
  - empirical-Bayes Beta prior estimation from selected peers
  - Beta posterior mean
  - 80% and 95% credible intervals
  - practical-upside and practical-harm probabilities
  - shrinkage for sparse pages
  - explicit sample states: `insufficient`, `directional`, `decision_eligible`
  - unresolved task contracts become `MEASUREMENT_BLOCKED: TASK_CONTRACT_UNRESOLVED`
  - raw-rate leaderboard is explicitly marked ineligible
  - output manifest includes status counts, provenance, and output hash
  - offline only; no network calls, production writes, or page edits

- `apps/maine-cannabis/scripts/analytics/ticket009-sufficiency-baselines.test.cjs`
  - 35 passing tests covering classifier determinism, distribution versioning, metric policy separation, Beta math, prior estimation, peer fallback, shrinkage, intervals, practical probabilities, unresolved tasks, provenance, and non-leaderboard behavior.

- `apps/maine-cannabis/package.json`
  - added `data:mdg:analytics:baselines` CLI entry point.

## Verification evidence

```text
Ticket 009: 35/35 passed
Ticket 008 regression: 32/32 passed
Ticket 007 regression: 25/25 passed
Data-integrity: all docs match reality
verify:iterate: clean
```

The CLI was exercised against explicit local fixture observations and the real page manifest. The fixture observations were not represented as production analytics evidence and were not committed.

```text
Fixture output: 4 baseline rows
Query distributions: 3 page-window rows
States: 3 directional, 1 insufficient
```

## Invariants preserved

- No universal `peer_group_id`.
- Editorial `section`, `topics`, and regional clusters are not direct statistical priors.
- Peer membership is contextual and pre-outcome.
- Task-unresolved pages are blocked from task-relative classification.
- Raw-rate ranking is not a decision classifier.
- No causal claims or production interventions are emitted.
- A5 Speed Insights remains outside this ticket and blocked/deferred.

## Explicit non-actions

- No Ticket 010 derived state machine.
- No Ticket 011 opportunity engine.
- No production SEO/content/UX changes.
- No parked MDG-DATA workstreams.
- No A5 Speed Insights work.
- No live API pulls or fabricated Vercel baselines.

## Rollback

```bash
git revert <ticket-009-commit-sha>
npm run verify:push
```

## Next boundary

Stop at Ticket 009. Ticket 010 requires separate authorization and may consume only this versioned baseline contract.
