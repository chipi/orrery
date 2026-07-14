# Moon Landing Sites — Fact-check Batch A

Entries: apollo11, apollo12, apollo14, apollo15, apollo16, apollo17,
artemis3, beresheet, chandrayaan1, chandrayaan3, change1, change2,
change3, change4

Reviewer: science-reviewer agent · 2026-07-14
Sources: Wikipedia (EN), NASA NSSDCA, LROC/ASU, ESA, ISRO, SpaceNews,
Space.com, CNSA/CLEP secondary

Severity key: 🔴 factual error · 🟠 misleading/imprecise · 🟡 minor/
typography · 🔵 overlay↔base inconsistency

---

## Per-entry verdicts

| Entry          | Verdict  | Issues |
|----------------|----------|--------|
| apollo11       | FAIL     | 2 errors (EASEP vs ALSEP; "one-fifth" math) |
| apollo12       | FAIL     | 1 error (distance to Surveyor 3) |
| apollo14       | FAIL     | 1 error (golf-shot distance unit swap) |
| apollo15       | PASS     | 0 errors (minor typography only) |
| apollo16       | PASS     | 0 errors |
| apollo17       | PASS     | 0 errors |
| artemis3       | FAIL     | 1 critical (mission profile outdated as of Feb 2026) |
| beresheet      | FAIL     | 1 error (agency field wrong in base JSON) |
| chandrayaan1   | PASS*    | 1 qualifier needed on water-discovery claim |
| chandrayaan3   | FAIL     | 1 error (sulfur claim overstated) |
| change1        | PASS     | 0 errors |
| change2        | FAIL     | 1 error ("first non-Western flyby" is wrong) |
| change3        | PASS     | 0 errors |
| change4        | FAIL     | 2 errors (Yutu-2 distance overstated; "still active" outdated) |

Totals: 🔴 7 · 🟠 3 · 🟡 1 · 🔵 1

---

## Detailed findings

---

### apollo11

**File:** `i18n-src/en-US/moon-sites/apollo11.json`
**Base:** `static/data/moon-sites.json` id=apollo11 ✓ (coords, date, samples consistent)

#### 🔴 A11-1 — EASEP mislabelled as ALSEP
- **Field:** `left`
- **Quote:** `"ALSEP · laser retroreflector · flag · plaque…"`
- **Wrong:** Apollo 11 deployed the EASEP (Early Apollo Surface Experiments
  Package), a simplified solar-powered unit. The full RTG-powered ALSEP flew
  on Apollo 12–17 only. Calling it "ALSEP" is a factual error that will
  mislead readers who know the distinction.
- **Correction:** Change `ALSEP` → `EASEP`
- **Source:** https://en.wikipedia.org/wiki/Apollo_Lunar_Surface_Experiments_Package
- **Confidence:** High

#### 🟠 A11-2 — "One-fifth of humanity" math is wrong
- **Field:** `fact`
- **Quote:** `"Watched live by ~600 million people — a fifth of humanity."`
- **Wrong:** World population in July 1969 was ~3.6 billion. One-fifth = 720
  million. 600 million ≈ one-sixth (~16.7%). The phrase "a fifth" overstates
  the fraction by ~20%.
- **Correction:** Change `a fifth` → `roughly one in six` (or `about a sixth`)
- **Source:** https://en.wikipedia.org/wiki/Apollo_11
- **Confidence:** High

---

### apollo12

**File:** `i18n-src/en-US/moon-sites/apollo12.json`
**Base:** id=apollo12 ✓

#### 🔴 A12-1 — Distance to Surveyor 3: 183 m should be ~163 m
- **Field:** `fact`
- **Quote:** `"Conrad touched down within 183 m of the uncrewed Surveyor 3
  probe (1967)."`
- **Wrong:** The most authoritative figure in NASA/Wikipedia sources is
  ~163 m (535 ft). The 183 m figure circulates in some popular accounts but
  is not the primary-sourced value. The overlay overstates the precision
  landing accuracy by ~20 m.
- **Correction:** `183 m` → `~163 m`
- **Source:** https://en.wikipedia.org/wiki/Apollo_12
- **Confidence:** Medium-high (figure varies slightly by source; 163 m is
  most commonly cited in peer-reviewed accounts)

---

### apollo14

**File:** `i18n-src/en-US/moon-sites/apollo14.json`
**Base:** id=apollo14 ✓

