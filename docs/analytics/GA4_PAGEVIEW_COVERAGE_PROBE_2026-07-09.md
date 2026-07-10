# GA4 Pageview Coverage Probe

**Date:** 2026-07-09
**Trigger:** 2026-07-08 audit (`GSC_GA4_AUDIT_2026-07-08.md`) flagged
GA4 as "0 events captured" but never verified the underlying
pageview coverage. This doc closes that gap.

**Scope:** (i) pageview only. Enhanced Measurement events
(scroll/outbound/search/downloads) and custom events (lead_capture)
are deferred — see "Deferred follow-ups" at the end.

## The question

Is `gtag('config', G-614GHG67ZQ)` actually firing on every public
page that uses `Layout.astro`, end-to-end through Vercel's CDN?

## Why this matters

The 2026-07-08 audit assumed GA4 pageview coverage was complete
because (a) `Layout.astro:293-301` loads gtag globally, (b) CSP
allows googletagmanager, and (c) `siteConfig.analyticsId =
"G-614GHG67ZQ"` is wired into the build. None of those prove the
pageview actually arrives in the GA4 dashboard — silent failure
modes include: wrong property binding, prerender stripping the
script, Vercel edge caching a pre-script version, adblock in the
operator's browser, Measurement ID pointing at a different property.

## Code-side baseline (verified 2026-07-09)

- `src/layouts/Layout.astro:293-301` loads gtag with
  `analyticsId = siteConfig.analyticsId` from
  `src/data/site-config.json` (line 6: `"G-614GHG67ZQ"`).
- `src/layouts/BaseHead.astro` has **no** analytics code — no
  double-load risk.
- `src/layouts/MinimalLayout.astro` (used only by 404.astro) has
  no gtag. **Intentional** per file header: "Inline GA4 `<script>`
  (404 hits are noise in analytics)".
- 3 pages import no Layout at all (`admin/email-dashboard`,
  `embed/opt-in-tracker`, `embed/roi-calculator`) — admin +
  iframe embeds. Intentional.
- 269 of 273 pages use `Layout.astro` and get gtag. The 4 that
  don't are deliberate exclusions.
- Live site response confirms gtag loads with the expected
  Measurement ID:
  `curl -s https://mainedispensaryguide.com/ | grep googletagmanager`
  returns `googletagmanager.com/gtag/js?id=G-614GHG67ZQ`.
- CSP (`vercel.json` + response headers) allows
  `googletagmanager.com` and `google-analytics.com` for `script-src`
  and `connect-src`.

**Net under-count surface area in code: ~zero.** The remaining
under-count risk is operational (wrong property binding, Vercel
edge caching, browser-side blockers), not a missing script.

## Probe X — Manual Realtime check (run now)

**Operator:** Steve
**Time:** ~5 minutes
**Cost:** zero

### Steps

1. Open `https://analytics.google.com/` in a browser window.
2. Navigate: Reports → Realtime (left sidebar).
3. Open `https://mainedispensaryguide.com/` in a private/incognito
   window. (Use a different browser than the one showing GA4 if
   possible — Chrome's adblock or privacy settings can suppress
   gtag in the same browser that loads the dashboard.)
4. Wait 30 seconds. The Realtime panel should show 1 active user
   on `/` (or `/index.html` — Vercel strips the extension).
5. Navigate to a town guide. **Pick:** `/guides/portland-dispensary-guide/`
   (largest city in Maine, reliable traffic in production).
6. Wait 30 seconds. Realtime should show a second active page on
   the new `page_path`.
7. Navigate to a blog post. **Pick:** `/blog/recreational-cannabis-near-acadia/`
   (the higher-impression of the two Acadia pair from the 2026-07-08
   audit).
8. Wait 30 seconds. Realtime should show a third active page.

### Pass criterion

Realtime shows **3 distinct `page_path` entries**, one per URL
visited. The exact paths match (modulo trailing-slash normalization)
the URLs loaded in steps 4, 6, 8.

### Failure triage (if Realtime shows 0/3)

Run a 90-second diagnostic, in order:

1. **Open Firefox (not Chrome) in a private window.** Firefox by
   default doesn't include aggressive tracker blocking on
   `googletagmanager.com`. Reload the same 3 URLs.
