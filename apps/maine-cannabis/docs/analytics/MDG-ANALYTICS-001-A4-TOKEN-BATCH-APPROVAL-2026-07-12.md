# MDG-ANALYTICS-001 — A4 Vercel Token Batch Approval (per G4=4c format)

**Authority gate:** Gate 3 of the 4-step MDG-ANALYTICS-001 runbook.
**Format:** G4=4c — single yes/no batch-approval, scope-hash bound.
**Stop condition:** This document stops after surfacing the batch approval. **No Vercel API calls, no token use, no production edits** until operator signs off on the byte-content and provides the token via env var.

---

## 1. Operator proposal (as provided 2026-07-12)

- **Token name:** `mdg`
- **Scope:** `steezkelly's projects`
- **Expiration:** 1 year (≈365 days from creation)

## 2. Source-contract binding (per Ticket 002 §1.1-3.1, SOURCES.md §A4)

Vercel Web Analytics read REST API (`https://api.vercel.com/v1/query/web-analytics/...`):

- **Auth:** OAuth-style bearer token, `Authorization: Bearer <token>` header
- **Access scope per request:** one `projectId` + one `teamId` (or `slug`) query param. For personal-account projects, omit `teamId`/`slug`.
- **No project-scoped token:** Vercel has project tokens, but the Web Analytics read API is project/team-scoped at the request level.
- **Rate limits:** Hobby: 100 req/min; Pro: 1000 req/min (per Vercel plan).

## 3. Spec contract A5 — Speed Insights (NOT covered by this token)

Per Ticket 002 §2.1-3.2, **Vercel Speed Insights has no published read REST API**. The only machine-readable path is **Vercel Drains**, which:

- Requires Vercel Pro or Enterprise plan (Drains are gated)
- Vercel-initiated HTTPS POSTs to an operator-owned endpoint
- Uses HMAC signature verification (`x-vercel-signature` header)
- **Auth to drain endpoint is operator-managed custom headers; no Vercel bearer token in the request**

**Conclusion: the A4 token does NOT provide Speed Insights read access.** Vercel A5 is a separate infrastructure project. Defer.

## 4. Verification required before token creation (operator confirms)

### 4.1 Scope granularity

**"steezkelly's projects" is ambiguous in Vercel's token model.** The Vercel token model is:

- **Team-scoped tokens** are bound to a single team and grant access to all projects owned by that team.
- **User tokens** are bound to a single user and grant access to all teams/projects that user is a member of.
- **Project tokens** (deprecated for Web Analytics) are bound to a single project.

Per Ticket 002 §1.1: Vercel has **no project-scoped token** for Web Analytics — the API request uses `projectId` + `teamId` query params, but the *token* is broader.

**Question for operator:** is "steezkelly" a **team** (in which case the token grants access to all `steezkelly`-team projects, which is the full MDG site) or a **user account** (in which case the token grants access to all teams that user belongs to)? If user-with-multiple-teams, please specify which teamId should be used in API requests.

### 4.2 Expiration

Vercel docs recommend ≤90 days for tokens used in untrusted automation. The operator proposed 1 year. This is acceptable for a long-lived operator-curated project but means the agent should NOT be re-using this token beyond token lifetime without rotation.

**If operator confirms 1 year, the agent will:**
- Record the token's expiry date in `~/.hermes/secrets/mdg-vercel-token-meta.json` (not committed; not in any prompt context)
- Set a Hermes reminder 30 days before expiry
- Document the rotation procedure in the same file

### 4.3 Token storage

Per the 4-step runbook and SPEC-AUTHORITY.md: **tokens must NOT be committed, not in chat history, not in any prompt context that the agent will see on resume.** Storage is via env var only.

**Token must be passed to the agent via one of:**
- `VERCEL_TOKEN` env var set in the user's shell session (not in `.env` files)
- A secret store (1Password, Bitwarden) with the agent reading via the `secret` command at runtime

The agent will read `VERCEL_TOKEN` at runtime only. The agent will not echo the token to any log, commit, or chat response.

### 4.4 Required scope verification (per Vercel token model)

A Vercel access token at the team or user scope grants:

- Read access to projects within scope
- Read access to deployments, logs, analytics endpoints
- Write access to deployments, env vars, domains, integrations (per the token's "Full Access" or "Limited Access" flag)

**For A4 (Web Analytics read-only)**, the token needs at minimum:
- "Read" scope on the Web Analytics endpoint
- Ideally: **"Limited Access"** flag selected during token creation, scoped to "Web Analytics Read" only

**The operator must select "Limited Access" at token creation time** (not "Full Access") to minimize the blast radius if the token leaks. A "Full Access" token grants deployment write authority which the agent should NOT have for analytics work.

## 5. What the agent will do once token is approved + provided

Once the operator confirms "yes, create the token" + the token is provided via `VERCEL_TOKEN` env var, the agent will:

1. **Read the token once at runtime** via `process.env.VERCEL_TOKEN`. Do not log. Do not echo.
2. **Run a single reachability probe** to confirm the token works:
   - `curl -sS "https://api.vercel.com/v1/query/web-analytics/visits/count" -H "Authorization: Bearer $VERCEL_TOKEN" --data-urlencode "projectId=prj_..." --data-urlencode "filter=requestPath eq '/'"` against the MDG project
   - Verify status 200 + sensible response shape
3. **Persist the projectId + teamId** discovered from the probe response in a non-secret config file (`apps/maine-cannabis/scripts/analytics/.vercel-probe-state.json`, gitignored).
4. **Document the token rotation procedure** in the same file.

## 6. What the agent will NOT do

- Will not call the Vercel Drain API (A5 is a separate project)
- Will not write deployments via the token
- Will not modify env vars via the token
- Will not exceed rate limits (Hobby: 100 req/min; Pro: 1000 req/min)
- Will not pass the token to any sub-process or external service
- Will not echo the token to any log, commit, or chat response

## 7. Operator decision required

Three confirmations before this proposal can be considered "AUTHORIZED: scope_hash matches; carry out as drafted":

1. **"steezkelly" scope is a single Vercel team (not a user with multiple teams)."** If the user has multiple teams, please specify which teamId the agent should use in API requests.

2. **"Limited Access" flag is selected at token creation, scoped to Web Analytics Read only.** If "Full Access" is the only option for the requested scope, the operator should confirm explicitly that "Full Access" is acceptable — the agent will not proceed under "Full Access" without explicit operator override.

3. **Token will be provided via `VERCEL_TOKEN` env var** (not committed, not in any chat context).

If all three are confirmed, the operator can:
- Visit `https://vercel.com/account/tokens`
- Create token with name `mdg`, scope `steezkelly's projects`, expiration 1 year, **Limited Access / Web Analytics Read** if available
- Provide the token to the agent via `VERCEL_TOKEN` env var

**No agent action until the operator pastes the token and the three confirmations.**

## 8. Authority compliance

- G4=4c batch approval format: single yes/no per logical batch
- Scope-hash bound: this proposal's byte-content + a companion `MDG-ANALYTICS-001-a4-token.scope_hash.md` file
- Operator approves the proposal, creates the token at the Vercel admin UI, then provides the token value
- The agent never sees the operator's token-creation click; the agent sees the resulting token value
- This pattern is consistent with the 2026-07-12 G4=4c format used for the Ticket 006 instrumentation-v1 proposal

## 9. Stop condition

This document stops after the three operator confirmations and the token issuance. No Vercel API calls. No analytics production optimization. No workstream re-entry. The 4-step runbook Gate 3 closes when the agent runs the single reachability probe successfully.