# Theme 2026 — Revisit Brief (Sprint 79+)

**Operator note (2026-07-08):** Steve said "I want to change the design aesthetic theming of the website, so this could be nice to revisit." This brief frames the revisit options.

## Where the theme actually lives today

`apps/maine-cannabis/src/styles/theme-2026.css` — already merged into main. It is loaded LAST in `apps/maine-cannabis/src/styles/index.css` after tokens.css → globals.css → components.css → theme-2026.css so the theme's token overrides win specificity.

Activation state: **active in production**, but cascade-applied. Removing the import line in `index.css` reverts instantly to the original palette. No code change required to disable.

### What the theme currently does

| Token | Value | Effect |
|---|---|---|
| `--color-primary` | `#1F4D3A` (deeper spruce) | Brand-green shift |
| `--color-background` | `#F4F1E4` (creamier bone) | Slightly warmer background |
| `--color-accent` | `#3D5A40` (forest green) | AA-compliant (7.68:1) |
| `--color-soft-green` | `#5F7E50` (sage) | AA-compliant (4.58:1) |
| `--elev-1/2/3-shadow` | 3-tier emboss | Cards get visible depth |
| `--elev-glow` | tinted outline + 18px glow | Featured-tier treatment |
| `--bg-gradient` | radial-gradient ellipse | Replaces flat bone background |

Utility classes (`apps/maine-cannabis/src/styles/theme-2026.css` line 60+):
- `.card-elev`, `.card-elev-2`, `.card-elev-glow` — opt-in for the elev-tier look

## Revisit decision tree

Three directions Steve might mean by "revisit":

### Direction A — Visual polish on the active theme

Small refinements to the existing palette without breaking the token contracts. Concrete candidates:

- Move from `#1F4D3A` spruce → a more emerald-forward green (matches Maine forest-floor aesthetic)
- Increase cream saturation slightly: `#F4F1E4` → `#F2EBD9`
- Strengthen the elev-glow tier so featured pages pop more
- Add a `--color-accent-2` for CTA tier (separate from nav primary)

**Effort:** 1-2 hours. Token-only change. Zero markup impact.

### Direction B — Adopt the elev-card pattern across more components

Currently `.card-elev-*` classes exist but aren't universally applied. The recommended state:

- All `GuideSidebar`, `Callout`, `Faq`, `NextStep`, `Breadcrumbs` cards use `--elev-2-shadow` minimum
- Hero sections on Tier 1 guides (portland, bangor, lewiston) use `--elev-3-shadow`
- Featured guide cards on `/` use `.card-elev-glow`
- Lead-magnet pages use a darker `--elev-2` for visual interest

**Effort:** 1 day (touches ~30 components, audit'd). Markup-light — adds one class attribute per element.

### Direction C — Re-author from scratch (Editorial Heritage / Modern Botanical)

The original 2026 spec called for "Fusion of Sketches A (Editorial Heritage) + C (Modern Botanical)." The current `theme-2026.css` is **A** with C influence on the elev tiers. If Steve wants the **full C** (modern botanical with organic-blob backgrounds, deeper-foliage shadows):

- New tokens: `--color-blob`, `--bg-organic-blob`
- New utility: `.hero-organic`
- Reference: `popular-web-designs` skill — Modern Botanical sites (Secret Nature, Ete, etc.)
- Replace elev-tier utility classes with `.blob-elev-*`

**Effort:** 1 sprint (5-7 days). Higher blast radius — touches hero blocks on every guide, blog, and homepage. Requires GSC impression-share observation before/after to confirm no SEO regression.

## Recommendation (agent system view)

**Direction A first, then B** for the next sprint. Direction C is a bigger commitment — defer unless Steve has a specific visual reference in mind.

## What the agent will do once Steve picks a direction

1. Branch off `feature/theme-2026-revisit-{letter}` (A, B, or C).
2. Make the change in one commit per direction.
3. Re-verify: `npm run verify:iterate && npm run verify:push`.
4. Capture before/after screenshots via Playwright MCP for the affected pages (Portland, Bangor, Lewiston, index, /guides index).
5. Roll out via auto-deploy to Vercel preview; observe for 48 hours.
6. Roll back automatically if smoke-img-200 OR smoke-200 OR sprint-score regresses.

## Open question for Steve

The current theme is **active in production**. To disable it temporarily (rollback to original palette) requires a single-line change in `index.css` (remove `@import './theme-2026.css';`). 5 seconds. Want the agent to:

(a) Leave the current theme active and start Direction A refinements on a branch
(b) Roll back to original palette first, then start Direction A (cleaner diff history but a 30-second visible revert in the meantime)
(c) Defer this until you've had time to look at the current production rendering on https://mainedispensaryguide.com (no agent action)

## What this brief does NOT do

- It does not auto-apply any palette change. Theme tokens affect ~270 pages.
- It does not delete or disable the existing `theme-2026.css`. That's reversible from one import line.
- It does not propose to rewrite the typography. Fraunces (display) + Plus Jakarta Sans (body) per Steve's preference is unchanged across all directions.
