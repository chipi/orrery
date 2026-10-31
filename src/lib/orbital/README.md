# src/lib/orbital — module map

Pure logic (no DOM, no Svelte) behind `/fly`'s presentation: camera framing, shot schedules, flight-act clock/HUD vocabulary, debug snapshots. Consumed by `$lib/three/fly-camera-controller.ts` + `fly-frame-runner.ts`, `LaunchScene` / `DescentScene` / `CoastScene` / `FlybyDebugViewer`, `routes/fly`, `routes/dev/leo-coast`.

- **Flyby cinema** — `flyby-camera-plan.ts` (iconic-shot pose, `PLANET_COMPOSITION`), `flyby-shots.ts` (establish/approach/hero/depart rigs), `flyby-shot-schedule.ts` (MET → active shot + slow-mo), `find-active-flyby.ts`, `find-flyby-planet.ts`, `iconic-frame.ts` (plan → spherical camera frame), `jump-to-met-bias.ts`.
- **Heliocentric** — `helio-non-flyby-frame.ts`, `sub-phase-transition.ts`, `fly-physics.ts` (trajectory math; AU, days, km/s, heliocentric ecliptic).
- **Cislunar** — `cislunar-camera-target.ts`, `find-active-cislunar-phase.ts`, `sample-cislunar-spacecraft.ts`; `cislunar/` = geometry (ECI, km), events, hero shots, marker reveal, screen projection.
- **Flight acts** — launch: `ascent-clock.ts` (piecewise pad-to-arrival scrubber), `ascent-cameras.ts`, `ascent-hud.ts`, `launch-force-layers.ts`; descent: `descent-hud.ts`, `descent-timewarp.ts`, `descent-force-layers.ts`; coast: `earth-orbit-registry.ts`.
- **Debug** — `fly-debug-snapshot.ts` (`window.__flyDebug`), `fly-debug-frame.ts` (`window.__flyDebugFrame`).

## Which folder owns what

- `physics/` is the lint-sealed kernel: physical quantities only (its README excludes cameras, HUDs, shots, framing, sim-clocks). Those live here; `ascent-physics.ts` is in `physics/ascent/`.
- `orbital/` = presentation math over those quantities. `fly/` = per-frame pure logic for the frame runner (`fly-frame-*`, `flight-phase-controller.ts`). `three/` = applies results to meshes and cameras.
- `fly-physics.ts` (here) is not `fly-physics-constants.ts` (`src/lib/`, constants it imports).
- `index.ts` re-exports only the flyby-camera-plan symbols; import the rest by path.

Pointers: TA.md §/fly (Scene 0, Scene 2, flyby montage) · ADR-030 · ADR-058 · ADR-077 · RFC-034.
