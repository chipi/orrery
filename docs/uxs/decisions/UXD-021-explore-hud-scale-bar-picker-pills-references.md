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
   Worlds, through `distanceWithUnit`, no new key). The strip box is a fixed 232 px wide (190 px under 600 px, the
   bar's own breakpoint), so it no longer resizes with its text. Beside the bar the box cannot hold the longest
   label (232 - 24 padding and border - 120 bar - 7 gap = 81 px; de "1.230 Lichtjahre" is about 108 px), so
   in the strip the label sits under the bar (`ScaleBar` `stacked`): the box width stays fixed, the strip is one
   line taller, and the Worlds bars keep the label beside the bar. `niceScaleBar` and the two Worlds rounding
   blocks are deleted.
2. **The schematic scales draw no bar.** Milky Way to Cosmic web are not to scale; they keep the schematic note
   and the Learn-more link. UXS-016's "kpc scale bar" line is corrected.
3. **The level picker's ladder stays on screen.** `ExploreScalePicker` takes `align`; the scale navigator passes
   `right` at the solar system, where it is flush right, so the ladder opens leftward from the chip's right edge;
   `max-inline-size: calc(100vw - 16px)` caps its width and, when it opens, its position is clamped to
   [8 px, viewport - 8 px] from the chip's measured rect (a width cap alone left it 23 px past the right edge in
   `ar` at 393 px), in either direction. The offsets are physical (`left` / `right`), not logical: the
   navigator's flush-right is `right: 8px` in every direction, so in RTL a logical `end` would put the ladder past
   the edge it must avoid (in `ar` the picker is the rightmost item and Reset is to its left). At the other seven scales the navigator is flush left and the ladder keeps `left: 0`.
4. **The row clears a docked side panel.** With a drawer docked at the right edge (desktop, touch landscape) the
   flush-right row sits left of it: its right offset is the drawer's width plus the 8 px gutter. The width is the
   measurement the panel-aware framing already makes each time a panel opens or closes (`panelCoverPx`, now
   published to the page as `bridge.panelCoverPx`), not a second measurement. The scale strip takes the same
   offset (right = 12 px + the cover): with a drawer docked it sits left of it, not under it. A bottom sheet (touch
   portrait) covers the scene and moves nothing. The z-index stays 8 / 46: raising it would cover the panel bar's
   Share and ×. The Explore HUD row (z 45, top left) takes the worlds' "stop before the panel" rule
   (`hud-beside-panel`): its `max-width` stops 12 px before the navigator's measured left edge (cover + 8 + the
   navigator's width), so the row wraps there and the two rows never intersect.
5. **One RESET VIEW per scale, always rendered, disabled while inert.** At the seven outer scales it is the
   navigator's, next to the picker: disabled while the scale has nothing to reset (the A4 disabled look), so the
   row never shifts when you select; it runs C1's functions, and the neighbourhood's is also enabled while the Sun
   is out of frame. At the solar system it is the HUD row's RESET VIEW at the top left (A5, UXD-015), enabled by a
   selection of any kind (`resetSolarView`); the navigator draws none there, so there are never two on screen.
6. **Direction pills show only for their owner.** The pills are hidden at load. ʻOumuamua's "← Vega" shows while the
   body is hovered or selected; a heading craft's "→ star" shows while its path is highlighted (hover or selection,
   the same `setHighlight`). The arrows stay. A named star takes its name from the overlay the star panel reads
   (`getNamedStarI18n`: Vega is Wega in `de`, Вега in `ru`, ベガ in `ja`); a catalogue-only star (Gliese 445,
   Ross 248, Lambda Aquilae) keeps its data name. Four craft carry a heading star (New Horizons has none), so
   there are five pills, not six.
