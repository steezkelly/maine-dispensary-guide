# MDG Universal Language — v1 (2026-07-14)

> **For Hermes and friends:** this is the source-of-truth vocabulary for the
> Maine Dispensary Guide project. Other docs reference terms defined here.
> If you find a doc that uses a different term for one of the concepts
> listed here, prefer this doc's term and surface the divergence in the Hub.

This doc was written in response to a Steve directive (2026-07-14):
"the terminologies of these 'rounds' 'phases' 'turns' 'tasks' etc. should be
solidified so there is a universal language going on in our system."

## §1. Unit-of-work hierarchy

> The single most-ambiguous vocabulary in the project. Use these.

| Term | Definition | Typical scale | Lifecycle |
|---|---|---|---|
| **round** | A coherent piece of work with one branch, one commit-or-commit-series, one push, one Hub entry. "Round 4 — PROJECT_STATE.md cleanup" means a single commit (`3a17e4cf`) that did one thing end-to-end. | minutes-to-hours; a few hours max | Self-contained; can be "no-ship" (verified) or "ship" |
| **phase** | A larger scope of related rounds. Phase 1 of a redesign might contain 5-10 rounds. A phase is rarely a single commit. | days-to-weeks | Ends with an explicit verification event (e.g., integration merge, operator sign-off) |
| **turn** | One conversational back-and-forth between the operator and the agent. Multiple rounds can ship within a single turn if the agent self-dispatches. | one user-message | Tied to the conversation, not to a work artifact |
| **task** | A single actionable item with a clear "done" state, often inside a spec's task block. Rounds decompose into tasks. | 2-15 minutes | Self-contained; often has its own TDD cycle |
| **step** | A sub-action within a task. Usually a single command or single edit. | seconds-to-minutes | The leaf of the task tree |

**When in doubt about which word to use**: it's a **round** if it has its own
branch + push + Hub entry, a **phase** if it spans multiple rounds with
one shared goal, a **task** if it's listed inside a spec/plan document,
a **step** if it's inside a task's body, a **turn** if you're describing
a single message in a conversation.

**Historical usage that we are normalizing away from** (use the
canonical terms instead):

- "sprint" → use **round** (a sprint in this project is a round, not a
  Scrum sprint; the term was overloaded and confusing)
- "iteration" → use **turn** (if describing a conversation) or **round** (if
  describing a ship)
- "sub-round" / "sub-phase" / "sub-task" → use a numbered modifier ("round 5b",
  "phase 2a", "task 3.1") rather than nesting nouns
- "milestone" → use **phase** boundary (a milestone is a phase-end)

## §2. Agent / actor vocabulary

> Who or what did the work. Standardize the noun.

| Term | Definition |
|---|---|
| **operator** | Steve, the human. The only person who can authorize scope changes. |
| **agent** | The primary LLM doing sustained work in a session. One per session. |
| **subagent** | A delegated agent. Spawned via `delegate_task` or `dispatch_task` and runs in an isolated context. Always bounded by the parent agent's instructions. |
| **session** | One conversation with the operator. Has a unique session ID and a working memory context. |
| **worktree** | A git worktree — a working copy of the repo. Sessions work in a worktree, not in the primary checkout. |
| **worker** | Deprecated synonym for subagent. Do not use. |
| **helper** | Deprecated synonym for subagent. Do not use. |
| **automation** | A script, cron, or other non-agent automation. Not an agent. |

**When referring to a specific past actor** in a Hub entry or Hub
section: name the worktree or session, not just "the agent." E.g.
"the parent agent in the `chore/project-state-cleanup-2026-07-14`
worktree shipped commit `3a17e4cf`."

## §3. Domain classification

> Steve's own scheme: "engineering, design, SEO/GEO, etc." Codified.

| Domain | Scope | Canonical doc roots | Round-naming convention |
|---|---|---|---|
| **engineering** | Build system, runtime, CI/CD, scripts, package management, dependencies | `apps/`, `scripts/`, `AGENTS.md` | `chore/*`, `refactor/*`, `feat/*` |
| **design** | Visual design, layout, typography, color, hero imagery, site polish | `apps/maine-cannabis/src/components/`, `apps/maine-cannabis/src/styles/` (when present) | `design/*` or a designer's named worktree |
| **seo-geo** | Search engine optimization, sitemap, GSC, structured data, internal links, content gaps | `docs/seo/`, `apps/maine-cannabis/src/data/citations.json`, `apps/maine-cannabis/astro.config.mjs` (sitemap filter) | `chore/seo-*`, `chore/content-*` |
| **data** | Data engineering, pipelines, snapshot extraction, coalescence, OCP roster | `apps/maine-cannabis/src/data/`, `scripts/seo/` (where data-related) | `feat/data-*` |
| **operations** | Deploy, hosting, env config, monitoring, backups | `vercel.json`, `vercel-build.sh`, `apps/maine-cannabis/scripts/admin/` | `chore/ops-*` |
| **analytics** | GA4, GSC, dashboard, measurement, conversion tracking | `docs/analytics/`, `apps/maine-cannabis/scripts/analytics/` (when present) | `chore/analytics-*` |
| **agent-meta** | Project conventions, mnemosyne, hub, plans, terminal contract | `BOT_COLLABORATION_HUB.md`, `AGENTS.md`, `MDG_AGENT_HANDBOOK.md`, `.hermes/plans/` | `docs/*` |

