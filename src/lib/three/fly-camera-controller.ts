import * as THREE from 'three';
import type { HelioSceneHandles } from '$lib/three/fly-helio-scene';
import type { FlyUpdaters } from '$lib/three/fly-updaters';
import type { HelioReactiveOverlays } from '$lib/three/fly-helio-reactive';
import type { CinematicBeatState } from '$lib/fly-cinematic-beats';
import type { MissionTimeline, Vec2 } from '$lib/physics/transfer/mission-arc';
import type { LoadedMission } from '$lib/fly-mission-apply';
import {
  A_MOON_KM,
  R_EARTH_KM,
  R_MOON_KM,
  moonEciPos,
  type CislunarTrajectory,
} from '$lib/orbital/cislunar/cislunar-geometry';
import { R_EARTH_AU, type DestinationId } from '$lib/physics/transfer/lambert-grid.constants';
import type { CislunarSceneHandles } from '$lib/three/fly-cislunar-scene';
import { SCALE_3D, cameraDistanceFor } from '$lib/fly-scene-constants';
import { moonHelioPos } from '$lib/fly-moon-arc';
import { earthPos, destinationPos, spacecraftPos } from '$lib/physics/transfer/mission-arc';
import {
  CINEMATIC_TIMINGS,
  computeAfterglowCameraFrame,
  isPeakHolding,
  isAfterglowing,
  isCruiseHolding,
  isFinaleLocked,
} from '$lib/fly-cinematic-beats';
import { computeIconicFrame } from '$lib/orbital/iconic-frame';
import { computeHelioNonFlybyFrame } from '$lib/orbital/helio-non-flyby-frame';
import { computeCislunarCameraTarget } from '$lib/orbital/cislunar-camera-target';
import {
  buildArrivalComposition,
  type PlanetId as FlybyPlanetId,
} from '$lib/orbital/flyby-camera-plan';
import { composeShot, type ShotFrame, type ShotKind } from '$lib/orbital/flyby-shots';
import { selectShot } from '$lib/orbital/flyby-shot-schedule';
import { detectSubPhaseTransition } from '$lib/orbital/sub-phase-transition';
import { findActiveFlybyMet } from '$lib/orbital/find-active-flyby';
import { findActiveCislunarPhase } from '$lib/orbital/find-active-cislunar-phase';
import {
  findActiveCislunarHero,
  MOON_COMPOSITION,
  planCislunarHeroShot,
} from '$lib/orbital/cislunar/cislunar-hero-shot';
import {
  findFlybyPlanetFromLabel,
  findClosestPlanetToShip,
  PLANET_SIZES,
} from '$lib/orbital/find-flyby-planet';
import { buildFlyDebugSnapshot } from '$lib/orbital/fly-debug-snapshot';
import { predictShipPosAtMet } from '$lib/physics/transfer/predict-ship-pos';
import { sampleCislunarSpacecraftPos } from '$lib/orbital/sample-cislunar-spacecraft';

/**
 * `/fly` camera + cinematic-camera controller (RFC-036 WS-B — scene-host teardown).
 *
 * Owns the heliocentric + cislunar camera-orbit state (camR/P/T, targets, auto-zoom)
 * and the cinematic-camera drivers: updateHelioAutoZoomTargets / updateCam /
 * updateAutoZoomTargets / updateCislunarCam / helioResetCamera / panActiveCamera —
 * extracted VERBATIM from the fly/+page.svelte onMount closure (was ~1,008 lines).
 * The pure framing math already lives in $lib (computeIconicFrame,
 * computeHelioNonFlybyFrame, planCislunarHeroShot, computeCislunarCameraTarget, …);
 * this is the coupled orchestration + the spherical camera-position application.
 *
 * Live reactive reads (simDay, mission, arcTimeline, …) thread as `deps.get*()`;
 * the scene refs (camera, scene, helioHandles, flyUpdaters, helioReactive, cine)
 * pass by reference; the output-state the frame loop reads (camR/P/T, camTarget,
 * lastHelioSubPhase, helioFlybyDesiredCamT, montageShotFrame/Kind) is exposed on the
 * returned handle. currentDestMeshId stays a page `let` (written by mission-swap
 * effects too) via a getter/setter dep. Byte-identical to the inline code.
 */
export interface FlyCameraDeps {
  camera: THREE.PerspectiveCamera;
  cislunarCamera: THREE.PerspectiveCamera;
  cislunarSpacecraft: THREE.Sprite;
  cislunarHandles: CislunarSceneHandles;
  helioHandles: HelioSceneHandles;
  helioReactive: HelioReactiveOverlays;
  cine: CinematicBeatState;
  getSimDay: () => number;
  getSimSpeed: () => number;
  getViewMode: () => 'heliocentric' | 'cislunar';
  getIsMoonMission: () => boolean;
  getActiveDestination: () => DestinationId;
  getMission: () => LoadedMission;
  getArcTimeline: () => MissionTimeline;
  getOutPts: () => Vec2[];
  getRetPts: () => Vec2[];
  getCislunarTrajectory: () => CislunarTrajectory | null;
  getEpilogueActive: () => boolean;
  getOpeningActive: () => boolean;
  getOpeningStartedAt: () => number;
  getOpeningDurationMs: () => number;
  getCamSnapUntil: () => number;
  getCurrentDestMeshId: () => DestinationId;
  setCurrentDestMeshId: (id: DestinationId) => void;
  /** Getter for flyUpdaters (may be assigned after controller creation). */
  getFlyUpdaters: () => FlyUpdaters | undefined;
}

