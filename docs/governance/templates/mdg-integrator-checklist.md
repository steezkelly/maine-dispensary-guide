# MDG Integrator checklist (operational)

## Required order (do not reorder)

1. `npm run workflow:status:fetch`
2. `git fetch origin`
3. Create a fresh named integration worktree from `origin/main`
   (`fresh` means no stale worktree, no dirty tree from prior work, and a single candidate commit sequence).
4. `git cherry-pick <accepted-candidate-commit>`
5. `git diff origin/main...HEAD --check`
6. `npm run verify:iterate`
7. `npm run verify:push`
8. `git push origin HEAD:refs/heads/main`
9. Wait for Vercel Ready
10. Verify expected deployment and production route
11. After production verification, execute release ordering exactly:
    1. Release the feature lease.
    2. Close the candidate card.
    3. Attach final release metadata record with `status: released`, final main SHA, Vercel ID/URL, validation commands, deferred work, and closeout evidence.

12. Record `closeout_evidence` in the final metadata record immediately after step 11, not before.

## Mandatory release metadata draft (Kanban)

Before deployment push, create only a `release-pending` draft record on the candidate card:

```json
{
  "status": "release-pending",
  "candidate_sha": "accepted-candidate-sha",
  "validation_commands": [
    "git diff origin/main...HEAD --check",
    "npm run verify:iterate",
    "npm run verify:push"
  ],
  "deferred_work": [
    "list of deferred or follow-up tasks",
    "optional: blockers from this rollout"
  ]
}
```

Attach the final deployment metadata only after the sequence in step 11 is complete:

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
    "npm run verify:push",
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
