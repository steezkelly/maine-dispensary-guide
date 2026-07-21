# Operator Software Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a source-linked Maine cannabis operator-software hub, six category guides, and six individual vendor profiles with accurate referral-program classifications.

**Architecture:** A typed TypeScript registry is the single content source. Astro statically generates `/software/[slug]` routes from that registry and renders them through one shared editorial component; `/software` is a dedicated problem-first hub. Existing POS and vendor-directory guides receive bounded internal links.

**Tech Stack:** Astro 6, TypeScript, plain HTML/CSS, Node test runner, MDG Refined Editorial tokens, Vercel static output.

## Global Constraints

- Maine-only scope; no other-state hubs.
- No Tailwind, React, new dependency, authentication, billing, or database.
- No invented pricing, rankings, hands-on reviews, compliance guarantees, or active-affiliate claims.
- Official vendor sources must support material product and referral-program facts.
- Classify referral opportunities as `cash-referral`, `customer-credit`, `partner-application`, or `none`.
- Do not submit a partner application or insert an unapproved tracking identifier.
- Use internal links without trailing slashes.
- Preserve existing consumer price-data affiliate-routing rules.
- Run `npm run verify:iterate` during authoring and one final `npm run build`.

## File map

- Create `apps/maine-cannabis/src/data/operator-software.ts`: all typed category/vendor content, sources, referral states, route helpers.
- Create `apps/maine-cannabis/src/components/OperatorSoftwarePage.astro`: shared category/vendor renderer and scoped responsive styles.
- Create `apps/maine-cannabis/src/pages/software/index.astro`: problem-first software hub.
- Create `apps/maine-cannabis/src/pages/software/[slug].astro`: static route generator.
- Create `apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs`: registry/route/disclosure/source contract.
- Modify `apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro`: add software-hub continuation link and correct stale referral facts if current official sources contradict them.
- Modify `apps/maine-cannabis/src/pages/guides/maine-cannabis-vendor-directory.astro`: add software-center continuation link.

---

### Task 1: Registry contract and source-backed content

**Files:**
- Create: `apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs`
- Create: `apps/maine-cannabis/src/data/operator-software.ts`

**Interfaces:**
- Produces: `softwareEntries: SoftwareEntry[]`, `softwareCategories`, `softwareVendors`, `getSoftwareEntry(slug: string)`.
- Each entry exposes `slug`, `kind`, `title`, `description`, `eyebrow`, `answer`, `sections`, `faqs`, `sources`, `reviewedDate`, `relatedSlugs`, and optional `referral`.

- [ ] **Step 1: Write the failing registry test**

Create a Node test that reads the TypeScript source and a generated JSON-safe export check. Assert:

```js
assert.equal(entries.length, 13);
assert.equal(new Set(entries.map((entry) => entry.slug)).size, 13);
assert.deepEqual(
  entries.filter((entry) => entry.kind === 'category').map((entry) => entry.slug).sort(),
  ['cannabis-compliance','cannabis-crm-loyalty','cannabis-market-intelligence','cannabis-pos-systems','cannabis-wholesale-marketplaces','dispensary-ecommerce-menus','seed-to-sale-erp'].sort(),
);
assert.equal(entries.filter((entry) => entry.kind === 'vendor').length, 6);
for (const entry of entries) {
  assert.match(entry.reviewedDate, /^2026-07-\d{2}$/);
  assert.ok(entry.sources.length >= 2);
  assert.ok(entry.faqs.length >= 3);
}
```

