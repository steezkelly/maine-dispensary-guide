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
8. `git push origin HEAD:refs/heads/main`
9. Wait for Vercel Ready on the **exact pushed SHA**. Read the remote
   SHA back with `git ls-remote origin main` to confirm; do not
   trust local branch state alone.
10. **Post-transport smoke**: with `MDG_PREVIEW_URL` set to the Vercel
    preview deployment URL (matching `*.vercel.app`), run
    `npm run verify:post-deploy` to smoke the exact preview deployment.
    This is the only valid smoke step for the new candidate. For an
    explicit post-deploy production smoke of the live site, set
    `MDG_ALLOW_PROD_SMOKE=1` plus `MDG_BASE=https://mainedispensaryguide.com`.
11. Verify expected deployment and production route.
12. After production verification, execute release ordering exactly:
    1. Release the feature lease.
    2. Close the candidate card.
    3. Attach final release metadata record with `status: released`, final main SHA, Vercel ID/URL, route, commands, deferred work, and closeout evidence.

13. Record `closeout_evidence` in the final metadata record immediately after step 12, not before.

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

Attach the final deployment metadata only after the sequence in step 12 is complete:

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
