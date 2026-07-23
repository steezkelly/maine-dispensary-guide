# Cycle 15 Stage 2 — operator deploy playbook

**Date:** 2026-07-23
**Status:** Form component shipped. Server-side intake, Worker deploy, and DNS routing are operator-deployable steps that follow this playbook.

## What ships in this card

- `apps/maine-cannabis/src/components/LeadIntakeForm.astro` (new): server-side-aware lead-capture form. POSTs JSON to `data-endpoint` when set; falls back to `mailto:` on any non-2xx or network error. Adds an explicit consent checkbox and a `transport: 'server' | 'mailto'` field on the existing `lead_capture` GA4 event.
- `apps/maine-cannabis/src/components/LeadMailtoForm.astro` (rewritten as a thin shim): renders `LeadIntakeForm` with `endpoint=""`. Existing call sites keep working unchanged.
- `apps/maine-cannabis/src/components/LeadIntakeForm.test.cjs` (new): 9 RED→GREEN tests, run with `node --test LeadIntakeForm.test.cjs`. All 9 pass.

The new endpoint is implemented outside this card as `n8n-workflows/w13-lead-intake.json` and the Cloudflare Worker source. Both ship in a follow-up `mini-pc-ops` PR.

## What does NOT change

- The 6 existing `LeadMailtoForm` call sites on `/download/*` and `/contact` continue to work. They render the new `LeadIntakeForm` with `endpoint=""`, which means the mailto: path is unchanged. The success redirect, the GA4 `lead_capture` event, the honeypot, and the `mailto:` URL build are all preserved.
- The W7 n8n workflow that polls `leads@mainedispensaryguide.com` is unchanged. The new server-side path writes directly to `mdg_leads` via the n8n webhook W13; W7's IMAP polling continues to handle any mail that arrives at the mailbox directly.
- The 41 historical placeholder rows in `mdg_leads` are still present. A separate operator decision is required.

## Operator steps to enable the server-side path

When the operator is ready to enable the new intake path on production pages:

### 1. Set up Cloudflare Turnstile (free)

1. Open https://dash.cloudflare.com/ → account → Turnstile → Add widget.
2. Site key: copy the **Site Key** (public, used in form HTML). Set it as `TURNSTILE_SITE_KEY` in the Worker environment.
3. Secret key: copy the **Secret Key** (private, used by the Worker to verify tokens). Set it as `TURNSTILE_SECRET` in the Worker environment.

### 2. Deploy the Cloudflare Worker (mdg-lead-worker)

The Worker source ships in `mini-pc-ops/mdg-lead-worker/`. From the `mini-pc-ops` repo on g3nuc:

```bash
cd /home/steve/projects/mini-pc-ops/mdg-lead-worker
# 1. Edit wrangler.toml to set the Cloudflare account_id, zone, and route.
#    Set: account_id = "<operator's Cloudflare account id>"
#          route     = "mainedispensaryguide.com/api/lead"
# 2. Add secrets:
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put N8N_WEBHOOK_HMAC_SECRET
# 3. Deploy:
npx wrangler deploy
```

After deploy, the Worker is reachable at `https://mainedispensaryguide.com/api/lead`. The MDG form's `data-endpoint` should be set to that URL.

### 3. Set the `data-endpoint` on each page that should use the new path

For each `LeadMailtoForm` (or new `LeadIntakeForm`) call site on a page that should use the server-side path, add an `endpoint` prop:

```astro
<LeadIntakeForm
  formId="founders-bible-lead-form"
  leadTo="hello@mainedispensaryguide.com"
  leadSubject="Founders Bible request: {email}"
  leadBody={"..."}
  formName="founders_bible"
  successPath="/download/founders-bible?success=true"
  endpoint="https://mainedispensaryguide.com/api/lead"
>
  ...
</LeadIntakeForm>
```

When `endpoint` is omitted (or empty), the form falls back to the existing `mailto:` path. This means pages can migrate one at a time without breaking.

### 4. Deploy n8n workflow W13 Lead Intake

The webhook workflow ships in `mini-pc-ops/n8n-workflows/w13-lead-intake.json`. The deploy steps:

1. From the n8n web UI or via the API: import the workflow.
2. Set the HMAC shared-secret credential to match `N8N_WEBHOOK_HMAC_SECRET` from step 2.
3. Set the Postgres credential (already present in the n8n instance as `n8n Postgres (no-ssl)`).
4. Activate the workflow. The webhook URL is something like `https://g3nuc.lan:5678/webhook/mdg-lead-intake`. The Worker uses this URL plus the HMAC signature.

### 5. Verify the end-to-end path

Run this acceptance test from a browser DevTools console on a canary page (e.g. `/download/founders-bible`):

```js
fetch('https://mainedispensaryguide.com/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    page_path: '/download/founders-bible',
    form_name: 'founders_bible',
    'cf-turnstile-response': '<paste a real Turnstile token here>',
    consent: '1',
  }),
}).then(r => r.json()).then(console.log);
```

Expected response: `{"ok": true, "redirect": "/download/founders-bible?success=true"}` or a similar 2xx.

Verify in the `mdg_leads` table:

```sql
SELECT id, from_email, page_path, utm_source, transport_kind, source_message_id
FROM mdg_leads
WHERE received_at > now() - interval '10 minutes'
ORDER BY id DESC LIMIT 5;
```

Expected: 1 new row with `transport_kind='api_post'` (or whatever the W13 workflow sets), `source_message_id` set, and the right `page_path`.

## Risk register

| Risk | Mitigation |
|---|---|
| Cloudflare Worker rate-limit exceeded | Worker checks Turnstile before any other processing. Add per-IP rate-limit at the Worker level if abuse is observed. |
| Worker deploy fails | Cloudflare retains the previous deploy until the new one is healthy. Roll back via `wrangler rollback`. |
| n8n webhook is unreachable from the Worker | The Worker has a 5-second timeout. On timeout, it returns a 502 and the browser falls back to mailto:. |
| Page author forgets to add `endpoint` to a new page | The new page falls back to mailto: by default. No lead is lost. |
| Cloudflare zone has DNS interference | Worker's `wrangler.toml` route must match the public hostname. If `mainedispensaryguide.com` is on a different zone, the Worker can't intercept. |

## What is out of scope

- DNS zone change for `mainedispensaryguide.com`. The Worker runs in the existing zone; no DNS work is required.
- Worker observability. Add Logpush or Workers Analytics after first deploy.
- Customer-facing autoresponder. The W13 webhook does NOT send any email on receipt. Operator manually follows up until they decide to enable an autoresponder.
- Per-page rollout. Each `LeadMailtoForm` call site that wants the new path must be updated with `endpoint` set. This is a follow-up card.