Also assert that no entry has `mdgRelationship: 'active'`, and only `cash-referral` entries may show a cash amount.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs`

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement registry types and thirteen entries**

Use these exact core types:

```ts
export type ReferralKind = 'cash-referral' | 'customer-credit' | 'partner-application' | 'none';
export interface SoftwareSource { title: string; url: string; accessed: string; }
export interface SoftwareFaq { question: string; answer: string; }
export interface SoftwareSection { id: string; heading: string; paragraphs: string[]; bullets?: string[]; }
export interface ReferralStatus {
  kind: ReferralKind;
  summary: string;
  officialUrl?: string;
  mdgRelationship: 'inactive';
}
export interface SoftwareEntry {
  slug: string;
  kind: 'category' | 'vendor';
  title: string;
  description: string;
  eyebrow: string;
  answer: string;
  sections: SoftwareSection[];
  faqs: SoftwareFaq[];
  sources: SoftwareSource[];
  reviewedDate: string;
  relatedSlugs: string[];
  referral?: ReferralStatus;
}
```

Populate the seven category and six vendor slugs from the design. Use current official sources for Flowhub, Dutchie, Cova, AIQ, Canix, and Flourish. Describe public referral terms without implying MDG enrollment.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `node --test apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs`

Expected: all registry contract tests pass.

- [ ] **Step 5: Commit registry slice**

```bash
git add apps/maine-cannabis/src/data/operator-software.ts apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
git commit -m "content: add operator software registry"
```

### Task 2: Shared renderer and static routes

**Files:**
- Create: `apps/maine-cannabis/src/components/OperatorSoftwarePage.astro`
- Create: `apps/maine-cannabis/src/pages/software/[slug].astro`

**Interfaces:**
- Consumes: `SoftwareEntry` and `getSoftwareEntry` from Task 1.
- Produces: one indexable static route per registry entry.

- [ ] **Step 1: Extend the test with route-rendering assertions**

Assert that `[slug].astro` exports `getStaticPaths`, imports `softwareEntries`, and passes an entry into `OperatorSoftwarePage`. Assert the shared component contains visible source, review-date, editorial-independence, and referral-status labels.

- [ ] **Step 2: Run and confirm RED**

Run the focused Node test; expect missing route/component assertions to fail.

- [ ] **Step 3: Implement static routing**

Use:

```astro
---
import { softwareEntries } from '../../data/operator-software';
import OperatorSoftwarePage from '../../components/OperatorSoftwarePage.astro';
export function getStaticPaths() {
  return softwareEntries.map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));
}
const { entry } = Astro.props;
---
<OperatorSoftwarePage entry={entry} />
```

The shared component must render `Layout`, answer-first hero copy, Maine decision notes, all sections, related software cards, FAQ, sources, and an editorial/referral disclosure. It must not add `.btn-affiliate` until an active MDG relationship exists.

- [ ] **Step 4: Run focused test and fast verifier**

Run:

```bash
node --test apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
npm run verify:iterate -- --fast-only
```

Expected: both commands pass.

- [ ] **Step 5: Commit renderer slice**

```bash
git add apps/maine-cannabis/src/components/OperatorSoftwarePage.astro apps/maine-cannabis/src/pages/software/[slug].astro apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
git commit -m "feat: render operator software profiles"
```

### Task 3: Software hub and existing-content integration

**Files:**
- Create: `apps/maine-cannabis/src/pages/software/index.astro`
- Modify: `apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro`
- Modify: `apps/maine-cannabis/src/pages/guides/maine-cannabis-vendor-directory.astro`
- Test: `apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs`

**Interfaces:**
- Consumes: category/vendor arrays from Task 1.
- Produces: `/software` and discoverable internal links from two established operator pages.

- [ ] **Step 1: Add failing hub/link assertions**

Assert the hub imports both category and vendor arrays, links every category route, links all six initial vendor routes, and includes links to `/guides/maine-cannabis-pos-comparison` and `/guides/maine-cannabis-vendor-directory`. Assert both established pages link back to `/software`.

- [ ] **Step 2: Run and confirm RED**

Run the focused Node test and expect missing hub/backlinks.

- [ ] **Step 3: Implement the problem-first hub**

Render category cards under “Choose by operational problem,” vendor profiles under “Initial platform profiles,” a terminology block distinguishing POS/CRM/CMS/ERP/seed-to-sale, and an editorial-standards block. Add bounded continuation links to the two existing pages.

Correct the existing Cova referral figure from `$500` to the currently published `$400` customer-account credit, and make clear it is not an active MDG cash relationship.

- [ ] **Step 4: Run full focused and iteration checks**

```bash
node --test apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
npm run verify:iterate
```

Expected: PASS with no new parse, Astro, content-health, docs, or naming failures.

- [ ] **Step 5: Commit integration slice**

```bash
git add apps/maine-cannabis/src/pages/software/index.astro apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro apps/maine-cannabis/src/pages/guides/maine-cannabis-vendor-directory.astro apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
git commit -m "feat: publish cannabis software center"
```

### Task 4: Build, rendered inspection, and independent review

**Files:**
- Verify all declared paths; edit only a failing declared path.

**Interfaces:**
- Consumes: complete candidate from Tasks 1–3.
- Produces: verified exact diff and commit handoff.

- [ ] **Step 1: Run final source checks and build**

```bash
node --test apps/maine-cannabis/scripts/content/operator-software-pages.test.cjs
npm run verify:iterate
npm run build
```

Expected: all commands exit 0; fourteen `/software` routes exist in static output.

- [ ] **Step 2: Serve the static build and inspect representative pages**

Inspect `/software`, `/software/cannabis-crm-loyalty`, and `/software/flowhub` at 1440×900 and 390×844. Confirm no horizontal overflow, no clipped cards/tables, readable disclosures, working internal links, and zero console errors. Close the browser/server after inspection.

- [ ] **Step 3: Verify exact source claims**

Read back the rendered Flowhub, Dutchie, Cova, Canix, and Flourish referral passages. Confirm each matches the official source captured in the registry and none claims an active MDG relationship.

- [ ] **Step 4: Request independent exact-diff review**

The verifier checks spec compliance, source integrity, SEO cannibalization risk, accessibility, and mobile layout. Any FAIL returns to the smallest affected task.

- [ ] **Step 5: Final diff and candidate commit**

```bash
git diff --check
git status --short
git log --oneline origin/main..HEAD
```

Record commands and review result on Kanban task `t_087ea168`. Commit only explicitly declared files; do not merge to `main` or claim production release.
