# Fact-check — Inner-planet missions (Sun / Mercury / Venus)

Scope: 11 missions, prose overlay (`i18n-src/en-US/missions/...`) + base data
(`static/data/missions/...`). Web-verified against NASA/ESA/JAXA/NSSDCA,
mission-team papers, Wikipedia. Reviewer stance: assume-wrong-until-verified.
Date of review: 2026-07-14.

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| sun/parker-solar-probe | Minor issues | LOW (speed 192 vs 191) |
| sun/solar-orbiter | Clean (dated caveat) | INFO |
| sun/ulysses | Clean | — |
| mercury/bepicolombo | **Errors** | **HIGH (wrong arrival date + internal inconsistency)** |
| mercury/mariner10 | Clean | — |
| mercury/messenger | Minor issues | LOW (core-ratio superlative) |
| venus/akatsuki | **Errors** | **HIGH (status ACTIVE — mission ended 2025-09-18)** |
| venus/magellan | Minor issues | LOW (resolution figure) |
| venus/vega-1 | Clean | — |
| venus/vega-2 | **Error** | **MEDIUM (overlay wrong landing site: Phoebe Regio → Aphrodite/Rusalka)** |
| venus/venera-13 | Clean | — |

## Counts

- HIGH: 3  (bepicolombo ×2 [arrival date + internal inconsistency], akatsuki ×1 status)
- MEDIUM: 1  (vega-2 landing-site error in overlay)
- LOW: 4  (parker speed, messenger core superlative, magellan resolution, magellan end-date ambiguity)
- INFO / dated-but-defensible: several (noted inline)

No `dispatch` field exists in any of these 11 overlays (all report "(none)").

---

## sun/parker-solar-probe — Minor issues

**LOW — closest-approach speed 192 vs 191 km/s**
- File+field: overlay `first`, `description`, event P22 note; base `flight.cruise.source`
- Quote: "At P22 it reached 192 km/s" / "fastest human-made object (192 km/s)"
- Wrong: NASA/Wikipedia give the P22 (2024-12-24) speed as ~191 km/s
  (690,000 km/h ≈ 191.0 km/s; NASA "over 190 km/s"). 192 is a rounding
  overreach, repeated in 3 places.
- Correction: use 191 km/s (or "~190 km/s").
- Source: https://en.wikipedia.org/wiki/Parker_Solar_Probe ,
  https://science.nasa.gov/blogs/parker-solar-probe/2024/12/20/parker-solar-probe-begins-record-setting-closest-approach-to-the-sun/
- Confidence: High

**Verified correct:** launch 2018-08-12; P1 2018-11-05 at 0.166 AU beating
Helios 2 (1976); 6.1 M km / ~9.86 R☉ at P22; heat shield 1,377 °C; TPS 11.43 cm
(≈115 mm) carbon-carbon; "bus at room temperature" (~30 °C); 7 Venus gravity
assists; highest C3 for a science mission; first corona / Alfvén-surface entry.
The P8 "first corona entry 2021-04-28" date matches the mission-team narrative.

---

## sun/solar-orbiter — Clean (one dated caveat)

**INFO — "first close-up polar magnetic field images" is now realised, at south pole**
- File+field: overlay `description` + event "POLAR IMAGING"; base event 2200
- The predicted milestone did occur: first-ever images of the Sun's south pole
  recorded 16–17 March 2025 at ~17° below the equator (PHI/EUI/SPICE),
  released June 2025. The files phrase it as forward-looking ("2025 onwards",
  "exceeds 17°") which is accurate. Optional: could be updated to state the
  south-pole first was achieved March 2025.
- Source: https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/Solar_Orbiter_gets_world-first_views_of_the_Sun_s_poles
- Confidence: High

**Verified correct:** launch 2020-02-10 Atlas V 411; P1 2020-06-15 at 0.51 AU;
closest-to-date 0.29 AU (0.293) 2022; ESA-led + NASA launch + 1 instrument;
target ~33° heliographic inclination via Venus GAs.

---

## sun/ulysses — Clean

