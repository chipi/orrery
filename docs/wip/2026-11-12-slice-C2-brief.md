# Slice C2 brief — readability (E2, SN1, MW1, MW2, MW4, MW6)

Read-only brief, written at HEAD `481b5fa2a44` on `tech-debt/0.9.9` (A1 to A6 landed; the scale INDEX on all eight scales landed; B1, B2, B3 approved and not built; C1 briefed in parallel). Method: `git grep` and reading from the repo root; every `file:line` was read at `481b5fa2a44`. Counts and arithmetic come from scripts run as files in the session scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/` (`c2-labelpx.py`, `c2-labels.py`, `c2-nb-labels.py`, `c2-check.py`). No build, no dev server, no browser, no test run: no brightness, contrast, size or overlap below is a measurement (§13). The check of §6 was run once: `python3 c2-check.py` prints `C2-CHECK violations: 98`.

## 0. The point list

| ID | Operator text (plan lines 141, 207, 212, 213, 217, 219) | State at HEAD |
|---|---|---|
| E2 | Scene too dark, not enough contrast; hard to see details on a normal screen in daylight. | Not measured yet. Inputs: ACES at exposure 1.15 (`explore-render-stack.ts:91–92`); uniform Sun light 3.5, hemisphere light 0.08, fill 0.3 (`:110–126`); planet orbit lines `0xc0d0ff` at opacity 0.25 (`explore-solar-scene.ts:178–200`), moon orbits 0.45 (`:475–482`), small-body orbits 0.22 (0.4 for the interstellar visitor, `:1190–1196`), belt particles 0.5 and 0.4 (`:100–150`); scene backgrounds `0x03050c` to `0x05070f`; light-year rings opacity 0.2 (`neighborhood-scene.ts:496–502`); 2D canvas hint at alpha 0.08 and the Planet Nine label at 0.32 (`explore-scene-host.ts:3396, 3609–3611`). **UXD-004 (2026-11-11) already added the OutputPass to the solar, Milky Way and Local Group composers and "answers E2 and FY1 in part"** (`UXD-004:11`); the plan row predates its look. |
| SN1 | Light-year circles are very unclear, hard to see. | Four rings (5, 10, 25, 50 ly) on the galactic plane, one pixel wide (`THREE.LineBasicMaterial`), opacity 0.2, each a different hue (gold, teal `0x6fd8ce`, blue, pale) (`neighborhood-scene.ts:477–511`); labels are the literal text `"N ly"` (`:505`), pinned to the +X edge (`:558–563`), not in the star-label placement pass (`:547–556`). Plan line 436: the "5 LY" label collides with "Barnard's Star". |
| MW1 | Labels overlap each other (same on other surfaces when zooming out further). | The Milky Way shows 11 labels with no placement pass: 4 arms, Sun, Sagittarius A*, 3 headliner globulars, LMC, SMC (`c2-labels.py`; `milky-way-scene.ts:405–418, 426–509, 574–634`). The Local Group shows 4, the Local Sheet 5 (its anchor, the Local Group, is one of its headliners), Virgo 2, Laniakea 3, Cosmic web 3 (`c2-labels.py`), also with no pass. Only the neighbourhood places labels (29 always-on star labels, `c2-nb-labels.py`; pass at `neighborhood-scene.ts:547–556`). |
| MW2 | Hovering a galaxy makes the label jump. | Five scenes copy `g = dist * baseScale * (hi ? 1.5 : 1)` and place the label at `y + g * 0.9 + lh * 0.7`: the hover grows `g`, the label moves up (Milky Way `:771–777`, Local Sheet `:231–237`, Virgo `:239–245`, Laniakea `:235–241`, Cosmic web `:258–264`). The deep-sky glint does the same with `bloom` 2.1 (`deep-sky-scene.ts:221–231`). The Local Group places its label from the steady `glowSize` and does not jump (`:388–395`). |
| MW4 | Some items (Sagittarius, Perseus arm) don't show they are clickable on hover; a click isn't marked clearly: use the Stellar-neighbourhood style (small circle around the point on hover/click). | The arm labels are pickable sprites (`milky-way-scene.ts:405–418`, `armPickables`) that `update()` never touches: `update` walks `pins` only (`:766–784`), `highlight(id)` sets one id (`:759–761`). The host sets `cursor: pointer` on hover (`explore-scene-host.ts:2078–2086`), so the cursor is the only cue. The neighbourhood marker ring is a teal annulus that fades in on hover or selection (`neighborhood-scene.ts:161–183, 527–536`). |
| MW6 | The circle around the Sun is too big, too obvious, doesn't scale with zoom; make it subtle as in Stellar neighbourhood. Same for the Milky Way on Local Group and all levels up. | Seven anchor rings, two behaviours. Milky Way Sun, Local Sheet, Virgo, Laniakea, Cosmic web: screen-constant, `g * 1.6` with `g = dist * baseScale`: 12.3 % of the viewport height for the Sun (111 px at 900), up to 24.6 % for a large anchor (`c2-labelpx.py`). Local Group (the Milky Way pin): world-scaled `glowSize * 2.1` (`local-group-scene.ts:313`), so it does scale with zoom. Neighbourhood Sol: screen-constant, 5.2 % (47 px at 900), gold `0xffcf8f` (`neighborhood-scene.ts:430–438`, `:534`). All the rings of the six outer scenes are the teal annulus `rgba(78,205,196)` marked `a3-keep`. |

Slice row (plan line 349): per-level exposure/ambient lift; light-year rings as fat lines with readable labels; one shared label declutter + steady label offset for the outer levels; hover/selection ring on every pickable; the Sun/Milky Way anchor ring becomes the neighbourhood-style small dot + ring on hover. Done when: shots per level at default zoom, daylight-brightness check.

**Operator, 2026-11-12: every open question of this brief approved as recommended.**

## 0a. Decisions that bind C2, and what is open

| # | Source | Text |
|---|---|---|
| D1 | A1 / UXD-002 (operator 2026-11-11) | Floor 11 px for UI text. "3D sprite labels are slice C2" (`UXD-002:52`; `AGENTS.md:747` "deferred to slice C2"). C2 ends that deferral. |
| D2 | A3 / UXD-001 and memory "No cyan" | No teal or cyan in UI states, rings, dioramas or reference maps; `#889fe7` (`--color-state`) for annotation rings, hover and status states; `a3-keep` was granted to data colours (orbit regimes, agencies, star colours, axes). A ring is not a data colour. |
| D3 | UXD-004 | One OutputPass per composer; the look after it is accepted. C2 does not change global exposure. |
| D4 | Memory "Explore heroes consistent", "Decisions apply project-wide" | One look for a ring, a label and a hover on all eight scales; shots after each slice. |
| D5 | A4 / A5 | Never add an icon nobody asked for. C2 adds none: rings and labels only. |
| Open | none recorded | Q1 to Q8 below. |

