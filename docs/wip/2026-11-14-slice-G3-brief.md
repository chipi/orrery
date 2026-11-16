# Slice G3 brief — Ascent: a directed launch camera after the first seconds, never the same twice, shown to the operator before it is built (FY2 closed, LA1, D6 answered)

Read-only brief, written at HEAD `8f0a5872bce` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, read-only scripts (scratchpad `gbr-ascent.mjs`, `gbr-sched.mjs`, `gbr-sched-all.mjs`, `gbr-wall.mjs`, run with the repo's `tsx`, not in the repo; their output is quoted), the nine example images the operator sent on 2026-11-14 (opened one by one), and screenshots of launches against the shared dev server `http://[::1]:5180` with the repo's Playwright Chromium (`gbr-shots.mjs`; §2.9). No code or data was changed. The working tree holds other agents' uncommitted edits: not touched. This is the third G brief; decisions are numbered across the three, G-15 to G-30 here. Standing rules respected: free route first (no paid run, no new dependency), no cyan or teal in UI states, 14 locales for any new text, no hero image touched.

## 0. Answer first

1. **FY2 is closed: the operator does not want the first seconds changed.** Operator, 2026-11-14: "On G3 first seconds are ok as they are, but then we should change the view as images attached." So the ground-relative downrange fix that this slice was written around (plan line 399: "downrange drawn ground-relative so the first seconds rise vertically") is **not wanted** and is not in this brief's build. What the code does there is recorded in §2.8 as a fact only (the numbers were computed before the answer arrived), so nobody has to re-derive it if the operator ever asks again. The opening stays: the pad orbit shot (T-12 s to T+3 s) and the ground long-lens `tower_clear` shot (T+3 s to T+22 s), both unchanged.
2. **After T+22 s the camera is nine fixed shots and one of them plays for minutes.** The schedule (`buildShotSchedule`, `src/lib/orbital/ascent-cameras.ts:143-201`) is `pad`, `tower_clear`, `ascent` (T+22 to Max-Q), `onboard_down` (Max-Q to the first separation), `staging`, `fairing`, `chase`, `separation`, `orbit`. In **38 of the 40** launch profiles a single `chase` or `ascent` window longer than 120 s follows, in 31 longer than 200 s, up to 601 s for Atlas V (`gbr-sched-all.mjs`). Falcon 9: `chase` runs from T+177.5 to T+498.6 (321 s of flight time; at the default ×5 speed 64 s of screen time) on one pose function with a slow 0.32 rad orbit (`composeShot` `chase`, `:386-399`).
3. **No shot looks from above or from below.** Hand-computed from the pose formulas: the camera sits between about 0° and 18° above the line of sight to the vehicle in every post-opening shot (`chase` 11° to 15°, `ascent` 1° to 4°, `onboard_down` 0° to 3°, `orbit` 16° to 18°). The overhead and look-down shots (examples 1 and 2), the low angle (7) and the distant wide (9) cannot be made by changing numbers inside the existing shots; they are new pose functions.
4. **Camera moves are slow and nearly static in field of view, and shots cut hard.** Each shot's pose is a smoothstep of its progress; field of view is a constant per shot (38° to 44°) except `tower_clear`; and the smoothing layer that eases the live camera toward the target (`ascent-scene.ts:960-1366`, `K_POS` 0.13, `K_FOV` 0.13 per 60 Hz frame) settles 95 % in 0.36 s (`gbr-wall.mjs`), so a change of shot is a cut for practical purposes. There is no zoom move, no crane, no whip, no blend of two poses, no camera shake.
5. **The user has no camera control and the scene has no reduced-motion handling.** `LaunchScene.svelte` has no pointer or wheel handler (only DEV hooks `__camOverride`, `__topDownKm`); `prefers-reduced-motion` is read by the `/fly` page only to start paused (`+page.svelte:978-992`).
6. **The scene can render some of the examples today and not others.** Renderable now: the Earth's curved limb with a thin atmosphere rim, a sky that fades to stars by 55 km, a real satellite photo of the pad (full strength to 10 km altitude), a layered exhaust plume with per-engine flames, procedural models for SLS, the Space Shuttle, Vulcan and Ariane 6. Missing: **smoke and steam at the pad, a cloud layer (removed on purpose, `ascent-scene.ts:471-475`; no cloud texture in the repo), any motion blur or shake, a sun flare**, and **Vega** (no model, no profile, no fleet entry). Vulcan and Ariane 6 have models but no launch profile, so they fly the generic 2-stage physics (§2.6).
7. **The proposal is a director, built behind a review.** A pure module `src/lib/orbital/ascent-director.ts` that turns the vehicle's flight events into a timeline of shots (event → shot → move → duration → easing), picked from per-phase pools by a seeded generator so the same launch always replays the same and different launches differ, with eased blends between shots, a hard cut on three dramatic beats, a beat for Max-Q and each separation, a manual nudge that hands back, and a static fallback for reduced motion. **Nothing reaches production before the operator approves the look:** step 0 is a dev-only prototype route (`/dev/launch-director`, which is 404 in any production build) that plays two or three launches with the director, side by side with today's camera, and writes clips and frame strips for the operator to review (§4.1). Decision 15.
8. **Cost:** no data change; no new image or dependency. New pure module and tests, a dev route, wiring in `ascent-scene.ts` and `LaunchScene.svelte`, optionally scene additions (smoke, clouds; Decision 27). New message keys: none for the director; 2 if a camera hint is shown (§6).
9. **D6 is answered; what the operator still owes:** nothing is needed to start the prototype. Two confirmations help: that my reading of the nine images (§2.7) is right, and which launchers to tune first (SLS, Shuttle, Vulcan and Ariane 6 appear in the examples; §2.6 lists what each lacks). A video clip of a launch sequence they like (not a still) would calibrate pacing; optional.
10. **Needs the operator before code:** the review gate itself and 15 forks in §12 (G-15 to G-30); none blocks the prototype.

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 301 (FY2), 309 (LA1); slice row 399; decision D6 line 31; operator, 2026-11-14, in this session)

| ID | Text | State at HEAD |
|---|---|---|
| FY2 | "The first seconds after launch still move fast horizontally rather than vertically; adjust the numbers and the sim." Answered 2026-11-14: "first seconds are ok as they are." | **Closed, not wanted.** Opening unchanged (§2.8 records the numbers). |
| LA1 | "Assess a camera on top during launch, moving around for better effects, rather than always the same side view. The operator has example shots to share. (D6)" | Nine fixed shots, side views within 18° of the horizon (§2.1, §2.2). |
| D6 | "Launch camera: the operator shares example shots first." | **Answered 2026-11-14** with nine images (§2.7). |
| LA1a | "Then we should change the view as images attached. Also moving the camera around and look like these cool photos." | New shots after the opening (§4.3). |
| LA1b | "We need camera moving like in action movie, zoom in/out, pan, good flow, drama :-)" | Continuous moves, eased blends, a beat per flight event (§4.2, §4.4). |
| LA1c | "I want things to be fluid and not all launches the same." | A seeded variation system (§4.5). |
| LA1d | The operator wants to validate, discuss and see visuals before anything is built. | A prototype and review step comes first (§4.1, Decision 15). |

