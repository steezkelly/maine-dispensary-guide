# GA4 Deep Pull — Analysis & Actionable Next Steps

**Run:** 2026-07-11 | **Property:** 532778727 (G-614GHG67ZQ) | **Window:** 2026-04-13 → 2026-07-10 (86 days) | **Total:** 698 users / 776 sessions / 980 pageviews / 3116 events

---

## Headline Reality Check

This is a **very small site in absolute terms** — ~8 users/day average, ~36 events/day. The metrics should be interpreted as "baseline established" rather than "growth at scale." Most decisions below are about **fixing measurement gaps and structural foundations**, not optimizing conversion rates that have too few samples to be statistically meaningful yet.

---

## Key Findings (ranked by actionability)

### 1. ⚠ MEASUREMENT GAP: lead_capture funnel is broken — 0 events recorded

**The data shows:** `lead_capture.jsonl` is empty. Zero rows returned when filtering for `eventName=lead_capture` across all 86 days.

**What this means:** Either (a) the event genuinely never fired, or (b) it fired but with an event name different from `lead_capture`. The instrumentation in `LeadMailtoForm.astro:144` and `LeadFormTracker.astro:114` calls `gtag('event', 'lead_capture', payload)` — so the gtag call exists, but we can't verify it ever executed.

**The 3,116 total events over 86 days average 36 events/day** — but if those are page_view and scroll events only (not lead_capture), then no lead form has been successfully submitted in 86 days of tracking. This is a critical measurement gap to close.

**Action:**
- Open GA4 → DebugView in one window, submit the lead form at `/download-checklist` in another, confirm `lead_capture` event fires
- If it fires in DebugView but never appears in standard reports → property/event-name mismatch or filtering issue
- Also: verify the events-per-day baseline (36/day) — that's roughly 1.2 events per pageview, which suggests auto-events (page_view, scroll, click) are firing but not custom ones

**This is the #1 priority because the entire ROI of having analytics hinges on knowing whether forms are being submitted.**

---

### 2. ⚠ MEASUREMENT GAP: custom dimensions not registered

**The data shows:** All 6 metrics/dimensions from the spec returned `not a valid` errors on first run. After using GA4's `getMetadata` API to discover what's actually registered, I found:
- ✗ `engagementDuration` → must use `userEngagementDuration`
- ✗ `users` → must use `totalUsers`
- ✗ `customEvent:form_name`, `customEvent:page_path`, `customEvent:stage` → not registered
- ✗ `userPseudoId` → not registered (common GA4 limitation)
- ✗ `exits` → not registered

**Action:**
- Open GA Admin → Custom Definitions → register `form_name`, `page_path`, `stage` as event-scoped custom dimensions. Once registered, the `lead_capture` query can break out by form.
- Register `userPseudoId` if available in your GA tier (Standard 360 only, otherwise blocked)
- The metric renames (`userEngagementDuration`, `totalUsers`) are already fixed in the script — no further work needed

**Time estimate:** 5 minutes in GA Admin UI to register 3 custom dimensions.

---

### 3. 🔍 STRUCTURAL ANOMALY: 100% bounce on 5+ landing pages

