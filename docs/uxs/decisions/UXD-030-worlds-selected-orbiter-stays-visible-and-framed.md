# UXD-030 — The Worlds: a selected orbiter stays visible, is marked, and the view shifts beside its panel

- **Status**: accepted (built; the e2e counts are in Verification, a real device is open)
- **Date**: 2026-11-14 (proposed and decided)
- **Decider**: the operator, 2026-11-14 — the 12 D-series recommendations of the plan (`docs/wip/2026-11-11-ux-feedback-plan.md` "## D. Worlds") approved as written; this record covers decisions 1 to 3 of `docs/wip/2026-11-13-slice-D1-brief.md` §12 (1a, 2a, 3a).
- **Answers**: W3 of the UX feedback plan; slice D1
- **Builds on**: [UXD-019](UXD-019-select-equals-focus.md) (select = focus and the panel-aware shift, which item 11 promised the Worlds), [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) (the ruler and its regime highlight, gated by the same orbit rule)
- **Changes**: `src/lib/surface-scene/surface-view-state.ts` (`orbitsInViewNext`, `ORBIT_RULER_HIDE_RADII`) and its test, `src/lib/three/panel-framing-host.ts` (new, with its test: the framing moved out of `explore-scene-host.ts`), `src/lib/three/explore-scene-host.ts`, `src/lib/surface-scene/SurfaceScene.svelte`, `src/app.d.ts` (`__surfaceSceneObjectState`), `tests/e2e/surface-orbiter-select.spec.ts` (new), `tests/e2e/footer-dock.spec.ts`, `tests/e2e/a11y.spec.ts`; [UXS-005](../UXS-005.md), [UXS-006](../UXS-006.md), [IA](../IA.md), `docs/concept/05_Design_System.md`, `docs/adr/TA.md`, [ADR-072](../../adr/ADR-072.md), the module READMEs

## Context

"Selecting an orbiting object and opening its panel: mark it selected and shift the scene left of the panel so the object shows; now objects are hidden when the panel opens" (W3). Three causes, each checked in a browser:

1. **The orbit gate hid the selected orbiter.** `orbitsInView` turns false when the camera is under one body radius above the surface (`ORBIT_RULER_HIDE_RADII`). The fly-in to an orbiter lands 14 scene units from it, which is 1.1 Mm above the Moon for LRO and 2.3 Mm above Mars for MRO: under one radius on both, so the next frame hid every orbiter dot and ring, the selected one included, and the ruler with them.
2. **Nothing marked the selected orbiter.** The scene's own comment said the outline pass marks it; the code outlined only the hovered one, and an orbiter has no halo.
3. **Nothing shifted the Worlds' view for an open panel.** The shift of UXD-019 existed on `/explore` only, so on every Worlds route the object the camera had just centred sat under the 400 px panel's edge.

A fourth finding came from running it: a deep link (`?site=mro`) selects as the site list loads, before the frame loop has built the orbital markers, so the fly-in found no marker and was dropped; the camera stayed at the far view.

## Decision

1. **Focus on an orbiter means the orbits are in view (decision 1a).** `orbitsInViewNext` (pure) returns true while an orbiter site or an Earth satellite is selected, so the selected orbiter, its ring, every other orbiter and the ruler stay. Otherwise the old rule stands (hide under one radius, show again above 1.12 radii). The surface-focus behaviour of the gate is unchanged for everything else. The rule and its threshold now live in one place, `surface-view-state.ts`.
2. **The selection of an orbiter ends with its panel.** Closing an orbiter's panel clears the selection (an Earth satellite already did), so the focus rule ends and a low camera hides the orbits again on the next frame. Selecting a site, turning ORBITERS off or closing do the same.
3. **The view shifts beside the open panel for every selection in the 3D view (decision 2a).** The framing of UXD-019 moved out of the Explore host into `createPanelFramer` (`panel-framing-host.ts`), and both hosts call it: the projection shifts by half the docked panel's width (`camera.setViewOffset`), measured in the 400 ms after a panel opened, closed or the window resized, eased every frame, instant under reduced motion. A bottom sheet (touch portrait) shifts nothing. On the Worlds it applies in the 3D view and in route view, not in the 2D map, the flat ground patch or a panorama. Picking and every projected overlay read the same camera, so they stay consistent.
4. **The selected orbiter wears the outline pass, as on hover (decision 3a).** An Earth satellite too. No new asset and no halo.
5. **The fly-in waits for the marker.** A pending orbiter selection flies as soon as the frame loop has built the markers; the dot is placed on its ring before the fly-in reads its position.
6. **Test hook.** `window.__surfaceSceneObjectState(id)` returns `{ visible, ringVisible, outlined, x, y }` (client px) for an orbiter marker or an Earth satellite, so the e2e checks "drawn", "outlined" and "centred" without reading pixels.

No visible text changes: no i18n.

## Consequences

- On `/moon` (LRO, Lunar Prospector), `/mars` (MRO) and `/earth` (ISS) a selected orbiter is drawn with its ring and the outline, the ruler is present beside it, and on a desktop window or a landscape phone the dot sits in the middle of the space the panel leaves.
- The Worlds' bundle grows by the framing helper (a 3.7 kB source file before minification, about 1 kB minified and compressed is the expectation, not measured) and the two functions; `explore-scene-host.ts` shrinks by the same code, and the helper is one chunk shared by `/explore` and the Worlds. The route budgets are checked by the operator's gate at the end of the arc.
- Not done, and named: the shift for a panel docked at the left (RTL) is not handled, here or on `/explore` (`panelCoverPx` counts only a panel docked at the right edge); the INDEX drawer is not a `Panel` and does not shift the view.

## Verification

`surface-view-state.test.ts` (`orbitsInViewNext`: hides under one radius, stays while an orbiter is the focus, the 12 % band, returns when the focus clears), `panel-framing-host.test.ts` (a 400 px drawer gives 200 px, the ease, a sheet shifts nothing, the settle window, not wanted takes the shift off), `tests/e2e/surface-orbiter-select.spec.ts` on `desktop-chromium`, `mobile-chromium` and `mobile-landscape-chromium` (LRO, Lunar Prospector, MRO, ISS drawn, ringed, outlined and centred in the space the panel leaves; the ruler present; closing the panel hides the orbits again at the low camera), `footer-dock.spec.ts` (no HUD part meets another or the panel with an orbiter selected, `/moon` and `/mars`, four sizes), `a11y.spec.ts` (`/moon?site=lro`: 0 serious). The spec fails with the rule forced off (mutation check). Screenshots with the panel open were read for LRO and MRO at 1440 x 900, Lunar Prospector at 844 x 390 and LRO at 390 x 844 (the Worlds are drawn with headless WebGL); the hook's state for LRO, Lunar Prospector and MRO at all three sizes was read as numbers (dot at the middle of the space the panel leaves on desktop and landscape, at the screen centre on the portrait phone). Not checked: `ar` (RTL), a real device.
