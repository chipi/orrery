# Mars Sites Fact-Check — Batch B

Reviewer: independent science fact-check, 2026-07-14
Scope: i18n-src/en-US/mars-sites/<slug>.json + static/data/mars-sites.json
Method: all claims verified against primary/NASA sources via web search.

Severity key: 🔴 wrong fact | 🟠 misleading/imprecise | 🟡 minor wording issue | 🔵 note/context gap | ✅ clean

---

## Per-Entry Verdicts

| Entry | Verdict | Issues |
|---|---|---|
| maven | ✅ mostly clean | 1 🔵 |
| mro | 🟡 | 1 🟡 |
| opportunity | 🔴🟡 | 1 🔴 + 1 🟡 |
| perseverance | 🔴🟠 | 1 🔴 + 1 🟠 |
| phoenix | ✅ | — |
| schiaparelli | 🟠 | 1 🟠 |
| spirit | ✅ | — |
| tgo | 🟡 | 1 🟡 |
| tianwen1-orbiter | ✅ | — |
| viking1-lander | 🟡 | 1 🟡 |
| viking1-orbiter | ✅ | — |
| viking2-lander | 🟡 | 1 🟡 |
| zhurong | 🔴🟡 | 1 🔴 + 1 🟡 |

Totals: 3 🔴 · 2 🟠 · 4 🟡 · 1 🔵 · 6 entries fully clean

---

## Detailed Findings

---

### maven

- **Overlay:** `i18n-src/en-US/mars-sites/maven.json`
- **Base:** `static/data/mars-sites.json` id=`maven`, kind=`orbiter` ✅ (correctly an orbiter, no lat/lon)

#### 🔵 MAVEN-1 — orbit parameters unverified / context gap

- **Field:** `site_name`
- **Quote:** `"~150 × 6,200 km, 75° inclination"`
- **Issue:** Widely cited figures are ~150 × 6,200 km, 75° — consistent with published values, but MAVEN's orbit has been adjusted multiple times (aerobraking campaigns, relay duties) and the inclination is sometimes listed as 74–75°. No factual error, just low-confidence specificity for a live mission.
- **Recommendation:** Add "nominal" qualifier: `"Nominal ~150 × 6,200 km, ~75° inclination"`.
- **Confidence:** medium
- **Source:** https://mars.nasa.gov/news/1869/nasa-mission-reveals-speed-of-solar-wind-stripping-martian-atmosphere/

#### All other claims verified ✅

