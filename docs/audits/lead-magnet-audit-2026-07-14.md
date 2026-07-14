# MDG Lead-Magnet Audit — 2026-07-14

> **For Hermes and friends:** this is the current-state evidence record
> for MDG's five downloadable lead magnets. It supersedes the
> inventory/task-state portions of the 2026-07-08 research memo;
> retain that memo's benchmark and production-guidance sections as
> historical research.

## §L.1 — Scope and method

Standing-goal item: **research and create high-converting
lead-magnet PDFs**.

This round is deliberately **audit + recommendation only**. It does
not create a sixth PDF, alter conversion gating, or rewrite lead-page
copy. Reason: artifact trust and funnel documentation first; no
credible conversion baseline exists yet.

Evidence reviewed:

- Five current `.astro` download surfaces
- Five production PDF files (size, `pdfinfo` pages, `pdftotext`
  word count and source-marker scan)
- Current production pages at `mainedispensaryguide.com`
- Current form implementation (`LeadMailtoForm.astro`)
- Current GA4 lead-capture artifacts
- Maine OCP application + guidance pages and Metrc's Maine resource
  page
- Competitor search surface (Flowhub, Indica Online, Distru)

## §L.2 — Current asset inventory (verified)

| Asset | Landing surface | PDF evidence | Gate | Evidence verdict |
|---|---|---|---|---|
| Maine Dispensary Roadmap | `/download-checklist` | 11 pages, 25,538 bytes, ~3,153 extracted words, 87 source-marker hits | mailto | ✅ Real, primary-source-heavy operator asset |
| Founders Bible | `/download/founders-bible` | 10 pages, 738,592 bytes, ~1,055 extracted words, 9 source-marker hits | mailto | ✅ Real asset; 🟠 weakest citation density / strongest voice-review need |
| METRC Reconciliation Checklist | `/download/metrc-reconciliation-checklist` | 10 pages, 23,603 bytes, ~2,335 words, 58 source-marker hits | mailto | ✅ Real, operator-useful asset |
| Compliance Self-Assessment | `/download/compliance-self-assessment` | **22 pages**, 45,623 bytes, ~4,478 words, 127 source-marker hits | mailto | ✅ Real, source-heavy asset; 🟠 landing page says 12 pages |
| First-Timer Field Guide | `/download/first-timer-field-guide` | 9 pages, 21,590 bytes, ~2,850 words, 27 source-marker hits | mailto | ✅ Real consumer asset with safety/disclosure framing |

### Trust-gap verdict

The 2026-07-08 "three broken promises" (missing Roadmap and two
stub PDFs) are **resolved**:

- `1f20d199` created the Roadmap, METRC, and Compliance PDFs.
- `b1fd5971` added `LeadMailtoForm` gates to the METRC and Compliance
  pages.

The critical task is now **truth maintenance**, not PDF creation.

## §L.3 — Current funnel architecture (verified)

| Pattern | Current count | Pages |
|---|---:|---|
| Formspree (`xvgzlowz`) | 3 | newsletter, homepage inline newsletter, resources referral |
| `LeadMailtoForm` | 5 | Roadmap, Founders Bible, First-Timer, METRC, Compliance |
| No-form download surface | 0 | none among the five PDF magnets |

All five PDF forms fire the client-side `lead_capture` event before
opening the user's mail client. Current `formName` labels are:
`download_checklist`, `founders_bible`, `first_timer_field_guide`,
`metrc_checklist`, and `compliance_self_assessment`.

**Known behavior:** four pages expose an explicit direct-download
escape hatch (Founders Bible, METRC, Compliance, First-Timer).
This is not automatically a defect. It is a measurable gating
choice and must be treated as an A/B-test candidate, not silently
removed. The consumer First-Timer asset has a particularly defensible
ungated route; B2B operator pages require an evidence-based choice.

## §L.4 — Measurement status

No conversion-rate conclusion is currently defensible:

- `ga4-lead-capture.jsonl` records a 2026-07-01 to 2026-07-08 window
  with **0 events**.
- `ga4-pull-2026-07-11/raw/lead_capture.jsonl` is empty.
- The METRC and Compliance gates were only added on 2026-07-13, so
  the prior zero-event window cannot assess them.
- The host's scheduled GSC collection is blocked because no
  `cron.service` is installed (round 13). GA4 event data is a
  separate access/measurement concern.

**Measurement decision:** establish a seven-day post-gate baseline
before changing fields, CTA copy, escape hatches, or formats. Until
then, no lead-magnet can honestly be called high- or low-converting.

## §L.5 — Market and primary-source positioning

### What the outside market exposes

The research surface contains broad national/vendor resources:

- Flowhub promotes a first-time dispensary-owner compliance checklist.
- Indica Online and Distru publish Maine Metrc compliance explainers.
- Metrc and Maine OCP provide the underlying Maine-specific resources
  and bulletins.

