# Forward-Looking Space Programs Catalog — 2026-06-09

> Working reference for orrery's "what's planned through ~2035" data backlog. Compiled from 5 parallel research passes (NASA + US gov, US commercial, China CNSA, Russia Roscosmos, ESA + JAXA + ISRO + UAE + others) on 2026-06-09, the day NASA announces the Artemis III crew.
>
> **Confidence legend:** A = officially announced + funded with hardware/schedule. D = in active development. P = proposed / study / paper. Slip warning: anything past ~2030 is aspirational.
>
> **Use this doc:** as the source-of-truth backlog when slicing forward-looking missions + fleet additions into `static/data/missions/` and `static/data/fleet/`. Cross-reference against the gap analysis at the bottom before opening a slice.

---

## Architectural resets since mid-2025 (what's NEW vs orrery's current data)

These are the headline shifts the user asked about — none of them are reflected in `static/data/missions/` or `static/data/fleet/` today.

1. **Lunar Gateway cancelled (March 2026)** — NASA Administrator Isaacman paused Gateway "in its current form" in favour of a lunar surface base. PPE bus repurposed for the new SR-1 Freedom Mars demo. HALO + Lunar I-Hab + Lunar View + Lunar Link all in redirection limbo pending June 2026 ESA Council decision.
2. **Artemis III demoted to LEO HLS-rendezvous demo (Feb 2026)** — Artemis IV becomes the first crewed lunar landing of the program. Artemis V is now Blue Moon Mk2's inaugural crewed flight.
3. **Mars Sample Return effectively cancelled (Jan 2026)** — House minibus zeroed funding. Rocket Lab + Lockheed commercial concepts halted. ESA Earth Return Orbiter formally proposed for cancellation March 2026; Airbus winding down.
4. **VIPER revived (Sep 2025)** — reassigned to Blue Moon Mk1 commercial-risk delivery, NET late 2027 (was cancelled July 2024 from Astrobotic Griffin).
5. **New Glenn LC-36 loss (May 28 2026)** — static-fire explosion destroyed vehicle + damaged pad; cascades into Blue Moon Mk1/Mk2 schedule, Kuiper deployment, DoD assured-access posture. NASA publicly pressuring Blue Origin to seek alternative launcher.
6. **HALO + Lunar I-Hab corrosion** discovered at JSC late 2025 — Northrop's Gateway/Artemis assembly slips past 2030.
7. **Roman Space Telescope pulled forward** to 30 Aug 2026 (was May 2027). On Falcon Heavy.
8. **SR-1 Freedom** — new nuclear-electric Mars demo Dec 2028 (closed-Brayton HALEU reactor + 3 SkyFall helicopters); reuses Gateway PPE bus.
9. **Soyuz-5 (Irtysh) flew successfully** 30 Apr 2026 from Baikonur Site 45.
10. **China Tianwen-2 rendezvous with Kamoʻoalewa** literally today, 2026-06-07 (sample return 2027, then comet 311P/PanSTARRS by Jan 2035).
11. **Shenzhou-23 launched 24 May 2026** with the first Hong Kong astronaut; Shenzhou-24 in Oct 2026 with the first Pakistani astronaut.
12. **Bharatiya Antariksh Station** — ISRO's own space station, first module on LVM3 in 2028, 5-module config by 2035.

---

## NASA + US gov (Artemis + planetary + observatories)

### Artemis crewed

| Mission | Date | Conf | Notes |
|---|---|---|---|
| Artemis II | 1 Apr 2026 | FLEW | Wiseman / Glover / Koch / Hansen lunar flyby. |
| Artemis III (LEO HLS-rendezvous demo) | NET late 2027 | A | No landing. Crew announce 9 Jun 2026. |
| Artemis IV (first crewed landing) | early 2028 | A | HLS provider TBD between SpaceX Starship / Blue Moon Mk2. |
| Artemis V (2nd crewed landing) | NET late 2028 | A | Inaugural crewed Blue Moon Mk2; annual cadence target from here. |
| Artemis VI / VII+ | 2029–2031 | P | Surface-base buildup; tied to $20B base plan 2029–2036. |

