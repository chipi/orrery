# UXD-027 — Explore levels: one shell table, glyphs in the level picker and the nav, a "what you are looking at" card, and one welcome hint

- **Status**: accepted (built; the e2e counts are in Verification, a real device is open)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — all 6 recommendations of `docs/wip/2026-11-13-slice-C8-brief.md` §12 approved as written ("I am OK on 25 recommendations", commit `ec0ceeb9be2`, for C6 to C10 together). This record is also the answer to the plan's **D4** (the second-level nav under Explore): **keep it**.
- **Answers**: E1, W1, E7, E9, E10 of the UX feedback plan; slice C8; D4
- **Builds on**: [UXD-021](UXD-021-explore-hud-scale-bar-picker-pills-references.md) (the level picker, the navigator row and its clearance of a docked panel, kept), [UXD-014](UXD-014-one-chip-and-filter.md) (the picker's chip and rungs stay `Chip`; a control that is not a chip is a 24 px `.ui-hit`), [UXD-016](UXD-016-compact-nav-and-more-menu.md) (the nav's compact rows and 32 / 44 px rules), [UXD-022](UXD-022-science-link-lists.md) (at most five `/science` links, deduped, in order), [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) (the disclosure-button pattern, the bottom-left column the hint stays out of)
- **Changes**: `src/lib/explore/scale-shells.ts` (new, with its test), `science-titles.ts` (new), `lens-panel.ts`, `src/lib/components/ScaleGlyph.svelte` (an `idSuffix`), `ScaleGlyphIcon.svelte`, `LevelContextCard.svelte`, `ExploreHint.svelte` (new), `src/lib/hint-state.ts` (new, with its test), `ExploreScalePicker.svelte`, `Nav.svelte`, `src/routes/+page.svelte`, `src/routes/explore/hub/+page.svelte`, `src/routes/explore/+page.svelte`, `src/lib/surface-scene/SurfaceScene.svelte`, `messages/*.json` (4 keys added), `tests/e2e/explore-level-card.spec.ts` (new), `explore-hint.spec.ts` (new), `explore-scale-picker.spec.ts`, `explore-science-lens-shells.spec.ts`, `nav-controls.spec.ts`, `footer-dock.spec.ts`; [UXS-014](../UXS-014.md), [IA](../IA.md), `docs/concept/05_Design_System.md`, `docs/adr/TA.md`, `docs/accessibility.md`, the module READMEs

## Context

The eight scale levels were written out by hand in five places: the nav dropdown (`Nav.svelte`), the Explore hub, the home
grid, the level picker (a `labelFor` switch) and the Science Lens story (`lens-panel.ts`), each with its own copy of the
`?context=` query, the name key and the description key. The home grid and the hub drew a glyph per level
(`ScaleGlyph`); the nav and the picker drew none (the picker chip had a 6 px dot). The per-level story existed only
inside the Science Lens panel, shown when the lens is on. Nothing on `/explore` or the Worlds invited the viewer to
zoom. [UXS-014](../UXS-014.md) and TA still described a breadcrumb that was retired in #45: the "breadcrumb" of E10 is the
level picker (the `◉ <level> ▾` chip and its ladder).

## Decision

1. **One table (E7).** `SCALE_SHELLS` (`src/lib/explore/scale-shells.ts`, typed on `ShellId`, order `CTX_ORDER`): per level the
   `?context=` query, the glyph id, `name`, `navName`, `title`, `desc`, the Science Lens story (`storyTitle`,
   `storyBody`) and up to five `tab/section` slugs. The nav dropdown, the hub, the home grid, the picker, the back-chip
   label (`scaleNavBackTarget`), the card and `computeLensPanel` map over it. Every message key is one that was already in
   use: no text was renamed or deleted (decision 6 of the brief: the three `explore_hub_shortcut_*` titles stay as the
   hub and home-grid `title`; the card and the lens use the story title). `navName` is the name except for the Solar
   System, where the nav and the hub say "Explore" (`nav_explore`), as before. The hub's Solar System tile keeps its bare
   `/explore` link (no query); the nav and the home grid keep `?context=solar-system`. A unit test fails when a level
   is missing, a glyph is unknown, a slug is not in `science-index.json`, a list is longer than five, two levels share a
   list, or a consumer file names a level's keys itself.
