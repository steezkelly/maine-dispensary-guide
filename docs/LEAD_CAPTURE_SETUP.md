# Lead Capture — current setup

**Last updated:** 2026-07-13 (after lead-funnel architectural simplification, Sprint 78).

The Maine Dispensary Guide runs two patterns for lead capture, split by use case:

| Pattern | Forms | Why |
|---|---|---|
| **Formspree** (`xvgzlowz`) | `/newsletter`, `/` (index inline newsletter), `/resources` (referral) | High-volume, low-friction signup UX. Free tier handles 50 submissions/month. GA4 `lead_capture` fires via `LeadFormTracker.astro`. |
| **mailto:** (`hello@mainedispensaryguide.com`) | `/download-checklist` (Roadmap), `/download/founders-bible`, `/download/first-timer-field-guide` | PDF gates — Formspree free tier does NOT deliver PDF autoresponders (Plus-only feature). mailto: is zero third-party, zero SSR surface, no Vercel env vars. PDF autoresponder is replaced by Steve pasting the public PDF link in reply. |
| **Direct link, no form** | `/download/metrc-reconciliation-checklist`, `/download/compliance-self-assessment` | Pre-2026-07-08 build path — these two operator-resource pages are pure direct-link downloads (`<a href="/downloads/...pdf" download>`). They capture **zero lead signal**. Intentional gap to close in a future funnel instrumentation sprint (see `/docs/research/lead-magnet-research-memo-2026-07-08.md` Stage 2). |
| Pattern count summary | **3 Formspree + 3 mailto: + 2 no-form = 8 total lead-capable page variants** (5 distinct download pages + 3 Formspree pages) |

Purelymail routing on `mainedispensaryguide.com` (MX verified 2026-07-13) delivers every lead-receiving address — `hello@`, `admin@`, `support@`, and any otherwise-unhandled prefix (the catch-by-prefix rule id 82707) — to `steve@mainedispensaryguide.com` (operator inbox). All leads — Formspree and mailto: — end up in the same operator inbox. The previous `steezkelly@purelymail.com` catch-all destination was retired 2026-07-09; that user account is a separate Purelymail user with its own (separate, empty) mailbox, NOT the lead destination.

## Operator-side evidence-of-trust gap (Stage 1 RESOLVED 2026-07-08)

The 2026-07-08 lead-magnet research audit (`docs/research/lead-magnet-research-memo-2026-07-08.md`) surfaced a YMYL reputation risk. **All three broken promises were fixed** by `scripts/build/generate-{roadmap,metrc-checklist,compliance-assessment}-pdf.py` and shipped in commit `1f20d199`:

