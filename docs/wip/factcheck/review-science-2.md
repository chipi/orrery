# Fact-check: /science propulsion explainers (batch 2)
**Date:** 2026-07-14
**Checker:** Claude Sonnet 4.6 (automated, web-verified)
**Files checked:**
- `i18n-src/en-US/science/propulsion/ion-drive.json`
- `i18n-src/en-US/science/propulsion/solar-sail.json`
- `i18n-src/en-US/science/propulsion/nuclear-thermal.json`
- `i18n-src/en-US/science/propulsion/fusion-propulsion.json`
- `i18n-src/en-US/science/propulsion/antimatter-propulsion.json`
- `i18n-src/en-US/science/propulsion/laser-sail.json`

---

## ion-drive.json

### Claims checked

**Isp range 3,000–10,000 s** — CONFIRMED. Standard textbook range for gridded ion / Hall thrusters; consistent with NASA NSTAR data (Isp ~3,100 s) at the low end and advanced Hall thrusters at the high end.

**Xenon as propellant** — CONFIRMED. Correct characterisation (heavy, inert, easy to ionise).

**NSTAR on Deep Space 1 and Dawn** — CONFIRMED. Both correct.

**NEXT-C on DART (2021)** — CONFIRMED. DART launched November 24, 2021, was the first flight of NEXT-C. However: the article's claim that NEXT-C "flew on the DART mission" is technically accurate but slightly misleading in context — DART mission controllers chose not to actually use the NEXT-C thruster operationally (they had sufficient hydrazine), though it was commissioned and checked out on orbit. This is a nuance, not a factual error in what the article says.

**Dawn's three NSTAR engines ran for 2,009 days** — CONFIRMED. Multiple NASA/JPL sources cite ~2,000 days total ion engine runtime.

**Dawn delta-v ~11.5 km/s** — CONFIRMED. NASA sources confirm 25,700 mph ≈ 11.5 km/s, more than any prior spacecraft by propellant fraction.

**Dawn: "only craft to orbit two bodies"** — CONFIRMED. Dawn is explicitly described by NASA/JPL as the first (and still only) spacecraft to orbit two extraterrestrial bodies.

**Hall-effect thruster: standard for satellite station-keeping** — CONFIRMED. Accurate characterisation of commercial satellite propulsion landscape.

**Thrust ~0.6 N for a 12 kW Hall thruster** — PLAUSIBLE. State-of-the-art 12 kW Hall thrusters (e.g., SPT-140, PPS-5000) produce roughly 0.35–0.58 N; 0.6 N is at the optimistic upper end but not wrong for this class. No finding raised.

**VERDICT: No red or orange findings.**

---

## solar-sail.json

### Claims checked

**IKAROS — "first spacecraft to fly by solar-sail propulsion in interplanetary space," launched May 2010** — CONFIRMED. JAXA IKAROS launched May 21, 2010; reached Venus vicinity using solar sail propulsion; first confirmed interplanetary solar-sail flight.

**IKAROS sail: 196 m², 7.5 micrometres thick** — CONFIRMED. JAXA official data: 196 m² (14×14 m square), 7.5 µm polyimide. Consistent with multiple sources.

**LightSail 2 (2019) — "first spacecraft to raise its orbit using only solar-sail thrust"** — CONFIRMED. Planetary Society confirmed orbit-raising mission success July 31, 2019.

**NEA Scout CubeSat (launched 2022 on Artemis I) — "first American interplanetary solar sail mission, though contact was not established after deployment"** — CONFIRMED. Launched November 16, 2022 on Artemis I; contact never established; mission lost.

**ACS3 mission (2024) — "demonstrated a larger composite boom structure for future scaling"** — CONFIRMED. ACS3 launched April 23, 2024; successfully deployed sail August 24, 2024. The characterisation as "demonstrating a larger composite boom structure" is accurate; ACS3's mission is technology demonstration of carbon-fibre composite booms.

**Radiation pressure 800 m² sail at 1 AU ≈ 5 millinewtons** — Plausible order of magnitude. Solar radiation pressure at 1 AU ≈ 9.08 µN/m²; for 800 m², force ≈ 7.3 mN assuming perfect reflectivity (cos θ = 1). The article says ~5 mN, which is consistent with a more realistic reflectivity/angle. No issue.

**VERDICT: No red or orange findings.**

---

## nuclear-thermal.json

### Claims checked

**LH2/LOX Isp ~450 s, NTR Isp 800–1,000 s** — CONFIRMED. Standard values. NTR Isp range of 800–1,000 s consistent with NERVA XE-Prime and projected engine designs.

