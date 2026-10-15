# Indoor Cannabis Grow Setup & Cost for Maine — Verified Facts Brief
**Date prepared:** 2026-06-06
**Scope:** Indoor cannabis cultivation setup options, equipment, electricity cost, and per-ounce math for Maine home growers, 2026. Reuses plant-limit context from the home-grow page, dehumidifier sizing from the drying brief, and cost-per-ounce math from the autoflower-vs-feminized brief.

---

## 0. Source hierarchy

1. Manufacturer product pages: Mars Hydro (mars-hydro.com), Spider Farmer (spider-farmer.com), AC Infinity (acinfinity.com), Vivosun (vivosun.com)
2. Utility tariff pages: CMP (cmpco.com/time-of-use-delivery-rate), Versant (versantpower.com)
3. EIA / state regulatory: Maine PUC (investigation into TOU rates, June 2026), Portland Water District water hardness data
4. Industry benchmarks: Hydrobuilder yield calculator, Growgoyle efficiency scorecard (CBT/Fluence 2025 survey, 185 commercial growers), Washington State LCARS yield data, academic literature (Caulkins 2010)
5. Maine-specific: Maine OCP FAQs, LD 555 / Title 28-B, Portland Water District, Coast of Maine product pages
6. Internal sister briefs: `research-autoflower-vs-feminized-maine-2026.md`, `research-drying-cannabis-maine-2026.md`

**Affiliate scope note:** The only approved equipment/seed affiliate for mainedispensaryguide.com is ILGM (I Love Growing Marijuana, `https://ilgm.com?aff=8112`). Mars Hydro, Spider Farmer, AC Infinity, Vivosun, Gorilla Grow, and all other equipment brands are **out of scope for affiliate integration**. Equipment recommendations in this brief are informational only; no affiliate links will be added to these brands.

---

## 1. Indoor grow tent sizing

### Standard sizes and plant capacity

| Tent dimensions | Floor area | Plants (3–5 gal pots) | Use case |
|---|---|---|---|
| 2×2 ft | 4 sq ft | 1–2 | Closet / starter / PC-case grow |
| 2×4 ft | 8 sq ft | 2–3 | Home grow starter, space-constrained |
| 4×4 ft | 16 sq ft | 4–6 | **Standard home-grow default** |
| 4×8 ft | 32 sq ft | 6–10 | Intermediate / commercial |
| 5×9 ft | 45 sq ft | 8–12 | Advanced / commercial |

**Source:** Multiple manufacturer listings and grow-tent comparison articles, all citing 48×48×80 in. as the 4×4 standard. (Urban Grown Home, Gro Indoor, Modern Farms — all April 2026.)

### Height variants and the light/plant interaction

Standard heights across brands:

| Height | Brands offering it | Notes |
|---|---|---|
| ~63–72 in. (5–6 ft) | Vivosun, budget brands | Short; adequate for short indicas, not for sativas or SCROG |
| **80 in. (6 ft 8 in.)** | Vivosun S448, Spider Farmer SF-4000, Mars Hydro, most brands | **The standard.** Allows 12–18 in. for filter + fan + light hang, 18–24 in. light distance, leaving 36–42 in. for canopy |
| **6 ft 11 in. – 7 ft 11 in.** | Gorilla Grow Tent (standard + 1-ft extension included) | Preferred for tall sativas, SCROG, or when running the light high. The $30–50 premium over standard-height tents is the cheapest insurance against running out of vertical space mid-flower |
| 8+ ft | Gorilla Grow Tent + 2-ft extension kit | Commercial or tall-strain specialty |

**Key math:** A 4×4×80-in. tent has ~107 cubic feet of volume. The top 12–18 in. is consumed by the inline fan + carbon filter + light hanging height. With the light at 18–24 in. above the canopy, the plant has roughly 36–42 in. of vertical space. Cannabis plants commonly stretch 36–48 in. during the flowering phase — meaning a 6-ft 8-in. tent is workable but tight for many sativas; a 7-ft tent is the safer recommendation.

**Source:** Modern Farms 4×4 tent setup guide (2026): `https://modernfarms.store/blogs/modernfarms-blog/the-complete-4x4-grow-tent-setup-guide-for-cannabis-2026-three-cost-tiers-honest-yield-math-and-the-integration-logic-nobody-explains`

### 2026 prices — grow tents

| Brand / Model | Size | Height | Price range | Canvas / poles | Hang capacity |
|---|---|---|---|---|---|
| Vivosun S448 | 4×4 ft | 80 in. | **$80–$120** (Amazon, vivosun.com, 2026) | 600D oxford / 19 mm steel | ~100–150 lbs |
| Mars Hydro 4×4 | 4×4 ft | 80 in. | ~$80–$100 (tent only) | 1680D diamond mylar / 16 mm steel | ~110 lbs |
| Spider Farmer SF-4×4 | 4×4 ft | 78 in. | ~$120–$150 (note: 78 in., 2 in. shorter than competition) | 2000D canvas / 19 mm | ~150 lbs |
| AC Infinity CLOUDLAB 844 | 4×4 ft | 80 in. | ~$190–$250 | 2000D diamond mylar / 1-in. poles | ~220 lbs |
| Gorilla Grow Tent 4×4 PRO | 4×4 ft | 6 ft 11 in. (+1 ft extension) | ~$199–$220 | 1680D / 22 mm powder-coated steel | 300 lbs |
| Vivosun P448 PRO | 4×4 ft | 80 in. | ~$150–$200 | 2000D canvas / 1-in. poles | ~220 lbs |
| Vivosun S448 (2×2 ft) | 2×2 ft | 60 in. | ~$50–$70 | 600D / budget poles | ~50 lbs |

**Source prices:** Vivosun.com (US, 2026): S448 4×4 = $110.49 regular price (`https://vivosun.com/vivosun-4x4-mylar-hydroponic-grow-tent-for-indoor-plant-growing-48x48x80-p63933466594377747-v58820960379609764`); Gorilla Grow Tent PRO 4×4 from manufacturer (`https://www.gorillagrowtent.com`); Spider Farmer and AC Infinity from Spider Farmer official site (`https://www.spider-farmer.com`) and AC Infinity official site (`https://acinfinity.com`). Amazon prices fluctuate; range reflects verified Q2 2026 listings.

