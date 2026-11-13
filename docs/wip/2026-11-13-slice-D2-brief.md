# Slice D2 brief — panel order for sites and orbiters: a DETAIL tab with the spacecraft for orbiters, a photo first, "Stand here" facing the photograph (W6, WM1)

Read-only brief, written at HEAD `df38554fe07` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, six read-only node scripts over `static/data/` and `src/lib/*.json` (written with the Write tool into the session scratchpad as `dbr-*.mjs`, not in the repo; their output is quoted below), and eleven images opened by eye (hero thumbs and one panorama). Nothing was built or run in a browser. No code was changed. The slice has no open operator question in the plan, but **half of it is already built**: §0 point 3. Respects the standing rule "Explore heroes consistent": no hero image is changed here (the hero of a Worlds panel is the first gallery image; nothing in this slice reorders or swaps one).

## 0. Answer first

1. **WM1 is real and mislabelled, not missing data.** All 19 Moon and Mars orbiters have a story file that is literally `null` (checked: `static/data/site-stories/<id>.json` for the 19 orbiter ids), so no orbiter has a story. Twelve of them still get a tab called **STORY** (`build-panel-tabs.ts:34-38`, `visible: hasStory || hasLanding`) because `siteAnatomy` finds the craft's cutaway; the tab then draws it under the heading **"On the surface"** (`SiteLandingPanel.svelte:110`, key `programs_on_surface`), for a craft that never touched a surface. That is the operator's "story panel and surface section show its cutaway".
2. **Recommendation:** for an orbiter site (`kind: 'orbiter'`) the tab is **DETAIL** (existing key `panel_tab_detail`, in 14 locales, already the fleet panel's tab word) and the section heading is **"The spacecraft"** (one new key). Landers keep STORY and "On the surface". The same tab appears for the 9 Earth objects that have a cutaway (Decision 5).
3. **W6 is already built, untested, and possibly incomplete.** UXD-007 asks for a per-site opening heading for "Stand here"; `SurfaceScene.svelte:3007-3017` already opens at `panorama_metadata.entry_yaw_deg` (set by `scripts/hotspots/panorama-entry-yaw.mjs`, shipped in v0.9.5), and **13 of the 30 panoramas carry one** (apollo12, 14, 15, 16, 17, opportunity, luna9, luna17, change5, change6, zhurong, chandrayaan3, slim; `grep -c entry_yaw_deg` on the file returns 13). No test asserts the opening heading (`git grep entry_yaw -- tests src/lib/*.test.ts` finds none), and the operator still hit padding on 2026-11-11. This slice audits the 30, fixes the sites where the yaw is wrong or missing, and adds the test UXD-007 promised.
4. **"A photo first" is already true for the Moon and Mars panels:** the hero is the first gallery image, above the tabs, on every site that has a gallery, and all 28 Moon and 27 Mars sites do (the L45 thumb manifest resolves 28 of 28 and 27 of 27 through the same ladder). The three Venus sites are the exception: D3. The remaining "photo first" work is a guard test, plus a list of heroes that are not photographs (§2.4) for the operator to look at.
5. **Cheap bonus found while reading:** five orbiters have a drawing in the fleet set (`clementine`, `mars3-orbiter`, `viking1-orbiter`, `maven`, `hope`) but their panel shows none: two are dropped by the `STAYED_IN_ORBIT` regex that exists to keep orbiters out of *lander* panels, three have no `fleet_refs` on their site row. §4.3.
6. **Needs the operator before code:** nothing blocks; 4 forks in §12 (4 to 7).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 274 and 279, the clarification at 456-459; slice row 366)

| ID | Text | State at HEAD |
|---|---|---|
| W6 | "'Stand here' must always show an image; sometimes graphics show and one must hunt for an image." Clarified (plan line 456): "inside the panorama the view opens facing the generated fill that pads a partial panorama, and the operator has to rotate to find the real photo." Decided as UXD-007 (accepted 2026-11-11). | An entry yaw exists for 13 of 30 sites (§2.3); no test; coverage of the other 17 not checked by eye. |
| WM1 | "Lunar Prospector (orbiter): story panel and surface section show its cutaway. Stories exist only for landing sites; for orbiters on Worlds (Moon, Mars, Earth, Venus) show the cutaway differently — rename the tab 'Details'? A solution for all orbiters." | §2.1. |

