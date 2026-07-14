# Maine Dispensary Guide — Project Todos

> **2026-07-14 refresh (round 13):** Refreshed against current
> `origin/main` post-rounds-1-12. Closed stale items. Surfaced
> the cron-not-running finding (project-todos #7). OCP roster
> reconciliation (#1) was a misdiagnosis — the 187/65 vs 107/49
> numbers are a deliberate dual-stat design (annual-report
> state-of-market vs live OCP licensee-roster). No data change
> needed.
> For sprint-by-sprint detail, see `BOT_COLLABORATION_HUB.md`
> (source of truth) or run
> `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` for
> the live health snapshot. This file is now a curated high-level
> view, not a hand-maintained changelog.

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Recently Closed (Sprint 78 series + closeouts)

- [x] **Sprint 78a–78t (Jun 6 – Jul 7):** 20+ delivered items — YMYL "Last reviewed" badges on 232/257 pages, transfer-of-ownership guide, conditional license guide, ROI refresh, visual-readability polish (9 fixes + AAA contrast for nav), 3 broken heroImage paths retired, security fixes on `pre-push-verify.cjs` + `audit-fix.cjs` (URL whitelist + `spawnSync`), self-cleaning orphan tsserver.js LSPs
- [x] **Backlink campaign (2026-07-07, commit `dbf5f0f6`):** 3 linkable assets + press kit + 16 pitches sent via Purelymail SMTP
- [x] **Formspree revert (Jul 6):** All 5 lead-magnet forms restored via Formspree external pipeline (`xvgzlowz`); dormant `/api/lead-capture.ts` + `/api/indexnow-key.ts` endpoints retired from prod (Playbook preserved in `docs/LEAD_CAPTURE_SETUP.md`)
- [x] **COA hero image fix (`cff15405`):** 6 broken responsive variants closed (rename to match Layout string-convention)
- [x] **`@astrojs/vercel` bump to v11.0.2 (`c1697430`):** succeeds in isolation; `vercel.json` `outputDirectory` flip flipped+reverted twice — structural incompatibility documented in Hub §"THIRD-SESSION POSTMORTEM"
- [x] **CI regression guard (`cd82300d`):** post-build assertion that `.vercel/output/functions/_render.func/.vc-config.json` exists; catches the next SSR-shape drift at CI
- [x] **Post-campaign hardening (`27976a18`, 2026-07-08):** `--force-resend` flag in send-outreach-pitches.py; per-send atomic log writes defeat parallel-invocation race window; opt-in BCC (`MDG_BCC_SELF=1`); file lock + atomic rename in `logSentEmail()`; `.eml` filename guard against undefined `messageId`
- [x] **Rounds 1-12 (Jul 14):** parent-agent session shipped SEO title/H1 alignment for fryeburg (1,850 imp / 0.5% CTR pivot), canonical-overrides registry + 2-of-3 caller migration, universal-language v1 spec (round/phase/turn/task/step vocabulary), AGENTS.md v1 vocab migration, March 2026 Spam Update policy audit + orphan-detector docstring correction. All commits live on `origin/main`. See Hub rounds 1-12 for full detail.

## 🟠 HIGH — Pending (Open for next round)

- [x] **OCP roster reconciliation** — **CLOSED BY DESIGN (round 13).**
  `site-stats.json` deliberately preserves two different facts:
  `activeAdultUseRetailStores: 187` / `activeAdultUseMunicipalities: 65`
  are the 2025 OCP Annual Report state-of-market figures for stat cards;
  `currentOcpLicenseeRoster.auRetailStores: 107` /
  `currentOcpLicenseeRoster.auMunicipalities: 49` are the live, deduped
  OCP Store-type CSV counts refreshed 2026-07-08 for directory cards.
  The file explicitly says these facts "should NOT be conflated." No
  site-wide stat rewrite is required.
- [ ] **External link partnerships** — 2026-07-07 backlink campaign sent
  16 pitches; await replies and continue human-led follow-up. This remains
  operator-side outreach, not an autonomous site edit.
- [x] **Vercel production-env cleanup** — **CLOSED (round 13 verification).**
  `AGENTS.md` records that production has zero environment variables after
  the 2026-07-06 cleanup; the former Purelymail variables are not present
  in production and no code reads them.
- [x] **Formspree autoresponder carry-forward** — **CLOSED BY 2026-07-13
  architecture decision.** PDF gates intentionally use mailto: + manual
  operator reply; Formspree Plus autoresponders are a paid optional upgrade,
  not a missing required setup. See `docs/LEAD_CAPTURE_SETUP.md` §§51-80 and
  `docs/FORMSPREE_AUTORESPONDER_RESOLUTION_2026-07-08.md`.
- [ ] **GSC scheduled measurement** — **BLOCKED: scheduler not running.**
  Crontab contains the 6am daily and Monday 7am weekly jobs, and both
  wrapper scripts exist, but `cron.service` is absent on this host.
  `~/.local/log/gsc-daily.log` and `gsc-audit-weekly.log` last wrote
  2026-07-06; `gsc-search-analytics.jsonl` last has a 2026-07-10 snapshot.
  System-level scheduler enablement is operator scope. OpenSEO MCP remains
  the verified live GSC query path used in round 1 and later analysis.
- [ ] **GA4 form-completion dashboard panel** — `lead_capture` events fire
  on all 5 forms; defer until at least seven stable days of data are
  available, then create a per-form GA4 exploration view.

## 🟡 Coordination / operator decisions

- [ ] **Theme 2026 → main merge decision** — pre-Sprint-50
  `feature/theme-2026-fusion` is now superseded in practice by the active
  `design/refined-editorial-foundation-20260713` redesign branch. Do not
  merge or rebase the old theme branch without an operator decision.
- [ ] **`sprint-78k-visual-readability-polish` branch disposition** — the
  previously-listed visual readability work has later production coverage;
  verify unique commits before choosing archive vs rebase. Do not rebase
  blindly.


## 🟡 MEDIUM — Backlog

- [x] **W7 download-cluster decision (Path A vs Path B)** — flagged in 2026-07-06 passdowns, re-surfaced across three sessions. Operator scope input needed.
- [ ] **3 lead-magnet PDFs** — operator decision still pending Path A (write fresh PDFs) vs Path B (point at existing PDF).
- [x] **54+ town-cluster hub pages** — Stage 1 foundation shipped 2026-07-08 (`d3d1b772` + `05b97945`); 5 hubs live at `/guides/{region}-cannabis-guide`. Stage 2 brief at `docs/STAGE_2_TOWN_CLUSTER_PILOT_BRIEF_2026-07-08.md`. Stage 3 deferred to the sprint after. Sprint-score 11/11, production live.
- [ ] **Dormant `/api/lead-capture.ts` endpoint** — still 404s on prod. Three options for re-enable: (a) post-build flatten `.vercel/output/{static,functions}` into `dist/`; (b) Vercel support; (c) abandon Astro SSR, use Vercel Edge Functions via a different adapter path. Playbook in `docs/LEAD_CAPTURE_SETUP.md`.
- [ ] **Defensive measure for hero-image variant naming** — `Layout.astro` derives 5 variants by string-convention; future uploads using dimension-suffix recreate the 6-404 bug. Worth utility-side guard.
- [ ] **Pre-push hook `--ignore-unrelated` flag** — currently blocks pushes on pre-existing image 404s even when no image ref changed in the diff.
- [ ] **Domain warm-up — `config/credentials/mainedispensaryguide.env`** still needs real credentials + more contacts.
- [ ] **86 OCP-only cities → expand top 10-15 by search volume into full guide pages.**
- [ ] **Vendor directory page with categorized service providers.**
- [ ] **Municipal zoning resource pages for each of the 15 opt-in towns.**
- [ ] **Maine Cannabis Industry Report — annual gated PDF with market data.**

## 🟢 LOW — Nice-to-Have

- [ ] **Founders-page hero images** — swap stock Unsplash for Maine-specific imagery.
- [ ] **Build GEO citation tracker** — currently manual via `/admin/seo-dashboard.astro`.

## ⚫ BACKLOG — Future Phase

### Phase: Authority Building
- [ ] Professional email domain setup (`@mainedispensaryguide.com`) — prerequisite for all outreach credibility.
- [ ] Guest blog outreach to Maine cannabis media outlets.
- [ ] Configure OpenRouter multi-agent router for additional model diversity (optional future).

### Phase: Monetization Infrastructure
- [ ] Affiliate links to cannabis-adjacent services (POS systems, insurance, banking).
- [ ] Featured directory listings (paid placement).
- [ ] Lead gen fees from referred businesses.

## Metrics Tracker (round-13 measured snapshot — `sprint-score` is canonical)

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| Sprint-score checks | 11/11 | **8/11** on 2026-07-14 | 🟠 3 actionable checks: content-health regressions, stale Hub header claim, AGENTS.md component-count drift |
| Sitemap URLs | >150 | **274** | ✅ (278 built HTML routes; four intentional noindex exclusions) |
| Guide pages | 175+ | **193** | ✅ |
| Blog posts | — | **36** | ✅ |
| Dist HTML pages | — | **278** | ✅ |
| Pages with FAQPage JSON-LD | — | **163** | ✅ |
| Internal-link orphans | 0 | **2** (sprint-score current) | 🟠 triage needed; read-only detector remains intentional |
| Hero images, broken refs | 0 | **0** of 1,288 refs | ✅ |
| OCP-Covered cities (live roster) | — | **49 municipalities / 107 Store-type licensees** | ✅ dual-stat design; see OCP item above |
| External domains linking | >10 | ~2 estimated, awaiting campaign landing | 🟠 human follow-up pending |

---

*Last updated: 2026-07-14 EDT (round-13 open-issues triage)*
*Previous full refresh: 2026-07-08 (Sprint 78 series refresh)*
*Source: `sprint-score.cjs --dry-run` from primary checkout, `data-integrity-check.cjs`, `site-stats.json`, cron-wrapper/log inspection, and filesystem ground truth. The component-count drift in `AGENTS.md` is intentionally left for design-branch integration because that file overlaps the active redesign branch.*
