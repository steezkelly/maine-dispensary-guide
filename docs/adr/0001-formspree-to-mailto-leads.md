# 0001 — Formspree + SSR endpoint retired; lead funnel collapsed to mailto:

- **Date:** 2026-07-06
- **Status:** Accepted

## Context

The MDG `/download/first-timer-field-guide` and adjacent PDF-gate pages
(`/download-checklist`, `/launch-checklist`, `/embed/roi-calculator`,
`/download/founders-bible`) accepted leads through two paths:

1. **Formspree-hosted form** — third-party form service. Reverted to in Sprint
   78 commit `b2f9258c` as a "5min unblock" when the SSR endpoint failed.
2. **SSR endpoint** at `apps/maine-cannabis/src/pages/api/lead-capture.ts` —
   Astro server-rendered form, posted to Formspree via curl-side, fired a GA4
   event, and redirected.

By 2026-07-06 the SSR endpoint and Formspree had been the source of several
recurring failure modes (DSN bounces, over-send loops — see Mnemosyne imports on
2026-07-09 for the institutional record). The dual-path setup duplicated the
same form-rendering logic in two layers and required a third (the Astro
endpoint) that the static-output build was never going to ship.

## Decision

Collapse the funnel to **client-side `mailto:` only**. Render the form as
inline JS that pre-fills a `mailto:hello@mainedispensaryguide.com` URI from
the user's input and opens the OS mail client. Purelymail catch-all routes
that to `steezkelly@purelymail.com`.

Implementation in `apps/maine-cannabis/src/components/LeadMailtoForm.astro`.
Committed as `bb2b864f` (collapse) + `48a0459d` (hub record).

## Consequences

- **No Formspree dep.** Removed from `package.json`. No third-party form
  billing, no formspree subdomain, no DSN bounce-loop to monitor.
- **No SSR endpoint.** `/api/lead-capture` and `/api/indexnow-key` are
  retired; the `/api/*` namespace is free for future endpoints.
- **GA4 capture moves client-side.** The lead form still fires `gtag('event', ...)`
  before opening the mail client. The `LeadFormTracker` component (also
  in `apps/maine-cannabis/src/components/`) is the second adapter for the
  same client-side GA4 path.
- **Lead capture is now a `mailto:`-form pattern.** Future PDF gates follow
  the same approach; the lead-form pattern is `LeadMailtoForm.astro` plus
  its inline-IIFE glue. See `docs/LEAD_CAPTURE_SETUP.md` for the operator-side
  flow.
- **No instant UX for users without a configured mail client.** They see the
  form, the form fails to open, and they have to email manually. Acceptable
  trade-off; serve visitor is the operator (small-business cannabis), and
  everyone has an email address.
