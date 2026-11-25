# W6: the /fly cut inventory (2026-11-25)

Step 1 of W6 (plan row: "inventory the cuts first with a picture sheet per act, then decide changes
with the operator"). Read from the code by a search agent; three claims spot-checked by hand
(the Earth-entry fallback rate in `fly-frame-runner.ts`, `flySegment`'s four values, the dormant
`finaleStartedAt`). Picture sheets: `docs/wip/2026-11-23-pass2-tools/act-shot.mjs` (launch, cruise),
`desc-shot.mjs` (descents), `return-shot.mjs` (the way home).

## Acts and who owns the camera

The act machine is `src/lib/fly/flight-phase-controller.ts`: `opening | ascent | coast | cruise |
descent | recovery`. The way home and booster returns are not acts (the way home plays inside
`descent`, a booster return inside the launch scene). One overlay per act on `/fly`: LaunchScene,
CoastScene, ReturnScene, DescentScene; cruise is the base canvas. The play clock is
`fly-frame-runner.ts` (F8's activity clock replaces the fixed rates for launch and descent).

| Act | Camera | How shots are chosen | Phone-aware |
|---|---|---|---|
| Opening, prelaunch | `helio-non-flyby-frame.ts` (`opening`, `prelaunch`) | timer (9.5–22 s) or Skip | no |
| Launch | `ascent-director.ts` (`buildDirectorPlan`), `launch-director-rig.ts` | seeded plan: an opening pick, event beats (Max-Q, staging, fairing, payload sep), a filler pool of 12 shots in 10–50 s pieces | yes (SafeArea fit) |
| Booster return | `booster-return-scene.ts`, `landing-inset.ts` | full-frame chase then deck cut (Falcon 9 / New Glenn with a sourced entry burn), else a fixed inset | full frame yes; inset no |
| Earth-orbit coast | `fly-leo-coast-scene.ts` | ESTABLISH, TRACK, LIMB, GROUND-TRACK at fixed fractions 0.28 / 0.55 / 0.82 of a ~22 s coast | eccentric orbits only |
| Helio cruise | `fly-camera-controller.ts`, `helio-non-flyby-frame.ts` | by leg progress (depart, cruise, approach, arrived, epilogue) | no |
| Flybys | montage (`flyby-shots.ts`: establish, approach, hero, depart at fixed MET offsets) or the classic iconic frame with peak hold and afterglow (`?montage=0`) | MET offsets from the peak | no |
| Cislunar | `cislunar-camera-target.ts`, `cislunar-hero-shot.ts` | by phase (Moon or Earth close-up, TLI/TEI pans) and hero windows at LOI, TEI, descent, ascent | no |
| Descent, splashdown | `descent-director.ts` (`BEAT_SHOT`) | event beats plus a seeded fill of 12–30 s, a ground shot for the last 18 s, an open-ended orbit after | yes |
| Way home (Apollo) | `fly-return-scene.ts` (`BEAT_SHOT`, per-mission `camera.shots`) | a cut per beat, 82 s scene | yes |
| Recovery | the descent camera, a card over it | — | — |

## Act seams

| From → to | Mechanism |
|---|---|
| opening → cruise / launch | timer or Skip; 600 ms dwell |
| any act → another act | the seam fade (black 90 ms, fade in) on `flySegment` |
| ascent → coast or cruise | auto at the end of the ascent or CONTINUE; a 1.6 s pull-back |
| coast → descent | auto at the end of the coast |
| cruise → descent | auto at arrival |
| descent → surface page | a 1.2 s touchdown flash, then the body page |
| Moon descent → way home | the "Continue: the way home" button |
| way home → cruise | auto at 82 s or Skip (seam fade on the exit only) |
| Earth entry → recovery → cruise | flash, card, close |
| cruise jump > 365 d | a 200 ms black cut |
| booster return in and out | plain cuts |

## What the inventory shows (for the review with the operator)

1. **Phone framing is uneven.** Launch, descent, the way home and the full-frame booster return
   fit their subjects to a tall screen; the cruise, flybys, the cislunar camera, the circular LEO
   coast, the landing inset and the launch pull-back do not.
2. **Four separate aspect rules** for the same job (the launch SafeArea fit, the descent's
   `min(1, aspect)`, the `1 + 0.7(1/aspect − 1)` back-off copied in two files, the coast's special
   case). No shared helper.
3. **Seams that do not fade:** entering the way home (it stays in the `descent` segment), the
   descent-profile swap inside DescentScene, the booster-return cuts.
4. **Timer cuts next to event cuts.** Launch and descent cut on events, with timer filler; the
   coast cuts on pure time fractions; the flyby montage on fixed MET offsets.
5. **Two flyby systems** (montage and classic) and two launch cameras (director and
   `?cam=classic`).
6. **Dormant code:** the finale lock (`finaleStartedAt` set only in tests), the unused
   `LAUNCH_DWELL_DURATION_MS` (4000; the page uses 600 ms), the pre-F8 Earth-entry fixed rate (now
   only a fallback when no play clock is built).
7. **Slow motion in three places** with different windows (launch, descent, flyby); F8 replaced
   the launch and descent ones for play.
8. **The scrubber layout (F8 phase 2):** the scrubber still uses the descent time warp and the
   launch coast warp, while play follows the activity clock, so the playhead moves unevenly.
   Folded into this review: lay the scrubber out by wall time, or keep the warps.

Not covered by the inventory: the bodies of the 12 launch pool shots and the flyby composers, the
`/dev/launch-director` review route, the e2e specs.

## Picture sheets (2026-11-25)

Review page for the operator: https://claude.ai/artifact/GvRdNiknULCEAx1AsqpA2z (launch: Apollo 11,
Inspiration4, Vostok 1, Perseverance, STS-1, Starship Flight 5; cruise: Apollo 11, Perseverance,
Voyager 2; descent: Apollo 11, Perseverance, Inspiration4; the way home: Apollo 11; phone strips).
Seen in the frames, beyond the inventory: the cislunar coast reads empty on desktop (Earth and the
Moon as dots, no craft); a bright vertical light column in the descent sky backdrop on Mars and
Earth; Dragon's mains out of frame and no entry glow on the splashdown; the descent's opening wide
shot shows no craft; Apollo 11's LM over black at 85% of the descent; the way-home caption reads
"Docking approach" at 54 s during the close-up (not investigated). Seven calls put to the operator
on the page.

## Decisions (operator 2026-11-25: "1 -7 yes")

1. The cislunar coast gets a craft-led camera (the spacecraft in frame, Earth or the Moon behind).
2. One shared phone-framing rule, used by the cruise, flyby, cislunar and coast cameras.
3. The seam fade on the way-home entry and the booster-return cuts.
4. F8 phase 2: the scrubber laid out by watching time.
5. Remove the dormant paths: the finale lock, `?cam=classic`, the classic flyby (`?montage=0`).
6. The launch HUD fades back after liftoff on desktop.
7. Fix the descent defects: the sky light column, Dragon's chutes and entry glow, the empty opening
   shot, the LM over black; and the way-home caption at 54 s.

## Added (operator 2026-11-25): the iconic flyby missions

"Review the flights of all iconic missions and their flybys, the planets … those iconic missions are
where camera work really comes into the game. Let's review all of those equally diligently."
Scope: every multi-flyby and planetary-tour mission on /fly (the Voyagers, Pioneers 10 and 11,
Galileo, Cassini, New Horizons, MESSENGER, BepiColombo, Rosetta, Juno, JUICE, Parker Solar Probe and
the rest the mission list carries): picture sheets of each flyby's montage (establish, approach,
hero, depart) on desktop and phone, the cruise between them, and the arrival; findings and calls to
the operator as for W6 step 1. Runs after the seven W6 changes above.