A round usually touches one primary domain. If it crosses domains,
name the round by the *primary* domain and note the others in the
commit body and Hub entry.

## §4. Doc-type taxonomy

> Each doc should know what kind of doc it is. The filename should
> reflect the type.

| Type | Filename convention | Example |
|---|---|---|
| **spec** | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | `2026-07-13-mdg-refined-editorial-foundation-design.md` |
| **ADR** (architectural decision record) | `docs/adr/NNNN-<slug>.md` | `0001-formspree-to-mailto-leads.md` |
| **audit** | `docs/audits/YYYY-MM-DD-<topic>-audit.md` (when present) or inline in Hub | (use the date + topic pattern) |
| **incident** | `docs/incidents/YYYY-MM-DD-<topic>.md` (when present) | (no examples yet) |
| **report** | `docs/<domain>/<topic>-report-YYYY-MM-DD.md` | `docs/analytics/ICA_GA4_DELIVERY_CHECK_2026-07-13.md` |
| **plan** | `.hermes/plans/YYYY-MM-DD_HHMMSS-<slug>.md` | `2026-07-14_131745-mdg-seo-franchise-data-followups.md` |
| **glossary** (this doc) | `docs/superpowers/specs/YYYY-MM-DD-mdg-universal-language-v<n>.md` | this file |
| **pasdown** | `docs/SESSION_PASSDOWN_<state>_YYYY-MM-DD.md` | `docs/SESSION_PASSDOWN_OUT_2026-07-13.md` |

## §5. Status vocabulary

> Use the same word for the same condition across docs.

| Status | Meaning |
|---|---|
| **proposed** | The work is a draft; not yet approved by the operator. |
| **approved** | The operator has signed off on doing the work as described. |
| **in-progress** | The work is happening now in a worktree. |
| **shipped** | The work has been committed, pushed, and verified live in production. |
| **verified** | A specific verification step (smoke test, build, etc.) has passed. Always paired with what was verified. |
| **paused** | The work stopped for a non-blocker reason (operator pick needed, dependency arrived, etc.). Includes a one-line "why paused" in any status report. |
| **deprecated** | The work is intentionally abandoned. Includes a one-line "why deprecated." Do not delete deprecated docs — they document why the alternative exists. |
| **escalated** | The work has surfaced a decision the operator must make. Blocked on operator input. |

## §6. Mnemosyne-importance scale

> From the mnemosyne-tool skill (memory context) and observed practice.
> Use this scale for `mnemosyne_remember(...)` calls.

| Importance | When to use |
|---|---|
| **0.9 - 1.0** | Architectural decisions, sprint-ship records (one per shipped commit), or anything that flips the next agent's path |
| **0.7 - 0.89** | Tool/tooling discoveries, decisions with short-term blast radius, verified bugs |
| **0.4 - 0.69** | Domain facts, project conventions, stable patterns |
| **< 0.4** | Transient observations, "I noticed X" notes |

Per the agent meta-rules: never put operational noise (`git status`
output, "I ran the build and it worked") at importance ≥ 0.7. Reserve
0.7+ for decisions and surprises.

## §7. Hub-entry convention

> The Hub is the chronological log of multi-agent activity. Format
> rules keep it parseable.

- **Section heading:** `## Round N — <Title> (executed YYYY-MM-DD, <actor>)`
- **Round-naming:** include the round number, the topic, the executor
  role, and the date in the heading
- **Body subsections:** in this order —
  1. Trigger (what operator said, what dark spot surfaced)
  2. What shipped (table of files + actions)
  3. Pre-flight or verification (rounds 4-7 always did a pre-flight)
  4. Out of scope (named, not buried)
  5. Mnemosyne ID (optional, for the link to memory)
- **If the round was a no-ship round** (verified-closed dark spot, no
  commit), still write the entry. The "what shipped" section becomes
  "what was verified" and the verification method is the key value.

## §8. Deprecated / do-not-use terms

Surface these as a hit-list. If you find a new doc using any of
these, flag it.

