# Maine cannabis market-data source matrix and Q3 2026 chart plan

**Research cutoff:** 2026-07-22  
**Report timing:** in-quarter Q3 2026  
**Verified publication cutoff:** **June 2026** for OCP operational dashboards; **May 2026** for the lagged MRS tax-filer series; **CY2025** for audited/annual context.

## Editorial bottom line

- The latest **complete calendar month visible in OCP's public adult-use and medical dashboards is June 2026**. Use June for the report's headline market snapshot and label every OCP dashboard metric **“preliminary, unaudited, subject to revision.”**
- The latest official **Maine Revenue Services (MRS) file is May 2026**, consistent with MRS's stated two-month publication lag. Use May as the tax/taxable-sales cutoff and do **not** imply it confirms June.
- July is incomplete as of July 22 and should not appear in monthly performance charts.
- OCP and MRS are not interchangeable: OCP reflects inventory-tracking retail activity; MRS reflects tax filing periods, which MRS warns do not always correspond to the month sales occurred.
- The latest annual source is OCP's **2025 Adult Use and Medical Use annual reports**, issued February 13, 2026. Use these for complete-year structural context, not for current-month claims.

## Verified source matrix

| Source / primary URL | Verified freshness on 2026-07-22 | Available measures / grain | Geography | Status and required label | Recommended use |
|---|---|---|---|---|---|
| **OCP Adult Use Retail Sales dashboard** — https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales | **June 2026** card data; dashboard says monthly, preceding reporting month | Monthly sales revenue, receipt-level transactions, average bud/flower price per gram; product-category revenue and line-item counts; annual/YTD trend | Statewide only | OCP explicitly says **preliminary**, subject to revision/adjustment, and **not audited** | Primary current-market source. June: **$20,688,125 sales; 425,839 transactions; $6.04/g**. Jan–Jun: **$119,954,243; 2,439,812 transactions; $6.10/g average** |
| **MRS Monthly cannabis taxable sales statewide and adult-use tax revenue** — https://www.maine.gov/revenue/taxes/tax-policy-office/sales-tax-reports (file: `May 2026 cannabis sales.xlsx`) | **May 2026**; MRS states reports post ~15th with a two-month lag and entire history is revised monthly | Medical and adult-use taxable sales; sales-tax liability; adult-use sales-tax revenue and excise-tax revenue, monthly | Statewide only | Official tax-filer data, but **filing-period-based and revisable**. MRS: filing period may not equal sales month; liability only roughly corresponds to next month's revenue | Tax chart through May only. May 2026: medical taxable sales **$18,916,692.79**; adult-use taxable sales **$20,283,005.06**; AU liability **$2,839,620.71**; AU sales-tax revenue **$2,744,931.97**; excise revenue **$1,097,908.09** |
| **OCP Adult Use license roster** — https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search | Monthly CSV dated **2026-06-01**, page last updated **July 8, 2026**; weekly UI refresh | License, category/type, status, issue/expiration, address, city, county, contacts/owners | Establishment / municipality / county | Administrative roster snapshot, not sales or operating-performance proof. Count unique license IDs, not raw rows (owners/principals duplicate licenses) | Current supply footprint. Verified CSV: **346 unique active licenses** — 187 stores, 80 manufacturing, 76 cultivation, 3 testing. Two active records lack county; disclose before county totals |
| **OCP Medical Program At-a-Glance dashboard** — https://www.maine.gov/dafs/ocp/open-data/medical-use/at-a-glance | **June 2026** | Registered caregivers, registered employee/assistants, unique medical providers, caregiver/employee applications, printed patient certificates | Statewide; caregiver trend/map supports county context | Dashboard footnote: **preliminary and subject to revisions/adjustments**. Printed certificates are not unique patients | June cards: **1,412 caregivers; 17 registered employees/assistants; 826 unique providers; 139 caregiver applications; 1 employee application; 10,542 printed certificates**. The “17 employees/assistants” card is anomalous vs annual RIC totals and should not be charted without OCP clarification |
| **OCP Medical caregiver roster** — https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search | CSV dated **2026-06-01**, page last updated **July 8, 2026** | Active caregiver registration, residential/cultivation/retail town and county | Town/county | Administrative snapshot; public fields constrained by 22 MRS §2425-A(14). Do not equate caregiver registration with storefront | Verified file contains **1,414 rows**, including **272 with a retail town**. Dashboard card shows 1,412, a **2-record source disagreement**; preserve both values and label snapshot timing/source rather than forcing a canonical count |
| **OCP Medical dispensary roster** — same registrant-search page | CSV dated **2026-06-01**, page last updated **July 8, 2026** | Dispensary applications/registrations, status, city, contacts | Establishment / municipality | Raw CSV repeats each license for contacts; dedupe by `LICENSE` | Verified file: **104 unique dispensary licenses: 95 active, 9 pending**. Do not treat all registrations as unique retail storefronts/locations without parsing authorized activities/locations from a richer source |
| **OCP 2025 Adult Use annual report** — https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf | Complete **CY2025**, issued **2026-02-13** | Annual sales, transactions, price, categories/volume, licenses/canopy, tax, compliance, testing, program costs | Mostly statewide; no defensible retail-sales county breakout | Statutory annual report; best complete-year benchmark. Some internal displayed totals differ by a few dollars/transactions from live revised dashboard, so identify source edition | 2025 context: report text **$246,423,512 sales; 4,835,682 transactions; $6.62/g; 343 active establishments at 12/31/25**. Product sales: usable $137.35m, concentrate $71.87m, infused $37.02m, plants $0.183m |
| **OCP 2025 Medical Use annual report** — https://legislature.maine.gov/doc/12333 | Complete **CY2025**, issued **2026-02-13** | Printed certifications, providers, caregivers, dispensaries, employees, county tables, inspections, program fund, FY tax | Statewide and county for certifications/caregivers/selected facility locations | Statutory annual report. Certifications include reprints and are **not unique patient counts**; revenue section is **FY2025**, not CY2025 | Strongest medical/geographic source: 112,547 printed certificates; 808 providers; 1,539 caregivers; 90 active dispensary certificates; 62 dispensary retail locations; $14.276m estimated medical sales-tax revenue in FY2025 |
| **OCP Annual Reports index** — https://www.maine.gov/dafs/ocp/resources/annual-reports | 2011–2025 medical; 2019–2025 adult-use | Historical statutory reports | Varies | Primary archive; definitions can change across editions | Source prior-year structural series and document any definition break |

