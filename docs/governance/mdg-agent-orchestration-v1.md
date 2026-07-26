# MDG Agent Orchestration Protocol v1

## Purpose and invariants

This protocol governs bounded, multi-agent changes to Maine Dispensary Guide.
Every task has a durable task card using the task-contract template, a fixed
base SHA, an explicit allowed-paths list, acceptance evidence, and an owner.
Task state is durable in the task/card system; prose status alone is not a
handoff.

Do not append to conflict-prone `BOT_COLLABORATION_HUB.md`. Do not hand-edit
generated `MISSION_CONTROL.md`; update the authoritative inputs and use its
generator when an update is required.

## Roles, authorities, and prohibitions

### Coordinator

The Coordinator creates and prioritizes task cards, assigns roles, records
dependencies and leases, and keeps state and resume triggers durable. The
Coordinator may reserve a worktree or lease, dispatch Codex, independently
verify, decompose work, and authorize the next state transition. The
Coordinator must not accept a worker self-report as evidence. The Coordinator
must not write another writer's leased paths, and may not bypass independent
verification or the Integrator's single-writer authority.
After Verifier PASS, the Coordinator creates the bounded candidate commit on the
author branch, records the candidate as accepted in Kanban, and transmits its
SHA to the Integrator for integration.

### Codex Author

A Codex Author may change only the task's allowed paths from the stated base.
The author produces an unstaged, scoped diff and runs the focused tests listed
on the card. The author never commits, pushes, alters `main`, rebases, resets,
uses `git add -A`, or expands scope. Do not use `git add -A`; authors leave
their diff unstaged for review.

### Codex Author launch procedure

Before launching an author, the Coordinator must have a validated contract,
completed the scoped preflight, created a fresh worktree, and acquired the
allowed-path lease. Then render the bounded author prompt at
`/tmp/mdg-task-{{id}}-prompt.txt` and launch it with:

```bash
codex --yolo exec "$(cat /tmp/mdg-task-{{id}}-prompt.txt)"
```

Run the author in a PTY or background process. Monitor its logs without typing
into the process unless the contract is amended; an amended contract requires a
new bounded prompt before further direction is sent.

### Verifier

The Verifier is independent of the Codex Author. The Verifier must read the
contract, inspect the actual diff, confirm it remains within allowed paths,
reproduce the contract tests, and record an explicit PASS/FAIL result. A
Verifier may accept a task or return it as `needs_fix`; the Verifier must not
author fixes, commit, or integrate. The Verifier must not waive acceptance
criteria. For each task, the Verifier follows
`docs/governance/templates/mdg-verifier-prompt.md` as the execution checklist
and records separate `SPEC COMPLIANCE` and `CODE QUALITY` verdicts.

### Integrator

The Integrator is the sole writer for integration. Only the integration worktree
may update `origin/main`; the Integrator must not use the primary checkout.
The Integrator must cherry-pick one accepted candidate, recheck base compatibility,
lease status, verification evidence, and scope, then run `npm run
verify:iterate` (smoke-free) and execute deploy verification on the
post-transport Vercel preview deployment — `npm run verify:post-deploy` with
`MDG_PREVIEW_URL` set. Pre-transport smoke against the currently-deployed
production site is forbidden by the 2026-07-20 governance change; see
`docs/governance/verifier-governance-migration-notes-2026-07-20.md`. The
Integrator must not merge unverified batch work. For release readiness, record
final SHA, Vercel deployment ID/URL, validation commands, and deferred work
metadata before release. No author, verifier, or coordinator may independently
write to `origin/main`.

**Canonical integrity gate (mandatory, fail-closed).** Before any merge or push
to `main`, the Integrator must run the single canonical integration command
`npm run ops:integrate -- --evidence <private-bound-evidence> --checks
<private-required-checks> --candidate <exact-candidate-sha> --expected-base
<exact-base-sha> --current-head <exact-remote-pr-head-sha>` (wrapper:
`scripts/operations/integration/cli.cjs`, OPS-06B-P1 Child 2). It composes the
verified-candidate integrity checks into one mechanically fail-closed gate and
exits nonzero before any merge when evidence is missing/unsafe, candidate/head/base
identity differs, the candidate tree differs, a required check is pending or
failing, or the worktree is dirty. Ordinary output is redacted; full reasons go
only to a validated Tier-0 `--detail-out` file. The Integrator must not push if
the gate exits nonzero. The local integration path is mechanically fail-closed
when this wrapper is used; GitHub-wide enforcement is not category B until the
OPS-06B-P1 Child-3 ruleset is operator-enabled (see ADR Amendment 5).

### Continuity Watcher

The Continuity Watcher monitors durable task/card state, dependency ownership,
and resume triggers. It flags stale leases and missing evidence, and ensures a
paused task is resumable by another operator. It may unblock work or create
next ready work, but must not claim an implementation task owned by another
worker. It may not change task scope, accept work, or integrate code.

## State machine

The exact happy-path transition is:

```text
draft → ready → in_progress → authored → verifying → accepted → integrating → released
```

