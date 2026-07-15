# Historical Root Documentation — 2026-07-14

These root-level documents were moved here during the bounded historical-doc
cleanup. Their original paths now contain short stubs so file-name lookup still
routes agents to the correct current records.

| Archived document | Why it moved | Current replacement |
|---|---|---|
| `HANDOVER_TO_HERMES.md` | May 12 Windows/OpenCode handover with obsolete route counts, tooling, deployment, and machine-transfer assumptions. | `AGENTS.md`, `docs/governance/AGENT_WORKING_ORDERS.md`, live Kanban, `PROJECT_STATE.md` |
| `PROJECT_DNA.md` | April strategy/continuity memo with superseded workflow and implementation assumptions. | Working Orders, `project-todos.md`, ADRs, governance records |
| `AGENT-USAGE-GUIDE.md` | OpenCode Desktop-specific agent guide. | `AGENTS.md`, handbook, orchestration protocol, Hermes Kanban |
| `UI_IMPROVEMENTS.md` | Closed Sprint 33 status log. | Working Orders and live Kanban for current UI work |

## Root duplicate normalized

`LEAD_CAPTURE_SETUP.md` was an identical root copy of
`docs/LEAD_CAPTURE_SETUP.md`. The root path is now a pointer; the document in
`docs/` is canonical.

## Preservation rules

- These files remain available as dated historical evidence.
- Do not use them as current instructions or task state.
- Do not restore legacy credentials, tool configuration, or machine-path advice
  from the handover.
- The collaboration Hub remains untouched; this cleanup does not rename,
  truncate, or rewrite historical logs.
