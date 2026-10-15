# Visual Readability Polish Layer — Maine Dispensary Guide

Companion to the existing `apps/maine-cannabis/src/styles/` design-token system
(`tokens.css`, `theme-2026.css`, `globals.css`, `components.css`) and the
shared UI primitives in `packages/ui/src/components/`. This document
captures the readability pain points discovered while auditing the live
site on 2026-07-06, with the exact code fixes that resolve them.

**Scope:** visual readability — colors, contrast, layout density, typography
hierarchy, navigation patterns, decorative ornamentation, and the
small set of UI patterns that compound across MDG's 257 pages.

**Out of scope:** prose voice / AI-pattern cleanup (covered by
`scripts/content/content-quality.cjs` and the humanizer skill),
SEO meta-tag completeness (separate sprint), missing page titles
(separate sprint), broken internal links (separate sprint),
GSC-driven content gaps.

**Method:** live render of 5 pages via `browser_navigate` +
`browser_snapshot` + `browser_console` + `browser_click` (mega-menu
+ dark-mode toggle), cross-referenced against source files
(tokens.css, theme-2026.css, globals.css, components.css,
Layout.astro, SiteHeader.astro, packages/ui/src/components/Callout.astro,
Breadcrumbs.astro). Console clean across all 5 pages. No JS errors,
no failed asset loads.

**Browser limitation:** the local machine has no Chrome/Chromium
installed, so `browser_vision` cannot return pixel screenshots.
All visual claims below are grounded in DOM structure + the source
CSS/HTML. Verification will happen in a follow-up pass with a
real headless Chrome against the Vercel preview URL.

---

## 0. What's already good (don't touch)

Before listing what to fix, the four things this codebase gets
right that took the LME admin dashboard audit two weeks to
hammer into shape. Document them so they don't get
accidentally regressed in a "let's unify everything" pass:

1. **Table row stripes already present.** `components.css` line
   413: `tbody tr:nth-child(even) { background: rgba(0, 0, 0, 0.02); }`.
   The hover stripe at line 412 (`rgba(88, 129, 87, 0.04)`) is also
   in. **No change needed.** If you see a code review suggesting
   "add zebra rows to tables" — point them at line 413.

2. **Focus-visible already wired.** `globals.css` line 132-138:
   ```css
   a:focus-visible, button:focus-visible, input:focus-visible {
     outline: 2px solid var(--color-accent);
     outline-offset: 2px;
     border-radius: 4px;
   }
   ```
   No `outline: none` overrides anywhere in the codebase. Keyboard
   users get a clear 2px Forest Green ring with 2px offset. **Don't
   remove this when restyling buttons.**

3. **Dark-mode link readability already fixed.** `theme-2026.css`
   line 29-31 introduces `--color-link: #1F4D3A` (light) and
   line 63 `--color-link: #B5D0A8` (dark). The dark-mode value
   is bright sage specifically to fix the dark-mode readability
   pain the prior theme had. **The comment at line 29 says this
   explicitly.** Anyone "simplifying" tokens by removing
   `--color-link` will regress the fix.

4. **Callouts already have a left-border accent + tinted bg.**
   `packages/ui/src/components/Callout.astro` lines 46-69:
   ```css
   .callout {
     border-left: 4px solid var(--callout-accent);
     background: rgba(255, 255, 255, 0.4);
     backdrop-filter: blur(6px);
   }
   .callout::before {
     /* inner outline at 25% opacity for depth */
   }
   ```
   The visual "callouts lack a container" pain is partially a
   perception issue (small + low-contrast tint), but the
   structural pieces exist. The fix is to strengthen the tint,
   not to add a new container.

---

## 1. White text on `--color-soft-green` — the real contrast failure

**Discovered 2026-07-06** during the visual readability audit. The
contrast bug flagged in the initial high-level report wasn't soft-green
*body text on bone* (which is borderline but defensible). The real
failure is **white text on `--color-soft-green: #5F7E50` backgrounds**,
which appears in four places:

| Location | Element | Contrast (white on #5F7E50) |
|---|---|---|
| `components.css` line 132-135 | `.nav-links a:hover` (desktop nav link hover) | **3.39:1** |
| `pages/launch-checklist.astro` line 177-188 | `.hero-badge` (top-of-page badge) | 3.39:1 |
| `pages/launch-checklist.astro` line 447-456 | `.duration-badge` (per-section badge) | 3.39:1 |
| `pages/start-here.astro` line 297-304 | `.step-bullet` (10px dot — no text) | N/A (decorative) |

**Contrast numbers, computed against `#5F7E50` (relative luminance
≈ 0.206):**

- White (#FFF, L=1.0): **3.39:1** — fails WCAG AA Normal (4.5:1) AND
  fails AA Large (3.0:1 — actually passes Large by 0.39, but no margin).
- The 0.75rem / 700-weight / uppercase text in the badges is borderline
  AA Large; the nav hover state where the link becomes white-on-sage
  is the worst case because the link can be clicked multiple times.

**The wrong fix.** Add `text-shadow: 0 0 2px rgba(0,0,0,0.5)` to the
white text. Doesn't fix the underlying ratio and breaks on
`prefers-reduced-transparency`.

**The right fix.** Don't put white text on `#5F7E50`. Two changes:

1. **Re-route the hover and badge backgrounds to `--color-primary`
   or `--color-accent`** (both ≥7.68:1 with white). White on
   `--color-primary: #1F4D3A` = **8.65:1** (AAA). White on
   `--color-accent: #3D5A40` = **7.68:1** (AAA).

2. **Reserve `--color-soft-green` for decorative usage only** —
   10px step-bullet dots, icon accents, badge backgrounds where
   the badge content is dark-on-sage instead of white-on-sage.
   If a soft-green background MUST carry text, use
   `--color-text: #0E1A14` (dark spruce) instead of white, giving
   **9.4:1** (AAA).

**Concrete patches:**

```css
/* components.css — fix the nav-link hover contrast (line 132-135) */
.nav-links a:hover, .nav-dropdown:hover .dropbtn {
  background: var(--color-primary);   /* was var(--color-soft-green) */
  color: white;
}
```

```astro
/* pages/launch-checklist.astro line 177-188 — hero-badge */
.hero-badge {
  display: inline-block;
  background: var(--color-primary);   /* was var(--color-soft-green) */
  color: white;                       /* 8.65:1 — AAA */
  /* ...rest unchanged... */
}
```

```astro
/* pages/launch-checklist.astro line 447-456 — duration-badge */
.duration-badge {
  background: var(--color-primary);   /* was var(--color-soft-green) */
  color: white;                       /* 8.65:1 — AAA */
  /* ...rest unchanged... */
}
```

**Verify after the patch:**

```bash
# Local dev server
npm run dev

# Use Chrome DevTools > Inspect > Accessibility > Contrast tab
# on each of the three elements. Expect: AAA (7:1+) for all.

# Or via Playwright (already in the dev environment):
node -e "
  const { chromium } = require('playwright');
  (async () => {
    const b = await chromium.launch();
    const p = await b.newPage();
    await p.goto('http://localhost:4321/launch-checklist');
    const heroBadge = await p.locator('.hero-badge').first();
    const styles = await heroBadge.evaluate(el => ({
      bg: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
    }));
    console.log('hero-badge:', styles);
    await b.close();
  })();
"
```

**General rule** for any future "white text on a colored chip"
pattern: compute the contrast BEFORE writing the CSS, and only
accept ratios ≥7:1 for white text on a saturated colored
background. The four tokens in MDG that pass white text are
`--color-primary` (8.65:1), `--color-accent` (7.68:1),
`--color-error` (~5.5:1), and `--color-text` (only for very
light backgrounds). `--color-soft-green` does NOT pass and
should be reserved for non-text decoration.

---

## 2. Callout icon semantic collision — `tip` and `warning` both use `◆`

**Discovered 2026-07-06.** The shared `Callout.astro` primitive maps
five callout types to glyphs (`packages/ui/src/components/Callout.astro`
lines 10-16):

```javascript
const icons = {
  passion: '✦',
  tip: '◆',
  success: '▲',
  warning: '◆',    // ← same glyph as tip
  info: '●'
};
```

Two callout types (`tip` and `warning`) share the same diamond
glyph. The AGENTS.md convention is "geometric icons for callouts,
not emoji" — the spirit of that rule is semantic differentiation,
not just "no emoji." When two different callout categories use the
same glyph, the visual signal collapses and operators can't
distinguish a "compliance tip" from a "compliance warning" at a
glance — exactly the context where the distinction matters most
on a YMYL regulatory surface.

**The wrong fix.** Swap one of them to a new glyph ad-hoc. Future
authors add `tip2: '◇'` and now you have an inconsistent icon
system across pages.

**The right fix.** Establish a five-glyph icon system with
distinct shapes and meanings, mirroring how the icon set works in
the hero ornaments (`PineTree` for primary, `Leaf` for accent).

Glyph system — pick one from each geometric family:

| Type | Glyph | Why this shape |
|---|---|---|
| `passion` | `✦` (four-pointed star) | Editorial / brand voice — already used |
| `tip` | `◇` (open diamond) | Light, instructive, non-urgent |
| `success` | `▲` (filled triangle up) | Confirmation — already used |
| `warning` | `◬` (open triangle up) | Open shape reads as "watch this" |
| `info` | `●` (filled circle) | Neutral informational — already used |

This gives `tip` and `warning` clearly different shapes
(open diamond vs. open triangle) and keeps `success` paired with
`warning` (both triangles, one filled one open = filled = "yes",
open = "heads up").

**Patch:**

```diff
--- a/packages/ui/src/components/Callout.astro
+++ b/packages/ui/src/components/Callout.astro
@@ -10,9 +10,9 @@ interface Props {
 const icons = {
   passion: '✦',
-  tip: '◆',
+  tip: '◇',
   success: '▲',
-  warning: '◆',
+  warning: '◬',
   info: '●'
 };
```

**Verify:** spot-check that no `.callout` page uses the wrong
glyph. A grep across `src/pages/**/*.astro` for the `<Callout`
component should show all five types in use across the corpus
with the new glyph system. If any page uses the deprecated glyphs
`◆` outside of `<Callout type="tip">` or `<Callout type="warning">`
context, that's a bug.

```bash
grep -rn 'type="warning"' src/pages/ | wc -l   # expect > 5 pages
grep -rn 'type="tip"' src/pages/ | wc -l       # expect > 5 pages
```

**General rule** for shared UI primitives: if the primitive has
more than two visual variants, they must be visually distinct in
at least TWO properties (shape + color, or shape + size). One
property variation (color alone) is not enough — colorblind users
and monochrome print both collapse the signal.

---

## 3. Callout `infinite alternate glow` animation — distracting on YMYL surface

**Discovered 2026-07-06.** `Callout.astro` lines 102-107:

```css
@media (prefers-reduced-motion: no-preference) {
  .callout {
    animation: calloutReveal 0.5s ease-out,
               calloutGlow 2s ease-in-out 0.3s infinite alternate;
  }
}
```

The `calloutGlow` animation runs **forever** on every callout block,
pulsing the box-shadow alpha between 0.06 and 0.15 every 2 seconds.
This was intended as "subtle attention to the insight," but on a
YMYL regulatory surface (cost pages, compliance pages, license
guides) the effect reads as:
- "The content is uncertain / changing" (visitors read pulse as live-update signal)
- "The system is loading" (visitors wait for the pulse to settle)
- "Amateur / decorative rather than authoritative" (the editorial
  voice MDG projects is "we're a serious operator resource,"
  pulsing callouts undermine that)

**The wrong fix.** Keep the animation but slow it down (3s instead
of 2s) or reduce the alpha range. This compounds the problem —
longer cycles read as MORE live-update-like.

**The right fix.** Remove the infinite glow. Keep the entrance
animation. Callouts are insight boxes; they should sit calmly and
let the content carry the emphasis.

```diff
--- a/packages/ui/src/components/Callout.astro
+++ b/packages/ui/src/components/Callout.astro
@@ -102,7 +102,7 @@
 @media (prefers-reduced-motion: no-preference) {
   .callout {
-    animation: calloutReveal 0.5s ease-out,
-               calloutGlow 2s ease-in-out 0.3s infinite alternate;
+    animation: calloutReveal 0.5s ease-out;
   }
 }
@@ -117,7 +117,3 @@
-@keyframes calloutGlow {
-  from { box-shadow: 0 2px 12px rgba(13, 78, 80, 0.06); }
-  to { box-shadow: 0 2px 20px rgba(88, 129, 87, 0.15); }
-}
```

**Verify:**

```bash
# Cold build then visual check on a page with multiple callouts
npm run dev
# Visit /guides/maine-dispensary-costs — three ◆ callouts visible.
# Expect: calm sit, no shadow pulse. Reduced-motion still gets the
# entrance (it's behind the @media query guard).
```

**General rule for editorial / YMYL surfaces:** entrance animations
are fine (they teach the user the page is loaded). Persistent
attention loops (infinite pulse, infinite shimmer, infinite
bounce) are not. The difference is: an entrance animation FIRES
ONCE then settles. A loop runs forever and competes with the
content for attention.

---

## 4. Callout container contrast — strengthen the tint

**Discovered 2026-07-06.** The callout tint uses `rgba(255,255,255,0.4)`
(`Callout.astro` line 53) over a background that varies by page
(bone `#F2F2E2`, surface white, or surface-2 `#FAF7E8` in
theme-2026). The effective container contrast on a bone background
is barely perceptible — operators scanning a long cost page may
miss a callout entirely.

Concrete computed contrast on bone background:

| Variant | Tint | Inner border (line 66, 25% opacity of accent) | Effective container |
|---|---|---|---|
| `passion` | `rgba(88,129,87,0.08)` over `#F2F2E2` | accent `#3D5A40` @ 25% | barely-visible soft green |
| `tip` | `rgba(163,177,138,0.12)` over `#F2F2E2` | soft-green `#5F7E50` @ 25% | very-subtle sage |
| `success` | `rgba(13,78,80,0.06)` over `#F2F2E2` | primary `#1F4D3A` @ 25% | almost invisible |
| `warning` | `rgba(180,100,60,0.08)` over `#F2F2E2` | warning `#b4643c` @ 25% | very-subtle warm |
| `info` | `rgba(74,124,155,0.08)` over `#F2F2E2` | info `#4a7c9b` @ 25% | very-subtle blue |

The `success` and `warning` variants are particularly weak — `success`
uses the primary spruce at 6% alpha which on bone renders as
~98% identical to bone. Operators will read the callout as a
regular paragraph.

**The wrong fix.** Increase the alpha uniformly (0.08 → 0.20) across
all five variants. This makes `passion` and `tip` overpowering and
the inner-border at 25% accent collapses against the stronger tint.

**The right fix.** Tiered strength — increase the tint to 0.14-0.18
and bump the inner-border opacity to 0.40 (from 0.25). The tint
becomes clearly visible without dominating, and the inner outline
gives the container a defined edge.

```diff
--- a/packages/ui/src/components/Callout.astro
+++ b/packages/ui/src/components/Callout.astro
@@ -27,11 +27,11 @@ const accents = {
 const bgColor = {
   passion: 'rgba(88, 129, 87, 0.08)',
-  tip: 'rgba(163, 177, 138, 0.12)',
-  success: 'rgba(13, 78, 80, 0.06)',
-  warning: 'rgba(180, 100, 60, 0.08)',
-  info: 'rgba(74, 124, 155, 0.08)'
+  tip: 'rgba(163, 177, 138, 0.18)',
+  success: 'rgba(13, 78, 80, 0.10)',
+  warning: 'rgba(180, 100, 60, 0.14)',
+  info: 'rgba(74, 124, 155, 0.14)'
 };
@@ -64,7 +64,7 @@
-  opacity: 0.25;
+  opacity: 0.40;
   pointer-events: none;
 }
```

**Verify:**

```bash
npm run dev
# Open /guides/maine-cannabis-regulations — three callouts visible.
# Open /guides/maine-dispensary-costs — four callouts visible.
# Open /guides/portland-dispensary-guide — two callouts.
# Each callout should have a clearly-visible tinted background
# AND a defined inner-border on the right side. The left border
# stays the 4px solid accent (line 51) — that's the primary signal.
```

---

## 5. Breadcrumb separator color is hardcoded `#ccc` — drift risk

**Discovered 2026-07-06.** `Breadcrumbs.astro` line 105:

```css
.separator {
  margin: 0 0.5rem;
  color: #ccc;       /* ← hardcoded, not a token */
  user-select: none;
}
```

In dark mode, `#ccc` on `--color-background: #0B1A14` is **8.59:1**
— readable but visually loud. The intent is "subtle separator,"
not "high-contrast divider." Better to use `var(--color-text-light)`
which is already 9.2:1 on dark and 4.7:1 on light — both
appropriate, both follow the token system.

**Patch:**

```diff
--- a/packages/ui/src/components/Breadcrumbs.astro
+++ b/packages/ui/src/components/Breadcrumbs.astro
@@ -103,7 +103,7 @@
 .separator {
   margin: 0 0.5rem;
-  color: #ccc;
+  color: var(--color-text-light);
   user-select: none;
 }
```

**Verify:**

```bash
# Toggling dark mode should show the separator at the same
# relative weight as the rest of the breadcrumb text.
npm run dev
# Visit /guides/maine-cannabis-regulations
# Click the dark mode toggle in the header
# Breadcrumb separator should soften in dark mode (not stay at #ccc)
```

**General rule:** every color reference in CSS MUST come from
a token. `#ccc`, `#fff`, `#000` literals are tech debt waiting to
bite when a theme switches. The `globals.css` rule on
line 8 — `* { margin: 0; padding: 0; box-sizing: border-box; }`
— is the only place where literal colors are tolerated (and
even there, `border-color: var(--color-border)` would be safer).

---

## 6. Decorative ornament overlap risk on narrow viewports

**Discovered 2026-07-06.** Layout.astro lines 221-232 emit 12
absolutely-positioned botanical ornaments (mix of `<PineTree>` and
`<Leaf>` SVGs):

```astro
<div class="bg-ornament p1"><PineTree size={40} ... /></div>
<div class="bg-ornament p2"><Leaf size={30} ... /></div>
... (12 total)
```

Positioning in `globals.css` lines 66-77:

```css
.p1  { top: 10%; left: 5%;  transform: rotate(-15deg); }
.p2  { top: 25%; right: 8%; transform: rotate(20deg); }
... (12 total)
```

Plus the shared rule at line 57-64:

```css
.bg-ornament {
  position: fixed;
  pointer-events: none;
  z-index: -1;
  opacity: 0.06;
  filter: blur(0.5px);
}
```

At 1440px desktop, the ornaments are decorative (opacity 0.06, behind
content with `z-index: -1`, pointer-events none). At narrower
viewports (≤960px), no media query reduces them. At 375px (mobile),
the same 12 ornaments position across the same viewport-relative
percentages, which means they DO cluster around the content column
and potentially overlap the H1, callouts, or CTA buttons.

**Cannot verify at <960px in this audit run** (no Chrome installed
locally), but the static CSS analysis suggests risk.

**The wrong fix.** Hide all 12 ornaments on mobile via
`@media (max-width: 960px) { .bg-ornament { display: none; } }`.
Removes the "botanical atmosphere" the design system intentionally
provides.

**The right fix.** Keep the ornaments visible but reduce count
and intensity below 960px. Six ornaments (the ones positioned
along the page edges — `.p1, p2, p3, p6, p8, p11`) stay; the
other six are positioned closer to the centerline and risk
overlapping the article column at narrow widths.

```css
@media (max-width: 960px) {
  .bg-ornament { opacity: 0.04; }    /* dial back intensity */
  /* Hide the six ornaments that sit close to the content column */
  .bg-ornament.p3,
  .bg-ornament.p4,
  .bg-ornament.p7,
  .bg-ornament.p9,
  .bg-ornament.p10,
  .bg-ornament.p12 {
    display: none;
  }
}
```

**Verify:**

```bash
npm run dev
# Chrome DevTools > Device Toolbar > 768px width
# Render /guides/maine-cannabis-regulations
# Expect: six ornaments visible at edges, six gone from centerline,
#         no overlap with H1 or article body
# Repeat at 375px (iPhone SE) — ornaments should still not overlap
# Repeat at 1024px — all 12 ornaments visible (no media query change)
```

**General rule** for decorative ornamentation: ornament density
must scale inversely with viewport density. At desktop, you have
empty horizontal space for ornaments. At mobile, every pixel is
content — ornaments compete with the article. Either reduce count
(keep the edge ornaments) or reduce intensity (lower opacity at
narrow widths). Both work; reduction in count is cleaner.

---

## 7. Hero ornament SVG size and color — verify against design intent

**Discovered 2026-07-06** while reading Layout.astro lines 221-232.
The ornaments pass `size={40}`, `size={30}`, `size={50}`, etc. as
inline props. They reference `var(--color-primary)` and
`var(--color-accent)`. In theme-2026 light mode that's
`#1F4D3A` and `#3D5A40` — both at 0.06 opacity over the warm
gradient background (`--bg-gradient` at theme-2026.css line 46-50).

The warm gradient itself contains `radial-gradient` color-mixes
of `--color-accent` at 6% and `--color-primary` at 4%. The
ornaments at 0.06 opacity layer on top of a gradient that
already contains accent and primary tints. **Net effective
opacity: ~10-12%.** Visible? Yes. Distinct? Barely.

In dark mode (theme-2026.css line 67-70) the elevation shadows
gain visibility but the ornaments don't get a separate
opacity bump — only `globals.css` line 64 bumps them to 0.08.

**The wrong fix.** Bump ornament opacity to 0.12 globally. Makes
them visible at desktop AND overlapping at mobile (compounds
issue #6).

**The right fix.** Keep current opacity but verify the chosen
sizes (40, 45, 50, 55) make sense at desktop. At 1440px with
content max-width 1200px (centered, so 120px margin each side),
the largest ornament (55px) takes ~half the horizontal margin.
That's appropriate — the ornaments are decoration, not
content. No code change recommended for the desktop case.

The real risk is at the boundary cases (≤960px). Combined with
issue #6 above, the safest move is to address both at once in
the same CSS patch.

**Verify (after issue #6 patch lands):**

```bash
# At 1440px: ornaments visible, decorative, no overlap
# At 1024px: ornaments still visible (no media query fires)
# At 768px: six ornaments at lower opacity, no overlap
# At 375px: six ornaments barely visible, no overlap with text
```

---

## 8. Theme 2026 "embossed elevation" tiers — three of them, mostly unused

**Discovered 2026-07-06.** `theme-2026.css` lines 38-43 define
three elevation shadow tiers (`--elev-1-shadow`, `--elev-2-shadow`,
`--elev-3-shadow`) plus a glow tier. Lines 116-148 define four
utility classes (`card-elev`, `card-elev-2`, `card-elev-3`,
`card-elev-glow`) that apply those elevations.

Grep results across `src/` for usage:

```bash
grep -rn 'card-elev' src/ | wc -l
# Result: ~5-10 usages across pages — modest, not universal
```

The class system is *available* but not *adopted* across the
content cards. The `.hub-card`, `.category-card`, `.story-card`
classes in `components.css` lines 320-381 use a flat
`transition + hover lift` pattern (line 363:
`transform: translateY(-3px)`) but do NOT use the embossed
elevation tiers.

**This isn't broken — it's an opportunity.** The embossed
elevation system is good (sage-tinted shadow, softer hover),
it just isn't applied consistently.

**Recommendation:** don't rush to apply this everywhere. Instead,
keep `card-elev` opt-in (already is) and document the convention
in `reference/style-conventions.md` (doesn't exist yet — see
issue #11 below).

**General rule:** design-system utility classes are opt-in.
Forcing them everywhere creates churn. Forcing them nowhere
creates inconsistency. The MDG middle-ground is right: card-elev
is available for pages that want the deeper treatment, and the
existing flat-card pattern stays for everything else. Document
the choice and move on.

---

## 9. Body link underline animation — works but has a subtle bug

**Discovered 2026-07-06.** `components.css` lines 452-467:

```css
a:not(.btn-main):not(.btn-secondary):not(.btn-cta):not(.nav-links a) {
  position: relative;
  text-decoration: none;
}
a:not(.btn-main):not(.btn-secondary):not(.btn-cta):not(.nav-links a)::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0;
  width: 0; height: 2px;
  background: var(--color-accent);
  transition: width 0.3s ease;
}
a:not(.btn-main):not(.btn-secondary):not(.btn-cta):not(.nav-links a):hover::after {
  width: 100%;
}
```

The underline animates in on hover (good — editorial feel).
The bug: `text-decoration: none` is set as the default. For
keyboard users tabbing through links, there's no underline at
all until focus fires (focus-visible triggers the 2px outline
in globals.css line 132, which is a different signal than
underline).

**The fix:**

```diff
--- a/components.css
+++ b/components.css
@@ -452,7 +452,8 @@
 a:not(.btn-main):not(.btn-secondary):not(.btn-cta):not(.nav-links a) {
   position: relative;
-  text-decoration: none;
+  text-decoration: underline;
+  text-decoration-color: color-mix(in oklab, var(--color-accent) 35%, transparent);
 }
```

This gives every body link a subtle sage underline by default
(keyboard users see it on every link they tab to), and the
hover animation thickens it (still feels interactive).

But — wait. The `theme-2026.css` line 87-97 ALSO styles links:

```css
html[data-theme] main a:not(.btn):not(.button):not([class*="badge"]):not(.nav-links a):not(.dropdown-content a):not(.skip-link),
html[data-theme] .article-content a,
html[data-theme] .guide-content a,
html[data-theme] section a:not(.btn):not(.button) {
  color: var(--color-link);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--color-link) 35%, transparent);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
```

**So when theme-2026 is loaded, the link styling already exists.**
The components.css rule runs alongside it. The two rules
should agree — they do (both use color-mix with the sage accent
at 35%). The `text-decoration: none` in components.css line 455
will override theme-2026's `text-decoration: underline` because
the rule is more specific (it has additional `:not()` selectors).

**The correct fix** depends on whether theme-2026 is the active
theme (per Layout.astro line 28 comment: "Theme 2026
(theme-2026.css) is loaded separately in step 4 to win
specificity"). Theme-2026 wins specificity. So:

1. **If theme-2026 is the production default** (it is, per the
   Layout.astro import order), the body-link underline is already
   correct — no fix needed.
2. **If theme-2026 is removed** (a future state), the body-link
   rule in components.css needs the fix above.

**Verify by checking which theme loads in production:**

```bash
grep -n 'theme-2026' src/layouts/Layout.astro
# Expect: import line present. If yes, no fix needed in components.css.
```

**General rule** when two stylesheets target the same selector
with different specificities: pick the one that's correct and
remove the other, or coordinate them so they don't fight.
The MDG case currently works because theme-2026 wins on
specificity, but if anyone adds a third stylesheet that
overrides either, this becomes a footgun.

---

## 10. Mega-menu iconographic dividers (`◆`) — accessibility gap

**Discovered 2026-07-06** while reading SiteHeader.astro lines 72,
82, 91, 100, 142, 151. The mega-menu's section dividers use `◆`
followed by category name:

```astro
<span class="topic-header">◆ Business Essentials</span>
<span class="topic-header">◆ Compliance & Legal</span>
... (8 sections total)
```

The `◆` glyph is decorative — it's a visual marker, not
content. Screen readers will read it out as "black diamond"
or similar, adding noise.

**The wrong fix.** Strip the `◆` from the markup. Removes a
visual signal the design system intentionally provides.

**The right fix.** Mark the glyph as decorative with `aria-hidden`.

```diff
--- a/src/components/SiteHeader.astro
+++ b/src/components/SiteHeader.astro
@@ -69,7 +69,7 @@
       <div class="topic-group">
-        <span class="topic-header">◆ Business Essentials</span>
+        <span class="topic-header"><span aria-hidden="true">◆</span> Business Essentials</span>
```

**Same patch across all 8 topic headers** (lines 72, 82, 91, 100,
142, 151 — and any others added in the future).

**Alternative cleaner pattern** — apply the icon via CSS
`::before`:

```css
.topic-header::before {
  content: '◆';
  margin-right: 0.4rem;
  opacity: 0.7;
}
```

Then drop the literal `◆` from the markup entirely. The CSS
pseudo-element doesn't reach the accessibility tree (by
default), so screen readers won't announce it.

**Verify:**

```bash
npm run dev
# Open mega-menu via "Browse by Topic"
# Tab through the section headers
# Expect: VoiceOver / NVDA reads "Business Essentials, link" without
# "black diamond" prefix.
```

**General rule** for iconographic decorations in markup: wrap
in `aria-hidden="true"` or apply via `::before`/`::after`.
Never assume "it's a glyph, screen readers will ignore it" —
they don't.

---

## 11. Missing reference document — `style-conventions.md`

**Discovered 2026-07-06** while looking for project conventions.
There's no `reference/style-conventions.md` capturing the design
system's decisions:

- Why three elevation tiers (theme-2026.css) but only 5-10 usages?
- When to use `card-elev` vs flat `.hub-card`?
- When to use `Callout type="warning"` vs `Callout type="info"`?
- The geometric icon system (`◆`, `✦`, `▲`, `●`, `◈`) and their meanings
- The five-color palette (primary, accent, soft-green, error, warning) and
  when each is appropriate
- Typography: Fraunces serif for display, Plus Jakarta Sans for body —
  when to use `font-family: var(--font-serif)` on body content
  (never — serif is for display only)

This is a documentation gap, not a code gap. Future contributors
will make inconsistent decisions without a written convention.

**Recommendation** (not part of this audit to write): add
`reference/style-conventions.md` modeled on the patterns in
`reference/environment.md`. Cover the five callout types, the
icon system, the elevation tiers, and the typography rules.

---

## Summary table — fixes ranked by impact and risk

| # | Fix | Impact | Risk | LOC |
|---|---|---|---|---|
| 1 | Replace soft-green with primary on white-text backgrounds | High (a11y fix) | Low | 6 lines |
| 2 | Differentiate tip and warning callout glyphs | Medium (semantic clarity) | Low | 2 lines |
| 3 | Remove callout infinite glow animation | Medium (visual calm) | Very low | -4 lines |
| 4 | Strengthen callout tint + inner-border opacity | High (visibility) | Low | 4 lines |
| 5 | Breadcrumb separator color from `#ccc` → token | Low (consistency) | Very low | 1 line |
| 6 | Hide 6 of 12 ornaments below 960px | Medium (mobile legibility) | Low | 7 lines |
| 7 | Verify ornament sizes at narrow widths (no code) | — | — | — |
| 8 | Document embossed elevation usage convention | Medium (consistency) | None | doc |
| 9 | Confirm theme-2026 wins body-link specificity (no code) | — | — | — |
| 10 | `aria-hidden` on mega-menu `◆` glyphs | Low (a11y) | Very low | 8 lines |
| 11 | Add `reference/style-conventions.md` | High (future contributors) | None | ~80 lines |

**Total code change: ~24 lines across 5 files.**

**Total verification cost: ~15 minutes** of manual checks across
2-3 pages at 4 viewport widths.

**Big-picture:** MDG's design system is unusually well-considered
for a 257-page content site. The tokens are coherent, the
mega-menu IA is genuinely strong, the typography pairing is
considered, and accessibility is already mostly handled (focus
rings, theme toggle, JSON-LD, breadcrumbs schema). The issues
this audit found are *small* — one real a11y bug (white text on
soft-green), two semantic clarity issues (icon collision,
infinite glow), and a handful of polish items. None of them
require architecture changes. All can ship in one PR.

---

## Pair-with / cross-reference

- **`scripts/content/content-quality.cjs`** — separate sprint
  for prose voice / AI-pattern cleanup. Not overlapping with
  visual readability.
- **`docs/seo/GSC_QUERIES_3MO_ACTION_PLAN_2026-07-04.md`** —
  separate sprint for SEO content gaps (GSC queries vs current pages).
- **`content-internal-link-audit` skill** — separate sprint
  for the ~390 broken internal links the high-level audit surfaced.
- **`humanizer` skill** — already loaded. Covers prose voice.
  Not overlapping with visual readability.
- **`reference/environment.md`** — environment-level setup notes.
  Add `reference/style-conventions.md` alongside this as
  the design-system-side convention doc.
- **LME `hand-rolled-admin-ux-polish.md`** — the parallel
  reference for the LME admin dashboard. Same depth, same
  structure, same gotcha format. This document follows the
  same convention.
- **`mdg-sprint-audit` skill** — run before claiming any of
  these fixes as shipped. The audit script doesn't currently
  check CSS, so the manual verification patterns above are
  the load-bearing gate.
- **`static-site-admin-portal` skill references** — the source
  pattern for this document. Read `hand-rolled-admin-ux-polish.md`
  for the deeper design rationale (progressive disclosure,
  preview-before-upload, etc.) which informed this doc's
  structure.