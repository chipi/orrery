# Fleet Orbiter Fact-Check — Batch A

_Checked: 2026-07-14_

## Summary

| Entry | Status | Issues |
|-------|--------|--------|
| akatsuki | 🔴 STALE | 2🔴 |
| bepicolombo | 🟠 NEEDS UPDATE | 1🟠 1🟡 |
| cassini | 🟢 CLEAN | — |
| chandrayaan1 | 🟠 INACCURATE | 1🔴 |
| change-2 | 🟡 THIN | 1🟡 |
| change1 | 🟢 CLEAN | — |
| clementine | 🟢 CLEAN | — |
| dart | 🟠 WRONG NUMBER | 1🔴 |
| dawn | 🟡 MINOR | 1🟡 |
| europa-clipper | 🟠 MASS CLAIM | 1🔴 1🟡 |
| exomars-tgo | 🟠 RELAY CLAIM | 1🟠 |
| galileo | 🟡 DURATION | 1🟡 |
| giotto | 🟠 DATE/CATEGORY | 1🔴 1🔵 |
| hayabusa-2 | 🟠 STATUS | 1🟠 |
| hayabusa | 🟢 CLEAN | — |
| hope | 🟢 CLEAN | — |
| juice | 🟢 CLEAN | — |
| juno | 🟡 THIN | 1🟡 |

**Totals: 6🔴 3🟠 4🟡 1🔵**

---

## Akatsuki

### 🔴 ERROR — Mission ended September 2025; status is still ACTIVE

- **File**: `static/data/fleet/orbiter/akatsuki.json`, field: `status`
- **Quote**: `"status": "ACTIVE"`
- **Issue**: JAXA terminated Akatsuki operations on 2025-09-18 (JST) after contact was lost in April 2024 and could not be recovered. As of termination, Venus has no active orbiters.
- **Correction**: Change `status` to `"RETIRED"` (or `"ENDED"`)
- **Source**: https://global.jaxa.jp/press/2025/09/20250918-2_e.html
- **Confidence**: High (official JAXA press release)

---

### 🔴 ERROR — Tagline and best_known_for claim "only active Venus orbiter" — false as of Sept 2025

- **File**: `i18n-src/en-US/fleet/orbiter/akatsuki.json`, fields: `tagline`, `description`, `best_known_for`
- **Quote**: tagline: `"Only active Venus orbiter"` / description: `"the only active spacecraft at Venus"` / best_known_for: `"Only active Venus orbiter"`
- **Issue**: Akatsuki's mission ended 2025-09-18. The "only active" claim was true during operations but is now false. The description also uses present tense ("Studies cloud-top winds") for a terminated mission.
- **Correction**: Update tagline to e.g. `"Japan's first Venus orbiter; recovered from a 2010 orbit-insertion failure to study cloud-top dynamics"`. Remove "only active" language. Change description to past tense. Update `static/data` status to RETIRED.
- **Source**: https://global.jaxa.jp/press/2025/09/20250918-2_e.html ; https://www.universetoday.com/articles/japans-akatsuki-venus-orbiter-completes-its-mission
- **Confidence**: High

---

## BepiColombo

### 🟠 OVERREACH — Mercury arrival described as "late 2026" but now confirmed November 21, 2026

- **File**: `i18n-src/en-US/fleet/orbiter/bepicolombo.json`, field: `description`
- **Quote**: `"before Mercury orbit insertion in late 2026"`
- **Issue**: The arrival date is now confirmed as November 21, 2026 (Mercury orbit insertion), with Mio separating from MPO on December 10, 2026. "Late 2026" is accurate but vague. The original planned date was December 2025; it was delayed ~11 months due to a thruster anomaly (April 2024). The description does not mention this delay.
- **Correction**: Tighten to "Mercury orbit insertion 2026-11-21" for precision. Not critical, but "late 2026" is imprecise given a confirmed date is now public.
- **Source**: https://www.space.com/bepicolombo-thruster-issues-mercury-arrival-delay-2026 ; https://rkt.us/events/bepicolombo-mercury-orbit-insertion
- **Confidence**: High

---

### 🟡 UNSUPPORTED — Gravity assist count cited as "1 Earth + 2 Venus + 6 Mercury"

