# `/fly` Manual Test Checklist

A walk-through of representative missions to exercise every code path in
the heliocentric + cislunar /fly scenes. Use this as the manual smoke
test after any /fly change, and as the reference spec for the future
automated e2e equivalent.

The checklist was first executed on **2026-06-09** after the cinematic
camera + FD stage marker rework (commit `7a8d8e* → main`). Results +
known-broken items at the bottom.

---

## How to drive it

1. `npm run dev` (vite preview on `localhost:5273`).
2. Open Chrome DevTools MCP or just use a regular browser tab.
3. For each mission below, open the URL, scrub the timeline slider to
   the listed checkpoints, and verify the expectations.
4. Open the browser console — every test below expects **zero** error
   or warn messages.

Useful one-liners (paste into DevTools console):
- Count revealed FD chips:
  `document.querySelectorAll('[data-testid="fd-phase-marker"]').length`
- List revealed chip labels in order:
  `Array.from(document.querySelectorAll('[data-fd-phase]')).map(e=>e.dataset.fdPhase)`
- Jump the scrubber to a given progress (0..1):
  ```js
  const s = document.querySelector('input[type="range"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(s, '0.75'); s.dispatchEvent(new Event('input', { bubbles: true }));
  ```

---

## Test cases

### A. Round-trip heliocentric — `ORRERY-1 demo`
URL: `/fly` (no params).
Trajectory: Heliocentric free-return Mars flyby. arr_day = 509.

Expectations:
- 3D scene renders Sun at centre with both Earth + Mars orbits visible.
- Three anchor rings:
  - LAUNCH (blue, "Earth dep") at outPts[0].
  - ARRIVAL (red, "Mars arrival") at outPts[last].
  - RETURN (blue, "Earth arrival") at retPts[last].
- FD chips on the arc, revealing on schedule:
  | scrubber | revealed | notes |
  | --- | --- | --- |
  | 0.0 | `Injection` | tiny window before CRUISE threshold (0.03) |
  | 0.05 | `Injection`, `Cruise` | CRUISE just past INJECTION |
  | 0.45 | `Injection`, `Cruise` | mid-outbound |
  | 0.50 | `Injection`, `Cruise`, `Approach` | outbound APPROACH fires |
  | 0.55 | `Injection`, `Cruise`, `Approach`, `Arrival` | Mars-ARRIVAL fires |
  | 0.70 | + `Cruise` (return) | return CRUISE fires after Mars flyby |
  | 0.92 | + `Approach` (Earth) | return APPROACH fires |
  | 0.99 | + `Arrival` (Earth) | all 7 stages revealed |
- Camera arc:
  - t=0: tight on Earth (~30u).
  - Slow LERP into wide cruise; Sun visible, ship tracked.
  - Approach-Mars (~outboundT 0.8): closeup on Mars destination.
  - Mars-depart (returnT < 0.05): held shot tracking ship as it leaves Mars.
  - Earth-approach (~returnT 0.9): closeup on Earth.
- FlightDirectorBanner phase eyebrow cycles through `INJECTION` →
  `CRUISE` → `APPROACH` → `ARRIVAL` → `CRUISE` → `APPROACH` → `ARRIVAL`.
- No console errors.

### B. One-way Mars surface — `curiosity`
URL: `/fly?mission=curiosity`.
Trajectory: Heliocentric Hohmann. dep=2011-11-26, arr=2012-08-06.

Expectations:
- LAUNCH ring (blue) at Earth-at-dep; ARRIVAL ring at Mars-at-arr.
- ARRIVAL ring subtitle uses `mission.arr_label` directly ("2012-08-06"),
  NOT the destination-aware override (that only triggers on round-trip).
- **No RETURN ring** (retPts.length === 0).
- FD chips:
  | scrubber | revealed |
  | --- | --- |
  | 0.05 | `Injection`, `Cruise` |
  | 0.5 | `Injection`, `Cruise` |
  | 0.85 | + `Approach` |
  | 0.97 | + `Arrival` |
- FD banner cycles only `INJECTION` → `CRUISE` → `APPROACH` → `ARRIVAL`
  (never enters the return-leg branch).
- No console errors.

### C. Round-trip asteroid sample-return — `hayabusa2`
URL: `/fly?mission=hayabusa2`.
Trajectory: H-IIA → Ryugu rendezvous + sample return.

Expectations:
- LAUNCH (blue) at Earth-at-dep, ARRIVAL ring positioned at the
  destination (asteroid), with subtitle `Asteroid arrival` (the
  destination-aware override for round-trip).
- RETURN ring (blue) at retPts[last] with subtitle `Earth arrival`.
- Full 7-stage FD chain reveals across timeline.
- Approach-Earth on return uses `HELIO_EARTH_CLOSEUP_R=50` (looser
  Earth zoom than destination-side `HELIO_CLOSEUP_R=40`).
- No console errors.

### D. Outer-system one-way (Jupiter / Saturn range) — `voyager-1`
URL: `/fly?mission=voyager-1`.
Destination: Saturn (9.5 AU).