**Verified correct:** launch 1990-10-06 from STS-41 Discovery (IUS + PAM-S);
Jupiter flyby 1992-02-08 (~380,000 km — NASA "~235,000 mi" = 378,000 km ✓),
deflection out of ecliptic; first south polar pass 1994 (Jun–Nov 1994 above
70° lat — file's "September 1994" is within the pass window ✓); first north
polar pass 1995; three polar-pass sets; end of contact 2009-06-30 after 18.5 yr;
"only spacecraft to study the Sun's poles / high-inclination heliocentric orbit."
GPHS-RTG power, hydrazine-freeze end cause all consistent.
- Source: https://science.nasa.gov/mission/ulysses/ ,
  https://en.wikipedia.org/wiki/Ulysses_(spacecraft)
- Confidence: High

---

## mercury/bepicolombo — ERRORS (HIGH)

**HIGH — Mercury orbit insertion date is wrong (2026-12-05 → 2026-11-21)**
- File+field: overlay `description` ("Mercury orbit insertion 2026-12-05") +
  event "MERCURY ORBIT INSERTION"; base `arrival_date: "2026-12-05"` + `credit`
  ("insertion is set for 2026-12-05")
- Wrong: After the April-2024 MTM thruster/power anomaly, ESA+JAXA re-planned;
  the current published arrival/orbit-insertion date is **2026-11-21**
  (JAXA/ISAS, May 2026). No source gives 2026-12-05.
- Correction: 2026-11-21 in overlay `description`, event note, base
  `arrival_date` and `credit`.
- Source: https://www.isas.jaxa.jp/en/topics/003812.html ,
  https://spacenews.com/esa-delays-bepicolombo-orbital-insertion-because-of-thruster-problem/ ,
  https://www.theregister.com/science/2026/05/26/japanese-space-agency-names-arrival-date-for-bepicolombo-mercury-mission/
- Confidence: High

**HIGH — internal inconsistency: base flight-event says "Planned 2026-11"
while base arrival_date / credit / overlay all say 2026-12-05**
- File+field: base `flight.events[]` MOI event `description`: "Planned 2026-11.
  ... First two-orbiter Mercury mission ever flown." vs `arrival_date`
  "2026-12-05".
- Wrong: two different dates inside the same base file. (Correct value 2026-11-21
  resolves both — fix all to 2026-11-21.)
- Confidence: High

**LOW — overlay says "8-year cruise", base credit says "7-year cruise"**
- Overlay `description`: "The 8-year cruise uses 9 gravity assists"; base
  `credit`: "The 7-year cruise uses 9 gravity assists".
- Launch 2018-10-20 → arrival 2026-11-21 ≈ 8.1 years. Overlay "8-year" is
  correct; base "7-year" is stale (was written when arrival was ~2025).
- Correction: base credit → "8-year cruise".
- Confidence: High

**INFO — Mercury flyby #5 / #6 dates in base are pre-anomaly plan values**
- Base events: "Mercury #5 ... planned for 2024-12-01", "Mercury #6 ... planned
  for 2025-01-08". Actual: flyby #5 occurred 2025-01-08 (the sixth/final flyby
  set slipped after the thruster issue; the final Mercury flyby was January 2025).
  These are labelled "planned" so not strictly false, but they no longer match
  the flown timeline. Low priority; flag for a base-data refresh.
- Source: https://www.space.com/bepicolombo-thruster-issues-mercury-arrival-delay-2026
- Confidence: Medium (exact re-planned flyby dates not fully pinned here)

**Verified correct:** launch 2018-10-20 Ariane 5 ECA from Kourou; ESA+JAXA
joint (MPO + Mio + MTM); 9 gravity assists (1 Earth + 2 Venus + 6 Mercury);
Earth GA 2020-04-10; Venus #1 2020-10-15; Venus #2 2021-08-10; Mercury #1
2021-10-01 at 199 km; named after Giuseppe (Bepi) Colombo who devised Mariner
10's multi-flyby trajectory; "second spacecraft to orbit Mercury after MESSENGER"
(still true — capture pending); first Europe+Japan joint planetary mission.

---

## mercury/mariner10 — Clean

**Verified correct:** launch 1973-11-03 (05:45 UTC) Atlas SLV-3D Centaur AC-34,
CCAFS LC-36B; Venus flyby 1974-02-05 at 5,768 km (first deliberate gravity
assist, first dual-planet flyby); Mercury #1 1974-03-29 at 703 km; Mercury #2
1974-09-21 at 48,069 km; Mercury #3 1975-03-16 at 327 km (closest); imaged ~45%
of Mercury; discovered magnetic field + exosphere; end 1975-03-24 (N₂ depletion);
first Mercury visit + first gravity-assist mission. All dates/distances match
Wikipedia/NASA/JPL.
- Source: https://en.wikipedia.org/wiki/Mariner_10 ,
  https://www.jpl.nasa.gov/missions/mariner-10/ ,
  https://www.astronomy.com/today-in-the-history-of-astronomy/sept-21-1974-mariner-10-flies-by-mercury/
- Confidence: High

---

## mercury/messenger — Minor issues

