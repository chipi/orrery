# Slice C3 brief — HUD fixes (E4, SS1, SS2, SS3)

Read-only brief, written at HEAD `481b5fa2a44` on `tech-debt/0.9.9` (A1 to A6 landed; the scale INDEX on all eight scales landed; B1, B2, B3 approved and not built; C1 and C2 briefed in parallel). Method: `git grep` and reading from the repo root; every `file:line` was read at `481b5fa2a44`. Counts and arithmetic come from scripts run as files in the session scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/` (`c3-picker.py`, `c3-check.py`). No build, no dev server, no browser, no test run: every width and overflow figure is arithmetic (§13). The check of §6 was run once: `python3 c3-check.py` prints `C3-CHECK violations: 39`.

## 0. The point list

| ID | Operator text (plan lines 143, 155 to 157) | State at HEAD |
|---|---|---|
| E4 | The reference-distance ruler (lower right) must keep a fixed width at every zoom; the ruler value inside adjusts. | The lower-right box is `ScaleStrip` (`src/routes/explore/ScaleStrip.svelte`). Its bar is a 1/2/5 × 10ⁿ round length drawn at whatever pixel width that length has: `niceScaleBar(auPerPixel, 130)` returns `px = au / auPerPixel` (`scale-readout.ts:106–115`), so the width moves between 52 and 130 px as you zoom (arithmetic from the 1/2/5 steps) and the label stays round. The CSS clamp `Math.min(barPx, 220)` (`ScaleStrip.svelte:64`) never fires (maximum 130). The box has `max-width: 260px` and no width (`:106–122`), so it resizes with its text (unit ladder, readout, bar label, context line). The two Worlds bars do the same with their own code (§2.1). |
| SS1 | Why is Vega in a rounded border when I open Explore? | A 224 × 56 canvas sprite with a rounded border, text `← Vega`, drawn at the inbound end of ʻOumuamua's hyperbola with depth test off (`explore-solar-scene.ts:1201–1218`, `iconic-trajectory.ts:369–405`). It is visible whenever the ISM chip is on (default on) and draws over everything, including the right panel's edge. Nothing explains it. The text is the raw data string `inbound_radiant: "Vega"` (`static/data/small-bodies.json:961`), not localised. |
| SS2 | The solar-system picker on the right is cut off by the screen edge. | At the solar system the scale navigator is flush right (`ScaleNav.svelte:80–83`, `right: 8px`) and the picker's ladder is anchored `left: 0` under its chip (`ExploreScalePicker.svelte:139–152`), so it extends rightwards past the chip's left edge. Estimated overflow past the edge, with stated assumptions: 6 to 72 px in all 14 locales (`c3-picker.py`: `ru` 72, `ar` 46, `hi` 39, `en-US` 33, `de` 13). The cut-off does not depend on the window width: the navigator is flush right at every width. |
| SS3 | Planet-scales popup is crowded, labels not aligned; find a better way. | The popup is the REFERENCES overlay (`explore_sizes_toggle`, opened by `sizes-toggle`, `TimeDock.svelte:44–47`): `SizesOverlay.svelte` wrapping the canvas `SizesCanvas.svelte`. Eight planets on a baseline at true relative size, in size order; the four inner planets are 2 to 6 px wide, so their two-line labels (name, diameter) stagger onto up to three extra rows with leader lines (`SizesCanvas.svelte:76–134, 195–211`). A1's 11 px floor made the labels wider and added rows (comment `SizesOverlay.svelte:75–78`). Names are literal English (`:18–25`: `name: 'Jupiter'` …) and the diameters are literal en-US strings (`km: '69,911 km'`), so the popup is English in all 14 locales. |

Slice row (plan line 350): fixed-width scale bar with the value changing; Vega pill only on hover/selection; level picker opens leftward at the right edge; planet-scales overlay redrawn readable. Done when: shots at three zooms; picker fully on screen at 1280 px.

## 0a. Decisions that bind C3, and what is open

| # | Source | Text |
|---|---|---|
| D1 | A1 / UXD-002 | 11 px floor; canvases that are UI meet it; `SizesCanvas` is on the floor list (`AGENTS.md:754`). |
| D2 | A4 / A5 (operator 2026-11-12) | One chip, flat HUD row, RESET VIEW always rendered and disabled when inert so nothing shifts; never add icons nobody asked for. |
| D3 | A3 / UXD-001 | Tokens for UI colours; planet identity colours stay (`a3-keep`, palette review L4). |
| D4 | Memory "Decisions apply project-wide", "Numbers in all locales" | The fixed-width rule applies to every scale bar in the app; names and numbers in 14 locales. |
| D5 | Plan "Orbit ruler (Explore and Worlds, global)" | The orbit ruler (lower left, regimes) is C4. Plan E4 calls the lower-right box a "ruler" too; this brief names it the scale bar to avoid the clash. |
| Open | none recorded | Q1 to Q8 below. |

## 1. Cascade: what earlier slices change in C3, and which C-row ideas are outdated

| Earlier slice | What it changes in C3's tactics | Outdated in the plan row |
|---|---|---|
| **A1 type scale** | `SizesCanvas` draws 11 px text (on the floor list). Moving the labels to DOM uses `--size-label` and `--size-meta` tokens and lets the labels wrap and be read by assistive technology. `ScaleStrip` text is on tokens already. | The plan row says "readable"; the floor made it more crowded, not less (§0 SS3). |
| **A3 tokens** | Planet colours in `SIZES` are identity colours; Uranus `#7de8e8` is `a3-keep` (`SizesCanvas.svelte:20`). They stay as the legend swatches. The Vega pill is drawn in the body's data colour (`#ff8866`). | Nothing. |
| **A4 chip, A5 flat row** | The picker and the reset are `Chip`s already (`ScaleNav.svelte:34–59`). The A5 follow-up says a HUD action that mounts and unmounts becomes always rendered: the scale navigator's reset still mounts and unmounts (`{#if showReset}`, `ScaleNav.svelte:55`; `scaleResetVisible` `+page.svelte:675–680`), so the row shifts. C3 folds it in (Q7). | The plan row has no reset. Added. |
| **A6 nav (52 px)** | The picker sits at `top: 8px` of the scene, under the nav; unaffected. | Nothing. |
| **Scale INDEX (UXD-017)** | The INDEX handle is a left-edge tab at mid-height; the navigator is top-left at non-solar scales: they do not meet. No change. | Nothing. |
| **B1 panel shell** | The panel is a 400 px right drawer with its own bar. `ScaleStrip` is `z-index: 6` at `right: 12px` and has no `beside-panel` rule (the Worlds bar does: `SurfaceScene.svelte:5799`): with a panel open on desktop the strip is under the panel. Not changed here; see NV7. | Nothing. |
| **B2, B3** | None. | Nothing. |
| **C1 select = focus** | C1 adds four reset functions for the outer scales and `selectedSmallBodyId` to the bridge. C3 needs both: the reset slot is only useful once the functions exist, and the Vega label shows on a selected ʻOumuamua through that field. Order proposed: C1 first (Q8). | Nothing. |
| **C2 readability** | Files do not overlap (C2: `src/lib/universe/*-scene.ts`, `explore-render-stack.ts`, the ctx2 text). The Vega label is a sprite label: C2's 12 px rule does not cover it (it is not a pin label); C3 hides it. | Nothing. |
| **C4 orbit ruler** | Lower left. The "one bottom-left stack" of C4 does not include the scale bar (lower right). | Nothing. |
| **C8 explore navigation (E7, E10; decision D4)** | C8 rebuilds the breadcrumb and decision D4 can make it the way through the levels; the picker look can change. C3 keeps its fix small (an alignment prop) so C8 inherits it. | "Level picker opens leftward" survives only if the picker survives C8. |

