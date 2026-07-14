# Fact-check — MISSION editorials (small-body / sample-return)

Reviewer pass, web-verified. Scope: prose overlay (`i18n-src/en-US/missions/<subdir>/<slug>.json`)
+ base data (`static/data/missions/<subdir>/<slug>.json`) for 9 missions.

**Severity key:** 🔴 ERROR (wrong fact) · 🟠 OVERREACH (claim > evidence) ·
🟡 UNSUPPORTED (needs source / softening) · 🔵 NIT (imprecision).

## Verdicts (one line each)

| Mission | Verdict | Findings |
|---|---|---|
| **rosetta** | ⚠️ Has a genuine factual error — the D/H "ruled out Jupiter-family comets" claim was overturned by a 2024 re-analysis. Plus a 60-vs-64 hr internal split. | 1🔴 1🟠 3🔵 |
| **giotto** | ⚠️ Overlay says dust impact "14 s before" CA; base says "two seconds"; real ≈ 7.6 s. Internal contradiction + wrong number. | 1🔴 1🟠 2🔵 |
| **dart** | Solid. Impact velocity 6.14 vs commonly-cited 6.6; xenon/hydrazine mass conflated. | 1🟠 1🟡 1🔵 |
| **lucy** | Both files omit Dinkinesh (first flyby, Nov 2023) entirely; "8 asteroids" undercount now that Dinkinesh+Selam raise the tally to 11. | 1🟠 2🟡 1🔵 |
| **hayabusa2** | Mostly correct. Return date is UTC-vs-local (5 vs 6 Dec); 2001 CC21 now named Torifune; SCI crater 10 vs 14.5 m ambiguity. | 2🟡 2🔵 |
| **hayabusa1** | Correct on the load-bearing facts. Overlay "two of four" vs base "3 of 4" reaction wheels — internal split. | 1🟠 1🔵 |
| **osiris-rex** | Clean. Minor "most precise ever flown" superlative unsourced. | 1🟡 1🔵 |
| **dawn** | Clean. Superlative and dates check out. | 1🔵 |
| **hera** | Correct as written. Arrival now targeted earlier (Oct 2026) than the 2026-12-28 in data. | 1🔵 |

**Totals: 9 missions — 2🔴 · 4🟠 · 8🟡 · 13🔵**
Worst: **rosetta** (overturned D/H science) and **lucy** (missing Dinkinesh).

---

## rosetta

### 🔴 D/H "ruled out Jupiter-family comets as Earth's water source" — overturned by 2024 re-analysis
- **File / field:** overlay `description` + base `credit`.
- **Quote (overlay):** "a deuterium-to-hydrogen ratio that ruled Jupiter-family comets out as Earth's primary water source"; **(base credit):** "deuterium-to-hydrogen ratio that ruled out Jupiter-family comets as Earth's primary water source".
- **What's wrong:** This states the 2015 Altwegg result (67P's D/H ≈ 3× terrestrial) as settled fact. A **2024 re-analysis found a significant measurement error** in the ROSINA D/H; the corrected value is *similar to Earth's water*, which corroborates rather than rules out Jupiter-family comets. The atlas presents an obsolete conclusion as current.
- **Correction:** Soften to the era-accurate framing and flag the reversal — e.g. "67P's initially-measured D/H ratio (≈3× terrestrial) argued against Jupiter-family comets as Earth's water source — a result a 2024 re-analysis has since called into question after finding a measurement error." Note the base file even *links* the superseded 2015 Altwegg paper (`science.1261952`) as the authority.
- **Source:** https://en.wikipedia.org/wiki/Rosetta_(spacecraft) ("a re-analysis published in 2024 identified a significant measurement error… similar to Earth's… corroborates Jupiter family comets").
- **Confidence:** High (the 2024 correction is documented; the claim as written is now false).

### 🟠 Philae science duration — overlay/credit "~60 hours" vs base event "64 hours" (internal contradiction)
- **File / field:** overlay `description` ("returned ~60 hours of science"); base `credit` ("~60 hours"); base `flight.events[67P]` `description` ("returned 64 hours of surface data").
- **What's wrong:** The same file family gives two numbers. Widely-cited figure is ~64 hours (about 2.5 days) of primary-battery science after the triple bounce.
- **Correction:** Pick one (64 hr is the standard citation) and make all three agree.
- **Source:** https://science.nasa.gov/mission/rosetta-philae/ ; https://en.wikipedia.org/wiki/Philae_(spacecraft)
- **Confidence:** High (the internal split is objective; 64 hr is the common figure).

