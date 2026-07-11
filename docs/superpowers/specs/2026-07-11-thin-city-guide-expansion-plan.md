# Expansion Outlines — Thin City Guides (Doorway-Abuse Defense + AdSense Readiness)

**Date:** 2026-07-11
**Branch:** `feat/thin-city-guides-2026-07-11`
**Purpose:** Bring three sub-800-word city guides up to ~1,000+ words of unique, city-specific content.

**Targets:**
- `/guides/rockland-dispensary-guide` — currently **474** visible body words (raw file 833)
- `/guides/camden-dispensary-guide` — currently **494** visible body words (raw file 928)
- `/guides/boothbay-dispensary-guide` — currently **498** visible body words (raw file 946)

**Verify-cycle discipline (per MDG memory, 2026-07-09):** Inbound-link audit was performed. No `#anchor` fragments inbound on any of the three pages; no internal section IDs exist on target pages. Expansion is safe — adding new sections will not break any inbound reference.

**Word-count basis:** raw file `wc -w` (HTML attributes, Astro syntax, etc.) overcounts by ~75% vs. visible body. Visible body counts shown above are after stripping frontmatter, `<style>` blocks, and all HTML tags.

**Why this matters:**
- AdSense YMYL "low value content" rejection risk for thin city guides
- General SEO — city guides are the top-of-funnel pages that drive internal-link equity into dispensary and operator guides
- Quality consistency — MDG's reputation is "thorough" per the editorial corrections log; sub-800-word city guides undermine that

---

## Common expansion pattern (applies to all three)

Every thin guide currently has: **Overview + dispensary list + (sometimes) a market-context section**. They are missing the **"why this place"** and **"practical visit"** layers that thick guides (Brunswick at 2,641 raw words with explicit "Why Brunswick?" + "Market Opportunity" pillars) carry.

Add two-to-three new sections per guide, inserted between the existing Overview and the See-also block. Preserve every existing section byte-for-byte — these guides are YMYL-audited and the dispensary details (address, phone, hours, type) must survive untouched.

### 1. "Why {City}" section (~150–250 words)

What makes this city distinct as a cannabis market? Three angles to weave, customized per city:

- **Demographic anchor** — population, median income (Census), age distribution, what the workforce looks like
- **Economic driver(s)** — one or two anchor institutions or industries that shape the customer base
- **Geographic context** — where the city sits in the Maine cannabis market map, what bigger/smaller cities it sits between, what traffic patterns pass through

### 2. "{City}'s Market Context" section (~150–250 words)

The "what kind of cannabis market this actually is" framing that thick guides do well:

- Seasonal patterns (tourist-driven vs. year-round, college-driven, etc.)
- Customer base composition (medical patients, recreational consumers, tourists, commuters)
- How the dispensary count compares to the population and to neighboring towns
- What makes this market distinct from the obvious nearby alternatives

### 3. "Visiting & Practical Info" section (~100–200 words)

Useful, factual, non-puff visitor-facing content:

- Parking situation (street / lot / public)
- Payment methods accepted (cash or debit via Hypur/VTPC — Maine dispensary norm)
- What to bring (state ID, MMMP card if medical, cash)
- ADA accessibility notes if known
- Hours patterns (seasonal hours vs. year-round)
- Curbside / delivery availability where applicable

---

## City-specific content seeds

### Rockland (474 → ~1,150 target body words; needs all 3 sections)

**Existing: Overview + 3 dispensaries (Highbrow, Scrimshaw, Botany)**

**Add "Why Rockland":**
- Midcoast Maine's commercial hub for Knox County (~7,100 residents)
- Knox County total ~40,000 — Rockland serves as the regional retail/medical/dental/services center
- Harbor town with strong arts community (Farnsworth Art Museum, CMCA, Opera House-driven arts tourism)
- Working waterfront (lobster, sardine industry heritage) mixed with second-home / retiree demographic
- Median household income sits above the state average per Census ACS, anchored on the Portland–Brunswick commuter belt that extends into Knox County

**Add "Rockland's Market Context":**
- Three dispensaries in a 7,100-resident town = roughly 1 per 2,400 residents — unusually high density for Maine
- Compare: Portland has ~14 dispensaries across 68,000 residents = 1 per 4,800; Augusta ~1 per 3,700
- Camden (the next town north) has 0 dispensaries; Camden's cannabis flow routes through Rockland
- Year-round vs. seasonal: less seasonal skew than Bar Harbor; Rockland's draw is more "second-home + arts weekend tourism"
- Customer mix: local year-round (the largest share), weekend/second-home, Camden spillover, and a smaller share of coastal-mecca visitors mixing harbor walks with dispensary stops
- The walkable Main Street dispensary cluster (3 stores within roughly 6 blocks) creates direct competition but also draws foot traffic from each store to the others; Rockland is the only Maine town where you can comparison-shop three dispensaries on foot

**Add "Visiting & Practical Info":**
- All three Rockland dispensaries cluster on Main Street — parking is metered street parking plus several public lots within 2 blocks
- Maine dispensary norm: cash or debit (Hypur). Most Rockland stores have ATMs on-site
- Bring: state ID (21+ for rec, 18+ with MMMP card for medical), cash
- All three Rockland stores are ADA-accessible (single-floor Main Street retail); Highbrow and Botany both offer curbside pickup
- Highbrow is the only store open past 7 pm on a regular basis; Scrimshaw closes 6 pm daily; Botany closes 7 pm most nights

