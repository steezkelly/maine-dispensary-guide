# Production Deploy Verification — 2026-07-18

PR #91 (squashed merge of `design/refined-editorial-ica-completion` →
`main` at `c6d3d454`) was deployed to production during this session.

Tag: `release/2026-07-18-refined-editorial-ica-completion` (bound to `c6d3d454`,
pushed to origin).

## Production homepage capture

Captured via Playwright against `https://mainedispensaryguide.com/`
across four viewport × theme combinations:

| Slot | Status | H1 | Sections | Horizontal scroll | Failed requests |
|---|---|---|---|---|---|
| Desktop 1440 light | 200 | 1 | 8/8 | no | 0 |
| Desktop 1440 dark | 200 | 1 | 8/8 | no | 0 |
| Mobile 360 light | 200 | 1 | 8/8 | no | 0 |
| Mobile 360 dark | 200 | 1 | 8/8 | no | 0 |

Screenshots: `/tmp/mdg-prod-capture/home-{desktop,mobile}-{light,dark}.png`

## Source-level verification on the live page

```text
required_sections:    8/8
retired composition:  0 (tour-carousel, mission-manifesto, journey-detail,
                          SiteHealthStrip, AnimatedBackdrop all absent)
h1 count:             1
formspree endpoint:   1 (preserved: https://formspree.io/f/xvgzlowz)
newsletter tracker:   1 (LeadFormTracker("newsletter_homepage") preserved)
cta-inline-index-01:  1 (Start Your Application)
cta-inline-index-10:  1 (newsletter submit)
OCP roster claim:     "OCP adult-use establishment roster, 2026-07-08"
```

## Production smoke

Read the live `sitemap-0.xml` (277 URLs) and sampled 55 routes
(homepage + first 30 + every 10th). All 55 returned HTTP 200 with body
length > 1 KB.

## Visual confirmation

Desktop 1440 light: hero H1 with serif typography, three evidence-strip
cards (107 stores / 49 municipalities / 111 city guides / market value),
3 numbered operator pathways, featured-analysis article card with autumn
Maine image and "Maine Cannabis Travel Guide 2026: Where to Stay, Buy & Use"
title, long alphabetical municipality table from Abbot Village to
Winterport, dated latest-intelligence list, dark-green newsletter CTA,
trust-layer links, and footer deep links.

Mobile 360 light: masthead responsive with logo + mobile-menu trigger,
hero H1 wraps without horizontal overflow, evidence-strip cards stack
vertically, operator pathways remain a vertical ordered list, municipality
table remains usable (alphabetical rows, no horizontal scroll within the
section), latest-intelligence rows visible with date + section labels,
newsletter form button visible, trust-layer links present, footer deep-
link grid.