### 🔵 Lutetia diameter "100 km" vs commonly-cited ~120 km
- **File / field:** overlay `events[LUTETIA].note` ("one of the largest main-belt asteroids"); base flight event ("At 100 km diameter… the largest asteroid ever visited at close range").
- **What's wrong:** Lutetia's mean diameter is ~120 km (≈121×101×75 km). "100 km" is the low axis; not wrong per se but imprecise. The "largest visited at close range" was true as of 2010.
- **Correction:** "~120 km" or keep "~100 km" with the "at the time" qualifier already present.
- **Source:** https://en.wikipedia.org/wiki/21_Lutetia
- **Confidence:** Medium.

### 🔵 Šteins closest approach — overlay implies survey, base "800 km"; nucleus size "6 km"
- **File / field:** base flight event ("Closest approach 800 km… diamond-shaped 6 km E-type body").
- **Note:** 800 km CA and ~5–6 km E-type are correct (Wikipedia: <800 km, ~5.3 km). No error — logged only for completeness.
- **Source:** https://en.wikipedia.org/wiki/2867_%C5%A0teins
- **Confidence:** High (this one checks out).

### 🔵 Earth-flyby #2 closest approach — base "5,295 km" vs Wikipedia "5,700 km"
- **File / field:** base flight event ("Closest approach 5,295 km on 2007-11-13").
- **What's wrong:** Wikipedia lists ~5,700 km for the 13 Nov 2007 flyby; other sources give ~5,295 km. Minor source disagreement.
- **Source:** https://en.wikipedia.org/wiki/Rosetta_(spacecraft)
- **Confidence:** Low (sources differ; not clearly wrong).

---

## giotto

### 🔴 Dust-impact timing — overlay "14 seconds before" vs base "two seconds before" (contradiction; real ≈ 7.6 s)
- **File / field:** overlay `description` + base `credit` ("14 seconds before closest approach a dust impact…"); base `flight.events[Halley]` `description` ("A dust-grain impact two seconds before closest approach").
- **What's wrong:** Two different numbers inside the same file family, and neither matches the cited value. The large dust grain that destabilised Giotto struck ≈**7.6 seconds** before closest approach.
- **Correction:** Use ~7.6 s in all three places.
- **Source:** https://en.wikipedia.org/wiki/Giotto_(spacecraft) (impact 7.6 s before closest approach).
- **Confidence:** Medium-High (7.6 s is the standard figure; the internal contradiction is certain).

### 🟠 "first time any spacecraft used Earth for a return gravity assist"
- **File / field:** base `flight.events[Earth]` `description` ("the first time any spacecraft used Earth for a return gravity assist").
- **What's wrong:** The defensible claim is that the 1990 flyby was the **first time a spacecraft returned to Earth from deep/interplanetary space for a gravity assist**. As phrased ("return gravity assist"), it is ambiguous and borders on overreach; word it as the sourced version.
- **Correction:** "the first spacecraft to return from interplanetary space to use an Earth gravity assist."
- **Source:** https://en.wikipedia.org/wiki/Giotto_(spacecraft) ; https://space.skyrocket.de/doc_sdat/giotto.htm ("first encounter of Earth by a spacecraft coming from deep space").
- **Confidence:** Medium.

### 🔵 1990 Earth flyby distance — base "22,730 km" vs one source "16,300 km"
- **File / field:** base flight event ("Closest approach 22,730 km on 1990-07-02").
- **What's wrong:** Gunter's Space Page gives 16,300 km; NSSDCA/Wikipedia commonly cite ~22,730 km. Source disagreement; 22,730 km is the widely-used figure, so likely fine.
- **Source:** https://space.skyrocket.de/doc_sdat/giotto.htm vs https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1985-056A
- **Confidence:** Low (keep 22,730 km unless NSSDCA says otherwise).

### 🔵 Halley nucleus dimensions — file "15×8×8 km" vs ESA "15 × 7.2 × 7.2 km"
- **File / field:** overlay `description` + base `credit` ("irregular 15×8×8 km elongated body").
- **What's wrong:** ESA's own figure is 15 × 7.2 × 7.2 km. "15×8×8" rounds the short axes up.
- **Correction:** "15 × 7.2 × 7.2 km" (ESA).
- **Source:** https://www.esa.int/Science_Exploration/Space_Science/Giotto_overview
- **Confidence:** Medium.

