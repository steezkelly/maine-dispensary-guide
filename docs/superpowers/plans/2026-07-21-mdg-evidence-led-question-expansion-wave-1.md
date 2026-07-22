# MDG Evidence-Led Question Expansion — Wave 1 Implementation Plan

> **For implementers:** Use `executing-plans`, `test-driven-development`, `mdg-kanban-card-execution`, `mdg-content-page-assembly`, and `mdg-verify-pipeline`. Execute in an isolated worktree with an acquired lease. Do not implement directly on `main`.

**Goal:** Ship one focused question page and strengthen four existing intent owners so MDG can compete for six high-value Maine cannabis questions without creating overlapping URLs.

**Architecture:** Preserve one URL owner per search intent. Add a new URL only for the purchase/possession-limit intent, which currently lacks a focused owner. Improve the existing medical-card, home-grow, travel, and first-visit owners in place. Protect current-law claims with a focused Node source-contract test and verify every changed page in the production build.

**Stack:** Astro 6, plain HTML/CSS/JS, Node `node:test`, existing `Layout`, `Faq`, `Callout`, and `AutoRelated` components.

**Approved design:** `docs/superpowers/specs/2026-07-21-mdg-evidence-led-question-expansion-design.md`

---

## Evidence Snapshot

Research captured on 2026-07-21:

- 90-day final GSC question demand was mostly already served by existing URLs; discovery must extend beyond GSC.
- Exact keyword metrics surfaced:
  - `how to get a medical card in maine`: 110 monthly searches, KD 52.
  - `how much weed can you buy in maine`: 30 monthly searches.
  - `do you need a medical card in maine`: 20 monthly searches.
  - `how many plants can you grow in maine`: 10 monthly searches.
- MDG did not appear in the top 20 live organic results for the six inspected questions:
  - how much weed can you buy in Maine
  - do you need a medical card in Maine
  - how many plants can you grow in Maine
  - how to get a medical card in Maine
  - where can you smoke weed in Maine
  - can tourists buy weed in Maine
- Google showed an AI Overview and/or People Also Ask block for all six queries, increasing the value of concise answer-first copy.
- Primary-source checks established:
  - 28-B M.R.S. §1501: adults 21+ may purchase/possess up to 2.5 ounces total, including no more than 10 grams of concentrate.
  - 28-B M.R.S. §1501(2): consumption is limited to a private residence or private property not generally accessible to the public with explicit owner permission.
  - 28-B M.R.S. §1502: adults 21+ may grow 6 mature plants, 12 immature plants, and unlimited seedlings.
  - OCP uses “Individual Identification Card (IIC)” for adult-use cannabis workers and principals, not as the ordinary name for a patient certification/card.
  - OCP’s medical program requires patients to consult a licensed provider for certification; the provider—not the patient—uses the medical certification portal.

## Wave 1 URL Ownership

| Question intent | Owner after Wave 1 | Action |
|---|---|---|
| How much cannabis can an adult buy/possess in Maine? | `/blog/how-much-weed-can-you-buy-in-maine` | New focused page |
| How do I get a Maine medical cannabis card/certification? | `/blog/maine-medical-marijuana-patient-guide` | Correct and optimize |
| How many cannabis plants can I grow in Maine? | `/blog/maine-home-grow-cannabis-guide-2026` | Answer-first surgery |
| Where may tourists legally consume cannabis in Maine? | `/blog/cannabis-friendly-maine-travel` | Answer-first surgery and fact correction |
| Can tourists buy cannabis in Maine, and what should they bring? | `/guides/first-time-maine-dispensary-buyer` | Answer-first surgery |

No second URL may target any of these exact intents during this wave.

---

### Task 1: Record the wave and add RED source-contract tests

**Files:**
- Create: `apps/maine-cannabis/docs/seo/question-expansion-wave-1.md`
- Create: `apps/maine-cannabis/scripts/question-content-contract.test.cjs`
- Modify: `apps/maine-cannabis/package.json`

