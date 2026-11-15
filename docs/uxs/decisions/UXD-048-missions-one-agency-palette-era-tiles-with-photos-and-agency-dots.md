# UXD-048 — /missions: one agency palette, era tiles with photos and agency dots, agency chips with dots and counts, a redesigned card

- **Status**: accepted (built; unit tests and e2e green, see Verification; the prerender build and the full preflight were not run)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — D7 "in code, free route", strip option A, palette 10b, then the mission-control mock-up variant 2 (era photos, agency dots, redesigned cards)
- **Answers**: MI2, MI3, D7, L50 (E3)
- **Builds on**: [UXD-014](UXD-014-one-chip-and-one-filter.md) (the one chip), Design System §2.4, §5.4, §5.7a
- **Changes**: `src/lib/agencies.ts` (14 colours), `EpochTimelineStrip.svelte`, `Chip.svelte` (`dotColor`), `chip.css`, `era-flagships.ts`, `src/routes/missions/+page.svelte`, `MissionPanel.svelte` (agency row colour), `messages/*.json` (`missions_showing`), tests

## Context

The brief (`docs/wip/2026-11-13-slice-E3-brief.md`) counted three agency palettes, 7 of 13 agency colours under 3:1 on the page, and an era strip whose labels clipped (three of nine at 1356 px, ten at 724 px). Two prototype sheets on the real index (`docs/wip/2026-11-15-E3-prototypes.md`) measured options A (tiles), B (dot ruler) and C (repaired axis): only A kept every label inside its box in en, de and ar at 1440, 768 and 390.

## Decision

1. **One palette for the 14 agencies on /missions** (`agencies.ts` `color`): a card's accent and agency bar, the filter dot and the era tiles' dots read the same value. Each is 4.5:1 or better on the page and the card, none is cyan or teal, every pair is told apart under protan, deutan and tritan simulation (CIEDE2000 above 5, neighbours in the filter row 7 or more). The badge fill is gone from the card (a bar and the agency name replace it), so no badge text colour is needed there; the panel's agency row still picks white or dark text by contrast, now 4.5:1 or better for all 14.
2. **The era strip is nine equal tiles** on `ChipGroup role="radiogroup"` and `Chip kind="choice"`: roving focus, arrow keys, Home and End, reversed in right-to-left, the order mirrored in Arabic, year ranges isolated (`bdi dir="ltr"`). A tile is the era's flagship mission hero under a dark gradient with name, years, count and one dot per active agency (at most 7, then "+N"). The chosen tile has the #889fe7 edge. Nine columns from a 1100 px strip, five and four below, one scroll row under 560 px.
3. **Era photos are fixed picks** (`src/lib/era-flagships.ts`), the hero of one shipped mission each, never a new image: first-steps `sputnik1`, space-race `gemini4`, lunar-era `apollo17`, first-stations `skylab-2`, shuttle-and-mir `sts-1` (no mission of the index in 1987 to 1998 shows the Shuttle; STS-1 is the nearest picture of the subject and sits in the first-stations years), iss-assembly `spirit`, commercial-era `inspiration4`, lunar-return `artemis2`, mars-era `starship-mars-crew` (a computer render, credited as one). Credits are those of the hero in `image-provenance.json`.
4. **The strip and the agency row are always visible**; FILTERS keeps destination, status and crew. Agency chips carry a 10 px palette dot (`Chip` `dotColor`, no ring, the selected edge stays the accent) and the mission count. A line under the filters reads the catalogue total and "Showing: <era> (<n>)".
5. **The card**: photo, name with the year at the row's end, one line per agency (3 px bar in its colour, then the name), status pill, the story.

## Not changed on purpose

- The mission `color` in the data files stays (explore's paths, the HUD rings and the overlay accent read it; 11 of the 139 differ from the registry). `/missions` reads the registry.
- No sort select and no grid / list toggle: `/missions` has neither (it sorts by year, newest first); the operator's mock-up shows them and the brief said to add only what is missing, so this is raised, not built.
- The chip colours of `nation-palette.ts` and the other 23 agencies' brand colours.

## Verification

`agency-palette.test.ts` (contrast, colour-blind distance, distinctness over the index's agencies), `epoch-bands.test.ts` (era bucketing and totals), `era-flagships.test.ts` (nine picks, hero files exist), `tests/e2e/missions-era-strip.spec.ts` and `missions-filters-cards.spec.ts` on desktop-chromium and mobile-chromium against the dev server.