7. **The REFERENCES overlay is a canvas of bodies and a DOM grid of names.** `SizesCanvas` draws only the eight
   bodies, true relative size, common baseline, size order (no labels, leader lines, header or source line).
   `SizesOverlay` lists them in a grid under it, in the same left-to-right order (eight columns on the 640 px card,
   4 × 2 under 620 px): a swatch in the planet's colour, the name in the viewer's language (`planetName`,
   `lab_body_*`), the diameter in the page locale with `distanceWithUnit(…, 'km')`; the open planet's cell is
   marked; hover, focus or a tap on a cell rings its body in the canvas (a cell is a button, `.sizes-cell`, on the A4
   allow-list). The heading (`sizes_header`) is above the canvas and the source line (`sizes_source`) under the grid.
   The listed diameters are the mean diameters of `planet-stats.ts` (the table the planet panel and the Tactical
   Scan read), so Mars, Jupiter and Saturn read the same everywhere (the old strings were the radii under a
   "diameters" heading). A name never breaks mid-word from 360 px up: the longest (nl MERCURIUS, 9 letters) is
   9 x 6.73 = 60.6 px in Space Mono 11 px, 58.6 px with -0.02 em tracking, in a cell text box of 61 px (4 columns
   at 360 px) to 65 px (8 columns at the 620 px breakpoint, which replaces 560 px for that reason); under 360 px
   the word may break rather than overflow. A focused cell shows the chip focus outline (2 px `--color-focus`).
   Hand fixes in the three locales whose heading or source line was wrong or partial: `ar` (heading and source),
   `ja` (source said "distance"), `ko` (source said "소스").

## Consequences

The bar's label reads a value like `13.7 AU` instead of `10 AU`, so the label changes with every wheel step (it
re-renders per frame while zooming, a text node). A round number at a fixed width is no longer possible (stated
in the brief's Q1). The Explore strip is 28 px narrower than its old maximum of 260 and, with the label under the bar, one line taller.
At the solar system the navigator is one chip shorter (no Reset), which also removes the extra chip from the phone's
top-right row. The drawer clearance (navigator, strip, HUD row) reads the measurement that is taken in the 400 ms
after a panel opens, closes, or the window resizes. That measurement runs every frame while the drawer's 220 ms
fly-in plays, so the cleared items follow the drawer's edge frame by frame during the fly-in and have no
transition of their own (not a single move after the measure settles; a CSS transition on top of a per-frame
value would lag it). Wherever the HUD row's `max-width` shrinks, the layer chips wrap onto another line sooner than before.

Follow-up (operator, 2026-11-12, iPhone): the strip's lifts are for the time dock, so they apply only at the solar system; at the other scales the strip sits at the bottom (12 px on touch, 46 px above the footer otherwise). The fixed 232 px box overlapped the dock's right end at 800 px wide, so the 104 px lift now starts under 900 px. On touch the time dock starts at the left edge: the desktop offset beside the REFERENCES card (hidden on touch) pushed it over the drawer's tab row in landscape; under 720 px the tabs are tighter so the dock and the three tabs share one line on a 667 px phone.

The touch top-left cluster (`hud-top-mobile`) takes the same clearance and wraps (2026-11-12: fr "RÉINITIALISER LA VUE" at 360 px ran under the picker; e2e at 360 px in fr, de, ru). Not covered: that cluster with a docked drawer on a touch landscape device (it
the clearance includes the drawer cover, but no test runs it there); the orbit ruler (C4); the REFERENCES chip in the time
dock (A4); the breadcrumb and picker redesign (C8); the encounter labels of the iconic paths (done in C7, [UXD-026](UXD-026-iconic-missions-legend-and-milestone-boxes.md)).

## Verification

Unit: `src/lib/universe/scale-bar.test.ts` (same width at five distances, three significant digits in `en-US`, `de`
and `ru`, widths 120 and 64, the Worlds km and m split), `scale-readout.test.ts` (the `niceScaleBar` cases removed),
`src/lib/explore/planet-sizes.test.ts` (eight planets in size order, every diameter equal to the planet-stats
mean diameter, a name for each planet in all 14 locales of at most 9 letters, not English in the non-Latin
locales), `src/lib/explore/format.test.ts` (`distanceWithUnit` for every unit incl. `m`, in `ru` and `ar` too). E2: `tests/e2e/explore-hud.spec.ts` on all three projects,
nothing skipped (bar width and strip box at four wheel steps; the Worlds 3D and flat-patch bars; the ladder inside
the viewport at 1100, 1280 and 1440 px in `en`, `de`, `ru`, `ar`; the picker is the hit target with `?id=mars`
open and a rung changes scale; the ladder inside [8, viewport - 8] for `ru`, `fr`, `ar` at 393 and 360 px; the
strip label inside the box in `en`, `de`, `hi`, `ar` at 1280, 700 and 390 px and the strip left of a docked panel;
the HUD row and the navigator never intersect with a panel open at 1100 and 1280 px; exactly one Reset on screen
per scale, in its slot at all eight scales; the pills; the overlay grid, `de`, `ru`, `ar`,
`ja`). The slice's check script (`docs/wip/2026-11-12-slice-C3-brief.md` §6) prints `C3-CHECK violations: 0`.
