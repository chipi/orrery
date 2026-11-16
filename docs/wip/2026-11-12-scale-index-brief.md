# Scale INDEX brief — the same INDEX on all eight Explore scales

Brief, 2026-11-12, written at HEAD of `tech-debt/0.9.9` at `54d5a46c17c` plus the uncommitted working tree (20 modified files and 3 untracked, the catalogue-layer work: `DataSources.svelte`, `catalogue.ts`, panels, data-sources; none of them touches an INDEX file). Read-only investigation: nothing in `src/`, `scripts/`, `static/`, `messages/` or `tests/` was changed; this file is the only write. Operator decision (2026-11-12): "add same index on all other scales and that is the way to close the gap in a systematic way". Method: `git grep` / `sed` reads of every file cited with the line numbers shown; counts from five Python scripts run as files over `static/data/**` (session scratchpad `…/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/{count,detail,solar,ent,dist}.py`, not in the repo); the two reference briefs (`2026-11-12-slice-A5-brief.md`, `2026-11-12-deep-entity-pages-brief.md`) read in full. No build, no dev server, no browser, no test run: every width, height and byte figure below is arithmetic from code, not a measurement (§6).

## Decisions (operator, 2026-11-12)

Plan approved; all 13 questions of §5 answered as recommended: black holes to Milky Way (Sagittarius A*, Cygnus X-1), Virgo (M87*) and a Fiction section at the foot of Cosmic web (Gargantua); rows for objects without a page; stars + deep sky in one neighbourhood list with a Deep sky chip; kind chips + Highlights, at most five per scale; page rows server-rendered as links, page-less rows client-rendered; one row per scale for shared objects; INDEX stays open across scale jumps on a fine pointer, closes on a coarse one; select = canvas click, no camera move or new URL params in this slice; exoplanet BodyScene list later; worlds share the CSS now, move to `ScaleIndex` next slice; solar system gains moons, belts, meta line, planet colour dots; `StarIndex` and `ExploreBodyIndex` deleted; stale docs fixed in the slice.

## 0. Answer first

| # | Question | Answer |
|---|---|---|
| 1 | Which scales have an INDEX today? | Two of eight: solar system (`ExploreBodyIndex`, 33 rows) and neighbourhood (`StarIndex`, 66 star rows + 4 black-hole rows). Milky Way, Local Group, Local Sheet, Virgo, Laniakea, Cosmic web: none (§1.1). |
| 2 | How many selectable things would the six empty scales put in an INDEX? | Milky Way 19 (+1 if Cygnus X-1 gets a row), Local Group 33, Local Sheet 9, Virgo 7, Laniakea 8, Cosmic web 7 = 83 (84), all from `static/data/universe/*.json` (§1.2). Plus 141 deep-sky objects that belong to the neighbourhood and 16 moons + 2 belts to the solar system. |
| 3 | Is the selection plumbing there? | For the Milky Way and the neighbourhood, yes (`mwDeepLinkFn`, `indexSelectStarFn` reach the page). For Local Group, Local Sheet, Virgo, Laniakea, Cosmic web the `select*` functions are closures inside the scene host and are NOT in its return object, so each needs one new fn pointer (`explore-scene-host.ts:2442, 2471, 2500, 2529, 2558`; return object `:4266–4309`) (§1.3). |
| 4 | Where do the black holes go? | Sagittarius A* and Cygnus X-1 to the Milky Way; M87* to Virgo; Gargantua (fiction) to the foot of the Cosmic web list in a "Fiction" section. Recommendation, operator decides (§2.7, Q1). |
| 5 | One component or two? | One: `ScaleIndex.svelte`, generalising `StarIndex` and `ExploreBodyIndex`, one handle, one open state, one CSS file. The worlds' `SurfaceIndexPanel` joins in a later slice (Q10). |
| 6 | Does the prerender link every page? | Only if all eight lists are in the `/explore` HTML at once, because `/explore?context=virgo` and `/explore` are the same prerendered file. Design: one hidden instance per scale, rows with a page filled from the server load (§2.6). |
| 7 | How many entity pages are linked from `/explore` today and would the change add any? | 118 today (48 bodies incl. 16 moons, 66 stars, 4 black holes; commit message of `54d5a46c17c`, not re-measured). The change adds none: no other scale has a page yet. It makes the next pages (deep-sky, galaxies, Milky Way pins; ADR-096 item 15) a one-line addition per row instead of new UI. |
| 8 | Surprises found | (a) the mobile "Index drawer tab" no longer exists; the handle is a left-edge tab on every viewport (A1) and `ExploreBodyIndex`'s `inline` prop is dead code (§2.5); (b) `SEED_DATA['/explore']` in `build-route-lastmod.mjs:56` lists three data files, not the star and black-hole data `/explore` now links (§3); (c) `UXD-015:73` and `TA.md:48` are stale (§3). |

## 1. Inventory

### 1.1 The two INDEX components that exist

| Piece | `ExploreBodyIndex.svelte` (327 lines) | `StarIndex.svelte` (384 lines) |
|---|---|---|
| Scale | solar system only: mounted inside `{#if contextId === 'solar-system'}` (`+page.svelte:2102–2128`) | mounted at every scale, `open` only when `starIndexOpen && view === '3d' && contextId === 'neighborhood' && !activeBlackHole` (`+page.svelte:1785–1799`) |
| Handle | `.body-index-handle` + `Chip kind="toggle"` `data-testid="explore-body-index-toggle"` (`+page.svelte:2103–2114`; CSS `:2238–2250`) | `.star-index-handle`, no testid, only while `view === '3d' && neighborhood && !activeBlackHole` (`+page.svelte:2131–2143`; CSS `:2209–2219`) |
| Open state | `bodyIndexOpen` (`+page.svelte:153`) | `starIndexOpen` (`+page.svelte:674`) |
| Panel | `aside.body-index.bidx`, `hidden={!open}`, rendered when `open \|\| entityLinks.length > 0` (`ExploreBodyIndex.svelte:143–151`); fixed left 12, `top: var(--index-top, 152px)`, width `min(320px, 100vw-24px)` (`:161–168`); `--index-top` = measured bottom of `.hud-controls` + 8 (`:57–76`) | `aside.star-index`, `hidden={!open}`, always rendered (`StarIndex.svelte:80`); fixed left 12, `top: 152px`, width `min(300px, 100vw-24px)` (`:193–201`); at `max-height: 500px` top becomes `calc(var(--nav-height) + 8px)` (`:268–278`) |
| Search | `type="search"`, `surface_index_search`, testid `explore-body-index-search` (`:81–88`) | `type="search"`, `star_index_search_placeholder` (`:82–88`) |
| Filters | none | radiogroup `ChipGroup` of three choice chips: All / ⊕ Planets / ◈ Culture (`:93–109`); black-hole section hides when a filter is not All (`:72–77`) |
| Count | `{filtered} / {bodies}` (`:95`) | `{filtered} / {stars}` (`:110`) |
| Roving list | `use:roving` vertical, wrap, `itemSelector: 'button.bidx-row, a.bidx-page'` (`:96–103`) | same, `'button.si-row, a.si-row, a.si-page'` (`:111–118`) |
| Row | `button.bidx-row` with a kind dot (`bidx-dot--sun/planet/small`, `:115`, CSS `:299–311`) + name | `button.si-row` with badges ⊕ ◈ + name + constellation (`:122–141`) |
| Page link | trailing `a.bidx-page` `↗`, `data-testid="explore-body-index-page-link"`, `data-index-id` (`:118–127`); size 44 px coarse, 30 px fine (CSS `:243–261`) | trailing `a.si-page` `↗`, `data-testid="star-index-page-link"` (`:142–149`); `min-width/height: 44px`, fine pointer `min-width: 30px; min-height: 0` (`:290–308`) |
| Before data loads | pages with no row (16 moons) follow as `a.bidx-page--name` link rows (`:52–53`, `:130–134`) | `pageLinks` (server load, 66) render as `a.si-row` link rows while `stars.length === 0` (`:152–162`) |
| Extra section | none | black holes: `li.si-section` + 4 rows with `button.si-row` + `a.si-page` (`:166–186`); fed by `blackHoleIndex` (client `getBlackHoles()`, `+page.svelte:1041–1047`) or, before it loads, `data.blackHoleLinks` (`+page.svelte:1791`) |
| Dead code | `inline` prop and `bidx-inline` branch (`:33–35`, `:141–142`): no caller in `src/` (`git grep ExploreBodyIndex` finds only the one mount without `inline`) | none |
| Server data | `data.entityIndex` from `getEntityIndex('explore', …)` (`+page.server.ts:8–10`, `entity-index.ts:72–87`): 48 pages | `data.starLinks`, `data.blackHoleLinks` (`+page.server.ts:8–12`; `entity-index.ts:101–117`) |

