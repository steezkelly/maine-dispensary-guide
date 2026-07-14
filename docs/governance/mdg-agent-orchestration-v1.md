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

### Codex Author

A Codex Author may change only the task's allowed paths from the stated base.
The author produces an unstaged, scoped diff and runs the focused tests listed
on the card. The author never commits, pushes, alters `main`, rebases, resets,
uses `git add -A`, or expands scope. Do not use `git add -A`; authors leave
their diff unstaged for review.

### Verifier

The Verifier is independent of the Codex Author. The Verifier must read the
contract, inspect the actual diff, confirm it remains within allowed paths,
reproduce the contract tests, and record an explicit PASS/FAIL result. A
Verifier may accept a task or return it as `needs_fix`; the Verifier must not
author fixes, commit, or integrate. The Verifier must not waive acceptance
criteria.

### Integrator

The Integrator is the sole writer for integration. Only the integration worktree
may update `origin/main`; the Integrator must not use the primary checkout. The
Integrator must cherry-pick one accepted candidate, recheck base compatibility,
lease status, verification evidence, and scope, then run `npm run
verify:iterate`, `npm run verify:push`, and deploy verification. The Integrator
must not merge unverified batch work. No author, verifier, or coordinator may
independently write to `origin/main`.

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
integration and release evidence on the task card before marking `released`.

## Continuity and non-idling

While a dependency runs, the supervisor must complete non-conflicting `ready`
work rather than idle. The supervisor may stop only after task/card state and
its resume trigger are durable. When work is `blocked`, the task card must name
the blocker owner, evidence, next action, and resume trigger so continuity does
not depend on one agent's memory.
