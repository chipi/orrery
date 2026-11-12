# Slice A6 brief — Nav bar (N1)

Read-only brief, written at HEAD `12a98d06faa` on `tech-debt/0.9.9` (A1, A3 landed; A2 brief and A4 brief written; **A5 brief did not exist when this was
written**, see §1). Baseline hit list: `2026-11-12-slice-A6-baseline-hits.txt` (38 lines, from the check script in §11). Every `file:line` below was read at
that commit. Nothing was built, run in a browser, or queried in Umami.

## 0. The point

| ID | Operator text (plan line 76) | Slice row (plan line 332) |
|---|---|---|
| N1 | The upper-right section of the nav bar is oversized compared to the normal nav; make it more compact. Idea: second-level nav goes horizontal under the main nav? | A6: on desktop pointers the right-hand toggles drop to ~32 px with a tighter gap; rarely used ones (contrast, share, debug) move into one menu. Check: nav bar height and right cluster match the main links; touch keeps 44 px |

No other nav-bar point exists in the list. `grep -n -i "nav\|menu"` over the plan finds: D4 / E7 / C8 (the Explore second-level nav and breadcrumb — **slice C8,
not A6**), "Idea: second-level nav goes horizontal under the main nav" inside N1 (answered by D4/E7: not A6, see §1), the footer-dock mentions (none), and the
phase-0 row text. Spec↔code mismatch that A6 must settle: nav height **52 px** (IA, AGENTS, Design System, UXS-002/013) vs `--nav-bar-height: 60px` (UXS-000 SC-1).

## 1. Cascade — what the earlier slices change in A6, and what in the plan row is outdated

| Earlier slice | What it changes in A6's tactics | Outdated in the plan row / N1? |
|---|---|---|
| **A1 type scale (UXD-002)** | Floor is 11 px for all text, `--size-label` 11 px at 60 % white. The nav link text is `--size-link: 12px` (tokens.css:51, not in the A1 scale; A1 left it), the locale chip is a literal 11 px (`LocalePicker.svelte:108`), the Aa glyph a literal 13 px (`Nav.svelte:880`), the drawer a literal 11 px (`:1029`, `:1360`, `:1387`). A6 reuses A1: menu row text = `--size-meta` 12 px (same as `--size-link`), group label = `--size-label`; **no new font size is introduced**. | Nothing outdated. The plan says nothing on text size; A6 does not shrink any text (compact = box sizes and gaps only, text stays at or above the floor). |
| **A2 page shell (UXD-012)** | The shell starts the page root **directly at the nav's bottom edge** (24 px padding, no second `--nav-height`; `page-shell.spec.ts:128` asserts `root.top <= 1` px). So changing `--nav-bar-height` moves every shell page by exactly the delta with **no per-page edit** — the value is now a single token with one consumer chain. It also means the height decision (§4) has no page-level knock-on for shell pages, only for scenes/HUDs that position off `--nav-height` (§4.3). | The plan row says "nav bar height ... match the main links" without a number: **now outdated as a question**, because A2's shell makes 52 vs 60 a one-line token choice; §4 settles it. |
| **A3 accent tokens (UXD-001)** | Gives the colours the toggles use: active = `--color-state` text + 18 % `--color-accent` fill + `--color-accent-strong` border; hover border = 55 % accent; focus ring = `--color-focus` (`#8aa0ff`). The share / settings / contrast toggles already use these. **Three pre-A3 values are still in `Nav.svelte`**: the audio toggle's `#96afff` / `rgba(150,175,255,…)` (`:1099, :1105, :1112`) — the A3 brief's grep did not list them, so they survived A3 (A6 replaces them with `--color-state` / `--color-accent-strong`; check item N4). The lens toggle gold (`#ffc850`, `rgba(255,200,80,…)`) and debug orange (`#f6ad55`) are semantic state colours (not the accent) and stay, marked `a6-keep`. | Nothing outdated. The menu panel chrome uses A3 tokens, no new colour. |
| **A4 one chip (`2026-11-12-slice-A4-brief.md`)** | The nav toggles are **not chips** (A4 §1.2: "Nav toggles, `LocalePicker` — A6 owns the nav"; A4 §6 allow-list). A4 proposes `.ui-chip` at **30 px on fine pointers / 44 px on coarse** (A4 §3.2, Q1 recommendation a). A6 shares the **step, not the component**: fine pointer 32 px square icon buttons (plan text "~32 px"), coarse 44 px, same 4 px radius and the same border/active recipe as `.ui-chip` quiet variant, so a chip row and the nav cluster read as one family. If the operator picks A4 Q1 (b) 28 or (c) 32 px, A6 stays at 32 — nav chrome is a separate surface; stated as Q3. A6 does **not** use `Chip.svelte` for the toggles (they are icon-only, `aria-pressed` / `aria-expanded` buttons with no label). The `LocalePicker` trigger (`.chip`, `LocalePicker.svelte:99`, 44 × 44 min, 11 px mono) stays a nav control: A6 gives it the same 32 / 44 sizing as its neighbours. A4's `a4-check.sh` must keep `Nav.svelte` / `LocalePicker.svelte` on its allow-list; A6's check (§11) covers them. | Plan row says "toggles drop to ~32 px" — still right. The plan does **not** know that the global `:global(.chip)` rule at `Nav.svelte:1230` styles the drawer's locale chip; A4 NV4/NV12 flagged it; A6 rewrites that block with its own `.nav-` class names. |
| **A5 chip groups** (`2026-11-12-slice-A5-brief.md`) | **Not present at the time of writing — cascade for A5 is NOT VERIFIED.** From the operator's description (Explore/Worlds layer chips move to a horizontal row near the top of the scene): such a row sits at `top: calc(var(--nav-height) + Npx)` like every HUD (§4.3 list), so it follows the nav height automatically; the interaction is only that a **shorter bar (52 vs 60) gives that row 8 px more room, and a taller one takes it back**. A6 therefore asks A5 to anchor on `var(--nav-height)` only (no literal 60/64 fallbacks; `SurfaceScene.svelte:8116, 8158` and `HudControls.svelte:645, 825` carry `var(--nav-height, 60px/64px)` fallbacks that disagree with the token, check item N6). A6 also must not add a second bar under the nav (the plan's "second-level nav goes horizontal under the main nav" idea) because that is exactly the strip the layer-chip row wants. | **"Idea: second-level nav goes horizontal under the main nav" (N1) is outdated**: D4 / E7 / C8 own the Explore second-level nav (drop it, breadcrumb as the way through); a horizontal second bar under the nav would take the space A5 gives to the chip row and duplicate C8's breadcrumb. A6 does **not** implement it. |

