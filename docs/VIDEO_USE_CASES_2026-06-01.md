# Video Use Case Scoping — MiniMax Hailuo-02
## Date: 2026-06-01 | Author: Hermes (Sprint 73 planning)

---

## 0. TL;DR

MDG has 3 video clips/day via `mcp_minimax_generate_video` (MiniMax-Hailuo-02,
1080p, 6s or 10s). The passdown (§6 Priority 3) explicitly deferred use-case
selection until there was a specific, well-scoped plan. **This doc names 3
specific use cases, ranked by ROI, and includes concrete prompt + placement +
expected outcome for each.** Budget: 1 video/day, 3 videos spread over a
week-long sprint, with each embedded in a specific page.

**Do NOT drop a video on the homepage** (passdown's explicit warning). All
three placements are page-specific, trust-amplifying, and link to existing
text content.

---

## 1. VIDEO INFRASTRUCTURE STATE (verified 2026-06-01)

**No video infrastructure exists on the site today.**

```
$ grep -l "<video\|<source" src/pages/ -r | wc -l
0
$ grep -l "video.js\|VideoHero\|VideoEmbed" src/components/ -r | wc -l
0
```

- Zero `<video>` embeds across all 152 pages
- Zero video player components in `src/components/`
- `apps/maine-cannabis/public/videos/` does not exist; nothing in `public/`
  with a video extension
- Existing "video" mentions in code are all about *licensing* (security
  cameras, surveillance) or *vendor tier* copy ("Video introduction" in
  the vendor directory tier list) — not actual video embeds

**MiniMax Hailuo-02 API (from `@mcpcn/minimax-mcp-js/build/api/video.js`):**

| Param | Accepted | Notes |
|---|---|---|
| model | `MiniMax-Hailuo-02` (default), `T2V-01`, `T2V-01-Director`, `I2V-01`, `I2V-01-Director`, `I2V-01-live`, `S2V-01` | Hailuo-02 is highest quality, slowest |
| prompt | string, required | |
| firstFrameImage | data: URL, http(s) URL, or local file path | Optional — enables image-to-video animation |
| resolution | `768P`, `1080P` | Hailuo-02 only |
| duration | `6` or `10` | Hailuo-02 only (seconds) |
| asyncMode | bool | Skip the blocking poll; return task_id immediately |

**Latency budget (from MCP source):**
- Hailuo-02: up to 60 retries × 20s = ~20 minutes per clip (synchronous)
- T2V-01: up to 30 retries × 20s = ~10 minutes
- Use `asyncMode=true` and poll later to avoid blocking the agent loop

**Cost context (from memory):** 3 clips/day budget. With 1 clip/day, this is
3 days of generation work — fits inside one sprint's plan.

---

## 2. RANKED USE CASES

### USE CASE 1 — Maine cannabis landscape for the **newsletter signup page** (RECOMMENDED FIRST)

**Why this page:** `/newsletter.astro` is the highest-conversion page on the
site (it's the lead-capture form for `https://formspree.io/f/xvgzlowz`).
The page currently has a generic "newsletter.jpg" hero and pure text
copy. A short, atmospheric Maine-coast landscape loop behind the form
copy would be the single highest-ROI video addition — it puts
emotional texture on the *exact page* where readers decide to subscribe.

**Placement:** Replace the current `newsletter.jpg` (still image) with a
`<video autoplay muted loop playsinline>` element on the page, positioned
behind the benefits list and recent-issues preview. Fall back to the
JPEG for users with `prefers-reduced-motion`.

**Prompt (Hailuo-02, 10s, 1080P, aspect 16:9):**

> Slow aerial drone footage of a quiet Maine coastal town at golden
> hour, autumn foliage along the shoreline, a fishing boat moored at
> a weathered wooden pier, calm Atlantic water, no people, no
> vehicles, no text, no signage, cinematic color grading, high-end
> documentary cinematography, 24fps filmic motion

**Expected outcome:** A 10-second atmospheric loop that reads as
"professional, Maine-specific, trustworthy" rather than "generic stock
footage." This is exactly the trust signal the lead-capture page
needs.

**Astro / accessibility notes:**
- `<video autoplay muted loop playsinline poster="/images/heroes/newsletter.jpg">`
- `aria-hidden="true"` if purely decorative; add `aria-label` if
  informational
- Wrap in `prefers-reduced-motion` guard via existing pattern in
  `src/styles/`
- Use `webm` if MiniMax returns multiple formats; fall back to mp4
- Lazy-load: this page is lead-capture, not above-the-fold content

**Estimated time to build:** 2 hours (1 video gen + 1 component + tests)
**Estimated ongoing cost:** 1 video generation (~20 min compute) per
A/B test cycle. Stays within budget.

---

### USE CASE 2 — Animated Portland harbor hero for the **Portland dispensary guide**

**Why this page:** `/guides/portland-dispensary-guide/` is the
single most-trafficked city guide (Portland is Maine's largest
market — 12+ dispensaries, 68K residents). The page hero is now
`maine-portland-harbor-hero.jpg` (Sprint 72h fix), but a slow-pan
video of the actual Old Port waterfront would be a meaningful upgrade
on a page that directly drives OCP application intent.

**Placement:** Replace the static hero image on the
Portland guide page with a 6-second looping clip. The clip anchors the
page's claim that "Portland draws customers from across Maine and New
England" by showing the actual waterfront the guide is about.

**Prompt (Hailuo-02, 6s, 768P to keep budget lean, aspect 16:9):**

> Slow gentle pan across the Old Port waterfront of Portland, Maine
> at golden hour, weathered brick warehouse buildings, lobster boats
> moored at wooden pilings, calm Casco Bay water reflecting warm
> light, the Custom House tower with white steeple visible in the
> middle distance, no people, no vehicles, no text, no signage,
> documentary cinematography, 24fps smooth cinematic motion

**Expected outcome:** 6 seconds of motion that *substantiates* the page
copy. Visitors who land on this page from search ("portland maine
dispensary") get an immediate, visceral sense of the place.

**Astro / accessibility notes:**
- Same autoplay/muted/loop/playsinline/poster pattern as Use Case 1
- The page already has `heroImage="/images/heroes/maine-portland-harbor-hero.jpg"`
  in the Layout call — extend Layout's `heroImage` prop to accept either
  string (image) or object `{ src, mp4, webm, poster }` (video)
- Or: introduce a separate `heroVideo` prop alongside `heroImage` for
  cleaner migration

**Estimated time to build:** 3 hours (1 video gen + 1 Layout prop + 1
fallback + page-level wiring + tests)
**Estimated ongoing cost:** 1 video gen per Portland page refresh
(~yearly, if ever).

**Critical review:** Portland is a saturated market. 12+ dispensaries
already exist. The guide is operator-focused (about-to-apply
dispensary owners), not tourist-focused. A scenic loop *might* be
perceived as decorative rather than substantive. **Mitigation:** keep
the loop under 6 seconds, autoplay muted, and don't make the video
the *primary* content — text density on the Portland guide is already
high, the video just provides atmosphere.

---

### USE CASE 3 — Founder story emotional anchor on **founder pages**

**Why these pages:** `/founders/` has 3 founder stories (Portland
flagship, coastal shop, rural cultivator). Each is heavy text with
"passion" Callouts and direct founder quotes. A short, atmospheric
opening loop — Maine forest, water, farm landscape depending on the
founder's region — would set emotional tone for the 8-12 minutes a
reader spends on each page.

**Placement:** Subtle: above the first section, muted autoplay loop,
6 seconds, 768P. The page is already a heroImage-less text block; the
video plays the role of a hero without competing with the founder
quote that immediately follows.

**Prompts (one per founder, 6s each, 768P, 16:9):**

**Portland flagship — James:**
> Slow aerial over downtown Portland, Maine at golden hour, the Old
> Port brick buildings and Casco Bay visible, no people, no vehicles,
> no text, no signage, documentary cinematography, 24fps

**Coastal shop — York County mid-tier:**
> Slow pan across a quiet rocky Maine Atlantic beach at low tide,
> weathered seaside cottages in the distance, no people, no vehicles,
> no text, no signage, autumn overcast sky, cinematic coastal
> photography, 24fps

**Rural cultivator — Aroostook / Washington County:**
> Slow pan across a vast Maine farmland in autumn, distant forested
> hills, hay field in the foreground, weathered red barn, no people,
> no vehicles, no text, no signage, soft overcast light, documentary
> cinematography, 24fps

**Expected outcome:** Each founder story opens with visual texture
specific to the region they're operating in. The reader's first
impression matches the founder's actual context.

**Estimated time to build:** 5 hours (3 video gens done in parallel
via async, then a small `<FounderVideo region="portland">` component,
3 page-level wirings, tests)
**Estimated ongoing cost:** Once per founder-page refresh cycle
(~yearly). 3 video generations in a single day is the budget cap, so
plan to generate all 3 in one batch.

**Critical review:** Founder pages are the most
identity-coded content on the site. If a video misrepresents a
founder's region (e.g. a Portland loop shown for the rural
cultivator), the trust damage is greater than no video at all.
**Mitigation:** Steve must review each generated clip before
publication. Don't auto-publish.

---

## 3. DELIBERATELY DEFERRED USE CASES

### ❌ Homepage hero video

Per passdown §6 explicit warning: "Don't drop a video on the
homepage without a plan." Risk: a generic Maine landscape loop
cheapens the "high-authority cannabis business" brand. The
homepage is currently a high-density FAQ + value-prop grid; a
video here would compete for attention with the actual content
the homepage exists to surface.

**Trigger to revisit:** when the homepage has a *specific* video
asset that matches a *specific* value prop (e.g. a 30-second
founder interview clip, an OCP interview, an Ahrefs data
visualization). Not a generic landscape.

### ❌ City guide page mass video rollout

The 61 city guides each have unique per-town hero images (Sprint
72e/72f). Mass-converting these to video would consume the entire
3-clips/day budget for 20+ days and the same generic-Maine-loop
problem applies. **No video for town guides unless there's a
specific reason for that town** (e.g. a Portland-style saturated-
market page where Use Case 2's ROI logic applies).

### ❌ Blog post headers

Blog posts are text-dense and operator-focused. A landscape
header doesn't add information; the existing static hero is
sufficient.

### ❌ Founder interview videos (actual people speaking)

The 3 clips/day MiniMax Hailuo-02 budget is text-to-image / image-
to-video for AI-generated scenes. Real founder interviews are a
separate production (camera, mic, editing) and budget. Out of
scope.

---

## 4. RECOMMENDED EXECUTION ORDER

If Steve approves the video budget, the order is:

1. **Use Case 1 (newsletter page)** — 1 video, 1 day. Highest
   conversion-ROI, lowest risk (decorative, fall-back to JPEG
   already exists, reduced-motion guard is straightforward).
2. **Use Case 2 (Portland guide)** — 1 video, 1 day. High
   authority, single page, easy to A/B test against the static
   hero.
3. **Use Case 3 (founder pages)** — 3 videos, 1 day (parallel
   async). Total commit 5 hours of build time. Steve's manual
   review required before publication.

Total: 5 video generations (1 + 1 + 3) across 3 days. Under the
3/day budget if Use Case 3's 3 are generated in parallel async.

**Stop conditions:** if any of the 3 Hailuo-02 generations returns
a video that fails Steve's visual review, the day's budget is
spent. Don't regen-without-thinking; the next day's budget should
fund a *different* use case, not a retry.

---

## 5. OPEN QUESTIONS FOR STEVE

1. **Approve the video budget at all?** The passdown deferred this
   for good reasons (3/day, AI-generated landscape risk). If the
   answer is "no, the static images are good enough", this doc
   closes with no execution.
2. **Where should videos live on disk?** Options:
   - `apps/maine-cannabis/public/videos/` (served by Astro directly)
   - CDN (Vercel's media optimization, or Cloudflare R2)
   - Inline data: URLs in MDX (no, too large)
   Recommendation: `public/videos/` for v1, CDN for production scale.
3. **Video component library or bespoke?** Three placements share
   a need for autoplay/muted/loop/playsinline/poster. A small
   `<AtmosphericVideo>` component is the right size. Not a full
   video player — just an HTML5 video element with the right
   attribute defaults.
4. **Acceptable file size?** Hailuo-02 1080P 10s clips can be
   5-15MB. Vercel's serving cost for that is negligible but
   LCP/INP on slow networks may suffer. 768P is the safer default
   for v1.

---

## 6. WHAT THIS DOC DOES NOT COVER

- **Audio.** The Hailuo-02 clips are silent. If we want audio
  (TTS narration, music), that's the `mcp_minimax_text_to_audio`
  + `mcp_minimax_music_generation` stack — separate cost, separate
  scope. Defer to a future doc.
- **Custom thumbnails / variants for A/B testing.** The
  newsletter page in particular could benefit from 2-3 video
  variants; that's 2-3x the budget. Not in scope for v1.
- **CDN / streaming.** All clips would be served as flat mp4 files
  via Vercel. For a marketing site with <50K monthly visitors this
  is fine. If traffic grows, revisit with HLS / Cloudflare Stream.
- **Analytics / view tracking.** Existing Vercel Analytics + GA4
  should pick up `<video>` events with minimal extra config.

---

*End of scoping doc. Recommend Steve read §4 (execution order) and
§5 (open questions) before approving the budget.*