---

## dart

### 🟠 Impact velocity "6.14 km/s" vs commonly-cited 6.6 km/s
- **File / field:** overlay `description` + `events` ("6.14 km/s"); base `payload`/`delta_v`/`arrival.v_infinity_km_s`/flight events all "6.14 km/s".
- **What's wrong:** NASA/JHU-APL and Wikipedia headline the impact speed as **~6.6 km/s** (≈22,530 km/h / 14,000 mph). 6.14 km/s appears in some early press material but is not the figure the primary sources now use. Consistent across the file, so at minimum verify against the DART Mission Operations Report the file cites.
- **Correction:** Use ~6.6 km/s unless the cited MOR specifically supports 6.14; if 6.14 is retained, it should be justified.
- **Source:** https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test ("6.6 km/s").
- **Confidence:** Medium (6.6 is the dominant published value; 6.14 is not obviously correct).

### 🟡 NEXT-C "50 kg xenon" — xenon vs hydrazine mass conflated
- **File / field:** base `payload` ("611 kg (incl. 50 kg xenon for NEXT-C ion thruster demonstrator)").
- **What's wrong:** DART carried **~60 kg of xenon** for NEXT-C and **~50 kg of hydrazine** for conventional thrusters. The "50 kg xenon" swaps the two propellant masses.
- **Correction:** "~60 kg xenon (NEXT-C) + ~50 kg hydrazine" — or drop the number.
- **Source:** https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test (60 kg xenon; 50 kg hydrazine).
- **Confidence:** High.

### 🔵 Impact mass 611 kg (launch) vs ~500 kg (at impact)
- **File / field:** overlay `description` ("a 611-kg spacecraft sent to hit"); base flight event ("The 611-kg spacecraft delivered ~11 GJ").
- **What's wrong:** 611 kg is the launch/dry-ish figure; the mass **at impact** (after propellant use) was ~500 kg — which is the mass that matters for the "~11 GJ kinetic energy" statement. ½·500·6600² ≈ 10.9 GJ, so the 11 GJ figure actually presumes ~500 kg + ~6.6 km/s, not 611 kg + 6.14 km/s.
- **Correction:** Use ~570 kg (impact mass often cited) or ~500 kg for the energy sentence; keep 611 kg only for launch mass.
- **Source:** https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test ("impact mass 500 kg").
- **Confidence:** Medium.

*(Checks that passed: launch 2021-11-24 Vandenberg SLC-4E ✓; impact 2022-09-26 23:14 UTC ✓; period change 33 min / 4.2% ✓; 73-s threshold ✓; β≈3.6 ✓; Didymos 780 m / Dimorphos 160 m ✓; LICIACube + HST + JWST ✓.)*

---

## lucy

### 🟠 Both files omit Dinkinesh (152830), Lucy's FIRST asteroid flyby (2023-11-01)
- **File / field:** overlay `description` + `events`; base `credit` + `flight.events`. Neither file mentions Dinkinesh or its satellite Selam.
- **What's wrong:** Lucy's first-ever asteroid encounter was **152830 Dinkinesh on 2023-11-01**, at which Hubble-independent imaging discovered the contact-binary satellite Selam — a headline result. The files jump from EGA-1 straight to Donaldjohanson (2025) and call Donaldjohanson the "bonus main-belt" first target, silently dropping the actual first encounter. For a museum atlas this is a material gap.
- **Correction:** Add Dinkinesh (2023-11-01, ~790 m, first flyby, Selam satellite discovered) to both files.
- **Source:** https://en.wikipedia.org/wiki/Lucy_(spacecraft)
- **Confidence:** High.

### 🟡 "visits 8 asteroids… more bodies in one mission than any prior" — undercount post-Dinkinesh
- **File / field:** overlay `first` ("visits 8 asteroids in a single 12-year trajectory"); base flight event ("visits eight asteroids (one bonus main-belt, seven trojans)… a record").
- **What's wrong:** With Dinkinesh (+ its moon Selam) the planned tally is now **11 asteroid targets**, not 8. The "record number of objects on separate orbits" framing is correct but the count is stale.
- **Correction:** "visits 8 asteroids on separate solar orbits (11 bodies incl. satellites)" or update to reflect Dinkinesh.
- **Source:** https://en.wikipedia.org/wiki/Lucy_(spacecraft) ("total number of Lucy's planned asteroid visits up to eleven").
- **Confidence:** High.

