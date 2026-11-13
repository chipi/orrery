# Slice C4 + C5 brief — the orbit ruler and its data (O1, O2, O3, O4, O5, O7, W2, W4)

Read-only brief, written at HEAD `39157b00765` on `tech-debt/0.9.9` (A1–A6 and B1–B3 are briefs or built; C1–C3 are built and untested in a browser). Method: `git grep`, reading
files from the repo root and three one-off read-only node scripts over `i18n-src/`, `static/data/` and `static/images/` (their output is quoted below; the scripts are in the session scratchpad, not in the repo).
Nothing was built, run in a browser or measured: every pixel figure is CSS arithmetic or a character-width estimate (see §14). No code was changed.

## 0. Answer first

1. **C5 first, and it is data only.** 14 founding-mission links are added (`pioneer-10`, `voyager-1`, `voyager-2`, `dawn`, `new-horizons`, `parker-solar-probe`, `solar-orbiter`, `mariner4`, `mariner10`, `mars-express`, `hope-probe`: all 11 ids exist) taking the ruler from 9 to 23 linked firsts of 38; the trailing country/agency tag is stripped from 34 labels in 14 locales; and six locales already carry **broken** ids (`mariner-2`, `mariner-4`, `mariner-10`, `mariner2`, `hope`) that this fixes.
2. **C4 layout:** every row is one line (the ruler grows to fit its longest row, nowrap + ellipsis + title), the ruler collapses to its header (remembered), and on the Worlds the locate chip, the "AS SEEN FROM YOU" readout and the ruler become **one bottom-left stack** (no more JS shifting the ruler right of the chip).
3. **C4 scene:** hovering or focusing a band draws that regime in the scene (annulus + edge rings for a band, one ring for a single altitude, a pin-style marker for a Lagrange point, a shell for a Hill sphere); clicking opens the panel and the highlight stays while the panel is open. One pure module owns regime to radius for all four scenes.
4. **C4 panel:** "who lives here" shows the body's own 1x1 thumbnail (49 of 64 residents have one; the other 15 keep the agency-coloured dot), agency colour moves to a 2 px edge.
5. **Needs the operator before code:** 12 questions in §12 (ring colour vs the no-teal rule, camera on click, how L2/Moon rings read on the compressed /earth scale, three Explore regimes beyond the scene, persistence of the collapse, thumbnails for the 15 without one, and four smaller ones).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 172–178, 269, 271; slice rows 351–352)

| ID | Text | State at HEAD |
|---|---|---|
| O1 | Ruler too narrow: some rows (scattered) wrap to 2 lines; one row per item. | `.ruler` is a fixed 208 px (152 px under 720 px non-touch), `.band` is a grid `10px 1fr auto`: the name column may wrap, the altitude is `nowrap` (`OrbitRuler.svelte:195, 237–276, 317–340`). Estimate in §2.2: 12 of 336 regime×locale rows exceed the 138 px a row has (en-US `SCATTERED` + `50–1,000 AU` = 141 px). |
| O2 | Hover a segment: show that region in the scene as rings; same on click (now only a panel opens). | `OrbitRuler` has `onSelect` only (`:36`); no hover callback; nothing in any scene reads a regime id. `buildOrbitRings` (`earth-orbital-rings-layer.ts:105`) is exported and **not called anywhere** (`SurfaceScene.svelte:89` imports only `buildMoonGhost`). |
| O3 | "Who lives here": a small image of each body instead of dull grey circles. | `RegimePanel.svelte:148` draws `.agency-dot`; `agencyColor()` (`:71–92`) returns `rgba(255,255,255,0.5)` for `NATURAL` (all 20 Explore residents) and any unknown agency. |
| O4 | Founding missions are links (few are; check we have them). Remove the country code. | `firsts[].mission_id` exists in the schema and renders `<a href=/missions?id=…>` (`RegimePanel.svelte:171–175`), but only 9 of 38 labels set it, **per locale and unequal** (§6). 34 of 38 labels end in a parenthetical country/agency tag in all 14 locales. |
| O5 | With new missions added, review the mission list per orbit segment. | Plan row C5: "lists reviewed after H" (H = MI5/PG7/FL3 ids: Kaguya/SELENE and Chandrayaan-2, plan lines 397–399). Candidate gaps in §6.4. Waits on H. |
| O7 | Collapse / minimise the orbit ruler. | None. The file header says "never hidden or collapsed" (`OrbitRuler.svelte:13`), from the 2026-06-22 "always visible" direction; the operator now asks for the opposite. |
| W2 | "View from my location" overlaps the orbit ruler. | `.locate-slot` (`moon/+page.svelte:346–353`, `earth/+page.svelte:247–`) is `position:absolute; left:12px; bottom:var(--legend-top)`; the ruler steps right of it through a MutationObserver effect in `SurfaceScene.svelte:1214–1269` (`--ruler-left`, `--ruler-clear`). |
| W4 | "As seen from you" overlaps the ruler when shown. | `.moon-observer` is `position:absolute; left:12px; bottom:calc(106px + safe-area)`, `min-width:190px`, `max-width:min(70vw,260px)` (`moon/+page.svelte:372–386`). The `--ruler-left` effect measures `.locate-slot .ui-chip` only, not the readout; no e2e opens the readout (`grep moon-observer tests/e2e` finds nothing). Only `/moon` has the readout (`moon_view_eyebrow` = "AS SEEN FROM YOU"); `/earth` has the chip, `/mars` has neither (`grep -i "locate\|observer" mars/+page.svelte` is empty). |

**Not in C4/C5 (other slices):** O6 science cards (B2, UXD-010/022, built); the close X (B1); Vega pill and bottom-left scale strip (C3); chip grouping (A5).

## 2. Current state (file:line at `39157b00765`)

### 2.1 Where the ruler is mounted

