# Slice A4 brief — one chip and one filter (C1, C3, G3, PG1, MI1, FL1, E8, ISS1)

Read-only brief, written at HEAD `6c6925ccd5d` (A1 type scale, A2 page shell and A3 accent tokens landed on this branch). Full baseline
check output: `2026-11-12-slice-A4-baseline-hits.txt` (174 lines, 172 violations). Method: `git grep` / a Python CSS-rule scan over every
`src/**/*.svelte` and `*.css` file from the repo root (not hand-scoped), plus a read of every in-scope control; every `file:line` was read
at that commit. No browser, no build, no test run: heights below are computed from CSS, not measured (see §12).

**Dependencies (already decided, built on, not redone).** A1: `--size-label` 11 px, `--color-text-label` (60 % white), text under 12 px
keeps alpha >= 0.58 (UXD-002). A2: shared CSS file precedent `page-shell.css` (UXD-012). A3: `--color-accent` `#5070ff`, `-soft`,
`-edge`, `-strong`, `--color-state` `#889fe7` (states, hover, small text on lifted backgrounds), `--color-focus`; solid accent fills take
dark text `#04040c` (UXD-001). A4 owns the chip's shape, size and the one active look; it must use those tokens and write no colour of
its own. Neighbour slices NOT in A4: A5 (C2, W7: Earth "On ground / In space" grouping and the column colliding with the ruler), A6 (nav
bar N1), MI2 (epoch/timeline filter redesign), MI3 (mission colour code on the filters). A4 leaves a hook for MI3/A5 (`--chip-tone`, §5)
and does not decide them.

## 0. The point list

| ID | Operator text (plan lines 68–70, 93, 147, 223, 241, 251, 259) | State at HEAD |
|---|---|---|
| C1 | Chips are the only oval things and feel oversized. Rethink them across Explore, Worlds etc.: less vertical and horizontal space, good stacking. | Explore chips are 44 px tall on every viewport and 999 px radius (`HudControls.svelte:557–578`); Worlds chips are 44 px (touch) / 34 px (fine pointer), 999 px, min-width 110–140 px (`SurfaceScene.svelte:7438`, `:7521`, `:7560`) |
| C3 | Unified filters, in UX terms, across all surfaces. | 17 separate control recipes in scope (§1) |
| G3 | Gallery entity page: filter pills look fine but are specific to this page; align with other filters: one style across all pages. | `deep-sky/+page.svelte:303` own `.chip`, 12 px, 999 px, solid-fill active, `role="tablist"`/`tab` |
| PG1 | The 3 filters at the top (era, kind, agency) are unique to this page; align with other similar ones. | `programs/+page.svelte:129–139` is a group-by toggle (era / kind / agency), a joined segmented control with its own CSS (`:234–263`); it GROUPS, it does not filter (Q4) |
| MI1 | Filters look ugly, text too tiny and unreadable; align with filters elsewhere. The total is at the far end of the screen; put it after the label. | `.pill` = 11 px, 700, ls 2 px, 60 % white on transparent (`entity-browse-page.css:172–186`); count in `.filters-right` pushed to the far end by `justify-content: space-between` (`:68–72`, markup `missions:445`) |
| FL1 | Same filter comments as missions. | `/fleet` uses the same shared CSS and the same markup (`fleet:473–492`) |
| E8 | "Reset view" on the present level looks awful; align with how reset view looks elsewhere. | Explore level reset is the icon-only `⟲` 34 px slate-grey button `ScaleNav.svelte:55–66`, `.scale-reset` `:130–150` (grey `rgba(154,166,189,…)`, not the accent); the text "RESET VIEW" `.toggle` elsewhere is a different look again |
| ISS1 | "Watch live" is a plain text link: a first-class chip, or a better solution. | `StationRoute.svelte:1587–1591` `<a class="hud-live-link">` 0.8 rem pink text `#ffd0d0`, red dot, underline on hover (`:2003–2021`); no border, no height, no focus style |

Operator scope hint "ISS module chips": there is no module chip control. The ISS module list is rows (`.module-row`,
`StationRoute.svelte:1257, 1302, 1620, 1643`), and the only `.chip` in `StationAssemblyControl.svelte:229` is a `<p>` caption with a
text button inside (`assembly-chip`, `:119–145`). Both stay as they are (allow-list). ISS1 is only the Watch-live link.

## 1. Inventory — every chip / pill / toggle / filter control (repo-wide)

Heights are `min-height` / `height` from CSS or the padding+line sum where none is set (marked `~`). "Touch" = what the rule does under
`(pointer: coarse)` or at phone width. Source: `inv.py` scan of 152 chip-like rules over all `src/**/*.svelte|css` (outside `dev/`),
then every in-scope rule read by hand.

### 1.1 In scope (to be replaced by the one chip) — 17 recipes