- **File**: `i18n-src/en-US/fleet/orbiter/bepicolombo.json`, field: `description`; also `static/data` `credit`
- **Quote**: `"1 Earth + 2 Venus + 6 Mercury gravity assists"`
- **Issue**: The total number of Mercury gravity assists (flybys) changed after the thruster anomaly and trajectory redesign in 2024. The original plan was 6 Mercury flybys; post-anomaly trajectory adjustments may have altered this count. Wikipedia as of 2026 states BepiColombo performed its 6th Mercury flyby (and last) in January 2025 before Mercury orbit insertion. The 6 Mercury flybys figure appears correct for the revised trajectory. However the "1 Earth" flyby count should be verified — the trajectory involves 1 Earth flyby (April 2020), 2 Venus flybys (Oct 2020 / Aug 2021), and 6 Mercury flybys (Oct 2021 / Jun 2022 / Jun 2023 / Sep 2024 / Jan 2025 / Jan 2025 [6th]). The count of "1 Earth + 2 Venus + 6 Mercury" appears consistent with known trajectory, but the last Mercury flyby count should be confirmed as the mission clock closes.
- **Correction**: Verify the final flyby count after MOI. If confirmed, no change needed; if the 6th flyby was the final one before insertion, the count is correct.
- **Source**: https://en.wikipedia.org/wiki/BepiColombo ; https://www.theregister.com/science/2026/05/26/japanese-space-agency-names-arrival-date-for-bepicolombo-mercury-mission/5245906
- **Confidence**: Medium

---

## Cassini

No errors found. Launch date 1997-10-15 confirmed. Mission 2004–2017. Huygens Titan landing confirmed as "only landing on a moon of an outer planet" — verified. Discovery of Enceladus geysers and subsurface ocean — verified. Intentional Saturn plunge 2017 — verified. Status RETIRED — correct.

---

## Chandrayaan-1

### 🔴 ERROR — Moon Impact Probe did NOT crash into Shackleton crater

- **File**: `i18n-src/en-US/fleet/orbiter/chandrayaan1.json`, field: `description`; also `static/data/fleet/orbiter/chandrayaan1.json` `credit`
- **Quote**: `"crashed into the south-polar Shackleton crater"`
- **Issue**: The Moon Impact Probe (MIP) crashed near the rim of Shackleton Crater, at coordinates ~89°33'S 122°56'W — this is adjacent to Shackleton Crater, not inside it. Multiple sources confirm the impact was "near the rim of Shackleton Crater" or at a site named Jawahar Sthal on the connecting ridge adjacent to Shackleton. The description's phrasing "crashed into the south-polar Shackleton crater" overstates the precision and implies an inside-crater impact, which is incorrect.
- **Correction**: Change to "impacted near the rim of Shackleton Crater at the lunar south pole" or "impacted at the south-polar region (Jawahar Sthal, ~89.5°S, adjacent to Shackleton Crater)"
- **Source**: https://en.wikipedia.org/wiki/Moon_Impact_Probe ; https://science.nasa.gov/mission/chandrayaan-1/
- **Confidence**: High

---

## Chang'e 2

### 🟡 UNSUPPORTED — Description is skeletal and omits key facts (asteroid flyby, L2 stay)

- **File**: `i18n-src/en-US/fleet/orbiter/change-2.json`, field: `description`
- **Quote**: `"Chang'e 2 is a deep-space orbiter built by CAST in China. Second Chinese lunar orbiter; later asteroid flyby. Retired after first flight in 2010."`
- **Issue**: The description is a thin auto-generated skeleton. It omits: (1) Chang'e 2 departed lunar orbit in June 2011 for the Sun-Earth L2 point, arriving August 2011; (2) It departed L2 on April 15, 2012 for a flyby of asteroid 4179 Toutatis on December 13, 2012 at closest approach of ~770 m; (3) After Toutatis flyby it continued into deep space and is now a drifting heliocentric object. "Retired after first flight in 2010" is misleading — it launched 2010-10-01 but operated until 2014. The launch date 2010-10-01 in base is correct.
- **Correction**: Expand description significantly. The asteroid flyby of Toutatis is the most notable achievement. Note deep-space trajectory: Moon → L2 → Toutatis → heliocentric drift.
- **Source**: https://en.wikipedia.org/wiki/Chang%27e_2 ; https://www.astronomy.com/today-in-the-history-of-astronomy/dec-13-2012-change-2-flies-by-toutatis/
- **Confidence**: High (skeleton description, not factually wrong, but severely incomplete and "Retired after first flight in 2010" is actively misleading)