Expectations:
- 3D scene renders Sun + Earth orbit + Saturn orbit, all visible at
  the wider `cameraDistanceFor(SATURN) = max(180, 9.5·80·2) = 1520u`.
- 4 outbound FD chips reveal as scrubber moves through 0 → 1.
- No RETURN ring (one-way).
- Long cruise gives the steady-cam azimuthal drift (0.05 rad/s) time
  to read — camera should slowly orbit the spacecraft.
- No console errors.

### E1. One-way Moon — `slim`
URL: `/fly?mission=slim`.

Expectations (cislunar one-way):
- Cislunar scene active.
- `helioFd === 0` (FD diamonds gated out).
- `cislunarMarkers === 1`.
- ARRIVAL event at MET 110 — no EARTH RETURN. retPts.length === 0.
- No console errors.

### E. Moon cislunar — `apollo11`
URL: `/fly?mission=apollo11`.

Expectations:
- Cislunar scene active (Earth-centred, Moon orbits at exaggerated scale).
- **Helio FD diamonds do NOT render** (gated by `viewMode === 'heliocentric'`).
  - DOM check: `document.querySelectorAll('[data-testid="fd-phase-marker"]').length === 0`.
- Cislunar phase markers DO render (separate pipeline).
  - DOM check: `document.querySelectorAll('[data-testid="phase-markers-overlay"]').length === 1`.
- Apollo timeline events visible in CAPCOM panel (LAUNCH / TLI / LOI /
  TEI / EARTH RETURN).
- No console errors.

### F1. Modern lunar round-trip — `artemis3`
URL: `/fly?mission=artemis3`.

Expectations:
- Cislunar scene active (same path as Apollo 11).
- helioFd === 0, cislunarMarkers === 1.
- Events span LAUNCH → TLI → TCM → ASCENT → TEI → EARTH RETURN — full
  SLS/Starship crew-and-return cadence.
- No console errors.

### F. Cislunar free-return — `apollo13`
URL: `/fly?mission=apollo13`.

Expectations:
- Cislunar scene active. Same constraints as Apollo 11 (no helio FD,
  yes cislunar phase markers).
- Free-return arc visible.
- CAPCOM panel surfaces the anomaly event.
- No console errors.

---

## Bonus checks (do these manually on at least one round-trip mission)

- Toggle Science Lens **on**. The top-centre Science Lens panel must
  sit directly under the nav header (NOT in the canvas centre — that
  regression was caused by `FlightDirectorBanner` publishing its
  height to `--lens-banner-height` while sitting in the bottom strip).
- Toggle the timeline `Pause` / `Play` button. Camera lerps should
  pause / resume cleanly.
- Drag the canvas to orbit the camera; release. Steady-cam drift
  should stop on drag and resume after.
- Pinch-zoom (or wheel-zoom). User-zoom should override the auto-zoom
  for the rest of the sub-phase.
- Reload with `prefers-reduced-motion: reduce`. Camera drift +
  fd-marker pop animation should disable.

---

## G. Flyby Cinema — `voyager-2` (and other grand-tour missions)

URL: `/fly?mission=voyager-2`.
Mission events include 4 `flyby` entries: Jupiter (MET 688), Saturn
(MET 1466), Uranus (MET 3079), Neptune (MET 4388).

Expectations (per flyby):
- When `|simDay − dep_day − met_days| ≤ 25`, the camera enters a
  dedicated `flyby-<met>` sub-phase.
- Sub-phase: closeup framing (`HELIO_FLYBY_R = 80u`) centred on the
  live spacecraft scene position with approach-pitch tilt.
- Sun visible in frame (since spacecraft is at heliocentric position
  of the flyby planet, ~5–30 AU from origin).
- Smooth LERP in / out of the closeup as the window opens + closes.
- Outside the window, regular cruise / approach sub-phases run.

How to drive:
```js
// Jupiter flyby at MET 688 of 4388 total → slider ≈ 688/4388 = 0.157
const s = document.querySelector('input[type="range"]');
const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
set.call(s, '0.157'); s.dispatchEvent(new Event('input', { bubbles: true }));
// Pause via the Pause button, then wait a few seconds for camera lerp.
```

Same pattern is data-driven: it auto-activates for any mission whose
`flight.events[]` includes one or more `type: 'flyby'` entries. Tally
from a 2026-06-09 grep across mission JSON files:

| Mission | Destination | Flybys | Cinema value |
| --- | --- | --- | --- |
| `bepicolombo` | Mercury | 9 | 🏆 highest |
| `messenger` | Mercury | 6 | high |
| `rosetta` | Comet | 6 | high |
| `galileo` | Jupiter | 5 | high |
| `cassini` | Saturn | 4 | high (✓ verified) |
| `voyager-2` | Neptune | 4 | high (✓ verified) |
| `juice` | Jupiter | 4 | high |
| `new-horizons` | Pluto | 3 | mid |
| `giotto` | Comet | 3 | mid |
| `voyager-1` | Saturn | 2 | mid |
| `pioneer-11` | Saturn | 2 | mid |
| `vega-1` / `vega-2` | Venus | 2 | mid |
| `pioneer-10`, `mariner4`, `ulysses`, `hayabusa2`, `dawn`, `juno` | various | 1 | low (single arrival) |

