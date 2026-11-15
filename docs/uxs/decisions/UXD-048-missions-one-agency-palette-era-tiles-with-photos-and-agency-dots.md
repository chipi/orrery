# UXD-048 — /missions: one agency palette, era tiles with photos and agency dots, agency chips with dots and counts, a redesigned card

- **Status**: accepted (built; unit tests and e2e green, see Verification; the prerender build and the full preflight were not run)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — D7 "in code, free route", strip option A, palette 10b, then the mission-control mock-up variant 2 (era photos, agency dots, redesigned cards)
- **Answers**: MI2, MI3, D7, L50 (E3)
- **Builds on**: [UXD-014](UXD-014-one-chip-and-one-filter.md) (the one chip), Design System §2.4, §5.4, §5.7a
- **Changes**: `EntityCard`, `AgencyFilterRow`, `BrowseToolbar`, `EntityList`, `entity-card-grid.css`, `entity-browse-page.css`, `/fleet` page, `epoch-bands.ts` (bucketing), `agencyDataColor`, `src/lib/agencies.ts` (14 colours), `EpochTimelineStrip.svelte`, `Chip.svelte` (`dotColor`), `chip.css`, `era-flagships.ts`, `src/routes/missions/+page.svelte`, `MissionPanel.svelte` (agency row colour), `messages/*.json` (`missions_showing`), tests

## Context

The brief (`docs/wip/2026-11-13-slice-E3-brief.md`) counted three agency palettes, 7 of 13 agency colours under 3:1 on the page, and an era strip whose labels clipped (three of nine at 1356 px, ten at 724 px). Two prototype sheets on the real index (`docs/wip/2026-11-15-E3-prototypes.md`) measured options A (tiles), B (dot ruler) and C (repaired axis): only A kept every label inside its box in en, de and ar at 1440, 768 and 390.

## Decision

1. **One palette for the 14 agencies on /missions** (`agencies.ts` `color`): a card's accent and agency bar, the filter dot and the era tiles' dots read the same value. Each is 4.5:1 or better on the page and the card, none is cyan or teal, every pair is told apart under protan, deutan and tritan simulation (CIEDE2000 above 5, neighbours in the filter row 7 or more). The badge fill is gone from the card (a bar and the agency name replace it), so no badge text colour is needed there; the panel's agency row still picks white or dark text by contrast, now 4.5:1 or better for all 14.
2. **The era strip is nine equal tiles** on `ChipGroup role="radiogroup"` and `Chip kind="choice"`: roving focus, arrow keys, Home and End, reversed in right-to-left, the order mirrored in Arabic, year ranges isolated (`bdi dir="ltr"`). A tile is the era's flagship mission hero under a dark gradient with name, years, count and one dot per active agency (at most 7, then "+N"). The chosen tile has the #889fe7 edge. Nine columns from a 1100 px strip, five and four below, one scroll row under 560 px.
3. **Era photos are fixed picks** (`src/lib/era-flagships.ts`), the hero of one shipped mission each, never a new image: first-steps `sputnik1`, space-race `gemini4`, lunar-era `apollo17`, first-stations `skylab-2`, shuttle-and-mir `sts-1` (no mission of the index in 1987 to 1998 shows the Shuttle; STS-1 is the nearest picture of the subject and sits in the first-stations years), iss-assembly `spirit`, commercial-era `inspiration4`, lunar-return `artemis2`, mars-era `starship-mars-crew` (a computer render, credited as one). Credits are those of the hero in `image-provenance.json`.
4. **The strip and the agency row are always visible**; FILTERS keeps destination, status and crew. Agency chips carry a 10 px palette dot (`Chip` `dotColor`, no ring, the selected edge stays the accent) and the mission count. A line under the filters reads the catalogue total and "Showing: <era> (<n>)".
5. **The card**: photo, name with the year at the row's end, one line per agency (3 px bar in its colour, then the name), status pill, the story.

## Amendment, round 2 (2026-11-15): one pattern for /missions and /fleet

The operator: cards "have to stay the same size they were"; "missions and fleet are two sides of the same coin". The card, the grid, the agency row, the toolbar and the list became shared components, and /fleet was brought into line. The pages that use the card and the grid are /missions and /fleet only.

