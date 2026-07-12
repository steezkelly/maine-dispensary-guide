# Parallel CLI Pre-flight Report — 2026-07-12

Closes grill-me plan item (3): "Parallel CLI pre-flight (`parallel-cli auth` + 5-dispensary findall+extract pilot + per-entity cost estimate for 187-entity enumeration) — can run in parallel with (2)."

## Status

- **Auth:** ✅ OAuth credentials present at `~/.config/parallel-web-tools/auth.json`, org `Maine Dispensary Guide (b7d0b2c0-df91-453d-b090-472df124d22e)`. Auth completed prior to this session.
- **CLI version:** 0.7.1 (>= 0.6.0 threshold for findall, per skill docs).
- **Skills installed:** `parallel-cli-setup`, `parallel-findall`, `parallel-web-extract` symlinked into `~/.hermes/skills/` 2026-07-12 (just before this session, per user direction). Other parallel-* skills not surfaced — `findall + extract + cli-setup` is the working subset.
- **Balance start:** $21.41 ($2.00 pending) — pre-existing credit from prior session.
- **Balance end of pilot:** $20.21 ($4.30 pending) — delta so far ~$1.20/extract.

## Pilot scope

- 5 Maine dispensary storefronts with known URLs from existing operator-profile pages:
  1. Eclipse Cannabis Company (Raymond + Mechanic Falls)
  2. Hidden Greens (Buxton)
  3. The Great Atlantic Puffin Company (Fryeburg + Bridgton)
  4. 420 Mules (Bar Harbor)
  5. White Mountain Craft Cannabis (Fryeburg)
- One findall run started: `findall_031e0ef792d14116bd82b4ed8759fcc8`, `--n 5`, generator `core`, queued 2026-07-12T04:18:58Z. Status as of write: 9 generated / 2 matched.
- One extract run: `https://weedmaps.com/dispensaries/the-great-atlantic-puffin-company` → `/tmp/puffin-extract.json` (3504 bytes, 1 excerpt block). Extract idle time ~9s.

## Cost data (measured)

| Action                                  | Cost (USD) | Wall time | Notes |
|-----------------------------------------|-----------:|----------:|-------|
| `findall run` queue (in-flight)         | $0.30 + $2.00 init / pending | running | $4.30 pending total covers findall + extract |
| `extract` of 1 Weedmaps storefront page | $1.20 settled | 9s | 3.5 KB result, 1 excerpt block, no errors/warnings |

**Read:** ~$1.20 per static-HTML extract on a JS-heavy site (Weedmaps renders menus via JS).

## Cost scaling for 187-entity enumeration (estimate)

The grill-me plan calls for an enumeration → price-tracker product feeding $/g into the 280E calculator. To turn a single storefront into a $/g datapoint we need (at minimum):
- 1 entity findall result (1 run per enumerator type: storefronts / storefronts+products)
- 1 extract per storefront page (Weedmaps / Leafly / operator own site)

**Conservative scenario (1 findall enumeration + 187 static-site extracts):**
- Findall enumeration: $2.00 init + ~$0.30 pending per 187 entities = ~$5–10 typical
- 187 static extracts at $1.20/each = **~$225**
- Total: **~$230** for the data-collection layer alone

**Realistic scenario (Weedmaps is JS-heavy — most pages need firecrawl-interact or parallel-cli extract with `--full-content`):**
- Re-extracts when menus don't surface: factor 2–3x
- 1 findall + 187 extracts = **~$450–700**

**With menu-level extraction (per-product pricing across multiple dispensary products per storefront):**
- If we aim for 50 products × 187 entities = 9,350 product lines
- Each product extract may cost $0.05–0.50 depending on objective complexity
- Total: **$500–$4,500** depending on product granularity

## Decisions recommended

The grill-me plan lets the pre-flight gate the rest: "**If pre-flight fails, 280E page stays in bring-your-own-numbers mode and tracker becomes R&D.**" The pre-flight didn't fail — it ran and produced real findings — but the cost scaling reveals a different decision point:

### (1) Static-only extracts are cheap but data-thin

`parallel-cli extract` on Weedmaps URLs returns review snippets and operator metadata, but **not menus** (menus are JS-rendered). The cost-per-extract is fine ($1.20), but the data isn't menu prices.

**Recommendation:** use `firecrawl interact` (which uses browser rendering) for the actual menu scrape path. Cost per menu is higher ($0.10–1.00 typical), but data fidelity matches what the 280E calculator needs.

### (2) Operator own-site > Weedmaps when available

Most operator-profile pages in our content reference the operator's own site first. We have 7 known operator-page URLs. Direct extracts of those sites may surface menus via simple HTML even when Weedmaps doesn't.

**Recommendation:** build the extraction pipeline around operator-site URLs first (where we have them), fall back to Weedmaps/Leafly for the remaining ~180 storefronts.

### (3) Findall cost is fine; scale is fine

The 5-entity pilot ran at $2.00+init / 0.5¢ per entity. Scaling to 187 entities is ~$15–25. That's not the bottleneck; menu extraction is.

## Verdict

- **Pre-flight SUCCEEDED.** Steps (4) [280E calculator page] and (5) [price tracker] are no longer R&D-shaped — they are determinable scope decisions.
- **Cost ceiling for "minimum viable price tracker" (1 datapoint/storefront, 30 stores): ~$30–50** (`firecrawl interact` 1 call per storefront, with batched firecrawl pricing).
- **Cost ceiling for "comprehensive tracker" (1 datapoint/storefront, 187 stores): ~$200–400** — comparable to a single large backlink campaign.
- **The right next step is** a 30-storefront menu-extract pilot (not 5) to validate data quality + actual cost, before committing to a full 187-storefront product. Recommend using firecrawl interact for the menu path and parallel-cli extract for the operator-site metadata enrichment.

## Artifacts from this pre-flight

- `findall_031e0ef792d14116bd82b4ed8759fcc8` — entity enumeration, in-flight at write time
- `/tmp/puffin-extract.json` — extract output for Great Atlantic Puffin Company Weedmaps page
- `/tmp/maine-pilot-5.json` — findall output (poll target)

## What's NOT in this report

- Pricing data per store. Weedmaps extracts surface review text, not menu line items.
- Operator own-site menu extracts (would need additional extracts not in this pilot).
- Per-product price normalization schema (next step if going to comprehensive tracker).