Adjacent items. **Fold in:** the Worlds bars (two copies, same defect: §2.1); the literal English names and numbers in the overlay; the Reset slot; the five other direction pills (§2.4); the UXS-016 line that promises a kpc bar the code does not draw. **Leave:** the strip's content (ladder, readout, context line); the orbit ruler (C4); the schematic note text; the REFERENCES chip in `TimeDock` (A4).

## 2. Inventory

### 2.1 Three scale bars, three implementations

| Where | Code | Rule | Width range (arithmetic) | Unit text |
|---|---|---|---|---|
| Explore (solar system, neighbourhood) | host `updateScaleHud` `:1702–1733` → bridge `scaleBarPx`, `scaleBarLabel` → `ScaleStrip.svelte:62–67` | 1/2/5 × 10ⁿ near 130 px (`niceScaleBar`, `scale-readout.ts:106–115`) | 52 to 130 px | `distanceWithUnit` (localised AU, ly, pc, km) |
| Worlds 3D (`/moon /mars /venus /earth`) | `SurfaceScene.svelte:4880–4920` → `:5798–5803` | 1/2/5/10 × 10ⁿ near 110 px (thresholds 1.5, 3.5, 7.5) | 63 to 157 px | literal `km`, `m` |
| Worlds flat patch | `SurfaceFlatPatch.svelte:893–910, 1007` | value list 0.001 to 500 km, largest at or below 120 px (64 px on a phone) | 60 to 120 px (32 to 64 on a phone) | literal `km`, `m` |

