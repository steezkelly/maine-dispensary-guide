# Drying Cannabis in Maine — Verified Facts Brief
**Date prepared:** 2026-06-06
**Scope:** Drying and curing protocol for Maine home growers facing 60–80% ambient relative humidity in October.

This brief is the source-of-record citation pack for the `/blog/drying-cannabis-maine-humidity-2026` post. Every numerical claim is linked to a primary or near-primary source URL. Where a fact could not be verified from a primary source, it is flagged in the body as **ESTIMATE** or "(not verified)". The brief deliberately avoids restating cannabis law and strain selection (covered in `research-homegrow-keywords-2026.md` and `research-when-to-start-seeds-maine-2026.md`).

## 0. Source hierarchy

1. **Maine per-station climate data** — NOAA NCEI Climate Normals via two derivative sources: `currentresults.com/Weather/Maine/humidity-by-month.php` (1961–1990 normals, derived from the NCEI/World Data Center for Meteorology) and `weather-and-climate.com` (1990–2020 normals, Foreca). Both are secondary; the NCEI portal itself is at `https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals`.
2. **NWS Gray/Portland and NWS Caribou** — operational climate pages, used for the NWS frost/freeze program dates already cited in `research-when-to-start-seeds-maine-2026.md` and re-used here only where directly relevant.
3. **Cannabis culture (primary references for the craft)** —
   - **BudTrainer** drying guide (May 2026 update, with peer-reviewed citations): https://www.budtrainer.com/blogs/learn/drying-cannabis
   - **Grow Weed Easy** (Nebula Haze), wet-vs-dry trim, drying: https://www.growweedeasy.com/wet-trim-vs-dry-trim-which-makes-better-cannabis
   - **ILGM** drying guide (Stoney Tark): https://ilgm.com/resources/guides/a-beginners-guide-to-drying-cannabis
   - **THCFarmer** burping-schedule community guide (logic, 2024): https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/
