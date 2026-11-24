# UXD-053 — Apollo's way home on /fly: a Continue button after the landing, the LM ascent to the splashdown

- **Status**: accepted (built; unit tests and dev-server screenshots, see Verification; production build, docker-e2e, a real GPU and the e2e on both projects not run, see Not done)
- **Date**: 2026-11-24 (proposed) · 2026-11-24 (decided)
- **Decider**: the operator, 2026-11-24, in the way-home plan (`docs/wip/2026-11-24-apollo-way-home-plan.md`, "Flow agreed with the operator"). The operator chose: (a) a Continue button, not auto-play; (b) the `/moon` hand-off kept beside it; (c) the same chain for every Apollo landing with the camera varied per mission; (d) time compressed, with the real GET shown. A lead agent worked out the scene, the act wiring and the sourced figures.
- **Answers**: the operator's wish of 2026-11-24 ("after an Apollo lunar landing, the flight continues: LM ascent, docking with the CSM, LM jettison, trans-Earth injection, the coast home, re-entry and splashdown")
- **Builds on**: [UXD-042](UXD-042-plan-to-fly-handoff-grouped-destinations-and-the-journey-bar.md) (the `/fly` to `/moon` hand-off), [UXD-051](UXD-051-starship-flight-5-the-ships-return-on-fly.md) (a return to Earth with a splashdown recovery card), RFC-034 §13 (the Earth-return bookend)
- **Changes**: [UXS-003](../UXS-003.md) (The way home), `05_Design_System.md` §5.12, TA.md (`/fly` descent act, the way home, the landing day), [IA](../IA.md) §surfaces (`/fly`), `src/lib/three/README.md`, `src/lib/three/fly-return-scene.ts`, `src/lib/components/ReturnScene.svelte`, `src/lib/fly/return-profile.ts`, `src/lib/fly/flight-phase-controller.ts`, `src/lib/fly-mission-apply.ts`, `src/routes/fly/+page.svelte`, `static/data/return-profiles/`, `static/data/descent-profiles/apollo*-splashdown.json`

## Context

Until now an Apollo landing ended on `/fly` at touchdown: the visitor could open the site on
`/moon` and that was all. The astronauts then lived on the surface for one to three days, lifted
off in the LM's ascent stage, docked, jettisoned it, fired the SPS for trans-Earth injection (TEI)
and splashed down. The operator asked for that second half.

Two defects had to be fixed first. A round trip's `arr_day` is its Earth return, so the landing
act fired at splashdown time, not after lunar orbit insertion; the landing now starts at the
recorded `descent_start` (`landingDay` in `fly-mission-apply.ts`; the same fix lands Hayabusa,
Hayabusa2 and OSIRIS-REx on their touchdown days). And the guided lunar-return entry flew the
commanded bank from entry interface, where Apollo held lift up through the first pulse (below).

## Options

How it starts:

1. **Auto-play after touchdown.** For: no click. Against: it takes the landed frame from a
   visitor who wants to stay on it, and removes the `/moon` hand-off's moment. Declined.
2. **A "Continue: the way home" button beside the `/moon` hand-off.** Chosen.

How far it goes and how it looks:

3. **One scene, one camera for all six.** For: one thing to build. Against: the six flights
   differ (a rover on three, a SIM bay on three, a subsatellite on two, a tumbling stage on one).
   Declined.
4. **The same chain for every Apollo landing, each with its own camera style and hardware.**
   Chosen. Apollo 11, 12, 14, 15, 16 and 17 ship; Apollo 13 had no landing.

## Decision

Options 2 and 4. After an Apollo landing, `/fly` offers "Continue: the way home" next to the
`/moon` hand-off. The visitor chooses.

1. **The chain.** LM liftoff (the descent stage stays), pitch-over, orbit insertion, the
   rendezvous burns the mission flew, docking with close-ups of the probe entering the drogue, LM
   jettison, TEI. Then the normal cruise view resumes at TEI and flies the return arc to Earth, and
   at the Earth return the descent act plays the entry and splashdown under three mains (Apollo 15:
   two, one deflating), ending on the recovery card.
