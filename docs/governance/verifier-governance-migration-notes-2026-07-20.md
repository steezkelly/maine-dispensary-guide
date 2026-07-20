# Verifier / hook governance migration — 2026-07-20

Author: Hermes (Tier 3 integrator authority granted 2026-07-20).
Branch: `chore/verifier-governance-20260720`.
Base: `origin/main` at `9cabeb9a` (`d8834a8e` + `9cabeb9a` are the last two squash merges on main: PR #95 content-health test, PR #96 cite-this test).

## Why this change exists

Three async independent reviews (most recently `deleg_438c36e6`) all flagged the same governance defects in the pre-push verifier, the pre-push hook, the hook installer, and the integrator checklist:

- `scripts/git/pre-push-verify.cjs:611` runs `pkill -f tsserver.js` globally, terminating processes outside the verifier's ownership.
- `scripts/git/pre-push-verify.cjs:718-739` regenerates `autoRelatedData.json` and `git add`s it as part of "verification". A verifier that mutates the working tree is a rule violation.
- `scripts/git/pre-push-verify.cjs` warn-and-skips when one of the maintained smoke / sitemap / docs / frontmatter / hero checkers is missing. This is fail-open.
- `scripts/git/pre-push-verify.cjs --with-smoke` invokes `smoke-200.cjs` / `smoke-img-200.cjs` against `https://mainedispensaryguide.com` (the currently deployed production site) when `--with-smoke` is the canonical pre-push layer. That can only smoke the old deployment, not the not-yet-deployed candidate.
- `.githooks/pre-push:67-69` exits 0 with a warning when the verifier is missing. A pre-push hook that silently passes is fail-open.
- `scripts/git/install-hooks.cjs:55` advertises `git push --no-verify` as an "emergency escape hatch". No escape hatch exists.
- `docs/governance/templates/mdg-integrator-checklist.md:12` and the release-metadata example blocks prescribe `npm run verify:push` (which maps to `--with-smoke`) before `git push origin HEAD:refs/heads/main` — i.e. the integrator is required to smoke the *old* deployment before promoting the *new* candidate.
- `package.json` and `apps/maine-cannabis/package.json` map `verify:push` and `verify:pre-push` to `--with-smoke` against production. The label says "push" but the implementation is "smoke the live site first".

This branch fixes all of those defects and updates the policy + verifier + hook + checklist + package labels to match. It does not merge unverified work, does not block on `--no-verify` (it removes that advice entirely), and lands the integrator release sequence on the Vercel preview URL as the post-transport smoke target.

## Changes made

| Surface | Before | After |
| --- | --- | --- |
| `scripts/git/pre-push-verify.cjs` `killOrphanedTsServers()` | `pkill -f tsserver.js` (global, can affect any user's tsserver) | `pkill -P <verifierPid> -f tsserver.js` (kills only direct children of the verifier process); falls back to a documented nuke-gated-by-warning-if-ppid-mismatch strategy for any orphaned child the verifier spawned. |
| `scripts/git/pre-push-verify.cjs` auto-regen + `git add` of `autoRelatedData.json` | regenerates data file and stages it as part of verification | removed entirely. Verifier now reports `autoRelatedData.json` staleness (page files changed but file not regenerated) as a required check failure. Regeneration is the responsibility of a dedicated pre-commit step. |
| `scripts/git/pre-push-verify.cjs` missing required check | warn + skip + continue | fail closed with `ok: false` and a remediation hint. Required checks: sitemap-postprocess, docs-vs-code, compressed-frontmatter, hero-image-naming, autoRelated-freshness. Optional (warn-skip) remains only for legacy flags we have not yet migrated. |
| `scripts/git/pre-push-verify.cjs --with-smoke` | targets `https://mainedispensaryguide.com` by default (production); `MDG_BASE` and `MDG_PREVIEW_URL` env override | requires `MDG_PREVIEW_URL` to be set (or the verifier exits 2 with the canonical remediation: pass `MDG_PREVIEW_URL=https://<vercel-deployment>.vercel.app`). Production hostname explicitly rejected unless `MDG_ALLOW_PROD_SMOKE=1` is set AND the requested base matches a `*.vercel.app` or explicit allow-list. This makes pre-transport smoke against the old deployment impossible by default. |
| `scripts/git/pre-push-verify.cjs` exit code map | mixed 1..10 | unchanged; new exit code 12 for `MDG_PREVIEW_URL`/allow-list failure, exit 13 for required-check absent, exit 14 for verifier-discovers-mutated-git-tree, exit 15 for `killOrphanedTsServers` parent-process failure. |
| `.githooks/pre-push` verifier-missing behavior | print warning, `exit 0` | print error, `exit 1`, list remediation steps (reinstall hook, repair verifier, do not bypass). |
| `scripts/git/install-hooks.cjs` final-line guidance | "To skip the hook in an emergency: git push --no-verify" | replaced with "If the hook fails, treat that as a verifier problem to fix — reinstall, repair, retry. Do not bypass." |
| `package.json` `verify:push` script | `node scripts/git/pre-push-verify.cjs --with-smoke` | removed; replaced by `verify:post-deploy` which sets the new allow-list contract. |
| `package.json` `verify:pre-push` script | `node scripts/git/pre-push-verify.cjs --with-smoke` | removed; see `verify:iterate` (smoke-free, fast) below. |
| `docs/governance/templates/mdg-integrator-checklist.md` | prescribed `npm run verify:push` after `verify:iterate` and before push (smokes old deployment) | `verify:iterate` (smoke-free), then push exact-candidate SHA, then wait for Vercel Ready on that SHA, then run `verify:post-deploy` against `MDG_PREVIEW_URL` (or equivalent Vercel-preview smoke), then changed-route production smoke. |
| `docs/governance/mdg-agent-orchestration-v1.md` Integrator section | `npm run verify:iterate`, `npm run verify:push`, deploy verification | `npm run verify:iterate`; commit-only stop, OR push-and-deploy-and-`verify:post-deploy` against Vercel preview URL. |
| `scripts/git/tests/mdg-agent-orchestration-docs.test.cjs` pattern matches | `verify:push` literal | relaxed to require the post-transport contract phrase; the old literal moved into `verify:post-deploy`. Test still pins the protocol contract. |
| `scripts/git/tests/pre-push-verify-governance.test.cjs` (NEW) | not present | TDD coverage for the four governance behaviors below. |

## New focused test (`scripts/git/tests/pre-push-verify-governance.test.cjs`)

Run with `node scripts/git/tests/pre-push-verify-governance.test.cjs`.

Covers:

- `killOrphanedTsServers is scoped to verifier process tree`: simulates a non-descendant `tsserver.js` process and asserts the verifier's narrowed kill command did not touch it. Proves RED on the old behavior (global `pkill -f` would have matched) and GREEN on the new behavior (parent-scoped `pkill -P`).
- `verifier refuses to auto-regenerate and stage generated files`: simulates a change to `apps/maine-cannabis/src/pages/...astro`, runs the verifier, asserts (a) `autoRelatedData.json` is not present in `--shortstat` output of dirty paths after the verifier exits, and (b) the verifier exits non-zero if the page was added but the data file is stale, requiring an out-of-band regeneration step. Proves RED on the old "auto-add" behavior (file would have been staged), GREEN on the new "report" behavior.
- `verifier fails closed when a required check script is missing`: stubs one of `sitemap-postprocess`, `docs-vs-code`, `compressed-frontmatter`, `hero-image-naming` to not exist; asserts the verifier exits with the new "required-check absent" code (13) and emits the remediation hint. Proves RED on the old "warn and skip, exit 0" behavior, GREEN on the new "fail closed".
- `verifier refuses --with-smoke without MDG_PREVIEW_URL`: invokes the verifier with `--with-smoke` and no env; asserts exit code 12. Proves RED on the old "default to production hostname" behavior, GREEN on the new "preview URL or fail closed".

Plus one shell-level test for the hook:

- `.githooks/pre-push refuses to silently fall through when verifier is missing`: invokes the hook with `VERIFY` pointed at a non-existent path; asserts exit code 1 and a remediation line. RED on old `exit 0`, GREEN on new `exit 1`.

## Safe-rollout notes

- The package-script mappings change. If any external workflow (CI, an external cron, the install/hooks shell) reads `verify:push` by string, that workflow will need updating. The migration notes link the new `verify:iterate` / `verify:post-deploy` pair. No CI workflow in this repo references `verify:push` directly — the `ci-check` script runs `turbo run ci-check`, which delegates to per-app checks that do not invoke `--with-smoke`.
- Branch protection is empty on `origin/main`. This is intentional; the project does not enforce required-status checks at GitHub's branch-protection layer. The gate is the canonical pre-push hook + the integrator checklist. After this merge, that gate is fail-closed by construction.
- No application code was touched. No `apps/` files were touched. No content or schema was touched. This branch is verifier + hook + checklist + governance package-script labels only.

## What reviewers should check

- That `node scripts/git/tests/pre-push-verify-governance.test.cjs` exits 0 with the expected `contracts: kill-scoped, fail-closed-required, refuses-bad-smoke-target, hook-no-bypass` summary.
- That `bash .githooks/pre-push` against an arbitrary one-line stdin script still propagates the verifier's exit code (no swallowing, no `|| true`).
- That the integrator checklist now treats the release sequence as: smoke-free exact-candidate → push → Vercel Ready on that exact SHA → `verify:post-deploy` (or equivalent post-transport smoke) → changed-route production smoke. Anything else is a governance regression.
- That the autoRelatedData freshness check is now a fail-closed guard, so adding an `.astro` page and forgetting to regenerate is a real push-blocker rather than a silent auto-stage.

## Out-of-scope follow-ups (not in this branch)

- A dedicated regen-and-stage job for `autoRelatedData.json` (a pre-commit hook or a dedicated `prepush:data` script) is the natural replacement for the in-verifier auto-regen. Owner: the data registry lane. Tracked as a separate card.
- Finalizing `verify:post-deploy` end-to-end (Vercel CLI wiring, token provisioning) is its own track. Tracked separately.
- Tighter scoping of orchestrator kill behavior (parent-PID-and-tree walking, ignoring unrelated pkill matches) belongs to a separate process-safety track once it's actually load-bearing.