## 1. Cascade: what earlier slices change in C2, and which C-row ideas are outdated

| Earlier slice | What it changes in C2's tactics | Outdated in the plan row |
|---|---|---|
| **A1 type scale** | The floor applies to sprite labels from this slice. Arithmetic at fov 55: neighbourhood star labels are 9.7 px of text at a 768 px viewport (8.5 px at 667), below the floor; every other scene label is 11.5 px or more at 667 (`c2-labelpx.py`). The Milky Way labels are 16.8 px at 768 and 19.7 px at 900, larger than any UI text, which is a cause of MW1. | The plan row says nothing about size. Added (Q4). |
| **A3 tokens** | Rings and hover use `#889fe7`. 3D code cannot read CSS variables; the precedent is a literal constant (`surface-markers.ts:45` `HOVER_BLUE = 0x889fe7`). 51 teal-family lines in 7 scene files carry `a3-keep` (`c2-check.py`, TEAL-RING). The NB ring the operator names as the model is itself teal (`neighborhood-scene.ts:169–175`). | The plan says "neighbourhood-style" ring: that style needs its colour changed too (Q2). |
| **A4 / A5 / A6** | No new control. The INDEX handle and chips are DOM; the scene HUD rows are not touched. | Nothing. |
| **Scale INDEX (UXD-017)** | INDEX selection reaches the scene through `highlight(id)` (`+page.svelte:949–986`; host `selectLocalGroup` etc.). A row selected from the INDEX must show the same ring as a canvas click, so the ring state is `hovered ∪ selected`. Rows add no labels. 344 rows make the labelled subset more important: a label is the scene's only name for a pin. | Nothing. |
| **B1, B2, B3** | Panels only. B3's panels name the same objects; no label text changes. | Nothing. |
| **Catalogue layer #658, deep-text** | Names stay data strings; the Local Group, shell and deep-sky names are English today and become translated only after glossary entries (scale-index brief §3.5). Translated names are longer (`Virgo-Superhaufen`, `Местное сверхскопление галактик`, 31 characters): the placement pass must be measured per locale, not assumed from English. | Nothing. |
| **C1 select = focus** | C1 owns the selection state and the camera. A focus moves the focused pin to the centre: its ring must read there. C1's solar selection ring (`selHalo`, pale blue `0xa8c8ff` at 0.45) and C2's rings are one ring look in two renderers (a `Line2` in the solar scene, sprites in the universe scenes): same colour, same screen size. Order proposed: C1 first, C2 second (Q8). | "hover/selection ring on every pickable": split. **Selection ring state in the solar system is C1; the hover ring everywhere and the selection ring at the outer scales is C2.** |
| **C3 HUD fixes** | Files do not overlap (ScaleStrip, picker, SizesCanvas, the Vega label in `explore-solar-scene.ts`). The Vega pill is a label: C3 hides it until hover; C2 does not touch it. | Nothing. |
| **C7 iconic missions** | The milestone boxes have their own stacking pass (`iconic-trajectory.ts:594–649`, vertical push-down, allocates three vectors per call: AGENTS Performance rule 4) and are C7's. C2's module is the pass for pins and rings. | "one shared label declutter" covers the pin scenes only (Q5). |
| **UXD-004 OutputPass** | E2 premise is stale until re-measured (Q1). The solar, Milky Way and Local Group composers got the pass; the Local Sheet, Virgo, Laniakea, Cosmic web and neighbourhood render straight to the canvas with the same renderer tone mapping (`explore-scene-host.ts:4158–4193`). | "per-level exposure lift" is outdated as a first step: measure first, lift elements, not exposure. |

