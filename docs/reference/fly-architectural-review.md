# `/fly` Architectural Review — June 2026 Baseline

A health check on the heliocentric + cislunar /fly subsystem before scaling
out the iconic-shot pipeline across the remaining mission corpus. Captures
what's good, what's at risk, and where the next round of investment pays
off most. Paired with `fly-cinematic-state-machine.md` (the runtime spec)
and `fly-manual-test-checklist.md` (the manual smoke list).

*Snapshot date: 2026-06-12. Reviewed against commit `f8b472bdb`. Re-run
the Explore inventory before re-baselining.*

---

## Tl;dr

**Healthy on math, light on orchestration.** Pure-math layers
(`flyby-camera-plan`, `fly-cinematic-beats`, `mission-arc`,
`fly-mission-apply`, cislunar / interplanetary geometry) are cleanly
separated from Three.js, exhaustively unit-tested (289 cases across 18
files), and reusable. **The 9,517-line `+page.svelte` carries five
distinct responsibilities, has 51 `$state` declarations + 19 `$effect`
blocks, and zero behavioural test coverage above the JS-helper level.**
The iconic-shot pipeline is the most recently touched corner and the
most likely to regress on the next /fly tweak; A1/A2/A3 just locked the
math invariants but the integration surface (camera lerp + chrome
suppression + Saturn-OI tilt + peakHold timing) is still e2e-untested.

Top three follow-ups, in leverage order:

1. **Split `+page.svelte` along the five responsibility lines** (post-#332 §3
   /fly effect-ladder consolidation). The five chunks are well-bounded
   already; making them files would shrink the merge-conflict surface
   + let the animate loop be tested in isolation.
2. **Re-enable + stabilise `fly-iconic-peakhold.spec.ts`** (currently
   `test.fixme`). The math is locked; the missing layer is the timing-
   sensitive cinematic suppression behaviour. Cruise-hold timing race
   is the only blocker.
3. **Profile the animate loop** (3 long-cruise missions × 1 flyby cinema
   × 1 cislunar lock). Today's code is allocation-free at the math
   layer but has never been measured under the dual-mode camera lerp.

---

## What's good

### Pure math layers are exemplary

- `mission-arc`, `fly-mission-apply`, `fly-cinematic-beats`,
  `flyby-camera-plan`, `cislunar-geometry`, `interplanetary-geometry`,
  `jump-to-met-bias` — none import Three.js, the DOM, or each other in
  ways that cycle. The Explore audit confirms a clean DAG: every
  helper's transitive imports land at `lambert-grid.constants` or
  Three.js types only.
- 289 colocated unit tests across 18 files. Highest-density modules:
  `mission-arc` (35), `fly-mission-apply` (35), `cislunar-geometry`
  (31), `fly-cinematic-beats` (30).
- The iconic-shot composition just got its own pure-math beachhead at
  `$lib/orbital/` with 13 + 9 + 8 new tests landing in this session
  (classify-shot baseline + jump-to-met-bias + arming round-trip).
- The 2D `FlybyDebugViewer` consumes the same `planFlybyShot()` the 3D
  scene does — dual-use math, no drift possible.

### Test coverage at the math layer ≈ best-in-class for this codebase

For comparison: `src/lib/orbital/` already exceeds the per-file test
density of `src/lib/quality/`, `src/lib/launches/sources/`, or
`src/lib/three/`. Future tweaks to camera math, peakHold timing, or
mission-arc geometry land against a thick safety net. **This is the
floor the next polish wave can build on.**

### Naming + file organisation tells the story

The `fly-*` prefix consistently signals "/fly-specific helper" without
leaking outside the route. `cislunar-*` is shared with `/moon` (Apollo
flight path) but the API surface is the same. `interplanetary-*` is
shared with `/missions` cards. Cross-route reuse without cross-route
coupling.

---

## What's at risk

### `+page.svelte` is doing five jobs in one 9,517-line file

The Explore audit found five distinct concerns inside the entry-point:

1. **Reactive state management** — 51 `$state` declarations + 19
   `$effect` blocks. The reactive graph has no documented invariants
   beyond what the Svelte compiler enforces.
2. **Scene initialisation & lifecycle** — calls `buildHelioScene` +
   `buildCislunarScene`, wires the quality tier, sets up the route
   lifecycle. ~500 lines.
3. **Real-time animation loop** — lines ~2900–3600 (the 700-line
   `createAnimateLoop()` closure) + 800 lines of camera lerp math
   right after it. **This is the largest single chunk and the highest-
   risk surface.** Owns sim time advancement, phase detection,
   cinematic beats, dual-mode camera interpolation.
