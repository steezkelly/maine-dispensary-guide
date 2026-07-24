# MDG Signal — Production Plan

**Date:** 2026-07-23
**Status:** Living document — written to satisfy spec §10's "separate approved plan" gate before production promote (the spec is on `origin/design/mdg-signal-data-explorer-20260723`, see `docs/superpowers/specs/2026-07-23-mdg-signal-data-explorer-design.md`).
**Scope:** Maine only. Production promote gate for MDG Signal: `?promoted=true` URL query parameter (legacy) or, after 2026-07-24, the build-time `MDG_SIGNAL_PROMOTE=true` env var (the only mechanism that actually works on a static site — see `SignalLayout.astro:42-55` and the independent review F-4 in `docs/audits/mdg-signal-independent-review-2026-07-23.md`).

## 1. Route ownership

- **`/signal/`** — read-only research index of the curated set (11 municipalities as of release `ded381696bddf56f`). Owned by `apps/maine-cannabis/src/pages/signal/index.astro`. Slug-only static; no client JS that hits a backend.
- **`/signal/[municipality]/`** — per-municipality deep-dive (comparison grid, evidence drawer, alert preview, watchlist preview, peer swap). Owned by `apps/maine-cannabis/src/pages/signal/[municipality]/index.astro`. Dynamic-static via `getStaticPaths()` over `SIGNAL_PAGE_MODEL.municipalities`. 11 routes built deterministically per MDG-DATA release.
- **Layout**: `apps/maine-cannabis/src/layouts/SignalLayout.astro`. Owns the workspace chrome (topbar, dark mode, JSON-LD graph, intent tracker). Carries the prototype boundary in copy and in JSON-LD description.
- **Sitemap membership**: `/signal/*` is excluded from the public sitemap by `scripts/check/sitemap-postprocess.mjs`'s `NOINDEX_PATH_PREFIXES` and by `scripts/check/sitemap-postprocess.mjs`'s `isNoindexSource`. The pages stay `noindex,nofollow` until the operator flips the env flag.
- **Promotion flag**: `MDG_SIGNAL_PROMOTE=true` flips every `/signal/*` page from `noindex,nofollow` → `index,follow`. To demote, unset the env var and redeploy. (Earlier `?promoted=true` URL-param mechanism is removed; it never worked on `output:'static'`.)
- **`/`** (homepage) — the cross-link from the homepage is a separate concern, owned by the cross-link PR (`feat/signal-cross-link-from-guides-2026-07-24`).

## 2. Component boundaries

| Component | Path | Owns | Does NOT own |
| --- | --- | --- | --- |
| `SignalLayout` | `src/layouts/SignalLayout.astro` | Topbar chrome, JSON-LD graph, theme tokens, workspace-controller loader. Globally-namespaced CSS via `is:global` (necessary because page content slots in with a different `data-astro-cid`). | Skip-to-content, page-level SEO meta (each page owns its title/description). |
| `SignalIntentTracker` | `src/components/SignalIntentTracker.astro` | `dataLayer.push` + `gtag` (parity with `AffiliateClickTracker.astro`). | Substantive analytics wiring (Vercel/GA4 ingestion is the global analytics pipeline). |
| `RelatedSignal` | `src/components/signal/RelatedSignal.{ts,astro}` | The "Related MDG content" rail that links from `/signal/*` back to canonical guides, opt-in tracker, OCP license map, market-stats, find-a-dispensary. TDD-tested builder. | Anything outside the rail. |
| `CrossLinkFromGuide` | `src/components/signal/CrossLinkFromGuide.{ts,astro}` | The reciprocal one-link callout on each per-city dispensary guide. TDD-tested builder. Styled with `--color-primary` / `--color-accent` tokens. | Belongs to a separate branch/PR. |
| `workspace-client.js` | `src/components/signal/workspace-client.js` | Theme toggle, drawer open/close + Escape + focus restore, swap-peer, alert-condition selector, toast confirmation. Single defensive IIFE — each behavior no-ops when its target is missing, so it is safe to load on every `/signal/*` page. | The toast is shared across pages, so the layout's `<div id="toast">` shell must be present in any page that wants toasts. Currently only the municipality page has it (by design — the toast is a workspace feature). |

## 3. Server / static architecture

- **Output mode**: `astro.config.mjs` is `output: 'static'`. No `.vercel/output/functions/` directory is present. The CI rejects a function bundle if one ever appears (see the "Assert pure-static build" step in `.github/workflows/ci.yml`).
- **No backend endpoints**: all data sources are checked-in MDG-DATA artifacts under `apps/maine-cannabis/src/data/generated/mdg-data/current/`. The `signal-page-model.cjs` derivation reads these at build time and emits a TypeScript module (`current.ts`) the Astro pages import.
- **CI derive step**: `.github/workflows/ci.yml` runs `npm --workspace @network/maine-cannabis run signal:derive` before `Type check` so the generated module is never stale.
- **Promotion = env var**: a static site has only one promotion mechanism — the env var. Use `MDG_SIGNAL_PROMOTE=true` in the Vercel project (production env) to promote; unset to demote.

## 4. Data publication policy

