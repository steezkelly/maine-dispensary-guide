# MDG Link-Building Strategy — 2026-07-04

## What the audit showed (data)

**MDG current external link footprint:**
- 311 unique external URLs cited across 290 Astro files — strong on outbound primary-source citations (operators, legislature.maine.gov, OCP, news).
- Almost no inbound backlinks yet — MDG is referenced by our own pages + a handful of SEO/scrape directories (dopeseo.com, courseformarijuana.com) but **no editorial backlinks from peer cannabis publications, Maine news outlets, or industry trade press.**

**The gap:** we cite primary sources well, but other publications don't cite us back. That's the standard pattern for a new YMYL site — citations build outbound credibility but don't compound without inbound authority. Guest posting + journalist outreach fixes it.

## Strategy: 4 channels, ranked by ROI

### Channel 1 — Guest posting (highest priority, ~3-5 hours per piece)

Three target tiers, prioritized by editorial authority + topical fit:

**Tier A — Maine-specific publications (start here, best topical fit):**
| Target | URL | Why it fits | Submission signal |
|---|---|---|---|
| **Maine Cannabis Connections** | cannabisconnectionsmaine.com | Maine-only magazine; their audience is the MDG reader. Not currently in our citation graph but a clear topical peer. | Email editorial via site contact form — request pitch guidelines first |
| **MaineCannabis.org** | mainecannabis.org/news | Active news outlet covering Maine-specific cannabis events; has run LD 104 / NorCO recall / OCP oversight stories. MDG corrections log + R106-R120 work could be a news hook ("Maine Dispensary Guide documents 14 self-disclosed corrections"). | Email news@mainecannabis.org or contact form |
| **Cannabis Business Times / Cannabis Industry Blog** | cannabisbusinesstimes.com | National trade publication that has covered Maine. Their Maine-state coverage has gaps MDG can fill. | Standard editorial submission form |
| **Ganjapreneur** | ganjapreneur.com | Has a Maine topic feed already; gap-filling Maine regulatory analysis would be welcome | editorial@ganjapreneur.com |

**Tier B — Maine regional press (longer lead time, high-authority if accepted):**
| Target | URL | Why it fits | Submission signal |
|---|---|---|---|
| **Portland Press Herald — Maine Cannabis Report** | pressherald.com/business/cannabis-report | Paywalled but indexed; an op-ed or "letter from the editor" pitch from MDG on corrections/transparency would be a unique angle | Letters to the editor + op-ed submission |
| **Bangor Daily News** | bangordailynews.com | Bangor-area coverage; Aroostook opt-in tracker + Maine caregiver coverage from MDG could pitch well | Editorial submission form |
| **The County (Aroostook)** | thecounty.me | Already cited by MDG for Houlton/Caribou ordinance work. Reverse-citation opportunity: offer an Aroostook market analysis | editor@thecounty.me |

**Tier C — National trade publications (longer lead times, broader reach):**
- MJBizDaily — cannabis business news; 1,500-2,000 word articles on industry trends.
- Marijuana Venture — investment/finance angle.
- Ganjapreneur — Maine topic feed.

**Pitches we'd make (concrete titles ready to send):**
1. "How a Maine dispensary guide documents its own mistakes — and why every operator site should" (E-E-A-T transparency angle, pegs to MDG corrections log) — for any Tier A or Tier C publication.
2. "What Maine's LD 1840 caregiver trade-show law actually changes" — peg to a current bill, evergreen regulatory analysis.
3. "The 35-town reality of Maine's municipal opt-in system" — gap-fills coverage most national pubs don't have.
4. "Why Maine's caregiver gray market is bigger than the regulated market — and what the OCP can do" — peg to existing MDG blog, has news hook.
5. "How to read a cannabis COA (Certificate of Analysis) — a consumer's walkthrough" — peg to the new R124 guide, unique angle most pubs don't have.

**Editorial standard:** every pitch must serve the host publication's audience, not MDG. Standard ratio: 1 contextual brand mention + 1 author-bio link in the body + 1 link in bio. No promotional language.

### Channel 2 — Journalist outreach (HARO / Qwoted / Twitter)

Free; supplements guest posting. When Maine-specific or cannabis-industry stories break (e.g., the December 2025 repeal petition, the NorCO recall, OCP oversight investigation), pitch MDG as a sourced expert.