Cassini Earth-flyby validation: scrubbing to MET 894 (slider ≈ 0.365)
on a paused sim, then clicking the timeline "FLYBY at MET 894.00 days"
jump button, drives the camera into a tight closeup that shows the
spacecraft and the LAUNCH ring at Earth's position simultaneously.

---

## H. Milestone overlay — labeled `flight.events[]`

URL: `/fly?mission=cassini` (the first backfilled mission).

Expectations:
- Each `flight.events[]` entry that carries a `label` field renders
  as a small teal `◇ <label>` chip at the spacecraft's projected
  scene position at the event MET.
- Distinct visual language from FD stage markers: teal vs gold,
  chip-with-leading-diamond vs chip-above-leader, no reveal gating
  (milestones always render once the event is on-screen).
- DOM contract:
  - Overlay container: `[data-testid="milestone-overlay"]` with
    `data-milestone-count="<N>"`.
  - Each chip: `[data-testid="milestone-chip"]` with
    `data-met-days="<met>"`, contains `.milestone-tick` (◇) +
    `.milestone-label` (text).

Driving Cassini through its milestone roster:
- Jump to MET 0 → "◇ Launch" near LAUNCH ring.
- Jump to MET 207 → "◇ Venus #1 — gravity assist" at the spacecraft.
- Jump to MET 808 / 894 / 2226 → Venus #2 / Earth / Jupiter chips.
- Jump to MET 2451 → "◇ Saturn orbit insertion" at Saturn.

Iconic-mission backfill status (2026-06-09):
- ✅ Cassini (6 milestones)
- ⏳ All 17 other iconic missions still anonymous — backfill is a
  mechanical pass joining `/static/data/trajectories/<id>.json`
  waypoints to `/static/data/missions/<dest>/<id>.json` events by
  date. Tracked as a follow-up data migration.

---

## Round-2 changes (2026-06-09)

These are the broken items from the initial run that have been fixed
or addressed in this same session:

1. **Helio camera far-plane was 4000u, clipping Neptune + Pluto. FIXED.**
   - Bumped `PerspectiveCamera.far` from 4000 → 16000 in
     `src/lib/three/fly-helio-scene.ts`.
   - Also capped `cameraDistanceFor` at 1600u (Saturn-scale wide) in
     `src/lib/fly-scene-constants.ts` — Voyager 2 / Pluto missions
     keep the Saturn-level framing and the spacecraft simply flies off
     the wide-frame edge during cruise, approached only when the
     flyby cinema sub-phase zooms in on it.
   - Outer-system visual readability is still poor (Sun + orbit rings
     read as small at 1600u framing) — that's a separate LOD-scaling
     UX pass beyond this fix.

2. **`Hayabusa 2` mission data clipped to primary Earth-return. FIXED.**
   - Removed the extended-cruise events at MET 4250 + 6092 from
     `static/data/missions/asteroid/hayabusa2.json`.
   - The visible mission events now stop at MET 1880 (sample-return
     capsule reentry over Woomera).
   - Note: a full mission-length clip would require an
     `end_met_days` architectural addition (transit_days × 2 is still
     the round-trip total length internally). Filed as a follow-up.

3. **One-way Moon-mode coverage added.** See test E1 (SLIM) above.

4. **Flyby Cinema mode added** for grand-tour missions. See test G.

---

## Still to-fix-next (carry forward)

1. **Outer-system visual LOD.** With `cameraDistanceFor` capped at
   1600u and the camera framing wide, the Sun (8u radius) projects to
   a few pixels and the orbit rings disappear into the background. A
   distance-aware scale-up (or LOD swap) for the Sun mesh + orbit
   line widths would make outer-system framings actually readable.

2. **`end_met_days` override field on missions.** Hayabusa 2 needs to
   end at MET 1880 (Earth return), but the scrubber still spans the
   round-trip-derived 2604 days. Adding an explicit
   `flight.end_met_days` field would let mission data clip the
   timeline without abusing `transit_days`.

3. **Flyby planet meshes.** The flyby cinema sub-phase zooms close on
   the spacecraft, but the flyby body (Jupiter, Saturn, etc.) isn't
   rendered as a textured sphere — only the active destination is.
   Rendering all bodies on the trajectory's flyby roster would
   complete the "mini-movie" feel by giving the camera a planet to
   look at during the flyby beat.

---

## Suggested next iteration of this doc

- Convert the per-mission scrubber tables into a Playwright spec
  (`tests/e2e/fly-stages.spec.ts`) using the same chip-reveal DOM
  selectors. Each row in the table → one `expect(...).toHaveText(...)`.
- Add a programmatic "no console errors" assertion via `page.on('console')`.
- Render the test plan inline at the bottom of `tests/e2e/_helpers/fly.ts`
  so contributors find it without leaving the spec.

---

*Last manually executed: 2026-06-09 — Marko + Claude (Opus 4.7 · 1M context).*