2. **D4: keep the second-level nav.** The Explore dropdown stays (eight rows, the TV hub link, the mobile drawer group),
   built from the table. The levels are not pages: they are `?context=` on one prerendered `/explore` (the sitemap lists
   `/explore` and `/explore/hub`, unchanged). Not taken: dropping the dropdown (nothing is lost for keyboard, TV or
   direct-jump users by keeping it), and a real page per level (a routing and SEO change).
3. **Glyphs (E10).** The picker's chip leads with the current level's glyph (20 px, in place of the 6 px dot) and every
   rung with its glyph (24 px), the same drawing the home grid and hub show (`ScaleGlyph`). A glyph needs gradient
   `<defs>` that sat in the two pages that drew it; `ScaleGlyphIcon` draws the glyph in its own `<svg>` with its own
   defs under ids suffixed per instance (`$props.id()`), so it works on any page and nine of them side by side share no
   id (`ScaleGlyph` got an optional `idSuffix`; the home grid and hub keep the page-wide defs, unchanged). With a pointer
   (`hover: hover`, `pointer: fine`, 700 px or wider) a rung also shows the home-grid `desc` under its name, one line cut
   with an ellipsis (15 rem) and linked as its `aria-describedby`; a phone or a coarse pointer shows glyph and name only.
   The Explore nav dropdown rows and the mobile drawer group lead with a 20 px glyph (decision 2a of the brief); the
   accessible name of a row is unchanged (the glyph is `aria-hidden`).
4. **The card (E9).** `LevelContextCard` hangs under the picker row, at the right edge, 280 px wide
   (`max-width: 100vw - 16px`), left of a docked panel by the same `panelCoverPx + 8` as the row. Header: the level's
   glyph (24 px), its name, a fold button (`aria-expanded`, `aria-controls`; the TierContextCard pattern: 44 px target,
   `#889fe7` hover and focus). Body: what the level is (the home-grid `desc`, 90 % white), the story the lens used to carry
   (`explore_lens_story_*_body`, label grey), then up to five `/science/<tab>/<section>` links with the sections' titles
   from `science-index.<locale>.json` (one fetch per locale, kept; the links are drawn once it has answered, so no slug flashes; if it cannot be read they read as their slugs; each link is a 24 px target, 44 px on touch). It follows the level
   and is drawn wherever the picker is: not in 2D, a black-hole or deep-sky takeover, or a body scene. Open with a pointer in a
   window 900 px wide and 560 px tall or more; folded on touch and in a smaller window with a mouse (found by the footer-dock
   sweep: at 375 x 812, 667 x 375 and 800 x 375 an open card met the chip rows and the scale panel); the choice is remembered
   (`localStorage` `orrery.explore.levelCardExpanded`, blocked storage falls back to the default). Folded, the card is only its
   header, as wide as that (in a small window with a mouse, only the glyph and the fold button: the picker chip above it names the
   level). The HUD chip row still stops only before the picker row (not the card): taking the card's 280 px made the layer chips
   wrap and move when a panel docked (chip-row spec), and folded in a small window the card is narrower than the row. The fold
   button is a disclosure, not a chip, and carries `data-a4-keep` (the chip sweep's documented exception; the orbit ruler
   header's pattern). It is a `section` named by the level. z 7, under the picker's open ladder (46) and under panels (30).
   The lists are curated per level in the table; no two are alike (Virgo and the Cosmic web open on the same section by
   design). "A dedicated article per layer" is a content task: the sections linked are the ones that exist, and the
   Virgo and Cosmic web levels still lack their own article.
5. **The story leaves the lens.** Where the card is shown, `ScienceLayersPanel` no longer gets the story props, so the
   same paragraph is not on screen twice; it keeps its layer toggles and the solar system's historical foundations. A
   level with no layers (Local Group to Cosmic Web) therefore has no lens panel at all (the panel already hid itself with
   neither story nor layers). In a takeover (black hole, body scene) the picker and card are hidden and the panel keeps
   its story.
6. **One welcome hint (E1, W1).** `ExploreHint`: a one-line dismissible status strip (`role="status"`, `aria-live="polite"`,
   the × is a 24 px `.ui-hit`, 44 px on touch, label `explore_anon_dismiss`), 11 px mono, the card's chrome. The same
   component on `/explore` ("Zoom in or out through the 8 scales · drag to look around") and, once, in `SurfaceScene` for
   `/earth /moon /mars /venus` ("Zoom in to explore · drag to look around"). It goes at the first wheel turn, pinch or tap, or a
   drag of 6 px or more, **on the canvas**, at the ×, or after 12 s (on `/explore` a docked side panel also ends it: it is not drawn beside one and does not return when the panel closes; the page, and for the Worlds `SurfaceScene`, keeps a `hintDone` flag set by the hint's `ondismiss`, so a 2D or panorama toggle or a takeover does not bring it back either; the 12 s timer reports the timeout itself rather than a measured time, which could read just under 12 s); it fades over 300 ms (a CSS transition, so
   `prefers-reduced-motion` cuts it) and is not remembered: it is back on the next visit (decision 5a of the brief).
   Pure rules in `src/lib/hint-state.ts`. A pointer device: bottom centre, 64 px up (on the Worlds above the nation
   legend); in a window under 900 px wide or 560 px tall it hangs left-aligned at 40 % of the scene's height, 48 px in (clear of the
   INDEX tab) and, from 600 px wide, ending before the scale strip. A touch device: under the top row (`top: 110px`), because the
   bottom edge is the scale strip, the time dock and the tab row. W1's "a few locations at the start zoom" is **not** built: the
   Worlds scene change is left to the Worlds slices (decision 4a).
