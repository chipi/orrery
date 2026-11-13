# UXD-017 — One INDEX on every /explore scale

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — "add same index on all other scales and that is the way to close
  the gap in a systematic way"; then the plan and all 13 recommendations of the brief's §5 approved
  (`docs/wip/2026-11-12-scale-index-brief.md`, "Decisions (operator, 2026-11-12)")
- **Answers**: the brief's §5 questions 1 to 13; carries C6 of the UX feedback plan (kind filters, meta
  line, planet colour dots) for the solar system
- **Amended by**: slice C6 and C6-F, folded filters (2026-11-13), below
- **Superseded in part by**: [UXD-019](UXD-019-select-equals-focus.md) — a row now also takes the camera, and
  a member of an outer scale is a link (`?context=&pick=`); the rest of this decision stands
- **Changes**: `src/lib/components/ScaleIndex.svelte` (new; replaces `StarIndex.svelte` and
  `ExploreBodyIndex.svelte`), `src/lib/styles/index-panel.css` (new), `src/lib/explore/scale-index.ts`
  (new, with its test), `src/lib/server/entity-index.ts` (`getScaleIndexRows`),
  `src/routes/explore/+page.svelte` and `+page.server.ts`, `src/lib/three/explore-scene-host.ts` (five
  select functions returned), `scripts/build-route-lastmod.mjs`, messages (21 keys added, 4 removed);
  [ADR-096](../../adr/ADR-096.md) items 11, 14, 15, 16; `docs/adr/TA.md`; [IA](../IA.md); AGENTS.md;
  `src/routes/explore/README.md`, `src/lib/components/README.md`, `src/lib/universe/README.md`,
  `src/lib/explore/README.md`

## Context

Two of the eight /explore scales had an INDEX, each its own component with its own class prefix, width,
top offset and handle markup (`ExploreBodyIndex` at the solar system, `StarIndex` at the neighbourhood).
The other six (Milky Way, Local Group, Local Sheet, Virgo, Laniakea, Cosmic web) were canvas-only: 83
selectable objects with no keyboard, screen-reader or crawler path, and the four black holes sat in the
neighbourhood's list although none of them is within 2,000 light-years.

## Decision

One component, `ScaleIndex`, on all eight scales: one handle (`scale-index-toggle`, label INDEX), one
`indexOpen`, one stylesheet, search, chips from `Chip` / `ChipGroup` (UXD-014), a count, a roving list,
and a `↗` link where the object has an entity page.

- **Rows** are every selectable object of the scene, whether or not it has a page (344 rows, 118 with a
  page). A row without a page is a button that does what a canvas click does (first written "no camera
  move and no new URL parameter"; both were reversed by [UXD-019](UXD-019-select-equals-focus.md): a
  click and a row both take the camera, and an outer-scale member has `?context=&pick=`). When a page ships (deep sky, Local Group headliners, Milky Way pins) it is one `href` on
  the row.
- **Black holes** sit in the INDEX of the scale they belong to by distance: Sagittarius A* and Cygnus X-1
  in the Milky Way, M87* in Virgo, Gargantua (fiction, dashed and muted, `bh_fiction_badge`) in a
  "Fiction" section at the foot of the Cosmic web. The neighbourhood has none. Selecting one closes the
  INDEX and opens the lensing view.
- **Neighbourhood**: stars and deep-sky objects in one list, a Deep sky chip filters.
- **Chips**: kind chips from the labels the panels already print, plus "Notable objects" (own key since `4a21e77beca`; "Highlights" read as "achievements" in ja, ko, ar) where the data has
  headliners, at most five besides All; no distance or size filter.
- **Solar system** gains the moons, the two belts, a meta line and each body's colour dot (the meta line and the chips: see the amendment of 2026-11-13).
- **Open state**: persists across a scale jump on a fine pointer, closes on a coarse one (the 320 px rail
  covers most of a phone). It is hidden during a takeover (black hole, deep-sky immersion, an exoplanet's
  BodyScene, which gets its own list in a later slice) and, outside the solar system, in the 2D view.
- **Prerender**: `/explore` is one HTML file for every `?context=`, so all eight lists are in it, hidden
  unless on screen. The rows come from the server load; only rows with a page are written into the static
  HTML, as links, so it holds no dead button; the button rows join on hydration.
- **Worlds** (`/moon /mars /venus /earth`) keep `SurfaceIndexPanel` in this slice; they move onto
  `ScaleIndex` in the next one.
- `StarIndex` and `ExploreBodyIndex` are deleted, with the stale "Index drawer tab" comments; UXD-015 and
  the A5 brief no longer say the neighbourhood's stars have no links.