### 1.1 Adjacent items that serve the same idea

| Adjacent item | Where | Verdict | Reason |
|---|---|---|---|
| Footer dock **More** menu (`layout_footer_more`, `+layout.svelte:656`, `.footer-more-btn`, `footer-dock.spec.ts:67`) | popover of 13 links, `aria-expanded`, Escape closes, focusout closes (`+layout.svelte:576–579`), 44 px hit area via `::after` | **Precedent, reuse its behaviour and its label key** | Same idea (rarely used things behind one button); A6's menu copies the open / Escape / focusout rules and reuses the existing key `layout_footer_more` ("More", present in all 14 locales) for the trigger label so no locale work is needed. It is a popover of links, not `role="menu"`; A6's is a real menu (it holds a switch and a command), see §3.4. |
| **LocalePicker** | `LocalePicker.svelte` (listbox, 14 options, Escape + outside click) | **Fold in the sizing only; behaviour stays** | It is used more than contrast/share/debug (a language choice is a first-run action) and its listbox is correct as is; only its trigger takes the 32 / 44 recipe and loses the global-`.chip` coupling. Moving it into the menu would nest a listbox inside a menu — worse. Phone behaviour (locale in the drawer ≤ 600 px) unchanged. |
| **DebugPanel toggle** (`debug-toggle`, `Nav.svelte:449`; panel `DebugPanel.svelte:551` positions at `var(--nav-height, 64px) + 10px`) | bug glyph, bar only ≥ 601 px; drawer row `.debug-switcher` with hard-coded English `On` / `Off` (`Nav.svelte:649`) | **Fold in** (plan names it) | Moves into the menu as a `menuitemcheckbox`; the drawer row keeps working and its English `On` / `Off` becomes the check state (no text, no key) — fixes an i18n violation in the block A6 already edits (check N3). The DebugPanel's `64px` fallback is fixed by N6. |
| **Science lens toggle** | `lens-toggle`, disabled where no `ScienceLayersPanel` | **Stays in the bar** | Primary feature with its own Umami event, three states (unavailable / off / on); hiding it behind a menu defeats the "unavailable here" affordance (2026-06-17 user direction in the code comments). |
| **Audio tour toggle** | `audio-toggle`, pulses while playing | **Stays in the bar** | Opens a panel, shows live playing state. |
| **Settings ⚙** | `settings-toggle`, opens SensorySheet | **Stays in the bar** | The only path to Sound / Haptics / Tilt on phones (comment `Nav.svelte:1409`). See Option B for the alternative of putting contrast and debug *inside* it. |
| **Share on the panel** (P5: "Collector card" becomes "Share", placed higher) | `Panel.svelte`, `sharePath` | **Leave for the panel slice (B-slice that owns P5)** | Different action (shares the entity card stub `/c/<kind>/<id>`); the nav share shares the current URL (`shareCurrent`, `share.ts:30`). Two shares are legitimate; the label difference ("Share this view" vs "Share") is a P5 question. |
| **Mobile drawer** (hamburger) | `Nav.svelte:501–659` | **Fold in (small)** | A6 adds the same three items to its `.drawer-controls` row so ≤ 600 px has them (contrast, debug already there; share becomes a row). Footer links in the drawer: leave. |
| **Explore `ExploreScalePicker` / breadcrumb / second-level nav** | `explore/…` | **Leave for slice C8** | D4 / E7 / C8. |
| **Command palette (Ctrl-K)** | `CommandPalette` (cmdk) | **Leave** | Already the keyboard route to everything; not a bar control. |

## 2. Inventory (`src/lib/components/Nav.svelte`, 1428 lines; script 1–293, markup 300–659, style 661–1428)

### 2.1 The bar, left to right

`<nav aria-label=nav_aria_label use:roving={{orientation:'horizontal', wrap:true}}>` (`:300`) — the **whole bar is one Tab stop**; ← → sweep brand · links ·
toggles (RFC-031 S1, `a11y-keyboard.spec.ts:28`). `position: sticky; top: 0; z-index: 40; height: var(--nav-height)` (`:662–680`, IA says z-index 20: a second
spec mismatch, check N7), padding 24 px sides (6 px ≤ 500 px).