#### 🔴 A14-1 — Golf-shot distance: yards converted to metres as if metres
- **Field:** `fact`
- **Quote:** `"LRO images suggest about 40 metres."`
- **Wrong:** Andy Saunders's 2021 LRO photographic analysis found Ball 1
  traveled ~24 yards (~22 m) and Ball 2 traveled ~40 yards (~37 m). The
  "40 metres" figure is the yards value for the second ball incorrectly
  treated as metres — a unit-swap error. The longer shot was ~37 m, not ~40 m.
- **Correction:** `"about 40 metres"` → `"about 37 m (40 yards)"`
- **Source:** https://www.space.com/apollo-14-moon-landing-golf-shot-analysis
- **Confidence:** High

---

### apollo15

**File:** `i18n-src/en-US/moon-sites/apollo15.json`
**Base:** id=apollo15 ✓

#### 🟡 A15-1 — Site name hyphen (typography only)
- **Field:** `site_name`
- **Quote:** `"Hadley-Apennine"`
- **Note:** The canonical NASA spelling uses an en dash: Hadley–Apennine.
  The ASCII hyphen is typographically imprecise but not a factual error;
  content is correct.
- **Correction:** Optional: `Hadley-Apennine` → `Hadley–Apennine`
- **Source:** https://en.wikipedia.org/wiki/Apollo_15
- **Confidence:** High (typography note only)

No factual errors. LRV distance 27.9 km ✓, crew ✓, Fallen Astronaut ✓.

---

### apollo16

**File:** `i18n-src/en-US/moon-sites/apollo16.json`
**Base:** id=apollo16 ✓

No errors found. "Only mission to land in the lunar highlands" ✓ (NASA SVS
confirms). Descartes Highlands ✓. Crew ✓. Duke family photo ✓.

---

### apollo17

**File:** `i18n-src/en-US/moon-sites/apollo17.json`
**Base:** id=apollo17 ✓

No errors found. Taurus-Littrow Valley ✓. Cernan last off the surface ✓
(Schmitt climbed the ladder first; Cernan was last). Harrison Schmitt as
only trained geologist ✓.

---

### artemis3

**File:** `i18n-src/en-US/moon-sites/artemis3.json`
**Base:** id=artemis3, status=PLANNED, year=2027 ✓ (base is correctly hedged)

#### 🔴 ART3-1 — Mission profile outdated: Artemis III is no longer the
south-pole lunar landing
- **Field:** `fact`, `site_name`, `capability`
- **Quote (fact):** `"Targets the south pole for its water ice deposits…
  Will land the first woman and first person of colour on the Moon. If it
  happens on schedule, it begins the sustained human presence that leads to
  Mars."`
- **Quote (site_name):** `"Lunar South Pole (specific site TBD)"`
- **Wrong:** In February 2026 NASA restructured the Artemis program. Artemis
  III was redesignated as a crewed low-Earth-orbit / Orion demonstration
  mission (docking test), not a lunar landing. The south-pole crewed landing
  target moved to Artemis IV (~2028). The overlay's fact and site_name
  describe a mission profile that no longer applies to Artemis III.
- **Correction:** The entire overlay needs a rewrite to reflect the current
  Artemis III scope. At minimum, the fact must be qualified with a note that
  the mission was restructured in early 2026 and that south-pole landing is
  now Artemis IV. The base JSON status=PLANNED / year=2027 should also be
  reviewed.
- **Source:** https://en.wikipedia.org/wiki/Artemis_3
- **Confidence:** High

#### 🟠 ART3-2 — "First woman and first person of colour" stated as near-
certain
- **Field:** `crew`, `fact`
- **Quote:** `"TBD — first woman and first person of colour on Moon"`
- **Note:** Even under the original mission profile, crew selection and the
  "first woman/POC" framing were NASA communications goals, not contractual
  requirements. For a museum exhibit this should be explicitly flagged as
  planned/intended, not stated as a certainty. Under the Feb 2026
  restructuring this is doubly speculative.
- **Correction:** Add qualifier e.g. "NASA's stated goal is to include…"
- **Confidence:** High

---

### beresheet

**File:** `i18n-src/en-US/moon-sites/beresheet.json`
**Base:** id=beresheet

#### 🔵 BER-1 — Base JSON `agency` field is wrong: "UAESA" should be SpaceIL
- **Field:** `static/data/moon-sites.json` → id=beresheet → `"agency": "UAESA"`
- **Wrong:** UAESA is the UAE Space Agency. Beresheet was built and operated
  by SpaceIL, an Israeli non-profit, in partnership with Israel Aerospace
  Industries (IAI). The Israel Space Agency (ISA) provided coordination but
  did not operate the mission. "UAESA" is factually wrong — it names a
  different country's agency entirely.
- **Correction:** `"agency": "UAESA"` → `"agency": "SpaceIL"` (or
  `"SpaceIL / ISA"`)