**Step 1: Create the evidence ledger**

Write `question-expansion-wave-1.md` with:

- research date and OpenSEO project ID;
- the six inspected queries;
- the metric and SERP findings above;
- the URL-ownership table above;
- primary sources for §1501, §1502, OCP patient certification, and OCP IIC instructions;
- explicit defer list: no standalone pages for “do I need a card,” “where can I smoke,” or “can tourists buy” because existing pages own those intents;
- a measurement section recording the publication date, URLs changed, and the 2–4 week GSC follow-up window.

**Step 2: Add a focused Node test**

Create a CommonJS `node:test` file that anchors paths with:

```js
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const APP_ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(APP_ROOT, relative), 'utf8');
```

Tests must assert source behavior, not comments:

1. The new purchase-limit page exists and contains an H1 question, an `.answer-capsule`, `2.5 ounces`, `10 grams`, and a direct §1501 link.
2. The medical patient guide title/H1 contains “Medical Cannabis Card” or “Medical Marijuana Card” and “How to”; it must not describe the patient card as an IIC.
3. The home-grow guide H1 or immediate answer capsule contains `6 mature`, `12 immature`, and `unlimited`.
4. The travel page answer capsule contains private-property limits and does not claim that visiting patients are categorically ineligible for Maine medical purchases.
5. The first-time buyer page contains a visible answer capsule answering tourists/out-of-state visitors.
6. Changed pages do not contain these stale claims:
   - `5 grams of concentrate`
   - `100mg of edible THC per transaction`
   - `medical cardholders from other states are not eligible`
   - `5.5% state sales tax and 14% adult-use excise tax apply`

Strip HTML comments before matching so comments cannot satisfy positive assertions.

**Step 3: Add the package command**

Add:

```json
"test:question-content": "node ./scripts/question-content-contract.test.cjs"
```

**Step 4: Run RED**

Run:

```bash
npm --workspace apps/maine-cannabis run test:question-content
```

Expected: nonzero exit with clean assertion failures for the missing page and unmodified owners. Path errors or syntax errors are invalid RED states and must be fixed before proceeding.

**Step 5: Commit**

```bash
git add apps/maine-cannabis/docs/seo/question-expansion-wave-1.md \
  apps/maine-cannabis/scripts/question-content-contract.test.cjs \
  apps/maine-cannabis/package.json
git commit -m "test(seo): define question expansion wave one contracts"
```

---

### Task 2: Create the focused purchase-limit question page

**Files:**
- Create: `apps/maine-cannabis/src/pages/blog/how-much-weed-can-you-buy-in-maine.astro`
- Modify: `apps/maine-cannabis/src/pages/blog/index.astro`
- Modify: `apps/maine-cannabis/src/pages/search.astro`

**Step 1: Build the page from existing primitives**

Use `Layout`, `Callout`, `Faq`, and `AutoRelated`; do not introduce a page-specific design system. Required metadata:

```astro
<Layout
  title="How Much Weed Can You Buy in Maine? 2026 Limits"
  description="Adults 21+ may buy or possess up to 2.5 ounces of cannabis in Maine, including no more than 10 grams of concentrate. See medical and home-storage differences."
  heroImage="/images/heroes/first-time-maine-dispensary-buyer-2026.jpg"
  article={article}
  topics={['consumer-guide', 'legal', 'first-time']}
>
```

Required H1 and opening:

```astro
<h1>How Much Weed Can You Buy in Maine?</h1>
<div class="answer-capsule">
  <strong>Adults 21 or older may buy up to 2.5 ounces of adult-use cannabis in Maine.</strong>
  That total may combine cannabis and concentrate, but it may include no more than 10 grams of cannabis concentrate. The same 2.5-ounce/10-gram ceiling applies to adult-use possession at any one time under 28-B M.R.S. §1501.
</div>
```

**Step 2: Cover distinct supporting questions**

Include concise sections for:

