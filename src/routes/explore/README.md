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
- `ScaleNav` — top row: back chip, scale picker, `ResetViewButton` (always drawn at all eight scales, disabled when inert; flush right at the solar system and then left of a docked panel, UXD-021).
- `SunCompass` — off-screen Sun needle (neighborhood).
- `ScaleStrip` — bottom-right scale strip: a fixed 232 px box with the unit ladder and the fixed-width `ScaleBar` (solar system, neighbourhood), or the schematic honesty note (UXD-021).
- `BlackHoleNotes`, `AnonStarTag`, `DeepSkyImmersion`, `WarpOverlays` —
  read-only scene overlays.
- `SizesOverlay` — REFERENCES modal: the bodies-only `SizesCanvas` and the aligned DOM legend grid (UXD-021); `HoverTooltip` — cursor tooltip.

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
section of the page; back-links `/explore?goto=` or `?system=`; ids from `starPageIds()` in
`scripts/site-routes.mjs`, ADR-096 items 13–14). `black-holes/[id]/` is one black hole (ADR-096
item 16; server load → `$lib/data/black-hole-entity`; Gargantua carries a fiction badge and no
figures; back-link `/explore?bh=`; ids from `blackHolePageIds()`). `deep-sky/[id]/` is one deep-sky
object with reviewed text (ADR-096 item 17; server load → `$lib/data/deep-sky-entity`; ids from
`deepSkyPageIds()`, the overlay files; the title is `deepSkyTitle`, the values the `format.ts`
formatters the panel uses; back-link `/explore?deepsky=<id>`). One real object has one page: the
Milky Way globular and Local Group rows of the same object link it (`DEEP_SKY_ALIAS`). There is no list page: the
INDEX does that job. `+page.svelte` mounts one `ScaleIndex` per scale (`CTX_ORDER`), all hidden
unless on screen, with one left-edge handle and one `indexOpen`; their rows are the server load's
`scaleIndex` (`getScaleIndexRows` in `$lib/server/entity-index`, built by
`$lib/explore/scale-index.ts`), so the prerendered HTML links every body, star, black-hole and deep-sky page
and a row with no page joins on hydration. A row's select is the scene host's select function for
that scale (`selectLgFn` … `selectCosmicWebFn`, `indexSelectStarFn`, `selectDeepSkyFn`,
`mwDeepLinkFn`, `bhDeepLinkFn`) or the page's `selectPlanet` / `selectSun` / `selectSmallBody` /
`selectSatellite` / `selectBelt`. `hub/` is the nav-group hub.
