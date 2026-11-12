# Slice A5 brief — one flat row of layer chips on every world and on Explore (C2, W7)

Read-only brief. First version written at HEAD `81e0d43c0dd` with two proposals (groups ON GROUND / IN SPACE on every world, or a flat Earth). **Rewritten 2026-11-12 at HEAD
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
| D2 | **Earth's two master switches (ON EARTH, IN SPACE) are dropped** | §3.2: the `layerGround` state, the Earth `ORBITERS` master and the greying of 7 sub-chips go; behaviour consequence in §3.3 and §10 |
| D3 | **Earth's two TELESCOPES chips become OBSERVATORIES (ground) and SPACE TELESCOPES.** Both terms go into `scripts/i18n-tools/native-terms.json` first (13 locales, the site's existing forms), then **two new message keys in all 14 locales with a per-locale check** | §9 |
| D4 | The chip itself is A4's option A (30 / 44 px, 4 px, 11 px uppercase, outline at rest, soft blue fill + blue edge + white text when on; per-world tint on the Worlds only) | A5 defines no chip look |
| D5 | A3 final tokens are in `tokens.css:9–20` | §0a cascade below |

**Cascade.**
- **A3 (landed):** `--color-accent` `#5070ff`, `-soft`, `-edge`, `-strong`, `--color-state` `#889fe7`, `--color-focus`, white text on a soft fill, dark text only on a solid fill. The Earth group master's dot and
  its 1 px focus ring (`LayerChipRow.svelte:112–131`, `border: 1px solid var(--body-tint, var(--color-accent))`) are deleted with the master, so no pre-A3 leftover needs a separate fix.
- **A4 (option A, briefed, not built):** the chip is `Chip kind="toggle"` in `.ui-chip` (`src/lib/styles/chip.css`); the Worlds set `--chip-tint` from their `--body-tint` (Moon grey, Mars red, Venus amber), Earth and Explore use the accent
  (A4 §3.6). A5 only decides which chips are in the row, their order, the row's layout and how it clears neighbours. **`ChipGroup` is not needed by A5** (no captions, no groups); it stays an A4 component for `choice`
  radiogroups. A4's `a4-keep` markers on the `.ctrl-row.chips` column / drawer / short-window rules (A4 §5) are rewritten here, not kept.
- **A6 (briefed):** the nav height decision (52 px, `--nav-height`) moves every HUD top by −8 px. A5's row anchors on `calc(var(--nav-height) + Npx)` only (no literal 60 / 64 fallbacks): `SurfaceScene.svelte:8116, 8158` and `HudControls.svelte:645, 825` carry
  `var(--nav-height, 60px/64px)` fallbacks that A6 deletes (A6 check N6); A5 must not re-add one.
- **Explore (D1):** the five Explore chips and the four Worlds rows are the same component in the same place; Explore never had groups.

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
| `/earth` | SURFACE · AUTO, **[ON EARTH]**, LAUNCHPADS, MUSEUMS, TELESCOPES, **[IN SPACE]**, STATIONS, TELESCOPES, CONSTELLATIONS, COMSATS (ORBITS hidden on Earth, `:5510`) | SURFACE · AUTO, LAUNCHPADS, MUSEUMS, **OBSERVATORIES**, STATIONS, **SPACE TELESCOPES**, CONSTELLATIONS, COMSATS (8 chips; the two bracketed headers are gone) |

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

### 3.2 Earth's row
`SURFACE · AUTO · LAUNCHPADS · MUSEUMS · OBSERVATORIES · STATIONS · SPACE TELESCOPES · CONSTELLATIONS · COMSATS`. Ground chips first, then space chips, in today's relative order (a reading order only; there is no caption). Testids unchanged
(`layer-surface`, `layer-launchpads`, `layer-museums`, `layer-telescopes` for OBSERVATORIES, `layer-stations`, `layer-observatories` for SPACE TELESCOPES, `layer-constellations`, `layer-comsats`) so `museums.spec.ts` and the other specs do not move; the two names that now disagree
with their labels are noted in the code comment (renaming the testids would touch every spec for no visible gain). Deleted: the `layer-group-earth` chip, the Earth branch of the `layer-orbiters` chip (the chip itself stays for Moon / Mars / Venus), `earthGroups`, `layerGround`, the seven `disabled:` gates, the `header` flags and the four `m.earth_layer_group_*` calls
(`:5452, 5453, 5475, 5476`). `padsOn`, `museumsOn`, `telescopesOn` lose their `layerGround &&` (`:744–746`) and the launchpad tier groups lose it too (`:4476, :4487`). The tooltips stay as they are (`observatory_layer_tip` for OBSERVATORIES, `earth_layer_tip_telescopes` for SPACE TELESCOPES).

