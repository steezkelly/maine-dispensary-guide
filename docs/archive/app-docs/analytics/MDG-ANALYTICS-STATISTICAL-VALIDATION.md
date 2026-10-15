# MDG-ANALYTICS Statistical Validation Handback

**Date:** 2026-07-12
**Status:** VALIDATED FOR DESCRIPTIVE / ASSOCIATIONAL READ-ONLY USE; E2/E3/E4 NOT COMMISSIONED. This document does not authorize production execution or production optimization.

## Upstream evidence contract

Ticket 007 supplies source-specific GA4 observations and settlement/provenance fields. Ticket 008 supplies canonical page-window normalization and cross-source join semantics. Ticket 009 consumes those observations for sufficiency/posterior baselines; Tickets 010–011 consume only the versioned downstream contracts.

### Ticket 009 posterior baseline

The baseline engine is metric-specific and peer-context aware. It preserves:

- peer cell and fallback level;
- page archetype/task context;
- sufficiency thresholds;
- prior parameters and posterior parameters;
- posterior mean;
- 80% and 95% credible intervals;
- practical-effect probabilities;
- explicit sample-state and insufficiency reasons.

Sparse observations shrink toward a declared prior rather than ranking pages by unstable raw rates. Metrics are not pooled across families.

### Ticket 010 evidence state

The state engine consumes the versioned baseline contract and requires:

- settled or explicitly comparable windows;
- measurement health;
- resolved task contract or an explicitly allowed classification investigation;
- evaluated change context;
- persistence before investigation eligibility.

It emits `WATCH`, `PERSISTENT_SHIFT_CANDIDATE`, `INVESTIGATION_ELIGIBLE`, and `MEASUREMENT_BLOCKED` states. A WATCH state is not an intervention recommendation.

### Ticket 011 opportunity evidence

The opportunity engine consumes state transitions, not raw metric rankings. It validates:

- stable opportunity IDs across evidence refresh;
- one unresolved case per deduplication key;
- immutable first-detection snapshot;
- current-evidence refresh separate from detection evidence;
- mandatory E0–E4 grade field;
- E0/E1 causal-language prohibition;
- tail-selection flag;
- bounded competing hypotheses;
- diagnostic-to-hypothesis discrimination ledger;
- zero-intervention resolution;
- authority level and typed proposal contract.

## Fixture validation record

| Fixture / property | Result | Evidence |
|---|---|---|
| Beta-Binomial posterior | PASS | Ticket 009: 35/35 tests. |
| Sparse-page shrinkage | PASS | Ticket 009 shrinkage fixture. |
| Practical-effect probability | PASS | Ticket 009 posterior probability fixture. |
| Insufficient sample | PASS | Ticket 009 sample-state fixture. |
| WATCH persistence | PASS | Ticket 010: 34/34 tests. |
| Measurement blocked | PASS | Ticket 010 blocked-state fixtures. |
| Change contamination | PASS | Ticket 010 change-context gate. |
| Settled-only opportunity creation | PASS | Ticket 011 rejects fresh rows. |
| Opportunity refresh deduplication | PASS | Two settled refreshes produce one case and two append-only events. |
| Immutable snapshot | PASS | First-window posterior remains unchanged after refresh. |
| Competing hypotheses | PASS | Six bounded families; task mismatch adds ownership review. |
| Diagnostic discrimination | PASS | Positive/negative ledger updates full hypothesis set. |
| Zero-intervention resolution | PASS | `NO_ACTION_SUPPORTED` creates no proposal. |
| E0/E1 language enforcement | PASS | `causal_language_allowed=false`. |
| Null-effect simulation | NOT COMMISSIONED | No automated randomized-decision engine is enabled. |
| Positive-effect simulation | NOT COMMISSIONED | Requires an approved experiment design and calibrated decision rule. |
| Harmful-effect simulation | NOT COMMISSIONED | Requires guardrail and loss-function calibration. |

## Causal evidence policy

- E0: observed/measured/reported only.
- E1: associated/coincident/candidate/warrants investigation only.
- E2: structured before/after evidence with pre-specified metric, settlement, seasonality, contamination, and practical-effect rules.
- E3: controlled quasi-experiment with defensible controls, pre-period fit, contamination checks, and sensitivity analysis.
- E4: randomized experiment with assignment, exposure, guardrails, stopping rule, exclusion, sample-ratio check, and integrity check.

No implementation may upgrade evidence grade based on posterior confidence alone. A before/after chart is not causal proof. Repeated randomized looks require fixed-horizon, group-sequential, or anytime-valid analysis.

## Statistical readiness decision

- Descriptive E0/E1 observation: READY.
- Bayesian posterior recomputation: READY for declared metric contracts.
- Automated WATCH creation: READY.
- Investigation opportunity creation: READY after settled and measurement gates.
- Read-only diagnostic investigation: READY under A1 budget and ledger rules.
- E2 evaluation: NOT READY without a separately approved intervention/evaluation contract.
- E3 evaluation: NOT READY; control selection and fit diagnostics are not commissioned as an active design.
- E4 randomized experiment: NOT READY; no calibrated simulation or active assignment system is commissioned.

## Known statistical limitations

- Low traffic and late-arrival settlement widen uncertainty.
- Search outcomes include query mix, ranking, seasonality, competitor, and external-system effects.
- Regression to the mean remains a risk for tail-selected pages.
- Missing/blocked source coverage is represented as measurement state, not imputed performance.
- GA4 Probe Y found a real 2/3 URL visibility result and a Portland discrepancy; this is diagnostic evidence, not causal proof.
