# Backlog — Deferred from SPRINT 2026-04-20

> Deferred from: Sprint retrospective 2026-04-20
> Next review: SPRINT 34 planning

| Priority | Item | Owner | Dependencies | Status |
|----------|------|-------|--------------|--------|
| P2 | Session tagging schema extension | — | OpenCode config, memory system | deferred |
| P2 | Background-task templates | — | pre-flight in place | deferred |
| P2 | Self-healing hook prototype | — | — | deferred |
| P2 | Autonomous content team pilot (city guide expansion, one city first) | — | content-authority skill | deferred |
| P2 | Council pattern codification ("council-then-delegate") | — | council_session config | deferred |

## Item Details

### Session tagging schema extension
Extend insights generator schema with `project`, `session_type`, `intent` fields. Retrofit last 14 days via heuristics. Enables better analytics on content vs. configuration work.

### Background-task templates
`/template save "content-research"` and `/template run` pattern. Depends on pre-flight being stable first — templates bake in current habits, so don't build until pre-flight catches common errors reliably.

### Self-healing hook prototype
Session-level observer that watches for repeated tool errors and triggers remediation. Prototype only. Wait until you know which errors *still* slip through after pre-flight is established.

### Autonomous content team pilot
Pilot with Brunswick (smallest remaining city guide), measure throughput vs manual, decide scale. Before automating a pipeline, fix the leaks (357 errors). Run one city manually first.

### Council pattern codification
Formalize "council-then-delegate" as a named workflow with a single entry prompt. After pre-flight is landed, not before.