Done when (plan row 366): "shots of 3 landers, 3 orbiters". UXD-007's own consequence list adds: an e2e asserting the initial view centre is inside the photo span.
Plan wording that is outdated: the row's "a photo first on every site" (true already, §0.4); "per-site initial heading" as new work (built in v0.9.5); "Details" (the existing key reads DETAIL, in `de` DETAILS).

## 2. Current state (file:line at `df38554fe07`)

### 2.1 The orbiter panel today

| Piece | Where | Result for an orbiter |
|---|---|---|
| Tabs | `buildSurfacePanelTabs` (`build-panel-tabs.ts:16-46`) called at `SurfaceScene.svelte:6396-6402` with `hasStory: !!panelStory`, `hasLanding: panelAnatomy.length > 0 \|\| !!panelSequence` | OVERVIEW, GALLERY, **STORY** (when anatomy), LEARN |
| Story data | `loadPanelData` (`load-panel-data.ts`) → `getSiteStory` | `null` for all 19 orbiters |
| Anatomy | `siteAnatomy(site)` (`site-anatomy.ts:38-56`): site `fleet_refs` minus `STAYED_IN_ORBIT = /(^|-)orbiter($|-)\|orbiter$\|^apollo-csm\|^orion$/`, those with a drawing | see table below |
| STORY body | `SurfaceScene.svelte:6681-6715` → `SiteLandingPanel` (`part="main"`): "How it landed" sheet if any, then **"On the surface"** + the craft's anatomy drawing + a fleet link; the exploded cutaway after it | an orbiter gets "On the surface" |
| Auto-promote | `story-autopromote.ts` and `:1357-1368`: OVERVIEW → STORY when a tier-2 patch loads and a story exists | orbiters have no tier 2: never fires |
| Panel order | header, `PanelActions` row, hero (`PanelHeroImage`, first gallery image), tab row, tab body (`:6317-6406`) | as for sites |

Orbiter table (script `dbr-orb2.mjs`, 19 orbiters):

| Moon | anatomy shown at HEAD | | Mars | anatomy shown at HEAD |
|---|---|---|---|---|
| luna10 | luna10 | | mariner9 | mariner-9 |
| clementine | **none** (drawing `clementine` exists; site has no `fleet_refs`) | | mars3-orbiter | **none** (drawing `mars3-orbiter` exists; dropped by the regex) |
| lunar-prospector | lunar-prospector | | viking1-orbiter | **none** (drawing exists; dropped by the regex) |
| smart-1 | smart-1 | | mars-odyssey | mars-odyssey |
| change1 | change1 | | mars-express | mars-express |
| chandrayaan1 | chandrayaan1 | | mro | mro |
| lro | lro | | maven | **none** (drawing `maven` exists; no `fleet_refs`) |
| change2 | change-2 | | mangalyaan | mangalyaan |
| | | | tgo, tianwen1-orbiter | none (no drawing) |
| | | | hope | **none** (drawing `hope` exists; no `fleet_refs`) |

So 12 orbiters show the cutaway under STORY, 5 have a drawing that is not shown, 2 have no drawing at all. Exploded cutaways (`anatomy-exploded-ids.json`) were not counted per orbiter (NV2).

### 2.2 Earth objects

`EarthObjectPanel.svelte:220-224` has OVERVIEW, GALLERY, LEARN only; it shows no anatomy at all. Of the 31 objects 24 have `fleet_refs` and 9 have a drawing (script `dbr-earth.mjs`): `iss`, `tiangong`, `hubble`, `chandra`, `xmm`, `clementine`, `change2`, `jwst`, `gaia`. There is no Venus orbiter. "A solution for all orbiters" (WM1) therefore reaches Earth only if Decision 5 says so.

### 2.3 "Stand here" (W6, UXD-007)

