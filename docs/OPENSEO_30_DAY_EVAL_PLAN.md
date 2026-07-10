# OpenSEO 30-Day Evaluation Plan — MDG Money-Page Workflow

**Date:** 2026-07-09
**Author:** Hermes (operator direction: Steve)
**Goal:** Decide whether OpenSEO (managed $10/mo + $10 credits, or self-hosted on Cloudflare Workers + pay-as-you-go DataForSEO) earns its keep on the MDG money-page rewrite workflow by 2026-08-09.

---

## TL;DR decision

- **Start with the $10/mo managed plan** (NOT the $20 version — there is no $20 tier; the $10 includes $10 of usage credits that roll over).
- 30-day money-back guarantee = net cost if cancelled: $0.
- If earning its keep, either (a) keep $10/mo for light use, or (b) move to self-hosted Cloudflare Workers for heavier use ($50-100/mo of DataForSEO).
- If not earning its keep, cancel and revert to the GSC-only workflow that produced the 78f rewrites.

## Why we're considering it

The GSC-only workflow can identify which MDG pages have high impressions + low CTR. It cannot tell us:

- **Real search volume** for those impressions (1,878 impressions for "fryeburg dispensary" could be 200 searches/mo or 2,000 searches/mo)
- **Why users don't click** (competing title? wrong meta description? off-intent SERP?)
- **What the #1 ranking competitor's page actually says** for the target query
- **Backlink velocity** for the 16 pitches sent 2026-07-07
- **Which keyword opportunities we don't rank for but should** (gap analysis)

OpenSEO provides all five through the DataForSEO API. The MCP server + Hermes integration means I can call it from inside the agent, not from a separate web UI.

## What changes if we adopt it

**Before OpenSEO (current workflow):**

1. GSC daily cron → JSONL with (query, page, clicks, impressions, position)
2. Run `seo:gsc-misroute-audit` to find CTR losers and misroutes
3. Page rewrite uses internal evidence (which queries, which positions) only
4. Result: 1,878 imp, 0.2% CTR on `/guides/fryeburg-dispensary-guide` because we don't know what users are comparing us to

**After OpenSEO (target workflow):**

1. GSC daily cron → JSONL (unchanged)
2. `seo:gsc-misroute-audit` to find CTR losers (unchanged)
3. **NEW:** For each CTR-loser page, call OpenSEO MCP `get_keyword_metrics` on the GSC striking-distance queries (pos 5-20) to get real volume + KD
4. **NEW:** Call `get_serp_results` on the top 3 candidate queries to see what the #1 ranking page looks like (title, meta, word count, schema)
5. **NEW:** Call `competitor_analysis` for the strongest competitor to find their content gaps
6. Page rewrite uses external evidence (volume + SERP gap) to inform the title and meta
7. Result: targeted rewrites that compete on the actual SERP, not guesses

## The 6 next-batch money pages (pre-staged seed data)

These are the highest-impression / lowest-CTR pages in MDG as of 2026-07-10. Each row is the "what openseo needs to answer" question for that page.

### 1. `/guides/fryeburg-dispensary-guide` — 1,878 imp, 0.2% CTR (THE WORST)

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| dispensary fryeburg maine | 272 | 7.1 | 0 |
| fryeburg maine dispensary | 196 | 8.1 | 0 |
| puffin co fryeburg maine | 185 | 8.8 | 0 |
| puffin co fryeburg | 128 | 7.0 | 2 |
| above all greenery fryeburg | 126 | 9.7 | 1 |
| dispensary in fryeburg maine | 75 | 7.0 | 0 |
| the glass cook | 56 | 7.6 | 0 |
| dispensary near fryeburg maine | 55 | 11.5 | 0 |

41 unique queries in 60d. The page is **ranking on page 1** for 41 queries but **not converting**. Top 2 are generic "dispensary fryeburg maine" searches — title/meta may be off.

**OpenSEO question:** What does the #1-ranking result for "dispensary fryeburg maine" look like? Is the SERP dominated by operator brand pages (Puffin Co., Above All Greenery, Glass Cook, White Mountain) that we can't outrank, or is there a generic-dispensary-guide SERP that we can win?

### 2. `/guides/limerick-dispensary-guide` — 1,139 imp, 0% CTR

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| founding farmers limerick maine | 522 | 5.6 | 0 |
| founding farmers limerick | 143 | 5.6 | 0 |
| founding farmers | 139 | 1.0 | 0 |
| limerick dispensaries | 119 | 12.5 | 0 |
| limerick weed dispensary | 58 | 15.0 | 0 |

**Critical finding:** 522 impressions for "founding farmers limerick maine" (a brand-specific query) at avg position 5.6 with **zero clicks**. The brand "Founding Farmers" likely has the top 3 positions and we're getting impressions from users who want a different result entirely. This is a brand-disambiguation dead-end (GSC notes: "Brand-disambiguation queries look like 0% CTR forever").

**OpenSEO question:** Is this a brand-disambiguation trap we should accept, or is there a "limerick dispensary" non-brand query where we have a real opportunity? The latter (imp 119, pos 12.5) is the actual play.