| Zone | Control | Markup | Visible | What it does | Active / disabled | ARIA |
|---|---|---|---|---|---|---|
| left | Wordmark `ORRERY` | `a.brand` `:302` | always | home link | `.active` on `/` | `aria-label nav_brand_home_aria`; 36 px Bebas, `min-height: 44px` (`:698`) |
| centre | 2 links + 3 dropdown groups + 1 link (HOME, EXPLORE▾, WORLDS▾, FLY, PLAN, CATALOG▾, LEARN▾) | `a.link`, `button.group-trigger` `:312–355` | > 1219 px and not coarse (TV keeps it) | navigate; groups open a `role="menu"` of `role="menuitem"` links (no arrow-key handling inside the group menu: focus is not moved into it, Escape handled on `window`) | `.active` accent 28 % fill | `aria-haspopup="true"`, `aria-expanded` |
| right 1 | Hamburger | `button.menu-toggle` `:358` | ≤ 1219 px or coarse (not TV) | opens `#mobile-nav-drawer` (`role="dialog" aria-modal="false"`) | `aria-expanded` | `aria-label nav_mobile_menu_open_aria`, `aria-controls` only when open |
| right 2 | Audio tour ∿ | `button.audio-toggle` `:368` | always | opens `AudioOverlay` (`audio.toggle()`) | `.active` while open, pulses while playing (`:1111–1131`, reduced-motion safe) | `aria-pressed`, `aria-controls`, `title` |
| right 3 | Locale `EN` | `LocalePicker` `:386` | ≥ 601 px (drawer on phones) | listbox of 14 locales, full reload on pick | `aria-expanded` | `aria-haspopup="listbox"`, Escape + outside click |
| right 4 | Science lens ◎ | `button.lens-toggle` `:387`, `data-audio-stage="science-lens-toggle"` (tour stage target) | always | `toggleScienceLens()` + Umami | disabled when no lens panel on the route; gold only where available | `aria-pressed`, `aria-disabled`, label switches to "unavailable on this page" |
| right 5 | Contrast `Aa` | `button.contrast-toggle` `:408` | ≥ 601 px (drawer on phones) | `toggleHighContrast()`; also follows `prefers-contrast: more` | `.active` accent | `aria-pressed` |
| right 6 | Settings ⚙ | `button.settings-toggle` `:423` | always | opens `SensorySheet` (Sound / Haptics / Tilt master + per channel; Graphics quality on 3D routes; Offline) | `.active` when open or any channel on | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` |
| right 7 | Share ⤴ | `button.share-toggle` `:437` | always (bar) | `shareCurrent()`: native share sheet / `navigator.share` / copy link; **no feedback and no Umami event** | none | `aria-label nav_share` |
| right 8 | Debug 🐞 | `button.debug-toggle` `:449` | ≥ 601 px (drawer row on phones) | `toggleDebugMode()`; gates DebugPanel + AR HUD overlays | `.active` orange | `aria-pressed` |
| right 9 | `{@render right?.()}` `:476` | snippet prop | — | **no caller passes it** (`<Nav />` only, `+layout.svelte:555`): dead prop | — | — |

`SensorySheet` (`:491`) and a first-time hint toast (`:493`, `role="status"`) are siblings, not bar items.

### 2.2 Sizes and gaps — the finding that explains "oversized"

Every one of the eight right-hand buttons carries `width: 32px; height: 32px; min-width: 44px; min-height: 44px` (`:870–873, :903–906, :981–984, :1075–1078,
:1155–1158`). **`min-*` wins, so the `32 px` is dead code and the buttons are 44 × 44 on every pointer, desktop mouse included.** The locale chip is
`min-width/height: 44px` too (`LocalePicker.svelte:100–101`). Cluster width at ≥ 601 px: 7 controls × 44 + 6 gaps × 14 px (`.right { gap: 14px }`, `:865`) =
**392 px** (the locale chip is wider than 44: its 11 px text + 20 px padding), against links that are **~27 px tall** (`padding: 5px 10px`, 12 px text,
1 px border) on fine pointers. At ≤ 600 px the gap drops to 2 px (`:1414`). Icons are 16 px (18 px for the debug glyph, `:460`).

The bar is 60 px (`--nav-bar-height: 60px`, `tokens.css:72`; **`--nav-height` re-types the literal `60px` instead of using the variable**, `tokens.css:75`, so editing
`--nav-bar-height` alone does nothing) plus the safe-area inset.

### 2.3 Responsive rules (all in `Nav.svelte` style)

| Rule | Lines | Effect |
|---|---|---|
| `(pointer: coarse)` | `:1308` | links `min-height: 44px` |
| `(min-width: 641px) and (max-width: 1319px)` | `:766` | link padding 6 px (long-locale crunch) |
| `(max-width: 1219px), (pointer: coarse)` | `:1326` | hide `.center`, show hamburger. 1219 comes from the measured need of the full bar in ru (1210 px; fr/es 1165; en 1038, measured 2026-11-04) **with the 392 px cluster** |
| TV `(hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx)` | `:1340` | keep links inline, drop hamburger |
| `(max-width: 500px)` | `:1397` | nav side padding 6 px |
| `(max-width: 600px)` | `:1407` | gap 2 px; locale, contrast, debug hidden in the bar and shown in `.drawer-controls` (`:1424`); lens, settings, share, audio, hamburger stay: 5 × 44 + 4 × 2 = 228 px |

### 2.4 Usage evidence in the code (Umami event names; nothing queried)

`EVENT_NAMES` (`analytics.ts:109`) — the only nav-reachable events: **`science-lens-toggle`** (`trackScienceLensToggle(on, 'nav')`, `Nav.svelte:243`) and
**`locale-switch`** (`LocalePicker.svelte:44`, `{from, to}`). `card-share` exists but `shareCurrent` does not fire it. **No event** for contrast, share, debug,
settings, audio toggle (the audio overlay fires `audio-stage-fire` / `tour-complete`), hamburger or the group menus. So "rarely used" for contrast / share / debug is
the operator's judgement; the code cannot confirm it (NOT VERIFIED, and A6 does not add events: "do exactly what was asked"; Q4 offers it).

### 2.5 Everything that depends on the bar's size

`--nav-height` is read in **22 files, ~60 rules** (HUD tops, panel tops, sticky offsets, `inset: var(--nav-height) 0 0 0` canvases, `min-height: calc(100vh -
var(--nav-height))` in `+layout.svelte:691`): Panel, SensorySheet, AudioOverlay, EntityIndex, FlightDirectorBanner, LensLegend, StationOrbitBanner,
ScienceLayersPanel, DebugPanel, OrbitRuler, StationRoute, LaunchesBanner, SurfaceScene, HudControls, explore, fly, plan, programs/[id], science layout. All move
with the token. `app.css:318` sets `--nav-height: 0px` in exhibit mode (nav hidden). Literal values that do **not** move (listed in the baseline file, check N6):
`Notebook.svelte:860 top: 60px` (comment says "under the 52px nav"), `SurfaceScene.svelte:7082 top: 60px` (short-window index, `max-height: 500px` media),
`Timeline.svelte:56 top: 52px` (sticky month header), `science/glossary/+page.svelte:120 scroll-margin-top: 60px`, plus ten `var(--nav-height, NNpx)` fallbacks of
56 / 60 / 64 that disagree with each other and the token (`HudControls:645, 825`; `programs/[id]:577`; `EntityIndex:225`; `DebugPanel:551, 554`; `OrbitRuler:203`;
`LaunchesBanner:163`; `SurfaceScene:8116, 8158`). **Not nav-related, left alone:** `plan/+page.svelte:1436 margin-top: 60px` (lens overlay offset),
`StationOrbitBanner:297` / `ScienceLayersPanel:755` / `EntityIndex:225 + 56px` (a banner's own height added to the token — they follow the token, no edit).

### 2.6 Tests that touch the nav

| Spec | What it asserts | Affected by A6 |
|---|---|---|
| `_helpers/nav.ts:29–139` | `button.menu-toggle`, `nav .center button.group-trigger`, `[data-locale-picker] button.chip`, `.mobile-drawer [data-locale-picker]` | Selectors stay (locale picker keeps `data-locale-picker` + `.chip`; the global `.chip` rule at `Nav.svelte:1230` is rewritten but the DOM class stays unless Q5 renames). |
| `mobile-layout.spec.ts:20–60` | hamburger visible on mobile, `.center .link` hidden, drawer, hamburger ≥ 44 × 44 | stays valid |
| `mobile-layout.spec.ts:127–152` | lens, **contrast**, menu-toggle, locale chip ≥ 28 × 28 ("conservative floor") | `button.contrast-toggle` moves into the menu / drawer: selector list updated; and the floor is too low to guard the 44 px promise (new spec) |
| `a11y-keyboard.spec.ts:28–52` | `nav[aria-label]` roving toolbar: arrow moves focus, **exactly one tabbable** descendant | the menu panel is inside `<nav>`: while closed it must add no tab stops; while open it is outside the roving set (§3.4) — **this spec must keep passing** |
| `audio.spec.ts`, `audio-tour-stages.spec.ts`, `tour-resume-cookie.spec.ts` | `button.audio-toggle` | unchanged selector |
| `i18n-picker-sweep.spec.ts`, `locale-picker.spec.ts` | `[data-locale-picker] ul.menu` | unchanged |
| `smoke.spec.ts:77–100`, `fleet.spec.ts:264`, `credits.spec.ts:99`, `library.spec.ts:71`, `pwa.spec.ts:42`, `mobile-invariants.spec.ts:83–166` | hamburger then drawer links; 44 px floors on other controls | unchanged; `mobile-invariants` 44 px asserts are on non-nav controls (read at lines 83–166; not re-checked beyond that) |
| `a11y.spec.ts` | axe on routes, pilot mode (does not fail on violations) | the new menu needs an explicit axe pass (§7) because pilot mode would not fail |
| `page-shell.spec.ts:128` | shell root starts at the nav bottom (≤ 1 px) | passes with any height |
| `footer-dock.spec.ts:67–126` | More button hit area, Escape | precedent only |

## 3. Proposal

### 3.1 Options (recommendation first)

**Option A (recommended) — compact bar plus one "More" menu.**
Bar right cluster, left to right: audio tour · locale · science lens · settings · **More (⋯)**; hamburger unchanged on its breakpoints. The More menu holds three rows:
**High contrast** (`menuitemcheckbox`), **Share this view** (`menuitem`), **Debug overlays** (`menuitemcheckbox`). Fine pointer: 32 × 32 buttons, 6 px gap. Coarse:
44 × 44, 4 px gap. Bar 52 px (§4). No text added to the bar, no second bar. Cluster width on a fine pointer: 4 × 32 + locale chip (~40) + 4 × 6 = **~192 px**
(was 392: −200 px).
- Fits the plan row and N1 literally; contrast gets a visible text label in the menu (more discoverable than the cryptic `Aa` square); zero new locale keys (§8).
- Cost: one new small menu pattern in the bar (keyboard rules §3.4), and the three rare actions are two clicks instead of one.

**Option B — compact bar, contrast and debug move *into* the Settings sheet, share into the sheet too.**
No new menu: `SensorySheet` gains a "Display" row (High contrast) and a "Developer" row (Debug) and a "Share this view" action. Bar: audio · locale · lens · settings
(4 controls, ~160 px).
- Fewer controls and no new pattern; contrast really is a display setting. Cost: the sheet is a non-modal dialog titled SETTINGS that already carries Sound /
  Haptics / Tilt / Graphics / Offline (long, with its own scroll); Share is not a setting; the sheet is gated by `sensory.settingsOpen` state shared with the tour
  and tests; adds 3 section strings (new keys × 14 locales, or reuse of the same three existing keys in new places: contrast, share, debug all reusable).

**Option C — compact only, no menu.** Same 32 / 6 / 44 sizing, keep all seven controls. Cluster ~ 7 × 32 + 6 × 6 = **260 px**. Smallest diff, no new
pattern, but ignores "rarely used ones move into one menu" (the plan row), keeps a cryptic `Aa` and a bug glyph in the primary chrome for every visitor.

Recommendation: **A**. It is the plan's stated design, keeps Settings focused on persistent preferences, and the menu's switch rows give contrast and debug a
visible label and state. B is the fallback if the operator would rather not add a menu.

### 3.2 Sizes and gaps (Option A)

| Property | Fine pointer `(hover: hover) and (pointer: fine)` | Coarse `(pointer: coarse)` | Today |
|---|---|---|---|
| Icon button | **32 × 32**, radius 4, 16 px icon | **44 × 44**, same icon | 44 × 44 everywhere (the 32 is dead code) |
| Locale chip | 32 high, min-width 40 | 44 | 44 |
| Gap in `.right` | **6 px** | 4 px (2 px ≤ 600 px, as now) | 14 px (2 px ≤ 600) |
| Link row (centre) | unchanged (~27 px box, 12 px text) | 44 min-height (as now) | same |
| Bar height | **52 px** | 52 px | 60 px |
| Brand | `min-height: 44` → 32 on fine pointers (36 px wordmark, `line-height: 1`) | 44 | 44 |

One rule block replaces the five duplicated recipes (`.contrast-toggle`, `.lens-toggle`, `.settings-toggle|.share-toggle|.debug-toggle`, `.audio-toggle`,
`.menu-toggle`): a shared `.nav-btn` base (size via `--nav-btn: 32px` / `44px` custom property set in the two media rules; border `rgba(255,255,255,.18)`,
radius 4, 120 ms transition; hover border 55 % accent; focus ring `--color-focus`), with the per-toggle rules reduced to **state colours only** (lens gold,
debug orange kept, audio and settings use `--color-state`). The tokens go in `tokens.css` next to `--nav-height`: `--nav-btn-fine: 32px; --nav-btn-touch: 44px`.
WCAG 2.5.8 (24 px minimum) passes at 32; the repo's 44 px rule (ADR-018, "minimum touch target") is a touch rule, kept on `(pointer: coarse)`.
Which query decides "fine": the TV query is coarse, so TV keeps 44 px; a hybrid laptop with a touch screen reports `pointer: fine` (primary) and gets 32 px — the
`any-pointer` question is Q6, the recommendation is primary pointer only (the A4 chip uses the same query).

### 3.3 Where the narrower cluster lets the bar breathe (knock-on, needs a measurement, not guessed)

The hamburger breakpoint 1219 px exists because the cluster was 392 px. With ~192 px the full bar needs roughly 200 px less (ru ≈ 1010, fr / es ≈ 965, en ≈ 840 —
**arithmetic only, not measured**). Recommendation: keep 1219 in the first commit, add a measuring spec over all 14 locales (scrollWidth ≤ innerWidth and
last control right edge ≤ viewport − padding at 1024 / 1100 / 1219), then lower the break to the measured value in the same slice, so 1024–1219 px desktop
windows show the links instead of the hamburger. Lowering it changes what a 1280 × 720 laptop sees only above 1219, so the default screenshot sizes do not
change; the visible change is for 1024–1219 windows (Q4).

### 3.4 The More menu (menu-button pattern, WAI-ARIA APG)

- Trigger `button.nav-more-trigger`, glyph ⋯ as inline SVG (three 1.6 px dots, `aria-hidden`), `aria-label` and `title` = `layout_footer_more` ("More"),
  `aria-haspopup="menu"`, `aria-expanded`, `aria-controls="nav-more-menu"` when open. Active (accent fill) while open.
- Panel `div#nav-more-menu[role="menu"][aria-label=…]`, anchored under the trigger, right-aligned, `position: absolute; z-index: 50`, same chrome as `.group-menu`
  (`Nav.svelte:811`) so there is one dropdown look. Rows are `button[role="menuitemcheckbox"][aria-checked]` (contrast, debug) and `button[role="menuitem"]` (share), each
  a 12 px (`--size-meta`) label with a leading 16 px icon and a trailing check mark when on; row height 32 fine / 44 coarse.