- `enterPanorama` (`SurfaceScene.svelte:2944-3020`): with no `?yaw=` the camera opens at the horizon (`camP = π/2`) and `camT = entry_yaw_deg` (default 0 = texture u 0.75, which is padding on a photograph that sits at the left of a padded canvas).
- The data: `surface-hotspots.json` has 30 entries with `hotspot_tier3_panorama` (script `dbr-pano.mjs`). `entry_yaw_deg` is present on apollo12 (100), apollo14 (155), apollo15 (180), apollo16 (135), apollo17 (131), opportunity (76), luna9 (240), luna17 (150), change5 (173), change6 (176), zhurong (210), chandrayaan3 (245), slim (245); absent on apollo11, viking1-lander, viking2-lander, mars-pathfinder, spirit, curiosity, perseverance, phoenix, insight, change3, change4 and the six Earth pads (vandenberg-slc-4e, baikonur-1-5, baikonur-31-6, jiuquan-slc-43, wenchang-lc-101, sriharikota-slp).
- The field is documented "set only on partial panoramas" (`surface-site.ts:280-287`), and `real_extent_pct_vertical` (`:258`) is a *vertical* share. Apollo 11 (25 %), Curiosity (57), Perseverance (63), Change'4 (40) and four Earth pads (23 to 37) are vertical partials without a yaw. I opened Apollo 11's panorama: a full-width 360° band of photograph with the horizon at 37 % of the height and padding above and below; at pitch 0 the view is on the photograph, so a missing yaw is right for a vertical partial. Whether the other eight are full-width, and whether every no-yaw site is really a full 360°, **was not checked** (NV3); the script's own README warns the finder is fooled on small-coverage pads (SLIM, Zhurong, set by hand).
- Panorama sets and `?pano=` entries swap the texture after opening (`:2976-2978`); the yaw is read once from the site, so a set entry with a different photo span opens at the first entry's yaw (no site has a set today: `panorama_set` count 0 in the output).

### 2.4 Heroes that are not photographs of the thing (for the operator's eye, not a defect list)

The panel hero is the first gallery image after the blessed-slot override (`getMoonSiteGallery` / `getMarsSiteGallery`, `data/galleries.ts:161-194`, `243-276`). The thumb manifest (`entity-thumbs.json` `sites`) names each site's blessed slot. Read by eye: Opportunity `missions/opportunity/06` is an artist's render of the rover on Mars; Lunar Prospector `missions/lunar-prospector/01` and SMART-1 `missions/smart-1/01` are computer renders; Luna 16, 21, 24, Chang'e 7, Artemis IV, Beresheet, Chang'e 2, Zhurong and Mars 3 orbiter slots were not looked at (the vision labels in `image-vision.json` are unreliable: they called Chang'e 1's and Mars 3's museum-model photos a diagram and "low-resolution", and Vega 1's hardware photo an "ESA Vega rocket", so none of them is used as evidence). No hero is changed in this slice; the list goes to the operator through the shots (§3).

### 2.5 Tests that touch the area

`build-panel-tabs.test.ts` (the tab flags), `site-anatomy.test.ts`, `mars-story-tab.spec.ts` (STORY tab on Curiosity), `mars-tier3-panorama*.spec.ts` (3), `moon-tier2.spec.ts`, `hotspots.spec.ts`. None asserts an orbiter's tabs, the section heading, or the opening yaw.

## 3. Screenshot list (before and after; no browser was used for this brief)

Desktop 1440×900, phone 390×844, landscape 844×390, `en-US`, plus `de`, `ru`, `ar`, `hi` for the tab word and heading length:
1. Three orbiters, panel open on the tab: `/moon?site=lunar-prospector`, `?site=lro`, `/mars?site=mro`; before (STORY / "On the surface") and after (DETAIL / "The spacecraft").
2. The five orbiters that gain a drawing: Clementine, Mars 3 orbiter, Viking 1 orbiter, MAVEN, Hope (before: no tab; after: DETAIL).
3. Three landers, unchanged control: `/moon?site=apollo11`, `/mars?site=curiosity`, `/venus?site=venera-13` (hero first; STORY).
4. "Stand here" first frame for every one of the 30 panoramas (a contact sheet): before/after of any yaw changed, desktop only; the photo span drawn over the first frame.
5. `/earth?object=hubble` and `?object=iss` after Decision 5 (a).
6. The orbiter panel's hero next to the heroes in §2.4 (side by side, standing rule): Lunar Prospector, SMART-1, Opportunity.

## 4. Proposal

### 4.1 The tab and the heading

