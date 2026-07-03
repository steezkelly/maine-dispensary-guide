# Cannabis B2B Affiliate / Lead-Gen Plan (added 2026-07-03)

## The actual revenue opportunity

Site has 5 lead-capture forms live (per `LEAD_CAPTURE_SETUP.md`), all routing to Formspree endpoint `xvgzlowz`. Forms already capture `interest` field with values: `licensing / banking / real-estate / operations / not-sure`. **No commercial routing exists** — leads come in, Steve handles manually, no per-lead commission. The vendor directory and 4 B2B guides (POS, banking, insurance, funding, marketing) name vendors by name with zero monetization.

This is the highest-leverage revenue gap. Affiliate lead-gen on a B2B cannabis site beats display ads by 10-50x per qualified lead.

## Why not AdSense-first

AdSense code is now wired (ads.txt + pub-4930219889179618). At MDG's traffic (330 clicks / 3 months per user), realistic AdSense revenue is $5-20/month. One qualified cannabis B2B lead pays $100-500. The math is not close.

## The five B2B verticals MDG content already targets

Each of these has a corresponding guide page already published and currently unmonetized:

| Vertical | Existing MDG page | Vendor category | Lead value (typical) |
|----------|-------------------|-----------------|----------------------|
| POS / retail software | `/guides/maine-cannabis-pos` | Cannabis POS | $200-500/lead |
| ERP / distribution | `/guides/maine-cannabis-wholesale-guide`, `/guides/maine-cannabis-vertical-integration` | Cannabis ERP (Distru-class) | $200-500/lead |
| Insurance | `/guides/maine-cannabis-business-insurance`, `/guides/maine-cannabis-workers-comp-insurance` | Cannabis-specialty insurance brokers | $50-200/lead |
| Banking | `/guides/maine-cannabis-banking-solutions` | Cannabis-compliant banks / credit unions | $100-300/lead |
| Marketing / e-commerce | `/guides/maine-cannabis-marketing-compliance` | Cannabis CRM / ecom (Dutchie, Meadow, Baker) | $100-300/lead |

Plus, currently on the vendor directory page, 4 POS vendors named with no monetization: **Flowhub, Cova, Dutchie, MJ Platform**.

## Specific vendors to pursue (apply for partner programs)

These are the B2B software vendors named in your own content. For each, apply directly — most cannabis B2B software companies run private partner programs, not public affiliate networks.

### Tier 1 — apply first (named in your content, highest intent)

1. **Flowhub** (POS)
   - Why: named in your POS guide + vendor directory
   - Apply: https://www.flowhub.com/contact or via account manager post-Maine-account
   - Typical commission: $200-500/lead (per industry standard for cannabis POS)

2. **Dutchie** (POS + e-commerce)
   - Why: named in your vendor directory; acquired LeafLogix + Green Bits, dominant in market
   - Apply: https://www.dutchie.com/partners (or contact via their partner team)
   - Typical commission: $200-500/lead

3. **Distru** (ERP / wholesale / distribution)
   - Why: dominant cannabis ERP, has a "partner" page; your wholesale + vertical-integration guides are the match
   - Apply: https://www.distru.com (look for "Partners" or contact sales)
   - Typical commission: $200-500/lead

4. **Cova** (POS)
   - Why: named in your vendor directory
   - Apply: https://www.covasoftware.com (contact sales)
   - Typical commission: $200-500/lead

### Tier 2 — apply second (broader match, more setup)

5. **Meadow** (POS + e-commerce + delivery)
   - Why: their blog ("Dutchie alternatives 2026") shows they're investing in publisher relationships
   - Apply: contact via their site
   - Typical commission: $200-500/lead

6. **Jane Technologies / Jane Dosify** (POS)
   - Why: mentioned in their own competitive content; growing Maine presence
   - Apply: contact via site
   - Typical commission: $200-500/lead

7. **Treez** (POS — enterprise)
   - Why: named in the Flowhub competitive piece; enterprise tier
   - Apply: contact via site (slower sales cycle, bigger payouts)
   - Typical commission: $300-600/lead

