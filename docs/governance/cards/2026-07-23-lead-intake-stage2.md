# Stage 2: replace mailto lead intake with Cloudflare Worker → n8n webhook

| Field | Value |
|---|---|
| **id** | (parent: t_03bbcf29) |
| **parent** | t_03bbcf29 |
| **role** | codex-author (hermes-agent) |
| **base_sha** | bb483781ac4fa7df985cd0bbf33cd65bc10dacd6 (origin/main) |
| **branch** | feat/lead-intake-stage2-2026-07-23 |
| **worktree** | /home/steve/.cache/mdg-lead-intake-stage2-20260723 |
| **allowed_paths** | apps/maine-cannabis/src/components/LeadMailtoForm.astro, apps/maine-cannabis/src/components/LeadIntakeForm.astro, apps/maine-cannabis/src/components/LeadIntakeForm.test.cjs, docs/audits/lead-intake-stage2-2026-07-23.md, docs/governance/cards/2026-07-23-lead-intake-stage2.md, docs/postmortems/2026-07-23-lead-intake-stage2-impl.md |
| **acceptance** | 1) New `LeadIntakeForm.astro` exists with `data-endpoint` and `data-fallback` props. 2) `LeadIntakeForm.test.cjs` runs with node:test and asserts (a) mailto: fallback path is rendered, (b) when endpoint is reachable the form POSTs, (c) when endpoint is unreachable the form falls back to mailto:. 3) `LeadMailtoForm.astro` is kept as a compatibility shim that renders `LeadIntakeForm` with `data-fallback`=true. 4) `verify:iterate` exits 0. 5) `LeadIntakeForm.test.cjs` passes. |
| **depends_on** | t_de6c7a6f (closed: cycle 14 W7 patch shipped), t_12fbe3e8 (closed: Purelymail routing inspection done) |
| **lease_ttl_minutes** | 240 |
| **stop_condition** | All 5 acceptance gates green, lease released, branch pushed, PR opened with self-review PASS or HOLD. |

## Scope

The current `LeadMailtoForm.astro` opens a `mailto:` URL on submit. That transport is unreliable on webmail and mobile browsers, and it cannot record the submitter's IP, user agent, consent timestamp, or page attribution. This card implements a server-side intake endpoint as a new optional path, with the existing `mailto:` path as the universal fallback.

The new `LeadIntakeForm.astro` is a controlled substitution that:

- POSTs the form payload as JSON to `data-endpoint` (a Cloudflare Worker URL — operator-set).
- Validates the response is a 2xx with a redirect URL.
- On network error, non-2xx, or no `data-endpoint` set, falls back to opening the existing `mailto:` URL.
- Includes an explicit consent checkbox (required to submit).
- Includes a hidden `data-page-path`, `data-utm-*`, `data-referrer` set from `window.location` and `document.referrer`.
- Fires `gtag('event', 'lead_capture', { transport: 'server' or 'mailto' })` so the existing `LeadFormTracker` instrumentation keeps working.
- Reads `data-endpoint` from a `data-endpoint` attribute that the page author supplies. Defaults to empty string → mailto: path only.

The `LeadMailtoForm.astro` keeps the same component name and prop signature but delegates rendering to `LeadIntakeForm` with `data-fallback="true"`. This keeps the existing 6+ call sites (cycle 9 audit) working without change.

The new endpoint is implemented outside this card as `n8n-workflows/w13-lead-intake.json` (filed on the `mini-pc-ops` repo) and the Cloudflare Worker source (in the same `mini-pc-ops` repo). This MDG card ships the client-side form, not the server.

## Out of scope

- Cloudflare Worker deploy. The Worker source ships in `mini-pc-ops/mdg-lead-worker/` and is operator-deployed.
- n8n workflow W13. Ships in the same `mini-pc-ops` PR.
- Page-level replacement. The 6 existing `LeadMailtoForm` call sites are NOT modified in this card. The compatibility shim is enough to keep them working; page-level replacement is a follow-up card with proper allow_paths for each `pages/download/*.astro`.
- Customer-facing autoresponder. The W13 webhook does NOT send any email on receipt. Operator manually follows up until they decide to enable an autoresponder.