- Keyboard: Enter / Space / ArrowDown on the trigger opens and focuses the first row; ArrowUp / ArrowDown move with wrap, Home / End jump; Enter / Space activates;
  **Escape closes and returns focus to the trigger**; Tab closes (focus moves on naturally); a click outside closes (reuse the existing backdrop button idiom,
  `Nav.svelte:480`). Activating Share closes the menu; contrast and debug rows **stay open** (so the state flip is visible; Escape / outside click close) — Q7.
- **Roving conflict (must be handled, not assumed):** the panel is inside `<nav use:roving>`. `roving` collects `button:not([disabled])` descendants whose
  `offsetParent !== null` (`roving.ts:27–31`), so an open menu's buttons would join the horizontal sweep and ← → would jump into them. Fix: pass
  `itemSelector` that excludes `[role="menu"] *`, or render the panel outside the `<nav>` (as the mobile drawer is, `:501`) — decided at implementation, guarded by the
  existing `a11y-keyboard.spec.ts:28` (exactly one tabbable) plus the new menu spec. The existing group menus (`:340`) already live inside the nav; they have no arrow
  handling, so the conflict is invisible there today. A6 does **not** change them (leave for C8 / out of scope; noted, §10 NV3).
- Feedback: Share currently shows nothing after copying a link (`shareCurrent` returns `'copied'`, ignored). A6 leaves behaviour as is (no invented scope); Q8.

