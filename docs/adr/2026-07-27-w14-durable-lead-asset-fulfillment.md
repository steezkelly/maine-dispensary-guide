# ADR: Durable W14 lead-asset fulfillment

Date: 2026-07-27
Status: accepted for inactive implementation; activation remains operator-gated
Task: MDG-W14-001 / Kanban `t_65b54329`

## Context

W13 durably captures `/api/lead` requests in PostgreSQL, but no downstream service fulfills a promised asset. n8n execution history is neither durable queue state nor a safe idempotency source. SMTP cannot provide a database transaction spanning provider acceptance, so a crash after acceptance and before a fulfilled update creates an unavoidable uncertainty window.

The preserved W7 window contained empty envelopes and synthetic candidates. No historical row may be reconstructed or fulfilled.

## Decision

The controlled workflow is n8n workflow `KUJLPbIHydpjrsVg`, version `7f2fa684-b91e-4e30-acc3-3e427895d341`. It was created inactive and remains operator-gated.

### Queue and state machine

`public.mdg_leads` is the authoritative queue. W14 claims one due row with a transactional `UPDATE … RETURNING` whose candidate is locked using `FOR UPDATE SKIP LOCKED`.

States are `pending`, `claimed`, `sending`, `fulfilled`, `retryable_failure`, `terminal_failure`, and `manual_review`. The additive migration creates a sanitized `mdg_fulfillment_attempts` ledger and normalized `mdg_fulfillment_assets` allowlist.

Before SMTP submission, W14 commits:

- incremented attempt number;
- attempt row;
- `sending` status;
- template version;
- deterministic Message-ID.

A confirmed pre-acceptance failure may retry within the three-submission cap. Any error during/after DATA, any unclassified transport error, a Message-ID mismatch, or stale `sending` is uncertain and enters `manual_review`. A stale `claimed` row is safe to release because prepare-send has not run. An extra send requires `mdg_w14_authorize_resend` with operator identity and a substantive reason; it preserves attempt history and grants one extra cap slot.

### Transport

The authoritative path is n8n-managed SMTP only. Credential values remain in n8n's encrypted credential store.

The stock n8n Email Send v2.1 node was inspected on the pinned image digest and rejected for W14 because its public parameters and `mailOptions` do not expose `messageId`. W14 therefore uses one reviewed custom node, `MDG W14 SMTP Send`, which:

- uses the n8n custom-directory loader type `CUSTOM.mdgSmtpSend`;
- calls n8n's own SMTP transport helper and encrypted `smtp` credential schema;
- accepts only the prepared deterministic Message-ID;
- validates recipient syntax and the canonical MDG HTTPS PDF URL;
- builds one static link-only template;
- sets Nodemailer's `messageId` before submission;
- performs one submission with no internal retry;
- returns only lead/attempt IDs and sanitized outcome/code/stage/provider Message-ID;
- never emits recipient, body, or credentials;
- conservatively maps opaque or post-DATA errors to uncertain/manual review.

The custom node is coupled deliberately to the immutable n8n image digest. A missing transport helper fails closed and blocks W14 rather than silently falling back.

### Asset identity

W13 ignores client-supplied asset identifiers and maps only exact server-observed page paths to six stable machine IDs. Non-asset forms and unknown paths remain ineligible. W14 never infers a URL from prose, subject, or legacy W7 labels.

### Privacy

W14 sets `saveDataSuccessExecution=none`, `saveDataErrorExecution=none`, `saveManualExecutions=false`, and `saveExecutionProgress=false`. The durable incident surface stores IDs, state, timestamps, attempt metadata, provider Message-ID where safe, and sanitized error codes only.

## Rejected alternatives

- n8n execution history as queue/idempotency state: not durable or privacy-safe.
- Inbox scraping/W7 as source: stale, lossy, and contradicted by current W13 state.
- Stock n8n Email Send node: cannot set deterministic Message-ID.
- Two automatic send paths: creates ambiguous retry and credential semantics.
- Automatic stale-sending recovery: can duplicate a provider-accepted message.
- Four total submissions to honor a 2-hour third retry: conflicts with the explicit maximum-attempts value of three.

## Consequences

The design chooses at-most-once recovery after uncertainty over silent duplicate delivery. Some valid requests may require manual review. Custom-node compatibility must be revalidated on every n8n image update. Activation remains blocked until offline/database tests, credential validation, and one operator-controlled synthetic end-to-end delivery pass.