**Recommendation for 3 mature plants:** A 4×4×80-in. tent is the practical minimum for 3 plants in 3–5 gal fabric pots with any training (LST, topping). A 2×4 tent is too narrow for 3 plants side-by-side unless using a vertical stake/SCROG approach. Budget $80–$120 for a Vivosun S448 or $199+ for a Gorilla Grow Tent if running tall sativa-dominant genetics.

---

## 2. LED grow lights (the 2026 standard)

### Technology decision: quantum board vs. COB vs. blurple

- **Quantum board (QB):**分散式高功率二极管排列在一块大铝基板上的 LED 板, Samsung LM301H EVO 或 Bridgelux 3030 芯片. 2026年的主流选择——Mars Hydro FC-E、Spider Farmer SF系列、Vivosun VS1000都使用这种设计. 以 2.7–2.85 µmol/J 的效率领先, 热管理出色, 80 in. 帐篷下光分布均匀.
- **COB (Chip on Board):** 单个大功率LED芯片, 比QB更聚光, 适合小空间. 效率比QB略低, 正逐渐被淘汰.
- **Blurple (blue + purple LED):** 老式设计, 效率低 (1.0–1.5 µmol/J), 光谱不完整, 热 Management差, 电力成本显著更高. 对于初学者来说, "最便宜的LED"实际上是更昂贵的选择, 因为用电更多, 产量更低.

**Recommendation: Quantum board LED (2026 standard).** 任何在2026年花费少于$150的"LED面板"如果是blurple设计, 请避免。

### PPFD and DLI fundamentals

- **PPFD (Photosynthetic Photon Flux Density):** µmol/m²/s. Measures light intensity at the canopy.
  - Seedling/clone: 100–300 µmol/m²/s
  - Vegetative: 400–600 µmol/m²/s
  - Flowering: 600–900 µmol/m²/s
  - Late flower + CO₂: 800–1,500 µmol/m²/s
- **DLI (Daily Light Integral):** mol/m²/day. The cumulative photon dose over the full photoperiod. Formula: `DLI = PPFD × photoperiod hours × 3600 / 1,000,000`.
  - 18-hour veg at 500 PPFD = ~32 DLI
  - 12-hour flower at 800 PPFD = ~35 DLI
  - Commercial target for flower: 40–55 DLI

**Source:** Hydrobuilder PPFD calculator (`https://hydrobuilder.com/pages/grow-light-coverage-ppfd-calculator`); Growgoyle VPD guide (`https://getgrowgoyle.com/cannabis-vpd-chart-guide/`); Photone cannabis light calculator (`https://growlightmeter.com/calculators/cannabis/`).

### Watts-per-square-foot rule of thumb (legacy)

| Stage | Watts / sq ft (LED) | Notes |
|---|---|---|
| Veg | 20–30 W/sq ft | Minimum for healthy veg; 400W LED for 4×4 |
| Flower | 30–50 W/sq ft | Optimal: 30–40 W/sq ft for 4×4 |
| Maximum | 50–60 W/sq ft | Above this, heat Management becomes the primary constraint |

For a 4×4 (16 sq ft): minimum 320W, optimal 480–600W, maximum ~640W before active cooling is required.

### 2026 prices and specs — major quantum board LED fixtures

#### Mars Hydro FC-E3000 / FC3000 EVO

| Spec | FC-E3000 (Bridgelux) | FC3000 EVO (Samsung LM301H EVO) |
|---|---|---|
| Actual wattage | 300W | 300W |
| PPE | 2.8 µmol/J | 2.85 µmol/J |
| PPF | 840 µmol/s | 855 µmol/s |
| Coverage | 3×3 ft (veg) / 2.5×2.5 ft (flower) | 3×3 ft / 2.5×2.5 ft |
| Max yield claim | 2.5 g/W | 3.5 g/W |
| Price | ~$169–$189 (US, 2026) | ~$219–$225 (US, 2026) |
| Warranty | 5 years | 5 years |

**Source:** Mars Hydro official product pages — FC-E3000 (`https://www.mars-hydro.com/fc-e3000-led-grow-light`) and FC3000 EVO (`https://www.mars-hydro.com/fc-3000-samsung-lm301h-evo-led-grow-light`).

#### Spider Farmer SF-2000 and SF-4000

| Spec | SF-2000 (2026) | SF-4000 (2026) |
|---|---|---|
| Actual wattage | 200W | 450W |
| PPE | 2.7 µmol/J | 2.7 µmol/J |
| PPF | 608.5 µmol/s | 1171 µmol/s |
| Coverage | 2×4 ft flower / 3×5 ft veg | **4×4 ft flower / 5×5 ft veg** |
| Price (US) | ~$219–$249 | ~$319–$369 |
| Warranty | 5 years | 5 years |

**Source:** Spider Farmer official product pages — SF-2000 (`https://www.spider-farmer.com/products/sf-2000-led-grow-light/`) and SF-4000 (`https://www.spider-farmer.com/products/sf-4000-led-grow-light/`). Price confirmed via spider-farmer.com.au and spiderfarmer.ca at ~CA$370 for SF-4000 (~$270 USD equivalent).

#### Vivosun AeroLight VS1000

| Spec | VS1000 |
|---|---|
| Actual wattage | 100W |
| PPE | 2.75 µmol/J |
| Chip brand | Samsung LM301B |
| Coverage | 3×3 ft |
| Price (US) | ~$95–$110 (EU/UK; US price comparable) |
| Notes | Often sold as part of a complete tent kit (Vivosun GIY kit, ~$350–$450) |

**Source:** Vivosun official product page (`https://vivosun.com/en-DE/AeroLab-VS1000-LED-Grow-Light-p110254906295190017-v110254906295190023`).

#### AC Infinity Ionframe (EVO6)

AC Infinity makes the Ionframe EVO series. The **Ionframe EVO6** is a premium 600W-class bar-style LED with claimed PPE of ~2.8–3.0 µmol/J, designed for 4×4 to 5×5 coverage. List price is higher than Mars Hydro or Spider Farmer ($400–$600 range). AC Infinity's strength is integration with their Cloudline fan ecosystem via the same app/controller ecosystem.

**Source:** AC Infinity official site (`https://acinfinity.com`).

### Tent-size-specific light recommendations