## Reconciliation notes that must survive editing

1. **OCP sales vs MRS taxable sales:** never merge, average, or use one as an undocumented correction to the other. Preserve source identity. OCP June is available; MRS stops at May.
2. **OCP annual report vs live dashboard — anchor edition:** the report is published during Q3 2026, not at year-end. We anchor CY2025 to the **live dashboard edition** (~**$246.817M / ~4,845,XXX**), which is what readers see today. The OCP 2025 Annual Report text ($246.424M / 4,835,682) is the frozen statutory benchmark and is presented in the same article as a separate, labeled "annual report" line so the two editions are both visible and the source identity is preserved. The dashboard history is revisable; the report labels CY2025 as "preliminary, dashboard edition" when showing the dashboard totals and "frozen statutory edition" when citing the annual report.
3. **Medical caregivers:** June roster has 1,414 active rows while the dashboard card says 1,412. Report either as separate source-specific observations or use dashboard 1,412 for the June KPI and roster 1,414 only for roster geography, with an explicit note.
4. **Medical patients:** Maine does not maintain a central patient registry. Never relabel printed certificates as “patients.”
5. **Transactions by category:** dashboard category counts are receipt line items, while headline transactions are receipts/overall purchases. Do not sum category counts as customer transactions.
6. **County market size:** there is no verified OCP county sales series. License, caregiver, certification, and location maps show footprint/access, not county revenue or demand.

## Chart plan

