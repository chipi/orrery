<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { agencyToLogoEntries } from '$lib/agency-logo';
  import type { FleetIndexEntry } from '$types/fleet';
  import * as THREE from 'three';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  import {
    earthPos,
    marsPos,
    destinationPos,
    spacecraftPos,
    spacecraftHeading,
    type MissionTimeline,
    type Vec2,
  } from '$lib/orbital/mission-arc';
  import { MOON_FLY_RADIUS_AU, moonHelioPos, buildArcs } from '$lib/fly-moon-arc';
  import { defaultEventLabel } from '$lib/fly-event-labels';
  import {
    SCALE_3D,
    GRAVITY_ASSIST_CAVEAT_DESTINATIONS,
    DESTINATION_LABEL_COLORS,
    cameraDistanceFor,
  } from '$lib/fly-scene-constants';
  import { classifyConicEarth } from '$lib/fly-conics-earth';
  import { buildCislunarScene } from '$lib/three/fly-cislunar-scene';
  import { buildHelioScene } from '$lib/three/fly-helio-scene';
  import {
    resolveQualitySync,
    kickOffBackgroundDetect,
    writeUserChoice,
    type QualityTier,
  } from '$lib/quality/quality-tier';
  import {
    attachFrameMonitor,
    nextLowerTier,
    type FrameMonitorHandle,
  } from '$lib/quality/frame-monitor';
  import type { FlyUpdaters } from '$lib/three/fly-updaters';
  import {
    computeMissionApply,
    computeScenarioApply,
    computePlanApply,
    type LoadedMission,
    type MissionApplyDefaults,
    type TrajectoryOverride,
  } from '$lib/fly-mission-apply';
  import {
    CINEMATIC_TIMINGS,
    createCinematicBeatState,
    resetCinematicBeatState,
    parseFlybyMetFromSubPhase,
    computeAfterglowCameraFrame,
    isPeakHolding,
    isAfterglowing,
    isCruiseHolding,
    isFinaleLocked,
  } from '$lib/fly-cinematic-beats';
  import { runCinematicFrame } from '$lib/fly-cinematic-frame';
  import type { TrajectoryWaypoint } from '$lib/trajectory-spline';
  import {
    DESTINATIONS,
    R_EARTH_AU,
    R_MARS_AU,
    type DestinationId,
  } from '$lib/lambert-grid.constants';
  import {
    getMission,
    getMissionIndex,
    getScenario,
    getMissionGallery,
    getFleet,
    getFleetIndex,
    getFleetGallery,
  } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { missionDestToDataFolder } from '$lib/mission-dest';
  import {
    auToMkm,
    distanceBetween,
    heliocentricSpeed as flyHeliocentricSpeed,
    signalDelayMin as flySignalDelayMin,
  } from '$lib/orbital/fly-physics';
  import {
    A_MOON_KM,
    R_EARTH_KM,
    R_MOON_KM,
    moonEciPos,
    type CislunarTrajectory,
    type Vec3Km,
  } from '$lib/orbital/cislunar/cislunar-geometry';
  import {
    phaseMarkerKmPositions,
    currentPhaseFor,
    primaryScienceRefFor,
    type PhaseMarker,
    type ScienceRef,
  } from '$lib/orbital/cislunar/cislunar-events';
  import {
    eciKmToScreenPx,
    eciKmToCanvas2dPx,
    helioAuToScreenPx,
    helioAuToCanvas2dPx,
    type ScreenPoint,
    type MinimalProjector,
  } from '$lib/orbital/cislunar/cislunar-screen-projection';
  import { type InterplanetaryTrajectory } from '$lib/interplanetary-geometry';
  import {
    phaseMarkerAuPositions,
    currentInterplanetaryPhaseFor,
    primaryInterplanetaryPhaseScienceRef,
    type InterplanetaryPhaseMarker,
  } from '$lib/interplanetary-events';
  import { markerStateFor, type RevealResult } from '$lib/orbital/cislunar/cislunar-marker-reveal';
  import PhaseMarkerLabel from '$lib/components/PhaseMarkerLabel.svelte';
  import FdPhaseMarkerLabel from '$lib/components/FdPhaseMarkerLabel.svelte';
  import FlybyDebugViewer from '$lib/components/FlybyDebugViewer.svelte';
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
  import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import { resolveQualitySource } from '$lib/quality/quality-tier';
  import type { QualityConfig } from '$lib/quality/quality-tier';
  import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import type { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
  import type { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
  import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import {
    PLANET_COMPOSITION as FLYBY_PLANET_COMPOSITION,
    type PlanetId as FlybyPlanetId,
  } from '$lib/orbital/flyby-camera-plan';
  import { biasJumpToIconicMoment } from '$lib/orbital/jump-to-met-bias';
  import {
    findFlybyPlanetFromLabel,
    findClosestPlanetToShip,
    PLANET_SIZES,
  } from '$lib/orbital/find-flyby-planet';
  import { computeIconicFrame } from '$lib/orbital/iconic-frame';
  import { predictShipPosAtMet } from '$lib/orbital/predict-ship-pos';
  import { findApsidesIndices } from '$lib/orbital/find-apsides';
  import { findActiveFlybyMet } from '$lib/orbital/find-active-flyby';
  import { buildFlyDebugSnapshot } from '$lib/orbital/fly-debug-snapshot';
  import { buildFlyDebugFrameSnapshot } from '$lib/orbital/fly-debug-frame';
  import { findActiveCislunarPhase } from '$lib/orbital/find-active-cislunar-phase';
  import { sampleCislunarSpacecraftPos } from '$lib/orbital/sample-cislunar-spacecraft';
  import { computeCislunarCameraTarget } from '$lib/orbital/cislunar-camera-target';
  import {
    findActiveCislunarHero,
    MOON_COMPOSITION,
    planCislunarHeroShot,
    CISLUNAR_HERO_LEAD_DAYS,
  } from '$lib/orbital/cislunar/cislunar-hero-shot';
  import { computeHelioNonFlybyFrame } from '$lib/orbital/helio-non-flyby-frame';
  import { detectSubPhaseTransition } from '$lib/orbital/sub-phase-transition';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { AU_TO_KM, MOON_VISUAL_DISTANCE } from '$lib/fly-physics-constants';
  import { onReducedMotionChange, prefersReducedMotion } from '$lib/reduced-motion';
  import type { FlightTimelineEvent, Mission, MissionEvent } from '$types/mission';
  import type { LocalizedScenario } from '$types/scenario';
  import * as m from '$lib/paraglide/messages';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import PhasePanel from '$lib/components/PhasePanel.svelte';
  import FlightDirectorBanner from '$lib/components/FlightDirectorBanner.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import SpacecraftInfoCard from '$lib/components/SpacecraftInfoCard.svelte';
  import {
    buildSoIRing,
    buildGravityArrow,
    soiRadiusInScene,
    gravityAccel,
    logScaleLength,
    BODY_MASS_KG,
    buildCoastLine,
    classifyConic,
  } from '$lib/orbit-overlays';
  import ConicSectionPanel from '$lib/components/ConicSectionPanel.svelte';
  import { isLayerOn, onLayerChange } from '$lib/science-layers';
  import { isScienceLensOn, onScienceLensChange } from '$lib/science-lens';
  import { track, trackMissionComplete } from '$lib/analytics';

  // ─── Default scenario (ORRERY-1 free-return per ADR-009) ─────────
  // Static-imported so the Three.js scene can initialise synchronously
  // at onMount. The runtime fetch via `getScenario()` happens too,
  // pulling in the editorial overlay for whichever locale the user
  // has — when other locales ship, the overlay swap is a one-line
  // change without restructuring the scene.
  import defaultScenarioBase from '$data/scenarios/orrery-1.json';
  import defaultScenarioOverlay from '$data/i18n/en-US/scenarios/orrery-1.json';

  const DEFAULT_SCENARIO_ID = 'orrery-1';
  // Whitelist of synthesised teaching scenarios (live in
  // static/data/scenarios/). Used to gate the getScenario() probe
  // when ?mission=id is supplied so we don't 404 on every real
  // mission ID — most ?mission= values are historical missions, not
  // scenarios, and the server log was full of dev-time 404 noise.
  const KNOWN_SCENARIO_IDS = new Set<string>([DEFAULT_SCENARIO_ID]);

  // LoadedMission: exported from $lib/fly-mission-apply (W9 wave 5).

  // Bootstrapped from the static import; replaced by getScenario() in
  // onMount once the locale-overlay-aware fetch resolves.
  function scenarioToLoaded(
    s: typeof defaultScenarioBase,
    o: typeof defaultScenarioOverlay,
  ): LoadedMission {
    return {
      name: o.name,
      vehicle: s.vehicle,
      payload: s.payload,
      dv_total: s.dv_total_km_s,
      dv_used: s.dv_used_km_s,
      dep_label: o.dep_label,
      arr_label: o.arr_label,
      timeline: { dep_day: s.dep_day, flyby_day: s.flyby_day, arr_day: s.arr_day },
      isFromData: true,
    };
  }

  let mission: LoadedMission = $state(
    scenarioToLoaded(defaultScenarioBase, defaultScenarioOverlay),
  );
  let missionEvents: MissionEvent[] = $state(defaultScenarioOverlay.events as MissionEvent[]);

  // ─── Rendering debug bridge (#334) ───────────────────────────────
  // Exposed so <RenderingDebugRegistrar> in the template can register
  // the live renderer + quality with the DebugPanel context. Filled
  // from inside onMount after the helio scene builds the renderer;
  // null before then (registrar guarded by `{#if}` in the template).
  let liveRenderer: THREE.WebGLRenderer | null = $state(null);
  let liveQuality: QualityConfig | null = $state(null);
  let liveQualitySource: QualitySource = $state('fallback');
  let liveBloomPass: UnrealBloomPass | null = $state(null);
  let liveBokehPass: BokehPass | null = $state(null);
  let liveFilmPass: FilmPass | null = $state(null);
  let liveVignettePass: ShaderPass | null = $state(null);
  let liveSkydomeMesh: THREE.Object3D | null = $state(null);
  let liveSunLensFlareGroup: THREE.Object3D | null = $state(null);
  let liveFrameMonitor: FrameMonitorHandle | null = $state(null);

  // ─── HUD-collapse toggle (mobile) ────────────────────────────────
  // Phase 25 (#342) — "throne of glory" default. On touch devices the
  // cinematic moment lands chrome-free: hud-stack, capcom-panel,
  // fly-toggle-rows (gold + right clusters), and fly-bottom-strips
  // all collapse under one toggle so the YouTube/Wired-grade animation
  // breathes. Tap the floating ◐ top-left to expand. Desktop / mouse
  // devices default to chrome-visible as before (no behavioural change).
  let hudHidden = $state(false);
  function toggleHud() {
    hudHidden = !hudHidden;
  }
  // Default-collapse on touch-only devices. Uses `(hover: none)` rather
  // than viewport width: touchscreens with mice (Surface laptops, iPad
  // with trackpad) keep the desktop default. Runs once at script-init
  // (svelte 5 module-scope: it fires on mount before first render).
  if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) {
    hudHidden = true;
  }

  // Settings panel — wave 2/3 punch #3. Gear button top-right opens a
  // The user-facing settings modal (button + radio panel) moved to
  // $lib/components/QualitySettingsModal.svelte in #339 so /explore,
  // /iss, /tiangong can share the same UI. We still hold the active
  // tier here because the perf-toast (below) shows the "drop to <tier>"
  // suggestion which needs the resolved tier label.
  let activeQualityTier = $state<QualityTier>('medium');

  // Runtime adaptive — wave 2/3 punch #4. The frame monitor reports a
  // sustained-over-budget rolling average; when it fires, we surface a
  // non-blocking toast suggesting the next-lower tier rather than
  // silently demoting mid-cinematic. User decides whether to flip.
  let perfToastVisible = $state(false);
  let perfToastAvgMs = $state(0);
  let perfToastSuggestedTier = $state<QualityTier | null>(null);
  function applyPerfSuggestion() {
    if (!perfToastSuggestedTier) return;
    writeUserChoice(perfToastSuggestedTier);
    if (typeof window !== 'undefined') window.location.reload();
  }
  function dismissPerfToast() {
    perfToastVisible = false;
  }

  // ─── Arc geometries — recomputed per loaded mission ──────────────
  // Each mission gets its own outbound arc anchored to *its* actual
  // launch window (Earth/Mars phases at the mission's departure date).
  // Free-return scenarios additionally render a long-CCW return arc;
  // historical Mars-bound missions land there and don't return, so
  // their retPts is empty (no return arc rendered).
  //
  // The arc + Moon-mode heliocentric math lives in $lib/fly-moon-arc
  // (W9 wave 1 / #279) — pure functions, unit-tested. This component
  // owns only the reactive state + Three.js side effects.

  // Initial timeline + arc come from the default ORRERY DEMO scenario
  // (which is a free-return). Mutated by applyMissionAsLoaded /
  // applyScenarioAsLoaded as the user navigates.
  // The initial-arc computation deliberately reads the static-imported
  // scenario values rather than the reactive `arcTimeline` state to
  // avoid Svelte's "state referenced in its own scope" warning.
  const INITIAL_TIMELINE: MissionTimeline = {
    dep_day: defaultScenarioBase.dep_day,
    flyby_day: defaultScenarioBase.flyby_day,
    arr_day: defaultScenarioBase.arr_day,
  };
  const INITIAL_ARCS = buildArcs(INITIAL_TIMELINE, true);
  let arcTimeline: MissionTimeline = $state({ ...INITIAL_TIMELINE });
  let isFreeReturn = $state(true);
  let activeDestination = $state<DestinationId>('mars');
  // Follow-up: secondary-flyby destinationMesh swap. Some missions
  // (NH past Pluto → Arrokoth) fly past a body that ISN'T one of the
  // 8 always-rendered context planets AND ISN'T the mission's primary
  // destination — so neither the context system nor the
  // destinationMesh holds geometry for it. Track which body we've
  // currently swapped the destinationMesh to so we can swap back when
  // the flyby window closes. Null = mesh matches activeDestination.
  let currentDestMeshId: DestinationId = 'mars';
  let isMoonMission = $state(false);

  /** Human-readable orbit/trajectory regime for the identity HUD. The
   *  five buckets cover every mission /fly renders today:
   *    - Cislunar free-return: Moon mission with retArc (Apollo 13 / ORRERY-1)
   *    - Cislunar transfer:    Moon mission, one-way (most Apollo / Chang'e)
   *    - Heliocentric flyby:   gas/ice giants + Pluto (direct Hohmann to a
   *                            FLYBY-only destination per ADR-028)
   *    - Heliocentric free-return: free-return loop around an inner-system body
   *    - Heliocentric Hohmann: any other one-way interplanetary transfer
   *  Kept derived here (not in the mission JSON) so legacy mission files
   *  don't need a backfill; the derivation reads the already-classified
   *  isMoonMission + isFreeReturn + activeDestination states. */
  const HELIO_FLYBY_DESTINATIONS = new Set<DestinationId>([
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]);
  let trajectoryTypeLabel = $derived(
    isMoonMission
      ? isFreeReturn
        ? m.fly_traj_type_cislunar_free_return()
        : m.fly_traj_type_cislunar()
      : HELIO_FLYBY_DESTINATIONS.has(activeDestination)
        ? m.fly_traj_type_helio_flyby()
        : isFreeReturn
          ? m.fly_traj_type_helio_free_return()
          : m.fly_traj_type_helio_hohmann(),
  );
  let outPts: Vec2[] = $state(INITIAL_ARCS.out);
  let retPts: Vec2[] = $state(INITIAL_ARCS.ret);

  // Earth-Moon scene constants for Moon-mode rendering. The Moon
  // orbits Earth at ~384,000 km (0.0026 AU). At the heliocentric
  // SCALE_3D = 80, that's 0.21 scene units — too small to see
  // alongside Earth's 2.6-unit mesh. So Moon-mode uses a separate,
  // exaggerated Earth-Moon scale where Earth sits at the origin and
  // the Moon at MOON_VISUAL_DISTANCE units away. Educational
  // compromise: distances aren't to-scale, but the spacecraft path
  // and timing relative to the Moon's orbital motion are accurate.
  // Constants live in $lib/fly-physics-constants (v0.2.0 / ADR-030).

  // ─── State ───────────────────────────────────────────────────────
  let view: '3d' | '2d' = $state('3d');
  // Per-panel visibility toggles — let the user dismiss any of the
  // surrounding HUD elements to see more of the scene. All default ON.
  // Split into two clusters in the markup:
  //  - Right cluster (always visible, blue theme): HUD, CAP, 2D.
  //  - Left cluster (lens-gated, gold theme): FD, LYR, CON. These
  //    three only have an effect when the Science Lens is on, so the
  //    cluster also only appears when the lens is on — keeps the chrome
  //    minimal for casual users.
  let showHud = $state(true);
  let showCapcom = $state(true);
  /** Wall-clock ms timestamp until which the sim holds at MET 0 after a
   *  mission load. Lets the camera lerp from its previous framing to the
   *  prelaunch composition before the clock starts. 0 = no hold. */
  let launchDwellUntil = 0;
  let showFlightDirector = $state(true);
  let showLayersPanel = $state(true);
  let showConicPanel = $state(true);
  let lensOnState = $state(isScienceLensOn());
  let conicsLayerOnState = $state(isLayerOn('conics'));
  $effect(() => {
    // svelte-check flow-analysis misses the template reads at the
    // `{#if lensOnState}` / CON-button gate sites; nudge it with
    // explicit reads.
    void lensOnState;
    void conicsLayerOnState;
    const stopLens = onScienceLensChange((on) => {
      lensOnState = on;
    });
    const stopConics = onLayerChange('conics', (on) => {
      conicsLayerOnState = on;
    });
    return () => {
      stopLens?.();
      stopConics?.();
    };
  });
  // Cislunar view mode (ADR-058). Derived from mission destination —
  // Moon missions render in the Earth-centred cislunar scene, all
  // others render heliocentrically. The user-facing Cislunar/Solar
  // toggle was dropped during smoke testing: at solar zoom the
  // cislunar trip is sub-pixel, so a "Solar" view of a Moon mission
  // was either misleading or a fuzzy duplicate of the cislunar view.
  const viewMode = $derived<'heliocentric' | 'cislunar'>(
    isMoonMission ? 'cislunar' : 'heliocentric',
  );
  let cislunarTrajectory: CislunarTrajectory | null = $state(null);
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let simDay = $state(INITIAL_TIMELINE.dep_day);

  // GH #107 — cislunar phase markers. PhaseMarker descriptors (event
  // + ECI km position + science ref) are derived from the trajectory
  // and mission events; the per-frame render path projects each one
  // to screen pixels via the projection helpers and writes the result
  // here. $state.raw because we re-assign the whole array each frame
  // (deep reactivity would over-trigger).
  interface PhaseMarkerRenderState {
    event: PhaseMarker['event'];
    scienceRef: ScienceRef | null;
    screen: ScreenPoint;
    reveal: RevealResult;
    eventLabel: string;
  }
  let phaseMarkers: PhaseMarker[] = $derived.by(() =>
    isMoonMission ? phaseMarkerKmPositions(mission.flight?.events, cislunarTrajectory) : [],
  );
  // GH #107 Step 6e — Mars + outer-system phase markers (heliocentric).
  // interplanetaryTrajectory is built in the mission loader; markers
  // derive from flight.events + the heliocentric trajectory, mirroring
  // the cislunar pipeline.
  let interplanetaryTrajectory: InterplanetaryTrajectory | null = $state(null);
  let interplanetaryPhaseMarkers: InterplanetaryPhaseMarker[] = $derived.by(() => {
    if (isMoonMission) return [];
    const events = mission.flight?.events;
    if (!events || events.length === 0) return [];
    // Spline path: when /fly has built outPts from the labeled
    // trajectory.json waypoints, every milestone sits at a specific
    // index along that spline (t = met_days / transit_days). Lerping
    // outPts gives the diamond the EXACT position the spacecraft will
    // pass through, so diamond + ship + planet mesh coincide at the
    // flyby moment. Falls back to the raw interplanetary trajectory
    // for missions without an outPts spline (Hohmann-only).
    const totalDays = arcTimeline.arr_day - arcTimeline.dep_day;
    if (outPts.length >= 2 && totalDays > 0) {
      const out: InterplanetaryPhaseMarker[] = [];
      for (const e of events) {
        if (typeof e.met_days !== 'number') continue;
        const tRaw = e.met_days / totalDays;
        const t = Math.max(0, Math.min(1, tRaw));
        const last = outPts.length - 1;
        const f = t * last;
        const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
        const frac = f - i;
        const a = outPts[i];
        const b = outPts[i + 1];
        const ay = a.y ?? 0;
        const by = b.y ?? 0;
        out.push({
          event: e,
          posAu: {
            x: a.x + (b.x - a.x) * frac,
            y: ay + (by - ay) * frac,
            z: a.z + (b.z - a.z) * frac,
          },
          scienceRef: null,
        });
      }
      return out;
    }
    return phaseMarkerAuPositions(events, interplanetaryTrajectory);
  });
  /** True when the mission should render phase markers — Moon path
   *  (cislunar) OR Mars/outer-system path (interplanetary). The two
   *  branches are mutually exclusive: a mission is one or the other. */
  const hasPhaseMarkers = $derived(
    phaseMarkers.length > 0 || interplanetaryPhaseMarkers.length > 0,
  );
  let phaseMarkerScreens: PhaseMarkerRenderState[] = $state.raw([]);

  /** FlightDirectorBanner stages — each stage spans an arcProgress range
   *  (startArc → endArc) and renders as a boundary tick on the
   *  trajectory at startArc + a labelled chip at the stage midpoint.
   *  Stage transitions read as "this is where <next-stage> starts /
   *  <prev-stage> ended". `arcThreshold` is the FD reveal threshold,
   *  mirrored from FlightDirectorBanner.svelte — keep the two in sync.
   *  INJECTION's start tick is suppressed because it coincides with the
   *  LAUNCH anchor ring at arc 0; the ARRIVAL anchor ring covers
   *  arc 1.0 the same way. */
  interface FdStage {
    id:
      | 'injection'
      | 'separation'
      | 'cruise'
      | 'approach'
      | 'arrival'
      | 'cruise-return'
      | 'approach-earth'
      | 'arrival-earth';
    /** Which arc the tickArc indexes into — outPts for outbound stages
     *  (INJECTION → ARRIVAL at destination) and retPts for return
     *  stages (CRUISE → ARRIVAL at Earth). Return stages only render
     *  on round-trip missions (retPts.length > 0). */
    leg: 'out' | 'return';
    /** Where the diamond visually anchors on its arc (0–1 along the
     *  arc's outPts or retPts). Sits at stage midpoints rather than
     *  literal transitions so the diamond reads distinctly from the
     *  LAUNCH / ARRIVAL anchor rings. */
    tickArc: number;
    /** Reveal threshold against the LEG-relative progress
     *  (outboundT for `leg: 'out'`, returnT for `leg: 'return'`). */
    arcThreshold: number;
    label: () => string;
  }
  const FD_STAGES: FdStage[] = [
    // Outbound leg — INJECTION sits at LAUNCH (no diamond, the LAUNCH
    // ring is its visual anchor); SEPARATION / CRUISE / APPROACH /
    // ARRIVAL diamonds sit at each stage's START so the diamond
    // appears at the exact point on the arc where the FD banner
    // switches to that phase.
    //
    // CAPCOM cadence (polish-wave-2): the early sequence used to be
    // INJECTION (0-3%) → straight to CRUISE. User feedback: "Launch
    // stays for a while, real flight has separation of spaceship
    // from rocket then some sort of acceleration." Split the early
    // window into 3 beats:
    //   INJECTION (0 - 0.5%): liftoff + trans-X burn
    //   SEPARATION (0.5% - 2.5%): spacecraft separates from upper
    //     stage, deploys solar panels + antennas, first TCM checkout
    //   CRUISE (2.5% - 80%): long coast
    // At sim speed 30 d/s on a Cassini-class 7-year cruise this gives
    // ~12 days of INJECTION (~0.4 s wall-clock) → ~50 days of
    // SEPARATION (~1.7 s wall-clock) → long cruise. Brief but
    // perceptible CAPCOM beats instead of one slow LAUNCH label.
    {
      id: 'injection',
      leg: 'out',
      tickArc: 0.0,
      arcThreshold: 0.0,
      label: () => m.fly_fd_marker_injection(),
    },
    {
      id: 'separation',
      leg: 'out',
      tickArc: 0.005,
      arcThreshold: 0.005,
      label: () => m.fly_fd_marker_separation(),
    },
    {
      id: 'cruise',
      leg: 'out',
      tickArc: 0.025,
      arcThreshold: 0.025,
      label: () => m.fly_fd_marker_cruise(),
    },
    {
      id: 'approach',
      leg: 'out',
      tickArc: 0.8,
      arcThreshold: 0.8,
      label: () => m.fly_fd_marker_approach(),
    },
    {
      id: 'arrival',
      leg: 'out',
      tickArc: 0.95,
      arcThreshold: 0.95,
      label: () => m.fly_fd_marker_arrival(),
    },
    // Return leg — only render on round-trip missions (retPts.length
    // > 0). The cadence mirrors the outbound: CRUISE just past Mars
    // depart, APPROACH closing on Earth, ARRIVAL at the Earth-return
    // ring. Reuses the same i18n keys because the semantic beat is
    // identical.
    {
      id: 'cruise-return',
      leg: 'return',
      tickArc: 0.03,
      arcThreshold: 0.03,
      label: () => m.fly_fd_marker_cruise(),
    },
    {
      id: 'approach-earth',
      leg: 'return',
      tickArc: 0.8,
      arcThreshold: 0.8,
      label: () => m.fly_fd_marker_approach(),
    },
    {
      id: 'arrival-earth',
      leg: 'return',
      tickArc: 0.95,
      arcThreshold: 0.95,
      label: () => m.fly_fd_marker_arrival(),
    },
  ];
  interface FdPhaseMarkerRender {
    id: FdStage['id'];
    label: string;
    tickScreen: ScreenPoint;
    showTick: boolean;
    revealed: boolean;
  }
  let fdPhaseMarkerScreens = $state.raw<FdPhaseMarkerRender[]>([]);

  /** Milestone overlay (#306-companion) — labeled `flight.events[]`
   *  entries surface as teal chips on the trajectory. Distinct from
   *  the gold FD stage markers above: FD stages are the 7-stage
   *  cinematic cadence (INJECTION → CRUISE → APPROACH → ARRIVAL × 2
   *  legs) shared by every mission, milestones are the per-mission
   *  historical narrative beats backfilled from /explore's labeled
   *  trajectory waypoints (Cassini's "Venus #1 — gravity assist",
   *  Voyager 2's "Neptune closest approach", etc.). */
  interface MilestoneRender {
    label: string;
    description?: string;
    met_days: number;
    screen: ScreenPoint;
    /** Legacy flag — true when state === 'active'. Kept so existing
     *  template bindings don't break. */
    active: boolean;
    /** 3-state visibility: 'past' = latest milestone behind us
     *  (compact, dimmed, top-right); 'active' = currently within
     *  ±active window (full card with description, top-centre);
     *  'future' = next milestone ahead (compact, "NEXT" label,
     *  top-left). */
    state: 'past' | 'active' | 'future';
  }
  let milestoneScreens = $state.raw<MilestoneRender[]>([]);

  // defaultEventLabel: extracted to $lib/fly-event-labels (W9 / #279).
  let simSpeed = $state(7); // days/sec
  // ADR-025: reduced-motion users start paused. They can press play
  // to step forward manually. We also subscribe to changes so an
  // OS-level toggle mid-session pauses the sim live (post-v1.0
  // audit — /explore + /moon already did this; /fly was init-only).
  let isPlaying = $state(!prefersReducedMotion());
  // /fly funnel: which loaded mission we've already counted as "arrived",
  // so mission-complete fires once per load. Abandonment = a mission-load
  // with no matching mission-complete. Reset in applyMissionAsLoaded.
  let completedForId: string | null = $state(null);
  // GH #107 — phase marker reveal animation gates on this; pulled
  // out as $state so the marker per-frame projection can pass it in.
  let reducedMotion = $state(prefersReducedMotion());
  const stopReducedMotionWatch = onReducedMotionChange((reduced) => {
    reducedMotion = reduced;
    if (reduced && isPlaying) isPlaying = false;
  });
  let cleanup: (() => void) | undefined;

  // ─── Three.js handles hoisted out of onMount ───────────────────────
  // The outbound + return arcs need to react to outPts/retPts state
  // changes triggered by mission loading. Holding the Mesh refs at
  // component scope lets a $effect rebuild their TubeGeometry without
  // tearing down the whole scene.
  //
  // v0.1.9: switched from THREE.Line (1px on most platforms; barely
  // visible) to THREE.Mesh with TubeGeometry — gives a thick glowing
  // path that reads clearly across viewports. drawRange-based "trim
  // future part" semantics dropped: the full mission path now stays
  // visible so users can see start + end + curve at all times.
  let outLine: THREE.Mesh | undefined;
  let retLine: THREE.Mesh | undefined;
  // v0.6.3 #228 rewrite: each arc is ONE tube with a custom shader
  // that paints bright/dim per fragment based on uProgress. See the
  // long comment block in onMount where the tube is built — the
  // previous four-tube + drawRange + vertex-mutation approach had a
  // root-cause arc-length-vs-uniform-t mismatch with TubeGeometry.
  // rebuildTubeGeometry + apsidesRecompute + resetCamera all migrated
  // to flyUpdaters.helio.* (W9 wave B).
  // Departure + arrival markers — per-mission fixed rings at Earth's
  // position on dep_day and Mars's (or destination's) position on
  // arr_day. Updated whenever a new mission loads so each mission has
  // a visibly distinct anchor pair, not just a different arc curve.
  let depMarker: THREE.Mesh | undefined;
  let arrMarker: THREE.Mesh | undefined;
  let depLabelSprite: THREE.Sprite | undefined;
  let arrLabelSprite: THREE.Sprite | undefined;
  // Round-trip return anchor — third torus + label at retPts[last]
  // (Earth on return-arrival day). Visible only when the loaded
  // mission has a non-empty retPts geometry (round-trip / sample
  // return / free-return). Distinct teal chrome so it doesn't read
  // as a duplicate of the blue LAUNCH ring at Earth-on-dep.
  let retMarker: THREE.Mesh | undefined;
  let retLabelSprite: THREE.Sprite | undefined;
  // Moon's orbit-ring around Earth — visible only during cislunar
  // missions. Hoisted so the marker $effect can re-position it onto
  // Earth and toggle visibility per-mode.
  let moonOrbitRing: THREE.Mesh | undefined;
  // Cislunar scene refs (ADR-058). Populated inside onMount; used by
  // applyMissionAsLoaded to rebuild lines on Moon-mission load, and
  // by the render loop to update spacecraft + Moon position each
  // frame. cislunarSceneRef / cislunarCameraRef will be used by the
  // Stage 1 picture-in-picture inset; kept un-exported for now.
  let cislunarMoonMeshRef: THREE.Mesh | undefined;
  let cislunarMoonFrameGroupRef: THREE.Group | undefined;
  // applyDestinationVisualsRef + the 4 cislunar update refs all
  // migrated onto flyUpdaters.helio / flyUpdaters.cislunar (W9 wave B).
  // Refresh-callback for the LAUNCH / ARRIVAL sprite textures. Assigned
  // in onMount; called from a $effect whenever the mission or its
  // dates change so each mission shows its actual launch/arrival
  // labels — e.g. "LAUNCH · 2011-11-26" and "MARS · 2012-08-06".
  // refreshLabelSprites migrated to flyUpdaters.helio.refreshLabelSprites (W9 wave B).
  /** Aggregate per-frame + per-mission updater handle for both
   *  scenes (W9 wave B / #279). Typed contract lives in
   *  $lib/three/fly-updaters. Populated at the end of onMount once
   *  all the local closures have captured their builder + state
   *  refs. Coexists with the 9 freestanding refs above during the
   *  staged migration; future commits will retire the freestanding
   *  refs as their call sites move onto flyUpdaters.helio / .cislunar. */
  let flyUpdaters: FlyUpdaters | undefined;
  // SCALE_3D, GRAVITY_ASSIST_CAVEAT_DESTINATIONS, DESTINATION_LABEL_COLORS,
  // and cameraDistanceFor live in $lib/fly-scene-constants (W9 / #279).

  let showPlanOuterTrajectoryCaveat = $derived(
    !isMoonMission &&
      mission.name.startsWith('EARTH →') &&
      GRAVITY_ASSIST_CAVEAT_DESTINATIONS.includes(activeDestination),
  );

  // Update the Three.js Tube geometry whenever the arc-point arrays
  // change. The Mesh refs are created in onMount, so this effect is
  // a no-op on first run (outLine/retLine still undefined). Once
  // mounted, every mission load rebuilds the tube along the new
  // CatmullRom curve.
  $effect(() => {
    // Read reactive state FIRST so Svelte 5 registers outPts + retPts
    // as deps even on the bail-out path (refs not yet defined). Without
    // these locals the $effect would never re-run on mission load — its
    // initial run hits the early-return before reading either array,
    // so no deps get tracked, and subsequent retPts mutations are
    // ignored. That left the previous mission's return tube visible
    // (e.g. ORRERY DEMO's purple loop persisting after Curiosity loads).
    const outArc = outPts;
    const retArc = retPts;
    if (!outLine || !retLine || !flyUpdaters) return;
    // Moon-mode tubes get a thinner radius — the cislunar arc spans
    // ~32 scene units (Earth-Moon at exaggerated 0.4 AU, vs ~40 for an
    // Earth→Mars Hohmann), and the camera sits closer (≈100u vs
    // ≈200u). 0.25u keeps the arc legible while restoring the
    // proportional sense of distance between Earth and the Moon —
    // the 0.6u heliocentric radius read as a fat sausage. Same scale
    // factor re-applies to dep / arr markers + label sprites below.
    const outRadius = isMoonMission ? 0.25 : 0.35;
    const retRadius = isMoonMission ? 0.2 : 0.3;
    outLine.geometry.dispose();
    outLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(outArc, outRadius);
    retLine.geometry.dispose();
    retLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(retArc, retRadius);
    flyUpdaters?.helio.apsidesRecompute();
    retLine.visible = retArc.length >= 2;
  });

  // Position the per-mission DEPARTURE + ARRIVAL anchor rings + their
  // labels whenever arcTimeline or activeDestination changes. The
  // rings + sprites are created in onMount; this effect is a no-op
  // until they exist. Sprites float ~6u above the marker rings so
  // they don't z-fight with the ring geometry.
  $effect(() => {
    // Read state FIRST so Svelte 5 tracks outPts + isMoonMission +
    // retPts as deps even on the bail-out path (refs not yet defined).
    // Same tracking-bug shape as the arc-rebuild $effect: the initial
    // run early-returns before reading them, so subsequent mission
    // loads never re-run this effect and the markers stay invisible.
    const arc = outPts;
    const moonMode = isMoonMission;
    const retArcLen = retPts.length;
    void retArcLen;
    if (!depMarker || !arrMarker || !depLabelSprite || !arrLabelSprite) return;
    if (arc.length === 0) return;
    // Moon mode uses much smaller marker rings that hug the Earth and
    // Moon meshes (Earth = 2.6u, Moon = 2.0u): a 3u-radius torus sits
    // visibly around each planet without dwarfing the arc between
    // them. The label sprites + Y-offset shrink in parallel so the
    // text doesn't tower over a planet that's barely 3u wide.
    const markerRadius = moonMode ? 3 : 12;
    const markerTube = moonMode ? 0.08 : 0.25;
    const labelW = moonMode ? 14 : 34;
    const labelH = moonMode ? 4 : 10;
    const labelY = moonMode ? 3.5 : 6;
    // Swap geometry on mode change. Cheap: only fires when isMoonMission
    // flips because the new radius differs from the existing one.
    const depGeom = depMarker.geometry as THREE.TorusGeometry;
    const currentRadius = depGeom?.parameters?.radius;
    if (currentRadius !== markerRadius) {
      depMarker.geometry.dispose();
      arrMarker.geometry.dispose();
      depMarker.geometry = new THREE.TorusGeometry(markerRadius, markerTube, 12, 64);
      arrMarker.geometry = new THREE.TorusGeometry(markerRadius, markerTube, 12, 64);
      depLabelSprite.scale.set(labelW, labelH, 1);
      arrLabelSprite.scale.set(labelW, labelH, 1);
    }
    // Anchor markers to outPts itself — the arc IS the geometry, so
    // dep/arr markers must sit at outPts[0] and outPts[N-1] which now
    // coincide with the live planet positions at dep_day / arr_day
    // (transferEllipse pins both endpoints).
    const first = arc[0];
    const last = arc[arc.length - 1];
    const depX = first.x * SCALE_3D;
    const depZ = first.z * SCALE_3D;
    const arrX = last.x * SCALE_3D;
    const arrZ = last.z * SCALE_3D;
    depMarker.position.set(depX, 0, depZ);
    arrMarker.position.set(arrX, 0, arrZ);
    depLabelSprite.position.set(depX, labelY, depZ);
    arrLabelSprite.position.set(arrX, labelY, arrZ);
    depMarker.visible = true;
    arrMarker.visible = true;
    depLabelSprite.visible = true;
    arrLabelSprite.visible = true;
    // Round-trip RETURN anchor — sits at retPts[last], which is the
    // Earth heliocentric position on the return-arrival day. Hidden
    // unless the mission carries a return arc.
    if (retMarker && retLabelSprite) {
      if (retPts.length >= 2) {
        const retLast = retPts[retPts.length - 1];
        const retX = retLast.x * SCALE_3D;
        const retZ = retLast.z * SCALE_3D;
        const retGeom = retMarker.geometry as THREE.TorusGeometry;
        if (retGeom?.parameters?.radius !== markerRadius) {
          retMarker.geometry.dispose();
          retMarker.geometry = new THREE.TorusGeometry(markerRadius, markerTube, 12, 64);
          retLabelSprite.scale.set(labelW, labelH, 1);
        }
        retMarker.position.set(retX, 0, retZ);
        retLabelSprite.position.set(retX, labelY, retZ);
        retMarker.visible = true;
        retLabelSprite.visible = true;
      } else {
        retMarker.visible = false;
        retLabelSprite.visible = false;
      }
    }
    // Moon's orbit ring: visible in moon mode, anchored to Earth's
    // live heliocentric position so it tracks correctly through the
    // ~year-long Earth orbit even on long cislunar mission loads.
    if (moonOrbitRing) {
      moonOrbitRing.visible = moonMode;
      if (moonMode) {
        const ePos = earthPos(simDay);
        moonOrbitRing.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      }
    }
    // Context planets — toggle on for missions that have flyby events
    // OR an outer-system destination (Jupiter and beyond). The grand-
    // tour visualisation only carries value when there are multiple
    // bodies to see along the trajectory; Mars-rover missions don't
    // benefit. Moon missions skip entirely (cislunar scene).
    if (flyUpdaters) {
      const flybyCount = (mission.flight?.events ?? []).filter((e) => e.type === 'flyby').length;
      const outerDest = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(
        activeDestination,
      );
      flyUpdaters.helio.setContextPlanetsVisible(!moonMode && (flybyCount >= 1 || outerDest));
    }
  });

  // Refresh the LAUNCH / ARRIVAL sprite textures whenever the loaded
  // mission's identity changes. Each sprite gets a two-line texture:
  // LAUNCH      | <destination-name>
  // <dep date>  | <arr date>
  // This makes each mission's start + end self-describing in 3D.
  $effect(() => {
    // Read state first so deps are tracked across re-runs (same
    // shape as the marker / arc-rebuild effects above).
    const moonMode = isMoonMission;
    const dest = activeDestination;
    const depLabel = mission.dep_label || '—';
    const arrLabelData = mission.arr_label || '—';
    const isRoundTrip = retPts.length > 0;
    if (!flyUpdaters) return;
    const arrColor = moonMode ? DESTINATION_LABEL_COLORS.moon : DESTINATION_LABEL_COLORS[dest];
    // For round-trips the ARRIVAL ring sits at the destination's
    // flyby/arrival position while a separate RETURN ring sits at
    // Earth-on-return-day. Override the per-mission arr_label data
    // (which describes the mission's terminal event = Earth return)
    // with a position-accurate "<destination> arrival" subtitle, and
    // give the RETURN ring an "Earth arrival" subtitle. One-way
    // missions keep the original arr_label behaviour because their
    // arrival ring genuinely sits at the labelled point.
    const destDisplay = dest.charAt(0).toUpperCase() + dest.slice(1);
    const arrSubLabel = isRoundTrip ? `${destDisplay} arrival` : arrLabelData;
    if (isRoundTrip) {
      flyUpdaters.helio.refreshLabelSprites(
        'LAUNCH',
        depLabel,
        '#4b9cd3',
        'ARRIVAL',
        arrSubLabel,
        arrColor,
        'RETURN',
        'Earth arrival',
        '#4b9cd3',
      );
    } else {
      flyUpdaters.helio.refreshLabelSprites(
        'LAUNCH',
        depLabel,
        '#4b9cd3',
        'ARRIVAL',
        arrSubLabel,
        arrColor,
      );
    }
  });

  // Animation always rides the free-return arc; HUDs surface the
  // loaded mission's identity strings around it.
  let scState = $derived(spacecraftPos(simDay, arcTimeline, outPts, retPts));
  let phase = $derived(scState.phase);
  // PhasePanel modal state — opens when the user clicks the HUD phase
  // pill. ESC + backdrop close. Lives in the regime-panel z-stack at
  // zIndex=28 so the cinematic stays uninterrupted underneath.
  let phasePanelOpen = $state(false);
  let phaseLabel = $derived(
    phase === 'pre-launch'
      ? m.fly_phase_pre_launch()
      : phase === 'outbound'
        ? m.fly_phase_outbound()
        : phase === 'return'
          ? m.fly_phase_return()
          : m.fly_phase_arrived(),
  );

  // GH #107 — science chip on the HUD phase pill.
  // For Moon missions: derive the precise cislunar phase from
  // currentPhaseFor(simMet, trajectory) and look up the matching
  // /science section via primaryScienceRefFor.
  // For Mars + outer-system missions (Step 6e): same shape but via
  // currentInterplanetaryPhaseFor + interplanetary_phase_refs.
  // Falls back to a coarse map for missions without a trajectory.
  let phaseScienceRef: ScienceRef | null = $derived.by(() => {
    if (isMoonMission && cislunarTrajectory) {
      const simMet = simDay - mission.timeline.dep_day;
      const cur = currentPhaseFor(simMet, cislunarTrajectory);
      if (cur) {
        return primaryScienceRefFor({ phaseType: cur.type });
      }
    }
    if (!isMoonMission && interplanetaryTrajectory) {
      const simMet = simDay - mission.timeline.dep_day;
      const cur = currentInterplanetaryPhaseFor(simMet, interplanetaryTrajectory);
      if (cur) {
        return primaryInterplanetaryPhaseScienceRef(cur.type);
      }
    }
    // Coarse heliocentric map. Each entry returns the closest /science
    // explainer for the current journey state. This fallback only
    // fires when the trajectory isn't built or has no current phase
    // at simMet — the primary path goes through currentPhaseFor /
    // currentInterplanetaryPhaseFor with their specific science refs.
    if (phase === 'pre-launch') return { tab: 'mission-phases', slug: 'launch' };
    if (phase === 'outbound') return { tab: 'transfers', slug: 'transfer-ellipse' };
    if (phase === 'return') return { tab: 'mission-phases', slug: 'edl' };
    // arrived — prefer orbit-insertion over edl since the majority of
    // arrived Mars missions (Maven, Mars Express, MRO, MAVEN, MMX
    // pre-descent) are in captured orbit rather than the EDL phase
    // (#107 review finding 9).
    return { tab: 'mission-phases', slug: 'orbit-insertion' };
  });

  // ─── Live derived navigation values ──────────────────────────────
  // Pure functions in fly-physics.ts (v0.2.0 / ADR-030).
  //
  // Moon-mode caveat: the cislunar arc lives in Earth-centred scene
  // units / SCALE_3D = "fake AU" (Moon at 1.25 fake-AU vs the real
  // ~0.00257 AU). For HUD honesty we (a) use Earth's heliocentric
  // radius for vis-viva so HELIO ΔV reads ~29.78 km/s consistently
  // (the spacecraft co-orbits with Earth around the Sun during the
  // transit), and (b) scale fake-AU → real AU when displaying
  // FROM EARTH + signal delay. FROM MARS is hidden in Moon-mode.
  const MOON_FAKE_TO_REAL_AU = 384_400 / AU_TO_KM / (MOON_VISUAL_DISTANCE / SCALE_3D);
  let scR = $derived(isMoonMission ? R_EARTH_AU : Math.hypot(scState.pos.x, scState.pos.z));
  let heliocentricKms = $derived(
    flyHeliocentricSpeed(scR, isMoonMission ? R_EARTH_AU : (R_EARTH_AU + R_MARS_AU) / 2),
  );

  let earthNow = $derived(earthPos(simDay));
  let marsNow = $derived(marsPos(simDay));
  let distFromEarthAu = $derived(
    isMoonMission
      ? Math.hypot(scState.pos.x, scState.pos.z) * MOON_FAKE_TO_REAL_AU
      : distanceBetween(scState.pos, earthNow),
  );
  // distFromMarsAu is meaningless for Moon-mode (the cislunar arc
  // doesn't traverse Mars's orbit) so the FROM MARS HUD row is
  // hidden. We still compute a finite value here so the e2e
  // render-state hook stays parseable.
  let distFromMarsAu = $derived(distanceBetween(scState.pos, marsNow));
  let distFromEarthMkm = $derived(auToMkm(distFromEarthAu));
  let distFromMarsMkm = $derived(auToMkm(distFromMarsAu));
  let signalDelayMin = $derived(flySignalDelayMin(distFromEarthAu));

  // ─── Render-state hash (Layer 2 of /fly validation strategy) ─────
  // Stable signature of the outbound arc geometry: first 5 + middle +
  // last 5 vertices, each x/z to 6 decimals. Lets Playwright assert
  // the rendered Line geometry matches the math output across views
  // without snapshotting the full 201-point array.
  let outVertexHash = $derived(
    (() => {
      if (outPts.length < 11) return '';
      const sample = [
        ...outPts.slice(0, 5),
        outPts[Math.floor(outPts.length / 2)],
        ...outPts.slice(-5),
      ];
      return sample.map((p) => `${p.x.toFixed(6)},${p.z.toFixed(6)}`).join('|');
    })(),
  );

  // ─── Test-only readiness hooks (ADR-056) — issue #133 ────────────
  // `window.__flyArcHash` + `window.__fly2DArcHash` are introspection
  // functions for the fly-render-validation e2e suite. Both return
  // `null` while hydrating (outPts not yet populated) and the stable
  // outVertexHash string once the current mission's geometry has
  // settled. Reading from reactive `$state` at CALL TIME (not at
  // closure-capture time) means there's no microtask gap between
  // Svelte's reactive flush and what the test sees — fixes the
  // pre-v0.6.2 flake where the e2e poll read the DOM attribute
  // mid-flush and got the previous mission's hash.
  //
  // The 3D and 2D views share `outPts` / `retPts` as their geometry
  // source; only the projection differs. So both hashes reflect the
  // same math invariant — assertions like `s2d.hash === s3d.hash`
  // collapse to "the 2D toggle didn't accidentally re-derive the
  // arc from a different source".
  $effect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      __flyArcHash?: () => string | null;
      __fly2DArcHash?: () => string | null;
      __flyMissionId?: () => string | null;
    };
    // Hash returns null until BOTH conditions hold:
    //   (a) an apply* function has committed a mission/scenario to
    //       page state (lastAppliedMissionId !== null) — distinguishes
    //       "page rendered with default state" from "URL load
    //       resolved", which is the race that bit v0.6.1.
    //   (b) outPts has been built (length ≥ 11 — the hash samples 11
    //       vertices).
    const hashOrNull = (): string | null =>
      lastAppliedMissionId === null || outPts.length < 11 ? null : outVertexHash;
    w.__flyArcHash = hashOrNull;
    w.__fly2DArcHash = hashOrNull;
    // Mission ID lets the test verify the URL-requested mission is the
    // one currently rendered (not the static default). Tests that load
    // `/fly?mission=X` should await `__flyMissionId() === 'X'` before
    // reading the hash.
    w.__flyMissionId = () => lastAppliedMissionId;
    return () => {
      delete w.__flyArcHash;
      delete w.__fly2DArcHash;
      delete w.__flyMissionId;
    };
  });

  // Mission elapsed time = days since the simulation departed the arc's
  // start, mapped to the loaded mission's apparent transit time so the
  // user-visible "DAY 138" feels right whether they loaded Curiosity
  // (254 days) or the default ORRERY-1 (509 days).
  let arcTotalDays = $derived(arcTimeline.arr_day - arcTimeline.dep_day);
  let arcProgress = $derived((simDay - arcTimeline.dep_day) / arcTotalDays);
  let totalDays = $derived(mission.timeline.arr_day - mission.timeline.dep_day);
  let met = $derived(Math.max(0, arcProgress * totalDays));

  // Fire mission-complete once when the trajectory reaches arrival (by
  // playback or scrub). Completes the /fly load→complete funnel.
  $effect(() => {
    if (mission?.id && arcProgress >= 0.999 && completedForId !== mission.id) {
      completedForId = mission.id;
      trackMissionComplete(mission.id, activeDestination);
    }
  });

  // FD-stage tick positions for the time scrubber. Each FD_STAGES
  // entry's tickArc (0..1 along its leg) maps to a percent along the
  // scrubber: outbound stages span 0..50% on round-trips or 0..100%
  // on one-ways; return stages span 50..100%. Adds gold ticks on the
  // scrubber that mirror the on-canvas gold diamonds — clicking a
  // stage tick jumps to that stage's MET.
  let fdScrubberTicks = $derived.by(() => {
    if (!arcTotalDays || arcTotalDays <= 0)
      return [] as Array<{
        id: string;
        label: string;
        pct: number;
        met_days: number;
      }>;
    const hasReturn = retPts.length >= 2;
    const out = [] as Array<{ id: string; label: string; pct: number; met_days: number }>;
    for (const s of FD_STAGES) {
      if (s.leg === 'return' && !hasReturn) continue;
      const legSpan = hasReturn ? 0.5 : 1;
      const legStart = s.leg === 'out' ? 0 : 0.5;
      const pct = (legStart + s.tickArc * legSpan) * 100;
      // ARRIVAL on a one-way mission sits at 100% (= end of scrubber).
      // INJECTION at 0% would overlap the play button — but its
      // diamond is suppressed anyway (LAUNCH ring covers it), so the
      // scrubber tick is also suppressed for that stage. Same for
      // ARRIVAL-EARTH on round-trips.
      if (s.id === 'injection' || s.id === 'arrival-earth') continue;
      const met_days = (legStart + s.tickArc * legSpan) * arcTotalDays;
      out.push({ id: s.id, label: s.label(), pct, met_days });
    }
    return out;
  });

  // Phase I — current conic classification from heliocentric (r, v).
  // Cislunar conic state — Earth-centric classifier in km/s units,
  // updated from the animate() rAF callback when a Moon mission is
  // active. Module-scope $state so the conicState $derived below can
  // switch into it when isMoonMission is true.
  let conicStateCislunar = $state<{
    shape: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
    a: number;
    e: number;
    epsilon: number;
  } | null>(null);

  // Velocity by finite-difference of the planned arc 0.5 days ahead.
  // Re-derives whenever simDay advances (per frame) or arc swaps.
  // On Moon missions, returns the Earth-centric cislunar conic state
  // computed each frame; heliocentric missions use the Sun-centric
  // classifier on the planned arc.
  let conicState = $derived.by(() => {
    if (isMoonMission && conicStateCislunar) return conicStateCislunar;
    const sc0 = spacecraftPos(simDay, arcTimeline, outPts, retPts).pos;
    const sc1 = spacecraftPos(simDay + 0.5, arcTimeline, outPts, retPts).pos;
    const r = { x: sc0.x, y: 0, z: sc0.z };
    const v = {
      x: (sc1.x - sc0.x) / 0.5,
      y: 0,
      z: (sc1.z - sc0.z) / 0.5,
    };
    return classifyConic(r, v);
  });

  // classifyConicEarth: extracted to $lib/fly-conics-earth (W9 / #279).
  // Naive ∆v ledger: full burn at TMI plus a small TCM allocation; we
  // surface the scenario's headline numbers without re-running an
  // optimal-burn schedule. A future slice with per-burn data could
  // refine this into a live consume-as-you-go ledger.
  let dvRemaining = $derived(Math.max(0, mission.dv_total - mission.dv_used));

  // ─── CAPCOM derivations ──────────────────────────────────────────
  // Past events (met ≤ current met), most-recent-first.
  let pastEvents = $derived(
    missionEvents
      .filter((e) => e.met <= met)
      .slice()
      .reverse(),
  );
  // Anomaly state — collapses past `warning` events into a worst-case
  // banner. CAUTION when a warning is present, NOMINAL otherwise; we
  // promote to CRITICAL when ∆v margin drops below 0.3 km/s (the
  // prototype's threshold).
  let anomalyLevel = $derived<'nominal' | 'caution' | 'critical'>(
    dvRemaining < 0.3
      ? 'critical'
      : pastEvents.some((e) => e.type === 'warning')
        ? 'caution'
        : 'nominal',
  );
  let anomalyLabel = $derived(
    anomalyLevel === 'critical'
      ? m.fly_capcom_anomaly_critical()
      : anomalyLevel === 'caution'
        ? m.fly_capcom_anomaly_caution()
        : m.fly_capcom_anomaly_nominal(),
  );

  // FLIGHT PARAMS HUD readout (ADR-027). Visible only when the loaded
  // mission has structured flight data; missing fields render as `—`
  // (em-dash) — never fake numbers.
  let hasFlightParams = $derived(mission.flight != null);
  let flightCaveat = $derived.by<string | null>(() => {
    const q = mission.flight_data_quality;
    if (q === 'reconstructed') return m.fly_flight_caveat_reconstructed();
    if (q === 'sparse') return m.fly_flight_caveat_sparse();
    if (q === 'unknown') return m.fly_flight_caveat_unknown();
    return null;
  });
  // Long-form "Why this caveat?" body — same mapping as the banner text.
  let flightCaveatWhy = $derived.by<string | null>(() => {
    const q = mission.flight_data_quality;
    if (q === 'reconstructed') return m.why_caveat_reconstructed_body();
    if (q === 'sparse') return m.why_caveat_sparse_body();
    if (q === 'unknown') return m.why_caveat_unknown_body();
    return null;
  });
  function fmtNumOrDash(value: number | null | undefined, digits = 2): string {
    if (value == null) return '—';
    return value.toFixed(digits);
  }

  // NEXT EVENT row (v0.1.13). The first event whose met > current met,
  // surfaced as "T+Nd · LABEL" in the FLIGHT PARAMS HUD. Displays "—"
  // when all events have passed or no events are loaded.
  let nextFlightEvent = $derived.by(() => {
    const events = missionEvents;
    if (!events || events.length === 0) return null;
    return events.find((e) => e.met > met) ?? null;
  });

  // W3.7 — find the midpoint of the longest cruise gap between two
  // consecutive labeled events. Returns null when no qualifying gap
  // exists (short missions, single-event Moon flights). The midpoint
  // is in sim-day units relative to arcTimeline.dep_day.
  let cruiseHoldTriggerSimDay = $derived.by(() => {
    const events = mission.flight?.events;
    if (!events || events.length < 2) return null;
    const mets = events
      .filter((e) => e.met_days != null)
      .map((e) => e.met_days as number)
      .sort((a, b) => a - b);
    let longestGap = 0;
    let longestStart = 0;
    for (let i = 1; i < mets.length; i++) {
      const gap = mets[i] - mets[i - 1];
      if (gap > longestGap) {
        longestGap = gap;
        longestStart = mets[i - 1];
      }
    }
    if (longestGap < CINEMATIC_TIMINGS.CRUISE_HOLD_MIN_GAP_DAYS) return null;
    return arcTimeline.dep_day + longestStart + longestGap / 2;
  });

  // ACTIVE EVENT row (polish-wave-2, 2026-06). Surfaces the current
  // active milestone — the one within the ±active window — out of the
  // milestoneScreens computed by the frame loop. Replaces the floating
  // on-canvas chip with an HUD line; the pulsing diamond on the path
  // is the graphic correlation. Null when no milestone is active.
  let activeMilestone = $derived(milestoneScreens.find((m) => m.state === 'active') ?? null);

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }
  function togglePlay() {
    // If user presses Play after the flight has completed, rewind to
    // launch and replay the mission.
    if (!isPlaying && simDay >= arcTimeline.arr_day) {
      simDay = arcTimeline.dep_day;
    }
    isPlaying = !isPlaying;
    // Umami custom event: did people actually press play, and on
    // which mission? Engagement-depth signal beyond just `mission-load`.
    track('mission-play-toggle', { id: mission?.name ?? 'unknown', playing: isPlaying });
  }
  function setSpeed(v: number) {
    if (simDay >= arcTimeline.arr_day) {
      simDay = arcTimeline.dep_day;
    }
    simSpeed = v;
    isPlaying = true;
  }
  // ─── Scrubber ──────────────────────────────────────────────────
  // Pause-on-scrub: writing to simDay while isPlaying is true would
  // race the rAF tick (next frame increments simDay over the user's
  // input). Pausing for the duration of the drag stops that.
  let wasPlayingBeforeScrub = false;
  function onScrubStart() {
    if (isPlaying) {
      wasPlayingBeforeScrub = true;
      isPlaying = false;
    } else {
      wasPlayingBeforeScrub = false;
    }
  }
  function onScrubEnd() {
    if (wasPlayingBeforeScrub) isPlaying = true;
    wasPlayingBeforeScrub = false;
  }

  /**
   * #107 Step 6g — click-event-to-jump scrubber. Called when a user
   * clicks a phase marker dot. Sets simDay to (mission depart day +
   * event's MET in days) and pauses the sim so the moment can be
   * examined. The user can press play to resume from there.
   *
   * Mirrors onScrub semantics for state coherence — no animation, just
   * a snap, even outside reduced-motion (reduced-motion users get the
   * same behaviour; the sim was already paused for them).
   */
  /** Wall-clock ms timestamp until which the camera should converge
   *  fast on its sub-phase target. Set by jumpToMet / onScrub so a
   *  scrubber jump across the system (Jupiter → Earth, say) doesn't
   *  spend 6-8 seconds in a slow lerp before the destination shot
   *  resolves. Once the boost window expires, lerp returns to the
   *  cinematic default. */
  let camSnapUntil = 0;

  /**
   * Reset all polish-wave-3 cinematic-beat state to defaults. Single
   * funnel called from each of the mission-load paths
   * (applyMissionAsLoaded, applyScenarioAsLoaded, applyPlanSelection)
   * so a Cassini-after-Voyager swap can't leak a still-future
   * `cine.peakHoldUntil` into the new mission and falsely freeze sim time
   * the moment the user presses play.
   *
   * Reset = the typed `resetCinematicBeatState(cine)` from the module
   * (covers the 13 non-reactive timestamps + flags) plus an explicit
   * reset of the 5 Svelte $state UI bindings (overlay opacities + the
   * chrome flag) — those aren't on `cine` because they need template
   * reactivity, so the module's reset can't touch them.
   */
  function resetCinematicForMissionSwap() {
    resetCinematicBeatState(cine);
    inMissionFinale = false;
    finaleCaptionOpacity = 0;
    finaleBlackOpacity = 0;
    inCinematicHeldBeat = false;
    cutBlackOpacity = 0;
    // #82 epilogue state
    epilogueStartedAt = 0;
    epilogueActive = false;
    epilogueCaptionOpacity = 0;
    // #86 v2 opening state — fires fresh on every mission swap.
    // Duration scales with description length + fleet asset count so
    // longer missions get more read time. Base 9.5 s, capped at 22 s.
    openingStartedAt = performance.now();
    openingActive = true;
    openingTitleOpacity = 0;
    openingContextOpacity = 0;
    openingFleetOpacity = 0;
    openingMissionHeroUrl = null;
    openingFleetAssets = [];
    const descLen = mission.description?.length ?? 0;
    const refsCount = mission.fleet_refs?.length ?? 0;
    const extra = Math.min(8000, descLen * 25) + refsCount * 800;
    openingDurationMs = Math.min(22000, 9500 + extra);
    // Kick off async asset loads — race-guarded by openingLoadId so
    // a mission swap mid-flight discards the in-flight load.
    if (mission.id) {
      void loadOpeningAssets(mission.id, mission.fleet_refs ?? [], mission.vehicle ?? null);
    }
  }

  /** #86 v2 — async load mission hero image + per-fleet-ref full
   *  entries with hero paths. Updates openingMissionHeroUrl and
   *  openingFleetAssets when done. Race-guarded against mission swap. */
  async function loadOpeningAssets(
    missionId: string,
    refs: Array<{ id: string; role: 'launcher' | 'spacecraft' | 'payload' | 'launch-site' }>,
    missionVehicle?: string | null,
  ) {
    openingLoadId++;
    const myLoadId = openingLoadId;
    // Mission hero — first image in the gallery.
    try {
      const gallery = await getMissionGallery(missionId);
      if (myLoadId !== openingLoadId) return;
      openingMissionHeroUrl = gallery[0] ?? null;
    } catch {
      openingMissionHeroUrl = null;
    }
    if (refs.length === 0) {
      openingFleetAssets = [];
      return;
    }
    // Need fleet index to look up category per ref before getFleet.
    try {
      const fleetIndex = await getFleetIndex();
      if (myLoadId !== openingLoadId) return;
      const loaded = await Promise.all(
        refs.map(async (ref) => {
          const idxEntry = fleetIndex.find((f) => f.id === ref.id);
          if (!idxEntry) return null;
          const fullEntry = await getFleet(ref.id, idxEntry.category);
          if (!fullEntry) return null;
          // Hero image — prefer fleet index's hero_path; fall back to
          // the first image in the fleet gallery (most entries don't
          // populate hero_path but DO have galleries under
          // static/images/fleet-galleries/<id>/). Without this fallback
          // the opening's fleet cards render with no thumbnail.
          // Hero is stored as a FULL URL (with base path) on the asset
          // so the markup can use src={heroPath} without an extra
          // base-prefix step. idxEntry.hero_path lacks the base; we
          // prefix it here. getFleetGallery() already returns full URLs.
          let heroPath: string | null = idxEntry.hero_path ? `${base}/${idxEntry.hero_path}` : null;
          if (!heroPath) {
            try {
              const gallery = await getFleetGallery(ref.id);
              heroPath = gallery[0] ?? null;
            } catch {
              heroPath = null;
            }
          }
          return {
            id: ref.id,
            role: ref.role,
            name: fullEntry.name ?? idxEntry.name,
            tagline: fullEntry.tagline ?? idxEntry.tagline ?? '',
            description: fullEntry.description ?? '',
            heroPath,
          } satisfies OpeningFleetAsset;
        }),
      );
      if (myLoadId !== openingLoadId) return;
      // Fuzzy-match the launcher when mission.fleet_refs lacks one but
      // mission.vehicle names a real fleet entry (e.g. Saturn V, Atlas
      // V 401). Search the index by name; if found, hydrate it as a
      // launcher-role OpeningFleetAsset so it gets the same hero image
      // + bio + clickable link as the spacecraft card. Missions like
      // Cassini (Titan IVB / Centaur) still fall through to the
      // synthetic card because no fleet entry matches.
      const resolved = loaded.filter((x): x is OpeningFleetAsset => x !== null);
      const hasLauncher = resolved.some((a) => a.role === 'launcher');
      const launcherCandidate =
        !hasLauncher && missionVehicle
          ? findFleetEntryByVehicleName(fleetIndex, missionVehicle)
          : null;
      if (launcherCandidate) {
        const fullLauncher = await getFleet(launcherCandidate.id, launcherCandidate.category);
        if (myLoadId !== openingLoadId) return;
        if (fullLauncher) {
          let heroPath: string | null = launcherCandidate.hero_path
            ? `${base}/${launcherCandidate.hero_path}`
            : null;
          if (!heroPath) {
            try {
              const gallery = await getFleetGallery(launcherCandidate.id);
              heroPath = gallery[0] ?? null;
            } catch {
              heroPath = null;
            }
          }
          resolved.push({
            id: launcherCandidate.id,
            role: 'launcher',
            name: fullLauncher.name ?? launcherCandidate.name,
            tagline: fullLauncher.tagline ?? launcherCandidate.tagline ?? '',
            description: fullLauncher.description ?? '',
            heroPath,
          } satisfies OpeningFleetAsset);
        }
      }
      // Sort spacecraft first (the hero asset), then launcher, then site.
      const roleOrder: Record<string, number> = {
        spacecraft: 0,
        payload: 1,
        launcher: 2,
        'launch-site': 3,
      };
      openingFleetAssets = resolved.sort(
        (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9),
      );
    } catch {
      openingFleetAssets = [];
    }
  }

  /** Loose-match a fleet index entry by vehicle-name string. Lowercases
   *  both sides + strips punctuation/spaces so "Titan IVB / Centaur"
   *  matches "Titan IVB-Centaur" matches "Titan IV-B Centaur". Returns
   *  null if no entry shares meaningful tokens with the input. */
  function findFleetEntryByVehicleName(
    fleetIndex: FleetIndexEntry[],
    vehicle: string,
  ): FleetIndexEntry | null {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const target = norm(vehicle);
    if (!target) return null;
    const targetTokens = new Set(target.split(' ').filter((t) => t.length >= 2));
    let best: { entry: (typeof fleetIndex)[number]; score: number } | null = null;
    for (const entry of fleetIndex) {
      if (entry.category !== 'launcher') continue;
      const entryTokens = norm(entry.name)
        .split(' ')
        .filter((t) => t.length >= 2);
      let score = 0;
      for (const tok of entryTokens) if (targetTokens.has(tok)) score++;
      if (score >= 2 && (!best || score > best.score)) best = { entry, score };
    }
    return best?.entry ?? null;
  }

  /** #86 v2 — skip the opening sequence on user click. Drops the
   *  opening overlays, ends the dwell, and lets the prelaunch
   *  composition take over for a brief settle before launch fires. */
  function skipOpening() {
    if (!openingActive) return;
    openingActive = false;
    openingTitleOpacity = 0;
    openingContextOpacity = 0;
    openingFleetOpacity = 0;
    // Give 600 ms of prelaunch settle so the camera has time to
    // lerp from the wide top-down to the Earth-closeup before sim
    // starts advancing.
    launchDwellUntil = performance.now() + 600;
  }
  // Polish-wave-3 cinematic state — all 13 timestamps + phase-tracking
  // flags live in a single CinematicBeatState instance. The struct
  // + predicates + reset are in $lib/fly-cinematic-beats; per-beat
  // timings live in CINEMATIC_TIMINGS (imported at top of script).
  //
  // What stays as Svelte $state below this block: the reactive UI
  // bindings the template observes — overlay opacities and the
  // chrome-suppression flag. The non-reactive timestamps in cine
  // are read from the raf loop; their changes don't need to drive
  // template re-renders, so $state would be wasted overhead.
  const cine = createCinematicBeatState();

  // W3.4 finale overlay opacities + flag — UI reactivity required.
  let inMissionFinale = $state(false);
  let finaleCaptionOpacity = $state(0);
  let finaleBlackOpacity = $state(0);
  // W3.5 chrome-suppression flag — drives `.cinematic-hidden` class on
  // HUD stack, scrubber, FD banner, CAPCOM panel.
  let inCinematicHeldBeat = $state(false);
  // W3.6 cut overlay opacity — driven by animate() each frame.
  let cutBlackOpacity = $state(0);
  // #82 end-of-mission epilogue — after the W3.4 finale fades to
  // black, instead of staying black we fade BACK IN to a wide top-
  // down system view that shows the entire mission flight path as
  // a static tableau while the planetary system slowly rotates.
  // The "where Cassini went" beat.
  let epilogueStartedAt = 0;
  let epilogueActive = $state(false);
  let epilogueCaptionOpacity = $state(0);
  // #86 cinematic opening — mirrors the epilogue tableau but at the
  // START of the mission. Wide top-down system view + mission title +
  // agency + dates + 1-sentence story + key stats (vehicle / payload /
  // ∆v / duration) + a curated list of related fleet entries (the
  // spacecraft, launcher, launch-site cross-linked from mission.
  // fleet_refs) fade in over ~5.5 s, hold for 2 s, then the camera
  // lerps toward the Earth-closeup prelaunch composition. The whole
  // flyby reads as a movie: title card + context + body + credits.
  //
  // Timing:
  //   0-1.0s   title (mission name + agency + years) fades in
  //   1.5-3.0s context (story + stats) fades in
  //   3.0-5.5s fleet asset cards fade in (spacecraft / launcher / site)
  //   5.5-7.5s held: audience reads the context
  //   7.5-9.5s title + context + fleet fade OUT, camera lerps from
  //           wide top-down to Earth-closeup prelaunch composition
  //   9.5-13.5s existing W3.3 prelaunch dwell (4 s of static Earth)
  //           then launch fires.
  let openingStartedAt = 0;
  let openingActive = $state(false);
  let openingTitleOpacity = $state(0);
  let openingContextOpacity = $state(0);
  let openingFleetOpacity = $state(0);
  // #86 v2 — adaptive duration. Base 9.5 s + extra time proportional to
  // description length (so longer mission stories get more read time)
  // and a per-fleet-asset second-and-a-half so multi-asset missions
  // get a fair spotlight per item. Capped at 22 s total.
  let openingDurationMs = 9500;
  // #86 v2 — async asset loads. Mission hero image (first gallery
  // photo) + per-fleet-ref full FleetEntry + hero_path. Loaded after
  // applyMissionAsLoaded fires; opening renders with what's available
  // each frame (skeleton placeholders → rich cards as they hydrate).
  let openingMissionHeroUrl = $state<string | null>(null);
  interface OpeningFleetAsset {
    id: string;
    role: 'launcher' | 'spacecraft' | 'payload' | 'launch-site';
    name: string;
    tagline: string;
    description: string;
    heroPath: string | null;
  }
  let openingFleetAssets = $state<OpeningFleetAsset[]>([]);
  let openingLoadId = 0; // race-guard for async loads vs mission swaps
  function jumpToMet(metDays: number) {
    if (!Number.isFinite(metDays) || metDays < 0) return;
    const previousSimDay = simDay;
    // Bias the target onto the iconic-shot hold window when the jump
    // lands on a flyby / EDL event. See $lib/orbital/jump-to-met-bias
    // for the rationale; the function is unit-tested.
    const landMet = biasJumpToIconicMoment(metDays, mission?.flight?.events);
    simDay = mission.timeline.dep_day + landMet;
    if (isPlaying) isPlaying = false;
    camSnapUntil = performance.now() + 700;
    // Re-jumping to the same flyby would normally fail to re-arm
    // peakHold because the arming guard (peakHoldArmedForFlybyMet !==
    // currentFrameFlybyMet) treats the prior arm as still valid even
    // though the hold's peakHoldUntil has long expired. Clearing the
    // arm flag lets the next animate frame re-detect the window and
    // re-fire the freeze, so every timeline click yields the iconic
    // hold instead of just the first one.
    cine.peakHoldArmedForFlybyMet = null;
    cine.peakHoldUntil = 0;
    // W3.3 — re-arm the pre-launch dwell when the user jumps back to
    // MET 0 (Launch milestone). Gives them the cinematic prelaunch
    // beat on demand instead of just a quiet snap to dep_day. Skipped
    // for non-zero MET jumps; those want the snap behavior the
    // camSnapUntil window already provides.
    if (metDays === 0) {
      // #86 — jumping back to Launch milestone replays the cinematic
      // opening. Re-arm opening state + extend the dwell to cover the
      // 9.5 s opening + 4 s prelaunch.
      openingStartedAt = performance.now();
      openingActive = true;
      openingTitleOpacity = 0;
      openingContextOpacity = 0;
      openingFleetOpacity = 0;
      // Hold sim until opening fade-out fully completes + 300 ms
      // settle so the first animate frame doesn't fire under
      // visible opening text.
      launchDwellUntil = performance.now() + openingDurationMs + 300;
      // W3.7 — re-arm the cruise hold so it fires again on the
      // mission replay.
      cine.cruiseHoldFired = false;
    }
    // W3.6 — deliberate cut when the jump crosses > 1 mission year.
    // Fade-to-black overlay handles the visual cut; camSnapUntil at
    // 700 ms gives the camera time to converge after the fade.
    if (Math.abs(simDay - previousSimDay) > CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS) {
      cine.cutStartedAt = performance.now();
    }
  }
  function onScrub(event: Event) {
    const t = parseFloat((event.target as HTMLInputElement).value);
    const previousSimDay = simDay;
    simDay = arcTimeline.dep_day + t * arcTotalDays;
    camSnapUntil = performance.now() + 300;
    // W3.6 — scrubber drag that crosses > 1 mission year also
    // triggers the cinematic cut. Continuous-drag scrubs that drift
    // through the year boundary in increments stay under the
    // threshold per-event, so only big jumps fire the cut.
    if (Math.abs(simDay - previousSimDay) > CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS) {
      cine.cutStartedAt = performance.now();
    }
  }

  // ─── Mission loading from URL (?mission=id) ──────────────────────
  // Race-guarded by a monotonic loadId — if a newer URL change comes
  // in while a previous load is in flight, the older promise resolves
  // into a no-op rather than overwriting the newer state.
  let loadFailed = $state(false);
  let currentLoadId = 0;

  // ID of the mission/scenario most recently applied to the page state.
  // Used by the `window.__flyArcHash` test hook to distinguish "first
  // paint shows the default scenario" from "the URL-requested mission
  // has actually been applied" — fixes the v0.6.1 fly-render-validation
  // flake (issue #133). Null until the first apply* function runs.
  let lastAppliedMissionId = $state<string | null>(null);

  const MISSION_APPLY_DEFAULTS: MissionApplyDefaults = {
    depFallback: defaultScenarioBase.dep_day,
    dvFallback: defaultScenarioBase.dv_total_km_s,
    depLabelFallback: defaultScenarioOverlay.dep_label,
    arrLabelFallback: defaultScenarioOverlay.arr_label,
  };

  function applyMissionAsLoaded(m: Mission, trajectoryOverride?: TrajectoryOverride) {
    // Umami custom event — anonymous, production-host only.
    track('mission-load', {
      id: m.id,
      dest: m.dest,
      status: m.status ?? 'unknown',
      view: m.dest === 'MOON' || m.dest === 'EARTH' ? 'cislunar' : 'heliocentric',
    });
    completedForId = null; // new mission loaded — re-arm the completion event
    // Math layer: derive every value from the Mission. See
    // $lib/fly-mission-apply for the timeline / arc / trajectory
    // derivations and the round-trip vs one-way semantics.
    const r = computeMissionApply(m, MISSION_APPLY_DEFAULTS, trajectoryOverride);
    // Write state in the same order the prior inline impl did, so
    // any reactive $effect that watched isMoonMission + outPts +
    // retPts together still sees the same end state.
    arcTimeline = r.timeline;
    isFreeReturn = r.isFreeReturn;
    isMoonMission = r.isMoonMission;
    activeDestination = r.activeDestination;
    flyUpdaters?.helio.applyDestination(r.activeDestination);
    currentDestMeshId = r.activeDestination;
    flyUpdaters?.helio.setSpacecraftModel(m.id);
    cislunarTrajectory = r.cislunarTrajectory;
    interplanetaryTrajectory = r.interplanetaryTrajectory;
    // Three.js side effects for cislunar lines + annotations — fire
    // on both branches (null clears the previous mission's geometry).
    flyUpdaters?.cislunar.rebuildLines(r.cislunarTrajectory);
    flyUpdaters?.cislunar.rebuildAnnotations(r.cislunarTrajectory, m.flight?.cislunar_profile);
    outPts = r.outPts;
    retPts = r.retPts;
    flyUpdaters?.helio.resetCamera();
    mission = r.missionMeta;
    simDay = r.timeline.dep_day;
    simSpeed = r.simSpeed;
    missionEvents = r.missionEvents;
    // Launch dwell — hold MET 0 for ~3.5 s wall-clock so the camera
    // lerps in to the prelaunch composition before the clock starts.
    // Without this the ship is already accelerating away while the
    // viewer is still parsing where Earth is.
    // W3.3 — 4-second pre-launch beat. Was 3500 ms; bumped to 4000 so the
    // audience sits longer with the static Earth-closeup composition (the
    // "weight of decades of work" register from the creative-direction
    // guide §5).
    // Audit recommendation #1 — clear lingering W3.1-W3.7 timers from
    // any prior mission so we don't accidentally start the new one
    // already inside a stale held beat. Also arms the #86 opening
    // sequence, so the launchDwellUntil set below must come after.
    resetCinematicForMissionSwap();
    // #86 — opening sequence runs until openingDurationMs elapses
    // (9.5-22 s depending on description + fleet ref count). Sim
    // stays paused until the opening fully fades out so the
    // simulation doesn't start advancing under visible text. 300 ms
    // buffer past the fade-out endpoint gives a clean black-ish
    // moment before the first animate frame. Non-opening missions
    // keep the 4 s dwell (W3.3 prelaunch beat).
    launchDwellUntil = performance.now() + (openingActive ? openingDurationMs + 300 : 4000);
    // After all derived state has updated. The render-state hook
    // reads this LAST so a test gated on __flyArcHash() != null
    // sees an outPts / hash that already reflects the new mission.
    lastAppliedMissionId = m.id;
  }

  function applyScenarioAsLoaded(s: LocalizedScenario) {
    const r = computeScenarioApply(s);
    arcTimeline = r.timeline;
    isFreeReturn = r.isFreeReturn;
    activeDestination = r.activeDestination;
    flyUpdaters?.helio.applyDestination(r.activeDestination);
    currentDestMeshId = r.activeDestination;
    // Default scenario is the ORRERY-1 demo — no dedicated spacecraft
    // model, so this clears any previously-loaded mission model.
    flyUpdaters?.helio.setSpacecraftModel(DEFAULT_SCENARIO_ID);
    isMoonMission = r.isMoonMission;
    cislunarTrajectory = r.cislunarTrajectory;
    interplanetaryTrajectory = r.interplanetaryTrajectory;
    outPts = r.outPts;
    retPts = r.retPts;
    flyUpdaters?.helio.resetCamera();
    mission = r.missionMeta;
    simDay = r.timeline.dep_day;
    missionEvents = r.missionEvents;
    // W3.3 — 4-second pre-launch beat. Was 3500 ms; bumped to 4000 so the
    // audience sits longer with the static Earth-closeup composition (the
    // "weight of decades of work" register from the creative-direction
    // guide §5).
    // Audit recommendation #1 — clear lingering W3.1-W3.7 timers from
    // any prior mission so we don't accidentally start the new one
    // already inside a stale held beat. Also arms the #86 opening
    // sequence, so the launchDwellUntil set below must come after.
    resetCinematicForMissionSwap();
    // #86 — opening sequence runs until openingDurationMs elapses
    // (9.5-22 s depending on description + fleet ref count). Sim
    // stays paused until the opening fully fades out so the
    // simulation doesn't start advancing under visible text. 300 ms
    // buffer past the fade-out endpoint gives a clean black-ish
    // moment before the first animate frame. Non-opening missions
    // keep the 4 s dwell (W3.3 prelaunch beat).
    launchDwellUntil = performance.now() + (openingActive ? openingDurationMs + 300 : 4000);
    // The page-default state initialises with this same scenario at
    // module load, so the test hook can't distinguish "first paint"
    // from "applyScenarioAsLoaded ran" by mission name alone. Setting
    // this $state explicitly here is the test's only signal that the
    // URL load committed.
    lastAppliedMissionId = DEFAULT_SCENARIO_ID;
  }

  /**
   * /plan-driven entry: when /fly receives `?dest=...&type=...&dep=N&tof=N`
   * (no `?mission=`), we synthesise a one-way trajectory for the
   * chosen destination instead of falling through to the ORRERY DEMO
   * scenario. Per ADR-026 §FLY-button experience.
   *
   * Math (timeline shape, arc construction, synthesised LoadedMission)
   * lives in $lib/fly-mission-apply → computePlanApply.
   */
  function applyPlanSelection(
    dest: DestinationId,
    type: 'LANDING' | 'FLYBY',
    depDay: number,
    tofDays: number,
  ) {
    const r = computePlanApply(dest, type, depDay, tofDays, {
      dvFallback: defaultScenarioBase.dv_total_km_s,
    });
    arcTimeline = r.timeline;
    isFreeReturn = r.isFreeReturn;
    activeDestination = r.activeDestination;
    flyUpdaters?.helio.applyDestination(r.activeDestination);
    currentDestMeshId = r.activeDestination;
    // /plan-driven entry — no mission id, clear any previous model.
    flyUpdaters?.helio.setSpacecraftModel('');
    isMoonMission = r.isMoonMission;
    cislunarTrajectory = r.cislunarTrajectory;
    interplanetaryTrajectory = r.interplanetaryTrajectory;
    outPts = r.outPts;
    retPts = r.retPts;
    flyUpdaters?.helio.resetCamera();
    mission = r.missionMeta;
    simDay = r.timeline.dep_day;
    missionEvents = r.missionEvents;
    // W3.3 — 4-second pre-launch beat. Was 3500 ms; bumped to 4000 so the
    // audience sits longer with the static Earth-closeup composition (the
    // "weight of decades of work" register from the creative-direction
    // guide §5).
    // Audit recommendation #1 — clear lingering W3.1-W3.7 timers from
    // any prior mission so we don't accidentally start the new one
    // already inside a stale held beat. Also arms the #86 opening
    // sequence, so the launchDwellUntil set below must come after.
    resetCinematicForMissionSwap();
    // #86 — opening sequence runs until openingDurationMs elapses
    // (9.5-22 s depending on description + fleet ref count). Sim
    // stays paused until the opening fully fades out so the
    // simulation doesn't start advancing under visible text. 300 ms
    // buffer past the fade-out endpoint gives a clean black-ish
    // moment before the first animate frame. Non-opening missions
    // keep the 4 s dwell (W3.3 prelaunch beat).
    launchDwellUntil = performance.now() + (openingActive ? openingDurationMs + 300 : 4000);
    lastAppliedMissionId = r.appliedId;
  }

  async function loadMissionFromUrl(url: URL): Promise<void> {
    loadFailed = false;
    const id = url.searchParams.get('mission');
    const destParam = (url.searchParams.get('dest') ?? '').toLowerCase();
    const typeParam = (url.searchParams.get('type') ?? '').toUpperCase();
    const depParam = url.searchParams.get('dep');
    const tofParam = url.searchParams.get('tof');
    const myLoadId = ++currentLoadId;

    // /plan-driven entry: dep + tof set (no mission). dest is
    // optional — /plan omits it when the user picked the default
    // (Mars), so we coalesce missing/empty dest to 'mars'. Synthesise
    // an outbound-only arc to the chosen destination.
    if (!id && depParam !== null && tofParam !== null) {
      const destResolved = destParam || 'mars';
      if (Object.prototype.hasOwnProperty.call(DESTINATIONS, destResolved)) {
        const dest = destResolved as DestinationId;
        const type: 'LANDING' | 'FLYBY' = typeParam === 'FLYBY' ? 'FLYBY' : 'LANDING';
        const depDay = Number(depParam);
        const tofDays = Number(tofParam);
        if (Number.isFinite(depDay) && Number.isFinite(tofDays) && tofDays > 0) {
          applyPlanSelection(dest, type, depDay, tofDays);
          return;
        }
      }
    }

    const locale = localeFromPage($page);
    if (!id) {
      // No ?mission= param → fetch the locale overlay for the default
      // scenario (so non-en-US locales get translated strings); fall
      // back to the static import if even that fails.
      const s = await getScenario(DEFAULT_SCENARIO_ID, locale);
      if (myLoadId !== currentLoadId) return; // newer load superseded us
      if (s) applyScenarioAsLoaded(s);
      return;
    }

    // Try scenarios first (synthesised teaching trajectories), then
    // historical missions on Mars, then Moon. Gate the probe with the
    // known-scenarios whitelist so real mission IDs (e.g. "curiosity")
    // don't trigger a 404 round-trip and dev-server error log noise.
    if (KNOWN_SCENARIO_IDS.has(id)) {
      const scenario = await getScenario(id, locale);
      if (myLoadId !== currentLoadId) return;
      if (scenario) {
        applyScenarioAsLoaded(scenario);
        return;
      }
    }

    // Look the id up in the mission index first so we know which dest
    // folder to fetch. The previous implementation probed mars/ then
    // moon/ unconditionally, which leaked a 404 to the SvelteKit server
    // log (and the smoke test) for every Moon mission. The index is
    // tiny and aggressively cached by data.ts, so this is essentially
    // free.
    const idx = await getMissionIndex();
    if (myLoadId !== currentLoadId) return;
    const entry = idx.find((m) => m.id === id);
    if (entry) {
      const dest = missionDestToDataFolder(entry.dest);
      const m = await getMission(id, dest, locale);
      if (myLoadId !== currentLoadId) return;
      if (m) {
        // Optional: load the iconic-mission trajectory.json (the same
        // labeled-waypoints file /explore's PATHS layer uses). When
        // present, computeMissionApply uses a Catmull-Rom spline
        // through the waypoints instead of the single Keplerian
        // ellipse — the trajectory then actually passes through each
        // flyby planet at the event MET. Missing → fall back.
        let trajectoryOverride: TrajectoryOverride | undefined;
        try {
          const tres = await fetch(`${base}/data/trajectories/${id}.json`);
          if (myLoadId !== currentLoadId) return;
          if (tres.ok) {
            const traj = (await tres.json()) as { waypoints?: TrajectoryWaypoint[] };
            if (traj.waypoints && traj.waypoints.length >= 2) {
              trajectoryOverride = { waypoints: traj.waypoints };
            }
          }
        } catch {
          // Silent — most non-iconic missions don't ship a
          // trajectory.json and the spline fallback is intentional.
        }
        if (myLoadId !== currentLoadId) return;
        applyMissionAsLoaded(m, trajectoryOverride);
        return;
      }
    }

    loadFailed = true;
  }

  // Re-sync mission whenever the URL changes (back/forward, or
  // cross-route navigation that lands here with a different ?mission=).
  // ADR-024 contract: "URL is the source of truth on entry."
  //
  // Follow-up 3: dep-track ONLY $page.url; isolate the body in
  // untrack() so the many $state writes inside loadMissionFromUrl
  // (outPts, simDay, mission, isMoonMission, …) don't re-fire this
  // effect mid-run. Pre-fix the effect read $page reactively via
  // localeFromPage($page) and was thus dirty against every $page
  // mutation — that masked URL-change re-fires when the data hadn't
  // changed (rapid SPA swap V2 → V1 → A11 left mission stuck on the
  // first-arrived load while later URL changes silently dropped). The
  // source-of-truth guard also short-circuits same-URL re-fires when
  // SvelteKit batches $page updates around HMR / hover-prefetch.
  $effect(() => {
    const url = $page.url;
    untrack(() => {
      // Source-of-truth short-circuit: if URL's ?mission= matches what's
      // already loaded, skip. Avoids re-running the full apply chain on
      // unrelated $page mutations (locale switch, HMR, hover-prefetch).
      // /plan-driven entries (no ?mission, has ?dep+?tof) still re-run
      // through loadMissionFromUrl — applyPlanSelection is idempotent on
      // identical params, and currentLoadId guards in-flight races.
      const urlMissionId = url.searchParams.get('mission');
      if (urlMissionId !== null && urlMissionId === lastAppliedMissionId) return;
      void loadMissionFromUrl(url);
    });
  });

  onMount(() => {
    if (!container || !canvas2d) return;
    // DEV-only test hook so chrome-devtools-mcp can drive jumpToMet on
    // missions whose flight.events lack labels (Galileo / Juno / Voyager
    // / JUICE / Orrery Demo etc. — labeled events get timeline buttons
    // automatically; unlabeled ones don't). Mirrors __flyDebug's DEV gate.
    if (import.meta.env.DEV) {
      (window as Window & { __flyJumpToMet?: (met: number) => void }).__flyJumpToMet = jumpToMet;
      // Race-free test hook for the auto-zoom / hero-composition pipeline.
      // Unlike __flyJumpToMet, this skips the upstream input concerns
      // (iconic-moment biasing via biasJumpToIconicMoment, 700 ms snap-cut
      // via camSnapUntil, peakHold state clearing) and writes simDay +
      // pauses directly. Everything downstream — auto-zoom lerp, scene
      // render, hero detector — runs identically to a real user landing
      // at the same MET. Used by automated tests when chrome-devtools-mcp
      // shares its browser with another agent that would otherwise race
      // pause/click events. Whatever the scene composes here is also what
      // the user sees, minus the input animations.
      (window as Window & { __flySetSimDay?: (met: number) => void }).__flySetSimDay = (
        met: number,
      ) => {
        if (!Number.isFinite(met) || met < 0) return;
        simDay = mission.timeline.dep_day + met;
        isPlaying = false;
      };
      // Cislunar diagnostic snapshot — mirror of __flyDebug for the
      // cislunar branch (which is gated out of helio __flyDebug via
      // !isMoonMission). Lets automated tests see active phase,
      // camera position, and the active hero event without spelunking
      // through Three.js scene refs.
      (window as Window & { __flyCislunarDebug?: () => unknown }).__flyCislunarDebug = () => ({
        simDay,
        depDay: mission?.timeline?.dep_day,
        met: simDay - (mission?.timeline?.dep_day ?? 0),
        isMoonMission,
        cislunarTrajectory: cislunarTrajectory
          ? {
              phases: cislunarTrajectory.phases.map((p) => ({
                type: p.type,
                start: p.start_met_days,
                end: p.end_met_days,
                pointCount: p.points.length,
              })),
              closestApproachKm: cislunarTrajectory.closest_approach_km,
            }
          : null,
        camPos: {
          x: cislunarCamera?.position.x,
          y: cislunarCamera?.position.y,
          z: cislunarCamera?.position.z,
        },
        camTarget: {
          x: cislunarCamTarget.x,
          y: cislunarCamTarget.y,
          z: cislunarCamTarget.z,
        },
        camR: cislunarCamR,
        autoZoomActive,
        lastAutoZoomPhase,
        moonInScenePos: {
          x: cislunarMoon?.position.x,
          y: cislunarMoon?.position.y,
          z: cislunarMoon?.position.z,
        },
        spacecraftPos: {
          x: cislunarSpacecraft?.position.x,
          y: cislunarSpacecraft?.position.y,
          z: cislunarSpacecraft?.position.z,
        },
      });
    }

    // Single registry for every listener + disposable this scene
    // owns. /fly carries 17 layer-stop callbacks + 9 input listeners
    // + scene / texture / renderer disposes; routing them all through
    // the LIFO registry keeps the cleanup block readable.
    // See $lib/three/route-lifecycle.
    const lifecycle = createRouteLifecycle();

    // ──────────────────────────────────────────────────────────────
    // 3D — heliocentric Three.js scene. Units = AU × SCALE_3D.
    // Static scene setup (scene, camera, renderer, lights, Sun, star
    // field, Earth + destination meshes + orbit rings, destination-
    // swap method) lives in $lib/three/fly-helio-scene (W9 wave A).
    // Mission-specific layers (tubes, dep/arr markers, label sprites,
    // historical-Mars arcs, science overlays) stay in this component
    // for now — extracted in wave B as the per-frame updater factory.
    // ──────────────────────────────────────────────────────────────
    // Resolve graphics quality tier — auto-detect (cached from prior
    // session) or read user choice or URL override. Drives every
    // gross knob (pixelRatio, bloom on/off, sphere segments, particle
    // counts) so a single dial demotes the whole pipeline gracefully
    // on a low-end GPU. See src/lib/quality/quality-tier.ts.
    const quality = resolveQualitySync($page.url);
    // Surface the active tier to the Settings panel for display.
    activeQualityTier = quality.tier;
    // Kick off detect-gpu in the background; the result populates
    // localStorage so the NEXT page load can resolve the right tier
    // synchronously. First-ever visit gets a `medium` baseline.
    void kickOffBackgroundDetect();
    // Runtime adaptive — tick this once per frame inside animate().
    // The onStruggle callback surfaces a toast suggesting a demotion;
    // user decides whether to apply. Skip entirely on the `minimal`
    // tier (we're already at the floor — nothing to suggest) and when
    // the user has explicitly picked a non-auto tier (respect intent).
    const frameMonitor = attachFrameMonitor({
      onStruggle: (avg: number) => {
        const next = nextLowerTier(quality.tier);
        if (!next) return;
        perfToastAvgMs = avg;
        perfToastSuggestedTier = next;
        perfToastVisible = true;
      },
    });
    const helioHandles = buildHelioScene({
      container,
      aspect: container.clientWidth / container.clientHeight,
      quality,
      // 2026-06-06 — give /fly the same /explore-grade body imagery for
      // Sun + Earth + every destination. 2K throughout (camera here
      // sits closer than /explore but bodies are compressed, so 2K
      // matches the pixel density without a 4K LOD swap).
      bodyTextures: {
        sun: `${base}/textures/2k_sun.jpg`,
        earth: `${base}/textures/2k_earth_daymap.jpg`,
        mercury: `${base}/textures/2k_mercury.jpg`,
        venus: `${base}/textures/2k_venus_atmosphere.jpg`,
        mars: `${base}/textures/2k_mars.jpg`,
        jupiter: `${base}/textures/2k_jupiter.jpg`,
        saturn: `${base}/textures/2k_saturn.jpg`,
        uranus: `${base}/textures/2k_uranus.jpg`,
        neptune: `${base}/textures/2k_neptune.jpg`,
        pluto: `${base}/textures/4k_pluto.jpg`,
        // No Ceres texture in the catalogue today — falls back to the
        // DEST_STYLE colour. Add `2k_ceres.jpg` to the texture pack to
        // light it up automatically.
      },
    });
    const scene = helioHandles.scene;
    const camera = helioHandles.camera;
    const renderer = helioHandles.renderer;
    // Expose to the DebugPanel "Rendering" tab (#334) — the template-
    // mounted <RenderingDebugRegistrar> picks these up reactively.
    // bloomPass is null on minimal/low tiers (no bloom built); the
    // Rendering tab degrades gracefully (sliders hidden, on/off flag
    // falls back to the static quality value).
    liveRenderer = renderer;
    liveQuality = quality;
    liveQualitySource = resolveQualitySource($page.url);
    liveBloomPass = helioHandles.bloomPass;
    liveBokehPass = helioHandles.bokehPass;
    liveFilmPass = helioHandles.filmPass;
    liveVignettePass = helioHandles.vignettePass;
    liveSkydomeMesh = helioHandles.skydomeMesh;
    liveSunLensFlareGroup = helioHandles.sunLensFlare?.group ?? null;
    liveFrameMonitor = frameMonitor;
    const sunCore = helioHandles.sunCore;
    const sunGlow = helioHandles.sunGlow;
    const earthMesh = helioHandles.earthMesh;
    const marsMesh = helioHandles.destinationMesh;
    const earthOrbitLine = helioHandles.earthOrbitLine;
    const applyDestinationVisuals = helioHandles.setDestination;

    // ──────────────────────────────────────────────────────────────
    // Cislunar scene (ADR-058) — Earth-centred, km-scale. Static
    // construction (scene, camera, lights, Earth+Moon meshes, SoI
    // rings) lives in $lib/three/fly-cislunar-scene (W9 wave 8).
    // Layer-toggle subscription stays here because it owns the
    // cleanup contract for onDestroy.
    // ──────────────────────────────────────────────────────────────
    const cislunarHandles = buildCislunarScene({
      aspect: container.clientWidth / container.clientHeight,
      earthTextureUrl: `${base}/textures/2k_earth_daymap.jpg`,
      earthTextureUrl4k: `${base}/textures/4k_earth_daymap.jpg`,
      moonTextureUrl: `${base}/textures/2k_moon.jpg`,
      moonTextureUrl4k: `${base}/textures/4k_moon.jpg`,
    });
    const cislunarScene = cislunarHandles.scene;
    const cislunarCamera = cislunarHandles.camera;
    const SCALE_CISLUNAR = cislunarHandles.scaleCislunar;
    const cislunarMoon = cislunarHandles.moon;
    const cislunarEarthSoI = cislunarHandles.earthSoI;
    const cislunarMoonSoI = cislunarHandles.moonSoI;

    // Subscribe to the 'soi' layer toggle so checking/unchecking in
    // the Science Layers panel actually flips ring visibility.
    const stopSoiLayerCislunar = onLayerChange('soi', (on) => {
      cislunarEarthSoI.visible = on;
      cislunarMoonSoI.visible = on;
    });

    // ─── Cislunar Science Layers (ADR-058 follow-up) ─────────────────
    // Overlay object construction (gravity / velocity / centripetal
    // arrows + apsides markers + coast line) moved to the scene
    // builder; component owns the per-layer subscriptions and the
    // per-frame position / direction updates.
    const cisGravEarthArrow = cislunarHandles.overlays.gravityEarth;
    const cisGravMoonArrow = cislunarHandles.overlays.gravityMoon;
    const cisVelocityArrow = cislunarHandles.overlays.velocity;
    const cisCentripetalArrow = cislunarHandles.overlays.centripetal;
    const cisPeriMarker = cislunarHandles.overlays.periMarker;
    const cisApoMarker = cislunarHandles.overlays.apoMarker;
    const cisCoastLine = cislunarHandles.overlays.coastLine;

    const stopGravityLayerCislunar = onLayerChange('gravity', (on) => {
      cisGravEarthArrow.visible = on;
      cisGravMoonArrow.visible = on;
    });
    const stopVelocityLayerCislunar = onLayerChange('velocity', (on) => {
      cisVelocityArrow.visible = on;
    });
    const stopCentripetalLayerCislunar = onLayerChange('centripetal', (on) => {
      cisCentripetalArrow.visible = on;
    });
    const stopApsidesLayerCislunar = onLayerChange('apsides', (on) => {
      cisPeriMarker.visible = on;
      cisApoMarker.visible = on;
    });
    const stopCoastLayerCislunar = onLayerChange('coast', (on) => {
      cisCoastLine.visible = on;
    });

    // Stars for the cislunar scene — sparser, pushed further out.
    {
      const CIS_STAR_COUNT = 1500;
      const arr = new Float32Array(CIS_STAR_COUNT * 3);
      for (let i = 0; i < CIS_STAR_COUNT; i++) {
        const rs = 200 + Math.random() * 100;
        const ts = Math.random() * Math.PI * 2;
        const ps = Math.acos(2 * Math.random() - 1);
        arr[i * 3] = rs * Math.sin(ps) * Math.cos(ts);
        arr[i * 3 + 1] = rs * Math.sin(ps) * Math.sin(ts);
        arr[i * 3 + 2] = rs * Math.cos(ps);
      }
      const gs = new THREE.BufferGeometry();
      gs.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      cislunarScene.add(
        new THREE.Points(
          gs,
          new THREE.PointsMaterial({
            color: 0xdde4ff,
            size: 0.7,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.6,
          }),
        ),
      );
    }

    // Trajectory lines — one Three.js Line per phase, color-coded by
    // phase type. Lines are mutated in-place when the mission changes
    // (geometry.setFromPoints + needsUpdate) so we don't churn the
    // scene graph on each mission load.
    const CISLUNAR_PHASE_COLORS: Record<string, number> = {
      parking: 0x4b9cd3,
      tli_coast: 0xffd166,
      lunar_orbit: 0xc77dff,
      lunar_flyby: 0xff9933,
      descent: 0xef476f,
      ascent: 0xef476f,
      tei_coast: 0x06d6a0,
      reentry: 0xef476f,
      spiral_earth: 0x4b9cd3,
      spiral_lunar: 0xc77dff,
    };
    const cislunarPhaseLines: Map<string, THREE.Line> = new Map();
    // Lunar-phase lines live inside a Group that rides with the Moon.
    // The orbit / spiral_lunar / descent / ascent points are stored in
    // Moon-relative coords (= absolute_pt - moonAtFlyby × SCALE_CISLUNAR),
    // and the group's position is updated each frame to
    // (currentMoon - moonAtFlyby) × SCALE_CISLUNAR. End result: the
    // orbit ring tracks the Moon as it drifts forward through ECI,
    // instead of staying anchored where the Moon was at flyby_day.
    const cislunarMoonFrameGroup = new THREE.Group();
    cislunarScene.add(cislunarMoonFrameGroup);
    const LUNAR_LOCAL_PHASE_TYPES = new Set<string>([
      'lunar_orbit',
      'spiral_lunar',
      'lunar_flyby',
      'descent',
      'ascent',
    ]);
    /** v0.6.3 #228b: cislunar lines get the same shader-gradient
     *  treatment as the heliocentric tubes (#228). Per-vertex `aT`
     *  attribute, uProgress uniform driven per-frame from met_days;
     *  fragment paints bright (visited) ahead of uProgress, dim
     *  (preview) behind. Boundary lands at spacecraft sprite by
     *  construction (same lerp parameterization on both sides). */
    const buildCislunarLineMaterial = (colorHex: number): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(colorHex) },
          uBrightOpacity: { value: 0.95 },
          uDimOpacity: { value: 0.22 },
        },
        vertexShader: `
          attribute float aT;
          varying float vT;
          void main() {
            vT = aT;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uProgress;
          uniform vec3 uColor;
          uniform float uBrightOpacity;
          uniform float uDimOpacity;
          varying float vT;
          void main() {
            // Past-vs-future split — see helio buildTubeMaterial for
            // the rationale. Past at full uColor, future at 30%-mixed
            // dim. Same alpha-discard gate keeps depth-test correct.
            bool past = vT < uProgress;
            vec3 dimColor = uColor * 0.28;
            vec3 finalColor = past ? uColor : dimColor;
            float a = past ? uBrightOpacity : uDimOpacity;
            if (a < 0.05) discard;
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: false,
        depthWrite: true,
      });
    function ensureCislunarPhaseLine(type: string): THREE.Line {
      const existing = cislunarPhaseLines.get(type);
      if (existing) return existing;
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        buildCislunarLineMaterial(CISLUNAR_PHASE_COLORS[type] ?? 0xffffff),
      );
      if (LUNAR_LOCAL_PHASE_TYPES.has(type)) {
        cislunarMoonFrameGroup.add(line);
      } else {
        cislunarScene.add(line);
      }
      cislunarPhaseLines.set(type, line);
      return line;
    }

    // Spacecraft marker for the cislunar scene. Sprite-based so it
    // stays constant size on-screen regardless of cislunar camera zoom
    // (the prior sphere was 0.08 scene units = ~4% of Earth's visual
    // size, invisible). Red filled circle + soft halo, matching the
    // heliocentric scSprite glyph for visual consistency. Red is
    // distinct from every phase colour so the spacecraft never blends
    // into its own trail.
    const CIS_GLYPH_PX = 64;
    const cisScCanvas = document.createElement('canvas');
    cisScCanvas.width = CIS_GLYPH_PX;
    cisScCanvas.height = CIS_GLYPH_PX;
    {
      const tctx = cisScCanvas.getContext('2d')!;
      tctx.clearRect(0, 0, CIS_GLYPH_PX, CIS_GLYPH_PX);
      const cx = CIS_GLYPH_PX / 2;
      const cy = CIS_GLYPH_PX / 2;
      const glow = tctx.createRadialGradient(cx, cy, 4, cx, cy, CIS_GLYPH_PX / 2);
      glow.addColorStop(0, 'rgba(255,58,76,0.4)');
      glow.addColorStop(1, 'rgba(255,58,76,0)');
      tctx.fillStyle = glow;
      tctx.fillRect(0, 0, CIS_GLYPH_PX, CIS_GLYPH_PX);
      tctx.beginPath();
      tctx.arc(cx, cy, CIS_GLYPH_PX * 0.22, 0, Math.PI * 2);
      tctx.fillStyle = 'rgba(20,8,12,0.9)';
      tctx.fill();
      tctx.beginPath();
      tctx.arc(cx, cy, CIS_GLYPH_PX * 0.18, 0, Math.PI * 2);
      tctx.fillStyle = '#ff3a4c';
      tctx.shadowColor = 'rgba(255,58,76,0.8)';
      tctx.shadowBlur = 4;
      tctx.fill();
      const innerGlow = tctx.createRadialGradient(
        cx - CIS_GLYPH_PX * 0.05,
        cy - CIS_GLYPH_PX * 0.05,
        0,
        cx,
        cy,
        CIS_GLYPH_PX * 0.18,
      );
      innerGlow.addColorStop(0, 'rgba(255,200,200,0.7)');
      innerGlow.addColorStop(1, 'rgba(255,200,200,0)');
      tctx.shadowBlur = 0;
      tctx.fillStyle = innerGlow;
      tctx.beginPath();
      tctx.arc(cx, cy, CIS_GLYPH_PX * 0.18, 0, Math.PI * 2);
      tctx.fill();
    }
    const cisScTex = new THREE.CanvasTexture(cisScCanvas);
    cisScTex.minFilter = THREE.LinearFilter;
    cisScTex.magFilter = THREE.LinearFilter;
    const cislunarSpacecraft = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cisScTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    // Sprite scale is dynamic — adjusted each frame in updateCislunarCam
    // to be proportional to cislunarCamR so the sprite's on-screen size
    // stays roughly constant whether the camera is at wide or close-up
    // zoom. At wide (camR ≈ 69) the sprite is ~1u; at close-up (camR
    // ≈ 3.5) it shrinks to ~0.05u, keeping the same angular size.
    cislunarSpacecraft.scale.set(1, 1, 1);
    cislunarSpacecraft.renderOrder = 999;
    cislunarScene.add(cislunarSpacecraft);

    // Phase-boundary ∆v annotation sprites (ADR-058 Stage 3). Rendered
    // only when the Science Lens is on. Each label is a small canvas
    // texture so any number can be allocated cheaply.
    const cislunarAnnotations: THREE.Sprite[] = [];
    function buildAnnotationSprite(line1: string, line2: string, accentHex: string): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.shadowColor = 'rgba(0,0,0,0.9)';
        ctx2.shadowBlur = 6;
        ctx2.fillStyle = accentHex;
        ctx2.font = "bold 22px 'Space Mono', monospace";
        ctx2.textAlign = 'center';
        ctx2.fillText(line1, canvas.width / 2, 36);
        ctx2.fillStyle = '#e6ecff';
        ctx2.font = "18px 'Space Mono', monospace";
        ctx2.fillText(line2, canvas.width / 2, 66);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false }),
      );
      sprite.scale.set(8, 3, 1);
      return sprite;
    }
    function clearCislunarAnnotations(): void {
      for (const s of cislunarAnnotations) {
        cislunarScene.remove(s);
        s.material.map?.dispose();
        s.material.dispose();
      }
      cislunarAnnotations.length = 0;
    }
    function rebuildCislunarAnnotations(
      traj: CislunarTrajectory | null,
      profile: import('$lib/orbital/cislunar/cislunar-geometry').CislunarProfile | undefined,
    ): void {
      clearCislunarAnnotations();
      if (!traj) return;
      // Find phase boundaries to annotate. Each entry: { phaseType, line1, line2, accent }.
      const annotations: Array<{
        position: Vec3Km;
        line1: string;
        line2: string;
        accent: string;
      }> = [];

      // TLI burn — start of the first tli_coast / spiral_earth phase.
      const tliPhase = traj.phases.find((p) => p.type === 'tli_coast' || p.type === 'spiral_earth');
      const tliDv = profile?.tli?.dv_kms;
      if (tliPhase && tliPhase.points.length > 0 && tliDv != null) {
        annotations.push({
          position: tliPhase.points[0],
          line1: 'TLI',
          line2: `${tliDv.toFixed(2)} km/s`,
          accent: '#ffd166',
        });
      }

      // Periselene / closest approach — visible for free-return + hybrid.
      // For phase type 'tli_coast' the apogee (last point) IS the closest
      // approach to the Moon. Skip if we have a separate lunar_orbit phase
      // (LOI annotation covers it).
      const hasLunarPhase = traj.phases.some(
        (p) => p.type === 'lunar_orbit' || p.type === 'spiral_lunar',
      );
      if (!hasLunarPhase && tliPhase && profile?.lunar_arrival?.periselene_km != null) {
        const last = tliPhase.points[tliPhase.points.length - 1];
        annotations.push({
          position: last,
          line1: 'PERISELENE',
          line2: `${profile.lunar_arrival.periselene_km.toLocaleString()} km`,
          accent: '#ff9933',
        });
      }

      // LOI — start of lunar_orbit, with the orbit insertion ∆v.
      const lunarPhase = traj.phases.find((p) => p.type === 'lunar_orbit');
      const loiDv =
        profile?.lunar_arrival?.type === 'orbit' || profile?.lunar_arrival?.type === 'lor_orbit'
          ? // No dedicated field; pull from flight.arrival.orbit_insertion_dv_km_s via mission state.
            mission.flight?.arrival?.orbit_insertion_dv_km_s
          : undefined;
      if (lunarPhase && lunarPhase.points.length > 0 && loiDv != null) {
        annotations.push({
          position: lunarPhase.points[0],
          line1: 'LOI',
          line2: `${loiDv.toFixed(2)} km/s`,
          accent: '#c77dff',
        });
      }

      // TEI — start of tei_coast.
      const teiPhase = traj.phases.find((p) => p.type === 'tei_coast');
      const teiDv = profile?.return?.dv_kms;
      if (teiPhase && teiPhase.points.length > 0 && teiDv != null) {
        annotations.push({
          position: teiPhase.points[0],
          line1: 'TEI',
          line2: `${teiDv.toFixed(2)} km/s`,
          accent: '#06d6a0',
        });
      }

      for (const a of annotations) {
        const sprite = buildAnnotationSprite(a.line1, a.line2, a.accent);
        sprite.position.set(
          a.position.x * SCALE_CISLUNAR,
          a.position.y * SCALE_CISLUNAR + 2,
          a.position.z * SCALE_CISLUNAR,
        );
        cislunarScene.add(sprite);
        cislunarAnnotations.push(sprite);
      }
      // Visibility follows the global lens state.
      const lensOn = isScienceLensOn();
      for (const s of cislunarAnnotations) s.visible = lensOn;
    }
    const stopLensWatch = onScienceLensChange((on) => {
      for (const s of cislunarAnnotations) s.visible = on;
    });

    function rebuildCislunarLines(traj: CislunarTrajectory | null): void {
      for (const line of cislunarPhaseLines.values()) line.visible = false;
      if (!traj) {
        cislunarSpacecraft.visible = false;
        cislunarMoon.visible = false;
        return;
      }
      cislunarSpacecraft.visible = true;
      cislunarMoon.visible = true;
      // Reference Moon position used when this mission's trajectory
      // was built — lunar phase points are absolute in ECI but anchored
      // to where the Moon was at flyby_day. We subtract this reference
      // to get Moon-relative points and put them in the moon-frame
      // group so the orbit + descent track the moving Moon mesh.
      const moonAtFlybyRef = moonEciPos(arcTimeline.flyby_day);
      for (const phase of traj.phases) {
        const line = ensureCislunarPhaseLine(phase.type);
        const lunarLocal = LUNAR_LOCAL_PHASE_TYPES.has(phase.type);
        const n = phase.points.length;
        const verts = new Float32Array(n * 3);
        const aTArr = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const p = phase.points[i];
          const x = lunarLocal ? p.x - moonAtFlybyRef.x : p.x;
          const y = lunarLocal ? p.y - moonAtFlybyRef.y : p.y;
          const z = lunarLocal ? p.z - moonAtFlybyRef.z : p.z;
          verts[i * 3] = x * SCALE_CISLUNAR;
          verts[i * 3 + 1] = y * SCALE_CISLUNAR;
          verts[i * 3 + 2] = z * SCALE_CISLUNAR;
          aTArr[i] = n > 1 ? i / (n - 1) : 0;
        }
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry();
        line.geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        line.geometry.setAttribute('aT', new THREE.BufferAttribute(aTArr, 1));
        // Reset uProgress on rebuild; the per-frame updater will set
        // it correctly next tick based on current met_days.
        const mat = line.material as THREE.ShaderMaterial;
        mat.uniforms.uProgress.value = 0;
        line.visible = true;
      }
    }

    /** Per-frame: drive each phase line's uProgress uniform from the
     *  spacecraft's met_days. Phases fully behind the spacecraft are
     *  bright (uProgress=1); ahead are dim (uProgress=0); the active
     *  phase is mid-gradient. Mirrors the heliocentric outLine/retLine
     *  treatment from #228. */
    function updateCislunarLineProgress(traj: CislunarTrajectory | null, met_days: number): void {
      if (!traj) return;
      for (const phase of traj.phases) {
        const line = cislunarPhaseLines.get(phase.type);
        if (!line) continue;
        const mat = line.material as THREE.ShaderMaterial;
        const span = phase.end_met_days - phase.start_met_days;
        let progress: number;
        if (span <= 0) progress = met_days >= phase.end_met_days ? 1 : 0;
        else if (met_days <= phase.start_met_days) progress = 0;
        else if (met_days >= phase.end_met_days) progress = 1;
        else progress = (met_days - phase.start_met_days) / span;
        mat.uniforms.uProgress.value = progress;
      }
    }

    function updateCislunarSpacecraft(traj: CislunarTrajectory | null, met_days: number): void {
      if (!traj || traj.phases.length === 0) return;
      let phase = traj.phases[0];
      for (const p of traj.phases) {
        if (met_days >= p.start_met_days && met_days <= p.end_met_days) {
          phase = p;
          break;
        }
      }
      const span = phase.end_met_days - phase.start_met_days;
      const t = span > 0 ? Math.max(0, Math.min(1, (met_days - phase.start_met_days) / span)) : 0;
      const last = phase.points.length - 1;
      const f = t * last;
      const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
      const frac = f - i;
      const a = phase.points[i];
      const b = phase.points[i + 1] ?? a;
      // For lunar-local phases, the sprite rides with the Moon. Add
      // (currentMoon - moonAtFlyby) so its position tracks the moving
      // Moon mesh — same offset the moonFrameGroup applies to lines.
      let offsetX = 0;
      let offsetY = 0;
      let offsetZ = 0;
      if (LUNAR_LOCAL_PHASE_TYPES.has(phase.type)) {
        const moonNow = moonEciPos(arcTimeline.dep_day + met_days);
        const moonRef = moonEciPos(arcTimeline.flyby_day);
        offsetX = moonNow.x - moonRef.x;
        offsetY = moonNow.y - moonRef.y;
        offsetZ = moonNow.z - moonRef.z;
      }
      cislunarSpacecraft.position.set(
        (a.x + (b.x - a.x) * frac + offsetX) * SCALE_CISLUNAR,
        (a.y + (b.y - a.y) * frac + offsetY) * SCALE_CISLUNAR,
        (a.z + (b.z - a.z) * frac + offsetZ) * SCALE_CISLUNAR,
      );
    }

    // Expose to outer scope so applyMissionAsLoaded can call rebuild
    // when a Moon mission's cislunar_profile lands.
    // Cislunar closures published via flyUpdaters.cislunar at end of onMount.
    cislunarMoonMeshRef = cislunarMoon;
    cislunarMoonFrameGroupRef = cislunarMoonFrameGroup;

    // Sun + star field + orbit rings: built by the helio scene builder
    // (W9 wave A); refs already destructured into scope above.

    // v0.6.3 #228 rewrite: ONE tube per leg. The fragment shader paints
    // each fragment bright (visited) if vT < uProgress, dim (preview)
    // otherwise. uProgress is set each frame from outFraction /
    // retFraction. Why this works where the v0.1.10 four-tube +
    // drawRange + vertex-mutation approach didn't:
    //
    //   1. Cross-sections sit at EXACTLY pts[i] (manual builder below,
    //      NOT THREE.TubeGeometry — TubeGeometry sampled the curve via
    //      getPointAt(arc-length) which disagreed with lerpPoint at
    //      uniform-t for Kepler ellipses sampled at uniform true
    //      anomaly; that's what caused the 0.5 → 20.3 scene-unit
    //      sprite-vs-tube-tip gap visible in the v0.6.2 debug log).
    //   2. Each vertex carries `aT = i / (pts.length - 1)`, the same
    //      parameter the sprite uses (sc.pos = lerpPoint(pts, t)).
    //   3. Fragment interpolation of vT crosses uProgress at exactly
    //      the same world position as lerpPoint(pts, uProgress) —
    //      i.e. where the sprite sits. No drift possible by construction.
    /** Manual tube builder. Cross-section i sits at pts[i]; vertex
     *  carries aT = i/(N-1). Returns empty geometry for <2 pts. */
    const buildTubeGeometry = (pts: Vec2[], radius: number): THREE.BufferGeometry => {
      const geom = new THREE.BufferGeometry();
      if (pts.length < 2) return geom;
      const radialSegs = 8;
      const ringCount = pts.length;
      const vertsPerRing = radialSegs + 1; // duplicate at theta=0/2π for UV seam
      const totalVerts = ringCount * vertsPerRing;
      const positions = new Float32Array(totalVerts * 3);
      const aTArr = new Float32Array(totalVerts);
      for (let i = 0; i < ringCount; i++) {
        const p = pts[i];
        // Tangent computation uses the XZ projection (the arc's
        // dominant plane for cross-section orientation). Y component
        // is included in the point's world position so multi-waypoint
        // splines that climb out of the ecliptic (Cassini → Jupiter
        // → Saturn, Voyager → Neptune) render with the right vertical
        // shape; the cross-section ring still sits flat to XZ.
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(ringCount - 1, i + 1)];
        const tx = next.x - prev.x;
        const tz = next.z - prev.z;
        const tLen = Math.hypot(tx, tz) || 1;
        // Side vector = tangent rotated 90° in XZ.
        const sNx = -tz / tLen;
        const sNz = tx / tLen;
        const py = (p.y ?? 0) * SCALE_3D;
        const t = i / (ringCount - 1);
        for (let r = 0; r <= radialSegs; r++) {
          const theta = (r / radialSegs) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const idx = i * vertsPerRing + r;
          positions[idx * 3 + 0] = p.x * SCALE_3D + radius * sinT * sNx;
          positions[idx * 3 + 1] = py + radius * cosT;
          positions[idx * 3 + 2] = p.z * SCALE_3D + radius * sinT * sNz;
          aTArr[idx] = t;
        }
      }
      const indices: number[] = [];
      for (let i = 0; i < ringCount - 1; i++) {
        for (let r = 0; r < radialSegs; r++) {
          const a = i * vertsPerRing + r;
          const b = (i + 1) * vertsPerRing + r;
          const c = (i + 1) * vertsPerRing + r + 1;
          const d = i * vertsPerRing + r + 1;
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
      geom.setIndex(indices);
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('aT', new THREE.BufferAttribute(aTArr, 1));
      geom.computeVertexNormals();
      return geom;
    };
    /** Gradient ShaderMaterial. `vT < uProgress` → bright, else dim.
     *  Fragment interpolation of vT puts the bright/dim boundary at
     *  exactly the same world position as the sprite. */
    const buildTubeMaterial = (
      colorHex: number,
      brightOpacity: number,
      dimOpacity: number,
    ): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(colorHex) },
          uBrightOpacity: { value: brightOpacity },
          uDimOpacity: { value: dimOpacity },
        },
        vertexShader: `
          attribute float aT;
          varying float vT;
          void main() {
            vT = aT;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uProgress;
          uniform vec3 uColor;
          uniform float uBrightOpacity;
          uniform float uDimOpacity;
          varying float vT;
          void main() {
            // Past-vs-future split — past segments render at full
            // uColor, future segments at a 30%-mixed dim version of
            // the same hue so the trajectory clearly reads "what's
            // behind us is bright, what's ahead is faded preview."
            // Opaque-pass with alpha=1 (and a no-op uBrightOpacity/
            // uDimOpacity kept for back-compat with the prior shader
            // contract) so depth-test still hides line segments
            // behind planet bodies during flyby (#85).
            bool past = vT < uProgress;
            vec3 dimColor = uColor * 0.28;
            vec3 finalColor = past ? uColor : dimColor;
            float a = past ? uBrightOpacity : uDimOpacity;
            if (a < 0.05) discard;
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: false,
        depthWrite: true,
      });
    outLine = new THREE.Mesh(
      buildTubeGeometry(outPts, 0.3),
      buildTubeMaterial(0x4488ff, 0.95, 0.22),
    );
    retLine = new THREE.Mesh(
      buildTubeGeometry(retPts, 0.25),
      buildTubeMaterial(0x9966ff, 0.9, 0.2),
    );
    scene.add(outLine);
    scene.add(retLine);
    // Hoist the builder so the $effect can re-use it on mission swap.
    // buildTubeGeometry published via flyUpdaters.helio at end of onMount.

    // earthMesh + destination mesh (`marsMesh` for historic reasons),
    // orbit rings, DEST_STYLE catalogue, and the destination-swap
    // method all live in $lib/three/fly-helio-scene (W9 wave A). Refs
    // already destructured from helioHandles above. The historical-
    // Mars arcs visibility toggle is wired via the onDestinationChange
    // callback at builder construction.
    // applyDestinationVisuals published via flyUpdaters.helio at end of onMount.

    // ─── Science Layers G.2 — SoI rings around Earth + Mars ──────────
    // Sized by physical SoI radii (Earth 924 000 km, Mars 577 000 km)
    // mapped through SCALE_3D (1 AU = 80 scene units), so the ring
    // matches the actual transition the spacecraft experiences.
    // SoI radii are tiny at physical scale (Earth's 924 000 km →
    // 0.49 scene units at SCALE_3D=80), invisible at the default
    // camera distance of 360. 8× visual boost keeps the relative
    // proportions correct (Earth SoI > Mars SoI) while making the
    // rings actually readable when the lens is on.
    const SOI_VISUAL_BOOST = 8;
    const earthSoI = buildSoIRing(
      'earth',
      soiRadiusInScene('earth', SCALE_3D) * SOI_VISUAL_BOOST,
      0x6aa9ff,
    );
    const marsSoI = buildSoIRing(
      'mars',
      soiRadiusInScene('mars', SCALE_3D) * SOI_VISUAL_BOOST,
      0xff8866,
    );
    // Moon SoI for cislunar missions. The real Moon SoI is 66 100 km
    // = 0.035 scene units at heliocentric scale — invisible even with
    // the standard ×8 boost. Hand-tuned to 3.0u so it sits visibly
    // around the 2.0u Moon mesh and reads as a clear "you crossed into
    // the Moon's gravity well" cue when the spacecraft approaches.
    // Hidden in non-Moon modes (animate loop toggles visibility per
    // isMoonMission alongside the moonOrbitRing).
    const moonSoI = buildSoIRing('moon', 3.0, 0xcfcfcf);
    scene.add(earthSoI);
    scene.add(marsSoI);
    scene.add(moonSoI);

    // ─── Science Layers G.3 — Gravity arrows on the spacecraft ───────
    // Two ArrowHelpers parented to the scene; positioned + reoriented
    // each frame to point from sc.pos toward Earth and Sun respectively.
    // Length is log-scaled by acceleration magnitude so both stay visible
    // through the entire transit.
    const gravArrowEarth = buildGravityArrow('earth', 0x6aa9ff);
    const gravArrowSun = buildGravityArrow('sun', 0xffc850);
    scene.add(gravArrowEarth);
    scene.add(gravArrowSun);

    // Velocity tangent + centripetal arrows on the spacecraft — Phase H
    // gap-fill. Velocity is tangent to motion (teal), centripetal points
    // inward toward the Sun (red, paired with gravity). Lengths are
    // updated per frame in the animate() loop.
    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      8,
      0x4ecdc4,
      1.4,
      0.8,
    );
    const centripetalArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      8,
      0xff6b6b,
      1.4,
      0.8,
    );
    velocityArrow.userData.layerKey = 'velocity';
    centripetalArrow.userData.layerKey = 'centripetal';
    velocityArrow.visible = false;
    centripetalArrow.visible = false;
    scene.add(velocityArrow);
    scene.add(centripetalArrow);

    // Layer-state listeners: flip visibility on each layer toggle. The
    // listeners are returned as unsubs in cleanupThree below.
    // Cached "is the SoI layer currently on?" so the mission-swap
    // $effect below can re-apply the right visibility split when
    // isMoonMission flips without needing to consult the DOM each time.
    let soiLayerOn = false;
    const stopSoiLayer = onLayerChange('soi', (on) => {
      // Earth's SoI shows for every mission (the spacecraft always
      // departs from inside it). Mars + Moon rings each show only
      // when their body is the live destination — Mars in heliocentric
      // missions, Moon in cislunar — so the ring you see is the one
      // whose gravity well actually matters for this flight.
      soiLayerOn = on;
      earthSoI.visible = on;
      // marsSoI ring is sized for Mars's SoI radius — gate on the
      // active destination so it doesn't visually pretend to surround
      // Jupiter / Neptune / Pluto / Ceres at the wrong scale.
      marsSoI.visible = on && !isMoonMission && activeDestination === 'mars';
      moonSoI.visible = on && isMoonMission;
    });
    const stopGravityLayer = onLayerChange('gravity', (on) => {
      gravArrowEarth.visible = on;
      gravArrowSun.visible = on;
    });
    const stopFlyVelocityLayer = onLayerChange('velocity', (on) => {
      velocityArrow.visible = on;
    });
    const stopFlyCentripetalLayer = onLayerChange('centripetal', (on) => {
      centripetalArrow.visible = on;
    });

    // ─── Science Layers G.5 — Engine-off coast preview ───────────────
    // Dashed line projecting the spacecraft's heliocentric coast
    // forward 200 days from the current sim moment. Recomputed each
    // frame from finite-difference velocity, integrated under Sun
    // gravity only.
    const coastLine = buildCoastLine(0xffc850);
    scene.add(coastLine);
    const stopCoastLayer = onLayerChange('coast', (on) => {
      coastLine.visible = on;
    });

    // ─── Science Layers H.4 — Apsides markers on the transfer arc ────
    // Find the heliocentric ellipse's perihelion (closest to Sun) and
    // aphelion (farthest) from outPts and place small marker spheres
    // at each. Geometry recomputed via $effect when outPts changes
    // (mission swap). Layer-gated.
    const periMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.85,
        // Always-on-top so the perihelion marker stays visible when it
        // coincides with Earth at t=launch (peri ≈ Earth's orbital
        // distance for an inbound-Hohmann; the marker would otherwise
        // sit inside the Earth sphere and read as missing). Keeps the
        // apsides pair symmetric — aphelion at Mars's arrival point is
        // already exposed because Mars hasn't reached that point yet.
        depthTest: false,
      }),
    );
    const apoMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x6aa9ff,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      }),
    );
    periMarker.renderOrder = 999;
    apoMarker.renderOrder = 999;
    periMarker.userData.layerKey = 'apsides';
    apoMarker.userData.layerKey = 'apsides';
    periMarker.visible = false;
    apoMarker.visible = false;
    scene.add(periMarker);
    scene.add(apoMarker);

    function recomputeApsides() {
      // Heliocentric trips: centre = Sun at (0,0). Cislunar: centre =
      // Earth at its current heliocentric xz (Sun-relative apsides
      // collapse when both endpoints are at ~1 AU). The pure index-
      // finder lives in $lib/orbital/find-apsides; this closure just
      // wires the THREE.js marker positions to the result.
      const centreX = isMoonMission ? earthPos(simDay).x : 0;
      const centreZ = isMoonMission ? earthPos(simDay).z : 0;
      const apsides = findApsidesIndices(outPts, centreX, centreZ);
      if (!apsides) return;
      const peri = outPts[apsides.periIdx];
      const apo = outPts[apsides.apoIdx];
      periMarker.position.set(peri.x * SCALE_3D, 0, peri.z * SCALE_3D);
      apoMarker.position.set(apo.x * SCALE_3D, 0, apo.z * SCALE_3D);
    }
    recomputeApsides();
    // recomputeApsides published via flyUpdaters.helio at end of onMount (W9 wave B).

    const stopApsidesLayer = onLayerChange('apsides', (on) => {
      periMarker.visible = on;
      apoMarker.visible = on;
    });
    // Hill sphere + Lagrange L1 / L2 overlays — wireframe shells + gold
    // markers around every planet. Mirrors /explore (PRD-023 Slice B).
    const stopHillSphereLayer = onLayerChange('hill-sphere', (on) => {
      helioHandles.setHillSpheresVisible(on);
    });
    const stopLagrangeLayer = onLayerChange('lagrange-points', (on) => {
      helioHandles.setLagrangePointsVisible(on);
    });
    const stopMagnetosphereLayer = onLayerChange('magnetosphere', (on) => {
      helioHandles.setMagnetospheresVisible(on);
    });
    // Major moons overlay — Galilean at Jupiter, Titan-Enceladus-Iapetus
    // at Saturn, the Moon at Earth, Phobos/Deimos at Mars, Triton at
    // Neptune. Gated on the science-lens master toggle; hidden by
    // default. Briefly defaulted visible during polish wave 2 — the
    // orbit rings + moon dots read as distraction during the flyby
    // cinema, fighting the ship-as-hero composition. Back to lens-
    // gated: users who want moons turn the science lens on.
    //
    // cinemaForceMoons + lastLayerMoonsOn are hoisted here (rather than
    // declared further down with the other helio-loop state) because
    // onLayerChange invokes its callback SYNCHRONOUSLY during
    // subscription (science-layers.ts:137) — if we declared them
    // below this call, the synchronous emit would hit a TDZ
    // ReferenceError, the animate loop would never start, and the
    // whole canvas would render blank.
    let cinemaForceMoons = false;
    let lastLayerMoonsOn = false;
    const stopMoonsLayer = onLayerChange('moons', (on) => {
      lastLayerMoonsOn = on;
      // #2 — during flyby cinema we force moons visible regardless of
      // the layer state; the cinema-enter/exit transitions handle the
      // visibility flip. Outside cinema the layer state wins.
      if (!cinemaForceMoons) helioHandles.setMoonsVisible(on);
    });

    // Moon mesh for Moon-mission mode (Apollo, Luna, Chang'e, etc.).
    // Hidden by default; shown only when isMoonMission is true.
    const moonTexLoader = new THREE.TextureLoader();
    const moonTex = moonTexLoader.load(`${base}/textures/2k_moon.jpg`);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshPhongMaterial({ map: moonTex, color: 0xffffff, shininess: 4 }),
    );
    moonMesh.visible = false;
    scene.add(moonMesh);

    // Spacecraft — small camera-facing sprite glyph at sc.pos. Satellite
    // billboard: red rounded body + two gold solar-panel wings + a tiny
    // white antenna stub, surrounded by a soft red glow halo. Rendered
    // as a THREE.Sprite so it's always face-camera — no orbital
    // rotation math, sidestepping the chevron's "wrong direction"
    // problem on curved arcs. The red body preserves the visibility
    // the prior circle gave; the gold wings carry the spacecraft
    // identity, matching the FD banner palette.
    const SC_GLYPH_PX = 64;
    const SC_COLOR_BODY = '#ff3a4c';
    const SC_COLOR_PANEL = '#ffc850';
    const scTexCanvas = document.createElement('canvas');
    scTexCanvas.width = SC_GLYPH_PX;
    scTexCanvas.height = SC_GLYPH_PX;
    {
      const tctx = scTexCanvas.getContext('2d')!;
      tctx.clearRect(0, 0, SC_GLYPH_PX, SC_GLYPH_PX);
      const cx = SC_GLYPH_PX / 2;
      const cy = SC_GLYPH_PX / 2;

      // Soft glow halo for visibility against bright trajectory tubes.
      const glow = tctx.createRadialGradient(cx, cy, 4, cx, cy, SC_GLYPH_PX / 2);
      glow.addColorStop(0, 'rgba(255,90,90,0.42)');
      glow.addColorStop(1, 'rgba(255,90,90,0)');
      tctx.fillStyle = glow;
      tctx.fillRect(0, 0, SC_GLYPH_PX, SC_GLYPH_PX);

      // Geometry — proportions match the SVG mock (viewBox 40×32).
      // body: 12×14 centered on (cx,cy)
      // panels: 10×10 squares flanking the body, gap 2u
      // antenna: vertical stub above the body
      const bodyW = SC_GLYPH_PX * 0.3;
      const bodyH = SC_GLYPH_PX * 0.35;
      const panelW = SC_GLYPH_PX * 0.25;
      const panelH = SC_GLYPH_PX * 0.25;
      const gap = SC_GLYPH_PX * 0.05;
      const bodyX = cx - bodyW / 2;
      const bodyY = cy - bodyH / 2;
      const lPanelX = bodyX - gap - panelW;
      const rPanelX = bodyX + bodyW + gap;
      const panelY = cy - panelH / 2;

      // Solar panels — filled gold, outlined white, with a center spar
      // line that reads as the panel join.
      function drawPanel(px: number) {
        tctx.fillStyle = SC_COLOR_PANEL;
        tctx.globalAlpha = 0.85;
        tctx.fillRect(px, panelY, panelW, panelH);
        tctx.globalAlpha = 1;
        tctx.strokeStyle = 'rgba(255,255,255,0.85)';
        tctx.lineWidth = 1;
        tctx.strokeRect(px + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
        tctx.beginPath();
        tctx.moveTo(px + panelW / 2, panelY + 1);
        tctx.lineTo(px + panelW / 2, panelY + panelH - 1);
        tctx.strokeStyle = 'rgba(255,255,255,0.55)';
        tctx.stroke();
      }
      drawPanel(lPanelX);
      drawPanel(rPanelX);

      // Antenna stub above the body — thin line + tiny disc tip.
      const antTopY = bodyY - SC_GLYPH_PX * 0.1;
      tctx.beginPath();
      tctx.moveTo(cx, bodyY);
      tctx.lineTo(cx, antTopY);
      tctx.strokeStyle = 'rgba(255,255,255,0.9)';
      tctx.lineWidth = 1.4;
      tctx.stroke();
      tctx.beginPath();
      tctx.arc(cx, antTopY, SC_GLYPH_PX * 0.025, 0, Math.PI * 2);
      tctx.fillStyle = '#fff';
      tctx.fill();

      // Central body — red rounded rectangle with a thin white outline.
      // The red core preserves the "I am the spacecraft" visibility the
      // old circle provided.
      const r = 3;
      tctx.beginPath();
      tctx.moveTo(bodyX + r, bodyY);
      tctx.lineTo(bodyX + bodyW - r, bodyY);
      tctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r);
      tctx.lineTo(bodyX + bodyW, bodyY + bodyH - r);
      tctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - r, bodyY + bodyH);
      tctx.lineTo(bodyX + r, bodyY + bodyH);
      tctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - r);
      tctx.lineTo(bodyX, bodyY + r);
      tctx.quadraticCurveTo(bodyX, bodyY, bodyX + r, bodyY);
      tctx.closePath();
      tctx.fillStyle = SC_COLOR_BODY;
      tctx.shadowColor = 'rgba(255,58,76,0.8)';
      tctx.shadowBlur = 4;
      tctx.fill();
      tctx.shadowBlur = 0;
      tctx.strokeStyle = 'rgba(255,255,255,0.85)';
      tctx.lineWidth = 1;
      tctx.stroke();

      // Small white pip at body center to read as the bus's "active"
      // indicator at very small sizes (camera far away).
      tctx.beginPath();
      tctx.arc(cx, cy, SC_GLYPH_PX * 0.035, 0, Math.PI * 2);
      tctx.fillStyle = 'rgba(255,255,255,0.95)';
      tctx.fill();
    }
    const scTex = new THREE.CanvasTexture(scTexCanvas);
    scTex.minFilter = THREE.LinearFilter;
    scTex.magFilter = THREE.LinearFilter;
    const scSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: scTex,
        transparent: true,
        depthWrite: false,
        depthTest: false, // always render on top of arc tube
      }),
    );
    scSprite.scale.set(2.5, 2.5, 1);
    scSprite.renderOrder = 999;
    scene.add(scSprite);

    // #1 Engine plume — directed cone at the spacecraft position
    // during burn events. Geometry tip along -Z so THREE.Object3D.lookAt
    // orients tip at any world-space target. Shader paints a base→tip
    // orange→yellow-white gradient with squared falloff toward the tip
    // (visually narrow tapering exhaust). Hidden between burns. Per-
    // event orientation + scale + opacity in the animate loop below.
    const plumeGeo = new THREE.ConeGeometry(0.35, 2.4, 16, 1, true);
    plumeGeo.rotateX(Math.PI / 2);
    plumeGeo.translate(0, 0, -1.2);
    const plumeMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uColorBase: { value: new THREE.Color(0xffaa44) },
        uColorTip: { value: new THREE.Color(0xfff0aa) },
      },
      vertexShader: `
        varying float vAlongAxis;
        void main() {
          vAlongAxis = (-position.z) / 2.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColorBase;
        uniform vec3 uColorTip;
        varying float vAlongAxis;
        void main() {
          vec3 color = mix(uColorBase, uColorTip, vAlongAxis);
          float alpha = uOpacity * (1.0 - vAlongAxis * vAlongAxis);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    plumeMesh.visible = false;
    plumeMesh.renderOrder = 998;
    scene.add(plumeMesh);

    // Per-mission spacecraft model — replaces the generic sprite
    // glyph with a recognisable 3D silhouette for iconic missions.
    // Built fresh when the mission swaps; null for missions without
    // a dedicated builder (those keep the scSprite glyph).
    let scModel: THREE.Group | null = null;
    function applyMissionSpacecraftModel(missionId: string): void {
      if (scModel) {
        scene.remove(scModel);
        (scModel.userData.dispose as (() => void) | undefined)?.();
        scModel = null;
      }
      scModel = buildInterplanetarySpacecraft(missionId);
      if (scModel) {
        scModel.scale.setScalar(1.5); // halved from 3.0 — the prior
        scModel.renderOrder = 999;
        // Rim-light injection — the single biggest "cinematic
        // spacecraft" upgrade per the shot-language guide (T6).
        // Brighten grazing-angle pixels with a warm tint so the
        // model reads as a silhouette with a glowing edge instead
        // of a flat-lit diagram. Implemented via onBeforeCompile
        // patching the existing MeshPhongMaterial fragment shader
        // — adds a Fresnel term to emissive intensity at minimal
        // perf cost. Walks every Mesh child since the builder
        // packs the bus + dish + boom as separate meshes.
        scModel.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = mesh.material as THREE.MeshPhongMaterial;
          if (!mat || mat.userData?.rimPatched) return;
          mat.onBeforeCompile = (shader) => {
            // Per-part colour preservation (#84). User reported the
            // ship reading as "a giant white lollipop" — the rim
            // strength 1.25 + ACES tone mapping + bloom were washing
            // out the gold bus / white dish / dark RTG / gold Huygens
            // colour distinction. Pulled rim strength down to 0.5 so
            // the silhouette still reads against bright planets but
            // doesn't dominate the per-part diffuse colours. Power
            // bumped to 3.0 so the rim is tighter at the silhouette
            // edge instead of bleeding into the body's interior.
            shader.uniforms.rimColor = { value: new THREE.Color(0xffd9a3) };
            shader.uniforms.rimStrength = { value: 0.5 };
            shader.uniforms.rimPower = { value: 3.0 };
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `#include <common>
              uniform vec3 rimColor;
              uniform float rimStrength;
              uniform float rimPower;`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `#include <emissivemap_fragment>
              {
                vec3 viewDir = normalize(-vViewPosition);
                vec3 nrm = normalize(normal);
                float rim = 1.0 - max(dot(viewDir, nrm), 0.0);
                rim = pow(rim, rimPower) * rimStrength;
                totalEmissiveRadiance += rimColor * rim;
              }`,
            );
          };
          // #84 — bump emissive so the per-part colour (gold bus,
          // white dish, dark RTG, gold Huygens, etc.) reads through
          // ACES tone mapping + bloom. ACES crushes mid-tone diffuse
          // colour at high exposure; emissive bypasses tone-mapping
          // saturation curves and keeps the colour vibrant. ×2.0 of
          // the model's declared intensity, capped at 1.0 to avoid
          // overcooking already-bright parts.
          mat.emissiveIntensity = Math.min(1.0, (mat.emissiveIntensity ?? 0.4) * 2.0);
          mat.userData = { ...(mat.userData ?? {}), rimPatched: true };
          mat.needsUpdate = true;
        });
        scene.add(scModel);
      }
    }
    // Initial application defers to applyMissionAsLoaded — that path
    // owns mission.id resolution; the publish below wires it through
    // flyUpdaters so mission swaps trigger a fresh model build.

    // DEPARTURE + ARRIVAL anchor markers — fixed rings at the
    // mission's launch and landing positions. v0.1.9: scaled up
    // (radius 5u vs 3u) and given Sprite labels ("LAUNCH", "ARRIVAL")
    // so each mission's start + end are unambiguous regardless of
    // camera angle. Updated by a $effect when arcTimeline /
    // activeDestination / isMoonMission changes.
    depMarker = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.25, 12, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4b9cd3,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    depMarker.rotation.x = Math.PI / 2;
    scene.add(depMarker);
    arrMarker = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.25, 12, 64),
      new THREE.MeshBasicMaterial({
        color: 0xc1440e,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    arrMarker.rotation.x = Math.PI / 2;
    scene.add(arrMarker);
    // Round-trip RETURN anchor — third torus at retPts[last] (Earth
    // on return-arrival day). Hidden by default; the $effect below
    // toggles visibility based on retPts.length. Same blue as LAUNCH
    // because both rings sit at Earth — visually consistent "this is
    // Earth" anchors, distinguished by the LAUNCH/RETURN sprite label
    // rather than by colour.
    retMarker = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.25, 12, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4b9cd3,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    retMarker.rotation.x = Math.PI / 2;
    retMarker.visible = false;
    scene.add(retMarker);

    // Moon's orbit ring around Earth — only visible during cislunar
    // missions. Radius = MOON_FLY_RADIUS_AU × SCALE_3D so it lines up
    // exactly with where the Moon mesh travels each frame, and gives
    // the cislunar arc a visible reference circle to read against.
    moonOrbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(MOON_FLY_RADIUS_AU * SCALE_3D, 0.05, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0xcfcfcf,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    moonOrbitRing.rotation.x = Math.PI / 2;
    moonOrbitRing.visible = false;
    scene.add(moonOrbitRing);

    // Sprite labels — billboard text floating above each marker so
    // the user always sees "LAUNCH · <date>" / "<DEST> · <date>"
    // regardless of view angle. Two-line texture: top = identity
    // (LAUNCH or destination name), bottom = the mission's dep_label
    // / arr_label date. Texture is redrawn into a single canvas owned
    // by each sprite each time refreshLabelSprites is called — no
    // texture allocation per mission swap.
    const drawLabelTexture = (
      canvas: HTMLCanvasElement,
      line1: string,
      line2: string,
      colorHex: string,
    ): void => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = colorHex;
      ctx.font = "bold 28px 'Space Mono', monospace";
      ctx.fillText(line1, canvas.width / 2, canvas.height * 0.32);
      ctx.font = "20px 'Space Mono', monospace";
      ctx.fillStyle = '#e6ecff';
      ctx.fillText(line2, canvas.width / 2, canvas.height * 0.7);
    };
    const buildLabelSprite = (): { sprite: THREE.Sprite; canvas: HTMLCanvasElement } => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 96;
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
      );
      sprite.scale.set(34, 10, 1);
      return { sprite, canvas };
    };
    const dep = buildLabelSprite();
    const arr = buildLabelSprite();
    const ret = buildLabelSprite();
    depLabelSprite = dep.sprite;
    arrLabelSprite = arr.sprite;
    retLabelSprite = ret.sprite;
    const depCanvas = dep.canvas;
    const arrCanvas = arr.canvas;
    const retCanvas = ret.canvas;
    drawLabelTexture(depCanvas, 'LAUNCH', '—', '#4b9cd3');
    drawLabelTexture(arrCanvas, 'ARRIVAL', '—', '#c1440e');
    drawLabelTexture(retCanvas, 'RETURN', '—', '#4b9cd3');
    (depLabelSprite.material.map as THREE.Texture).needsUpdate = true;
    (arrLabelSprite.material.map as THREE.Texture).needsUpdate = true;
    (retLabelSprite.material.map as THREE.Texture).needsUpdate = true;
    retLabelSprite.visible = false;
    scene.add(depLabelSprite);
    scene.add(arrLabelSprite);
    scene.add(retLabelSprite);

    // Refresh callback for the LAUNCH / ARRIVAL / RETURN sprite
    // textures. Published via flyUpdaters.helio.refreshLabelSprites at
    // the end of onMount; the $effect at component scope calls it on
    // mission swap. Ret params are optional — passed only when the
    // loaded mission is a round-trip (retPts.length > 0); otherwise
    // the ret sprite stays hidden and its texture is left untouched.
    const refreshSpriteTextures = (
      depLine1: string,
      depLine2: string,
      depColor: string,
      arrLine1: string,
      arrLine2: string,
      arrColor: string,
      retLine1?: string,
      retLine2?: string,
      retColor?: string,
    ) => {
      drawLabelTexture(depCanvas, depLine1, depLine2, depColor);
      drawLabelTexture(arrCanvas, arrLine1, arrLine2, arrColor);
      const depTex = (depLabelSprite!.material as THREE.SpriteMaterial).map;
      const arrTex = (arrLabelSprite!.material as THREE.SpriteMaterial).map;
      if (depTex) depTex.needsUpdate = true;
      if (arrTex) arrTex.needsUpdate = true;
      if (retLine1 != null && retLine2 != null && retColor != null) {
        drawLabelTexture(retCanvas, retLine1, retLine2, retColor);
        const retTex = (retLabelSprite!.material as THREE.SpriteMaterial).map;
        if (retTex) retTex.needsUpdate = true;
      }
    };

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
    /** Sample the outbound trajectory spline at a given mission-elapsed
     *  day, returning a 2D scene-position. Linear interpolation across
     *  outPts (which already encode the planned mission curve). Used to
     *  predict the spacecraft's position at the flyby peak so the
     *  camera knows which side of the planet the ship will be on. */
    // predictShipPosAtMet lives in $lib/orbital/predict-ship-pos — pure
    // helper, unit-tested. The closure used to be inline here.
    // The previous computeFlybyChoreographyCamT (perpendicular
    // azimuth + 90° pan sweep) was replaced by the inline
    // "ship-side same-line" math in the flyby cinema block — see
    // updateHelioAutoZoomTargets. The new model places the camera
    // ON the ship's side of the planet (atan2(planetToShip)) so the
    // ship is always BETWEEN camera and planet (in front, not
    // behind). FLYBY_PAN_DAYS / FLYBY_PAN_ARC / FLYBY_PAN_LEAD_DAYS
    // constants kept for telemetry / future per-planet tuning.
    // Flyby cinema mode — when the active mission has 'flyby' events on
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
    // touching physics. JPL's Cassini end-of-mission lingers ten beats
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
    const FLYBY_PEAK_DAYS = 4;
    /** Fallback camR if we couldn't resolve the flyby body. */
    const HELIO_FLYBY_R_FALLBACK = 80;

    /** Per-flyby cinema overrides. Each NASA mission-art reference
     *  composes differently — Cassini-Saturn frames the ship + rings
     *  oblique, Galileo-Jupiter foregrounds the dish, Juno-Jupiter
     *  hugs the limb close. These tunables let each body's flyby
     *  pose its own composition without flattening the variations.
     *  - spriteScale: sprite glyph size during cinema
     *  - modelScale:  per-mission 3D model size during cinema
     *  - toCameraR:   ship push-toward-camera as a multiple of
     *                 the body's visual radius (1.4 = ship sits at
     *                 ~1.0·r from the camera, well clear of the
     *                 planet's front face) */
    const FLYBY_OVERRIDES: Record<
      string,
      { spriteScale: number; modelScale: number; toCameraR: number }
    > = {
      // With camera 5× body radius back, there is real room to put
      // the ship in foreground space. Each composition tunes its own
      // numbers — references vary (Cassini-Saturn vs Juno-Jupiter
      // vs Pioneer-Jupiter aren't the same shot).
      //
      //   spriteScale: sprite glyph size (cruise default = 2.5)
      //   modelScale:  per-mission 3D-model size (cruise default = 1.5)
      //   toCameraR:   push-toward-camera as a multiple of body radius;
      //                higher = ship closer to camera, lower = ship
      //                closer to planet. With FLYBY_BODY_R_MULTIPLIER=5
      //                a value of 0.5 puts the ship at 4.5×r from the
      //                camera (well clear of even Cassini's longest
      //                magnetometer-boom extent at modelScale=1.0).
      mercury: { spriteScale: 1.5, modelScale: 1.0, toCameraR: 0.5 },
      venus: { spriteScale: 1.5, modelScale: 1.0, toCameraR: 0.5 },
      earth: { spriteScale: 1.6, modelScale: 1.1, toCameraR: 0.5 },
      mars: { spriteScale: 1.5, modelScale: 1.0, toCameraR: 0.5 },
      // Gas giants — bigger body radius means the absolute camera
      // distance is bigger too, so the ship can carry slightly more
      // intrinsic scale before its booms catch the camera plane.
      jupiter: { spriteScale: 2.2, modelScale: 1.8, toCameraR: 0.5 },
      // Saturn's ring system extends well beyond the planet's visual
      // radius — at the default 0.5 push, Cassini reads tiny against
      // the rings. Bump the model scale + push the ship harder toward
      // camera so the spacecraft re-takes hero status; the rings sit
      // as a dramatic mid-frame backdrop instead of swallowing the ship.
      // Polish-wave-2 (2026-06): toCameraR bumped 0.7 → 0.9 so Cassini
      // is unambiguously in foreground space, the way Wernquist's
      // Grand Finale illustrations frame it.
      saturn: { spriteScale: 2.4, modelScale: 2.4, toCameraR: 0.9 },
      uranus: { spriteScale: 1.7, modelScale: 1.3, toCameraR: 0.5 },
      neptune: { spriteScale: 1.7, modelScale: 1.3, toCameraR: 0.5 },
    };

    // PLANET_SIZES + findFlybyPlanetFromLabel + findClosestPlanetToShip
    // were moved to $lib/orbital/find-flyby-planet so they can be
    // unit-tested + reused by the upcoming animate-loop split. The
    // rationale for why label-parsing is the primary signal over
    // closest-planet-detection lives in that module's docstring.
    function updateHelioAutoZoomTargets(): void {
      if (isMoonMission) return; // cislunar handles its own auto-zoom
      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      const ePos = earthPos(simDay);
      const earthScene = new THREE.Vector3(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      // Track the destinationMesh's CURRENT id rather than the mission's
      // primary, so a transient swap to a secondary flyby body (NH at
      // Arrokoth past Pluto) renders the destinationMesh at the right
      // heliocentric position. currentDestMeshId resets back to
      // activeDestination when the flyby window closes.
      const dPosLive = destinationPos(simDay, currentDestMeshId);
      const destScene = new THREE.Vector3(dPosLive.x * SCALE_3D, 0, dPosLive.z * SCALE_3D);
      // Live spacecraft scene position (AU × SCALE_3D).
      const scScene = new THREE.Vector3(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);
      // Cruise centre = midpoint of (spacecraft, Sun). Equivalent to
      // weighting the camera target — the cruise sub-phase now picks
      // its own ship-biased centre (see cruise-out / cruise-back blocks
      // below), so the 50/50 midpoint that lived here is no longer
      // needed.

      // Detect an active flyby window. mission.flight.events is the
      // canonical roster; type='flyby' fires the cinema sub-phase.
      // met_days are mission-relative; convert to simDay by adding
      // arcTimeline.dep_day. First matching window wins (events are
      // monotonic so overlap is rare). The window opens 90 days
      // BEFORE the flyby (so the user sees the slow approach) and
      // closes 40 days AFTER.
      const flybyEvents = mission.flight?.events ?? [];
      // Flyby cinema fires whenever the active-flyby window contains
      // the current simDay. Earlier this was gated on `!epilogueActive`
      // to fix Saturn-OI's peakHold pinning case (the cinema never
      // released because peakHold froze simDay at peak, blocking the
      // epilogue's wide bookend tableau). But the gate over-suppressed
      // for ordinary missions where MOI IS the arrival event (Mars
      // Express, Mars Pathfinder, Mariner 9, etc.): users landing at
      // the iconic MOI moment got the wide epilogue instead of the
      // close-up Mars composition. Removing the gate restores those.
      // Saturn-OI peakHold pinning is a separate issue (the peakHold
      // mechanism itself should release after a finite time, or the
      // cinema window should auto-close at MET = peak + DEPART days
      // regardless of peakHold — both pursuable in a follow-up).
      const activeFlybyMet = findActiveFlybyMet(flybyEvents, simDay, arcTimeline.dep_day);

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
          findFlybyPlanetFromLabel(activeEvt?.label) ?? findClosestPlanetToShip(sc.pos, simDay);
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
          simDay,
          peakHoldUntil: cine.peakHoldUntil,
          peakHoldArmedForFlybyMet: cine.peakHoldArmedForFlybyMet,
          now: performance.now(),
          camR,
          camTarget: { x: camTarget.x, y: camTarget.y, z: camTarget.z },
        });
        if (flyby) {
          const bodyPos =
            flyby.id === 'earth' ? earthPos(simDay) : destinationPos(simDay, flyby.id);
          const bodyScene = new THREE.Vector3(bodyPos.x * SCALE_3D, 0, bodyPos.z * SCALE_3D);
          void bodyScene;
          sub = `flyby-${activeFlybyMet}-${flyby.id}`;
          // Secondary-flyby destinationMesh swap. The 8 main planets
          // (mercury..neptune) plus Earth render via context meshes
          // that are always in the scene — for those bodies no swap is
          // needed. Bodies like Pluto / Arrokoth / Ceres only render
          // through the single destinationMesh, so a flyby past one of
          // them while the mission's primary destination is a DIFFERENT
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
            flyby.id !== currentDestMeshId
          ) {
            flyUpdaters?.helio.applyDestination(flyby.id as DestinationId);
            currentDestMeshId = flyby.id as DestinationId;
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
          // ICONIC FLYBY COMPOSITION — Cassini-mission-art reference.
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
          // PEAK position (predicted via outPts spline), not the
          // current position. That way the camera is already on the
          // "right side" before the ship arrives there.
          // ICONIC HERO-SHOT — Cassini-mission-art over-the-shoulder
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
          const totalOutboundDays = arcTimeline.arr_day - arcTimeline.dep_day;
          const sampleShipScene = (met: number) => {
            const p = predictShipPosAtMet(outPts, met, totalOutboundDays);
            if (!p) return null;
            return { x: p.x * SCALE_3D, y: p.y * SCALE_3D, z: p.z * SCALE_3D };
          };
          const iconicFrame = computeIconicFrame({
            flybyPlanetId: flyby.id as FlybyPlanetId,
            flybyPlanetRadius: flyby.size,
            planetScenePos: { x: bodyScene.x, z: bodyScene.z },
            peakMet: activeFlybyMet,
            sampleShipScene,
            fallbackShipPos: { x: scScene.x, z: scScene.z },
            fallbackPitchRad: HELIO_APPROACH_P,
          });
          centerX = iconicFrame.centerX;
          centerY = iconicFrame.centerY;
          centerZ = iconicFrame.centerZ;
          targetR = iconicFrame.targetR;
          targetP = iconicFrame.targetP;
          helioFlybyDesiredCamT = iconicFrame.helioFlybyDesiredCamT;
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
            cinemaForceMoons = true;
            helioHandles.setMoonsVisible(true);
          } else if (subPhaseTransition.exitedFlybyCinema) {
            cinemaForceMoons = false;
            helioHandles.setMoonsVisible(lastLayerMoonsOn);
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
        openingActive &&
        openingStartedAt > 0 &&
        performance.now() - openingStartedAt < openingDurationMs - 1000;
      const frame = computeHelioNonFlybyFrame({
        phase: sc.phase,
        progress: sc.progress,
        scScene,
        destScene,
        earthScene,
        epilogueActive,
        endAtEarth: retPts.length > 0,
        destSize: PLANET_SIZES[activeDestination] ?? 0,
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
          cinemaForceMoons = false;
          helioHandles.setMoonsVisible(lastLayerMoonsOn);
        }
        // Secondary-flyby destinationMesh swap-back. If we swapped the
        // mesh to a flyby-only body (Arrokoth, Pluto if not primary,
        // Ceres), restore the mission's primary destination now that
        // the flyby window has closed. This keeps the post-flyby
        // cruise framing showing the right destination.
        if (wasInFlybyCinema && currentDestMeshId !== activeDestination) {
          flyUpdaters?.helio.applyDestination(activeDestination);
          currentDestMeshId = activeDestination;
        }
      }
      helioAutoZoomTargetR = targetR;
      helioAutoZoomTargetCenter.set(centerX, 0, centerZ);
      helioAutoZoomTargetP = targetP;
    }

    const updateCam = () => {
      if (isMoonMission) {
        // Track the Earth+Moon midpoint so both planets always sit
        // inside the frame — Earth stays toward one side, Moon toward
        // the other, the arc draws between them. Earth-only targeting
        // (the previous behaviour) clipped Moon out of view as it
        // orbited around behind the camera.
        const ePos = earthPos(simDay);
        const mPos = moonHelioPos(simDay);
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
          // camSnapUntil is set by jumpToMet (700 ms) and onScrub
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
          // up. Scaling by simSpeed/7 (capped at 0.18 / 0.05 so we
          // don't snap-cut) keeps composition fresh at every speed.
          const simSpeedFactor = Math.max(1, simSpeed / 7);
          const inSnapWindow = performance.now() < camSnapUntil;
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
          const simSpeedFactor = Math.max(1, simSpeed / 7);
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
      if (!cislunarTrajectory || cislunarTrajectory.phases.length === 0) {
        if (lastAutoZoomPhase !== null) {
          autoZoomTargetR = WIDE_DISTANCE;
          autoZoomTargetCenter.set(0, 0, 0);
          autoZoomActive = true;
          lastAutoZoomPhase = null;
        }
        return;
      }
      const metDays = simDay - arcTimeline.dep_day;
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
      const moonPos = moonEciPos(simDay);
      const moonInScene = {
        x: moonPos.x * SCALE_CISLUNAR,
        z: moonPos.z * SCALE_CISLUNAR,
      };
      const sample = sampleCislunarSpacecraftPos(activePhase, phaseProgress, {
        moonPos: { x: moonPos.x, y: moonPos.y, z: moonPos.z },
        moonRefPos: moonEciPos(arcTimeline.flyby_day),
      });
      if (!sample) return;
      const { x: scX, y: scY, z: scZ } = sample;
      const distToMoonKm = Math.hypot(scX - moonPos.x, scY - moonPos.y, scZ - moonPos.z);
      // Earth SoI is ~924 000 km; Moon SoI ~66 100 km. Trigger lunar
      // closeup well outside Moon SoI so the zoom is underway by the
      // time the spacecraft actually crosses into Moon-dominated space.
      const MOON_PROXIMITY_KM = 80_000;
      const isNearMoon = distToMoonKm < MOON_PROXIMITY_KM;

      // Cislunar hero-shot check (Phase D — Moon-mission counterpart
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
        mission.flight?.events ?? [],
        simDay,
        arcTimeline.dep_day,
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
        const moonRefForHero = moonEciPos(arcTimeline.flyby_day);
        const shipPosAtMet = (met: number) => {
          const phaseHit = findActiveCislunarPhase(cislunarTrajectory!.phases, met);
          if (!phaseHit) return null;
          const moonAtMet = moonEciPos(arcTimeline.dep_day + met);
          return sampleCislunarSpacecraftPos(phaseHit.activePhase, phaseHit.phaseProgress, {
            moonPos: moonAtMet,
            moonRefPos: moonRefForHero,
          });
        };
        // moonPos for the plan uses LIVE Moon position (not Moon-at-
        // iconic-MET) so the camera target tracks the moon as simDay
        // drifts inside the hero window. Otherwise camera would point
        // at where the Moon WAS at iconicMet while the cislunarMoon
        // mesh is at moonEciPos(simDay) — a visible offset that left
        // the moon out-of-frame for missions where the user lands a
        // fraction of a day past iconicMet (Apollo 17 LOI at MET 3.4,
        // user at MET 3.5 → 0.88-scene-unit offset → empty frame).
        const moonPosForHero = moonEciPos(simDay);
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
    // applyPlanSelection can frame each new mission afresh. camR is
    // computed per-destination so the destination's orbit ring fills
    // a comfortable fraction of the view: ~180u for Mars, ~830u for
    // Saturn, 220u for Moon-mode. (camP, camT) restore to a consistent
    // wide overhead frame regardless of how the user had panned the
    // last mission.
    const helioResetCamera = () => {
      camR = cameraDistanceFor(activeDestination, isMoonMission);
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
      // Fresh mission → re-arm auto-zoom from the first phase.
      lastAutoZoomPhase = null;
      autoZoomActive = true;
      // Heliocentric: re-arm sub-phase tracking. Open framed CLOSE on
      // Earth at the same zoom level the camera will reach when it
      // arrives at the destination — symmetric "depart / arrive"
      // composition. From there the slow cruise LERP pulls back to
      // the wide Sun-centred framing as the mission begins.
      lastHelioSubPhase = null;
      if (!isMoonMission) {
        const ePos = earthPos(simDay);
        camTarget.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
        camR = HELIO_EARTH_CLOSEUP_R;
        helioAutoZoomActive = true;
      }
      updateCam();
      updateCislunarCam();
    };

    const el3d = renderer.domElement;
    let isDrag = false;
    let dragMode: 'orbit' | 'pan' = 'orbit';
    let lmx = 0;
    let lmy = 0;
    // Pan the active camera's target by the screen-space delta. Uses
    // the camera's basis so the pan direction stays correct under any
    // orbit angle. Scale = world-units-per-screen-pixel at the current
    // distance + FOV so 1 px of drag moves ~1 px of world.
    const panActiveCamera = (dx: number, dy: number): void => {
      const cam = viewMode === 'cislunar' ? cislunarCamera : camera;
      const tgt = viewMode === 'cislunar' ? cislunarCamTarget : camTarget;
      const r = viewMode === 'cislunar' ? cislunarCamR : camR;
      const right = new THREE.Vector3();
      const upVec = new THREE.Vector3();
      const fwd = new THREE.Vector3();
      cam.matrixWorld.extractBasis(right, upVec, fwd);
      const fovRad = (cam.fov * Math.PI) / 180;
      const viewHeight = 2 * r * Math.tan(fovRad / 2);
      const scale = viewHeight / Math.max(1, window.innerHeight);
      tgt.addScaledVector(right, -dx * scale);
      tgt.addScaledVector(upVec, dy * scale);
      if (viewMode === 'cislunar') {
        autoZoomActive = false;
        updateCislunarCam();
      } else {
        helioAutoZoomActive = false;
        updateCam();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      isDrag = true;
      // Right-button (2), middle-button (1), or Shift+left-button → pan.
      // Plain left-button → orbit (existing behaviour).
      dragMode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'orbit';
      lmx = e.clientX;
      lmy = e.clientY;
      el3d.style.cursor = dragMode === 'pan' ? 'move' : 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      const dx = e.clientX - lmx;
      const dy = e.clientY - lmy;
      lmx = e.clientX;
      lmy = e.clientY;
      if (dragMode === 'pan') {
        panActiveCamera(dx, dy);
        return;
      }
      if (viewMode === 'cislunar') {
        cislunarCamT -= dx * 0.005;
        cislunarCamP = Math.max(0.08, Math.min(Math.PI * 0.48, cislunarCamP + dy * 0.005));
        updateCislunarCam();
      } else {
        camT -= dx * 0.005;
        camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
        updateCam();
      }
    };
    const onMouseUp = () => {
      isDrag = false;
      el3d.style.cursor = 'grab';
    };
    // Suppress browser right-click context menu so right-drag pan
    // doesn't pop a menu after each pan stroke.
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch on macOS dispatches a synthetic wheel event
      // with ctrlKey=true; without preventDefault the browser zooms
      // the whole page. preventDefault keeps the gesture bound to
      // the 3D camera. Listener also needs `passive: false`.
      e.preventDefault();
      if (viewMode === 'cislunar') {
        const minR = R_MOON_KM * SCALE_CISLUNAR * 5;
        const maxR = A_MOON_KM * SCALE_CISLUNAR * 6;
        cislunarCamR = Math.max(minR, Math.min(maxR, cislunarCamR + e.deltaY * 0.05));
        // User-initiated zoom wins over auto-zoom for the rest of this
        // phase. Next phase transition re-arms autoZoomActive.
        autoZoomActive = false;
        updateCislunarCam();
      } else {
        camR = Math.max(80, Math.min(4000, camR + e.deltaY * 0.5));
        // User-initiated zoom wins over auto-zoom for the rest of this
        // sub-phase. Next sub-phase transition re-arms helioAutoZoomActive.
        helioAutoZoomActive = false;
        updateCam();
      }
    };
    // Touch — single-finger orbit + two-finger pinch-zoom AND
    // two-finger drag pan per CLAUDE.md mobile rules. The pinch and
    // pan happen simultaneously: pinch ratio drives zoom, midpoint
    // drift drives pan.
    let touchActive = false;
    let pinchPrev = 0;
    let pinchMidX = 0;
    let pinchMidZ = 0;
    const touchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive = true;
        lmx = e.touches[0].clientX;
        lmy = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        touchActive = false;
        pinchPrev = touchDist(e.touches[0], e.touches[1]);
        pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchMidZ = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchPrev > 0) {
        const dist = touchDist(e.touches[0], e.touches[1]);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // Pinch → zoom (active camera).
        const ratio = pinchPrev / dist;
        if (viewMode === 'cislunar') {
          const minR = R_MOON_KM * SCALE_CISLUNAR * 5;
          const maxR = A_MOON_KM * SCALE_CISLUNAR * 6;
          cislunarCamR = Math.max(minR, Math.min(maxR, cislunarCamR * ratio));
          autoZoomActive = false;
        } else {
          camR = Math.max(80, Math.min(4000, camR * ratio));
          helioAutoZoomActive = false;
        }
        // Midpoint drift → pan.
        const dx = midX - pinchMidX;
        const dy = midY - pinchMidZ;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          panActiveCamera(dx, dy);
        } else if (viewMode === 'cislunar') {
          updateCislunarCam();
        } else {
          updateCam();
        }
        pinchPrev = dist;
        pinchMidX = midX;
        pinchMidZ = midY;
        return;
      }
      if (!touchActive || e.touches.length !== 1) return;
      camT -= (e.touches[0].clientX - lmx) * 0.005;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + (e.touches[0].clientY - lmy) * 0.005));
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      updateCam();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchPrev = 0;
      if (e.touches.length === 0) touchActive = false;
    };

    el3d.style.cursor = 'grab';
    lifecycle.on(el3d, 'mousedown', onMouseDown);
    lifecycle.on(el3d, 'contextmenu', onContextMenu);
    lifecycle.on(window, 'mousemove', onMouseMove);
    lifecycle.on(window, 'mouseup', onMouseUp);
    // passive: false so onWheel can preventDefault against trackpad
    // pinch (macOS Ctrl+wheel) hijacking browser zoom.
    lifecycle.on(el3d, 'wheel', onWheel, { passive: false });
    lifecycle.on(el3d, 'touchstart', onTouchStart, { passive: true });
    lifecycle.on(el3d, 'touchmove', onTouchMove, { passive: true });
    lifecycle.on(el3d, 'touchend', onTouchEnd);
    lifecycle.on(el3d, 'touchcancel', onTouchEnd);

    // 2D context. Pull the non-null reference into a separate local
    // so TS narrowing survives across the draw2d closure.
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    // 2D cislunar auto-zoom state — mirrors the 3D autoZoom* logic.
    // When the active phase is lunar (orbit, spiral_lunar, descent, …),
    // the canvas zooms in on the Moon's current position. On Earth-side
    // phases it zooms back to the wide Earth-Moon view. Lerp each
    // frame toward the target so the transition reads as a camera move.
    let cis2dScale = 1;
    let cis2dTargetScale = 1;
    let cis2dCenterX = 0;
    let cis2dCenterZ = 0;
    let cis2dTargetCenterX = 0;
    let cis2dTargetCenterZ = 0;
    const CIS2D_WIDE_SCALE = 1;
    const CIS2D_CLOSEUP_SCALE = 8;

    function draw2d() {
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;

      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const BASE_SCALE_2D = Math.min(W, H) / 4;
      // Moon-mode 2D mirrors 3D camera: origin is live Earth (so the
      // Earth+Moon system stays centred as Earth orbits the Sun) and
      // the scale is zoomed 6× so the 0.15 AU Moon offset reads as
      // ~90 px instead of ~30 px. Mars-mode keeps Sun-centred origin
      // at canvas centre and the original scale.
      const originAU = isMoonMission ? earthPos(simDay) : { x: 0, z: 0 };
      const SCALE_2D = isMoonMission ? BASE_SCALE_2D * 6 : BASE_SCALE_2D;
      const ptX = (au: number) => cx + (au - originAU.x) * SCALE_2D;
      const ptZ = (au: number) => cy + (au - originAU.z) * SCALE_2D;

      for (let i = 0; i < 150; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      // Earth + Mars orbits + Sun (Mars-bound only — Moon-mode is
      // Earth-centered; rings + Sun would be misleading reference
      // points for a cislunar transit).
      if (!isMoonMission) {
        ctx2.beginPath();
        ctx2.arc(cx, cy, R_EARTH_AU * SCALE_2D, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(75,156,211,0.35)';
        ctx2.lineWidth = 1;
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.arc(cx, cy, R_MARS_AU * SCALE_2D, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(193,68,14,0.35)';
        ctx2.lineWidth = 1;
        ctx2.stroke();

        const sg = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 30);
        sg.addColorStop(0, 'rgba(255,228,130,0.4)');
        sg.addColorStop(1, 'rgba(255,120,0,0)');
        ctx2.beginPath();
        ctx2.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx2.fillStyle = sg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx2.fillStyle = '#fff8e7';
        ctx2.fill();
      }

      // Past/future split — past solid, future dashed at low opacity.
      function drawSplit(pts: Vec2[], t: number, past: string, future: string) {
        if (pts.length < 2) return;
        const split = Math.max(0, Math.min(pts.length - 1, Math.floor(t * (pts.length - 1))));
        if (split > 0) {
          ctx2.beginPath();
          ctx2.moveTo(ptX(pts[0].x), ptZ(pts[0].z));
          for (let i = 1; i <= split; i++) {
            ctx2.lineTo(ptX(pts[i].x), ptZ(pts[i].z));
          }
          ctx2.strokeStyle = past;
          ctx2.lineWidth = 2;
          ctx2.setLineDash([]);
          ctx2.stroke();
        }
        ctx2.beginPath();
        ctx2.moveTo(ptX(pts[split].x), ptZ(pts[split].z));
        for (let i = split + 1; i < pts.length; i++) {
          ctx2.lineTo(ptX(pts[i].x), ptZ(pts[i].z));
        }
        ctx2.strokeStyle = future;
        ctx2.lineWidth = 1.5;
        ctx2.setLineDash([4, 6]);
        ctx2.stroke();
        ctx2.setLineDash([]);
      }

      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      const useCislunar2D =
        isMoonMission && cislunarTrajectory != null && cislunarTrajectory.phases.length > 0;

      if (useCislunar2D && cislunarTrajectory) {
        // ADR-058: 2D Moon-mission view rendered from the cislunar
        // trajectory (ECI km), mirroring the 3D cislunar scene. Earth
        // at canvas centre, Moon orbit ring at scale, phase-coloured
        // trajectory lines with the lunar-phase moon-frame offset
        // applied so orbit + descent track the moving Moon.
        const BASE_CIS_SCALE = (Math.min(W, H) * 0.4) / A_MOON_KM;
        const moonRef = moonEciPos(arcTimeline.flyby_day);
        const moonNow = moonEciPos(simDay);
        const moonDeltaX = moonNow.x - moonRef.x;
        const moonDeltaZ = moonNow.z - moonRef.z;

        // Auto-zoom: lerp scale + centre toward target based on whether
        // the active phase is lunar-local. Closeup scale × CIS2D_CLOSEUP_SCALE,
        // centre tracks Moon. Wide stays at base scale + Earth centre.
        const LUNAR_LOCAL_2D = new Set([
          'lunar_orbit',
          'spiral_lunar',
          'lunar_flyby',
          'descent',
          'ascent',
        ]);
        const metDaysForZoom = simDay - arcTimeline.dep_day;
        let activePhaseForZoom = cislunarTrajectory.phases[0];
        for (const p of cislunarTrajectory.phases) {
          if (metDaysForZoom >= p.start_met_days && metDaysForZoom <= p.end_met_days) {
            activePhaseForZoom = p;
            break;
          }
        }
        if (LUNAR_LOCAL_2D.has(activePhaseForZoom.type)) {
          cis2dTargetScale = CIS2D_CLOSEUP_SCALE;
          cis2dTargetCenterX = moonNow.x;
          cis2dTargetCenterZ = moonNow.z;
        } else {
          cis2dTargetScale = CIS2D_WIDE_SCALE;
          cis2dTargetCenterX = 0;
          cis2dTargetCenterZ = 0;
        }
        // 0.04 ≈ 1.25 s transition at 60 fps (matches 3D zoom feel).
        const LERP = 0.04;
        cis2dScale += (cis2dTargetScale - cis2dScale) * LERP;
        cis2dCenterX += (cis2dTargetCenterX - cis2dCenterX) * LERP;
        cis2dCenterZ += (cis2dTargetCenterZ - cis2dCenterZ) * LERP;

        const SCALE_CIS_2D = BASE_CIS_SCALE * cis2dScale;
        const cisX = (km: number) => cx + (km - cis2dCenterX) * SCALE_CIS_2D;
        const cisZ = (km: number) => cy + (km - cis2dCenterZ) * SCALE_CIS_2D;

        // Moon orbit ring (centred on Earth).
        ctx2.beginPath();
        ctx2.arc(cx, cy, A_MOON_KM * SCALE_CIS_2D, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(170,170,204,0.25)';
        ctx2.lineWidth = 0.6;
        ctx2.stroke();

        const PHASE_COLORS_2D: Record<string, string> = {
          parking: '#4b9cd3',
          tli_coast: '#ffd166',
          lunar_orbit: '#c77dff',
          lunar_flyby: '#ff9933',
          descent: '#ef476f',
          ascent: '#ef476f',
          tei_coast: '#06d6a0',
          reentry: '#ef476f',
          spiral_earth: '#4b9cd3',
          spiral_lunar: '#c77dff',
        };

        // Render each phase. Lunar-frame phases (orbit, descent, etc.)
        // get the (currentMoon - moonAtFlyby) offset so they track Moon.
        for (const phase of cislunarTrajectory.phases) {
          if (phase.points.length < 2) continue;
          const lunarLocal = LUNAR_LOCAL_2D.has(phase.type);
          const ox = lunarLocal ? moonDeltaX : 0;
          const oz = lunarLocal ? moonDeltaZ : 0;
          ctx2.beginPath();
          ctx2.moveTo(cisX(phase.points[0].x + ox), cisZ(phase.points[0].z + oz));
          for (let i = 1; i < phase.points.length; i++) {
            ctx2.lineTo(cisX(phase.points[i].x + ox), cisZ(phase.points[i].z + oz));
          }
          ctx2.strokeStyle = PHASE_COLORS_2D[phase.type] ?? '#ffffff';
          ctx2.lineWidth = 1.6;
          ctx2.stroke();
        }

        // Earth at origin.
        const eg = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 12);
        eg.addColorStop(0, 'rgba(75,156,211,0.55)');
        eg.addColorStop(1, 'rgba(75,156,211,0)');
        ctx2.beginPath();
        ctx2.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx2.fillStyle = eg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx2.fillStyle = '#4b9cd3';
        ctx2.fill();
        ctx2.font = "bold 9px 'Space Mono', monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.textAlign = 'left';
        ctx2.fillText('EARTH', cx + 9, cy + 3);

        // Moon at current position.
        const mx = cisX(moonNow.x);
        const my = cisZ(moonNow.z);
        const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 8);
        mg.addColorStop(0, 'rgba(220,220,220,0.5)');
        mg.addColorStop(1, 'rgba(220,220,220,0)');
        ctx2.beginPath();
        ctx2.arc(mx, my, 8, 0, Math.PI * 2);
        ctx2.fillStyle = mg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx2.fillStyle = '#dddddd';
        ctx2.fill();
        ctx2.fillText('MOON', mx + 7, my + 3);

        // Spacecraft sprite at its cislunar-trajectory position. Walk
        // the phase list using MET to find current absolute position,
        // applying the same lunar-frame offset for lunar phases.
        const metDays = simDay - arcTimeline.dep_day;
        let active = cislunarTrajectory.phases[0];
        for (const p of cislunarTrajectory.phases) {
          if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
            active = p;
            break;
          }
        }
        const span = active.end_met_days - active.start_met_days;
        const tt =
          span > 0 ? Math.max(0, Math.min(1, (metDays - active.start_met_days) / span)) : 0;
        const last = active.points.length - 1;
        const f = tt * last;
        const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
        const frac = f - i;
        const a = active.points[i];
        const b = active.points[i + 1] ?? a;
        const lunarLocal = LUNAR_LOCAL_2D.has(active.type);
        const ox = lunarLocal ? moonDeltaX : 0;
        const oz = lunarLocal ? moonDeltaZ : 0;
        const sx = cisX(a.x + (b.x - a.x) * frac + ox);
        const sy = cisZ(a.z + (b.z - a.z) * frac + oz);
        // Red filled circle matching the 3D sprite glyph.
        const scGlow = ctx2.createRadialGradient(sx, sy, 0, sx, sy, 10);
        scGlow.addColorStop(0, 'rgba(255,58,76,0.45)');
        scGlow.addColorStop(1, 'rgba(255,58,76,0)');
        ctx2.beginPath();
        ctx2.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx2.fillStyle = scGlow;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx2.fillStyle = 'rgba(20,8,12,0.9)';
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx2.fillStyle = '#ff3a4c';
        ctx2.fill();

        return;
      }

      drawSplit(outPts, Math.min(1, sc.progress / 0.5), '#4466ff', 'rgba(68,102,255,0.2)');
      drawSplit(retPts, Math.max(0, (sc.progress - 0.5) / 0.5), '#9966ff', 'rgba(153,102,255,0.2)');

      // Bodies at simDay. Moon-mode: heliocentric like Mars but
      // viewport-centred on live Earth (originAU above). Live Earth +
      // Moon discs and the launch / arrival anchor rings are all
      // drawn through ptX/ptZ so they share the same coordinate frame
      // as the trajectory tube.
      if (isMoonMission) {
        const eLive = earthPos(simDay);
        const mLive = moonHelioPos(simDay);
        const eAnchor = outPts.length > 0 ? outPts[0] : eLive;
        const mAnchor = outPts.length > 0 ? outPts[outPts.length - 1] : mLive;
        // LAUNCH anchor ring (where Earth was at depDay).
        ctx2.beginPath();
        ctx2.arc(ptX(eAnchor.x), ptZ(eAnchor.z), 14, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(75,156,211,0.7)';
        ctx2.lineWidth = 1.2;
        ctx2.stroke();
        ctx2.font = "bold 9px 'Space Mono', monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.textAlign = 'left';
        ctx2.fillText('LAUNCH', ptX(eAnchor.x) + 18, ptZ(eAnchor.z) + 3);
        // ARRIVAL anchor ring (where Moon will be at arrDay).
        ctx2.beginPath();
        ctx2.arc(ptX(mAnchor.x), ptZ(mAnchor.z), 13, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(220,220,220,0.7)';
        ctx2.lineWidth = 1.2;
        ctx2.stroke();
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.fillText('ARRIVAL', ptX(mAnchor.x) + 16, ptZ(mAnchor.z) + 3);
        // Live Earth — halo + disc.
        const ex = ptX(eLive.x);
        const ey = ptZ(eLive.z);
        const eg = ctx2.createRadialGradient(ex, ey, 0, ex, ey, 14);
        eg.addColorStop(0, 'rgba(75,156,211,0.6)');
        eg.addColorStop(1, 'rgba(75,156,211,0)');
        ctx2.beginPath();
        ctx2.arc(ex, ey, 14, 0, Math.PI * 2);
        ctx2.fillStyle = eg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx2.fillStyle = '#4b9cd3';
        ctx2.fill();
        ctx2.fillText('EARTH', ex + 11, ey + 3);
        // Live Moon — halo + disc.
        const mx = ptX(mLive.x);
        const my = ptZ(mLive.z);
        const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 10);
        mg.addColorStop(0, 'rgba(220,220,220,0.5)');
        mg.addColorStop(1, 'rgba(220,220,220,0)');
        ctx2.beginPath();
        ctx2.arc(mx, my, 10, 0, Math.PI * 2);
        ctx2.fillStyle = mg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(mx, my, 4, 0, Math.PI * 2);
        ctx2.fillStyle = '#dddddd';
        ctx2.fill();
        ctx2.fillText('MOON', mx + 9, my + 3);
      } else {
        // Mars-bound: live Earth + Mars orbit the Sun as the spacecraft
        // flies; the launch / arrival anchors stay pinned to outPts[0]
        // and outPts[N-1]. Two pieces of state to read separately so
        // the user can watch Mars travel toward the ARRIVAL ring as the
        // rocket transits.
        const eLive = earthPos(simDay);
        const mLive = marsPos(simDay);
        const eAnchor = outPts.length > 0 ? outPts[0] : eLive;
        const mAnchor = outPts.length > 0 ? outPts[outPts.length - 1] : mLive;
        const ex = ptX(eLive.x);
        const ey = ptZ(eLive.z);
        const mx = ptX(mLive.x);
        const my = ptZ(mLive.z);
        const eAx = ptX(eAnchor.x);
        const eAy = ptZ(eAnchor.z);
        const mAx = ptX(mAnchor.x);
        const mAy = ptZ(mAnchor.z);
        // LAUNCH anchor ring (where Earth was at depDay).
        ctx2.beginPath();
        ctx2.arc(eAx, eAy, 12, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(75,156,211,0.7)';
        ctx2.lineWidth = 1.2;
        ctx2.stroke();
        ctx2.font = "bold 9px 'Space Mono', monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.textAlign = 'left';
        ctx2.fillText('LAUNCH', eAx + 16, eAy + 3);
        // ARRIVAL anchor ring (where the arc terminates).
        ctx2.beginPath();
        ctx2.arc(mAx, mAy, 11, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(193,68,14,0.7)';
        ctx2.lineWidth = 1.2;
        ctx2.stroke();
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.fillText('ARRIVAL', mAx + 14, mAy + 3);
        // Live Earth — halo + disc.
        const eg = ctx2.createRadialGradient(ex, ey, 0, ex, ey, 14);
        eg.addColorStop(0, 'rgba(75,156,211,0.6)');
        eg.addColorStop(1, 'rgba(75,156,211,0)');
        ctx2.beginPath();
        ctx2.arc(ex, ey, 14, 0, Math.PI * 2);
        ctx2.fillStyle = eg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx2.fillStyle = '#4b9cd3';
        ctx2.fill();
        ctx2.fillText('EARTH', ex + 9, ey + 3);
        // Live Mars — halo + disc.
        const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 12);
        mg.addColorStop(0, 'rgba(193,68,14,0.6)');
        mg.addColorStop(1, 'rgba(193,68,14,0)');
        ctx2.beginPath();
        ctx2.arc(mx, my, 12, 0, Math.PI * 2);
        ctx2.fillStyle = mg;
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(mx, my, 4, 0, Math.PI * 2);
        ctx2.fillStyle = '#c1440e';
        ctx2.fill();
        ctx2.fillText('MARS', mx + 9, my + 3);
      }

      // Spacecraft glyph — gold chevron sitting at sc.pos. The
      // heading rotation is preserved so the glyph points along the
      // direction of travel (eye reads "moving" from a glance), but
      // the shape is small enough (~6 px) that any heading drift
      // doesn't drag it off the arc visually. Matches the 3D sprite.
      const heading = spacecraftHeading(simDay, arcTimeline, outPts, retPts);
      const sx = ptX(sc.pos.x);
      const sy = ptZ(sc.pos.z);
      ctx2.save();
      ctx2.translate(sx, sy);
      ctx2.rotate(Math.atan2(heading.z, heading.x));
      // Halo
      const sg = ctx2.createRadialGradient(0, 0, 0, 0, 0, 10);
      sg.addColorStop(0, 'rgba(255,200,80,0.35)');
      sg.addColorStop(1, 'rgba(255,200,80,0)');
      ctx2.beginPath();
      ctx2.arc(0, 0, 10, 0, Math.PI * 2);
      ctx2.fillStyle = sg;
      ctx2.fill();
      // Chevron ▶
      ctx2.beginPath();
      ctx2.moveTo(6, 0);
      ctx2.lineTo(-4, 4);
      ctx2.lineTo(-2, 0);
      ctx2.lineTo(-4, -4);
      ctx2.closePath();
      ctx2.fillStyle = '#ffc850';
      ctx2.fill();
      ctx2.restore();

      // Flyby ring — anchored to the arc's flyby waypoint instead of
      // Mars's heliocentric position so the ring always sits on the
      // arc the spacecraft is flying. Same indexing the 3D side uses.
      if (sc.progress >= 0.45 && sc.progress <= 0.55 && outPts.length > 0) {
        const flybyIdx = Math.floor(0.95 * (outPts.length - 1));
        const fp = outPts[flybyIdx];
        const pulse = 0.5 + 0.5 * Math.sin(simDay * 0.5);
        ctx2.beginPath();
        ctx2.arc(cx + fp.x * SCALE_2D, cy + fp.z * SCALE_2D, 14 + pulse * 3, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(255,200,80,${0.5 + pulse * 0.3})`;
        ctx2.lineWidth = 1.5;
        ctx2.stroke();
      }

      // GH #107 — phase marker projection (2D view). Same shape as
      // the 3D path above; markers render as HTML overlays positioned
      // by eciKmToCanvas2dPx output (Moon) or helioAuToCanvas2dPx
      // (Mars/outer-system). Skipped only when the mission has neither.
      if (hasPhaseMarkers) {
        const view2d = {
          canvasWidth: W,
          canvasHeight: H,
          baseScale2dPerAu: BASE_SCALE_2D,
        };
        const simMet = simDay - mission.timeline.dep_day;
        const next: PhaseMarkerRenderState[] = [];
        // Moon path: ECI km → Earth-centred canvas pixels.
        if (isMoonMission) {
          for (const mk of phaseMarkers) {
            next.push({
              event: mk.event,
              scienceRef: mk.scienceRef,
              screen: eciKmToCanvas2dPx(mk.posKm, view2d),
              reveal: markerStateFor(mk.event.met_days ?? 0, simMet, { reducedMotion }),
              eventLabel: defaultEventLabel(mk.event.type),
            });
          }
        }
        // Mars / outer-system path: heliocentric AU → Sun-centred canvas pixels.
        if (!isMoonMission) {
          for (const mk of interplanetaryPhaseMarkers) {
            next.push({
              event: mk.event,
              scienceRef: mk.scienceRef,
              screen: helioAuToCanvas2dPx(mk.posAu, view2d),
              reveal: markerStateFor(mk.event.met_days ?? 0, simMet, { reducedMotion }),
              eventLabel: defaultEventLabel(mk.event.type),
            });
          }
        }
        phaseMarkerScreens = next;
      } else if (phaseMarkerScreens.length > 0) {
        phaseMarkerScreens = [];
      }
    }

    const onResize = () => {
      if (!container) return;
      const ratio = container.clientWidth / container.clientHeight;
      camera.aspect = ratio;
      camera.updateProjectionMatrix();
      cislunarCamera.aspect = ratio;
      cislunarCamera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      // EffectComposer maintains its own back-buffer at canvas size;
      // resize it together with the renderer so the post-processing
      // passes don't render at a stale resolution.
      helioHandles.composer.setSize(container.clientWidth, container.clientHeight);
    };
    lifecycle.on(window, 'resize', onResize);

    let lastTime = performance.now();
    // Latest heliocentric spacecraft world position — fed to the
    // cinematic-tier BokehPass focus uniform from the animate loop.
    // Null while the helio frame branch hasn't computed it yet (e.g.
    // during the cislunar phase).
    let scLastWorld: THREE.Vector3 | null = null;

    // raf pump with the TA.md document.hidden contract baked in —
    // see $lib/three/animate-loop. The onFrame body keeps the
    // raf-timestamp `now` semantics via a `performance.now()` read
    // at the top — same DOMHighResTimeStamp, sub-millisecond drift
    // that doesn't matter for sim-time integration / cinematic
    // beats / overlay refresh.
    const loop = createAnimateLoop({
      onFrame: () => {
        const now = performance.now();
        // Feed the runtime adaptive frame monitor — fires onStruggle if
        // the rolling-window average frame time stays over budget. The
        // monitor itself is non-blocking and drops backgrounded-tab dt
        // samples (>500 ms) so a tab-switch doesn't trip the toast.
        frameMonitor.tick();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        // Polish-wave-3 cinematic-beat dispatch — single pure call into
        // $lib/fly-cinematic-frame.runCinematicFrame. Handles cruise-hold
        // arming (W3.7), cut overlay (W3.6), peak-hold arm + afterglow
        // window (W3.1 + W3.2), finale opacities (W3.4), and returns
        // the freeze predicate that gates simDay advance + drives the
        // chrome-suppression class (W3.5). Same dispatcher is driven by
        // the test harness in #325 — prod + tests can't drift on call order.
        const currentFrameFlybyMet = parseFlybyMetFromSubPhase(lastHelioSubPhase);
        // Earth's longer 4 s hold is selected by looking at the active
        // event's label here — kept inline because it's mission-data-shape
        // dependent and not worth lifting into the helper.
        const activeFlybyEvtForHold = mission.flight?.events?.find(
          (e) => e.met_days === currentFrameFlybyMet,
        );
        const isEarthHold = (activeFlybyEvtForHold?.label ?? '').toLowerCase().includes('earth');
        const cineOut = runCinematicFrame(
          cine,
          {
            simDay,
            depDay: arcTimeline.dep_day,
            reducedMotion,
            isDrag,
            isMoonMission,
            currentFrameFlybyMet,
            isEarthFlyby: isEarthHold,
            cruiseHoldTriggerSimDay,
            flybyPeakDays: FLYBY_PEAK_DAYS,
          },
          now,
        );
        cutBlackOpacity = cineOut.cutBlackOpacity;
        inCinematicHeldBeat = cineOut.isCinematicFreeze;
        finaleCaptionOpacity = cineOut.finaleCaptionOpacity;
        finaleBlackOpacity = cineOut.finaleBlackOpacity;
        const isCinematicFreeze = cineOut.isCinematicFreeze;

        if (isPlaying && now >= launchDwellUntil && !isCinematicFreeze) {
          simDay += dt * simSpeed;
          if (simDay > arcTimeline.arr_day + 30) simDay = arcTimeline.dep_day;
        }
        // Cinematic cruise motion — three subtle, slow oscillations
        // layered on top of each other so the camera never feels static
        // during long cruise spans (Voyager 2's ~12-year cruise is
        // ~60 wall-clock minutes at 90× simSpeed; the cruise phase
        // can't be a held shot). All skipped under reduced-motion,
        // while the user is dragging, during a sub-phase lerp, and
        // during Moon-mode.
        // - Azimuthal drift: slow horizontal orbit around the target.
        // - Zoom breathing: camR oscillates ±15 % over a 90-second wall-
        //   clock cycle — gentle "in / out" motion.
        // - Tilt drift: camP oscillates ±0.10 rad over a 180-second
        //   cycle — adds elevation parallax.
        // Polish-wave-3 Fix A — sim-speed factor scales every camT arc
        // rotation + the cruise zoom/tilt lerps. Same problem as the
        // main lerp/track block: the rotations were tuned for 7 d/s.
        // At 30 d/s an entire Cassini Jupiter→Saturn cruise takes ~43
        // wall-clock seconds; the 0.05 rad/s cruise rotation = 2.15 rad
        // total = ~123° of azimuth swing. The cinematic motion was
        // designed for slow play; at high speeds the rotations get
        // overwhelmed by the world racing past. Scaling them keeps the
        // visual cadence consistent with the simulation speed.
        const simSpeedFactor = Math.max(1, simSpeed / 7);
        if (
          !isMoonMission &&
          !reducedMotion &&
          !isDrag &&
          !helioAutoZoomActive &&
          (lastHelioSubPhase === 'cruise-out' || lastHelioSubPhase === 'cruise-back')
        ) {
          camT += 0.05 * dt * simSpeedFactor;
          const t = now * 0.001; // seconds
          // Zoom breathing — modulate around the steady-state cruise
          // target radius. helioAutoZoomTargetR holds the cruise-wide
          // value; we add a sinusoid on top so camR breathes.
          const ZOOM_AMP = helioAutoZoomTargetR * 0.15;
          const zoomOsc = Math.sin((t * (Math.PI * 2)) / 90) * ZOOM_AMP;
          camR += (helioAutoZoomTargetR + zoomOsc - camR) * 0.005 * simSpeedFactor;
          // Tilt drift — modulate camP around cruise default.
          const TILT_AMP = 0.1;
          const tiltOsc = Math.sin((t * (Math.PI * 2)) / 180) * TILT_AMP;
          camP += (HELIO_CRUISE_P + tiltOsc - camP) * 0.005 * simSpeedFactor;
        }
        // #82 epilogue — slow azimuthal rotation around the Sun so the
        // tableau visibly rotates while the audience reads the trajectory
        // arc. 0.04 rad/s × dt × simSpeedFactor keeps the rotation
        // cinematic at all sim speeds (though sim is paused in arrived
        // state, so simSpeedFactor=1 effectively).
        if (!isMoonMission && !reducedMotion && !isDrag && epilogueActive) {
          camT += 0.04 * dt;
        }
        // #86 — same slow azimuthal rotation during the opening's wide
        // phase. Halts once the camera starts lerping to Earth closeup
        // so the composition settles into prelaunch.
        if (!isMoonMission && !reducedMotion && !isDrag && openingActive) {
          const elapsedO = openingStartedAt > 0 ? performance.now() - openingStartedAt : 0;
          if (elapsedO < openingDurationMs - 1000) {
            camT += 0.04 * dt;
          }
        }
        // Approach sweep — slow azimuthal arc around the ship-dest
        // midpoint during the final outbound leg. Paired with the
        // wide → close framing lerp (see updateHelioAutoZoomTargets
        // 'approach' branch), this gives the audience the choreographed
        // "zoom out, zoom in, rotate, follow ship, come to planet"
        // sequence the user asked for at the Saturn arrival.
        if (
          !isMoonMission &&
          !reducedMotion &&
          !isDrag &&
          !helioAutoZoomActive &&
          lastHelioSubPhase === 'approach'
        ) {
          // 0.08 rad/s — a touch faster than cruise (0.05) so the
          // rotation is visibly an "arc around the destination", not
          // just the slow cruise breathing.
          camT += 0.08 * dt * simSpeedFactor;
        }
        // Flyby cinema sweep — slow azimuthal orbit + gentle pitch tilt
        // around the body during a flyby sub-phase. Borrows from the
        // NASA mission-art reference set (Cassini-Saturn, Juno-Jupiter,
        // Galileo-Jupiter): the body holds frame while the camera arcs
        // around it, giving the moment a "hero shot" feel instead of a
        // static planet-centered lookup. Skipped under reduced-motion,
        // while the user is dragging, and during the initial sub-phase
        // lerp so the camera settles before the sweep starts.
        // Polish-wave-3 W3.1 — peak-hold arming + re-arm reset.
        // Runs EVERY frame (not gated on flyby sub-phase OR on
        // !helioAutoZoomActive) so:
        //   1. The reset fires when the user scrubs out of a held
        //      flyby into launch / cruise / arrived states — otherwise
        //      cine.peakHoldArmedForFlybyMet stays stale and re-jumping to
        //      the same flyby never re-arms.
        //   2. The ARM fires the instant we're inside the ±0.5 sim-day
        //      window of a flyby moment — even if the cinematic lerp
        //      hasn't converged yet. Gating arming on !helioAutoZoomActive
        //      meant the camera kept lerping right through the held
        //      window when the previous framing was far from the new
        //      cinema target (e.g. scrubbing from launch wide R=50 to a
        //      flyby R=13).
        //
        // The peak-hold arm step (W3.1) + afterglow window setup (W3.2)
        // now fires inside runCinematicFrame at the top of the frame —
        // see the cineOut block above. currentFrameFlybyMet is still in
        // scope from there for the parallax-orbit gate below.
        if (
          !isMoonMission &&
          !reducedMotion &&
          !isDrag &&
          !helioAutoZoomActive &&
          lastHelioSubPhase?.startsWith('flyby-')
        ) {
          // Parallax orbit — camera arcs around the body during the
          // flyby cinema. Default 0.05 rad/s during approach + depart;
          // boosted 3× during the FLYBY_PEAK_DAYS window (closest-
          // approach beat). The boost creates the "camera moves while
          // the ship holds" cinematic — the camera-disagree principle
          // (shot-language guide P6). Without it the flyby reads as
          // static.
          const flybyMetActive = currentFrameFlybyMet;
          const inPeak =
            flybyMetActive != null &&
            Math.abs(simDay - (arcTimeline.dep_day + flybyMetActive)) < FLYBY_PEAK_DAYS;
          // Arming was hoisted to the frame-top block (runs every frame
          // so it fires even mid-lerp). Here we only honour the active
          // cine.peakHoldUntil window to suppress the parallax arc rotation +
          // pitch breathing — during the hold and the afterglow the
          // camera should hold entirely still / pure-dolly, not arc.
          if (!isCinematicFreeze) {
            if (helioFlybyDesiredCamT !== null) {
              // Anti-occlusion lerp — pull camT toward the perpendicular
              // azimuth so the planet doesn't sit between the camera and
              // the spacecraft. Shortest-arc delta so the swing never
              // takes the long way around. Faster lerp during peak so
              // the iconic frame settles by the hold instant. Layer a
              // small idle oscillation on top so the camera still has
              // motion (camera-disagree principle) without re-introducing
              // the free-spin occlusion bug.
              const TAU = Math.PI * 2;
              let delta = (((helioFlybyDesiredCamT - camT) % TAU) + TAU) % TAU;
              if (delta > Math.PI) delta -= TAU;
              // Bumped 4× over the original — the choreography's
              // desiredCamT moves ~0.55 rad/sec during the pan window,
              // and at the old 0.025/0.06 rates the steady-state lag was
              // ~21°, leaving the camera still converging WHEN the ship
              // hit peak (user-reported "ship goes through planet, then
              // scene pauses, THEN camera rotates"). At 0.10 normal /
              // 0.25 peak, steady-state lag drops below 5° so the
              // camera arrives at the iconic frame well before peak and
              // just holds.
              const lerpRate = inPeak ? 0.25 : 0.1;
              camT += delta * lerpRate * dt * simSpeedFactor * 60;
              // Small ±0.02 rad oscillation (~1.1°) over a 12 s cycle so
              // the camera breathes even after it settles into framing.
              const oscPhase = (now * 0.001 * (Math.PI * 2)) / 12;
              camT += Math.cos(oscPhase) * 0.0008 * dt * 60;
            } else {
              // Fix A — scale by simSpeed for consistent visual cadence at
              // high speeds (same reason the cruise/approach arcs scale).
              camT += (inPeak ? 0.15 : 0.05) * dt * simSpeedFactor;
            }
            // Gentle pitch breathing around the approach tilt, ±0.05 rad
            // over a 30-second cycle — adds parallax without making the
            // ecliptic plane swing too far.
            const t = now * 0.001;
            const TILT_AMP = 0.05;
            const tiltOsc = Math.sin((t * (Math.PI * 2)) / 30) * TILT_AMP;
            camP += (HELIO_APPROACH_P + tiltOsc - camP) * 0.008;
          }
        }
        // Re-aim the helio camera each frame so the sub-phase auto-zoom
        // lerps (depart → cruise → approach → arrival) actually advance —
        // updateHelioAutoZoomTargets needs to be re-sampled with the
        // live spacecraft + planet positions and the lerp inside updateCam
        // has to run per-frame to converge. Moon-mode additionally needs
        // the per-frame Earth-Moon-midpoint re-aim baked into updateCam.
        updateCam();

        // Moon-mode rendering: heliocentric, same framing as Mars.
        // Sun + Earth orbit visible in the background; Earth at its
        // live heliocentric position; Moon orbits Earth at the
        // exaggerated MOON_FLY_RADIUS_AU (real Earth-Moon distance is
        // sub-pixel at this scale). The cislunar arc runs from
        // Earth-at-dep to Moon-at-arr in heliocentric AU. Mars + Mars
        // orbit hidden so the scene focuses on Earth+Moon.
        if (isMoonMission) {
          marsMesh.visible = false;
          sunCore.visible = true;
          sunGlow.visible = true;
          earthOrbitLine.visible = true;
          helioHandles.setDestinationOrbitVisible(false);
          moonMesh.visible = true;
          const ePos = earthPos(simDay);
          const mPos = moonHelioPos(simDay);
          earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
          moonMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);
          // Track Moon's orbit ring to Earth's heliocentric position so
          // it stays centred on Earth as both drift around the Sun.
          if (moonOrbitRing && moonOrbitRing.visible) {
            moonOrbitRing.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
          }
        } else {
          marsMesh.visible = true;
          sunCore.visible = true;
          // Sun glow halo dominates the frame during the iconic-photo
          // flyby cinema (the 20u additive halo overpowers a planet
          // that fills only ~6u in radius), so hide it while a flyby
          // sub-phase is active. Restored once cruise resumes.
          sunGlow.visible = !lastHelioSubPhase?.startsWith('flyby-');
          earthOrbitLine.visible = true;
          helioHandles.setDestinationOrbitVisible(true);
          moonMesh.visible = false;
          if (moonOrbitRing) moonOrbitRing.visible = false;
          // Earth + Mars orbit the Sun in real time as the spacecraft
          // flies. The fixed convergence points (where Earth was at
          // launch and where Mars will be at arrival) are marked by
          // the persistent LAUNCH / ARRIVAL anchor rings, which stay
          // pinned to outPts[0] and outPts[N-1] in the marker $effect.
          // Separating "live planet body" from "mission anchor" lets
          // the user watch Mars travel along its orbit toward the
          // arrival ring as the spacecraft transits.
          const ePos = earthPos(simDay);
          // Destination position uses the active mission's target body,
          // not always Mars. Jupiter / Saturn / Neptune / Pluto / Ceres
          // missions now render their actual target instead of a
          // confusing Mars stand-in. Reads currentDestMeshId so a
          // secondary-flyby swap (NH at Arrokoth post-Pluto) positions
          // the destinationMesh at the swapped body's heliocentric
          // location, not the mission's primary.
          const mPos = destinationPos(simDay, currentDestMeshId);
          earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
          marsMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);
          // Earth's Hill sphere + L1/L2 track Earth's per-frame position.
          helioHandles.updateHillSphereForBody('earth', ePos.x * SCALE_3D, ePos.z * SCALE_3D);
          helioHandles.updateMagnetosphereForBody('earth', ePos.x * SCALE_3D, ePos.z * SCALE_3D);
          helioHandles.updateMoonsForParent('earth', ePos.x * SCALE_3D, ePos.z * SCALE_3D, simDay);
          // Context planets — per-frame position updates for any non-
          // active planet rendered for grand-tour context. Each mesh
          // tracks its heliocentric position at simDay so the user
          // sees Venus where Venus was when Cassini did its flybys,
          // Jupiter where it was when Voyager 2 swung past, etc.
          for (const [planetId, mesh] of helioHandles.contextPlanets) {
            if (!mesh.visible) continue;
            const p = destinationPos(simDay, planetId);
            mesh.position.set(p.x * SCALE_3D, 0, p.z * SCALE_3D);
            // Hill sphere + Lagrange overlays follow the planet; they
            // hide via setHillSpheresVisible / setLagrangePointsVisible
            // when the lens layer is off, so this update is cheap when
            // unused (just position writes — no geometry rebuild).
            helioHandles.updateHillSphereForBody(planetId, p.x * SCALE_3D, p.z * SCALE_3D);
            helioHandles.updateMagnetosphereForBody(planetId, p.x * SCALE_3D, p.z * SCALE_3D);
            helioHandles.updateMoonsForParent(planetId, p.x * SCALE_3D, p.z * SCALE_3D, simDay);
          }
          // Active destination also gets moon updates so Jupiter/Saturn
          // missions (Cassini, Juno, Voyager) show their moons at the
          // destination they're rendering live.
          helioHandles.updateMoonsForParent(
            activeDestination,
            mPos.x * SCALE_3D,
            mPos.z * SCALE_3D,
            simDay,
          );
          // Active destination — its Hill sphere lives in the same
          // entries map, keyed by planet id.
          helioHandles.updateHillSphereForBody(
            activeDestination,
            mPos.x * SCALE_3D,
            mPos.z * SCALE_3D,
          );
          helioHandles.updateMagnetosphereForBody(
            activeDestination,
            mPos.x * SCALE_3D,
            mPos.z * SCALE_3D,
          );
        }

        const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
        // Sprite glyph sits at sc.pos. No lookAt — sprites face the
        // camera by construction so the glyph is always centred on the
        // arc regardless of curvature.
        scSprite.position.set(sc.pos.x * SCALE_3D, (sc.pos.y ?? 0) * SCALE_3D, sc.pos.z * SCALE_3D);
        // Per-mission 3D model rides the same position. Visibility +
        // arrival-hide handled by the same code path that owns scSprite
        // a few lines below; here we only update the transform.
        if (scModel) {
          scModel.position.copy(scSprite.position);
        }
        // During flyby cinema the camera is tight on the planet (camR =
        // 2.4 × body radius). The default 4×4 sprite + 3.0 model scale
        // are sized for cruise — at flyby they swamp the planet and
        // look 'cartoonish'. Scale down so the ship reads as a
        // foreground accent against the body, matching the NASA mission-
        // art compositions. Outside the cinema window the ship goes
        // back to its cruise scale.
        // Cinema also offsets the ship TOWARD the camera so the 3D
        // model sits geometrically in front of the planet body — the
        // hero-shot composition from the NASA mission-art reference
        // set (Cassini-Saturn, Juno-Jupiter): ship as foreground accent,
        // planet limb behind. Without this offset, even with the +y
        // waypoint anchor, the camera-elevation angle could still put
        // the model behind the planet's z-range and the planet's
        // opaque MeshPhongMaterial occludes it.
        if (lastHelioSubPhase?.startsWith('flyby-')) {
          // Push the ship toward the camera by the flyby body's radius
          // — enough to clear the planet's front face. activeFlybyMet
          // + flybyId tracked via __flyDebug; use the body's PLANET_SIZE
          // for the offset magnitude. Stays inside the cinema target
          // sphere (camR = 2.4·r), so the ship doesn't fly off-frame.
          const flybyDbg = window.__flyDebug;
          const bodyR = flybyDbg?.flybySize ?? 2.5;
          const overrideCamR = FLYBY_OVERRIDES[flybyDbg?.flybyId ?? '']?.toCameraR ?? 1.4;
          const camToShip = new THREE.Vector3().subVectors(camera.position, scSprite.position);
          const dist = camToShip.length();
          if (dist > 0.01) {
            camToShip.multiplyScalar((bodyR * overrideCamR) / dist);
            scSprite.position.add(camToShip);
            if (scModel) scModel.position.copy(scSprite.position);
          }
          // Scale the ship to read as a foreground hero without
          // swamping the body. Each flyby tunes its own scale via
          // FLYBY_OVERRIDES below (Saturn arrival keeps its smaller
          // ship-on-rings look, Jupiter takes a closer-in scale, etc.)
          // — the variation matches the NASA reference set, which
          // doesn't use a single universal composition.
          const overrides = FLYBY_OVERRIDES[flybyDbg?.flybyId ?? ''] ?? {
            spriteScale: 1.8,
            modelScale: 1.3,
            toCameraR: 1.4,
          };
          scSprite.scale.set(overrides.spriteScale, overrides.spriteScale, 1);
          if (scModel) scModel.scale.setScalar(overrides.modelScale);
          // Boom orientation: rotate the 3D model so its iconic-front
          // axis faces (roughly) the camera and the long magnetometer
          // boom angles AWAY from the planet's limb. Each builder model
          // ships with its own default axes — Cassini's HGA dish faces
          // +X, magnetometer boom extends along -Y. lookAt(camera)
          // orients the model's -Z toward the camera; rotating around
          // local Y by +π/2 brings +X (dish) to that direction. Then
          // an additional tilt around local Z lifts the boom off the
          // planet-ship-camera plane so it reads as a graceful sweep
          // across the frame instead of running through the planet.
          if (scModel) {
            scModel.lookAt(camera.position);
            scModel.rotateY(Math.PI / 2);
            scModel.rotateZ(-0.35); // 20° tilt so the boom angles up-left
          }
        } else {
          scSprite.scale.set(2.5, 2.5, 1);
          if (scModel) {
            scModel.scale.setScalar(1.5);
            // Cruise: reset to identity orientation so the model rides
            // along the trajectory without the cinema-specific tilt.
            scModel.rotation.set(0, 0, 0);
          }
        }

        // Phase-based visibility: LAUNCH + ARRIVAL anchor rings both stay
        // visible from pre-launch through the entire flight so the user
        // can always see where the mission started and where it's going;
        // both hide on arrival together with the trajectory line so the
        // scene "freezes" to just the planets continuing their orbits.
        // Spacecraft sprite also hides on arrival.
        const phaseNow = sc.phase;
        const afterArrival = phaseNow === 'arrived';
        // First-frame arrival snap. Pre-polish-wave-2 the camera spent
        // ~10 s of wall-clock LERPing from the cruise-out wide frame
        // toward the arrived target — user feedback "after arrival
        // milestone is not optimal, mostly empty space in camera; last
        // 10 s are really good but before that is not." The lerp is the
        // last 10 s catching up. Snap once on the phase transition so
        // the user lands directly on the parked-in-orbit composition.
        if (phaseNow === 'arrived' && !cine.arrivalSnapped) {
          camSnapUntil = performance.now() + 1500;
          cine.arrivalSnapped = true;
          // W3.4 — kick off the end-of-mission locked-off finale on
          // one-way helio missions (round-trip endings at Earth and
          // moon-missions are handled differently and stay out of the
          // finale path). Starts AFTER the 1.5 s arrival snap so the
          // parked-in-orbit composition is in frame before the lock.
          // Finale lock (MISSION END caption + 12 s Saturn closeup hold +
          // black fade) was removed per Marko — the epilogue tableau
          // already carries an end-of-mission caption ("MISSION FLIGHT
          // PATH · <mission>") and stacking two title beats reads as
          // redundant. We now go straight from arrival → epilogue: the
          // arrived-branch's epilogueActive trigger below is the only
          // end-of-mission camera mode. inMissionFinale stays false so
          // none of the finale-caption / finale-black / Saturn-closeup-
          // hold UI ever fires.
          const isOneWayHelioEnd = !isMoonMission && retPts.length < 2;
          if (isOneWayHelioEnd && epilogueStartedAt === 0) {
            epilogueStartedAt = performance.now();
            epilogueActive = true;
          }
        }
        // Re-arm the snap when the user scrubs back out of arrived so a
        // subsequent re-entry into arrived triggers the snap again.
        if (phaseNow !== 'arrived' && cine.lastSeenPhase === 'arrived') {
          cine.arrivalSnapped = false;
          // Re-arm the finale too. User scrubbed back into the mission;
          // next re-entry into arrived should fire a fresh finale.
          cine.finaleStartedAt = 0;
          inMissionFinale = false;
          finaleCaptionOpacity = 0;
          finaleBlackOpacity = 0;
          // #82 — clear the epilogue tableau so re-entering arrived
          // gets a fresh finale + epilogue sequence.
          epilogueStartedAt = 0;
          epilogueActive = false;
          epilogueCaptionOpacity = 0;
        }
        cine.lastSeenPhase = phaseNow;
        // W3.4 — finale opacities (caption + black) are computed by
        // runCinematicFrame at the top of the frame and already written
        // to finaleCaptionOpacity / finaleBlackOpacity. Here we only
        // handle the post-settle transition into the #82 epilogue
        // tableau — wide top-down system view + slow rotation + the
        // full mission trajectory visible.
        if (cineOut.finaleSettled) {
          inMissionFinale = false;
          if (epilogueStartedAt === 0) {
            epilogueStartedAt = performance.now();
            epilogueActive = true;
          }
        }
        // #82 — epilogue tableau. Once active, fade the finale-black
        // overlay BACK OUT to 0 over 1.5 s, lerp the camera to a wide
        // Sun-centred top-down composition, slowly rotate the system
        // around camT, and surface a "MISSION FLIGHT PATH · <name>"
        // caption. The full out-line / dep+arr markers remain visible
        // (see the helio-trajectory visibility block below). Stays
        // until the user scrubs out (resetCinematicForMissionSwap or
        // the phase-leaves-arrived reset wipe it).
        if (epilogueActive && epilogueStartedAt > 0) {
          const elapsedE = performance.now() - epilogueStartedAt;
          // Black fade-out 1 → 0 across the first 1.5 s
          if (elapsedE < 1500) {
            finaleBlackOpacity = Math.max(0, 1 - elapsedE / 1500);
          } else {
            finaleBlackOpacity = 0;
          }
          // Caption fade-in 0 → 1 across t=1500 → 2500
          if (elapsedE >= 1500) {
            epilogueCaptionOpacity = Math.min(1, (elapsedE - 1500) / 1000);
          }
        }
        // #86 opening — title (mission name + agency + years), context
        // (story + stats), fleet asset cards fade in sequentially over
        // ~5.5 s while the camera holds at the wide top-down system view.
        // Then everything fades out 7.5 → 9.5 s and the camera lerps to
        // the prelaunch Earth-closeup composition for the 4 s W3.3
        // launch dwell. At 13.5 s the launch ring fires.
        if (openingActive && openingStartedAt > 0) {
          const elapsedO = performance.now() - openingStartedAt;
          // Faster fade-out per user feedback — 2000 ms → 1000 ms so the
          // scene reveals more crisply as the title overlays clear. The
          // camera lerp gate (in updateHelioAutoZoomTargets 'opening'
          // branch) uses the same fadeOutAt so the wide → Earth-closeup
          // transition aligns with the visual fade.
          const fadeOutAt = openingDurationMs - 1000;
          const endAt = openingDurationMs;
          // Title fade-in 0 → 1 across 0 → 1000 ms, fade-out 1000 ms
          if (elapsedO < 1000) {
            openingTitleOpacity = elapsedO / 1000;
          } else if (elapsedO < fadeOutAt) {
            openingTitleOpacity = 1;
          } else if (elapsedO < endAt) {
            openingTitleOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
          } else {
            openingTitleOpacity = 0;
          }
          // Context fade-in 1500 → 3000 ms
          if (elapsedO < 1500) {
            openingContextOpacity = 0;
          } else if (elapsedO < 3000) {
            openingContextOpacity = (elapsedO - 1500) / 1500;
          } else if (elapsedO < fadeOutAt) {
            openingContextOpacity = 1;
          } else if (elapsedO < endAt) {
            openingContextOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
          } else {
            openingContextOpacity = 0;
          }
          // Fleet asset cards fade-in 3000 → 5000 ms
          if (elapsedO < 3000) {
            openingFleetOpacity = 0;
          } else if (elapsedO < 5000) {
            openingFleetOpacity = (elapsedO - 3000) / 2000;
          } else if (elapsedO < fadeOutAt) {
            openingFleetOpacity = 1;
          } else if (elapsedO < endAt) {
            openingFleetOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
          } else {
            openingFleetOpacity = 0;
          }
          // End opening at adaptive endAt
          if (elapsedO >= endAt) {
            openingActive = false;
            openingTitleOpacity = 0;
            openingContextOpacity = 0;
            openingFleetOpacity = 0;
          }
        }
        // The LAUNCH / ARRIVAL anchor rings + their date sprites are
        // sized for the wide cruise framing. At any closeup sub-phase
        // (helio flyby cinema, helio prelaunch / approach / depart,
        // cislunar Moon / Earth phase closeups, Mars rover landing,
        // any mission's tight camera moment) the rings + dates loom
        // huge and dominate the body+ship hero composition — "the
        // date is bigger than Saturn." Always ugly when zoomed in.
        // Show only when the auto-camera is in a wide cruise framing.
        const wideHelio =
          lastHelioSubPhase === 'cruise-out' ||
          lastHelioSubPhase === 'cruise-back' ||
          lastHelioSubPhase === null;
        // Cislunar wide = not in a closeup phase. lastAutoZoomPhase is
        // normally a phase-type string (e.g., "tli_coast",
        // "lunar_orbit_near_moon") — non-null for the whole mission.
        // The "wide" phases (cruise + the translunar coasts) leave
        // autoZoomTargetR at WIDE_DISTANCE; the close-up phases
        // (LUNAR_PHASE_TYPES + EARTH_PHASE_TYPES + the proximity
        // sentinel "_near_moon" suffix) pull the camera tight. Test
        // the target distance directly: if the camera is still aiming
        // at the wide framing, the rings are safe to show.
        const wideCislunar = autoZoomTargetR >= WIDE_DISTANCE * 0.9;
        const wideEnoughForAnchors = isMoonMission ? wideCislunar : wideHelio;
        const showAnchors = !afterArrival && wideEnoughForAnchors;
        if (depMarker) depMarker.visible = showAnchors;
        if (depLabelSprite) depLabelSprite.visible = showAnchors;
        if (arrMarker) arrMarker.visible = showAnchors;
        if (arrLabelSprite) arrLabelSprite.visible = showAnchors;
        const showRet = showAnchors && retPts.length >= 2;
        if (retMarker) retMarker.visible = showRet;
        if (retLabelSprite) retLabelSprite.visible = showRet;
        // #82 — keep the full trajectory visible during the epilogue
        // tableau (the whole point is to show the "where the mission
        // went" arc as a static visual). Hide during flyby cinema so
        // the iconic frozen frame isn't cluttered with the trajectory
        // chord — same rule as the phase-marker label hiding. Marko:
        // "when we zoom in also hide blue line as we hid the
        // milestone marker."
        const inFlybyCinemaForLines = lastHelioSubPhase?.startsWith('flyby-') ?? false;
        if (outLine) outLine.visible = (!afterArrival || epilogueActive) && !inFlybyCinemaForLines;
        if (retLine)
          retLine.visible =
            (!afterArrival || epilogueActive) && retPts.length >= 2 && !inFlybyCinemaForLines;
        // When a per-mission 3D model is present, it becomes the primary
        // glyph and the generic sprite hides entirely (no duplication).
        // Otherwise the sprite remains the glyph.
        //
        // Pre-polish-wave-2 this hid both the model and sprite the
        // moment phase === 'arrived'. User feedback: "at end spaceship
        // disappears and we said we want it parked in orbit, not gone."
        // Keep the ship visible at arrival so the final frame reads as
        // "spacecraft is now in orbit" (Cassini at Saturn) or "returned
        // home" (round-trip at Earth) instead of "ship gone."
        if (scModel) {
          scSprite.visible = false;
          scModel.visible = true;
        } else {
          scSprite.visible = true;
        }

        // Freeze playback on arrival — the planets should stop where they
        // are when the mission completes, not keep orbiting indefinitely.
        // Manually pressing play again or scrubbing the timeline still
        // works; this just stops the auto-advance loop.
        if (afterArrival && isPlaying) {
          isPlaying = false;
        }

        // ─── Science Layers — per-frame overlay updates ──────────────
        // Position SoI rings at Earth + Mars (or Earth + Moon in cislunar
        // mode) and refresh gravity arrows on the spacecraft. Hidden
        // layers don't bypass this work but their geometry is invisible
        // — cheap.
        // sc.pos.y is non-zero at intermediate flyby waypoints (polish-
        // wave-2 spline +y offset so the path passes ABOVE the planet
        // instead of through it). Hard-coding y=0 here meant the science-
        // layer arrows (gravity to Sun + Earth, velocity tangent,
        // centripetal) sat on the ecliptic plane while the spacecraft
        // sprite + model floated above, with the offset growing
        // visible at the peak of each intermediate flyby. Same bug
        // as the FD-diamond y=0 projection; matching fix.
        const scWorld = new THREE.Vector3(
          sc.pos.x * SCALE_3D,
          (sc.pos.y ?? 0) * SCALE_3D,
          sc.pos.z * SCALE_3D,
        );
        // Stash the latest helio ship position for the cinematic-tier
        // Bokeh DoF focus uniform — set in the post-render branch below.
        scLastWorld = scWorld;

        // Fix B (ship-in-frame safety net) was reverted in commit
        // 5a4… — it fought the cinematic LERP (both nudged camTarget
        // each frame in opposite directions) AND compounded camR ×1.2
        // every frame the ship was off-screen, which caused the camera
        // to zoom out unboundedly during the post-Jupiter cruise. Fix A
        // alone (sim-speed-aware lerp + arc rotation, see updateCam
        // closure) covers the original "all black" symptom; if edge
        // cases remain, a non-conflicting safety net would need to
        // operate on the camera lerp target, not the live camTarget.

        const earthWorld = earthMesh.position;
        const marsWorld = marsMesh.position;

        // Keep Mars / Moon SoI visibility in sync with isMoonMission on
        // every mission swap (cheap; just two boolean assignments). The
        // layer-on flag itself comes from the onLayerChange subscription.
        // marsSoI is also gated on activeDestination === 'mars' so it
        // doesn't render at the wrong scale for outer-planet missions.
        marsSoI.visible = soiLayerOn && !isMoonMission && activeDestination === 'mars';
        moonSoI.visible = soiLayerOn && isMoonMission;
        if (earthSoI.visible) earthSoI.position.copy(earthWorld);
        if (marsSoI.visible) marsSoI.position.copy(marsWorld);
        if (moonSoI.visible) moonSoI.position.copy(moonMesh.position);

        // Coast preview: walk FORWARD along outPts from the current
        // spacecraft position to the arc terminus. Previously this drew
        // a Keplerian conic projected from current (r, v) — physically
        // correct as "what happens with no further help", but for grand-
        // tour missions (Cassini, Voyager) the conic diverges hard from
        // the multi-waypoint spline because the spline ASSUMES the
        // future gravity assists land. The conic doesn't model them, so
        // the predicted line looped around the Sun while the actual
        // trajectory bent outward at each flyby — visually contradicting
        // the rendered tube. Forward-walking outPts shows the same
        // planned path the spacecraft is committed to.
        if (coastLine.visible && outPts.length >= 2) {
          const total = arcTimeline.arr_day - arcTimeline.dep_day;
          const t =
            total > 0 ? Math.max(0, Math.min(1, (simDay - arcTimeline.dep_day) / total)) : 0;
          const startIdx = Math.floor(t * (outPts.length - 1));
          const samples = outPts.length - startIdx;
          const scenePositions = new Float32Array(samples * 3);
          for (let i = 0; i < samples; i++) {
            const p = outPts[startIdx + i];
            scenePositions[i * 3] = p.x * SCALE_3D;
            scenePositions[i * 3 + 1] = (p.y ?? 0) * SCALE_3D;
            scenePositions[i * 3 + 2] = p.z * SCALE_3D;
          }
          const geom = coastLine.geometry as THREE.BufferGeometry;
          geom.setAttribute('position', new THREE.BufferAttribute(scenePositions, 3));
          geom.attributes.position.needsUpdate = true;
          geom.computeBoundingSphere();
          coastLine.computeLineDistances();
        }

        if (gravArrowEarth.visible || gravArrowSun.visible) {
          // Distances in km between spacecraft and source bodies. The
          // /fly scene unit is SCALE_3D × AU, so convert: scene → AU →
          // km.
          const auPerScene = 1 / SCALE_3D;
          const dEarthScene = scWorld.distanceTo(earthWorld);
          const dEarthKm = dEarthScene * auPerScene * 149_597_870.7;
          const dSunKm = scWorld.length() * auPerScene * 149_597_870.7;

          // Gravity acceleration (m/s²) — same units as physics; log
          // scale collapses the wide dynamic range into visible arrows.
          const aEarth = gravityAccel(BODY_MASS_KG.earth, dEarthKm);
          const aSun = gravityAccel(BODY_MASS_KG.sun, dSunKm);

          // Earth arrow: anchor at spacecraft, point toward Earth.
          gravArrowEarth.position.copy(scWorld);
          const dirEarth = new THREE.Vector3().subVectors(earthWorld, scWorld).normalize();
          gravArrowEarth.setDirection(dirEarth);
          gravArrowEarth.setLength(
            logScaleLength(aEarth, 1.5, 18, 1e-6, 10),
            0.7, // head length
            0.4, // head width
          );

          // Sun arrow: anchor at spacecraft, point toward Sun (origin).
          gravArrowSun.position.copy(scWorld);
          const dirSun = new THREE.Vector3()
            .subVectors(new THREE.Vector3(0, 0, 0), scWorld)
            .normalize();
          gravArrowSun.setDirection(dirSun);
          gravArrowSun.setLength(logScaleLength(aSun, 1.5, 18, 1e-6, 10), 0.7, 0.4);
        }

        // Velocity tangent on spacecraft: finite-difference of next-frame
        // position from the arc geometry, normalized + scaled by current
        // heliocentric speed.
        if (velocityArrow.visible || centripetalArrow.visible) {
          const sc1 = spacecraftPos(simDay + 0.5, arcTimeline, outPts, retPts).pos;
          const dx = (sc1.x - sc.pos.x) * SCALE_3D;
          const dz = (sc1.z - sc.pos.z) * SCALE_3D;
          const dirMag = Math.hypot(dx, dz);
          if (velocityArrow.visible && dirMag > 0.0001) {
            velocityArrow.position.copy(scWorld);
            const tangent = new THREE.Vector3(dx / dirMag, 0, dz / dirMag);
            velocityArrow.setDirection(tangent);
            // Scale arrow length by heliocentric speed (km/s) — typical
            // 25-35 km/s on the cruise. 0.4 unit per km/s gives ~12-14
            // unit arrows that read clearly.
            const vLen = Math.min(20, Math.max(4, heliocentricKms * 0.4));
            velocityArrow.setLength(vLen, 0.7, 0.4);
          }
          if (centripetalArrow.visible) {
            centripetalArrow.position.copy(scWorld);
            // Centripetal acceleration on a Keplerian arc points toward
            // the central body — for a heliocentric arc that's the Sun.
            // Same direction as the gravity-from-Sun arrow.
            const dirSun = new THREE.Vector3()
              .subVectors(new THREE.Vector3(0, 0, 0), scWorld)
              .normalize();
            centripetalArrow.setDirection(dirSun);
            // Length proxy via Sun-gravity acceleration so the arrow
            // size mirrors the curvature of the trajectory at this r.
            const aSun2 = gravityAccel(
              BODY_MASS_KG.sun,
              scWorld.length() * (149_597_870.7 / SCALE_3D),
            );
            centripetalArrow.setLength(logScaleLength(aSun2, 1.2, 14, 1e-6, 10), 0.7, 0.4);
          }
        }

        // #1 Engine plume — directed cone at the spacecraft during burn
        // events. Hidden when no burn is active. Per-event-type config:
        //   - launch: exhaust toward Earth (outward thrust)
        //   - tli_or_tmi: exhaust retrograde (prograde acceleration)
        //   - tcm: small retrograde
        //   - edl_or_oi: exhaust prograde (retrograde deceleration)
        // Opacity ramps in/out across ±BURN_WINDOW_DAYS.
        if (!isMoonMission && mission.flight?.events) {
          const BURN_WINDOW_DAYS_DEFAULT = 2;
          type BurnConfig = {
            scale: number;
            mode: 'inward' | 'retro' | 'pro';
            /** Optional per-event-type window override. Launch gets a
             *  wider window because it's the mission's emotional hero
             *  moment — the audience should see a sustained dramatic
             *  plume, not a 2-day blink. */
            windowDays?: number;
          };
          const BURN_TABLE: Record<string, BurnConfig> = {
            launch: { scale: 2.6, mode: 'inward', windowDays: 5 },
            tli_or_tmi: { scale: 1.6, mode: 'retro' },
            tcm: { scale: 0.6, mode: 'retro' },
            edl_or_oi: { scale: 1.8, mode: 'pro' },
          };
          // Find the closest in-window burn event — per-event window
          // override so launch can hold longer than the default 2 days.
          let activeBurn: { type: string; met_days: number; daysFromEvent: number } | null = null;
          const simMet = simDay - arcTimeline.dep_day;
          for (const evt of mission.flight.events) {
            if (!(evt.type in BURN_TABLE) || evt.met_days == null) continue;
            const daysFromEvent = Math.abs(simMet - evt.met_days);
            const win = BURN_TABLE[evt.type].windowDays ?? BURN_WINDOW_DAYS_DEFAULT;
            if (daysFromEvent > win) continue;
            if (!activeBurn || daysFromEvent < activeBurn.daysFromEvent) {
              activeBurn = { type: evt.type, met_days: evt.met_days, daysFromEvent };
            }
          }
          if (activeBurn) {
            const cfg = BURN_TABLE[activeBurn.type];
            // Sample next-frame position for velocity vector
            const sc1 = spacecraftPos(simDay + 0.5, arcTimeline, outPts, retPts).pos;
            const vx = (sc1.x - sc.pos.x) * SCALE_3D;
            const vz = (sc1.z - sc.pos.z) * SCALE_3D;
            const vMag = Math.hypot(vx, vz);
            // Compute exhaust direction (the target the cone tip points at)
            let exDx = 0;
            let exDz = 0;
            if (cfg.mode === 'inward') {
              // From spacecraft toward Earth (or destination for early-mission Earth)
              const earthW = earthMesh.position;
              const idx = earthW.x - scWorld.x;
              const idz = earthW.z - scWorld.z;
              const idm = Math.hypot(idx, idz) || 1;
              exDx = idx / idm;
              exDz = idz / idm;
            } else if (cfg.mode === 'retro' && vMag > 0.0001) {
              // Opposite velocity
              exDx = -vx / vMag;
              exDz = -vz / vMag;
            } else if (cfg.mode === 'pro' && vMag > 0.0001) {
              // Along velocity
              exDx = vx / vMag;
              exDz = vz / vMag;
            }
            plumeMesh.position.copy(scWorld);
            plumeMesh.lookAt(scWorld.x + exDx, scWorld.y, scWorld.z + exDz);
            plumeMesh.scale.setScalar(cfg.scale);
            // Opacity: peak at event time, fade linearly across the
            // per-event window (launch's wider window gives a sustained
            // dramatic plume).
            const winOpacity = cfg.windowDays ?? BURN_WINDOW_DAYS_DEFAULT;
            const opacity = 0.85 * Math.max(0, 1 - activeBurn.daysFromEvent / winOpacity);
            plumeMat.uniforms.uOpacity.value = opacity;
            plumeMesh.visible = opacity > 0.02;
          } else {
            plumeMesh.visible = false;
          }
        } else {
          plumeMesh.visible = false;
        }

        // v0.6.3 #228: single source of truth for bright/dim split. The
        // sprite sits at sc.pos = lerpPoint(pts, fraction). Each tube
        // vertex carries aT = i/(N-1) (same parameterization). The
        // fragment shader paints vT < uProgress bright, else dim — and
        // since per-vertex interpolation of vT crosses uProgress at
        // exactly the same world position that lerpPoint(pts, uProgress)
        // returns, the boundary lands on the sprite by construction.
        // No vertex mutation, no drawRange, no two-tube alignment dance.
        //
        // sc.progress goes 0 → 0.5 across outbound and 0.5 → 1 across
        // return, so outFraction maps [0, 0.5] → [0, 1] for outbound
        // and retFraction maps [0.5, 1] → [0, 1] for return.
        const outFraction = Math.min(1, sc.progress * 2);
        const retFraction = Math.max(0, (sc.progress - 0.5) * 2);
        if (outLine) {
          const mat = outLine.material as THREE.ShaderMaterial;
          mat.uniforms.uProgress.value = outFraction;
        }
        if (retLine) {
          const mat = retLine.material as THREE.ShaderMaterial;
          mat.uniforms.uProgress.value = retFraction;
        }

        // marsArr / earthRet are recomputed per-frame from the live
        // arcTimeline so these markers track per-mission launch windows.
        // Moon-mode uses Earth-centred fake-AU coords so a heliocentric
        // marsArr / earthRet would render the rings off in heliocentric
        // space (visible because the camera is also looking at origin).
        // Hide them entirely for Moon missions — Earth + Moon meshes
        // already mark the start/end of the cislunar trajectory.
        if (view === '3d' && container) {
          // Per-frame cislunar updates.
          const moonPos = moonEciPos(simDay);
          if (cislunarMoonMeshRef) {
            cislunarMoonMeshRef.position.set(
              moonPos.x * SCALE_CISLUNAR,
              moonPos.y * SCALE_CISLUNAR,
              moonPos.z * SCALE_CISLUNAR,
            );
          }
          // Drive the moon-frame group offset = (currentMoon - moonAtFlyby)
          // so lunar-phase lines (orbit, descent, etc.) ride with the Moon
          // mesh instead of staying anchored where the Moon was at
          // flyby_day. Same delta used for the spacecraft sprite in
          // updateCislunarSpacecraft.
          if (cislunarMoonFrameGroupRef) {
            const moonRefPos = moonEciPos(arcTimeline.flyby_day);
            cislunarMoonFrameGroupRef.position.set(
              (moonPos.x - moonRefPos.x) * SCALE_CISLUNAR,
              (moonPos.y - moonRefPos.y) * SCALE_CISLUNAR,
              (moonPos.z - moonRefPos.z) * SCALE_CISLUNAR,
            );
          }
          const metDays = simDay - arcTimeline.dep_day;
          flyUpdaters?.cislunar.updateSpacecraft(cislunarTrajectory, metDays);
          flyUpdaters?.cislunar.updateLineProgress(cislunarTrajectory, metDays);

          // ─── Cislunar science-layer per-frame updates ─────────────────
          // Drive only the visible overlays so the math is skipped when
          // the user has the layer off. All arrows / markers / coast
          // need the spacecraft's current absolute ECI position + a
          // finite-difference velocity, so the head of this block does
          // both regardless of which layer is on.
          const conicsLayerOn = isLayerOn('conics');
          const anyCislunarLayerOn =
            cisGravEarthArrow.visible ||
            cisGravMoonArrow.visible ||
            cisVelocityArrow.visible ||
            cisCentripetalArrow.visible ||
            cisPeriMarker.visible ||
            cisCoastLine.visible ||
            conicsLayerOn;
          if (anyCislunarLayerOn && cislunarTrajectory && cislunarTrajectory.phases.length > 0) {
            // Walk phases to find current absolute position + velocity
            // (finite-diff at +0.05 days). For lunar-frame phases the
            // points are stored Moon-relative, so add (currentMoon -
            // moonAtFlyby) to bring them into absolute ECI.
            const LUNAR_LOCAL_LAYERS = new Set([
              'lunar_orbit',
              'spiral_lunar',
              'lunar_flyby',
              'descent',
              'ascent',
            ]);
            const moonRefForLayers = moonEciPos(arcTimeline.flyby_day);
            const cisPosAt = (
              metT: number,
            ): { x: number; y: number; z: number; phaseType: string } => {
              const traj = cislunarTrajectory!;
              let active = traj.phases[0];
              for (const p of traj.phases) {
                if (metT >= p.start_met_days && metT <= p.end_met_days) {
                  active = p;
                  break;
                }
              }
              const span = active.end_met_days - active.start_met_days;
              const t =
                span > 0 ? Math.max(0, Math.min(1, (metT - active.start_met_days) / span)) : 0;
              const last = active.points.length - 1;
              const f = t * last;
              const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
              const frac = f - i;
              const a = active.points[i];
              const b = active.points[i + 1] ?? a;
              let x = a.x + (b.x - a.x) * frac;
              let y = a.y + (b.y - a.y) * frac;
              let z = a.z + (b.z - a.z) * frac;
              if (LUNAR_LOCAL_LAYERS.has(active.type)) {
                const moonAtT = moonEciPos(arcTimeline.dep_day + metT);
                x += moonAtT.x - moonRefForLayers.x;
                y += moonAtT.y - moonRefForLayers.y;
                z += moonAtT.z - moonRefForLayers.z;
              }
              return { x, y, z, phaseType: active.type };
            };

            const p0 = cisPosAt(metDays);
            const p1 = cisPosAt(metDays + 0.05);
            const dt_sec = 0.05 * 86400; // days → seconds
            const vx = (p1.x - p0.x) / dt_sec; // km/s
            const vz = (p1.z - p0.z) / dt_sec;
            const vy = (p1.y - p0.y) / dt_sec;
            const speedKms = Math.hypot(vx, vy, vz);
            const isLunarPhase = LUNAR_LOCAL_LAYERS.has(p0.phaseType);

            // Spacecraft scene position (for anchoring arrows).
            const scScene = new THREE.Vector3(
              p0.x * SCALE_CISLUNAR,
              p0.y * SCALE_CISLUNAR,
              p0.z * SCALE_CISLUNAR,
            );

            // Earth / Moon positions in scene units.
            const earthScene = new THREE.Vector3(0, 0, 0);
            const moonAtNowAbs = moonEciPos(simDay);
            const moonScene = new THREE.Vector3(
              moonAtNowAbs.x * SCALE_CISLUNAR,
              moonAtNowAbs.y * SCALE_CISLUNAR,
              moonAtNowAbs.z * SCALE_CISLUNAR,
            );

            // Gravity arrows — Earth + Moon.
            if (cisGravEarthArrow.visible) {
              const dEarthKm = Math.hypot(p0.x, p0.y, p0.z);
              const aEarth = gravityAccel(BODY_MASS_KG.earth, dEarthKm);
              cisGravEarthArrow.position.copy(scScene);
              cisGravEarthArrow.setDirection(
                new THREE.Vector3().subVectors(earthScene, scScene).normalize(),
              );
              cisGravEarthArrow.setLength(
                Math.max(0.5, Math.min(5, logScaleLength(aEarth, 0.5, 5, 1e-6, 10))),
                0.18,
                0.1,
              );
            }
            if (cisGravMoonArrow.visible) {
              const dMoonKm = Math.hypot(
                p0.x - moonAtNowAbs.x,
                p0.y - moonAtNowAbs.y,
                p0.z - moonAtNowAbs.z,
              );
              const aMoon = gravityAccel(BODY_MASS_KG.moon, dMoonKm);
              cisGravMoonArrow.position.copy(scScene);
              cisGravMoonArrow.setDirection(
                new THREE.Vector3().subVectors(moonScene, scScene).normalize(),
              );
              cisGravMoonArrow.setLength(
                Math.max(0.5, Math.min(5, logScaleLength(aMoon, 0.5, 5, 1e-6, 10))),
                0.18,
                0.1,
              );
            }

            // Velocity tangent — proportional to speed.
            if (cisVelocityArrow.visible && speedKms > 1e-6) {
              const dirMag = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
              cisVelocityArrow.position.copy(scScene);
              cisVelocityArrow.setDirection(
                new THREE.Vector3(
                  (p1.x - p0.x) / dirMag,
                  (p1.y - p0.y) / dirMag,
                  (p1.z - p0.z) / dirMag,
                ),
              );
              // 1 km/s → ~0.4u in cislunar scale (matches heliocentric ratio).
              const vLen = Math.max(0.4, Math.min(5, speedKms * 0.4));
              cisVelocityArrow.setLength(vLen, 0.18, 0.1);
            }

            // Centripetal — toward dominant body (Moon if in lunar phase,
            // else Earth).
            if (cisCentripetalArrow.visible) {
              const target = isLunarPhase ? moonScene : earthScene;
              const dir = new THREE.Vector3().subVectors(target, scScene).normalize();
              cisCentripetalArrow.position.copy(scScene);
              cisCentripetalArrow.setDirection(dir);
              const dKm = isLunarPhase
                ? Math.hypot(p0.x - moonAtNowAbs.x, p0.y - moonAtNowAbs.y, p0.z - moonAtNowAbs.z)
                : Math.hypot(p0.x, p0.y, p0.z);
              const accel = gravityAccel(
                isLunarPhase ? BODY_MASS_KG.moon : BODY_MASS_KG.earth,
                dKm,
              );
              cisCentripetalArrow.setLength(
                Math.max(0.4, Math.min(5, logScaleLength(accel, 0.4, 5, 1e-6, 10))),
                0.18,
                0.1,
              );
            }

            // Apsides — scan current phase's points for min/max distance
            // from the dominant body. Earth-frame phases use Earth as
            // centre, lunar-frame use Moon.
            if (cisPeriMarker.visible || cisApoMarker.visible) {
              let activePhase = cislunarTrajectory.phases[0];
              for (const p of cislunarTrajectory.phases) {
                if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
                  activePhase = p;
                  break;
                }
              }
              const lunarFrame = LUNAR_LOCAL_LAYERS.has(activePhase.type);
              const cx = lunarFrame ? moonRefForLayers.x : 0;
              const cy = lunarFrame ? moonRefForLayers.y : 0;
              const cz = lunarFrame ? moonRefForLayers.z : 0;
              let minR2 = Infinity;
              let maxR2 = -Infinity;
              let minI = 0;
              let maxI = 0;
              for (let i = 0; i < activePhase.points.length; i++) {
                const p = activePhase.points[i];
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dz = p.z - cz;
                const r2 = dx * dx + dy * dy + dz * dz;
                if (r2 < minR2) {
                  minR2 = r2;
                  minI = i;
                }
                if (r2 > maxR2) {
                  maxR2 = r2;
                  maxI = i;
                }
              }
              const peri = activePhase.points[minI];
              const apo = activePhase.points[maxI];
              // Lunar-frame points need the moonFrameGroup offset to land
              // in absolute scene coords.
              let dx0 = 0;
              let dy0 = 0;
              let dz0 = 0;
              if (lunarFrame) {
                dx0 = moonAtNowAbs.x - moonRefForLayers.x;
                dy0 = moonAtNowAbs.y - moonRefForLayers.y;
                dz0 = moonAtNowAbs.z - moonRefForLayers.z;
              }
              cisPeriMarker.position.set(
                (peri.x + dx0) * SCALE_CISLUNAR,
                (peri.y + dy0) * SCALE_CISLUNAR,
                (peri.z + dz0) * SCALE_CISLUNAR,
              );
              cisApoMarker.position.set(
                (apo.x + dx0) * SCALE_CISLUNAR,
                (apo.y + dy0) * SCALE_CISLUNAR,
                (apo.z + dz0) * SCALE_CISLUNAR,
              );
            }

            // Coast preview — integrate forward from (p0, v) under Earth
            // gravity for N seconds, dropping points each step. Tier 1
            // simplification: ignores Moon gravity (acceptable outside
            // lunar SoI).
            if (cisCoastLine.visible) {
              const MU_EARTH = 398600.4418; // km³/s²
              const STEPS = 200;
              const DT = 600; // 600 s per step → 200×600 = 33 h preview
              let rx = p0.x;
              let ry = p0.y;
              let rz = p0.z;
              let rvx = vx;
              let rvy = vy;
              let rvz = vz;
              const verts = new Float32Array((STEPS + 1) * 3);
              verts[0] = rx * SCALE_CISLUNAR;
              verts[1] = ry * SCALE_CISLUNAR;
              verts[2] = rz * SCALE_CISLUNAR;
              for (let i = 1; i <= STEPS; i++) {
                const rMag = Math.hypot(rx, ry, rz);
                if (rMag < R_EARTH_KM) break; // collided
                const a = -MU_EARTH / (rMag * rMag * rMag);
                rvx += a * rx * DT;
                rvy += a * ry * DT;
                rvz += a * rz * DT;
                rx += rvx * DT;
                ry += rvy * DT;
                rz += rvz * DT;
                verts[i * 3] = rx * SCALE_CISLUNAR;
                verts[i * 3 + 1] = ry * SCALE_CISLUNAR;
                verts[i * 3 + 2] = rz * SCALE_CISLUNAR;
              }
              cisCoastLine.geometry.dispose();
              cisCoastLine.geometry = new THREE.BufferGeometry();
              cisCoastLine.geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
              cisCoastLine.computeLineDistances();
            }

            // Conics — classify the spacecraft's Earth-centric (r, v).
            // Cislunar trajectories are Earth-bound ellipses for the
            // outbound/return coasts and Moon-bound for lunar phases;
            // here we always classify with Earth as the central body
            // since that's what the conic panel labels.
            if (conicsLayerOn) {
              conicStateCislunar = classifyConicEarth(
                { x: p0.x, y: p0.y, z: p0.z },
                { x: vx, y: vy, z: vz },
              );
            } else {
              conicStateCislunar = null;
            }
          } else if (isMoonMission) {
            // Clear cached cislunar conic when all layers off so the
            // panel doesn't keep showing a stale Earth-centric state.
            conicStateCislunar = null;
          }

          // Cislunar camera tracks the moving Moon target each frame so
          // the Earth-Moon system stays framed as it drifts. User mouse
          // input modifies cislunarCamR/P/T independently.
          updateCislunarCam();

          // #83 — constant on-screen line thickness. Tube geometry is
          // built with a world-space radius so it reads as the right
          // pixel width at the wide cruise framing (camR ~ 500) but
          // balloons to "fat sausage" at flyby-close (camR ~ 24). Scale
          // the radius proportional to camR each frame so the line stays
          // at a constant apparent thickness. Throttled — only rebuild
          // geometry when the desired radius drifts > 0.05 from current
          // (so static frames + held beats don't spend CPU rebuilding
          // identical geometry).
          if (
            !isMoonMission &&
            outLine &&
            retLine &&
            outPts.length >= 2 &&
            flyUpdaters?.helio.rebuildTubeGeometry
          ) {
            const tubeUd = outLine.geometry.userData as { tubeRadius?: number };
            // Halved per user feedback — trajectory line was reading too
            // thick at all framings. 0.0045 → 0.00225, clamp [0.18,1.6]
            // → [0.09,0.8], default fallback 0.35 → 0.175.
            const desiredRadius = Math.max(0.09, Math.min(0.8, camR * 0.00225));
            const currentRadius = tubeUd.tubeRadius ?? 0.175;
            if (Math.abs(desiredRadius - currentRadius) > 0.05) {
              outLine.geometry.dispose();
              outLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(outPts, desiredRadius);
              (outLine.geometry.userData as { tubeRadius?: number }).tubeRadius = desiredRadius;
              if (retLine && retPts.length >= 2) {
                retLine.geometry.dispose();
                retLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(
                  retPts,
                  desiredRadius * 0.85,
                );
                (retLine.geometry.userData as { tubeRadius?: number }).tubeRadius =
                  desiredRadius * 0.85;
              }
            }
          }

          if (viewMode === 'cislunar') {
            // Cislunar mode bypasses the helio composer + bloom pipeline —
            // the Earth-Moon system framing is sized for diagrammatic
            // clarity, not cinematic bloom, and the close-Earth-orbit
            // sprites would smear under bloom. Direct render is correct.
            renderer.render(cislunarScene, cislunarCamera);
          } else if (quality.postEnabled) {
            // Bokeh DoF focus tracking — wave 2/3 punch #6. When the
            // cinematic-tier composer included a BokehPass, point the
            // focal plane at the spacecraft each frame so the ship stays
            // crisp while the Sun, planets, and starfield throw a soft
            // photographic bokeh. Distance is camera→scWorld in scene
            // units; BokehPass interprets it as world-space depth.
            if (helioHandles.bokehPass && scLastWorld) {
              const focusDist = camera.position.distanceTo(scLastWorld);
              (helioHandles.bokehPass.uniforms as Record<string, { value: number }>).focus.value =
                focusDist;
            }
            // Sun lens flare ghost-position update — cinematic only. The
            // helper recomputes sprite world positions from the Sun's
            // current screen-space projection so the ghosts trail through
            // the screen center each frame, like an anamorphic anim flare.
            helioHandles.sunLensFlare?.update(camera);
            // Helio (medium+): route through the EffectComposer so
            // RenderPass + UnrealBloomPass (Sun halo, ship rim glow,
            // engine plume sprites when present) compose on top of the
            // base scene.
            helioHandles.composer.render();
          } else {
            // Helio (minimal / low): direct render, no post stack.
            // The user gets a working scene at the cost of the
            // cinematic glow — see the Settings panel to opt back in.
            renderer.render(scene, camera);
          }
          // Frame-end debug write. Captures state every frame
          // independent of whether a flyby cinema is active — the
          // mid-update __flyDebug write inside updateHelioAutoZoomTargets
          // only runs when activeFlybyMet !== null, leaving subPhase /
          // simDay / arming state stale at the most recent flyby across
          // launch / cruise / arrived. This frame-end write fixes the
          // verification path.
          //
          // Audit recommendation #2 — production builds skip the write
          // entirely (Vite removes the dead branch at build time). Tests
          // + dev work still see the full state. No prod overhead from a
          // hot-path window assignment 60× / second.
          if (import.meta.env.DEV) {
            // Builder lives in $lib/orbital/fly-debug-frame — DEV-vs-prod
            // tree-shake stays on this side of the call.
            window.__flyDebugFrame = buildFlyDebugFrameSnapshot({
              simDay,
              lastHelioSubPhase,
              peakHoldArmedForFlybyMet: cine.peakHoldArmedForFlybyMet,
              peakHoldUntil: cine.peakHoldUntil,
              cruiseHoldUntil: cine.cruiseHoldUntil,
              cruiseHoldFired: cine.cruiseHoldFired,
              cruiseHoldTriggerSimDay,
              cutStartedAt: cine.cutStartedAt,
              cutBlackOpacity,
              finaleStartedAt: cine.finaleStartedAt,
              inMissionFinale,
              finaleCaptionOpacity,
              finaleBlackOpacity,
              camR,
              camTarget: { x: camTarget.x, z: camTarget.z },
              now: performance.now(),
            });
          }
          // GH #107 — phase marker projection (3D view). Compute pixel
          // positions for every event marker against the active cislunar
          // camera + canvas size, then write the resulting
          // PhaseMarkerRenderState[] in a single $state.raw assignment so
          // the template re-renders once per frame.
          // Shared Vector3 factory for the two marker pipelines below.
          // Hoisted out of the `if (hasPhaseMarkers)` guard so the FD
          // marker projection (later) can reuse it without depending on
          // whether the mission has a flight.events[] roster.
          const factory =
            container == null
              ? null
              : (x: number, y: number, z: number): MinimalProjector => {
                  const v = new THREE.Vector3(x, y, z);
                  return {
                    project(cam) {
                      v.project(cam as unknown as THREE.Camera);
                      return v;
                    },
                  };
                };

          if (hasPhaseMarkers && container && factory) {
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            const simMet = simDay - mission.timeline.dep_day;
            const next: PhaseMarkerRenderState[] = [];
            // Moon path: ECI km → CSS pixels via the cislunar camera.
            if (viewMode === 'cislunar' && phaseMarkers.length > 0) {
              for (const mk of phaseMarkers) {
                next.push({
                  event: mk.event,
                  scienceRef: mk.scienceRef,
                  screen: eciKmToScreenPx(mk.posKm, factory, cislunarCamera, cw, ch),
                  reveal: markerStateFor(mk.event.met_days ?? 0, simMet, { reducedMotion }),
                  eventLabel: defaultEventLabel(mk.event.type),
                });
              }
            }
            // Mars / outer-system path: heliocentric AU → CSS pixels via
            // the main camera (helio scene already uses AU as scene units).
            if (viewMode === 'heliocentric' && interplanetaryPhaseMarkers.length > 0) {
              for (const mk of interplanetaryPhaseMarkers) {
                next.push({
                  event: mk.event,
                  scienceRef: mk.scienceRef,
                  screen: helioAuToScreenPx(mk.posAu, factory, camera, cw, ch),
                  reveal: markerStateFor(mk.event.met_days ?? 0, simMet, { reducedMotion }),
                  eventLabel: defaultEventLabel(mk.event.type),
                });
              }
            }
            phaseMarkerScreens = next;
          } else if (phaseMarkerScreens.length > 0) {
            phaseMarkerScreens = [];
          }

          // FlightDirectorBanner stage markers (heliocentric only — Moon
          // missions already have the cislunar PhaseMarker pipeline). Each
          // stage projects ONE point: a diamond tick on the path at the
          // stage's startArc — the chip's leader line ends at that
          // diamond, so the label visually anchors to the trajectory
          // (not to a Sun-derived midpoint). The Sun's projected position
          // is still passed so each chip can push itself off the Sun blob.
          if (viewMode === 'heliocentric' && outPts.length >= 2 && container && factory) {
            const fdNext: FdPhaseMarkerRender[] = [];
            const cwFd = container.clientWidth;
            const chFd = container.clientHeight;
            const outLastIdx = outPts.length - 1;
            const retLastIdx = retPts.length - 1;
            const hasReturnArc = retPts.length >= 2;
            // Leg-relative progress (0 → 1 across each leg's own arc),
            // used to gate stage reveal. For round-trip missions
            // arcProgress is normalised over the WHOLE mission so an
            // outbound-arrival threshold at 0.95 wouldn't fire until ~95%
            // of the round-trip = deep into the return leg. Leg-relative
            // progress keeps stage thresholds intuitive on both one-way
            // and round-trip missions.
            const outboundT =
              sc.phase === 'pre-launch' ? 0 : sc.phase === 'outbound' ? sc.progress * 2 : 1;
            const returnT =
              sc.phase === 'pre-launch' || sc.phase === 'outbound'
                ? 0
                : sc.phase === 'return'
                  ? (sc.progress - 0.5) * 2
                  : 1;
            for (const s of FD_STAGES) {
              // Skip return-leg stages on one-way missions (no retPts).
              if (s.leg === 'return' && !hasReturnArc) continue;
              const arc = s.leg === 'out' ? outPts : retPts;
              const lastIdx = s.leg === 'out' ? outLastIdx : retLastIdx;
              const legT = s.leg === 'out' ? outboundT : returnT;
              const tickIdx = Math.max(0, Math.min(lastIdx, Math.round(s.tickArc * lastIdx)));
              const tickPt = arc[tickIdx];
              // Use the sample point's actual Y. The spline waypoints have
              // non-zero Y at intermediate flybys (the +y offset that lifts
              // the path above the planet rather than through it), so we
              // can't hard-code Y=0 — that would render the diamond on the
              // ecliptic plane while the spacecraft sits above it on the arc.
              fdNext.push({
                id: s.id,
                label: s.label(),
                tickScreen: helioAuToScreenPx(
                  {
                    x: tickPt.x * SCALE_3D,
                    y: (tickPt.y ?? 0) * SCALE_3D,
                    z: tickPt.z * SCALE_3D,
                  },
                  factory,
                  camera,
                  cwFd,
                  chFd,
                ),
                // INJECTION hides its diamond + leader because the LAUNCH
                // ring at the same arc position is the visual anchor.
                // ARRIVAL-EARTH similarly suppresses its diamond because
                // the RETURN ring at retPts[last] sits right there.
                showTick: s.id !== 'injection' && s.id !== 'arrival-earth',
                revealed: legT >= s.arcThreshold,
              });
            }
            fdPhaseMarkerScreens = fdNext;
          } else if (fdPhaseMarkerScreens.length > 0) {
            fdPhaseMarkerScreens = [];
          }

          // Milestone overlay projection — labeled flight.events render
          // as teal chips at the spacecraft's projected position at the
          // event's MET. Only milestones the ship has already REACHED
          // (plus the one within an ±15-day "active" window) render, and
          // we cap at the 2 most-recent past plus the active one — so
          // the scene shows the current beat + one immediate predecessor
          // for narrative context, not the whole roster (which would
          // clutter the canvas for grand-tour missions like BepiColombo).
          if (viewMode === 'heliocentric' && container && factory) {
            const cwMs = container.clientWidth;
            const chMs = container.clientHeight;
            // 3-state milestone visibility: always show "where we came
            // from" + "where we are" + "where we're going". The user
            // wants to know the next milestone is coming even when
            // they're still cruising far from it.
            const ACTIVE_APPROACH_DAYS = 30;
            const ACTIVE_DEPART_DAYS = 20;
            const currentMet = simDay - arcTimeline.dep_day;
            const labeled = (mission.flight?.events ?? [])
              .filter((e) => e.label && e.met_days != null)
              .sort((a, b) => (a.met_days ?? 0) - (b.met_days ?? 0));
            let latestPast: FlightTimelineEvent | null = null;
            let nextFuture: FlightTimelineEvent | null = null;
            const actives: FlightTimelineEvent[] = [];
            for (const evt of labeled) {
              const delta = currentMet - (evt.met_days ?? 0);
              if (delta > ACTIVE_DEPART_DAYS) {
                latestPast = evt; // overwrite — keep the MOST RECENT past
              } else if (delta >= -ACTIVE_APPROACH_DAYS) {
                actives.push(evt);
              } else if (!nextFuture) {
                nextFuture = evt; // first future encountered
              }
            }
            const picked: Array<{
              evt: FlightTimelineEvent;
              state: 'past' | 'active' | 'future';
            }> = [];
            if (latestPast) picked.push({ evt: latestPast, state: 'past' });
            for (const a of actives) picked.push({ evt: a, state: 'active' });
            if (nextFuture) picked.push({ evt: nextFuture, state: 'future' });
            const msNext: MilestoneRender[] = [];
            for (const { evt, state } of picked) {
              const eventSimDay = arcTimeline.dep_day + evt.met_days!;
              const evtSc = spacecraftPos(eventSimDay, arcTimeline, outPts, retPts);
              msNext.push({
                label: evt.label!,
                description: evt.description,
                met_days: evt.met_days!,
                screen: helioAuToScreenPx(
                  { x: evtSc.pos.x * SCALE_3D, y: 0, z: evtSc.pos.z * SCALE_3D },
                  factory,
                  camera,
                  cwMs,
                  chMs,
                ),
                active: state === 'active',
                state,
              });
            }
            milestoneScreens = msNext;
          } else if (milestoneScreens.length > 0) {
            milestoneScreens = [];
          }
        } else draw2d();
      },
    });
    lifecycle.add(loop.cleanup);
    loop.start();

    // W9 wave B: assemble the typed updater handle. Mirrors the 9
    // freestanding `*Ref` assignments above so callers can address
    // one typed object instead of nine nullable refs. Future commits
    // migrate callers off the freestanding refs onto flyUpdaters.*.
    flyUpdaters = {
      helio: {
        rebuildTubeGeometry: buildTubeGeometry,
        apsidesRecompute: recomputeApsides,
        resetCamera: helioResetCamera,
        applyDestination: applyDestinationVisuals,
        setContextPlanetsVisible: helioHandles.setContextPlanetsVisible,
        setHillSpheresVisible: helioHandles.setHillSpheresVisible,
        setLagrangePointsVisible: helioHandles.setLagrangePointsVisible,
        updateHillSphereForBody: helioHandles.updateHillSphereForBody,
        setMagnetospheresVisible: helioHandles.setMagnetospheresVisible,
        updateMagnetosphereForBody: helioHandles.updateMagnetosphereForBody,
        setMoonsVisible: helioHandles.setMoonsVisible,
        updateMoonsForParent: helioHandles.updateMoonsForParent,
        setSpacecraftModel: applyMissionSpacecraftModel,
        refreshLabelSprites: refreshSpriteTextures,
      },
      cislunar: {
        rebuildLines: rebuildCislunarLines,
        rebuildAnnotations: rebuildCislunarAnnotations,
        updateSpacecraft: updateCislunarSpacecraft,
        updateLineProgress: updateCislunarLineProgress,
      },
    };

    // Disposables that aren't a listener live in the same chain. LIFO
    // drain so renderer / el3d teardowns run last; layer-stop watches
    // are only present when their corresponding overlay registered.
    lifecycle.add(() => frameMonitor.stop());
    if (stopLensWatch) lifecycle.add(stopLensWatch);
    if (stopSoiLayer) lifecycle.add(stopSoiLayer);
    if (stopSoiLayerCislunar) lifecycle.add(stopSoiLayerCislunar);
    if (stopGravityLayer) lifecycle.add(stopGravityLayer);
    if (stopGravityLayerCislunar) lifecycle.add(stopGravityLayerCislunar);
    if (stopFlyVelocityLayer) lifecycle.add(stopFlyVelocityLayer);
    if (stopVelocityLayerCislunar) lifecycle.add(stopVelocityLayerCislunar);
    if (stopFlyCentripetalLayer) lifecycle.add(stopFlyCentripetalLayer);
    if (stopCentripetalLayerCislunar) lifecycle.add(stopCentripetalLayerCislunar);
    if (stopCoastLayer) lifecycle.add(stopCoastLayer);
    if (stopCoastLayerCislunar) lifecycle.add(stopCoastLayerCislunar);
    if (stopApsidesLayer) lifecycle.add(stopApsidesLayer);
    if (stopApsidesLayerCislunar) lifecycle.add(stopApsidesLayerCislunar);
    if (stopHillSphereLayer) lifecycle.add(stopHillSphereLayer);
    if (stopLagrangeLayer) lifecycle.add(stopLagrangeLayer);
    if (stopMagnetosphereLayer) lifecycle.add(stopMagnetosphereLayer);
    if (stopMoonsLayer) lifecycle.add(stopMoonsLayer);
    lifecycle.add(() => disposeScene(scene));
    // ADR-058: dispose the cislunar scene's GPU resources too.
    lifecycle.add(() => disposeScene(cislunarScene));
    // ADR-073 Layer B — dispose lazy 4K textures held in closures
    // (not reachable through cislunarScene's scene graph).
    lifecycle.add(() => cislunarHandles.disposeLod());
    lifecycle.add(() => renderer.dispose());
    // Force immediate WebGL context release (#363) — dispose() alone keeps
    // the context + GPU memory resident until lazy GC, piling up across
    // navigations. Mirrors disposeSceneRenderer.
    lifecycle.add(() => renderer.forceContextLoss());
    lifecycle.add(() => el3d.remove());

    cleanup = () => lifecycle.cleanup();
  });

  onDestroy(() => {
    cleanup?.();
    stopReducedMotionWatch();
  });
</script>

<svelte:head><title>{m.fly_page_title()}</title></svelte:head>

{#snippet flyDebugContent()}
  {#if mission.flight?.events && outPts.length > 0}
    {@const flybyEventsForDebug = (mission.flight.events ?? []).filter(
      (e) => (e.type === 'flyby' || e.type === 'edl_or_oi') && e.met_days != null,
    )}
    {@const cislunarHeroEvents = (mission.flight.events ?? []).filter(
      (e) =>
        (e.type === 'loi' ||
          e.type === 'tei' ||
          e.type === 'descent_start' ||
          e.type === 'ascent') &&
        e.met_days != null,
    )}
    {@const defaultEvent = flybyEventsForDebug[0]}
    {#if defaultEvent}
      {@const peakMet = defaultEvent.met_days ?? 0}
      {@const planetIdGuess = (() => {
        const label = (defaultEvent.label ?? '').toLowerCase();
        const ids: FlybyPlanetId[] = [
          'mercury',
          'venus',
          'earth',
          'mars',
          'jupiter',
          'saturn',
          'uranus',
          'neptune',
          'pluto',
          'arrokoth',
          'halley',
          '67p',
          // #341 Batch 5 small bodies.
          'itokawa',
          'dimorphos',
          'didymos',
          'donaldjohanson',
          'eurybates',
          'polymele',
          'leucus',
          'orus',
          'patroclus',
          'menoetius',
        ];
        for (const p of ids) if (label.includes(p)) return p;
        return 'venus' as FlybyPlanetId;
      })()}
      {@const planetPosForDebug =
        planetIdGuess === 'earth'
          ? earthPos(arcTimeline.dep_day + peakMet)
          : destinationPos(arcTimeline.dep_day + peakMet, planetIdGuess)}
      {@const planetRadiusForDebug =
        FLYBY_PLANET_COMPOSITION[planetIdGuess].camRMultiplier > 0 ? 2.5 : 2.5}
      <FlybyDebugViewer
        planetId={planetIdGuess}
        planetPos={{ x: planetPosForDebug.x * SCALE_3D, z: planetPosForDebug.z * SCALE_3D }}
        planetRadius={planetRadiusForDebug}
        {peakMet}
        shipPosAtMet={(met: number) => {
          const totalOutboundDays = arcTimeline.arr_day - arcTimeline.dep_day;
          if (totalOutboundDays <= 0 || outPts.length < 2) return null;
          const fraction = Math.max(0, Math.min(1, met / totalOutboundDays));
          const idxF = fraction * (outPts.length - 1);
          const i = Math.floor(idxF);
          const t = idxF - i;
          const a = outPts[i];
          const b = outPts[Math.min(i + 1, outPts.length - 1)];
          const ay = a.y ?? 0;
          const by = b.y ?? 0;
          return {
            x: (a.x + (b.x - a.x) * t) * SCALE_3D,
            y: (ay + (by - ay) * t) * SCALE_3D,
            z: (a.z + (b.z - a.z) * t) * SCALE_3D,
          };
        }}
      />
    {:else if cislunarHeroEvents.length > 0}
      <!-- Follow-up 5 — cislunar missions don't emit flyby/edl_or_oi
           events; their iconic moments are loi / tei / descent_start
           / ascent. FlybyDebugViewer is heliocentric-only (planetPos,
           PLANET_COMPOSITION), so surface the hero metadata as text
           instead of an empty "no events" message. Per-event MET +
           iconic-shot lead-day offset + Moon composition snapshot. -->
      <div class="cislunar-hero-debug">
        <div class="cislunar-hero-header">{m.fly_cislunar_hero_header()}</div>
        {#each cislunarHeroEvents as e}
          {@const t = e.type as 'loi' | 'tei' | 'descent_start' | 'ascent'}
          {@const leadDays = CISLUNAR_HERO_LEAD_DAYS[t]}
          {@const peak = e.met_days ?? 0}
          {@const iconicMet = peak - leadDays}
          <div class="cislunar-hero-row">
            <strong>{t.toUpperCase()}</strong>
            <span>peak MET {peak.toFixed(2)}d</span>
            <span>iconic MET {iconicMet.toFixed(2)}d</span>
            <span>lead {leadDays}d</span>
          </div>
        {/each}
        <div class="cislunar-hero-comp">
          composition: side {Math.round((MOON_COMPOSITION.sideAngleRad * 180) / Math.PI)}° · pitch
          {Math.round((MOON_COMPOSITION.pitchRad * 180) / Math.PI)}° · R ×{MOON_COMPOSITION.camRMultiplier}
          R_moon · targetBias
          {MOON_COMPOSITION.targetBias}
        </div>
      </div>
    {:else}
      <div>No flyby/EDL events in mission.</div>
    {/if}
  {:else}
    <div>Trajectory not yet loaded.</div>
  {/if}
{/snippet}

<DebugPanelRegistrar label="FLY" content={flyDebugContent} />

{#if liveRenderer && liveQuality}
  <RenderingDebugRegistrar
    renderer={liveRenderer}
    quality={liveQuality}
    qualitySource={liveQualitySource}
    bloomPass={liveBloomPass}
    bokehPass={liveBokehPass}
    filmPass={liveFilmPass}
    vignettePass={liveVignettePass}
    skydomeMesh={liveSkydomeMesh}
    sunLensFlareGroup={liveSunLensFlareGroup}
    frameMonitor={liveFrameMonitor}
  />
{/if}

<div class="fly" class:hud-hidden={hudHidden}>
  <!-- Mobile HUD-collapse toggle. Always rendered, hidden on desktop
       via CSS @media. Tapping it hides hud-stack + capcom-panel so the
       canvas is visible; tap again to restore. -->
  <button
    type="button"
    class="hud-collapse"
    onclick={toggleHud}
    aria-label={hudHidden ? 'Show HUD panels' : 'Hide HUD panels'}
    aria-pressed={hudHidden}
    title={hudHidden ? 'Show HUD' : 'Hide HUD'}
  >
    {hudHidden ? '◐' : '◑'}
  </button>
  <!-- Settings — wave 2/3 punch #3. Gear icon top-right; click opens
       the shared QualitySettingsModal (#339) with quality-tier radios.
       Choice persists to localStorage globally and applies on reload. -->
  <QualitySettingsModal {activeQualityTier} />
  <!-- Runtime adaptive — wave 2/3 punch #4. Non-blocking toast at
       bottom-right when the rolling-average frame time has stayed over
       budget. Suggests the next-lower quality tier; user decides. -->
  {#if perfToastVisible && perfToastSuggestedTier}
    <div class="perf-toast" role="status" aria-live="polite">
      <div class="perf-toast-title">{m.fly_perf_title()}</div>
      <div class="perf-toast-body">
        Frame time averaging {perfToastAvgMs.toFixed(0)} ms. Drop to
        <span class="perf-toast-tier">{perfToastSuggestedTier}</span>?
      </div>
      <div class="perf-toast-actions">
        <button type="button" class="perf-toast-apply" onclick={applyPerfSuggestion}
          >Apply & reload</button
        >
        <button type="button" class="perf-toast-dismiss" onclick={dismissPerfToast}>Not now</button>
      </div>
    </div>
  {/if}
  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    role="region"
    aria-label={m.fly_canvas_aria_3d()}
  ></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.fly_canvas_aria_2d()}
  ></canvas>

  <!-- GH #107 — phase marker overlay. Renders one PhaseMarkerLabel per
       event on the cislunar trajectory, positioned at the projected
       (screen.x, screen.y) computed each frame in the animate loop.
       Same overlay covers both 3D and 2D views (the projection helper
       chosen per-frame determines which path's coordinates feed
       phaseMarkerScreens). Hidden when the mission has no
       phase-marker pipeline (no Moon cislunar nor Mars heliocentric
       trajectory + events). -->
  {#if hasPhaseMarkers && phaseMarkerScreens.length > 0 && !inCinematicHeldBeat}
    <div
      class="phase-markers-overlay"
      data-testid="phase-markers-overlay"
      data-marker-count={phaseMarkerScreens.length}
      data-on-screen-count={phaseMarkerScreens.filter((m) => m.screen.onScreen).length}
    >
      {#each phaseMarkerScreens as marker, idx (idx + '@' + marker.event.type + '@' + (marker.event.met_days ?? 0))}
        <PhaseMarkerLabel
          screenX={marker.screen.x}
          screenY={marker.screen.y}
          onScreen={marker.screen.onScreen}
          eventLabel={marker.eventLabel}
          scienceRef={marker.scienceRef}
          reveal={marker.reveal}
          eventMetDays={marker.event.met_days}
          onJump={() => jumpToMet(marker.event.met_days ?? 0)}
        />
      {/each}
    </div>
  {/if}

  <!-- FlightDirectorBanner phase markers — gold dots + labels at the 5
       narrative-phase boundaries (departure/injection/cruise/approach/
       arrival). Lens-gated like FD itself: showFlightDirector mirrors
       the Science Lens, so the markers and the banner appear together.
       Hidden in 2D mode for now (heliocentric projection only). -->
  {#if showFlightDirector && view === '3d' && fdPhaseMarkerScreens.length > 0 && !inCinematicHeldBeat}
    <div
      class="fd-phase-markers-overlay"
      data-testid="fd-phase-markers-overlay"
      data-marker-count={fdPhaseMarkerScreens.length}
    >
      {#each fdPhaseMarkerScreens as marker, slot (marker.id)}
        <FdPhaseMarkerLabel
          tickScreenX={marker.tickScreen.x}
          tickScreenY={marker.tickScreen.y}
          onScreen={marker.tickScreen.onScreen}
          showTick={marker.showTick}
          label={marker.label}
          revealed={marker.revealed}
          {slot}
        />
      {/each}
    </div>
  {/if}

  <!-- Milestone overlay — labeled flight.events render as small teal
       chips at the spacecraft's projected position at the event MET.
       Always rendered (not lens-gated): milestones are the
       per-mission historical narrative beats (Cassini's Venus #1,
       Voyager's Jupiter, etc.) and shouldn't depend on the Science
       Lens toggle. Hidden in 2D for now. -->
  {#if view === '3d' && milestoneScreens.length > 0 && !inCinematicHeldBeat}
    <div
      class="milestone-overlay"
      data-testid="milestone-overlay"
      data-milestone-count={milestoneScreens.length}
    >
      <!--
        Polish-wave-2 (2026-06): the floating chip + leader-to-canvas
        rendering for each milestone was retired. The diagonal leader
        crossing the canvas + the tethered chip read as overlay clutter
        on the cinematic shot.

        Iteration 2 (same session): a small label sits flush below each
        diamond — no leader line, no chip box, no "ACTIVE" descriptor.
        Just the event name in compact text, so the reading is "this
        dot on the path = that word." The active milestone's label
        brightens and bolds; past/future labels stay dim. The HUD
        ACTIVE EVENT row carries the full description.
      -->
      {#each milestoneScreens as m, idx (idx + '@' + m.met_days + '@' + m.label)}
        {#if m.screen.onScreen}
          <span
            class="milestone-diamond"
            class:active={m.state === 'active'}
            class:past={m.state === 'past'}
            class:future={m.state === 'future'}
            style="left: {m.screen.x}px; top: {m.screen.y}px;"
            data-testid="milestone-chip"
            data-met-days={m.met_days}
            data-milestone-state={m.state}
            data-milestone-label={m.label}
            aria-hidden="true"
          ></span>
          <span
            class="milestone-marker-label"
            class:active={m.state === 'active'}
            class:past={m.state === 'past'}
            class:future={m.state === 'future'}
            style="left: {m.screen.x}px; top: {m.screen.y + 12}px;"
            aria-hidden="true">{m.label}</span
          >
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Hidden render-state hook (Layer 2 of /fly validation strategy,
       ADR-030 follow-up). Mirrors the live spacecraft + arc + HUD state
       into DOM attributes so Playwright can introspect render
       correctness without scraping pixels. Off-screen, aria-hidden,
       no app-visible UI change. -->
  <div
    data-testid="fly-render-state"
    data-sc-x={scState.pos.x.toFixed(6)}
    data-sc-z={scState.pos.z.toFixed(6)}
    data-sc-progress={scState.progress.toFixed(4)}
    data-sc-phase={scState.phase}
    data-out-len={outPts.length}
    data-ret-len={retPts.length}
    data-out-vertex-hash={outVertexHash}
    data-helio-kms={heliocentricKms.toFixed(4)}
    data-dist-earth-au={distFromEarthAu.toFixed(6)}
    data-dist-mars-au={distFromMarsAu.toFixed(6)}
    data-signal-delay-min={signalDelayMin.toFixed(4)}
    data-met={met.toFixed(2)}
    data-sim-day={simDay.toFixed(2)}
    data-view={view}
    style="position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;"
    aria-hidden="true"
  ></div>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.fly_load_failed()}</div>
  {/if}

  <!-- W3.4 end-of-mission finale overlay. Two layers:
         1. The MISSION END caption fades in at t=8 s into the finale
            (4 s after the camera lock began). Centered, restrained
            uppercase serif over the locked composition.
         2. The fade-to-black overlay reaches full black at t=12 s and
            stays opaque until the user scrubs out of the arrived
            state (which resets the finale state). -->
  {#if inMissionFinale && finaleCaptionOpacity > 0}
    <div
      class="finale-caption"
      style="opacity: {finaleCaptionOpacity};"
      data-testid="fly-finale-caption"
      aria-live="polite"
    >
      <div class="finale-caption-label">{m.fly_mission_end()}</div>
      <div class="finale-caption-name">{mission.name}</div>
    </div>
  {/if}
  {#if finaleBlackOpacity > 0}
    <div
      class="finale-black"
      style="opacity: {finaleBlackOpacity};"
      data-testid="fly-finale-black"
      aria-hidden="true"
    ></div>
  {/if}

  <!-- #82 epilogue caption — "MISSION FLIGHT PATH · CASSINI-HUYGENS" -->
  {#if epilogueActive && epilogueCaptionOpacity > 0}
    <div
      class="epilogue-caption"
      style="opacity: {epilogueCaptionOpacity};"
      data-testid="fly-epilogue-caption"
      aria-live="polite"
    >
      <div class="epilogue-label">{m.fly_mission_flight_path()}</div>
      <div class="epilogue-name">{mission.name}</div>
    </div>
  {/if}

  <!-- #86 cinematic opening overlay — title card (with mission hero
       image) + story + fleet asset cards (hero / name / tagline / bio).
       Wide top-down system view is the backdrop (set in
       updateHelioAutoZoomTargets 'opening' branch). Skip button is
       always present while openingActive so users can fast-forward. -->
  {#if openingActive}
    {@const depYear = mission.dep_label?.slice(0, 4) ?? ''}
    {@const arrYear = mission.arr_label?.slice(0, 4) ?? ''}
    {@const story = mission.description ?? ''}
    {@const agencyFull = mission.agency_full ?? ''}
    {@const agencyLogos = agencyToLogoEntries(mission.agency ?? agencyFull)}
    {@const transitYears =
      mission.transit_days != null ? (mission.transit_days / 365).toFixed(1) : null}
    {@const missionLink = mission.id ? `${base}/missions?id=${mission.id}` : null}

    <!-- Single merged opening stack — title + context + fleet all
         inside one translucent container, screen-centered. The whole
         column reads as one "mission briefing" card with sections
         separated by hairlines, instead of three floating dark blocks.
         The wrapper is always rendered while openingActive; individual
         sections fade in via their opacity vars. -->
    <div class="opening-stack" data-testid="fly-opening-stack">
      {#if openingTitleOpacity > 0}
        <div
          class="opening-title"
          style="opacity: {openingTitleOpacity};"
          data-testid="fly-opening-title"
          aria-live="polite"
        >
          {#if openingMissionHeroUrl}
            <img
              class="opening-mission-hero"
              src={openingMissionHeroUrl}
              alt=""
              aria-hidden="true"
            />
          {/if}
          <!-- Text cluster (agency + name + years) sits NEXT TO the hero
               image rather than below it (2026-06-15 user direction:
               "mission image at top NEXT TO mission name etc and not
               over"). Layout flips to column on narrow viewports via
               the media query below so the title still reads on
               mobile. -->
          <div class="opening-title-text">
            <div class="opening-agency-row">
              {#each agencyLogos as logo (logo.path)}
                <img
                  class="opening-agency-logo"
                  src={logo.path}
                  alt={logo.short}
                  title="{logo.short} — {logo.full}"
                />
              {/each}
              <div class="opening-agency">
                {mission.agency ?? agencyFull}
              </div>
            </div>
            {#if missionLink}
              <a
                class="opening-name opening-name-link"
                href={missionLink}
                data-sveltekit-preload-data="off">{mission.name}</a
              >
            {:else}
              <div class="opening-name">{mission.name}</div>
            {/if}
            {#if depYear || arrYear}
              <div class="opening-years">
                {depYear}{arrYear && arrYear !== depYear ? ` — ${arrYear}` : ''}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if (openingContextOpacity > 0 || openingFleetOpacity > 0) && (story || mission.vehicle || mission.payload || mission.delta_v_label || openingFleetAssets.length > 0)}
        <div class="opening-body" data-testid="fly-opening-body">
          {#if openingContextOpacity > 0 && (story || mission.vehicle || mission.payload || mission.delta_v_label)}
            <div
              class="opening-context"
              style="opacity: {openingContextOpacity};"
              data-testid="fly-opening-context"
            >
              {#if story}
                <div class="opening-story">{story}</div>
              {/if}
              <div class="opening-stats">
                {#if mission.vehicle}
                  <span class="opening-stat">
                    <span class="opening-stat-label">{m.fly_opening_vehicle()}</span>
                    <span class="opening-stat-val">{mission.vehicle}</span>
                  </span>
                {/if}
                {#if mission.payload}
                  <span class="opening-stat">
                    <span class="opening-stat-label">{m.fly_opening_payload()}</span>
                    <span class="opening-stat-val">{mission.payload}</span>
                  </span>
                {/if}
                {#if mission.delta_v_label}
                  <span class="opening-stat">
                    <span class="opening-stat-label">∆V</span>
                    <span class="opening-stat-val">{mission.delta_v_label}</span>
                  </span>
                {/if}
                {#if transitYears}
                  <span class="opening-stat">
                    <span class="opening-stat-label">{m.fly_opening_transit()}</span>
                    <span class="opening-stat-val">{transitYears} years</span>
                  </span>
                {/if}
              </div>
            </div>
          {/if}

          {#if openingFleetOpacity > 0 && openingFleetAssets.length > 0}
            <div
              class="opening-fleet"
              style="opacity: {openingFleetOpacity};"
              data-testid="fly-opening-fleet"
            >
              <div class="opening-fleet-label">{m.fly_opening_fleet_assets()}</div>
              <div class="opening-fleet-row">
                {#each openingFleetAssets as asset (asset.id)}
                  <a
                    class="opening-fleet-card"
                    class:hero={asset.role === 'spacecraft' || asset.role === 'launcher'}
                    href="{base}/fleet?id={asset.id}"
                    data-sveltekit-preload-data="off"
                  >
                    {#if asset.heroPath}
                      <img
                        class="opening-fleet-hero"
                        src={asset.heroPath}
                        alt=""
                        aria-hidden="true"
                      />
                    {/if}
                    <div class="opening-fleet-meta">
                      <div class="opening-fleet-role">{asset.role.replace('-', ' ')}</div>
                      <div class="opening-fleet-name">{asset.name}</div>
                      {#if (asset.role === 'spacecraft' || asset.role === 'launcher') && asset.description}
                        <div class="opening-fleet-bio">{asset.description}</div>
                      {:else if asset.tagline}
                        <div class="opening-fleet-tagline">{asset.tagline}</div>
                      {/if}
                    </div>
                  </a>
                {/each}
                <!-- Synthetic launcher fallback removed per Marko's
                     feedback — if no fleet entry exists for the
                     vehicle, the launcher is omitted entirely rather
                     than shown as a text-only card. The proper fix
                     is to add the missing launcher fleet entries
                     (Titan IVB for Cassini, etc.) to the fleet index. -->
              </div>
            </div>
          {/if}
        </div>
      {/if}
      <!-- Skip button — last item in the stack, below the fleet
           section. Always visible while openingActive so users can
           fast-forward at any opening fade state. -->
      <button
        type="button"
        class="opening-skip"
        data-testid="fly-opening-skip"
        onclick={skipOpening}
        aria-label={m.fly_proceed_aria()}
      >
        <span>{m.fly_proceed_to_simulation()}</span>
        <span class="opening-skip-arrow" aria-hidden="true">▸</span>
      </button>
    </div>
  {/if}
  <!-- W3.6 scrubber-jump cut overlay. Short 200 ms fade-to-black on
       big timeline jumps so the audience reads it as a deliberate cut,
       not a long lerp across the system. -->
  {#if cutBlackOpacity > 0}
    <div
      class="cut-black"
      style="opacity: {cutBlackOpacity};"
      data-testid="fly-cut-black"
      aria-hidden="true"
    ></div>
  {/if}

  <!-- Left-side HUD stack: identity → navigation → systems. Replaces
       the previous scattered top-left/top-right/bottom-right layout
       that conflicted with the CAPCOM toggle. User-dismissible via the
       HUD toggle in the top-right row. -->
  <div
    class="hud-stack"
    data-audio-stage="fly-hud"
    class:hidden={!showHud}
    class:cinematic-hidden={inCinematicHeldBeat}
  >
    <aside
      class="hud hud-identity"
      role="status"
      aria-live="polite"
      aria-label={m.fly_panel_identity()}
      data-testid="mission-name"
    >
      <span class="hud-title">{mission.name}</span>
      <span class="hud-phase phase-{phase}" data-testid="hud-phase-pill">
        {phaseLabel}
        {#if phaseScienceRef}
          <ScienceChip
            tab={phaseScienceRef.tab}
            section={phaseScienceRef.slug}
            label={phaseLabel}
          />
        {/if}
      </span>
      {#if mission.name === 'ORRERY DEMO'}
        <p class="hud-demo-hint">{m.fly_demo_hint()}</p>
        <a href="{base}/plan" class="hud-demo-cta">{m.fly_demo_cta()}</a>
        <a href="{base}/missions" class="hud-demo-cta hud-demo-cta-secondary"
          >{m.fly_demo_replay_cta()}</a
        >
      {/if}
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_trajectory()}</span>
        <span class="hud-val">{trajectoryTypeLabel}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_vehicle()}</span>
        <span class="hud-val">{mission.vehicle}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_dep()}</span>
        <span class="hud-val">{mission.dep_label}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_arr()}</span>
        <span class="hud-val">{mission.arr_label}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key"
          >{m.fly_hud_met()}<ScienceChip
            tab="mission-phases"
            section="met"
            label={m.chip_label_met()}
          /></span
        >
        <span class="hud-val">{m.fly_hud_met_value({ day: Math.round(met).toString() })}</span>
      </div>
      {#if showPlanOuterTrajectoryCaveat}
        <p class="hud-trajectory-caveat" role="note">{m.plan_gravity_assist_caveat()}</p>
      {/if}
    </aside>

    <!-- Navigation HUD (left stack, below identity) -->
    <aside class="hud hud-navigation" aria-label={m.fly_panel_navigation()}>
      <div class="hud-row">
        <span class="hud-key"
          >{m.fly_hud_velocity()}<ScienceChip
            tab="orbits"
            section="vis-viva"
            label={m.chip_label_vis_viva()}
          /></span
        >
        <span class="hud-val">{m.fly_hud_kms({ value: heliocentricKms.toFixed(2) })}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key"
          >{m.fly_hud_dist_earth()}<ScienceChip
            tab="scales-time"
            section="light-minute"
            label={m.chip_label_light_minute()}
          /></span
        >
        <span class="hud-val">
          {m.fly_hud_mkm({
            value: distFromEarthMkm < 1 ? distFromEarthMkm.toFixed(2) : distFromEarthMkm.toFixed(0),
          })}<span class="hud-val-sub"
            >&nbsp;·&nbsp;{m.fly_hud_lmin({
              value: signalDelayMin < 1 ? signalDelayMin.toFixed(2) : signalDelayMin.toFixed(1),
            })}</span
          >
        </span>
      </div>
      {#if !isMoonMission}
        <div class="hud-row">
          <span class="hud-key">{m.fly_hud_dist_mars()}</span>
          <span class="hud-val">{m.fly_hud_mkm({ value: distFromMarsMkm.toFixed(0) })}</span>
        </div>
      {/if}
    </aside>

    {#if hasFlightParams && mission.flight}
      <!-- FLIGHT PARAMS HUD (v0.1.7 / ADR-027). Surfaces real per-mission
           launch C3, arrival V∞, and total ∆v sourced from the mission's
           public flight record. Sparse-data caveat banner shows above
           when flight_data_quality ≠ "measured". -->
      <aside class="hud hud-flight-params" aria-label={m.fly_panel_flight_params()}>
        {#if flightCaveat}
          <div class="flight-caveat-banner" role="note">
            {flightCaveat}
            {#if flightCaveatWhy}
              <WhyPopover title={m.why_caveat_title()} body={flightCaveatWhy} />
            {/if}
          </div>
        {/if}
        <div class="hud-section-title">{m.fly_panel_flight_params()}</div>
        <div class="hud-row">
          <span class="hud-key"
            >{m.fly_hud_c3()}<ScienceChip
              tab="propulsion"
              section="c3"
              label={m.chip_label_c3()}
            /></span
          >
          <span class="hud-val accent-c3">
            {mission.flight.launch?.c3_km2_s2 != null
              ? m.fly_hud_unit_c3({ value: fmtNumOrDash(mission.flight.launch.c3_km2_s2, 2) })
              : '—'}
          </span>
        </div>
        <div class="hud-row">
          <span class="hud-key"
            >{m.fly_hud_v_infinity()}<ScienceChip
              tab="propulsion"
              section="v-infinity"
              label={m.chip_label_v_infinity()}
            /></span
          >
          <span class="hud-val accent-vinf">
            {mission.flight.arrival?.v_infinity_km_s != null
              ? m.fly_hud_kms({
                  value: fmtNumOrDash(mission.flight.arrival.v_infinity_km_s, 2),
                })
              : '—'}
          </span>
        </div>
        <div class="hud-row">
          <span class="hud-key"
            >{m.fly_hud_total_dv()}<ScienceChip
              tab="propulsion"
              section="dv-budget"
              label={m.chip_label_dv_budget()}
            /></span
          >
          <span class="hud-val accent-dv">
            {mission.flight.totals?.total_dv_km_s != null
              ? m.fly_hud_kms({ value: fmtNumOrDash(mission.flight.totals.total_dv_km_s, 2) })
              : '—'}
          </span>
        </div>
        <!-- ACTIVE EVENT row (polish-wave-2, 2026-06). The current
             milestone within the active window — pre-2026-06 this
             rendered as a floating chip on the canvas; that was
             replaced by an HUD line so the cinematic shot reads
             without overlay clutter, with the on-canvas diamond
             pulsing to graphically correlate the label with its
             anchor on the path. Renders only when an active
             milestone exists. -->
        {#if activeMilestone}
          <div class="hud-row hud-row-active-event" data-testid="fly-active-event">
            <span class="hud-key">{m.fly_hud_active_event()}</span>
            <span class="hud-val accent-active">
              <span class="active-event-label">{activeMilestone.label}</span>
              {#if activeMilestone.description}
                <span class="active-event-description">{activeMilestone.description}</span>
              {/if}
            </span>
          </div>
        {/if}
        <!-- NEXT EVENT row (v0.1.13). Reads from the merged events
             list (mergeFlightEvents fuses editorial + structural). -->
        <div class="hud-row" data-testid="fly-next-event">
          <span class="hud-key">{m.fly_hud_next_event()}</span>
          <span class="hud-val accent-vinf">
            {#if nextFlightEvent}
              {m.fly_hud_event_t_plus({
                day: Math.round(nextFlightEvent.met - met).toString(),
              })}
              · {nextFlightEvent.label}
            {:else}
              —
            {/if}
          </span>
        </div>
      </aside>
    {/if}

    <!-- Systems HUD (bottom-right) -->
    <aside class="hud hud-systems" aria-label={m.fly_panel_systems()}>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_dv_used()}</span>
        <span class="hud-val">{m.fly_hud_kms({ value: mission.dv_used.toFixed(2) })}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_dv_remaining()}</span>
        <span class="hud-val teal">{m.fly_hud_kms({ value: dvRemaining.toFixed(2) })}</span>
      </div>
      <div class="dv-bar" aria-hidden="true">
        <div
          class="dv-fill"
          style:width="{Math.min(100, (mission.dv_used / Math.max(0.01, mission.dv_total)) * 100)}%"
        ></div>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_eta()}</span>
        <span class="hud-val">{m.fly_hud_eta_value({ day: Math.round(totalDays).toString() })}</span
        >
      </div>
    </aside>

    <!-- Live spacecraft state card — Phase J.4 fly-hover. Lens +
         'hover' layer gated. Sits as the bottom-most left-rail panel
         under hud-systems so it shares the column with identity /
         navigation / flight-params / systems. -->
    <SpacecraftInfoCard {heliocentricKms} {distFromEarthAu} {distFromMarsAu} metDays={met} />
  </div>

  <!-- Timeline scrubber (bottom-left) -->
  <div
    class="scrubber"
    class:cinematic-hidden={inCinematicHeldBeat}
    aria-label={m.fly_scrub_label()}
  >
    <button
      type="button"
      class="play-btn"
      data-audio-stage="fly-play"
      onclick={togglePlay}
      aria-label={isPlaying ? m.fly_pause() : m.fly_play()}
    >
      {isPlaying ? '⏸' : '▶'}
    </button>
    <div class="scrub-track-wrap">
      <!-- Custom-styled track underneath the (transparent) native input.
           The native input still owns drag + click interactions for
           accessibility; the styled track + progress fill render the
           visual. YouTube-style: chapter dots sit ON the track at each
           milestone's MET, the fill grows behind them as the mission
           plays, and the label appears in a clean tooltip card on hover
           (no zigzag, no escaping the row). -->
      <div class="scrub-visual" aria-hidden="true">
        <div class="scrub-fill" style="width: {Math.max(0, Math.min(1, arcProgress)) * 100}%"></div>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={Math.max(0, Math.min(1, arcProgress))}
        oninput={onScrub}
        onpointerdown={onScrubStart}
        onpointerup={onScrubEnd}
        onpointercancel={onScrubEnd}
        class="scrub"
        aria-label={m.fly_scrub_label()}
      />
      {#if arcTotalDays > 0 && mission.flight?.events}
        <div class="milestone-track" data-testid="milestone-track">
          {#each mission.flight.events as evt, idx (idx + '@' + evt.met_days + '@' + (evt.label ?? ''))}
            {#if evt.label && evt.met_days != null}
              {@const pct = Math.max(0, Math.min(100, (evt.met_days / arcTotalDays) * 100))}
              {@const past = (evt.met_days ?? 0) < simDay - arcTimeline.dep_day}
              <button
                type="button"
                class="milestone-tick-button"
                class:past
                style="left: {pct}%;"
                aria-label="{evt.label} at MET {evt.met_days} days. Click to jump."
                onclick={() => jumpToMet(evt.met_days ?? 0)}
                data-met-days={evt.met_days}
              >
                <span class="milestone-tooltip">
                  <span class="milestone-tooltip-label">{evt.label}</span>
                  <span class="milestone-tooltip-met">MET {evt.met_days}d</span>
                  {#if evt.description}
                    <span class="milestone-tooltip-desc">{evt.description}</span>
                  {/if}
                </span>
              </button>
            {/if}
          {/each}
        </div>
      {/if}
      <!-- FD stage ticks on the scrubber — small gold marks at each
           narrative stage (separation, cruise, approach, arrival).
           Same scrubber-jump behaviour as milestones. Mirrors the
           on-canvas gold diamonds so the user can see the FD cadence
           on the timeline too. -->
      {#if arcTotalDays > 0 && fdScrubberTicks.length > 0}
        <div class="fd-stage-track" data-testid="fd-stage-track">
          {#each fdScrubberTicks as t (t.id)}
            {@const past = t.met_days < simDay - arcTimeline.dep_day}
            <button
              type="button"
              class="fd-stage-tick-button"
              class:past
              style="left: {t.pct}%;"
              aria-label="{t.label} stage. Click to jump."
              onclick={() => jumpToMet(t.met_days)}
              data-fd-stage={t.id}
            >
              <span class="fd-stage-tooltip">
                <span class="fd-stage-tooltip-label">{t.label}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <div class="speed-group" role="group" aria-label={m.fly_speed_label()}>
      {#each isMoonMission ? [0.1, 0.5, 1, 3] : [1, 7, 30, 90] as sp}
        <button
          type="button"
          class="speed-pill"
          class:active={simSpeed === sp}
          onclick={() => setSpeed(sp)}
        >
          {sp}×
        </button>
      {/each}
    </div>
  </div>

  <!-- Left cluster — lens-gated, gold theme. Only appears when the
       Science Lens is on; the three toggles control panels that
       themselves only render under the lens, so the cluster's
       visibility tracks the lens state. Keeps casual-mode chrome
       minimal. -->
  {#if lensOnState}
    <div
      class="fly-toggle-row fly-toggle-row-left lens"
      role="group"
      aria-label={m.fly_science_lens_toggles_aria()}
    >
      <button
        type="button"
        class="toggle toggle-lens"
        aria-pressed={showFlightDirector}
        title={m.fly_toggle_flight_director_title()}
        onclick={() => (showFlightDirector = !showFlightDirector)}
      >
        FD
      </button>
      <button
        type="button"
        class="toggle toggle-lens"
        aria-pressed={showLayersPanel}
        title={m.fly_toggle_science_layers_title()}
        onclick={() => (showLayersPanel = !showLayersPanel)}
      >
        LYR
      </button>
      {#if conicsLayerOnState}
        <button
          type="button"
          class="toggle toggle-lens"
          aria-pressed={showConicPanel}
          title={m.fly_toggle_conic_title()}
          onclick={() => (showConicPanel = !showConicPanel)}
        >
          CON
        </button>
      {/if}
    </div>
  {/if}

  <!-- Right cluster — always visible, blue theme. HUD, CAPCOM, 2D/3D.
       2D sits furthest right so the canonical view switch stays at the
       conventional top-right corner. -->
  <div
    class="fly-toggle-row fly-toggle-row-right"
    role="group"
    aria-label={m.fly_view_toggles_aria()}
  >
    <button
      type="button"
      class="toggle"
      aria-pressed={showHud}
      title={m.fly_toggle_hud_title()}
      onclick={() => (showHud = !showHud)}
    >
      HUD
    </button>
    <button
      type="button"
      class="toggle"
      aria-pressed={showCapcom}
      title={m.fly_toggle_capcom_title()}
      onclick={() => (showCapcom = !showCapcom)}
    >
      CAP
    </button>
    <button
      class="toggle"
      type="button"
      data-testid="fly-view-toggle"
      onclick={toggleView}
      aria-pressed={view === '2d'}
    >
      {view === '3d' ? m.fly_label_view_2d() : m.fly_label_view_3d()}
    </button>
  </div>

  <!-- CAPCOM panel: shown when a mission is loaded AND the user hasn't
       dismissed it via the CAP toggle in the top-right row. -->
  {#if mission && showCapcom}
    <aside
      class="capcom-panel"
      class:cinematic-hidden={inCinematicHeldBeat}
      aria-label={m.fly_capcom_panel_label()}
    >
      <!-- Static header: anomaly + comms always visible. The events
           section below scrolls independently so the most-recent
           events stay readable as the timeline accumulates. -->
      <div class="capcom-header">
        <section class="capcom-section">
          <h3>{m.fly_capcom_anomaly_title()}</h3>
          <div class="anomaly anomaly-{anomalyLevel}">
            <span class="anomaly-dot" aria-hidden="true"></span>
            <span class="anomaly-label">{anomalyLabel}</span>
            <span class="anomaly-detail">
              ∆v margin {dvRemaining.toFixed(2)} km/s
            </span>
          </div>
        </section>

        <section class="capcom-section">
          <h3>{m.fly_capcom_comms_title()}</h3>
          <div class="comm-row">
            <span class="comm-key">{m.fly_capcom_signal_delay()}</span>
            <span class="comm-val">{m.fly_capcom_lmin({ value: signalDelayMin.toFixed(2) })}</span>
          </div>
          <div class="comm-row">
            <span class="comm-key">{m.fly_capcom_rtt()}</span>
            <span class="comm-val"
              >{m.fly_capcom_lmin({ value: (signalDelayMin * 2).toFixed(2) })}</span
            >
          </div>
        </section>
      </div>

      <!-- Scrolling events feed — latest at top (pastEvents is already
           reversed in the $derived above). New entries appear at the
           top so the eye doesn't have to chase them. -->
      <section class="capcom-section capcom-events">
        <h3>{m.fly_capcom_events_title()}</h3>
        {#if pastEvents.length === 0}
          <p class="empty">{m.fly_capcom_no_events()}</p>
        {:else}
          <ul>
            {#each pastEvents as event, idx (idx + '@' + event.met + '@' + event.label)}
              <li class="event event-{event.type}">
                <span class="event-time">
                  {m.fly_capcom_event_at({ day: Math.round(event.met).toString() })}
                </span>
                <span class="event-label">{event.label}</span>
                <p class="event-note">{event.note}</p>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </aside>
  {/if}
</div>

<!-- Top control bar — Flight Director narration + Layers panel sit
     side-by-side in a flex row instead of stacked. Each component's
     own position:fixed is overridden by the wrapper. Both pointer-
     event regions still toggle independently. -->
{#if showLayersPanel}
  <!-- Unified Science Lens panel — top-center, carrying the per-route
       lens story (Keplerian transfer ellipse) plus the layer toggles
       so /fly aligns with /explore / /earth / /moon / /mars / /plan,
       which all pass title + body + tab + section. LYR toggle hides it. -->
  <ScienceLayersPanel
    title={m.fly_mission_arc_title()}
    body="Every interplanetary trajectory is a slice of an ellipse with the Sun at one focus. Two endpoints (Earth at launch, the target at arrival) plus a time of flight pin a unique Lambert solution; the porkchop plot is the surface of all such solutions."
    tab="transfers"
    section="transfer-ellipse"
    available={[
      'hover',
      'soi',
      'gravity',
      'velocity',
      'centripetal',
      'apsides',
      'coast',
      'conics',
      'hill-sphere',
      'lagrange-points',
      'magnetosphere',
      'moons',
    ]}
    historicalFoundations={[
      { tab: 'history', section: 'keplers-laws-1609', label: "Kepler's three laws, 1609" },
      { tab: 'history', section: 'newton-principia-1687', label: 'Newton · Principia, 1687' },
      { tab: 'transfers', section: 'lambert-problem', label: 'Lambert · arc problem, 1761' },
    ]}
  />
{/if}

{#if showFlightDirector}
  <!-- Bottom strips row — centers FlightDirectorBanner + ConicSectionPanel
       above the timeline scrubber, side-by-side at equal height so the
       two science overlays read as a unified pair (was bottom-left + bottom-right
       with no alignment + the conic panel disappearing behind CAPCOM). -->
  <div class="fly-bottom-strips" class:cinematic-hidden={inCinematicHeldBeat}>
    <div class="fly-fd-anchor">
      <FlightDirectorBanner
        scPhase={scState.phase}
        progress={scState.progress}
        isRoundTrip={retPts.length > 0}
      />
    </div>
    {#if showConicPanel}
      <div class="fly-conic-anchor">
        <ConicSectionPanel
          shape={conicState.shape}
          a={conicState.a}
          e={conicState.e}
          epsilon={conicState.epsilon}
        />
      </div>
    {/if}
  </div>
{:else if showConicPanel}
  <!-- Conic-section panel alone (FD hidden / not lens-gated). Re-uses the
       same centered strip container so the panel stays in the same
       horizontal band whether or not FD is present. -->
  <div class="fly-bottom-strips">
    <div class="fly-conic-anchor">
      <ConicSectionPanel
        shape={conicState.shape}
        a={conicState.a}
        e={conicState.e}
        epsilon={conicState.epsilon}
      />
    </div>
  </div>
{/if}

<PhasePanel
  open={phasePanelOpen}
  onClose={() => (phasePanelOpen = false)}
  {phaseLabel}
  scienceRef={phaseScienceRef}
/>

<style>
  /* Follow-up 5 — cislunar hero-events panel in the debug PAGE tab. */
  .cislunar-hero-debug {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  .cislunar-hero-header {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
  }
  .cislunar-hero-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .cislunar-hero-comp {
    opacity: 0.7;
    font-style: italic;
  }
  .fly {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .layer.hidden {
    display: none;
  }
  :global(.fly canvas) {
    display: block;
  }
  /* GH #107 — phase marker overlay sits over both 3D and 2D layers.
     Pointer-events: none on the container so the underlying canvas
     still receives camera input; individual markers re-enable
     pointer-events for their chip via the PhaseMarkerLabel CSS. */
  .phase-markers-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 11;
  }
  /* FD-phase marker overlay — same shape as phase-markers-overlay above;
     sits a notch higher in z so it draws on top of the cislunar/inter-
     planetary event labels if a mission happens to have both. */
  .fd-phase-markers-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 13;
  }
  /* Milestone overlay — labeled flight.events. Teal accent
     distinguishes per-mission historical beats from the gold FD
     stage cadence. Sits ABOVE FD markers (z 14) so a Cassini Venus
     #1 chip is readable even if a CRUISE diamond projects close. */
  .milestone-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 14;
  }
  /* Milestone diamonds (polish-wave-2). Past = dim teal pinprick;
     future = mid teal pinprick; active = larger glowing teal pulse
     so the eye can pick out the "we're here now" anchor on the path.
     The label / description live in the HUD ACTIVE row now (see
     `.hud-row-active-event` below). */
  .milestone-diamond {
    position: absolute;
    width: 6px;
    height: 6px;
    background: #2dd4a8;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 0 0 3px rgba(45, 212, 168, 0.65);
    z-index: 12;
    pointer-events: none;
    user-select: none;
  }
  .milestone-diamond.past {
    background: rgba(45, 212, 168, 0.55);
    box-shadow: 0 0 2px rgba(45, 212, 168, 0.35);
  }
  .milestone-diamond.future {
    background: rgba(45, 212, 168, 0.75);
  }
  .milestone-diamond.active {
    width: 11px;
    height: 11px;
    background: #5eead4;
    box-shadow:
      0 0 10px rgba(94, 234, 212, 0.95),
      0 0 4px rgba(255, 255, 255, 0.7);
    animation: milestone-pulse 1.6s ease-in-out infinite;
  }
  @keyframes milestone-pulse {
    0%,
    100% {
      transform: translate(-50%, -50%) rotate(45deg) scale(1);
      box-shadow:
        0 0 10px rgba(94, 234, 212, 0.95),
        0 0 4px rgba(255, 255, 255, 0.7);
    }
    50% {
      transform: translate(-50%, -50%) rotate(45deg) scale(1.35);
      box-shadow:
        0 0 18px rgba(94, 234, 212, 1),
        0 0 8px rgba(255, 255, 255, 0.85);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .milestone-diamond.active {
      animation: none;
    }
  }
  /* Milestone diamond label — small text flush below the diamond,
     no leader / no chip box. Anchors the label to the diamond's
     screen position so the reading is "dot = word." */
  .milestone-marker-label {
    position: absolute;
    transform: translate(-50%, 0);
    white-space: nowrap;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(45, 212, 168, 0.85);
    text-shadow:
      0 0 4px rgba(8, 10, 22, 0.95),
      0 0 8px rgba(8, 10, 22, 0.85);
    pointer-events: none;
    user-select: none;
    z-index: 12;
  }
  .milestone-marker-label.past {
    color: rgba(45, 212, 168, 0.5);
  }
  .milestone-marker-label.future {
    color: rgba(45, 212, 168, 0.7);
  }
  .milestone-marker-label.active {
    color: #5eead4;
    font-weight: 700;
    text-shadow:
      0 0 6px rgba(94, 234, 212, 0.55),
      0 0 4px rgba(8, 10, 22, 1),
      0 0 10px rgba(8, 10, 22, 0.9);
  }
  /* HUD ACTIVE EVENT row — paired with the pulsing on-canvas diamond.
     Wraps label + italic description vertically so a one-line key on
     the left tracks a multi-line value on the right. */
  .hud-row-active-event {
    align-items: flex-start;
  }
  .hud-row-active-event .accent-active {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(94, 234, 212, 0.98);
  }
  .active-event-label {
    font-weight: 600;
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  .active-event-description {
    color: rgba(255, 255, 255, 0.82);
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: 0.2px;
    text-transform: none;
    white-space: normal;
    max-width: 22ch;
  }

  /* Bottom strips row — centered band above the timeline scrubber
     that holds FlightDirectorBanner + ConicSectionPanel side-by-side
     at equal height. Replaces the prior split layout (FD bottom-left,
     conic bottom-right) which left them visually unaligned and let
     the conic panel slip behind the CAPCOM column on narrow viewports.
     align-items: stretch makes both children share the taller height. */
  .fly-bottom-strips {
    /* #342 Phase 30 — mobile-first. Phone defaults: edge-to-edge
       strip, vertical stack. Restored to centered desktop layout at
       @min-width: 901. */
    position: fixed;
    bottom: 80px;
    left: 16px;
    right: 16px;
    z-index: 32;
    display: flex;
    flex-wrap: nowrap;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    pointer-events: none;
    max-width: calc(100vw - 32px);
  }
  .fly-fd-anchor {
    display: flex;
    flex: 1 1 auto;
    max-width: 100%;
  }
  .fly-fd-anchor :global(.banner) {
    position: static;
    top: auto;
    left: auto;
    transform: none;
    pointer-events: auto;
    max-width: 540px;
    width: 100%;
  }
  .fly-fd-anchor :global(.banner:hover),
  .fly-fd-anchor :global(.banner:focus-visible) {
    transform: translateY(-2px);
  }
  .fly-conic-anchor {
    display: flex;
    flex: 1 1 auto;
    max-width: 100%;
  }
  .fly-conic-anchor :global(.panel) {
    /* !important guards against the component's own @media mobile
       block re-setting position/bottom/right when wrapped. */
    position: static !important;
    bottom: auto !important;
    right: auto !important;
    left: auto !important;
    pointer-events: auto;
    width: 100% !important;
  }
  .fly-conic-anchor :global(.panel:hover),
  .fly-conic-anchor :global(.panel:focus-visible) {
    transform: translateY(-2px);
  }
  /* ─── ≥ 901 px — restore centered horizontal strip layout ──────── */
  @media (min-width: 901px) {
    .fly-bottom-strips {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
      flex-direction: row;
      /* Keep the strips inside the channel between the hud-stack (left
         16+220 = 236) and the CAPCOM column (right 16+320 = 336). */
      max-width: calc(100vw - 600px);
    }
    .fly-fd-anchor {
      flex: 0 1 auto;
      max-width: 540px;
    }
    .fly-conic-anchor {
      flex: 0 0 240px;
      max-width: none;
    }
  }

  .load-banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    border-radius: 4px;
  }

  /* W3.4 finale overlays. The caption hangs centered, lower-third
     positioned so it doesn't fight the locked composition's body
     in upper frame. The black overlay covers everything (z above
     all the HUD chrome) so the fade reads as final. */
  .finale-caption {
    position: fixed;
    bottom: 18%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    text-align: center;
    transition: opacity 200ms linear;
  }
  .finale-caption-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 4px;
    color: rgba(255, 200, 80, 0.85);
    text-transform: uppercase;
  }
  .finale-caption-name {
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 6px;
    color: rgba(255, 255, 255, 0.95);
    text-transform: uppercase;
    text-shadow:
      0 0 12px rgba(0, 0, 0, 0.9),
      0 0 4px rgba(0, 0, 0, 1);
  }
  .finale-black {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: #000;
    pointer-events: none;
    transition: opacity 200ms linear;
  }

  /* #82 epilogue caption — top-anchored, larger than the finale
     caption so it reads as a different beat. */
  .epilogue-caption {
    position: fixed;
    top: 12%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    text-align: center;
    transition: opacity 400ms linear;
  }
  .epilogue-label {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 5px;
    color: rgba(94, 234, 212, 0.85);
    text-transform: uppercase;
  }
  .epilogue-name {
    font-family: var(--font-display);
    font-size: 24px;
    letter-spacing: 7px;
    color: rgba(255, 255, 255, 0.95);
    text-transform: uppercase;
    text-shadow:
      0 0 12px rgba(0, 0, 0, 0.9),
      0 0 4px rgba(0, 0, 0, 1);
  }

  /* #86 opening overlay — one screen-centered translucent column
     containing title section + body section. Sections separated by
     hairlines; single shared backdrop reads as a single "mission
     briefing" card instead of stacked dark blocks. */
  .opening-stack {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 200;
    /* Bumped from 820 → 1040 px so the typical launcher + spacecraft
       hero-card pair (each up to 460 px) fits without horizontal
       scroll (2026-06-22 user direction: "can we expand that intro
       surface not to have that scroll"). 94vw cap still keeps it on
       narrow laptops. */
    width: min(1040px, 94vw);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 20px 28px;
    background: rgba(8, 12, 24, 0.22);
    border-radius: 14px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
    pointer-events: auto;
    overflow-y: auto;
  }
  /* Title — hero image LEFT, text cluster RIGHT (2026-06-15 user
     direction). Stacks back to column on viewports too narrow to
     comfortably fit both side-by-side.
     #342 Phase 30 — mobile-first: stacked + centered by default;
     row layout returns at @min-width: 641. */
  .opening-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    text-align: center;
    transition: opacity 200ms linear;
    max-width: 100%;
    pointer-events: auto;
  }
  .opening-title-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  /* ─── ≥ 641 px — restore hero-image-left, text-right row layout ── */
  @media (min-width: 641px) {
    .opening-title {
      flex-direction: row;
      align-items: center;
      text-align: left;
    }
    .opening-title-text {
      align-items: flex-start;
    }
  }
  .opening-agency-row {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .opening-agency-logo {
    height: 20px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
  }
  .opening-agency {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 5px;
    color: rgba(94, 234, 212, 0.85);
    text-transform: uppercase;
  }
  .opening-name {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: 6px;
    color: rgba(255, 255, 255, 0.98);
    text-transform: uppercase;
    text-shadow:
      0 0 16px rgba(0, 0, 0, 0.95),
      0 0 4px rgba(0, 0, 0, 1);
  }
  .opening-name-link {
    text-decoration: none;
    transition: color 150ms ease;
  }
  .opening-name-link:hover,
  .opening-name-link:focus-visible {
    color: rgba(94, 234, 212, 0.95);
    outline: none;
  }
  .opening-years {
    font-family: 'Space Mono', monospace;
    font-size: 14px;
    letter-spacing: 3px;
    color: rgba(255, 200, 80, 0.85);
  }
  /* Merged opening body — context + fleet wrapped in a single
     translucent surface. Positioned in the lower half of the viewport
     (top: 45%) and bottom-padded to the floor so it grows downward
     without overlapping the title. The inner .opening-context and
     .opening-fleet sections render WITHOUT their own backdrops — the
     body wrapper provides the single shared tint. */
  .opening-body {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    pointer-events: auto;
    border-top: 1px solid rgba(94, 234, 212, 0.18);
    padding-top: 14px;
  }
  .opening-context {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    pointer-events: none;
    text-align: center;
    transition: opacity 200ms linear;
  }
  .opening-story {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 15px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.88);
    letter-spacing: 0.3px;
    text-shadow:
      0 0 10px rgba(0, 0, 0, 0.95),
      0 0 4px rgba(0, 0, 0, 1);
  }
  .opening-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    margin-top: 6px;
  }
  .opening-stat {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .opening-stat-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2.5px;
    color: rgba(94, 234, 212, 0.7);
    text-transform: uppercase;
  }
  .opening-stat-val {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.92);
    text-transform: uppercase;
  }
  /* Nested fleet section — no own backdrop; rides inside .opening-body */
  .opening-fleet {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
    transition: opacity 200ms linear;
    border-top: 1px solid rgba(94, 234, 212, 0.18);
    padding-top: 14px;
  }
  .opening-fleet-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3.5px;
    color: rgba(255, 200, 80, 0.78);
    text-transform: uppercase;
  }
  /* Fleet assets — preferred single row at 2026-06-15 direction
     ("fleet assets in one row and not separate rows"), but now ALLOWED
     to wrap when the asset count would force horizontal scroll
     (2026-06-22 user direction "expand that intro surface not to have
     that scroll" — paired with the opening-stack max-width bump from
     820 → 1040 px). On wide viewports the typical 2-card case still
     reads as one row; many-asset missions wrap to a second row instead
     of revealing a horizontal scrollbar. */
  .opening-fleet-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding-bottom: 4px;
  }
  /* Center the row when there's exactly one asset — multi-asset rows
     stay left-anchored so horizontal scroll feels natural starting
     from the first card (2026-06-15 user follow-up: "when there is
     only 1 fleet asset, center it"). */
  .opening-fleet-row:has(> .opening-fleet-card:only-child) {
    justify-content: center;
  }
  .opening-fleet-card {
    flex-shrink: 0;
  }
  .opening-fleet-chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 16px;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(94, 234, 212, 0.35);
    border-radius: 4px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .opening-fleet-role {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(94, 234, 212, 0.8);
    text-transform: uppercase;
  }
  .opening-fleet-id {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.92);
    text-transform: uppercase;
  }

  /* Mission hero image — sits LEFT of the title text cluster. Slightly
     squarer than the old 220×130 banner so the title block reads as
     "image + label" rather than "image with caption below". Drops to
     a wider banner on mobile via the @media query above. */
  .opening-mission-hero {
    flex-shrink: 0;
    width: 180px;
    max-width: 60vw;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid rgba(94, 234, 212, 0.35);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
  }

  /* #86 v2 — skip button. Sits as the LAST item in .opening-stack,
     below the fleet card section, so the user's eye reaches it after
     reading the brief. Inline positioning inside the centered stack
     (no longer fixed top-right). */
  .opening-skip {
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 22px;
    background: rgba(8, 10, 22, 0.55);
    border: 1px solid rgba(94, 234, 212, 0.5);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.92);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
  }
  .opening-skip:hover,
  .opening-skip:focus-visible {
    background: rgba(94, 234, 212, 0.15);
    border-color: rgba(94, 234, 212, 0.9);
    color: #fff;
    outline: none;
  }
  .opening-skip-arrow {
    font-size: 14px;
    color: rgba(94, 234, 212, 0.85);
  }

  /* #86 v2 — fleet cards. Clickable (anchor) so they deep-link into
     /fleet?id=… for details. Translucent — the body wrapper carries the
     primary tint; cards just get a hairline border + minimal lift on
     hover. */
  .opening-fleet-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 14px;
    padding: 10px 14px;
    background: rgba(14, 18, 32, 0.55);
    border: 1px solid rgba(94, 234, 212, 0.25);
    border-radius: 6px;
    max-width: 360px;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 150ms ease,
      background 150ms ease,
      transform 150ms ease;
  }
  .opening-fleet-card:hover,
  .opening-fleet-card:focus-visible {
    border-color: rgba(94, 234, 212, 0.65);
    background: rgba(20, 26, 50, 0.65);
    outline: none;
    transform: translateY(-1px);
  }
  .opening-fleet-card.hero {
    max-width: 460px;
    border-color: rgba(255, 200, 80, 0.5);
  }
  .opening-fleet-card.hero:hover,
  .opening-fleet-card.hero:focus-visible {
    border-color: rgba(255, 200, 80, 0.9);
  }
  .opening-fleet-hero {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .opening-fleet-card.hero .opening-fleet-hero {
    width: 110px;
    height: 110px;
  }
  .opening-fleet-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    min-width: 0;
    flex: 1;
  }
  .opening-fleet-card .opening-fleet-role {
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(94, 234, 212, 0.75);
  }
  .opening-fleet-card.hero .opening-fleet-role {
    color: rgba(255, 200, 80, 0.85);
  }
  .opening-fleet-name {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.96);
    text-transform: uppercase;
  }
  .opening-fleet-card.hero .opening-fleet-name {
    font-size: 17px;
    letter-spacing: 3px;
  }
  .opening-fleet-tagline {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.78);
  }
  .opening-fleet-bio {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.82);
    /* Multi-line clamp for long bios — keep card compact */
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* W3.6 scrubber-jump cut overlay. Same z as the finale-black but
     no transition — the JS drives the opacity each frame directly,
     and we want the fade timing to be exactly the JS-controlled
     (2 * CINEMATIC_TIMINGS.CUT_FADE_RAMP_MS), not lerped by CSS. */
  .cut-black {
    position: fixed;
    inset: 0;
    z-index: 250;
    background: #000;
    pointer-events: none;
  }

  /* W3.5 — cinematic chrome suppression. Fades the HUD stack,
     scrubber, FD banner row, CAPCOM panel to invisible during the
     peak hold, afterglow, and finale beats. 600 ms ease-out so the
     fade is gentle (matches the held composition pacing) — the
     chrome dissolving INTO the shot, not snapping out. Restored at
     beat-end with the same 600 ms ease-in. Pointer-events also
     disabled so the user can't accidentally click hidden chrome. */
  .cinematic-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transition:
      opacity 600ms ease-out,
      transform 600ms ease-out !important;
  }
  /* When NOT hidden, the same elements get a matching ease-in fade
     so the transitions on/off are symmetric. The hud-stack,
     scrubber, and bottom-strips each declare their own existing
     transition; only override the timing for the cinematic toggle.
     Applied via :not selector so non-cinematic state restores cleanly. */
  .hud-stack:not(.cinematic-hidden),
  .scrubber:not(.cinematic-hidden),
  .capcom-panel:not(.cinematic-hidden),
  .fly-bottom-strips:not(.cinematic-hidden) {
    transition:
      opacity 600ms ease-in,
      transform 600ms ease-in;
  }

  .hud-stack {
    /* #342 Phase 30 — mobile base: bottom:auto so the stack only
       claims the height of its children rather than stretching to
       the scrubber. Restored to bottom:80 (full-height column) at
       @min-width: 768. */
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    bottom: auto;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    /* Stack stretches the full viewport height between nav and scrubber;
       individual .hud children re-enable pointer events. */
  }
  /* #342 Phase 30 — mobile base: hide the secondary HUD panels by
     default so the canvas breathes. Phase 25's .hud-collapse toggle
     lets users re-surface them on demand via the .hud-hidden class.
     These panels are restored at @min-width: 768 (desktop). */
  .hud-navigation,
  .hud-systems,
  .hud-flight-params {
    display: none;
  }
  /* Phase 25 (#342) cluster-hide. When the user collapses the HUD on a
     touch device, hide every chrome cluster so the actual 3D / 2D scene
     is unobstructed. Scrubber + settings gear + hud-collapse stay
     visible. This rule is mobile-only in effect because the .hud-hidden
     class is only set under matchMedia('(hover: none)') — there's no
     desktop affordance to toggle it. */
  .fly.hud-hidden .hud-stack,
  .fly.hud-hidden .capcom-panel,
  .fly.hud-hidden .fly-toggle-row,
  .fly.hud-hidden .fly-bottom-strips {
    display: none;
  }
  .hud {
    pointer-events: auto;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    min-width: 180px;
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  /* Systems HUD now stacks flush right after flight-params instead of
     being pushed to the bottom — the previous `margin-top: auto` left
     a tall empty gap in the middle of the left rail. */
  .hud-systems {
    margin-top: 0;
  }
  .hud-demo-hint {
    margin: 4px 0 6px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 11px;
    color: rgba(255, 200, 80, 0.85);
    line-height: 1.4;
  }
  .hud-demo-cta {
    /* Stretch to fill the HUD column so both CTAs share an identical
       width — was align-self:flex-start which sized each button to its
       content and made "Plan a real mission →" wider than "Replay…"
       (and pushed the arrow on the longer label onto a second line on
       narrow viewports). text-align:center + white-space:nowrap keep
       the arrow tight against the label inside the equal-width box. */
    align-self: stretch;
    padding: 6px 10px;
    margin-bottom: 4px;
    background: rgba(68, 102, 255, 0.18);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #fff;
    text-decoration: none;
    text-align: center;
    white-space: nowrap;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .hud-demo-cta:hover,
  .hud-demo-cta:focus-visible {
    background: rgba(68, 102, 255, 0.32);
    border-color: #4466ff;
    outline: none;
  }
  .hud-demo-cta-secondary {
    background: rgba(78, 205, 196, 0.14);
    border-color: rgba(78, 205, 196, 0.5);
  }
  .hud-demo-cta-secondary:hover,
  .hud-demo-cta-secondary:focus-visible {
    background: rgba(78, 205, 196, 0.28);
    border-color: #4ecdc4;
  }

  .hud-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 3px;
    color: #fff;
    margin-bottom: 2px;
  }
  .hud-phase {
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  /* Button variant — reset native button chrome so .phase-* color
     classes paint the same look as the <span> variant. */
  .hud-phase-button {
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-transform: inherit;
  }
  .hud-phase-button:hover,
  .hud-phase-button:focus-visible {
    filter: brightness(1.25);
    outline: none;
  }
  .phase-pre-launch {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .phase-outbound {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.5);
  }
  .phase-return {
    color: #9966ff;
    border-color: rgba(153, 102, 255, 0.5);
  }
  .phase-arrived {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }

  /* hud-row gets a long val (e.g. "Sputnik 8K71PS (R-7 Semyorka
     derivative)") that overflows the .hud's 220 px width and, because
     .hud is position:fixed, the overflow extends past the viewport
     and triggers a horizontal scrollbar on the page (2026-06-19 user
     report: "when we have launcher and vehicle a bit too narrow so at
     bottom horizontal bar appears, we don't want that").
     Fix: allow the val to wrap onto its own line when the row's flex
     constraints can't accommodate the natural width, and break very
     long single tokens at any character. The typical short-value
     layout (one-line "MARS · 2011") is unchanged. */
  .hud-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .hud-key {
    color: rgba(255, 255, 255, 0.35);
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .hud-val {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
    min-width: 0;
    flex: 1 1 auto;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .hud-val.dim {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
  }
  .hud-val.teal {
    color: #4ecdc4;
  }
  /* Dim continuation inside a value cell (e.g. light-minute alongside Mkm). */
  .hud-val-sub {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
  }

  .dv-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
    margin: 4px 0 6px;
  }
  .dv-fill {
    height: 100%;
    background: linear-gradient(to right, #4466ff, #4466ff88);
  }

  .scrubber {
    position: fixed;
    bottom: 14px;
    left: 16px;
    right: 16px;
    /* Above the global .site-footer (z-index 35): the footer strip is
       fixed at the bottom with pointer-events:auto links, and on narrow
       mobile viewports its wide form (Gallery|Credits|…|ABOUT) overlaps
       this transport bar and intercepts taps on the play / speed
       controls. The interactive scrubber must out-stack the decorative
       footer. */
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
  }

  /* The HUD-collapse toggle itself — mobile-only floating button at
     top-left, just above the HUD area. Sits at z-index 36 so it's
     above the panels (35) but below modal overlays (100).
     #342 Phase 30 — mobile-first: visible by default (mobile is the
     base), hidden at @min-width: 768 (desktop never sees the
     button). */
  .hud-collapse {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 36;
    width: 36px;
    height: 36px;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .hud-collapse:hover,
  .hud-collapse:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }

  /* ─── ≥ 768 px — restore the desktop HUD layout ────────────────── */
  @media (min-width: 768px) {
    .hud-navigation,
    .hud-systems,
    .hud-flight-params {
      display: block;
    }
    .hud-stack {
      bottom: 80px;
    }
    .hud-collapse {
      display: none;
    }
    /* Wider rail on desktop so long button labels (PROBE TRAJECTORY,
       FLIGHT PARAMS, plus the longer i18n strings — German hits this
       hardest) sit on one line instead of wrapping and making the
       panel look ragged. Mobile keeps the 220px base because the
       three secondary panels are hidden there anyway (display:none
       above), and the always-visible identity HUD has short labels. */
    .hud {
      min-width: 240px;
      width: 260px;
    }
  }

  /* Settings button — top-right gear, mirrored layout from
     .hud-collapse. Always visible on desktop + mobile so users on any
     device can pick a quality tier. */
  /* Settings button + panel CSS moved to
   * $lib/components/QualitySettingsModal.svelte. The perf-toast below
   * stays here — /fly-specific, driven by attachFrameMonitor's
   * onStruggle callback. */

  /* Runtime perf toast — bottom-right floating card. Same visual
     vocabulary as the settings panel so it reads as native chrome. */
  .perf-toast {
    position: fixed;
    bottom: 20px;
    right: 16px;
    z-index: 38;
    max-width: 280px;
    background: rgba(10, 14, 28, 0.96);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    padding: 10px 12px;
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
  }
  .perf-toast-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    color: #ffc850;
    margin-bottom: 6px;
  }
  .perf-toast-body {
    line-height: 1.4;
    margin-bottom: 10px;
  }
  .perf-toast-tier {
    color: #4ecdc4;
    text-transform: uppercase;
  }
  .perf-toast-actions {
    display: flex;
    gap: 8px;
  }
  .perf-toast-apply,
  .perf-toast-dismiss {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(78, 205, 196, 0.5);
    color: rgba(220, 230, 245, 0.95);
    padding: 5px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
  }
  .perf-toast-apply {
    background: rgba(78, 205, 196, 0.2);
    color: #4ecdc4;
  }
  .perf-toast-apply:hover {
    background: rgba(78, 205, 196, 0.35);
  }
  .perf-toast-dismiss:hover {
    border-color: rgba(220, 230, 245, 0.7);
  }

  /* FLIGHT PARAMS HUD (v0.1.7 / ADR-027 / UXS-003 §Extension) */
  .hud-flight-params {
    margin-top: 6px;
  }
  .hud-section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    color: rgba(220, 230, 255, 0.95);
    margin-bottom: 6px;
  }
  .flight-caveat-banner {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1.5px;
    color: #ffc850;
    background: rgba(255, 200, 80, 0.18);
    border: 1px solid #ffc850;
    border-radius: 3px;
    padding: 5px 7px;
    margin-bottom: 7px;
    line-height: 1.4;
  }
  .hud-trajectory-caveat {
    margin: 8px 0 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 12px;
    font-style: italic;
    line-height: 1.35;
    color: rgba(255, 220, 180, 0.95);
    border-top: 1px solid rgba(255, 200, 80, 0.25);
    padding-top: 8px;
  }
  .accent-c3 {
    color: #4b9cd3;
  }
  .accent-vinf {
    color: #4ecdc4;
  }
  .accent-dv {
    color: #ffc850;
  }
  @media (min-width: 768px) {
    /* Scrubber spans full width below the stack on desktop, since the
       right side no longer carries a fixed-position systems HUD. */
    .scrubber {
      right: 16px;
    }
  }
  .play-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
  }
  .play-btn:hover,
  .play-btn:focus-visible {
    border-color: #4466ff;
    outline: none;
  }
  .scrub-track-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    height: 36px;
  }
  /* Native input owns drag/click interactions but renders transparent
     so the styled .scrub-visual underneath shows through. Keeps full
     a11y + touch handling without fighting browser-default range styling. */
  .scrub {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    z-index: 3;
  }
  .scrub::-webkit-slider-runnable-track {
    background: transparent;
    height: 6px;
  }
  .scrub::-moz-range-track {
    background: transparent;
    height: 6px;
  }
  .scrub::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #2dd4a8;
    box-shadow: 0 0 8px rgba(45, 212, 168, 0.85);
    cursor: pointer;
    margin-top: -3px;
  }
  .scrub::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #2dd4a8;
    box-shadow: 0 0 8px rgba(45, 212, 168, 0.85);
    cursor: pointer;
  }
  .scrub:focus-visible {
    outline: none;
  }
  /* Styled track + fill, layered behind the input. Pointer events
     disabled so the native input still receives clicks/drags. */
  .scrub-visual {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 6px;
    margin-top: -3px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
  }
  .scrub-fill {
    height: 100%;
    background: linear-gradient(to right, #2dd4a8, #5eead4);
    border-radius: 3px;
    transition: width 90ms linear;
  }
  /* Milestone tick track sits OVER the styled track so dots align
     with the chapter MET positions. Each marker is a small filled
     circle on the bar; hover lifts a tooltip card above with the
     full label + MET. */
  .milestone-track {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 0;
    pointer-events: none;
    /* Above .scrub (z-3) so the tick buttons receive hover / click
       events. The track itself has `pointer-events: none`, so clicks
       on empty bar pass through to the native range input below —
       only the .milestone-tick-button children with `pointer-events:
       auto` catch events. Pre-2026-06 this was z-2 (below .scrub),
       which is why tooltips never appeared on hover. */
    z-index: 4;
  }
  /* FD stage track — sits ABOVE the milestone track so the gold
     stage marks read in front of the teal milestone marks when
     they happen to project at the same x. Same pointer-events
     model: track none, children auto. */
  .fd-stage-track {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 0;
    pointer-events: none;
    z-index: 5;
  }
  .fd-stage-tick-button {
    position: absolute;
    top: -5px;
    width: 10px;
    height: 10px;
    margin-left: -5px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fd-stage-tick-button::before {
    content: '';
    width: 5px;
    height: 5px;
    background: #ffc850;
    transform: rotate(45deg);
    box-shadow: 0 0 4px rgba(255, 200, 80, 0.85);
    transition:
      transform 120ms,
      box-shadow 120ms,
      background 120ms;
  }
  .fd-stage-tick-button.past::before {
    background: rgba(255, 200, 80, 0.45);
    box-shadow: 0 0 2px rgba(255, 200, 80, 0.3);
  }
  .fd-stage-tick-button:hover::before,
  .fd-stage-tick-button:focus-visible::before {
    transform: rotate(45deg) scale(1.5);
    background: #ffd766;
    box-shadow:
      0 0 10px rgba(255, 215, 102, 0.95),
      0 0 2px rgba(255, 255, 255, 0.7);
  }
  .fd-stage-tick-button:focus-visible {
    outline: none;
  }
  .fd-stage-tooltip {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 5px 9px;
    background: rgba(15, 18, 30, 0.96);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 3px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms;
    z-index: 5;
    backdrop-filter: blur(4px);
  }
  .fd-stage-tick-button:hover .fd-stage-tooltip,
  .fd-stage-tick-button:focus-visible .fd-stage-tooltip {
    opacity: 1;
  }
  .fd-stage-tooltip-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #ffc850;
    text-transform: uppercase;
  }
  .milestone-tick-button {
    position: absolute;
    top: -7px;
    width: 14px;
    height: 14px;
    margin-left: -7px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .milestone-tick-button::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ffc850;
    box-shadow: 0 0 5px rgba(255, 200, 80, 0.85);
    transition:
      transform 120ms,
      box-shadow 120ms,
      background 120ms;
  }
  .milestone-tick-button.past::before {
    background: rgba(255, 200, 80, 0.55);
    box-shadow: 0 0 3px rgba(255, 200, 80, 0.4);
  }
  .milestone-tick-button:hover::before,
  .milestone-tick-button:focus-visible::before {
    transform: scale(1.45);
    background: #ffd766;
    box-shadow:
      0 0 10px rgba(255, 215, 102, 0.95),
      0 0 2px rgba(255, 255, 255, 0.7);
  }
  .milestone-tick-button:focus-visible {
    outline: none;
  }
  .milestone-tooltip {
    position: absolute;
    bottom: 22px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 12px;
    background: rgba(15, 18, 30, 0.96);
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    /* Widened from white-space:nowrap to fixed max-width so the new
       description line can wrap naturally (#358 micro-enhancement). */
    width: max-content;
    max-width: 280px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    backdrop-filter: blur(4px);
    text-align: left;
  }
  .milestone-tick-button:hover .milestone-tooltip,
  .milestone-tick-button:focus-visible .milestone-tooltip {
    opacity: 1;
  }
  .milestone-tooltip-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #fff;
    text-transform: uppercase;
  }
  .milestone-tooltip-met {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 200, 80, 0.85);
    letter-spacing: 0.05em;
  }
  .milestone-tooltip-desc {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.78);
    margin-top: 2px;
    white-space: normal;
  }
  .speed-group {
    display: flex;
    gap: 4px;
  }
  .speed-pill {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    font-weight: 700;
    cursor: pointer;
  }
  .speed-pill.active {
    background: rgba(68, 102, 255, 0.2);
    border-color: rgba(68, 102, 255, 0.5);
    color: #fff;
  }

  /* Top-right toggle clusters. Both rows live in the top-right corner
     so every toggle reads as one group; the gold lens-gated cluster
     (FD/LYR/CON) sits to the LEFT of the blue always-visible cluster
     (HUD/CAP/2D), separated by a small gap. On narrow viewports they
     wrap onto a second line rather than overflowing. */
  .fly-toggle-row {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    z-index: 35;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }
  /* #342 Phase 30 — mobile-first toggle-row anchors. On narrow
     viewports both clusters share the right edge and stack vertically
     below the settings gear. Restored to the side-by-side desktop
     layout (gold-left of blue-right of gear) at @min-width: 601.
     Desktop math: blue cluster ≈ 3×44 + 2×6 = 144 px, settings gear
     is 36 px + 16 px right gutter + 12 px gap = 64 px → blue starts
     at right:64. Gold sits at right:64 + 144 + 10 = 218 px. */
  .fly-toggle-row-right {
    right: 16px;
    top: calc(var(--nav-height) + 12px + 50px);
  }
  .fly-toggle-row-left {
    right: 16px;
    top: calc(var(--nav-height) + 12px + 100px);
  }
  /* ─── ≥ 601 px — restore horizontal toggle-row layout ──────────── */
  @media (min-width: 601px) {
    .fly-toggle-row-right {
      right: 64px;
      top: calc(var(--nav-height) + 12px);
      max-width: calc(50vw - 60px);
    }
    .fly-toggle-row-left {
      right: 218px;
      top: calc(var(--nav-height) + 12px);
      max-width: calc(50vw - 12px);
    }
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    white-space: nowrap;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  /* Dimmed appearance when a panel toggle is OFF — the button still
     reads as clickable, but its panel is hidden. */
  .toggle[aria-pressed='false'] {
    color: rgba(221, 228, 255, 0.5);
    border-color: rgba(68, 102, 255, 0.2);
  }
  /* Gold-themed variant for the lens-gated cluster on the left. Reuses
     the same gold accent as ScienceLayersPanel + FlightDirectorBanner
     so the user reads the cluster as part of the lens chrome. */
  .toggle.toggle-lens {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.55);
  }
  .toggle.toggle-lens:hover,
  .toggle.toggle-lens:focus-visible {
    border-color: #ffc850;
    background: rgba(48, 38, 16, 0.95);
  }
  .toggle.toggle-lens[aria-pressed='false'] {
    color: rgba(255, 200, 80, 0.5);
    border-color: rgba(255, 200, 80, 0.22);
  }
  /* User-dismissed panels use display:none so they release their
     bottom/edge real-estate to the canvas. */
  .hud-stack.hidden {
    display: none;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    outline: none;
  }

  .capcom-panel {
    /* #342 Phase 30 — mobile base (bottom sheet edge-to-edge above
       the scrubber). Desktop layout (right-pinned 320 px column)
       layers in at @min-width: 768. */
    position: fixed;
    bottom: 70px;
    left: 16px;
    right: 16px;
    max-height: 50vh;
    z-index: 32;
    background: rgba(8, 10, 22, 0.96);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 4px;
    backdrop-filter: blur(8px);
    padding: 14px 16px;
    /* Flex column — header is fixed-height, events fill the rest and
       scroll independently so the most-recent items stay readable. */
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    font-family: 'Space Mono', monospace;
    color: rgba(255, 255, 255, 0.85);
  }
  .capcom-header {
    flex-shrink: 0;
  }
  /* ─── ≥ 768 px — capcom-panel becomes right-pinned 320 px column ─
     Mobile-first inversion: phone bottom-sheet is the base; desktop
     restores the historical "tall right column" layout. */
  @media (min-width: 768px) {
    .capcom-panel {
      top: calc(var(--nav-height) + 64px);
      bottom: 86px;
      left: auto;
      right: 16px;
      width: 320px;
      max-height: none;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }
  .capcom-events {
    flex: 1 1 auto;
    overflow-y: auto;
    /* Counter-act the .capcom-section's bottom margin — we want the
       events list to butt up against the panel bottom. */
    margin-bottom: 0;
  }

  .capcom-section {
    margin-bottom: 14px;
  }
  .capcom-section h3 {
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.6);
    margin: 0 0 6px;
  }

  .anomaly {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 3px;
    border: 1px solid;
  }
  .anomaly-nominal {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.06);
  }
  .anomaly-caution {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.5);
    background: rgba(255, 200, 80, 0.08);
  }
  .anomaly-critical {
    color: #c1440e;
    border-color: rgba(193, 68, 14, 0.6);
    background: rgba(193, 68, 14, 0.12);
  }
  .anomaly-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
  .anomaly-label {
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .anomaly-detail {
    margin-left: auto;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  .comm-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 11px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .comm-key {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .comm-val {
    color: #fff;
    font-weight: 700;
  }

  .capcom-events ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .event {
    padding: 6px 10px;
    border-left: 2px solid transparent;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0 3px 3px 0;
  }
  .event-nominal {
    border-left-color: rgba(78, 205, 196, 0.5);
  }
  .event-info {
    border-left-color: rgba(68, 102, 255, 0.5);
  }
  .event-warning {
    border-left-color: #ffc850;
    background: rgba(255, 200, 80, 0.05);
  }
  .event-time {
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.35);
    margin-right: 8px;
  }
  .event-label {
    font-size: 11px;
    letter-spacing: 1px;
    color: #fff;
    font-weight: 700;
  }
  .event-note {
    margin: 4px 0 0;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 11px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.6);
  }
  .empty {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
</style>
