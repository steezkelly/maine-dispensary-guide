# ADR: MDG Operations Control Plane v1 — Architecture and Authority

**Date:** 2026-07-25
**Status:** Proposed (pending independent verification and operator acceptance)
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
