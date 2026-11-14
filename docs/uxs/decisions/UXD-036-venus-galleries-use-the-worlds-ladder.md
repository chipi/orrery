# UXD-036 — Venus: the three sites use the Moon and Mars gallery ladder, so each has a hero and a GALLERY tab

- **Status**: accepted (built; checked by unit tests, e2e on three projects and screenshots, not yet by the operator)
- **Date**: 2026-11-14 (proposed 2026-11-13, decided and built)
- **Decider**: the operator, 2026-11-14 — the recommendations of `docs/wip/2026-11-13-slice-D3-brief.md` §12 approved as written ("Ok with all 12": D-decisions 8a and 9a); "don't touch heroes ... what we have now is good" (2026-11-14)
- **Answers**: VE1 of the UX feedback plan; slice D3
- **Builds on**: [UXD-025](UXD-025-lists-carry-a-round-photo.md) (the INDEX photo is the image the panel shows), [UXD-034](UXD-034-worlds-orbiter-detail-tab-and-panorama-opening.md) (the photo comes first; its guard test judged nothing on Venus until now)
- **Changes**: `src/lib/data/galleries.ts` (`getSurfaceSiteGallery`; the three site loaders are one-line calls), `src/lib/data/galleries.test.ts` and `galleries-frozen.json` (new), `src/lib/data.test.ts`, `tests/e2e/venus-sites.spec.ts` (new), `tests/e2e/surface-panel-order.spec.ts`, `tests/e2e/a11y.spec.ts`. No file under `static/images/` or `static/data/` changed.

## Context

**VE1.** "No gallery on any of the 3 sites, including no hero images." `getVenusSiteGallery()` was `return []`, so a Venus panel had no hero and no GALLERY tab, while the INDEX row of the same site already showed a photograph (UXD-025, 3 of 3).

The images exist: the mission galleries hold 3 (`venera-13`), 4 (`vega-1`) and 3 (`vega-2`) images, the fleet galleries 4 each, with provenance rows; the hero slots are already blessed in `missions-hero-overrides.json` (venera-13 `02`, vega-1 `02`, vega-2 `03`).

## Decision

1. **One ladder for the three Worlds (decision 8a).** `getSurfaceSiteGallery(body, siteId, missionId)` holds the steps once: the body's own manifest, the mission gallery by `mission_id` then by site id, the fleet gallery by every id variant of `mission_id` then of the site id, then the body's hero override. `getMoonSiteGallery`, `getMarsSiteGallery` and `getVenusSiteGallery` are one-line calls. Venus has no own manifest and no `venus-sites-hero-overrides.json`: the body's table entry for it names neither, so the own rung and the override fetch are skipped (a missing override file would be a 404 on every Venus panel); the mission and fleet rungs apply their own overrides, as for every body. `HeroSurface` is unchanged. A fourth world is one table row.
2. **The blessed heroes stay (decision 9a).** Venera 13 `missions/venera-13/02` (the lander's own frame of the surface), Vega 1 `missions/vega-1/02` (probe hardware), Vega 2 `missions/vega-2/03` (the craft in a museum hall). The INDEX thumbs already showed them; the panel now shows the same image. No hero image, slot, override or gallery order is changed (operator, 2026-11-14).
3. **Moon and Mars come out as they were.** `galleries-frozen.json` holds what the two separate loaders returned for every site (28 Moon, 27 Mars, hero override applied), frozen before the refactor; `galleries.test.ts` compares the shared ladder to it.
4. **The photo-first guard now judges Venus.** `surface-panel-order.spec.ts` no longer exempts `/venus` from its minimum count (3 sites with a gallery; Moon and Mars keep 20); `venus-sites.spec.ts` checks, for each Venus site, the hero (by slot) before the tab row, the GALLERY tab with 2, 3 and 2 thumbs, the credit line and the lightbox from the hero.
5. **Hero = INDEX thumb, for all three bodies.** `galleries.test.ts` asserts that the first gallery image of every Moon, Mars and Venus site has the same folder and slot as `thumbOfSite` (UXD-025).
6. **The entity page `/venus/<id>` has no photo hero to agree** (NV2): `SiteEntityPage` (shared by `/moon`, `/mars`, `/venus`) draws the site's illustration and facts only; no Venus site has an illustration, so nothing on the page disagrees with the panel hero. Not changed.

## Verification

Unit: `galleries.test.ts` (55 Moon and Mars sites equal to the frozen file, the three Venus sites, hero = thumb on all 58 sites), `data.test.ts`. E2E on desktop, mobile and mobile-landscape against the dev server: `venus-sites.spec.ts`, `surface-panel-order.spec.ts`, the Venus rows of `a11y.spec.ts` (0 violations). Screenshots read, desktop and phone: the three Venus panels before (empty galleries, the old panel) and after, the GALLERY tab, Luna 17 and Spirit beside them.

Not checked: a real device, Firefox and WebKit; the Venus Share card and the `ru` and `ar` panels were not shot.
