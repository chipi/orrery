# UXD-024 — The orbit ruler: one row per regime, drawn in the scene, folded on request, with its data fixed

- **Status**: accepted (built; the screenshots and the e2e counts are in Verification, the operator's own review of the scene shapes is open)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — all 12 recommendations of `docs/wip/2026-11-13-slice-C4-C5-brief.md` §12 approved as written, and the mock-up `orbit-ruler-preview.html` approved as the target look
- **Answers**: O1, O2, O3, O4, O5 (the data half), O7, W2, W4 of the UX feedback plan; slices C4 and C5
- **Builds on**: [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md) (no teal in rings and states), [UXD-010](UXD-010-ruler-regimes-each-get-their-own-science-card.md) and [UXD-022](UXD-022-science-link-lists.md) (a science card per regime pane, untouched here), [UXD-014](UXD-014-one-chip-and-filter.md) (the 24 px `.ui-hit` rule for a control that is not a chip), [UXD-018](UXD-018-panel-shell-and-actions.md) (the panel shell), [UXD-019](UXD-019-select-equals-focus.md) (a mission link opens in place), [UXD-020](UXD-020-explore-readability-pins-rings-labels.md) (the ring blue, the 44 px pin ring, the pulse timing), [UXD-021](UXD-021-explore-hud-scale-bar-picker-pills-references.md) (the HUD parts that must not overlap)
- **Changes**: `src/lib/components/OrbitRuler.svelte`, `RegimePanel.svelte`, `HudStackBL.svelte` (new), `TierContextCard.svelte`, `src/lib/orbit-regime-format.ts`, `orbit-regime-geometry.ts`, `ruler-collapse.ts`, `hud-touch.svelte.ts` (all new, each with its test), `src/lib/three/regime-highlight.ts` (new), `explore-scene-host.ts`, `explore-solar-scene.ts`, `surface-scene/SurfaceScene.svelte`, `surface-markers.ts`, the four route pages, `static/data/orbit-regime-thumbs.json` (new), 14 × 24 regime overlays in `i18n-src/`, `messages/*.json` (2 keys); [UXS-014](../UXS-014.md), [UXS-005](../UXS-005.md), [UXS-006](../UXS-006.md), [IA](../IA.md), `docs/concept/05_Design_System.md`, `docs/adr/TA.md`, `docs/accessibility.md`, the module READMEs

## Context

The ruler was a fixed 208 px (152 px on a short window) card whose name column could wrap: in the brief's
estimate 12 of 336 regime rows in 14 locales did not fit (`SCATTERED` in German, Russian, Hindi, Dutch and
English, `TELLURIQUES` in French). It only opened a panel: nothing in any scene said which band a row meant. The
"who lives here" list drew a grey dot for every `NATURAL` resident. Nine of 38 founding missions were links,
unequally per locale, and six locales carried ids that open nothing (`mariner-2`, `mariner-4`, `mariner-10`,
`hope`). A trailing country or agency tag sat on 34 labels in all 14 locales, four of them left in English. The
locate chip, the "AS SEEN FROM YOU" readout and the ruler shared the lower-left corner through a script that
measured the chip and shifted the ruler right; the script did not know the readout. The ruler could never be
hidden (the file header said so, from the 2026-06-22 "always visible" direction), and the operator now asks for
the opposite. Evidence: the brief's §1 to §6.

## Decision

1. **One row, one line (O1).** The ruler is `width: max-content`, 208 px up to `min(280px, 44vw)` (152 px to 56vw on
   a short non-touch window). A name is one line with an ellipsis and the full regime name as its `title`; the
   altitude never wraps. The drawer (touch) keeps its own full-width layout. No key was added for the title.
2. **One formatter (O1, decision 11).** `orbit-regime-format.ts` holds the altitude / distance text for the ruler
   rows and the regime panel's stat: the localised unit (`m.mp_flight_unit_km`, `m.unit_au_value`), the locale's
   digit grouping, 万 / 만 / लाख above 100,000 in zh, ja, ko and hi. The panel used `en-US` grouping and a
   literal `km` / `AU` before; a whole number below 10 prints `5` not `5.0` (GIANTS read `5.0–30 AU`).
3. **A fold (O7, decision 5).** The header is one `<button class="ui-hit">` (not a Chip: a Chip's contract is
   `aria-pressed`, a disclosure needs `aria-expanded` and `aria-controls`; the pattern of the Moon/Mars imagery
   card). Folded, the ruler is its header, plus the flagged regime's short name (`ORBIT RULER · LEO ▸`). The choice
   is remembered in `localStorage` (`orrery.ruler.collapsed`, try/catch, `ruler-collapse.ts`); with no saved
   choice the ruler starts folded below 560 px of window height. The touch drawer's ruler has no fold, its tab is
   the fold. Two keys: `ruler_collapse_aria`, `ruler_expand_aria`, 14 locales. This is a second exception to
   IA's "no state is persisted" (IA §state-persistence says so).
4. **One bottom-left column (W2, W4, decision 7).** `HudStackBL` is a flex column anchored at the lower left of
   `/earth`, `/moon` and `/mars`: the "AS SEEN FROM YOU" readout (Moon, once resolved), the locate chip, the ruler,
   top to bottom, 8 px apart. Nothing is measured and nudged any more: the `--ruler-left` script is gone; the
   footer lift (`--ruler-clear`, measured on the column) stays. On a phone only the readout stands above the scene's
   bottom bar; the chip is the bar's first icon and the ruler the drawer's Ruler tab. One DOM instance of the chip
   (`hudTouch` picks the host; its test id is unique). The imagery card (`TierContextCard`) stays outside, as scene
   attribution, and clears the column by `--hud-stack-top`, the column's measured top edge, published on `<html>`.
   `/explore` has neither chip nor readout and keeps the bare ruler.
5. **The regime drawn in the scene (O2, decisions 1 to 4, 12).** Hover or keyboard focus of a row shows that regime
   in the scene, a click opens the panel and the regime stays drawn while it is open; closing it clears it.
   `onPreview` / `activeRegime` on the ruler, `setRegimeHighlight` on the surface scene and `setRegimeHighlightFn`
   on the Explore host, one pure module for regime to radius (`orbit-regime-geometry.ts`) and one drawing
   (`regime-highlight.ts`), the state published as `data-regime-highlight="ID:hover|ID:active"` for the tests.
   - **Colour (decision 1, option a).** Every highlight is `#889fe7` (`RING_BLUE`); the regime colour stays on the
     ruler dot only. The hovered row takes the same blue as its edge and fill. No teal ring.
   - **Shapes.** A band is a translucent annulus (opacity 0.14) with two 1.5 px edge lines; one altitude is one
     2 px line; a Hill sphere is three great circles of 1.2 px; a Lagrange point is the UXD-020 44 px pin ring on
     each of its residents (no ring at its own radius). Hover at 0.9, the open panel's regime pulses 0.55 to 0.9
     (1.6 s), steady under `prefers-reduced-motion`. Equatorial plane on the Worlds, the ecliptic on `/explore`.
     Hidden while the camera is below the orbits (the ruler's own gate, `orbitsInView`).
   - **Radii from the same functions that place the objects.** `/earth`: `altToSurfaceScene(30, alt)` (LEO band
     31.33–35.42, MEO 35.42–41.73, GEO ring 41.73, HEO band 34.05–42.48, an annulus as the honest compression of an
     ellipse). `/moon` and `/mars`: `surfaceOrbitRadius(30, alt)`, extracted from `surface-markers.ts` and used
     there. `/explore`: `PLANETS[].orbitR` and `ASTEROID_BELT_R` / `KUIPER_BELT_R`, extracted from
     `explore-solar-scene.ts`. The 2D view draws the same shapes in the units of `orbitR` (decision 12).
   - **`/earth` MOON and L2 (decision 3, option a).** MOON is a ring at the Moon ghost's orbit (`moonR`); L2 is the
     pin ring on its residents. A ring at L2's log-scale radius (50.15) would sit inside the Moon ghost's orbit and
     repeat the contradiction with the ruler's order.
   - **`/explore` beyond the scene (decision 4, option a).** SCATTERED is a band at 620–720, HELIOPAUSE a dashed
     ring at 800, OORT a dashed ring at 1,000 (schematic: the Kuiper belt ends at 620, the far camera at 1,400).
     The dashes are the "schematic" mark; no scene text, no new key.
   - **Camera (decision 2, option a).** Nothing moves the camera: a regime is a region, not an object.
6. **Photos for the residents (O3, decision 6, option a).** A resident with a hero image shows it as a 28 px round
   photo with a 2 px ring in its agency colour; one without keeps the dot, centred in the same 28 px slot. As built
   in C4 the photo was the `01.1x1.jpg`; since L45 ([UXD-025](UXD-025-lists-carry-a-round-photo.md)) it is the
   192 px thumb of the entity's blessed hero slot (`EntityThumb`, `entity-thumb.ts`), and 12 residents whose hero
   review had blessed another slot were repaired. The map is `static/data/orbit-regime-thumbs.json`, keyed per
   bundle (`orbit-regimes-moon/lro`) to a `<surface>/<id>`, because an id means different things per bundle: 49 residents mapped, 15 with no
   image folder keep the dot (Meteosat, Fengyun, Tundra, IBEX, Chandrayaan-2, Queqiao on `/earth` and `/moon`,
   Queqiao-2, CAPSTONE, Gateway, Pallas, Hygiea, Quaoar, Arrokoth, Sedna). Image sourcing stays a content task. The
   data test requires every file on disk and every resident mapped or in its `NO_THUMB` list.
7. **Founding missions (O4, O5, decision 9).** 23 of 38 `firsts` are links in all 14 locales: 14 added (Pioneer 10,
   Voyager 1 and 2 ×3, Dawn, New Horizons ×2, Parker Solar Probe, Solar Orbiter, Mariner 4 and 10, Mars Express,
   Hope), the six locales' broken ids fixed (`hope` is `hope-probe`, `mariner-4` is `mariner4`; Mariner 2 has no
   page, so the id is removed). 15 stay text: no mission page exists (Luna 1, Syncom ×2, WMAP, Herschel + Planck,
   CAPSTONE, Queqiao, Mariner 2) or the entry is not a mission (Oort cloud, Sedna, Pluto and Ceres discovered).
   GPS, GLONASS and Molniya do not link to their fleet entries (decision 9: a programme page behind "Navstar 1"
   misleads). On `/explore` a link opens the mission panel in place over the regime panel, which stays mounted; on
   the Worlds it is an anchor to `/missions?id=`. Since L45 ([UXD-025](UXD-025-lists-carry-a-round-photo.md)) a
   linked first also shows the mission's 28 px photo before the year.
8. **No country tag (O4).** The trailing parenthetical is removed when its whole content is a country or agency
   (34 labels × 14 locales); `(Piazzi, Italy)` keeps the person (`(Piazzi)`), `(Vesta)` and `(Tombaugh)` likewise.
   The four labels without a tag (GLONASS Block I, Herschel + Planck, Mars Express, Hope) keep their "first ESA /
   UAE mission". A deletion, not new text: no translation call.
9. **O5, the mission-list review after H (decision 10) is not part of this slice.** It waits on the Kaguya and
   Chandrayaan-2 ids of the H list; the additions (MESSENGER, Cassini, "first orbiter" firsts) and the request for
   Mariner 2 and Luna 1 mission pages are C5b.

## Consequences

The ruler is wider on the Worlds' long-name locales (up to 280 px against 208) and reads one line per row; at
1280×720 the column is 386 px tall with the readout open (measured: readout 125, chip 30, ruler 215, two 8 px gaps), inside the 522 px between the chip rows and the
footer. On a window under 560 px high the ruler starts folded. Eight scene shapes were added that nobody has
reviewed against the product's look yet. The Lagrange rings depend on the scene's residents being on screen (they
follow each resident's world position, so a resident behind the planet is behind the planet). The `/moon` regimes
NRHO, L2 and HILL land within 0.35 scene units of each other, so only the shape kind (annulus, ring, shell)
tells them apart. The panel's stat reads differently in 13 locales (the localised unit and grouping). The
`/explore` 2D Kuiper belt (`auToPx` 430–470) and the 3D belt (460–620) still disagree, as before. The edge lines
are `Line2` (screen-width), the annulus fill is not screen-constant.

Not covered: the Explore regimes with a camera far out (no check that the schematic rings are in view on every
window); a pointer-less device with a keyboard on a phone-width window; the touch highlight behind the bottom
sheet (the sheet may cover the lower half of the scene).

## Verification

Unit: `orbit-regime-format.test.ts` (14 locales × 24 regimes equal the old ruler string except `5.0`),
`orbit-regime-geometry.test.ts` (every regime of the four bundles has a shape; the `/earth` radii equal
`altToSurfaceScene`; the Explore table equals `PLANETS[].orbitR` and the belt constants), `regime-highlight.test.ts`,
`ruler-collapse.test.ts` (saved choice, short-window default, blocked storage), `OrbitRuler.test.ts` (markup
contract), `orbit-regimes.data.test.ts` (every `mission_id` of every locale exists in the mission index; identical
tuples in 14 locales; the 23 expected ids; no country tag; every thumbnail on disk; every resident mapped or listed).
E2: `tests/e2e/orbit-ruler.spec.ts` on the three projects (one line per row in seven locales and in the drawer;
hover, focus, click and close set and clear `data-regime-highlight`, one pixel-difference check per route; the
fold and its persistence; the column's boxes disjoint with the readout open at 1440×900 and 1280×720; the photos;
the founding-mission links; the German Hope link). `footer-dock.spec.ts` gained the readout; the `chip.spec.ts` test
whose premise (the ruler stepping right of the chip) is gone was removed.
