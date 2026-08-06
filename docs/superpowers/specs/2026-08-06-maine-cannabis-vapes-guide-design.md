# Approved design — Maine cannabis vapes guide

Date: 2026-08-06
Status: approved by the user’s direction: lead with label-reading and traceability; include safety, recalls, and disposal; produce approximately 2,500 actual reader-facing words.

## Page identity

- Route: `/guides/cannabis-vapes-maine`
- H1: `Cannabis Vapes in Maine: How to Read a Label and Choose a Traceable Product`
- Audience: adult-use Maine consumers first; operators secondarily through a short transparency-oriented section.
- Page family: regulatory guide using MDG’s current `Layout`, `Faq`, and one `AutoRelated` rail.
- Search promise: help a reader understand the regulated information on a Maine adult-use vape package, match a batch to recall information, and dispose of a battery/device responsibly.

## Chosen content approach

The page starts with the practical question—not a generic product primer and not an operator compliance memo:

1. **Read the package:** make batch number, license information, potency, ingredients, extraction information, route information, and date fields understandable.
2. **Use traceability appropriately:** explain that a batch number lets a buyer match a specific package to product information and a recall notice. It does not certify effects or universal safety.
3. **Handle problems safely:** give a dated recall-check workflow plus source-backed battery/device disposal guidance.

A brief technical vocabulary section (cartridge, disposable, battery, concentrate) supplies enough context to read a label without turning into a hardware buying guide. The operator section is deliberately limited to a reader-facing transparency checklist; it does not advise how to achieve regulatory compliance.

## Information architecture

1. Answer-first introduction and fast label checklist.
2. What a vape package can identify: cartridge, disposable, battery, and concentrate vocabulary.
3. The adult-use label, field by field.
4. What “traceable” should mean for a buyer.
5. Mandatory testing: useful evidence, bounded claim.
6. Vape safety, recalls, and disposal in Maine.
7. A small operator transparency section.
8. Five-question FAQ, source/method note, editorial accountability links, and related reading.

## Editorial/visual treatment

- Use one calm, skimmable reference table and a short numbered recall-response checklist.
- Use callouts only for the label checklist, the testing limitation, and recall/battery disposal—not for every paragraph.
- Keep headings at H2 after the H1; use styled labels/paragraphs rather than skipped heading levels.
- No product photography or generated hero is required for this release. The standard `Layout` support remains, but the page must not invent product-specific imagery or visual claims.

## Exact body-word contract

The guide will include 2,400–2,700 words of substantive reader-facing body prose. The count excludes metadata, CSS, frontmatter, JSON-LD, tables, FAQ answers, source notes, and attributes. A focused source test will calculate the count from explicit body markers, so the target cannot be met with Astro code, citations, or boilerplate.

## Claims and guardrails

The companion source ledger is `docs/research/2026-08-06-maine-cannabis-vapes-source-ledger.md`.

- Adult-use law/rules and public-health context must not blur together.
- Testing, packaging, and traceability are practical evidence—not a guarantee of safety, health outcome, quality, or suitability.
- No dosing, disease/symptom, efficacy, route-comparison, or individualized recommendations.
- The EVALI material is historical context about unknown ingredients, not a claim about all current Maine adult-use vapes.
- The source note and visible review line must use “Last reviewed,” publisher-managed attribution, and direct primary-source links.

## Link plan

Outbound links: COA guide, Maine cannabis regulations guide, corrections log, and authors page.

Inbound candidates (not edited in this card):
- `apps/maine-cannabis/src/pages/guides/cannabis-coa-maine-how-to-read.astro`
- `apps/maine-cannabis/src/pages/guides/maine-cannabis-product-testing-guide.astro`

## Success conditions

A reader can identify what the required label fields mean, locate a batch number, understand the limits of traceability/testing, use the OCP recall example without overgeneralizing it, and take a battery/device to an appropriate separate collection route rather than a trash or curbside-recycling bin.
