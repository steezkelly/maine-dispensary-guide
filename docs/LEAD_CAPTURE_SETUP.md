# Lead Capture — current setup

**Last updated:** 2026-07-06 (after lead funnel architectural simplification).

The Maine First-Timer's Field Guide page at `/download/first-timer-field-guide`
now uses a **mailto:** form instead of a serverless endpoint.

## How it works

1. User visits `/download/first-timer-field-guide`.
2. Form requires an email + age confirmation.
3. On submit, JS builds a `mailto:hello@mainedispensaryguide.com?subject=...&body=...`
   URL where `subject` and `body` are pre-baked from the page's frontmatter
   templates with the user's email substituted in.
4. Browser opens the user's default mail client with that URL.
5. User clicks "Send" in their client; the message arrives at
   `hello@mainedispensaryguide.com`, which Purelymail catch-all
   routes to Steve's `steezkelly@purelymail.com` inbox.
6. Steve (manually or via Purelymail forwarding rules) replies with the
   PDF attached, or simply replies with the message
   `"Download from https://mainedispensaryguide.com/downloads/maine-first-timer-field-guide.pdf"`.

`?success=true` is appended to the URL after a brief timeout (800ms) so
the success card renders on the page even if the OS doesn't open a
mail client.

## Why mailto: instead of an endpoint

The previous design used a 715-line custom serverless endpoint
(`/api/lead-capture.ts`) that sent a PDF-bearing autoresponder via
Purelymail SMTP. Several build, deploy, and Vercel-side issues
prevented the endpoint from ever being reachable in production
(see `docs/MODERNIZATION_PLAN_2026-07-06.md` Tier 2.1 history).

The `mailto:` flow:

- Zero SSR surface area. The endpoint was 715 lines that needed
  maintenance but only existed to send Steve a single notification.
- Zero third-party dependencies (Formspree was last used as an
  interim step; now removed).
- Requires no Vercel env vars.
- Reaches the same inbox (the same email Steve would have read
  autoresponses from) but as a regular message Steve can reply to.
- The PDF autoresponder is replaced by Steve pasting a link to the
  public PDF URL. The PDF is already at
  `/downloads/maine-first-timer-field-guide.pdf`; the "direct download"
  link on the page already exposes it.

## Direct download

A user can always skip the form by clicking the "Or download directly
without signing up" link on the form, which serves the same PDF at
`/downloads/maine-first-timer-field-guide.pdf`.

## Tracking

The previous lead funnel used Formspree which had a `lead_capture` GA4
event fired by `LeadFormTracker.astro`. With the move to `mailto:`,
that tracking is removed. GA4 lead events can be added back via a
small inline script that fires `gtag('event', 'lead_capture', ...)`
on form submit if desired.

## Purelymail wiring (preserved)

The Purelymail IMAP/SMTP wiring at
`~/.config/himalaya/config.toml` and
`~/.config/maine-dispensary-guide/mdg.env` (both mode 600) remains
valid for manual agent-side email sends. Used like:

```bash
himalaya envelope list     # read inbox, including hello@ leads
himalaya folder list
himalaya template send     # reply to leads via SMTP
```

## If you later want the autoresponder back

Three options listed in `docs/MODERNIZATION_PLAN_2026-07-06.md` Tier 2.1:

- **Path A:** Re-enable `/api/lead-capture.ts` with the deployment-shape
  fix (currently empirical: NOT shipping).
- **Path B:** This `mailto:`-as-current-state. Already shipped.
- **Path C:** Mailchimp / ConvertKit — paid SaaS autoresponder,
  $20–40/mo, 5-minute setup. Operator-time only, not agent work.
