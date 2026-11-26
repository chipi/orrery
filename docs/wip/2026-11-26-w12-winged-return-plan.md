# W12 winged returns: plan (2026-11-26)

Sourced facts: `2026-11-26-w12-winged-returns-sourced.md`. Map from a planner pass over the code (file:line
as of `c1a18a6b7a9`); nothing was run for it.

## Today

`sts-1` and `otv-1`..`otv-7` launch, coast in `CoastScene` and stop on its last frame: `startDescent`
returns early without a `descentProfile` (`+page.svelte`), and no file in `static/data/descent-profiles/`
exists for them (`DESCENT_MISSION_IDS`, size pinned by `descent-profile-registry.test.ts`). The
`DescentProfile` shape cannot fly a glide anyway: planar 2-DOF, one constant L/D fraction, a constant
bank, phases without alpha, roll reversals, lateral state or a runway. Buran has fleet entries but no
mission record and no Energia launch profile, so it cannot launch on /fly.

## Chosen defaults

- **Physics: a scripted profile through sourced waypoints**, not a new descent archetype. The sources
  are waypoints already (the workbook's Mach / alpha / range / altitude table, the roll reversals at
  Mach 18.5, 9.8, 4.8 and 2.8, the press kit's final-approach table, the post-flight runway
  distances); the sources give no L/D, so an archetype would be a fit with every input estimated. Like
  the W10 deploy: scene time -> real MET knots, every unsourced value "~" and in `estimatedFields`.
  A test may cross-check the knots with `integrateDescent` and a fitted L/D, without shipping the fit.
- **Scene: a new runway scene** (`fly-winged-return-scene.ts`, `WingedReturnScene.svelte`), not
  `descent-scene.ts` (a vertical descent onto a sphere patch in km). Entry shots on the deploy
  scene's 1/1000 Earth; below ~80 kft a runway-anchored metre frame. Hosted like the way home: a branch
  inside `showDescent`, so the reducer is unchanged; `descentAvailable` also true with a winged profile.
- Profiles in `static/data/winged-profiles/<id>.json` (not `descent-profiles/`).
- Its own scene and Skip, no master-scrubber band (as W10).

## Build order

1. `src/lib/fly/winged-profile.ts` + `static/data/winged-profiles/sts-1.json` (validator, loader,
   MET parsing shared with return/deploy profiles; test: 6,053 + 8,993 = 15,046 ft).
2. Gear rig on `showcase/winged.ts` (`gear?: 'animated'`, `setGear(t)`, default look unchanged);
   the drag chute later (STS-1 flew none).
3. `showcase/runway.ts`: strip, centre line, thresholds, overruns, lakebed plane; sourced sizes only.
4. Scene + page wiring, STS-1 only; deep link `?winged=1`; DEV hook `__flyWingedT`.
5. Labels `fly_winged_*` in 14 locales; tests (profile, scene purity and in-frame at 1280x800 and
   390x844, a registry join guard listing the winged coasts without a profile); e2e desktop + mobile.
6. Docs (TA.md, READMEs, the `earth-orbit-registry.ts` comments), science review.
7. Slices: KSC SLF + X-37B gear (OTV-4..6); Vandenberg (OTV-1..3, OTV-7); drag chute; Buran.

## Needs the operator

1. **Buran on /fly.** No Energia launch profile; the registry test wants a coast for every flown
   mission with a launcher and flight data. (i) a record without a launcher ref and no Fly, only a
   landing deep link (default); (ii) source and write an Energia launch profile (large).
2. X-37B approach speeds and deorbit times are not found, and the note forbids Shuttle-class speeds
   for it: default no airspeed on its HUD, the track marked "~".
3. Runway ends: STS-1 runway 23 (sourced); X-37B 12 (Vandenberg), 15/33 (KSC); Buran 06/24 with
   the end not found (default 06, estimated).

## Conflicts carried (do not smooth over)

- The plan row says KSC from OTV-4 on; OTV-7 landed at Vandenberg (7 Mar 2025). The row is wrong.
- The row's Buran "unplanned turn to the other approach": the source says extra turns, an overflight
  to the north and a right turn onto final, no runway reversal.
- EI 400,000 ft vs 390,000 ft ([WS1]): use 400,000. TAEM 82,000 / 83,000 / 85,000 ft: 83 kft "~".
- Main-gear touchdown 2,600 ft long ([WS1]) vs 3,050-3,100 ft ([SYM], primary): use [SYM].
  Touchdown 185 KEAS planned vs 183 flown: use flown.
- The press kit's "5 degrees glide path" beside gear-down: a typo next to the 1.5 deg inner glideslope.