### Tier 3 — add if/when vertical guides grow

8. **Baker Technologies** (CRM / e-commerce for dispensaries) — for marketing-compliance guide
9. **LeafLink** (B2B wholesale marketplace) — for the wholesale guide
10. **Surna / Quest** (cultivation climate control) — for the cultivation guide

## ⚠ Reality check on commission numbers

The "$100-500/lead" ranges above are **industry-typical** for cannabis B2B software, not published rate cards I could verify. Most cannabis B2B software companies do **not publish** their partner commissions publicly. The actual numbers come back in the partner agreement after you apply and get accepted. Plan for the lower end of the range, treat the upper end as upside.

The only **publicly verified** rate I found in research: 10% on referred orders for some programs, $2-35 CPA for some THCA programs. The cannabis B2B software space tends to pay flat per-lead, not revenue share, because the contracts are large ($600-1,500/month per location per the Flowhub competitive piece).

## How to wire it in (mechanical, ~3-5 hours work)

Once you have one or more partner agreements, the integration is straightforward because the plumbing is already there.

### Option A — "Apply via the lead form" (recommended, lowest friction)

For each guide that names a vendor:

1. Add a CTA below the vendor name: "Apply for [Vendor] demo via Maine Dispensary Guide"
2. CTA links to `/contact?vendor=flowhub&source=maine-cannabis-pos` (or similar)
3. The contact form (or a new dedicated form) collects name + email + business stage + intended location count
4. Formspree delivers to `xvgzlowz` with a new `_tags` field: `vendor-flowhub, lead-type-affiliate`
5. You (or an automated zap) forward to the vendor's partner team email
6. Vendor's partner team credits you when the lead converts to a paying account

### Option B — "Direct partner link" (better tracking, less control)

For each vendor with a public partner program:

1. Get your unique partner link (typically `https://vendor.com/signup?ref=YOURID`)
2. Add `rel="sponsored"` to the link in the guide
3. Vendor tracks the lead, pays you on conversion
4. Simpler but you have less visibility into which leads converted

### Option C — "Hybrid" (best long-term)

1. Most-affiliate-ready vendors get Option A (you control the lead data)
2. Higher-commission programs get Option B (they convert better, you give up lead data)
3. Track both in a simple Google Sheet per vendor: link, source page, lead count, conversion count, payout

## What I would build next (concrete code changes, when you give the go)

If you want me to proceed, the next two commits would be:

### Commit 1: Add `interest` → vendor routing in the lead form
- Update `/src/pages/resources.astro` (the referral form) so when a visitor picks a service category, the form pre-fills the recommended vendor(s) for that category
- Example: `service=legal` → suggest 2-3 cannabis attorneys with affiliate links
- This is a small change (~30 lines), no new dependencies

### Commit 2: Add an "Apply via MDG" CTA block to one guide
- Pick `/guides/maine-cannabis-pos.astro` as the test case
- Add a CTA section: "Apply for Flowhub / Dutchie / Cova demos via Maine Dispensary Guide"
- Each CTA links to `/contact?vendor=X`
- This is the change that actually generates leads

Then the rest of the guides get the same treatment, one per sprint, as you secure partner agreements.

## What I am NOT proposing

- **Not** joining a public affiliate network (ShareASale, Impact, CJ). Cannabis B2B vendors aren't on them.
- **Not** buying a list of cannabis business owners and cold-emailing. That crosses lines and the MDG brand is too good to spend on spray-and-pray.
- **Not** building a custom tracking dashboard. A Google Sheet per vendor is enough until you have 50+ leads/month.
- **Not** waiting for AdSense to start paying before doing this. They're independent. AdSense can be a $5-20/month background earner; lead-gen is the actual business.

## Concrete next step (your call)

I can do Commit 1 right now (form routing change) as a 30-line code change. Commit 2 requires you to apply for at least one vendor partner program first so the CTA actually goes somewhere. Both are reversible. Stop me if the plan needs adjusting.
