# Slice C8 brief — Explore navigation: one shell table, glyphs in the level picker, a "what you are looking at" card, one welcome hint, the second-level nav (E1, W1, E7, E9, E10)

Read-only brief, written at HEAD `9a47f5e4ae3` on `tech-debt/0.9.9`. Method: reading files from the repo root and `git grep`. Nothing was built, run in a browser or measured: every pixel figure is CSS arithmetic (§13). No code was changed. This slice waits on the operator's **D4** (second-level nav) in `CHANGE-INVENTORY.md` line 49; D4 is **not answered** anywhere in the plan (`docs/wip/2026-11-11-ux-feedback-plan.md` lines 29, 146, 356; the "Answers" sections of the plan do not mention it), so the nav part is a decision here (Decision 1), the rest does not wait.

## 0. Answer first

1. **The "breadcrumb" the operator describes no longer exists as a breadcrumb.** `/explore` has had one "Scale" chip (`◉ <current level> ▾`, `ExploreScalePicker.svelte`) plus a back chip and a Reset since #45; the file says "the redundant breadcrumb is gone" (`src/routes/explore/+page.svelte:2095-2097`, `ScaleNav.svelte:2-8`). UXS-014 line 14 and TA.md line 390 still say "breadcrumb": doc-vs-code divergence, fixed in this slice. So E10 ("breadcrumbs are boring: reuse the home-page icons") means the **picker chip and its ladder**.
2. **The eight levels are listed four times, by hand**: the nav dropdown (`Nav.svelte:61-81`), the Explore hub (`routes/explore/hub/+page.svelte:12-72`), the home grid (`routes/+page.svelte:88-152`) and the picker (`ExploreScalePicker.svelte:48-66`, over `CTX_ORDER`, `scale-shell-controller.ts:20-30`). A fifth copy holds the per-level story and science link (`lens-panel.ts:34-125`). The icons (`ScaleGlyph.svelte`, 8 glyphs) are already shared by the home grid and the hub; the nav and the picker draw none. **Proposal:** one table `src/lib/explore/scale-shells.ts` (id, query, glyph, name, title, desc, science slugs) read by all five; a unit test fails when a level is missing from any consumer.
3. **E9:** a per-level card "what you are looking at" (the `TierContextCard` pattern: header with glyph + name + ▾, collapsible, body = the home-grid description + up to five `/science` links) hung under the picker row, always available (the Science-Lens story is an opt-in panel, `ScienceLayersPanel.svelte`, shown only when the lens is on). The links are **language-neutral `tab/section` slugs** (the shape `refsFromSlugs` already reads), titles come from `science-index.<locale>.json`: **no new translation for the links**.
4. **E1/W1:** one dismissible one-line hint, the same component on `/explore` and on the four Worlds, 2 new message keys (an Explore and a Worlds wording) in 14 locales; the plan's "show a few locations at the start zoom" is a separate question (Decision 4).
5. **E7 (second-level nav):** the plan's D4 ("drop it, use the breadcrumb") and E7's own last sentence ("keep them as separate pages in the sitemap and main nav, without duplicated logic") point in two directions. The levels are **not** separate pages today: they are `?context=` on one prerendered `/explore` (the sitemap lists `/explore` and `/explore/hub` only, `scripts/site-routes.mjs:26-27`). Recommendation: keep the dropdown, remove the duplicated logic (point 2), do not add routes.
6. **Needs the operator before code:** 6 forks in §12.

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 140, 146–149, 268; slice row 355)