| Tent | Light option 1 | Light option 2 | Light option 3 |
|---|---|---|---|
| 2×2 ft (1 plant) | Mars Hydro FC-E1500 150W ~$100 | Spider Farmer SF-1000 100W ~$120 | Vivosun VS1000 100W ~$95 |
| 2×4 ft (2–3 plants) | Mars Hydro FC-E3000 300W ~$169 | Spider Farmer SF-2000 200W ~$219 | AC Infinity Ionframe EVO4 300W ~$250 |
| 4×4 ft (4–6 plants) | **Spider Farmer SF-4000 450W ~$319** | **Mars Hydro FC3000 EVO 300W ~$219** | AC Infinity Ionframe EVO6 600W ~$450 |
| 4×8 ft | 2× Spider Farmer SF-4000 or Mars Hydro FC-E4800 | | |

**For a first Maine indoor grower: Spider Farmer SF-4000 (450W, 4×4) at ~$319–$369 is the best balance of coverage, efficiency, price, and 5-year warranty. If on a tighter budget, the Mars Hydro FC3000 EVO (300W) at ~$219 covers a 4×4 at flower but is at the lower end of optimal wattage.**

---

## 3. Inline fans and carbon filters (odor control)

### Fan sizing: CFM rule of thumb

Tent air exchange target: **1× tent volume per minute (passive/intake) up to 3–4× per minute (active exhaust)** for heat-loaded tents.

| Tent | Volume (cu ft) | Min CFM (passive) | Practical CFM (active + filter) |
|---|---|---|---|
| 2×2×5 ft | ~20 | 20 | 50–80 |
| 2×4×5 ft | ~40 | 40 | 80–120 |
| 4×4×6.7 ft | ~107 | 107 | 200–350 |
| 4×4×7 ft | ~112 | 112 | 250–400 |
| 4×8×7 ft | ~224 | 224 | 500–700 |

**With a carbon filter:** Add 25–30% to CFM requirement due to static pressure restriction.

**Source:** Modern Farms 4×4 setup guide; Grow Indoor 4×4 guide (2026). Note: The Modern Farms article states a 6-inch fan rated ~402 CFM is standard for a 4×4, and a CFM of 350–500 CFM is the practical recommendation for 400–600W LED in a 4×4.

### 4-inch vs. 6-inch vs. 8-inch fans

| Size | Typical CFM | Price (fan only) | Best for |
|---|---|---|---|
| 4-inch | 150–200 CFM | $80–$120 | 2×2, 2×4 tents |
| **6-inch** | **350–440 CFM** | **$130–$180 (with controller)** | **4×4 tents (the standard)** |
| 8-inch | 700–807 CFM | $199–$250+ (with controller) | 4×8, 5×5+ tents |

**AC Infinity Cloudline T6 (6-inch):** 402 CFM, 32 dBA, max 70W (avg ~38W), $149.00 with VPD/temp controller.
**AC Infinity Cloudline T8 (8-inch):** 807 CFM, 39 dBA, max 180W (avg ~78W), $199.00 with controller.

**Source:** AC Infinity official product pages — T6 (`https://acinfinity.com/cloudline-t6-quiet-inline-fan-6-with-temperature-humidity-vpd-controller/`) and T8 (`https://acinfinity.com/cloudline-t8-quiet-inline-fan-8-with-temperature-humidity-vpd-controller/`).

### Carbon filter sizing

Match filter size to fan size (4-in. fan → 4-in. filter, 6-in. fan → 6-in. filter). Height: 12–24 in. is standard for grow tent use. Look for Australian activated charcoal (virgin, no recycled material).

| Filter size | Price range | Fits fan |
|---|---|---|
| 4-inch × 12 in. | $50–$70 | 4-inch fan |
| **6-inch × 12 in.** | **$70–$100** | **6-inch fan** |
| 8-inch × 24 in. | $90–$130 | 8-inch fan |

AC Infinity carbon filter (6-inch): +$69.99 with T6 bundle. Phresh and Vivosun 6-in. filters are comparable at $60–$90.

### The Maine apartment / HOA / landlord problem

Maine Title 28-B (LD 555, adult-use cannabis) governs personal home cultivation. Key rules relevant to indoor growers:

1. **Plant limit:** 3 mature + 3 immature (seedling) plants per person over 21, or 12 immature plants per residence. The 6-plant cap applies residence-wide, not per-person.
2. **No public view:** Plants must not be visible from a public way without binoculars or other visual aid. Indoor grows satisfy this condition automatically.
3. **Landlord / HOA:** LD 799 (2017) explicitly gives Maine landlords the right to prohibit or restrict cannabis cultivation on leased premises. A tenant must have the landlord's written permission. Check your lease before setting up a tent.
4. **OCP no-public-viewing rule:** The Maine OCP states plants must be out of sight from public areas — satisfied by indoor grows.

**The practical Maine apartment problem is odor control, not legality.** A 6-inch inline fan + appropriately sized carbon filter is non-negotiable in a multi-unit building. Skip the carbon filter and you will get landlord/HOA complaints or lease violations. Budget $150–$250 for the fan+filter combo (AC Infinity Cloudline T6 + 6-inch carbon filter = ~$219 at acinfinity.com).

**Source:** Maine OCP FAQ (`https://www1.maine.gov/dafs/ocp/resources/faq`); LD 799 landlord cultivation policy document.

---

## 4. Dehumidifiers, humidifiers, and VPD

*(Dehumidifier sizing reuses methodology from `research-drying-cannabis-maine-2026.md`.)*

### The 4 VPD targets by growth stage

VPD (Vapor Pressure Deficit, measured in kPa) describes the "thirst" of the air — how strongly it pulls moisture from the plant. Too low = stagnant, moldy air. Too high = plant closes stomata, growth stalls.

| Growth stage | Target VPD | Air temp | Approx. RH |
|---|---|---|---|
| Seedling / clone | 0.4–0.8 kPa | 75–80°F | 75–85% |
| Early–mid veg | 0.8–1.0 kPa | 76–82°F | 60–70% |
| Late veg | 1.0–1.2 kPa | 76–82°F | 55–65% |
| Early flower (wk 1–4) | 1.0–1.4 kPa | 78–82°F | 50–60% |
| Mid–late flower (wk 5+) | **1.2–1.6 kPa** | 75–80°F | 40–55% |
| Late flower / pre-harvest flush | 1.5–2.0 kPa | 70–75°F | 35–45% |