export function createFlyCameraController(deps: FlyCameraDeps) {
  const {
    camera,
    cislunarCamera,
    cislunarSpacecraft,
    cislunarHandles,
    helioHandles,
    helioReactive,
    cine,
  } = deps;
  const SCALE_CISLUNAR = cislunarHandles.scaleCislunar;
  const cislunarMoon = cislunarHandles.moon;
  // Camera
  let camR = 360;
  let camP = 1.05;
  let camT = 0.6;
  // Cislunar camera orbital state (ADR-058). Independent of the
  // heliocentric camera so toggling between views preserves each
  // view's framing. Default frames the Earth-Moon system at the
  // current SCALE_CISLUNAR.
  let cislunarCamR = A_MOON_KM * SCALE_CISLUNAR * 1.8;
  let cislunarCamP = 1.05;
  let cislunarCamT = 0.6;
  // Camera target — origin (Sun) for Mars / heliocentric framings;
  // live Earth heliocentric position for Moon-mode so the Earth+Moon
  // system stays centered as Earth orbits the Sun.
  const camTarget = new THREE.Vector3(0, 0, 0);
  const cislunarCamTarget = new THREE.Vector3(0, 0, 0);
  // Heliocentric auto-zoom state — mirror of the cislunar pattern.
  // Drives camR + camTarget through DEPART → CRUISE → APPROACH so the
  // viewer gets a sense of leaving Earth, transiting, and arriving.
  // Re-armed on sub-phase transitions; mouse-wheel during a sub-phase
  // disables the lerp until the next transition.
  let helioAutoZoomActive = false;
  let helioAutoZoomTargetR = 360;
  const helioAutoZoomTargetCenter = new THREE.Vector3(0, 0, 0);
  let lastHelioSubPhase: string | null = null;
  // #2 — Saturn-OI Wernquist composition flag. Set by
  // updateHelioAutoZoomTargets when the active flyby is the Saturn OI;
  // read by updateCam to tilt camera.up for the ring-plane angled
  // look. Cleared when leaving Saturn-OI cinema.
  let saturnOIComposition = false;
  // cinemaForceMoons + lastLayerMoonsOn are declared at the top of
  // onMount alongside the onLayerChange('moons') subscription (TDZ
  // would fire here otherwise — see the comment block there).
  // Earth return closeup distance. A previous iteration tried 30 to
  // hug Earth more tightly, but that read as "too zoomed in" and
  // the depart-from-Mars pull-out couldn't reach it gracefully —
  // the Earth approach felt like a hard cut in too early. 50 keeps
  // Earth recognisable in frame with breathing room around the
  // RETURN ring + scene composition.
  const HELIO_EARTH_CLOSEUP_R = 50;
  // Approach pitch tilt — during the final 8 % of outbound/return the
  // auto-zoom raises camP from its default cruise value (1.05 ≈ 60° off
  // zenith) to APPROACH_P (≈ 49°) for a steeper, more cinematic descent
  // angle on the destination. Other sub-phases target the cruise default.
  const HELIO_CRUISE_P = 1.05;
  const HELIO_APPROACH_P = 0.85;
  let helioAutoZoomTargetP = HELIO_CRUISE_P;
  // Desired camera azimuth during flyby cinema. When set, the per-frame
  // camT update lerps toward this value instead of free-spinning, so
  // the planet doesn't end up between the camera and the spacecraft
  // (the user-reported "ship blended into Venus" occlusion). Set in
  // the flyby branch of updateHelioAutoZoomTargets; cleared to null
  // when we leave flyby cinema. See computeFlybyDesiredCamT below.
  let helioFlybyDesiredCamT: number | null = null;
  // Flyby montage (#371) — the active shot frame for this render, set in
  // updateHelioAutoZoomTargets' flyby branch and APPLIED after updateCam()
  // (Marko's "override final transform" integration). null = not in a
  // montage window → the normal cruise/lerp camera drives. `montageEnabled`
  // is the master toggle: off via `?montage=0` (reload A/B), or live via
  // `window.__flyMontage(false)` in DEV.
  let montageEnabled = new URLSearchParams(window.location.search).get('montage') !== '0';
  if (import.meta.env.DEV) {
    (window as unknown as { __flyMontage?: (on: boolean) => void }).__flyMontage = (on) => {
      montageEnabled = on;
    };
  }
  let montageShotFrame: ShotFrame | null = null;
  let montageShotKind: ShotKind | null = null;
  // Previous frame's shot kind — a change is a CUT (snap); same kind
  // smooths within the shot so the chase/depart don't jitter.
  /** Reusable flyby choreography: a slow panoramic sweep timed so the
   *  camera arrives at the iconic "perpendicular to ship→planet"
   *  composition exactly at peak (closest approach), having swept
   *  ~90° across the planet during the final ~30 days of approach.
   *
   *  Composition rationale:
   *  - Peak frame: camera perpendicular to ship→planet line — neither
   *    body occludes the other (the Venus #1 "ship blended into
   *    planet" report came from a camera azimuth that landed on the
   *    planet-far-side of the ship, planet eclipsing the ship).
   *  - Pre-peak: camera offset 90° "behind" the peak azimuth. The
   *    planet fills more of the frame, the ship is approaching from
   *    behind it. As approach progresses, the camera arcs around so
   *    that at peak we hit the iconic frame.
   *  - Post-peak: small ~22° continuation past the peak azimuth so
   *    the camera doesn't freeze in place — the ship streams out
   *    "ahead" while the camera follows briefly before settling.
   *
   *  All flybys reuse this by feeding their peak day + planet pos +
   *  ship pos. The animate loop's camT lerp tracks the returned
   *  desiredCamT each frame.
   */
  // Legacy panoramic-sweep tunables — retained as scaffolding for
  // future per-planet choreography tweaks. void to silence unused.
  const FLYBY_PAN_DAYS = 30;
  const FLYBY_PAN_ARC = Math.PI / 2;
  const FLYBY_PAN_LEAD_DAYS = 10;
  void FLYBY_PAN_DAYS;
  void FLYBY_PAN_ARC;
  void FLYBY_PAN_LEAD_DAYS;
  /** Sample the outbound trajectory spline at a given deps.getMission()-elapsed
   *  day, returning a 2D scene-position. Linear interpolation across
   *  deps.getOutPts() (which already encode the planned deps.getMission() curve). Used to
   *  predict the spacecraft's position at the flyby peak so the
   *  camera knows which side of the planet the ship will be on. */
  // predictShipPosAtMet lives in $lib/physics/transfer/predict-ship-pos — pure
  // helper, unit-tested. The closure used to be inline here.
  // The previous computeFlybyChoreographyCamT (perpendicular
  // azimuth + 90° pan sweep) was replaced by the inline
  // "ship-side same-line" math in the flyby cinema block — see
  // updateHelioAutoZoomTargets. The new model places the camera
  // ON the ship's side of the planet (atan2(planetToShip)) so the
  // ship is always BETWEEN camera and planet (in front, not
  // behind). FLYBY_PAN_DAYS / FLYBY_PAN_ARC / FLYBY_PAN_LEAD_DAYS
  // constants kept for telemetry / future per-planet tuning.
  // Flyby cinema mode — when the active deps.getMission() has 'flyby' events on
  // its flight.events roster (grand-tour outer-system missions:
  // Voyager 1/2, Cassini, Galileo, Pioneer, etc.), the camera locks
  // a closeup on the spacecraft inside an asymmetric window around
  // each flyby's met_days. APPROACH side widens to 90 days so the
  // user sees the ship slowly closing on the flyby planet during
  // the long cruise; DEPART side is shorter (40 days) so the camera
  // pulls back into cruise before the LERP runs too long. Inside
  // the window the regular cruise / approach / depart sub-phases
  // are overridden.
  // Cinema window: camera locks closeup on the flyby body inside
  // this window. Tightened from 90/40 → 25/25 so the cinema only
  // engages when the ship is genuinely close to the body and the
  // user gets cruise camera variety in the long phases between.
  // Asymmetric Freytag pacing — approach < peak-included < depart,
  // matching the cinematic guide T4. Real flybys have a brief
  // closest-approach moment then a long afterglow as the spacecraft
  // recedes. Symmetric 25/25 felt like a video-game cutscene; this
  // 20/30 split + sim-speed dilation during peak (see animate loop)
  // stretches the closest-approach moment in screen time without
  // touching physics. JPL's Cassini end-of-deps.getMission() lingers ten beats
  // after the burn; we do the same in proportion.
  // Bumped 20 → 60 days so the camera has 3× the wall-clock window
  // to converge on the iconic flyby composition BEFORE the ship
  // reaches peak. The previous 20-day window (= 2.86 wall-clock
  // seconds at 7× sim speed) was barely long enough for the
  // LERP=0.025 to converge — the camera arrived AT peak instead of
  // before, which user read as "camera rotates late, after ship
  // passes through planet." At 60 days, convergence completes
  // ~6 sec early and the camera holds the iconic frame as the ship
  // arcs into it.
  // FLYBY_APPROACH_DAYS / FLYBY_DEPART_DAYS / OI_APPROACH_DAYS now
  // live in $lib/orbital/find-active-flyby alongside the window-scan
  // helper findActiveFlybyMet. The doc rationale (60d approach so
  // the LERP converges before the closest-approach beat; 40d OI
  // approach so Saturn-OI has time to compose) is captured in that
  // module.
  /** Peak window — the closest-approach beat. Inside this window
   *  sim-speed gets dilated so the moment stretches in screen time. */
  /** Fallback camR if we couldn't resolve the flyby body. */
  const HELIO_FLYBY_R_FALLBACK = 80;

  /** Per-flyby cinema overrides. Each NASA deps.getMission()-art reference
   *  composes differently — Cassini-Saturn frames the ship + rings
   *  oblique, Galileo-Jupiter foregrounds the dish, Juno-Jupiter
   *  hugs the limb close. These tunables let each body's flyby
   *  pose its own composition without flattening the variations.
   *  - spriteScale: sprite glyph size during cinema
   *  - modelScale:  per-deps.getMission() 3D model size during cinema
   *  - toCameraR:   ship push-toward-camera as a multiple of
   *                 the body's visual radius (1.4 = ship sits at
   *                 ~1.0·r from the camera, well clear of the
   *                 planet's front face) */

  // PLANET_SIZES + findFlybyPlanetFromLabel + findClosestPlanetToShip
  // were moved to $lib/orbital/find-flyby-planet so they can be
  // unit-tested + reused by the upcoming animate-loop split. The
  // rationale for why label-parsing is the primary signal over
  // closest-planet-detection lives in that module's docstring.
  function updateHelioAutoZoomTargets(): void {
    if (deps.getIsMoonMission()) return; // cislunar handles its own auto-zoom
    // Reset the montage shot each frame; the flyby branch re-arms it when
    // the current MET falls inside a montage window. (#371)
    montageShotFrame = null;
    montageShotKind = null;
    const sc = spacecraftPos(
      deps.getSimDay(),
      deps.getArcTimeline(),
      deps.getOutPts(),
      deps.getRetPts(),
    );
    const ePos = earthPos(deps.getSimDay());
    const earthScene = new THREE.Vector3(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
    // Track the destinationMesh's CURRENT id rather than the deps.getMission()'s
    // primary, so a transient swap to a secondary flyby body (NH at
    // Arrokoth past Pluto) renders the destinationMesh at the right
    // heliocentric position. deps.getCurrentDestMeshId() resets back to
    // deps.getActiveDestination() when the flyby window closes.
    const dPosLive = destinationPos(deps.getSimDay(), deps.getCurrentDestMeshId());
    const destScene = new THREE.Vector3(dPosLive.x * SCALE_3D, 0, dPosLive.z * SCALE_3D);
    // Live spacecraft scene position (AU × SCALE_3D).
    const scScene = new THREE.Vector3(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);
    // Cruise centre = midpoint of (spacecraft, Sun). Equivalent to
    // weighting the camera target — the cruise sub-phase now picks
    // its own ship-biased centre (see cruise-out / cruise-back blocks
    // below), so the 50/50 midpoint that lived here is no longer
    // needed.

    // Detect an active flyby window. deps.getMission().flight.events is the
    // canonical roster; type='flyby' fires the cinema sub-phase.
    // met_days are deps.getMission()-relative; convert to deps.getSimDay() by adding
    // deps.getArcTimeline().dep_day. First matching window wins (events are
    // monotonic so overlap is rare). The window opens 90 days
    // BEFORE the flyby (so the user sees the slow approach) and
    // closes 40 days AFTER.
    const flybyEvents = deps.getMission().flight?.events ?? [];
    // Flyby cinema fires whenever the active-flyby window contains
    // the current deps.getSimDay(). Earlier this was gated on `!deps.getEpilogueActive()`
    // to fix Saturn-OI's peakHold pinning case (the cinema never
    // released because peakHold froze deps.getSimDay() at peak, blocking the
    // epilogue's wide bookend tableau). But the gate over-suppressed
    // for ordinary missions where MOI IS the arrival event (Mars
    // Express, Mars Pathfinder, Mariner 9, etc.): users landing at
    // the iconic MOI moment got the wide epilogue instead of the
    // close-up Mars composition. Removing the gate restores those.
    // Saturn-OI peakHold pinning is a separate issue (the peakHold
    // mechanism itself should release after a finite time, or the
    // cinema window should auto-close at MET = peak + DEPART days
    // regardless of peakHold — both pursuable in a follow-up).
    const activeFlybyMet = findActiveFlybyMet(
      flybyEvents,
      deps.getSimDay(),
      deps.getArcTimeline().dep_day,
    );

    let sub: string;
    let centerX: number;
    let centerZ: number;
    let centerY = 0;
    let targetR: number;
    let targetP = HELIO_CRUISE_P;

    if (activeFlybyMet !== null) {
      // Flyby cinema — iconic-photo composition. Primary signal:
      // parse the flyby body from the event's label (Cassini's
      // "Venus #1 — gravity assist" → Venus). Fallback for
      // unlabeled missions: closest planet to spacecraft.
      const activeEvt = flybyEvents.find((e) => e.met_days === activeFlybyMet);
      const flyby =
        findFlybyPlanetFromLabel(activeEvt?.label) ??
        findClosestPlanetToShip(sc.pos, deps.getSimDay());
      // Debug exposure. Builder lives in $lib/orbital/fly-debug-snapshot
      // so the DEV-vs-prod payload shape is unit-tested. flybyId +
      // flybySize ship in BOTH modes (the foreground ship-offset
      // block reads them outside the DEV gate); everything else is
      // stripped in production.
      window.__flyDebug = buildFlyDebugSnapshot({
        isDev: import.meta.env.DEV,
        activeFlybyMet,
        flyby,
        spacecraftPos: { x: sc.pos.x, z: sc.pos.z },
        subPhase: lastHelioSubPhase,
        simDay: deps.getSimDay(),
        peakHoldUntil: cine.peakHoldUntil,
        peakHoldArmedForFlybyMet: cine.peakHoldArmedForFlybyMet,
        now: performance.now(),
        camR,
        camTarget: { x: camTarget.x, y: camTarget.y, z: camTarget.z },
      });
      if (flyby) {
        const bodyPos =
          flyby.id === 'earth'
            ? earthPos(deps.getSimDay())
            : destinationPos(deps.getSimDay(), flyby.id);
        const bodyScene = new THREE.Vector3(bodyPos.x * SCALE_3D, 0, bodyPos.z * SCALE_3D);
        void bodyScene;
        sub = `flyby-${activeFlybyMet}-${flyby.id}`;
        // Secondary-flyby destinationMesh swap. The 8 main planets
        // (mercury..neptune) plus Earth render via context meshes
        // that are always in the scene — for those bodies no swap is
        // needed. Bodies like Pluto / Arrokoth / Ceres only render
        // through the single destinationMesh, so a flyby past one of
        // them while the deps.getMission()'s primary destination is a DIFFERENT
        // such body (NH Arrokoth past primary-destination Pluto)
        // would otherwise see the camera composing against thin air.
        // Swap the mesh transiently; the cruise branch swaps back.
        const NON_CONTEXT_BODIES = new Set<DestinationId>([
          'pluto',
          'arrokoth',
          'ceres',
          'vesta',
          'psyche',
          'bennu',
          'halley',
          '67p',
          // #341 Batch 5 small bodies — same mesh-swap mechanism.
          'itokawa',
          'didymos',
          'dimorphos',
          'donaldjohanson',
          'eurybates',
          'polymele',
          'leucus',
          'orus',
          'patroclus',
          'menoetius',
        ]);
        if (
          flyby.id !== 'earth' &&
          NON_CONTEXT_BODIES.has(flyby.id as DestinationId) &&
          flyby.id !== deps.getCurrentDestMeshId()
        ) {
          deps.getFlyUpdaters()?.helio.applyDestination(flyby.id as DestinationId);
          deps.setCurrentDestMeshId(flyby.id as DestinationId);
        }
        // Limb-grazing composition — bias the camera target 65 % toward
        // the spacecraft position (was 35 %). This pushes the planet
        // CENTRE off-frame so the planet LIMB arcs across the rule-of-
        // thirds line. The hero of the frame becomes the curving limb
        // + the spacecraft silhouetted against it, matching the
        // Cassini-Saturn / Juno-Jupiter / Pioneer-Jupiter compositions
        // where the body fills one half of the frame and curves out of
        // view rather than sitting whole in the centre. Shot-language
        // guide §P5 + T3 — "containment kills awe."
        // Earth flyby gets special treatment — the HOME planet
        // beat. We weight the framing MORE toward Earth (50/50
        // instead of 35/65) so Earth dominates the frame, and we
        // tighten the camera distance (3.2× vs 5×) for a closer,
        // more emotional read — earthrise-style. The longer peak
        // hold is applied where peakHoldUntil is armed.
        // ICONIC FLYBY COMPOSITION — Cassini-deps.getMission()-art reference.
        // Camera must be on the SHIP'S side of the planet, looking
        // toward the planet center. Ship is between camera and
        // planet, silhouetted against the planet's lit disc — ship
        // is small, in front of planet, NEVER behind. This is the
        // hard rule Marko keeps reiterating, and the previous
        // "perpendicular to ship→planet line" math violated it
        // because perpendicular put the camera at 90° offset where
        // either side could end up with the ship behind the planet
        // depending on the gravity-assist trajectory direction.
        //
        // Geometry:
        //   camTarget = planet center (planet centered in frame)
        //   camera_pos = planet + (ship - planet).normalized × camR
        //   camR > ship_to_planet_dist so ship is between cam and planet
        //
        // To anticipate the gravity-assist swing, we use the ship's
        // PEAK position (predicted via deps.getOutPts() spline), not the
        // current position. That way the camera is already on the
        // "right side" before the ship arrives there.
        // ICONIC HERO-SHOT — Cassini-deps.getMission()-art over-the-shoulder
        // composition. The camera is positioned at a 3/4 side angle
        // off the spacecraft's velocity vector, looking AT the ship.
        // The ship sits in the foreground at 3/4 view; the planet
        // appears in the background BEHIND the ship from camera POV
        // (ship between camera and planet along the view axis).
        //
        // This is FUNDAMENTALLY different from the previous "camera
        // looking at the planet with ship somewhere in frame"
        // composition — Marko's feedback: "angle at planet was
        // never problem ... change camera to get more side angle
        // at ship."
        // v2 iconic-shot math + spherical-coord conversion are now in
        // $lib/orbital/iconic-frame; the helper takes the ship-sampler
        // closure + the planet's scene-space position + the iconic
        // moment's MET and returns the (centerXYZ, targetR, targetP,
        // helioFlybyDesiredCamT) tuple. See its module docstring for
        // the planet-centric composition rationale.
        const totalOutboundDays = deps.getArcTimeline().arr_day - deps.getArcTimeline().dep_day;
        const sampleShipScene = (met: number) => {
          const p = predictShipPosAtMet(deps.getOutPts(), met, totalOutboundDays);
          if (!p) return null;
          return { x: p.x * SCALE_3D, y: p.y * SCALE_3D, z: p.z * SCALE_3D };
        };
        // Orbit-insertion / arrival events (Mars Express MOI, Curiosity
        // EDL, Cassini SOI, Dawn at Vesta…) use the arrival composition:
        // at insertion the ship matches the planet's heliocentric
        // velocity, so the legacy time lead barely separates it and the
        // glyph sat ON the planet disc. buildArrivalComposition switches
        // to a spatial lead (ship silhouetted off the limb) + wider camR
        // + lower side + look-bias. Gravity-assist flybys keep the
        // per-planet default. Shared with the audit:fly-cameras script.
        const isArrivalEvent = activeEvt?.type === 'edl_or_oi' || activeEvt?.type === 'arrival';
        const arrivalComp = isArrivalEvent
          ? buildArrivalComposition(flyby.id as FlybyPlanetId, flyby.size)
          : null;
        const iconicFrame = computeIconicFrame({
          flybyPlanetId: flyby.id as FlybyPlanetId,
          flybyPlanetRadius: flyby.size,
          planetScenePos: { x: bodyScene.x, z: bodyScene.z },
          peakMet: activeFlybyMet,
          sampleShipScene,
          fallbackShipPos: { x: scScene.x, z: scScene.z },
          fallbackPitchRad: HELIO_APPROACH_P,
          composition: arrivalComp?.composition,
          iconicSeparationRadii: arrivalComp?.iconicSeparationRadii,
        });
        centerX = iconicFrame.centerX;
        centerY = iconicFrame.centerY;
        centerZ = iconicFrame.centerZ;
        targetR = iconicFrame.targetR;
        targetP = iconicFrame.targetP;
        helioFlybyDesiredCamT = iconicFrame.helioFlybyDesiredCamT;
        // Montage (#371): pick the active shot for the current MET offset
        // from the flyby peak and compose its frame. Applied after
        // updateCam() as an override. The HERO shot reuses this same
        // composition; establish/approach/depart are distinct rigs. The
        // iconicFrame above still feeds the lerp targets so leaving the
        // montage window hands back to cruise framing smoothly.
        if (montageEnabled) {
          const metOffset = deps.getSimDay() - (deps.getArcTimeline().dep_day + activeFlybyMet);
          const shotKind = selectShot(metOffset);
          if (shotKind) {
            montageShotFrame = composeShot(shotKind, {
              planetId: flyby.id as FlybyPlanetId,
              planetPos: { x: bodyScene.x, z: bodyScene.z },
              planetRadius: flyby.size,
              shipPosAtMet: sampleShipScene,
              peakMet: activeFlybyMet,
              met: deps.getSimDay() - deps.getArcTimeline().dep_day,
              heroComposition: arrivalComp?.composition,
              heroSeparationRadii: arrivalComp?.iconicSeparationRadii,
            });
            montageShotKind = shotKind;
          }
        }
      } else {
        sub = `flyby-${activeFlybyMet}`;
        centerX = scScene.x;
        centerZ = scScene.z;
        targetR = HELIO_FLYBY_R_FALLBACK;
        helioFlybyDesiredCamT = null;
      }
      // Saturn-OI composition flag. The shallow ring-plane-edge-on
      // pitch is now expressed inside PLANET_COMPOSITION.saturn
      // (pitchRad: 0.32 ≈ 18° above the orbital plane vs the 20°
      // default), so this block no longer needs to clobber targetP
      // — the v2 wire-up above already produced the right pitch for
      // Saturn. The flag is still needed to drive the camera.up
      // 17° roll applied at the render block (line ~4160), which
      // is a post-process effect orthogonal to the planFlybyShot
      // positioning.
      const isSaturnOI = activeEvt?.type === 'edl_or_oi' && flyby?.id === 'saturn';
      saturnOIComposition = isSaturnOI;
      const subPhaseTransition = detectSubPhaseTransition({
        prev: lastHelioSubPhase,
        next: sub,
      });
      if (subPhaseTransition.transitioned) {
        lastHelioSubPhase = sub;
        helioAutoZoomActive = true;
        // Auto-show moons during flyby cinema. Entering forces them
        // visible; exiting restores whatever the science-lens layer
        // last asked for.
        if (subPhaseTransition.enteredFlybyCinema) {
          helioReactive.cinemaForceMoons = true;
          helioHandles.setMoonsVisible(true);
        } else if (subPhaseTransition.exitedFlybyCinema) {
          helioReactive.cinemaForceMoons = false;
          helioHandles.setMoonsVisible(helioReactive.lastLayerMoonsOn);
        }
      }
      helioAutoZoomTargetR = targetR;
      // Track ship's y (above orbital plane) so the camera looks AT
      // the ship's actual world position, not at the y=0 plane
      // below it. Otherwise the camTarget sits 3+ scene units below
      // the spacecraft and any 3/4-angle camera rotation is masked
      // by the camera looking down at the empty plane.
      helioAutoZoomTargetCenter.set(centerX, centerY, centerZ);
      helioAutoZoomTargetP = targetP;
      return;
    }
    // Leaving flyby into non-flyby: clear the saturnOI composition
    // flag so camera.up returns to vertical and drop the desired
    // azimuth so the cruise/approach camT spin resumes.
    saturnOIComposition = false;
    helioFlybyDesiredCamT = null;
    // Non-flyby sub-phase frame (opening / prelaunch / cruise-out /
    // approach / depart / arrived / epilogue / cruise-back /
    // depart-return / approach-earth) — pure compute lives in
    // $lib/orbital/helio-non-flyby-frame. Caller still owns the
    // sub-phase transition + helioAutoZoomActive mutation below.
    const inOpeningWide =
      sc.phase === 'pre-launch' &&
      deps.getOpeningActive() &&
      deps.getOpeningStartedAt() > 0 &&
      performance.now() - deps.getOpeningStartedAt() < deps.getOpeningDurationMs() - 1000;
    const frame = computeHelioNonFlybyFrame({
      phase: sc.phase,
      progress: sc.progress,
      scScene,
      destScene,
      earthScene,
      epilogueActive: deps.getEpilogueActive(),
      endAtEarth: deps.getRetPts().length > 0,
      destSize: PLANET_SIZES[deps.getActiveDestination()] ?? 0,
      inOpeningWide,
      rEarthAu: R_EARTH_AU,
      scale3d: SCALE_3D,
    });
    sub = frame.sub;
    centerX = frame.centerX;
    centerZ = frame.centerZ;
    targetR = frame.targetR;
    targetP = frame.targetP;
    if (sub !== lastHelioSubPhase) {
      const wasInFlybyCinema = lastHelioSubPhase?.startsWith('flyby-') ?? false;
      lastHelioSubPhase = sub;
      helioAutoZoomActive = true;
      // #2 — exit flyby cinema → restore moons to layer state
      if (wasInFlybyCinema) {
        helioReactive.cinemaForceMoons = false;
        helioHandles.setMoonsVisible(helioReactive.lastLayerMoonsOn);
      }
      // Secondary-flyby destinationMesh swap-back. If we swapped the
      // mesh to a flyby-only body (Arrokoth, Pluto if not primary,
      // Ceres), restore the deps.getMission()'s primary destination now that
      // the flyby window has closed. This keeps the post-flyby
      // cruise framing showing the right destination.
      if (wasInFlybyCinema && deps.getCurrentDestMeshId() !== deps.getActiveDestination()) {
        deps.getFlyUpdaters()?.helio.applyDestination(deps.getActiveDestination());
        deps.setCurrentDestMeshId(deps.getActiveDestination());
      }
    }
    helioAutoZoomTargetR = targetR;
    helioAutoZoomTargetCenter.set(centerX, 0, centerZ);
    helioAutoZoomTargetP = targetP;
  }

  const updateCam = () => {
    if (deps.getIsMoonMission()) {
      // Track the Earth+Moon midpoint so both planets always sit
      // inside the frame — Earth stays toward one side, Moon toward
      // the other, the arc draws between them. Earth-only targeting
      // (the previous behaviour) clipped Moon out of view as it
      // orbited around behind the camera.
      const ePos = earthPos(deps.getSimDay());
      const mPos = moonHelioPos(deps.getSimDay());
      camTarget.set(((ePos.x + mPos.x) / 2) * SCALE_3D, 0, ((ePos.z + mPos.z) / 2) * SCALE_3D);
    } else {
      updateHelioAutoZoomTargets();
      // Slow cinematic lerps — at 60 fps, LERP=0.010 takes ~7 s to
      // converge to a fresh sub-phase target; TRACK=0.006 drifts
      // even slower for the idle steady-cam between transitions.
      // Prior values (0.022 / 0.015) read as a snap-cut when the
      // depart-from-Mars sub-phase pulled out to wide cruise — the
      // pull-out lasted barely a second of wall-clock. camP is
      // lerped in both modes so the approach pitch tilt resolves
      // smoothly into the cruise default.
      // Polish-wave-3 W3.1 — the lerp keeps running during the
      // peak-hold window. SimDay is frozen up at the animate() top,
      // so during the hold the world stops moving while the camera
      // converges onto the iconic-photo composition. The arc-rotate
      // / pitch-breath in the cinema motion block IS skipped during
      // the hold so there's no parallax sweep while we're "stopped."
      //
      // W3.2 — afterglow pull-out. After the hold expires, the
      // camera slow-dollies away from the body for 6 wall-clock
      // seconds. camR tweens from the held iconic-frame distance
      // out to ~4.5× that distance; camTarget + camP stay locked
      // at the converged values so the motion is a pure dolly,
      // not a track.
      const _nowForCine = performance.now();
      // W3.4 finale lock + W3.7 cruise hold — no camera update,
      // pure locked frame. W3.2 afterglow — eased dolly recede
      // computed by $lib/fly-cinematic-beats.computeAfterglowCameraFrame.
      if (isFinaleLocked(cine, _nowForCine) || isCruiseHolding(cine, _nowForCine)) {
        // No camera update — pure locked frame.
      } else if (!isPeakHolding(cine, _nowForCine) && isAfterglowing(cine, _nowForCine)) {
        if (cine.afterglowStartCamR === 0) {
          // First frame of afterglow — capture the converged
          // iconic-frame composition as the recede's origin.
          cine.afterglowStartCamR = camR;
          cine.afterglowTargetCamR = camR * CINEMATIC_TIMINGS.AFTERGLOW_PULLBACK_FACTOR;
          cine.afterglowCenterX = camTarget.x;
          cine.afterglowCenterZ = camTarget.z;
          cine.afterglowP = camP;
        }
        const tween = computeAfterglowCameraFrame(cine, _nowForCine);
        camR = tween.camR;
        camTarget.x = tween.centerX;
        camTarget.z = tween.centerZ;
        camP = tween.camP;
      } else if (helioAutoZoomActive) {
        // Scrubber jumps boost the lerp rate so a Jupiter → Earth
        // hop doesn't spend 6-8 seconds in the slow cinematic lerp.
        // deps.getCamSnapUntil() is set by jumpToMet (700 ms) and onScrub
        // (300 ms) — during those windows we converge at ~3 × the
        // cruise rate. Outside the window the cinematic rate restores
        // for in-flight transitions.
        //
        // Polish-wave-2 (2026-06): the cinematic rate was bumped from
        // 0.01 to 0.025. At 0.01 the 20-day approach window for an
        // outer-system body translated to under a wall-clock second
        // at default sim speed — not enough time for the camera to
        // converge to the iconic-photo composition before the flyby
        // event passed. 0.025 reaches 90% of target in ~90 frames
        // (~1.5 s at 60 fps), inside even a 10-day approach window
        // at 30 d/s sim speed.
        //
        // Polish-wave-3 follow-up (Fix A) — scale LERP + TRACK by
        // sim speed. The 0.025 rate was tuned for 7 d/s (Cassini's
        // default). At 30 d/s the heliocentric world moves ~4×
        // faster — Cassini covers ~6.5 scene units / wall-clock
        // second on the Jupiter → Saturn leg, and the destination
        // (Saturn) is moving too. A fixed lerp can't catch a target
        // that's racing, so the camera spends the whole Saturn
        // approach mid-lerp pointing at where the midpoint USED to
        // be — user reports "all black" until pause lets it catch
        // up. Scaling by deps.getSimSpeed()/7 (capped at 0.18 / 0.05 so we
        // don't snap-cut) keeps composition fresh at every speed.
        const simSpeedFactor = Math.max(1, deps.getSimSpeed() / 7);
        const inSnapWindow = performance.now() < deps.getCamSnapUntil();
        // LERP_BASE bumped 0.025 → 0.05 for flyby cinema so the
        // camera converges in ~1.5s instead of 3s — combined with
        // the 60-day approach window (was 20), the camera now
        // arrives at the iconic frame well before peak instead of
        // catching up after.
        const inFlybyCinemaForLerp = lastHelioSubPhase?.startsWith('flyby-') ?? false;
        const inEpilogue = lastHelioSubPhase === 'epilogue';
        // Epilogue gets a deliberately SLOW lerp (0.008) so the
        // transition from Saturn closeup → wide bookend tableau
        // reads as a contemplative slow pull-out (~10 s wall-clock)
        // instead of a snap-cut. Marko: "we can make transition
        // from that Saturn scene slowly to final one."
        const LERP_BASE = inSnapWindow
          ? 0.08
          : inEpilogue
            ? 0.008
            : inFlybyCinemaForLerp
              ? 0.05
              : 0.025;
        // Cap the lerp at 0.18 for normal cases; for the epilogue
        // we want it CAPPED LOWER so even at high sim speeds the
        // pull-out stays cinematic rather than snapping.
        const LERP = inEpilogue
          ? Math.min(0.025, LERP_BASE * simSpeedFactor)
          : Math.min(0.18, LERP_BASE * simSpeedFactor);
        camR += (helioAutoZoomTargetR - camR) * LERP;
        camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * LERP;
        camTarget.y += (helioAutoZoomTargetCenter.y - camTarget.y) * LERP;
        camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * LERP;
        camP += (helioAutoZoomTargetP - camP) * LERP;
        if (Math.abs(camR - helioAutoZoomTargetR) < 0.5) helioAutoZoomActive = false;
      } else {
        // Even after convergence we keep a stronger track during
        // flyby cinema because the framing target (planet pos + ship
        // pos) moves every frame; the prior TRACK=0.006 couldn't
        // keep up and the camera drifted off the iconic composition
        // (user-reported "camera loses ship" mid-flyby). Inside the
        // flyby branch sub starts with 'flyby-'; bump TRACK 4× there
        // and also let camR track (without this only center drifts,
        // and the cruise→cinema camR delta never closes when
        // helioAutoZoomActive flipped false mid-lerp).
        const simSpeedFactor = Math.max(1, deps.getSimSpeed() / 7);
        const inFlyby = lastHelioSubPhase?.startsWith('flyby-') ?? false;
        const TRACK_BASE = inFlyby ? 0.025 : 0.006;
        const TRACK = Math.min(0.08, TRACK_BASE * simSpeedFactor);
        camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * TRACK;
        camTarget.y += (helioAutoZoomTargetCenter.y - camTarget.y) * TRACK;
        camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * TRACK;
        camP += (helioAutoZoomTargetP - camP) * TRACK;
        if (inFlyby) {
          camR += (helioAutoZoomTargetR - camR) * TRACK;
        }
      }
    }
    camera.position.set(
      camTarget.x + camR * Math.sin(camP) * Math.sin(camT),
      camTarget.y + camR * Math.cos(camP),
      camTarget.z + camR * Math.sin(camP) * Math.cos(camT),
    );
    // #2 — Saturn-OI tilt: roll camera.up by 17° so the horizon
    // (and Saturn's disc) appears askew, reading as Wernquist's
    // ring-plane-edge-on Grand Finale orientation. Reverts to true
    // vertical (0,1,0) outside Saturn-OI composition.
    if (saturnOIComposition) {
      const ROLL = 0.3;
      camera.up.set(Math.sin(ROLL), Math.cos(ROLL), 0);
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(camTarget);
  };
  // Auto-zoom state for cislunar phases (ADR-058 polish). When the
  // spacecraft is in a lunar-localised phase (orbit, spiral_lunar,
  // descent, ascent), the camera lerps to a close-up of the Moon so
  // the orbit detail is visible. Otherwise it returns to the wide
  // Earth-Moon framing. Same pattern can extend to any orbital phase
  // around any body in future passes (Mars orbit for Curiosity, etc.).
  const WIDE_DISTANCE = A_MOON_KM * SCALE_CISLUNAR * 1.8; // ~69u
  const LUNAR_CLOSEUP_DISTANCE = R_MOON_KM * SCALE_CISLUNAR * 20; // ~3.5u
  const EARTH_CLOSEUP_DISTANCE = R_EARTH_KM * SCALE_CISLUNAR * 25; // ~16u
  // LUNAR_PHASE_TYPES + EARTH_PHASE_TYPES now live in
  // $lib/orbital/cislunar-camera-target alongside the dispatcher
  // they gate; exported there so any other consumer can use the
  // same source of truth.
  let autoZoomTargetR = WIDE_DISTANCE;
  const autoZoomTargetCenter = new THREE.Vector3(0, 0, 0);
  let lastAutoZoomPhase: string | null = null;
  let autoZoomActive = false;
  // Follow-up 4 — full over-the-shoulder hero composition for
  // cislunar LOI / TEI / descent_start / ascent events. Only set
  // while a hero event is active; cleared otherwise so the camera
  // returns to user-controlled (or default) spherical coords.
  let autoZoomTargetCamP: number | null = null;
  let autoZoomTargetCamT: number | null = null;

  function updateAutoZoomTargets(): void {
    const cislunarTrajectory = deps.getCislunarTrajectory();
    if (!cislunarTrajectory || cislunarTrajectory.phases.length === 0) {
      if (lastAutoZoomPhase !== null) {
        autoZoomTargetR = WIDE_DISTANCE;
        autoZoomTargetCenter.set(0, 0, 0);
        autoZoomActive = true;
        lastAutoZoomPhase = null;
      }
      return;
    }
    const metDays = deps.getSimDay() - deps.getArcTimeline().dep_day;
    const phaseHit = findActiveCislunarPhase(cislunarTrajectory.phases, metDays);
    // phases.length > 0 above so this can't be null in practice.
    if (!phaseHit) return;
    const { activePhase, phaseProgress } = phaseHit;
    // Compute spacecraft position in ECI km along the active phase
    // so a flyby coast (tli/tei) that swings past the Moon can still
    // trigger the lunar closeup — Artemis II is the canonical case:
    // its hybrid free-return has NO lunar_orbit / lunar_flyby phase
    // (the apogee of tli_coast IS periselene), so phase-type matching
    // alone never zoomed. Distance-to-Moon is the universal signal.
    const moonPos = moonEciPos(deps.getSimDay());
    const moonInScene = {
      x: moonPos.x * SCALE_CISLUNAR,
      z: moonPos.z * SCALE_CISLUNAR,
    };
    const sample = sampleCislunarSpacecraftPos(activePhase, phaseProgress, {
      moonPos: { x: moonPos.x, y: moonPos.y, z: moonPos.z },
      moonRefPos: moonEciPos(deps.getArcTimeline().flyby_day),
    });
    if (!sample) return;
    const { x: scX, y: scY, z: scZ } = sample;
    const distToMoonKm = Math.hypot(scX - moonPos.x, scY - moonPos.y, scZ - moonPos.z);
    // Earth SoI is ~924 000 km; Moon SoI ~66 100 km. Trigger lunar
    // closeup well outside Moon SoI so the zoom is underway by the
    // time the spacecraft actually crosses into Moon-dominated space.
    const MOON_PROXIMITY_KM = 80_000;
    const isNearMoon = distToMoonKm < MOON_PROXIMITY_KM;

    // Cislunar hero-shot check (Phase D — Moon-deps.getMission() counterpart
    // to the helio iconic-shot composition). When sim is inside the
    // approach/depart window of an LOI / TEI / descent_start / ascent
    // event, override the auto-zoom target to the Moon centre at the
    // hero-tight distance — the Moon dominates the frame the way
    // PLANET_COMPOSITION.saturn dominates Cassini's Saturn-OI shot.
    // The cislunar camR/camT/camP architecture uses spherical
    // coordinates (target + radius + azimuth/pitch). Follow-up 4
    // promotes this from radius-only override to the full
    // over-the-shoulder composition via planCislunarHeroShot:
    // camP + camT are biased toward the ECI-derived hero geometry
    // so the camera actually sits 85° off the ship's approach axis
    // (the Cassini-art composition) instead of wherever the user
    // last dragged it.
    const heroActive = findActiveCislunarHero(
      deps.getMission().flight?.events ?? [],
      deps.getSimDay(),
      deps.getArcTimeline().dep_day,
    );
    if (heroActive) {
      const heroSub = `hero_${heroActive.type}_${heroActive.met}`;
      if (heroSub !== lastAutoZoomPhase) {
        lastAutoZoomPhase = heroSub;
        autoZoomActive = true;
      }
      autoZoomTargetR = R_MOON_KM * MOON_COMPOSITION.camRMultiplier * SCALE_CISLUNAR;
      autoZoomTargetCenter.set(moonInScene.x, 0, moonInScene.z);
      // Plan the iconic camera pose around the Moon at the hero
      // moment. shipPosAtMet samples the cislunar trajectory at an
      // arbitrary MET — the planner uses two samples (peak − leadDays
      // and peak − leadDays − 0.05 d) to resolve the ship's approach
      // direction, then composes camera at 85° off-axis. Returns
      // ECI km positions, so we scale into scene units and convert
      // (cameraPos − cameraTarget) to the spherical (R, P, T)
      // coords the lerp loop already operates on.
      const moonRefForHero = moonEciPos(deps.getArcTimeline().flyby_day);
      const shipPosAtMet = (met: number) => {
        const phaseHit = findActiveCislunarPhase(cislunarTrajectory!.phases, met);
        if (!phaseHit) return null;
        const moonAtMet = moonEciPos(deps.getArcTimeline().dep_day + met);
        return sampleCislunarSpacecraftPos(phaseHit.activePhase, phaseHit.phaseProgress, {
          moonPos: moonAtMet,
          moonRefPos: moonRefForHero,
        });
      };
      // moonPos for the plan uses LIVE Moon position (not Moon-at-
      // iconic-MET) so the camera target tracks the moon as deps.getSimDay()
      // drifts inside the hero window. Otherwise camera would point
      // at where the Moon WAS at iconicMet while the cislunarMoon
      // mesh is at moonEciPos(deps.getSimDay()) — a visible offset that left
      // the moon out-of-frame for missions where the user lands a
      // fraction of a day past iconicMet (Apollo 17 LOI at MET 3.4,
      // user at MET 3.5 → 0.88-scene-unit offset → empty frame).
      const moonPosForHero = moonEciPos(deps.getSimDay());
      const plan = planCislunarHeroShot({
        eventType: heroActive.type,
        moonPos: { x: moonPosForHero.x, y: moonPosForHero.y, z: moonPosForHero.z },
        shipPosAtMet,
        peakMet: heroActive.met,
      });
      if (plan) {
        // Scene-space offset from camera target → camera position.
        const dxScene = (plan.cameraPos.x - plan.cameraTarget.x) * SCALE_CISLUNAR;
        const dyScene = (plan.cameraPos.y - plan.cameraTarget.y) * SCALE_CISLUNAR;
        const dzScene = (plan.cameraPos.z - plan.cameraTarget.z) * SCALE_CISLUNAR;
        const rScene = Math.hypot(dxScene, dyScene, dzScene);
        if (rScene > 1e-6) {
          // camera pos = target + R·(sinP·sinT, cosP, sinP·cosT)
          //   ⇒ P = acos(dy/R), T = atan2(dx, dz)
          // clamp P into the same drag-input bounds as the live
          // viewer (0.08 .. π·0.48) so the lerp ends inside the
          // user-reachable range.
          autoZoomTargetCamP = Math.max(
            0.08,
            Math.min(Math.PI * 0.48, Math.acos(dyScene / rScene)),
          );
          autoZoomTargetCamT = Math.atan2(dxScene, dzScene);
          // Override the radius + centre with the planner's exact
          // values too — the planner's camRMultiplier is the same
          // 4.0 used above, but the centre lerps toward the ship
          // when composition.targetBias > 0 (currently 0, so this
          // matches moonInScene exactly — kept for future tuning).
          autoZoomTargetR = rScene;
          autoZoomTargetCenter.set(
            plan.cameraTarget.x * SCALE_CISLUNAR,
            0,
            plan.cameraTarget.z * SCALE_CISLUNAR,
          );
        }
      }
      return;
    }
    // Non-hero phase — release any prior P/T bias so user drag /
    // default coords govern again.
    autoZoomTargetCamP = null;
    autoZoomTargetCamT = null;

    // Camera target dispatch lives in $lib/orbital/cislunar-camera-target.
    // Sub-phase string carries the '_near_moon' suffix so the phase-
    // changed detector re-arms the lerp on proximity crossings.
    const camTarget_ = computeCislunarCameraTarget({
      phase: activePhase,
      phaseProgress,
      isNearMoon,
      moonInScene,
      wideDistance: WIDE_DISTANCE,
      lunarCloseupDistance: LUNAR_CLOSEUP_DISTANCE,
      earthCloseupDistance: EARTH_CLOSEUP_DISTANCE,
    });
    if (camTarget_.subPhase !== lastAutoZoomPhase) {
      lastAutoZoomPhase = camTarget_.subPhase;
      autoZoomActive = true;
    }
    autoZoomTargetR = camTarget_.targetR;
    autoZoomTargetCenter.set(camTarget_.centerX, 0, camTarget_.centerZ);
  }

  const updateCislunarCam = () => {
    updateAutoZoomTargets();
    // Lerp toward target distance + centre only while autoZoomActive
    // (set on phase transitions, cleared by mouse-wheel). Slowed to
    // 0.022 ≈ 2.3 s @60 fps for a steady-cam feel — the previous
    // 0.04/1.25 s read as a jerk during quick phase transitions.
    if (autoZoomActive) {
      const LERP = 0.022;
      cislunarCamR += (autoZoomTargetR - cislunarCamR) * LERP;
      cislunarCamTarget.x += (autoZoomTargetCenter.x - cislunarCamTarget.x) * LERP;
      cislunarCamTarget.z += (autoZoomTargetCenter.z - cislunarCamTarget.z) * LERP;
      // Follow-up 4 — lerp pitch + azimuth toward the planCislunar
      // HeroShot pose when a hero event is active. autoZoomTargetCamT
      // is an absolute angle; shortest-arc lerp via the (Δ + π) mod
      // 2π − π trick keeps the swing from going the long way around
      // when the user has dragged camT to e.g. 5.9 rad and the hero
      // target is 0.2 rad.
      if (autoZoomTargetCamP !== null && autoZoomTargetCamT !== null) {
        cislunarCamP += (autoZoomTargetCamP - cislunarCamP) * LERP;
        const dT = ((autoZoomTargetCamT - cislunarCamT + Math.PI) % (Math.PI * 2)) - Math.PI;
        cislunarCamT += dT * LERP;
      }
      if (Math.abs(cislunarCamR - autoZoomTargetR) < 0.05) autoZoomActive = false;
    } else {
      // Centre tracking when zoom is idle — slower than transition
      // so the camera drifts gently with the Moon during long lunar
      // phases or with the spacecraft during coasts.
      const TRACK = 0.015;
      cislunarCamTarget.x += (autoZoomTargetCenter.x - cislunarCamTarget.x) * TRACK;
      cislunarCamTarget.z += (autoZoomTargetCenter.z - cislunarCamTarget.z) * TRACK;
    }
    cislunarCamera.position.set(
      cislunarCamTarget.x + cislunarCamR * Math.sin(cislunarCamP) * Math.sin(cislunarCamT),
      cislunarCamTarget.y + cislunarCamR * Math.cos(cislunarCamP),
      cislunarCamTarget.z + cislunarCamR * Math.sin(cislunarCamP) * Math.cos(cislunarCamT),
    );
    cislunarCamera.lookAt(cislunarCamTarget);
    // ADR-073 Layer B — distance to each body in km, fed to the
    // cislunar scene's lazy 4K swap. Earth sits at scene origin;
    // Moon position is in scene units, scale back to km via the
    // inverse of SCALE_CISLUNAR.
    const earthDistKm = cislunarCamera.position.length() / SCALE_CISLUNAR;
    const moonDistKm = cislunarCamera.position.distanceTo(cislunarMoon.position) / SCALE_CISLUNAR;
    cislunarHandles.updateTextureLod({ earth: earthDistKm, moon: moonDistKm });
    // Spacecraft sprite stays a constant on-screen angular size by
    // scaling inversely with camera distance. At wide (camR=WIDE)
    // scale=1; closer→smaller world-units sprite → same screen size.
    const spriteScale = Math.max(0.08, cislunarCamR / WIDE_DISTANCE);
    cislunarSpacecraft.scale.set(spriteScale, spriteScale, 1);
  };
  updateCam();
  updateCislunarCam();

  // Expose a camera-reset callback so applyMissionAsLoaded /
  // applyPlanSelection can frame each new deps.getMission() afresh. camR is
  // computed per-destination so the destination's orbit ring fills
  // a comfortable fraction of the view: ~180u for Mars, ~830u for
  // Saturn, 220u for Moon-mode. (camP, camT) restore to a consistent
  // wide overhead frame regardless of how the user had panned the
  // last deps.getMission().
  const helioResetCamera = () => {
    camR = cameraDistanceFor(deps.getActiveDestination(), deps.getIsMoonMission());
    camP = 1.05;
    camT = 0.6;
    // Start Moon missions framed on Earth so the first phase (parking
    // or spiral_earth) is visible immediately. Otherwise the auto-zoom
    // has to traverse from wide to Earth close-up in the ~1 s parking
    // window — too short to feel deliberate. Now the camera starts
    // already at Earth, then zooms OUT as tli_coast begins.
    cislunarCamR = EARTH_CLOSEUP_DISTANCE;
    cislunarCamP = 1.05;
    cislunarCamT = 0.6;
    cislunarCamTarget.set(0, 0, 0);
    // Fresh deps.getMission() → re-arm auto-zoom from the first phase.
    lastAutoZoomPhase = null;
    autoZoomActive = true;
    // Heliocentric: re-arm sub-phase tracking. Open framed CLOSE on
    // Earth at the same zoom level the camera will reach when it
    // arrives at the destination — symmetric "depart / arrive"
    // composition. From there the slow cruise LERP pulls back to
    // the wide Sun-centred framing as the deps.getMission() begins.
    lastHelioSubPhase = null;
    if (!deps.getIsMoonMission()) {
      const ePos = earthPos(deps.getSimDay());
      camTarget.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      camR = HELIO_EARTH_CLOSEUP_R;
      helioAutoZoomActive = true;
    }
    updateCam();
    updateCislunarCam();
  };

  // Pan the active camera's target by the screen-space delta. Uses
  // the camera's basis so the pan direction stays correct under any
  // orbit angle. Scale = world-units-per-screen-pixel at the current
  // distance + FOV so 1 px of drag moves ~1 px of world.
  const panActiveCamera = (dx: number, dy: number): void => {
    const cam = deps.getViewMode() === 'cislunar' ? cislunarCamera : camera;
    const tgt = deps.getViewMode() === 'cislunar' ? cislunarCamTarget : camTarget;
    const r = deps.getViewMode() === 'cislunar' ? cislunarCamR : camR;
    const right = new THREE.Vector3();
    const upVec = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    cam.matrixWorld.extractBasis(right, upVec, fwd);
    const fovRad = (cam.fov * Math.PI) / 180;
    const viewHeight = 2 * r * Math.tan(fovRad / 2);
    const scale = viewHeight / Math.max(1, window.innerHeight);
    tgt.addScaledVector(right, -dx * scale);
    tgt.addScaledVector(upVec, dy * scale);
    if (deps.getViewMode() === 'cislunar') {
      autoZoomActive = false;
      updateCislunarCam();
    } else {
      helioAutoZoomActive = false;
      updateCam();
    }
  };

  return {
    updateCam,
    updateCislunarCam,
    helioResetCamera,
    panActiveCamera,
    get camR() {
      return camR;
    },
    set camR(v: number) {
      camR = v;
    },
    get camP() {
      return camP;
    },
    set camP(v: number) {
      camP = v;
    },
    get camT() {
      return camT;
    },
    set camT(v: number) {
      camT = v;
    },
    get camTarget() {
      return camTarget;
    },
    get cislunarCamR() {
      return cislunarCamR;
    },
    set cislunarCamR(v: number) {
      cislunarCamR = v;
    },
    get cislunarCamP() {
      return cislunarCamP;
    },
    set cislunarCamP(v: number) {
      cislunarCamP = v;
    },
    get cislunarCamT() {
      return cislunarCamT;
    },
    set cislunarCamT(v: number) {
      cislunarCamT = v;
    },
    get lastHelioSubPhase() {
      return lastHelioSubPhase;
    },
    get helioFlybyDesiredCamT() {
      return helioFlybyDesiredCamT;
    },
    get montageShotFrame() {
      return montageShotFrame;
    },
    get montageShotKind() {
      return montageShotKind;
    },
    get cislunarCamTarget() {
      return cislunarCamTarget;
    },
    get montageEnabled() {
      return montageEnabled;
    },
    get helioAutoZoomActive() {
      return helioAutoZoomActive;
    },
    set helioAutoZoomActive(v: boolean) {
      helioAutoZoomActive = v;
    },
    get helioAutoZoomTargetR() {
      return helioAutoZoomTargetR;
    },
    set helioAutoZoomTargetR(v: number) {
      helioAutoZoomTargetR = v;
    },
    get autoZoomActive() {
      return autoZoomActive;
    },
    set autoZoomActive(v: boolean) {
      autoZoomActive = v;
    },
    get autoZoomTargetR() {
      return autoZoomTargetR;
    },
    get lastAutoZoomPhase() {
      return lastAutoZoomPhase;
    },
    // Readonly camera-composition constants the frame reads for the cinematic
    // pitch/zoom lerps.
    HELIO_CRUISE_P,
    HELIO_APPROACH_P,
    WIDE_DISTANCE,
  };
}