- **What is published:** license counts, ACS population, licenses per 10K, store names + license numbers + first-issued dates. These are the explicit per-spec §2 "Current, defensible data shown" rows.
- **What is NOT published:** `contact_email` and `contact_phone` (stripped at derivation, `signal-page-model.cjs:50-72`); menu-price claims (`dispensary-menu-prices.csv` never read); MUNICIPAL opt-in claims beyond the partial-capture disclosure; "underserved" / "attractive" / "investment-ready" language.
- **Source attribution:** every metric carries the release id (`ded381696bddf56f`), source IDs (`ocp_licenses`, `census_acs5_population`, `ocp_dispensaries_firecrawl`), data-as-of date (2026-06-01), ACS vintage (2024), transform version, and fetch timestamp. JSON-LD `sameAs` cites OCP and Census. `isBasedOn` cites the same.
- **Refresh cadence:** when the MDG-DATA release version increments, regenerate via `npm --workspace @network/maine-cannabis run signal:derive` and ship a small PR with the new release id. No infrastructure change required.

## 5. Privacy

- No PII is published. The derivation strips `contact_email` and `contact_phone` from the source CSVs even though they would not be on the page; the strip is a defense-in-depth measure for future scopes.
- The pages emit `noindex,nofollow` by default. GA4 event tracking is opt-in via the workspace UI; clicking a swap, drawing an alert, or opening the watchlist does NOT by itself fire GA4 events — only the proposed-paid preview buttons do, and they fire explicit `Preview only — no X was saved or sent.` toasts.
- The 5 intent events (`municipality_select`, `peer_add`, `evidence_open`, `watchlist_open`, `alert_preview`) carry only the workspace's own tags (`signal_label` = city name, `signal_section` = "comparison" / "preview" etc.); no user-id, no PII.

## 6. Account design (the non-account by design)

- **No accounts are created.** No login, no signup, no cookies that identify a user. Sessions are stateless. The 5 intent events produce only aggregate counts in GA4.
- **A future "saved watchlist" capability** would require a real account system with rate limits, MFA, password rotation, and a privacy disclosure. The spec lists this as explicitly out of scope (§8). Adding it requires a new plan doc, new accepted-risk acknowledgement, and a separate approved PR.

## 7. Alert semantics (the non-feature by design)

- **No alert scheduling, no email/SMS, no webhooks.** The watchlist and alert drawers render UI preview only. The toast strings are explicit: `peer_add` → "Preview only — no peer was saved to a watchlist." `source_open` → "Preview only — the evidence drawer is read-only." `watchlist_open` → "Preview only — no scope was saved and no account exists." `alert_preview` → "Preview only — no alert was saved or sent."
- **Three alert conditions** are demonstrated visually but produce no delivery: license-count change, source refresh, data-state change. Each has its own alert-anatomy copy in `workspace-client.js:24-47`. The alert drawer shows the copy based on the selected condition + the subject city name.
- **A future real alert** would require a server that holds a user's watchlist + a comparison engine that diffs releases. The spec lists this as out of scope (§8). The integration review (`docs/audits/mdg-signal-independent-review-2026-07-23.md`) confirms none of this exists.

## 8. Reactions-loop gate

Per spec §6 + the measurement note (`docs/analytics/MDG-SIGNAL-SLICE-MEASUREMENT-NOTE-2026-07-23.md`), the slice stays out of the public sitemap and `noindex,nofollow` until at least one external operator reaction is recorded AND the documented thresholds are met:

- ≥ 25 distinct users reading the surface in a rolling 30-day window, AND
- ≥ 5 `watchlist_open` GA4 events in the same window, AND
- ≥ 1 documented external operator reaction (recorded in `docs/analytics/` or a follow-up review note).

Promotion (env var flip) happens after ALL three thresholds clear.

## 9. Coupling with PR #157 (cross-link card `t_17f3d763`)

The reciprocal cross-link PR (`feat/signal-cross-link-from-guides-2026-07-24`, owned by `t_17f3d763`) edits the per-city dispensary guides to link back to `/signal/<city>/`. Its dependencies:

- Requires `/signal/*` pages to be deployed (this branch) — without it, the links 404.
- The integration order recommended in the PR body is: **merge this PR first**, then rebase and merge #157.

## 10. Open items

- Re-run the model-diverse review at any future scope change (the work was reviewed once by an independent subagent; ongoing governance should keep this in cadence).
- Add an Escape + focus-movement test for `workspace-client.js` — flagged as untested in the spec audit (audit row §7, finding F-§7).
- Extend the smoke from 4/12 routes to all 12 — flagged as thin coverage (review F-10).

Refs:
- design spec: `docs/superpowers/specs/2026-07-23-mdg-signal-data-explorer-design.md` on `origin/design/mdg-signal-data-explorer-20260723`
- kanban: `t_8dc65ba5`
- independent review: `docs/audits/mdg-signal-independent-review-2026-07-23.md`
- spec self-audit: `docs/audits/mdg-signal-spec-audit-2026-07-24.md`
- measurement note: `docs/analytics/MDG-SIGNAL-SLICE-MEASUREMENT-NOTE-2026-07-23.md`
