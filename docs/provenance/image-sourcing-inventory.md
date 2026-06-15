# Image-sourcing inventory — 2026-06-15

Strict zero-image entries across every catalogued surface. Walks each entity through its primary image dir AND the runtime gallery loader's cross-surface fallback chain (`missions → mars-sites/moon-sites/fleet-galleries`, `mars-sites → missions/fleet-galleries`, etc.). Image-sharing across surfaces is preferred over duplication; this report respects that.

## Summary

**13 catalogue entries → 7 unique physical entities** (mission + fleet rows for the same asset count as one sourcing job).

| Surface | Catalogue entries | Of total |
|---|---|---|
| missions | 6 | of 112 |
| fleet | 6 | of 251 |
| moon-sites | 0 | of 27 |
| mars-sites | 0 | of 27 |
| earth-objects | 0 | of 31 |
| planets | 1 | of 9 |
| **TOTAL** | **13** | of 457 |

## The 7 unique entities

Sorted by sourcing difficulty (easiest first — anything that's already flown + returned data has public-domain imagery available).

| # | Entity | mission id | fleet id | Status | Available imagery |
|---|---|---|---|---|---|
| 1 | **Pluto** | — | — | Flown (planet, on /explore + planets.json) | New Horizons 2015 flyby imagery (NASA, public domain) — definitive Tombaugh Regio shot |
| 2 | **Hayabusa 1** (JAXA) | `hayabusa1` | `hayabusa` | Completed 2010 | Itokawa close-ups + spacecraft assembly photos (JAXA, public domain via NASA Photojournal) |
| 3 | **Solar Orbiter** (ESA) | `solar-orbiter` | `solar-orbiter` | Active since 2020 | ESA/NASA polar imaging, EUI close-up of the Sun, spacecraft renderings |
| 4 | **Parker Solar Probe** (NASA) | `parker-solar-probe` | `parker-solar-probe` | Active since 2018 | WISPR corona imagery from multiple perihelion passes (NASA/Johns Hopkins APL) |
| 5 | **Lucy** (NASA) | `lucy` | `lucy` | Active; Dinkinesh flyby 2023 | Dinkinesh asteroid binary photo (Nov 2023) + spacecraft photos + mission art |
| 6 | **Psyche** (NASA) | `psyche-mission` | `psyche-spacecraft` | Active (cruise, arrival 2029) | Pre-launch integration + Hall-effect thruster firings + asteroid concept art |
| 7 | **Europa Clipper** (NASA) | `europa-clipper` | `europa-clipper` | Active (cruise, arrival 2030) | Pre-launch assembly (Cape Canaveral 2024) + spacecraft renderings + Europa context |

## Why the current `validate-hero-coverage.ts` doesn't catch all of these

The validator's MISSIONS_KNOWN_GAPS + FLEET_KNOWN_GAPS sets enumerate 12 of the 13 entries above; the 13th is **Pluto** on the `planets` surface, which the validator simply doesn't iterate. Phase 21 fix: add `planets` to the `SURFACES` list with its own `PLANETS_KNOWN_GAPS` set (Pluto if we're keeping it deferred; empty if we source it).

## Sourcing pattern (per AGENTS.md § Image pipeline)

For each entity above:

1. **Agency-first fetch** via the existing pattern in `scripts/fetch-spacecraft-images.mjs` / `fetch-tier-*-images.mjs`. NASA APIs (`images.nasa.gov`, NASA Photojournal) for NASA + Johns Hopkins APL missions; ESA portal for Solar Orbiter; JAXA archive for Hayabusa 1.
2. **Wikimedia Commons fallback** (`Special:FilePath` + search API) per the #5 Phase 4 pattern that sourced 57 of 58 previous gaps.
3. **Sidecar entry** in the relevant manifest:
   - `static/data/mission-image-sources.json` for `<id>/<slot>` (no ext)
   - `static/data/fleet-image-sources.json` for `<id>/<slot>.jpg`
   - `static/data/panel-image-sources.json` for `<surface>/<id>/<slot>` (planet panels)
4. **Variant build** — 1x1 only per the post-#5 image-pipeline v2 (4x3 / 16x9 are dead code).
5. **Hash + provenance** — `npm run build:image-provenance` regenerates `image-provenance.json` (must be ✓ before commit).
6. **Verify** — `npx tsx scripts/validate-hero-coverage.ts` must show zero unexpected gaps.

## What NOT to touch

Per Marko's directive 2026-06-15: **incremental, no old images modified**. Sourcing for the 7 entities above is purely additive — new files in their existing-but-empty directories. No re-sourcing of any entity that already has imagery.

## Status

- **Phase 21** (this report): inventory + validator surface for `planets`.
- **Phase 22+** (deferred): per-entity sourcing PRs, one entity per commit per the established pattern.

---

*image-sourcing-inventory.md · Orrery · 2026-06-15 · supersedes the implicit "known-gaps" assumption in `validate-hero-coverage.ts`*
