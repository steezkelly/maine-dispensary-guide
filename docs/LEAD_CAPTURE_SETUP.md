# Lead-Magnet Autoresponder Setup (Formspree)

The Maine First-Timer's Field Guide PDF is gated by the form at
`/download/first-timer-field-guide`. The form currently POSTs to
Formspree endpoint `xvgzlowz`. To send the PDF to the user
automatically when they submit, configure Formspree's autoresponder
in their dashboard. This is a 5-minute one-time task.

## Step 1: Sign in to Formspree

Go to https://formspree.io/forms and sign in with the credentials
that have access to form `xvgzlowz`.

## Step 2: Open the form settings

Click the form to open its dashboard. Navigate to **Settings** →
**Autoresponse** (or "Send a confirmation email" depending on the
Formspree UI version).

## Step 3: Configure the autoresponder

Set:

- **Trigger:** "Always" (or "On successful submission")
- **From name:** "Maine Dispensary Guide"
- **From email:** your preferred From address (e.g.,
  `leads@mainedispensaryguide.com` if you've configured it via
  purelymail or your domain registrar)
- **Reply-to:** `hello@mainedispensaryguide.com`
- **Subject:** "Your Maine First-Timer's Field Guide is inside"
- **Body (plain text or HTML):**

  > Thanks for downloading the Maine First-Timer's Field Guide.
  >
  > The PDF is attached. Here's what you'll find inside:
  >
  >   1. 15-minute pre-visit prep
  >   2. Day-of flow at the dispensary
  >   3. Product selection — what to actually buy
  >   4. Eight first-time mistakes to avoid
  >   5. After-visit tracking template
  >   6. Maine rules cheat sheet (printable)
  >   7. FAQ
  >   8. Resources + corrections log
  >
  > If you're new to Maine cannabis, the natural next step is the
  > full guide on our site:
  >   https://mainedispensaryguide.com/guides/first-time-maine-dispensary-buyer
  >
  > And if you want to keep learning, our Consumer Hub covers
  > microdosing, reciprocity, tinctures, COA reading, and more:
  >   https://mainedispensaryguide.com/learn
  >
  > Cannabis is a YMYL topic — please consult a Maine-licensed
  > healthcare provider for personal guidance. Every claim in this
  > guide is anchored to a primary source, documented in our
  > editorial corrections log:
  >   https://mainedispensaryguide.com/about/corrections
  >
  > — The Maine Dispensary Guide editorial team

- **Attachment:** upload
  `apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf`
  (also at the same path in the deployed site:
  https://mainedispensaryguide.com/downloads/maine-first-timer-field-guide.pdf)

## Step 4: Save and test

Save the autoresponder. Submit the form once with a test email
(your own address is fine). Verify:
1. You receive the email within a few minutes.
2. The PDF is attached and openable.
3. The link to the full guide on the MDG site works.
4. The browser redirects to `/download/first-timer-field-guide?success=true`
   and shows the success card.

## Step 5: Track conversion in GA4 (optional but recommended)

Formspree's autoresponder does not automatically fire a `generate_lead`
GA4 event. The existing LeadFormTracker component handles this
client-side: when the form posts to Formspree and the browser
navigates to the success URL, the success page (which has the
?success=true param) does not currently fire an event. If you want
conversion tracking, either:
  - Add a small inline script to the success page that fires
    `gtag('event', 'generate_lead', {magnet: 'first-timer-field-guide'})`
    when `?success=true` is in the URL.
  - Use Formspee's webhook + GA4 Measurement Protocol to fire
    the event server-side.

For now, the funnel works (PDFs go out) but conversion attribution
is implicit. Mark this as a follow-up.

## Why not a custom SMTP endpoint?

The MDG site uses Astro with `output: 'static'` (apps/maine-cannabis/
astro.config.mjs). This configuration does NOT deploy `prerender = false`
Astro endpoints as Vercel functions. So `src/pages/api/lead-capture.ts`
exists in the repo but is dormant — Vercel serves the static build
and ignores the SSR endpoint. A custom SMTP autoresponder would
require either:
  - Migrating the site to `output: 'hybrid'` (per-route SSR), or
  - Adding a separate Vercel `functions/` directory, or
  - Using Vercel Edge Functions

Both are larger architectural changes than the operator's 5-minute
Formspree setup. The custom endpoint is kept in the repo for the day
when MDG migrates to a hybrid build.

## Related files

- `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
  — the landing page (form posts to Formspree)
- `apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf`
  — the PDF that Formspree attaches
- `scripts/build/generate-first-timer-pdf.py` — re-generate the PDF
  from the first-time buyer guide content
- `apps/maine-cannabis/src/pages/api/lead-capture.ts` — dormant custom
  autoresponder endpoint (not deployed under current `output: 'static'`)
- `/tmp/lead-magnet-research-2026-07-05.md` — research brief on the
  funnel strategy