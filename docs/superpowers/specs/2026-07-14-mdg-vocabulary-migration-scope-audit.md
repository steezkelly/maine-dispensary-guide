# MDG Vocabulary Migration Scope Audit — 2026-07-14

> **For Hermes and friends:** this is the v1.2 amendment to the
> universal-language spec. Records the round 10 recon finding that
> the original deferred-migration list was misjudged, and the
> subsequent corrective actions.

## §A.1 — Round 10 recon finding

The universal-language v1 spec's v1.1 amendment (§11) listed a
deferred-migration scope for rounds 10+:

- `MDG_AGENT_HANDBOOK.md` (18 sprint mentions; round 10)
- `PROJECT_STATE.md` (16 deprecated mentions; round 10)
- `MISSION_CONTROL.md` (24 sprint mentions; round 11)

Round 10 performed a line-by-line recon on `MDG_AGENT_HANDBOOK.md`
and `PROJECT_STATE.md`. Round 11 performed the same on
`MISSION_CONTROL.md`. **The recon finding: zero of the listed
mentions are deprecated vocabulary.** Every flagged "sprint"
mention is one of:

- A **historical sprint number reference** (e.g., "Sprint 78e",
  "the 2026-06-07 Sprint 75 cascade"). These are labels for past
  work, like commit SHAs — renaming them would falsify the Hub's
  chronological record.
- A **file-name reference** (e.g., `sprint-handoff.cjs`,
  `sprint-score.cjs`). Per v1.1 §11.1, these are historical
  artifacts, not in the deprecated list.
- A **custom-command reference** (e.g., `/sprint-close`). Per
  v1.1 §11.1, these are user-facing artifacts, not in the
  deprecated list.

The 18 + 16 + 24 counts were inflated by including all three
categories. After applying v1.1 §11.1's scope rules, the actual
editable count is **zero**.

A second finding: `MISSION_CONTROL.md` is auto-generated (per the
file's own opening line: "Auto-generated (Sprint 79): this dashboard
is built from real data on every regeneration, not hand-edited.
Source: sprint-score output + filesystem + git log"). Editing it
by hand would just be overwritten on next regeneration, which runs
the historical sprint numbers from `sprint-score.cjs` back into the
output.

## §A.2 — Corrective actions

1. **Round 10 + round 11 collapse to a single no-ship round.** Both
   are recon-no-edit rounds; the same finding applies to both.
2. **The deferred-migration list in v1.1 §11.3 is now empty.** No
   forward-facing prose-only doc remains in MDG that contains
   prose-generic-noun usage of any v1.1 §8 deprecated term. The
   migration is complete.
3. **Historical sprint-number references remain in scope of the
   Hub's chronological record** and are explicitly preserved per
   v1 §7.
4. **`sprint-handoff.cjs`, `sprint-score.cjs`, `/sprint-close`** —
   file/command renaming is a separate workstream; see §A.4 below.

## §A.3 — Multi-Hub duplication observation (operator signal)

On 2026-07-14, the operator (Steve) observed that
`BOT_COLLABORATION_HUB.md` exists in multiple locations on the
filesystem. A filesystem scan confirms:

- 1 canonical repo-root instance at
  `/home/steve/projects/maine-dispensary-guide/BOT_COLLABORATION_HUB.md`
- 19 worktree-local instances under
  `/home/steve/projects/maine-dispensary-guide/.worktrees/*/BOT_COLLABORATION_HUB.md`
  (auto-clean on worktree drop; correct behavior for git worktrees)
- 2 sibling-repo instances at
  `/home/steve/projects/maine-dispensary-guide-faq-jsonld/BOT_COLLABORATION_HUB.md`
  and
  `/home/steve/projects/maine-dispensary-guide-readability-audit/BOT_COLLABORATION_HUB.md`
  (full git clones; operator decision pending)

The operator also noted that the `BOT_` filename prefix is a
historical team-internal name (back when "Bots" was the team's
preferred term for LLM agents). Per v1 §2, the canonical term is
now `agent` or `subagent`, not `bot`. The Hub filename
`BOT_COLLABORATION_HUB.md` is therefore a historical artifact,
analogous to the `sprint-handoff.cjs` situation in §A.2.

Per the operator's instruction: "coordinate and figure out together
over time what is the correct direction for organization of the
files and filesystem." This is a long-term coordination ask, not
a single-round fix. This audit doc surfaces the observation so
future agents see the multi-Hub pattern as a known item.

## §A.4 — Open coordination questions for operators/agents

1. **Should `BOT_COLLABORATION_HUB.md` be renamed to
   `AGENT_COLLABORATION_HUB.md`?** Aligns with v1 vocabulary.
   Breaking change for any tooling that references the filename.
2. **Should the sibling-repo clones** (`...-faq-jsonld`,
   `...-readability-audit`) **be removed, kept, or merged?** They
   predate the integration worktree pattern. Operator decision.
3. **Should `sprint-handoff.cjs` and `sprint-score.cjs` be renamed
   to `round-handoff.cjs` and `round-score.cjs`?** Aligns with v1
   vocabulary. Touches the pre-push hook and the `/sprint-close`
   custom command. Bigger migration.
4. **Should the Hub duplication be deduplicated via a symlink or
   shared file pattern?** Possible but breaks the git worktree
   assumption that every worktree has its own complete checkout.

None of these questions block the v1 vocabulary migration. They are
all separate workstreams. Future rounds can pick them up after
operator sign-off.

## §A.5 — Round 10 + 11 verification

- Round 10 recon: 0 prose-generic-noun usages of v1.1 §8 deprecated
  terms in `MDG_AGENT_HANDBOOK.md` or `PROJECT_STATE.md`.
- Round 11 recon: `MISSION_CONTROL.md` is auto-generated; editing
  it by hand is futile.

Both rounds produce **no-ship findings** and ship this audit doc
to record them.

## §A.6 — Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial §A.1-§A.5. Records the round 10/11 recon finding that the v1.1 deferred-migration list was misjudged. Documents the multi-Hub duplication as a known operator-facing observation. Surfaces four open coordination questions without resolving them unilaterally. |