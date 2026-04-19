# Workflows — Maine Dispensary Guide

> Operational procedures for this Windows-based development environment.

## Pre-Flight Validation (Windows / Complex Operations)

Before implementing features that use file operations, browser automation, or shell commands:

1. Verify tool availability: run `--version` or `--help` for the primary tool
2. Test a minimal operation in a temp location (touch a test file, navigate to a test URL)
3. Confirm the target directory exists and is writable
4. Check for Windows-incompatible patterns: `f.split('/').pop()` → use `path.basename()` instead

This prevents cascading failures in long sessions. **183 command failures in a recent 14-day period** were concentrated in the most ambitious sessions — most were path/permission issues caught late.

## End-of-Sprint Checklist

At the end of every sprint, run before declaring the session done:

1. `git status` — confirm all changes committed
2. Compare `BOT_COLLABORATION_HUB.md` latest entry against `project-todos.md` — catch completed items still marked pending
3. `npm run build` — confirm production build succeeds
4. `npx vercel --prod --yes` — confirm deploy completed cleanly

Commit and push any stragglers. This check has caught desync issues where `project-todos.md` still had items marked pending even after they'd been completed in a prior session.

## Windows-Specific Patterns

When working in this Windows environment:

1. **Use `workdir` parameter** instead of `cd && command` chains in bash calls
2. **WSL available** — for Unix-only utilities (tail, grep, etc.), use `wsl bash -c "command"` instead of PowerShell equivalents
   - Example: `wsl bash -c "tail -20 file.txt"` instead of `Get-Content file.txt | Select-Object -Last 20`
3. **Use `path.basename()`** for cross-platform path splitting — `f.split('/').pop()` fails on Windows `\`
4. **Git CRLF warnings** — commit anyway unless the file is binary; `LF will be replaced by CRLF` is a warning, not an error
5. **WSL paths** — when using `wsl bash -c`, use Linux-style paths (e.g., `/mnt/c/Users/Steve/...` or relative paths from wsl's cwd)

For comprehensive PowerShell patterns and Unix→PowerShell reference, see `reference/environment.md`.

## Todo Checkpoint Workflow (Multi-Hour Sessions)

For sessions expected to exceed 30 minutes, use explicit phase checkpoints:

```
TODOs:
[ ] Phase 1: Understand project structure
[ ] Phase 2: Implement feature
[ ] Phase 3: Verify and test
[ ] Phase 4: Document changes
```
