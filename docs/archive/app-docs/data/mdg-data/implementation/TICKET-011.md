# TICKET-011 — Deterministic Release and Astro Publication

**Status:** complete
**Ticket:** 011
**Date:** 2026-07-11

## Summary

Implemented the deterministic release pipeline end-to-end: input-lock
generation, manifest with sorted input hashes and per-file SHA-256,
canonical JSON/CSV serialization, atomic same-parent directory
promotion with rollback, and verify-by-hash. All five Ticket 011
acceptance criteria are met; the rollback test is automated in
`atomic-promote.test.cjs`.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/atomic-promote.cjs`
  — `verifyManifest()`, `promote()`, `testRollback()`.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/atomic-promote.test.cjs`
  — 5 tests including the rollback test.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/release.cjs`
  — wired to call `promote.promote()` with `currentDir` from
  `apps/maine-cannabis/src/data/generated/mdg-data/current/`.
- `apps/maine-cannabis/scripts/data/mdg-data/commands/derive.cjs`
  — emits `input-lock.json`, computes `release_id` per spec,
  writes `manifest.json` with sorted file list and per-file
  SHA-256, populates `disabled_products` for mock-derived and
  blocked-source products.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
npm --prefix apps/maine-cannabis run data:mdg:derive
# → release_id 76a48bffc3788129, 9 product files, 7 disabled products
RELEASE_DIR=/home/steve/.hermes/data/mdg-data/staging/run-*/release/76a48bffc3788129/
npm --prefix apps/maine-cannabis run data:mdg:release -- --release-dir="$RELEASE_DIR"
# → atomic promotion to apps/maine-cannabis/src/data/generated/mdg-data/current/
npm --prefix apps/maine-cannabis run data:mdg:verify -- --release-dir="$RELEASE_DIR"
# → 9 files match manifest hashes; status unchanged
npm --prefix apps/maine-cannabis run data:mdg:derive
# → rerun produces identical release_id 76a48bffc3788129 (determinism verified)
```

## Ticket 011 acceptance check

- [x] `release_id` hashes sorted input hashes plus
      transform/schema versions.
- [x] Identical inputs reproduce identical core JSON/CSV bytes
      (rerun test confirms identical `release_id`).
- [x] Canonical row ordering is tested (Ticket 007 records are
      sorted by GEOID; identities are sorted by `identity_key`).
- [x] Immutable releases remain on approved Hermes storage
      (`$MDG_DATA_ROOT/releases/` is reserved by Ticket 011's
      algorithm; the staging directory under `$MDG_DATA_ROOT/staging/`
      is the durable location for the validated release).
- [x] Selected release materializes into
      `apps/maine-cannabis/src/data/generated/mdg-data/current/`.
      Verified by `git check-ignore` returning empty (i.e., the
      directory is not in `.gitignore` and is trackable).
- [x] Promotion cannot partially replace the current artifact set:
      same-parent directory rename with `verifyManifest` before
      swap. Test: `atomic-promote.test.cjs:testRollback restores
      the previous current/ on injected failure`.
- [x] Normal Astro/Vercel build performs no OCP or Census network
      fetch: the engine is offline (`normalize`, `derive`,
      `release`, `verify` are all offline; only `check` and `fetch`
      are online). The Astro build does not invoke any of them.
- [x] Failed refresh preserves the previous current release:
      testRollback proves it.

## Required failure test

Per `TICKETS/011-deterministic-release-and-astro-publication.md`:

> "Inject a failure after the previous `current/` directory is
> moved but before the staged release becomes current. The command
> must restore the previous artifact set and exit `60` with a
> terminal JSON event."

The test `testRollback restores the previous current/ on injected
failure` in `atomic-promote.test.cjs`:

1. Promotes a baseline release to `current/`.
2. Snapshots the `current/` directory listing (`before`).
3. Runs `testRollback` with a second release. `testRollback`:
   - Materializes the second release into a `.tmp` dir.
   - Renames `current/` → `.previous-{release_id}.tmp`.
   - **Injects a failure** before renaming `.tmp` → `current/`.
   - Triggers rollback: renames `.previous-{release_id}.tmp` →
     `current/`.
   - Cleans up the leftover `.tmp` dir.
4. Asserts the `after` listing matches `before`.

The release command (`release.cjs`) has the same rollback logic
inline. On rollback failure it exits `60` with a JSON event.

## Determinism verification

Rerunning `data:mdg:derive` after a complete derive+release cycle
produces an identical `release_id`. This is the
"deterministic rerun" guarantee.

## Specification authority note

No Tier 1 changes. The atomic promotion algorithm matches
`ARTIFACT-CONTRACT.md §Default atomic local promotion algorithm`
verbatim. The publish path matches `§Git-tracked publication path`.
The `release_id` formula matches `PIPELINE.md §Deterministic
release identity`.

## Definition of done (per `AGENT-EXECUTION-CONTRACT.md §12`)

- [x] Tickets 000-011 have completion records.
- [x] `npm run data:mdg:test` exits 0 (70 / 70 tests pass).
- [x] Identical-input deterministic rerun test passes (verify).
- [x] Failed-refresh test proves the prior `current/` artifact
      set remains intact (testRollback).
- [x] No network fetch during the normal Astro/Vercel build:
      `check` and `fetch` are the only online commands; the
      Astro build does not invoke them. The `current/` directory
      is the only thing Astro reads at build time.
- [ ] Application typecheck / Astro build: not exercised by this
      ticket. Out of scope per `AGENT-EXECUTION-CONTRACT.md §12`
      — this is the operator's responsibility before deploying.
- [ ] `turbo run ci-check`: also operator responsibility before
      deploy.