Done when (plan row 399, amended by the answers): the plan's "ascent frames 0-20 s show vertical climb" is **struck**; it becomes: the operator has seen and approved the prototype clips; then, on the built version, a frame strip for three launches shows at least four distinct shot families after T+22 s, a different sequence for different launches, the same sequence on replay, and a static sequence under reduced motion.
Plan wording that is outdated: the whole G3 row ("downrange drawn ground-relative", "new camera shots after the operator's examples"), the D6 line ("operator shares example shots first": done), and the "Deferred" row for the launch camera, if one exists (`grep -n -i "launch camera" docs/wip/2026-11-11-ux-feedback-plan.md` returns the D6 line only).

## 2. Current state (file:line at `8f0a5872bce`)

### 2.1 The camera system

- **Schedule.** `buildShotSchedule` (`ascent-cameras.ts:143-201`) builds contiguous `ShotWindow`s from the vehicle's integrated events: `pad` T+0 to T+3 (`PAD_END`), `tower_clear` to T+22 (`TOWER_CLEAR_END`, with the 0.9.4 comment that a ride-along camera made the climb read as sideways flight), `ascent` to Max-Q, then `onboard_down` until the first separation, a 5 s `staging` and a 6.5 s `fairing` per event, `chase` for every gap, `separation` 4 s after SECO (or the injection burn's end), `orbit` for the rest (86 s). Pre-liftoff time (T-12 s to 0) is clamped to the first window (`activeShotAt`).
- **Pose.** `composeShot(name, state, vehLen, p, tune, focus)` (`:275-413`) is a pure function of the vehicle state and the shot's progress `p` (smoothstep `ease`, `:230-234`): a position, a look-at and a field of view; a 4 % handheld sinusoid (`wob`, keyed on the mission time) is added; per-shot `ShotTune` (`distMul`, `heightMul`, `fovAdd`, the debug sliders) scales it. Distances are in vehicle lengths (`VEHICLE_LENGTH_KM` 1.2, `ascent-scene.ts:120`).
- **Smoothing.** `ascent-scene.ts:1288-1366`: the live camera converges on the target pose (`K_POS` 0.13, `K_TGT` 0.45, `K_FOV` 0.13 per 60 Hz frame, scaled to real frame time), relative to the vehicle so orbit speed does not drag it. 95 % settle: 0.36 s for position and field of view, 0.08 s for the look-at (`gbr-wall.mjs`). `snapCamera()` resets it on a scrub.
- **Time remap.** `sepSlowmoFactor` (`:107-135`) slows the play clock to 22 % around each separation event (a quick slow-in, a flat hold, a longer ramp-out); `fly-frame-runner.ts:933` applies it to `launchT` with `launchSepTimes` (`launchSeparationTimes`: staging, fairing, spacecraft separation).
- **Authoring aid.** `AscentCameraDebug.svelte` (`?debug=1`): a side-elevation plot of the schedule and live camera, per-shot tuning sliders. `window.__ascentSetT(t)` (DEV + debug) freezes the timeline at a time for deterministic frames; `window.__flyLaunchT(t)` (DEV) on `/fly`.

### 2.2 What the nine shots do, by the numbers

Schedule windows per vehicle, flight seconds (`gbr-sched.mjs`; the first two windows are identical for all):

| window | Falcon 9 | SLS Block 1 | Shuttle stack |
|---|---|---|---|
| pad | 0-3 | 0-3 | 0-3 |
| tower_clear | 3-22 (alt 0-1.0 km) | 3-22 (0-1.0) | 3-22 (0-1.4) |
| ascent | 22-69 (1.0-12.8 km) | 22-65 (1.0-11.5) | 22-57 (1.4-11.3) |
| onboard_down | 69-151 (12.8-86.9) | 65-110 (11.5-46.6) | 57-94 (11.3-41.6) |
| staging | 151-156 | 110-115 (SRB sep) | 94-99 (SRB sep) |
| chase | 156-171 | 115-177 (52.7-124.6 km) | 99-511 (47.6-180.1 km) |
| fairing | 171-178 | 177-183 | none |
| chase | 178-499 (321 s) | 183-479 (296 s) | 516-533 |
| separation / orbit | 499-503 / 503-589 | 479-483 / 483-569 | 533-538 / 538-623 |

Longest post-T+22 window per profile (`gbr-sched-all.mjs`, 40 profiles): `chase` 601 s Atlas V, 479 New Glenn, 436 LVM3, 431 Proton-M, 430 H-IIA, 423 Ariane 5G, 412 Shuttle, 394 Saturn IB, 358 Ariane 5, 346 Saturn V, 333 Starship, 321 Falcon 9, 296 SLS, 137 Sputnik 8K71PS, 96 M-V; Mercury-Redstone has one 78 s `ascent`. 38 of 40 exceed 120 s, 31 exceed 200 s.

Camera elevation above the vehicle's horizontal (arithmetic from `composeShot`: camera `y = alt + k·d`, look-at `y = alt + h·L`, horizontal distance `d`, `L` = vehicle length): `chase` 11° at d 3.4 L to 15° at 5.2 L; `ascent` 1.4° to 4.4°; `onboard_down` 0.2° to 2.9°; `orbit` 16° to 18°; `staging`, `fairing` and `separation` between about 5° and 15°. The only below-the-vehicle camera is the ground camera of `tower_clear` (until T+22, kept). The field of view is 38° to 44° (`ascent` 40, `onboard_down` 42, `chase` 38, `orbit` 40, `staging` 35 to 38, `fairing` 44, `separation` 40 to 42); only `tower_clear` computes it (22° to 50°).

### 2.3 Screen time, not flight time

`launchSpeed` defaults to 5 (`/fly` `+page.svelte:323`; pills ×1, ×5, ×20, `ASCENT_SPEED_MULTIPLIERS`). So at the default: `pad` 0.6 s of screen time, `tower_clear` 3.8 s, Falcon 9 `ascent` 9.4 s, `onboard_down` 16.4 s, the 321 s `chase` 64.2 s; the whole 589 s ascent is about two minutes. A separation window of 5 s of flight time plays 2.43 s at ×5 with the slow-motion remap (12.14 s at ×1, 0.61 s at ×20); with a 3 s pre-roll 3.88 s at ×5 (`gbr-wall.mjs`). Consequence for authoring: a "slow push-in then hold then pull-back" cannot be written in flight seconds alone; the event beats borrow the existing slow-motion remap, and the long phases need sub-shots of 40 to 110 flight seconds (8 to 22 s of screen time at ×5; 2 to 5.5 s at ×20).

