// ---------------------------------------------------------------------------
// Editorial corrections log — shared data + types.
//
// Source of truth for both:
//   - apps/maine-cannabis/src/pages/about/corrections.astro  (the HTML page)
//   - apps/maine-cannabis/src/pages/about/corrections/feed.xml.ts  (RSS feed)
//
// Adding a new entry: append a new object to CORRECTIONS. The HTML page
// and the RSS feed both pick it up at next build.
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'material' | 'minor';
export type Category =
  | 'regulation'
  | 'compliance'
  | 'city-guide'
  | 'operator-data'
  | 'cross-reference';

export interface VerifiedSource {
  label: string;
  url: string;
  note?: string;
}

export interface Correction {
  date: string;
  slug: string;
  title: string;
  severity: Severity;
  category: Category;
  what_was_wrong: string;
  what_is_correct: string;
  verified_via: VerifiedSource[];
  published_in: { name: string; href: string }[];
}

// ---------------------------------------------------------------------------
// Severity taxonomy (matches our internal editorial-grade definitions):
//   - critical: A material fact was wrong in a way that could mislead a
//     reader acting on the page (legal limits, statute attributions, vote
//     outcomes, operator license categories, fabricated citations). YMYL
//     impact.
//   - material: A fact was wrong but unlikely to drive an irreversible
//     reader decision (wrong phone number, wrong statute year, missing
//     primary-source hyperlink on a factually correct claim, regulator-
//     vs-regulator framing conflation).
//   - minor: A navigational, formatting, or cross-reference issue. No fact
//     in the body text was wrong; readers who followed links got there
//     eventually.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Topic taxonomy:
//   - regulation:  State statute, OCP rule, or legislative session-law
//                  attribution. (YMYL sensitive.)
//   - compliance:  Operator-facing compliance guide (insurance, testing,
//                  tracking, Metrc). (YMYL sensitive.)
//   - city-guide:  City or town guide (operator directory, opt-in status,
//                  municipal vote outcome).
//   - operator-data: Specific operator address, phone, hours, license type.
//   - cross-reference: A link or reference drift between two pages.
// ---------------------------------------------------------------------------