| Route | Mount | Data | Notes |
|---|---|---|---|
| `/explore` | `routes/explore/+page.svelte:2424–2433` inside `.ruler-desktop-only` (`--ruler-top-clear:150px`, `:2571–2573`; `--ruler-clear:104px` under 600 px, `:2576–2580`); `anchorBottomPx` default 80 | `orbit-regimes-explore.json`, 8 zones (SUN, TERRESTRIAL, BELT, GIANTS, KUIPER, SCATTERED, HELIOPAUSE, OORT), `distance_au`; `surfaceAnchor={null}` | shown only at `contextId === 'solar-system'` and no black hole. Touch: `display:none`, the ruler is a drawer tab (`HudControls.svelte:253–264`, `mobileRulerContent`) |
| `/earth` | `earth/+page.svelte:226–233` inside `.ruler-desktop-only`, `anchorBottomPx={14}`, curated `order`, gated by `orbitsInView` | `orbit-regimes.json`: LEO, MEO, GEO, HEO, MOON, L2 | locate chip `data-testid="earth-locate-me"` in the scene's `barStart` snippet (`:195–211`), `locateReservePx={44}` |
| `/moon` | `moon/+page.svelte:331`, `anchorBottomPx={14}` | `orbit-regimes-moon.json`: LLO, HLO, NRHO, L2, HILL | chip `moon-locate-me` (`:283–296`) and the readout (`:303–325`) |
| `/mars` | `mars/+page.svelte:269`, `anchorBottomPx={14}` | `orbit-regimes-mars.json`: LMO, HMO, AREOSTATIONARY, DMO, HILL | no chip, no readout |
| Worlds on touch | `SurfaceScene.svelte:5597–5609` (`mobileRulerContent`), a second `OrbitRuler` in the drawer | same `regimes` prop | `.mdg-body .ruler` is reset to static, full width, no card chrome (`explore/+page.svelte:2585–2607`, `SurfaceScene.svelte:7665`) |

The panel is `RegimePanel.svelte` (Panel shell, `zIndex={28}`, DS §4.7 row 28). Regime text lives in per-locale overlays `i18n-src/<loc>/<bundle>/<ID>.json` (14 locales × 4 bundles), merged by `loadOrbitRegimes` (`data/bodies.ts:105–120`) from the i18n bundle; the base JSON holds `altitude_km` / `distance_au` and `color` only.

### 2.2 Row width (O1)

Arithmetic, border-box assumed (not measured): ruler 208 − 24 padding − 2 border = 182; `.band` border 2 + padding 16 → 164; minus the 10 px dot and two 8 px gaps = **138 px for name + altitude** (phone-width non-touch window: 152 → 100 px). Space Mono advance 0.612 em at `--size-label` 11 px = 6.7 px/char; the name adds `letter-spacing: .06em`. Script result over the 14 locales × 24 regimes = 336 rows:

- over 138 px: **12 rows**: ru SCATTERED `РАССЕЯННЫЙ` + `50–1 000 а. е.` 168; de SCATTERED `STREUSCHEIBE` 163; fr TERRESTRIAL `TELLURIQUES` 149; hi SCATTERED 148; nl SCATTERED 148; de/es/nl/pt-BR TERRESTRIAL 141; en-US SCATTERED 141; hi BELT 141; hi mars HILL 140 (`10,80,000 km`, lakh grouping).
- over 100 px (the 152 px non-touch window): 164 of 336.
- Other findings in the same code: `fmtAU` prints `5.0–30 AU` for GIANTS (each end uses `x < 10 ? 1 : 0` decimals, `OrbitRuler.svelte:112–116`); the `RegimePanel` stat is **not localised**: `fmtKm`/`fmtAU` hard-code `'en-US'` grouping and the literal `km` / `AU` (`RegimePanel.svelte:50–66`), while the ruler uses `m.mp_flight_unit_km`, `m.unit_au_value` and the 万/만/लाख rule (`OrbitRuler.svelte:93–111`).

### 2.3 What is in the bottom-left corner today

| Element | Where | Position |
|---|---|---|
| Ruler | route, `.ruler` | `left: var(--ruler-left,12px)`, `bottom: max(var(--ruler-bottom), var(--ruler-clear))`, z 1, pointer events only on children |
| Locate chip `.locate-slot` | route, inside the scene's bar slot | desktop `left:12; bottom: var(--legend-top, 60px+safe)`, z 7; touch: static, first icon of the bottom bar, text visually hidden |
| `.moon-observer` | route | `left:12; bottom:106px`, z 7 |
| Tier-context card (`TierContextCard.svelte`, Moon/Mars imagery) | scene | `--card-bottom = 48 + legendH + 8 + locateReservePx` |
| INDEX pull tab | scene | `indexHandleTop` effect measures `.tier-context-card`, `.locate-slot`, `.ruler` (`SurfaceScene.svelte:1175–1213`) |
| Nation legend | scene, centred, bottom 48 | its top edge is published as `--legend-top` (`:1119–1126`) |
| Footer | global | `--ruler-clear` lifts the ruler above it on narrow windows (`:1246–1252`) |

Existing e2e: `footer-dock.spec.ts:125–262` (Explore parts incl. `.ruler`, eight sizes; Worlds parts incl. `.ruler`, `.locate-slot`, four routes × five sizes, readout not included), `chip.spec.ts:475–496` (`/earth` locate chip vs ruler at 1280×720), `science-links-cap.spec.ts:92–` (one card per Explore pane), `select-focus.spec.ts:165–200` (`button.resident-link`, `.resident-label`).

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

