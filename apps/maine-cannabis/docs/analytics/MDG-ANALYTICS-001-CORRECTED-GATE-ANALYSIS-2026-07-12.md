# MDG-ANALYTICS-001 — Corrected Blocker Survey (v0.5 package ↔ current main)

**Date:** 2026-07-12
**Author:** Hermes (parent agent)
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/`
**Repo:** `/home/steve/projects/maine-dispensary-guide` @ `60bc8641`
**Supersedes:** `MDG-ANALYTICS-001-TICKET-STATUS-SURVEY-2026-07-12.md`
**Trigger:** Operator identified two contradictions in the prior survey:
1. Ticket 006 says GA4→BigQuery is "live since 2026-07-08" but the prior survey asked the operator to enable it.
2. The prior survey collapsed Vercel A4 (Web Analytics REST API) and A5 (Speed Insights — no read REST API, Vercel Drain only) into a single combined token scope.

The two contradictions are real. This document reconciles them against current source evidence, surfaces the actual remaining operator gates, and identifies which Tickets 007–011 (if any) can proceed immediately.

---

## Reconciliation against current source evidence

### Gate A — GA4 service-account + BigQuery link

**Ticket 006 proposal claims (line 37, 188):**
> "GA4→BigQuery linkage (Gate 1) confirmed live since 2026-07-08; stream ID `14362255636`; daily volume 54."
> "Project `maine-dispensary-guide` (313121319696). Stream `Maine Dispensary Guide` (14362255636)."

**What current repo evidence actually says:**
- Commit `965528ad` (2026-07-11): commit message states *"Operator confirmed GA4 service-account grant on 2026-07-11"*. This is the GA4 service-account grant (OAuth impersonation), not the BigQuery link itself. Confirms the SA can access the GA4 property.
- Commit `965528ad` ran a GA4 weekly engagement probe using `runReport` against property `G-614GHG67ZQ` and successfully produced `ENGAGEMENT_WEEKLY_2026-07-11.md` from real data. Confirms the SA can read GA4 data via Data API.
- Commit `33ebf83c` (2026-06-09, **operator-authored**): *"retire GSC/GA4 programmatic-access path (manual only)"*. Notes *"GA4 properties visible: 0 (account empty)"* when using the service account key — this was the state as of June. Steve explicitly retired the OAuth/SA infra path on 2026-06-09 as too-complex-for-monthly-cadence.
- The June retire doc and the July 11 GA4 engagement commit are **reconcilable** if the operator re-enabled GA4 service-account grant between 2026-06-09 and 2026-07-11. The commit message *"Operator confirmed GA4 service-account grant on 2026-07-11"* supports this timeline.

**What current repo evidence CANNOT confirm without operator action:**
- Whether a **GA4→BigQuery link** is currently configured on the property. The Ticket 006 proposal claims a stream ID `14362255636` and project `313121319696`, but no code or config in the repo references these. The stream ID may be real, hallucinated by the LLM writing the proposal, or a stale reference. **Verifying requires the operator to look at the live GA4 admin UI.**
- The proposal's date "2026-07-08" for the link enablement disagrees with the commit message "2026-07-11" for the SA grant. The 2026-07-08 date has no supporting evidence in the repo.

**Status:** Operator must verify the live GA4 admin UI state. If the BigQuery link is **already enabled**, Gate A is closed (no action needed). If it is **not enabled**, Gate A is open and the operator needs to enable it.

### Gate B — GSC Bulk Data Export

**Ticket 006 proposal claims (line 39, 189):**
> "GSC BDE (Gate 2) requires IAM grant repair for `search-console-export@system.gserviceaccount.com` `roles/bigquery.dataEditor` on `maine-dispensary-guide`."

**What current repo evidence actually says:**
- Commit `33ebf83c` (2026-06-09, **operator-authored**) explicitly **retired the GSC programmatic-access path** because OAuth was too complex for monthly-cadence needs. The decision documented in that commit is *"manual check only"*.
- The project-bound principal pattern is `gsc-export-<project-id>-<project-number>@<project-number>.iam.gserviceaccount.com`, NOT `search-console-export@system.gserviceaccount.com` (the latter is a documentation placeholder per Google support docs and Steve's verified observation 2026-07-12).
- The Ticket 006 proposal cites the wrong principal string. The proposal's own §2 also explicitly recommends *DEFERRED* or *REJECTED* operator paths for GSC BDE — *"DEFERRED — keep proposal on file; I proceed through Tickets 007, 008, 009, 010 (BigQuery + archive design only), come back to 006 when you're ready."* or *"REJECTED — close proposal; tickets 006+030 not run."*

**Status:** GSC BDE is **deliberately not enabled** by operator decision (2026-06-09 commit `33ebf83c`). Ticket 006's "pending IAM grant repair" framing contradicts this and appears to be stale language from an earlier draft. The operator's decision stands: **GSC BDE is OFF the critical path.** GA4 BigQuery alone is sufficient for Sprint 1 behavioral source ingestion per the Ticket 007 spec (*"Default recommendation: GA4 BigQuery Daily export, subject to Ticket 002 proof"*).

### Gate C — Vercel Web Analytics A4 access token

**Ticket 002 probe claims (line 149, 151):**
> "OAuth-style bearer token... must be a Vercel access token with the right scope."
> "projectId + teamId query params."

**What current repo evidence actually says:**
- No `VERCEL_TOKEN` env var anywhere in the repo. No `vercel` CLI invocations. No `Authorization: Bearer ...` headers against `api.vercel.com`.
- Ticket 002 §4.A3 itself is a **STOP-and-ask-Steve gate**: *"In a browser, navigate to https://vercel.com/account/tokens and create a new token. **STOP and ask Steve** before clicking 'Create'. Paste the proposed token name + scope into chat for sign-off; do not proceed without explicit approval."*
- Ticket 002 §4.A6 is a read-only reachability probe, also pending operator approval.

**Status:** A4 token is **not issued**. This is a real operator gate that requires:
1. Operator browses to `https://vercel.com/account/tokens`
2. Operator creates a token (name + scope to be approved by operator first)
3. Operator provides the token to the agent via `VERCEL_TOKEN` env var (NOT committed)

