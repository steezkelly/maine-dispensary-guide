# MDG Integrator checklist (operational)

## Required order (do not reorder)

1. `npm run workflow:status:fetch`
2. `git fetch origin`
3. Create a fresh named integration worktree from `origin/main`
   (`fresh` means no stale worktree, no dirty tree from prior work, and a single candidate commit sequence).
4. `git cherry-pick <accepted-candidate-commit>`
5. `git diff origin/main...HEAD --check`
6. `npm run verify:iterate` — smoke-free verification: parse, focused
   astro check, sitemap-postprocess, docs-vs-code, compressed-frontmatter,
   hero-image-naming, autoRelated-freshness. Confirms the candidate
   itself, not the live site.
7. **Pre-transport smoke is forbidden.** The legacy
   `npm run verify:push` (which smoked `https://mainedispensaryguide.com`
   before any candidate was deployed) has been retired. See
   `docs/governance/verifier-governance-migration-notes-2026-07-20.md`
   for the rationale.
8. **Canonical integrity gate (mandatory, fail-closed).** Before any merge or
   push to `main`, run the single canonical integration command:

   ```bash
   npm run ops:integrate -- \
     --evidence <private-bound-evidence.json> \
     --checks <private-required-checks.json> \
     --candidate <exact-candidate-sha> \
     --expected-base <exact-expected-base-sha> \
     --current-head <exact-current-remote-pr-head-sha> \
     [--detail-out <private-detail.json>]
   ```

   This wrapper (`scripts/operations/integration/cli.cjs`, OPS-06B-P1 Child 2)
   composes the verified-candidate integrity checks into one mechanically
   fail-closed gate. It fails nonzero BEFORE any merge when evidence is missing
   or its permissions are unsafe, when candidate/head/base identity differs,
   when the candidate tree differs, when a required check is pending or failing,
   or when the integration worktree is dirty. Ordinary output is redacted
   (stable codes only); full reasons are written only to a validated Tier-0
   `--detail-out` file. **Do not proceed to push if the gate exits nonzero.**
   The local integration path is mechanically fail-closed when this wrapper is
   used; GitHub-wide enforcement is not category B until the OPS-06B-P1 Child-3
   ruleset is operator-enabled.
9. `git push origin HEAD:refs/heads/main`
10. Wait for Vercel Ready on the **exact pushed SHA**. Read the remote
   SHA back with `git ls-remote origin main` to confirm; do not
   trust local branch state alone.
11. **Post-transport smoke**: with `MDG_PREVIEW_URL` set to the Vercel
    preview deployment URL (matching `*.vercel.app`), run
    `npm run verify:post-deploy` to smoke the exact preview deployment.
    This is the only valid smoke step for the new candidate. For an
    explicit post-deploy production smoke of the live site, set
    `MDG_ALLOW_PROD_SMOKE=1` plus `MDG_BASE=https://mainedispensaryguide.com`.
12. Verify expected deployment and production route.
13. After production verification, execute release ordering exactly:
    1. Release the feature lease.
    2. Close the candidate card.
    3. Attach final release metadata record with `status: released`, final main SHA, Vercel ID/URL, route, commands, deferred work, and closeout evidence.

14. Record `closeout_evidence` in the final metadata record immediately after step 13, not before.

## Bypass ban

`git push --no-verify` is forbidden. The pre-push verifier can fail
in ways that look like a developer-experience papercut (e.g. transient
slowAstroCheck timeout). When the verifier reports a failure, fix the
underlying cause or fix the verifier itself; do not bypass. The
`scripts/git/install-hooks.cjs` post-install message documents the same
requirement.

The verifier may also fail closed when an **adjacent release contract**
cannot be honored, for example when the pre-transport smoke was attempted
without `MDG_PREVIEW_URL`, when the autoRelatedData registry is stale
relative to changed pages, or when the hooksPath setup is missing the
verifier binary. Treat each of those as a verifier problem to fix before
integration.

## Mandatory release metadata draft (Kanban)

Before deployment push, create only a `release-pending` draft record on the candidate card:

```json
{
  "status": "release-pending",
  "candidate_sha": "accepted-candidate-sha",
  "validation_commands": [
    "git diff origin/main...HEAD --check",
    "npm run verify:iterate",
    "npm run ops:integrate -- --evidence <private-evidence> --checks <private-checks> --candidate <sha> --expected-base <sha> --current-head <sha>",
    "git push origin HEAD:refs/heads/main",
    "vercel ready wait on the exact pushed SHA",
    "MDG_PREVIEW_URL=<preview-url> npm run verify:post-deploy"
  ],
  "deferred_work": [
    "list of deferred or follow-up tasks",
    "optional: blockers from this rollout"
  ]
}
```

Attach the final deployment metadata only after the sequence in step 13 is complete:

```json
{
  "status": "released",
  "main_sha": "final-main-sha",
  "vercel_deploy_id": "deployment-id",
  "vercel_url": "https://<deployment>.vercel.app",
  "production_route": "https://mainedispensaryguide.com/<expected-route>",
  "validation_commands": [
    "git diff origin/main...HEAD --check",
    "npm run verify:iterate",
    "npm run ops:integrate -- --evidence <private-evidence> --checks <private-checks> --candidate <sha> --expected-base <sha> --current-head <sha>",
    "git push origin HEAD:refs/heads main",
    "vercel ready wait on final-main-sha",
    "MDG_PREVIEW_URL=<preview-url> npm run verify:post-deploy",
    "vercel production probe command or equivalent"
  ],
  "deferred_work": [
    "list of deferred or follow-up tasks",
    "optional: blockers from this rollout"
  ],
  "closeout_evidence": [
    "deployment logs",
    "production probe output",
    "evidence links or command output that proves final route/behavior"
  ]
}
```

## Release closeout

After deployment verification:
- Do not attach final `status: released` metadata before the candidate card is closed.
- Execute release in this strict sequence:
  - Release the feature lease.
  - Close the candidate card.
  - Attach final `status: released` metadata (`main_sha`, `vercel_deploy_id`, `vercel_url`, `production_route`, `validation_commands`, `deferred_work`, `closeout_evidence`).
- Confirm no residual lease remains in `/tmp` paths or shared lease stores.
