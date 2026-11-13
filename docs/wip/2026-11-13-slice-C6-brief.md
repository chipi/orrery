# Slice C6 brief — the INDEX rows: meta line, kind filters, planet dots, nation colours on the Worlds (I1, I2, I3, WM3)

Read-only brief, written at HEAD `0194e8b5531` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and four one-off read-only node scripts over `static/data/` and `i18n-src/` (written with the Write tool into the session scratchpad, not in the repo; their output is quoted below). Nothing was built, run in a browser or measured: every pixel figure is CSS arithmetic or a character-width estimate (§13). No code was changed. The working tree holds unrelated uncommitted edits (`RegimePanel.svelte`, `orbit-regime-format.ts` and two tests): not touched.

## 0. Answer first

1. **Most of C6 is already built, by the INDEX work (UXD-017, `8684bced2e0`).** I2 (kind filters) is done on `/explore`: `SCALE_FILTERS['solar-system'] = ['planet','dwarf','comet']` (`src/lib/explore/scale-index.ts:121`), drawn as a `ChipGroup` under the search box (`ScaleIndex.svelte:245-256`). I3 (a colour per planet) is done on `/explore`: `SOLAR_DOT` is built from `PLANETS[].css` (`src/routes/explore/+page.svelte:166-177`) and drawn as the row dot (`ScaleIndex.svelte:285-289`); the nine colours differ (`explore-scene.ts:63, 80, 97, 127, 163, 215, 254, 317, 345`).
2. **What remains of C6 is three things.** (a) **I1, half done:** a moon row carries its planet (`scale-index.ts:346`) and a dwarf/comet/interstellar row its kind label (`ScaleIndex.svelte:40-42`), but the Sun, the nine planets, the 16 asteroid/KBO rows and the two belts carry **no meta at all** (`scale-index.ts:309-327, 352-360`; `KIND_LABELS` has no `solar:planet`, `solar:sun`, `solar:asteroid`, `solar:kbo`, `solar:belt`, `solar:moon`). (b) **WM3 is not started:** the Worlds' index (`SurfaceIndexPanel.svelte`) colours a site's dot blue for orbit and red for land (`:93-96`) because `surfaceSiteToIndexItem` sets `color: undefined` (`surface-index.ts:68`); `colorFor(site)` (`nation-palette.ts:41`) is never called by the index. (c) **A defect found while checking I2:** the index's "Dwarfs" chip matches `kind === 'dwarf'` only, i.e. **4 of 51** solar-system rows (Ceres, Haumea, Makemake, Eris), while the layer chip DWARFS controls the 15 asteroids and Arrokoth as well (`body-ref.ts:65`, "asteroids and Arrokoth are dwarfs"); so 36 of the 51 rows (Sun, 16 moons, 2 belts, 15 asteroids, Arrokoth, ʻOumuamua) are reachable only under All. This is a gap in the same I2 the operator asked for.
3. **Proposal:** a two-line planet/moon/body row on the solar-system INDEX (name above, one meta line below), a `meta` built in `scale-index.ts` from data the repo already has (distance, diameter, listed moons), two more chips (Moons, Asteroids) so every row has a chip, and on the Worlds the row dot takes `colorFor(site)` with the orbit/land cue moved to the meta line.
4. **No new image, no new data file, no schema change; 4 to 6 new message keys in 14 locales** (§6); one amendment to UXD-017, no new UXD number.
5. **Needs the operator before code:** 5 forks in §12 (meta shape, one line or two, which extra chips, dot colour source on the Worlds, whether the Worlds keep an orbit/land cue).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 184–186, 281; slice row 353)

| ID | Text | State at HEAD |
|---|---|---|
| I1 | "Feels too basic when opened: add something next to the planet name; inspiration from the Moon index or other worlds." | Moon index row = name + agency badge + `year · status` (`SurfaceIndexPanel.svelte:195-198`). Solar-system row = dot + name, and **nothing** for planets, Sun, asteroids, KBO, belts. Built for moons, dwarfs, comets, ʻOumuamua only. |
| I2 | "Filters at the top, like the Moon index." | Done: chips under the search, All + Planets + Dwarfs + Comets (`ScaleIndex.svelte:245-256`). Gap: 36 of 51 rows have no chip (§0.2c). |
| I3 | "All planets are blue: colour per planet, best match, in the little circles." | Done on `/explore` (`+page.svelte:166-177`). Not done on `/earth`/`/moon`/`/mars`/`/venus` (they are a different component, §2.3), which is not what I3 names. |
| WM3 | "Index blue/red colour coding: what is it? Reuse the footer's per-nation colours." | Not done. Blue = `domain === 'orbit'` (`#5070ff`), red = land (`#c1440e`): `SurfaceIndexPanel.svelte:93-96`. The footer = the nation legend (`SurfaceScene.svelte:500-510`, rendered `:5709` and `:6195`) uses `NATION_COLORS`. |

