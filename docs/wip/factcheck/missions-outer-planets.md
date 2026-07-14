# Fact-check — Outer-planet / deep-space mission editorials

Reviewer: science-reviewer (skeptical, web-verified). Date of review: 2026-07-14.
Present = 2026. Scope: 11 missions, prose overlay (`i18n-src/en-US/...`) + base data (`static/data/...`).

## Per-mission one-line verdicts

- **jupiter/europa-clipper** — 🟡 Solid. Dates verified. One stale future-tense framing worth noting; base "periapsis_km 4700" vs credit unverifiable but plausible.
- **jupiter/galileo** — 🟠 Two real issues: base `arrival_date` (1995-12-08) contradicts event date (1995-12-07); peak-g quoted 230 vs actual 228. Ida/Dactyl "first binary asteroid" fine.
- **jupiter/juice** — 🟠 Venus flyby distance wrong (~9,000 km vs actual 5,088 km). "First to orbit a moon of another planet" is literally true + correctly dated Dec 2034.
- **jupiter/juno** — 🟡 Internal date contradiction: base event says JOI "2016-07-04" but arrival_date + overlay say 2016-07-05 (07-05 UTC is correct).
- **jupiter/pioneer-10** — 🟡 Launch date split (base event 1972-03-02 vs departure_date 1972-03-03; both defensible by TZ but inconsistent). Flyby date overlay 1973-12-04 vs base event 1973-12-03 (03 UTC correct).
- **saturn/cassini** — 🔵 Clean. 294 orbits, 162 targeted flybys, 22 Grand Finale orbits, Huygens 2005-01-14 all verified.
- **saturn/pioneer-11** — 🟠 Overlay↔base disagree on discovered moon (overlay "Epimetheus" vs base "Janus"); the S/1979 discovery is genuinely ambiguous — pick one + hedge.
- **saturn/voyager-1** — 🟡 "~165 AU" is stale (actual ~170.5 AU as of 2026). Otherwise verified.
- **neptune/voyager-2** — 🔵 Clean. Only-craft-to-visit-Uranus-and-Neptune ✓, Neptune 4,950 km ✓, heliopause 2018-11-05 ✓.
- **pluto/new-horizons** — 🟡 base `arrival_date` = 2019-01-01 (Arrokoth), not Pluto (2015-07-14) — a modelling choice, but the "arrival" semantics are misleading. Core facts verified.
- **psyche/psyche-mission** — 🟠 Mars flyby closest approach quoted 3,000 km (overlay + base) vs actual 4,609 km. Asteroid diameter 226 km OK. Dates verified.

## Total counts

- 🔴 Critical: 0
- 🟠 Major: 4 (galileo, juice, pioneer-11, psyche)
- 🟡 Minor: 6 (europa-clipper, juno, pioneer-10, voyager-1, new-horizons; galileo also has a 🟡 sub-item)
- 🔵 Clean/verified: 2 (cassini, voyager-2)

---

## jupiter/europa-clipper

**🟡 Stale/awkward future-tense framing (overlay `description` + base credit)**
- Quote (overlay): "A Mars gravity assist 2025-03 + Earth gravity assist 2026-12 deliver the trajectory; arrives Jupiter 2030-04-11".
- Status: The Mars gravity assist (2025-03-01) **has happened** as of the 2026 present; Earth GA (2026-12) is imminent/future. Not wrong, but the atlas present is post-Mars-GA — a reader in 2026 sees "will" framing for a completed event. Correction: past-tense the Mars leg ("A Mars gravity assist in March 2025 bent the trajectory…"). Confidence: high.
- Dates verified: launch 2024-10-14 ✓, Mars GA 2025-03-01 (≈550 mi / 884 km) ✓, Earth GA Dec 2026 ✓, Jupiter arrival April 2030 ✓, 49 flybys ✓.
- Source: https://www.jpl.nasa.gov/news/nasas-europa-clipper-uses-mars-to-go-the-distance/ ; https://en.wikipedia.org/wiki/Europa_Clipper

**🔵 "Largest planetary mission spacecraft ever launched" (`first`, 6065 kg)** — verified: Clipper is the largest NASA planetary spacecraft; 6,065 kg / ~100 m² arrays. Confidence: high. Source: https://europa.nasa.gov/