4. **Mission loading pathway** — lines ~6800–7500. `applyMissionAsLoaded`
   / `applyScenarioAsLoaded` callsites, timeline reset, arc rebuild,
   cinematic state reset.
5. **User interaction** — mouse orbit/pan, scroll scrub, keyboard
   shortcuts, HUD toggles. ~800 lines.

The 700-line animate loop in particular is the bottleneck. It owns the
sim-day gate, the camera lerp, the chrome suppression, the Saturn-OI
roll, the FD banner timing, the cinematic peak/afterglow/cruise hold
dispatch, and the per-frame `__flyDebug` mirror. Every cinematic
behaviour we care about flows through it.

**Why it's a risk:** any future tweak to one concern (e.g. quality-tier
downgrade should cap camera lerp speed) involves reading 700 lines of
unrelated logic to know it's safe. Post-#332 §3 (the deferred effect-
ladder consolidation) called this out specifically: *"Needs careful
cinematic-timing analysis so consolidation doesn't break the iconic-shot
/ flyby choreography landed on main during the #332 rebase window."*

### Zero behavioural test coverage above the unit layer

- `fly-iconic-peakhold.spec.ts` (just added) — `test.fixme` for cruise-
  hold timing race.
- `fly-apollo11-phase-markers.spec.ts` — covers phase-marker projection
  + clickability, not iconic-shot composition or chrome suppression.
- `fly-cislunar.spec.ts`, `fly-no-cislunar.spec.ts` — cover route
  loading + 2D mode toggle, not animation behaviour.
- `fly-render-validation.spec.ts` — counts Three.js material disposals;
  not behaviour.

So if a future /fly refactor breaks peakHold arming, milestone-overlay
suppression, Saturn-OI tilt, jumpToMet bias, or the v2 camera composition,
the only safety net is the unit tests on the helpers — which won't catch
"the helper is correct but never called from the loop".

### Performance is unverified

- The animate loop runs every `requestAnimationFrame` tick. No
  profiling marks. The cinematic state machine has no
  `performance.mark/measure` instrumentation despite owning sim-time
  control.
- `frame-monitor.ts` measures total frame time, not per-concern
  breakdown. A 16 ms budget overrun could be the camera lerp, the
  trajectory tube vertex update, the milestone-overlay re-render, the
  `__flyDebug` write, or the FD banner reveal — no way to tell from
  the existing telemetry.
- `quality-tier.ts` switches LOD but nothing inside the animate loop
  reads it to throttle work. If we downgrade to low-tier the loop
  still runs the same camera-math + cinematic dispatch + mission-arc
  sample every frame.

### `mission-dest.ts` ships with zero tests

The file is small (2.5 K), pure data formatting, and (per Explore) has
0 `it(...)` cases despite being colocated with a `.test.ts`. Probably
not a regression risk in practice but it's the one outlier in the
otherwise-uniform test-density picture and worth a 10-minute pass to
either fill in or delete the test stub.

### The cinematic state machine has hidden invariants the test suite doesn't enforce

`docs/reference/fly-cinematic-state-machine.md` documented seven
invariants the iconic-shot pipeline depends on:

- `isPlaying = false` after every `jumpToMet`
- `jumpToMet` biases flyby targets onto `peakMet − 2`
- `jumpToMet` clears `cine.peakHoldArmedForFlybyMet` + `peakHoldUntil`
- `parseFlybyMetFromSubPhase` is the sole "current flyby" source
- `PLANET_COMPOSITION` is the only per-planet tuning surface
- Camera target is the planet center, not the ship (v2)
- Saturn-OI camera.up roll is gated on `saturnOIComposition` and
  reverts to `(0,1,0)` outside Saturn-OI

A1/A2/A3 just locked invariants 2 and 3. The other five are still
unenforced — a future refactor can quietly break any of them with no
test signal.

---

## Recommended follow-ups (leverage-ranked)

### High leverage

1. **Split `+page.svelte` along the five responsibility lines.**
   - `src/lib/three/fly-animate-loop.ts` (~1500 lines once camera +
     lerp + cinematic dispatch land together) — the orchestration.
   - `src/lib/fly-page-state.svelte.ts` — the 51 `$state` declarations
     + 19 `$effect` blocks as a typed state object.
   - `src/lib/three/fly-camera-controller.ts` — the camera lerp +
     spherical-coord arithmetic + auto-zoom.
   - `src/routes/fly/+page.svelte` shrinks to: imports + mount/unmount
     wiring + template (HUD + CAPCOM + scrubber + overlays). 1500-2000
     lines.
   - **Why now:** the iconic-shot work just landed. The state machine
     doc captures the invariants. Splitting now means the next polish
     wave has a clean target instead of a 9,517-line one.

