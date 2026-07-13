# SESSION PASSDOWN OUT — MDG Codex Harness + Open Tasks

Date: 2026-07-13
Repository: `/home/steve/projects/maine-dispensary-guide`
State: includes production-verified ICA release-1 closeout; earlier branch notes are superseded by later closeout sections

## Start here

1. Load skills:
   - `software-development:mdg-context-preservation`
   - `verification-before-completion`
   - `autonomous-ai-agents:codex-cli-integration`
   - the relevant MDG implementation/deploy skill for the action you take
2. Read:
   - this file
   - `.scratch/harness-test-2026-07-13-report.md`
   - `/home/steve/.hermes/plans/2026-07-13_000614-codex-cli-workflow-enhancement.md`
3. Read curated task state with:
   - `mnemosyne_task_progress(action="get", task="mdg-codex-open-tasks")`
4. Fetch and verify live repository state before acting.

## Critical repository safety

The primary checkout was freshly observed as:

```text
main...origin/main [ahead 1, behind 22]
```

Its local-only commit is `3000897c` (`fix(content): add 5 regional cluster hubs to all-guides + index copy`) and contains a stale count assumption. Do not reset, rebase, merge, or use primary `main` as a new implementation base without first inspecting and explicitly resolving that divergence.

Use a fresh worktree based on fetched `origin/main` for any new implementation. Do not commit `.worktrees/` or worktree-local `node_modules` symlinks.

The primary checkout also has untracked:

- `.worktrees/`
- `docs/SESSION_PASSDOWN_OUT_2026-07-12.md`
- this file, until an appropriate clean docs branch owns it

## Current worker/task state

Fresh closeout evidence:

- zero Kanban tasks outside `done`/`archived`
- zero active Codex MDG workers
- all five implementation worktrees listed below are clean
- all six handoff branches match their remote SHA exactly

## Review-ready pushed branches

These are pushed and locally verified. They are not evidence of production deployment.

| Work | Branch | Commit | Notes |
|---|---|---:|---|
| LeadMailtoForm migration | `wt/codex-direct-lead-mailto-2026-07-13` | `50a8e1b9` | Two download pages; verify gate, focused assertions, 279-page build, rendered markers passed |
| FAL credential removal | `fix/image-pipeline-fal-key-env-2026-07-13` | `f5f29475` | Two scripts now require `FAL_KEY`; credential rotation still operator-gated |
| New-branch pre-push base fix | `fix/pre-push-new-branch-base-2026-07-13` | `ce8d6222` | RED/GREEN regression for first-push diff-base bug |
| AutoRelated multiline title parser | `fix/auto-related-title-parser-2026-07-13` | `3f442d95` | Direct parser tests and 279-page build passed |
| Six-file hero variants | `feat/image-pipeline-six-variants-2026-07-13` | `953b5e52` | Stacked over FAL fix; desktop + 640w JPG/WebP/AVIF; infographic stays one JPG |
| Title-tranche methodology preservation | `wt/cherry-pick-title-tranche-2026-07-13` | `0f8dbd1c` | 886 lines of additive methodology preserved |

Compare URLs:

- https://github.com/steezkelly/maine-dispensary-guide/compare/main...wt/codex-direct-lead-mailto-2026-07-13
- https://github.com/steezkelly/maine-dispensary-guide/compare/main...fix/image-pipeline-fal-key-env-2026-07-13
- https://github.com/steezkelly/maine-dispensary-guide/compare/main...fix/pre-push-new-branch-base-2026-07-13
- https://github.com/steezkelly/maine-dispensary-guide/compare/main...fix/auto-related-title-parser-2026-07-13
- https://github.com/steezkelly/maine-dispensary-guide/compare/main...feat/image-pipeline-six-variants-2026-07-13
- https://github.com/steezkelly/maine-dispensary-guide/compare/main...wt/cherry-pick-title-tranche-2026-07-13

`gh` was not installed in the working shell, so PRs were not created there. If using a browser or another GitHub client, inspect each current diff and CI before merging. The hero-variant branch is stacked over the FAL security branch; avoid accidentally merging the same parent change twice without understanding the stack.

## Codex/Hermes runtime state