2. **Open DevTools Network panel on the first page load.** Filter
   for `gtag`. Expected: at least one request to
   `https://www.googletagmanager.com/gtag/js?id=G-614GHG67ZQ` with
   a 200 response. If absent: gtag script tag was stripped or
   blocked.
3. **Compare the live Measurement ID against the GA4 admin data
   stream.** In `analytics.google.com` → Admin → Property column →
   Data Streams → click the web stream → confirm the Measurement
   ID listed there matches `G-614GHG67ZQ`. If they don't match,
   every pageview since launch has gone to a different property.

Report back with: which URLs showed in Realtime (if any), whether
Firefox made a difference, and what the Network panel showed for
the gtag request.

### After the probe

- If **pass (3/3)**: ship a one-line closure note in
  `MISSION_CONTROL.md` and mark this audit item done.
- If **partial (1-2/3)**: drill into the specific page template
  that didn't fire. Likely culprits: a template that imports
  Layout differently, a CSP rule on a subdirectory, or Vercel edge
  serving a stale HTML version.
- If **total fail (0/3)**: see failure triage above. Don't proceed
  to Stage 2 work until pageview coverage is confirmed — every
  downstream metric depends on it.

## Probe Y — Automated Data API check (Stage 2)

**Blocker:** service account `mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com`
must be granted "Viewer" role on GA4 property 532778727. See
`docs/GA4_ACCESS_INSTRUCTIONS_2026-07-08.md` for the 5-minute
operator procedure.

### Scope

Same 3 URLs as Probe X, but driven by a script that polls
`runRealtimeReport` and writes a JSONL row per probe attempt.

### Stub (not yet shipped)

The natural place is a new script at
`apps/maine-cannabis/scripts/seo/ga4-pageview-coverage.cjs`. It
would:

1. Read the 3 probe URLs from a config block at the top.
2. Mint a token from `$GOOGLE_APPLICATION_CREDENTIALS` (the same
   keyfile as `ga4-lead-capture-daily.cjs`).
3. Hit each URL with a `node-fetch` GET that sets a randomized
   `User-Agent` (so GA4 doesn't dedupe the visits into one session).
4. Wait 60 seconds for GA4 to process.
5. Call `runRealtimeReport` with `dimensions: ["pagePath",
   "pageLocation"]` and `metrics: ["screenPageViews"]`.
6. Assert that the response contains 3 distinct `pagePath` values.
7. Append a JSONL row to `data/ga4-pageview-coverage.jsonl`.

This is queued for Stage 2. **Do not write the script until Probe X
passes** — if gtag is silently broken, the script's pass/fail
assertion would be testing the wrong thing.

## Deferred follow-ups (out of scope for this probe)

- **Enhanced Measurement audit.** GA4 admin has a toggle for
  auto-fire of scroll/outbound_click/site_search/video_engagement/
  file_download. Whether MDG has this on or off is unknown — the
  2026-07-08 audit never checked. If the goal is "feed all data
  we are owed", a follow-up probe should verify the Enhanced
  Measurement toggle state and emit its events through the same
  Realtime check.
- **`lead_capture` event verification.** The
  `LeadFormTracker.astro` and `LeadMailtoForm.astro` components
  fire `gtag('event', 'lead_capture', payload)`. Probe X only
  verifies pageview; event coverage needs a test form submission
  (and the mailto handoff may abort the gtag call before it
  reaches GA4 — unverified). This is the next probe after this one.
- **Cross-device attribution via `user_id`.** Mentioned in
  `GA4_ACCESS_INSTRUCTIONS_2026-07-08.md` as a Stage-3 unlock.
  Depends on Probe Y succeeding first.
- **Bot filtering verification.** GA4's default bot filter is on,
  but the script's `User-Agent` randomization in Probe Y could
  hit a threshold where GA4 starts excluding "suspicious" traffic.
  Worth a one-line check on the Realtime panel: does the
  `hostname` dimension show the expected set, or are crawler
  user-agents leaking into the count?

## Verification matrix (this doc)

| Check | Status |
|---|---|
| Layout.astro loads gtag on every public page | verified (code) |
| Live Measurement ID matches site-config.json | verified (`curl`) |
| CSP allows googletagmanager + google-analytics | verified (`curl -sI`) |
| MinimalLayout intentionally skips gtag (404) | verified (file header) |
| Probe X executed with 3/3 page_paths | pending (operator action) |
| Probe Y stub written | deferred (Stage 2, post access grant) |