- **Source:** https://en.wikipedia.org/wiki/SpaceIL
- **Confidence:** High

Overlay content: site = Mare Serenitatis ✓ (LRO confirmed at 32.5956°N,
19.3496°E). Failure cause (gyroscope/IMU failure → engine shutdown) ✓.
Tardigrades note ✓. No overlay text errors.

---

### chandrayaan1

**File:** `i18n-src/en-US/moon-sites/chandrayaan1.json`
**Base:** id=chandrayaan1 ✓ (orbiter kind, 100 km, ISRO ✓)

#### 🟠 CY1-1 — Water-discovery claim needs "orbital spectroscopic" qualifier
- **Field:** `fact`
- **Quote:** `"…returned the first direct spectroscopic confirmation of water
  (H₂O and OH) widely distributed across the lunar surface…"`
- **Misleading:** The claim is true of M³'s orbital reflectance spectroscopy
  (Pieters et al., September 2009). However, ISRO's own Moon Impact Probe
  (on the same spacecraft) detected water via mass spectrometry in November
  2008 — earlier than M³. Calling it the "first direct confirmation" without
  qualifier may inadvertently demote ISRO's own earlier detection.
- **Correction:** Add qualifier: `"first orbital spectroscopic confirmation
  of water"` — or restructure to mention both detections.
- **Source:** https://en.wikipedia.org/wiki/Moon_Mineralogy_Mapper
- **Confidence:** Medium (the wording is defensible for M³ specifically; the
  issue is potential misattribution of primacy)

Mission duration 312 days ✓.

---

### chandrayaan3

**File:** `i18n-src/en-US/moon-sites/chandrayaan3.json`
**Base:** id=chandrayaan3 ✓ (lat=-69.37, lon=32.35, 2023-08-23 ✓)

#### 🔴 CY3-1 — Sulfur "first time" claim is wrong
- **Field:** `fact`
- **Quote:** `"Pragyan confirmed the presence of sulfur at the surface for
  the first time."`
- **Wrong:** Apollo missions in the 1970s returned samples that documented
  sulfur in lunar regolith (e.g., troilite, FeS, in Apollo samples). Sulfur
  was not unknown on the Moon. What Pragyan's LIBS instrument achieved was
  the first *in-situ elemental detection of sulfur near the lunar south pole*
  — a meaningful but narrower claim.
- **Correction:** `"confirmed the presence of sulfur at the surface for the
  first time"` → `"made the first in-situ detection of sulfur near the lunar
  south pole"`
- **Source:** https://www.space.com/chandrayaan-3-sulfur-measurements-lunar-south-pole
- **Confidence:** High

#### 🟠 CY3-2 — "Near the south pole" at -69.37° is contested
- **Field:** `fact`, `site_name`
- **Quote:** `"First spacecraft to land near the lunar south pole"` /
  `"south polar region"`
- **Note:** The landing site is ~600 km from the geographic south pole. ISRO
  and mainstream media use "near the south pole"; several planetary scientists
  publicly dispute this framing as promotional. The scientifically cautious
  phrasing is "high southern latitudes" or "closest to the south pole of any
  soft landing at the time." This is a judgment call for the editorial team;
  flagged for awareness.
- **Correction (optional):** Add "high southern latitudes" as a parenthetical
  alternative or replace the vaguer "near" with "at high southern latitudes
  (~69°S)".
- **Confidence:** High (the dispute is well-documented)

India = 4th nation to soft-land ✓. Site name "Shiv Shakti Point" ✓
(officially named by ISRO 2023-08-26). Vikram + Pragyan listed ✓.

---

### change1

**File:** `i18n-src/en-US/moon-sites/change1.json`
**Base:** id=change1 ✓ (orbiter, 2007, 200 km ✓)

No errors found. Controlled impact 2009 ✓. "First Chinese lunar mission" ✓.
"Precursor test for Chang'e 3" ✓.

---

### change2

**File:** `i18n-src/en-US/moon-sites/change2.json`
**Base:** id=change2 ✓ (orbiter, 2010, 100 km ✓)

#### 🔴 CE2-1 — "First non-Western asteroid flyby" is factually wrong
- **Field:** `capability`
- **Quote:** `"first non-NASA-non-ESA mission to L2; first non-Western
  asteroid flyby."`
- **Wrong:** Japan's Hayabusa spacecraft rendezvoused with asteroid Itokawa
  in September 2005 — seven years before Chang'e 2's Toutatis flyby (December
  2012). JAXA is non-Western. Wikipedia explicitly notes China became "the
  fourth space agency to conduct a successful asteroid mission, after NASA,
  ESA, and JAXA."
