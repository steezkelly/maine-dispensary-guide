# PILOT-20260712-dispensary-menu-extraction

**Date:** 2026-07-12
**Operator:** Steve
**Pilot goal:** validate the Firecrawl+Parallel extraction pipeline against the 280E calculator data strategy (memory 2026-07-09)

## Sites attempted (3)

| Site | URL | Result |
|---|---|---|
| Cannabis Haven (Auburn) | cannabishaven.com | bot-protected home + placeholder Lorem-Ipsum on `/shop/` URLs |
| The Joint (Portland) | thejoint.me | age-gate, no products in HTML |
| Gram's Place (Newport) | grams5.com | verification screen |

## Common pattern

All 3 Maine dispensary sites use one of three e-commerce platforms:
1. **Weedmaps** age-gate (most common)
2. **Custom WP/WooCommerce** with bot-protection (Cloudflare-style)
3. **Placeholder dev sites** (Cannabis Haven)

None serve menu data directly to unauthenticated web crawlers.

## Validated approaches

1. **OCP license CSV** = authoritative enumeration of all 187 active stores (license, address, contact)
2. **OCP-to-Census crosswalk** = 91/94 mapped for free (live ACS 2024)
3. **Firecrawl `/v2/scrape` + agent-browser** = works for Power BI dashboards (33 municipalities captured from opt-in table)
4. **Parallel FindAll** = useful for entity discovery (29 candidates, 10 matched for Maine dispensaries)

## NOT validated

1. **Menu price extraction from dispensary sites** — blocked by age-gates/bot-protection
2. **Full 500-municipality opt-in capture** — Power BI's "Scroll down" button is blocked by Pivot table cell overlays; needs enter-data mode first (Playwright code execution, not just `agent-browser click`)

## Budget impact

Per operator: "we've used over half of them in probably this one session"

Firecrawl spend this session:
- 5 long interact sessions (left unstopped, ~$0.50-1.00 total before cleanup)
- 2 firecrawl sessions stopped cleanly (10 credits)
- 1 firecrawl extract + 1 scrape with json format (~5 credits)
- 1 fresh firecrawl scrape for opt-in + ~5 interact sub-sessions (~15 credits)
- ~30+ credits total

Parallel spend:
- 1 FindAll run (29 candidates generated, 10 matched) — base tier, ~5 credits
- 3 Task API runs (3 dispensaries, all blocked) — ~10 credits
- ~15 credits total

Combined: ~45 credits of estimated budget consumed this session.

## Recommendation for next pilot

1. **Do NOT continue extracting from dispensary sites directly.** Age-gates block all of them.
2. **For menu prices**, use **Weedmaps/Dutchie public APIs** (which the dispensaries link to from their sites per `weedmaps` and `leafly` URLs in their OCP listing) — these are the actual e-commerce platforms and they have APIs. Requires separate Weedmaps API key.
3. **For full opt-in capture**, use **Firecrawl `interact` with Playwright code execution** (language: "node") to enter the Pivot table's "explore data" mode first, then click Scroll down. Saves credits because each scroll is one interaction, not one snapshot.
4. **Stop every Firecrawl interact session with `DELETE /v2/scrape/{scrapeId}/interact`** at the end. The CLI command is `firecrawl interact stop <scrapeId>`.

## What we shipped anyway

- `scripts/firecrawl-optin-scroll-extract.cjs` (driver script that loops click+snapshot+parse, ready for the next Firecrawl budget cycle)
- 33 partial municipalities from the opt-in dashboard at `/home/steve/.hermes/data/mdg-data/raw/ocp_optin_firecrawl/ocp-optin-partial-2026-07-12.json`