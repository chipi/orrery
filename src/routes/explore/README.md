# src/routes/explore — module map

`+page.svelte` owns the /explore state, the scene host wiring and the panels.
HUD markup with its own CSS is split into route-local components; each is
mounted where its block was, so DOM order (and stacking among equal
z-indexes) is unchanged. Components write page state through callbacks or
`bind:`; two shared objects are written in place on purpose: the page's
plain `legendRowEls` array (legend keyboard nav) and `iconic.state`.

- `HudControls` — solar-system HUD: 2D/3D + reset + AR/Sky, layer chips, the
  PATHS legend, the mobile top row and the mobile drawers (incl. Scan).
- `TimeDock` — PLANET SCALES button + time controls (coupled positions).
- `ScaleNav` — top row: back arrow, scale picker, reset.
- `SunCompass` — off-screen Sun needle (neighborhood).
- `ScaleStrip` — bottom-right ruler / schematic honesty note.
- `BlackHoleNotes`, `AnonStarTag`, `DeepSkyImmersion`, `WarpOverlays` —
  read-only scene overlays.
- `SizesOverlay` — size-comparison modal; `HoverTooltip` — cursor tooltip.

Logic lives in `src/lib/explore/` (see its README). Source-reading tests:
`audio-tour.test.ts` lists every file carrying a `data-audio-stage` anchor
in `SOURCE_FILES` (page, `TimeDock`, `HudControls`); a component that takes
over an anchor must join it. `tactical-scan-mobile.test.ts` reads
`HudControls` for the drawer's Scan tab.
