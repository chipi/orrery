# Slice G2 brief — Fly visuals: a 2D view you can see, the destination body drawn instead of Mars, HUD rows that wrap inside their value (FY1, FY4)

Read-only brief, written at HEAD `8f0a5872bce` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only scripts (scratchpad `gbr-contrast.mjs`, `gbr-2dfit.mjs`, run with the repo's `tsx` or `node`, not in the repo; their output is quoted). Screenshots of plan-style `/fly` flights to Mars, Jupiter, the Moon and Europa, in 3D and 2D, were taken against the shared dev server `http://[::1]:5180` with the repo's Playwright Chromium (`gbr-shots.mjs`; §2.6). No code or data was changed. The working tree holds other agents' uncommitted edits (the teal palette work among them): not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 93: "Waits on: —"), so the forks in §12 are about numbers and scope. G1 (Plan to Fly) and G3 (Ascent) are separate briefs; decisions are numbered across the three, G-10 to G-14 here. Standing rules respected: no cyan or teal in UI states (highlight `#889fe7`), no new dependency, no paid run, no new image.

## 0. Answer first

1. **FY1 is a contrast problem with numbers.** `draw2d` (`src/lib/three/fly-frame-runner.ts:377-475`) paints on `#04040c`: the Earth and Mars rings are 1 px lines at alpha 0.35, the 150 stars alpha 0.06 to 0.22, the not-yet-flown arc `rgba(80,112,255,0.2)`. Composited over the background (script `gbr-contrast.mjs`): Earth ring **1.71:1**, Mars ring **1.38:1**, stars **1.09 to 1.62:1**, future arcs **1.21:1 and 1.23:1**; the flown arc (`#5070ff`, solid) is 4.96:1. WCAG 1.4.11 asks 3:1 for graphics the user needs; it is used here as a yardstick, not as a conformance claim.
2. **The 2D view draws Earth and Mars for every flight.** The two rings come from `EARTH_ORBIT_PATH` and `MARS_ORBIT_PATH = orbitPath('mars', 180)` (`:237-240`, `:411-434`), the live bodies from `earthPos` and `marsPos` (`:713-722`), the label from `m.nav_mars()`, and the arrival anchor is a Mars-coloured ring (`rgba(193,68,14,0.7)`, `:726-731`). A flight to Jupiter shows Mars's orbit and a Mars disc, and its arrival ring (Mars-coloured) is placed wherever the trajectory stops, which for Jupiter is off the canvas. That is the plan's "Earth and Mars are hard-coded".
3. **The 2D scale is fixed, and 15 of the 21 heliocentric destinations fall outside it.** `BASE_SCALE_2D = min(W, H) / 4` px per AU (`:391`): 225 px/AU at 1440×900, 97.5 at 390×844. Mars (1.52 AU) is 343 px out; Vesta (2.36) is already 531 px, beyond the 450 px half-height; Jupiter 1,171 px; Pluto 8,883 px (`gbr-2dfit.mjs`: Mercury, Venus, Mars, Phobos, Deimos and Bennu are inside, the other fifteen are not). So for most `/plan` destinations the 2D view cannot show where the ship is going.
4. **The 3D scene is already general, the 2D is not.** `applyDestination` in the helio scene swaps the destination mesh and ring for any `DestinationId` (`src/lib/three/fly-helio-scene.ts:616-640`); `DEST_STYLE` has 31 entries; textures are wired for the Sun, Earth, the eight planets and Pluto (`src/lib/three/fly-scene-host.ts:65-74`). Mars is only the initial state (`:578`, `:593`, `:616`). Not drawn as targets: the nine `/plan` moon destinations (not `DestinationId`s; G1 Decision 4) and, with no texture, Ceres, Vesta, Psyche and Bennu (stylised coloured spheres today).
5. **FY4 is flex-wrap acting on the whole value.** `.hud-row` is `display: flex; flex-wrap: wrap; justify-content: space-between` and `.hud-val` is `flex: 1 1 auto; text-align: right; overflow-wrap: anywhere` (`src/routes/fly/+page.svelte:5788-5809`). `flex-wrap` moves a whole item to the next line when it does not fit beside its sibling, so a value one character too long drops entirely under its label and leaves the label alone on its line. That is the operator's "content wraps to the next row after its label". The page has 16 `.hud-row` blocks; the other HUD families (the info card, the plan panel's rows) do not set `flex-wrap` (§2.5).
6. **Recommendation:** (a) rings in neutral white at about 0.45 alpha and 1.25 px, stars 0.15 to 0.5, future arcs 0.45, so every line is at least 3:1 and the planet colour moves to the live body and its label (Decision 10); (b) the 2D view fits the destination: a scale chosen from the destination's orbit (or the trajectory's extent), eased on a change, with a scale readout (Decision 11); (c) draw the active destination's ring, live body, label and arrival anchor in place of Mars, the host plus a named target for the moon destinations (Decision 12); (d) wire the nine existing moon textures in 3D, keep stylised spheres for the four bodies with no texture, add no asset (Decision 13); (e) HUD rows become one two-column grid whose label column is shared by every row of a group and whose value wraps only inside its own column (Decisions 14 and the scope in the same decision).
7. **Cost:** no data change, no new image, no new dependency. New keys: none expected (labels exist: `nav_*`, `plan_destination_*`; the scale readout needs one if worded, §6). Code: `fly-frame-runner.ts` (2D), `fly-helio-scene.ts` (moon textures), `fly/+page.svelte` (CSS), tests, one new e2e spec.
8. **Needs the operator before code:** nothing blocks; 5 forks in §12 (G-10 to G-14).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 300 (FY1) and 303 (FY4); slice row 398)

