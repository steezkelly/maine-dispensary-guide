# Design Specification: Maine Cannabis Product Recall and Failed-Test Response Guide

- Date: 2026-07-30
- Approved route: `/guides/maine-cannabis-product-recall-response`
- Page family: regulatory / operator operations
- Audience: Maine adult-use cultivators, products manufacturers, cannabis stores, compliance leads, and owners who need a safe first-response checklist.
- Status: approved for implementation in the isolated branch `feat/maine-cannabis-product-recall-response-20260730`.

## User promise

Help a Maine adult-use operator distinguish a failed test, voluntary stop-sale, OCP administrative hold, consumer complaint, and OCP-issued recall, then organize the first response without overstating what the law or a notice requires.

## Editorial contract

- Adult-use only. Medical cannabis patient advisories are mentioned only to prevent category confusion.
- This is an incident-response orientation, not legal, medical, accounting, or regulatory advice.
- The page must use current OCP and Maine Legislature sources and show a dated “Last reviewed” label.
- The page must not promise that any response prevents enforcement, liability, customer harm, or business interruption.
- The page must not convert proposed 2026 testing-rule language into current law.
- If an OCP notice, order, current rule, or local fact conflicts with this general checklist, the notice/order/current authority controls.

## Information architecture

1. Answer capsule: stop sale/hold affected product, identify the trigger, preserve the batch trail, and contact the right authority/advisers.
2. Incident triage table:
   - initial failed test;
   - consumer complaint or suspected contamination;
   - voluntary stop-sale/quarantine;
   - OCP administrative hold;
   - OCP-issued recall.
3. First-hour checklist:
   - pause sales and transfers of the suspect scope;
   - identify licensee, batch, product, package, and location;
   - protect customer/staff safety and escalate emergencies to appropriate professionals;
   - preserve records and avoid altering evidence;
   - notify internal decision owners and follow current OCP/testing-facility instructions.
4. Failed-test pathway:
   - hold the batch from sale;
   - review the COA and failed analyte;
   - determine whether current rules permit retest, remediation, or destruction;
   - record the disposition and do not use proposed-rule language as current instructions.
5. Administrative-hold pathway:
   - explain notice contents under §803-A;
   - physically segregate held items;
   - do not sell, give away, transfer, transport, dispose of, or destroy held items unless the applicable authority authorizes it;
   - follow the notice and current OCP instructions.
6. Recall pathway:
   - open the OCP recall index and incident notice;
   - reconcile batch numbers, sale dates, product sizes, stores, manifests, and inventory;
   - follow notice-specific retailer, licensee, consumer, return, and destruction actions;
   - keep a dated incident log.
7. Records and post-incident review:
   - COAs and EDD/reporting records;
   - Metrc/tracking and point-of-sale reconciliation;
   - distribution and customer-return records;
   - communications and OCP/testing-facility notices;
   - remediation/retest/destruction documentation;
   - corrective-action and compliance review.
8. FAQ and source notes.

## Reusable MDG conventions

- `Layout` with existing author metadata; add an optional reviewer only when the registry role matches the page's claim class and the review is real.
- `Faq` using one source array for visible FAQ and FAQ schema.
- `AutoRelated` for the compliance/operations section.
- Existing MDG plain HTML/CSS; no new shared component.
- Existing publisher-managed editorial attribution and “Last reviewed” language; no fabricated expertise or mismatched reviewer attribution.

## Acceptance criteria

- Route source exists and renders at the exact approved path.
- All material statutory/regulatory claims map to the source pack.
- Body, FAQ, metadata, review label, and source notes use consistent current/proposed wording.
- Page explicitly distinguishes a failed test from an OCP recall and from a statutory administrative hold.
- Page contains at least two internal links to existing relevant guides and does not modify those guides.
- Focused regression test checks route/title/description, primary-source URLs, required distinctions, FAQ presence, and prohibited guarantees/medical advice.
- No generic market, financial, or medical claims.
- Generated related-content output is not hand-edited while its active lease remains owned by another worktree; either acquire it after legitimate release or record the exact follow-up.
- Fast verification, exact candidate verification, isolated build, rendered-route inspection, and independent review occur before commit/push.

## Non-goals

- No new component, shared layout change, site-wide navigation change, or inbound-link sweep.
- No legal opinion on an operator’s incident.
- No replacement for OCP notice/order or current rule text.
- No medical advice or customer-specific treatment guidance.
- No claim that a recall response eliminates penalties, litigation, or reputational damage.
