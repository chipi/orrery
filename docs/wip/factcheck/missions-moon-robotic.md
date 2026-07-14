# Fact-check — Moon missions (robotic / modern)

Reviewer: science-reviewer (independent, web-verified). Date: 2026-07-14.
Scope: 13 robotic/modern lunar mission editorials — overlay (`i18n-src/en-US/missions/moon/<slug>.json`) + base (`static/data/missions/moon/<slug>.json`).

Method: every load-bearing date, `first`/superlative, quantity, and mechanism web-verified; overlay↔base cross-checked.

---

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| beresheet | PASS | — |
| blue-moon-mk1 | FAIL — stale (flew never; dates 2025, real NET 2027) | HIGH |
| chandrayaan1 | ISSUES — nation-count wrong (5th not 4th) | HIGH |
| chandrayaan3 | ISSUES — "first at the polar regions" overclaim | MED |
| change1 | PASS (minor) | LOW |
| change3 | PASS (minor day-42 typo) | LOW |
| change4 | FAIL — "longest traverse" false + 1.9 km overstated | HIGH |
| change5 | PASS (16 vs 17 Dec inconsistency) | LOW |
| change6 | PASS (touchdown 06-01 vs 06-02) | LOW |
| clementine | PASS | — |
| lunar-prospector | FAIL — "first Discovery mission" false; "first US since Explorer 49" false | HIGH |
| slim | PASS (launch 09-06 vs 09-07 UTC/local) | LOW |
| smart-1 | ISSUES — impact time wrong (02:42→05:42); "first deep-space ion drive" overclaim | HIGH |

## Counts
- HIGH: 6  (blue-moon-mk1 ×1, chandrayaan1 ×1, change4 ×2, lunar-prospector ×2, smart-1 ×1) — note some missions carry multiple HIGH
- MED: 1  (chandrayaan3)
- LOW: 6  (change1, change3, change5, change6, slim, chandrayaan1 secondary)
- Missions fully clean: beresheet, clementine
- Total distinct findings: 15

---

## beresheet — PASS

All dates verify: launch 2019-02-22 (Falcon 9 rideshare w/ Nusantara Satu ✓), LOI 2019-04-04 ✓, crash 2019-04-11 in Mare Serenitatis ✓. IMU reset → engine shutdown → impact ✓. "First privately-funded mission to reach the Moon / first Israeli lunar mission" ✓.

- Note (not a finding): base flight.event says Israel "7th country to reach the Moon" while overlay/base elsewhere focus on the private-first framing — the "7th" count is defensible (reach lunar orbit) and not asserted in the overlay. No correction needed.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Beresheet

---

## blue-moon-mk1 — FAIL (HIGH)

**HIGH — mission never flew; base data asserts a 2025 flight that did not happen**
- File: `static/data/missions/moon/blue-moon-mk1.json`
- Fields: `"year": 2025`, `"departure_date": "2025-12-01"`, `"arrival_date": "2025-12-05"`, `"transit_days": 4`; credit "NET 2025 first flight"
- Overlay: `static/../blue-moon-mk1.json` `"type": "CARGO LANDER · PLANNED"` (status OK) but description implies imminence.
- What's wrong: As of mid-2026 Blue Moon MK1 (the pathfinder lander, named **Endurance**) has **not launched**. New Glenn was lost in a hotfire/anomaly at LC-36 on **2026-05-28**; the MK1 launch is now **NET early 2027**. The concrete 2025-12-01 departure / 2025-12-05 arrival dates are fabricated-precise for an unflown mission.
- Correction: keep status PLANNED but update `year` to 2026/2027 (or mark TBD), replace the specific Dec-2025 departure/arrival with a NET-2027 window or null, and note the New-Glenn-anomaly slip. Consider naming the lander "Endurance."
- Confidence: high. Sources: https://en.wikipedia.org/wiki/Blue_Moon_Pathfinder_Mission_1 ; https://www.nasaspaceflight.com/2026/06/blue-moon-mto-update/

**LOW — landing site detail**
- Base flight.event "south polar region" ✓ (real target: Shackleton Connecting Ridge). No change needed; flagged only for the name "Endurance" enrichment.

