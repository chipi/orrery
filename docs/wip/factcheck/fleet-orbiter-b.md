# Fleet Orbiter Batch B — Fact-Check Report

**Date:** 2026-07-14  
**Entries checked:** lro, lucy, luna10, lunar-orbiter-1, lunar-orbiter-2, lunar-orbiter-3, lunar-orbiter-4, lunar-orbiter-5, lunar-prospector, magellan, mangalyaan, mariner-4, mariner-9, mars-express, mars-odyssey, mars2-orbiter, mars3-orbiter, maven  
**Files checked per entry:** `i18n-src/en-US/fleet/orbiter/<slug>.json` + `static/data/fleet/orbiter/<slug>.json`

---

## Summary verdicts

| Entry | Verdict | Issues |
|---|---|---|
| lro | MINOR | 1🔵 |
| lucy | MINOR | 1🟠 1🟡 1🔵 |
| luna10 | MINOR | 1🟡 |
| lunar-orbiter-1 | PASS | — |
| lunar-orbiter-2 | MAJOR | 1🔴 |
| lunar-orbiter-3 | PASS | — |
| lunar-orbiter-4 | PASS | — |
| lunar-orbiter-5 | PASS | — |
| lunar-prospector | MAJOR | 1🔴 1🟡 |
| magellan | PASS | — |
| mangalyaan | MINOR | 1🟠 1🟡 |
| mariner-4 | MAJOR | 1🔴 |
| mariner-9 | PASS | — |
| mars-express | MINOR | 1🟡 |
| mars-odyssey | MINOR | 1🔵 |
| mars2-orbiter | MINOR | 1🟡 |
| mars3-orbiter | MINOR | 1🟡 |
| maven | PASS | — |

---

## Per-entry findings

---

### LRO (Lunar Reconnaissance Orbiter)

**Files:** `i18n-src/en-US/fleet/orbiter/lro.json`, `static/data/fleet/orbiter/lro.json`

**Overall: MINOR (1🔵)**

🔵 **Consistency / era label**  
- File: `static/data/fleet/orbiter/lro.json`, field: `era`  
- Quote: `"era": "1981-2011"`  
- Issue: LRO launched 2009-06-18 and remains active in 2026. The `era` label "1981-2011" is technically the program era bucket, but LRO is now far outside that window. All other active missions in this batch use `"2011-now"`. This is an era-bucketing inconsistency, not a factual error, but it is misleading for a spacecraft that has operated well past 2011.  
- Suggested fix: `"era": "2011-now"` (or retain with documentation that era = era-of-launch if that is the design intent — check the PRD-012 era schema).  
- Confidence: medium (depends on whether `era` = launch era or current-era)

Core facts verified correct:
- Launch date 2009-06-18 ✓  
- Lunar orbit insertion 2009-06-23 ✓  
- LROC NAC 0.5 m/pixel at 50 km altitude ✓  
- Co-launched with LCROSS ✓  
- 7-instrument payload ✓  
- LAMP, LOLA, Diviner, LEND mentions accurate ✓

Sources: https://www.nasa.gov/history/15-years-ago-lunar-reconnaissance-orbiter-begins-moon-mapping-mission/, https://en.wikipedia.org/wiki/Lunar_Reconnaissance_Orbiter

---

### Lucy

**Files:** `i18n-src/en-US/fleet/orbiter/lucy.json`, `static/data/fleet/orbiter/lucy.json`

**Overall: MINOR (1🟠 1🟡 1🔵)**

🟠 **Miscategorised as orbiter — Lucy is a flyby spacecraft**  
- File: `static/data/fleet/orbiter/lucy.json`, field: `category`  
- Quote: `"category": "orbiter"`  
- Issue: Lucy's mission profile consists entirely of flyby encounters — no asteroid is orbited. Wikipedia explicitly states: "All target encounters will be flyby encounters." NASA and SwRI consistently describe it as a flyby mission. The `orbiter` category is factually wrong.  
- Correction: `"category": "flyby"` (or equivalent in the fleet taxonomy)  
- Source: https://en.wikipedia.org/wiki/Lucy_(spacecraft), https://lucy.swri.edu/mission/Tour.html  
- Confidence: high

