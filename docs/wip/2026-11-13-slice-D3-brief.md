# Slice D3 brief — Venus galleries: the three Venus sites use the Moon and Mars image ladder (VE1)

Read-only brief, written at HEAD `df38554fe07` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, two read-only node scripts over `static/data/` (scratchpad `dbr-venus.mjs`, `dbr-sites.mjs`, not in the repo), and five images opened by eye. Nothing was built or run in a browser. No code was changed. No new image file is needed or proposed: every image below is already in the repo, with provenance rows.

## 0. Answer first

1. **The cause is one function that returns nothing.** `getVenusSiteGallery()` is `return []` (`src/lib/data/galleries.ts:11-14`, comment "Venus sites have no image galleries yet"), `/venus` passes it as `loadGallery` (`routes/venus/+page.svelte:19,71`), and `data.test.ts:1534-1537` asserts the empty array. With no gallery the panel has no hero (`SurfaceScene.svelte:6384`, `panelGallery.length > 0`) and no GALLERY tab (`build-panel-tabs.ts`, `visible: hasGallery`).
2. **The images exist for all three sites, twice.** Mission galleries: `venera-13` 3, `vega-1` 4, `vega-2` 3; fleet galleries: 4, 4, 4 (`mission-galleries.json`, `fleet-galleries.json`; the 11 + 12 webp files are on disk). The hero slots are already blessed in `missions-hero-overrides.json` (venera-13 `02`, vega-1 `02`, vega-2 `03`) and `fleet-hero-overrides.json` (venera-13 `02`, vega-1 `01`, vega-2 `03`). The Venus INDEX already shows these images as round thumbs (L45-T2: `/venus` 3 of 3), so today the INDEX row shows a photograph the panel does not.
3. **Recommendation:** one shared loader `getSurfaceSiteGallery(body, siteId, missionId)` with the ladder Moon and Mars already use (own folder, mission by `mission_id`, mission by id, fleet by every id variant, hero override last), `getMoonSiteGallery`, `getMarsSiteGallery` and `getVenusSiteGallery` become one-line calls to it. Venus gets its hero, GALLERY tab and credit line with **no new manifest, no new image, no new key, no data change**. The ladder is the one `scripts/build-entity-thumbs.ts` already runs for the INDEX, so the hero and the INDEX thumb agree by construction (UXD-025).
4. **Needs the operator before code:** nothing blocks; 2 forks in §12 (8 and 9). Decision 9 shows the three heroes (I looked at them) before they go live.

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` line 286; slice row 367)

| ID | Text | State at HEAD |
|---|---|---|
| VE1 | "No gallery on any of the 3 sites, including no hero images." | True: §2.1. |

Done when (plan row 367): "gallery and hero on Venera 13, Vega 1, Vega 2". The plan row says "3–4 images each": measured 3 to 4 per ladder rung (§2.2).

## 2. Current state (file:line at `df38554fe07`)

### 2.1 The three loaders

| Body | Loader | Ladder |
|---|---|---|
| Moon | `getMoonSiteGallery` (`galleries.ts:161-194`) | `moon-sites` hero overrides loaded; own `moon-site-galleries.json`; mission by `mission_id`; mission by site id; fleet by each id variant of `mission_id`, then of the site id (`gallery-ids.ts:35`); every hit reordered by the `moon-sites` override |
| Mars | `getMarsSiteGallery` (`:243-276`) | the same steps, `mars-sites` overrides, `mars-site-galleries.json` |
| Venus | `getVenusSiteGallery` (`:12-14`) | none |

The Moon and Mars bodies are line-for-line twins (the comments even cite each other); the Venus one is the third copy that was never written. `loadPanelData` (`load-panel-data.ts`) calls `fetchGallery(siteId, missionId)`; Venus sites carry no `mission_id` (`venus-sites.json`: `venera-13` has none), so step 2 is skipped and step 3 (mission by site id) hits, as for the Mars sites whose id equals a mission id.

### 2.2 What the ladder gives each Venus site (script `dbr-venus.mjs`)

| Site | Mission gallery (rung 3) | Fleet gallery (rung 5) | Blessed mission slot | Blessed fleet slot | Hero the panel would show (mission rung wins) |
|---|---|---|---|---|---|
| venera-13 | 3 | 4 | `02` ("the lander photographing its own surface", 2026-11-06) | `02` | `missions/venera-13/02` |
| vega-1 | 4 | 4 | `02` (manual, 2026-06-20) | `01` ("the spacecraft; 02 was a stamp", 2026-11-06) | `missions/vega-1/02` |
| vega-2 | 3 | 4 | `03` (manual, 2026-06-20) | `03` (manual, 2026-06-20) | `missions/vega-2/03` |

Looked at by eye (the 1x1 crops of the blessed slots): `missions/venera-13/02` is a black-and-white frame from the lander's own camera, hardware in the lower right, rock and soil: a photograph from the surface of Venus; `missions/vega-1/02` is a colour photograph of the probe's hardware (red and silver tanks and brackets); `missions/vega-2/03` is a colour photograph of a Vega craft model in a museum hall with a lander and rover beside it. `missions/vega-1/01` is a painted mission diagram with labels; `fleet-galleries/vega-1/01` is a museum model of the whole craft, the nicest of the three and not the one the ladder will pick. The vision labels in `image-vision.json` called the Vega 1 slot "an ESA Vega rocket on a launch pad": that label is wrong (the image is probe hardware) and is not used as evidence anywhere in this brief.

### 2.3 What else reads the same loaders

- The INDEX thumb: `entity-thumbs.json` `sites.venus` (3 entries), built by `scripts/build-entity-thumbs.ts` running "the gallery loaders' ladder" (`entity-thumb.ts:40-47`); `entity-thumb.test.ts:176-180` asserts every Moon, Mars and Venus site has a thumb on disk.
- The entity page `/venus/<id>` (`SiteEntityPage.svelte`, `data/site-entity.ts`): a grep for `gallery` or `hero` in both returned nothing, so how its hero is chosen was not traced (NV2).
- The Share card (`cardSpec`) and the panel credit line `panelGalleryCredit(agency)` (`SurfaceScene.svelte:6679`): the credit line is written for the gallery tab; Roscosmos sites use it as for Luna on the Moon.
- The site story (`site-stories/venera-13.json` etc.) already uses `missions/venera-13/01..03` inside its chapters: those images will also appear in the GALLERY tab; Moon and Mars sites have the same overlap (UXD: gallery shows `panelGalleryGrid = gallery.slice(1)` after the hero, `:1372`).

### 2.4 Tests that touch the area

`data.test.ts:1534-1537` (the "empty array" assertion that must change), `entity-thumb.test.ts` (Venus thumbs), `a11y.spec.ts`, `footer-dock.spec.ts`, `chip-row.spec.ts`, `landing.spec.ts`, `visual.spec.ts` (all mention `/venus`). No e2e opens a Venus site panel (a search of `tests/e2e` for `venus` finds no panel spec).

## 3. Screenshot list (before and after; no browser was used for this brief)

Desktop 1440×900, phone 390×844, landscape 844×390, `en-US` plus `ru` (Cyrillic names, the sites' own credit text), `ar` (RTL):
1. `/venus?site=venera-13`, `?site=vega-1`, `?site=vega-2`: panel on OVERVIEW before (no hero, no GALLERY) and after (hero, GALLERY tab).
2. The GALLERY tab of each site: the grid, the credit line, the lightbox on the hero.
3. The three after-heroes in a row next to the same sites' INDEX rows (hero = thumb), and next to the Moon (Luna 17) and Mars (Spirit) panels at the same size: the "does Venus look like the others" check.
4. Side-by-side of the hero choice per Decision 9: for Vega 1 the blessed `missions/vega-1/02` against `fleet-galleries/vega-1/01` (the museum model).
5. The Share card of one Venus site after (it reads the same gallery).

## 4. Proposal

### 4.1 One ladder for the three bodies

New `getSurfaceSiteGallery(surface: 'moon-sites' | 'mars-sites' | 'venus-sites', manifest: string, siteId, missionIdFallback?)` in `galleries.ts`, containing the five steps once. `getMoonSiteGallery`, `getMarsSiteGallery` and `getVenusSiteGallery` call it. The two private manifests (`moon-site-galleries.json`, `mars-site-galleries.json`) stay for those bodies; for Venus the "own folder" step reads `venus-site-galleries.json`, which does not exist: `getCategoryGallery` already returns `[]` when the manifest is missing (`:102-118`, try/catch), so no file is created. The hero-override step for `venus-sites` needs the surface name in `HeroSurface` (`image-hero.ts`); `loadHeroOverrides('venus-sites')` on a missing JSON means "empty cache, default path applies" (the file's own header), so it is a no-op until an override is ever written. The mission and fleet overrides (rungs 3 and 5) are applied inside `getMissionGallery` / `getFleetGallery` already.

Result: the same code path serves all three Worlds with a site list, and the README rule "Don't reinvent this on the route" (`surface-scene/README.md`) holds.

### 4.2 Nothing else changes

`PanelHeroImage`, the GALLERY tab, the credit line and the lightbox already run for the other bodies and need no Venus branch. `/venus/+page.svelte` keeps passing `loadGallery={getVenusSiteGallery}`.

### 4.3 If the heroes are wrong

Per the existing method: a different slot is a line in `missions-hero-overrides.json` (or a `venus-sites-hero-overrides.json`), a JSON diff, reversible, with a reason and date. This slice changes none unless Decision 9 says (b).

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on D3 |
|---|---|
| L45-T2 / UXD-025 | The Venus INDEX rows already show these images (3 of 3). D3 closes the gap "the INDEX shows a photo the panel does not". The T2 manifest needs no rebuild: same ladder, same blessed slots. |
| B1 (UXD-018) | Hero below the action row: unchanged. |
| C9 | Its Explore panel link for Venus becomes worth following once D3 lands (C9 Decision 3). Build D3 first. |
| D2 | The "photo first on every site" guard in D2's tests lists Venus as an exception until D3 lands: build D3 first. |
| A3/A4 | Venus's world tint on chips is unchanged. |
| H (content) | A later content pass can add Venus-specific images (Magellan radar, Akatsuki) to `fleet-galleries`; the ladder will pick them up. No such image is added here. |

Plan ideas now outdated: "`getVenusSiteGallery` stops returning [] and uses the Moon/Mars ladder (mission + fleet galleries exist: 3–4 images each)" stands, measured at 3-4 mission and 4 fleet.

## 6. i18n impact (14 locales)

None: no visible string is added. The panel's existing "GALLERY", gallery aria and credit-line keys are shared.

## 7. Data changes

None. No file under `static/images/` or `static/data/` is added or edited (no manifest, no override, no provenance row). Provenance of the 11 mission and 12 fleet images already exists (`image-provenance.json` rows for `fleet-galleries/vega-1/*`, `vega-2/*`, checked by `validate-data`; the mission and `venera-13` rows were not individually looked up: NV3).

## 8. Tests to add or change

**Unit (vitest):**
- `data.test.ts:1534`: replace "returns an empty array" with: `getVenusSiteGallery('venera-13')` returns the mission rung (3 URLs, hero `02` first), `'vega-1'` 4 URLs with `02` first, `'vega-2'` 3 URLs with `03` first; an unknown id returns `[]`.
- A ladder test over the shared function: Moon and Mars results for Luna 17 and Spirit are byte-identical to the old functions' (freeze the current outputs as fixtures before the refactor: red-green).
- `entity-thumb.test.ts`: add "the first URL of every Worlds site's gallery is the site's thumb slot" (hero = thumb, all three bodies) if the existing test does not already assert it.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `venus-sites.spec.ts` (there is no Venus panel spec today): for each of the three sites by `?site=`: the panel opens, a hero `img` is visible before the tab row, the GALLERY tab is present, its grid has `n − 1` thumbs (2, 3, 2), clicking the hero opens the lightbox, the credit line is visible.
2. `surface-index.spec.ts`: add that the INDEX row's thumb `src` stem equals the panel hero stem for the Venus rows (hero = thumb).
3. `a11y.spec.ts`: 0 serious on `/venus?site=vega-1` with the panel open.
4. `footer-dock.spec.ts`, `chip-row.spec.ts`: unchanged, must pass (no HUD change).

## 9. Docs to update by name

- **UXD-030** (new, `docs/uxs/decisions/UXD-030-venus-galleries-use-the-worlds-ladder.md`; next free at build time; a short record: the cause, the one ladder, the three heroes): row in `docs/uxs/decisions/README.md`; row D3 in `CHANGE-INVENTORY.md` (line 65); close VE1.
- `docs/uxs/UXS-006.md` (the Moon/Mars/Venus panel spec: Venus has a hero and GALLERY like the others; there is no Venus UXS, `ls docs/uxs` shows none), `docs/uxs/IA.md` (the `/venus` row), `docs/concept/05_Design_System.md` §5.3 only if it says Venus has no gallery (`grep -n -i venus` found none: nothing to change otherwise).
- `docs/adr/TA.md` (the `/venus` row at line 90 and the canonical-card aliases paragraph at line 225: Venus sites now also feed the panel hero), `docs/adr/ADR-072.md` addendum (the shared gallery ladder is part of the common layer).
- READMEs: `src/lib/data/README.md` if it lists `getVenusSiteGallery` (not opened), `src/lib/surface-scene/README.md` ("Where things live": the loader ladder).
- Header comments: `galleries.ts` lines 11 and 161-172 and 227-242 (the twin comments become one).

## 10. Phased plan

1. **D3a ladder:** freeze the Moon and Mars outputs as fixtures, then extract `getSurfaceSiteGallery`; the old tests stay green.
2. **D3b Venus:** `getVenusSiteGallery` on the shared ladder, `HeroSurface` gains `venus-sites`, the `data.test.ts` change, `venus-sites.spec.ts`.
3. Shots (§3), the heroes shown to the operator (Decision 9), docs of §9, `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage` (the refactor moves lines in a covered file).

## 11. Acceptance checks

- Venera 13, Vega 1 and Vega 2 each show a hero before the tabs, a GALLERY tab with `n − 1` thumbs, the lightbox and the credit line, on three projects (e2e).
- The Moon and Mars galleries are unchanged for every site (the frozen fixtures, unit).
- The Venus INDEX thumb and the panel hero are the same image for all three rows (unit + e2e).
- `git diff --stat -- static/images static/data` is empty.
- Docs of §9 updated; the inventory row D3 states what was built and not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the four D briefs)

8. **How Venus gets its gallery.** **(a) One shared ladder for Moon, Mars and Venus** (recommended: the three loaders are copies of one rule, the README says not to reinvent it on the route, and a fourth world later is one line); (b) copy the ladder into `getVenusSiteGallery` (smallest diff, a third twin to keep in step); (c) author a `venus-site-galleries.json` of curated picks first (an explicit list per site; more work, only needed if you want Venus images that are not the mission or fleet ones, and the plan says to use the existing galleries).
9. **The three heroes.** **(a) Keep the blessed slots as they are: Venera 13 `missions/venera-13/02` (the surface frame), Vega 1 `missions/vega-1/02` (probe hardware), Vega 2 `missions/vega-2/03` (the craft in a museum hall)** (recommended: you or the hero review already blessed each, the INDEX thumbs show them today, and I looked at the three: each is a real photograph; the shots in §3.4 let you see them in the panel before it ships); (b) switch Vega 1 to `fleet-galleries/vega-1/01` (the museum model of the whole craft, a better-looking picture: a line in an override file, no new image, needs your yes because a Vega 2 pair would then look different); (c) hold the Venus panels until the hero review is redone.

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. That the existing panel code shows a hero and a GALLERY tab for Venus as soon as the array is non-empty is read from `SurfaceScene.svelte:6384-6404` and `build-panel-tabs.ts`, not run; whether any Venus-specific branch (a `config.planet === 'venus'` check) hides them was not searched beyond the lines read.
- NV2 How `/venus/<id>` (the entity page) chooses its hero was not traced; if it has its own ladder it may already show these images or not.
- NV3 The provenance rows of the 11 mission-gallery images (`/images/missions/venera-13/*`, `vega-1/*`, `vega-2/*`) were not individually looked up; `validate-data` fails closed on a missing row, so a missing row would surface when the loader makes them reachable only if the gate counts reachability (not checked).
- NV4 Whether `HeroSurface` (`image-hero.ts:40-54`) is a closed union that other code switches over (so adding `venus-sites` touches a `Record<HeroSurface, …>` map such as `SURFACE_TO_DIR`) was seen at the type and the map only; the full set of consumers was not searched.
- NV5 The fleet-gallery blessed slots were read from the override files, not looked at by eye except Vega 1 `01`.
- NV6 Whether the story chapters' overlap with the gallery grid (§2.3) looks repetitive on the Venus panel was not looked at; the Moon and Mars panels have the same overlap.
- NV7 The 11 Venus images were opened only as the three blessed 1x1 crops plus two others; the other mission and fleet images were not looked at, and their credits (Soviet, museum photographs) were not read.
- NV8 `docs/uxs/UXS-006.md` and the Design System were searched for "Venus" by grep only; there is no Venus UXS file (`ls docs/uxs`).
