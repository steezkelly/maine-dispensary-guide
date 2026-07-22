# YMYL E-E-A-T audit and decision record — 2026-07-21

**Audit base:** `a0f0d5a4433eae5202fe62866eb955cd04e32bbd`
**Remediation card:** `t_a2868161`
**Status:** Updated 2026-07-21 by operator decision. The five-page cohort uses a truthful organizational primary-source editorial-review standard; it must not imply credentialed or independent professional review.

This is a source-state audit of five Maine Dispensary Guide pages containing
legal, tax, licensing, health, or safety claims. It records the operator's
C/D/C decisions while correcting the original candidate's reviewer,
`CiteThis`, date, canonical, and control-plane assumptions. It does not claim
that publisher-managed pseudonyms are independent experts and does not treat a
bibliographic reuse component as claim-level sourcing.

## Scope and aggregate demand

Private, finalized 28-day GSC page data prioritized this five-page cohort. The
cohort had 2,619 aggregate impressions, 70 aggregate clicks, 2.67% aggregate
CTR, and 7.38 impression-weighted average position. Page-level first-party
metrics remain private.

In-scope sources:

1. `apps/maine-cannabis/src/pages/guides/maine-cannabis-edibles-compliance.astro`
2. `apps/maine-cannabis/src/pages/guides/maine-cannabis-taxes-2026.astro`
3. `apps/maine-cannabis/src/pages/blog/best-maine-edibles-2026.astro`
4. `apps/maine-cannabis/src/pages/blog/maine-psilocybin-2026-guide.astro`
5. `apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro`

## Current-source findings

| Page | Current reviewer state | Date/canonical state | Required action |
|---|---|---|---|
| Edibles compliance | `article.reviewer` names Margaret Finch, a publisher-managed pseudonym, which Layout can serialize as a `Person` | `modifiedDate` is 2026-07-21; visible review badge says 2026-07-16 | Remove pseudonym `Person` reviewer; reconcile dates only after substantive claim review; obtain qualified legal/food-safety review before adding a real person |
| Taxes 2026 | `article.reviewer` names Calvin Waters, a publisher-managed pseudonym | `modifiedDate` is 2026-06-05; visible “Last updated” says June 7; review badge says July 6 | Remove pseudonym `Person`; verify tax claims against statutes, IRS, and Maine Revenue Services; align all dates to the completed review |
| Best Maine edibles 2026 | No structured reviewer is passed in `article`; the byline says “Reviewed by Thalia Greene,” while a separate review badge names Calvin Waters + Margaret Finch—three conflicting publisher-managed pseudonyms across two visible surfaces | `modifiedDate` and visible update both say 2026-07-16 | Replace both visible reviewer surfaces with one coherent organizational editorial attribution; do not imply independent or credentialed review; verify health and product claims at claim level |
| Psilocybin 2026 | `article.reviewer` names Calvin Waters, a publisher-managed pseudonym | Emitted article `modifiedDate` is 2026-06-07; a dormant, unrendered `ldJson` object says 2026-04-20; the visible review badge says 2026-07-06 | Remove pseudonym `Person`; delete the dormant object or keep it explicitly non-authoritative; re-verify every current-law, bill, commission, federal-action, medical, and penalty claim before changing emitted or visible dates |
| Staffing licensing | `article.reviewer` names Margaret Finch, a publisher-managed pseudonym | `modifiedDate` is 2026-06-07; badge says 2026-07-06; canonical points to `/guides/maine-cannabis-regulations` | Remove pseudonym `Person`; decide whether this route remains canonicalized before investing in standalone CTR/E-E-A-T work; verify permit, background-check, training, timing, and record-retention claims |

`authors.json` explicitly describes Calvin Waters, Margaret Finch, Eliot Nash,
and related editorial identities as publisher-managed pseudonyms. They may be
transparent editorial bylines, but they are not evidence of independent
professional review and must not be represented as credentialed human
reviewers in `Person` JSON-LD.

## Cross-cutting findings

### 1. Reviewer schema is unsafe as currently used

Four pages pass a pseudonymous editorial identity through `article.reviewer`.
The shared Layout can serialize that object as `reviewedBy` / `Person`, which
creates a stronger real-person claim than the public author disclosure
supports.

Immediate safe remediation is to remove those pseudonym reviewer objects.
A publisher-managed editorial check can remain visible as organizational
editorial process language, provided it links to the pseudonym disclosure and
does not imply a license or independent professional review.

### 2. `CiteThis` is not claim-level evidence

