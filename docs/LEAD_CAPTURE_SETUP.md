# Lead Capture — current setup

**Last updated:** 2026-07-13 (after lead-funnel architectural simplification, Sprint 78).

The Maine Dispensary Guide runs two patterns for lead capture, split by use case:

| Pattern | Forms | Why |
|---|---|---|
| **Formspree** (`xvgzlowz`) | `/newsletter`, `/` (index inline newsletter), `/resources` (referral) | High-volume, low-friction signup UX. Free tier handles 50 submissions/month. GA4 `lead_capture` fires via `LeadFormTracker.astro`. |
| **mailto:** (`hello@mainedispensaryguide.com`) | `/download-checklist`, `/download/founders-bible`, `/download/first-timer-field-guide` | PDF gates — Formspree free tier does NOT deliver PDF autoresponders (Plus-only feature). mailto: is zero third-party, zero SSR surface, no Vercel env vars. PDF autoresponder is replaced by Steve pasting the public PDF link in reply. |

Purelymail catch-all routes `mainedispensaryguide.com` (MX verified 2026-07-13) → `steezkelly@purelymail.com`. All leads — Formspree and mailto: — end up in the same operator inbox.

## mailto: funnel (PDF gates)

The 3 PDF-gate pages use the shared `LeadMailtoForm.astro` component. On submit:

1. Form's named fields are collected into a values map.
2. `mailto:` URL is built with the page's pre-baked subject/body templates, with `{name}`, `{email}`, etc. placeholders interpolated from submitted field values.
3. `gtag('event', 'lead_capture', { form_name, page_path, ...tracked_fields })` fires BEFORE navigation (preserves GA4 attribution that we had via Formspree + `LeadFormTracker.astro`).
4. Browser navigates to the `mailto:` URL → opens the user's default mail client pre-populated → user clicks "Send" → message arrives at `hello@mainedispensaryguide.com` → Purelymail catch-all → `steezkelly@purelymail.com`.
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
mdg-mail envelope list     # read inbox, including hello@ leads (steezkelly default)
mdg-leads envelope list    # read leads@mainedispensaryguide.com inbox (leads-only override)
mdg-mail template send     # reply to leads via SMTP (sends as steezkelly)
```

`mdg-leads` is a wrapper at `~/.local/bin/mdg-leads` that loads `~/.config/himalaya/leads-mdg.toml` — a leads-only override config. Prevents accidental send-as-steez from the leads context.

## If you later want the autoresponder back

Three options:

- **Path A:** Upgrade to Formspree Plus (~$15/mo). Upload PDFs to the Formspree dashboard, enable autoresponder for forms `xvgzlowz`. Both the 3 PDF gates and the 3 high-value forms stay on the same backend.
- **Path B:** Stay on mailto: + manual reply (current state). Zero cost, operator-driven.
- **Path C:** Mailchimp / ConvertKit — paid SaaS autoresponder, $20–40/mo, 5-minute setup. Operator-time only, not agent work.