7. **Four new keys, 14 locales, by hand.** `explore_hint_zoom`, `surface_hint_zoom`, `explore_level_card_collapse_aria`,
   `explore_level_card_expand_aria`. The brief proposed reusing `surface_card_collapse_aria` / `surface_card_expand_aria`
   for the card's fold; their text is "Collapse site details", wrong for a scale level, so the card has its own pair ("Collapse
   scale details"). The hint's close button reuses `explore_anon_dismiss`. The hint's "8" is a digit in every locale.

## Alternatives not taken

Dropping the Explore dropdown; a real route per level; the card at the bottom left (it competes with the ruler and the
scale strip) or as the first block of the lens panel (visible only with the lens on, the present problem); a hint stored
after its first dismissal; the Worlds scene markers at the start zoom (a scene change); deleting the three
`explore_hub_shortcut_*` keys; `getScienceSection` per link for the titles (five overlay fetches against one small
index).

## Consequences

- Adding a ninth level, or renaming one, is one edit in `scale-shells.ts` (plus its messages and glyph).
- `Nav.svelte` now imports the table and `ScaleGlyphIcon`, so the glyph code and the level messages load on every page.
- `/explore` shows a card at the top right at every level; with a right-docked panel it moves left of it.
- A level with no layers has no Science Lens panel, and the panel registers the lens as available only while it has a story
  or layers to draw, so the Nav's toggle reads "unavailable here" (disabled) on Local Group to Cosmic Web (e2e).
- The nine glyphs in the open ladder, the chip and the card are separate SVG documents with their own defs (five
  small gradients each).

## Verification

Unit: `scale-shells.test.ts` (one record per level in ladder order, glyphs known, `?context=` queries, at most five slugs
that are in `science-index.json`, no repeats, no two levels alike, the lens story is the table's, no consumer file
carries a level's keys), `hint-state.test.ts` (wheel, pinch, tap, close, a drag only past 6 px, 12 s), `lens-panel.test.ts`
(unchanged, green). E2E, `explore-level-card.spec.ts` (new: the eight levels' name, lead, one to five `/science` links
and one glyph; the links read as titles; the fold, its memory across a reload and across levels; the card follows a
jump through the picker; hidden in 2D and in a black-hole takeover; the card and a docked Jupiter panel disjoint at
1280 x 720), `explore-hint.spec.ts` (new: `/explore` and the four Worlds show it, a wheel on the canvas ends it, it is
back on reload, the × closes it, a tap keeps it and a drag ends it), `explore-scale-picker.spec.ts` (a glyph in the
chip and in each of the eight rungs, the rungs in ladder order, no duplicate id), `explore-science-lens-shells.spec.ts`
(the story is the card's, no lens panel on a level without layers), `nav-controls.spec.ts` (the Explore group: eight rows
in order, each with a glyph, the live level active), `footer-dock.spec.ts` (the card and the hint among the HUD parts).
The run counts and the screenshots are in the C8 row of `CHANGE-INVENTORY.md`.

## Not covered

A real device; a production build; the 12 s timeout in a browser (unit-tested only); the card and hint in ja, ko, zh-CN,
hi and ru (de and ar were read); the Worlds hint over a phone's bottom bar in a browser with real WebGL; the card at the
solar system with the ladder open, over the card's lower edge (the ladder is above it by design).
