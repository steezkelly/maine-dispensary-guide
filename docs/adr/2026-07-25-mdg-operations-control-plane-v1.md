# ADR: MDG Operations Control Plane v1 — Architecture and Authority

**Date:** 2026-07-25
**Status:** Accepted (operator acceptance 2026-07-26; see Amendment 1 below)
**Program:** MDG-OPS-V1
**Initiative:** OPS-01 (t_c20be169)
**Base SHA:** 546ab267347b9bffa5cbf52e98408d8e288a5430

---

## Context

MDG's production system already contains queueing networks, finite-state
machines, dependency graphs, resource locks, rework loops, a serialized
integration stage, and feedback control. None of these are consistently
captured as analyzable data. The operations-research program
(`OBSERVE → DEFINE → VALIDATE → MEASURE → SIMULATE → DECIDE → CONTROL`)
requires a trustworthy telemetry foundation before any optimization.

This ADR fixes the architecture and authority boundaries for the operations
layer so that every subsequent initiative (OPS-02 through OPS-09) builds on a
stable, non-authoritative analytical substrate.

## Decisions

### D1. Hermes Kanban remains the sole live task authority

The Hermes Kanban board `mdg-site` is the only system that may own, create,
transition, block, dispatch, or complete tasks. No operations-layer artifact
may mutate Kanban state. The operations layer observes; it never commands.

### D2. The operations event layer is derived, append-only, and non-authoritative

Events describe what was observed. They are not an interface for changing live
state. An event that conflicts with live Kanban state is wrong; Kanban is
right. The event ledger may never be used to reconstruct or override task
ownership, dependencies, or release status.

### D3. No second editable task board or task ledger

No initiative in this program may create a competing backlog, state machine,
or editable task registry. The normalized snapshot is a read-only projection
of Kanban at a point in time; it is not a writable store.

### D4. Private operational data stays outside Git

Raw board snapshots, raw workflow-status exports, the event ledger, normalized
snapshots, complete prompts, chain-of-thought, credentials, email contents,
GSC query rows, and personal/financial/health information are stored under a
private root (`~/.hermes/data/mdg-ops` by default, overridable via
`MDG_OPS_ROOT`) with owner-only permissions. Only schemas, ADRs, metric
contracts, privacy doctrine, scripts, synthetic test fixtures, and reviewed
aggregate reports may enter Git.

### D5. Initial history: structured import with a documented cutoff, no inference

The Hermes board SQLite already contains a structured, append-only lifecycle
log — `task_events` (created/claimed/completed/blocked/unblocked/promoted/
archived/...), `task_runs` (started_at/ended_at/outcome/summary), and
`task_links` — beginning 2026-07-14. This is trustworthy structured history,
NOT prose, and it may be ingested as a one-time **historical import** clearly
labeled with its source and cutoff.

Rules for the import and for all observation:

- The import cutoff (the `task_events` epoch start, 2026-07-14) is documented
  on every imported record and in any metric that uses it.
- Cards/transitions **before** the cutoff are left-censored: their current
  state is recorded, their state-entry time is marked unknown, and no
  historical transition time is inferred for them.
- For **no** task — imported or observed — is a state-entry time ever inferred
  from card update timestamps, comments, Git commit dates, file modification
  times, or prose handoffs. Only structured `task_events`/`task_runs` rows
  supply transition times, and only where such a row actually exists.
- Imported events carry a provenance marker (e.g. `source_system: hermes-kanban`
  plus an import-batch label) so they are distinguishable from live observer
  output in every downstream metric.

### D6. Live dispatch behavior is unchanged during the measurement wave

The continuity selector (`scripts/agent/mdg-continuity-check.cjs`) and the
first-eligible dispatch policy remain in force. The shadow advisor (OPS-05)
may rank eligible tasks and explain disagreement, but it does not write to
Hermes, acquire leases, dispatch agents, or become the default policy. No WIP
limit or priority weight is set without a measured baseline and an accepted
ADR (OPS-08).

### D7. Public outputs are reviewed aggregates only

Any document that enters Git or is shared externally contains aggregates,
rates, distributions, and reviewed conclusions. It does not contain raw card
bodies, event rows, task IDs in bulk, personal paths, or private operational
records.

