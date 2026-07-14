# Fact-check — SCIENCE / planets overlays

Reviewed 2026-07-14. Source dir: `i18n-src/en-US/science/planets/`. Web-verified.
No edits made — findings only. Severity: 🔴 wrong/misleading · 🟠 stale or
notably off · 🟡 minor/imprecise · 🔵 nit/context.

## Per-overlay verdicts

| Overlay | Verdict | Worst tag |
|---|---|---|
| _intro | Minor issue | 🟠 |
| active-spacecraft-survey | Needs fixes (staleness) | 🔴 |
| asteroid-belt | Clean | 🔵 |
| axial-tilt-and-seasons | Clean | 🟡 |
| kuiper-belt | Needs fixes | 🟠 |
| magnetic-fields | Clean | 🔵 |
| moons-of-the-system | Needs fixes (stale count) | 🟠 |
| planetary-stats | Clean | 🔵 |
| sub-solar-and-terminator | Clean | 🔵 |
| tides | Clean | ✓ |

**Totals:** 🔴 2 · 🟠 5 · 🟡 3 · 🔵 5

Two independent 🔴 both trace to time-sensitive spacecraft/count claims going
stale ("seven active Mars orbiters" counts a mission dead since Oct 2022).

---

## _intro

**🟠 "Six sections" undercounts / miscounts the tab.**
File: `_intro.json` → `paragraphs[1]`.
Quote: "Six sections. The first three are about the planets themselves … The
next two are about the system … The last section is a survey of the spacecraft…"
Problem: "Six sections" then enumerates 3 + 2 + 1 = 6, but the review scope for
this tab is 9 content overlays (asteroid-belt, kuiper-belt, sub-solar-and-
terminator, tides are not in the "3+2+1" enumeration). The intro's mental model
covers only axial-tilt, magnetic-fields, sub-solar/terminator geometry, moons,
stats, and spacecraft — it silently omits asteroid-belt, kuiper-belt, and tides
which are live overlays in the same directory. Either the intro predates those
additions or they live under a different sub-tab. Flag for the content owner to
reconcile the section count with the actual overlay inventory.
Correction: verify the real section list on /science and update the count +
enumeration.
Confidence: medium (depends on how the tab groups these on the live route).

**🔵 "Mars (seven orbiters, multiple agencies)".**
File: `_intro.json` → `paragraphs[1]`.
Same staleness as active-spacecraft-survey below — see 🔴 there. As of 2026 the
live count is six (MOM/Mangalyaan is dead).
Confidence: high.

---

## active-spacecraft-survey

