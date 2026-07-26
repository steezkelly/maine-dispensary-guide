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
- `scripts/git/install-hooks.cjs:55` advertised an emergency hook-bypass command. No escape hatch exists.
- `docs/governance/templates/mdg-integrator-checklist.md:12` and the release-metadata example blocks prescribed the retired pre-transport smoke alias before `git push origin HEAD:refs/heads/main` — i.e. the integrator was required to smoke the *old* deployment before promoting the *new* candidate.
- `package.json` and `apps/maine-cannabis/package.json` map `verify:push` and `verify:pre-push` to `--with-smoke` against production. The label says "push" but the implementation is "smoke the live site first".

This branch fixes all of those defects and updates the policy + verifier + hook + checklist + package labels to match. It does not merge unverified work, removes hook-bypass advice entirely, and lands the integrator release sequence on the Vercel preview URL as the post-transport smoke target.

## Changes made

| Surface | Before | After |
| --- | --- | --- |
| `scripts/git/pre-push-verify.cjs` `killOrphanedTsServers()` | `pkill -f tsserver.js` (global, can affect any user's tsserver) | one best-effort `pkill -P "$VERIFIER_PID" -f ...` call scoped to immediate verifier children. It cannot reap already-reparented descendants; there is no global or PPID-mismatch fallback. |
| `scripts/git/pre-push-verify.cjs` auto-regen + `git add` of `autoRelatedData.json` | regenerates data file and stages it as part of verification | removed entirely. Verifier now reports `autoRelatedData.json` staleness (page files changed but file not regenerated) as a required check failure. Regeneration is the responsibility of a dedicated pre-commit step. |
| `scripts/git/pre-push-verify.cjs` missing required check | warn + skip + continue | fail closed with `ok: false` and a remediation hint. Required checks: sitemap-postprocess, docs-vs-code, compressed-frontmatter, hero-image-naming, autoRelated-freshness. Optional (warn-skip) remains only for legacy flags we have not yet migrated. |
| `scripts/git/pre-push-verify.cjs --with-smoke` | targets `https://mainedispensaryguide.com` by default (production); `MDG_BASE` and `MDG_PREVIEW_URL` env override | requires `MDG_PREVIEW_URL` to be set (or the verifier fails with the canonical remediation: pass `MDG_PREVIEW_URL=https://your-exact-preview.vercel.app`). Production hostname is rejected unless `MDG_ALLOW_PROD_SMOKE=1` is set. This makes pre-transport smoke against the old deployment impossible by default. |
| `scripts/git/pre-push-verify.cjs` exit code map | mixed 1..10 | fail-closed mappings are maintained in `SCRIPTS.md`; release-governance failure or a missing required governance input exits `16`. |
| `.githooks/pre-push` verifier-missing behavior | print warning, `exit 0` | print error, `exit 1`, list remediation steps (reinstall hook, repair verifier, do not bypass). |
| `.githooks/pre-push` ref selection | translates one remote ref and verifies it against ambient `HEAD`; ignores the supplied local SHA and remaining ref updates | verifies every non-deletion stdin record as `<remote-sha>..<local-sha>` via `--ref` + `--target`. Each local SHA must equal the clean checked-out `HEAD` or the hook fails closed, preventing filesystem-based checks from inspecting a different tree. New branches require a fetched remote HEAD/main merge base or fail closed with exit `2`. |
| `scripts/git/install-hooks.cjs` final-line guidance | advertised an emergency hook-bypass command | replaced with "If the hook fails, treat that as a verifier problem to fix — reinstall, repair, retry. Do not bypass." |
| `package.json` retired pre-transport smoke alias | `node scripts/git/pre-push-verify.cjs --with-smoke` | removed; replaced by `verify:post-deploy` which sets the new allow-list contract. |
| `package.json` `verify:pre-push` script | `node scripts/git/pre-push-verify.cjs --with-smoke` | removed; see `verify:iterate` (smoke-free, fast) below. |
| `docs/governance/templates/mdg-integrator-checklist.md` | prescribed a smoke-before-push alias after iteration (smokes old deployment) | exact-range verify, then push exact-candidate SHA, then wait for Vercel Ready on that SHA, then run `verify:post-deploy` against `MDG_PREVIEW_URL` (or equivalent Vercel-preview smoke), then changed-route production smoke. |
| `docs/governance/mdg-agent-orchestration-v1.md` Integrator section | iteration, retired pre-transport smoke, deploy verification | commit-only stop, OR push-and-deploy-and-`verify:post-deploy` against the Vercel preview URL. |
| `scripts/git/tests/mdg-agent-orchestration-docs.test.cjs` pattern matches | retired alias literal | relaxed to require the post-transport contract phrase. Test still pins the protocol contract. |
| `docs/governance/verifier-governance-migration-notes-2026-07-20.md` (NEW) | not present | TDD coverage for the four governance behaviors below. |

## Post-merge follow-up: prepush-data wrapper (branch `chore/prepush-data-regen-20260720`)

PR #97 left an exit-only contract: `--with-smoke` and the autoRelated-freshness check fail closed, but the only way to recover was "manually run `node scripts/data/regen-auto-related.cjs` then `git add autoRelatedData.json`." That left the freshness gate as a manual step at best and a forgotten blocker at worst.

This branch adds a focused wrapper at `scripts/data/prepush-data.cjs` plus a TDD suite at `scripts/data/tests/prepush-data.test.cjs`. It is **not** part of the verifier — the verifier remains read-only and fail-closed. The wrapper:

- Default mode: runs the canonical regen script, then `git add -- apps/maine-cannabis/src/data/autoRelatedData.json`. Exits 0 only on success.
- `--check`: thin pass-through to the regen script's `--check` mode (0 fresh / 1 stale). Read-only.
- `--dry-run`: thin pass-through to `--dry-run`. Read-only, no staging.

NPM aliases:
- root: `npm run data:regen:prepush` (and `data:regen`)
- `apps/maine-cannabis`: `npm run data:regen:prepush`

Why this matters: after a new `.astro` page is added, `npm run verify:iterate -- --skip-autoRelated-freshness` followed by `npm run data:regen:prepush` updates + stages the data file. The verifier's autoRelated-freshness check (PR #97) now passes because the data file is current.

The wrapper honors three environment overrides so the focused test suite can run against an isolated temp repo:

- `MDG_PREPUSH_REGEN_OVERRIDE`: alternate regen script path (used by the focused suite to drive a deterministic stub).
- `MDG_PREPUSH_ROOT`: alternate project root for relative-path computation.
- `MDG_PREPUSH_STAGE_TARGET`: alternate absolute path; used only when override is set so the test fixture can stay outside the project root directory tree.

These overrides exist exclusively for the test suite — production callers should not set them.

## New focused test (`scripts/git/tests/pre-push-verify-governance.test.cjs`)

Run with `node scripts/git/tests/pre-push-verify-governance.test.cjs`.

Covers:

- `killOrphanedTsServers is scoped to verifier process tree`: inspects the verifier source, rejects executable global `pkill -f` forms, and requires a best-effort immediate-child cleanup command using `VERIFIER_PID`. This is a source-level safety contract; it does not launch a competing process or claim to reap reparented descendants.
- `verifier refuses to auto-regenerate and stage generated files`: source inspection rejects in-verifier regeneration, staging, and warn-and-continue behavior. A runtime stale-data fixture changes an Astro page while leaving `autoRelatedData.json` older, then requires exit `13`; the suite does not claim a dirty-shortstat assertion.
- `verifier fails closed when a required check input is missing`: function-body mutation checks cover maintained missing-input branches. Public-entry runtime probes delete `check-hero-naming.cjs` and `autoRelatedData.json`, requiring exits `9` and `13`. Exact-range rename probes require the same blockers for those inputs and exit `16` when a required governance surface is renamed; changed-file discovery disables rename collapsing so source paths remain visible. Other maintained checkers retain their documented `6`–`9`, `12`, or `16` mappings in `SCRIPTS.md`.
- `verifier fixture isolation under a real hook`: clears repository-local `GIT_*` variables inherited from Git before creating disposable fixture repositories, so exact-range, rename, and hook contracts exercise their own object stores when the suite runs inside `.githooks/pre-push`.
- `verifier refuses --with-smoke without an explicit target`: source inspection requires the `MDG_PREVIEW_URL` guard and rejects a production fallback. The suite does not make a networked smoke invocation.

Plus hook contracts:

- `.githooks/pre-push verifies every exact checked-out local SHA`: a runtime stub records one `--ref=<remote-sha> --target=<checked-out-head-sha>` call per non-deletion stdin record, verifies multi-ref pushes when the records point to the checked-out HEAD, requires non-HEAD records to fail closed, and requires new branches without a resolvable remote base to fail closed.
- `.githooks/pre-push refuses to silently fall through when verifier is missing`: reads the hook source and asserts that the missing-verifier branch prints an error, exits non-zero, and does not advertise a bypass. The suite does not invoke the hook with an alternate `VERIFY` environment variable.

## Safe-rollout notes

- The package-script mappings change. If any external workflow (CI, an external cron, the install/hooks shell) reads `verify:push` by string, that workflow will need updating. The migration notes link the new `verify:iterate` / `verify:post-deploy` pair. No CI workflow in this repo references `verify:push` directly — the `ci-check` script runs `turbo run ci-check`, which delegates to per-app checks that do not invoke `--with-smoke`.
- Branch protection is empty on `origin/main`. This is intentional; the project does not enforce required-status checks at GitHub's branch-protection layer. The gate is the canonical pre-push hook + the integrator checklist. After this merge, that gate is fail-closed by construction.
- No application route, page content, or schema was changed. One app maintenance script, `apps/maine-cannabis/scripts/seo/city-title-rewriter.cjs`, was updated only to remove bypass guidance. The remaining changes are verifier, hook, checklist, governance, and package-script labels.

## What reviewers should check

- That `node scripts/git/tests/pre-push-verify-governance.test.cjs` exits 0 and prints `summary: OK`.
- That `bash .githooks/pre-push` against an arbitrary one-line stdin script still propagates the verifier's exit code (no swallowing, no `|| true`).
- That the integrator checklist now treats the release sequence as: smoke-free exact-candidate → push → Vercel Ready on that exact SHA → `verify:post-deploy` (or equivalent post-transport smoke) → changed-route production smoke. Anything else is a governance regression.
- That the autoRelatedData freshness check is now a fail-closed guard, so adding an `.astro` page and forgetting to regenerate is a real push-blocker rather than a silent auto-stage.

## Out-of-scope follow-ups (not in this branch)

- A dedicated regen-and-stage job for `autoRelatedData.json` (a pre-commit hook or a dedicated `prepush:data` script) is the natural replacement for the in-verifier auto-regen. Owner: the data registry lane. Tracked as a separate card.
- Finalizing `verify:post-deploy` end-to-end (Vercel CLI wiring, token provisioning) is its own track. Tracked separately.
- Tighter scoping of orchestrator kill behavior (parent-PID-and-tree walking, ignoring unrelated pkill matches) belongs to a separate process-safety track once it's actually load-bearing.
