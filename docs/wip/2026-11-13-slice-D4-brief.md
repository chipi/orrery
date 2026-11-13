# Slice D4 brief — Moon traverses: are they in the Mars style? (WM2)

Read-only brief, written at HEAD `df38554fe07` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, one read-only node script over `static/data/moon-traverses/` and `mars-traverses/` (scratchpad `dbr-trav.mjs`, not in the repo; its output is quoted). Nothing was built or run in a browser; no image of a traverse was looked at. No code was changed. **This slice waits on the operator's Q8, and Q8 is not answered**: the question is listed at `docs/wip/2026-11-11-ux-feedback-plan.md` line 415 ("Q8 Moon traverses: line style only, or the Mars extras (patches, photos, stops)?") and in `UXS-000-orrery-ux-architecture.md` line 143; the plan's "Answers" sections (lines 431-483), `CHANGE-INVENTORY.md` line 66 ("Waits on: Q8") and the C6 to C10 approval ("I am OK on 25 recommendations") do not cover it. Decision 10 is the whole of the open question; the rest is built for either answer. The plan requires the side-by-side before any build (slice row 368: "shots side by side").

## 0. Answer first

1. **No, the Moon traverses are not in the Mars style, and the gap is mostly the data, not the drawing.** The Mars style (TA.md line 486) is a line coloured by sol, sol ticks and labels, kilometre milestones, a landing ring on the path, stop rings with "name · Sol N" pills, photo pins, a hover card, along-route HiRISE tiles, and in the panel rover tiles and a JOURNEY tab (timeline, replay, elevation profile). Every one of these but the casing, the width, the stop rings and the tiles reads a field the Moon traverse files do not have: `point_sols`, `length_km`, `last_sol`, `landing_sol`, `point_elev_m`, `has_route_photos` (§2.2). The Moon code even gates them on that field (`surface-traverses.ts:614`, `:679`, `:733`, `:881`, `:890`) and on `config.planet === 'mars'` (`SurfaceScene.svelte:546`).
2. **Six of the eight Moon routes are real tracks; two are drawn from nothing.** Lunokhod 1 and 2, Yutu-2 and Apollo 15, 16, 17 are traced from LROC or USGS mapped traverses (their `credit` fields name the GeoJSON or Haase et al. 2019): 678, 832, 474, 902, 1,001 and 1,124 points. **Chang'e 3 (Yutu) and Chandrayaan-3 (Pragyan) are 9-point procedural polylines** "anchored at the lander" (`build-moon-traverses.mjs` header: "SIMPLIFIED, procedurally generated approximations … NOT surveyed per-waypoint tracks"), ~114 m and ~101 m long: that is the plan's "densify".
3. **Recommendation (Q8):** **line style only** (option a): the Moon routes take the Mars palette and furniture that need only geometry (a blue-to-white-to-amber ramp along the *distance* driven, kilometre milestones, a landing ring, the hover card by kilometre, the same stop pills), and keep every sol-based or photo-based element Mars-only, because the Moon files carry no time, no photos for five of the eight rovers, and an honest per-point time does not exist in the sources the repo cites. Mars-style patches, photos and a JOURNEY tab are a content project (§4.4), not a style pass.
4. **For the two procedural routes (Decision 11):** first try the LROC route (`build-lroc-traverse.ts` takes `--url`; whether LROC publishes a Yutu or Pragyan track was not checked), and if none exists draw them as what they are: a short, labelled, approximate route; do not interpolate more points (that would add geometry we do not have).
5. **No image is added or changed. Possible new key: 0 to 1** (§6). Needs the operator before code: Q8 (Decision 10) and two forks (11, 12).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` line 280; slice row 368)

| ID | Text | State at HEAD |
|---|---|---|
| WM2 | "Are the Moon rover traverses aligned with the style we used (Mars)?" | No (§2.1 table). |

Done when (plan row 368): "shots side by side". Row text: "per Q8: line style only, or Mars parity (patches, photos, stops, densify Chang'e 3 and Chandrayaan-3's 9-point routes)".

## 2. Current state (file:line at `df38554fe07`)

### 2.1 Mars style vs Moon style, element by element

| Element | Mars | Moon |
|---|---|---|
| Line | vertex colours by sol, `solRampColor` blue (136,159,231) → white → amber (251,191,36), width 4, 0.95 opacity active / 0.7 ended (`surface-traverses.ts:92-107`, `:611-622`, `:644-665`) | one colour: the nation colour lifted toward white, `liftForDark` (`:645-647`), same width and opacity |
| Casing | dark casing, width 8 (`:626-643`) | same |
| Sol ticks, major labels | minor and major ticks, labels at majors (`:673-732`) | none (gated on `sols`) |
| Kilometre milestones | pills "10 km" on the other side (`:733-764`) | none (inside the same `if (sols)`) |
| Landing marker | start caption "LANDED ON …" (green) plus a landing ring on the path (`:826-832`, `:888-907`) | caption only; ring needs `sols` |
| End marker and caption | end dot + caption "N km · N days" (`:766-854`) | same; km from the polyline length (no `length_km`) |
| Stops | ring pin in the stop's kind colour + pill "label · Sol N" (`:908-955`) | same pins and pills; the pill drops the sol (`:937-940`, "Apollo 17's stations read 'Sol undefined'") |
| Photo pins | `route_photos` camera pins (`:863-879`) | none: `getMoonTraverse` never loads a photos sidecar (`data/surface.ts:358-374`) |
| Route tiles | HiRISE tiles along the route, regional CTX re-centred on the midpoint (`:958-1090`) | Apollo 16 (56 tiles, 2 m/px) and Apollo 17 (74 tiles, 0.5 m/px) only |
| Hover card | sol, ≈ date, km (`pathHover`, `:164-187`) | none (needs `point_sols`) |
| Replay marker | sol-driven (`:880-887`) | none |
| Panel | rover tiles ("Days on Mars", sol, ≈ date), JOURNEY tab with timeline, replay, elevation profile (`SurfaceScene.svelte:539-547`, `:564-700`, tab at `build-panel-tabs.ts`) | generic surface-time cells; no JOURNEY (`roverTr` is null unless `config.planet === 'mars' && last_sol != null`) |

### 2.2 The data (script `dbr-trav.mjs`)

| File | Points | Stops | Route tiles | Source named in `credit` | Real or procedural |
|---|---|---|---|---|---|
| `luna17` (Lunokhod 1) | 678 | 0 | none | LROC NAC traverse GeoJSON, 9.4 km | real |
| `luna21` (Lunokhod 2) | 832 | 0 | none | LROC GeoJSON, 35.1 km (a 3.8 km loop left out) | real |
| `change3` (Yutu) | 9 | 0 | none | "V1 simplified polyline anchored at the lander" | **procedural** |
| `change4` (Yutu-2) | 474 | 0 | none | LROC GeoJSON, 1.8 km | real |
| `chandrayaan3` (Pragyan) | 9 | 0 | none | "V1 simplified polyline anchored at the Vikram lander" | **procedural** |
| `apollo15` | 902 | 4 samples | none | LROC EVA 1 to 3 GeoJSONs, 26.2 km | real |
| `apollo16` | 1,001 | 3 samples | 56 | LROC EVA 1 to 3 GeoJSONs, 24.9 km | real |
| `apollo17` | 1,124 | 9 samples | 74 | USGS mapped traverse, Haase et al. 2019, ~35 km | real |
| Mars (5 files) | 54 to 1,383 | 3 to 6 | 4 to 62 (+ 2 to 6 photos each) | MMGIS, PDS tables, HiRISE tracing | all carry `point_sols`, `length_km`, `last_sol`, `landing_sol`, `point_elev_m` |

No Moon file has `point_sols`, `length_km`, `last_sol`, `landing_sol`, `point_elev_m`, `has_route_photos`, or per-stop sols. TA.md line 492 still calls all five robotic routes "V1 polylines (procedural …)", which is stale for three of them (LROC replaced them); fix in §9.

### 2.3 What time data could exist

The sources named in the credits give geometry, not time: LROC GeoJSONs are untimed line features "in NO drive order" (`build-lroc-traverse.ts` header, chained by proximity); Haase et al. 2019 order Apollo 17 by EVA; the Apollo files keep "mission order (EVA 1, EVA 2, EVA 3)" but no EVA boundary index. A Moon "sol" would be an Earth day or a lunar day for the robotic rovers and an EVA hour for Apollo; none is in the repo. Per-day Lunokhod and Yutu-2 positions are published in the literature (not opened: NV3).

### 2.4 Tests that touch the area

`surface-traverses.test.ts` and `surface-traverses.build.test.ts` (the helpers and the build with a fake context), `moon-route-patches.data.test.ts`, `build-lroc-traverse.test.ts` (the chaining), `data.test.ts` (`getMoonTraverse`, line 1542ff), `moon.spec.ts`, `moon-tier2.spec.ts`, `surface-route-view.spec.ts`, `mars.spec.ts` (Mars traverse HUD). None compares the two bodies' styling.

## 3. Screenshot list: the side-by-side the plan asks for (before and after; no browser was used for this brief)

Desktop 1440×900, phone 390×844, landscape 844×390, `en-US`. Every pair at the same three zooms (whole route, mid, close), same panel state, in one contact sheet per pair:
1. **Mars reference** (current style): `/mars?site=spirit` (7.7 km) and `?site=curiosity` (38 km): route view, a stop pill, the km milestones.
2. **Moon before** (current): `/moon?site=luna17` (9.4 km), `?site=luna21` (35 km), `?site=apollo17` (35 km, tiles), `?site=change4` (1.8 km), `?site=change3` and `?site=chandrayaan3` (the 9-point routes).
3. **Moon after** per the chosen decisions, same views.
4. Pairs: Spirit vs Lunokhod 1 (similar length), Curiosity vs Lunokhod 2 (similar length), Opportunity vs Apollo 15.
5. The two procedural routes at close zoom (before/after Decisions 11 and 12), with the credit text in the panel.
6. A phone-landscape crop of the milestone pills over the nation legend (the A4 chip row and `hud-beside-panel` positions were not traced: NV5).

## 4. Proposal

### 4.1 Option (a), recommended: the style that needs only geometry

1. **Ramp by distance.** `rampParam(i)` = `sols ? (sols[i] − 1)/(last − 1) : cumKm[i]/totalKm`, so every Moon route gets the same blue → white → amber ramp as Mars (Decision 12). The line stops being the nation colour; the nation colour stays on the site marker, the INDEX dot and the panel (the C6 rule), so nothing loses its identity.
2. **Kilometre milestones** for routes with no sols: lift the `if (sols)` guard around `:733-764` to "has points", using `distanceMilestoneStepKm` (0.5 km under 3 km, 1 km to 15, 5 km to 60). The Apollo files have no `length_km`, so the label uses the polyline length (as the end caption already does, `:835`).
3. **Landing ring on the path** (`:888-907`) for every Moon route (the ring needs only the first point); the replay marker, sol ticks and sol labels stay Mars-only.
4. **Hover card by kilometre:** `pathHover` keeps `pointSols` optional; without sols the card shows "N.N km from the lander" (existing key `panel_rover_km`).
5. **Stops:** unchanged (pins and pills already shared); Apollo pills read the stop label only, as now.
6. **Panel:** Moon rovers keep the generic surface-time tiles (the code's own comment says so, `SurfaceScene.svelte:541-545`); no JOURNEY tab.
7. One table in code (`TRAVERSE_STYLE`) instead of the `sols ? … : …` forks, so a future body reads one place.

### 4.2 What each decision changes

| | (a) line style only | (b) style plus the extras that exist | (c) full Mars parity |
|---|---|---|---|
| Ramp, milestones, ring, hover by km | yes | yes | yes |
| Apollo stops with their sample kind | already | already | already |
| Apollo 15 route tiles | no | only if LROC NAC tiles exist for the route (Apollo 16 and 17 have them; the closeups note found the same `Apollo 15` ortho URL pattern 404 for 11/12/14/15/16: `docs/wip/2026-11-09-apollo-closeups.md`) | yes, needs imagery |
| Photo pins for the rovers | no | only where a photo with a known place is in the repo (none found: no Moon `route-photos` sidecar exists) | yes, new sourcing and provenance |
| Time (sols / EVA hours), JOURNEY tab, elevation profile | no | no | needs per-point time and heights: not in the repo |
| New images | none | none | many |

### 4.3 The two procedural routes (Decision 11)

Step 1 (build): try `build-lroc-traverse.ts --rover change3 --url <LROC geojson> --dry` and the same for `chandrayaan3` (the GeoJSON names were not checked; offline here: NV2). Step 2: if a track exists, it replaces the file (credit, provenance) and the route is drawn like the others. Step 3: if not, keep the 9 points, say "approximate route" in the panel credit (already "V1 simplified polyline", written for readers as if it were data), and draw the line at its real size: ~114 m and ~101 m are tiny next to the 400 m stop labels, so the route view frames it by its midpoint (`routeViewCenters` is set only for routes with tiles: none here; NV6).

### 4.4 What Mars parity would take (not recommended now)

Per rover, a time series (days or lunar days) from a cited source, a photo sidecar with positions, LROC NAC tiles along the route, and Apollo EVA boundaries; plus Journey and elevation code that today reads Mars fields. That is five data projects with provenance, review and 14-locale labels, not a style slice. It belongs on the content list (H) if you want it.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on D4 |
|---|---|
| A3 (UXD-001, link and accent colour) | `a3-keep` data colours: the traverse ramp is already data-coloured (`SOL_RAMP`); using it on the Moon adds no new colour. The stop kind colours (`panorama` blue `#8aa0ff`, A3 Q14) are shared. |
| A4/A5 chips | The route-view chip is a `Chip` already; unchanged. |
| C4 (UXD-024) | The bottom-left column and the milestone pills share the lower screen on a close route: shot 6. |
| C6 | The INDEX dot is the nation colour: the traverse line stops being the nation colour under (a); the marker and the INDEX keep it. |
| D1 | A selected rover is a site, not an orbiter: no overlap; the panel shift (D1 Decision 2 (a)) also moves a selected route's centre. |
| D2 | The panel order is unchanged for rovers. |
| L45 | None: no Moon route has a JOURNEY tab, so no thumbs are involved. |
| H (content) | Kaguya/SELENE and Chandrayaan-2 are being added as content; neither has a rover. |