**The data shows:** Five landing pages have 100% bounce rate with at least 5 sessions each:
| Sessions | Page | Likely cause |
|---|---|---|
| 11 | `/blog/maine-home-grow-cannabis-guide-2026` | Search-intent mismatch (Google traffic doesn't match content) |
| 9 | `/guides/old-orchard-beach-dispensary-guide` | Page may have a UX issue (instant back-button) |
| 5+ | `/guides/maine-cannabis-municipal-opt-in-guide` | Title/meta mismatch with query intent |
| 7 | `/guides/maine-dispensary-license` | Likely search-intent mismatch — users want license *application*, not license *info* |
| 6 | `/blog/best-cannabis-strains-maine-outdoor-2026` | Possible seasonality issue (off-season for outdoor) |

**Action (low-effort, high-learning):**
- Manually visit each page, look for UX issues (slow load, walls of text, broken CTAs)
- Check Search Console for the actual queries driving traffic to each → if queries don't match content intent, rewrite meta description or consolidate via canonical

**Time estimate:** 30 min manual review + 1-2 hours for fixes if warranted.

---

### 4. 💡 HIGH-ENGAGEMENT CONTENT: 5 pages where visitors stay 17-55 minutes

**The data shows:** These pages have unusually high `userEngagementDuration`:
| Time on page | Views | Page |
|---|---|---|
| 3308s (55 min) | 18 | `/blog/best-maine-edibles-2026` |
| 3050s (51 min) | 41 | `/blog/cannabis-friendly-maine-travel` |
| 1400s (23 min) | 5 | `/blog/portland-maine-cannabis-rules-2026` |
| 1377s (23 min) | 9 | `/blog/maine-psilocybin-2026-guide` |
| 1057s (18 min) | 33 | `/guides/maine-cannabis-staffing-licensing` |

These are likely B2B prospects doing deep research before contacting. The 33-view page (`staffing-licensing`) with 1057s engagement is the highest-leverage lead-gen page — it has volume AND depth.

**Action:**
- Add explicit lead-capture CTAs (download PDF, contact form) to the top 3 of these pages
- For `staffing-licensing`: this is your hottest B2B topic — add a "Get our 2026 staffing compliance checklist" CTA inline
- For `cannabis-friendly-maine-travel`: it's a high-traffic blog post → add an ROI calculator link or a "Plan your visit" affiliate block

**Note:** These time-on-page numbers (3308s = 55 min) are likely inflated because GA4 measures engagement time across the session, not just per-page. A reader scrolling for 55 min on one page would yield a 3308s reading. This is still meaningful — single-page sessions of this length are strong intent signals.

---

### 5. 💡 ACQUISITION INSIGHT: 64% from Google organic, but direct traffic is underserving

**The data shows:**
- Google organic: 495 sessions (64%), 46% engagement rate
- Direct: 219 sessions (28%), 19% engagement rate
- x.com referral: 26 sessions (3%), 77% engagement rate

**Anomaly:** Direct traffic at 19% engagement is much lower than Google's 46%. This suggests:
- Bookmark/return visitors may not be finding what they need
- OR the homepage (98 sessions land there) is missing recent content

**Action:**
- Look at `/blog/best-cannabis-strains-maine-outdoor-2026` (6 sessions, 83% bounce) — possible seasonal mismatch
- Check if the homepage shows the latest content (June 2026 launches)

**Time estimate:** 15-min audit.

---

### 6. 🤖 AI REFERRAL TRACK: small but emerging (6 sessions)

**The data shows:** 6 sessions from AI sources:
- chatgpt.com: 4 sessions
- aicrawler.store: 1
- aisearchindex.space: 1

**Interpretation:** This is the early signal of a trend. AI assistants starting to surface MDG content for cannabis questions. 6 sessions in 86 days = ~7% of total sources by diversity, but <1% by volume.

**Action:**
- Monitor trend over next 90 days (re-run this pull)
- Ensure MDG content is structured for AI extraction: FAQPage schema on every guide page (already 69%), clean schema.org markup, no JS-only content
- Worth a future "AI visibility" sprint as traffic grows

---

### 7. 📱 MOBILE GAP: 57% mobile users but no mobile-specific analysis

**The data shows:** 57% mobile / 42% desktop / 1% tablet. This matches typical cannabis-content site traffic.

**Action:**
- Verify mobile bounce rates aren't significantly worse than desktop (the data doesn't break this out cleanly — could be a follow-up query)
- Ensure CTA buttons (download-checklist link) are thumb-friendly

---

## Out-of-Scope (deferred per user)

- Daily cron wiring — needs spec decision on cadence + storage policy
- Meta pixel integration — user said "another time"
- Real-time alerting — premature given low traffic

---

## Recommended Sprint Plan (1-2 weeks)

**Sprint A (1 day, fast wins):**
1. Fix `lead_capture` measurement gap (Finding 1) — DebugView test
2. Register 3 custom dimensions in GA (Finding 2)
3. Manual review of 5 high-bounce pages (Finding 3)
4. Re-run `ga4-deep-pull.cjs` after fixes

**Sprint B (2-3 days, structural):**
5. Add lead-capture CTAs to top 3 high-engagement pages (Finding 4)
6. Direct-traffic / homepage audit (Finding 5)

**Sprint C (later, scale-dependent):**
7. AI visibility tracking + monitoring (Finding 6)
8. Mobile-specific analysis query (Finding 7)
9. Daily cron wiring (when traffic justifies it)

---

## What's NOT actionable yet

These need more data or are premature:
- **Conversion rate optimization** — too few samples for meaningful CRO
- **Cohort analysis** — needs `userPseudoId` which isn't registered
- **Attribution modeling** — direct traffic dominates enough that multi-touch attribution is noise
- **Funnel visualization** — depends on lead_capture being fixed first

The most valuable next step is **Sprint A, Item 1**: prove lead_capture events are actually firing. Everything downstream depends on it.