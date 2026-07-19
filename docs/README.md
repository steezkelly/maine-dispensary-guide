# MDG Documentation Map

> Start here when you need to find a record. This index organizes the
> documentation surface; it does not replace evidence in the canonical source.
>
> **Checkout rule:** use a checkout freshly synchronized with current
> `origin/main`; no absolute local path is permanent authority.
> **Current working orders:** `docs/governance/AGENT_WORKING_ORDERS.md`
> **Last reconciled:** 2026-07-19 against `origin/main`; inspect live Git and
> Kanban state before dispatch or integration.

## Read order for agents

1. `AGENTS.md` — repository rules, worktree protocol, commands, and verification.
2. `MDG_AGENT_HANDBOOK.md` — short orientation and known footguns.
3. `docs/governance/AGENT_WORKING_ORDERS.md` — current priorities, ownership, and dispatch rules.
4. `project-todos.md` — curated human-readable backlog.
5. `hermes kanban --board mdg-site list --json` — durable task/card state before claiming work.
6. `PROJECT_STATE.md` — current project snapshot and source-of-record pointers.

## State-of-record hierarchy

| Need | Canonical location | Write rule |
|---|---|---|
| Current task ownership, dependencies, and release state | Hermes board `mdg-site` | Every actionable engineering task needs a card/contract; prose alone is not a handoff. |
| Current priorities and operator blocks | `project-todos.md` + working orders | Update after reconciliation; do not turn it into a chronological log. |
| Current project snapshot | `PROJECT_STATE.md` | Curated and short; point to evidence rather than duplicating it. |
| Chronological shipped-work evidence | `BOT_COLLABORATION_HUB.md` | Historical log. Do not use it as live task authority. |
| Architecture or durable policy decisions | `docs/adr/` and `docs/governance/` | Add a dated decision record; do not rewrite history. |
| Audit evidence and patch manifests | `docs/audits/`, `docs/analytics/`, `docs/recovery/` | Date and scope every finding; distinguish observed from proposed. |
| Session handoff | `docs/SESSION_PASSDOWN*.md` | Use only for in-flight/resume context; supersede rather than silently edit. |
| Ephemeral local issues / PRDs | `.scratch/<feature>/` | Ignored operational state; never present it as git-backed source of truth. |
| Cross-session facts | Mnemosyne | Store discrete durable facts, not project-state blobs. |
| Generated health snapshot | `MISSION_CONTROL.md`, `/status.json` | Do not hand-edit; regenerate from authoritative inputs/build. |

## Documentation areas

| Directory / file | Purpose | Status rule |
|---|---|---|
| `docs/governance/` | Agent protocol, role authority, Kanban templates, coordination decisions | Current operating policy. |
| `docs/adr/` | Accepted architectural decisions | Immutable decision history. |
| `docs/audits/` | Dated observed findings and remediation manifests | Evidence; may be superseded, never silently treated as live state. |
| `docs/analytics/` | GA4/GSC/ICA evidence and implementation status | Current only when date and evidence are explicit. |
| `docs/recovery/` | Worktree/branch recovery inventories | Use during reconciliation; preserve until dispositions are complete. |
| `docs/session-handoff-tokens/` | Focused handoff prompts | Resume aids, not authority for current priorities. |
| `docs/superpowers/specs/2026-07-17-mdg-refined-editorial-ica-completion.md` | Refined Editorial Foundation + ICA contract and release record | PR #91 merged as `c6d3d454`; production evidence and the release tag resolve to `44c67423`; the separate control-size audit resolves to `3e42aed7`. Current `main` remains implementation authority. The released record supersedes the former `docs/governance/AGENT_WORKING_ORDERS.md` active-composition row and conflicting design/typography/branch passages in the 2026-07-14 `PROJECT_STATE.md` snapshot. |
| `docs/superpowers/specs/` | Scoped specifications and policy research | Use when executing its named workstream. |
| `docs/archive/` | Historical copies and moved documents | Read only for provenance. Root `# Moved` files intentionally preserve old lookup paths. |
| `docs/research/`, `docs/plans/`, `docs/memos/` | Supporting research, plans, and operator decisions | Inputs; validate date/source before acting. |

The temporary routing override used before this reconciliation stated: For the Refined Editorial/ICA completion workstream, this dated authority supersedes `docs/governance/AGENT_WORKING_ORDERS.md` line 32 and conflicting design/typography/branch passages in `PROJECT_STATE.md` until those records are separately reconciled. The 2026-07-19 reconciliation satisfies that expiry; use the current rows above rather than reviving the temporary override.

## Rules that keep records tidy

- Do not create a second task list. The board owns execution state; `project-todos.md` owns the human-readable priority queue.
- Do not hand-edit generated files or duplicate Hub entries into new logs.
- Do not delete/rename old clones, worktrees, Hub history, or archived docs as “cleanup” without an operator-approved integration/recovery decision.
- New documents use a dated path in the most specific directory. Link them from the working orders only when they change active work.
- A `blocked` task must name owner, evidence, next action, and an observable resume trigger.
- Before editing source or shared records: inspect the board, `npm run workflow:status:fetch`, active worktree leases, and overlapping branch paths.

## Maintenance cadence

- **At session start:** read the six-item agent read order above.
- **Before dispatch:** create or update the card/contract and run scoped preflight.
- **At release:** record verifier/integration evidence on the card; write discrete Mnemosyne facts only for durable decisions or surprises.
- **After a reconciliation round:** refresh `project-todos.md`, `PROJECT_STATE.md`, and this map only if their pointers or current priorities changed.
