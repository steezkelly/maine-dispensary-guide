# MDG-ANALYTICS-001 — Reconciliation Report (package v0.5 ↔ current `main`)

**Date:** 2026-07-12
**Spec inspected ref:** `965528ade8849f616d6e61e7f5b85c8d2fb838be` (per `V0.5-EXECUTION-BOUNDARY-ADVERSARIAL-REPORT.md`)
**MDG HEAD inspected:** `965528ade88 + N commits` (current `main` ahead by ≥ 20 commits)
**Author:** Hermes (parent agent)
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/`
**Audit tier:** Tier 2 implementation hypotheses + drift categorization. Tier 1 invariants flagged where potentially weakened.

## Provenance

This reconciliation was produced by direct read of the v0.5 package files
(`README.md`, `VERIFY-REPORT.md`, `CURRENT-STATE-AUDIT.md`, `SOURCES.md`,
`EVENT-TAXONOMY.md`, `V0.5-EXECUTION-BOUNDARY-ADVERSARIAL-REPORT.md`,
`OPPORTUNITY-OBJECT-CONTRACT.md`, `HYPOTHESIS-AND-DIAGNOSTIC-PROTOCOL.md`,
`ACTION-AUTHORITY-MATRIX.md`, `INTERVENTION-PROPOSAL-CONTRACT.md`,
`TASK-OWNERSHIP-INVESTIGATION.md`, `INVESTIGATION-EXAMPLES.md`,
`CAUSAL-INFERENCE.md`, `OPPORTUNITY-ENGINE.md`, `PRIVACY-BOUNDARY.md`,
`PEER-GROUP-MODEL.md`, `V0.5-CORRECTIONS.md`) and direct reconciliation
against `/home/steve/projects/maine-dispensary-guide` HEAD
(`main` branch).

All drift categories below cite the file + commit evidence used.

## Tier 1 invariant checks (must not drift)

| Invariant | v0.5 spec | Current `main` | Evidence | Status |
|---|---|---|---|---|
| GA4 engagement rate ≠ MDG satisfaction | Held | Held | `VERIFICATION-MODEL.md` L46-52, no override seen in repo | **OK** |
| A3 autonomous execution disabled by default | Held | Held (no authorization scopes created) | No repo file names a `auth-scope`; `ACTION-AUTHORITY-MATRIX.md` A3 disabled | **OK** |
| Opportunity ≠ recommendation | Held | Held | `OPPORTUNITY-OBJECT-CONTRACT.md` | **OK** |
| Pseudonymous-ID-to-lead join prohibited in Sprint 1 | Held | Held (lead capture is mailto-based now) | `AGENTS.md` L115 — `/download/first-timer-field-guide` uses mailto; SSR endpoints retired | **OK** |
| Five-stage funnel preserved (Discovery → Acquisition → Satisfaction → Progression → Retention) | Held | Held | `MEASUREMENT-MODEL.md` not modified; analytics layer not yet built | **OK** |
| Cannabis-site privacy: no inferred consumption/medical events | Held | Held (no such events added) | `src/lib/ga4.ts` events unchanged | **OK** |

No Tier 1 invariant has been silently weakened. ✓

## Tier 2 deviations — measured drift from spec assumptions

### D1 — GA4 beacon completeness on historical windows (measurement-state, Tier 2)

| | |
|---|---|
| Spec assumption | GA4 events arriving normally since 2026-07-11 instrumentation deployment |
| Observed reality | Commits prior to `d5bdbc6f` (2026-07-12) had a CSP `connect-src` block on GA4 conversion beacons. Browser console logged `Fetch API cannot load …` on every page view, per the commit message. **Conversion tracking was silently broken before that commit.** |
| Evidence | `git show d5bdbc6f -- vercel.json` — `connect-src` extended to include `analytics.google.com`, `www.google.com`, `stats.g.doubleclick.net`. `git show d5bdbc6f` commit message quote: *"Browser console logs 'Fetch API cannot load ...' errors on every page view, silently breaking conversion tracking."* |
| Decision | Any GA4 window ending **before 2026-07-12** is `_WINDOW_MEASUREMENT_DEGRADED` for `lead_capture`, `affiliate_click`, conversion-style events, and `/g/collect` beacon completeness. Page-view volume may also be undercounted but is less exposed. |
| Consequence | Spec's baseline analysis (698 users / 776 sessions over 86 days) and Portland anomaly used periods that may straddle the boundary. **Ticket 007 (behavioral source ingestion) and 008 (cross-source join) must treat pre/post-2026-07-12 windows as incomparable for conversion-bearing metrics.** Use post-fix windows as the clean baseline. |
| Spec amendment | Yes. Spec should call out the CSP fix as a documented measurement-state event with a known transition date. |

### D2 — OCP retail/opt-in ingest as a NEW data source (not yet in spec's A0–A8)

| | |
|---|---|
| Spec assumption | Source contract enumeration A0–A8 (GSC BDE, GSC API, GA4 API, GA4 BigQuery, Vercel Web Analytics, Vercel Speed Insights, MDG Page Manifest, Instrumentation Surface Manifest, Deployment/Change Manifest) is the complete source set |
| Observed reality | MDG-DATA-001 ticket series (commits `f6e64643 … e44cd69e` and untracked `ocp-firecrawl-ingest.cjs`) added an OCP Power BI ingest path producing `sales_observation` and `optin_record` rows via Firecrawl interact → manual-CSV adapter → normalize. This is a **data-product source**, not a measurement (GA4/GSC/Vercel) source. |
| Evidence | `git log --oneline \| grep -i 'MDG-DATA-001'` returns 13+ tickets. File `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-firecrawl-ingest.cjs` (untracked, present on disk) with source comment "Per the operator override 2026-07-12, this is the production ingest path." |
| Decision | It is OUT of scope for the analytics measurement layer (Tier 1 domain). It IS a context source for any Acquisition/Progression diagnostics that want to know whether a queried market has retail access (e.g. progression destinations). Add as a non-`A` context attribute, not as an `A` source. |
| Consequence | Ticket 002 audit must note the gap so the spec doesn't accidentally route analytics queries through data-product files. Ticket 008 cross-source join should NOT depend on OCP data being contemporaneous with the analytic window — settlement/refresh lag is independently defined by the data-product pipeline. |
| Spec amendment | Yes. Add an explicit "data-product sources are non-measurement context, not A-sources" note. Avoids future confusion. |

### D3 — Three PSI perf rounds since spec cut (measurement distortion risk)

| | |
|---|---|
| Spec assumption | Homepage/PSI shape is as inspected at `965528ade88...` |
| Observed reality | Commits `8d8c6ee4` (CSS + font `display=optional`), `209c0655` (AnimatedBackdrop defer), `95df8fee` (GTM defer + JS-set mp4 src) are three PSI rounds against the homepage. The homepage is on a different LCP/INP performance characteristic than what the spec saw. |
| Evidence | `git log --oneline -20` lines 4-6 + 7. |
| Decision | Any "Experience evidence" attribution to homepage changes since 2026-07-08 must consider which PSI round produced which performance baseline. The opportunity engine must not assume a constant LCP/INP baseline. |
| Consequence | Ticket 008 / 011 must include the deployment/change manifest (A8) when joining page-window metrics to experience metrics — already required by spec, but reinforced here. |
| Spec amendment | Optional. Spec already mandates change-manifest join; no fundamental change needed. |

### D4 — Dead Ahrefs analytics script removed (historical asset)

| | |
|---|---|
| Spec assumption | Current analytics = GA4 + Vercel Web/Speed Insights (per CURRENT-STATE-AUDIT.md) |
| Observed reality | Sprint 73a (per `BOT_COLLABORATION_HUB.md` line 501) removed a dead `analytics.ahrefs.com/analytics.js` script tag that was CSP-blocked but still emitted in HTML. Earlier agent had left it as dead code. |
| Evidence | Hub line 501-522 documents removal rationale and acceptance. |
| Decision | This is a **history record**, not a current measurement source. It IS in scope for the "what was here before" archival portion of the Analytics Baseline Decisions document. |
| Consequence | Ticket 000 must include this in the legacy-artifact trust table as "QUARANTINED — removed; documented for completeness." |
| Spec amendment | No. Spec amendment unnecessary; just include in the baseline artifact. |

### D5 — data-page-type still globally unset (invariant unchanged)

| | |
|---|---|
| Spec assumption | `data-page-type` is missing across all pages per CURRENT-STATE-AUDIT.md claim |
| Observed reality | Confirmed. `search_files pattern="data-page-type" path=.` returns **0 matches** in repo. |
| Evidence | Search executed 2026-07-12 against `main`. |
| Decision | Invariant holds. This is the v0.5 invariant `PAGE_TYPE context unreliable` retained. |
| Consequence | Ticket 003 (page manifest) and Ticket 006 (instrumentation v1) **must include populating `data-page-type` from the page manifest as an explicit deliverable**, not just a future ambition. |
| Spec amendment | Optional reinforcement in EVENT-TAXONOMY.md or ticket 003 prompt. |

### D6 — data-faq and data-cta-id still missing (~50 files pending)

| | |
|---|---|
| Spec assumption | FAQ accordions lack `data-faq`; CTAs lack `data-cta-id`. Spec reports zero counts are instrumentation state, not user behavior. |
| Observed reality | Unchanged since 2026-07-11 — confirmed by `apps/maine-cannabis/docs/analytics/GA4_PROBE_Y_CLOSURE_2026-07-11.md` lines 102-104 still pending, plus absent FAQ `data-faq` attribute grep. |
| Evidence | Repo grep, plus spec's own ENGAGEMENT_WEEKLY_2026-07-11.md doc. |
| Decision | Instrumented-state finding holds. **Production edit** (wiring these attributes) is not yet authorized — see Tier 1 authority matrix. This is *measurement repair*, not *content intervention*. Under ACTION-AUTHORITY-MATRIX.md A3, measurement repair may in principle be allowlisted, but A3 is *disabled by default* for MDG-ANALYTICS-001 commissioning. So wiring remains an **A4 human-authorized material intervention** until A3 is explicitly enabled with a surface-allowlist. |
| Consequence | Tickets 004 (taxonomy v1) and 006 (instrumentation v1) **must surface this human-authorization gate, not paper over it**. The agent must NOT silently ship `data-faq`/`data-cta-id` injection. |
| Spec amendment | Optional clarification in INTERVENTION-PROPOSAL-CONTRACT.md: add a "measurement_repair_surface" change type so the authority tier for that specific class is unambiguous. |

### D7 — Ahrefs history and `vercel.json` line 137 embed/* override (CSP-modifying commits)

| | |
|---|---|
| Spec assumption | vercel.json is the current CSP site-wide (no override blocks called out) |
| Observed reality | `git show d5bdbc6f` modified two CSP blocks: the site-wide default and the `embed/*` override (vercel.json line 137). Both required the same `connect-src` extension. |
| Evidence | Diff hunks at lines 113 (site-wide) and 134 (embed/* override). |
| Decision | This is a Tier 2 implementation detail (CSP config). Already documented in commit; just note that scripts targeting `/embed/*` need their own API contract review if they ever emit custom events to non-allowlisted domains. Currently embed pages render the same global tracker, so no action needed. |
| Consequence | None for Sprint 1 analytics. Reserve for any future embed-page event tracking work. |
| Spec amendment | No. |

## Spec instructions reconciliations

The "Important instructions" preamble (from ChatGPT WebUI) maps cleanly to the package and to current repo state except for **D1** (CSP fix) and **D2** (OCP source). Both are handled above as Tier 2 deviations with documented evidence.

The instruction "Do not silently weaken a hard measurement, statistical, privacy, causal-inference, investigation, or action-authority boundary merely because it is difficult to implement" is being obeyed. No hard boundary has been weakened.

## Hard-coded directions not in the spec (additional Ticket 000 findings)

These are Tier 0 facts the spec did not enumerate. Including so they're not lost:

1. **GA4 Property ID** observed: `532778727`. **Measurement ID**: `G-614GHG67ZQ`. (From `CURRENT-STATE-AUDIT.md`, still in scripts/data unchanged.)
2. **Vercel env vars: zero** in production (cleaned 2026-07-06 per `AGENTS.md`).
3. **`/api/*` SSR endpoints retired 2026-07-06** — namespace free for future use if needed.
4. **No SSR routes currently in production** — entire site is statically pre-rendered. Implications:
   - BigQuery streaming ingestion from MDG is non-trivial: no server endpoint to forward events from. Would require client-side direct-to-BigQuery streaming OR a Vercel Function reinstated. Flag this in Ticket 002 source-architecture work.
5. **Lead funnel pattern is now mailto-only** (post-Sprint 73d). The `lead_capture` GA4 event therefore fires only on the mailto-open intent (client-detected `mailto:` click) and not on actual delivery.

## Items requiring user authorization (gates for Ticket 002+)

These cannot proceed without explicit operator authorization:

- **GA4 BigQuery link enablement** — requires GA4 UI edit (property settings → BigQuery links) and a Google Cloud project to point at. Operator-side action.
- **GSC Bulk Data Export (BDE) enablement** — requires GSC property settings change. Operator-side.
- **Vercel API token issuance** — for A4 Web Analytics API access. Requires Vercel team-scoped token. **STOP and ask Steve gate.**
- **Production CSP modify to allow additional analytics endpoints** — would require a vercel.json change with a corresponding deploy. Already demonstrated reversible (commit d5bdbc6f was reversed-on-fix).

## Acceptable Tier 2 deviation discretion exercised here

Per SPEC-AUTHORITY.md §"Deviation authority":
> A Tier 2 deviation may proceed without prior human approval when Tier 1 invariants are preserved, the replacement is documented, and validation evidence exists.

This reconciliation reports observed drift. No Tier 1 invariant has been weakened. Each drift item records specified assumption, observed reality, evidence, decision, consequence, and whether the spec should be amended. No code change has been committed by this reconciliation; results ride into Tickets 001+ under subagent coordination.

## Pre-flight checks executed (per AGENTS.md)

- ✓ `node --version` → v22.23.1
- ✓ `npm --version` → 10.9.8
- ✓ `ps aux | grep -i playwright` → no leftover processes
- ✓ `df -h /` → 447G free
- ✓ `git status --short` → 10 modified/untracked working-tree items (not blocking reconciliation work)

## What subagent verification will check

Three subagents are dispatched in parallel (`deleg_cfc4c2f4`):

- **Subagent A** will author `MDG-ANALYTICS-001-ticket-000-ga4-instrumentation-audit.md` with the legacy-artifact trust table
- **Subagent B** will author `MDG-ANALYTICS-001-ticket-001-gsc-extractor-contract.md`
- **Subagent C** will author `MDG-ANALYTICS-001-ticket-002-vercel-access-probe.md` (no tokens touched, operator checklist only)

Each subagent claims a deliverable file with commit-state on the final line. Parent will verify each claim before accepting into Ticket 012 handback.

## Stop condition check

This document stops at **Ticket 000 — implementation reconciliation**. **Tickets 001–012 are not yet executed**; do not auto-begin content/UX/CTA/internal-link/redirect/canonical/structured-data interventions per the package's Stop condition. Authority A3 remains disabled.