| ID | Text | State at HEAD |
|---|---|---|
| FY1 | "Too dark in 2D; orbital rings barely visible." | Rings 1.38 to 1.71:1, stars 1.09 to 1.62:1 (§2.1). |
| FY4 | "Tighten the HUDs: content wraps to the next row after its label; start in the label's row and wrap only the remainder. Tidy, aligned, no orphan labels." | The whole value wraps (§2.5). |

The slice row (398) adds the destination body: "the destination body drawn (today Earth and Mars are hard-coded)"; "brighter 2D rings and stars"; "HUD rows as label/value grid, wrapping only inside the value". Done when: "shots of a Mars, Jupiter and Moon flight".
Plan wording that is outdated: "(today Earth and Mars are hard-coded)" is true of the 2D canvas, not of the 3D scene (§0.4).

## 2. Current state (file:line at `8f0a5872bce`)

### 2.1 The 2D canvas (FY1)

`draw2d` clears to `#04040c` (`fly-frame-runner.ts:386`), draws 150 deterministic stars (`:402-409`: radius 0.5, or 1.2 every eighth; alpha `0.06 + (i % 5) * 0.04`), then, unless the flight is a Moon mission, the Earth ring (`rgba(75,156,211,0.35)`, 1 px), the Mars ring (`rgba(193,68,14,0.35)`, 1 px), the Sun glow and disc (`:411-447`). Arcs: `drawSplit` (`:449-475`) with the past solid 2 px, the future dashed `[4, 6]` 1.5 px (`:645-653`: `#5070ff` / `rgba(80,112,255,0.2)` outbound, `#9966ff` / `rgba(153,102,255,0.2)` return). Labels: 9 px bold Space Mono at `rgba(255,255,255,0.85)` (`:581`, `:670`, `:679`, `:736`, `:745`); `TA.md`'s type-scale paragraph lists `fly-frame-runner.ts` among the canvas text "outside the floor and not measured", and these labels are 9 px, below the 11 px floor.

Contrast, composited over `#04040c` (`gbr-contrast.mjs`):

| element | composite | ratio |
|---|---|---|
| Earth ring `rgba(75,156,211,.35)` | 29,57,82 | 1.71 |
| Mars ring `rgba(193,68,14,.35)` | 70,26,13 | 1.38 |
| star, faintest (.06) / strongest (.22) | 16,17,27 / 49,50,65 | 1.09 / 1.62 |
| future arc outbound / return | 19,26,61 / 34,24,61 | 1.21 / 1.23 |
| flown outbound arc | 80,112,255 | 4.96 |
| candidate: white at .5 | 130,130,134 | 5.34 |
| candidate: white at .45 (between the two rows above and below) | about 118,118,123 | about 4.5 (interpolated, not run) |
| candidate: stars at .3 / .6 | 66,67,85 / 128,131,158 | 2.11 / 5.50 |

