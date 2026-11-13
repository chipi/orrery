# L45 brief — where else small round photos would make a list less boring (thumbnail scan)

**Status (2026-11-13):** all 8 recommendations of §13 approved (option a each); T1 built (`0d474235b49`, `0baa9029a70`); T2 built (the two INDEXes, UXD-025 "T2", CHANGE-INVENTORY L45-T2): corrections to this brief found by reading the loaders: `/mars` reaches 27 of 27 (`mars2` and `mars6` resolve to their mission folders), an Earth object falls back to the mission folder only (not the fleet folder; the seven Moon-orbit objects have mission folders), and `/earth` has 42 launch pads (73 rows with the 31 objects); T3a and T4 built (station lists 30 of 31, belt members 6 of 9, the fleet panel with the MISSIONS tab named by mission name instead of the raw id, `/fleet/<id>`, site-page hardware, `/programs/<id>`, the `/earth` museum card 86 of 88; UXD-025 "T3a" and "T4"; corrections found in the data: only 14 `/mars` pages and 2 `/moon` pages (not `/moon/apollo11`) have a hardware list, 6 to 32 photos per `/fleet/<id>` page, the MISSIONS tab of an entry with crew flights shows the flights and is labelled CREW); T3b built (the PATHS legend: 18 of 18, ring the path colour, Voyager 2 neutral, UXD-025 "T3b"); correction to this brief: the legend does not grow by 36 px, because the fine-pointer rows were already 28 px after C7 (the arithmetic assumed 36 px), so the 28 px thumb fills the row and the list stays 538 px.

Read-only brief, written at HEAD `48537a8fef6` on `tech-debt/0.9.9`. Method: `git grep` and reading every `{#each}` list in `src/routes` and `src/lib` that draws named things, then five read-only node scripts over `static/images/`, `static/credit-thumbs/`, `static/data/` and `i18n-src/` (scratchpad `l45-*.mjs`, not in the repo; their numbers are quoted below). Coverage means "a file exists on disk"; no image was opened, no browser, build or test was run, nothing was downloaded, no code was changed. C6 is being built beside this scan (operator 2026-11-13), so line numbers for `ScaleIndex.svelte`, `index-panel.css`, `scale-index.ts` and `SurfaceIndexPanel.svelte` are quoted from `HEAD`, not from the working tree, and those four files move under C6.

## 0. Answer first