---

## chandrayaan1 — ISSUES (HIGH + LOW)

**HIGH — nation-count wrong: India was the 5th (not 4th) agency to reach the lunar surface**
- File: `static/data/missions/moon/chandrayaan1.json`
- Field: flight.events[last].description — "…making India the **4th** nation to reach the Moon."
- What's wrong: The Moon Impact Probe hard-landing (2008-11-14) made ISRO the **5th** national space agency to reach the lunar surface (after USSR, USA, ESA, Japan/JAXA — Hiten 1993 / SELENE 2007; and the count varies by "reach surface" vs "reach Moon"). Every reliable source states **fifth**. Overlay does not make this error (it says only "first Indian object on another world," which is fine).
- Correction: change "4th" → "5th" (agency to reach the lunar surface).
- Confidence: high. Source: https://en.wikipedia.org/wiki/Moon_Impact_Probe ("ISRO became the fifth national space agency to reach the lunar surface").

**LOW — MIP impact site wording**
- File: overlay `chandrayaan1.json` events — "MIP IMPACT … targeted hard-landing near south pole" ✓ (impact near Shackleton, site named **Jawahar Point**, ~15:01 UTC 2008-11-14). Base says "hard-landed at Shackleton crater near the south pole" ✓. Both acceptable.

**LOW — water-detection framing (the flagged watch item)**
- Overlay `first`: "confirmed widespread water on the Moon"; description credits M3 (NASA instrument on ISRO orbiter). The **detection was published Sept 2009** (Pieters et al., Science), mission launched 2008. Orrery's framing correctly attributes it to M3 and does not misdate the discovery to 2008. ✓ Acceptable. Note: M3 detected surface OH/H2O signatures broadly (incl. non-polar), so "widespread" is defensible.
- Confidence: high. Source: https://www.jpl.nasa.gov/news/nasa-instruments-reveal-water-molecules-on-lunar-surface/

**LOW — operations duration**
- Overlay event "312 days of operations" ✓; contact lost 2009-08-28/29 ✓. Base says "10 months" ✓ (~312 days). Consistent.

---

## chandrayaan3 — ISSUES (MED)

**MED — "first at the polar regions" / "first at the pole" overclaim**
- Files: overlay `chandrayaan3.json` (`first`: "First soft-landing near the lunar south pole" ✓ GOOD; but description: "the first **at the polar regions**"); base flight.events[last]: "the **FIRST to land near the south pole**."
- What's wrong: Vikram landed at **69.37°S** — the highest latitude of any soft landing, and correctly described as "near"/"closest to" the south pole. But "at the polar regions"/"at the pole" overstates it — 69°S is sub-polar, ~20° short of the pole (permanently-shadowed south-polar craters sit ~80–90°S). The overlay `first` field ("near the lunar south pole") is the correct framing; the prose "at the polar regions" contradicts it.
- Correction: soften description "the first at the polar regions where future water-ice mining will likely happen" → "the closest any spacecraft has landed to a lunar pole" (already stated) — drop "at the polar regions." Base: "first to land **near** the south pole."
- Confidence: high. Sources: https://en.wikipedia.org/wiki/Chandrayaan-3 ; https://www.space.com/chandrayaan-3-moon-south-pole-why-nasa-wants-to-go-too (landing at ~69°S).

**PASS — the rest**: 4th nation to soft-land ✓ (after USSR, USA, China), touchdown 2023-08-23 12:34 UTC ✓, Shiv Shakti Point ✓, Pragyan detected sulfur (in-situ, LIBS) ✓, launch 2023-07-14 ✓, LVM3 ✓, 1st soft landing of any nation near the south pole ✓.

---

## change1 — PASS (LOW)

Verifies: launch 2007-10-24 (Long March 3A, Xichang) ✓, LOI 2007-11-07 ✓, controlled impact 2009-03-01 in Mare Fecunditatis ✓, China's first lunar mission ✓, "first [Chinese] object on the lunar surface" ✓.

