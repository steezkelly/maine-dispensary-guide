# psmux + opencode-cli Quick Start

## What This Gives You

When running `opencode-cli` inside a psmux session, the oh-my-opencode-slim
plugin automatically spawns new terminal panes for:
- **Council sessions** — watch each councillor think in real-time
- **Background tasks** — see explorer, librarian, fixer working in parallel
- **Sub-agents** — monitor delegated work as it happens

## One-Time Setup

Already done:
- [x] psmux v3.3.2 installed via winget
- [x] `tmux` alias available (psmux provides this)
- [x] opencode-cli available at `C:\Users\Steve\AppData\Local\OpenCode\opencode-cli.exe`
- [x] Multiplexer config set to `"type": "tmux"` in oh-my-opencode-slim.json

## Daily Workflow

### Option A: psmux session (recommended for council/multi-agent work)

```powershell
# 1. Start a psmux session
psmux new-session -s maine

# 2. Inside psmux, launch opencode-cli
opencode-cli

# 3. Use @council or background tasks — panes spawn automatically!
#    Ctrl+B arrow keys to navigate between panes
#    Ctrl+B z to zoom/unzoom a pane
#    Ctrl+B x to close a pane

# 4. Detach when done (session persists)
#    Ctrl+B d

# 5. Reattach later
psmux attach -t maine
```

### Option B: OpenCode Desktop (no multiplexer)

Continue using Desktop as normal. Council and background tasks still work —
you just don't get the live pane view. Results come back in the same window.

### Key psmux Commands

| Action | Command |
|--------|---------|
| New session | `psmux new-session -s <name>` |
| List sessions | `psmux ls` |
| Attach | `psmux attach -t <name>` |
| Split horizontal | `Ctrl+B "` |
| Split vertical | `Ctrl+B %` |
| Navigate panes | `Ctrl+B Arrow` |
| Zoom pane | `Ctrl+B z` |
| Close pane | `Ctrl+B x` |
| Detach | `Ctrl+B d` |

### Layout Options (in oh-my-opencode-slim.json)

| Layout | Description |
|--------|-------------|
| `main-vertical` | Main session left (60%), agents stacked right |
| `main-horizontal` | Main session top (60%), agents stacked below |
| `tiled` | Equal-sized grid |
| `even-horizontal` | All panes side by side |
| `even-vertical` | All panes stacked vertically |

## Troubleshooting

- **Panes not spawning:** Make sure you're inside a psmux session (`$env:TMUX` should be set)
- **opencode-cli not found:** Add to PATH or use full path `C:\Users\Steve\AppData\Local\OpenCode\opencode-cli.exe`
- **Port conflict:** Use `--port 4096` flag when starting opencode-cli to match the default port