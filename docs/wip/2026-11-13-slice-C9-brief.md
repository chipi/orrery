# Slice C9 brief — Explore to Worlds: a way between the solar-system view and the four world pages (E6)

Read-only brief, written at HEAD `9a47f5e4ae3` on `tech-debt/0.9.9`. Method: reading files from the repo root and `git grep`. Nothing was built, run in a browser or measured. No code was changed. This slice waits on the operator's **D5** (`docs/wip/2026-11-11-ux-feedback-plan.md` line 30; `CHANGE-INVENTORY.md` line 50): **D5 is not answered** anywhere in the plan, so Decision 1 is the whole of the open question; the rest is built for either answer.

## 0. Answer first

1. **Explore to Worlds is half there.** The Earth and Mars planet panels carry a link chip "Explore surface" to `/earth` and `/mars` (`PlanetPanel.svelte:177-180`), the Moon's satellite panel one to `/moon` (`SatellitePanel.svelte:179-181`). **Venus has none** (the condition is `planet.id === 'earth' || planet.id === 'mars'`, `:177`) although `/venus` exists, and the label is the same generic words for all four (key `panel_action_surface`, en-US "Explore surface"; the plan's wording is "Go to Mars").
2. **Worlds to Explore does not exist.** No Worlds route or `SurfaceScene` code links to `/explore` (`grep -n "explore" src/routes/{mars,moon,earth,venus}/+page.svelte` finds one comment only, `earth/+page.svelte:139`; `SurfaceScene.svelte` has no `/explore` link). The deep link to land on the right body exists: `/explore?id=<planet|moon|small body>` opens that body's panel and (C1) focuses it (`explore-url-sync.svelte.ts:70-92`, `body-ref.ts:38-56`, which resolves planets, small bodies and satellites).
3. **Recommendation (D5):** an **explicit link both ways**, no automatic switch on zoom: "Go to Mars" in the planet panel's action row (all four bodies, Venus added) and a "Back to Explore" chip at the start of the Worlds' view-action row (`SurfaceScene.svelte:5636` `ctrl-row`, mobile `:5741-5773`) that opens `/explore?id=<body>`. Both labels carry the body's name from a message with `{name}`: **2 new keys** (14 locales), the old `panel_action_surface` retires once all callers move (or stays as the generic fallback, Decision 2).
4. **No data change, no new route, no image.** Tests: unit for the link table, e2e for the four round trips on three projects. One new UXD record (UXD-027), small.
5. **Needs the operator before code:** D5 plus 3 smaller forks in §12.

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` line 145; slice row 356)

| ID | Text | State at HEAD |
|---|---|---|
| E6 | "Zooming into Earth, Mars, Moon, Venus switches to the world pages, or an option to switch into those detail pages — a link between the two sections. (D5)" | Forward link for Earth, Mars, Moon (panel chip), none for Venus; no reverse link; no zoom-triggered switch. |

Done when (plan row 356): "link both ways for Earth, Moon, Mars, Venus".

## 2. Current state (file:line at `9a47f5e4ae3`)

### 2.1 Explore to Worlds

| Entry point | Where | Result |
|---|---|---|
| Earth, Mars planet panel | `PlanetPanel.svelte:176-185` `PanelActions`: `Chip kind="link" href={localHref('/${planet.id}')}` "Explore surface" (en-US `panel_action_surface`, messages line 3684), then "Plan mission" (`panel_action_plan`) when `planet.missionable && onPlanMission`; Share is added last by `PanelActions` | `/earth`, `/mars` |
| Moon satellite panel | `SatellitePanel.svelte:178-182` (`entry.id === 'moon'`) | `/moon` |
| Venus planet panel | none | `/venus` unreachable from Explore except through the nav WORLDS group |
| Body entity page `/explore/<id>` | `routes/explore/[id]/+page.svelte` (text only: `body.surface` is a prose field, `:57`) | no link to the world page (the search for `/mars|/moon|/earth|/venus` in that file returned nothing) |
| INDEX row ↗ | `ScaleIndex.svelte:298-306` | links `/explore/<id>` (the entity page), not the world page |
| Zoom | `explore-scene-host.ts`: no code found that switches route on close approach (`grep -n "zoom.*surface\|enterSurface" explore-scene-host.ts` found nothing); the only zoom-in takeover is an exoplanet's `BodyScene` | nothing happens at a planet's minimum distance |

Action-row rule: UXD-018 limits the row to three host chips, order "in-scene, view, simulate, plan, Share last". "Go to <body>" is the "view" chip; with Plan and Share that is three: at the limit (the Moon's panel has no Plan: two).
Panel text strings: `panel_action_surface` in 14 locales exists; its meaning ("explore the surface") is wrong for Venus (cloud-top view / Venera landers) and vague for Earth (launch sites and orbit).

### 2.2 Worlds to Explore

`/earth`, `/moon`, `/mars`, `/venus` are thin shells over `SurfaceScene.svelte` (7,770 lines). The HUD's view-action row is `surfaceControls` (`:5636` `ctrl-row`: 2D/3D toggle, Reset view, Spin, AR/Sky; mobile mirror `hud-top-mobile` `:5741-5773`). The page's own header is a visually hidden H1 (`VisuallyHiddenH1`, `venus/+page.svelte:15`). The WORLDS hub `/worlds` (`routes/worlds/+page.svelte`) lists the four bodies; the nav WORLDS group has the same four children (`Nav.svelte:90-100`). Nothing on a Worlds page says "this body is also a planet in the solar system".
Related URL contracts: `/earth`, `/moon` and `/mars` own `?site=`, `?regime=`, `?view=`-style params (`earth/+page.svelte:139` comment about `/explore`'s id deep link); `/explore?id=` is the Explore side. The unit test of `resolveBodyRef` covers `?id=` ladders (`body-ref.ts`; its test file not opened).

### 2.3 Why it matters for D5 (zoom-switch vs link)

At a planet's minimum zoom `/explore` shows a textured sphere with moons (the 3D catalogue `PLANETS` in `explore-scene.ts`, `size3` 2.8 for Mercury …), not the Worlds' real-data surface; a switch on zoom would cross two different cameras, units and data (the Worlds' terrain tiers, `SurfaceScene` quality tiers) and leave the page (losing the Explore level, panels, INDEX state). A link keeps the user in control and the history clean. The existing e2e `select-focus.spec.ts` and `explore-deeplinks.spec.ts` rely on `?id=` landing with the panel open, which the reverse link reuses.

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`); `en-US` plus `de`, `ru`, `ar` (RTL), `hi` for label length:
1. `/explore?id=earth`, `?id=mars`, `?id=venus`, `?id=moon`: the panel's action row (before: Venus has none; after: all four), both with Plan and Share present.
2. `/earth`, `/moon`, `/mars`, `/venus`: the view-action row (before/after), at the default view and with a site panel open (the row shifts with `hud-beside-panel`, `SurfaceScene.svelte:5730`); phone and landscape: the top-left mobile cluster (`hud-top-mobile`).
3. The round trip: Explore Mars panel → click → `/mars` → Back to Explore → `/explore?id=mars` (the panel open, Mars focused), 4 shots for each of the four bodies (16 shots; contact sheet).
4. `ar` (RTL) the chip order and arrow glyph direction.