`buildSurfacePanelTabs` gains `kind`: `'site' | 'orbiter'`. For `'orbiter'` the story entry becomes `{ id: 'details', label: m.panel_tab_detail(), visible: hasLanding, testid: 'panel-tab-details' }`; `PanelTab` (`panel-tabs.ts:9`) gets `'details'`. The body (`SurfaceScene.svelte:6681`) renders `SiteLandingPanel` with a `kind` prop; for orbiters it draws **no** "How it landed" sheet (none exists: `landing-sequence-ids.json` has no orbiter), a heading **"The spacecraft"** (new key `site_spacecraft_heading`) over the craft's anatomy drawing and, when it has one, its exploded cutaway, each linking to its fleet entry as today. The cutaway is *not* repeated in OVERVIEW. `story-autopromote` is untouched (no orbiter has a tier 2). Deep links that carry a tab (`?tab=story` if any: NV4) map `story` to `details` for orbiters.

### 4.2 Panel order, one rule for every site and orbiter

Header, action row, hero (first gallery image), tabs, body: unchanged and written into the Design System as the rule (§9). The hero stays below the action row (B1 decided it; Decision 7). A guard test asserts that every Moon, Mars and Venus site that has a gallery renders the hero before the tab row.

### 4.3 Orbiter drawings that are not shown

`siteAnatomy` skips the `STAYED_IN_ORBIT` filter when the site's own `kind` is `'orbiter'` (the filter exists so a lander's panel omits the craft that stayed in orbit: `site-anatomy.ts:11-14`), which gives Mars 3 orbiter and Viking 1 orbiter their drawing. For an orbiter whose site row has no `fleet_refs` but whose id is a drawing id (Clementine, MAVEN, Hope) it falls back to the site id: no data change. Adding the `fleet_refs` rows instead would need the symmetric `linked_sites` on each fleet entry (ADR-052, fail-closed validator): more edits, same result; not recommended. TGO and Tianwen-1 orbiter keep no tab.

### 4.4 "Stand here" opens on the photograph

1. Audit first: run `scripts/hotspots/panorama-entry-yaw.mjs` without `--write` over the 30, read its output against the 30 first frames (§3.4), and record which sites need a yaw, which a different yaw, and which are full 360°.
2. Write the photograph's horizontal span next to the yaw so a test can check it: `panorama_metadata.photo_span_deg: [from, to]` (yaw degrees, optional, set by the same script for partial panoramas; schema `surface-site.ts:240-289` and the JSON schema if one lists the fields: NV5).
3. Fix the data where the audit says so (a data change: `static/data/surface-hotspots.json`; the script README says "re-run after any re-pad").
4. For a partial panorama's vertical offset (Apollo 11 style bands): keep pitch 0 unless the audit shows the band is off the horizon.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on D2 |
|---|---|
| B1 (UXD-018) | The panel is header, action row, hero, tabs; D2 keeps it and does not move the hero. |
| B2 (UXD-022) | The Learn tab's science links are untouched. |
| L45-T4 | The fleet link under the drawing is the same `fleet-link`; `EntityThumb` is not used in the panel. |
| C6/C6-F | The INDEX meta line ends "In orbit"; the panel's tab word is a different surface. |
| C9 | Its Explore to Worlds link opens these panels; nothing to change. |
| D1 | Selected orbiters now stay visible with the panel open: the shots of §3.1 are taken after D1 so the orbiter and the tab can be seen together. |
| D3 | Venus gets its gallery; its hero joins "photo first". Build D3 before the D2 guard test or the guard lists Venus as an exception. |
| UXD-007 | D2 is the slice UXD-007 names; update its Verification section (the e2e). |

Plan ideas now outdated: "rename the tab 'Details'" (the key is DETAIL); "orbiters get a Details tab with 'The spacecraft' cutaway, not 'On the surface'" stands; "per-site initial heading" as new work (built).

## 6. i18n impact (14 locales, glossary first)

- **New keys: 1.** `site_spacecraft_heading` ("The spacecraft"): hand-translated in 14 locales from the glossary's "spacecraft" term (`static/data/glossary/native-terms.json`, not opened: NV6); no paid run (`no-paid-translation-runs`).
- Reused: `panel_tab_detail` (14 locales, already `DETAILS` in `de`), `plan_view_in_fleet`, `fleet_anatomy_*`.
- `programs_on_surface` stays (landers and `/programs/<id>` use it).
- If Decision 5 (a): no further key.
- Numbers or facts in text: none (the heading carries none).

