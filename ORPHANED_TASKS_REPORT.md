# Maine Dispensary Guide — Orphaned Tasks Report

> **2026-07-14 round-13 supersession notice:** This report's body is
> preserved as an April-June historical snapshot, not a current task queue.
> Its claims (including "zero outreach," unconverted PDF magnets, and a
> blocking GSC service-account gap) were re-triaged against `origin/main`,
> OpenSEO MCP access, `project-todos.md`, and the current filesystem.
> Use `project-todos.md` as the curated current queue and
> `BOT_COLLABORATION_HUB.md` for chronology.

## Current disposition (round 13)

| Historical item | Current disposition | Evidence / next owner |
|---|---|---|
| GSC indexing service-account gap | **No longer a blocking data-access gap** | OpenSEO MCP supplied live GSC search-performance data in round 1; service-account/OAuth normalization remains optional infrastructure work. |
| Domain warm-up + professional email usage | **Operator-side** | Purelymail/catch-all and 2026-07-07 backlink campaign exist; human-led follow-up is tracked in `project-todos.md`. |
| External partnerships | **Open, human-led** | 16 pitches sent 2026-07-07; await replies and follow up without autonomous outreach. |
| Founders Bible / PDF magnet | **In discovery** | Round 14 lead-magnet audit is the next planned research round; don't create content from this historical brief without the audit. |
| Internal linking / orphan count | **Re-measurement required** | `sprint-score` reports 2 current inbound-link orphans; `orphan-detector.cjs` stays read-only by deliberate policy (round 12). |

**Known current platform findings:**
- OCP's 187/65 annual-report facts and 107/49 live-roster facts are a
  deliberate dual-stat design, not a roster data-loss incident.
- GSC cron wrappers and crontab entries exist, but `cron.service` is absent
  on this host; scheduled data collection is blocked on operator-level
  scheduler enablement.
- `AGENTS.md` currently claims 13 reusable components while the filesystem
  has 18. The active design branch edits that file, so the correction is
  deferred to design-branch integration rather than force-applied here.

---

## Archived report snapshot

**Generated:** 2026-04-20 (last refreshed: 2026-06-07)
**Last Sprint:** Sprint 80 (cd705f8 — Jun 7, 2026)
**Historical Project Score:** 11/11 sprint-score, 223/223 smoke-200, 0 data-integrity failures

---

## Verification Summary

Items previously flagged as "pending" were audited for current accuracy:

| Item | Previous Status | Current Status | Action |
|------|----------------|----------------|--------|
| Sub-75 readability pages | PENDING | ✅ **RESOLVED** | All expanded (see below) |
| project-status.md | OUTDATED | ✅ **RETIRED 2026-06-07** | File removed (was 47 days stale, no consumers) |

### Sub-75 Pages — ACTUALLY ALL EXPANDED ✅

| Page | Was (Apr 5) | Now (Apr 20) | Status |
|------|-------------|---------------|--------|
| `maine-cannabis-cultivation-guide.astro` | 601 words | **3,569 words** | ✅ Expanded |
| `maine-cannabis-delivery-rules.astro` | 647 words | **1,525 words** | ✅ Expanded |
| `maine-cannabis-inventory-management.astro` | 667 words | **1,772 words** | ✅ Expanded |
| `maine-cannabis-marketing-compliance.astro` | 579 words | **4,777 words** | ✅ Expanded |
| `index.astro` (homepage) | ~300 words | **4,497 words** | ✅ Expanded |

**Conclusion:** The "sub-75 pages" issue is **resolved**. All flagged pages now exceed 1,500 words.

---

## ✅ VERIFIED COMPLETED ITEMS

1. **Score 100/100 (A)** — Achieved Apr 19
2. **0 TypeScript errors** — After Sprint 46 fix (still passing in Sprint 80)
3. **86 images generated** — 75 heroes + 12 infographics, 0 orphaned
4. **fal.ai integration** — Working, API key stored
5. **Internal linking** — 0 orphans (Apr 12 sprint)
6. **External links** — 0 broken links (47 unique URLs across 135 instances)
7. **GA4 Analytics** — Active (`G-614GHG67ZQ`)
8. **Purelymail DNS** — Configured (Apr 19)
9. **Tag system** — Added to Layout
10. **Psilocybin post** — noindex removed (council unanimous)