### HLS

- **Starship HLS** (SpaceX) — uncrewed lunar landing demo NET June 2027 (SpaceX); independent estimate 2028. Crewed Artemis IV NET Sep 2028. Refueling cadence (~15+ tankers per mission) is the binding constraint.
- **Blue Moon Mk2** (Blue Origin) — full crew-cabin mockup at JSC since late 2025. Artemis V inaugural ~2030 (NASA baseline) / 2031 (independent).

### Gateway (CANCELLED, redirected)

- **PPE** → repurposed as SR-1 Freedom bus.
- **HALO** (Northrop) → corrosion-flagged; future TBD.
- **Lunar I-Hab** (ESA/JAXA) → ESA Council June 2026 review.
- **Lunar View / Lunar Link** (ESA) → same redirection.
- **Canadarm3** (MDA/CSA) → most-likely survivor, flexes to surface base.

### CLPS deliveries (manifested)

| Mission | Provider / Lander | Site | Date |
|---|---|---|---|
| Griffin-1 | Astrobotic Griffin | Nobile Crater (south pole) | NET Jul 2026 — carries Astrolab FLIP rover (VIPER reassigned). |
| IM-3 | Intuitive Machines Nova-C | Reiner Gamma magnetic swirl | H2 2026 — Lunar Vertex + JPL CADRE rovers + first NSNS relay sat. |
| Blue Ghost M2 + Lunar Pathfinder | Firefly | Far-side relay + lander | 2026. |
| APEX 1.0 | Draper / ispace-US | Schrödinger Basin (far side) | Late 2026 — 6 NASA payloads. |
| VIPER on Blue Moon Mk1 | Blue Origin | South pole | Late 2027 (revived Sep 2025). |
| IM-4 | Intuitive Machines | Mons Mouton (south pole) | Early 2027. |
| Blue Ghost M3 | Firefly | Gruithuisen Domes | 2027–2028. |
| IM-5 | Intuitive Machines Nova-D | Mons Malapert | NET 2028 ($180.4M task order). |

### Moon-to-Mars architecture

- **SR-1 Freedom** — Dec 2028, nuclear-electric Mars demo + 3 SkyFall helicopters (reuses Gateway PPE bus).
- **Lunar Reactor 1 (LR-1)** — surface fission, 2030.
- **Lunar Surface Base** — $20B permanent outpost, 2029–2036.
- **Crewed Mars** — study target 2036.

### Planetary science (active development)

| Mission | Target | Launch | Conf |
|---|---|---|---|
| Dragonfly | Titan rotorcraft | 5–25 Jul 2028 (Falcon Heavy) | A — in integration at APL. |
| VERITAS | Venus orbit / radar | NET 2031 (slipped from 2026) | D — funded but constrained. |
| DAVINCI | Venus descent probe | Dec 2030 | D — $99M FY26. |
| EnVision (ESA + NASA SAR) | Venus orbit | Nov 2031 | D — NASA SAR contribution at risk. |
| Uranus Orbiter & Probe | Uranus | early–mid 2030s | P — decadal #1 but unapproved, Pu-238 gated. |
| Enceladus Orbilander | Enceladus | late 2030s | P — decadal #2, concept only. |

### Observatories

| Mission | Domain | Launch | Conf |
|---|---|---|---|
| Roman Space Telescope | wide-field optical/IR, L2 | 30 Aug 2026 (Falcon Heavy) | A — pulled forward 8 months. |
| NEO Surveyor | planetary-defense IR | NET Sep 2027 (Falcon 9) | A — ahead of schedule. |
| Habitable Worlds Observatory (HWO) | exoplanet flagship | 2040s | P — concept/tech-maturation. |

---

## US commercial (SpaceX + Blue Origin + Sierra + Axiom + Vast + Voyager + emerging)