Live `hermes config show` at closeout reported:

```text
Model: {'default': 'gpt-5.6-sol', 'provider': 'openai-codex',
        'base_url': 'https://chatgpt.com/backend-api/codex',
        'openai_runtime': 'codex_app_server'}
```

Host Codex configuration:

- `/home/steve/.codex/config.toml`: interactive, `gpt-5.6-sol`, medium, `approval_policy = "on-request"`
- `/home/steve/.codex/dispatcher.config.toml`: explicit unattended worktree profile, `approval_policy = "never"`
- `/home/steve/.codex/AGENTS.md`: global cross-project safety guidance

Do not make `--yolo` or approval bypass global.

## Workflow finding to preserve

Use Codex as a bounded author, not completion authority:

1. Fetch and create a fresh `origin/main` worktree.
2. Assign one narrow edit surface and explicit allowed files.
3. Require a focused RED/GREEN test.
4. Cap author execution at 3–5 minutes.
5. Worker does not commit or push.
6. Orchestrator independently inspects diff and reruns focused + canonical checks.
7. Orchestrator owns commit, push, Kanban state, and production verification.
8. Reclaim/block a Kanban card before direct fallback to avoid duplicate workers.

Observed comparison:

- medium parser worker: under four minutes, 62,689 tokens
- low image worker: under three minutes, 33,809 tokens

Use low reasoning for mechanical, well-specified transformations with strong tests. Use medium for ambiguity-heavy work. Do not generalize this beyond the observed MDG trials without more evidence.

Broad Kanban/app-server payloads remain unreliable: one fresh `gpt-5.6-sol` session stalled before its first useful turn while a narrow control prompt succeeded. A broad direct worker authored useful code but exceeded the observation window; a delayed completion event later exited 0 after orchestrator takeover and produced no extra branch delta.

## Remaining gates

Do not silently convert these into autonomous work:

1. **FAL key rotation** — tracked values were removed, but revocation/replacement requires operator account access. Never reproduce or type the exposed value.
2. **Operator-name cannibalization** — current issue is `needs-info`; final GSC data must include at least seven post-fix days, target window end >= `2026-07-18`.
3. **Aesthetic Scope B** — `.scratch/aesthetic-redesign/issues/01-section-treatment-rhythm.md` explicitly awaits human direction.
4. **`MDG-ANALYTICS-001` and `mdg-data-001/final-corrective`** — retain existing operator gates.
5. **Review/merge/deploy** — pushed branches require current diff/CI review. After merge and Vercel rollout, fetch production origins before using deployment labels.

## Scheduled follow-up

One-shot local-only cron:

- job ID: `7a6f5caa1069`
- name: `MDG post-fix operator GSC measurement`
- runs: `2026-07-19 10:00 America/New_York`
- output is stored in the Hermes cron record; this CLI session receives no delivery
- it must leave the issue unchanged if final GSC end date is before `2026-07-18`

Inspect with `cronjob(action="list")` after it runs.

Other existing local cron jobs remain enabled; do not duplicate them.

## Generated-data and worktree pitfalls

- `npm run verify:iterate` can regenerate/stage `apps/maine-cannabis/src/data/autoRelatedData.json`. Inspect and restore unrelated churn unless regeneration is the task.
- Fresh worktrees may lack dependencies. A worktree-local symlink to the known root `node_modules` can be used for verification, but never commit it.
- A worker report or exit code is not acceptance evidence. Re-run checks against current files.
- A pushed branch is `local_verified`/review-ready, not production-deployed.
- Archiving a Kanban card does not kill a running worker; reclaiming does.

## Suggested next actions

1. Verify current `origin/main`, primary divergence, worker count, and branch SHAs again.
2. Review the six pushed branches and decide merge order. Strong default:
   - pre-push hook fix
   - FAL credential fix
   - hero variant branch after/with its FAL parent
   - AutoRelated parser
   - LeadMailtoForm pages
   - additive title methodology
3. For each merged/deployed branch, verify Vercel completion and fetch the affected production surface before updating deployment state.
4. Ask Steve/operator to rotate the FAL credential.
5. After July 19, inspect cron job `7a6f5caa1069` and the updated GSC issue.
6. Continue only with work that is no longer gated.
7. Update `PROJECT_STATE.md` and `BOT_COLLABORATION_HUB.md` from a clean, current branch—not the divergent primary checkout.

