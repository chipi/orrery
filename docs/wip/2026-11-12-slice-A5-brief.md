# Slice A5 brief — chip groups and the layout of the chip row (C2, W7)

Read-only brief, written at HEAD `81e0d43c0dd` (A1 type scale, A2 page shell, A3 accent tokens landed; A4 is briefed, not built). Baseline check:
`2026-11-12-slice-A5-baseline-hits.txt` (30 lines, **30 violations**). Method: `git grep` and a Python CSS-rule scan from the repo root, every `file:line`
below was read at that commit. No browser, no build, no test run: every width, height and position below is arithmetic from CSS and message strings, not a
measurement (see §14, NOT VERIFIED).

## 0. The point list

| ID | Operator text (plan lines 69, 272, 331, 408) | State at HEAD |
|---|---|---|
| C2 | Earth groups chips in 2 sections; the current solution is not good. | `/earth` only: two full-row header buttons ON EARTH / IN SPACE inside a vertical column (`LayerChipRow.svelte:53–66`, `:83–117`; config `SurfaceScene.svelte:5450–5614`) |
| W7 | Earth groups chips in 2 groups (on Earth / in space); other worlds don't; make it consistent. | `/moon`, `/mars`, `/venus` render a flat list (`earthGroups` false, `SurfaceScene.svelte:5449`, `:5470`, `:5472`) |
| Plan row A5 | "Q5: group every world (On ground / In space) or flatten Earth" — done when "Earth column no longer collides with the ruler at 768 px high" | see §1 Cascade: the second half is outdated |
| Q5 | Chip groups: group every world, or flatten Earth? | answered in §8 (Q1 below) with the new row layout in view |

## 1. Cascade — what the earlier slices and the 2026-11-12 decision change in A5

### What changed since the plan row was written
| Source | What it fixes for A5 | Plan / earlier-brief ideas that are now outdated (NOT carried forward) |
|---|---|---|
| **Operator 2026-11-12: layer chips on Explore AND Worlds (Earth, Moon, Mars, Venus) become a HORIZONTAL row** | Grouping means groups along a row, not headers inside a column. "Collides with the ruler" becomes "does the row (1–2 lines) reach the ruler / index panel / detail panel", a different and smaller problem (§4). | The words "Earth **column**" in the plan row and in the done-when. The whole premise of C2's collision test ("at 768 px high"): a row ends about 180 px from the top, a column ends about 534 px (§4). A4 brief §9 **Q5(a)** "keep the vertical left column on desktop at 30 px, about 180 px for 5 chips" and §3.2 "Explore column keeps stacking vertically": superseded. The A4 `a4-keep` markers on `.ctrl-row.chips` column / drawer / short-window rules (A4 §5) are column rules and become A5's to rewrite or delete. |
| **A1 / UXD-002** type scale | Group caption is `--size-label` (11 px), colour `--color-text-label` (60 % white; text under 12 px keeps alpha >= .58). | `LayerChipRow.svelte:93` hairline `letter-spacing: 2px` caption and its `rgba(255,255,255,.72)` literal; the 32 px high header (`min-height: 32px`, `:91`); the `8.5 px` phone comment at `SurfaceScene.svelte:7440` (stale, the font is 11 px). |
| **A2 / UXD-012** page shell | The section-label recipe exists (`.page-section-label`: Space Mono 11 px 700 uppercase 3 px spacing 60 % white). A group caption IS a small section label, so it reuses that recipe (tokens `--size-label`, `--color-text-label`), no new typographic look. A2's lesson (a scoped component rule `0,2,1` beats a global class `0,1,0`) applies: the old `LayerChipRow` `.chip-group` / `.group-label` rules MUST be deleted, not overridden. Scene routes are on A2's allow-list, so A5 does not touch page-shell. | Letting the caption pick its own spacing (2 px today). |
| **A3 / UXD-001** accent tokens | Colours come only from `--color-accent` family, `--color-state` (hover, small text), `--color-focus` (outline). The group's master dot and the frame use them. Contrast rule: solid accent fills take dark text `#04040c`. Operator memory "no cyan/teal". | `.chip-group .dot { border: 1px solid var(--body-tint, var(--color-accent)) }` and its `:focus-visible { outline: 1px solid var(--body-tint, …) }` (`LayerChipRow.svelte:105–121`): the 1 px focus ring and tint fall back are pre-A3 style; the outline must be A4's 2 px `--color-focus`. |
| **A4 / UXD-014 (proposed)** one chip | The chip look (30 px fine pointer / 44 px coarse, 4 px radius, 11 px, one active colour, `.ui-chip`, `.ui-chip-group`, `Chip kind="toggle"`, `--chip-tone`). A5 defines NO chip look. A5 owns: which chips are in which group, order, caption text, the row's layout/wrapping, and the group frame. | A4's own deferred items: `LayerChipRow .chip-group` header "A5 designs it" (A4 §5 allow-list); `--chip-tone` / `.ui-chip-group` hook "A5 builds on" (A4 UXD-014 Consequences). Chip heights in this brief use A4's 30 / 44, not today's 34 / 44 (`SurfaceScene.svelte:7561`). A4 Q3 (one active colour vs `--body-tint`) must be answered first: it decides whether a group frame or dot may carry the world tint (Q4 below). |

Dependency order: A5 is built **after** A4 (the row is made of `Chip` + `ChipGroup`; before A4 exists A5 would have to restyle 3 different chip recipes).
If A4 is not signed off yet, A5's layout work can be prototyped (§11) but not implemented.

