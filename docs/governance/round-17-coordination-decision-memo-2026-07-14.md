# Round 17 — Coordination Decision Memo

**Date:** 2026-07-14
**Status:** decision record; no rename, deletion, merge, or implementation authority
**Scope:** multi-agent coordination while `design/refined-editorial-foundation-20260713` remains separate from `origin/main`

## Decision

Round 17 adopts a **preserve and isolate** posture until an operator-approved integration decision:

1. `BOT_COLLABORATION_HUB.md` remains at its current path. This round does not rename it, create an alias, rewrite its tail, or designate a replacement.
2. Sibling worktrees/clones remain untouched. This round does not remove, merge, or re-home them.
3. Historical `sprint-*` files and commands remain untouched. Universal Language v1 can guide new writing without retroactively renaming history.
4. New coordination records belong in dated, low-conflict documents such as this memo—not in the Hub tail while its intended redesign treatment remains unresolved.
5. Source-page work that overlaps the design branch is deferred. The owner of the redesign/integration decision chooses the final composition.

## Evidence checked

| Check | Result | Consequence |
|---|---|---|
| Worktree preflight | `npm run workflow:status:fetch` listed this branch as `synced-clean`; it also showed numerous unrelated dirty/diverged/stale worktrees. | This round stayed on a named worktree and did not integrate anything. |
| Current design worktree | Local head `f860ef24ba8a621a3ea1377797b17175f536b7cd`; committed diff versus `origin/main` spans shared components, layouts, and many page files. | Treat broad source-page edits as design-overlapping even where an individual change looks small. |
| Trust-audit candidate paths | The current design diff includes `/find-a-dispensary` and broad page/component surfaces. | The audit reports corrections but does not patch public source paths in parallel. |
| Hub status at current design head | `git diff origin/main...HEAD -- BOT_COLLABORATION_HUB.md` returned no committed Hub diff. | The older `coordination-status-v1` interpretation of Hub-section removal is not treated as a current fact without revalidation. |
| Existing coordination record | `docs/superpowers/specs/2026-07-14-mdg-coordination-status-v1.md` documents the historical questions: Hub intent, sibling clones, and legacy terminology. | Those remain operator-gated rather than being silently decided in a cleanup commit. |

## Why this is the safe interim direction

The design branch is now materially broader than a single Portland page. Its committed changes touch shared header/layout surfaces and a large set of content pages. A seemingly narrow source correction can therefore create either a textual merge conflict or a design-composition conflict.

Documentation-only work remains useful because it preserves the evidence, gives integration a bounded patch manifest, and does not make an irreversible organizational decision on the operator's behalf.

## Integration protocol

Before any source correction from the accompanying trust audit is applied:

1. Rebase or merge the candidate on the actual design-integration base.
2. Re-run the official-source checks and confirm whether OCP has published a newer annual report or live download.
3. Reconcile each user-visible metric by **snapshot, definition, and as-of date**—never by choosing the larger or more convenient number.
4. Make one reviewable reconciliation patch; do not mix it with a Hub rename, clone cleanup, or historical terminology migration.
5. Run the canonical verification pipeline and production check only after integration owns the composed source tree.

## Operator decisions still required

| Decision | Default until decided |
|---|---|
| Does the design work intend to replace, compact, or preserve the Hub? | Preserve current file; do not append to its conflict-prone tail. |
| Should `BOT_COLLABORATION_HUB.md` be renamed to match Universal Language v1? | No rename. |
| What should happen to sibling clones/worktrees? | No deletion or consolidation. |
| Should historical `sprint-*` names be migrated? | No historical rename; use phase → round → turn → task → step only for new documents. |

## Exit criteria for Round 17

- This memo and the trust audit exist as dated evidence.
- No collaboration Hub, clone, or historical artifact was renamed or deleted.
- No overlapping public source was changed ahead of design integration.
- The next integrator has a precise, evidence-backed reconciliation manifest.
