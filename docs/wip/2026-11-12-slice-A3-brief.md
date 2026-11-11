# Slice A3 brief — link and accent colour (X2, G4, teal redesign)

Read-only brief, written at HEAD `fbedcd51f55` (A2 landed: `page-shell.css`, UXD-012). Full baseline hit list:
`2026-11-12-slice-A3-baseline-hits.txt` (per-line for UI, scene-chrome, scene-science, comment and other; per-file counts for
Lab art / diagrams, dev and docs). Method: `git ls-files` scan of the whole repo (not hand-scoped), colour parsed
not string-matched, see §1. Every claim below was read from the repo at that commit; nothing was run in a browser.

**Decisions already made (cited, not reopened).**
- `docs/uxs/decisions/UXD-001-ui-accent-blue-replaces-teal.md` (accepted): the UI accent is blue D `#5070ff` (today's
  `--color-accent-text`) and replaces EVERY UI teal (links, HUD chips, home glyphs, panels); there is no cyan or teal anywhere in the UI;
  the muted blue `#889fe7` stays for annotation rings, hover and status states; science diagrams and Lab art keep their own colours "for now".
- `docs/wip/2026-11-11-ux-feedback-plan.md`: Q1 answer line 429 ("blue D, `#5070ff` ... every UI teal ... science diagrams and Lab art keep
  their own colours"); "Operator go" line 460 (`#889fe7` stays alongside D); slice A3 row line 329 ("one link token (Q1 blue); teal
  (`#4ecdc4`, ~640 uses in ~123 files) replaced in UI by the token; ... Done when: grep: no teal in UI files outside the allow-list; shots of
  credits, colophon, library, posters, science, explore HUD"); "To check at the end" lines 463–466 (review whether diagrams and Lab art should
  also move to the new palette once D is in place).
- Operator note `no-cyan`: no cyan/teal in UI states, rings, dioramas, reference maps; `099-redesign`: 0.9.9 replaces the site-wide `#4ecdc4`.
- A2 brief line 7: "A3 owns every colour change"; A2 keeps the label colour in ONE variable (`--page-label-color` / `--color-text-label`).

**Dependency.** A3 runs after A2 (landed). A2 already converted the 27 page files to `page-shell.css`; A3 edits colour only and must not
restyle layout. Home (`src/routes/+page.svelte`, 55 UI hits, `RouteCardGrid.svelte` 38) is in scope for COLOUR ONLY per UXD-001 ("home glyphs");
all other home styling belongs to the home slice (H1–H8), so A3 must not change sizes, spacing, copy or structure there.

## The point list

| ID | Operator text | State at HEAD |
|---|---|---|
| X2 | Links on credits, colophon and library are "a turquoise colour"; use the muted blue "used in many places; nothing close to glowing". | The global `a { color: var(--color-accent-text, #5070ff) }` (`app.css:25`) is already blue D; credits, colophon and library override it with `#4ecdc4` in their own CSS (library 15, colophon 12, credits 11 UI hits). Fix = delete the overrides, not add a new rule. |
| G4 | The muted blue in the gallery footer is "a better choice for coloured text than the turquoise elsewhere". | Same: gallery-family pages and every panel/HUD use `#4ecdc4` text, 558 UI hits are `#4ecdc4` / `rgba(78,205,196,x)` (§1). |
| Q1 | Blue D for every UI teal. | UXD-001. Scope table §1 decides each hit. |

## 1. Inventory (repo-wide, colour-parsed)

**Method.** `git ls-files`, every `.css .svelte .ts .js .mjs .json .html .md .svg` file. A hit is (a) a hex literal (3, 6 or 8 digits),
a `0x` hex literal (three.js), an `rgb()/rgba()` or `hsl()/hsla()` whose hue is 155°–200°, HSL saturation ≥ 0.30, lightness 0.25–0.85
(catches `#4ecdc4`, `rgba(78,205,196,…)`, `#7fdbca`, `#5fd3c8`, `#64ffda`, `#5eead4` Tailwind teal-300, `#7fe0ff`, `#5ac8ff`, `#22d3ee`;
misses `#4b9cd3` earth blue, hue 205, and `#889fe7`, hue 227); (b) the CSS named colours cyan, aqua, teal, turquoise, aquamarine, darkcyan,
lightcyan, mediumturquoise, darkturquoise, paleturquoise, cadetblue; (c) the token names `--color-teal`, `--color-tier-intro`, `tier-intro`.
Comments are separated out (a hit that exists only in a comment is class COMMENT). 3-digit hex is only accepted after `: ` or a quote, which
drops issue numbers like `#286`; a real 3-digit teal in another position would be missed (NV3).

**Totals at HEAD: 2287 hits, by class (counts are matches, not lines):**

| Class | Hits | Files | Action |
|---|---|---|---|
| UI (CSS in `<style>`, inline styles, UI `.ts` colour tables) | **744** | 113 | change to the token (§3) |
| SCENE-CHROME (3D/canvas UI chrome: rings, markers, blueprint grid, overlay nodes) | **19** | 7 | change (judged, §2) |
| SCENE-SCI (science colour coding in scenes and data) | **124** | 37 | list for the operator (Q3); NOT changed until answered |
| DIAGRAM (Lab canvases, `FigureRenderer`, `figure-style`, `static/diagrams/**`) | **440** | 102 | allow-list (UXD-001), review at the end |
| COMMENT (teal/cyan only in comments) | **142** | 73 | reword so the grep stays clean; no behaviour |
| DEV (`routes/dev`, `*Debug*`, tests, scripts, `docs/prototypes`, `.vitepress`, i18n tooling data, alt-text prose) | **529** | 122 | allow-list |
| DOCS (rule statements and history) | **280** | 81 | update the live ones (§7); history/wip stay |
| OTHER | **9** | 4 | see below |