**Mechanism:** monitor these news hooks, then email reporters within 24 hours:
- Maine Repeal campaign (Feb 2026 / 2027 cycle)
- Any Maine OCP recall or enforcement action
- Any municipal opt-in / opt-out vote
- LD bill introductions + hearings

MDG's coverage of these topics (R106-R120 corrections log, opt-in tracker, blog posts) positions us as a citable expert.

### Channel 3 — Resource link building (passive, highest-quality backlinks)

Find non-competitive sites that maintain resource lists, and request inclusion:

- Maine Chambers of Commerce (Portland, Bangor, Lewiston, Aroostook)
- Maine Small Business Development Center
- Maine Tourism Association
- Maine Better Transportation Association
- Maine Municipal Association
- University of Maine Cooperative Extension (cannabis / agriculture programs)
- Maine Press Association (resource list)

These .org / .edu / municipal domains are the highest-quality backlinks in SEO terms. Pitch: "We've built an open-data resource on [X topic] — would it be useful for your [member/visitor] resource page?"

### Channel 4 — Internal linking audit (low effort, immediate compounding)

MDG has 290 Astro files but internal-link audit hasn't been done systematically. Quick wins:

1. Every town guide should link to the Maine Opt-In Tracker (most do; verify).
2. Every operator guide should link to relevant statute pages (Title 28-B §1501/§601/§703(1)(F)).
3. Every operator page should link to the corrections log.
4. New COA walkthrough (R124) should be linked from every consumer guide (already done in learn/index.astro; verify per-page).
5. Passdown-flagged: "find-a-dispensary" uses JSON `"href":` form which the orphan detector doesn't match — convert to HTML `<a href>` in parent guides' Related Guides sections.

**Automation:** a quick script can crawl `apps/maine-cannabis/src/pages/**/*.astro`, parse out `href` targets, and report orphan pages + internal-link density per cluster. Worth doing before any external outreach so we know our own internal link graph is solid.

## Cost / effort estimate

| Action | Time | Cost | Expected backlinks |
|---|---|---|---|
| 4 Tier A pitches × 1,500-word pieces | ~15 hours | $0 | 2-3 placements |
| 3 Tier B pitches × 800-1,200 words | ~10 hours | $0 | 1 placement (Portland Press Herald hard) |
| 2 Tier C pitches × 1,800 words | ~8 hours | $0 | 1 placement |
| Journalist monitoring + reactive pitches | ~2 hr/wk ongoing | $0 | 1-2/year reactive |
| Resource link requests (Chambers, .org, .edu) | ~3 hours | $0 | 3-5 backlinks |
| Internal-link audit + orphan fix | ~2 hours | $0 | (compounds everything above) |
| **Total first-month effort** | ~40 hours | $0 | **6-10 inbound backlinks from authoritative domains** |

No paid promotion required for this strategy; cost is operator time + writing time. If the operator wants to scale faster:

- **parallel-cli findall run** to build a prospect list of 30-50 cannabis sites accepting guest posts (`-g core -n 20`, ~$5). Worth running once before Tier C pitches.
- **HARO subscription** ($0-100/month) to amplify reactive journalist opportunities.

## What to do next (sequenced)

1. **This turn (15 min):** Save this strategy as a reference doc and create a tracking spreadsheet at `docs/link-building-outreach-2026.md`.
2. **This session (1 hour):** Internal-link audit + orphan detection on MDG's existing 290 pages. Closes a carry-forward queue item while we're at it.
3. **Next session (3-4 hours):** Draft and send the Tier A pitches above (4 total). Each pitch is its own commit + passdown update.
4. **Ongoing (background):** Journalist monitoring on the 4 news hooks above. Reactive pitches only — don't manufacture opportunities.
5. **Quarterly:** Refresh the corrections log + Opt-In Tracker, which gives the pitches a "live data anchor" to reference.

## Tracking

New doc: `docs/link-building-outreach-2026.md` will track:
- Pitch sent (date, target publication, title, contact)
- Response (date, decision, edit notes)
- Live URL (once published)
- Anchor text used for the backlink
- Tier (A/B/C)

Updated weekly. Cross-referenced from passdown so the next session picks up the thread.