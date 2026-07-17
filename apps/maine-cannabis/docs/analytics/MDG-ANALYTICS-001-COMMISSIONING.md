# MDG-ANALYTICS-001 Commissioning Report

**Date:** 2026-07-12
**Status:** COMMISSIONED FOR READ-ONLY OBSERVATION / INVESTIGATION; NOT COMMISSIONED FOR AUTONOMOUS PRODUCTION OPTIMIZATION
**Branch at handback:** `mdg-analytics-001/ticket-007-ingest`
**Required stopping boundary:** Ticket 012

## Executive decision

The MDG analytics stack is sufficiently implemented for:

- deterministic source observation;
- posterior recomputation;
- automated WATCH creation;
- settled-window investigation opportunity creation;
- read-only diagnostic investigation;
- proposal drafting as an explicitly non-authorized artifact.

It is not commissioned for:

- autonomous production execution;
- A3 bounded execution;
- automatic causal claims;
- E2/E3/E4 evaluation without a separately approved design;
- automatic content, UX, CTA, navigation, schema, or experiment changes.

## Commissioning evidence

| Check | Result | Evidence / limitation |
|---|---|---|
| Source extraction | SUPERSEDED / REJECTED | The 2026-07-12 run (`rel_c5a3f1e37e936ae6`, `run_bff1ae80a22f4b78`) is retained only as `rejected_release.json`; it is not canonical evidence and must not be consumed downstream. |
| GA4 BigQuery/source gates | FAIL / SUPERSEDED | The checked-in `gate-result.json` records G1 failure. The prior all-pass commissioning statement is superseded; no canonical 2026-07-12 release is commissioned. |
| Search Console BDE role proof | FALLBACK DOCUMENTED | GSC BDE is retired/off the critical path by operator decision. GSC/API evidence remains source-specific; no BDE claim is made. |
| Deterministic rerun behavior | PASS | Ticket 007 canonical release identity tests; Ticket 007 25/25. Ticket 008/009/010/011 deterministic fixture tests pass. |
| Exact-run synthetic GA4 collection probe | PARTIAL / NOT COMMISSIONED | GA4 Probe Y passed pipeline-level Playwright verification for 2/3 URLs, but the exact Ticket 005 probe suite with run-attributed `probe_id` and destination echo is not commissioned. |
| Synthetic/test exclusion | NOT PROVEN | `traffic_type=synthetic_probe` reporting exclusion/view proof is not present. Synthetic traffic must not be treated as analytical evidence. |
| Page/task and surface manifests | PASS WITH PROVISIONAL ROWS | `page_task_manifest.v1.jsonl` and `instrumentation_surface_manifest.v1.jsonl` exist. Pages with unresolved/provisional task contracts remain blocked from task-relative classification. |
| Event schema validation | PARTIAL | GA4 custom definitions were operator-verified and R7/R8 are VALIDATED; FAQ/CTA surface coverage remains a separate measurement-health limitation. |
| Late-arrival settlement | PASS | Ticket 007 per-day routing and settled/fresh semantics are implemented and tested. |
| Posterior shrinkage | PASS | Ticket 009 Beta-Binomial prior/posterior and sparse-page shrinkage fixtures pass. |
| Practical-effect probabilities | PASS | Ticket 009 probability and sample-state fixtures pass. |
| WATCH persistence | PASS | Ticket 010 state transitions pass: WATCH → PERSISTENT_SHIFT_CANDIDATE → INVESTIGATION_ELIGIBLE. |
| Measurement-blocked transitions | PASS | Ticket 010 blocks unavailable, unsettled, incomparable, contaminated, and unresolved-task evidence. |
| Change-contamination joins | PASS | Ticket 010 requires evaluated change context before investigation eligibility. |
| Opportunity deduplication | PASS | Ticket 011 refresh fixture produces one case from repeated evidence. |
| Immutable detection snapshot | PASS | Ticket 011 packet fixture freezes first eligibility evidence separately from current evidence. |
| Competing hypotheses | PASS | Ticket 011 creates bounded H0, measurement, demand, packaging, content/UX, and change families. |
| Diagnostic discrimination ledger | PASS | Ticket 011 diagnostics declare supported/weakened hypotheses and update the full ledger. |
| Zero-intervention resolution | PASS | `NO_ACTION_SUPPORTED` is a valid resolution with no proposal. |
| Task-ownership mismatch | PASS | Promise/query/body mismatch adds task-ownership diagnostics; it does not trigger a rewrite. |
| Proposal authority fixture | PASS | Proposal drafts require A4 production authority and begin `NOT_AUTHORIZED`. |
| Unauthorized material-edit denial | PASS | Production-touch diagnostics are rejected; no production mutation is callable from the engine. |
| Scope-hash mismatch denial | DOCUMENTED / NOT EXERCISED IN PRODUCTION | Ticket 008 G4=4c scope hashes were verified. Ticket 011 proposal drafts carry a null authorization hash until human authorization. |
| E0–E4 language enforcement | PASS FOR PACKETS | E0/E1 packets set `causal_language_allowed=false`; E2/E3/E4 are reserved for actual approved designs. |
| Randomized-decision simulation | NOT COMMISSIONED | No automated E4 decision loop is enabled. Null/positive/harmful simulation is a precondition for future experiment authority. |
| Quiet-when-healthy behavior | PASS IN CONTRACT | Unchanged WATCH is suppressed; routine recomputation does not create duplicate operator cases. |

## Test totals

```text
Ticket 007: 25/25
Ticket 008: 32/32
Ticket 009: 35/35
Ticket 010: 34/34
Ticket 011: 39/39
Data integrity: clean
verify:iterate: clean
```

## Commissioning conclusion

The stack is commissioned for observation, WATCH creation, settled-window investigation opportunity creation, read-only investigation, and non-authorized proposal drafting. Measurement-health limitations are represented as blocked states rather than performance labels. No autonomous optimization implementation may begin after this handback.
