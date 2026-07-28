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

## Rollback

Deactivate W14 first. Never automatically resend a `sending`, uncertain, or `manual_review` attempt. Restore W13 through n8n version history if its exact-path mapping regresses. Repository changes use a reviewed revert. Database changes are additive; rows/ledger/allowlist remain for auditability unless a later reviewed retention migration says otherwise. Removing or invalidating the final marker must make the PR #200 audit fail closed.