### D8. A verified production release is distinct from card completion

Six completion/release concepts are defined and never conflated:

| Concept | Meaning | Counts toward release throughput? |
|---|---|---|
| card_completed | Hermes card reached terminal done | No |
| initiative_completed | Parent initiative outcome achieved | No |
| verification_pass | Independent verifier recorded PASS | No |
| accepted_candidate | Coordinator accepted a reviewed commit | No |
| integration_completed | Sole integrator merged to origin/main | No |
| verified_production_release | Integration + post-deploy verification + release evidence | **Yes** |

A terminal planning, reconnaissance, documentation, or verification card is
not a website release. The release metric (`verified release throughput`)
counts only `verified_production_release`.

### D9. Missing data resolves to insufficient_data, never zero

Empty samples, unsupported measurements, and censored tasks are reported as
`insufficient_data` (or explicitly separated as censored). They are never
silently converted to zero, which would fabricate a measurement.

### D10. Little's Law is reported with explicit preconditions

Little's Law (`L = λW`) is reported only with: a defined population boundary,
a trustworthy observation window, compatible WIP/throughput/flow-time
definitions sharing that boundary, handled censoring, a reported residual
(`L − λW`), and a coverage warning. A mechanically computable triple is not
sufficient.

## Event and snapshot schemas

- `docs/governance/schemas/mdg-operations-event-v1.schema.json` — 12 initial
  event types; preserves observation time (`observed_at`) distinct from
  occurrence time (`occurred_at`); requires `source_sha256` for idempotent
  re-observation; encodes censoring and release-evidence requirements.
- `docs/governance/schemas/mdg-operations-snapshot-v1.schema.json` — preserves
  `raw_state` alongside `normalized_state`; maps Hermes `done` to
  `card_completed` (never `released`); carries the six completion concepts and
  censoring flags per task.

## Metric contract

See `docs/governance/mdg-operations-metric-contract.md`.

## Privacy doctrine

See `docs/governance/mdg-operations-privacy-doctrine.md`.

## Non-goals for V1 (explicitly deferred)

Reinforcement learning, contextual bandits, a dedicated graph database, Kafka
or RabbitMQ, a durable workflow platform, a deep-learning recommender, an LLM
search layer, automatic live priority control, a public dashboard, a database
or external service. These may become justified later only when measured
failure modes or scale require them.

## Consequences

- Every downstream initiative inherits stable authority boundaries.
- The first observation wave will produce left-censored data; early metrics
  must carry coverage warnings and will be honest about sparse samples.
- The shadow advisor can disagree with first-eligible dispatch without risk,
  because it cannot act.
- A live policy change requires OPS-06 evidence, OPS-07 simulation, and an
  OPS-08 ADR before OPS-09 may implement anything (disabled by default).

---

## Amendment 1 — Operator acceptance and integrity hardening (2026-07-26)

**Accepted by:** operator (Steve), 2026-07-26
**Recorded by:** Hermes Agent (Coordinator), 2026-07-26
**Initiative:** OPS-06A (t_ed53ffa6)

The operator accepts the MDG Operations Control Plane v1 architecture **in
principle**, subject to the integrity and mathematical corrections below. This
is recorded as a dated amendment rather than a silent rewrite of the original
rationale; the original "Proposed" status and decisions above are preserved as
the historical record.

### Accepted invariants (non-negotiable)

1. **Hermes Kanban remains the sole live task authority.** The operations
   ledger, observer, metrics, and advisor are derived, append-only, and
   non-authoritative. They inform; they do not command.
2. **The operations ledger is private, append-only, derived, and
   non-authoritative.** It lives under `~/.hermes/data/mdg-ops`, never in Git.
3. **No simulation or production policy may proceed on insufficient evidence.**
   OPS-07/08/09 are gated on an allowed analytical outcome
   (BOTTLENECK_IDENTIFIED / POLICY_CANDIDATE / EVIDENCE_SUFFICIENT). Completion
   alone is insufficient (see OPS-06A-2).
4. **Raw task-level data remains outside Git.**

### Amendments adopted (OPS-06A)