**🔴 Mangalyaan/MOM listed as an ACTIVE Mars orbiter — it died Oct 2022.**
File: `active-spacecraft-survey.json` → `narrative_101[0]` and
`diagram_caption`.
Quote (narrative): "Mars has the most: seven active orbiters (NASA's MRO +
MAVEN, ESA's Mars Express + ExoMars TGO, India's Mangalyaan, China's Tianwen-1,
UAE's Hope)…"
Quote (caption): "Mars: 7 (NASA, ESA, ISRO, CNSA, UAESA)."
Problem: ISRO's Mars Orbiter Mission (Mangalyaan) ran out of propellant / lost
power during a long April-2022 eclipse; ISRO declared it non-functional and the
mission officially terminated 3 Oct 2022. It is NOT an active orbiter in 2026.
The overlay's own `body_paragraphs[0]` correctly writes "Mangalyaan / MOM
(ISRO, **2014–2022**…)" — so the doc contradicts itself: the body says it ended,
the narrative + caption count it as one of seven active.
Correction: Mars has **six** active orbiters as of 2026 (MRO, MAVEN, Mars
Express, ExoMars TGO, Tianwen-1, Hope). Drop Mangalyaan from the active count
and the flag list (ISRO's flag no longer applies to *active* orbiters); update
"seven"→"six" in narrative, caption, and the diagram_caption's agency list.
Source: https://en.wikipedia.org/wiki/Mars_Orbiter_Mission ,
https://www.theregister.com/2022/10/04/isro_mars_orbiter_mission_ends/
Confidence: high.

**🟠 "Mangalyaan … first Asian Mars mission" is contradicted by the doc's own
"first Asian nation" framing but is broadly correct — watch wording.**
File: `active-spacecraft-survey.json` → `body_paragraphs[0]`.
Quote: "Mangalyaan / MOM (ISRO, 2014–2022, methane + atmosphere — first Asian
Mars mission)."
Note: MOM was the first Asian mission to *reach/orbit* Mars successfully (Japan's
Nozomi 1998 failed to enter orbit; China's Yinghuo-1 2011 failed). "First Asian
Mars mission" is loose — Nozomi and Yinghuo-1 were earlier Asian Mars *missions*
that failed. Prefer "first Asian mission to orbit Mars" / "first Asian nation to
reach Mars orbit."
Correction: "first Asian mission to successfully orbit Mars."
Source: https://www.planetary.org/space-missions/mangalyaan
Confidence: high.

**🟡 "MRO … it's been at Mars 20 years" — slightly ahead.**
File: `active-spacecraft-survey.json` → `narrative_101[2]`.
Quote: "MRO was designed for a 2-year primary mission; it's been at Mars 20
years and counting."
Note: MRO entered Mars orbit 10 Mar 2006. In 2026 that is ~20 years — OK, but
"Mars Express was a 2-year primary; it's 22 years in" in the same sentence: Mars
Express reached Mars 25 Dec 2003, so ~22 years in 2026 ✓. Both fine as round
numbers; MRO "20 years" is right on the boundary. No change needed, just noting
these are wall-clock claims that drift +1/yr.
Confidence: high.

**🔵 Juno operational status — verified still alive in 2026 but fragile.**
File: `active-spacecraft-survey.json` → `narrative_101[0,2]`,
`body_paragraphs[1]`.
Quote: "Jupiter has one: NASA's Juno, in a polar orbit since 2016…"; "Juno was
designed for 33 perijove passes; it's done 60+."
Note: Juno's funded extended mission ran through Sept 2025; as of Feb 2026 it was
still operational and in contact, though its future was clouded by the FY2026
budget/shutdown. Treating it as active is correct for now. "60+ perijoves" is
plausible (prime ~35 + 42 extended orbits planned). "Designed for 33 perijove
passes" — prime mission was ~32–35 science orbits; 33 is within range. Leave.
Source: https://www.space.com/space-exploration/missions/nasas-juno-probe-orbiting-jupiter-may-have-come-to-an-end-but-no-one-can-confirm
Confidence: medium (mission status genuinely uncertain in 2026).

**🔵 "Europa Clipper launches 2024 and arrives 2030."**
File: `active-spacecraft-survey.json` → `body_paragraphs[1]`.
Verified: Europa Clipper launched 14 Oct 2024, arrival at Jupiter 2030. ✓
Confidence: high.

**🔵 BepiColombo arrives 2026.**
File: `active-spacecraft-survey.json` → `body_paragraphs[2]`.
Quote: "ESA/JAXA's BepiColombo arrives 2026." Mercury orbit insertion was
replanned to Nov 2026 (after thruster anomaly pushed it from 2025). ✓ for 2026
but verify against the latest ESA schedule before shipping.
Confidence: medium.

---

## asteroid-belt

**🔵 All headline numbers verified.**
- "2.2–3.2 AU" belt span (caption) — consistent with the ~2.1–3.3 AU main belt.✓
- "total mass … only about 4% of the Moon" — accepted (~3–4% of the Moon).✓
- "roughly a third of that sits in Ceres alone" — Ceres is ~25–39% of belt mass;
  "a third" is within range.✓
- "more than 1.3 million asteroids larger than 1 km" — MPC catalogue scale, OK
  (order-of-magnitude fine).✓
- Ceres 1801 Piazzi, Pallas/Juno/Vesta discovery years ✓; Jupiter at 5.2 AU ✓;
  Dawn orbited Vesta+Ceres ✓; Hayabusa2 5.4 g Ryugu (2020) ✓; OSIRIS-REx Bennu
  (returned 2023) ✓; Lucy launched 2021 ✓.
Source: https://en.wikipedia.org/wiki/Asteroid_belt ,
https://science.nasa.gov/dwarf-planets/ceres/facts/
Confidence: high.

**🟡 "the middle belt (2.5–3.2 AU) where carbonaceous C-types take over (Ceres +
Hygiea live here)".**
File: `asteroid-belt.json` → `body_paragraphs[0]`.
Note: Ceres orbits at ~2.77 AU and Hygiea ~3.14 AU — both inside 2.5–3.2 AU, OK.
Zone boundaries for S/C transition are approximate in the literature; fine as a
rough scheme. No change.
Confidence: high.

**🔵 "Dawn … the only spacecraft to ever orbit two extra-terrestrial bodies."**
Correct as of 2026 (Vesta then Ceres). ✓
Confidence: high.

---

## axial-tilt-and-seasons