| ID | Text | State at HEAD |
|---|---|---|
| E1 | "A welcome message inviting the user to zoom in and explore." | None. No welcome or hint string exists for `/explore` (`grep -n "welcome\|hint" +page.svelte` finds nothing); the only guidance is `explore_canvas_aria_3d` (screen readers) and the INDEX handle. |
| W1 | "A welcome message inviting the user to zoom in and explore; maybe show a few locations at the start zoom to hint there is more." | None on `/earth`, `/moon`, `/mars`, `/venus` (`iss_hud_hint` "Drag to orbit · tap a module" is the one hint string of that kind in the repo, for `/iss`). |
| E7 | "Does the second-level nav under Explore need to exist? … maybe the breadcrumb on all Explore surfaces is the way to navigate them. Keep them as separate pages in the sitemap and main nav, without duplicated logic. (D4)" | The dropdown has 8 children (`Nav.svelte:61-81`), the picker has the same 8 rungs, the hub and the home grid repeat them (§2.1). |
| E9 | "Next to the breadcrumb, explain the layers — like the lander image-layer explanation. Dedicated science articles explaining the layers, linked from here; maybe an article per layer, linked when looking at that layer." | The lander image-layer explanation is `TierContextCard` (Moon/Mars). On `/explore` the per-level story exists (`explore_lens_story_*` title + body, `lens-panel.ts`) but only inside the Science Lens panel when the lens is on, with one `/science` link per level (two levels share one: Virgo and Cosmic web both `large-scale-structure`, `lens-panel.ts:79-101`). |
| E10 | "Breadcrumbs are boring: instead of small circles reuse the home-page icons, more graphical; reuse the home-page text per layer on the pages to explain what we are looking at." | The picker chip carries a small round dot (`Chip dot`, `ExploreScalePicker.svelte:128`); the home grid and hub draw `ScaleGlyph` icons with `landing_card_*` / `explore_hub_desc_*` text. |

## 2. Current state (file:line at `9a47f5e4ae3`)

### 2.1 The eight levels, four hand-kept copies plus one

| Copy | Where | What it holds |
|---|---|---|
| Nav dropdown | `Nav.svelte:61-81` (`navItems` explore group; `childActive` `:154-171`; mobile copy `:687`) | path `/explore` + `?context=<id>`, label `m.explore_ctx_*` (text only, no glyph); hub link `/explore/hub` |
| Explore hub | `routes/explore/hub/+page.svelte:12-72` → `SectionHub` | route, query, glyph id, `name` (`explore_ctx_*`), `title` (`explore_hub_shortcut_*` for three levels, `explore_lens_story_*_title` for the other four, `landing_card_explore_title` for the Solar System), `desc` (`explore_hub_desc_*`, `landing_card_explore_desc`) |
| Home grid | `routes/+page.svelte:88-152` → `RouteCardGrid.svelte:134` (`ScaleGlyph`) | the same eight records, written again |
| Picker | `ExploreScalePicker.svelte:36-66, 119-` | `rungs = [...CTX_ORDER].reverse()`, `labelFor` switch over the 8 ids, a small `dot` on the chip |
| Lens story | `lens-panel.ts:34-125` (`computeLensPanel`) | per level: title, body, one science `tab/section` (`black-holes` for a takeover, `hertzsprung-russell`, `our-galaxy`, `local-group`, `galaxy-types`, `large-scale-structure` ×2, `laniakea-and-the-great-attractor`, `keplerian-orbit` + two history anchors for the solar system) |
| Order and ids | `scale-shell-controller.ts:20-30` | `CTX_ORDER`, `ShellId` |

Glyphs: `ScaleGlyph.svelte:5-14` (a `SCALE_GLYPHS` set of the 8 ids, SVG children; "the caller owns the `<svg viewBox="0 0 48 48">` and the `ic-*` gradient defs"). `RouteCardGrid.svelte:134` and `routes/+page.svelte:415` are its two consumers.
Sitemap: `scripts/site-routes.mjs:26-27` lists `/explore` and `/explore/hub`; no per-level URL exists (a `?context=` URL is the same HTML file).

### 2.2 The navigator

`ScaleNav.svelte` (118 lines): a flush-right row `top: 8px; right: 8px; z-index: 46`, `[‹ back] [◉ level ▾] [⟲ reset]` (`:38-78`); at the Solar System the Reset is the HUD row's and the row clears a docked panel by `panelCoverPx`. Hidden in 2D, during a black-hole / deep-sky / body-scene takeover (`explore-scale-picker.spec.ts:67`). Mounted `+page.svelte:2099-2112`. The scale readout strip (`ScaleStrip.svelte`, UXD-021) sits at the bottom; the layer-lens panel (`ScienceLayersPanel`, `+page.svelte:2525`) is the existing per-level explanatory block.

