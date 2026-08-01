# Lead Intake Pipeline Operator Runbook

**Status:** Production ingress is restricted to the lead webhook path. Treat HTTP success as provisional until the corresponding `mdg_leads` row exists.

## Architecture

```text
Browser POST /api/lead
  → Vercel legacy route (request-time `MDG_LEAD_WEBHOOK_URL` destination)
  → path-restricted Tailscale Funnel
  → nginx lead gateway on 127.0.0.1:8081 (POST-only, rate-limited, no CORS)
  → n8n W13 webhook on 127.0.0.1:5678
  → Postgres mdg_leads INSERT
  → acknowledgement { ok, id, redirect }
```

The browser only uses the same-origin `/api/lead` URL. The upstream URL is not committed in source.

## Vercel configuration

Create the `MDG_LEAD_WEBHOOK_URL` project environment variable in Vercel for every environment that serves lead submissions. Its value must be the complete HTTPS lead-webhook URL, including `/webhook/mdg-lead-intake`.

- Keep the value in Vercel Project Settings; never commit, paste, or print it in a shell transcript.
- `vercel.json` has an exact legacy `routes` rule for `^/api/lead$` and permits only this variable at request time.
- Before a deployment, read back only the variable **name** and target environments in Vercel’s dashboard. Do not reveal its value.
- After deployment, use the controlled end-to-end check below. A correct Vercel route preserves `POST`, JSON body, and `Content-Type`.

## Persistent protected ingress on g3nuc

The public Funnel handler must stay limited to the webhook path and target the nginx gateway, not raw n8n:

```bash
sudo tailscale funnel --bg --yes \
  --set-path=/webhook/mdg-lead-intake \
  http://127.0.0.1:8081/webhook/mdg-lead-intake
```

The nginx gateway is a root-owned Compose sidecar in `/srv/agent-node/compose/automation`. It listens only on loopback, accepts only `POST /webhook/mdg-lead-intake`, forwards the exact path to n8n, rate-limits by trusted forwarded client IP, and emits no CORS headers.

Effective limits:

- `30` requests/minute per trusted forwarded client address, with a burst of `10`; overflow returns `429` and `Retry-After: 60`.
- At most `4` concurrent gateway connections per client address.
- `32 KiB` maximum request body (`413` above the limit), `10s` client-body/send timeout, `5s` upstream-connect timeout, and `10s`/`15s` upstream send/read timeouts.
- Upstream `Access-Control-Allow-*` headers are removed. The browser uses the same-origin `/api/lead` route and receives no CORS grant.

Read-only host checks:

```bash
sudo tailscale funnel status --json
sudo docker compose -f /srv/agent-node/compose/automation/compose.lead-gateway.yaml ps
sudo docker compose -f /srv/agent-node/compose/automation/compose.lead-gateway.yaml exec -T lead-gateway nginx -t
```

### Gateway configuration changes and rollback

The gateway config is a single-file bind mount. Replacing the host file does **not** update an already-running container; recreate only the `lead-gateway` service after validating the replacement configuration. Before any change, retain a dated root-owned copy of `nginx-mdg-lead-gateway.conf` in the same Compose directory.

```bash
sudo docker compose -f /srv/agent-node/compose/automation/compose.lead-gateway.yaml \
  up -d --force-recreate --no-deps lead-gateway
```

If the new configuration fails validation or boundary checks, restore the dated config copy and recreate only `lead-gateway` again. Do not alter the Funnel handler, n8n, or PostgreSQL to roll back a gateway config.

Expected public boundary:

- `/` is denied.
- `GET` and `OPTIONS` for the webhook path are denied.
- Only a valid webhook `POST` can reach n8n.
- No Funnel rule may expose n8n root, `/rest/settings`, or the n8n administration surface.

## Verifying the pipeline end to end

Use only a controlled `@example.com` address and a newly generated UUID v4. Do not use a real recipient.

```bash
REQUEST_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
EMAIL="lead-canary-$(date +%s)@example.com"
curl -sS -m 15 -X POST 'https://mainedispensaryguide.com/api/lead' \
  -H 'Content-Type: application/json' \
  -d "{\
    \"consent\":\"1\",\
    \"email\":\"${EMAIL}\",\
    \"form_name\":\"founders_bible\",\
    \"name\":\"Controlled Canary\",\
    \"page_path\":\"/download/founders-bible\",\
    \"success_path\":\"/download/founders-bible?success=true\",\
    \"request_id\":\"${REQUEST_ID}\",\
    \"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"\
  }"
```

A successful response has `{ "ok": true, "id": <number>, "redirect": "..." }`, but that alone is not proof of intake. Confirm persistence on g3nuc:

```bash
docker exec agent-automation-postgres-1 \
  psql -U n8n -d n8n -P pager=off -Atc \
  "SELECT id, from_email, form_name, transport_kind, source_message_id, received_at
   FROM mdg_leads
   WHERE from_email = '<controlled-example-address>'
   ORDER BY id DESC LIMIT 1;"
```

The returned row must match the acknowledgement ID and include `transport_kind='api_post'` and `source_message_id='api_post:<request_id>'`.

### Idempotency contract

- `request_id` is the idempotency key; `ts` is optional observational metadata.
- Exact replay (same request ID and immutable identity) returns the existing row without another insert.
- Reusing an ID with different immutable data fails closed.
- Missing or malformed IDs are rejected; the server never silently invents one.
- `source_message_id` excludes email, name, and page path.

## Troubleshooting

### POST returns 404

Verify `vercel.json` contains the exact `/api/lead` legacy route and the route’s `env` list names `MDG_LEAD_WEBHOOK_URL`. Then confirm in Vercel Project Settings that the variable name exists for the environment serving that deployment. Do not replace it with a committed hostname.

### POST returns 502, 504, or an upstream error

Inspect the restricted Funnel state and proxy without widening exposure:

```bash
sudo tailscale funnel status --json
sudo docker compose -f /srv/agent-node/compose/automation/compose.lead-gateway.yaml ps
sudo docker compose -f /srv/agent-node/compose/automation/compose.lead-gateway.yaml \
  logs --tail 100 lead-gateway
```

If the handler is absent, restore only the exact path-restricted command shown above. Never use a blanket root-forwarding command.

### POST returns 200 but no row exists

This is an intake failure, not success. Inspect recent W13 executions and the proxy log, then rerun a controlled canary only after the cause is corrected. Do not close an incident based on HTTP status alone.

## Relevant files

- `vercel.json` — request-time route configuration without an upstream hostname
- `apps/maine-cannabis/src/components/LeadMailtoForm.astro` — `/api/lead` client shim
- `apps/maine-cannabis/src/components/LeadIntakeForm.astro` — canonical browser payload
- `docs/runbooks/lead-intake-stage3.md` — this operational contract
