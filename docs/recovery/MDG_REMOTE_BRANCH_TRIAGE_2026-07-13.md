# MDG remote-branch triage — 2026-07-13

## Method and scope

- Fresh remote base: `origin/main` = `429324747542b32d6dd0aa50e6d7817b26a31727`.
- Inventory source: `git branch -r --no-merged origin/main`, followed by merge-base, ahead/behind, changed-path, commit-log, and stable patch-ID comparison against `origin/main`.
- A clean merge-tree is not treated as integration approval. No branch was deleted or merged by this inventory.
- `duplicate` means every identified delivery patch is already patch-equivalent on `origin/main`; it does not authorize remote deletion while any registered worktree still uses the branch.

## Decisions

| Remote branch | Status | Evidence / disposition |
| --- | --- | --- |
| `audit/ahrefs-may14-fixes` | Stale-but-preserve | 7 commits, 665 behind. Two patches are already on main (`7a937473`, `c10d2449`); the remaining mixed schema/docs work needs a selective review, not branch-tip merge. |
| `chore/mdg-workflow-reliability-2026-07-13` | Integration candidate | Five focused workflow/build-isolation commits, zero behind at snapshot, independently tested in a clean integration worktree. This branch is being integrated separately by the reliability workstream. |
| `codex/replace-video-tour-with-static-carousel` | Duplicate | `870ae3bd` is patch-equivalent to `619e2c98` on `origin/main`. Hold until its registered worktree is no longer needed. |
| `email/mdg-replies-monotonicity` | Integrate candidate | Two focused outreach-status commits, three files, no current patch-equivalent on main. Requires targeted test plus review before a standalone integration. |
| `feat/contributor-guidelines-funnel-2026-07-13` | Integrate candidate | One isolated edit to `contribute.astro`; needs page-level review and targeted verify. |
| `feat/image-pipeline-six-variants-2026-07-13` | Duplicate | Both feature and FAL environment patches are patch-equivalent on main (`bec0c5af`, `9d0f49b5`). Do not merge the branch tip. |
| `feat/trust-pages-cookies-accessibility-advertising-medical-2026-07-13` | Integrate candidate | One focused six-file legal/trust page change. Requires YMYL/trust-page content review and route/output verification. |
| `fix/auto-related-title-parser-2026-07-13` | Duplicate | `3f442d95` is patch-equivalent to `d03134ba` on main. |
| `fix/city-guide-ctr-fryeburg-bar-harbor-bridgton-2026-07-13` | Integrate candidate | One isolated three-page metadata change. Requires SERP copy and rendered metadata review. |
| `fix/image-pipeline-fal-key-env-2026-07-13` | Duplicate | `f5f29475` is patch-equivalent to `9d0f49b5` on main. |
| `fix/pre-push-new-branch-base-2026-07-13` | Duplicate | `ce8d6222` is patch-equivalent to `c678f5e1` on main. |
| `integration/july13-review-2026-07-13` | Duplicate aggregate | Its six delivery patches are all patch-equivalent on main: image recovery, lead gates, auto-related parser, image variants, FAL env handling, and pre-push base handling. Do not merge the aggregate tip. |
| `mdg-analytics-001/ticket-007-ingest` | Needs owner/semantic decision | 42 commits / 155 files spanning analytics, data, docs, content, and prior merges. It is an authority-bound batch, not a normal integration candidate; reconcile its approvals and scope hashes before selecting commits. |
| `mdg-data-001/final-clean` | Superseded by aggregate branch | Its four corrective commits are already represented in the unmerged analytics aggregate. Keep as a recovery reference; do not merge it separately. |
| `sprint-78-dispensary-counts-zoning-optin` | Stale-but-preserve | One content-date update, 473 behind. Needs current source validation before any selective pick. |
| `wt/cherry-pick-title-tranche-2026-07-13` | Needs owner/semantic decision | Contains local-only `3000897c` regional-hub content plus title-methodology docs, and is 38 behind. Preserve; separate the docs from the local-only content only after reviewing the primary-checkout handoff. |
| `wt/codex-direct-lead-mailto-2026-07-13` | Duplicate | `50a8e1b9` is patch-equivalent to `b1fd5971` on main. Its two uncommitted alternate form-layout edits are tracked in the dirty-worktree manifest and remain held for semantic review. |
| `wt/t_0af54ed3` | Stale-but-preserve | One orphaned-task report commit, 440 behind. Preserve for historical context; no blind merge. |

## Controlled next actions

1. Finish the workflow-reliability integration and push it only after its review gate passes.
2. Work only the isolated `integrate candidate` branches one at a time from fresh `origin/main` worktrees.
3. Keep `needs owner/semantic decision` and `stale-but-preserve` branches as evidence; do not delete or mass-merge them.
4. Before cleaning a duplicate branch, verify that no registered worktree or recovery manifest still depends on it.