## 7. Data changes

- `static/data/surface-hotspots.json`: `entry_yaw_deg` added or corrected for the sites the audit names (count unknown until the audit); `photo_span_deg` on every partial panorama. Provenance rows are unchanged (no image changes).
- None for the orbiter tab (§4.3 uses code, not data).
- No image file is added, replaced or reordered.

## 8. Tests to add or change

**Unit (vitest):**
- `build-panel-tabs.test.ts`: orbiter kind gives `details`, hides `story`, shows only with `hasLanding`; site kind unchanged.
- `site-anatomy.test.ts`: an orbiter site keeps `mars3-orbiter` and `viking1-orbiter`; id fallback for `clementine`, `maven`, `hope`; a lander still drops `apollo-csm`, `orion` and `*-orbiter`.
- New `panorama-entry.data.test.ts`: for every entry with a panorama: a `photo_span_deg` when partial; `entry_yaw_deg` inside it; no yaw on a full panorama.
- A data test that every orbiter site with a drawing shows one (the 12 + 5 above), and that none of the 19 has a story (so a future story would turn the tab back).

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `surface-orbiter-details.spec.ts`: `/moon?site=lunar-prospector`, `?site=lro`, `/mars?site=mro`, `?site=maven`: tab text is DETAIL (not STORY), the heading is "The spacecraft", no "On the surface" in the panel; `/moon?site=apollo11` still STORY.
2. New `panorama-entry.spec.ts`: for each partial panorama (list from the data test): enter "Stand here", read the camera yaw through the existing `?yaw=` serialisation or the panorama URL sync (`panorama-url-sync.ts`), assert it is inside `photo_span_deg`; deep link `?yaw=` still wins.
3. `mars-story-tab.spec.ts`, the three `mars-tier3-panorama*.spec.ts`, `moon-tier2.spec.ts`: unchanged, must pass.
4. Hero-first guard in `surface-index.spec.ts` or a new `surface-panel-order.spec.ts`: on `/moon`, `/mars`, `/venus` the hero `img` precedes the tab row for every site with a gallery.
5. `a11y.spec.ts` + `a11y-rtl-probe.spec.ts`: 0 serious with the DETAIL tab open in `ar`.
6. `footer-dock.spec.ts`: unchanged.

## 9. Docs to update by name

- **UXD-029** (new, `docs/uxs/decisions/UXD-029-worlds-orbiter-detail-tab.md`; next free at build time): the DETAIL tab, the heading, the five newly shown drawings, the audit result; row in `docs/uxs/decisions/README.md`; row D2 in `CHANGE-INVENTORY.md` (line 64).
- **UXD-007** `Verification` section: the e2e written (it says "Planned, not written") and the audit table; its "Consequences" line about "a photo first on every site" gets the §0.4 note.
- `docs/concept/05_Design_System.md` §5.3 (panel order for a surface site and an orbiter; the orbiter's DETAIL tab), §6.6.
- `docs/uxs/UXS-006.md` (the panel spec: tabs for a lander and an orbiter, "Stand here" opening), `UXS-005.md` (Earth objects after Decision 5), `docs/uxs/IA.md` §controls or the panel row.
- `docs/adr/TA.md` (Worlds paragraph and the panorama paragraph), `docs/adr/ADR-074.md` (panorama sidecar fields: `photo_span_deg`).
- READMEs: `src/lib/surface-scene/README.md` (`SiteLandingPanel`, `site-anatomy.ts`, the tab builder), `src/lib/surface-map/` if it has one, `scripts/hotspots/README.md` (the yaw script now writes the span), `src/lib/components/README.md` if `PanelTabRow` usage is listed.
- Header comments: `build-panel-tabs.ts`, `site-anatomy.ts` (`STAYED_IN_ORBIT` applies to landers only).

## 10. Phased plan

1. **D2a audit:** run the yaw script dry, contact sheet of 30 first frames, the table of what to fix (no code).
2. **D2b data + test:** `photo_span_deg`, yaw fixes, `panorama-entry.data.test.ts` red first, `panorama-entry.spec.ts`.
3. **D2c orbiter tab:** `buildSurfacePanelTabs` kind, `site-anatomy` rule, `SiteLandingPanel` heading, key in 14 locales, unit and e2e.
4. **D2d Earth objects** (if Decision 5 (a)): the same tab in `EarthObjectPanel`.
5. Docs of §9, `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage`.

## 11. Acceptance checks

- Every orbiter with a drawing shows DETAIL with "The spacecraft" and no STORY or "On the surface" (unit + e2e; 17 of 19, TGO and Tianwen-1 orbiter without).
- Landers unchanged: STORY and "On the surface".
- For all 30 panoramas the first frame is on the photograph or the panorama is a full 360° (e2e from the data span).
- Hero before tabs on every Moon, Mars and Venus site with a gallery; no hero image changed (diff of `*-hero-overrides.json` and `static/images` is empty).
- The new key exists in 14 locales; `validate-data` green.
- Docs of §9 updated; the inventory row D2 states what was built and not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the four D briefs)