### 3.3 Behaviour consequences of D2 (stated, so nothing is a surprise)
- Each Earth sub-chip is an independent toggle. Turning LAUNCHPADS off no longer interacts with MUSEUMS; no chip is greyed.
- **Moon orbiters on Earth:** the scene's "moon-orbiters (+ uncategorised) ride the master ORBITERS toggle" (`SurfaceScene.svelte:3846`). With no Earth master they are always shown while the orbit view is on (`layerOrbiters` stays `true` on Earth). §10 O1 asks whether that is acceptable or whether Earth keeps a plain ORBITERS chip.
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
| `/earth` (en-US) | 132 + 102 + 79 + 125 + 87 + 148 + 132 + 79 + 42 = **926** | one line with the panel closed; with the 400 px panel open the budget is 1440 − 36 − 16 − 412 = 976 at 1440 (fits), 1366 → 902 (24 px short: two lines), 1280 → 816 (two lines: 6 chips, then CONSTELLATIONS + COMSATS) |
Compared with the group proposal (about 1038 px on Earth) the flat row is 112 px narrower; compared with the old column (≈ 534 px tall) it is about 400 px shorter. Touch: Earth 8 chips at 44 px in the 358 px drawer: about 4 lines = 4 × 44 + 3 × 6 = 194 px (the 46 vh cap is 388 px at 844 high; landscape cap `min(46vh, 240px)` = 180 px at 393 high: the drawer scrolls by about 14 px, accepted today for taller blocks); Moon / Mars 2 lines (94 px), Venus 1 line.
Wider locales: ru (SPACE TELESCOPES = КОСМИЧЕСКИЕ ТЕЛЕСКОПЫ 21 characters = 186 px) and es (22 = 193 px) add about 45 px to Earth; de WELTRAUMTELESKOPE 17 = 155 px; ar and the CJK forms are shorter. NOT measured (NV1, NV9).
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
- **New `tests/e2e/chip-row.spec.ts`** on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; routes `/earth`, `/moon`, `/mars`, `/venus`, `/explore` and the states `/earth?site=ksc`, `/moon?site=apollo11`, `/mars?site=perseverance` (panel open). Per route: **no `.chip-group` element, no chip with `disabled` or `aria-disabled`, no group caption text**; chip order and count per §1.2 (Earth: 8, the labels from the new keys, OBSERVATORIES ≠ SPACE TELESCOPES); all chips of the row share a y band (|Δy| < 8 px) with the panel closed on fine pointer; no `flex-direction: column` on `.ctrl-row.chips` at any pointer; Earth sub-chips are independent (click LAUNCHPADS: STATIONS keeps its `aria-pressed`).
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

## 9. Locales — exactly what changes, in order
Order is the operator's (D3) and the glossary rule: terms first, then keys.
1. **Glossary first.** `scripts/i18n-tools/native-terms.json` has the section `term` (entry shape: `_sense`, `_match`, one form per locale, `_confidence`, as for `trajectory`) and no entry for either word (checked: `observatory`, `space telescope` absent from every section at `50b3e962a8d`).
   Add two entries to `term`: `observatory` (sense "a building or site for astronomical observation on the ground") and `space telescope` (sense "a telescope in orbit"). The forms below are the site's **existing** wording (the `observatory_layer_tip` and `earth_layer_group_space_tip` strings in each `messages/*.json`), not new translations; sources recorded in `sources`.
2. **Two new message keys** in all 14 locales, written by hand inline, applied with the `scripts/i18n-tools/` kit, then `npm run validate-data`: `observatory_layer_chip_ground` (OBSERVATORIES) and `observatory_layer_chip_space` (SPACE TELESCOPES). The old `observatory_layer_chip` ("TELESCOPES", 14 locales) is removed (its only two consumers are `SurfaceScene.svelte:5534, :5587`). The four dead `earth_layer_group_*` keys are removed too (14 locales; no consumer after D1 / D2; `earth_layer_group_ground_tip` / `_space_tip` go with them, the chip tooltips are the two existing tips). `scripts/i18n-tools/en-source-hashes.json` entries for the removed and added keys are updated. No paid translation run (operator rule 2026-10-18).
3. **Per-locale check.** The forms, with the verification that was run (`forms.py` in the scratchpad: casefolded substring of each form in the same locale's existing tip string, all 14 true after the Arabic form was set to the site's `مراصد`):