Tests that hold them: `scale-readout.test.ts:59–80` (the 1/2/5 rule, to be rewritten); `footer-dock.spec.ts` treats `.scale-strip` (`:36, :146`) and `.distance-scale` (`:196`) as boxes that must not intersect other HUD parts at eight window sizes.

### 2.2 The strip

`ScaleStrip.svelte`: solar system and neighbourhood show the unit ladder (km, AU, ly, pc) and, with `barPx > 0`, the bar and its label; the neighbourhood adds the readout and the light-time line; the six schematic scales show a note and a Learn-more link instead (no bar: `:70–100`). `UXS-016.md:50` promises "a kpc scale bar" at the Milky Way; the code draws none (`explore_mw_scale_note` is text only). Doc and code disagree (AGENTS.md rule 28).

### 2.3 The picker

`ExploreScalePicker.svelte`: one `Chip` toggle (`:89–103`) and a `nav.rail` popover of eight rung chips (`:105–120`), `position: absolute; top: calc(100% + 6px); left: 0` (`:139–152`). `ScaleNav` flips to `right: 8px` at the solar system because the top-left holds the HUD row (`ScaleNav.svelte:62–83`). The picker is used only by `ScaleNav` (`git grep`).

### 2.4 Direction pills

`buildDirectionLabelSprite` (`iconic-trajectory.ts:369–405`) has two callers: ʻOumuamua's `← Vega` (`explore-solar-scene.ts:1214`, always visible with the ISM layer) and the five outbound craft's `→ <star>` pill (`iconic-trajectory.ts:560`, visible with the PATHS layer; its comment says "always visible (dim) … rather than highlight-gated", `:538–542`). Six pills, no hover or selection logic. The trajectory handle already has `setHighlight(highlighted)` (`:576–593`), driven by `iconic.state.hoveredId ?? selectedId` (hover hit, host `:2154–2164`); the small bodies have hover and click hits (`hoverTargets`, host `:2062–2067`, hit `:2165`).

### 2.5 The REFERENCES overlay

Card 640 px max (`SizesOverlay.svelte:34–45`); canvas wrapper `aspect-ratio: 16/7`, minimum 230 px (`:68–82`). Canvas draws header, bodies, staggered labels, leader lines, source line (`SizesCanvas.svelte:60–226`). `highlightId` comes from the open planet panel. Close and backdrop are private buttons on the A4 allow-list (`chip.spec.ts:333–334`). The 2D explore view already localises planet names through `PLANET_NAME_2D` (`lab_body_*`, host `:88–113`); the overlay does not use it.

## 3. Findings that shape the proposal

1. **E4 is a rule, and it is broken three times.** The rule asks for a fixed-length bar with a variable value; three files draw a variable-length bar with a round value. One module serves all three.
2. **The overflow has one cause**: a left-anchored ladder under a right-flush chip. It is independent of the window width, so "at 1280 px" in the done-when line proves less than "at every width and every locale".
3. **The Vega pill is the first of six**: the same builder, the same missing visibility rule.
4. **The overlay's crowding comes from putting labels next to bodies that are 2 px wide.** Better staggering does not fix it; moving the labels out of the canvas does.
5. **The overlay is English in 14 locales**, a defect found because the labels are being rewritten anyway.
6. **A doc promises a bar the code never drew** (UXS-016).

## 4. Proposal

### 4.1 One fixed-width bar (E4, Q1 to Q3)

