# Project State: Maine Dispensary Guide

> **2026-07-19 reconciliation:** Refined Editorial Foundation + ICA completion
> is released; current agent routing lives in
> `docs/governance/AGENT_WORKING_ORDERS.md`; execution state is the Hermes
> `mdg-site` Kanban board. Dated findings remain in their evidence records and
> are not automatically current.

## Current status

- **Product:** Maine-only Astro 6 site on Vercel, serving cannabis business and
  consumer resources.
- **Checkout authority:** use a checkout freshly synchronized with current
  `origin/main`. An absolute local directory is not a durable source of truth.
- **Deployment:** Vercel production is the release target. A candidate branch,
  local build, or provider “Ready” status alone is not proof of the intended
  production SHA.
- **Operating model:** bounded author → independent verifier → sole integrator;
  use named worktrees, scoped leases, and the `mdg-site` Kanban board.

## Technical stack

- Astro 6, plain HTML/CSS/JavaScript, Vercel adapter; no Tailwind or React.
- Refined Editorial visual system: Newsreader display/editorial type + Source
  Sans 3 body/navigation type, semantic color tokens, warm paper/Deep Spruce
  palette, restrained containment, and 44px interactive controls.
- Lead capture: mailto/manual operator flow documented in
  `docs/LEAD_CAPTURE_SETUP.md`; the retired static `/api/lead-capture` endpoint
  is not an active production requirement.
- Measurement: GA4, GSC, Vercel Analytics/Speed Insights. GSC wrappers exist,
  but host scheduling is currently blocked pending a functioning cron service.

## Released Refined Editorial + ICA scope

- PR #91 merged to `main` as `c6d3d454`.
- Production verification is recorded at `44c67423`; the annotated
  `release/2026-07-18-refined-editorial-ica-completion` tag resolves there.
- The project-wide 44px control audit is recorded at `3e42aed7` under
  `release/2026-07-18-control-size-audit`.
- The release covers the shared foundation, canonical homepage, Portland and
  the bounded proof surfaces, and the existing ten-route ICA release-1
  behavior. It does not authorize broad page-local template migration.

## Source-of-record map

| Concern | Source |
|---|---|
| Agent rules and verify/worktree protocol | `AGENTS.md` |
| Fast orientation | `MDG_AGENT_HANDBOOK.md` |
| Current agent priorities / ownership | `docs/governance/AGENT_WORKING_ORDERS.md` |
| Durable task status | `hermes kanban --board mdg-site list --json` |
| Human-readable backlog | `project-todos.md` |
| Chronological record of shipped work | `BOT_COLLABORATION_HUB.md` |
| Architecture/coordination decisions | `docs/adr/`, `docs/governance/` |
| Generated health status | `MISSION_CONTROL.md`, `/status.json` |
| Documentation directory map | `docs/README.md` |

## Current integration boundaries

1. **OCP public-data trust reconciliation remains open.** Fresh-source
   revalidation must precede a separately scoped implementation. Preserve the
   OCP 2025 annual-report retail count of `180` as a different snapshot and
   definition from the dated operational roster of `107` stores across `49`
   municipalities.
2. **Broader template migration remains operator-gated.** The historical card
   records a coordination collision, and its named branch/worktree are absent.
   Resume only after an explicit operator go/no-go and fresh worktree contract.
3. **Existing SEO/design candidates require independent fresh-base review one
   at a time before integration.** Do not merge for cleanup convenience.
4. **Recovery cards protect stale ownerless work.** Inspect live card, worktree,
   lease, and `origin/main` state immediately before any recovery action.

## Prioritized next work

See `project-todos.md` for full ordering. In short:

1. Revalidate OCP primary sources, then scope the residual trust correction.
2. Re-measure SEO/content-health from a production-aligned build before creating
   remediation work.
3. Establish form-completion reporting after verifying the usable GA4 window.
4. Progress regional hubs through controlled, source-backed editorial work.
5. Keep broader template migration, scheduler, partnership follow-up, and PDF
   scope decisions explicitly blocked until their named owner/event responds.

## Evidence rules

- Historical documents preserve what was known at their date; they are not
  automatically current.
- Record source, definition, and as-of date for every public metric. Never
  collapse annual-report, live roster, and editorial snapshot values.
- Do not hand-edit generated `MISSION_CONTROL.md` or use the Hub as a live task
  board.
- Store task ownership/dependencies in Kanban and discrete durable facts in
  Mnemosyne; do not create competing state ledgers.

## Commands

```bash
# Session preflight — run from a freshly synchronized checkout
git fetch origin --prune
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json

# Candidate verification
npm run verify:iterate
npm run verify:push

# Health measurement (requires a checkout with valid build output)
node apps/maine-cannabis/scripts/admin/sprint-score.cjs --dry-run
```

---

*Last reconciled: 2026-07-19 against current `origin/main`; inspect live Git
state before dispatch or integration.*
*Previous snapshot: 2026-07-14 control-plane reconciliation.*
