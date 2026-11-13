# Slice D1 brief — a selected orbiter stays visible and the view shifts left of its panel (W3)

Read-only brief, written at HEAD `df38554fe07` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and arithmetic over the code's own constants. Nothing was built, run in a browser or measured; every distance below is arithmetic (§13). No code was changed. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 63: "Waits on: —"), so the three forks in §12 are about scope, not about a missing answer.

## 0. Answer first

1. **The orbiter hides itself because of the orbit-ruler gate, not because of the camera.** `orbitsInView` flips to false when the camera's height above the surface is under one body radius (`SurfaceScene.svelte:385` `ORBIT_RULER_HIDE_RADII = 1.0`, flip at `:4008-4017`). The orbiter fly-in lands 14 scene units from the orbiter (`:2425` `flyToR = 14`), and the orbiter rides at `planetRadius + 4 + 5·log10(1 + alt/50)` (`orbit-regime-geometry.ts:28-29`, `planetRadius` 30 at `:1927`): LRO (50 km) rides at 35.5 u, so the camera is at most 49.5 u from the centre, 19.5 u above the surface, which is 1,129 km on the Moon (1,737 km radius). The gate sees "closer than one radius", sets `orbitsInView = false`, and the very next frame `applyOrbiterLayerVisibility` hides every orbiter dot and ring (`:3908-3917`), the selected one included. The same gate hides the Earth satellites (`:3931`) and, through `onOrbitsInViewChange`, the orbit ruler on all three routes (`moon/+page.svelte:347`, `mars/+page.svelte:274`, `earth/+page.svelte:236`).
2. **The selected orbiter has no mark of its own either.** The scene says the outline pass marks it (`:3918-3921`, halo forced off), but the outline list takes only the hovered marker, and only when it is not the selected one (`:3954-3962`). So after a select the orbiter is neither drawn nor marked.
3. **Nothing shifts the Worlds' view for an open panel.** `src/lib/three/panel-framing.ts` (pure, tested) was written "shared with the Worlds' orbiter framing (D1)" (its header) and `explore-scene-host.ts:2195-2239` turns it into `camera.setViewOffset`; `git grep setViewOffset -- src` finds only that one use. `SurfaceScene` has none, so on every Worlds route the object the camera just centred sits under the 400 px panel's edge.
4. **Recommendation:** (a) make the gate depend on what the camera is focused on: while an orbiter (or Earth satellite) is selected the orbits count as in view, so the dot, its ring, the other orbiters and the ruler stay; (b) mark the selected orbiter with the outline pass it already uses for hover; (c) reuse `panelCoverPx`/`framingShiftPx`/`easeShift` in `SurfaceScene` so the focus point sits in the middle of the space the panel leaves, for every selection in the 3D view, not only orbiters (Decision 2).
5. **No data change, no image, no new key** (14 locales untouched). One pure rule in `surface-view-state.ts`, one test hook, one new e2e spec on three projects, one UXD record.
6. **Needs the operator before code:** nothing blocks; 3 scope forks in §12 (1 to 3).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` line 270; slice row 365)

| ID | Text | State at HEAD |
|---|---|---|
| W3 | "Selecting an orbiting object and opening its panel: mark it selected and shift the scene left of the panel so the object shows; now objects are hidden when the panel opens." | Hidden after the fly-in (§2.1); no selection mark (§2.2); no shift (§2.3). |

Done when (plan row 365): "shots: LRO, Lunar Prospector, MRO selected with the panel open".
Plan wording that is outdated: "today low orbiters hide when altitude flips `orbitsInView`" is right for the cause but understates it: by §2.1 arithmetic every orbiter hides, not only the low ones.

## 2. Current state (file:line at `df38554fe07`)

### 2.1 Why the selected orbiter disappears

| Step | Where | Effect |
|---|---|---|
| Select an orbiter site | `selectSite` (`SurfaceScene.svelte:1563-1611`): `layerOrbiters = true`, `selected = s`, `panelOpen = true`, then `faceCameraAtOrbiter(s.id)` (`:1609`) | opens the panel, starts the fly-in |
| Fly-in | `faceCameraAtOrbiter` (`:2441-2447`) reads the dot's live world position, `flyToWorldPos` (`:2404-2429`) sets `focusOffset` to it, `flyToR = 14`, `POLAR_TILT 0.5` | the camera orbits the object, 14 u away |
| Height readout | `:3996-4000` `altitudeKm = (camera.position.length() − planetRadius) × radiusKm/planetRadius` | the camera is at most ring radius + 14 u from the centre |
| Gate | `:4008-4017`: below `radiusKm × 1.0` it sets `orbitsInView = false` and calls `onOrbitsInViewChange(false)`, back on above ×1.12 | the ruler leaves (route `{#if … orbitsInView}`) |
| Visibility | `:3908-3917` `applyOrbiterLayerVisibility(om, { showOrbiters: orbitsInView && layerOrbiters && nation, showOrbits: orbitsInView && layerOrbits })` | dot and ring off; no exemption for `selected` |
| Earth | `:3927-3935` the same `orbitsInView &&` on `earthSats` | the selected satellite hides too |

Arithmetic (not run): ring radius `34 + 5·log10(1 + alt/50)` is 35.5 u at 50 km (LRO), 36.5 u at 100 km (Lunar Prospector), 38.6 u at 255 km (MRO), 47 u at 20,000 km (Hope). The threshold is radius-relative, so on all three bodies it is 60 u from the centre (30 u + one radius in scene units). The camera, at most ring radius + 14 u, is under 60 u for every orbiter except possibly Hope (47 + 14 = 61 u, borderline). The motion freeze (`:3948` `motionFrozen = … selected != null`) does not matter here: the dot is frozen, then hidden.

### 2.2 What marks a selected thing

| Object | Mark at HEAD |
|---|---|
| Surface site | halo (`:3895-3906` and the marker loop), crosshair, ring and tag |
| Orbiter | none: `om.halo.visible = false` (`:3921`), outline list holds the hovered marker only (`:3954-3962`) |
| Earth satellite | hover outline only (`:3963-3969`); selection stops the scene (`:3948`) |

### 2.3 What shifts for a panel

Nothing. The panel is `aside.panel` over the canvas (`Panel.svelte:176`), 400 px on desktop. `panel-framing.ts` exports `panelCoverPx(rects, viewportW)` (a side drawer docked at the right edge counts, a full-width sheet counts 0), `framingShiftPx(cover)` (half the cover) and `easeShift` (exponential, 14/s). `explore-scene-host.ts:2203-2239` measures `aside.panel` only in the 400 ms after a panel opened, closed or the window resized (`MutationObserver` on `document.body`), eases the shift every frame (instant under reduced motion) and calls `camera.setViewOffset(w, h, framingShift, 0, w, h)`; it does nothing in 2D or inside an immersive view. Picking, `project(camera)` (site tags, annotation rings, traverse pills: `:1749`, `:4285`, `:4470-4885`) all read the camera's projection matrix, so a view offset keeps them consistent. `createCanvasResizer` (`:3612`) resets `camera.aspect` on resize: whether it keeps a view offset's `fullWidth` in step was not read (NV3).

The Worlds' own HUD already moves aside for a panel by CSS (`hud-beside-panel`, `:5732`, `:7299`); this slice moves the 3D camera, not the HUD.

### 2.4 Tests that touch the area

`orbiter-group.test.ts` (`applyOrbiterLayerVisibility`), `surface-view-state.test.ts` (pure view rules), `select-focus.spec.ts:673` ("turning ORBITERS off closes the selected orbiter", `/earth?object=iss`), `mars.spec.ts:63-72` and `earth.spec.ts:87-150` (the ORBITERS chip). None asserts that a selected orbiter is drawn or where it sits. The `window.__surfaceScene*` hooks (`:1721-1753`) have none for an orbiter.

## 3. Screenshot list (before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 portrait (`mobile-chromium`), phone 844×390 (`mobile-landscape-chromium`), `en-US`; `ar` (RTL: the panel docks at the left, the shift reverses, NV4):
1. `/moon?site=lro`, `?site=lunar-prospector`, `/mars?site=mro`: panel open, 1.5 s after the select. Before: dot and ring gone, no ruler; after: dot centred in the space left of the panel, ringed, outline, ruler present.
2. `/earth?object=iss` and a GPS satellite: same (the Earth path).
3. The shift: LRO selected, panel open then closed, three frames each (the ease), desktop; the same on a landscape phone (side drawer) and a portrait phone (sheet: no shift).
4. A surface site selected (Apollo 11, Curiosity) before/after the shift (Decision 2).
5. Selected orbiter, then the ORBITERS chip off (selection clears, UXD-019), then on.
6. Side-by-side with `/explore?id=moon` after a select, to show the same shift (UXD-019).

## 4. Proposal

### 4.1 The gate follows the focus, not the origin

New pure function in `src/lib/surface-scene/surface-view-state.ts`:
```
orbitsInViewNext({ altitudeKm, radiusKm, wasInView, focusOnOrbiter }): boolean
```
`focusOnOrbiter` is `true` while `selected?.kind === 'orbiter'` or `selectedSat != null`. When true it returns `true`; otherwise the existing rule (hide below `radiusKm × 1.0`, show above ×1.12). `SurfaceScene` calls it at `:4008-4017` instead of the inline test; `ORBIT_RULER_HIDE_RADII` and the hysteresis move into the module (one place). Effect: the selected orbiter, its ring, every other orbiter and the ruler stay on while an orbiter is selected, as on `/earth` today when nothing is selected; the surface-focus behaviour (hide orbits when the camera dips under one radius, "body-focus", `:3910-3912`) is unchanged for everything else. Clearing the selection (close, ORBITERS off, selecting a site) restores the old rule on the next frame; if the camera is then below the threshold the orbits hide as before.

### 4.2 A mark for the selected orbiter

The outline pass (`outlinePass.selectedObjects`, `:3954-3970`) takes the selected orbiter's `dotGroup` as well as the hovered one (and `earthSats` group for `selectedSat`), the same look as hover. No new asset; `om.halo` stays off.

### 4.3 The shift

A small helper beside the scene, `createPanelFraming(deps)`, extracted from `explore-scene-host.ts:2195-2239` so both hosts call one function (the Explore code moves, its behaviour does not): measure `aside.panel` rects in the settle window, `panelCoverPx`, ease, `setViewOffset`/`clearViewOffset`. `SurfaceScene` calls it once per frame; wanted only when the view is 3D and not `flatPatchActive`, `panoramaActive` or `routeViewActive` is irrelevant (route view keeps the shift: the route is a 3D framing). The panel's cover is published as `--panel-cover` on the scene root for the HUD that sits beside a panel (not needed in this slice; kept out).

### 4.4 Test hook

`window.__surfaceSceneObjectState(id)` returns `{ visible, x, y, ringVisible }` for an orbiter marker or Earth satellite (client px via the same projection as `__surfaceSceneDrawnSiteXY`, `:1737-1753`), so the e2e checks "drawn" and "centred" without pixel reading.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on D1 |
|---|---|
| C1 (UXD-019) | Select = focus and panel-aware framing exist on `/explore`; D1 applies the same shift to the Worlds, as UXD-019 item 11 promised. A chip turned off clears a selection of its kind (`:773-790`): kept. |
| C2 (UXD-020) | The ring and label look on pins: not reused here (the Worlds' orbiter mark is the outline pass); noted so the two selection marks are compared in the shots. |
| C3 (UXD-021) | `panelCoverPx` is published to the Explore page for the scale bar; the Worlds' scale bar is unchanged. |
| C4 (UXD-024) | The ruler's bottom-left column and the regime highlight (`setRegimeHighlight`, gated by `orbitsInView`) come back when the orbiter is selected: the ruler can now be open beside a selected orbiter, which the C4 shots never showed. Shot 1 checks the column against the panel. |
| C6 / L45 | INDEX rows for orbiters select through `selectSite`, so they get the fix with no change. |
| C8 | The welcome hint (`ExploreHint`) is untouched. |
| D2 | Changes the orbiter panel's tabs, not its framing; build order free. |

Plan ideas now outdated: "the selected orbiter stays visible after the fly-to (today low orbiters hide…)" (all orbiters hide, §2.1); "mark it selected" (no mark exists to restore: it must be added).

## 6. i18n impact (14 locales)

None. No visible text is added. (The outline is graphical; the tests' accessible names exist.)

## 7. Data changes

None.

## 8. Tests to add or change

**Unit (vitest):**
- `surface-view-state.test.ts`: `orbitsInViewNext`: hides below one radius when nothing is focused; stays true under the radius when `focusOnOrbiter`; the 12 % hysteresis; returns to the old rule when the focus clears.
- `panel-framing.test.ts` already covers the maths; add the helper's test (a fake `aside` rect gives the expected `setViewOffset` x; reduced motion snaps).
- `orbiter-group.test.ts`: unchanged.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `surface-orbiter-select.spec.ts`: for `/moon` LRO, `/moon` Lunar Prospector, `/mars` MRO and `/earth` ISS: select by URL or the test hook, wait for the fly-in, assert `__surfaceSceneObjectState(id).visible` is true, the outline list holds it, the ruler (`[data-testid=orbit-ruler]`, name as the C4 spec uses) is present, and `x` lies in the middle of the space the panel leaves (±8 % of that width) on desktop and landscape; portrait phone: no shift, the sheet covers the scene (assert only visible and ruler state).
2. Same spec: close the panel: the shift eases to 0 and the orbiter stays visible; select a surface site then an orbiter: the camera hands over without the ruler flickering.
3. `select-focus.spec.ts:673` unchanged, must pass; `orbit-ruler.spec.ts`, `chip-row.spec.ts`, `mars.spec.ts`, `earth.spec.ts` unchanged, must pass.
4. `footer-dock.spec.ts` (Worlds parts at five sizes): add "orbiter selected, panel open": no HUD part intersects the shifted legend or the ruler column.
5. `a11y.spec.ts`: 0 serious with an orbiter selected.

## 9. Docs to update by name

- **UXD-028** (new, `docs/uxs/decisions/UXD-028-worlds-selected-orbiter-stays-visible-and-framed.md`; 027 is the last at HEAD, the C9 and C10 briefs name numbers too: take the next free at build time): the cause, the focus rule, the mark, the shift; row in `docs/uxs/decisions/README.md`; row D1 in `docs/uxs/CHANGE-INVENTORY.md` (line 63); close W3.
- `docs/concept/05_Design_System.md` §5.3 (the panel overlaps the 3D view: "the focus sits in the middle of what is left", for Explore and the Worlds), §6.5 and §6.6 (Earth, Moon: selected-orbiter look).
- `docs/uxs/UXS-005.md` (Earth orbiters), `UXS-006.md` (Moon and Mars orbiters, panel), `docs/uxs/IA.md` §controls (the framing).
- `docs/adr/TA.md` (the Worlds paragraph that cites ADR-072 and the framing sentence at the Explore code layout) and `docs/adr/ADR-072.md` addendum (the orbit gate and the shift are shared scene behaviour).
- READMEs: `src/lib/surface-scene/README.md` (the `SurfaceScene` rows: gate rule, framing helper, test hook), `src/lib/three/README.md` if it lists `panel-framing.ts`, `src/lib/explore/README.md` (the helper moved).
- Header comments: `SurfaceScene.svelte:3918-3921` (the "outline-pass marks the selected orbiter" comment becomes true), `panel-framing.ts` header.

## 10. Phased plan

1. **D1a the rule:** `orbitsInViewNext` and its tests red first, wire it, outline for the selected orbiter, the test hook; the e2e visible/ruler assertions.
2. **D1b the shift:** extract the Explore framing into the shared helper (Explore specs `select-focus`, `explore-hud`, `explore-deeplinks` stay green first), then call it in `SurfaceScene`; the e2e centre assertions; `footer-dock` part.
3. Docs of §9, `npm run validate-data` is unaffected (no data), `npm run preflight` once before a push, `npm run preflight:coverage` (new pure functions are tested).

## 11. Acceptance checks

- LRO, Lunar Prospector, MRO and ISS selected with the panel open: the dot, its ring and the outline are drawn, the ruler is present, and the dot is inside the space the panel leaves (e2e, desktop and landscape).
- Closing the panel, ORBITERS off, or selecting a site returns to today's rules (unit + e2e).
- No Explore regression: the three Explore specs of §8 green after the helper moves.
- No overlap of HUD parts with the shifted view at the five footer-dock sizes.
- Docs of §9 updated; the inventory row D1 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the four D briefs)

1. **What stays on while an orbiter is selected.** **(a) Everything: the selected orbiter, its ring, the other orbiters and the ruler** (recommended: one rule, "focus on an orbiter means the orbits are in view", and it matches `/earth` before the select; the ruler stays useful beside the panel); (b) only the selected orbiter and its ring stay, the other orbiters and the ruler hide as today (cleaner frame, but the ruler and the others vanish the moment you select); (c) keep the gate and only move the threshold (a number tuned per body; fragile, rejected).
2. **How far the shift reaches.** **(a) Every selection in the 3D view on all four Worlds: sites, orbiters, Earth satellites, museums, observatories** (recommended: UXD-011 says a decision applies project-wide, the same code does it, and a site under the panel edge has the same problem); (b) orbiters and satellites only, as the plan row says.
3. **The selected-orbiter mark.** **(a) The outline pass, as on hover** (recommended: it is what the scene's own comment promised, no new art); (b) a screen-constant ring like Explore's pins (UXD-020: more consistent with `/explore`, a new element in the Worlds' DOM and a second ring look next to the site halos); (c) none beyond being drawn and centred.

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The 49.5 u, 1,129 km and 61 u figures are arithmetic over `planetRadius` 30, `flyToR` 14, the ring formula and `radiusKm`; the camera's true distance (the tilt, `POLAR_TILT`, the orbit phase) and whether the flip really happens on the first frame of the fly-in were not observed. Whether Hope (20,000 km) hides was not worked out beyond the borderline sum.
- NV2 The `onOrbitsInViewChange` consumers in `Nav` or `OrbitRuler` beyond the three route lines were not read; whether the ruler's own open state survives being unmounted and re-mounted (it hides with `{#if orbitsInView}`) was not checked.
- NV3 Whether `createCanvasResizer` keeps a `setViewOffset` in step on resize and orientation change was not read; Explore uses the same camera calls, so the guard may already exist.
- NV4 RTL (`ar`): `panelCoverPx` tests `right >= viewportW − 1` (a panel docked at the right edge); where the panel docks in RTL, and so whether the shift reverses or does nothing, was not checked.
- NV5 The outline pass on a satellite model that is partly hidden behind the globe, and the outline's look on the dimmed (ended) orbiters' materials, were not looked at.
- NV6 Panorama and flat-patch views were assumed to need no shift (the flat patch is a full-viewport DOM overlay, the panorama a skybox around the camera); not checked, and route view's behaviour under a view offset (the traverse pills) was not traced.
- NV7 `docs/adr/ADR-072.md` was not opened to see whether it already states the orbit gate; the TA.md line numbers were not read.
- NV8 The earth satellites' `selectedSat` hide path (`:3931`) was read, but the INDEX row and tour-anchor selection paths for satellites were not traced to confirm they all go through `selectedSat`.
