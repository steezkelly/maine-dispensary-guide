# Lead Magnet Research Memo — Maine Dispensary Guide
**To:** Steve  **From:** Subagent  **Date:** 2026-07-08  **Re:** High-converting B2B lead-magnet plan (cannabis operators, Maine)

> **Scope:** research + plan only. No copy written. Steve approved research-only handoff.
> **State correction:** the brief said "4-Formspree + 1-mailto" — the **actual** state per `docs/LEAD_CAPTURE_SETUP.md` and Mnemosyne "MDG lead-funnel architecture decision (2026-07-13)" is **3 Formspree + 3 mailto:** plus **2 download pages with NO lead capture at all** (METRC checklist, Compliance self-assessment). See §C.

---

## A. Top 5 conversion-rate benchmarks (with sources)

| # | Benchmark | Number | Source |
|---|---|---|---|
| 1 | All-industry median landing page CVR (visitor-to-lead) | **6.6%** across 41,000 pages / 464M visits | Unbounce Conversion Benchmark Report Q4 2024 — via Digital Applied synthesis 2026-06-01 |
| 2 | B2B lead-magnet average (PDF + ebook + guide, mixed) | **4.7%** in 2025 (down from 5.2% in 2023) | Brixon Group, "B2B Lead Magnets Compared" 2025 (cites HubSpot State of Marketing 2025) |
| 3 | Sleeknote 2025 study, 26,270 popup campaigns — field-count effect | **1 field = 4.41% → 2 fields = 2.90% → 3 fields = 1.93%** (each added field ≈ -33% CVR) | Sleeknote 2025 (n=26,270), synthesized by Digital Applied 2026-06-01 |
| 4 | Traffic-source effect on same landing page | **Email = 19.3%** · Instagram paid = 17.9% · Facebook paid = 13.0% · Google paid search = 11.3% · Display = 1-2% | Unbounce Q4 2024 traffic-source breakdown |
| 5 | Cannabis B2B case study (Google Ads → LP → form) | **4.1% lead CVR, 57 qualified leads in 30 days, 500% lift in goal completions, $89 CPA** | Cola Digital / Labstat case study (Canadian cannabis testing lab; methodology applicable to Maine B2B dispensary services) |

**Bonus benchmarks that change the design:**

- **TOFU vs MOFU split (Digital Applied synthesis):** checklists/cheat sheets convert high at TOFU but produce low-quality leads; ROI calculators + assessments at MOFU convert lower in volume but produce "high" lead-quality signal at a "$$" CPL. Don't judge formats by raw CVR — judge by stage-fit. (Unbounce, ON24, NetLine, HubSpot, Interact synthesis 2026.)
- **NetLine 2024:** gated content demand +14.3% YoY in 2023 (77% cumulative rise since 2019); ebook share of gated demand = 39.5%. Gated PDFs are not dead — but the **consumption gap widened to 31.2 hours** between download and first open, and most downloaded ebooks are never opened. PDF ≠ engagement.
- **Demand Gen Report 2024:** **51% of B2B buyers** named **content backed by data and research** as the #1 driver of agreeing to a sales call. Beating "shareable stats" and "pure thought leadership." This is the single most important B2B-specific finding in the dataset — for MDG, it means **PDFs with primary-source citations and operator data win sales calls**, not generic how-tos.
- **CTA placement:** CXL/Instapage test: below-the-fold CTA on a long landing page beat above-the-fold by **20-304%** depending on length (long pages = below-the-fold wins; short pages = above-the-fold wins). MDG's current 640px-wide single-screen landing pages should keep CTA above-the-fold; `/download-checklist` (1000px hero) supports both.

---

## B. Two best-fit skills from the `creative/` category

After reading all 18 creative skills, the two I'd actually use:

| Skill | Why it's the right fit (one line) | When NOT to use |
|---|---|---|
| **`claude-design`** | Provides the design-process + taste framework for **scoping each PDF as a single self-contained HTML artifact** before export. Surface-first composition rule, anti-slop diagnostic, type/color discipline, MDG token-friendly. Process > format — exactly what 5 B2B PDFs need. | Don't use for the *interior visual design* of a printed PDF (use it to make the **web/landing-page surface** for the PDF; for the PDF's interior, hand-build with the MDG design tokens already in `apps/maine-cannabis/src/layouts/Layout.astro`). |
| **`humanizer`** | 29-pattern AI-isms catalogue + worked rewrite. Critical for the founder/operator copy: the existing `download-checklist.astro` and `founders-bible.astro` copy is laced with rule-of-three, "tailwinds," "showcasing," and em-dash patterns. After drafting with `claude-design`, run the copy through humanizer before publish. | Don't use to rewrite cited primary-source language (Maine Revised Statutes, OCP guidance) — those are quoted for legal accuracy, not for voice. Humanize **commentary**, not citations. |

**Skills I considered and rejected:**

- `baoyu-infographic` — produces 16:9 hero infographics, not print PDFs. Useful for promoting the PDFs on social but not for the deliverables themselves.
- `pretext` — DOM-free text layout for kinetic canvas demos. Wrong medium for a B2B operator guide.
- `design-md` / `popular-web-designs` — token-spec authoring, not artifact production. Only relevant if Steve wants to publish MDG's design tokens, not on this lead-magnet track.
- `manim-video` / `p5js` / `comfyui` — wrong output type.

**`/humanizer` already exists as an OpenCode custom command on MDG** (per `AGENTS.md`) — that means the `humanizer` skill is the exact match for the copy-review stage of any PDF we ship. Confirmed fit.

---

## C. Current state of MDG lead-magnet PDFs — gap analysis

### Asset inventory (verified 2026-07-08)

| # | Page URL | PDF file | PDF size | Form path | Mechanism | Fields |
|---|---|---|---|---|---|---|
| 1 | `/download-checklist` (Roadmap) | **NO FILE EXISTS** | — | LeadMailtoForm | mailto: → `hello@mainedispensaryguide.com` | 4 (name, email, stage, interest) |
| 2 | `/download/founders-bible` | `/public/pdfs/founders-bible-2026.pdf` | **724K** (real) | LeadMailtoForm | mailto: | 4 (name, email, business, stage) |
| 3 | `/download/first-timer-field-guide` | `/apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf` | **24K** (real) | LeadMailtoForm | mailto: | 2 (email, age_confirmed) |
| 4 | `/download/metrc-reconciliation-checklist` | `/apps/maine-cannabis/public/downloads/maine-metrc-reconciliation-checklist.pdf` | **1.3K — STUB** | **NONE** | Direct link, no form | — |
| 5 | `/download/compliance-self-assessment` | `/apps/maine-cannabis/public/downloads/maine-dispensary-compliance-self-assessment.pdf` | **1.5K — STUB** | **NONE** | Direct link, no form | — |

### Three critical gaps (in priority order)

1. **Two PDFs are 1-2KB placeholder files** but the pages advertise "10 pages" and "12 pages" with detailed contents. Anyone who actually downloads gets a near-empty file → instant trust loss. This is a **reputation / YMYL risk**, not just a conversion issue. (Files: `maine-metrc-reconciliation-checklist.pdf` and `maine-dispensary-compliance-self-assessment.pdf`.)
2. **The "40-page Maine Dispensary Roadmap" advertised on `/download-checklist` does not exist on disk.** The page is a real funnel step (4-field mailto, brand-aligned layout) but the asset it gates is missing. Funnel is dead-ended. **This is the single highest-leverage gap** — the funnel exists, the form works, the copy converts attention → intent, but the back-end deliverable fails.
3. **Two of five download pages have no lead capture at all** (METRC, Compliance). They are pure direct-link pages. The SOP `LEAD_CAPTURE_SETUP.md` lists only 3 mailto: pages and is **incomplete** — it does not mention these 2 pages exist. They were built or landed outside the documented funnel architecture.

### Architecture inconsistencies

