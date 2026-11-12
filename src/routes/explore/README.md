# src/routes/explore — module map

`+page.svelte` owns the /explore state, the scene host wiring and the panels.
HUD markup with its own CSS is split into route-local components; each is
mounted where its block was, so DOM order (and stacking among equal
z-indexes) is unchanged. Components write page state through callbacks or
`bind:`; two shared objects are written in place on purpose: the page's
plain `legendRowEls` array (legend keyboard nav) and `iconic.state`.

- `HudControls` — solar-system HUD: one row on a fine pointer, the view actions (2D/3D, reset, always rendered and disabled when nothing is selected, AR/Sky) then the layer chips (`LayerChipRow`, UXD-015; the PATHS chip carries `data-audio-stage` through the config `attrs`), the
  PATHS legend, the mobile top row and the mobile drawers (incl. Scan).
- `TimeDock` — PLANET SCALES chip + time controls (play, speed radiogroup, reset; coupled positions).
- `ScaleNav` — top row: back chip, scale picker, `ResetViewButton`.
- `SunCompass` — off-screen Sun needle (neighborhood).
- `ScaleStrip` — bottom-right ruler / schematic honesty note.
- `BlackHoleNotes`, `AnonStarTag`, `DeepSkyImmersion`, `WarpOverlays` —
  read-only scene overlays.
- `SizesOverlay` — size-comparison modal; `HoverTooltip` — cursor tooltip.

Logic lives in `src/lib/explore/` (see its README). Source-reading tests:
`audio-tour.test.ts` lists every file carrying a `data-audio-stage` anchor
in `SOURCE_FILES` (page, `TimeDock`, `HudControls`; it also accepts the `attrs` form `'data-audio-stage': 'name'`); a component that takes
over an anchor must join it. `tactical-scan-mobile.test.ts` reads
`HudControls` for the drawer's Scan tab.

`[id]/` is not part of the explorer: it is the indexable page of one planet,
moon or small body (server load `+page.server.ts` → `$lib/data/body-entity`,
names from the glossary `body` section), linking back to `/explore?id=`
(ADR-096). `stars/` holds the indexable star pages: `stars/[id]/` is one named star or
exoplanet host (server load `+page.server.ts` → `$lib/data/star-entity`; the host's system is a
section of the page; back-links `/explore?goto=` or `?system=`), `stars/` itself is the static A–Z
hub (ADR-096 items 13–14; ids from `starPageIds()` in `scripts/site-routes.mjs`). `hub/` is the
nav-group hub.