## Copy/paste takeover prompt

```text
Take over the Maine Dispensary Guide work from the July 13 Codex/Hermes harness session.

Repository: /home/steve/projects/maine-dispensary-guide
Passdown: /home/steve/projects/maine-dispensary-guide/docs/SESSION_PASSDOWN_OUT_2026-07-13.md
Harness evidence: /home/steve/projects/maine-dispensary-guide/.scratch/harness-test-2026-07-13-report.md
Workflow plan: /home/steve/.hermes/plans/2026-07-13_000614-codex-cli-workflow-enhancement.md
Curated task state: mnemosyne_task_progress(action="get", task="mdg-codex-open-tasks")

First load software-development:mdg-context-preservation, verification-before-completion, and autonomous-ai-agents:codex-cli-integration. Then read the passdown and independently refresh git, worktrees, remote branch SHAs, Kanban state, worker processes, cron state, and current production/measurement evidence. Do not trust the passdown over live sources.

Critical safety: the primary checkout was ahead 1 / behind 22 at closeout with local-only commit 3000897c. Do not reset, rebase, merge, or use it as an implementation base until its divergence is explicitly resolved. New work must use a fresh fetched origin/main worktree. Do not touch secrets or reproduce the exposed FAL credential.

Six review-ready pushed branches and exact commits are recorded in the passdown. Review current diffs/CI and decide merge order; do not call them deployed until Vercel rollout and production-origin fetches verify the affected surfaces. The hero-variant branch is stacked over the FAL credential branch.

Remaining gates: FAL key rotation requires operator account access; aesthetic Scope B needs human direction; operator-name cannibalization needs final GSC through at least 2026-07-18; MDG-ANALYTICS-001 and mdg-data-001/final-corrective remain operator-gated. One-shot local GSC cron job 7a6f5caa1069 runs 2026-07-19 at 10:00 America/New_York.

Preserve the proven worker pattern: fresh origin/main worktree; one narrow author-only task; explicit files; focused RED/GREEN test; 3–5 minute cap; low reasoning for mechanical transforms; orchestrator-owned review, canonical verification, commit, push, Kanban completion, and production verification. Reclaim/block a Kanban card before direct fallback. Inspect and normally restore unrelated autoRelatedData.json regeneration.

Proceed autonomously on review/merge/verification work that is actually authorized and ungated. Stop and surface exact evidence for operator-, credential-, production-, or measurement-gated decisions. Update the passdown/task-progress record before closing your session.
```

---

## Continuation closeout — 2026-07-13 02:00 EDT

This section supersedes the review/merge instructions above. Live sources were refreshed before integration.

### Integrated and deployed

The deployed code-integration point is `298a87badf8d9b580f1809694d31a88ef38cb2a9`, containing six ordered commits rebased onto the then-current main (`6565a897`). Docs-only closeout commits follow it on `origin/main`:

1. `c678f5e1` — new-branch pre-push diff-base fix
2. `9d0f49b5` — FAL credential removed from current image-script source; runtime now requires `FAL_KEY`
3. `bec0c5af` — six hero variants
4. `d03134ba` — multiline `Layout title` parser correction
5. `b1fd5971` — direct mailto lead forms on the two compliance downloads
6. `298a87ba` — reviewer-requested hardening for recoverable/atomic hero variant sets, direct `sharp@0.34.5` dependency, and CI test wiring

The original worker SHAs were rewritten only by the clean rebase; the source changes remain auditable on `origin/integration/july13-final-2026-07-13`, which exactly matched `origin/main` at code closeout.

### Independent review decisions

- Merge: pre-push base fix, FAL environment fix, auto-related title parser, and direct lead-mailto pages.
- Hero variants initially received `request changes`: incomplete sets were skipped, writes could publish partial sets, `sharp` was only transitive, and tests were not in CI. All four concerns were corrected before main integration. RED/GREEN coverage now exercises incomplete-set repair, partial-publication prevention, six output formats/sizes, and infographic non-regression.
- Hold: `wt/cherry-pick-title-tranche-2026-07-13`. It is stale, carries an unrelated parent if merged, has a broken relocated path, documents an incompatible CSV workflow, and contradicts current main. The active title scripts are byte-identical to its copies, and title rewrites are already live from `03728103`; do not merge the preservation branch.