New `src/lib/universe/scale-bar.ts` (pure, tested): `fixedScaleBar(unitsPerPx, widthPx)` returns `{ units, widthPx }` with `units = unitsPerPx * widthPx`; `scaleBarWidth(viewW)` returns 120 px, or 64 px under 600 px wide (the flat patch's existing phone value); `formatBarValue(units)` keeps three significant digits (`1.37`, `13.7`, `137`) and the unit comes from the existing ladders (`describeDistanceAu` for Explore, km and m for Worlds through `distanceWithUnit`, `mp_flight_unit_km` and `unit_m_value`, both in 14 locales: no new key). New `src/lib/components/ScaleBar.svelte` (`widthPx` constant, `label`): the bar, 3 px high, end ticks, the label to its right in `--size-label` at 70 % white. `ScaleStrip`, `SurfaceScene` and `SurfaceFlatPatch` use it and delete their own rounding. The strip box gets a fixed `inline-size` (232 px; 190 px under 768 px, its present phone maximum), so the box does not resize with the text. `niceScaleBar` and its three test cases are removed; `scale-readout.test.ts` tests `fixedScaleBar`. The schematic scales keep the note and draw no bar (Q3).

### 4.2 Picker (SS2, Q4)

`ExploreScalePicker` gets `align: 'start' | 'end'`; `ScaleNav` passes `end` when `atSolar`. The ladder uses logical offsets (`inset-inline-start: 0` for start, `inset-inline-end: 0` for end) and `max-inline-size: calc(100vw - 16px)`, so it cannot pass the edge in either direction (RTL, long labels: `ru` 31 characters). The navigator's reset is rendered always in its slot, disabled when inert (A4 disabled look), at all eight scales (Q7).

### 4.3 Direction pills (SS1, Q5)

Both callers set `label.visible = false`. ʻOumuamua's pill shows while the small body is hovered or selected (host hover hit `smallBodyId === 'oumuamua'`, C1's `bridge.selectedSmallBodyId`); the five heading pills show in `setHighlight(true)`. The arrows stay (they are lines, not pills). The star name goes through the same name source as the star panels (`Vega` is a named star), not the raw data string.

### 4.4 REFERENCES overlay (SS3, Q6)

`SizesCanvas` draws bodies only: true relative sizes, common baseline, size order, no labels, no leader lines, no header, no source line. `SizesOverlay` gets a DOM block under the canvas: a heading (`sizes_header`), a grid of eight cells in the same left-to-right order (`grid-template-columns: repeat(8, 1fr)` on a 640 px card, 4 × 2 under 560 px), each cell: a swatch dot in the planet's colour, the localised name (`PLANET_NAME_2D`, moved to `$lib/explore/format.ts` so both use it), the diameter formatted with the locale and `distanceWithUnit(…, 'km')`; the cell of `highlightId` is marked; hover or focus on a cell highlights its body in the canvas (prop `hoverId`). The source line (`sizes_source`) goes under the grid. Cells share one top edge: aligned by construction. The close and backdrop stay as they are.

## 5. Replacement map

| Old | New |
|---|---|
| `niceScaleBar` (`scale-readout.ts:106–115`), `updateScaleHud` bar branch (host `:1726–1733`) | `fixedScaleBar` + `ScaleBar.svelte` |
| Worlds `mantissa` block (`SurfaceScene.svelte:4892–4908`), flat-patch `niceValues` (`SurfaceFlatPatch.svelte:899–908`) | the same |
| `style="width:{Math.round(Math.min(barPx, 220))}px"` | constant width from `scaleBarWidth` |
| `.scale-strip { max-width: 260px }` | `inline-size` 232 / 190 px |
| `.rail { left: 0 }` | `align` prop, logical offsets |
| `{#if showReset}` in `ScaleNav` | always rendered, `disabled` |
| `buildDirectionLabelSprite` callers always visible | hidden until hover or selection |
| `SIZES` literals, `ROW_PITCH`, `rowEnd`, leader lines | DOM legend grid |
| `UXS-016.md:50` "a kpc scale bar" | "the schematic note; no bar (not to scale)" |

## 6. Hit list and the check

Baseline at `481b5fa2a44`: **39 violations**. By kind: BAR-COPY 3, BAR-VARIABLE-WIDTH 3, STRIP-WIDTH 1, NO-SHARED-MODULE 1, PICKER-LEFT-ANCHOR 1, VEGA-ALWAYS-ON 1, HEADING-ALWAYS-ON 1, SIZES-ENGLISH 8, SIZES-NUMBER-LITERAL 8, SIZES-STAGGER 7, RESET-SLOT 1, NO-SPEC 1, NO-UXD 1, DOC-MISSING 1, DOC-STALE 1. Run from the repo root: `python3 c3-check.py` or `C3_REV=<sha> python3 c3-check.py`. Allow marker `c3-keep: <why>`. After the slice it prints `C3-CHECK violations: 0`. `HEADING-ALWAYS-ON` assumes Q5 recommended.