Differences that make the two look like two products: class prefixes (`bidx-` / `si-` / `sidx-` on the worlds), widths 320 / 300 / 320, panel background (`color-mix(var(--bg-base))` in both explore panels, `var(--color-panel-bg)` on the worlds, `SurfaceScene.svelte:6965–6980`), top offset (measured vs the literal 152), and the handle markup, which is copied three times (`+page.svelte:2103`, `:2132`, `SurfaceScene.svelte:5704`).

### 1.2 Per scale: objects, data, counts, selection

Counts are real reads of `static/data/**` (scripts above). "Row today" = a DOM row exists now.

| Scale (`CTX_ORDER`, `scale-shell-controller.ts:20–29`) | Selectable objects (data file) | Count | Row today | Select function (page / host line) | Panel (`+page.svelte`) |
|---|---|---|---|---|---|
| solar-system | Sun; 9 planets (`planets.json`, includes Pluto); 24 small bodies (`small-bodies.json`, Pluto is in both lists, so 23 new) | 33 unique | yes, 33 (`bodyIndexList`, `:154–168`) | `selectSun` `:873`, `selectPlanet` `:852`, `selectSmallBody` `:884` | PlanetPanel `:1954`, SunPanel `:1961`, SmallBodyPanel `:2038` |
| solar-system, no row | 16 moons (`satellites.json`) | 16 | link rows only (`ExploreBodyIndex.svelte:130–134`), no select row | `selectSatellite(parent, id)` `:900` (canvas) | SatellitePanel `:2044` |
| solar-system, no row | 2 belts (`asteroid`, `kuiper`; `belts.json`) | 2 | no | `selectBelt` `:912` (canvas, `pickAid`) | BeltPanel `:2050` |
| solar-system, no row | orbit regimes (ruler bands, `exploreRegimes`) | not counted | no (own DOM: the ruler) | `openExploreRegime` `:222` | RegimePanel `:2082` |
| neighbourhood | named stars (`named-stars.json`) + 4 host-only exoplanet hosts (`exoplanet-systems.json` hostIds `trappist-1`, `51-pegasi`, `toi-700`, `kepler-16`, merged as `hostMarkers`, `explore-scene-host.ts:895–913`) | 62 + 4 = 66 | yes, 66 | `indexSelectStarFn` host `:1623` (select + `frameStar`), page `:820` | StarPanel `:1964` |
| neighbourhood, no row | 141 deep-sky objects (`deep-sky-objects.json`): galaxy 45, globular 30, star cluster 28, star-forming region 12, planetary nebula 10, nebula 6, supernova remnant 4, other 2, star 2, dark nebula 1, galaxy cluster 1; 44 with a photo, 4 with a `gatewaySystem` | 141 | no. Glints, layer off by default (`showDeepSky`, `+page.svelte:~664`); selected by canvas pick or `?deepsky=` | `enterDeepSky` host `:1504`, exposed as `selectDeepSkyFn` `:1665` / `deepSkyDeepLinkFn` `:1680` | DeepSkyPanel `:1983` |
| neighbourhood, no row | 11 exoplanet systems (26 planets) inside a BodyScene (`contextId 'body-scene'`) | 11 / 26 | no INDEX in `body-scene` | `enterBodyScene`, `selectExoplanet` (host `:1684–1685`) | ExoplanetPanel `:1974` |
| milky-way | merged set `bridge.mwObjects`: Sun, Sagittarius A* (`objects`), 10 globulars (3 `headliner`: omega-centauri, 47-tucanae, m13), 2 Magellanic (lmc, smc), 5 arms (1 `minor`: orion-spur) (`milky-way-schematic.json`; merge `explore-scene-host.ts:613–642`) | 2 + 10 + 2 + 5 = 19 | no (all pickable sprites: `milky-way-scene.ts:405–424, 444–459, 546–575`) | `mwDeepLinkFn` page `:758` = `resolveGalaxyDeepLink` host `:2573` → `selectMilkyWay` `:2409` (Sag A* redirects to `enterBlackHole`, `:2413–2416`) | MilkyWayPanel `:1996` (+ BlackHolePanel for Sag A*) |
| local-group | members (`local-group.json`): spiral 3, irregular 2, dwarf-spheroidal 17, dwarf-elliptical 2, dwarf-irregular 9; 6 `headliner` | 33 | no (`pickables`, `local-group-scene.ts:203–275`) | `selectLocalGroup` host `:2442`; dev hook `window.__exploreSelectLocalGroup` `:1698`; NOT in the return object | LocalGroupPanel `:2003` |
| local-sheet | `local-sheet.json`: 8 groups + 1 cloud; 5 headliners | 9 | no | `selectLocalSheet` host `:2471` | LocalSheetPanel `:2005` |
| virgo | `virgo-cluster.json`: 2 groups, 1 cluster, 4 clouds; 2 headliners | 7 | no | `selectVirgo` host `:2500` | VirgoPanel `:2006` |
| laniakea | `laniakea.json`: 5 superclusters, 1 attractor, 2 clusters; 3 headliners | 8 | no | `selectLaniakea` host `:2529` | LaniakeaPanel `:2012` |
| cosmic-web | `cosmic-web.json`: 2 superclusters, 1 concentration, 3 walls, 1 void; 3 headliners | 7 | no | `selectCosmicWeb` host `:2558` | CosmicWebPanel `:2007` |
| any (takeover) | 4 black holes (`black-holes.json`): sagittarius-a-star, m87-star, cygnus-x-1 (stellar), gargantua (fictional) | 4 | yes, as the foot section of the neighbourhood INDEX (`StarIndex.svelte:166–186`) | `bhDeepLinkFn` host `:2583` → `enterBlackHole` `:552`; sets `activeBlackHole`, never changes `contextId` | BlackHolePanel `:2018` |

Total rows the proposal creates: solar system 51 (33 + 16 moons + 2 belts), neighbourhood 207 (66 stars + 141 deep-sky), Milky Way 20 (19 + Cygnus X-1), Local Group 33, Local Sheet 9, Virgo 8 (7 + M87*), Laniakea 8, Cosmic web 8 (7 + Gargantua) = **344**. Of those 118 have an entity page today (48 + 66 + 4) and **226 have none** (Sun, 2 belts, 141 deep-sky, 18 Milky Way objects that are not black holes, 33 + 9 + 7 + 8 + 7).

Ids that sit in two scales (from the deep-entity brief §1.6, re-confirmed in the id lists above): `lmc`, `smc` (Milky Way Magellanic pins and Local Group members); `local-group` (Local Sheet member and Virgo member); `milky-way` (Local Group member); `sagittarius-a-star` (Milky Way pin and black hole); `m3 m4 m5 m13 m15 m22 m92` (Milky Way globular and deep-sky); `m32`, `m110` (deep-sky and Local Group); `m31`/`andromeda` (one galaxy, two ids). One INDEX row per scale per object, so the same object has two rows in two scales; its future page needs one canonical id (§5 Q6).

### 1.3 How selection reaches each scale today

| Scale | Page-side handle available to an INDEX | Gap |
|---|---|---|
| solar-system | `selectSun`, `selectPlanet`, `selectSmallBody` are page functions (`+page.svelte:852–884`) | `selectSatellite` (`:900`) and `selectBelt` (`:912`) exist but have no row |
| neighbourhood | `indexSelectStarFn` (`:820`, host `:1623`); `bhDeepLinkFn` (`:798`) | deep-sky: `selectDeepSkyFn` (host `:1665`, return object `:4283`) is not read by the page (`git grep selectDeepSkyFn src/routes/explore/+page.svelte` finds nothing), only `deepSkyDeepLinkFn` is, through URL sync |
| milky-way | `mwDeepLinkFn` (`:758`): crosses to the Milky Way when needed, then `selectMilkyWay` | none |
| local-group, local-sheet, virgo, laniakea, cosmic-web | only `closeLgFn`, `closeLsFn`, `closeVirgoFn`, `closeLaniakeaFn`, `closeCosmicWebFn` (`+page.svelte:769, 775, 781, 787, 793`; return object `:4283–4296`) | one new pointer each, `selectLgFn(id)` … `selectCosmicWebFn(id)`, set from the existing closures; the host's `member` lookup reads `lgMembers` / `bridge.lsMembers` etc., which are filled when the scene is first built (`ensureLocalGroup`, `explore-scene-host.ts:679–689`), i.e. before any INDEX for that scale is open |
| URL deep links | `?id ?goto ?system ?deepsky ?galaxy ?bh ?context` (`explore-url-sync.svelte.ts:82, 143, 171, 200, 228, 253, 280`) | no `?lg=` / `?ls=` / … member link; a member selected from the INDEX is not shareable. The deep-entity brief §1.1 lists the same gap; it is not part of this slice (Q8) |

