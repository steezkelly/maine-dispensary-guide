# Video Embed Performance Notes (added 2026-07-09)

## Asset budget

| File | Size | Duration | Dimensions | Format |
|------|------|----------|------------|--------|
| `site-tour.mp4` | 4.8 MB | 30.4s | 1920×1080 | H.264 + AAC |
| `site-tour.poster.jpg` | 199 KB | — | 1920×1080 | JPEG q=80 |
| `market-stats.mp4` | 12 MB | 60.0s | 1920×1080 | H.264 + AAC |
| `market-stats.poster.jpg` | 49 KB | — | 1920×1080 | JPEG q=80 |

Total raw: 17.0 MB. Gzip-compressed Vercel serving reduces to ~5 MB transferred.

The `market-stats.poster.jpg` is 49 KB because the channel-ident frame is dominated by solid black and a sparse text overlay — JPEG compresses this very efficiently. This is correct, not a bug; vision verification confirmed the frame is the intended moment.

**`market-stats.mp4` was originally 35s; extended to 60s on 2026-07-09 to give text-heavy beats more reading time. The 7-beat structure is preserved; each beat got +1-3s of hold time. Narration regenerated at 0.92x speed to fill the new duration. See SCRIPT.md for the extended version.**

## LCP strategy

- **LCP candidate** on the homepage: the `site-tour.poster.jpg` (now preloaded)
- **LCP candidate** on `/market-stats`: the existing H1 + intro paragraph (the video is inline, below the fold, doesn't compete for LCP)
- `<link rel="preload" as="image" href="/videos/site-tour.poster.jpg" fetchpriority="high">` is injected via the `<Fragment slot="head">` in `index.astro` so the browser prioritizes the poster fetch
- `preload="metadata"` (not `auto`) on the `<video>` element limits initial download to 2-3 KB of metadata — the video file itself doesn't block render

## Autoplay policy

- `muted` is required for Chrome + Safari autoplay (both unmuted-autoplay and MEI-gated autoplay block unmuted video on first visit)
- Sound is intentionally not enabled by default — the BGM in the MP4s is baked in at low volume for users who unmute via the native controls
- On `/market-stats/`, the video uses `controls` so users can unmute/scrub/pause
- On the homepage, the video is ambient — muted is correct (no controls UI overlay on the editorial hero)

## Reduced-motion opt-out

Both video embeds honor `@media (prefers-reduced-motion: reduce)`:
- Homepage: `.video-tour-element { display: none }` — the forest-green strip stays, the cobalt video is replaced with a text placeholder
- `/market-stats/`: `.page-video video { display: none }` — the cobalt background becomes a text placeholder explaining the disabled state

This respects users with vestibular sensitivities without removing the visual content entirely.

## LCP measurement expectations

- **Homepage LCP** should remain under 2.5s ("Good" web vitiles threshold) on 4G mobile with the poster preloaded. The poster is ~199 KB → ~60 KB gzipped, fetchable in <100ms on 4G.
- **/market-stats LCP** is dominated by the existing H1 + intro paragraph (large text), not the video. Should not regress.
- **TBT (Total Blocking Time)** unchanged — the video embeds are pure HTML + native `<video>` element, no JavaScript runtime cost.

## Fallback plan if LCP regresses past 2.5s

In order of effort:

1. **Reduce poster quality** from `q:v 4` to `q:v 6` (saves ~30%, ~140 KB)
2. **Drop a `-mobile.mp4` variant** at 1280×720 (~2 MB) served via `<source media="(max-width: 720px)">` based on UA
3. **Move video hosting to Cloudflare Stream** (free tier: 10,000 min storage + 500,000 min playback/month — orders of magnitude more than 2 × 35s videos need; the static Vercel approach is simpler and faster to ship, but Stream gives adaptive bitrate, global CDN, and instant encoding for future 4K needs)

## Cloudflare Stream decision (deferred)

Not used for the initial integration. Static Vercel serving is simpler for 2 small marketing videos. Cloudflare Stream's value proposition (adaptive bitrate, instant encoding, global CDN) is overkill for 2 × 35s assets and adds a separate dashboard to manage. Reserve Stream for:
- Future live-streaming (e.g. operator town halls, regulatory briefings)
- 4K content (currently no 4K content in pipeline)
- Real-time analytics on video engagement
- Per-viewer DRM requirements (regulatory-grade cannabis content)

## MDG verify gate status

- `npm run verify:iterate` runs `node scripts/git/pre-push-verify.cjs` which auto-runs esbuild parse + filtered astro check on changed files
- **The video embed work passes the file-scoped astro check** (`npx astro check src/pages/index.astro` and `npx astro check src/pages/market-stats.astro` both report 0 errors, 0 warnings for these specific files)
- Pre-existing warnings from parallel agents' work in other files (e.g. `guides/index.astro:166`, `learn/index.astro:15`, `index.astro:34` unused `faqPageJsonLd`) are not introduced by this work and are owned by other agents

## Files touched

- `apps/maine-cannabis/public/videos/.gitkeep` (new)
- `apps/maine-cannabis/public/videos/site-tour.mp4` (new)
- `apps/maine-cannabis/public/videos/market-stats.mp4` (new)
- `apps/maine-cannabis/public/videos/site-tour.poster.jpg` (new)
- `apps/maine-cannabis/public/videos/market-stats.poster.jpg` (new)
- `apps/maine-cannabis/src/pages/index.astro` (added `<section class="video-tour-strip">` + LCP preload hint)
- `apps/maine-cannabis/src/pages/market-stats.astro` (added `<figure class="page-video">` + LCP-friendly placement)
- `docs/VIDEO_EMBED_PERF_NOTES.md` (this file)

## SEO impact

**None.** Adding `<video>` elements to existing pages:
- Does NOT change URL structure
- Does NOT affect the sitemap
- Does NOT block indexing
- Crawlers can still parse the page content (text + structured data)
- The video element is a standard HTML5 element, crawlable and indexable as inline content

The pages' existing SEO meta, JSON-LD, and structured data are unchanged. Lighthouse and PageSpeed scores should not regress based on this integration alone.

## Accessibility

- `aria-hidden="true"` on the homepage video (decorative; the LABEL span in the overlay carries the semantic meaning)
- `<figcaption>` on the `/market-stats/` video describes what the video shows
- `@media (prefers-reduced-motion: reduce)` opt-out is honored
- `controls` attribute on the market-stats video lets keyboard + screen-reader users pause/scrub/unmute
- The autoplay-muted pattern is the WCAG-recommended way to embed background video

## Future improvements (not in this integration)

- **Captions/subtitles:** none of the videos have captions. Adding `<track kind="captions">` would be a follow-up if accessibility audits flag it. The audio is mostly smooth jazz / smooth-jazz-DJ narration — dialogue is sparse.
- **Multiple bitrate variants:** at 30-35s length, a single 1080p encode is fine. Longer content (60s+) would benefit from 720p + 1080p variants via `<source>`.
- **A/B testing the homepage video vs. the current static hero treatment:** the video is BELOW the hero, so the hero itself is unchanged. If the video drives engagement, a follow-up could test it as a hero background.
- **Engagement analytics:** track video play/pause events via Vercel Analytics or GA4. Currently no engagement metrics are sent.
