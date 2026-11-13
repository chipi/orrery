# src/lib/explore — module map

Pure logic and rune helpers lifted out of `src/routes/explore/+page.svelte`.
The page keeps the `$state`, the fn pointers the scene host fills, and thin
wrappers; markup pieces live next to it in `src/routes/explore/`.

- `scale-shell-controller.ts` — shell ladder + the `?id=` body resolver.
- `scale-shells.ts` — `SCALE_SHELLS`: the one table of the eight levels (query, glyph, `name`, `navName`, `title`, `desc`, the lens story, up to five `tab/section` science slugs). The nav dropdown, the hub, the home grid, the level picker, the level card and `lens-panel.ts` read it; a level is named nowhere else (UXD-027, test in `scale-shells.test.ts`). `science-titles.ts` — the sections' titles in the page language from `science-index.<locale>.json`, one fetch per locale.
- `body-ref.ts` — select = focus, solar system (UXD-019): `BodyRef`, the `?id=` ladder as a ref,
  the chip table (`chipOf`; asteroids and Arrokoth ride DWARFS), `isBodyInScene` (no object, no link),
  focus frames. The page's `selectBody` and the host's `focusBody` take it from there.
- `world-links.ts` — the way between /explore and the four world pages (E6, UXD-028; no switch on zoom): `WORLD_LINKS` is the one table (the world page, and the `?id=` of the same body on /explore: the Moon is the satellite key `earth:moon`, a bare `moon` is not an id), `worldPathFor`, `explorePathFor`, `worldLinkLabel` (the "Go to Mars" words, one message per body so each language declines the name). `WorldLinkChip`, the `/explore/<id>` page and `SurfaceScene`'s "Back to Explore" chip read it; a fifth world is one row and one label.
- `small-bodies.ts` — the solar-system small-body catalogue + orbit sampling.
- `scale-index.ts` — the INDEX of the eight scales: the row model, `buildScaleIndexRows` (server-side; the solar-system rows carry a meta line of distance, size and moons built per request locale, and every row but the Sun and the two belts is under one of the five chips),
  the chips of each scale and the search / section helpers (UXD-017). `outerPageOf` is the one resolver
  of the page an outer-scale row links (the deep-sky page of a twin, else `/explore/galaxies/<id>` or
  `/explore/structures/<id>`, ADR-096 item 18); the entity loaders reuse it for their Related lists.
- `chip-fit.ts` — `fitChips`: which filter chips stay on one line beside All and which fold behind the
  INDEX's FILTERS button (C6-F, UXD-017 amendment); pure, `ScaleIndex` measures the chip widths and passes them.
- `outer-overlay.svelte.ts` — the fact and bio the six outer-scale panels show in place of the kind blurb
  (`outerOverlay`, one effect per panel; `overlayRequest` is what it asks for: only an id the page's
  `outerOverlays` lists, so no 404 before the text exists; a Local Group member that is a deep-sky
  object asks that object's overlay). The panel's name is its INDEX row's.
- `outer-page.ts` — what the galaxy and structure pages share: the row and Related-section shapes and
  the `?context=<scale>&pick=<id>` link into the scene.
- `paths-legend.ts` — PATHS layer rows (the mission thumb in each row is `thumbOf('missions', mission_id)`, UXD-025), iconic taglines (shown in the card beside the hovered legend row, UXD-026), interstellar craft.
- `format.ts` — HUD formatters (scale numbers, light units, context names,
  star colours, satellite sizes, time dilation, `planetName`, the solar-system INDEX meta line: `planetIndexMeta`, `smallBodyIndexMeta`, `moonIndexMeta`, `beltIndexMeta`). The galaxy and structure values
  (`galaxyDistance`, `galaxyDiameter`, `structureDistance`, `structureSpan`, the kind and membership
  labels) are shared by the six outer panels and the two entity pages, so they print one string;
  `outerLead` is the panel's lead (overlay fact and bio, else the kind blurb).
- `planet-sizes.ts` — the eight planets of the REFERENCES overlay (radius, colour,
  size order) shared by `SizesCanvas` and the legend grid.
- `lens-panel.ts` — which science-lens layers each shell shows (its story comes from `SCALE_SHELLS`; the page hands it to the panel only where the level card is not shown), and
  where the top scale-nav back arrow goes.
- `layer-watchers.ts` — the teaching-layer subscriptions (`onLayerChange`)
  and what each one drives.
- `explore-url-sync.svelte.ts` — deep-link resolvers + shallow URL mirrors
  (`?id ?goto ?system/&planet ?deepsky ?galaxy ?bh ?context ?paths/&focus`).

Contracts: the scene host (`$lib/three/explore-scene-host.ts`) reads and
writes the URL guards through the page's bridge; fn pointers are read at
call time, never captured. `$effect` does not run under this repo's vitest
setup, so `explore-url-sync` is checked by e2e, not unit tests.

Why: TA.md §"/explore v2"; PRD-030 / RFC-032 / RFC-039.