1. **Six lists are worth the thumbnail, in this order:** the Worlds' INDEX (`/moon` 28 rows, `/mars` 27, `/venus` 3, `/earth` 31 objects plus pads; 25 to 28 of 28 covered), the solar-system INDEX (51 rows, 39 covered), the station module lists (`/iss`, `/tiangong`, 31 rows, 30 covered), the founding missions and PATHS legend (23 of 38 and 18 of 18), the fleet panel's mission and hardware lists (all covered) and the Related and hardware lists on `/fleet/<id>`, `/programs/<id>` and site pages (all linked rows covered).
2. **Four lists look good in the data and bad on screen, so hold them:** the neighbourhood INDEX (209 rows, 54 with a photo, 26 %), the six outer-scale INDEXes and the galaxy/structure Related lists (84 members, 10 with a photo, 12 %), launch rows (images are other people's URLs, not our pipeline) and the `/fleet?view=list` view (294 rows, covered, but nothing in the page links to it).
3. **C4 has a defect this scan found:** `static/data/orbit-regime-thumbs.json` always points at `01.1x1.jpg`, and for 11 of its 49 residents the operator's hero review blessed a different slot (LRO, Clementine, Chandrayaan-1, Hope, Mars Express, Mangalyaan, Mars Odyssey, Haumea, Earth, Mars; list in §2.2). Those 11 round photos show a picture the review rejected (a labelled diagram, a different entity). Any shared thumb must resolve the hero slot, as `entityHero()` already does.
4. **C4's thumb is inline markup, not a component** (`RegimePanel.svelte:146-170`, CSS `:308-330`), keyed by a hand-kept 49-line map. Proposal: one `EntityThumb.svelte` plus one generated manifest, built first (slice T1), so every later list is a few lines and the ring, size, `alt=""`, lazy loading and the dot fallback live in one place.
5. **The existing pipeline already has a 192 px WebP thumb** (`static/credit-thumbs/images/<dir>/<id>/NN.1x1.webp`, built for `/credits`, 3 to 7 KB) next to the 512 px `01.1x1.jpg` C4 uses (30 to 56 KB each). It covers 68 of 126 missions and 42 of 294 fleet entries today; the same generator, run over the blessed hero slots, closes the gap with about 350 files (estimate, §3.3). Decision 1.
6. **Four slices, T1 to T4** (§7). T2 (the two INDEXes) edits the files C6 is editing: build it after C6 lands (Decision 5).
7. **Needs the operator before code:** 8 forks in §13.

**Operator decision 2026-11-13:** all 8 recommendations in §13 approved (option a each); T1 to T4 approved, built in this order. The C4 defect was repaired before T1 in `1e405882d2f` (12 thumbs, TGO included, which §2.2 missed); its test now checks every thumb against the `*-hero-overrides.json` files.

## 1. What was asked, and the house rules

Operator, 2026-11-13: the 28 px round resident photos with an agency-colour ring (C4, UXD-024) are good; where else would small images of the thing make lists more visual? Plan row L45 (`docs/wip/2026-11-11-ux-feedback-plan.md:573`).

House rules applied to every proposal below:

- No new icons in chips: a thumb is a photograph of the row's own thing, in the row, never inside a `Chip`.
- No cyan or teal rings (UXD-001, B-034): the ring colour is the row's existing identity colour (agency, nation, planet) or a neutral; a teal identity colour gets the neutral (Decision 4).
- One thumb component (§6), 28 px round, 2 px ring, as C4.
- Images only from the existing pipeline: files already on disk, or a run of the existing generators over files already on disk. No downloads, no new sourcing; a row with no image keeps what it has today.
- `alt=""` when the name is beside it (decorative), `loading="lazy"`, `decoding="async"`, explicit `width`/`height`, as C4.

## 2. What C4 built, and what is wrong with it

### 2.1 The markup

`src/lib/components/RegimePanel.svelte`: `import thumbs from '$data/orbit-regime-thumbs.json'` (`:29`), `thumbOf(id)` looks up `<bundle>/<id>` (`:66-67`), the row is an `<img class="resident-thumb" alt="" width="28" height="28" loading="lazy" decoding="async" style:border-color={agencyColor(r.agency)}>` or, with no image, `<span class="thumb-slot"><span class="agency-dot"></span></span>` (`:146-170`); CSS `.resident-thumb` 28 px, `border-radius: 50%`, `border: 2px solid`, `object-fit: cover` and a 28 px `.thumb-slot` that centres the 8 px dot so labels line up (`:308-330`). `agencyColor()` (`:72-92`) is a private copy of `nationChipFor`'s palette; `rgba(255,255,255,0.5)` is the neutral. The map has 49 entries, each `/images/<dir>/<id>/01.1x1.jpg`; the data test (`src/lib/orbit-regimes.data.test.ts:166-217`) checks every file is on disk, the `01.1x1.jpg` pattern, and that all 64 residents are mapped or in `NO_THUMB`. Nothing else on the site uses a round photo; the only reusable piece is the markup above.

### 2.2 The defect: 11 of 49 thumbs ignore the blessed hero slot

`static/data/*-hero-overrides.json` records, per entity, which slot the operator's hero review picked when slot 01 was wrong. C4's map always takes `01`. Checked by `l45-c4check.mjs` against the override files:

| Map key | Thumb shown (slot 01) | Blessed slot and the reason on record |
|---|---|---|
| `orbit-regimes/lro`, `orbit-regimes-moon/lro` | `fleet-galleries/lro/01` | 03 (manual hero override 2026-06-20) |
| `orbit-regimes-moon/clementine` | `fleet-galleries/clementine/01` | 02 (subject names a different entity) |
| `orbit-regimes-moon/chandrayaan1` | `fleet-galleries/chandrayaan1/01` | 02 (off-by-one correction) |
| `orbit-regimes-mars/hope` | `fleet-galleries/hope/01` | 03 (the probe with its dish; 04 was a tight crop) |
| `orbit-regimes-mars/mars-express` | `fleet-galleries/mars-express/01` | 03 (vision-rejected, score 2 < 6) |
| `orbit-regimes-mars/mangalyaan` | `fleet-galleries/mangalyaan/01` | 03 (01 was a labelled diagram) |
| `orbit-regimes-mars/mars-odyssey` | `fleet-galleries/mars-odyssey/01` | 02 (a render on a flown asset; vision-rejected) |
| `orbit-regimes-explore/haumea` | `small-bodies/haumea/01` | 03 (canonical artist concept with both moons) |
| `orbit-regimes-explore/earth` | `planets/earth/01` | 05 (full-disc planet heroes, consistent with the set) |
| `orbit-regimes-explore/mars` | `planets/mars/01` | 03 (no-panorama hero rule) |

All 11 blessed slots have a `.1x1.jpg` on disk (every override slot of every list measured in §4 does), so the repair is a path change, not new files. Whether slot 01 is visibly wrong in each case was not looked at; the override file says it was judged wrong. Repair belongs in T1.

## 3. The images the repo already has

### 3.1 The ladders and their sizes

| Source | Path | Size (measured) | Notes |
|---|---|---|---|
| 1x1 crop | `static/images/<dir>/<id>/NN.1x1.jpg` | 512 × 512, 31 to 56 KB (Mars 38.9, ISS 55.8, Apollo 11 37.3) | the only variant the pipeline generates (AGENTS.md "Variant policy"); subject-aware square crop; 2,361 files |
| 1x1 thumb | `static/credit-thumbs/images/<dir>/<id>/NN.1x1.webp` | 192 × 192, 2.9 to 9 KB | `scripts/vision/build-credit-thumbs.mjs` (#482), built for `/credits`; 1,037 of the 2,361 crops have one; add-only; the mobile bundle prunes `/credit-thumbs` like `/images` (streamed) |
| Ladder rung | `static/images/<dir>/<id>/NN-320.webp` | about 11 to 15 KB, native aspect | not square-cropped: `object-fit: cover` centres it |
| Deep-sky | `static/images/deep-sky/<key>.thumb.jpg` (700 px, avg 57.5 KB) and `static/credit-thumbs/images/deep-sky/<key>.webp` (192 px, avg 5.3 KB, 44 of 44) | | the photo is addressed by `photoKey`, not by entity id |
| Stars | `static/images/stars/<id>/01-320.webp` | 7.2 KB avg, no `1x1` at all | 10 of the 66 stars |
| Patches | `static/images/badges/{missions,fleet,programs}/<id>.webp`, map `static/data/badges.json` | 11 to 25 KB | 63 mission, 39 fleet, 8 program patches (a mission patch exists for half of the missions) |

### 3.2 Which slot is the picture of the thing

`entityHero()` (`src/lib/entity-hero.ts`) and `loadHeroOverrides()` (`src/lib/image-hero.ts`) pick the override slot, else `01`. Rows whose blessed slot is not `01`: missions 44 of 126, fleet 79 of 294, planets 2 of 9 (Earth, Mars), small bodies 1, Moon sites 9 of 28, Mars sites 12 of 27, Venus sites 3 of 3. A thumb that takes `01` is wrong for a third of the mission and fleet rows.

### 3.3 Coverage of the thumb sources against the lists (the numbers behind Decision 1 and 2)

| List | Rows with a blessed-slot `1x1.jpg` | Of those, with a 192 px credit thumb | Bytes of the 1x1s / of the 192 px thumbs |
|---|---|---|---|
| Missions (126) | 126 | 68 | 4.9 MB / 0.40 MB for the 68 |
| Fleet (294) | 288 (+1 other slot, +5 with only the 320 rung) | 42 | 10.6 MB / 0.31 MB for the 42 |
| PATHS legend (18) | 18 | 18 | 581 KB / 93 KB |
| `/earth` objects (31) | 31 | 17 | 1.37 MB / 99 KB for the 17 |
| Moons (16) | 1 | 0 for slot 01 (2 exist for other slots) | the other 15: 14 have `01-320.webp` only; Umbriel has no slot-01 rung at all |

A list of 15 mission rows costs about 590 KB as `1x1.jpg` and about 90 KB as 192 px thumbs. Missing 192 px thumbs for the blessed hero slots of the lists in §4: about 350 files (missions 58, fleet 252, moons 14, earth objects 14, belts 1, planets 1; some overlap), about 2 to 2.6 MB at the 5.8 to 7.4 KB measured per folder. Estimate: the generator was not run (`--dry-run` was not used).

## 4. The scan: every list of named things

Row = one list item. "Covered" = the blessed hero slot has a `1x1.jpg` on disk unless stated. Value is the reader's value: how much a picture helps to recognise or choose the row, times how often the list is opened, minus patchiness.

### 4.1 Recommended places

**P1. Worlds' INDEX (`/moon`, `/mars`, `/venus`, `/earth`)**: `SurfaceIndexPanel.svelte:185-211`, row CSS `:332-370`, mounted by `SurfaceScene.svelte:5815-5826` (desktop panel and mobile drawer).

- Rows: one site, lander, rover or orbiter per row, with a coloured domain dot, `AgencyBadge` and `year · status`. `/moon` 28, `/mars` 27, `/venus` 3, `/earth` 31 objects plus launch pads (pad count not measured; `fleet/launch-site` has 42 entries with images).
- Covered (own folder, else the canonical mission by `mission_id` or id parity): `/moon` 28 of 28 (27 with a `1x1`, 1 with only a `.webp`), `/mars` 25 of 27 (no image: `mars2`, `mars6`), `/venus` 3 of 3, `/earth` objects 31 of 31 (28 slot-01, 3 override; 7 Moon-orbit objects, `lro`, `luna10`, `clementine`, `lunar-prospector`, `smart-1`, `change1`, `chandrayaan1`, have no `earth-objects` folder and reach an image only through the fleet folder of the same id, as C4's map does).
- Shows: the 28 px round photo replacing the 8 px domain dot, ring in the nation colour. C6 (approved) already changes that dot to `colorFor(site)` with a 1 px light ring and moves the orbit/land cue into the meta line, so the dot and the ring are the same colour: no second colour system. `AgencyBadge` stays.
- Layout: the row is `display:flex; align-items:center; padding: 8px 8px` about 30 px tall (arithmetic); a 28 px thumb makes it 44 px, the touch target the ↗ link already uses (`index-panel.css` `.si-page` 44 px). The list grows about 14 px per row: 28 rows go from about 840 px to about 1,230 px of scroll. The dot is 8 px wide today, so the name column loses 20 px; `AgencyBadge` and `year · status` already ellipsise. RTL: flex, no physical offsets. Phone: the drawer body is the same component.
- Perf: lazy `<img>` per row; the `/moon` list, 28 rows, is 1.1 MB as 512 px JPG and 0.14 MB for the 22 rows that have a 192 px thumb today (measured sums).
- Value: **high.** The index is the only list of the Worlds' things; names such as "Mars 3" or "LRO" are not recognisable, a photo of the lander or orbiter is.

**P2. Explore INDEX, solar-system scale**: `ScaleIndex.svelte:267-300` (`si-lead` at `:285-292`), `index-panel.css:109, 167-178`, rows built by `scale-index.ts:303` (`solarRows`), data read by `server/entity-index.ts:152`.

- Rows: Sun 1, planets 9 (Pluto among them), small bodies 23, moons 16, belts 2 = 51.
- Covered: Sun 1 of 1, planets 9 of 9 (Earth and Mars on override slots), small bodies 12 of 23, belts 2 of 2, moons 1 of 16 at slot-01 `1x1` (15 of 16 at the 320 rung of slot 01; Umbriel has neither) = 25 of 51 strictly, 39 of 51 with the moons on the 320 rung. No image at all (11): Psyche, Arrokoth, Didymos, Dimorphos, Donaldjohanson, Eurybates, Polymele, Leucus, Orus, Patroclus, Menoetius; plus Umbriel.
- Shows: the photo in the 26 px `si-lead` slot where today the 8 px body-colour dot is, ring in the planet's I3 colour (C6 keeps those dots); rows with no image keep the dot, centred in the same slot (C4's `thumb-slot`). Uranus's I3 colour `#7de8e8` is cyan: Decision 4.
- Layout: C6 (approved) makes this scale a two-line row, 44 px, name over a meta line: a 28 px thumb fits that row without growing it. The `si-lead` slot also holds the badge glyphs (⊕ ◈ ★ ●) on other scales; on this scale rows carry no badge, so no conflict here. The slot width goes from 26 to 28 px.
- Perf: the panel is `hidden` until opened (display none) and the 8 scales are mounted together; lazy images in a display-none panel are expected not to fetch (not verified in a browser). Prerendered link rows (before hydration) carry no image: no change to the static HTML. 39 thumbs as 192 px WebP about 230 KB.
- Value: **high.** The planets and moons are the most opened rows on the site; the grey 8 px dots are what the operator called boring.

**P3. Station module lists (`/iss`, `/tiangong`)**: `StationRoute.svelte:1253-1296` (desktop list, modules) and `:1297-1341` (visitors), `:1607-1650` (mobile drawer copy), an `sr-only` mirror at `:1166-1197` (stays text).

- Rows: `/iss` 18 modules and 7 visiting vehicles, `/tiangong` 4 and 2 = 31 rows, each `mod-name` + `AgencyBadge` + an agency line. Each list is drawn twice (desktop sidebar, drawer).
- Covered: 30 of 31 (no image: `poisk`); all on slot 01 (the 3 override entries of `iss-modules` and `tiangong-modules` point at slot 01).
- Shows: a 28 px round photo before the name, ring in the agency colour, `AgencyBadge` stays. The module photos are the same ones the 3D hotspots use.
- Layout: `.module-row` is two lines (name row + agency line), so the row is already about 40 px: the thumb fits. The module list sits in a fixed-width side card; the name row has `AgencyBadge` at its end: width check at 320 px in de and ru. RTL: flex.
- Perf: 31 rows total, never more than 25 in one list; 192 px thumbs exist for 30 of 30.
- Value: **medium-high.** Zarya, Unity, Harmony, Destiny and Quest are not told apart by name; a picture does it, and the 3D hover already links the row to the canvas.

**P4. Founding missions in the regime panel (and the PATHS legend)**:

- `RegimePanel.svelte:180-204` (`.firsts`, a 52 px year column plus the label) and the iconic legend `HudControls.svelte:173-211` (desktop) and `:305-345` (drawer).
- Rows: 38 `firsts` rows over the four regime bundles, 23 of them linked missions (C5); the legend is the 18 `PATHS_LEGEND` missions with a trajectory-colour swatch, the name, agency logos and the launch year.
- Covered: `firsts` 23 of 38 (all 23 linked missions have a blessed `1x1`, 4 on override slots, 12 of 23 also have a mission patch); the 15 unlinked rows have no id and no image. Legend 18 of 18 (5 on override slots; 10 of 18 have a patch).
- Shows: `firsts`: the same thumb as the residents, ring in the agency colour, before the year; 15 rows keep the dot slot (the C4 pattern: patchy, 62 % of rows with a photo, but the panel already mixes photos and dots in "who lives here"). Legend: the thumb in front of the name with the ring in the path's own colour, which makes the swatch redundant; one trajectory colour (`#4ecdc4`, Voyager 2) is teal (`paths-legend.ts:36`, marked `a3-keep`): Decision 4 and 8.
- Layout: `firsts` `grid-template-columns: 52px 1fr` becomes `28px 52px 1fr`, about 90 px left of the label in a 400 px panel (de and ru were not measured). Legend: `.paths-legend-row` already has `min-height: 36px` (`HudControls.svelte:493`) and 5 px padding, so a 28 px thumb makes the row 38 px at most (+2 px each, +36 px for 18 rows, arithmetic); `footer-dock.spec.ts` guards the Explore HUD parts at eight sizes.
- Perf: at most 8 rows in a regime panel; the legend 18 thumbs at 192 px = 93 KB, at 512 px 581 KB.
- Value: `firsts` **medium**, legend **medium-low** (the colour swatch already ties each row to its path; the thumbs add recognition, not function).

**P5. Fleet panel lists** (`FleetEntryPanel.svelte`): `xref-list` "used on" (engines to launchers, `:518-535`) and "engines" (launchers to engines, `:552-565`), and the MISSIONS tab (`:741-798`).

- Rows: engine/launcher cross-references on 22 engines and 39 launchers; the MISSIONS tab for the 48 entries with more than one linked mission (`hasMissions`, `:221`; the entries with crew show their flights instead, which already carry a patch and portraits at `:756-776`). Linked missions total 311 over 122 entries (median 0, max 15: `apollo-csm-block-ii` and `atlas-v`).
- Covered: all 311 mission rows have a blessed `1x1` (115 on override slots); every engine and launcher row has one.
- Shows: a 28 px thumb before each row's name, neutral ring (no agency in the row data), a mission's agency colour where the row knows it.
- Finding (the same code): the MISSIONS tab prints the raw mission id, `{mid}` (`:792`), where `/fleet/<id>` prints the mission's name. The thumb needs the name beside it, so T4 fixes the label first.
- Layout: the lists are text links in a 400 px panel; each row gains a 28 px thumb column and may become taller than a one-line link (row heights were not read).
- Perf: 15 rows is the maximum: 590 KB as `1x1.jpg` against 90 KB as 192 px thumbs (§3.3), lazy.
- Value: **medium.**

**P6. Related and hardware lists on entity pages**: `fleet/[id]/+page.svelte:153-213` (missions, engines, used on, alongside, kin; kin is 6 rows on all 294 pages), `SiteEntityPage.svelte:143-150` (hardware on moon/mars site pages), `programs/[id]/+page.svelte:299-307` (hardware, text only) and `:251-271` (missions, already with a patch where one exists), `MuseumPanel.svelte:92-100` and `fleet/[id]/+page.svelte:215-` (museum rows).

- Rows: `fleet/[id]`: 311 mission rows on 122 pages and 6 kin rows on each of 294 pages, plus engines, used-on, alongside; program rosters 291 rows over 42 programs: 77 link a mission (43 with a patch), 83 link a fleet entry, 109 are context rows with no page; 88 museum holdings, 86 of them reference a fleet entry.
- Covered: every linked fleet or mission row has a blessed `1x1` (fleet 294 of 294 with 6 on the 320 rung only); 131 of the 291 program rows are context rows with none.
- Shows: the same thumb before the link, in the page's `linklist`; neutral ring. Program mission rows keep their patch (`t-patch`); only the unpatched 34 of 77 linked rows gain a thumb, or none (Decision 6).
- Layout: `.linklist` rows are single-line links with a year or tagline; a 28 px thumb adds about 10 px per row; static pages, no drawer.
- Perf: prerendered HTML gains one `<img loading="lazy" width height>` per row, about 150 bytes each (estimate), 8 to 25 per fleet page; 14 locales. Images load only when scrolled to.
- Value: **medium-low.** Long pages are read; a photo helps scanning a 15-row mission list, but the traffic is search arrivals, not the app.

### 4.2 Held: coverage too low or the images are not ours

| Place | file:line | Rows | Covered | Why held |
|---|---|---|---|---|
| Neighbourhood INDEX (stars and deep sky) | `ScaleIndex.svelte:267-300`, `scale-index.ts:364` (`neighborhoodRows`) | 209: 66 stars, 143 deep-sky | stars 10 of 66, deep sky 44 of 143 (`photoKey`; thumb is 192 px WebP 44 of 44) = 54 of 209, 26 % | three of four rows would show an empty slot; the `si-lead` slot also carries the ⊕ ◈ ★ badges on this scale; Decision 3 |
| Milky Way, Local Group, Local Sheet, Virgo, Laniakea, Cosmic Web INDEXes | `scale-index.ts:405` and the member builders | 20, 33, 9, 7, 8, 7 = 84 | 4, 3, 2, 0, 0, 1 = 10 (12 %); from `panel-heroes.json` (12 entries) and deep-sky twins | 0 of 7 and 0 of 8 on two scales; Decision 3 |
| Galaxy and structure pages, Related lists | `OuterEntityPage.svelte:92-101`, built by `data/outer-entity.ts:276-289` | 29 galaxy pages and 30 structure pages; part-of, members and same-scale lists up to 32 links | same 12 % | links only, no image for 88 % |
| Launch rows | `launches/LaunchRow.svelte`, `launches/Timeline.svelte:31` | 349 current, 7,296 historic | 338 of 349 carry `image_url`, a hotlink to the Space Devs CDN, not our pipeline; 185 of 349 map to a fleet entry, 2,041 of 7,296 | the same rocket would repeat on hundreds of rows; no pipeline image for half |
| `/fleet?view=list` | `fleet/+page.svelte:656-671`, CSS `:896-` | 294 | 288 + 6 | `listView` is only set from the URL (`:258`, `:298`); no control in the template was found; the grid view next to it is all photos |
| Belt MEMBERS tab | `BeltPanel.svelte:253-275` | 9 (4 asteroid, 5 Kuiper) | 6 of 9 (no image: Pallas, Hygiea, Quaoar) | tiny list; add to T3 only if the operator wants it (cheap, same component) |

### 4.3 Reviewed, no thumbnail needed or possible

| Place | file:line | Why |
|---|---|---|
| `/missions` grid, `/fleet` grid, `/programs` cards, `/essays`, `/gallery`, `/posters`, `/patches`, `/gallery/deep-sky` | `missions/+page.svelte:594`, `fleet/+page.svelte:678`, `programs/+page.svelte:150`, `essays/+page.svelte:74` | already cards with a hero photo |
| Hubs: `/explore/hub` (8 scale cards), `/catalog` (6), `/learn`, home grid | `RouteCardGrid.svelte:132-134` (hand-drawn `ScaleGlyph` icons) | these are routes, not things; swapping drawn icons for photos is a design change and 2 of the 8 scales have no photo |
| Command palette (`Cmd-K`) | `CommandPalette.svelte:126`, items in `routes/+layout.svelte:82-110` | 11 route links; there is no site-wide search over missions or bodies |
| Science search | `ScienceSearch.svelte:169` | articles; covers are a different asset family (`science-covers-v2`) |
| MissionPanel and `/missions/[id]` | `MissionPanel.svelte` (no list of missions), `missions/[id]/+page.svelte:137` | no "related" or "sister" missions list exists in either; nothing to put a thumb in (not a thumbnail question) |
| Exoplanet list, culture doors | `StarPanel.svelte:312`, `CultureDoorCard.svelte` | no exoplanet photographs exist and none are invented; culture doors are story cards |
| Planet, moon, Sun, belt "visits" | `PlanetPanel.svelte:347`, `SatellitePanel.svelte:276`, `SunPanel.svelte:202` | prose sentences with inline links, not rows |
| Library, Lab goals, Timeline strip | `library/+page.svelte:241`, `lab/+page.svelte:119`, `TimelineNavigator.svelte:288` | link directory, formulas, a dot timeline |

## 5. Ranking

| # | Place | Rows | Covered | Value | Slice |
|---|---|---|---|---|---|
| 1 | Worlds' INDEX (`/moon`, `/mars`, `/venus`, `/earth`) | 28 / 27 / 3 / 31+pads | 28, 25, 3, 31 | high | T2 |
| 2 | Solar-system INDEX | 51 | 25 strict, 39 with moons on the 320 rung | high | T2 |
| 3 | Station module lists (`/iss`, `/tiangong`) | 31 | 30 | medium-high | T3 |
| 4 | Founding missions (`firsts`) | 38 (23 linked) | 23 | medium | T1 |
| 5 | Fleet panel lists (MISSIONS tab, engines, used on) | 311 + xrefs | all | medium | T4 |
| 6 | PATHS legend | 18 | 18 | medium-low | T3 |
| 7 | `/fleet/<id>` Related, site-page hardware, program hardware, museum rows | 311 + 1,764 + 83 + 86 | all linked | medium-low | T4 |
| 8 | Belt MEMBERS | 9 | 6 | low | T3, optional |
| - | Neighbourhood INDEX | 209 | 54 (26 %) | medium per row, low overall | held |
| - | Outer-scale INDEXes and Related | 84 | 10 (12 %) | low | held |
| - | Launch rows, `/fleet?view=list` | 7,645 / 294 | external / no entry point | low | not proposed |

## 6. One thumb component and one resolver

C4's thumb is markup in one file plus a hand-keyed map. Proposal (T1):

- `src/lib/components/EntityThumb.svelte`: props `src: string | null`, `ring?: string` (a CSS colour; defaults to the neutral `rgba(255,255,255,0.5)`), `size?: number` (default 28), `fallback?: 'dot' | 'none'` (default `'dot'`, the C4 centred 8 px dot in the same slot, coloured by `ring`). It renders `<img alt="" width height loading="lazy" decoding="async">`, `border-radius: 50%`, `border: 2px solid`, `object-fit: cover`, and on `onerror` swaps to the fallback so a missing file never leaves a broken-image icon. Decorative by contract: the row's name is beside it. No text, no message key. Not a `Chip`.
- `src/lib/entity-thumb.ts`: `thumbOf(surface, id)` returns the thumb URL or `null`: the blessed hero slot from the override files the site already loads (`loadHeroOverrides`), the 192 px credit thumb when it exists, else the `1x1.jpg`, else `null`. One manifest, `static/data/entity-thumbs.json`, per surface (`missions`, `fleet`, `planets`, `small-bodies`, `satellites`, `belts`, `earth-objects`, `moon-sites`, `mars-sites`, `venus-sites`, `iss-modules`, `tiangong-modules`, `deep-sky`) built by a script from disk plus the override files; about 600 entries at about 90 bytes (estimate, 50 KB), split per surface so a page fetches one. `static/data/image-vision.json` (1 MB) already holds `variants['1x1']` but is too large for a list.
- `agencyColor()` moves out of `RegimePanel.svelte` into `src/lib/surface-map/nation-palette.ts` (it is a copy of `nationChipFor`'s palette) so the regime panel, the station lists and the fleet lists share it.
- `validate-data` gains a check that every manifest path is on disk, every blessed slot has an entry or is listed as "no image", and the manifest is current (the C4 test's `NO_THUMB` idea, made generic).
- `RegimePanel` uses `EntityThumb` for residents and `firsts`; `orbit-regime-thumbs.json` stays only for the `<bundle>/<id>` to entity-id mapping (residents are ids that mean different things per bundle), its 49 paths are derived from the manifest, which repairs the 11 mismatches of §2.2.

## 7. Proposed implementation slices

1. **T1, foundation and the regime panel.** `EntityThumb.svelte`, `entity-thumb.ts`, the manifest script and its `validate-data` check, `agencyColor` extracted, the generator run for the missing 192 px thumbs of the blessed hero slots (Decision 1), the 11 C4 mismatches repaired, and `firsts` rows (P4, first half) as the second consumer. Screenshots §8.1 and §8.5.
2. **T2, the two INDEXes (build after C6 lands, Decision 5).** The Worlds' INDEX (P1) and the solar-system INDEX (P2) on top of C6's two-line row and nation-colour dot; moons per Decision 2.
3. **T3, stations, legend, belt members.** `/iss` and `/tiangong` desktop lists and drawers (P3), the PATHS legend (P4 second half, Decision 8), optionally the belt MEMBERS tab.
4. **T4, panel and page lists.** The fleet panel's MISSIONS tab (label fix first) and xref lists (P5), `fleet/[id]`, site-page hardware, program hardware and museum rows (P6, Decision 6).

T1 before the rest; T3 and T4 are independent of each other and of T2 once T1 is in.

## 8. Screenshot list (to take before the build and again after; list only, no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`) and phone 390×844 (`mobile-chromium`), en-US unless stated.

1. **Regime panel (T1):** `/explore?regime=GIANTS`, `?regime=BELT`, `/earth` LEO, GEO, MOON, `/moon`, `/mars` HMO; the residents and the Firsts list (before/after for the 11 repaired thumbs: LRO, Clementine, Chandrayaan-1, Hope, Mars Express, Mangalyaan, Mars Odyssey, Haumea, Earth, Mars).
2. **Worlds' INDEX (T2):** `/moon`, `/mars`, `/earth`, `/venus` with the INDEX open at All, scrolled to the end, one search term typed; phone: the drawer. `?lang=ar` (RTL), `?lang=de` and `?lang=ru` (long names) on `/moon`.
3. **Solar INDEX (T2):** `/explore` INDEX open at All, at the Planets chip and the Moons chip (C6 chips), scrolled to the small bodies (the 11 rows with no image); phone: the INDEX sheet. `?lang=ar`, `?lang=de`.
4. **Neighbourhood and Local Group INDEX (held, for Decision 3):** `/explore?context=neighborhood` INDEX at All and at the Deep sky chip; `?context=local-group` INDEX.
5. **Station lists (T3):** `/iss` and `/tiangong`, desktop sidebar list with a module hovered; phone drawer; the visitors list.
6. **PATHS legend (T3):** `/explore` with the legend open, desktop and phone drawer; with Voyager 2 (teal) hovered; footer-dock position at 1280×720.
7. **Fleet (T4):** the panel for `apollo-csm-block-ii` (crew flights) and `atlas-v` (15 missions, no flights) on `/fleet?id=`, MISSIONS tab; `/fleet/atlas-v`, `/fleet/saturn-v` pages (missions, kin); `/missions/apollo11`-adjacent site page `/moon/apollo11` hardware; `/programs/apollo` roster and hardware; `/earth` museum panel.
8. **Rejected or held (for the record):** `/fleet?view=list`; `/explore/galaxies/<local-group member>` Related list (up to 32 links).

## 9. i18n impact

None: a thumb is decorative (`alt=""`) and adds no text and no message key, so no glossary, no 14-locale pass. The one visible string change is the MISSIONS tab label (P5 finding): it prints the mission id today and gets the mission's name the way `/fleet/<id>` does; the names are already in the 14 locale overlays (`getMission(..., locale)`), so no translation call. RTL (`ar`; Hebrew is planned): flex rows mirror; no physical `left`/`right` is introduced.

## 10. Data changes

- New `static/data/entity-thumbs.json` (or one file per surface, about 50 KB in all, estimate) and `scripts/build-entity-thumbs.mjs`; a `package.json` script and a `validate-data` check.
- New files in `static/credit-thumbs/images/**` for the blessed hero slots with none (about 350, about 2 to 2.6 MB, estimate), from the existing generator, add-only. The generator today covers only provenance-listed non-ladder rasters (`build-credit-thumbs.mjs:46`), so it needs a flag or an input list for "these paths"; that is a small change to an existing script, not a new tool (Decision 1).
- `static/data/orbit-regime-thumbs.json` entries re-pointed or regenerated (the 11).
- No new source images, no change to `image-provenance.json` (a thumb is a derived file of an already-credited image; the `/credits` page already lists the 1x1 crops).

## 11. Tests to add or change

1. `entity-thumb.test.ts`: `thumbOf` returns the override slot when one exists, the credit thumb before the `1x1.jpg`, and `null` for an entity with no folder; run over the real manifest for every surface.
2. `orbit-regimes.data.test.ts`: the "every mapped file is the `01.1x1.jpg`" check changes to "every mapped file is the blessed slot's thumb"; a regression row for each of the 11 repaired residents.
3. `validate-data`: manifest current, every path on disk (mirrors the `surface-hotspots.json` variant gate, AGENTS.md "re-fetching a hotspot base image").
4. `EntityThumb.test.ts`: `alt=""`, 28 × 28 attributes, `loading="lazy"`, the fallback dot after `error`, ring colour from the prop.
5. e2e (per slice): the INDEX rows keep `button.si-row` / `button.sidx-row` as the roving items and the ↗ links keep working; `select-focus.spec.ts` (`button.resident-link`, `.resident-label`) and `footer-dock.spec.ts` (legend and INDEX parts) stay green; a phone-width row-height assertion (44 px) on the INDEX.
6. Coverage: `entity-thumb.ts` adds functions to `src/lib` under the frozen ratchet (R8): tests above are added in the same slice, `preflight:coverage` once before the push.

## 12. Docs to update by name

`docs/uxs/decisions/UXD-024` (the thumb is shared; the 11 repaired; the map is derived), a new decision record for "lists carry a round photo where an image exists" (UXD-025 or the next number), `docs/concept/05_Design_System.md` (the thumb: size, ring rule, fallback; §5.13 INDEX row once C6 has changed it), `docs/uxs/IA.md`, `docs/adr/TA.md` (the manifest, the resolver, the generator flag), the READMEs of `src/lib/components/`, `src/lib/surface-scene/`, `src/lib/explore/` and `scripts/`, `docs/accessibility.md` (decorative thumbs), and the plan inventory (L45 struck, held lists added to "Deferred" with their coverage).

## 13. Decisions for the operator (recommendation first)

1. **Which file a list thumb loads.** **(a) The 192 px WebP (3 to 9 KB), generating the missing ones for the blessed hero slots with the existing `build-credit-thumbs.mjs`** (recommended: 6 times lighter than the 512 px crop; a 15-row list is 90 KB against 590 KB; about 350 new files, 2 to 2.6 MB, no download; C4's panel moves to it too); (b) keep the 512 px `1x1.jpg` C4 uses (no new files, heavier pages); (c) the 320 px ladder rung (exists for all but a few, 11 to 15 KB, not square-cropped, so a centred crop can cut the subject).
2. **Moons and other rows whose blessed slot has no `1x1`** (15 of 16 moons; the pipeline made a crop for 1 of them). **(a) Make the missing crops with the existing variant regenerator** (`scripts/vision/regenerate-tier3-variants.mjs`, offline, no API cost per AGENTS.md; this brief did not run it) (recommended: the moon thumb is the same picture as the panel hero); (b) use the slot-01 320 px rung for those rows; (c) keep the dot for moons.
3. **The neighbourhood INDEX (54 of 209 rows with a photo) and the six outer-scale INDEXes (10 of 84).** **(a) Hold both until a content pass raises coverage; record the lists and their coverage in "Deferred"** (recommended: a quarter of the rows with a photo reads as a mistake, and 0 of 15 on Virgo and Laniakea); (b) show thumbs where a photo exists and an empty 28 px slot elsewhere; (c) show them only while the Deep sky chip is active (all 143 rows, 44 with a photo).
4. **Ring colour.** **(a) The row's own identity colour (agency, nation, planet, trajectory) and the neutral `rgba(255,255,255,0.5)` where the row has none; a teal or cyan identity colour (Uranus `#7de8e8`, Voyager 2 `#4ecdc4`, the ISS object colour) gets the neutral ring, its dot or swatch keeps the data colour elsewhere** (recommended: follows UXD-001 and C4 decision 1); (b) neutral ring everywhere except regimes (one rule, but the Worlds INDEX loses the nation colour C6 just approved); (c) identity colour always, teal included (breaks the no-cyan rule).
5. **Order against C6, which is being built now in the same four files.** **(a) T2 waits until C6 is committed and builds on the two-line row and the nation-colour dot** (recommended: no concurrent edits of `ScaleIndex.svelte`, `index-panel.css`, `scale-index.ts`, `SurfaceIndexPanel.svelte`); (b) hand the thumb spec to the C6 agents so C6b and C6c draw the thumb directly (one touch of each file; they build against the spec before T1's component exists); (c) T2 in a separate worktree now, merged after C6 (conflicts in the same lines).
6. **Related and hardware lists on the prerendered pages (P6) and the unpatched program rows.** **(a) Thumbs on `/fleet/<id>`, site pages and `/programs/<id>` hardware and unpatched rows; patched program rows keep the patch** (recommended: same component everywhere; +8 to 25 lazy `<img>` per page); (b) panels only (T4 without the pages), pages later; (c) patches instead of photos on program mission rows, photos nowhere on pages.
7. **`/fleet?view=list` (294 rows, no link to it from the page).** **(a) Leave it without thumbs and note it** (recommended: a hidden view; the grid and the lineup view are the photo views); (b) add thumbs to it as well (the cost is one component call, the row layout is a 5-column grid and a 3-column phone grid); (c) remove or surface the view (a separate question).
8. **PATHS legend rows (18).** **(a) Add the thumb and use the path colour as its ring, dropping the separate swatch dot; Voyager 2's teal path gets the neutral ring and keeps its teal line in the scene** (recommended: one marker per row, the legend grows 36 px in all); (b) keep the swatch and add the thumb beside it (more clutter with the agency logos in the same row); (c) leave the legend as is (medium-low value).

## 14. Acceptance checks

- Every list of §4.1 shows a 28 px round photo for each covered row and the C4 centred dot for each uncovered row; no broken-image icon at any size or locale.
- The 11 repaired residents show their blessed hero slot (unit test on the manifest, screenshots §8.1).
- All thumbs: `alt=""`, `width`/`height` 28, `loading="lazy"`; no `<img>` inside a `Chip`; no cyan or teal ring (unit check over the ring colours the lists compute).
- At 320, 390 and 1440 px, in en, de, ru and ar, no row clips its name worse than today and no horizontal page scroll; INDEX rows are 44 px tall at phone width.
- `validate-data`: manifest current and on disk; `npm run preflight` and `preflight:coverage` once before the push, and the e2e of §11.5 on both projects before a release.
- Docs of §12 updated; the plan inventory says what was built and what was not run in a browser.

## 15. NOT VERIFIED

- NV1 No browser, build, test or generator run. Every row height, width and growth figure (30 to 44 px, +36 px legend, 28 rows to 1,230 px, 90 px firsts label offset; the 30 px INDEX row is the C6 brief's figure) is CSS arithmetic from the files read; no pixel was measured, and the de, ru and ar fits were not estimated.
- NV2 Coverage is file existence in `static/images`, `static/credit-thumbs` and `static/data`; no image was opened. That each blessed `1x1` is the right subject, a real photograph and not a placeholder or a labelled diagram was not checked (`credit-placeholders-find.mjs` exists); the 11 mismatches of §2.2 are from the override file's recorded reasons, not from looking at slot 01.
- NV3 The Worlds' INDEX coverage assumes a site shows the image of its own folder, else its canonical mission (`mission_id` or id parity), else for `/earth` objects the fleet or mission folder of the same id (C4's mapping did the same). The site panels' hero resolution was not read; the 45-of-54 alias count in `SurfaceScene.svelte` (comment at `:1410`) was taken as written. The `/earth` launch pads were not counted.
- NV4 The solar INDEX row set was rebuilt from `planets.json`, `small-bodies.json`, `satellites.json` and `belts.json` (51 rows), not by running `getScaleIndexRows`; the neighbourhood and outer-scale row sets from `named-stars.json`, `exoplanet-systems.json`, `deep-sky-objects.json` and the five member files, not from the built index. The Milky Way count (20) includes `cygnus-x-1` once.
- NV5 `hidden` INDEX panels not fetching lazy images, and lazy loading inside the scrolling `si-list`, is browser behaviour that was assumed, not tested; so is the "static HTML unchanged" claim (pre-hydration rows carry no image per `ScaleIndex.svelte` source).
- NV6 The 192 px generator's behaviour for an explicit path list, the size of the missing set (about 350, from the per-list counts, with overlaps not removed) and the 2 to 2.6 MB are estimates; `regenerate-tier3-variants.mjs` was read about in AGENTS.md, not run, and may not accept a gallery image outside the hotspot tiers.
- NV7 `/fleet?view=list` has no control: found by reading `fleet/+page.svelte` for `listView`; a button added by a snippet or component outside that file was not searched for at the repo root with a second tool.
- NV8 The MISSIONS tab prints `{mid}` (`FleetEntryPanel.svelte:792`): read from source; whether another layer maps the id to a name at render time was not run. The tab is visible only when `linked_missions.length > 1` (48 entries).
- NV9 Program roster rows were classified by `linked_id` membership of the mission and fleet indexes (77 missions, 83 fleet, 109 unlinked); the page's own split into missions, hardware and assembly lists (`programs/[id]/+page.svelte:220-307`) was not reproduced, so the per-list row counts are not split.
- NV10 The launch counts (349, 338, 185, 7,296, 2,041) come from `launches.json` and `launches-historic/*.json` fields `image_url` and `orrery_launcher_ref`; the 349 are entries of the current manifest, not a count of rows on screen.
- NV11 `static/data/universe/panel-heroes.json` and `deep-sky-objects.json` `photoKey` were the only photo sources for the outer scales; images that the panels get another way (a `photo` field in an overlay) were checked for stars only (`i18n-src/en-US/universe/named-stars/<id>.json`), not for galaxies or structures.
- NV12 The C6 brief and its state were read (approved 2026-11-13); the C6 changes already in the working tree (`ScaleIndex.svelte`, `index-panel.css`, `format.ts`, `SurfaceIndexPanel.svelte` show as modified) were not read, so T2's description of the C6 row is the brief's, not the code's.
- NV13 `/credits` thumbs: the claim that the mobile bundle prunes `/credit-thumbs` the same as `/images` is from the comment at `credits/+page.svelte:83` and `prune-streamed-assets` text in TA.md, not from a mobile build.
