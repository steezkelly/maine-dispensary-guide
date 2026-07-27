# MDG Integrator checklist (operational)

## Canonical integration topology: GitHub merge commit

The normal integration path is a **GitHub merge commit**. The candidate is the
exact remote PR head; the Integrator never validates one commit and permits a
different commit or tree to be merged. The ordinary cherry-pick + direct-push
sequence is **not** the canonical path (see "Emergency mode" below).

## Required order (do not reorder)

1. `npm run workflow:status:fetch`
2. Fetch origin with pruning: `git fetch origin --prune`.
3. Use a fresh clean checkout at the exact remote PR head (`fresh` means no stale
   worktree, no dirty tree from prior work, and a single candidate commit
   sequence).
4. Confirm the evidence-bound candidate equals the live PR head and that the PR
   targets the current locked main.
5. Wait for the live, producer-authenticated required checks on that exact head:
   **Build** and **Operations Suite** (from the GitHub Actions integration).
6. **Canonical integrity gate (mandatory, fail-closed).** Before marking the PR
   ready or merging, run the single canonical integration command:

   ```bash
   npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number "$PR_NUMBER" --evidence "$EVIDENCE_PATH" --expect-evidence-sha256 "$EVIDENCE_DIGEST" --allow-draft [--detail-out "$DETAIL_PATH"]
   ```

   The wrapper (`scripts/operations/integration/cli.cjs`) derives the actual
   state independently — it binds the local origin URL to `--repo-full-name`,
   resolves the live `origin/<base>` SHA, queries the actual PR (state, base
   branch/SHA, head SHA, draft, mergeability), validates complete evidence
   semantics via the authoritative `integrity.verifyCandidate()`, and evaluates
   the live, producer-authenticated required-check rollup for the exact PR head.
   It never accepts a caller-supplied `--current-head`/`--expected-base` as
   evidence of remote state. `--expect-evidence-sha256` is **required**: the
   local A+ manual trust anchor — the operator-authorized digest is compared with
   the evidence document's exact bound `evidence_sha256` (self-consistency alone
   is insufficient). `--allow-draft` is required when the PR is a draft, because
   the canonical order runs the gate before marking the PR ready. It fails nonzero
   BEFORE any merge when: the evidence digest does not match the operator anchor;
   the evidence schema/outcome/acceptance commands are invalid; the remote PR head
   is not the evidence-bound candidate; `origin/<base>` drifted; the PR is
   closed/merged, not mergeable, or targets the wrong branch; the local checkout
   HEAD/tree is not the exact authorized object (a clean different commit with the
   same tree fails canonical mode); the worktree is dirty; or a required check
   (Operations Suite, Build — authenticated to the GitHub Actions producer) is
   missing/pending/failing/stale/from-another-app/skipped. Ordinary output is
   redacted (stable codes only); full reasons (check names, run IDs, URLs, app
   id/slug, timestamps, conclusions) are written only to a validated Tier-0
   `--detail-out` file. **Do not proceed if the gate exits nonzero.** The local
   integration path is mechanically fail-closed when this wrapper is used;
   GitHub-wide enforcement is not category B until the branch-protection ruleset
   is operator-enabled (candidate-integrity remains category A+ GitHub-wide until
   an independent trusted producer exists — see ADR Amendments 6 and 7).
7. Run the exact-candidate pre-push verification with explicit base and target:

   ```bash
   node scripts/git/pre-push-verify.cjs --ref="$LOCKED_BASE_SHA" --target="$CANDIDATE_SHA"
   ```
8. `git diff "$LOCKED_BASE_SHA"...HEAD --check`
9. Run `npm run build:isolated` once for the exact candidate.
10. **Pre-transport smoke is forbidden.** The retired smoke-before-deploy command
    did not verify an undeployed candidate. See
    `docs/governance/verifier-governance-migration-notes-2026-07-20.md`.
11. Push or confirm the reviewed branch normally with `git push origin HEAD:refs/heads/$BRANCH_NAME`
    and open or update the reviewed pull request. Hook bypass is forbidden; a
    failing hook is a release blocker — repair the underlying cause and retry.
12. Wait until Vercel reports Ready for that exact candidate SHA. Read the remote
    SHA back with `git ls-remote origin "$BRANCH_NAME"` to confirm; do not trust
    local branch state alone.
13. Run `MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy`
    to smoke the exact preview deployment.
14. Mark the PR ready and merge with a GitHub **merge commit** — run
    `gh pr merge "$PR_NUMBER" --merge --match-head-commit "$CANDIDATE_SHA"`
    (not squash, not rebase — the merge commit preserves the verified candidate
    SHA as a reachable parent). `--match-head-commit` is mandatory: it refuses to
    merge if the live PR head is not the exact verified candidate, preventing a
    different or newly pushed head from being merged after the gate decision.