### Adjacent items that serve the same idea (fold in, or leave)
| Item | Where | Decision | Reason |
|---|---|---|---|
| Chip-driven ruler shift (the effect that publishes `--ruler-left` when the chip column reaches the ruler) | `SurfaceScene.svelte:1163–1213`, chip loop `:1186–1197` | **FOLD IN: delete the chip part** | exists only because of the column (comment `:1163–1165` says so); with a row the check is dead code and a wrong rule. Keep the `.locate-me` branch (`:1198–1203`) and the footer lift (`:1207–1213`) |
| Explore ruler constants `--ruler-top-clear: 376px` and `--ruler-left: 196px` | `explore/+page.svelte:2300–2320` (comment "left rail PLANETS…ICONIC MISSIONS chips, 124–368 px") | **FOLD IN: recompute for the row** | both numbers are the old column's extent |
| Object-index side panel `top: 152px` (hard-coded "under the buttons") | `SurfaceScene.svelte:7066` (`max-height: 500px` variant `:7081`) | **FOLD IN: top = published HUD bottom + 8** | a two-line Earth row ends at about 180 px (§4), under it; the panel would be drawn over line 2 of the chips |
| Explore chips use inline buttons because `LayerChipRow` cannot carry `data-audio-stage` | `HudControls.svelte:100–159` | **FOLD IN: Explore renders `LayerChipRow`** | one row component for Explore and Worlds is the point of the 2026-11-12 decision; A4's `...rest` props removes the blocker. Explore has NO groups (§3) |
| Touch drawer (Layers tab) group headers are full-row bands (`flex-basis: 100%`) | `LayerChipRow.svelte:88`; drawer `SurfaceScene.svelte:5673`, `HudControls.svelte:852–860` | **FOLD IN** | same component; inline captions are shorter than 38 px bands (§4 phone numbers) |
| The view-control row above the chips (2D/3D, RESET VIEW, SPIN, AR, SKY) | `SurfaceScene.svelte:5624–5657`, `HudControls.svelte:75–99` | **LEAVE for A4** (its look, Q4 there) | A5 only fixes its position: row 1 view controls, row 2 layers. Merging both rows into one is not proposed (Earth's layer row alone is about 1000 px wide) |
| `ScaleNav` flush right at the solar scale, `top: 8px` | `explore/ScaleNav.svelte:77–91` | **LEAVE** | on the right, above the chip rows (y about 8–42 vs row at about 110+); E8 belongs to A4 |
| Explore PATHS legend list (280 px, hangs under the chip block at `top: 100%`) | `HudControls.svelte:803–827` | **LEAVE (verify)** | anchored to the block's bottom, so it moves up automatically when the block shortens; verify in the shot |
| Detail-panel clearance of the row (panel is `--panel-width`, 400 px) | altitude indicator uses `right: calc(var(--panel-width) + 12px)` `SurfaceScene.svelte:8044` | **FOLD IN: the row's `max-width`** | when the panel is open the row has about 400 px less; with the row wrapping by group this is the only clean way to avoid sliding under the panel |
| Earth `locate-me` (bottom-left) | `earth/+page.svelte:244` | **LEAVE** | bottom-left, independent of the top row |
| Missions/fleet filter groups, programs group-by | A4 / MI3 | **LEAVE** | different surfaces, different data |
| Footer-dock "no two HUD parts intersect" spec | `tests/e2e/footer-dock.spec.ts:125–168` (Explore) | **FOLD IN: extend to Worlds** | selector `.ctrl-row.chips` is kept by A5 so the existing spec keeps working; add the four worlds (§7) |
| Explore science-lens extra chips (HR / Light-cone) | comment `HudControls.svelte:511` | **LEAVE (NV)** | the markup was not found in the file read; see §14 NV9 |

## 2. Inventory — the chip groups today

### 2.1 Components and CSS (all `file:line` read at HEAD)
| Piece | Where | What it does |
|---|---|---|
| `LayerChipRow.svelte` (144 lines) | `src/lib/components/` | config array → buttons; `header?: boolean` renders a `<button class="chip-group">` with a dot and a label (`:53–66`); `.chip-group` is `flex-basis:100%`, 32 px, label 11 px ls 2 px, hairline `::after` rule (`:86–117`); `.chip.disabled` opacity .42 (`:140`) |
| Worlds config | `SurfaceScene.svelte:5445–5622` (`layerChips` snippet) | flat for Moon / Mars / Venus; grouped for Earth (`earthGroups = config.earthOrbitalLayers?.satellites != null`, `:5449`) |
| Chip row wrapper | `.ctrl-row.chips` markup `:5458`; CSS `:7427–7436` (phone: row, wrap, `max-width: calc(100vw - 24px)`), `:7541–7550` (fine pointer: **column**, `width: max-content; min-width: 140px`) | |
| HUD container | `.hud-controls` `:7086–7100` fixed, `top: calc(var(--nav-height) + 12px)`, `left: 36px` on fine pointer (`:7535–7540`, clears the 28 px index tab), display `none` on touch (`:7096`) | |
| Touch | `MobileDrawerGroup` tab LAYERS renders the same `layerChips` snippet (`:5673`); drawer body `max-height: 46vh`, landscape `min(46vh, 240px)` (`MobileDrawerGroup.svelte:262`, `:375`); `.hud-top-mobile` holds 2D / Reset / Spin on touch (`:7580–7592`) | |
| Explore | `HudControls.svelte:102–159` five inline buttons, no groups; CSS `.ctrl-row.chips` row + horizontal scroll on phone `:510–524`, **column** from 769 px on fine pointer `:828–837`; `.hud-controls` fixed `top: calc(var(--nav-height) + 8px)` / `+12px` at 501 px, `left: 16px`, z 45 `:482–503`, `:786–791`; the PATHS legend hangs below `:803–827` | |

### 2.2 Chip lists per world (en-US strings, from `messages/en-US.json`; render order today)
| Route | Chips in order today | Groups today |
|---|---|---|
| `/explore` | PLANETS, DWARFS, COMETS, ISM (`ui_layer_interstellar_short`), ICONIC MISSIONS (`HudControls.svelte:103–158`) | none (not a world: these are object classes, no ground/space) |
| `/moon` | SURFACE · AUTO, ORBITERS, ORBITS, TRAVERSES (`loadTraverses={loadMoonTraverses}` `moon/+page.svelte:273`) | none |
| `/mars` | SURFACE · AUTO, ORBITERS, ORBITS, TRAVERSES (`loadTraverses={loadMarsTraverses}` `mars/+page.svelte:254`) | none |
| `/venus` | SURFACE · AUTO, ORBITERS, ORBITS (no traverses, `venus/+page.svelte:66–72`) | none |
| `/earth` | SURFACE · AUTO, **[ON EARTH]**, LAUNCHPADS, MUSEUMS, TELESCOPES, **[IN SPACE]**, STATIONS, TELESCOPES, CONSTELLATIONS, COMSATS (ORBITS hidden: `visible: config.earthOrbitalLayers == null`, `:5510`) | 2 headers; ON EARTH = master `layerGround` (testid `layer-group-earth`), IN SPACE = the ORBITERS master (testid `layer-orbiters`); the 4 + 3 sub-chips go `disabled` when their master is off (`:5497`, `:5524`, `:5541`, `:5582–5607`) |

Facts that shape the proposal:
1. **Two TELESCOPES chips exist on Earth** (ground observatories `:5533`, space telescopes `:5585`): the groups are the only disambiguation (comment `:5586` says so). Flattening Earth (the plan's alternative) forces renaming one of them (new keys in 14 locales) and drops the masters; see Q1.
2. **The group labels are Earth-only message keys:** `earth_layer_group_ground` = "ON EARTH", `earth_layer_group_space` = "IN SPACE", and `_tip` keys (`messages/en-US.json`; de "AUF DER ERDE" / "IM WELTRAUM", sr-Cyrl "НА ЗЕМЉИ" / "У СВЕМИРУ", ja "地上" / "宇宙", ar "على الأرض" / "في الفضاء"). "ON EARTH" cannot be reused on the Moon; the plan's wording is "On ground / In space".
3. **The SURFACE chip is not a layer toggle but a 4-state cycle** (AUTO / HIGH / LOW / OFF, `cycleSurfaceMode`, label `SURFACE · AUTO` = 14 characters, the longest of the Moon/Mars/Venus set) and it is ungated by any master.
4. **Tests that name the groups:** `earth.spec.ts:98–123` (`layer-group-earth`, `layer-orbiters`, sub-chips `toBeDisabled`), `mobile-layout.spec.ts:64–110` (`.mdg-body .chip-group` first two chips share a row, per route `/explore /earth /moon /mars`), `mars.spec.ts:62–64`, `footer-dock.spec.ts:140, 189` (`.ctrl-row.chips`).

## 3. Proposal

### 3.1 Recommended — Option A: one horizontal row; two groups, ON GROUND then IN SPACE, on every world; Explore flat
Components (from A4, no new chip look): `ChipGroup` gets a `label` (caption) and wraps `Chip kind="toggle"` members. `LayerChipRow` keeps its config-array API and gains `group: 'ground' | 'space'` on each chip (replacing the `header` flag: the group head is no longer a pseudo-chip in the list). It emits, in order, `<div class="ui-chip-group" role="group" aria-label="…">` per group, so assistive tech reads "ON GROUND, group" instead of a button in a flat list.
- **Group anatomy:** `[ caption | chip chip chip ]`: caption is plain text at the left of its chips, `--size-label` 11 px, `--color-text-label`, uppercase, spacing as A2's section label (3 px), no box. Between groups a 12 px gap and a 1 px vertical hairline `rgba(255,255,255,.18)`; no frame around the group (a frame around 4 chips plus A4's 4 px chip corners reads as nested boxes).
- **Master switch where it exists:** on `/earth` the caption becomes a button (A4 `Chip kind="toggle" quiet` with the 8 px dot, filled when on) because ON EARTH really switches LAUNCHPADS / MUSEUMS / TELESCOPES and IN SPACE is the ORBITERS master. On Moon / Mars / Venus the caption is text only (nothing to gate: Q2). The dot is the only visual difference, so the two read as one pattern.
- **Order and membership (every world):**
  | Route | ON GROUND | IN SPACE |
  |---|---|---|
  | `/earth` | SURFACE · AUTO, LAUNCHPADS, MUSEUMS, TELESCOPES | (ORBITERS master as caption) STATIONS, TELESCOPES, CONSTELLATIONS, COMSATS |
  | `/moon` | SURFACE · AUTO, TRAVERSES | ORBITERS, ORBITS |
  | `/mars` | SURFACE · AUTO, TRAVERSES | ORBITERS, ORBITS |
  | `/venus` | SURFACE · AUTO | ORBITERS, ORBITS |
  | `/explore` | no groups: one row PLANETS · DWARFS · COMETS · ISM · ICONIC MISSIONS | — |
  SURFACE moves into ON GROUND on Earth (today it stands ahead of both groups); it stays outside the ground master's gating (the master gates the three sub-layers named in `earth_layer_group_ground_tip`). On Moon and Mars TRAVERSES moves before ORBITERS (DOM order only; tests use `getByTestId`).
- **ORBITS** (Moon / Mars / Venus) is the per-orbiter ring layer, so it belongs with the orbiters in IN SPACE. It is not gated by ORBITERS today; A5 does not add gating (behaviour change, Q2).
- **Where it sits (fine pointer):** unchanged anchor: `.hud-controls` fixed at `top: nav + 12`, `left: 36` (Worlds) / `top: nav + 8 → +12`, `left: 16` (Explore). Row 1 = view controls (2D/3D, RESET VIEW, SPIN, AR, SKY, A4 Q4 look); row 2 = the layer groups with `flex-wrap: wrap; column-gap: 12 px; row-gap: 6 px`; a group never splits (`flex: 0 0 auto` on the group; its chips may not wrap inside it), so a narrow window breaks between ON GROUND and IN SPACE, not inside them. `max-width: calc(100vw - 36px - 16px - var(--surface-panel-open, 0px))` so it stops before an open detail panel.
- **Wrapping on touch (phone / landscape):** chips live in the LAYERS drawer (display none on touch for `.hud-controls`). Each group is an inline-flex wrap run: the caption is the first item of the group, chips are 44 px, row gap 6. A group may wrap internally on a phone (caption + 2 chips per line at 358 px inner width), groups start on a new line.
- **Sizes (arithmetic: Space Mono advance 0.6 em = 6.6 px at 11 px + 1 px spacing = 7.6 px per character, chip = text + 24 px padding + 2 px border; the caption at 3 px spacing = 9.6 px per character, so ON GROUND ≈ 86 px, IN SPACE ≈ 77 px):**
  | Route | Group widths | Row total (one line) | Chips only |
  |---|---|---|---|
  | `/explore` | flat | ≈ 435 | 79 + 72 + 72 + 49 + 140 + 4 × 6 |
  | `/moon`, `/mars` | ON GROUND ≈ 86 + 132 + 94 + 3 × 6 = 330; IN SPACE ≈ 77 + 87 + 72 + 3 × 6 = 254 | ≈ 596 with a 12 px gap | |
  | `/venus` | ON GROUND ≈ 86 + 132 + 12 = 230; IN SPACE 254 | ≈ 496 | |
  | `/earth` | ON GROUND ≈ 86 + 132 + 102 + 79 + 102 + 4 × 6 = 525; IN SPACE ≈ 77 + 87 + 102 + 132 + 79 + 4 × 6 = 501 | ≈ 1038 | |
- **Reads on each world:** Moon: `ON GROUND  SURFACE · AUTO  TRAVERSES │ IN SPACE  ORBITERS  ORBITS`; Mars identical; Venus: `ON GROUND  SURFACE · AUTO │ IN SPACE  ORBITERS  ORBITS`; Earth: `● ON GROUND  SURFACE · AUTO  LAUNCHPADS  MUSEUMS  TELESCOPES │ ● IN SPACE  STATIONS  TELESCOPES  CONSTELLATIONS  COMSATS`; Explore: `PLANETS  DWARFS  COMETS  ISM  ICONIC MISSIONS`.
- **Cost:** two caption strings (one existing key value changes in 14 locales, see §9), three CSS rule sets replaced, `LayerChipRow` interface change (the `header` flag goes).

### 3.2 Option B — two stacked rows, one per group (caption in a fixed left column)
`ON GROUND` row, then `IN SPACE` row, captions aligned in an 88 px column, chips left-aligned after it. Height is always 2 lines (30 + 6 + 30 = 66 px at 30 px chips) on every Worlds route; Explore stays 1 line.
- **Where / wrap:** never wraps sideways on desktop (longest line is Earth ON GROUND ≈ 525 + 88 = 613 px; fits next to a 400 px panel at 1280). On touch the same two blocks, each wrapping inside its block.
- **Moves out of the way:** same as A, but height is constant (66 px), so the object-index top and the ruler offset are constants and the e2e checks are simple.
- **Pros:** predictable height, aligned columns, no wrap surprise when the panel opens. **Cons:** more vertical space than A on Moon / Mars / Venus (A fits one 30 px line at 1280 + closed panel); sparse rows (Moon IN SPACE has two chips); C1 asked for less vertical space.

### 3.3 Option C — one flat row, no groups (flatten Earth too)
- **Where:** same anchor as A; Moon / Mars / Venus rows are 3–4 chips; Earth is 9 chips, ≈ 1000 px, wrapping to two lines when the panel is open at any width under ≈ 1500 px.
- **Cost:** two chips named TELESCOPES on Earth cannot stay: rename (new keys e.g. "GROUND TELESCOPES" / "SPACE TELESCOPES" in 14 locales, longer chips: ≈ +100 px) and the masters (ON EARTH, IN SPACE) disappear, so the 4 + 3 sub-chip `disabled` logic and `earth.spec.ts:98–123` change. No per-world group vocabulary. Fewest rules, lowest clarity on Earth. Not recommended.

### 3.4 Recommendation
**A.** It answers W7 (every world reads the same two groups in the same order), keeps the Earth masters and tests, gives wrap points that follow meaning, and halves the height versus B on three of four worlds. B is the fallback if the operator prefers a fixed height over compactness.

## 4. Space budget — where the row sits at five viewports (CSS arithmetic, no browser)
Fixed numbers: nav bar 60 px (`tokens.css:75`); `.hud-controls` top = nav + 12 = **72 px** (Worlds), left **36 px**; row 1 (view controls, A4: 30 px) = 72–102; gap 8; row 2 top **110 px**; chip 30 px; row gap 6. One-line row 2 ends at **140 px**; a two-line row 2 ends at **176 px**. Detail panel width 400 px, right edge `12 px`. Ruler: 208 px wide, `bottom` 14 px (`anchorBottomPx={14}` on moon/mars; Earth uses its own), left 12 px, z-index 1 (behind everything), height capped at `min(100vh − nav − 140, …)` (`OrbitRuler.svelte:202`); its top at 720 high is not computed (NV3).
| Viewport (pointer) | Row 2 at 1 line? (panel closed) | With 400 px panel open | Ruler / index panel | Flag |
|---|---|---|---|---|
| **1440 × 900** (fine) | Earth 36 + 1038 = 1074 < 1440 − 16 → 1 line, ends 140 px | 1440 − 400 − 12 − 36 = 992 < 1038 → Earth 2 lines (ground / space), ends 176 | ruler top is far below (≈ 900 − 14 − ~270 = ~616); index panel `top: 152` clashes with line 2 → fold-in fix | Earth + open panel + index panel |
| **1366 × 768** (fine) | 1 line | Earth 2 lines (918 < 1038) | the old column (462 px high ending ≈ 534) vs ruler top ≈ 768 − 14 − 270 = 484 collided; with a row (ends ≤ 176) no collision | none after the change |
| **1280 × 720** (fine) | 1 line (1244 > 1074) | 2 lines (832 < 1038); Moon/Mars 596 < 832 fits 1 line | ruler top ≈ 720 − 14 − 270 = 436 ≫ 176: the `--ruler-left` shift (§1 fold-in) no longer triggers | Earth + index panel |
| **851 × 393 landscape** (touch, Pixel 5 landscape) | `.hud-controls` hidden; chips in the LAYERS drawer, `max-height: min(46vh, 240px)` = 180 px; Earth in 44 px chips ≈ 5 lines × 44 + 4 × 6 = 244 px > 180 | n/a | drawer scrolls (exists: `.mdg-body` overflow) ; inline captions save the 2 × 38 px header bands vs today | Earth scrolls inside the drawer (accepted today for the 4 + 3 sub-chips; verify) |
| **390 × 844 phone** (touch) | in the LAYERS drawer, `max-height: 46vh` = 388 px, inner width ≈ 358 px | n/a | Earth ≈ 5 lines ≈ 244 px fits; Moon / Mars ≈ 3 lines ≈ 144; Venus ≈ 3 lines | none |
Explore (no groups): 5 chips ≈ 435 px, 1 line at all fine-pointer widths ≥ 600 px; at 1100 × 700 the ScaleNav sits flush right at the solar scale at y 8–42 (no clash: row 2 is at ≥ 110). The PATHS legend (280 px) hangs under the shorter block, 150 px nearer the top than today.
Left-edge neighbours in the top strip: the INDEX pull tab (centred on the left edge, `--index-handle-top`, x 0–28; row starts at x = 36, clear), the A–Z `EntityIndex` tab (bottom of the scene), the nation legend and `locate-me` (bottom-left), the time dock and PLANET SCALES (Explore bottom-left), footer menu (bottom-right; the footer-dock spec covers it).

## 5. Hit list (baseline: 30 violations from `a5-check.sh`, list in `2026-11-12-slice-A5-baseline-hits.txt`)
| Kind | Count | Files |
|---|---|---|
| COLUMN (`.ctrl-row.chips` with `flex-direction: column`) | 2 | `SurfaceScene.svelte:7541`, `HudControls.svelte:828` |
| OLD-HEADER-MARKUP / FULLROW-HEADER | 1 + 1 | `LayerChipRow.svelte:53`, `:88` |
| EARTH-ONLY-GROUP-KEY (`m.earth_layer_group_*`) | 4 | `SurfaceScene.svelte:5452, 5453, 5475, 5476` |
| NO-GROUP (a layer chip config without `group:`) | 11 | `SurfaceScene.svelte:5451 … 5602` |
| EXPLORE-NOT-SHARED | 1 | `HudControls.svelte` (inline chips) |
| CHIP-DRIVEN-RULER-SHIFT | 1 | `SurfaceScene.svelte:1187` |
| HARD-TOP-OFFSET | 1 | `SurfaceScene.svelte:7066` (`top: 152px`) |
| HARD-RULER-OFFSET | 2 | `explore/+page.svelte:2309` (376 px), `:2314` (196 px) |
| STALE-COMMENT (column wording) | 4 | `SurfaceScene.svelte:1165, 7429, 7533, 7556` |
| NO-E2E / NO-UXD | 2 | `tests/e2e/chip-groups.spec.ts`, `docs/uxs/decisions/UXD-015-…` do not exist |
Expected `a5-keep: <why>` markers at the end: none planned (every hit converts or is deleted). The `.locate-me` and footer-lift parts of the ruler effect do not match the check (only the `.hud-controls` query is flagged).

## 6. Allow-list (not touched, with reason)
| Item | Reason |
|---|---|
| Chip look, size, colour, ARIA of the chip | A4 / UXD-014 |
| View-control row look (2D/3D, RESET VIEW, SPIN, AR, SKY) | A4 Q4 |
| Missions / fleet / launches filters, deep-sky, programs group-by | A4, MI2 / MI3 |
| `/fly`, `/plan`, `/iss`, `/tiangong` HUDs | other scene routes with their own controls (A4 §6) |
| `PanelTabRow` tabs, nav toggles | not chips |
| Orbit ruler content and look | only its position in the left rail is in scope |
| Gating of ORBITS / TRAVERSES by a master | behaviour change, Q2 |
| Home, Lab, dev routes | out of the A-series scope |

## 7. Tests
- **New `tests/e2e/chip-groups.spec.ts`** on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; routes `/earth`, `/moon`, `/mars`, `/venus`, `/explore`. Per route and project: the groups exist (`[role="group"][aria-label]` with captions ON GROUND / IN SPACE on the four worlds, none on Explore), order is ground then space, each chip is inside the expected group (membership table in §3.1), a group's chips share a row on fine pointer (|Δy| < 8 px) while the panel is closed, and a group is never split across lines on fine pointer.
- **No-overlap spec** (fine pointer, `test.use({ viewport, hasTouch: false, isMobile: false })`) for the five sizes of the brief: 1440×900, 1366×768, 1280×720, plus 1100×700 and 800×375 from `HUD_SIZES`; assert no two of `.ctrl-row.chips`, `.ruler`, `.surface-index-desktop` (opened), `.detail-panel` (a site selected), `.distance-scale`, `.hud-controls` view row intersect; Explore: add the row to the existing `HUD_PARTS` loop (`footer-dock.spec.ts:134–168`) and make the same loop run for `/earth /moon /mars /venus` (new `WORLD_HUD_PARTS`). Phone and landscape (touch): assert the LAYERS drawer body shows the groups, caption is the first item of its group, no horizontal scroll, chips >= 44 px (A4), and the drawer body scrolls instead of growing past its cap.
- **Update:** `earth.spec.ts:98–123` (group head testids stay `layer-group-earth` / `layer-orbiters`; assertions on sub-chip `toBeDisabled` unchanged), `mobile-layout.spec.ts:64–110` (`.chip-group` selector → `.ui-chip-group`, "first two chips of a group share a row" on touch), `mars.spec.ts:62–64`, `moon.spec.ts` (a TRAVERSES chip order assertion if any: NV8), `explore.spec.ts` / `explore-paths-layer.spec.ts` (selectors for the ICONIC MISSIONS chip: `layer-paths`, `data-audio-stage` kept), `footer-dock.spec.ts` (extend), `visual.spec.ts` surface-HUD and explore baselines.
- **Visual baselines that change (prediction, not a run):** `earth-surface-hud`, `moon-surface-hud`, `mars-surface-hud`, `venus-surface-hud` (desktop; A4 already regenerates them: regenerate once after A5 instead of twice, see §10), the Explore HUD baseline if one exists (NV6).
- **Re-run all three projects:** `earth`, `moon`, `mars`, `hotspots`, `explore`, `explore-paths-layer`, `explore-time-controls`, `explore-scale-picker`, `footer-dock`, `mobile-layout`, `mobile-invariants`, `a11y`, `a11y-keyboard`, `type-floor`, `chip` (A4), `accent-colour`, `smoke`, `i18n-all-routes`.

## 8. Docs
- `docs/uxs/decisions/UXD-015-chip-groups-and-row-layout.md` (status `proposed`; draft in the appendix) and its row in `docs/uxs/decisions/README.md`; `docs/uxs/CHANGE-INVENTORY.md` row A5.
- `docs/uxs/IA.md`: extend A4's `§controls` with "Layer groups: ON GROUND then IN SPACE, caption + chips, row wraps between groups"; `docs/concept/05_Design_System.md`: §5.7 (A4's Chip) gets a sub-section "Chip group" with the anatomy; the section-label token is cited, not redefined.
- UXS specs for surfaces (grep before writing: `UXS-001/002/003/013/014/015` for "chip", "layer", "column", "ruler"; NV7): any line that says the chips are a left column or that the ruler steps right of them is rewritten.
- `AGENTS.md` design block: one paragraph "Layer chips are a horizontal row of groups (`LayerChipRow` + `ChipGroup`, UXD-015); a route does not draw its own chip column; the group labels are the generic keys".
- `src/lib/components/README.md` (Surface HUD line 10: `LayerChipRow` now takes `group`), `src/lib/surface-scene/README.md:21`, `docs/adr/TA.md` (HUD paragraph; one line), ADR-062 and ADR-074 mention `LayerChipRow` (`git grep` at HEAD): check each for column wording.
- Comments to rewrite (rot): `SurfaceScene.svelte:1163–1166`, `:7018–7022`, `:7427–7430`, `:7533`, `:7555–7557`, `:5446–5448`, `explore/+page.svelte:2300–2308`, `HudControls.svelte:480–499`, `:510–514`, `:828–832`, `:863–865`, `LayerChipRow.svelte` header and `.chip-group` comment.