4. **The orbiter tab.** **(a) DETAIL (the existing key; "DETAILS" in `de`) on every orbiter panel that has a drawing, STORY kept for landers** (recommended: the word is already the fleet panel's; no new tab key; the plan's "Details" is this key); (b) ANATOMY (`panel_tab_anatomy`, the station panels' word) for orbiters; (c) keep STORY and only fix the heading to "The spacecraft".
5. **Earth objects.** **(a) Give the 9 Earth objects that have a drawing the same DETAIL tab** (recommended: WM1 asks for "a solution for all orbiters" and Earth's panel shows no anatomy today; small, same component); (b) Moon and Mars orbiters only now, Earth later.
6. **Orbiters with a drawing the panel hides.** **(a) Show them: drop the lander-only filter for orbiter sites and fall back to the site id (Clementine, Mars 3 orbiter, Viking 1 orbiter, MAVEN, Hope)** (recommended: no data change, no new image); (b) leave them out and fix only the label; (c) also add the missing `fleet_refs` and `linked_sites` rows (more edits under the symmetric validator, same result).
7. **Where the photo goes.** **(a) Keep the hero below the action row as B1 decided; "a photo first" means the hero is the first image and "Stand here" opens on the photograph** (recommended: nothing in the plan or UXD-018 says the hero should move above the actions, and the hero images themselves stay as blessed); (b) move the hero above the action row on the Worlds' panels (would differ from every Explore panel); (c) also replace the render heroes in §2.4 where a photograph exists (needs a side-by-side per site and the image runbook; not in this slice's scope unless you say so).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. All tab, heading and yaw claims are from reading code and data files.
- NV2 The exploded-cutaway coverage per orbiter (`anatomy-exploded-ids.json`) was not counted; whether the orbiter drawings look right under "The spacecraft" (aspect, size) was not looked at.
- NV3 For the 17 panoramas without a yaw I looked at one (Apollo 11). Whether each of the other 16 is a full 360° or a horizontal partial that the finder missed was not checked; the Earth pads' 23 to 37 % vertical coverage and the Mars sites' band position vs the horizon were not looked at. The 13 yaws are counted by script and by `grep -c`.
- NV4 Whether a URL parameter selects a panel tab (so `story` would need a map to `details`) was not searched.
- NV5 Whether a JSON schema in `static/data/schemas/` enumerates `panorama_metadata` fields (so `photo_span_deg` needs an entry) was not checked.
- NV6 `static/data/glossary/native-terms.json` was not opened; whether "spacecraft" has a bound form in all 14 locales is unknown.
- NV7 The hero images of Luna 16, 21, 24, Chang'e 7, Artemis IV, Beresheet, Chang'e 2, Zhurong and Mars 3 orbiter were not looked at; the image-vision labels were shown unreliable on three images.
- NV8 Whether the `?yaw=` deep link and the panorama URL sync read the opening yaw back correctly after the audit's changes (so the e2e can read it from the URL) was not traced beyond `panorama-url-sync.ts` existing.
- NV9 TA.md, ADR-074, UXS-006 and the Design System §5.3 text were read only for the lines quoted; whether another sentence names the STORY tab for orbiters was not searched (`git grep -n "STORY" docs/uxs docs/adr/TA.md` is the first step of the build).
