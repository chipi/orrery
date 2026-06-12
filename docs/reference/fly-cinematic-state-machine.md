# `/fly` Cinematic State Machine

Reference spec for the heliocentric flyby + EDL/OI cinema engine. Captures every
hidden invariant the iconic-shot composition relies on, so the **deferred /fly
effect-ladder consolidation** (post-#332 punch-list item §3) can be planned and
executed without regressing the on-screen result.

Most of these invariants are not enforced by tests today — the §Test coverage
gaps section at the bottom lists what should be locked down before the next
consolidator touches the file.

*Last verified against `f48c76abf` → current. June 2026.*

---

## What the cinema does

When the spacecraft is within ±60 days before / +30 days after a `flyby` or
`edl_or_oi` event in `mission.flight.events`, the heliocentric scene enters
**flyby cinema**. The camera converges onto a planet-dominated Cassini-mission-
art composition, freezes for 2.5 s (4 s on Earth), then dolly-recedes through
a 6 s afterglow before returning to cruise. Chrome (HUD, CAPCOM, scrubber,
phase markers, milestone label, trajectory tubes, bottom strips) hides during
the held + afterglow window so the iconic frame reads as pure mission art.

This is implemented as one `requestAnimationFrame` loop driving a small fixed
set of flags + lerp targets. There is no proper finite-state-machine library
under the hood; the state is reconstructed implicitly from the relative timings
of `performance.now()` vs four `cine.*` deadlines + four sub-phase strings.

---

## The four held deadlines

All live in `cine`, a typed `CinematicBeatState` from `$lib/fly-cinematic-beats.ts`.
Each is a `performance.now()` millisecond value; “held” means `now < deadline`.

| Flag                             | Set by                                   | Cleared by                          | What it freezes                    | Default duration          |
|----------------------------------|------------------------------------------|-------------------------------------|------------------------------------|---------------------------|
| `cine.peakHoldUntil`             | First animate frame inside the ±0.5d iconic-window | Expiry of `now`                     | Sim time + camera lerp + chrome    | 2500 ms (4000 ms on Earth)|
| `cine.afterglowUntil`            | Frame after `peakHoldUntil` expires      | Expiry of `now`                     | Sim time + chrome; camera dollies  | 6000 ms                   |
| `cine.cruiseHoldUntil`           | One-shot when the active sub-phase enters `cruise-out` first time | Expiry of `now`                     | Sim time + chrome                  | 4000 ms                   |
| `cine.finaleStartedAt`           | When the trajectory's last waypoint passes | `CINEMATIC_TIMINGS.FINALE_DURATION_MS` after | Sim time + chrome              | 8000 ms                   |

The composite `isCinematicFreeze` = `isPeakHoldingFrame || isAfterglowing ||
isCruiseHolding`. **Sim time only advances when `!isCinematicFreeze` and a few
other gates** (player not paused, past `launchDwellUntil`, not dragging the
scrubber).

`inCinematicHeldBeat` = `isPeakHoldingFrame || isAfterglowing || isCruiseHolding
|| finaleActive`. Drives the `.cinematic-hidden` class on chrome.

---

## peakHold arming

`peakHoldUntil` is **not** triggered by entering the flyby sub-phase. It is
triggered by reaching `simDay ∈ [peakMet − 2 ± 0.5 d]`. That window is the
"iconic moment" — 2 days before closest approach, where the trajectory data's
+y lift on the ship glyph is maximised relative to the planet's xz position so
the ship reads as an off-pole accent against the disc.

Arming logic, every animate frame:

```ts
const currentFrameFlybyMet = parseFlybyMetFromSubPhase(lastHelioSubPhase);
// reset: scrubbed off the flyby OR drifted >4 d from peak → re-arm-able
if (cine.peakHoldArmedForFlybyMet != null) {
  const sameFlyby = currentFrameFlybyMet === cine.peakHoldArmedForFlybyMet;
  const outsidePeakDays =
    Math.abs(simDay - (arcTimeline.dep_day + cine.peakHoldArmedForFlybyMet)) > FLYBY_PEAK_DAYS;
  if (!sameFlyby || outsidePeakDays) cine.peakHoldArmedForFlybyMet = null;
}
// arm: inside ±0.5d window AND not already armed for this flyby
if (!isMoonMission && !reducedMotion && !isDrag && currentFrameFlybyMet != null) {
  const iconicPeakSimDay = arcTimeline.dep_day + currentFrameFlybyMet - 2;
  const inHeldWindow = Math.abs(simDay - iconicPeakSimDay) < 0.5;
  if (inHeldWindow && cine.peakHoldArmedForFlybyMet !== currentFrameFlybyMet) {
    cine.peakHoldUntil = now + (isEarthHold ? 4000 : 2500);
    cine.peakHoldArmedForFlybyMet = currentFrameFlybyMet;
  }
}
```

### Invariants the arming logic depends on (load-bearing — don't break)

- **`isPlaying = false` after every `jumpToMet` call**. Otherwise sim advances
  past the ±0.5d window before the next animate frame can arm.
- **`jumpToMet` for a flyby event biases the target onto `peakMet − 2`**. Direct
  jumps to `peakMet` skip the window entirely (the user clicks "Venus #1" once,
  no freeze fires; this was the bug fixed in the post-v2-math commit).
- **`jumpToMet` clears `cine.peakHoldArmedForFlybyMet` + `cine.peakHoldUntil`**.
  Without this, re-clicking the same flyby button finds the prior arm still
  valid and never re-fires the hold.
- **`parseFlybyMetFromSubPhase` is the only authoritative source for "current
  flyby"**. `__flyDebug.activeFlybyMet` is stale outside the flyby window and
  was the original source of the reset bug.

---

## The peakHold camera composition

When peakHold is armed, the camera lerp **freezes** at whatever framing the
prior animate frame asked for. The framing is computed once per frame by:

```ts
const plan = planFlybyShot({
  planetId: flyby.id,
  planetPos: { x: bodyScene.x, z: bodyScene.z },
  planetRadius: flyby.size,
  shipPosAtMet,
  peakMet: activeFlybyMet,
});
```

`planFlybyShot` lives in `$lib/orbital/flyby-camera-plan.ts` and is **the single
source of truth for camera position + target during a flyby**. The /fly cinema
block converts its (cameraPos, cameraTarget) Vec3 pair into the scene's
existing spherical-coords format `(R, P, T)` around `cameraTarget`. Saturn-OI
is the only planet that gets a post-process: a 17° `camera.up` roll applied
inline at the render block, driven by the `saturnOIComposition` flag.

### Composition invariants

- **`PLANET_COMPOSITION[planetId]` is the only place pitch / camR / lead /
  side angle live**. The pre-v2 inline `targetP = isSaturnOI ? 1.25 : ...`
  override was absorbed into `PLANET_COMPOSITION.saturn.pitchRad: 0.32`.
  Resist temptation to add new inline pitch overrides — extend
  `PLANET_COMPOSITION` instead, otherwise the 2D `FlybyDebugViewer` mockup
  diverges from the 3D scene and the iteration loop is broken.
- **Camera target is the PLANET center** for `targetBias = 0`, not the ship.
  v1 anchored the camera to the ship's position; the trajectory data clusters
  ship.xz around planet.xz for ±many days near peak, so a ship-anchored
  camera kept ship + planet collinear from the camera POV. v2 fixed this.
- **The Saturn-OI `camera.up.set(sin(0.3), cos(0.3), 0)` roll is purely
  aesthetic**, not part of `planFlybyShot`. Reverting to `(0, 1, 0)` outside
  Saturn-OI is gated on the `saturnOIComposition` flag. If you remove the
  flag during a refactor, the roll persists forever.

---

## Chrome suppression

Five overlays / panels gate on `!inCinematicHeldBeat`:

| Element                             | Source line ref                                  |
|-------------------------------------|--------------------------------------------------|
| `.hud-stack` (left mission identity / nav / flight-params / systems) | `class:cinematic-hidden={inCinematicHeldBeat}` |
| `.scrubber` (timeline + speed group)                                 | `class:cinematic-hidden={inCinematicHeldBeat}` |
| `.capcom-panel` (right anomaly / comms / events)                     | `class:cinematic-hidden={inCinematicHeldBeat}` |
| `.fly-bottom-strips`                                                 | `class:cinematic-hidden={inCinematicHeldBeat}` |
| `.phase-markers-overlay` (milestone diamonds + labels)               | `{#if … && !inCinematicHeldBeat}` |
| `.fd-phase-markers-overlay` (FlightDirector phase chips)             | `{#if … && !inCinematicHeldBeat}` |
| `.milestone-overlay` (active flyby label text)                       | `{#if … && !inCinematicHeldBeat}` |

Outside the cinema, `outLine` + `retLine` trajectory tubes are visibility-gated
on a separate `inFlybyCinemaForLines` boolean (parsed from `lastHelioSubPhase`).
That's distinct from `inCinematicHeldBeat` — tubes hide during the **entire**
flyby sub-phase, not just the held + afterglow.

### Chrome invariants

- **`updateChromeSuppression` only writes `inCinematicHeldBeat` when the
  composite flag actually flips**. The animate loop fires 60–144 Hz; setting
  the `$state` every frame would needlessly re-run every dependent `$effect`.
- **The `.cinematic-hidden` class uses CSS `opacity` + `pointer-events: none`,
  not `display: none`**, so the Svelte reactive graph stays stable across
  the held window. Switching to `{#if}` would unmount + remount sub-trees,
  losing measured scroll positions + scrubber drag state.

---

## Saturn-OI tilt (Wernquist Grand Finale)

Saturn orbit insertion gets one extra post-process: the camera's up vector
rolls 17° (`saturnOIComposition` flag set at the cinema-block end, consumed
in the render block).

```ts
if (saturnOIComposition) {
  const ROLL = 0.3;
  camera.up.set(Math.sin(ROLL), Math.cos(ROLL), 0);
} else {
  camera.up.set(0, 1, 0);
}
```

Without explicit ring geometry, the roll reads as "ring-plane-edge-on" — Saturn's
disc appears askew across the frame, evoking the Wernquist Grand Finale art.

### Invariants

- **The flag is `true` only when `activeEvt.type === 'edl_or_oi' && flyby.id === 'saturn'`**.
  Cleared the moment the cinema block exits.
- **The roll is applied AFTER `camera.position.set(...)` and BEFORE
  `camera.lookAt(camTarget)`**. Reordering breaks the lookAt's frame
  construction.

---

## Mission data invariants

The iconic-shot pipeline depends on these mission-data shapes; breaking them
silently skips the freeze or composes for the wrong planet:

- **`flight.events[].type` is one of `'launch' | 'flyby' | 'edl_or_oi' | 'arrival' | 'free_return' | 'orbit' | 'tei_direct'`**.
  Only `'flyby'` + `'edl_or_oi'` enter the cinema block. Cislunar event types
  (`'free_return'` etc.) are handled by a separate cislunar camera path.
- **`flight.events[].label` resolves the planet ID** via `findFlybyPlanetFromLabel`
  (parses keywords like `'Venus #1 — gravity assist'`). When the label is
  missing, `findClosestPlanetToShip(sc.pos)` is the fallback — but the closest
  planet to the ship's heliocentric position at the flyby moment is **not
  always** the actual flyby target (Juno's MET 749 was closer to Mars than
  Earth heliocentrically). Labels are required to get this right.
- **`flight.events[].met_days` is a positive integer**. Negative or missing
  values are filtered out of the cinema-trigger loop.
- **`mission.timeline.dep_day` exists and is finite**. `simDay = dep_day +
  met_days` is the universal time-mapping.

---

## Performance budget

The cinema engine is in the `requestAnimationFrame` loop and runs every frame.
Performance-sensitive paths:

- **`planFlybyShot` is called once per frame inside the flyby sub-phase**.
  Currently ~30 multiplies, two `Math.sin/cos`, no allocations. Should stay
  allocation-free — putting `new Vec3()` inside it would re-trigger GC pressure
  during the 2.5 s hold (~150 frames at 60 Hz).
- **`projectToCameraFrame` is allocation-free**. Used by `classifyShot` in the
  2D viewer, not the 3D scene. If a future visual classifier runs every frame
  in the 3D path, the per-frame allocation cost (3 Vec3s per call) becomes
  ~9 µs/frame at 144 Hz — still fine, but worth noting.
- **`__flyDebug` is written once per frame under DEV only**. Production
  build's tree-shaker drops the writes.
- **`__flyJumpToMet` is wired only under DEV**. Same gating; no production
  payload increase.
- **Chrome suppression flip is once per state transition**, not every frame
  — see invariant above.

The cinema engine has never been profiled with `performance.mark/measure`. A
profile pass during a future quality-tier deepen would be useful but isn't
load-bearing today.

---

## Test coverage gaps

Today's automated coverage:

- **Unit (`vitest`)**: 11 tests for `planFlybyShot` invariants (camR / pitch /
  target-bias / shipPos / side angle / velocity recovery).
- **E2e (`playwright`)**: zero direct tests of peakHold arming, chrome
  suppression, or iconic-shot composition. The closest is the manual-test
  checklist (`docs/reference/fly-manual-test-checklist.md`).

The gaps below are listed in priority order. Each blocks a class of future
refactors from being safe.

1. **Unit: arming round-trip on synthetic timeline**.
   Drive a `peakHoldUntil` arm → expire → re-arm cycle through a fake clock,
   asserting `peakHoldArmedForFlybyMet` transitions correctly on (jump to
   flyby → wait → jump elsewhere → jump back). Locks down the regression that
   re-clicking the same flyby button silently dropped the freeze.

2. **Unit: jumpToMet biases flyby targets correctly**.
   Given a mission with a `flyby`-typed event at MET 193, `jumpToMet(193)`
   should leave `simDay = dep_day + 191`. Locks down the bias gate so a
   future "I'll just clean up `jumpToMet`" refactor doesn't undo it.

3. **Unit: `classifyShot` returns ICONIC for every Cassini beat at default
   composition**.
   Sample the Cassini mission's `outPts` via the same `predictShipPosAtMet`
   the page uses, feed `planFlybyShot` for each of Venus #1 / Venus #2 / Earth
   / Jupiter / Saturn-OI, assert `classifyShot(...).isIconic === true`. The
   five frames we've validated visually become the safety net.

4. **E2e: peakHold lights up on each flyby event click**.
   For each labeled mission (Cassini, Galileo, Juno, JUICE, Voyager 2),
   click each milestone-track button, assert within 1 s:
   - `[data-testid="hud-stack"].classList.contains('cinematic-hidden')`
   - `[data-testid="milestone-overlay"]` absent from DOM
   - `window.__flyDebug.peakHoldRemainingMs > 1000`

5. **E2e: peakHold semantic frame is reasonable**.
   At held moment, take an a11y-tree snapshot and assert the Cassini glyph's
   visible-name + the planet ID are both readable text on the page. Catches
   regressions where the v2 math identifies the wrong planet (Juno-Earth-as-
   Mars era).

6. **Unit: `findFlybyPlanetFromLabel` × every shipped mission label**.
   Parse the entire `static/data/missions/**/*.json` corpus, assert that every
   `'flyby' | 'edl_or_oi'`-typed event's `label` resolves to a known
   `PlanetId` via `findFlybyPlanetFromLabel`. Catches future label drift.

7. **Visual regression (`playwright snapshot`)**.
   Per-platform baselines (mac vs CI Ubuntu) for one held frame per planet
   — Cassini's Venus #1 + Venus #2 + Earth + Jupiter + Saturn-OI. This is
   the only gap that would catch a stylistic regression where the math
   still ships ICONIC but the composition LOOKS different. Defer to after
   the test harness lands per `feedback_e2e_pitfalls`.

---

## Maintainability + resilience

A short list of properties that the cinematic engine relies on holding, so a
future refactor agent can vet their plan against them:

- **`planFlybyShot` is pure**. No I/O, no DOM, no Three.js. A change that
  needs Three.js geometry doesn't belong in `$lib/orbital/`.
- **`PLANET_COMPOSITION` is the only per-planet tuning surface**.
- **The `cine.*` deadlines are write-once-per-event**. `peakHoldUntil` is
  set when entering the arming window, never re-extended. `afterglowUntil`
  is set when peakHold expires, never re-set. The animate loop assumes
  these are monotonic-until-expiry — re-setting them mid-window would
  retroactively change the user-perceived freeze duration.
- **`__flyJumpToMet` is DEV-only**. The chrome-devtools-mcp test harness
  depends on it for missions whose events lack labels; production builds
  must not expose it.
- **`saturnOIComposition` is the only inline post-process on the camera**.
  Adding a second planet-specific roll / FoV change / etc. should extend
  `PLANET_COMPOSITION` with optional `rollRad` / `fovDegOverride` fields
  rather than adding a new flag here.

---

## When this doc goes stale

The state machine evolves; treat this doc as the spec the **next** consolidator
should reconcile against, not a permanent fixture. The principles to preserve:

- One source of truth per concept (composition: `PLANET_COMPOSITION`; timing
  deadlines: `cine.*`; held-flag: `inCinematicHeldBeat`).
- Pure math separated from rendering (orbital-math files have no Three.js
  imports).
- Every screen-visible cinematic invariant has at least one automated test by
  the time the §Test coverage gaps section is checked off.
- Test the boundary, not the implementation: a freeze test should assert
  "the camera holds at the iconic frame for at least 2 s" rather than "the
  `peakHoldUntil` field equals `now + 2500`". Refactors are free to rewrite
  the latter; only the former should be load-bearing.

---

*Orrery · docs/reference/fly-cinematic-state-machine.md · June 2026 · paired
with `docs/reference/fly-manual-test-checklist.md`.*