| Locale | OBSERVATORIES (ground) | SPACE TELESCOPES | found in tip |
|---|---|---|---|
| en-US | OBSERVATORIES | SPACE TELESCOPES | both |
| ar | مراصد | التلسكوبات الفضائية | both |
| de | OBSERVATORIEN | WELTRAUMTELESKOPE | both |
| es | OBSERVATORIOS | TELESCOPIOS ESPACIALES | both |
| fr | OBSERVATOIRES | TÉLESCOPES SPATIAUX | both |
| hi | वेधशालाएँ | अंतरिक्ष दूरबीनें | both |
| it | OSSERVATORI | TELESCOPI SPAZIALI | both |
| ja | 天文台 | 宇宙望遠鏡 | both |
| ko | 천문대 | 우주 망원경 | both |
| nl | STERRENWACHTEN | RUIMTETELESCOPEN | both |
| pt-BR | OBSERVATÓRIOS | TELESCÓPIOS ESPACIAIS | both |
| ru | ОБСЕРВАТОРИИ | КОСМИЧЕСКИЕ ТЕЛЕСКОПЫ | both |
| sr-Cyrl | ОПСЕРВАТОРИЈЕ | СВЕМИРСКИ ТЕЛЕСКОПИ | both |
| zh-CN | 天文台 | 空间望远镜 | both |
   The operator already named three of them (de "Observatorien", ja "天文台", sr-Cyrl "Опсерваторије"); all three match the table. After the change `a5-check.py` re-verifies per locale that the two values differ and equal the glossary form, and `git diff --stat -- messages src/lib/paraglide scripts/i18n-tools` is shown (14 `messages/*.json` + `native-terms.json` + `en-source-hashes.json` + the generated paraglide files, nothing else).
   Layout risk to shoot: ru and es (the longest SPACE TELESCOPES, §4), de, and ar in RTL (the row follows `dir`, logical properties `margin-inline`; the roving arrow keys of A4 swap).
4. The **tooltips stay as they are** (`observatory_layer_tip`, `earth_layer_tip_telescopes`): both are accurate for the new labels.

## 10. Decisions and open questions (operator)
Decided: everything in §0a. **One thing is genuinely open** and it is a consequence the operator did not state:
- **O1 Moon orbiters on Earth after the masters are gone.** Today the IN SPACE master also switches the Moon orbiters drawn in the Earth view (`SurfaceScene.svelte:3846`); there is no other chip for them. (a) **No chip: they are always shown with the orbit view (the reading of "Earth's master switches are dropped")** (recommended: smallest change, matches D2 literally). (b) Earth keeps a plain ORBITERS chip that switches only Moon orbiters (adds a ninth chip and a label that means something different from ORBITERS on the Moon page).
Small defaults taken in this brief without asking (change them on the sheets if wrong): Earth row order = ground chips then space chips in today's relative order; testids unchanged; the four dead `earth_layer_group_*` keys removed with the rest of the locale pass.