## 4. Proposal per feedback item

### 4.1 E6 — a link both ways (recommended answer to D5)

One table, `src/lib/explore/world-links.ts` (pure), the single source for both directions:
```
WORLD_LINKS = { earth: { world: '/earth', explore: 'earth' }, moon: { world: '/moon', explore: 'moon' },
                mars: { world: '/mars', explore: 'mars' }, venus: { world: '/venus', explore: 'venus' } }
```
`worldHrefFor(bodyId)` and `exploreHrefFor(body)` return the locale-prefixed URL (`localHref('/mars')`, `localHref('/explore?id=mars')`); both read the table, so a fifth world (the plan notes "grows as surface scenes ship", `Nav.svelte:84-88`) is one line. A unit test checks that every entry of the nav WORLDS group has a row, every `explore` value resolves with `resolveBodyRef`, and the two directions are inverse.

**Explore side.** `PlanetPanel` and `SatellitePanel` render one chip, `Chip kind="link"` "Go to Mars" (Decision 2), whenever `worldHrefFor(id)` exists: Earth, Mars, Venus in `PlanetPanel`, the Moon in `SatellitePanel`; replacing the two hard-coded conditions (`PlanetPanel.svelte:177`, `SatellitePanel.svelte:179`). The chip stays in the "view" slot of UXD-018's action row. The Sun's panel and every other body have no chip (no world page). The body entity page `/explore/<id>` (`routes/explore/[id]`) gets the same link in its header area for the four bodies (fold in: the page is the crawlable twin of the panel and shares the action vocabulary); Decision 4.