Desktop 1440×900 and 1280×720 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`):

1. `/explore` at the solar-system level: ruler expanded; one band hovered (before: nothing in the scene); `?regime=KUIPER` panel open; ruler collapsed. 1440×900 and 1280×720; also `?lang=de`, `ru`, `hi` at 1280×720 (O1 rows).
2. `/earth` at the default camera: ruler expanded with LEO, MEO, GEO, HEO, MOON, L2 each hovered in turn (six shots); locate chip visible.
3. `/moon`: before the readout, after "View from my location" resolves (geolocation granted), at 1280×720 and 1440×900: this is W4. Plus a shot at a tier with the imagery card.
4. `/mars`: ruler, LMO and HILL hovered.
5. `/earth?regime`-style panel: `RegimePanel` for LEO (4 residents, all with thumbs), GEO (2 with thumbs, 2 without: Meteosat, Fengyun), MOON (3 without), HEO (3 without); `/explore?regime=GIANTS` (4 thumbs, 5 links in Firsts), `?regime=BELT` (Ceres, Vesta with thumbs; Pallas, Hygiea without).
6. Phone 390×844 and landscape 844×390: the drawer with the Ruler tab, one row per line; the regime sheet with thumbs; after a tap the highlight in the scene behind the sheet (Earth, Explore).
7. Collapsed state on `/explore` and `/moon` with the readout open, 1280×720 and 1100×700.

## 4. Proposal per feedback item

### 4.1 O1 — one row per item

`OrbitRuler.svelte`: `.ruler { width: max-content; min-width: 208px; max-width: min(280px, 44vw) }` (phone-width non-touch: `min-width:152px; max-width:56vw`), `.band-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0 }` and a `title` carrying the regime's full `name` (no new key), `.band-alt { white-space: nowrap }`, name letter-spacing `.06em` to `.04em`. In the drawer (static, full width) rows are never narrower than the drawer. Alternative (not recommended): keep 208 px and shorten names; rejected because `STREUSCHEIBE`/`РАССЕЯННЫЙ` are the locale's own short names and the overlay `short` fields are translator-owned.
Fix in the same file: extract `fmtBand`/`num` to `src/lib/orbit-regime-format.ts` and use it in both the ruler and `RegimePanel` (§2.2: the panel's stat becomes localised; GIANTS prints `5–30 AU`: drop a trailing `.0`). Test over every locale and regime: formatted string equals the old ruler string except the `.0`.

### 4.2 O7 — collapse

Header becomes one `<button class="ui-hit">` (not a Chip: Chip's contract is `aria-pressed`, a disclosure needs `aria-expanded` / `aria-controls`; same pattern as `TierContextCard.svelte:60–72`): `ORBIT RULER ▾/▸`. Collapsed = header only (about 32 px), plus the flagged regime's short name when an orbiter is selected (`▸ LEO`) so the "which section is it in" cue (2026-06-22 note, `OrbitRuler.svelte:37–40`) survives. Keys: 2 new, `ruler_collapse_aria`, `ruler_expand_aria`. State: remembered in `localStorage` (`orrery.ruler.collapsed`, try/catch, default expanded), forced collapsed on first paint below 560 px viewport height unless the viewer chose; the touch drawer keeps its own tab (no collapse there). Persistence contradicts IA §state-persistence ("No state is persisted") and the Explore comment "Runtime-only state per CLAUDE.md"; precedent is `TierContextCard.svelte:27–50` (`orrery.surface.tierCardExpanded`). Decision 5.

### 4.3 W2 + W4 — one bottom-left stack

New `src/lib/components/HudStackBL.svelte`, rendered by `/earth`, `/moon`, `/mars` (Explore has no chip or readout: it keeps the bare ruler). A flex column anchored `left:12px; bottom:` the same clearance the ruler uses today (`max(14px, --ruler-clear)`), `gap:8px`, children top to bottom: readout (Moon only, when resolved) / locate chip (desktop pointers) / ruler (bottom). Phone: the stack renders only the readout above the scene bar; the chip stays the first icon of the bar and the ruler stays in the drawer. One DOM instance of the chip (it carries `data-testid="earth-locate-me"` / `moon-locate-me`; two would break strict locators), so the route passes the chip as a snippet and `matchMedia('(hover: none), (pointer: coarse)')` decides which host renders it.
Removed: the `--ruler-left` / `--ruler-clear` effect (`SurfaceScene.svelte:1214–1269`), `.moon-observer` absolute positioning, `anchorBottomPx` on the three Worlds, `locateReservePx` adjustments that only existed to dodge the ruler. Kept: `--legend-top` for the stack's bottom edge above the nation legend, `indexHandleTop` (its measurement list changes `.locate-slot`, `.ruler` to `.hud-stack-bl`), `--ruler-clear` for the footer. The tier-context card stays outside the stack and clears it by a measured `--hud-stack-top` custom property (Decision 7).
Height arithmetic at 1280×720, `/moon` with the readout open (not measured): ruler about 214 px (padding 18 + title 24 + 5 bands × 26.5 + gaps 8 + surface row 30 + border 2), readout about 130, chip 30, two gaps 16 = **about 390 px**; room = 720 − 150 (chip rows, `--ruler-top-clear`) − 48 (footer) = 522 px: fits. At 1100×700 502: fits. At the non-touch 800×375 test size 177 px: does not fit, so the ruler starts collapsed there (§4.2), and the stack caps `max-height` and scrolls the ruler as `.ruler` does today.

### 4.4 O2 — draw the regime in the scene

**Component API.** `OrbitRuler` gets `onPreview?: (id: string | null) => void` (`pointerenter`/`pointerleave`/`focus`/`blur` on a band; cleared on collapse) and `activeRegime?: string | null` (the regime whose panel is open; band takes `aria-current` and the active look; `highlightRegime` stays the orbiter-flag cue). Routes forward to the scene: `SurfaceScene` gets `setRegimeHighlight(hover: string | null, active: string | null)` (via the existing `bind:this`), Explore gets a `regimeHighlightFn` beside `focusBodyFn` (`explore-scene-host.ts:426, 2014, 4950`). Touch has no hover: a tap is click, the highlight is the active one behind the sheet.

**One pure module** `src/lib/orbit-regime-geometry.ts` (unit-tested): `regimeShape(scene, regime, ctx) → {kind:'band'|'ring'|'marker'|'shell', inner, outer?, center?}`. Radii come from the same functions that place the objects, never a second formula:

| Scene | Radius source | Regime to shape (numbers by arithmetic) |
|---|---|---|
| `/earth` (planet radius 30) | `altToSurfaceScene(30, alt) = 30 + 5.2·log10(1 + alt/200)` (`scale.ts:60, 84`), as `earth-satellite-layer.ts:125` | LEO band 31.33–35.42; MEO band 35.42–41.74; GEO ring 41.74; HEO band 34.05–42.48 (perigee/apogee; the true shape is an ellipse, an annulus is the honest compression); MOON ring at `moonR` (where the ghost is, `SurfaceScene.svelte:2145–2154`); L2 marker (Decision 3) |
| `/moon`, `/mars` (planet radius 30) | `planetRadius + 4 + 5·log10(1 + alt/50)` (`surface-markers.ts:242`), extracted to a shared function | Moon: LLO 35.51–36.39; HLO 36.39–39.21; NRHO 42.93–49.73; L2 marker at 49.55; HILL shell 49.40. Mars: LMO 37.01–39.21; HMO 40.61–42.54; AREOSTATIONARY ring 46.67; DMO 47.01–48.67; HILL shell 55.67 |
| `/explore` (3D; scene units = `orbitR` in `explore-scene.ts`: Mercury 52, Venus 83, Earth 113, Mars 155, Jupiter 248, Saturn 320, Uranus 378, Neptune 430, Pluto 580) | one table in the module built from `PLANETS[].orbitR` and the belt constants (`explore-solar-scene.ts:112–152`: asteroid 195–237, Kuiper 460–620) | TERRESTRIAL band 52–155; BELT band 195–237; GIANTS band 248–430; KUIPER band 460–620; SUN ring around the Sun (the selection-ring look, 1.25 radii); SCATTERED, HELIOPAUSE, OORT: Decision 4 |
| `/explore` (2D) | `auToPx` (`scale.ts:35`) | same bands in px; note `auToPx(30..50) = 430–470` differs from the 3D Kuiper belt at 460–620 (existing inconsistency, not fixed here) |

Facts that shape this: on `/moon` the NRHO outer edge (49.73), L2 (49.55) and HILL (49.40) land within 0.35 units of each other, so only the shape kind (annulus vs marker vs shell) tells them apart. On `/earth` the log scale puts L2 at 50.15 and the Moon-regime objects at 47.07, both **inside** the Moon ghost's orbit (`moonR`, about 4× the planet radius by the code comment, `earth-orbital-rings-layer.ts:33–41`), i.e. the scene already contradicts the ruler's order MOON < L2; a ring at L2's own radius would repeat that contradiction.

**Look.** A band = translucent `RingGeometry` annulus (opacity 0.14, `DoubleSide`) plus two 1.5 px screen-constant edge lines; a single altitude = one 2 px line; a marker = the UXD-020 pin ring (44 px, 1.5 px) on each resident of the regime; a shell = three great circles at 1.2 px. Hover opacity 0.9; active pulses 0.55–0.9 on the C2 timing, no pulse under `prefers-reduced-motion`. Colour: Decision 1. Equatorial plane (XZ) on Earth/Moon/Mars, ecliptic on Explore. Hidden while `orbitsInView` is false (camera below the orbits, same gate as the ruler, `SurfaceScene.svelte:3949–3957`). No scene text (the ruler row already names it); no new keys. Dispose with the scene (`dispose-object3d.ts`).
**Test hook:** `data-regime-highlight="LEO:hover|LEO:active"` on the scene root, so e2e asserts state without pixels, plus one pixel-difference check (screenshot clip before/after hover) per route.
**Camera:** Decision 2.

### 4.5 O3 — thumbnails in "who lives here"

`RegimePanel.svelte` row: 28 px circular `<img alt="" loading="lazy" decoding="async">` with a 2 px border in the agency colour (so agency information is kept, `agencyColor()` unchanged), the resident text beside it; rows without a thumbnail keep today's dot. Class names `.resident-link`, `.resident-label` stay (`select-focus.spec.ts` uses them).
**Data** (script over `static/images/*/<id>/`, aliases `mars3-orbiter→mars3`, `viking1-orbiter→viking1`, `tianwen1-orbiter→tianwen1`, `hope→hope-probe`): of 64 residents, **49 have `01.1x1.jpg`** (earth 15 of 21, moon 8 of 12, mars 11 of 11, explore 15 of 20 incl. the Sun at `static/images/sun/01.1x1.jpg`); **15 have no image folder at all**: Meteosat, Fengyun, Tundra, IBEX, Chandrayaan-2 (earth MOON), Queqiao (earth MOON and moon L2), Queqiao-2, CAPSTONE, Gateway, Sedna, Quaoar, Arrokoth, Pallas, Hygiea. `1x1` is the pipeline's only generated ratio and the surface scenes read it exclusively (AGENTS.md "Variant policy"). A resident id means different things per bundle (`lro`, `queqiao`, `galileo` appear in two), so the map is keyed per bundle: `static/data/orbit-regime-thumbs.json` `{ "orbit-regimes/iss": "/images/earth-objects/iss/01.1x1.jpg", … }`, 49 hand-reviewed entries. A unit test requires every listed file on disk and every resident either mapped or in an explicit `NO_THUMB` list of the 15 (a new resident forces a decision). Sizes: Jupiter's thumb is 22 KB (`ls`); a panel shows at most 6, so about 130 KB; the others were not measured.
Decision 6 covers the 15.

## 5. C5 — mission-link table (every `firsts` entry, en-US; ids checked against `static/data/missions/index.json`, 126 ids, identical to the 126 files)

| Regime | Year · label | `mission_id` today | Page exists? (id, file) | After C5 |
|---|---|---|---|---|
| earth LEO | 1957 Sputnik 1 | `sputnik1` | yes `missions/earth/…` | link |
| earth LEO | 1961 Vostok 1 | `vostok-1` | yes | link |
| earth MOON | 1968 Apollo 8 | `apollo8` | yes | link |
| earth MOON | 1959 Luna 1 | none | **no** (index has `luna9`, `luna10`, `luna16`, …) | text |
| earth MEO | 1978 Navstar 1 / 1982 GLONASS Block I | none | **no** mission; fleet entries `gps-gnss`, `glonass` exist (programme level) | text (Decision 9) |
| earth GEO | 1963 Syncom 2 / 1964 Syncom 3 | none | **no** | text |
| earth HEO | 1965 Molniya 1-01 | none | **no** mission; fleet `molniya` | text (Decision 9) |
| earth L2 | 2001 WMAP; 2009 Herschel + Planck | none | **no** | text |
| moon LLO | 1966 Luna 10; 1968 Apollo 8 | `luna10`, `apollo8` | yes, yes | link |
| moon HLO | 1966 Luna 10 | `luna10` | yes | link |
| moon NRHO | 2022 CAPSTONE | none | **no** | text |
| moon L2 | 2018 Queqiao | none | **no** (`change4` is the lander, not the relay) | text |
| mars LMO | 1971 Mariner 9 | `mariner9` | yes | link |
| mars LMO | 2003 Mars Express | none | **yes `mars-express`** (`missions/mars/mars-express.json`) | **add link** |
| mars HMO | 1971 Mariner 9 | `mariner9` | yes | link |
| mars DMO | 2021 Hope | none (`hope` in de, hi: broken) | **yes `hope-probe`** (`missions/mars/hope-probe.json`) | **add link** |
| explore OORT | 1950 Oort cloud proposed | none | not a mission | text |
| explore HELIOPAUSE | 2012 Voyager 1 crosses | none | **yes `voyager-1`** (`missions/saturn/`) | **add link** |
| explore HELIOPAUSE | 2018 Voyager 2 crosses | none | **yes `voyager-2`** (`missions/neptune/`) | **add link** |
| explore SCATTERED | 2003 Sedna discovered | none | not a mission | text |
| explore KUIPER | 1930 Pluto discovered | none | not a mission | text |
| explore KUIPER | 2015 New Horizons Pluto flyby; 2019 at Arrokoth | none | **yes `new-horizons`** (`missions/pluto/`) | **add link** ×2 |
| explore GIANTS | 1973 Pioneer 10 | none | **yes `pioneer-10`** (`missions/jupiter/`) | **add link** |
| explore GIANTS | 1986 Voyager 2 Uranus; 1989 Voyager 2 Neptune | none | **yes `voyager-2`** | **add link** ×2 |
| explore GIANTS | 1995 Galileo | `galileo` | yes | link |
| explore BELT | 1801 Ceres discovered | none | not a mission | text |
| explore BELT | 2011 Dawn | none | **yes `dawn`** (`missions/ceres/dawn.json`) | **add link** |
| explore TERRESTRIAL | 1962 Mariner 2 | none (`mariner-2`/`mariner2` in ar, hi, ja, ru: broken) | **no** | text; remove the broken ids |
| explore TERRESTRIAL | 1965 Mariner 4 | none (`mariner-4` in ar, hi, ja: wrong; index id is `mariner4`) | **yes `mariner4`** (`missions/mars/mariner4.json`) | **add link** |
| explore TERRESTRIAL | 1974 Mariner 10 | none (`mariner-10` in ar, hi, ja: wrong; index id `mariner10`) | **yes `mariner10`** (`missions/mercury/mariner10.json`) | **add link** |
| explore SUN | 2018 Parker Solar Probe; 2020 Solar Orbiter | none (set in es, zh-CN only) | **yes `parker-solar-probe`, `solar-orbiter`** (`missions/sun/`) | **add link** ×2 |

Count (en-US, 38 labels): 9 linked today; 14 added (V1 ×1, V2 ×3, Pioneer 10, Dawn, New Horizons ×2, Parker, Solar Orbiter, Mariner 4, Mariner 10, Mars Express, Hope = 14); **23 linked** after; 15 stay text (Luna 1, Navstar, GLONASS, Syncom ×2, Molniya, WMAP, Herschel + Planck, CAPSTONE, Queqiao, Oort, Sedna, Pluto discovery, Ceres discovery, Mariner 2). Every entry the plan lists (Pioneer 10, Voyager 1/2, Dawn, New Horizons, Parker, Solar Orbiter, Mariner 4/10, Mars Express, Hope) has a page.

**Defect found (not in the feedback):** `mission_id` lives in the **locale overlay**, so each locale carries its own set: counts per locale en-US/fr/it/ko/nl/pt-BR/sr-Cyrl 9, de 10, es/zh-CN 11, ar/ja/ru 12, hi 13. Six locales point at ids that do not exist (`mariner-2`, `mariner2`, `hope`) or at the wrong id shape (`mariner-4`, `mariner-10`; `/missions?id=` takes `mariner4`, `mariner10`), so a click in those locales opens nothing. Fix: all 23 ids set in all 14 overlays, plus a unit test (§8) so drift fails the build. Considered and rejected: moving `mission_id` to the base file (labels are per-locale, so it would need positional matching and a changed merge in `loadOrbitRegimes`).

**Link behaviour.** On `/explore` a first's link opens the mission panel in place over the regime panel (UXD-019 decision 7, Q4 approved; `openMissionInPlace`, `explore/+page.svelte:295–297`; `onMissionLinkClick` in `missions-linkify.ts:194`), new `onMissionOpen` prop on `RegimePanel`. On `/earth`, `/moon`, `/mars` it stays an anchor to `localHref('/missions?id=…')` (the Worlds have no in-place mission panel: `SurfaceScene.svelte:6528` also navigates). `linkifyMissionEntry` is not used: it splits on the em dash and would read "Voyager 1 crosses the heliopause" as the name.

## 6. C5 — country-code stripping list and the O5 review

### 6.1 What is stripped

34 of 38 `firsts` labels end in a parenthetical tag in all 14 locales (counted); the four without one are GLONASS Block I, Herschel + Planck, Mars Express, Hope (their country/agency is part of the claim: "first UAE mission", "first ESA Mars mission"; kept). Distinct tails found:

| Locale | Tails (count) |
|---|---|
| en-US | USA 22, USSR 6, China 1, Netherlands 1, ESA 1, `Piazzi, Italy`, `Vesta, USA`, `Tombaugh, USA` |
| de | USA 22, UdSSR 6, China, Niederlande, ESA, `Piazzi, Italien`, `Vesta, USA`, `Tombaugh, USA` |
| fr | États-Unis 22, URSS 6, Chine, Pays-Bas, ESA, `Piazzi, Italie`, … |
| es | EE. UU. 21 + `EE.UU.` 1, URSS 6, China, Países Bajos, ESA, `Piazzi, Italia`, … |
| it | USA 22, URSS 6, Cina, Paesi Bassi, ESA, `Piazzi, Italia`, … |
| nl | VS 22, Sovjet-Unie 6, China, Nederland, ESA, `Piazzi, Italië`, … |
| pt-BR | EUA 22, URSS 6, China, Holanda, ESA, `Piazzi, Itália`, … |
| ru | США 22, СССР 6, Китай, Нидерланды, ESA, `Пьяцци, Италия`, `Веста, США`, `Томбо, США` |
| sr-Cyrl | САД 22, СССР 6, Кина, Холандија, ESA, `Пјаци, Италија`, … |
| ar | الولايات المتحدة 22, الاتحاد السوفييتي 5 + السوفيتي 1, الصين, هولندا, ESA, `بيازي، إيطاليا`, … |
| hi | अमेरिका 22, सोवियत संघ 6, चीन, ESA; **English left in**: `Italy`, `USA`, `Netherlands` |
| ja | アメリカ 21, USA 1, ソ連 6, 中国, ESA; **English left in**: `Italy`, `USA`, `Netherlands` |
| ko | 미국 22, 소련 6, 중국, ESA; **English left in**: `Italy`, `USA`, `Netherlands` |
| zh-CN | 美国 18, USA 4, 苏联 6, 中国, ESA; **English left in**: `USA`, `Netherlands`, `Tombaugh, 美国` |

(Four of these locales have untranslated English tails: a second reason to drop the tag.) Rule, one per entry: remove the trailing parenthetical when its whole content is a country or agency; when it is `person/target, country` keep the first part: `(Piazzi)`, `(Vesta)`, `(Tombaugh)`; `Jan Oort (Netherlands)` becomes `Jan Oort`. Full-width `（）` in ja/zh handled. The result is a data edit in `i18n-src/<loc>/orbit-regimes*/` (532 label fields across 14 locales, mission_id added in the same pass), then the bundle rebuild the repo already runs for overlays; no translation call is needed (a deletion, not new text), so no paid run and no glossary entry. Unit guard (§8): no `firsts` label ends in `)`/`）` whose content matches a country/agency word list per locale, built from the table above.

### 6.2 What is not stripped

Residents' parentheticals are dates (`Lunar Prospector (1998-1999)`), not countries: untouched. The agency dot colour stays.

### 6.3 O5 — review after H

Gated on H (Kaguya/SELENE and Chandrayaan-2 ids). Candidate gaps from a script over `missions/index.json` (uncrewed, not named by any ruler list as a resident or link): **Explore** TERRESTRIAL: MESSENGER 2004 and BepiColombo 2018 (Mercury has only Mariner 10 as a first; "first Mercury orbiter" is MESSENGER); GIANTS: Cassini/Huygens 1997 (Saturn, no first listed), Juno 2011, Pioneer 11 1973, Voyager 1 (Jupiter/Saturn), Europa Clipper, JUICE; asteroid/comet content (Rosetta, Hayabusa2, OSIRIS-REx, DART, Lucy, Psyche) has no regime on the ruler (BELT lists only Dawn). **Moon:** Chang'e 3/4/5/6, Chandrayaan-3, SLIM, Beresheet are landers/sample returns (not ruler content); LRO/Lunar Prospector/Chandrayaan-1/Chang'e 2 already residents; Kaguya and Chandrayaan-2 are the H additions (LLO/HLO). **Mars:** `tianwen1` and `hope-probe` exist as missions while the residents use scene ids (`tianwen1-orbiter`); MAVEN, MRO, Odyssey, TGO, Mangalyaan are residents. This needs an editorial pass (which "firsts" to add: e.g. Cassini "first Saturn orbiter 2004", MESSENGER "first Mercury orbiter 2011"), done as C5b after H, each new first with a `mission_id` and 14-locale text through the repo's translation tools; the brief does not draft the text (Decision 10 is the scope).

## 7. i18n impact

- **New message keys: 2** (`ruler_collapse_aria`, `ruler_expand_aria`) in `messages/en-US.json` and 13 locales, derived from each locale's existing `earth_orbit_ruler_title` wording; glossary-first: no new name or term, "orbit ruler" already has a bound translation per locale (check `static/data/glossary/native-terms.json` before drafting, not done here).
- **No new key** for the row `title` (regime `name`), the thumbnails (`alt=""`, text adjacent) or the scene highlight (no scene text).
- **Data:** 532 `firsts` label edits and the `mission_id` set made equal in 14 overlays (§5, §6). No `en-US` claim text changes except the tail removal.
- **Formatting:** `RegimePanel` stat moves to the localised formatter (`km`/`AU`/万/lakh as the ruler, §4.1): visible text change in 13 locales for every regime panel; no new key.
- Locale checks to run after: `validate-data`, the overlay parity tests (`src/lib/science-links.test.ts` already walks the four bundles, `:26–29`), the length rule for the ruler `short` fields (unchanged).

## 8. Data changes

1. `i18n-src/<14>/orbit-regimes{,-moon,-mars,-explore}/*.json`: tails removed, `mission_id` as §5 in all 14.
2. `static/data/orbit-regime-thumbs.json` (new, 49 entries) + `NO_THUMB` list of 15 in the test.
3. No change to the base `orbit-regimes*.json` (altitudes, colours) and no new image. Hill-sphere, L2 and the like use the existing numbers.
4. `static/data/schemas/orbit-regimes*.schema.json`: confirm `mission_id` is permitted per first (`orbit-regimes.schema.json`; not opened).

## 9. Tests to add or change

**Unit (vitest):**
- `src/lib/orbit-regime-format.test.ts`: 14 locales × 24 regimes equal the old ruler strings (but `5–30`), panel and ruler agree.
- `src/lib/orbit-regime-geometry.test.ts`: every regime id of the four bundles has a shape; `/earth` values equal `altToSurfaceScene` (31.33, 35.42, 41.74, 34.05, 42.48, 50.15); shapes are the same functions the objects use (`earth-satellite-layer`, `surface-markers`); Explore table equals `PLANETS[].orbitR` and the belt constants; bands are ordered like the ruler.
- `src/lib/orbit-regimes.data.test.ts` (new, next to `science-links.test.ts`): every `mission_id` of every locale exists in `missions/index.json`; the `(bundle, regime, year, mission_id)` tuples are identical in 14 locales; the 23 expected ids are present; no label ends in a country/agency tail; every thumb path exists on disk; every resident is mapped or in `NO_THUMB`.
- `OrbitRuler` component test (as `Chip.test.ts`): collapse toggles `aria-expanded`, writes and reads `orrery.ruler.collapsed`, survives blocked storage; `onPreview` fires on pointer and focus, clears on blur/leave/collapse.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`), new `tests/e2e/orbit-ruler.spec.ts`:**
1. One line per band on `/explore`, `/earth`, `/moon`, `/mars` at 1280×720 in en, de, ru, fr, hi, nl, ja: every `.band` height below 1.6 line heights; the drawer ruler on the two mobile projects.
2. Hover and keyboard focus of a band set `data-regime-highlight="<ID>:hover"`; leaving clears it; click opens the panel and sets `:active`; closing the panel clears it; one screenshot-clip pixel difference per route.
3. Collapse: bands hidden, header remains, `aria-expanded=false`, state survives reload, stack has no overlap collapsed or open.
4. Stack (desktop only): `/moon` after granting geolocation, 1440×900 and 1280×720, boxes of `.moon-observer`, `.locate-slot`, `.ruler`, `.tier-context-card` (at a tier with imagery) pairwise disjoint; same on `/earth`.
5. Panel: `?regime=GIANTS` shows 4 loaded thumbs (`naturalWidth > 0`); `?regime=BELT` shows Ceres, Vesta thumbs and Pallas, Hygiea dots; `button.resident-link` / `.resident-label` still present.
6. Founding missions: `/explore?regime=GIANTS` Pioneer 10 link opens the mission panel in place and the regime panel is covered, not unmounted (as C1's rule); `/moon?regime=LLO` first link is an anchor to `/missions?id=luna10`; in `en`, `de`, `ru` no first label ends in a parenthetical country tag; the Hope link in `de` resolves (it was broken).

**Changed:** `footer-dock.spec.ts`: add the readout and `.hud-stack-bl` to `WORLD_HUD_PARTS`, keep Explore's eight sizes; `chip.spec.ts:475–496` replaced by test 4 (its premise, the ruler stepping right of the chip, is gone); `science-links-cap.spec.ts` and `select-focus.spec.ts` untouched (selectors preserved). Visual baselines: the PNGs were not searched for the ruler (NV4).

## 10. Docs to update by name

- **UXD-024** (new, `docs/uxs/decisions/UXD-024-orbit-ruler-one-row-draws-its-regime.md`; 024 is unused: `grep UXD-024 docs` returns nothing, 013 is also unused) covering C4 and C5; link from `UXD-010` consequences (the "other slices" line) and add the row to `docs/uxs/decisions/README.md` (after line 89).
- `docs/concept/05_Design_System.md`: §4.7 z-index (stack, z 7 as the chip) , §5.12/5.14 new "Regime highlight" row (annulus, edge lines, marker, shell; colour per Decision 1), §2.5 note, a new HUD-stack paragraph; §5.7 if the disclosure button is a documented exception to "everything is a Chip".
- `docs/uxs/UXS-014.md` line 35 area: a real "Orbit ruler" section (the plan row says "none today"); `UXS-005.md` (Earth) and `UXS-006.md` (Moon/Mars) one-paragraph pointers.
- `docs/uxs/IA.md`: §controls (ruler header disclosure), §state-persistence (the two UI-preference keys, if Decision 5 is yes).
- `docs/uxs/CHANGE-INVENTORY.md` rows C4 (line 45) and C5 (46): decisions column UXD-024, status.
- `docs/adr/TA.md` (HUD paragraph, around line 390), `src/lib/components/README.md` (OrbitRuler, RegimePanel, `HudStackBL`), `src/routes/explore/README.md`, `src/lib/surface-scene/README.md`, `src/lib/three/README.md` if the explore host gains the highlight, `docs/accessibility.md` (the ruler's keyboard: band focus previews, Enter opens).
- Header of `OrbitRuler.svelte` (the "never hidden or collapsed" paragraph is wrong after this slice).

## 11. Phased plan

1. **C5a data** (no UI risk; ships first): tails, 23 ids in 14 overlays, schema check, `orbit-regimes.data.test.ts` red first. Closes O4 and the six-locale broken ids.
2. **Shared pieces:** `orbit-regime-format.ts` (+ panel localisation), `onMissionOpen` on `RegimePanel`.
3. **C4a layout:** one-line rows (O1), collapse (O7), `HudStackBL` and removal of the `--ruler-left` effect (W2, W4), footer-dock and chip specs updated.
4. **C4b scene:** geometry module + tests, `/earth` and `/moon`+`/mars` highlight, then Explore 3D and 2D; `onPreview`/`activeRegime`.
5. **C4c thumbnails:** the map file, the panel row.
6. Docs and UXD-024 (written with the build, since the decisions are the operator's first), screenshots of §3, `npm run preflight` once before a push (not per change), `npm run preflight:coverage` because new `src/lib` modules are added (frozen ratchet R8).
7. **C5b (after H):** the O5 list review.

## 12. Decisions for the operator (recommendation first)

1. **Highlight colour.** UXD-020's rings are `#889fe7`, UXD-001 keeps regime colours as data colours, and five regime colours are teal (`#4ecdc4` LEO, LLO, LMO, TERRESTRIAL; `#7fd9d2` KUIPER, HLO, HMO) against "no cyan in rings". Pick one: **(a) all regime highlights `#889fe7`, the regime colour stays on the ruler dot only** (recommended: consistent with C2, no teal ring, the hovered row's position says which band); (b) regime colour (ties dot to ring, but teal rings); (c) regime colour with the teal ones remapped (changes data colours, bigger).
2. **Camera on click.** **(a) Highlight only, no camera move** (recommended: the plan says "rings", and a regime is a region, not an object); (b) frame the band only when it is partly out of view (zoom out, never in); (c) always fly like `focusBody`.
3. **`/earth` MOON and L2.** The log scale puts L2 (50.15) inside the Moon ghost's orbit, against the ruler's order. **(a) MOON = ring at the ghost's orbit; L2 = pin-style markers on its residents, no ring at its own radius** (recommended: L2 is a point, not an orbit, and this avoids repeating the contradiction); (b) draw both rings at the objects' radii and accept L2 inside MOON.
4. **Explore SCATTERED (50–1,000 AU), HELIOPAUSE (120 AU), OORT (50,000 AU) are beyond the scene** (Kuiper belt ends at 620, default far camera 1,400). **(a) draw them at schematic radii (SCATTERED band 620–720, HELIOPAUSE dashed ring 800, OORT dashed ring 1,000), labelled "schematic" in the pane text** (recommended); (b) draw nothing for these three, only the ruler highlight and the panel; (c) fly the camera out on hover (disorienting).
5. **Collapse state.** **(a) Default expanded, remember the choice in `localStorage` like the Moon/Mars imagery card, start collapsed below 560 px window height** (recommended: breaks IA's "no persistence" line, so IA gets the exception); (b) runtime only, back to expanded on every visit; (c) default collapsed.
6. **The 15 residents with no image** (Meteosat, Fengyun, Tundra, IBEX, Chandrayaan-2, Queqiao ×2, Queqiao-2, CAPSTONE, Gateway, Sedna, Quaoar, Arrokoth, Pallas, Hygiea). **(a) keep the agency-coloured dot, image sourcing stays a content task** (recommended); (b) a neutral initials tile in the same 28 px shape; (c) add them to the H sourcing list now through the existing image tools.
7. **Does the Moon/Mars imagery card join the stack?** **(a) No: it stays outside and clears the stack by a measured custom property** (recommended: it is scene attribution, not a control); (b) yes, as the stack's top item (one corner owner, but a card of unknown height inside a flex column).
8. **Widen the ruler to its content (208 px up to 280 px, nowrap, ellipsis + title) so every row is one line?** Yes (recommended) / no, keep 208 px and shorten the names.
9. **Link GPS, GLONASS and Molniya firsts to their fleet entries (`/fleet?id=gps-gnss`, `glonass`, `molniya`)?** No (recommended: C5 links missions that exist; a programme page behind "Navstar 1" misleads) / yes.
10. **O5 scope (after H).** Add "first orbiter" firsts where the index has the mission (MESSENGER Mercury 2011, Cassini Saturn 2004; Kaguya and Chandrayaan-2 from H) and ask for **Mariner 2 and Luna 1 mission pages in H** (the two firsts with no page that a founding-mission list most expects) (recommended); or review only after H with no additions; or add no pages.
11. **Fold in the panel's formatting fix (`en-US` grouping and literal `km`/`AU` in `RegimePanel`, §2.2) and the `5.0–30 AU` quirk?** Yes (recommended: same files, 13 locales currently read English units in the panel) / no, leave.
12. **Draw the highlight in the Explore 2D view as well as 3D?** Yes (recommended: 2D is a primary toggle, `draw2d` already uses `auToPx`) / 3D only.

## 13. Acceptance checks

- Every `.band` on the four routes is one line at 1280×720 in en, de, ru, fr, hi, nl, ja (e2e 1) and in the touch drawer.
- Hover/focus and click set and clear `data-regime-highlight`; the six `/earth`, five `/moon`, five `/mars`, eight `/explore` regimes each draw per §4.4 (screenshots of §3 reviewed by the operator).
- Collapsed and expanded stack: no two of `.moon-observer`, `.locate-slot`, `.ruler`, `.tier-context-card`, nation legend, INDEX tab, footer intersect at 1440×900, 1366×768, 1280×720, 1100×700 on `/earth`, `/moon`, `/mars`; Explore's eight HUD sizes still pass.
- 23 of 38 `firsts` are links in all 14 locales; every `mission_id` resolves; no trailing country/agency tag; `orbit-regimes.data.test.ts` green.
- 49 thumbs load, 15 residents keep the dot; `validate-data` green; `npm run preflight` and `preflight:coverage` green once before push.
- Docs of §10 updated; the inventory rows C4 and C5 say what is built and what was not run in a browser.

## 14. NOT VERIFIED

- NV1 No browser, build or test was run. Every width, height and fit figure (138 px, 214/130/390 px, 522 px room) is CSS arithmetic; the 12-of-336 and 164-of-336 row counts use a 0.612 em Space Mono advance and 1 em for CJK, not measured text.
- NV2 Whether `box-sizing: border-box` is global (assumed for the 138 px figure) and the real `line-height` of `.band` (1.5 assumed) were not read.
- NV3 Ring radii for the Moon ghost (`moonR`, `distanceMultiplier`) were taken from comments, not computed from `eol.moonGhost`; the MOON ring position on `/earth` is unconfirmed. Whether the L2 objects sit at 50.15 follows from `earth-satellite-layer.ts:124–125` read by eye, not run.
- NV4 `visual.spec.ts` baselines were not searched for the ruler; `tour` audio specs were not checked for a dependence on the locate chip's DOM position (`data-audio-stage` hooks on the chip are unread).
- NV5 The 2D Explore drawing (`draw2d`, `explore-scene-host.ts:3830`) and the host's hover-ring code (`:2523–2732, :4739`) were located, not read; cost of the 2D highlight and whether the existing hover-ring pipeline can be reused are estimates.
- NV6 `HudStackBL`: that one DOM instance of the locate chip can move between the stack and the scene's bar slot by `matchMedia` without breaking `barStart` (`SurfaceScene` snippet) and the touch bar layout was not prototyped; the tier-context card's actual left edge and whether it overlaps the ruler today was not measured. Whether the stack covers `/venus` (it has no ruler) was not checked.
- NV7 The 49 thumb paths come from a directory listing: that every `01.1x1.jpg` is an approved, correctly attributed hero (not a placeholder; `credit-placeholders-find.mjs` exists for that) was not checked, and image sizes other than Jupiter's 22 KB were not measured. EP3 (planets-only heroes) may change some of these files.
- NV8 Mission pages: existence was checked by id in the index and the files; that each page renders (hero, text) and that `/missions?id=hope-probe` opens the panel was not run. `mariner-2` and `hope` are called broken because the index has no such id; the fleet index has `mariner-4` and `mariner-9` but no `mariner-2`.
- NV9 The per-locale country tails were counted by a regex on the last parenthetical; the exact word list per locale needs a read of each of the 14 overlays by the implementer, in particular ar (two spellings of "Soviet Union") and the English tails left in hi, ja, ko, zh-CN. No translation was reviewed (the operator reads sr-Cyrl; nothing here needs a native-speaker pass).
- NV10 `static/data/schemas/orbit-regimes*.schema.json` (is `mission_id` allowed per first), `static/data/glossary/native-terms.json` (the "orbit ruler" binding per locale) and `docs/adr/TA.md` line numbers were not opened. UXD-014's 24 px `.ui-hit` rule for non-chip controls was read from `IA.md`/UXD text only.
- NV11 `RegimePanel` first screen: whether a 28 px thumbnail row fits four-line residents in `de`/`ru` panel width 400 px without wrapping the label was not estimated.
- NV12 Mobile: that tapping a band in the drawer closes the drawer and leaves the highlight visible above the bottom sheet was not checked; the sheet may cover the lower half of the scene.
