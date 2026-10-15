# Maine Dispensary Guide — Visual Redesign Sketches

Three redesign directions + a baseline, side by side. All variants target the same homepage and fix the same three pain points the owner flagged:

1. **Backlinks hard to read in dark mode** — every variant uses a dedicated accessible link color with a visible underline; both modes hit WCAG AA on the chosen palette.
2. **Giant white hero image out of place** — the hero image now sits inside a smaller, elevated "plate" so it's a feature, not a billboard; the page itself becomes the canvas.
3. **Too blocky/griddy, no pop** — every variant introduces elevation tiers (standard vs. raised) so the page has rhythm. Cards mix two depth levels instead of being a uniform grid.

## Files

| Folder | Variant | Vibe |
|--------|---------|------|
| `099-baseline/` | Current site, plain rebuild | Reference only — what it looks like now |
| `001-editorial-heritage/` | A — Editorial Heritage | Quiet, professional, high-trust, gentle depth |
| `002-warm-premium/` | B — Warm Premium | Same palette, richer: gold leaf, pressed paper, deeper shadows |
| `003-modern-botanical/` | C — Modern Botanical | Frosted glass, sage gradients, organic shapes, more "Apple" |

## How to view

```bash
cd /home/steve/maine-dispensary-guide/sketches
python3 -m http.server 8742
# Open http://localhost:8742/099-baseline/   (or any of the variants)
# Click "Toggle theme" in the top-right of any page to flip light/dark
```

## What was changed per variant

### Variant A — Editorial Heritage
- Subtle radial gradient on body (paper-like)
- `--elev-1` (raised) vs `--elev-2` (slightly creamy "featured") tiers
- `inset 0 1px 0 rgba(255,255,255,.7)` top highlight on cards → real embossed feel
- Featured card lifts 2px + 3px gold/green gradient bar at top
- Hero is a 980px framed plate instead of full-width
- Links: spruce with thin underline that thickens on hover
- Footnote: gold-gradient hairlines (using `mask-composite`)

### Variant B — Warm Premium
- Warmer paper palette (creamier `#F2EDDC` base)
- Pressed-paper card backgrounds with a top highlight inset shadow
- Gold accent strip across stat plates
- Featured card lifts 6px, gets a glowing gold dot top-right + cream-to-paper gradient
- Hero is a 1000px plaque with a gold hairline border
- Italic Fraunces display, with h1::first-line upright for visual variety
- Links: spruce with a 2px **gold underline** that thickens to 80% width on hover
- Brand mark is a small leaf→gold gradient dot

### Variant C — Modern Botanical
- Frosted-glass nav, hero plate, stats, cards, footer (backdrop-filter blur)
- Soft mint + sage gradient blobs floating behind content
- Brighter spruce/moss color (`#1F4D3A`) and a brighter sage (`#A8C49A`)
- Larger, more organic border radii (20–32px)
- Featured card lifts 8px, gets mint badge with a glowing leaf dot
- Hero is a 1040px glass plate; eyebrow is a translucent pill
- Brand mark is a 45°-rotated leaf shape
- Links: bright sage underline, moss color, never low-contrast

## What the variants all share

- All use the existing design tokens from `Layout.astro` (`--color-primary`, `--color-accent`, etc.) as the basis — none of them throw out the heritage system
- All respect `prefers-reduced-motion` (the only animation is the theme toggle, which is instant)
- All use slash-less internal links per `AGENTS.md`
- All use Warm Bone `#F2F2E2` family — no pure `#FFF` on dark
- No emoji — geometric icons only (the leaf, the badge dots)
- All form constraints preserved — these are CSS-only layout/visual experiments, no markup changes
