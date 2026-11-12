# Slice A4 brief — one chip and one filter (C1, C3, G3, PG1, MI1, FL1, E8, ISS1)

Read-only brief, written at HEAD `6c6925ccd5d` (A1 type scale, A2 page shell and A3 accent tokens landed on this branch), **updated 2026-11-12 at HEAD
`50b3e962a8d` with the operator's decisions (§0a) and the runtime inventory of every clickable control (§1.3)**. Full baseline
check output: `2026-11-12-slice-A4-baseline-hits.txt` (174 lines, 172 violations; re-run at `50b3e962a8d`: still 172). Method: `git grep` / a Python CSS-rule scan over every
`src/**/*.svelte` and `*.css` file from the repo root (not hand-scoped), plus a read of every in-scope control; every `file:line` was read
at that commit. No browser, no build, no test run for this brief: heights below are computed from CSS, not measured (see §12); the inventory in §1.3 is a
crawl made by the operator's session with a headless browser, read from its JSON, not re-run here.

## 0a. Decisions (operator 2026-11-12) and what the cascade means for A4

Recorded in `docs/wip/2026-11-11-ux-feedback-plan.md` (lines "A4 chips", "A4/A5 follow-up", "A3–A6 answers", "A5 last two"). These replace every "recommended / Q1–Q7"
text of the first version of this brief; the old questions are gone from §9.

| # | Decision | Where it lands in this brief |
|---|---|---|
| D1 | **Chip option A, "the quiet rectangle"**: 30 px on fine pointers, 44 px on touch, 4 px corners, 11 px uppercase, outline at rest, soft blue fill + blue edge + white text when on | §3.2 |
| D2 | Explore and Worlds layer chips are **one horizontal row** (A5 owns the row; A4 owns the chip) | §3.1, A5 brief |
| D3 | **Per-world tint stays on the Worlds pages** (active chip red-tinged on Mars, grey on Moon, as today): option A shape with the world tint on edge and soft fill, white text. Blue everywhere else | §3.2, §3.6 |
| D4 | **Compact FILTERS strip**, count right after the label | §3.4 |
| D5 | **HUD action buttons use the same chip**: 2D/3D, RESET VIEW, SPIN, AR, SKY, ASSEMBLY, the Explore ScaleNav back / reset, Watch live, and every look the crawl found that is the same job (§1.3.3) | §3.5, §4 |
| D6 | **Programs group-by becomes a single-choice chip group** | §3.3 |
| D7 | **One FILTERS label key**, `filters_eyebrow`, uppercase by CSS (launches stops calling `.toUpperCase()` on `launches_filters_label`) | §3.4, §7 Locales |
| D8 | Every clickable control on every page and state is reviewed, not only the ones the first scan listed | §1.3, §5 |