### SpaceX

- Starship IFT-13 NET late 2026 (V3 stack); orbital propellant-transfer demo NET June 2026 SpaceX target (industry est. NET 2027); Starship HLS uncrewed demo NET June 2027.
- Starlink V3 (60 sats / Starship, 60 Tbps each) deploys H2 2026; FCC +7,500 Gen2 approval Jan 2026 (15,000 cap).
- Polaris III effectively paused per Isaacman conflict-of-interest pledge.
- Crew-Dragon-as-platform: Vast-1 (NET June 2026, slipping with Haven-1), Axiom Ax-5 (NET Jan 2027 — awarded Jan 2026).

### Blue Origin

- New Glenn return-to-flight TBD post-incident; ~12-month rebuild.
- Blue Moon Mk1 Pathfinder pre-incident NET late 2026; now TBD. Carries VIPER.
- Blue Moon Mk2 (Artemis V crewed) ~2030 NASA baseline / 2031+ independent.
- Orbital Reef — no flight hardware, partnership with Sierra strained.

### Sierra / Axiom / Vast / Voyager (commercial LEO stations + crew)

- **Dream Chaser Tenacity (SSC Demo-1)** — NET late 2026, descoped Sept 2025 (no longer dockings ISS).
- **AxEMU** — for HLS surface EVAs, tracks Artemis 3.
- **Axiom Station** — PPTM module NET 2027 (assembly order revised 2025), Hab One ~early 2028.
- **Haven-1** (Vast) — Vast targets May 2026 / industry est. Q1 2027. Falcon 9.
- **Haven-2** (Vast) — NET 2028+, competing for NASA CLD Phase 2.
- **Starlab** (Voyager + Airbus + MHI + MDA + Palantir + SAS) — CCDR Feb 2026; single-Starship launch NET 2028.

### Debut flights / new launchers (all NET 2026)

- **Stoke Nova** — first flight late 2026, expendable; reuse demo later.
- **Rocket Lab Neutron** — first flight Q4 2026 (slipped from mid-2026).
- **Relativity Terran R** — H2 2026, 23.5 t reusable / 33.5 t expendable.
- **Firefly Eclipse** (rebrand of MLV) — 2026, 16t+, Wallops/MARS launch.
- **Impulse Helios** (kick stage) — Mira + GEO Express-1, NET 2026, Falcon 9.
- **K2 Space Gravitas** — Mar 2026 demo (20kW Hall thruster, LEO→MEO orbit raise); Trinity (3 sats) NET 2027.
- **Vulcan Centaur 2026 cadence** — ULA target 16–18 launches; Space Force paused NSSL after USSF-87 SRB anomaly Feb 2026.

### Gateway-adjacent / cargo

- **Cygnus XL** — operational since NG-23 (April 2026).
- **HALO module** (Northrop) — corrosion-flagged, NET 2030+.

---

## China (CNSA + CMS + commercial)

### Tiangong expansion + crew

- 4th module (multifunctional 6-port node) 2027 — cross-config from current T-shape.
- 5th + 6th science modules by 2030 — final 6-cabin / 198 t.
- **Xuntian (CSST)** 2 m space telescope co-orbits Tiangong, 2027 (slipped from 2026).
- Shenzhou-23 in flight (launched 24 May 2026); Shenzhou-24 Oct 2026; -25/26/27 follow at ~6-month cadence with yearlong stays baselined.
- Tianzhou-10 flew May 2026; -11 / -12 in pipeline (7.4 t upgraded variant).
- Next-gen cargo (Haolong, others) — 2027–2028 commercial competition.

### Crewed lunar Project 921 — target 2030

- **Long March 10** (CZ-10) — uncrewed orbital w/ Mengzhou-1 late 2026; crewed lunar by 2030. Feb 2026 first-stage splashdown landed ~200m from target floating platform.
- **Mengzhou** (NGCS) crewed spacecraft — first orbital flight late 2026; lunar by 2030. Escape + parachute tests done.
- **Lanyue** lunar lander — integrated landing/ascent test article validated Aug 2025 (Huailai).
- **Wangyu** EVA suit + **Tansuo** crewed rover — prototypes complete per CMSA Oct 2025.

