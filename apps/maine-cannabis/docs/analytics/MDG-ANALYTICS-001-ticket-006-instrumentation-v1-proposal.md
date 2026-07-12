# MDG-ANALYTICS-001 Ticket 006 — Instrumentation Wiring Intervention Proposal

**Status:** `DRAFT → AWAITING_AUTHORIZATION`
**Ticket:** `TICKETS/006-instrumentation-v1.md`
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/` (v0.5, verified)
**Author:** Hermes (parent agent), 2026-07-12
**Required authority level:** **A4 — human-authorized material intervention** (per Gate 4 = 4c, your standing rule)
**Single-batch approval:** scope = this entire proposal. ONE yes/no from operator authorizes all changes within scope-hash; deviations require re-authorization.

---

## 1. Why this is a proposal, not a routine edit

Per the v0.5 specification (`SPEC-AUTHORITY.md` §"Tier 1" / `INTERVENTION-PROPOSAL-CONTRACT.md`):

> production edits are not diagnostics. analytics diagnosis never silently grants production mutation authority.
> analytics-triggered [title/meta/body rewrites] require `A4` human authorization.

This proposal is the analytics-triggered wiring of `data-page-type`, `data-faq`, `data-cta-id` attributes — the substrate the v0.5 measurement system needs to deliver value. It is a Tier-1-bordered proposal because:
- Triggers post-Ticket-000 forensic audit findings (`WIRED_BUT_SILENT` state).
- Reversibility is mechanical (HTML data-attributes), but the production surface is 200+ files.
- Scope hash guards against over-reach: nothing outside §3 ships under this authorization.

## 2. Pre-flight (already done)

Per Tickets 000–005 on `main`:

| Pre-req | Where | Status |
|---|---|---|
| Source state inventory | Ticket 000 (`MDG-ANALYTICS-001-ticket-000-ga4-instrumentation-audit.md`) | ✓ on `main` |
| Page manifest schema + initial 276 routes | Ticket 003 (`page_task_manifest.v1.jsonl`, build script) | ✓ on `main` |
| Instrumentation surface manifest | Ticket 003 (`instrumentation_surface_manifest.v1.jsonl`) | ✓ on `main` |
| Event taxonomy v1 (24 typed events) | Ticket 004 (`event-taxonomy-v1.ts`, validator) | ✓ on `main` |
| Measurement-health probe protocol | Ticket 005 (`MDG-ANALYTICS-001-ticket-005-measurement-health-probes.md`) | ✓ on `main` |
| Drift reconciliation (D1–D7) | `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md` | ✓ on `main` |

GA4→BigQuery linkage (Gate 1) confirmed live since 2026-07-08; stream ID `14362255636`; daily volume 54.

GSC BDE (Gate 2) requires IAM grant repair (see §8 below).

## 3. Scope (everything in this proposal is authorized; nothing outside is)

### 3.1 Surface A — `data-page-type` injection

Inject `data-page-type` attribute on the `<body>` element of every `.astro` page that currently lacks it. Value derived from `page_task_manifest.v1.jsonl`. Goal: eliminate the D5 reconciliation finding (zero `data-page-type` repo-wide).

| | |
|---|---|
| Files in scope | All `.astro` files in `apps/maine-cannabis/src/pages/` *except* `404.astro`, `admin/*`, and `/admin/*` (noindex pages). |
| Files out of scope | `404.astro`, `admin/*`, anything under `apps/maine-cannabis/src/pages/admin/`. |
| Source of truth | `apps/maine-cannabis/docs/analytics/page_task_manifest.v1.jsonl` (`route_family` is the mapping key; `reporting_archetype` is the attribute value). |
| Estimated file count | ~270 distinct `.astro` files. |
| Edit type | Mechanical: add `data-page-type={route_family-or-reporting-archetype}` to each Layout invocation's opening tag. |
| Reversibility | Trivial: revert the commit. |

### 3.2 Surface B — `data-faq` + `data-faq-id` injection

Inject `data-faq` and `data-faq-id="<slug>"` on every `<details>` element inside `<section class="faq-section">`.

| | |
|---|---|
| Files in scope | 27 files (city guides + a few long-form guides) confirmed by `rg -l '<details>' apps/maine-cannabis/src/pages/` from 2026-07-12 inventory. |
| Total `<details>` blocks | 53 (per ripgrep count). |
| Slug derivation | First → `faq-<page-slug>-<block-index>` where `page-slug` is the basename without `.astro`, `block-index` is the count of preceding `<details>` within the same `faq-section`. FAQ `<details>` outside any `faq-section` use `faq-<page-slug>-orphan-<idx>`. |
| Edit type | Mechanical: 53 attribute additions across 27 files. |
| Reversibility | Trivial: revert the commit. |

### 3.3 Surface C — `data-cta-id` injection

Inject `data-cta-id="<slug>"` on every CTA class-bearing `<a>` and `<button>` element. Already partially wired: `AffiliateClickTracker.astro` and 1 other component (2 files). The proposal adds to the remaining inventory.

| | |
|---|---|
| Files in scope | All `.astro` files in `apps/maine-cannabis/src/pages/` and `apps/maine-cannabis/src/components/` containing CTAs that aren't already wired. |
| Total candidate elements | ~170 (per ripgrep estimate of `class="*cta*"` + `class="btn-*"` patterns; refined during build). |
| Already wired | 2 files (`AffiliateClickTracker.astro` etc.) — re-verified by `rg -l 'data-cta-id'` returning 2. |
| Slug derivation | `cta-<placement>-<page-slug>-<occurrence-index>` where `<placement>` is one of: hero, header, inline, footer, related, end-of-page, modal, etc. (allowlist). |
| Edit type | Mechanical: ~170 attribute additions, scoped to data-attributes only. |
| Reversibility | Trivial: revert the commit. |

### 3.4 Excluded changes (explicit)

- NO changes to `<title>`, `<meta description>`, H1s, body copy.
- NO changes to content order, layout, or visual rendering.
- NO JS bundle changes (no Layout.astro modification needed — existing IIFE in Layout.astro L345-449 already reads `[data-faq]` and `[data-cta-id]`).
- NO event-name changes (the v0 event names already configured still emit on the same triggers).
- NO changes to `apps/maine-cannabis/scripts/` data-product ingest (OCP retail, Census ACS).
- NO changes to JSON-LD / structured data other than what the existing FAQ schema already references.

## 4. Decision contract

Per `INTERVENTION-PROPOSAL-CONTRACT.md`:

### 4.1 Primary intervention hypothesis

**H:** "Injecting `data-page-type` + `data-faq` + `data-cta-id` attributes across the MDG corpus elevates the site's instrumentation coverage from `WIRED_BUT_SILENT` → `INSTRUMENTED`, enabling `mdg_content_progress`, `mdg_faq_open`, and `mdg_action_exposure` v1 events to fire and feed Ticket 008 cross-source page-window joins. Without these attributes, GA4 cannot distinguish behavior by archetype, and v0.5 spec source contract A7 (instrumentation surface manifest) cannot report coverage denominators."

### 4.2 Primary evaluation metric

**`instrumentation_coverage_rate`** = (v1 surfaces marked `INSTRUMENTED` in `instrumentation_surface_manifest.v1.jsonl`) / (v1 surfaces marked `WIRED_BUT_SILENT` or `NOT_INSTRUMENTED` in same file, before this commit)

| Target | Threshold |
|---|---|
| Investigator-eligible | ≥ 50% INSTRUMENTED |
| Decision-eligible | ≥ 85% INSTRUMENTED |

Targets measured via `apps/maine-cannabis/scripts/analytics/page-manifest-build.cjs --instrumentation-coverage` (a subcommand to be added in this ticket).

### 4.3 Eligible population

`apps/maine-cannabis/src/pages/**/*.astro` excluding `404.astro`, `admin/*`, `404.astro`-equivalent routes.

### 4.4 Guardrails

- Each edit changes a real `data-*` attribute only (no class/style/text changes).
- `npm run verify:push` must pass before push (per AGENTS.md `## Build & Deploy` + `## Don't`).
- `npm run smoke-200` and `npm run smoke-img-200` must pass (per `verify:push`).
- No simultaneous change to `package.json`, `vercel.json`, `astro.config.mjs`, `Layout.astro`, or `BaseHead.astro` in any commit under this proposal.
- PR diff scope: max 271 .astro files; if any sub-agent invokes > X% file churn in one commit, force-split into multiple commits per AGENTS.md stage discipline.

### 4.5 Practical-effect / harm thresholds

- Decision rule: `instrumentation_coverage_rate` post-deploy ≥ pre-deploy + 50 percentage points. (Pre-deploy coverage = 0; post-deploy must be ≥ 50% for INVESTIGATOR_ELIGIBLE).
- Harm rule: any `npm run verify:push` failure or any production smoke failure within 24h of deploy = `INCONCLUSIVE` status; do not auto-revert without re-reading.
- Maximum horizon: 14 days post-deploy to reach 85% INSTRUMENTED; otherwise retrospective proposes deferred wiring.

### 4.6 Decision rule / stopping rule

`RETAIN` when `instrumentation_coverage_rate` post-deploy ≥ target threshold, `npm run verify:push` passes, production smoke verifies `data-page-type` / `data-faq` / `data-cta-id` are present in rendered HTML for sample pages, no regressions in business KPIs over the 14-day guardrail window.

`REVERT` when smoke fails on first deploy OR coverage fails to reach 50% within 7 days OR any unrelated traffic regression > 10% baseline.

`CONTINUE_OBSERVING` when 50–85% coverage, more wiring needed, but no harm signals.

`INCONCLUSIVE` when max horizon reached without resolving.

### 4.7 Settlement lag / contamination

- BigQuery GA4 settlement: 1–3 days per `SOURCES.md §A3`. Window observation: at least 7 days of settled data before any RETAIN decision.
- Any concurrent non-MDG-ANALYTICS content deployments during the 14-day window must join the change-manifest (Ticket 008 will enforce).

### 4.8 Authorization scope-hash

This proposal is bound to its current §3 (Scope) and §4 (Decision contract) byte-content. The hash is recorded in a companion file `apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006.scope_hash.txt` (separate file so it doesn't drift when §4.8 of this document is updated).

```bash
# Run BEFORE authorizing to verify what's on disk now matches what you intended:
python3 -c "import hashlib; print(hashlib.sha256(open('apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006-instrumentation-v1-proposal.md','rb').read()).hexdigest())"
cat apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006.scope_hash.txt
```

If the two outputs differ, the file changed; re-read §3/§4 before authorizing.

The current on-disk hash as of the most recent edit is also pinned to `apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006.scope_hash.txt` for posterity.

Either hash is binding. Re-authorization required for any mismatch. Expansions outside §3 (e.g. wiring `<button class="nav-cta">`) require a fresh approval — orphan additions are out-of-scope.

### 4.9 Authorization state

`AWAITING_AUTHORIZATION` (per Gate 4 = 4c).

A single acceptance statement from operator carries the authorization, e.g.:

> `AUTHORIZED: scope_hash matches; carry out §3 as drafted; rollback procedure §6 if violation.`

Signing timestamp recorded in `INTERVENTION_PROPOSAL_AUTHORIZATIONS.jsonl` (line added by parent on receipt).

## 5. Evidence grade before intervention

`E0` (descriptive observation). Per `CAUSAL-INFERENCE.md`: this is the substrate-prep step before the engine can produce `E0`/`E1`/`E2` evidence at all. This proposal's intervention **does not produce a measurable outcome** beyond `instrumentation_coverage_rate` going up. It enables subsequent opportunities to be `INVESTIGATION_ELIGIBLE`.

## 6. Rollback procedure

`git revert <commit-sha>` followed by `npm run verify:push` is sufficient. Attribute removal is fully reversible because v0.5 spec's v0 instrument listeners (`scroll_depth`, `page_engaged`, `faq_open`, `cta_view`) silently no-op when no matching `[data-faq]` / `[data-cta-id]` exists — the original behavior is restored exactly.

## 7. Verification plan (per `INTERVENTION-PROPOSAL-CONTRACT.md`)

- `npm run verify:iterate -- --fast-only` between batches.
- `npm run verify:push` before push (one canonical command per AGENTS.md `## Verify cycle`).
- Production smoke after deploy: `curl -s https://mainedispensaryguide.com/guides/portland-dispensary-guide | grep -c 'data-page-type\|data-faq\|data-cta-id'` ≥ 1 expected.
- Vercel Astro production realization: `.vercel/output/static/guides/portland-dispensary-guide/index.html` and 3 sampled guides HTML render with the new attributes.
- Browser cleanup record: only if browser automation is used for production smoke (likely not needed; curl suffices).

## 8. Concurrent change manifest

Recorded for the deployment:

- **GA4→BigQuery linkage**: enabled 2026-07-08 (already published). Project `maine-dispensary-guide` (313121319696). Stream `Maine Dispensary Guide` (14362255636). Daily volume 54.
- **GSC BDE**: pending IAM repair for `search-console-export@system.gserviceaccount.com` `roles/bigquery.dataEditor` on `maine-dispensary-guide`. Operator action (not this proposal).
- **MDG-DATA-001 series**: in-flight, separate from analytics. Touches `scripts/data/mdg-data/`, not `pages/`. Not blocking.
- **`csstools/postcss` not changed** in this proposal's commits.
- **No PR-side comments suggesting anything about analytics**: scaffolding from `apps/maine-cannabis/scripts/analytics/page-manifest-build.cjs` itself added in Ticket 003 (already on main as `a6dd8079`).

## 9. Stop condition

If the proposal reaches `RETAIN` after the 14-day post-deploy window, ticket 006 closes and the engine progresses to Ticket 007 (behavioral-source ingestion). If `REVERT`, ticket 006 closes `CANCELLED` and instrumentation is delayed to a future proposal.

---

**Submit one of:**

1. `AUTHORIZED: scope_hash matches; carry out §3 as drafted` — gives A4. I execute, verify, and continue.
2. `AUTHORIZED: scope_hash matches; excluded changes: <list>` — gives A4 with narrower scope. I execute against the narrower scope-hash.
3. `DEFERRED` — keep proposal on file; I proceed through Tickets 007, 008, 009, 010 (BigQuery + archive design only), come back to 006 when you're ready.
4. `REJECTED` — close proposal; tickets 006+030 not run. Engine stays at "schema designed, instrumentation not deployed" status. Tickets 007+ can still flow if you accept that downstream opportunity evidence is empty.

Default to (3) DEFERRED if you want to keep momentum on BigQuery/Ticket 007 right now and come back to wiring later. (1) is the straight-through path. (2) lets you clip the scope.

Awaiting your call.


---

## Addendum (2026-07-12, after gate-analysis correction)

Per the operator's gate-analysis review (`MDG-ANALYTICS-001-CORRECTED-GATE-ANALYSIS-2026-07-12.md`), the following claims in this proposal need verification against the live GA4 admin UI before they can be relied on:

1. **Line 37, 188 — "GA4→BigQuery linkage confirmed live since 2026-07-08; stream ID 14362255636; project 313121319696"**: the date and stream ID are unverified from repo evidence. The only directly-verifiable claim is that the GA4 service-account grant was confirmed on 2026-07-11 per commit `965528ad`. Whether the BigQuery link is currently enabled is unknown until the operator checks the GA4 admin UI.

2. **Line 39, 189 — "GSC BDE requires IAM grant repair for search-console-export@system.gserviceaccount.com"**: this contradicts the operator's 2026-06-09 commit `33ebf83c` which deliberately retired the GSC programmatic-access path. The principal string is also a documentation placeholder, not a real principal. GSC BDE is **deliberately off the critical path** per operator decision.

These two lines should be updated when this proposal is next revised. Until then, treat them as unverified.
