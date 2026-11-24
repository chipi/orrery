# UXD-051 — Starship Flight 5 on /fly: the ship's return (belly-first entry, landing flip, splashdown)

- **Status**: accepted (built; unit tests and a dev-server browser check, see Verification; production build, docker-e2e and a real GPU not run, see Not done)
- **Date**: 2026-11-22 (proposed) · 2026-11-22 (decided)
- **Decider**: the operator, 2026-11-22, in two steps (plan row F3 of `docs/wip/2026-11-21-0.9.11-plan.md`): (a) which flight, (b) how far. Direction on the ship model, same day: "match photos and stick to high standards".
- **Answers**: 0.9.11 plan row F3 ("The latest Starship flight with the vertical return to the launch pad")
- **Builds on**: [UXD-050](UXD-050-booster-landing-inset-on-fly.md) (the booster landing inset and its tower catch), [UXD-047](UXD-047-the-launch-draws-the-real-pad-of-its-site-and-era.md) (the launch pad models)
- **Changes**: [UXS-003](../UXS-003.md) (Starship Flight 5), `05_Design_System.md` §5.12 (the launch scene), TA.md (Launch / powered ascent; Tier-1 Earth-orbit re-entry), [IA](../IA.md) §surfaces (`/fly`), `src/lib/three/README.md`, `src/lib/three/starship-ship.ts`, `launch-pads.ts` (`buildStarbaseTowerM`), `landing-inset.ts`, `descent-scene.ts`, `fly-leo-coast-scene.ts`, `src/lib/physics/ascent/ascent-physics.ts`, `src/lib/physics/descent/descent-profile-registry.ts`, `src/lib/orbital/earth-orbit-registry.ts`, `src/routes/fly/+page.svelte`

## Context

F2 (UXD-050) drew the booster's tower catch. F3 asks for the latest Starship flight with the
vertical return to the launch pad. Three Super Heavy boosters have been caught (Flights 5, 7 and
8). Flight 8 (6 Mar 2025) is the latest, but its ship was lost about 8 minutes in; Flight 7's ship
was also lost. Flight 5 (13 Oct 2024, Booster 12 and Ship 30) is the only catch flight whose ship
completed its flight: a suborbital coast of about -15 x 212 km x 26.2 degrees, belly-first
re-entry over the Indian Ocean, a landing flip and a controlled splashdown 1 h 5 m after launch.
The sources, SpaceX's timeline as Wikipedia relays it and JSR 838, are in
`docs/wip/2026-11-22-starship-flight-5-sourced.md`.

## Options

Step (a), which flight:

1. **Flight 5.** The only catch flight whose ship completed its flight. Chosen.
2. **Flight 8.** The latest catch. Its ship was lost about 8 minutes in, so there is no return to
   show after the catch.
3. **Flight 8, launch only.** The booster catch without the ship's flight.

Step (b), how far:

1. **Arc and splashdown beat.** The launch with the catch, then the ship's suborbital arc in the
   Earth scene ending on a SPLASHDOWN beat, with no new re-entry animation. Declined.
2. **The full ship return.** The launch with the catch, the suborbital coast, belly-first entry,
   the landing flip and the splashdown beat, a new descent type. Chosen.
3. **Launch only.** The ascent and the booster's tower catch (UXD-050), the ship's splashdown only
   in the mission text. Declined.

The operator also set a rule for the ship model: "match photos and stick to high standards". The
Ship is drawn against the /fleet Starship gallery photos, and the catch inset uses the real
Starbase tower and orbital launch mount geometry.

## Decision

Flight 5, with the full ship return.

1. **Launch.** The flight is a mission (`starship-flight-5`) on the Starship launch profile, with
   its own launch data merged over the vehicle's (`byMission`). It flies no payload and cuts off
   at a -15 km perigee: MECO at 159 s (153 published), SECO at 484 s at 212.5 km (505 published;
   the model uses the vehicle's stage masses, not Ship 30's). There is no ORBIT beat. The booster
   catch is the UXD-050 inset: landing burn 6:28, catch 6:52. The inset draws the real Starbase
   tower and launch mount with truss chopsticks at the catch points.