### Lunar robotic + ILRS

- **Chang'e-7** Aug 2026 — south pole (Shackleton rim), orbiter + lander + rover + LUWA hopping probe, 21 payloads.
- **Chang'e-8** 2028 (2029 fallback) — south pole ISRU demos (3D-printed lunar brick, mini-ecosystem, multitask robot), ILRS precursor.
- **ILRS basic station** ops 2035+; phase-2 modular expansion 2036–2045. Partners: Russia, UAE, Pakistan, Venezuela, S Africa, Nicaragua, APSCO, AUASS, 40+ institutions.

### Mars + outer system

- **Tianwen-2** — rendezvous w/ Kamoʻoalewa **today 2026-06-07**; sample return 2027; comet 311P/PanSTARRS Jan 2035.
- **Tianwen-3** Mars sample return — two CZ-5 launches late 2028, Earth return 2031, ≥500 g target.
- **Tianwen-4** Jupiter system (Callisto orbit) + Uranus piggyback flyby — launch ~Sep 2029, Jupiter Dec 2035, Uranus 2045.
- Venus atmosphere sample return — ~2033 launch, return ~2035 (P, in CAS 2050 roadmap).

### Astrophysics

- **Kuafu-2** — solar polar orbit, late 2020s (P).
- **Earth 2.0 (ET)** — exoplanet transit, ~2028 (D), 6-telescope Kepler-class.
- **eXTP** — X-ray timing & polarimetry, 2027–2028 (China-ESA).
- **Taiji** — heliocentric GW, ~2033 (P).
- **TianQin** — geocentric GW, ~2035 (P).

### Launchers

- **Long March 10/10A** — late 2026 uncrewed; 2030 crewed lunar.
- **Long March 9** — super-heavy 150 t LEO, maiden ~2030 (some sources 2033).
- **Long March 8A** — flying 2026, primary Guowang lifter; CZ-8 family 15 flights planned.
- **Long March 12/12A/12B** — 12A flew Dec 2025 (recovery failed); 12B maiden 2026-06-01.

### Commercial reusables (all flying 2026)

- Landspace Zhuque-3 (Dec 2025 maiden, recovery failed; Q2 2026 reflight target).
- Space Pioneer Tianlong-3 (2026 debut).
- Galactic Energy Pallas-1 (2026 debut).
- Deep Blue Aerospace Nebula-1A early 2026 / Nebula-2 (25 t) 2026.
- CAS Space Lijian-2 (2026 LOX/kerolox debut).
- Orienspace Gravity-2 (2026 debut).
- iSpace Hyperbola-3 (2026 debut).

---

## Russia (Roscosmos)

> Reality check: every flagship has slipped 3–7 years since 2022. Funding has shifted to military. Anything past 2030 is aspirational.

### ROSS (Russian Orbital Service Station)