**Worlds side.** A link chip at the **start** of the view-action row: "◂ Explore" / "Back to Explore" with the body's name where room allows (`ui-chip` 30 px / 44 px touch; the same `Chip kind="link"`), href `exploreHrefFor(body)` → `/explore?id=mars`: the planet panel opens and the camera focuses it (C1), so the reader returns to the object they left, not to the Sun. On phone it joins `hud-top-mobile` (`SurfaceScene.svelte:5741-5773`) before the view toggle; both clusters hide while a panorama is active (existing `!panoramaActive`), which also hides the way back: acceptable because a panorama has its own exit and the nav bar's EXPLORE group stays (NV3).
`/earth` carries the INDEX for sites and objects; the chip does not touch it.

### 4.2 The alternative the operator may prefer for D5

"Switch on zoom" (Decision 1b): at the camera's minimum distance to Earth/Mars/Moon/Venus, `/explore` shows a non-blocking suggestion chip "Open the world view" (the same link), never an automatic navigation: that is the explicit link plus a nudge, and costs one more small component and threshold (`explore-scene-host.ts` camera distance vs body radius; `camera-framing` code was not read: NV2). A true automatic route change is not recommended (§2.3) and is not specified here.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on C9 |
|---|---|
| B1 (UXD-018) | The action row is the place: at most three chips, order "in-scene, view, simulate, plan, Share": the new chip is "view"; the plan row's "Go to Mars in the planet panel" is the same chip as today's "Explore surface" renamed: **fold in** (one chip, not two). |
| C1 (UXD-019) | `?id=` opens and focuses: the reverse link depends on it; the moon id for `?id=moon` goes through `resolveBodyRef`'s `satellite` branch. |
| C3 (UXD-021) | Worlds' scale bar and HUD rows are unchanged; the new chip joins an existing row. |
| C4/C5 (UXD-024) | The bottom-left column (readout, locate chip, ruler) is not touched; this chip is top-left. |
| C6, C7 | None. |
| C8 | **Fold in:** C8's welcome hint also mounts in `SurfaceScene`; build C8 first (hint), then C9 (chip) so the two edits to the Worlds HUD are ordered. C8's "one shell table" has nothing to do with the four Worlds (they are not Explore levels): `world-links.ts` is a separate, smaller table. |
| A6 / UXD-016 | The nav WORLDS group already lists the four; no change. |
| D (Worlds slices) | D3 Venus galleries: the Venus panel link is useful now (the page exists), richer after D3; D1/D2 change panels, not the row. |

Plan ideas now outdated: "Back to Explore on the world page" as a **named, separate** button (it is a link chip in the existing row); "or switch on zoom" as the default (a nudge at most).

## 6. i18n impact (14 locales, glossary first)

- **New keys: 2.** `explore_go_to_world` ("Go to {name}") and `world_back_to_explore` ("Back to Explore" or "◂ {name} in Explore", Decision 2). `{name}` is the body's existing localised name (`explore_ctx_*` is for levels; the bodies' names: the planet overlay `i18n-src/<loc>/planets/<id>.json` `name`, and `nav_earth`, `nav_moon`, `nav_mars`, `nav_venus` already exist for the nav and are the Worlds-group forms: use those). Grammar: "Go to {name}" needs a preposition/case in `ru`, `de`, `ar`, `hi`, `ja`, `ko`: for those locales either a case-correct phrase per body (4 bodies × 14 = 56 strings) or a name-free wording ("Open the world view"); Decision 2 chooses. Glossary first (`static/data/glossary/native-terms.json`, not opened: NV5): "world", "surface", "Explore" (the nav word `nav_explore` is "OUR SOLAR SYSTEM", `nav_group_explore` is the group label: the chip's wording must use the one the locale's nav uses).
- `panel_action_surface` ("Explore surface") stays only if Decision 2(c); otherwise removed from 14 locales and the code in one pass (UXD-011: no partial updates).
- No overlay data changes. No paid translation run (`no-paid-translation-runs`): 2 short keys by hand, checked by `validate-data`.