**LOW — "16 months — 4 months past nominal"**
- Overlay description end. Chang'e 1 operated 2007-11 → 2009-03-01 ≈ **16 months**; nominal design life was 1 year, so "past nominal" ✓. Consistent enough.
- Confidence: medium-high. Source: https://en.wikipedia.org/wiki/Chang%27e_1

---

## change3 — PASS (LOW)

Verifies: launch 2013-12-01 (UTC; 01:30 local Dec 2) ✓ — the Dec-1 UTC date is correct. Landing 2013-12-14 Mare Imbrium ✓. First soft landing since Luna 24 (1976), 37-yr gap ✓. Yutu deployed ✓.

**LOW — Yutu longevity phrasing / "day 42" typo**
- Overlay: "operated for 31 months despite a mobility failure ending its drive on lunar day 2." Base credit: "operated through 31 lunar days despite locomotion failure on **day 42**." These conflict internally: Yutu's **mobility failed early in lunar day 2** (Jan/Feb 2014) but it **kept transmitting for ~31 lunar days** (until mid-2016). "Day 42" in the base credit appears to be an error (there was no lunar day 42; there were ~31 lunar days).
- Correction: base credit "locomotion failure on day 42" → "locomotion failure early in lunar day 2." Overlay "31 months" should read "31 lunar days" for precision (31 lunar days ≈ 30 Earth months — coincidentally close, so "31 months" is loosely defensible but imprecise).
- Confidence: medium-high. Source: https://en.wikipedia.org/wiki/Yutu_(rover)

---

## change4 — FAIL (HIGH ×2)

**HIGH — "longest traverse by any lunar rover" is FALSE**
- File: overlay `change4.json` description — "…driven 1.9+ km, the **longest traverse by any lunar rover**." Base flight.event: "the longest-**lived** lunar rover" (this one is fine).
- What's wrong: Yutu-2's ~1.6 km traverse is far short of the record. **Lunokhod 2 drove ~39 km** (1973); Apollo 17 LRV ~35.9 km. Yutu-2 is the **longest-lived / longest-operating** lunar rover, NOT the longest by distance. Overlay conflates longevity with traverse.
- Correction: "the longest traverse by any lunar rover" → "the longest-operating lunar rover in history" (matches base and the real record).
- Confidence: high. Sources: https://en.wikipedia.org/wiki/Yutu-2 ; https://ourplnt.com/driving-distances-mars-moon-records/

**HIGH — "1.9+ km" driven is overstated**
- Files: overlay `change4.json` ("driven 1.9+ km"); base credit ("driven 1.9+ km").
- What's wrong: As of **Sept 2024**, Yutu-2's odometer read **1,613 m (~1.6 km)**, and the rover has been effectively stationary since ~March 2024. "1.9+ km" is not supported by any source.
- Correction: "1.9+ km" → "~1.6 km" (or "over 1.6 km as of 2024").
- Confidence: high. Source: https://en.wikipedia.org/wiki/Yutu-2 ("As of 19 September 2024, it had driven 1.613 km").

**PASS — the rest**: launch 2018-12-07 ✓, landing 2019-01-03 at Von Kármán crater ✓ (45.5°S, 177.6°E, in SPA basin), first far-side soft landing ✓, Queqiao relay at Earth-Moon L2 launched 2018-05 ✓.

---

## change5 — PASS (LOW)

Verifies: launch 2020-11-23 (Long March 5, Wenchang) ✓, landing 2020-12-01 Mons Rümker / Oceanus Procellarum ✓, **1.731 kg** sample ✓, first robotic lunar rendezvous/docking ✓, first sample return since Luna 24 (1976), 44-yr gap ✓, young ~2 Ga volcanic samples ✓ (base says 1.97 Gyr ✓).

**LOW — Earth-return date inconsistency (16 vs 17 Dec)**
- Overlay event "EARTH RETURN … Inner Mongolia **2020-12-16**"; base flight.event "capsule landing … **2020-12-17**." Real landing: ~17:59 UTC 2020-12-16 → very early **17 December** Beijing time. Sources cite both; internally the two Orrery files disagree.
- Correction: pick one and make consistent (17 Dec local / 16 Dec UTC). Prefer 17 Dec (Beijing, matches most CNSA reporting) with UTC note, or align both to the same value.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Chang%27e_5

