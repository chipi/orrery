# UXD-052 — Booster returns play full frame when the entry burn is sourced (Falcon 9 on a drone ship or at LZ-1, New Glenn on Jacklyn)

- **Status**: accepted (built; unit tests and dev-server screenshots, see Verification; production build, docker-e2e and a real GPU not run, see Not done)
- **Date**: 2026-11-24 (proposed) · 2026-11-24 (decided)
- **Decider**: the operator, 2026-11-24. The pass-2 redo list (`docs/wip/2026-11-24-pass2-redo-list.md`, "Pass 2: descents below the standard, redone at the end") asks for booster landing scenes for Falcon 9 and New Glenn, "with the side thrusters, grid fins and legs modelled and working on the descent", the Falcon 9 sea landing "on a 3D model of the drone ship, never on open water"; the operator's order was "finish every batch first, then redo these". The operator also asked for ESCAPADE and the `~` mark; a lead agent worked out the camera and the gate below.
- **Answers**: 0.9.11 plan row F2 ("Booster landings, more") as reopened on 2026-11-24, and the pass-2 redo list entry "booster landings"
- **Builds on**: [UXD-050](UXD-050-booster-landing-inset-on-fly.md) (the inset, which this record narrows), [UXD-046](UXD-046-the-launch-runs-a-seeded-camera-director.md) (the launch light the scene takes)
- **Changes**: [UXD-050](UXD-050-booster-landing-inset-on-fly.md) (marked partly superseded), [UXS-003](../UXS-003.md) (Booster return, full frame), `05_Design_System.md` §5.12 (the launch scene), TA.md (Launch / powered ascent), [IA](../IA.md) §surfaces (`/fly`), `src/lib/three/README.md`, `src/lib/three/booster-return-scene.ts`, `src/lib/three/showcase/` (`falcon9-booster.ts`, `new-glenn-booster.ts`, `drone-ship.ts`, `jacklyn.ts`, `landing-zone-1.ts`), `src/lib/components/LaunchScene.svelte`, `FlightPlan.svelte`, `src/lib/orbital/flight-plan-beats.ts`, `src/lib/physics/ascent/ascent-physics.ts`, `static/data/launch-profiles/falcon-9.json`, `new-glenn.json`

## Context

UXD-050 drew every recovered booster's landing as a small inset at the flight's real time. The
operator then asked for the landings to be shown properly: the booster's whole return, with its
grid fins, cold-gas thrusters and legs working, and a Falcon 9 sea landing onto a modelled drone
ship rather than open water. A full-size view needs an entry-burn start time as well as a landing
time, and the sources give that for only some flights.

The sourced figures are in `docs/wip/2026-11-24-booster-landings-sourced.md` and
`2026-11-24-escapade-sourced.md`; IM-1's in `docs/wip/2026-11-24-im1-rtls-sourced.md`. Inspiration4's entry burn at
T+450 s, landing burn at T+544 s and touchdown at T+571 s are sourced. IM-1's whole timeline (entry
burn T+6:11 to 6:22, landing burn T+7:17, touchdown
T+7:34) comes from an aggregator that cites The Space Devs. ESCAPADE's New Glenn: entry burn on
three of the seven BE-4 about seven minutes in and touchdown on Jacklyn about nine minutes in
(Space.com); the landing-burn engine count is unverified.

## Options

1. **Keep the inset for every landing (UXD-050).** For: one rule, small frame. Against: the grid
   fins, the thrusters and the ship cannot be read at 280 px, which is what the operator asked to
   see. Declined.
2. **Full frame for every recovered booster.** For: one rule the other way. Against: most flights
   have no entry-burn time, so the scene would invent the whole descent; Falcon Heavy's two side
   boosters and Super Heavy's tower catch have their own look. Declined.
3. **Full frame where the entry burn is sourced or "about N minutes", the inset otherwise.**
   Chosen.

## Decision

