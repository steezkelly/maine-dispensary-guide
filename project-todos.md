# Maine Dispensary Guide — Project Todos

> **2026-07-08 refresh:** This file was 33 days stale (last touched 2026-06-05).
> Refreshed to reflect Sprints 78a–78t + the 2026-07-07 backlink campaign.
> For sprint-by-sprint detail, see `BOT_COLLABORATION_HUB.md` (source of truth)
> or run `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` for the
> live health snapshot. This file is now a curated high-level view, not a
> hand-maintained changelog.

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

## 🟠 HIGH — Pending (Open for next sprint)

- [ ] **OCP roster reconciliation** — `refresh-site-stats.cjs --dry-run` reports live count dropped from 187 stores / 65 municipalities → 107 / 49 between April and July 2026. Writing this drops every page that reads from `site-stats.json` and forces re-audit of the 7-page hardcode class (`404.astro`, `index.astro`, etc.). Operator scope: confirm the live count is correct, decide whether the drop reflects license non-renewals or stale-CSV reclassification.
- [ ] **Theme 2026 → main merge decision** — held on `feature/theme-2026-fusion` since pre-Sprint 50; spruce + cream palette + elevation tiers, low technical risk (token-level override, reversible).
- [ ] **`sprint-78k-visual-readability-polish` branch** — 11 commits behind main (`6940e2b6`); all green, all verified, needs rebase onto current main + ship decision.
- [ ] **External link partnerships** — 5 warm-up emails sent (Mainebiz, Ganjapreneur, Maine Beacon, Cannabis Business Times, Maine Chamber/SBDC/SCORE outreach pending). 2026-07-07 backlink campaign sent 16 pitches; await replies.
- [ ] **Vercel env vars cleanup** — `PURELYMAIL_SMTP_USER`, `PURELYMAIL_SMTP_PASS`, `MDG_FROM_ADDRESS`, `MDG_REPLY_TO` still in production Vercel from a 2026-07-06 failed activation; harmless (no code reads them) but stale. `vercel env rm <name> production`.
- [ ] **Formspree autoresponder (5-min operator task)** — `xvgzlowz` form needs the autoresponder wired with attachment = `public/downloads/maine-first-timer-field-guide.pdf`. Until done, success-screen + direct-download work; only the email-delivered PDF is missing.
- [ ] **GSC data pull** — OAuth re-auth needed for per-query × page slice. Cron `~/.local/bin/mdg-gsc-daily.sh` (6am daily) + `~/.local/bin/mdg-gsc-audit-weekly.sh` (Mon 7am) installed 2026-07-07; verify they're firing and producing useful rows.
- [ ] **GA4 form-completion dashboard panel** — `lead_capture` events fire (Sprint 76) on all 5 forms; needs ~7 days of data + a GA4 exploration view to surface per-form conversion.

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

## Metrics Tracker (live snapshot — run `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` for canonical view)

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| Sprint-Score checks | 11/11 | **9/11** | 🟠 (2 stale OCP + docs are deterministic / refreshable on demand) |
| Sitemap URLs | >150 | **258** | ✅ |
| Guide pages | 175+ | **186** (111 city + 75 technical/operator) | ✅ |
| Blog posts | — | **36** | ✅ |
| Dist HTML pages | — | **262** | ✅ |
| Pages with FAQPage JSON-LD | — | **159** | ✅ |
| Internal-link orphans | 0 | **0** (per content-health baseline) | ✅ |
| Hero images, broken refs | 0 | **0** of 1893 refs | ✅ |
| OCP-Covered cities (directory) | — | **159** | ✅ |
| External domains linking | >10 | ~2 estimated, awaiting link-campaign landing | 🟠 HIGH |

---

*Last updated: 2026-07-08 EDT (Sprint 78 series refresh)*
*Previous full refresh: 2026-06-05 (Sprint 50 closeout)*
*Source: BOT_COLLABORATION_HUB.md latest entries + `apps/maine-cannabis/scripts/admin/sprint-score.cjs` output + filesystem ground truth*