- purchase limit versus possession limit;
- flower/concentrate combinations with examples;
- adult-use versus medical limits, only after verifying Title 22 current text;
- home storage versus public possession—do not repeat the existing unsupported “no legal limit at home” claim;
- tourists and out-of-state IDs;
- gifting versus selling;
- transport inside Maine versus prohibited interstate transport;
- a “verify before buying” callout linking OCP and the current statute.

Use primary sources for every material legal number. Do not cite competing cannabis blogs for law.

**Step 3: Add visible FAQs**

Use `Faq` for 4–6 variants, including:

- How much cannabis can I buy at one Maine dispensary?
- Is the Maine purchase limit per day or per transaction?
- Does the 2.5-ounce limit include concentrates?
- Can tourists buy the same amount as Maine residents?
- Can I take cannabis bought in Maine across state lines?

If the primary source does not establish a per-day rule, say only what §1501 establishes; do not infer store or daily limits.

**Step 4: Wire discovery surfaces**

Add the new page to `blog/index.astro` and `search.astro` using the same title, route, section, and description. Link to:

- `/guides/first-time-maine-dispensary-buyer`
- `/learn`
- `/guides/maine-cannabis-regulations`

Then add contextual links back from the first-time buyer guide and `/learn` where purchase limits are already discussed.

**Step 5: Run focused GREEN**

```bash
npm --workspace apps/maine-cannabis run test:question-content
```

Expected: only the remaining owner-surgery assertions fail.

**Step 6: Commit**

```bash
git add apps/maine-cannabis/src/pages/blog/how-much-weed-can-you-buy-in-maine.astro \
  apps/maine-cannabis/src/pages/blog/index.astro \
  apps/maine-cannabis/src/pages/search.astro \
  apps/maine-cannabis/src/pages/guides/first-time-maine-dispensary-buyer.astro \
  apps/maine-cannabis/src/pages/learn/index.astro
git commit -m "feat(seo): add Maine cannabis purchase limit answer"
```

---

### Task 3: Correct and optimize the medical-card owner

**Files:**
- Modify: `apps/maine-cannabis/src/pages/blog/maine-medical-marijuana-patient-guide.astro`
- Modify: `apps/maine-cannabis/src/pages/blog/index.astro`
- Modify: `apps/maine-cannabis/src/pages/search.astro`

**Step 1: Separate patient certification from worker IIC terminology**

Change title and H1 to:

```astro
title="How to Get a Maine Medical Cannabis Card (2026)"
<h1>How to Get a Maine Medical Cannabis Card in 2026</h1>
```

Opening answer capsule:

```astro
<div class="answer-capsule">
  <strong>Start by consulting a Maine-licensed medical provider.</strong>
  The provider decides whether to certify you and uses Maine's medical certification system; patients cannot use that provider portal to certify themselves. A patient certification or registry card is different from the adult-use worker Individual Identification Card (IIC).
</div>
```

**Step 2: Re-source the application steps**

Rewrite the current four-step FAQ and body from current OCP pages. Remove unverified fixed claims about:

- a required $100 annual patient fee;
- a universal 2–3 week mailing period;
- a mandatory patient self-registration step in the provider portal;
- a fixed qualifying-condition list when Maine uses provider discretion;
- patient counts not tied to a named current annual report.

If OCP offers optional patient registry identification cards in addition to provider certification, explain that distinction explicitly and cite the current application page.

**Step 3: Add the “Do I need a card?” variant without a second URL**

Add a visible FAQ that answers:

- Adults 21+ do not need a medical card for licensed adult-use stores.
- Medical access, tax treatment, product access, and visiting-patient rules differ.
- A medical card does not authorize interstate transport.

**Step 4: Keep discovery listings aligned**

Update the blog and search index titles/descriptions to match the corrected title and intent.

**Step 5: Run tests and commit**

```bash
npm --workspace apps/maine-cannabis run test:question-content
git add apps/maine-cannabis/src/pages/blog/maine-medical-marijuana-patient-guide.astro \
  apps/maine-cannabis/src/pages/blog/index.astro \
  apps/maine-cannabis/src/pages/search.astro
git commit -m "fix(content): separate Maine patient cards from worker IICs"
```