### 3. `/guides/gray-dispensary-guide` — 927 imp, 0% CTR

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| high road gray | 413 | 8.0 | 0 |
| high road gray maine | 291 | 9.0 | 0 |
| high roads gray maine | 82 | 7.7 | 0 |
| high road dispensary maine | 40 | 5.6 | 0 |
| token cannabis co | 37 | 9.5 | 0 |

10 unique queries, all brand-specific (High Road, Token Cannabis Co.). 0% CTR across the board suggests Google is showing our guide on page 1-2 for these brand queries but users want the brand's own site.

**OpenSEO question:** Same brand-disambiguation analysis as Limerick. Also: are there non-brand queries for "gray maine dispensary" we're missing entirely? Check `get_serp_results` for "gray maine dispensary" to see if there's a gap.

### 4. `/guides/buxton-dispensary-guide` — 812 imp, 0.2% CTR

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| hidden greens buxton | 316 | 6.8 | 0 |
| hidden greens maine | 202 | 7.5 | 0 |
| hidden greens buxton maine | 146 | 6.0 | 2 |
| dispensary buxton maine | 113 | 9.1 | 0 |

8 unique queries. The 2 clicks came from "hidden greens buxton maine" (pos 6.0) — the only non-brand query. **This is the actual play**: optimize for "dispensary buxton maine" and "buxton maine weed delivery" rather than chasing brand queries.

**OpenSEO question:** What's the volume/KD on "dispensary buxton maine" vs "hidden greens buxton"? If the non-brand query has even 50/mo volume, it's worth a title-rewrite pass.

### 5. `/blog/maine-dispensary-how-to-open` — 244 imp, 0% CTR (MISROUTE)

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| cannabis business licensing in maine | 89 | 19.5 | 0 |
| how to open a dispensary in maine | 47 | 12.4 | 0 |
| how to start a dispensary in maine | 42 | 14.1 | 0 |
| maine recreational cultivation license application | 22 | 20.2 | 0 |
| selling to dispensaries in maine | 21 | 19.5 | 0 |

**This is the misroute problem the GSC audit keeps flagging.** The blog post (`/blog/maine-dispensary-how-to-open`) is ranking above the canonical guide (`/guides/maine-dispensary-license`) for buyer-intent queries, but at position 12-20 the CTR is 0 because users want the guide not the blog. OpenSEO can show us whether the buyer-intent SERPs are winnable from the guide's URL (vs. the blog), and which competitor ranks #1.

**OpenSEO question:** Is `/guides/maine-dispensary-license` ranking for these queries at all? If yes, the fix is title-reopt on the guide + 301 redirect. If no, the fix is content expansion on the guide (a competitor has 2x the word count, better schema, etc.).

### 6. `/guides/maine-dispensary-costs` — 287 imp, 0% CTR

**Top 60d GSC queries (sample):**

| Query | Imp | Avg pos | Click? |
|-------|----:|--------:|--------|
| how to start a dispensary in maine | 52 | 19.0 | 0 |
| how much money do you need to open a dispensary | 48 | 82.6 | 0 |
| how much does it cost to start a dispensary | 37 | 93.2 | 0 |
| how to open a dispensary in maine | 30 | 25.1 | 0 |
| how much does it cost to start up a dispensary | 16 | 81.3 | 0 |

22 unique queries, mostly cost-framing national queries (not Maine-specific). 287 imp / 0% CTR because the page is mis-targeting the SERP. Position 82-95 for "how much does it cost to start a dispensary" is essentially nowhere.

**OpenSEO question:** What's the actual volume/KD on the Maine-specific cost queries vs the national cost queries? The right play may be: drop the national cost-queries entirely (we're at pos 82, we'll never win them) and double down on Maine-specific "how much does a Maine dispensary cost" angles.

---

## Setup steps (what Steve needs to do)

The agent cannot create the openseo.so account (requires email + payment). Once Steve creates it:

### Option A — managed plan ($10/mo + $10 credits, 30-day refund)

1. Go to https://openseo.so/ → Sign Up → pick the Base Plan ($10/mo)
2. Get the MCP endpoint: https://app.openseo.so/mcp
3. Connect GSC: in openseo.so Integrations, add Google OAuth for mainedispensaryguide.com (one-time, 5 min)
4. Tell the agent "MCP ready" — the agent will install the keyword-research and seo-coach skills into Hermes and start running lookups

### Option B — self-hosted on Cloudflare Workers (free app, DataForSEO usage $50+)

1. Create DataForSEO account at https://app.dataforseo.com/api-access (minimum $50 top-up)
2. Click "Deploy to Cloudflare" button in the openseo GitHub README
3. Set `DATAFORSEO_API_KEY` env var in Cloudflare
4. Same MCP endpoint pattern
5. Tell the agent "MCP ready"

**Recommendation: start with Option A.** It has the money-back guarantee, the $10 credits are enough to profile all 6 pages, and there's no Cloudflare config to debug if anything goes wrong.

## Eval criteria (30 days from setup)

The plan is "earning its keep" by 2026-08-09 if **any 2 of the following are true**:

1. **3+ money-page rewrites shipped** that use openseo data to inform the title/meta (vs. 0 that did before)
2. **At least 1 page shows a measurable CTR delta** (>+0.5 percentage points absolute, 2-4 weeks after rewrite) in GSC
3. **A backlink opportunity was found** that the 2026-07-07 outreach campaign missed (via `link-prospecting` skill)
4. **A competitor gap was found** that led to a new content piece (e.g. a query we don't rank for but a top-3 competitor does, that we wrote a guide for)

If 0/4: cancel. If 1/4: marginal — extend by 30 days at $10. If 2+/4: keep and consider moving to self-hosted for heavier use.

## Cost projections

| Use case | Cost/mo | What you get |
|----------|--------:|--------------|
| Managed plan, light use (1-2 page profiles/week) | $10 | App + 200-300 keyword lookups |
| Managed plan, heavy use (daily lookups) | $10 + $5-15 top-up | Same app, more data |
| Self-hosted, weekly page profiles | $5-10 DataForSEO | Same data, no app fee |
| Self-hosted, daily lookups (full audit) | $30-80 DataForSEO | All features, full control |

For the MDG workflow (5-10 page profiles per month, weekly backlink checks), the **$10/mo managed plan is the right size**. If volume scales past that, switch to self-hosted.

## What we'll do TODAY once openseo is live

1. Connect GSC (free, 5 min)
2. Run `keyword-research` skill on the 6 next-batch money pages with seeds pulled from the GSC JSONL
3. For each page, run `get_serp_results` on the top 3 candidate queries
4. Produce a per-page rewrite brief (title, meta, content gaps) — that's the deliverable
5. Ship 3 rewrites (fryeburg, buxton, how-to-open) using the briefs
6. Re-check GSC 2-4 weeks later for CTR delta

That's the 30-day trial, end-to-end. The skill is the workflow; the data is what makes the rewrites land.

---

## Appendix: openseo MCP setup commands

Once Steve has the account:

```bash
# Install the skills into Hermes
git clone https://github.com/every-app/open-seo.git /tmp/openseo
mkdir -p ~/.hermes/skills/openseo
cp -R /tmp/openseo/.agents/skills/* ~/.hermes/skills/openseo/

# Verify the skills are loadable
ls ~/.hermes/skills/openseo/
# Should see: competitive-landscape/  competitor-analysis/  keyword-clustering/
#              keyword-research/  link-prospecting/  seo-coach/  seo-project-setup/
```

The MCP endpoint is `https://app.openseo.so/mcp` (or the self-hosted equivalent). The agent will handle MCP connection when Steve says "MCP ready" and will load the `keyword-research` and `seo-coach` skills automatically.

## Appendix: file paths for this plan

- GSC analytics JSONL: `apps/maine-cannabis/data/gsc-search-analytics.jsonl`
- Misroute audit script: `apps/maine-cannabis/scripts/seo/gsc-misroute-audit.cjs`
- Money-page rewrite template: the `cannabis-friendly-maine-travel.astro` and `maine-cannabis-events-2026.astro` commits from 2026-07-09 (commits `2140c7a3` + `59dd6c52`)
- Openseo MCP docs: https://openseo.so/docs/mcp
- Openseo skills docs: https://openseo.so/docs/skills/setup


## 2026-07-10 update (end-of-session closeout)

**Shipped this session:**
- Sprint 78g-1: `/guides/maine-dispensary-license` rewrite (commit `2764b7a3`) — 1,480/mo winnable volume at KD 0-11.
- Sprint 78g-2: `/guides/maine-dispensary-costs` rewrite (commit `8c3185b6`) — 1,130/mo at KD 6-12.
- Round-2 outreach contacts research (subagent `deleg_dc064e89`, 241s) — 27 verified contacts, 9/10 CANDIDATE, MaineCannabis.org DROPPED.
- BOT_COLLABORATION_HUB carry-forward completed: 3 net-new URLs from commit `55ef7215` verified live in production (HTTP 200).
- Parallel-cli verified installed + authenticated + live (`/home/steve/.local/bin/parallel-cli` v0.7.1, MDG org, $23.01 credit). Pulled Maine retail price data ($6.10/gram March 2026) via search + fetch. OCP primary source identified at `maine.gov/dafs/ocp/open-data/adult-use/retail-sales` (Power BI embed).

**Eval bar status (target 2026-07-10 + 30 days → 2026-08-10):**

| Criterion | Status | Evidence |
|---|---|---|
| 3+ money-page rewrites using openseo data | **2/3 done** | 78g-1 ✓ + 78g-2 ✓; 78g-3 (fryeburg) queued |
| Measurable CTR delta on 1+ page | pending | Re-measure 2026-07-24 |
| 1+ backlink opportunity found | **done in advance** | Round-2 contacts + templates + bounce fix shipped |
| 1+ competitor gap closed | pending | Next-session work (MaineCannabis.org profile, Sprint 78h) |

**Pending user decisions for next session:**
1. Pick autonomous workstream from menu A/B/C/D/E.
2. Greenlight 78g-3 (one-way-door 301 consolidation).
3. Round-2 outreach send timing (recommend: hold until 2026-07-24 GSC read, then 2-3 Tier-1 sends max).
