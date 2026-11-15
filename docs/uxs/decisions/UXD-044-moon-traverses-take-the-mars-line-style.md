# UXD-044 — Moon traverses take the Mars line style: the ramp by distance, casing, kilometre milestones, landing ring and a km hover card; the two 9-point routes are labelled "Approximate route"

- **Status**: accepted (built; unit tests green, browser checks listed under Verification)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-13 — "Ok with all 12" (decisions 10a, 11a, 12a of `docs/wip/2026-11-13-slice-D4-brief.md` §12; Q8 answered: line style only)
- **Answers**: WM2, L49 of the UX feedback plan; Q8; slice D4
- **Builds on**: [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md) (the ramp is a data colour, `a3-keep`), ADR-072 (surface routes share one scene), #641 (the Mars sol ramp, ticks, milestones)
- **Changes**: `src/lib/surface-scene/surface-traverses.ts` (`TRAVERSE_STYLE`, `cumulativeKm`, `traverseRampParams`; ramp, milestones, landing ring and hover for every route), `surface-picking.ts` (hover without sols), `SurfaceScene.svelte` (the "Approximate route" line), `src/types/surface-site.ts` and `static/data/schemas/traverse.schema.json` (`approximate`), `static/data/moon-traverses/change3.json`, `chandrayaan3.json`, `scripts/hotspots/build-moon-traverses.mjs`, `messages/*.json` (`traverse_hover_km`, `traverse_approximate_route`), tests (`surface-traverses.test.ts`, `.build.test.ts`, `moon-traverses.data.test.ts`, `src/routes/library/source-ids.test.ts`). No image, no dependency changed.

## Context

The Mars routes read sol, length, landing sol, elevation and photo fields the Moon files do not have, so the Moon routes were drawn in the nation colour with none of the Mars furniture. Six of the eight Moon routes are real mapped tracks (LROC NAC or USGS); Chang'e 3 (Yutu) and Chandrayaan-3 (Pragyan) are 9-point outlines of about 114 m and 101 m.

## Decision

1. **Line style only (Q8, 10a).** Every Moon route is drawn with the Mars casing, width and opacity (`TRAVERSE_STYLE`) and the same ramp, by the **distance driven** from the lander because the files carry no time (12a). The nation colour stays on the site marker, the INDEX dot and the panel.
2. **Furniture that needs only geometry**: kilometre milestone pills (`distanceMilestoneStepKm`), the landing ring on the path, the hover card "N km from landing" (`traverse_hover_km`). Stops keep their rings and pills (a Moon stop has no sol, its pill is the name).
3. **Mars-only, because it needs data the Moon files do not have**: sol ticks and labels, the replay marker, photo pins, the Journey tab and rover tiles. No time and no photo is invented.
4. **The two 9-point routes (11a).** The LROC featured-sites list (`lroc.im-ldi.com/featured_sites`, read 2026-11-15) has a traverse page for Lunokhod 1 and 2 and Chang'e 4 only; Chang'e 3 has landing-site images and no traverse, and Chandrayaan-3 has no entry. The LROC GeoJSON name pattern `luna_change_4_traverse.geojson` (200 for Chang'e 4) returns 404 for the Chang'e 3 and Chandrayaan-3 names tried. No other source with citable coordinates was found, so both files keep their 9 points, carry `approximate: true`, and the panel (OVERVIEW tab, above the credit) says "Approximate route: a simplified outline of the drive, not a surveyed track." The `credit` text says the same and names what was checked. The routes were not densified.

## Not done here

- No published coordinates for Yutu or Pragyan were found; the search budget of the session ran out after the LROC listing was read. Peer-reviewed Yutu maps (CNSA / the Chang'e 3 science team) and ISRO's rover-track release were not opened.
- Per-point time, photo sidecars, Apollo 15 route tiles and a Journey tab for the Moon: a content project (brief §4.4), not a style change.

## Verification

Unit: see the commit. Browser results (screenshots, e2e) are recorded in the slice report; this record is not updated with them.