---

## Archived pending items (historical snapshot — see current disposition above)

### 1. GSC Indexing Status — UNKNOWN (Service-account gap, 2026-06-08)

**Last known data (Apr 9):**
- 42 pages marked "Discovered - currently not indexed"
- 5 pages indexed
- Root cause was thin content (now resolved)

**Current state (Sprint 78, 2026-06-08 diagnostic):**
- Ran `scripts/_diag-gsc-ga4-list.cjs` with `GOOGLE_APPLICATION_CREDENTIALS=/home/steve/.hermes/secrets/gcp-mdg-reader.json`
- Service account: `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com` — **authenticated successfully**
- GA4 properties visible: **0** (account empty)
- GSC sites visible: **0** (site list empty)
- **Root cause: the service account was created but was never added as a user on the GA4 property or the GSC site.** The key is correct, the APIs are correct, the scope is correct (`analytics.readonly` + `webmasters.readonly`) — but Google refuses to return anything because the service account email has no role on the target resources.

**What to do:**
1. **You can't add a service account to GSC or GA4 via the web UI — Google rejects `*.iam.gserviceaccount.com` addresses with "user not found" by design.** Service accounts can only be used via the API. The GSC property for MDG is owned by `stevekelly622@gmail.com` (personal Gmail). Two real paths:
   - **Path A (fastest, ~10 min):** Verify the GSC property as a **Domain property** (`sc-domain:mainedispensaryguide.com`) via a DNS TXT record in Porkbun, then the service account can query it via API using `webmasters.readonly` scope. (If the property is currently URL-prefix-only, it can only be queried by the human owner — no service-account access at all.)
   - **Path B (slower):** Generate an OAuth refresh token for `stevekelly622@gmail.com` and store it next to the SA key, switch the script from SA auth to OAuth user auth.
2. For GA4 (`G-614GHG67ZQ`): same constraint. The service account needs to be granted a role on the GA4 property *somewhere* — but the only "somewhere" is the GCP project, not the GA4 web UI. If `maine-dispensary-guide` is the GCP project that owns the GA4 property's data stream, the SA already has the right IAM role; if not, the GA4 property was created under a different GCP project. **Quickest sanity check:** in https://analytics.google.com → Admin → Property column → "Property details", look for the GCP project number — it should match the project that owns the SA (`project_id: maine-dispensary-guide` in the JSON key).
3. After either path, re-run `node scripts/_diag-gsc-ga4-list.cjs` — it should now return the property + site. Capture results and update this item.
4. Then check the Coverage / Pages report and update the Apr 9 numbers with real current data.