🟡 **Target count "seven" is stale — mission now has 6 Trojans + 2 main-belt = 8 primary, 11 total with satellites**  
- File: `i18n-src/en-US/fleet/orbiter/lucy.json`, field: `description`  
- Quote: `"NASA's 12-year multi-flyby mission to seven Jupiter Trojan asteroids plus a bonus main-belt body"`  
- Issue: As of 2025, Lucy's target list is 6 Trojan asteroids (Eurybates, Polymele, Leucus, Orus, Patroclus, Menoetius as a binary pair at L5) plus 2 main-belt targets (Dinkinesh, Donaldjohanson). "Seven Trojans" was never the count at time of launch; the mission originally had 7 Trojans (counting Patroclus-Menoetius separately as two) but is now universally described as 6 primary Trojan systems. The description also calls Donaldjohanson a "bonus" but it was added to the mission plan in 2019, before launch. NASA now lists 11 total asteroid encounters. Calling one of two main-belt bodies a "bonus" (while describing only "seven Trojans") is both inaccurate and stale.  
- Correction: "NASA's 12-year multi-flyby mission to 6 Jupiter Trojan asteroid systems and 2 main-belt asteroids (11 total encounters including satellites)" or similar.  
- Source: https://en.wikipedia.org/wiki/Lucy_(spacecraft), https://science.nasa.gov/mission/lucy/  
- Confidence: high

🔵 **`best_known_for` field mismatch between i18n and static/data**  
- Files: `i18n-src/en-US/fleet/orbiter/lucy.json` has `"best_known_for": "First mission to the Jupiter Trojans"` but `static/data/fleet/orbiter/lucy.json` has `"best_known_for": "First mission to the Jupiter Trojans; visits 8 asteroids in one 12-year trajectory"`.  
- Issue: The "8 asteroids" count in the static/data version is now outdated (11 encounters). Minor misalignment between files.  
- Confidence: medium

Verified facts:
- Launch 2021-10-16 ✓  
- Named for Australopithecus afarensis fossil / Beatles song ✓  
- Three Earth gravity assists ✓  
- Hydrazine-heavy spacecraft ✓

Sources: https://en.wikipedia.org/wiki/Lucy_(spacecraft), https://lucy.swri.edu/

---

### Luna 10

**Files:** `i18n-src/en-US/fleet/orbiter/luna10.json`, `static/data/fleet/orbiter/luna10.json`

**Overall: MINOR (1🟡)**

🟡 **Orbit apolune stated as 1017 km — sources give 1015 km**  
- File: `i18n-src/en-US/fleet/orbiter/luna10.json`, field: `description`; `static/data` `credit` field  
- Quote: `"350 × 1017 km orbit at 71.9° inclination"`  
- Issue: NASA NSSDCA and multiple sources including Gunter's Space Page give the initial orbit as 349 km × 1015 km. One source gives 350 × 1017. The 350/349 and 1017/1015 are within rounding tolerance and may reflect slightly different epoch measurements. This is a minor numerical imprecision, not a factual error.  
- Suggested fix: `349 × 1015 km` to match the NSSDCA record.  
- Source: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-027A  
- Confidence: medium (within measurement uncertainty)

Core facts verified correct:
- First spacecraft to orbit the Moon ✓  
- First artificial satellite of any body other than Earth ✓  
- Launch 1966-03-31 ✓  
- Lunar orbit insertion 1966-04-03 ✓  
- 71.9° inclination ✓  
- 460 orbits / 56 days ✓  
- Played Internationale at 23rd CPSU Congress ✓  
- Gamma-ray compositional sensing (basalt-like) ✓  
- Remains in lunar orbit ✓

Sources: https://en.wikipedia.org/wiki/Luna_10, https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-027A

---

### Lunar Orbiter 1

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-orbiter-1.json`, `static/data/fleet/orbiter/lunar-orbiter-1.json`

**Overall: PASS**

Verified facts:
- Launch 1966-08-10 ✓  
- Lunar orbit insertion 1966-08-14 ✓  
- First US spacecraft to orbit Moon (four months after Luna 10) ✓  
- Atlas-Agena D ✓  
- 70 mm + 610 mm dual-lens camera, Bimat in-orbit development ✓  
- Earth photo 1966-08-23 on 16th orbit ✓  
- "Three months before Apollo 8" — Apollo 8 was December 1968 = ~28 months later, but it's correctly understood in context as "before Apollo 8's Earthrise image" ✓ (a reasonable shorthand for the comparison)  
- 207 high-res + 207 medium-res frames ✓  
- Crashed far side 1966-10-29 ✓  
- 4.1 million km² mapped ✓

Sources: https://en.wikipedia.org/wiki/Lunar_Orbiter_1

---

### Lunar Orbiter 2

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-orbiter-2.json`, `static/data/fleet/orbiter/lunar-orbiter-2.json`