**LOW — "largest core/planet ratio in the solar system" is an overreach**
- File+field: overlay `description` + base `credit`: "Mercury's iron core
  occupies ~85 % of the planet's radius (the largest core ratio in the solar
  system)".
- Wrong (imprecise): Sources state Mercury has the largest core-to-radius ratio
  of any **planet** / **terrestrial planet**, ~85% of radius (~70% of mass).
  Some small differentiated bodies aside, the safe, sourced claim is "of any
  planet". "In the solar system" invites gas-giant / small-body comparison the
  sources don't support directly.
- Correction: "the largest core-to-radius ratio of any planet in the solar
  system" (or "of any terrestrial planet").
- Source: https://messenger.jhuapl.edu/About/Why-Mercury.html ,
  https://www.space.com/14978-mercury-discoveries-messenger-spacecraft.html
- Confidence: Medium

**Verified correct:** launch 2004-08-03 Delta II 7925H; MOI 2011-03-18;
controlled impact 2015-04-30; first spacecraft to orbit Mercury; six gravity
assists (E-V-V-M-M-M) over ~6.5 yr; sunshade front 370 °C / back −45 °C; water
ice in shadowed polar craters; "hollows"; ~85% core radius. Earth GA 2005-08-02;
Venus #2 2007-06-05; Mercury #1 2008-01-14. First full surface map.
- Note: overlay says "seven years" of cruise while base says "6.5 years" /
  "6-flyby". Launch 2004-08 → MOI 2011-03 = 6.6 yr. Base "6.5 years" is more
  precise; overlay "seven years" is a rounding, defensible. LOW/INFO.

---

## venus/akatsuki — ERRORS (HIGH)