**Verification script location:** `scripts/_diag-gsc-ga4-list.cjs` (45 lines, no dependencies beyond `googleapis` already in `package-lock.json`). Run with:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/home/steve/.hermes/secrets/gcp-mdg-reader.json node scripts/_diag-gsc-ga4-list.cjs
```

---

### 2. Domain Warm-up — NOT STARTED ⚠️

**What exists:**
- Purelymail configured with catch-all routing to steve@mainedispensaryguide.com
- Research delivered (30-day ramp schedule, DNS checklist, cannabis-specific ESP guidance)
- Scripts created: `setup_purelymail_dns.ps1`

**What's missing:**
- No emails sent yet
- Warm-up ramp NOT started
- Outreach cannot begin without domain warm-up (reputation)

**What to do:**
- Start with 5 emails/day for 1-2 weeks
- Gradually increase to 10-20/day
- Use steve@mainedispensaryguide.com for all initial outreach

---

### 3. External Partnerships Outreach — ZERO DONE ⚠️

**What exists:**
- Strategy document: `link-outreach.md` (complete)
- Outreach templates: `docs/archive/2026-07-stale/OUTREACH_CAMPAIGN.md` (ready to use)
- Tracking table in `link-outreach.md` — all empty

**What's missing:**
- Zero outreach emails sent
- Zero backlinks acquired
- Zero media placements

**Priority targets (from link-outreach.md):**
1. Mainebiz — guest column pitch
2. Ganjapreneur — announcement submission
3. Maine Beacon — data story pitch
4. Cannabis Business Times — Maine market analysis
5. Maine Chamber — resource partnership
6. Maine SBDC — resource collaboration
7. SCORE Maine — mentoring partnership

**What to do:**
- Begin outreach with Tier 1 media (Mainebiz, Ganjapreneur)
- Follow 30-day domain warm-up before cold outreach
- Track all outreach in `link-outreach.md` tracking table

---

### 4. PDF Magnet (Founders Bible) — NOT CONVERTED ⚠️

**What exists:**
- Source content: `docs/archive/2026-04-roadmap-drafts/ROADMAP_FOUNDERS_BIBLE.md` (comprehensive)
- Also: `docs/archive/2026-04-roadmap-drafts/ROADMAP_BIBLE_V1.md`, `docs/archive/2026-04-roadmap-drafts/ROADMAP_ULTIMATE_EDITION.md`
- Landing page: `/download-checklist.astro` (exists)
- Lead capture: Formspree integrated (`xvgzlowz`)

**What's missing:**
- PDF conversion of markdown content
- Styled PDF download with branding
- Gate/confirmation page after form submit

**What to do:**
1. Convert `docs/archive/2026-04-roadmap-drafts/ROADMAP_FOUNDERS_BIBLE.md` to styled PDF
2. Use Heritage Authority design (Deep Spruce, Fraunces typography)
3. Add to download-confirmation flow
4. Consider PDF as primary lead magnet vs. current checklist

---

### 5. Professional Email (@mainedispensaryguide.com) — CONFIGURED BUT UNUSED ⚠️

**What exists:**
- Purelymail domain configured
- Catch-all routing active
- DNS setup via Porkbun API

**What's missing:**
- Not being used for outreach
- No email signature configured
- No email templates set up

**What to do:**
- Start using @mainedispensaryguide.com for all outreach
- Set up email signature with domain
- Configure email templates from `docs/archive/2026-07-stale/OUTREACH_CAMPAIGN.md`

---

## 🟡 BACKLOG (Future Phase — Not Blocking)

| Item | Priority | Notes |
|------|----------|-------|
| GEO Citation Tracker automation | LOW | Manual tracking in SEO dashboard |
| OpenRouter multi-agent router | LOW | Optional model diversity |
| Guest blog outreach | MEDIUM | Part of external partnerships |
| Municipal zoning resource pages | LOW | 15 towns × content = large effort |
| "Maine Cannabis FAQ" hub page | MEDIUM | SEO value for long-tail |
| Annual industry report PDF | LOW | Gated content opportunity |
| Affiliate/lead-gen monetization | LOW | Directory already has paid tiers |

---

## Archived historical recommended priorities (superseded by `project-todos.md`)

### Immediate (This Week)
1. **Verify GSC indexing** — One-time UI grant to `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com` on GSC + GA4, then re-run `scripts/_diag-gsc-ga4-list.cjs` to capture real coverage data (see item #1 above for step-by-step)
2. **Start domain warm-up** — Send 5/day initial emails
3. **Begin Tier 1 outreach** — Mainebiz, Ganjapreneur

### Next Sprint
4. **Convert PDF Magnet** — Style and integrate Founders Bible PDF
5. ~~**Update project-status.md**~~ — **RETIRED 2026-06-07**; file removed (47 days stale, no consumers)

### Future
6. **Continue outreach expansion** — Scale after initial responses
7. **Build municipal pages** — If city guides need reinforcement

---

## 📁 Relevant Files

| File | Purpose |
|------|---------|
| `link-outreach.md` | External link/partnership strategy + tracking |
| `docs/archive/2026-07-stale/OUTREACH_CAMPAIGN.md` | Email templates for outreach |
| `docs/archive/2026-04-roadmap-drafts/ROADMAP_FOUNDERS_BIBLE.md` | PDF magnet source content |
| `setup_purelymail_dns.ps1` | Email domain configuration |
| `BOT_COLLABORATION_HUB.md` | Full sprint history |
| `project-todos.md` | Todo tracking (needs update) |

---

*Historical report generated by Orchestrator — 2026-04-20; supersession notice added by Hermes Agent (parent) — 2026-07-14, round 13.*
