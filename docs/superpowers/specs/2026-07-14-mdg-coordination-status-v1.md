# MDG Multi-Agent Coordination Status — v1 (2026-07-14)

> **For Hermes and friends:** this is the multi-agent coordination
> working doc. Records what we know about coordination between
> parallel agent worktrees, what conflicts have surfaced, and what
> coordination protocol we propose for future work.

This is the durable record for Steve's 2026-07-14 directive:
"I want you and the other agents to coordinate and figure out
together over time what is the correct direction for organization
of the files and filesystem."

## §C.1 — Known coordination patterns (as of 2026-07-14)

Three patterns of multi-agent interaction have been observed
across the rounds of the parent-agent session and the parallel
design-session worktree.

### Pattern A: fork-and-stale (resolved by integration)

The design-session worktree was created from an older `origin/main`
than the parent-agent's worktrees. When the design branch's diff
was examined, it appeared to have deleted files the parent-agent
had shipped on `origin/main`. After investigation, the deletion
was actually a fork-timing artifact: the design branch didn't have
those files at all in its working tree.

**Resolution**: integration worktree merges both branches. Files
shipped on `origin/main` survive. The pattern's appearance of
"deletion" was misleading.

**Example**: round 8 (continuous-integration-readiness) flagged the
design branch's apparent deletion of the v1 spec; round 9 confirmed
the v1 spec was actually fine on `origin/main`.

### Pattern B: architectural deprecation (legitimate removal)

The design-session worktree made a legitimate architectural
deprecation decision: wholesale-removing the franchise-data-
pipeline subtree shipped by the parent-agent in commit `be74317e`
(round 2). The removal included the `MenuBlock.astro` component,
the `dispensary-intel/` data tree, and the `menu-extract.cjs` +
`menu-coalesce.cjs` scripts.

**Resolution**: the parent-agent's round 6 escalation documented
the deletion; Steve 2026-07-14 said "do not worry about the strain
heatmap, that was mostly me talking aloud"; the franchise-data-
pipeline work is now retired per the parent-agent's round 6 (refit).

**Lesson**: when another agent makes a wholesale architectural
deprecation that affects your prior work, surface to operator,
don't force-merge or re-assert.

### Pattern C: Hub-section removal (open)

The design-session worktree has removed 5 Hub sections from
`BOT_COLLABORATION_HUB.md` in its current diff against
`origin/main`:

- Round 1 SEO reconnaissance (commit `1c560f8c`)
- Round 2 menu-data-pipeline (commit `be74317e`)
- Round 3 dark-spot cleanup (commit `830f9147`)
- Round 6 (refit) universal language v1 (commit `af9a12cc`)
- Round 9 v1 vocabulary glossary footer (commit `9ec962fe`)

These removals are clustered in the last 430 lines of the Hub
(single hunk from line 6631). The pattern is consistent with the
design branch cleaning up Hub sections they consider noise.

**Status**: **open coordination question.** This pattern is
distinct from pattern A (no fork-timing artifact — the design
branch's deletions are after the v1 footer, which is at the end of
the file). The removal is not a fork artifact.

Two readings:

1. **Defensive read**: the design branch is preserving only their
   own Hub entries, treating parent-agent entries as noise.
2. **Neutral read**: the design branch is consolidating redundant
   Hub entries into a tighter format; the parent-agent's content
   survives in a different form.

Without operator sign-off, we can't tell which reading is correct.

**Lesson**: when another agent removes a substantial chunk of your
documented work, **don't assume the best reading**. Surface to
operator and wait for direction.

## §C.2 — Coordination protocol (proposed, not yet enforced)

The lessons from §C.1 suggest a coordination protocol for future
multi-agent work. This is a proposal, not yet enforced.

### When you start a round

1. Pre-flight: `git diff origin/main <other-agent-branch>
   --name-only`. This is the round-8 continuous-integration-
   readiness check; it surfaces apparent conflicts before you
   commit.
2. If your path appears in the other branch's diff, investigate:
   - Is it a fork-timing artifact (Pattern A)? Re-verify against
     `origin/main`; usually the file is fine.
   - Is it an architectural deprecation (Pattern B)? Check the
     other agent's commit body for rationale. Surface to
     operator if the deprecation affects your prior work.
   - Is it a Hub-section removal (Pattern C)? Surface to operator
     and wait.
3. Document the conflict class in your commit body and Hub entry.

### When you commit + push

1. Verify:iterate for docs-only commits, full verify for code.
2. Push via explicit refspec
   (`branch:refs/heads/main`).
3. Hub append only if you're confident no other agent is removing
   Hub sections in the same area. Otherwise document the round in
   a new spec file (lower-conflict surface).

### When you receive a coordination message from the operator

1. Acknowledge briefly.
2. Operationalize the lesson in a future commit body or spec
   amendment (don't just apologize and move on).
3. Surface to the operator how you operationalized it in your
   next round summary.

## §C.3 — Open coordination questions for the operator

Per the audit doc §A.4 and the patterns in §C.1:

1. **Pattern C intent**: does the design branch's removal of 5
   Hub sections reflect defensive consolidation, noise cleanup,
   or something else? Operator input needed.
2. **Hub filename** (`BOT_COLLABORATION_HUB.md`): align with v1
   vocabulary (`AGENT_COLLABORATION_HUB.md`)? Operator decision.
3. **Sibling-repo clones** (`...-faq-jsonld`,
   `...-readability-audit`): keep, remove, or merge? Operator
   decision.
4. **File/command renames** (`sprint-handoff.cjs` →
   `round-handoff.cjs`, etc.): separate workstream or skip?
   Operator decision.

## §C.4 — Coordination signals (when to escalate)

The parent-agent escalates (writes a no-ship round + surfaces to
operator) when ANY of these signals appear:

1. A parallel agent's diff contains the path of a file you
   previously shipped.
2. A parallel agent's commit body explicitly references your work
   in a way that suggests deletion or major rework.
3. The operator directly asks about coordination.
4. The pre-flight check returns >0 path overlaps you can't
   classify as Pattern A.

When escalating, write a Hub entry that explicitly names the
conflict class (A/B/C/unknown), the surface area (file paths),
and the question you're asking the operator.

## §C.5 — Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial v1: §C.1 known coordination patterns (fork-stale, architectural deprecation, hub-section removal), §C.2 proposed coordination protocol, §C.3 open coordination questions, §C.4 coordination escalation signals. |