### Verification evidence

- `PUPPETEER_SKIP_DOWNLOAD=1 npm ci`: PASS.
- `npm run test:image-pipeline`: 4/4 PASS.
- Focused pre-push, parser, FAL missing-key, credential-shape, lead-form structure, and hero-variant tests: PASS.
- `node scripts/git/pre-push-verify.cjs --ref=origin/main --with-smoke`: PASS.
- `npm run build`: PASS, 279 pages.
- GitHub Actions run `29227836246`: completed/success for `298a87ba`.
- Vercel production deployment `maine-dispensary-guide-595ueaea2-steezkellys-projects.vercel.app`: Ready; build log cloned main commit `298a87b`, built 279 pages, and completed deployment.
- Production-origin probes: both download pages HTTP 200; each contains one form workflow and three PDF escape links; both PDFs HTTP 200 with `application/pdf`.
- Playwright production checks: desktop and mobile normal/success states PASS for both download pages with no unexpected page/console/network errors.
- Tracked-tree FAL credential-shape scan: zero hits. This does not sanitize Git history.

### Final live state

- Primary checkout remains untouched at local commit `3000897c`, ahead of and behind `origin/main`, with its prior untracked files. It was ahead 1 / behind 30 at the code-integration point; refresh the count live because docs-only closeout commits follow.
- Kanban active tasks: 0.
- Active MDG Codex/OpenCode/Claude workers: 0.
- One-shot local operator-name GSC cron `7a6f5caa1069` remains scheduled for 2026-07-19 10:00 America/New_York.
- Latest final GSC window still ends 2026-07-10. Operator-name cannibalization remains measurement-gated until final data reaches at least 2026-07-18.

### Remaining human/operator gates

1. Revoke/rotate the historically exposed FAL credential, store the replacement outside Git, run one bounded authenticated smoke test, and verify the old credential fails. Do not paste either value into chat, logs, or commits.
2. Choose aesthetic Scope B direction.
3. Wait for the July 19 GSC measurement before any additional operator-name title/H1/internal-link batch.
4. Resolve the primary checkout divergence explicitly before using primary `main` as an implementation base.
5. MDG-ANALYTICS-001 and `mdg-data-001/final-corrective` remain operator-gated unless separately authorized.

---

## ICA release-1 production closeout — 2026-07-13 17:17 UTC

- Production commit: `50fda8fb9fe26eaf394e90ad6828f2a062e2c897` on `origin/main`.
- State: `deployment_verified`; treatment/measurement clock starts conservatively at `2026-07-13T17:17:25Z`.
- Cohort: fixed manifest of six business and four consumer routes. Legacy layout behavior remains the default outside those 10 explicit pilot opt-ins.
- Architecture: complete article answer → editorial next dependency → separate contextual action → existing `AutoRelated`. Editorial and action registries remain independent; release 1 contains no generated graph, scoring, personalization, progress tracking, or local storage.
- Production-origin result: 10/10 routes returned the correct canonical and exactly one editorial, action, and discovery module in order; no manual discovery rail remained.
- Production browser result: 20 desktop/mobile checks, zero axe violations at every recorded impact level, no horizontal overflow, 44px targets, keyboard focus PASS, reduced motion PASS.
- GitHub Actions `29269220675`: Build, production smoke, and production deploy jobs completed successfully; preview-only jobs were skipped for the main push.
- Independent staged-diff review: PASS with no security concerns, logic errors, or spec gaps. Its three suggestions are non-blocking follow-ups, not release-1 defects.
- Baseline and measurement caveats: `docs/analytics/ICA_PILOT_BASELINE_2026-07-13.md`; structured cohort and deployment metadata: `docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json`.
- Measurement discipline: this is observational, not an A/B test. Do not infer causality from before/after movement. `cta_id` still requires operator-side GA4 custom-dimension registration for exact slot-level reporting.