Not in C6: the Worlds' index moving onto `ScaleIndex` (UXD-017 "next slice", `CHANGE-INVENTORY.md` line 102: still `SurfaceIndexPanel`), the exoplanet BodyScene list, the close chip (UXD-018, done), selecting = focusing (C1, built).

## 2. Current state (file:line at `0194e8b5531`)

### 2.1 The solar-system INDEX rows

| Piece | Where | What it does |
|---|---|---|
| Row model | `scale-index.ts:27-45` | `meta?` "One short line after the name", `color?` "Dot colour of a solar-system row, set by the page" |
| Rows | `scale-index.ts:303-362` (`solarRows`) | Sun (no meta), 9 planets (no meta, `kind:'planet'`), 23 small bodies (kind = data `type`: `dwarf`×4, `comet`×2, `asteroid`×15, `kbo`×1, `interstellar`×1; Pluto once, as a planet), 16 moons (meta = parent planet, `:346`), 2 belts (no meta). 51 rows, asserted by `scale-index.test.ts:82` |
| Meta rendering | `ScaleIndex.svelte:190-191, 296` | `metaOf(r) = r.meta ?? (scale === 'local-group' ? lgGroup(r) : kindLabel(r))`; `kindLabel` looks up `KIND_LABELS['solar:'+kind]`, which holds `dwarf`, `comet`, `interstellar` only (`:40-42`) |
| Meta CSS | `index-panel.css:201-210` | `.si-meta { flex: 0 1 auto; max-width: 45%; nowrap + ellipsis; font-size: var(--size-label); color: var(--color-state) }`; DS §5.13: "at most 45% of the row" |
| Dot | `index-panel.css:167-179`, `ScaleIndex.svelte:285-289` | 26 px lead slot, 8 px dot, default `#b0b0bd` |
| Page colours | `+page.svelte:166-177` | Sun `#ffcc33` and the nine `PLANETS[].css` replace the grey; every other row keeps grey |
| Chips | `scale-index.ts:94-117, 121`; `ScaleIndex.svelte:103-126, 194, 245-256` | `planet` (`kind==='planet'`: 9), `dwarf` (`kind==='dwarf'`: 4), `comet` (2); chips with no matching row are not drawn (`:194`); labels `ui_layer_planets/dwarfs/comets` ("PLANETS", "DWARFS", "COMETS") |