UI by kind: 686 colour values, 47 word/identifier hits (`.teal` class on `.cell-value`), 11 token hits. 558 of the 686 values are
`#4ecdc4` (276) or `rgba(78,205,196,…)` (285 incl. the no-space form) — one colour; the other 128 are 40 near-teal values, listed per line in the hit file:
`rgba(45,212,168)` / `#2dd4a8` (green-teal, "ok" states), `rgba(94,234,212)` / `#5eead4`, `rgba(90,200,210)`, `rgba(160,255,240)` / `#a0fff0`,
`#7fe0ff` / `rgba(127,223,255)` / `#7fdfff`, `#5ac8ff` / `rgba(90,200,255)` (launch HUD, `LaunchScene`, `FlightPlan`, `LaunchTelemetry`), `#7ddfd8`,
`#2196a0`, `#00a6a6`, `#1f7872`, `#0e6b7a`, `#3d8b8b`, `#6fb6c9`.

### UI hits by location (744)
`lib/components` 353 · `lib/lab` chrome (Notebook 37, Card 20, ConnRocketStats) 61 · `routes/+page.svelte` (home) 55 · `lib/surface-scene` (style blocks) 47 ·
`routes/science` 43 · `routes/fly` 38 · `routes/explore` 25 · `lib/styles` 20 · `routes/library` 16 · `routes/plan` 14 · `routes/lab` 12 · `routes/colophon` 12 ·
`routes/+error.svelte` 11 · `routes/credits` 11 · `routes/moon` 6 · `routes/posters` 3 · UI `.ts` colour tables 8 (`agencies.ts` 2, `body-palette.ts`, `explore/paths-legend.ts`,
`iss-proxy-model.ts`, `tiangong-proxy-model.ts`, `surface-map/nation-palette.ts` 2).
Heaviest files: `routes/+page.svelte` 55, `RouteCardGrid.svelte` 38, `routes/fly/+page.svelte` 38, `lab/Notebook.svelte` 37, `EpochTimelineStrip.svelte` 30,
`SurfaceScene.svelte` (style block) 26, `StarPanel.svelte` 21, `lab/Card.svelte` 20, `routes/library` 15, `routes/plan` 14. Exact `file:line` for each hit in the hit file.

Named rules that decide whole groups (all inside the UI class):
- Tier colours: `tokens.css:33` `--color-tier-intro: #4ecdc4`, `panel-tabs.css:317–319` `.tier-intro h3 { color: #4ecdc4 }`, `BeltPanel.svelte:508`. `tier-core` is already `var(--color-accent-text)` (`panel-tabs.css:323`) = D, so replacing intro with D makes two tiers the same colour. See Q2.
- Value cells: seven panels set `.cell-value.teal` (BlackHole, CosmicWeb, DeepSky, Exoplanet, Laniakea, … `*Panel.svelte:~105–141`): rename the class (it will be wrong) and use the token.
- Focus ring: `app.css:149` TV-mode `:focus-visible` uses `var(--brand, #4a7dff)`, not teal; 16 component rules set `outline: … #4ecdc4`; all become the focus token (§4).

### Judgement of 3D/canvas colours
| Class | Items (file : count) | Reason |
|---|---|---|
| SCENE-CHROME → change | `station-blueprint.ts` 6 (blueprint grid/outline/selected `rgba(78,205,196,…)`/`#4ecdc4`: chrome of the ISS/Tiangong module picker); `three/explore-scene-host.ts` 5 (mission overlay accent, departure node, `#a8f0f0`/`#207878` label); `surface-scene/SurfaceFlatPatch.svelte` 4 (flat-patch ring, `#22d3ee`); `surface-scene/museum-layer.ts` 1 (`#7fe0ff` museum marker); the other four surface-scene files 1 each (`earth-geophysics-layers 0x6fd3f0`, `surface-climate-layers 0x4a90a4`, `surface-traverses 0x22d3ee`, a ring in `earth-geophysics-layers`) are borderline: marker/ring colours = chrome, climate/geophysics layer fills = science. Lead decides per line; default is chrome for markers and rings (rule `no-cyan`: "UI states, rings, dioramas, reference maps"), science for data-layer fills | rings, markers, hover and selection are interaction chrome; UXD-001 + `no-cyan` |
| SCENE-SCI → operator Q3 | `universe/*-scene.ts` 65 (arm star colour `COOL` teal-white, Local Group / Virgo / Laniakea / cosmic-web point colours), `microgravity-axes.ts` 6 (zenith/nadir axes `TEAL = 0x4ecdc4`), `three/explore-solar-scene.ts` 5 (magnetic dipole axis cyan `0x66ddff`), `three/launcher-models.ts` 3 (Delta II first stage is really turquoise-painted), `three/lineup/cartoon-figures.ts` 4, `ar/sky-scene.ts` 4 (planetary nebula ring), `epoch-bands.ts` 2 (Skylab cyan, Falcon teal: era colour coding), `earth-launch-sites-config.ts` 2 (Kármán-line limb glow, tides), `fly-*` and `*-scene.ts` single hits, `static/data/*.json` colour fields 14 (orbit regimes `LEO #4ecdc4`/`#7fd9d2` in 5 files, `earth-objects`, `explore-orbiters`, `small-bodies`, `voyager-2`, `planets`, `original-work`), `deep-sky-visual.ts` 1 (`#7ff0e0` [OIII] shell colour) | physics or data colour coding (regime colours, an astronomical emission colour, a real paint colour). The operator's 2026-11-09 list names the same candidates (`docs/wip/2026-11-09-0.9.9-redesign.md` lines 18–22) |
| DIAGRAM → allow | `static/diagrams/**` 292 hits in 80 SVG, `lib/lab/*Canvas.svelte`, `FigureRenderer.svelte`, `figure-style.ts` (`stroke: '#4ecdc4'` asserted by `figure-style.test.ts:32` and `lab.spec.ts:39`), `Canvas.svelte` | UXD-001 "Lab art and science diagrams keep their colours" |