## 11. Check (re-run by the independent checker; must print `A5-CHECK violations: 0`)
Baseline at `50b3e962a8d`: **75 violations**, kinds as in §5. The script is `a5-check.py` (below), saved in the session scratchpad and not added to the repo; run from the repo root as `python3 a5-check.py`. Allow marker: `a5-keep: <why>` on the line or the line above.
```python
import re, os, json
from collections import Counter
viol = []
def lines(f): return open(f).read().splitlines()
def keep(ls, i): return 'a5-keep' in ls[i] or (i > 0 and 'a5-keep' in ls[i-1])
SS = 'src/lib/surface-scene/SurfaceScene.svelte'
LCR = 'src/lib/components/LayerChipRow.svelte'
HUD = 'src/routes/explore/HudControls.svelte'
EXP = 'src/routes/explore/+page.svelte'
LOCALES = ['ar', 'de', 'en-US', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN']
NEW_KEYS = ('observatory_layer_chip_ground', 'observatory_layer_chip_space')
OLD_KEYS = ('earth_layer_group_ground', 'earth_layer_group_space', 'earth_layer_group_ground_tip',
            'earth_layer_group_space_tip', 'observatory_layer_chip')

# 1. vertical column rules (Explore and Worlds)
for f in (SS, HUD):
    src = open(f).read(); m = re.search(r'<style[^>]*>(.*?)</style>', src, re.S)
    css = m.group(1); base = src[:m.start(1)].count('\n') + 1
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(re.sub(r'/\*.*?\*/', '', rm.group(1), flags=re.S).split())
        if '.ctrl-row.chips' in sel and re.search(r'flex-direction:\s*column', rm.group(2)) and 'a5-keep' not in rm.group(0):
            viol.append(('COLUMN', f, base + css[:rm.start(2)].count('\n'), sel))

# 2. group header / master machinery in LayerChipRow (decided: no groups, no masters)
ls = lines(LCR)
for i, l in enumerate(ls):
    if re.search(r'chip\.header|header\?:|class="chip-group"|\.chip-group|flex-basis:\s*100%|group-label|class="dot"|\.dot\b|disabled\?:|chip\.disabled|isDisabled', l) and not keep(ls, i):
        viol.append(('GROUP-HEADER-OR-GATE', LCR, i + 1, l.strip()[:70]))

# 3. SurfaceScene: group keys, master state, sub-chip gating, header flags, old telescope label key
ls = lines(SS)
for i, l in enumerate(ls):
    if re.search(r'm\.earth_layer_group_', l) and not keep(ls, i): viol.append(('GROUP-KEY', SS, i + 1, l.strip()[:70]))
    if re.search(r'\blayerGround\b', l) and not keep(ls, i): viol.append(('GROUND-MASTER-STATE', SS, i + 1, l.strip()[:70]))
    if re.search(r'disabled:\s*\(\)\s*=>\s*!layer(Ground|Orbiters)', l) and not keep(ls, i): viol.append(('SUBCHIP-GATE', SS, i + 1, l.strip()[:70]))
    if re.search(r'^\s*header(:|,)', l) and not keep(ls, i): viol.append(('HEADER-FLAG', SS, i + 1, l.strip()[:70]))
    if re.search(r'earthGroups', l) and not keep(ls, i): viol.append(('EARTH-GROUPS-BRANCH', SS, i + 1, l.strip()[:70]))
    if re.search(r'm\.observatory_layer_chip\(\)', l) and not keep(ls, i): viol.append(('TELESCOPES-LABEL', SS, i + 1, l.strip()[:70]))

# 4. Explore uses the same row component
if not any('LayerChipRow' in l and 'import' in l for l in lines(HUD)):
    viol.append(('EXPLORE-NOT-SHARED', HUD, 1, 'HudControls does not use LayerChipRow'))

# 5. constants that only existed because of the tall column
for i, l in enumerate(ls):
    if 'top: 152px' in l and not keep(ls, i): viol.append(('HARD-TOP-OFFSET', SS, i + 1, l.strip()))
    if "querySelector('.hud-controls')" in l and not keep(ls, i): viol.append(('CHIP-DRIVEN-RULER-SHIFT', SS, i + 1, l.strip()))
    if re.search(r'saves ~94 px of column|vertical column|chip column|chip rail returns', l) and not keep(ls, i): viol.append(('STALE-COMMENT', SS, i + 1, l.strip()[:70]))
es = lines(EXP)
for i, l in enumerate(es):
    if re.search(r'--ruler-top-clear:\s*376px|--ruler-left:\s*196px', l) and not keep(es, i): viol.append(('HARD-RULER-OFFSET', EXP, i + 1, l.strip()))

# 6. locales: new keys everywhere, old keys gone, the two chips differ, ground form = the site's existing observatory form
for key in OLD_KEYS:
    have = [lc for lc in LOCALES if key in json.load(open(f'messages/{lc}.json'))]
    if have: viol.append(('LOCALE-OLD-KEY-STILL-PRESENT', f'messages/*.json', 0, f'{key} in {len(have)} locales'))
for key in NEW_KEYS:
    missing = [lc for lc in LOCALES if not json.load(open(f'messages/{lc}.json')).get(key)]
    if missing: viol.append(('LOCALE-NEW-KEY-MISSING', 'messages/*.json', 0, f'{key} missing in {len(missing)} locales'))
if all(os.path.exists(f'messages/{lc}.json') for lc in LOCALES):
    for lc in LOCALES:
        d = json.load(open(f'messages/{lc}.json'))
        g, s = d.get(NEW_KEYS[0], ''), d.get(NEW_KEYS[1], '')
        if g and s:
            if g.casefold() == s.casefold(): viol.append(('LOCALE-CHIPS-IDENTICAL', f'messages/{lc}.json', 0, g))
            if g.casefold() not in d.get('observatory_layer_tip', '').casefold(): viol.append(('LOCALE-GROUND-FORM-DRIFT', f'messages/{lc}.json', 0, g))
            gl = json.load(open('scripts/i18n-tools/native-terms.json')).get('term', {})
            for term, val, kind in (('observatory', g, 'GROUND'), ('space telescope', s, 'SPACE')):
                form = gl.get(term, {}).get(lc)
                if form and val.casefold() != form.casefold(): viol.append((f'LOCALE-{kind}-NOT-GLOSSARY-FORM', f'messages/{lc}.json', 0, val))

# 7. glossary first: both terms exist under "term" with 13 locale forms
nt = json.load(open('scripts/i18n-tools/native-terms.json')).get('term', {})
for t in ('observatory', 'space telescope'):
    e = nt.get(t)
    if not e: viol.append(('GLOSSARY-TERM-MISSING', 'scripts/i18n-tools/native-terms.json', 0, t))
    elif sum(1 for lc in LOCALES if lc != 'en-US' and e.get(lc)) < 13: viol.append(('GLOSSARY-TERM-INCOMPLETE', 'scripts/i18n-tools/native-terms.json', 0, t))

# 8. deliverables
for p, k in (('tests/e2e/chip-row.spec.ts', 'NO-E2E'), ('docs/uxs/decisions/UXD-015-flat-chip-row.md', 'NO-UXD')):
    if not os.path.exists(p): viol.append((k, p, 1, 'file missing'))

for k, f, l, t in viol: print(f'{k:30} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in viol)))
print(f'A5-CHECK violations: {len(viol)}')
```
Known limits: it checks names, constants and locale values, not layout. It does not measure overlap, wrapping or the rendered caption absence; `chip-row.spec.ts` does. `GROUP-HEADER-OR-GATE` and `GROUND-MASTER-STATE` count lines (one construct can span several). The `STALE-COMMENT` regex also matches the words "chip column" and "vertical column" in any new comment, so new comments must not use them. The glossary form comparison assumes the glossary stores one string per locale (not a list); if the real entries use `_match` lists only, the comparison reads the plain locale key.