MDG's defensible differentiation is **not** a generic cannabis
checklist. It is a concise operator asset tied directly to Maine OCP
application instructions, guidance documents, and Metrc's Maine
program resources.

### Current differentiation by asset

| Asset | Buyer stage | Job to be done | Differentiation status |
|---|---|---|---|
| Roadmap | Consideration / decision | Turn a complex Maine launch path into a sequenced plan | Strong; sourced and Maine-specific |
| Founders Bible | Awareness / consideration | Understand whether opening is viable | Weak-to-medium; needs clearer primary-source framing and less generic brand voice |
| METRC checklist | Decision / active operator | Prevent inventory reconciliation misses | Strong; high-intent workflow |
| Compliance assessment | Decision / active operator | Prepare an inspection-ready self-audit | Strong; high-intent workflow |
| First-Timer guide | Awareness consumer | Complete first visit safely and legally | Strong; safety and primary-source context are explicit |

## §L.6 — Findings and recommendations

### R1 — Do not create a sixth magnet yet

The portfolio already spans launch, founder education, active-operator
Metrc, active-operator compliance, and consumer onboarding. Creation
of a new asset before a reliable baseline would add surface area rather
than resolve an evidence gap.

**Decision:** round 14 produces no new PDF recommendation for
immediate creation.

### R2 — Correct landing-page truth before optimizing conversion

The Compliance Self-Assessment landing page says **12 pages**;
`pdfinfo` verifies the current PDF is **22 pages**. This is a small
but concrete promise mismatch. The audit does not edit the page because
that path overlaps the active design branch; resolve it during design
integration or a scoped post-integration content round.

The Founders Bible landing copy says it was "written by operators who
have done it," while the PDF itself carries generic language such as
"Independent Cannabis Empire" and has markedly fewer source markers
than the other operator assets. Treat this as a content-governance
review, not an unsupported claim to reinforce.

### R3 — Preserve mailto architecture; instrument before changing it

The settled mailto pattern is valid for a low-volume, operator-managed
B2B exchange. Do not restore the stale Formspree-autoresponder task.

Before changing any gate:

1. Pull seven full days of `lead_capture` by `form_name`.
2. Record page sessions/impressions for the same window.
3. Calculate submit-intent rate by magnet.
4. Compare direct-download clicks where event instrumentation exists.
5. Only then test one change at a time (field count, escape hatch, or
   CTA message).

### R4 — First experiment after baseline: B2B escape hatch, not new copy

If a baseline has enough events to compare, use the Roadmap or Founders
Bible as the first B2B test surface. Keep primary-source claims,
form fields, and asset content fixed; test the direct-download escape
hatch versus a contextual preview. Do not run the test on the
First-Timer guide first because its consumer safety/access rationale
differs.

## §L.7 — Documentation corrections shipped in this round

1. `docs/LEAD_CAPTURE_SETUP.md`
   - corrected inventory from 3 Formspree + 3 mailto + 2 no-form to
     **3 Formspree + 5 mailto**
   - recorded the two 2026-07-13 METRC/Compliance gates
   - corrected the PDF-gate form table
2. `docs/research/lead-magnet-research-memo-2026-07-08.md`
   - retained historical research and marked stale inventory/task state
3. `docs/analytics/GSC_GA4_AUDIT_2026-07-08.md`
   - corrected obsolete explanation for the historical zero-event
     window
4. `docs/session-handoff-tokens/lead-magnet-stage1-prompt.md`
   - marked completed so it cannot be accidentally re-executed

## §L.8 — Follow-up ownership

| Work | Owner | Gate |
|---|---|---|
| Collect a seven-day `lead_capture` baseline | Analytics/parent-agent round | GA4 read access and current data |
| Correct Compliance page 12-vs-22 page claim | Design integration owner | resolve active design-branch overlap |
| Review Founders Bible voice and attribution claim | Content/editorial owner | primary-source and byline review |
| Test B2B direct-download escape hatch | CRO/analytics owner | baseline volume first |
| Create a sixth magnet | Deferred | only if portfolio gap is evidence-backed |

## §L.9 — Sources

- Maine OCP, *Cannabis Establishment License Application Instructions*:
  https://www.maine.gov/dafs/ocp/adult-use/application-process/establishment-application-instructions
- Maine OCP, *Guidance Documents*:
  https://www.maine.gov/dafs/ocp/resources/guidance-documents
- Metrc, *Maine partner resources*:
  https://www.metrc.com/partner/maine/
- Flowhub, *Compliance Checklist for First-time Dispensary Owners*
  (market comparison):
  https://www.flowhub.com/learn/compliance-checklist-first-time-dispensary-owners
- Indica Online, *How to Stay Metrc Compliant in Maine* (market
  comparison): https://indicaonline.com/blog/how-to-stay-metrc-compliant-in-maine/

## §L.10 — Change history

| Date | Author | Change |
|---|---|---|
| 2026-07-14 | Hermes Agent (parent) | Initial audit, documentation corrections, and evidence-gated recommendations. |