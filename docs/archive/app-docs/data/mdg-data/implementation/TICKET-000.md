# TICKET-000 — Repository Integration and Legacy Containment

**Status:** complete
**Ticket:** 000
**Date:** 2026-07-11
**Spec authority:** `SPEC-AUTHORITY.md` (Tier 1 invariants unchanged; Tier 2 mechanics recorded)

## Summary

Created the engine's mechanical placement inside the repository. No
production adapter code was written. The decision record at
`apps/maine-cannabis/docs/data/mdg-data/REPO_INTEGRATION_DECISIONS.md`
is the authoritative placement document for Sprint 1 and the reference
for every later `DEVIATION-*` note.

## Files added

- `apps/maine-cannabis/docs/data/mdg-data/REPO_INTEGRATION_DECISIONS.md`
  — Tier 2 decisions: `MDG_DATA_ROOT` default, durable layout,
  Git-tracked publication path, command boundary, package-script names,
  `site-stats.json` read-only strategy, `/market-stats` containment,
  caregiver out-of-scope, `.gitignore` updates, spec-authority
  acknowledgement.

## Files modified

- `/home/steve/projects/maine-dispensary-guide/.gitignore` — appended
  engine-specific ignore rules:
  - `/mdg-data/` — local shadow root if anyone runs inside the repo
  - `/apps/maine-cannabis/src/data/generated/mdg-data/.current-*.tmp/`
  - `/apps/maine-cannabis/src/data/generated/mdg-data/.previous-*.tmp/`
  - `/apps/maine-cannabis/docs/data/mdg-data/decisions/.work/`
  - `current/` is **not** ignored — it must be trackable.

## Files NOT modified (containment confirmed)

- `apps/maine-cannabis/src/lib/site-stats.ts` — read-only
- `apps/maine-cannabis/src/data/site-stats.json` — read-only
- `apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs` — read-only
- `scripts/ocp/fetch-ocp-towns.py` — read-only
- `apps/maine-cannabis/src/pages/market-stats.astro` — read-only
- `apps/maine-cannabis/src/pages/find-a-dispensary.astro` — read-only
  (mentioned in legacy fetcher comments, also legacy)

## Commands run

```bash
mkdir -p /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/data/mdg-data/{implementation,decisions,fixtures}
mkdir -p /home/steve/.hermes/data/mdg-data/{raw,source-checks,normalized,releases,staging}
```

Result: directories created. No errors. No network access.

## Tests run

None. This ticket is a decision record. Verification is the existence
and content of `REPO_INTEGRATION_DECISIONS.md` plus the `.gitignore`
update. Tickets 002+ implement code that exercises the decisions.

## Observed source hashes

N/A — no network access, no source bytes ingested.

## Decisions made

All decisions are documented in `REPO_INTEGRATION_DECISIONS.md` and
cross-referenced here:

1. `MDG_DATA_ROOT` default: `~/.hermes/data/mdg-data`. No silent
   fallback.
2. Durable layout: `raw/`, `source-checks/`, `normalized/`,
   `releases/`, `staging/` (mirrors `ARTIFACT-CONTRACT.md`).
3. Git-tracked publication path:
   `apps/maine-cannabis/src/data/generated/mdg-data/current/`.
4. Command boundary: Node `.cjs` for CLI, TS allowed in
   `src/lib/mdg-data/` for selectors.
5. Package scripts: `data:mdg:check|fetch|normalize|derive|release|verify`
   (implemented starting in Ticket 001).
6. `site-stats.json` compatibility: read-only in Sprint 1, reconciliation
   report in Tickets 007/008, thin compatibility selector in a separate
   migration ticket.
7. `/market-stats`: not wired in Sprint 1; `/data/market/` is the new
   destination.
8. Caregiver/medical: explicitly out of Sprint 1; legacy defects
   remain unfixed.

## Unresolved questions

None. All open questions are deferred to the ticket that owns the
decision:
- Census API transport choice → Ticket 004.
- OCP retail-sales transport discovery → Ticket 009.
- OCP opt-in transport discovery → Ticket 010.
- Atomic-promotion algorithm details → Ticket 011.

## Next ticket

**001 — Source Registry.** May begin now (no dependency on adapter
code, only on the decisions recorded above).

## Specification authority note

This ticket records Tier 2 implementation mechanics only. No Tier 1
invariant is modified. Tier 2 deviations anticipated for future tickets
(see `REPO_INTEGRATION_DECISIONS.md §10`) are listed for transparency
and will each become a separate `DEVIATION-*` record with evidence
when actually exercised.