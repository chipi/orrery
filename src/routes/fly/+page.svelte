<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import {
    earthPos,
    marsPos,
    destinationPos,
    spacecraftPos,
    spacecraftHeading,
    type MissionTimeline,
    type Vec2,
  } from '$lib/mission-arc';
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
  import type { FlyUpdaters } from '$lib/three/fly-updaters';
  import {
    computeMissionApply,
    computeScenarioApply,
    computePlanApply,
    type LoadedMission,
    type MissionApplyDefaults,
    type TrajectoryOverride,
  } from '$lib/fly-mission-apply';
  import type { TrajectoryWaypoint } from '$lib/trajectory-spline';
  import {
    DESTINATIONS,
    R_EARTH_AU,
    R_MARS_AU,
    type DestinationId,
  } from '$lib/lambert-grid.constants';
  import { getMission, getMissionIndex, getScenario } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { missionDestToDataFolder } from '$lib/mission-dest';
  import {
    auToMkm,
    distanceBetween,
    heliocentricSpeed as flyHeliocentricSpeed,
    signalDelayMin as flySignalDelayMin,
  } from '$lib/fly-physics';
  import {
    A_MOON_KM,
    R_EARTH_KM,
    R_MOON_KM,
    moonEciPos,
    type CislunarTrajectory,
    type Vec3Km,
  } from '$lib/cislunar-geometry';
  import {
    phaseMarkerKmPositions,
    currentPhaseFor,
    primaryScienceRefFor,
    type PhaseMarker,
    type ScienceRef,
  } from '$lib/cislunar-events';
  import {
    eciKmToScreenPx,
    eciKmToCanvas2dPx,
    helioAuToScreenPx,
    helioAuToCanvas2dPx,
    type ScreenPoint,
    type MinimalProjector,
  } from '$lib/cislunar-screen-projection';
  import { type InterplanetaryTrajectory } from '$lib/interplanetary-geometry';
  import {
    phaseMarkerAuPositions,
    currentInterplanetaryPhaseFor,
    primaryInterplanetaryPhaseScienceRef,
    type InterplanetaryPhaseMarker,
  } from '$lib/interplanetary-events';
  import { markerStateFor, type RevealResult } from '$lib/cislunar-marker-reveal';
  import PhaseMarkerLabel from '$lib/components/PhaseMarkerLabel.svelte';
  import FdPhaseMarkerLabel from '$lib/components/FdPhaseMarkerLabel.svelte';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { AU_TO_KM, MOON_VISUAL_DISTANCE } from '$lib/fly-physics-constants';
  import { onReducedMotionChange, prefersReducedMotion } from '$lib/reduced-motion';
  import type { FlightTimelineEvent, Mission, MissionEvent } from '$types/mission';
  import type { LocalizedScenario } from '$types/scenario';
  import * as m from '$lib/paraglide/messages';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
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
  import { track } from '$lib/analytics';

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

  // ─── HUD-collapse toggle (mobile) ────────────────────────────────
  // On narrow viewports the hud-stack (top-left mission info) and
  // capcom-panel (right/bottom Houston event log) cover most of the
  // scene. A single toggle hides both so the user can see the actual
  // 3D trajectory; tap again to bring them back.
  let hudHidden = $state(false);
  function toggleHud() {
    hudHidden = !hudHidden;
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
    // ring is its visual anchor); CRUISE/APPROACH/ARRIVAL diamonds
    // sit at each stage's START so the diamond appears at the exact
    // point on the arc where the FD banner switches to that phase.
    {
      id: 'injection',
      leg: 'out',
      tickArc: 0.0,
      arcThreshold: 0.0,
      label: () => m.fly_fd_marker_injection(),
    },
    {
      id: 'cruise',
      leg: 'out',
      tickArc: 0.03,
      arcThreshold: 0.03,
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
  function jumpToMet(metDays: number) {
    if (!Number.isFinite(metDays) || metDays < 0) return;
    simDay = mission.timeline.dep_day + metDays;
    if (isPlaying) isPlaying = false;
    camSnapUntil = performance.now() + 700;
  }
  function onScrub(event: Event) {
    const t = parseFloat((event.target as HTMLInputElement).value);
    simDay = arcTimeline.dep_day + t * arcTotalDays;
    camSnapUntil = performance.now() + 300;
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
    launchDwellUntil = performance.now() + 3500;
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
    launchDwellUntil = performance.now() + 3500;
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
    launchDwellUntil = performance.now() + 3500;
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
  $effect(() => {
    void loadMissionFromUrl($page.url);
  });

  onMount(() => {
    if (!container || !canvas2d) return;

    // ──────────────────────────────────────────────────────────────
    // 3D — heliocentric Three.js scene. Units = AU × SCALE_3D.
    // Static scene setup (scene, camera, renderer, lights, Sun, star
    // field, Earth + destination meshes + orbit rings, destination-
    // swap method) lives in $lib/three/fly-helio-scene (W9 wave A).
    // Mission-specific layers (tubes, dep/arr markers, label sprites,
    // historical-Mars arcs, science overlays) stay in this component
    // for now — extracted in wave B as the per-frame updater factory.
    // ──────────────────────────────────────────────────────────────
    const helioHandles = buildHelioScene({
      container,
      aspect: container.clientWidth / container.clientHeight,
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
            float a = (vT < uProgress) ? uBrightOpacity : uDimOpacity;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
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
      profile: import('$lib/cislunar-geometry').CislunarProfile | undefined,
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
            float a = (vT < uProgress) ? uBrightOpacity : uDimOpacity;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
      });
    outLine = new THREE.Mesh(
      buildTubeGeometry(outPts, 0.6),
      buildTubeMaterial(0x4488ff, 0.95, 0.22),
    );
    retLine = new THREE.Mesh(buildTubeGeometry(retPts, 0.5), buildTubeMaterial(0x9966ff, 0.9, 0.2));
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
      if (outPts.length < 3) return;
      // Heliocentric trips (Mars / outer planets): min/max distance
      // measured from the Sun at origin. Cislunar trips: both endpoints
      // are at ~1 AU from the Sun so Sun-relative apsides collapse to
      // a single point. Measure Earth-relative instead — perigee =
      // closest approach to Earth, apogee = farthest from Earth — which
      // is the cislunar physicist's apsides anyway.
      const centreX = isMoonMission ? earthPos(simDay).x : 0;
      const centreZ = isMoonMission ? earthPos(simDay).z : 0;
      let minR2 = Infinity;
      let maxR2 = -Infinity;
      let minIdx = 0;
      let maxIdx = 0;
      for (let i = 0; i < outPts.length; i++) {
        const p = outPts[i];
        const dx = p.x - centreX;
        const dz = p.z - centreZ;
        const r2 = dx * dx + dz * dz;
        if (r2 < minR2) {
          minR2 = r2;
          minIdx = i;
        }
        if (r2 > maxR2) {
          maxR2 = r2;
          maxIdx = i;
        }
      }
      const peri = outPts[minIdx];
      const apo = outPts[maxIdx];
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
    // Neptune. Mirrors /explore's satellites display.
    const stopMoonsLayer = onLayerChange('moons', (on) => {
      helioHandles.setMoonsVisible(on);
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
            shader.uniforms.rimColor = { value: new THREE.Color(0xffd9a3) };
            shader.uniforms.rimStrength = { value: 0.85 };
            shader.uniforms.rimPower = { value: 2.5 };
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
    const HELIO_CLOSEUP_R = 40;
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
    const FLYBY_APPROACH_DAYS = 20;
    const FLYBY_DEPART_DAYS = 30;
    /** Peak window — the closest-approach beat. Inside this window
     *  sim-speed gets dilated so the moment stretches in screen time. */
    const FLYBY_PEAK_DAYS = 4;
    /** Camera distance multiplier vs flyby-body radius for the iconic
     *  closeup. body.size × this = camR. Pulled back to 5.0 — the
     *  earlier 2.4 had the camera so close to the body that the
     *  ship couldn't be pushed toward the camera without its long-
     *  axis booms crossing the near-clip plane (camera ended up
     *  INSIDE the spacecraft model and rendered as clipped slivers).
     *  At 5.0 the planet still fills ~40 % of frame width (40 % wide
     *  matches the proportions in the Pioneer-Jupiter / Galileo-
     *  Jupiter reference shots), and there's actual room for the
     *  ship to sit in foreground space without intersecting the
     *  camera position. */
    const FLYBY_BODY_R_MULTIPLIER = 5.0;
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
      saturn: { spriteScale: 2.4, modelScale: 2.4, toCameraR: 0.7 },
      uranus: { spriteScale: 1.7, modelScale: 1.3, toCameraR: 0.5 },
      neptune: { spriteScale: 1.7, modelScale: 1.3, toCameraR: 0.5 },
    };

    const PLANET_SIZES: Record<string, number> = {
      mercury: 1.0,
      venus: 2.5,
      earth: 2.6,
      mars: 1.9,
      jupiter: 5.5,
      saturn: 4.8,
      uranus: 3.4,
      neptune: 3.4,
    };

    /** Parse the flyby body from the event's human-readable label
     *  ("Venus #1 — gravity assist" → 'venus'). The trajectory MODEL
     *  in /fly is a simplified Keplerian approximation that doesn't
     *  faithfully pass through each planet's heliocentric position
     *  at the actual flyby moment — debug check at Cassini MET 894
     *  showed scPos = (1.28, 1.74) AU = 2.16 AU from Sun, far from
     *  Earth's actual 1.0 AU. Parsing the label is the reliable
     *  signal because the data layer carries the mission's narrative
     *  truth even when the math layer doesn't. */
    function findFlybyPlanetFromLabel(
      label: string | undefined,
    ): { id: import('$lib/lambert-grid.constants').DestinationId; size: number } | null {
      if (!label) return null;
      const lower = label.toLowerCase();
      const planets: Array<import('$lib/lambert-grid.constants').DestinationId> = [
        'mercury',
        'venus',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
      ];
      for (const p of planets) {
        if (lower.includes(p)) return { id: p, size: PLANET_SIZES[p] ?? 2.0 };
      }
      if (lower.includes('earth')) {
        return {
          id: 'earth' as import('$lib/lambert-grid.constants').DestinationId,
          size: PLANET_SIZES.earth,
        };
      }
      return null;
    }

    /** Fallback for missions without labeled flyby events — find the
     *  planet the spacecraft is heliocentric-closest to. Threshold
     *  widened to 3 AU so outer-system Voyager-style flybys still
     *  resolve. */
    function findClosestPlanetToShip(scPos: {
      x: number;
      z: number;
    }): { id: import('$lib/lambert-grid.constants').DestinationId; size: number } | null {
      const CANDIDATES: import('$lib/lambert-grid.constants').DestinationId[] = [
        'mercury',
        'venus',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
      ];
      let closest: import('$lib/lambert-grid.constants').DestinationId | null = null;
      let closestSize = 1;
      let minDist = 3.0;
      const ePos = earthPos(simDay);
      const dEarth = Math.hypot(scPos.x - ePos.x, scPos.z - ePos.z);
      if (dEarth < minDist) {
        minDist = dEarth;
        closest = 'earth' as import('$lib/lambert-grid.constants').DestinationId;
        closestSize = PLANET_SIZES.earth;
      }
      for (const id of CANDIDATES) {
        const p = destinationPos(simDay, id);
        const d = Math.hypot(scPos.x - p.x, scPos.z - p.z);
        if (d < minDist) {
          minDist = d;
          closest = id;
          closestSize = PLANET_SIZES[id] ?? 2.0;
        }
      }
      return closest ? { id: closest, size: closestSize } : null;
    }
    function updateHelioAutoZoomTargets(): void {
      if (isMoonMission) return; // cislunar handles its own auto-zoom
      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      const wide = cameraDistanceFor(activeDestination, false);
      const ePos = earthPos(simDay);
      const earthScene = new THREE.Vector3(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      const dPosLive = destinationPos(simDay, activeDestination);
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
      let activeFlybyMet: number | null = null;
      for (const e of flybyEvents) {
        // Treat both pure flybys AND the orbital-insertion / EDL event
        // as cinema triggers — Saturn-OI for Cassini, Mars EDL for
        // Curiosity etc. should compose with the same ship-as-hero
        // tuning as a flyby (the only difference is the trajectory
        // ends there instead of continuing).
        if ((e.type !== 'flyby' && e.type !== 'edl_or_oi') || e.met_days == null) continue;
        const flybySimDay = arcTimeline.dep_day + e.met_days;
        const delta = simDay - flybySimDay; // negative = approaching
        if (delta >= -FLYBY_APPROACH_DAYS && delta <= FLYBY_DEPART_DAYS) {
          activeFlybyMet = e.met_days;
          break;
        }
      }

      let sub: string;
      let centerX: number;
      let centerZ: number;
      let targetR: number;
      let targetP = HELIO_CRUISE_P;

      if (activeFlybyMet !== null) {
        // Flyby cinema — iconic-photo composition. Primary signal:
        // parse the flyby body from the event's label (Cassini's
        // "Venus #1 — gravity assist" → Venus). Fallback for
        // unlabeled missions: closest planet to spacecraft.
        const activeEvt = flybyEvents.find((e) => e.met_days === activeFlybyMet);
        const flyby = findFlybyPlanetFromLabel(activeEvt?.label) ?? findClosestPlanetToShip(sc.pos);
        // Debug exposure for the chrome-devtools-mcp verification path.
        (window as unknown as Record<string, unknown>).__flyDebug = {
          activeFlybyMet,
          flybyId: flyby?.id ?? null,
          flybySize: flyby?.size ?? null,
          scPos: { x: sc.pos.x, z: sc.pos.z },
          subPhase: lastHelioSubPhase,
        };
        if (flyby) {
          const bodyPos =
            flyby.id === ('earth' as typeof flyby.id)
              ? earthPos(simDay)
              : destinationPos(simDay, flyby.id);
          const bodyScene = new THREE.Vector3(bodyPos.x * SCALE_3D, 0, bodyPos.z * SCALE_3D);
          sub = `flyby-${activeFlybyMet}-${flyby.id}`;
          // Limb-grazing composition — bias the camera target 65 % toward
          // the spacecraft position (was 35 %). This pushes the planet
          // CENTRE off-frame so the planet LIMB arcs across the rule-of-
          // thirds line. The hero of the frame becomes the curving limb
          // + the spacecraft silhouetted against it, matching the
          // Cassini-Saturn / Juno-Jupiter / Pioneer-Jupiter compositions
          // where the body fills one half of the frame and curves out of
          // view rather than sitting whole in the centre. Shot-language
          // guide §P5 + T3 — "containment kills awe."
          centerX = bodyScene.x * 0.35 + scScene.x * 0.65;
          centerZ = bodyScene.z * 0.35 + scScene.z * 0.65;
          targetR = flyby.size * FLYBY_BODY_R_MULTIPLIER;
        } else {
          sub = `flyby-${activeFlybyMet}`;
          centerX = scScene.x;
          centerZ = scScene.z;
          targetR = HELIO_FLYBY_R_FALLBACK;
        }
        targetP = HELIO_APPROACH_P;
        if (sub !== lastHelioSubPhase) {
          lastHelioSubPhase = sub;
          helioAutoZoomActive = true;
        }
        helioAutoZoomTargetR = targetR;
        helioAutoZoomTargetCenter.set(centerX, 0, centerZ);
        helioAutoZoomTargetP = targetP;
        return;
      }
      if (sc.phase === 'pre-launch') {
        // Open framed close on Earth at the same zoom level as
        // Mars-arrival — symmetric "depart / arrive" beats so the
        // mission reads with a cinematic arc: close on Earth → slow
        // pull out to wide cruise → slow zoom in on Mars → flyby →
        // slow pull out → slow zoom in on Earth on return.
        sub = 'prelaunch';
        centerX = earthScene.x;
        centerZ = earthScene.z;
        targetR = HELIO_EARTH_CLOSEUP_R;
      } else if (sc.phase === 'arrived') {
        sub = 'arrived';
        // Round-trip missions end at Earth; one-way ends at destination.
        const endAtEarth = retPts.length > 0;
        centerX = endAtEarth ? earthScene.x : destScene.x;
        centerZ = endAtEarth ? earthScene.z : destScene.z;
        targetR = endAtEarth ? HELIO_EARTH_CLOSEUP_R : HELIO_CLOSEUP_R;
        targetP = HELIO_APPROACH_P;
      } else if (sc.phase === 'outbound') {
        const t = sc.progress * 2; // 0→1 across outbound
        if (t < 0.05) {
          // Depart — track the spacecraft (not Earth) at the closeup
          // zoom. Anchoring on Earth-at-dep made the camera read as
          // "following Earth" while the ship was already accelerating
          // away. Centering on the ship keeps the cinematic feel of
          // "watching the launch" while the camera actually moves
          // with the spacecraft.
          sub = 'depart';
          centerX = scScene.x;
          centerZ = scScene.z;
          targetR = HELIO_EARTH_CLOSEUP_R;
        } else if (t > 0.8) {
          sub = 'approach';
          centerX = destScene.x;
          centerZ = destScene.z;
          targetR = HELIO_CLOSEUP_R;
          targetP = HELIO_APPROACH_P;
        } else {
          // Tighter cruise — center biased toward the ship (70/30
          // ship vs Sun) and distance scaled to where the ship
          // actually is, so the spacecraft stays recognisable
          // instead of becoming a sub-pixel dot in a wide frame.
          // For outer-system missions the cap at wide × 0.65 keeps
          // the framing inside the destination orbit so the ship
          // doesn't fly OFF the edge during the long mid-cruise
          // span. Cinematic drift + zoom breathing layer on top
          // (see cruise-motion block in animate()).
          sub = 'cruise-out';
          const shipDistAu = Math.hypot(sc.pos.x, sc.pos.z);
          const tightR = Math.max(140, shipDistAu * SCALE_3D * 1.3 + 80);
          centerX = scScene.x * 0.7;
          centerZ = scScene.z * 0.7;
          targetR = Math.min(wide * 0.65, tightR);
        }
      } else {
        // return
        const t = (sc.progress - 0.5) * 2; // 0→1 across return
        if (t < 0.05) {
          // Depart-return — track the spacecraft as it leaves Mars,
          // not Mars itself. Anchoring on Mars made the ship exit
          // frame quickly as it accelerated away on the return arc
          // (Mars stays put, ship moves). Following the ship keeps
          // it centred while Mars drifts off naturally.
          sub = 'depart-return';
          centerX = scScene.x;
          centerZ = scScene.z;
          targetR = HELIO_CLOSEUP_R;
        } else if (t > 0.9) {
          // Approach-earth engages later (0.9 vs 0.8) so the camera
          // doesn't snap to Earth too early — the closer trigger
          // gives the final stretch of cruise more time to read
          // before the zoom-in begins.
          sub = 'approach-earth';
          centerX = earthScene.x;
          centerZ = earthScene.z;
          targetR = HELIO_EARTH_CLOSEUP_R;
          targetP = HELIO_APPROACH_P;
        } else {
          // Same ship-biased tight framing as cruise-out, applied to
          // the inbound leg so round-trip missions get matching shots.
          sub = 'cruise-back';
          const shipDistAu = Math.hypot(sc.pos.x, sc.pos.z);
          const tightR = Math.max(140, shipDistAu * SCALE_3D * 1.3 + 80);
          centerX = scScene.x * 0.7;
          centerZ = scScene.z * 0.7;
          targetR = Math.min(wide * 0.65, tightR);
        }
      }
      if (sub !== lastHelioSubPhase) {
        lastHelioSubPhase = sub;
        helioAutoZoomActive = true;
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
        if (helioAutoZoomActive) {
          // Scrubber jumps boost the lerp rate so a Jupiter → Earth
          // hop doesn't spend 6-8 seconds in the slow cinematic lerp.
          // camSnapUntil is set by jumpToMet (700 ms) and onScrub
          // (300 ms) — during those windows we converge at 8 × the
          // cruise rate. Outside the window the slow rate restores
          // for in-flight cinematic transitions.
          const inSnapWindow = performance.now() < camSnapUntil;
          const LERP = inSnapWindow ? 0.08 : 0.01;
          camR += (helioAutoZoomTargetR - camR) * LERP;
          camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * LERP;
          camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * LERP;
          camP += (helioAutoZoomTargetP - camP) * LERP;
          if (Math.abs(camR - helioAutoZoomTargetR) < 0.5) helioAutoZoomActive = false;
        } else {
          const TRACK = 0.006;
          camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * TRACK;
          camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * TRACK;
          camP += (helioAutoZoomTargetP - camP) * TRACK;
        }
      }
      camera.position.set(
        camTarget.x + camR * Math.sin(camP) * Math.sin(camT),
        camTarget.y + camR * Math.cos(camP),
        camTarget.z + camR * Math.sin(camP) * Math.cos(camT),
      );
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
    const LUNAR_PHASE_TYPES = new Set<string>([
      'lunar_orbit',
      'spiral_lunar',
      'descent',
      'ascent',
      'lunar_flyby',
    ]);
    // Earth-localised phases — camera zooms close to Earth so the
    // parking-orbit revs / spiral_earth burns / re-entry approach are
    // visible. Same auto-zoom pattern as the Moon close-up, just
    // pointed at the other end of the system.
    const EARTH_PHASE_TYPES = new Set<string>(['parking', 'spiral_earth', 'reentry']);
    let autoZoomTargetR = WIDE_DISTANCE;
    const autoZoomTargetCenter = new THREE.Vector3(0, 0, 0);
    let lastAutoZoomPhase: string | null = null;
    let autoZoomActive = false;

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
      let activePhase = cislunarTrajectory.phases[0];
      let phaseProgress = 0;
      for (const p of cislunarTrajectory.phases) {
        if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
          activePhase = p;
          const span = p.end_met_days - p.start_met_days;
          phaseProgress = span > 0 ? (metDays - p.start_met_days) / span : 0;
          break;
        }
      }
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
      const LUNAR_LOCAL_AZ = new Set([
        'lunar_orbit',
        'spiral_lunar',
        'lunar_flyby',
        'descent',
        'ascent',
      ]);
      const pts = activePhase.points;
      const lastIdx = pts.length - 1;
      const f = Math.max(0, Math.min(lastIdx, phaseProgress * lastIdx));
      const i = Math.min(lastIdx - 1, Math.max(0, Math.floor(f)));
      const frac = f - i;
      const pa = pts[i];
      const pb = pts[i + 1] ?? pa;
      let scX = pa.x + (pb.x - pa.x) * frac;
      let scY = pa.y + (pb.y - pa.y) * frac;
      let scZ = pa.z + (pb.z - pa.z) * frac;
      if (LUNAR_LOCAL_AZ.has(activePhase.type)) {
        const moonRef = moonEciPos(arcTimeline.flyby_day);
        scX += moonPos.x - moonRef.x;
        scY += moonPos.y - moonRef.y;
        scZ += moonPos.z - moonRef.z;
      }
      const distToMoonKm = Math.hypot(scX - moonPos.x, scY - moonPos.y, scZ - moonPos.z);
      // Earth SoI is ~924 000 km; Moon SoI ~66 100 km. Trigger lunar
      // closeup well outside Moon SoI so the zoom is underway by the
      // time the spacecraft actually crosses into Moon-dominated space.
      const MOON_PROXIMITY_KM = 80_000;
      const isNearMoon = distToMoonKm < MOON_PROXIMITY_KM;

      // Re-arm the auto-zoom on phase transitions OR on crossing the
      // Moon-proximity boundary — both deserve a fresh zoom. Mouse-wheel
      // during a sub-phase still wins (clears autoZoomActive).
      const subPhase = isNearMoon ? activePhase.type + '_near_moon' : activePhase.type;
      const phaseChanged = subPhase !== lastAutoZoomPhase;
      if (phaseChanged) {
        lastAutoZoomPhase = subPhase;
        autoZoomActive = true;
      }
      if (isNearMoon || LUNAR_PHASE_TYPES.has(activePhase.type)) {
        autoZoomTargetR = LUNAR_CLOSEUP_DISTANCE;
        autoZoomTargetCenter.set(moonInScene.x, 0, moonInScene.z);
      } else if (EARTH_PHASE_TYPES.has(activePhase.type)) {
        autoZoomTargetR = EARTH_CLOSEUP_DISTANCE;
        autoZoomTargetCenter.set(0, 0, 0);
      } else if (activePhase.type === 'tli_coast') {
        // Translunar coast — pan the wide-view target from Earth side
        // (start) toward Moon side (end) over phaseProgress 0→1. Gives
        // a sense of the spacecraft actually crossing the system.
        autoZoomTargetR = WIDE_DISTANCE;
        autoZoomTargetCenter.set(
          moonInScene.x * phaseProgress * 0.7,
          0,
          moonInScene.z * phaseProgress * 0.7,
        );
      } else if (activePhase.type === 'tei_coast') {
        // Return coast — pan target from Moon side (start) back
        // toward Earth side (end).
        const t = 1 - phaseProgress;
        autoZoomTargetR = WIDE_DISTANCE;
        autoZoomTargetCenter.set(moonInScene.x * t * 0.7, 0, moonInScene.z * t * 0.7);
      }
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
    el3d.addEventListener('mousedown', onMouseDown);
    el3d.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    // passive: false so onWheel can preventDefault against trackpad
    // pinch (macOS Ctrl+wheel) hijacking browser zoom.
    el3d.addEventListener('wheel', onWheel, { passive: false });
    el3d.addEventListener('touchstart', onTouchStart, { passive: true });
    el3d.addEventListener('touchmove', onTouchMove, { passive: true });
    el3d.addEventListener('touchend', onTouchEnd);
    el3d.addEventListener('touchcancel', onTouchEnd);

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
    };
    window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let rafId = 0;
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (isPlaying && now >= launchDwellUntil) {
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
      if (
        !isMoonMission &&
        !reducedMotion &&
        !isDrag &&
        !helioAutoZoomActive &&
        (lastHelioSubPhase === 'cruise-out' || lastHelioSubPhase === 'cruise-back')
      ) {
        camT += 0.05 * dt;
        const t = now * 0.001; // seconds
        // Zoom breathing — modulate around the steady-state cruise
        // target radius. helioAutoZoomTargetR holds the cruise-wide
        // value; we add a sinusoid on top so camR breathes.
        const ZOOM_AMP = helioAutoZoomTargetR * 0.15;
        const zoomOsc = Math.sin((t * (Math.PI * 2)) / 90) * ZOOM_AMP;
        camR += (helioAutoZoomTargetR + zoomOsc - camR) * 0.005;
        // Tilt drift — modulate camP around cruise default.
        const TILT_AMP = 0.1;
        const tiltOsc = Math.sin((t * (Math.PI * 2)) / 180) * TILT_AMP;
        camP += (HELIO_CRUISE_P + tiltOsc - camP) * 0.005;
      }
      // Flyby cinema sweep — slow azimuthal orbit + gentle pitch tilt
      // around the body during a flyby sub-phase. Borrows from the
      // NASA mission-art reference set (Cassini-Saturn, Juno-Jupiter,
      // Galileo-Jupiter): the body holds frame while the camera arcs
      // around it, giving the moment a "hero shot" feel instead of a
      // static planet-centered lookup. Skipped under reduced-motion,
      // while the user is dragging, and during the initial sub-phase
      // lerp so the camera settles before the sweep starts.
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
        const flybyMetActive = (window as unknown as { __flyDebug?: { activeFlybyMet?: number } })
          .__flyDebug?.activeFlybyMet;
        const inPeak =
          flybyMetActive != null &&
          Math.abs(simDay - (arcTimeline.dep_day + flybyMetActive)) < FLYBY_PEAK_DAYS;
        camT += (inPeak ? 0.15 : 0.05) * dt;
        // Gentle pitch breathing around the approach tilt, ±0.05 rad
        // over a 30-second cycle — adds parallax without making the
        // ecliptic plane swing too far.
        const t = now * 0.001;
        const TILT_AMP = 0.05;
        const tiltOsc = Math.sin((t * (Math.PI * 2)) / 30) * TILT_AMP;
        camP += (HELIO_APPROACH_P + tiltOsc - camP) * 0.008;
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
        // confusing Mars stand-in.
        const mPos = destinationPos(simDay, activeDestination);
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
        const flybyDbg = (
          window as unknown as { __flyDebug?: { flybySize?: number; flybyId?: string } }
        ).__flyDebug;
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
      if (outLine) outLine.visible = !afterArrival;
      if (retLine) retLine.visible = !afterArrival && retPts.length >= 2;
      // When a per-mission 3D model is present, it becomes the primary
      // glyph and the generic sprite hides entirely (no duplication).
      // Otherwise the sprite remains the glyph.
      if (scModel) {
        scSprite.visible = false;
        scModel.visible = !afterArrival;
      } else {
        scSprite.visible = !afterArrival;
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
      const scWorld = new THREE.Vector3(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);
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
        const t = total > 0 ? Math.max(0, Math.min(1, (simDay - arcTimeline.dep_day) / total)) : 0;
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
            const accel = gravityAccel(isLunarPhase ? BODY_MASS_KG.moon : BODY_MASS_KG.earth, dKm);
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

        if (viewMode === 'cislunar') {
          renderer.render(cislunarScene, cislunarCamera);
        } else {
          renderer.render(scene, camera);
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
            fdNext.push({
              id: s.id,
              label: s.label(),
              tickScreen: helioAuToScreenPx(
                { x: tickPt.x * SCALE_3D, y: 0, z: tickPt.z * SCALE_3D },
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
    };
    animate(performance.now());

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

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopLensWatch?.();
      stopSoiLayer?.();
      stopSoiLayerCislunar?.();
      stopGravityLayer?.();
      stopGravityLayerCislunar?.();
      stopFlyVelocityLayer?.();
      stopVelocityLayerCislunar?.();
      stopFlyCentripetalLayer?.();
      stopCentripetalLayerCislunar?.();
      stopCoastLayer?.();
      stopCoastLayerCislunar?.();
      stopApsidesLayer?.();
      stopApsidesLayerCislunar?.();
      stopHillSphereLayer?.();
      stopLagrangeLayer?.();
      stopMagnetosphereLayer?.();
      stopMoonsLayer?.();
      el3d.removeEventListener('mousedown', onMouseDown);
      el3d.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el3d.removeEventListener('wheel', onWheel);
      el3d.removeEventListener('touchstart', onTouchStart);
      el3d.removeEventListener('touchmove', onTouchMove);
      el3d.removeEventListener('touchend', onTouchEnd);
      el3d.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', onResize);
      disposeScene(scene);
      // ADR-058: dispose the cislunar scene's GPU resources too.
      disposeScene(cislunarScene);
      // ADR-073 Layer B — dispose lazy 4K textures held in closures
      // (not reachable through cislunarScene's scene graph).
      cislunarHandles.disposeLod();
      renderer.dispose();
      el3d.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
    stopReducedMotionWatch();
  });
</script>

<svelte:head><title>{m.fly_page_title()}</title></svelte:head>

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
  {#if hasPhaseMarkers && phaseMarkerScreens.length > 0}
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
  {#if showFlightDirector && view === '3d' && fdPhaseMarkerScreens.length > 0}
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
  {#if view === '3d' && milestoneScreens.length > 0}
    <div
      class="milestone-overlay"
      data-testid="milestone-overlay"
      data-milestone-count={milestoneScreens.length}
    >
      {#each milestoneScreens as m, idx (idx + '@' + m.met_days + '@' + m.label)}
        {#if m.screen.onScreen}
          <!-- Three dock positions by state:
               - active → top-centre, full description card
               - past → top-right corner, compact, dimmed
               - future → top-left corner just under HUD, compact,
                 "NEXT" prefix for orientation
               Leader line only on active (past/future float on
               their own; the diagonal trail across the canvas was
               more confusing than helpful). -->
          {@const vw = typeof window !== 'undefined' ? window.innerWidth : 1400}
          <!-- HUD column ~236 px wide (left:16 + width:220) when shown;
               CAPCOM column ~336 px wide (width:320 + right:16) when
               shown. The chip is centre-anchored (translate(-50%, 0))
               so chipX must include half the chip width (~130 px). -->
          {@const hudClearance = showHud ? 236 + 140 : 220}
          {@const capcomClearance = showCapcom ? 336 + 140 : 220}
          {@const chipX =
            m.state === 'active'
              ? vw / 2
              : m.state === 'past'
                ? vw - capcomClearance
                : hudClearance}
          <!-- Active chip used to dock top-centre but that's exactly
               where the foreground spacecraft sits during the flyby
               hero composition. Dock at the lower-centre instead so
               the body + ship reading stays clear. chipY is the BOTTOM
               edge of the chip (translate(-50%, -100%)); placing it
               at viewport-height − 130 keeps the chip just above the
               scrubber row. Past/future stay where they were. -->
          {@const vh = typeof window !== 'undefined' ? window.innerHeight : 900}
          {@const chipY = m.state === 'active' ? vh - 130 : 220 + idx * 40}
          <span
            class="milestone-diamond"
            class:active={m.active}
            style="left: {m.screen.x}px; top: {m.screen.y}px;"
            aria-hidden="true"
          ></span>
          <!-- Leader only renders for the ACTIVE chip — past chips
               dock in the corner and don't need a line back to their
               distant diamond (the diagonal crossing-the-screen
               leader was visually noisy). -->
          {#if m.active}
            <span
              class="milestone-leader"
              class:active={m.active}
              style="left: {m.screen.x}px; top: {m.screen.y}px; width: {Math.hypot(
                chipX - m.screen.x,
                chipY - m.screen.y,
              )}px; transform: rotate({Math.atan2(chipY - m.screen.y, chipX - m.screen.x)}rad);"
              aria-hidden="true"
            ></span>
          {/if}
          <span
            class="milestone-chip"
            class:active={m.state === 'active'}
            class:past={m.state === 'past'}
            class:future={m.state === 'future'}
            style="left: {chipX}px; top: {chipY}px;"
            data-testid="milestone-chip"
            data-met-days={m.met_days}
            data-milestone-state={m.state}
          >
            {#if m.state === 'future'}
              <span class="milestone-prefix">NEXT</span>
            {/if}
            <span class="milestone-label">{m.label}</span>
            {#if m.state === 'active' && m.description}
              <span class="milestone-description">{m.description}</span>
            {/if}
          </span>
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

  <!-- Left-side HUD stack: identity → navigation → systems. Replaces
       the previous scattered top-left/top-right/bottom-right layout
       that conflicted with the CAPCOM toggle. User-dismissible via the
       HUD toggle in the top-right row. -->
  <div class="hud-stack" data-audio-stage="fly-hud" class:hidden={!showHud}>
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
  <div class="scrubber" aria-label={m.fly_scrub_label()}>
    <button
      type="button"
      class="play-btn"
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
                </span>
              </button>
            {/if}
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
      aria-label="Science Lens panel toggles"
    >
      <button
        type="button"
        class="toggle toggle-lens"
        aria-pressed={showFlightDirector}
        title="Toggle Flight Director narration banner"
        onclick={() => (showFlightDirector = !showFlightDirector)}
      >
        FD
      </button>
      <button
        type="button"
        class="toggle toggle-lens"
        aria-pressed={showLayersPanel}
        title="Toggle Science Layers panel"
        onclick={() => (showLayersPanel = !showLayersPanel)}
      >
        LYR
      </button>
      {#if conicsLayerOnState}
        <button
          type="button"
          class="toggle toggle-lens"
          aria-pressed={showConicPanel}
          title="Toggle Conic Section side panel"
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
  <div class="fly-toggle-row fly-toggle-row-right" role="group" aria-label="View and panel toggles">
    <button
      type="button"
      class="toggle"
      aria-pressed={showHud}
      title="Toggle HUD column (mission identity, navigation, flight params, systems, live state)"
      onclick={() => (showHud = !showHud)}
    >
      HUD
    </button>
    <button
      type="button"
      class="toggle"
      aria-pressed={showCapcom}
      title="Toggle CAPCOM events panel"
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
    <aside class="capcom-panel" aria-label={m.fly_capcom_panel_label()}>
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
    title="Mission arc · Keplerian transfer ellipse"
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
  <div class="fly-bottom-strips">
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

<style>
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
  .milestone-diamond {
    position: absolute;
    width: 6px;
    height: 6px;
    background: #2dd4a8;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 0 0 3px rgba(45, 212, 168, 0.65);
    z-index: 12;
  }
  .milestone-diamond.active {
    width: 9px;
    height: 9px;
    background: #5eead4;
    box-shadow:
      0 0 8px rgba(94, 234, 212, 0.85),
      0 0 3px rgba(255, 255, 255, 0.6);
  }
  .milestone-leader {
    position: absolute;
    height: 1px;
    background: rgba(45, 212, 168, 0.4);
    transform-origin: 0 50%;
    z-index: 11;
  }
  .milestone-leader.active {
    background: rgba(94, 234, 212, 0.7);
    height: 1.5px;
  }
  .milestone-chip {
    position: absolute;
    display: inline-flex;
    flex-direction: column;
    gap: 5px;
    /* Past + future chips anchor at top-centre (chipY = chip TOP);
       active chip overrides this below to anchor at the bottom so
       the leader line reaches the chip from below. */
    transform: translate(-50%, 0);
    padding: 6px 12px 7px;
    background: rgba(8, 10, 22, 0.94);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1.2px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    user-select: none;
  }
  .milestone-chip.past {
    border: 1px solid rgba(45, 212, 168, 0.35);
    opacity: 0.6;
    white-space: nowrap;
    font-size: 11px;
  }
  .milestone-chip.future {
    border: 1px dashed rgba(45, 212, 168, 0.45);
    opacity: 0.78;
    white-space: nowrap;
    font-size: 11px;
  }
  .milestone-prefix {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    color: rgba(94, 234, 212, 0.85);
    text-transform: uppercase;
    margin-right: 6px;
  }
  .milestone-chip.active {
    border: 1px solid rgba(94, 234, 212, 0.85);
    max-width: 360px;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(94, 234, 212, 0.15);
    /* Bottom-anchored — chipY refers to chip's bottom edge so the
       leader line meets the chip from below, never crossing the
       description text. */
    transform: translate(-50%, -100%);
  }
  .milestone-label {
    color: rgba(255, 255, 255, 0.98);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 1.8px;
    text-transform: uppercase;
  }
  .milestone-description {
    color: rgba(255, 255, 255, 0.82);
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    letter-spacing: 0.2px;
    text-transform: none;
    white-space: normal;
  }

  /* Bottom strips row — centered band above the timeline scrubber
     that holds FlightDirectorBanner + ConicSectionPanel side-by-side
     at equal height. Replaces the prior split layout (FD bottom-left,
     conic bottom-right) which left them visually unaligned and let
     the conic panel slip behind the CAPCOM column on narrow viewports.
     align-items: stretch makes both children share the taller height. */
  .fly-bottom-strips {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 32;
    display: flex;
    flex-wrap: nowrap;
    gap: 16px;
    align-items: stretch;
    pointer-events: none;
    /* Keep the strips inside the channel between the hud-stack (left
       16+220 = 236) and the CAPCOM column (right 16+320 = 336). */
    max-width: calc(100vw - 600px);
  }
  .fly-fd-anchor {
    display: flex;
    max-width: 540px;
    flex: 0 1 auto;
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
    flex: 0 0 240px;
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
  @media (max-width: 900px) {
    /* Squeezed viewport: drop the strip row edge-to-edge above the
       scrubber and stack vertically so neither panel clips into the
       CAPCOM column or each other. */
    .fly-bottom-strips {
      left: 16px;
      right: 16px;
      transform: none;
      max-width: calc(100vw - 32px);
      flex-direction: column;
      align-items: stretch;
    }
    .fly-fd-anchor,
    .fly-conic-anchor {
      flex: 1 1 auto;
      max-width: 100%;
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
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
  }

  .hud-stack {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    bottom: 80px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    /* Stack stretches the full viewport height between nav and scrubber;
       individual .hud children re-enable pointer events. */
  }
  .hud {
    pointer-events: auto;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
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
    font-size: 9px;
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
    font-size: 8px;
    letter-spacing: 2px;
    margin-bottom: 4px;
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

  .hud-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .hud-key {
    color: rgba(255, 255, 255, 0.35);
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .hud-val {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
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
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
  }
  @media (max-width: 767px) {
    .hud-navigation,
    .hud-systems,
    .hud-flight-params {
      display: none;
    }
    .hud-stack {
      bottom: auto;
    }
    .scrubber {
      right: 16px;
    }
    /* On mobile, the hud-collapse toggle is visible; when active, hide
       hud-stack + capcom-panel so the actual 3D / 2D scene is unobstructed. */
    .hud-collapse {
      display: inline-flex;
    }
    .fly.hud-hidden .hud-stack,
    .fly.hud-hidden .capcom-panel {
      display: none;
    }
  }

  /* The HUD-collapse toggle itself — mobile-only floating button at
     top-left, just above the HUD area. Sits at z-index 36 so it's
     above the panels (35) but below modal overlays (100). */
  .hud-collapse {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 36;
    width: 36px;
    height: 36px;
    min-width: 44px;
    min-height: 44px;
    display: none;
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
    font-size: 8px;
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
    z-index: 2;
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
    padding: 6px 10px;
    background: rgba(15, 18, 30, 0.96);
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    backdrop-filter: blur(4px);
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
    font-size: 9px;
    color: rgba(255, 200, 80, 0.85);
    letter-spacing: 0.05em;
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
    font-size: 9px;
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
  /* Gold cluster anchored just left of the blue cluster. The blue
     cluster is right:16; this cluster ends with a small gap before
     it. width of blue cluster ≈ 3×44 + 2×6 = 144 px, plus 16 px right
     gutter and 10 px gap = 170 px → cluster sits at right:170. */
  .fly-toggle-row-left {
    right: 170px;
    max-width: calc(50vw - 12px);
  }
  .fly-toggle-row-right {
    right: 16px;
    max-width: calc(50vw - 12px);
  }
  @media (max-width: 600px) {
    /* On narrow viewports both clusters share the same edge and stack
       vertically rather than horizontally. */
    .fly-toggle-row-left {
      right: 16px;
      top: calc(var(--nav-height) + 12px + 50px);
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
    position: fixed;
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
  /* Desktop — start just under the 2D/3D toggle (nav-height + 12 +
     44 + 8 = nav-height + 64) and stretch down to the scrubber. The
     extra height is the v0.x.x ask: more room for events as the
     mission unfolds. */
  @media (min-width: 768px) {
    .capcom-panel {
      top: calc(var(--nav-height) + 64px);
      bottom: 86px;
      right: 16px;
      width: 320px;
    }
  }
  /* Mobile — bottom sheet (unchanged; mobile already had a tall panel
     because it stretches edge-to-edge above the scrubber). */
  @media (max-width: 767px) {
    .capcom-panel {
      bottom: 70px;
      left: 16px;
      right: 16px;
      max-height: 50vh;
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
    font-size: 7px;
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
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .anomaly-detail {
    margin-left: auto;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.6);
  }

  .comm-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 9px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .comm-key {
    color: rgba(255, 255, 255, 0.4);
    font-size: 7px;
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
    font-size: 7px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.35);
    margin-right: 8px;
  }
  .event-label {
    font-size: 8px;
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
