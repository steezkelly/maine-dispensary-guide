# MDG Integrator checklist (operational)

## Required order (do not reorder)

1. `npm run workflow:status:fetch`
2. `git fetch origin`
3. Create a fresh named integration worktree from `origin/main`
   (`fresh` means no stale worktree, no dirty tree from prior work, and a single candidate commit sequence).
4. Set `ACCEPTED_CANDIDATE_SHA` to the reviewed commit and `BRANCH_NAME` to
   the named integration branch; then run `git cherry-pick "$ACCEPTED_CANDIDATE_SHA"`.
5. `git diff origin/main...HEAD --check`
6. Run `node scripts/git/pre-push-verify.cjs --ref=origin/main` against the
   exact candidate.
7. Run `npm run build:isolated` once for the exact candidate.
8. **Pre-transport smoke is forbidden.** The retired smoke-before-deploy
   command did not verify an undeployed candidate. See
   `docs/governance/verifier-governance-migration-notes-2026-07-20.md`
   for the rationale.
9. Push normally with `git push origin HEAD:refs/heads/$BRANCH_NAME` and
    open or update the reviewed pull request.
10. Wait until Vercel reports Ready for that exact pushed SHA. Read the remote
   SHA back with `git ls-remote origin "$BRANCH_NAME"` to confirm; do not
   trust local branch state alone.
11. Run `MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy`
    to smoke the exact preview deployment.
12. Merge the reviewed pull request and wait for the exact merge SHA to reach
    production Ready.
13. Only after merge and exact production deployment readiness, run
    `MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy`.
14. Probe the expected production route after production smoke:
    `PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error "$PRODUCTION_ROUTE"`.
15. Execute release ordering exactly:
    1. Gather closeout evidence from the exact production deployment and route probes.
    2. Release the feature lease.
    3. Close the candidate card.
    4. Attach one final `status: released` metadata record with final main SHA,
       Vercel ID/URL, route, commands, deferred work, and the gathered closeout evidence.

## Bypass ban

Hook bypasses are forbidden. The pre-push verifier can fail
in ways that look like a developer-experience papercut (e.g. transient
slowAstroCheck timeout). When the verifier reports a failure, fix the
underlying cause or fix the verifier itself; do not bypass. The
`scripts/git/install-hooks.cjs` post-install message documents the same
requirement.

The verifier may also fail closed when an **adjacent release contract**
cannot be honored, for example when preview smoke lacks
`MDG_PREVIEW_URL`, when the autoRelatedData registry is stale
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
    "node scripts/git/pre-push-verify.cjs --ref=origin/main",
    "npm run build:isolated",
    "git push origin HEAD:refs/heads/$BRANCH_NAME",
    "vercel ready wait on the exact pushed SHA",
    "MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy"
  ],
  "deferred_work": [
    "list of deferred or follow-up tasks",
    "optional: blockers from this rollout"
  ]
}
```

Attach the final deployment metadata only after the complete closeout sequence in step 15:

```json
{
  "status": "released",
  "main_sha": "final-main-sha",
  "vercel_deploy_id": "deployment-id",
  "vercel_url": "https://your-production-deployment.vercel.app",
  "production_route": "https://mainedispensaryguide.com/expected-route",
  "validation_commands": [
    "git diff origin/main...HEAD --check",
    "node scripts/git/pre-push-verify.cjs --ref=origin/main",
    "npm run build:isolated",
    "git push origin HEAD:refs/heads/$BRANCH_NAME",
    "vercel preview ready wait on the exact pushed SHA",
    "MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy",
    "merge the reviewed pull request",
    "vercel production ready wait on final-main-sha",
    "MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy",
    "PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error \"$PRODUCTION_ROUTE\"",
    "gather closeout evidence"
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
  - Gather closeout evidence from the exact production deployment and route probes.
  - Release the feature lease.
  - Close the candidate card.
  - Attach one final `status: released` metadata record (`main_sha`, `vercel_deploy_id`, `vercel_url`, `production_route`, `validation_commands`, `deferred_work`, `closeout_evidence`).
- Confirm no residual lease remains in `/tmp` paths or shared lease stores.
