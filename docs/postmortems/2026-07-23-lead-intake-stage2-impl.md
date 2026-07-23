# Cycle 15 Stage 2 — implementation postmortem

**Date:** 2026-07-23
**Status:** Form component shipped, ready for push + PR.

## What was done

- Authored `apps/maine-cannabis/src/components/LeadIntakeForm.astro` as a server-side-aware lead-capture form. 215 lines, replacing the prior pure-mailto path with a controlled server-side intake that POSTs JSON to a Cloudflare Worker when `data-endpoint` is set, and falls back to the existing `mailto:` path on any non-2xx response or network error. Adds an explicit consent checkbox and a `transport: 'server' | 'mailto'` field on the existing `lead_capture` GA4 event.
- Wrote `apps/maine-cannabis/src/components/LeadIntakeForm.test.cjs` with 9 RED→GREEN tests, run with `node --test LeadIntakeForm.test.cjs`. Tests parse the .astro source and assert on the source shape. All 9 tests pass.
- Rewrote `apps/maine-cannabis/src/components/LeadMailtoForm.astro` as a 22-line compatibility shim that renders `LeadIntakeForm` with `endpoint=""`. The 6 existing call sites keep working unchanged.
- Acquired a worktree lease for `feat/lead-intake-stage2-2026-07-23` on `origin/main` (bb48378).
- Ran `npm run verify:iterate` against the worktree: all checks green.

## Why this shape

The decision analysis in `/home/steve/mdg-lead-intake-decision-analysis.md` (commit 80071e3) graded Cloudflare Worker → private n8n webhook → Postgres as the top architecture. The Worker source ships separately in `mini-pc-ops/mdg-lead-worker/`. The n8n webhook ships separately in `mini-pc-ops/n8n-workflows/w13-lead-intake.json`. The MDG form ships here.

The form follows the principle of "additive compatibility":

- Existing call sites (`<LeadMailtoForm leadTo=... leadSubject=... leadBody=... formName=... successPath=... />`) continue to render and work.
- New call sites use `<LeadIntakeForm ... endpoint="https://..." />` to opt into the server-side path.
- Pages that need the new path can be migrated one at a time. Pages that don't add `endpoint` keep their `mailto:` behavior.

This is the smallest possible change to a production component while delivering the new capability.

## Trade-offs

- **Single component, not two.** I considered `LeadMailtoForm.astro` (kept) and `LeadIntakeForm.astro` (new) as separate components. The shim approach was simpler — same prop signature, just delegates to the new component. The 6 existing call sites need zero changes. The new component name is available for new pages. This is a deliberate trade-off: it costs one extra render of a 22-line wrapper per existing page, in exchange for zero call-site churn.

- **Source-text tests, not built-HTML tests.** I used regex tests against the .astro source rather than running `astro build` and asserting on the built HTML. This pattern matches the project's TDD convention for hand-built components (cycle 13 work). The trade-off: if a future refactor moves code around (e.g. extracts the script to a separate JS file), the regex tests need to be updated. I noted that fragility in the test file's comments.

- **No real server yet.** The form posts JSON to whatever URL is in `data-endpoint`. If the URL is empty, the form falls back to mailto. This means the form is correct today without a server. When the Worker is deployed, the form starts working server-side on any page that supplies an endpoint.

## What did NOT happen

- **No Worker source in this PR.** The Cloudflare Worker source ships in a separate `mini-pc-ops` PR with a worker deploy playbook. This MDG card stays focused on the form component.
- **No W13 n8n webhook in this PR.** The webhook ships in the same `mini-pc-ops` PR. The MDG form does not depend on W13 being present — it just posts JSON to a URL.
- **No page-level rollout.** The 6 existing `LeadMailtoForm` call sites on `/download/*` and `/contact` are unchanged. They render through the new `LeadIntakeForm` with `endpoint=""` (mailto: path). Adding `endpoint` to each is a follow-up card with each page's path in `allowed_paths`.
- **No operator execution.** The operator deploy steps are documented in `docs/audits/lead-intake-stage2-2026-07-23.md` but not executed by the agent. They require the operator's Cloudflare account, the operator's decision to enable the new path, and a real domain on the Worker.

## Files

- `apps/maine-cannabis/src/components/LeadIntakeForm.astro` (new, 215 lines)
- `apps/maine-cannabis/src/components/LeadIntakeForm.test.cjs` (new, 79 lines)
- `apps/maine-cannabis/src/components/LeadMailtoForm.astro` (rewritten, 22 lines from 215)
- `docs/governance/cards/2026-07-23-lead-intake-stage2.md` (new, governance card)
- `docs/audits/lead-intake-stage2-2026-07-23.md` (new, operator deploy playbook)

## Diff stat

```
 .../src/components/LeadIntakeForm.astro           | 215 +++++++++++++++++++++
 .../src/components/LeadIntakeForm.test.cjs        |  79 +++++++++
 .../src/components/LeadMailtoForm.astro           | 207 ++++++++---------
 .../lead-intake-stage2-2026-07-23.md              | 105 +++++++++++++
 .../2026-07-23-lead-intake-stage2.md              |  80 ++++++++++
 5 files changed, 510 insertions(+), 176 deletions(-)
```

## Verification

- `node --test LeadIntakeForm.test.cjs`: 9/9 pass.
- `npm run verify:iterate`: all checks pass.
- esbuild parse: 2/2 files clean.
- astro check: 0 errors.

## Next steps

1. Push the branch to origin: `git -C /home/steve/.cache/mdg-lead-intake-stage2-20260723 push -u origin feat/lead-intake-stage2-2026-07-23`.
2. Open a PR with a self-review at the exact head.
3. Wait for the PR-branch CI run. If green and the self-review is PASS, merge.
4. After merge, the operator can follow the deploy playbook in `docs/audits/lead-intake-stage2-2026-07-23.md` to enable the new path on production.
5. The follow-up `mini-pc-ops` PR ships the Worker and the W13 webhook. Once those are deployed, the MDG form starts working server-side on any page that supplies an `endpoint` prop.