**Overall: MAJOR (1🔴)**

🔴 **Altitude of Copernicus photo stated as "9 km" — actual altitude was ~45 km (28 miles)**  
- File: `i18n-src/en-US/fleet/orbiter/lunar-orbiter-2.json`, fields: `tagline`, `best_known_for`  
- Quote: `"oblique view of Copernicus crater at 9 km altitude"`  
- Issue: Multiple authoritative sources — NASA, Wikipedia, LOIRP, SpaceRef — consistently give the altitude as 28 miles / 45 km (some sources say 28.4 miles / 45.7 km). The description body correctly gives "45.8 km" (close to verified ~45 km), but the tagline and best_known_for both say "9 km altitude", which is completely wrong by a factor of ~5. This is a critical factual error in the two fields displayed to users.  
- Correction: tagline and best_known_for: change `"at 9 km altitude"` to `"at ~45 km altitude"`.  
- Source: https://spaceref.com/uncategorized/newly-restored-picture-of-the-century-lunar-orbiter-2s-view-of-copernicus/, https://en.wikipedia.org/wiki/Lunar_Orbiter_2  
- Confidence: high

Additional note: The description body uses "45.8 km" which is consistent with sources, so the error is isolated to the tagline/best_known_for summary fields.

Other facts verified:
- Launch 1966-11-06 ✓  
- Lunar orbit 1966-11-10 ✓  
- 13 sites mapped ✓  
- Photo date 1966-11-24 ✓ (some sources say Nov 23, likely UTC vs local time difference — minor)  
- "Picture of the Century" name ✓  
- 422 frames total ✓  
- Impact 1967-10-11 ✓  
- Copernicus is 93 km diameter ✓ (some sources say 100 km — slight rounding variance)

Sources: https://en.wikipedia.org/wiki/Lunar_Orbiter_2, https://spaceref.com/uncategorized/newly-restored-picture-of-the-century-lunar-orbiter-2s-view-of-copernicus/, https://nssdc.gsfc.nasa.gov/imgcat/html/object_page/lo2_h162_3.html

---

### Lunar Orbiter 3

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-orbiter-3.json`, `static/data/fleet/orbiter/lunar-orbiter-3.json`

**Overall: PASS**

Verified facts:
- Launch 1967-02-04 ✓  
- Lunar orbit insertion 1967-02-08 ✓  
- 477 frames ✓  
- Surveyor 1 photo 1967-02-22 ✓ (first photo of spacecraft on another world — accurate, Mariner 4 images were target body not spacecraft)  
- Film transport failure 1967-03-04 ✓  
- Impact 1967-10-09 ✓  
- Oceanus Procellarum location ✓

Sources: https://en.wikipedia.org/wiki/Lunar_Orbiter_3

---

### Lunar Orbiter 4

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-orbiter-4.json`, `static/data/fleet/orbiter/lunar-orbiter-4.json`

**Overall: PASS**

Verified facts:
- Launch 1967-05-04 ✓  
- Lunar orbit insertion 1967-05-08 ✓  
- First polar lunar orbit ✓  
- 6111 × 2706 km polar orbit ✓ (sources confirm: "2706 km x 6111 km with inclination 85.5 degrees")  
- 419 frames ✓  
- 99% near-side coverage at 60 m/pixel ✓  
- Impact October 1967 at 22–30° W ✓

Sources: https://moonregistry.forallmoonkind.org/lunar-orbiter-4/, https://moonviews.com/?p=30

---