### 3.5 Phone and touch layout

≤ 600 px: bar = brand · audio · lens · settings · hamburger (4 controls, was 5: **share leaves the bar**) = 4 × 44 + 3 × 2 = 182 px (was 228). The More trigger is
**not** shown ≤ 600 px; its three items live in the drawer's `.drawer-controls` row next to the locale picker (contrast and debug already do; share is added as a
row; debug's `On` / `Off` text button becomes a check state). 601 px – 1219 px touch / narrow: More shown, hamburger shown, links in the drawer. Both lists render from
**one** array so bar menu and drawer can never disagree. TV: unchanged (inline links, 44 px, the full old cluster, no More menu; Q9).

### 3.6 Dead code removed in passing (same file, same rule block)

The `right` snippet prop and `{@render right?.()}` (no caller) and the four `width/height: 32px` lines that `min-*` always overrode. Everything else in Nav stays.

## 4. The height decision (SC-1)

### 4.1 Options

| | Bar | Pros | Cons |
|---|---|---|---|
| **1 (recommended) 52 px, one height** | 52 px on every pointer (touch 44 px targets fit: 4 px margins; wordmark 36 px fits) | spec already says 52 in IA, AGENTS, Design System, UXS-002, UXS-013, BACKFILL B-001 — closes SC-1 by changing **one token**, no doc says 60; matches "compact"; gives HUD rows and A5's chip row 8 px | 36 px wordmark on a 52 px bar is tighter than today; every `--nav-height` consumer moves up 8 px (that is the intent) |
| 2: 48 fine / 56 coarse | two token values behind a media query | touch bar roomier | `--nav-height` becomes pointer-dependent; two screenshot sets; no doc says it; hybrid devices flip |
| 3: keep 60 px, fix the docs | no layout change | zero risk to layouts | contradicts "nav bar height ... match the main links" and "compact"; the cluster shrinks but the bar stays tall; edits ~11 doc lines the other way |

### 4.2 Token edit (the `60px` literal in `tokens.css:75` is a latent bug: it ignores `--nav-bar-height`)

`--nav-bar-height: 52px; --nav-height: calc(var(--nav-bar-height) + var(--safe-area-inset-top, env(safe-area-inset-top)));`

### 4.3 Knock-on (everything is `var(--nav-height)` except the list below — check N6)

Literal 60 / 52 / fallbacks to fix: `Notebook.svelte:860` → `calc(var(--nav-height) + 8px)`; `SurfaceScene.svelte:7082` → `var(--nav-height)` + the same 0 offset
(`top: 60px` = nav 60 today; **read the surrounding panel layout before the edit**); `Timeline.svelte:56` `top: 52px` → `var(--nav-height)` (it already assumed 52: with
60 today the sticky header hides 8 px under the nav — a live bug the change fixes); `science/glossary:120` `scroll-margin-top: 60px` → `calc(var(--nav-height) + 8px)`; ten fallbacks
→ `var(--nav-height)` with no fallback (the token is always defined at `:root`). Scenes that stack under the nav (`inset: var(--nav-height) 0 0 0`) get 8 px more
canvas. Tests asserting positions in absolute px were **not** all read (NOT VERIFIED, §12): `grep -rn "nav-height" tests` finds only a comment; visual baselines are the
risk.

## 5. Hit list (baseline: **38** violations, `2026-11-12-slice-A6-baseline-hits.txt`)

| Check | Count | What |
|---|---|---|
| N1 unconditional 44 px on a nav toggle rule | 10 | `Nav.svelte:872, 873, 905, 906, 983, 984, 1077, 1078, 1157, 1158` (the settings / share rules share the `.debug-toggle` line in the script, so five rule blocks give ten lines) |
| N2 rare toggle rendered as its own button outside the menu | 4 | `Nav.svelte:410, 439, 451, 563` |
| N3 hard-coded English `On` / `Off` | 1 | `Nav.svelte:649` |
| N4 retired pre-A3 blue | 3 | `Nav.svelte:1099, 1105, 1112` |
| N5 token not from one source / not the decided value | 2 | `tokens.css:72, 75` |
| N6 literal nav height or disagreeing fallback | 14 | 4 literals + 10 fallbacks (§2.5) |
| N7 doc nav z-index 20 (code: 40); height mismatches against the decided value | 2 now | `AGENTS.md:765`, `IA.md:179` (heights read as 52, correct for option 1) |
| N8 deliverables missing | 2 | `tests/e2e/nav-controls.spec.ts`, `UXD-016-…` |

### Allow-list (not touched, with reason)