Plan ideas now outdated: "densify Chang'e 3 and Chandrayaan-3's 9-point routes" as a style item (it is a data question and densifying by interpolation would invent geometry); TA.md's "V1 procedural" sentence for the three LROC routes.

## 6. i18n impact (14 locales)

- Under (a): **0 new keys**: the milestone label uses `panel_rover_km`; the hover card line reuses it. If the operator wants the procedural routes labelled in the panel (Decision 11 (a), step 3), the credit text is data (English `credit` plus the `i18n/<locale>/moon-traverses/<id>.json` overlay used for stop labels, `data/surface.ts:302-318`); a dedicated "approximate route" chip would be **1 new key** in 14 locales (hand-translated; no paid run).
- Numbers in text: none new.

## 7. Data changes

- (a): none, unless Decision 11 finds an LROC track for Chang'e 3 or Chandrayaan-3: then `static/data/moon-traverses/change3.json` and `chandrayaan3.json` are rewritten by `build-lroc-traverse.ts` with their credit, and `image-provenance`/`link-provenance` are touched only if the script writes them (it writes the file and credit, per its header).
- No image added.

## 8. Tests to add or change

**Unit (vitest):**
- `surface-traverses.test.ts` / `.build.test.ts`: a sol-less route gets a distance ramp (first vertex colour = ramp(0), last = ramp(1)), milestones every `distanceMilestoneStepKm`, a landing ring, a hover card in km; a sol route is byte-identical to today (frozen fixture: Spirit).
- `data.test.ts` (Moon traverses): add a data test that every Moon traverse has ≥ 2 points, a credit naming its source, and that the two procedural ones are flagged (a field `approximate: true` if Decision 11 keeps them).
- A style-table test: the Moon and Mars traverses read one `TRAVERSE_STYLE`.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `moon-traverse-style.spec.ts`: `/moon?site=luna17`, `?site=apollo17`, `?site=change4`: route view on; the casing, line and a milestone pill are present (through `window.__surfaceScene*` probes for the traverse objects, to be added in the same shape as `__surfaceSceneDrawnSiteXY`), the stop pills of Apollo 17 still read without a sol, the hover card shows km.
2. `surface-route-view.spec.ts`, `moon.spec.ts`, `moon-tier2.spec.ts`, `mars.spec.ts`: unchanged, must pass.
3. `footer-dock.spec.ts`: a Moon route selected: the pills do not intersect the HUD parts at five sizes.
4. `a11y.spec.ts`: 0 serious on `/moon` with a rover selected.