---

## change6 — PASS (LOW)

Verifies: launch 2024-05-03 (Long March 5, Wenchang) ✓, **1.935 kg** far-side sample ✓ (1935.3 g), Apollo crater in SPA basin ✓, Queqiao-2 relay (launched 2024-03) ✓, Earth return 2024-06-25 Inner Mongolia ✓, first far-side sample return ✓, first ascent/launch from far side ✓.

**LOW — touchdown date (06-01 vs 06-02)**
- Overlay top/`arrival_date` "2024-06-02"; base flight.event "2024-06-01." Actual far-side touchdown was **2024-06-01** (per Wikipedia/Planetary Society). Overlay's `arrival_date` 2024-06-02 is off by a day (likely UTC/Beijing boundary — landing ~06:23 UTC Jun 1 = 14:23 Beijing Jun 1, so **Jun 1** is correct either way).
- Correction: overlay `arrival_date`/events → 2024-06-01 to match base and sources.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Chang'e_6

---

## clementine — PASS

Verifies: launch 1994-01-25 (Titan II, Vandenberg) ✓, lunar orbit 1994-02-19 (polar, ~415 × 2940 km / 5-day period) ✓, joint DoD(NRL)-NASA / SDI tech demo ✓, first hints of water ice at south pole (bistatic radar, controversial) ✓, Geographos flyby lost to **thruster malfunction depleting propellant** (2024 misfire 1994-05-07, 11-min thruster firing → 80 rpm spin) ✓. "First US lunar mission after Apollo 17 (22 years)" ✓.

- Note: overlay event "THRUSTER FAIL" at met 100 vs actual failure ~102 days after launch (Jan 25 → May 7) ✓ consistent. No finding.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Clementine_(spacecraft)

---

## lunar-prospector — FAIL (HIGH ×2)

**HIGH — "first NASA Discovery-class mission" is FALSE**
- File: overlay `lunar-prospector.json` description — "The **first NASA Discovery-class mission** and the first dedicated US lunar mission since Explorer 49 (1973)."
- What's wrong: Lunar Prospector was the **third** Discovery mission. By selection order: Mars Pathfinder (#1), NEAR (#2), Lunar Prospector (#3). By launch order: NEAR Shoemaker (Feb 1996), Mars Pathfinder (Dec 1996), Lunar Prospector (Jan 1998). Either way it is not "first."
- Correction: "The first NASA Discovery-class mission" → "The third NASA Discovery-class mission" (or "an early NASA Discovery-class mission").
- Confidence: high. Sources: https://nasa.fandom.com/wiki/Discovery_Program ; https://science.nasa.gov/planetary-science/programs/discovery/

**HIGH — "first dedicated US lunar mission since Explorer 49 (1973)" is FALSE**
- File: overlay `lunar-prospector.json` description (same sentence).
- What's wrong: **Clementine (1994)** — a US joint DoD/NASA dedicated lunar mission, which Orrery itself catalogs — preceded Lunar Prospector by 4 years. So Lunar Prospector was NOT the first US dedicated lunar mission since 1973; it was the first *NASA-led/Ames* dedicated lunar mission since Apollo, or the first US lunar mission **after Clementine**. This also internally contradicts Orrery's own clementine entry ("first US lunar mission after Apollo 17, 22 years" = 1994).
- Correction: reframe — e.g. "the first dedicated US lunar orbiter of the modern era after Clementine," or "the first NASA-managed lunar mission since Apollo." Drop the Explorer-49 "first since" claim as written.
- Confidence: high. Sources: https://www.americaspace.com/2018/01/07/rediscovering-the-moon-20-years-since-lunar-prospector/ ; https://science.nasa.gov/mission/clementine/