| Item | Reason |
|---|---|
| `.link`, `.group-trigger`, `.group-menu*`, `.caret` (centre row) | N1 compacts the *right* cluster; the centre row is the reference the cluster must match |
| `lens-toggle` gold, `debug-toggle` orange (`a6-keep: semantic state colour, not the accent`) | A3 keeps semantic colours |
| Drawer links, `.drawer-footer`, `.drawer-version` | not in N1 |
| `plan/+page.svelte:1436 margin-top: 60px` | lens overlay offset, not the nav |
| `StationOrbitBanner:297`, `ScienceLayersPanel:755`, `EntityIndex:225` additions | add their own heights to the token |
| `app.css:318 --nav-height: 0px` | exhibit mode; still correct |
| Group dropdown arrow keys (EXPLORE / WORLDS / CATALOG / LEARN) | keyboard gap exists, not N1; noted NV3 |

## 6. Tests

New `tests/e2e/nav-controls.spec.ts` (desktop + mobile projects):
1. **Fine pointer sizes** (desktop project, `hasTouch: false`): `.right` buttons and the locale chip are 32 ± 1 px high and wide; gap between neighbours 6 ± 1; bar height equals the decided token (52);
   link row vertical centre equals bar centre; the cluster's height ≤ the bar minus 2 × 8 px.
2. **Coarse pointer sizes** (`hasTouch: true, isMobile: true` context at 1280 × 720 and Pixel 5): every visible bar button ≥ 44 × 44 (this replaces the 28 px floor in `mobile-layout.spec.ts:127`).
3. **Menu keyboard flow**: focus the More trigger by arrow sweep; Enter opens and focuses the first row; ArrowDown / ArrowUp / Home / End; Space toggles contrast (assert `html[data-high-contrast]`
   and `aria-checked`), menu stays open; Escape closes and `document.activeElement` is the trigger; Tab closes; outside click closes; Share row calls `navigator.share` / clipboard (stub) and closes.
4. **Roving unchanged**: after open and close, the nav still has exactly one tabbable item (reuse the logic of `a11y-keyboard.spec.ts:28`); with the menu open ← → do **not** enter the rows.
5. **Axe on the open menu** (explicit, fails on violations: `a11y.spec.ts` is pilot-mode and would not) — `role=menu` children, names, contrast of rows at 12 px / 60 % white.
6. **Phone**: ≤ 600 px bar has no More trigger and no share; the drawer holds contrast, debug, share, locale; no horizontal scroll at 390 × 844.
7. **Per-locale overflow** (if §3.3 lowers the break): 14 locales × 1024 / 1100 / 1219: `scrollWidth ≤ innerWidth` and no control overlaps the links.
8. **Height token**: `getComputedStyle(nav).height` equals `--nav-bar-height`; `.month-header` (launches timeline) sticky top equals the nav bottom.
Update: `mobile-layout.spec.ts:137–140` selector list (drop `button.contrast-toggle`, add the More trigger on ≥ 601 px); `a11y-keyboard.spec.ts` untouched unless the roving selector changes.
Re-run (at least): `a11y-keyboard`, `a11y`, `mobile-layout`, `mobile-invariants`, `audio`, `locale-picker`, `i18n-picker-sweep`, `page-shell`, `launches-timeline`, `type-floor`, `accent-colour`, `smoke`, `footer-dock`;
e2e on all three Playwright projects before any release (AGENTS rule). Unit: none needed (no logic besides the menu state).

## 7. Docs

| Doc | Change |
|---|---|
| `docs/uxs/IA.md` §shell-regions (`:179`), spacing tokens (`:247`) | nav = decided height; **z-index 40** (not 20); right cluster = audio · locale · lens · settings · More; sizes 32 / 44 |
| `docs/concept/05_Design_System.md` §4.1 table (`:158`), §5.1 (`:227`), spacing tokens (`:207`) | height; replace "view toggle + status" zone text with the real cluster; menu pattern; `--nav-btn-fine/-touch` |
| `AGENTS.md` (`:158` Nav comment, `:765` block) | "52px" stays if option 1; z-index 40; one line: "right-hand controls 32 px on fine pointers, 44 px on touch; contrast / share / debug live in the More menu (UXD-016)" |
| `docs/adr/TA.md:30` (nav paragraph) | "hamburger collapse ≤ 1219 px or coarse" (it still says ≤ 500 px: a stale line), cluster and More menu |
| `docs/uxs/UXS-000-orrery-ux-architecture.md` | SC-1 closed (value and token), z-index mismatch logged and closed; `docs/uxs/CHANGE-INVENTORY.md:27` A6 row status |
| UXS-002 / UXS-013 | none if option 1 (they already say 52) |
| `docs/uxs/decisions/UXD-016-compact-nav-and-more-menu.md` | new, appendix below |
| `src/lib/components/README.md` | Nav row: the shared `.nav-btn` base and the More menu |

## 8. Locales

**Zero new keys with Option A.** Reuse, all verified present in all 14 `messages/*.json`: `layout_footer_more` ("More", trigger label), `nav_high_contrast_aria`
(row label), `nav_share` ("Share this view", row label), `nav_debug_aria` / `nav_debug_label` (row label; title `nav_debug_title`), `nav_audio_tour_aria`, `nav_science_lens_aria`,
`settings_title`, `nav_mobile_menu_open_aria`. The check state is a check mark + `aria-checked`, not the English `On` / `Off` text. If the operator prefers a dedicated key
(`nav_more_aria`, "More options") it is one key × 14 locales by hand, inline, no paid run (memory: no paid translation runs); Q10. Option B would add no new keys either (the same three).
RTL (`ar`): menu anchors to the inline-end edge (`inset-inline-end: 0`), the cluster mirrors with the bar; checked in the screenshots for `ar`.

## 9. Screenshots (dev server per AGENTS "Iterating on UI", not Docker; before = current HEAD, after = the slice)

Sizes: **1440 × 900**, **1280 × 720**, **390 × 844**. Routes: `/` (no lens), `/science/…` (lens available, so the gold state shows), `/explore` (HUD under the nav).
For each size, before / after: (1) bar closed; (2) More menu open (desktop sizes) or drawer open (phone); (3) lens active + audio playing state; (4) `ru` at 1219 and 1100 px
(longest locale; shows the §3.3 break) and `ar` at 1280 (RTL). Plus one 1440 × 900 strip of the bar crop at 3 × to compare heights of links vs the cluster.
Operator sees them before the final slice commit (`ux-baseline-review` flow).

## 10. Decisions and open questions (operator; recommendation first)

