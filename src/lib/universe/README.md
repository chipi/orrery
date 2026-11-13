# src/lib/universe — module map

The "Known Universe" half of `/explore`: everything outside the solar-system scene. Consumed by `$lib/three/explore-scene-host.ts` (dynamic-imports the heavy scenes), `$lib/explore/scale-shell-controller.ts`, the `StarPanel` / `StarPortrait` / `ScaleIndex` / `ConstellationFinder` / `HrDiagram` / `MassPeriodChart` / `CausalityMap` components, and `routes/dev/local-group`, `routes/dev/universe-anchor`.

- **Scale spine** — `context-graph.ts`: the stack of nested contexts (solar-system, neighborhood, milky-way, local-group, local-sheet, virgo, laniakea, cosmic-web), each with its own units and origin; `rebaseDistance` re-bases the camera across a boundary, with a hysteresis band at the seam. `scale-readout.ts` turns a camera distance into km / AU / ly / pc text.
- **Star field** — `point-field.ts` (WebGL `THREE.Points`), `star-selection.ts` (pure LOD + packing), `budget.ts` (point budget from the quality tier), `star-normalize.ts` (HYG row to record; shared with `scripts/build-universe-stars.ts`), `bv-to-rgb.ts`, `neighborhood-scene.ts` (the pc-unit context scene).
- **Star UI math** — `anonymous-star.ts`, `star-portrait.ts`, `constellation-finder.ts`, `iau-constellations.ts` (code to English name; `isZodiacConstellation`, the thirteen the ecliptic crosses), `property-space.ts` (HR projection), `causality.ts` (light-cone shells).
- **Scale readout and bar** — `scale-readout.ts` (pure, tested: the distance ladder km, AU, ly, pc and the light-travel time), `scale-bar.ts` (pure, tested: `fixedScaleBar`, `scaleBarWidth` 120 px / 64 px under 600 px, `formatBarValue` to three significant digits, `worldsBarQuantity`; one rule for the Explore strip and both Worlds bars, UXD-021).
- **Pins, rings, labels** — `scene-pins.ts` (pure, tested: the 12 px label and 44 px ring constants, `viewDepth` (view-space depth, what sprites are sized by), `screenPxToWorld`, `labelOffset`, `liftOnScreen` (lift along screen-up), `placeLabels`, `labelRect`, ring state, the light-year ramp, the e2e probe snapshot, measured from projected points by `projectedPx`) and `scene-pin-sprites.ts` (canvas builders: `radialTexture`, `labelSprite`, `ringTexture`, `createRing`). Every pin scene below takes its labels, rings and placement from these two; write none locally (UXD-020). A second consumer: `three/iconic-trajectory.ts` sizes, lifts, places and measures the iconic-mission boxes with `viewDepth`, `worldPerPx`, `liftOnScreen`, `labelRect`, `placeLabels` and `projectedPx` (UXD-026, C7).
- **Schematic shells** — `milky-way-`, `local-group-`, `local-sheet-`, `virgo-`, `laniakea-`, `cosmic-web-scene.ts`; also `body-scene.ts` (exoplanet mini-orrery), `deep-sky-scene.ts`, `black-hole-scene.ts`.

## Conventions

- `*-scene.ts` is the WebGL builder; its maths lives in a pure sibling (`milky-way-visual`, `deep-sky-visual` + `deep-sky-lod`, `black-hole-visual`) so it tests without a GPU. Builders are coverage-excluded per TA.md; pure modules are counted.
- Units: neighborhood 1 scene unit = 1 pc; solar-system 1 unit = 1 AU (`AU_PER_PARSEC = 206265`).
- Star colour comes from catalogued B-V, never authored (RFC-032 C-G). Shells beyond the Neighborhood are schematic and NOT to scale (PRD-030 principle 2); keep them labelled.

Pointers: TA.md §"/explore v2 — The Known Universe" · PRD-030 · RFC-032 · RFC-039 · UXS-014.