## Amendment 2026-11-13 — slice C6: a meta line on every row, a chip for every row, nation colours on the Worlds

The operator approved all five recommendations of `docs/wip/2026-11-13-slice-C6-brief.md` §12 (I1, I2,
I3, WM3). I3 (a colour per planet) was already built here; what changes:

- **Meta line** on every solar-system row, built per request locale in `scale-index.ts` from data the
  repo already has (`planetIndexMeta`, `smallBodyIndexMeta`, `moonIndexMeta`, `beltIndexMeta` in
  `src/lib/explore/format.ts`; numbers through `Intl`, the unit through `unit_au_value` and
  `mp_flight_unit_km`, the AU range through the orbit ruler's `fmtRegimeAU`):
  planet "1.52 AU · 6,779 km · 2 major moons" (the diameter from `PLANET_STATS`; "major" because the
  count is the moons the scene draws, not the real number; no moon part for Mercury and Venus);
  dwarf, asteroid and Kuiper object "2.77 AU · 939 km" (three significant figures, diameter = 2 ×
  `radius_km`; a diameter of 100,000 km or more is written in 万/만/लाख in zh, ja, ko and hi, as the ruler does); comet "17.8 AU" (no size); moon "Jupiter · 3,643 km"; belt "2.2–3.2 AU"; the Sun "Star"
  and ʻOumuamua "interstellar object" are the kind label. The prerendered link rows carry no meta.
- **A two-line row on the solar-system INDEX only**: name over meta, a 26 px lead slot spanning both
  lines, still one `button.si-row`. The other seven scales keep one line (their meta is a 6 to 20
  character kind label). The meta's `title` carries the full text for the ellipsis. The search box reads a meta's words (a moon's planet, "Star"), not its measurements, so "km" or "2" does not match every row.
- **Chips**: Planets, Dwarfs, Asteroids (asteroids + Arrokoth), Moons, Comets (+ ʻOumuamua), five besides
  All. Every solar-system row is under a chip except the Sun and the two belts (All only); a unit test
  (`scale-index.test.ts`) names those three, so a new body cannot be silently unreachable. This closes a
  gap of the first build: the Dwarfs chip matched 4 of 51 rows, while the layer chip DWARFS also controls
  the 15 asteroids and Arrokoth. New keys: `explore_index_filter_asteroids`, `explore_index_moon_count`
  (+ `_one _two _few _many`); the Moons chip reuses `explore_index_section_moons`, the Sun's meta
  `explore_ds_cat_star`.
- **The Worlds' index** (`SurfaceIndexPanel`, still its own component): a site's dot is its nation colour
  `colorFor(site)`, the legend swatch's colour, with a 1 px light ring (`rgba(255,255,255,0.35)`) so the
  dark navy and dark red read; an Earth object keeps its own object colour (`earth-objects.json` has
  agencies, not a nation). The orbit/land cue the old blue/red dot carried moves to the meta line as
  words, `1976 · ACTIVE · ON LAND` / `· IN ORBIT` (uppercase), the words of the Orbit and Land chips. With that third part the meta no longer fits beside the name and the agency badge, so the Worlds row is two lines as well: dot | name and badge over the meta, which wraps only after a " · " (two lines at most, `title` with the whole text; German "ABGESTÜRZT · AUF DER OBERFLÄCHE" needs the second line).

## Amendment 2026-11-13 — folded filters (C6-F)

The operator, 2026-11-13, from a `/mars` landscape screenshot where the filter chips took 8 rows: "Folded
filters" for the Worlds' INDEX and the same pattern on the solar-system INDEX.

- **Worlds' INDEX** (`SurfaceIndexPanel`): the search line, then the domain chips (All, In orbit, On land) on
  their own row, then the count with a **FILTERS** button beside it. The agency, era and status groups sit
  behind that button, closed at the start, each with a small label (AGENCY, ERA, STATUS: `fleet_filter_agency`,
  `card_stat_era`, `fleet_filter_status`). Opened, they show in place under the count line; folding does not
  change the filter state; the button keeps the number of those three groups that are not on All while the fold
  is closed.
- **Solar-system INDEX** (and any scale whose chips would wrap past one line, in the reader's language: the
  widths are measured, `chip-fit.ts`): All and the chips that fit one line stay; the rest sit behind the same
  button. Planets and Moons are taken first, then the scale's own order, so at 296 px in English the line is All,
  Planets, Dwarfs, Moons and the fold holds Asteroids and Comets; in German All, Planeten, Monde. When the active
  chip is inside the fold the button shows `1`. The neighbourhood and the outer scales fold the same way: at 296
  px only All and Notable objects (or Planets and Culture) fit, so their other chips are behind the button.
- **One look** (one INDEX on every scale): `IndexFiltersToggle.svelte` is the button (the word is `filters_eyebrow`,
  FILTERS in 14 locales, no new key; a chevron ▾ closed and ▴ open; `aria-expanded`, `aria-controls`), `.idx-*` in
  `index-panel.css` the look, `chip-fit.ts` the pure fit. A folded chip is a normal radio chip: it filters, and
  Tab reaches the button.
- **Where the button sits.** Beside the count, not at the end of the chip row as drafted: at the 296 px content
  width All, In orbit and On land are 222 px wide, which leaves 56 px, and the button is about 94 px. The same
  place on both INDEXes.
- **Short windows.** A landscape phone scrolls the Worlds' panel as a whole when the fold is open, as the solar
  INDEX already did.
- **The INDEX tab on a narrow window.** On `/explore` in a window 600 px wide or less with a mouse the detail panel
  is as wide as the window and the tab (z 44) was drawn over its text; the tab now sits under the panel (z 25), as
  the Worlds' tab already did (`SurfaceScene.svelte`). Older than C6: it dates from the first build of this INDEX
  (`8684bced2e0`); on touch the panel is a bottom sheet and already covered the tab.

## Note 2026-11-13 — L45-T2: the lead slot holds a round photo

[UXD-025](UXD-025-lists-carry-a-round-photo.md) (slice T2) puts the 28 px `EntityThumb` in the lead slot of the
solar-system rows (the slot grows from 26 to 28 px on that scale; 40 of 51 rows have a photo, the 11 with no
image keep the dot, centred in the same slot) and of the Worlds' rows (`/moon /mars /venus /earth`, 28, 27, 3
and 73 of the same number of rows; the nation-colour dot becomes the photo's ring). The neighbourhood and the six
outer scales stay without photos (UXD-025 decision 3, held). The rows, the roving items and the ↗ links are
unchanged. No new string.

## Note 2026-11-13 — C6-F: the rest of the HUD under a full-width panel

The tab was not the only piece. In a window 600 px wide or less with a mouse, the `/explore` HUD cluster (the
view actions, the layer chips; z 45 since the iconic-mission legend was lifted over the time dock on 2026-06-28)
and the time dock (z 40) were drawn over the full-width Mars panel's eyebrow, title and first stat. Both now sit
under the panel there (cluster z 25, dock z 24, so the PATHS legend still covers the scrubber), the same rule as
the tab; wider windows and touch are unchanged (the portrait sheet is z 80). It was not new in C7 or C8: those
slices moved the chips and the legend but not the z values. `hud-under-panel.spec.ts` samples a grid over the open
panel on nine routes (`/explore`, the four Worlds, `/iss`, `/tiangong`, `/fleet`, `/missions`) and fails on
anything else on top. The rule is project-wide, "nothing draws over an open detail panel", and the two leftovers
follow it:
- **The site footer** (z 35) is z 25 in that window while a panel is open, with its More popover; it does not move
  and it has no panel to sit under elsewhere (touch hides it).
- **A landscape phone's drawer tab row** (`MobileDrawerGroup`, z 38) crossed the side drawer's actions (GO TO MARS,
  PLAN MISSION; LAYERS, NATIONS, SCAN on the Worlds). On the Worlds the row and the card a tab opens now end at the
  drawer's edge, so the tabs stay usable for the scene beside it, and the top-left chip row ends there too (one
  line, scrolls sideways: a second line ran into the site card). On `/explore` the row shares the bottom line with
  the time dock, the scale strip and the level card in the 439 px left beside the drawer (tried: stacked above the
  dock, which then covers the strip and runs into the level card), so it sits under the drawer while one is open
  and returns when the panel closes.
- **The INDEX tab and BACK TO EXPLORE.** On a landscape Worlds page with a site open, the imagery card pushed the
  tab up to the chip row's height (tab 70 to 136 px, row 60 to 104) and it lay over the first chip. The row now
  starts after the 44 px tab on a landscape phone (`left: 52px`), so the two rects are disjoint; with the drawer
  open the chips keep their width and the row scrolls. A portrait phone was already clear (the tab is at mid
  height, the open panel is a sheet over both). Fine-pointer windows were already clear (row at 36 px).

## Consequences

The next page type is a one-line addition per row. Each scale's list is the keyboard way into its scene.
The same object has one row per scale it appears in (`lmc`, `smc`, `m31`/`andromeda`, seven globulars);
its future page needs one canonical id. Not covered here: the BodyScene list. Member deep links and the camera move on select
were deferred here and decided in [UXD-019](UXD-019-select-equals-focus.md).