Adjacent items. **Fold in:** the deep-sky glint label jump (same pattern); the hard-coded `ly` unit on the rings; the 2D canvas text at 7 and 8 px (5 lines, `explore-scene-host.ts:3393, 3414, 3539, 3596, 3609`: same file, same rule; Q7); one `radialTexture` and one label builder (6 and 8 copies). **Leave:** `iconic-trajectory` labels (C7); Worlds site tags (HTML with their own pass, `site-tags.ts:86–201`); the Milky Way lens overlay labels (world-sized, floor not measured, NV8); the ruler (C4).

## 2. Inventory

### 2.1 The pin scenes

| Scene | Labels always on | Ring | Hover / selection | Label offset | Text size at 768 / 900 |
|---|---|---|---|---|---|
| Neighbourhood (`neighborhood-scene.ts`) | 29 stars + Sol (`ALWAYS_LABEL_MAG` 1.6 or a host, `:398`); 4 ring labels | Sol: gold 47 px persistent; others: teal annulus on hover only (`:527–536`) | halo fades in; label shows | `halo * 1.1` steady | 9.7 / 11.4 px |
| Milky Way (`milky-way-scene.ts`) | 11 | teal annulus on the Sun, 111 px, screen-constant | glow ×1.5 | `g * 0.9 + lh * 0.7`, `g` includes the ×1.5: **jumps** | 16.8 / 19.7 px |
| Local Group (`local-group-scene.ts`) | 4 | teal annulus on the Milky Way, world-scaled | ring ×1.15, label opacity | steady `glowSize * 0.62` | 16.8 (headliner) 14.2 (dwarf) / 19.7, 16.6 |
| Local Sheet, Virgo, Laniakea, Cosmic web | 5, 2, 3, 3 | teal annulus on the anchor, 69 px up to 221 px | glow ×1.5 | as the Milky Way: **jumps** | 13.3 / 15.6 px |
| Deep-sky glints (`deep-sky-scene.ts`) | 0 (hover only) | none | glint ×2.1 | `scale * 0.65 + lh * 0.6`, `scale` includes the ×2.1: **jumps** | not computed (size from `base * 0.9`) |

### 2.2 Duplicated code

Local function definitions in `src/lib/universe/*-scene.ts`: 6 `radialTexture`, 8 label builders (`labelSprite` ×6, `makeLabelSprite` ×2), one `update()` loop copied into five scenes, one ring texture copied into six. Three overlap implementations in the repo: `neighborhood-scene.ts:235` (exported, tested in `neighborhood-labels.test.ts`), `site-tags.ts:86` (Worlds, a different rectangle type), and the vertical stacking in `iconic-trajectory.ts:594–649`.

### 2.3 Colours in the pin scenes (`c2-check.py`, TEAL-RING: 51 lines)

Ring and anchor glow textures: 5 stops × 6 rings, 3 stops × 4 anchor glows; Milky Way Sun label `rgba(78,205,196,0.95)` (`:492`); Local Group headliner label `rgba(120,214,255)` (`:318`); Milky Way lens labels `rgba(120,205,255)` (`:697, 701`); the neighbourhood halo texture (`:169–175`) and the 10 ly ring `0x6fd8ce` (`:479`). The other scene colours (arm labels, galaxy glows by kind, structure colours) are not teal and stay.

### 2.4 Solar-system contrast inputs

Listed in §0 (E2). Compositing happens in linear light before the OutputPass, so an opacity of 0.25 reads brighter on screen than 0.25 of the same colour in sRGB arithmetic; no ratio is computed here (§13). The solar scene has no hover ring: hover shows a tooltip (`explore-scene-host.ts:2150–2200`); selection shows `selHalo` for planets and moons only.

### 2.5 2D canvas text

`ctx2.font` is 7 px (Planet Nine, Sun caption, small-body names) and 8 px (planet names, bottom hint) at 5 places; alphas 0.08 to 0.5. These are text on a UI canvas outside the A1 floor list.

## 3. Findings that shape the proposal

