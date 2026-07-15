# MDG Agent Working Orders

> **Official operator-facing work index for agents and sessions.**
> It answers: what may start now, what is already owned, what is blocked, and
> where the evidence lives.
>
> **As of:** 2026-07-14
> **Reconciled base:** `origin/main` `d4dd9f68b12a0745a2f3c67c51e3e38f7171d3da`
> **Execution state:** `hermes kanban --board mdg-site list --json` is the
> durable task authority. This document is the navigable priority index, not a
> substitute for a task contract.

## First five minutes

```bash
cd /home/steve/repos/maine-dispensary-guide
git fetch origin --prune
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json
```

Then read `AGENTS.md`, `MDG_AGENT_HANDBOOK.md`, `project-todos.md`, and the
specific evidence record linked below. Never take a task merely because it is
listed here: create/refresh a scoped Kanban contract, run preflight, and honor
active leases.

## Current ownership — do not duplicate

| Workstream | Status | Owner / boundary | Next permitted action | Evidence |
|---|---|---|---|---|
| Refined Editorial Foundation | Active design/integration composition | `design/refined-editorial-foundation-20260713` | Preserve and isolate; only its integration owner composes overlapping shared pages/components. | `docs/governance/round-17-coordination-decision-memo-2026-07-14.md` |
| OCP public-data trust reconciliation | Patch candidate exists; source edits deferred | Integration owner after design composition | Revalidate official OCP sources, then apply one composed patch with regression coverage. Do not independently patch overlapping public surfaces. | `docs/audits/round-17-trust-data-reconciliation-2026-07-14.md` |
| Guide meta-description trim | Candidate branch exists | Candidate/integration review | Inspect `chore/guides-description-trim-2026-07-14` from a clean integration worktree; accept or reject as one bounded candidate. | Git branch and current worktree inventory |
| Guide title trim | Owner worktree has 18 uncommitted edits and is behind `origin/main` | Title-trim owner, then integration review | Do not touch the guide-title paths outside its worktree. Rebase on fresh `origin/main`, preserve its isolated scope, verify, then hand off one candidate. | `chore/guides-title-trim-2026-07-14` worktree |
| Homepage design-token cleanup | Candidate branch exists | Candidate/integration review | Review `refactor/homepage-design-tokens-2026-07-14` only in the composed design context. | Git branch and current worktree inventory |
| Repeated inline-CSS extraction | Owner worktree has uncommitted shared-style wiring and is behind `origin/main` | CSS-extraction owner | Complete and verify the three shared-style files plus barrel imports in the owner worktree; check cascade safety before committing. Do not merge partial shared assets. | `refactor/css-extract-top3-2026-07-14` worktree |

## Ready to specify after preflight

These are priority candidates, not pre-authorized edits. The Coordinator must
create a card using `docs/governance/templates/mdg-kanban-card-body.md` before
dispatch.

1. **SEO health and orphan remeasurement.** From a production-aligned checkout
   with build output, capture current content-health and internal-link evidence;
   distinguish live regressions from no-`dist/` worktree noise. If real defects
   remain, split remediation into scoped cards that do not collide with the
   design worktree.
2. **GA4 form-completion reporting.** Confirm the data window and current GA4
   event availability, then make a small per-form exploration/dashboard task.
   This is measurement work, not a claim of conversion lift.
3. **Hero-image variant guardrail.** Specify a small utility/test that prevents
   incomplete responsive hero-variant sets from publishing. Keep it independent
   of editorial/design composition.
4. **Town-cluster Stage 3.** Only begin as an editorial initiative with one
   source pack, one region-hub body, and one independent fact review at a time;
   do not mass-produce thin location pages.
5. **Franchise menu-data expansion.** Add one operator extraction round at a
   time, retain “unavailable, never invented” treatment for SPA-blocked menus,
   and defer comparison products until the documented three-snapshot threshold
   is met.

## Blocked / operator-owned work

| Item | Blocker owner | Evidence | Resume trigger |
|---|---|---|---|
| GSC scheduled measurement | Operator/system owner | Crontab entries and wrappers exist, but the host has no `cron.service`; logs stopped advancing. | A functioning scheduler is enabled and a fresh daily/weekly output is observed. |
| Partnership outreach follow-up | Operator | 2026-07-07 campaign was sent; reply/follow-up is human-led. | Operator supplies reply/next-contact direction or records an outcome. |
| Lead-magnet PDFs | Operator | The remaining scope is a product choice: fresh PDFs versus routing to existing assets. | Operator chooses Path A or Path B and names the target magnets. |
| Legacy theme/readability branch disposition | Operator/integration owner | Old branches may contain overlapping or already-landed work. | Fresh branch-reconciliation evidence identifies unique commits and a chosen disposition. |

## Intentionally not active

- Do not revive the retired static-site `/api/lead-capture` path without a new
  architecture decision. The canonical current lead route is documented in
  `docs/LEAD_CAPTURE_SETUP.md`.
- Do not collapse the annual-report and live OCP roster figures into one number.
  Round 17 defines the required source/date/definition reconciliation.
- Do not rewrite or rename the Hub, historical sprint files, sibling clones, or
  worktrees while the design-integration decision is open.
- Do not treat a candidate branch, an HTTP 200, or a worker self-report as a
  deployed release.

## Required task lifecycle

```text
draft → ready → in_progress → authored → verifying → accepted → integrating → released
```

- **Coordinator:** contract, priority, dependency, lease, and next-state owner.
- **Author:** only allowed paths; focused tests; no commit/push/main changes.
- **Verifier:** independent diff and acceptance review; explicit PASS/FAIL.
- **Integrator:** sole writer to `origin/main`; re-verifies composed candidate
  and records release proof.
- **Continuity watcher:** preserves blocked-handoff metadata and promotes ready
  non-conflicting work.

See `docs/governance/mdg-agent-orchestration-v1.md` for full authority and
`docs/README.md` for the complete record map.

## Update protocol

1. Change this file only after a reconciliation, an ownership change, or a
   priority decision.
2. Update the matching Kanban card first for an actionable task.
3. Update `project-todos.md` for the human-readable backlog and `PROJECT_STATE.md`
   for the high-level snapshot.
4. Append no Hub entry unless the current Hub owner explicitly makes that safe.
5. Preserve the dated audit/decision record that caused the change.