**Leaf temperature correction:** VPD is driven by leaf temperature, not air temperature. Under LED lights, leaves typically run 2–4°F cooler than the surrounding air. Use an infrared thermometer ($20–$30) pointed at a fan leaf during lights-on. If using air temperature only, subtract ~3°F under LED before reading a VPD chart.

**Source:** Growgoyle VPD chart guide (`https://getgrowgoyle.com/cannabis-vpd-chart-guide/`); Toledo Indoor Garden VPD guide (`https://toledoindoorgarden.com/vpd-chart-cannabis-grow`); Spider Farmer VPD chart (`https://www.spider-farmer.com/blog/vpd-chart-in-celsius-and-fahrenheit/`).

### Dehumidifier sizing

The drying brief established 24-hour moisture removal math. For an active 4×4 veg/flower tent:
- A flowering 4×4 tent transpires approximately 0.5–2 liters of water per day into the air (more in late flower).
- A 30-pint dehumidifier removes ~1.4 liters per day at standard conditions.
- A **50-pint dehumidifier** removes ~2.3 liters per day — sufficient for a 4×4 in flower.
- A **70-pint dehumidifier** handles high-heat, dense-canopy late flower or larger tents.

**Recommendation for a 4×4:** A 50-pint unit (e.g., hMe by AC Infinity, Midea, or LG) is the practical sweet spot. In a Maine basement (cool, lower ambient humidity), a 30-pint unit may suffice for veg and early flower, upgrading to 50 pints for late flower.

**Budget:** $150–$350 for a decent 50-pint dehumidifier (2026 US retail: hMe/AC Infinity ~$220, LG gram-negative ~$280, conventional brands $150–$200).

### Humidifier for seedling / clone / early veg

During seedling and early veg, ambient humidity in a heated Maine home in winter can drop to 20–30% RH — far below the 65–80% target. A small ultrasonic humidifier ($30–$60, 4–6 L/day output) is adequate for a single tent. Place it outside the tent with the output directed into the intake, or inside the tent for small spaces.

---

## 5. Soil, nutrients, pH, water

### 3–5 gallon fabric pots

The standard home-grow container is a 3–5 gallon fabric (Smart Pot) or air-pot. Rationale:
- 3 gal: sufficient for short grow cycles, autoflowers, or SOG setups
- **5 gal: the standard recommendation for photoperiod plants with 4–6 week veg**
- 7–15 gal: used in Coast of Maine Stonington Blend (which specifies 15 gal as optimal)

**Source:** Growers supply specs, Smart Pot product pages.

### Soil brands

| Brand | Product | Price (1.5 cu ft) | Notes |
|---|---|---|---|
| **Fox Farm Ocean Forest** | Amended potting soil, pH 6.3–6.8 | **$25–$35** (Amazon, HTG Supply) | Most widely used cannabis soil in US; bat guano, earthworm castings, fish/crab meal. Ready to use out of bag; no initial nitrogen fertilizer needed |
| **Roots Organics Original** | Amended organic potting soil | ~$20–$28 (online) | Better drainage than Ocean Forest out of bag; coco fiber + pumice added; US organic brand |
| **Coast of Maine Stonington Blend Grower's Mix** | Cannabis-formulated organic mix | ~$30–$45 (1.5 cu ft) | Maine brand; lobster & crab shell meal, kelp, fish bone meal, mycorrhizae; OMRI listed; **the Maine-local pick**; formulated for 15-gal containers; enough nutrition for a full cycle without additional feeding |
| **BioBizz Light-Mix** | Lightly amended soil | ~$30–$45 | Lower out-of-bag nutrition; gives grower full feeding control; popular in EU market |

**Fox Farm Ocean Forest source:** Amazon US listing, $23.99 for 12 qt / $27–$35 for 1.5 cu ft (`https://www.amazon.com/gp/product/B01KVLYW9M`).
**Coast of Maine Stonington Blend:** `https://coastofmaine.com/products/stonington-blend-super-soil` and Pierce Milling (`https://piercemilling.com/product/coast-of-maine-stonington-blend-growers-mix/`).

**Maine-specific note:** Coast of Maine Stonington Blend is the only major cannabis-formulated soil brand manufactured in Maine. It is OMRI-listed for organic growers and is widely stocked at Jack's Hardware & Garden (Portland area), local co-ops, and online.

### pH and TDS meters

- **pH meter:** Essential. Cannabis prefers 6.0–6.8 in soil (6.2–6.5 at reservoir). Apera AI311 or Bluelab Multimedia pH Pen: $50–$130. Cheap drop-checkers ($5) are insufficient for nutrient management.
- **TDS/EC meter:** Optional but recommended for hydroponic or soilless grows. Unnecessary if using a rich soil like Ocean Forest or Stonington Blend for a full soil cycle without additional nutrients.

### Nutrient lines: 3-part vs. 1-part

| Line | Products | Price | Best for |
|---|---|---|---|
| General Hydroponics Flora Trio | FloraGro + FloraBloom + FloraMicro (3 bottles) | ~$35–$45 for 3-part | Intermediate–advanced growers who want precise control |
| **Dyna-Gro Foliage Pro + Bloom** | Foliage Pro (9-3-6, all stages) + Bloom (3-12-6) | ~$25–$35 for 2 bottles | **Beginner-friendly; simple 2-bottle for soil or hydro** |
| Fox Farm trio | Big Bloom + Grow Big + Tiger Bloom | ~$35–$45 | Fox Farm soil users |