1. **The labels are too big where they overlap and too small where they do not.** Milky Way text is 16.8 px at 768, neighbourhood text 9.7 px. One size in CSS pixels removes both problems and shrinks MW1's cause.
2. **The declutter already exists** for one scene and is the right design (priority, hide on collision, show on hover). C2 moves it, not writes it.
3. **MW2 is one line copied five times**; the fix is one steady-size rule in one module.
4. **There are two ring behaviours and one colour**, and the colour breaks the A3 rule.
5. **The ring the operator wants copied is teal, a3-keep, and the Sol ring is gold**: the "neighbourhood style" is two styles.
6. **MW4 is an unwired code path**, not a design gap: arms are in `pickables` and not in `pins`.
7. **E2 cannot be decided without a measurement**, and UXD-004 changed the picture after the plan row was written.

## 4. Proposal

### 4.1 One module: `src/lib/universe/scene-pins.ts` (pure parts unit-tested; builders take `THREE`)

Contents: `radialTexture`; `labelSprite(text, { color, weight })` (one font, one texture height); `screenPxToWorld(px, dist, fovDeg, viewportH)`; `ringTexture(color)` and `createRing(kind)`; `placeLabels(items)` (pure; rectangles in NDC; priority order; returns which labels stay visible); `keepInView(...)` (moved from the neighbourhood). The neighbourhood's `overlaps` and its test move here. The six scenes keep their data and picking and lose their helpers (`DUP-HELPER` 14 → 0).

### 4.2 One label size (Q4)

Sprite height is set in CSS pixels, not as a fraction of distance: `lh = screenPxToWorld(20, dist, fov, viewportH)` for 12 px text (texture font 24 px on a 40 px texture = 60 %, so 12 px of text needs a 20 px sprite). 12 px is `--size-meta` (UXD-002). Result at any viewport height: 12 px at every scale; the floor holds on a 667 px phone. `update(camera)` gains the viewport height (`bridge.container.clientHeight`); four scenes have a no-op `setSize` (Local Sheet `:243`, Virgo `:251`, Laniakea `:247`, Cosmic web `:270`) and need it.

### 4.3 Steady offset (MW2)

The offset above the pin uses the steady glow `g0 = dist * baseScale`; only the glow sprite and the ring use the hover size. Same for the deep-sky glint. Pure function `labelOffset(g0, lh)` with a test that hover does not change it.

### 4.4 Rings (MW4, MW6, Q2, Q3)

One look: a thin annulus (stroke 1.5 px at the final size), diameter 44 px screen-constant on every scale (NB Sol is 47 px at 900 px, arithmetic), `#889fe7` for hover and selection, the anchor ring persistent at opacity 0.55 and in the NB Sol gold `0xffcf8f` so that "you are here" is one colour at all seven levels (neighbourhood Sol already is). Hover or selection shows the ring on any pickable pin; arms get a ring at their label point (`label_x`, `label_z`). The Local Group ring stops being world-scaled. The solar scene gets a dimmer hover ring, a second `Line2` next to `selHalo` (`explore-solar-scene.ts:1283–1307`), driven by the existing hover hit (`explore-scene-host.ts:2150–2200`); C1 supplies the selection ring for the remaining kinds.

### 4.5 One placement pass (MW1, SN1, Q5)

Each frame, after positions are set: build rectangles for visible labels (reuse arrays, no allocation per frame: AGENTS Performance rule 4), sort by priority, hide a label that overlaps one already placed, except hovered and selected labels, which always show. Priority: hovered/selected, anchor, headliner, rest. Milky Way order: Sun, Sagittarius A*, headliner globulars, Magellanic Clouds, arms. Neighbourhood: hovered/selected, Sol, brightest star (unchanged), then the four ring labels last. Cost: at most 34 visible labels in the neighbourhood and 11 elsewhere: at most 34² / 2 ≈ 580 rectangle tests per frame, arithmetic.

### 4.6 Light-year rings (SN1, Q6)

`Line2` lines (`LineMaterial`, 2 px, opacity 0.55; the constellation lines in the same file already use `LineSegments2`, `:334`) in a four-step ramp from `#889fe7` towards white; labels `m.unit_ly_value({ value })` (exists in 14 locales: `en "{value} ly"`, `de "{value} Lichtjahre"`, `zh-CN "{value} 光年"`), dark halo behind the text, in the placement pass at lowest priority. Four rings stay (5, 10, 25, 50). At 12 px (Q4) the ring labels have the size of the star labels.

### 4.7 E2: measure first, lift elements (Q1)

