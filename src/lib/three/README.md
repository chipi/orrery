# `src/lib/three/` — Orrery's 3D scaffolding library

Typed factories + utilities the 3D routes (`/explore`, `/fly`,
`/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`) share. Reach for
these first before hand-rolling raf loops, listener registries, or
`userData` casts inside a route.

## Discoverability matrix

| Need | Use | What it owns |
|---|---|---|
| Scheduled per-frame work (raf + dt) | `createAnimateLoop` | raf pump, dt-clamp, reduced-motion gate, **`document.hidden` pause** (TA.md contract), cleanup |
| Cleanup hygiene for events + disposables | `createRouteLifecycle` | wraps `addEventListener` + arbitrary `dispose()` thunks; LIFO drain on cleanup |
| Typed read of `Object3D.userData` | `createUserDataTag<T>` | discriminator-stamped wrapper; eliminates `as unknown as` casts in pick handlers |
| WebGL renderer + canvas attach | `createSceneRenderer` (existing) | renderer construction with pixel-ratio cap, canvas attach |
| Renderer + outline-pass disposal | `disposeSceneRenderer` (existing) | matching teardown |
| Standard canvas input listeners | `bindCanvasInputs` (existing) | mouse / touch / wheel + hover; returns the matching `removeEventListener` chain |
| Closest 2D NDC hit testing | `pickClosest2D` (existing) | screen-space pick fallback for routes that don't run a full Three.js raycast |
| Object3D disposal walk | `disposeObject3D` (existing) | recursive geometry / material / texture dispose |
| The focus beside an open side panel | `createPanelFramer` + `watchPanels` (`panel-framing-host.ts`), maths in `panel-framing.ts` | measures `aside.panel` in the 400 ms after one opened, closed or the window resized, eases the shift, `camera.setViewOffset`; called by the Explore host and `SurfaceScene` (UXD-019, UXD-030) |
| The orbit ruler's regime in a scene | `buildRegimeHighlight` | one group of annulus + `Line2` edges, great-circle shell or pin rings per regime shape (`$lib/orbit-regime-geometry`), `set(hover, active)`, `update(camera, w, h, t, still)` per frame, `dispose()`; `explore-scene-host.ts` and `SurfaceScene` both use it (UXD-024) |
| An iconic mission's trajectory, markers and boxes | `buildIconicTrajectory` (`iconic-trajectory.ts`) + `iconic-box.ts` | the Line2 path, the milestone markers (the pick contract: `PICK_KINDS`, `userData`, `pickTargets`), the per-frame sizing and placement of the milestone boxes (`n/N · date` header, name body, 12 px at any zoom, drawn at the first highlight) and the one mission box at Today, through `universe/scene-pins.ts` `placeLabels` (UXD-026); `iconic-box.ts` is the pure text and size part (`boxHeader`, `wrapText`, `layoutBox`) |
| Soft-edged alpha mask for a square patch | `featherMask(edge)` | smoothstep fade over the outer `edge` fraction; each call returns its own texture over one cached buffer, so `disposeObject3D` on one patch never strips the mask from the others (#641) |
| A /fly camera framed for a phone | `portraitFit(aspect)` (scale the camera distance) or `portraitFov(fov, aspect)` (widen the field of view) in `phone-framing.ts` | the one portrait back-off rule (W6): used by the cruise, flyby and cislunar cameras (field of view), the Earth-orbit coast, the way home and the booster return |
| The launch camera director on a launch scene | `createLaunchDirector` (`launch-director-rig.ts`) + `attachLaunchConditions` (`launch-conditions-scene.ts`) | the plan, the ground-relative state, the camera and the conditions rig (sky, sun, clouds, pad smoke, limb, night lights); one implementation for /fly's `LaunchScene` and `/dev/launch-director` (UXD-046) |
| A launch pad under the rocket | `buildPad(spec, vehM, vehLen)` (`launch-pads.ts`), spec from `resolvePadSpec` (`$lib/launches/pad-family.ts`) | 16 low-detail pad models in five families, built in metres and scaled by the vehicle's real height; `update(t)` poses the moving parts (support arms, swing arms, strongback) from the mission time; `attachLaunchConditions` takes it as `pad` and keeps the generic tower when it is null; `buildPadShowcase` is the /dev/models + /colophon stand-in (UXD-047); `buildStarbaseTowerM` is the Starbase tower and orbital launch mount in metres, also drawn by the booster catch inset (UXD-051) |
| A recovered booster's landing, in an inset on the launch scene | `createLandingInset` + pure `landingPose` / `insetWindow` / `insetPlacement` (`landing-inset.ts`), data from `landingsFor` (`$lib/physics/ascent/ascent-physics.ts`) | the inset's own `THREE.Scene` (booster on its landing burn, legs hinged by `userData.landingLegAngle`, drone ship, landing zone or tower catch arms, sky from the launch light); opens 8 s before the landing burn, closes 4 s after touchdown; `LaunchScene` passes it to `ascent-renderer.ts` `render(inset)`, which draws it into the frame's rectangle (UXD-050) |
| A booster's whole return, full frame | `createBoosterReturn` (`booster-return-scene.ts`); the gate is `returnLanding` in `LaunchScene.svelte`, the timing `booster-return-timing.ts` (kept apart so the scene loads only on a flight that has one) | a Falcon 9 to a drone ship or LZ-1 and New Glenn to Jacklyn when the entry burn is sourced (UXD-052); Falcon Heavy's first flight plays both side boosters at LZ-1 and LZ-2, 310 m apart (`twinReturnCamera`), then its centre core lost at sea beside the drone ship (`outcome: 'lost'`, `buildLostCore`; `phaseAt` switches the caption) (UXD-054) |
| One true-size model of a craft, everywhere it appears | `showcase/<family>.ts` `SHOWCASE` (contract in `showcase/types.ts`, parts kit `showcase/kit.ts`); `showcase-index.ts` (fleet id → family, generated by `scripts/build-showcase-index.ts`) | the central models: real metres, base at y = 0, front +z, sourced `refs` (credited by `scripts/build-model-references.ts`). Used by the /fleet line-up, `fly-craft.ts` (launch, cruise, orbit), the descents (`descent-landers.ts`) and the fleet and mission pages' viewer. The older builders (`moon-lander-models.ts`, `mars-lander-models.ts`, `capsule-models.ts`) remain as fallbacks and as the size the descent stacks are laid out around |
| A craft's 3D model on a page | `CraftViewer.svelte` → `craft-viewer.ts` `mountCraftViewer` | loads three.js and the model's family only near the viewport; slow turntable (still under reduced motion), drag to turn and tilt, paused off screen; on `/fleet/[id]` and `/missions/[id]` (the mission's spacecraft) |
| A descent's craft and EDL hardware | `descent-models.ts` `buildDescentModel` (stacks: aeroshell, parachutes, retro, airbags, sky crane) + `descent-landers.ts` (`DETAILED` site → central model, `STOWED` surface-only parts, `detailedReturnCapsule`, `detailedProbe`) | chutes at their sourced sizes (`CAPSULE_MAINS`, `CAPSULE_DROGUES`, `dgbParachute`, ringsails); two-stage chutes swap at `parachute_jettison` via `userData.chuteStage`, timed in `descent-scene.ts` |
| The way home after a Moon landing | `fly-return-scene.ts` `createFlyReturn` + pure `returnPose` / `returnCamera` / `getAt` / `BEAT_SHOT` / `beatsFor` / `shotFor`, `ReturnScene.svelte`, data `static/data/return-profiles/<id>.json` (`$lib/fly/return-profile.ts`) | LM liftoff (descent stage stays), rendezvous, docking with probe/drogue close-ups, LM jettison, TEI in compressed scene time with the real GET on the HUD; the rendezvous beats come from the profile's burn list (Apollo 14: vernier, TPI, TPF; Apollo 15: TPI, TPF; Apollo 17's CSM trim and plane change come before liftoff and are recorded, not played) and its optional `camera.shots` overrides the default shot per beat (Apollo 12, 14, 15, 16 and 17 each have their own camera style; the J missions' `jMission` block adds the rover and its TV-camera liftoff, the open SIM bay CSM, the subsatellite beat and Apollo 16's tumbling stage); anchor-relative frame (the LM ascent stage), so the close-up keeps millimetre precision at any altitude; a mission has it when its profile file exists, offered by "Continue: the way home" at the end of the landing, and the cruise resumes at TEI |
| The Shuttle deploy from the payload bay (W10) | `fly-deploy-scene.ts` `createFlyDeploy` + pure `deployPose` / `deployCamera` / `metAt` / `beatsFor`, `DeployScene.svelte`, models `showcase/winged.ts` `buildOrbiterOpenable` (`bayMount`) and `showcase/ius.ts` `buildIusStack`, data `static/data/deploy-profiles/<id>.json` (`$lib/fly/deploy-profile.ts`) | doors, IUS tilt to 29 deg and the deployment angle, spring release, the orbiter's separation burn, the IUS burns (Ulysses: spin-up and PAM-S) in compressed scene time with the real MET on the HUD; plays between the launch and the cruise when the mission's profile file exists |
| The robotic arm's release (W10, `method: 'rms'`: Hubble, Compton) | `fly-rms-deploy-scene.ts` `createFlyRmsDeploy` + pure `rmsPose` / `rmsMetAt` / `rmsSteps` / `solveArm`, the same `DeployScene.svelte`, models `buildOrbiterOpenable` (`userData.rms`, `userData.bay`) and `showcase/observatories.ts` `buildHubble` / `buildCompton({ asLaunched: true })` (`setArrays`, `setAntennas` / `setAntenna`, `grapple`) | the arm's joints from an inverse-kinematics fit (grapple point approached straight down, elbow up, the wrist roll keeping the heading); the observatory rides the end effector between grapple and release; Hubble's stalled array panel 2, Compton's stuck antenna and the spacewalk; tests hold the grip to 2 cm and keep the booms out of the body |
| The winged return to a runway (W12) | `fly-winged-return-scene.ts` `createFlyWinged` + pure `wingedPose` / `wingedCamera` / `metAt` / `runwayLeg` / `finalHeight`, `WingedReturnScene.svelte`, models `showcase/winged.ts` (`gear: 'animated'`, `setGear`; its stance on the gear, nose-down, in `showcase/orbiter-stance.ts`) and `showcase/runway.ts` `buildRunway`, data `static/data/winged-profiles/<id>.json` (`$lib/fly/winged-profile.ts`) | deorbit burn, entry with the roll reversals, then a runway frame: TAEM, the heading alignment turn, the glideslopes, preflare, gear, touchdown, nose gear and rollout at the post-flight distances; plays as the descent act when the mission has a winged profile and no descent profile |
| The descent camera | `$lib/orbital/descent-director.ts` `buildDescentShots` + `descentPoseAt` | a shot list cut on the descent's beats, pure in trajectory time (scrub = play), aspect-aware, never below the ground |
| The engine plume cone and core | `plumeCone` / `plumeCore` (`engine-plume.ts`) | the exhaust meshes shared by `ascent-scene.ts` (ascent) and `landing-inset.ts` (landing burn) |
| The Starship Ship (upper stage) | `buildStarshipShip` (`starship-ship.ts`) | 5.5:1 satin stainless body with an ogive nose, the windward half in black hex tiles, forward and aft flaps on the tile edge, six Raptors under the skirt; drawn against the /fleet Starship photos; reached through `capsule-models.ts` by the descent scene (Flight 5 return) and shown on `/dev/models` (UXD-051) |

## Colour pipeline — one output step

Composer targets are linear. The renderer's `toneMapping`, `toneMappingExposure` and
`outputColorSpace` apply only when drawing straight to the canvas, so a composer scene without a
final `OutputPass` shows raw linear values (darker, higher contrast, ACES ignored) while a
direct-render tier or scene shows ACES + sRGB. Rules (guarded by `output-step-rule.test.ts`):

- **Every `EffectComposer` ends in exactly one `OutputPass`, last** — after bloom, bokeh, film and
  vignette. `createOutlinePassSetup({ outputPass: true })` does it for the surface and station routes;
  `explore-render-stack.ts`, `ascent-renderer.ts`, `fly-helio-scene.ts`, `milky-way-scene.ts` and
  `local-group-scene.ts` add their own. A new composer adds one in the same change.
- **Every colour texture sets `colorSpace = THREE.SRGBColorSpace`; every data map (roughness, alpha
  mask, anything not a colour) sets `THREE.NoColorSpace` explicitly.** An untagged texture is read
  as linear and comes out lighter than authored once the OutputPass encodes.
- Hex `THREE.Color` constants are already sRGB-aware (`ColorManagement`); do not pre-convert them.
- **Shader colours are `THREE.Color` uniforms; no raw `vec3`/`vec4` colour literals in GLSL** (0 and 1
  are fine). A colour-named uniform (`uColor`, `uHorizon`, `rimColor`, ...) is `new THREE.Color(hex)`,
  never an array or `Vector3`. A raw sRGB literal is read as linear and the OutputPass encodes it a
  second time (pale colours). Guarded by `output-step-rule.test.ts`
  (exceptions are listed there with a reason).
- Bloom thresholds, exposure and light intensities are tuned against the OutputPass output, not
  against raw linear values.

## `/fly` helio scene — moons and the 2D canvas

`fly-helio-scene.ts` owns the decorative moons (`MOON_SYSTEM`). The nine planetary-moon
destinations load their `static/textures/2k_<id>.jpg` the first time they are shown or targeted
(`moonTextures`, passed by `fly-scene-host.ts`); `setTargetMoon` highlights the one a plan flight
names (`mission.targetMoon`). `fly-frame-runner.ts` `draw2d` is the 2D canvas; its line values, scale
fit and destination selection are the pure modules in `src/lib/fly/` (`fly-2d-style.ts`,
`fly-2d-scale.ts`, `fly-2d-targets.ts`, UXD-043).

Small bodies (asteroids, comet nuclei, Kuiper Belt objects) are one look: `fly-rock.ts`
`rockGeometry(id)`, a cratered rock stretched to the body's published axis ratios, used by the
destination mesh (untextured small bodies, `isRockBody`) and by the passing encounter body;
Didymos carries Dimorphos. The flyby cinema shows only the flown-by body's moons
(`fly-moon-visibility.ts`), and the belts' point size is capped (`point-size-cap.ts`). The
cameras that frame a body from the Sun's side (the depart beat, the arrival and epilogue) are in
`src/lib/orbital/flyby-shots.ts` and `helio-non-flyby-frame.ts` (`sunSideCamT`).
The interplanetary cruise and approach are craft-led (`src/lib/orbital/helio-cruise-shot.ts`,
applied in `fly-frame-runner.ts` over the orbit camera, with the trajectory tube hidden), as the
cislunar coast is (`cislunar-craft-shot.ts`). So are the approach and depart of a comet or
asteroid the craft passes (`smallBodyPassShot`), where the planet rigs framed empty space. Phase
markers (both sets) are hidden in these close frames. The milestone labels follow `focusMilestones` in
`src/lib/fly/fly-frame-projections.ts`: only the active event during a flyby or the cruise shot,
no label at the hero beat, labels near a screen edge run inward.

## Critical contract — `document.hidden` pause

`docs/adr/TA.md` declares every 3D scene **must** pause its raf loop
when `document.hidden` is true. Backgrounded tabs that don't honour
this burn CPU + battery while invisible. As of #329, the only
enforced path is `createAnimateLoop`'s built-in visibility listener —
any route that wires its own raf without going through this factory
leaks the contract.

**If you find yourself writing `requestAnimationFrame(...)` directly
inside a route, stop.** Use `createAnimateLoop` instead. The opt-out
(`ignoreVisibilityPause: true`) exists for diagnostic harnesses
only — never for user-facing routes.

## Conventions

- **Each factory returns a `cleanup` function.** Always wire it into
  `onDestroy` via the lifecycle registry, not a hand-stowed thunk.
- **`createRouteLifecycle().on(target, event, handler, opts)` instead
  of `addEventListener` + paired removal.** Forgetting the removal
  is the most common leak source in this codebase.
- **`createUserDataTag<T>('something')` at module top-level**, then
  reuse the resulting writer/reader on every mesh that carries that
  payload. Don't inline `obj.userData.something = ...` at call sites.
- **Don't subclass Three.js classes.** Compose via the factories +
  user-data tags instead. Subclassing fights tree-shaking + makes
  disposal walks harder.

## Adding a new factory

Land it as a sibling file with:
1. A docstring naming the pain point + the routes that benefit
2. A typed return value, never an opaque `Object3D`
3. A focused unit test file (jsdom environment, no real WebGL)
4. A row in the discoverability matrix above

## Cross-references

- `docs/adr/TA.md` — the visibility-pause contract (and others)
- `docs/guides/non-fly-modules-audit-plan.md` — the audit that
  surfaced these factories from the 7-route duplication
- #329 — the umbrella issue for this consolidation work
- #325 — the raf+Three.js test harness that depends on these
  factories to remove its own ad-hoc renderer setup