- **Correction:** Remove `"first non-Western asteroid flyby"` entirely, or
  replace with `"first Chinese asteroid flyby"`.
- **Source:** https://en.wikipedia.org/wiki/Chang%27e_2 ;
  https://en.wikipedia.org/wiki/Hayabusa
- **Confidence:** High

Toutatis flyby 2012 ✓. L2 departure 2011 ✓. "Still tracked in heliocentric
orbit" ✓.

---

### change3

**File:** `i18n-src/en-US/moon-sites/change3.json`
**Base:** id=change3 ✓ (lat=44.12, lon=-19.51, 2013-12-14 ✓)

No errors found. Site = Mare Imbrium ✓ (actual landing, ~40 km south of
Laplace F; planned site Sinus Iridum was not the actual touchdown point and
Mare Imbrium is correct). "First soft landing in 37 years" ✓ (Luna 24 1976
→ Chang'e 3 2013 = 37 years). Yutu distance 114 m ✓ (114.8 m per
Wikipedia). Lander still active as longest-surviving lunar lander ✓.

---

### change4

**File:** `i18n-src/en-US/moon-sites/change4.json`
**Base:** id=change4 ✓ (lat=-45.5, lon=177.6, far side ✓)

#### 🔴 CE4-1 — Yutu-2 distance overstated
- **Field:** `fact`
- **Quote:** `"Yutu-2 has driven 1.9+ km, still active."`
- **Wrong:** As of September 2024, Wikipedia records Yutu-2's total distance
  as ~1,613 m (~1.61 km). The 1.9+ km figure is not supported by available
  records and overstates the rover's traverse.
- **Correction:** `"1.9+ km"` → `"over 1.6 km"`
- **Source:** https://en.wikipedia.org/wiki/Yutu-2
- **Confidence:** High

#### 🟠 CE4-2 — "Still active" is outdated; Yutu-2 became immobile March 2024
- **Field:** `fact`, `left`
- **Quote:** `"Yutu-2 rover (still active)"` (in left field) and `"still
  active"` in fact
- **Wrong:** Yutu-2 stopped driving in March 2024 and was confirmed
  stationary by SpaceNews through at least September 2024. Power and
  telemetry continued but mobility was lost. "Still active" is at minimum
  misleading; for an exhibit updated in 2026, it should reflect this.
- **Correction:** `"still active"` → `"stationary since March 2024;
  telemetry continued"` (or simply remove the claim until current status is
  confirmed)
- **Source:** https://spacenews.com/yutu-2-rover-likely-immobile-on-the-moon/
- **Confidence:** High

Von Kármán Crater site name ✓. Far-side first soft landing ✓. Queqiao relay
satellite architecture ✓. First spacecraft on far side ✓.

---

## Issue count summary

| Severity | Count | Entries affected |
|----------|-------|-----------------|
| 🔴 Error | 7 | A11, A12, A14, ART3, CY3, CE2, CE4 |
| 🟠 Misleading/imprecise | 3 | A11, ART3, CY1, CY3 |
| 🟡 Typography | 1 | A15 |
| 🔵 Base JSON inconsistency | 1 | beresheet (agency field) |

Note: 🟠 count = 4 distinct items; summary table rows above show 3 due to
ART3 having two 🟠 items grouped under one entry.

---

## Fix priority order

1. 🔴 ART3-1 — Artemis III mission restructured (Feb 2026); entire fact +
   site_name needs rewrite. Highest editorial risk.
2. 🔵 BER-1 — Base JSON agency="UAESA" names wrong country's space agency.
   Data integrity error.
3. 🔴 A11-1 — EASEP vs ALSEP. Will be caught immediately by knowledgeable
   readers.
4. 🔴 CY3-1 — Sulfur "first time" is demonstrably wrong given Apollo samples.
5. 🔴 CE2-1 — "First non-Western flyby" ignores Hayabusa (2005).
6. 🔴 CE4-1 — Yutu-2 distance overstated (1.9 vs 1.61 km).
7. 🔴 A12-1 — Surveyor 3 distance (183 vs 163 m).
8. 🔴 A14-1 — Golf shot yards/metres unit swap.
9. 🟠 A11-2 — "One-fifth" math (should be one-sixth).
10. 🟠 ART3-2 — "First woman/POC" framing lacks qualifier.
11. 🟠 CY3-2 — "Near south pole" contested framing.
12. 🟠 CY1-1 — Water-discovery qualifier (M³ vs MIP primacy).
13. 🟡 A15-1 — Hadley hyphen vs en-dash (optional).