1. `tests/e2e/explore-readability.spec.ts` (new) opens each level at its default pose (`?context=`), waits for hydration, takes a canvas screenshot and computes: luma percentiles of the frame; the contrast ratio (WCAG relative luminance, on the rendered sRGB pixels) between sampled line pixels and the nearest background pixels for orbit lines, moon orbits, rings; the same after a 12 % white veil (daylight glare stand-in).
2. Lifts are element-level and listed with their measured before and after: planet orbit lines 0.25, small-body orbits 0.22, belts 0.5 / 0.4, hemisphere light 0.08, 2D canvas alphas. Global exposure 1.15 stays (UXD-004).
3. Starting values for the sheets (not decided): planet orbit lines 0.4, small-body orbits 0.35, belts 0.65 / 0.55, hemisphere 0.2, 2D hint 0.5.

### 4.8 2D canvas text (Q7)

Five `ctx2.font` lines to 11 px (names 11, caption 11, hint 11) with alphas at or above 0.58 (UXD-002: text under 12 px keeps effective alpha ≥ 0.58). The 2D labels use the same `placeLabels` on pixel rectangles.

## 5. Replacement map

| Old | New |
|---|---|
| 6 `radialTexture`, 8 label builders | `scene-pins.ts` |
| `g * (hi ? 1.5 : 1)` in five scenes, `bloom` in deep-sky | steady `g0` for the offset, hover size for glow and ring only |
| 6 teal ring textures, 4 teal anchor glows, teal Sun label, cyan headliner and lens labels | one ring look (§4.4); labels from A3 tokens or neutral blue-white |
| NB halo texture (teal) | the ring look |
| `ring.scale.setScalar(g * 1.6)` ×5, `glowSize * 2.1` ×2 | 44 px screen-constant |
| `neighborhood-scene.ts` `overlaps`, label loop | `placeLabels` |
| `` `${shell.ly} ly` `` | `m.unit_ly_value` |
| `LineBasicMaterial` rings | `LineMaterial` 2 px |
| arm labels with no state | hover and selection ring at the label point |
| `ctx2.font = "7px…"` ×3, `"8px…"` ×2 | 11 px |
| `AGENTS.md:747` "deferred to slice C2", `UXD-002:52` | the 12 px rule |

## 6. Hit list and the check

Baseline at `481b5fa2a44`: **98 violations**. By kind: LABEL-JUMP 6, DUP-HELPER 14, TEAL-RING 51, RING-SCALE-COPY 7, NO-DECLUTTER 5, LOCAL-DECLUTTER 1, RING-THIN 1, RING-LABEL-LITERAL 1, RING-LABEL-NO-DECLUTTER 1, ARM-NO-HOVER 1, CTX2-TINY-TEXT 5, DOC-ALLOWLIST 2, NO-SPEC 1, NO-SHARED-MODULE 1, NO-UXD 1. Run from the repo root: `python3 c2-check.py` or `C2_REV=<sha> python3 c2-check.py`. Allow marker `c2-keep: <why>` on the line or the line above (an `a3-keep` marker does not allow a TEAL-RING line: D2). After the slice it prints `C2-CHECK violations: 0`.

