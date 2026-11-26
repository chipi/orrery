# W10 Shuttle deploy scene: plan (2026-11-26)

Sourced facts: `2026-11-26-w10-shuttle-deploys-sourced.md`. Map below from a planner pass over the
code (file:line as of `e201caf374a`); nothing was run for it.

## Today

Galileo (STS-34), Magellan (STS-30) and Ulysses (STS-41) go from the ascent act straight to the
heliocentric cruise. The Shuttle profile's `payloadInBay` (`space-shuttle-stack.json`) makes
`launchInjection()` return null (`ascent-hud.ts`), the payload is never drawn and the IUS plume code in
`ascent-scene.ts` is unreachable. The ascent ends on the OMS-2 'orbit' hold. No IUS burn is drawn
anywhere except the generic `tli_or_tmi` plume for Magellan in the cruise (`fly-frame-burn.ts`).
Locked in by `payload-in-bay.test.ts` and `tests/e2e/fly-launch.spec.ts` (Galileo's plan has no
SEPARATION / PARKING label).

Doc/code disagreement: the `ascent-hud.ts` comment on payloadSepTFor says the Shuttle+IUS payload is
"deployed midway through the parking coast"; it is not (payloadInBay). Fix with the scene.

## Where the deploy goes (chosen default: C)

- A. Extend the ascent act: rejected. The ascent scene draws a 1.2 km exaggerated vehicle in km, uses
  the procedural orbiter (not `winged.ts`), and the events sit at MET 6-7 h on a clock that ends near
  T+45 min.
- B. An Earth-orbit coast beat (`earth-orbit-registry.ts`): rejected. `earthCoast` routes
  `coastComplete` to a descent these missions lack; the coast scene is km-scale with the craft 460x.
- **C. A lazy `DeployScene` in metres, hosted between the launch end and the cruise**, like the way
  home (`fly-return-scene.ts`, `ReturnScene.svelte`, profile-file existence selects missions as in
  `return-profile.ts`). No new act; reducer and payloadInBay contracts untouched.

## Build order

1. Data: `static/data/deploy-profiles/<missionId>.json` + `src/lib/fly/deploy-profile.ts`
   (validator, `hasDeployProfile`, `loadDeployProfile`, GET parsing shared with return-profile).
   Fields: missionId, launchZeroUtc, method `ius-tilt` | `rms`, orbiter, orbit, doorsOpenMet?,
   tilt [{deg, met?}], releaseMet, springMs, sepBurns [{id, met, burnS, dvFts?}], ius {stage1,
   stage2?, pamS?}, estimatedFields, provenance.
2. Models: `showcase/ius.ts` (IUS two-stage 17 x 9.25 ft, ASE tilt table with `setTilt(deg)`,
   PAM-S), mounted in `buildOrbiterOpenable()`'s bay. Schematic until W11's standard is signed off.
3. Scene `fly-deploy-scene.ts` (pure in scene time): establish, doors open, tilt 29 deg, tilt to the
   deploy angle, spring release at 0.15 m/s, table to -6 deg, orbiter separation burn, compressed IUS
   coast, stage-1 and stage-2 burns (Ulysses: spin-up, PAM-S), fade to cruise. About 75 s of scene
   time; the HUD shows real MET from a piecewise table; estimated beats marked "~".
4. `DeployScene.svelte` + page wiring (LaunchScene onComplete -> DeployScene when a profile exists ->
   `launchComplete`), skip button, DEV hook `__flyDeployT`, act-shot `D<s>` spec.
5. i18n: HUD labels in 14 locales (doors open, tilt, release, separation burn, IUS stage 1/2, PAM-S,
   spin-up, time-compressed caption, skip, aria).
6. Tests: profile deltas (Galileo release->OMS-3 899 s, ->IUS 3612 s; Magellan 889 s; Ulysses +59 s,
   +3899 s), scene purity and poses, craft-in-frame at 1280x800 and 390x844, e2e `fly-deploy.spec.ts`.
7. Observatory hook (no work now): `method: 'rms'` posing the existing `RmsRig`. Chandra (STS-93) is
   fully sourced for the IUS path once it has a mission record.

## Defaults taken (operator may overturn)

- Option C, its own scene with its own skip; not a band on the master scrubber.
- Magellan's tilt 52 deg (PK30, the only Magellan source) with the 58 deg conflict in provenance;
  Ulysses 58 deg assumed (flagged).
- Orbit from the kit plan where no actual was found; doors-open and tilt times are estimates.
- Schematic IUS / table / PAM-S until W11.

## Needs the operator

1. Which observatories become missions (Hubble at least, per the plan row), and RMS release then.
2. The deploy on the master scrubber (a new 'deploy' act) or its own scene (default)?
3. W11 level-of-detail standard before final models.

## Progress (2026-11-26)

- Step 1 data: `95e7a26883d` (+ `97d91c48daf` type fix). Step 2 models: `b2d5ea9910d`. Step 3 scene:
  `e416d531c44`. Step 4 page wiring, labels in 14 locales, e2e: `ae0b2acf9a7`. Docs: `0319767e24d`.
- Checked: unit tests (profiles 8, scene 22 incl. subject in frame at 1280x800 and 390x844, IUS 4),
  typecheck, validate-data, `fly-deploy.spec` on desktop and mobile against the dev server, the
  launch end -> deploy -> Skip -> cruise path by a probe, frames of Galileo and Ulysses at both sizes
  (`deploy-shot.mjs`).
- Science review (sonnet): 0 numeric errors; its three should-fixes applied (STS-41 tilt and the 88 s
  PAM-S burn now sourced, the scene header no longer overstates what is sourced).
- Not yet: a production build for the route budget of the lazy chunk;
  the reduced-motion stills the plan names. Under reduced motion the scene plays as is (it froze on
  its first frame until the 0.9.12 fix: the animate loop zeroes dt; the deploy, the way home and the
  winged return now opt out, as the coast does; `fly-winged.spec`).
- The Earth backdrop is the 2k day map at 1/1000 scale: soft when the camera looks straight down
  (the separation shot); the burn shots see the limb.
