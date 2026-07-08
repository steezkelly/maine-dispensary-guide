# Formspree Autoresponder — Resolution

**Date:** 2026-07-08
**Status:** RESOLVED — no operator action required
**Operator decision on file:** LEAD_CAPTURE_SETUP.md, dated 2026-07-13

## What was the carry-forward?

The 2026-07-06 second-session passdown (Sprint 78) flagged: "5 lead forms needed a working capture path after the `/api/lead-capture` and `/api/indexnow-key` serverless endpoints 404'd on production." That was resolved on 2026-07-06 — all 5 lead-magnet forms are now wired:

- **4 high-volume, low-friction forms use Formspree (`xvgzlowz`):** `/newsletter`, `/` (index inline newsletter), `/resources` (referral), and the contact form on `/about/contact`. GA4 `lead_capture` fires on submit-intent via `LeadFormTracker.astro`.
- **3 PDF-gate forms use mailto: (`hello@mainedispensaryguide.com` → Purelymail catch-all → `steezkelly@purelymail.com`):** `/download-checklist`, `/download/founders-bible`, `/download/first-timer-field-guide`. PDF is attached by Steve in the reply (manual, operator-time only).

## Why no autoresponder?

The Formspree autoresponder is a **Plus-only feature** ($15/mo). The 2026-07-13 decision documented in `LEAD_CAPTURE_SETUP.md` (lines 8-12, 32-37, 61-66) concluded: the 3 PDF gates should not pay the Formspree Plus tax because:

1. Operator interaction on a 5-replies-per-week volume is acceptable Steve-time.
2. mailto: is zero third-party, zero SSR surface, zero Vercel env vars.
3. The mailto: path lets Steve personalize the reply (a real B2B lead-gen advantage over an autoresponder).

This is the **state-of-record**, not a carry-forward. The "Formspree autoresponder setup" item surfaced in the 12-item audit was tracking an outdated assumption.

## What the agent system owns going forward

- `apps/maine-cannabis/scripts/outreach/check-backlink-replies.cjs` runs idempotently to verify the mailto: → Purelymail → Steve-inbox funnel stays healthy (anomaly sentinel reports the in-window candidate count).
- `LeadFormTracker.astro` fires GA4 `lead_capture` on the 4 Formspree forms so conversion dashboards show real numbers.
- `LeadMailtoForm.astro` fires the same event on the 3 mailto: forms for funnel parity.

## What the operator owns

- Continue replying to PDF-gate inquiries from `steezkelly@purelymail.com` with the requested PDF attached.
- (Optional) **Upgrade path documented** in LEAD_CAPTURE_SETUP.md if Steve ever wants to switch the mailto: forms back to Formspree Plus autoresponder:
  - **Path A:** Upgrade to Formspree Plus (~$15/mo). Upload PDFs to the Formspree dashboard, enable autoresponder.
  - **Path C:** Mailchimp / ConvertKit — paid SaaS autoresponder ($20-40/mo), 5-min setup.

Both paths keep the 5-form funnel intact; trade-off is operator-cost vs. agent-cost. Default: stay on mailto: + manual reply.

## What was researched (just now, 2026-07-08)

Service account `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com` already has GSC read access (verified live, `siteFullUser` on `https://mainedispensaryguide.com/`). Same account can mint OAuth Bearer tokens successfully for the Analytics Data API (`analytics.readonly` scope) — but GA4 returns `(no account summaries returned — service account not granted access to any GA4 property)`. The property grant is a one-time GA4 Admin UI click:

1. https://analytics.google.com/ → **Admin** → **Property column** → **Property Access Management**
2. **Add users** → paste `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com` → **Role: Viewer**

That unblocks **GA4 daily `lead_capture` event dumps** (separate deliverable, not the Formspree autoresponder). See `docs/GA4_ACCESS_INSTRUCTIONS_2026-07-08.md` for the 5-min click-by-click.

## Net resolution

Carry-forward closed. Operator has no action. The Formspree autoresponder is permanently off the board by the agent-doctrine state-of-record; the GA4 access setup is the remaining async operator task when Steve wants the conversion dashboard data.