### 2.4 Control and accessibility

No pointer, wheel or touch handler in `LaunchScene.svelte` or `ascent-scene.ts` (the only listeners are `resize`; `pointer-events: none` on the overlays). `src/lib/reduced-motion.ts` (`prefersReducedMotion`, `onReducedMotionChange`) is used by the `/fly` page to start paused (ADR-025) and nowhere in the launch scene: a reduced-motion user who presses play gets the full camera.

### 2.5 What the scene can draw (checked in the repo, not assumed)

| Thing | Where | State |
|---|---|---|
| Curved Earth, day map | `ascent-scene.ts:440-470`, `4k_earth_daymap.jpg` | yes: a sphere under the pad; the limb, with a thin additive atmosphere rim (opacity 0.15, `:471-488`) |
| Sky, stars, Sun | `:489-545` | a graded sky dome that fades out by 55 km, 1,800 stars that fade in with altitude, a Sun disc and halo (no lens flare) |
| Pad ground detail | `launch-ground.ts` | a Sentinel-2 satellite crop, full strength to 10 km altitude, gone by 34 km (`FADE_START_KM`, `FADE_END_KM`); drawn at the 1.2 km scene vehicle length, so a pad building is about 12 to 17 times too small beside the rocket (real 70 to 98 m vehicles; arithmetic, §13) |
| Tower | `:562-575` | one slim strongback box; no pad buildings, no flame trench |
| Exhaust plume | `:712-870` | layered (throat, core, glow, trail, Mach diamonds), one flame per real engine, strap-on flames |
| Pad smoke, steam, ground blast | `grep -n -i "smoke\|steam\|dust" ascent-scene.ts` | **none** |
| Clouds | `:471-475`: "the broad additive shells + procedural clouds ... muddied the whole surface to a grey haze ... A real cloud/specular pass waits for proper assets"; `cloudUrl` option exists (`:57`) and is never passed; no cloud texture under `static/` | **none** |
| Post-processing | `ascent-renderer.ts:59-75` | tone mapping, film grain (0.1), vignette, `OutputPass`; no bloom pass found, no motion blur, no depth of field |
| Camera shake | | none (only the 4 % handheld sinusoid in the pose) |
| Vehicle models | `launcher-models.ts` `BUILDERS` (`:4879`) | SLS (`buildSLS`), Shuttle (`buildSpaceShuttle`), Vulcan, Ariane 6 and 45 more ids; **Vega: none** |

### 2.6 The vehicles in the examples

| Example vehicle | model | launch profile (`static/data/launch-profiles/`) | fleet entry |
|---|---|---|---|
| SLS Block 1 | yes | yes (`sls-block-1.json`, 2 boosters) | yes |
| Space Shuttle | yes | yes (`space-shuttle-stack.json`, 2 boosters) | yes |
| Vulcan | yes (`buildVulcan`) | **none** (generic 2-stage, "representative" tier) | yes (`vulcan.json`) |
| Ariane 6 | yes (`buildAriane6`) | **none** (generic) | yes (`ariane-6.json`) |
| Vega | **none** | none | **none** (`ls static/data/fleet/launcher` has no vega) |

26 of the 40 profiles have strap-on boosters (`gbr-sched-all.mjs`: atlas-v 4, lvm3 2, h-iia 2, ariane-5g 2, shuttle 2, ariane-5 2, vostok-k 4, delta-ii 9, atlas-centaur 1, long-march-5 4, sls 2, delta-iv-heavy 2, long-march-2f 4, long-march-3b 4, falcon-heavy 2, soyuz-fg-fregat 4, soyuz 4, molniya-m 4, titan-ivb-centaur 2, voskhod-11a57 4, pslv 6, titan-iiie-centaur 2, atlas-lv-3b 1, h3 4, atlas-agena 1, sputnik-8k71ps 4): the "boosters peeling away" shot has a subject in 65 % of launches.

### 2.7 The nine examples (operator, 2026-11-14; opened one by one; the files are in `~/.claude/uploads/<session>/`)

| # | What I see | Camera, in words | Phase | Closest existing shot | What it needs that does not exist |
|---|---|---|---|---|---|
| 1 | SLS lifting off seen straight down; white-hot plume, grey steam clouds over a pad with roads and buildings | overhead, very close, vehicle at the right third | T+0 to T+10 | none | pad smoke and steam; look-down pose |
| 2 | Same, from above and behind the nose; ground streaking below; the two boosters and the core stage below the nose | chase from above, looking down the stack, motion blur | T+10 to T+40 | `onboard_down` (0° to 3° elevation, not 60°+) | look-down pose; motion blur or streaking; ground at the right scale |
| 3 | SLS on a diagonal, black space top, blue limb band, a bright cloud deck below, plume trailing lower left | three-quarter from beside and slightly above, vehicle fills two thirds of the frame | alt 20 to 60 km | `ascent` / `chase` (right angle, wrong elevation) | a cloud deck; closer framing |
| 4 | The same, lower: fields, roads and a town through haze, cloud edges; steeper diagonal | three-quarter from beside, a little above | alt 3 to 15 km | `ascent` | terrain relief and haze; a cloud deck |
| 5 | Shuttle just clear of the tower, portrait, blue sky, white smoke billowing at the base | pad level, long lens, tower in frame | T+5 to T+15 | `tower_clear` | smoke at the pad |
| 6 | The same at dusk under a storm sky, orange glow, huge smoke clouds, tower in silhouette | pad level, wider, low key | T+5 to T+15 | `tower_clear` | smoke; a darker sky; a coloured light on the smoke |
| 7 | Vulcan rising at the right, two exhaust plumes at the bottom, Earth's limb arcing across the frame behind, bright sun flare on the horizon, stars | low angle from slightly below and to the side, vehicle nearly vertical, limb behind | alt 80 to 180 km | `orbit` (wrong elevation) | a below-the-vehicle pose; a sun flare |
| 8 | Ariane 6 large in frame on a diagonal, Earth with cloud texture filling the lower two thirds, black sky and stars | close three-quarter from above, Earth below | alt 80 to 180 km | `chase` (right idea, 11° to 15° elevation, 3.4 to 5.2 L away) | a cloud-textured Earth at this altitude; closer framing |
| 9 | Vega small in frame on a long diagonal, a bright exhaust trail to the lower left, Earth's limb along the bottom, black sky | distant side view, trail in frame | alt 60 to 180 km | none (the farthest shot is about 6 L) | a distant pose; a long trail; (Vega itself) |

I read images 5 and 6 as pad-level shots of the opening; the operator said the first seconds stay. Whether they want that look returned to later, or want the same drama (smoke, light) added to the existing `tower_clear`, is a question (Decision 26).

### 2.8 The first seconds: what the numbers are (kept for the record; not planned)