What a selection does at the outer scales: `selectLocalGroup` and its four siblings set the bridge member, open the panel, highlight the sprite and track the click; none moves the camera (`explore-scene-host.ts:2442–2455`, `:2471–2484`, `:2500–2513`, `:2529–2542`, `:2558–2571`). The neighbourhood INDEX also frames the star (`frameStar`, `:1623–1626`). So an INDEX row at the outer scales does exactly what a canvas click does, which is the rule of `TA.md:48` ("selecting a row does exactly what a canvas click does").

### 1.4 Objects with no DOM row source today (canvas-only)

| Object kind | Where | How a reader or crawler reaches it today |
|---|---|---|
| 141 deep-sky glints | neighbourhood scene, layer off by default | canvas pick, `?deepsky=<id or designation>`; the 44 photographed ones also on `/gallery/deep-sky` |
| 16 moons, 2 belts | solar-system scene | canvas pick; moon pages are linked as link rows in `ExploreBodyIndex` (`:130–134`) |
| 19 Milky Way objects | Milky Way scene sprites | canvas pick, `?galaxy=<id>` |
| 33 Local Group members, 9 + 7 + 8 + 7 outer-shell members | their scenes | canvas pick only; `?context=` jumps to the shell and no further |
| 26 exoplanets in 11 systems | BodyScene | canvas pick, `?system=&planet=`, the StarPanel SYSTEM tab |
| 4 black holes | neighbourhood INDEX foot section, `?bh=`, the Sag A* pin | INDEX row; the other three have no pin in any scene |
| iconic-mission trajectories, orbit regimes | HUD chips and the ruler | own DOM (chips, ruler bands); out of this slice |

### 1.5 Entity pages now and planned

| Type | Page now | Planned (source) |
|---|---|---|
| Planets, moons, small bodies | `/explore/<id>`, 48 (`site-routes.mjs:126–136`; Sun has none) | done (ADR-096 item 11) |
| Named stars + exoplanet hosts | `/explore/stars/<id>`, 66 (`site-routes.mjs:146–159`; ADR-096 items 13–14) | done |
| Black holes | `/explore/black-holes/<id>`, 4 (`site-routes.mjs:168–178`; ADR-096 item 16) | done |
| Deep-sky objects | none | ADR-096 item 15: typed pages "once each entity's text clears the floor"; brief §1.4: 1 of 141 clears all 14 locales; deep-text batches 1–3 (`docs/wip/deep-text/batch-01..03.md`, 20 + 50 + 50 drafts, not integrated) are the route; `docs/wip/2026-11-11-ux-feedback-plan.md:471–476` phases 3–4 |
| Local Group members | none | brief §0: not yet, 0 of 33 clear; 4–6 headliners could clear with a `/science` article |
| Milky Way pins (10 globulars, 2 Magellanic, 5 arms) | none (Sag A* has the black-hole page) | brief §0: not yet, 0 clear |
| Local Sheet, Virgo, Laniakea, Cosmic web members | none | brief §0: "never as separate pages" |

## 2. Design

### 2.1 One component

`src/lib/components/ScaleIndex.svelte` replaces `StarIndex.svelte` and `ExploreBodyIndex.svelte`. It is presentation plus local query / filter state, like `SurfaceIndexPanel` (header comment `SurfaceIndexPanel.svelte:1–15`): the page owns which rows exist and what a select does. One shared stylesheet block (the CSS that is today copied in `ExploreBodyIndex.svelte:161–311`, `StarIndex.svelte:193–360`, `SurfaceScene.svelte:6952–6985`) moves to one file, `src/lib/styles/index-panel.css`, next to `chip.css`, so the worlds can adopt the same classes later without a second look pass.

Row model (pure TS, `src/lib/explore/scale-index.ts`, unit-tested; vitest does not run `$effect` in this repo, so the row building is pure functions):

| Field | Meaning |
|---|---|
| `id` | the scene id (`m13`, `virgo-cluster`, `mercury`) |
| `name` | display name in the reader's locale |
| `kind` | one of the kinds already in the data (`spiral`, `supercluster`, `globular-cluster`, …) |
| `section?` | group heading inside the list (neighbourhood: Stars / Deep sky; Milky Way: Objects / Globular clusters / Satellites / Arms; foot sections: Black holes, Fiction) |
| `meta?` | one short line (constellation, distance, group): the plan's C6 "meta line" (`docs/wip/2026-11-11-ux-feedback-plan.md:351`) |
| `badges?` | glyph + title, e.g. `⊕` planetary system, `◈` culture door, `★` headliner, `●` black hole |
| `href?` | the entity page, `localHref('/explore/…')`; absent = no page |
| `selectable` | true when a scene object exists (false for link-only rows such as a future page whose object the scene does not draw) |

Per-scale config (`SCALE_INDEX: Record<ShellId, ScaleIndexConfig>`): `ariaKey`, filter definitions, section order, the `select(row)` closure. Props of the component: `scale`, `rows`, `open`, `selectedId`, `onSelect`, `onClose`. Everything else (search, count, roving, ↗ links, hidden-but-in-DOM) is inside.

Behaviour kept byte for byte from the two parents: search box and × close (`StarIndex.svelte:81–92`); count `n / total` (`:110`); `ChipGroup` radiogroup of `Chip kind="choice"` (`:93–109`, UXD-014); `use:roving` vertical with wrap and `active: open` (`:111–118`); `aria-current` on the selected row (`:127`); trailing `a.….-page` `↗` 30 px fine / 44 px coarse (`:290–308`); `hidden={!open}` with the element always in the DOM when the scale has any row (`:80`, `ExploreBodyIndex.svelte:143–151`); `top: var(--index-top, 152px)` measured under `.hud-controls` (the solar-system rule, `ExploreBodyIndex.svelte:57–76`) with the `max-height: 500px` rule of `StarIndex.svelte:268–278`.

### 2.2 Rows by scale

| Scale | Row source (server load → client) | Row kinds and sections | Badges / filter chips | Select action | Page link now | Page link planned |
|---|---|---|---|---|---|---|
| solar-system | `getEntityIndex('explore')` ids (48) + page-side `localizedSun`, `localizedPlanets`, `SMALL_BODIES` (`+page.svelte:154–168`); moons from `satellites.json` | Sun · Planets (9) · Dwarfs and small bodies (23) · Moons (16) · Belts (2) | kind dot per kind (`bidx-dot--*`); chips All · Planets · Dwarfs · Comets (kind chips from plan C6, `ux-feedback-plan.md:351`) | `selectSun` / `selectPlanet` / `selectSmallBody` (`:873/852/884`); moons `selectSatellite` (`:900`); belts `selectBelt` (`:912`) | `/explore/<id>` on 32 + 16 rows | none beyond these |
| neighbourhood | `getStarLinks` (66) + deep-sky ids/designations from `deep-sky-objects.json` (141) | Stars (66) · Deep sky (141, grouped by category) | ⊕ planetary system (11 hosts), ◈ culture door; chips All · ⊕ Planets · ◈ Culture · Deep sky (+ one chip per deep-sky category through the existing `explore_ds_cat_*` labels) | stars `indexSelectStarFn`; deep-sky `selectDeepSkyFn` (needs the page to read it) | `/explore/stars/<id>` on 66 | `/explore/deep-sky/<id>` (typed path, ADR-096 item 15), after phase 3–4 |
| milky-way | `milky-way-schematic.json` merged exactly as the host merges it (`explore-scene-host.ts:613–642`), + Cygnus X-1 | Objects (Sun, Sag A*, Cygnus X-1) · Globular clusters (10) · Satellite galaxies (2) · Arms (5) | `●` black hole, `★` headliner (3 globulars); chips All · Globular · Satellite · Arms · Black holes (kinds `explore_mw_kind_*`) | `mwDeepLinkFn(id)` (`:758`); black holes `bhDeepLinkFn` | `/explore/black-holes/sagittarius-a-star`, `…/cygnus-x-1` | globulars follow deep-sky ids (`m3 m4 m5 m13 m15 m22 m92`) once deep-sky pages exist; `omega-centauri`, `47-tucanae`, `ngc-6752` and the arms are Milky Way pins with no other home (brief §1.6) |
| local-group | `local-group.json` (33) | one list, sorted by distance; group label from `parent` (`explore_lg_group_*`) | `★` headliner (6); chips All · Spiral · Irregular · Dwarf (the three blurb kinds, `explore_lg_kind_*`) | new `selectLgFn(id)` over `selectLocalGroup` | none | 4–6 headliners if a `/science` article backs them (brief §0) |
| local-sheet | `local-sheet.json` (9) | Groups (8) · Cloud (1) | `★` headliner (5); chips All · Groups · Cloud (`explore_ls_kind_*`) | new `selectLsFn(id)` | none | none (never) |
| virgo | `virgo-cluster.json` (7) + M87* | Groups · Cluster · Clouds · Black holes | `★` (2), `●` M87*; chips All · Group · Cluster · Cloud (`explore_virgo_kind_*`) | new `selectVirgoFn(id)`; M87* `bhDeepLinkFn` | `/explore/black-holes/m87-star` | none for the shell members |
| laniakea | `laniakea.json` (8) | Superclusters (5) · Attractor (1) · Clusters (2) | `★` (3); chips All · Supercluster · Attractor · Cluster (`explore_laniakea_kind_*`) | new `selectLaniakeaFn(id)` | none | none |
| cosmic-web | `cosmic-web.json` (7) + Gargantua | Superclusters · Concentration · Walls · Void · Fiction | `★` (3); chips All · Supercluster · Wall · Void · Concentration (`explore_cosmic_web_kind_*`) | new `selectCosmicWebFn(id)`; Gargantua `bhDeepLinkFn` | `/explore/black-holes/gargantua` | none |