## 9. Locales — exactly what changes
Group captions need ONE generic pair for all four worlds.
- **Keep** `earth_layer_group_space` ("IN SPACE", already generic in en-US; existing value in all 14 locales reused unchanged).
- **Change** `earth_layer_group_ground` value from "ON EARTH" to "ON GROUND" in all 14 locales (a world-neutral word; the existing values name the planet: de "AUF DER ERDE", sr-Cyrl "НА ЗЕМЉИ", ja "地上", ar "على الأرض" etc.; ja "地上" and ar already read as "on the ground / surface", so those two may stay: check each by the glossary). That is 1 key × up to 14 locales.
- **Tooltips:** `earth_layer_group_ground_tip` ("Everything on the ground: launchpads, museums and telescopes") and `earth_layer_group_space_tip` are Earth-specific lists; they stay as the Earth master's tooltip (no tooltip on the text-only captions of Moon / Mars / Venus). 0 new keys.
- **Rename for honesty (optional, Q3):** `earth_layer_group_ground/_space` (+ `_tip`) → `ui_layer_group_ground/_space` (+ `_tip`) = 4 keys renamed in 14 `messages/*.json` + the `m.` calls. If not renamed, the key names lie (a Moon chip uses `earth_…`).
- **No new body names** (the per-world "ON THE MOON / ON MARS" option is rejected: it would need 3 new keys × 14 and glossary entries `scripts/i18n-tools/native-terms.json` class `body`).
- Process (AGENTS rule 12 / glossary first): the ground caption is a term, not a body name: add "on ground" to the glossary if a binding form is wanted, translate by hand, apply with the `scripts/i18n-tools/` kit, then `npm run validate-data`. No paid translation run (operator rule 2026-10-18, 9b: fixes free only). Per-locale check shown after: `git diff --stat -- messages src/lib/paraglide`.
- **Layout risk to shoot:** de ("KOMMUNIKATIONSSATELLITEN", caption "AUF DER ERDE" would be 12 characters → ≈ 115 px at 3 px spacing), ar (RTL: group order and chip order mirror; logical properties `margin-inline`, row direction follows `dir`), sr-Cyrl, ru, ja (no letter-spacing meaning).