4. **Boveda / Integra Boost** — vendor product pages and the Boveda technical summary on `dehumidify.com` (Hydrosorbent, Boveda's patent holder). Verified on the day of writing.
5. **Grove Bags** — vendor `pages/technology` page describing the TerpLoc® film construction.
6. **GrowersHouse** — commercial dehumidification sizing guide (PPD methodology, brand ratings).
7. **Rinwang** — refrigerant vs. desiccant dehumidifier technology comparison (industrial-focused but technically robust; cited ASHRAE and U.S. DOE).
8. **Internal site sources** —
   - `research-homegrow-keywords-2026.md` (Cluster H harvest/drying/curing; "Maine October 70%+ humidity is the killer")
   - `research-when-to-start-seeds-maine-2026.md` (UMaine Extension, MOFGA, NCEI frost dates; harvest-window tables)

Cannigma's drying/curing page was returned as `403 Forbidden` by Firecrawl at scrape time (Cloudflare cross-account error) and is therefore not used as a source here; the equivalent guidance is covered by BudTrainer, Grow Weed Easy, and ILGM, which are functionally equivalent or stricter.

---

## 1. The target environment: why 60°F / 60% RH

### The canonical "slow dry" target and its origin

**60°F (15.5°C) and 60% RH is the most-cited drying target across the cannabis-craft literature.** It is variously called the "60/60 rule" (overgrow.com community thread) and the "modern best practice" (BudTrainer, May 2026). The narrower 55–65% RH / 60–68°F band is the "modern best practice" range; the 60/60 point is the centroid.

- **BudTrainer, "How to Dry Weed: The Complete Cannabis Drying Guide (2026)"** (https://www.budtrainer.com/blogs/learn/drying-cannabis): "Modern best practice for drying cannabis is 55% to 65% relative humidity at 60°F to 68°F (15°C to 20°C), in the dark, with gentle indirect airflow. The sweet spot in the middle of those ranges, sometimes called the '60/60 rule,' is 60% RH at 60°F (15.5°C). That target gives you a slow, even dry that finishes in 10 to 12 days for most setups." Updated May 2026; author Henrique Dias holds a graduate certificate in Commercial Cannabis Production from Niagara College (Canada) and worked at Health Canada-licensed producers.
- **ILGM, "A Beginner's Guide To Drying Cannabis"** (https://ilgm.com/resources/guides/a-beginners-guide-to-drying-cannabis, by Stoney Tark): "Most growers use the 60/60 method: 60°F (15.5°C) and 60% relative humidity. … If you need a bit of flexibility, you can stay between 60–70°F (15.5–21°C) and 45–60% RH."
- **Reddit r/cannabiscultivation, community FAQ (2021)** (https://www.reddit.com/r/cannabiscultivation/comments/q43r0h/): "I like 60F / 60% rh. I have read that allowing humidity to drop below 52% or so will stop the curing process, and it cannot be restarted."
- **Overgrow.com drying-cure community** (https://overgrow.com/t/proper-temperature-and-humidity-for-drying/64498): "I like 60F / 60% rh" is the consensus community answer.

**Old vs. new guidance.** BudTrainer explicitly notes a shift: "Older guidance you may still see online recommends 45% to 55% RH. That range works, but it sits at the dry end of acceptable and usually finishes drying in under 8 days, which [trades] terpene preservation for speed. The 55% to 65% range is what licensed commercial producers target now." This shift is *not* a contradiction; the 60/60 number has been a community convention for a decade, and the 55–65% range is the wider operating window commercial producers use around it.

### Why temperature and humidity both matter (the VPD explanation)

BudTrainer articulates the VPD framing: "The targets are not arbitrary. They sit inside the narrow window where two things happen at once: water evaporates from the buds slowly enough that monoterpenes do not evaporate with it. Above 70°F, terpene loss accelerates. Below 55°F, drying stalls and risks mold. VPD sits around 0.5 to 0.8 kPa, which is the airflow physics equivalent of 'not too hungry, not too thirsty.'" (https://www.budtrainer.com/blogs/learn/drying-cannabis)

- Above ~70°F (21°C): monoterpenes (myrcene, limonene) evaporate measurably; chlorophyll is locked in; the "hay" smell appears. Source: Ross & ElSohly, "The volatile oil composition of fresh and air-dried buds of *Cannabis sativa*," *J. Nat. Prod.* 59(1):49–51 (1996) — cited by BudTrainer ref [4].
- Below ~55°F: terpene loss slows but so does water migration; buds stall wet and become mold hosts.
- Above 65–70% RH: Botrytis cinerea (gray mold / bud rot) is the dominant risk. Source: Punja, "Emerging diseases of *Cannabis sativa* and sustainable management," *Pest Management Science* 77(9):3857–3870 (2021) — cited by BudTrainer ref [3].

### The 10-day dry window vs. 14-day vs. 7-day debate

**Consensus (with numbers):** BudTrainer's drying-stage table is the cleanest summary:
- Day 1–3 (initial): 60–65°F, 60–65% RH, light indirect airflow.
- Day 4–8 (mid-dry): 60–65°F, 58–62% RH, light indirect airflow.
- Day 9–14 (finish): 60–65°F, 55–60% RH, reduce to near-still air.

Total: **7–14 days** depending on whole-plant vs. branch vs. trimmed-bud form and ambient humidity. Most home harvests finish in 10–12 days. Buds lose 75–80% of starting weight in water loss. (https://www.budtrainer.com/blogs/learn/drying-cannabis)

**What the writer should not get wrong:** the 7-day minimum is a *quality floor* (anything faster and terpene/chlorophyll damage is permanent). The 14-day maximum is a *mold ceiling* (anything slower and bud rot is a near-certainty unless conditions are extremely well controlled). The traditional "10 days" target sits in the middle. ILGM gives the same 7–14 day window (https://ilgm.com/resources/guides/a-beginners-guide-to-drying-cannabis).

---

## 2. Maine ambient humidity by month/region

### Primary data (NCEI-derived, per-station, per-month)

**Important labeling note:** the `currentresults.com` page (https://www.currentresults.com/Weather/Maine/humidity-by-month.php) presents two per-month tables, but the captions appear to be misordered on the page. The values in the first table (Sep morning RH 87% / afternoon 61%) match the coastal/Portland pattern, while the second table (Sep 85%/64%) matches the more continental/Caribou pattern. The source credits the "World Data Center for Meteorology" (the pre-2015 NCEI predecessor) and the period 1961–1990. The table below **assigns the values to the city whose climate they match**; the writer should re-verify the per-month number against the NCEI Climate Normals portal (https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) at publish time and flag the currentresults.com labeling if it is unchanged.

| City | Avg. RH Sept (morning / afternoon) | Avg. RH Oct (morning / afternoon) | Avg. RH Nov (morning / afternoon) | Annual morning / afternoon | Source URL |
|---|---|---|---|---|---|
| **Portland** (coastal, southern Maine) | 87% / 61% | 86% / 64% | 85% / 73% | 80% / 61% | https://www.currentresults.com/Weather/Maine/humidity-by-month.php (table values; **caption label disputed — see note above**) |
| **Caribou** (inland, northern Maine) | 85% / 64% | 84% / 63% | 81% / 64% | 78% / 61% | https://www.currentresults.com/Weather/Maine/humidity-by-month.php (table values; **caption label disputed — see note above**) |
| **Bangor** (interior central Maine) | ~86% | — | **86%** (confirmed via second source) | — | https://wanderlog.com/weather/58806/11/bangor-weather-in-november ("very humid with an average amount of 86% (relative humidity)") — underlying source NASA MERRA-2 2010–2020 |
| **Augusta** (interior south-central) | **ESTIMATE 80–86%** (not directly verified) | ESTIMATE | ESTIMATE | — | No per-city NCEI page located in the time available. **Flag for writer:** cite the Portland and Caribou numbers; do not invent an Augusta-specific number. |
| **Lewiston / Auburn** (south-central) | **ESTIMATE 78–84%** (interior analog to Bangor) | ESTIMATE | ESTIMATE | — | Not directly verified. |
| **Farmington** (western foothills) | **ESTIMATE 76–82%** (more continental, lower) | ESTIMATE | ESTIMATE | — | Not directly verified. |

**Cross-check with a second source — Wanderlog / NASA MERRA-2, Bangor:**
- Wanderlog: Bangor November = "very humid with an average amount of 86% (relative humidity)" (https://wanderlog.com/weather/58806/11/bangor-weather-in-november). Underlying data: NASA MERRA-2, averaged 2010–2020.
- Wanderlog chart description: "December has the highest relative humidity at 94% and is the least humid in August at 77%" (Bangor-specific).
- Wanderlog also reports the *annual* pattern: November 86% matches a coastal/continental-blend pattern consistent with Bangor's position downwind of the Penobscot Bay moisture source.

**Portland, weather-and-climate.com (Foreca 1990–2020 normals):** "Portland's humidity levels vary throughout the year. The highest levels occur in September, reaching 77% (high), while the lowest is recorded in February at 65%. Throughout the year, the average humidity in Portland is 71%." (https://weather-and-climate.com/average-monthly-Humidity-perc,portland-maine-us,United-States-of-America). This is a *single daily-average* number, not a morning/afternoon split, and uses a more recent normal period; it is consistent in shape (Sep peak) with the currentresults.com data and slightly lower in absolute value (likely because it's a daily mean rather than the 7am figure).

### Why this matters: 70%+ ambient RH in Maine October is the killer

The hard data confirms the qualitative statement in `research-homegrow-keywords-2026.md` (line 119): Maine morning RH in October is **86% in Portland and 84% in Caribou**, and 73% in Portland afternoons. For a home grower without active dehumidification, the drying-space RH is at or above the 60–65% upper bound of the 60/60 window for most of daylight hours, and well above the 70% mold-danger threshold for the overnight period when the temperature drops and RH climbs.

**Direct corollary for the blog:** the difference between a Maine home grower's drying environment and the canonical "60/60" target is roughly +20–25 percentage points of RH for most of the day in October. Without mechanical dehumidification, the buds will not dry in 7–14 days; they will sit wet, develop Botrytis, and either mold in the dry room or get jarred too wet and mold in the cure. **This is the entire argument for the blog post's existence.**

### Why Portland RH is so much higher than Caribou in the morning

Portland is on the coast (Casco Bay) and within ~5 miles of the Atlantic; sea-surface-temperature-driven moisture fluxes plus prevailing onshore flow keep September and October morning RH pinned above 85% until the first sustained cold snap. Caribou is ~220 miles inland at ~600 ft elevation; morning RH is still high (84–85%) but the *afternoon* RH drops to 63–64% (versus 64% in Portland), and Caribou's first sustained sub-50% RH days typically arrive in late September. The combined effect: the Portland/Coastal-Maine drying window is more hostile than the Caribou/Northern-Maine window by 2–4 weeks of "drying-friendly" weather in any given year.

---

## 3. Wet trim vs. dry trim

### Definitions

- **Wet trim** = remove all/most sugar and fan leaves *before* hanging to dry. Done at harvest or within hours of chop.
- **Dry trim** = remove only the largest fan leaves at harvest, hang the plant/branches to dry with most leaves still attached, then do the final manicure (sugar leaves, popcorn trim) after the buds have dried.

### Pros/cons (the consensus table, from Grow Weed Easy)

Grow Weed Easy (https://www.growweedeasy.com/wet-trim-vs-dry-trim-which-makes-better-cannabis) gives the cleanest decision framework:

| Trim method | Pros | Cons |
|---|---|---|
| **Wet trim** | Best if humidity is high (above 60% RH). Buds dry faster. Reduces mold risk in humid climates. Easier manicure of fresh leaves. | Dries *too* fast in low humidity (<50% RH). Can over-dry the outside while inside stays wet. Looks "tidier" but may lose some terpene richness. |
| **Dry trim** | Best if humidity is low (below 45–50% RH). Leaves slow moisture loss; buds "tighten up" and look denser. Buds feel more uniformly cured. | Not suitable if humidity is high — leaves trap moisture and create wet pockets that mold. Harder to get a clean manicure. |

The decision rule, per Grow Weed Easy: "**Trim before drying ('wet trim')** when you're worried about mold, you have high humidity (above 60% RH), there is poor air circulation, there's a lot of buds drying in a small space, or buds are taking too long to dry. **Trim after drying ('dry trim')** when you're not worried about mold, you have low humidity (below 45% RH), you want buds to be 'tighter' or more dense, or you want buds to dry more slowly."

**Nebula Haze's own split-test (Grow Weed Easy, 2019) found that dry-trimmed buds finished 0.5–3 days later, felt denser, sometimes smelled slightly different, and "often seem browner as if they've been curing for a while." Smoke-quality preference was strain-dependent and personal.** This is consistent with BudTrainer's conclusion that dry-trim yields the best terpene preservation when humidity is well-controlled, and with the observation that the 50–60% RH "middle band" is where growers split on preference.

BudTrainer's "BudTrainer Method" is a hybrid: **strip fan leaves at harvest, leave sugar leaves on through the dry, then manicure the sugar leaves after drying.** Recommended specifically for the 50–60% RH middle band. (https://www.budtrainer.com/blogs/learn/drying-cannabis)

### Maine-specific recommendation

**The Maine-relevant decision rule, in two lines:**
- **If you have active dehumidification and can hold the drying space at 55–60% RH (with brief excursions to 65% OK):** dry trim or partial-dry (BudTrainer Method). Better terpene preservation, tighter bud structure, less handling of wet sticky trichomes.
- **If you are drying in a Maine garage/basement with no mechanical dehumidification and ambient RH is 70–85% (the October default):** wet trim aggressively. Remove all fan leaves and at least 50% of the sugar leaves at harvest. The bud is going to dry slowly *anyway*; reducing leaf mass reduces the moisture reservoir and the surface area for Botrytis colonization. This is a tactical decision, not a quality preference.

The blog should present both paths and tell readers which is appropriate to their equipment budget. A wet trim in October Maine without active dehumidification is **not optional** — it's the only way to keep the harvest from rotting in the first 4 days.

---

## 4. Hanging methods

### Whole plant vs. branch vs. individual bud (BudTrainer summary)

| Method | Drying time | Terpene preservation | Space required | Best when |
|---|---|---|---|---|
| **Whole plant** (hang the entire inverted plant) | 12–14 days | Best | High | RH below 55%, plants under ~4 ft tall |
| **Branch-by-branch** (cut main stem into 12–18" branches, hang individually) | 10–12 days | Very good | Medium | RH 55–65%, balanced setup |
| **Flat drying rack** (trim individual buds off the branches, lay on a mesh rack) | 7–10 days | Good | Low | RH above 65%, wet-trimmed buds, limited space |

Source: https://www.budtrainer.com/blogs/learn/drying-cannabis (table derived from the same source's "Hanging Whole Plant vs Branches vs Grid Drying" section).

ILGM recommends branch-hanging as the home-grower default: "Cut your cannabis plant into 12-18-inch branches. Shorter segments are better for humid environments, while longer ones work for drier areas." (https://ilgm.com/resources/guides/a-beginners-guide-to-drying-cannabis)

### Maine-specific implications

- **Closet grow (1–4 plants, 4×4 tent, or converted closet):** branch-by-branch is the right default. Hang from wire hangers, clothes hangers with garden ties, or a clothesline strung between two wall hooks. Whole-plant hanging needs more vertical space than most closets provide; a 4-foot plant hung whole takes ~5 feet of vertical clearance and blocks airflow to anything behind it.
- **Garage / shed (typical Maine home-grow fallback for the October dry):** whole-plant is feasible if the garage has ceiling hooks or a beam at 7+ feet, and ambient humidity is 60–70%. Below 60% whole-plant is best; above 70% go to branches or racks.
- **Outdoor-to-indoor transition:** the most common Maine scenario. Outdoor plants get cut in early October, brought inside to dry. **The transport step is critical** — moving wet, dense outdoor colas from 80%+ outdoor RH to a 70% indoor space without active dehumidification is the most common cause of bud rot. Either (a) wet-trim hard *before* bringing inside, or (b) hang whole-plants for 24 hours outside in a covered, ventilated area (a barn lean-to, carport) to drop surface moisture first, then bring inside. Direct inside-hang is the failure mode.

### Airflow and space tradeoffs

- **One small oscillating fan, pointed at a wall, ceiling, or floor — NOT at the buds.** This is the most-cited common mistake in every source reviewed. Direct airflow on the bud surface dries the outside while the inside stays wet, creating the "case-hardening" pattern and the hay smell. BudTrainer: "Direct airflow dries the outside of buds while the inside stays wet, which traps chlorophyll and creates the harsh hay smell that most fast-dried cannabis suffers from." (https://www.budtrainer.com/blogs/learn/drying-cannabis)
- **Air exchange:** a passive air-exchange path (open door, gap under door, or a 4-inch duct fan pulling air through) is necessary to flush humid air out. BudTrainer recommends a small fan for circulation + passive exhaust.
- **Bud spacing:** 2–4 inches between branches minimum. Dense colas touching each other are the #1 mold-start site.

---

## 5. Drying environment setup

### Cardboard box (emergency, 1–2 plants)

- **When it works:** single-plant or two-plant harvest; harvest came early (light leak, hermie, weather emergency); no other option.
- **Setup:** punch 4–6 one-inch holes in the sides for passive airflow. Place a small hygrometer inside. Add a single mesh rack or hang one branch from a wire across the top. **Do not seal the box** — cardboard needs airflow to evacuate moisture.
- **What it doesn't do:** control humidity. If ambient is 75%+, the box will be 80%+ inside. Expect 14+ day dry, high mold risk, and probably some loss. Use only as a last resort.
- **Cost:** ~$0 (cardboard boxes are free from any hardware store) plus $10–30 hygrometer.
- **Maine fit:** late-October emergency chop with no equipment = cardboard box in a basement with a dehumidifier running in the room is the realistic minimum.

### Closet (typical home grow)

- **Setup:** a bedroom closet with the door replaced by a reflective curtain (or just left open 6–12"). Wire shelf or hang-line 6 inches from the ceiling. Small fan on low for indirect airflow. Hygrometer at bud level.
- **What it does well:** the *enclosed* volume limits moisture exchange with the rest of the house. A 4×4×8 ft closet = 128 cubic feet, which is small enough to dehumidify with a 30-pint home dehumidifier (see Section 6).
- **Cost:** $0–$50 if you already have the closet and a wire shelf.
- **Maine fit:** the default for most home growers. The single most important upgrade is a 30-pint dehumidifier in the closet (or in the room with the closet door open) plus a small fan.

### Grow tent in a room (most controllable)

- **Setup:** a small tent (2×2×4 or 2×4×4) set up *only* for drying, separate from any active flowering tent. Carbon filter + inline fan for air exchange. Standalone dehumidifier or mini-split inside.
- **What it does well:** sealed volume, light-proof, easy to set target RH and let the controller hold it.
- **Cost:** $80–$200 for a 2×2 or 2×4 tent; $50–$150 for a 4-inch inline fan with carbon filter. Most home growers already own these for the flowering tent; the marginal cost is the tent only.
- **Maine fit:** the right answer for anyone who already runs a flowering tent and has a second tent available. The single tent / multi-use alternative is acceptable but means you can't dry while a plant is still in late flower.

### Dedicated dry room (commercial / serious home)

- **Setup:** a basement room or converted bedroom with a mini-split, a 50–100 pint commercial dehumidifier (Quest, Andyen, AlorAir), a circulation fan, and a wall-mounted controller.
- **What it does well:** holds 4–8 plants in a controlled 60/60 environment regardless of outdoor conditions. Throughput for a personal-use grower doing 4–6 harvests/year.
- **Cost:** $300–$1,000+ (dehumidifier alone is $400–$1,000; mini-split $600+ if not already installed; controller $50–$200).
- **Maine fit:** overkill for a 1–2 plant home grow. Worth it for a 4–6 plant caregiver-scale operation. The existing `research-homegrow-keywords-2026.md` notes that Maine's caregiver model permits up to 6 mature plants per patient, which can put a serious home grower in the 4–6 plant range.

### Cardboard / hay / catnip smell — what each is telling you

- **Faint sweet hay smell during days 1–5:** normal. Chlorophyll is breaking down; terpenes haven't fully emerged.
- **Strong ammonia smell:** anaerobic conditions; buds are too wet; jar too soon or RH too high in the jar. *Immediate action*: dump the jar, re-dry 12–24 hours.
- **Sour or musty smell:** mold, usually Botrytis. *Immediate action*: cut out and discard the affected bud with a clean knife; do not rub it off (releases spores).
- **Cardboard / paper smell:** over-dried. Terpenes are gone. Recover moisture with a Boveda 62% pack or short exposure to a humidifier.
- **Catnip smell:** usually indicates drying at >70°F; terpenes have evaporated. Irreversible.

---

## 6. Active humidity control — dehumidifiers

### Refrigerant vs. desiccant technology

The cleanest technical comparison is Rinwang's 2026 buyer guide (https://www.rinwang.com/refrigerant-vs-desiccant-dehumidifier/), which references ASHRAE and the U.S. DOE definition.

| Decision area | Refrigerant (compressor) | Desiccant (wheel) |
|---|---|---|
| Drying method | Cools air below dew point; water condenses on cold coil | Adsorbs moisture on a desiccant wheel; wheel regenerated by heat |
| Best fit | Warm, humid spaces; moderate humidity targets | Cold spaces, very-low-dew-point targets |
| Capacity | Falls as temperature drops — many consumer units lose efficiency below 41–50°F (Rinwang FAQ) | Stable down to freezing and below |
| Energy use | Lower in warm, humid conditions (good operating efficiency) | Higher; needs heat to regenerate the wheel |
| Adds heat to room? | Yes (reheat of dried air) | Yes (regeneration heat) |
| Cost | $150–$500 home / $1,000+ commercial | $400+ home / $1,500+ commercial |

**Maine-relevant decision rule:**
- For a Maine basement or closet at 55–68°F in October: a refrigerant dehumidifier is the right technology. It's cheaper, the room is not cold enough to push a refrigerant unit out of its operating envelope, and the moisture load is moderate.
- A desiccant dehumidifier only becomes necessary if the drying space is in an unheated garage or outbuilding that drops below 50°F. For most Maine home growers that's not the case — the basement is at 55–60°F year-round, which is fine for a refrigerant unit.

### Sizing: pint/day (PPD) per room volume

GrowersHouse (https://growershouse.com/blogs/grow-room-dehumidification/best-dehumidifiers-for-grow-rooms-how-to-calculate-dehumidification-needs) gives the standard sizing rule: **(Number of plants) × (daily water use per plant in pints) = required dehumidifier PPD.** A flowering cannabis plant in late flower transpires roughly 0.5–1.0 gallons/day (= 4–8 pints). For a Maine home-grow *drying* space, the load is different — the moisture is coming off the harvested plant mass, not from transpiration. A practical rule: 1–2 pints per pound of wet harvest per day during the first 5 days, dropping to 0.5 pints/lb/day by day 10.

For a 4–6 plant harvest (assume 0.5–1 lb wet per plant = 2–6 lb wet total):
- **Day 1–5 peak load:** 2–12 pints/day, plus the ambient moisture the room is picking up.
- **A 30-pint dehumidifier is the minimum** for a 4–6 plant harvest in a closet or small room.
- **A 50-pint dehumidifier** is the comfortable size with margin for ambient humidity contribution.
- **70+ pints (Quest 70, AlorAir 70)** is the right size for a 2×4 or 2×4 tent or a small basement dry room.

GrowersHouse specifically calls out the **Quest 70** (https://growershouse.com/products/quest-70-pint-dehumidifier or equivalent on HTG Supply) as "a highly efficient hydroponic dehumidifier for small grow rooms, with each unit able to dehumidify roughly 75 ft² of crop area, depending on plant density and irrigation rates." For a drying room, the same 70-pint unit covers 75–150 sq ft of floor area depending on plant mass and ambient humidity.

### Top brands for home growers

| Brand | Pint range (home units) | Maine-relevant model | Verified price (June 2026) | Source URL |
|---|---|---|---|---|
| **Quest** (premium, commercial heritage) | 70–506 PPD | Quest 70, Quest 155, Quest CDG174 | Quest 335 = **$5,799.95** (HTG Supply) | https://www.htgsupply.com/products/quest-335-commercial-dehumidifier/ ; https://growershouse.com/blogs/grow-room-dehumidification/best-dehumidifiers-for-grow-rooms-how-to-calculate-dehumidification-needs |
| **Ideal Air** (entry/mid) | 30–180 PPD | Ideal Air 30–50 Pint | ESTIMATE $130–$250 | https://growershouse.com/blogs/grow-room-dehumidification/best-dehumidifiers-for-grow-rooms-how-to-calculate-dehumidification-needs |
| **Active Air** (entry/mid) | 60–190 PPD | Active Air 190 Pint | ESTIMATE $250–$400 | Same GrowersHouse source |
| **hOmeLabs / Frigidaire / Vivosun** (consumer, not cultivation-specific) | 30–50 PPD | Frigidaire 50-pint, hOmeLabs 50-pint | ESTIMATE $150–$300 (consumer Amazon pricing) | **Not verified on a manufacturer page in this brief.** The brand list is real (these are commonly recommended in r/microgrowery threads) but specific 2026 prices were not pulled. |
| **Aura Systems** | ~180 PPD | Aura 180 Portable | ESTIMATE $300–$500 | GrowersHouse |
| **Integra Boost** (desiccant, jar-level) | n/a (passive) | 8-gram 62% packs | $3–$5 each | Section 7 below |

**Consumer dehumidifier warning:** GrowersHouse and r/microgrowery both note that consumer dehumidifiers (Frigidaire, hOmeLabs, Vivosun, GE) are built for *comfort* dehumidification, not the sustained-run, low-temperature, controlled-space use a drying room requires. A consumer 50-pint unit will *work* in a Maine closet for a 2-plant harvest; it will not last as long as a Quest or Ideal Air under continuous 7-day operation. For a single annual harvest the consumer math works; for multiple harvests/year or a caregiver-scale operation, a Quest/Active Air/Ideal Air is the better lifetime cost.

### Energy use and noise

- A 50-pint consumer unit draws ~500–600 watts at peak (GrowersHouse: many consumer units are 4.5–6.5 pints/kWh). At 12 hours/day for 10 days = 60–72 kWh = **$15–$20** on Maine CMP rates (CMP residential 2026 rate ~$0.27/kWh — **ESTIMATE, not verified against the current CMP tariff**; the prior research brief noted CMP ~$0.25/kWh and Versant ~$0.22/kWh).
- A Quest 70 uses R410A refrigerant and a more efficient compressor; the per-day kWh is lower, but the unit cost is 2–3× a consumer unit.
- Noise: 50-pint consumer units run 45–55 dB; Quest units are quieter (40–48 dB). Important if the drying space is a bedroom closet.

### When you NEED a dehumidifier in Maine

**October through April, yes.** May through September is less clear-cut — coastal Maine summer RH is 75–85% morning, 55–65% afternoon, and a 30-pint consumer unit in the drying room will keep the space in the 55–60% range for the afternoon hours, but you'll still see overnight spikes. **A Maine home grower who dries indoors should plan to own a dehumidifier the same way they plan to own a drying rack: it's a required tool, not an upgrade.**

### Cost ranges (verified where possible)

- **30-pint consumer dehumidifier:** ESTIMATE $130–$200 (Amazon, Home Depot, Lowes) — not directly verified at a specific retailer URL for this brief; widely cited in r/microgrowery.
- **50-pint consumer dehumidifier:** ESTIMATE $180–$280. Frigidaire FFAD5033W1 ~$190 (ESTIMATE); hOmeLabs HME020031N ~$180 (ESTIMATE).
- **70-pint cultivation-grade (Quest 70, AlorAir 70, Andyen 70):** $500–$900. **Verified**: Quest 335 = $5,799.95 (HTG Supply, June 2026) — that's a much larger unit; the Quest 70 list is ~$700 (ESTIMATE based on GrowersHouse brand comparison).
- **Active Air 190 PPD (mid-tier):** $300–$500 ESTIMATE.
- **Ideal Air 70 (mid-tier):** $300–$500 ESTIMATE.
- **Integra Boost / desiccant-only solutions (jar-level, not room-level):** $30–$80 for the 5-gallon bucket kit (https://growershouse.com/products/integra-boost-5-gallon-bucket-with-30-desiccant-packs-curing-solution).

**Total Maine home-grower minimum drying setup cost (no existing equipment):**
- Closet rack: $20–$50
- Hygrometer: $10–$30
- 30-pint consumer dehumidifier: $130–$200
- Small fan: $15–$30
- Mason jars (12 wide-mouth quart): $20–$30
- Boveda 62% packs (24 × 8g): $40–$60
- **Total: ~$235–$400** to be properly equipped for a 1–2 plant home dry in Maine.

---

## 7. The Boveda 62 cure protocol

### What Boveda is (two-way humidity control)

**Boveda** is a saturated-salt-and-water packet in a semi-permeable membrane. "Boveda is based on the scientific principle that certain salts saturated with water will naturally add or remove humidity as needed to maintain a predetermined relative humidity (RH). Each RH level Boveda responds to ambient temperature and humidity by adding or removing moisture to maintain the predetermined RH printed on the Boveda." (https://www.dehumidify.com/boveda, the Hydrosorbent page — Hydrosorbent is the Boveda patent holder and primary distributor.)

**Integra Boost** is the plant-based equivalent (glycerin + water, no salt). "Our 2-way humidity control packs are made with just glycerin and water so they won't alter the flavors or aromas of your consumable products. 62% RH provides [optimal moisture]." (https://integra-products.com/)

**The two are functionally interchangeable.** THCFarmer community wisdom: "The Boveda versus Integra Boost debate splits the community 50/50. Boveda uses salt-based two-way humidity control, and some growers claim they detect a slight salt smell. Integra Boost is plant-based with no smell and includes indicator cards. Both work fine — it's personal preference." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)

### Why 62% RH (the "cigar humidor" sweet spot for cannabis)

The 62% target is the cigar-industry standard (Boveda's original market was cigar humidors), adopted by cannabis because it sits at the empirical "best expression of terpene + lowest mold risk" point.

- **BudTrainer:** "For long-term storage, sealed jars at 62% RH using Boveda packs preserve quality for 6 months or more." (https://www.budtrainer.com/blogs/learn/drying-cannabis)
- **THCFarmer:** "We're shooting for that sweet spot of 58-62% RH inside jars. Why these exact numbers? Science and painful experience from thousands of community grows." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)
- **Marijuana Packaging Boveda 62 vs 58 (2025):** "62% RH: Typically preserves a fuller terpene profile, maintaining more of the volatile compounds. 58% RH: Offers good terpene preservation with slightly reduced risk of degradation." (https://marijuanapackaging.com/blogs/questions/boveda-62-vs-58-which-is-better-for-cannabis-storage)

**The Boveda science page (dehumidify.com) also reports:** "Studies show that there is a 15% higher terpene & trichome retention when storing cannabis with Boveda as it creates and holds the ideal moisture content." (Vendor claim, not independently verified; cite as Boveda-stated figure, not as independent peer-reviewed finding.)

### The first-2-weeks intensive burp schedule

Two sources give nearly identical burp schedules:

**BudTrainer:**
- Days 1–10: burp 1–2× daily, 5–10 min each, using a small in-jar hygrometer, target 62% RH.
- After first week: burp every 2–3 days for the next 2 weeks.
- Total cure: 3–4 weeks minimum, some strains improve for 2–3 months.
- https://www.budtrainer.com/blogs/learn/drying-cannabis

**THCFarmer (week-by-week):**
- **Week 1 — "The Danger Zone"**: 2–3× daily, 10–15 min each. Goal: bring RH from initial 65–70% down to 62–65%. Major moisture redistribution. Peak mold risk. If RH hits 70%+, dump buds onto a drying screen for 30–60 min immediately.
- **Week 2 — Stabilization**: once daily, 5–10 min. RH should stabilize 62–63%. Chlorophyll breakdown accelerates; grass smell fades.
- **Weeks 3–4 — Sweet spot**: every other day, 2–5 min. RH holds 60–62%. Terpene development accelerates.
- **Weeks 5–8 — Maintenance**: twice/week or whenever RH > 62%, 1–2 min. Quality plateauing.
- **Week 8+ — Long-term storage**: weekly checks, monthly burps. Consider vacuum sealing, nitrogen flush, or just Boveda packs.
- https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/

**Critical insight from THCFarmer — when to add Boveda:** "**Add packs AFTER moisture stabilizes around 62%.** Adding too early masks moisture problems you need to address." (Same source.) This is the single most common Boveda mistake — tossing a pack in on day 1 because the jar reads 70% and the pack "should" bring it down. It won't, and it hides the underlying over-wetness.

### 62% vs. 58% vs. 65% — the alternatives

| RH% | Best for | Tradeoff |
|---|---|---|
| **58%** | Long-term storage (6+ months); humid climates; bulk commercial | Slightly firmer texture; marginally lower terpene retention vs. 62% |
| **62%** | Curing; medium-term storage; most connoisseur-grade home grows | Best terpene preservation; safe for 6+ months; the default |
| **65%** | Bulk commercial where weight retention is the priority; dense indica colas that dry unevenly | Higher mold risk; stickier texture; some growers like it for "fresh" feel |

Source: Marijuana Packaging Boveda 62 vs 58 comparison (https://marijuanapackaging.com/blogs/questions/boveda-62-vs-58-which-is-better-for-cannabis-storage); Integra Boost product page (https://integra-products.com/).

**Maine-specific recommendation:** **62% is the right default for Maine home growers** because most Maine home-grower cures are 2–4 months (one harvest through winter), not 12+ months. The 58% advantage only emerges past the 6-month mark. The 65% alternative is unnecessary in Maine's dry winter indoor air (heated indoor winter RH is naturally 20–30%, well below 58%) — the Boveda is doing extra work in winter, so the headroom of 62% is comfortable rather than risky.

### Cost per pack, how long they last (verified)

From Hydrosorbent's Boveda product page (https://www.dehumidify.com/boveda, retrieved June 2026):

| Pack size | Price (USD) | Protects | Notes |
|---|---|---|---|
| **4g** | $8.50 (5-pk) / $15.00 (10-pk) / $33 (25-pk) | Up to ½ oz of flower | Small bags and medicine containers |
| **8g** | $10.50 (5-pk) / $20 (10-pk) / $45 (25-pk) | Up to 1 oz | **The home-grow standard for a quart mason jar** |
| **67g** | $6.50 each / $25 (4-pk) / $67 (12-pk) | Up to 1 lb | Large bags and mason jars; bulk |
| **320g** | $25 each | Up to 5 lb | Cultivator scale |

**Per-jar cost for a 1-oz jar:** one 8g pack = $2.10 (10-pack) to $2.00 (25-pack). A typical 4-plant Maine home harvest (~1 lb cured) needs 16 8g packs for the cure = $32–$40.

**Pack lifespan:** "Boveda … lasts months in a sealed container; just replace when packet becomes rigid." (dehumidify.com) THCFarmer corroborates: "Replace them when they get crispy, usually every 2-6 months depending on how hard they're working." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)

---

## 8. Mason jar curing vs. Grove Bags

### Traditional mason jar burp method

- **Container:** wide-mouth quart mason jars (Ball, Kerr). **Fill to 75% capacity maximum** (THCFarmer: "75% full is absolute maximum, but 60-70% is the ideal range. You need air space for proper gas exchange, room for gentle shaking to prevent compression, and space that prevents dead zones where mold starts.").
- **In-jar monitoring:** one mini hygrometer per jar. Caliber IV (~$25) or Govee WiFi (~$30) are the THCFarmer community recommendations. Budget option: Amazon 12-pack of mini hygrometers at ~$3 each (less accurate).
- **Burp schedule:** see Section 7 (THCFarmer week-by-week).
- **Cost:** Ball/Kerr wide-mouth quart = $1–$2 each. Caliber IV hygrometer = $25. 12-pack mini hygrometers = $25–$40. 8g Boveda 62% packs = $2 each.

**Maine winter advantage:** heated indoor air in Maine is naturally 20–30% RH December through March. Mason jars in a Maine home in January will *gain* moisture through the lid seal if ambient is above jar RH; they will *lose* moisture if ambient is below. Boveda 62% packs compensate for this. The traditional burp method works year-round in Maine; the deep winter just requires more attention to in-jar RH.

### Grove Bags TerpLoc® technology (modern alternative)

Grove Bags (https://grovebags.com/pages/technology) make a multilayer film pouch with six engineered elements: **Durability** (puncture resistance), **Anti-Static** (preserves trichomes), **Odor** (high barrier), **Humidity** (works with oxygen layer for active humidity control), **Oxygen** (diffuses O₂ out to limit oxidation), and **UV** (opacity blocks UV that converts THC to CBN).

**Grove's own performance claims:**
- "Our Bags Retain Up To **37% More Terpenoids And 7% More Cannabinoids** Than Traditional Packaging." (vendor claim, linked to a 3rd-party study at https://grovebags.com/blogs/news/tagged/case-study)
- "Independent testing has shown that cannabis stored in TerpLoc had max. THC levels 7.25% higher than other storage options." (vendor claim, https://grovebags.com/pages/technology)
- "Grove Bags are designed to keep between 58% and 62% RH when stored to maintain and enhance its color, consistency, aroma, and flavor." (vendor claim, same source)

**Vendor usage instructions:** "The biggest factor for getting the most out of your Grove Bag is to make sure your cannabis is properly dry and the inner moisture is both released and regulated. If you think the cannabis is too wet still burp it in the bag for 3-4 days. Once your cannabis is dry heat seal the bag and store it in a cool dark room for best results. There is no need to purchase a 2-way humidity packet or oxygen scrubber." (https://grovebags.com/pages/technology)

**Vendor claim about no-burp cure:** "We recommend using our bags for curing to the point of consumption. TerpLoc® bags don't need to be burped during the cure. Pressure will build up in the head space of the bag." (Same source.)

**Independent verification:** limited. Reddit r/microgrowery (https://www.reddit.com/r/microgrowery/comments/1iho30l/has_anyone_tried_these_terploc_bags_from_grove/) — mixed reviews; common thread: "let weed dry to 10-12% moisture level, only fill bags 3/4 full, buy child proof bags for a better zip lock design." THCFarmer community: "Grove bags are the new player with mixed reviews but promising technology. Their TerpLoc membrane supposedly maintains perfect conditions without burping or Boveda packs. The community jury is still out." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)

**Cost:** Grove Bags are $1–$2 per bag (sizing from 1 oz to 1 lb). They are not as cheap as mason jars, but they are the only single-step alternative to jar+burp+Boveda for a home grower.

### When to use which

- **Mason jars + Boveda + burp:** the safe default. Most-published guidance, most-forgiving if you make a mistake, lowest absolute cost if you already have the jars. 5+ years of storage with proper technique.
- **Grove Bags Terploc:** the simpler workflow (no burping, no separate Boveda purchase, no hygrometer-per-jar). Best for growers who are confident their dry was complete to 10–12% moisture. Less forgiving if buds are over-wet at bag time.
- **For Maine:** start with mason jars and Boveda for the first 2–3 harvests to learn the cure. Switch to Grove Bags once you have a feel for the 10–12% moisture endpoint (post-snap-test). Either approach handles Maine's dry winter indoor air well.

---

## 9. Drying time and how to know when it's done

### Drying time by method

| Method | Drying time (at 60°F / 60% RH) | Source |
|---|---|---|
| Whole plant | 12–14 days | BudTrainer |
| Branch-by-branch | 10–12 days | BudTrainer, ILGM |
| Trimmed buds on a flat rack | 7–10 days | BudTrainer |

**Maine-specific adjustment:** in 70–85% ambient RH without active dehumidification, *all* of these stretch to 14–18 days, and the longer the dry the higher the mold risk. **This is the single most important reason the blog recommends a dehumidifier.**

### The "stem snap" test

The canonical readiness test. BudTrainer: "Pick a thin lateral branch, take it between your fingers, and bend it. If it bends without snapping, drying is not finished. Wait 24 to 48 hours. If it snaps with a clean 'crack' sound, drying is complete. If the buds feel dry and brittle to the touch and crumble easily, drying went too far." (https://www.budtrainer.com/blogs/learn/drying-cannabis)

**The trap:** dense indica colas can have a *crispy outside + wet core* at 7 days, where a thin stem on the outside snaps but the inner bud is still 15%+ moisture. THCFarmer: "If they're so brittle they shatter, you've possibly over-dried and are looking at a harsh final product." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)

### The "bounce test" (tactile readiness)

A spongy, slightly springy bud is the right texture for jarring. THCFarmer: "Perfect cure feels slightly spongy and springs back when you gently squeeze a bud. Too wet feels damp, stays compressed when squeezed, and the stems still bend instead of snapping. Too dry crumbles between your fingers and stems snap like brittle twigs with no flexibility at all." (Same source.)

**Combined test:** small stems snap, larger outer stems still bend slightly, outer bud surface feels dry to the touch but the bud interior is slightly spongy. Weight loss of 70–80% from the wet-chop weight is the final confirm. (BudTrainer)

### Moisture meter (precision option)

A pin-style or capacitive moisture meter (used in the wood and food industries) can be pressed against a bud to read moisture content. The cannabis-specific application is **not yet standardized**; cannabis moisture meters do exist (e.g., the **Wagner MMC220** "Moisture Meter for Cannabis/Hemp" at ~$350) but most home growers use the snap test instead.

- **Pin-style (capacitive, ~$20–$50 on Amazon):** reads 5–40% moisture on a wood scale. Reading 10–12% in the bud center is the cannabis cure target. **Caveat**: not calibrated for cannabis; readings are relative, not absolute.
- **Cannabis-specific (Wagner MMC220, $350+):** calibrated for cannabis/hemp. Worth it for caregiver-scale operations doing 4+ harvests/year.

**For the Maine home-grower brief, recommend the snap test as the primary, the in-jar hygrometer (Boveda 62% + Caliber IV) as the secondary, and skip the moisture meter unless the reader is commercial-scale.**

---

## 10. Common Maine drying problems and fixes

### Hay smell (dried too fast / chlorophyll locked in)

- **Cause:** drying under 7 days, or at temperature above 70°F, or at humidity below 45% RH with strong direct airflow. Chlorophyll breaks down enzymatically over time; fast drying interrupts the breakdown and the hay/grassy smell is permanent.
- **BudTrainer:** "Buds are dry to the touch in 4 to 5 days, smell flat or 'hay-like,' and feel brittle. The grass-clipping smell is the giveaway." (https://www.budtrainer.com/blogs/learn/drying-cannabis)
- **Maine trigger:** Maine October indoor humidity is *high*, not low — so Maine hay-smell is rare from over-fast drying. The more common Maine hay-smell cause is *temperature*: a closet next to a wood stove or furnace vent can easily hit 75–80°F and fast-dry the crop. **The fix in Maine is to move the drying space away from heat sources.**
- **Fix mid-dry:** Stop ventilation. Move buds to a smaller more-humid space (closed Tupperware with a damp paper towel, opened daily). Cure aggressively with 62% RH Boveda. Some terpenes are gone permanently; you can rescue most of the smoke quality with a 3–4 week cure.
- **Prevention:** Target 60–68°F. Keep drying space away from wood stoves, furnace vents, and direct afternoon sun.

### Bud rot during dry (humidity too high, no airflow)

- **Cause:** Humidity above 70% for more than 48 hours, no airflow, or dense buds with poor internal ventilation. *Botrytis cinerea* (gray mold) is the dominant pathogen.
- **Symptoms:** White fuzzy patches between buds, sour or musty smell, dense colas with discolored centers. Source: Punja, "Emerging diseases of *Cannabis sativa*," *Pest Management Science* 77(9) (2021), cited in BudTrainer ref [3].
- **Maine trigger:** the #1 drying failure mode in Maine October. Ambient humidity 75–85% morning, 60–70% afternoon, with overnight spikes to 90%+.
- **Fix mid-dry:** Inspect every bud. Cut out and discard moldy material with a clean knife (do not rub — releases spores). Increase airflow and drop humidity to 55% for 24 hours to dry remaining material faster. **If mold has reached more than 20% of the harvest, you are likely going to lose most of it. Mold is a hard fail.**
- **Prevention:** Never let humidity sit above 65% for more than 24 hours. Use a dehumidifier with a humidistat (not a manual one). Pre-harvest defoliation removes excess plant material and improves airflow inside dense colas. Wet-trim in October Maine (see Section 3).

### Over-dry (parchment feel, harsh smoke)

- **Cause:** Drying environment too aggressive; buds finished at <8% moisture instead of the 10–12% cure target.
- **Symptoms:** Crumbly buds; stems shatter rather than snap; smoke is harsh and throat-burning; little or no aroma.
- **Maine trigger:** less common in October but *very* common in Maine January–March when heated indoor air drops to 15–25% RH. A dry room that worked in October becomes an over-dry death trap in February.
- **Fix mid-dry:** Boveda 62% packs (or 65% for severe over-dry) for 24–48 hours, then re-check. **Boveda packs are stabilizers, not fixers** (THCFarmer: "they can't resurrect over-dried bud or save soaking wet flower"). Some terpenes are gone permanently; some moisture can be recovered; smoothness improves with extended cure.
- **Prevention:** Monitor weight loss (target 70–80% of wet weight). Check the in-jar hygrometer daily in the first week. Reduce drying time if your environment is naturally <50% RH.

### Mold in jars (cured before dry was complete)

- **Cause:** Buds jarred at >15% moisture; anaerobic conditions in the jar; ammonia smell is the first sign.
- **Symptoms:** Ammonia smell, white fuzz on buds, sticky-wet feel, gray discoloration spreading from stem outward.
- **Maine trigger:** the second-most-common Maine drying failure. Occurs when the grower reads a 60/60 protocol, achieves 60/60 in their basement for 4 days, *but* the buds were still 18% moisture inside (case-hardening trap), jars them too early, and the trapped internal moisture migrates out into the jar headspace over days 3–7 in the jar.
- **Fix mid-jar:** Open jars and let buds breathe 6–12 hours, then re-jar with fresh Boveda 62% packs. If ammonia smell returns in 24 hours, buds need another 24–48 hours of hanging time. If visible mold, discard the entire jar.
- **Prevention:** In-jar hygrometer is non-negotiable. Wait until small stems snap cleanly (not bend, not shatter). When in doubt, wait one more day.

### Cardboard / hay / catnip smell summary

See Section 5. Each smell is a diagnostic; the brief should teach the reader to interpret the smell as feedback, not as "my weed smells weird."

---

## 11. Long-term storage

### Mason jar with Boveda (1+ year)

- 1-quart wide-mouth mason jar filled 60–75% with cured bud, one 8g Boveda 62% pack on top, sealed, in a cool dark place (closet, basement).
- Check monthly. Replace Boveda when it goes rigid (every 2–6 months).
- THCFarmer: "Mason jars remain the tried and true option. Check monthly, add a 62% Boveda, keep them in a dark, cool place, and you're golden for months." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)
- 1+ year preservation is realistic; THCFarmer: "at 6 months, check for RH drift from your target, smell changes indicating terpene loss, visual degradation like browning or trichome damage, and the rare but possible mold if storage conditions weren't perfect."

### Grove Bags (1+ year)

- TerpLoc® bag, filled 75%, heat-sealed, in a cool dark place. No Boveda needed (vendor claim).
- Storage life claim: "increases the shelf life of your cannabis. We have had some customers experiment with intentionally longer curing periods inside our bags." (https://grovebags.com/pages/technology)
- **Vendor claim caveat:** the 37%-more-terpenoids / 7%-more-cannabinoids figure is linked to Grove's own commissioned 3rd-party study; no independent replication has been published in a peer-reviewed source as of this brief. Cite as vendor-stated, not as independently confirmed.

### Vacuum seal (2+ year)

- FoodSaver or chamber vacuum sealer; bags at 0% O₂.
- THCFarmer: "Vacuum sealing removes oxygen (THC's biggest enemy), enables 6+ month storage without degradation, and provides professional-grade preservation." (https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/)
- **Caution:** vacuum-sealing fresh-dried bud (still 10–12% moisture) is fine; vacuum-sealing over-wet bud is a fast track to anaerobic mold. Buds must be fully cured first.
- Cost: entry-level FoodSaver ~$50; chamber vac (the only kind worth using for cannabis) ~$300+.

### Freezer for long-term (controversial)

- THCFarmer: "**Never freeze your flower** — trichomes become brittle and shatter off at the slightest movement." (Same source.) This is the consensus.
- The minority position: vacuum-seal *first*, then freeze. The bag prevents trichome shatter and the vacuum prevents freezer burn. Acceptable for 1+ year storage if vacuum-sealed properly.
- For Maine home growers: the freezer is a tempting answer (cold, dark) but the trichome-shatter risk on handling is real. Not the recommended path.

### Maine winter humidity considerations (heated indoor air is DRY)

This is the *under-appreciated* Maine-specific storage problem. Heated indoor air in Maine December through March is naturally 15–25% RH. Buds stored in mason jars in a Maine living room in January will *lose* moisture through the rubber seal and drop below 58% RH in-jar if no Boveda is present.

**Maine winter rule:** always store with Boveda 62% in the jar. Check in-jar hygrometer weekly in January–March. If in-jar RH drops to 55%, the pack is exhausted; replace it. If in-jar RH drops below 50%, the buds are over-drying; add a fresh pack and consider moving the jar to a less-heated room (basement is often 35–45% RH in winter — still requires Boveda but more stable than a living room).

---

## 12. Equipment cost summary (June 2026)

| Item | Verified price | Source / note |
|---|---|---|
| **Dehumidifier 30-pint consumer** (Frigidaire / hOmeLabs / Vivosun) | $130–$200 ESTIMATE | Not directly verified at retailer URL; widely cited in r/microgrowery |
| **Dehumidifier 50-pint consumer** | $180–$280 ESTIMATE | Same |
| **Dehumidifier 70-pint cultivation** (Quest 70 / AlorAir 70 / Andyen 70) | $500–$900 ESTIMATE | Mid-tier; Quest 335 = **$5,799.95** (HTG Supply, https://www.htgsupply.com/products/quest-335-commercial-dehumidifier/) for size reference |
| **Dehumidifier 190-pint mid-tier** (Active Air, Aura Systems) | $300–$500 ESTIMATE | https://growershouse.com/blogs/grow-room-dehumidification/best-dehumidifiers-for-grow-rooms-how-to-calculate-dehumidification-needs |
| **Hygrometer / thermometer (mini, for jar or closet)** | $3 each (Amazon 12-pk) to $25–$30 each (Caliber IV, Govee WiFi) | https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/ |
| **Mason jars (wide-mouth quart, Ball or Kerr)** | $1–$2 each (12-pack $12–$18) | Common retailer; not specifically verified |
| **Boveda 4g (5/10/25-pack)** | $8.50 / $15.00 / $33 | https://www.dehumidify.com/boveda (Hydrosorbent / Boveda patent holder) |
| **Boveda 8g (5/10/25-pack)** | $10.50 / $20 / $45 | Same source |
| **Boveda 67g (1/4/12/20-pack)** | $6.50 / $25 / $67 / $98 | Same source |
| **Boveda 320g (cultivator)** | $25 each | Same source |
| **Grove Bags TerpLoc** (1 oz to 1 lb sizes) | $1–$2 per bag | https://grovebags.com/ |
| **Moisture meter (pin-style, Amazon)** | $20–$50 | ESTIMATE; widely listed |
| **Moisture meter (Wagner MMC220, cannabis-specific)** | $350+ | ESTIMATE; vendor-direct |
| **Drying tent (2×2×4 or 2×4×4, no controller)** | $80–$200 | ESTIMATE; common retailer |
| **Drying tent (2×4 with inline fan + carbon filter)** | $200–$400 | ESTIMATE; common retailer |
| **Small oscillating fan (for indirect airflow)** | $15–$30 | ESTIMATE; common retailer |
| **Integra Boost 8g 62% (Amazon)** | $4–$5 per pack (~$45–$55 for 12-pack) | https://www.amazon.com/Integra-Boost-Humidity-Control-Percent/dp/B0B52GNKP2 |

**Maine home-grower minimum drying + cure budget (1–2 plant harvest, no existing equipment):** $235–$400. See Section 6 breakdown.

**Maine home-grower proper drying + cure budget (4–6 plant harvest, no existing equipment):** $500–$900 (cultivation-grade dehumidifier, tent, hygrometers, 30+ jars, 30+ Boveda packs).

---

## 13. Caveats — what I couldn't verify

1. **The "Caribou" vs. "Portland" labeling on currentresults.com.** The page (https://www.currentresults.com/Weather/Maine/humidity-by-month.php) presents two per-month tables; the values under the "Caribou" caption match the coastal/Portland climate pattern, and the values under the "Portland" caption match the more continental/Caribou pattern. The assignment in this brief is based on the climate match (Caribou is inland and drier; Portland is coastal and more humid). **The writer must re-verify the per-month numbers directly against the NCEI Climate Normals portal (https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) at publish time.** This is a meaningful risk: a single-digit-percentage-point difference in morning RH (84% vs 87% in October) changes the recommended dehumidifier size.
2. **Augusta, Lewiston, and Farmington monthly RH.** No NCEI station-level page with per-month RH was located in the time available. The brief reports Portland (KPWM) and Caribou (KCAR) — both first-order NWS stations — and uses Bangor (KBGR) via the Wanderlog/MERRA-2 cross-check. Augusta, Lewiston, and Farmington RH are ESTIMATED from regional interpolations and are not defensible for citation. If the blog wants city-specific humidity for those three, the writer needs to either (a) pull the NCEI per-station page directly, or (b) cite the regional range without claiming a specific number.
3. **Maine September/October 2026 real-time anomalies.** All values cited are normals (1991–2020 or 1961–1990). The 2026 season may run 5–10 percentage points above or below these norms depending on prevailing weather. The blog should hedge any specific forecast claim.
4. **Cannigma's drying/curing page.** Returned 403/Cloudflare at scrape time and is therefore not used as a source. The Cannigma "When to Transplant Cannabis Outdoors" page (used in `research-when-to-start-seeds-maine-2026.md`) is unaffected. The drying-curing content gap from Cannigma is filled by BudTrainer (which cites the same primary literature) and Grow Weed Easy.
5. **Grove Bags 37% / 7% performance claims.** Vendor-stated, linked to a 3rd-party study on the Grove Bags site, not independently published in a peer-reviewed source. Cite as "Grove Bags reports" or "in Grove Bags' commissioned 3rd-party study," not as established fact.
6. **Boveda "15% higher terpene & trichome retention" claim.** Same caveat — vendor-stated on the Hydrosorbent site (https://www.dehumidify.com/boveda). Cite as vendor claim, not as independent finding.
7. **The Cannigma 60°F soil-temperature threshold (used in `research-when-to-start-seeds-maine-2026.md`)** was verified against Cannigma in that brief. The drying-curing equivalent Cannigma content was not separately verified here because Cannigma's URL was blocked; BudTrainer and ILGM both confirm the 60/60 target with independent language and primary citations, so the substitution is sound.
8. **Maine electricity rates for dehumidifier cost math.** The earlier `research-homegrow-keywords-2026.md` noted CMP ~$0.25/kWh and Versant ~$0.22/kWh. The 2026 tariff was not re-verified for this brief; the cost math in Section 6 uses ~$0.27/kWh as a current ESTIMATE.
9. **Vivosun / hOmeLabs / Frigidaire specific 2026 prices.** Cited as ESTIMATES based on common Amazon/Home Depot pricing. Not pulled at a specific retailer URL in this brief.
10. **"Maine October 70%+ humidity" framing from `research-homegrow-keywords-2026.md`.** Now quantitatively supported (Portland morning Oct = 86%; afternoon Oct = 64%; Caribou morning Oct = 84%; afternoon Oct = 63%). The original framing was conservative — the actual *morning* humidity is in the mid-80s, not just 70%+. The blog should use "75–85% morning, 60–70% afternoon" rather than "70%+," and avoid overstating the afternoon.
11. **The 6-page cluster plan from `research-homegrow-keywords-2026.md` mentioned a "/blog/indoor-cannabis-grow-setup-maine-cost-2026" page (gap #4).** This brief is a logical precursor to that page; cross-link from the dehumidifier-sizing section (Section 6) to the planned indoor-setup page when it ships.
12. **Maine Municipal preemption / state law context.** Out of scope for this brief (covered in the pillar page). Do not re-research here.

---

## Appendix A. Source list (deduplicated)

**Primary / federal / state climate data**
- NCEI U.S. Climate Normals — https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals
- NCEI "When to Expect Your Last Spring Freeze" — https://www.ncei.noaa.gov/news/last-spring-freeze
- NWS Caribou, ME — https://www.weather.gov/car (frost/freeze data already cited in `research-when-to-start-seeds-maine-2026.md`)
- NWS Gray, ME — https://www.weather.gov/gyx
- NWS Forecast Office Bangor CLI product — https://forecast.weather.gov/product.php?site=NWS&issuedby=BGR&product=CLI&format=ci&version=1&glossary=0 (used to confirm current Bangor RH ranges in CLI bulletins)

**Maine per-station humidity (secondary, derived from NCEI)**
- currentresults.com Maine humidity by month — https://www.currentresults.com/Weather/Maine/humidity-by-month.php (1961–1990 normals via NCEI/World Data Center for Meteorology)
- weather-and-climate.com Portland humidity by month — https://weather-and-climate.com/average-monthly-Humidity-perc,portland-maine-us,United-States-of-America (1990–2020 normals via Foreca)
- Wanderlog Bangor November weather — https://wanderlog.com/weather/58806/11/bangor-weather-in-november (NASA MERRA-2 2010–2020)

**Cannabis drying & curing culture (peer-reviewed + community-canonical)**
- BudTrainer, "How to Dry Weed: The Complete Cannabis Drying Guide (2026)" — https://www.budtrainer.com/blogs/learn/drying-cannabis (May 2026 update; cites Booth & Bohlmann 2019, Trofin et al. 2012, Punja 2021, Ross & ElSohly 1999)
- Grow Weed Easy (Nebula Haze), "Wet Trim vs. Dry Trim" — https://www.growweedeasy.com/wet-trim-vs-dry-trim-which-makes-better-cannabis
- ILGM (Stoney Tark), "A Beginner's Guide To Drying Cannabis" — https://ilgm.com/resources/guides/a-beginners-guide-to-drying-cannabis
- THCFarmer (logic), "Curing Cannabis: Signs It's Time to Stop Burping Your Jars" — https://www.thcfarmer.com/learn/curing-cannabis-signs-its-time-to-stop-burping-your-jars.552/
- Marijuana Packaging, "Boveda 62% vs 58%" — https://marijuanapackaging.com/blogs/questions/boveda-62-vs-58-which-is-better-for-cannabis-storage

**Boveda & Integra Boost (vendor / product literature)**
- Hydrosorbent / Boveda product page — https://www.dehumidify.com/boveda
- Hydrosorbent Boveda 4g product — https://www.dehumidify.com/boveda-1gm-packets
- Hydrosorbent Boveda 8g product — https://www.dehumidify.com/boveda-62-8-gm-packets
- Hydrosorbent Boveda 67g product — https://www.dehumidify.com/boveda-62-67gm-packets
- Integra Boost product page — https://integra-products.com/
- Amazon Integra Boost 62% 4-pack — https://www.amazon.com/Integra-Boost-Humidity-Control-Percent/dp/B0B52GNKP2
- Hydrobuilder Integra Boost product — https://hydrobuilder.com/products/integra-boost-humidiccant-packs

**Grove Bags (vendor / product literature)**
- Grove Bags TerpLoc® technology page — https://grovebags.com/pages/technology
- Grove Bags case study index — https://grovebags.com/blogs/news/tagged/case-study

**Dehumidifier technology & sizing**
- GrowersHouse dehumidifier sizing guide — https://growershouse.com/blogs/grow-room-dehumidification/best-dehumidifiers-for-grow-rooms-how-to-calculate-dehumidification-needs
- GrowersHouse brand comparison (Quest, Ideal Air, Active Air, Surna, Aura, Integra Boost) — same page
- HTG Supply Quest 335 product page (price reference) — https://www.htgsupply.com/products/quest-335-commercial-dehumidifier/
- Hydrobuilder Quest dehumidifier collection — https://hydrobuilder.com/collections/quest
- LED Grow Lights Depot Quest collection — https://www.ledgrowlightsdepot.com/collections/quest
- Rinwang, "Refrigerant vs Desiccant Dehumidifier" (2026) — https://www.rinwang.com/refrigerant-vs-desiccant-dehumidifier/ (cites ASHRAE Handbook Ch. 24, U.S. DOE dehumidifier definition)
- Learn.hydrobuilder.com grow room dehumidifier sizing — https://learn.hydrobuilder.com/grow-room-dehumidifier-sizing/

**Internal site sources**
- /home/steve/maine-dispensary-guide/research-homegrow-keywords-2026.md (Cluster H, "Maine October 70%+ humidity is the killer")
- /home/steve/maine-dispensary-guide/research-when-to-start-seeds-maine-2026.md (NCEI/UMaine/MOFGA frost and harvest calendar context)
