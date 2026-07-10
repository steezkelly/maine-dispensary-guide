# Triage Labels

The engineering skills speak in terms of five canonical triage roles.
This file maps those roles to the strings actually used in this repo's
local-markdown issue tracker.

| Canonical role      | `Status:` value         | Meaning                                       |
| ------------------- | ----------------------- | --------------------------------------------- |
| `needs-triage`      | `needs-triage`          | Maintainer needs to evaluate this issue       |
| `needs-info`        | `needs-info`            | Waiting on reporter for more information      |
| `ready-for-agent`   | `ready-for-agent`       | Fully specified, ready for an AFK agent       |
| `ready-for-human`   | `ready-for-human`       | Requires human implementation                 |
| `wontfix`           | `wontfix`               | Will not be actioned                          |

## Recording state

On every issue file at `.scratch/<feature>/issues/NN-slug.md`, place a
single `Status:` line near the top of the file. The `triage` skill moves
state by editing that line, not by moving files between directories.

## Wayfinding status (different vocabulary, same file)

When `/wayfinding` is running an investigation under
`.scratch/<effort>/issues/`, the `Status:` line carries a different
vocabulary from the table above:

- `claimed` — an agent has picked it up
- `resolved` — the answer has been written

A ticket is in **frontier** state when it is open, unblocked, and
unclaimed. See `docs/agents/issue-tracker.md` for the full wayfinding
mechanics.
