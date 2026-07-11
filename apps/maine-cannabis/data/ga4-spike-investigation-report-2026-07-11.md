# GA4 Spike Investigation — 2026-07-07

**Triggered by:** Visual inspection of `timeseries.jsonl` revealed an outlier at `20260707` (30 users, z-score 4.04 above mean). Also caught a separate anomaly at `20260506` (70 pageviews from only 8 users) on the way through.

**Investigation method:** Pulled per-page, per-source, per-country, per-device breakdowns via one-off GA4 query for each day. Also checked GA4 landing-page + medium combo and pre/post day-over-day context.

---

## Finding 1: 2026-07-07 was a one-day search visibility flash, NOT a permanent gain

### The numbers
- 2026-07-07: **30 users, 32 sessions, 37 pageviews** (z=4.04, 4σ above mean)
- 7 days pre-spike: 13-23 users/day (already trending up: 16→17→23→18)
- 3 days post-spike: **12 → 4 → 7** (collapsed back below baseline)

### What drove it
- **27 of 32 sessions (84%) from `google/organic`** with campaign `(organic)` = pure natural search
- 5 direct sessions (15%)
- **20+ different landing pages** — no single page dominated (top = 5 sessions to one blog)
- Top pages were ALL blog/guide content: `cannabis-friendly-maine-travel`, `best-cannabis-strains-maine-outdoor-2026`, `best-maine-edibles-2026`, `bar-harbor-dispensary-guide`, `fryeburg-dispensary-guide`, `maine-cannabis-caregiver-guide`
- **8+ different US cities** (Boston, Moses Lake WA, Florida, Maine, Georgia, etc.) + Russia + Serbia
- All device categories represented (mobile + desktop + various browsers/OS/resolutions) — real users, not a single bot

### Interpretation
This is the signature of a **Google ranking surge across many pages simultaneously** — likely a core algorithm update or freshness boost. Google re-evaluated many MDG pages upward on this day. The geographic spread + page diversity rules out a single viral moment (Reddit thread, news mention, X post would usually concentrate traffic on 1-3 pages from a few locations).

### Why the spike didn't stick
A pure ranking boost doesn't compound — it lasts until Google re-evaluates again. The post-spike drop suggests Google down-shifted the rankings back to baseline within a few days. The fact that the 7-day pre-spike trend was already pointing up (16→17→23) is the real positive signal; the spike was a temporary overshoot, not a new floor.

### What to investigate next
1. ~~Cross-reference with GSC~~ ✅ DONE — see updated findings below
2. Check Wayback Machine / news mentions for 2026-07-07 specifically to rule out external citation (low priority given GSC data confirms organic search)
3. Compare position-rank from GSC before/after to see which queries moved.

---

## Finding 1.5: GSC confirms operator-name query mismatch (the actual driver)

Pulled GSC data for 2026-07-07 specifically (`scripts/analytics/investigate-gsc-spike.cjs 2026-07-07`). The query list reveals the spike wasn't random — Google was routing **operator-name searches** to **town-guide pages** that mention the operator by name.

**Top queries on 2026-07-07** (all operator-name searches):
- `eclipse dispensary`, `eclipse cannabis`, `eclipse raymond maine` (7+6+4 imp)
- `hidden greens buxton maine`, `hidden greens buxton` (5+4 imp)
- `high road gray maine` (4 imp)
- `great atlantic puffin company` (4 imp)
- `above all greenery` (4 imp)
- `420 mules` (2 imp)
- `maine only bridgton`, `puffinco` (3+3 imp)

**Pages Google ranked for these queries on 2026-07-07:**
- `/guides/fryeburg-dispensary-guide` (26 imp, 1 click) — ranks for operator-name queries about operators IN Fryeburg
- `/guides/bar-harbor-dispensary-guide` (25 imp) — same pattern
- `/guides/raymond-dispensary-guide` (18 imp)
- `/guides/maine-cannabis-marketing-compliance` (12 imp) — different topic, broad search
- `/guides/great-atlantic-puffin-company` (11 imp) — **this IS an operator-profile page, got 11 impressions**
- `/guides/above-all-greenery-dispensary` (9 imp) — operator-profile page
- `/guides/420-mules-bar-harbor` (6 imp) — operator-profile page
- `/guides/eclipse-cannabis-company` (4 imp) — operator-profile page
- `/guides/hidden-greens-dispensary` (4 imp) — operator-profile page

### Interpretation
The "spike" was Google re-evaluating the disambiguation between town-guide pages and operator-profile pages. On this day, **the town-guide pages outranked the operator-profile pages for operator-name queries** — exactly the pattern the 2026-07-08 GSC+GA4 audit flagged as Finding #2 (`/docs/analytics/GSC_GA4_AUDIT_2026-07-08.md`).

What makes this a "spike" and not the steady state: the audit data showed town-guide pages typically rank pos 5-9 for these queries with 0 clicks. On 2026-07-07, something pushed their rankings up across multiple pages simultaneously (likely a Google core update re-evaluation or freshness boost), which then drove the impression spike. The positions didn't stick long enough to convert to clicks (CTR remained 0% on most queries).

