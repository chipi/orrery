# Mars landing-site fact-check — batch A
Reviewed: beagle2, curiosity, exomars-rosalind-franklin, hope, insight,
mangalyaan, mariner9, mars-express, mars-odyssey, mars-pathfinder,
mars2, mars3-orbiter, mars3, mars6

Reviewer: science-reviewer agent  
Date: 2026-07-14  
Sources: Wikipedia, NASA NSSDCA, ESA, JPL, HiRISE

---

## Per-entry verdicts

| slug | verdict | findings |
|---|---|---|
| beagle2 | 🟠 | Overlay says "two" solar panels failed — disputed; most-likely scenario is one panel failed. "Wreckage" is a misleading word (landed intact). |
| curiosity | 🔵 | Clean. All claims verified. |
| exomars-rosalind-franklin | 🔵 | Correctly stated as Planned, Oxia Planum target, 2028 launch. |
| hope | 🔵 | Orbit figures and "first Arab interplanetary mission" verified. |
| insight | 🟠 | Record marsquake magnitude stated as 5; measured magnitude is 4.7. |
| mangalyaan | 🟡 | Budget stated as ~$74M; most authoritative sources cite ~$67M–74M (range). "First Asian nation" correct. Mission-end stated as "April 2022" (contact lost) but ISRO declared end-of-life October 2022; slight ambiguity in wording. |
| mariner9 | 🟠 | Overlay states "100% of the Martian surface" mapped; NASA/JPL primary sources say 85%. Image count 7,329 is correct. |
| mars-express | 🔵 | "First European interplanetary mission" confirmed. MARSIS liquid-water 2018 confirmed (though still contested in literature — note is fine at this confidence level). |
| mars-odyssey | 🟡 | "Longest continuously active spacecraft in orbit around any planet other than Earth" — verified correct as of 2026. Claim "detected vast subsurface water-ice deposits in 2002" — verified. |
| mars-pathfinder | 🔵 | Ares Vallis, first Mars rover (Sojourner), airbag EDL — all correct. |
| mars2 | 🟡 | Overlay places crash in "Hellas region" — base JSON lon=313E is consistent with Hellas Planitia vicinity; HiRISE confirmed a debris field there. Site is approximate; "Hellas region" is acceptable but imprecise vs "Hellas Planitia". |
| mars3-orbiter | 🔵 | Correctly labelled orbiter; capability claim about "first to deliver a soft-landing payload" is accurate. |
| mars3 | 🟠 | Overlay states transmission lasted "14.5 seconds"; Wikipedia says 20 seconds; NSSDCA says ~20 s; 14.5 s appears in some popular sources but is not the NSSDCA figure. Overlay site_name says "Ptolemaeus crater region" — confirmed correct (45°S 202°E). Base JSON status="CRASHED" is wrong: it was a successful soft landing (partial success), not a crash. |
| mars6 | 🔵 | Coordinates match NSSDCA (23.9°S, 19.42°W = 340.58°E). Margaritifer Sinus confirmed. "First in-situ atmospheric profile during EDL" correct. |

**Counts: 🔴 0 · 🟠 3 · 🟡 3 · 🔵 8**

---

## Detailed findings

---

### beagle2

**File:** `i18n-src/en-US/mars-sites/beagle2.json`

#### F-BG-1 🟠 Solar panel failure count
- **Field:** `fact`
- **Quote:** "two of its four solar panels failed to deploy, blocking its radio antenna"
- **Issue:** This was the initial interpretation of MRO HiRISE imagery. A 2016 peer-reviewed study using 3D modelling of the HiRISE images concluded the most likely scenario is that only **one** panel failed to fully open (three deployed, one did not). The "two panels" figure persists in some press articles but the more rigorous analysis says one. Asserting "two" as fact overstates certainty.
- **Correction:** Change to "at least one of its four solar panels failed to deploy" or "one or two of its four solar panels failed to deploy".
- **Source:** https://astronomynow.com/2016/11/11/did-a-failed-solar-panel-block-beagle-2s-antenna/ ; https://en.wikipedia.org/wiki/Beagle_2
- **Confidence:** High

