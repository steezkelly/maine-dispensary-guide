# Maine Dispensary Guide — Project Todos

> **Official human-readable priority queue.** The Hermes Kanban board
> (`mdg-site`) owns task state, dependencies, and release evidence; this file
> sets the order of work for agents and sessions.
>
> **2026-07-14 reconciliation:** Current ownership and record locations are in
> `docs/governance/AGENT_WORKING_ORDERS.md`. Historical shipped work remains in
> `BOT_COLLABORATION_HUB.md`; this is not a changelog.

## Start here

```bash
cd /home/steve/repos/maine-dispensary-guide
git fetch origin --prune
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json
```

Do not start an item from this list without a scoped Kanban card, preflight,
and lease check. A candidate branch is not an authorization to duplicate work.

## P0 — Active ownership / integration only

- [ ] **Compose the Refined Editorial Foundation safely.**
  Active design work owns shared layouts/components and affected public pages.
  Preserve and isolate until its integration owner chooses a composed base.
  Evidence: `docs/governance/round-17-coordination-decision-memo-2026-07-14.md`.
- [ ] **Reconcile public OCP data trust in that composition.**
  Correct the annual-report retail figure to 180 where supported; retain the
  dated live 107/49 roster as a separate definition; correct coupled ROI math;
  and fix the refresh-script caregiver field mismatch with regression coverage.
  Do not patch affected public surfaces independently.
  Evidence: `docs/audits/round-17-trust-data-reconciliation-2026-07-14.md`.
- [ ] **Review existing candidate branches one at a time.**
  `chore/guides-description-trim-2026-07-14` and
  `refactor/homepage-design-tokens-2026-07-14` require fresh-base, scoped,
  independent review before integration. Do not batch them for tidiness.
- [ ] **Protect the active guide-title and shared-CSS worktrees.**
  Treat `chore/guides-title-trim-2026-07-14` and
  `refactor/css-extract-top3-2026-07-14` as owner-managed live worktrees:
  inspect current status, conflicts, and `origin/main` divergence immediately
  before an integration decision. Verify each bounded change from a fresh base;
  do not touch their paths or merge partial assets.

## P1 — Ready to specify after preflight

- [ ] **Re-measure SEO health and internal-link orphans from a built,
  production-aligned checkout.** Separate true content-health regressions from
  missing-`dist/` worktree noise. If defects are current, make small scoped
  remediation cards that do not conflict with design composition.
- [ ] **Create GA4 form-completion reporting only after confirming a stable,
  usable event window.** Build a per-form exploration/dashboard; report
  observed data, not causal lift.
- [ ] **Add a hero-image responsive-variant guardrail.** Prevent incomplete
  `.jpg/.webp/.avif` plus `-640w` sets from publishing; include a focused test.
- [ ] **Advance town-cluster Stage 3 as a controlled editorial initiative.**
  One hub/source-pack/reviewer cycle at a time; do not mass-generate thin
  locality pages. Existing Stage 2 evidence remains in the Hub and source packs.
- [ ] **Expand franchise menu data one operator at a time.** Keep unavailable
  menus explicitly unavailable; defer heatmaps and price comparisons until the
  existing three-snapshot threshold is actually met.

## P2 — Blocked on an operator or external event

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

- [x] OCP 187/65 versus 107/49 was initially treated as one mismatch. It is
  not: annual-report and live-roster values are different snapshots/definitions.
  Round 17 found the annual-report attribution itself needs a composed correction
  to 180, so handle that under P0 rather than resurrecting the old false-drop task.
- [x] Production Vercel environment-variable cleanup.
- [x] Formspree autoresponder is an optional paid upgrade, not a missing
  architecture requirement.
- [x] Static `/api/lead-capture` is retired by design; do not treat its 404 as a
  bug without a new architecture decision.

---

*Last reconciled: 2026-07-14 against `origin/main` `d4dd9f68`.*
*For task-state truth: `hermes kanban --board mdg-site list --json`.*
*For current agent routing: `docs/governance/AGENT_WORKING_ORDERS.md`.*