Planet colours as written: Mercury `#b5b5b5` (almost the default grey `#b0b0bd`, so on screen Mercury's dot reads as an uncoloured row: NV3), Venus `#e8cda0`, Earth `#4b9cd3`, Mars `#c1440e`, Jupiter `#c88b3a`, Saturn `#e4d191`, Uranus `#7de8e8` (cyan; carries an `a3-keep` palette-review marker at `explore-scene.ts:254`), Neptune `#3f54ba`, Pluto `#d0b48c`. The "all blue" of I3 was the pre-UXD-017 `ExploreBodyIndex`; I read no screenshot of it.

### 2.2 What data a planet row could print (read, not run)

| Value | Source | Note |
|---|---|---|
| Distance from the Sun | `planets.json` `a` (AU) per planet; `small-bodies.json` `a`; `belts.json` `inner_au`/`outer_au` | `src.planets` in `scale-index.ts` is typed `{ name }` only (`entity-index.ts:184`), so the source type widens |
| Diameter | `PLANET_STATS[id].diameterKm` (`src/lib/physics/util/planet-stats.ts:39-`, Mercury 4880 … Pluto 2376) and `SATELLITE_STATS` (`src/lib/explore/format.ts:85-`); small bodies `radius_km` (24 rows have the field) | one formatter exists for the panel (`distanceWithUnit`, `format.ts:34`); the planet panel's own AU line is unlocalised (`PlanetPanel.svelte`, `auLabel`) |
| Moons | `satellites.json`: 16 listed, Earth 1, Mars 2, Jupiter 4, Saturn 2, Uranus 5, Neptune 1, Pluto 1 | these are the moons **drawn**, not the real counts (Jupiter has far more than 4): the word "moons" next to a number would be false; "major moons" is the honest label |

### 2.3 The Worlds' index (WM3)

`SurfaceScene.svelte:5815-5826` mounts `SurfaceIndexPanel` with `indexItems = toIndexItems(sites, indexEarthObjects, body)` (`:812`). Rows: `row-dot` (`domainColor(item)`, `:195`), name, `AgencyBadge`, `row-meta` = `year · status` (`:198`). `domainColor` returns `item.color` if set, else `#5070ff` for `orbit`, `#c1440e` for land (`:93-96`). `surfaceSiteToIndexItem` sets `color: undefined` (`surface-index.ts:68`); `earthObjectToIndexItem` passes the object's own colour (`:85`; 25 distinct among 31 objects). So the "blue/red" the operator asked about is a domain cue (orbiter vs surface) that nothing on the page explains; the orbit/land chip pair (`:121-133`) carries the same words but not the colours.
Nation data: `/moon` 28 sites (USSR 6, USA 10, China 7, India 2, Japan 1, Europe 1, Israel 1; 20 surface, 8 orbiter), `/mars` 27 (USSR 4, USA 14, Europe 5, China 2, India 1, UAE 1; 16 surface, 11 orbiter). `NATION_COLORS` (`nation-palette.ts`): USA `#0B3D91`, USSR/Russia `#8B0000`, Europe `#003299`, China `#DE2910`, India `#FF9933`, Japan `#003087`, UAE `#00732F`, Israel `#0038B8`. The legend swatches draw the raw colours; `liftForDark` (`three-label.ts:130`, 45 % toward white) exists for text on a dark pill.
Existing tests: `surface-index.test.ts` (adapter; asserts a colour of `#5070ff` at `:64, :134` for earth objects, no assertion on sites), `tests/e2e/surface-index.spec.ts` (3 tests: open + search + row opens detail; orbit/land filter; landscape pull tab), `tests/e2e/scale-index.spec.ts`, `explore.spec.ts`/`index-links.spec.ts` for `/explore`.

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`); locales `en-US` plus `de`, `ru`, `hi`, `ar` (long unit strings, RTL) for the meta line:
1. `/explore` INDEX open, solar system: top of the list (Sun, planets) and the moons section, All and each chip. Before and after. 1440×900, 390×844, 844×390.
2. The same with the **Asteroids** chip (if added, Decision 2) and with the search box holding "Jup".
3. `/moon` INDEX open (28 rows) at All, then Orbit and Land; `/mars` the same; `/earth` (sites and objects mixed, one dot colour per nation vs per object: Decision 4); `/venus`. 1440×900 and 844×390.
4. The nation legend and the INDEX side by side on `/moon` (the colour match WM3 asks for), 1440×900.
5. A dark nation colour (USA `#0B3D91`) as an 8 px dot on the rail's panel background, at 100 % zoom and on a 2× display: the one legibility risk (NV4).

## 4. Proposal per feedback item

### 4.1 I1 — a meta line on every solar-system row

`scale-index.ts` builds `meta` in `solarRows`, from a widened `ScaleIndexSource` (planets gain `a`, small bodies `a` and `radius_km`, belts `inner_au`/`outer_au`; `entity-index.ts:184-194` reads the three files already, so no new fetch). A pure formatter in `src/lib/explore/format.ts` (next to `distanceWithUnit`) returns the string from numbers and the reader's locale, so it is unit-testable and the server and client agree. Shapes (en-US, character counts by arithmetic):

| Row | Meta | Chars |
|---|---|---|
| Sun | "Star · G2V" or no meta (Decision 1) | 10 |
| Planet | "1.52 AU · 6,779 km · 2 moons" | 28 |
| Dwarf / asteroid / KBO / comet | "2.77 AU · 940 km" (a, diameter from `radius_km` × 2; comets: "17.8 AU" only: a is not a size) | 16 |
| Moon (today the planet) | "Jupiter · 3,643 km" | 18 |
| Belt | "2.2–3.2 AU" (`inner_au`–`outer_au`) | 10 |
| Interstellar | the kind label, as today | 12 |

At 11 px Space Mono (6.7 px/char) a 28-character meta is 188 px; the rail's row has about 320 − 24 padding − 2 border − 20 padding − 26 lead = 248 px for name + meta, and meta is capped at 45 % (112 px) by `index-panel.css:201-210`. **One line cannot carry the planet meta** (it fits about 16 characters). Hence Decision 2: the recommended shape is a **two-line row** on the solar-system INDEX (name 13 px on line 1, meta 11 px on line 2, 44 px row against 30 px today), 51 rows × 44 = 2,244 px of scrollable list (it already scrolls); the alternative is one line with a 16-character meta ("1.52 AU · 6,779 km") and the moon count dropped. The other seven scales keep today's one-line row (their meta is a kind label of 6 to 20 characters).
Localising: numbers through `Intl.NumberFormat(locale)`, the unit through the existing `m.unit_au_value` and `m.mp_flight_unit_km` (the ruler's, `orbit-regime-format.ts`; the 万/만/lakh rule comes with it), one new ICU key for the moon count (Decision 1 notes the wording).

### 4.2 I2 — close the filter gap

Today: planet 9, dwarf 4, comet 2 = 15 rows under a chip; 36 under All only. Proposal (Decision 3): add **Moons** (16) and **Asteroids** (15 asteroids + Arrokoth, `kind in {asteroid, kbo}`), keeping the cap of five chips besides All (`scale-index.test.ts:309-311`): All, Planets, Dwarfs, Asteroids, Moons, Comets = 5 after All. The Sun, two belts and ʻOumuamua (4 rows) stay All-only (a chip each would break the cap of five; ʻOumuamua is a comet-class visitor and could take the Comets chip: `isKind('comet','interstellar')`, one line). The label for **Dwarfs** stays "DWARFS" (the layer chip's word); if the operator wants the index chip to mean what the layer chip means (dwarfs + asteroids + KBO = 20 rows), that is the alternative in Decision 3.
Test change: the existing "every chip matches at least one row" (`:303-307`) stays; a new test asserts that every selectable solar row matches at least one chip or sits in an explicit `ALL_ONLY` list of four ids, so a new body cannot be silently unreachable.

### 4.3 I3 — planet dots

Done; keep. Two small hygiene points, both in the same code: (a) Mercury's `#b5b5b5` is indistinguishable from the 8 px default `#b0b0bd` at that size (arithmetic: ΔE not computed; NV3); give every non-coloured solar row an explicit neutral and let Mercury keep its own, or leave as is (no decision needed unless the operator sees it in the shots). (b) Moons, asteroids, comets and belts keep the default grey dot: they have colours in the data (`small-bodies.json` `color`, field present on all 24) that the row does not use. Recommend leave grey: seven grey dots beside nine coloured planets is the visual hierarchy ("planets are the signal", UXS-001); using body colours for 36 more rows would dilute I3.

### 4.4 WM3 — nation colours on the Worlds' index

`surfaceSiteToIndexItem` sets `color: colorFor(site)` for `moon`, `mars`, `venus` and the earth launch sites (`surface-index.ts:68`; one line); `domainColor` keeps the orbit/land fallback for objects with no colour. `earthObjectToIndexItem` keeps `obj.color` (an object colour, not a nation: Decision 4). Because the row loses the blue/red cue, the **meta line carries the domain**: `year · status` becomes `year · status · Orbiter|Surface`? (the existing keys `surface_index_orbit` / `surface_index_land` are the chip words; Decision 5). Contrast: `#0B3D91` and `#8B0000` on the rail's dark panel are low-contrast as an 8 px dot; the legend draws the same raw colours, so the match WM3 asks for is exact, and a 1 px `rgba(255,255,255,0.35)` ring on the dot (CSS only) keeps the dark hues visible; `liftForDark` would make the dot differ from the legend swatch (Decision 4 alternative).

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on C6 |
|---|---|
| UXD-017 (INDEX) | I2 and I3 are delivered; the plan row C6 ("kind filters, meta line, planet colour dots") is **outdated for two of its three clauses**; the brief keeps only the meta line and the Worlds colours, and adds the chip-coverage gap. Amend UXD-017, do not write a new record. |
| UXD-019 (select = focus) | A row already focuses; the two-line row must keep the one `button.si-row` (roving selector `button.si-row, a.si-row, a.si-page`, `ScaleIndex.svelte:263`; `select-focus.spec.ts` uses it). |
| UXD-014 / A4 (one chip) | New chips use `Chip kind="choice"` in the existing `ChipGroup`; no new control. |
| UXD-018 (panel shell) | The close chip and 24 px badge rules stay; no change. |
| UXD-020 | Not concerned (scene labels). |
| C4/C5 (UXD-024) | `RegimePanel` formatter work (`orbit-regime-format.ts`) is the one localised AU/km formatter; **reuse it** for the planet meta (fold in) rather than a third formatter. The working tree holds uncommitted edits to that file: C6 starts after they land. |
| C1 | `selectedId` and `aria-current` unchanged. |
| C8 (explore navigation) | A per-level "what you are looking at" card is separate from the INDEX; no overlap. **Leave for C8:** the INDEX handle's label wording per scale. |
| C9 / C10 | No overlap. |
| H (content) | None. |

Plan ideas now outdated: "planet dots in each planet's colour" (done, `+page.svelte:166`), "kind filters" (done; only the coverage is open).

## 6. i18n impact (14 locales, glossary first)

- **New message keys (recommended shape): 4 to 6.** `explore_index_meta_planet` (ICU with `{distance}`, `{diameter}`, `{moons}` plural), `explore_index_meta_body` (distance + diameter), `explore_index_filter_moons` and `explore_index_filter_asteroids` (chip labels), and, only if Decision 5 is yes, one key joining the domain to the meta line. The words **Moons**, **Asteroids**, **Dwarfs**, **Planets** already have bound forms (`explore_index_section_moons`, `ui_layer_dwarfs`, `ui_layer_planets`, `explore_index_section_small_bodies`); draft the new chip labels from `static/data/glossary/native-terms.json` and the existing section keys **before** any translation call (glossary first, per `term-consistency`); not opened here (NV7).
- "major moons" is the honest phrase for the listed 16; it needs a plural key in all 14 locales (ar has six plural forms, ru and sr-Cyrl three, ja/ko/zh-CN one): Paraglide plural syntax per `messages/en-US.json` (the repo's existing `{count}` ICU keys; not checked here).
- **No** change to the 14-locale overlay data (names unchanged); no paid translation run: the keys are short, drafted by hand and checked with the existing validators (`validate-data`, the message parity check). `no-paid-translation-runs` (operator note, 2026-10-18) applies.
- Locale-dependent formatting: numbers through `Intl`; the grouping and the 万/만/lakh rule come from the shared formatter.

## 7. Data changes

1. **No data file changes.** `ScaleIndexSource` (type in `scale-index.ts`) widens; `entity-index.ts:184-194` reads `a`, `radius_km`, `inner_au`, `outer_au` from the three files it already fetches.
2. Hard-coded: planet diameters come from `PLANET_STATS` (client module) while the rows are built on the server: the formatter takes the number in, and `getScaleIndexRows` imports `PLANET_STATS` (pure data, no DOM). Check at build that `PLANET_STATS` has all nine planet keys (`mercury … pluto`; read, not verified: NV5).
3. No change to `static/data/surface-hotspots.json`, `moon-sites.json`, `mars-sites.json`: nations are read as they are.

## 8. Tests to add or change

**Unit (vitest):**
- `scale-index.test.ts`: a meta for the Sun, every planet, every small body and every belt (no empty meta in the solar scale except the four `ALL_ONLY` rows if any); the formatter output for en-US and one of ar/ru/hi; every selectable solar row matches a chip or is in `ALL_ONLY`; the new chip ids match at least one row (`:303-307` already); the cap of five.
- `src/lib/explore/format.test.ts` (exists? not checked): the planet meta string, `5–30`-style no trailing `.0`.
- `surface-index.test.ts`: a moon and a mars site take `colorFor(site)` (USA `#0B3D91`, China `#DE2910`); an earth object keeps `obj.color`; an unknown nation falls back to `#888`.
- `ScaleIndex` component render test (as `Chip.test.ts`): two-line row markup keeps one `button.si-row` per object.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. `scale-index.spec.ts`: on the solar INDEX the Sun, Mars and Ceres rows each show a meta line; the Moons chip shows 16, Asteroids 16 (if Decision 3 is the recommended one); the count `n / 51` follows the chip.
2. `surface-index.spec.ts`: on `/moon` the dot of a Chinese site equals the nation legend swatch colour for China (computed style compare, no pixels); on a phone the pull tab still opens the list.
3. The existing 3-test `surface-index.spec.ts` and `select-focus.spec.ts` keep passing unchanged (selectors preserved).
4. `footer-dock.spec.ts`/`chip.spec.ts` are not touched by this slice: the rail's chip row gains at most two chips; the rail's row wrap (`si-filter-row`) is the one new layout risk (NV2).

## 9. Docs to update by name

- **UXD-017** (amendment, `docs/uxs/decisions/UXD-017-one-index-on-every-scale.md`): the meta line on the solar system, the two extra chips, the "Dwarfs" gap; **a one-line pointer in `docs/uxs/decisions/README.md`** row 017 (no new number). If the operator wants a record of its own for the Worlds' colour rule, **UXD-025** is the next free number at HEAD (024 is the last); I recommend an amendment, not a new record (Decision 4 and 5 are small).
- `docs/concept/05_Design_System.md` §5.13 (Row paragraph: two-line solar row, meta, chips; the Worlds' index in a sentence: dot = nation colour), §2.4 agency colours note pointing at the nation palette, §6.6 (Moon map) one sentence.
- `docs/uxs/UXS-001.md` (solar explorer INDEX), `docs/uxs/UXS-006.md` (Moon/Mars index), `docs/uxs/UXS-014.md` (INDEX paragraph), `docs/uxs/UXS-005.md` (Earth) one line.
- `docs/uxs/IA.md` §controls (the INDEX chip row), `docs/uxs/CHANGE-INVENTORY.md` row C6 (line 47: "none yet" → UXD-017 amendment, status) and row 102 ("Scale INDEX").
- `docs/adr/TA.md` line 48 ("Canvas object indexes": the surface site index colour rule).
- READMEs: `src/lib/explore/README.md` (`scale-index.ts`, formatter), `src/lib/components/README.md` (`ScaleIndex`), `src/lib/surface-scene/README.md` (`SurfaceIndexPanel`), `src/routes/explore/README.md` (`SOLAR_DOT`).
- Header comment of `ScaleIndex.svelte` ("no camera move, no new URL" is stale since UXD-019: fix in the same pass, it states the opposite of DS §5.13 "Selecting").
- AGENTS.md "Design system" table if it lists the INDEX row look (grep before editing; AGENTS.md line 717 area, not opened).

## 10. Phased plan

1. **C6a, pure data and formatter** (no UI risk): widened source, `solarRows` meta, `format.ts` formatter, chips `moons`/`asteroids`, tests red first (`scale-index.test.ts`, `format.test.ts`).
2. **C6b, rail look:** two-line row CSS in `index-panel.css`, `ScaleIndex.svelte` markup, wrap check of the chip row at 320 px; screenshots §3.1–3.2.
3. **C6c, Worlds colours:** `surface-index.ts` colour, `SurfaceIndexPanel` dot ring and meta, `surface-index.test.ts`, e2e; screenshots §3.3–3.5.
4. **Messages and docs:** keys in 14 locales from the glossary; the docs of §9; `npm run validate-data`, then `npm run preflight` once before a push, `npm run preflight:coverage` because `src/lib/explore/format.ts` gains functions (frozen ratchet R8).

## 11. Acceptance checks

- Every solar-system row has a meta line, or is one of the named `ALL_ONLY` rows; no meta is empty by accident (unit).
- Every selectable solar row is reachable under some chip or All; `n / 51` counts match.
- On `/moon` and `/mars` the dot colour of every row equals `colorFor(site)` of its site, equals the legend swatch of its nation (e2e + unit).
- Meta lines in `ar`, `ru`, `hi`, `de` do not overflow the rail (ellipsis, `title` carrying the full text) at 390 px and 844×390.
- No regression in `scale-index.spec.ts`, `index-links.spec.ts`, `select-focus.spec.ts`, `surface-index.spec.ts` on the three projects.
- Docs of §9 updated; the inventory row C6 states what is built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first)

1. **What the planet meta says.** **(a) "1.52 AU · 6,779 km · 2 major moons" for planets; "2.77 AU · 940 km" for dwarfs, asteroids and KBOs; "Jupiter · 3,643 km" for moons; "2.2–3.2 AU" for belts; the Sun "Star"** (recommended: one pattern, all numbers from data the repo already has; "major" is honest because the moons listed are the 16 drawn); (b) distance and diameter only, no moon count (a smaller string, no plural key); (c) the kind word only ("Planet", "Asteroid"), no numbers (smallest, closest to "something next to the name" but says least).
2. **One line or two.** **(a) A two-line row on the solar-system INDEX only** (name over meta; 44 px rows; other seven scales keep one line) (recommended: the planet meta is 28 characters and the rail has room for about 16 beside a name); (b) one line, meta shortened to distance + diameter ("1.52 AU · 6,779 km", about 16 characters, still ellipsised in long locales).
3. **Chips for the 36 rows with none.** **(a) Add Moons and Asteroids (Asteroids = asteroids + Arrokoth), put ʻOumuamua under Comets; Sun and two belts stay All-only** (recommended: five chips besides All, the cap stays); (b) make the index "Dwarfs" chip mean what the layer chip DWARFS means (dwarfs + asteroids + KBO = 20 rows) and add only Moons; (c) leave as is (36 rows reachable under All only).
4. **Dot colour on the Worlds.** **(a) The site's nation colour (`colorFor(site)`), exactly the legend swatch, with a 1 px light ring so the dark navy and dark red read; earth objects keep their own object colour** (recommended: the match WM3 asks for); (b) the nation colour lifted toward white (`liftForDark`, readable without a ring, but not the same colour as the legend swatch); (c) nation colour for sites and objects alike on `/earth` too (needs a nation field on earth objects: `earth-objects.json` has `agencies`, not `nation`; not a one-line change).
5. **Keep an orbit/land cue on the Worlds' rows?** **(a) Yes: the meta line reads "1976 · Active · Surface" / "· Orbiter" with the words of the existing chips, no colour needed** (recommended: the cue stays, the colour now means one thing); (b) no: the Orbit/Land chips are the only domain control, the rows carry year and status as today.

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The 248 px / 188 px / 44 px row figures are CSS arithmetic and a Space Mono advance of 0.612 em; the rail's real width, padding and the `si-row` box model were read from DS §5.13 text and `index-panel.css`, not measured.
- NV2 Whether the chip row (`si-filter-row`) wraps to a second line at 320 px with five chips besides All in `de`, `ru`, `hi`, `fr` (long labels) was not estimated per locale; the wrap would push the list down by one chip row (about 30 px).
- NV3 Mercury's `#b5b5b5` versus the default `#b0b0bd` colour difference was not computed, and I read no screenshot of the old all-blue index (I3's origin).
- NV4 Contrast of `#0B3D91` and `#8B0000` as an 8 px dot on `--color-panel-bg` was not computed; the ring proposal is a guess to be judged in the shots.
- NV5 `PLANET_STATS` keys for all nine planets and `radius_km` on every small body were read for the first rows only; `belts.json` `inner_au`/`outer_au` values were not printed; the `a` (AU) of dwarfs is in the file but the km figure assumes `radius_km` is a radius (the key name), not checked against a source.
- NV6 `getScaleIndexRows` also feeds the prerendered HTML (only rows with a page are written, as link rows, before hydration): whether a meta line belongs in that static link row was not decided; the proposal changes the hydrated button rows only.
- NV7 `static/data/glossary/native-terms.json` and the existing plural keys were not opened; whether "Asteroids" and "major moons" have bound forms in all 14 locales is unknown.
- NV8 Whether `format.test.ts` exists, whether `earth` launch sites (spaceports) have a `nation` on every site, and what `/venus` sites carry (Venus uses the same `IndexBody`) were not checked beyond the Moon and Mars counts above.
- NV9 AGENTS.md lines 717-837 ("Design system") were not read for an INDEX row look statement; the docs list in §9 may miss one.

## Decisions (operator, 2026-11-13)

All 5 recommendations of §12 approved as written ("I am OK on 25 recommendations", for C6–C10 together). Order: implementation starts after L45 (the thumbnail scan), which follows C4–C5.
