# UXD-050 — Booster landing inset on /fly

- **Status**: accepted (built; unit and e2e tests, see Verification; not checked on a real GPU, see Not done)
- **Date**: 2026-11-22 (proposed) · 2026-11-22 (decided)
- **Decider**: the operator, 2026-11-22 — chose "inset at real time" from the three options below (plan row F2 of `docs/wip/2026-11-21-0.9.11-plan.md`)
- **Answers**: 0.9.11 plan row F2 ("Booster landings, more")
- **Builds on**: [UXD-046](UXD-046-the-launch-runs-a-seeded-camera-director.md) (the launch scene and its camera director), [UXD-042](UXD-042-plan-to-fly-handoff-grouped-destinations-and-the-journey-bar.md) (the flight-plan beats and the play-bar marker row)
- **Changes**: [UXS-003](../UXS-003.md) (Booster landing inset), `05_Design_System.md` §5.12 (the launch scene), TA.md (Launch / powered ascent), [IA](../IA.md) §surfaces (`/fly`), `src/lib/three/README.md`, `src/lib/three/landing-inset.ts`, `engine-plume.ts`, `ascent-renderer.ts`, `src/lib/components/LaunchScene.svelte`, `src/lib/orbital/flight-plan-beats.ts`, `ascent-hud.ts`, `src/lib/physics/ascent/ascent-physics.ts`

## Context

The launch scene turned a recovered booster tail-down at stage separation and let it drop away
(0.9.10). A real booster lands minutes later: Falcon 9 about 8 to 9.5 minutes after liftoff, a
Falcon Heavy side booster at T+8:17, Super Heavy about 7 minutes after liftoff. The scene's
separation drop lasts about 5 s, so the landing had no time of its own. The question was where the
landing is drawn and when.

The data is per flight, not per vehicle: Hera's booster and all three Europa Clipper cores were
expended, Psyche's side boosters landed on LZ-1 and LZ-2, Inspiration4's booster landed on a drone
ship. The sources are in `docs/wip/2026-11-22-booster-recovery-sourced.md`.

## Options

1. **Compress everything into the separation drop (about 5 s).** The landing plays right after
   separation. For: no new element, no second view. Against: it shows the landing minutes before it
   happens, so the mission clock and the picture disagree. Declined by the operator.
2. **A camera cut to the booster at the real time.** The main view leaves the ascent for the
   landing. For: the landing is full size. Against: it takes the main view, and the ascent HUD
   with it, away from the upper stage while the mission is still flying. Declined by the operator.
3. **A small inset at the real time.** The main view stays with the upper stage; a framed inset
   shows the landing at the flight's real touchdown time. For: the clock and the picture agree, the
   ascent keeps its view. Against: the booster is small, and it needs its own scene and a free
   band of the screen. Chosen.

## Decision

Option 3. At the flight's real booster-landing time a small inset shows the recovered booster
coming down on its engines onto a drone ship, a landing zone, or into the launch tower's two catch
arms (Super Heavy). The main view stays with the upper stage.

1. **When.** The inset opens 8 s before the landing burn (`INSET_LEAD_S`) and closes 4 s after
   touchdown (`LANDING_HOLD_S`). Where no source gives the burn start it is 25 s before touchdown
   (`LANDING_BURN_DEFAULT_S`). The launch act is held until the last inset closes (`holdUntilS` of
   `launchActEndS`); DART's booster lands at T+8:52, after its injection beat would end.
2. **What it shows.** The landing-burn plume, and the legs swinging out in the last 4 s. The site is
   a drone ship, a landing zone or the tower's catch arms. A booster the flight expended gets no
   inset and tumbles.
3. **Caption.** The HUD label and the site names, for example `BOOSTER LANDING · LZ-1 · LZ-2`,
   `BOOSTER LANDING · Of Course I Still Love You`, `TOWER CATCH`.
4. **Where.** Right-aligned, 22 px from the right edge, in the free band under the FLIGHT PLAN list
   and above the play bar (above the SPEED and ALTITUDE readouts on phones). 7:5, at most 280 px
   wide (46 % of the width on narrow screens), shrunk to fit; not drawn when the band is under
   90 px. It stays when the HUD is hidden, because it is scene content. The sky colour follows the
   launch scene's light (night, dusk, golden, midday).
5. **Flight plan.** A BOOSTER LANDING or TOWER CATCH beat sits at touchdown, in time order, in the
   HUD list and as a marker on the play bar. Two new UI strings, `hud_booster_landing` and
   `hud_tower_catch`, in 14 locales.
6. **Per flight.** Recovery is data on the launch profile: a vehicle default (`recovery`) and a
   per-mission override (`recoveryByMission`). Each entry says the part, the outcome (landed,
   caught, expended), the site, the site names, the touchdown time and its class (sourced, approx,
   typical).

## Consequences

- One renderer draws both views: the inset's own `THREE.Scene` is drawn into the frame's rectangle
  after the composed frame (scissor and viewport). No second canvas, no second GL context. The
  inset scene is built about 20 s before it opens.
- The per-vehicle `RECOVERED` table in `launcher-models.ts` is gone. Hera's booster and the three
  Europa Clipper cores tumble instead of turning tail-down.
- Falcon 9 landing legs (also Falcon Heavy side boosters and New Glenn) carry
  `userData.landingLegAngle` so the inset can hinge them.
- The plume geometry moved from `ascent-scene.ts` to `engine-plume.ts` and is shared.
- Two fixes shipped in the same arc, both about the separation time. `LaunchScene` now knows the
  mission id, so the per-mission SECO-to-separation delay (Inspiration4 198 s, Polaris Dawn 197 s)
  reaches the scene's own separation, not only the play-bar markers. A timed spacecraft separation
  counted its published delay from the end of the ascent integration, which runs a 90 s engine-dark
  coast past SECO, so every L63 separation was drawn 90 s late; it counts from SECO now.
  Inspiration4: SECO T+8:18, separation T+11:36 (was T+13:06). OTV-1 (Atlas V): SECO T+11:46,
  separation T+14:35.
- It rules out a full-size landing view in this act. A cut to the booster would be a new decision.

## Verification

Unit tests: `src/lib/three/landing-inset.test.ts` (pose, window, placement),
`src/lib/physics/ascent/recovery.test.ts`, `flight-plan-beats.test.ts`, `ascent-hud.test.ts`,
`ascent-scene.test.ts`. E2e: `tests/e2e/fly-launch.spec.ts` "booster landing is per flight".

## Not done

- Frame time with the inset on a real GPU or phone is not measured.
- Times marked approx or typical in the sourced table are not the flight's own published times
  (USSF-52, IM-1, Beresheet and Nusantara Satu landing times were not found).
- Starship missions that have not flown (`starship-demo`, `starship-mars-crew`) carry an
  approximate catch time (about T+7:00); F3 starts from the latest real flight.
