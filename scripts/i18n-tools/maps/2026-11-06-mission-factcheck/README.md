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

## Open (not changed)

- Artemis II `/fly` numbers: `flight.totals.tli_or_tmi_dv_km_s` and `cislunar_profile` still model a
  3.05 km/s ICPS TLI; the real TLI was Orion's ESM, ~0.39 km/s, on flight day 2. Artemis IV's base
  text says "ICPS performs TLI" (the current plan was not verified).
- Inspiration4 base `departure_date` 2021-09-15 is the Florida date (launch 00:02 UTC on the 16th).
- Hera `arrival_date` 2026-12-28: ESA now says November 2026 without a day.
- Each reviewer's "could not verify" list (in the session transcript) was not acted on.