The kind labels and badge titles are existing message keys (list in §3.9); no scale needs a kind word that the panels do not already print.

### 2.3 Where the rows come from: server load for all eight

`+page.server.ts` (13 lines, `:6–13`) already returns `entityIndex`, `starLinks`, `blackHoleLinks`. It grows to one `scaleIndex: Record<ShellId, ScaleIndexRow[]>` built by `getScaleIndexRows(locale, fetch)` in `src/lib/server/entity-index.ts`, next to `getStarLinks` (`:101–108`), reusing `sortedLinks` (`:89–99`) and the glossary lookup `GLOSSARY` (`:25–29`). Reasons:

1. Names are localised on the server the same way the entity pages name them (`entity-index.ts:42–65`), so INDEX row and page H1 cannot drift.
2. The client needs no extra fetch to show an INDEX at an outer scale: the scenes load their JSON lazily on first crossing (`ensureMilkyWay` `explore-scene-host.ts:600–661`, `ensureLocalGroup` `:679–`), and a row must exist before the reader opens the INDEX, not after the canvas settles.
3. `StarIndex` today keeps two row sources for one list (client `namedStars` and server `pageLinks`, `StarIndex.svelte:120–162`) and the `blackHoleIndex` client list; one source removes the "plain list until the stars arrive" branch.

The scene still owns the object: `onSelect(row)` calls a function by id; an id the scene does not know is a no-op (the host already returns early, e.g. `selectLocalGroup` `:2443–2444`).

### 2.4 The handle and the open state

Today: three copies of a vertical left-edge `Chip kind="toggle"` (`position: fixed; left: 0; top: 50%; z-index: 44; writing-mode: vertical-rl; transform: translateY(-50%) rotate(180deg)`; `+page.svelte:2209–2219`, `:2238–2250`; worlds `SurfaceScene.svelte:6952–6964` with `--index-handle-top`), label `explore_body_index_toggle` = "INDEX" in both explore handles (`+page.svelte:2112`, `:2140`), `surface_index_open` = "Index" on the worlds (`SurfaceScene.svelte:5712`). No keyboard shortcut for the toggle was found (Tab to the chip; Enter / Space; §6).

Proposal:
- One handle `.scale-index-handle` (one markup, one CSS rule), one `Chip kind="toggle"` with `data-testid="scale-index-toggle"`, label `explore_body_index_toggle` ("INDEX", reused: no key churn), `aria-label` = the active scale's `explore_index_aria_*`. Rendered at every scale except while a takeover owns the screen: `activeBlackHole` (the star handle already hides then, `+page.svelte:2131`), a deep-sky immersion, and the exoplanet BodyScene (`contextId 'body-scene'`, which has no index today, Q9).
- One `indexOpen` `$state` in the page replaces `bodyIndexOpen` (`:153`) and `starIndexOpen` (`:674`). It persists across scale jumps: open at the neighbourhood, jump to the Milky Way, the rail shows the Milky Way list. Each scale instance keeps its own query and filter (they are instance state).
- Panel `open={indexOpen && contextId === scale && view === '3d'-rule-of-that-scale && !takeover}`; the solar-system list also shows in the 2D view today (`+page.svelte:2102` has no `view` test), the neighbourhood list does not (`:2131`); the shared rule keeps each scale's present behaviour (config flag `needs3d`).
- Selecting keeps the rail open (master to detail on the right), as both parents do (`+page.svelte:2125`); the black-hole rows close it before the takeover (`:1795`), which stays.
- The handle must keep clear of the other chrome at each scale: the footer-dock spec treats `.body-index-handle` as one of the "no two HUD parts intersect" parts at eight window sizes (`footer-dock.spec.ts:125–168`, part list `:139–147`). That spec only runs on the solar system; the other scales' chrome (ScaleNav `left: 8px; top: 8px`, `ScaleNav.svelte:71–72`; ScienceLayersPanel `left: 50%`, `ScienceLayersPanel.svelte:527–533`; ScaleStrip `right: 12px; bottom: 46px`, `ScaleStrip.svelte:106–109`) was read, not measured (§6).

### 2.5 Mobile (touch, 375 px portrait, 667 × 375 landscape)

Facts read:
- There is no "Index drawer tab" on `/explore` any more. A1 made the INDEX a left-edge tab on every viewport; the comments in `+page.svelte:2095–2098`, `:2232–2237` and `ExploreBodyIndex.svelte:155–160` say so (the first of them still says "Mobile uses the Index drawer tab": stale text, §3). `MobileDrawerGroup` on `/explore` holds Ruler, Missions, Controls and Scan only, solar system only (`HudControls.svelte:364–386`); the neighbourhood and the other scales have no drawer.
- The panel is `width: min(320px, 100vw - 24px)`, `left: 12px`, `bottom: 12px`, top 152 (touch has no `.hud-controls`, so `--index-top` stays null and 152 applies; `ExploreBodyIndex.svelte:57–76`). On `max-height: 500px` (landscape phone) the star panel starts under the nav and scrolls as a whole (`StarIndex.svelte:268–278`); the body panel has no such rule.
- Row and page-link targets: the ↗ link is 44 px on a coarse pointer, 30 px on a fine one (`StarIndex.svelte:290–308`, `ExploreBodyIndex.svelte:243–261`), asserted by `expectLinkTargets` (`index-links.spec.ts:19–31`). The handle is a `Chip`, 44 px coarse (UXD-014, `IA.md:197`).
- Detail panels are bottom sheets on touch (`mobileSheet="partial"`, e.g. `LocalGroupPanel.svelte:52`). A bottom sheet and a 300 px left rail share a 375 px screen; whether they overlap was not measured (§6).

Design: `ScaleIndex` takes the shorter `max-height: 500px` rule of `StarIndex` as the one rule for both; the dead `inline` prop and `bidx-inline` branch are deleted (no drawer tab to feed); on a coarse pointer the INDEX closes when the reader jumps scale (the rail covers 85 % of a 375 px width), on a fine pointer it stays open (Q7).

### 2.6 Prerender: all eight lists in one HTML file

`/explore` is one prerendered file; `?context=` is client-side (`explore-url-sync.svelte.ts:280`), so `/explore?context=virgo` has the same HTML as `/explore`. `/explore/hub` links all eight contexts as `/explore?context=…` cards (`hub/+page.svelte:12–60`). A crawler therefore sees the INDEX lists of exactly the instances present in the `/explore` HTML.