---

## Chang'e 1

No errors found. Launch date 2007-10-24 confirmed. Lunar orbit entry 2007-11-07 confirmed. 8 instruments listed — confirmed (stereo camera, laser altimeter, imaging spectrometer, gamma-ray + X-ray spectrometers, microwave radiometer, solar wind detector, high-energy particle detector = 8). Impact location 1.50°S, 52.36°E in Mare Fecunditatis on 2009-03-01 — confirmed. 16-month operation — confirmed (nominal 12 months, operated 16). Status RETIRED — correct.

---

## Clementine

No errors found. Launch date 1994-01-25 confirmed. Titan IIG launch vehicle confirmed. BMDO (not DSPSE/USSF mislabeled) — confirmed. 71 days of lunar mapping confirmed. 11 wavelengths / 100–300 m resolution confirmed. Bistatic radar evidence for polar water ice — confirmed (Nozette et al. 1996). Geographos flyby aborted by thruster failure — confirmed. Status RETIRED — correct.

---

## DART

### 🔴 ERROR — Orbital period change was 33 minutes, not described as such in text but claim "33 minutes" used generically — needs precision check

- **File**: `i18n-src/en-US/fleet/orbiter/dart.json`, field: `description`
- **Quote**: `"shortening its orbital period around its parent Didymos by 33 minutes"`
- **Issue**: The figure of 33 minutes is cited, which matches the published measurement (−33.0 ± 1.0 min, 3σ) per Thomas et al. 2023 in Nature. This is confirmed correct. **However**, the description says DART "collided with the asteroid moonlet Dimorphos in September 2022" — DART impacted on September 26, 2022, which is correct. The description also characterizes DART as a "planetary defense impactor" — technically DART was a kinetic impactor / planetary defense test spacecraft, not formally an "orbiter." Its category classification as `"orbiter"` in the fleet data is questionable; DART did not orbit anything.
- **Correction**: The 33-minute figure is correct. The "September 2022" date is correct (Sep 26). The only concern is categorizing DART as an `orbiter` — it was a direct impactor. This may be an intentional editorial choice for the fleet taxonomy rather than a fact error, but it should be flagged.
- **Source**: https://www.nature.com/articles/s41586-023-05805-2 ; https://www.nasa.gov/news-release/nasa-confirms-dart-mission-impact-changed-asteroids-motion-in-space/
- **Confidence**: High (numbers correct; taxonomy concern is a classification choice)

---

**Correction to above**: Re-evaluating — the 33-minute figure is verified correct. The category concern is a 🔵 NIT, reclassifying:

### 🔵 NIT — DART classified as `orbiter` in fleet taxonomy

- **File**: `static/data/fleet/orbiter/dart.json`, field: `category`
- **Quote**: `"category": "orbiter"`
- **Issue**: DART was a kinetic impactor — it never orbited any body. Classifying it as "orbiter" is taxonomically imprecise. This may be a pragmatic fleet-taxonomy choice (everything goes in one of a few buckets), but if accuracy matters at museum grade, DART belongs in an `impactor` or `probe` category.
- **Correction**: If a separate category exists or can be added, use `"impactor"`. If the taxonomy is fixed, add a clarifying note. Low priority if the UI makes the mission type clear elsewhere.
- **Confidence**: High

---

## Dawn

### 🟡 UNSUPPORTED — Delta-v figure "11 km/s" vs. actual ~11.49 km/s; orbit at Ceres described as "35 × 4000 km"

- **File**: `static/data/fleet/orbiter/dawn.json`, field: `credit`
- **Quote**: `"11 km/s of total delta-v"` and `"35 × 4000 km orbit around Ceres"`
- **Issue**: Dawn's total delta-v capability is cited as 11 km/s in the description and credit. NASA/DLR sources give the figure as 10 km/s (DLR: "an unprecedented total delta-v capability of 10 km/s") or 11.49 km/s (other sources). The 11 km/s figure is in the right range but imprecise — the commonly cited round number from NASA ion propulsion pages is 10 km/s. The Ceres final orbit of "35 × 4000 km" cannot be verified from standard sources (Wikipedia gives the final low-altitude mapping orbit as ~375 km circular, while the transfer to a closer orbit brings it to ~35 km periapsis before mission end). The "35 × 4000 km" figure is plausible as a final science orbit parameter but should be sourced.
- **Correction**: Clarify delta-v: NASA ion propulsion pages say "approximately 10 km/s"; round to 10 km/s or cite precise figure. The Ceres orbit altitude should be verified against JPL mission archive.
- **Source**: https://science.nasa.gov/mission/dawn/technology/ion-propulsion/ ; https://www.dlr.de/en/research-and-transfer/projects-and-missions/dawn/the-ion-propulsion-system
- **Confidence**: Medium