```python
#!/usr/bin/env python3
# C3-CHECK — run from the repo root:  python3 c3-check.py          (working tree)
#                                      C3_REV=HEAD python3 c3-check.py   (a commit, via git show)
# Prints each violation as KIND file:line text, then "C3-CHECK violations: N".
# Allow marker: `c3-keep: <why>` on the line or the line above.
import glob
import os
import re
import subprocess
from collections import Counter

REV = os.environ.get('C3_REV')
V = []


def add(kind, f, line, text):
    V.append((kind, f, line, ' '.join(str(text).split())[:96]))


def read(f):
    if REV:
        r = subprocess.run(['git', 'show', f'{REV}:{f}'], capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else None
    return open(f, encoding='utf-8').read() if os.path.exists(f) else None


def scan(f, pattern, kind, why):
    lines = (read(f) or '').splitlines()
    for i, line in enumerate(lines):
        if re.search(pattern, line) and 'c3-keep' not in line and not (i > 0 and 'c3-keep' in lines[i - 1]):
            add(kind, f, i + 1, why + ': ' + line.strip())


# E4: one fixed-width bar, one implementation, on Explore and on both Worlds views
scan('src/lib/three/explore-scene-host.ts', r'niceScaleBar\(', 'BAR-COPY', 'Explore bar picks a 1/2/5 x 10^n length (width 52-130 px)')
scan('src/lib/surface-scene/SurfaceScene.svelte', r'const mantissa|let mantissa', 'BAR-COPY', 'Worlds bar picks its own 1/2/5/10 length (width 63-157 px)')
scan('src/lib/surface-scene/SurfaceFlatPatch.svelte', r'const niceValues', 'BAR-COPY', 'flat-patch bar picks from a value list (width 60-120 px)')
scan('src/routes/explore/ScaleStrip.svelte', r'Math\.min\(barPx, 220\)', 'BAR-VARIABLE-WIDTH', 'bar width follows the zoom')
scan('src/lib/surface-scene/SurfaceScene.svelte', r'style="width: \{scaleBar\.widthPx\}px"', 'BAR-VARIABLE-WIDTH', 'bar width follows the zoom')
scan('src/lib/surface-scene/SurfaceFlatPatch.svelte', r'style:width="\{scaleBar\.widthPx\}px"', 'BAR-VARIABLE-WIDTH', 'bar width follows the zoom')
strip = read('src/routes/explore/ScaleStrip.svelte') or ''
m = re.search(r'\.scale-strip \{[^}]*\}', strip)
if m and not re.search(r'(?<!max-)(?<!min-)(width|inline-size)\s*:', m.group(0)):
    add('STRIP-WIDTH', 'src/routes/explore/ScaleStrip.svelte', strip[:m.start()].count('\n') + 1, '.scale-strip has max-width only: the box resizes with its text')
if read('src/lib/universe/scale-bar.ts') is None:
    add('NO-SHARED-MODULE', 'src/lib/universe/scale-bar.ts', 1, 'file missing')

# SS2: the ladder must not open past the right screen edge
pk = read('src/lib/components/ExploreScalePicker.svelte') or ''
m = re.search(r'\.rail \{[^}]*\}', pk)
if m and re.search(r'left:\s*0', m.group(0)) and not re.search(r'inset-inline-end|right:\s*0|data-align|align-end|at-solar', pk):
    add('PICKER-LEFT-ANCHOR', 'src/lib/components/ExploreScalePicker.svelte', pk[:m.start()].count('\n') + 1, '.rail is anchored left: 0 and the navigator is flush right at the solar system')

# SS1: a direction label shows only for the object it belongs to, on hover or selection
src = read('src/lib/three/explore-solar-scene.ts') or ''
m = re.search(r'const label = buildDirectionLabelSprite\([^;]*;', src)
if m and not re.search(r'label\.visible = false', src[m.end():m.end() + 400]):
    add('VEGA-ALWAYS-ON', 'src/lib/three/explore-solar-scene.ts', src[:m.start()].count('\n') + 1, 'the Vega pill is visible whenever the ISM chip is on')
src = read('src/lib/three/iconic-trajectory.ts') or ''
m = re.search(r'dirLabel = buildDirectionLabelSprite\([^;]*;', src)
if m and not re.search(r'dirLabel\.visible = false', src[m.end():m.end() + 400]):
    add('HEADING-ALWAYS-ON', 'src/lib/three/iconic-trajectory.ts', src[:m.start()].count('\n') + 1, 'heading pills of the five outbound craft are always on with PATHS')

# SS3: the planet-size overlay: localised names, localised numbers, aligned labels
scan('src/lib/components/SizesCanvas.svelte', r"\{ id: '[a-z]+', name: '", 'SIZES-ENGLISH', 'planet name is a literal English string')
scan('src/lib/components/SizesCanvas.svelte', r"km: '[0-9,]+ km'", 'SIZES-NUMBER-LITERAL', 'diameter is a literal en-US string')
scan('src/lib/components/SizesCanvas.svelte', r'ROW_PITCH|rowEnd', 'SIZES-STAGGER', 'labels stagger onto extra rows with leader lines')

# A5 refinement carried to the scale navigator: Reset view always in its slot
scan('src/routes/explore/ScaleNav.svelte', r'\{#if showReset\}', 'RESET-SLOT', 'Reset view is mounted and unmounted, so the row shifts')

# Docs, tests, decision record
if read('tests/e2e/explore-hud.spec.ts') is None:
    add('NO-SPEC', 'tests/e2e/explore-hud.spec.ts', 1, 'file missing')
if not [p for p in glob.glob('docs/uxs/decisions/UXD-*') if 'scale-bar' in p.lower() or 'hud' in p.lower()]:
    add('NO-UXD', 'docs/uxs/decisions', 1, 'no UXD for the Explore HUD fixes')
if not re.search(r'scale bar', read('AGENTS.md') or '', re.I):
    add('DOC-MISSING', 'AGENTS.md', 1, 'Design System block does not state the fixed-width scale bar')
for i, line in enumerate((read('docs/uxs/UXS-016.md') or '').splitlines(), 1):
    if 'kpc scale bar' in line:
        add('DOC-STALE', 'docs/uxs/UXS-016.md', i, line.strip())

for k, f, l, t in V:
    print(f'{k:22} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in V)))
print(f'C3-CHECK violations: {len(V)}')
```

