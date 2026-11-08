# Mission fact-check — 2026-11-06

All 126 missions checked against sources: 18 alongside their blueprints (`scripts/anatomy/blueprints-history.json`,
`content_check` per sheet), the other 108 in ten read-only `science-reviewer` batches (themes below). Each
reviewer reported only errors it confirmed with a source (URL + quote); the lead judged every finding
(some softened: a number without a solid source is removed rather than replaced) and implementer
agents applied them in all 14 locales with `apply.mjs`, following `fix-brief.md`.

| Batch | Missions | Spec |
|---|---|---|
| 1 | Mercury, Gemini | `batch1.json`, `batch1b.json` (suborbital event times) |
| 2 | Vostok, Voskhod, Soyuz 1/11, Shenzhou 1 | `batch2.json` |
| 3 | Apollo 1–17 (crewed), Skylab | `batch3.json` |
| 4 | Luna, Clementine, Lunar Prospector, SMART-1, LRO | `batch4.json` |
| 5 | Chandrayaan, Chang'e, SLIM, Beresheet | `batch5.json` |
| 6 | Artemis, Blue Moon, Inspiration4, Polaris Dawn, Starship, X-37B | `batch6.json` |
| 7 | Mariner 4/9, Mars 3, Viking 1, Pathfinder, Spirit, Opportunity, Phoenix, Schiaparelli | `batch7.json`, `batch7b.json`, `batch7c.json` |
| 8 | Curiosity, Mars Express, MAVEN, Mangalyaan, InSight, Hope, Perseverance, Tianwen-1, MMX | `batch8.json`, `batch8b.json` |
| 9 | NEAR, OSIRIS-REx, Hera, DART, Lucy, Hayabusa, Psyche, Europa Clipper | `batch9.json` |
| 10 | Mariner 10, MESSENGER, Huygens, Pioneer 11, Voyager 1, Parker, Solar Orbiter, Akatsuki, Magellan, Vega 1/2 | `batch10.json` |

About 175 confirmed findings. Cross-cutting repeats outside mission and fleet files: `slim-programs.mjs`
(JAXA programme page and SLIM descent profile), `finish.mjs` (Apollo 13 event times, SMART-1 /
Lunar Prospector / Clementine fleet, Luna 24 mass), `batch7b.json` (Opportunity site page).

## Done after the fact-check

- Artemis II: TLI is Orion's ESM burn (`flight.launch.departure: spacecraft`, 0.39 km/s in
  `totals` and `cislunar_profile.tli`); the launch act ends at separation, no ICPS TLI beat.
  The waypoints keep their shape (no high-Earth-orbit loop is modelled).
- Hera: arrival 2026-11-28 (ESA: November 2026, no day), `transit_days` 782.
  `hera-arrival.json` → `scripts/remap-event-dates.ts` (events, waypoints, overlay METs), then
  `hera-retarget.ts` re-solves the DSM-2 → Didymos leg, and `generate-fly-trajectory.ts hera`
  rebuilt `static/data/fly-trajectories/hera.json`.

## Round 2 — the "could not verify" items (2026-11-07)

Four read-only `science-reviewer` agents took the ~90 items the first round could not settle
(`unverified-brief.md`); the lead judged each (`round2-accepted.md`: sourced fixes accepted,
unsourced details dropped rather than replaced, a few overruled) and four implementer agents
applied them in all 14 locales: `round2-S.json` (early crewed flights), `round2-A.json` (Apollo,
Skylab), `round2-V.json` (Venus, Mars), `round2-D.json` (deep space, small bodies). The lead moved
the event METs (`round2-mets.json`: Curiosity's four TCMs, Mars Express TCM-1) and re-recorded 26
term keeps whose fields changed elsewhere (`round2-keeps.json`). `fleet-repeats.mjs` checks the
fleet files for wrong texts a mission fix replaced.

Also from this arc: `event-date-check` fixes (`event-dates.json`, `juice-venus.json`), Artemis II
(`artemis2-dv*.json`), Mangalyaan's end cause, Hera (`hera-*`), Galileo JOI.

## Open (not changed)

- Mariner 10 TCM burn durations and Δv: SP-424 could not be read; not changed.
- Europa Clipper's JOI Δv: no published figure found, so the number was removed.
- Chang'e 7 postponement: which agency announced it (AP says CMSA) is not settled; our text does
  not name one.
- Chang'e 6 TEI: sources give only "around June 21"; MET 48.6 (07:51 Beijing on the 21st) kept.
- Tianwen-1 orbiter "remains active": no dated 2026 source found.
- Mars Express TCM-2 to TCM-4 dates: no source; only TCM-1 was moved.
- Mercury capsule masses use different definitions (with/without escape tower); not unified.
