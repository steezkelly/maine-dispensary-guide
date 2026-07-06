# Lead-Magnet Autoresponder Setup (agent-managed SMTP)

The Maine First-Timer's Field Guide PDF is gated by the form at
`/download/first-timer-field-guide`. The form posts to the
agent-managed serverless endpoint at `/api/lead-capture`, which
sends a PDF-bearing autoresponder email through purelymail SMTP.

The 4 other lead-capture forms on the site (download-checklist,
compliance-self-assessment, founders-bible, metrc-reconciliation-checklist,
roadmap) continue to POST to Formspree xvgzlowz. This doc covers
the new endpoint only.

## Operator activation (5 minutes, one-time)

In Vercel project settings, set these 4 environment variables:

| Variable | Example value | Notes |
|---|---|---|
| `PURELYMAIL_SMTP_USER` | `leads@mainedispensaryguide.com` | purelymail SMTP username |
| `PURELYMAIL_SMTP_PASS` | (purelymail app password) | Use purelymail app password, not your main account password |
| `MDG_FROM_ADDRESS` | `leads@mainedispensaryguide.com` | Defaults to this if not set |
| `MDG_REPLY_TO` | `hello@mainedispensaryguide.com` | Defaults to this if not set |

Optionally:
- `MDG_TEST_MODE=1` — enables a GET endpoint that returns the magnet
  registry for inspection. **Do not set in production.**

## Without the env vars set

The endpoint returns 500 with a clear error message. The
client-side JS on the landing page catches this and shows an alert:
"Sorry — we couldn't process your request right now. Please email
hello@mainedispensaryguide.com for the PDF." No data loss.

## If `/api/lead-capture` returns 404

This is a Vercel-routing problem, not a code problem. As of 2026-07-05
it's the biggest known issue with the funnel. Symptoms:
- `curl -sI https://mainedispensaryguide.com/api/lead-capture` → 404
- `curl -sI https://mainedispensaryguide.com/api/indexnow-key` → 404
- Local Vercel build output (apps/maine-cannabis/.vercel/output/config.json)
  correctly contains the routes
- `vercel.json` at repo root has both routes in `routes[]`

**Root cause (verified 2026-07-05 via `vercel project inspect` and
`vercel deploy --dry`):** the project's Framework Preset is set to
**"Other"** instead of "Astro". Vercel auto-detected no Astro from the
repo (monorepo layout, no Astro framework marker in the right place)
and defaulted to a generic static-build expectation:

- Build Command: `npm run vercel-build` (default — but actual build
  uses `bash vercel-build.sh`)
- Output Directory: `public` if it exists or `.` (default — but
  actual build outputs to `apps/maine-cannabis/dist`)
- Node.js Version: 24.x (default — but the lead-capture endpoint is
  set to `nodejs22.x`)

With framework="Other", Vercel:
- Runs the build script anyway (works because `vercel-build.sh` builds
  with the @astrojs/vercel adapter)
- Skips the Astro framework integration (which would normally
  register prerender=false endpoints as Vercel functions)
- Does NOT honor the `routes[]` block in `vercel.json` because it
  treats the project as static-only

**Fix:** in Vercel project settings → General → Build & Development
Settings, change Framework Preset to **"Astro"**, and verify:

- Build Command: `bash vercel-build.sh`
- Output Directory: `apps/maine-cannabis/dist`
- Node.js Version: `22.x`
- Install Command: leave default

After saving, push a noop commit or the next natural commit. Vercel
will rebuild with the Astro framework integration and register both
`/api/lead-capture` and `/api/indexnow-key`.

Until the fix is applied, the form on `/download/first-timer-field-guide`
gracefully falls back to "please email hello@mainedispensaryguide.com"
UX when the fetch fails. No data loss.

**Verification after fix:**
```bash
curl -sI https://mainedispensaryguide.com/api/lead-capture
# Expect: HTTP/2 200 with Content-Type: application/json
# (not 404)
```

If that returns 200, the operator can proceed with setting the 4
SMTP env vars per the section above.

## Testing the live endpoint

After setting the env vars and triggering a deploy, test with:

```bash
# Should return 200 + JSON {ok: true, lead_id: "..."}
curl -sX POST 'https://mainedispensaryguide.com/api/lead-capture' \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test@example.com","age_confirmed":true,"magnet":"first-timer-field-guide"}'
```

Verify the autoresponder email arrived in your inbox within a
minute. The PDF should be attached.

## Architecture

```
User submits form at /download/first-timer-field-guide
   ↓
Client-side JS intercepts, POSTs as JSON to /api/lead-capture
   ↓
apps/maine-cannabis/src/pages/api/lead-capture.ts (Vercel function)
   ↓
Validates email + age-gate + magnet slug allowlist
   ↓
Generates lead_id (crypto.randomUUID())
   ↓
Sends email via nodemailer + smtp.purelymail.com:465
   ↓
Logs lead (JSON line to stdout + ./.vercel/leads.jsonl)
   ↓
Returns {ok: true, lead_id, ga4_event} to client
   ↓
Client fires gtag('event', 'generate_lead', {...})
   ↓
Client redirects to /download/first-timer-field-guide?success=true
```

## Adding new magnets

Edit `apps/maine-cannabis/src/pages/api/lead-capture.ts`, find
the `MAGNETS` const, add a new entry:

```typescript
'pos-comparison-2026': {
  name: 'Maine Cannabis POS Comparison 2026',
  pdfPath: '/downloads/maine-cannabis-pos-comparison.pdf',
  softPitch: 'Looking for the right cannabis POS for your Maine dispensary? Our full comparison is at /guides/maine-cannabis-pos-comparison.',
  recommendedCtaUrl: '/guides/maine-cannabis-pos-comparison',
},
```

Drop the PDF at `apps/maine-cannabis/public/downloads/<slug>.pdf`
and the endpoint handles the rest — no code changes elsewhere.

## Related files

- `apps/maine-cannabis/src/pages/api/lead-capture.ts` — the endpoint
  (715 lines, includes magnet registry, email template, validation,
  rate limiting, idempotency, GA4 event payload)
- `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
  — the landing page (form + client-side JS interception)
- `apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf`
  — the PDF that gets attached
- `scripts/build/generate-first-timer-pdf.py` — re-generate the PDF
- `vercel.json` — the route config that exposes /api/lead-capture
  to Vercel's edge
- `/tmp/lead-magnet-research-2026-07-05.md` — research brief

## The other 4 lead-capture forms (Formspree)

If you prefer to keep the 4 operator-facing PDFs (download-checklist,
compliance-self-assessment, founders-bible, metrc-reconciliation-checklist,
roadmap) on Formspree for simplicity, no action needed. Formspree
already creates submission records; configure the autoresponder in
the Formspree dashboard for each if you want PDF delivery on those
too. Future PDFs that should go through the new endpoint (e.g. a
second consumer-facing magnet) just need a new entry in `MAGNETS`.