### 🟡 "more bodies in one mission than any prior planetary science mission" — needs a qualifier
- **File / field:** overlay `first`; base flight event ("more bodies in one mission than any prior planetary science mission").
- **What's wrong:** True only with the qualifier "objects on independent heliocentric orbits" (Cassini/Voyager visited more *bodies* if moons count). NASA's own phrasing is deliberately "record number of objects on separate orbits around the Sun."
- **Correction:** Use NASA's qualified superlative, not the unqualified "more bodies than any prior mission."
- **Source:** https://science.nasa.gov/mission/lucy/frequently-asked-questions/
- **Confidence:** Medium-High.

### 🔵 EGA-2 date present in base ("2024-12-12") but Wikipedia gives 2024-12-13
- **File / field:** base flight event ("2024-12-12 (per redesigned profile)").
- **What's wrong:** Wikipedia lists the second Earth gravity assist as **2024-12-13**. One-day slip.
- **Correction:** 2024-12-13.
- **Source:** https://en.wikipedia.org/wiki/Lucy_(spacecraft)
- **Confidence:** Medium.

*(Checks that passed: launch 2021-10-16 Atlas V 401 SLC-41 ✓; Donaldjohanson 2025-04-20 main-belt ✓; Eurybates+Queta 2027-08-12 ✓; Polymele/Leucus/Orus types+dates ✓; Patroclus 113 km + Menoetius 104 km, 2033-03-02 ✓; EGA-1 2022-10-16 ✓.)*

---

## hayabusa2

### 🟡 Return date "2020-12-05" — capsule landed at Woomera on 6 Dec local (5 Dec UTC)
- **File / field:** overlay `description` + `events[EARTH RETURN]` + base `credit`/`flight` all "2020-12-05".
- **What's wrong:** Separation + reentry began 5 Dec 2020 UTC; the capsule **touched down / was recovered at Woomera on 6 December 2020 (local, JST)**. Museum copy usually cites the landing date as 6 Dec. Using 2020-12-05 without a UTC/local note is a mild ambiguity (defensible as the UTC reentry date).
- **Correction:** Either "2020-12-06 (local; 5 Dec UTC)" or keep 5 Dec but note it's the UTC reentry.
- **Source:** https://en.wikipedia.org/wiki/Hayabusa2 (capsule 5 Dec 2020 UTC; recovered 6 Dec JST); https://www.space.gov.au/news-and-media/hayabusa2-mission-accomplished
- **Confidence:** Medium (both dates are "right" depending on frame — flag the ambiguity).

### 🟡 Extended-mission target "(98943) 2001 CC21" — now officially named Torifune
- **File / field:** overlay `description` + `events[2001 CC21 FLYBY]`; base `credit`.
- **What's wrong:** 2001 CC21 was formally named **98943 Torifune** (IAU, 2024). The provisional designation is outdated for a 2026-07 flyby.
- **Correction:** "98943 Torifune (2001 CC21)".
- **Source:** https://en.wikipedia.org/wiki/Hayabusa2 (extended-mission "Torifune" flyby July 2026).
- **Confidence:** Medium-High.