### Gate D — Vercel Speed Insights A5 machine-readable path

**Ticket 002 probe claims (line 159):**
> "Critical finding from the docs: Vercel does not publish a read REST API for Speed Insights data... The only machine-readable path is Vercel Drains."
> "Vercel Drains (last_updated 2026-07-03, canonical: https://vercel.com/docs/drains/using-drains): Vercel-initiated HTTPS POSTs of observability events to an operator-owned endpoint... Plans required: Pro or Enterprise."
> "Auth to drain endpoint: Custom headers (operator's responsibility); no Vercel bearer token in the request."

**What current repo evidence actually says:**
- No Vercel Drain configuration referenced in the repo.
- No `Speed Insights` data type selected in any Vercel setting.
- No operator-owned HTTPS endpoint configured to receive drain payloads.

**Status:** A5 Speed Insights machine-readable path is **not configured** and **cannot be unblocked by a token alone**. The operator would need to:
1. Provision an HTTPS endpoint on a domain they own (e.g., `drains.mainedispensaryguide.com`)
2. Configure a Vercel Drain in **Team Settings → Drains** with the **Speed Insights** data type pointing at that endpoint
3. Set up HMAC signature verification using the `x-vercel-signature` header
4. Provide the agent with the drain endpoint URL

This requires **Pro or Enterprise** Vercel plan. **Vercel token grant does NOT solve this gate.**

---

## Confirmed existing source capabilities

These are the source contracts that are **operational today** per repo evidence:

| Source contract | Status | Evidence |
|---|---|---|
| GA4 Data API (A2 in spec) | **operational** | `965528ad` weekly engagement probe produced real data; SA grant confirmed 2026-07-11 |
| GA4 web gtag (CSP fix landed 2026-07-12) | **operational** | `d5bdbc6f` allowlisted GA4 beacon endpoints |
| MDG Page Manifest (A6) | **operational** | `page_task_manifest.v1.jsonl` + `instrumentation_surface_manifest.v1.jsonl` from `a6dd8079` |
| Deployment/Change Manifest (A8) | **operational** | git log serves this directly |
| Event taxonomy schema (A7) | **operational** | `MDG-ANALYTICS-001-ticket-004-event-taxonomy-v1.md` |
| Measurement-health probes protocol (A8→health) | **operational** | `MDG-ANALYTICS-001-ticket-005-measurement-health-probes.md` |
| GA4→BigQuery link (A3) | **STATUS UNVERIFIABLE FROM REPO** | Ticket 006 claims live (stream `14362255636`, project `313121319696`) but no code references. Operator must verify in GA4 admin UI. |

---

## Actual missing operator gates

| Gate | Action | Spec authority | Cost | Effort |
|---|---|---|---|---|
| **A3 verification only** | Operator opens GA4 admin → Property → Product links → confirms BigQuery link is enabled. If enabled, no action. If not, enable it. | spec §A3 (`SOURCES.md`) | free if already enabled; BigQuery sandbox free if newly enabled | 30 seconds if already enabled; ~5 min if newly enabled |
| **A4 token** | Operator opens `https://vercel.com/account/tokens`, creates a scoped read token, provides via `VERCEL_TOKEN` env var (NOT committed) | spec §A4 (`SOURCES.md` + `MDG-ANALYTICS-001-ticket-002-vercel-access-probe.md` §4.A3) | free | ~5 min |
| **A5 Vercel Drain** | Operator provisions an HTTPS endpoint on a domain they own, configures Vercel Drain with Speed Insights data type, sets up HMAC verification, provides drain URL to the agent | spec §A5 (`SOURCES.md` + `MDG-ANALYTICS-001-ticket-002-vercel-access-probe.md` §3.2) | requires Vercel Pro or Enterprise plan (Drains are gated); + HTTPS endpoint hosting cost | ~1 hour (provisioning + config + verification) |

