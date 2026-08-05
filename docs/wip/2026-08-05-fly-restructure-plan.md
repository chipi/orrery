# `/fly` restructure — implementation plan (RFC-036)

*2026-08-05 · plan for RFC-036 · WS-A = #440 · WS-B = #441 (blocked-by #440)*

The detailed, sliced execution plan for RFC-036. Read the RFC first for the *why*
and the seam contract (§4). This doc is the *how* + the order. Every slice ends
green (typecheck + relevant tests) and is a small, revertible commit.

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
- Move inline helio scene-build out of `onMount` into `fly-helio-scene` (extend the existing module). Testable via a jsdom scene/dispose harness.

### B3 — Extract cislunar scene assembly
- Same for the cislunar scene (moon-frame group, phase-line tubes — trajectory-tube radius logic already extracted in R2) into `fly-cislunar-scene`.

### B4 — Extract `onFrame` into composed updaters
- Decompose the per-frame body into keyed updaters (helio-frame, cislunar-frame, ascent/coast/descent handled by their existing scenes). `frame(state)` dispatches by `state.act`. Preserve the exact per-frame math (dt clamp already via `createAnimateLoop` from R7).

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