- `/download-checklist` advertises a "12-page Maine Dispensary Roadmap" — `maine-dispensary-roadmap-2026.pdf` now exists with 11 pages of primary-source-anchored content (40-page promise was downscoped to 12 per the research memo's recommendation).
- `maine-metrc-reconciliation-checklist.pdf` (was 1.3 KB stub) now ships with 24 numbered items across daily + weekly + monthly cadences.
- `maine-dispensary-compliance-self-assessment.pdf` (was 1.6 KB stub) now ships with 88 items × 8 domains.

**Stop-shipping rule:** RESOLVED. The 2026-07-07 backlink campaign did not link to these pages — that was fortunate. **Today's external outreach can safely promote all 3 download pages.** Future campaigns must audit the `/downloads/*` asset before linking (a smoke-200 check on the PDF URL is the canonical guard).

**Stage 2 carry-forward (NOT in `1f20d199`):**
- Add `LeadMailtoForm` to `/download/metrc-reconciliation-checklist` and `/download/compliance-self-assessment` (currently no-form, zero lead capture per the gap analysis).
- Remove "or download without subscribing" escape hatch on the 3 B2B pages.
- Update docs to advertise the new author byline (Calvin Waters) on these pages.

Toolchain: `python3 scripts/build/generate-{name}-pdf.py` regenerates each PDF from source. Build matches the existing first-timer PDF builder at `scripts/build/generate-first-timer-pdf.py`.

## Mailto: funnel (PDF gates)

The 3 PDF-gate pages use the shared `LeadMailtoForm.astro` component. On submit:

1. Form's named fields are collected into a values map.
2. `mailto:` URL is built with the page's pre-baked subject/body templates, with `{name}`, `{email}`, etc. placeholders interpolated from submitted field values.
3. `gtag('event', 'lead_capture', { form_name, page_path, ...tracked_fields })` fires BEFORE navigation (preserves GA4 attribution that we had via Formspree + `LeadFormTracker.astro`).
4. Browser navigates to the `mailto:` URL → opens the user's default mail client pre-populated → user clicks "Send" → message arrives at `hello@mainedispensaryguide.com` → Purelymail routing (catch-by-prefix rule) → `steve@mainedispensaryguide.com` (operator inbox).
5. After 800ms (the OS mail-client-open delay), `window.location.href` redirects to the page's `successPath` so the success card renders even if the OS doesn't open a mail client.

The 3 forms, their fields, and their `successPath` are:

| Page | Fields | Subject template | Body template |
|---|---|---|---|
| `/download-checklist` | name, email, stage, interest | `Roadmap request: {email}` | `Hi — please send me the Maine Dispensary Roadmap PDF.\n\nName: {name}\nEmail: {email}\nStage: {stage}\nInterest: {interest}\nSource page: /download-checklist` |
| `/download/founders-bible` | name, email, business, stage | `Founders Bible request: {email}` | `Hi — please send me the Maine Cannabis Founders Bible PDF.\n\nName: {name}\nEmail: {email}\nBusiness: {business}\nStage: {stage}\nSource page: /download/founders-bible` |
| `/download/first-timer-field-guide` | email, age_confirmed | `Field Guide request: {email}` | `Hi — please send me the Maine First-Timer's Field Guide PDF.\n\nMy email: {email}\nSource page: /download/first-timer-field-guide` |

## Why this split (architectural rationale, 2026-07-13)

Before this sprint, all 5 lead forms used Formspree (`xvgzlowz`). After the Formspree decision (free tier only — Steve confirmed 2026-07-13), 3 of the 5 forms could not get the autoresponder they advertised (PDF delivery). Three options considered:

- **A. Stay all-Formspree + manual reply.** Doesn't change anything; free tier is fine for capture but operator still has to manually reply to the 3 PDF gates.
- **B. Upgrade to Formspree Plus (~$15/mo).** Buys autoresponder + Google Sheets native integration. Adds cost + a paid tier dependency for a flow that's already operator-driven on the first-timer page.
- **C. Migrate PDF gates to mailto: (this document).** Zero cost. Same operator workflow as first-timer (which already shipped this way 2026-07-06). Newsletter + referral stay on Formspree because their UX is single-click submit (mailto: UX degrades newsletter signup) and multi-field (mailto: URL body URL-encoding gets ugly).

Decision: **C**, with GA4 attribution preserved on the migrated forms via inline `gtag()` in the shared `LeadMailtoForm.astro` component.

## Purelymail wiring (preserved)

The Purelymail IMAP/SMTP wiring at `~/.config/himalaya/config.toml` and `~/.config/maine-dispensary-guide/mdg.env` (both mode 600) remains valid for manual agent-side email sends. Used like:

```bash
mdg-mdg envelope list      # read steve@mainedispensaryguide.com inbox (operator + all MDG-domain leads after the 2026-07-09 reroute)
mdg-leads envelope list    # read leads@mainedispensaryguide.com inbox (leads-only override; sends-as-steezkelly)
mdg-mdg template send      # reply to leads via SMTP as steve@mainedispensaryguide.com
# Note: `mdg-mail` (the legacy wrapper) still points at steezkelly@purelymail.com.
# It's no longer where leads land. Use mdg-mdg instead.
```

`mdg-leads` is a wrapper at `~/.local/bin/mdg-leads` that loads `~/.config/himalaya/leads-mdg.toml` — a leads-only override config. Prevents accidental send-as-steez from the leads context.

## If you later want the autoresponder back

Three options:

- **Path A:** Upgrade to Formspree Plus (~$15/mo). Upload PDFs to the Formspree dashboard, enable autoresponder for forms `xvgzlowz`. Both the 3 PDF gates and the 3 high-value forms stay on the same backend.
- **Path B:** Stay on mailto: + manual reply (current state). Zero cost, operator-driven.
- **Path C:** Mailchimp / ConvertKit — paid SaaS autoresponder, $20–40/mo, 5-minute setup. Operator-time only, not agent work.