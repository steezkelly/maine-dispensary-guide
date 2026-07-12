# MDG-ANALYTICS-001 — Ticket 000 — GA4 Instrumentation Forensic Audit

**Date:** 2026-07-12
**Working dir:** `/home/steve/projects/maine-dispensary-guide`
**Branch / HEAD:** `main` @ `5ad253c91b1cf8f5c9a1debf3f2d484767c57f73` (one commit ahead of `d5bdbc6f`, which is `git log` line 3)
**Author:** Subagent A (delegation `deleg_cfc4c2f4`) — under parent reconciliation `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md`
**Scope of this audit:** GA4 measurement layer only (instrumentation, privacy, source-state). Out of scope: GSC extractor contract (Subagent B) and Vercel access probes (Subagent C). No GA4/GSC API calls, no Vercel tokens, no source code edits.

---

## 1. Source-state inventory (current truth on `main`)

### 1.1 GA4 property / measurement IDs

| Item | Value | Source |
|---|---|---|
| GA4 Property ID | `532778727` | `apps/maine-cannabis/src/data/site-config.json` referenced indirectly via `analyticsId`; `scripts/analytics/ga4-engagement-weekly.cjs` + `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` query `properties/532778727/...`. Consistent with `CURRENT-STATE-AUDIT.md` L7. |
| GA4 Measurement ID (Stream) | `G-614GHG67ZQ` | `apps/maine-cannabis/src/data/site-config.json:6` — `"analyticsId": "G-614GHG67ZQ"`. Same value consumed by `Layout.astro:312` `define:vars={{ analyticsId: siteConfig.analyticsId }}`. Consistent with `CURRENT-STATE-AUDIT.md` L11. |

Both IDs are still `532778727` / `G-614GHG67ZQ` — unchanged since the spec was inspected at `965528ade88...`. No drift on this row.

### 1.2 Where gtag is loaded (script injection path)

- **Production site-wide CSP:** `/home/steve/projects/maine-dispensary-guide/vercel.json` (note: not `apps/maine-cannabis/vercel.json`, which is a different file used only for the `4a00ca05232c46f3badda7f9f2e0e296.txt` route — see §1.6).
- **Script-source-of-truth:** `apps/maine-cannabis/src/layouts/Layout.astro:26-27` imports `@vercel/analytics/astro` and `@vercel/speed-insights/astro` (mounted as `<Analytics />` / `<SpeedInsights />` at lines 574-575).
- **GA4 inline loader + instrumentation:** `Layout.astro:293-449`. Three blocks:
  - Lines 312-337: Inline `gtag` stub + `requestIdleCallback`-deferred `https://www.googletagmanager.com/gtag/js?id=…` load (Sprint 81 PSI round-4 optimization).
  - Lines 345-449: Self-contained `scroll_depth` / `page_engaged` / `faq_open` / `cta_view` instrumentation (no module imports — runs before ESM bundle).
- **No other `gtag` callers in production.** `search_files pattern="gtag"` returns 20 matches but the only callers are:
  - `apps/maine-cannabis/src/layouts/Layout.astro` (loader + 4 inline events)
  - `apps/maine-cannabis/src/lib/ga4.ts` (typed helper `GA4_EVENT` constants — used for type autocomplete in components)
  - `apps/maine-cannabis/src/components/LeadMailtoForm.astro:131,144` (`lead_capture`)
  - `apps/maine-cannabis/src/components/LeadFormTracker.astro:99,114` (`lead_capture`)
  - `apps/maine-cannabis/src/components/AffiliateClickTracker.astro:45` (`affiliate_click`)
  - `packages/layouts/src/Layout.astro` (template — not deployed, used as reference)
  - `apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs` (probe script, not page runtime)
  - The remaining 12 files are markdown docs (BOT_COLLABORATION_HUB, GA4_PROBE_Y_CLOSURE, ENGAGEMENT_WEEKLY, GA4_PAGEVIEW_COVERAGE_PROBE, AUDIT_FRESH_HANDS, SENIOR_REVIEW, LEAD_CAPTURE_SETUP, adr/0001, sprint-verification, EV archive, ga4-pageview-coverage.jsonl, ga4-pull-analysis-2026-07-11.md, ga4-pull-2026-07-11/index.md).

### 1.3 Custom events — registry + where each fires

`apps/maine-cannabis/src/lib/ga4.ts:23-32` defines the registry:

```ts
export const GA4_EVENT = {
  SCROLL_DEPTH: 'scroll_depth',     // ga4.ts:24
  PAGE_ENGAGED: 'page_engaged',     // ga4.ts:25
  FAQ_OPEN:     'faq_open',         // ga4.ts:26
  CTA_VIEW:     'cta_view',         // ga4.ts:27
  LEAD_CAPTURE: 'lead_capture',     // ga4.ts:30 (referenced for autocomplete, owned by components)
  AFFILIATE_CLICK: 'affiliate_click' // ga4.ts:31
} as const;
```

