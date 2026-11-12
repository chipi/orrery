# UXD-019 — Select = focus

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — every open question of `docs/wip/2026-11-12-slice-C1-brief.md`
  §11 approved as recommended
- **Answers**: E3, E5, SS4, I4, EP1, IM5, IM6 of the UX feedback plan; slice C1; deferred item L35
- **Supersedes**: the "no camera move" line of [UXD-017](UXD-017-one-index-on-every-scale.md) (Decision,
  Rows) and its "a camera move on select" deferral
- **Changes**: `src/lib/explore/body-ref.ts` (new, with its test), `src/lib/three/panel-framing.ts` (new,
  with its test), `src/lib/three/explore-scene-host.ts` (`focusBody`, `focusMember`, four outer Resets,
  the ring for every kind, the chip table, panel-aware framing, milestone picking),
  `src/lib/three/explore-solar-scene.ts`, `src/lib/three/iconic-trajectory.ts` (`pickTargets`,
  `PICK_KINDS`), `src/routes/explore/+page.svelte` (`selectBody`, `openBody`, `showKind`,
  `clearSelectionIfHidden`), `src/lib/explore/explore-url-sync.svelte.ts` (`?context=&pick=`),
  `src/lib/missions-linkify.ts` (`sortNewestFirst`, link kinds), the five body panels, `BeltPanel`,
  `MissionPanel` (the message section, the action row's reserved height, `onBack`), `Panel.svelte` (`covered`,
  `onBack`), `src/lib/plan/destinations.ts` (new), `SmallBodyPanel` (Plan mission), `MissionMessageSection.svelte`
  (new), `MessagePanel.svelte` (deleted), `SurfaceScene.svelte` (ORBITERS, TRAVERSES), `HudControls.svelte`,
  `src/lib/universe/milky-way-visual.ts` (Cygnus X-1's pin), messages (`explore_layer_tip_dwarfs` reworded
  in 14 locales, 2 keys removed); [UXS-014](../UXS-014.md), [IA](../IA.md), `docs/adr/TA.md`,
  `docs/accessibility.md`, AGENTS.md, `src/routes/explore/README.md`, `src/lib/explore/README.md`

## Context