`integrateAscent` starts the pad with Earth's rotation speed (`vx = siteSpeed`, `ascent-physics.ts:611`; `siteSpeed = 465.1·cos(lat)`, 0.409 km/s at 28.56° N) and reports downrange as the inertial arc, while the scene's ground, pad and globe do not move. `ascent-scene.ts:1067` puts the vehicle at `(downrangeKm, altKm)`. Falcon 9: at T+10 s 4.09 km downrange and 0.20 km up; T+20 s 8.21 km and 0.85 km; ground-relative (minus `siteSpeed·t`) 0.003 km and 0.04 km sideways. The same shape for the six others run (Saturn V, Atlas V, SLS, Starship, Soyuz, Long March 5; `gbr-ascent.mjs`). This is what the operator saw in FY2 ("moves fast horizontally"). The operator's answer on 2026-11-14 is that the opening is acceptable as it is. The ground camera of `tower_clear` was the 0.9.4 fix that made the climb read better. Nothing here is proposed. If it is ever reopened: subtract `siteSpeed·t` in the scene only, and `ascent-physics.ts` and the HUD stay inertial (RFC-034 §5.3).

### 2.9 What the screenshots showed (dev server, `en-US`, 1440×900, headless Chromium with software GL; frames set with `window.__flyLaunchT(t)`, paused, `launchSpeed` ×5)