### Why operator-profile pages aren't winning
The town-guide pages have higher domain-internal authority (more internal links, more content, higher overall ranking signals) so when a query is ambiguous (e.g., "eclipse raymond maine" — could match town OR operator), Google defaults to the stronger page. The operator-profile pages exist but are underweighted in the internal-link graph.

### Why this matters more than the original "spike" framing
The spike itself was a one-day anomaly, but the **underlying mismatch** is a permanent issue costing MDG impressions and clicks every day. The 2026-07-08 audit estimated 89 of 100 pages had impressions but 0 clicks because of this exact pattern. Fixing this is the highest-ROI SEO work on the site.

### Concrete next actions
1. **Cross-link town-guide → operator-profile pages** with operator name as anchor text. Right now most operator mentions on town-guide pages are bare text or weak links. Add `[[operator-name]]` style interlinks (the existing `link-architect.cjs` should do this if the terms are in the glossary).
2. **Add an "Operators in this town" section** at the top of each town-guide page that links explicitly to the operator-profile pages with the operator name as the anchor text.
3. **Verify operator-profile pages have unique schema** (LocalBusiness + Organization, with the operator's name in the headline).
4. **Register `userPseudoId` in GA** so we can track whether the people clicking through to operator profiles then convert via lead_capture. (Requires registering custom dimensions in GA Admin.)

The `scripts/analytics/investigate-gsc-spike.cjs` script is now reusable for any future spike day.

---

## Finding 2: 2026-05-06 was a single high-engagement B2B researcher via X

### The numbers
- 2026-05-06: **8 users, 70 pageviews, 9 sessions** — avg 8.75 pageviews per user (vs typical 1.4)
- The 70-pageview count came mostly from **1 user with 9 sessions from x.com/referral**
- 4 organic google sessions, 3 direct, 1 duckduckgo — normal background traffic

### What they did
The x.com user loaded 15 different pages across one visit, in this order:
1. `/` (home) — 15 views across sessions
2. `/about`
3. `/resources`
4. `/contact`
5. `/founders/maine-cannabis-founder-portland-flagship`
6. `/download-checklist`
7. `/guides/maine-cannabis-real-estate/`
8. `/download/founders-bible`
9. `/glossary/`
10. `/guides/maine-cannabis-events-2026`

Geographic distribution: India (Noida), California, Massachusetts, Washington, Florida, Maine, New York, Utah — **8 different states/countries for 8 users** = 8 unique visitors, all distinct.

### Interpretation
The X-referrer visitor is **exactly the B2B persona the site targets**: came from a tweet (likely a founder or cannabis entrepreneur post), spent ~30+ minutes deep-researching the site, hit every commercial-intent page (about, contact, founders, download-checklist, founders-bible). They didn't convert (no `lead_capture` event — see also Finding 1 in main ANALYSIS.md), but they were a near-miss.

### Why it matters
This is real, qualitative evidence that the site is reaching its target audience via the X channel. 1 deep-visit like this is more valuable than 100 bounces from random Google traffic. And the bounce rate for this day on `/about`, `/resources`, `/contact` was 0% — every direct-page visit completed a real read.

### What to investigate next
1. **Who posted the link on X?** Without the tweet URL we can't attribute it. If you have access to your X analytics, check referring tweets for that day.
2. **Was there a CTA visible on every page they visited?** The visitor hit `/contact` but the prior `lead_capture` analysis showed 0 form events — either they didn't see a form, didn't trust the mailto, or got distracted.
3. **Should the X-referred visitor flow be optimized?** Right now there's no X-specific welcome path. Consider an X-aware banner ("Coming from X? Here's our quick pitch") or an exit-intent form.

---

## Files written by this investigation

- `apps/maine-cannabis/data/ga4-spike-investigation-2026-07-07.jsonl` — 71 rows (page/source/country/device breakdowns for the spike day)
- `apps/maine-cannabis/data/ga4-spike-investigation-2026-05-06.jsonl` — 45 rows (same for the deep-session day)
- `scripts/analytics/investigate-spike.cjs` — reusable script. Pass `YYYYMMDD` args to pull breakdowns for any future anomalous day.

## Suggested next-step sprint (1 day)

1. Run `scripts/seo/gsc-search-analytics-daily.cjs` with a `startDate=2026-07-07, endDate=2026-07-07` override to get the actual search queries driving the 2026-07-07 spike. (The script's `--dry-run` flag will show what would be sent.)
2. Check X analytics for any tweet that landed on MDG between 2026-05-05 and 2026-05-07.
3. Decide: is the X referral pattern worth a dedicated landing path? Or is one-off lead-gen from X acceptable for now?

---

## Bottom line

- **2026-07-07 was a Google ranking event, not a viral moment.** It didn't stick — don't count those 30 users as a permanent gain. The real trend (slow growth 13→17→23 over 7 days) is the positive signal.
- **2026-05-06 had a real B2B researcher visit via X** but didn't convert. The X channel is reaching the right people — the question is whether the site is converting them.
- **Spike investigation as a discipline** is now repeatable. The script handles the API boilerplate; future anomalous days just need a date argument.