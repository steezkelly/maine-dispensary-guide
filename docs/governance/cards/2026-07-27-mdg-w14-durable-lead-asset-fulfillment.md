# MDG-W14-001 — Durable Lead Asset Fulfillment

- Kanban task: `t_65b54329` on board `mdg-site` (authoritative live contract)
- Fixed base: `c7dc60b1f88e632766eb6aa3110d12aace3a77fe`
- Branch: `feat/mdg-w14-durable-fulfillment-20260727`
- W13: `UdQ56USYaWRcfocT`
- W7 legacy: `sqTm36P8WqvP5FXB`
- W14: `KUJLPbIHydpjrsVg` (version `7f2fa684-b91e-4e30-acc3-3e427895d341`; inactive at checkpoint)
- Transport: one n8n-managed encrypted SMTP credential through the reviewed `MDG W14 SMTP Send` custom node. The stock Email Send v2.1 node was rejected because it cannot set the pre-persisted deterministic Message-ID.
- Activation authority: operator only after the credential checkpoint and explicit continuation.
- Independent verifier: different Hermes session/model, read-only exact-candidate review.

## Acceptance authority

The full acceptance conditions, rollback, allowed database objects, repository paths, host paths, and stop conditions are in Kanban task `t_65b54329` plus its dated contract-amendment comments. This file is a repository pointer, not a second mutable task authority.

## Frozen implementation decisions

- PostgreSQL `public.mdg_leads` is the only durable queue/source of truth.
- `public.mdg_fulfillment_attempts` is the sanitized attempt ledger.
- `public.mdg_fulfillment_assets` is the server-side allowlist.
- Atomic claim uses one `UPDATE … RETURNING` fed by `FOR UPDATE SKIP LOCKED`.
- Message-ID: `<mdg-w14-{lead_id}-a{attempt_number}@mainedispensaryguide.com>`.
- `sending` plus the attempt ledger is committed before SMTP starts.
- Uncertain possible acceptance and stale `sending` go to `manual_review`; they never auto-requeue.
- Normal cap: three provider submissions. Delays before attempts 2 and 3 are about 5 and 30 minutes plus deterministic jitter. The old spec's suggested 2-hour third retry conflicts with the explicit three-attempt cap and is not an automatic fourth send.
- Successful and failed W14 execution payload retention is disabled.
- No recipient, name, message body, credential, or asset token appears in routine logs, Git, Kanban, or public evidence.
- W13 derives stable asset IDs from exact server-observed `page_path`; client-provided asset IDs are ignored.
- W7 is not a W14 source and receives a separate decommission/routing disposition.

## Correction (2026-07-28): activation cutover and request-id idempotency

Follow-up to the merged W14 candidate (base `15fc3c2b`), correcting two review
findings without changing the SMTP-node contract:

- Activation cutover replaces the seven-day backfill proxy. `public.mdg_w14_activation`
  holds `activation_cutover_at` (initially `NULL`; nothing claimable while NULL).
  The migration marks every pre-existing row `not_applicable`. `mdg_w14_claim`
  independently verifies the cutover and `received_at >= activation_cutover_at`.
  `mdg_w14_activate_cutover(operator, reason, cutover_at)` is transactional,
  idempotent, operator-only, and never rewrites active/attempted rows.
- Request-id idempotency replaces FNV-1a/timestamp identity. `LeadIntakeForm`
  generates a per-submission UUID v4 `request_id`; W13 requires and validates it;
  `source_message_id = 'api_post:' + request_id` (no PII); the insert is an
  idempotent upsert (exact replay returns the existing id; a new request_id
  inserts a new lead). `ts` is observational only.
- Live activation still requires a separate operator inventory/disposition of any
  existing pending rows; that live decision is not part of this repository change.
- W14 remains inactive. No email is sent by this change.

## Rollback

Deactivate W14 first. Never automatically resend a `sending`, uncertain, or `manual_review` attempt. Restore W13 through n8n version history if its exact-path mapping regresses. Repository changes use a reviewed revert. Database changes are additive; rows/ledger/allowlist remain for auditability unless a later reviewed retention migration says otherwise. Removing or invalidating the final marker must make the PR #200 audit fail closed.
