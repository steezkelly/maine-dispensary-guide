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

- registers under the n8n custom-directory loader type `CUSTOM.mdgSmtpSend` (the `CUSTOM` prefix is n8n-core's `CUSTOM_NODES_PACKAGE_NAME` applied to every node loaded via `N8N_CUSTOM_EXTENSIONS`; the node's `description.name` is `mdgSmtpSend`; the on-disk npm package name `n8n-nodes-mdg-smtp-send` is a separate concept and does not form the workflow type under this deployment model);
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

### Correction record (2026-07-28): node-type misdiagnosis

An earlier commit (`8aeb75e9`) changed the W14 SMTP node type from `CUSTOM.mdgSmtpSend` to `n8n-nodes-mdg-smtp-send.mdgSmtpSend`. That change was a misdiagnosis and is superseded (it is preserved in Git history, not erased).

The original `Unrecognized node type: CUSTOM.mdgSmtpSend` failure was caused by the custom-node package being mounted at the wrong filesystem path, not by the type string. After correcting the Compose mount destination to `<custom-dir>/node_modules/n8n-nodes-mdg-smtp-send` under `N8N_CUSTOM_EXTENSIONS`, n8n's own `CustomDirectoryLoader` discovers the node and registers it under `CUSTOM_NODES_PACKAGE_NAME` (`CUSTOM`) plus `description.name` (`mdgSmtpSend`) — i.e. `CUSTOM.mdgSmtpSend`. The community-package-style type `n8n-nodes-mdg-smtp-send.mdgSmtpSend` is only produced by n8n's package-directory loader for npm-installed community packages, which this deployment does not use. The authoritative workflow type is therefore `CUSTOM.mdgSmtpSend`.

### Correction record (2026-07-28): activation cutover and request-id idempotency

Two review findings on the merged W14 candidate are corrected here, without
changing the SMTP-node contract above.

**Activation cutover (replaces the seven-day backfill proxy).** The original
migration marked rows received within seven days as `pending`. "Received within
seven days" is not a safe proxy for W14 eligibility: while W13 stays live
between a zero-row checkpoint and migration execution, a recent pre-W14 lead
could be auto-emailed after activation. The corrected design:

- adds an activation-control singleton `public.mdg_w14_activation` with
  `activation_cutover_at` initially `NULL`;
- while the cutover is `NULL`, **no lead is claimable** for automatic
  fulfillment;
- the migration backfill marks **every** row that exists at migration time
  `not_applicable` (no pre-migration row becomes `pending`);
- `mdg_w14_claim` independently verifies the cutover and requires
  `received_at >= activation_cutover_at` (defense in depth — an incorrectly
  marked pre-cutover `pending` row is still rejected);
- one transactional, idempotent, operator-only function
  `mdg_w14_activate_cutover(operator, reason, cutover_at)` establishes the
  cutover and safely classifies existing **unattempted** rows: post-cutover
  asset leads become `pending`; everything else received before the cutover
  becomes `not_applicable`. It never rewrites rows already claimed, sending,
  fulfilled, manual_review, terminal, or with an existing attempt.

At the later activation checkpoint the operator must separately inventory the
live queue and explicitly disposition any existing pending rows. That live
decision is not part of the repository migration and is not authorized here.

**Request-id idempotency (replaces FNV-1a/timestamp identity).** The original
W13 identity was `api_post:` + FNV-1a over `email|page|form|ts`. For any caller
omitting `ts`, that collapses to email/page/form, so after the unique index a
legitimate timestamp-less repeat would raise a uniqueness error and never enter
the queue. The corrected design:

- `LeadIntakeForm` generates one canonical UUID v4 `request_id`
  (`crypto.randomUUID()`, with a `crypto.getRandomValues` fallback) immediately
  before building each POST payload; a new deliberate submission gets a new
  UUID. It is not derived from email, name, page path, timestamp, IP, or user
  agent, and is not stored for cross-page tracking;
- W13 requires and validates `request_id` as a canonical UUID, rejecting
  missing/malformed values cleanly before insertion (never silently replaced);
- `source_message_id = 'api_post:' + request_id` — contains no PII, is
  deterministic for an exact replay, and differs for distinct request_ids;
- the W13 insert is an idempotent upsert (`ON CONFLICT (source_message_id)
  DO NOTHING` returning the existing id): an exact replay deduplicates with no
  second row, no state reset, no extra attempt, and no unhandled uniqueness
  error; a new request_id inserts a new lead even for identical email/form/page;
- `ts` remains optional observational metadata only and is never an idempotency
  key. FNV-1a is removed from lead identity.

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