#### F-BG-2 🟡 Word "Wreckage"
- **Field:** `fact`
- **Quote:** "Wreckage was located in 2015 by NASA's MRO HiRISE camera"
- **Issue:** "Wreckage" implies the lander broke up. NASA and ESA both described it as found **intact** (hence the discovery's significance — it had successfully deployed parachute and airbags). The sentence later correctly says "the lander had reached the surface intact" — making "wreckage" contradictory within the same sentence.
- **Correction:** Replace "Wreckage" with "The lander".
- **Source:** https://www.space.com/28286-europe-beagle-2-mars-lander-found.html
- **Confidence:** High

---

### curiosity

**File:** `i18n-src/en-US/mars-sites/curiosity.json`

No findings. Site name (Gale Crater / Aeolis Mons / Mt. Sharp), landing date 2012-08-06, RTG power, habitable lake confirmation, and firsts all verified.

---

### exomars-rosalind-franklin

**File:** `i18n-src/en-US/mars-sites/exomars-rosalind-franklin.json`

No findings. Correctly identified as Planned (not landed). Launch NET 2028, arrival ~2030, Oxia Planum target, 2 m drill depth, ESA-led post-Ukraine rescoping — all accurate.
- Base JSON: `kind: surface, status: PLANNED, landing_date: null` — correct treatment.

---

### hope

**File:** `i18n-src/en-US/mars-sites/hope.json`

No findings. "First Arab interplanetary mission" confirmed. Orbit described as "~20,000 × 43,000 km highly elliptical, 25° inclination" — consistent with published parameters. Diurnal weather coverage claim verified.

---

### insight

**File:** `i18n-src/en-US/mars-sites/insight.json`

#### F-IN-1 🟠 Record marsquake magnitude
- **Field:** `fact`
- **Quote:** "record-breaking magnitude-5 quake in May 2022"
- **Issue:** The event S1222a (May 4, 2022) had a measured magnitude of **4.7 ± 0.2**, not 5.0. "Magnitude 5" is a common rounded popular-press shorthand, but the scientific measurement is 4.7. For a museum-grade atlas, the precise figure should be used.
- **Correction:** Change to "record magnitude-4.7 quake (S1222a) in May 2022".
- **Source:** https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2022GL101543 ; https://www.jpl.nasa.gov/news/nasas-insight-records-monster-quake-on-mars/
- **Confidence:** High

---

### mangalyaan

**File:** `i18n-src/en-US/mars-sites/mangalyaan.json`

#### F-MG-1 🟡 Budget figure
- **Field:** `fact`
- **Quote:** "budget of ~$74M"
- **Issue:** Multiple authoritative sources (Wikipedia citing ISRO, Time magazine, The Register) cite the cost as approximately **$67M–$74M USD**. The $74M figure is at the high end of published estimates; $67M is most commonly cited. This is a minor imprecision rather than an error — the "less than *Gravity*" comparison holds either way.
- **Correction:** Consider changing to "~$67M" or "under $75M" for accuracy.
- **Source:** https://en.wikipedia.org/wiki/Mars_Orbiter_Mission ; https://time.com/3423985/
- **Confidence:** Medium (cost estimates vary by exchange rate/year)

#### F-MG-2 🟡 Contact-lost date
- **Field:** `fact`
- **Quote:** "contact was lost in April 2022"
- **Issue:** Technically accurate: contact was lost in **April 2022** when the spacecraft entered a long eclipse. However, ISRO officially declared the mission at **end-of-life on October 3, 2022**. The overlay could be read as saying the mission ended in April; the mission_type field says "Ended 2022" which is correct, but the fact text lacks the formal closure date.
- **Correction:** Acceptable as written, but could add "officially declared end-of-mission October 2022" for completeness.
- **Source:** https://www.theregister.com/2022/10/04/isro_mars_orbiter_mission_ends/
- **Confidence:** High

---

### mariner9

**File:** `i18n-src/en-US/mars-sites/mariner9.json`

#### F-M9-1 🟠 Surface coverage percentage
- **Field:** `fact`
- **Quote:** "Returned 7,329 images covering 100% of the Martian surface"
- **Issue:** NASA JPL and most authoritative sources state Mariner 9 mapped **85%** of the Martian surface, not 100%. The 100% figure appears in some mission summaries that may count the extended mission phases, but the NASA 50th-anniversary retrospective and JPL mission page both cite 85%.
- **Correction:** Change "100%" to "85%".
- **Source:** https://www.jpl.nasa.gov/missions/mariner-9-mariner-i/ ; https://www.nasa.gov/history/50-years-ago-mariner-9-enters-mars-orbit/
- **Confidence:** High

---

### mars-express

**File:** `i18n-src/en-US/mars-sites/mars-express.json`

No findings. "First European interplanetary mission" confirmed. MARSIS subsurface radar liquid water 2018 confirmed (paper published July 2018, data 2012–2015). The discovery remains scientifically debated (other materials may produce similar radar returns), but stating "discovered evidence" is appropriate hedging.

---

### mars-odyssey

**File:** `i18n-src/en-US/mars-sites/mars-odyssey.json`

No findings. "Longest continuously active spacecraft in orbit around any planet other than Earth" — confirmed correct as of July 2026 (active ~25 years). Subsurface water-ice detection in 2002 confirmed.

---

### mars-pathfinder

**File:** `i18n-src/en-US/mars-sites/mars-pathfinder.json`

No findings. Ares Vallis confirmed as landing site. Sojourner as first Mars rover (11 kg, microwave-sized) confirmed. Airbag EDL reused by Spirit/Opportunity confirmed. ~100 m traverse and 16 rocks analysed confirmed.

---

### mars2

**File:** `i18n-src/en-US/mars-sites/mars2.json`

#### F-M2-1 🟡 "Hellas region" vs "Hellas Planitia"
- **Field:** `fact`
- **Quote:** "it crashed at high speed in the Hellas region"
- **Issue:** "Hellas region" is vague. HiRISE imagery and NASA/NSSDCA place the approximate crash site within **Hellas Planitia** specifically (the basin floor). The base JSON uses lon=313E which corresponds to the western part of Hellas Planitia. "Hellas Planitia" is more precise and the accepted geographic designation.
- **Correction:** Change "Hellas region" to "Hellas Planitia".
- **Source:** https://www.uahirise.org/ESP_042250_1345 ; https://en.wikipedia.org/wiki/Mars_2
- **Confidence:** Medium (crash site is still approximate)

---

### mars3-orbiter

**File:** `i18n-src/en-US/mars-sites/mars3-orbiter.json`

No findings. Correctly labelled as orbiter. Claim "first Soviet Mars orbiter; first to deliver a soft-landing payload to another planet" — accurate (Mars 3 lander was carried by this bus). Eight months of observations ending August 1972 — consistent with contact loss date.

---

### mars3

**File:** `i18n-src/en-US/mars-sites/mars3.json`

#### F-M3-1 🟠 Transmission duration
- **Field:** `fact`
- **Quote:** "began transmitting data — for 14.5 seconds"
- **Issue:** NASA NSSDCA and Wikipedia give the transmission duration as approximately **20 seconds** (transmission started 90 s after landing, then ceased). The "14.5 seconds" figure circulates in popular-press sources but is not supported by NASA's primary reference. Both figures appear in some sources, creating genuine uncertainty, but 20 s is the more authoritative number.
- **Correction:** Change to "approximately 20 seconds" and note uncertainty if desired.
- **Source:** https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-049F ; https://en.wikipedia.org/wiki/Mars_3
- **Confidence:** Medium (genuine source conflict; 20 s is the NSSDCA figure)

#### F-M3-2 🟠 Base JSON status field wrong
- **File:** `static/data/mars-sites.json`
- **Field:** `status` (id: "mars3")
- **Quote:** `"status": "CRASHED"`
- **Issue:** Mars 3 **did not crash** — it made the first successful soft landing on Mars. The mission partially succeeded (14.5–20 s of transmission). The overlay correctly labels it "Uncrewed Soft Lander · Partial Success". The base JSON `status: CRASHED` directly contradicts the overlay and the historical record.
- **Correction:** Change `"status": "CRASHED"` to `"status": "ENDED"` or `"status": "PARTIAL"` (whatever the enum supports). `ENDED` is used for missions that completed/ceased — PARTIAL SUCCESS is the closest descriptor.
- **Source:** https://en.wikipedia.org/wiki/Mars_3 ; https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-049F
- **Confidence:** High

#### F-M3-3 🟡 "Ptolemaeus crater region" site name
- **Field:** `site_name` (overlay)
- **Quote:** `"Approx. 45°S, 158°W (Ptolemaeus crater region)"`
- **Issue:** The coordinates are correct (158°W = 202°E, consistent with base JSON lon=202). However, Wikipedia and JPL identify the location as **Ptolemaeus Crater** (not "Ptolemaeus crater region"). The difference is minor but "region" adds unnecessary vagueness. Note: this is a different Ptolemaeus than the lunar crater; the Martian Ptolemaeus Crater is in the southern highlands.
- **Correction:** Change to "Ptolemaeus Crater" (drop "region").
- **Source:** https://en.wikipedia.org/wiki/Mars_3
- **Confidence:** High

---

### mars6

**File:** `i18n-src/en-US/mars-sites/mars6.json`

No findings. Landing site (23.9°S, 19.4°W / Margaritifer Sinus), descent atmospheric data, and communications lost at touchdown — all verified against NSSDCA and Wikipedia.

---

## Summary table

| ID | Finding | Severity | File | Field |
|---|---|---|---|---|
| beagle2 | "two" solar panels failed — likely only one | 🟠 | overlay | fact |
| beagle2 | "Wreckage" contradicts "reached the surface intact" | 🟡 | overlay | fact |
| insight | Magnitude stated as 5; actual is 4.7 | 🟠 | overlay | fact |
| mangalyaan | Budget ~$74M; most sources say ~$67M | 🟡 | overlay | fact |
| mangalyaan | Contact-lost April 2022; formal end October 2022 | 🟡 | overlay | fact |
| mariner9 | "100% of the Martian surface" — should be 85% | 🟠 | overlay | fact |
| mars2 | "Hellas region" — more precise is "Hellas Planitia" | 🟡 | overlay | fact |
| mars3 | Transmission duration: 14.5 s stated, 20 s is NSSDCA figure | 🟠 | overlay | fact |
| mars3 | `status: CRASHED` — incorrect, was a soft landing | 🟠 | base JSON | status |
| mars3 | "Ptolemaeus crater region" — should be "Ptolemaeus Crater" | 🟡 | overlay | site_name |

**Total: 🔴 0 · 🟠 5 · 🟡 5 · 🔵 0 confirmed-clean entries: 8/14**