### 🔵 SCI crater "14 m" — sources split between ~10 m and 14.5 m
- **File / field:** overlay `description` ("excavated a 14 m crater") + base `credit` ("14 m crater").
- **What's wrong:** JAXA's headline is a **14.5 m (semi-major axis) semicircular crater**; some summaries (incl. Wikipedia's short line) say ~10 m. "14 m" tracks the JAXA 14.5 m figure — acceptable, but the ~10 m variant exists.
- **Correction:** Optional: "~14.5 m" to match JAXA exactly.
- **Source:** https://www.hayabusa2.jaxa.jp/en/topics/20200320_science/ (14.5 m); https://en.wikipedia.org/wiki/Hayabusa2
- **Confidence:** Medium.

### 🔵 Earth flyby MET "met:366" labeled but GA was 2015-12-03 (365 days after 2014-12-03)
- **File / field:** overlay `events[EARTH FLYBY].met=366`; base flight event "met_days 366 … 2015-12-03".
- **What's wrong:** 2014-12-03 → 2015-12-03 is 365 days, not 366. One-day MET rounding; harmless.
- **Confidence:** Low.

*(Checks that passed: launch 2014-12-03 H-IIA 202 Tanegashima ✓; Ryugu arrival 2018-06-27 ✓; sample 5.4 g ✓; TD1 2019-02-22 / TD2 2019-07-11 ✓ [overlay TD1 date "2019-02-22" via base]; SCI 2019-04-05 ✓; MASCOT 17 hr ✓; 1998 KY26 2031-07 ✓; Earth GA 3,090 km ✓.)*

---

## hayabusa1

### 🟠 Reaction-wheel count — overlay "two of four reaction wheels died" vs base "3 of 4" (contradiction)
- **File / field:** overlay `description` ("two of four reaction wheels died"); base `credit` ("3 of 4 reaction wheels died"); base flight events ("Two of four reaction wheels were already dead").
- **What's wrong:** Internal contradiction (2 vs 3). Fact: **Hayabusa had 3 reaction wheels; 2 of the 3 failed** (X-axis 31 Jul 2005, Y-axis 2 Oct 2005), leaving one. "Two of four" and "3 of 4" are *both* wrong on the total — the spacecraft had 3 wheels, not 4.
- **Correction:** "two of its three reaction wheels failed."
- **Source:** https://en.wikipedia.org/wiki/Hayabusa ("2 reaction wheels… failed; X-axis 31 July, Y-axis 2 October").
- **Confidence:** High.

### 🔵 Sample "1500 micrograms" — mass is uncertain; ~1500 *particles* is the safer citation
- **File / field:** overlay `first` + `description` + `events[SAMPLE RETURN]` + base `credit` ("1500 μg" / "1500 micrograms").
- **What's wrong:** The canonical description is **~1,500 grains/particles** of Itokawa dust (total mass well under 1 mg; the collection mechanism failed and only impact-kicked grains were captured). "1500 micrograms" states a *mass* that isn't the reported figure — the "1500" refers to particle count.
- **Correction:** "~1,500 grains of Itokawa dust (sub-milligram total)."
- **Source:** https://en.wikipedia.org/wiki/Hayabusa ("about 1,500 grains… Sample mass: <1 g"); https://curator.jsc.nasa.gov/hayabusa/
- **Confidence:** High.

*(Checks that passed: launch 2003-05-09 M-V-5 Uchinoura ✓; Itokawa arrival 2005-09-12 ✓; touchdowns 2005-11-20 + 25 ✓; sample projectiles failed to fire ✓; comms lost ~7 weeks ✓; Frankenstein ion engine ✓; capsule Woomera 2010-06-13 [reentry 13 Jun UTC, recovery 14 Jun] ✓; S-type + rubble-pile ✓; Itokawa 540×270×210 m ✓ standard figure.)*

---

## osiris-rex

### 🟡 "most precise asteroid-rendezvous mission ever flown" / "closest spacecraft orbit ever around any celestial body"
- **File / field:** overlay `description` ("ran the most precise asteroid-rendezvous mission ever flown… the closest spacecraft orbit ever around any celestial body"); base flight event ("closest-ever spacecraft orbit around a celestial body").
- **What's wrong:** The **closest-orbit** claim is well-sourced (NASA: ~1 km orbit is the closest a spacecraft has orbited a body). The **"most precise… ever flown"** superlative is editorial and unsourced — soften or attribute.
- **Correction:** Keep the closest-orbit claim; qualify or drop "most precise ever flown."
- **Source:** https://en.wikipedia.org/wiki/OSIRIS-REx (closest orbit); NASA mission page.
- **Confidence:** Medium (closest-orbit ✓; "most precise" is puffery).

### 🔵 Bennu rendezvous distance — overlay "1.4 km" as arrival stationkeep; base mixes 1.4 km orbit + 5 km / 19 km stationkeep
- **File / field:** overlay `events[BENNU RENDEZVOUS]` ("Stationkeeps at 1.4 km"); base `arrival.periapsis_km=5`, flight event "Stationkeeping at 19 km", then "1.4-km circumnavigation".
- **What's wrong:** Slightly muddled: arrival stationkeeping was ~19 km; the record **1.4 km orbit** came later (Orbital B). Overlay compresses "stationkeeps at 1.4 km" at rendezvous, which telescopes the timeline. Not wrong on the 1.4 km record, just sequenced loosely.
- **Correction:** "later entered a record ~1.4 km orbit" rather than at rendezvous.
- **Source:** https://en.wikipedia.org/wiki/OSIRIS-REx
- **Confidence:** Medium.

*(Checks that passed: launch 2016-09-08 Atlas V 411 SLC-41 ✓; EGA 2017-09-22 17,237 km ✓; Bennu arrival 2018-12-03 ✓; TAG 2020-10-20 ✓; departure 2021-05-10 ✓; SRC landing 2023-09-24 Utah ✓; 121.6 g largest asteroid sample ✓; first US asteroid sample return ✓; Bennu 492 m ✓; OSIRIS-APEX → Apophis 2029 ✓; Apophis close pass ~31,000 km ✓.)*

---

## dawn

### 🔵 Ceres LAMO "35 km" + hydrazine end 2018-10-31 + Mars assist 549 km — all check out
- **File / field:** base flight events (Mars GA 549 km 2009-02-17; Vesta OI 2011-07-16; Vesta departure 2012-09-05; Ceres OI 2015-03-06; LAMO 35 km; hydrazine out 2018-10-31).
- **Note:** "First to orbit two extraterrestrial bodies" ✓ and "first to orbit a dwarf planet" ✓ are both correct and well-sourced. LAMO ~35 km ✓, mission ended Oct/Nov 2018 when hydrazine ran out ✓, Occator bright spots = sodium carbonate ✓ (De Sanctis 2016, correctly linked). No factual errors found.
- **Source:** https://en.wikipedia.org/wiki/Dawn_(spacecraft) ; https://science.nasa.gov/mission/dawn/ ; https://www.nasa.gov/history/15-years-ago-dawn-begins-voyage-to-asteroid-vesta-and-dwarf-planet-ceres/
- **Confidence:** High (clean).

*(Checks that passed: launch 2007-09-27 Delta II 7925H ✓; Vesta 530 km diameter / Rheasilvia / HED source ✓; ion propulsion + xenon + ~10× Isp framing ✓; two-body / dwarf-planet firsts ✓; overlay's "Ceres largest object in asteroid belt" ✓.)*

---

## hera

### 🔵 Arrival "2026-12-28" — ESA now targets earlier arrival (Oct 2026), orbit by Dec
- **File / field:** base `arrival_date=2026-12-28`, `transit_days=812`; overlay `description` ("arrives at Didymos late 2026") / base `credit` ("late 2026").
- **What's wrong:** ESA's updated profile has Hera **rendezvous in October 2026**, manoeuvring into orbit **by December 2026**. The overlay's "late 2026" is fine; the hard `2026-12-28` in the data is the orbit-insertion end of the window, not arrival — slightly late vs ESA's "targets early arrival."
- **Correction:** Optional: note arrival ~Oct 2026, orbit ~Dec 2026; or keep 2026-12-28 as the orbit-insertion date.
- **Source:** https://www.esa.int/Space_Safety/Hera/ESA_s_Hera_targets_early_arrival_at_Didymos_asteroids
- **Confidence:** Medium.

*(Checks that passed: launch 2024-10-07 Falcon 9 (Cape Canaveral) ✓; Mars flyby March 2025 + Deimos ~1,000 km ✓ [Hera flew Mars 2025-03-12, imaged Deimos ✓]; Juventas + Milani CubeSats ✓; AIDA framing + DART 2022 impact ✓; post-impact survey mission ✓. Note: overlay says launch site implicitly; base flight event says "Cape Canaveral SLC-40" ✓.)*

---

### Cross-cutting notes
- **Rosetta D/H** is the single most important fix — it's not imprecision, it's a scientific conclusion that has been reversed since the copy was written, and the base file cites the superseded paper as its authority.
- **Lucy Dinkinesh omission** is the second — a flown, headline encounter (with a satellite discovery) is entirely missing from an "active mission" entry.
- Three missions carry **internal overlay-vs-base contradictions** (rosetta 60/64 hr; giotto 14 s/2 s; hayabusa1 2/3 wheels) — these are the easiest to catch and fix because the file disagrees with itself.