## 10. Screenshots for the operator (via dev server, per AGENTS "Iterating on UI"; not Docker)
Prototype by injected CSS on the running dev server, as A4 does: a script injects a `<style>` that sets `.ctrl-row.chips { flex-direction: row; flex-wrap: wrap }`, inserts caption spans (`::before` on the first chip of each group via `data-group` added by `evaluate`), and sets `max-width`. Before (HEAD) and after (injected), desktop 1440×900 and 1280×720 and phone 390×844:
1. `/explore` (flat row; with PATHS on to see the legend), 2. `/moon`, 3. `/mars`, 4. `/venus`, 5. `/earth` with the panel closed, 6. `/earth` with a site selected (panel open, row wraps), 7. `/earth` with the index panel open, 8. `/earth` at 1280×720 (the old ruler-collision case) before and after, 9. `/earth` phone LAYERS drawer, 10. `de` and `ar` of `/earth` desktop. 10 scenes × up to 3 viewports × before/after; small PNGs; the injected CSS is a throwaway in the scratchpad, not committed. Option B (two rows) shot for `/earth` and `/moon` only.
Single regeneration of the visual baselines: if A4 is already merged, the worlds' HUD PNGs regenerate in A4 and again in A5; if the operator agrees, build A4 + A5 HUD baselines in one regeneration pass.