| # | Control | Where (file:line of the rule) | Height | Padding | Font | Radius | Active look | Touch | ARIA |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Explore layer chips (PLANETS, DWARFS, COMETS, ISM, PATHS) | `explore/HudControls.svelte:557` (markup `:103–158`, `:286–340`) | 44 | 0 8 / 0 10 | 11 | 999 | 18 % accent fill, accent-strong border, `--color-state` text (`:585`) | 44 everywhere, `min-width: 110`, `width:100%` column at fine pointer (`:842`) | `aria-pressed`, group `role="group"` |
| 2 | Worlds layer chips (earth / moon / mars / venus: SURFACE, ORBITERS, ORBITS, STATIONS …) via `LayerChipRow.svelte` | `surface-scene/SurfaceScene.svelte:7438`, `:7521`, `:7560`; `LayerChipRow.svelte:87` (`.chip-group` header) | 44 touch, 34 fine pointer | 0 6 / 0 10 | 11 uppercase | 999 | `--body-tint` (Mars red, Moon grey, Earth blue) 22 % over dark, tint text (`:7476`) | 44; `min-width` 78 / 110 / 140 | `aria-pressed`, `aria-disabled`; header `chip-group` is also a button |
| 3 | HUD action buttons ("toggle": 2D/3D, RESET VIEW, SPIN, AR, SKY, ASSEMBLY) — **6 separate recipes** | explore `HudControls.svelte:525`, `TimeDock.svelte:250`; station `StationRoute.svelte:2107`; worlds `SurfaceScene.svelte:7483`, `:7606` (`hud-top-mobile`); fly `fly/+page.svelte:6599`; plus `ViewToggleButton.svelte`, `View3dControls.svelte`, `EnterArButton`, `EnterSkyButton` | 44 (34 at fine pointer on worlds only) | 0 8 / 0 10 / 0 14 / 3 5 | 9–13 (12, 13, 11, var) | 4 | none (border change only) | 44 | `aria-pressed` on some, none on others |
| 4 | Explore "iconic missions" PATHS toggle | `HudControls.svelte:598` | ~25 | 4 10 | 11 | 12 | state text + accent border | none, not 44 | no `aria-pressed` read |
| 5 | Explore scale back `‹` and level reset `⟲` (E8) | `explore/ScaleNav.svelte:123–150` | 34 (44 under 768 px) | 0 8 | 16 | 5 | n/a | 44 under 768 | `aria-label`, no text |
| 6 | Explore scale picker trigger | `ExploreScalePicker.svelte:137`, `:258` | 34 / 44 | 6 12 | 11 uppercase | 5 | accent 18 % | 44 on coarse | `aria-haspopup` (not read in detail) |
| 7 | Catalog filter pill (missions 26 buttons, fleet 16, launches 12; `.pill`) | `styles/entity-browse-page.css:172`, `:204` (logo pill), fleet `:825–844` (5 status colours) | 44 | 6 14 | 11, 700, ls 2 px | 3 | 25 % accent, 50 % border, white text | 44 on every viewport | `role="radio"` + `aria-checked` in `role="radiogroup"`; lineup bar `aria-pressed` |
| 8 | FILTERS toggle strip + count (A4: count right after the label) | `entity-browse-page.css:68–118` | ~38 | 8 12 | 11 | 4 | n/a | full-width bar | `aria-expanded`, `aria-controls` |
| 9 | CLEAR FILTERS / launches `clear-btn` | `entity-browse-page.css:125`; `launches:379`, css `:451–460` | ~29 | 6 12 | 11 | 3 | n/a | ~29, under 44 | plain button |
| 10 | Launches agency dropdown (`PillDropdown`) | `PillDropdown.svelte:189` | 32 | 6 10 6 12 | 11 | 3 | border + accent | 32, under 44 | custom listbox (not read in detail) |
| 11 | Epoch timeline chips (missions / fleet, mobile carousel) | `EpochTimelineStrip.svelte:322` + `.chip-count` `:369` | 32 | 6 12 | 11 | 14 | band colour (`--band-color`) glow | 32, under 44 | buttons |
| 12 | Deep-sky observatory filter (G3) | `gallery/deep-sky/+page.svelte:303` (markup `:158–172`) | ~31 | 7 14 | 12 | 999 | solid `--color-state` fill, dark text (`:318`) | ~31, under 44 | `role="tablist"` + `role="tab"` + `aria-selected` (no tabpanel, no arrow keys: a filter marked up as tabs) |
| 13 | Programs group-by (PG1) | `programs/+page.svelte:234–264` | ~28 | 7 14 | 11 | 4 joined (0 inside) | hard-coded `rgba(127,176,224,.18)` / `#cfe3fb` (a pre-A3 teal-blue) | ~28, under 44 | `role="group"`, no `aria-pressed` (state only via `.active`) |
| 14 | Star index filters | `StarIndex.svelte:203` (markup `:81`) | ~26 | 5 6 | 11 | 5 | (not read) | under 44 | `role="group"` |
| 15 | Surface index filter chips (agency / type, inside the Index panel) | `SurfaceIndexPanel.svelte:257` | ~21 | 3 8 | 11 uppercase | 999 | state text, accent-strong border | ~21, under 44 | (not read) |
| 16 | Speed pills (time dock; /fly) | `TimeDock.svelte:348`, `:502`; `fly/+page.svelte:6339` | 32 / 44 | 0 10 / 6 10 | 11 | 0–5 joined / 3 | 22 % accent + inset glow / n/a | 32 / 44 | (not read) |
| 17 | ISS "Watch live" link (ISS1) | `StationRoute.svelte:2003–2021` | ~16 | 0 | 0.8 rem (12.8) | 0 | n/a | no hit area | `<a>`, `data-testid="{id}-watch-live"` |

