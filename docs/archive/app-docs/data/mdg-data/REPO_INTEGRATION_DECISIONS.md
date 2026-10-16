# MDG-DATA-001 — Ticket 000 Repository Integration Decisions

**Ticket:** 000 — Repository Integration and Legacy Containment
**Status:** complete (Tier 2 decisions recorded; no production adapter code written in this ticket)
**Date:** 2026-07-11
**Authority:** `SPEC-AUTHORITY.md` (Tier 1 invariants unchanged; this record captures only Tier 2 implementation mechanics)

This document is the **decision record required by Ticket 000**. It is the
single source of truth for the engine's mechanical placement inside the
repository until a future ticket supersedes any of its choices. All choices
are **Tier 2** and may be overridden through a `DEVIATION-*` note with
evidence and invariant review, per `SPEC-AUTHORITY.md`.

---

## 1. Durable Hermes data root

**Environment variable:** `MDG_DATA_ROOT`

**Default:** `~/.hermes/data/mdg-data`

**Rationale:**
- `~/.hermes` already exists and is owned by this user outside any
  repository working tree. It survives service restarts, reboots, and
  workspace resets.
- Spec already calls this path the "approved Hermes durable storage".
- No silent fallback. Commands that read or write durable state fail with
  exit `64` if `MDG_DATA_ROOT` is unset.

**Durability note:** `~/.hermes` is the operator's Hermes home. It is not
backed up by Hermes itself, but is part of the operator's normal backup
regime (Nextcloud / btrbk snapshots of the home directory). Raw CSV /
HTML bytes are content-addressed by SHA-256, so any future move to a
remote object store is a re-materialization, not a re-fetch.

## 2. Durable root layout

```
$MDG_DATA_ROOT/
  raw/                  # content-addressed immutable source bytes
  source-checks/        # JSONL operational log (NOT deterministic)
  normalized/           # immutable parsed snapshots, schema-versioned
  releases/             # one directory per release_id, validated
  staging/              # ephemeral per-run scratch incl. input-lock.json
```

Mirrors the default in `ARTIFACT-CONTRACT.md`. No deviation needed.

## 3. Git-tracked publication path

```
apps/maine-cannabis/src/data/generated/mdg-data/current/
  manifest.json
  products/<slug>.{json,csv,meta.json}
```

- This is the **only** directory under `src/data/generated/mdg-data/`
  that is Git-tracked. It is the artifact tree Astro reads at build time.
- The package also allows `current/` to live entirely under `src/data/`
  (which already tracks `site-stats.json`, `maine-opt-in-towns.json`,
  `authors.json`, etc.).
- `.gitignore` covers the atomic-promotion scratch directories
  (`.current-*.tmp/`, `.previous-*.tmp/`).

**Verification (this ticket):** `apps/maine-cannabis/src/data/generated/`
is not excluded by `.gitignore`. `*.json` and `*.csv` are not in any
ignore rule. A test fixture under `current/` would be tracked.

## 4. Command boundary: Node CommonJS

Operational commands use **`.cjs`** files, matching the existing
repository convention (`apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs`,
`apps/maine-cannabis/scripts/health-check.cjs`). The application is
`"type": "module"`, so `.cjs` is required to use `require()` and the
synchronous error model the legacy scripts depend on.

TypeScript is allowed inside `src/lib/mdg-data/` for selectors / types
that the Astro pages consume; operational CLI commands stay `.cjs`.

## 5. Application package scripts

Following `REPO-INTEGRATION.md`:

```json
"data:mdg:check":     "node ./scripts/data/mdg-data/commands/check.cjs",
"data:mdg:fetch":     "node ./scripts/data/mdg-data/commands/fetch.cjs",
"data:mdg:normalize": "node ./scripts/data/mdg-data/commands/normalize.cjs",
"data:mdg:derive":    "node ./scripts/data/mdg-data/commands/derive.cjs",
"data:mdg:release":   "node ./scripts/data/mdg-data/commands/release.cjs",
"data:mdg:verify":    "node ./scripts/data/mdg-data/commands/verify.cjs"
```

Scripts are added in **Ticket 001** (source registry) so the registry is
the first thing commands can dispatch against. Tickets 002–011 implement
the actual handlers; Ticket 000 only records the naming convention.

## 6. `site-stats.json` compatibility strategy

**Read-only in Sprint 1.** The engine does **not** mutate
`apps/maine-cannabis/src/data/site-stats.json`.

