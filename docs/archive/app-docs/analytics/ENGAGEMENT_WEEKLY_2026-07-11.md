# GA4 Engagement Weekly — 2026-07-11

> Source: GA4 property 532778727 (measurementId G-614GHG67ZQ)
> Window: last 7 days. Layer-1 events tracked: scroll_depth, page_engaged, faq_open, cta_view.
> Note: scroll_depth / page_engaged / faq_open / cta_view are new events
> deployed 2026-07-11. They will only show counts > 0 from the next
> weekly report onward. faq_open + cta_view also require the page-side
> attributes (`data-faq`, `data-cta-id`) which are not yet wired up on
> existing pages — see follow-up.

## Headline — daily engagement (last 7 days)

| Date | Sessions | Engaged | Eng-rate | Avg dur (s) | Sess/user | Pages/user | Active users |
|---|---|---|---|---|---|---|---|
| 20260707 | 32 | 11 | 34.4% | 46.2 | 1.19 | 1.37 | 27 |
| 20260704 | 21 | 9 | 42.9% | 61.2 | 1.24 | 1.29 | 17 |
| 20260705 | 27 | 9 | 33.3% | 52.3 | 1.17 | 1.13 | 23 |
| 20260706 | 18 | 8 | 44.4% | 155.5 | 1.00 | 1.50 | 18 |
| 20260708 | 13 | 2 | 15.4% | 25.7 | 1.30 | 1.10 | 10 |
| 20260709 | 4 | 1 | 25.0% | 31.3 | 1.00 | 0.25 | 4 |
| 20260710 | 7 | 0 | 0.0% | 5.7 | 1.00 | 0.00 | 7 |
| 20260711 | 6 | 0 | 0.0% | 4.7 | 1.00 | 0.00 | 6 |

## Custom-event totals (last 7 days)

| Event | Count | Sessions |
|---|---|---|

## scroll_depth per page (top 20, last 7 days)

_No scroll_depth events yet — instrumentation deployed 2026-07-11. Data populates from next week._

## faq_open popularity (top 20, last 7 days)

_No faq_open events yet — needs `<details data-faq data-faq-id="…">` attributes on existing FAQ accordions. See follow-up below._

## cta_view reach (top 20, last 7 days)

_No cta_view events yet — needs `data-cta-id="…"` attributes on existing CTAs. See follow-up below._

## Follow-ups needed for full engagement coverage

1. **Wire `data-faq` on FAQ accordions.** The FAQ package component (`@network/ui/Faq`) emits <details> but the `data-faq data-faq-id` attributes are not set. Without them, faq_open never fires. ~50 files; one-line-per-FAQ change.
2. **Wire `data-cta-id` on CTAs.** Same pattern — hero CTA, inline download CTAs, mailto leads. Without these, cta_view never fires.
3. **Register custom event-scope dimensions in GA4 admin** for `cta_id`, `cta_destination`, `cta_text`, `faq_id`, `faq_question`, `percent`. Required to make the data explorable in the GA4 web UI (API access works regardless, but UI filters need registered dimensions).

## Per-page engagement — top 30 by views (last 7 days)

| Page | Views | Engaged | Eng-rate | Avg dur (s) | Sessions |
|---|---|---|---|---|---|
| /blog/cannabis-friendly-maine-travel | 12 | 5 | 38.5% | 45.1 | 13 |
| /guides/bar-harbor-dispensary-guide | 12 | 4 | 33.3% | 30.4 | 12 |
| /blog/best-maine-edibles-2026 | 10 | 5 | 45.5% | 50.3 | 11 |
| /guides/old-orchard-beach-dispensary-guide | 7 | 0 | 0.0% | 0.0 | 7 |
| /blog/best-cannabis-strains-maine-outdoor-2026 | 4 | 0 | 0.0% | 0.0 | 4 |
| /blog/best-maine-dispensaries-2026 | 4 | 2 | 50.0% | 42.3 | 4 |
| /guides/maine-cannabis-caregiver-guide | 4 | 0 | 0.0% | 0.0 | 4 |
| / | 3 | 3 | 100.0% | 64.7 | 3 |
| /find-a-dispensary | 3 | 3 | 100.0% | 95.8 | 3 |
| /guides/limerick-dispensary-guide | 3 | 0 | 0.0% | 0.0 | 4 |
| /guides/maine-cannabis-banking-solutions | 3 | 2 | 66.7% | 34.5 | 3 |
| /guides/maine-cannabis-funding-guide | 3 | 2 | 66.7% | 167.3 | 3 |
| /blog/recreational-cannabis-near-acadia | 2 | 1 | 50.0% | 245.0 | 2 |
| /guides | 2 | 2 | 66.7% | 6.2 | 3 |
| /guides/fryeburg-dispensary-guide | 2 | 0 | 0.0% | 0.0 | 2 |
| /guides/maine-cannabis-events-2026 | 2 | 0 | 0.0% | 3.8 | 2 |
| /guides/maine-cannabis-staffing-licensing | 2 | 0 | 0.0% | 0.0 | 3 |
| /guides/maine-cannabis-taxes-2026 | 2 | 1 | 33.3% | 74.0 | 3 |
| /guides/maine-dispensary-license | 2 | 2 | 100.0% | 200.8 | 2 |
| /guides/scarborough-dispensary-guide | 2 | 2 | 100.0% | 50.2 | 2 |
| /launch-checklist | 2 | 1 | 100.0% | 173.1 | 1 |
| /roi-calculator | 2 | 0 | 0.0% | 2.2 | 2 |
| /about | 1 | 1 | 50.0% | 8.1 | 2 |
| /blog/best-live-rosin-maine | 1 | 1 | 100.0% | 15.2 | 1 |
| /blog/maine-cannabis-gray-market-ocp-enforcement-2026 | 1 | 1 | 100.0% | 43.8 | 1 |
| /blog/maine-dispensary-how-to-open | 1 | 1 | 100.0% | 465.1 | 1 |
| /contact | 1 | 1 | 100.0% | 108.2 | 1 |
| /guides/alfred-dispensary-guide | 1 | 1 | 100.0% | 5.5 | 1 |
| /guides/boothbay-dispensary-guide | 1 | 0 | 0.0% | 0.0 | 1 |
| /guides/bridgton-dispensary-guide | 1 | 0 | 0.0% | 0.0 | 1 |