**🟡 Note (not an error): base `flight.arrival.periapsis_km` = 4700, `v_infinity 5.5`** — JOI parameters; consistent with published tour design, not independently re-derived. Confidence: medium.

---

## jupiter/galileo

**🟠 Base `arrival_date` (1995-12-08) contradicts the actual arrival/JOI event (1995-12-07)**
- Quote (base top-level): `"arrival_date": "1995-12-08"`, but base event `met_days 2243` label "Jupiter orbit insertion + probe descent" description says "1995-12-07" and probe entry event says "1995-12-07".
- What's wrong: Probe atmospheric entry AND JOI both occurred **1995-12-07 UTC** (probe entry 22:04 UTC Dec 7; orbiter JOI same day). The top-level `arrival_date: 1995-12-08` is off by a day and internally inconsistent with the file's own events.
- Correction: set arrival_date to 1995-12-07.
- Source: https://science.nasa.gov/mission/galileo-jupiter-atmospheric-probe/ ; APOD 1995-12-07. Confidence: high.

**🟠 Peak deceleration quoted as "230 g" — actual is 228 g**
- Quote (base event `met_days 2243`): "survived peak deceleration of 230 g".
- Correction: 228 g (228 g₀, ≈2,240 m/s²) is the published figure.
- Source: https://en.wikipedia.org/wiki/Galileo_(spacecraft) ; https://science.nasa.gov/mission/galileo-jupiter-atmospheric-probe/. Confidence: high. (Severity borderline 🟡 — commonly rounded, but 228 is the canonical number.)

**🟡 Probe entry velocity "47.4 km/s"** — verified (170,700 km/h ≈ 47.4 km/s). ✓ Source: Wikipedia. Confidence: high.

**🟡 Overlay `first` "First spacecraft to orbit Jupiter" vs base "first Jupiter orbiter"** — literally true; NASA phrases it "first to orbit an outer planet." No change needed, but the stronger/citable claim is first-to-orbit-any-outer-planet. Confidence: high.

**🔵 Ida + Dactyl "first confirmed binary asteroid system"** — verified. ✓ Confidence: high. Source: Belton et al. 1995, Nature 374 (already linked).

**🟡 Note: overlay event note says JOI "decades of moon science begin"** — Galileo's Jupiter tour was **8 years** (1995–2003), not "decades." Base correctly says "8-year tour." Overlay `events[1].note` overstates. Correction: "years of moon science" or "an 8-year tour." Confidence: high.

---

## jupiter/juice

**🟠 Venus flyby closest approach "~9,000 km" is wrong — actual 5,088 km**
- Quote (base event `met_days 871`): "Closest approach ~9,000 km from Venus." Overlay says only "Venus 2025-08-31" (no distance).
- What's wrong: JUICE's Venus gravity assist (2025-08-31, 05:28 UTC) closest approach was **5,088 km** above the surface.
- Correction: ~5,088 km.
- Source: https://en.wikipedia.org/wiki/Jupiter_Icy_Moons_Explorer ; ESA. Confidence: high.

**🔵 "First spacecraft ever to orbit a moon of another planet (Ganymede, 2034)"** — verified + correctly dated: Ganymede orbit insertion Dec 2034; this is the first-ever moon orbit. Confidence: high. Source: ESA JUICE / eoPortal.

**🔵 Lunar-Earth gravity assist "first-ever" 2024-08-19** — verified: world-first lunar-Earth (double) flyby; Moon closest approach 19 Aug 2024, Earth ~24 h later (20 Aug), Earth altitude 6,840 km (base says "6,800 km" ✓ rounded), Moon ~700 km ✓. Note: base/overlay date the LEGA as "2024-08-19" — the Moon leg is 19 Aug, the Earth leg 20 Aug; acceptable to label the manoeuvre by its start. Confidence: high. Source: https://www.esa.int/Science_Exploration/Space_Science/Juice/Juice_rerouted_to_Venus_in_world_s_first_lunar-Earth_flyby

**🟡 Base event `met_days 3020` says Ganymede orbit "5,000 km circular orbit"** — ESA describes the Ganymede orbit as initially elliptical (200 km × 10,000 km) then a 5,000 km circular phase. "settling into a 5,000 km circular orbit" is defensible for the final phase. Confidence: medium. Source: ESA Ganymede-orbit video page.