- **Q1 Shape.** (a) **Option A: compact bar + one More menu** (recommended; the plan's design). (b) Option B: contrast, debug, share into the Settings sheet. (c) Option C: compact only.
- **Q2 Bar height (SC-1).** (a) **52 px, one height** (recommended; the spec value, one token edit, closes SC-1). (b) 48 fine / 56 coarse. (c) keep 60, fix the docs.
- **Q3 Fine-pointer size.** (a) **32 px square buttons** (plan: "~32"; chip is 30 per A4, nav stays 32 as chrome) (recommended). (b) 30 px to match the chip exactly. (c) 28 px.
- **Q4 Hamburger break.** (a) **Measure 14 locales and lower 1219 to the measured value in this slice** (recommended; the 392 px cluster that forced 1219 is gone). (b) Keep 1219 now, revisit in C8 with the Explore nav.
- **Q5 The menu panel position.** (a) **Inside `<nav>` with the roving itemSelector excluding it** (recommended; the same DOM as the group menus). (b) Outside `<nav>` like the drawer. Pure implementation choice unless it breaks `a11y-keyboard.spec.ts`; decided by that test.
- **Q6 Which pointer is "fine".** (a) **Primary pointer only: `(hover: hover) and (pointer: fine)`** (recommended; the A4 chip query). (b) `any-pointer: fine` (a touch laptop with a mouse gets 32; a touch tablet with a stylus gets 32).
- **Q7 Menu stays open after contrast / debug.** (a) **Stays open for the two switches, closes for Share** (recommended). (b) Always closes.
- **Q8 Share feedback.** (a) **Leave as is** (recommended; not in N1). (b) a one-line "Link copied" toast.
- **Q9 TV.** (a) **TV keeps the full old cluster at 44 px** (recommended; D-pad users reach every control in one row; the roving toolbar already handles it). (b) TV gets the More menu too.
- **Q10 Trigger label.** (a) **Reuse `layout_footer_more`** (recommended; zero locale work). (b) New key `nav_more_aria`.
- **Q11 Usage data.** The code has Umami events only for lens and locale. (a) **No new events** (recommended). (b) Add `nav-more-open` / per-row events so "rarely used" can be confirmed later.

## 11. Check (re-run by the independent checker; must print `A6-CHECK violations: 0`)

Run from the repo root: `DECIDED=52 python3 docs/wip/2026-11-12-slice-A6-check.py --list` (the script is below; it is saved at that path when the go comes, not now).
`DECIDED` is the operator's Q2 value. Baseline at HEAD `12a98d06faa`: **A6-CHECK violations: 38**. The script is read-only, stdlib only.

```python
#!/usr/bin/env python3
"""A6-CHECK — run from the repo root: DECIDED=52 python3 a6-check.py [--list]"""
import os, re, sys, pathlib
R = pathlib.Path('.')
DECIDED = os.environ.get('DECIDED', '52')
v = []
def hit(tag, loc, msg): v.append(f'{tag} {loc}  {msg}')
def lines(p): return (R / p).read_text().split('\n')

# N1: unconditional 44 px on a nav toggle rule (44 belongs only under @media (pointer: coarse))
NAV = 'src/lib/components/Nav.svelte'
L = lines(NAV)
start = next(i for i, l in enumerate(L) if l.strip() == '<style>')
depth, stack, sel = 0, [], ''
TOG = re.compile(r'\.(contrast|lens|settings|share|debug|audio|menu|nav-more)-toggle|\.nav-more-trigger')
for i in range(start, len(L)):
    l = L[i]
    if '{' in l and not l.strip().startswith('/*'):
        if l.strip().startswith('@media'): stack.append((depth, 'pointer: coarse' in l))
        else: sel = l.strip()
    if re.search(r'min-(width|height):\s*44px', l) and TOG.search(sel) and not any(c for _, c in stack):
        hit('N1-UNCONDITIONAL-44', f'{NAV}:{i+1}', f'{sel.rstrip(" {")} -> {l.strip()}')
    depth += l.count('{') - l.count('}')
    while stack and depth <= stack[-1][0]: stack.pop()

# N2: the three rare toggles still rendered in the bar / drawer as their own buttons
for i, l in enumerate(L):
    if re.search(r'class="(contrast|share|debug)-toggle"', l):
        hit('N2-RARE-TOGGLE-OUTSIDE-MENU', f'{NAV}:{i+1}', l.strip())

# N3: hard-coded English On/Off
for i, l in enumerate(L):
    if re.search(r"'On'\s*:\s*'Off'", l): hit('N3-ENGLISH-ON-OFF', f'{NAV}:{i+1}', l.strip())

# N4: retired pre-A3 blue in Nav.svelte
for i, l in enumerate(L):
    if re.search(r'#96afff|rgba\(150,\s*175,\s*255', l, re.I): hit('N4-RETIRED-BLUE', f'{NAV}:{i+1}', l.strip())

# N5: tokens — one source for the bar height, equal to the decision
T = lines('src/lib/styles/tokens.css')
for i, l in enumerate(T):
    if re.match(r'\s*--nav-bar-height:', l) and not re.search(rf':\s*{DECIDED}px', l):
        hit('N5-TOKEN-VALUE', f'src/lib/styles/tokens.css:{i+1}', f'{l.strip()} != {DECIDED}px')
    if re.match(r'\s*--nav-height:', l) and 'var(--nav-bar-height)' not in l:
        hit('N5-TOKEN-LITERAL', f'src/lib/styles/tokens.css:{i+1}', l.strip())

# N6: literal nav heights that should be var(--nav-height) (pointers read at the brief's commit)
PIN = [
 ('src/lib/lab/Notebook.svelte', r'top:\s*60px'),
 ('src/lib/surface-scene/SurfaceScene.svelte', r'top:\s*60px'),
 ('src/lib/components/launches/Timeline.svelte', r'top:\s*52px'),
 ('src/routes/science/glossary/+page.svelte', r'scroll-margin-top:\s*60px'),
]
for f, rx in PIN:
    for i, l in enumerate(lines(f)):
        if re.search(rx, l): hit('N6-LITERAL-NAV-HEIGHT', f'{f}:{i+1}', l.strip())
# fallbacks that disagree with the token
for p in R.glob('src/**/*.svelte'):
    for i, l in enumerate(p.read_text().split('\n')):
        m = re.search(r'var\(--nav-height,\s*(\d+)px\)', l)
        if m and m.group(1) != DECIDED: hit('N6-FALLBACK', f'{p}:{i+1}', l.strip())

# N7: docs say the decided height and the real z-index (40)
for f in ['AGENTS.md', 'docs/uxs/IA.md', 'docs/concept/05_Design_System.md', 'docs/adr/TA.md']:
    for i, l in enumerate(lines(f)):
        for m in re.finditer(r'(?i)nav[^|\n]{0,40}?\b(\d\d) ?px', l):
            if m.group(1) in ('52', '60') and m.group(1) != DECIDED: hit('N7-DOC-HEIGHT', f'{f}:{i+1}', l.strip()[:120])
        if re.search(r'(?i)nav bar.*z-index:? 20', l): hit('N7-DOC-ZINDEX', f'{f}:{i+1}', l.strip()[:120])

# N8: deliverables exist
for f in ['tests/e2e/nav-controls.spec.ts', 'docs/uxs/decisions/UXD-016-compact-nav-and-more-menu.md']:
    if not (R / f).exists(): hit('N8-MISSING-FILE', f, 'not created')

print('\n'.join(v) if '--list' in sys.argv else '')
print(f'A6-CHECK violations: {len(v)}')
sys.exit(1 if v else 0)
```

## 12. Acceptance (definition of done, per the plan)

1. `A6-CHECK violations: 0` on the working tree (§11).
2. Fine pointer: every right-hand control is 32 px, gap 6 px; coarse: 44 px; bar = decided height; the right cluster is shorter than and centred with the link row (spec 1, 2).
3. Contrast, share, debug reachable only through the More menu (bar and drawer), with labels, state and keyboard flow (spec 3), axe clean (spec 5).
4. SC-1 closed: tokens, IA, AGENTS, Design System, TA say one height and the true z-index; UXS-000 mismatch list updated; CHANGE-INVENTORY A6 row in review.
5. UXD-016 written and linked from the docs it changes; no new locale key (or the one from Q10 in all 14).
6. Before / after screenshots at 1440 × 900, 1280 × 720, 390 × 844 shown to the operator and approved.
7. The e2e list of §6 passes on all three Playwright projects; coverage gate (`npm run preflight:coverage`) once before push.

### Appendix — draft `docs/uxs/decisions/UXD-016-compact-nav-and-more-menu.md` (proposed; written when the go comes, not now)

```md
# UXD-016 — Compact nav controls and one More menu

- **Status**: proposed
- **Date**: 2026-11-12
- **Decider**: the operator (pending Q1–Q11 of docs/wip/2026-11-12-slice-A6-brief.md)
- **Answers**: N1; slice A6; closes UXS-000 SC-1 (nav height) and the nav z-index mismatch
- **Changes**: `src/lib/components/Nav.svelte`, `src/lib/components/LocalePicker.svelte` (trigger sizing),
  `tokens.css` (`--nav-bar-height`, `--nav-height`, `--nav-btn-fine`, `--nav-btn-touch`), IA §shell-regions,
  Design System §4.1 / §5.1, AGENTS.md, TA.md nav paragraph

## Context
The eight right-hand controls were 44 x 44 on every pointer (a dead `32px` lost to `min-width: 44px`), 14 px apart, a 392 px cluster beside 27 px links,
in a 60 px bar the docs said was 52 px. Contrast, share and debug sit in the primary chrome for every visitor.

## Options
A compact bar + one More menu. B contrast / debug / share inside the Settings sheet. C compact only.

## Decision
(to be filled) Recommended: A; 52 px single height; 32 px fine / 44 px coarse; gap 6 / 4; menu = APG menu button with menuitemcheckbox rows.

## Consequences
Cluster ~192 px instead of 392 px; the hamburger break can move down from 1219 px after measurement; three actions are two clicks; one `.nav-btn` base replaces five rule copies.

## Verification
`A6-CHECK violations: 0`; tests/e2e/nav-controls.spec.ts on desktop-chromium, mobile-chromium and the third project; axe on the open menu; before / after shots.
```

## 13. NOT VERIFIED (what this brief did not check)

- NV1 No browser, no build, no test run: every size, gap and height above comes from CSS text, not from measurement. The 392 px / ~192 px cluster widths and the lowered break points (ru ≈ 1010, fr / es ≈ 965, en ≈ 840) are arithmetic on the CSS values and the 2026-11-04 comment, not measured.
- NV2 `docs/wip/2026-11-12-slice-A5-brief.md` did not exist, so the A5 cascade row is the operator's one-line description plus the CSS anchors; read it when it lands and re-check §1.
- NV3 Roving versus an open menu (§3.4) is reasoned from `roving.ts:27–45` (selector and `offsetParent` filter); `roving.ts` was read to line 80 only (the Arrow handler beyond it, `stopPropagation` behaviour, MutationObserver re-normalisation) and never run. The existing group dropdowns' lack of arrow-key handling is read from markup, not exercised.
- NV4 Position-dependent tests: only `mobile-layout.spec.ts`, `a11y-keyboard.spec.ts`, `page-shell.spec.ts`, `footer-dock.spec.ts:60–126`, `smoke.spec.ts:70–100` were read. Visual-baseline / pixel-position assertions that bake in 60 px (a bar-height change moves everything 8 px) were searched only with `grep nav-height`, which finds one comment; absolute-pixel assertions in explore / fly / surface specs may exist.
- NV5 The ten fallback literals and four literal tops (§2.5) were located by script; only `Notebook.svelte:860`, `SurfaceScene.svelte:7078–7090`, `Timeline.svelte:50–58`, `plan:1432–1438` were read for context. `SurfaceScene:7082` is classified nav-related from the property name and the 60 = nav coincidence; confirm before editing.
- NV6 Umami: the code names two nav events (lens, locale); usage numbers were not queried, so "rarely used" is the operator's statement, not data.
- NV7 `SensorySheet` contents were read by grep (headings, roles, sections), not in full; Option B's feasibility (long sheet, shared `settingsOpen`) is from that.
- NV8 Touch-laptop / hybrid behaviour of `(pointer: fine)` and the TV query's interplay with the new fine-pointer rules is reasoned, not tried; `max-resolution` TV detection also feeds `isTv` in script.
- NV9 Other `Nav`-adjacent UI: `site-footer` positions, the `AudioOverlay` / `SensorySheet` anchors at `var(--nav-height)` (they follow the token) were not visually checked; the A2/A4 slices' state on disk (A2 landed? A4 brief only) was inferred from commits and briefs, not from running the check scripts.
- NV10 The check script was run once at HEAD (38 hits); its N1 reads the last selector line before a rule, so a combined selector `.settings-toggle, .share-toggle, .debug-toggle` reports under `.debug-toggle`; N6 pins five literals by file; N7 is a regex over four docs and misses other spellings ("52 pixels").
