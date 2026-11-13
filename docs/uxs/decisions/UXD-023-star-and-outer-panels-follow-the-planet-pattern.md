# UXD-023 — Star, outer-scale and black-hole panels follow the planet pattern

- **Status**: accepted
- **Date**: 2026-11-12 (proposed in the B3 brief and decided)
- **Decider**: the operator, 2026-11-12 — "all open questions of §10 (Q1–Q8) approved as recommended"
  (`docs/wip/2026-11-12-slice-B3-brief.md`, line 26). SN2, MW3 and MW5 are the operator's points
  (`docs/wip/2026-11-11-ux-feedback-plan.md` lines 206, 214, 215); UXD-008 recorded the star half.
  The layout and the shared component are the lead's resolution.
- **Answers**: SN2, MW3, MW5; slice B3; Q1 to Q8 of the brief
- **Changes**: `UniversePanelBody.svelte` and `UniverseFacts.svelte` (new), the nine panels on them
  (`StarPanel`, `MilkyWayPanel`, `LocalGroupPanel`, `LocalSheetPanel`, `VirgoPanel`, `LaniakeaPanel`,
  `CosmicWebPanel`, `BlackHolePanel`, `DeepSkyPanel`), `PanelHeroImage` (optional `position`),
  `explore-scene-host.ts` (a hole opens its panel in place), `image-hero.ts` (surfaces `stars`,
  `black-holes`), `static/data/universe/panel-heroes.json` and `star-gallery.json`; Design System §5.3;
  [UXS-001](../UXS-001.md) detail panel tabs; [UXS-014](../UXS-014.md); [IA](../IA.md); `AGENTS.md`;
  `docs/adr/TA.md`; messages (5 keys added, 2 removed). Extends [UXD-008](UXD-008-star-panel-one-hero-and-in-the-sky-tab.md),
  which is not rewritten.

## Context

`StarPanel` stacked up to three blocks (photo, portrait, finder) above its tabs and pushed Overview below the
fold (SN2). Eight outer panels (Milky Way to Cosmic web, black holes, deep-sky) were one private block copied
eight times, in `rem` sizes outside the type scale, with no hero and no tabs (MW3). Selecting the Sagittarius A\*
pin replaced the main area with the lensing render and opened a text-only panel. No outer panel showed a
photograph; the deep-sky photo was only the immersive main area (MW5). Evidence: the brief's §2.

## Options

- **Shared body** (chosen) or eight edits: one component is the only way the panels stay alike.
- **Hero box**: the planet's 16:9 cover (chosen, with a reviewed focal point per image) or a natural-ratio
  box capped at 280 px (no consistency, no crop).
- **Part-of photos** (Tarantula for the LMC): hero of the parent with the pictured part named (chosen) or exact
  matches only (three panels).
- **Black holes**: open in place with the lensing behind an action (chosen, all four holes) or Sagittarius A\* only.

## Decision

1. **One body** (`UniversePanelBody`): the one-row header, the action row (at most three chips), ONE hero,
   the tab row, then Overview as lead text (`.editorial`), facts (the planet's cell look, three per row),
   extras, science, the read-more link. No colour and no size of its own: tokens only.
2. **One hero, no empty slot.** An image hero is `PanelHeroImage` (16:9 cover, opens the lightbox) and the
   caption names the author and, for a photo of a part of the entity, what is pictured ("Pictured: Tarantula
   Nebula"). With no image the star's drawn portrait is the hero; with neither there is no hero block.
3. **Tabs**: OVERVIEW; GALLERY second and only with two or more images (the grid is all but the hero); the
   panel's own tabs after. One tab draws no tab row. **A star's tabs** are OVERVIEW · GALLERY · IN THE SKY ·
   SYSTEM · TECHNICAL. IN THE SKY holds the constellation finder, the constellation named, a zodiac note for the
   thirteen constellations the ecliptic crosses, and the action "Show constellation lines" (turns the science
   lens and the Constellations layer on). Constellation names stay English (`iau-constellations.ts`).
4. **Heroes for the outer levels** come from `panel-heroes.json`: 10 entries (omega Centauri, the Sun, the LMC
   and SMC at two levels each, Andromeda, two Local Sheet groups, Perseus–Pisces) and two black holes. A deep-sky
   photo is served as its 700 px thumb (the originals are not on the WebP ladder). Laniakea and Virgo have none.
5. **Black holes open in place.** Selecting a hole at its scale (pin, INDEX row, `?galaxy=`) opens its panel and
   leaves the main area; the action "See the lensing simulation" enters the takeover. `?bh=<id>` still enters
   the takeover directly, also on a mounted page. A hole's panel open in place is a selection at its
   scale like any member's (review 2026-11-13): any other pick closes it, the scale's Reset is live
   while it is open and after its ×, and a Milky Way hole is mirrored as `?galaxy=<id>` (shareable,
   reloads to the same panel). Sagittarius A\* has the EHT 2022 image (ESO `eso2208-eht-mwa`, credit "EHT Collaboration",
   CC BY 4.0, read on `eso.org/public/outreach/copyright/`), M87\* the EHT 2019 image already in the repo.
6. **Gallery for stars**: a sidecar `star-gallery.json` and loader ship empty; no star has a second image, so no
   Gallery tab shows at ship (L29 lists the content).

## Consequences

The star panel's tab ids stay `star-tab-<id>` / `star-tabpanel`. `.enter-system` is gone (a chip, test id
`enter-system`); its `chip.spec.ts` allow-list entry goes. The star hero is a 16:9 crop now: Sirius and Vega carry
a reviewed focal point (`stars-hero-overrides.json`). Not changed: the planet family and its heroes, the lensing
scene, the entity pages, the INDEX. L30 (finder for deep-sky objects) stays deferred.

## Verification

`scripts/check-universe-panels.sh` prints `B3-CHECK violations: 0`; `UniversePanelBody.test.ts`,
`universe-heroes.test.ts`, `tests/e2e/universe-panels.spec.ts`, `tests/e2e/type-floor.spec.ts` (Milky Way, black
hole and deep-sky panels added); validate-data checks every hero key against its file and provenance row.