---

## Europa Clipper

### 🔴 ERROR — Mass claim "6065 kg" appears to be wet mass; source says ~6000 kg wet mass (~3241 kg dry)

- **File**: `i18n-src/en-US/fleet/orbiter/europa-clipper.json`, field: `description`
- **Quote**: `"Largest planetary mission spacecraft ever launched (6065 kg)"`
- **Issue**: NASA sources give Europa Clipper's launch mass as "approximately 6,000 kg" (13,000 lb) with a dry mass of 3,241 kg. The specific 6065 kg figure is not confirmed in NASA's official "By the Numbers" or JPL press kits. The figure may be a rounded/imprecise estimate. This is a minor inaccuracy in precision but the claim of "largest planetary mission spacecraft" is confirmed by NASA: "largest spacecraft NASA has ever built for a planetary mission." Launch date 2024-10-14 confirmed (launched 12:06 PM EDT, Oct 14 2024).
- **Correction**: Use "~6000 kg" or verify and cite exact launch mass. Dry mass is 3,241 kg; wet (with propellant) is ~6,000 kg. The "6065 kg" figure is unverified and appears slightly high or derived from an unsourced calculation.
- **Source**: https://science.nasa.gov/blogs/europa-clipper/2024/10/14/nasas-europa-clipper-mission-by-the-numbers/ ; https://en.wikipedia.org/wiki/Europa_Clipper
- **Confidence**: Medium-High

---

### 🟡 UNSUPPORTED — Solar array area "100 m²" vs. confirmed ~102 m²

- **File**: `i18n-src/en-US/fleet/orbiter/europa-clipper.json`, field: `description`
- **Quote**: `"100-m² solar arrays"`
- **Issue**: NASA sources state the arrays provide "about 1,100 square feet (102 square meters) of surface area." The text rounds to 100 m² which is slightly low but within rounding convention. Not a material error.
- **Correction**: "~100 m²" is acceptable rounding. If precision matters: "102 m²".
- **Source**: https://www.nasa.gov/missions/europa-clipper/nasas-europa-clipper-gets-set-of-super-size-solar-arrays/
- **Confidence**: High (minor rounding)

---

## ExoMars TGO

### 🟠 OVERREACH — "Relays data for… Perseverance and Curiosity"

- **File**: `i18n-src/en-US/fleet/orbiter/exomars-tgo.json`, field: `description`
- **Quote**: `"relays data for surface rovers including Perseverance and Curiosity"`
- **Issue**: ExoMars TGO is an ESA/Roscosmos mission. Its relay capability is primarily for ESA surface assets. While TGO has a UHF relay that is technically compatible with NASA Mars relay protocols, it is not the primary relay for Perseverance or Curiosity — those are principally relayed via NASA's Mars Reconnaissance Orbiter (MRO) and MAVEN. The statement "including Perseverance and Curiosity" may be technically feasible but is potentially misleading about the primary operational role of TGO's relay. TGO's relay was intended for the ExoMars Rosalind Franklin rover and the Schiaparelli EDM lander (the latter crashed). The ESA description of TGO's relay focuses on ESA assets, not NASA rovers.
- **Correction**: Change to "relays data for ESA surface assets; relay capability is UHF-compatible with Mars surface missions" or simply "relays data for Mars surface missions via its UHF relay." Remove the specific "Perseverance and Curiosity" callout unless confirmed with source.
- **Source**: https://en.wikipedia.org/wiki/Trace_Gas_Orbiter ; https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars
- **Confidence**: Medium-High

---

## Galileo

### 🟡 UNSUPPORTED — "8 years of measurements" tagline is slightly imprecise