The Earth ring's blue and the Mars ring's rust carry the `a3-keep` marker in the source (planet identity colours, palette review at the end, plan L4): they stay data colours, which is why Decision 10 moves the rings to neutral and leaves the identity colour to the body.

### 2.2 Earth and Mars in the 2D view, line by line

`MARS_ORBIT_PATH`, `EARTH_ORBIT_PATH` (`:237-240`); rings (`:411-434`); in the heliocentric branch (`:711-757`): `eLive = earthPos(simDay)`, `mLive = marsPos(simDay)`; the anchors (`eAnchor` = `outPts[0]`, `mAnchor` = the last outbound point, so the arrival ring is at the trajectory's end, not at Mars); the live Earth halo and disc in `#4b9cd3`; the live Mars halo `rgba(193,68,14,0.6)` and disc `#c1440e`; labels `m.nav_earth()` and `m.nav_mars()`. The Moon branch (`:660-710`) is Earth-centred at 6× and draws Earth and the Moon: correct for the Moon, and it stays.

`orbitPath(id: DestinationId, steps)` (`src/lib/physics/transfer/mission-arc.ts:64`) and `destinationPos(day, id)` are already generic over `DestinationId`, `DESTINATION_LABEL_COLORS` (`src/lib/fly-scene-constants.ts:36-70`) has a colour for each id, `DEST_STYLE` a size class and a body colour. `activeDestination` and `hudTarget` are on the page (`+page.svelte:679`, `:1329`). So the data for a generic draw exists; the 2D code does not use it.

### 2.3 The fixed scale

`BASE_SCALE_2D = Math.min(W, H) / 4` (`:391`), `SCALE_2D = BASE × 6` for a Moon mission only. Nothing recomputes it from the flight. Ring radius in px by destination, at 1440×900 and 390×844 (`gbr-2dfit.mjs`; "inside" means the ring fits the shorter half-extent, a conservative test because the ring is centred on the canvas):

| destination (host) | a (AU) | 1440×900 | 390×844 |
|---|---|---|---|
| Mercury | 0.39 | 87 px inside | 38 inside |
| Venus | 0.72 | 163 inside | 71 inside |
| Mars (Phobos, Deimos) | 1.52 | 343 inside | 149 inside |
| Bennu | 1.13 | 253 inside | 110 inside |
| Vesta | 2.36 | 531 off | 230 off |
| Ceres | 2.77 | 622 off | 270 off |
| Psyche | 2.92 | 658 off | 285 off |
| Jupiter (Io, Europa, Ganymede, Callisto) | 5.20 | 1,171 off | 507 off |
| Saturn (Titan, Enceladus) | 9.54 | 2,146 off | 930 off |
| Uranus | 19.19 | 4,318 off | 1,871 off |
| Neptune (Triton) | 30.07 | 6,766 off | 2,932 off |
| Pluto | 39.48 | 8,883 off | 3,849 off |

Fifteen of the 21 heliocentric destinations are off the canvas in 2D at 1440×900. (The Moon is Earth-centred and fits.)

### 2.4 The 3D scene

`createHelioScene` builds the Sun, Earth, a destination mesh and ring (Mars at first, `:578`, `:593`), seven context planets (`CONTEXT_PLANET_IDS`, `:600-615`), the moons (`MOON_SYSTEM`, `:653-760`: the Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Iapetus, Triton, each a small untextured coloured sphere on a ring around its parent), Hill spheres and magnetospheres. `applyDestination(id)` (`:616-640`) rebuilds ring and mesh from `DEST_STYLE[id]`. Textures: `static/textures/` holds `2k_<id>.jpg` for Mercury, Venus (atmosphere), Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, the Moon, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton, Phobos, Deimos, Charon; none for Ceres, Vesta, Psyche, Bennu, Arrokoth, Halley or 67P. `fly-scene-host.ts:65-74` passes URLs only for the Sun, Earth, the eight planets and Pluto: the moons' textures exist and are not used on `/fly`.

### 2.5 The HUD rows (FY4)

`.hud-row` (`+page.svelte:5788-5794`): flex, `justify-content: space-between`, `gap: 10px`, `flex-wrap: wrap`, `align-items: baseline`. `.hud-key`: 11 px, letter-spacing 2 px, bold, `flex-shrink: 0`. `.hud-val`: `flex: 1 1 auto`, right-aligned, bold, `overflow-wrap: anywhere` (added on 2026-06-19 to stop a horizontal scrollbar: the comment above it records the operator report). 16 `.hud-row` blocks in the file; `.hud` is fixed at 220 px (the comment `:5776`). Other families: `SpacecraftInfoCard.svelte` `.row` is `display: flex; justify-content: space-between` with no wrap; `/plan`'s `.row` (`plan/+page.svelte:1606-1611`) the same; `LaunchTelemetry.svelte` sets `flex-wrap` at `:478` and `:490` (not read in detail). So the visible orphan-label defect comes from this one rule, in the mission arc's left rail.

### 2.6 What the screenshots and DOM probes showed (dev server, `en-US`, headless Chromium with software GL; paths in §3)

All taken after skipping the opening card, 1440×900 unless stated.
- **FY1 and the Earth/Mars rings in 2D:** `gbr-s2-mars-2d.png` (Mars plan flight): the Earth ring and the Mars ring are thin dark lines you can follow only by looking for them; the stars are almost invisible; the arrival ring sits at the end of the trajectory (left of the Sun) while the live Mars disc is lower left, so the two are not the same spot until the flight ends.
- **A Jupiter flight in 2D** (`gbr-s2-jupiter-2d.png`): the rings are Earth's and Mars's; the arc leaves the canvas at the lower right as a faint dashed line; there is no Jupiter, no ring, no label: the user cannot see where the ship is going. **Pluto** (`gbr-s2-pluto-2d.png`) is the same, with the dashed line leaving at the top and at the right. §2.3 gave the pixel arithmetic.
- **The Moon in 2D** (`gbr-s2-moon-2d.png`): Earth-centred; the Moon's orbit ring is a hairline you can hardly see (the same brightness problem, so FY1 reaches the cislunar branch too); the trajectory, the Moon and Earth are readable.
- **Europa** (`gbr-s2-europa-2d.png`) shows the ORRERY DEMO (G1 Decision 4), so no moon-destination flight could be shown.
- **FY4, measured:** on every flight, at 1440×900, two HUD rows have their value below the label: "TRAJECTORY" with "Heliocentric Hohmann" (or "Heliocentric flyby", "Cislunar transfer") alone on the next line, and "FROM EARTH" with "26 M km · 1.4 l-min" alone on the next line (`hudWrapped` in `gbr-report.json`: those same two rows for Mars, Jupiter, Moon, Curiosity, the demo; `gbr-s2-mars-2d.png`, `gbr-s2-jupiter-2d.png`, `gbr-s2-moon-2d.png` show them: the label sits on its own line with the value right-aligned beneath). The other seven or more rows of the group do not wrap. The wrapping rows are the ones whose value is longer than the room beside the label; "FROM EARTH" has an info chip inside its label, which makes the label wider.
- **3D** (`gbr-s2-jupiter-3d.png`): the helio scene shows the Sun, the planets' rings (blue, yellow, red, orange: identity colours at about 0.6 opacity, clearly visible), the trajectory and its phase markers; no Jupiter in frame at MET 12 days. The 3D is not "too dark" the way the 2D is.

### 2.7 Tests that touch the area

`tests/e2e/fly.spec.ts`, `fly-render-validation.spec.ts` (renders and states per mission), `fly-cislunar.spec.ts`, `fly-no-cislunar.spec.ts`, `type-floor.spec.ts` (text floor on the listed canvases), `a11y.spec.ts`, `fly-mount-perf.spec.ts`; unit: `fly-scene-constants.test.ts`, `fly-frame-*.test.ts`, `pick-closest-2d.test.ts`. None checks what the 2D canvas draws for a destination other than Mars, the ring contrast, the scale, or that a HUD value stays beside its label.

## 3. Screenshot list (before the build and again after)

Desktop 1440×900, phone 390×844, landscape 844×390; `en-US`, plus `de` (long German values in the HUD) and `ar` (right-to-left HUD). Taken for this brief, before (scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`, files prefixed `gbr-`, not in the repo): `gbr-s2-mars-2d.png`, `gbr-s2-jupiter-2d.png`, `gbr-s2-pluto-2d.png`, `gbr-s2-moon-2d.png`, `gbr-s2-europa-2d.png`, `gbr-s2-mars-3d.png`, `gbr-s2-jupiter-3d.png`, `gbr-s2-moon-3d.png`, `gbr-s2-pluto-3d.png`, `gbr-s2-europa-3d.png`, `gbr-s2-mars-phone-3d.png`, `gbr-s2-mars-phone-2d.png` (a touch-emulated 390×844; the HUD columns are hidden on a phone, so the HUD wrap probe does not apply there); the first-run shots `gbr-fly-*` were taken with the opening card still up and are not useful for the 2D view. Probe results: `gbr-report.json`, `gbr-shots2.json`. After the build: the same URLs in 3D and 2D for Mars, Jupiter, Moon, Europa, Pluto and Ceres, a Voyager 2 mission (grand tour, in 2D), and a before/after pair of the left HUD with a long vehicle name ("Sputnik 8K71PS (R-7 Semyorka derivative)", the 2026-06-19 case).

## 4. Proposal

### 4.1 The 2D view you can see (FY1)

- Ring stroke `rgba(255,255,255,0.45)` at 1.25 px; the Earth and destination rings the same, so they read as orbits, not as bodies; the identity colour (`#4b9cd3` for Earth, `DESTINATION_LABEL_COLORS[id]` for the destination) stays on the live body, its halo and its label.
- Stars: alpha `0.15 + (i % 5) * 0.09` (0.15 to 0.51), radius unchanged.
- Future arcs: `rgba(80,112,255,0.45)` and `rgba(153,102,255,0.45)`, dash unchanged; the flown arc unchanged.
- Labels 9 px to 11 px (the floor rule, `type-floor.spec.ts` gets the canvas added to its measured set), at the existing `rgba(255,255,255,0.85)`.
All values go in one const object at the top of `fly-frame-runner.ts`, with a unit test that composites each over `#04040c` and asserts ≥ 3:1 for rings and arcs and ≥ 2:1 for stars (the table above is the test's expected shape).

### 4.2 A scale that fits the flight (FY1, the destination)

A pure `fitScale2d(destinationId | trajectory extent, W, H)` in `src/lib/fly/fly-2d-scale.ts`: the scale that puts the outermost of {destination orbit semi-major axis, the farthest trajectory point} at 85 % of the shorter half-extent, never below the 1.5 AU fit (so a Venus trip does not zoom in on the Sun), eased over about 0.8 s when the target changes (the `cis2dScale` easing in the runner is the pattern). A readout bottom-left: "1 AU = N px" drawn as a short bar, so the compression is honest (Decision 11). For Pluto the fit is about 10 px/AU: Earth's ring has a 10 px radius; the inner planets are dots by the Sun, which is the true picture.

### 4.3 The destination body (the slice row)

In the heliocentric branch: `destId = bridge.activeDestination`; ring `orbitPath(destId, 180)`, live position `destinationPos(simDay, destId)` (the arrival anchor then sits where the destination will be, which is what the existing anchor already encodes: the last outbound point), disc radius from `DEST_STYLE[destId].size` clamped to 3 to 9 px, halo and label in `DESTINATION_LABEL_COLORS[destId]`, label text `destinationLabel(destId)` (14 locales exist). For a moon destination the host is the active destination and a second label, the moon's name, sits beside it ("Europa"); a moon flight is drawn as the host with a small satellite dot on a short ring. A flight with `sunTarget` (Parker, Solar Orbiter) keeps its own handling (the existing comment says the scene keeps Mars only as a stand-in; there the ring is omitted).

### 4.4 The 3D parts (the slice row)

`fly-scene-host.ts` passes the nine moon texture URLs (`2k_<id>.jpg`, all present); `MOON_SYSTEM` entries take an optional map and, when the plan flight targets one, `applyDestination` highlights it (a ring tint in `#889fe7`, the label). Ceres, Vesta, Psyche and Bennu keep `DEST_STYLE`'s coloured spheres; no asset is added (Decision 13).

### 4.5 HUD rows as a grid (FY4)

The left rail groups are `aside` blocks of `.hud-row`s. Replace the flex row with a grid per group: `.hud-group { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 10px; row-gap: 3px }` and `.hud-row { display: contents }`, so every label in a group shares one column and every value starts at the same x. The value is left-aligned and wraps inside its own column (`overflow-wrap: anywhere` stays for the long single token). The remainder of a long value therefore starts in the label's row and continues underneath the value, aligned with it: "start in the label's row and wrap only the remainder". The `.hud` width (220 px) is unchanged; the label column is as wide as the widest label in the group (the 11 px, 2 px-letter-spaced labels are 6 to 10 characters: about 70 to 110 px), so the value column is 100 to 140 px: a long vehicle name takes two or three lines, as it does now but beside its label. The same rule is applied to the info card and any other label/value block in `/fly` (Decision 14), and a repo-wide search for the old pattern (`flex-wrap: wrap` on a label/value row) is the definition of done (§11).

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on G2 |
|---|---|
| A1/Q2 (type scale) | The 11 px floor applies to the 2D canvas labels (listed in `TA.md`); the 9 px labels in `draw2d` move to 11. |
| A3 (accent, UXD-001) | `#5070ff` stays the flown arc; `#889fe7` is the state colour for the highlighted moon ring; the planet identity colours stay `a3-keep` (palette review L4) but leave the rings. L1 (the /fly HUD colour assessment) is a separate item and not part of G2; HUD values stay as they are. |
| A4 (one chip) | The 2D toggle is already a chip; nothing here adds a control. |
| Teal palette work (another agent, now) | G2 adds no teal and no cyan; `DESTINATION_LABEL_COLORS.uranus` is `#7de8e8` (cyan) with the `a3-keep` marker: it would draw Uranus's body and label in cyan. Whether that stays is the palette review's call, noted here so G2 does not decide it silently (§13). |
| UXD-004 (one OutputPass) | The 2D canvas has no composer; the contrast numbers are plain canvas composites. 3D is unchanged. |
| G1 | The moon destinations reach `/fly` (G1 Decision 4); G2 draws them. G1 and G2 both edit `fly/+page.svelte`. |
| F series | Not read. |

Plan ideas now outdated: "brighter 2D rings and stars" (the numbers say how much and which: Decision 10); "the destination body drawn (today Earth and Mars are hard-coded)" (2D only).

## 6. i18n impact (14 locales)

None required: labels come from existing keys (`nav_earth`, `plan_destination_*`, `nav_moon`). If Decision 11 keeps the scale readout with words ("1 AU ="), one new key (`fly_2d_scale_label`): 14 strings, by hand; the unit "AU" follows the glossary (check `docs/guides/i18n-style-guide.md` for AU in each locale).

## 7. Data changes

None. No new texture or image (Decision 13 keeps four bodies stylised).

## 8. Tests to add or change

**Unit (vitest):**
- `fly-frame-runner` 2D constants: `fly-2d-style.test.ts` (new): each ring, arc and star colour composited over `#04040c` meets 3:1 / 2:1.
- `src/lib/fly/fly-2d-scale.test.ts` (new): for all 21 heliocentric destination ids at 1440×900, 390×844 and 844×390 the destination orbit radius is ≤ 85 % of the shorter half-extent; the 1.5 AU floor; easing reaches the target.
- `fly-scene-constants.test.ts`: every `DestinationId` has a label colour and a `DEST_STYLE` entry (extends what exists).
- `fly-frame-selectors.test.ts` or a new test: the 2D draw list for a Jupiter flight contains Jupiter's ring and not Mars's.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `fly-visuals.spec.ts`: for Mars, Jupiter, Moon, Europa, Pluto plan flights in 2D the page has a canvas that is not blank (a pixel sample over the ring radius is brighter than the background by a set margin), and `data-` readouts on the render-state element carry the 2D destination id.
2. Same spec: HUD alignment: for every `.hud-row` on a mission with a long vehicle name, the value's top is within one line of the key's top (no value starts below its label), at 1440, 390 and 844 widths; and the label x is identical across the rows of a group.
3. `type-floor.spec.ts`: the 2D canvas label size is part of the measured set.
4. `a11y.spec.ts`: `/fly` stays at 0 serious.
5. `fly-render-validation.spec.ts` keeps passing (states per mission unchanged).

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-fly-2d-visibility-destination-body-and-hud-grid.md`; take the next free at build time: 037 is the last at HEAD): the contrast floor, the fit-to-destination scale, the destination body, the HUD grid; row in `docs/uxs/decisions/README.md`; row G2 in `docs/uxs/CHANGE-INVENTORY.md` (line 93); close FY1, FY4.
- `docs/concept/05_Design_System.md` §5.12 (HUD, mission arc): the label/value grid rule and the 2D canvas's line and star values.
- `docs/uxs/UXS-003.md` ("HUD panels (2D and 3D)", "Spacecraft icon", tokens): the 2D colours and the destination body; `docs/uxs/IA.md` if the HUD width rule is stated there.
- `docs/adr/TA.md` Scene 2 (`/fly` heliocentric) paragraph and the body-wiring checklist (items 5 to 10 list per-body constants; add "2D draws the active destination from `orbitPath` and `DESTINATION_LABEL_COLORS`"); the type-scale paragraph (the 2D canvas labels).
- `src/lib/three/README.md` (the moon textures on `/fly`), `src/lib/fly/` README row for `fly-2d-scale.ts`.

## 10. Phased plan

1. **G2a 2D values and the destination body:** constants + contrast test red first, ring and star values, the active destination's ring, body and label, moon destinations as host plus named target; shots Mars, Jupiter, Moon.
2. **G2b the fit scale:** `fitScale2d`, easing, the scale readout; the all-destinations unit test; shots Pluto, Ceres, Voyager 2.
3. **G2c the HUD grid:** the group grid, the info card, the repo-wide search, the alignment e2e; shots with a long vehicle name, `de` and `ar`.
4. **G2d 3D moons:** the texture URLs and the highlighted moon; docs of §9; `npm run preflight` once before a push.

## 11. Acceptance checks

- Every ring and arc in the 2D view is at least 3:1 over the background, stars 2:1 (unit test); Jupiter and Pluto flights show their own ring and body in 2D, inside the canvas, at 1440×900, 390×844 and 844×390.
- A flight to Europa shows Jupiter and a named Europa; no flight shows a Mars ring unless Mars is the destination or a context planet.
- No HUD value starts below its label on any route in the repo: the search `flex-wrap: wrap` on a `justify-content: space-between` row returns only the documented allow-list; the e2e passes on three projects.
- The nine moon textures load on `/fly` (no 404 in the e2e console check); no new asset is added.
- Docs of §9 updated; the inventory row G2 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the three G briefs)

10. **How bright, and in what colour.** **(a) Rings in neutral white at 0.45 alpha / 1.25 px, stars 0.15 to 0.51, future arcs 0.45; the planet colour stays on the live body, halo and label** (recommended: every line clears 3:1 (the white rows above); the rings stop carrying an identity colour that the A3 palette review may change; it is one const object); (b) keep the planet-colour rings, raise alpha to 0.75 and width to 1.5 px (Mars's rust is still under 3:1 at 0.7: 2.42:1; keeps today's look); (c) lighten the canvas background instead of the lines (`#04040c` to a dark blue-grey): the 3D view stays darker, so the two views stop matching.
11. **The 2D scale.** **(a) Fit the destination: scale from the destination's orbit or the trajectory's extent, eased on a change, floor at 1.5 AU, plus a "1 AU = N px" readout** (recommended: 15 of 21 destinations are off the canvas today; the readout keeps the compression honest); (b) keep the fixed scale and draw an off-canvas arrow with the destination's name at the edge (cheap, but shows no trajectory); (c) pan and zoom controls (the most flexible, a new interaction on a view whose point is a glance).
12. **What the 2D view draws beside Earth.** **(a) The active destination only (ring, live body, label, arrival anchor); for the nine moon destinations the host plus the moon's name; a grand-tour mission keeps drawing only its final destination** (recommended: the plan's ask; the flight's own flybys stay in 3D and the milestone bar); (b) also the context planets the trajectory visits (a Voyager 2 view shows four rings; more information, more clutter on a 390 px phone); (c) the destination label only, no body.
13. **3D bodies with and without textures.** **(a) Wire the nine existing moon textures on `/fly` and highlight the targeted moon; keep Ceres, Vesta, Psyche and Bennu as stylised spheres and add no asset** (recommended: the free route; the textures are in the repo and unused; nothing in the repo is a photograph of those four); (b) leave the moons untextured (smallest change; Europa stays a grey ball); (c) source and credit images for the four small bodies (new assets: a provenance row each in `/credits`, plan item for a later pass).
14. **HUD layout and its reach.** **(a) A two-column grid per group (label column shared, value left-aligned, wrapping only inside its column), applied to every label/value block in `/fly` (the left rail, the info card, the flight-params and the launch telemetry rows) and checked by a repo-wide search** (recommended: "decisions apply project-wide"; one rule, not 16 patched rows); (b) the same grid on the 16 `.hud-row`s only; (c) inline flow: the value starts after the label on the same line and the rest wraps under the label (literal reading of the operator's sentence, but the left edge of the values is ragged: "no orphan labels" is met, "tidy, aligned" is not).

## 13. NOT VERIFIED

- NV1 Browser results (§2.6) are one headless Chromium with software GL at one moment; the 2D canvas contents were judged from the screenshots by eye and from the code, not by pixel measurement beyond the composites in §2.1.
- NV2 The contrast ratios are composites of the stroke colour at its alpha over the flat background, computed by hand-written arithmetic (`gbr-contrast.mjs`); a 1 px anti-aliased line renders lighter than its nominal colour, so the real contrast is a little lower. The "white at .45, about 4.5" row is interpolated, not computed.
- NV3 The label column width of 70 to 110 px is arithmetic from 6 to 10 characters at 11 px with 2 px letter-spacing in a monospace face; the real widths in `de`, `ru`, `hi` and `ar` were not measured, and the value column may be narrower than 100 px for the longest labels (Decision 14).
- NV4 `LaunchTelemetry.svelte`'s two `flex-wrap` rules (`:478`, `:490`) and the other `/fly` HUD blocks (flight params `:4083+`, the systems group, the finale and epilogue captions) were not read for label/value rows; Decision 14's repo-wide search will list them.
- NV5 Whether `DESTINATION_LABEL_COLORS.uranus` (`#7de8e8`, cyan, `a3-keep`) is acceptable under the no-cyan rule for a planet identity colour was not decided; the other agent's palette work was not read.
- NV6 The fit scale's behaviour for round trips (`retPts`), free-return scenarios (the ORRERY DEMO) and `sunTarget` missions was reasoned about, not run; the trajectory extent rule needs the real `outPts` bounds.
- NV7 The Moon (cislunar 2D) branch: its orbit ring looks as faint as the others on `gbr-s2-moon-2d.png` (read by eye); its stroke colour and alpha were not read in `draw2d` (`:660-710`) and are not in the contrast table; the new constants must cover it.
- NV8 The phone's 2D view was not examined: on a touch phone the left HUD is not shown (a mini HUD replaces it), so the FY4 wrap probe does not describe it, and the 2D toggle in `gbr-s2-mars-phone-2d.png` showed a 3D view after the click (the phone has its own toggle, `fly-view-toggle-mobile`). FY4's HUD grid therefore applies to desktop and landscape widths where the rail is visible; which widths show it was not enumerated.
- NV9 No test and no preflight was run: this brief changed no code.