"Selected" is three things: the panel, the ring, the camera. Planets had all three, moons two, small
bodies and belts one, the Sun one and a home view. Six ladders chose a body (canvas, INDEX row, "Who lives
here", `?id=`, the Belt members, mission links) and disagreed on Pluto and on what was a link. A chip
hid a body without clearing its selection, 16 bodies rode the wrong chip in 3D and none in 2D, and four
residents of the ruler were buttons that did nothing. Evidence: the brief's §2 and §3.

## Decision

1. **Selecting a body focuses it, from every entry point.** One funnel: a `BodyRef` (sun, planet, moon,
   small body, belt) reaches one `selectBody`, which opens the panel (the body panels are a mutex), holds
   the one selection, draws the ring, and flies the camera (600 ms, ease-out). The canvas, the INDEX row,
   a resident, a belt member, `?id=` and a panel link all end there.
2. **Camera frames.** A planet or a moon lands at 8 radii (zoom 1.5 to 50), a small body at 14 (4 to 600
   units), a belt frames the whole ring from the Sun (570 for the asteroid belt, 1,430 for the Kuiper
   belt). The Sun, and a ref with no scene object, fly to the heliocentric home view.
3. **A ring for every kind that has a body**: planets, moons, small bodies (3 radii), the Sun (1.25).
   A belt has no ring; its particles brighten (opacity x1.8, size x1.3) while it is selected. No new icon.
   **The ring follows the selection, not the panel**, for every kind: × closes the panel and the body
   stays selected, ringed and centred until another selection, Reset View or its chip turned off clears it.
4. **Pluto is one body with one panel**, the small-body panel, on the canvas, in the INDEX, from a
   resident and from `?id=`; the scene draws it as a planet-style mesh, which takes the ring and the focus.
5. **Chips own kinds.** Asteroids and Arrokoth ride DWARFS in 2D and 3D (the DWARFS tooltip names them,
   in 14 locales); ISM hides only ʻOumuamua. A chip turned **off clears a selection of its kind**: panel,
   ring and focus (the camera flies to the home view whenever a selection is cleared, whichever body
   held the focus). Selecting a body whose chip is off (a row, a
   resident, a link, `?id=`) **turns the chip on**. PATHS off closes a mission opened from a path. The
   same rule on Worlds: ORBITERS clears a selected orbiter; TRAVERSES has no selection of its own (its
   trail draws for the selected rover, which the chip does not hide), so it drops the stop tooltip only.
6. **No object, no link.** A resident is a button only when the scene has an object for it: Pallas,
   Hygiea, Quaoar and Sedna are plain text until they have data (a content decision, not this slice's).
   The Belt members are links under the same rule; Vesta is one.
7. **Mission links open in place.** A mission id in a body panel's Missions tab opens the mission panel
   over the body panel (the body stays selected). Only the mission is painted: the body panel under it
   stays mounted, covered (not painted, not focusable, Escape leaves it), so its tab and scroll come back,
   and the panel framing counts the one drawer. The mission panel's bar carries the back chip (`panel-back`),
   which returns to the body panel; × closes the mission panel, which is the same return, as the body panel
   is the one under it. A fleet id still navigates to `/fleet?id=`. Selecting another body closes a
   mission opened this way. The lists are
   **newest first**, sorted in code from the first year of each entry (the permutation is the same in
   all 14 locales, tested), the data untouched.
8. **One panel for all 18 iconic rows.** The five outbound craft (Voyager 1 and 2, Pioneer 10 and 11,
   New Horizons) open the mission panel like the rest; their message (status, heading, signal reach, the
   culture door) is a section of its Overview. `MessagePanel` is deleted. A milestone marker, a launch
   marker or a milestone box on a trajectory opens its mission (the `userData` contract is
   `PICK_KINDS`, tested, and a re-skin keeps it); a box ranks below a real body and above a pick-aid.
9. **Outer scales.** A member from the canvas or an INDEX row pans the camera to it and eases the zoom
   to 0.6 x the scale's entry distance (never below the floor, never out from a closer view the user
   chose). All eight scales have a Reset; the four that lacked one (Local Sheet, Virgo, Laniakea, Cosmic
   web) gain it. (It appeared once something was selected; [UXD-021](UXD-021-explore-hud-scale-bar-picker-pills-references.md)
   draws it always, disabled while there is nothing to reset, so the row does not shift.) A member is a link: `?context=<scale>&pick=<id>` for the five scales without a URL
   parameter of their own, mirrored both ways. Cygnus X-1 gets a Milky Way pin placed from its ra, dec and
   distance. A black hole row, or a canvas pick of such a pin, takes the camera to the hole's pin first
   and opens the lensing view from there, so leaving it lands on the pin. M87\* has no pin of its own: M87
   is the central galaxy of the Virgo Cluster, so selecting M87\* selects the Virgo Cluster pin (camera,
   highlight, panel) and then opens the lensing view. Cygnus X-1 does the same with its Milky Way pin
   (so does Sagittarius A\*). Gargantua has no pin: its panel opens alone. Until
   [B3](../../wip/2026-11-12-slice-B3-brief.md) makes the lensing view a button on the hole's panel, that
   chain is how a hole row gets there.
10. **Panel-aware framing.** With a side drawer open the look-at point sits in the middle of the space it
    leaves (the projection shifts by half the drawer's width); a bottom sheet moves nothing. One helper
    (`panel-framing.ts`), shared with the Worlds' orbiter framing (D1).
11. **L35.** The mission panel's action row holds its place while the Mars or Moon surface site is read
    and shows its chips together, so Fly no longer shifts right and the hero no longer drops; a site list
    already read this session settles before the first paint. A mission that cannot fly (5 of the 52 Mars
    and Moon missions, 1 of them with a site) has no chip if the list turns up nothing, so the row would
    leave and everything below it move up: until the list is read that part is laid out and not painted,
    and the move happens unseen. The overview's message section of the five outbound craft holds its
    place the same way (its static text, a block for the culture door) while the trajectory loads.
12. **Plan mission on small bodies.** Pluto moved from the planet panel to the small-body panel and lost
    its Plan mission chip; the small-body panel now carries it, deep-linked to `/plan?dest=<id>`, for the
    bodies /plan lists (Ceres, Vesta, Psyche, Bennu, Pluto; `src/lib/plan/destinations.ts`, shared with the
    /plan selector).

## Consequences

Every body is on screen, ringed and centred when its panel opens. Turning a chip off while a body of its
kind is selected loses the panel (re-select from the INDEX). The camera now moves on every INDEX row.
`MissionPanel` gains the message section for five ids. The 2D view draws no ring (the 2D drawing code was
not read; the selection is held, the panel opens). Pluto, now the small-body panel everywhere, no longer
opens the planet panel's TacticalScan and gravity overlays (they gate on a selected planet, and the
small-body path does not set one); it keeps the ring, the focus and, now, the Plan mission chip. Not covered here: Pallas, Hygiea, Quaoar and Sedna as
data, the ruler's "firsts" links (C5), the hover ring and the label declutter (C2), a black hole as a pin
selection (B3), Worlds' camera (D1).

## Verification

`tests/e2e/select-focus.spec.ts`, `scale-index.spec.ts` (a row also takes the camera),
`explore-message-panel.spec.ts`, the unit tests `body-ref.test.ts`, `panel-framing.test.ts`,
`missions-linkify.sort.test.ts`, `iconic-trajectory.test.ts`, `milky-way-visual.test.ts`, and the slice's
check script (`docs/wip/2026-11-12-slice-C1-brief.md` §6).
