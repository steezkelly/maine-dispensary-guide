# Maine Dispensary Guide — Project Todos

> **Official human-readable priority queue.** The Hermes Kanban board
> (`mdg-site`) owns task state, dependencies, and release evidence; this file
> sets the order of work for agents and sessions.
>
> **2026-07-19 reconciliation:** Current ownership and record locations are in
> `docs/governance/AGENT_WORKING_ORDERS.md`. Historical shipped work remains in
> `BOT_COLLABORATION_HUB.md`; this is not a changelog.

## Start here

```bash
cd <fresh checkout of maine-dispensary-guide>
git fetch origin --prune
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json
```

Do not start an item from this list without a scoped Kanban card, preflight,
and lease check. A candidate branch is not an authorization to duplicate work.

## P0 — Active ownership / integration only

- [ ] **Reconcile residual public OCP data trust after fresh-source
  revalidation.**
  The completed Refined Editorial release is no longer a dependency. First
  revalidate the official OCP annual report and current roster sources; then
  create a separate bounded implementation contract. Preserve the 2025
  annual-report retail count (`180`) as distinct from the dated operational
  roster (`107` stores across `49` municipalities). The confirmed boundary
  includes centralized stats metadata, coupled ROI arithmetic, license-map and
  finder snapshot claims, market-stats consumers, and the refresh-script
  caregiver field mismatch. Do not edit those surfaces under this docs task.
  Evidence: `docs/audits/round-17-trust-data-reconciliation-2026-07-14.md` and
  Kanban card `t_6541e171`.
- [ ] **Review existing candidate branches one at a time.**
  `chore/guides-description-trim-2026-07-14` and any surviving homepage-token
  candidate require fresh-base, scoped, independent review before integration.
  Do not batch them for tidiness.
- [ ] **Protect ownerless guide-title and shared-CSS recovery evidence.**
  Inspect each live recovery card, worktree, lease, and `origin/main`
  divergence before an integration decision. Do not touch their paths or merge
  partial assets.

## P1 — Ready to specify after preflight

- [ ] **Re-measure SEO health and internal-link orphans from a built,
  production-aligned checkout.** Separate true content-health regressions from
  missing-`dist/` worktree noise. If defects are current, make small scoped
  remediation cards.
- [ ] **Create GA4 form-completion reporting only after confirming a stable,
  usable event window.** Build a per-form exploration/dashboard; report
  observed data, not causal lift.
- [ ] **Advance town-cluster Stage 3 as a controlled editorial initiative.**
  One hub/source-pack/reviewer cycle at a time; do not mass-generate thin
  locality pages. Existing Stage 2 evidence remains in the Hub and source packs.
- [ ] **Expand franchise menu data one operator at a time.** Keep unavailable
  menus explicitly unavailable; defer heatmaps and price comparisons until the
  existing three-snapshot threshold is actually met.

## P2 — Blocked on an operator or external event

- [ ] **Broader template migration.** The Refined Editorial foundation and proof
  surfaces are released, but wider page-local migration remains a separate
  operator decision. Card `t_5b8b3a86` records a prior coordination collision;
  its named branch/worktree are absent. Resume only after explicit operator
  go/no-go plus a fresh-base contract, branch, worktree, lease, and visual gate.
- [ ] **Restore scheduled GSC measurement.** Blocked because the host has no
  running cron implementation even though wrappers/crontab entries exist.
  Resume only after a functioning scheduler produces fresh daily/weekly logs.
- [ ] **Partnership follow-up.** The backlink campaign is human-led; await
  replies or operator direction before sending further outreach.
- [ ] **Choose the lead-magnet PDF scope.** Operator decision required:
  Path A (write fresh assets) or Path B (route to existing assets), with named
  target magnets.
- [ ] **Dispose of legacy theme/readability branches.** Reconcile unique commits
  against fresh `origin/main`; archive/rebase only after the integration owner
  has a documented disposition.

## P3 — Backlog, not a current dispatch

- [ ] Vendor directory with categorized service providers.
- [ ] Municipal zoning resource pages for opt-in towns, based on verified local
  sources rather than templated thin pages.
- [ ] Annual Maine Cannabis Industry Report lead magnet, after PDF scope and
  source/update cadence are defined.
- [ ] Maine-specific founders-page imagery.
- [ ] GEO citation tracker improvement after a measurable reporting requirement.
- [ ] Monetization surfaces only after a category reaches `destination_live` in
  the documented maturity model; no automatic affiliate CTA from a candidate.

## Closed / do not reopen without new evidence

- [x] **Refined Editorial Foundation + ICA completion.** PR #91 merged as
  `c6d3d454`; production evidence and the release tag resolve to `44c67423`;
  the project-wide control-size audit resolves to `3e42aed7`.
- [x] **Hero-image responsive-variant publication guard.** Merged via PR #80;
  keep duplicate-asset content remediation separate from the publication guard.
- [x] OCP annual-report versus operational-roster values are distinct facts, not
  a simple decline. The unresolved correction is the false `187` annual-report
  attribution and coupled consumers; handle that under P0 while preserving the
  dated `107/49` operational snapshot.
- [x] Production Vercel environment-variable cleanup.
- [x] Formspree autoresponder is an optional paid upgrade, not a missing
  architecture requirement.
- [x] Static `/api/lead-capture` is retired by design; do not treat its 404 as a
  bug without a new architecture decision.

---

*Last reconciled: 2026-07-19 against current `origin/main`; inspect live Git
state before dispatch or integration.*
*For task-state truth: `hermes kanban --board mdg-site list --json`.*
*For current agent routing: `docs/governance/AGENT_WORKING_ORDERS.md`.*