**GSC BDE is NOT a gate.** The operator's 2026-06-09 decision (`33ebf83c`) deliberately retired it. The Ticket 006 proposal's "GSC BDE IAM repair" line is stale language.

---

## Tickets 007–011 — what each gate blocks

| Ticket | Needs GA4→BigQuery (Gate A3) | Needs Vercel A4 token (Gate A4) | Needs Vercel A5 Drain (Gate A5) |
|---|---|---|---|
| 007 Behavioral source ingestion | **YES** (primary source) | partial (cross-source join uses Vercel rows) | no (Speed Insights not the source) |
| 008 Cross-source page-window join | yes (GA4 rows) | yes (Vercel validation rows) | optional (could add field for Speed Insights page-window) |
| 009 Sufficiency + archetype baselines | yes (GA4 baselines) | yes (Vercel baselines) | optional |
| 010 Derived evidence + state machine | yes (derived from GA4) | optional (Vercel field optional) | optional |
| 011 Opportunity engine | yes (behavioral signal core) | optional | optional |

---

## Can any portion of 007–011 proceed immediately without additional operator action?

**Yes. Portions that depend ONLY on:**
- GA4 Data API (already operational)
- MDG Page Manifest (already operational)
- Deployment/Change Manifest (already operational — git log)
- Event taxonomy schema (already operational)
- Probe protocol (already designed)
- Operator-only GSC inspection (per the retired-path decision)

**can begin without any new operator gate.** Specifically:

- **007 behavioral source ingestion can be implemented against GA4 Data API alone.** The Ticket 007 spec says *"Default recommendation: GA4 BigQuery Daily export, subject to Ticket 002 proof"*. The "subject to Ticket 002 proof" was conditional on Vercel A4/A5 proof — those are orthogonal to GA4. GA4 Data API is the runReport path that already worked in `965528ad` for the weekly engagement probe.
- **008 cross-source join can use GA4-only when Vercel A4 is missing.** Mark Vercel-joined rows as `MEASUREMENT_BLOCKED` and proceed with the rest.
- **009 archetype baselines can run on GA4-only peer context.** Vercel rows are "convenience cross-checks" not foundational per the spec.
- **010 state machine is event-class-agnostic.** GA4 events alone populate it.
- **011 opportunity engine reads from 010.** If 010 works on GA4-only, 011 works on GA4-only.

**Specifically, the GA4-BigQuery-link uncertainty (Gate A3) is the only blocker that 007 strictly needs.** If the operator confirms "yes it's enabled" via a 30-second check, 007 can proceed using **GA4 Data API (already operational) for the current window + GA4 BigQuery (claimed-live, needs verification) for historical windows.**

The Vercel A4 token blocks cross-source validation rows but does NOT block the analytics engine from running — degraded rows can be marked `MEASUREMENT_BLOCKED`.

The Vercel A5 Drain blocks Speed Insights in derived signals. Per the spec, Speed Insights is in source contract A5, used for "core web vitals" and LCP/CLS/INP fields in derived signals. Without the drain, the engine can emit Speed Insights fields with `unavailable` status and proceed.

**Concrete proposal:** open Ticket 007 immediately against GA4 Data API + BigQuery (if confirmed live by operator). Defer Vercel A4 token and Vercel A5 Drain to the corresponding tickets 008 / 009 / 011 when they specifically need Vercel-sourced rows.

---

## Recommended next operator action

1. **Verify GA4 BigQuery link status** in the live GA4 admin UI. Report:
   - Is the BigQuery link enabled?
   - If yes: project number + stream ID + the exact date it was enabled.
   - If no: enable it (free, sandbox).
2. **Open Vercel A4 token** at `https://vercel.com/account/tokens`. Report the proposed token name + scope + expiry to the agent before clicking "Create". After operator approval, provide the token via `VERCEL_TOKEN` env var (NOT committed).
3. **Vercel A5 Drain** is a longer project (operator-owned HTTPS endpoint + Pro/Enterprise plan + HMAC setup). Defer until Tickets 009-011 specifically require Speed Insights data.

**No agent action needed until operator reports the GA4 BigQuery verification result + Vercel A4 token name/scope proposal.** Once those land, the agent can proceed Ticket 007 → 008 → 009 → 010 → 011 → 012 in sequence without further operator intervention.

---

## What I (Hermes) will not do until operator responds

- Will not call `api.vercel.com` or `api.firecrawl.dev` or `api.census.gov` with any credentials.
- Will not create or commit any tokens.
- Will not begin analytics-triggered production optimization interventions.
- Will not silently weaken any Tier 1 invariant from `SPEC-AUTHORITY.md`.
- Will not resume the parked dispensary / firecrawl / optin / menu-price workstream.

The corrective survey (`MDG-ANALYTICS-001-TICKET-STATUS-SURVEY-2026-07-12.md`, commit `60bc8641`) is now superseded by this document. The prior survey's two gate contradictions are resolved here. The "GSC BDE IAM grant repair" line in the Ticket 006 proposal (line 189) is stale language and should be updated when the proposal is next revised.