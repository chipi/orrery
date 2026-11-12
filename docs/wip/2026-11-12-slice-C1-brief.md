# Slice C1 brief — select = focus (E3, E5, SS4, I4, EP1, IM5, IM6)

Read-only brief, written at HEAD `481b5fa2a44` on `tech-debt/0.9.9` (A1 to A6 landed; the scale INDEX on all eight scales landed; B1 O1 to O8, B2 Q1 to Q10 and B3 Q1 to Q8 approved, not built). Method: `git grep` and reading from the repo root; every `file:line` was read at `481b5fa2a44`. Counts come from three scripts run as files (`c1-residents.py`, `c1-missions-order.py`, `c1-check.py`, in the session scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`). No build, no dev server, no browser, no test run: every pixel, duration and layout figure below is arithmetic from code (see §13). The check of §6 was run once: `python3 c1-check.py` prints `C1-CHECK violations: 50`.

## 0. The point list

| ID | Operator text (plan lines 142, 143, 158, 164, 187, 199, 200) | State at HEAD |
|---|---|---|
| E3 | Deselecting all chips (only Sun and belts left) must also clear any active selection; a planet selected, then planets deselected: selection gone. Same for every chip. | `onToggleLayer={(key) => (layers[key] = !layers[key])}` (`+page.svelte:1980`) only flips the flag. The planet panel, the selection ring (`selHalo`, host `:4064–4096`) and the camera focus stay on a body whose mesh the animate loop has just hidden (host `:3809–3818`). No chip clears anything. Worlds clear selections for three chips (pads, museums, observatories: `SurfaceScene.svelte:748, 5467, 5482, 5498`) and for none of ORBITERS (`:5511`) or TRAVERSES (`:5533`). |
| E5 | Clicking most smaller bodies and some planets only opens the panel; the object must also be selected. | Selected = ring + camera focus. `selectPlanet` focuses (`+page.svelte:850–860`, `flyToBodyFn`), draws the ring (host `:4083–4093`). `selectSmallBody` (`:882–891`), `selectBelt` (`:910–919`) do neither. `selectSatellite` (`:898–907`) draws the ring (`:4064–4082`) and does not move the camera. `selectSun` flies to the heliocentric default (`:871–880`, host `:1786–1795`) and draws no ring. "Some planets": Pluto opens the small-body panel from a ruler resident and from `?id=pluto` and has no selectable mesh there (§2.4). |
| SS4 | "Who lives here" from the belt orbital pane: some bodies don't get focus like the main planets do. Same pattern everywhere: always focus what we can; if nothing can be clicked, don't render a link. | `RegimePanel` makes every resident id a button (`+page.svelte:213–215` collects all 20 ids; `RegimePanel.svelte:133–150`). 4 of the 20 have no scene object: Pallas, Hygiea (belt), Quaoar (Kuiper), Sedna (scattered): a button that does nothing (`+page.svelte:262`, "Unknown id → no-op"). The other 16 select without ring or focus, except the 8 planets, which fly. `BeltPanel` has a fourth ladder for its Members tab: 5 hard-coded ids, navigation by `goto` (`BeltPanel.svelte:125–152, 263–279`); Vesta is in the scene and is not linked. |
| I4 | Not every click focuses the body in Explore (only opens the panel); check both behaviours for each item. | The INDEX now exists on all eight scales and its row does what a canvas click does (`+page.svelte:949–986`; UXD-017: "no camera move"). I4's "check both behaviours" is answered by §2.1: the two behaviours were equal for planets and equal and wrong for everything else. The INDEX half of I4 is C1's (§1, §4.8). |
| EP1 | Planet/body panels: the missions tab entries are not links to the missions; link them; sort like elsewhere (most recent first). | They are links already: `linkifyMissionEntry` (`PlanetPanel.svelte:328–335`, `missions-linkify.ts:162–216`), `linkifyMission` in `SatellitePanel.svelte:247`, `SmallBodyPanel.svelte:356`, `BeltPanel.svelte:286`. What is left: (1) the order: all 15 lists with two or more entries (6 planets, 9 moons) are oldest first or mixed, none newest first (`c1-missions-order.py`; §2.5); (2) the target: a link navigates to `/missions?id=` or `/fleet?id=` and leaves `/explore` (`missions-linkify.ts:150–152`). Q4 of the plan is the open decision. |
| IM5 | Clicking a milestone box opens that mission in the right panel (as other links do). | Milestone boxes are label sprites (`iconic-trajectory.ts:458–495`), visible only while the mission is highlighted (`:584`), not pickable: only the Today marker is (`pickables.push(handle.clickTarget)`, host `:1950`; `isSelectable`, host `:1988–1994`). The encounter markers carry `missionId` and are hover targets only (`:472–482`). |
| IM6 | New Horizons does not open the full mission panel like the others. | `INTERSTELLAR_CRAFT` (`paths-legend.ts:6–12`) routes 5 of 18 legend rows (Voyager 1, Voyager 2, Pioneer 10, Pioneer 11, New Horizons) to `MessagePanel` (`HudControls.svelte:180, 311`; host `:2022`; #410). The other 13 open `MissionPanel`. New Horizons carries no formal message, so its panel is the emptiest (`tests/e2e/explore-message-panel.spec.ts:59`). It is a design from #410, not a defect; the operator reads it as one. |

Slice row (plan line 348): one `focusBody` for planets, moons, small bodies, belts; every entry point (scene click, index, who-lives-here, panel links, iconic milestone boxes) selects and focuses; turning a chip off clears a selection of that kind; links only for bodies in the scene (Pallas, Hygiea, Quaoar, Sedna become plain text or get data); New Horizons opens the mission panel; mission links per Q4, newest first. Done when: e2e, every entry point leaves the body selected and centred; chip-off clears it.

## 0a. Decisions that bind C1, and what is open

| # | Source | Text |
|---|---|---|
| D1 | A4 / A5 / A6 (operator 2026-11-12) | One chip look; layer chips in one flat row; RESET VIEW always rendered, disabled when inert; never add icons nobody asked for. C1 adds no control. |
| D2 | Scale INDEX brief §5 Q8 (approved as recommended, UXD-017 "Not covered here") | An INDEX row does what a canvas click does: no camera move and no new URL parameter "in this slice". Both were deferred to C1. C1 reverses the first half and proposes the second (Q8). |
| D3 | B3 Q1 (approved) | A black hole opens its panel in place; the lensing takeover is behind a button. After B3, selecting a hole is a pin selection like any other (Q9). |
| D4 | Plan line 411 (Q6) and B1 O1 to O8 | Panels get one header bar; actions are one chip row. A mission opened in place from a planet panel uses that panel shell (Q1). |
| D5 | Memory "Decisions apply project-wide", "Finish, don't list not done" | Every entry point, every route, every locale in one pass. C1 therefore covers Worlds' chip rule for ORBITERS and TRAVERSES (Q5), not only Explore. |
| Open | Plan Q4 (mission link: in place or `/missions`), never answered; `CHANGE-INVENTORY.md:40` lists C1 as "Waits on Q4". | Q1 below. |

## 1. Cascade: what earlier slices change in C1, and which C-row ideas are outdated

| Earlier slice | What it changes in C1's tactics | Outdated in the plan row |
|---|---|---|
| **A1 type scale** | No text added by C1. A mission link in a planet panel keeps the `.mission-link` style (`panel-tabs.css`). | Nothing. |
| **A3 tokens** | The selection ring is one pale-blue ring `0xa8c8ff` at 0.45 (`explore-solar-scene.ts:1291–1298`), the "same family as orbit lines". A3 sets `#889fe7` (`--color-state`) for annotation rings and hover. C1 keeps the ring as is and adds it to the kinds that have none; the colour question belongs to C2 Q2 (one ring colour across 3D). | Nothing. |
| **A4 chip, A5 flat row, A5 follow-up (RESET VIEW fixed slot)** | The four layer chips and PATHS are `LayerChipRow` chips (`HudControls.svelte:74–116`); their `toggle` callback is the only place a chip-off rule is needed (one call site, `+page.svelte:1980`). The HUD `RESET VIEW` already clears bodies, belts and panels (`+page.svelte:1970–1978`) and is enabled by `hasSelection` (`:1963–1969`); C1 keeps that contract and adds the moon and the iconic selection to what Reset clears. The scale navigator's reset is still mounted and unmounted (`ScaleNav.svelte:55`, `+page.svelte:675–680`): it exists at 3 of 8 scales. A camera move at the other five needs a way back (Q6). | The plan row has no reset. Added. |
| **A6 nav** | None. | Nothing. |
| **Scale INDEX (UXD-017)** | Rows exist on all 8 scales and call `selectIndexRow` (`+page.svelte:949–986`). Solar rows reach `selectSun`, `selectPlanet`, `selectSatellite`, `selectBelt`, `selectSmallBody`; outer rows reach `selectLgFn` … `selectCosmicWebFn`, `mwDeepLinkFn`, `indexSelectStarFn`, `selectDeepSkyFn`, `bhDeepLinkFn`. So C1 changes the host functions, not the INDEX component. A row of a hidden kind selects an invisible body (§2.2). Black holes sit in the Milky Way, Virgo and Cosmic web lists and have no pin at M87*, Cygnus X-1 and Gargantua. | "every entry point (… index …)" is outdated as one item: the index is 8 lists and 6 host functions. I4's other asks (meta line, kind filters, planet dots) are built. **C6 leaves WM3 only** (Moon and Mars index nation colours), which waits on the worlds moving onto `ScaleIndex` (scale-index brief Q10). |
| **B1 (header bar, action row)** | A mission opened in place from a planet panel opens in the MissionPanel shell with its header bar; the back chip (`card-chain`) is the way back to the planet (Q1). The order proposed here builds B1 before C1. | "Mission links" ask in the plan row assumed `/missions`. |
| **B2 (science links)** | MissionPanel's link list shrinks to 5; unrelated. | Nothing. |
| **B3 (outer panels, Q1 hole opens in place)** | The outer panels are one body (`UniversePanelBody`); C1 does not touch their markup. After B3 a hole row selects like any pin and keeps the Milky Way (or Virgo, Cosmic web) on screen. The EHT hero is B3's. | "Select = focus" for holes: the takeover entry (`bhDeepLinkFn`, `+page.svelte:950–953`) is replaced by the same pin funnel. |
| **Catalogue layer #658, deep-text integration** | Panels and INDEX rows carry source links and new body text; they are read-only for C1. New named objects (deep-sky, Local Group headliners) add INDEX rows that need a pin to focus: the rule "no scene object, no link; a row still lists" (§4.8) covers them without code. | Nothing. |
| **C7 iconic missions (next)** | Rebuilds the milestone boxes (`IM2` to `IM4`, `IM7`). IM5 needs pick targets on the same sprites. C1 wires pick on today's sprites and fixes the contract `userData.missionId` + `kind`; C7 re-skins and keeps it (Q12). | Nothing. |
| **D1 orbiter selection (Worlds)** | W3 asks to keep the selected orbiter visible and shift the view left of the panel. The shift is the same helper C1 needs for Explore (Q7). | Nothing. |

Adjacent items. **Fold in:** the Pluto fork (§2.4), the fourth ladder in `BeltPanel` (§0 SS4), the INDEX row of a hidden kind (§2.2), the missing outer resets (§4.8), the asteroid and Arrokoth chip mapping (§2.2, Q4), the Worlds ORBITERS and TRAVERSES rule (Q5). **Leave:** the ruler's "firsts" mission links (18 rows, 1 has `mission_id`) are C5 (O4); the hover ring is C2; the label declutter is C2; the scale bar is C3; the mission panel's own layout is B1.

## 2. Inventory

### 2.1 Every way to select a body, and what each does today

| # | Entry point | Code | Panel | Selection ring | Camera |
|---|---|---|---|---|---|
| 1 | Canvas click, 3D | host `tryPick3d` `:1972–2028` → page `select*` | yes | planets and moons (`selHalo`, host `:4064–4096`) | planets (`focusOnBody` `:1758–1798`); Sun: home view; small body, moon, belt: none |
| 2 | Canvas click, 2D | host `:3095–3137` → `selectSun` / `selectPlanet` / `selectSmallBody` | yes | not read for 2D | none (2D) |
| 3 | INDEX row, solar system | `selectIndexRow` `+page.svelte:949–986` | yes | as 1 | as 1 |
| 4 | INDEX row, neighbourhood | `indexSelectStarFn` host `:1619–1622`; `selectDeepSkyFn` | yes | star halo (scene) | star: `frameStar` `:1597–1611`; deep-sky: immersion approach |
| 5 | INDEX row, Milky Way … Cosmic web | `mwDeepLinkFn`, `selectLgFn` … `selectCosmicWebFn` → host `selectMilkyWay` `:2405`, `selectLocalGroup` `:2438`, `selectLocalSheet` `:2467`, `selectVirgo` `:2496`, `selectLaniakea` `:2525`, `selectCosmicWeb` `:2554` | yes | pin highlight (`*Scene.highlight`) | none |
| 6 | Ruler resident ("Who lives here") | `onExploreResidentClick` `+page.svelte:234–263`, own ladder | yes | as 1 | as 1; Pluto: small-body panel, no mesh |
| 7 | `?id=` deep link | `explore-url-sync.svelte.ts:73–109` → `resolveSolarBodyTarget` (`scale-shell-controller.ts:67–85`) | yes | as 1 | as 1; Pluto: small-body panel |
| 8 | Belt Members tab | `BeltPanel.svelte:125–152` (5 ids, `goto`) | via 7 | via 7 | via 7 |
| 9 | Mission entry in a body panel | `missions-linkify.ts:130–216` | navigation to `/missions?id=` or `/fleet?id=` | none | none |
| 10 | Legend row, desktop and phone | `HudControls.svelte:170–210`, `:300–340` | `iconic.selectMission` (250 ms debounce, `iconic-selection.svelte.ts:80–92`) → MissionPanel; 5 craft: MessagePanel | none | none |
| 11 | Today marker | host `:2010–2027` | MissionPanel or MessagePanel | ring on the marker (`iconic-trajectory.ts:520–535`) | none |
| 12 | Encounter marker, milestone label | `iconic-trajectory.ts:458–495` | none (hover target only) | none | none |

Four select ladders exist for the solar system (3, 6, 7, 8) plus the canvas (1, 2). Entry 4 and 5 are the outer scales. Entries 9, 10, 11, 12 are missions, not bodies.

### 2.2 Which chip hides which selectable thing

| Chip (`layers` key, `+page.svelte:407–416`) | 3D (host `:3809–3818`) | 2D (host `:3338–3340`, `:3552–3557`) | Selectable things it hides |
|---|---|---|---|
| PLANETS `planets` | planet orbit lines and every planet group, so also the 16 moons and Pluto | planets | 9 planets (Pluto is rendered as a planet: `explore-solar-scene.ts:1173–1179`), moons |
| DWARFS `dwarfs` | small bodies of type `dwarf` | same | 4 rendered (Ceres, Haumea, Makemake, Eris; Pluto is in the planet list) |
| COMETS `comets` | type `comet` | same | 2 (Halley, 67P) |
| ISM `interstellar` | type `interstellar` **and every other type** (the `else` at `:3814–3817`) | type `interstellar` only | 1 visitor, plus in 3D the 15 asteroids and Arrokoth; in 2D those 16 have no chip |
| PATHS `paths` | iconic trajectory groups | none | 18 trajectories, their Today markers |
| none | Sun, `asteroid` and `kuiper` belts | | 1 + 2 |

Counts: `static/data/small-bodies.json` has 15 `asteroid`, 5 `dwarf`, 2 `comet`, 1 `kbo`, 1 `interstellar` (`c1-small.py`). The ISM chip tooltip names only ʻOumuamua (`explore_layer_tip_interstellar`, `messages/en-US.json:419`). So the chip map is wrong in 3D and absent in 2D for 16 bodies: this is a defect in "which chip owns this kind", found because E3 needs the map.

A row of a hidden kind: the INDEX lists Ceres with DWARFS off. `selectIndexRow` (`+page.svelte:949–986`) calls `selectSmallBody`, the panel opens, nothing is visible. Same for a resident link, a panel link and `?id=`.

### 2.3 The ruler residents (measured, `c1-residents.py`)

20 residents in the 8 Explore regimes (`i18n-src/en-US/orbit-regimes-explore/*.json`): 8 planets, 7 small bodies (Pluto, Eris, Makemake, Haumea, Arrokoth, Ceres, Vesta), 1 Sun, **4 with no scene object: Pallas, Hygiea, Quaoar, Sedna**. `firsts`: 18 rows, 1 with `mission_id` (`galileo`); the rest is C5.

### 2.4 Pluto, three answers

Pluto is in `planets.json` and `small-bodies.json`. The scene draws one body, as a planet (`explore-solar-scene.ts:1173–1179`; 2D skips the small-body copy, host `:3557–3559`). Canvas click: planet panel (`userData.planetId`). INDEX: the planet row wins (`scale-index.ts:240`): planet panel. `?id=pluto` and the Kuiper resident: **small-body panel** (`scale-shell-controller.ts:73`, `+page.svelte:246`), "richer science_sections". So one object has two panels by entry point, and the small-body one has no ring and no focus because the scene has no `smallBodyId: 'pluto'` mesh. This is the "some planets" of E5.

### 2.5 Mission lists (`c1-missions-order.py`; link counts are an approximation of the runtime linkifier, which also matches localised names)

Planets: Mercury, Venus, Mars, Saturn oldest first; Earth, Jupiter mixed; Uranus, Neptune, Pluto one entry. Moons: all 9 with two or more entries oldest first. Belts: asteroid mixed, Kuiper newest first. Baseline: **15 lists not newest first** (6 planets, 9 moons). Locale overlays keep the base order and length (the `BeltPanel` comment `:142–148` relies on it), so one permutation computed from the en-US year order applies to every locale; whether the year digits survive translation was not checked (§13).

### 2.6 Iconic selection

18 legend rows (`paths-legend.ts:20–140`): 13 open `MissionPanel`, 5 `MessagePanel`. `iconic.openMission` loads any mission by id from the index (`iconic-selection.svelte.ts:64–79`), so a mission with no trajectory can open in place too. The milestone label sprite is 70 × 28 world units (`iconic-trajectory.ts:122–123`) and exists only while the mission is highlighted.

### 2.7 Outer scales

Six host functions open a panel and call `*Scene.highlight(id)`; none moves the camera. Camera state is shared: `focusOrigin` + `camR/camP/camT`, `updateCam()` (`explore-scene-host.ts:448–488`); `focusOrigin` is `(0,0,0)` at every shell (`resetNeighborhoodView` `:1041`, `resetMilkyWayView` `:1054`, `resetLocalGroupView` `:1065`). Each pin scene exposes `objectPosition(id)` (`milky-way-scene.ts:35`, `local-group-scene.ts:26`, `local-sheet-scene.ts:222`), so a position is available. Reset exists at 3 of 8 scales (`+page.svelte:675–680` returns false for the rest).

## 3. Findings that shape the proposal

1. **"Selected" has three parts and the code gives each kind a different subset.** Panel, ring, camera. Planets get all three, moons two, small bodies and belts one, the Sun one and a camera reset (§2.1).
2. **There are six ladders, not one**: canvas, INDEX row, resident, `?id=`, BeltPanel members, mission links. They disagree on Pluto and on what is a link.
3. **The map from kind to chip is the missing piece for E3 and is itself wrong** (§2.2: 16 bodies on the wrong chip in 3D, on none in 2D).
4. **A link to nothing is built from the data**: `exploreSelectableIds` lists every resident id without asking the scene (`+page.svelte:213–215`).
5. **The INDEX is now the largest consumer of select**: 344 rows, 6 host functions that stop at the panel.
6. **IM5 and IM6 are one question**: which panel a craft opens, and what a milestone is a link to.
7. **Camera focus at the outer scales needs reset functions that do not exist** for four scales.

## 4. Proposal

### 4.1 One funnel (pure, tested): `src/lib/explore/body-ref.ts`

`BodyRef = { kind: 'sun' | 'planet' | 'moon' | 'small-body' | 'belt'; id: string; parent?: string }`. Functions: `resolveBodyRef(id, membership)` (wraps `resolveSolarBodyTarget`, so `?id=`, residents, INDEX ids and Belt members share one ladder); `sceneIdOf(ref)` (Pluto: `planet:pluto`); `chipOf(ref)` (`planets`, `dwarfs`, `comets`, `interstellar`, `null` for Sun and belts; moons follow their parent); `isBodyInScene(ref)`. The page gets one `selectBody(ref)`: opens the panel (the five `select*` bodies become thin calls), sets selection, calls the host `focusBodyFn(ref)`, tracks the click. Every entry of §2.1 rows 1 to 8 calls it.

### 4.2 Host: `focusOnBody` becomes `focusBody` for every kind

`focusOnBody(bodyId)` (`explore-scene-host.ts:1758–1798`) resolves `planetObjs` only. It becomes `focusBody(ref | null)` over a target getter, using the same tween (600 ms ease-out, `:1742`) and the same follow-the-body update (`:3743–3765`):

| Kind | Target | Camera distance (`flyToR`, arithmetic) | Min / max |
|---|---|---|---|
| planet | planet mesh | 8 × `size3` (unchanged) | 1.5 × / 50 × `size3` (unchanged) |
| moon | `satellite.mesh` (follows its orbit) | 8 × `def.sizeUnits` | 1.5 × / 50 × |
| small body | `smallBodyObjs[i].mesh` (follows `smallBodyPosition`) | 14 × mesh radius (1.8 or 1.2 units: 25 or 17 units) | 4 / 600 units |
| belt | Sun origin | asteroid 570 (belt outer 237 × 2.4), Kuiper 1,430 (620 × 2.3); both inside `camRMax` 2,400 | heliocentric 60 / 2,400 |
| Sun | origin | home view (unchanged) | |

`cameraState.focusedOnPlanet` stays true for planets only (it gates TacticalScan and the gravity overlays: `+page.svelte:1956`). The numbers are starting points for the dev-server sheets (§9), not measured values.

### 4.3 Selection ring for every kind

`selHalo` (`explore-solar-scene.ts:1283–1307`) is one billboarded `Line2` ring. The bridge gains `selectedSmallBodyId` and `selectedBeltId` next to `selectedId` and `selectedSatelliteKey` (`explore-scene-host.ts:251–256`), and the per-frame branch (`:4064–4096`) gets two more cases: small body (ring radius 3 × mesh radius, follows the mesh) and Sun (ring at `1.25 ×` sun mesh radius). A belt has no ring (Q10): its particles brighten (opacity ×1.8, size ×1.3) while selected. The ring colour does not change in C1 (C2 Q2 owns ring colours in 3D). The hover ring is C2.

### 4.4 Chip off clears, select turns on (Q5)

A pure `kindHiddenBy(ref, layers)` from `chipOf`. In `+page.svelte:1980`: turning a layer off calls `clearSelectionIfHidden()`, which closes the body panel and clears the ring and focus when the selected ref's chip is the one turned off (selected moon + PLANETS off clears the moon). Turning PATHS off closes the iconic panel only when the open mission was selected from a path (`iconic.state.selectedId` is a `PATHS_LEGEND` id). The ISM chip stops hiding asteroids and Arrokoth (Q4). The reverse: `selectBody` for a ref whose chip is off turns that chip on first (INDEX row, resident, panel link, `?id=`). One rule, both directions.

### 4.5 Who lives here, Belt members, and "no object, no link" (SS4)

`exploreSelectableIds` (`+page.svelte:213–215`) filters through `resolveBodyRef` and `isBodyInScene`: Pallas, Hygiea, Quaoar, Sedna render as plain text. `onExploreResidentClick` (`:234–263`) is deleted for `selectBody(resolveBodyRef(id))`; the `'pluto'` special case goes with it (Q3). `BeltPanel` `memberLink` and its 5-id table (`:125–152`) are replaced by the same call; members with a scene object select in place (no `goto`), the rest are text. Vesta becomes a link. No data is added: Pallas and Hygiea need an orbit and a body record to enter the scene, which is a content decision (NV6).

### 4.6 Mission links (EP1, Q1)

`linkifyMissionEntry` and `linkifyMission` return a `kind` (`mission` | `fleet`) with the id. A mission id opens in place through `iconic.openMission` (works for any mission, §2.6); a fleet id stays a navigation to `/fleet?id=`. Order: `sortNewestFirst(entries, baseEntries)`: parse the year from the en-US entry, apply the permutation to the locale list; a pure function in `missions-linkify.ts`, unit-tested over all 15 lists. The data files are not edited.

### 4.7 Iconic missions (IM5, IM6, Q2, Q12)

- IM5: the encounter markers and the label sprites join `pickables` and `isSelectable` (host `:1950`, `:1988–1994`) with `kind: 'iconic-trajectory-marker' | 'iconic-trajectory-label'` and `missionId` in `userData`. A click opens the mission through `iconic.openMission`. Cost: 5 to 20 sprites per trajectory (comment, `explore-scene-host.ts:1953–1960`) × 18 trajectories join the raycast set while PATHS is on. This contract (`userData.missionId`, `kind`) is guarded by a unit test so C7 keeps it.
- IM6: Q2.

### 4.8 INDEX rows focus at every scale (D2)

One host helper per pin scene, `focusMember(id)`: `scene.objectPosition(id)` → tween `focusOrigin` to it and ease `camR` to 0.6 × the entry distance (never below the scale's floor: `LG_CAM_R_MIN` etc.), keeping `camP`/`camT`. The six functions of §2.1 row 5 call it; the neighbourhood keeps `frameStar`. Four reset functions are added (`resetLocalSheetView`, `resetVirgoView`, `resetLaniakeaView`, `resetCosmicWebView`, modelled on `:1054–1073`) and `scaleResetVisible` (`+page.svelte:675–680`) returns true when the camera is off its entry pose. A row whose object has no pin (Cygnus X-1, M87*, Gargantua) selects the panel and says nothing more; Q9 decides whether they get pins. The panel-aware offset is Q7.

### 4.9 Worlds (Q5)

`dropHiddenOrbiterSelection()` (next to `dropHiddenPadSelection`, `SurfaceScene.svelte:748`) is called from the ORBITERS toggle (`:5511`); TRAVERSES (`:5533`) clears a selected traverse. The camera on Worlds stays D1's.

## 5. Replacement map

| Old | New |
|---|---|
| five `select*` bodies with their own panel mutex (`+page.svelte:850–919`) | `selectBody(ref)` + `body-ref.ts`; the mutex stays inside it |
| `onExploreResidentClick` ladder (`:234–263`) | `selectBody(resolveBodyRef(id))` |
| `exploreSelectableIds` from all residents (`:213–215`) | resolvable residents only |
| `BeltPanel` `SMALL_BODY_IDS`, `memberLink`, `openMember` (`:125–152`) | `selectBody` |
| `focusOnBody` planets-only (host `:1758–1798`) | `focusBody(ref)` |
| `selHalo` planet and moon branches (host `:4064–4096`) | + small body, Sun; bridge fields |
| `onToggleLayer` flip only (`:1980`) | flip + `clearSelectionIfHidden` |
| 3D `else → interstellar` (host `:3814–3817`), 2D no gate (`:3552–3557`) | one `chipOf` table (Q4) |
| `INTERSTELLAR_CRAFT` routing (`HudControls.svelte:180, 311`, host `:2022`), `MessagePanel` | per Q2 |
| `isSelectable` Today marker only (host `:1988–1994`) | + marker and label kinds |
| six `select*` of the outer scales without camera (host `:2405–2554`) | + `focusMember` |
| UXD-017 "no camera move" | superseded by the C1 UXD |

## 6. Hit list and the check

Baseline at `481b5fa2a44`: **50 violations**. By kind: SELECT-NO-FOCUS 5, FOCUS-PLANETS-ONLY 1, HALO-KIND 2, CHIP-OFF-KEEPS-SELECTION 1, CHIP-MAP-INCOMPLETE 1, RESIDENT-LINK-UNCHECKED 1, LADDER-COPY 1, PLUTO-FORK 1, RESIDENT-NO-OBJECT 4, MISSION-ORDER 15, CRAFT-PANEL-FORK 3, OUTER-NO-FOCUS 6, OUTER-NO-RESET 4, ROW-HIDDEN-KIND 1, NO-SPEC 1, NO-UXD 1, DOC-STALE 1, DOC-MISSING 1. Run from the repo root: `python3 c1-check.py` (working tree) or `C1_REV=<sha> python3 c1-check.py`. Allow marker `c1-keep: <why>`. After the slice it prints `C1-CHECK violations: 0`. `RESIDENT-NO-OBJECT` counts only while `exploreSelectableIds` does not resolve (a resident without an object is allowed once its link is plain text). `CRAFT-PANEL-FORK` assumes Q2 recommended; if the operator keeps the `MessagePanel`, the three allowed lines carry `c1-keep`.

```python
#!/usr/bin/env python3
# C1-CHECK — run from the repo root:  python3 c1-check.py          (working tree)
#                                      C1_REV=HEAD python3 c1-check.py   (a commit, via git show)
# Prints each violation as KIND file:line text, then "C1-CHECK violations: N".
# Allow marker: `c1-keep: <why>` on the line or the line above.
import glob
import json
import os
import re
import subprocess
from collections import Counter

REV = os.environ.get('C1_REV')
V = []


def add(kind, f, line, text):
    V.append((kind, f, line, ' '.join(str(text).split())[:96]))


def read(f):
    if REV:
        r = subprocess.run(['git', 'show', f'{REV}:{f}'], capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else None
    return open(f, encoding='utf-8').read() if os.path.exists(f) else None


def line_of(src, idx):
    return src[:idx].count('\n') + 1


def func_body(src, name):
    """Text of `function name(...) { ... }` by brace matching, or None."""
    m = re.search(r'(?:async\s+)?function\s+' + re.escape(name) + r'\s*\(', src)
    if not m:
        return None, 0
    i = src.find('{', src.find(')', m.end()))
    depth = 0
    for j in range(i, len(src)):
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
            if depth == 0:
                return src[i:j + 1], line_of(src, m.start())
    return None, 0


PAGE = 'src/routes/explore/+page.svelte'
HOST = 'src/lib/three/explore-scene-host.ts'
page = read(PAGE) or ''
host = read(HOST) or ''

# E5 / SS4 / I4: every select* of the solar system focuses and rings what it selects
for fn in ['selectSun', 'selectPlanet', 'selectSmallBody', 'selectSatellite', 'selectBelt']:
    body, ln = func_body(page, fn)
    if body is None:
        add('FUNNEL-MISSING', PAGE, 1, f'{fn} not found')
    elif not re.search(r'focusBody\w*Fn|focusBody\(', body):
        add('SELECT-NO-FOCUS', PAGE, ln, f'{fn} does not call the focus funnel (focusBody)')

body, ln = func_body(host, 'focusOnBody')
if body is not None and not re.search(r'smallBodyObjs', body):
    add('FOCUS-PLANETS-ONLY', HOST, ln, 'focusOnBody resolves planetObjs only (no small body, moon, belt)')

for key in ['selectedSmallBodyId', 'selectedBeltId']:
    if not re.search(r'readonly\s+' + key + r'\b', host):
        add('HALO-KIND', HOST, 1, f'bridge does not carry {key}: no selection ring for it (selHalo, planet and moon only)')

# E3: a chip turned off clears a selection of its kind
m = re.search(r'onToggleLayer=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}', page)
if m and not re.search(r'clearSelection|dropHidden|clearKind', m.group(1)):
    add('CHIP-OFF-KEEPS-SELECTION', PAGE, line_of(page, m.start()), 'onToggleLayer only flips the flag: ' + m.group(0)[:60])

# E3 / 2D-3D parity: which chip hides asteroids and Arrokoth
if re.search(r"b\.type === 'dwarf' && !bridge\.layers\.dwarfs", host) and not re.search(r"'asteroid'|'kbo'", host):
    add('CHIP-MAP-INCOMPLETE', HOST, 1, 'asteroid and kbo bodies have no chip of their own (3D rides ISM, 2D has none)')

# SS4: a link only for bodies in the scene; one resolver ladder
s = re.search(r'let exploreSelectableIds = \$derived\(([\s\S]*?)\n  \);', page)
resolver_ok = bool(s and re.search(r'resolveSolarBodyTarget|sceneHas|hasSceneObject', s.group(1)))
if s and not resolver_ok:
    add('RESIDENT-LINK-UNCHECKED', PAGE, line_of(page, s.start()), 'exploreSelectableIds lists every resident id, resolvable or not')
body, ln = func_body(page, 'onExploreResidentClick')
if body is not None and not re.search(r'resolveSolarBodyTarget', body):
    add('LADDER-COPY', PAGE, ln, 'onExploreResidentClick re-implements the ?id= ladder instead of resolveSolarBodyTarget')
if body is not None and "'pluto'" in body:
    add('PLUTO-FORK', PAGE, ln, 'Pluto resolves to the small-body panel here, to the planet panel on canvas and in the INDEX')

sb = json.load(open('static/data/small-bodies.json'))['bodies'] if not REV else json.loads(read('static/data/small-bodies.json'))['bodies']
planets = {p['name'].lower() for p in (json.load(open('static/data/planets.json')) if not REV else json.loads(read('static/data/planets.json')))['planets']}
sbid = {b['id'] for b in sb}
for f in sorted(glob.glob('i18n-src/en-US/orbit-regimes-explore/*.json')):
    r = json.loads(read(f) or '{}')
    for res in r.get('residents', []):
        i = res['id']
        if not resolver_ok and i not in sbid and i not in planets and i != 'sun' and ':' not in i and 'belt' not in i:
            add('RESIDENT-NO-OBJECT', f, 1, f'{i}: {res["label"][:40]} has no scene object (plain text, or give it data)')

# EP1: mission lists newest first, one place
if not re.search(r'export function sortMission\w*Newest|export function \w*NewestFirst', read('src/lib/missions-linkify.ts') or ''):
    n = 0
    for p in json.loads(read('static/data/planets.json'))['planets']:
        ys = [int(y.group(1)) for e in p.get('mission_visits', []) for y in [re.search(r'(1[89]\d\d|20\d\d)', e)] if y]
        if len(ys) >= 2 and ys != sorted(ys, reverse=True):
            n += 1
            add('MISSION-ORDER', 'static/data/planets.json', 1, f'{p["name"]}: mission_visits not newest first')
    for sat in json.loads(read('static/data/satellites.json'))['satellites']:
        ys = [int(y.group(1)) for e in sat.get('mission_visits', []) for y in [re.search(r'(1[89]\d\d|20\d\d)', e)] if y]
        if len(ys) >= 2 and ys != sorted(ys, reverse=True):
            add('MISSION-ORDER', 'static/data/satellites.json', 1, f'{sat["parent_planet_id"]}:{sat["id"]}: not newest first')

# IM5: a milestone marker or box opens its mission
m = re.search(r'const isSelectable = \(ud[\s\S]*?\n    \};', host)
if m and not re.search(r"iconic-trajectory-(marker|launch|label|box)", m.group(0)):
    add('MILESTONE-NOT-PICKABLE', HOST, line_of(host, m.start()), 'isSelectable accepts the Today marker only; encounter markers and labels are hover-only')

# IM6: one panel for every iconic craft
for f in ['src/routes/explore/HudControls.svelte', HOST]:
    s = read(f) or ''
    for mm in re.finditer(r'INTERSTELLAR_CRAFT\.has|interstellarCraftIds\.has', s):
        add('CRAFT-PANEL-FORK', f, line_of(s, mm.start()), 'a craft routes to the MessagePanel instead of the MissionPanel')

# INDEX = canvas click = focus, at every scale (UXD-017 deferred this to C1)
for fn in ['selectMilkyWay', 'selectLocalGroup', 'selectLocalSheet', 'selectVirgo', 'selectLaniakea', 'selectCosmicWeb']:
    body, ln = func_body(host, fn)
    if body is None:
        add('FUNNEL-MISSING', HOST, 1, f'{fn} not found')
    elif not re.search(r'focusMember|frameMember|focusPin|focusOnPin', body):
        add('OUTER-NO-FOCUS', HOST, ln, f'{fn} highlights and opens the panel but does not move the camera')
for fn in ['resetLocalSheetView', 'resetVirgoView', 'resetLaniakeaView', 'resetCosmicWebView']:
    if not re.search(r'function ' + fn + r'\b', host):
        add('OUTER-NO-RESET', HOST, 1, f'{fn} missing: after a focus there is no way back to the entry framing')
body, ln = func_body(page, 'selectIndexRow')
if body is not None and not re.search(r'ensureKind|showKind|layerFor', body):
    add('ROW-HIDDEN-KIND', PAGE, ln, 'a row of a kind whose chip is off selects an invisible body')

# Tests, docs, decision record
if read('tests/e2e/select-focus.spec.ts') is None:
    add('NO-SPEC', 'tests/e2e/select-focus.spec.ts', 1, 'file missing')
if not [p for p in glob.glob('docs/uxs/decisions/UXD-*') if 'select' in p.lower() and 'focus' in p.lower()]:
    add('NO-UXD', 'docs/uxs/decisions', 1, 'no UXD for select = focus')
for f, pat in [('docs/uxs/decisions/UXD-017-one-index-on-every-scale.md', r'no camera move|a camera move on select'),
               ('docs/adr/TA.md', r'no camera move')]:
    for i, line in enumerate((read(f) or '').splitlines(), 1):
        if re.search(pat, line):
            add('DOC-STALE', f, i, line)
if not re.search(r'select\s*=\s*focus', read('docs/uxs/UXS-014.md') or '', re.I):
    add('DOC-MISSING', 'docs/uxs/UXS-014.md', 1, 'UXS-014 "Selecting & understanding an object" does not state select = focus')

for k, f, l, t in V:
    print(f'{k:24} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in V)))
print(f'C1-CHECK violations: {len(V)}')
```

Known limits: the script reads names and patterns, not rendering; `select-focus.spec.ts` and the screenshots are the second net; `MISSION-ORDER` reads the year as the first four-digit number in the en-US text; `OUTER-NO-FOCUS` accepts any call named `focusMember`, `frameMember`, `focusPin`, `focusOnPin`. It has no tests of its own; the text above was extracted and run: `python3 c1-check.py` → `C1-CHECK violations: 50`.

## 7. Allow-list (not touched, with reason)

- `frameStar` and `gotoStar` (host `:1597–1617`): already focus; they move under `focusMember` only if the neighbourhood joins it (Q6 recommends keeping them).
- `enterDeepSky` immersion (host `:1500`): a takeover with its own approach tween.
- The 2D selection drawing: not read (§13); C1 adds no 2D ring.
- Ruler `firsts` links (18 rows): C5. Ruler bands, hover and thumbnails: C4.
- `RegimePanel` list markup and the iconic legend markup: A4 allow-listed; C1 changes what they call, not how they look.
- Planet and body panels' internal layout, hero, actions: B1, B3, C10.
- `Panel` stack and back chain (`card-chain.svelte.ts`): read, not changed (§13).

## 8. Tests, docs, locales

**Unit (vitest, colocated):** `src/lib/explore/body-ref.test.ts` (ladder: sun, 9 planets, Pluto, moons, belts, 3 unknown ids; `chipOf` for every small-body type; `isBodyInScene` for the 20 residents: 16 true, 4 false); `missions-linkify` newest-first over all 15 lists plus a locale with a different digit script (guards the permutation); `iconic-trajectory` contract test (`userData.missionId` and `kind` on markers and labels); `scale-shell-controller.test.ts` Pluto case.

**E2E (new `tests/e2e/select-focus.spec.ts`, all three projects, `--workers=1`):** for ids `jupiter`, `ceres`, `halley`, `io`, `asteroid-belt`: scene click or INDEX row or resident leaves panel open, ring visible (dev hook reading the bridge) and camera target within 1 unit of the body after 700 ms; chip off clears for PLANETS (planet, moon), DWARFS, COMETS, ISM; PATHS off closes a path-selected mission; select with chip off turns it on; the 4 unresolved residents render no button; Pluto opens one panel from canvas, INDEX, resident, URL; at each of 5 outer scales an INDEX row moves the camera and Reset restores it; a milestone marker click opens its mission; New Horizons per Q2; mission lists newest first.
**Changed:** `explore-message-panel.spec.ts` (Q2), `scale-index.spec.ts` (rows also assert camera), `explore-iconic-keyboard-nav.spec.ts`, `perf-explore-iconic-clicks.spec.ts` (more raycast targets), `explore-deeplinks.spec.ts`, `explore.spec.ts`, `chip-row.spec.ts`, `satellites.spec.ts`, `a11y-keyboard.spec.ts`.
**Visual baselines:** none affected. Only `explore-hub-grid` has baselines for Explore (`tests/e2e/visual.spec.ts:206–208`); `grep -l toHaveScreenshot tests/e2e/*.ts` lists `visual.spec.ts` only.

**Docs (say the new rule, link the C1 UXD):** `docs/uxs/UXS-014.md` "Selecting & understanding an object" (select = focus), `docs/uxs/decisions/UXD-017` (Decision line "no camera move" and Consequences "a camera move on select": superseded, say so), `docs/adr/TA.md:48` and the /explore v2 section, `docs/accessibility.md:17`, `AGENTS.md` (a Design System line "Select = focus"), `src/routes/explore/README.md`, `src/lib/explore/README.md` (`body-ref.ts`), `docs/uxs/CHANGE-INVENTORY.md:40` (status, decision id), `docs/uxs/IA.md` (interaction). New UXD: next free id (018 at HEAD; the B1 and B2 drafts carry 017 and 015, both taken).

**Locales:** none if Q4 keeps the tooltip; if asteroids move to DWARFS, `explore_layer_tip_dwarfs` and `explore_layer_tip_interstellar` change in 14 locales through the glossary tools. If Q2 adds a "Message" section title, the existing `explore_msg_carries_label` is reused. `validate-data` green.

## 9. Screenshots for the operator (dev server per AGENTS "Iterating on UI", not Docker; small shots, desktop 1440 × 900 and phone 390 × 844, before = HEAD)

1. `/explore` click Ceres, Halley, Io, the asteroid belt: ring and camera, side by side. 2. INDEX rows Ceres, Ganymede, Asteroid belt. 3. Mars selected, then PLANETS off; then DWARFS off with Ceres selected. 4. The Belt ruler pane: Ceres and Vesta linked, Pallas and Hygiea as text; Kuiper: Pluto, Quaoar. 5. Pluto from canvas, INDEX, resident, `?id=pluto`. 6. Mars panel, Missions tab, before and after order; one link opening in place. 7. `?context=local-group` INDEX row Andromeda before and after; Reset. 8. A milestone box click on Voyager 2's Uranus encounter; New Horizons row. 9. `de` and `ar` for the Belt pane.

## 10. Order of work

1. B1 lands first (panel shell). 2. `body-ref.ts` + test (red first). 3. Host `focusBody`, bridge fields, ring cases. 4. `selectBody`, residents, BeltPanel. 5. Chip rule and the chip map. 6. Mission links and order. 7. Iconic pick. 8. Outer `focusMember` and resets. 9. Worlds drop rules. 10. Docs, UXD, spec. 11. `c1-check.py` → 0; targeted specs on three projects; sheets. `npm run preflight` once before the push.

## 11. Decisions and open questions (operator), recommendation first

1. **Mission link in a body panel (plan Q4).** Recommended: a mission id opens the MissionPanel in place (`iconic.openMission`), a fleet id navigates to `/fleet?id=`; the planet stays selected and the panel back chip returns to it. Alternative: always navigate to `/missions?id=` (today).
2. **IM6: which panel do the five outbound craft open.** Recommended: the MissionPanel for all 18 rows; the message (heading, signal, culture door) becomes a section of the MissionPanel for the five, the `MessagePanel` is deleted, `explore-message-panel.spec.ts` is rewritten. Alternatives: keep the `MessagePanel` for the five and add nothing (the operator's complaint stands); change New Horizons only (inconsistent with Voyager and Pioneer, which behave the same).
3. **Pluto.** Recommended: one panel everywhere, the small-body panel (richer sections, as the ladder's own comment says); the scene body is the planet-style mesh, which takes the ring and the focus. Alternative: the planet panel everywhere (loses the curated sections).
4. **Which chip owns asteroids and Arrokoth.** Recommended: DWARFS, in 2D and 3D, with the DWARFS tooltip reworded in 14 locales to name asteroids; ISM then hides only ʻOumuamua. Alternatives: keep them on ISM and add the gate to 2D; a sixth chip (new control, A5 row grows).
5. **Chip rule.** Recommended: off clears the selection of that kind; selecting a row, link or id of a hidden kind turns its chip on; the same rule on Worlds (ORBITERS clears a selected orbiter, TRAVERSES a selected traverse). Alternatives: rows of hidden kinds disabled; select without showing.
6. **Camera at the outer scales.** Recommended: pan to the member and ease zoom to 0.6 × the entry distance, a Reset on all eight scales (4 added). Alternatives: pan only; no camera (today).
7. **Panel-aware framing.** Recommended: yes, the focused object centres in the space left of the open panel, one helper shared with D1 (W3); whichever slice lands first builds it. Alternative: centre on the whole viewport (at a 768 px window the 400 px panel covers x from 368 px, and the viewport centre is x 384 px: the object sits under the panel's edge).
8. **Member deep links.** Recommended: yes, one `?pick=<id>` read with `?context=` for the five scales without a link, mirrored both ways like `?galaxy=`; existing params untouched; the entity pages of the deep levels use it. Alternative: defer again (the INDEX rows stay unshareable).
9. **Black holes without a pin.** Recommended: M87* focuses the Virgo Cluster pin (it sits at its centre), Cygnus X-1 gets a Milky Way pin placed from its `ra`, `dec`, `dist_ly` (data present: `black-holes.json`), Gargantua selects the panel with no pin. Alternative: panel only for all three.
10. **Belt selection.** Recommended: particles brighten while selected and the camera frames the ring; no new ring or icon. Alternative: a thin ring at the belt mid-radius.
11. **Mission list order.** Recommended: sort newest first in code from the en-US years, permutation applied to every locale. Alternative: edit the 15 lists in the data (locale overlays reorder in 13 files each).
12. **IM5 and C7.** Recommended: C1 makes today's markers and labels pickable and fixes the `userData` contract; C7 re-skins the same sprites and keeps it. Alternative: IM5 moves into C7 (one author, one pass), and C1's acceptance drops IM5.

## 12. Acceptance (definition of done, per the plan)

1. `python3 c1-check.py` prints `C1-CHECK violations: 0`.
2. §8 docs state the rule; UXD written; CHANGE-INVENTORY row C1 updated.
3. `body-ref.test.ts`, `missions-linkify` and iconic contract tests green; `select-focus.spec.ts` and the touched specs green on `desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`; nothing skipped.
4. 14 locales carry any changed tooltip; `validate-data` green.
5. §9 sheets shown to the operator; the lead has read the checker's evidence.

## 13. NOT VERIFIED (what this brief did not check)

- NV1 No browser, build or test run. Camera distances (§4.2), ring radii, the 0.6 × zoom (§4.8) and "700 ms" are arithmetic or starting values; none was seen on screen.
- NV2 The 2D view: whether a selection ring is drawn for planets and small bodies in 2D was not read (host `:3095–3137` picks; the drawing code was not opened). Whether 2D shows a ring for any kind is unknown.
- NV3 "Some planets" (E5) is explained by Pluto (read in code); no other planet was shown to fail. A pick that lands on a `planetPickAid` instead of the mesh was not traced.
- NV4 Mission-link counts (`c1-missions-order.py`) approximate the linkifier (which also matches localised names, `missions-linkify.ts:66–112`). Whether year digits survive in all 13 overlays (the permutation relies on the en-US order) was not checked.
- NV5 Opening a mission in place from a planet panel: how two panels stack on desktop and phone, and what the B1 header bar back chip does for a non-URL card, was not read (`Panel.svelte`, `card-chain.svelte.ts`). `iconic.openMission` was read, not run for a non-trajectory mission.
- NV6 Whether Pallas, Hygiea, Quaoar and Sedna can enter the scene as data (orbit elements, panel text, 14 locales) is a content decision; not costed. Making them plain text is code only.
- NV7 `getInterstellarCraft`, the `MessagePanel` culture-door cards and every consumer of `InterstellarCraft` were not traced for the Q2 move; `explore-message-panel.spec.ts` assertions beyond lines 36–74 were not read.
- NV8 The `ISM` mapping of asteroids and Arrokoth in 3D is read from `else` branches (host `:3810–3817`); the chips and meshes were not checked in a running scene.
- NV9 Camera behaviour at the outer scales: `LG_CAM_R_MIN`, the zoom ceilings and the crossing rule (zoom out past a limit changes scale) were read for names only; a focus that moves `focusOrigin` off zero near a crossing threshold was not simulated. The crossing uses `camR` alone (read at `:1041–1073`). `stepCrossDolly()` (host `:4159`, flag `dollyActive`) animates `camR` during a crossing; its interaction with a focus tween was not read (`frameStar` sets `dollyActive = false`, `:1609`).
- NV10 Worlds: whether SURFACE (the cycling chip) or the traverse chip need a clear rule beyond ORBITERS and TRAVERSES was not read.
- NV11 `?pick=` (Q8) vs the existing URL guards (`createUrlGuards`, `explore-url-sync.svelte.ts`): conflicts with the `?galaxy=` mirror were not checked.
- NV12 `static/data/black-holes.json` has `ra`, `dec`, `dist_ly` for Cygnus X-1; the conversion to a Milky Way schematic pin position was not worked out (scale-index brief §6 has the same gap).
- NV13 The 11 e2e specs listed in §8 were named from `grep`; their assertions were not read for dependence on the unchanged behaviours.
- NV14 `c1-check.py` ran at baseline (HEAD and the working tree both print 50); the 50 were not each read beyond the listing; the check matches names, so a renamed funnel (`selectBody`) is accepted only through the regexes in the script.