**🔵 Obliquity table verified against IAU/NASA values.**
File: `axial-tilt-and-seasons.json` → `body_paragraphs[0]`.
Mercury 0.034° ✓, Venus 177.36° ✓, Earth 23.44° ✓, Mars 25.19° ✓, Jupiter 3.13°
✓, Saturn 26.73° ✓, Uranus 97.77° ✓, Neptune 28.32° ✓, Pluto 122.53° ✓.
Uranus "each pole gets 42 Earth-years of continuous sunlight" ✓ (84-yr orbit /2).
Venus solar day 117 d vs sidereal 243 d ✓.
Source: https://science.nasa.gov/uranus/facts/ , IAU pole conventions.
Confidence: high.

**🟡 "it nutates ±1.3° around the mean over 41,000 years" — wrong term + slightly
high amplitude.**
File: `axial-tilt-and-seasons.json` → `body_paragraphs[2]`.
Quote: "Earth's tilt itself isn't constant — it nutates ±1.3° around the mean
over 41,000 years, one of the Milankovitch orbital cycles…"
Problem: (1) "Nutation" is a distinct, short-period (~18.6 yr) wobble of the
axis, NOT the 41,000-yr Milankovitch obliquity cycle — using "nutates" here is
imprecise/wrong. (2) Amplitude: obliquity ranges 22.1°–24.5°, i.e. ±1.2° about a
~23.3° mean, not ±1.3°.
Correction: "Earth's tilt itself isn't constant — it oscillates between 22.1°
and 24.5° (about ±1.2° around the mean) over ~41,000 years, one of the
Milankovitch cycles…" (drop "nutates").
Source: https://climate.nasa.gov (Milankovitch), value range widely cited.
Confidence: high.

**🔵 "Mars's obliquity has chaotically wandered between 0° and 60°."**
Consistent with Laskar et al. chaotic-obliquity simulations. ✓
Confidence: high.

---

## kuiper-belt

**🟠 "about 200× the asteroid belt" — overstated; modern figure is ~50×.**
File: `kuiper-belt.json` → `narrative_101[1]`.
Quote: "The total mass is small (4–10% of Earth) but that's still about 200× the
asteroid belt."
Problem: Current dynamical mass estimates put the Kuiper Belt at ~0.02 Earth
masses and the main asteroid belt at ~4×10⁻⁴ Earth masses → the KB is ~**50×**
the asteroid belt, not 200×. The 200× figure comes from older, higher KB-mass
estimates.
Correction: "…but that's still on the order of ~50× the asteroid belt" (and see
the mass note below).
Source: https://link.springer.com/article/10.1134/S1063773718090050 (Pitjeva &
Pitjev 2018, "almost by a factor of 50").
Confidence: high.

**🟠 "total mass is small (4–10% of Earth)" — high vs modern estimate (~2%).**
File: `kuiper-belt.json` → `narrative_101[1]`.
Problem: Modern spacecraft-tracking mass estimates give the KB (incl. largest
TNOs) ≈ 0.02 Earth masses ≈ 2% of Earth. "4–10% of Earth" reflects older,
larger estimates. Combined with the 50× ratio above, using ~2% keeps both
figures internally consistent (2% Earth vs 0.04% Earth for the asteroid belt =
~50×).
Correction: "total mass is small (a few % of Earth — roughly 2%)".
Source: https://arxiv.org/pdf/1810.09771 (Mass of the Kuiper Belt).
Confidence: medium-high (estimates carry real uncertainty; 4–10% is the dated
upper end, ~1–2% is the current best).

**🔵 Everything else verified.**
- Kuiper proposed 1951 ✓; 1992 QB1 (Albion) by Jewitt & Luu, ~44 AU ✓.
- Classical belt "42–48 AU" ✓; Plutinos in 2:3 resonance ✓; scattered disc /
  Eris / Sedna ✓.
- Pluto demoted 2006 ✓; Eris discovered 2005 and slightly more massive than
  Pluto ✓ (Eris IS more massive though very slightly smaller in radius — overlay
  says "slightly more massive," correct).
- New Horizons Pluto flyby 14 Jul 2015 ✓; Arrokoth 1 Jan 2019, ~36 km bilobate ✓.
- Rosetta 67P glycine + phosphorus + O2 ✓ (2014–2016).
- "~30–50 AU" belt span implied — consistent.✓
Confidence: high.

**🟡 "Eris's aphelion is at 96 AU" (diagram_caption).**
Eris aphelion ≈ 97.5 AU, perihelion ≈ 38 AU. "96 AU" is close enough; could round
to ~97. Minor.
Confidence: high.

---

## magnetic-fields