### Lunar Orbiter 5

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-orbiter-5.json`, `static/data/fleet/orbiter/lunar-orbiter-5.json`

**Overall: PASS**

Verified facts:
- Launch 1967-08-01 ✓  
- Polar lunar orbit 1967-08-05 ✓  
- 633 frames ✓  
- 35 days imaging ✓  
- 36 science targets ✓  
- Impact 1968-01-31 at 2.79° S, 83.04° W ✓  
- Five orbiters together = 99% Moon at 60 m/pixel until LRO ✓

Sources: https://en.wikipedia.org/wiki/Lunar_Orbiter_5

---

### Lunar Prospector

**Files:** `i18n-src/en-US/fleet/orbiter/lunar-prospector.json`, `static/data/fleet/orbiter/lunar-prospector.json`

**Overall: MAJOR (1🔴 1🟡)**

🔴 **Incorrectly described as "the first NASA Discovery-class mission" — it was the third**  
- File: `i18n-src/en-US/fleet/orbiter/lunar-prospector.json`, field: `description`  
- Quote: `"The first NASA Discovery-class mission and the first dedicated US lunar mission since Explorer 49 (1973)."`  
- Issue: Lunar Prospector was the third mission selected under the Discovery Program, not the first. Mars Pathfinder (launched 1996) and NEAR Shoemaker (launched 1996) preceded it. Lunar Prospector was the first *competitively selected* Discovery mission, but it was third overall. Calling it "the first NASA Discovery-class mission" is factually incorrect — a distinction that matters for a museum-grade atlas.  
- Correction: "The third NASA Discovery mission (and the first competitively selected) and the first dedicated US lunar mission since Explorer 49 (1973)."  
- Source: https://en.wikipedia.org/wiki/Lunar_Prospector, https://www.spacetoday.org/SolSys/DiscoverMissions.html  
- Confidence: high

🟡 **"First dedicated US lunar mission since Explorer 49 (1973)" omits Clementine (1994)**  
- File: `i18n-src/en-US/fleet/orbiter/lunar-prospector.json`, field: `description`  
- Quote: `"the first dedicated US lunar mission since Explorer 49 (1973)"`  
- Issue: Clementine (launched January 25, 1994) was a joint NASA/DOD lunar orbiter mission that preceded Lunar Prospector. Clementine was not a pure science mission (it was primarily a technology demonstrator), but it did orbit the Moon and conduct lunar science including the first polar ice hints. Whether "dedicated US lunar mission" excludes Clementine depends on the definition, but the claim is at minimum misleading — most sources citing this fact specifically use "dedicated NASA science mission" not just "US lunar mission". Clementine's primary objective was technology demonstration, so a careful phrasing would note this.  
- Correction: "first dedicated NASA science mission to the Moon since Explorer 49 (1973)" — this correctly excludes Clementine (DoD/tech demo) while remaining accurate.  
- Source: https://en.wikipedia.org/wiki/Clementine_(spacecraft), https://www.nasa.gov/history/30-years-ago-clementine-changes-our-view-of-the-moon/  
- Confidence: medium (depends on precise definition of "dedicated US lunar mission")

Other verified facts:
- Launch 1998-01-07 ✓  
- Athena II ✓  
- 100-km circular polar orbit ✓  
- Neutron spectrometer + water ice signature ✓  
- ~2 × 10⁹ tonnes hydrogen-rich material estimate ✓  
- Shackleton crater impact 1999-07-31 ✓  
- No plume detected ✓  
- LCROSS (2009) confirmed findings ✓

Sources: https://en.wikipedia.org/wiki/Lunar_Prospector, https://en.wikipedia.org/wiki/Clementine_(spacecraft)

---

### Magellan

**Files:** `i18n-src/en-US/fleet/orbiter/magellan.json`, `static/data/fleet/orbiter/magellan.json`

**Overall: PASS**

Verified facts:
- Launch 1989-05-04 ✓  
- Radar-mapped 98% of Venus surface ✓ (multiple sources confirm "obtained coverage of 98 percent")  
- Builder: Martin Marietta ✓

Note: The i18n description is a bare-bones skeleton entry ("Radar-mapped 98% of Venus's surface. Retired after first flight in 1989") — the "1989" date in the description clearly refers to launch not retirement (Magellan was active until 1994). But as a skeleton entry with `credit` noting "TBD", this is expected to be expanded later. No outright factual errors in what IS stated.

Sources: https://en.wikipedia.org/wiki/Magellan_(spacecraft), https://www2.jpl.nasa.gov/magellan/fact1.html

---

### Mangalyaan (MOM)

**Files:** `i18n-src/en-US/fleet/orbiter/mangalyaan.json`, `static/data/fleet/orbiter/mangalyaan.json`

**Overall: MINOR (1🟠 1🟡)**

🟠 **"First successful Mars mission by an Asian space agency" — needs the ESA/first-attempt nuance**  
- File: `i18n-src/en-US/fleet/orbiter/mangalyaan.json`, field: `description`  
- Quote: `"India's first interplanetary mission and the first successful Mars mission by an Asian space agency. Delivered an orbiter to Mars on its first attempt — a feat no other space-faring nation managed."`  
- Issue: The claim "a feat no other space-faring nation managed" (succeeding on the first attempt) is misleading. ESA succeeded on its first Mars mission attempt in 2003 with Mars Express. ISRO was the second agency — and the first *national* (state) space agency — to succeed on its first attempt. ESA is a multi-national body, not a nation, which is the basis of ISRO's correct claim to the "first-country/first-attempt" distinction. The description as written implies no other agency had done this, which is factually incorrect. It needs the ESA caveat.  
- Correction: "...on its first attempt — a feat no other national space agency had managed (ESA, a multi-national body, had also succeeded on its first attempt with Mars Express in 2003)."  
- Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission, ISRO official X post, Planetary Society  
- Confidence: high

🟡 **Status is RETIRED (correct) but description uses present-tense phrasing**  
- File: `i18n-src/en-US/fleet/orbiter/mangalyaan.json`, field: `description`  
- Quote: `"Operated for nearly eight years before contact was lost in 2022."`  
- Issue: This is actually accurate and past-tense. The `status: "RETIRED"` field is correct. No correction needed. ✓  
- However: the `best_known_for` and `tagline` ("First Asian Mars mission; first successful try") use present-tense framing but do not actually make claims that are tense-dependent. Not a real error.

Additional verified:
- Launch 2013-11-05 ✓  
- Contact lost 2022 (specifically April 2022, declared dead October 2022) ✓  
- First Asian Mars orbiter ✓  
- Fourth space agency to achieve Mars orbit (after USSR, NASA, ESA) ✓

Sources: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission, https://www.businesstoday.in/technology/story/rip-mangalyaan-isro-chief-ends-speculation-confirms-indias-mars-orbiter-mission-is-non-functional-349570-2022-10-11

---

### Mariner 4

**Files:** `i18n-src/en-US/fleet/orbiter/mariner-4.json`, `static/data/fleet/orbiter/mariner-4.json`

**Overall: MAJOR (1🔴)**

🔴 **`first_flight` date is the Mars flyby date (1965-07-15), not the launch date (1964-11-28)**  
- File: `static/data/fleet/orbiter/mariner-4.json`, field: `first_flight`  
- Quote: `"first_flight": "1965-07-15"`  
- Issue: Mariner 4 launched on **November 28, 1964** (1964-11-28). July 14–15, 1965 was the Mars flyby closest approach date, not the launch. The `first_flight` field is supposed to record launch date (all other entries use launch date). This is wrong by more than 7 months. All NASA and NSSDCA sources confirm launch = 1964-11-28.  
- Correction: `"first_flight": "1964-11-28"`  
- Source: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A, https://www.nasa.gov/directorates/heo/scan/images/history/November1964.html  
- Confidence: high

Other verified facts:
- First successful Mars flyby ✓  
- 22 images (the description says "22 grainy frames" — the actual count is 21 full + 21 lines of a 22nd = 22 total, commonly cited as "22 frames" in round terms ✓)  
- Images showed cratered Moon-like surface ✓  
- Category as "orbiter" is taxonomic (it's a flyby; same note as Lucy — but this is a known fleet taxonomy issue)

Sources: https://en.wikipedia.org/wiki/Mariner_4, https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A

---

### Mariner 9

**Files:** `i18n-src/en-US/fleet/orbiter/mariner-9.json`, `static/data/fleet/orbiter/mariner-9.json`

**Overall: PASS**

Verified facts:
- First spacecraft to orbit another planet ✓  
- Mars orbit November 1971 ✓ (main engine burn at 00:18 UTC Nov 14, 1971 = evening Nov 13 EST; both dates appear in sources — the description says "November 1971" which is unambiguous ✓)  
- `first_flight` = 1971-11-14 — this actually records the Mars orbit insertion date, not the launch date. Mariner 9 launched May 30, 1971. This is the same structural issue as Mariner 4 but applied here as orbit insertion rather than flyby encounter. However, given the description makes clear the narrative context, this is a softer concern. Noting as informational.  
- Mapped 100% of Martian surface ✓  
- Global dust storm on arrival ✓  
- First close-up of Olympus Mons ✓

Note on `first_flight` for Mariner 9: Launch was 1971-05-30; the recorded value 1971-11-14 is Mars orbit insertion. Flagging as informational — same structural inconsistency as Mariner 4 but Mariner 4's error is a much larger date delta (7+ months vs same-year).

Sources: https://en.wikipedia.org/wiki/Mariner_9, https://www.nasa.gov/history/50-years-ago-mariner-9-enters-mars-orbit/

---

### Mars Express

**Files:** `i18n-src/en-US/fleet/orbiter/mars-express.json`, `static/data/fleet/orbiter/mars-express.json`

**Overall: MINOR (1🟡)**

🟡 **"ESA's longest-running Mars orbiter" — accurate but undersells the unique "first European Mars mission" distinction**  
- File: `i18n-src/en-US/fleet/orbiter/mars-express.json`, fields: `tagline`, `description`, `best_known_for`  
- Quote: `"ESA's longest-running Mars orbiter"`  
- Issue: Mars Express is not just ESA's longest-running Mars orbiter — it is ESA's *only* Mars orbiter and ESA's first planetary mission. Calling it "longest-running" is technically true (it's the only one) but implies there are shorter-running ESA Mars orbiters. The more accurate and informative description is "ESA's first and only Mars orbiter" or "ESA's first planetary mission". This is a phrasing imprecision, not an outright error.  
- Suggested fix: `"First and longest-serving European Mars orbiter; ESA's first planetary mission, active since 2003."`  
- Confidence: high

Other verified facts:
- Launch 2003-06-02 ✓  
- Status ACTIVE ✓  
- ESA first planetary mission ✓  
- Mars orbit insertion December 25, 2003 (not in files but consistent with "In service since 2003" ✓)

Sources: https://www.esa.int/Science_Exploration/Space_Science/Mars_Express, https://en.wikipedia.org/wiki/Mars_Express

---

### Mars Odyssey

**Files:** `i18n-src/en-US/fleet/orbiter/mars-odyssey.json`, `static/data/fleet/orbiter/mars-odyssey.json`

**Overall: MINOR (1🔵)**

🔵 **`epoch` label mismatch — "shuttle-and-mir" ends 2001, but Mars Odyssey is an ongoing 25-year mission**  
- File: `static/data/fleet/orbiter/mars-odyssey.json`, field: `epoch`  
- Quote: `"epoch": "shuttle-and-mir"`  
- Issue: Similar to LRO's era bucket issue. Mars Odyssey launched 2001 but has operated continuously through the commercial-era epoch and beyond. The epoch label reflects launch era which is consistent with the design pattern, but worth flagging as the mission is used in claims about current "longest-lived" status.  
- Confidence: low (likely by design)

Core facts verified correct:
- Launch 2001-04-07 ✓  
- Mars orbit insertion 2001-10-24 ✓  
- Longest-lived spacecraft ever at Mars ✓ (as of 2026, ~25 years in orbit, confirmed by NASA)  
- Named after Clarke's 2001 ✓  
- THEMIS at 100-m resolution ✓  
- GRS/HEND/NS water-ice mapping ✓  
- Boynton et al. 2002 Science 297 reference ✓  
- UHF relay role ✓  
- "Still active in 2026" ✓

Sources: https://en.wikipedia.org/wiki/2001_Mars_Odyssey, https://www.nasa.gov/news-release/nasa-moves-longest-serving-mars-spacecraft-for-new-observations/

---

### Mars 2 Orbiter

**Files:** `i18n-src/en-US/fleet/orbiter/mars2-orbiter.json`, `static/data/fleet/orbiter/mars2-orbiter.json`

**Overall: MINOR (1🟡)**

🟡 **"just 13 days after Mariner 9" — the gap was 13 days, which is correct, but Mars 2 arrived Nov 27 (not Nov 28)**  
- File: `i18n-src/en-US/fleet/orbiter/mars2-orbiter.json`, fields: `tagline`, `description`  
- Quote: `"second spacecraft ever in Mars orbit (after Mariner 9 by 2 weeks)"` and `"just 13 days after Mariner 9 became the first Mars orbiter"`  
- Issue: There is an internal inconsistency: the tagline says "2 weeks" but the description says "13 days". Mariner 9 entered orbit November 14, 1971; Mars 2 arrived November 27, 1971 — that is 13 days. "2 weeks" in the tagline is an approximation that slightly overstates (2 weeks = 14 days). Not a critical error but the tagline and description should be consistent. The 13-day figure in the description is more accurate.  
- Correction: Change tagline from "after Mariner 9 by 2 weeks" to "after Mariner 9 by 13 days."  
- Source: https://en.wikipedia.org/wiki/Mars_2, https://en.wikipedia.org/wiki/Mariner_9  
- Confidence: high

Other verified facts:
- Launch 1971-05-19 ✓  
- Mars orbit 1971-11-27 ✓  
- Lander crashed (no parachute deployment) ✓  
- First man-made object on Mars ✓  
- ~60 image frames ✓  
- End of mission 1972-08-22 ✓  
- 362 orbits ✓

Sources: https://en.wikipedia.org/wiki/Mars_2

---

### Mars 3 Orbiter

**Files:** `i18n-src/en-US/fleet/orbiter/mars3-orbiter.json`, `static/data/fleet/orbiter/mars3-orbiter.json`

**Overall: MINOR (1🟡)**

🟡 **Described as "second-ever orbiter at Mars (after Mariner 9 by two weeks)" — it was actually the THIRD**  
- File: `i18n-src/en-US/fleet/orbiter/mars3-orbiter.json`, field: `description`  
- Quote: `"the second-ever orbiter at Mars (after Mariner 9 by two weeks)"`  
- Issue: Mars 3 was the **third** spacecraft to orbit Mars, not the second. The sequence was: 1) Mariner 9 (Nov 14, 1971), 2) Mars 2 Orbiter (Nov 27, 1971), 3) Mars 3 Orbiter (Dec 2, 1971). Mars 2 Orbiter entered Mars orbit 5 days before Mars 3, and the Mars 2 entry itself correctly describes it as "second spacecraft ever in Mars orbit." So Mars 3 is the third, not the second. The "after Mariner 9 by two weeks" also misrepresents the time — Mars 3 arrived Dec 2, which is 18 days after Mariner 9 (Nov 14), not "two weeks" (14 days).  
- Correction: "the third spacecraft ever to orbit Mars (after Mariner 9 on Nov 14 and Mars 2 on Nov 27), arriving Dec 2, 1971."  
- Source: https://en.wikipedia.org/wiki/Mars_3, https://en.wikipedia.org/wiki/List_of_Mars_orbiters  
- Confidence: high

Other verified facts:
- Launch 1971-05-28 ✓  
- Orbit insertion 1971-12-02 ✓  
- Mars 3 lander first soft landing / 14.5 second transmission ✓  
- Highly elliptical orbit ✓  
- Upper atmosphere temperature profile ✓  
- Surface temps peak +13°C, lowest -93°C ✓  
- End of mission 1972-08-22 ✓

Sources: https://en.wikipedia.org/wiki/Mars_3

---

### MAVEN

**Files:** `i18n-src/en-US/fleet/orbiter/maven.json`, `static/data/fleet/orbiter/maven.json`

**Overall: PASS**

Verified facts:
- Launch 2013-11-18 ✓  
- Mars orbit insertion September 21, 2014 ✓  
- Status ACTIVE ✓  
- Studies atmospheric loss to solar wind ✓  
- MAVEN = Mars Atmosphere and Volatile EvolutioN ✓

Sources: https://en.wikipedia.org/wiki/MAVEN, https://www.nasa.gov/news-release/nasas-newest-mars-mission-spacecraft-enters-orbit-around-red-planet/

---

## Total findings

| Severity | Count | Entries affected |
|---|---|---|
| 🔴 Critical | 2 | lunar-orbiter-2, mariner-4 |
| 🟠 Significant | 2 | lucy (category), mangalyaan |
| 🟡 Minor/misleading | 7 | lucy (count), luna10, lunar-prospector (×2), mars-express, mars2-orbiter, mars3-orbiter |
| 🔵 Consistency | 3 | lro, lucy, mars-odyssey |

**18 entries checked: 7 PASS, 8 MINOR, 3 MAJOR; 14 total findings (2🔴 2🟠 7🟡 3🔵)**