## 9. Docs to update by name

- **UXD-031** (new, `docs/uxs/decisions/UXD-031-moon-traverses-take-the-mars-style.md`; next free at build time): the answer to Q8, the table of §2.1, which elements are shared; row in `docs/uxs/decisions/README.md`; row D4 in `CHANGE-INVENTORY.md` (line 66); close Q8 in `UXS-000-orrery-ux-architecture.md` line 143.
- `docs/concept/05_Design_System.md`: there is **no traverse style spec today** (`grep -n -i traverse` over the Design System, `UXS-006.md` and `IA.md` returns nothing); add a §5.x "Traverse" (ramp, casing, milestones, stop pills, what a route needs to be drawn this way) and a line in §6.6.
- `docs/uxs/UXS-006.md` (Moon and Mars rover routes), `docs/uxs/IA.md` §controls if the route chip is listed.
- `docs/adr/TA.md` lines 486-487 and 492 (the Mars traverse paragraph gains "the Moon's routes use the same style without sols"; line 492 is stale: three of the five robotic routes are LROC-traced), `docs/adr/ADR-072.md` addendum (traverse style is common layer).
- READMEs: `src/lib/surface-scene/README.md` (`surface-traverses.ts` row: the style table), `scripts/hotspots/README.md` (`build-moon-traverses.mjs` writes only two routes now; `build-lroc-traverse.ts` the rest).
- Header comments: `build-moon-traverses.mjs` (names the five robotic rovers; three were replaced), `surface-traverses.ts:189`, `surface-markers.ts:428-435` (the stale "Moon traverses no longer tile patches" comment found in `docs/wip/2026-11-09-apollo-closeups.md`).

