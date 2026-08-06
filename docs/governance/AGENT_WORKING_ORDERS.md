# MDG Agent Working Orders

> **Official operator-facing work index for agents and sessions.**
> It answers: what may start now, what is already owned, what is blocked, and
> where the evidence lives.
>
> **As of:** 2026-07-19
> **Reconciled:** 2026-07-19 against current `origin/main`. Inspect live Git
> state before dispatch; this document is not a commit-status ledger.
> **Execution state:** `hermes kanban --board mdg-site list --json` is the
> durable task authority. This document is the navigable priority index, not a
> substitute for a task contract.

## First five minutes

```bash
: "${MDG_REPO_ROOT:?Set MDG_REPO_ROOT to the Maine Dispensary Guide checkout path}"
cd "$MDG_REPO_ROOT"
git fetch origin --prune
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json
```

Then read `AGENTS.md`, `MDG_AGENT_HANDBOOK.md`, `project-todos.md`, and the
specific evidence record linked below. Never take a task merely because it is
listed here: create/refresh a scoped Kanban contract, run preflight, and honor
active leases.

## Live n8n state safeguard

Before any workflow activation, deactivation, deletion, or restore, record the
intent in the private host ledger and check the workflow before acting:

```bash
node scripts/operations/live-state-ledger.cjs record --workflow W14 --action activate --actor operator --reason "lead-email testing" --source n8n-cli
node scripts/operations/live-state-ledger.cjs check --workflow W14
```

The ledger is external to Git by design (`~/.hermes/data/mdg-ops/live-state-ledger.jsonl`
by default). If `check` has no recent entry, it exits non-zero: do not infer
that the observed state is rogue or restore a prior state. STOP, obtain the
operator's intent, and record it before a later workflow mutation.

## Current ownership — do not duplicate

| Workstream | Status | Owner / boundary | Next permitted action | Evidence |
|---|---|---|---|---|
| Refined Editorial Foundation + ICA completion | Released; supersedes the prior Active design/integration composition state on `design/refined-editorial-foundation-20260713` | Closed completion card `t_cfe4f925`; current `main` is implementation authority | Preserve the released contract. Treat later template migration as a separate operator-gated workstream. | PR #91 merge `c6d3d454`; production evidence/tag target `44c67423`; control-size audit target `3e42aed7` |
| OCP public-data trust reconciliation | Ready for a separately scoped implementation after fresh-source revalidation | Card `t_6541e171`; YMYL/public-data boundary | Revalidate the official annual report and current roster sources, then create a fresh-base source contract. Keep annual-report `180` arithmetic distinct from the dated operational `107/49` roster. | `docs/audits/round-17-trust-data-reconciliation-2026-07-14.md` |
| Broader template migration | Blocked on operator go/no-go | Card `t_5b8b3a86`; no current branch or worktree is authoritative | Preserve the historical collision evidence. Resume only after explicit operator approval and creation of a fresh-base contract, branch, worktree, and lease. | Live Kanban card `t_5b8b3a86` |
| Guide meta-description trim | Candidate branch requires fresh inspection | Candidate/integration review | Inspect `chore/guides-description-trim-2026-07-14` from a clean integration worktree; accept or reject as one bounded candidate. | Live Git and Kanban inventory |
| Guide title trim | Recovery-controlled candidate | Title-trim recovery owner | Inspect the live recovery card and current `origin/main` before deciding whether to recreate a bounded candidate. Do not reuse stale paths for unrelated work. | Live Kanban recovery card and Git inventory |
| Repeated inline-CSS extraction | Recovery-controlled candidate | CSS-extraction recovery owner | Preserve ownerless worktree evidence; resume only through a fresh scoped recovery contract and cascade review. | Live Kanban recovery card and Git inventory |

## Ready to specify after preflight

These are priority candidates, not pre-authorized edits. The Coordinator must
create or refresh a card using `docs/governance/templates/mdg-kanban-card-body.md`
before dispatch.

1. **OCP public-data trust reconciliation.** Freshly revalidate the OCP 2025
   annual-report tuple and the dated operational roster. If evidence still
   supports the Round 17 manifest, create one bounded YMYL implementation task
   for the confirmed data, arithmetic, snapshot-label, and refresh-script defects.
2. **SEO health and orphan remeasurement.** From a production-aligned checkout
   with build output, capture current content-health and internal-link evidence;
   distinguish live regressions from no-`dist/` worktree noise. If real defects
   remain, split remediation into scoped cards.
3. **GA4 form-completion reporting.** Confirm the data window and current GA4
   event availability, then make a small per-form exploration/dashboard task.
   This is measurement work, not a claim of conversion lift.
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
| Broader template migration | Operator | Card `t_5b8b3a86`; the recorded branch/worktree are absent and the prior run ended with a coordination collision | Explicit operator go/no-go followed by a fresh-base contract, branch, worktree, lease, and representative visual gate |
| Legacy host-cron GSC daily/weekly measurement | Operator/system owner | Crontab entries and wrappers exist, but the host has no `cron.service`; those logs stopped advancing. This does not cover the separate Hermes scheduler, which had a fresh successful `agent-harvest` run at 2026-07-21 21:30 ET and owns one-shot hub-cross-link measurement job `79d4f81fae8f`. | A functioning host scheduler is enabled and a fresh daily/weekly output is observed. |
| Partnership outreach follow-up | Operator | 2026-07-07 campaign was sent; reply/follow-up is human-led. | Operator supplies reply/next-contact direction or records an outcome. |
| Lead-magnet PDFs | Operator | The remaining scope is a product choice: fresh PDFs versus routing to existing assets. | Operator chooses Path A or Path B and names the target magnets. |
| Legacy theme/readability branch disposition | Operator/integration owner | Old branches may contain overlapping or already-landed work. | Fresh branch-reconciliation evidence identifies unique commits and a chosen disposition. |

## Intentionally not active

- Do not revive the retired static-site `/api/lead-capture` path without a new
  architecture decision. The canonical current lead route is documented in
  `docs/LEAD_CAPTURE_SETUP.md`.
- Do not collapse the OCP 2025 annual-report retail count (`180`) and the dated
  operational roster (`107` stores across `49` municipalities) into one number.
  Round 17 defines the required source/date/definition reconciliation.
- Do not rewrite or rename the Hub, historical sprint files, sibling clones, or
  worktrees as part of the OCP or broader-template tasks.
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