Option 3. When a flight's booster lands on a drone ship, or a Falcon 9's lands on a landing zone,
and its recovery entry carries an entry-burn time (`entryBurnS`) and a time class of `sourced` or
`approx`, the landing plays in the whole frame at the real time. A `typical` time, a Falcon Heavy
side booster and a tower catch stay a UXD-050 inset.

1. **Which flights.** Inspiration4's Falcon 9 on Just Read the Instructions (JRTI); IM-1's Falcon 9
   returning to Landing Zone 1 (RTLS); ESCAPADE's New Glenn on Jacklyn. ESCAPADE is a new mission
   in the catalogue (NASA's twin Mars orbiters, NG-2, 13 Nov 2025), which makes 141 missions.
2. **What it shows.** The entry burn on three engines, grid-fin steering with cold-gas puffs, the
   landing burn on the centre engine, the legs swinging out, and the booster standing on the pad
   marking of the ship or on the landing zone's 86 m pad. The models are at real size: the Falcon 9
   first stage (nine Merlins, lattice grid fins, folding legs, thruster pods), the drone ship at its
   real deck size, the New Glenn booster (seven BE-4, six legs, four fins and strakes) and Jacklyn
   (115.9 x 45.72 m), and Landing Zone 1.
3. **Camera and light.** The scene is full frame; the sky takes the launch's light (UXD-046) and
   turns black above the limb at entry-burn height. The camera frames the booster and the pad
   together on a short landing burn. The pose and camera are pure functions of mission time, so a
   scrub is exact.
4. **Window.** It opens 8 s before the entry burn (`RETURN_LEAD_S`) and holds 4 s after touchdown (`LANDING_HOLD_S`)
   (`returnWindow`); the upper stage's telemetry steps aside while it plays, and a caption names the
   site (`data-testid="booster-return-cap"`).
5. **The `~`.** A flight-plan row for a landing whose time class is `approx` or `typical` prints
   its time with a leading `~`.
6. **What is a sourced figure and what is not.** Entry, landing and touchdown times are the
   flight's own where marked `sourced`. The entry-burn length, every altitude and speed, the
   thruster pattern, the attitude wobble, the camera work, the New Glenn landing-burn engine count
   and the IM-1 coast distance are estimates, listed in the scene's header comment.

## Consequences

- UXD-050's inset stays for tower catches, Falcon Heavy side boosters and any landing without an
  entry-burn time. UXD-050 is marked partly superseded for drone-ship and landing-zone landings
  with a sourced entry burn.
- `LaunchScene.svelte` chooses between `createBoosterReturn` and the inset
  (`returnLanding` gate); `ascent-renderer.ts` draws the return scene as a full-frame view.
- Recovery data grows `entryBurnS` and `entryBurnEndS`; Inspiration4's recovery entry was also
  corrected from OCISLY to JRTI (a data defect fix).
- The mission count is 141. The 14-locale mission overlays, the hero and the card for ESCAPADE
  shipped with the mission; its delta-v tile reads "Not published".
- Falcon 9 legs deploy to about 29 degrees so the feet sit about 1.5 m under the bells.
- It rules out a full-frame landing for a flight whose entry burn is not published; adding one is
  a data entry, not a new decision.

## Verification

Unit tests: `src/lib/three/booster-return-scene.test.ts` (pose, window, both launchers),
`flight-plan-beats.test.ts` (the `~`), `recovery.test.ts`, `ascent-physics` recovery entries.
Dev-server screenshots read at 1280 and 375 px for the three flights.

## Not done

- Frame time on a real GPU or phone is not measured; the production build and docker-e2e have
  not run on this change.
- Altitudes, speeds and the thruster pattern are estimates; no source gives them.
- ESCAPADE's landing-burn engine count (one BE-4) and the Blue Origin timeline come from a search
  snippet, not a read page; JRTI's and IM-1's times are from third-party mirrors of SpaceX's own
  figures.
- Starship's tower catch has no full-frame return; Falcon Heavy side boosters keep the inset.
- IM-1's aggregator times (`2026-11-24-im1-rtls-sourced.md`) are not cross-checked against SpaceX's
  own webcast timeline.
