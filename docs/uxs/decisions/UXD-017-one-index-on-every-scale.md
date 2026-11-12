# UXD-017 — One INDEX on every /explore scale

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — "add same index on all other scales and that is the way to close
  the gap in a systematic way"; then the plan and all 13 recommendations of the brief's §5 approved
  (`docs/wip/2026-11-12-scale-index-brief.md`, "Decisions (operator, 2026-11-12)")
- **Answers**: the brief's §5 questions 1 to 13; carries C6 of the UX feedback plan (kind filters, meta
  line, planet colour dots) for the solar system
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
- **Solar system** gains the moons, the two belts, a meta line (a moon's planet) and each body's colour dot.
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

## Consequences

The next page type is a one-line addition per row. Each scale's list is the keyboard way into its scene.
The same object has one row per scale it appears in (`lmc`, `smc`, `m31`/`andromeda`, seven globulars);
its future page needs one canonical id. Not covered here: the BodyScene list. Member deep links and the camera move on select
were deferred here and decided in [UXD-019](UXD-019-select-equals-focus.md).
