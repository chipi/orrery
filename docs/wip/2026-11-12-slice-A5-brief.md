# Slice A5 brief — one flat row of layer chips on every world and on Explore (C2, W7)

Brief, now BUILT (2026-11-12 pm: corrections in §0b, built-state notes inline; the original text is kept where it still holds). First version written at HEAD `81e0d43c0dd` with two proposals (groups ON GROUND / IN SPACE on every world, or a flat Earth). **Rewritten 2026-11-12 at HEAD
`50b3e962a8d` after the operator's decisions (§0a): the group proposal is superseded and removed.** Baseline for the new check: `a5-check.py` in the session scratchpad
(`/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/a4proto/`, output `a5-out.txt`), **75 violations**; the older baseline file
`2026-11-12-slice-A5-baseline-hits.txt` (30 hits against the group proposal) is obsolete. Method: `git grep`, a Python scan from the repo root and `json` reads of `messages/*.json`
and `scripts/i18n-tools/native-terms.json`; every `file:line` below was read at `50b3e962a8d`. No browser, no build, no test run: every width, height and position is arithmetic from CSS and
message strings, not a measurement (§13, NOT VERIFIED).

## 0. The point list

| ID | Operator text (plan lines 69, 272, 331, 408) | State at HEAD |
|---|---|---|
| C2 | Earth groups chips in 2 sections; the current solution is not good. | `/earth` only: two full-row header buttons ON EARTH / IN SPACE inside a vertical column (`LayerChipRow.svelte:50–66`, `:83–129`; config `SurfaceScene.svelte:5445–5614`) |
| W7 | Earth groups chips in 2 groups (on Earth / in space); other worlds don't; make it consistent. | `/moon`, `/mars`, `/venus` render a flat list (`earthGroups` false, `SurfaceScene.svelte:5449`, `:5470`, `:5472`) |
| Plan row A5 | "Q5: group every world (On ground / In space) or flatten Earth"; done when "Earth column no longer collides with the ruler at 768 px high" | **decided: flatten everything (§0a); the done-when is rewritten in §12** |

## 0a. Decisions (operator 2026-11-12) and the cascade

Recorded in `docs/wip/2026-11-11-ux-feedback-plan.md` ("A4/A5 follow-up", "A3–A6 answers", "A5 last two").

