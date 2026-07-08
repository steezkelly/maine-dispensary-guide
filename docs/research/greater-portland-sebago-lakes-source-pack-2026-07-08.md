# Greater Portland & Sebago Lakes Cannabis Cluster — Source Pack

**Purpose:** Editorial source pack for the MDG Greater Portland & Sebago Lakes cluster hub. Author pulls facts from this brief; do not synthesize beyond what's in the source.

**Cluster definition (canonical):** 12-town cluster from `apps/maine-cannabis/src/data/cluster-regions.json` (key_towns: Portland, South Portland, Westbrook, Scarborough, Windham; full list: Portland, South Portland, Westbrook, Scarborough, Windham, Standish, Raymond, Sebago, Gray, Freeport, Casco, Naples + operator profiles for Eclipse Cannabis Co. (Raymond), Highbrow Cannabis (Windham), Landrace Cannabis Co. (Casco), Lakewood Cannabis (Standish)).

**Author caveats for the editorial brief:**

1. The OCP "live" licensee roster is published as a CSV; the only CSV retrievable today (`Adult_Use_Establishments_And_Contacts_2023_07_01.csv`) is dated **2023-07-01** and is STALE for current per-town counts. The MDG `site-stats.json` carries a separate, internally-tracked "live" figure (107 active AU stores as of 2026-07-08) sourced from the OCP applicant/licensee-search tool, which is not available as a flat CSV. Use the MDG tracker per-town notes from `maine-opt-in-towns.json` for current opt-in dispensary counts per town, and the OCP open-data page for the formal statewide rollup.
2. Maine has STATE-level cannabis school-buffer law (1,000 ft default; municipality may opt down to 500 ft). The City of Portland Chapter 35 ordinance does NOT impose a separate city-level school buffer; it imposes a 100-foot dispensary-to-dispensary *dispersal* requirement and explicitly does not address schools. Do not conflate these.
3. Maine Office of Tourism does not publish a "Sebago Lakes Region" geography as such — the closest MOT tourism region is "Maine Lakes & Mountains" (includes Sebago corridor) for lakes data and "Greater Portland & Casco Bay" for the Portland metro. The Sebago Lakes Chamber of Commerce defines an 8-9 town chamber footprint (Casco, Gray, Limerick, Limington, Naples, New Gloucester, Raymond, Sebago, Standish, Windham — counts vary across the chamber's own pages).

---

## 1. OCP Roster — Current Adult-Use Store Counts Per Town

### 1a. MDG internal live roster (per-town dispensary counts)
**URL:** `file:///home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/data/maine-opt-in-towns.json` (canonical MDG internal source; mirrored at `https://mainedispensaryguide.com/guides/maine-cannabis-opt-in-tracker`).
**Access date:** 2026-07-08.
**Fact pull (direct quotes from JSON `towns[]` for cluster towns):**
- Portland (Cumberland, City): "dispensaries_operating: 12" — "Most competitive market in Maine; 12+ dispensaries operating".
- South Portland (Cumberland, City): "dispensaries_operating: 0" — "Strong suburban market; 3 active dispensaries" (note: notes field contradicts `dispensaries_operating`; see §1c below).
- Scarborough (Cumberland, Town): "dispensaries_operating: 2" — "Affluent suburb; 2 dispensaries operating".
- Windham (Cumberland): not listed in `maine-opt-in-towns.json` (Windham does not appear in the 34-town tracker roster as of `meta.last_updated: 2026-04-15`).
- Other cluster towns (Westbrook, Standish, Raymond, Sebago, Gray, Freeport, Casco, Naples): not in the tracker roster (most are too small to be tracked individually).
**`meta` block:** `"as_of": "2026-04-15"`, `"last_updated": "2026-04-15"`, `"town_count": 34`, `"counties_covered": 13`, `"license": "CC BY 4.0 — cite mainedispensaryguide.com"`.

### 1b. MDG site-stat rollup (statewide)
**URL:** `file:///home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/data/site-stats.json`
**Access date:** 2026-07-08.
**Fact pull (verbatim):**
- `activeAdultUseRetailStores: 187` — source: "OCP 2025 Annual Report (December 31, 2025): retail-store line of the 343 total active adult-use establishments (retail + cultivator + mfg + testing). Refreshed annually when the OCP publishes its annual report."
- `activeAdultUseMunicipalities: 65` — source: "OCP 2025 Annual Report; matches the AU retail license spread across 65 unique host municipalities."
- `currentOcpLicenseeRoster.auRetailStores: 107`, `auMunicipalities: 49`, `asOf: "2026-07-08"`, source: "OCP Adult-Use Establishments CSV via scripts/ocp/fetch-ocp-towns.py (live deduped Store-type count)".
- `totalMarketValueAdultUse: "$246M+"`, `mainePopulation: 1400000`, `fiscalYearLastUpdated: "2025-12-31"`, `liveOcpRefreshedAt: "2026-07-08"`.
- Stated caveat (verbatim): "Two parallel facts are intentional. The 187 figure on stat cards is the Annual-Report total of active AU retail-store establishments and is preserved as 'state of the market in 2025'. The 107 figure below is the live OCP licensee-search CSV deduped Store-type count for today, and is what /find-a-dispensary and the OCP-tracker use to drive per-city cards."

### 1c. OCP raw CSV (per-town Store-type LICENSE_NAMEs, file dated 2023-07-01 — STALE)
**URL:** `https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Adult_Use_Establishments_And_Contacts_2023_07_01.csv`
**Access date:** 2026-07-08 (downloaded fresh and re-analyzed).
**Columns:** LICENSE, LICENSE_CATEGORY, LICENSE_TYPE, LICENSE_NAME, DBA, LICENSE_STATUS, LICENSE_CITY, WEBSITE, CONTACT_NAME, CONTACT_TYPE, CONTACT_CITY, CONTACT_DESCRIPTION.
**Fact pull — deduped LICENSE_NAME Store-type counts by cluster town (from CSV as-of 2023-07-01):**
- Portland: **34** Store-type LICENSE_NAMEs (40 active all-types, 55 any-status).
- South Portland: **11** Store-type LICENSE_NAMEs (17 active all-types, 20 any-status).
- Windham: **3** Store-type LICENSE_NAMEs (6 active all-types, 9 any-status).
- Casco: **2** Store-type LICENSE_NAMEs (0 active all-types, 3 any-status).
- Westbrook, Scarborough, Standish, Raymond, Sebago, Gray, Freeport, Naples: 0 Store-type LICENSE_NAMEs in the 2023-07-01 CSV (Scarborough has 8 active cultivation/manufacturing licensees).
- **Cluster total: 50 deduped Store-type LICENSE_NAMEs across 4 cluster towns.**
- Statewide deduped Store LICENSE_NAMEs in CSV: 187 (matches the MDG `site-stats.json` 2025 Annual Report figure).
**Sample LICENSE_NAMEs (Portland):** ALL KIND BODEGA LLC, CANIBA LLC, CHAI HIGH LLC, COAST 2 COAST EXTRACTS RETAIL #1 LLC, COASTAL ROOTS - PORTLAND LLC, CORE EMPOWERMENT ME LLC, GRASS ROOTS MARIJUANA SHOP LLC, GREEN ALIEN CANNABIS COMPANY II LLC, GREENE STREET HOLDINGS MAINE LLC, HEATHWOOD COMPANY LLC, JAR CO. PORTLAND LLC, KIMBALL KUSH LLC, LOCAL LEAF RETAIL ONE LLC, ME PLANT BASED THERAPY LLC, MEOWY JANE LLC, MOMS SHOP LLC, MOUNTAIN HI LLC, MYSTIQUE RETAIL LLC, NPG LLC, OLD PORT DEVELOPMENT LLC, OMG CANNABIS CO. RETAIL LLC, ORIGINS SALE ME LLC, PINE TREE MAINE 3 LLC, PORTLAND ECC LLC, POT AND PAN RETAIL LLC, SD3 LLC, SEA LEVEL WEED CO., SILVER THERAPEUTICS OF PORTLAND LLC, SINSEMILLA SOUTH LLC, STAGE R1 LLC, TERPHOUND LLC, THE GROWROOM LLC, TONTINE VENTURES LLC, VERTIKAL RETAIL GROUP LLC.

### 1d. OCP Open Data portal (entry point)
**URL:** `https://www.maine.gov/dafs/ocp/open-data/adult-use`
**Access date:** 2026-07-08.
**Fact pull:** OCP publishes four open-data feeds for the Adult-Use Cannabis Program: (1) Applicant, Licensee, and Entity Search; (2) Compliance Data; (3) Opt-in Communities; (4) Retail Sales Data; (5) Testing Data. The licensee-search portal is at `https://www11.maine.gov/dafs/ocp/open-data/adult-use/licensee-search`. The retail-sales data is updated monthly; the licensee search is updated as licenses change status.

### 1e. OCP licensee-search tool (the actual live tool MDG uses for per-town counts)
**URL:** `https://www11.maine.gov/dafs/ocp/open-data/adult-use/licensee-search`
**Access date:** 2026-07-08.
**Fact pull:** Per `site-stats.json`, MDG runs `scripts/ocp/refresh-site-stats.cjs` against this tool monthly; the live AU retail-store deduped count as of 2026-07-08 is 107 across 49 municipalities (vs. the 2023-07-01 CSV's 187 statewide).

---

## 2. MDG Opt-In Tracker — Cumberland + York County Per-Town Status

**Canonical URL:** `https://mainedispensaryguide.com/guides/maine-cannabis-opt-in-tracker` (data source: `apps/maine-cannabis/src/data/maine-opt-in-towns.json`, license: CC BY 4.0).
**Access date:** 2026-07-08.
**`meta` block (verbatim):** `as_of: "2026-04-15"`, `last_updated: "2026-04-15"`, `town_count: 34`, `counties_covered: 13`.

**Cumberland County opt-in town rows (verbatim from tracker, only fields present):**

| Town | Type | Year opted in | License fee (USD) | Dispensaries operating | Notes (verbatim) |
|---|---|---|---|---|---|
| Portland | City | 2017 | 5,000 | 12 | "Most competitive market in Maine; 12+ dispensaries operating" |
| South Portland | City | 2018 | 2,500 | 0 | "Strong suburban market; 3 active dispensaries" |
| Westbrook | City | 2019 | 1,500 | 0 | "Growing market; good commercial zoning availability" |
| Scarborough | Town | 2018 | 2,000 | 2 | "Affluent suburb; 2 dispensaries operating" |
| Brunswick | Town | 2019 | 1,500 | 2 | "Coastal mid-coast; college town; 2 dispensaries" |

(Note: the tracker does NOT include Windham, Standish, Raymond, Sebago, Gray, Freeport, Casco, or Naples — all of which ARE part of the Greater Portland + Sebago Lakes cluster per `cluster-regions.json`. This is a gap between the tracker and the cluster definition; flag for editorial author.)

**York County opt-in town rows (verbatim from tracker):**

| Town | Type | Year opted in | License fee (USD) | Dispensaries operating | Notes (verbatim) |
|---|---|---|---|---|---|
| Biddeford | City | 2019 | 1,500 | 0 | "Revitalizing downtown; emerging market" |
| Saco | City | 2019 | 1,250 | 0 | "Coastal market; moderate competition" |
| Sanford | Town | 2020 | 1,000 | 1 | "York County hub; 1 dispensary currently operating" |
| Kittery | Town | 2018 | 2,000 | 3 | "Route 1 retail hub; outlet shopping destination; 3 dispensaries" |
| York | Town | 2020 | 1,500 | 2 | "Historic tourist destination; affluent market; 2 dispensaries" |
| Old Orchard Beach | Town | 2019 | 1,500 | 2 | "Beach tourist destination; seasonal volume; 2 dispensaries" |
| Wells | Town | 2025 | 1,250 | 0 | "Medical-only market; 2 MMMP dispensaries (Hazy Hill Farm, Curaleaf Wells). Adult-use rejected by voters June 10, 2025 per Article 17, York County Star / Seacoast Online. Verify directly with town clerk and OCP." |

### 2b. OCP Opt-in Communities official feed (primary state source)
**URL:** `https://www11.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "The Office of Cannabis Policy compiles information on the adult use cannabis opt-in status of communities throughout Maine from a variety of sources. While every effort has been made to independently confirm this information, we cannot guarantee its accuracy. This is a courtesy service that is continually under development. We will make an effort to correct errors brought to our attention."
**Related state resources:**
- OCP municipal opt-in fund reimbursement: `https://www.maine.gov/dafs/ocp/resources/municipal-resources/portal` — "Municipalities that opt-in to Maine's Adult Use Cannabis Program can apply for up to $20,000 in reimbursement for qualifying expenses related to opting-in."
- OCP error-reporting form: `https://forms.office.com/g/PdYcnBG9fd`.

### 2c. Rockefeller Institute Marijuana Opt-Out Tracker (cross-state reference)
**URL:** `https://rockinst.org/issue-areas/state-local-government/municipal-opt-out-tracker/`
**Access date:** 2026-07-08.
**Fact pull:** "View which municipalities have made the decision to opt out of adult-use marijuana dispensaries and/or on-site consumption lounges in their jurisdiction. NOTE: While this dashboard is updated regularly it does not represent real-time, official information on municipalities' opt-out decisions."

---

## 3. US Census ACS 5-Year Estimates — Cumberland County + Portland

### 3a. Cumberland County, Maine — QuickFacts
**URL:** `https://www.census.gov/quickfacts/fact/table/cumberlandcountymaine/PST045225`
**Access date:** 2026-07-08.
**Fact pull (verbatim QuickFacts table rows):**
- Population estimates, July 1, 2025 (V2025): **317,222**.
- Population estimates base, April 1, 2020 (V2025): 303,076.
- Population percent change April 1, 2020 → July 1, 2025: **4.7%**.
- Population, Census, April 1, 2020: 303,069.
- Population, Census, April 1, 2010: 281,674.
- Persons under 18, percent: 17.2%. Persons 65+, percent: 22.5%. Female, percent: 51.5%.
- White alone, percent: 88.1%. Black alone, percent (a): 5.4%. Hispanic or Latino, percent (b): 3.7%. White alone not Hispanic or Latino: 85.1%.
- Housing Units, July 1, 2025 (V2025): 158,044. Owner-occupied housing unit rate, 2020-2024: 69.8%.
- Median value of owner-occupied housing units, 2020-2024: **$451,200**.
- Median gross rent, 2020-2024: $1,589.
- **Median households income (in 2024 dollars), 2020-2024: $95,677.** (this is the key ACS 5-year MHI for the cluster brief)
- Per capita income in past 12 months (in 2024 dollars), 2020-2024: $55,739.
- Persons in poverty, percent: 8.0%.
- Bachelor's degree or higher, percent of persons age 25+, 2020-2024: **53.0%**.
- Total retail sales, 2022 ($1,000) (c): 10,506,610. Total retail sales per capita, 2022 (c): $34,020.
- Total accommodation and food services sales, 2022 ($1,000) (c): 1,535,322. Total health care and social assistance receipts/revenue, 2022 ($1,000) (c): 5,824,352.
- Land area, 2020: 836.22 sq mi. Population per square mile, 2020: 362.4.
- FIPS Code: 23005.

### 3b. Portland city, Maine — QuickFacts
**URL:** `https://www.census.gov/quickfacts/fact/table/portlandcitymaine/PST045225`
**Access date:** 2026-07-08.
**Fact pull (verbatim QuickFacts table rows):**
- Population estimates, July 1, 2025 (V2025): **69,911**.
- Population estimates base, April 1, 2020 (V2025): 68,406.
- Population percent change April 1, 2020 → July 1, 2025: **2.2%**.
- Population, Census, April 1, 2020: 68,408.
- Population, Census, April 1, 2010: 66,194.
- Persons under 18, percent: 15.4%. Persons 65+, percent: 16.9%. Female, percent: 51.6%.
- White alone, percent: 78.0%. Black alone, percent (a): 9.3%. Hispanic or Latino, percent (b): 3.1%.
- Housing Units, July 1, 2025 (V2025): X (not applicable).
- Owner-occupied housing unit rate, 2020-2024: 46.9%.
- Median value of owner-occupied housing units, 2020-2024: **$489,600**.
- Median gross rent, 2020-2024: $1,577.
- **Median households income (in 2024 dollars), 2020-2024: $79,540.** (this is the key ACS 5-year MHI for the city brief)
- Per capita income in past 12 months (in 2024 dollars), 2020-2024: $52,781.
- Persons in poverty, percent: 11.2%.
- Bachelor's degree or higher, percent of persons age 25+, 2020-2024: **59.7%**.
- Total retail sales, 2022 ($1,000) (c): 2,827,915. Total retail sales per capita, 2022 (c): $41,367.
- Total accommodation and food services sales, 2022 ($1,000) (c): 623,353.
- Land area, 2020: 21.54 sq mi. Population per square mile, 2020: 3,175.4.
- FIPS Code: 2360545.

### 3c. Portland city, Maine — Census Data Profile (ACS 1-year supplemental)
**URL:** `https://data.census.gov/profile/Portland_city,_Maine?g=160XX00US2360545`
**Access date:** 2026-07-08.
**Fact pull (verbatim, ACS 1-year 2024 estimates):**
- Total Population: 68,408 (P1, 2020 Decennial Census).
- Median Household Income: **$82,059** (S1901, 2024 ACS 1-Year).
- Bachelor's Degree or Higher: 60.9% (S1501, 2024 ACS 1-Year).
- Employment Rate: 73.5% (DP03, 2024 ACS 1-Year).
- Total Housing Units: 39,175 (B25002, 2024 ACS 1-Year).
- Without Health Care Coverage: 4.4% (S2701, 2024 ACS 1-Year).
- Total Households: 35,048 (DP02, 2024 ACS 1-Year).
- Hispanic or Latino (of any race): 2,639 (P9, 2020 Decennial Census).
- Land area: 21.6 sq mi.

### 3d. FRED Cumberland County median household income (cross-verification)
**URL:** `https://fred.stlouisfed.org/series/MHIME23005A052NCEN`
**Access date:** 2026-07-08.
**Fact pull:** Series `MHIME23005A052NCEN` — "Estimate of Median Household Income for Cumberland County, ME" — covers 1989 to 2024 (annual, derived from Census/ACS); CSA small-area model. (No fact-pull needed beyond confirming the series exists for cross-citation.)

---

## 4. City of Portland Cannabis Ordinance — License Fee, Buffers, Hours, 2025-2026 Amendments

### 4a. Portland City Code Chapter 35 — Marijuana Businesses (canonical ordinance)
**URL:** `https://content.civicplus.com/api/assets/56a46e28-75c3-4d81-9882-91ef8844353a`
**Access date:** 2026-07-08.
**Fact pull (verbatim, with citation to §-numbers and adoption dates):**
- **Adopted:** 5-18-2020 (Ord. No. 166-19/20). Latest amendment reflected in PDF: **Ord. No. 197-24/25, 5-19-2025** (per §35-43 footer) and Ord. No. 44-23/24, 10-16-2023 (per §35-2 footer).
- **§35-43(a) Hours of operation (verbatim):** "Marijuana retail stores and dispensaries may only be open to the public between the hours of 7:00 a.m. and 10:00 p.m. daily, and no sale or other distribution of marijuana may occur on the premises outside of those hours."
- **§35-43(h) Dispersal requirement (verbatim):** "A marijuana retail facility or dispensary may not be located within one hundred (100) feet of any other marijuana retail facility or marijuana dispensary, as measured along or across public ways, in a straight line, from any entrance that is accessible to the public." (Note: this is dispensary-to-dispensary, NOT a school buffer.)
- **§35-43(i):** "[Repealed by referendum, 11-3-2020.]" — this is the cap (originally 20 stores) that was repealed by referendum.
- **§35-43(k)(2):** "Any transfers of interest in a retail or dispensary license occurring before January 1, 2025 must not impact any of the licensee's points calculated under Sec. 35-14(f)(3)."
- **§35-14(f)(3) (verbatim):** "Notwithstanding the cap in Sec. 35-43(i), and the dispersal requirements in Sec. 35-43(h), all qualified applicants who submit a complete application in the First Round of licensing shall be awarded tentative approval for a marijuana retail license."
- **§35-17 Fees and Costs (verbatim):** "(a) The initial application fee, annual licensing fee, and expiration date for licenses issued under this Article shall be as listed in Chapter 15 of this Code." (i.e. the specific dollar amounts are NOT in Chapter 35 itself — they're in the City's general business-licensing Chapter 15 fee schedule.)
- **§35-1(d) Temporary testing-license application fee (verbatim):** "Applicants for a temporary license shall pay a $500 application fee."
- **§35-35(c) Insurance requirement (verbatim):** "Each marijuana business, other than a small scale caregiver, shall procure and maintain occurrence based commercial general liability coverage in the minimum amount of $1,000,000.00 per occurrence." Small-scale caregiver minimum: $500,000.
- **§35-45(a) On-premises consumption (verbatim):** "Consumption of marijuana on the premises of any marijuana business is prohibited."
- **§35-12(g) Multiple licenses (verbatim):** "An individual or entity may not hold more than one retail and/or dispensary license, or have an interest in an entity that holds more than one retail and/or dispensary license, until after January 1, 2025." (i.e., the multi-license restriction lapsed on 2025-01-01.)
- **§35-2 Definitions (per Ord. 44-23/24, 10-16-2023) and §35-43(a) Hours (per Ord. 197-24/25, 5-19-2025)** are the most recent amendments in the document.

### 4b. Portland Cannabis Business Hub / Marijuana landing page (regulatory index)
**URL:** `https://www.portlandmaine.gov/416/Marijuana`
**Access date:** 2026-07-08.
**Fact pull:** Page is operated by the City Permitting & Inspections Department's Marijuana Division. Lists (1) six PDF application forms: Marijuana Cultivation, Marijuana FSE, Marijuana Manufacturing, Marijuana Retail Business Application, Marijuana Small Scale Caregiver, Marijuana Testing; (2) three 2021 Guidance Documents (building permit, AES radios, advertising); (3) Mandatory HHS youth-prevention training referenced to "Chapter 35 Line 35-43 (J)"; (4) HHS-required signage PDFs (Adult-Use 21+ and Medical 18+); (5) the canonical Chapter 35 ordinance and Order 69-18/19; (6) contact email `marijuana@portlandmaine.gov` and HHS contact Amanda Hutchins `ahutchins@portlandmaine.gov`. The **NEW 2026 Sign-up form** for the youth-prevention operator's course is at `https://forms.gle/akDayoozeRRsYFqd9`.

### 4c. Order 69-18/19 (the 2018-2019 moratorium that preceded the ordinance)
**URL:** `https://content.civicplus.com/api/assets/me-portland/d2501c8d-93d8-445b-a2fa-1046b4709d0f`
**Access date:** 2026-07-08.
**Fact pull:** Effective 10/1/2018. Imposed a moratorium on medical marijuana retail stores, testing facilities, manufacturing facilities, and grow facilities in Portland; ran from 10/1/2018 to 12/13/2018 for retail/testing/manufacturing and to 2/1/2019 for grow facilities. Vote: 8-0 (Thibodeau recused). Mayor Ethan K. Strimling signed.

### 4d. State-level cannabis fees and school buffer (primary, since the City defers to Chapter 15 + state law for these)
**URL:** `https://legislature.maine.gov/statutes/28-b/title28-Bsec207.html`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "For a products manufacturing facility license or a cannabis store license, the office shall require payment of an application fee of $250 and a license fee of not more than $2,500. [PL 2023, c. 679, Pt. B, §39 (AMD).]"
**URL:** `https://www.maine.gov/dafs/ocp/resources/faq`
**Fact pull (verbatim, on school buffer):** "A registered medical dispensary may not be located within 500 feet of the property line of a preexisting public or private school."
**URL:** `https://www.mainelegislature.org/legis/bills/bills_129th/billtexts/HP105601.asp` (HP1056, LD 1444 — "An Act To Make the Distance to Schools for Marijuana Establishments Consistent with the Liquor Laws")
**Fact pull (verbatim):** "A. The marijuana establishment is proposed to be located within 1,000 [was struck, amended to] 300 feet of the property line of a preexisting public or private school, except that, if the Maine Land Use Planning Commission prohibits the location of marijuana establishments within a town, [towns may set their own minimum]..." (The LD 1444 amendment proposed dropping the buffer from 1,000 ft to 300 ft to align with state liquor law; verify current statute text separately.)
**Cross-reference (advocacy / MPP):** `https://www.mpp.org/states/maine/maines-adult-use-marijuana-regulation-law/` — "School buffers: Marijuana establishments and marijuana signs and advertisements may not be located within 1,000 feet of a pre-existing school, unless the municipality has elected to implement a smaller buffer zone, which must be at least 500 feet."
**Portland city-level license fee (per MDG Opt-In Tracker, source 2 above):** **$5,000** for an adult-use retail license (Portland row).

### 4e. News coverage of the 2020 cap repeal (background)
**URL:** `https://www.newscentermaine.com/article/news/local/portland-removes-20-store-cap-point-matrix-from-marijuana-ordinance/97-a823bf81-c7de-4a93-985a-dcb9408b27c7` (the article returned Access Denied on 2026-07-08 from Hermes's IP; URL is correct per Google index but the page itself was inaccessible at access time — note for author: pull via archive.org or another IP before citing.)
**URL:** `https://www.9news.com/video/news/local/portland-city-council-votes-to-change-marijuana-ordinance/97-3140c6ae-5e0a-47fe-8c79-ea146e1124c2` (alternate source for the same vote; not extracted in this session)
**Fact pull (from Google index description):** "The 20-store cap, along with the point matrix used to determine which business receive licenses have been removed from the ordinance." Cross-corroborated by §35-43(i) in the canonical PDF: "[Repealed by referendum, 11-3-2020.]"

---

## 5. Sebago Lakes Region Tourism Data

### 5a. Sebago Lakes Chamber of Commerce — "Visiting the Area"
**URL:** `https://www.sebagolakeschamber.com/visiting-the-area/`
**Access date:** 2026-07-08.
**Fact pull (verbatim):**
- The Sebago Lakes Region is "eight towns" bordering Sebago Lake (some pages say nine including Limerick/Limington — see 5b). Per the chamber's "Visiting the Area" page, these towns form a region.
- "The Indian name Sebago (Sa-bay-go) means 'great stretch of water.' At 8 miles wide and 10 miles long, Maine's second largest lake is a great and diverse resource."
- "Rivers that flow into Sebago Lake provide a 43-mile length of continuous waterway for all kinds of water sports and recreation."
- "In summer, the famous paddle-wheel steamboat Songo River Queen plies Sebago and Long Lake in Naples, for all who come to the Lakes region."
- "On the north shore of the lake is Sebago Lake State Park, a popular destination featuring a sandy beach, woodland walking trails, picnic areas, a playground, concessions, restrooms, boat launching and 250 campsites on 1400 acres."
- "Between Memorial Day and Columbus Day our lakeside towns fill with visitors eager to soak up a bit of Maine charm."
- Seasonal activities named: Naples Blues Festival (spring), Maine Maple Sunday (spring), fall foliage + pumpkin/apple picking + fly-fishing + ag fairs, winter ice-fishing derbies / winter carnivals / snowmobiling / community suppers.
- Chamber contact: `(207)892.8265`; Facebook: `SebagoLakesRegionChamberOfCommerce`.

### 5b. Sebago Lakes Chamber — homepage (defines town list)
**URL:** `https://www.sebagolakeschamber.com/`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "The Sebago Lakes Region Chamber of Commerce, representing the towns of Casco, Gray, Naples, New Gloucester, Raymond, Sebago, Standish and Windham is one of the most active chambers in the State of Maine. ... Tourism is one of the largest industries in our scenic region. We are the top vacation destination in Western Maine."

### 5c. Town of Gray official page on the Sebago Lakes Chamber (alt town list — adds Limerick + Limington)
**URL:** `https://www.graymaine.org/1210/Sebago-Lakes-Region-Chamber-of-Commerce`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "The Sebago Lakes Region Chamber of Commerce, representing the towns of Casco, Gray, Limerick, Limington, Naples, New Gloucester, Raymond, Sebago, Standish and Windham" — note this is a 10-town list, larger than the chamber's own homepage (5b) which lists 8 towns. Visit Maine's directory page (5d) gives 9 towns. **Author caveat: chamber-published town count varies (8/9/10) across pages; cite the homepage 8-town list as canonical and note the discrepancy.**

### 5d. Visit Maine directory — Sebago Lakes Region Chamber
**URL:** `https://visitmaine.com/organization/sebago-lakes-region-chamber-of-commerce/4224/`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "Our nine towns, bordering one of the state's most beautiful lakes, form a vibrant region..." (lists 9 towns — author caveat same as 5c).

### 5e. Maine Lakes & Mountains tourism region (closest MOT region to "Sebago Lakes Region")
**URL:** `https://mainelakesandmountains.com/places/sebago-lakes/`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "The lakes and ponds of the Sebago Lake area are a welcome recreation destination for visitors of all ages, offering swimming, boating, fishing, camping, and great spots for family gatherings. Boaters can launch at Sebago Lake State Park or opt for private marinas."

### 5f. Visit Maine — Sebago Lake & Sebago Lake State Park
**URL:** `https://visitmaine.com/articles/sebago-lake-sebago-lake-state-park/`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "For people in southern Maine—and particularly, folks around Portland—Sebago Lake is a vast, summer playground. The lake, the second largest in Maine at 45 square miles, is broad, clear and deep (more than 300 feet in spots). Bracketed by coves and forested inlets, Sebago can host squadrons of boats without feeling overrun."

### 5g. Maine Office of Tourism — 2025 Economic Impact & Visitor Tracking Report (regional shares)
**URL:** `https://motpartners.com/wp-content/uploads/2026/04/MOT-2025-Visitor-Tracking-Economic-Impact-Report.pdf`
**Access date:** 2026-07-08.
**Fact pull (verbatim, 2025 statewide + Greater Portland & Casco Bay + Maine Lakes & Mountains):**
- **Total Maine visitors (2025): 14.15 million** (-4.4% YoY from 2024's ~14.8M).
- **Total direct visitor spending (2025): $9.37 billion** (+1.4% YoY).
- **Total economic impact (2025): $16.56 billion** (+1.2% YoY).
- **Spend per visitor per trip (2025): $662** (+6.1% YoY).
- **Visitors who flew to Maine (2025): 20%** (up from 18% in 2024, 12% in 2020).
- **Visitor survey quotas for the "Greater Portland & Casco Bay" MOT region:** 125 winter + 325 summer + 200 fall = 650 interviews in 2025 (down slightly from 2024's 650). **For the "Maine Lakes & Mountains" MOT region** (which contains the Sebago Lakes area): 125 winter + 100 summer + 100 fall = 325 interviews in 2025.
- **Top origin DMA (2025):** Boston 17.6%; **Portland-Auburn 12.5%**; New York 8.4%; Bangor 6.1%; Hartford-New Haven 3.5%; Burlington-Plattsburgh 2.8%; Philadelphia 2.7%; Providence-New Bedford 2.7%; Washington DC-Hagerstown 2.5%; New Brunswick CAN 1.7%; Springfield-Holyoke 1.5%.
- **Regional visitation share (% of Maine visitors who visited each region, multiple-response allowed):**
  - Greater Portland & Casco Bay: **37% (2025)**, 36% (2024).
  - The Maine Beaches: 36% (2025), 37% (2024).
  - Midcoast & Islands: 33% (2025), 33% (2024).
  - Downeast & Acadia: 27% (2025), 26% (2024).
  - **Maine Lakes & Mountains (Sebago corridor): 20% (2025), 16% (2024).**
  - The Maine Highlands: 17% (2025), 15% (2024).
  - Kennebec Valley: 13% (2025), 10% (2024).
  - Aroostook County: 6% (2025), 4% (2024).
  - "No other regions": 45% (2025), 50% (2024).
- **Trip-experience highlights (2025):** "Higher room rates, stable overnight demand, and resilient per-visitor spending sustained overall economic contribution." Average Daily Room Rate $200.13 (+6.3% YoY); annual occupancy 50.3% (-6.9%); Taxable lodging sales +1.8%.
- **Tourism-supported jobs (2025):** 73,100 direct + 35,700 indirect = 108,800 total; $5.23B in wages; $1.26B state & local taxes; each 130 visitors supports 1 Maine job.
- **Lodging supply:** "Moderate Contraction in Lodging Supply: A reduction in available accommodation units, primarily within the vacation rental market, constrained potential room night growth during peak seasons."
- Report covers period **December 2024 – November 2025**; published April 2026; methodology: 4,684 visitor interviews (online + in-person at attractions/parks/hotels/visitor centers/etc.) + IMPLAN economic modeling.

### 5h. Maine State Parks attendance record (Sebago Lake State Park context)
**URL:** `https://content.govdelivery.com/accounts/MEDACF/bulletins/228e03c`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** "Maine State Parks attracted a record 2,997,931 [million] visitors in 2018" (per the 2018 campground-reservation announcement). The Sebago Lake State Park campground map is at `https://www.maine.gov/dacf/parks/camping/pdf/Sebago.pdf` (250 sites referenced on chamber site 5a).

### 5i. Maine Lakes — "Valuing the Economic Benefits of Maine's Great Ponds in the 21st Century"
**URL:** `https://www.lakes.me/valuing-lakes`
**Access date:** 2026-07-08.
**Fact pull (verbatim):** University of Maine / Maine Lakes / Maine DEP study (April 2024, Dr. Adam Daigneault et al.). "The total net economic value of Maine's Lakes is estimated at $14.2 billion, with the largest contribution coming from lakefront properties, followed by recreation trips." "Maine's lakes are estimated to generate at least $2.1 billion/yr in direct sales and expenditures via paying for things like meals, gas, and lodging for lake visits, summer camp tuition, and lakefront home taxes and maintenance. Accounting for the indirect sales that these activities support results in a total of $3.0 billion/yr in direct and indirect sales." "Maine's lakefront homes have a cumulative value of more than $13.3 billion dollars." "There are 91 summer camps on Maine's lakes and ponds (approx. 73% of all youth camps in Maine), for which about 48,000 campers attend every year." Sebago Lake is Maine's 2nd-largest lake by surface area (45 sq mi per Visit Maine 5f) but this study aggregates all 6,000 Maine lakes/ponds.

---

## Editorial Notes & Cross-Reference Matrix for Author

| Editorial question | Best primary source | Caveat |
|---|---|---|
| "How many cannabis stores operate in Portland today?" | MDG Opt-In Tracker (`maine-opt-in-towns.json`) says "12+"; OCP open-data page; OCP licensee-search tool | The 2023-07-01 CSV says 34 LICENSE_NAMEs (more permissive — includes Pending Conditional); live count is lower. |
| "What's the Portland adult-use retail license fee?" | MDG Opt-In Tracker (cluster JSON) says $5,000 city fee | City Chapter 35 §35-17 defers to Chapter 15 fee schedule; the chapter-15 schedule PDF was not pulled this session. **Author should verify the $5,000 figure against the City of Portland Chapter 15 fee schedule before publishing.** |
| "Portland school-buffer distance for cannabis stores?" | Maine state law: 1,000 ft default (LD 1444 proposed drop to 300 ft) | Portland Chapter 35 has NO separate city-level school buffer — only a 100-ft dispensary-to-dispensary *dispersal* (§35-43(h)). |
| "Portland cannabis store operating hours?" | City Chapter 35 §35-43(a): 7:00 a.m. to 10:00 p.m. daily | Per Ord. 197-24/25, 5-19-2025 (the most recent amendment reflected in the canonical PDF). |
| "What about the 20-store cap?" | Repealed by Portland referendum 11-3-2020 per Chapter 35 §35-43(i); newscentermaine.com 2020 article | No longer in force. |
| "Cumberland County population + MHI?" | Census QuickFacts `cumberlandcountymaine/PST045225`: pop 317,222 (V2025), MHI $95,677 (ACS 2020-2024) | FRED series `MHIME23005A052NCEN` available for cross-check. |
| "Portland city population + MHI?" | Census QuickFacts `portlandcitymaine/PST045225`: pop 69,911 (V2025), MHI $79,540 (ACS 2020-2024) | ACS 1-year (data.census.gov profile): pop 68,408 (2020), MHI $82,059 (2024). Different vintage — flag for author. |
| "How many tourists visit the Sebago Lakes area?" | MOT 2025 report: "Maine Lakes & Mountains" region visited by 20% of Maine visitors (up from 16% in 2024); "Greater Portland & Casco Bay" region visited by 37% (up from 36%) | MOT does not publish Sebago-Lakes-Region-specific visitor counts. The Sebago Lakes Chamber site (5a) gives only qualitative descriptions and the Sebago Lake State Park has 250 campsites on 1,400 acres (5a) but no per-park visitor counts published at the URL accessed. |
| "Sebago Lakes Region towns?" | Sebago Lakes Chamber homepage (5b) lists 8: Casco, Gray, Naples, New Gloucester, Raymond, Sebago, Standish, Windham | The MDG `cluster-regions.json` cluster includes only 5 of those 8 (omits New Gloucester), plus Portland, South Portland, Westbrook, Scarborough, Freeport, and Casco — i.e. the MDG cluster is broader than the chamber's footprint and narrower than it in other ways. Flag this for the editorial author — the "Sebago Lakes" label in MDG ≠ the Chamber's "Sebago Lakes Region". |

**Session passdown items (carry-forward to next session if author needs more):**
- Pull City of Portland Chapter 15 fee schedule PDF (URL pattern: `content.civicplus.com/api/assets/me-portland/...` — find via Portland.gov) to confirm the $5,000 adult-use retail fee.
- Pull HP1056 / LD 1444 enrolled text from `legislature.maine.gov` to confirm whether the 1,000-ft → 300-ft school-buffer amendment actually passed (the OCP FAQ still cites 500 ft for medical dispensaries).
- Pull archive.org snapshot of the newscentermaine.com Portland cap-removal article (returned Access Denied on 2026-07-08 from this Hermes IP).
- Pull OCP applicant/licensee-search CSV via the `https://www11.maine.gov/dafs/ocp/open-data/adult-use/licensee-search` endpoint to dedupe current (2026) per-town Store counts (the canonical CSV URL pulled today is from 2023).