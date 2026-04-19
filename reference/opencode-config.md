# OpenCode Configuration — Maine Dispensary Guide

> Tooling configuration for oh-my-opencode-slim plugin and OpenCode environment.
> Last updated: 2026-04-14

## Architecture Notes

- **oh-my-opencode-slim** plugin v0.9.12 — 6-agent Pantheon active
- **opencode-cli** runs as sidecar server (logs at `%LOCALAPPDATA%\ai.opencode.desktop\logs\`)
- **Cache:** `%USERPROFILE%\.cache\opencode` — if models break, delete `models.json` and restart
- **Session data:** `%USERPROFILE%\.local\share\opencode\storage`
- **Config:** `~/.config/opencode/opencode.json` (agent descriptions, MCP servers)
- **Plugin config:** `~/.config/opencode/oh-my-opencode-slim.json` (presets, council, fallback, etc.)

## Council Configuration (Multi-Model Consensus)

Configured with 3 councillors (tested & working 2026-04-14):
- **alpha**: minimax-coding-plan/MiniMax-M2.7 ✅
- **beta**: opencode/big-pickle ✅
- **gamma**: opencode/nemotron-3-super-free ✅

Master: opencode/glm-5.1 for synthesis. Master fallback: opencode/big-pickle.

**Timeout:** councillors_timeout=300s, master_timeout=300s (5 min each)

**Fix history:** Free OpenCode Zen models returned `ProviderModelNotFoundError` with `suggestions: []`. Root cause was stale `~/.cache/opencode/models.json` — deleting it and restarting forced a fresh rebuild from the live API, which resolved all models. If models stop working again, delete the cache and restart.

## Foreground Fallback Chains (Rate Limit Protection)

Enabled. When a model hits rate limits or errors, automatically falls back to the next model in the chain:
- **Orchestrator/Oracle**: glm-5.1 → big-pickle → nemotron-3-super-free
- **Fixer**: MiniMax-M2.7 → big-pickle → nemotron-3-super-free
- **Explorer/Librarian/Designer**: glm-5.1 → nemotron-3-super-free

## Todo Continuation (Auto-Continue)

Enabled. When orchestrator stops with 3+ incomplete todos, auto-continues after 30s cooldown. Max 5 consecutive continuations per session.

## Other Plugin Features

- **Scoring Engine:** v2 (cost-aware model routing)
- **Background Tasks:** max 5 concurrent starts (conservative for Windows stability)
- **Multiplexer (psmux):** Configured with `main-vertical` layout, 60% main pane. Works with `opencode-cli` inside a psmux session — spawns live panes for council/background agents. Does NOT work with OpenCode Desktop (GUI). See `reference/psmux-quickstart.md` for setup.
- **Apply Patch Rescue:** Built-in, no config needed
- **Delegate-Task-Retry:** Built-in, no config needed
- **JSON Error Recovery:** Built-in, no config needed
- **Phase Reminder:** Built-in, no config needed

## Memory Awareness

- If opencode-cli exceeds 1GB RAM, something is wrong
- Run `scripts/diagnose-opencode.ps1` if you notice slowness
- Orphaned processes must be cleaned up

## Orphan Detection Checklist (Run at Session Start)

Check for hung processes:
```powershell
Get-Process | Where-Object { $_.Name -match "opencode|node" } | Select-Object Name, Id, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,0)}}
```

If opencode-cli >1GB or node processes from previous session exist, alert user.

## Diagnostic Script

Run when OpenCode seems stuck:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/diagnose-opencode.ps1
```

With auto-cleanup:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/diagnose-opencode.ps1 -AutoKill
```
