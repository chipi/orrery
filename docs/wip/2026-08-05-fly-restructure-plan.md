# `/fly` restructure — implementation plan (RFC-036)

*2026-08-05 · plan for RFC-036 · WS-A = #440 · WS-B = #441 (blocked-by #440) · WS-C = #443 (/explore)*

The detailed, sliced execution plan for RFC-036. Read the RFC first for the *why*
and the seam contract (§4). This doc is the *how* + the order. Every slice ends
green (typecheck + relevant tests) and is a small, revertible commit.

## Pickup state (2026-08-05, for a fresh session or resume)
- **Branch:** `content` = `origin/main` + 3 unpushed commits (RFC-036 docs · #274 launch-list content-visibility · #419 2-DOF descent). Working tree clean; **preflight green**.
- **origin/main:** `d61b9eb6ff` (the ADR-084 data.ts decomposition + architectural-review fixes R2–R8, docker-e2e-green). Operator has parallel work landing on main — **rebase `content` onto `origin/main` + re-preflight before push**, and **hold for the operator's explicit push green-light**.
- **Done this arc:** architectural-review R1–R8 (R1 = this RFC, not yet built); issues closed #439/#327/#77/#274/#419 + mobile-AR cluster folded into #442.
- **NEXT = WS-A slice A0** (below): read `/fly/+page.svelte`, enumerate the phase state (flags, transitions, deep-links, scrub→phase), freeze the `FlightPhaseState` contract. No context from the originating chat is required — RFC-036 + this doc + issues #440/#441/#443 are self-contained.

**Guard rails (both workstreams):**
- Byte-identical behavior — no visual/timing/UX change. Parity is the gate, not a nicety.
- After every slice: `npm run check` (0 errors) + the slice's tests. Before each push: `npm run preflight` (+ `preflight:coverage` since we add lib code).
- Prod-live file → each slice lands behind green `/fly` e2e + a manual per-act browser confirm.
- Capture pre-refactor reference screenshots FIRST (flyby-hero, cislunar, ascent, coast, descent, recovery) — the visual-diff baseline for "byte-identical."

---

## Workstream A — Phase controller (#440)

Goal: the phase state machine becomes a pure, unit-tested `$lib/fly/flight-phase-controller.ts`; `+page.svelte` derives its phase flags from it. **No scene/WebGL change in WS-A.**

### A0 — Map + freeze the contract (read-only, no code change)
- Enumerate in `+page.svelte`: every phase flag (`showLaunch`/`showCoast`/`showDescent`/`showRecovery`/`openingActive`), `viewMode`, `isMoonMission`, the `phase` derived (`ascent`/`coast`/`cruise`/`descent`), every transition fn (`startLaunch`, `startDescent`, `handleTouchdown`, `skipOpening`, `masterTogglePlay`, `masterSetSpeed`, `onMasterScrub`), the deep-link effects (`?launch`/`?descent`), and the scrub→phase mapping (`scrubberToPoint`).
- Write the exact `FlightPhaseState` in/out contract (RFC §4) as a TS interface + a truth-table of transitions. **Deliverable: the interface file + a markdown transition table appended here.**

### A1 — Pure controller module
- Create `$lib/fly/flight-phase-controller.ts`: a factory `createFlightPhaseController(config)` returning `{ state, dispatch(event), setInputs(...) }` — pure, no svelte/three/dom.
- Port the transition logic 1:1 from the mapped functions. Inputs: deepLink, scrubU, mission flags (isMoonMission, earthCoast, launchAvailable, descentAvailable), event times (secoT, coastDur, launchDurationS), clock. Outputs: `act`, `viewMode`, `activeScene`, phase-derived flags.
- No behavior invented — every branch mirrors current `+page.svelte`.

### A2 — Unit tests (the bug-catching net)
- `flight-phase-controller.test.ts` covering: crewed/suborbital → `ascent` (NOT heliocentric cruise) [the earth-orbit bug]; `isMoonMission` → cislunar vs heliocentric; scrub-U → act mapping across the whole scrubber; `?launch=1` / `?descent=1` deep-link entry; touchdown → `recovery`; opening → skip; ascent-complete → coast (earthCoast) vs cruise. Assert the transition table from A0.
- Coverage-gated (pure lib → counts toward the frozen thresholds).

### A3 — Wire the page to the controller
- `+page.svelte` instantiates the controller; the scattered phase booleans become `$derived` from `controller.state`. Transition fns call `controller.dispatch(...)`.
- Move the ordering-sensitive phase state into the controller's deterministic init → the TDZ hazard *class* for phase state is removed.
- **No scene code touched.** The `onMount`/scene layer keeps reading the same flags (now controller-derived).

### A4 — Verify + land
- `npm run check` 0 errors; `preflight:coverage` green; `/fly` Playwright e2e green.
- Manual browser: launch→coast→descent (earth mission), a cislunar moon mission, a flyby, deep-links `?launch`/`?descent`. Confirm byte-identical vs the A0 baseline screenshots.
- Commit per slice; push when the block is green + operator says go.

**WS-A done when:** controller is the single source of the active act, tests cover the session's bug cases, page flags derive from it, e2e green, behavior identical.

---

## Workstream B — 3D scene decomposition (#441, blocked-by #440)

Goal: the ~4,870-line `onMount` becomes a `fly-scene-host` + the existing `fly-*-scene` modules; the page `onMount` drops to < ~600 lines of wiring. Driven by the controller's `act`/clock (the WS-A seam).

### B0 — Map the onMount closure (read-only)
- Partition `onMount` (2486→7360) into: (a) renderer/host setup, (b) heliocentric scene assembly, (c) cislunar scene assembly, (d) inline scene objects (moon-frame groups, phase lines, markers), (e) the `onFrame` body, (f) input listeners, (g) cleanup. Note what already delegates to `fly-helio-scene`/`fly-cislunar-scene`/`fly-updaters` vs what's inline.

### B1 — Define `fly-scene-host` interface
- `$lib/three/fly-scene-host.ts`: `createFlySceneHost(container, opts) → { setAct(state: FlightPhaseState), frame(state), dispose() }`. One-way: host reads controller state, renders; reports frame events (touchdown, ascent-complete) via callbacks (RFC §4). No phase logic in the host.

### B2 — Extract heliocentric scene assembly
- Move inline helio scene-build out of `onMount` into a scene module. Testable via a jsdom scene/dispose harness.
- **B2a — LANDED (`c99e1127ee`).** The genuinely-pure, self-contained builders → `$lib/three/fly-helio-overlays.ts`: `buildTubeGeometry` / `buildTubeMaterial` (the manual-cross-section trajectory tube + bright/dim shader), `buildSpacecraftSprite` (the CanvasTexture glyph), `buildEnginePlume`, `drawLabelTexture` / `buildLabelSprite`. ~250 lines out; 8-case jsdom smoke test; coverage-excluded like every sibling WebGL builder; helio cruise renders byte-identical, zero console errors.
- **B2b — the reactive-coupled overlay meshes (SoI rings, gravity/velocity/centripetal arrows, coast line, apsides markers, moon mesh, anchor markers) — DEFERRED into B4, by a discovered constraint, NOT dropped.** Tracing the couplings (2026-08-05): three of these overlays share **frame-written mutable state** with the `onFrame` body — `soiLayerOn` (written by the SoI listener, read each frame at page:6230 for the per-frame Mars/Moon-SoI visibility split), `cinemaForceMoons` (written by the frame loop at ~4200, read by the moons listener), and `scModel` (written by `applyMissionSpacecraftModel`, read each frame at ~5895). Extracting their *construction* while the frame loop still lives in the page would force a **bidirectional shared-flag handle** across the module boundary — precisely what B1's one-way seam contract forbids. Their correct home is B4's scene host, where construction co-locates with the per-frame update it shares state with and the flags become host-internal. Folding them into B4 is sound sequencing (total "all helio inline out of onMount" still lands across B2a + B4), not scope reduction.

### B3 — Extract cislunar scene assembly
- Same for the cislunar scene (moon-frame group, phase-line tubes — trajectory-tube radius logic already extracted in R2) into `fly-cislunar-scene`.
- **LANDED (`a6bc66a58f`).** Pure cislunar builders → `$lib/three/fly-cislunar-overlays.ts`: `buildCislunarStarField`, `buildCislunarLineMaterial` (+ `CISLUNAR_PHASE_COLORS` / `LUNAR_LOCAL_PHASE_TYPES`), `buildCislunarSpacecraftSprite`, `buildAnnotationSprite`. 6-case jsdom smoke test; coverage-excluded. Apollo 11 cislunar scene renders byte-identical (star field + TLI trajectory + spacecraft sprite), zero console errors. The reactive-coupled machinery (`ensureCislunarPhaseLine` over the phase-line Map + moon-frame group, `rebuildCislunarAnnotations` over the live trajectory/mission, the layer listeners, the per-frame updaters) stays in the page → B4.

> **Checkpoint (2026-08-05):** WS-A complete + verified; B0/B1/B2a/B3 landed. Full unit suite green (`vitest run src/lib/{fly,three,orbital}` → 1185 passed). All committed on `content`, unpushed. **Remaining B4/B5 = the deep frame-loop surgery** — implement `createFlySceneHost` to move the ~1,670-line `onFrame` + the reactive-coupled overlays (which bidirectionally read/write page `$state`: HUD readouts, `phaseMarkerScreens`, `simDay`, camera-orbit state). Highest-risk slice; gated by the full B6 e2e-both-projects + visual-diff.

### B4 — Extract `onFrame` into composed updaters
- Decompose the per-frame body into keyed updaters (helio-frame, cislunar-frame, ascent/coast/descent handled by their existing scenes). `frame(state)` dispatches by `state.act`. Preserve the exact per-frame math (dt clamp already via `createAnimateLoop` from R7).
- **B4 frame-logic extractions — LANDED (all byte-identical, coverage-counted, deterministic-MET screenshot-verified):**
  - `ff9d7738b8` **fly-frame-selectors** — `pickVisibleMilestones` + `fdLegProgress` (the milestone past/active/future + FD leg-relative-progress brains). 9 tests.
  - `b6da55e869` **fly-frame-projections** — `makeProjectorFactory` + `buildPhaseMarkerScreens`/`buildFdPhaseMarkerScreens`/`buildMilestoneScreens` (the HUD-overlay projection assembly; the 3 render types + `FdStage` moved here). 7 tests. Cassini @ MET 800 before/after = identical (same trajectory/markers/FD banner/milestones).
  - `c6c00a15be` **fly-frame-coast** — `sampleForwardArc` (helio spline forward-walk) + `integrateEarthCoastPreview` (cislunar two-body Euler integrator). 6 tests.
  - `1dec2994a8` **fly-frame-burn** — `findActiveBurn` + `burnExhaustDir` + `BURN_TABLE` (engine-plume burn selection + exhaust direction). 9 tests.
  - The THREE screen-projection / geometry-swap / mesh-application glue stays in the frame body (uses the extracted `helioAuToScreenPx`/`eciKmToScreenPx` helpers).
- **STRUCTURAL TEARDOWN — STARTED, pattern PROVEN (`db499bcff5`).** Earlier this doc called the reactive-coupled extraction "blocked" by the frame-written shared flags (`soiLayerOn`/`cinemaForceMoons`/`scModel`). **That was wrong — timidity, not a real wall.** The helio reactive overlay layer (SoI rings, gravity/velocity/centripetal arrows, coast line, apsides markers + `recomputeApsides`, moon mesh, all 10 science-layer listeners) is now out of `onMount` in `$lib/three/fly-helio-reactive.ts`. The proven pattern for the bidirectional coupling:
  1. **Shared mutable flags → handle properties** (`get`/`set` over factory-internal `let`s). Listeners close over the internal state; the frame loop reads/writes `helioReactive.cinemaForceMoons` etc. — shared by reference, no snapshot.
  2. **Scene refs → destructure the handle back into the same local names** → the per-frame body is unchanged except the handful of flag accesses.
  3. **Live reactive reads → getter deps** (`getIsMoonMission`/`getSimDay`/…).
  4. **Typecheck-guided**: move the code, fix every `Cannot find name` → nothing breaks silently.
  Verified: `check` 0 · 1216 unit · helio+cislunar+ascent 0 console errors · **/fly e2e 108 passed** (the science-layer gate). `+page.svelte` 10,261 → 10,068. The same pattern now applies to the remaining chunks (cislunar reactive layer, then the frame loop itself).
- **BOTH reactive layers now extracted (`db499bcff5` helio + `b2a2722754` cislunar).** The cislunar reactive layer (per-phase trajectory tubes + `ensureCislunarPhaseLine` + moon-frame group, ∆v annotations, spacecraft marker, 7 layer subscriptions, and the four per-frame updaters `rebuildCislunarLines`/`updateCislunarLineProgress`/`updateCislunarSpacecraft`/`rebuildCislunarAnnotations`) is now in `$lib/three/fly-cislunar-reactive.ts` via the same handle-return + destructure-back pattern (`cislunarPhaseLines` exposed on the handle for the frame's zoom-invariant thickness pass; `arcTimeline`/`mission` as getter deps). **`+page.svelte` 10,890 → 9,792 — 1,098 lines out, ~10% of the god-file, both coupled layers done, `/fly` e2e green (108 + 90 passed across two runs).**
- **Per-mission helio overlays extracted (`2549bbc15b`).** Trajectory tubes, `applyMissionSpacecraftModel` (+ rim-light shader), LAUNCH/ARRIVAL/RETURN anchor rings, moon orbit ring, label sprites (`refreshSpriteTextures`) → `$lib/three/fly-helio-mission.ts`. The mesh refs are *assigned* into the component-scope `let`s the mission-swap `$effect`s reference (so those stay unchanged); `scModel` is a handle getter. `/fly` e2e 106 passed. **`+page.svelte` now 9,587 — 1,303 out, ~12%.**
- **What's left in `onMount` = the frame+camera subsystem (~2,100 lines).** All scene-layer *construction* is now extracted; the remainder is the `createAnimateLoop` frame body (~1,460 lines) + `updateCam`/`updateCislunarCam`/`helioResetCamera`/`panActiveCamera`/`draw2d` (~600 lines) + the camera-orbit state they share. This needs the **bridge pattern** (getter/setters over the ~18 component `$state` vars the frame writes — `simDay`/`isPlaying`/opacities/etc.) because a module can't write component `$state` directly — distinct from the handle-property pattern the scene layers used. Highest-risk single move; a focused fresh pass.
#### 1a — camera subsystem: **LANDED (`e107795f76`)**
The ~1,008-line camera + cinematic-camera subsystem is now in `$lib/three/fly-camera-controller.ts` (`createFlyCameraController(deps)`). Done via **verbatim extraction** (perl-spliced the region into the module — zero hand-reproduction over 1,000 lines) + **typecheck-guided dep-retargeting** (live reads → `deps.get*()`; scene refs by reference; frame-shared output-state on the returned handle; `currentDestMeshId` via getter/setter dep). The frame loop + input handlers call `flyCam.updateCam()` etc. and read/write `flyCam.camR` etc. **Verified byte-identical: check 0 · 1216 unit · eslint+prettier clean · deterministic-MET screenshots pixel-match the pre-teardown baseline · /fly e2e 148 passed (incl. `fly-iconic-peakhold` = the flyby cinematic composition).** `+page.svelte` 9,587 → **8,649 (~20.6% out)**. Boundary lessons for next time: object shorthands/keys (`{ camR }`, `camTarget:`) must not be blind-prefixed; the region swept up page-owned state (montage cut-detection, flyby constants, drag) that had to be returned to the page.

#### (superseded scope note — kept for the record)
- **Exact region:** `+page.svelte` lines **2874–3881** (~1,008 lines) — the camera-orbit + auto-zoom state + `updateHelioAutoZoomTargets` (337) · `updateCam` (155) · `updateAutoZoomTargets` (155) · `updateCislunarCam` (60) · `helioResetCamera` (40) · `panActiveCamera` (20). The heavy math is already in `$lib` (`computeIconicFrame`, `computeHelioNonFlybyFrame`, `buildArrivalComposition`, `planCislunarHeroShot`, `computeCislunarCameraTarget`, …); what remains is **coupled orchestration**, not pure logic.
- **Dep surface (~33 symbols):** refs `camera`(×86)/`scene`/`cislunarCamera`/`cislunarSpacecraft`/`helioHandles`/`flyUpdaters`/`helioReactive`/`cine` ; live getters `simDay`/`simSpeed`/`viewMode`/`isMoonMission`/`activeDestination`/`mission`/`arcTimeline`/`outPts`/`retPts`/`cislunarTrajectory`/`epilogueActive`/`openingActive`/`openingStartedAt`/`openingDurationMs`/`montageEnabled`/`camSnapUntil` ; **output-state read by the frame + other effects** `currentDestMeshId`/`montageShotFrame`/`montageShotKind`/`lastHelioSubPhase`/`helioFlybyDesiredCamT` (must become controller properties, per-reader rewire) ; ~30 module imports.
- **Approach (de-risked):** **verbatim-extract** the region (snapshot at `/tmp/cam-region.txt`) into `$lib/three/fly-camera-controller.ts` inside `createFlyCameraController(deps)` — no hand-reproduction — then find-replace-retarget the deps (`simDay` → `deps.getSimDay()`, refs destructured, output-state as controller props), typecheck-driven imports, then wire the page (frame calls `cam.updateCam()` + reads `cam.camR`/`cam.currentDestMeshId`; handlers call `cam.pan()`/`cam.reset()`). **Gate: typecheck + `/fly` e2e + deterministic-MET screenshot-diff (before/after at fixed MET must match — this is what catches subtle cinematic drift). Revert the chunk if any framing drifts.**
#### 1b — frame body + draw2d: SCOPED (post-1a), ready for a focused pass
- **Regions:** the `createAnimateLoop({ onFrame })` body = `+page.svelte` **3600–5069** (~1,470 lines) + `draw2d` **3096–3562** (~466 lines, the 2D-fallback renderer; its `c2`/`ctx2`/`cis2d*` state at 3077–3095 is self-contained — the frame never touches it) = **~1,940 lines**, larger than 1a.
- **Cascade:** the frame's only page-inner-fn call is `draw2d` (everything else is imported helpers or the already-wired `flyCam.*`). So frame + draw2d + their 2D state move as one unit.
- **The bridge (new vs 1a):** the frame *writes* 19 component `$state` vars the **template binds to** — `simDay isPlaying launchT descentT coastMetDays openingTitle/Context/FleetOpacity epilogueActive epilogueCaptionOpacity finaleBlack/CaptionOpacity cutBlackOpacity inMissionFinale inCinematicHeldBeat conicStateCislunar debugCamWorld debugCamTargetWorld debugMontageShot`. A module can't write component `$state`, so build a `bridge` of getter/**setters** over these + getters for the reads, pass to `runFlyFrame(bridge, refs)`. Its failure mode is the whole `/fly` UI's reactivity (not just camera framing), so the gate is the full B6 (e2e both projects + screenshot-diff).
- **Approach:** same as 1a — verbatim-extract the two regions into `$lib/three/fly-frame-runner.ts`, retarget deps (`$state` reads → `bridge.get*()`, `$state` writes → `bridge.set*()`, refs by reference), typecheck-guided, then the page's `createAnimateLoop({ onFrame: () => runFlyFrame(...) })`. Watch the 1a boundary lessons (object shorthands/keys must not be blind-prefixed).
- **After 1b:** `onMount` drops to scene-assembly wiring — the RFC's `<600` B5 goal.
- **B4-hard + B5 — REMAINING (the deep surgery, now un-blocked).** Implement `createFlySceneHost` (contract frozen in B1) and move the rest of the ~1,670-line `onFrame` orchestration + the reactive-coupled overlays (helio SoI/gravity/apsides/arrows/markers/moon-mesh construction from B2b, plus the cislunar `ensureCislunarPhaseLine`/`rebuildCislunarAnnotations`/per-frame updaters) into it, so construction co-locates with the per-frame update it shares mutable flags with (`soiLayerOn`, `cinemaForceMoons`, `scModel`) and those flags become host-internal. This is the one part that isn't a clean one-way extraction — the frame body reads AND writes page `$state` the template binds (HUD readouts, `phaseMarkerScreens`, `simDay`, camera-orbit state) — so it must land behind the full **B6 gate** (e2e desktop **and** mobile + flyby/cislunar visual diff), not the targeted per-slice checks used for the pure extractions above.

**Extraction tally so far (all pure/cleanly-separable pieces done):** `+page.svelte` 10,890 → 10,489 lines; 5 new modules — `flight-phase-controller` (177) · `fly-frame-selectors` (99) · `fly-helio-overlays` (371) · `fly-cislunar-overlays` (229) · `fly-scene-host` contract (137). 44 new unit tests + the WS-A 116-spec e2e. Every cleanly-separable pure unit is now out + tested; what remains (B4-hard/B5) is the bidirectionally-coupled frame orchestration.

#### B4-hard reconnaissance (done 2026-08-05 — the foundation for the move)
- **Visual baseline captured** (`/tmp/fly-baseline/`, all 0 console errors): `helio-cruise-cassini` @ MET 800 + 2500, `cislunar-apollo11` @ MET 2, `ascent-friendship7`, `descent-curiosity`, `helio-cruise-juno` @ MET 400. Drive with the `window.__flySetSimDay(met)` hook for reproducible sim moments → diff after the move. (Local diff is manual; Playwright `toHaveScreenshot` baselines are amd64/CI-generated per the visual-baseline rule.)
- **Frame loop = lines 5246–6895** (`createAnimateLoop({ onFrame })` → `loop.start()`), ~1,650 lines.
- **The write-back seam** (`$state` the frame loop assigns → the context setters `createFlySceneHost` must expose so the host can push results back to the page/template): camera-orbit (`camR`/`camP`/`camT`/`camSnapUntil`/`cinematicFreeze`), clock (`simDay`/`isPlaying`/`descentT`/`launchT`/`coastMetDays`/`moonDriftSec`/`lastTime`), opening+finale opacities (`openingTitle/Context/FleetOpacity`, `epilogueActive`/`epilogueCaptionOpacity`/`epilogueStartedAt`, `finaleBlack/CaptionOpacity`, `cutBlackOpacity`, `inMissionFinale`, `inCinematicHeldBeat`), HUD projections (`phaseMarkerScreens`/`milestoneScreens`/`fdPhaseMarkerScreens`), debug (`debugCamWorld`/`debugCamTargetWorld`/`lastMontageShotKind`), conics (`conicStateCislunar`). ~20 template-bound vars → this is why the move needs a `FlyFrameContext` (getters for reads + setters for these writes), NOT a one-way seam. Camera-orbit + `lastTime`/`moonDriftSec` are host-internal candidates (page never reads them); the rest are genuine write-backs.
- **Move shape:** `assembleFlyScene(container, ctx) → refs` (renderer + both scenes/cameras + all overlay meshes, ~1,500 lines from onMount) then `host.frame(ctx)` = the 1,650-line body reading refs + `ctx` getters, writing `ctx` setters. Page `onMount` → create host, wire listeners, register cleanup (< ~600 lines, B5). Land behind the full B6 gate.

### B5 — Thin the page
- `+page.svelte` `onMount` reduces to: create host, subscribe controller → host, wire listeners, register cleanup. Target < ~600 lines; no inline `new THREE.*` scene assembly left.

### B6 — Verify + land
- `/fly` Playwright e2e green desktop **and** mobile; visual diff vs B0 baselines on flyby-hero + cislunar + each act; dispose-leak test green; manual per-act confirm.
- Commit per slice; the TDZ hazard is structurally gone (no giant order-coupled closure).

**WS-B done when:** onMount < ~600 lines, scene assembly + frame updates live in `fly-*` modules, e2e green both projects, visual parity confirmed, TDZ class eliminated.

---

## Sequencing + status
1. **Blocked until:** the in-flight `main` push (ADR-084 + review fixes) is docker-e2e-green + stable. ✅ (green).
2. WS-A (A0→A4) — #440, land + validate.
3. WS-B (B0→B6) — #441, land + validate.
4. **WS-C — #443 (`/explore`, RFC-036 §8):** apply the SAME pattern (scale-shell controller + explore-scene-host) after /fly proves it. Its own sliced plan gets written when WS-A/WS-B are done and the seam is proven — not detailed here to avoid designing against an unproven seam.
5. Close #440/#441/#443 referencing RFC-036; update TA.md §fly + §explore to the new architecture.

---

## A0 — the frozen /fly phase contract (mapped 2026-08-05)

**Acts** (what scene is active): `opening · ascent · coast · cruise · descent · recovery`.
`cruise` = the interplanetary/cislunar transfer scene; `viewMode = isMoonMission ? 'cislunar' : 'heliocentric'` selects which. The old scattered booleans map 1:1 to acts:

| act | flag today | scene |
|---|---|---|
| opening | `openingActive` | opening title/fleet overlay |
| ascent | `showLaunch` | LaunchScene |
| coast | `showCoast` (earthCoast only) | CoastScene |
| descent | `showDescent` | DescentScene |
| recovery | `showRecovery` (earth only) | recovery card |
| cruise | none of the above | helio/cislunar transfer |

**Inputs** (mission capabilities, read by the controller): `isMoonMission`, `launchAvailable`, `earthCoast` (getEarthOrbitCoast≠null), `descentAvailable` (profile loaded), `descentBody` (moon/mars/venus/earth), `deepLink {launch, descent, missionMatches}`. Continuous clock (launchT/coastMetDays/descentT/simDay/isPlaying/speeds) stays in the page — the controller owns the ACT, not the clock.

**Transition table** (event → act, with guards):

| # | event (source) | from | guard | to | side-effects |
|---|---|---|---|---|---|
| 1 | `startLaunch` (CTA / deep-link / skipOpening-earthCoast) | opening/cruise | launcher resolves; profile loads | **ascent** | openingActive=false |
| 2 | `?launch=1` effect | opening | wantLaunch & !started & launchAvailable & mission matches | → startLaunch | launchAutoStarted=true |
| 3 | `launchComplete` (LaunchScene onComplete) | ascent | earthCoast? | **coast** (else **cruise**) | coastMetDays=0; isPlaying=true |
| 4 | `coastComplete` (CoastScene onComplete) | coast | — | → startDescent | — |
| 5 | coast auto-cross (animate loop) | coast | coastMetDays≥dur & descentProfile loaded | → startDescent | — |
| 6 | `startDescent` (coast / deep-link / lander arrival) | any | descentProfile loaded | **descent** | showLaunch=false; descentT=0; openingActive=false |
| 7 | `?descent=1` effect | opening/cruise | wantDescent & !started & profile & (no mission or match) | **descent** | descentAutoStarted=true |
| 8 | `touchdown` (DescentScene onComplete) | descent | body=earth → recovery; moon/mars/venus → goto surface | **recovery** / (leave route) | — |
| 9 | `skipOpening` | opening | earthCoast & launchAvailable → startLaunch; else settle | **ascent** / **cruise** | openingActive=false; launchDwellUntil |
| 10 | `scrubTo(phase)` (onMasterScrub) | any | phase∈{ascent,descent,cruise/coast} | that act | sets launchT/descentT/coastMetDays/simDay |

**Bug the tests must catch (the session's earth-orbit regression):** a crewed/suborbital mission (earthCoast≠null) at the opening must route via **ascent→coast→descent**, NOT drop into the heliocentric **cruise** fallback (transitions 3 + 9 gate on `earthCoast`). Deep-links `?launch`/`?descent` (2,7) and touchdown→recovery (8) are the other must-test edges.

**Contract:** the controller is a pure reducer `(state, inputs, event) → state` exposing `{ act, viewMode, show* flags, segment }`. Clock stays in the page; the page calls `dispatch(event)` from the same sites that flip the booleans today.

---

## WS-A — LANDED (2026-08-05, commits on `content`, unpushed)

- **A1+A2** (`10b459b2ca`): `$lib/fly/flight-phase-controller.ts` (pure reducer) + 21-test suite.
- **A3** (`aa765da617`): `+page.svelte` wired — the 5 `$state` booleans (`showLaunch`/`showCoast`/`showDescent`/`showRecovery`/`openingActive`) collapsed to one `flyAct = $state<FlyAct>('opening')` + `$derived` flags; every write site dispatches a typed event through `dispatchPhase()` (reads live mission inputs at call time → no forward-ref TDZ). Non-act side-effects preserved verbatim (`descentT`/`coastMetDays` resets, `isPlaying`, `launchDwellUntil`, opacity fades, the moon/mars/venus surface `goto`, the async launch/descent profile loads). `descentProfile.body` narrowed to the controller's `DescentBody` (gas-giant bodies → null; reducer only forks earth→recovery).
- **A4 verification (evidence):**
  - `npm run check` → **0 errors**.
  - controller unit tests → **21/21 pass**.
  - `prettier --check --no-cache` + `eslint --no-cache` on the 3 files → **clean**.
  - Headless browser (dev :5390) per-act render + zero console errors: **5/5** — default→opening, `friendship-7&launch=1`→ascent, `friendship-7&descent=1`→descent, `friendship-7` scrub-to-cruise-band→**CoastScene** (the earth-orbit routing guard, visually confirmed — orbit arc + MA-6 HUD, NOT heliocentric cruise), `curiosity&descent=1`→descent.
  - `/fly` Playwright e2e (desktop-chromium, 7 fly specs) → **116 passed (5.3m)**.
  - **NOT run for WS-A:** mobile-chromium e2e (deferred to B6, which mandates both projects) and the flyby-hero/cislunar reference-screenshot pixel diff (WS-A is phase-logic only, no scene/WebGL change — the DOM-marker + console-clean check is the parity gate here). No pixel-diff baseline was captured pre-A3.

**WS-B seam is now proven:** the page holds `flyAct` + the continuous clock; the scene layer (WS-B) will read `flyAct`/clock one-way. Nothing in WS-A touched `onMount`/WebGL.

---

## B0 — onMount closure map (mapped 2026-08-05, read-only)

`onMount(async () => …)` spans **lines 2518–7393** (~4,875 lines). Region ranges below are the B1–B5 extraction targets.

**Already-delegated `$lib` modules (the seam is partly built):**
- `$lib/three/fly-helio-scene` → `buildHelioScene()` — sun/planets/orbit-rings/bloom/EffectComposer/skydome (the whole static helio graph).
- `$lib/three/fly-cislunar-scene` → `buildCislunarScene()` — Earth/Moon meshes, SoI rings, overlay arrows, LOD.
- `$lib/three/fly-updaters` → `FlyUpdaters` type (typed per-frame handle, published at onMount end).
- `$lib/fly-scene-constants` (tube radius R2, SoI rings, gravity arrows, coast line, FD stages), `$lib/fly-cinematic-frame` (`runCinematicFrame`), `$lib/fly-cinematic-beats`, `$lib/three/fly-leo-coast-scene` (`LOOP_CAP`).

**Regions (line ranges):**
| region | lines | inline vs delegated | B-slice |
|---|---|---|---|
| (a) renderer/camera/host setup | 2636–2728 | delegated to `buildHelioScene` (renderer/scene/camera all inside it); no separate DOM-attach — `el3d = renderer.domElement` grabbed at 4960 | B1 |
| (b) helio scene assembly | 2678–2728 (delegated) **+ 3219–3955 inline** | ~737 inline lines: `buildTubeGeometry`/`buildTubeMaterial` + out/ret arc meshes, SoI rings, gravity/velocity/centripetal arrows, sc-sprite Canvas2D glyph, engine plume shader, `applyMissionSpacecraftModel`, dep/arr/ret torus markers, moon-orbit ring, label-sprite system | **B2** |
| (c) cislunar scene assembly | 2730–3217 (~488) | delegated core + inline star field, `buildCislunarLineMaterial` GLSL, phase-line map, moon-frame group, cislunar sc-sprite, annotations, `rebuildCislunarLines`/`updateCislunarLineProgress`/`updateCislunarSpacecraft` | **B3** |
| (d) host-state (not helio/cislunar) | 3982–4188, 4688–4710, 4960, 5128–5148 | camera orbit state (camR/P/T, targets), auto-zoom state, montage state, 2D-canvas state, `el3d` | B1 |
| (e) per-frame `onFrame` body | **5654–7324 (~1670)** — built via `createAnimateLoop`, `loop.start()` at 7327 | the monolith: frame bookkeeping+`runCinematicFrame`, phase-clock advances, simDay+moonDrift, cruise/flyby cine camera, `updateCam`, montage, **helio frame update 6038–6144**, sc sprite/model positioning, phase visibility, arrival/epilogue/opening, helio science-layers, tube shader progress, **cislunar frame 6700–7063**, render branch 7065–7098, DEV snapshot, phase-marker + FD + milestone screen projection, 2D fallback | **B4** |
| (f) input listeners | 4960–5127 + 5630 | mouse/wheel/touch drag handlers + `onResize`, registered via `lifecycle.on(...)` | B1/B5 |
| (g) cleanup/dispose | 7329–7393 | `flyUpdaters` publish + `lifecycle.add(...)` (17 layer-stops, `disposeScene` ×2, `renderer.dispose/forceContextLoss`, `el3d.remove`) → `cleanup`; `onDestroy` at 7395 | B1/B5 |

**Prime extraction candidates (largest contiguous inline):** (1) the `onFrame` body 5654–7324 — most tangled, B4; (2) helio inline 3219–3955 (~737) — B2; (3) cislunar inline net ~365 lines within 2730–3217 — B3.

**Closure-capture risk:** the `onFrame` loop closes over ~50 `let`/`const` declared inside `onMount` (renderer, scene, camera, all meshes/groups/materials, camR/P/T orbit state, auto-zoom + montage state, `el3d`, 2D canvas ctx, `lastTime`/`moonDriftSec`/`scLastWorld`). B1's `fly-scene-host` must own these as host fields; B2/B3 move the mesh/material bundles into their scene modules' returned handles; B4's `frame(state)` receives the clock + `flyAct` and dispatches by act. This dense capture is exactly the TDZ-hazard class WS-B eliminates.