Design: the page mounts `ScaleIndex` once per scale, in a loop over `CTX_ORDER`; each instance has `hidden={!(indexOpen && contextId === scale)}`, the same "in the DOM, hidden while closed" rule as ADR-096 item 11 (`ADR-096.md:63–71`). A scale's instance is rendered when it has at least one row with a page (today: solar system 48, neighbourhood 66, Milky Way 2, Virgo 1, Cosmic web 1); instances with no linked rows (Local Group, Local Sheet, Laniakea) mount on the client when the reader enters the scale, from the same server rows. Server rows contain every row (§2.3), but only rows with an `href` are written into the prerendered HTML, as plain `a` link rows (the `pageLinks` pattern, `StarIndex.svelte:152–162`); the `button` rows of page-less objects are client-rendered after hydration, so the static HTML carries no dead buttons. When the deep-sky pages ship, `href` appears on those rows and they enter the static HTML with no component change.

Size: the 118 anchors exist in the HTML today (`54d5a46c17c` message). The change adds two anchors' worth of reorder (the black holes move scale) and no new URL. The rows are also inside the page's inlined server data and its `__data.json`; 344 rows at about 60 bytes is about 21 KB per locale file before compression, an arithmetic figure, not a measurement. `scripts/route-budget.json` budgets `/explore` at 555 KB JS, 30 KB CSS, 95 KB lazy (`:8`, `:32`, `:50`): `ScaleIndex` replaces two components and removes two copies of the CSS, so the CSS term goes down; the 6 new per-scale config blocks and the 5 fn pointers add bytes that were not measured.

### 2.7 Black-hole placement

Evidence: `static/data/universe/black-holes.json` distances; the farthest named star is 1,977 ly (606 pc; `dist.py` over `named-stars.json`); scale extents `local-group.json` 10 Mly, `local-sheet.json` 10 Mpc, `virgo-cluster.json` 32 Mpc, `laniakea.json` 160 Mpc, `cosmic-web.json` 320 Mpc (about 1.04 Gly).

| Hole | Distance | Where it sits | Entry today | Recommended INDEX scale | Why |
|---|---|---|---|---|---|
| Sagittarius A* | 26,996 ly | Milky Way centre; already a MW pin (`milky-way-schematic.json` `objects`) | neighbourhood foot section; MW pin (redirect, `explore-scene-host.ts:2413–2416`) | **Milky Way** | it is a Milky Way pin that already lives there; the neighbourhood is 1,977 ly across |
| Cygnus X-1 | 7,241 ly | inside the Milky Way, outside the 1,977 ly named-star field | neighbourhood foot section only | **Milky Way** | its distance is Milky Way scale; the schematic has no pin for it (so the row is "no scene object" until a pin with `x, z` is added, §6) |
| M87* | 54,794,271 ly (16.8 Mpc, EHT) | centre of M87, the Virgo Cluster's central galaxy (`virgo-cluster.json` member `virgo-cluster` at 16.5 Mpc) | neighbourhood foot section only | **Virgo** | 16.8 Mpc is outside the Local Sheet (10 Mpc) and inside the Virgo shell (32 Mpc) |
| Gargantua | 10,000,000,000 ly (model parameter, no source; `ADR-096.md:133–136`) | fiction; farther than the Cosmic web shell (320 Mpc) | neighbourhood foot section only | **Cosmic web, a final "Fiction" section** (alternative: none of the eight, Q1) | no real scale contains it; the outermost list is where "farther than everything" lands; the row carries the existing fiction badge (`bh_fiction_badge`), dashed and muted as on its page |

After the move the neighbourhood INDEX has no black-hole section; `star_index_black_holes` ("Black holes") becomes the section title in the Milky Way and Virgo lists. The reader's entry to a lensing takeover is the INDEX of the scale where the hole is, as the operator described for planets and stars (ADR-096 item 14, `:106–110`).

## 3. Cascade

### 3.1 Routes and components

| Piece | Change |
|---|---|
| `src/lib/components/ScaleIndex.svelte` (new) | the one component, §2.1 |
| `src/lib/components/StarIndex.svelte`, `ExploreBodyIndex.svelte` | deleted (or kept as 5-line wrappers only if the operator wants a staged cut-over; recommendation: delete) |
| `src/lib/styles/index-panel.css` (new) | shared panel, row, `↗`, section, count, empty rules |
| `src/routes/explore/+page.svelte` | delete `bodyIndexOpen` `:153`, `starIndexOpen` `:674`, `blackHoleIndex` `:193`, the `getBlackHoles()` call `:1041–1047`, the two mounts `:1785–1799`, `:2102–2143`, both handle CSS blocks `:2209–2219`, `:2238–2250`; add one handle, one `indexOpen`, the 8-instance loop, five new `*Fn` pointers read from the host (`:769, 775, 781, 787, 793` neighbours) and `selectDeepSkyFn`; fix the stale comments `:2095–2101`, `:2232–2237` |
| `src/lib/three/explore-scene-host.ts` | return `selectLocalGroup`, `selectLocalSheet`, `selectVirgo`, `selectLaniakea`, `selectCosmicWeb` (`:4266–4309`, plus the bridge types near `:245–259`); no behaviour change |
| `src/routes/explore/+page.server.ts` | `scaleIndex` replaces `starLinks` + `blackHoleLinks` + `entityIndex` or wraps them |
| `src/lib/server/entity-index.ts` | `getScaleIndexRows`; `getStarLinks` / `getBlackHoleLinks` become internal sources |
| `src/lib/explore/scale-index.ts` (+ `.test.ts`) | pure row builders and the per-scale config; the `src/lib/explore/README.md` module map gets a row |
| `src/routes/explore/hub/+page.svelte` | none (cards already link all eight contexts) |
| `src/routes/explore/stars/[id]`, `black-holes/[id]` | none (crumbs already go to `/explore`, `54d5a46c17c`) |
| Other routes | `/moon /mars /venus /earth`: none in this slice (their `SurfaceIndexPanel` joins in Q10); `/missions /fleet`: none (`EntityIndex` at the page foot) |

### 3.2 Tests (existing, by selector they hold)

| Spec | Lines | Selector that changes |
|---|---|---|
| `tests/e2e/index-links.spec.ts` | `:151–181` (`.body-index`, `a.bidx-page`, `explore-body-index-toggle`), `:183–213` (`.star-index`, `a.si-page`, `.star-index-handle`) | rewritten into one parametrised spec over the eight scales (§4.2); keeps `expectLinkTargets` and `expectOneTabStop` helpers (`:19–40`) |
| `tests/e2e/a11y-keyboard.spec.ts` | `:60–76` (`explore-body-index-toggle`, `.bidx-list`, `button.bidx-row`) | new testid and class |
| `tests/e2e/chip-row.spec.ts` | `:229–230` | `.body-index button.bidx-row` |
| `tests/e2e/chip.spec.ts` | `:324` (`.bidx-close`), `:376–377` (`.bidx-row`, `.si-row`), `:490` (`.body-index-handle`) | the selector lists that assert chip look and 30 / 44 px |
| `tests/e2e/explore-deeplinks.spec.ts` | `:38–39, 47–48, 55–56, 73–74` (`.star-index-handle`, `.si-row[data-index-id=…]`) | handle and row selector |
| `tests/e2e/footer-dock.spec.ts` | `:144` (`['index tab', '.body-index-handle']`) | handle class; the part list stays |
| `tests/e2e/mobile-landscape.spec.ts` | `:20`, `:39` (`/explore` landscape) | add the INDEX open state |
| `tests/e2e/mobile-invariants.spec.ts`, `mobile-layout.spec.ts` | `:71–75`, `:68` | none expected; re-run |
| `tests/e2e/explore-milky-way.spec.ts`, `explore-local-sheet`, `explore-virgo`, `explore-laniakea`, `explore-cosmic-web.spec.ts`, `explore-scale-picker.spec.ts` | drive scales by `?context=` / `?galaxy=` and dev hooks | none; they gain INDEX cases in §4.2 |
| `tests/e2e/black-hole-pages.spec.ts`, `star-pages.spec.ts` | static HTML of the pages | none (the crumb target `/explore` is unchanged) |
| `tests/e2e/visual.spec.ts` | only `explore-hub-grid` snapshots exist for Explore (`visual.spec.ts:206–208`; PNGs `explore-hub-grid-{desktop,mobile,mobile-landscape}-chromium-linux.png`); `/explore` itself is excluded as 3D-heavy (`:29`) | no baseline regenerates |
| Unit | `src/lib/explore/scale-index.test.ts` (new), `src/lib/server/entity-index` test if one exists (not checked), `scripts/site-routes.test.ts` | §4.1 |

### 3.3 Docs