Note the data-JSON regime colours are rendered in the UI too (legend dots, regime chips). A chip whose dot is the physical regime colour is science
coding; a chip that uses it as "active" tone is chrome. Q3 asks for one rule.

### Non-src
- `static/manifest.webmanifest:9–10` `theme_color` / `background_color` `#04040c`; `src/app.html:6` `theme-color` `#04040c`: no teal. `static/favicon.svg` only dark + white. `static/icons/orrery-*.png` are raster and were NOT inspected for teal pixels (NV4).
- `static/logos/asi.svg` (`#49bfea`), `static/logos/planet-labs.svg` (`#009da5`): third-party brand marks, allow.
- `messages/*.json`: three keys name the colour in prose, in 14 locales (`chip_label_dv_heatmap`, `plan_explainer_color_desc`, `why_dv_required_body`; teal/turquoise/Türkis/turquesa): they describe the /plan porkchop heat map scale ("cheap teal to expensive red"). They change ONLY if that colour scale (a SCENE-SCI/data colour) changes. Default: not touched (§8 Q3).
- `docs/.vitepress/theme/custom.css` 30 hits: the docs site theme, not the app; allow; recorded as DEV.

## 2. Blue already in use (so the token plan covers it)

| Blue | Where today | Count |
|---|---|---|
| `#5070ff` / `--color-accent-text` | `tokens.css:13`; `app.css:26` (global `a`); `panel-tabs.css:323` (tier-core h3); `LaunchesBanner.svelte:122`; `LearnLink.svelte:64`; `routes/fly/+page.svelte:5778`; `routes/plan/+page.svelte:1594` — all `var(--color-accent-text, #5070ff)` | 7 uses |
| `#4466ff` brand (`--color-accent`, `tokens.css:9`) | 51 raw hex in `src` (no component uses `var(--color-accent)`; the variable is declared and never read) + 92 `rgba(68,102,255,x)` in 24 files (borders, fills, glows); solid fills `routes/plan:1527,1644` | 143 |
| `#889fe7` muted | `status-tone.ts:38`, `AnnotationRings.svelte:307` (`--hl`), `surface-markers.ts:45` HOVER_BLUE, `three-constants.ts:32` outline pass (must stay plain sRGB: `surface-markers.build.test.ts:338`), `MissionPanel` 962/972, `FleetEntryPanel:847`, `StationModulePanel:309`, `TierContextCard` 169–175, `entity-card-grid.css` 183/203, `EarthObjectPanel` 461/471, `SiteIllustrationFigure` 54/69, `routes/fleet:955` | 21 hits, 14 files |
| `#7b9cff` tier-core / `--color-tier-core` | `tokens.css:34` and 9 files | 11 |
| `#7fb0e0` | 12 hits in 7 files (page-section labels were `#7fb0e0`; A2 moved the 5 label rules to `--color-text-label`) | 12 |
| `--brand, #4a7dff` | `app.css:149` TV focus ring | 1 |
| `#4b9cd3` `--color-earth` | Earth identity colour (science), stays | — |

So the site carries FIVE UI blues (`#4466ff`, `#5070ff`, `#889fe7`, `#7b9cff`, `#4a7dff`) plus `#7fb0e0`. A3 does not merge them all; it fixes the
two that matter (accent, SC-5, §4) and documents the roles.

## 3. Token plan (proposed; operator decides Q1–Q3)

```css
/* tokens.css */
--color-accent: #5070ff;          /* the UI accent: links, active, focus, chips, HUD values, glyphs (UXD-001 blue D) */
--color-accent-text: var(--color-accent);   /* kept as an alias for one release; every var() reader moves to --color-accent, then delete */
--color-accent-hover: #8aa0ff;    /* 8.3:1 */
--color-accent-soft: rgba(80, 112, 255, 0.12);   /* tinted chip/panel background (was rgba(78,205,196,.12)) */
--color-accent-edge: rgba(80, 112, 255, 0.35);   /* tinted border (was rgba(78,205,196,.35)) */
--color-accent-strong: rgba(80, 112, 255, 0.7);  /* strong border / outline */
--color-state: #889fe7;           /* UXD-001: annotation rings, hover, status; keep value, give it the name it lacks */
--color-focus: #8aa0ff;           /* focus ring (was teal outline in 16 rules, #4a7dff in TV mode) */
--color-tier-intro: #889fe7;      /* see Q2 */
/* --color-teal: deleted. Not aliased: an alias keeps the word in the tree and the grep gate cannot be 0 */
```