## 11. Questions for the operator (real decisions; recommendation first)
- **Q1 Grouping (the plan's Q5).** (a) **Group every world, ON GROUND then IN SPACE, same order everywhere; Explore stays flat** (recommended: W7; two TELESCOPES chips on Earth need the groups; Moon/Mars/Venus read the same). (b) Flatten Earth (Option C): rename one TELESCOPES chip, drop the two masters. (c) Group only Earth (no change, W7 stays open).
- **Q2 What the group caption does.** (a) **Text on Moon / Mars / Venus; a master switch button only on Earth, where it gates sub-chips today (same look, plus the dot)** (recommended: no behaviour change). (b) Make every caption a master on every world (ON GROUND switches SURFACE/TRAVERSES, IN SPACE switches ORBITERS/ORBITS): consistent but a behaviour change on 3 worlds. (c) Captions never switch anything; drop the Earth masters and the greying of sub-chips (simplest; changes `earth.spec.ts`).
- **Q3 Caption wording and keys.** (a) **ON GROUND / IN SPACE, one existing key's value changed in 14 locales, keys renamed to `ui_layer_group_*`** (recommended: matches the plan's wording; no body names). (b) Same words, keys not renamed (smaller diff, wrong names). (c) Per-world "ON THE MOON / ON MARS / ON VENUS / ON EARTH": 3 new keys + glossary entries in 14 locales.
- **Q4 Layout.** (a) **Option A: one row, groups wrap as units** (recommended). (b) Option B: always two stacked rows, constant height. Also: group separator = hairline between groups (recommended), or a framed cluster per group (heavier).
- **Q5 SURFACE · AUTO chip.** (a) **Inside ON GROUND, first, on every world; outside the master's gating** (recommended: Venus' ON GROUND group would otherwise be empty). (b) Stand alone before the groups on every world (then Venus has one group only).
- **Q6 Explore.** Explore's five chips are object classes, not ground/space. (a) **Flat row in the same component and the same position, no captions** (recommended). (b) Add a caption such as "SHOW" on Explore only: not proposed.

