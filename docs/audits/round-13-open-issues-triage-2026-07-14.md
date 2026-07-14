# Round 13 — Open-Issues Triage (2026-07-14)

> **For Hermes and friends:** this is the evidence record for the
> 2026-07-14 refresh of `project-todos.md` and
> `ORPHANED_TASKS_REPORT.md`. It is a read/triage round: preserve
> historical claims, label them as historical when stale, and do
> not manufacture a code change where the evidence says no change
> is needed.

## §T.1 — Scope

Standing-goal item: **review open issues**.

Inputs:
- `project-todos.md` (last refreshed 2026-07-08)
- `ORPHANED_TASKS_REPORT.md` (body last refreshed 2026-06-07)
- current `origin/main` at `c6d51f69`
- current `site-stats.json`
- current GSC cron wrappers, crontab, logs, and JSONL data
- `sprint-score.cjs --dry-run` from the primary checkout
- `data-integrity-check.cjs` from the primary checkout

Not in scope:
- changing live OCP facts without evidence
- enabling a system daemon or changing system scheduler state
- sending outreach or configuring Formspree
- force-editing `AGENTS.md` while the active design branch also
  edits it

## §T.2 — Findings

### T.2.a — OCP roster "drop" is a deliberate dual-stat design

`project-todos.md` described a potential fall from **187 stores /
65 municipalities** to **107 / 49**. Current `site-stats.json`
shows that this is not a drop in one canonical number:

| Field | Value | Meaning |
|---|---:|---|
| `activeAdultUseRetailStores` | 187 | 2025 OCP Annual Report state-of-market stat for site-wide stat cards |
| `activeAdultUseMunicipalities` | 65 | Same annual-report basis |
| `currentOcpLicenseeRoster.auRetailStores` | 107 | Live deduped OCP Store-type CSV count, refreshed 2026-07-08 |
| `currentOcpLicenseeRoster.auMunicipalities` | 49 | Live roster coverage count, same refresh |

The source file explicitly says the two parallel facts are
intentional and **"should NOT be conflated."**

**Disposition:** close the todo as *resolved by design*. Do not
rewrite all stat-card consumers or overwrite annual-report facts.

### T.2.b — GSC scheduling is configured but not running

Verified facts:

- `crontab -l` has:
  - `0 6 * * * /home/steve/.local/bin/mdg-gsc-daily.sh`
  - `0 7 * * 1 /home/steve/.local/bin/mdg-gsc-audit-weekly.sh`
- Both wrapper scripts exist under `/home/steve/.local/bin/`.
- `systemctl status cron` returns: `Unit cron.service could not be
  found.`
- `/home/steve/.local/log/gsc-daily.log` and
  `gsc-audit-weekly.log` last wrote on **2026-07-06**.
- `apps/maine-cannabis/data/gsc-search-analytics.jsonl` ends at a
  **2026-07-10** snapshot.

**Disposition:** mark scheduled measurement as *blocked*. The
crontab is not a working scheduler without a running cron
implementation. Enabling a system scheduler is operator/system
scope. OpenSEO MCP remains the verified live GSC measurement path
used by this session.

### T.2.c — Current quality snapshot

Primary-checkout command:

```bash
node apps/maine-cannabis/scripts/admin/sprint-score.cjs --dry-run
```

Result: **8/11** checks passed on 2026-07-14.

| Finding | Current result | Disposition |
|---|---|---|
| Built routes / sitemap | 278 HTML / 274 sitemap | ✅ expected four-route noindex delta |
| Broken images | 0 of 1,288 refs | ✅ |
| OCP roster freshness | 6 days (as-of 2026-07-08) | ✅ |
| Content-health | 7 regressions | 🟠 next SEO-audit candidate |
| Internal-link orphans | 2 | 🟠 triage, not auto-injection |
| Hub header | claims 100/100 but checks fail | 🟠 blocked on Hub overlap with design branch |
| Docs integrity | AGENTS says 13 components, filesystem has 18 | 🟠 blocked on `AGENTS.md` overlap with design branch |

The worktree's `sprint-score` fails more checks because it has no
`dist/` build artifact. That is expected; the primary-checkout
result above is the ground-truth snapshot.

### T.2.d — Historical orphan report must not masquerade as current

The historical report still describes:
- zero outreach sent
- a blocking service-account GSC data gap
- an unconverted Founders Bible magnet
- zero internal-link orphans

All are either superseded, no longer blocking, or need remeasurement.
The report body is retained as historical evidence; a prominent
round-13 supersession notice and current-disposition table now
redirect operators to `project-todos.md` for current work.

## §T.3 — Changes shipped in this round

1. **`project-todos.md`**
   - closed the OCP roster false-positive with the dual-stat evidence
   - closed obsolete Vercel environment-variable cleanup claim
   - surfaced the non-running GSC scheduler as an operator-level block
   - refreshed metrics from 2026-07-14 primary-checkout measurements
   - reclassified old theme/readability branch entries as coordination
     decisions, not active engineering tasks
2. **`ORPHANED_TASKS_REPORT.md`**
   - preserved historical body
   - added a clear supersession banner and current-disposition table
   - relabeled historical "ACTIVE" and "RECOMMENDED" sections
3. **This audit** records exact evidence and ownership boundaries.

## §T.4 — Follow-up ownership

| Item | Owner | When |
|---|---|---|
| Enable a functioning host scheduler, then verify cron outputs | Operator/system owner | before relying on daily GSC files |
| Resolve 2 internal-link orphans and other content-health regressions | Parent agent, next SEO-audit round | after design-branch overlap scan |
| Correct AGENTS component count (13 → 18) | Design-branch integration owner | when resolving the overlap |
| Correct Hub's stale 100/100 header claim | Hub/design integration owner | when resolving Pattern C Hub overlap |
| Audit existing lead magnets | Parent agent, round 14 | next planned round |
| Send/follow up partnership outreach | Operator | human-led process |

## §T.5 — Verification commands

```bash
# Current primary-checkout health snapshot
cd /home/steve/projects/maine-dispensary-guide
node apps/maine-cannabis/scripts/admin/sprint-score.cjs --dry-run

# Current documentation-vs-filesystem drift
node scripts/admin/data-integrity-check.cjs

# Cron configuration and actual evidence
crontab -l
systemctl status cron --no-pager
stat /home/steve/.local/log/gsc-daily.log \
     /home/steve/.local/log/gsc-audit-weekly.log
```

## §T.6 — Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial round-13 evidence record. |