## Done (2026-11-25)

| Call | Commit | What changed | Checked |
|---|---|---|---|
| 7 | af80c873784, fe0029bb14d | scrim column, splashdown canopy, opening marker, no black sky on the Moon | Chromium frames |
| 3 | 36b4d1a2789 | seam fade on the way-home entry and the booster-return cut in and out | seam opacity 1 at each (0 with the old key) |
| 5 | a0236bbbe6a, 5dcd4192ac5, 14c4aaa1b8c | `?montage=0`, `?cam=classic` (+ AscentCameraDebug), the finale lock (+ `fly_mission_end`, 14 locales) removed; the epilogue's black layer kept (`epilogueBlackOpacity`) | unit tests; Inspiration4 launch under the director |
| 6 | d8c4a1f8f34 | launch telemetry + dossier recede to 0.32 from T+20 s on a fine pointer; hover restores | T+10 / T+60 s frames |
| 2 | 4ada8461fac | `phone-framing.ts` (`portraitFit`, `portraitFov`): helio + cislunar + coast widen the field of view, the way home + booster return use the distance form | 390x844: Voyager 2 at Jupiter, Perseverance, Apollo 11, STS-1 |
| 1 | a08f45dcc36, 61865e86776 | cislunar craft placed by its orbit's timing (Kepler areas, or a published path's own times); craft-led long-lens coast shot | Apollo 11 MET 0.3/1/2 d, desktop + phone |

Found on the way (not fixed, for the operator): the hybrid (tier 1.5) Apollo cislunar waypoints are
stamped evenly by index and their return legs are not a conic (Apollo 11: a sideways hop at
383,000 km from MET 5.64 to 5.75 d, then a radial fall), so on the way home the craft reaches
Earth's vicinity within a day of TEI (real flight: about 330,000 km at MET 6.5 d). Fixing it means
regenerating those waypoints from a source; the craft-led shot leaves the return's close-in part
to the diagram frame meanwhile. The descent and launch keep their own exact framing rules.

Call 4 (7dd6812f356): the bar's launch and descent bands are laid out by watching time at the default pill (each play clock's `layout`); checked by a unit test (even playhead) and an Inspiration4 scrub round trip.

All seven calls are in. Not run yet: the e2e suites (desktop, mobile, landscape) and `preflight:coverage`. Next: the iconic flyby missions review.
