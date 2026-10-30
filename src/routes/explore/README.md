# src/routes/explore — module map

`+page.svelte` owns the /explore state, the scene host wiring and the panels.
HUD markup with its own CSS is split into route-local components; each is
mounted where its block was, so DOM order (and stacking among equal
z-indexes) is unchanged. The page keeps the `{#if}` guards around them.

- `ScaleNav` — top row: back arrow, scale picker, reset.
- `SunCompass` — off-screen Sun needle (neighborhood).
- `ScaleStrip` — bottom-right ruler / schematic honesty note.
- `BlackHoleNotes` — lensing badge, curvature note, time-dilation table.
- `AnonStarTag` — tapped background star facts.
- `DeepSkyImmersion` — full-frame deep-sky photo.
- `WarpOverlays` — boundary-crossing flash + warp distance caption.
- `SizesOverlay` — size-comparison modal.
- `HoverTooltip` — cursor tooltip (expanded card when the hover layer is on).

Logic lives in `src/lib/explore/` (see its README). `audio-tour.test.ts`
and `tactical-scan-mobile.test.ts` read `+page.svelte`'s source: a component
that takes over a `data-audio-stage` anchor must join audio-tour's
`SOURCE_FILES`.