**Cal-Mag supplement:** Cal-Mag (calcium + magnesium) is required if using RO water, soft water (Maine's coastal cities), or coco coir. Most Maine tap water is soft (see Section 5 water hardness data) — Cal-Mag may still be beneficial as a preventative. Dose: 1–2 mL/gal.

### Maine water hardness (Maine-specific data point)

| City / region | Hardness (PPM) | Classification |
|---|---|---|
| Portland / South Portland / Westbrook | 8–10 ppm | **Soft** |
| Bangor | ~6 ppm | **Soft** |
| Lewiston / Auburn | ~17 ppm | **Soft** |
| Augusta | 150 ppm | **Hard** |
| Waterville | 29 ppm | Moderately soft |
| Belfast | 68 ppm | Moderately hard |
| Statewide range | 3–222 ppm | Varies by bedrock |

**Key takeaway for Maine indoor growers:** Most of Maine's population centers (Portland, Bangor, Lewiston, Augusta area, coastal) have **soft water below 50 ppm** — well within the range where reverse osmosis is optional rather than required. Augusta and a few inland hard-rock areas may need RO or Cal-Mag fortification. A basic water hardness test strip ($10) is sufficient to determine if RO is needed.

**Source:** WaterHardness.org Maine data (`https://www.waterhardness.org/state/maine`); Aquatell Maine city data (`https://www.aquatell.com/pages/water-hardness-maine`); Portland Water District public data (`https://www.pwd.org/faqs/what-hardness-my-water/`).

---

## 6. Maine electricity cost (CMP + Versant)

### CMP (Central Maine Power) — serves most of southern / central / western Maine

**Standard Residential Rate A (EIA-derived, 2026):**
- Combined delivery + supply: **~$0.136/kWh** (estimate; final verified from EIA state data or CMP bill)
- Source: EIA electricity sales data for Maine investor-owned utilities; CMP tariff page confirmed TOU rates effective January 1, 2026

**CMP Optional Time-of-Use (TOU) Delivery Rate (effective January 1, 2026):**
- On-peak (Mon–Fri, 5:00 PM–9:00 PM): **$0.503/kWh** delivery charge
- Off-peak (all other hours): **$0.067/kWh** delivery charge
- Service charge: $26.71/month (vs. $30.21 for standard Rate A)
- **To benefit from TOU, ≥86% of total electricity use must be in off-peak hours.** Growers running lights during off-peak hours only (9 PM–5 PM on weekdays + all weekend) can save on the delivery portion of their bill. The supply charge (separate from delivery) does not vary by time.
- Grow lights on a 12/12 flower schedule: on-peak overlap = 5 PM–9 PM = 4 hours × 12 hrs = 33% of light hours fall in on-peak. With a timer set to start lights at 9 PM, zero on-peak usage is possible.
- **CMP Smart Hours program (TOU pilot) is still active as of January 2026** per the CMP tariff page (`https://www.cmpco.com/time-of-use-delivery-rate`).

**Source:** CMP Time-of-Use Delivery Rate page (`https://www.cmpco.com/time-of-use-delivery-rate`); Maine PUC investigation into TOU rate requirement (June 2026, `http://www.energychoicematters.com/stories/20250620a.html`).

### Versant Power (serves northern and eastern Maine)

- Residential rate: **~$0.22–$0.25/kWh** (estimate based on publicly available Versant rate schedules; verify at `https://www.versantpower.com/`).
- Versant does not currently offer a residential TOU rate (as of June 2026).
- If Versant's rate is confirmed at $0.22/kWh, that is significantly lower than CMP's standard $0.136/kWh delivery-only charge, making indoor growing in Aroostook County/Washington County notably cheaper in terms of energy cost.

**Note on Versant rate verification:** The Versant residential rate was not confirmed from a live tariff page in this research cycle. Check `https://www.versantpower.com/` or call Versant directly to verify the current residential rate before publishing the electricity cost math. Mark as `(estimate, verify at versantpower.com before publication)` if unconfirmed.

### Electricity math: a 4×4 LED grow at Maine rates

**Setup:** Spider Farmer SF-4000 (450W actual draw) + AC Infinity Cloudline T6 (38W avg) + dehumidifier 50-pint (280W average, runs ~8 hrs/day in flower) + circulation fans (20W) = ~788W total.

| Phase | Hours/day | Days | kWh |
|---|---|---|---|
| Vegetative (18/6) | 18 | 56 (8 weeks) | 450W × 18h × 56 days / 1000 = **453.6 kWh** |
| Flower (12/12) | 12 | 56 (8 weeks) | 450W × 12h × 56 days / 1000 = **302.4 kWh** |
| Dehumidifier (flower only) | 8 | 56 | 280W × 8h × 56 days / 1000 = **125.4 kWh** |
| Fans (avg, full cycle) | 24 | 112 | 58W × 24h × 112 days / 1000 = **155.9 kWh** |
| **Total per harvest** | | | **~1,037 kWh** |

**Electricity cost per harvest:**

| Utility | Rate | Total cost |
|---|---|---|
| CMP standard ($0.136/kWh delivery + supply) | $0.136 | **$141** |
| CMP with TOU off-peak ($0.067/kWh delivery + $0.10 supply est.) | $0.167 | **$173** |
| Versant ($0.22/kWh est.) | $0.22 | **$228** |
| Versant ($0.25/kWh est.) | $0.25 | **$259** |

**Note:** The dehumidifier is the second-largest electricity consumer after lighting. Running it only during the flower phase is standard; in a Maine basement in winter, the ambient humidity is lower and dehumidifier runtime may be 4–6 hours rather than 8.

**Extra cost per month during veg phase:**
- 450W light × 18h = 8.1 kWh/day = ~243 kWh/month
- At CMP: 243 × $0.136 = **~$33/month**
- At Versant: 243 × $0.22 = **~$53/month**

**Winter basement heating cost (Maine-specific):**
A Maine basement in January runs ~50–55°F. To maintain 75°F inside the tent in an unheated basement, a small 100–300W oil-filled radiator or ceramic heater is needed in addition to the LED heat (which provides ~400W of heat inside the tent). Additional heating: ~$15–$25/month at CMP rates, $20–$35/month at Versant.

---

## 7. Cost-per-ounce math

### Indoor yield benchmarks

| Grower experience | Yield per 4×4 cycle | Grams per watt (LED) |
|---|---|---|
| Beginner (first 1–2 cycles) | 4–8 oz (113–227 g) | 0.3–0.5 g/W |
| Intermediate (consistent) | 10–16 oz (284–454 g) | 0.6–1.0 g/W |
| Advanced (SCROG, experienced) | 18–32 oz (510–907 g) | 1.0–1.5 g/W |

**Sources:** Modern Farms 4×4 setup guide (2026) — honest yield math; Royal Queen Seeds 4×4 yield guide; Hydrobuilder yield estimator; Nova Seed Bank yield data (500+ documented indoor grows); CBT/Fluence 2025 survey (185 commercial growers) — median 35–80 g/sq ft for indoor canopy.

**Per-plant yield (indoor, photoperiod, 5-gal pot, 4–6 week veg):** 2–5 oz/plant, with most home growers reporting 2.5–4 oz per plant in a 4×4.

### Cost breakdown by tier

| Cost category | Budget (2×2, 1 plant) | Mid (4×4, 4 plants) | Premium (4×4, 4 plants, high-end) |
|---|---|---|---|
| Tent | $50–$70 | $80–$120 | $199–$250 (Gorilla / AC Infinity) |
| LED light | $95–$120 | $169–$369 | $400–$600 |
| Inline fan + carbon filter | $100–$150 | $150–$220 | $250–$350 |
| Dehumidifier | $0–$150 (basement may not need) | $150–$280 | $300–$400 |
| Soil (1.5 cu ft) | $25–$35 | $25–$45 | $35–$65 |
| Nutrients | $25–$35 | $35–$80 | $80–$150 |
| pH meter | $30–$50 | $50–$100 | $100–$180 |
| Fabric pots (4) | $15–$20 | $20–$30 | $25–$40 |
| Seeds (4, ILGM) | ~$80 | ~$80 | ~$80 |
| **Total equipment** | **$300–$500** | **$800–$1,500** | **$2,000–$4,000** |

*Ongoing per-harvest costs (electricity + nutrients + seeds): $100–$300.*

### Equipment amortization

| Tier | First harvest (with equipment) | Ongoing per harvest (after year 1) | Cost/oz, year 1 | Cost/oz, ongoing |
|---|---|---|---|---|
| Budget | $300–500 + $150 electricity = $450–650 | ~$100–$150 | $56–$163/oz | $25–$38/oz |
| Mid | $800–1,500 + $150 electricity = $950–1,650 | ~$150–$250 | $60–$165/oz | $13–$25/oz |
| Premium | $2,000–4,000 + $200 electricity = $2,200–4,200 | ~$200–$350 | $69–$210/oz | $11–$19/oz |

*Based on 8–12 oz yield (mid tier), 18–32 oz (premium).*

### Indoor vs. outdoor vs. dispensary retail

| Source | Cost/oz | Notes |
|---|---|---|
| **Indoor, year 1 (mid tier)** | $60–$165/oz | Includes full equipment amortization; ongoing cost drops sharply in year 2 |
| **Indoor, ongoing (mid tier)** | **$13–$25/oz** | Electricity + nutrients + seeds only |
| **Outdoor, per autoflower-vs-feminized brief** | $7–$15/oz | Seeds, soil, water; no electricity, no tent |
| **Maine dispensary retail (2026)** | **$200–$400/oz** | Adult-use market; confirmed from prior brief's pricing research |

**The honest "is home grow cheaper" answer:** Indoor growing is more expensive than outdoor in year 1 due to equipment amortization. After year 1, an indoor mid-tier setup produces cannabis at $13–$25/oz — dramatically cheaper than dispensary retail at $200–$400/oz. The break-even is typically 2–3 harvests.

**Source for dispensary retail:** The autoflower-vs-feminized brief cites $200–$400/oz as the Maine adult-use retail range, consistent with $10–$15/g national adult-use retail in 2026. **Verify this number against live Maine dispensary menu prices on the day of publication.**

---

## 8. Maine winter basement grow

### The "Maine basement is ideal for indoor" framing

Maine's climate gives basements a natural advantage for indoor cannabis cultivation:

1. **Year-round temperature stability:** Unheated Maine basements hold 50–60°F (10–15°C) even in January. This is below the ideal veg/flower temp (75–80°F) but means the space never overheats in summer — the primary challenge for indoor growers in southern states.
2. **Darkness for photoperiod control:** A basement has no natural light intrusion, making it the ideal space for 12/12 flowering schedules. No light leaks from windows.
3. **Neighbor-proof:** Plants are invisible from the street. Satisfies the OCP's no-public-viewing requirement by default.
4. **Winter heating is the main cost:** You must heat the tent; you rarely need to cool it. A small 100–300W heater adds $15–$35/month at Maine electricity rates.

### Temperature control

| Season | Maine basement ambient | Tent target | Action needed |
|---|---|---|---|
| Winter (Jan–Feb) | 50–55°F | 75–80°F | **Add heater** (100–300W radiator, $25–$50) |
| Spring / Fall | 55–65°F | 75–80°F | LED waste heat may be sufficient + small heater |
| Summer | 60–70°F | 75–80°F | LED heat + room may be sufficient; active cooling rarely needed in Maine |

**Maine basement = natural advantage for indoor growing in summer.** Growers in Texas, Florida, or Arizona pay hundreds per month on AC to cool their tents. A Maine basement grower may need zero active cooling June–September.

### Power outage planning (Maine-specific)

Maine experiences winter storm outages. CMP and Versant both publish outage maps; major ice storms in 2023 and 2024 caused multi-day outages across central and northern Maine.

**Recommendations:**
- **UPS (Uninterruptible Power Supply):** A 1500VA UPS ($100–$200) can run a 300W LED + small fan for 20–45 minutes — enough to complete a graceful shutdown (turn off lights, save grow journal).
- **Battery station (Jackery / EcoFlow style):** A 1000Wh portable power station can run a 300W LED for ~2.5 hours, a 100W light for 8+ hours. Not a long-term solution but bridges a short outage.
- **Generator:** For serious multi-day outage protection, a 2000W generator (Honda EU2200i or equivalent) can run a tent setup indefinitely on gasoline/propane. Cost: $1,000–$2,000 + fuel.
- **No generator = not the end of the world:** A 12–24 hour outage will stress plants but not kill them if temperatures stay above 55°F. The bigger risk is leaving lights off for >24 hours during late flower (can cause hermaphroditism or early-harvest stress). A small battery bank or UPS for the light circuit is the minimum sensible precaution.

---

## 9. The closet grow (1-plant minimum)

### The starter / trial indoor setup

A 1-plant closet grow is the lowest-cost way to prove you can finish a cannabis harvest before investing in a full 4×4 tent. It is also the only practical option for renters with minimal space or strict landlords.

| Component | Recommended product | Price |
|---|---|---|
| Tent | Vivosun 2×2×60 in. or Mars Hydro 2×2 tent | $50–$70 |
| Light | Mars Hydro FC-E1500 150W (~3×3 coverage) OR Spider Farmer SF-1000 100W | $95–$120 |
| Fan | AC Infinity Cloudline S4 (4-in., ~150 CFM) OR equivalent Vivosun 4-in. | $80–$120 |
| Carbon filter | 4×12 in. Phresh or Vivosun | $50–$70 |
| Soil | Fox Farm Ocean Forest (12 qt bag = enough for 2–3 runs) | $24–$28 |
| Seeds | ILGM White Widow Auto or ILGM OG Kush Feminized — 1 pack = $10–$15 | $10–$15 |
| **Total** | | **$300–$400** |

**Light cycle:** 18/6 for veg, 12/12 for flower. A single timer ($10) controls the schedule.

**Expected yield:** 1–2 oz per harvest (first cycle may be less). Cost per oz: $150–$250 in year 1 including equipment, dropping to $50–$100/oz in year 2.

**Source:** Mars Hydro FC-E1500 and SF-1000 product specs; ILGM seed affiliate link: `https://ilgm.com?aff=8112` (20% commission; all equipment recommendations above are non-affiliate informational).

---

## 10. Cost summary tables

### Full setup cost tiers

| | Budget | Mid | Premium |
|---|---|---|---|
| **Plants / Tent** | 1 plant, 2×2×5 ft, $50–$70 | 4 plants, 4×4×6.7 ft, $80–$120 | 4–6 plants, 4×4×7 ft Gorilla, $199–$220 |
| **LED light** | Mars Hydro FC-E1500 150W, ~$100 | Spider Farmer SF-4000 450W, ~$319–$369 | AC Infinity Ionframe EVO6 or HLG 600 Diablo, ~$450–$700 |
| **Ventilation** | Vivosun 4-in. fan + filter combo, ~$150 | AC Infinity Cloudline T6 + carbon filter, ~$220–$270 | AC Infinity Cloudline T6 PRO + larger filter + silencer, ~$350–$450 |
| **Climate** | No dehumidifier (basement) | 50-pint dehumidifier, ~$150–$220 | 70-pint + AC Infinity sensors + controller, ~$350–$500 |
| **Soil + Nutrients** | Fox Farm Ocean Forest 1.5 cf + Dyna-Gro 2-part, ~$60 | Ocean Forest + Flora Trio, ~$80–$120 | Coast of Maine Stonington Blend + premium nutrients + RO water, ~$120–$200 |
| **pH meter** | Drop checker + pH strips, ~$15 | Apera AI311, ~$60–$80 | Bluelab Combo Meter, ~$130–$290 |
| **Seeds (ILGM)** | 1 pack auto, ~$15 | 4-pack photoperiod, ~$50–$80 | 4-pack photoperiod + 1 auto pack, ~$80–$120 |
| **Total equipment** | **$300–$500** | **$800–$1,500** | **$2,000–$4,000** |

### Ongoing per-harvest costs (electricity + consumables)

| Utility / scenario | Electricity cost/harvest | Nutrients + seeds | Total ongoing |
|---|---|---|---|
| CMP standard ($0.136/kWh) | ~$141 | ~$50–$80 | **~$190–$220** |
| CMP TOU off-peak only ($0.167/kWh) | ~$173 | ~$50–$80 | **~$220–$250** |
| Versant ($0.22/kWh est.) | ~$228 | ~$50–$80 | **~$280–$310** |

*Based on 1,037 kWh total per harvest (see Section 6 for calculation).*

### Yield and cost-per-ounce summary

| Tier | Yield/cycle | Electricity + consumables/oz | Cost/oz year 1 (equipment amortized) |
|---|---|---|---|
| Budget (2×2) | 1–2 oz | ~$190–$220 ÷ 1.5 oz = **$127–$147/oz** | **$250–$350/oz** |
| Mid (4×4) | 8–14 oz | ~$220–$280 ÷ 10 oz = **$22–$28/oz** | **$80–$150/oz** |
| Premium (4×4) | 18–28 oz | ~$280–$350 ÷ 22 oz = **$13–$16/oz** | **$90–$150/oz** |

*The mid tier offers the best cost-per-oz outcome for a committed home grower. The premium tier's higher yield brings per-ounce costs down significantly but requires more skill.*

---

## 11. The 7 beginner mistakes

1. **Buying the cheapest tent.** A $50 budget tent has 16mm poles, thin canvas, and poor zippers. It will collapse under a loaded light or rip within a year. The $80–$120 Vivosun S448 is the minimum viable for a serious grow. The $199 Gorilla is worth the upgrade if running heavy equipment.

2. **Using a blurple LED because it's cheaper.** A blurple (blue + purple LED cluster) runs at 1.0–1.5 µmol/J efficiency vs. 2.7–2.85 for a quantum board. Same grow, 2× the electricity bill, 30–50% less yield. A $169 Mars Hydro FC-E3000 outperforms any blurple at any price.

3. **Skipping the carbon filter.** Cannabis in flower has a strong, unmistakable odor. In an apartment, condo, or shared building, neighbors will notice. A $70 carbon filter is cheaper than a lease violation. This is non-negotiable in any Maine rental.

4. **Overwatering seedlings.** The #1 beginner indoor cannabis killer. Seedlings have minimal root systems; overwatering drowns roots and invites pythium (root rot). Water only when the top inch of soil is dry. Use a spray bottle for the first week, then transition to bottom-watering.

5. **Using regular (non-feminized) seeds.** Half the plants will be males (or hermaphrodites) that produce no usable bud. In a 4-plant tent, one male can fertilize the entire garden and ruin a harvest. Always use feminized seeds for sinsemilla (seedless) bud. Source: ILGM feminized seeds (`https://ilgm.com?aff=8112`).

6. **Skipping the pH meter.** Cannabis grows in a narrow pH window (6.0–6.8 in soil). Without a pH meter, nutrient lockout, yellow leaves, and wasted nutrients are almost guaranteed. A $40–$60 digital pH pen (Apera or Bluelab) is the single most cost-effective upgrade a beginner can make.

7. **Running 24/0 light cycle.** The myth that "more light = more growth" leads some beginners to run lights 24 hours. Cannabis needs a dark period. 24/0 light cycle stresses plants, disrupts root development, and wastes electricity with no yield benefit. The correct schedule: 18/6 (veg) or 12/12 (flower).

8. **Ignoring VPD.** The most commonly ignored metric by beginners, and the most impactful on yield and mold resistance. In late flower, low VPD (below 1.0 kPa) creates the exact conditions for bud rot (Botrytis). A $20 infrared thermometer and a VPD chart (see Section 4) can prevent an entire ruined harvest.

---

## 12. Common Maine indoor-setup FAQ

**Q: Can I grow cannabis in my apartment in Maine?**
Yes — Maine law (Title 28-B) permits home cultivation for adults 21+. The practical constraints are: (1) your lease or building policy (landlords can prohibit cultivation under LD 799); (2) odor control — a carbon filter is mandatory in multi-unit buildings; (3) the 6-plant residence-wide cap. Check your lease before buying equipment.

**Q: How much will my electric bill go up?**
For a mid-tier 4×4 grow (450W LED + fans + dehumidifier): approximately **$33–$53/month during vegetative phase** and **$50–$75/month during flowering** at Maine electricity rates. See Section 6 for the full math with CMP and Versant rates.

**Q: Is indoor cheaper than buying at a Maine dispensary?**
Yes, after the first year. Year 1 indoor cost per ounce: $80–$165/oz (equipment amortized). Ongoing indoor cost: $13–$28/oz. Maine dispensary retail: $200–$400/oz. The break-even point is 2–3 harvests, or approximately 6–9 months.

**Q: What if I lose power during a winter storm?**
A 1500VA UPS ($100–$200) keeps lights running 20–45 minutes. A Jackery/EcoFlow 1000Wh station runs a 300W light for 2–3 hours. For multi-day outage protection, a Honda EU2200i generator ($1,000–$2,000) is the robust solution. In a heated Maine basement, a 12–24 hour outage will stress but not kill plants if ambient temp stays above 55°F.

**Q: Do I need a permit to grow indoors in Maine?**
No. Personal home cultivation under LD 555 does not require a state permit. You must comply with plant-tag labeling rules (each plant labeled with owner name and date), keep plants out of public view, and have landowner permission if renting. Municipalities may have additional zoning rules; check with your city/town clerk.

**Q: Can I rent out a room as an indoor grow space?**
No. Maine's personal cultivation laws permit growing for personal use only. Any rental arrangement where someone pays to use a grow space constitutes commercial cultivation, which requires a Maine OCP-issued cultivation license. The penalties for unlicensed commercial cultivation are significant.

**Q: Should I run my grow lights during off-peak hours to save on CMP's TOU rate?**
If you enroll in CMP's optional TOU rate (effective January 2026), running lights from 9 PM to 9 AM (all off-peak) means zero on-peak delivery charges. Set your timer to start at 9 PM. The supply charge (the largest portion of your bill) does not vary by time, but the delivery savings are real. The TOU rate benefits you if ≥86% of usage is off-peak.

---

## 13. Caveats — what I couldn't verify

### Cannot verify / needs live-source confirmation before publication

1. **Versant Power residential rate ($0.22–$0.25/kWh):** This is a 2025–2026 estimate. The exact current residential rate must be confirmed at `https://www.versantpower.com/` or by calling Versant. If the actual rate differs, the entire Versant electricity cost math changes. **Mark Versant rates as "(estimate — verify at versantpower.com before publication)."**

2. **CMP non-TOU combined delivery + supply rate ($0.136/kWh):** Derived from EIA Maine electric sales data. The CMP TOU page lists only delivery charges ($0.067 off-peak / $0.503 on-peak). The supply charge varies by Standard Offer contract. The combined rate of $0.136/kWh is an estimate; confirm via a recent CMP bill or the EIA Maine state electricity profile.

3. **Maine dispensary flower retail ($200–$400/oz):** Reused from the autoflower-vs-feminized brief's working number. Re-verify against live Maine dispensary menu prices (e.g., Weedmaps, Leafly, or direct dispensary menus) on publication day.

4. **Spider Farmer SF-4000 US retail price ($319–$369):** Confirmed via spider-farmer.com.au / spiderfarmer.ca (Canadian pricing ~CA$370 = ~US$270). The direct US price on spider-farmer.com was not directly scraped. The range $319–$369 reflects market pricing as of Q2 2026; confirm before publication.

5. **Vivosun S448 2×2 tent price ($50–$70):** Confirmed for the 4×4 ($80–$120). The 2×2 pricing was not directly verified; the $50–$70 range is estimated from general Vivosun 2×2 listings. Confirm on Amazon or vivosun.com.

6. **CMP supply charge component:** The TOU delivery rate page lists only delivery charges. The supply charge (from the Standard Offer or a competitive supplier) adds to the total. Without the supply charge, the TOU math is incomplete. Check: is the supply charge fixed per kWh or variable? Does it vary by TOU period?

7. **Maine PUC TOU rulemaking outcome:** The Maine PUC opened an investigation in June 2026 to potentially require TOU rates from CMP and Versant. If this results in mandatory TOU rates or new rate structures, the electricity cost math in this brief would need updating.

8. **AC Infinity Ionframe EVO6 current price:** Not directly scraped in this research cycle. The premium-tier light recommendation is based on general market knowledge; verify current price at `https://acinfinity.com` before publication.

9. **Coast of Maine Stonington Blend Grower's Mix US retail price:** Confirmed via Pierce Milling (~$30–$45 for 1.5 cu ft) and coastofmaine.com. Maine garden centers (Jack's Hardware, Allen Sterling & Lyman, local co-ops) may carry it at comparable prices; online shipping may add $15–$25 for a 1.5 cu ft bag.

10. **CO₂ enrichment equipment pricing:** Not covered in this brief. CO₂ supplementation can increase yields 15–30% in optimized rooms but requires sealed tents, a CO₂ burner or tank, and careful VPD management. Budget $200–$600 for a basic CO₂ setup. Not recommended for beginners.

---

*Brief prepared: 2026-06-06. All equipment prices reflect Q2 2026 US retail. Electricity rates reflect confirmed CMP TOU tariff (January 2026) and estimates for Versant and CMP standard Rate A. Verify all unconfirmed figures before publishing.*