2. **Time is compressed and the HUD says so.** Scene seconds between events are editorial; the
   HUD shows the real Ground Elapsed Time (GET), piecewise linear through the sourced event times.
   A scrub is exact because the pose and camera are pure functions of scene time.
3. **Per-mission camera style.** A profile's `camera.shots` overrides the default shot per beat:
   Apollo 12 and 14 a low liftoff pull-back, a window view and a side rendezvous; Apollo 15 an
   open SIM-bay docking view; Apollo 16 and 17 their own. The J missions (15, 16, 17) show the
   extended LM, the rover parked east with its TV camera as the liftoff shot (held on 15,
   followed then lost on 16, followed on 17), the CSM's open SIM bay turned to the LM, the PFS
   subsatellite ejected on 15 and 16, and Apollo 16's stage tumbling after jettison.
4. **Sourced or named.** Every GET, burn length and entry figure is from the mission reports;
   what is not published (the rover distance, the ascent path shape, the ranges, the docking speed,
   the camera moves) is in each profile's `estimatedFields`. Apollo 17's CSM trim and plane change
   are in the profile but not played.
5. **The splashdown.** A way-home mission carries a `splashdownProfile` (`apollo11-splashdown` to
   `apollo17-splashdown`, from the Apollo entry postflight analysis and SP-4029). The cruise
   swaps it in as the descent profile when it reaches Earth, and scrubbing back restores the
   landing.

## Consequences

- No new `FlyAct`. The scene plays inside the descent act behind a `wayHome` flag in
  `+page.svelte`, so every full-frame gate on `showDescent` already applies. A new reducer event
  `returnComplete` takes the act from descent back to cruise, and the page sets `simDay` to
  `dep_day + TEI`.
- `wayHomeDone` stops the landing from firing again; `descentDue` (in `return-profile.ts`) picks
  which descent act the cruise is at the gate of: the landing, or the splashdown at `arr_day`.
- A mission has a way home exactly when `static/data/return-profiles/<id>.json` exists (the id
  set is the directory listing), so another mission needs a data file and a splashdown profile.
- The Earth entry holds lift up through its first deceleration pulse for a lunar return
  (`holdLiftUpThroughPulse`, entry above 9 km/s): Apollo 11 flies its sourced L/D 0.282 and range
  2,772 km. **Recorded model limit:** the model's first pulse reads 8.0 g against 6.73 g flown for
  Apollo 11 and 10 to 27 percent high for 12, 14, 15, 16 and 17; the tests' bands admit it.
- The descent-profile count is 85 (six of them the splashdown profiles).
- It rules out auto-play and a single shared camera; Luna 16/24 and Chang'e 5/6 chains are a
  later decision (RFC-034 §13).

## Verification

Unit tests: `src/lib/fly/return-profile.test.ts` (profiles, burn lists, `descentDue`),
`flight-phase-controller.test.ts` (`returnComplete`), `src/lib/three/fly-return-scene` pose and
camera, `descent-profiles.test.ts` (six splashdown profiles against the flown peak g and time),
`descent-physics.test.ts` (the lift-up hold). `?wayhome=1` deep-links to the scene for browser
checks. Dev-server screenshots at 1280 and 375 px for each of the six; the way-home strings are
reviewed in 13 locales.

## Not done

- Production build, docker-e2e, the e2e on both projects and a real GPU were not run.
- Apollo 12's hard splashdown (about 15 g, the camera that hit Bean), its tip-over, and Apollo
  14's fouled main have no per-profile shake or post-splash attitude; Apollo 15's deflating main
  is drawn but the camera does not show the collapse (`docs/wip/2026-11-21-0.9.12-plan.md`, B1).
- Rendezvous ranges, directions and the ascent path are not to scale.
- The entry's first pulse is above the flown figure (the recorded model limit above).