**HIGH — status is stale: files claim ACTIVE / "only active Venus orbiter";
mission has ENDED**
- File+field: overlay `type` ("ORBITER · ACTIVE"), `first` ("currently the only
  active Venus orbiter"), `description` ("Still active."), event note ("SCIENCE
  OPERATIONS"); base `status: "ACTIVE"`, `credit` ("Still operating in orbit —
  currently the only active Venus orbiter"), final flight event ("currently the
  only active Venus orbiter").
- Wrong: JAXA lost contact April/May 2024; after >1 yr of recovery attempts,
  JAXA ran the termination procedure and declared operations **complete on
  2025-09-18**. Akatsuki is no longer active; Venus currently has no active
  orbiter.
- Correction: status → FLOWN; remove "still active" / "only active Venus
  orbiter"; note operations ended 2025-09-18 (contact lost 2024). Reframe the
  superlative to past tense ("was the only active Venus orbiter for its final
  years" or drop).
- Source: https://global.jaxa.jp/press/2025/09/20250918-2_e.html ,
  https://www.space.com/space-exploration/launches-spacecraft/venus-loses-its-last-active-spacecraft-as-japan-declares-akatsuki-orbiter-dead ,
  https://en.wikipedia.org/wiki/Akatsuki_(spacecraft)
- Confidence: High

**Verified correct:** launch 2010-05-20 H-IIA 202 Tanegashima with IKAROS;
VOI-1 failure 2010-12-07 (~152 s into burn, oxidiser check-valve salt buildup);
5-year solar-orbit hold; VOI-R 2015-12-07 using four RCS thrusters, 1228-s burn;
orbit 400 × 440,000 km, ~3° inclination; ~244 m/s ∆v. All flight facts hold —
only the ACTIVE status is wrong.

---

## venus/magellan — Minor issues

**LOW — "100-m resolution" is optimistic (sources: ~120 m / "100–150 m")**
- File+field: overlay `first` + `description` + events; base `credit` + flight
  event; all say "98% of the surface at 100-m resolution".
- JPL/mission sources give SAR resolution "on the order of 120 m" / "100 to
  150 meters". "100-m" is the low end / rounded value — commonly cited but
  slightly better than the typical figure.
- Correction (optional): "~120-m resolution" or "100–150 m".
- Source: https://www2.jpl.nasa.gov/magellan/fact.html ,
  https://science.nasa.gov/mission/magellan/
- Confidence: Medium

**LOW — Termination-Experiment / end date has a one-day ambiguity**
- File says 1994-10-13. Sources variously give last contact 1994-10-12 and
  final plunge 10-13/10-14. NSSDCA: contact lost Oct 12/13, 1994. Within known
  ambiguity; 10-13 is acceptable. Flag only.
- Confidence: Medium

**Verified correct:** launch 1989-05-04 STS-30 Atlantis + IUS from KSC LC-39B;
first planetary spacecraft launched from the Space Shuttle (Galileo followed
Oct 1989); arrival/VOI 1990-08-10 into 295 × 8543 km, 85.5° near-polar orbit;
98% radar coverage; Termination Experiment ("first planned controlled
atmospheric entry of a planetary spacecraft"); tessera / coronae / pancake
domes / young resurfaced surface. Type-IV (1.5 solar revs) transfer consistent.

---

## venus/vega-1 — Clean

**Verified correct:** launch 1984-12-15 Proton-K from Baikonur; descent module
+ first-ever planetary balloon aerostat (ESA/CNES-built), ~54 km altitude, ~46.5 h
(sources: "more than 46 h", traverse 11,600 km); Venus arrival 1985-06-11;
Halley closest approach 8,890 km on 1986-03-06 (first close cometary-nucleus
observation); Vega's fix aided Giotto's 596 km flyby ~8 days later (Giotto
1986-03-14). "First balloon in another planet's atmosphere" + "first science to
two distinct solar-system targets" both hold.
- Source: https://en.wikipedia.org/wiki/Vega_1 ,
  https://en.wikipedia.org/wiki/Vega_program ,
  https://www.nature.com/articles/321262a0
- Confidence: High
- Note: overlay `first` "first spacecraft to carry science to two distinct
  solar-system targets" — defensible; the Vega buses carried Venus + Halley
  instruments in one mission. Keep.

---

## venus/vega-2 — ERROR (MEDIUM)

**MEDIUM — overlay states wrong landing site (Phoebe Regio highlands)**
- File+field: overlay `first` ("first chemical analysis of Venusian highland
  soil (Phoebe Regio, 1985)") + `description` ("landed 1985-06-15 in the Phoebe
  Regio highlands")
- Wrong: Vega 2 landed at ~7.1°S 177.7°E in **Rusalka Planitia, in the northern
  part of Aphrodite Terra** — a plain, not the Phoebe Regio highlands.
  Phoebe Regio is where Venera 13 landed (7.5°S 303°E). The overlay has
  conflated the two sites. The base file is CORRECT ("landed at 7.5°S 177.7°E",
  "Lander touched down on Aphrodite Terra") — so overlay ↔ base disagree.
- Also: the XRF result was anorthosite-troctolite ("highland-type"/lunar-highland
  -like) *material*, but the lander sat on a plain; calling the SITE "highland"
  is imprecise even setting the region name aside.
- Correction: overlay → "Aphrodite Terra (Rusalka Planitia)"; drop "Phoebe
  Regio". Keep the anorthosite-troctolite composition point but describe it as
  composition, not site elevation.
- Source: https://en.wikipedia.org/wiki/Vega_2 ,
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1984-128E ,
  https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/JB091iB13p0E215
- Confidence: High

**INFO — overlay balloon "~240 km/h" vs base "~240 km/h" consistent;** balloon
traverse / ~46 h consistent with Vega 1. Fine.

**Verified correct:** launch 1984-12-21 (6 days after Vega 1); Venus arrival
1985-06-15; Halley closest approach 8,030 km on 1986-03-09 (3 days after Vega 1);
paired fix feeding Giotto. Base landing site + coordinates correct.

---

## venus/venera-13 — Clean

**Verified correct:** launch 1981-10-30 Proton-K/Block D from Baikonur; landing
1982-03-01 at 7.5°S 303°E (NSSDCA: "just east of Phoebe Regio" — files' "Phoebe
Regio highlands" is the standard shorthand ✓); surface 457 °C, 89 bar; survived
127 minutes (design ~32 min, so "nearly an hour beyond target" is generous but
directionally right — actual is ~4× design, files' "twice the design lifetime"
in base and "nearly an hour beyond" in overlay both understate the true ~95-min
margin, but not false); first colour panoramas from another planet's surface;
first surface audio (GROZA acoustic detector); XRF soil chemistry (leucite
alkaline / weakly differentiated basalt); Venera 14 twin launched 1981-11-04,
landed 1982-03-05. Venera surface program "only successful Venus surface program."
- Source: https://en.wikipedia.org/wiki/Venera_13 ,
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1981-106D ,
  https://www.drewexmachina.com/2022/03/01/first-pictures-color-views-of-the-surface-of-venus-by-venera-13-march-1-1982/
- Confidence: High
- Note: overlay says twin Venera 14 "five days later"; base says "5 days apart"
  (launch) — landings were 1982-03-01 vs 03-05 = 4 days; launches 10-30 vs 11-04
  = 5 days. Overlay's "five days later" for the operations is off by one (4-day
  landing gap) but base "launched 5 days apart" is correct. LOW/INFO.
