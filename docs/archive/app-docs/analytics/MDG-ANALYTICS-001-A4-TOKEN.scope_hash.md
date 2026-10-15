# MDG-ANALYTICS-001 — A4 Token Batch Approval — Authorization Scope Hash

This companion file holds the byte-content hash for the proposal at:
  /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-A4-TOKEN-BATCH-APPROVAL-2026-07-12.md

Computed 2026-07-12 (UTC). Update on every proposal revision.

## Full-proposal hash (proves the entire file as-written)
  eb6e0e942920bca783effee30b85f6d1c5a396629da89792c223c229c3a02fed

## Operator authorization gate

Three confirmations required before AUTHORIZED status:

1. "steezkelly" scope is a single Vercel team (not a user with multiple teams).
2. Token created with "Limited Access" flag (not "Full Access"), scoped to "Web Analytics Read" if available.
3. Token provided via `VERCEL_TOKEN` env var (not committed, not in any chat context).

## Operator response format

Operator copy-pastes one of the following into chat:

- `AUTHORIZED: scope_hash matches; carry out §5 as drafted` — agent reads VERCEL_TOKEN, runs the single reachability probe, persists projectId/teamId to a non-secret config file, no further Vercel API calls.
- `AUTHORIZED: scope_hash matches; excluded actions: <list>` — narrower scope; agent honors the exclusion list.
- `DEFERRED` — keep proposal on file; agent pauses.
- `REJECTED` — close proposal; no Vercel token work; Tickets 007+ proceed with Vercel rows marked MEASUREMENT_BLOCKED.

## Commitment summary (what operator is signing off on)

Operator signs off on the agent:

1. Reading `VERCEL_TOKEN` env var at runtime (not committed, not logged, not echoed).
2. Running exactly **one** reachability probe to `https://api.vercel.com/v1/query/web-analytics/visits/count` against the MDG project.
3. Persisting discovered `projectId` + `teamId` to `apps/maine-cannabis/scripts/analytics/.vercel-probe-state.json` (gitignored, not secret).
4. Documenting token rotation procedure in the same file.

Operator signs off on the agent NOT:

1. Calling the Vercel Drain API (A5 is a separate project).
2. Writing deployments, env vars, domains, or integrations via the token.
3. Exceeding rate limits (Hobby 100 req/min, Pro 1000 req/min).
4. Passing the token to any sub-process or external service.
5. Echoing the token to any log, commit, or chat response.

## Tier 1 invariant checks

Per `SPEC-AUTHORITY.md`:

- **No production mutation via diagnostics:** the reachability probe is a read-only API call. No production mutation authority is requested. ✓
- **Token not committed:** VERCEL_TOKEN is an env var; the agent never writes it to any file in the repo. ✓
- **Token scope minimization:** operator must select "Limited Access" flag. Agent will surface this requirement before running the probe. ✓
- **E0-E4 language not used for A4 token creation:** this is a single API call, not an evaluation tier. ✓

## Supersedes / depends on

- Depends on: `MDG-ANALYTICS-001-ticket-002-vercel-access-probe.md` §1-3 (source contract)
- Depends on: `MDG-ANALYTICS-001-CORRECTED-GATE-ANALYSIS-2026-07-12.md` (gate reconciliation)
- Does NOT depend on: A3 instrumentation authority (Ticket 006 — different proposal)
- Does NOT depend on: A5 Vercel Drain (separate infrastructure project)