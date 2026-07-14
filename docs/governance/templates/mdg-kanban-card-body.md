---
id: MDG-WORKFLOW-XXX
parent: MDG-WORKFLOW
role: codex-author
base_sha: <40-character-commit-sha>
branch: mdg/<card-id>-short-slug
worktree: /absolute/path/to/worktree
allowed_paths:
  - docs/governance/example.md
acceptance:
  - node scripts/git/tests/example.test.cjs
depends_on: []
lease_ttl_minutes: 60
stop_condition: "Acceptance evidence is durable or a blocked handoff is recorded."
---

# {{ id }} — {{ title }}

## Objective

State the bounded outcome, the reason for it, and the card's place in the
initiative topology (reconnaissance, implementation, verification, or
integration).

## Task contract

The YAML front matter is the contract of record. Keep its `base_sha`, `branch`,
`worktree`, `allowed_paths`, `acceptance`, dependencies, lease duration, and
stop condition current before work begins. Record source-card links here when a
fresh MDG card replaces an inventoried generic/default card.

## DO NOT

- Do not edit paths outside `allowed_paths`.
- Do not commit, push, stage, rebase, reset, alter `main`, or use `git add -A`.
- Do not create an integration child before an independent Verifier records
  PASS.
- Do not treat prose status, a worker self-report, or an unverified command as
  acceptance evidence.

## Author report

Write the author handoff report outside the repository at:

```text
/tmp/<worktree-name>-codex-report.md
```

The report must list changed paths and every command run with its exit code. It
must state whether the diff is unstaged and name any blocker or remaining work.

## Acceptance evidence

Record the focused commands, their outcomes, the independent Verifier identity,
and the explicit PASS/FAIL result. A FAIL returns the card to `needs_fix` with
the finding retained. Only a recorded PASS permits creation of the integration
child.

## Completion metadata

Update this JSON when authoring, verification, or integration reaches a durable
handoff. Keep `commands` exhaustive for the commands relied on as evidence; use
`null` for values that do not yet exist.

```json
{
  "status": "in_progress",
  "base_sha": "<40-character-commit-sha>",
  "branch": "mdg/<card-id>-short-slug",
  "worktree": "/absolute/path/to/worktree",
  "paths_changed": [],
  "commands": [
    {
      "command": "node scripts/git/tests/example.test.cjs",
      "exit": 0
    }
  ],
  "blocking_reason": null
}
```

## Blocked handoff

Use this section whenever `status` is `blocked`. Preserve the blocker record on
the card and set `completion metadata.blocking_reason` to the same concise
reason. The next owner may resume only after the observable trigger occurs.

```yaml
blocker:
  owner: "team or named role responsible for unblocking"
  evidence: "command output, link, or reproducible observation"
  next_action: "specific action required"
  resume_trigger: "observable event that makes the task ready"
```

## Handoff

Record the current state, next owner, exact diff location, author-report path,
verification evidence, and next action. Only the integration worktree may
update `origin/main`.