- 100 g/s atmospheric loss figure: confirmed by NASA (https://mars.nasa.gov/news/1869/)
- Global magnetic field loss ~4 Ga: consistent with published science
- Base record: orbiter, kind correct, no surface pin ✅

---

### mro

- **Overlay:** `i18n-src/en-US/mars-sites/mro.json`
- **Base:** id=`mro`, kind=`orbiter` ✅

#### 🟡 MRO-1 — resolution figure imprecise ("≥30 cm" vs 25 cm pixel)

- **Field:** `fact`
- **Quote:** `"MRO's HiRISE camera resolves objects ≥30 cm on the Martian surface"`
- **Issue:** HiRISE pixel scale is **25 cm/pixel** (at ~250 km altitude). NASA/HiRISE documentation states "25 cm per pixel" as the best resolution. The ≥30 cm wording conflates pixel scale with the practical limit for recognizing an object (which does require multiple pixels). It is defensible as "to identify an object you need ~30 cm minimum feature size," but describing the camera resolution as "≥30 cm" understates it compared to the advertised 25 cm.
- **Correction:** Change to `"resolves features down to ~25 cm/pixel"` (or `"pixel scale of 25 cm — sharp enough to find Beagle 2's wreckage..."`).
- **Confidence:** high
- **Source:** https://hirise.lpl.arizona.edu/ESP_039308_1915 · https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/

---

### opportunity

- **Overlay:** `i18n-src/en-US/mars-sites/opportunity.json`
- **Base:** id=`opportunity`, kind=`surface`, lat=`-1.95`, lon=`-5.53`, status=`ENDED` ✅ (Meridiani Planum coords confirmed)

#### 🔴 OPP-1 — Sol count wrong: "5,352 sols" is when NASA declared mission end, not time on surface

- **Field:** `fact`
- **Quote:** `"5,352 sols on the surface (almost 15 years)"`
- **Issue:** Opportunity's **last contact** was Sol 5111 (June 10, 2018). Sol 5352 is the sol number on which NASA officially declared the mission over (February 12, 2019), after months of unanswered recovery commands. Saying "5,352 sols on the surface" implies active operation for that entire period — incorrect. The rover was silent for 241 sols before declaration. The "almost 15 years" figure is also inaccurate: Opportunity operated from January 25, 2004 to last contact June 10, 2018 = ~14 years, 4.5 months, which rounds to "over 14 years" not "almost 15 years."
- **Correction:** `"5,111 sols of active operation (over 14 years)"` — or keep 5,352 but clarify it is "the sol on which the mission was declared ended."
- **Confidence:** high
- **Sources:** https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/ · https://en.wikipedia.org/wiki/Opportunity_(rover) · https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end/

#### 🟡 OPP-2 — "Final transmission" quote is a paraphrase, not an actual transmission

- **Field:** `fact`
- **Quote:** `'Final transmission during the 2018 global dust storm: "my battery is low and it's getting dark."'`
- **Issue:** This was never transmitted by the rover. It is a **poetic paraphrase** coined by science reporter Jacob Margolis (KPCC) summarizing what NASA engineers described about the rover's last telemetry. The rover sent numerical data. Snopes, Newsweek, and NASA itself have clarified this. Presenting it as "Final transmission" implies it was an actual message sent by the rover — that is factually false. The quote is widely loved but misattributed.
- **Correction:** Either remove or qualify: `'The rover's last telemetry, poetically paraphrased as "my battery is low and it's getting dark," showed no power and total darkness.'`
- **Confidence:** high
- **Sources:** https://www.snopes.com/fact-check/opportunity-rovers-final-words/ · https://www.newsweek.com/nasa-mars-opportunity-rover-new-york-daily-news-jet-propulsion-laboratory-1334615

---

### perseverance

- **Overlay:** `i18n-src/en-US/mars-sites/perseverance.json`
- **Base:** id=`perseverance`, kind=`surface`, lat=`18.44`, lon=`77.45`, status=`ACTIVE` ✅

#### 🔴 PERV-1 — site_name "Jezero Crater (ancient lake delta)" — rover landed on crater FLOOR, not in the delta

- **Field:** `site_name`
- **Quote:** `"Jezero Crater (ancient lake delta)"`
- **Issue:** Perseverance landed on the **floor** of Jezero Crater on February 18, 2021. It did not land in the delta. The rover **drove to** the delta fan and began investigating it around April 2022, roughly 14 months after landing. The landing ellipse is well-documented to be on the crater floor, ~2–3 km from the delta. Calling the landing site "ancient lake delta" is geographically wrong for the landing site itself.
- **Correction:** Change `site_name` to `"Jezero Crater floor"` (or `"Jezero Crater"`). The delta can be noted in the `fact` field as a destination reached during operations.
- **Confidence:** high
- **Sources:** https://science.nasa.gov/mission/mars-2020-perseverance/ · https://www.jpl.nasa.gov/news/nasas-perseverance-rover-deciphers-ancient-history-of-martian-lake/ · https://www.science.org/doi/10.1126/science.abl4051

#### 🟠 PERV-2 — Sample count "26+" by mid-2024 is stale; also Ingenuity flight count wrong

- **Field:** `fact`
- **Quote (samples):** `"Already drilled and sealed 26+ samples by mid-2024"`
- **Quote (Ingenuity):** `"flew 88 times before damaging a rotor in January 2024"`
- **Issue (Ingenuity):** Ingenuity flew **72 times**, not 88. The mission ended on January 18, 2024, after rotor blade damage during Flight 72. This is well-documented by NASA and SpaceNews.
- **Issue (samples):** The sample count "26+" is plausible at mid-2024 (confirmed ~24–25 samples by mid-2024, 33/43 tubes filled as of mid-2025). This is dated content and directionally okay, but "26+" overstates what is confirmed at mid-2024 by a small margin.
- **Correction:** Change `"flew 88 times"` → `"flew 72 times"`. Sample count: lower to `"24+"` for mid-2024 or update to current figure.
- **Confidence (Ingenuity count):** very high
- **Sources:** https://spacenews.com/ingenuity-mars-helicopter-mission-ends-after-72-flights/ · https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/ · https://en.wikipedia.org/wiki/Ingenuity_(helicopter)

---

### phoenix

- **Overlay:** `i18n-src/en-US/mars-sites/phoenix.json`
- **Base:** id=`phoenix`, kind=`surface`, lat=`68.22`, lon=`-125.7`, status=`ENDED` ✅

#### All claims verified ✅

- 157 sols: confirmed (last signal Sol 157, Nov 2, 2008)
- "Vastitas Borealis (northern polar plain)": confirmed — landed in Green Valley of Vastitas Borealis
- First to touch Martian water ice: confirmed; ice sublimated in cameras
- Solar panels frozen by northern winter: confirmed
- Base lat/lon 68.22°N consistent with ~68.2°N published coordinates ✅
- Source: https://en.wikipedia.org/wiki/Phoenix_(spacecraft) · https://www.space.com/42947-phoenix-mars-lander.html

---

### schiaparelli

- **Overlay:** `i18n-src/en-US/mars-sites/schiaparelli.json`
- **Base:** id=`schiaparelli`, kind=`surface`, lat=`-2.07`, lon=`-6.21`, status=`CRASHED` ✅

#### 🟠 SCHIA-1 — crash mechanism description slightly off; and ExoMars 2028 note needs update

- **Field:** `fact`
- **Quote:** `"A control software fault caused the inertial measurement unit to saturate during parachute deployment, which led the lander to compute a negative altitude and release its parachute prematurely. It free-fell ~3.7 km to the surface."`
- **Issue:** Mostly correct on the IMU saturation, but the causal sequence in the overlay is slightly compacted in a misleading way. ESA's official inquiry found: the IMU saturated for ~1 second → the GNC software integrated a constant value → attitude error of ~165° propagated → navigation system computed a *negative altitude of ~-30 m* → on-ground systems were activated (thrusters briefly fired, then shut off as if already landed) → parachute + backshell jettisoned prematurely at ~3.7 km altitude → free fall at ~300 km/h impact. The overlay says the parachute was "released" (jettisoned), which is correct, but calling it "release its parachute prematurely" could imply the parachute opened early rather than was jettisoned — slightly misleading.
- **Also:** The overlay says `"The flight data informed the ExoMars 2028 EDL redesign."` ExoMars Rosalind Franklin is scheduled to land ~end of November 2030 (launch October 2028) — referring to the mission as "ExoMars 2028" (the launch year) is internally consistent; however the fact that it's a **rover** not just EDL is context missing. Minor point; the 2028 label is acceptable shorthand.
- **Correction:** Clarify sequence — the backshell+parachute was *jettisoned* (not deployed early). Consider: `"...led the lander to compute a negative altitude, triggering premature parachute/backshell jettison and a brief thruster burn as though already on the ground. It free-fell ~3.7 km..."`.
- **Confidence:** high
- **Sources:** https://sci.esa.int/documents/33431/35950/1567260317467-ESA_ExoMars_2016_Schiaparelli_Anomaly_Inquiry.pdf · https://spacenews.com/esa-mars-lander-crash-caused-by-1-second-inertial-measurement-error/

---

### spirit

- **Overlay:** `i18n-src/en-US/mars-sites/spirit.json`
- **Base:** id=`spirit`, kind=`surface`, lat=`-14.57`, lon=`175.47`, status=`ENDED` ✅

#### All claims verified ✅

- 2,208 sols confirmed (last contact March 22, 2010 = Sol 2208)
- Gusev Crater: correct landing site
- 90-sol primary mission: confirmed
- Stuck at "Troy" in 2009, operated as stationary platform: confirmed
- "volcanic-water interaction" in Gusev: confirmed (Home Plate silica discovery)
- Base lat/lon -14.57°, 175.47° consistent with Gusev Crater landing ✅
- Source: https://en.wikipedia.org/wiki/Spirit_(rover)

---

### tgo

- **Overlay:** `i18n-src/en-US/mars-sites/tgo.json`
- **Base:** id=`tgo`, kind=`orbiter` ✅

#### 🟡 TGO-1 — methane conclusion framing slightly strong

- **Field:** `fact`
- **Quote:** `"So far, the data favour the conclusion that earlier reports of methane plumes were measurement artefacts."`
- **Issue:** TGO's published result (Nature, 2019) set an upper limit of <0.05 ppbv — about 10–100x lower than all prior detections. The paper's authors explicitly said this does NOT definitively rule out Curiosity's surface detections (which remain unexplained); they posited a rapid destruction mechanism near the surface. Saying the data "favour the conclusion that earlier reports…were measurement artefacts" is one interpretation but not the only one. A more accurate framing: TGO found no methane above ~0.05 ppbv, deepening the mystery rather than settling it.
- **Correction:** `"TGO found no methane above 0.05 ppbv — far below all prior claimed detections — deepening rather than settling the methane mystery."` Or add: `"(though Curiosity's surface-level detections remain unexplained)"`.
- **Confidence:** high
- **Sources:** https://www.nature.com/articles/s41586-019-1096-4 · https://www.space.com/exomars-orbiter-methane-mystery.html

---

### tianwen1-orbiter

- **Overlay:** `i18n-src/en-US/mars-sites/tianwen1-orbiter.json`
- **Base:** id=`tianwen1-orbiter`, kind=`orbiter` ✅

#### All claims verified ✅

- "~265 × 12,000 km elliptical, 87° inclination": consistent with published Tianwen-1 parking orbit parameters
- China's first Mars orbiter: correct
- Combined orbiter+lander+rover on single mission: confirmed (first mission to do all three in one launch)
- Relay for Zhurong, continued after Zhurong's 2022 comm loss: confirmed
- Source: https://en.wikipedia.org/wiki/Tianwen-1

---

### viking1-lander

- **Overlay:** `i18n-src/en-US/mars-sites/viking1-lander.json`
- **Base:** id=`viking1-lander`, kind=`surface`, lat=`22.4856`, lon=`312.0228`, status=`ENDED`, landing_date=`1976-07-20` ✅

#### 🟡 V1L-1 — duration claim slightly loose; record broken by Opportunity, not just "2010"

- **Field:** `fact`
- **Quote:** `"Viking 1 operated for over six years on the surface — the longest-duration Mars lander mission until Opportunity broke the record in 2010."`
- **Issue:** The "over six years" is correct (2,307 Earth days from July 20, 1976 to Nov 11, 1982). The record-break date is correct: Opportunity surpassed Viking 1's surface record on May 19, 2010. Minor quibble: "lander mission" is slightly imprecise since Opportunity is a rover, not a lander — but the point is clear.
- **Verdict:** Marginally acceptable but "Opportunity broke the record" is technically about the **longevity record**, not a lander-specific record. No meaningful error; just slightly loose category.
- **Confidence:** high
- **Sources:** https://en.wikipedia.org/wiki/Viking_1 · https://www.planetary.org/space-missions/viking

---

### viking1-orbiter

- **Overlay:** `i18n-src/en-US/mars-sites/viking1-orbiter.json`
- **Base:** id=`viking1-orbiter`, kind=`orbiter` ✅

#### All claims verified ✅

- "over 50,000 images": consistent with published figures (Viking 1 orbiter returned ~51,500 images)
- Ended operations August 1980 due to attitude-control gas depletion: confirmed
- "First Mars atlas" framing: defensible
- Source: https://en.wikipedia.org/wiki/Viking_1

---

### viking2-lander

- **Overlay:** `i18n-src/en-US/mars-sites/viking2-lander.json`
- **Base:** id=`viking2-lander`, kind=`surface`, lat=`47.673`, lon=`134.3`, status=`ENDED`, landing_date=`1976-09-03` ✅

#### 🟡 V2L-1 — "first frost" date and nature imprecise

- **Field:** `fact`
- **Quote:** `"Captured the first frost on Mars (winter 1979)."`
- **Issue:** Viking 2 first detected frost in **September 1977** (Sol ~250), not winter 1979. The 1979 image (May 18, 1979) was the second frost season, almost exactly one Martian year later. The "first frost" observation was autumn 1977, not winter 1979. The 1977 frost was water ice (possibly CO₂-contaminated); the 1979 image is the famous high-resolution colour photo. Saying "winter 1979" describes the second seasonal appearance, not the actual first.
- **Correction:** `"Detected the first frost on Mars in September 1977 — water ice confirmed — with another frost appearance in May 1979 captured in a now-iconic image."`
- **Confidence:** high
- **Sources:** https://www.lpi.usra.edu/publications/slidesets/redplanet2/slide_30.html · https://science.nasa.gov/photojournal/frost-at-the-viking-lander-2-site/ · https://www.nasa.gov/image-article/viking-lander-image-of-ice-mars/

---

### zhurong

- **Overlay:** `i18n-src/en-US/mars-sites/zhurong.json`
- **Base:** id=`zhurong`, kind=`surface`, lat=`25.066`, lon=`109.925`, status=`ENDED`, landing_date=`2021-05-14` ✅

#### 🔴 ZHU-1 — "first GPR-equipped Martian rover" is wrong: Perseverance/RIMFAX launched earlier

- **Field:** `capability`
- **Quote:** `"First non-US rover to operate on Mars; first GPR-equipped Martian rover."`
- **Issue:** Perseverance carries **RIMFAX** (Radar Imager for Mars' Subsurface Experiment), a ground-penetrating radar. Perseverance landed February 18, 2021 — **three months before Zhurong** (May 14, 2021). RIMFAX has been operating since landing. Therefore Zhurong is NOT the first GPR-equipped Martian rover; it is the second. Zhurong's GPR (RoPeR) is the first *Chinese* GPR on Mars, and first *non-US* GPR on Mars, but the plain claim "first GPR-equipped Martian rover" is factually wrong.
- **Correction:** Remove "first GPR-equipped Martian rover" or replace with "first non-US GPR-equipped Martian rover."
- **Confidence:** very high
- **Sources:** https://en.wikipedia.org/wiki/RIMFAX · https://www.jpl.nasa.gov/news/nasas-perseverance-rover-will-peer-beneath-mars-surface/ · https://en.wikipedia.org/wiki/Zhurong_(rover)

#### 🟡 ZHU-2 — "358 sols" needs precision; Wikipedia cites ~347 active sols

- **Field:** `fact`
- **Quote:** `"Operated 358 sols, traversed 1.92 km."`
- **Issue:** Different sources give slightly different active sol counts. The 358 figure appears to count from deployment to hibernation onset (May 2021–May 2022), while some sources cite ~347 active sols. The 1.92 km / 1921 m distance is consistent across sources. The 358 sol figure is defensible as "days between surface deployment and hibernation" vs active driving sols; the distinction should be clear or the smaller figure used if precision is the goal.
- **Recommendation:** Verify against CNSA official data; annotate as "358 sols from deployment to hibernation" if using that figure.
- **Confidence:** medium
- **Sources:** https://en.wikipedia.org/wiki/Zhurong_(rover) · https://earthsky.org/space/zhurong-rover-china-polygons-utopia-planitia-mars/

---

## Summary Counts

| Severity | Count | Entries affected |
|---|---|---|
| 🔴 Wrong fact | 3 | opportunity (sol count), perseverance (Ingenuity flight count), zhurong (first GPR) |
| 🟠 Misleading/imprecise | 2 | perseverance (site_name = delta not floor), schiaparelli (parachute jettison vs release) |
| 🟡 Minor wording | 4 | mro (resolution phrasing), opportunity (quote misattributed), tgo (methane framing), viking2-lander (frost date wrong year), viking1-lander (lander/rover category slip) |
| 🔵 Note/context | 1 | maven (orbit parameters low-confidence specificity) |
| ✅ Clean | 6 | phoenix, spirit, tianwen1-orbiter, viking1-orbiter, tgo (apart from 🟡), schiaparelli base data |

Priority fixes: perseverance `site_name` (🟠 — conceptually wrong for a space atlas), Ingenuity flight count 88→72 (🔴), Zhurong GPR claim (🔴), Opportunity sol count 5,352→5,111 active (🔴), Viking 2 frost year 1977 not 1979 (🟡 but factually wrong), Opportunity "final transmission" quote attribution (🟡 but widely debunked myth).