**NTR reactor core temperature 2,500–3,000 K** — CONFIRMED. Solid-core NTR operating range. Consistent with NERVA engineering literature.

**NERVA/Rover programme (1955–1973), ground-tested 22 reactor configurations** — MOSTLY CONFIRMED with a nuance:
- The 1955 start date is accurate for Project Rover (the AEC/military agreement to pursue nuclear rockets). NERVA itself as a NASA-AEC joint program was established in 1960. The article conflates Rover and NERVA into one "NERVA/Rover programme (1955–1973)" which is a reasonable shorthand, not a factual error.
- "22 reactor configurations" tested — sources vary; the commonly cited figure ranges from ~20 reactors across the Rover/NERVA program. This is in the right ballpark.

**Phoebus-2A in 1968 ran at 4,100 MW for over 12 minutes** — CONFIRMED WITH MINOR NOTE: The peak power was 4,082 MW (sources say "4,100 MW" is a rounded figure). The total run was 32 minutes, with 12.5 minutes above 4,000 MW. The article says "over 12 minutes" which correctly characterises the sustained high-power portion. Accurate.

**"enough to lift the engine off the stand under its own thrust"** — CONFIRMED. The Phoebus-2A's thrust at peak power was sufficient to lift its own weight. This is cited in multiple NERVA/Rover histories.

**NERVA XE-Prime demonstrated a flight-weight engine configuration** — CONFIRMED. The XE (Experimental Engine) Prime test series (1969) demonstrated flight-representative design elements.

**"Programme management estimated that a flight-ready engine was within two years of the programme's 1972 cancellation"** — MOSTLY CONFIRMED. NERVA was cancelled January 1973 (Nixon administration decision), not 1972. The article says "1972 cancellation" in this sentence, while elsewhere the article correctly says "1973." This is an internal inconsistency — the cancellation date is stated as 1972 in one place and the programme end is given as 1973 in the title dates "1955–1973". The actual cancellation date was January 5, 1973.

**Soviet RD-0410 "also called IRGIT"** — CONFIRMED. The Soviet nuclear thermal rocket programme produced the RD-0410; IRGIT is one of the names used for it. This is accurate.

**DRACO "aimed to demonstrate an NTR engine in orbit by the late 2020s"** — CONFIRMED. Original goal was in-orbit demonstration by 2027.

**DRACO "cancelled in the 2026 US federal budget"** — SUBSTANTIALLY CORRECT but requires clarification of timing. The FY2026 President's Budget Request (released May 2025) zeroed out DRACO funding. DARPA separately announced cancellation in late June 2025. The article's phrasing "cancelled in the 2026 US federal budget" is technically accurate (it refers to fiscal year 2026 budget, which was the FY2026 budget request released in 2025). This is standard budget-cycle terminology and is not an error, though it could be read as "happened in calendar year 2026" which is misleading. The actual announcement was June 2025.

**VERDICT: One orange finding on the internal date inconsistency (1972 vs 1973).**

### 🟠 Finding
- Claim: "within two years of the programme's 1972 cancellation"
- Fact: NERVA was cancelled January 5, 1973 (Nixon administration). The same article correctly states the programme ran "1955–1973" in its header. "1972 cancellation" in this sentence is an internal inconsistency and factually wrong — the formal end was January 1973.
- Source: Wikipedia NERVA; NASA historical records.

---

## fusion-propulsion.json

### Claims checked

**Project Daedalus: "British Interplanetary Society in the 1970s"** — CONFIRMED. Study ran 1973–1978. The article says "1970s" which is accurate (the study spanned the mid-to-late 1970s, starting 1973).

**Daedalus: D/He-3 pellets ignited by electron beams, ~250 times per second** — CONFIRMED. The Daedalus design specified electron-beam-driven inertial confinement fusion at roughly 250 Hz. Accurate.

**Daedalus mass: ~54,000 tonnes** — CONFIRMED. Multiple sources confirm ~54,000 tonnes total mass at launch (overwhelmingly propellant).

**Daedalus speed: ~12% of the speed of light** — CONFIRMED.

**Daedalus target: Barnard's Star (5.9 light-years), ~50-year flyby** — CONFIRMED. All consistent with published BIS study results.

**"Project Icarus, a follow-on study begun in 2009"** — CONFIRMED. Project Icarus started 2009 as a BIS/Tau Zero follow-on. Accurate.

