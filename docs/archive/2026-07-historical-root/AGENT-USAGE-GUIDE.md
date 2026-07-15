# Agent Usage Guide

Quick reference for using the oh-my-opencode-slim agent system in OpenCode Desktop.

---

## Switching Agents

| Method | Use Case |
|--------|----------|
| **Tab key** | Cycle through primary agents (Build ↔ Plan ↔ Orchestrator) |
| **`@agent-name`** | Call a specific subagent inline (oracle, librarian, explorer, designer, fixer, council) |
| **`task(subagent_type:)`** | Spawn a background agent for multi-step work |

---

## Primary Agents

### Orchestrator (Default for New Sessions)
**When to use:** New projects, complex multi-step tasks, unfamiliar territory.

The Orchestrator plans, delegates to specialists, and coordinates execution. It's your "project manager" agent.

```
You: I need to build a authentication system
→ Press Tab until "Orchestrator" appears, or start with @orchestrator
```

### Build
**When to use:** Straightforward implementation, single-file changes, code you understand.

Standard code-writing mode. No planning overhead.

### Plan
**When to use:** Exploring options, scoping large features, decision-making before coding.

Breaks down requirements into steps without executing.

---

## Subagents

Call them inline with `@agent-name` or spawn them via `task()`.

| Agent | Role | When to Call |
|-------|------|-------------|
| **@oracle** | Strategic advisor, code reviewer, complex debugging | Architecture decisions, problems persisting after 2+ fixes, security concerns, simplification |
| **@librarian** | External docs & API research | Unfamiliar libraries, version-specific behavior, complex APIs (React, Next.js, ORMs, auth) |
| **@explorer** | Fast codebase search | Finding files, locating patterns, answering "where is X?" |
| **@designer** | UI/UX polish | User-facing interfaces, responsive layouts, visual consistency |
| **@fixer** | Fast bounded implementation | Well-defined tasks, test updates, repetitive edits across files |

---

## Delegation Decision Framework

```
Is it a complex, multi-step task?
├── YES → Use @orchestrator (or Tab to Orchestrator)
└── NO → Implement directly, or delegate to specialist:

Is it about FINDING things in the codebase?
└── YES → @explorer (fast, 3x faster than orchestrator)

Is it about UNDERSTANDING a library/API?
└── YES → @librarian (better than orchestrator at docs)

Is it a MAJOR decision / persistent problem / code review?
└── YES → @oracle (5x better decision maker)

Is it a USER-FACING interface needing polish?
└── YES → @designer (10x better UI/UX)

Is it a well-defined, bounded task?
└── YES → @fixer (2x faster, half cost)

Is it CRITICAL and HIGH-STAKES?
└── YES → @council (3-model consensus, slower but 3x confidence)
```

---

## Council (Multi-Model Consensus)

Configured with 3 models: MiniMax-M2.7 (alpha), Big Pickle (beta), Nemotron 3 (gamma).

**When to use Council:**
- Critical architectural decisions
- High-stakes choices where consensus reduces risk
- Ambiguous problems where multi-model disagreement is informative
- Security-sensitive design reviews

**When NOT to use:**
- Speed matters more than confidence
- Straightforward tasks you're already confident about
- Routine implementation work

**How to invoke:**
```
@council
Explain the architectural decision you need to make. Include pros/cons if you have them.
```

---

## Quick Examples

### Simple change (no delegation)
```
You: Add error handling to my validateEmail function
→ Just write the code in Build/Orchestrator
```

### Library research
```
You: How does Next.js 14 App Router handle middleware redirects?
→ @librarian can fetch official docs and examples
```

### Complex debugging
```
You: I've tried 3 times to fix this race condition but it keeps reappearing
→ @oracle for strategic debugging advice
```

### Multi-file refactor
```
You: Rename getUser() to fetchUser() across all 12 service files
→ Spawn @fixer with task(subagent_type: fixer) for fast bounded execution
```

### High-stakes decision
```
You: Should we switch from REST to GraphQL? We have 40 microservices.
→ @council for multi-model consensus on this architectural choice
```

---

## Skills vs Agents

Skills are optional enhancements, not required for the 6-agent system to work.

| Skill | Purpose | Required? |
|-------|---------|-----------|
| **self-improving** | Learns from corrections via tiered memory | Recommended |
| **accessibility-compliance** | WCAG 2.2 patterns | If building accessible UIs |
| **frontend-design** | Distinctive UI generation | If doing heavy UI work |
| **content-authority / content-humanizer / content-ops** | SEO/GEO content optimization | If managing content pages |

---

## Config Files

- `~/.config/opencode/opencode.json` — Agent descriptions, safety rules, MCP servers
- `~/.config/opencode/oh-my-opencode-slim.json` — MiniMax variants per agent, Council config

---

*Last updated: Apr 14, 2026*