```python
#!/usr/bin/env python3
# C2-CHECK — run from the repo root:  python3 c2-check.py          (working tree)
#                                      C2_REV=HEAD python3 c2-check.py   (a commit, via git show)
# Prints each violation as KIND file:line text, then "C2-CHECK violations: N".
# Allow marker: `c2-keep: <why>` on the line or the line above.
import glob
import os
import re
import subprocess
from collections import Counter

REV = os.environ.get('C2_REV')
V = []


def add(kind, f, line, text):
    V.append((kind, f, line, ' '.join(str(text).split())[:96]))


def read(f):
    if REV:
        r = subprocess.run(['git', 'show', f'{REV}:{f}'], capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else None
    return open(f, encoding='utf-8').read() if os.path.exists(f) else None


def files(pattern):
    if REV:
        r = subprocess.run(['git', 'ls-tree', '-r', '--name-only', REV, 'src/lib/universe'], capture_output=True, text=True)
        import fnmatch
        return sorted(p for p in r.stdout.split() if fnmatch.fnmatch(p, pattern))
    return sorted(glob.glob(pattern))


def keep(lines, i):
    return 'c2-keep' in lines[i] or (i > 0 and 'c2-keep' in lines[i - 1])


SCENES = files('src/lib/universe/*-scene.ts')
PIN_SCENES = [f for f in SCENES if re.search(r'(milky-way|local-group|local-sheet|virgo|laniakea|cosmic-web)-scene', f)]

for f in SCENES:
    src = read(f) or ''
    lines = src.splitlines()
    # MW2: the label offset must not depend on the hover/selection size
    for m in re.finditer(r'const (g|scale) = [^;\n]*\b(hi|bloom)\b[^;\n]*;', src):
        var = m.group(1)
        tail = src[m.end():m.end() + 900]
        if re.search(r'label\.position\.set\([^;]*\b' + var + r'\b', tail):
            add('LABEL-JUMP', f, src[:m.start()].count('\n') + 1, f'label offset uses {var}, which grows on hover/selection')
    # one shared helper set
    for i, line in enumerate(lines):
        if re.match(r'function (radialTexture|labelSprite|makeLabelSprite)\b', line) and not keep(lines, i):
            add('DUP-HELPER', f, i + 1, line)
        # rings and glows in the six teal-family hexes (UXD-001: no teal in UI states, rings, reference maps)
        if re.search(r'78,\s*205,\s*196|0x6fd8ce|120,\s*240,\s*230|90,\s*210,\s*200|120,\s*214,\s*255|120,\s*205,\s*255', line) \
                and not keep(lines, i):
            add('TEAL-RING', f, i + 1, line)
        if re.search(r'\bring\.scale\.setScalar\(', line) and not keep(lines, i):
            add('RING-SCALE-COPY', f, i + 1, line)

# MW1: every pin scene runs the shared declutter; the neighbourhood's local copy moves out
for f in PIN_SCENES:
    src = read(f) or ''
    if 'label.visible' in src and not re.search(r'placeLabels|declutterLabels', src):
        add('NO-DECLUTTER', f, 1, 'labels are placed without the shared overlap pass')
nb = read('src/lib/universe/neighborhood-scene.ts') or ''
for m in re.finditer(r'export function overlaps\(', nb):
    add('LOCAL-DECLUTTER', 'src/lib/universe/neighborhood-scene.ts', nb[:m.start()].count('\n') + 1, 'overlaps() is local to the neighbourhood scene')

# SN1: the reference rings are fat lines, their labels are localised and take part in the declutter
m = re.search(r'const REFERENCE_SHELLS[\s\S]*?scene\.add\(referenceGroup\)', nb)
if m:
    blk = m.group(0)
    ln = nb[:m.start()].count('\n') + 1
    if 'LineBasicMaterial' in blk:
        add('RING-THIN', 'src/lib/universe/neighborhood-scene.ts', ln, 'reference rings are 1 px LineBasicMaterial at opacity 0.2')
    if re.search(r'`\$\{shell\.ly\} ly`', blk):
        add('RING-LABEL-LITERAL', 'src/lib/universe/neighborhood-scene.ts', ln, 'the unit is the literal "ly", not m.unit_ly_value')
    if not re.search(r'placeLabels|declutterLabels', nb):
        add('RING-LABEL-NO-DECLUTTER', 'src/lib/universe/neighborhood-scene.ts', ln, 'ring labels are not in the placement pass (5 LY vs Barnard\'s Star)')

# MW4: arm labels are pickable but never highlighted
mw = read('src/lib/universe/milky-way-scene.ts') or ''
u = re.search(r'update\(camera\) \{[\s\S]*?\n    \},', mw)
if u and 'armPickables' not in u.group(0) and 'arms' not in u.group(0):
    add('ARM-NO-HOVER', 'src/lib/universe/milky-way-scene.ts', mw[:u.start()].count('\n') + 1, 'update() only walks pins; arms get no hover or selection ring')

# SN-text: 2D explore canvas text is under the 11 px floor
host = read('src/lib/three/explore-scene-host.ts') or ''
for i, line in enumerate(host.splitlines(), 1):
    m = re.search(r'ctx2\.font = "(\d+)px', line)
    if m and int(m.group(1)) < 11:
        add('CTX2-TINY-TEXT', 'src/lib/three/explore-scene-host.ts', i, line)

# Docs, tests, decision record
for i, line in enumerate((read('AGENTS.md') or '').splitlines(), 1):
    if 'deferred to slice C2' in line:
        add('DOC-ALLOWLIST', 'AGENTS.md', i, line)
for i, line in enumerate((read('docs/uxs/decisions/UXD-002-type-scale-and-the-11px-floor.md') or '').splitlines(), 1):
    if '3D sprite labels are slice C2' in line:
        add('DOC-ALLOWLIST', 'docs/uxs/decisions/UXD-002-type-scale-and-the-11px-floor.md', i, line)
if read('tests/e2e/explore-readability.spec.ts') is None:
    add('NO-SPEC', 'tests/e2e/explore-readability.spec.ts', 1, 'file missing')
if read('src/lib/universe/scene-pins.ts') is None:
    add('NO-SHARED-MODULE', 'src/lib/universe/scene-pins.ts', 1, 'file missing')
if not [p for p in glob.glob('docs/uxs/decisions/UXD-*') if 'readab' in p.lower() or 'label' in p.lower()]:
    add('NO-UXD', 'docs/uxs/decisions', 1, 'no UXD for explore readability')

for k, f, l, t in V:
    print(f'{k:24} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in V)))
print(f'C2-CHECK violations: {len(V)}')
```

