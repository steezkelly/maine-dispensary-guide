# Wave 2 Evidence Ledger — Authority Amplification

**Date:** 2026-07-29
**Strategy:** Amplify existing high-impression / low-position pages via internal link equity + factual tightening. NO new URLs.
**Branch:** `seo/wave2-edibles-authority-20260729`

## Why amplify instead of create

GSC (28-day, Jun 28–Jul 26) showed the target intents ALREADY have comprehensive owner pages. The problem is not content depth — it is internal link authority and ranking position. Creating new pages would cannibalize the existing owners.

| Query cluster | Impressions | Avg position | Owner page | Action |
|---|---|---|---|---|
| are edibles legal in maine / edibles laws | ~120 | 22.9 / 6.9 | `/blog/are-edibles-legal-in-maine` | improve in place + links |
| are mushrooms/psilocybin legal in maine | ~50 | 7.2 | `/blog/are-mushrooms-legal-in-maine` | improve in place + links |
| cannabis tourism / weed camp | ~75 | diffuse | `/blog/cannabis-friendly-maine-travel` | link to edibles owner |
| dispensary licensing / how-to (B2B) | ~100 | diffuse | existing cost-to-open owner | deferred to Wave 3 |
| cannabis jobs / training (B2B) | ~30 | diffuse | none | deferred to Wave 3 |

## Primary sources verified (2026-07-29)

- **28-B M.R.S. §703** — adult-use edible THC cap: 10 mg/serving, 200 mg/package (already on page, re-verified)
- **17-A M.R.S. §1102** — psilocybin Schedule X, possession Class D (already on page, re-verified)
- **Maine Legislature LD 1034 bill page** — final disposition: **"Enactment Failed," June 10, 2025**. Confirmed via legislature.maine.gov official record.
- **FDA National Priority Voucher program** — vouchers issued **April 24, 2026** to Compass Pathways (psilocybin/TRD), Usona Institute (psilocybin/MDD), Transcend Therapeutics (methylone/PTSD). Ibogaine NOT included; noribogaine IND (DemeRx NB) allowed to proceed.
- **P.L. 2025, ch. 764** (effective April 19, 2026) — amended 28-B §602(1)(F) edible testing; OCP implementation guidance April 28, 2026. Already covered on edibles-compliance + best-edibles pages.

## Critical factual correction (YMYL)

A fabricated claim had propagated across **four live pages**: that LD 1034 "established the Commission to Study Pathways for Creating a Psilocybin Services Program in Maine" with "a report due November 4, 2026."

**This commission does not exist.** LD 1034 was a decriminalization-only bill that failed final enactment and created nothing. Verified against the Maine Legislature's official bill page ("Enactment Failed, Jun 10, 2025").

Pages corrected:
1. `guides/maine-cannabis-regulations.astro` — false commission paragraph → accurate LD 1034 status
2. `blog/ibogaine-federal-executive-order-maine-2026.astro` — 7 false references → corrected
3. `blog/trump-psychedelic-executive-order-maine-psilocybin-2026.astro` — full false section + 5 downstream refs → replaced with "No Maine Psilocybin Commission Exists" + real April 24 FDA voucher update
4. `blog/are-mushrooms-legal-in-maine.astro` — FAQ + stat-block + body section → corrected (this is the GSC owner page)

Regression guard added to `wave2-authority-contract.test.cjs` (negative assertions prevent reintroduction).

## Link-authority changes

- `are-edibles-legal-in-maine`: inbound links 2 → 6
- `are-mushrooms-legal-in-maine`: inbound links 1 → 5
- New contextual links added from: how-much-weed, first-time-buyer, travel, best-maine-edibles, is-weed-legal, maine-psilocybin-guide, regulations, trump-psychedelic, ibogaine

## Content additions (user-requested)

- Edibles page already covered max dose (10mg/200mg) — verified, no duplicate added
- trump-psychedelic page updated with real April 24 FDA voucher outcome (was a stale "next week" prediction)

## Measurement baseline (for 2–4 week GSC follow-up)

- `are edibles legal in maine`: position 22.9, 64 impr (2 clicks) — target: top 10
- `are mushrooms legal in maine`: position 7.2 — target: top 5, CTR lift
- Follow-up date: ~2026-08-26

## Defer list (Wave 3)

- Dispensary licensing / how-to B2B owner expansion
- Cannabis jobs / training Maine page
- Tourism / weed-camp hub page (diffuse intent, needs hub-style answer)
