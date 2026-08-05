# Missions + Science + Fleet fact-check — master index (2026-07-14)

The `science-reviewer` swept all **123 mission editorials** + **130 science
overlays** (253 items), batched across 25 reviewer agents. Each batch's detail
(exact quote → correction + source) is in its own file below. Nothing edited yet
— this is the review pass; apply on Marko's go (as with /programs).

Severity: 🔴 wrong fact · 🟠 claim > evidence · 🟡 needs source/softening · 🔵 nit.
(Some mission batches labelled HIGH/MED/LOW instead of emoji — same meaning.)

## Worst offenders (fix first)

**Fabrications / invented detail**
- `blue-moon-mk1` (moon) — fake 2025 flight dates; it never flew (NET 2027 after the New Glenn loss). → `missions-moon-robotic.md`
- `otv-3` (earth) — fabricated 16-day Antares/CCAFS interruption; delete. → `missions-commercial-modern.md`
- `vostok-6` (earth) — invented "solo-woman record until Soyuz MS-22 (2022)" caveat. → `missions-vostok-voskhod.md`
- `rosetta` (comet) — states the D/H "ruled out Jupiter-family comets" result as settled + cites the superseded paper (overturned by a 2024 re-analysis). → `missions-small-bodies.md`

**Staleness (2026 present outran the text)**
- `artemis2/3/4` (moon) — II already flew (Apr 2026); III now a demo, IV the first landing. → `missions-moon-luna.md`
- `apollo13` — "farthest humans ever" now broken by Artemis II. → `missions-apollo.md`
- `mangalyaan` counted as an *active* Mars orbiter (dead since Oct 2022); Saturn "140 moons" → ~285+ (2026); `akatsuki` "only active Venus orbiter" (ended Sep 2025); DRACO "flying ~2027" (cancelled Jun 2025); several stale Voyager 1 distances (AU / light-hours). → planets, inner-planets, scales-time, propulsion files.

**Hard physics/number errors**
- `mission-phases/nrho` + `orbits/cislunar-orbits` — NRHO period stated 9 d, actually ~6.5 d (×5 refs); perilune/apolune-vs-pole reversal. → science-mission-phases / science-orbits-a.
- `orbits/hill-sphere` — Sun-gravity "1500×" should be ~46,000×. → science-orbits-a.
- `orbits/special-orbits` — Molniya's two apogees "one per hemisphere" — both are northern. → science-orbits-b.
- `transfers/conic-sections` — calls the Voyagers "parabolic-ish"; they're hyperbolic (e>1). → science-transfers.
- `apollo12` — "first man-made lunar impact" false (Luna 2, 1959). → missions-apollo.
- `chandrayaan1` — India "4th to reach surface" → 5th. → missions-moon-robotic.
- `life-b/surface-mobility-rovers` — LRV "27 km record"→35.7 km, "57 km range"→92 km; `lunar-surface-ops` top speed 13→18 km/h. → science-life-b.
- `space-stations/pressurized-volume` — total vs habitable conflation + wrong Tiangong figure. → science-space-stations.
- Many overlay↔base internal contradictions (dates/durations): rosetta 60 vs 64 h, giotto dust-impact 14 vs 2 s, hayabusa1 reaction-wheel count, mars3 110 vs 14.5 s, apollo9 stage swap, liberty-bell-7 "MR-8"→MR-4, shenzhou-1 one-day date error.

## Fleet launchers (19 slugs — Batch A)
- `fleet-launcher-a.md` — antares, ariane-1, ariane-5, ariane-6, atlas-lv-3b, atlas-slv-3d, atlas-v, delta-ii, energia, falcon-9, falcon-heavy, h-iia, h3, long-march-2f, long-march-3b, long-march-5, long-march-7, lvm3, mercury-redstone
  - **0🔴 · 10🟠 · 5🟡 · 10🔵** across 25 findings
  - Key 🟠 issues: Antares status ACTIVE (230+ retired 2023); Energia tagline implies 1 flight (flew twice); Falcon 9 Block 5 name vs 2010 first_flight mismatch; H-IIA overlay says "retired after first flight 2001" (actually 50 flights, retired June 2025); H3 first_flight "2024" erases the 2023 failure; Atlas V agency="NASA" (should be ULA); LVM3 first_flight "2014" is suborbital test (orbital debut 2017); Falcon Heavy "second-most-powerful" contestable with Starship; Ariane 5 "Galileo" risks confusion with NASA Galileo probe

## Follow-up pass — Science-Lens overlay microcopy (2026-08-05)

The `science_layer_*_desc` layer descriptions (`messages/en-US.json`, shown in
`ScienceLayersPanel`) were **outside** the 2026-07-14 corpus above (which covered
the encyclopedia article tree). A dedicated pass reviewed all 33: 3 fixed
(🔴 `centripetal` force-equilibrium fallacy, 🟠 `soi` hard-boundary caveat,
🔵 `apsides` stale "ν = 42°"), applied + re-translated to all 13 locales.
→ [`science-lens-overlays.md`](science-lens-overlays.md)

## Detail files (25)

### Missions (123)
- `missions-small-bodies.md` — hayabusa2, osiris-rex, dawn, giotto, rosetta, hera, dart, lucy, hayabusa1
- `missions-outer-planets.md` — europa-clipper, galileo, juice, juno, pioneer-10, cassini, pioneer-11, voyager-1/2, new-horizons, psyche
- `missions-inner-planets.md` — parker, solar-orbiter, ulysses, bepicolombo, mariner10, messenger, akatsuki, magellan, vega-1/2, venera-13
- `missions-mars-a.md` — curiosity, hope-probe, insight, mangalyaan, mariner4/9, mars-express, pathfinder, mars3, maven
- `missions-mars-b.md` — mmx, opportunity, perseverance, phoenix, schiaparelli, spirit, starship-demo, starship-mars-crew, tianwen1, viking1
- `missions-moon-robotic.md` — beresheet, blue-moon-mk1, chandrayaan1/3, change1/3/4/5/6, clementine, lunar-prospector, slim, smart-1
- `missions-moon-luna.md` — lro, luna9/10/16/17/21/24, artemis2/3/4
- `missions-apollo.md` — apollo8/10/11/12/13/14/15/16/17
- `missions-mercury-gemini.md` — freedom-7, liberty-bell-7, friendship-7, aurora-7, sigma-7, faith-7, gemini3/4/6a/7/8/12
- `missions-apollo-era.md` — apollo-1/7/9, apollo-soyuz, skylab-2/3/4, soyuz-1/11, sputnik1
- `missions-vostok-voskhod.md` — vostok-1..6, voskhod-1/2, shenzhou-1
- `missions-commercial-modern.md` — inspiration4, polaris-dawn, otv-1..7

### Science (130)
- `science-history.md` · `science-life-a.md` · `science-life-b.md` · `science-mission-phases.md` · `science-observation.md` · `science-orbits-a.md` · `science-orbits-b.md` · `science-planets.md` · `science-porkchop.md` · `science-propulsion.md` · `science-scales-time.md` · `science-space-stations.md` · `science-transfers.md`

## Clean / low-issue (no or trivial fixes)
Missions: cassini, voyager-2, beresheet, clementine, phoenix, schiaparelli, mmx,
tianwen1, most Mercury/Gemini + Apollo (dates/masses verified). Science: keplers-laws,
keplerian-orbit, wormholes (exemplary), isru, eva-suits, food-production, Lambert/Hohmann/synodic.