**🔵 Magnetic-axis tilt table verified.**
File: `magnetic-fields.json` → `body_paragraphs[0]` and `narrative_101[2]`.
Mercury 0.7° ✓ (measured <0.8°), Earth 10.5° ✓, Jupiter 9.6° ✓, Saturn <1°/~0° ✓,
Uranus 58.6° ✓ (~59°), Neptune 46.9° ✓ (~47°). Venus/Mars/Pluto no global dipole
✓. Uranus dipole offset ~1/3 planetary radius ✓.
Source: https://www.planetary.org/space-images/the-magnetic-fields-of-uranus-and-neptune
Confidence: high.

**🔵 "Jupiter's magnetotail … reaches Saturn's orbit, around 1.4 billion km long."**
File: `magnetic-fields.json` → `body_paragraphs[1]`.
Verified: Jupiter's magnetotail extends to ~Saturn's orbit (~1 billion km / ~9.5
AU). Saturn's mean orbital radius ≈ 1.43 billion km, so "1.4 billion km" is a
reasonable statement of "reaches Saturn's orbit." ✓ (some sources say ">600
million miles ≈ 1 bn km"; the tail length varies — the claim is defensible.)
Source: https://en.wikipedia.org/wiki/Magnetosphere_of_Jupiter
Confidence: high.

**🟡 "Earth's [magnetosphere] reaches about 65,000 km sunward."**
File: `magnetic-fields.json` → `body_paragraphs[1]`.
Note: Earth's dayside magnetopause standoff is ~10 Earth radii ≈ 64,000 km under
average solar wind (ranges ~6–12 R_E). "About 65,000 km" is fine.✓
Confidence: high.

**🔵 "we've imaged [aurorae] on Earth, Jupiter, Saturn, Uranus, and Neptune."**
Aurorae confirmed/imaged on all five (Neptune's UV aurorae first clearly imaged
by JWST in 2025). ✓
Confidence: high.

---

## moons-of-the-system

**🟠 "Saturn has more than 140 known moons" — badly stale; it's ~285+ in 2026.**
File: `moons-of-the-system.json` → `body_paragraphs[1]`.
Quote: "Saturn has more than 140 known moons."
Problem: Saturn's confirmed-moon count exploded in 2023 (→146) and again through
2025–2026 to ~285–293 with confirmed orbits (IAU/MPC batches Mar & Apr 2026).
"More than 140" is the 2023-era figure and is now a large undercount.
Correction: use a hedged, current figure — e.g. "Saturn has the most moons of
any planet — ~290 with confirmed orbits as of 2026" (or "hundreds"). Given how
fast this moves, prefer "~" + year stamp, or phrase as "the most of any planet."
Source: https://en.wikipedia.org/wiki/Moons_of_Saturn ,
https://www.iau.org/IAU/IAU/News/Ann2026/MPC-New-Moons-Saturn-Jupiter.aspx
Confidence: high.

**🔵 Galilean + Pluto/Charon + Titan/Enceladus facts verified.**
- Galileo Jan 1610, four moons, 20× telescope, ended geocentrism ✓ (Padua rooftop
  ✓ — he was professor at Padua).
- Io most volcanically active ✓; Europa subsurface ocean, "2–3× Earth's ocean
  volume" ✓ (commonly cited 2–3×); Ganymede largest moon, bigger than Mercury,
  only moon with intrinsic magnetic field ✓ (radius 2,634 km ✓); Callisto ✓.
- Titan 2nd-largest moon, N2 atmosphere denser than Earth's at surface ✓;
  Huygens landed 2005 ✓. Enceladus tiger stripes + plumes + Cassini sampling +
  source of the E ring ✓.
- Pluto radius 1188 km, Charon radius 606 km, "half Pluto's diameter," barycentre
  outside Pluto ✓; New Horizons 2015 ✓; Triton retrograde, captured, likely
  subsurface ocean ✓.
- Phobos/Deimos likely captured; Phobos rises in the west (orbits faster than
  Mars rotates); spiralling in, will break up / crash in ~tens of Myr ✓
  ("roughly 50 million years" is within the cited 30–50 Myr range).
Source: https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/ ,
https://www.universetoday.com/8044/enceladus-replenishes-saturns-e-ring/
Confidence: high.

**🟡 "Saturn's icy moons are themselves the source of the E ring."**
File: `moons-of-the-system.json` → `body_paragraphs[1]`.
Note: The E ring is specifically fed by **Enceladus** plumes (not "icy moons"
generically). Minor imprecision — the sentence is in the Enceladus paragraph so
context implies it, but "Enceladus is the source of the E ring" is the precise
statement.
Confidence: high.

---

## planetary-stats

**🔵 Diameter, gravity, rotation tables verified against NASA fact sheets.**
File: `planetary-stats.json` → `narrative_101` + `body_paragraphs`.
- Diameters/Earth: Mercury 0.38, Venus 0.95, Mars 0.53, Jupiter 10.97, Saturn
  9.14, Uranus 3.98, Neptune 3.86, Pluto 0.19 ✓.
- Surface gravity/g: Mercury 0.38, Venus 0.91, Mars 0.38, Jupiter 2.53, Saturn
  1.07, Uranus 0.89, Neptune 1.14, Pluto 0.06 ✓ (Jupiter's is quoted 2.36–2.53
  depending on the reference radius; 2.53 uses equatorial 1-bar, fine).
- Rotation (h): Mercury 1407.5, Venus −5832.5, Earth 23.93, Mars 24.62, Jupiter
  9.93, Saturn 10.66 (System III ~10.66 ✓), Uranus −17.24, Neptune 16.11, Pluto
  −153.3 ✓.
- Mass ratios: Jupiter 318× Earth ✓, Mars 11% ✓; Venus 92 bar ✓; Mars 0.006 bar
  ✓; Saturn density <0.7 g/cm³ ("less than water") ✓.
Source: NASA planetary fact sheets (nssdc.gsfc.nasa.gov).
Confidence: high.

**🟡 "Jupiter … 2.53× Earth's surface gravity."**
Minor: Jupiter's 1-bar equatorial gravity is often quoted ~2.4 g; NASA lists
24.79 m/s² ≈ 2.53 g at the equatorial 1-bar radius. Self-consistent with the
narrative's "2.5×". No change.
Confidence: high.

**🔵 Physics reasoning (g ∝ M/R², "for average density g ∝ R") is correct.**
Confidence: high.

---

## sub-solar-and-terminator

**🔵 All physical claims verified.**
File: `sub-solar-and-terminator.json`.
- Terminator equatorial rotation speed: Earth ~1670 km/h ✓ (Earth's equatorial
  rotation ≈ 1670 km/h); Moon ~6.5 km/h — plausible for lunar equatorial
  rotation over 27.3 d (≈15.4 km/h... see note).
- Mercury day 430 °C / night −180 °C ✓ (approx +427 / −173).
- Moon +127 °C / −173 °C, lunar day 29.5 Earth days (synodic) ✓.
- Mars 25.19° tilt, 687-day year, more eccentric/unequal seasons ✓.
- Sub-solar latitude oscillates ±23.4° ✓.
Confidence: high.

**🟡 "the terminator moves … about 1670 km/h on Earth, 6.5 km/h on the Moon."**
File: `sub-solar-and-terminator.json` → `narrative_101[1]`.
Note: The Moon's equatorial circumference (~10,921 km) over its 27.3-day sidereal
rotation gives an equatorial surface speed of ~16.7 km/h, not 6.5 km/h. If the
6.5 km/h refers to the *synodic* day (29.5 d) and mid-latitudes it's lower, but
at the equator the figure should be ~15–17 km/h. 6.5 km/h looks too low for the
equatorial terminator — verify the intended latitude/day convention.
Correction: check derivation; equatorial value ≈ 16 km/h (sidereal). The "walk-
pace terminator" trope usually cites ~15 km/h ("~4 m/s") at the lunar equator.
Source: lunar rotation period 27.32 d; circumference 2π·1737.4 km.
Confidence: medium (depends on convention; but 6.5 looks off by ~2.5×).

**🔵 "Venus … essentially no day-night temperature variation … 117-day solar day."**
Correct — thick CO2 atmosphere homogenises surface temperature. ✓
Confidence: high.

---

## tides

**✓ Clean — all claims verified.**
File: `tides.json`.
- Two bulges (near + far), differential gravity across Earth's width ✓.
- Two high / two low tides per ~24 h 50 min ✓ (lunar day).
- Spring tides at new/full, neap at quarters ✓.
- Moon recedes ~3.8 cm/yr ✓ (measured 3.8 cm/yr via lunar laser ranging).
- Tidal bulge leads the Moon → torque raises Moon's orbit + lengthens Earth's day
  ✓.
- Moon tidally locked by the same mechanism ✓.
- Prompt's cross-check: "Sun ~46% of the Moon's tidal effect" — the overlay does
  NOT state a solar figure, but the 46% ratio (solar tidal force ≈ 0.46× lunar)
  is the accepted value, so nothing here contradicts it. ✓
Source: https://oceanservice.noaa.gov/education/tutorial_tides/tides02_cause.html
Confidence: high.