| Doc | Place | Change |
|---|---|---|
| ADR-096 | item 11 `:63–71`, item 14 `:100–110`, item 15 `:111–116`, item 16 `:138` | amend 11 and 14: the INDEX is one component on all eight scales, links per row, all eight lists in the prerendered `/explore`; item 16: the black-hole rows sit in the Milky Way / Virgo / Cosmic web lists, not the neighbourhood; item 15: the INDEX rows exist before the pages |
| New decision record | `docs/uxs/decisions/UXD-017-one-index-on-every-scale.md` (UXD-016 is the last, `ls docs/uxs/decisions`) + its README index | records the operator decision and the black-hole placement |
| `docs/adr/TA.md` | `:48` (canvas object indexes: lists the body index, site index, `/iss` `/tiangong`; omits `StarIndex`), `:110` (entity-page paragraph), changelog table row near `:1204–1213` | replace `ExploreBodyIndex` / add the eight-scale statement; add the version row |
| `docs/uxs/IA.md` | `:27–28` (Black holes / Stars rows: "linked from the neighbourhood star INDEX"), `:197` (chip rules, unchanged) | black holes: linked from the Milky Way, Virgo and Cosmic web INDEX; stars: neighbourhood INDEX; add a row "INDEX on every scale" |
| `AGENTS.md` | `:97` (SEO surface row), `:782–785` (scene routes have no A–Z tab; the neighbourhood's star INDEX…) | state the eight-scale INDEX and the black-hole scales |
| `src/routes/explore/README.md` | `:24–30` | one paragraph on the INDEX and the server `scaleIndex` |
| `src/lib/components/README.md` | `:9` (`StarIndex … ExploreBodyIndex`), `:16` (`EntityIndex` line) | `ScaleIndex` replaces both names |
| `src/lib/universe/README.md` | mentions `StarIndex` | rename |
| `docs/uxs/decisions/UXD-015-flat-chip-row.md` | `:73` "Stars in the /explore neighbourhood index have no entity pages, so they carry no links." | stale since ADR-096 items 13–14; correct it (doc-vs-code divergence, AGENTS.md rule 28) |
| `docs/wip/2026-11-12-slice-A5-brief.md` | §0b.3 same sentence | stale for the same reason; correct |
| `docs/wip/2026-11-11-ux-feedback-plan.md` | "Index (Explore)" I1–I4 (`:180–186`), C6 (`:351`), deep-levels block (`:471–476`) | add the slice row; C6 (meta line, kind filters, planet colours) is carried by the same component |
| `docs/wip/2026-11-12-deep-entity-pages-brief.md` | `:211` ("Not read: whether `StarIndex` is in the DOM of the prerendered `/explore`") | answered by this brief §2.6 (the answer is yes since `54d5a46c17c`, read in `+page.svelte:1785`, not re-measured) |

### 3.4 Scripts and build gates

| Script | Place | Effect |
|---|---|---|
| `scripts/build-route-lastmod.mjs` | `SEED_DATA['/explore']` `:56–60` lists `planets.json`, `satellites.json`, `small-bodies.json` only | `/explore` now links 66 star pages and 4 black-hole pages and, after this slice, renders rows from every universe file; its lastmod does not move when `named-stars.json`, `exoplanet-systems.json`, `black-holes.json`, `local-group.json`, `local-sheet.json`, `virgo-cluster.json`, `laniakea.json`, `cosmic-web.json`, `milky-way-schematic.json`, `deep-sky-objects.json` change. Add them; `npm run route-lastmod` in the release PR; `scripts/build-route-lastmod.test.ts` case. `/explore/hub` (`:61`) is unaffected |
| `scripts/site-routes.mjs` | `starPageIds` `:146`, `blackHolePageIds` `:168` | no change now; the later deep-sky / Local Group pages add `…PageIds()` functions that feed `getScaleIndexRows` |
| `scripts/check-seo.mjs` | `ENTITY_ROUTE` `:71–72`, `NOT_ENTITY` `:74` | no change (no new route) |
| `scripts/check-internal-links.mjs`, `check-prerender-completeness.mjs` | run in `npm run build` (`package.json:36`) | the 118 anchors must still resolve; the build gate is the check (§4.1) |
| `scripts/check-route-budget.mjs` / `route-budget.json` | `/explore` 555 / 30 / 95 KB | re-measure after the build; the rule is "measured + 5" (`route-budget.json` comment) |
| `prune-streamed-assets.mjs` (mobile) | ADR-096 item 7: mobile drops entity pages | INDEX anchors in the mobile build point at pruned pages today as well; unchanged, see §6 |

### 3.5 Locale messages (14 locales: `messages/{ar,de,en-US,es,fr,hi,it,ja,ko,nl,pt-BR,ru,sr-Cyrl,zh-CN}.json`)

Glossary-first rule (memory "Names: glossary first"; deep-text README step 5): no new object name is introduced by this slice (rows show the names the panels and pages already show), so `scripts/i18n-tools/native-terms.json` needs no new entry for the INDEX itself. It needs entries before any of the member names (Local Group dwarfs, shell members, deep-sky names; English in the data today, `LocalGroupPanel.svelte:52–56`) is shown translated: the deep-entity brief §1.1 records that `native-terms.json` has `andromeda`, `large magellanic`, `virgo cluster`, `laniakea` and nothing for `m87`, `cygnus x-1`, `sagittarius a`. This slice shows the panels' names; it adds no translated names.

Reused keys (no change): `explore_body_index_toggle` ("INDEX", the handle), `explore_body_index_aria`, `star_index_aria`, `surface_index_search`, `surface_index_empty`, `surface_index_open_page`, `surface_index_all`, `star_index_close` / `panel_close`, `star_index_filter_planets`, `star_index_filter_culture`, `star_index_planetary_system`, `star_index_culture_door`, `star_index_black_holes`, all `explore_mw_kind_*`, `explore_lg_kind_*`, `explore_ls_kind_*`, `explore_virgo_kind_*`, `explore_laniakea_kind_*`, `explore_cosmic_web_kind_*`, `explore_ds_cat_*`, `explore_bh_kind_*`, `bh_fiction_badge`, `explore_ctx_*` (scale names), `explore_lg_group_*`.

New keys (proposed names; every one needs all 14 locales and the per-locale check of "Numbers in all locales"; none contains a number):

| Key | en-US | Replaces / use |
|---|---|---|
| `explore_index_aria_milky_way` | "Milky Way index — jump to the Sun, a globular cluster, a satellite galaxy, a spiral arm or a black hole" | handle and panel aria |
| `explore_index_aria_local_group` | "Local Group index — jump to a member galaxy" | idem |
| `explore_index_aria_local_sheet` | "Local Sheet index — jump to a member group" | idem |
| `explore_index_aria_virgo` | "Virgo Supercluster index — jump to a member" | idem |
| `explore_index_aria_laniakea` | "Laniakea index — jump to a member" | idem |
| `explore_index_aria_cosmic_web` | "Cosmic web index — jump to a structure" | idem |
| `explore_index_filter_aria` | "Filter the index" | `star_index_filter_aria` ("Filter stars") generalised |
| `explore_index_no_match` | "Nothing matches “{query}”." | `star_index_no_match` generalised |
| `explore_index_section_stars`, `_deep_sky`, `_planets`, `_small_bodies`, `_moons`, `_belts`, `_objects`, `_globulars`, `_satellites`, `_arms`, `_fiction` | section headings | new |
| `explore_index_filter_headliner` | "Highlights" | the ★ chip |

Keys removed after the cut-over (14 locales each): `star_index_aria`, `star_index_filter_aria`, `star_index_no_match`, `star_index_search_aria`, `star_index_search_placeholder` (superseded by `surface_index_search`), `explore_body_index_aria` if the solar-system aria moves to an `explore_index_aria_solar_system`. Whether to keep the two existing names is an operator-visible choice only in cost: every rename is 14 files. Recommendation: keep `explore_body_index_aria` and `star_index_aria` as the solar-system and neighbourhood arias (no churn), delete only keys that have no caller after the cut. The unused-key gate was not found (§6), so deletions are by `git grep` of each key.

## 4. Check list

### 4.1 Deterministic checks (a checker runs these; each prints a count to compare)

| # | Check | Command / pattern | Expected |
|---|---|---|---|
| C1 | one open state | `git grep -n -E "starIndexOpen\|bodyIndexOpen" -- src tests` | 0 lines |
| C2 | one handle | `git grep -n -E "star-index-handle\|body-index-handle" -- src tests` | 0 lines |
| C3 | old components gone | `ls src/lib/components \| grep -E "^(StarIndex\|ExploreBodyIndex)\.svelte$"` | no output |
| C4 | one component mounted per scale | `git grep -n "<ScaleIndex" -- src/routes/explore/+page.svelte` | exactly 1 mount line inside a loop over `CTX_ORDER` |
| C5 | hidden but in the DOM | `git grep -n "hidden={" -- src/lib/components/ScaleIndex.svelte` | the `aside` carries `hidden={!open}`; no `{#if open}` around the `aside` |
| C6 | roving selector covers both row kinds | `git grep -n "itemSelector" -- src/lib/components/ScaleIndex.svelte` | one selector listing `button` rows and `a` page links |
| C7 | no literal duplicate of the panel top | `git grep -n "152px" -- src/lib/components src/lib/styles src/routes/explore` | only the shared fallback in `index-panel.css` |
| C8 | page-link target size rule once | `git grep -n -E "min-width: 44px\|min-width: 30px" -- src/lib/components src/lib/styles` | one pair, in the shared file |
| C9 | row ids = data ids, per scale | vitest `scale-index.test.ts`: for each file in `{local-group, local-sheet, virgo-cluster, laniakea, cosmic-web}.json` the row ids equal `members[].id`; Milky Way row ids equal `objects ∪ globulars ∪ magellanic ∪ arms` ids (19) + `cygnus-x-1`; neighbourhood rows equal `named-stars` ∪ exoplanet hostIds (66) ∪ deep-sky ids (141); solar system rows equal Sun ∪ planets ∪ small bodies (33) | all equal; counts 344 total |
| C10 | every black hole in exactly one scale | same test: each id of `black-holes.json` appears in exactly one scale's rows | 4 ids, 4 scales (MW ×2, Virgo, Cosmic web) |
| C11 | every page-bearing id has a link | same test over `collectCanonicalRoutes()`: every `/explore/<id>`, `/explore/stars/<id>`, `/explore/black-holes/<id>` has a row with that `href` | 48 + 66 + 4 = 118 |
| C12 | prerendered HTML links (after `npm run build`; the built path of `/explore` is `build/explore.html` or `build/explore/index.html`, take the one that exists) | `grep -o 'href="[^"]*/explore/stars/[^"]*"' <file> \| sort -u \| wc -l` → 66; `…/explore/black-holes/…` → 4; `grep -o 'href="/explore/[a-z0-9-]*"'` minus `hub` → 48; repeat on `build/de/explore*` with `/de/` | 66 / 4 / 48 in `''` and `/de` |
| C13 | eight lists in the static HTML | `grep -o 'data-scale="[a-z-]*"' <file> \| sort -u \| wc -l` | the scales that have a linked row (5 today: solar-system, neighborhood, milky-way, virgo, cosmic-web); 8 once pages exist |
| C14 | no dead button in the static HTML | `grep -c 'class="[^"]*row[^"]*"' <file>` on `<button` rows | 0 `button` rows before hydration |
| C15 | locales complete | for each new key `for f in messages/*.json; do grep -c '"explore_index_aria_virgo"' $f; done` | 14 × 1; same for every key in §3.5 |
| C16 | removed keys really unused | for each removed key `git grep -n '<key>' -- src tests` | 0 callers |
| C17 | lastmod seed | `grep -n "named-stars.json" scripts/build-route-lastmod.mjs` and the same for the other nine files | each present under `'/explore'` |
| C18 | docs agree with code | `git grep -n -E "StarIndex\|ExploreBodyIndex" -- docs AGENTS.md src/lib/components/README.md src/routes/explore/README.md src/lib/universe/README.md` | only history / changelog lines |
| C19 | type, lint, unit | `npm run check`; `npx eslint --no-cache src/lib/components/ScaleIndex.svelte src/routes/explore`; `npx prettier --check --no-cache <changed files>`; `npx vitest run src/lib/explore/scale-index.test.ts scripts/site-routes.test.ts scripts/build-route-lastmod.test.ts` | exit 0 each (trust the exit code, `CLAUDE.md` "Bash output filtering") |
| C20 | build gates | `npm run build` (runs `check-route-budget`, `prune-build-staging`, `check-prerender-completeness`, `check-internal-links`, `check-seo`, `package.json:36`) | exit 0; `/explore` budget lines within 555 / 30 / 95 |

### 4.2 E2E plan

New spec `tests/e2e/scale-index.spec.ts` (and `index-links.spec.ts` trimmed to the worlds and the static-HTML counts), run with `--workers=1` on all three projects of `playwright.config.ts` (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; `:66`, `:70`, `:83`):

1. Static HTML (`request.get`, no browser, en and `/de`): C12 and C13 counts; every `href` in the INDEX lists appears in `collectCanonicalRoutes()`.
2. For each of the eight scales, `page.goto('/explore?context=<scale>')`, `waitForHydration`: (a) its `aside[data-scale]` is hidden and in the DOM; (b) click `scale-index-toggle`, the panel is visible and the other seven are hidden; (c) `expectOneTabStop` over `button, a.…-page`; (d) ArrowDown moves focus; (e) typing in the search box filters and the count reads `n / total`; (f) Enter on a row opens that object's panel (`aside.panel` visible with the member name) and the INDEX stays open; (g) `expectLinkTargets` on the `↗` links where any exist (30 px fine, 44 px coarse); (h) the toggle is 30 / 44 px and does not intersect the other HUD parts (extend the part list of `footer-dock.spec.ts:139–147` to the other scales).
3. Black holes: Milky Way INDEX shows Sagittarius A* and Cygnus X-1, Virgo shows M87*, Cosmic web shows Gargantua under "Fiction"; the neighbourhood INDEX has no black-hole section; selecting each opens the BlackHolePanel and the INDEX closes (`+page.svelte:1795` rule).
4. Scale jump keeps the rail: open at the neighbourhood, jump to the Milky Way, the Milky Way list shows; on `mobile-chromium` it closes (Q7).
5. Existing specs re-run unchanged except the selectors in §3.2: `explore-deeplinks`, `explore-milky-way`, `explore-local-sheet`, `explore-virgo`, `explore-laniakea`, `explore-cosmic-web`, `explore-scale-picker`, `a11y-keyboard`, `chip`, `chip-row`, `footer-dock`, `mobile-invariants`, `mobile-layout`, `mobile-landscape`, `a11y` (axe on `/explore` with an INDEX open at two scales).
6. Visual: no committed baseline covers `/explore`. After the build, screenshots by hand per the standing rule (small shots after each slice; memory "Decisions apply project-wide") at 1440 × 900, 1100 × 700, 375 × 812 and 667 × 375 for each of the eight scales with the INDEX open and closed: 64 images. `explore-hub-grid` baselines (3 PNGs) are untouched.
7. Not an e2e job: the release rule "full local e2e on BOTH projects before tagging" (`CLAUDE.md`) applies to the release, not to this slice.

## 5. Questions for the operator (recommendation first)

1. **Black-hole placement.** Recommend Sagittarius A* and Cygnus X-1 in the Milky Way, M87* in Virgo, Gargantua in a "Fiction" section at the foot of the Cosmic web list; none left in the neighbourhood (§2.7). Alternatives: (a) keep all four in the neighbourhood as today; (b) Gargantua in no INDEX and linked only from a page (its page is still in the sitemap, but then `/explore` HTML no longer links it, against ADR-096 item 11). Go?
2. **Objects without a page still get INDEX rows.** Recommend yes: the INDEX is the DOM mirror of the scene (`TA.md:48`), and 226 of 344 rows have no page; a row without a page is a button that selects, a row with a page adds the `↗`. Alternative: rows only for objects with pages (118 rows, six scales still empty). Yes?
3. **Neighbourhood list size.** Recommend 66 stars and 141 deep-sky objects in one list with a "Deep sky" chip and a section heading, default chip All, search over both. Alternative: deep-sky only after the "Deep sky" chip is chosen (the glints layer is off by default, `showDeepSky`). Which?
4. **Per-scale filters.** Recommend kind chips from the existing kind labels (§2.2) plus a "Highlights" chip where `headliner` exists, at most five chips per scale; no distance or size filter. Alternative: search only on the five small shells (7–9 rows). Which?
5. **Prerender shape.** Recommend all eight instances mounted, hidden, rows with a page server-rendered as link rows and page-less rows client-rendered (§2.6). Alternative: server-render every row including inert buttons (about 226 dead buttons in the static HTML). OK with the first?
6. **Same object, two scales** (`lmc`, `smc`, `m31`/`andromeda`, `m32`, `m110`, the seven globulars, `local-group`). Recommend two rows (one per scale), one canonical page id chosen when those pages are built (deep-entity brief §1.6, §7 last bullet). Alternative: one row at the first scale only. OK?
7. **Open state across scale jumps.** Recommend one `indexOpen` that persists on a fine pointer and closes on a coarse one (the 300 px rail covers most of 375 px). Alternative: always persist, or always close. Which?
8. **Select behaviour at the outer scales and shareable links.** Recommend highlight + panel only, as a canvas click does today, and no new `?lg=` / `?ls=` URL params in this slice. Alternative: frame the camera on the row (plan C1 "Select = focus", `ux-feedback-plan.md:346`, needs new camera code in five scenes) and add member deep links. Defer both?
9. **Exoplanet BodyScene** (`contextId 'body-scene'`, 11 systems, 26 planets, no INDEX today). Recommend a ninth, per-system list in a later slice (the planets of the entered system), not here: the operator named eight scales. Add now instead?
10. **Worlds.** Recommend this slice shares only the CSS (`index-panel.css`) with `SurfaceIndexPanel`, and moves the worlds onto `ScaleIndex` in a following slice (their filters are agency / era / status / orbit-land, `SurfaceIndexPanel.svelte:60–`; a different row model). Alternative: one slice for all four worlds and the eight scales. Which?
11. **Solar-system additions (plan C6).** Recommend folding in 16 moon rows, 2 belt rows, a meta line and planet colour dots, since the component is new anyway (`ux-feedback-plan.md:351`, I1–I3). Alternative: carry over the 33 current rows unchanged. Fold in?
12. **Old component names.** Recommend deleting `StarIndex` and `ExploreBodyIndex` in the same slice, with the test selectors updated. Alternative: keep thin wrappers for one release. Delete?
13. **Doc corrections found on the way** (`UXD-015:73`, `A5 brief §0b.3`, `TA.md:48`, the "Index drawer tab" comments in `+page.svelte:2095–2098, 2232–2237`, `SurfaceScene.svelte:6945–6947`): recommend fixing all in the slice, since AGENTS.md rule 28 forbids doc-vs-code divergence. Yes?

## 6. NOT VERIFIED

Everything in §2 and §4 is a design and a plan; none of it was built. Beyond that:

**No execution of any kind.**
- No build, dev server, browser, test, lint, `check-seo`, `check-internal-links`, `route-lastmod`, `npm run check`. Every width, height, tap target, overlap and byte figure is arithmetic from CSS and JSON. The "about 21 KB per locale" estimate for the extra server data is 344 rows × 60 bytes, not a measurement of the SvelteKit payload.
- The 118 existing anchors in the prerendered `/explore` come from the commit message of `54d5a46c17c` ("dev SSR: stars:66 bh:4 in en and de") and from reading `StarIndex.svelte:152–162` and `ExploreBodyIndex.svelte:130–134`; no `build/` file was opened. The 48 body pages are a count of `bodyRoutes()` inputs (9 planets, 16 satellites, 24 small bodies, Pluto in two lists), computed, not read from a built tree. Whether the built path is `build/explore.html` or `build/explore/index.html` was not checked.
- `window.__exploreSelect*` are dev-only hooks (`explore-scene-host.ts:1682`); how the Local Sheet / Virgo / Laniakea / Cosmic web specs drive their scenes (`explore-local-sheet.spec.ts` etc.) was not read, so the claim "they gain INDEX cases" assumes `?context=` plus hydration is enough to reach each scene in e2e.

**Counts and data.**
- Row totals (344, 118 linked, 226 not) depend on three decisions that are open: Cygnus X-1 gets a row (+1), moons and belts get rows (+18), deep-sky rows are in the neighbourhood list (+141). Without them: 183.
- Culture-door count (`cultureObjectIds`, the ◈ badge) was not counted; exoplanet host count 11 is from `exoplanet-systems.json`.
- Region membership of the 141 deep-sky objects was not examined (which are also Milky Way globulars, which are Local Group members); only the id collisions listed by the deep-entity brief §1.6 were reused, and one collision list (`m3 m4 m5 m13 m15 m22 m92`) was not re-run.
- Cygnus X-1 has no pin in `milky-way-schematic.json`; whether a schematic `x, z` can be derived from its `ra`/`dec` and distance was not worked out. Until a pin exists, its Milky Way row selects the lensing takeover and highlights nothing in the scene.
- The neighbourhood scene's anonymous star field radius was not read; the claim that Cygnus X-1 (7,241 ly) is outside the neighbourhood rests on the farthest named star (1,977 ly) only.
- Whether `getEntityIndex` and its callers have a unit test was not checked.

**Behaviour not read.**
- The Local Sheet, Virgo, Laniakea and Cosmic web scene files (`local-sheet-scene.ts` …) were opened only for `userData` / `pickables` lines; hover, highlight and label behaviour per scene was not read. The Local Group `highlight(id)` and the others are assumed to accept a row-driven call because the select functions call them (`explore-scene-host.ts:2448, 2477, 2506, 2535, 2564`).
- `explore-url-sync.svelte.ts` was read by `grep` of its parameter names (`:82–303`), not line by line; "no `?lg=` link" is the absence of a grep hit.
- No keyboard shortcut for the INDEX toggle was found by `git grep` of the two testids and `KeyI` in `+page.svelte` and `src`; a shortcut registered elsewhere (a global hotkey module, Cmd-K actions) was not searched for.
- Whether `Panel` bottom sheets on touch overlap a 300 px left rail at 375 px, and whether the rail covers the `ScaleNav` (`left: 8px; top: 8px`), the `ScaleStrip` (`right: 12px; bottom: 46px`) or the `ScienceLayersPanel` on touch, was not measured. The footer-dock HUD-clearance spec covers the solar system only (`footer-dock.spec.ts:151–168`), so no existing test says the handle is clear at the other seven scales.
- `top: 152px` on touch (no `.hud-controls`) and `--index-top` at the other scales (where `.hud-controls` is `context-hidden`, `HudControls.svelte:~400`) were read from CSS; the real first-row position per scale was not seen.
- The mobile build (ADR-096 item 7: pruned entity pages) keeps `/explore` with INDEX anchors to pages that are not shipped; whether `check-internal-links` skips them on the mobile build was not read.

**Gates and tooling.**
- Whether a gate flags unused message keys was not found (grep of `scripts/` for such a gate returned only unrelated hits); §3.5's removal list is therefore by `git grep`, not by a gate.
- `route-budget.json` figures (555 / 30 / 95) are quoted; whether `ScaleIndex` (one component, one CSS file, six config blocks, five pointers) lands above or below them was not measured.
- The `SEED_DATA['/explore']` gap (§3.4) is read from `build-route-lastmod.mjs:56–60`; whether a separate rule (`inputsFor`, `:271–300`) adds the star and black-hole files for `/explore` was not read past the `explore/stars` and `explore/black-holes` branches at `:274`, `:288`.
- `UXD-017`, the five new `*Fn` names, `ScaleIndex`, `index-panel.css`, `scale-index.ts`, the message keys of §3.5 and the `data-scale` attribute are proposals; none of the names exists in the repo (`git grep` of each returns nothing at this HEAD, checked for `ScaleIndex` only).

**Scope not covered.**
- The `/moon /mars /venus /earth` INDEX (`SurfaceIndexPanel`), `/iss` and `/tiangong` module lists (`StationRoute.svelte:142, 1423`), `EntityIndex` on `/missions` and `/fleet`: not designed here beyond Q10.
- Iconic-mission chips, orbit regimes (RegimePanel) and the PATHS legend as INDEX rows: not designed; they have their own DOM.
- RTL (ar) mirroring of a left-edge handle and rail: the worlds' handle is also a left-edge tab (`SurfaceScene.svelte:6952–6964`) and `a11y-rtl-probe.spec.ts` exists, but its coverage of the INDEX was not read.
- Localised member names (Local Group dwarfs, shell members, deep-sky names): data names are English; this slice shows them as the panels do. Translating them needs `native-terms.json` entries first and belongs to the page phases of the deep-entity brief.
- Search over transliterated or native names: the search matches the displayed name only, as both parents do (`StarIndex.svelte:64–68`, `ExploreBodyIndex.svelte:53–55`).
- The uncommitted working tree (catalogue layer, `DataSources.svelte`, `BlackHolePanel`, `DeepSkyPanel`, `LocalGroupPanel` edits) was not diffed for interaction with the INDEX; `git status` shows none of the INDEX files modified.