When geographic products ship in Tickets 007/008, the engine emits a
**reconciliation report** under
`apps/maine-cannabis/docs/data/mdg-data/reconciliation/` that compares:

- canonical `retail-licenses-by-municipality` counts (new engine, distinct
  approved retail identity, OCP `Active` + `LICENSE_TYPE == Store` semantics),
- `site-stats.json::activeAdultUseRetailStores` (anchored to OCP 2025
  Annual Report),
- `site-stats.json::currentOcpLicenseeRoster.auRetailStores` (live OCP CSV
  deduped by `(DBA, CITY)` — the legacy identity rule).

A thin **compatibility selector** is added in a later migration ticket
(separate from Sprint 1) that maps the canonical output to
`site-stats.json` field semantics. That migration requires a
`DECISION-*` note approved by the operator — it is **explicitly out of
Sprint 1**.

## 7. Legacy `/market-stats` migration boundary

`apps/maine-cannabis/src/pages/market-stats.astro` is **not wired** to the
new engine in Sprint 1. The page's hard-coded `auSalesHistory`,
`medicalHistory`, `taxHistory`, `countyShare`, `estabTypes`, `productMix`
remain untouched.

`/data/market/` is the new source-pure destination. Any redirect or
canonicalization of `/market-stats` happens only after the new
`/data/market/` products reach documented feature parity and the OCP vs
MRS source-semantic gap is reconciled — explicit decision note required.

## 8. Caregiver / medical normalization

**Explicitly out of Sprint 1.** The known caregiver defects in the
legacy Python fetcher (`elif` suppresses caregiver rows in mixed
municipalities; `cgStores` vs `live.caregiverStorefronts` field
mismatch) remain unfixed. The engine does not normalize or count
caregiver storefronts. They are out of scope until the operator expands
scope through a separate ticket.

## 9. `.gitignore` changes applied this ticket

Added to `/home/steve/projects/maine-dispensary-guide/.gitignore`:

```
/mdg-data/
/apps/maine-cannabis/src/data/generated/mdg-data/.current-*.tmp/
/apps/maine-cannabis/src/data/generated/mdg-data/.previous-*.tmp/
/apps/maine-cannabis/docs/data/mdg-data/decisions/.work/
```

`current/` itself is **not** ignored — it must be trackable.

## 10. Specification authority acknowledgement

This ticket acknowledges `SPEC-AUTHORITY.md`.

**No Tier 1 invariant is being modified.** Every Tier 1 invariant in
`SPEC-AUTHORITY.md §Tier 1` is preserved verbatim:

- OCP and MRS remain separate source families.
- OCP `Active` ≠ "open storefront" (carried in `CONTEXT.md` and
  surfaced in every public copy that uses the retail-license count).
- Snapshots are not used to claim openings or closures.
- Raw bytes are preserved by SHA-256 with the durable root in §1.
- Frozen-input release is implemented in Ticket 011 via input-lock.json.
- Last-known-good promotion is implemented in Ticket 011 via
  same-parent directory rename with rollback.
- Caregiver normalization remains out of Sprint 1.
- No legacy file outside the active ticket scope is being silently
  rewritten.

**Tier 2 deviations recorded for future tickets** (each will get a
`DEVIATION-*` record when actually exercised, with evidence):

- *Possible:* Python may be used for one CSV-heavy adapter if the
  observed source has a row shape where pandas materially reduces
  parser complexity vs Node streaming CSV. Default remains Node CJS.
- *Possible:* Playwright may be replaced by `fetch` + manual HTML
  inspection for the OCP license page if the downloadable CSV link is
  actually a static `<a href>` (low-likelihood — the page text suggests
  an embed). Default remains Playwright.

These are anticipated only; each becomes a formal `DEVIATION-*` note
when the implementing ticket has evidence.

## 11. What this ticket does NOT do

- It does not run a network fetch.
- It does not emit a `source_check`.
- It does not modify any file under `apps/maine-cannabis/src/data/`,
  `apps/maine-cannabis/src/pages/`, or `scripts/ocp/`.
- It does not add a runtime dependency.
- It does not change the application typecheck or build command.

It only: chose roots, wrote a decision record, updated `.gitignore`,
and created the empty directory skeleton. See `TICKET-000.md` for the
completion record.

---

**Decision authority:** Tier 2 implementation mechanics. All decisions
above may be overridden by a later `DEVIATION-*` note per
`SPEC-AUTHORITY.md`. No Tier 1 invariant is touched.