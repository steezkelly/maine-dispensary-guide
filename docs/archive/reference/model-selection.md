# Model Selection Strategy

Based on 14-day usage data (2026-04-09 to 2026-04-21). Revisit quarterly.

## Primary Roles

| Role                  | Model            | Rationale                                    |
|-----------------------|------------------|----------------------------------------------|
| Orchestrator (default)| MiniMax-M2.7     | 2,827 uses; proven on long-horizon sessions  |
| Council synthesis     | qwen3.6-plus     | 757 uses; fast, balanced in multi-model vote |
| Complex reasoning     | glm-5.1          | 280 uses; use for architecture / tradeoff    |
| Build / implementation| MiniMax-M2.7     | Same context reuse as orchestrator           |

## Council Composition (when to invoke)

Only spawn @council for decisions that are (a) reversible at high cost
or (b) have ≥ 2 credible options with real tradeoffs. Examples: schema
changes, content strategy pivots, model-policy updates.

Default Council roster:
- Alpha: qwen3.6-plus (synthesizer)
- Beta: glm-5.1 (skeptic / tradeoff-surfacer)
- Gamma: MiniMax-M2.7 (pragmatist / implementation-lens)

## Fallback / Free-Tier Models

`big-pickle`, `nemotron-3-super-free`, `gpt-5-nano`, `gemini-3-flash`
are permitted ONLY as:
- Council delta/epsilon (fourth+ opinion, non-binding)
- Dev/smoke tests
- When rate-limited on primary models

Observed: these models frequently return zero assistant messages in
Council roles. Do not rely on them for any decision-critical path.

## Non-Goals

- Do not run model-comparison experiments ad-hoc mid-session. If
  comparison is needed, open a dedicated session with explicit
  hypothesis and success metric.
- Do not switch orchestrator model mid-sprint. Lock at session start.