Known limits: names and patterns, not rendering; `PICKER-LEFT-ANCHOR` passes when the file mentions `inset-inline-end`, `right: 0`, `align-end` or `at-solar` anywhere (the e2e geometry test is the second net); `VEGA-ALWAYS-ON` looks 400 characters past the builder call for `label.visible = false`. It has no tests of its own; the text above was extracted and run: `python3 c3-check.py` → `C3-CHECK violations: 39`.

## 7. Allow-list (not touched, with reason)

- `ScaleStrip` ladder, readout, light-time and context lines, and the schematic note; the orbit ruler (C4).
- `iconic-trajectory` encounter labels (C7), ring and label rules of the pin scenes (C2).
- `sizes-close` and `sizes-backdrop` (A4 allow-list, modal furniture).
- Planet identity colours in `SIZES` (`a3-keep`, palette review L4).
- The REFERENCES chip and the time dock (A4).
- Breadcrumb and picker redesign (C8, decision D4).

## 8. Tests, docs, locales

**Unit:** `src/lib/universe/scale-bar.test.ts` (`fixedScaleBar`: same px at five distances, units scale; `formatBarValue`: 3 significant digits across AU, ly, km, m; `scaleBarWidth` 120 and 64); `scale-readout.test.ts` loses the `niceScaleBar` cases; `format.test.ts` gets `planetName` in 14 locales (no English fallback for the eight planets).
**E2 (new `tests/e2e/explore-hud.spec.ts`, three projects, `--workers=1`):** the strip bar is 120 ± 1 px (64 on mobile-portrait) at four wheel-zoom steps while its label text changes, and the strip box width is constant; the Worlds 3D bar and the flat-patch bar the same; the picker ladder at the solar system lies inside the viewport at 1100, 1280 and 1440 px in `en`, `de`, `ru`, `ar`; the Reset slot keeps its position across a selection at all eight scales; the Vega pill is hidden at load, shown while ʻOumuamua is hovered and while it is selected (dev hook `window.__exploreDirectionLabels`, like the existing `__explore*` hooks), and the five heading pills only while their craft is highlighted; the overlay has eight legend cells with one shared top edge, names differ from English in `de`, the highlighted cell matches the open planet.
**Changed:** `footer-dock.spec.ts` (strip and distance scale boxes, new widths), `explore.spec.ts:238–275` (overlay open and close), `explore-scale-picker.spec.ts`, `chip.spec.ts:259, 333–334, 489`, `explore-science-lens-shells.spec.ts`, `type-floor.spec.ts`, No other spec reads `.distance-scale` (`git grep distance-scale tests` finds `footer-dock.spec.ts` only).
**Visual baselines:** none affected (`visual.spec.ts` holds `explore-hub-grid` for Explore, `:206–208`).
**Docs:** `AGENTS.md` Design System (new line: scale bar, fixed width, one component), `docs/adr/TA.md:388` (HUD: scale bar fixed width) and the /explore v2 section, `docs/uxs/UXS-014.md`, `docs/uxs/UXS-016.md:50`, `src/routes/explore/README.md` (`ScaleStrip`, `SizesOverlay` rows), `src/lib/universe/README.md` (`scale-bar.ts`), `src/lib/components/README.md` (`ScaleBar`), `docs/uxs/CHANGE-INVENTORY.md:43`, a new UXD (next free id; 018 at HEAD unless C1 or C2 take it).
**Locales:** no new key: `mp_flight_unit_km`, `unit_m_value`, `unit_au_value`, `unit_ly_value`, `unit_pc_value`, `sizes_header`, `sizes_source`, `sizes_canvas_label`, `lab_body_*` exist. If Q5 localises the star name, the glossary entry for Vega is checked first (`native-terms.json`). `validate-data` green.

