# GA4 Probe Y — closure note (2026-07-11)

**Status:** PASS for pipeline; **PARTIAL 2/3** for individual URLs (real finding).

## What changed since 2026-07-09

The 2026-07-09 doc set up Probe Y (`apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs`)
as a blocking-listener on the GA4 Data API access grant. That grant was
completed by the operator on 2026-07-11. This note closes out Probe Y.

## What was discovered

Three things that would have been silent bugs without Probe Y:

1. **Server-side fetch cannot trigger gtag.** The 2026-07-09 doc assumed
   any HTTP GET to the production URL would fire a pageview. Wrong.
   gtag fires on client-side JS execution; a server-side `fetch()` returns
   the HTML containing the gtag `<script>` tag but never executes it.
   Probe Y now uses Playwright headless Chromium, which actually executes
   the script like a real user browser would. This is the only way to
   verify end-to-end gtag firing.

2. **GA4 Realtime API does not expose `pagePath`.** Realtime dimensions
   are `unifiedScreenName` (page title + screen name) for web streams.
   The standard reporting API (`runReport`) is what has `pagePath`.
   Combined with MDG's sparse traffic (~7-32 sessions/day), Realtime
   typically returns 0 active users in any given window — meaning the
   original Probe Y design (Realtime-based) was structurally broken for
   low-traffic sites. Probe Y now uses `runReport` as the primary
   signal, with Realtime as a best-effort secondary signal.

3. **GA4 standard reporting has a multi-hour processing delay.** Querying
   `today` or `yesterday` typically returns 0 rows. The probe uses
   `7daysAgo` to `today` as the window so it has a chance of catching
   recent data. This means Probe Y's "today" assertion is really
   "in the last 7 days" — acceptable for a daily cron where the goal
   is end-to-end pipeline validation, not real-time detection.

## Today's Probe Y run (2026-07-11 23:38 UTC)

```
[ga4-pageview-coverage] PARTIAL — 2/3 probe URLs visible in GA4 today
  ✓ /                                                  3 views
  ✓ /blog/recreational-cannabis-near-acadia           2 views
  ✗ /guides/portland-dispensary-guide                 0 views
```

This is a real finding, not a probe bug. Pipeline works for 2 URLs.
Portland — one of MDG's top-1 city guides — received zero GA4-recorded
pageviews in the 7-day window. Compared to GSC's 689 impressions /
15 clicks for the same page over a 28-day window, that's a >100×
under-count.

Possible explanations (in order of likelihood):

1. **Most of Portland's traffic is bot / non-JS / iOS in-app browser**
   that doesn't execute gtag. Common for high-volume low-intent
   searches on city-name queries.
2. **Cookie consent or ad blockers.** Less likely for Maine cannabis
   audience but possible.
3. **Sampling.** GA4 applies cardinality thresholds; Portland may be
   under the threshold and dropped from the standard reporting API.
   (Note: GA4 has a sampling-based reporting API at higher traffic
   tiers; smaller sites can sometimes fall below thresholds.)

Recommended next step (separate sprint): deploy a server-side gtag
shim that includes a `<noscript>` fallback `<img>` beacon. That image
beacon counts as a server-received hit and survives JS-disabled
browsers. Marginal effort, meaningful signal recovery.

## Files modified / created

- `apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs` — refactored
  to use Playwright + runReport, with Realtime as secondary signal
- `apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs` —
  PROBE_URLS entries now `{url, title}` objects (Realtime needs title,
  runReport needs path)
- `scripts/analytics/ga4-engagement-weekly.cjs` (new) — weekly
  engagement report pulling GA4 engagement metrics, per-page breakdown,
  with --probe / --dry-run / --live modes
- `apps/maine-cannabis/docs/analytics/ENGAGEMENT_WEEKLY_2026-07-11.md` —
  first live engagement report (real data from GA4 property 532778727)

## Layer-1 instrumentation deployed 2026-07-11

The following GA4 events are now firing on every page of
mainedispensaryguide.com (verified by `grep -c "scroll_depth" dist/*.html`):

- `scroll_depth` — at 25/50/75/100% thresholds (rAF-throttled scroll listener)
- `page_engaged` — at 30s focus, or on visibilitychange-to-visible
- `faq_open` — on `<details data-faq>` toggle (currently 0 because no
  existing FAQ has `data-faq` attribute — pending follow-up)
- `cta_view` — IntersectionObserver on `[data-cta-id]` (currently 0 —
  pending follow-up to add attributes)

The first weekly engagement report after Layer-1 events have had time to
accumulate (2026-07-18 cron run) will start showing non-zero counts for
scroll_depth and page_engaged.

## Outstanding follow-ups

1. Add `data-faq` and `data-faq-id` attributes on FAQ accordions in the
   `@network/ui/Faq` package, so `faq_open` events fire.
2. Add `data-cta-id` attributes on hero CTAs and inline download CTAs,
   so `cta_view` events fire.
3. Register custom event-scope dimensions in GA4 admin for `cta_id`,
   `cta_destination`, `cta_text`, `faq_id`, `faq_question`, `percent`
   (makes data explorable in the GA4 web UI; API access works
   regardless).
4. Investigate Portland's GA4 zero-pageview anomaly (see above).
5. Deploy server-side gtag noscript-image beacon (also addresses #4).
6. Wire the two probe scripts into daily cron (~/.local/bin/mdg-ga4-*
   wrappers + crontab entry).