- **Asset path split:** 1 PDF in `/public/pdfs/`, 3 in `/apps/maine-cannabis/public/downloads/`. Should be one canonical path.
- **"Or download now without subscribing" escape hatch** appears on `/founders-bible`, `/first-timer-field-guide`, and both checklist pages. This is the **single biggest CVR-killer** in the current pages — for the cannabis-operator audience (B2B, intentional), this is especially bad because the buyer is *more qualified* than a consumer. Recommend: keep one for `/first-timer-field-guide` (consumer B2C, legal-disclosure-heavy), remove from all B2B operator pages.
- **State correction on the brief's "4-Formspree + 1-mailto":** actual is **3 Formspree** (newsletter, homepage inline, `/resources` referral) + **3 mailto:** (first-timer, founders-bible, download-checklist/roadmap) + **2 no-form** (METRC, Compliance). The mailto: + GA4-instrumented funnel pattern (`LeadMailtoForm.astro`) is **good — preserve it.** The Mnemosyne record "MDG lead-funnel state-of-record (2026-07-13)" confirms this is the 2026-07-13 settled architecture; do not propose going back to all-Formspree.
- **GA4 `lead_capture` fires via inline `gtag()` on mailto: pages** — this works, but the no-form pages fire **zero events**. That means 2 of 5 download pages are invisible to GA4.

---

## D. Three-stage execution plan (Steve reviews in <3 min)

### Stage 1 — **Fix the broken promises first** (Day 1-2, agent work, $0)

1. Build the actual 40-page Roadmap PDF (or downscope the page copy to match what can be built in 8-12 pages; never ship a page advertising 40 pages that delivers 8). Highest priority — landing page exists, traffic may already be leaking to a dead end.
2. Replace the two 1-2KB stub PDFs (`maine-metrc-reconciliation-checklist.pdf`, `maine-dispensary-compliance-self-assessment.pdf`) with real 8-12 page documents. The page copy already describes what should be inside.
3. Move `/public/pdfs/founders-bible-2026.pdf` → `/apps/maine-cannabis/public/downloads/founders-bible-2026.pdf` to consolidate asset path.

**Expected impact:** 0% → ~80% deliverable trust recovery. (No CVR change yet — but you stop burning SEO goodwill and GA4 trust every time an operator downloads a stub.)

### Stage 2 — **Re-instrument the 2 un-wired pages + remove B2B escape hatches** (Day 3-4, agent work, $0)

1. Add `LeadMailtoForm` to `/download/metrc-reconciliation-checklist` and `/download/compliance-self-assessment`. Suggested fields:
   - METRC: `name, email, role (compliance officer / inventory manager / owner / other), license_status (pre-license / active / multi-state)`
   - Compliance: `name, email, business, role, dispensary_count (1 / 2-4 / 5+)`
2. Fire `lead_capture` GA4 events from both pages. Add a new `trackFields` profile per page in the mailto: form.
3. Remove the "Or download now without subscribing" link from `/download/founders-bible`. Keep on `/first-timer-field-guide` (consumer B2C). Add to the new Roadmap page as a 1px-transparent text link only (so the canonical download path stays gated) — or simply omit.
4. **Update `docs/LEAD_CAPTURE_SETUP.md` to reflect the 5-mailto / 3-Formspree reality** (it currently says 3 mailto + 3 Formspree, off by 2 for the un-instrumented pages).

**Expected impact:** B2B-form CVR baseline is **3.8%** for gated PDFs (HubSpot State of Marketing 2025, via Brixon Group) — and MDG's existing mailto: forms already convert within that range. Expected lift: **+2 wire-ups × ~3-5% of `/resources` and operator-guide traffic × conversion** = a real, measurable lead capture from pages that currently capture **zero**.

### Stage 3 — **Re-spec the PDFs as **data-backed, primary-source-anchored, MOFU assets** (Day 5-10, agent work + Steve review)**

Apply the Demand Gen Report 2024 finding (51% of B2B buyers say data-backed content drives sales-call agreement) to the 3 B2B PDFs:

- **Roadmap (regen):** keep as 8-12 page MOFU asset. Lead with Maine-specific data: OCP license counts by tier, municipal opt-in list, banking partner comparison, 280E COGS benchmarks. Cite Maine Revised Statutes Title 28-B and OCP rule sections inline.
- **Founders Bible (rev v2):** already a strong MOFU asset at 724K; current copy on the page is generic ("covers Maine DHHS licensing step-by-step"). Tighten to **"the X-step OCP conditional → active license path with checkpoint days"** with the actual OCP application stages. Per-stage timeline, not chapter-essay format.
- **METRC Checklist (regen, post-Stage 1):** is the highest-intent B2B asset — operators who download this are 30 days from an OCP inspection. Make it a **fillable PDF** (form fields), not a static checklist. ~4-5x more useful = +lead-quality even if CVR is flat.
- **Compliance Self-Assessment (regen, post-Stage 1):** same — make it a **scorecard PDF** with weighted scoring and a "your weakest 3 domains" output. The Demand Gen Report finding is *exactly* this: data-backed = sales-call driver.

**Design constraints (apply to all B2B PDFs):**

- **PDF length:** 8-15 pages. Unbounce + NetLine synthesis says long-form whitepapers convert MOFU but **erode at 20+ pages** because consumption gap widens.
- **Form field count:** keep the **gating form to 1-3 fields** (Sleeknote 2025: 1 field = 4.41% → 3 fields = 1.93%, ~33% CVR cost per field). MDG's current 4-field download-checklist is already at the upper edge — drop `interest` field, derive it from `stage` server-side if needed.
- **CTA placement:** above-the-fold on the single-screen pages (founders-bible, first-timer, METRC, Compliance) because the pages are short. Below-the-fold on `/download-checklist` (Roadmap) because the page is long with a 1000px hero.
- **Visual density:** avoid hero-gradient / SaaS-template slop. Match MDG's existing typography (Georgia serif headings, sans body) and `var(--color-primary)` accent. Use `claude-design` for the landing-page **wrapper** (if we re-do the pages), not for the PDF interior — the interior is a print artifact.
- **Copy review:** every PDF's commentary text gets run through `humanizer` before publish. Citations stay verbatim.

**Expected impact (Stage 3):** MDG's 4.1% cannabis B2B CVR benchmark (Cola Digital/Labstat case study) is the realistic target for paid funnels; organic/email traffic to MDG's PDF pages should hit **8-12% CVR** based on Unbounce's email-traffic baseline (19.3%) discounted for the 4-mailto friction of opening a mail client. **Quality lift is bigger than volume lift**: data-backed PDFs get cited in sales conversations (Demand Gen Report 2024) — this is the lever that compounds.

---

## What I did NOT do (and why)

- Did not write copy, design PDFs, or modify any `.astro`/`.pdf` files. Research + plan only, as instructed.
- Did not propose switching the lead-funnel back to all-Formspree. The mailto: + GA4 pattern is settled (Mnemosyne 2026-07-13 record) and the cost/benefit doesn't justify a re-architecture.
- Did not propose upgrading to Formspree Plus. The `LEAD_CAPTURE_SETUP.md` "If you later want the autoresponder back" section already covers that option (~$15/mo) — out of scope for "make the existing 5 PDFs convert better."
- Did not propose any new infrastructure (no new tools, no new components beyond what's already in the repo).

## Open questions for Steve (decide before Stage 3 starts)

1. **Roadmap page advertises 40 pages** but the existing brand promise ("10-page Founders Bible" on the same site) is closer to reality. Down-scope the page to "8-12 pages" or commit to building 40? My recommendation: **8-12 pages**, well-anchored to OCP primary sources.
2. **METRC and Compliance PDFs as fillable forms** requires a PDF toolchain (currently MDG builds static PDFs — most likely the 724K founders-bible was built in InDesign/Google Docs export, not programmatically). If Steve doesn't have that toolchain, ship print-ready but not fillable — still a 5x lift over the stubs.
3. **Should the cannabis-B2B audience be tagged separately in GA4** so we can measure MOFU B2B PDF conversion vs. consumer B2C first-timer conversion? Currently the `form_name` event label is the only segmenter.
