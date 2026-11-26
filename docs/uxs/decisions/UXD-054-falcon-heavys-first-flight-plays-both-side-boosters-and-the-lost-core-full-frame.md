# UXD-054 — Falcon Heavy's first flight plays both side boosters and the lost centre core full frame

- **Status**: accepted (built; unit tests, see Verification; the browser check, production build, docker-e2e and a real GPU not run yet, see Not done)
- **Date**: 2026-11-26 (proposed) · 2026-11-26 (decided)
- **Decider**: the operator, in the 0.9.12 plan row W13 (2026-11-24): "both side boosters landing side by side at LZ-1 and LZ-2 in the full-frame booster return (today Falcon Heavy side boosters keep the inset, UXD-052 — this is the flight that earns the full frame) and the centre core missing the drone ship (it hit the sea)"; operator decisions 2026-11-27 #8 and #11 (`docs/wip/2026-11-27-operator-decisions.md`)
- **Answers**: 0.9.12 plan row W13
- **Builds on**: [UXD-052](UXD-052-booster-returns-play-full-frame-when-the-entry-burn-is-sourced.md) (the full-frame return and its gate), [UXD-050](UXD-050-booster-landing-inset-on-fly.md) (the inset)
- **Changes**: [UXD-052](UXD-052-booster-returns-play-full-frame-when-the-entry-burn-is-sourced.md) (its "Falcon Heavy side boosters keep the inset" now has one exception), `src/lib/three/README.md`, `src/lib/three/booster-return-scene.ts`, `booster-return-timing.ts`, `showcase/falcon9-booster.ts` (a side-booster variant), `src/lib/components/LaunchScene.svelte`, `src/lib/orbital/flight-plan-beats.ts`, `hud-labels.ts`, `src/lib/physics/ascent/ascent-physics.ts` (`outcome: 'lost'`), `static/data/launch-profiles/falcon-heavy.json`, `messages/*.json` (`hud_core_lost`)

## Context

UXD-052 played a booster's return in the whole frame when its entry-burn time was known, and left
Falcon Heavy's side boosters in the small inset because their pair "has its own look". The operator
asked for the one flight where that look is the point: Falcon Heavy's first launch on 6 Feb 2018,
whose two side boosters came down together on the neighbouring pads LZ-1 and LZ-2 while the centre
core missed its drone ship and hit the sea.

The facts are in `docs/wip/2026-11-26-falcon-heavy-demo-sourced.md`. The press kit and Spaceflight
Now give the planned timeline: side-core entry burn 6:41, the side cores' landing 7:58 (one time
for both), the centre core's entry burn 6:47 and landing 8:19. No actual times were found. LZ-2
lies 310 m north-west of LZ-1, and both are 86 m pads (Wikipedia). The centre core lit one of its
three landing engines and hit the water at about 500 km/h, about 100 m from Of Course I Still
Love You, damaging two of the ship's thrusters. Space.com gives 484 km/h; both sources say "300 mph".

## Options

1. **Keep the inset for the pair, as UXD-052.** For: one rule for Falcon Heavy. Against: the twin
   landing is the image this flight is known for, and at 280 px the two boosters are specks.
2. **Full frame for every Falcon Heavy side-booster landing.** Against: no other flight in the
   catalogue has an entry-burn time for its side boosters. Psyche's is unknown, and USSF/OTV-7
   only has a sibling flight's times, so the scene would invent the descent.
3. **Full frame for this flight's pair, then the lost core, on the UXD-052 gate.** Chosen.

## Decision

Option 3. The UXD-052 gate is unchanged. A landing-zone return plays full frame when its entry
burn is known and its time class is `sourced` or `approx`. Falcon Heavy now passes the gate on the
landing zone, never on a drone ship. In the catalogue only the demo flight
(`recoveryByMission["falcon-heavy-demo"]`) carries the entry burn.

1. **The pair.** Two side boosters come down at the same time: one to LZ-1, one to LZ-2, 310 m
   north-west. Each is a Falcon 9 first stage under a white nose cone. They run the same entry burn,
   grid fins, cold-gas puffs, landing burn and legs as UXD-052, with each booster's wobble and puffs
   out of step with the other's. The camera stands south-west of the pads and looks north-east to
   the Atlantic. It stays far enough back that both boosters fit the frame's width at any aspect:
   high with them during the descent, then low over the scrub as they land.
2. **The lost core.** As the pair's hold ends, the scene cuts to sea. The centre core comes down on
   one engine beside the drone ship and hits the water about 100 m off its side at about 500 km/h.
   A column of spray rises and fades. The camera chases the core, then pulls back across the ship
   far enough to keep both the core and the sea in frame, and dollies in as the core falls. The
   caption changes from "BOOSTER LANDING · LZ-1 · LZ-2" to "CENTRE CORE LOST · Of Course I Still
   Love You", and the flight plan shows a CENTRE CORE LOST beat at 8:19 with `~`, because the time
   is the planned landing.
3. **Data.** A recovery entry gains `outcome: 'lost'` (a landing attempted and missed). Its
   `touchdownS` is the impact. The plan beats and the HUD label (`hud_core_lost`, 14 locales) read it.
4. **Sourced and not.** Sourced: the planned times, the pads and their separation, one engine lit,
   the impact speed (with the conflict) and the miss distance. ESTIMATES (listed in the scene's
   header): the pair's landing-burn start (17 s before touchdown, from IM-1's sourced RTLS burn),
   the nose cone's length and shape, the second booster's wobble phase, the one engine's
   deceleration, the splash, every camera, and the ship's place in the scene (its real distance
   downrange is NOT FOUND).

## Consequences

- UXD-052's "Falcon Heavy side boosters keep the inset" holds for every flight but this one.
- Recovery data gains a fourth outcome, `lost`. `landingsFor` includes it; the inset never plays it.
- The return scene's API gains an optional `lost` landing and a `phaseAt(t)` for the caption.
- Adding another flight's pair later is a data entry (an entry-burn time), not a new decision.

## Verification

- `src/lib/three/booster-return-scene.test.ts` covers four things:
  - Both pads are 310 m apart, and a booster's feet stand on each at touchdown.
  - Both boosters stay inside the frame from the entry burn to touchdown, at 1.6 and at 0.46 (phone).
  - The lost core's window opens as the pair's closes, and the core hits the water at the sourced speed.
  - The falling core, then the splash beside the ship, stay in frame at both aspects.
- `flight-plan-beats.test.ts` and `recovery.test.ts` still pass.

## Not done

- No actual (webcast) times were found for any of these events; all are the planned ones.
- Which booster landed on which pad has one source only (Wikipedia: B1023 on LZ-1, B1025 on LZ-2).
  The scene doesn't name them.
- The browser screenshots at 1280 and 375 px, the production build, docker-e2e, the e2e on both
  projects and a real GPU are not run yet.