### Camden (494 → ~1,200 target body words; needs 2 sections)

**Existing: Overview + Nearest Dispensaries + Camden Gap section**

**Add "Why Camden":**
- Camden Hills State Park, Penobscot Bay harbor, Camden Opera House — one of Maine's most iconic tourism brands
- ~5,500 year-round residents, but seasonal population swells substantially (summer visitors, sailing tourism, fall-foliage traffic)
- Median household income comfortably above the state average per Census ACS — Camden is one of Knox County's wealthiest towns
- Demographic skew: older retirees, second-home owners from Boston / NYC / CT, summer sailing community
- The combination of "iconic destination" + "wealthy customer base" makes Camden the textbook case of a market where retail should exist but local politics has blocked it

**Add "Visiting & Practical Info":**
- For visitors: nearest dispensary is Bayside Bud Shack (~5 mi north on US-1) — easiest stop when driving from Camden toward Belfast
- For day-trippers heading south to Rockland: Highbrow and Scrimshaw are walkable from downtown Rockland parking
- Practical: state ID required, cash/debit norm, Bayside offers curbside pickup and a 5% veteran discount
- Hours awareness: Bayside closes 7 pm most days; Highbrow is open later on some weeknights (till 8 pm)
- ADA: Bayside Bud Shack is explicitly listed as ADA-accessible in their public materials
- Driving times to remember: Camden → Northport (Bayside Bud Shack) ~10 min via US-1; Camden → Rockland (Highbrow / Scrimshaw) ~12 min via US-1 south

### Boothbay (498 → ~1,200 target body words; needs 2 sections)

**Existing: HIGHLY Cannaco details + Grow-room Callout + Market Context already in place**

**Add "Why Boothbay":**
- Coastal Lincoln County, ~3,200 year-round residents
- Boothbay Harbor is one of Maine's signature summer tourism destinations — Coastal Maine Botanical Gardens (one of the largest botanical gardens in New England), harbor cruises, whale-watching
- Population swells seasonally; summer peak weeks can effectively triple the resident base
- Median age skews older (retiree-friendly coastal town), but the tourism economy brings seasonal workers and visitors across the demographic spectrum
- The Boothbay peninsula (Boothbay, Boothbay Harbor, Edgecomb, Southport, Westport) functions as a single customer cluster of roughly 8,000 year-round + several thousand seasonal residents and visitors

**Add "Visiting & Practical Info":**
- HIGHLY Cannaco is at 638 Wiscasset Rd — a few miles inland from Boothbay Harbor's downtown; car required (no walkable retail corridor exists)
- Hours: Mon–Fri 9 am–7 pm, Sat–Sun 10 am–6 pm (year-round; call ahead in winter for seasonal adjustments)
- Cash or debit standard; ATM on-site (Maine dispensary norm, same as the rest of the state)
- ADA-accessible single-floor retail; live grow-room viewing window on-site (the Boothbay differentiator)
- Bring: state ID (21+ rec, 18+ with MMMP card medical), cash
- For Wiscasset / Damariscotta visitors: HIGHLY's location is on the connector route; if you're driving US-1 between those towns, it's a brief detour rather than a separate trip
- Daily deals rotate (Mon 10% off edibles, Tue 10% off vendor products, Wed $5 off vape cartridges, Thu 10% off beverages, Fri 10% off strain of the day, Sat $5 off rosin, Sun 20% off CBD and gear) — worth checking the store's site before you drive over

---

## Verification checklist before commit

1. Each guide ends with **≥1,000 visible body words** (use `sed 's/<[^>]*>/ /g; s/  */ /g' file | sed -n '/^---$/,/^---$/!p' | wc -w` after stripping frontmatter, or the snippet below)
2. Each guide's new sections are inserted between the existing Overview and the See-also block
3. Each guide preserves the "Last reviewed 2026-07-06" reviewer-attribution footer — do not touch
4. The existing dispensary details (address, phone, hours, type, name) are not modified — only new sections are added
5. Run `npm run verify:iterate` after the edits and before any commit

```python
# Word-count helper — strips frontmatter + style + HTML tags
import re
def body_words(path):
    with open(path) as f: c = f.read()
    c = re.sub(r'^---.*?---', '', c, count=1, flags=re.DOTALL)
    c = re.sub(r'<style[^>]*>.*?</style>', ' ', c, flags=re.DOTALL)
    c = re.sub(r'<[^>]+>', ' ', c)
    return len(re.sub(r'\s+', ' ', c).strip().split())
```

## What I am NOT doing in this expansion

- **Not modifying dispensary facts** (address, phone, hours, type) — these are the facts a reviewer samples for accuracy
- **Not adding affiliate links** — the doorway-defense work is independent of monetization
- **Not touching the city-guides index or AutoRelated data** — outbound links from those pages are unaffected by target-page expansion
- **Not modifying the 105+ other city guides** — sample audit showed they all exceed 800 words and have city-specific content

## Branch isolation

Working in `feat/thin-city-guides-2026-07-11` so the parallel GA4-analytics work in progress on `main` is not affected. Stage only the three city-guide files + this spec file; do not stage the analytics work, the unrelated Layout work, or any other files.
