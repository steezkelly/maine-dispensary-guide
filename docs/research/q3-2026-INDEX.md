# `docs/research/` — Q3 2026 report research

**Added 2026-07-22 for the Maine Cannabis Industry Report — Q3 2026 PDF.**

| File | Purpose |
|---|---|
| `q3-2026-source-pool.md` | Single entry point. Anchor edition for CY2025 (live OCP dashboard vs frozen annual report), verified June 2026 and YTD 2026 numbers, mandatory status labels, what the source pool does NOT include, and the verification path before any chart is generated. |
| `q3-2026-legal-regulatory-source-matrix.md` | 24 primary-source rows, 14 timeline candidates, 12 current-vs-proposed table rows. Operative vs enacted-future-effective vs proposed is correctly separated. |
| `market-stats-national-source-matrix-2026-07-22.md` | Industry, technology, and national-context claims. 39 rows, 4 required updates, 14 explicit exclusions, 5 recommended visuals. Replaces/extends `market-stats-national-source-pack-2026-07-09.md`. |
| `../apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md` | Maine market-data source matrix, plus 11-chart plan, reconciliation notes (OCP annual report vs live dashboard, medical caregivers 1,412 vs 1,414, etc.), and the chart-ready current values table. |
| `../apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.{xlsx,csv}` | MRS May 2026 cannabis taxable sales workbook (xlsx) and LibreOffice-derived CSV. |
| `../apps/maine-cannabis/docs/research/q3-2026-data/ocp-au-licenses-2026-06-01.csv` | OCP adult-use licensee-search CSV, dated June 1, 2026 (1,584 file lines = 1,583 data rows + header; 346 unique active licenses after dedupe). |
| `../apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-caregivers-2026-06-01.csv` | OCP medical caregiver registrant search CSV, dated June 1, 2026 (1,415 file lines = 1,414 data rows + header; 1,411 unique registration numbers; 3 duplicate row occurrences). |
| `../apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-establishments-2026-06-01.csv` | OCP medical dispensary/establishment roster CSV, dated June 1, 2026 (805 file lines = 804 data rows + header; 104 unique dispensary licenses after dedupe). |

## Reading order for an editor or verifier

1. `q3-2026-source-pool.md` first — it states the anchor edition, the verified numbers, and the status labels you must use.
2. `q3-2026-legal-regulatory-source-matrix.md` for any legal/regulatory prose or the Q3 timeline.
3. `market-stats-national-source-matrix-2026-07-22.md` for national/industry context. Pay special attention to §8.2 (4 required rewrites of the existing `market-stats.astro` frontmatter) and §8.3 (14 explicit exclusions).
4. `q3-2026-data/SOURCE-MATRIX.md` for Maine-internal market numbers, chart plan, and reconciliation rules.
5. The four CSV/xlsx files in `q3-2026-data/` only when building a chart that uses a row-level or derived value not already in the source matrix.

## Note on sibling documents (do not duplicate)

- `market-stats-national-source-pack-2026-07-09.md` — earlier (13 days old) national-context source pack; superseded by the 2026-07-22 matrix above for any national/industry claim. Still useful as a citation trail where the 2026-07-22 matrix defers to it.
- `market-stats-link-audit-2026-07-09.md` — inbound-link audit; not duplicated here.
- `docs/LEAD_CAPTURE_SETUP.md` — funnel source of truth; not affected by this work.
- `docs/audits/lead-magnet-audit-2026-07-14.md` — separate broken-promise audit; the Q3 PDF is a new lead-magnet candidate, not a replacement for any of the five existing PDFs.