Known limits: names and patterns, not pixels; `LABEL-JUMP` finds `const g|scale = … hi|bloom …` followed by a `label.position.set` that reads it, so a renamed variable escapes (the e2e probe is the second net); `TEAL-RING` matches six colour strings, not hue in general; the label size is checked by `c2-labelpx.py` (hand-copied constants) and by the e2e probe, not by this script. It has no tests of its own; the text above was extracted and run: `python3 c2-check.py` → `C2-CHECK violations: 98`.

## 7. Allow-list (not touched, with reason)

- `iconic-trajectory.ts` encounter labels and their stacking pass (C7); the direction pill (C3).
- Worlds site tags (`site-tags.ts`): HTML, own pass, own rules.
- Milky Way lens overlay labels (`mkOverlayLabel`, `milky-way-scene.ts:643–712`): world-sized teaching labels; floor not measured (NV8).
- Galaxy, structure and star glow colours by kind: data colours, `a3-keep` stays (palette review L4).
- Science charts (CausalityMap, HrDiagram, MassPeriodChart) and Lab canvases: A1's own allow-list.
- Orbit ruler and its regime colours (C4).
- Global tone mapping and exposure (UXD-004).

## 8. Tests, docs, locales

**Unit:** `src/lib/universe/scene-pins.test.ts`: `placeLabels` (priority, hover wins, touching edges apart: the cases of `neighborhood-labels.test.ts` move here), `labelOffset` unchanged by hover, `screenPxToWorld` (20 px at three viewport heights), ring size constant across distance. `neighborhood-labels.test.ts` imports from the new module.
**E2 (new `tests/e2e/explore-readability.spec.ts`, three projects, `--workers=1`, `test.slow()`):** per level: label text height from a dev hook (`window.__scenePins`, like the existing `__explore*` hooks) is 12 px ± 1 at 667, 768, 900 px viewport heights; no two always-on label rectangles overlap at the default pose (the six outer levels and the neighbourhood, in `en`, `de`, `ru`, `ja`); hovering a pin leaves its label rectangle's centre unchanged (to 1 px) while the ring appears; an arm shows a ring; the anchor ring's diameter is 44 ± 2 px at two zooms; the E2 probe of §4.7 writes its table to the test output and asserts the Q1 thresholds; 2D canvas text is 11 px (read from the draw call through a hook).
**Changed:** `explore-milky-way`, `explore-local-sheet`, `explore-virgo`, `explore-laniakea`, `explore-cosmic-web`, `explore-science-lens-shells`, `explore.spec.ts` (2D), `a11y.spec.ts` if axe sees the changed DOM (it does not see canvas), `type-floor.spec.ts` (add the sprite-label rule through the hook).
**Visual baselines:** none. Only `explore-hub-grid` has baselines for Explore (`visual.spec.ts:206–208`).
**Docs:** `AGENTS.md` (delete the C2 deferral at `:747`; Design System: one 12 px label, one ring look, anchor gold, hover `#889fe7`), `docs/uxs/decisions/UXD-002` (`:52` now says the rule), `docs/uxs/UXS-014.md` (hover and selection feedback), `docs/uxs/UXS-016.md` (labels, rings), `docs/adr/TA.md:313` and the /explore v2 section, `src/lib/universe/README.md` (`scene-pins.ts`), `docs/uxs/CHANGE-INVENTORY.md:41`, a new UXD (next free id; 018 at HEAD, unless C1 takes it).
**Locales:** no new key (`unit_ly_value` exists in 14). `validate-data` green.

## 9. Screenshots for the operator (dev server per AGENTS "Iterating on UI", not Docker; small shots, 1440 × 900, 1366 × 768 and 390 × 844, before = HEAD)

1. All eight levels at default pose, side by side: the E2 sheet with the probe table. 2. Neighbourhood: rings before and after (gold, ramp), labels at 768 high, "5 LY" next to Barnard's Star. 3. Milky Way: 11 labels before and after; hover Sagittarius A*, hover Sagittarius arm and Perseus arm (ring), hover LMC (no jump: two frames overlaid). 4. Local Group: Milky Way anchor at three zooms. 5. Local Sheet, Virgo, Laniakea, Cosmic web: anchor ring before and after, hover frames. 6. Solar system: hover Ceres, hover Jupiter (new ring), orbit lines before and after. 7. 2D view text. 8. `de`, `ru`, `ja` Milky Way and Local Group.

## 10. Order of work

1. C1 lands first (ring state, focus). 2. `scene-pins.ts` + tests (red first). 3. Move the six scenes onto it, one commit per scene, `c2-check.py` after each. 4. Neighbourhood rings and labels. 5. Solar hover ring and element lifts after the probe. 6. 2D canvas text. 7. Docs, UXD, spec, sheets. `npm run preflight` once before the push.

## 11. Decisions and open questions (operator), recommendation first