**NIF December 2022 ignition — "first fusion reactor anywhere on Earth to produce more energy than it consumed"** — NEEDS NUANCE (noted but not flagged as orange): The article says "the long-sought 'ignition' threshold was crossed at the National Ignition Facility in December 2022 for laser-driven inertial confinement." The NIF experiment on December 5, 2022 achieved scientific breakeven (3.15 MJ fusion energy out vs 2.05 MJ laser energy delivered to the capsule). However, the facility consumed ~300 MJ to produce the laser energy — so wall-plug efficiency was far from breakeven. The article says "sustained net-positive output at useful scale remains unsolved" immediately after, which correctly contextualises the NIF result. The framing is defensible though the article slightly overstates what NIF achieved by saying the "ignition threshold was crossed" without noting the facility's actual energy input. This is a common and accepted characterisation in the press; the qualification "at useful scale remains unsolved" saves it. NOTED but not flagged 🟠.

**ITER: "international tokamak under construction in France, designed to demonstrate net energy but will not produce electricity"** — CONFIRMED. ITER is under construction in Cadarache, France; it is designed to demonstrate Q=10 (10x energy out vs in for the plasma), but will not generate electricity. Accurate.

**VERDICT: No red or orange findings.**

---

## antimatter-propulsion.json

### Claims checked

**"CERN's Antiproton Decelerator produces roughly 10 to 15 nanograms of antihydrogen per year"** — INACCURATE. This is a significant overstatement of production quantities.

Sources confirm:
- CERN produces on the order of ~1–10 nanograms of *antiprotons* per year, not antihydrogen.
- Antihydrogen is much harder to make — CERN has produced and trapped only *millions to billions of antihydrogen atoms*, which corresponds to femtograms (10^-15 g), not nanograms.
- The commonly cited figure for total CERN antimatter (antiprotons) production is ~1–10 nanograms per year at the Antiproton Decelerator; some sources cite ~10 nanograms.
- The article specifically says "CERN's Antiproton Decelerator produces roughly 10 to 15 nanograms of antihydrogen per year" — the "antihydrogen" specification is wrong. The AD produces antiprotons, not antihydrogen. Antihydrogen is synthesised in small experiments (ALPHA, ATRAP, etc.) in quantities of thousands to millions of atoms — orders of magnitude less than nanograms.
- The actual production of antihydrogen at CERN is in the range of ~10^7 atoms/year in ALPHA experiments, which is ~10^-14 grams (tens of femtograms), not nanograms.

**"cost/gram estimates in the range of tens to hundreds of trillions of dollars per gram"** — PLAUSIBLE ORDER OF MAGNITUDE for antiprotons. This is consistent with energy-cost estimates based on CERN's power consumption per antiproton produced.

**Storage: Penning trap for antiprotons, magnetic bottle for antihydrogen** — CONFIRMED. Both are used; the article correctly distinguishes the two approaches.

**"record for stored antihydrogen is measured in minutes to hours for small numbers of atoms"** — OUTDATED / INACCURATE. ALPHA experiment at CERN has stored antihydrogen for significantly longer periods. As of 2016, ALPHA-2 stored antihydrogen for up to 1000 seconds (~16 minutes). By 2023, ALPHA-g was using trapped antihydrogen for gravity measurements, implying storage routinely in the minutes-to-hours range for small numbers of atoms. The characterisation "minutes to hours" is actually now somewhat accurate (ALPHA stores atoms for hundreds of seconds to ~15 minutes routinely), so this is borderline acceptable for an explainer. NOTED but the article's framing is close enough to current records that it is not clearly wrong.

**VERDICT: One orange finding on the antihydrogen production claim.**

### 🟠 Finding
- Claim: "CERN's Antiproton Decelerator produces roughly 10 to 15 nanograms of antihydrogen per year"
- Fact: The AD produces antiprotons (not antihydrogen). Antiproton production at CERN is ~1–10 nanograms/year. Antihydrogen synthesis (in experiments like ALPHA) produces far less — on the order of millions of atoms/year, which is femtograms (10^-14 g), not nanograms. The article conflates antiprotons with antihydrogen and states "antihydrogen" where it should say "antiprotons" (or "antimatter").
- Source: CERN Antiproton Decelerator documentation; search results confirming ~1–10 ng/year antiproton production vs. much smaller antihydrogen quantities.

---

## laser-sail.json

### Claims checked

**Robert Forward worked out mathematics in the 1980s** — CONFIRMED. Forward's laser-sail papers date to the early 1980s (1984 paper "Roundtrip Interstellar Travel Using Laser-Pushed Lightsails" and the Starwisp concept from 1985). Accurate.

**Breakthrough Starshot announced 2016, by Yuri Milner, backed by Stephen Hawking** — CONFIRMED. Announced April 12, 2016. Accurate.