1. **One card, one footprint** (`EntityCard`, `entity-card-grid.css`): photo plus a fixed 142 px body of four rows, so no card has an empty band or stretches past its row. Card heights, first 16 cards, before E3 (`eadf9e3978a^`) and now: /missions 277 to 285 px at 1440, 302 to 330 at 768, 252 to 289 at 390, now 287, 340 and 241; /fleet 326 to 381, 347 to 418 and 278 to 404, now 287, 340 and 241. One height per width on both pages, within 2 px of the old /missions card and 40 to 100 px shorter than the old /fleet card; the empty band under the last row is 37 px at most (a record without a story).
2. **Black photos**: the cause is not a missing image. The first card image gets its `src` only when the image-ladder manifest and the hero overrides have loaded (`responsive()` returns no `src` after mount until then; a log of one cold load: first card image in the DOM at 4.45 s, the manifest at 4.34 s, painted at 4.55 s), and until then the slot showed the 40 % black fill. The slot is now the soft gradient. Screenshots wait for the images.
3. **Agency chips** show the name, the dot and the count; the logos are dropped (dark on dark).
4. **Era photos**: Shuttle & Mir is STS-1 (the Columbia launch); it was counted in First Stations because the bands overlap and the earlier band won; where bands share more than a boundary year the later band now wins (1981 to 1986 move to Shuttle & Mir: 12 and 15 missions). Mars Era shows Perseverance on Mars (a photo) instead of the Starship render. Text over every tile photo is at least 6.6:1 (sampled: the brightest pixel under each text box).
5. **Sort and Grid / List** exist on both pages (/fleet had sort in its filters and a list view by URL only); they are in the toolbar.
6. **Differences found and how they were resolved**: strip inside FILTERS on /fleet, always visible on /missions → visible on both; agency chips inside FILTERS with logos on both → one visible row, names; sort only on /fleet → toolbar on both; view toggle in the filters row on /fleet, none on /missions → toolbar; "Showing" line only on /missions → both; CLEAR FILTERS only while the filters were open → whenever a filter is on; two card layouts (badge, type, country on /fleet; badge, type, destination on /missions) → one card, country and destination are hidden facts, the category is a pill; content-visibility only on /fleet → the grid; page padding 22 px vs 12 px on a phone and a smaller card name on /fleet → one frame (`.browse-main`) and one name size; /fleet agency dots use brand colours lifted to 4.5:1 where the palette has no value. Kept per type: the FILTERS chip disabled in the line-up, the Line-up view, the category filter, the destination and crew filters, the launches banner, how the era counts are made (year bands vs the entry's epoch).

## Amendment, round 3 (2026-11-15): the photo sits on the right, the text on plain dark

The operator: the photos were "very murky" under the gradient, "not as good as in the idea" (the mock-up). The tile is now the mock-up's layout: the text column on the tile's dark surface at the start, the photo crisp and at full brightness on the end side (40 % of the tile, the square crop, a per-era object position, a short fade at its inner edge); selected tile #889fe7. Text contrast no longer depends on the photo (12.2:1 at the worst text box, measured on the dark area, /missions and /fleet, 1440 and 390 px; before it was 4.23 at the worst tile). Agency dots: at most 5. The flagship picks were reviewed for a subject that reads at about 60 px: first-steps `sputnik1`, space-race `gemini4`, lunar-era `apollo17` (unchanged); first-stations `skylab-2` → `skylab-4` (slot 04, NASA, "View of Skylab space station cluster in Earth orbit", PD-NASA); shuttle-and-mir `sts-1` (unchanged); iss-assembly `spirit` → `curiosity` (PIA16239 self-portrait, NASA/JPL, PD-NASA); commercial-era `inspiration4` → `chandrayaan3` (LVM3 M4 lifting off, ISRO, PD-self); lunar-return `artemis2` (unchanged); mars-era `perseverance` → `spirit` (a real photograph of a Mars rover, NASA, PD-NASA, KSC-03PD-0784).

## Not changed on purpose

- The mission `color` in the data files stays (explore's paths, the HUD rings and the overlay accent read it; 11 of the 139 differ from the registry). `/missions` reads the registry.
- The chip colours of `nation-palette.ts` and the other 23 agencies' brand colours.

## Verification

`agency-palette.test.ts` (contrast, colour-blind distance, distinctness over the index's agencies), `epoch-bands.test.ts` (era bucketing and totals), `era-flagships.test.ts` (nine picks, hero files exist), `tests/e2e/missions-era-strip.spec.ts` and `missions-filters-cards.spec.ts` on desktop-chromium and mobile-chromium against the dev server.
