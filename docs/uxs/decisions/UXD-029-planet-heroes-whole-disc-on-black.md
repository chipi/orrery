# UXD-029 — Planet heroes: the whole disc on black, planets only

- **Status**: accepted (frame built; the Mars picture change waits for the operator's yes on the crop, see Not done)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — recommendations of `docs/wip/2026-11-13-slice-C10-brief.md` §12 approved as written ("I am OK on 25 recommendations", commit `ec0ceeb9be2`, for C6 to C10 together), then the side-by-side sheet: "whole disc for the eight unchanged pictures: yes"; Mars: the 2018 picture (slot 04) **with a tighter crop**, seen by the operator before it lands.
- **Answers**: EP2, EP3 of the UX feedback plan; slice C10; BACKFILL B-033
- **Builds on**: [UXD-018](UXD-018-panel-shell-and-actions.md) (the panel's hero: 16:9 box, no hover glow), [UXD-023](UXD-023-star-and-outer-panels-follow-the-planet-pattern.md) (the star and outer panels keep the 16:9 cover)
- **Changes**: `src/lib/components/PlanetPanel.svelte` and `SmallBodyPanel.svelte` (Pluto only; `heroClass="planet-hero"`), `src/lib/styles/panel-tabs.css` (`.planet-hero`), `src/lib/data/planet-heroes.test.ts` (new), `tests/e2e/planet-heroes.spec.ts` (new); [UXS-001](../UXS-001.md), `docs/concept/05_Design_System.md` 5.3, the change inventory, BACKFILL, `AGENTS.md`, `scripts/IMAGE-PIPELINE.md`, the component README

## Context

The panel hero is a 16:9 cover crop (400 x 225 px). A square picture of a disc that fills its frame loses 44 % of its height, so the poles of Mercury, Venus, Earth, Uranus, Neptune and Pluto were cut. By measurement of the served pictures the disc spans 77 to 94 % of the picture height for those planets (Jupiter 77 %, Saturn's rings 52 %). "Whole-disc heroes" cannot be had by picking pictures; it needs a frame.

Pluto is drawn by `SmallBodyPanel`, and its hero is `small-bodies/pluto/01` (New Horizons, enhanced colour, a full disc), **not** `planets/pluto/01` that the C10 brief listed: the planets gallery for Pluto is not what the panel shows.

## Decision

1. **The rule.** A planet panel's hero is one picture of the planet itself, in natural or published colour: no artist concept, no spacecraft in frame, no map, inset or diagram. The nine heroes at this commit meet it (checked by title in `planet-heroes.test.ts`, and by eye on the sheet); Earth 04 (Apollo-Soyuz) and Venus 03 (Magellan concept) are in the Gallery tab, not the hero slot.
2. **The frame.** Planet panels draw the hero with `object-fit: contain` in the same 16:9 box, on pure black (`.planet-hero` in `panel-tabs.css`). The pictures' own space is `rgb(0,0,0)` (measured at the outer two pixels of every hero: 0,0,0; Jupiter 2,2,2, Neptune 1,1,0): the earlier translucent button ground over the panel colour (about 2,2,7) showed as a faint rectangle, so the ground is `#000`. Only planets: star, outer and black-hole panels keep the 16:9 cover (UXD-023).
3. **The cards and the entity page are unchanged.** The collectible card's hero band is a cover crop under a fade (it shares the file, not the frame); `/explore/<id>` draws no hero picture.
4. **Mars (decided, not yet built).** Slot 04 (Hubble, July 2018) replaces slot 03, **cropped** so its disc is about 85 % of the picture like the other planets: in the 1600 x 1600 master the disc is 825 px across, centred at (783, 728); a 970 px square window around it gives 85 %. The crop lands when the operator has seen it.

## Consequences

- All nine discs show whole at 400 px and at phone width; discs are 77 to 94 % of the box height (Saturn smaller: its rings fill the width).
- A hero's `position` (override file) has no effect on a contain frame.
- Not taken: a taller 1:1 hero (175 px more height above the tabs against UXD-018); keeping the cover and accepting the crop.

## Not done

- Mars still shows slot 03 until the cropped slot-04 picture is approved and built. No existing script crops a master tighter (`replace-gallery-slots.ts` fetches a new original and makes only the focal 1x1; `crop-variants.ts` writes the 1x1 thumbnail), so that step needs a decision on how the cropped master is made.
- EP3 relocation (Earth 04, Venus 03 to the mission galleries): not built in this slice's frame commit.
- Whether every explicit override entry should carry `disc: true` (brief decision 5a): not built; the data test guards the hero slot instead.

## Verification

`src/lib/data/planet-heroes.test.ts` (every override inside its gallery, every hero slot on disk, no artwork or spacecraft word in a hero title) and `tests/e2e/planet-heroes.spec.ts` (nine panels: `object-fit: contain`, black ground, 16:9 box). Run counts are in the C10 row of the change inventory.
