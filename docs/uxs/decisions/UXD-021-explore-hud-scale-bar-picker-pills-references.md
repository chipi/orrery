# UXD-021 — /explore HUD: one fixed-width scale bar, a picker that stays on screen, pills for their owner, an aligned REFERENCES grid, Reset always in its slot

- **Status**: accepted (built; the e2e run and the shots are the lead's to run, see Verification)
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — every open question of `docs/wip/2026-11-12-slice-C3-brief.md` §11
  approved as recommended
- **Answers**: E4, SS1, SS2, SS3 of the UX feedback plan; slice C3
- **Builds on**: [UXD-019](UXD-019-select-equals-focus.md) (C1: the four outer Resets, `selectedSmallBodyId`;
  C3 replaces "the outer-scale Reset appears after a selection" with "Reset is always drawn"),
  [UXD-014](UXD-014-one-chip-and-filter.md) / [UXD-015](UXD-015-flat-chip-row.md) (a HUD action that mounts and
  unmounts shifts the row: it is always rendered and disabled when inert), [UXD-018](UXD-018-panel-shell-and-actions.md)
  (the 400 px drawer the row clears), [UXD-017](UXD-017-one-index-on-every-scale.md) (the INDEX handle, and the
  ladder's z-index of 46), [UXD-002](UXD-002-type-scale-and-the-11px-floor.md) (11 px floor; the overlay's labels
  move from the canvas to DOM tokens), [UXD-020](UXD-020-explore-readability-pins-rings-labels.md) (pins and
  rings; the direction pills are not pin labels)
- **Changes**: `src/lib/universe/scale-bar.ts` and `src/lib/components/ScaleBar.svelte` (new, with the test),
  `scale-readout.ts` (`niceScaleBar` removed), `src/routes/explore/ScaleStrip.svelte`,
  `src/lib/surface-scene/SurfaceScene.svelte`, `SurfaceFlatPatch.svelte`, `src/lib/explore/format.ts`
  (`distanceWithUnit` knows `m`; `planetName`), `ExploreScalePicker.svelte`, `src/routes/explore/ScaleNav.svelte`,
  `+page.svelte` (`solarHasSelection`, `resetSolarView`, `scaleResetEnabled`, `panelCoverPx`),
  `explore-scene-host.ts` (the bar, `panelCoverPx`, the pills), `explore-solar-scene.ts`, `iconic-trajectory.ts`,
  `src/lib/explore/planet-sizes.ts` (new), `SizesCanvas.svelte`, `SizesOverlay.svelte`, `messages/{ar,ja,ko}.json`,
  `tests/e2e/explore-hud.spec.ts` (new), `tests/e2e/chip.spec.ts` (allow-list); [UXS-014](../UXS-014.md),
  [UXS-016](../UXS-016.md), `docs/concept/05_Design_System.md` (§5.15), `docs/uxs/IA.md`, `AGENTS.md`, `docs/adr/TA.md`

## Context

The lower-right bar was a round-number length drawn at whatever pixel width that length had: 52 to 130 px as you
zoomed, and the box around it resized with its text. The two Worlds bars did the same with their own code (63 to
157 px, 60 to 120 px). At the solar system the scale navigator is flush right and the picker's ladder was anchored
left under its chip, so the ladder ran past the screen edge in all 14 locales (6 to 72 px by arithmetic). With any
side panel open the navigator sat under the panel (z 30), so the user could not change scale. The Vega pill was an
unexplained rounded border on the first screen. The REFERENCES overlay staggered two-line labels onto up to three
extra rows under bodies 2 to 6 px wide, in English in every locale, and its "diameters" were the radii.
Evidence: the brief's §0 to §3.

## Decision

1. **One fixed-width scale bar.** The bar is 120 px wide (64 px under 600 px wide), with end ticks, at every zoom;
   the value beside it follows the zoom, to three significant digits in the page locale (`1.37`, `13,7`, `137`),
   not a round number. One module (`scale-bar.ts`: `fixedScaleBar`, `scaleBarWidth`, `formatBarValue`,
   `worldsBarQuantity`) and one component (`ScaleBar.svelte`) serve the Explore strip and both Worlds bars; the
   unit comes from the existing ladders (`describeDistanceAu` for Explore; km from 1 km and metres below for the
   Worlds, through `distanceWithUnit`, no new key). The strip box is a fixed 232 px wide (190 px under 768 px), so it
   no longer resizes with its text. `niceScaleBar` and the two Worlds rounding blocks are deleted.
2. **The schematic scales draw no bar.** Milky Way to Cosmic web are not to scale; they keep the schematic note
   and the Learn-more link. UXS-016's "kpc scale bar" line is corrected.
3. **The level picker's ladder stays on screen.** `ExploreScalePicker` takes `align`; the scale navigator passes
   `right` at the solar system, where it is flush right, so the ladder opens leftward from the chip's right edge;
   `max-inline-size: calc(100vw - 16px)` clamps it. The offsets are physical (`left` / `right`), not logical: the
   navigator's flush-right is `right: 8px` in every direction, so in RTL a logical `end` would put the ladder past
   the edge it must avoid (in `ar` the picker is the rightmost item and Reset is to its left). At the other seven scales the navigator is flush left and the ladder keeps `left: 0`.
4. **The row clears a docked side panel.** With a drawer docked at the right edge (desktop, touch landscape) the
   flush-right row sits left of it: its right offset is the drawer's width plus the 8 px gutter. The width is the
   measurement the panel-aware framing already makes each time a panel opens or closes (`panelCoverPx`, now
   published to the page as `bridge.panelCoverPx`), not a second measurement. A bottom sheet (touch portrait) covers
   the scene and moves nothing. The z-index stays 8 / 46: raising it would cover the panel bar's Share and ×.
5. **Reset is always in its slot, at all eight scales.** Always rendered next to the picker, disabled while the
   scale has nothing to reset (the A4 disabled look), so the row never shifts when you select. It runs the same
   reset as before at the seven outer scales (C1's functions); at the solar system it runs the same
   `resetSolarView` as the HUD's RESET VIEW, and is enabled by the same condition (a selection of any kind).
   The neighbourhood's is also enabled while the Sun is out of frame.
6. **Direction pills show only for their owner.** The pills are hidden at load. ʻOumuamua's "← Vega" shows while the
   body is hovered or selected; a heading craft's "→ star" shows while its path is highlighted (hover or selection,
   the same `setHighlight`). The arrows stay. A named star takes its name from the overlay the star panel reads
   (`getNamedStarI18n`: Vega is Wega in `de`, Вега in `ru`, ベガ in `ja`); a catalogue-only star (Gliese 445,
   Ross 248, Lambda Aquilae) keeps its data name. Four craft carry a heading star (New Horizons has none), so
   there are five pills, not six.
7. **The REFERENCES overlay is a canvas of bodies and a DOM grid of names.** `SizesCanvas` draws only the eight
   bodies, true relative size, common baseline, size order (no labels, leader lines, header or source line).
   `SizesOverlay` lists them in a grid under it, in the same left-to-right order (eight columns on the 640 px card,
   4 × 2 under 560 px): a swatch in the planet's colour, the name in the viewer's language (`planetName`,
   `lab_body_*`), the diameter in the page locale with `distanceWithUnit(…, 'km')`; the open planet's cell is
   marked; hover, focus or a tap on a cell rings its body in the canvas (a cell is a button, `.sizes-cell`, on the A4
   allow-list). The heading (`sizes_header`) is above the canvas and the source line (`sizes_source`) under the grid.
   The listed diameters are twice the IAU mean radius (the old strings were the radii under a "diameters" heading).
   Hand fixes in the three locales whose heading or source line was wrong or partial: `ar` (heading and source),
   `ja` (source said "distance"), `ko` (source said "소스").

## Consequences

The bar's label reads a value like `13.7 AU` instead of `10 AU`, so the label changes with every wheel step (it
re-renders per frame while zooming, a text node). A round number at a fixed width is no longer possible (stated
in the brief's Q1). The Explore strip is 28 px narrower than its old maximum of 260. At the solar system there are now two
Reset chips on screen (the HUD's RESET VIEW at the top left, the navigator's at the top right): both run the same
function. On a phone the top-right row is one chip wider; whether it meets the top-left cluster at 390 px has not
been seen. The drawer clearance reads the measurement that is taken in the 400 ms after a panel opens, closes, or the
window resizes, so the row moves with that delay (no animation).

Not covered: the strip under a docked panel on desktop (the strip is `right: 12px`, z 6, under the 400 px drawer;
the Worlds bar has a `beside-panel` rule, Explore's does not); the orbit ruler (C4); the REFERENCES chip in the time
dock (A4); the breadcrumb and picker redesign (C8); the encounter labels of the iconic paths (C7).

## Verification

Unit: `src/lib/universe/scale-bar.test.ts` (same width at five distances, three significant digits in `en-US`, `de`
and `ru`, widths 120 and 64, the Worlds km and m split), `scale-readout.test.ts` (the `niceScaleBar` cases removed),
`src/lib/explore/planet-sizes.test.ts` (eight planets in size order, the Earth diameter, a name for each planet in
all 14 locales, not English in the non-Latin locales). E2: `tests/e2e/explore-hud.spec.ts` on all three projects,
nothing skipped (bar width and strip box at four wheel steps; the Worlds 3D and flat-patch bars; the ladder inside
the viewport at 1100, 1280 and 1440 px in `en`, `de`, `ru`, `ar`; the picker is the hit target with `?id=mars`
open and a rung changes scale; Reset in its slot at all eight scales; the pills; the overlay grid, `de`, `ru`, `ar`,
`ja`). The slice's check script (`docs/wip/2026-11-12-slice-C3-brief.md` §6) prints `C3-CHECK violations: 0`.