**🟡 Launch vehicle inconsistency: base top-level `vehicle` = "Ariane 5 ECA+" but base event label = "Ariane 5 ECA"** — JUICE flew on Ariane 5 ECA (the "+" is nonstandard). Overlay says "Ariane 5 ECA+". Recommend "Ariane 5 ECA". Confidence: medium.

Dates verified: launch 2023-04-14 ✓, Jupiter arrival July 2031 ✓, mission end 2035 by Ganymede impact ✓.

---

## jupiter/juno

**🟡 Internal date contradiction on Jupiter orbit insertion**
- Quote (base event `met_days 1796`): "2016-07-04 (Independence Day)." Top-level `arrival_date` = 2016-07-05 and overlay event says arrival 2016-07-05.
- What's wrong: JOI completed **2016-07-05 UTC** (the burn ended just after midnight UTC July 5; it was still July 4 in US Pacific time, hence the "Independence Day" framing). The file is internally inconsistent: arrival_date/overlay use 07-05, event uses 07-04.
- Correction: harmonise to 2016-07-05 UTC (keep the July-4-in-the-US color as a parenthetical if desired, but the canonical date is 07-05).
- Source: https://en.wikipedia.org/wiki/Juno_(spacecraft) ; JPL JOI press kit. Confidence: high.

**🔵 Earth gravity assist 2013-10-09, 559 km** — verified ✓. Source: Wikipedia / missionjuno. Confidence: high.

**🟡 Overlay/base "first solar-powered spacecraft to operate beyond the asteroid belt" / "first solar-powered spacecraft to reach Jupiter"** — verified (Juno was the first solar-powered craft at Jupiter). ✓ Confidence: high.

**🟡 Power figures differ between files:** overlay "~500 W at Jupiter," base event "~400 W at Jupiter." Both are cited in different sources (~500 W typical). Minor inconsistency; pick one. Confidence: medium.

**🟡 "Extended mission through 2025 / September 2025"** — as of 2026 present this is past; Juno's extended mission ran through Sept 2025 (status ACTIVE may itself now be stale depending on end-of-mission — Juno's extended mission was slated to end 2025). Flag for a freshness pass on `status`. Confidence: medium.

---

## jupiter/pioneer-10

**🟡 Launch-date inconsistency (base event vs top-level)**
- Quote: base event `met_days 0` "Cape Canaveral, 1972-03-02"; top-level `departure_date` = "1972-03-03".
- Fact: Launch 1972-03-03 01:49 UTC (= 1972-03-02 local EST). Both are technically correct by timezone, but the file uses two different dates. Recommend standardise on the UTC date 1972-03-03. Confidence: high. Source: https://en.wikipedia.org/wiki/Pioneer_10

**🟡 Jupiter closest-approach date inconsistency**
- Quote: overlay event "1973-12-04"; base event + base credit "1973-12-03"; distance 132,252 km (base) / ~132,000 km (overlay).
- Fact: Closest approach ~02:26 UTC 1973-12-04 (= Dec 3 local), range 132,252 km from cloud tops. The 12-03 vs 12-04 split is a TZ artifact; standardise (UTC = Dec 4, though NASA/NSSDCA often cite Dec 3). Distance ✓. Confidence: high. Source: https://en.wikipedia.org/wiki/Pioneer_10 ; NASA "Forty Years Ago" article.

**🔵 "First through the asteroid belt / first to fly past Jupiter" + Pioneer plaque (Sagan/Drake/Salzman Sagan)** — all verified. ✓ Confidence: high.

**🔵 "First to reach heliocentric distance > Pluto's perihelion (1983)"** — verified. ✓ Confidence: high.

**🟡 Last contact "2003-01-23 from ~82 AU" (overlay) vs base event "from 80 AU"** — both cited (~80–82 AU). Minor. Confidence: medium.

---

## saturn/cassini

**🔵 All load-bearing claims verified.**
- SOI 2004-07-01 ✓; 294 orbits ✓; 162 targeted flybys ✓ (base "162 close moon flybys" — NASA: "162 targeted flybys"); Grand Finale 22 orbits (Apr–Sep 2017) ✓; Huygens landed Titan 2005-01-14, "first landing in the outer solar system" ✓; end-of-mission plunge 2017-09-15 ✓.
- Source: https://science.nasa.gov/mission/cassini/grand-finale/overview/ ; https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens ; https://en.wikipedia.org/wiki/Timeline_of_Cassini%E2%80%93Huygens. Confidence: high.

