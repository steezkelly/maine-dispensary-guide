---
id: MDG-WORKFLOW-001
parent: MDG-WORKFLOW
role: codex-author
base_sha: ae1cf4518acfd86c1ba2931dc5ca46e122d0c1f6
branch: docs/mdg-agent-orchestration-2026-07-14
worktree: /tmp/mdg-agent-orchestration-20260714
allowed_paths:
  - docs/governance/example.md
acceptance:
  - node scripts/git/tests/example.test.cjs
depends_on: []
lease_ttl_minutes: 60
stop_condition: "Acceptance evidence is durable or a blocked handoff is recorded."
---

# Task contract: {{ id }}

## Objective

State the bounded outcome and why it is needed.

## Scope

List the permitted paths, exclusions, base SHA, lease owner, and focused test
commands. Codex Authors may produce only an unstaged scoped diff in these
paths; they do not commit, push, alter `main`, rebase, reset, use `git add -A`,
or expand scope.

## Acceptance evidence

Record the exact focused commands, outcomes, verifier identity, and any release
evidence required by the card.

## Handoff

Record current state, next owner, diff location, verification evidence, and the
next action. Only the integration worktree may update `origin/main`.

## Blocked handoff

Use this section whenever state is `blocked` and keep these keys machine-readable:

```yaml
blocker:
  owner: ""
  evidence: ""
  next_action: ""
  resume_trigger: ""
```