**Cascade from A3 (landed; final tokens now in `src/lib/styles/tokens.css:9–20`).** `--color-accent` `#5070ff` (links, accents, active edge), `--color-accent-soft`
`rgba(80,112,255,.12)`, `--color-accent-edge` (.35), `--color-accent-strong` (.7), `--color-state` `#889fe7` (hover, annotation rings, small text on a lifted background),
`--color-focus` `#8aa0ff`; contrast rule: a solid accent fill takes dark text `#04040c`, white text only on a soft fill. The A3 commit `50b3e962a8d` already moved the
**core-tier chips** (library, Belt panel, science sections) to "the chip active look: blue edge + soft blue fill + white text" as private CSS
(`BeltPanel.svelte`, `library/+page.svelte`, `science/[tab]/[section]/+page.svelte`). So the active look of D1 is not new: A4 defines it **once** in `chip.css` and those three
rules must end up identical to it (or on `.ui-chip` if they are controls; NV13). The unlisted A3 consequence for A4: the programs group-by active colour is still the pre-A3 teal-blue
`rgba(127,176,224,.18)` at `programs/+page.svelte:257–261` (re-checked with `git grep` at `50b3e962a8d`; A3's widened check left it because A4 owns the control).
**Per-world tint and A3:** the `--body-tint` colours are data/scene colours (Mars red, Moon grey, Venus amber, Earth blue). A3's "no cyan / no teal" memory does not apply to them; Earth's tint
(`#4488ff`-like in the crawl) is not the accent `#5070ff`, so on Earth the chip uses `--color-accent` (decided in §3.6: one blue, not two).

**What A4's option A means for A5 and A6.** A5 (flat row, no group captions): inherits the chip unchanged and loses `ChipGroup` captions and group masters entirely; `ChipGroup` stays only as
the `role="radiogroup"` wrapper for `choice` chips (arrow keys). The A4 `a4-keep` markers on `.ctrl-row.chips` column / drawer / short-window rules (§5) are rewritten by A5, not kept.
A6 (nav): keeps nav toggles outside the chip family (A4 §6) but uses the same two-step sizing (32 px fine / 44 px touch for the nav, 30 / 44 for the chip, both decided) and the same active recipe; see the A6 brief §1.

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
| PG1 | The 3 filters at the top (era, kind, agency) are unique to this page; align with other similar ones. | `programs/+page.svelte:129–139` is a group-by toggle (era / kind / agency), a joined segmented control with its own CSS (`:234–263`); it GROUPS, it does not filter; decided D6: one single-choice chip group |
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

Correction from the crawl (§1.3): `launches/ProvenanceChip` **is a `<button>`** (a popover trigger, 22 px high, 1,396 on `/missions/launches`), not a passive label; it is
handled in §1.3.2 row 9, not here.

### 1.3 Runtime inventory (2026-11-12 crawl)

Source: `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/a4proto/inventory.json` (script `crawl.mjs` beside it), made with a headless
browser against a running build, read here as data; this brief did not re-run it. **116 pages**: every static route, two of each dynamic family (entity pages), the static
sub-pages listed in the script, and 14 states (`/moon?site=apollo11`, `/mars?site=perseverance`, `/earth?site=ksc`, explore planet panel `?id=mars`, star panel `?goto=antares`,
mission panel, fleet panel, missions / fleet / launches with FILTERS open, explore index open, mars index open, `/iss`, `/tiangong`), each at **desktop 1440 × 900 and phone 390 × 844 (touch)**.
Recorded for every visible clickable (`button`, `[role=button|tab|radio|switch]`, `[aria-pressed]`, `select`, `summary`, `a.chip|pill|btn…`): computed height, radius, font size, text-transform,
background, border colour and width, grouped by `tag|class|height|radius|font-size|text-transform|bg|border colour|border width` into **205 distinct looks**, each with example labels and the routes it appears on.

#### 1.3.1 What the crawl did NOT cover (so that nobody reads it as complete)
- The nav bar, the footer dock and the debug panel are excluded by the crawl's filter (A6 owns the nav; the footer dock has its own spec).
- Plain `<a>` link-buttons whose class does not contain `chip|pill|btn`: so **`a.hud-live-link` (Watch live) and the Worlds "launches from here" link chip are not in the file**; `/live`'s
  ISS player and the library / credits / colophon TOC links are links, not captured either.
- The Worlds LAYERS / CONTROLS drawers on phone (closed in the crawl): the phone look of the Worlds chips and of the phone-only `mdg-tab` content was not seen; only the desktop chips are.
- ScaleNav (`‹` and the level `⟲`, E8) did not render in any crawled Explore state (no level selected); the `/moon`, `/earth`, `/venus` index-open states (only `/mars` was opened); the
  `PillDropdown` open list; the Why? popover; hover / pressed / focus looks; the `de` and `ar` layouts.
- `missions` and `launches` FILTERS-open states expose **no `.pill` buttons** in the file (only `/fleet`'s 12 `pill` looks appear; missions and launches show the epoch bands / phone epoch chips and
  the strip, not the 26 and 12 pills the source has): either the panel was not open at capture time or the pills sit behind another toggle; the source counts of §1.1 stand, the crawl neither confirms nor contradicts them.
- One look is suspicious and unexplained: **888 buttons with browser-default chrome** (`button`, no class, 19 px, `rgb(239,239,239)` background, 2 px black border, labels "select mercury", "select venus", "select earth" …)
  on 22 routes (`/explore`, the four Worlds, `/fleet`, `/missions`, `/iss`, `/tiangong` and their states). They look like the invisible keyboard / screen-reader proxies for canvas objects that the crawl's visibility test
  did not classify as hidden. NOT VERIFIED (NV14): if any of them is actually on screen it is a bug, not a chip.

#### 1.3.2 The 205 looks grouped into control families, and what A4 does with each

| # | Family | Looks | Classes / what they are | Where (routes and states) | A4 verdict |
|---|---|---|---|---|---|
| 1 | **Layer chip** | 6 + 1 | `chip` / `chip.active`: Explore PLANETS, DWARFS, COMETS, ISM, ICONIC MISSIONS (44 px, r999, blue); Worlds chips 34 px r999 with the tint (Earth blue, Moon grey, Mars red, Venus amber); plus `chip-group.active` (ON EARTH / IN SPACE master, Earth only) | `/explore` + planet panel + index open; `/earth`, `/moon`, `/mars`, `/venus` + site-selected and index states | **IN** (D1–D3); the Earth group master goes with A5 (switches dropped) |
| 2 | **HUD action** | 18 | `toggle` ×7 (RESET VIEW, SPIN, 2D/3D, HUD, CAP, AR; 34 / 44 px, r4, grey edge on Worlds `rgba(190,195,210,.4)`, blue edge on Explore, stations and /fly), `play-btn` ×2 (⏸ and the time-dock `⟲` `.reset-btn`, 32 px r5), `enter-sky` ×1 (SKY, phone only), `locate-me` ×2 (35 / 40 px r8), `stand-at-site` ×2 and `zoom-to-detail-button` ×2 (30 px r3, world-tinted), `earth-compact` ×1 and `earth-compare` ×1 (the Explore time-dock scale pills, 32 px r16 / 46 px r6) | 16 routes for `toggle` (Worlds, Explore, `/fly`, `/iss`, `/tiangong` + states); `locate-me` `/earth`, `/moon` (+ site states); `stand-at-site` / `zoom-to-detail-button` `/moon`, `/mars` site-selected; `earth-*` `/explore` + states; `enter-sky` 10 routes on phone | **IN** (D5): all of them become `Chip kind="action"`; the two world-tinted ones take the Worlds tint (D3) |
| 3 | **HUD choice (speed pills)** | 4 | `speed-pill.speed-desktop-pill` (+ active) at 32 px r0 joined (Explore time dock) and 44 px r3 (`/fly`) | `/explore` + states; `/fly` | **IN**: `Chip kind="choice"` in one `radiogroup`; the joined frame stays (`a4-keep`) |
| 4 | **Filter: FILTERS strip** | 2 | `filters-toggle` closed / open, 35 px r4, `FILTERS 126 ▸ / ▾` | `/missions`, `/fleet`, `/missions/launches` + their filter-open states | **IN** (D4) |
| 5 | **Filter: catalog pill** | 1 | `pill` 44 px r3 (Launchers, Capsules …) | `/fleet` (+ states); missions and launches pills not in the crawl (§1.3.1) | **IN** |
| 6 | **Filter: deep-sky** | 2 | `chip` / `chip.active` 33 px r999, active = solid `#889fe7` | `/gallery/deep-sky` | **IN** (G3) |
| 7 | **Filter: programs group-by** | 2 | button 32 px r0 + active `rgba(127,176,224,.18)` | `/programs` | **IN** (D6) |
| 8 | **Filter: surface index chip** | 2 | `sidx-chip` 24 px r999 (+ active) | `mars index open` (and, by the same component, the other Worlds index panels, not crawled) | **IN** |
| 9 | **Filter: nation legend item** | 1 | `legend-item` 20 px r3, 13 items, active-by-default (a toggle per agency / nation) | `moon site selected`, `mars site selected` (SurfaceScene `:5701`, `:6181`) | **IN** as `Chip kind="toggle" tone` (the nation colour is `--chip-tone`); target under 24 px today |
| 10 | **Filter: epoch** | 10 + 10 | phone `chip` / `chip.active` 32 px r14 with the band colour; desktop `band` 26 / 54 px (the epoch timeline, 3 px coloured edge) | `missions` / `fleet` filter states | chips **IN** (`tone` = band colour); desktop `band` stays: MI2 redesigns it |
| 11 | **Mission-type pill (/plan)** | 2 | `mission-type-pill` 44 px r4, blue active | `/plan` | **OPEN** (scene route; see §9 O1) |
| 12 | **Tab** | 3 + 2 | `PanelTabRow` (`GALLERY STORY LEARN`, `OVERVIEW` active, 44 px); drawer / HUD tabs `mdg-tab` (40 px r8) and `fly-mtab` (40 px r6) | panel states; phone Worlds / stations drawers; `/fly` phone | **STAY** (real tabs / drawer switchers). The three tab looks differ from each other: panel slice |
| 13 | **Edge / index pull-tab** | 7 | `INDEX` handles on Explore (body and star) and Worlds (71 px tall, `rgba(8,10,22,.85)` with a grey or blue edge), `edge-handle` MODULES 110 px and TIMELINE 24 px on `/iss`, `/tiangong` | `/explore` + states, Worlds, `/iss`, `/tiangong` | **STAY** (vertical pull tabs, A5 reserves their left strip); **OPEN** whether they should adopt the chip edge colours (§9 O1) |
| 14 | **Panel close / backdrop / hero** | 9 | `×` in three looks (`panel-close` 44 px r4, `index-close` 44 px r4, `bidx-close` and `sidx-close` 30 px r8), `panel-backdrop`, `panel-hero-btn` | every panel state | **STAY** (panel slice); look drift listed in §1.3.4 |
| 15 | **CTA / card buttons** | 7 + 58 | `cta`, `cta-card`, `cta-tour`, `spec-cta` (44–55 px r4, solid blue `rgb(26,51,187)` or outline) and the entity cards of `/fleet` and `/missions` (a card is a `<button>`: 58 looks that differ only by height) | panel states, `/fleet`, `/missions`, home | **STAY** (cards and primary CTAs are not chips; home is H8) |
| 16 | **Disclosure / inline helper buttons** | 5 + 7 | `summary` (credits "136 pages consulted" 16 px; plan "READING THE PORKCHOP"; EntityIndex "All missions A–Z" 32–53 px), `tcc-toggle` ▾ 44 px, **Why?** `trigger` 14 px r7, `provenance-chip` 22 px (button), `t-name` 22 px (programs timeline mission names), `xref-link` 20 px, `show-all` 46 px r4 | `/credits`, `/plan`, `/colophon`, moon / mars site states, `/missions/launches`, `/programs/*`, fleet panel | `show-all` **IN** (`Chip kind="action"`); the rest **STAY** as disclosure / text buttons with a **target-size fix** (§1.3.4) |
| 17 | **ScienceChip link** | 3 | `a.chip` 24 px, `?` into `/science` (ADR-036) | `/fly`, `/plan`, moon / mars site states | STAY (allow-list) |
| 18 | **Science rail search** | 2 | `search-button` 38 px (desktop) / 44 px (phone), r4, "⌕ Search ⌘K" | 54 `/science/*` routes | STAY (A6 / science layout); 38 px vs the nav's decided 32 px: noted in the A6 brief |
| 19 | **Lab** | 6 | `lab__view-btn`, `nb__*` | `/lab` | STAY (UXS-015, Lab shell); the Lab chip-like `lab__view-btn--on` already uses the blue active look |
| 20 | **Rows, thumbnails, openers, form selects** | 19 + 8 + 4 | `module-row`, `bidx-row`, `sidx-row`, `thumb-open`, `pin-tile` (`/live`), `open`, `blueprint-open`, `fd-stage-tick-button`, feature rows and gallery cards rendered as `<button>`, `dest-select`, `card__select`, `lab__picker-select`, `nb__add-select` | `/iss`, `/tiangong`, `/colophon`, `/gallery/deep-sky`, `/live`, site states | STAY (rows, images, form controls) |
| 21 | **/fly opening CTAs** | 3 | `opening-launch`, `opening-skip` (38–47 px r4, amber / blue edge) | `/fly` | STAY (scene route CTAs) |
| 22 | **Browser-default buttons** | 1 (888 elements) | "select mercury …" (see §1.3.1) | 22 routes | NOT A CHIP; to be checked (NV14) |

The per-row look counts add up to the 205 looks of the file (the class-name mapping that assigns each look to a row is `fam.py` in the same scratchpad folder; the mapping is this brief's judgement, the crawl data is not).

#### 1.3.3 Pages and states where an in-scope look appears and the first hit list did not cover them

The first hit list scanned 20 files by class name (§10). Every row below is a control that D5 / D8 put in scope and that the first scan missed, either because the file was not listed or because
the class name was not in the regex (the file was listed). `check` column: the extended script of §10 now counts them.

| Page / state | Control (family) | Source file | Why the first scan missed it | New violations in the extended check |
|---|---|---|---|---|
| `/tiangong`, `tiangong` state (and `/iss`, `iss` state) | HUD / CAP / 3D `toggle` 44 px; `index-close`; Watch live (if the crawl had seen it) | `StationRoute.svelte` (listed) | §0 / row 17 covered `/iss` only; NV11 said `/tiangong` was not individually checked. The crawl confirms the same toggles on both routes | 0 new (file already scanned); `/tiangong` added to `chip.spec.ts` and the screenshots (§7, §8) |
| `/moon?site=apollo11`, `/mars?site=perseverance` (site selected) and `/earth?site=ksc` | **Stand here** (`stand-at-site`, 30 px r3, tinted) | `PanoramaToggleButton.svelte` | file not in the scan list | 2 (file) + 3 `.stand-at-site` rules in `SurfaceScene.svelte` |
| same states | **Zoom in / View route** (`zoom-to-detail-button`, 30 px r3, tinted) | `SurfaceScene.svelte:6304–6336`, CSS `:7159` | class not in the regex | included in the SurfaceScene count below |
| same states (Moon, Mars) | **Nation legend** (`legend-item`, 13 items, 20 px) | `SurfaceScene.svelte:5701`, `:6181`, CSS `:7680` | class not in the regex | 2 markup + 1 rule; `SurfaceScene.svelte` goes from 13 to 23 hits in total (+10) |
| `/earth`, `/moon` and their site states | **Center on my location / View from my location** (`locate-me`, 35 / 40 px r8) | `routes/earth/+page.svelte:198, 244`, `routes/moon/+page.svelte` | route files not in the scan list | 5 + 5 |
| `/explore` and all its states (planet panel, star panel, index open) | **SCALE 0.53×** (`earth-compact`, phone) and **REFERENCES PLANET SCALES** (`earth-compare`, desktop); `⏸` `play-btn`, time-dock `⟲` `.reset-btn` | `explore/TimeDock.svelte` (listed) | classes not in the regex (only `.toggle`, `.speed-pill` were) | `TimeDock.svelte` 9 -> 22 (+13) |
| 10 routes on phone (`/earth`, `/explore`, `/mars`, `/moon` + states) | **SKY** (`enter-sky`, 44 px r4, 12 px); **AR** | `EnterSkyButton.svelte`, `EnterArButton.svelte` | named in §1.1 row 3 but not in the scan list | 2 + 4 |
| `/colophon` | **Show all 198** (`show-all`, 26 buttons, 46 px r4, 16 px text) | `routes/colophon/+page.svelte:122` | shell page with its own control, not in the scan list | 2 |
| `/explore` and the Worlds (tour button) | `PanoramaAutoTour` `.play-btn` | `PanoramaAutoTour.svelte` | not in the scan list | 2 |
| `/fly` | `toggle` (2D), `play-btn` ⏸ 44 px r3, `speed-pill` 44 px r3 (1×, 30×, 90×) | `fly/+page.svelte` (listed) | `play-btn` not in the regex; **scope of `/fly` HUD is open (§9 O1)**: §6 kept `/fly` out, §1.1 rows 3 and 16 put it in | +2 (`play-btn` rules) on top of the baseline's 14 |
| `/plan` | `mission-type-pill` 44 px r4; `summary` | `plan/+page.svelte` | not in the scan list; scene route | not counted until O1 is answered |
| `/missions/launches` | `provenance-chip` (button, 22 px, ×1,396) | `launches/ProvenanceChip.svelte` | classified as a label pill (§1.2) | not counted: target-size fix only (§1.3.4) |
| `/programs/vostok`, `/programs/voskhod` (entity pages) | `t-name` timeline names (22 px, text-link look, blue / white edge colour) | `programs/[id]/+page.svelte` | not in the scan list | not counted: text link buttons, target-size fix only |
| `/credits`, `/colophon` TOC | `summary` "N pages consulted" (16 px); TOC links | `routes/credits/+page.svelte:646` | shell pages; disclosure | not counted (disclosure family stays) |
| `moon site selected`, `mars site selected` | Why? `trigger` 14 px r7 (`WhyPopover.svelte:81`), `tcc-toggle` ▾ | `WhyPopover.svelte`, `TierContextCard.svelte` | not in the scan list | not counted: target-size fix only |

Extended check result (script in §10, run from the repo root at `50b3e962a8d`, scratchpad copy `a4-check-ext.py`): **222 violations** (baseline 172 + 47 PRIVATE-CSS / OLD-MARKUP lines in the 7 added files and the newly named classes
in the already-scanned files + 3 FILTERS-label lines), by kind `PRIVATE-CSS 80, OLD-MARKUP 120, RESET-VIEW 8, OVAL 5, FILTER-AS-TAB 1, COUNT-AT-END 3, NO-CHIP-CSS 1, NO-CHIP-COMPONENT 1, FILTERS-LABEL-KEY 2, FILTERS-JS-UPPERCASE 1`.

#### 1.3.4 Findings for other slices that the crawl surfaced (A4 does not fix them)
- **Target size under 24 px on fine pointers** (WCAG 2.5.8, the repo's own floor in finding 1): Why? trigger 14 px, `summary` 16 px (credits), `xref-link` 20 px, `legend-item` 20 px (A4 fixes this one), `t-name` 22 px, `provenance-chip` 22 px (1,396 of them), `sidx-chip` 24 px. A4 fixes the chips among them; the rest need a hit-area rule (`::after`), listed for the touch-target pass.
- **Close button drift**: `×` is 44 px r4 (panel, station index), 30 px r8 (body index, surface index); tabs are 44 px r0 (panel), 40 px r8 (drawer), 40 px r6 (/fly); INDEX handles have three different edge colours. Panel slice.
- **Selected entity card edge**: `card.selected` is `rgb(255,200,80)` on `/fleet` but `rgb(11,61,145)` (`#0b3d91`, a dark blue that is not a token) on `/missions`. Not a chip; for the A3 follow-up / panel slice.
- **Science rail search button** 38 px desktop, 44 px phone: not in the nav; A6 notes it.

## 2. Findings that shape the proposal

1. **Touch 44 px is the only reason chips are tall.** The 44 px comes from the AGENTS touch rule and ADR-018. The Worlds HUD already
   shows the answer: 44 px on touch, 34 px under `(hover: hover) and (pointer: fine)` (`SurfaceScene.svelte:7560`, comment "34 px is plenty
   (WCAG 2.2 minimum is 24)"). Explore and the catalog pills never got the second half, so they are 44 px on desktop (C1, MI1 "ugly").
2. **"Oval" is only the layer chips and deep-sky** (999 px, 5 places). Everything else (toggles, pills, buttons, cards) is 3–5 px. C1
   says chips are "the only oval things": the cheapest consistent fix is to take the oval away, not to make everything else oval.
3. **MI1 "text too tiny" is not a size bug.** The pill is already 11 px (A1 floor). It reads tiny because it is 11 px bold at 60 % white
   with 2 px letter-spacing on a transparent box inside a 44 px cell, uppercase, on 20+ pills. The fix is contrast and density (rest
   colour .72, letter-spacing 1 px, 30 px box), not a bigger font (decided D1: 11 px).
4. **Active colour: 8 looks.** Three of them break A3: `programs:257–260` hard-codes `rgba(127,176,224,…)` and `#cfe3fb`; deep-sky uses a solid fill the A3
   rule allows only with dark text (it has it); the Worlds `--body-tint` is a per-route colour the operator asked for on 2026-06-17
   ("chips on mars used to be red … on moon grey … earth blue") and which the operator kept for the Worlds (D3, §3.6).
5. **The FILTERS strip is a full-width bar with the count pushed to the far right** by `justify-content: space-between`; moving the count
   next to the label is a one-line layout change plus making the bar a chip (decided D4: compact strip).
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
| Height | **30 px** at `(hover: hover) and (pointer: fine)`; **44 px** `min-height` at `(pointer: coarse)` | decided (D1); precedent `SurfaceScene.svelte:7560` (34 px / 44 px) |
| Padding / gap | `0 12px` / row gap 6 px, column gap 6 px; stack in `.ui-chip-group` (flex wrap) | the row layout is A5's (one horizontal row, D2); on touch the chips wrap inside the drawer |
| Text | `--size-label` 11 px, 700, letter-spacing 1 px, uppercase via CSS, Space Mono, rest colour `rgba(255,255,255,.72)` (A1 alpha ≥ .58) | one size, MI1 contrast fix |
| Radius | **4 px** | decided (D1); matches `.toggle`, cards; replaces the 999 px of the layer chips and deep-sky |
| Rest | **outline**: transparent over `rgba(8,10,22,.65)` glass on canvas routes, 1 px border `rgba(255,255,255,.18)` | decided (D1) |
| Hover | border `--color-state`, text `#fff` | A3: state/hover colour |
| Active | fill `color-mix(in srgb, var(--chip-tint, var(--color-accent)) 22%, transparent)` (the soft fill), edge `var(--chip-tint, var(--color-accent))`, `#fff` text | one look for toggle and choice; `--chip-tint` is unset everywhere except the Worlds (§3.6), where it is the world tint; the A3 core-tier chip (`50b3e962a8d`) must resolve to the same values |
| Focus-visible | `outline: 2px solid var(--color-focus); outline-offset: 2px` (never removed) | |
| Disabled | opacity .42, `cursor: not-allowed` (already `LayerChipRow.svelte:140`) | |
| Count badge | inline after the label, 11 px, `--color-state` when the chip is active, `.72` white at rest, no second box | replaces deep-sky `.n`, epoch `.chip-count` |
| Tone | `--chip-tone` colours the leading 6 px dot and, when active, the border (fleet status, MI3, live) | the data colours keep their identity |

### 3.3 Keyboard and ARIA contract

- `toggle`: native button, Space / Enter, `aria-pressed`. `choice`: parent `role="radiogroup"` with `aria-label` (as today), `role="radio"` + `aria-checked`, roving
  `tabindex` (0 on the checked, −1 on the rest), ArrowLeft/Right/Up/Down move and select, Home/End. `action` / `link`: native. Disabled never receives focus.
- Deep-sky leaves `tablist`/`tab`: it becomes a `role="radiogroup"` of `choice` chips (single select, one of the "All / M / NGC …" values).
- Programs group-by becomes a `radiogroup` of `choice` chips (single select, mode = era / kind / agency; decided D6: it groups, it does not filter, and is still one chip group like the filters).
- Nation legend (`legend-item`, §1.3.3): `toggle` chips with `tone` = the nation colour, in one `role="group"` (several can be on).
- Speed pills: `choice` chips in a `radiogroup`.
- FILTERS strip stays `aria-expanded` + `aria-controls`; the count is read as part of the button name (`FILTERS 12 of 150`, via a visually-hidden "of").
- Visible focus on every kind; hit area meets 44 px on coarse pointers, 24 px minimum (WCAG 2.2) on fine pointers (30 px rendered).
- Real tabs (`PanelTabRow`) are untouched.

### 3.4 FILTERS label + count (MI1, FL1, launches)

Decided (D4, D7): `[FILTERS  12 / 150  ▾]`, one compact `Chip kind="action"`-looking strip left-aligned above the grid: label, count badge directly after it
(`filters-right` wrapper removed), chevron last. The label is `m.filters_eyebrow()` on all three pages, uppercase by CSS (`text-transform`), and `launches` drops
`launches_filters_label().toUpperCase()` (`launches:242`) and the second use of that key as the `aria-label` of `#launches-filters` (`:254`); see §7 Locales. Count is accent-state coloured when a filter is active and 60 % when total only (today's
`count-fraction` / `count-total-only` colour rule kept). CLEAR FILTERS becomes `Chip quiet dismiss` placed after the count inside the open panel (it
is a `clear-btn` on launches and `clear-filters` on missions today; fleet has no clear button at all: the rule at `entity-browse-page.css:120–124`
says it "can adopt it", it never did, A4 adds it to fleet). On phones the strip is the same compact strip (it does not stretch to full width).

### 3.5 Reset view (E8) and ISS "Watch live" (ISS1)

- **HUD action family (decided D5):** every look of family 2 in §1.3.2 becomes `Chip kind="action"` (or `toggle` where it has a pressed state: 2D/3D, SPIN, AR, SKY, ASSEMBLY, HUD / CAP): the six private `.toggle` recipes, `ViewToggleButton`, `View3dControls`, `EnterArButton`, `EnterSkyButton`, `locate-me`, `stand-at-site`, `zoom-to-detail-button`, the time-dock `earth-compact` / `earth-compare` / `play-btn` / `reset-btn`, `ScaleNav` back and reset, and the `/iss` and `/tiangong` HUD toggles. `earth-compare` is a pill with an Earth image inside: it keeps the image as the `icon` snippet and takes the chip box (46 px r6 today).
- **Reset view:** one `ResetViewButton.svelte` = `<Chip kind="action" quiet icon="⟲">{m.ui_reset_view()}</Chip>`; used at all 7 sites in §2.7. The Explore
  `ScaleNav` `⟲` keeps the icon and gains the text label on fine pointers (`aria-label` unchanged); on touch under 768 px it can stay icon-only at 44 px. No locale key is
  added (`ui_reset_view` exists). The time-dock `⟲` (`.reset-btn`, resets the time) is a different action: it stays icon-only, not `ResetViewButton`, but is the same chip.
- **Watch live:** `<Chip kind="link" href={localHref('/live')} tone="#c62f2f" dot>{liveLinkLabel()}</Chip>`. The red live dot is the tone dot; no new colour
  (`#c62f2f` is a data/live colour: `a4-keep`). `data-testid="{id}-watch-live"` preserved.

### 3.6 Per-world tint (decided D3)

The Worlds keep their tint, as today, on the **active** state only. Mechanism: the Worlds HUD sets `--chip-tint` from the route's existing `--body-tint` (Moon grey, Mars red, Venus amber as in the crawl,
`SurfaceScene.svelte:7465–7476`); `.ui-chip` reads `var(--chip-tint, var(--color-accent))` for the edge and the soft fill, text stays white. **Earth sets nothing**: its tint today is a different blue
(`#4488ff`-like, crawl) from the accent `#5070ff`; the chip uses the accent so that the Earth page is blue D like every other page (this is a decision inside D3, stated here: the operator said "blue elsewhere",
Earth is the world whose tint is blue). The same `--chip-tint` reaches the HUD action buttons of the Worlds. Today only `stand-at-site` and `zoom-to-detail-button` carry the tint at rest (Moon grey, Mars red edge, crawl); the other Worlds toggles (RESET VIEW, SPIN, 2D) have a neutral grey edge. Proposed: all of them use the D1 outline at rest and take the tint on hover / pressed, so the Worlds HUD reads as one family (§9 O2 asks for a yes). The mission and fleet colour codes (MI3, `--chip-tone`, §3.1) are a different hook: `tone` colours the leading dot and the active edge of data chips (fleet status, mission colour, nation legend); `--chip-tint` is set by the page, `tone` by the data.
Contrast check required in the build (NOT VERIFIED here, NV15): white text on a 22 % tint fill over the dark glass for Mars red and Venus amber.

## 4. Replacement map

| Replaced | By |
|---|---|
| `HudControls .chip` ×5 (+ drawer layout `:847–861`) | `Chip kind="toggle"`; column / drawer layout stays in `HudControls` (layout only) |
| `LayerChipRow` `.chip`, `.chip-group` | `Chip`; the `.chip-group` header button (Earth ON EARTH / IN SPACE masters) is **deleted by A5** (operator: switches dropped), A4 does not restyle it |
| `SurfaceScene` `.chip` / `.toggle` rules `:7427–7625` | deleted; `Chip` |
| `entity-browse-page.css` `.pill` + `.logo-pill` (+ `.filters-toggle`, `.filters-right`, `.clear-filters`) | `Chip` + 4 rules for the FILTERS strip left in `entity-browse-page.css` |
| missions 26 `.pill` + fleet 16 + launches 12 buttons | `<Chip kind="choice">` loops |
| `PillDropdown .pill`, `EpochTimelineStrip .chip`, deep-sky `.chip`, programs `.toggle button`, `StarIndex .si-filters button`, `SurfaceIndexPanel .sidx-chip`, `TimeDock .speed-pill` | `Chip` |
| `ScaleNav .scale-reset`, `.scale-back`, 6 reset-view buttons | `ResetViewButton` / `Chip kind="action"` |
| `TimeDock .earth-compact`, `.earth-compare`, `.play-btn`, `.reset-btn`; `locate-me` (`earth`, `moon`); `.stand-at-site` (`PanoramaToggleButton`); `.zoom-to-detail-button`; `PanoramaAutoTour .play-btn`; `EnterSkyButton`, `EnterArButton` | `Chip kind="action"` (§3.5) |
| `SurfaceScene .legend-item` (nation legend, 2 call sites) | `Chip kind="toggle" tone` |
| colophon `.show-all` (26) | `Chip kind="action"` |
| programs group-by `.toggle button` | `Chip kind="choice"` in a `radiogroup` (D6) |
| launches `launches_filters_label().toUpperCase()` (`:242`, `:254`) | `m.filters_eyebrow()` + CSS uppercase (D7) |
| `StationRoute .hud-live-link` | `Chip kind="link"` |
| `launches-chip` (`SurfaceScene:7916`) | `Chip kind="link"` |

## 5. Hit list (baseline: 172 violations from the first `a4-check.sh`, list in `…-baseline-hits.txt`; **extended scope: 222**, §1.3.3 and §10)

| Kind | Count | Files |
|---|---|---|
| PRIVATE-CSS (chip / pill / toggle base rules outside `chip.css`) | 52 | HudControls 7, SurfaceScene 8, TimeDock 5, StationRoute 4, fly 4, entity-browse-page 4, ExploreScalePicker 3, PillDropdown 3, ScaleNav 2, LayerChipRow 2, StarIndex 2, deep-sky 2, programs 2, launches 2, EpochTimelineStrip 1, SurfaceIndexPanel 1 |
| OLD-MARKUP (`class="pill|chip|toggle|…"` lines) | 101 | missions 23, HudControls 13, launches 11, fly 10, fleet 9, StationRoute 9, SurfaceIndexPanel 9, TimeDock 4, View3dControls 2, EpochTimelineStrip 2, SurfaceScene 2, 1 each in LayerChipRow, PillDropdown, ExploreScalePicker, ViewToggleButton, ScaleNav, deep-sky, programs |
| RESET-VIEW (reset buttons not the shared one) | 8 | HudControls 2, ScaleNav 2, StationRoute 2, View3dControls 1, SurfaceScene 1 |
| COUNT-AT-END (`filters-right` wrapper) | 3 | missions, fleet, launches |
| OVAL (`border-radius: 999px`) | 5 | HudControls 1, SurfaceScene 2, SurfaceIndexPanel 1, deep-sky 1 |
| FILTER-AS-TAB | 1 | deep-sky `:164` |
| NO-CHIP-CSS / NO-CHIP-COMPONENT | 2 | `chip.css`, `Chip.svelte` do not exist yet |

**Extended scope (D8, §1.3.3):** the same kinds, plus seven files the first scan did not list (`routes/earth/+page.svelte` 5, `routes/moon/+page.svelte` 5, `PanoramaToggleButton` 2, `PanoramaAutoTour` 2, `EnterArButton` 4, `EnterSkyButton` 2, `routes/colophon/+page.svelte` 2), eleven class names the regex did not know (`legend-item`, `zoom-to-detail-button`, `stand-at-site`, `locate-me`, `earth-compact`, `earth-compare`, `play-btn`, `reset-btn`, `enter-sky`, `enter-ar`, `show-all`: they add 10 hits to `SurfaceScene`, 13 to `TimeDock`, 2 to `fly`), and three FILTERS-label hits (`FILTERS-LABEL-KEY` 2, `FILTERS-JS-UPPERCASE` 1, all in `missions/launches/+page.svelte`). Total **222** = 172 + 47 + 3.

`a4-check.sh` counts the 27 files in its extended `SCOPE` list (§10); the raw 26-button `class="pill"` markup in missions is counted per line (23 lines that
carry `class` and the keyword on one line; multi-line attribute lists are only counted when the class is on its own line). Expected zero-state: every PRIVATE-CSS and OLD-MARKUP line
converted, or carrying `a4-keep: <why>` (below).

### Expected `a4-keep` markers

| Where | Why kept |
|---|---|
| `HudControls .ctrl-row.chips` layout rules (`:510`, `:828`, `:852`, `:867`) | **no marker**: A5 deletes the column rules and writes the row; until A5 lands they carry `a4-keep: A5 row layout` |
| fleet `.status-pill.status-*.active` colours (`fleet:825–844`) | data colours, move to `--chip-tone` in A4 so they are not kept |
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
| `/plan` `.mission-type-pill`, `/fly` scene CTAs (`opening-launch`, `opening-skip`, `opening-fleet-chip`) and `fly-mtab` | scene / canvas routes with their own HUD; the `/fly` toggle, `play-btn` and speed pills ARE in scope (same HUD action / choice families); `/plan` pills wait for the answer to §9 O1 |
| INDEX / MODULES / TIMELINE pull tabs, panel `×`, tabs (`mdg-tab`, `fly-mtab`), cards, CTAs, disclosure and inline helper buttons (§1.3.2 rows 12–16, 20) | not chips; look drift and target sizes listed in §1.3.4 for the panel / touch-target slices |
| Science rail `search-button` | science layout / A6 neighbour |
| `SurfaceFlatPatch`, `AnnotationRings`, `PanoramaCrossLink` chips | flat-patch HUD / canvas labels; revisit with the Worlds panel slices |
| Switches and form inputs | not chips |
| `module-row` list rows, `assembly-chip` caption | rows and a caption, not chips (ISS) |

## 7. Tests, docs, locales

### Tests
- **Unit:** `src/lib/components/Chip.test.ts` (Vitest + `@testing-library/svelte` if present in the repo — NV5: not checked): `toggle` renders `aria-pressed`,
  `choice` renders `role=radio` + `aria-checked` and roving `tabindex`, arrows move + select, `link` renders `<a href>`, `disabled` is not focusable, `count` renders
  after the label, `tone` sets `--chip-tone`. `ChipGroup` arrow-key test.
- **New `tests/e2e/chip.spec.ts`** on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`: routes `/explore`, `/earth`, `/moon`, `/mars`, `/venus`,
  `/missions`, `/fleet`, `/missions/launches`, `/gallery/deep-sky`, `/programs`, `/iss`, **`/tiangong`, `/colophon`, `/fly`** and the states `/moon?site=apollo11`, `/mars?site=perseverance`, `/earth?site=ksc`
  (Stand here, Zoom in, nation legend, locate-me), `/explore?id=mars` (time-dock pills), missions / fleet / launches with FILTERS open. Asserts per chip (selector `.ui-chip`): computed `font-size >= 11px`,
  height 30 px ± 1 on the fine-pointer project and `>= 44` on the two touch projects (bounding box), `border-radius` 4 px (no 999 px), active chip computed
  `border-color` = `--color-accent` and a soft accent background on every route except the Worlds, where it is the world tint (Moon grey, Mars red, Venus amber; Earth = accent), white text, focus-visible outline 2 px;
  **a generic sweep**: on every crawled page and state, every visible `button`, `[role=button|radio]`, `[aria-pressed]` that is not in the allow-list (§6) has class `ui-chip` or sits inside a container with `data-a4-keep` (this is the runtime version of the crawl, so a control the class-name check cannot see still fails); FILTERS strip: the count element's left edge is
  within 24 px of the FILTERS label's right edge (MI1); Reset-view and Watch-live are `.ui-chip` and ≥ 44 px on touch; Explore level reset has the
  visible text label on desktop.
- **a11y:** add the 11 routes' filter areas to `a11y.spec.ts` / `a11y-keyboard.spec.ts` (axe: no `aria-required-parent` on radios; keyboard: arrows inside a radiogroup, Tab
  leaves it; focus ring visible).
- **Update (selectors / roles):** `launches-timeline.spec.ts:49,59` (`button.pill` → `.ui-chip`), `missions.spec.ts:25,240,247`, `fleet.spec.ts:22–147` (`.filters-toggle`,
  `[role="radio"]`; radio role stays), `mobile-invariants.spec.ts:109–130` (`.filters` wraps), `mobile-layout.spec.ts:64–110` (`.mdg-body .chip` /
  `.chip-group ~ .chip` → `.ui-chip`), `earth.spec.ts:82–131`, `mars.spec.ts:62–64`, `hotspots.spec.ts`, `explore-paths-layer.spec.ts`, `footer-dock.spec.ts:140,189`
  (`.ctrl-row.chips`), `accent-colour.spec.ts:238` (A3 spec reads `.filters-toggle`), `type-floor.spec.ts` (re-run), `iss` / `tiangong` specs for `-watch-live`; `earth.spec.ts` / `museums.spec.ts` selectors are A5's.
- **Touch-target rule:** existing assertions of 44 px: `mobile-invariants.spec.ts` lines 83–166 (search button, index-close); none on chips today (NV4).
- **Visual baselines that will change (linux PNGs, no darwin files exist):** `missions-filters` ×3, `fleet-filters` ×3, `deep-sky-head` ×3, `programs-head` ×3,
  `earth-surface-hud`, `moon-surface-hud`, `mars-surface-hud`, `venus-surface-hud` (desktop only; regenerated once, together with A5), `iss-module-list` ×3 only if the Watch-live chip is in the list view (it is in
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
One key removal, no new text. Decided D7: launches uses `filters_eyebrow` like missions and fleet. `launches_filters_label` then has no consumer: its two uses are `launches/+page.svelte:242` (`.toUpperCase()`) and `:254` (`aria-label`). `git grep` at `50b3e962a8d` finds it only there, in `scripts/i18n-tools/en-source-hashes.json:6336` and in the Hebrew pilot map `scripts/i18n-tools/maps/2026-10-17-translation-cleanup/he-pilot-messages.json` (left alone: a historical map).
**Per-locale check, already run against `messages/*.json` (read-only grep of both keys in all 14):** the two keys carry the same word in every locale, differing only in letter case in the Latin scripts
(en `Filters` / `FILTERS`, de `Filter` / `FILTER`, es `Filtros` / `FILTROS`, fr `Filtres` / `FILTRES`, it `Filtri` / `FILTRI`, nl `Filters` / `FILTERS`, pt-BR `Filtros` / `FILTROS`, ru `Фильтры` / `ФИЛЬТРЫ`, sr-Cyrl `Филтери` / `ФИЛТЕРИ`),
and identical in ar `عوامل التصفية`, hi `फ़िल्टर`, ja `フィルター`, ko `필터`, zh-CN `筛选`. So no text a visitor reads changes (CSS uppercase gives the same capitals); the key is removed from 14 `messages/*.json` and `en-source-hashes.json`, the paraglide output regenerates, and the proof is `git diff --stat -- messages src/lib/paraglide` showing only that key's 14 lines + the generated files. No paid run; no glossary change.
All other keys are reused as they are: `ui_reset_view`, `filters_eyebrow`, `lib_filter_*`, the layer labels (A5 owns the two Earth telescope labels). The FILTERS count button name is assembled `"{eyebrow} {n} / {total}"` from existing keys (no `filters_count_of`; NV6). Layout risk: de (long labels: `KOMMUNIKATIONSSATELLITEN`, `ANSICHT ZURÜCKSETZEN`, `SurfaceScene.svelte:7541`) and ar (RTL: use logical properties, the roving arrows must swap).

## 8. Screenshots for the operator (via dev server, per AGENTS "Iterating on UI"; not Docker)

Desktop 1440x900 and phone 390x844, before (this commit) and after, side by side, one sheet per viewport; 13 scenes × 2 viewports:
1. `/explore` solar system (layer chips + toggles + Reset view when a body is selected + the scale `⟲`), 2. `/moon` chips, 3. `/earth` chips (A5 builds the row; A4 shows the chip look in today's layout),
4. `/missions` with FILTERS open (+ closed), 5. `/fleet` with FILTERS open, 6. `/missions/launches` with FILTERS open, 7. `/gallery/deep-sky` pills,
8. `/programs` group-by, 9. `/iss` with Watch live, 10. **`/tiangong`**, 11. **`/moon?site=apollo11` and `/mars?site=perseverance`** (Stand here, Zoom in, nation legend, tinted chips), 12. **`/explore?id=mars`** (time-dock pills, SKY), 13. **`/colophon`** (Show all). Plus Mars and Venus active chips for the tint contrast (NV15) and a `de` shot of `/missions` FILTERS and `/earth`. The Watch-live link and ScaleNav were not in the crawl: shoot them by hand.

## 9. Decisions and open questions (operator)

- **UXD-014 `proposed`** (draft in the appendix): one chip and one filter. The operator's go makes it `accepted`.

**Answered (2026-11-12, §0a):** height and text (30 / 44, 11 px, option A), FILTERS strip (compact, count after the label), per-world tint (kept on the Worlds, blue elsewhere), HUD action buttons on the same chip, programs group-by as one choice group, one FILTERS key, row layout (A5). The old Q1–Q7 are closed; Q6 (corners) is answered by D1 (4 px).

**Still open (only what the operator has not decided; recommendation first):**
- **O1 Scope of the scene-route chips and pull tabs.** The crawl found chip-like controls the earlier decisions did not name: `/fly` toggle 2D, ⏸ and speed pills (44 px r3), `/plan` mission-type pills (44 px r4, blue active), the INDEX / MODULES / TIMELINE pull tabs, the Lab view buttons. (a) **`/fly` toggle, ⏸ and speed pills join A4 (same HUD action / choice families, listed in §1.3.3); `/plan` mission-type pills join as `choice` chips; pull tabs and Lab stay as they are** (recommended: D5 says every HUD action button; the pills are the same job as the filters). (b) All scene routes stay out until a HUD slice. (c) Pull tabs also adopt the chip edge colours.
- **O2 Worlds action buttons at rest.** Today only Stand here and Zoom in carry the world tint on their rest edge; RESET VIEW, SPIN, 2D are neutral grey. (a) **All Worlds HUD actions use the D1 outline at rest and take the tint on hover / pressed** (recommended, §3.6). (b) Keep the tint at rest on those two.
- **O3 Small hit areas that are not chips** (Why? 14 px, `provenance-chip` 22 px × 1,396, `t-name` 22 px, `summary` 16 px, `xref-link` 20 px): (a) **A4 gives them a 24 px minimum hit area (`::after`, no visual change), listed in `chip.spec.ts`** (recommended, WCAG 2.5.8; the finding is from the crawl), (b) leave for the touch-target pass.

## 10. Check (re-run by the independent checker; must print `A4-CHECK violations: 0`)

Baseline of the first script at `6c6925ccd5d` (re-run at `50b3e962a8d`: unchanged): **172 violations** (list in `…-baseline-hits.txt`; 52 PRIVATE-CSS + 101 OLD-MARKUP + 8 RESET-VIEW + 3 COUNT-AT-END + 5 OVAL + 1 FILTER-AS-TAB + 2 missing files). **The script below is the extended one (D8): 27 files, 11 more class names, 3 FILTERS-label checks; it prints 222 at `50b3e962a8d`** (80 PRIVATE-CSS, 120 OLD-MARKUP, 8 RESET-VIEW, 5 OVAL, 1 FILTER-AS-TAB, 3 COUNT-AT-END, 2 missing files, 2 FILTERS-LABEL-KEY, 1 FILTERS-JS-UPPERCASE; ran once, the output is in the scratchpad as `ext-out.txt`). Run from the repo root as
`bash a4-check.sh`; kept here and in the scratchpad, not added to the repo. Allow marker: `a4-keep: <why>` inside the CSS rule or on / directly above the markup line.

```bash
#!/usr/bin/env bash
# A4-CHECK (extended scope, 2026-11-12) — run from the repo root. Prints each violation as KIND file:line text, then
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
 'src/routes/earth/+page.svelte','src/routes/moon/+page.svelte','src/lib/components/PanoramaToggleButton.svelte','src/lib/components/PanoramaAutoTour.svelte',
 'src/lib/components/EnterArButton.svelte','src/lib/components/EnterSkyButton.svelte','src/routes/colophon/+page.svelte',
 'src/routes/missions/+page.svelte','src/routes/fleet/+page.svelte','src/routes/missions/launches/+page.svelte',
 'src/routes/gallery/deep-sky/+page.svelte','src/routes/programs/+page.svelte','src/routes/fly/+page.svelte',
]
CSSCLS = re.compile(r'\.(chip|chip-group|pill|pill-dropdown|toggle|speed-pill|speed-desktop-pill|sidx-chip|launches-chip|iconic-toggle|filters-toggle|clear-filters|clear-btn|hud-live-link|scale-reset|scale-back|live-pill|si-filters|legend-item|zoom-to-detail-button|stand-at-site|locate-me|earth-compact|earth-compare|play-btn|reset-btn|enter-sky|enter-ar|show-all)(?![\w-])')
MARK = re.compile(r'class="([^"]*\b(?:chip|pill|toggle|speed-pill|sidx-chip|hud-live-link|scale-reset|clear-filters|clear-btn|legend-item|zoom-to-detail-button|stand-at-site|locate-me|earth-compact|earth-compare|play-btn|reset-btn|enter-sky|enter-ar|show-all)\b[^"]*)"')
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
            if any(c in ('chip','pill','toggle','speed-pill','sidx-chip','hud-live-link','scale-reset','clear-filters','clear-btn','legend-item','zoom-to-detail-button','stand-at-site','locate-me','earth-compact','earth-compare','play-btn','reset-btn','enter-sky','enter-ar','show-all') for c in cls):
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
f = 'src/routes/missions/launches/+page.svelte'
for i, line in enumerate(open(f).read().splitlines(), 1):
    if 'launches_filters_label' in line:
        viol.append(('FILTERS-LABEL-KEY', f, i, line.strip()[:60]))
    if 'filters-eyebrow' in line and 'toUpperCase' in line:
        viol.append(('FILTERS-JS-UPPERCASE', f, i, line.strip()[:60]))
for k, f, l, t in viol: print(f'{k:16} {f}:{l}  {t}')
from collections import Counter
print('by kind:', dict(Counter(k for k, *_ in viol)))
print(f'A4-CHECK violations: {len(viol)}')
PY
```

Known limits of the check: it matches class NAMES in 27 listed files only (a control renamed to a new class escapes; the other ~30 chip-like rules in §1.2 are the
allow-list; the classes of the pages in §1.3.3 marked "not counted" are not in it, they wait for §9 O1 / O3). The runtime sweep in `chip.spec.ts` (§7) is the second net for exactly that reason; `RESET-VIEW` flags every `ui_reset_view()` line, including the one inside `ResetViewButton`, which then carries `a4-keep: the shared button`; `OLD-MARKUP`
reads one line at a time, so `class` split from the tag over two lines is missed; `{#each}` loops count once (the 26 missions pills are about 23 lines, the real DOM count is higher). It
does not measure rendered height, colour or the count position: `chip.spec.ts` does.

## 11. Acceptance (definition of done, per the plan)

1. `bash a4-check.sh` prints `A4-CHECK violations: 0`; `git grep -nE 'class="(chip|pill|toggle)' -- 'src/routes/missions' 'src/routes/fleet' 'src/routes/programs' 'src/routes/gallery'` is empty.
2. Docs in §7 state the rule and link UXD-014; CHANGE-INVENTORY row A4 updated; Design System §5.7 no longer carries `3px`, `0.35` or `rgba(68,102,255,…)`.
3. `chip.spec.ts` + unit tests green on desktop-chromium, mobile-chromium, mobile-landscape-chromium; the re-run list green on all three; 16 PNGs regenerated and reviewed, the others unchanged; nothing skipped or left red.
4. Every chip on the 11 routes of the first list **and on every page / state of §1.3.3**: 30 px (fine pointer) / ≥ 44 px (coarse), ≥ 11 px text, 4 px radius, outline at rest, one active look (blue; world tint on the Worlds); FILTERS count adjacent to its label; the generic sweep of `chip.spec.ts` finds no visible control outside `.ui-chip` / the allow-list.
5. Locales: `launches_filters_label` removed from 14 `messages/*.json` and `en-source-hashes.json`, no other message line changed (`git diff --stat -- messages src/lib/paraglide` shown, per-locale values of §7 re-checked); `validate-data` green.
6. Home, Lab, `PanelTabRow` tabs, the pull tabs, the `/fly` scene CTAs and `fly-mtab` diffs empty; `/fly` toggle / speed pills and `/plan` pills change only as §9 O1 is answered.
7. The operator receives the §8 sheets and answers §9 O1–O3.

### Appendix — draft `docs/uxs/decisions/UXD-014-one-chip-and-filter.md` (proposed; written when the go comes, not now)
```markdown
# UXD-014 — One chip and one filter for every toggle, filter, choice and HUD action

- **Status**: proposed
- **Date**: 2026-11-12 (proposed)
- **Decider**: the operator, 2026-11-12 on the prototype sheets (chip option A); the go on the whole decision is pending. Inputs: C1, C3, G3, PG1, MI1, FL1, E8, ISS1 (`docs/wip/2026-11-11-ux-feedback-plan.md`)
- **Answers**: C1, C3, G3, PG1, MI1, FL1, E8, ISS1; slice A4
- **Changes**: `src/lib/styles/chip.css` (new), `Chip.svelte`, `ChipGroup.svelte`, `ResetViewButton.svelte`; IA §controls; Design System §5.7;
  AGENTS.md "Design system"; TA.md; `src/lib/components/README.md`

## Context
At `6c6925ccd5d` 17 recipes (and 18 HUD action looks the crawl added, §1.3) draw chips, pills, toggles and filter buttons: 8 heights (21–44 px), 7 radii, 8 active looks, 3 ARIA patterns for one job, a
44 px chip on desktop pointers, oval chips that are the only oval things in the UI, a FILTERS bar with the count at the far end, 4 looks of Reset view and a plain-text Watch-live link.

## Options
1. One CSS file (`.ui-chip`) plus a thin `Chip` component (markup and ARIA contract), values from the tokens. 2. CSS only, as the page shell. 3. A component only, each page keeps its own CSS.

## Decision
Option 1: 30 px on fine pointers, 44 px on coarse pointers, 11 px uppercase text, 4 px radius, outline at rest, one active look (soft accent fill, `--color-accent` edge, white text; the world tint
replaces the accent on the Worlds pages only), hover `--color-state`, focus `--color-focus`; kinds toggle / choice / action / link; count badge and tone dot; compact FILTERS strip with the count after the label
(one key, `filters_eyebrow`, CSS uppercase); every HUD action button, Reset view, Watch live and the programs group-by on the same chip. Allow-list: tabs, pull tabs, status and label pills, cards, CTAs, Lab, nav, home, `/fly` scene CTAs.

## Consequences
About 80 private rules and ~120 markup lines go (extended scope, 222 check hits); 16+ visual baselines change; one message key (`launches_filters_label`) is removed in 14 locales; MI3 (mission colour) builds on `--chip-tone`, A5 (flat row, no groups) on `.ui-chip`.

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
- NV9 The 2026-06-17 per-world tint request is quoted from a code comment (`SurfaceScene.svelte:7465–7476`), not from a decision record; the operator re-confirmed the tint on 2026-11-12 (D3) but `docs/uxs/decisions/` still has no record of it and `BACKFILL.md` was not searched. UXD-014 must carry the tint rule so the next reader finds it.
- NV10 `a4-check.sh` ran once at baseline (172) and has no tests of its own; it was not run against a fixed tree. The `--chip-tone` hook for fleet status and MI3 colours was not prototyped.
- NV11 `/venus` and `/live` share the code paths read here (SurfaceScene) but were not individually checked; `/live` has no filter control in the scan. (`/tiangong` is now in the crawl: same HUD / CAP / 3D toggles and pull tabs as `/iss`.)
- NV12 The statement "no `.chip` global class exists" rests on the CSS scan of `<style>` blocks and `src/lib/styles/*.css`; `Nav.svelte:1230` styles `:global(.chip)` inside the drawer, so a global `.chip` consumer exists (kept untouched: the new class is `.ui-chip`).
- NV13 Whether the A3 core-tier chips (`BeltPanel.svelte`, `library/+page.svelte`, `science/[tab]/[section]/+page.svelte`, commit `50b3e962a8d`) are controls (buttons / links) or labels was not read; if they are controls they join `.ui-chip`, if labels they only need to carry the same values as the chip active look.
- NV14 The crawl (§1.3) was read from its JSON, not re-run, on a build I did not start: its programs group-by active colour (`rgba(127,176,224,.18)`) matches the source at `50b3e962a8d`, but nothing else was cross-checked build-to-source. The 888 browser-default "select mercury …" buttons are not explained (probably visually hidden canvas proxies); not opened in a browser.
- NV15 Contrast of white text on a 22 % world-tint fill (Mars red, Venus amber, Moon grey) over the dark glass was not computed; the AA claim for the blue chip rests on the A3 commit message (`4.96 / 4.37` figures), not on a measurement of the tinted variants.
- NV16 §1.3.1 lists what the crawl did not capture (nav, footer, plain `<a>` link-buttons such as Watch live, phone Worlds drawers, ScaleNav, the other index panels, open dropdowns and popovers, hover / pressed states, missions and launches pills). A second crawl pass is needed for those before the generic `chip.spec.ts` sweep can be trusted to be complete.
- NV17 The extended check ran once (222) and has no tests of its own; the 47-line increment was attributed to files by a per-file diff of the two outputs, not read line by line.
- NV18 The family assignment of the 205 looks (§1.3.2) is by class name (`fam.py`); looks with an empty class (the programs group-by, the panel tab buttons, feature-row buttons) were assigned by their label text and route.
