# src/lib/universe — module map

The "Known Universe" half of `/explore`: everything outside the solar-system scene. Consumed by `$lib/three/explore-scene-host.ts` (dynamic-imports the heavy scenes), `$lib/explore/scale-shell-controller.ts`, the `StarPanel` / `StarPortrait` / `StarIndex` / `ConstellationFinder` / `HrDiagram` / `MassPeriodChart` / `CausalityMap` components, and `routes/dev/local-group`, `routes/dev/universe-anchor`.

- **Scale spine** — `context-graph.ts`: the stack of nested contexts (solar-system, neighborhood, milky-way, local-group, local-sheet, virgo, laniakea, cosmic-web), each with its own units and origin; `rebaseDistance` re-bases the camera across a boundary, with a hysteresis band at the seam. `scale-readout.ts` turns a camera distance into km / AU / ly / pc text.
- **Star field** — `point-field.ts` (WebGL `THREE.Points`), `star-selection.ts` (pure LOD + packing), `budget.ts` (point budget from the quality tier), `star-normalize.ts` (HYG row to record; shared with `scripts/build-universe-stars.ts`), `bv-to-rgb.ts`, `neighborhood-scene.ts` (the pc-unit context scene).
- **Star UI math** — `anonymous-star.ts`, `star-portrait.ts`, `constellation-finder.ts`, `iau-constellations.ts` (code to English name), `property-space.ts` (HR projection), `causality.ts` (light-cone shells).
- **Schematic shells** — `milky-way-`, `local-group-`, `local-sheet-`, `virgo-`, `laniakea-`, `cosmic-web-scene.ts`; also `body-scene.ts` (exoplanet mini-orrery), `deep-sky-scene.ts`, `black-hole-scene.ts`.

## Conventions

- `*-scene.ts` is the WebGL builder; its maths lives in a pure sibling (`milky-way-visual`, `deep-sky-visual` + `deep-sky-lod`, `black-hole-visual`) so it tests without a GPU. Builders are coverage-excluded per TA.md; pure modules are counted.
- Units: neighborhood 1 scene unit = 1 pc; solar-system 1 unit = 1 AU (`AU_PER_PARSEC = 206265`).
- Star colour comes from catalogued B-V, never authored (RFC-032 C-G). Shells beyond the Neighborhood are schematic and NOT to scale (PRD-030 principle 2); keep them labelled.

Pointers: TA.md §"/explore v2 — The Known Universe" · PRD-030 · RFC-032 · RFC-039 · UXS-014.