## 12. Check (re-run by the independent checker; must print `A5-CHECK violations: 0`)
Baseline at `81e0d43c0dd`: **30 violations** (2 COLUMN + 1 OLD-HEADER-MARKUP + 1 FULLROW-HEADER + 4 EARTH-ONLY-GROUP-KEY + 11 NO-GROUP + 1 EXPLORE-NOT-SHARED + 1 CHIP-DRIVEN-RULER-SHIFT + 1 HARD-TOP-OFFSET + 2 HARD-RULER-OFFSET + 4 STALE-COMMENT + 2 missing files). The baseline run was made with the script below saved as `a5-check.sh` + `a5-check.py` in the session scratchpad (not added to the repo). Allow marker: `a5-keep: <why>` on the line or the line above / inside the CSS rule. Run from the repo root as `bash a5-check.sh`.
```bash
#!/usr/bin/env bash
set -u
cd "$(git rev-parse --show-toplevel)"
python3 a5-check.py     # the Python below
```
```python
import re, os
from collections import Counter
viol = []
def lines(f): return open(f).read().splitlines()
def keep(ls, i): return 'a5-keep' in ls[i] or (i > 0 and 'a5-keep' in ls[i-1])
SS = 'src/lib/surface-scene/SurfaceScene.svelte'
LCR = 'src/lib/components/LayerChipRow.svelte'
HUD = 'src/routes/explore/HudControls.svelte'
EXP = 'src/routes/explore/+page.svelte'
for f in (SS, HUD):                                   # 1. vertical column rules
    src = open(f).read(); m = re.search(r'<style[^>]*>(.*?)</style>', src, re.S)
    css = m.group(1); base = src[:m.start(1)].count('\n') + 1
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(re.sub(r'/\*.*?\*/', '', rm.group(1), flags=re.S).split())
        if '.ctrl-row.chips' in sel and re.search(r'flex-direction:\s*column', rm.group(2)) and 'a5-keep' not in rm.group(0):
            viol.append(('COLUMN', f, base + css[:rm.start(2)].count('\n'), sel))
ls = lines(LCR)                                       # 2. full-row group header
for i, l in enumerate(ls):
    if re.search(r'flex-basis:\s*100%', l) and not keep(ls, i): viol.append(('FULLROW-HEADER', LCR, i + 1, l.strip()))
    if 'class="chip-group"' in l and not keep(ls, i): viol.append(('OLD-HEADER-MARKUP', LCR, i + 1, l.strip()))
ls = lines(SS)                                        # 3. Earth-only group keys
for i, l in enumerate(ls):
    if re.search(r'm\.earth_layer_group_', l) and not keep(ls, i): viol.append(('EARTH-ONLY-GROUP-KEY', SS, i + 1, l.strip()[:80]))
for i, l in enumerate(ls):                            # 4. every layer chip carries group:
    if re.search(r"testid:\s*'layer-(surface|orbiters|orbits|traverses|launchpads|museums|telescopes|stations|observatories|constellations|comsats)'", l):
        if not re.search(r'\bgroup:', '\n'.join(ls[i:i+10])) and not keep(ls, i): viol.append(('NO-GROUP', SS, i + 1, l.strip()))
if not any('LayerChipRow' in l and 'import' in l for l in lines(HUD)):   # 5. Explore shares the row
    viol.append(('EXPLORE-NOT-SHARED', HUD, 1, 'HudControls does not use LayerChipRow'))
for i, l in enumerate(ls):                            # 6. column-only constants
    if 'top: 152px' in l and not keep(ls, i): viol.append(('HARD-TOP-OFFSET', SS, i + 1, l.strip()))
    if "querySelector('.hud-controls')" in l and not keep(ls, i): viol.append(('CHIP-DRIVEN-RULER-SHIFT', SS, i + 1, l.strip()))
    if re.search(r'saves ~94 px of column|vertical column|chip column', l) and not keep(ls, i): viol.append(('STALE-COMMENT', SS, i + 1, l.strip()[:80]))
ls = lines(EXP)
for i, l in enumerate(ls):
    if re.search(r'--ruler-top-clear:\s*376px|--ruler-left:\s*196px', l) and not keep(ls, i): viol.append(('HARD-RULER-OFFSET', EXP, i + 1, l.strip()))
for p, k in (('tests/e2e/chip-groups.spec.ts', 'NO-E2E'), ('docs/uxs/decisions/UXD-015-chip-groups-and-row-layout.md', 'NO-UXD')):
    if not os.path.exists(p): viol.append((k, p, 1, 'file missing'))
for k, f, l, t in viol: print(f'{k:24} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in viol)))
print(f'A5-CHECK violations: {len(viol)}')
```
Known limits: it checks names and constants, not layout. It does not measure overlap, wrapping, caption text or locale values; `chip-groups.spec.ts` and a per-locale diff do. `NO-GROUP` windows 10 lines after each `testid`; the `orbitersChip` object at `:5450` counts once. The `STALE-COMMENT` regex also matches the words "chip column" in any new comment, so new comments must not use them.