---

### Task 4: Make the home-grow owner answer the plant-limit question immediately

**Files:**
- Modify: `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro`
- Modify: `apps/maine-cannabis/src/pages/blog/index.astro`
- Modify: `apps/maine-cannabis/src/pages/search.astro`

**Step 1: Align title and H1**

Use:

```astro
title="How Many Cannabis Plants Can You Grow in Maine? 2026 Guide"
<h1>How Many Cannabis Plants Can You Grow in Maine?</h1>
```

Preserve “Maine Home Grow Cannabis Guide 2026” in the subtitle or description for the existing broader intent.

**Step 2: Put a sourced answer capsule directly after the header**

```astro
<div class="answer-capsule">
  <strong>An adult 21 or older may grow up to 6 mature cannabis plants, 12 immature plants, and unlimited seedlings for personal adult use in Maine.</strong>
  Location, owner-consent, visibility, and plant-tag requirements also apply under 28-B M.R.S. §1502.
</div>
```

Do not conflate personal adult-use, patient, and caregiver allocations. Keep each framework in a separate subsection with its own statute.

**Step 3: Update discovery listings**

Align blog and search titles/descriptions with the question H1 while retaining the route.

**Step 4: Run tests and commit**

```bash
npm --workspace apps/maine-cannabis run test:question-content
git add apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro \
  apps/maine-cannabis/src/pages/blog/index.astro \
  apps/maine-cannabis/src/pages/search.astro
git commit -m "feat(seo): answer Maine home-grow limits first"
```

---

### Task 5: Strengthen the tourist/consumption and first-visit owners

**Files:**
- Modify: `apps/maine-cannabis/src/pages/blog/cannabis-friendly-maine-travel.astro`
- Modify: `apps/maine-cannabis/src/pages/guides/first-time-maine-dispensary-buyer.astro`
- Modify: `apps/maine-cannabis/src/pages/blog/index.astro`
- Modify: `apps/maine-cannabis/src/pages/search.astro`

**Step 1: Add a visible travel answer capsule**

Directly after the travel page header:

```astro
<div class="answer-capsule">
  <strong>Tourists age 21 or older may buy adult-use cannabis in Maine with valid government photo ID.</strong>
  Consumption is limited to a private residence or private property that is not generally open to the public, with explicit permission from the owner. Public places, vehicles on public ways, and federal land are not legal consumption sites.
</div>
```

**Step 2: Correct stale travel claims**

Verify against primary sources and correct or remove:

- the 5-gram concentrate limit; current §1501 says 10 grams;
- the 100mg edible transaction cap;
- the claim that out-of-state medical cardholders are categorically ineligible;
- any stale tax rate;
- any implication that state parks are federal land;
- any unsupported airport/TSA assurance;
- any statement that another state recognizes Maine adult-use purchases or permits interstate transport.

Prefer concise legal boundaries over enforcement-risk speculation.

**Step 3: Add a first-visit answer capsule**

Directly after the first-time guide header:

```astro
<div class="answer-capsule">
  <strong>Bring a valid government-issued photo ID showing you are 21 or older.</strong>
  Maine residents and tourists may shop at licensed adult-use stores without a medical card. Bring cash or confirm the store's payment methods before visiting, and do not plan to consume at the dispensary or in public.
</div>
```

Correct the FAQ/body so adult-use tax is not stacked with the medical sales-tax rate. Do not publish a payment, tax, dose, or possession claim unless its source is current and named.

**Step 4: Keep indexes aligned**

Update descriptions only where necessary; preserve one URL owner per intent.

**Step 5: Reach full focused GREEN and commit**