Curiosity (Atlas V 541) at T+3, T+14, T+20; Artemis II (SLS) at T+30, T+70, T+130, T+250, T+420; Galileo (Shuttle) at T+40 and T+200 (paths in §3).
- **The opening is a clear side view:** T+3 the Atlas V on a dark strongback over a green satellite-photo ground with a hazy horizon (`gbr-ascent-curiosity-t3.png`); T+14 and T+20 the vehicle centred in a plain blue sky with the ground fallen to a dark band (`gbr-ascent-curiosity-t14.png`, `-t20.png`). This is what the operator accepted.
- **After T+22 the vehicle is centred in a near-side-on frame, every time:** SLS at T+30 (`gbr-ascent-artemis2-t30.png`: the stack straight on against blue sky, dark water below), T+70 Max-Q (`-t70.png`: the same framing, the label MAX-Q on the HUD, nothing in the picture says so), T+130 stage separation (`-t130.png`: the stack on a diagonal over the limb at 71 km, the boosters already gone and out of frame), T+250 and T+420 (`-t250.png`, `-t420.png`: a horizontal stack above a flat navy globe, the limb a pale band across the frame), Galileo T+40 (`gbr-ascent-galileo-t40.png`: the Shuttle at 5 km against a deep-blue horizon). No shot looks down on the vehicle or up at it, no cloud, no smoke, no ground detail after T+30, no field-of-view change between T+250 and T+420.
- **The globe is a flat dark navy** with no cloud and little surface texture at 70 to 180 km (the 4k day map's ocean is dark); examples 3, 4 and 8 show a bright, cloud-textured Earth. That gap is the cloud-deck question of Decision 27.
- **The bar carries no marker during a launch**, only the fill and the play head, while the right-hand FLIGHT PLAN list names the beats (`-t70.png`): G1's FY3 point.
- The sky and ground at T+30 and T+70 show a visible blue vignette band around the vehicle (the sky dome and the film/vignette pass), which is part of today's look.

### 2.10 Tests that touch the area

`src/lib/orbital/ascent-cameras.test.ts`, `ascent-clock.test.ts`, `ascent-hud.test.ts`, `src/lib/physics/ascent/*.test.ts`, `launch-profile-registry.test.ts`; e2e `fly-launch.spec.ts` (Curiosity launch mounts, HUD readouts, the ascent timeline, scrub), `earth-launchpads.spec.ts`, `fly.spec.ts`. None asserts what a shot looks like, which shot follows which, or that two launches differ.

## 3. Screenshot list (before the build and again after)

Taken for this brief, before (scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`, files prefixed `gbr-ascent-`, not in the repo): `gbr-ascent-curiosity-t-6.png`, `-t3.png`, `-t8.png`, `-t14.png`, `-t20.png`; `gbr-ascent-artemis2-t30.png`, `-t70.png`, `-t130.png`, `-t250.png`, `-t420.png`; `gbr-ascent-galileo-t40.png`, `-t200.png`. The nine examples are in `~/.claude/uploads/6fc6157c-346c-4f06-8e2d-3b7060eafb22/` (`a4247c7b`, `eac2afc0`, `95ca2d59`, `4ad1da25`, `8bb55ebd`, `1d2f578d`, `2e9cb502`, `3fa229bb`, `1ef08171`, each `<id>-image.jpg`). For the review step (§4.1): frame strips of three launches, twelve frames each (T+22 to the end at a fixed set of flight times), director against today's camera, and two or three clips of 60 to 90 s at ×5 per launch. After the build: the same strips on the built version at 1440×900, 390×844 and 844×390, plus a reduced-motion strip.

## 4. Proposal

### 4.1 Step 0: the prototype and the review (nothing reaches production before it)

1. **The module is the production module, unwired.** `src/lib/orbital/ascent-director.ts` (pure, no DOM, unit-tested) with the shot pool, the move vocabulary, the seeded picker and the blend. It is not called from the production launch path.
2. **A dev-only route, `/dev/launch-director`** (the `/dev/*` subtree returns 404 in any non-dev build: `src/routes/dev/+layout.ts`; the repo already has `/dev/launchers` and `/dev/fly-cameras` as precedent). It mounts the launch scene for any of the 40 profiles with a chosen seed, an A/B switch (today's camera or the director), play at ×1 / ×5 / ×20, a scrubber, and a timeline strip of the shot windows with names and moves. A "reroll seed" button and a "frame strip" button (renders N frames at set flight times into one sheet; `__ascentSetT` already exists).
3. **Clips and strips for the operator.** Playwright's Chromium records the route (`recordVideo`); the system `ffmpeg` (`/usr/bin/ffmpeg`) or Playwright's bundled one converts to mp4 or gif: no paid tool. Delivered for review: three launches (SLS, the Shuttle, and Falcon 9 or Ariane 6) × two seeds each, director against today's camera, plus a frame strip per launch. Shown to the operator in the session; iterate on their words.
4. **What the prototype leaves out on purpose:** the scene additions (pad smoke, clouds, blur, flare). The first round judges camera flow on today's scene; a second round adds the scene candidates only for the shots the operator keeps (Decision 27). Pose functions that the examples call for (look-down, low angle, distant wide) are in the prototype: they are pure poses.
5. **Cost.** New files: `ascent-director.ts` (about 300 to 400 lines, an estimate, not measured), its test, `src/routes/dev/launch-director/+page.svelte` (about 250), a clip script in `scripts/` (about 80); no production file changes except an exported `composeShot` tuning hook if the route needs it. No change to data, messages, or any existing test.
6. **Gate.** The operator approves the look (shot pool, pacing, variety) from the clips; changes loop through the prototype. Only then step 1 onward (§10).

### 4.2 The director: event, shot, move, duration, easing

The timeline is built from the vehicle's own events (`integrateAscent`: liftoff, Max-Q, staging, fairing jettison, MECO, SECO, plus the payload separation time), per launch, by one generic pool table with per-vehicle signature overrides (Decision 16). Each entry is data:

`{ id, phase, family, needs, weight, minS, maxS, moves: Move[], ease, blendInS, cutIn }`, with `family` one of `overhead | lookdown | threeQuarter | lowAngle | wide | limb | pad`, `needs` a list of tags the vehicle must satisfy (`boosters`, `limb` (altitude ≥ 60 km), `groundPatch` (altitude < 10 km), `capsule`), and a `Move` one of: `dolly` (distance ratio a to b), `zoom` (field of view a to b, i.e. push-in or pull-out), `orbit` (azimuth degrees, signed), `crane` (elevation degrees, signed), `pan` (look-at offset sweep along the body axis), `whip` (a fast pan inside a short window). All moves are pure functions of the progress `p`.

Proposed default timeline (flight seconds; designed for ×5; screen time at ×5 in brackets; Falcon 9 numbers for the anchors):

| # | Window (anchor to anchor) | Phase | Shot (pool) | Move | Duration (flight s) | Easing | In |
|---|---|---|---|---|---|---|---|
| 0 | T-12 to T+3 | liftoff | `pad` (kept) | orbit 69° | 3 (0.6) | smoothstep | n/a |
| 1 | T+3 to T+22 | tower clear | `tower_clear` (kept) | tilt + zoom 22°→50° | 19 (3.8) | as today | cut |
| 2 | T+22 to about T+45 (alt 1 to 5 km) | climb | `lookdown_chase` (example 2) / `overhead_drop` (1) | crane 5°→55° + dolly 1.0→0.6 + zoom 50°→34° | 18 to 28 (3.6 to 5.6) | ease-in-out | blend 6 s from the ground camera |
| 3 | to Max-Q − 3 s | climb | `threeq_low` (4) or `side_track` | orbit ±40°, dolly out 15 % | to fill (≥ 12) | smoothstep | blend 4 s |
| 4 | Max-Q − 3 s to + 5 s | beat | `maxq_squeeze` | zoom 40°→26° over 3 s, hold 1.5 s, zoom to 44° over 4 s; a slight pan up the body | 8 (1.6, with the slow-motion remap extended to Max-Q) | ease-in then ease-out | cut |
| 5 | Max-Q + 5 s to first separation − 4 s | ascent | pool: `threeq_high` (3), `lowangle_hero` (7), `wide_trail` (9); sub-shots of 40 to 110 s | orbit ±50°, dolly, zoom ±6° | 40 to 110 each | smoothstep | blend 4 s |
| 6 | separation − 4 s to + 6 s | beat | `sep_pushin` then pull-back; signature `booster_peel` when the event is a strap-on drop | zoom 38°→30° in 4 s, hold at the event (the slow-motion remap), pull back 30°→42° in 4 s with a 20° orbit | 10 (3.9 at ×5 with the remap) | ease-in / ease-out | cut in on the beat |
| 7 | after separation to SECO − 6 s | coast | pool: `threeq_limb` (8), `limb_hero` (7), `wide_trail` (9), `orbit_pan`; sub-shots of 60 to 140 s | orbit ±60°, crane ±10°, zoom ±5° | 60 to 140 each | smoothstep | blend 4 s |
| 8 | fairing jettison (6.5 s) | beat | `fairing` (kept) | push-in (kept) | 6.5 | as today | cut |
| 9 | SECO to payload separation + 4 s | beat | `separation` (kept) | dolly (kept) | 4 | as today | cut |
| 10 | orbit (86 s) | hold | `orbit` (kept, with a slow zoom-out) | dolly-back, 2° pan | 86 | smoothstep | blend 6 s |

The anchors come from the profile, so a vehicle with no fairing or no separation simply has no row 8 or 6. A window shorter than a pool entry's `minS` merges with its neighbour; a window longer than `maxS` is split into sub-shots (the long `chase` becomes 3 to 8 sub-shots).

How the existing code supports it (checked): the pose is already a pure function of the vehicle state and `p` (`composeShot`); `tune` already scales distance, height and field of view; `activeShotAt` gives `p` per window; `sepSlowmoFactor` is the time remap for beats; `FlybyShot` in the helio montage (`src/lib/orbital/flyby-shots.ts`, `flyby-shot-schedule.ts`: establish, approach, hero, depart; `isCut(prev, next)`) is the precedent for a data-driven schedule and a cut rule. Missing: a field-of-view animation inside a shot (none), a blend of two poses (the smoothing layer is a 0.36 s ease, not a blend), a look-down and a below-the-vehicle pose, a pool and a picker. The blend is `blendPoses(a, b, u)` with smoothstep `u` over `blendInS` flight seconds before the cut-in time, computed from `t` alone, so a scrub is exact (the smoothing layer stays as a small de-jitter or is dropped; `snapCamera` still resets it).

### 4.3 The shot families, from the examples

| Family | Examples | Pose idea (vehicle lengths `L`, relative to the vehicle) | Needs |
|---|---|---|---|
| `lookdown` | 2 | camera 1.8 to 3 L above and 1 L behind the nose, looking along the body axis down 55° to 70°; ground and plume in frame | ground patch (alt < 10 km), plume |
| `overhead` | 1 | camera 4 to 6 L straight above, vehicle at the right third, FOV 45° | ground patch, **pad smoke** to match |
| `threeQuarter` | 3, 4, 8 | camera 2.2 to 3.2 L beside and 0.3 to 0.6 L above, FOV 34° to 40° (closer than today's 3.2 to 5.2 L) | `limb` for 3 and 8; a cloud deck to match 3 and 4 |
| `lowAngle` | 7 | camera 3 L out and 0.8 L **below** the vehicle's centre, looking up 10° to 20°, the limb behind | `limb`; a sun flare to match |
| `wide` | 9 | camera 10 to 14 L out, FOV 24° to 30°, the plume trail in frame | a long plume trail (today's is short) |
| `pad` | 5, 6 | the existing `tower_clear` | pad smoke to match (Decision 26) |

### 4.4 Flow, drama, pacing

- **Continuous moves inside every shot**, not only the pose function's slow orbit: a field-of-view move in at least every second shot, a crane in the climb, an orbit in the long phases.
- **Eased blends between shots** (4 to 6 flight s, about 1 s of screen time at ×5, so a blend is a visible move and not a dissolve), a **hard cut on three dramatic beats** (a separation, SECO, the Max-Q squeeze) so the cut lands on the event.
- **A beat per flight event:** Max-Q (a squeeze: push-in, hold, release), each separation (slow push-in before, hold on the event, pull back to reveal), fairing (kept), MECO, SECO and payload separation (kept shots, re-timed).
- **Pacing that breathes:** the pool picker alternates move energy (a `fast` shot, 8 to 20 s of flight, never twice in a row; a `slow` hold, 60 to 140 s), enforced by the constraints in §4.5.
- **Speed-aware:** the table is authored for ×5; at ×20 sub-shots under 3 s of screen time are merged into their neighbour and only the beats and one hero per phase remain; at ×1 the same windows play slower (Decision 30).
- **Scrub-exact:** the director is a pure function of `(t, seed, vehicle events)`, so scrubbing and the DEV hooks give the same frame as playing.

### 4.5 Never the same twice (seeded variation, verified)

- **Seed:** `fnv1a32(profile.id + '|' + (spacecraftId ?? variantKey))`, with a `mulberry32` generator (a dozen lines; no dependency). A mission id gives a stable seed, so a mission replays the same; a plan flight passes `rocket id + dest` as the `variantKey` (G1). `?debug=1&directorSeed=<n>` overrides it for review.
- **Pools per phase** (the table above), each entry tagged with `family`, `side` (±1, the side the camera is on) and `needs`.
- **Picker constraints, in order:** (1) the entry's `needs` are met by this vehicle and altitude band; (2) not the same `id` as the previous shot; (3) not the same `family` as the previous shot unless it is the only entry that fits; (4) the 30-degree rule between consecutive cuts (the new shot's start azimuth differs from the previous shot's end azimuth by at least 30°, or its elevation by at least 20°, otherwise flip `side`); (5) no `fast` shot after a `fast` shot; (6) signature entries (below) are drawn first when their condition holds.
- **Variation inside a pick:** `side` ±1, move direction (orbit and pan signs), start azimuth ±25°, durations ±15 % within `[minS, maxS]`, field-of-view endpoints ±3°.
- **Signature shots** (a weight of ×4, and at least once when the vehicle matches): the Shuttle's tower-clear (the example-5 framing at the pad, a signature of `space-shuttle-stack`), SLS's overhead / look-down (`sls-block-1`), `booster_peel` for every vehicle with strap-ons (26 of 40), a long `limb_hero` for deep-space launches. Per-vehicle overrides are a small data map next to the pools.
- **How variety is verified (unit test, pure code):** (a) the same seed gives a byte-identical schedule (`JSON.stringify` equal); (b) across all 40 profiles the number of distinct sequences (the ordered list of `id` and `side`) is at least 38 (the two short profiles, Mercury-Redstone and M-V, may share one); (c) for Falcon 9, 200 seeds give at least 150 distinct sequences; (d) over 40 × 200 generated sequences the constraints (2) to (5) hold in every consecutive pair, every window is within `[minS, maxS]`, and the windows are contiguous and cover `[0, duration]`; (e) a property: no sequence repeats a `family` twice in a row. An e2e then asserts that two different launches show different shot names in the same flight-time slice (read from `__ascentDebug`, which the debug build already exposes).

### 4.6 Manual control and the handback (Decision 28)

A pointer drag on the canvas (not on the HUD) adds a yaw and pitch offset to the director's pose (and a pinch or wheel adds a zoom offset); on release the offset eases back to zero over 3 s (the handback), and a cut or a beat resets it. No mode switch, no chip. On touch the canvas is fixed full-screen on `/fly`, so a drag does not scroll the page. A keyboard route is a gap (§13).

### 4.7 Reduced motion (Decision 29)

With `prefersReducedMotion()` the director returns, per shot, the pose at `p = 0.5` (no moves), no field-of-view animation, no handheld wobble, no blends: a hard cut at each shot boundary; the Max-Q squeeze and the separation push-ins are replaced by a hold on the event; the slow-motion remap stays (it is a pause, not a move). `/fly` already starts paused for these users; the static director applies when they press play.

### 4.8 Scene additions, only for shots the operator keeps (Decision 27)

Cheap tier (no new asset): none. Medium (free route, procedural, no asset): pad smoke and steam as a few hundred additive camera-facing puffs from a canvas-drawn texture, driven by thrust and altitude (examples 1, 2, 5, 6); a sun flare sprite (example 7); a camera shake keyed on thrust and Max-Q. Rich: a procedural cloud deck (the one that was removed in 0.9.x for muddying the globe: it needs a restrained version) and motion streaking for the look-down shot. Each is a separate prototype step so the operator sees it before it is built.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on G3 |
|---|---|
| Output step (UXD-004) | The launch composer ends in one `OutputPass`; any new post effect (flare, streaks) goes before it; every colour texture is tagged `SRGBColorSpace` (`output-step-rule.test.ts`), including a canvas-drawn smoke texture. |
| A3 (accent) | Any camera hint or dev-route chrome uses blue D and `#889fe7`; no teal, no cyan. |
| A4 (one chip) | A "free camera" chip is not proposed (Decision 28); if it were, it is the one chip. |
| G1 | A plan flight now reaches this ascent; its `variantKey` is `rocket id + dest` (§4.5). The launch must start from the opening card (G1 Decision 3). |
| G2 | None; `/fly` page CSS only. |
| F series | Not read. |
| Docs `fly-cinematic-shot-language.md`, `fly-cinematic-creative-direction.md` | Their principles apply (P6: motion has weight when the camera disagrees with the subject; the "Launch" section: worm's-eye, long-lens track, upper-atmosphere recede; creative-direction lines 245-259 and 454: the launch is the one moment of explicit cathedral framing). The director is the launch chapter of the same language. |

Plan ideas now outdated: "downrange drawn ground-relative" (not wanted); "new camera shots after the operator's examples (D6)" (D6 is answered; the shots are §4.3); "Done when: ascent frames 0-20 s show vertical climb" (struck).

## 6. i18n impact (14 locales)

None for the director. If a first-run camera hint ("drag to look around") is shown (Decision 28), 2 keys × 14 locales, by hand. The dev route's chrome is English (dev-only, like `/dev/launchers`). The HUD's beat words are English codes passed through `hudLabel` (translated; `src/lib/orbital/hud-labels.ts`); unchanged.

## 7. Data changes

None. The shot pool and per-vehicle signature map are code constants next to the director (pure data, unit-tested). Launch profiles for Vulcan and Ariane 6 (§2.6) are a data task outside G3.

## 8. Tests to add or change

**Unit (vitest):**
- `src/lib/orbital/ascent-director.test.ts` (new): the verification list of §4.5 (determinism; 38 of 40 distinct; 150 of 200 for Falcon 9; constraints over 8,000 sequences; contiguity; `minS`/`maxS`); blends: pose continuity across a blend (no step larger than a set fraction of `L` per frame at 60 Hz); beat windows contain their event; reduced-motion output is static (the same pose at two values of `p`); speed merge at ×20 keeps every beat; the elevation range of the pool covers a look-down (above 45°) and a low angle (below −5°).
- `ascent-cameras.test.ts`: existing shot windows keep passing (the opening and the kept shots are unchanged); `buildShotSchedule` is untouched or wrapped, not rewritten.
- `ascent-scene` is WebGL and coverage-excluded (the `explore-scene.ts` policy): camera application is covered by the e2e below.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. `fly-launch.spec.ts`: add a launch for SLS and for Falcon 9: read `__ascentDebug.schedule`; at flight times T+30, T+120, T+300 the active shot names differ between the two launches; the same launch reloaded gives the same names; the opening windows (`pad`, `tower_clear`) are unchanged.
2. A reduced-motion project run (`page.emulateMedia({ reducedMotion: 'reduce' })`): the schedule has no blend windows and `p`-independent poses (two frames 5 s apart inside one shot have equal camera positions relative to the vehicle).
3. A drag on the canvas changes the camera's yaw and, 4 s after release, returns within a tolerance.
4. `a11y.spec.ts`: `/fly` launch at 0 serious (no new control, a canvas drag has no a11y change).
5. `/dev/launch-director` is 404 in a production build (the existing `/dev` guard; one assertion in the preview run).

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-launch-camera-director.md`; take the next free at build time: 037 is the last at HEAD): the opening is unchanged by decision (quote), the director, the pools, the variation rule, the manual nudge, reduced motion; row in `docs/uxs/decisions/README.md`; row G3 in `docs/uxs/CHANGE-INVENTORY.md` (line 94); FY2 closed "not wanted", LA1 closed, D6 answered.
- `docs/rfc/RFC-034.md` §7 (rendering) and §11.3: the camera chapter (a pointer to the director; the shot language), §9 Deferred (3-DOF steering unchanged).
- `docs/adr/TA.md`: the Launch / powered ascent paragraph (line 144-149: add `ascent-director.ts` to "Headless physics"/camera list; "`ascent-cameras.ts` (shot schedule)" now fed by the director) and the `/dev/*` list.
- `docs/guides/fly-cinematic-shot-language.md`: a "Launch director" section (the families, the cut rule, the pacing, the variation rule); `docs/guides/fly-cinematic-creative-direction.md` if the launch chapter changes.
- `docs/uxs/UXS-003.md` (launch act, camera), `docs/concept/05_Design_System.md` §5.12 only if a hint chip is added; `src/lib/orbital/README.md` and `src/routes/dev/README.md` if present (new rows).

## 10. Phased plan

0. **G3-0 prototype and review (no production change):** `ascent-director.ts` + test, `/dev/launch-director`, the clip and strip script; round 1 clips to the operator (three launches × two seeds, director against today's camera); iterate on their words; round 2 with the scene candidates for the shots they keep. **Gate: the operator approves the look.**
1. **G3a wire the director:** `ascent-scene.ts` takes the director's timeline in place of the fixed schedule (the opening shots, `staging`, `fairing`, `separation` and `orbit` kept as pool entries); `LaunchScene.svelte` builds it with the seed; `AscentCameraDebug` shows it.
2. **G3b the scene additions the operator chose** (Decision 27), each with its own shots.
3. **G3c manual nudge and reduced motion;** the e2e; frame strips on three projects.
4. **G3d docs of §9;** `npm run preflight` once before a push; `npm run preflight:coverage` (the new pure module).

## 11. Acceptance checks

- The operator has seen and approved the prototype clips (recorded in the UXD).
- The first 22 s of every launch are unchanged (the e2e and a frame comparison at T+3, T+12, T+20).
- For SLS, the Shuttle and Falcon 9: at least four shot families after T+22 s; no two consecutive shots of one family; different launches differ; the same launch replays the same (unit and e2e).
- Under reduced motion no camera moves inside a shot.
- A drag moves the camera and it returns in about 3 s.
- Docs of §9 updated; the inventory row G3 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the three G briefs)

15. **The review gate.** **(a) Prototype first: the director module and a dev-only route that plays two or three launches against today's camera, with clips and frame strips shown to you; nothing in production until you approve the look** (recommended: you asked to validate and see visuals first; the dev route is 404 in production by an existing guard; cost in §4.1); (b) a `?debug` toggle on the real launch scene instead of a dev route (the prototype ships inside `/fly`'s code path and a flag, so the risk of a production leak is higher and A/B is harder); (c) build it straight into `/fly` and review after (no).
16. **How the shots are authored.** **(a) One generic pool table keyed on the vehicle's flight events (Max-Q, separations, fairing, SECO), with a small per-vehicle override map for signature shots** (recommended: 40 profiles and growing; one table is testable and a new launcher gets a good launch for free); (b) a hand-authored table per vehicle (40 tables, the most control, the most upkeep); (c) keep the fixed nine shots and only add FOV moves and the new poses (the smallest change; every launch still plays the same sequence, which you ruled out).
17. **Never the same twice.** **(a) Seeded: the seed is the vehicle id plus the mission id, the same launch replays the same, constraints in §4.5, verified by unit tests (38 of 40 profiles distinct, 150 of 200 seeds distinct for Falcon 9)** (recommended: testable and what you asked: different launches differ, a launch is repeatable); (b) one fixed sequence per vehicle (distinct by vehicle only; two Falcon 9 missions are identical); (c) truly random each play (varied, but a launch can never be replayed and a bug cannot be reproduced).
18. **How much to build first.** **(a) Two tiers: the cheapest version that already feels cinematic is the new poses (look-down, low angle, wide), field-of-view and crane moves, eased blends, beats for Max-Q and separations, the seeded pools, reduced motion and the manual nudge, all on today's scene; the full version adds scene work (Decision 27)** (recommended: you see the camera flow before paying for smoke and clouds; the cheap tier is pure code); (b) everything at once (a longer wait before you see anything); (c) only the cheap tier, no scene work ever (the examples with smoke and cloud decks would stay out of reach).
19. **Transitions.** **(a) Eased blends of 4 to 6 flight seconds between shots, a hard cut on three beats: a separation, SECO, the Max-Q squeeze** (recommended: flow with punctuation; the 0.36 s smoothing today is a cut in practice); (b) cuts everywhere (the most film-like, the least "fluid"); (c) blends everywhere (never a dramatic cut; the beats lose their snap).
20. **Shot A, the climb (examples 1 and 2): T+22 s to about T+45 s.** **(a) The look-down nose chase (example 2): a crane from the ground camera up behind and above the nose, looking down the stack, the ground and plume below; the overhead drop (example 1) as a pool alternative for vehicles with a visible ground patch** (recommended: example 2 works with today's ground patch and plume and needs no smoke; example 1 needs pad smoke to match, Decision 27); (b) only the overhead drop (needs smoke first); (c) neither (the climb stays a side view).
21. **Shot B, the Max-Q beat.** **(a) The squeeze: a push-in from 40° to 26° over about 3 s of flight time, a 1.5 s hold, a release over 4 s with a slight pan up the body, cut in on the event** (recommended: Max-Q is the first drama after liftoff and has no shot today; it costs nothing but a field-of-view move); (b) a whip pan to the nose; (c) none.
22. **Shot C, the cloudscape three-quarters (examples 3 and 4).** **(a) Close three-quarter shots from beside and a little above, at 2.2 to 3.2 vehicle lengths, on today's globe without clouds; add the cloud deck only if the operator wants it after seeing the clip** (recommended: the framing and angle are most of what examples 3 and 4 say; the globe's limb and the sky already read); (b) require the cloud deck first (the shots wait on Decision 27); (c) skip.
23. **Shot D, separations (the boosters peeling away).** **(a) A pre-roll push-in 3 s before each separation, a hold on the event under the existing slow motion, a pull-back with a 20° orbit that reveals the stages parting; for the 26 launchers with strap-ons the signature `booster_peel` (camera low and beside, the boosters drifting across the frame)** (recommended: the beat is the film grammar of a launch, the slow motion exists, and the models already separate and drift); (b) keep today's 5 s push-in only; (c) add only the pre-roll.
24. **Shot E, the low-angle hero (example 7).** **(a) A camera 3 vehicle lengths out and 0.8 below the vehicle's centre, looking up 10° to 20°, the limb behind, for alt 80 to 180 km, without a sun flare in the cheap tier** (recommended: it is the clearest "poster" frame in the set and is a pure pose); (b) with the sun flare sprite (a small additive sprite, Decision 27); (c) skip.
25. **Shot F, the distant wide with the trail (example 9).** **(a) A camera 10 to 14 vehicle lengths out, field of view 24° to 30°, the trail in frame, used once per launch in the coast; no Vega is built (it has no model, profile or fleet entry)** (recommended: the shot works for any vehicle; Vega itself is a data and model task for a later slice); (b) also add Vega (a model, a profile, a fleet entry, 14 locales of overlay text: a slice of its own); (c) skip.
26. **The pad-level images (5 and 6).** **(a) Leave the opening as it is, per your answer; keep the ground long-lens `tower_clear` unchanged and offer pad smoke (Decision 27) as a separate, later choice** (recommended: you said the first seconds are fine); (b) add pad smoke and a dusk light variant to `tower_clear` so it looks like examples 5 and 6 (changes the opening); (c) return to a pad-level wide at about T+8 s as one of the pool shots (the Shuttle signature).
27. **Scene additions (what is missing for the examples).** **(a) None in the first build; after the clips, add the ones you ask for in this order: pad smoke and steam, a sun flare, camera shake, then a restrained cloud deck** (recommended: the camera flow is judged first on the scene as it is; each addition is a procedural, no-asset change with its own clip); (b) pad smoke and flare now with the director (a bigger first review; examples 1, 2, 5, 6, 7 are the ones that need it); (c) the cloud deck now (it was removed once for muddying the globe: the riskiest one first).
28. **Manual control.** **(a) A drag (and pinch or wheel) nudges the director's camera and it eases back over 3 s after release; a cut or a beat resets it; no mode, no chip** (recommended: the user can look around without leaving the director, and the director never stays lost); (b) no manual control (today's behaviour; the director owns the picture); (c) a FREE / AUTO chip that pauses the director (full orbit control; a new state to explain and test).
29. **Reduced motion.** **(a) Static poses at each shot's midpoint, hard cuts only, no field-of-view animation, no wobble, no blends; the beats become holds** (recommended: matches ADR-025's intent; the clock slow motion stays, it is a pause); (b) the same as motion, only slower (still moves); (c) one single fixed camera for the whole launch (calmest, loses the shots).
30. **Speed.** **(a) Author for ×5; at ×20 merge sub-shots shorter than 3 s of screen time and keep every beat plus one hero per phase; at ×1 play the same windows slower** (recommended: three speeds, one table, no jitter at ×20); (b) scale every shot's duration by the speed (a 25 s shot is 25 s of screen time at any speed: a ×20 launch gets long and slow); (c) ignore speed (at ×20 a 60 s sub-shot lasts 3 s: moves become jerks).

## 13. NOT VERIFIED

- NV1 No clip, strip or browser run of the director exists: it is not built. The proposal's pose numbers (heights, distances, field of view, elevation) are written from the formulas in `composeShot` and from the nine images by eye, not tried on the scene; the prototype is the check.
- NV2 The elevation angles in §2.2 are hand arithmetic from the `composeShot` offsets and look-at heights (camera `y`/horizontal distance), not measured on a rendered frame; `staging`, `fairing` and `separation` were given as a range without computing each.
- NV3 The pad's satellite crop is described as "12 to 17 times too small beside the rocket": that is `VEHICLE_LENGTH_KM` 1.2 against real vehicle lengths of 70 to 98 m (from `/dev/launchers`' height table), not a measured texture scale; whether the crop is also drawn at the 1.2 km scale or at real extent (`halfExtentKm`) was not read; the overhead shot's ground look is unknown.
- NV4 The slow-motion window numbers (12.14 s at ×1, 2.43 s at ×5, 0.61 s at ×20 for a 5 s staging window; 3.88 s at ×5 with a 3 s pre-roll) integrate the existing `sepSlowmoFactor` with the speed multiplier over a step of 0.01 s, assuming the runner applies them as `dt / (speed·factor)`; the runner's own code (`fly-frame-runner.ts:933`) was read, not traced under a recording.
- NV5 Whether the Max-Q squeeze needs the slow-motion remap extended to Max-Q (it currently exists only for separations) and what that does to the `launchSepTimes` consumers (`launchSeparationTimes`) was not traced.
- NV6 The unit-test targets (38 of 40 distinct sequences; 150 of 200 seeds) are proposed thresholds from the pool sizes (about 4 to 6 entries per phase, 3 to 8 sub-shots in the long phases); the real number of distinct sequences will be known only when the picker exists.
- NV7 Touch behaviour of the drag (a canvas full-screen under `pointer-events: none` overlays), iOS Safari pinch, and RTL are not checked; a keyboard route for the manual nudge is a gap.
- NV8 Whether any Playwright project can record video from this scene with software GL fast enough to look like real time was not tried; frame strips at fixed times (`__ascentSetT`) do not depend on it.
- NV9 Vulcan and Ariane 6 fly the generic profile (the model exists, the physics is "representative"): whether the generic 6,000 kg profile reaches a plausible orbit and timeline for them was not run. If the examples' launchers are to be shown honestly, two profile JSONs are a data task outside this slice.
- NV10 Images 5 and 6 may be intended as shots for the time just after the first seconds rather than the opening itself (Decision 26); I read them as the opening look. The operator's reading governs.
- NV11 Three captured frames (`gbr-ascent-curiosity-t-6.png`, `-t8.png`, `gbr-ascent-galileo-t200.png`) were not opened; §2.9 describes the nine that were. A launch at ×5 was not played in real time: every frame was set with `__flyLaunchT`, so the motion, the blends and the slow-motion beats were not seen.
- NV12 No test and no preflight was run: this brief changed no code.