## 7. Data changes

None. `world-links.ts` is code. No `?id=` extension is needed (the four ids resolve: planets `earth mars venus`, satellite `moon`; `resolveBodyRef` was read, its unit test not run: NV1).

## 8. Tests to add or change

**Unit (vitest):** `world-links.test.ts` (new): the four bodies; `worldHrefFor` / `exploreHrefFor` are inverses; every WORLDS nav child has a row; every `explore` id resolves via `resolveBodyRef` with the real planet/satellite id sets; locale prefix applied (`/de/mars`). `PlanetPanel`/`SatellitePanel` render tests: the chip exists for earth, mars, venus, moon and not for jupiter, the Sun; its `href` equals the helper; the row has ≤3 chips with Plan and Share.
**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `explore-worlds-link.spec.ts`: for each body in `earth, mars, venus, moon`: `/explore?id=<id>` → the panel is open, the chip is visible and in the viewport (desktop and phone), click → URL `/<id>` and the scene is mounted (`data-testid` of each world's canvas as the existing world specs use); the "Back to Explore" chip is the first control of the view row, click → `/explore?id=<id>`, panel open and `__exploreCameraState().ringVisible` true (select = focus).
2. `select-focus.spec.ts`, `explore-deeplinks.spec.ts`: unchanged, must pass; add the `?id=venus` and `?id=moon` cases if missing (NV1).
3. `footer-dock.spec.ts` (Worlds parts at five sizes): add the new chip's box to the HUD parts and assert it does not overlap the 2D/3D toggle, Reset and the nation legend, with and without a site panel open (`hud-beside-panel`).
4. `a11y.spec.ts` + `a11y-rtl-probe.spec.ts`: 0 serious on the four Worlds and the four Explore panels; the chip's arrow glyph mirrors in `ar`.
5. The existing specs that assert the text "Explore surface" (a search of `tests/` for it found none: `grep -rn "Explore surface" tests` returned nothing) need no change.

## 9. Docs to update by name

- **UXD-027** (new, `docs/uxs/decisions/UXD-027-explore-and-worlds-link-both-ways.md`; 024 is the last used at HEAD, 025 and 026 are proposed by the C7 and C8 briefs): the answer to D5, the table, the labels; row in `docs/uxs/decisions/README.md`; close "D5" in `docs/uxs/UXS-000-orrery-ux-architecture.md` §Open (the README names it there).
- `docs/concept/05_Design_System.md` §5.3 (action row: the "view" chip for the four bodies), §6.5/§6.6 (Earth, Moon screen patterns: the Back to Explore chip in the view row), §5.7 (link chip usage).
- `docs/uxs/UXS-001.md` (planet panel), `UXS-005.md` (Earth), `UXS-006.md` (Moon/Mars), the Venus UXS if one exists (not checked), `UXS-014.md`.
- `docs/uxs/IA.md` §nav-groups (the Explore and Worlds groups cross-link), §url-structure (`/explore?id=` as the return deep link), §controls.
- `docs/uxs/CHANGE-INVENTORY.md` row C9 (line 50: D5 recorded).
- `docs/adr/TA.md` (HUD / Worlds paragraph), READMEs: `src/lib/explore/README.md` (`world-links.ts`), `src/lib/components/README.md` (`PlanetPanel`, `SatellitePanel`), `src/lib/surface-scene/README.md` (the chip), `src/routes/explore/README.md`.
- Header comments: `PlanetPanel.svelte` (the hard-coded earth/mars condition), `earth/+page.svelte:139`.

## 10. Phased plan

1. **C9a table + Explore side:** `world-links.ts` and its test (red first), the two panel chips (Venus added), the entity-page link (Decision 4); keys; e2e part 1 first half.
2. **C9b Worlds side:** the chip at the head of the view row and the mobile cluster; `footer-dock.spec.ts` parts; e2e round trip.
3. (If Decision 1(b)) **C9c** the near-zoom suggestion chip on `/explore`.
4. Docs, UXD-027, `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage` (a new pure `src/lib` module).

## 11. Acceptance checks

- Four bodies, eight links: from each of Earth, Mars, Venus (planet panel) and the Moon (satellite panel) a chip opens the world page; from each world page a chip opens `/explore?id=<body>` with the body's panel open and the body focused.
- No other Explore panel shows the chip; each panel row has at most three host chips.
- In `de`, `ru`, `ar`, `hi` the chip text fits its row (wraps inside the chip, per `PanelActions` CSS) and does not collide with the Worlds' HUD row at 1280×720 and 390×844.
- `world-links.test.ts` green; the three projects' e2e green; no use of `panel_action_surface` left if Decision 2(a/b).
- Docs of §9 updated; the inventory row C9 states what was built and not run in a browser.

## 12. Decisions for the operator (recommendation first)

1. **D5: how Explore and the world pages connect.** **(a) An explicit link both ways, no automatic switch** (recommended: the two views have different cameras, data and state; a link keeps history and the Explore level; both links are small); (b) the link both ways plus a "Open the world view" suggestion chip that appears when the camera is at its closest to Earth, Mars, the Moon or Venus (a nudge, never a navigation); (c) an automatic switch to the world page when zooming into the body (needs a threshold, a transition and a way back to the same Explore state; not specified here and not recommended).
2. **The chip's wording.** **(a) "Go to Mars" on Explore and "Back to Explore" on the world page, `{name}` filled from the nav's body names** (recommended: the plan's own words; Slavic, Arabic, Hindi and CJK locales need the preposition/case handled per body, 56 short strings, by hand); (b) name-free wording on both sides ("Open the world view" / "Back to the solar system"): no declension problem, one string each (2 keys × 14 locales); (c) keep today's "Explore surface" on Explore (key already in 14 locales) and add only the "Back to Explore" key.
3. **Venus on the Explore side now.** **(a) Yes: the Venus panel gets the chip with the rest** (recommended: `/venus` exists and the plan row names Venus; its galleries improve in D3 but the page works); (b) wait for D3 (Venus galleries) so the link does not lead to a thin page.
4. **The body entity page `/explore/<id>`.** **(a) Add the same link to the four bodies' pages** (recommended: it is the crawlable twin of the panel, and the INDEX's ↗ lands there); (b) panels and world pages only (the entity page stays text-only for now).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. That `/explore?id=moon` and `?id=venus` open and focus the right panel is read from `explore-url-sync.svelte.ts:70-92` and `body-ref.ts:38-56`, not run; whether `select-focus.spec.ts`/`explore-deeplinks.spec.ts` already cover those two ids was not checked.
- NV2 `explore-scene-host.ts` camera-distance code was not read for a minimum distance per planet; the near-zoom nudge (Decision 1b) is an estimate of cost, and whether the camera can reach a distance where a threshold is meaningful was not checked.
- NV3 Whether the Worlds' `hud-controls` row (`SurfaceScene.svelte:5729-5737`, `surfaceControls` snippet at `:5636`) is the right home for a link chip at 1280×720 with a site panel open (`hud-beside-panel`), the interaction with `locateReservePx` and the C4 bottom-left column, and whether the row is hidden by `flat-hidden`/panorama states in a way that strands the user, were not traced.
- NV4 The Worlds' `SurfaceScene` has no visible title; whether "Back to Explore" needs the body name to be understood was not tested with a reader; the wording is Decision 2.
- NV5 `static/data/glossary/native-terms.json` and the 14 locales' `nav_earth/nav_moon/nav_mars/nav_venus` forms and their case behaviour in "go to" phrases were not opened.
- NV6 The `/explore/<id>` page's layout (`routes/explore/[id]/+page.svelte`) was grepped only for links, not read; where the chip would sit was not designed.
- NV7 `UXS-000` §Open and the Venus UXS (if any) were not opened; TA.md's Worlds paragraph line numbers were not read.
- NV8 Whether an Explore panel's chip count would exceed the UXD-018 limit when a body has Plan, the new chip and a third (`Fly`) was checked only for `PlanetPanel` (Plan + surface link + Share = 3 at the limit).
