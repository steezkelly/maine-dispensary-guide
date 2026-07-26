# MDG Operations Privacy and Data-Boundary Doctrine v1

**Date:** 2026-07-25
**Status:** Accepted (operator acceptance 2026-07-26; amended by OPS-06A-3 — see ADR Amendment 1)
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

**Tool output redaction (OPS-06A-3, hardened by OPS-06A-R1 finding F).** The
default summary and JSON stdout of any operations tool (e.g. `ops:metrics`)
contain **aggregates only**. Task IDs (such as `releaseTaskIds`) and other
task-level detail are **never** printed to ordinary console output. If detailed
task-ID-level output is required, it must be behind an explicit detailed/private
mode that:

- writes to an output path **validated to be beneath `MDG_OPS_ROOT`** (Tier 0),
- creates the file with **owner-only permissions** (0600), and
- still emits **no task IDs in ordinary console output** (stdout carries only
  aggregates plus a pointer to the private file).

**Fail-closed private-output path validation (OPS-06A-R1 finding F).** The
detailed-output path check is fail-closed and equivalent to the ledger's safety
model. It must reject:

- a **repository-local** destination (output inside the repo);
- an output path whose **existing symlink ancestor escapes** `MDG_OPS_ROOT`;
- an output file that is **itself an unsafe symlink**;
- a **lexical `..` escape** (caught before touching the filesystem).

It must ensure parent directories remain beneath the real private root, create
private directories with **0700**, write through a **temporary owner-only file
and atomic rename**, and enforce the final file as **0600 even when replacing a
pre-existing 0644 file**.

**chmod stops at the private root (OPS-06A-R2 finding E).** The directory
permission walk creates/chmods **only `MDG_OPS_ROOT` and the descendants needed
for the report**, stopping **exactly at the real (symlink-resolved) private
root**. It **never** chmods the user's home directory, `/home`, `/tmp`, or any
ancestor above the private root. Permission failures **inside** the private root
**fail closed** (they throw); they are never silently ignored.

**Integrity evidence is Tier 0 (OPS-06A-R2 finding F).** The integrity CLI
(`capture-evidence`, `bind-candidate`) treats evidence as Tier 0 operational
data:

- an explicit `--out` path is **required** (evidence is never printed to stdout);
- the `--out` path is validated beneath the real `MDG_OPS_ROOT`, rejecting
  repository-local output, lexical escape, symlink-ancestor escape, and unsafe
  output-file symlinks;
- directories are created 0700 (stopping at the private root); the file is
  written through an owner-only temp file and atomic rename and enforced 0600;
- stdout carries **only** a redacted confirmation and the evidence SHA-256 —
  never the task ID, changed-path manifest, acceptance commands, or full body.

Evidence **reads** are validated beneath `MDG_OPS_ROOT`, reject unsafe symlinks,
and **fail closed** on group/other-readable permissions (Tier 0 evidence must be
owner-only). A single shared private-output helper
(`scripts/operations/private/mdg-ops-private-output.cjs`) serves both the metrics
and integrity tools so there are not two subtly different security
implementations.

**Private-read symlink-ancestor escape is closed (OPS-06A-R3 finding E).** Read
validation resolves the **final real path** (`fs.realpathSync`) and proves it is
beneath the real (symlink-resolved) `MDG_OPS_ROOT`; rejects **symlinked evidence
paths entirely** (the final component must not be a symlink); inspects each
existing path component beneath the root and rejects any escaping symlink
ancestor; validates the final object is a regular owner-only (0600) file;
validates private ancestor directories are **not group/other-writable**
(accepted directory rule: `(mode & 0o022) === 0`, permitting conventional
0755/0700 dirs but rejecting 0775/0777); and **fails closed on races or
permission errors**.

**Integrity failure output is redacted (OPS-06A-R3 finding F).** `verify`,
`worktree-status`, and `bind-candidate` failures print only **stable redacted
reason codes** (`{ ok, reason_count, reason_codes }`) to ordinary stdout/stderr —
never filenames, repository paths, changed paths, SHAs, check names, acceptance
commands, or evidence bodies. Full detailed reasons are written **only** to an
explicitly requested, validated Tier-0 private file (`--detail-out`). The
top-level error handler likewise emits only a stable code, never the raw
validation message.

This keeps task-level operational data in Tier 0 by default; promotion to any
shared surface still requires the reviewer redaction check above.

---

## Authority boundary (privacy-relevant)

The operations layer may read Kanban and workflow state to derive events. It
may not write to Kanban, Git, the Hub, or any public report as a side effect
of observation. The ledger is append-only and non-authoritative; it is never
an interface for changing live state.