**PASS — quantities/mechanism**: launch 1998-01-07 02:28 UTC (Athena II, CCAFS SLC-46) ✓ (Jan 6 local EST), LOI 1998-01-11 ✓ (4-day transit), 296 kg ✓, 5 instruments ✓, neutron-spectrometer hydrogen deficits at both poles ✓, Shackleton impact 1999-07-31 (no plume seen) ✓. The "~2×10⁹ tonnes hydrogen-rich material" ≈ published ~300 Mt water-ice-equivalent per pole estimate — overlay's larger figure describes hydrogen-bearing material, defensible but check units if edited.

---

## slim — PASS (LOW)

Verifies: landing 2024-01-19, **~55 m** accuracy at Shioli crater ✓, Japan 5th nation to soft-land ✓, "Moon Sniper" pinpoint <100 m ✓, tipped over (thrust-vector/engine-nozzle anomaly, nose-down) ✓, solar panels caught sun days later → operations resumed ✓, low-energy transfer ✓, 2 micro-rovers LEV-1/LEV-2 ✓.

**LOW — launch date 09-06 vs 09-07**
- Overlay/`departure_date` "2023-09-06"; base flight.event "2023-09-07." Launch was **2023-09-06 23:42 UTC** (= Sept 7 JST). Base's 09-07 is local Japan time; overlay's 09-06 is UTC. Internally inconsistent.
- Correction: pick one basis; UTC (09-06) preferred for consistency with other entries.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Smart_Lander_for_Investigating_Moon

**Note (not a finding)**: overlay `first` "First precision landing within 100 m of target on another world" — accurate for SLIM as the first sub-100 m demonstrated lunar landing. ✓

---

## smart-1 — ISSUES (HIGH + LOW)

**HIGH — impact time wrong: 02:42 UTC should be 05:42 UTC**
- File: overlay `smart-1.json` — description "Deliberately impacted Lacus Excellentiae (34.4°S, 46.2°W) on 2006-09-03 **02:42 UTC**" and event "LACUS EXCELLENTIAE IMPACT … 2006-09-03 **02:42 UTC**."
- What's wrong: SMART-1 impacted at **05:42 UTC** (last signal 05:42:22 UT), 2006-09-03. The "02:42" is a 3-hour error (both occurrences).
- Correction: "02:42 UTC" → "05:42 UTC" (both the description and the event note).
- Confidence: high. Sources: https://sci.esa.int/web/smart-1-lunar-impact/ ; https://spacenews.com/smart-1-smackdown-in-the-lake-of-excellence/ ; https://en.wikipedia.org/wiki/Lacus_Excellentiae

**HIGH/MED — "first deep-space ion-drive cruise to a planetary body" is an overclaim**
- File: overlay `smart-1.json` `first`: "First European spacecraft to reach the Moon + **first deep-space ion-drive cruise to a planetary body**"; description echoes "13-month low-thrust spiral rather than the days-long chemical transfer of every prior lunar mission."
- What's wrong: **Deep Space 1** (NASA, launched 1998-10-24) used ion propulsion as its primary deep-space drive and flew by asteroid 9969 Braille and comet Borrelly — five years before SMART-1 (2003). So SMART-1 was NOT the first deep-space ion-drive mission to a planetary body. SMART-1's true firsts: **Europe's first lunar mission / first European spacecraft to reach the Moon**, and the first mission to use ion propulsion to reach the Moon.
- Correction: reframe the superlative — e.g. "First European spacecraft to reach the Moon; first mission to reach the Moon under ion propulsion." Drop/qualify "first deep-space ion-drive cruise to a planetary body" (DS1 predates it).
- Confidence: high. Sources: https://science.nasa.gov/mission/deep-space-1/ ; https://en.wikipedia.org/wiki/Deep_Space_1 ; https://en.wikipedia.org/wiki/SMART-1

**PASS — the rest**: launch 2003-09-27 (Ariane 5, Kourou, rideshare w/ Insat-3E + e-Bird) ✓, lunar capture 2004-11-15 ✓, ~13-month ion spiral ✓, 367 kg ✓, PPS-1350-G Hall-effect thruster ✓, D-CIXS first X-ray fluorescence global elemental maps ✓, first European spacecraft to reach the Moon ✓, impact site 34.4°S 46.2°W ✓.