- **sprint** (in this project) → use **round**
- **worker** → use **subagent**
- **helper** → use **subagent**
- **iteration** (when ambiguous) → use **turn** or **round** explicitly
- **milestone** → use **phase** boundary
- **dispatch** as a noun → use **worktree** or **commit** as appropriate
- **"automation" as a synonym for "agent"** → automation is a script or
  cron, not an LLM
- **"session" as a synonym for "worktree"** → sessions are conversations,
  worktrees are git checkouts

## §9. Reference: how to use this doc

- **New doc being written**: choose the right Type from §4 and
  follow its convention. Use the right Domain from §3 in the commit
  body and Hub entry.
- **Old doc using a deprecated term**: rename, replace, and add a
  Hub entry noting the terminology normalization.
- **Conflict with another agent's vocabulary**: surface in the Hub
  rather than re-asserting. The integration worktree resolves
  cross-branch conflicts, not parallel worktrees.
- **Unclear which term applies**: prefer the term that survives in
  the Hub. The Hub is the project's de-facto vocabulary source.
- **Need to add a new term**: edit this doc. New terms go in their
  right §, with a one-line definition. Bump version to v2 if the
  change is structural, v1.<n> if additive.

## §10. Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial v1: §1 unit-of-work hierarchy, §2 agent vocab, §3 domain classification, §4 doc types, §5 status vocabulary, §6 mnemosyne importance, §7 Hub convention, §8 deprecated terms, §9 usage, §10 change history |

## §11. v1.1 Amendment — 2026-07-14 (post-migration-survey)

### Scope of the §8 deprecated-term list

The v1 §8 list says "sprint → round" and "iteration → turn or round".
That list applies to **prose usage as a generic noun**. It does NOT
apply to:

- **File names that contain `sprint-` as a historical prefix**:
  `scripts/git/sprint-handoff.cjs`,
  `apps/maine-cannabis/scripts/admin/sprint-score.cjs`. These are
  named after the pre-v1 project convention and renaming them is
  out of scope for vocabulary standardization. They keep the legacy
  name because the file content's purpose (sprint-handoff = "after
  a round, generate a Hub entry from git history"; sprint-score =
  "compute the project's audit score") is functionally still
  applicable under the v1 vocabulary, just with a different word.
- **OpenCode custom command names**: `/sprint-close`. The command is
  user-facing; renaming it would break user muscle memory. The
  command's *semantics* align with the v1 round-end convention; the
  *name* is a historical artifact.
- **Domain-specific uses of "iteration"**: in AGENTS.md, the verify
  cycle's "iteration" mode (`npm run verify:iterate` is the
  command) is a domain word meaning "during the editing loop." It
  is NOT the deprecated synonym. Same for code-loop counter
  language ("Any loop >100 iterations" = any code loop that runs
  >100 times).

When a future migration sweep encounters one of these cases, do
NOT rename the file or command. Leave a Hub entry noting the
audit result and move on.

### Migration scope (per round 9, 2026-07-14)

Round 9 migrated **AGENTS.md only** — three lines of the most
"read this first" doc. The migration touch list:

- "Build once at end of sprint" → "Build once at end of round"
  (AGENTS.md, deprecated noun)
- "Sprint Retrospective (Every Multi-Step Sprint)" → "Round
  Retrospective (Every Multi-Step Round)" (AGENTS.md, section header)
- "After completing any sprint with 3+ steps" → "After completing
  any round with 3+ steps" (AGENTS.md, deprecated noun)

Five file/path mentions were left intact as historical artifacts
per the scope rule above (`sprint-handoff.cjs`, `sprint-score.cjs`,
`/sprint-close`, `verify:iterate` cycle references, code-loop
counter language).

### Deferred migration (named explicitly, NOT buried)

- **MDG_AGENT_HANDBOOK.md** — 18 sprint mentions; round 10.
- **PROJECT_STATE.md** — 16 deprecated mentions; round 10.
- **MISSION_CONTROL.md** — 24 sprint mentions; round 11.
- **Hub body migration** — 527 deprecated-term occurrences across
  ~459 Hub sections. The Hub preserves the chronological record
  verbatim per §7 ("the Hub is the project's de-facto vocabulary
  source") and per the v1 §9 ("use the term that survives in the
  Hub"). Migration here would falsify history. The Hub gains a
  **v1 vocabulary footer** that maps deprecated terms to canonical
  terms going forward, so future agents reading the Hub get the
  mapping without the body being rewritten.
- **File-name renaming** — `sprint-handoff.cjs` →
  `round-handoff.cjs` etc. is a separate workstream that would also
  require updating the pre-push hook and the `/sprint-close`
  custom command. Out of scope for vocabulary standardization.

### Change history (v1.1)

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | v1.1: §10 amendment scope rules + §11 deferred-migration scope. The v1 spec was correct in principle; the migration needed scope guards the v1 itself didn't spell out. |