```bash
npm --workspace apps/maine-cannabis run test:question-content
git add apps/maine-cannabis/src/pages/blog/cannabis-friendly-maine-travel.astro \
  apps/maine-cannabis/src/pages/guides/first-time-maine-dispensary-buyer.astro \
  apps/maine-cannabis/src/pages/blog/index.astro \
  apps/maine-cannabis/src/pages/search.astro
git commit -m "fix(content): clarify Maine tourist purchase and consumption rules"
```

Expected: all focused question-content tests pass.

---

### Task 6: Regenerate derived data and run the verification cascade

**Files:**
- Modify: `apps/maine-cannabis/src/data/blog-index.json`
- Modify: `apps/maine-cannabis/src/data/autoRelatedData.json`

**Step 1: Regenerate and verify derived data**

```bash
npm --workspace apps/maine-cannabis run data:blog-index
npm --workspace apps/maine-cannabis run data:auto-related
npm --workspace apps/maine-cannabis run data:blog-index:check
npm --workspace apps/maine-cannabis run data:auto-related:check
```

**Step 2: Run content and type checks**

```bash
npm --workspace apps/maine-cannabis run test:question-content
npm --workspace apps/maine-cannabis run check:content-health
npm --workspace apps/maine-cannabis run typecheck
```

**Step 3: Run the production build**

```bash
npm --workspace apps/maine-cannabis run build
```

Expected: exit 0 with the new route in the generated output.

**Step 4: Inspect built pages**

Verify in `dist/` that all five owner URLs contain:

- one visible H1;
- the intended answer capsule in rendered HTML;
- canonical URL and non-empty description;
- visible FAQ content where used;
- no stale claims from the focused contract;
- internal links to at least two relevant MDG pages.

**Step 5: Run repository gates**

```bash
npm run verify:pre-push:fast
```

If the repository’s current governance requires the full pre-push verifier instead, run the documented full command and do not use a bypass flag.

**Step 6: Commit generated artifacts**

```bash
git add apps/maine-cannabis/src/data/blog-index.json \
  apps/maine-cannabis/src/data/autoRelatedData.json
git commit -m "chore(data): refresh question content discovery surfaces"
```

Skip this commit if regeneration produces no diff.

---

### Task 7: Review, ship, and establish the measurement baseline

**Files:**
- Modify: `apps/maine-cannabis/docs/seo/question-expansion-wave-1.md`

**Step 1: Run independent review**

Use `requesting-code-review` against the complete branch diff. Require special attention to:

- legal and medical sourcing;
- IIC versus patient-card terminology;
- tax, concentrate, possession, and cultivation numbers;
- route ownership and cannibalization;
- visible FAQ output and answer-first placement;
- mobile readability and internal links.

**Step 2: Record shipped URLs and verification**

Update the wave ledger with:

- final commit range;
- exact five URLs/actions;
- verification commands and outcomes;
- initial GSC baseline for the six target queries when available;
- follow-up date 2–4 weeks after production deployment.

**Step 3: Final verification**

```bash
git diff origin/main...HEAD --check
git status --short --branch
git log --oneline origin/main..HEAD
```

Working tree must be clean. Every changed file must be intentional.

**Step 4: Commit the ledger**

```bash
git add apps/maine-cannabis/docs/seo/question-expansion-wave-1.md
git commit -m "docs(seo): record question expansion wave one"
```

**Step 5: Follow the MDG PR/deploy workflow**

Push the branch, open a PR, wait for CI and Codex review, resolve all feedback, merge through the approved repository path, and run the production smoke checks required by `mdg-verify-pipeline`. Do not claim traffic impact at merge time; record only deployment and indexing state.

---

## Completion Criteria

Wave 1 is complete only when:

- one focused purchase-limit page is live;
- four existing URL owners answer their target question immediately;
- IIC is not presented as the ordinary patient-card term;
- all legal numbers are traceable to current primary sources;
- no duplicate URL targets the six selected intents;
- the focused contract, content checks, typecheck, build, and repository verification pass;
- all five actions are discoverable through site indexes/internal links;
- the 2–4 week GSC follow-up is recorded in the evidence ledger.
