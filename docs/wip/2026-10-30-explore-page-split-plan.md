# /explore page split — plan (2026-10-30)

Tech-debt Phase 4, step 3. `src/routes/explore/+page.svelte` is 5,321 lines
(script 1–2673, markup 2674–3873, style 3874–5321). Plan produced by a
read-only planning agent; line numbers are at commit `da45534e8b3`. Moves are
verbatim, one commit per step, no behaviour change.

## Pattern

Same as the `/fly` split (14a4bcd3d25) and SurfaceScene (fbc81dac3e5): pure
logic and rune factories to `src/lib/explore/` (next to
`scale-shell-controller.ts`), each with a `*.test.ts`; page keeps thin
wrappers. New here: child `.svelte` components for HUD markup + its CSS
(route-local in `src/routes/explore/`), because markup + CSS are ~2,650 of
the 5,321 lines. The `window.__explore*` hooks live in
`explore-scene-host.ts` and are not touched.

## Steps (safest first)

| # | Extraction | New file(s) | Risk | Page after |
|---|---|---|---|---|
| 1 | `SMALL_BODIES` + orbit sampling (150–260); host types instead of inline duplicates (`ExploreHoverData`, `ExploreContextId`) | `src/lib/explore/small-bodies.ts` + test | very low | ~5,175 |
| 2 | `PATHS_LEGEND`, `iconicTagline`, `INTERSTELLAR_CRAFT`; formatters (`anonColorLabel`, `fmtScale`, `lightUnitLabel`, `dilationPct`, `SATELLITE_STATS`, `contextLabel`) | `paths-legend.ts`, `format.ts` + tests | low | ~4,915 |
| 3 | `lensPanel` (944–1077) and `scaleNavBack` (1351–1377) as pure functions (getters for click-time pointers) | `lens-panel.ts` + test | low | ~4,765 |
| 4 | Sizes overlay + hover tooltip with their CSS | `SizesOverlay.svelte`, `HoverTooltip.svelte` | low | ~4,570 |
| 5 | Read-only overlays: black-hole badge/lens notes, anon-star, deep-sky immersion, cross-flash, warp caption | `SceneOverlays.svelte` | low–medium (DOM order) | ~4,300 |
| 6 | Scale nav, sun compass, scale strip | `ScaleChrome.svelte` | low–medium | ~3,900 |
| 7 | Layer watchers (1749–1806), same registration/teardown order | `layer-watchers.ts` + test | medium | ~3,840 |
| 8 | URL sync (1456–1715) verbatim; the six `last*` guards become ONE shared object (the host mutates them via the bridge); called during init, not onMount | `explore-url-sync.svelte.ts` + test | medium–high | ~3,610 |
| 9 | Render stack (1831–2056), returns null on WebGLUnavailable; coverage-excluded like the host | `src/lib/three/explore-render-stack.ts` | medium | ~3,410 |
| 10 | Earth-compare + time controls (move together: CSS coupling) | `TimeDock.svelte` (bind simSpeed/simPaused) | medium | ~2,960 |
| 11 | HUD cluster + mobile drawers + PATHS legend | `HudControls.svelte` | highest (components) | ~2,120 |
| 12 | (optional) state object + host handle replace the bridge | `explore-state.svelte.ts` | medium–high | ~1,600 |

## Traps the plan calls out

- Two unit tests read the page source: `tactical-scan-mobile.test.ts:14`
  (the `mobileScanContent` snippet) and `audio-tour.test.ts` `SOURCE_FILES`
  (every `data-audio-stage` the tours target). Components that carry anchors
  must be added there.
- Shared CSS across blocks: `.context-hidden`, `.toggle` (also the play
  button), `.time-controls { left: 209px }` depends on the earth-compare
  width, `.paths-legend` positions inside `.hud-controls`.
- New pure modules count toward the coverage ratchet → need tests; the
  render-stack module is WebGL-only → coverage exclude.
- Housekeeping: `src/lib/explore/README.md`, a line in `docs/adr/TA.md`
  Scene 1, stale comments in `MissionPanel.svelte:40`,
  `explore-magnetic-tilt.test.ts:39`.

## Verification per step

Unit: the /explore-related tests plus `audio-tour` and
`tactical-scan-mobile`; static: typecheck (catches unused CSS after a move),
lint. E2E like the /fly commit: the explore, shell, time-control, paths,
mobile-drawer, a11y, tour and visual specs on all three projects with
`--retries=0`, sorted result lines compared before/after. Plus a scratch
before/after dump (outerHTML without svelte hashes, computed style, rect,
`.explore` child order) of ~9 states × 3 viewports.

## Outcome (steps 1–11 done; 12 skipped by decision)

Page 5,321 → 2,320 lines (commits `95bc19d0e49` … `21b01204356`). Where
the build left the plan:

- Steps 5 and 6 became seven components, not two (`BlackHoleNotes`,
  `AnonStarTag`, `DeepSkyImmersion`, `WarpOverlays`; `ScaleNav`,
  `SunCompass`, `ScaleStrip`). The blocks are not contiguous, and one
  component per step would have reordered the DOM.
- Step 8 has no unit test: `$effect` does not run under this repo's vitest
  setup (an `$effect` in `$effect.root` + `flushSync` ran 0 times). It was
  checked with a before/after browser probe and e2e;
  `tests/e2e/explore-deeplinks.spec.ts` now covers `?goto` and
  `?system&planet`, which no spec covered before.
- Step 11 passes `layers` read-only with `onToggleLayer` / `onShowPaths`:
  `bind:layers` made svelte-check flag the page's intentional `_prevLayers`
  snapshot (`state_referenced_locally`).
- `tactical-scan-mobile.test.ts` now reads `HudControls.svelte`;
  audio-tour `SOURCE_FILES` gained `TimeDock` and `HudControls`.

## Not split (on purpose)

The host bridge/deps objects (until step 12); the six URL mirror effects into
one helper (they differ on purpose); desktop vs mobile legend and chip rows
(different behaviour, specs depend on both); the `select*` mutex functions;
the tour anchors; the detail-panel block as one component (~45 forwarded
props, no gain); the small index handles; the fn-pointer `let`s (deliberately
non-reactive); the host itself; the `.explore` / `.layer` root CSS.
