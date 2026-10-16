# Question Expansion Wave 1 Evidence Ledger

Date: 2026-07-21
Project: Maine Dispensary Guide
Design authority: `docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md`

## Decision rules

- One canonical owner per intent cluster.
- Improve an existing owner when it already satisfies the underlying intent.
- Create a URL only when no existing page has a focused, answer-first match.
- Treat Maine statutes, Maine Revenue Services, and the Office of Cannabis Policy as controlling sources for legal and program claims.
- Five actions are a ceiling, not a quota.

## Research record

- Research date: 2026-07-21.
- OpenSEO project: `4b687621-d649-420a-9e3a-7af5a9354297` (`mdg`, `mainedispensaryguide.com`, United States / English).
- Six inspected queries:
  1. `how much weed can you buy in maine`
  2. `do you need a medical card in maine`
  3. `how many plants can you grow in maine`
  4. `how to get a medical card in maine`
  5. `where can you smoke weed in maine`
  6. `can tourists buy weed in maine`
- Exact keyword metrics captured on the research date: `how to get a medical card in maine` — 110 monthly searches, KD 52; `how much weed can you buy in maine` — 30 monthly searches; `do you need a medical card in maine` — 20 monthly searches; `how many plants can you grow in maine` — 10 monthly searches. No exact metric value was recorded for the remaining two queries, so this ledger does not infer one.
- Live SERP finding: MDG did not appear in the top 20 organic results for any of the six queries. Google displayed an AI Overview and/or People Also Ask block for each query, favoring concise, source-backed direct answers.
- Primary authorities checked: [28-B M.R.S. §1501](https://legislature.maine.gov/statutes/28-B/title28-Bsec1501.html), [28-B M.R.S. §1502](https://legislature.maine.gov/statutes/28-B/title28-Bsec1502.html), [22 M.R.S. §2423-B](https://legislature.maine.gov/statutes/22/title22sec2423-B.html), the [OCP FAQ](https://www.maine.gov/dafs/ocp/resources/faq) for patient certification and patient-registry status, and OCP's adult-use IIC guidance linked from the FAQ. The IIC is an adult-use worker credential, not the ordinary patient credential.

## Wave 1 dispositions

| Intent cluster | Evidence | Existing owner | Action | Cannibalization control | Primary sources |
|---|---|---|---|---|---|
| How much cannabis can an adult buy or possess in Maine? | Live SERP review found mixed 5 g/10 g concentrate answers; current statute uses 10 g within the 2.5 oz total. Exact question is commercially useful to first-time buyers. | No focused answer-first URL. First-time buyer guide contains a supporting FAQ. | Create `/blog/how-much-weed-can-you-buy-in-maine`; make it the canonical detailed owner. Keep the first-time guide's answer short and link to it. | New page owns limits; buyer guide owns visit preparation and flow. | 28-B M.R.S. §1501; OCP consumer FAQ. |
| How do I become a Maine medical cannabis patient? | Existing page title and body incorrectly route patients to the adult-use IIC program and an invented OCP patient application/fee workflow. | `/blog/maine-medical-marijuana-patient-guide` | Correct and strengthen existing page. | No new card-acquisition URL. | 22 M.R.S. §2423-B; OCP qualifying-patient FAQ; OCP visiting-patient guidance. |
| How many plants can an adult grow in Maine? | Current statute clearly states six mature, twelve immature, unlimited seedlings per adult 21+. | `/blog/maine-home-grow-cannabis-guide-2026` | Improve H1 and direct-answer opening. | No new plant-limit URL. | 28-B M.R.S. §1502; OCP FAQ. |
| Can tourists buy cannabis, and where may they consume it? | Existing travel page owns both questions but contains stale limits, a false reciprocity denial, unsafe air-travel advice, and unsupported cross-border claims. | `/blog/cannabis-friendly-maine-travel` | Add an answer-first capsule and correct the directly related high-risk claims. | No separate tourist or consumption URL. | 28-B M.R.S. §1501; OCP consumer FAQ; OCP visiting-patient guidance. |
| What should a first-time buyer bring and expect? | Existing guide owns the visit-flow intent but buries the answer and stacks the 14% cannabis rate with 5.5% general sales tax. | `/guides/first-time-maine-dispensary-buyer` | Add a direct-answer capsule, correct tax language, and point its detailed limits answer to the new owner. | Buyer guide stays focused on preparation and visit flow. | 36 M.R.S. §1811; 28-B M.R.S. §1501; OCP consumer FAQ. |

Supporting cleanup on `/blog/is-weed-legal-in-maine` belongs to the first purchase-limit action rather than creating a sixth intent action. The broad legality page retains legal-status ownership but delegates detailed purchase and possession calculations to the focused owner.

## Claim matrix

| Claim | Safe wording | Source |
|---|---|---|
| Adult-use purchase | A store may not sell more than 2.5 oz total in one transaction, including no more than 10 g of concentrate. | https://legislature.maine.gov/statutes/28-B/title28-Bsec504.html |
| Adult-use possession | Adults 21+ may possess up to 2.5 oz total, including no more than 10 g of concentrate. | https://legislature.maine.gov/statutes/28-B/title28-Bsec1501.html |
| Home-grown harvest at grow site | Adults may possess all cannabis produced by their lawful plants at their residence or cultivation location. | 28-B M.R.S. §1501(1)(E) |
| Public consumption | Consumption is limited to a private residence or owner-permitted private property not generally accessible to the public. | 28-B M.R.S. §1501(2) |
| Personal cultivation | Six mature plants, twelve immature plants, and unlimited seedlings per adult 21+, subject to statutory location, visibility, access, and tagging requirements. | https://legislature.maine.gov/statutes/28-B/title28-Bsec1502.html |
| Cultivation location and municipal authority | An adult may grow on land the adult owns or is domiciled on; written owner permission is required only when the adult neither owns nor is domiciled on the land. Municipalities may not restrict the areas where personal adult-use cultivation may occur. | https://legislature.maine.gov/statutes/28-B/title28-Bsec1502.html |
| Maine patient credential | A Maine patient obtains a written certification from a licensed provider after a bona fide provider-patient assessment; OCP does not maintain a patient registry. | https://legislature.maine.gov/statutes/22/title22sec2423-B.html; https://www.maine.gov/dafs/ocp/resources/faq |
| IIC meaning | An Individual Identification Card is an adult-use worker credential, not the ordinary Maine patient credential. | https://www.maine.gov/dafs/ocp/resources/faq |
| Visiting patient | A visitor from an approved jurisdiction may use the state-issued patient credential authorized by the visitor's home jurisdiction; limit is 2.5 oz every 15 days. | https://www.maine.gov/dafs/ocp/medical-use/visiting-patients |
| Adult-use retail tax | Adult-use cannabis is taxed at a single 14% sales-tax rate beginning 2026-01-01; do not stack the general 5.5% rate on top. | https://legislature.maine.gov/statutes/36/title36sec1811.html |

## Deferred questions

- A separate tourist-purchase page: current travel owner is sufficient after repair.
- A separate public-consumption page: current travel owner is sufficient after repair.
- A separate home-grow plant-limit page: current home-grow owner is sufficient after repair.
- Medical certification prices, provider recommendations, medical product efficacy, and tax-savings calculations: omit until supported by current auditable evidence.

## Measurement and ship record

- Publication target: 2026-07-22, subject to required PR checks and production deployment.
- Final branch commit range: `origin/main..content/question-expansion-design-20260721`; the immutable PR head SHA is recorded by GitHub at push/merge.
- Exact five actions:
  1. Create `/blog/how-much-weed-can-you-buy-in-maine` as the focused purchase/possession-limit owner.
  2. Correct and strengthen `/blog/maine-medical-marijuana-patient-guide` as the patient-certification owner.
  3. Make `/blog/maine-home-grow-cannabis-guide-2026` answer the plant-limit question first.
  4. Correct `/blog/cannabis-friendly-maine-travel` and answer tourist purchase/private-consumption questions first.
  5. Make `/guides/first-time-maine-dispensary-buyer` answer visit-preparation questions first and delegate detailed limits.
- Supporting ownership cleanup, not additional intent actions: `/blog/is-weed-legal-in-maine` and `/learn` now delegate detailed purchase/possession rules to the focused owner.
- Verification on 2026-07-22:
  - `npm --workspace apps/maine-cannabis run test:question-content` — 13/13 pass.
  - `npm run verify:iterate` — clean; auto-related freshness, Astro parse/check, sitemap, docs drift, frontmatter, and hero naming all pass.
  - `node scripts/admin/data-integrity-check.cjs` — all docs match the filesystem.
  - `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` — 11/11 checks pass; only the expected uncommitted-worktree warning remains before commit.
  - `bash vercel-build.sh` — success; 304 pages built; release health 11/11.
  - `git diff --cached --check` — clean.
- Initial final GSC baseline: exact-match query+page requests for all six target queries returned no rows for 2026-04-19 through 2026-07-19. This records absence of reportable exact-query rows, not proof of zero underlying demand; OpenSEO keyword metrics and live SERPs remain the discovery evidence.
- Follow-up window: 2026-08-05 through 2026-08-19 (2–4 weeks after the target deployment). Compare impressions, clicks, CTR, average position, query-to-page ownership, and indexing for the five owners. Do not interpret the first incomplete days as impact.