export const CORRECTIONS: Correction[] = [
  {
    date: "2026-07-27",
    slug: "maine-cannabis-delivery-license-framework",
    title: "Maine delivery guides — nonexistent courier license and GPS mandate removed",
    severity: "critical",
    category: "compliance",
    what_was_wrong:
      "Multiple guides said Maine required a separate OCP cannabis courier or delivery license, described a courier endorsement for dispensaries, asserted a state GPS-vehicle mandate, and presented courier as an OCP license category. The delivery business guide also included unsupported fee, timeline, financial, and service-area claims. Those statements could cause patients, consumers, and operators to rely on a licensing category that does not exist.",
    what_is_correct:
      "28-B M.R.S. §504(9) authorizes specified existing adult-use licensees—cannabis stores, tier 1 and tier 2 cultivation facilities, nursery cultivation facilities, and products manufacturing facilities—to deliver consumer orders within their license authority. Current 18-691 C.M.R. ch. 30 requires licensee-controlled ordering, trained and credentialed employees, age and identity checks, a sales delivery manifest, an enclosed locked vehicle area, insurance, a manufacturer-installed alarm, tracking-system closeout, and other controls; it does not create a standalone courier license or GPS mandate, and cannabis stores may not use a third-party delivery service. Medical delivery is governed separately by Title 22, chapter 558-C and authorized medical-program conduct, not a general courier license.",
    verified_via: [
      { label: "28-B M.R.S. §504(9)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec504.html" },
      { label: "18-691 C.M.R. ch. 30 (effective 2024-11-06)", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/18-691%20CMR%20Ch%2030%20Final.pdf" },
      { label: "OCP adult-use rules and statutes", url: "https://www.maine.gov/dafs/ocp/adult-use/rules-statutes" },
      { label: "Title 22, chapter 558-C", url: "https://legislature.maine.gov/statutes/22/title22ch558-Csec0.html" },
      { label: "OCP medical-use rules and statutes", url: "https://www.maine.gov/dafs/ocp/medical-use/rules-statutes" }
    ],
    published_in: [
      { name: "Maine cannabis delivery rules", href: "/guides/maine-cannabis-delivery-rules" },
      { name: "Cannabis delivery business guide", href: "/blog/maine-cannabis-delivery-business-guide-2026" },
      { name: "Medical patient delivery guide", href: "/blog/maine-medical-patient-delivery-services-2026" },
      { name: "Cannabis business FAQ", href: "/guides/faq" },
      { name: "Great Atlantic Puffin Company guide", href: "/guides/great-atlantic-puffin-company" },
      { name: "Landrace Cannabis Casco guide", href: "/guides/landrace-cannabis-casco" },
      { name: "420 Mules Bar Harbor guide", href: "/guides/420-mules-bar-harbor" },
      { name: "Newsletter archive", href: "/newsletter" },
      { name: "OCP license map", href: "/guides/maine-ocp-license-map" },
      { name: "Cannabis POS comparison", href: "/guides/maine-cannabis-pos-comparison" },
      { name: "Cannabis wholesale guide", href: "/guides/maine-cannabis-wholesale-guide" },
    ],
  },
  {
    date: "2026-07-27",
    slug: "maine-cannabis-waste-management-framework",
    title: "Cannabis waste guide — nonexistent handler license and obsolete retention rule removed",
    severity: "critical",
    category: "compliance",
    what_was_wrong:
      "The waste guide said every cannabis waste handler needed a Maine cannabis waste-handling license, presented a universal three-year retention period, treated every product-contact item as cannabis waste, and supplied disposal and hazardous-waste instructions without distinguishing OCP cannabis controls from DEP solid-, hazardous-, universal-, and wastewater rules.",
    what_is_correct:
      "Current 18-691 C.M.R. ch. 30 §4 requires nonhazardous cannabis waste leaving an establishment to be rendered unusable by grinding and mixing it to at least 50% non-cannabis waste by volume, unless OCP approves an alternate method in the facility plan. The rule contains limited trichome-free plant-material exceptions, requires sample collectors to return samples for wasting, and treats plant material as nonhazardous unless toxic, flammable, or listed under DEP Chapter 850. There is no general cannabis waste-handler license. DEP licensing depends on the waste stream and activity. Chapter 30's general business-record rule is the current tax year plus six preceding tax years unless another provision applies.",
    verified_via: [
      { label: "18-691 C.M.R. ch. 30 (effective 2024-11-06)", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/18-691%20CMR%20Ch%2030%20Final.pdf" },
      { label: "OCP adult-use rules and statutes", url: "https://www.maine.gov/dafs/ocp/adult-use/rules-statutes" },
      { label: "Maine DEP hazardous and universal waste program", url: "https://www.maine.gov/dep/waste/hazardouswaste/index.html", note: "Reports amended hazardous-waste rules effective 2026-07-07" },
      { label: "DEP cannabis-sector environmental guidance (archived)", url: "https://www.maine.gov/dep/sustainability/compost/archive/depcannabiswaste.pdf" }
    ],
    published_in: [
      { name: "Cannabis waste management guide", href: "/guides/maine-cannabis-waste-management" },
    ],
  },
  {
    date: "2026-07-27",
    slug: "maine-cannabis-zoning-local-authorization",
    title: "Cannabis zoning guide — §402 sequence and school buffer corrected",
    severity: "critical",
    category: "regulation",
    what_was_wrong:
      "The zoning guide attributed municipal opt-in and school siting to 28-B M.R.S. §301, blurred conditional licensure with local approval, and mixed unsupported nationwide-style zoning assumptions into Maine operator guidance. The sitewide FAQ separately put local authorization before OCP conditional licensure and described a 300-foot entrance-to-entrance school buffer.",
    what_is_correct:
      "28-B M.R.S. §402 controls local authorization within municipalities. OCP conditional licensure comes before a person may request local authorization; the applicant then obtains applicable municipal approvals before returning to OCP for active licensure. The statutory school buffer is 1,000 feet property line to property line, and a municipality may adopt a shorter distance only down to 500 feet. Medical establishments require a separate Title 22 and municipal analysis.",
    verified_via: [
      { label: "28-B M.R.S. §402", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec402.html" },
      { label: "OCP adult-use application process", url: "https://www.maine.gov/dafs/ocp/adult-use/application-process" },
      { label: "OCP municipal resources", url: "https://www.maine.gov/dafs/ocp/resources/municipal-resources" }
    ],
    published_in: [
      { name: "Maine cannabis zoning requirements", href: "/guides/maine-cannabis-zoning-requirements" },
      { name: "Maine cannabis FAQ", href: "/guides/faq" },
      { name: "Founder's roadmap", href: "/download/roadmap" },
    ],
  },
  {
    date: "2026-07-27",
    slug: "standish-dispensary-guide-adult-use-status",
    title: "Standish guide — false adult-use opt-in and operator-opportunity claims removed",
    severity: "critical",
    category: "city-guide",
    what_was_wrong:
      "The Standish guide said the town had opted in to cannabis retail, encouraged new adult-use operations and a regional delivery hub, and published unsupported rent, population-comparison, and competition claims. It did not distinguish Standish's municipal adult-use prohibition from the medical program or identify the selling program behind Lakewood Cannabis.",
    what_is_correct:
      "Standish Code §220-3(A)–(C) prohibits the listed adult-use retail marijuana establishments, including social clubs, stores, product manufacturing facilities, and testing facilities, while stating that the chapter is not intended to prohibit medical use. Lakewood Cannabis's official Standish page describes a medical cannabis store at 234 Northeast Road, and OCP's June 1, 2026 establishment file lists active Standish medical registration DSP184. Any delivery must be tied to the responsible authorized medical registrant or an adult-use licensee acting within Title 28-B; there is no standalone courier license.",
    verified_via: [
      { label: "Town of Standish Code §220-3(A)–(C)", url: "https://ecode360.com/32867669" },
      { label: "Lakewood Cannabis — Standish store", url: "https://lakewood-cannabis.com/standish-store/" },
      { label: "OCP medical-use establishment file — June 1, 2026", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Maine_Medical_Use_Establishments_2026_06_01.csv", note: "Active Standish registration DSP184" }
    ],
    published_in: [
      { name: "Standish dispensary guide", href: "/guides/standish-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-27",
    slug: "buxton-dispensary-guide-registry-reconciliation",
    title: "Buxton guide — unsupported hours, delivery area, and registry certainty corrected",
    severity: "material",
    category: "operator-data",
    what_was_wrong:
      "The Buxton guide published unsupported Hidden Greens hours, claimed a specific delivery area, treated Hidden Greens as the single state-confirmed Buxton medical operator, supplied estimated drive distances and nearest-store claims, and framed the town as an adult-use market opportunity without reconciling OCP's public registration data.",
    what_is_correct:
      "Hidden Greens's official page advertises a medical storefront at 370 Narragansett Trail and publishes (207) 298-9111, but no store hours or Buxton-specific delivery area. OCP's June 1, 2026 caregiver file lists one active Buxton retail-town row under The Corner Store and lists the active Caberski Industries/Hidden Greens caregiver registration with South Berwick as retail town. The guide now discloses that mismatch, directs readers to verify the responsible registration, and notes that OCP's June adult-use file has no Buxton row.",
    verified_via: [
      { label: "Hidden Greens — official Buxton location page", url: "https://hiddengreens.com/buxton/" },
      { label: "OCP medical-use applicant and registrant search", url: "https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search" },
      { label: "OCP adult-use applicant and licensee search", url: "https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search" },
      { label: "Town of Buxton Zoning Ordinance, Article 11", url: "https://www.buxton.me.us/uploads/art11.2025.pdf" }
    ],
    published_in: [
      { name: "Buxton dispensary guide", href: "/guides/buxton-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-16",
    slug: "maine-ocp-testing-rule-watch-2026",
    title: "Testing and edibles guides — proposed 2026 OCP rulemaking separated from current requirements",
    severity: "material",
    category: "regulation",
    what_was_wrong:
      "Several guides described a universal full testing panel for every adult-use product or edible and treated destruction as the automatic outcome of any failed test. The regulations guide also referred to unspecified 2026 testing updates as already effective. An intermediate correction then incorrectly described the edible concentrate-input testing exception as proposal-only even though P.L. 2025, ch. 764 made it effective April 19, 2026. Two consumer pages also continued to describe a universal contaminant panel for every finished edible. Those summaries did not correctly reconcile current statute, OCP's implementation guidance, product matrix, final form, prior input testing, and Chapter 40's analyte-specific retest and remediation pathways.",
    what_is_correct:
      "OCP's July 2026 Chapter 5 and Chapter 40 documents are proposals, not effective rules. Separately, 28-B M.R.S. § 605(4), as amended by P.L. 2025, ch. 764 effective April 19, 2026, already provides the edible concentrate-input testing exception when § 605's prior-testing, documentation, and tracking conditions are met, while preserving THC-potency, homogeneity, and cannabinoid-profile testing under § 602(1)(F). OCP's April 28, 2026 implementation guidance applies the exception effective immediately: qualifying finished edibles are not subject to additional mandatory contaminant testing, while THC-potency, cannabinoid-profile, and homogeneity testing remain mandatory. The draft Chapter 40 would incorporate that statutory exception and would add the higher-result labeling method for two passing potency-retest samples. Other current compliance details still follow the final Chapter 40 rule effective November 6, 2024, later controlling statutes, and OCP guidance until OCP adopts replacement text and publishes an effective date. Testing and failed-batch disposition depend on current statute, product matrix, input-testing history, failed analyte, and the applicable retest or remediation pathway.",
    verified_via: [
      { label: "P.L. 2025, ch. 764 (effective 2026-04-19)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1760&snum=131", note: "Session law amending 28-B M.R.S. § 605(4)" },
      { label: "28-B M.R.S. § 605(4)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec605.html" },
      { label: "28-B M.R.S. § 602(1)(F)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec602.html" },
      { label: "OCP April 2026 implementation guidance (PDF)", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/OCP%20Guidance%20for%20Mandatory%20Testing%20of%20Adult%20Use%20Edibles%20April%202026.pdf" },
      { label: "OCP rulemaking docket (proposed rules)", url: "https://www.maine.gov/dafs/ocp/adult-use/rules-statutes/rulemaking/proposed-rules" },
      { label: "Current 18-691 CMR Chapter 40 (effective 2024-11-06)", url: "https://www.maine.gov/dafs/ocp/adult-use/rules-statutes" }
    ],
    published_in: [
      { name: "Cannabis edibles compliance guide", href: "/guides/maine-cannabis-edibles-compliance" },
      { name: "Cannabis product testing guide", href: "/guides/maine-cannabis-product-testing-guide" },
      { name: "Best Edibles in Maine 2026", href: "/blog/best-maine-edibles-2026" },
      { name: "Cannabis edible dose calculator", href: "/guides/cannabis-edible-dose-calculator-maine" },
      { name: "How to read a Maine cannabis COA", href: "/guides/cannabis-coa-maine-how-to-read" },
      { name: "How to read a Maine cannabis COA for terpenes", href: "/blog/how-to-read-maine-cannabis-coa-terpenes-2026" },
      { name: "Cannabis cultivation guide", href: "/guides/maine-cannabis-cultivation-guide" },
      { name: "Cannabis waste management guide", href: "/guides/maine-cannabis-waste-management" },
      { name: "Maine cannabis regulations guide", href: "/guides/maine-cannabis-regulations" },
    ],
  },
  {
    date: "2026-07-05",
    slug: "maine-edible-dose-cap",
    title: "Maine edible dose cap — 5/100 corrected to 10/200",
    severity: "critical",
    category: "regulation",
    what_was_wrong:
      "Multiple Maine Dispensary Guide pages described the Maine adult-use cannabis edible dose cap as '5mg per serving / 100mg per package' and cited a 'medical program 250mg per package' ceiling. These claims were based on the pre-2023 statutory text of Title 28-B §703(1)(F).",
    what_is_correct:
      "Title 28-B §703(1)(F), as amended by PL 2023, c. 396, §19 (effective 2023), sets the Maine adult-use edible cannabis cap at 10mg THC per single serving and 200mg THC per package, with a 10% allowable variance (floor 0.6 mg, ceiling 5 mg). The Maine medical cannabis program (Title 22 ch. 558-C; 18-691 CMR ch. 2) is provider-discretion and does not impose the same statutory per-package edible cap as the adult-use program; the practical medical ceiling is operator-determined and documented on each product's COA.",
    verified_via: [
      { label: "28-B M.R.S. §703 (current statute text)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec703.html", note: "Section history shows PL 2023 c. 396 §19 amendment" },
      { label: "PL 2023, c. 396 session law", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1090&snum=131" }
    ],
    published_in: [
      { name: "Cannabis Microdosing for Anxiety — Maine Guide", href: "/guides/cannabis-microdosing-anxiety-maine" },
      { name: "Best Edibles in Maine 2026 (blog)", href: "/blog/best-maine-edibles-2026" },
      { name: "RSO in Maine 2026 (blog)", href: "/blog/maine-rso-guide" },
      { name: "Maine Dispensary Guide Consumer Hub", href: "/learn" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "wells-dispensary-guide",
    title: "Wells dispensary guide — opt-in status corrected",
    severity: "critical",
    category: "city-guide",
    what_was_wrong:
      "The Wells guide claimed 'Opt-In Status: YES — Since 2020' for adult-use retail, implied a combined medical and adult-use market with multiple dispensaries.",
    what_is_correct:
      "Per York County Star / Seacoast Online reporting on the June 10, 2025 vote, Wells voters REJECTED Article 17 (adult-use retail) at the polls. Wells is medical-only.",
    verified_via: [
      { label: "York County Star / Seacoast Online (June 2025 election coverage)", url: "https://www.seacoastonline.com/", note: "Article 17 vote coverage from June 10, 2025" },
      { label: "Town of Wells clerk records", url: "https://www.wellstown.org/", note: "May/June 2025 warrant article confirmation" }
    ],
    published_in: [
      { name: "Wells dispensary guide", href: "/guides/wells-dispensary-guide" },
      { name: "Opt-In Tracker — Wells row", href: "/guides/maine-cannabis-opt-in-tracker" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "houlton-dispensary-guide",
    title: "Houlton dispensary guide — operator addresses and license types corrected",
    severity: "material",
    category: "operator-data",
    what_was_wrong:
      "Lifted Cannabis Maine was listed as '78 North St' / '(207) 532-4444' / 'adult-use product line'. Vargas Farm was listed as '35 Military St' / '(207) 532-7000' / medical + adult-use.",
    what_is_correct:
      "Per liftedmaine.com/about, Lifted is at 32 Access Road, Houlton, ME 04730, phone (207) 554-6420, open 8am-6pm daily. Medical Card Required — adult-use not offered. Vargas Farm is at 28 Airport Dr, (207) 405-5256, medical-only.",
    verified_via: [
      { label: "Lifted Cannabis Maine — About page", url: "https://liftedmaine.com/about", note: "Operator's own site, primary source for address/hours/license type" },
      { label: "Vargas Farm Alignable listing", url: "https://www.alignable.com/" },
      { label: "Vargas Farm Facebook page", url: "https://www.facebook.com/" }
    ],
    published_in: [
      { name: "Houlton dispensary guide", href: "/guides/houlton-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "presque-isle-dispensary-guide",
    title: "Presque Isle dispensary guide — operator data corrected; Caribou cross-link fixed",
    severity: "material",
    category: "operator-data",
    what_was_wrong:
      "Full Bloom was '483 Main St / (207) 762-5555'. Royal Leaf was '415 Main St / (207) 762-1000 / Mon-Sat 10am-7pm / Recreational and Medical'. Related Guides link claimed 'Caribou — 5 dispensaries' (drift from session 1).",
    what_is_correct:
      "Full Bloom is at 445 Main St, Presque Isle, ME 04769, (207) 760-7586, hours M-Th 8am-9pm F-Sat 8am-10pm Sun 9am-7pm. Royal Leaf is Adult-Use Only at (207) 561-7667, hours 7am-10pm 365 days. Richardson Remedies address: Bog Road, no house number publicly listed — Caribou is medical-only after September 2024 retail ban. Caribou cross-link is corrected to medical-only with 2 dispensaries.",
    verified_via: [
      { label: "Full Bloom Cannabis (operator site)", url: "https://fullbloomcannabis.com/" },
      { label: "Royal Leaf Pot (operator site)", url: "https://royalleafpot.com/" },
      { label: "The County newspaper (Sept 2024 Caribou retail-ban coverage)", url: "https://thecounty.me/" }
    ],
    published_in: [
      { name: "Presque Isle dispensary guide", href: "/guides/presque-isle-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "windham-dispensary-guide",
    title: "Windham dispensary guide — operator data corrected",
    severity: "material",
    category: "operator-data",
    what_was_wrong:
      "Operator addresses, phones, hours, and license types for Maine's Alternative Caring, JAR Cannabis Co., and Alternative Essence were either missing or unsourced.",
    what_is_correct:
      "Maine's Alternative Caring: 771 Roosevelt Trail, Windham, ME 04062, (207) 572-1603, Mon-Thu 8am-8pm Fri-Sat 9am-9pm Sun 9am-8pm, medical-only (per operator site). JAR: medical at 9 Storm Dr (207) 893-8607 + adult-use at 11 Storm Dr (207) 572-1140, both 8am-8pm. Alternative Essence: 839 Roosevelt Trail, (207) 204-9665, medical at Windham location.",
    verified_via: [
      { label: "Maine's Alternative Caring — Contact page", url: "https://mainesalternativecaring.com/contact" },
      { label: "JAR Cannabis homepage", url: "https://jarcannabis.com/" },
      { label: "Alternative Essence — Windham page", url: "https://altessence.com/" }
    ],
    published_in: [
      { name: "Windham dispensary guide", href: "/guides/windham-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "maine-cannabis-edibles-compliance",
    title: "Edibles compliance guide — statute citation corrected",
    severity: "critical",
    category: "compliance",
    what_was_wrong:
      "The page incorrectly cited 100mg per-package THC cap (actual 200mg), 15% potency variance (actual 10%), and 'LD 1713' / 'PL 2025 c. 390' as the variance authority.",
    what_is_correct:
      "Title 28-B §703(1)(F) caps edibles at 10mg per serving AND 200mg per package (cumulatively). Variance is 10%, not 15%. The variance authority is HP 1367 ≡ LD 1846 (130th Legislature, 2022), codified as PL 2021 c. 558 — NOT LD 1713 and NOT PL 2025 c. 390.",
    verified_via: [
      { label: "28-B M.R.S. §703 (current statute text)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec703.html" },
      { label: "LD 1846 / HP 1367 bill record (130th Legislature)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1846&snum=130", note: "Codified as PL 2021 c. 558" }
    ],
    published_in: [
      { name: "Edibles compliance guide", href: "/guides/maine-cannabis-edibles-compliance" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "caribou-dispensary-guide",
    title: "Caribou dispensary guide — dispensary count corrected",
    severity: "critical",
    category: "city-guide",
    what_was_wrong:
      "The guide claimed '5 adult-use dispensaries' for Caribou.",
    what_is_correct:
      "Caribou is medical-only after the September 2024 retail ban. 2 medical dispensaries remain. The County newspaper archives capture the vote.",
    verified_via: [
      { label: "The County newspaper (Sept 2024 retail-ban coverage)", url: "https://thecounty.me/" },
      { label: "Maine OCP licensee map", url: "https://www.maine.gov/dafs/ocp/adult-use/licensing/licensee-map" }
    ],
    published_in: [
      { name: "Caribou dispensary guide", href: "/guides/caribou-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "maine-metrc-compliance-guide",
    title: "Metrc compliance guide — bill session year corrected",
    severity: "material",
    category: "regulation",
    what_was_wrong:
      "LD 1847 was referenced with '2026' session attribution for the medical Metrc extension proposal.",
    what_is_correct:
      "LD 1847 is the 131st Legislature (2023-24) bill 'An Act to Institute Testing and Tracking of Medical Use Cannabis and Cannabis Products Similar to Adult Use Cannabis and Cannabis Products.' It is NOT a 2026 bill.",
    verified_via: [
      { label: "LD 1847 bill record (131st Legislature)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1847&snum=131" }
    ],
    published_in: [
      { name: "Metrc compliance guide", href: "/guides/maine-metrc-compliance-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "maine-cannabis-business-insurance",
    title: "Insurance page — Surety Bond vs Insurance callout corrected",
    severity: "material",
    category: "compliance",
    what_was_wrong:
      "Callout stated 'OCP does not require general insurance but does enforce surety bond requirements'.",
    what_is_correct:
      "Maine OCP licensing rule requires proof of financial capacity — typically demonstrated by the surety bond OR cash/line of credit. Insurance IS required for the licensed operation generally (commercial general liability per local ordinance; workers comp per Maine employment law). The two are different regulatory concepts and not interchangeable.",
    verified_via: [
      { label: "28-B M.R.S. §703-A (proof of financial capacity)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec703-A.html" },
      { label: "Maine Bureau of Insurance bulletin on cannabis operations", url: "https://www.maine.gov/pfr/insurance/" },
      { label: "26 M.R.S. §813 (workers compensation)", url: "https://legislature.maine.gov/statutes/26/title26sec813.html" }
    ],
    published_in: [
      { name: "Business insurance guide", href: "/guides/maine-cannabis-business-insurance" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "maine-cannabis-vertical-integration",
    title: "Vertical integration guide — uncited bill citations given session references",
    severity: "material",
    category: "regulation",
    what_was_wrong:
      "Bare 'LD 104' and 'LD 1847' references without session/year attribution, making them unverifiable.",
    what_is_correct:
      "LD 104 (132nd Legislature, 2025-26) = 'An Act to Protect the Health of Medical Cannabis Patients and Streamline the Mandatory Testing of Cannabis.' LD 1847 (131st Legislature, 2023-24) = 'An Act to Institute Testing and Tracking of Medical Use Cannabis.' Both verified through legislature.maine.gov. Each citation now links to its bill record.",
    verified_via: [
      { label: "LD 104 bill record (132nd Legislature)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=104&snum=132" },
      { label: "LD 1847 bill record (131st Legislature)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1847&snum=131" }
    ],
    published_in: [
      { name: "Vertical integration guide", href: "/guides/maine-cannabis-vertical-integration" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "milo-dexter-dispensary-guides",
    title: "Milo & Dexter guides — stale cross-reference to Dover-Foxcroft corrected",
    severity: "minor",
    category: "cross-reference",
    what_was_wrong:
      "Both Milo and Dexter guides referenced 'Dab Bar operating since 2020' for Dover-Foxcroft, despite the Dover-Foxcroft guide itself retracting that claim (operator domain parked).",
    what_is_correct:
      "Cross-references now link to the Dover-Foxcroft guide, which says the dispensary count is currently 'uncertain' per recent spot-checking.",
    verified_via: [
      { label: "Dover-Foxcroft dispensary guide (internal status note)", url: "/guides/dover-foxcroft-dispensary-guide" }
    ],
    published_in: [
      { name: "Milo dispensary guide", href: "/guides/milo-dispensary-guide" },
      { name: "Dexter dispensary guide", href: "/guides/dexter-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "indoor-cannabis-grow-setup-maine-cost-2026",
    title: "Indoor grow blog post — LD 555 misattributed as 'the adult-use cannabis act'",
    severity: "material",
    category: "regulation",
    what_was_wrong:
      "Post stated 'Maine Title 28-B (LD 555, adult-use cannabis) governs personal home cultivation' — conflating the 2023 home-cultivation amendment with the foundational adult-use act itself.",
    what_is_correct:
      "Title 28-B is the codification of the 2016 Question 1 ballot initiative (the Cannabis Legalization Act), implemented via P.L. 2017 c. 409. LD 555 (131st Legislature, 2023, P.L. 2023 c. 220) is the specific amendment that raised the mature home-cultivation plant cap from 3 to 6 by amending Title 28-B §1501-1502. The LD 555 bill is correctly described as 'An Act to Increase the Number of Mature Plants Allowed for the Home Cultivation of Cannabis.' Same post also cited LD 799 (2017) without session attribution — that bill is 128th Legislature, P.L. 2017 c. 5.",
    verified_via: [
      { label: "LD 555 bill record (131st Legislature)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=555&snum=131" },
      { label: "LD 799 bill record (128th Legislature)", url: "https://legislature.maine.gov/legis/bills/bills_128th/billtexts/HP057901.asp" },
      { label: "OCP enacted-legislation memo (131st Legislature)", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Memoranda%20Enacted%20Cannabis-related%20Legislation%20%E2%80%93%20First%20Regular%20and%20Special%20Sessions%20of%20the%20131st%20Legislature.pdf" }
    ],
    published_in: [
      { name: "Indoor cannabis grow setup guide", href: "/blog/indoor-cannabis-grow-setup-maine-cost-2026" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "maine-cannabis-gray-market-ocp-enforcement-2026",
    title: "Gray-market enforcement blog post — fabricated LD 1995 caregiver citation",
    severity: "critical",
    category: "regulation",
    what_was_wrong:
      "FAQ answer claimed 'The 2024 legislation (LD 1995) modestly tightened the [caregiver] framework' — citing a bill number that does not exist as a cannabis caregiver bill.",
    what_is_correct:
      "LD 1995 (131st Legislature, SP 820) is 'An Act to Bolster Maine's Workforce and Economy by Increasing Assistance for Parents Pursuing Education and Employment and by Indexing Unemployment Benefits to the Unemployment Rate' — a workforce/UI-benefits bill that was reported Ought Not to Pass on January 30, 2024 and never enacted. It has no cannabis content. The actual 2023-24 caregiver framework tightening was P.L. 2023 c. 365 ('An Act to Sustain the Medical Use of Cannabis Program,' 131st) plus the broader P.L. 2023 c. 679 (LD 40, 'An Act to Protect Liberty and Advance Justice in the Administration and Enforcement of the Cannabis Legalization Act and the Maine Medical Use of Cannabis Act').",
    verified_via: [
      { label: "LD 1995 bill record (131st Legislature, ONTP)", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1995&snum=131" },
      { label: "P.L. 2023 c. 365 — caregiver program sustain act", url: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=240&snum=131" },
      { label: "OCP enacted-legislation memo (2nd Reg Session, 131st)", url: "https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Enacted%20Cannabis-related%20Legislation%20Memo%20%E2%80%93%202nd%20Regular%20Session%20of%20the%20131st%20Legislature.pdf" }
    ],
    published_in: [
      { name: "Maine cannabis gray-market enforcement analysis", href: "/blog/maine-cannabis-gray-market-ocp-enforcement-2026" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "bridgton-denmark-limerick-dispensary-guides",
    title: "Town guides — three 'since YYYY' operator claims cited without primary source",
    severity: "minor",
    category: "city-guide",
    what_was_wrong:
      "Three town guides cited operator-founding dates and ordinance-effective dates without primary-source attribution: Bridgton ('Canuvo, established in Maine since 2011'), Denmark ('Prohibited by ordinance since 2017'), Limerick ('Founding Farmers has operated at 16 Main Street since 2021').",
    what_is_correct:
      "Each claim is factually correct per primary sources, but the citations themselves weren't linked. Bridgton Canuvo: canuvo.org/about-us confirms Glenn Peterson founded the company in 2011 as one of Maine's eight original medical-license holders. Denmark: ordinance PDF at denmarkmaine.org confirms adoption date March 28, 2017. Limerick: ffmaine.com About page states 'Founded in 2021.' All three are now hyperlinked inline.",
    verified_via: [
      { label: "Canuvo — About Us", url: "https://canuvo.org/about-us", note: "Confirms 2011 founding by Glenn Peterson" },
      { label: "Town of Denmark ordinance PDF (adopted 2017-03-28)", url: "https://denmarkmaine.org/" },
      { label: "Founding Farmers Maine — About page", url: "https://ffmaine.com/", note: "Confirms 2021 founding" }
    ],
    published_in: [
      { name: "Bridgton dispensary guide", href: "/guides/bridgton-dispensary-guide" },
      { name: "Denmark dispensary guide", href: "/guides/denmark-dispensary-guide" },
      { name: "Limerick dispensary guide", href: "/guides/limerick-dispensary-guide" },
    ],
  },
  {
    date: "2026-07-04",
    slug: "naples-norway-lovell-waterford-dispensary-guides",
    title: "Four 'Unclear' town guides — speculative opt-in hedging replaced with primary-source framing",
    severity: "material",
    category: "city-guide",
    what_was_wrong:
      "Four town guides (Naples, Norway, Lovell, Waterford) used speculative hedging language ('Likely opted in', 'probably not opted in', 'Unclear') to describe their municipal opt-in status. None of the four appears on either the MDG Opt-In Tracker's 35-town opt-in list or its 10-town opted-out list as of April 2026. The speculative framing invited an auditor to ask 'on what basis?' — and the answer was 'we guessed.' Additionally, the Naples guide carried a 'Naples Opportunity' section framed for B2B operators on what is otherwise a B2C consumer-facing guide, and a 'Naples Town Context for Operators' H2 that emphasized operator-location viability rather than resident information.",
    what_is_correct:
      "All four guides now use the unified factual framing: 'Not documented — absent from MDG Opt-In Tracker (April 2026).' The body text points readers to the OCP municipal authorization list as the definitive source, links directly to the OCP opt-in notification form (maine.gov/dafs/ocp), and cites Title 28-B §201 as the statutory basis for the opt-in requirement. Naples' 'Opportunity' section was replaced with a consumer-facing 'Where Naples Residents Currently Access Cannabis' section. The 'Naples Town Context for Operators' H2 was renamed to 'Naples Town Context' and the operator-opportunity framing was stripped while preserving the demographic data.",
    verified_via: [
      { label: "MDG Opt-In Tracker (35 opted-in + 10 opted-out, April 2026)", url: "/guides/maine-cannabis-opt-in-tracker" },
      { label: "28-B M.R.S. §201 (opt-in statutory basis)", url: "https://legislature.maine.gov/statutes/28-B/title28-Bsec201.html" },
      { label: "OCP municipal opt-in notification form", url: "https://www.maine.gov/dafs/ocp/" }
    ],
    published_in: [
      { name: "Naples dispensary guide", href: "/guides/naples-dispensary-guide" },
      { name: "Norway dispensary guide", href: "/guides/norway-dispensary-guide" },
      { name: "Lovell dispensary guide", href: "/guides/lovell-dispensary-guide" },
      { name: "Waterford dispensary guide", href: "/guides/waterford-dispensary-guide" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Display metadata — used by the HTML page's severity/category chips.
// Exported so a future XML/JSON feed can render them too.
// ---------------------------------------------------------------------------
export const SEVERITY_META: Record<
  Severity,
  { label: string; tone: string; description: string }
> = {
  critical: {
    label: 'Critical',
    tone: 'severity-critical',
    description: 'A material fact was wrong in a way that could mislead a reader acting on the page. YMYL impact.'
  },
  material: {
    label: 'Material',
    tone: 'severity-material',
    description: 'A fact was wrong but unlikely to drive an irreversible reader decision.'
  },
  minor: {
    label: 'Minor',
    tone: 'severity-minor',
    description: 'A navigational, formatting, or cross-reference issue. No fact in the body text was wrong.'
  }
};

export const CATEGORY_META: Record<
  Category,
  { label: string; tone: string }
> = {
  regulation: { label: 'Regulation / Statute', tone: 'cat-regulation' },
  compliance: { label: 'Compliance Guide', tone: 'cat-compliance' },
  'city-guide': { label: 'City Guide', tone: 'cat-city' },
  'operator-data': { label: 'Operator Data', tone: 'cat-operator' },
  'cross-reference': { label: 'Cross-reference', tone: 'cat-xref' }
};

// ---------------------------------------------------------------------------
// Derived counts (used by hero strip on the HTML page).
// ---------------------------------------------------------------------------
export function getCorrectionCounts(corrections: Correction[] = CORRECTIONS) {
  return corrections.reduce(
    (acc, c) => {
      acc.severity[c.severity]++;
      acc.category[c.category]++;
      return acc;
    },
    {
      severity: { critical: 0, material: 0, minor: 0 },
      category: { regulation: 0, compliance: 0, 'city-guide': 0, 'operator-data': 0, 'cross-reference': 0 }
    }
  );
}

// ---------------------------------------------------------------------------
// Latest entry date (newest first) — drives the "How to use this page"
// reader cutoff. Kept here so the .astro and the RSS feed share one
// source of truth.
// ---------------------------------------------------------------------------
export const LATEST_CORRECTION_DATE = CORRECTIONS[0]?.date ?? '';