2. **Coast.** The suborbital arc is drawn along its curve (165 degrees, about 18,000 km), not as
   the short hop used for Mercury-Redstone. A suborbital arc peaks at its apogee (212 km), not at
   the mean altitude.
3. **Return.** Belly-first lifting entry, then the landing flip (the FLIP beat) and a landing
   burn limited to three sea-level Raptors. The descent lamps are BLACKOUT and RETRO; there are
   no chute lamps because there are no chutes. The ship lies belly-first across the frame, turns
   upright at the flip, and the plasma holds level as a sheath along the belly. Sea spray
   replaces grey dust.
4. **Splashdown.** The recovery card has a splashdown eyebrow and an honest caption: the ship was
   not built to be recovered, and a fireball followed about 16 s after splashdown. No landing
   site is printed, because no source gives the coordinates.
5. **Clock.** The times are from liftoff. SpaceX's clock puts liftoff at T+0:02, so every
   published time is shown 2 s earlier (catch 6:52, not 6:54).
6. **Ship model.** `starship-ship.ts` draws the ship as in the /fleet photos: a 5.5:1 stainless
   body with an ogive nose, the windward half in black hex tiles, forward and aft flaps on the
   tile edge, six Raptors under the skirt, satin steel that reads without an environment map. It
   is on /dev/models.

## Consequences

- `LaunchProfile.byMission` and `profileForMission` are merged once, where /fly loads the profile,
  so the scene and the play bar integrate the same flight. `suborbitalCutoff` is a new profile
  field. The inset scene gets the hero image-based light, so stainless boosters do not render
  black.
- A new descent archetype, `EARTH_STARSHIP_RETURN`, and a `landing_flip` beat. Its lift-to-drag
  ratio, Cd·A, entry angle and flip altitude are fitted to transonic, flip and splashdown at 871,
  1032 and 1057 s after re-entry (the model gives 869, 1031 and 1054). They are declared in
  `estimatedFields`, with the entry speed and the splash point.
- `landingSiteEstimated` is a new descent field: when the profile's landing site is an estimate,
  the UI prints no site name and no coordinates.
- The coast registry entry `starship-flight-5` is suborbital, 212 km, 26.2 degrees, 2376 s, and
  has a new `arcDeg` field.
- The 140 mission cards re-render (their numbering). Other kinds' stale cards and 13 stale
  trajectory thumbnails were left as they were: re-rendering them at the earlier commit gives
  today's bytes, so the change is not this one.
- It rules out showing a Flight 8 or Flight 7 ship on /fly; either would be a new decision.

## Verification

Unit tests (`vitest src/lib` and scripts: 544 files, 9402 passed): `launch-timeline.test.ts`
(Flight 5's MECO, SECO and catch), `earth-orbit-registry.test.ts`, `descent-profiles.test.ts`,
`descent-profile-registry.test.ts`, `recovery.test.ts`, `trajectory-soundness.test.ts`.
`validate-data`: no failures. `svelte-check`: 0 errors. eslint and prettier clean. A science
review (FIX-THEN-SHIP) found a delta-v that was an entry speed, the 2 s clock, "three catches"
cited to a Flight-5-only article and "as expected" for the fireball; all were fixed. Dev-server
browser check, screenshots read: the launch with the catch inset, the coast, belly-first entry,
the flip and burn, the splashdown card, at 1280 and 375 px, no console errors.

## Not done

- The production build, docker-e2e and a real GPU were not run.
- The splash point and the entry speed are estimates and are not displayed.
- The trajectory thumbnail draws the short suborbital hop, not the 165 degree arc.
- The times are SpaceX's as Wikipedia relays them; spacex.com gave no text from this machine.
  Splashdown agrees with JSR 838's 1 h 5 m.
- MECO (159 s against 153 published) and SECO (484 s against 505) differ from the published
  times, because the model flies the vehicle's stage masses.