## 9. Screenshots for the operator (dev server per AGENTS "Iterating on UI", not Docker; small shots, 1440 × 900, 1280 × 720 and 390 × 844, before = HEAD)

1. Solar system and neighbourhood: strip at three zooms, before and after (bar width and label). 2. Moon and Mars: the Worlds bar at three zooms; the flat patch. 3. Picker open at the solar system in `en`, `ru`, `ar`, at 1280 and 1100 px; at the Milky Way (left-anchored). 4. First load of `/explore` with the ISM chip on: Vega pill before and after; hover ʻOumuamua; Voyager 1 with PATHS on, heading pill before and after hover. 5. REFERENCES overlay: before and after, with Jupiter and Earth highlighted; `de` and phone. 6. The Reset slot at the Local Sheet (disabled) and the Milky Way (enabled after a selection).

## 10. Order of work

1. C1 lands first (reset functions, `selectedSmallBodyId`). 2. `scale-bar.ts` + `ScaleBar.svelte` + tests (red first); move the three bars. 3. Strip width. 4. Picker alignment and the Reset slot. 5. Direction pills. 6. `planetName` move, overlay rebuild. 7. Docs, UXD, spec, sheets. 8. `c3-check.py` → 0; targeted specs on three projects. `npm run preflight` once before the push. C2 and C3 touch different files and run in either order.

## 11. Decisions and open questions (operator), recommendation first

1. **What "fixed width" means.** Recommended: the bar is 120 px (64 px under 600 px) at every zoom, the value beside it follows (three significant digits, not a round number), and the box is 232 px wide (190 on phones) so it does not resize. Alternatives: keep round values and fix only the box; fix the bar and snap the value to 1/2/5 (the bar then cannot be fixed).
2. **Worlds bars.** Recommended: both follow (one module, one component, same widths), since the rule is project-wide. Alternative: Explore only (Worlds keep three different rules).
3. **Schematic scales (Milky Way to Cosmic web).** Recommended: no bar (they are not to scale), the note stays, `UXS-016.md:50` is corrected. Alternative: draw a labelled schematic bar (it would state a scale the scene does not have).
4. **Picker.** Recommended: the ladder opens leftward when the navigator is flush right, logical offsets, clamped to the viewport. Alternative: put the navigator back at the left at the solar system (the HUD row occupies that corner; needs a HUD rework).
5. **Direction pills.** Recommended: all six hide until their owner is hovered or selected; the arrows stay; the star name is localised through the star-name source. Alternatives: the Vega pill only; hide arrow and pill together.
6. **Overlay redraw.** Recommended: bodies only in the canvas, labels in an aligned DOM grid under it, names and numbers localised, hover link between cell and body. Alternatives: keep the canvas labels with a better stagger (the crowding stays); a vertical list at the side (the card grows taller).
7. **Reset slot.** Recommended: always rendered in the scale navigator, disabled when inert, at all eight scales (A5 refinement); it is only meaningful after C1 adds the four missing resets. Alternative: leave it mounted and unmounted (the row shifts as you select).
8. **Order.** Recommended: C1, then C3 (reset functions, `selectedSmallBodyId`); C2 independent. Alternative: C3 first; the Reset slot is permanently disabled at five scales and the Vega pill shows on hover only until C1 lands.