| # | Decision | Consequence in this brief |
|---|---|---|
| D1 | **Every world (Earth, Moon, Mars, Venus) and Explore: ONE FLAT horizontal row of layer chips.** No group captions, no "ON GROUND / IN SPACE" text, no separators | §3: the whole group design (caption, hairline, `ChipGroup` captions, per-group wrap) is deleted from the proposal |
| D2 | **Earth's two master switches (ON EARTH, IN SPACE) are dropped** | §3.2: the `layerGround` state, the master-ORBITERS-with-sub-chips design and the greying go; the Earth ORBITERS chip stays as one plain chip (§0b) |
| D3 | **Superseded 2026-11-12 pm (§0b): Earth has ONE ORBITERS chip; the ground telescopes chip is OBSERVATORIES; there is no SPACE TELESCOPES chip.** `observatory` goes into `scripts/i18n-tools/native-terms.json` first (13 locales, the site's existing forms), then ONE new message key in all 14 locales with a per-locale check | §9 |
| D4 | The chip itself is A4's option A (30 / 44 px, 4 px, 11 px uppercase, outline at rest, soft blue fill + blue edge + white text when on; per-world tint on the Worlds only) | A5 defines no chip look |
| D5 | A3 final tokens are in `tokens.css:9–20` | §0a cascade below |

**Cascade.**
- **A3 (landed):** `--color-accent` `#5070ff`, `-soft`, `-edge`, `-strong`, `--color-state` `#889fe7`, `--color-focus`, white text on a soft fill, dark text only on a solid fill. The Earth group master's dot and
  its 1 px focus ring (`LayerChipRow.svelte:112–131`, `border: 1px solid var(--body-tint, var(--color-accent))`) are deleted with the master, so no pre-A3 leftover needs a separate fix.
- **A4 (built; see §0b.2):** the chip is `Chip kind="toggle"` in `.ui-chip` (`src/lib/styles/chip.css`, `--color-chip-*` tokens); the Worlds set `--chip-tint` from their `--body-tint` (Moon grey, Mars red, Venus amber), Earth and Explore use the accent. A5 only decides which chips are in the row, their order, the row's layout and how it clears neighbours. `ChipGroup` is not used by the layer row (no captions, no groups); it stays for `choice` radiogroups. A4's `a4-keep` markers on the `.ctrl-row.chips` rules were rewritten by A5, not kept.
- **A6 (briefed):** the nav height decision (52 px, `--nav-height`) moves every HUD top by −8 px. A5's row anchors on `calc(var(--nav-height) + Npx)` only (no literal 60 / 64 fallbacks): `SurfaceScene.svelte:8116, 8158` and `HudControls.svelte:645, 825` carry
  `var(--nav-height, 60px/64px)` fallbacks that A6 deletes (A6 check N6); A5 must not re-add one.
- **Explore (D1):** the five Explore chips and the four Worlds rows are the same component in the same place; Explore never had groups.


## 0b. Corrections and what was built (operator 2026-11-12, after this brief; this section wins over any older text below)

Source: `docs/wip/2026-11-11-ux-feedback-plan.md`, "A4–A6 open items" and "L20 / L25 / L28 and the A–Z".

1. **Earth's row is SURFACE · AUTO, LAUNCHPADS, MUSEUMS, OBSERVATORIES, ORBITERS (5 chips).** ONE ORBITERS chip (like Moon, Mars, Venus) switches every orbiter at once: stations, space telescopes, constellations, comsats and the Moon orbiters. The four Earth category chips (STATIONS, space TELESCOPES, CONSTELLATIONS, COMSATS) and both masters are gone, with `layerStations/Observatories/Constellations/Comsats`, `satellites.categoryDefaultVisible` (type and config) and the per-category branch of the satellite visibility loop. There is NO "SPACE TELESCOPES" chip and NO `observatory_layer_chip_space` key. O1 (§10) is closed by this: the Moon orbiters ride the one ORBITERS chip.
2. **A4 is built**, not briefed: `Chip` (`kind` toggle | choice | action | link), `ChipGroup`, `src/lib/styles/chip.css` with the `--color-chip-*` tokens, `--chip-tint` set on `.surface-scene` for every world except Earth, 30 px fine / 44 px coarse on both axes, [UXD-014](../uxs/decisions/UXD-014-one-chip-and-filter.md). A5 rewrote the `a4-keep` markers on the `.ctrl-row.chips` column / drawer / short-window rules in `HudControls.svelte` (and the `LayerChipRow` group machinery) instead of keeping them.
3. **The INDEX absorbs the A–Z** (operator: "basically we absorb A–Z into index"). On `/moon /mars /venus /explore` each INDEX row whose object has an entity page carries a real `<a href>` (`localHref`, the links come from the existing `getEntityIndex` server load, passed as `entityLinks`); the floating A–Z tab (`EntityIndex floating`) is removed and the `floating` variant deleted from `EntityIndex.svelte`; `/missions` and `/fleet` keep the A–Z at the page foot. ADR-096 item 11 is amended.
   - **Approach taken and why.** `SurfaceIndexPanel` / `ExploreBodyIndex` are always rendered when the route has entity links, with `hidden` while the INDEX is closed (`.surface-index-desktop[hidden]`, `.body-index[hidden]` beat the panels' `display` rules). Before the sites load (the prerender, and the first client frames) the panel's list IS the plain list of every entity page from the server load; after the sites load, each row carries its link and the pages with no row (Explore's moons) follow as link rows. One visible index, real links, nothing duplicated, and the prerendered HTML still links every page of the hub (crawlers do not click). Rejected: a hidden `EntityIndex` list inside the panel element (a second list that drifts from the rows), and rendering the links only on click (breaks ADR-096 item 11).
   - Stars in `/explore`'s neighbourhood index (`StarIndex`) have no entity pages (`bodyRoutes()` in `scripts/site-routes.mjs` is planets, satellites and small bodies), so they carry no links.
   - Row links are a trailing `↗` anchor (new key `surface_index_open_page`, 14 locales), in the roving list (`itemSelector` covers row buttons and links).
4. **Ruler and index clearances (built):** the chip-driven ruler shift is deleted (the locate branch and footer lift stay); Explore's `--ruler-top-clear` is 150 px and the short-window `--ruler-left: 196px` clause is gone; the object-index panel starts at `var(--index-top, 152px)`, where `--index-top` is the measured bottom of `.hud-controls` + 8 px (a ResizeObserver in `SurfaceScene`); the row's `max-width` stops before an open detail panel through `.hud-controls.beside-panel` (the `--surface-panel-open` variable of §3.4 was not needed: `panelOpen` already drives `.beside-panel`).
5. **Glossary:** `observatory` is a `term` entry with `_en` limited to `ground / ground-based / radio / optical observatory` (case-sensitive), because the corpus uses "observatory" for space observatories in prose and the plain pattern flagged 148 fields that are right as they are; its one-sentence definition is in `i18n-src/<loc>/glossary/terms.json` (14 locales). The baseline `ui-label-baseline.json` lost the `stations` / `constellations` variant notes of the removed labels.
6. **Message keys:** added `earth_layer_chip_observatories`, `surface_index_open_page`; renamed `earth_layer_group_space_tip` → `earth_layer_tip_orbiters` (same text, now the Earth ORBITERS tooltip); removed `observatory_layer_chip`, `earth_layer_group_ground`, `_space`, `_ground_tip`, `ui_layer_stations`, `ui_layer_constellations`, `ui_layer_comsats`, `earth_layer_tip_habitats`, `_nav`, `_geo`, `_telescopes`, `entity_index_moon`, `_mars`, `_venus`, `_explore` (14 locales each). `observatory_layer_tip` stays (the OBSERVATORIES tooltip).

### Adjacent items that serve the same idea (fold in, or leave)
| Item | Where | Decision | Reason |
|---|---|---|---|
| Chip-driven ruler shift (publishes `--ruler-left` when the chip column reaches the ruler) | `SurfaceScene.svelte:1163–1213`, chip loop `:1186–1197` | **FOLD IN: delete the chip part** | exists only because of the tall column (comment `:1163–1165` says so); with a one- or two-line row the check never fires. Keep the `.locate-me` branch (`:1198–1203`) and the footer lift (`:1207–1213`) |
| Explore ruler constants `--ruler-top-clear: 376px` and `--ruler-left: 196px` | `explore/+page.svelte:2300–2320` (comment "left rail PLANETS…ICONIC MISSIONS chips, 124–368 px") | **FOLD IN: recompute for the row** | both numbers are the old column's extent; the row occupies about y 110–140 (§4) |
| Object-index side panel `top: 152px` ("under the buttons") | `SurfaceScene.svelte:7066` (`max-height: 500px` variant `:7081`, a literal `top: 60px` also at `:7082`, A6 N6) | **FOLD IN: top = published HUD bottom + 8** | a two-line Earth row ends at about 176 px (§4), below the 152 px the panel starts at |
| Explore chips are inline buttons because `LayerChipRow` cannot carry `data-audio-stage` | `HudControls.svelte:100–159` | **FOLD IN: Explore renders `LayerChipRow`** | one row component is the point of D1; A4's `...rest` props remove the blocker (the `layer-paths` chip keeps `data-audio-stage`) |
| Touch drawer (Layers tab) | `SurfaceScene.svelte:5673`, `HudControls.svelte:852–860`, `MobileDrawerGroup.svelte:262, :375` | **FOLD IN** | same component; with no header bands the Earth block loses its two 38 px bands (§4 phone numbers) |
| The view-control row above the chips (2D/3D, RESET VIEW, SPIN, AR, SKY) | `SurfaceScene.svelte:5624–5657`, `HudControls.svelte:75–99` | **LEAVE for A4** (D5 there: same chip) | A5 only fixes its position: row 1 view controls, row 2 layers |
| `ScaleNav` flush right at the solar scale, `top: 8px` | `explore/ScaleNav.svelte:77–91` | **LEAVE** | on the right, above the row |
| Explore PATHS legend list (280 px, hangs under the chip block at `top: 100%`) | `HudControls.svelte:803–827` | **LEAVE (verify)** | anchored to the block's bottom, so it moves up with the shorter block; verify in the shot |
| Detail-panel clearance of the row (panel is `--panel-width`, 400 px) | altitude indicator uses `right: calc(var(--panel-width) + 12px)` `SurfaceScene.svelte:8044` | **FOLD IN: the row's `max-width`** | when the panel is open the row has about 400 px less; the row wraps by chip, so it must stop before the panel |
| Earth `locate-me` (bottom-left) | `earth/+page.svelte:244` | **LEAVE** | bottom-left, independent of the top row; its chip look is A4's (A4 §1.3.3) |
| Missions / fleet filters, programs group-by | A4 | **LEAVE** | different surfaces |
| Footer-dock "no two HUD parts intersect" spec | `tests/e2e/footer-dock.spec.ts:125–168` (Explore) | **FOLD IN: extend to Worlds** | selector `.ctrl-row.chips` is kept by A5 |
| Mars / Moon site-selected and `earth?site=ksc` states | crawl 2026-11-12 (A4 brief §1.3) | **FOLD IN: shoot and test these states** | they are where the row meets the open panel, the nation legend and Stand here / Zoom in; the first brief only reasoned about them |

## 1. Inventory — the chip rows today

### 1.1 Components and CSS (all `file:line` read at HEAD)
| Piece | Where | What it does |
|---|---|---|
| `LayerChipRow.svelte` (144 lines) | `src/lib/components/` | config array → buttons. Group machinery that D1 / D2 delete: `header?: boolean` (`:40`), the `chip-group` button with dot and label (`:50–66`), `.chip-group` / `.dot` / `::after` rules (`:87–131`), `disabled?: () => boolean` and `.chip:disabled` dimming (`:37`, `:65–73`, `:139–143`) |
| Worlds config | `SurfaceScene.svelte:5445–5622` (`layerChips` snippet) | flat for Moon / Mars / Venus; grouped for Earth (`earthGroups = config.earthOrbitalLayers?.satellites != null`, `:5449`) |
| Chip row wrapper | `.ctrl-row.chips` markup `:5458`; CSS `:7427–7436` (phone: row, wrap, `max-width: calc(100vw - 24px)`), `:7541–7550` (fine pointer: **column**, `width: max-content; min-width: 140px`) | |
| HUD container | `.hud-controls` `:7086–7100` fixed, `top: calc(var(--nav-height) + 12px)`, `left: 36px` on fine pointer (`:7535–7540`, clears the 28 px index tab), display `none` on touch (`:7096`) | |
| Touch | `MobileDrawerGroup` tab LAYERS renders the same `layerChips` snippet (`:5673`); drawer body `max-height: 46vh`, landscape `min(46vh, 240px)`; `.hud-top-mobile` holds 2D / Reset / Spin on touch (`:7580–7592`) | |
| Explore | `HudControls.svelte:102–159` five inline buttons, no groups; CSS `.ctrl-row.chips` row + horizontal scroll on phone `:510–524`, **column** from 769 px on fine pointer `:828–837`; `.hud-controls` fixed `top: calc(var(--nav-height) + 8px)` / `+12px` at 501 px, `left: 16px`, z 45 `:482–503`, `:786–791`; the PATHS legend hangs below `:803–827` | |

### 1.2 Chip lists per route today and in the decided row (en-US strings)
| Route | Today (render order) | Decided flat row (same order unless noted) |
|---|---|---|
| `/explore` | PLANETS, DWARFS, COMETS, ISM, ICONIC MISSIONS | unchanged, from `LayerChipRow` |
| `/moon` | SURFACE · AUTO, ORBITERS, ORBITS, TRAVERSES | unchanged |
| `/mars` | SURFACE · AUTO, ORBITERS, ORBITS, TRAVERSES | unchanged |
| `/venus` | SURFACE · AUTO, ORBITERS, ORBITS | unchanged |
| `/earth` | SURFACE · AUTO, **[ON EARTH]**, LAUNCHPADS, MUSEUMS, TELESCOPES, **[IN SPACE]**, STATIONS, TELESCOPES, CONSTELLATIONS, COMSATS (ORBITS hidden on Earth) | **Built (§0b.1): SURFACE · AUTO, LAUNCHPADS, MUSEUMS, OBSERVATORIES, ORBITERS** (5 chips; the two bracketed headers, the four category chips and the second TELESCOPES are gone) |

Facts that shape the proposal:
1. **Earth's masters are real state, not decoration.** `layerGround` (`:742`) gates `padsOn`, `museumsOn`, `telescopesOn` (`:744–746`) and the launchpad tier groups (`:4476`, `:4487`); `layerOrbiters` (`:437`) gates every orbiter and every Earth satellite
   (`:3823`, `:3850`). D2 deletes the Earth chips that flip them; §3.3 says what that does.
2. **`layerOrbiters` stays on Moon, Mars and Venus** as the ORBITERS chip (it is a real layer there, `layer-orbiters`, `mars.spec.ts:63`); only Earth loses it.
3. **Two chips are named TELESCOPES on Earth today** (testids `layer-telescopes` = ground observatories, `layer-observatories` = space telescopes; both labels are `m.observatory_layer_chip()`, `:5534`, `:5587`); the group header was the only disambiguation (comment `:5586`). D3 removes the need for the group by naming them.
4. **The SURFACE chip is a 4-state cycle** (AUTO / HIGH / LOW / OFF, `cycleSurfaceMode`, label `SURFACE · AUTO` = 14 characters, the longest of the Moon / Mars / Venus set) and is ungated.
5. **Tests that name the groups or masters:** `earth.spec.ts:96–123` (title "chips are grouped ON EARTH / IN SPACE; each header is a master switch": `layer-group-earth`, `layer-orbiters`, sub-chips `toBeDisabled`), `mobile-layout.spec.ts:64–110`
   (`.mdg-body .chip-group` branch and `~ .chip`), `mars.spec.ts:62–64` (`layer-orbiters` on Mars: stays), `museums.spec.ts:95–97` (`layer-telescopes`: testid stays), `footer-dock.spec.ts:140, 189` (`.ctrl-row.chips`).

## 2. Findings that shape the proposal
1. Without groups there is nothing left to design on the row except **membership, order, wrap and clearance**; the chip look is A4's.
2. The old collision argument (a column ending near y 534 reaches the orbit ruler on a 768 px window) no longer exists: the row ends at about y 140 (one line) or 176 (two lines).
3. **Dropping the masters is a behaviour change**, not a layout change: sub-chips stop being greyed when a master is off (the 2026-06-15 "grayed out solution" note in `:5564–5575` is moot: there is no master to be off), and Earth's Moon orbiters lose their only switch (§3.3).
4. **The ground / space meaning moves into the words**: OBSERVATORIES and SPACE TELESCOPES carry it, so the row needs no caption (D3).
5. The new labels are longer than TELESCOPES (OBSERVATORIES 13, SPACE TELESCOPES 16 characters in en-US; ru КОСМИЧЕСКИЕ ТЕЛЕСКОПЫ 21, es TELESCOPIOS ESPACIALES 22), so the Earth row is wider (§4) and the locale layout check matters (§9).

## 3. Proposal (decided, with the details A5 owns)

### 3.1 One row, one component
- `LayerChipRow.svelte` keeps its config-array API (`testid`, `label`, `title`, `active`, `toggle`, `visible`) and renders `Chip kind="toggle"` (A4) in one `div.ctrl-row.chips[role="group"][aria-label="{m.ui_visibility_layers()}"]` (the group wrapper that exists today at `:5458`; it names the set for assistive tech, it is not a visual caption and stays). Removed from the interface: `header`, `disabled`. Added (A4): optional `attrs` passthrough for `data-audio-stage` (Explore's `layer-paths` chip).
- Explore renders `LayerChipRow` (fold-in), so there is exactly one place that draws layer chips.
- No `ChipGroup` captions, no hairlines, no master dots, no frame.

### 3.2 Earth's row (built, §0b.1)
`SURFACE · AUTO · LAUNCHPADS · MUSEUMS · OBSERVATORIES · ORBITERS`. Ground chips first, then the one orbiter chip. Testids unchanged where the chip stays (`layer-surface`, `layer-launchpads`, `layer-museums`, `layer-telescopes` for OBSERVATORIES, `layer-orbiters`) so `museums.spec.ts` and the other specs do not move; `layer-telescopes` now disagrees with its label and the code comment says so. Deleted: the `layer-group-earth`, `layer-stations`, `layer-observatories`, `layer-constellations`, `layer-comsats` chips, `earthGroups`, `layerGround`, the seven `disabled:` gates, the `header` flags, the `m.earth_layer_group_*` calls, `layerStations/Observatories/Constellations/Comsats` and `satellites.categoryDefaultVisible`. `padsOn`, `museumsOn`, `telescopesOn` lose their `layerGround &&`, and so do the launchpad tier groups. The OBSERVATORIES tooltip stays `observatory_layer_tip`; the Earth ORBITERS tooltip is `earth_layer_tip_orbiters` (the old IN SPACE tooltip text: everything in orbit, Moon orbiters included).

### 3.3 Behaviour consequences of D2 (stated, so nothing is a surprise)
- Each Earth sub-chip is an independent toggle. Turning LAUNCHPADS off no longer interacts with MUSEUMS; no chip is greyed.
- **Moon orbiters on Earth:** they ride the one ORBITERS chip with every other orbiter (§0b.1); O1 is closed.
- Selection clearing that the ground master did (`selectedMuseum = null; selectedObservatory = null`, `:5480–5483`) is already done by each chip's own toggle (`:5522`, `:5539`); LAUNCHPADS keeps `dropHiddenPadSelection()`.

### 3.4 Where it sits (unchanged anchor)
`.hud-controls` fixed at `top: calc(var(--nav-height) + 12px)` (Worlds) / `+ 8px → +12px` (Explore), `left: 36px` (Worlds, clears the 28 px index tab) / `16px` (Explore). Row 1 = view controls (A4 chip), row 2 = the layer chips with `flex-wrap: wrap; column-gap: 6px; row-gap: 6px`,
`max-width: calc(100vw - 36px - 16px - var(--surface-panel-open, 0px))` so it stops before an open detail panel (the `--surface-panel-open` variable does not exist yet: NV4). It wraps between chips, wherever the width runs out; there is no group to protect.
On touch (phone / landscape) `.hud-controls` is hidden and the same row renders in the LAYERS drawer (44 px chips, 6 px gaps), no header bands.

## 4. Space budget (CSS and message-string arithmetic, no browser)
Fixed numbers: nav bar 60 px today, **52 px after A6** (`--nav-height`); `.hud-controls` top = nav + 12 = 72 px (60) / **64 px (52)**; row 1 (A4 chip, 30 px) = 72–102; gap 8; row 2 top = 110 (60) / **102 (52)**; chip 30 px; row gap 6. One-line row 2 ends at 140 (60) / 132 (52); two lines at 176 / 168.
Chip width = 7.6 px per character (Space Mono 0.6 em at 11 px + 1 px spacing) + 24 px padding + 2 px border (A4 chip, assumed, not measured): SURFACE · AUTO 14 → 132, LAUNCHPADS 10 → 102, MUSEUMS 7 → 79, OBSERVATORIES 13 → 125, STATIONS 8 → 87,
SPACE TELESCOPES 16 → 148, CONSTELLATIONS 14 → 132, COMSATS 7 → 79, ORBITERS 8 → 87, ORBITS 6 → 72, TRAVERSES 9 → 94, PLANETS 7 → 79, DWARFS 6 → 72, COMETS 6 → 72, ISM 3 → 49.
| Route | Row total, one line (gaps 6 px) | Reading |
|---|---|---|
| `/explore` | 79 + 72 + 72 + 49 + 132 + 24 = **428** | one line at every width ≥ 600 px |
| `/moon`, `/mars` | 132 + 87 + 72 + 94 + 18 = **403** | one line |
| `/venus` | 132 + 87 + 72 + 12 = **303** | one line |
| `/earth` (en-US) | 132 + 102 + 79 + 125 + 87 + 24 = **549** | one line with the panel open as well: the budget with the 400 px panel is 1440 − 36 − 16 − 412 = 976 at 1440, 902 at 1366, 816 at 1280, 652 at 1100 |
Compared with the old column (≈ 534 px tall) the row is about 400 px shorter. Touch: Earth 5 chips at 44 px in the 358 px drawer: 2 lines = 2 × 44 + 6 = 94 px; Moon / Mars 2 lines, Venus 1 line (the 46 vh cap is 388 px at 844 high; landscape cap `min(46vh, 240px)` = 180 px at 393 high).
Wider locales: ru ОБСЕРВАТОРИИ (11) and es OBSERVATORIOS (13) are about the width of OBSERVATORIES; ar and the CJK forms are shorter. NOT measured (NV1, NV9).
Neighbours (unchanged geometry): INDEX pull tab at x 0–28 (row starts at 36, clear), nation legend and `locate-me` (bottom-left), time dock and planet scales (Explore bottom-left), footer menu (bottom-right), ruler at the left edge (its top at 720 px high is about y 436 ≫ 176, so the chip-driven shift never triggers and is deleted).

## 5. Hit list (baseline **75 violations** from `a5-check.py`, run at `50b3e962a8d`; output `a5-out.txt`)
| Kind | Count | Where |
|---|---|---|
| COLUMN (`.ctrl-row.chips` with `flex-direction: column`) | 2 | `SurfaceScene.svelte:7541`, `HudControls.svelte:828` |
| GROUP-HEADER-OR-GATE (header / dot / `chip-group` / `disabled` machinery in the row component) | 20 | `LayerChipRow.svelte:37, 40, 50, 53, 60, 61, 65, 70, 72, 73, 87, 88, 106, 112, 119, 122, 125, 126, 129, 139` |
| GROUND-MASTER-STATE (`layerGround`) | 12 | `SurfaceScene.svelte:742, 744, 745, 746, 4476, 4487, 5477, 5479, 5480, 5497, 5524, 5541` |
| EARTH-GROUPS-BRANCH (`earthGroups`) | 6 | `SurfaceScene.svelte:5449, 5452, 5453, 5456, 5470, 5471` |
| GROUP-KEY (`m.earth_layer_group_*`) | 4 | `SurfaceScene.svelte:5452, 5453, 5475, 5476` |
| HEADER-FLAG (`header:` in the chip config) | 2 | `SurfaceScene.svelte:5456, 5486` |
| SUBCHIP-GATE (`disabled: () => !layerGround / !layerOrbiters`) | 7 | `SurfaceScene.svelte:5497, 5524, 5541, 5582, 5591, 5599, 5607` |
| TELESCOPES-LABEL (`m.observatory_layer_chip()`) | 2 | `SurfaceScene.svelte:5534, 5587` |
| EXPLORE-NOT-SHARED | 1 | `HudControls.svelte` (inline chips) |
| CHIP-DRIVEN-RULER-SHIFT | 1 | `SurfaceScene.svelte:1187` |
| HARD-TOP-OFFSET | 1 | `SurfaceScene.svelte:7066` (`top: 152px`) |
| HARD-RULER-OFFSET | 2 | `explore/+page.svelte:2309` (376 px), `:2314` (196 px) |
| STALE-COMMENT (column wording) | 4 | `SurfaceScene.svelte:1165, 7429, 7533, 7556` |
| LOCALE-OLD-KEY-STILL-PRESENT | 5 | `earth_layer_group_ground`, `_space`, `_ground_tip`, `_space_tip` and `observatory_layer_chip`, each in 14 locales |
| LOCALE-NEW-KEY-MISSING | 2 | `observatory_layer_chip_ground`, `observatory_layer_chip_space`, each missing in 14 locales |
| GLOSSARY-TERM-MISSING | 2 | `observatory`, `space telescope` not in `native-terms.json` `term` |
| NO-E2E / NO-UXD | 2 | `tests/e2e/chip-row.spec.ts`, `docs/uxs/decisions/UXD-015-flat-chip-row.md` do not exist |
Expected `a5-keep: <why>` markers at the end: none planned. The `.locate-me` and footer-lift parts of the ruler effect do not match the check. After the locale work the script also verifies, per locale, that the two new values differ from each other, that the ground chip value is contained in the same locale's existing `observatory_layer_tip` and that both equal the glossary form (kinds `LOCALE-CHIPS-IDENTICAL`, `LOCALE-GROUND-FORM-DRIFT`, `LOCALE-GROUND/SPACE-NOT-GLOSSARY-FORM`; they cannot fire before the keys exist, so they are not in the 75).

## 6. Allow-list (not touched, with reason)
| Item | Reason |
|---|---|
| Chip look, size, colour, tint, ARIA of the chip | A4 / UXD-014 |
| View-control row look (2D/3D, RESET VIEW, SPIN, AR, SKY) | A4 (HUD action chip) |
| Missions / fleet / launches filters, deep-sky, programs group-by | A4, MI2 / MI3 |
| `/fly`, `/plan`, `/iss`, `/tiangong` HUDs | other scene routes with their own controls (A4 §1.3.3) |
| `PanelTabRow` tabs, `mdg-tab` drawer tabs, nav toggles | not chips |
| Orbit ruler content and look | only its position in the left rail is in scope |
| Home, Lab, dev routes | out of the A-series scope |

## 7. Tests
- **Built:** `chip-row.spec.ts`, `index-links.spec.ts` (new), `earth.spec.ts`, `mobile-layout.spec.ts`, `footer-dock.spec.ts` (world HUD), `museums.spec.ts`, `audio-tour.test.ts` updated; not run by the author (the lead runs Playwright). Planned scope, kept as written: **New `tests/e2e/chip-row.spec.ts`** on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; routes `/earth`, `/moon`, `/mars`, `/venus`, `/explore` and the states `/earth?site=ksc`, `/moon?site=apollo11`, `/mars?site=perseverance` (panel open). Per route: **no `.chip-group` element, no chip with `disabled` or `aria-disabled`, no group caption text**; chip order and count per §1.2 (Earth: 5, OBSERVATORIES, no TELESCOPES chip); all chips of the row share a y band (|Δy| < 8 px) with the panel closed on fine pointer; no `flex-direction: column` on `.ctrl-row.chips` at any pointer; Earth sub-chips are independent (click LAUNCHPADS: STATIONS keeps its `aria-pressed`).
- **No-overlap spec** (fine pointer, `test.use({ viewport, hasTouch: false, isMobile: false })`) at 1440×900, 1366×768, 1280×720, 1100×700, 800×375: no two of `.ctrl-row.chips`, `.ruler`, `.surface-index-desktop` (opened), `.detail-panel` (a site selected), `.distance-scale`, the view-control row, the nation legend intersect. Explore: the row joins the `HUD_PARTS` loop (`footer-dock.spec.ts:134–168`) and the same loop runs for `/earth /moon /mars /venus` (new `WORLD_HUD_PARTS`). Phone and landscape: the LAYERS drawer shows the chips in a wrap run with no header bands, no horizontal scroll, chips ≥ 44 px (A4), the drawer body scrolls instead of growing past its cap.
- **Rewrite:** `earth.spec.ts:96–123` becomes "chips are independent toggles in one row" (no `layer-group-earth`, no `toBeDisabled`); `earth.spec.ts:83` and the neighbouring assertions keep their testids; `mobile-layout.spec.ts:64–110` loses its `.chip-group` branch (the first two chips of the row share a y band on touch); `mars.spec.ts:62–64` unchanged (Mars keeps ORBITERS); `museums.spec.ts:95–97` unchanged.
- **Update:** `moon.spec.ts`, `hotspots.spec.ts`, the audio-tour `data-audio-stage` scan (`audio-tour.test.ts:296–297` lists the components it scans: Explore moving to `LayerChipRow` changes its file list), `footer-dock.spec.ts`, `explore.spec.ts` / `explore-paths-layer.spec.ts` (`layer-paths`, `data-audio-stage` kept), `visual.spec.ts` surface-HUD and Explore baselines.
- **Visual baselines that change (prediction, not a run):** `earth-surface-hud`, `moon-surface-hud`, `mars-surface-hud`, `venus-surface-hud` (desktop; A4 regenerates them too: regenerate once for A4 + A5 together), the Explore HUD baseline if one exists (NV6).
- **Re-run all three projects:** `earth`, `moon`, `mars`, `museums`, `hotspots`, `explore`, `explore-paths-layer`, `explore-time-controls`, `explore-scale-picker`, `footer-dock`, `mobile-layout`, `mobile-invariants`, `a11y`, `a11y-keyboard`, `type-floor`, `chip` (A4), `accent-colour`, `smoke`, `i18n-all-routes`.

## 8. Docs
- `docs/uxs/decisions/UXD-015-flat-chip-row.md` (status `proposed`; draft in the appendix) and its row in `docs/uxs/decisions/README.md`; `docs/uxs/CHANGE-INVENTORY.md` row A5.
- `docs/uxs/IA.md`: A4's `§controls` gains "Layer chips: one flat horizontal row on Explore and every world, no groups, no masters"; `docs/concept/05_Design_System.md` §5.7 (A4's Chip) gets one sentence on the row; the glossary term entries are cited, not copied.
- UXS specs for surfaces (grep before writing: `UXS-001/002/003/013/014/015` for "chip", "layer", "column", "ruler", "ON EARTH", "IN SPACE"): any line that says the chips are a left column, groups, or that the ruler steps right of them is rewritten (NV7: not read).
- `AGENTS.md` design block: one paragraph "Layer chips are one flat horizontal row (`LayerChipRow`, UXD-015); a route does not draw its own chip column; no group captions".
- `src/lib/components/README.md` (Surface HUD line 10: `LayerChipRow` loses `header` / `disabled`), `src/lib/surface-scene/README.md:21`, `docs/adr/TA.md` (HUD paragraph; one line), ADR-062 and ADR-074 mention `LayerChipRow` (`git grep` at HEAD): check each for column or group wording.
- Comments to rewrite (rot): `SurfaceScene.svelte:1163–1166`, `:5446–5448`, `:5558–5575`, `:7018–7022`, `:7427–7430`, `:7533`, `:7555–7557`, `explore/+page.svelte:2300–2308`, `HudControls.svelte:100–101`, `:480–499`, `:510–514`, `:828–832`, `:863–865`, `LayerChipRow.svelte` header.

## 9. Locales — exactly what changes, in order (built, §0b.5–6)
Order is the operator's (D3) and the glossary rule: terms first, then keys.
1. **Glossary first.** `scripts/i18n-tools/native-terms.json` `term.observatory` (sense "a site or building on the ground for astronomical observation", `_match` stems, `_confidence`, 13 locale forms = the site's existing wording from `observatory_layer_tip`, `sources` recorded) and a one-sentence definition in `i18n-src/<loc>/glossary/terms.json` (14 locales; `build-glossary` needs it). `_en` is limited to ground / radio / optical observatory (§0b.5).
2. **One new chip key** `earth_layer_chip_observatories` in all 14 locales, written by hand inline (plus `surface_index_open_page` for the INDEX row link), then `stale-overlays.mjs --manifest=write`, `npm run i18n:compile`, `npm run validate-data`. No paid translation run (operator rule 2026-10-18). The keys removed and renamed are in §0b.6.
3. **Per-locale check** (the value of `earth_layer_chip_observatories` must equal the glossary form and be contained in the same locale's `observatory_layer_tip`; the check script verifies it for all 14):

| Locale | OBSERVATORIES (ground) |
| --- | --- |
| en-US | OBSERVATORIES |
| ar | مراصد |
| de | OBSERVATORIEN |
| es | OBSERVATORIOS |
| fr | OBSERVATOIRES |
| hi | वेधशालाएँ |
| it | OSSERVATORI |
| ja | 天文台 |
| ko | 천문대 |
| nl | STERRENWACHTEN |
| pt-BR | OBSERVATÓRIOS |
| ru | ОБСЕРВАТОРИИ |
| sr-Cyrl | ОПСЕРВАТОРИЈЕ |
| zh-CN | 天文台 |

   The operator already named three of them (de "Observatorien", ja "天文台", sr-Cyrl "Опсерваторије"); all three match. Layout risk to shoot: de, ru, es and ar in RTL (the row follows `dir`).
4. The **tooltips**: `observatory_layer_tip` stays; `earth_layer_tip_orbiters` is the renamed `earth_layer_group_space_tip` (same text in 14 locales).

## 10. Decisions and open questions (operator)
Decided: everything in §0a and §0b. **O1 (Moon orbiters on Earth) is closed**: the one ORBITERS chip on Earth switches them with every other orbiter (§0b.1). Small defaults taken: Earth row order = ground chips, then ORBITERS; testids unchanged; footer compaction on the four scene routes is unchanged (§0b / UXD-015 Consequences).

## 11. Check (must print `A5-CHECK violations: 0`)
The script is `a5-check.py` in the session scratchpad, corrected for §0b (one OBSERVATORIES key, the removed keys, no category-chip state, the INDEX-absorbs-A–Z checks; the original 75-violation baseline was at `50b3e962a8d`). Run from the repo root as `python3 a5-check.py`. Allow marker: `a5-keep: <why>` on the line or the line above. It checks, in order: no `flex-direction: column` on `.ctrl-row.chips` in `SurfaceScene` / `HudControls`; no group / master machinery in `LayerChipRow`; no `layerGround`, `earthGroups`, `header:`, `disabled: () => !layer…`, `m.earth_layer_group_*`, `m.observatory_layer_chip()`, category-chip state or removed-chip testids in `SurfaceScene`; `HudControls` imports `LayerChipRow`; no `top: 152px`, no chip-driven ruler shift, no stale column wording, no 376 / 196 px ruler constants; removed message keys absent and new keys present in 14 locales; the ground form is inside `observatory_layer_tip` and equals the glossary form; the glossary entry has 13 forms; `chip-row.spec.ts` and `UXD-015` exist; `/moon /mars /venus /explore` pages no longer use `EntityIndex` and pass `entityLinks`; `EntityIndex` has no `floating` variant. Known limits: it checks names, constants and locale values, not layout; `chip-row.spec.ts`, `index-links.spec.ts` and `footer-dock.spec.ts` measure the rest.

## 12. Acceptance (definition of done)
1. `python3 a5-check.py` prints `A5-CHECK violations: 0`.
2. On `/earth`, `/moon`, `/mars`, `/venus`, `/explore` the layer chips are one horizontal flat row in the membership and order of §1.2 (Earth: §0b.1), from one component, with no caption, no group, no greyed chip; no vertical column at any pointer.
3. `chip-row.spec.ts` plus the extended `footer-dock.spec.ts` green on desktop-chromium, mobile-chromium, mobile-landscape-chromium at 1440×900, 1366×768, 1280×720, 1100×700, 800×375 and in the three site-selected states: no intersection between the chip row and the ruler, index panel, detail panel, distance scale, nation legend and the view-control row; nothing skipped.
4. Glossary entry added first; the new key in all 14 locales with the per-locale check of §9 shown; old keys removed; `validate-data` green.
5. Docs of §8 written; UXD-015 `accepted`; CHANGE-INVENTORY row A5 updated.
6. The operator receives the sheets of §13 (O1 is closed, §0b.1). The INDEX links (§0b.3) are checked by `index-links.spec.ts`.

### Appendix — UXD-015
Written and `accepted`: [`docs/uxs/decisions/UXD-015-flat-chip-row.md`](../uxs/decisions/UXD-015-flat-chip-row.md) (the draft that stood here was superseded by §0b).

## 13. Screenshots for the operator (via dev server, per AGENTS "Iterating on UI"; not Docker)
Prototype by injected CSS on the running dev server (a throwaway script in the scratchpad: sets `.ctrl-row.chips { flex-direction: row; flex-wrap: wrap }`, removes the `chip-group` buttons, relabels the two Earth chips): before (HEAD) and after, desktop 1440×900 and 1280×720 and phone 390×844:
1. `/explore` (with PATHS on, to see the legend), 2. `/moon`, 3. `/mars`, 4. `/venus`, 5. `/earth` panel closed, 6. `/earth?site=ksc` (panel open, the row wraps at 1280), 7. `/earth` with the index panel open, 8. `/earth` at 1280×720 (the old ruler-collision case), 9. `/moon?site=apollo11` and `/mars?site=perseverance` (panel, nation legend, Stand here), 10. `/earth` phone LAYERS drawer, 11. `de`, `ru` and `ar` of `/earth` desktop (the long SPACE TELESCOPES and RTL). Small PNGs; nothing committed. The A5 prototype sheets from 2026-11-12 (`a5-*-A.png` and `a5-*-now.png` in the scratchpad) already show the flat row on the five routes; they were not re-read for this rewrite.

## 14. NOT VERIFIED (what this brief did not check)
- NV1 No browser, no build, no test run. Every width, height and wrap in §4 is arithmetic: 7.6 px per character at 11 px with 1 px spacing (0.6 em Space Mono advance assumed, not measured), 24 px padding + 2 px border per chip, the A4 30 / 44 px heights, `--nav-height` 60 px today and 52 px after A6. Actual widths in de / ru / es / ar / ja were not computed beyond the two longest labels.
- NV2 The 112 px narrower / 400 px shorter comparisons with the group proposal and the old column come from the first version of this brief's numbers, not re-derived.
- NV3 The ruler's rendered height at 720 / 768 / 900 was not computed; "ruler top about y 436 at 720" assumes about 270 px, an estimate. Earth's `anchorBottomPx` was not read (moon / mars pass 14).
- NV4 `--panel-width` (400 px) is taken from comments and the altitude-indicator rule (`SurfaceScene.svelte:8044`); a `--surface-panel-open` style variable does not exist and its design is not part of this brief (the row's `max-width` needs a way to read panel state).
- NV5 What the operator finds "not good" in Earth's current groups (C2) is not stated in the plan; D1 / D2 remove both groups and masters, which covers the likely readings (heavy headers, masters, greyed sub-chips, double TELESCOPES).
- NV6 Whether an Explore HUD visual baseline PNG exists was not checked.
- NV7 UXS-001/002/003/013/014/015, ADR-062 and ADR-074 were not read for column, group or ruler wording; the doc edits in §8 are from `git grep` file names, not their text.
- NV8 Tests that depend on chip DOM order or on `layer-orbiters` on Earth beyond `earth.spec.ts`, `mars.spec.ts`, `museums.spec.ts` and `mobile-layout.spec.ts` were not searched (`moon.spec.ts`, `hotspots.spec.ts`, the audio-tour scan may assume order).
- NV9 `MobileDrawerGroup` positioning and the drawer's rendered inner width (358 px at 390) were read from CSS, not run; the touch numbers (194 px for Earth) assume 44 px chips and 6 px gaps from A4.
- NV10 The glossary entry shape for `term` was read from the `trajectory` entry only; whether `term-drift.mjs` or `canonical-check.mjs` need extra fields (e.g. `_match` stems for the new terms, `_confidence`) was not tried. Adding the two entries may make `term-drift.mjs` report existing uses of "observatory" / "telescope" in other fields as misses: not run.
- NV11 Whether an unused-message-key gate exists (it would force removing the four dead `earth_layer_group_*` keys and the old `observatory_layer_chip`) was not checked; removal is planned either way.
- NV12 The Venus ruler budget (whether `/venus` has a ruler) was not checked.
- NV13 `a5-check.py` ran once at `50b3e962a8d` (75) and has no tests of its own; the locale-value checks (`LOCALE-*-FORM-*`, `LOCALE-CHIPS-IDENTICAL`) have never fired on real data (no new keys exist) and were exercised only through `forms.py`, which tests the table of §9 against the existing tip strings, not the script.
- NV14 The A5 prototype PNGs from the operator's session were not opened for this rewrite; the flat-row geometry here is from CSS arithmetic, not from those images.