`draft` is being specified; `ready` has a complete contract and no unresolved
dependency; `in_progress` is actively owned; `authored` has an unstaged scoped
diff plus the author's focused-test evidence; `verifying` is under independent
review; `accepted` has recorded verifier evidence; `integrating` is being
handled only by the Integrator; and `released` has durable release evidence.

Verification failure transitions the task to `needs_fix`. The Coordinator then
returns it to `in_progress` only with the verifier's finding retained on the
task card. An unmet dependency transitions the task to `blocked`; it may return
to `ready` only when its recorded resume trigger occurs.

Every `blocked` card must contain machine-readable blocker details:

```yaml
blocker:
  owner: "team or named role responsible for unblocking"
  evidence: "command output, link, or reproducible observation"
  next_action: "specific action required"
  resume_trigger: "observable event that makes the task ready"
```

## Verification and integration controls

Independence is mandatory: the author supplies focused-test evidence, while a
separate Verifier validates the diff and acceptance criteria. Acceptance is not
permission to write a branch or release; it is a prerequisite for the
Integrator's single-writer integration flow. The Integrator records the
integration and release evidence on the task card before marking `released`, and
must not write to `origin/main` until the candidate SHA is accepted by the
Coordinator after Verifier PASS.

## Continuity and non-idling

While a dependency runs, the supervisor must complete non-conflicting `ready`
work rather than idle. The supervisor may stop only after task/card state and
its resume trigger are durable. When work is `blocked`, the task card must name
the blocker owner, evidence, next action, and resume trigger so continuity does
not depend on one agent's memory.

### Deterministic continuity command

Use `npm run agents:continuity -- --board-state <json> [--json] [--now <iso>]`
to compute the next action from local board state, with no network calls or writes.
`<json>` may be either raw JSON text or a path to a `.json` file. The command
emits a stable object with:

  - `kind`: one of `dispatch`, `continue-reconnaissance`,
    `inactive-with-trigger`, `escalate-missing-trigger`, or `idle`.
  - `action`: alias of `kind` (kept for compatibility).
  - `taskId`: selected task for the action, if any.
  - `details`: deterministic rationale and trigger metadata.

Use this policy:

- `dispatch` when one or more tasks are `ready`, dependency-cleared, and not
  colliding with active in-progress lease paths.
- `continue-reconnaissance` when authors are running but no dispatchable task is
  available.
- `inactive-with-trigger` when every remaining candidate is blocked and all
  blocker handoff metadata is complete.
- `escalate-missing-trigger` and exit non-zero if any blocked task is missing
  `blocking_reason`, `blocked_by`, `next_action`, or `nextCheckAt`.

## MDG Kanban operating procedure

The MDG Kanban board is `mdg-site`. Board selection has been observed not to
persist between Hermes CLI invocations, so every board operation must name the
board explicitly. Use commands in this form:

```bash
hermes kanban --board mdg-site <operation> ...
```

Do not rely on a previously selected board, an implicit default, or a shell
alias for card creation, inspection, assignment, state changes, comments, or
archival.

The existing MDG project slug is `mdg`. Bind that project to the board with:

```bash
hermes project bind-board mdg mdg-site
```

Do not create a duplicate project to obtain a board binding. On a fresh Hermes
installation, first inspect the existing boards with this read-only command and
check whether a board whose slug is `mdg-site` is present:

```bash
hermes kanban boards list --json
```

Only if that board is absent, create it with:

```bash
hermes kanban boards create mdg-site --name "MDG Site" --description "Maine Dispensary Guide delivery board" --default-workdir /home/steve/repos/maine-dispensary-guide
```

Then bind the existing project to the existing or newly created board:

```bash
hermes project bind-board mdg mdg-site
```

Do not repeat `hermes kanban boards create` when `mdg-site` already exists;
retain that board and continue with the binding rather than creating a second
board or project.

### Card migration and inventory

Before changing existing cards, inventory the source board and record each
candidate's ID, title, owner, state, parent/dependency links, and evidence.
Never bulk-migrate generic or default cards. For every inventoried candidate,
either archive it with a durable reason or create a fresh MDG card that links
back to the source card and records why the replacement is needed. Preserve the
source evidence until the new MDG card is durable.

### Initiative topology and release gate

An initiative is the parent card for one outcome. Its children follow this
topology:

```text
initiative
├── reconnaissance
├── implementation
├── verification
└── integration  (created only after verifier PASS)
```

Reconnaissance establishes the bounded contract and dependencies before an
implementation author begins. Implementation cards carry the author role and
the allowed-path lease. Verification is independently owned by a Verifier and
records an explicit PASS or FAIL against the contract. Do not create an
integration child merely because implementation is authored or verification is
in progress: the Coordinator creates the integration child only after the
Verifier records PASS. The integration child then follows the Integrator's
single-writer authority and existing `accepted → integrating → released`
controls above.

Every MDG card uses the canonical body at
`docs/governance/templates/mdg-kanban-card-body.md`. The task-contract YAML,
author report path, completion metadata, and blocked-handoff data on that card
are the durable operating record for this procedure.
