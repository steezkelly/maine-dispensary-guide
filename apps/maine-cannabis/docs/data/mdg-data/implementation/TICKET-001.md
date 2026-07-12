# TICKET-001 — Source Registry

**Status:** complete
**Ticket:** 001
**Date:** 2026-07-11

## Summary

Created the declarative source registry for the four Sprint 1 sources,
plus a Node `.cjs` validator/loader, six command skeletons (`check`,
`fetch`, `normalize`, `derive`, `release`, `verify`), the package-script
aliases in `apps/maine-cannabis/package.json`, and a self-contained test
that runs without external dependencies.

No network access, no source bytes ingested.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/sources.json` — declarative
  registry, schema_version 1, four sources
  (`ocp_licenses`, `ocp_retail_sales`, `ocp_optin`,
  `census_acs5_population`)
- `apps/maine-cannabis/scripts/data/mdg-data/lib/registry.cjs` —
  loader + validator. Enforces: schema_version 1, unique source_ids,
  required fields, ACS pin to `vintage=2024` + `variable_id=B01003_001E`,
  no April-2026 hard-coded OCP URLs
- `apps/maine-cannabis/scripts/data/mdg-data/commands/check.cjs` —
  Ticket 001 stub. Validates args + source_id, exits 64 on misuse, 0 on
  known id with `code: ADAPTER_NOT_YET_WIRED`
- `…/commands/fetch.cjs`, `…/normalize.cjs`, `…/release.cjs` — same
  pattern, one command name each
- `…/commands/derive.cjs` — accepts `--input-lock=<path>`, validates
  `inputs[]`/`schema_version`/`transform_version`
- `…/commands/verify.cjs` — *real* implementation: reads `manifest.json`
  with `files[]` and verifies every SHA-256; exit 50 on mismatch,
  exit 0 with `code: OK` on clean
- `apps/maine-cannabis/scripts/data/mdg-data/tests/registry.test.cjs`
  — 11 self-contained tests using `assert` + `child_process.spawnSync`
- `apps/maine-cannabis/docs/data/mdg-data/fixtures/` — empty placeholder
  for future source-derived fixtures (Tickets 003/004/009/010)

## Files modified

- `apps/maine-cannabis/package.json` — added six `data:mdg:*` scripts
  plus `data:mdg:test`

## Files NOT modified

All legacy files listed in `REPO_INTEGRATION_DECISIONS.md §6` and §7
remain untouched.

## Commands run

```bash
mkdir -p apps/maine-cannabis/scripts/data/mdg-data/{commands,adapters,lib,fixtures}
mkdir -p apps/maine-cannabis/src/lib/mdg-data
node apps/maine-cannabis/scripts/data/mdg-data/tests/registry.test.cjs
```

Result: 11 / 11 tests pass.

```
ok  real registry file loads with schema_version 1
ok  real registry lists all four required source_ids (sorted)
ok  census source has vintage=2024 and variable_id=B01003_001E
ok  no OCP source hard-codes an April 2026 CSV URL
ok  registry validator rejects duplicate source_id
ok  registry validator rejects non-2024 ACS vintage
ok  registry validator rejects hard-coded April 2026 URL
ok  verify command passes on a hand-built release dir
ok  verify command fails on tampered release file (exit 50)
ok  check command skeleton accepts known source_id (exit 0)
ok  check command skeleton rejects unknown source_id (exit 64)
```

Also exercised directly:

```bash
$ npm run data:mdg:check -- --source=ocp_licenses   # exit 0, code ADAPTER_NOT_YET_WIRED
$ npm run data:mdg:check -- --source=does_not_exist # exit 64, code UNKNOWN_SOURCE_ID
$ npm run data:mdg:check                            # exit 64, code USAGE_ERROR
$ npm run data:mdg:verify -- --release-dir=<tmp>    # exit 0 on hash match, 50 on mismatch
```

## Observed source hashes

N/A — no network access, no source bytes ingested.

## Decisions made

1. **Command names** match `AGENT-EXECUTION-CONTRACT.md §4` exactly:
   `data:mdg:check`, `data:mdg:fetch`, `data:mdg:normalize`,
   `data:mdg:derive`, `data:mdg:release`, `data:mdg:verify`. No
   deviation needed.
2. **Adapter versions** recorded per source: `1` for `ocp_licenses`
   and `census_acs5_population` (stable schema), `0` for
   `ocp_retail_sales` and `ocp_optin` (transport discovery still
   required — promoted to `1` once Tickets 009/010 settle it).
3. **Census endpoint pattern** recorded in the registry as the
   documented ACS API URL for `state:23` + `county subdivision:*` +
   `B01003_001E`. The pattern is a Tier-2 implementation choice;
   any deviation (e.g., API key vs keyless path) gets a
   `DEVIATION-*` record.
4. **OCP sources use page-scrape discovery** for `ocp_licenses` and
   transport-discovery for the two dashboard-backed sources
   (`ocp_retail_sales`, `ocp_optin`).
5. **Test framework**: pure Node `assert` + `child_process.spawnSync`,
   no Mocha/Chai/Jest dependency. Fits the spec's "prefer existing
   workspace deps" rule.

## Unresolved questions

None for this ticket. The endpoints and content shapes for OCP sales
and opt-in remain open for Tickets 009/010 (transport discovery).

## Next ticket

**002 — Source Check Log and Immutable Raw Store.** May begin now.
Sources registry is the dependency; commands 003/004/009/010 need the
raw-store + source-check paths implemented in 002 to actually fetch
bytes.

## Specification authority note

This ticket records Tier 2 implementation mechanics only. No Tier 1
invariant is modified. The Tier-2 default command names from
`AGENT-EXECUTION-CONTRACT.md §4` are adopted without deviation. The
Tier-2 default `.cjs` command boundary from
`REPO_INTEGRATION_DECISIONS.md §4` is followed. The Tier-2 default
test approach (Node `assert`, no new dep) is followed.