Mechanics: (1) `#4ecdc4` → `var(--color-accent)`; (2) `rgba(78,205,196,A)` → `rgb(80 112 255 / A)`, ONE mapping for every alpha (A kept), or one of the three
soft/edge/strong tokens when A is 0.1–0.15 / 0.3–0.4 / 0.6–0.8; the checker takes literal `rgba(80,112,255,…)` as fine but the doc says use tokens; (3) the 40
near-teal values map by role, not by hex: text/border/fill → accent tokens, "ok/success" greens `#2dd4a8` → keep as a GREEN (`--color-ok`, hue 163 is green-teal: see Q2b) — flagged, not silently moved;
(4) `.cell-value.teal` → `.cell-value.accent` (rename class in markup and CSS together); (5) comments rewritten ("teal" → "accent blue") so the repo grep returns nothing.

### Contrast (WCAG 2.x, computed with `contrast.py` over sRGB relative luminance; background `#04040c`)
| Colour | on page `#04040c` | on HUD `rgba(5,5,20,.88)` | on white-7 % lift | on white-12 % lift |
|---|---|---|---|---|
| `#5070ff` blue D | **4.96** | 4.92 | 4.37 | 3.84 |
| `#4466ff` brand | 4.47 | 4.42 | 3.93 | 3.45 |
| `#889fe7` muted | 7.94 | 7.86 | 6.99 | 6.14 |
| `#8aa0ff` (proposed hover/focus) | 8.32 | 8.24 | 7.33 | 6.44 |
| `#7b9cff` tier-core | 7.82 | 7.75 | 6.89 | 6.05 |
| `#4ecdc4` teal today | 10.56 | 10.46 | 9.30 | 8.17 |
| white text ON a solid D fill | 4.12 (below 4.5) | | | |
| `#04040c` text ON a solid D fill | 4.96 | | | |

Findings: (a) D passes 4.5:1 only on the bare page and HUD (4.96/4.92). On a card with a 7 % white lift it is 4.37 and on 12 % 3.84: **body-size D text on lifted cards
(panels, chips, filter rows, `.cell`) fails AA**. Teal passed everywhere (≥ 8.2), so this is a real regression the swap introduces. Rule proposed: D is for text ≥ 14 px bold / ≥ 18 px (3:1 large-text rule, 3.84 passes) and for
borders/fills/glyphs/rings (3:1 non-text); text smaller than that on a lifted surface uses `--color-state #889fe7` (6.1–7.9). (b) `#889fe7` passes everywhere (≥ 6.14), so it is the safe text blue; it is only "muted"
(the operator likes it). (c) White label text on a solid D fill is 4.12: solid-D buttons and active chips take dark text (`#04040c`, 4.96), not white. The 11 `background: #4ecdc4; color: #04040c`
active chips keep their dark text and stay at 4.96. (d) The A1 label size floor is 11 px: any 11–13 px D text on a card is below 4.5 and goes to `--color-state`; the test (§5) computes the ratio and lists offenders instead of guessing.

### Hover / active / focus variants
| State | Value | Note |
|---|---|---|
| link / accent text | `--color-accent` | `app.css:25` already |
| hover | `--color-accent-hover #8aa0ff`, underline kept | lighter, not a glow (operator: "nothing close to glowing") |
| active / pressed / selected chip | fill `--color-accent-soft`, border `--color-accent-edge`, text `--color-accent-hover` or dark-on-D solid | |
| focus-visible | `2px solid var(--color-focus)`, offset 2 px; TV mode keeps 3 px | one ring instead of 16 teal + 1 `#4a7dff` |
| status / hover on 3D annotation rings | `--color-state #889fe7` | unchanged (UXD-001) |
| visited | unchanged (not styled today) | |

## 4. SC-5 — which token is the UI accent (recommendation; operator decides)

Facts: `IA.md:197` and `AGENTS.md:719` name the accent `#4466ff` ("Primary accent", "Accent blue"); `tokens.css:9` `--color-accent: #4466ff` is declared but read by **no** `var(--color-accent)` (0 uses);
`--color-accent-text: #5070ff` is read 7 times (global link colour). In the code the real accent is two things: 51 raw `#4466ff` + 92 `rgba(68,102,255,x)` for borders/fills, and `#5070ff` for text. UXD-001 names `#5070ff` "the UI accent" and "link blue".