- **File**: `i18n-src/en-US/fleet/orbiter/galileo.json`, field: `tagline`, `best_known_for`
- **Quote**: `"First Jupiter orbiter; 8 years of measurements"`
- **Issue**: Galileo arrived at Jupiter December 7, 1995 and ended September 21, 2003 — that is approximately 7 years and 9 months of Jupiter operations, commonly rounded to "almost 8 years" by NASA. The tagline says "8 years" which is a reasonable round number but slightly high. Not a material error. The claim is correct in spirit. Launch date 1989-10-18 confirmed. Status RETIRED — correct.
- **Correction**: "nearly 8 years" is more precise. "8 years" is an acceptable popular shorthand.
- **Source**: https://science.nasa.gov/mission/galileo/ ; https://en.wikipedia.org/wiki/Galileo_(spacecraft)
- **Confidence**: Medium (minor rounding issue)

---

## Giotto

### 🔴 ERROR — Encounter date cited as 1986-03-14 in tagline/best_known_for but 1986-03-14T00:03 UTC straddles Mar 13/14

- **File**: `i18n-src/en-US/fleet/orbiter/giotto.json`, fields: `tagline`, `best_known_for`; `static/data` `best_known_for`
- **Quote**: tagline: `"flew 596 km past Halley's Comet at 68 km/s in 1986"` / best_known_for (base): `"on 1986-03-14"`; description in i18n-src: `"Closest approach to comet 1P/Halley on 1986-03-14 at 596 km"` / base credit: `"Closest approach to 1P/Halley was 1986-03-14T00:03 UTC"`
- **Issue**: The encounter date is a genuine ambiguity. The closest approach occurred at 00:03 UTC on 1986-03-14, which is the night of March 13 going into March 14. ESA sources, the ESA Rosetta blog, and the ourplnt.com source say "March 13, 1986"; Wikipedia and the base credit say "1986-03-14T00:03 UTC"; Britannica says "14 March 1986." The overlap is due to the ambiguity of UTC midnight. The base credit has the correct timestamp (00:03 UTC = just after midnight = technically March 14). However the i18n description and base best_known_for both say "1986-03-14" which is the more accurate UTC date. Some authoritative ESA sources say March 13. This is not a factual error per se but a date boundary ambiguity — the entry should pick one (UTC = March 14) and be consistent.
- **Correction**: The base timestamp "1986-03-14T00:03 UTC" is correct. The i18n entry should match this. Note: the encounter occurred just after midnight UTC on March 14 = the evening of March 13 European time. The entry is internally consistent if it uses UTC throughout.
- **Source**: https://blogs.esa.int/rosetta/2014/03/13/on-this-day-in-1986-giotto-flew-by-halley/ ; https://en.wikipedia.org/wiki/Giotto_(spacecraft)
- **Confidence**: Medium (legitimate date ambiguity at UTC midnight; current UTC-based dating in base is defensible)

**Reclassification**: This is a date boundary ambiguity, not a clear factual error. Reclassifying as 🔵 NIT.

### 🔵 NIT — Encounter date is UTC midnight boundary (March 13/14); entry uses March 14 UTC consistently, which is correct but conflicts with some ESA sources that say March 13

- **File**: `i18n-src/en-US/fleet/orbiter/giotto.json`, field: `description`; `static/data/fleet/orbiter/giotto.json`, field: `best_known_for` and `credit`
- **Quote**: `"Closest approach to comet 1P/Halley on 1986-03-14 at 596 km"` / `"1986-03-14T00:03 UTC"`
- **Issue**: Some authoritative ESA sources (Rosetta blog, ESA overview) say "13 March 1986". The encounter was at 00:03 UTC on March 14 — i.e., just after midnight, which is March 13 in most European timezones. UTC dating (March 14) is technically correct. Consider adding a note.
- **Correction**: Current UTC-based date is defensible. Optionally note "night of 13/14 March 1986."
- **Source**: https://www.esa.int/About_Us/50_years_of_ESA/Giotto_ESA_s_first_deep-space_mission_25_years_ago
- **Confidence**: High (awareness issue only)

---

**Note on "ESA's first deep-space probe" classification in description**: The description calls Giotto "ESA's first deep-space probe" — verified correct per ESA's own characterization.

---

## Hayabusa2

### 🟠 OVERREACH — Described as "In service since 2014" with status ACTIVE; mission is extended but primary Ryugu mission is complete

