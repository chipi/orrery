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

## Open (not changed)

- Artemis II `total_dv_km_s` 6.5 and `delta_v` "~6.5 km/s (round trip)" have no source; a
  free-return from LEO needs ~3.1 km/s. Left until a source is found.
- Hera `interplanetary_profile.waypoints_helio_au` put the Mars flyby at r ≈ 0.95 AU (Mars is
  ~1.5); /fly does not draw them (it uses `fly-trajectories/hera.json`), so left as is.
- Inspiration4 base `departure_date` 2021-09-15 is the Florida date (launch 00:02 UTC on the 16th).
- Each reviewer's "could not verify" list (in the session transcript) was not acted on.