Recommendation: **one UI accent, `--color-accent: #5070ff`** (the value of today's `--color-accent-text`). Reasons: it is what UXD-001 and the operator named; it is the only blue that passes 4.5:1 as text on the page (4.96 vs 4.47);
`--color-accent` is unread today so re-pointing it breaks nothing; one name removes the split that SC-5 records. `#4466ff` is retired: its 51 hex and 92 rgba uses become `--color-accent` / `--color-accent-*` in A3 (the hue difference is 0.7°, saturation the same,
lightness +5 %, so borders move by one shade; screenshot check on plan and filter chips). Caveat the operator should see: `#4466ff` carries white text at 4.57 and D at 4.12, so the two solid fills (`plan/+page.svelte:1527,1644`) take dark text.
`--color-accent-text` stays as an alias for one release and is then deleted (7 readers; grep gate in §10). IA §shared-tokens and AGENTS.md then say one accent. If the operator prefers keeping `#4466ff` for fills, the cost is two
accent tokens forever and the 51+92 uses stay unconverted: not recommended.

## 5. Tests

- **New `tests/e2e/accent-colour.spec.ts`** (3 projects: desktop 1280x720, Pixel 5, Pixel 5 landscape), modelled on `type-floor.spec.ts` (walks `document.body.querySelectorAll('*')`, reads computed style, same `SCREENS` of panel-open pages, same `LOC`
  / `A3_SHOT_DIR` / `A3_VIEWPORT` env switches, same `collectCanonicalRoutes` seeds). For each screen collect, for every element, computed `color`, `background-color`, `border-*-color`, `outline-color`, `box-shadow`, `text-decoration-color`, `fill`, `stroke`, plus `::before/::after`;
  parse each colour (`rgb()`, `rgba()`, `color(srgb …)`, `oklab`, whatever Chromium returns), convert to HSL, fail when hue 155°–200°, S ≥ 0.30, L 0.25–0.85 and alpha > 0.05, listing `selector · property · value`. Skip `svg` descendants under `[data-art]`/`.figure-art` (Lab art, diagrams) and the `canvas` element (pixels are not DOM; scene colours are covered by the unit tests below).
  Screens: the type-floor named screens (explore panel, mission panel, fleet panel, moon surface, missions filters, credits, deep-sky viewer) + `/`, `/colophon`, `/library`, `/posters`, `/science`, `/gallery`, `/plan`, `/fly`, `/lab`, `/explore` HUD, a Lab card — ~16 screens × 3 projects.
  Second test in the same file: link contrast. For each visible `a` and element whose computed colour is within ΔE 8 of D, compute contrast against the nearest opaque ancestor background and the font size/weight; fail below 4.5 (normal) or 3.0 (large), list offenders. This is how §3 finding (a) is enforced instead of assumed.
- **Unit tests** (vitest, no browser): update the 8 that assert the old colours or their intent — `earth-satellite-models.test.ts:17,61`, `three-label.test.ts:15`, `three/orbiter-group.test.ts:14`, `surface-map/surface-index.test.ts:64,134` (fixtures: change to the accent or leave, they test geometry not colour: a3-keep), `readable-text.test.ts:19` (`readableTextOn('rgba(78, 205, 196, 0.16)')` — use the accent soft value), `surface-traverses.test.ts:16` ("ramps teal → white → amber": the traverse ramp is SCENE-CHROME, so the test and the ramp change together or the ramp is held for Q3), `microgravity-axes.test.ts:72` (TEAL, held for Q3), `lab/figure-style.test.ts:30–41` and `tests/e2e/lab.spec.ts:39` (Lab art `#4ecdc4` stroke: unchanged, allow-listed).
  New unit test `src/lib/styles/tokens.test.ts`: reads `tokens.css`, asserts `--color-teal` absent, `--color-accent` = `#5070ff`, `--color-accent-text` aliases it, and (if `--color-tier-intro` stays defined) its hue is outside 155–200.
- **Check script** §10 as a CI-able guard; propose adding it to `npm run preflight` as `scripts/check-no-teal.mjs` (Node port of the Python below) so a new teal cannot land. Proposal only; adding a script is a scope decision for the lead.
- Re-run (3 projects): `credits`, `library`, `colophon`-covering `page-shell`, `posters`, `science`, `lab`, `a11y`, `a11y-keyboard` (focus ring), `landing` (home glyph colours change on purpose), `type-floor`, `visual`, `smoke`, `i18n-all-routes`.
- **Visual baselines that change.** `tests/e2e/visual.spec.ts-snapshots` holds 75 PNGs (25 labels × 3 projects, linux only). Likely changed: every label that shows a link, chip, panel or HUD value in D instead of teal — `credits-head`, `colophon-head`, `library-title`, `library-episodes-head`, `gallery-head`, `deep-sky-head`, `posters-head`, `patches-head`, `programs-head`, `essays-head`, `sourcing-head`, `reading-list-head`, `watch-list-head`, `science-tabs`, the four hub grids, `fleet-filters`, `missions-filters`, `plan-selector-bar`, `fly-mobile-tabs`, `iss-module-list`, `tiangong-module-list`, the four `*-surface-hud` shots: up to all 75. This is a prediction from the selectors, not a run; regenerate with `npm run regen-visual-baselines-linux`, diff-review every PNG, and anything unchanged must have no teal in its DOM (the new spec proves that independently). `landing.spec.ts` has no pixel snapshots at HEAD per the A2 brief; the home route's teal glyph colour change is asserted in the new spec.

## 6. Hit list and allow-list

### CHANGE (UI 744 + SCENE-CHROME 19, 120 files; per line in the hit file)
Order of work (one commit per group so a revert is cheap): (1) `tokens.css` + `app.css` + `panel-tabs.css` + `entity-card-grid.css` + `page-shell.css` token and shared CSS (20 hits); (2) text pages (credits, library, colophon, posters, science 43, plan, `+error`): link overrides deleted; (3) panels and HUD in `lib/components` (353); (4) explore/fly/moon HUDs (`HudControls`, `TimeDock`, `ScaleStrip`, fly 38); (5) home + `RouteCardGrid` (colour only); (6) Lab chrome (`Notebook`, `Card`, `routes/lab`, `ConnRocketStats`: decision Q4 default change); (7) scene-chrome (19); (8) comments (142); (9) docs (§7). `UI .ts` colour tables (`agencies.ts`, `nation-palette.ts`, `body-palette.ts`, `paths-legend.ts`, `*-proxy-model.ts`) are identity/palette colour (agency, nation, body): judge per entry; default is that a teal agency colour (`UAE/MBRSC #4ecdc4`, design system line 87) is identity colour and gets a `a3-keep` with reason, NOT D (D would collide with blue agencies). Count that choice in Q3.

### Allow-list (not changed, reason)
| Item | Reason |
|---|---|
| `static/diagrams/**` (440 DIAGRAM total) | UXD-001: science diagrams keep colours; end-of-work review |
| `src/lib/lab/*Canvas.svelte`, `FigureRenderer`, `figure-style.ts`, `Canvas.svelte`, `ask/AskScenarioView` | Lab art; `lab.spec.ts:39` and `figure-style.test.ts` assert `#4ecdc4` |
| SCENE-SCI list (§1) | physics/data colour coding, pending Q3 |
| `src/routes/dev/*`, `*Debug*` (`DebugPanel`, `FlybyDebugViewer`, `AscentCameraDebug`), `docs/prototypes`, `docs/.vitepress`, `scripts/**`, `tests/**` | dev tools and fixtures |
| `static/logos/asi.svg`, `planet-labs.svg` | third-party brand marks |
| `messages/*.json` colour prose (3 keys × up to 14 locales) | describe the /plan heat map, change only with it |
| `docs/wip/**`, `docs/history/**`, `docs/uxs/records/**`, `docs/uxs/decisions/UXD-001`, `BACKFILL.md` | history and the decision itself must keep saying "teal" |

## 7. Docs (rule says the new rule, links UXD-001)
- `AGENTS.md:719–720` design block: "Accent blue #4466ff" and "Teal #4ecdc4" lines → one accent `#5070ff` (`--color-accent`), muted `#889fe7` (`--color-state`), "no teal or cyan in UI; Lab art and science diagrams keep their own"; add "no page or component writes its own accent colour: use the tokens".
- `docs/uxs/IA.md:197–202,217,31,46`: §shared-tokens colour block (`color-accent`, `color-teal` row at 202 deleted/redefined, `color-tier-intro` at 217), plus the two Lab rows that say "station-blueprint teal grid" (31, 46: the grid is Lab art, reword to "blueprint grid").
- `docs/concept/05_Design_System.md` §2.1–2.2 (`:48` accent-teal row, `:58,61,72,87,90,97` status/tier/agency/regime colours, `:451` "teal text"): 13 hits; status badges ACTIVE/MINE/INTRO rows change; agency and regime colour rows get "identity colour (science)" notes per Q3. Add the contrast rule of §3.
- `docs/adr/TA.md:253` ("station-blueprint teal grid") and the type/colour paragraph (one sentence on the accent tokens).
- UXS specs that say teal: `UXS-001` (4 hits), `UXS-002` (4, HUD/CAPCOM), `UXS-003` (4), `UXS-013`, `UXS-015` (14, Lab: Lab art keeps it, text says so), `UXS-000` §Next SC-4/SC-5 rows closed.
- PRD/RFC/ADR mentions (PRD-013 4, RFC-020 3, RFC-037, RFC-041, PRD-017/022/033/038, ADR-035/036/090): historical design records; add nothing except where they are the current spec of a component (check each, 18 files); list in the hit file DOCS counts.
- `docs/uxs/CHANGE-INVENTORY.md` A3 row; `docs/uxs/decisions/README.md` (UXD-001 row status: implemented); UXD-001 "Changes" gets the final token names; feedback plan answer line for A3; `docs/guides/diagram-art-style.md` (2 hits: states which colours diagrams keep).
- `src/lib/styles/README`-equivalent: components README row for `page-shell.css` already exists from A2; add one line "accent tokens live in tokens.css".

## 8. Locales
No new or changed key by default. Layout risk only: none from colour. If Q3 changes the /plan heat-map colour scale, three keys (`chip_label_dv_heatmap`, `plan_explainer_color_desc`, `why_dv_required_body`) name "teal/turquoise" in en-US, fr, de, es, it, nl and the rest — then all 14 locales change in one pass with a per-locale check (operator rule `numbers-in-all-locales`). Gate: `git diff --stat -- messages src/lib/paraglide` empty unless Q3 says otherwise; `validate-data` green.

## 9. Screenshots for the operator (small, dev server per AGENTS "Iterating on UI"; not Docker)
Desktop 1440x900 and phone 390x844, before (this commit) and after, one side-by-side sheet per viewport, 10 screens: `/credits`, `/colophon`, `/library`, `/science` (+ one section), `/explore` HUD with the Earth panel open,
`/missions` (list + a mission panel), `/fleet` (list + one entry), `/` (home glyphs), a panel with `.cell-value` rows (Deep-sky or Exoplanet panel), `/lab` (one notebook card). Plus `/posters` (the plan names it) and the `/gallery/deep-sky` viewer (G4 facility line) = 12 screens × 2 viewports × 2 = 48 PNGs. A contrast sheet: one screen with D text on a lifted card before the fix rule and after.

## 10. Check (re-run by the independent checker; must print `A3-CHECK violations: 0`)
Baseline run at HEAD `fbedcd51f55`: **742 violations in 116 files** and **6** retired-token references. Run from the repo root as `bash a3-check.sh`; kept here and in the scratchpad, not added to the repo (a Node port as a preflight guard is proposed in §5).
Allow marker: `a3-keep: <reason>` on the same line or in the two lines above. The path allow-list inside the script is the §6 allow-list (dev, Lab art, science diagrams, SCENE-SCI files pending Q3); when the operator answers Q3, the SCENE-SCI files move out of that list (or are kept with a marker).

```bash
#!/usr/bin/env bash
# A3-CHECK — run from the repo root. Prints every violation as "file:line  match", then
# "A3-CHECK violations: N". Allow marker: `a3-keep: <why>` on the same line or in the 2 lines above.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 - <<'PY'
import re, subprocess, colorsys, collections

ALLOW = re.compile(
    r'(^src/routes/dev/|Debug|\.test\.ts$|\.spec\.ts$'                                  # dev tools / tests
    r'|^src/lib/lab/(?!Notebook|Card\.svelte|ConnRocketStats)'                          # Lab art (canvases, figures, figure-style)
    r'|Diagram'                                                                         # science figures (HrDiagram ...)
    r'|^src/lib/universe/|^src/lib/microgravity-axes\.ts|^src/lib/epoch-bands\.ts'      # science colour coding, pending operator Q3
    r'|^src/lib/three/(?!explore-scene-host)|^src/lib/ar/|^src/routes/earth/.*\.ts$'    # 3D science scenes, pending Q3
    r'|^src/lib/explore-scene\.ts|^src/lib/fly-scene-constants\.ts'
    r'|^src/lib/surface-scene/(earth-geophysics-layers|surface-climate-layers|surface-traverses)\.ts$)')
SRC = [f for f in subprocess.check_output(['git', 'ls-files', 'src'], text=True).split('\n')
       if f.endswith(('.svelte', '.ts', '.css', '.js')) and not ALLOW.search(f)]
PAT = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b|\b0x([0-9a-fA-F]{6})\b|rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)'
                 r'|hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d+(?:\.\d+)?)%\s*[, ]\s*(\d+(?:\.\d+)?)%'
                 r'|(?<![\w-])(cyan|aqua|teal|turquoise|aquamarine|darkcyan|lightcyan|mediumturquoise|darkturquoise|paleturquoise|cadetblue)(?![\w-])'
                 r'|--color-teal|--color-tier-intro|tier-intro', re.I)


def hit(h, s, l):
    return 155 <= h <= 200 and s >= .30 and .25 <= l <= .85


def rgb_hit(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return hit(h * 360, s, l)


viol = []
for f in SRC:
    orig = open(f, errors='replace').read()
    st = re.sub(r'/\*.*?\*/|<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), orig, flags=re.S)
    if not f.endswith('.css'):
        st = re.sub(r'(?<![:\'"\w/])//[^\n]*', lambda m: ' ' * len(m.group(0)), st)
    ol, sl = orig.split('\n'), st.split('\n')
    for i, l in enumerate(sl):
        for m in PAT.finditer(l):
            ok = False
            if m.group(1):
                h = m.group(1); ok = rgb_hit(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
            elif m.group(2):
                h = m.group(2); ok = rgb_hit(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
            elif m.group(3):
                ok = rgb_hit(int(m.group(3)), int(m.group(4)), int(m.group(5)))
            elif m.group(6):
                ok = hit(float(m.group(6)), float(m.group(7)) / 100, float(m.group(8)) / 100)
            else:
                ok = True
            if ok and not any('a3-keep' in ol[j] for j in range(max(0, i - 2), i + 1)):
                viol.append((f, i + 1, m.group(0), ol[i].strip()[:90]))
for f, n, m, t in viol:
    print(f'{f}:{n}  {m}  {t}')
c = collections.Counter(v[0] for v in viol)
print('files:', len(c))
print(f'A3-CHECK violations: {len(viol)}')
PY
echo "retired token refs (must be 0):"
git grep -nE -- '--color-teal|--color-tier-intro' -- src ':!src/lib/lab' ':!src/routes/dev' | wc -l
```

The checker must also see, after A3: `git grep -n -- '--color-accent-text' -- src` = 0 once the alias is removed (or only `tokens.css`); `git grep -nE '#4466ff|68, ?102, ?255' -- src` = 0 (SC-5 recommendation) unless the operator keeps `#4466ff`.
Known limits: the colour test is a hue/saturation/lightness band, so a teal-ish value outside it (e.g. a blue-green at hue 150, saturation 0.25) is not caught, and a legitimate blue-green data colour inside it is a false positive that needs `a3-keep`; colours built at runtime (`new THREE.Color().setHSL(…)`, `color-mix`, `hsl(var(--h) …)`) are not parsed; it reads `src` only (static data JSON is covered by §6, not by the script); `//` comment stripping can eat a URL fragment in odd cases; 3-digit hex is ignored. The Playwright spec (§5) is the second guard because it reads computed styles.

## 11. Acceptance (definition of done, per the plan)
1. `bash a3-check.sh` prints `A3-CHECK violations: 0` and `retired token refs: 0`; `git grep -nEi 'teal|turquoise|cyan' -- src` lists only the allow-list files and `a3-keep` lines.
2. Docs in §7 say the rule and link UXD-001; `CHANGE-INVENTORY.md` A3 row updated; `git grep -n '4ecdc4' -- AGENTS.md docs/concept docs/uxs/IA.md` empty.
3. `accent-colour.spec.ts` green on desktop-chromium, mobile-chromium, mobile-landscape-chromium (zero teal-hue computed colours, zero sub-AA D text); re-run specs green; visual PNGs regenerated and reviewed, nothing skipped.
4. Locales: `git diff --stat -- messages src/lib/paraglide` empty (or the 14-locale pass if Q3 says so); `validate-data` green.
5. Home diff is colour tokens only (no layout line changed); scene routes keep every non-colour line.
6. The operator receives the §9 sheets and answers Q1–Q3.

## 12. Decisions and open questions (operator)
- **SC-5 / Q1** `--color-accent` becomes `#5070ff`; `#4466ff` retired (51 hex + 92 rgba uses converted); `--color-accent-text` alias then removed. Recommended yes (§4).
- **Q2** Link tiers: intro/core/deep today teal / D / gold. D replaces teal, which equals core. Recommended: intro `#889fe7` (lighter, 7.9:1), core D, deep gold; the tier names stay in the h3 text, so colour is not the only cue. Alternative: all three keep distinct hues by moving intro to a green. Also **Q2b**: the green-teal "ok/success" `#2dd4a8` / `rgba(45,212,168)` (9 hits) is a state colour, not an accent: keep as `--color-ok` green or fold into D?
- **Q3** One rule for colours that are data, not chrome: regime colours (`LEO #4ecdc4`, 5 data files + legends), agency/nation identity colours, era bands (`epoch-bands`), Kármán/tides, universe-scene star colours, microgravity axes, magnetic-axis cyan, [OIII] colour, Delta II paint, /plan heat map (and its 3 locale strings × 14). Recommended: they stay (science coding), each gets an `a3-keep` with reason, and the list goes to the end-of-work palette review the operator already asked for (plan lines 463–466), EXCEPT any place where the same colour is used as plain "active" chrome, which changes. Operator may instead say "all of it moves to blue-family": then 124 SCENE-SCI hits, 14 JSON colour fields and 14 locales of copy move too.
- **Q4** Lab chrome (`Notebook`, `Card`, `routes/lab`, `ConnRocketStats`, 61 hits: buttons, borders, "ok" card state) vs Lab art (canvases): UXD-001 says "Lab art" stays. Recommended: chrome changes, canvases stay. Confirm.

## 13. NOT VERIFIED
- NV1 No browser, dev server, build or test run. Contrast ratios are computed from sRGB formulas, not measured; no pixel of any page was seen. The claim "D text on a 7 % lift is 4.37" assumes the lift is white at 7 % over `#04040c`, which is how `--color-border`/chip backgrounds are written, not measured per component.
- NV2 The 744/19/124 split is a path-and-heuristic classification (`<style>` blocks of `.svelte` files vs script, directory rules). Individual lines in a `.svelte` script block of a UI file (inline `style="…"`, colour tables) were not each read; SCENE-CHROME vs SCENE-SCI for single hits in `surface-scene/*.ts` is a judgement, flagged in §1.
- NV3 The scan is hue-band based: missed are 3-digit hex outside `: `/quote context, colours assembled at runtime (`setHSL`, `color-mix`, CSS variables holding only a hue), and `hsl(` with a `var()`; false positives inside the band (blue-greens that are intentionally green) are in the hit file and need a call.
- NV4 `static/icons/orrery-*.png`, `static/images`, `static/textures`, `masters/**`, favicons' rasterised variants and any OG/social image were not inspected for teal pixels (raster); no OG image file was found by name but a name search is not a content search. Pages' inline `<svg>` in Svelte markup (`fill="#4ecdc4"` attributes) are covered by the scan only when written as a literal; none was read individually.
- NV5 `static/diagrams/**` hit count (292 in 80 files at scan time, inside DIAGRAM 440 with Lab canvases) was not opened; their allow-listing rests on UXD-001, not on reading them.
- NV6 Whether `tests/e2e/visual.spec.ts` captures a given label with teal in frame is a prediction from the label names (NV2 of the A2 brief applies).
- NV7 The claim that credits/library/colophon links are teal because of local overrides (not a global rule) is from the hit counts in those files (11/15/12 UI hits) and the global `a` rule at `app.css:25`; I did not diff each override against its element.
- NV8 `--color-accent` is read by no `var(--color-accent)` per `git grep` on `src`; usage via JS string (`getComputedStyle(...).getPropertyValue('--color-accent')`) or in `static/` was not searched.
- NV9 Whether the TV-mode focus colour (`--brand, #4a7dff`, `app.css:149`) is defined elsewhere (`--brand`) was not traced.
- NV10 The check script ran once at baseline (742 / 6); it has no tests of its own and was not run against a fixed tree. The proposed hover `#8aa0ff` and soft/edge/strong alphas are proposals, not looked at against any screen.