1. **E2 method and targets.** Recommended: measure first (the probe of §4.7), then lift elements only: orbit lines, belts, hemisphere light, 2D alphas; target: lines, rings and orbits at or above 3:1 against the adjacent background on rendered pixels, and still at or above 2:1 after the 12 % white veil; global exposure stays 1.15. Alternatives: a global exposure or ambient lift (changes every planet look, UXD-004's accepted look); judge by eye only.
2. **Ring and glow colours.** Recommended: hover and selection `#889fe7`, the anchor ring gold `0xffcf8f` at all levels, the anchor glows of the shell scenes neutral blue-white, the Milky Way Sun label and the cyan labels in token colours; `a3-keep` removed from ring lines (a ring is not a data colour). Alternative: keep the teal as data colour and change size only (breaks the A3 and "No cyan" rule).
3. **Ring behaviour.** Recommended: 44 px, screen-constant, on every pin and on arm label points; the anchor persistent at opacity 0.55, hover and selection full; the Local Group ring screen-constant too. Alternative: dot only, ring on hover (the plan row literal). **Ambiguity named:** "doesn't scale with zoom" fits the Milky Way ring (screen-constant) and not the Local Group ring (world-scaled); the model the operator names, the neighbourhood, is screen-constant. The recommendation follows the model. Alternative: scale the ring with the object, clamped to 28 to 64 px.
4. **One label size.** Recommended: 12 px text (`--size-meta`) at every scale, set in CSS pixels. Alternatives: 11 px (floor); keep per-scale sizes and only raise the neighbourhood to the floor.
5. **Placement pass.** Recommended: the rules of §4.5, hovered and selected labels always shown, hidden labels return when space frees. Alternative: a fixed label set per level with no pass (loses names at small windows).
6. **Light-year rings.** Recommended: 2 px lines, a blue-to-white ramp, localised unit, four rings, labels in the pass. Alternatives: add a 100 ly ring; one colour for all.
7. **2D canvas text.** Recommended: fold in, 11 px and alpha ≥ 0.58 for text. Alternative: leave for the end-of-work palette review (the text stays under the floor).
8. **Order with C1.** Recommended: C1 before C2 (selection state and camera first, then how it looks). Alternative: C2 first; its rings then show only hover until C1 lands.

## 12. Acceptance (definition of done, per the plan)

1. `python3 c2-check.py` prints `C2-CHECK violations: 0`.
2. §8 docs state the rule; UXD written; CHANGE-INVENTORY row C2 updated.
3. `scene-pins.test.ts` and `explore-readability.spec.ts` plus the touched specs green on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; nothing skipped.
4. `validate-data` green; no new key.
5. §9 sheets shown to the operator with the E2 probe table; the lead has read the checker's evidence.

## 13. NOT VERIFIED (what this brief did not check)

- NV1 No browser, build or test run. Every size, overlap and cost figure is arithmetic at fov 55 (`explore-render-stack.ts:46`) with the texture font and height read from code (24 px on 40 px, 22 px on 34 px for deep-sky).
- NV2 E2 is not measured at all. Whether the operator's screen showed the pre-OutputPass look (UXD-004 landed the same day) is not known; no luma, contrast or veil figure exists. The "starting values" of §4.7 are guesses for the sheets, not results.
- NV3 Blending of 0.25-opacity lines happens in linear light before the OutputPass in the composer scenes and in the renderer's colour pipeline in the direct scenes; I did not compute the resulting sRGB values.
- NV4 The ring at 44 px sits inside the Milky Way Sun glow (69 px at 900); whether a 44 px ring reads over that glow was not seen. If it does not read, the Sun pin needs a smaller glow (a pin-look change not in this brief).
- NV5 `stepCrossDolly` and the scene `setSize` paths of the five scenes with a no-op were read for names; passing the viewport height through `update(camera)` was not traced into every call site (host `:4158–4193`).
- NV6 Hover hit paths for the shell scenes read from `explore-scene-host.ts:2078–2131`; how touch devices (no hover) select and show the ring was not read.
- NV7 Translated label widths (31 characters in `ru`) were counted, not rendered; the canvas font fallback for CJK and Devanagari in sprite textures was not tested.
- NV8 The Milky Way lens overlay labels (`milky-way-scene.ts:643–712`) are sized as a fraction of the disc radius; their on-screen size was not computed.
- NV9 The Worlds' 3D marker sprite labels (`surface-markers.ts`) were not read; TA.md:489 says tags replaced them.
- NV10 The `Sol` label is the literal string `'Sol'` (`neighborhood-scene.ts:428`) and the star names are data strings; their localisation was not checked.
- NV11 `c2-check.py` ran at baseline (HEAD and the working tree both print 98); the 98 were not each read beyond the listing; `TEAL-RING` also counts the NB halo and the MW lens labels, which Q2 treats as rings and labels.
- NV12 Whether the hover ring in the solar scene can reuse the existing hover hit (`:2150–2200`) or needs its own raycast was not traced.
