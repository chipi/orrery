# UXD-026 — Iconic missions: a one-line legend title with an (i), the tagline in a card, and screen-sized milestone boxes

- **Status**: accepted (built; the screenshots and the e2e counts are in Verification, a real device is open)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — the ruler decision of 2026-11-13 (decision 10), and all 5 recommendations of `docs/wip/2026-11-13-slice-C7-brief.md` §12 approved as written ("I am OK on 25 recommendations", commit `ec0ceeb9be2`, for C6 to C10 together)
- **Answers**: IM1, IM2, IM3, IM4, IM7 of the UX feedback plan; slice C7 (IM5 and IM6 are C1, [UXD-019](UXD-019-select-equals-focus.md))
- **Builds on**: [UXD-019](UXD-019-select-equals-focus.md) (decision 8: the pick contract of the milestone sprites, kept), [UXD-020](UXD-020-explore-readability-pins-rings-labels.md) (12 px label, sizing from the view depth, the placement pass, the steady offset: the machinery the boxes move onto), [UXD-021](UXD-021-explore-hud-scale-bar-picker-pills-references.md) (a direction pill shows for its owner only), [UXD-014](UXD-014-one-chip-and-filter.md) (a control that is not a chip is a 24 px `.ui-hit`), [UXD-002](UXD-002-type-scale-and-the-11px-floor.md) (no italic lead below 14 px, 11 px floor), [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) (the disclosure-button pattern)
- **Changes**: `src/routes/explore/HudControls.svelte`, `src/lib/three/iconic-trajectory.ts`, `iconic-box.ts` (new, with its test), `explore-scene-host.ts` (the box probe, the hovered-milestone call), `src/app.d.ts`, `messages/*.json` (1 key changed, 1 added), `tests/e2e/explore-iconic-legend.spec.ts` (new), `chip-row.spec.ts`, `explore-paths-layer.spec.ts`; [UXS-014](../UXS-014.md), [IA](../IA.md), `docs/concept/05_Design_System.md`, `docs/adr/TA.md`, `docs/accessibility.md`, the module READMEs

## Context

The legend opened with a 11 px link row, a 76 px tagline strip and 36 px rows: about 124 px before the first row
and 808 px for the 18 rows, so it scrolled at every desktop size. The ICONIC MISSIONS chip was the last of five.
The milestone boxes in the scene were canvas sprites sized in **world units** (70 × 28, texture 256 × 104): they
scaled with the zoom, so they were blurry up close and tiny far away; every box printed the mission name, three
rows, and a label longer than about 17 characters was cut (308 of 1,498 waypoint labels in 11 locales). Evidence:
the brief's §1 and §2.

## Decision

1. **The title (IM1).** The legend's first line is `explore_iconic_tagline_placeholder` ("Hover any spacecraft to
   read why it's iconic."), 12 px mono, always. It may wrap to two or three lines in a long locale (de: three); it is
   not clipped. It is a title, not a live region.
