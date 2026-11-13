# Slice C7 brief — Iconic missions: the legend, its title, the milestone boxes (IM1, IM2, IM3, IM4, IM7)

Read-only brief, written at HEAD `0194e8b5531` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and two one-off read-only node scripts over `static/data/trajectories/` and `i18n-src/*/trajectories/` (written with the Write tool into the session scratchpad; output quoted below). Nothing was built, run in a browser or measured: every pixel figure is CSS arithmetic (§13). No code was changed. IM5 and IM6 (click a milestone box, New Horizons panel) are slice C1 and are built; they are out of scope here.

## 0. Answer first

1. **IM1, IM7 (the legend):** the "Hover any spacecraft to read why it's iconic" line becomes the legend's one-line title and is replaced by the hovered or selected craft's tagline in the same line's slot; the "Why are they all in one plane?" link goes behind an (i) that opens the existing `WhyPopover`-style explanation with the same `/science/transfers/coplanar-trajectories` link; the ICONIC MISSIONS chip moves to the **first** place in its row (it is last today, `HudControls.svelte:106-117`); rows shrink from 36 to 28 px so the 18-row roster needs no scroll at 1440×900 (584 px of legend against 628 px of room, arithmetic), and still scrolls at 1280×720 and 1366×768 (448 and 496 px of room).
2. **IM2, IM3, IM4 (the scene boxes):** the milestone boxes are canvas sprites sized in **scene units** (70 × 28 world units, texture 256 × 104, `iconic-trajectory.ts:119-139, 303-369`), so they scale with the zoom, which is why they are blurry up close and too small far away; they print the mission name in every box, three rows, and cut long labels (308 of 1,498 en-US-to-sr-Cyrl waypoint labels are over 17 characters, the width the 22 px bold line fits). Proposal: re-skin them with the UXD-020 machinery (12 px text, sized in screen pixels from view depth, the shared placement pass, a steady offset), header = `3/7 · 1979-03-05` (milestone number of total, date), body = the milestone name (two lines allowed, measured, not cut), **no mission name in the box**; the mission name appears **once**, in one separate mission box at the trajectory's Today marker (or nowhere in the scene; Decision 2).
3. **The pick contract does not change.** `PICK_KINDS`, `userData` (`kind`, `id`, `missionId`, `label`, `date`) and `pickTargets` stay (UXD-019 decision 8, tested in `iconic-trajectory.test.ts:36-71`), so C1's click-opens-the-mission keeps working on a re-skin.
4. **No new data file. 2 to 3 new message keys** (the title is today's `explore_iconic_tagline_placeholder`, reused; the (i) needs an aria label and the popover body reuses `explore_why_plane`'s wording without the "ⓘ"): see §6. The box number and ISO dates are language-neutral.
5. **Needs the operator before code:** 5 forks in §12 (where the hovered craft's tagline goes, the single mission box, date format, the (i) pattern, how far the legend shrinks).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 195–201; slice row 357)

| ID | Text | State at HEAD |
|---|---|---|
| IM1 | "Top of the panel is too big before the list. 'Hover any spacecraft to read why it's iconic' becomes the title; 'Why are they all in one plane?' becomes a tooltip behind the (i)." | Legend header = a link row (`.paths-legend-why`, 11 px mono) + a tagline strip with `min-height: 76px`, 13.5 px italic, padding 8/10 (`HudControls.svelte:152-171`, CSS `:496-513, 538-554`): about 28 + 12 + 76 + 8 = 124 px before the first row (arithmetic). |
| IM2 | "Key dates are blurry in the scene; boxes have empty space; 3 rows and some long labels cut off." | Sprites 70×28 world units from a 256×104 canvas (`iconic-trajectory.ts:119-120, 137-138`); text 14 / 22 / 15 px bold mono (`:344-354`); text starts at x = 20 with the box 240 wide: 22 px bold at 13.5 px/char fits 17 characters. |
| IM3 | "Mission name repeated in every box — one separate mission box instead?" | `buildLabelSprite(data.name, label, date, color)` writes `missionName.toUpperCase()` as the first line of every box (`:317, :345`). |
| IM4 | "Date and milestone number in the box header; the rest of the box for the milestone name." | No number exists anywhere; the date is the third line. |
| IM7 | "Move the Iconic missions chip to the top, more space for the list below; maybe no scroll needed on desktop." | The chip is the last of five in the layer row (`HudControls.svelte:94-118`); the legend caps at `calc(100vh - var(--nav-height) - 220px)` (`:623`) and scrolls (`overflow-y: auto`, `:459`). |

## 2. Current state (file:line at `0194e8b5531`)

### 2.1 The legend (HTML, `src/routes/explore/HudControls.svelte`, 661 lines)

- Desktop (fine pointer): `.paths-legend`, absolute under the HUD rows, 280 px wide, z 36 (`:441-461, :608-625`), shown when `layers.paths` (`:147`). Parts, top to bottom: the "why one plane" anchor to `localHref('/science/transfers/coplanar-trajectories')` (`:152-160`, key `explore_why_plane` = "ⓘ Why are they all in one plane?", en-US line 3546); the tagline strip (`:164-171`, `aria-live="polite"`; hovered tagline, else selected, else `explore_iconic_tagline_placeholder` = "Hover any spacecraft to read why it's iconic."); 18 `button.paths-legend-row` (`:173-`; swatch 18×3, name, agency logos, year; `min-height: 36px`, `:493`).
- Phone: the same list inside the Iconic Missions drawer tab (`mobileIconicContent`, `:288-340`), a second copy of the markup; the chip toggles `layers.paths` there too.
- Chip: `layerChips()` appends `layer-paths` after `planets, dwarfs, comets, interstellar` (`:94-120`); label `ui_layer_paths` = "ICONIC MISSIONS".
- Data: `PATHS_LEGEND`, 18 entries, oldest first (`src/lib/explore/paths-legend.ts:17-142`); taglines by a hand-rolled switch `iconicTagline` (`:147-194`, 18 keys `explore_iconic_tagline_<id>`).
- Selection state: `IconicSelectionService` (`iconic-selection.svelte.ts`), `hoveredId` / `selectedId`; hover brightens the arc (`setHighlight`) and swaps the tagline but does not open the panel (comment `HudControls.svelte:161-163`).

Arithmetic for IM7 (not measured): legend = 8+8 padding + why 28 + tagline strip 76 + margins 12 + 18 × (36 + 2 gap) = 808 px. Room at 1440×900 = 900 − 52 (`--nav-height`) − 220 = 628 px; 1366×768: 496; 1280×720: 448. So **today it scrolls at every common desktop size**. With a one-line title (28), rows of 28 px (+2) and no tagline strip: 16 + 28 + 18 × 30 = 584 px: fits at 1440×900 only; needs 856 px of window height to show without scrolling (584 + 52 + 220).

### 2.2 The milestone boxes (Three.js, `src/lib/three/iconic-trajectory.ts`, 714 lines)

- Per labelled waypoint (label present and not "Today"): a marker sprite (chevron, 18 units; launch = square, 12) and a **label sprite** in `labelGroup` (`:489-535`); the group is hidden until the mission is highlighted (`setHighlight`, `:620-638`: `labelGroup.visible = highlighted`).
- `buildLabelSprite(missionName, label, date, color)` (`:303-369`): 256×104 canvas, rounded pill `rgba(15,18,35,0.78)` with a 1.5 px stroke in the mission colour; line 1 mission name (bold 14 px, 70 % white), line 2 the label (bold 22 px, mission colour), line 3 the date (15 px). `sprite.scale.set(70, 28, 1)` **world units**, `renderOrder 10`, `depthTest: false`.
- Placement: `relayoutLabels(camera, canvasHeight)` (`:639-694`) stacks overlapping boxes vertically on screen using `LABEL_SPRITE_SCALE_Y / 2 / worldPerPixel` as the half height, i.e. a world-sized box: the box's pixel size changes with the zoom, and the deconflict result with it. Called per frame from `explore-scene-host.ts:4846-4848`.
- Pick: the label sprites are `pickTargets` with `userData.kind = PICK_KINDS.label` (`:518-525`); the host ranks marker, launch and box picks (`explore-scene-host.ts:2441-2487`); C1/UXD-019 decision 8.
- Data: `static/data/trajectories/<id>.json` (21 files; 18 iconic + `cassini-tour`, `galileo-tour`, `juno-tour` with 0 waypoints), waypoints `{date, label?, x, y, z}`; the translated label is a locale overlay (`i18n-src/<loc>/trajectories/<id>.json`, `waypoints[i].label`, `null` for unlabelled), merged into `display_label` (`trajectory-overlay.ts:15-33`). Labelled waypoints per trajectory (en-US, excluding Today): BepiColombo 11, Rosetta 11, Galileo 8, Cassini 7, Ulysses 7, Dawn 6, JUICE 6, Voyager 2 6, Hayabusa2 5, Juno 5, New Horizons 5, Voyager 1 5, Pioneer 10 4, Pioneer 11 4, Giotto 4, Vega 1 3, Vega 2 3, Venera 13 2. Dates are ISO strings of day or month precision (`1972-03-03`, `1972-07`).
- Script result over the 11 locales that have a `trajectories/` overlay directory with labels: **1,498 label strings, longest 40 characters, 308 over 17 characters** (de 17, en-US 11, es 42, fr 32, hi 24, it 24, nl 29, pt-BR 34, ru 29, sr-Cyrl 35, ar 31). Examples en-US: "Mercury orbit insertion", "Saturn orbit insertion", "Grand Finale (today)", "Ceres orbit insertion", "Venus surface landing". (The other locales, `ja`, `ko`, `zh-CN`, were not in the count: NV3.)
- UXD-020 left this out explicitly: "Not covered: … `iconic-trajectory` labels (C7)" (`UXD-020…md:95`), and UXD-021 line 111 lists "the encounter labels of the iconic paths (C7)".

### 2.3 The machinery C7 should reuse (`src/lib/universe/scene-pins.ts`)

`LABEL_TEXT_PX = 12` (`:12`), `viewDepth` (`:54`), `screenPxToWorld` (`:80`), `labelOffset` (`:94`), `placeLabels` with priority slots (`:137-203`), `labelRect` (`:215`), `RING_BLUE = 0x889fe7` (`:28`). The seven pin scenes use it; the solar scene's own sprite labels were "not covered" by UXD-020 and are not part of C7 either.

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

Desktop 1440×900 and 1280×720 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`); `?paths=1` opens the layer (`explore-paths-layer.spec.ts:118`):
1. The legend at rest: header, 18 rows, chip row (chip position), scroll state, at 1440×900 and 1280×720. Before and after.
2. Hover one row (Voyager 2, then Rosetta: 6 and 11 boxes), at the default camera: the boxes as drawn. Before and after.
3. The same hover **zoomed in** (wheel in on the inner system; before: the blur and overlap) and zoomed out to the heliopause (before: boxes tiny).
4. The longest labels: `?lang=de`, `es`, `ru`, `ar`, `hi`, `sr-Cyrl` on BepiColombo (11 boxes) and Cassini ("Grand Finale").
5. Phone: the Iconic Missions drawer tab (title, rows) and a selected craft with its boxes behind the bottom sheet; landscape the same.
6. The (i) closed and open, mouse and keyboard focus; the single mission box (Decision 2) on Voyager 1 (heading arrow and direction pill near it).

## 4. Proposal per feedback item

### 4.1 IM1 + IM7 — the legend

- **Title.** One line (12 px mono, label colour, `aria-live="polite"`): at rest "Hover any spacecraft to read why it's iconic." (today's placeholder key, no new text); while a craft is hovered or selected, its tagline replaces it (same slot). A tagline is 40 to 70 characters and the longest en-US ones wrap to two lines at 280 px (13.5 px italic today, UXD-002 forbids italic leads below 14 px: the strip's italic is itself a B/A1 leftover); Decision 1 chooses between the in-place swap (the header grows to two to three lines on hover, shifting the list) and a floating card beside the row (no shift).
- **(i).** The "ⓘ Why are they all in one plane?" link becomes a 24 px `ui-hit` info button at the title's inline end (`aria-expanded`, `aria-controls`, label key `explore_why_plane_aria`); it opens the repo's `WhyPopover` (`src/lib/components/WhyPopover.svelte`, click-to-open, title + body + "Read full" link into `/science`) with the existing wording of `explore_why_plane` as the title and the link to `/science/transfers/coplanar-trajectories` as "Read full": no new explanation text is drafted here; if the popover needs a 1–2 sentence body, that is one new key (Decision 4 also offers a plain `title` tooltip, which cannot hold a link and fails on touch). A native tooltip alone is not recommended: the plan's "tooltip behind the (i)" must stay reachable by keyboard and phone.
- **Chip first.** `layerChips()` returns the paths chip first; the HUD row order on desktop becomes ICONIC MISSIONS, PLANETS, DWARFS, COMETS, INTERSTELLAR. `chip-row.spec.ts` and `explore-paths-layer.spec.ts:50` use `data-testid="layer-paths"`, so the testid stays. (The phone's controls drawer already leaves PATHS to its own tab, `withPaths=false`.)
- **Rows.** `min-height: 36px` → 28 px, `padding 5px 6px` → 3px 6px, still above the 24 px `.ui-hit` floor of UXD-014 and the 11 px text floor (UXD-002: name 12 px, year 11 px, as today); the touch drawer keeps 44 px rows. Arithmetic in §2.1: 584 px, fits at 900 px high only.

### 4.2 IM2 + IM3 + IM4 — the boxes

**A milestone box** (one canvas sprite, screen-sized):
- Header row: `3/7 · 1979-03-05` (milestone number of total labelled waypoints of that trajectory, excluding Today; the Launch box is `1/N`), 11 px bold, 70 % white; the number is `i+1` over `labeledWaypoints.length` in the build loop (`iconic-trajectory.ts:489-493`), so it is computed once and is language-neutral. The date is the data's own ISO string, so no locale text enters the box header.
- Body: the milestone name (`display_label ?? label`), 12 px bold in the mission colour, **measured** with `ctx.measureText` to a maximum box width of 200 CSS px and wrapped to at most two lines; a third line is cut with an ellipsis and the full text stays in the pick target's `userData.label` (and a `title`-equivalent for the 2D hit list is not needed: the legend and the mission panel hold the names). Result: no empty space (width follows the text, not a fixed 256 px canvas), two rows (header, body) instead of three.
- **No mission name** in the box (IM3). The mission is identified by the pill's border and text colour (already the mission colour) and by the highlighted arc.
- **Size.** Text is 12 px at every zoom through `screenPxToWorld(viewDepth, fov, viewportH)` (UXD-020 decision 1), the canvas drawn at `devicePixelRatio` (min 2) so it is sharp (the blur at IM2 is the 256 px texture stretched by a world-sized sprite); a box is 11 px text + 6 px padding, about 40 to 52 px tall, 90 to 200 px wide.
- **Placement.** The boxes of the highlighted mission go through the shared `placeLabels` pass (priority: the hovered or clicked milestone, then launch, then the rest by index) instead of the bespoke vertical stack in `relayoutLabels`; a box that cannot be placed without overlap is hidden and returns when space frees (the pins' rule). With up to 11 boxes on BepiColombo and Rosetta, hiding is expected at the default zoom: the **markers** stay (they are the pick targets that do not hide) and a hidden box's number appears in the marker's hover state. Decision 5 asks whether hiding is acceptable or the boxes must all show.
- **Offset.** Steady lift above the marker along camera screen-up (`labelOffset`, `liftOnScreen`), as the pins.
- **Pick contract kept** (`PICK_KINDS.label`, `userData`): the sprite object stays the pick target; only its texture, scale source and placement change.

**The one mission box (IM3's "one separate mission box").** Recommended (Decision 2): a single sprite at the trajectory's Today marker, header the agency/year-free mission name (`data.name`, the legend's name), body `data.current_distance_label` ("135 AU · ~18.8 light-hours from the Sun …", a translated string that exists in every locale already), drawn only while the mission is highlighted. This reuses data and text that exist and gives the name in the scene exactly once. Alternative: no mission box (the legend row, the tagline and the mission-coloured arc already name it; fewest sprites).

### 4.3 What does not change

Arc brightness states, marker sprites, heading arrow and direction pill (UXD-021 owner rule), hover/pick ranking in the host, the Today click target, the PATHS deep link `?paths=1`.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on C7 |
|---|---|
| C1 (UXD-019) | Click on a milestone box opens its mission (done, `PICK_KINDS`): the re-skin keeps the contract; IM5/IM6 are **outdated** items of this feature set, not carried. Every legend row already opens the one MissionPanel (decision 8). |
| C2 (UXD-020) | The machinery to reuse (`scene-pins.ts`); its "Not covered: iconic-trajectory labels (C7)" is the open item this slice closes. |
| C3 (UXD-021) | Direction pills show for their owner only; the single mission box and the pill must not stack at Today (the pill sits at the arrow tip, `DIR_ARROW_LEN = 62` units past Today, `iconic-trajectory.ts:382`). The HUD row clears a docked panel: the chip moving first does not change `--hud-clear-right`. |
| A4 / UXD-014 (one chip) | The chip row keeps `LayerChipRow`; the legend rows are `data-a4-keep="legend row, not a chip"` already. The (i) is a 24 px `ui-hit` button, the pattern the ruler header (UXD-024) uses. |
| A1 / UXD-002 (type) | The tagline strip is 13.5 px italic Crimson (`HudControls.svelte:496-513`): italic only for quotes and captions at 14 px or more: **fold in** the upright title/tagline here. |
| B1 / UXD-018 | No panel change. |
| C4 (UXD-024) | The ruler's disclosure button pattern (24 px, `aria-expanded`) is the model for the (i); the bottom-left column is not touched. |
| C6 | None. C8: the per-level "what you are looking at" card is separate; the legend title is not a level card. |

Plan ideas now outdated: "milestone boxes sharp (screen-constant)" is right but the **how** is now the UXD-020 sprite sizing, not a new sizing scheme; "milestone name in the body, mission name once" stands.

## 6. i18n impact (14 locales, glossary first)

- **Reused:** `explore_iconic_tagline_placeholder` (the title), the 18 `explore_iconic_tagline_*` taglines, `explore_why_plane`, `current_distance_label` (overlay), the 1,498 waypoint labels (unchanged).
- **New keys: 2 or 3:** `explore_why_plane_aria` (the (i)'s accessible name), `explore_why_plane_body` (only if the popover gets a body of 1–2 sentences, Decision 4), and, only if the operator wants the box header words (Decision 3 alternative), none. Each in 14 locales, drafted from the existing `explore_why_plane` wording; glossary check for "plane" (orbital plane / ecliptic) in `static/data/glossary/native-terms.json` before drafting (not opened here: NV7). No paid translation run (`no-paid-translation-runs`).
- **Not a locale issue:** the box number and ISO date. **Is a locale issue:** glyph coverage of canvas text. The box text is drawn in `"Space Mono", monospace`; the labels already reach `ar`, `hi`, `sr-Cyrl`, `ru` through font fallback today; the proposal changes the font only if the new measured-wrap needs it (`measureText` uses the same fallback). RTL: the canvas text direction for `ar` waypoint labels is today left-aligned `textAlign = 'left'` (`:339`); whether `ctx.direction` is needed is NV4.
- Legend taglines are 40–70 characters in en-US and up to 2 lines at 280 px; the title slot must hold the longest translated tagline without clipping (check the 14 locales' longest in the unit test, §8).

## 7. Data changes

None to `static/data/trajectories/*.json` or the overlays. The milestone number is computed at build time of the sprite. `PATHS_LEGEND` and `iconicTagline` unchanged.

## 8. Tests to add or change

**Unit (vitest):**
- `src/lib/three/iconic-trajectory.test.ts` (36-71 keep): add (a) box header string = `${i+1}/${n} · ${date}` for a fixture trajectory, `Today` excluded, (b) the box text does not contain the mission name, (c) `pickTargets` / `userData` contract unchanged (existing tests), (d) the placement pass hides an overlapping box and returns it (reuse the `scene-pins.test.ts` helpers), (e) a measured wrap never cuts a label of 40 characters in two lines at 200 px (a fake `measureText`), (f) dispose frees every new texture.
- `src/lib/explore/paths-legend.test.ts`: still 18 rows in launch-year order; the paths chip is the first of `layerChips()` (extract `layerChips` or test through `HudControls` render).
- A guard test (new, small): every `explore_iconic_tagline_<id>` exists for every `PATHS_LEGEND` id in 14 locales (parity already enforced by the message tests; add the iconic keys explicitly, see `data-overlays.test.ts`).

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. `explore-paths-layer.spec.ts`: the chip `layer-paths` is the first chip of its row (desktop), toggles `aria-pressed` as today; rename "all 9 iconic trajectory JSON files" (`:82`; the roster is 18 plus three tour files: a stale title, fold in).
2. New `explore-iconic-legend.spec.ts`: at 1440×900 the legend has no vertical scrollbar (`scrollHeight <= clientHeight`), at 1280×720 it scrolls and the selected row is scrolled into view; the title reads the placeholder at rest and the hovered craft's tagline while hovered; the (i) is a button with `aria-expanded`, opens the popover with the science link, closes on Escape; keyboard `ArrowDown` still moves focus (`explore-iconic-keyboard-nav.spec.ts:38`).
3. Scene boxes via a read-only hook in the style of `window.__scenePins`/`__exploreDirectionLabels`: `window.__iconicBoxes()` returns `{missionId, n, total, date, label, drawn, heightPx}` per box; assert 12 px text height (`heightPx` of the drawn rectangle), header text, no box shows the mission name, drawn boxes pairwise disjoint, at the default camera and at two zoom levels (the sprite's CSS size does not change with the zoom: the IM2 regression test).
4. `select-focus.spec.ts` (marker pick opens the mission): unchanged, must stay green.
5. `perf-explore-iconic-clicks.spec.ts`: re-run, because the build loop adds a measureText/DPR canvas per box (18 builds interleaved with frame yields, `explore-scene-host.ts:2380-2400`); the 2026-06-19 baseline (worst long task about 1.5 s before the yield fix) is the guard.

## 9. Docs to update by name

- **UXD-025** (new, `docs/uxs/decisions/UXD-025-iconic-missions-legend-and-milestone-boxes.md`; 024 is the last used at HEAD): the legend title and (i), the chip first, the box rules, the single mission box; link from UXD-020 "Not covered" line and UXD-021 line 111; row in `docs/uxs/decisions/README.md`.
- `docs/concept/05_Design_System.md` §5.14 (add a "Milestone box" row: 11/12 px, number + ISO date header, name body, placement pass, colour), §5.7/§5.7a if the paths chip order is stated, §5.12 not (that is the /fly HUD).
- `docs/uxs/UXS-014.md` (the iconic legend and boxes: it has no iconic section today, line 35 area; the plan row's UXS is UXS-014), `docs/uxs/IA.md` §controls (the legend's (i)), `docs/uxs/CHANGE-INVENTORY.md` row C7 (line 48) and the existing "Iconic" rows if any.
- `docs/adr/TA.md` (HUD paragraph ~line 390: the legend), `src/lib/three/README.md` (`iconic-trajectory.ts`: box skin, placement), `src/routes/explore/README.md` (`HudControls.svelte`), `src/lib/explore/README.md` (`paths-legend.ts`), `src/lib/universe/README.md` (`scene-pins.ts` gains a second consumer).
- `docs/accessibility.md` (the (i), legend title live region).
- Headers: `iconic-trajectory.ts` (the "label sprites ... 2D sprite" comment lines 297-302 are stale after the re-skin), `HudControls.svelte` (comment at `:122-124`, the 2026-06-17 tagline note at `:496-502`).

## 10. Phased plan

1. **C7a legend** (HTML only): title, (i), chip first, row heights, tests 8-1/8-2; screenshots §3.1.
2. **C7b box skin:** pure helper for the header string and the measured wrap (unit tests red first), canvas draw at DPR, `screenPxToWorld` sizing; hook `__iconicBoxes`; screenshots §3.2-3.4.
3. **C7c placement:** swap `relayoutLabels` for the `placeLabels` pass (keep the function name/signature the host calls, `:4846-4848`); the single mission box (Decision 2).
4. Docs, UXD-025, `npm run validate-data` (messages), `npm run preflight` once before a push, `npm run preflight:coverage` (new pure helpers in `src/lib`, ratchet R8).

## 11. Acceptance checks

- At 1440×900 the legend holds 18 rows without a scrollbar; at 1280×720 it scrolls inside its cap and never passes the footer.
- The title shows the placeholder at rest and the craft's tagline on hover or selection, without moving the list (or with a defined, tested shift, per Decision 1).
- Every box on every trajectory has `n/N · date` in the header, a body that is the full label (two lines) or ellipsised with the full text in `userData.label`, and no mission name; text is 12 px at three zoom levels (hook).
- A click on a box or marker still opens the mission panel in place (C1's e2e unchanged).
- The ICONIC MISSIONS chip is first in its row on desktop; keyboard order follows the DOM.
- Docs of §9 updated; the inventory row C7 states what was built and not run in a browser.

## 12. Decisions for the operator (recommendation first)

1. **Where the hovered craft's tagline appears.** **(a) A floating card to the right of the legend at the hovered row's height (no layout shift; the header stays one line, so the list starts about 40 px from the top instead of 124)** (recommended: IM1 "top is too big", IM7 "more space for the list"); (b) in place of the title, one to three lines (the header grows and shifts the list on every hover); (c) as the Overview tab's first line only (no hover text at all; the legend shows just the title and rows).
2. **"One separate mission box" in the scene.** **(a) One box at the Today marker: the mission name and its current-distance line, shown while the mission is highlighted** (recommended: uses text that exists in 14 locales); (b) no mission name in the scene (the legend row, the tagline and the coloured arc name it; fewest sprites); (c) the name on the Launch box only (a second line on box 1).
3. **Date in the box header.** **(a) The data's ISO string as is, `1979-03-05` or `1979-03` (language-neutral, no new text)** (recommended); (b) a localised short date (`Mar 5, 1979`; 14 locales' month names in a canvas font, month names for ar, hi and ja need the fallback fonts, and day-or-month-only precision needs two formats).
4. **The (i).** **(a) A 24 px info button opening the existing `WhyPopover` with the "Read full" link to the science page** (recommended: keyboard and touch reachable, no new pattern); (b) a plain tooltip (`title`) on the (i): the link is lost and it fails on touch; (c) keep the link row but shrink it to one line under the title (no (i)).
5. **Boxes that cannot be placed without overlap.** **(a) The shared placement pass hides the lower-priority box and the marker's hover shows it** (recommended: the rule C2 already set for pins; BepiColombo and Rosetta carry 11 boxes each); (b) show all boxes and let them overlap or stack (readable only on a large window); (c) cap the visible boxes at six per mission, ranked (Launch, the named planetary events, the end).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The 584 px / 808 px legend heights, the 628/496/448 px room figures and the 17-character fit are CSS arithmetic (`--nav-height` 52 px per UXD-016 and the cap formula at `HudControls.svelte:623`; the hit area, gap and border of the rows were read, not measured). The "blurry because the texture is stretched" cause is read from the code (world-unit sprite scale, 256 px texture), not shown in a screenshot.
- NV2 Whether the 44 px touch row floor already applies in the drawer (`mobileIconicContent`) was not read; the phone drawer's CSS (`:global(.mdg-body)`) was seen only at `:464-466`.
- NV3 The label-length count covers the 11 locale overlay directories that returned labels (`ar, de, en-US, es, fr, hi, it, nl, pt-BR, ru, sr-Cyrl`); `ja`, `ko`, `zh-CN` were not in the output (they have an `i18n-src/<loc>/trajectories` directory? not confirmed) and CJK widths (1 em per character) were not estimated.
- NV4 Canvas text rendering of `ar` (RTL) in a left-aligned box, and the `ctx.direction`/bidi behaviour for mixed Arabic and Latin ("Venus #1"), were not checked.
- NV5 `placeLabels` was read for its signature (`scene-pins.ts:137-203`), not for whether it takes sprites whose scene-unit size is derived per frame from `screenPxToWorld` (the pins do); reusing it for trajectory boxes that live under `labelGroup` (hidden until highlighted) was not prototyped.
- NV6 Where the direction pill and the proposed Today box collide for Voyager 1/2 and Pioneer 10/11 (both near Today) was not computed.
- NV7 `static/data/glossary/native-terms.json` and the `WhyPopover` styling inside the HUD (it was designed for panels; z-index against the legend's z 36) were not opened.
- NV8 `iconic-selection.svelte.ts` (hover/select state) and the mobile `onLegendKeydown` were located, not read; the host's 18 builds' per-frame cost with DPR-2 textures was not measured.
- NV9 Whether the box count in the sprite hook can be read without breaking `window.__exploreCameraState`-style guards (DEV-gated only) was not checked.