**StarChip probes: "a few grams on sails roughly four metres across"** — NEEDS CLARIFICATION: The article says "a few grams on sails roughly four metres across." The Breakthrough Starshot design specifies the sail at ~4 m × 4 m (consistent with sources, including the canonical 2018 system model paper), but the *combined* mass of sail + StarChip is targeted at under 1 gram (not "a few grams"). The StarChip itself targets <1 gram; total system mass targets ~1 gram. "A few grams" overstates the target mass by a factor of a few.

**Laser array: ~100 gigawatts** — CONFIRMED. The 100 GW figure is the standard Breakthrough Starshot specification across all authoritative sources.

**Speed: ~20% of the speed of light** — CONFIRMED. Standard Starshot parameter.

**Transit time to Proxima Centauri (~4.24 light-years): ~20 years** — CONFIRMED. At 0.2c, 4.24 ly / 0.2 = ~21 years. Accurate.

**"30-year technology development effort"** — CONFIRMED. Breakthrough Starshot explicitly described as a multi-decade effort.

**Acceleration phase: "thousands of g over minutes"** — CONFIRMED. At 100 GW pushing ~1 g to 0.2c, the required acceleration is indeed thousands of g over a few minutes. Accurate.

**"100 gigawatts is roughly the output of 100 large nuclear power plants"** — CONFIRMED. A large nuclear plant is roughly 1 GW electric; 100 × 1 GW = 100 GW. Accurate comparison.

**VERDICT: One yellow finding on spacecraft mass.**

### 🟡 Finding
- Claim: "StarChip probes of a few grams on sails roughly four metres across"
- Fact: The Breakthrough Starshot design targets total spacecraft mass (sail + chip) of ~1 gram or less, not "a few grams." The 4-metre sail dimension is correct. "A few grams" overshoots the design target by ~3×.
- Source: Breakthrough Initiatives official descriptions; 2018 Starshot system model (Kulkarni et al.); multiple press sources confirming <1 g total mass target.

---

## Summary table

| Article | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|
| ion-drive | 0 | 0 | 0 | 0 |
| solar-sail | 0 | 0 | 0 | 0 |
| nuclear-thermal | 0 | 1 | 0 | 1 |
| fusion-propulsion | 0 | 0 | 0 | 1 |
| antimatter-propulsion | 0 | 1 | 0 | 1 |
| laser-sail | 0 | 0 | 1 | 0 |

### 🟠 Findings requiring fixes

1. **nuclear-thermal** | 🟠 | "within two years of the programme's 1972 cancellation" → NERVA was cancelled January 5, 1973, not 1972. The same article correctly states "1955–1973" in the programme date range; this sentence is internally inconsistent.

2. **antimatter-propulsion** | 🟠 | "CERN's Antiproton Decelerator produces roughly 10 to 15 nanograms of antihydrogen per year" → The AD produces antiprotons, not antihydrogen. Antihydrogen synthesis produces far smaller quantities (femtograms/year, not nanograms). Should read "antiprotons" (and the quantity of 10–15 ng/year is a plausible upper-bound for antiproton capture, though some sources cite 1–10 ng).

### 🟡 Findings (minor, advisory)

3. **laser-sail** | 🟡 | "StarChip probes of a few grams on sails roughly four metres across" → Starshot's total spacecraft mass target is ~1 gram or less (sail + chip combined), not "a few grams." Sail size of ~4 m is correct.

### 🔵 Notes (contextual, no fix required)

- **nuclear-thermal**: DRACO "cancelled in the 2026 US federal budget" — technically correct (FY2026 budget, proposed May 2025, confirmed DARPA departure June 2025). Calendar year 2025 for the announcements, but budget-cycle phrasing "2026 federal budget" is conventional and not wrong. As a small improvement, adding "FY" would remove ambiguity.
- **fusion-propulsion**: NIF "ignition threshold crossed" slightly overstates the December 2022 result (scientific breakeven vs capsule input energy, but far from wall-plug breakeven). The follow-up sentence "sustained net-positive output at useful scale remains unsolved" adequately contextualises it; no fix needed.
- **antimatter-propulsion**: "record for stored antihydrogen measured in minutes to hours" — now broadly accurate given ALPHA's ~1000-second storage records; not flagged.

---

*Sources consulted: NASA/JPL Dawn mission pages, NERVA Wikipedia + NTRS papers, JAXA IKAROS mission overview, Planetary Society LightSail 2 reports, NEA Scout NASA page, ACS3 NASA mission page, SpaceNews DRACO cancellation article, DARPA DRACO Wikipedia, Project Daedalus Wikipedia + BIS sources, NIF/DOE ignition announcement, CERN Antiproton Decelerator documentation, Breakthrough Starshot Wikipedia + official site + 2018 system model (arXiv:1805.01306).*
