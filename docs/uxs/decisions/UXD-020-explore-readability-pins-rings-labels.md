# UXD-020 — /explore readability: one 12 px label, one ring, one placement pass

- **Status**: accepted (built; the E2 probe table and the shots are the lead's to run, see Verification)
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — every open question of
  `docs/wip/2026-11-12-slice-C2-brief.md` §11 approved as recommended
- **Answers**: E2, SN1, MW1, MW2, MW4, MW6 of the UX feedback plan; slice C2
- **Builds on**: [UXD-019](UXD-019-select-equals-focus.md) (C1: the selection state and the ring for every
  kind in the solar scene; C2 does not re-implement it), [UXD-002](UXD-002-type-scale-and-the-11px-floor.md)
  (the 11 px floor; ends its "3D sprite labels are slice C2" deferral), [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md)
  (no teal or cyan in rings and states), [UXD-004](UXD-004-one-outputpass-per-composer.md) (the look after
  the OutputPass is accepted; global exposure is not changed here)
- **Changes**: `src/lib/universe/scene-pins.ts` (new, with its test), `scene-pin-sprites.ts` (new),
  the seven pin scenes (`neighborhood-`, `milky-way-`, `local-group-`, `local-sheet-`, `virgo-`, `laniakea-`,
  `cosmic-web-scene.ts`) and `deep-sky-scene.ts`, `src/lib/three/explore-scene-host.ts` (the hover ring, the
  2D text, the probes, the viewport height passed to every `update`), `explore-solar-scene.ts` (hover ring,
  element lifts), `scripts/readability-probe.mjs` and `scripts/lib/readability-contrast.mjs` (new),
  `tests/e2e/explore-readability.spec.ts` (new); [UXS-014](../UXS-014.md), [UXS-016](../UXS-016.md),
  `docs/adr/TA.md`, `AGENTS.md`, [UXD-002](UXD-002-type-scale-and-the-11px-floor.md), `src/lib/universe/README.md`,
  `scripts/README.md`

## Context

The labels were too big where they overlapped and too small where they did not: the Milky Way's were 16.8 px
at a 768 px viewport, the neighbourhood's 9.7 px (below the floor). Eleven Milky Way labels, and 2 to 5 at
every outer scale, were placed with no overlap pass (only the neighbourhood had one). A hovered galaxy's
label jumped, because five scenes put the label above the hover-grown glow. The arm labels were pickable and
never showed it. The "you are here" ring was a different size and behaviour at each scale (screen-constant at
five, world-scaled at the Local Group, gold at the neighbourhood) and teal at six. The light-year rings were
1 px lines at opacity 0.2 in four hues, with a literal "ly" and a label that collided with a star name.
Evidence: the brief's §0 to §3.

## Decision

1. **One label size.** Text is 12 px (`--size-meta`) in CSS pixels at every scale and viewport; the sprite is
   sized in pixels from the distance, the field of view and the viewport height (`screenPxToWorld`), not as a
   fraction of the distance. The 2D view's canvas text is 11 px (the floor) at every zoom, with alphas of 0.58 or
   more. `scene-pins.ts` holds the constants and the maths.
2. **One ring.** A thin annulus, 44 px across, 1.5 px stroke, screen-constant, on every pin of the seven
   scenes, on the deep-sky glints and on the label point of every Milky Way arm. Hover and selection show it at
   full opacity in `#889fe7` (`--color-state`). The anchor ring ("you are here": the Sun, the Milky Way in the
   Local Group, the Local Group in the Local Sheet and Virgo, the Virgo Supercluster in Laniakea, Laniakea in
   the Cosmic web, Sol in the neighbourhood) is gold `#ffcf8f` at all seven levels and stays up at opacity 0.55;
   hovering or selecting it makes it full. Scene code cannot read a CSS variable: the blue is a literal that
   mirrors the token (`RING_BLUE`, as `HOVER_BLUE` in `surface-markers.ts` does). The solar scene's selection
   ring (C1) is the same blue; the planet or small body under the cursor gets the same outline, dimmer.
3. **One placement pass** (`placeLabels`, pure, in `scene-pins.ts`, moved out of the neighbourhood). Each frame
   the candidate labels are placed in priority order; one that overlaps a placed label is hidden and returns
   when space frees. Hovered and selected labels are always shown and placed first. Priority: hovered/selected,
   the anchor, headliners, the rest; the Milky Way's order is the Sun, Sagittarius A*, the headliner globulars,
   the Magellanic Clouds, the arms; the neighbourhood's light-year ring labels come last. A hidden arm label is not
   a pick target either.
4. **A steady label offset.** The label sits above the pin by the STEADY glow size and the ring (`labelOffset`),
   never the hover-grown one; hovering does not move it (MW2, also the deep-sky glint, whose label is no longer a
   child of the scaled glint).
5. **Light-year rings** are four `Line2` lines of 2 px at opacity 0.55 on a ramp from `#889fe7` to white, with
   the localised unit (`m.unit_ly_value`, 14 locales, no new key) and a dark halo behind the text, in the
   placement pass at the lowest priority.
6. **No teal in rings, anchor glows or labels.** The anchor glows of the four shell scenes are neutral blue-white;
   the Milky Way Sun and the Local Group headliner labels are the neutral label colour; the Milky Way lens labels
   and rotation-curve rings take the neutral blue-white and `#889fe7`. The galaxy glows by kind keep their
   colours (data colours, `a3-keep`).
7. **E2 is measured, then lifted by element, never by exposure.** A probe screenshots each level and measures
   the WCAG contrast of the rendered pixels of the orbit lines, belts and rings (target 3:1) and again under a
   12 % white veil (target 2:1). Global exposure (1.15) and the hemisphere light are not touched. Lifted, as
   starting values to be confirmed by the probe: planet orbit lines 0.25 to 0.4, small-body orbits 0.22 to 0.35,
   the belts 0.5 / 0.4 to 0.65 / 0.55.

## Consequences

Names are shorter on screen at the outer scales (12 px against 14 to 20 px) and longer at the neighbourhood
(12 px against 9.7 px); the pass hides the ones that collide, so a crowded view shows fewer names and the
rest reveal on hover. Every pin is now a pick target with a 44 px ring, and the arms are highlighted like the
pins. The 2D view's labels lost their world scale: they do not grow with the zoom and they take part in the pass.
Not covered: the lens overlay labels of the Milky Way (world-sized teaching text), `iconic-trajectory` labels
(C7), the Worlds' site tags, `fly-frame-runner.ts` and `three-label.ts` (not measured against the floor), the
ruler (C4), the solar scene's own sprite labels in `explore-scene-host.ts`.

## Verification

Unit: `src/lib/universe/scene-pins.test.ts` (placement, offset, ring state, px-to-world, ramp),
`neighborhood-labels.test.ts`, `scripts/lib/readability-contrast.test.ts`. E2:
`tests/e2e/explore-readability.spec.ts`. The probe: `node scripts/readability-probe.mjs --base=<url>` on HEAD
before and after. The slice's check script (`docs/wip/2026-11-12-slice-C2-brief.md` §6) prints
`C2-CHECK violations: 0`.