## 13. Acceptance (definition of done)
1. `bash a5-check.sh` prints `A5-CHECK violations: 0`.
2. On `/earth`, `/moon`, `/mars`, `/venus` the chips are one horizontal row of two groups (ON GROUND, IN SPACE) in the membership of §3.1; `/explore` is one flat row from the same component; no vertical column on any pointer.
3. `chip-groups.spec.ts` plus the extended `footer-dock.spec.ts` green on desktop-chromium, mobile-chromium, mobile-landscape-chromium at the five viewports of §4: no intersection between the chip row and the ruler, index panel, detail panel, distance scale and the view-control row; nothing skipped.
4. Docs of §8 written; UXD-015 `accepted`; CHANGE-INVENTORY row A5 updated.
5. Locales: the §9 change shown per locale (`git diff --stat -- messages src/lib/paraglide`), `validate-data` green.
6. The operator received the §10 sheets and answered Q1–Q6.

### Appendix — draft `docs/uxs/decisions/UXD-015-chip-groups-and-row-layout.md` (proposed; written when the go comes)
```markdown
# UXD-015 — Layer chips are a horizontal row of groups on Explore and every world

- **Status**: proposed
- **Date**: 2026-11-12 (proposed)
- **Decider**: the operator — pending. Inputs: C2, W7, plan Q5, operator 2026-11-12 ("layer chips on Explore and the Worlds pages become a horizontal row")
- **Answers**: C2, W7; slice A5
- **Changes**: `LayerChipRow.svelte`, `ChipGroup.svelte` (A4), `SurfaceScene.svelte`, `explore/HudControls.svelte`, `explore/+page.svelte` (ruler constants);
  messages (`ui_layer_group_ground`); IA §controls; Design System §5.7; AGENTS.md; `src/lib/components/README.md`

## Context
At `81e0d43c0dd` Earth showed its layers as a column of 10 items with two full-row headers (ON EARTH / IN SPACE) reaching about 534 px down and into the orbit ruler on
short windows; Moon, Mars and Venus showed flat lists; Explore had five inline chips.

## Options
1. One horizontal row, two groups (ON GROUND, IN SPACE) on every world, groups wrap as units, Explore flat. 2. Two stacked rows (one per group). 3. One flat row, Earth flattened.

## Decision
Option 1. Caption (11 px, label colour, A2 section-label recipe) before the chips of its group; hairline between groups; Earth's captions stay master switches
(dot), the others are text; SURFACE leads ON GROUND everywhere; chip look from UXD-014; the row's width stops before an open detail panel; the ruler and the object-index
panel no longer take their position from the chip column.

## Consequences
Height of the layer block drops from about 420 px to 30–66 px; the chip-driven ruler shift is deleted; one caption key changes value in 14 locales; the
worlds' HUD baselines regenerate once.

## Verification
`tests/e2e/chip-groups.spec.ts` and `footer-dock.spec.ts` on three projects; `a5-check.sh` prints `A5-CHECK violations: 0`.
```