- **A1 — Verified-candidate integrity gate (OPS-06A-1).** Verifier PASS is bound
  to exact contents via a content-addressed evidence digest (task ID, base SHA,
  sorted changed-path manifest, canonical diff SHA-256, per-file blob SHA-256,
  acceptance commands + exit codes, verification timestamp, verifier outcome,
  evidence-document SHA-256). Integration is fail-closed: the candidate is
  accepted only when the recomputed manifest and diff hash exactly match the
  verifier evidence. This closes the #211/#212 failure class (tested contents
  diverging from merged contents). See
  `~/.hermes/data/mdg-ops/OPS-06A-root-cause-211-212-2026-07-26.md`.
- **A2 — Outcome-aware program gate (OPS-06A-2).** Conditional program
  dependencies require an allowed analytical outcome, not mere completion. The
  analytical result is evidence; the authoritative gate decision lives in the
  Kanban / task-contract control plane. The analytics ledger is never
  authoritative.
- **A3 — Metric and privacy corrections (OPS-06A-3).**
  - M1 distinguishes `measured_zero` / `instrumentation_missing` /
    `measured_nonzero`, with evidence count, coverage state, instrumentation
    state, and a minimum-evidence warning. A valid window with no
    `release_recorded` events is never silently a measured zero.
  - Default summary and JSON stdout contain aggregates only; task IDs require an
    explicit detailed/private mode writing to a path validated beneath
    `MDG_OPS_ROOT` with owner-only permissions.
  - Little's Law uses time-average WIP (L) computed from the event trajectory,
    not an end-of-window state-bucket average. If trustworthy time-average WIP
    cannot be computed, the result is `insufficient_data`, never an
    approximation. P50/P85/P95 remain descriptive and are not substituted for
    mean W.

### Author commit prohibition preserved

The existing prohibition on authors committing their own work is preserved.
Nothing in this amendment changes it; a separate ADR would be required to do so.
The integrity gate (A1) enforces the binding between verification and
integration regardless of who commits.

### GitHub branch-protection recommendations (NOT applied)

The following are recommended for explicit operator approval and are **not**
applied by any agent in this initiative:

- Require status checks to pass before merging (include the focused
  `node --test scripts/operations/tests/*.test.cjs` suite as a required check,
  since the #211/#212 breakage was invisible to the `astro build` job).
- Require linear history / squash-merge only on `main`.
- Require the integrity-gate `verify` check to pass (candidate identity matches
  verifier evidence) as a required status check before merge.
- Restrict force-push and branch deletion on `main`.
- Require at least one approving review (independent verifier) before merge.

---

## Amendment 2 — Remote-review corrections (OPS-06A-R1, 2026-07-26)

**Recorded by:** Hermes Agent (Coordinator), 2026-07-26
**Initiative:** OPS-06A-R1 (remote orchestration review of the OPS-06A
candidate `ce482b78`). The OPS-06A candidate was HELD and NOT merged; this
amendment records the corrections made on a fresh branch
(`fix/ops-06a-r1-remote-review-20260726`) from `ce482b78`, evaluated as a
complete diff against base `6be4b788`.

Remote review found merge-blocking discrepancies between the OPS-06A report, the
accepted metric contract, and the actual candidate. The corrections:

- **A — Little's Law W is the arithmetic mean.** `readyToReleaseFlowTime` now
  reports `mean_hours`; Little's Law uses the arithmetic mean flow time, not a
  percentile. P50/P85/P95 remain descriptive. (CLI-level test proves a skewed
  1h/2h/9h sample yields W = 4h, not the 2h median.)
- **B — One common population boundary.** L, λ, and W share the
  ready → verified-production-release boundary. `accepted`, `card_completed`,
  `done`, `completed`, an ordinary `released` state, branch creation, merge, and
  HTTP success do not count as exits. Non-release departures (cancellation,
  abandonment) make the population incompatible.
- **C — Fail closed on inadequate coverage.** Little's Law returns
  `computable=false` / `residual=insufficient_data` when the opening WIP is
  unknown, left-censored tasks exist at window start, coverage is materially
  incomplete, the window is sparse/unstable, the population is incompatible, or
  any component is missing. "At least one event in window" is not complete
  coverage. Explicit fields: `opening_state_known`, `left_censored_at_start`,
  `nonrelease_departures`, `coverage_state`, `boundary_compatible`,
  `computable`, `insufficiency_reasons`.
- **D — Durable integrity-gate test coverage.** The committed
  `ops-06a-1-integrity.test.cjs` is restored to a reviewed, self-contained core
  suite (no reference to any external/foreign test file). Test counts are
  reported from the committed candidate tree.
- **E — Git mode/type is bound.** The integrity manifest now binds Git
  mode/type into every canonical entry and into `canonical_diff_sha256`, and
  compares it at verification. A chmod (100644 → 100755) or a file→symlink type
  change (100644 → 120000) is rejected. **The integrity claim is therefore full
  candidate/tree identity (path + status + mode/type + content), not merely
  path-and-blob identity.**
- **F — Hardened detailed private output.** The detailed-output path check is
  fail-closed (rejects repository-local destinations, symlink-ancestor escapes,
  output-file symlinks, and lexical `..` escapes), creates 0700 directories,
  writes through a temporary owner-only file and atomic rename, and enforces
  0600 even over a pre-existing 0644 file. No task IDs in stdout.
- **G — Program-gate state compatibility.** The program gate recognizes
  `card_completed` (the observer's normalized completion state) as a completed
  predecessor state, in addition to the raw Kanban statuses.

**Concurrency hazard encountered (recorded for the operator).** During OPS-06A
authoring, the kanban auto-dispatcher spawned worker processes that edited the
author's worktree directly (because the card was created with a worktree
reference), overwriting reviewed files and dropping a foreign test file — the
same hazard that caused finding D. The workers were terminated, the card
archived, and the corrections were re-authored in an isolated worktree that no
card references. This reinforces the need for the enforcement gap noted in
Amendment 1 (the integrity gate is not yet a mechanically mandatory checkpoint).

---

## Amendment 3 — Window semantics, private-evidence hardening, and enforcement status (OPS-06A-R2, 2026-07-26)

**Recorded by:** Hermes Agent (Coordinator), 2026-07-26
**Initiative:** OPS-06A-R2 (remote-review correction round 2). PR #214
(candidate `ccabf0ca`) is held immutable; this amendment records the
corrections on a fresh branch `fix/ops-06a-r2-window-privacy-20260726` from
`ccabf0ca`, evaluated as a complete diff against base `6be4b788`.

### Window semantics (R2-A)

Calculations that require task lifecycle history load the **complete validated
event history** (`ledger.listAll`), never an `observed_at`-filtered subset.
`--from`/`--to` define the **operational occurrence window**, applied on event
`occurred_at` by the metric functions (rate, release, flow-time, queue).
`observed_at` is used **only** for observation/collection coverage. Historical-
import events whose `occurred_at` and `observed_at` differ are handled on
`occurred_at`; carry-in tasks (ready before the window, released inside) are
never silently dropped.

### Measurement state (R2-B)

`verifiedReleaseThroughput` distinguishes:
- `measured_nonzero` — ≥1 qualifying release in the occurrence window;
- `measured_zero` — explicit instrumentation/collector coverage **proves** the
  release emitter was active throughout the window AND no qualifying release
  occurred;
- `instrumentation_missing` / `insufficient_data` — full-window coverage cannot
  be proven. **Zero-release windows fail closed.** A single historical release
  event does NOT prove full-window instrumentation. Explicit fields:
  `measurement_state`, `releases`, `rate_per_week`, `release_event_count`,
  `instrumentation_coverage_state`, `coverage_window`,
  `minimum_evidence_warning`, `insufficiency_reasons`. The production source of
  coverage evidence is OPS-06B; R2 accepts a synthetic/validated coverage
  contract for testing and internal use only.

### One authoritative Little's Law API (R2-C)

`littlesLawComponents` is the **single** authoritative implementation. The old
`timeAverageWip` and `littlesLaw` functions are removed from the exported API.
Carry-in rules: tasks fully completed before the window are ignored (no
opening-state poisoning); a task active at window start is included when opening
state is trustworthy, else the result fails closed; a carry-in release is never
silently dropped; W is the arithmetic mean; L, λ, and W share one population
boundary.

### Observation coverage (R2-D)

`observationCoverage` no longer returns `complete` merely because an event fell
in the window. Coverage is evidence-based (snapshot observations, observer
heartbeats, schedule/cadence evidence, or a supplied validated coverage
contract); otherwise it is `unmeasured`/`insufficient_data`. The CLI's top-level
`coverage:` line and the Little's Law coverage field are consistent.

### Private-output hardening (R2-E, R2-F)

A single shared helper (`scripts/operations/private/mdg-ops-private-output.cjs`)
serves both the metrics and integrity tools. `writePrivateReport` chmods only
`MDG_OPS_ROOT` and its descendants, **stopping exactly at the real private
root** — it never chmods the user's home directory, `/home`, `/tmp`, or any
ancestor above the root; permission failures inside the root fail closed. The
integrity CLI requires an explicit `--out` for `capture-evidence`/`bind-candidate`,
validates it beneath `MDG_OPS_ROOT`, rejects repository-local output / lexical
escape / symlink-ancestor escape / unsafe output-file symlinks, writes through an
owner-only temp file and atomic rename (0700 dirs, 0600 file), and prints only a
redacted confirmation plus the evidence SHA-256 (never the task ID, changed-path
manifest, acceptance commands, or full body). Evidence reads are validated
beneath the root, reject unsafe symlinks, and fail closed on group/other perms.

### Enforcement status (R2-G) — read this precisely

- The integrity gate's **evaluation is fail-closed when invoked**: `verify`
  rejects any candidate that does not match the verifier evidence exactly, and
  fails closed on a dirty worktree, a missing/failing required check, or a
  base/head mismatch.
- **Process-level enforcement is still MANUAL.** No canonical integration
  surface currently mandates invoking the gate. The Integrator checklist, the
  pre-push hook, and CI do **not** yet run the integrity gate or the focused
  operations suite as a required step.
- Therefore the phrase **"integration is fail-closed" must not be used without
  the qualification "when the gate is invoked."** Today, correctness depends on
  the Integrator choosing to run the gate; nothing mechanically blocks a merge
  that skips it.
- **OPS-06B** will wire the integrity gate and the operations suite into the
  canonical integration procedure and CI as mechanically mandatory checkpoints,
  and will introduce structured lifecycle emission plus its coverage evidence
  (the production source for R2-B's `measured_zero`). Until then, the gate is a
  category-A manual control, not a category-B mandatory checkpoint.

---

## Amendment 4 — Final semantics: windowed diagnostics, coverage-evidence closure, redaction (OPS-06A-R3, 2026-07-26)

**Recorded by:** Hermes Agent (Coordinator), 2026-07-26
**Initiative:** OPS-06A-R3 (windowed diagnostics and coverage-evidence closure).
PR #215 (candidate `908f97c7`) is held immutable; this amendment records the
corrections on a fresh branch `fix/ops-06a-r3-diagnostics-coverage-20260726`
from `908f97c7`, evaluated as a complete diff against base `6be4b788`.

### Every displayed metric has an occurrence-window rule (R3-D)

All reported metrics are occurrence-window metrics unless explicitly labeled
lifetime. The operational window (`--from`/`--to`) is applied on `occurred_at`:

- **Arrivals** — `task_created_observed` only, by `occurred_at`; `task_observed`
  (left-censored preexisting cards) excluded; historical imports assigned by
  `occurred_at`.
- **Ready-to-release flow time** — completed primary cohort = released inside the
  window; a release after `window_end` is right-censored (not silently dropped);
  ready after `window_end` excluded; completed before `window_start` excluded;
  left-censored and missing-ready remain explicit.
- **First-pass verification yield** — denominator = tasks whose FIRST
  verification `occurred_at` is inside the window; later verifications do not
  rewrite a historical first-pass result.
- **Rework** — `needs_fix` / failed-verification events by `occurred_at` inside
  the window; distinct affected tasks in the window (not lifetime rework).
- **WIP by state** — latest state at or before `window_end`; tasks with no event
  at/before the cutoff are skipped (future-created tasks never appear as
  `unknown`).
- **Blocked age** — only block/unblock transitions at or before `window_end`; a
  future unblock does not rewrite an earlier report; a future block cannot
  produce a negative age; unknown blocked-entry is `unknown`, not zero.

### Observation coverage and opening-state evidence are distinct (R3-A, R3-B)

Coverage evidence is a **versioned, type-specific contract**
(`mdg-operations-coverage-v1`) with `coverage_kind` ∈ {`observation`,
`release_emitter`, `opening_state`}. Contracts are structurally validated
(schema discriminator, kind, state enum, UTC window with start<end, non-empty
source, kind-mismatch guards, strict field allowlist); `JSON.parse` alone is not
validation. Observation coverage and opening-state evidence are **distinct
contracts**:

- Little's Law is computable **only** when validated `observation` coverage is
  complete for the window **and** validated `opening_state` evidence proves the
  active in-system set at the window start **and** all other population,
  censoring, instrumentation, and mathematical preconditions hold.
- The bare `--opening-state-trustworthy` assertion was **removed**; opening
  state now comes from validated `--opening-state-evidence`.
- The top-level `coverage:` line and the Little's Law `coverage_state` derive
  from the **same** observation contract and cannot disagree.

### Lifecycle-event density is NOT observation coverage (R3-B)

"7 days and 3 timestamps" is a **sample-size diagnostic only**; it cannot
independently set `coverage_state=adequate`. Without validated observation
evidence, coverage is `unmeasured` (never `complete`).

### Active left-censored tasks with unknown ready entry prevent reconciliation (R3-C)

`littlesLawComponents` inspects **all** task timelines and never silently drops a
task without a ready transition. A left-censored / unknown-entry task that may be
active in the window is reported explicitly (`active_left_censored_without_entry`,
`unknown_entry_tasks`) and forces `computable=false`. An opening snapshot may
establish that such a task **exists** for L, but it cannot invent the missing
full ready-to-release duration needed for W (`flow_time_population_complete`).

### Integrity failure output is redacted (R3-F)

`verify`, `worktree-status`, and `bind-candidate` failures print only **stable
redacted reason codes** (`{ ok, reason_count, reason_codes }`) to ordinary
stdout/stderr — never filenames, repository paths, changed paths, SHAs, check
names, acceptance commands, or evidence bodies. Full detailed reasons are written
**only** to an explicitly requested, validated Tier-0 private file
(`--detail-out`). Private-read validation closes the symlink-ancestor escape
(resolves the final real path beneath the real root, rejects symlinked evidence
paths entirely, validates ancestor directories are not group/other-writable,
fails closed on races).

### Enforcement remains manual until OPS-06B (R3-G)

- The integrity gate's evaluation is fail-closed **when invoked**.
- **Process-level enforcement is still manual.** No canonical integration surface
  (Integrator checklist, pre-push hook, CI) currently mandates invoking the gate
  or running the focused operations suite.
- The phrase **"integration is fail-closed" must not be used without the
  qualification "when the gate is invoked."**
- **The full operations suite remains outside current required CI until
  OPS-06B.** OPS-06B will wire the gate and the operations suite into the
  canonical procedure and CI as mechanically mandatory checkpoints, and will
  introduce structured lifecycle emission plus its coverage evidence.
- This amendment does **not** broaden R3 into scheduler enforcement or lifecycle
  emission. OPS-07/08/09 remain blocked/gated; no lifecycle emission, no
  simulation, no live policy, no priority changes, no repository-setting changes.

---

## Amendment 5 — Mandatory Enforcement Foundation (OPS-06B-P1, 2026-07-26)

**Recorded by:** Hermes Agent (Coordinator), 2026-07-26
**Initiative:** OPS-06B-P1 (mandatory enforcement foundation). Phase 1 only — no
structured lifecycle emission, no OPS-07/08/09, no simulation/WIP/policy/scheduler.
Base: `edf00868081eba6e27108b2feaddd16573a22257`. Full design + threat model:
`~/.hermes/data/mdg-ops/OPS-06B-P1-C0-enforcement-design-2026-07-26.md`.

### Decision: selected enforcement architecture

**Architecture B — public-safe candidate-bound attestation consumed by CI** — is
the selected mechanism to convert the integrity gate from category A (manual) to
category B (mechanically required). It is the smallest of the three evaluated
architectures that materially achieves this:

- **A (trusted Integrator posts a redacted commit status)** — REJECTED. Trust
  anchor is a bearer token; forgeable and replayable against another SHA; no
  cryptographic binding to the candidate; stale statuses are not auto-invalidated.
- **B (public-safe attestation + CI recompute)** — SELECTED. The local gate emits
  a redacted attestation (only SHAs, tree SHA, `canonical_diff_sha256`,
  `evidence_sha256`, outcome — no task ID/command/path/body). A `contents: read`
  CI job recomputes the canonical diff and tree SHA **from the git objects** and
  confirms they match, then passes as a required `Integrity Gate` check. Trust
  anchor is git content + CI recompute, not a token. Self-invalidating on base
  move, branch mutation, or force-push.
- **C (trusted GitHub App produces the check)** — DEFERRED. Strongest forgery
  resistance (separate identity) but disproportionate operational/lockout cost for
  a single-operator repo. This is the upgrade path if a genuinely separate reviewer
  identity becomes available.

### Stable required check names

- `Operations Suite` — dedicated `ci.yml` job running
  `node --test scripts/operations/tests/*.test.cjs` on PR→main and push→main
  (synthetic fixtures only; no `MDG_OPS_ROOT`).
- `Integrity Gate` — dedicated `ci.yml` job validating the public-safe attestation
  by recomputing the candidate manifest from git objects.

Both are job `name:` values that become the GitHub check-run contexts a ruleset
can require. Names must exactly match the remote check contexts (proven in Child 3
before any protection is enabled).

### Privacy bridge (Q4)

Private Tier-0 verifier evidence authorizes a GitHub-required status WITHOUT
leaking by means of the attestation: the public artifact carries only hashes and
SHAs; the full evidence (task IDs, commands, paths, bodies) remains under
`MDG_OPS_ROOT` at 0600. The attestation references the private evidence by
`evidence_sha256` only.

### Candidate-binding / chicken-and-egg resolution

The verified candidate is the code-only tree (`scripts/operations/**` + docs). The
attestation is committed as a separate subsequent transport commit at
`.github/integrity-attestations/<candidate-sha>.json`. The CI `Integrity Gate`
recomputes the canonical diff over the code-only pathset (excluding the
attestations directory) between `merge-base(origin/main, HEAD)` and the PR head's
code tree, and confirms it equals the attestation's `canonical_diff_sha256`. The
attestation commit is outside the verified code diff and does not perturb it.

### Category-B qualification (precision per R3-G)

- The **local** integration path is mechanically fail-closed when the canonical
  wrapper (Child 2) is used.
- **GitHub-wide** enforcement is NOT category B until a required status/ruleset
  prevents bypass through the web interface or another client. Until the ruleset
  (Child 3) is enabled by the operator, the checks are produced but not required —
  category A+ (mechanically produced, not yet mechanically required).
- The phrase "integration is fail-closed" must carry the qualification "when the
  canonical wrapper is used locally, and when the GitHub ruleset is active for
  GitHub-side merges."

### Remaining bypasses after P1 (documented, not fixed here)
1. Web-UI/API merges bypass the local pre-push hook — closed only when the Child-3
   ruleset is operator-enabled.
2. An actor with push access can edit `ci.yml` or the attestation in-PR — mitigated
   by protecting the workflow file (Child 3); fully closed only by Architecture C.
3. `git push --no-verify` bypasses the local hook — governance ban + CI backstop.

### Phase 2 (design only, NOT implemented in P1)
Structured lifecycle emission (`verification_completed`,
`candidate_evidence_captured`, `accepted_candidate_bound`, `integration_started`,
`integration_completed`, `release_recorded`, observation / release-emitter /
opening-state coverage) is mapped in the Child-0 design doc with authoritative
source, emission point, idempotency key, occurred_at/observed_at, actor role, SHA
fields, evidence reference, retry/failure behavior, prospective-only flag, and
privacy classification. Production coverage contracts must require versioned kind,
complete window, immutable source reference, `source_sha256`, and (for
opening-state) `opening_snapshot_at` tied exactly to the modeled window start — no
retroactive fabrication from prose, PR timestamps, or Git dates. OPS-07 stays
blocked until a fresh baseline records `BOTTLENECK_IDENTIFIED`, `POLICY_CANDIDATE`,
or `EVIDENCE_SUFFICIENT`.