| Priority | Chart | Source and cutoff | Construction | Caption / caveat |
|---|---|---|---|---|
| 1 | **Adult-use monthly sales, trailing 12 months** | OCP dashboard, Jul 2025–Jun 2026 | Columns; highlight Jun 2026; include YoY comparison only after extracting same months from same live source edition | “OCP inventory-tracking data; preliminary, unaudited, subject to revision.” |
| 2 | **2026 YTD sales, transactions, and average ticket** | OCP, Jan–Jun 2026 | Three KPI cards. Derived average receipt value = sales / receipt transactions; label calculated | Through Jun: $119.954m, 2.440m receipts, derived ~$49.17/receipt. Price/g is flower-specific, not basket-wide |
| 3 | **Bud/flower price compression** | OCP annual report 2021–2025 + live dashboard 2026 YTD | Line: 2021 $12.75, 2022 $9.23, 2023 $7.77, 2024 $7.24, 2025 $6.62; add 2026 YTD $6.10 as a differently styled provisional point | Do not imply YTD average is a complete-year observation; dashboard is preliminary |
| 4 | **Product-mix shift** | OCP dashboard Jan–Jun 2026; annual report for 2023–2025 context | 100% stacked area/columns using sales dollars by usable cannabis, concentrate, infused, plants. Prefer shares over unit counts because units and kilograms are incompatible | Dashboard category sales preliminary; plants may be too small to label directly |
| 5 | **OCP vs MRS monthly sales lens** | OCP through Jun; MRS through May | Two-line or paired-column small multiple, explicitly named “OCP tracked retail sales” vs “MRS taxable sales by filing period”; no blended total | Different systems/period semantics; May is latest common month; MRS history revises monthly |
| 6 | **Adult-use tax receipts** | MRS through May 2026 | Stacked/paired columns: sales-tax revenue and excise-tax revenue; annotate Jan 1, 2026 rate change (sales tax 10%→14%, excise $335/lb→$223/lb per OCP annual report) | Revenue timing does not exactly equal sales month; do not calculate a naive effective rate from same-row revenue |
| 7 | **Active adult-use license mix** | OCP roster dated 2026-06-01 | Horizontal bars: stores 187, manufacturing 80, cultivation 76, testing 3; optionally compare frozen 12/31/25 annual report (180/81/78/4) | Unique active licenses, not businesses, locations open today, or raw CSV rows |
| 8 | **Adult-use footprint by county** | OCP 2026-06-01 roster | County dot plot or map by unique active license, faceted by category; retain “unknown county” bucket (2 active records) | Footprint only. Never title “county market size” or infer sales/demand |
| 9 | **Medical program divergence** | 2025 medical annual report + June 2026 dashboard/roster | Indexed trend or paired slopes: printed certificates vs caregivers vs dispensary registrations; current cards separated from annual observations | Certificates ≠ unique patients; current roster/dashboard caregiver disagreement disclosed |
| 10 | **Medical access geography** | 2025 annual report county tables | Two aligned bars/maps: printed certificates by county and registered caregivers by county; optionally retail dispensary locations | Do not compute “patients per caregiver” because certificates are not unique patients and may include reprints |
| 11 | **Market structure snapshot** | OCP 2025 annual reports | Editorial table: adult-use 180 stores / 343 establishments; medical 286 reported caregiver stores, 62 dispensary retail locations, 1,539 caregivers at year-end | Program definitions differ; do not sum these into a single “dispensary” total |

## Chart-ready current values

### OCP adult-use — June 2026 / Jan–Jun 2026

| Metric | June 2026 | 2026 YTD |
|---|---:|---:|
| Sales | $20,688,125 | $119,954,243 |
| Receipt transactions | 425,839 | 2,439,812 |
| Avg. bud/flower price per gram | $6.04 | $6.10 |
| Derived average receipt value | $48.58 | $49.17 |

### MRS — May 2026 (latest available)

| Metric | May 2026 |
|---|---:|
| Medical taxable sales | $18,916,692.79 |
| Adult-use taxable sales | $20,283,005.06 |
| Adult-use sales-tax liability | $2,839,620.71 |
| Adult-use sales-tax revenue | $2,744,931.97 |
| Adult-use excise-tax revenue | $1,097,908.09 |

### OCP June 1 license snapshots

| Program / category | Count |
|---|---:|
| Adult-use active unique licenses | 346 |
| Adult-use stores | 187 |
| Adult-use manufacturing | 80 |
| Adult-use cultivation | 76 |
| Adult-use testing | 3 |
| Medical caregiver roster rows | 1,414 |
| Medical caregiver rows with retail town | 272 |
| Medical active unique dispensary licenses | 95 |

## Production rules

- Every chart footer must include **source, observation period, retrieval date (2026-07-22), and status**.
- Use “through June 2026” for OCP; use “through May 2026” for MRS.
- Never call June “final.” “Latest complete month” refers to calendar coverage, not audit/finality.
- Use exact source terminology: “adult use,” “printed patient certificates,” “registered caregiver,” “taxable sales,” and “receipt transactions.”
- Archive the source files used for production because both OCP dashboards and MRS histories revise.