Further in-scope-adjacent: Surface "launches from here" link chips `SurfaceScene.svelte:7916` (r999, 11 px, links to launches; same look
as #2, gets the `link` kind), `plan/+page.svelte:1382` `.mission-type-pill` (44 px, r4, /plan is a scene route: allow-list, see §6).

Counts: **17 control recipes** in scope, **8 distinct active looks** (accent 18 %, accent 25 %, accent 22 % + glow, body-tint, solid
state fill, `rgba(127,176,224,.18)`, band colour, fleet's 5 status colours), **7 radii** (999, 14, 12, 5, 4, 3, 0), **8 heights**
(~21, ~25, ~28, ~31, 32, 34, 38, 44), **3 font sizes** (11, 12, 13 + 9–13 on toggles), **3 ARIA patterns** on the same job
(`aria-pressed`, `role=radio`, `role=tab`) plus controls with none.

### 1.2 Tabs and other things that are not chips — stay as they are

- `PanelTabRow.svelte` + `styles/panel-tabs.css` (planet / mission / fleet / satellite / site panels: OVERVIEW, GALLERY, LEARN …): real `role="tab"`
  with `role="tabpanel"`, used by 9 panels; e2e uses `getByRole('tab', …)` heavily. Stays.
- `science/+layout.svelte` rail pills (navigation links), `Nav.svelte` toggles (A6 owns the nav), `LocalePicker.svelte:99` (nav).
- Status / label pills that are not controls: `LaunchesBanner .live-pill`, `launches/LaunchRow .live-chip`, `launches/ProvenanceChip`, `FleetEntryPanel .category-chip`,
  `RegimeChip` (link), `ScienceChip` (`?` link into /science, 24 px, ADR-036), `BeltPanel .tier-pill`, `TierContextCard .tcc-chip`,
  `Lab Card __wired-chip`, `credits .variant-chip`, `library/episodes .tour-chip`, `sourcing .chip`, `programs/[id] .chip` (static tags),
  `AnnotationRings .chip` (canvas label), `PanoramaCrossLink .chip`, `SurfaceFlatPatch .chip` + `.hud-limit-chip` (scene HUD in the flat patch).
- Switches and form controls: `SensorySheet .switch`, `privacy .toggle`, `LanguageSuggestion .switch`, `DebugPanel .debug-toggle`.

## 2. Findings that shape the proposal

1. **Touch 44 px is the only reason chips are tall.** The 44 px comes from the AGENTS touch rule and ADR-018. The Worlds HUD already
   shows the answer: 44 px on touch, 34 px under `(hover: hover) and (pointer: fine)` (`SurfaceScene.svelte:7560`, comment "34 px is plenty
   (WCAG 2.2 minimum is 24)"). Explore and the catalog pills never got the second half, so they are 44 px on desktop (C1, MI1 "ugly").
2. **"Oval" is only the layer chips and deep-sky** (999 px, 5 places). Everything else (toggles, pills, buttons, cards) is 3–5 px. C1
   says chips are "the only oval things": the cheapest consistent fix is to take the oval away, not to make everything else oval.
3. **MI1 "text too tiny" is not a size bug.** The pill is already 11 px (A1 floor). It reads tiny because it is 11 px bold at 60 % white
   with 2 px letter-spacing on a transparent box inside a 44 px cell, uppercase, on 20+ pills. The fix is contrast and density (rest
   colour .72, letter-spacing 1 px, 30 px box), not a bigger font. (Q1 offers 12 px as an alternative.)
4. **Active colour: 8 looks.** Three of them break A3: `programs:257–260` hard-codes `rgba(127,176,224,…)` and `#cfe3fb`; deep-sky uses a solid fill the A3
   rule allows only with dark text (it has it); the Worlds `--body-tint` is a per-route colour the operator asked for on 2026-06-17
   ("chips on mars used to be red … on moon grey … earth blue") and which now conflicts with "one active colour" (Q3).
5. **The FILTERS strip is a full-width bar with the count pushed to the far right** by `justify-content: space-between`; moving the count
   next to the label is a one-line layout change plus making the bar a chip (Q2).
6. **Filter-as-tab and radio without arrow keys.** Deep-sky marks filters as tabs; missions/fleet/launches use `role="radio"` but the pill
   buttons are all tab stops (no roving tabindex / arrow-key handler was found in the markup; not read in the `<script>`: NV3). fleet.spec
   depends on `getByRole('radio', …)` (`fleet.spec.ts:25, 71–147`), so the radio role stays and arrow keys are added.
7. **Reset view: 7 call sites, 4 looks** (`ui_reset_view()` at `HudControls.svelte:94,264`, `ScaleNav.svelte:59,60`, `StationRoute.svelte:1469,1537`,
   `View3dControls.svelte:21`, `SurfaceScene.svelte:5750`): icon-only slate `⟲` (Explore level), accent-edge text button (Explore HUD),
   grey-edge text button (Worlds), accent-edge text button 11 px (stations).

## 3. Proposal

### 3.1 Where: one CSS file for the look + one thin component for the markup contract

- `src/lib/styles/chip.css` (loaded by `app.css` next to `page-shell.css`): the one look, class `.ui-chip` (+ `.ui-chip-group`, `.ui-chip__count`,
  `.ui-chip__dot`). **Why not just a CSS file, as A2 did:** A2's pages differ in markup and have `data-route-ready` / test hooks that a component would
  force to rewrite. Here the opposite holds: missions repeats the same 8-line button 26 times, the ARIA wiring (`aria-pressed` vs `role=radio` +
  `aria-checked`, `disabled`, `title`, count badge, tone dot) is logic that drifts (finding 6), and the repo already has the component precedent
  `LayerChipRow.svelte` (config array of chips) and `PanelTabRow.svelte` (one component for 9 panels' tab markup, styled by the shared
  `panel-tabs.css`). So: shared CSS (`panel-tabs.css` precedent) + component (`PanelTabRow` precedent). Class name `.ui-chip`, not `.chip`:
  `.chip` is already a scoped class in 12 files for non-control tags (ScienceChip, LocalePicker, sourcing, …) and a global `.chip` would leak
  into them; a scoped rule (0,2,1) also beats a global one (0,1,0), the A2 lesson, so the old per-file rules MUST be deleted, not overridden.
- `src/lib/components/Chip.svelte` — props:
  - `kind`: `'toggle'` (renders `<button aria-pressed>`; layers, group-by) · `'choice'` (`<button role="radio" aria-checked>`, parent `role="radiogroup"`; filter pills) ·
    `'action'` (plain `<button>`; Reset view, 2D/3D, Spin, Clear filters; no pressed state) · `'link'` (`<a href>`; Watch live, "launches from here").
  - `active` (maps to `aria-pressed` / `aria-checked`), `disabled` (native `disabled` + `aria-disabled`), `count?: number | string` (inline badge: deep-sky `.n`, epoch count, filter total),
    `tone?: string` (CSS colour; sets `--chip-tone`: dot and active border only, for data colours such as fleet status, mission colour MI3, live red), `quiet?: boolean`
    (no border at rest: Clear, Reset), `dismiss?: boolean` (appends `×`: Clear filters), `icon?` snippet, children snippet, `...rest` (testid, `title`, `data-audio-stage`, `onclick`, `aria-label`).
  - Single size. No `size` prop (a second size is how 17 recipes happened).
- `src/lib/components/ChipGroup.svelte` (optional, 20 lines): `<div role="radiogroup|group">`, optional visible label (`.filter-label`), arrow-key roving for
  `choice`. Only needed because radios need the arrow keys; `toggle` groups stay a plain wrapper `div.ui-chip-group`.
- `LayerChipRow.svelte` stays (its config-array API serves Worlds) but renders `<Chip>`; Explore's inline buttons switch to `<Chip>` (the
  `data-audio-stage` comment at `HudControls.svelte:100` is solved by `...rest`, so Explore can also use `LayerChipRow` or keep its own markup).
- `PillDropdown.svelte` keeps its listbox logic; its trigger becomes `<Chip kind="action">`.
- `EpochTimelineStrip` mobile chips become `<Chip kind="choice" tone={bandColor} count={n}>`; the desktop bands (not chips) stay (MI2 redesigns them).

### 3.2 Look (all values from tokens; nothing hard-coded)

| Property | Value | Note |
|---|---|---|
| Height | **30 px** at `(hover: hover) and (pointer: fine)`; **44 px** `min-height` at `(pointer: coarse)` | Q1; precedent `SurfaceScene.svelte:7560` (34 px / 44 px). Plan says ≈ 28–32 |
| Padding / gap | `0 12px` / row gap 6 px, column gap 6 px; stack in `.ui-chip-group` (flex wrap) | Explore column keeps stacking vertically (Q5) |
| Text | `--size-label` 11 px, 700, letter-spacing 1 px, uppercase via CSS, Space Mono, rest colour `rgba(255,255,255,.72)` (A1 alpha ≥ .58) | one size, MI1 contrast fix |
| Radius | **4 px** | matches `.toggle`, cards, §5.7 (3 px) family; Q6 if the operator wants a different corner |
| Rest | transparent over `rgba(8,10,22,.65)` glass on canvas routes; 1 px border `rgba(255,255,255,.18)` | |
| Hover | border `--color-state`, text `#fff` | A3: state/hover colour |
| Active (the one colour) | `color-mix(in srgb, var(--color-accent) 22%, #080a16)` fill, `--color-accent-strong` border, `#fff` text | one look for toggle and choice; Q3 on `--body-tint` |
| Focus-visible | `outline: 2px solid var(--color-focus); outline-offset: 2px` (never removed) | |
| Disabled | opacity .42, `cursor: not-allowed` (already `LayerChipRow.svelte:140`) | |
| Count badge | inline after the label, 11 px, `--color-state` when the chip is active, `.72` white at rest, no second box | replaces deep-sky `.n`, epoch `.chip-count` |
| Tone | `--chip-tone` colours the leading 6 px dot and, when active, the border (fleet status, MI3, live) | the data colours keep their identity |

### 3.3 Keyboard and ARIA contract

- `toggle`: native button, Space / Enter, `aria-pressed`. `choice`: parent `role="radiogroup"` with `aria-label` (as today), `role="radio"` + `aria-checked`, roving
  `tabindex` (0 on the checked, −1 on the rest), ArrowLeft/Right/Up/Down move and select, Home/End. `action` / `link`: native. Disabled never receives focus.
- Deep-sky leaves `tablist`/`tab`: it becomes a `role="radiogroup"` of `choice` chips (single select, one of the "All / M / NGC …" values).
- Programs group-by becomes a `radiogroup` of `choice` chips (single select, mode = era / kind / agency).
- FILTERS strip stays `aria-expanded` + `aria-controls`; the count is read as part of the button name (`FILTERS 12 of 150`, via a visually-hidden "of").
- Visible focus on every kind; hit area meets 44 px on coarse pointers, 24 px minimum (WCAG 2.2) on fine pointers (30 px rendered).
- Real tabs (`PanelTabRow`) are untouched.

### 3.4 FILTERS label + count (MI1, FL1, launches)

`[FILTERS  12 / 150  ▾]`, one compact `Chip kind="action"`-looking strip left-aligned above the grid: label, count badge directly after it
(`filters-right` wrapper removed), chevron last. Count is accent-state coloured when a filter is active and 60 % when total only (today's
`count-fraction` / `count-total-only` colour rule kept). CLEAR FILTERS becomes `Chip quiet dismiss` placed after the count inside the open panel (it
is a `clear-btn` on launches and `clear-filters` on missions today; fleet has no clear button at all: the rule at `entity-browse-page.css:120–124`
says it "can adopt it", it never did, A4 adds it to fleet). The strip may stay full-width on phones. Q2 (compact vs full-width).

### 3.5 Reset view (E8) and ISS "Watch live" (ISS1)

- **Reset view:** one `ResetViewButton.svelte` = `<Chip kind="action" quiet icon="⟲">{m.ui_reset_view()}</Chip>`; used at all 7 sites in §2.7. The Explore
  `ScaleNav` `⟲` keeps the icon and gains the text label on fine pointers (`aria-label` unchanged); on touch under 768 px it can stay icon-only at 44 px. No locale key is
  added (`ui_reset_view` exists). Q4 decides whether the other HUD `toggle` buttons (2D/3D, Spin, AR, SKY, Assembly) move to `Chip kind="action"` in the same slice.
- **Watch live:** `<Chip kind="link" href={localHref('/live')} tone="#c62f2f" dot>{liveLinkLabel()}</Chip>`. The red live dot is the tone dot; no new colour
  (`#c62f2f` is a data/live colour: `a4-keep`). `data-testid="{id}-watch-live"` preserved.

## 4. Replacement map

| Replaced | By |
|---|---|
| `HudControls .chip` ×5 (+ drawer layout `:847–861`) | `Chip kind="toggle"`; column / drawer layout stays in `HudControls` (layout only) |
| `LayerChipRow` `.chip`, `.chip-group` | `Chip` (+ `chip-group` stays a header, A5 owns its design) |
| `SurfaceScene` `.chip` / `.toggle` rules `:7427–7625` | deleted; `Chip` |
| `entity-browse-page.css` `.pill` + `.logo-pill` (+ `.filters-toggle`, `.filters-right`, `.clear-filters`) | `Chip` + 4 rules for the FILTERS strip left in `entity-browse-page.css` |
| missions 26 `.pill` + fleet 16 + launches 12 buttons | `<Chip kind="choice">` loops |
| `PillDropdown .pill`, `EpochTimelineStrip .chip`, deep-sky `.chip`, programs `.toggle button`, `StarIndex .si-filters button`, `SurfaceIndexPanel .sidx-chip`, `TimeDock .speed-pill` | `Chip` |
| `ScaleNav .scale-reset`, 6 reset-view buttons | `ResetViewButton` |
| `StationRoute .hud-live-link` | `Chip kind="link"` |
| `launches-chip` (`SurfaceScene:7916`) | `Chip kind="link"` |

## 5. Hit list (baseline: 172 violations from `a4-check.sh`, list in `…-baseline-hits.txt`)

| Kind | Count | Files |
|---|---|---|
| PRIVATE-CSS (chip / pill / toggle base rules outside `chip.css`) | 52 | HudControls 7, SurfaceScene 8, TimeDock 5, StationRoute 4, fly 4, entity-browse-page 4, ExploreScalePicker 3, PillDropdown 3, ScaleNav 2, LayerChipRow 2, StarIndex 2, deep-sky 2, programs 2, launches 2, EpochTimelineStrip 1, SurfaceIndexPanel 1 |
| OLD-MARKUP (`class="pill|chip|toggle|…"` lines) | 101 | missions 23, HudControls 13, launches 11, fly 10, fleet 9, StationRoute 9, SurfaceIndexPanel 9, TimeDock 4, View3dControls 2, EpochTimelineStrip 2, SurfaceScene 2, 1 each in LayerChipRow, PillDropdown, ExploreScalePicker, ViewToggleButton, ScaleNav, deep-sky, programs |
| RESET-VIEW (reset buttons not the shared one) | 8 | HudControls 2, ScaleNav 2, StationRoute 2, View3dControls 1, SurfaceScene 1 |
| COUNT-AT-END (`filters-right` wrapper) | 3 | missions, fleet, launches |
| OVAL (`border-radius: 999px`) | 5 | HudControls 1, SurfaceScene 2, SurfaceIndexPanel 1, deep-sky 1 |
| FILTER-AS-TAB | 1 | deep-sky `:164` |
| NO-CHIP-CSS / NO-CHIP-COMPONENT | 2 | `chip.css`, `Chip.svelte` do not exist yet |

`a4-check.sh` counts only the 20 files in its `SCOPE` list (§10); the raw 26-button `class="pill"` markup in missions is counted per line (23 lines that
carry `class` and the keyword on one line; multi-line attribute lists are only counted when the class is on its own line). Expected zero-state: every PRIVATE-CSS and OLD-MARKUP line
converted, or carrying `a4-keep: <why>` (below).

### Expected `a4-keep` markers

| Where | Why kept |
|---|---|
| `HudControls .ctrl-row.chips` layout rules (`:510`, `:828`, `:852`, `:867`) | column / drawer / short-window layout of the group, not the chip look |
| `LayerChipRow .chip-group` header | the Earth group header: A5 designs it |
| fleet `.status-pill.status-*.active` colours (`fleet:825–844`) | data colours, move to `--chip-tone` in A4 so they are not kept; marker only if Q3 says otherwise |
| `StationRoute .hud-live-link .live-dot` colour | live red |
| `EpochTimelineStrip` desktop `.band` rules | not chips, MI2 |
| `TimeDock .speed-group` joined container border | group frame (the pills inside convert) |

## 6. Allow-list (not touched, with reason)

| Item | Reason |
|---|---|
| Home (`routes/+page.svelte`) | H8: home slice |
| Lab (`src/lib/lab/*`, `routes/lab/*`), `routes/dev/*` | Lab is its own app shell (UXS-015); dev not user-facing |
| `PanelTabRow` / `panel-tabs.css` tabs | real tabs |
| Nav toggles, `LocalePicker` | A6 owns the nav |
| Status, label and tag pills (§1.2 second list), `ScienceChip`, `RegimeChip` | not controls / links into /science |
| `/plan` `.mission-type-pill`, `/fly` HUD chips (`opening-fleet-chip`, `speed-pill` unless Q4) | scene / canvas routes with their own HUD; listed for the operator in Q4 |
| `SurfaceFlatPatch`, `AnnotationRings`, `PanoramaCrossLink` chips | flat-patch HUD / canvas labels; revisit with the Worlds panel slices |
| Switches and form inputs | not chips |
| `module-row` list rows, `assembly-chip` caption | rows and a caption, not chips (ISS) |

## 7. Tests, docs, locales

### Tests
- **Unit:** `src/lib/components/Chip.test.ts` (Vitest + `@testing-library/svelte` if present in the repo — NV5: not checked): `toggle` renders `aria-pressed`,
  `choice` renders `role=radio` + `aria-checked` and roving `tabindex`, arrows move + select, `link` renders `<a href>`, `disabled` is not focusable, `count` renders
  after the label, `tone` sets `--chip-tone`. `ChipGroup` arrow-key test.
- **New `tests/e2e/chip.spec.ts`** on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`: routes `/explore`, `/earth`, `/moon`, `/mars`, `/venus`,
  `/missions`, `/fleet`, `/missions/launches`, `/gallery/deep-sky`, `/programs`, `/iss`. Asserts per chip (selector `.ui-chip`): computed `font-size >= 11px`,
  height 30 px ± 1 on the fine-pointer project and `>= 44` on the two touch projects (bounding box), `border-radius` 4 px (no 999 px), active chip computed
  `border-color` = `--color-accent-strong` and background an accent mix, the same on every route, focus-visible outline 2 px; FILTERS strip: the count element's left edge is
  within 24 px of the FILTERS label's right edge (MI1); Reset-view and Watch-live are `.ui-chip` and ≥ 44 px on touch; Explore level reset has the
  visible text label on desktop.
- **a11y:** add the 11 routes' filter areas to `a11y.spec.ts` / `a11y-keyboard.spec.ts` (axe: no `aria-required-parent` on radios; keyboard: arrows inside a radiogroup, Tab
  leaves it; focus ring visible).
- **Update (selectors / roles):** `launches-timeline.spec.ts:49,59` (`button.pill` → `.ui-chip`), `missions.spec.ts:25,240,247`, `fleet.spec.ts:22–147` (`.filters-toggle`,
  `[role="radio"]`; radio role stays), `mobile-invariants.spec.ts:109–130` (`.filters` wraps), `mobile-layout.spec.ts:64–110` (`.mdg-body .chip` /
  `.chip-group ~ .chip` → `.ui-chip`), `earth.spec.ts:82–131`, `mars.spec.ts:62–64`, `hotspots.spec.ts`, `explore-paths-layer.spec.ts`, `footer-dock.spec.ts:140,189`
  (`.ctrl-row.chips`), `accent-colour.spec.ts:238` (A3 spec reads `.filters-toggle`), `type-floor.spec.ts` (re-run), `iss` / `tiangong` specs for `-watch-live`.
- **Touch-target rule:** existing assertions of 44 px: `mobile-invariants.spec.ts` lines 83–166 (search button, index-close); none on chips today (NV4).
- **Visual baselines that will change (linux PNGs, no darwin files exist):** `missions-filters` ×3, `fleet-filters` ×3, `deep-sky-head` ×3, `programs-head` ×3,
  `earth-surface-hud`, `moon-surface-hud`, `mars-surface-hud`, `venus-surface-hud` (desktop only), `iss-module-list` ×3 only if the Watch-live chip is in the list view (it is in
  `.hud-controls`, not the list: expected unchanged). 16 PNGs expected to change, 3 expected unchanged (prediction from the selectors in `visual.spec.ts:63–70, 165, 239`, not a run: NV2).
  `visual.spec.ts` helper at `:239` special-cases missions/fleet filters (opens the strip); keep.
- **Re-run all three projects:** `explore`, `explore-paths-layer`, `earth`, `moon`, `mars`, `hotspots`, `missions`, `fleet`, `launches-timeline`, `launches-i18n-de`,
  `mobile-invariants`, `mobile-layout`, `footer-dock`, `a11y`, `a11y-keyboard`, `accent-colour`, `type-floor`, `page-shell`, `smoke`, `i18n-all-routes`.

### Docs (rule says the new rule, links the new UXD-014)
- `docs/uxs/decisions/UXD-014-one-chip-and-filter.md` (status `proposed`, draft in the appendix); index row in `docs/uxs/decisions/README.md`; `docs/uxs/CHANGE-INVENTORY.md:25` row A4 (status, decision UXD-014, specs).
- `docs/concept/05_Design_System.md` **§5.7 Filter buttons** rewritten as "Chip" (it still says `padding 4–5px 11–12px`, `border-radius 3px`, colour `rgba(255,255,255,0.35)` and an
  old `rgba(68,102,255,…)` active colour, which A3 left behind: a doc-vs-code divergence to fix, not paper over); new §5.7a "FILTERS strip"; §3 type table rows unchanged.
- `AGENTS.md` design block (lines 715–770): one paragraph "Chip (src/lib/styles/chip.css, UXD-014): every toggle, filter, choice and HUD action is a `<Chip>`; 30 px fine pointer,
  44 px coarse; 4 px radius; one active colour; no page or component defines its own chip, pill or toggle rules; kept exceptions carry `a4-keep: <why>`. Enforced by tests/e2e/chip.spec.ts".
- `docs/uxs/IA.md`: `§controls` section; `docs/adr/TA.md` components paragraph (one line, `chip.css` + `Chip.svelte`); `src/lib/components/README.md`: add `Chip`, `ChipGroup`,
  `ResetViewButton` to the Surface HUD family and the "Accent colour" bullet; `src/lib/surface-scene/README.md:21` (HUD list).
- The comments in `entity-browse-page.css`, `HudControls.svelte:100–101`, `LayerChipRow.svelte` header, `missions/+page.svelte:878–886`, `fleet/+page.svelte:818–823` are rewritten (rot).
- UXS specs that name these controls (grep before writing): `UXS-001/002/003/013/015` mention chips per the A3 commit `8b85034e21a`; check each for "44" / "pill" / "oval".

### Locales
None expected: class names, ARIA roles and CSS only. `ui_reset_view`, `filters_eyebrow`, `lib_filter_*`, `launches_filters_label` and the layer labels are reused, not edited; the
FILTERS label stays `m.filters_eyebrow()` (note: launches calls `.toUpperCase()` on `launches_filters_label`, `launches:242`, a different key from missions/fleet: a drift to unify
by using `filters_eyebrow` everywhere and CSS uppercase; that is a key change, not a text change, but the operator should confirm: Q7). The visually-hidden "of" in the FILTERS button name would need a new message key (`filters_count_of`) × 14 locales; to
avoid a locale change, use `aria-label="{eyebrow} {n} / {total}"` assembled from existing keys (NV6). `git diff --stat -- messages src/lib/paraglide` must be empty. Layout risk: de (long labels: `KOMMUNIKATIONSSATELLITEN`, `ANSICHT ZURÜCKSETZEN`, `SurfaceScene.svelte:7541`) and ar (RTL: use logical properties, the roving arrows must swap).

## 8. Screenshots for the operator (via dev server, per AGENTS "Iterating on UI"; not Docker)

Desktop 1440x900 and phone 390x844, before (this commit) and after, side by side, one sheet per viewport; 9 scenes × 2 viewports:
1. `/explore` solar system (layer chips + toggles + Reset view when a body is selected + the scale `⟲`), 2. `/moon` chips, 3. `/earth` chips (the long column; A5 follows),
4. `/missions` with FILTERS open (+ closed), 5. `/fleet` with FILTERS open, 6. `/missions/launches` with FILTERS open, 7. `/gallery/deep-sky` pills,
8. `/programs` group-by, 9. `/iss` with Watch live. Plus Mars (tint decision Q3) and a `de` shot of `/missions` FILTERS and `/earth`.

## 9. Decisions and open questions (operator)

- **UXD-014 `proposed`** (draft in the appendix): one chip and one filter. The operator's go makes it `accepted`.

**Q1 Chip height and text.** (a) **30 px on mouse/trackpad, 44 px on touch, 11 px text** (recommended: plan says ≈ 28–32; the Worlds HUD already ships 34/44; text stays at the A1
floor, MI1 is fixed by contrast, letter-spacing and density). (b) 28 px, 11 px. (c) 32 px, 12 px (bigger text for MI1, adds width).
**Q2 FILTERS strip.** (a) **Compact left-aligned strip `FILTERS 12 / 150 ▾`** (recommended: count "after the label" and one look with the chips). (b) Keep the full-width bar,
only move the count next to the label.
**Q3 One active colour vs the per-world tint.** On 2026-06-17 you asked for Mars chips red, Moon grey, Earth blue (`SurfaceScene.svelte:7465–7476` comment). A4's plan says one active
colour. (a) **One accent blue active look everywhere; the world tint stays only on the world's other chrome (panel buttons)** (recommended: C3 "unified across all surfaces"; the red on
red terrain was a contrast bug, #641). (b) Keep the tint on the Worlds chips only. (c) One colour, but the active border takes the tint (a 1 px hint).
**Q4 Scope of "toggle".** The HUD action buttons (2D/3D, SPIN, AR, SKY, ASSEMBLY, Reset view) are a second family: 6 private recipes, 44 px, 4 px radius. (a) **A4 turns the whole HUD
action family into `Chip kind="action"`** (recommended: Reset view next to a 44 px 2D toggle would look wrong; same CSS, ~10 files, but it is the same work as the 7 reset sites; `/fly` and
`/plan` HUDs stay out: scene routes, listed in §6). (b) Only the Reset view button and Watch live, the other toggles wait for a HUD slice. Also PG1: the programs control GROUPS the page
by era / kind / agency, it does not filter; (a) **one single-select `choice` chip group** (recommended), (b) keep it as a segmented control visually distinct from filters.
**Q5 Layout of the Explore layer chips.** (a) **Keep the vertical left column on desktop at 30 px** (recommended: 5 chips = about 180 px, aligned with the toggle row; Worlds has up to 11 chips and A5
owns their grouping), natural width to the longest label instead of full-width 140 px. (b) A single horizontal wrapped row under the 2D / AR / SKY toggles (about 480 px wide at 30 px; collides with the
PATHS legend at 280 px on narrow windows). On touch both stay a wrapped row inside the Controls drawer.
**Q6 Corners.** C1 says chips are "the only oval things". (a) **4 px radius** (recommended, = toggles, cards, §5.7), (b) everything controllable becomes a pill (999 px: touches 6 more recipes), (c) 6 px.
**Q7 FILTERS label key.** Launches uses `launches_filters_label().toUpperCase()`, missions and fleet use `filters_eyebrow` (`launches:242` vs `missions:444`). (a) **All three use
`filters_eyebrow` + CSS uppercase** (recommended; no text change in en; a locale value may differ: check de/ar), (b) keep three keys.

## 10. Check (re-run by the independent checker; must print `A4-CHECK violations: 0`)

Baseline at `6c6925ccd5d`: **172 violations** (list in `…-baseline-hits.txt`; 52 PRIVATE-CSS + 101 OLD-MARKUP + 8 RESET-VIEW + 3 COUNT-AT-END + 5 OVAL + 1 FILTER-AS-TAB + 2 missing files). Run from the repo root as
`bash a4-check.sh`; kept here and in the scratchpad, not added to the repo. Allow marker: `a4-keep: <why>` inside the CSS rule or on / directly above the markup line.

```bash
#!/usr/bin/env bash
# A4-CHECK — run from the repo root. Prints each violation as KIND file:line text, then
# "A4-CHECK violations: N". Allow marker: `a4-keep: <why>` inside the CSS rule, or on/just above the markup line.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 - <<'PY'
import re
SCOPE = [
 'src/routes/explore/HudControls.svelte','src/routes/explore/ScaleNav.svelte','src/routes/explore/TimeDock.svelte',
 'src/lib/components/ExploreScalePicker.svelte','src/lib/components/LayerChipRow.svelte','src/lib/components/PillDropdown.svelte',
 'src/lib/components/EpochTimelineStrip.svelte','src/lib/components/View3dControls.svelte','src/lib/components/ViewToggleButton.svelte',
 'src/lib/components/StationRoute.svelte','src/lib/components/StarIndex.svelte','src/lib/surface-scene/SurfaceScene.svelte',
 'src/lib/surface-scene/SurfaceIndexPanel.svelte','src/lib/styles/entity-browse-page.css',
 'src/routes/missions/+page.svelte','src/routes/fleet/+page.svelte','src/routes/missions/launches/+page.svelte',
 'src/routes/gallery/deep-sky/+page.svelte','src/routes/programs/+page.svelte','src/routes/fly/+page.svelte',
]
CSSCLS = re.compile(r'\.(chip|chip-group|pill|pill-dropdown|toggle|speed-pill|speed-desktop-pill|sidx-chip|launches-chip|iconic-toggle|filters-toggle|clear-filters|clear-btn|hud-live-link|scale-reset|scale-back|live-pill|si-filters)(?![\w-])')
MARK = re.compile(r'class="([^"]*\b(?:chip|pill|toggle|speed-pill|sidx-chip|hud-live-link|scale-reset|clear-filters|clear-btn)\b[^"]*)"')
viol = []
for f in SCOPE:
    src = open(f).read()
    m = re.search(r'<style[^>]*>(.*?)</style>', src, re.S)
    css, markup, base = (m.group(1), src[:m.start()] + src[m.end():], src[:m.start(1)].count('\n') + 1) if m else ((src, '', 1) if f.endswith('.css') else ('', src, 0))
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(re.sub(r'/\*.*?\*/', '', rm.group(1), flags=re.S).split())
        if sel.startswith('@') or 'a4-keep' in rm.group(0) or not CSSCLS.search(sel): continue
        if re.search(r':hover|:focus|:disabled|\.active|\.on\b|::|:not|:first|:last|\[aria|\.disabled', sel): continue
        viol.append(('PRIVATE-CSS', f, base + css[:rm.start(2)].count('\n'), sel[:70]))
    mlines = markup.splitlines()
    for i, line in enumerate(mlines, 1):
        for mm in MARK.finditer(line):
            cls = mm.group(1).split()
            if 'ui-chip' in cls or 'a4-keep' in line or 'a4-keep' in mlines[max(0, i-2)]: continue
            if any(c in ('chip','pill','toggle','speed-pill','sidx-chip','hud-live-link','scale-reset','clear-filters','clear-btn') for c in cls):
                viol.append(('OLD-MARKUP', f, i, line.strip()[:70]))
for f in SCOPE:
    for i, line in enumerate(open(f).read().splitlines(), 1):
        if 'ui_reset_view()' in line:
            viol.append(('RESET-VIEW', f, i, line.strip()[:60]))
        if re.search(r'border-radius:\s*999px', line) and 'a4-keep' not in line:
            viol.append(('OVAL', f, i, line.strip()))
        if 'role="tab"' in line and f.endswith('deep-sky/+page.svelte'):
            viol.append(('FILTER-AS-TAB', f, i, line.strip()))
for f in ['src/routes/missions/+page.svelte','src/routes/fleet/+page.svelte','src/routes/missions/launches/+page.svelte']:
    for i, line in enumerate(open(f).read().splitlines(), 1):
        if 'class="filters-right"' in line:
            viol.append(('COUNT-AT-END', f, i, line.strip()[:60]))
import os
if not os.path.exists('src/lib/styles/chip.css'):
    viol.append(('NO-CHIP-CSS', 'src/lib/styles/chip.css', 1, 'file missing'))
if not os.path.exists('src/lib/components/Chip.svelte'):
    viol.append(('NO-CHIP-COMPONENT', 'src/lib/components/Chip.svelte', 1, 'file missing'))
for k, f, l, t in viol: print(f'{k:16} {f}:{l}  {t}')
from collections import Counter
print('by kind:', dict(Counter(k for k, *_ in viol)))
print(f'A4-CHECK violations: {len(viol)}')
PY
```

Known limits of the check: it matches class NAMES in 20 listed files only (a control renamed to a new class escapes; the other ~30 chip-like rules in §1.2 are the
allow-list); `RESET-VIEW` flags every `ui_reset_view()` line, including the one inside `ResetViewButton`, which then carries `a4-keep: the shared button`; `OLD-MARKUP`
reads one line at a time, so `class` split from the tag over two lines is missed; `{#each}` loops count once (the 26 missions pills are about 23 lines, the real DOM count is higher). It
does not measure rendered height, colour or the count position: `chip.spec.ts` does.

## 11. Acceptance (definition of done, per the plan)

1. `bash a4-check.sh` prints `A4-CHECK violations: 0`; `git grep -nE 'class="(chip|pill|toggle)' -- 'src/routes/missions' 'src/routes/fleet' 'src/routes/programs' 'src/routes/gallery'` is empty.
2. Docs in §7 state the rule and link UXD-014; CHANGE-INVENTORY row A4 updated; Design System §5.7 no longer carries `3px`, `0.35` or `rgba(68,102,255,…)`.
3. `chip.spec.ts` + unit tests green on desktop-chromium, mobile-chromium, mobile-landscape-chromium; the re-run list green on all three; 16 PNGs regenerated and reviewed, the others unchanged; nothing skipped or left red.
4. Every chip on the 11 routes: 30 px (fine pointer) / ≥ 44 px (coarse), ≥ 11 px text, 4 px radius, one active colour; FILTERS count adjacent to its label.
5. Locales: `git diff --stat -- messages src/lib/paraglide` empty (or, if Q7 changes keys, the per-locale check shown); `validate-data` green.
6. Home, Lab, `PanelTabRow` tabs, scene routes `/fly` and `/plan` HUD diffs empty (unless Q4 says otherwise).
7. The operator receives the §8 sheets and answers Q1–Q7.

### Appendix — draft `docs/uxs/decisions/UXD-014-one-chip-and-filter.md` (proposed; written when the go comes, not now)
```markdown
# UXD-014 — One chip and one filter for every toggle, filter, choice and HUD action

- **Status**: proposed
- **Date**: 2026-11-12 (proposed)
- **Decider**: the operator — pending. Inputs: C1, C3, G3, PG1, MI1, FL1, E8, ISS1 (`docs/wip/2026-11-11-ux-feedback-plan.md`)
- **Answers**: C1, C3, G3, PG1, MI1, FL1, E8, ISS1; slice A4
- **Changes**: `src/lib/styles/chip.css` (new), `Chip.svelte`, `ChipGroup.svelte`, `ResetViewButton.svelte`; IA §controls; Design System §5.7;
  AGENTS.md "Design system"; TA.md; `src/lib/components/README.md`

## Context
At `6c6925ccd5d` 17 recipes draw chips, pills, toggles and filter buttons: 8 heights (21–44 px), 7 radii, 8 active looks, 3 ARIA patterns for one job, a
44 px chip on desktop pointers, oval chips that are the only oval things in the UI, a FILTERS bar with the count at the far end, 4 looks of Reset view and a plain-text Watch-live link.

## Options
1. One CSS file (`.ui-chip`) plus a thin `Chip` component (markup and ARIA contract), values from the tokens. 2. CSS only, as the page shell. 3. A component only, each page keeps its own CSS.

## Decision
Option 1: 30 px on fine pointers, 44 px on coarse pointers, 11 px text, 4 px radius, one active look (accent 22 % fill, `--color-accent-strong` border, white text), hover `--color-state`, focus `--color-focus`;
kinds toggle / choice / action / link; count badge and tone dot; FILTERS strip with the count after the label; one Reset view button; Watch live as a link chip. Allow-list: tabs, status
and label pills, Lab, nav, home, `/fly` and `/plan` HUDs.

## Consequences
52 private rules and ~100 markup lines go; 16 visual baselines change; no locale change; MI3 (mission colour) and A5 (Earth groups) build on `--chip-tone` and `.ui-chip-group`.

## Verification
`tests/e2e/chip.spec.ts` on three projects; `a4-check.sh` prints `A4-CHECK violations: 0`.
```

## 12. NOT VERIFIED (what this brief did not check)

- NV1 No browser: no rendered height, width, wrap or colour; the 30 / 44 px values, the "about 180 px" Explore column and the "about 480 px" row are arithmetic from CSS. The `~` heights in §1 are padding + line-height guesses, not measurements.
- NV2 The 16-changed / 3-unchanged PNG split is a prediction from `visual.spec.ts` selectors (`.filters`, `.programs-index > header.head`, `deep-sky-head`, `surface-hud`, `iss-module-list`); no spec was run.
- NV3 Whether the missions / fleet / launches pill buttons have any arrow-key or roving-tabindex handler: only the markup was read, not the `<script>` blocks. `ExploreScalePicker`'s and `PillDropdown`'s ARIA were not read line by line.
- NV4 Existing e2e assertions on chip height or touch size: only `mobile-invariants.spec.ts` lines 83–166 were read; other specs (explore, earth, a11y) may assert sizes of chips.
- NV5 Whether `@testing-library/svelte` or another component-test harness is installed (only `*.test.ts` logic tests were seen: `StarPanel.assets.test.ts`, `tokens.test.ts`); the unit test for `Chip` may need a different approach.
- NV6 The `aria-label` for the FILTERS button assembled from existing keys was not checked against the 14 locales' word order; a visually hidden "of" may need a key.
- NV7 UXS-001/002/003/013/015 text about chips was not read; only the A3 commit message names them. Docs to edit in §7 are from the A3 file list, not a fresh grep of every doc for "pill", "chip", "44".
- NV8 `SurfaceIndexPanel`, `StarIndex`, `TimeDock` speed pills, `TierContextCard`, `StationTimelineStrip` markers and `EnterArButton` / `EnterSkyButton` / `ViewToggleButton` / `PanoramaToggleButton` were scanned by CSS only; their active looks (rows 14–16) were not read.
- NV9 The 2026-06-17 per-world tint request is quoted from a code comment (`SurfaceScene.svelte:7465–7476`), not from a decision record; `docs/uxs/decisions/` has no record of it and `BACKFILL.md` was not searched.
- NV10 `a4-check.sh` ran once at baseline (172) and has no tests of its own; it was not run against a fixed tree. The `--chip-tone` hook for fleet status and MI3 colours was not prototyped.
- NV11 `/tiangong`, `/venus` and `/live` share the code paths read here (StationRoute, SurfaceScene) but were not individually checked; `/live` has no filter control in the scan.
- NV12 The statement "no `.chip` global class exists" rests on the CSS scan of `<style>` blocks and `src/lib/styles/*.css`; `Nav.svelte:1230` styles `:global(.chip)` inside the drawer, so a global `.chip` consumer exists (kept untouched: the new class is `.ui-chip`).
