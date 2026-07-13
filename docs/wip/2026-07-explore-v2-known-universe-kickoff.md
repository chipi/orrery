# /explore v2 — The Known Universe · epic kickoff handover

*Written 2026-07 at epic kickoff, after brainstorm + approved map. This is the pick-up doc.*

## What this epic is

Extend `/explore` from the solar system to the known universe, **in place** — same route, v1 (solar system) untouched, v2 is the zoom-*out* that wraps it. Curated, scientifically honest, culture-bridged. Explore-only (no AR this epic).

## The contract (three docs, all Draft)

- **PRD-030** — product: vision, pillars, roadmap, locked decisions, non-goals.
- **RFC-032** — architecture: nested-context/scale-shell engine, scalable render vocabulary (instanced points + impostors + device budget), warp, lenses, data pipeline. Per-slice technical contracts in §7.
- **UXS-014** — interaction: zoom-vs-warp, the boundary-crossing choreography, breadcrumb/orientation, selection, lens UX, discovery, responsive/a11y. Signature moments get a prototype before build.

## Decisions locked at kickoff

1. Continuous zoom reaches the Stellar Neighborhood; warp beyond.
2. Curated exoplanet hero set ≈ 25–30.
3. v2.0 (first ship) = slices 0–3; Milky Way + physics lenses = v2.1/2.2.
4. Culture layer = optional overlay first.
5. Mobile = graceful tiers via the device budget; core journey everywhere.
6. Working name "The Known Universe."

## Slice plan (one direction)

- **A** — S0 boundary crossing (context engine + PointField + budget + Sun→dot handoff) · S1 stars-as-objects.
- **B** — S2 exoplanet mini-orreries (warp) · S3 exoplanet /science + culture v1.
- **C** — S4 deep-sky + gallery bridge · S5 Milky Way context.
- **D** — S6 black holes + curvature/time lenses · S7 property-space lenses (flyable HR diagram).
- **E** — S8+ Local Group + message objects + grand tour.

## Where Slice 0 starts (next implementation step)

Goal: **zoom out of the solar system → the Sun collapses to a dot → the real HYG nearby-star field fades in**, spectral-colored, budget-scaled, at ≥30 fps mid-tier mobile.

First moves:
1. **Data**: fetch + normalize the HYG catalog → tiled JSON under `static/data/universe/stars/` (build script, provenance, schema-validated — mirrors the existing data pipeline). Precompute B−V → RGB.
2. **Engine**: `src/lib/universe/context-graph.ts` (`Context` interface + `ContextGraph`) + `src/lib/universe/point-field.ts` (instanced `THREE.Points` + spectral-color shader + magnitude LOD) + budget hook off `detect-gpu`.
3. **Boundary**: wire the SolarSystem→Neighborhood handoff into `/explore`'s existing camera/zoom — lazy dynamic-import so v1 is untouched until you cross out.
4. **Visual anchor**: prototype the boundary-crossing moment (screenshot/mock) and gate on approval before polishing.

Pure math (spectral color, context re-basing, LOD selection) is unit-testable and **not** coverage-excluded (it's `$lib/universe`, not `$lib/ar`) — plan tests from the start to keep the functions≥82% gate happy.

## Open / to-do at kickoff

- **GH tracking epic issue** — not yet created (awaiting go); RFC-032/PRD-030 reference `#TBD`. Sub-issues per slice under it.
- **TA.md §explore v2 entry** — add only as slices ship (TA.md documents shipped reality).
- The Lavish map (`.lavish/explore-v2-known-universe.html`) is the visual version of PRD-030 — scratch, not committed.
