---
id: MDG-Q3-2026-PDF-2C-LANDING-FIX
parent: MDG-Q3-2026-PDF
role: codex-author
base_sha: 61d48d0dbe500c504888403b53244ce7faa8bcdb
branch: feat/q3-2026-pdf-landing-fixed-2026-07-24
worktree: /home/steve/.cache/mdg-q3-pdf-landing-fixed
allowed_paths:
  - apps/maine-cannabis/src/pages/download/maine-cannabis-industry-report-q3-2026.astro
  - apps/maine-cannabis/src/pages/__tests__/q3-2026-pdf-landing.test.cjs
  - apps/maine-cannabis/src/data/autoRelatedData.json
  - docs/governance/cards/2026-07-24-q3-2026-pdf-landing-fixed.md
acceptance:
  - node apps/maine-cannabis/src/pages/__tests__/q3-2026-pdf-landing.test.cjs passes
  - Page renders /download/maine-cannabis-industry-report-q3-2026 with LeadMailtoForm
  - pdfUrl points to /downloads/maine-cannabis-industry-report-q3-2026.pdf (matches the 4 existing download pages convention)
  - FAQ JSON-LD present
  - npm run verify:iterate passes
depends_on:
  - PR #191 (PDF render) — MERGED, but PDF landed at /public/pdfs/ instead of /public/downloads/
  - PR #196 (LeadIntakeForm server-side intake) — MERGED, LeadMailtoForm now a shim wrapping LeadIntakeForm
lease_ttl_minutes: 180
stop_condition: "Landing page is live, focused test passes, PDF is served from /downloads/ like the other 4 PDFs."
---

# Q3 2026 PDF — Sub-card 2c (FIX): Landing page with correct PDF path

## Objective

Add `/download/maine-cannabis-industry-report-q3-2026` landing page with LeadMailtoForm capture, following the exact same pattern as the 4 existing download pages. Critical fix: this PR must use `/downloads/` for the PDF path (matches the convention of the other 4 PDFs) — not `/pdfs/` as the prior agent's PR #199 and PR #191 (render) did.

## Why this is a fix

PR #191 (PDF render) wrote the Q3 PDF to `apps/maine-cannabis/public/pdfs/maine-cannabis-industry-report-q3-2026.pdf`, so the live URL is `https://mainedispensaryguide.com/pdfs/maine-cannabis-industry-report-q3-2026.pdf` (200). The 4 other lead-magnet PDFs all live at `public/downloads/` and serve from `https://mainedispensaryguide.com/downloads/...` (200). The `/pdfs/` path works but breaks the convention.

Two paths to fix:

1. **Move the PDF file** from `public/pdfs/` to `public/downloads/`.
2. **Add the landing page** with `pdfUrl = "/downloads/maine-cannabis-industry-report-q3-2026.pdf"`.

Both in this one PR.

## DO NOT

- Do not modify the PDF render script (sub-card 2b is done and merged).
- Do not modify any other download page.
- Do not introduce a new `/pdfs/` convention — fix the inconsistency to `/downloads/`.

## Completion metadata

```json
{
  "status": "in_progress",
  "base_sha": "61d48d0dbe500c504888403b53244ce7faa8bcdb",
  "branch": "feat/q3-2026-pdf-landing-fixed-2026-07-24",
  "worktree": "/home/steve/.cache/mdg-q3-pdf-landing-fixed",
  "paths_changed": [],
  "commands": [],
  "blocking_reason": null
}
```
