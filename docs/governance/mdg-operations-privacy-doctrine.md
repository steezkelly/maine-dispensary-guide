# MDG Operations Privacy and Data-Boundary Doctrine v1

**Date:** 2026-07-25
**Status:** Proposed (pending independent verification)
**Authority:** ADR `docs/adr/2026-07-25-mdg-operations-control-plane-v1.md`

This doctrine governs what operational data may be stored where, and what may
enter Git or any public/shared surface. It applies to every OPS initiative.

---

## Storage tiers

### Tier 0 — Private (never in Git)

Stored under the private root `~/.hermes/data/mdg-ops` (override via
`MDG_OPS_ROOT`), owner-only permissions (directories and files `0700`/`0600`).

- Raw Hermes board snapshots (full `hermes kanban ... list --json` output)
- Raw workflow-status exports
- The operations event ledger (raw events)
- Normalized snapshots (task-level detail)
- Complete prompts and chain-of-thought
- Credentials, tokens, API keys
- Email contents
- GSC query rows
- Personal, financial, or health information
- Task-ID-level operational detail

The private root must be validated: a root inside the repository is rejected; a
symlink alias resolving into the repository is rejected. Health/diagnostic
output prints counts, dates, schema versions, hashes, and status only — never
record bodies.

### Tier 1 — Reviewed aggregates (may enter Git)

- Schemas (`docs/governance/schemas/*.schema.json`)
- ADRs and governance documents
- Metric and privacy doctrine
- Scripts and deterministic tests
- Synthetic test fixtures
- Reviewed aggregate reports (rates, distributions, conclusions) with no
  task-level detail, no raw card bodies, no personal paths

### Tier 2 — Public website

The operations layer writes nothing to the public site. No dashboard, no
public API, no external service in V1.

---

## Hard prohibitions

1. No raw board or workflow snapshot is committed.
2. No raw event or normalized snapshot row is committed.
3. No complete prompt or chain-of-thought is stored in the ledger.
4. No GSC query row, email, credential, token, or personal data is stored in
   the ledger or committed.
5. No error message prints a private record body.
6. No test fixture contains real card bodies, real personal paths, real
   prompts, or real operational records — synthetic only.
7. Temporary test roots are cleaned up.

---

## Fixture discipline (OPS-01 and beyond)

All fixtures under `scripts/operations/tests/fixtures/` are synthetic:

- Task IDs use the `t_synthetic*` / `t_preexisting*` / `t_donecard*` pattern.
- Paths use `/synthetic/...`.
- SHAs are placeholder hex, not real commit or content hashes.
- No real URL carries private query parameters; production URLs in fixtures
  reference only the public host and a synthetic route.

A fixture that accidentally contains real data is a privacy defect and fails
verification.

---

## Redaction rule for aggregates

When an aggregate is promoted from Tier 0 to Tier 1 (e.g. a baseline brief),
the reviewer confirms:

- No task ID appears unless it is a synthetic example.
- No card body, prompt, or personal path appears.
- Counts and rates cannot be reverse-engineered into a private record.
- The evidence window and coverage state are stated.

---

## Authority boundary (privacy-relevant)

The operations layer may read Kanban and workflow state to derive events. It
may not write to Kanban, Git, the Hub, or any public report as a side effect
of observation. The ledger is append-only and non-authoritative; it is never
an interface for changing live state.