## 10. Phased plan

1. **D4a side-by-side first** (the plan's rule): the shots of §3.1 and §3.2 as they are, plus a mock-up of option (a) from the same data (a throw-away render in the scratchpad), shown to the operator with Decision 10 to 12.
2. **D4b style table and the sol-less path:** the unit tests red first, then `surface-traverses.ts`.
3. **D4c the procedural routes** per Decision 11.
4. Shots after, docs of §9, `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage`.

## 11. Acceptance checks

- All eight Moon routes are drawn with the shared ramp, casing, landing ring and milestones; the Mars routes are unchanged (frozen fixture, unit).
- No element that needs time or a photo is drawn for a route that has none, and no time or photo is invented (data test).
- The two 9-point routes are either replaced by a sourced track or labelled approximate in their credit.
- The side-by-side sheets are approved by the operator before the build lands (the plan's rule).
- Docs of §9 updated; the inventory row D4 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the four D briefs)

10. **Q8: line style only, or the Mars extras?** **(a) Line style only: the Moon routes get the Mars palette (by distance), casing, kilometre milestones, landing ring and km hover card; sol ticks, photo pins, JOURNEY tab and replay stay Mars-only** (recommended: the Moon files carry no time and no rover photos, six of eight routes are real LROC tracks that deserve the style, and nothing is invented); (b) style plus the extras that already exist (Apollo stops are already shown; add Apollo 15 route tiles only if imagery exists, which the Apollo closeups note found it does not at the 0.5 m URL); (c) full Mars parity (patches, photos, stops for every rover, per-point time, JOURNEY): a content project of five rovers with sourcing and provenance, not recommended in this slice and moved to the H content list if you want it.
11. **Chang'e 3 and Chandrayaan-3, the 9-point routes.** **(a) Look for an LROC-mapped track first; if none exists keep the 9 points, say "approximate route" in the credit, and do not add points** (recommended: a densified line would be invented geometry); (b) densify by spline anyway so it reads like the others (the plan's word; looks consistent, shows a path nobody drove); (c) leave both exactly as they are.
12. **The Moon line colour.** **(a) The Mars ramp by distance for every Moon route** (recommended: one look for every route on every world; the nation colour stays on the marker, INDEX dot and panel); (b) keep the nation colour on the line (the Soviet red is lifted toward white today because it read as a dark thread on regolith: `surface-traverses.ts:645-646`); (c) colour Apollo routes by EVA (needs the EVA boundaries, which the files do not carry).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run and no traverse was looked at on screen; the §2.1 table is from reading the code and the files, so what the Moon routes actually look like next to Mars has not been seen (that is §3's job, before the build).
- NV2 Whether LROC publishes a Chang'e 3 (Yutu) or Chandrayaan-3 (Pragyan) traverse GeoJSON, and the URLs, was not checked (no network use in this brief).
- NV3 Whether per-day Lunokhod or Yutu-2 positions can be had from a citable source was not searched; §2.3 is from the repo's own sources only.
- NV4 Whether the Chang'e 5, Chang'e 6, SLIM or Luna 24 sites should also have a traverse was not considered (they have no traverse file and are out of the row's scope).
- NV5 The traverse pills' collisions with the nation legend and `hud-beside-panel` on a landscape phone were not traced.
- NV6 Whether the camera frames a 100 m route sensibly with no route tiles (`routeViewCenters` empty, `enterRouteView` falls back to the landing) was not traced; `frameCamRForRoute` returns null for routes without detail tiles (`:3056-3090`, read only as far as the null return was seen).
- NV7 The ramp's contrast on the Moon's light regolith (the "white" mid-colour of the ramp on bright ground) was not measured; the casing helps, and `SOL_RAMP`'s white midpoint on the grey Moon is the likely weak spot to look at in the shots.
- NV8 `docs/uxs/CHANGE-INVENTORY.md` line 66, `UXS-000` line 143 and the Design System were searched by grep for "traverse"; a sentence worded differently may exist.
- NV9 The Mars rover JSON key list (`point_sols_approx` on Zhurong) means one Mars route has approximate sols: how the Mars style treats it was not read.
