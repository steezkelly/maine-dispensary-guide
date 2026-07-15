# Project State: Maine Dispensary Guide

> **2026-07-14 reconciliation:** This is the concise state-of-record snapshot.
> Current agent routing lives in `docs/governance/AGENT_WORKING_ORDERS.md`;
> execution state is the Hermes `mdg-site` Kanban board; dated findings remain
> in their evidence records. Do not treat this file as a chronological log.

## Current status

- **Product:** Maine-only Astro 6 site on Vercel, serving cannabis business and
  consumer resources.
- **Canonical checkout:** `/home/steve/repos/maine-dispensary-guide`.
  `/home/steve/projects/maine-dispensary-guide` is a separate older/dirty
  checkout and must not be used as the integration source of truth.
- **Deployment:** Vercel production is the release target. A candidate branch,
  local build, or provider “Ready” status alone is not proof of the intended
  production SHA.
- **Operating model:** bounded author → independent verifier → sole integrator;
  use named worktrees, scoped leases, and the `mdg-site` Kanban board.

## Technical stack

- Astro 6, plain HTML/CSS/JavaScript, Vercel adapter; no Tailwind or React.
- Visual system: Fraunces display + Plus Jakarta Sans body; warm bone/deep
  spruce Heritage Authority foundation.
- Lead capture: mailto/manual operator flow documented in
  `docs/LEAD_CAPTURE_SETUP.md`; the retired static `/api/lead-capture` endpoint
  is not an active production requirement.
- Measurement: GA4, GSC, Vercel Analytics/Speed Insights. GSC wrappers exist,
  but host scheduling is currently blocked pending a functioning cron service.

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

1. **Refined Editorial Foundation** is an active design/integration composition.
   Shared source and public-page edits remain preserve-and-isolate work until its
   owner chooses the composition base.
2. **OCP public-data trust reconciliation** has an evidence-backed patch
   manifest. The 2025 official annual report supports 180 retail stores, while
   the project’s 107/49 roster is a different dated live snapshot. Apply the
   correction only as a composed, tested integration patch.
3. **Existing SEO/design candidates** require independent fresh-base review one
   at a time before integration; do not merge for cleanup convenience.
4. **Active owner worktrees** include guide-title and shared-CSS work. Their
   paths are protected; inspect each worktree's current status and
   `origin/main` divergence immediately before acting rather than treating this
   snapshot as a live Git-status ledger.

## Prioritized next work

See `project-todos.md` for full ordering. In short:

1. Complete the active design composition and source-data reconciliation safely.
2. Re-measure SEO/content-health from a production-aligned build before creating
   remediation work.
3. Establish form-completion reporting after verifying the usable GA4 window.
4. Add an image-variant guardrail and progress regional hubs through controlled,
   source-backed editorial work.
5. Keep scheduler, partnership follow-up, and PDF scope decisions explicitly
   blocked until their named owner/event responds.

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
# Session preflight
cd /home/steve/repos/maine-dispensary-guide
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

*Last reconciled: 2026-07-14 against `origin/main` `d4dd9f68`.*
*Previous snapshot: 2026-07-13 ICA pilot closeout.*