2. **Re-enable `fly-iconic-peakhold.spec.ts` after stabilising the
   cruise-hold race.** Three concrete approaches in the commit
   message — pick (b) suppress cruise-hold under `reducedMotion`
   (cleanest; preview build can pass `emulateMedia({reducedMotion:'reduce'})`
   and the spec just works). Net: 8 e2e tests for the load-bearing
   visual behaviour, recoverable in ~2 hours.

3. **Add unit tests for the five remaining cinematic-state-machine
   invariants.** Specifically:
   - `jumpToMet` must always call `isPlaying = false` (assert on the
     state mutation after a synthetic jump).
   - `parseFlybyMetFromSubPhase` is called from a single site in the
     animate loop (single-source assertion via grep, not runtime — a
     `vitest` test that reads the source file and counts call sites).
   - `PLANET_COMPOSITION` is the only place pitch/camR/lead live (same
     grep-test pattern: any other `pitchRad = ` or `camRMultiplier = `
     in /fly source is a regression).
   - Saturn-OI flag clears outside the cinema window (already locked
     by the existing fly-cinematic-beats test for `isAnyCinematicFreeze`
     but worth a dedicated test).
   These take an hour. Cheap insurance.

### Medium leverage

4. **Instrument the animate loop with `performance.mark/measure` for
   the three biggest per-frame costs**: camera lerp, mission-arc
   sample, cinematic dispatch. Wire the measurements through
   `frame-monitor.ts` so the existing struggle-detector can attribute
   over-budget frames. Five lines per concern, one-shot.

5. **Make `quality-tier.ts` actually throttle work inside the loop.**
   At "low" tier today: same frame work, less LOD. At "low" tier should
   be: skip the milestone-overlay projection every other frame, skip
   the FD banner reveal animation, fall back from per-frame `__flyDebug`
   write to every-other-frame. Add an explicit `frameTier` integer to
   the cine state and gate on it.

6. **Visual regression baseline for one frozen frame per planet.**
   `playwright`'s screenshot assertion with `mask: [.hud-stack,
   .capcom-panel]` plus a tight `pixelDiff` threshold. Caught the eye-
   regressions that `classifyShot` can't (e.g. Neptune-too-dark).
   Needs the cruise-hold race fix first (so it can be reproducible).

### Lower leverage (good when there's slack)

7. **Audit `mission-dest.ts`** — either fill in tests or delete the
   stub. 10 minutes.

8. **Move `mission-arc.ts` + `orbital.ts` + `fly-physics.ts` under
   `$lib/orbital/`** per the post-#332 §1 vision. The names hint at
   different concerns but they're all pure orbital math. Consolidating
   makes the post-#327 data-layer work easier to plan against and
   surfaces the natural `$lib/orbital/index.ts` barrel as the public
   API.

9. **Audit `fly-updaters.ts`** — currently type contracts only, no
   implementation. Either move the closures out of `+page.svelte` (so
   the file becomes real, with tests) or delete it.

---

## Performance budget — what we know / don't know

What we know:
- `planFlybyShot` is allocation-free (~30 multiplies / call, two trig).
- `projectToCameraFrame` is allocation-free.
- Cinematic predicates (`isPeakHolding`, `isAfterglowing`,
  `isCruiseHolding`, `isFinaleLocked`) are O(1) and free.
- The mission-arc Kepler sampler hits the trajectory spline cache for
  every animate frame (~150 frames at 60 Hz during peakHold) — not
  measured.
- `__flyDebug` write is gated on DEV and gets stripped in prod.

What we don't know:
- Camera lerp cost. The dual-mode spherical-coord conversion runs every
  frame in both helio and cislunar modes.
- Three.js scene churn during the animate loop (mesh visibility flips,
  material opacity tweens, sprite scale lerps).
- Chrome suppression cost — the `inCinematicHeldBeat` flag is read by
  six `class:cinematic-hidden` bindings; Svelte 5's reactive graph
  should handle this efficiently but it's not profiled.
- Mobile budget. Everything above is desktop-chromium.

A 30-minute pass with `performance.mark` would surface 80% of the
unknowns.

---

## Where the baseline should re-baseline

Re-run this review when:
- `+page.svelte` drops below 5,000 lines (post-split).
- The Playwright iconic-shot spec hits ≥ 8 green planets.
- The animate loop has at least one perf instrument shipped.
- Any of the five remaining state-machine invariants gets test
  coverage.

Each of those moves the floor up. Don't re-baseline before two of them
land — the picture stays roughly the same.

---

*Orrery · docs/reference/fly-architectural-review.md · June 2026 ·
paired with [fly-cinematic-state-machine.md](./fly-cinematic-state-machine.md)
and [fly-manual-test-checklist.md](./fly-manual-test-checklist.md).*
