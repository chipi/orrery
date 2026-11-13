# UXD-017 — One INDEX on every /explore scale

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — "add same index on all other scales and that is the way to close
  the gap in a systematic way"; then the plan and all 13 recommendations of the brief's §5 approved
  (`docs/wip/2026-11-12-scale-index-brief.md`, "Decisions (operator, 2026-11-12)")
- **Answers**: the brief's §5 questions 1 to 13; carries C6 of the UX feedback plan (kind filters, meta
  line, planet colour dots) for the solar system
- **Amended by**: slice C6 (2026-11-13), below
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

## Consequences

The next page type is a one-line addition per row. Each scale's list is the keyboard way into its scene.
The same object has one row per scale it appears in (`lmc`, `smc`, `m31`/`andromeda`, seven globulars);
its future page needs one canonical id. Not covered here: the BodyScene list. Member deep links and the camera move on select
were deferred here and decided in [UXD-019](UXD-019-select-equals-focus.md).