## 12. Acceptance (definition of done, per the plan)

1. `python3 c3-check.py` prints `C3-CHECK violations: 0`.
2. §8 docs state the rule; UXD written; CHANGE-INVENTORY row C3 updated.
3. `scale-bar.test.ts` and `explore-hud.spec.ts` plus the touched specs green on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; nothing skipped.
4. 14 locales: no new key; the overlay shows localised names in `de`, `ru`, `ar`, `ja`; `validate-data` green.
5. §9 sheets shown to the operator; the lead has read the checker's evidence.

## 13. NOT VERIFIED (what this brief did not check)

- NV1 No browser, build or test run. Bar widths (52 to 130, 63 to 157, 60 to 120 px) are arithmetic from the 1/2/5 steps and the target widths, not measured.
- NV2 The picker overflow (6 to 72 px per locale) assumes 6.6 px per character (11 px Space Mono), 24 px chip padding, 30 px for the dot and caret, 18 px ladder padding and an 8 px gutter; letter spacing and the real chip padding were not measured. The cause (left anchor under a right-flush chip) is read from code; the cut-off the operator saw was not reproduced.
- NV3 RTL: `ScaleNav.at-solar` uses physical `right: 8px` and `ExploreScalePicker` physical `left: 0`; how the HUD row mirrors in `ar` was not read, so `align="end"` in RTL is not confirmed.
- NV4 Which scales show `ScaleStrip`'s bar: `barPx > 0` and the solar and neighbourhood branches were read; the bar at the neighbourhood's smallest and largest zoom (min and max of `camRMin`, `camRMax`) and the unit at each boundary (`describeDistanceAu` thresholds, `:68–84`) were not stepped through.
- NV5 Three significant digits in 14 locales (decimal comma in `de`, `ru`, `fr`; Eastern Arabic digits in `ar`): `fmtScale` uses `toLocaleString(undefined, …)` for large and small values and `String(value)` otherwise (`format.ts:24–27`), which does not follow the page locale for mid-range values. The new formatter must use the page locale; not designed here beyond the requirement.
- NV6 `getInterstellarCraft`, the trajectory data and the `heading.star` strings were not read for localisation; whether `Vega` has a glossary entry in `native-terms.json` was not checked.
- NV7 With a panel open on desktop the Explore strip is under the 400 px drawer (strip `z-index: 6`, `right: 12px`; no `beside-panel` rule): read from CSS, not seen. If the plan's "lower right" ruler is meant to stay visible with a panel open, that is a separate fix (the Worlds bar shifts with `beside-panel`).
- NV8 `SizesCanvas` redraw: the cell widths at 640 px (8 cells of 76 px) and the 4 × 2 wrap are arithmetic; the longest localised name (`ru`, `ar`) in a 76 px cell was not measured.
- NV9 Every e2e spec in §8 was named from `grep`; their assertions were not read for dependence on the unchanged bar widths (only `footer-dock.spec.ts` was read, for the strip and `.distance-scale` boxes).
- NV10 The hover and selection hooks for ʻOumuamua: the hover hit list (host `:2062–2067`, `:2165`) and `iconic.state` hover were read, the small-body hover path to the label was not traced.
- NV11 `c3-check.py` ran at baseline (HEAD and the working tree both print 39); the 39 were not each read beyond the listing.
- NV12 Whether `window.__exploreDirectionLabels` and the other dev hooks exist in production builds (the existing `__explore*` hooks are installed unconditionally at `explore-scene-host.ts:1679–1695`; whether they are gated was not checked).
