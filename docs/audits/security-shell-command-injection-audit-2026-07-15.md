# Shell-command injection audit — verifier and operator scripts

**Date:** 2026-07-15
**Scope:** Follow-up to the reported `--data-only` verifier shell-injection finding in `scripts/git/pre-push-verify.cjs`.

## Finding status

- Confirmed the reported `--data-only` issue: repository-controlled changed file names were passed into a shell-built `git diff` command.
- Fixed the vulnerable sink by routing the per-file diff through `spawnSync('git', args, ...)`, so filenames are passed as argv values rather than shell source.
- Regression check used a staged file named `apps/maine-cannabis/src/components/proof$(touch MDG_CMDINJ_PROOF).astro`; after the fix, `--data-only` completed without creating `MDG_CMDINJ_PROOF`.

## Similar-issue review

Reviewed command execution call sites under `scripts/` and `apps/maine-cannabis/scripts/` for the same pattern: repository-controlled paths or changed-file names interpolated into shell commands.

### No additional matching repo-filename sink found

No other reviewed call site matched the exact exploitable pattern from the finding: a Git-discovered repository path later interpolated into a shell command. Most remaining `execSync` shell usages are static commands, validated refs, fixed project constants, or local operator environment/script paths.

### Noted non-matching shell usages

These call sites still use shell execution and should remain on the hardening backlog, but they were not found to be the same repository-controlled filename attack path:

- `scripts/search/browser-search.cjs` builds `agent-browser` shell commands from a CLI search query. The query itself is URL-encoded before interpolation, and the generated session name is timestamp-only.
- `apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs` and `apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs` interpolate the local `PYTHON` environment variable into a shell command. This is operator-environment controlled, not repository filename controlled.
- `scripts/git/sprint-handoff.cjs`, `scripts/admin/build-mission-control.cjs`, `scripts/admin/data-integrity-check.cjs`, and `apps/maine-cannabis/scripts/admin/sprint-score.cjs` run static Git or Node commands through `execSync`; no repository-discovered path was found flowing into a shell command in the reviewed snippets.

## Verification commands

- `node --check scripts/git/pre-push-verify.cjs`
- malicious filename regression using `node scripts/git/pre-push-verify.cjs --data-only`
- `npm run verify:iterate`