- NEM-1 (Science-Energy Module) 2029 — docks at ISS first, separates ~2030 before deorbit.
- UUM (Universal Node Module) 2030.
- Gateway Airlock (ShM) 2031.
- ROSS Phase 2 (3 add'l modules) 2032–2035 (P, funding unconfirmed).

### Lunar program

- Luna 26 (polar orbiter) 2028 — slipped from 2027. Site scout + comms relay for Luna 27.
- Luna 27 (south polar lander) 2029–2030 — ESA PILOT precision-landing removed post-2022, solo.
- Luna 28 (sample return) 2034.
- Luna 29 (rover) ~2035.
- Luna 30 ~2036.
- ILRS participation — Russia rides Chinese cadence, contributes instruments to Chang'e-7 + 8.

### Crewed deep-space

- **Orel (PTK NP)** uncrewed test March 2028 (slipped from 2023→2025→2027); crewed 2029–2030 on Angara A5P.

### Launchers

- **Soyuz-5 (Irtysh)** — flew successfully 30 Apr 2026, Baikonur Site 45.
- **Angara A5M** — uprated, 2027–2028.
- **Angara A5P** — human-rated for Orel, 2028–2029.
- **Angara A5V** — hydrogen upper stage, "early 2030s" (P).
- **Yenisei (STK-1)** — super-heavy ~70 t LEO, 2032–2035, $15B cap. Restarted 2025, no hardware cut yet.
- **Don (STK-2)** — super-heavy ~140 t, post-2035 (paper).

### Planetary

- **Venera-D** — Venus orbiter + lander + balloon, NET 2036, solo post-NASA partnership.
- **Mars** — none announced. Drought since Phobos-Grunt 2011.

### Earth obs / nav

- GLONASS-K2 deployment with 100% domestic components from 2026.
- GLONASS-V high-orbit (6 sats 2026–2027, full ops 2030).

### Commercial

- Effectively moribund (S7 Space, SR Space bankrupt).

---

## ESA / JAXA / ISRO / UAE / Korea / Israel / Brazil

### ESA

| Mission | Target | Launch | Conf |
|---|---|---|---|
| Argonaut (ArgoNET-1) | Lunar south pole logistics | end-2030 | D — consortium selection end-2026. |
| Lunar I-Hab + Lunar View + Lunar Link | Lunar base (post-Gateway pivot) | TBD | D-uncertain — June 2026 ESA Council. |
| Earth Return Orbiter (MSR) | Mars | CANCELLED | Mar 2026 — Airbus winding down. |
| EnVision | Venus orbit | Nov 2031 | D — Ariane 64. |
| Comet Interceptor | Pristine comet at L2 | 2029 (co-passenger w/ Ariel) | D. |
| Ariel | L2 / 1000+ exoplanets | 2029→2031 slipped | D. |
| Vigil | Sun-Earth L5 space weather | 2031 | D. |
| LISA | Heliocentric GW (2.5 Mkm triangle) | 2035 | A — adopted Jan 2024, on Ariane 6. |
| NewAthena | L2 X-ray | 2037 | D — adoption 2027. |
| TRUTHS | Earth climate calibration | 2030–31 | suspended — UK pulled funding end-2025. |
| Ariane 6 | LEO/GTO/lunar | 6–8 flights targeted 2026 | operational. |
| Vega-C | LEO/SSO | operational; Avio markets 2026 | operational. |

### JAXA

| Mission | Target | Launch | Conf |
|---|---|---|---|
| MMX | Phobos sample return + Deimos flyby | Nov–Dec 2026 window | D-ready — at Tanegashima Mar 2026. Earth return 2031. |
| HTV-X | ISS cargo | HTV-X1 flew Oct 2025, re-entered May 2026 | operational. |
| LUPEX (Chandrayaan-5) | Lunar south pole | NET 2028 | D — H3-24L. JAXA rover (350 kg) + ISRO lander. |
| DESTINY+ | Asteroid 3200 Phaethon | FY2028 launch, flyby FY2030 | D — migrated Epsilon S → H3. |
| Lunar Cruiser (LCR) | Lunar surface pressurised rover (Artemis) | delivery ~2031, ops ~2032 | D — Toyota / JAXA / NASA. Japan's marquee Artemis contribution. |
| iSpace Hakuto-R M3 | Lunar surface | 2027 | D — uses APEX 1.0 lander on Falcon 9. |

### ISRO

| Mission | Target | Launch | Conf |
|---|---|---|---|
| Gaganyaan G1 | LEO uncrewed (Vyommitra) | H2 2026 (likely slipped from Mar 2026) | D. |
| Gaganyaan G2/G3 | LEO uncrewed (abort scenarios) | 2026–2027 | D. |
| Gaganyaan H1 (crewed) | LEO 3 astronauts ~7 days | Q1 2027 | A — first Indian-vehicle crewed flight. |
| Bharatiya Antariksh Station (BAS-01) | LEO 400–450 km | first module 2028 on LVM3 | A — 5-module station by 2035, NGLV for modules 2–5. |
| Chandrayaan-4 | Lunar sample return (~3 kg) | Oct 2027 | D — approved Sept 2024 (₹2,104 cr). 2× LVM-3, orbit assembly. |
| Chandrayaan-5 (LUPEX) | Lunar south pole | NET 2028 | D — see JAXA. |
| Shukrayaan-1 | Venus orbit | 2028 | A. |
| Mangalyaan-2 | Mars orbiter+lander+rover | 2028–2030 | D. |
| NGLV "Soorya" | 30 t LEO expendable / 20–23 t reusable | D1–D3 2032–2035 | A — ₹8,240 cr approved Sept 2024. |
| Skyroot Vikram-1 | LEO smallsat | maiden ~June 2026 | D-ready. |
| Agnikul Agnibaan | LEO smallsat | orbital TBD post-2026 | D. |

### UAE

| Mission | Target | Launch | Conf |
|---|---|---|---|
| Rashid Rover 2 | Lunar far side (on Blue Ghost 2) | 2026 | D-ready — dev complete Nov 2025. |
| MBR Explorer (EMA) | 6 main-belt asteroid flybys + 269 Justitia rendezvous | Mar 2028 | A — H3 from Tanegashima. Justitia arrival 2034. |

### Korea / Israel / Brazil

| Mission | Target | Launch | Conf |
|---|---|---|---|
| KSLV-III (Korea) | LEO / lunar | maiden 2030; lunar 2032 | D — Hanwha lead. |
| Korean Lunar Lander + 20 kg rover | Lunar surface | 2032 on KSLV-III | A. |
| Beresheet 2 (Israel) | Lunar orbiter + 2 micro-landers | suspended Apr 2025 | suspended — funding gap. |
| VLM-1 (Brazil) | LEO 50–150 kg | maiden 2026 | D — AEB/DLR. |

---

## Gap analysis vs orrery's current data

What's already in `static/data/missions/index.json` and `static/data/fleet/index.json` for forward-looking entries (as of 2026-06-09):

**Missions:** artemis3, blue-moon-mk1, mmx, starship-demo, starship-mars-crew.
**Fleet:** axemu, gaganyaan, htv-x, sokol-m, exomars-rosalind-franklin.

Approximate gap from the catalog above: **~100+ unique entries** across forward-looking missions + fleet assets. The biggest underrepresented buckets:

1. **Artemis IV/V/VI/VII** — none in data.
2. **Tiangong expansion + Shenzhou-23/24/25** — none.
3. **China crewed lunar 2030** (Long March 10, Mengzhou, Lanyue, Wangyu, Tansuo) — none.
4. **Tianwen-2/3/4 + Chang'e-7/8** — none.
5. **CLPS deliveries** (Griffin, IM-3/4/5, Blue Ghost 2/3, APEX) — none.
6. **ROSS modules + Orel + Luna 26-30** — none.
7. **SR-1 Freedom, Lunar Reactor 1, Lunar Surface Base** — none.
8. **Roman + NEO Surveyor + Dragonfly + DAVINCI + VERITAS + EnVision** — none.
9. **ESA Argonaut + Comet Interceptor + Ariel + Vigil + LISA + NewAthena** — none.
10. **JAXA Lunar Cruiser + DESTINY+** — none.
11. **ISRO BAS-01, Chandrayaan-4/5, Shukrayaan-1, Mangalyaan-2, NGLV** — none.
12. **UAE MBR Explorer + Rashid Rover 2** — none.
13. **Commercial LEO stations** (Haven-1/2, Starlab, Axiom Station, Orbital Reef) — none.
14. **2026 launcher debuts** (Neutron, Terran R, Nova, Eclipse, Soyuz-5, CZ-12B, Vikram-1, VLM-1, Pallas-1, Tianlong-3, Lijian-2, Hyperbola-3, Nebula-2, Zhuque-3) — none.
15. **Architectural cancellations / pivots** (Gateway cancelled, MSR cancelled, Artemis III demoted, Dream Chaser descoped) — not reflected in existing entries.

---

## Suggested slicing plan

Each slice is independent, can land as a single PR, and follows the "Significant work blocks need doc updates + GH issue" pattern from CLAUDE.md memory.

- **Slice 1 — Artemis architecture reset.** Update artemis3 to "LEO HLS-rendezvous demo"; add Artemis IV/V/VI/VII; cancel/redirect Gateway entries; mark Mars Sample Return cancelled; add SR-1 Freedom + Lunar Reactor 1.
- **Slice 2 — CLPS lunar deliveries.** Add Griffin-1, IM-3/4/5, Blue Ghost M2/M3, APEX 1.0, Blue Moon Mk1 VIPER mission. Fleet entries for any new lander variants.
- **Slice 3 — China crewed lunar 2030.** Long March 10 (launcher), Mengzhou (crewed spacecraft), Lanyue (lander), Wangyu (suit), Tansuo (rover). Single program block.
- **Slice 4 — China Tiangong expansion + Shenzhou.** 4th–6th modules, Xuntian co-orbiter, Shenzhou-23/24/25, Tianzhou-10/11/12.
- **Slice 5 — China deep-space.** Tianwen-2 (in flight), Tianwen-3 (MSR), Tianwen-4 (Jupiter+Uranus), Chang'e-7/8.
- **Slice 6 — Russia roadmap.** ROSS modules, Orel, Luna 26–30, Yenisei, Soyuz-5 (operational), Venera-D.
- **Slice 7 — ESA roadmap.** Argonaut, EnVision, Comet Interceptor, Ariel, Vigil, LISA, NewAthena. Mark ERO cancelled.
- **Slice 8 — JAXA + ISRO + UAE.** Lunar Cruiser, DESTINY+, BAS-01, Chandrayaan-4/5, Shukrayaan-1, Mangalyaan-2, NGLV, MBR Explorer, Rashid Rover 2, LUPEX.
- **Slice 9 — Commercial LEO stations.** Haven-1/2, Starlab, Axiom Station modules, Orbital Reef (low-confidence).
- **Slice 10 — 2026 launcher debut wave.** Neutron, Terran R, Nova, Eclipse, Vikram-1, VLM-1, CZ-12B, Pallas-1, Tianlong-3, Lijian-2, Hyperbola-3, Nebula-2, Zhuque-3 reflight.
- **Slice 11 — NASA planetary + observatories.** Roman, NEO Surveyor, Dragonfly, DAVINCI, VERITAS, EnVision contribution, Uranus Orbiter & Probe, Enceladus Orbilander (proposed).

Recommended order: 1 → 3 → 5 → 6 → 7 → 8 → 2 → 4 → 11 → 9 → 10. Architectural resets (slice 1) unblock everything else; the big-program slices (3, 5, 6, 7, 8) carry the bulk of the new fleet entries; CLPS / Tiangong / observatories / stations / launchers can follow at lower priority.

---

## Sources

Per-agency citation lists live in the original research-agent outputs (5 separate runs on 2026-06-09). NASA: NASA mission pages, NASA OIG IG-26-004 HLS audit, GAO-24-106878, SpaceNews, Spaceflight Now, Wikipedia mission articles. US commercial: company press, FCC filings, SpaceNews, Ars Technica, Eric Berger. China: SpaceNews (Andrew Jones), CMSA / CNSA English, NASA Spaceflight forum, *China in Space* newsletter, Planetary Society explainers. Russia: Roscosmos.ru, TASS, Anatoly Zak / RussianSpaceWeb, NASASpaceflight Russia threads, Meduza. Europe + Japan + India + UAE: ESA news, JAXA press, ISRO press, SpaceNews international, European Spaceflight newsletter.
