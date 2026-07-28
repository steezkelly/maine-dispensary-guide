# Lead Intake Pipeline Operator Runbook

**Status:** Live in production as of 2026-07-24 (PR #196, merge commit 7adc1b00).
**Pipeline:** MDG form POST → Vercel rewrite → Tailscale Funnel → n8n W13 → Postgres mdg_leads.

## What works

A real form submission on any `/download/*` or `/contact` page creates a row in `mdg_leads` with all 10 attribution columns populated. No user-visible change to the form UX.

## Architecture

Browser → `POST https://mainedispensaryguide.com/api/lead`
  → Vercel rewrite (server-side, preserves POST body and Content-Type)
  → `https://g3nuc.tail1a791f.ts.net/webhook/mdg-lead-intake` (Tailscale Funnel, TLS terminates at the tailnet ingress)
  → `127.0.0.1:5678/webhook/mdg-lead-intake` (n8n on g3nuc)
  → W13 webhook (`UdQ56USYaWRcfocT`)
  → Postgres `mdg_leads` INSERT
  → 200 OK with `{ok, id, redirect}` to the browser

Fallback: any non-2xx along the way triggers the form's client-side catch handler, which opens a `mailto:` URL (existing behavior preserved).

## Persistent service (Tailscale Funnel)

Tailscale Funnel is running on g3nuc via `sudo tailscale funnel --bg 5678`. The `--bg` flag means it runs as a tailscaled child; it survives g3nuc reboots as long as tailscaled itself is up.

### Survive reboot

Tailscale Funnel is launched by the systemd-managed `tailscaled.service`. When g3nuc reboots:
1. systemd restarts `tailscaled`.
2. The user-space funnel listener was started with `--bg` and is part of the `tailscaled` state; on tailscaled restart it should auto-reconnect.

If Funnel does not auto-restart after a reboot, re-establish it manually:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 'sudo tailscale funnel --bg 5678'
```

Verify with:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 'sudo tailscale funnel status'
```

Expected:

```
https://g3nuc.tail1a791f.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:5678
```

## Verifying the pipeline end-to-end

```bash
curl -sS -m 10 -X POST "https://mainedispensaryguide.com/api/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "consent":"1",
    "email":"verify@example.com",
    "form_name":"verify_test",
    "name":"Verify Test",
    "page_path":"/download/founders-bible",
    "success_path":"/download/founders-bible?success=true",
    "request_id":"3f2a8c1e-9d4b-4e7a-b6c5-1a2b3c4d5e6f",
    "ts":"2026-07-24T02:30:00.000Z"
  }'
```

`request_id` is a client-generated canonical **RFC-4122 UUID v4** (version nibble
`4`, variant nibble in `[89ab]`) and is the **idempotency key** for the lead.
Generate a fresh one per deliberate submission (e.g. `uuidgen` or
`crypto.randomUUID()` in the browser). The server validates the version and
variant bits and lowercases the value before use.

Expected: `{"ok":true,"id":<n>,"redirect":"..."}`. Then:

```sql
SELECT id, from_email, page_path, transport_kind, source_message_id, consent_ts
FROM mdg_leads
WHERE received_at > now() - interval '5 minutes'
ORDER BY id DESC LIMIT 3;
```

Expected: 1 new row with `transport_kind='api_post'`,
`source_message_id='api_post:3f2a8c1e-9d4b-4e7a-b6c5-1a2b3c4d5e6f'` (the
`request_id`, prefixed with `api_post:`).

### Idempotency contract

- `request_id` is the idempotency key; `ts` is **not** an idempotency key (it is
  optional observational metadata only).
- The insert is handled by the restricted database function
  `mdg_w14_insert_lead`. An idempotency key resolves to an existing row **only
  when the immutable request identity matches** (normalized email, `page_path`,
  `form_name`, `promised_asset`, `transport_kind`).
- **Exact replay** (same `request_id` AND same immutable identity): returns the
  existing lead id; creates no second row; resets no fulfillment state; creates
  no fulfillment attempt; throws no unhandled uniqueness error. A transport-level
  retry must reuse the same `request_id`.
- **Same `request_id` with different immutable data**: fails closed with
  `request_id_reuse_mismatch`; creates no row; mutates no existing row; the
  surrounding W13 workflow fails rather than returning a false successful lead
  response.
- **New `request_id`** (even for identical email/form/page): inserts a new lead.
- A missing or malformed `request_id` (including a non-v4 UUID) is rejected
  cleanly before insertion (`missing_request_id` / `invalid_request_id`); it is
  never silently replaced with a random value or an empty timestamp.
- `source_message_id` contains no email, name, page path, or other PII.

## What to do if the pipeline breaks

### Symptom: POST returns 404

The Vercel rewrite isn't applied. Verify `vercel.json` has the rewrites block:

```json
"rewrites": [
  {
    "source": "/api/lead",
    "destination": "https://g3nuc.tail1a791f.ts.net/webhook/mdg-lead-intake"
  }
]
```

If missing, re-add and merge.

### Symptom: POST returns 502 / 504 / cloudflare loop

The tunnel is down. Check on g3nuc:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 \
  'sudo tailscale funnel status && sudo tailscale status'
```

If Funnel shows "off", re-enable: `sudo tailscale funnel --bg 5678`.

If `tailscaled` itself is down, restart:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 \
  'sudo systemctl restart tailscaled && sleep 5 && sudo tailscale funnel --bg 5678'
```

### Symptom: POST returns 200 but no row

The form reached the webhook but n8n failed to insert. Check:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 \
  'docker exec agent-automation-n8n-1 curl -s http://127.0.0.1:5678/healthz'
```

If n8n is healthy, list recent executions of W13 and look for errors:

The W13 workflow id is `UdQ56USYaWRcfocT`. Recent failures are visible via:

```bash
ssh -i ~/.ssh/g3nuc-admin-ed25519 steve@192.168.1.202 \
  'docker exec agent-automation-postgres-1 psql -U n8n_user -d n8n -c "SELECT id, status, \"errorMessage\" FROM execution_entity WHERE \"workflowId\"=$$UdQ56USYaWRcfocT$$ ORDER BY id DESC LIMIT 5;"'
```

## Files

- `apps/maine-cannabis/src/components/LeadMailtoForm.astro` (the shim; endpoint="/api/lead")
- `apps/maine-cannabis/src/components/LeadIntakeForm.astro` (the canonical form)
- `vercel.json` (rewrite block)
- `mini-pc-ops/n8n-workflows/w13-lead-intake.json` (on-disk JSON for the W13 webhook)
- `mini-pc-ops/scripts/n8n-export-all.cjs` (live export reconciler)

The Cloudflare Worker source in `mini-pc-ops/mdg-lead-worker/` is preserved as an alternative path if the tunnel ever needs to live behind Cloudflare instead of Tailscale. The Worker is not in use today; only Tailscale Funnel + Vercel rewrite.