### 2.3 The pattern to copy for E9 (`src/lib/components/TierContextCard.svelte`, 290 lines)

Header (name, nation chip, `▾/▸` button with `aria-expanded`/`aria-controls`/aria label keys `surface_card_collapse_aria`/`surface_card_expand_aria`), a body with one block per layer and an optional "how it works" link into `/science` (`howItWorksHref`), expanded by default on desktop and collapsed on a touch device, the choice remembered in `localStorage` key `orrery.surface.tierCardExpanded` with a blocked-storage fallback (`:27-50`). IA §state-persistence already lists it, and the ruler's fold, as the two UI-preference exceptions (`IA.md:295`).

### 2.4 Worlds (for W1)

`SurfaceScene.svelte` is the one scene for `/earth /moon /mars /venus`; its HUD slots are `barStart` snippets and the surface bottom bar. The Worlds' welcome would mount there once.

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

Desktop 1440×900 and 1280×720 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`):
1. `/explore` at each of the eight levels (`?context=<id>`): the navigator row and the area below it, before and after (8 shots × 2 sizes).
2. The picker open: ladder with and without glyphs; at the Solar System (flush right) and at the Milky Way (the chip is not at the edge).
3. The new card at three states: expanded, collapsed, with a right-docked panel open (a planet panel, 314–400 px).
4. Welcome hint on `/explore` and `/moon`: first visit, after dismissal, after the first wheel/drag.
5. Nav dropdown (Explore group) and the mobile nav drawer's Explore group, before and after (if glyphs are added there: Decision 2).
6. `/explore/hub` and the home grid: unchanged (same table) for a pixel-diff: any change is a regression.
7. The same level in `de`, `ru`, `hi`, `ar` (long names: "Virgo Supercluster", "Stellar Neighborhood") for the picker chip width and the card header.

## 4. Proposal per feedback item

### 4.1 E7 — one shell table, no duplicated logic (independent of the D4 answer)

New `src/lib/explore/scale-shells.ts`, pure and typed on `ShellId`:
```
SCALE_SHELLS: Record<ShellId, { query: string; glyph: ShellId; name: () => string; title: () => string; desc: () => string; science: string[] /* tab/section slugs */ }>
```
Every consumer maps `CTX_ORDER` over it: `Nav.svelte:61-81`, the hub, the home grid, the picker's `labelFor` and rungs, `computeLensPanel`'s section for the level. The message keys are the ones in use today (no rename, no new text). The title inconsistency (three levels use `explore_hub_shortcut_*`, four use `explore_lens_story_*_title`) is resolved by one rule: `title` = the lens-story title for all eight except the Solar System (landing title); the three `explore_hub_shortcut_*` keys become unused and are deleted (14 locales) or kept for the hub only (Decision 6). Unit test `scale-shells.test.ts`: every `CTX_ORDER` id has a record; ids in `SCALE_GLYPHS`; the nav's `?context=` children equal the table; every science slug resolves in `science-index.json`.

**The second-level nav itself (D4):** recommended (Decision 1): **keep** the Explore dropdown (main nav entries stay, as E7 says), remove the copied code (above), and give the dropdown rows the glyph (small, 20 px) so the nav, the picker, the hub and the home grid are visibly one thing. The plan's alternative (drop the dropdown, the picker is the only way) removes eight entries from the main nav and from TV/keyboard navigation; with the sitemap unchanged (no per-level URLs exist) it changes nothing for crawlers.

### 4.2 E10 — glyphs and per-level text in the picker

The chip's `dot` becomes the current level's glyph (20–24 px SVG: `ScaleGlyph` inside a small `<svg viewBox="0 0 48 48">`); each ladder rung gets its glyph at the same size and a second line of text, the home-grid `desc` truncated to one line (ellipsis) or hidden on phones (Decision 2). The SVG gradient `ic-*` defs live in the two consumer pages today; the picker needs them too: extract a `ScaleGlyphDefs` (or make `ScaleGlyph` self-contained, one `<svg>` per use) so a glyph does not depend on a sibling's `<defs>` (NV3: whether the defs ids are page-global and unique).

### 4.3 E9 — the per-level card (`LevelContextCard.svelte`)

- **Place:** under the navigator row at its right edge (`right: 8px`, top = row bottom + 6 px, same `panelCoverPx` clearing as `ScaleNav` so a docked panel does not cover it), width 280 px; z below panels. It follows the level (8 contents), hides when the navigator hides (2D, takeovers).
- **Parts:** header (glyph, level name, ▾ toggle, `aria-expanded`), lead = the home-grid `desc` (one to two sentences, the text the operator asked to reuse), "What you are looking at" body = the lens-story body (already 14 locales: `explore_lens_story_*_body`, 40–75 words), then up to **5** `ScienceChip`/link rows (`pickScienceLinks`, `SCIENCE_LINK_MAX`, UXD-022) to `/science/<tab>/<section>`. The links per level are in `scale-shells.ts` as slugs: a first list proposed from the repo's own sections (to be checked against `science-index.json` by the unit test, not authored here: NV5): Solar System (`orbits/keplerian-orbit`, as `lens-panel.ts:107-108` has it, plus sections the planet panels already link, e.g. `keplers-laws`), Neighbourhood (`observation/hertzsprung-russell`, constellations/parallax sections), Milky Way (`observation/our-galaxy`), Local Group (`observation/local-group`), Local Sheet (`observation/galaxy-types`), Virgo (`cosmology/large-scale-structure`), Laniakea (`cosmology/laniakea-and-the-great-attractor`), Cosmic web (`cosmology/large-scale-structure` + a second distinct section so the two levels no longer share their only link). "A dedicated article per layer" (E9) is a **content** task (articles), not a code task: this slice links the sections that exist and lists the missing ones (the Cosmic web and Virgo share one; the neighbourhood has no parallax/distance-ladder link from the card) for the content stream (H).
- **State:** the fold is remembered like the tier card (one key `orrery.explore.levelCardExpanded`, blocked-storage fallback), desktop expanded by default, collapsed on touch; this is a third `localStorage` UI preference: IA §state-persistence gets the exception (Decision 5 offers runtime-only).
- **Relation to the Science Lens panel:** the lens panel keeps the layer toggles and its story; to avoid showing the same body twice, the story block leaves the lens panel and lives only in the card (the lens panel keeps its layer toggles and "historical foundations"). Needs a read of `ScienceLayersPanel` (776 lines: NV6); the e2e `explore-science-lens-shells.spec.ts` asserts the story today (NV6).

### 4.4 E1 + W1 — one welcome hint

`ExploreHint.svelte` (shared by `/explore` and `SurfaceScene`): a one-line chip-sized strip near the bottom centre, above the scale strip on Explore and above the nation legend on the Worlds: "Scroll to zoom in · drag to look around" (pointer) / "Pinch to zoom · drag to look around" (touch); a close ×; it fades after the first wheel, pinch or drag, or after 12 s (reduced-motion: no fade animation, same timing); `aria-live="polite"`, role `status`. Two keys (Explore wording mentions the levels: "…zoom out through eight scales"; Worlds wording mentions sites) in 14 locales, hand-written (short, no paid run). Persistence (Decision 5): runtime only (shows on every visit until interaction) or one `localStorage` key `orrery.hint.<route>` so it is not repeated. "Show a few locations at the start zoom": the Worlds scenes already open on a low-detail camera; adding visible markers at the start zoom is a scene change (D-series, Worlds slices), not part of C8; the hint text is C8's whole answer to W1 (Decision 4).

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on C8 |
|---|---|
| #45 picker (pre-0.9.9) | The "breadcrumb" is the picker: the plan's "breadcrumb/picker uses the home-page icons" is the **picker**; UXS-014:14 and TA.md:390 are stale. |
| A4 / UXD-014 | The picker rungs and the card toggle use the shared `Chip` / 24 px `ui-hit` rules; no new control family. |
| A6 / UXD-016 (nav) | The Explore dropdown keeps its compact rows; glyph rows must respect the 32/44 px nav rules (Decision 2). |
| C1 (UXD-019) | Not affected. |
| C3 / UXD-021 | The picker already opens leftward at the right edge and the row clears a docked panel (`panelCoverPx`); the card must use the same clearance and `explore-scale-picker.spec.ts` must keep passing. The scale strip (bottom) and the welcome hint must not overlap (§4.4). |
| C2 (UXD-020) | The card is HTML, not a scene label: not in its scope. |
| C4/C5 (UXD-024) | The orbit ruler is the bottom-left column at the Solar System; the hint sits bottom-centre and clears it by the HUD parts list of `footer-dock.spec.ts` (add the card and the hint to its parts). |
| C6 | None. C7: the legend title is a different element. |
| C9 | Shares the Worlds-side hint component and the `SurfaceScene` HUD slot with W1's hint here: **fold in**: the "Back to Explore" link of C9 and the Worlds hint both mount in `SurfaceScene`'s HUD; build them in the order C8 (hint) then C9 (link) to avoid editing the same snippet twice. |
| B3 (UXD-023) | Panels follow the planet pattern; the card uses the same `ScienceCard`/`pickScienceLinks` vocabulary. |

Plan ideas now outdated: "second-level nav per D4" as a **removal** (not decided); "breadcrumb" as a named component; "the TierContextCard pattern" is right as a pattern but the data is the lens story + home text, not a tier context.

## 6. i18n impact (14 locales, glossary first)

- **New keys: 2** for the hint (Explore, Worlds), plus 2 aria keys for the card toggle (or reuse `surface_card_collapse_aria` / `surface_card_expand_aria`, wording generic: "Collapse the card": recommended reuse, 0 new). Hand-written, short, per `no-paid-translation-runs` and `plan-0.9.6-translation-inline`.
- **Reused, unchanged:** the eight `explore_ctx_*` names, `landing_card_explore_*`, `explore_hub_desc_*`, `explore_lens_story_*_title/body`, `explore_hub_shortcut_*` (kept or removed, Decision 6), the `science-index.<locale>.json` titles for the links.
- **Glossary first:** "zoom", "scale", "level" are in each locale's existing picker and hub strings; draft the hint from them (check `static/data/glossary/native-terms.json`, not opened here: NV7). The card's lead and body are existing text, so the term drift risk is limited to the hint.
- No overlay data (`i18n-src/`) changes: the science slugs are language-neutral.

## 7. Data changes

1. `src/lib/explore/scale-shells.ts` (new, code, holds the slugs); optionally `static/data/scale-shells.json` instead of TS if the operator wants the lists editable without code (not recommended: 8 short lists, one test).
2. No `science-index` change; if a level has no suitable section today (§4.3), the card shows fewer than five links, never a dead one (the test enforces resolution).
3. `explore_hub_shortcut_*` keys: removed or kept (Decision 6).

## 8. Tests to add or change

**Unit (vitest):** `scale-shells.test.ts` (every `CTX_ORDER` id once; glyph ids; each consumer's list derived from the table; slugs resolve in `science-index.json`; at most 5; no two levels with an identical single-link list); `lens-panel.test.ts` (if present: sections now come from the table); a pure `hint-state` helper test (shows until interaction, dismissal, blocked storage).
**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `explore-level-card.spec.ts`: for each of the 8 `?context=` levels the card shows the level's name, the home `desc` text, ≤5 links, all `href`s under `/science/`; toggle `aria-expanded`; the choice survives a reload; with a planet panel open the card box and the panel box are disjoint at 1280×720.
2. `explore-scale-picker.spec.ts` (`:39, :67`): the chip shows the level glyph (an `svg` inside the chip); the ladder keeps its 8 rungs in order; hidden in 2D and takeovers (existing).
3. `nav-controls.spec.ts` / a nav spec: the Explore dropdown has 8 children in `CTX_ORDER`; `childActive` highlights the live level (existing logic, assertion added).
4. Hint: `/explore` and `/moon` first load shows it; a wheel dismisses it; reload shows it again (runtime-only) or not (persisted), per Decision 5; no overlap with `.scale-strip`, `.ruler`, `.legend-3d` (add to the `footer-dock.spec.ts` parts lists, Explore at its eight sizes and the Worlds at five).
5. `a11y.spec.ts`: 0 serious/critical on `/explore` with the card open and on `/moon` with the hint.
6. Snapshot-free parity: home grid and hub render the same eight titles/descs as before the refactor (a string-equality spec over the DOM, in `en-US` and `de`).

## 9. Docs to update by name

- **UXD-026** (new, `docs/uxs/decisions/UXD-026-explore-levels-one-table-card-and-hint.md`; 024 is the last used at HEAD, C7's brief proposes 025): the table, the picker glyphs, the card, the hint, D4's answer; row in `docs/uxs/decisions/README.md`; mark the UXS-014 breadcrumb text superseded.
- `docs/concept/05_Design_System.md`: a new §5.17 "Level card and welcome hint" (look, sizes, clearance, z), §5.15 (the picker's glyph and rung text; the "breadcrumb" wording), §4.7 z-index rows for the card and the hint.
- `docs/uxs/UXS-014.md` (lines 14, 62, 64: the breadcrumb paragraph becomes "the level picker"), `docs/uxs/UXS-005.md`/`UXS-006.md` (Worlds hint), `docs/uxs/IA.md` §nav-groups (the Explore dropdown is derived from the table), §home-cards (same table), §controls (card toggle), §state-persistence (the card's fold and the hint, if persisted), §url-structure (the `?context=` levels are not pages: state it).
- `docs/uxs/CHANGE-INVENTORY.md` row C8 (line 49: D4 recorded).
- `docs/adr/TA.md` line 390 (HUD: "a breadcrumb" → the picker and card), `src/routes/explore/README.md`, `src/lib/explore/README.md` (`scale-shells.ts`), `src/lib/components/README.md` (`LevelContextCard`, `ExploreScalePicker`, `ScaleGlyph`), `src/lib/surface-scene/README.md` (hint mount).
- `docs/accessibility.md` (hint live region, card toggle).
- Headers: `ExploreScalePicker.svelte` (comment names the retired breadcrumb), `+page.svelte:2095-2097`.

## 10. Phased plan

1. **C8a table** (no UI change; pixel-identical): `scale-shells.ts`, the five consumers, the parity e2e (§8-6), the table test. Closes the "duplicated logic" half of E7.
2. **C8b picker glyphs** (E10): glyph in the chip and rungs; nav dropdown rows (per Decision 2).
3. **C8c level card** (E9): component, placement and clearance, the lens-story move, tests §8-1.
4. **C8d hint** (E1, W1): component, two keys, mounts on `/explore` and `SurfaceScene`, tests §8-4.
5. Docs, UXD-026, `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage` (new pure `src/lib` files, ratchet R8). Operator reviews the §3 shots after C8b and C8c before C8d.

## 11. Acceptance checks

- A grep for the eight level names in `Nav.svelte`, `hub/+page.svelte`, `routes/+page.svelte` and `ExploreScalePicker.svelte` finds only table-derived code (no `explore_ctx_milky_way`-style literals outside `scale-shells.ts` and the messages); the home grid and hub render the same text as before.
- Each level shows its glyph in the picker chip and the ladder, the same SVG the home grid draws.
- The card shows on all eight levels, ≤5 links, every link resolves; clear of docked panels at 1280×720 and 1100×700; collapsed on touch.
- The hint shows on first load on `/explore` and the four Worlds, disappears after the first interaction, and overlaps nothing in the `footer-dock.spec.ts` parts.
- D4 is recorded in UXD-026 and `CHANGE-INVENTORY.md`; the sitemap tests (`check-seo`, `site-routes`) are unchanged or updated by the decision.
- Docs of §9 updated; the inventory row C8 says what is built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first)

1. **D4, the second-level nav under Explore.** **(a) Keep the dropdown (main nav entries stay, as E7's last sentence says), remove the duplicated code, add the glyph to its rows** (recommended: nothing is lost for keyboard, TV or direct-jump users; the levels were never separate URLs, so the sitemap is not affected); (b) drop the dropdown: Explore becomes one nav entry to `/explore` and the picker is the only way to a level (the nav loses eight entries and the "jump from any page" path; the home grid and hub still link each level); (c) make each level a real page (`/explore/<level>`, prerendered, in the sitemap), which is the only reading under which "keep them as separate pages in the sitemap" is true today, and a routing/SEO change, not a UI one.
2. **What the picker's rungs and the nav rows show.** **(a) Glyph + name in the picker rungs, plus the home `desc` on a second line on desktop (hidden on phones); glyph + name in the nav dropdown** (recommended: E10's "icons and text per layer"); (b) glyph + name only, no second line anywhere; (c) glyphs in the picker only, the nav dropdown stays text.
3. **Where the per-level card hangs.** **(a) Under the picker row at the top right, 280 px, clearing a docked panel like the row does** (recommended: "next to the breadcrumb" as E9 says); (b) bottom-left like the Moon/Mars card (competes with the orbit ruler at the Solar System and the scale strip); (c) as the first block of the Science Lens panel (no new element; only visible when the lens is on, which is the present problem).
4. **The welcome hint: scope.** **(a) A one-line dismissible hint, same component on Explore and the four Worlds; "show a few locations at the start zoom" is left to the Worlds slices (D)** (recommended); (b) the hint plus a scene change now: the Worlds open at a start zoom with a handful of site markers visible (Worlds scene work inside C8); (c) the hint on Explore only.
5. **Persistence of the card's fold and the hint.** **(a) The card's fold remembered (like the Moon/Mars card and the ruler); the hint shown on every visit until the first interaction, nothing stored** (recommended: one more IA exception, for a layout preference only); (b) both runtime-only (no new IA exception; the card re-opens on every visit); (c) both remembered (the hint never returns after the first dismissal: needs a third key and a way to bring it back).
6. **The three `explore_hub_shortcut_*` titles** (the hub's own phrasing for the Neighbourhood, Milky Way and Local Group, e.g. "The real nearby-star field, in 3D."). **(a) Keep them as the hub's `title`, the home grid and card use the lens-story titles** (recommended: no text deleted in 14 locales; one more field in the table); (b) delete them and use the lens-story title everywhere (one phrasing per level; three keys × 14 locales removed).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The 280 px card width, the 24 px glyph, the card's clearance, and every overlap statement are design arithmetic, not measurements; `ScaleNav` CSS was read only at its position lines.
- NV2 The mobile nav drawer's Explore group (`Nav.svelte:687`) and the TV hub behaviour for a glyph row were not read; the `hub: '/explore/hub'` link behaviour with Decision 1(b) was not traced.
- NV3 Whether the `ic-*` gradient ids of `ScaleGlyph` are defined once per page and what happens if the picker draws a glyph on a page without those defs (the glyph would render without fills) was not checked; the extraction to a self-contained glyph is a proposal.
- NV4 `explore-url-sync.svelte.ts` was read for `?id=`/`?goto=`/`?context=`; whether a level jump from the nav while a panel is open clears the card correctly was not traced.
- NV5 The science slugs listed in §4.3 are taken from `lens-panel.ts` and from the names in the plan; whether `observation/our-galaxy`, `cosmology/large-scale-structure` and the others exist in `science-index.json` with those ids was not checked (the `lens-panel.ts` ones are used in production today; the rest are placeholders for the implementer).
- NV6 `ScienceLayersPanel.svelte` (776 lines) was read for its header only; moving the story block out of it and the `explore-science-lens-shells.spec.ts` assertions were not examined.
- NV7 `static/data/glossary/native-terms.json` was not opened; the 14 locales' wording of the existing `explore_ctx_*` names and of "zoom" were not compared.
- NV8 Whether any other file lists the eight levels (the TV hub, `audio-tour.ts`, the command palette `command_palette_*`, `Nav` search index, `site-routes.mjs` for `?context=`) was not searched beyond the five copies named; the unit test in §8 would catch a missing consumer only if it is added to it.
- NV9 The `landing_card_*`/`explore_hub_desc_*` text lengths in the 14 locales were not measured against a 280 px card (the lens-story bodies are 40–75 words in en-US; in `de` and `ru` longer).

## Decisions (operator, 2026-11-13)

All 6 recommendations of §12 approved as written ("I am OK on 25 recommendations", for C6–C10 together). Order: implementation starts after L45 (the thumbnail scan), which follows C4–C5.