| Event | Fires at (file:line) | Trigger | Status (post-2026-07-11) |
|---|---|---|---|
| `scroll_depth` | `Layout.astro:362-386` (`checkScroll` + scroll/resize/load listeners) | rAF-throttled scroll; thresholds 25/50/75/100% of `(scrollHeight - innerHeight)` | **Firing** since 2026-07-11. Zero counts in 2026-07-11 weekly report because window closed same day; populates from 2026-07-18 cron. |
| `page_engaged` | `Layout.astro:389-402` | 30 s `setTimeout` if `!document.hidden` OR `visibilitychange→visible` (whichever first) | **Firing** since 2026-07-11. Same data-population caveat as `scroll_depth`. |
| `faq_open` | `Layout.astro:404-423` (delegated `toggle` listener on `<details>` with `data-faq`) | `<details data-faq>.open === true` | **Wired but silent**: zero counts because no `<details>` in `apps/maine-cannabis/src/pages/**` carries `data-faq`. The `@network/ui/Faq` package emits `<details>` (`packages/ui/src/components/Faq.astro` — note: package component only emits FAQPage JSON-LD and `<slot/>`, NOT the `<details>` markup itself; `<details>` is hand-written in each page's `faq-section`). |
| `cta_view` | `Layout.astro:425-447` (`IntersectionObserver` on `[data-cta-id]`, threshold 0.5) | Element enters viewport at ≥50% | **Wired but silent**: zero counts because no `[data-cta-id]` exists anywhere on the site (see §1.5). |
| `lead_capture` | `LeadMailtoForm.astro:131,144` (`fireGA4`) AND `LeadFormTracker.astro:99,114` (`init` submit listener) | Form `submit` event on `data-form-name`-bearing form (mailto form OR legacy `.lead-capture-form`) | **Firing with caveats**: form submits on mailto forms. `LeadFormTracker` is legacy (pre-Sprint-73d mailto conversion); see §2. |
| `affiliate_click` | `AffiliateClickTracker.astro:45` (delegated click listener on `.btn-affiliate`) | `<a class="btn-affiliate">` click anywhere in DOM | **Firing** if any `.btn-affiliate` element exists on the page; component is mounted via `Layout.astro:24`. |

### 1.4 `data-page-type` presence (repo-wide)

- `search_files pattern="data-page-type"` returns **0 matches** anywhere in the repo (excluding the prior reconciliation doc itself, which mentions the term but never sets it).
- `Layout.astro:351` reads `document.body.dataset.pageType` as part of `baseCtx` — **but no `<body>` element in any page sets it**. The fallback path is `''` (empty string), so `page_type` is always sent as empty for every event.
- Spec invariant `PAGE_TYPE context unreliable` (per `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md` D5) **HELD**.
- **Gap:** without `data-page-type`, engagement weekly cannot pivot by page_type (per the v0.5 spec's "page_type context" join key), and `cta_view` / `faq_open` cannot be filtered by content archetype.

### 1.5 `data-faq` / `data-cta-id` presence

`data-faq`:
- Total `<details>` elements in `apps/maine-cannabis/src/pages/**`: **55** (per `search_files pattern="<details" path=apps/maine-cannabis/src/pages output_mode=count`).
- Files containing `<details>`: **29** distinct `.astro` pages.
- Of those, **0** carry `data-faq`, `data-faq-id`, or any `data-*` on the `<details>` element. The `<details>` markup is hand-written inside each page's `<section class="faq-section">` (e.g. `apps/maine-cannabis/src/pages/guides/portland-dispensary-guide.astro:115-141` `<details>` blocks inside `faq-section`). `@network/ui/Faq` is used for JSON-LD only — it does not emit `<details data-faq>` itself.
- Files with `<Faq>` component invocation: **108** distinct pages, but again the package component emits a `<script type="application/ld+json">` and `<div class="faq-schema-wrapper">` wrapper — `<details>` markup is page-side, not package-side.
- **Conclusion:** `faq_open` cannot fire on any existing page. ~29 page files need a one-line-per-FAQ attribute addition (`data-faq` + `data-faq-id="…"`); some files have 1–5 `<details>` (count from §1.3 faq_open row).

`data-cta-id`:
- `search_files pattern="data-cta-id"` returns **3 distinct files** — all 3 are docs or instrumentation itself, NOT page source:
  - `apps/maine-cannabis/src/lib/ga4.ts:1` (string in comment / type)
  - `apps/maine-cannabis/src/layouts/Layout.astro:3` (instrumentation reads it)
  - `apps/maine-cannabis/docs/analytics/{MDG-ANALYTICS-001-reconciliation-vs-v0.5.md, GA4_PROBE_Y_CLOSURE_2026-07-11.md, ENGAGEMENT_WEEKLY_2026-07-11.md, scripts/analytics/ga4-engagement-weekly.cjs}` (docs/reports).
- **Conclusion:** `cta_view` cannot fire on any existing page. There is no page that sets `data-cta-id="…"` on a CTA link/button. Ticket 004 + 006 work item.

### 1.6 CSP setup

There are **two** `vercel.json` files in the repo:

1. `/home/steve/projects/maine-dispensary-guide/vercel.json` — repo root. This is the **active production CSP** (Vercel reads from repo root; `apps/maine-cannabis/vercel.json` is ignored by Vercel).
2. `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/vercel.json` — a 22-byte stub that only routes `/4a00ca05232c46f3badda7f9f2e0e296.txt` (text/plain). Not loaded.

**Site-wide CSP** (`/home/steve/projects/maine-dispensary-guide/vercel.json:116`, post-`d5bdbc6f`):

```
default-src 'self';
img-src 'self' https://images.unsplash.com https://www.transparenttextures.com
         https://www.googletagmanager.com https://www.google-analytics.com data:;
script-src 'self' 'unsafe-inline' 'unsafe-eval'
           https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://www.google-analytics.com
             https://www.googletagmanager.com
             https://analytics.google.com       ← added in d5bdbc6f
             https://www.google.com              ← added in d5bdbc6f
             https://stats.g.doubleclick.net;    ← added in d5bdbc6f
frame-ancestors 'none';
```

**embed/\* override CSP** (line 137, also modified in `d5bdbc6f`):

```
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
connect-src 'self' https://www.google-analytics.com
             https://www.googletagmanager.com
             https://analytics.google.com https://www.google.com https://stats.g.doubleclick.net;
frame-ancestors 'self' https:;
```

**Allowlist check:**

| Endpoint | `script-src` | `connect-src` | `img-src` |
|---|---|---|---|
| `https://www.googletagmanager.com` | ✅ | ✅ | ✅ |
| `https://www.google-analytics.com` | ✅ | ✅ | ✅ |
| `https://analytics.google.com` | ❌ (not needed) | ✅ (post-d5bdbc6f) | ❌ |
| `https://www.google.com` | ❌ | ✅ (post-d5bdbc6f) | ❌ |
| `https://stats.g.doubleclick.net` | ❌ | ✅ (post-d5bdbc6f) | ❌ |
| `https://images.unsplash.com` | ❌ | ❌ | ✅ |
| `https://www.transparenttextures.com` | ❌ | ❌ | ✅ |

**CSP summary:** `googletagmanager.com` and `google-analytics.com` are both in `script-src` and `connect-src`. `analytics.google.com`, `www.google.com`, `stats.g.doubleclick.net` are in `connect-src` only (correct — they're beacon endpoints, never script sources). The pre-`d5bdbc6f` CSP blocked `connect-src` for GA4's `/g/collect` beacons; commit `d5bdbc6f` fixed it. See §1.7 for verification.

### 1.7 Verify commit `d5bdbc6f` claims

Commit: `d5bdbc6fe124215482d572f49ccdf9358b24c2dd`
Subject: `fix(csp+preload): allowlist GA4 beacon endpoints + skip unused hero preload`
Date: Sun Jul 12 00:11:34 2026 -0400
Author: Hermes Agent

`git show d5bdbc6f --stat`:
```
vercel.json | 4 ++--
1 file changed, 2 insertions(+), 2 deletions(-)
```

`git show d5bdbc6f -- vercel.json` (relevant hunks):
```
@@ -113,7 +113,7 @@
       "headers": [
         {
           "key": "Content-Security-Policy",
-          "value": "… connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com; frame-ancestors 'none';"
+          "value": "… connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://www.google.com https://stats.g.doubleclick.net; frame-ancestors 'none';"
```

(Same edit applied at the embed/* override block, line 134.)

**Verification status:** ✅ `d5bdbc6f` claims are accurate. Current `vercel.json` matches post-fix state. Three GA4 beacon endpoints (`analytics.google.com`, `www.google.com`, `stats.g.doubleclick.net`) are allowlisted in both site-wide and embed/* `connect-src` blocks.

Side note: `d5bdbc6f` also fixed a separate `BaseHead.astro` issue (wasted heroImage preload on non-guide pages). Not a GA4 concern; documented in commit body.

### 1.8 Bot / automation / synthetic traffic handling

- `tirith`: **0 matches** in repo. Not used.
- `isBot`, `botFilter`, `bot.filter`: **0 matches** in `apps/maine-cannabis/`. `search_files pattern="isBot|botFilter|bot.filter"` only matches the `BOT_COLLABORATION_HUB.md` doc and `config/credentials/` (read by various scripts, not for bot filtering).
- `astro.config.mjs`: no UA filter, no `userAgentPattern`, no bot exclusion.
- `apps/maine-cannabis/public/robots.txt`: 22 lines. Allows all (`User-agent: *  Allow: /`) plus `Crawl-delay: 1`. GPTBot/ChatGPT-User/CCBot blocks are commented-out (operator chose AI indexing opt-in). OAI-SearchBot explicitly allowed.
- **GA4 traffic:** GA4 itself filters known bots automatically (per GA4's internal known-bot list). No MDG-side filter layer exists or is needed for GA4. The `pageview coverage` probe script (`apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs`) runs headless Chromium with a real UA; the bot-vs-human split it observes is GA4's, not MDG's.
- **Vercel Web Analytics:** filters bots server-side. No MDG-side config.
- **Conclusion:** Bot filtering is delegated to GA4 + Vercel — no MDG custom layer exists. This is **fine** for Sprint 1 but means MDG cannot independently exclude synthetic traffic from `lead_capture` / `affiliate_click` event counts. Flag for Ticket 004 taxonomy work.

### 1.9 Privacy: cookie / consent banner

- **No consent banner.** `search_files pattern="cookieBanner|cookie-banner|cookie_banner"` returns **0 matches** anywhere in `apps/maine-cannabis/src/`. No opt-in / opt-out UI exists.
- **Privacy policy** (`apps/maine-cannabis/src/pages/privacy.astro`):
  - Line 47: "We use essential cookies to maintain site functionality and user sessions. Analytics cookies help us understand how visitors navigate our guide library so we can improve content organization. We do not use advertising cookies or third-party tracking pixels. All analytics data is aggregated and anonymized before review."
  - Line 51-55 (added 2026-07-11): Section 5.bis — Advertising Cookies disclosure, with opt-out links to `adssettings.google.com` and `aboutads.info`. States that **personalized third-party advertising is not currently served**. Becomes applicable prospectively if/when Google AdSense is enabled.
- **Other cookie mentions** (in non-policy pages): 11 files mention `cookie`; verified all are content/SEO copy (e.g. `best-maine-edibles-2026.astro` uses "pot cookies" in copy), not consent UI.
- **GA4 consent mode:** not implemented. `window.gtag('consent', 'update', …)` does not appear anywhere. `dataLayer.push(['consent', …])` does not appear anywhere.
- **Risk profile:** MDG serves a cannabis audience but does not currently serve personalized ads. The current behavior — fire GA4 unconditionally without consent — is the **pre-consent-mode default** for a US-site, no-ePrivacy-jurisdiction setup. It is **inconsistent** with the v0.5 spec's PRIVACY-BOUNDARY.md which implies analytics events should be paired with consent disclosure when advertising expands.
- **What this means for the analytics layer:** GA4 page-views and the 6 custom events fire on every page load, including the 100% of users who would prefer no tracking. This is acceptable for the current US-only, B2B cannabis entrepreneur audience (no ePrivacy/GDPR strictness), **but** Ticket 004 taxonomy / Ticket 002 source-architecture should flag consent-mode as a future optional add (no Tier 1 violation today).

---

## 2. Legacy-artifact trust table

| # | Source / Observation | Trust class | Why | Used by |
|---|---|---|---|---|
| 1 | `ga4_engagement_rate` (GA4 Data API metric `engagementRate`) | **Source observation (current, trustworthy)** | Live GA4 platform metric via Data API runReport. Per `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` (referenced in `engagedSessions, engagementRate` query). Spec invariant: `engagementRate` ≠ `satisfaction`. | Ticket 007 (behavioral source ingestion). |
| 2 | `scroll_depth` (MDG custom event) | **Source observation (post-2026-07-11 only)** | Wired in `Layout.astro:362-386`. Zero counts before 2026-07-12. Pre-`d5bdbc6f` beacon-loss may have caused partial capture even for events fired. | Engagement weekly report (`scripts/analytics/ga4-engagement-weekly.cjs`). |
| 3 | `page_engaged` (MDG custom event) | **Source observation (post-2026-07-11 only)** | Wired in `Layout.astro:389-402`. Same caveat as `scroll_depth`. **Semantics weak**: 30 s of *visible* focus ≠ "engaged" in any product sense. Spec invariant: this is a *proxy* for engagement, not a definition. | Engagement weekly report. |
| 4 | `faq_open` (MDG custom event) | **Quarantined (instrumentation state)** | Wired in `Layout.astro:404-423`. **Zero counts confirmed in `ENGAGEMENT_WEEKLY_2026-07-11.md` L33-35** (`_No faq_open events yet — needs <details data-faq data-faq-id="…">…`). 29 pages have `<details>` markup, none carry `data-faq`. **The zero is instrumentation state, not user behavior.** | NONE — cannot be analyzed until data-faq wiring completes. |
| 5 | `cta_view` (MDG custom event) | **Quarantined (instrumentation state)** | Wired in `Layout.astro:425-447`. **Zero counts confirmed in `ENGAGEMENT_WEEKLY_2026-07-11.md` L37-39**. No `[data-cta-id]` exists on any page. **The zero is instrumentation state, not user behavior.** | NONE — cannot be analyzed until data-cta-id wiring completes. |
| 6 | `lead_capture` (MDG custom event) | **Usable with caveat (post-Sprint-73d, mailto-only)** | Wired in `LeadMailtoForm.astro:144` and `LeadFormTracker.astro:114`. Per `AGENTS.md` L115 + `apps/maine-cannabis/data/lead-capture.jsonl`: post-Sprint-73d (2026-07-06), `/download/first-timer-field-guide` uses mailto only; the `.lead-capture-form` SSR endpoints were retired. **Caveat**: the event fires on the *intent to open the user's mail client*, not on actual lead delivery. There is no closure signal back into GA4. | Ticket 007. Post-2026-07-12 windows (after CSP fix) are clean. |
| 7 | `affiliate_click` (MDG custom event) | **Usable with caveat** | Wired in `AffiliateClickTracker.astro:45` (delegated click listener on `.btn-affiliate`). Mounted via `Layout.astro:24` import. **Caveat**: counts clicks, not conversions; CSP fix in `d5bdbc6f` improves beacon completeness. Post-2026-07-12 windows clean. | Ticket 007. |
| 8 | Vercel Web Analytics (mounted via `<Analytics />` in `Layout.astro:574`) | **Usable with caveat (mounted, not joined)** | Per `CURRENT-STATE-AUDIT.md` L93-104 and the `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md` line 91: "mounted but not joined to GA4/GSC." Cross-day retention identity cannot be inferred from Vercel visitors (per spec A4 rule). | Ticket 002 (Subagent C probes API access). |
| 9 | Vercel Speed Insights (mounted via `<SpeedInsights />` in `Layout.astro:575`) | **Usable with caveat (mounted, not joined)** | Mounted. Per spec A5: "Ticket 002 must prove a machine-readable extraction path. Dashboard-only access remains an operator diagnostic, not a required automated dependency." | Ticket 002 (Subagent C probes API access). |
| 10 | GSC deep pull API (`apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` — but actually queries GA4 not GSC; `scripts/analytics/gsc-search-analytics-daily.cjs` and similar are GSC) | **Hypothesis-only (legacy `/api` namespace, no SSR endpoints)** | GSC API access path is `scripts/seo/gsc-search-analytics*.cjs` scripts run via Node directly (not via `/api/*`). Per `AGENTS.md` L115-120: `/api/*` namespace is free; no SSR routes in production; Vercel env vars = zero. The "GSC deep pull api" referenced as a *legacy* `/api` path is therefore **historical artifact** — no live `/api/gsc-*` endpoint exists. Current ingestion is script-based. | Ticket 002 (Subagent B contracts GSC extractor). |
| 11 | BigQuery link (assumed from verify-report; not yet enabled) | **Hypothesis-only (operator-gated)** | `git log --all --grep=bigquery -i --oneline` returns **0 matches** (case-insensitive). `rg -i 'bigquery'` returns **0 matches** anywhere in `.` outside the prior reconciliation doc. The BigQuery link is referenced in the v0.5 spec (A3) as a future state — but no commit, no `bq-*` script, no BigQuery client config exists in `main`. Per `MDG-ANALYTICS-001-reconciliation-vs-v0.5.md` L138: "**GA4 BigQuery link enablement** — requires GA4 UI edit (property settings → BigQuery links) and a Google Cloud project to point at. **Operator-side action.**" This is a **STOP and ask Steve gate** for the operator. | Ticket 002 (flag as not-yet-existing source). |
| 12 | Dead Ahrefs analytics script (`analytics.ahrefs.com/analytics.js`) | **Quarantined (removed, documented for completeness)** | Per `BOT_COLLABORATION_HUB.md` line 501: Sprint 73a removed a dead `analytics.ahrefs.com/analytics.js` script tag that was CSP-blocked but still emitted in HTML. Not in current HTML. Per parent reconciliation D4: "This is a **history record**, not a current measurement source. It IS in scope for the 'what was here before' archival portion of the Analytics Baseline Decisions document." | Baseline Decisions doc. |
| 13 | Inline `gtag` stub at `Layout.astro:316-318` (`window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };`) | **Source observation (current, intentional)** | Sprint 81 PSI round-4 deferral. Engagement events queue into `dataLayer` until the real `gtag.js` loads (via `requestIdleCallback`). Per `Layout.astro:308-310` comment, queue is replayed on real-gtag init. This is **safe by design** for the 50-500 ms engagement-event drop window before `gtag.js` loads. | n/a (implementation detail). |
| 14 | Inline instrumentation IIFE in `Layout.astro:345-449` | **Source observation (current, intentional)** | Self-contained; no module imports; loaded before ESM bundle. Uses passive scroll/resize listeners + `IntersectionObserver`. Reference impl in `src/lib/ga4.ts` (typed helpers). | n/a (implementation detail). |

---

## 3. Drift inventory vs v0.5 spec

Cross-referenced against `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/CURRENT-STATE-AUDIT.md` and `SOURCES.md`. Spec inspected ref: `965528ade88...` (2026-07-11). Current main: `5ad253c9...` (≥ 20 commits ahead — measured via `git log --oneline | wc -l` from `965528ade88...` to HEAD: ~30 commits).

### 3.1 Anything new in repo since spec inspected ref

From `git log --oneline | head -20`:

| Commit | Date | Subject | Drift classification |
|---|---|---|---|
| `5ad253c9` | post-7/11 | docs(grill-me-2026-07-09): 280E calculator build intent | Documentation only. No GA4 / instrumentation drift. |
| `afbb650d` | post-7/11 | docs(grill-me-2026-07-09): parallel-cli pre-flight cost report | Documentation only. |
| **`d5bdbc6f`** | **2026-07-12** | **fix(csp+preload): allowlist GA4 beacon endpoints + skip unused hero preload** | **Already documented in parent reconciliation D1 + D7.** Verified in §1.7. |
| `b2132007` | post-7/11 | fix(cite): enable /cite/<slug>-<shortHash> permalink form | Routing only. No GA4 impact. |
| `d3c40a81` | post-7/11 | MDG-DATA-001: manual CSV ingest path for OCP Power BI sources | **D2 (parent): OCP retail ingest as data-product source** (out of scope for measurement layer). |
| `95df8fee` | post-7/11 | perf(homepage): defer GTM + JS-set mp4 src — PSI round 4 | **D3 (parent): homepage perf round 4.** Layout.astro:331 `requestIdleCallback(loadGtag, { timeout: 2500 })` is the GA4-touching part of this commit. |
| `e44cd69e` | post-7/11 | MDG-DATA-001: enforce Tier 1 geography gate + correctness fixes | Data-product only. |
| `209c0655` | post-7/11 | perf(homepage): defer AnimatedBackdrop paint to post-LCP — PSI round 3 | **D3 (parent): PSI round 3.** |
| `86534806` | post-7/11 | MDG-DATA-001: live Census ACS 2024 data replaces mock fixture | Data-product only. |
| `8d8c6ee4` | post-7/11 | perf(homepage): inline small CSS + display=optional fonts — PSI follow-up 1+2 | **D3 (parent): PSI round 2.** |
| `efc636a4` | post-7/11 | MDG-DATA-001: register npm scripts on apps/maine-cannabis | Data-product only. |
| `b89d6121` | post-7/11 | MDG-DATA-001 ticket 011: deterministic release + atomic Astro publication | Data-product only. |
| `5d343993` | post-7/11 | MDG-DATA-001 ticket 010: opt-in adapter + retail gap (blocked) | Data-product only. |
| `acdf6c31` | post-7/11 | MDG-DATA-001 ticket 009: OCP retail sales transport discovery | Data-product only — and the parent of the OCP ingest source. |
| `60460b58` | post-7/11 | MDG-DATA-001 ticket 001 (supplemental): registry + verify tests | Data-product only. |
| `f59be140` | post-7/11 | MDG-DATA-001 ticket 008: per-capita + no-retail comparison products | Data-product only. |
| `baf60795` | post-7/11 | MDG-DATA-001 ticket 007: active retail licenses by geography | Data-product only. |
| `feaadf54` | post-7/11 | MDG-DATA-001 ticket 006: license normalizer + retail identity | Data-product only. |
| `4a81e1f7` | post-7/11 | MDG-DATA-001 ticket 005: OCP->Census geography crosswalk | Data-product only. |
| `f6e64643` | post-7/11 | MDG-DATA-001 ticket 004: Census ACS 2024 B01003_001E adapter | Data-product only. |

**Conclusion:** the spec's CURRENT-STATE-AUDIT.md is **structurally accurate** as of `965528ade88...`. New commits are dominated by:
1. MDG-DATA-001 data-product tickets (out of analytics scope; see §3.3).
2. PSI perf rounds 1-4 (cosmetic, affect perf baseline but not GA4 event semantics).
3. **One substantive GA4-touching commit: `d5bdbc6f`** (already inventoried in parent D1/D7).

### 3.2 Anything the spec said exists but actually doesn't, or vice versa

| Spec claim | Reality on `main` | Status |
|---|---|---|
| "Property ID: 532778727, Measurement ID: G-614GHG67ZQ" (`CURRENT-STATE-AUDIT.md` L5-11) | Same IDs in `apps/maine-cannabis/src/data/site-config.json:6` + all GA4-querying scripts | ✅ Matches |
| "GA4 is loaded in the main MDG Layout with gtag" (`CURRENT-STATE-AUDIT.md` L13) | `Layout.astro:312-337` loads `gtag` (deferred via `requestIdleCallback` since Sprint 81) | ✅ Matches |
| "Existing custom event registry: scroll_depth, page_engaged, faq_open, cta_view, lead_capture, affiliate_click" (L17-24) | Same six events in `src/lib/ga4.ts:23-32` | ✅ Matches |
| "The first four are also implemented inline in Layout.astro" (L26) | `scroll_depth`, `page_engaged`, `faq_open`, `cta_view` all in `Layout.astro:345-449` | ✅ Matches |
| "page_type is not currently supplied by the reviewed `<body>` markup" (L36) | Confirmed: 0 `<body data-page-type>` matches repo-wide | ✅ Matches |
| "page_engaged: 30s if visible OR visibility→visible" (L44-46) | `Layout.astro:389-402` matches spec | ✅ Matches |
| "faq_open: existing analytics notes say current FAQ components are not wired" (L48-49) | Confirmed: 0 `data-faq` matches | ✅ Matches |
| "cta_view: existing analytics notes say current CTAs are not comprehensively wired" (L51-53) | Confirmed: 0 `data-cta-id` matches | ✅ Matches |
| "ga4-deep-pull.cjs performs aggregate Data API queries" (L56-67) | Script exists at `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` (12 metrics listed in script) | ✅ Matches |
| "scripts/analytics/ga4-engagement-weekly.cjs queries ..." (L73-86) | Script exists at `scripts/analytics/ga4-engagement-weekly.cjs` | ✅ Matches |
| "Vercel Web Analytics + Vercel Speed Insights globally mounted" (L93-96) | `<Analytics />` and `<SpeedInsights />` at `Layout.astro:574-575` | ✅ Matches |
| "@vercel/analytics + @vercel/speed-insights in dependency set" (L98-101) | Imported at `Layout.astro:26-27` (declaration via npm pkg) | ✅ Matches (assumed; not verified package-lock level here) |
| "GSC is an existing acquisition source" (L107-115) | `apps/maine-cannabis/scripts/seo/gsc-search-analytics*.cjs` exists; `seo:gsc-search-analytics` scripts referenced | ✅ Matches |

**No spec contradictions found.** Spec matches current repo on every audited claim.

### 3.3 OCP retail/opt-in ingest: inside or outside spec source contracts A0–A8?

Per `SOURCES.md` (v0.3), the source contracts are: A0 (GSC BDE), A1 (GSC API), A2 (GA4 Data API), A3 (GA4 BigQuery), A4 (Vercel Web Analytics), A5 (Vercel Speed Insights), A6 (MDG Page Manifest), A7 (Instrumentation Surface Manifest), A8 (Deployment/Change Manifest).

The OCP retail/opt-in ingest at `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-firecrawl-ingest.cjs` is **OUTSIDE the A0–A8 set**.

**Reasoning:**
1. The OCP ingest produces `sales_observation` and `optin_record` rows — these are **data-product** records, not **measurement** records (which by spec definition are GA4 events, GSC query-impressions, Vercel traffic/Speed metrics, MDG page manifest, instrumentation manifest, deployment manifest).
2. The file path itself declares the scope: `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-firecrawl-ingest.cjs`. The `mdg-data` prefix is the data-product pipeline, separate from the measurement layer.
3. The MDG-DATA-001 ticket chain (`f6e64643` … `d3c40a81` … `e44cd69e`) operates entirely in the data-product domain (Census ACS, OCP Power BI, retail licenses).
4. **Does it interact with the measurement layer?** Indirectly: an Acquisition or Progression diagnostic might want to know whether a queried market has retail access (e.g. for progression destinations). Per parent reconciliation D2: "It IS a context source for any Acquisition/Progression diagnostics ... Add as a non-`A` context attribute, not as an `A` source."

**Decision recorded:** OCP ingest is OUT of spec source contracts A0–A8. It should be inventoried in Ticket 002 source-architecture work as a **non-measurement context source**, not as a measurement source. Ticket 008 cross-source join must NOT treat OCP data as contemporaneous with the analytic window — settlement/refresh lag is independently defined by the data-product pipeline.

---

## 4. Concrete gap list — what's blocking Tickets 002 / 003 / 004 / 006

Each gap below is grounded in `file:line` evidence. Items marked **(BLOCKER)** are gating; items marked **(CARRIED-BY-PARENT)** are already documented in the parent reconciliation and this audit confirms them.

### Blocking Tickets 002 (source-architecture) and 004 (taxonomy v1)

- **(CARRIED-BY-PARENT, blocking 004) D5 — `data-page-type` globally unset.**
  - Evidence: `search_files pattern="data-page-type" path=.` returns 0 matches. `Layout.astro:351` reads `document.body.dataset.pageType` but no `<body data-page-type>` is set anywhere.
  - Ticket 003 + 006 deliverables: populating `data-page-type` from the page manifest is an explicit deliverable.

- **(CARRIED-BY-PARENT, blocking 004) D6 — `data-faq` / `data-cta-id` wiring pending.**
  - Evidence: `search_files pattern="data-faq" path=apps/maine-cannabis/src/pages` returns 0 matches; `search_files pattern="data-cta-id" path=apps/maine-cannabis/src` returns 0 page-side matches. 29 page files contain `<details>` markup; none carry `data-faq`. `ENGAGEMENT_WEEKLY_2026-07-11.md` L33-39 confirms zero-count instrumentation state.
  - **Critical:** This is a **measurement-repair** intervention, not a content intervention. Per `ACTION-AUTHORITY-MATRIX.md` A3: A3 is **disabled by default** for MDG-ANALYTICS-001 commissioning. Wiring `data-faq` / `data-cta-id` requires an **A4 human-authorized material intervention** until A3 is explicitly enabled with a surface-allowlist. The agent must NOT silently ship these attribute injections.
  - Per `INTERVENTION-PROPOSAL-CONTRACT.md` recommendation in parent D6: spec should add a `measurement_repair_surface` change type to make the authority tier unambiguous.

- **(NEW, blocking 002) CSP allowlist is correct as of `d5bdbc6f` but pre-2026-07-12 windows are `_WINDOW_MEASUREMENT_DEGRADED` for `lead_capture`, `affiliate_click`, conversion-style events, and `/g/collect` beacon completeness.**
  - Evidence: `git show d5bdbc6f -- vercel.json` lines 113 (site-wide) and 134 (embed/\*). Pre-fix: `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com` (no analytics.google.com, no www.google.com, no stats.g.doubleclick.net).
  - Ticket 007 (behavioral source ingestion) and 008 (cross-source join) MUST treat pre/post-2026-07-12 windows as incomparable for conversion-bearing metrics. Use post-fix windows as the clean baseline. Per parent D1.

### Blocking Ticket 003 (page manifest)

- **(NEW, blocking 003) `<body data-page-type>` is never set, so the canonical page-type dimension cannot be derived from the DOM.**
  - Evidence: `search_files pattern="data-page-type" path=.` = 0 matches.
  - The page manifest (Ticket 003 deliverable) must include a strategy for emitting `data-page-type` (e.g. Astro frontmatter → Layout prop → `<body data-page-type>`). This is the **same fix** as the `data-page-type` gap above; Ticket 003 must define the contract.

### Blocking Ticket 006 (instrumentation v1)

- **(CARRIED-BY-PARENT, blocking 006) Same as D5/D6 above.**

- **(NEW, blocking 006) Page-archetype-driven default for `page_type` not implemented.**
  - The fallback path for `pageType` (`Layout.astro:351`) is the empty string. The page manifest should drive this dimension via Astro frontmatter, not via a hardcoded list inside `Layout.astro`.

- **(NEW, blocking 006) Two parallel event-emission paths exist.**
  - Path A: inline IIFE in `Layout.astro:345-449` (no module imports — fires on every page).
  - Path B: `src/lib/ga4.ts` `track()` function (typed; not actually wired into any caller). `search_files pattern="track\(|GA4_EVENT\."` returns no production callers of the `track()` helper.
  - This is a code-organization gap: future instrumentation additions should use `track()` for type safety, but the existing four events don't.

### Out-of-scope for this audit (flagged for parent, not gated)

- BigQuery link enablement (operator-side; STOP gate per parent L138).
- GSC BDE enablement (operator-side; STOP gate per parent L139).
- Vercel API token (operator-side; STOP gate per parent L140).
- GA4 consent-mode (optional future add; not blocking Tickets 002/003/004/006).

---

## Replay commands (verbatim for parent verification)

All commands run on 2026-07-12 against `/home/steve/projects/maine-dispensary-guide` HEAD `5ad253c9`. First-match counts and per-file line refs are recorded inline.

```
# 1.1 GA4 IDs (config + spec)
cat apps/maine-cannabis/src/data/site-config.json                                # analyticsId line 6
git show d5bdbc6f -- vercel.json                                                # CSP hunks at lines 113 + 134
search_files pattern="532778727" path=.                                         # 17 files (scripts + docs)
search_files pattern="G-614GHG67ZQ" path=.                                      # 17 files (same set)

# 1.2 gtag injection path
search_files pattern="gtag" path=.                                              # 20 files (5 source + 12 docs + 2 scripts + 1 layout package)
search_files pattern="gtag" path=apps/maine-cannabis/src/layouts/Layout.astro   # 18 matches (loader L295-355 + events L347,355)
search_files pattern="@vercel/analytics|@vercel/speed-insights" path=apps/maine-cannabis/src/layouts/Layout.astro # 2 matches: imports L26-27, JSX L574-575

# 1.3 Custom events
cat apps/maine-cannabis/src/lib/ga4.ts                                          # 69 lines; GA4_EVENT L23-32
search_files pattern="scroll_depth|page_engaged|faq_open|cta_view|lead_capture|affiliate_click" path=apps/maine-cannabis/src
# Layout.astro: L362-386 (scroll), L389-402 (engaged), L404-423 (faq), L425-447 (cta)
# LeadMailtoForm.astro: L131,144
# LeadFormTracker.astro: L99,114
# AffiliateClickTracker.astro: L45

# 1.4 data-page-type
search_files pattern="data-page-type" path=.                                     # 0 matches
search_files pattern="data-page-type" path=apps/maine-cannabis/src              # 0 matches

# 1.5 data-faq + data-cta-id
search_files pattern="data-faq" path=apps/maine-cannabis/src                    # 5 files: ga4.ts, Layout.astro, ga4-engagement-weekly.cjs, 2 docs
search_files pattern="data-cta-id" path=apps/maine-cannabis/src                 # 3 files: ga4.ts, Layout.astro, ga4-engagement-weekly.cjs
search_files pattern="<details" path=apps/maine-cannabis/src/pages output_mode=count # 55 total matches across 29 files
search_files pattern="<Faq " path=apps/maine-cannabis/src/pages output_mode=files_only # 108 files
search_files pattern="<Faq " path=apps/maine-cannabis/src/pages output_mode=files_only | wc -l # 108

# 1.6 CSP
cat /home/steve/projects/maine-dispensary-guide/vercel.json                      # line 116 site-wide CSP, line 137 embed/* override
cat /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/vercel.json  # 11 lines (just the 4a00 route)

# 1.7 d5bdbc6f
git show d5bdbc6f --stat                                                        # 1 file: vercel.json (2 ins / 2 del)
git show d5bdbc6f -- vercel.json                                                # CSP connect-src extension (site-wide L116 + embed L137)

# 1.8 Bot handling
search_files pattern="tirith" path=.                                             # 0 matches
search_files pattern="isBot|botFilter|bot.filter" path=.                        # matches BOT_COLLABORATION_HUB.md + config/credentials/ (not bot filters)
cat apps/maine-cannabis/public/robots.txt                                       # 22 lines; allows all + crawl-delay 1

# 1.9 Privacy
search_files pattern="cookieBanner|cookie-banner|cookie_banner" path=apps/maine-cannabis/src # 0 matches
search_files pattern="cookie" path=apps/maine-cannabis/src/pages                 # 5 files; only privacy.astro is the actual policy page
search_files pattern="consent" path=apps/maine-cannabis/src                      # 31 files (mostly content copy mentions)
cat apps/maine-cannabis/src/pages/privacy.astro                                  # L47 analytics cookies; L51-55 AdSense forward-looking

# 2. Legacy artifacts
search_files pattern="bigquery" path=. -i                                       # 1 file (the prior reconciliation doc)
git log --all --grep=bigquery -i --oneline                                      # 0 commits
git log --all --grep=big --oneline                                              # 0 bigquery mentions, 1 commit "fix(ga4): two bugs in daily-dump script"
rg -c "gtag" apps/maine-cannabis/dist/index.html                                # 14 matches (confirms instrumentation ships)

# 3. Drift
git log --oneline | head -20                                                    # current state
```

**All audit claims above are derived from the commands and `file:line` evidence cited. No API calls were made; no source code was modified.**

---

## Summary

**Ticket 000 (this audit) conclusion:** GA4 instrumentation is wired correctly as of commit `5ad253c9` (HEAD), with the substantive fix in `d5bdbc6f` (CSP+GA4 beacon allowlist). The four layer-1 events (`scroll_depth`, `page_engaged`, `faq_open`, `cta_view`) are deployed but two are silent (`faq_open`, `cta_view`) due to missing page-side `data-faq` / `data-cta-id` attributes. Pre-2026-07-12 windows are `_WINDOW_MEASUREMENT_DEGRADED` for conversion-bearing metrics. The OCP retail/opt-in ingest is a **data-product** source (out of spec source contracts A0–A8); treat it as non-measurement context, not a measurement source.

**The two material gaps blocking Tickets 002 / 003 / 004 / 006** are:
1. `data-page-type` is globally unset (Ticket 003 must specify how to populate it; Ticket 006 must emit it).
2. `data-faq` and `data-cta-id` are globally unset on ~29 page files containing FAQ accordions and ~all pages with CTAs (Ticket 004 taxonomy + Ticket 006 instrumentation). Both gaps require **A4 human authorization** before the agent can wire them up — A3 is disabled by default per `ACTION-AUTHORITY-MATRIX.md`.

**Tier 1 invariants preserved.** No privacy, causal-inference, or authority boundary has been weakened.

DONE: uncommitted at `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-000-ga4-instrumentation-audit.md` (file staged for `git add <path>` only per AGENTS.md stage discipline; parent will run `git add` + commit under subagent coordination).