## 12. Acceptance (definition of done)
1. `python3 a5-check.py` prints `A5-CHECK violations: 0`.
2. On `/earth`, `/moon`, `/mars`, `/venus`, `/explore` the layer chips are one horizontal flat row in the membership and order of §1.2, from one component, with no caption, no group, no greyed chip; no vertical column at any pointer.
3. `chip-row.spec.ts` plus the extended `footer-dock.spec.ts` green on desktop-chromium, mobile-chromium, mobile-landscape-chromium at 1440×900, 1366×768, 1280×720, 1100×700, 800×375 and in the three site-selected states: no intersection between the chip row and the ruler, index panel, detail panel, distance scale, nation legend and the view-control row; nothing skipped.
4. Glossary entries added first; the two new keys in all 14 locales with the per-locale check of §9 shown; old keys removed; `validate-data` green.
5. Docs of §8 written; UXD-015 `accepted`; CHANGE-INVENTORY row A5 updated.
6. The operator receives the sheets of §13 and answers O1.

### Appendix — draft `docs/uxs/decisions/UXD-015-flat-chip-row.md` (proposed; written when the go comes)
```markdown
# UXD-015 — Layer chips are one flat horizontal row on Explore and every world

- **Status**: proposed
- **Date**: 2026-11-12 (proposed)
- **Decider**: the operator, 2026-11-12 (flat row on every world; Earth's master switches dropped; OBSERVATORIES / SPACE TELESCOPES). Inputs: C2, W7, plan Q5
- **Answers**: C2, W7; slice A5
- **Changes**: `LayerChipRow.svelte`, `SurfaceScene.svelte`, `explore/HudControls.svelte`, `explore/+page.svelte` (ruler constants); messages (two new keys, five removed);
  `scripts/i18n-tools/native-terms.json`; IA §controls; Design System §5.7; AGENTS.md; `src/lib/components/README.md`

## Context
At `81e0d43c0dd` Earth showed its layers as a column of 10 items with two full-row headers (ON EARTH / IN SPACE) that were master switches, reaching about 534 px down and into the orbit ruler on short windows; Moon, Mars and Venus showed flat lists; Explore had five inline chips; two Earth chips were both labelled TELESCOPES.

## Options
1. Group every world (ON GROUND / IN SPACE). 2. Flatten Earth and every world. 3. Two stacked rows.

## Decision
Option 2: one flat horizontal row of chips on Explore and every world, no captions, no groups, no master switches; Earth's two telescope chips are OBSERVATORIES and SPACE TELESCOPES (both terms in the glossary first). The chip look is UXD-014.

## Consequences
The layer block drops from about 420 px of column to 30–66 px of row; the chip-driven ruler shift is deleted; Earth sub-chips are independent toggles; Moon orbiters on Earth have no switch (O1); two keys added and five removed in 14 locales; the worlds' HUD baselines regenerate once with A4.

## Verification
`tests/e2e/chip-row.spec.ts` and `footer-dock.spec.ts` on three projects; `a5-check.py` prints `A5-CHECK violations: 0`.
```

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