`CiteThis.astro` is a “Cite This Page” bibliographic/reuse block for readers,
journalists, and researchers. Adding it does not substantiate legal, tax,
medical, product, timing, or penalty claims.

For this YMYL cohort, the required source work is contextual: material claims
need nearby links to the controlling statute, final rule, agency guidance,
peer-reviewed paper, or clearly labeled operator/product source. `CiteThis`
may be added where a page is intended as a reusable research source, but it is
optional and cannot satisfy the primary-source requirement by itself.

### 3. Dates currently overstate or contradict review state

Several pages have different emitted article, visible update, and visible
review dates. The best-edibles page also contradicts itself by naming Thalia
Greene in its byline and Calvin Waters + Margaret Finch in a separate badge;
both surfaces must become one organizational editorial attribution. The
psilocybin page also contains a stale `ldJson` object that is never rendered;
it is dead code, not duplicate schema output. `dateModified`
must reflect a substantive source/body review, not an SEO-only timestamp
change. Each implementation patch should align emitted article metadata,
visible copy, and review attribution, and should delete rather than synchronize
the dormant object.

### 4. One page is canonicalized elsewhere

The staffing route declares `/guides/maine-cannabis-regulations` as canonical.
Standalone optimization work should pause until that canonical decision is
confirmed; otherwise signals and measurement belong to the canonical target.

## Operator decisions recorded on 2026-07-21

### C — Organizational primary-source editorial review

- These five pages may be published only with organization-level language such
  as “Editorially reviewed against the cited primary sources on [date].”
- The review date must reflect a substantive source and body review, and every
  material claim must retain nearby, relevant primary or authoritative sources.
- Pages may not claim or imply medical review, legal review, tax review, expert
  review, independent verification, or review by a named professional.
- Publisher-managed pseudonyms remain ineligible for `Person` reviewer schema
  or professional-review attribution.

**Separate real-person rule:** a named professional may be published only after
current credential verification, page-specific scope approval, permission to
publish the attribution, and conflict disclosure. No such record is available
for this cohort; this editorial standard does not substitute for one.

### D — Tiered primary-source mix

- Legal/regulatory: controlling statutes, effective final OCP rules, and
  current agency guidance; proposed rules are labeled proposed and paired with
  the effective rule.
- Tax: statutes plus current IRS and Maine Revenue Services material.
- Health/safety: peer-reviewed evidence plus applicable OCP rules and explicit
  uncertainty where evidence is limited.
- Consumer/product: statutes and rules for legal/safety claims; operator or
  product pages only for clearly attributed product-specific facts.

This decision governs claim-level citations. It does not require `CiteThis` on
every page.

### C — Tiered retroactive rollout

Apply the standard to pages already receiving substantive work, then expand
through an explicit, bounded YMYL manifest/card. The original audit claimed a
12-page retrofit card already existed, but no matching live Kanban item was
verified on the audit base. Do not infer or execute a 12-page scope until the
manifest, owner, allowed paths, and acceptance checks exist in the control
plane.

## Safe implementation sequence

1. Remove publisher-managed pseudonyms from structured `Person` reviewer
   fields on the four affected pages; preserve transparent organizational
   editorial language.
2. Resolve the staffing canonical decision before standalone page work.
3. Re-verify each material claim against the source classes required by
   Decision D and add contextual citations.
4. Reconcile emitted article metadata, visible update dates, and review badges
   only after substantive review; delete the psilocybin page's dormant
   `ldJson` object instead of treating it as emitted schema.
5. Use only the organization-level editorial-review attribution for this cohort.
   Add a real reviewer only after the separate identity/credential/consent gate
   is satisfied.
6. Create a separate bounded manifest/card before expanding beyond these five
   pages.
7. Re-measure finalized GSC data after enough post-release data accrues; do not
   treat schema or citation changes as proven ranking causes without evidence.

## Acceptance and current verdict

- **Audit record:** PASS after independent review.
- **Pseudonym reviewer removal:** unblocked and should be a focused safety
  patch.
- **Decision D claim-level source work:** unblocked but requires primary-source
  research and page-by-page factual verification.
- **Decision C organizational editorial review:** unblocked for this five-page
  cohort when every visible, metadata, and JSON-LD attribution is coherent and
  the claim-level primary-source work is complete.
- **Any real-person reviewer implementation:** BLOCKED on verified identity,
  credentials, consent, scope, date, and conflict disclosure.
- **12-page retro rollout:** BLOCKED on an explicit live Kanban manifest.
- **Blind `CiteThis` rollout:** REJECTED as a substitute for contextual
  evidence.