- **File**: `i18n-src/en-US/fleet/orbiter/hayabusa-2.json`, field: `description`; `static/data/fleet/orbiter/hayabusa-2.json`, field: `status`
- **Quote**: description: `"In service since 2014."` / status: `"ACTIVE"`
- **Issue**: The ACTIVE status is technically correct — Hayabusa2 is on an extended mission (SHARP: Small Hazardous Asteroid Reconnaissance Probe), confirmed operational as of July 5, 2026, having just completed a flyby of asteroid Torifune on July 5, 2026. So ACTIVE is accurate. However the description is a skeletal stub ("Asteroid sample return from Ryugu. In service since 2014.") that omits: (a) the Ryugu sample return capsule delivery to Earth on December 6, 2020; (b) that the spacecraft itself continued to the extended mission rather than decommissioning; (c) the Torifune flyby (2026) and planned rendezvous with 1998 KY26 (2031). The description fails to note that the Ryugu primary mission is complete and the craft is now on an extended mission.
- **Correction**: Expand description to note sample delivery (Dec 2020, ~5.4 g from Ryugu) and extended mission to Torifune (flyby July 2026) and 1998 KY26 (arrival 2031). Status ACTIVE is correct.
- **Source**: https://global.jaxa.jp/press/2026/07/20260706-3_e.html ; https://en.wikipedia.org/wiki/Hayabusa2
- **Confidence**: High

---

## Hayabusa

No errors found. Launch date 2003-05-09 confirmed. Four μ10 ion thrusters confirmed. Multiple system failures (hydrazine leak, 3 of 4 reaction wheels, ion engine) confirmed. Sample capsule recovered Woomera 2010-06-13 confirmed. ~1500 μg of Itokawa material confirmed. "First asteroid sample ever returned to Earth" — confirmed. Status RETIRED — correct.

---

## Hope (EMM)

No errors found. Launch date 2020-07-19 confirmed. Reached Mars orbit 2021 confirmed. "First Arab interplanetary mission" — confirmed. "First holistic global view of the Martian atmosphere through a complete Martian year" — confirmed. Status ACTIVE — confirmed (UAE extended mission to 2028 announced February 2026). University of Colorado LASP partnership — confirmed.

---

## JUICE

No errors found. Launch date 2023-04-14 confirmed. Ariane 5 ECA+ confirmed. Jupiter arrival July 2031 confirmed. Ganymede orbit insertion 2034 confirmed. "First spacecraft to orbit a moon other than Earth's" — confirmed (as of current plans). Ten instruments including RIME ice-penetrating radar — confirmed. Status ACTIVE — correct (en route).

---

## Juno

### 🟡 UNSUPPORTED — "Solar-powered (a first at Jupiter's distance)" — needs precision

- **File**: `i18n-src/en-US/fleet/orbiter/juno.json`, field: `description`
- **Quote**: `"Solar-powered (a first at Jupiter's distance)"`
- **Issue**: Juno is indeed the first solar-powered spacecraft to operate at Jupiter's distance from the Sun — this is confirmed. However the claim is thin context for a skeletal entry. The entry overall is a stub with no mission dates, no instrument details, no specific scientific findings. Status ACTIVE is confirmed as of February 2026 (published science results). However Juno's science mission extension was canceled in the FY2026 US budget proposal — it may be operating on residual funding or the mission may have ended. This is uncertain as of July 2026 and needs monitoring.
- **Correction**: Verify current operational status. As of February 2026 Juno published new results, suggesting it was still operational then. The FY2026 budget cancellation is a concern. If confirmed ended, update status to RETIRED.
- **Source**: https://science.nasa.gov/blogs/science-news/2026/02/04/nasas-juno-mission-redefines-size-shape-of-jupiter/ ; https://www.space.com/space-exploration/missions/nasas-juno-probe-orbiting-jupiter-may-have-come-to-an-end-but-no-one-can-confirm
- **Confidence**: Low (status uncertain; last confirmed operational Feb 2026)

---

## Notes on entries not flagged

- **Cassini**: RETIRED status correct; Huygens Titan landing "only landing on a moon of an outer planet" — correct (Huygens landed Titan Jan 14, 2005; still the only such landing). Launch 1997-10-15 correct.
- **Change1**: All claims verified.
- **Clementine**: All claims verified; BMDO + NASA partnership correctly stated.
- **Hayabusa**: All claims verified.
- **Hope**: All claims verified; UAE extended mission to 2028 means ACTIVE is correct.
- **JUICE**: All claims verified; ACTIVE en-route correct.
