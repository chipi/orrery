# UXD-046 — The launch runs a seeded camera director; its light comes from the real launch time

- **Status**: accepted (built; unit and e2e tests green, see Verification)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — "It is all fucking amazing" (the director prototype clips), then "1 yes" to wiring it into /fly, and "Real missions should take their lighting from the actual launch time in local time, and we seed on /fly after Plan when the user makes his own launches."
- **Answers**: LA1 (camera on top, moving around), LA1a-d, FY2 (the first seconds rise vertically), D6 (example shots)
- **Builds on**: [UXD-042](UXD-042-plan-to-fly-handoff-grouped-destinations-and-the-journey-bar.md) (the play bar and its marker row stay as they are), RFC-034 (the launch act)
- **Changes**: `src/lib/orbital/ascent-director.ts`, `launch-sun.ts`, `launch-director-debug-plot.ts`, `src/lib/launches/launch-instant.ts`, `src/lib/three/launch-director-rig.ts`, `launch-conditions-scene.ts`, `LaunchScene.svelte`, `/fly` `+page.svelte`, `/dev/launch-director`

## Context

The launch camera was nine fixed side views: after T+22 s one `chase` shot could play for minutes, every launch looked the same, the climb slid sideways (the pad's 0.41 km/s counted as downrange) and the body leaned while its base was still beside the tower. The sky was a flat blue gradient with no clouds, smoke or light variety.

## Decision

1. **The director is the default camera on /fly's launch.** A seeded shot plan per launch (the vehicle id and the mission id: the same launch always replays the same, different launches differ), an opening drawn from a pool (today's long-lens `tower_clear`, a pad-level wide, an overhead drop, a dusk wide), shot pools by altitude band, a beat for Max-Q, each separation and the fairing, eased blends of 1.3 s of screen time, hard cuts on the beats, the framing solved so the vehicle fills 40 to 70 % of the frame height (the one `wide_trail` per launch excepted). The plan is built once at a fixed authoring speed, so a speed change never reshuffles shots, and it is a pure function of the mission time: scrubbing, seeking and pausing never jump.
2. **The first seconds are a vertical rise.** The scene draws the ground-relative path (the pad's rotation speed subtracted) and keeps the body upright until its base is above the tower, then blends (quintic) to the ground-relative flight path. The physics, the HUD and the play bar stay inertial.
3. **Conditions.** A light pick (midday, golden, dusk, night), a cloud cover (clear, scattered, deck, heavy) with stratus and cumulus, a limb glow coloured by the light, pad smoke that rolls out sideways and is lit by the plume, a lattice tower, city lights on the night side, a plume light on the stack. All procedural (shader noise, canvas sprites); no new asset or dependency.
4. **The light comes from the real launch time when it is known.** The Sun at the pad (the mission's launch-site fleet ref, else the launches entry's pad, else the profile's site) at the launch instant from `launches-historic` sets the light and the sun's direction: night below -6 degrees, dusk -6 to +6 (dawn included), golden +6 to +15, midday above. A Plan flight (`plan-…` id), a mission with a date but no time of day, or one with no entry is **seeded**, never given an invented noon. A `?light=` on the dev route still wins. Clouds and smoke stay seeded.
5. **The Shuttle's payload stays in the bay.** Galileo, Magellan and Ulysses have no injection or separation beat and no deployment (`payloadInBay`); the Shuttle's launch times match NASA's STS-30, STS-34 and STS-41 pages.
6. **Accessibility.** `prefers-reduced-motion`: the plan has hard cuts only and each shot holds its midpoint pose (no sweeping moves, no blends, no wobble).
7. **A/B for one release.** `?cam=classic` keeps today's camera and scene. `data-camera-mode` and `data-director-shot` on the launch scene name the mode and the active shot.
8. **`?debug=1`** adds the launch-director view to /fly's DebugPanel (the ascent path, every planned shot's camera and look direction, the live camera and trail, a readout).
9. Weak GPUs and touch devices get a lighter conditions rig (fewer sphere segments and smoke puffs).

## Not done here

- Frame time on a real phone or GPU (measured only under software GL).
- A free-look nudge (drag) with a hand-back, a keyboard route.
- Real launch azimuth for the sun (downrange is taken as east).
- Real times for missions the launches dataset has no entry for (about 75 % of the missions are seeded).

## Verification

`ascent-director.test.ts`, `launch-sun.test.ts`, `launch-instant.test.ts`, `launch-director-rig.test.ts`, `payload-in-bay.test.ts` (see the commit); `tests/e2e/fly-launch.spec.ts` on desktop and mobile Chromium: the director by default, `?cam=classic` the old camera, the existing launch tests unchanged.