2. **The tagline is a card beside the hovered row (decision 1, option a).** A 240 px card to the right of the
   legend, level with the hovered row (hover, keyboard focus, or the pointer over the craft's path in the scene),
   upright Crimson 16 px (no italic below 14 px). The list never shifts. The card is a persistent
   `aria-live="polite"` element at opacity 0 while idle, so a screen reader announces the text that appears. A
   selected craft shows no card: its panel opens. The card is desktop only (fine pointer); the phone drawer has the
   title and the rows.
3. **The (i) (decision 4, option a).** "Why are they all in one plane?" is the title of the existing `WhyPopover`
   (click, Escape, close button, outside click; its "Read full" link goes to `/science/transfers/coplanar-trajectories`);
   its trigger is a 20 px (i) with the 24 px `.ui-hit` hit area at the title's inline end, its popover opens under it
   right-aligned inside the legend's width (not clipped: only the row list scrolls). One new key,
   `explore_why_plane_body` (2 sentences, 14 locales); `explore_why_plane` lost its leading "ⓘ" (the glyph is the
   trigger). The mission name "Ulysses" stays Latin in the seven locales that keep it so (name-drift scan).
4. **The chip first (IM7).** `layerChips()` returns ICONIC MISSIONS first; the row reads ICONIC MISSIONS, PLANETS,
   DWARFS, COMETS, ISM. The test id `layer-paths` is unchanged. The phone's controls drawer still leaves it to the
   Iconic Missions tab.
5. **Rows (IM7).** 28 px with a fine pointer (was 36), padding 3/6. Only the row list scrolls (`.paths-legend-list`);
   the title and the popover stay. The page still measures the legend's top and caps its height
   (`sizePathsLegend`), now to the space above the lower-left stack (see decision 10). Measured, not the brief's
   arithmetic: the 18 rows need a 599 px legend, which fits without scrolling at 1440×900 (the list is 538 px, e2e);
   at 1366×768 the list is 478 px and at 1280×720 430 px, and scrolls inside. The touch drawer keeps 36 px rows. Since L45-T3b ([UXD-025](UXD-025-lists-carry-a-round-photo.md)) each row leads with a 28 px round photo ringed in the path colour in place of the swatch line; the fine-pointer row stays 28 px (vertical padding 0, the photo fills it) and the touch row 36 px (padding 4/6), so the list heights above are unchanged.
6. **The milestone box (IM2, IM4).** One canvas sprite per labelled waypoint, drawn once at the device pixel ratio
   (2 at least) the first time its mission is highlighted (the 18 builds at load stay cheap). Header `n/N · date`
   (the milestone's number among the trajectory's labelled waypoints, Today excluded, and the data's own ISO date:
   language-neutral, no new text), 11 px bold; body the milestone name, 12 px bold in the mission colour, wrapped by
   measuring (`iconic-box.ts`) to at most two lines in 200 px, an ellipsis only when two lines do not hold it (the
   full text stays in `userData.label`). The width follows the text: no empty space. Text is 12 px at every zoom: the
   sprite is sized every frame from the view depth (`worldPerPx`), lifted a steady 12 px above the marker along
   screen-up (`liftOnScreen`). Right-to-left: the lines are right-aligned, the header is always left-to-right.
7. **No mission name in a milestone box (IM3); one mission box (decision 2, option a).** A single box at the Today
   marker: the mission's name (11 px, upper case) over its `current_distance_label` (12 px, up to 3 lines in 240 px),
   drawn while the mission is highlighted, placed first in the pass: it wins every collision except with a milestone box the pointer is holding forced (the hovered marker's box wins over it). It is not a
   pick target: Today's own sphere opens the mission.
8. **Boxes that cannot be placed (decision 5, option a).** The shared pass (`placeLabels`, UXD-020) places the mission
   box, then Launch, then the rest by index, and hides a box that would overlap a placed one; it returns when there is
   room. The markers stay (they are the pick targets). The marker under the pointer forces its own box
   (`setHoveredMilestone`), so a hidden milestone is read from its marker. BepiColombo and Rosetta (11 milestones
   each) show 2 to 4 boxes at the default zoom; the rest appear on zoom or on hover.
9. **The pick contract is unchanged (decision 3 of the brief).** `PICK_KINDS`, `userData`
   (`kind`, `id`, `missionId`, `label`, `date`) and `pickTargets` are as before, and the box sprite is still the
   `PICK_KINDS.label` target; `iconic-trajectory.test.ts` keeps its original five tests green. A hidden box is not
   drawn and so not pickable (the host picks drawn objects only); its marker is.

10. **The orbit ruler folds while the legend is open (operator decision, 2026-11-13, "Ruler folds").** The legend
    runs down over the lower-left ruler, whose rows showed through it. While ICONIC MISSIONS is on (desktop, fine
    pointer) `OrbitRuler` is drawn folded to its one-line header (`forceFolded`, a prop of the component, fed
    `layers.paths` by the page). This is not the user's fold: the remembered choice (`orrery.ruler.collapsed`) is
    never written while it is forced (the header does not toggle), and closing the legend restores the ruler's own
    state, open or closed. The legend ends above the highest of the folded ruler header, PLANET SCALES and the time dock (measured in `sizePathsLegend`, also when the ruler's data arrives); the list scrolls when that is not enough. All 18 rows show without scrolling at 1440×900; at 1366×768 and 1280×720 the list scrolls and the time dock stays clickable (e2e `elementFromPoint`); at full height the legend is
    599 px tall. The 0.95 background alpha tried in the first build is back at the original 0.85: the ruler's
    rows no longer sit under the legend. The popover of the (i) hangs from the bottom of the head row (not from the
    (i)), so a three-line German title is not covered (e2e).
11. **The heading pill is in the pass (NV6).** For the craft that have one (the five outbound), the "→ star" pill is a
    slot ranked after the mission box. Where the mission box would meet it at Today, the box goes below the marker
    and the pill keeps its place at the arrow tip. `__exploreDirectionLabels` now carries the pill's rectangle; the
    e2e asserts disjoint rectangles for Voyager 1 and 2 and Pioneer 10 and 11.
12. **Review fixes.** The (i) popover is placed with logical offsets (`inset-inline-end`), so it opens inside the
    legend in a right-to-left page (e2e in `ar`). `WhyPopover` has an optional `eyebrow` prop (default the existing
    "Why this number"; `''` draws none); the legend passes `''`, the 12 other callers are unchanged. On touch the
    (i) keeps its 20 px look but its hit area is 44 × 44 px (AGENTS.md). The tagline card is `aria-hidden` and a
    separate live region reads the tagline once the pointer has rested 250 ms, so a sweep over the rows is not read
    row by row. A header wider than its box is cut with an ellipsis (it is measured like the body); the mission
    name is upper-cased in the page language (`toLocaleUpperCase`); the boxes are drawn again once the mono font
    has loaded if it had not at the first draw; the hovered milestone is cleared when the paths go off.
    `es` `explore_why_plane_body`: "a la que Júpiter lanzó".

## Alternatives not taken

The in-place tagline strip (the list shifts on every hover), a `title` tooltip for the (i) (no link, fails on
touch), a localised short date in the box header (14 month-name sets in a canvas font), capping the boxes at six per
mission, no mission box (the legend, the card and the arc's colour name it).

## Consequences

- The legend's visible height drops from 808 px to 599 px and its tagline no longer occupies the list column; the
  card sits over the scene to the right of it (z 36, above the canvas, below panels).
- The first highlight of a mission lays out and draws its boxes (one frame, up to 12 small canvases); load is
  lighter than before (no box texture is built at load).
- `scene-pins.ts` has a second consumer (`iconic-trajectory.ts`): `placeLabels`, `labelRect`, `liftOnScreen`,
  `viewDepth`, `worldPerPx`, `projectedPx`.
- A new read-only probe, `window.__iconicBoxes()`, lists every drawn box as `{missionId, kind, n, total, header,
  lines, shown, x, y, w, h, textPx}` in canvas px (sizes measured by projection, not by the sizing formula).

## Verification

Unit: `iconic-box.test.ts` (header string; measured wrap never cuts a 40-character label, ellipsis only on
overflow, CJK and Devanagari breaks; layout growth), `iconic-trajectory.test.ts` (header `n/N · date`, Today
excluded, no mission name in a milestone box, one mission box, pick contract, 12 px at three zoom levels with a
mutation that makes it fail, a hidden box returns on zoom, the hovered milestone is forced, dispose frees the box
textures), `paths-legend.test.ts` (the title, the (i) body and the 18 taglines in 14 locales).
E2: `explore-iconic-legend.spec.ts` (chip first; 1440×900: 18 rows without a scrollbar and 28 px rows; a 560 px window:
only the list scrolls and the title stays; the title at rest and the card on hover without a row moving; the (i)
opens the popover with its link, inside the legend, Escape closes it; the phone drawer; boxes: `n/N · date`, 12 px,
no mission name, one mission box, drawn boxes disjoint; the pixel size of a box through a zoom in and out),
`chip-row.spec.ts` (order), `explore-paths-layer.spec.ts` (18 trajectory files; a hydration wait the deep-link case
lacked), `select-focus.spec.ts` IM5 and `perf-explore-iconic-clicks.spec.ts` re-run.

## Not covered

A real device; a production build; the CJK locales' boxes (no screenshot); the legend over the folded ruler header on a window shorter than about
700 px (they overlap, as the legend overlapped the time dock before); the pill and mission box on a phone (the
drawer has neither card nor boxes at the same time as the sheet).
