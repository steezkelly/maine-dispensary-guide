# Lead-Magnet Funnel — current setup

**Last updated:** 2026-07-06 (after revert to Formspree)

**Current state:** All 5 lead-capture forms on the site POST to
**Formspree** at `https://formspree.io/f/xvgzlowz` — including the
new `Maine First-Timer's Field Guide` landing page at
`/download/first-timer-field-guide`. The page returns the PDF via
Formspree's autoresponder with the field-guide PDF attached.

This is the original pre-2026-07-04 design and works today with
**no configuration required**. No Vercel env vars, no SMTP creds,
no functions-runtime tuning. The form, the autoresponder, and the
lead dashboard all live in Formspree.

## Operator setup (5 minutes, one-time, Formspree dashboard)

1. Confirm the form exists at
   `https://formspree.io/f/xvgzlowz` — should already be there from
   the earlier 4 forms (download-checklist, compliance-self-assessment,
   founders-bible, roadmap).
2. In the Formspree dashboard for that form, configure an
   **autoresponder email** that:
   - subject: `Your Maine First-Timer's Field Guide is here`
   - body: a short welcome + the link to the direct PDF
     (`https://mainedispensaryguide.com/downloads/maine-first-timer-field-guide.pdf`)
   - **attachment:** upload
     `public/downloads/maine-first-timer-field-guide.pdf`
3. Test by submitting the form on
   `/download/first-timer-field-guide` once.

If the autoresponder is not configured in Formspree, the user still
sees the success screen (Formspree redirects to `?success=true`) but
won't get the email until the autoresponder is set up. The direct
download link always works as a backup.

## Where the form lives in code

- `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
  — the landing page, contains the `<form action="https://formspree.io/f/xvgzlowz" method="POST">`
- `apps/maine-cannabis/src/components/LeadFormTracker.astro` — fires
  the `lead_capture` GA4 event on submit-intent
- `apps/maine-cannabis/src/pages/download-checklist.astro`,
  `compliance-self-assessment.astro`, `founders-bible.astro`,
  `roadmap.astro` — the other 4 Formspree-backed forms (unchanged)

## Why we reverted from the custom `/api/lead-capture` endpoint

See `docs/SESSION_PASSDOWN_2026-07-06.md` Issue #1 for the full
diagnostic trail. TL;DR:

- The custom endpoint was wired and the local build correctly
  emitted `apps/maine-cannabis/.vercel/output/config.json` with
  `/api/lead-capture → _render`.
- Vercel deployed only the static pages; the `_render.func` was
  never registered as a route. Result: 404 on every call to
  `/api/lead-capture` and `/api/indexnow-key`.
- The Astro+Vercel adapter with `output: 'static'` does not emit
  API routes in `config.json` (verified at
  `node_modules/@astrojs/vercel/dist/index.js:338-340`). Vercel's
  `vercel.json` `routes[]` block was silently overridden by the
  Astro framework integration.
- Three paths forward were identified (see SESSION_PASSDOWN issue
  #1 for full text): Formspree revert (chosen, 5 min), `output: hybrid`
  flip (untested blast radius), or Vercel support (days). Formspree
  was selected for zero architecture risk and same end-user behavior.

## Re-enabling the custom `/api/lead-capture` endpoint (future)

The dormant endpoint at `apps/maine-cannabis/src/pages/api/lead-capture.ts`
(716 lines) is fully wired and tested against the local build. To
re-enable in production:

1. **Option A (lowest risk):** flip `astro.config.mjs` from
   `output: 'static'` to `output: 'hybrid'`, mark all existing pages
   as `export const prerender = true`, then re-deploy. The
   `api/lead-capture.ts` endpoint will pick up SSR mode automatically.
   Risk: every existing page needs `prerender: true` declared in
   frontmatter OR the build will SSR them all (slow + may break
   `<head>` scripts that depend on build-time). Test thoroughly.

2. **Option B:** investigate Vercel-side: contact Vercel support
   with the deployment ID + framework config + the expected
   `config.json` vs actual. Ask why `_render.func` is not registered.
   May take days of back-and-forth.

3. **Option C:** use Vercel's "infrastructure as code"
   (`vercel.json` only, no Framework Preset) — set
   `framework: null` and provide explicit `buildCommand`,
   `outputDirectory`, `functions` block. May break the Astro
   static-build pipeline elsewhere.

Once any option works, also set these 4 env vars in Vercel:

| Variable | Example value |
|---|---|
| `PURELYMAIL_SMTP_USER` | `leads@mainedispensaryguide.com` |
| `PURELYMAIL_SMTP_PASS` | (purelymail app password) |
| `MDG_FROM_ADDRESS` | `leads@mainedispensaryguide.com` |
| `MDG_REPLY_TO` | `hello@mainedispensaryguide.com` |

The endpoint reads them and uses purelymail SMTP to send the PDF
autoresponder. Without env vars it returns 500 with a clear error.

## Testing the live Formspree flow

```bash
# Should redirect to /download/first-timer-field-guide?success=true
curl -sI -X POST 'https://formspree.io/f/xvgzlowz' \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test@example.com","age_confirmed":"yes","magnet":"first-timer-field-guide","source_page":"/download/first-timer-field-guide"}'

# Then check the Formspree dashboard for the new submission
```

The `?success=true` redirect from Formspree's `_next` hidden input
shows the "Check your inbox" card on the landing page without any
client-side JS.

## What changed in this commit

- `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
  form action flipped from `/api/lead-capture` to
  `https://formspree.io/f/xvgzlowz`; JS interceptor removed;
  Formspree `_subject` + `_next` hidden inputs added.
- `apps/maine-cannabis/src/components/LeadFormTracker.astro`
  docblock updated to reflect single-track Formspree flow.
- This doc rewritten to make Formspree the canonical activation
  path and `/api/lead-capture` the optional future enhancement.