15. **Post-merge reconciliation (mandatory).** Fetch the new `origin/main` and
    prove:
    - the final commit is a merge commit;
    - its first parent is the previously authorized base SHA;
    - its second / reachable parent is the verified candidate SHA;
    - `git rev-parse "$FINAL_MAIN_SHA"^{tree}` == `git rev-parse "$CANDIDATE_SHA"^{tree}`
      (final main tree is byte-identical to the candidate tree).
    If the trees differ, STOP and record an integration failure — do not mark
    released.
16. **Final-main checks.** From a clean checkout of the final main merge SHA,
    re-run: `node --test scripts/operations/tests/*.test.cjs`, `git diff --check`,
    `npm run verify:iterate`, `npm run build`, and the required exact-governance
    checks.
17. Wait for production Ready on the exact final merge SHA.
18. Only after merge and exact production deployment readiness, run
    `MDG_ALLOW_PROD_SMOKE=1 MDG_BASE=https://mainedispensaryguide.com npm run verify:post-deploy`.
19. Probe the expected production route after production smoke:
    `PRODUCTION_ROUTE=https://mainedispensaryguide.com/expected-route; curl --fail --silent --show-error "$PRODUCTION_ROUTE"`.
20. Execute release ordering exactly (evidence-first):
    1. Gather closeout evidence from the exact production deployment and route probes.
    2. Release the feature lease.
    3. Close the candidate card.
    4. Attach one final `status: released` metadata record with final main SHA,
       Vercel ID/URL, route, commands, deferred work, and the gathered closeout evidence.

## Emergency mode: cherry-pick + direct push (NOT canonical)

The cherry-pick + `git push origin HEAD:refs/heads/main` sequence is retained
**only** as a separately named emergency mode (e.g. GitHub merge unavailable).
If used, it carries its **own complete tree/HEAD binding**: the Integrator must
prove the pushed HEAD tree is byte-identical to the evidence-bound candidate tree
(`git rev-parse HEAD^{tree}` == `git rev-parse "$CANDIDATE_SHA"^{tree}`) and record
that proof in the release metadata. The normal integration command must never
validate one commit and permit another commit or tree to be pushed.

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

Before the merge, create only a `release-pending` draft record on the candidate card:

```json
{
  "status": "release-pending",
  "candidate_sha": "accepted-candidate-sha (= exact remote PR head)",
  "validation_commands": [
    "npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number $PR_NUMBER --evidence $EVIDENCE_PATH --expect-evidence-sha256 $EVIDENCE_DIGEST --allow-draft",
    "node scripts/git/pre-push-verify.cjs --ref=$LOCKED_BASE_SHA --target=$CANDIDATE_SHA",
    "npm run build:isolated",
    "git push origin HEAD:refs/heads/$BRANCH_NAME",
    "vercel ready wait on the exact candidate SHA",
    "MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy",
    "gh pr merge $PR_NUMBER --merge --match-head-commit $CANDIDATE_SHA"
  ],
  "deferred_work": [
    "list of deferred or follow-up tasks",
    "optional: blockers from this rollout"
  ]
}
```

Attach the final deployment metadata only after the complete closeout sequence in step 20:

```json
{
  "status": "released",
  "main_sha": "final-main-merge-sha",
  "candidate_sha": "verified-candidate-sha (second parent)",
  "parent_shas": ["base-sha (first parent)", "candidate-sha (second parent)"],
  "final_tree_sha": "final-main-tree-sha",
  "candidate_tree_sha": "candidate-tree-sha (must equal final_tree_sha)",
  "vercel_deploy_id": "deployment-id",
  "vercel_url": "https://your-production-deployment.vercel.app",
  "production_route": "https://mainedispensaryguide.com/expected-route",
  "validation_commands": [
    "npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number $PR_NUMBER --evidence $EVIDENCE_PATH --expect-evidence-sha256 $EVIDENCE_DIGEST --allow-draft",
    "node scripts/git/pre-push-verify.cjs --ref=$LOCKED_BASE_SHA --target=$CANDIDATE_SHA",
    "npm run build:isolated",
    "git push origin HEAD:refs/heads/$BRANCH_NAME",
    "vercel preview ready wait on the exact candidate SHA",
    "MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy",
    "gh pr merge $PR_NUMBER --merge --match-head-commit $CANDIDATE_SHA",
    "post-merge reconciliation: rev-parse $FINAL_MAIN_SHA^{tree} == rev-parse $CANDIDATE_SHA^{tree}",
    "node --test scripts/operations/tests/*.test.cjs (on final main)",
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
- Execute release in this strict sequence (evidence-first):
  - Gather closeout evidence from the exact production deployment and route probes.
  - Release the feature lease.
  - Close the candidate card.
  - Attach one final `status: released` metadata record (`main_sha`, `candidate_sha`, `parent_shas`, `final_tree_sha`, `candidate_tree_sha`, `vercel_deploy_id`, `vercel_url`, `production_route`, `validation_commands`, `deferred_work`, `closeout_evidence`).
- Confirm no residual lease remains in `/tmp` paths or shared lease stores.
