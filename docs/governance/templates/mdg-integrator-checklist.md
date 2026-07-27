# MDG Integrator checklist (operational)

## Canonical integration topology: GitHub merge commit (R1-C)

The normal integration path is a **GitHub merge commit**. The candidate is the
exact remote PR head; the Integrator never validates one commit and permits a
different commit or tree to be merged. The ordinary cherry-pick + direct-push
sequence is **not** the canonical path (see "Emergency mode" below).

## Required order (do not reorder)

1. `npm run workflow:status:fetch`
2. `git fetch origin --prune`
3. Confirm the candidate is the **exact remote PR head**: the independent
   verifier's evidence is bound to that candidate SHA, and the PR is open and
   targets `main`.
4. **Canonical integrity gate (mandatory, fail-closed).** Before marking the PR
   ready or merging, run the single canonical integration command:

   ```bash
   npm run ops:integrate -- \
     --repo-full-name steezkelly/maine-dispensary-guide \
     --pr-number <number> \
     --evidence <private-bound-evidence.json> \
     [--base-branch main] \
     [--expect-candidate <sha>] [--expect-base <sha>] \
     [--detail-out <private-detail.json>]
   ```

   The wrapper (`scripts/operations/integration/cli.cjs`, OPS-06B-P1 Child 2 +
   R1) **derives the actual state independently** — it fetches origin with
   pruning, resolves the live `origin/<base>` SHA, queries the actual PR (state,
   base branch/SHA, head SHA, draft, mergeability), and evaluates the **live**
   required-check rollup for the exact PR head. It never accepts a caller-supplied
   `--current-head`/`--expected-base` as evidence of remote state (explicit values
   are assertions only). It fails nonzero BEFORE any merge when: the remote PR
   head is not the evidence-bound candidate; `origin/<base>` drifted from the
   evidence base; the PR is closed/merged or targets the wrong branch; the local
   checkout HEAD/tree is not the exact authorized object; the worktree is dirty;
   the candidate is not based on the base; or a required check (Operations Suite,
   Build) is missing/pending/failing/stale/skipped. Ordinary output is redacted
   (stable codes only); full reasons (check names, run IDs, URLs, timestamps,
   conclusions) are written only to a validated Tier-0 `--detail-out` file.
   **Do not proceed if the gate exits nonzero.** The local integration path is
   mechanically fail-closed when this wrapper is used; GitHub-wide enforcement is
   not category B until the R1-E ruleset is operator-enabled (candidate-integrity
   remains category A+ GitHub-wide until an independent trusted producer exists —
   see ADR Amendment 6).
5. `npm run verify:iterate` — smoke-free verification of the candidate itself
   (parse, focused astro check, sitemap-postprocess, docs-vs-code,
   compressed-frontmatter, hero-image-naming, autoRelated-freshness).
6. **Pre-transport smoke is forbidden.** The legacy `npm run verify:push` (which
   smoked `https://mainedispensaryguide.com` before any candidate was deployed)
   has been retired. See
   `docs/governance/verifier-governance-migration-notes-2026-07-20.md`.
7. Mark the PR **ready for review** when the gate and verify pass.
8. **GitHub performs a merge commit** (`gh pr merge <number> --merge`). Do not
   squash or rebase — the merge commit preserves the verified candidate SHA as a
   reachable parent.
9. **Post-merge reconciliation (mandatory).** Fetch the new `origin/main` and
   prove:
   - the final commit is a merge commit;
   - its first parent is the previously authorized base SHA;
   - its second parent is the verified candidate SHA (the candidate is the
     reachable merged parent);
   - `git rev-parse <final-main>^{tree}` == `git rev-parse <candidate>^{tree}`
     (final main tree is byte-identical to the candidate tree).
   If the trees differ, STOP and record an integration failure — do not mark
   released.
10. **Final-main checks + production verification.** From a clean checkout of the
    final main merge SHA, re-run the operations suite, `git diff --check`,
    `npm run verify:iterate`, and `npm run build`; then run the standard
    release/deployment verification (Vercel Ready on the exact final SHA, and
    `npm run verify:post-deploy` with `MDG_PREVIEW_URL` set to the deployment
    URL). Record final merge SHA, candidate SHA, parent SHAs, final tree SHA,
    candidate tree SHA, and each result.
11. After production verification, execute release ordering exactly:
    1. Release the feature lease.
    2. Close the candidate card.
    3. Attach final release metadata record with `status: released`, final main
       SHA, Vercel ID/URL, route, commands, deferred work, and closeout evidence.
12. Record `closeout_evidence` in the final metadata record immediately after
    step 11, not before.

## Emergency mode: cherry-pick + direct push (NOT canonical)

The cherry-pick + `git push origin HEAD:refs/heads/main` sequence is retained
**only** as a separately named emergency mode (e.g. GitHub merge unavailable).
If used, it carries its **own complete tree/HEAD binding**: the Integrator must
prove the pushed HEAD tree is byte-identical to the evidence-bound candidate tree
(`git rev-parse HEAD^{tree}` == `git rev-parse <candidate>^{tree}`) and record
that proof in the release metadata. The normal integration command must never
validate one commit and permit another commit or tree to be pushed.

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

Before the merge, create only a `release-pending` draft record on the candidate card:

```json
{
  "status": "release-pending",
  "candidate_sha": "accepted-candidate-sha (= exact remote PR head)",
  "validation_commands": [
    "npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number <n> --evidence <private-evidence>",
    "npm run verify:iterate",
    "gh pr merge <n> --merge",
    "post-merge reconciliation: rev-parse <final-main>^{tree} == rev-parse <candidate>^{tree}",
    "vercel ready wait on the exact final-main SHA",
    "MDG_PREVIEW_URL=<preview-url> npm run verify:post-deploy"
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
  "main_sha": "final-main-merge-sha",
  "candidate_sha": "verified-candidate-sha (second parent)",
  "parent_shas": ["base-sha (first parent)", "candidate-sha (second parent)"],
  "final_tree_sha": "final-main-tree-sha",
  "candidate_tree_sha": "candidate-tree-sha (must equal final_tree_sha)",
  "vercel_deploy_id": "deployment-id",
  "vercel_url": "https://<deployment>.vercel.app",
  "production_route": "https://mainedispensaryguide.com/<expected-route>",
  "validation_commands": [
    "npm run ops:integrate -- --repo-full-name steezkelly/maine-dispensary-guide --pr-number <n> --evidence <private-evidence>",
    "npm run verify:iterate",
    "gh pr merge <n> --merge",
    "post-merge reconciliation: rev-parse <final-main>^{tree} == rev-parse <candidate>^{tree}",
    "node --test scripts/operations/tests/*.test.cjs (on final main)",
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