**🟡 Minor (not flagged as error): base credit "discovered Enceladus's plumes 2005 (~100 geysers)"** — plumes discovered 2005 ✓; the "~101 geysers" count came from a 2014 Cassini survey. Fine. Confidence: high.

**🟡 Base event `met_days 672` "closest planetary flyby of any outbound interplanetary mission to date" (Earth 1,171 km, 1999)** — superlative is soft/dated and hard to verify rigorously; recommend softening ("an unusually close Earth flyby"). Confidence: low (can't cleanly verify the superlative). Not counted as an error.

---

## saturn/pioneer-11

**🟠 Overlay and base disagree on which moon Pioneer 11 discovered — and the discovery itself is genuinely ambiguous**
- Quote (overlay `description`): "At Saturn it discovered the F ring and the moon Epimetheus." / overlay `first` also implies it. Base credit + event say "an additional small moon (Epimetheus)" (credit) and "a new moon (Janus)" (base event `met_days 2339`).
- What's wrong: (1) The two files name different moons (Epimetheus vs Janus); (2) historically the object Pioneer 11 detected (S/1979 S1 / S2) could not be reliably attributed — Epimetheus and Janus are co-orbital and were disentangled only after the Voyagers. Attributing a clean single "discovery of Epimetheus" (or Janus) overstates the record.
- Correction: harmonise the two files AND hedge, e.g. "detected a small inner moon (later resolved into the co-orbital pair Janus/Epimetheus)." At minimum, overlay and base must name the same body.
- Source: https://en.wikipedia.org/wiki/Epimetheus_(moon) ; https://en.wikipedia.org/wiki/Janus_(moon) ; https://en.wikipedia.org/wiki/Pioneer_11. Confidence: high.

**🔵 "First spacecraft to fly past Saturn (1979-09-01)"** — verified ✓. Confidence: high.

**🟡 Jupiter closest approach "42,800 km" (base event, 1974-12-02)** — NASA/Wikipedia give ~42,500 km / 43,000 km (≈26,400 mi) on 1974-12-03 (UTC 05:22). Distance ✓ (~42.5–43k); **date should be 1974-12-03 UTC**, base says "1974-12-02" (local). Minor TZ inconsistency. Confidence: high. Source: https://en.wikipedia.org/wiki/Pioneer_11 / NASA.

**🔵 Saturn closest approach 20,900 km, 1979-09-01** — verified ✓. Confidence: high.

**🟡 "Demonstrated the gravity-assist that sent Voyager 2 onward" (`first`)** — Pioneer 11 demonstrated Jupiter→Saturn gravity assist; framing is fine (soft causal claim). Confidence: medium.

---

## saturn/voyager-1

**🟡 "~165 AU from the Sun" is stale**
- Quote (overlay `first` + base credit): "Most distant human-made object — currently ~165 AU from the Sun."
- Fact: As of 2026, Voyager 1 is **~170.5 AU** from the Sun (≈25.5 billion km). "~165 AU" was accurate ~2023.
- Correction: update to ~170 AU (or ~171). Note the Nov-2026 one-light-day milestone if a refresh is done.
- Source: https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/. Confidence: high.

**🔵 "First human-made object to enter interstellar space, 2012-08-25"** — verified ✓ (heliopause crossing at ~121 AU). Confidence: high.

**🟡 Jupiter closest approach 348,890 km on 1979-03-05** — verified ✓ (from Jupiter center). Confidence: high. Source: NASA/JPL.

**🟡 Titan "within 6500 km" + Saturn "124,000 km" (base event, 1980-11-12)** — Titan closest approach ≈4,000 km surface / ≈6,490 km from Titan's center; "6,500 km" matches the center-distance convention. Saturn closest approach 184,300 km from center ≈ 124,000 km above cloud tops — "124,000 km from Saturn" is the cloud-top figure (fine). Both defensible but the frame (surface vs center) should be stated consistently. Confidence: medium. Source: Drew Ex Machina Titan-encounter writeup; NASA.

**🔵 Pale Blue Dot 1990-02-14 from ~6 billion km; Golden Record** — verified ✓. Confidence: high.

---

## neptune/voyager-2

**🔵 All load-bearing claims verified.**
- `first` "Only spacecraft to visit Uranus and Neptune; Grand Tour of four giant planets" — verified ✓ (the classic trap — Voyager 2 is correct). Confidence: high.
- Neptune closest approach 4,950 km above cloud tops, 1989-08-25 ✓; Triton flyby same day ✓; Uranus 1986-01-24 ✓; heliopause crossing 2018-11-05 ✓.
- Source: https://en.wikipedia.org/wiki/Voyager_2 ; https://www.nasa.gov/solar-system/30-years-ago-voyager-2s-historic-neptune-flyby/. Confidence: high.

**🟡 Note: base event `met_days 3079` "98° axial tilt" for Uranus** — Uranus's obliquity is 97.77° ≈ 98°. ✓ Fine. Confidence: high.

**🟡 base event Uranus "10 new moons"** — Voyager 2 discovered **10 or 11** new Uranian moons (commonly cited 10). ✓ Acceptable. Confidence: medium.

---

## pluto/new-horizons

**🟡 base top-level `arrival_date` = 2019-01-01 is the Arrokoth flyby, not the Pluto arrival (2015-07-14)**
- Quote: `"arrival_date": "2019-01-01"`, `"transit_days": 4730`. Overlay/`first` are about the Pluto flyby; the mission's headline "arrival" is Pluto 2015-07-14.
- What's wrong: labeling the catalogue "arrival" as the Arrokoth date is misleading for a mission whose destination (`dest: PLUTO`) and narrative are Pluto. It's a deliberate modelling choice (the porkchop extends to Arrokoth) but the semantics conflict with the destination field.
- Correction: consider arrival_date = 2015-07-14 (Pluto), or make the Arrokoth extension explicit. At minimum note the mismatch. Confidence: high (fact); the fix is an editorial call.

**🔵 Core facts verified:** launch 2006-01-19 on Atlas V 551, "fastest launch to date" (16.26 km/s heliocentric / 36,373 mph) ✓; Pluto closest approach 12,500 km on 2015-07-14 ✓; Jupiter GA 2007-02-28 ✓; Arrokoth flyby 3,538 km on 2019-01-01 ✓. Source: https://en.wikipedia.org/wiki/New_Horizons ; https://pluto.jhuapl.edu/. Confidence: high.

**🟡 "sharpest images of a Kuiper belt world" (`first`)** — true at the time; fine. Confidence: medium.

**🟡 base event Pluto "Data downlink took 16 months"** — verified (full downlink completed Oct 2016, ~15–16 months). ✓ Confidence: high.

---

## psyche/psyche-mission

**🟠 Mars gravity-assist closest approach "3,000 km" is wrong — actual 4,609 km**
- Quote (overlay event `met 945` + base event `met_days 945`): "2026-05-15, 3,000 km closest approach" / "Closest approach 3,000 km."
- What's wrong: Psyche's Mars flyby (2026-05-15) closest approach was **4,609 km** (≈2,864 mi). The 3,000 km was a pre-flight planning figure; the executed flyby is 4,609 km and this is now a past event (present = 2026-07).
- Correction: 4,609 km, past tense.
- Source: https://www.nasa.gov/missions/psyche-mission/nasas-psyche-mission-aces-mars-flyby-targets-metal-rich-asteroid/ ; https://en.wikipedia.org/wiki/Psyche_(spacecraft). Confidence: high.

**🔵 "First mission to a metal-rich M-class asteroid" + "first Hall-effect ion thrusters as primary cruise propulsion" (`first`)** — verified (first interplanetary use of Hall-effect thrusters; first mission to a metal M-type asteroid). Confidence: high. Source: NASA Psyche / Wikipedia.

**🟡 Asteroid diameter "226 km"** — 16 Psyche is irregular: ~280 km widest, ~232 km long, mean-diameter figures ~222–226 km. "226 km" is within the accepted range. ✓ Confidence: high.

**🟡 Arrival "2029-08" / base arrival_date 2029-08-01** — capture is late July 2029, prime mission begins Aug 2029. "2029-08" defensible; base_date 2029-08-01 slightly precise but fine. Confidence: high.

**🟡 Overlay says Mars GA "2026-05" past/future framing** — now a completed event (May 2026); ensure past tense on any refresh. Confidence: high.