## 14. NOT VERIFIED (what this brief did not check)
- NV1 No browser, no build, no test run. Every width, height and wrap in §3–§4 is arithmetic: 7.6 px per character at 11 px with 1 px spacing (0.6 em Space Mono advance assumed, not measured), 24 px padding + 2 px border per chip, 9.6 px per caption character at 3 px spacing, the A4 30 / 44 px heights, `--nav-height` 60 px (`tokens.css:75`, the safe-area term is 0 on desktop). Actual caption and chip widths in de / ar / ja were not computed.
- NV2 The "old column ends at about 534 px at 1280×720" figure is a sum of 34 px chips, 38 px headers, 8 px gaps and the toggle row from CSS; not measured. The A4 statement "about 180 px for 5 chips" is from A4's brief, not re-derived.
- NV3 The ruler's rendered height at 720 / 768 / 900 was not computed (zone count per route and row heights not read); the "ruler top ≈ 436 / 484 / 616" numbers assume ≈ 270 px, an estimate. Earth's `anchorBottomPx` was not read (moon/mars pass 14, `moon/+page.svelte:331`).
- NV4 `--panel-width` (400 px) is taken from comments and the altitude-indicator rule (`SurfaceScene.svelte:8044`), not from the panel's own CSS; the "panel open" budgets depend on it. A `--surface-panel-open` style variable does not exist; the proposed `max-width` needs a way to publish panel state (not designed here).
- NV5 What the operator finds "not good" in Earth's current groups (C2) is not stated in the plan; §0–§3 read it as "heavy full-row headers in a long column". If the complaint is about something else (the master-switch behaviour, the greyed sub-chips, the double TELESCOPES), Q2 / Q1 matter more than the layout.
- NV6 Whether an Explore HUD visual baseline PNG exists: only `visual.spec.ts` selectors for the worlds' surface HUD were recalled from the A4 brief, not re-read.
- NV7 UXS-001/002/003/013/014/015, ADR-062 and ADR-074 were not read for column or ruler wording; the doc edits in §8 are from `git grep` file names, not their text.
- NV8 Existing tests that depend on chip DOM order on Moon / Mars (TRAVERSES moving before ORBITERS) were not searched beyond `mars.spec.ts:62–64` and `mobile-layout.spec.ts`; `moon.spec.ts`, `hotspots.spec.ts` and the audio-tour test (`data-audio-stage` scan) may assume order.
- NV9 The "HR / Light-cone chips" that `HudControls.svelte:511` mentions were not found in the file's markup (only five chips at `:103–158`); where they render (if at all) was not traced. If they are layer chips on Explore they join the Explore flat row.
- NV10 `MobileDrawerGroup` positioning, the drawer's rendered inner width (358 px at 390) and how the LAYERS tab scrolls with 5 lines were read from CSS, not run. The touch numbers (244 px for Earth) assume 44 px chips and 6 px gaps from A4.
- NV11 `/venus` has no `regimes` ruler in the route file read (`venus/+page.svelte:66–72` shows none); whether Venus has a ruler at all was not checked, so the Venus ruler budget is not stated.
- NV12 The per-locale values of `earth_layer_group_ground` were looked at for de, ar, sr-Cyrl and ja only; the other 9 locales were not read. Whether ja "地上" and ar "على الأرض" are acceptable as generic "on ground" is a judgement not checked against the glossary.
- NV13 `a5-check.py` ran once (30) and has no tests; it was not run on a fixed tree. `a5-check.sh` as written in the repo-relative form above differs from the scratchpad copy only in the script path.
