<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { viewport } from '$lib/viewport.svelte';
  import { agencyToLogoEntries } from '$lib/agency-logo';
  import type { FleetIndexEntry } from '$types/fleet';
  import * as THREE from 'three';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { createFlyFrameRunner } from '$lib/three/fly-frame-runner';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  import {
    earthPos,
    marsPos,
    destinationPos,
    spacecraftPos,
    type MissionTimeline,
    type Vec2,
  } from '$lib/orbital/mission-arc';
  import { buildArcs } from '$lib/fly-moon-arc';
  import {
    SCALE_3D,
    GRAVITY_ASSIST_CAVEAT_DESTINATIONS,
    DESTINATION_LABEL_COLORS,
  } from '$lib/fly-scene-constants';
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
  } from '$lib/fly-cinematic-beats';
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
    R_MOON_KM,
    type CislunarTrajectory,
  } from '$lib/orbital/cislunar/cislunar-geometry';
  import {
    phaseMarkerKmPositions,
    currentPhaseFor,
    primaryScienceRefFor,
    type PhaseMarker,
    type ScienceRef,
  } from '$lib/orbital/cislunar/cislunar-events';
  import { type InterplanetaryTrajectory } from '$lib/interplanetary-geometry';
  import {
    phaseMarkerAuPositions,
    currentInterplanetaryPhaseFor,
    primaryInterplanetaryPhaseScienceRef,
    type InterplanetaryPhaseMarker,
  } from '$lib/interplanetary-events';
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
  import { type PlanetId as FlybyPlanetId } from '$lib/orbital/flyby-camera-plan';
  import { type ShotKind } from '$lib/orbital/flyby-shots';
  import { biasJumpToIconicMoment } from '$lib/orbital/jump-to-met-bias';
  import { PLANET_SIZES } from '$lib/orbital/find-flyby-planet';


  import {
    MOON_COMPOSITION,
    CISLUNAR_HERO_LEAD_DAYS,
  } from '$lib/orbital/cislunar/cislunar-hero-shot';

  import {
    buildTubeGeometry,
    buildSpacecraftSprite,
    buildEnginePlume,
  } from '$lib/three/fly-helio-overlays';
  import {
    type PhaseMarkerRenderState,
    type FdStage,
    type FdPhaseMarkerRender,
    type MilestoneRender,
  } from '$lib/fly/fly-frame-projections';
  import { buildHelioReactiveOverlays } from '$lib/three/fly-helio-reactive';
  import { buildCislunarReactiveOverlays } from '$lib/three/fly-cislunar-reactive';
  import { buildHelioMissionOverlays } from '$lib/three/fly-helio-mission';
  import { createFlyCameraController } from '$lib/three/fly-camera-controller';
  import { AU_TO_KM, MOON_VISUAL_DISTANCE } from '$lib/fly-physics-constants';
  import { onReducedMotionChange, prefersReducedMotion } from '$lib/reduced-motion';
  import type { Mission, MissionEvent } from '$types/mission';
  import type { LocalizedScenario } from '$types/scenario';
  import * as m from '$lib/paraglide/messages';
  import { cue } from '$lib/sensory/feedback';
  import { gyro } from '$lib/sensory/device-orientation';
  import { sensory } from '$lib/sensory/state.svelte';
  import { flyVelocitySon } from '$lib/sensory/sonify/fly-velocity';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import LaunchScene from '$lib/components/LaunchScene.svelte';
  import DescentScene from '$lib/components/DescentScene.svelte';
  import CoastScene from '$lib/components/CoastScene.svelte';
  import { getEarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';
  import { LOOP_CAP as LEO_LOOP_CAP } from '$lib/three/fly-leo-coast-scene';
  import {
    loadLaunchProfile,
    resolveLauncher,
    hasLaunchProfile,
  } from '$lib/orbital/launch-profile-registry';
  import { loadDescentProfile, hasDescentProfile } from '$lib/orbital/descent-profile-registry';
  import { integrateAscent, type LaunchProfile } from '$lib/orbital/ascent-physics';
  import {
    integrateDescent,
    type DescentProfile,
    type EDLPhaseKind,
  } from '$lib/orbital/descent-physics';
  import {
    makeTimeline,
    scrubberToPoint,
    pointToScrubber,
    ASCENT_SPEED_MULTIPLIERS,
    DESCENT_SPEED_MULTIPLIERS,
    type JourneyTimeline,
  } from '$lib/orbital/ascent-clock';
  import { terminalStartTime, unwarpDescentTime } from '$lib/orbital/descent-timewarp';
  import { T_MINUS_S, INJECTION_COAST_S, INJECTION_BURN_S } from '$lib/orbital/ascent-hud';
  import { resolveInjectionBurn } from '$lib/orbital/injection-burn';
  import { resolveOrbitInsertion } from '$lib/orbital/orbit-insertion';
  import PhasePanel from '$lib/components/PhasePanel.svelte';
  import FlightDirectorBanner from '$lib/components/FlightDirectorBanner.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import SpacecraftInfoCard from '$lib/components/SpacecraftInfoCard.svelte';
  import { classifyConic } from '$lib/orbit-overlays';
  import ConicSectionPanel from '$lib/components/ConicSectionPanel.svelte';
  import MobileControlsDrawer from '$lib/components/MobileControlsDrawer.svelte';
  import { isLayerOn, onLayerChange, type LayerKey } from '$lib/science-layers';
  import {
    reduceFlyAct,
    type FlyAct,
    type FlightPhaseEvent,
  } from '$lib/fly/flight-phase-controller';
  import { isScienceLensOn, onScienceLensChange } from '$lib/science-lens';
  import { track, trackMissionComplete } from '$lib/analytics';

  // ─── Default scenario (ORRERY-1 free-return per ADR-009) ─────────
  // Static-imported so the Three.js scene can initialise synchronously
  // at onMount. The runtime fetch via `getScenario()` happens too,
  // pulling in the editorial overlay for whichever locale the user
  // has — when other locales ship, the overlay swap is a one-line
  // change without restructuring the scene.
  import defaultScenarioBase from '$data/scenarios/orrery-1.json';
  import defaultScenarioOverlay from '$i18nSrc/en-US/scenarios/orrery-1.json';

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

  // ─── Launch pre-roll (RFC-034 §11 / Track A) — USER CHOICE from the opening ─
  // The #86 opening cinematic shows as before (planetary-orbits backdrop). When
  // the mission's launcher has an ascent profile, the opening offers START WITH
  // LAUNCH (plays the launch act → warp → transfer) alongside PROCEED TO
  // SIMULATION (fly from mid-point, exactly as before). ?launch=1 auto-starts.
  // ─── Flight-act state machine (RFC-036 WS-A · #440) ───────────────
  // `flyAct` is the single source of truth for which /fly act is on screen
  // (opening→ascent→coast→cruise→descent→recovery); the legacy show* booleans
  // are now derived from it, and every transition goes through the pure,
  // unit-tested reducer via dispatchPhase(). The show* flags depend only on
  // flyAct (declared first), so no forward-ref TDZ hazard. See the A0 contract in
  // docs/wip/2026-08-05-fly-restructure-plan.md + flight-phase-controller.ts.
  let flyAct = $state<FlyAct>('opening');
  const showLaunch = $derived(flyAct === 'ascent');
  const showCoast = $derived(flyAct === 'coast');
  const showDescent = $derived(flyAct === 'descent');
  const showRecovery = $derived(flyAct === 'recovery');
  const openingActive = $derived(flyAct === 'opening');
  /** Apply a phase event through the reducer, reading the live mission inputs at
   *  call time (a function, so it captures later-declared vars without TDZ). */
  function dispatchPhase(event: FlightPhaseEvent): void {
    const db = descentProfile?.body;
    flyAct = reduceFlyAct(
      flyAct,
      {
        isMoonMission,
        launchAvailable,
        earthCoast: !!earthCoast,
        descentAvailable: descentProfile != null,
        // The controller only distinguishes earth (→ recovery card) from the
        // surface-route bodies (page does the goto); collapse anything wider
        // (e.g. a gas-giant descentProfile.body) to null.
        descentBody: db === 'earth' || db === 'moon' || db === 'mars' || db === 'venus' ? db : null,
        deepLink: {
          launch: wantLaunchDeep,
          descent: wantDescentDeep,
          missionMatches: deepMissionId == null || mission.id === deepMissionId,
        },
      },
      event,
    );
  }
  let launchProfile = $state<LaunchProfile | null>(null);
  // Master-clock state for the unified pad→arrival scrubber (RFC-034 §4/§11).
  // `launchT` is the ascent MET (s) the /fly rAF loop advances during the launch
  // phase and binds into LaunchScene (which renders but no longer self-advances);
  // `launchSpeed` is the ascent real-time multiplier the shared speed pills set.
  let launchT = $state(-T_MINUS_S);
  let launchSpeed = $state(5);
  let launchAvailable = $derived(hasLaunchProfile(mission.fleet_refs, mission.vehicle));
  // #83 — trajectory-tube thickness invariant now lives in
  // $lib/three/trajectory-tube (pure + unit-tested): trajectoryTubeRadius()
  // scales the world radius with camera distance so every trajectory reads
  // identically thin at every zoom. Never hard-code a fixed tube radius.
  // The post-SECO injection burn for this mission (RFC-034 §3.1) — the kick /
  // upper stage that leaves parking orbit. Null when the mission has no
  // injection stage; the LaunchScene beat is then absent.
  let launchInjectionBurn = $derived(
    launchProfile && launchAvailable
      ? resolveInjectionBurn(
          resolveLauncher(mission.fleet_refs, mission.vehicle)?.id,
          mission.flight?.launch?.vehicle_stage,
          mission.flight?.totals?.tli_or_tmi_dv_km_s,
          mission.dest,
        )
      : null,
  );
  let launchDossier = $derived({
    name: mission.name,
    agency: mission.agency ?? mission.agency_full ?? '',
    site: launchProfile?.launchSite?.name ?? 'Launch complex',
    destination: mission.arr_label ?? '',
    spacecraftId: mission.id,
    injectionBurn: launchInjectionBurn,
  });
  function startLaunch() {
    const launcher = resolveLauncher(mission.fleet_refs, mission.vehicle);
    if (!launcher) return;
    // Load the profile first, THEN swap the opening for the launch overlay — no
    // flash of the cruise scene during the fetch.
    void loadLaunchProfile(launcher.id, fetch, base, launcher.name).then((p) => {
      if (!p) return;
      launchProfile = p;
      dispatchPhase({ type: 'startLaunch' });
    });
  }
  // ?launch=1 deep-link → auto-start once the URL-requested mission is loaded.
  const launchDeepParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const wantLaunchDeep = launchDeepParams?.get('launch') === '1';
  const deepMissionId = launchDeepParams?.get('mission') ?? null;
  let launchAutoStarted = false;
  $effect(() => {
    // Only auto-start when the LOADED mission is the one the URL asked for —
    // otherwise the deep-link fires on the default scenario mid-load.
    if (
      wantLaunchDeep &&
      !launchAutoStarted &&
      launchAvailable &&
      deepMissionId != null &&
      mission.id === deepMissionId
    ) {
      launchAutoStarted = true;
      startLaunch();
    }
  });

  // ─── Descent / landing act (RFC-034 §9 · Track D) ─────────────────
  // The inverse of the launch pre-roll: for the 37 Moon/Mars/Venus landers the
  // cruise ends at arrival, then the EDL act flies the lander down to the
  // surface (DescentScene, clock-driven, externalClock=true) and hands off to
  // the body's SurfaceScene. Gated on `hasDescentProfile`; orbiters never enter.
  // showDescent is derived from flyAct (see the flight-act block above).
  let descentProfile = $state<DescentProfile | null>(null);
  let descentT = $state(0);
  let descentSpeed = $state(3);
  // ─── Orbit-coast act (RFC-034 §13 · Tier-1 Earth-orbit capsules) ──────
  // For crewed capsules the flight is pad → orbit-COAST (loop Earth a while) →
  // re-entry. The coast slots between the launch + descent overlays: LaunchScene
  // onComplete hands to CoastScene (instead of revealing the cruise scene), which
  // then hands to DescentScene. Gated on the earth-orbit registry.
  // showCoast is derived from flyAct (see the flight-act block above).

  // ── Science-Lens layers offered per flight segment ────────────────────
  // Ascent, coast, descent and cruise are physically different regimes, so the
  // lens panel advertises only the layers that actually draw in the active
  // scene: ascent = powered-climb forces, coast = the orbit trio, descent =
  // atmospheric-entry forces, cruise = the full interplanetary orbital-mechanics
  // set. Keeps the panel honest — no "thrust" toggle on a free-fall coast, no
  // "conics" on a pad climb.
  const SEGMENT_LAYERS = {
    ascent: ['thrust', 'drag', 'gravity', 'velocity', 'ascent-losses'],
    coast: ['gravity', 'velocity', 'centripetal', 'apsides'],
    descent: ['thrust', 'drag', 'gravity', 'velocity'],
    cruise: [
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
    ],
  } as const satisfies Record<string, LayerKey[]>;
  let flySegment: keyof typeof SEGMENT_LAYERS = $derived(
    showLaunch ? 'ascent' : showCoast ? 'coast' : showDescent ? 'descent' : 'cruise',
  );
  let availableLayers = $derived<LayerKey[]>([...SEGMENT_LAYERS[flySegment]]);

  // Segment-transition seam: the full-screen launch/coast/descent overlays swap
  // instantly on an {#if}. To turn that into a clean film cut we SNAP to full
  // black in the same tick as the swap (transition disabled → the swap is hidden
  // behind black), hold a few frames for the incoming scene's first render, then
  // fade in from black. Skips the initial mount.
  let seamFadeOpacity = $state(0);
  let seamSnap = $state(false);
  let seamInit = false;
  let seamTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const _seg = flySegment; // track segment changes
    void _seg;
    untrack(() => {
      if (!seamInit) {
        seamInit = true;
        return;
      }
      seamSnap = true; // disable the CSS transition → instant black
      seamFadeOpacity = 1;
      clearTimeout(seamTimer);
      seamTimer = setTimeout(() => {
        seamSnap = false; // re-enable the transition → fade in from black
        seamFadeOpacity = 0;
      }, 90);
    });
    return () => clearTimeout(seamTimer);
  });

  let earthCoast = $derived(getEarthOrbitCoast(mission.id));
  // The coast is the "cruise" act of the unified pad→orbit→re-entry timeline for
  // Earth-orbit missions: `coastMetDays` is the elapsed on-orbit time (the master
  // clock's cruiseMetDays), and `coastFrac` (0..1) drives CoastScene via its
  // externalClock. The master scrubber owns both — one continuous timeline.
  let coastMetDays = $state(0);
  let coastDurationDays = $derived(earthCoast ? earthCoast.coastDurationS / 86400 : 0);
  let coastFrac = $derived(
    coastDurationDays > 0 ? Math.min(1, Math.max(0, coastMetDays / coastDurationDays)) : 0,
  );
  // Load the mission's descent profile whenever the mission changes.
  $effect(() => {
    const id = mission.id;
    if (!hasDescentProfile(id)) {
      descentProfile = null;
      return;
    }
    void loadDescentProfile(id, fetch, base).then((p) => {
      if (mission.id === id) descentProfile = p;
    });
  });
  function edlSystemLabel(p: DescentProfile): string {
    const kinds = new Set<EDLPhaseKind>(p.phases.map((x) => x.kind));
    if (kinds.has('touch_and_go_contact')) return 'Touch-and-go';
    if (p.body === 'comet_67p') return 'Harpoon landing';
    if (p.body === 'jupiter') return 'Atmospheric probe';
    if (p.body === 'titan') return 'Parachute descent';
    if (kinds.has('skycrane')) return 'Sky-crane';
    if (kinds.has('airbag_bounce')) return 'Airbags';
    if (kinds.has('aeroshell_descent')) return 'Aeroshell';
    if (kinds.has('parachute') && kinds.has('powered_retro')) return 'Parachute + retro';
    if (kinds.has('powered_retro')) return 'Powered retro';
    return 'Ballistic';
  }
  let descentDossier = $derived(
    descentProfile
      ? {
          name: mission.name,
          agency: mission.agency ?? mission.agency_full ?? '',
          body: descentProfile.body,
          siteId: descentProfile.siteId,
          siteName: `${descentProfile.landingSite.lat.toFixed(2)}°, ${descentProfile.landingSite.lon.toFixed(2)}°`,
          edlSystem: edlSystemLabel(descentProfile),
          // The descent profile is the source of truth for the entry state.
          entryVelocityKms: descentProfile.entryState.velocityMs / 1000,
        }
      : null,
  );
  // Touchdown → hand off to the destination body's SurfaceScene, closing the
  // flight circle (RFC-034 §9). Moon/Mars have surface routes; Venus has none,
  // so its touchdown simply rests on the landed frame.
  function handleTouchdown() {
    const b = descentProfile?.body;
    const sid = descentProfile?.siteId;
    if ((b === 'moon' || b === 'mars' || b === 'venus') && sid) {
      void goto(`${base}/${b}?site=${sid}&from=descent`);
    } else {
      // Earth re-entry has no surface-explore route — the reducer routes touchdown
      // by descentBody: earth → the recovery card; anything else stays put (the
      // goto above already left the route for a surface body).
      dispatchPhase({ type: 'touchdown' });
    }
  }
  // Recovery card shown after an Earth re-entry touchdown (RFC-034 §13).
  // showRecovery is derived from flyAct (see the flight-act block above).
  // US capsules splash down at sea; Soviet/Chinese capsules land on the steppe.
  const SPLASHDOWN_CAPSULES = new Set(['mercury', 'gemini', 'apollo-cm', 'dragon']);
  // Honest-failure captions — the re-entry outcome is not always a success.
  const RECOVERY_CAPTIONS: Record<string, () => string> = {
    'soyuz-1': () => m.fly_recovery_caption_soyuz1(),
    'soyuz-11': () => m.fly_recovery_caption_soyuz11(),
  };
  let recoveryOutcome = $derived.by(() => {
    const ok = descentSummaryFly?.touchdownSuccess ?? true;
    const splash = earthCoast ? SPLASHDOWN_CAPSULES.has(earthCoast.capsuleId) : true;
    if (!ok) return { eyebrow: 'IMPACT', fail: true };
    return { eyebrow: splash ? 'SPLASHDOWN · RECOVERY' : 'TOUCHDOWN · RECOVERY', fail: false };
  });
  /** Opening CTA (landing missions only): jump straight to the EDL act, past the
   *  launch + cruise — the descent counterpart of startLaunch. */
  function startDescent() {
    if (!descentProfile) return;
    dispatchPhase({ type: 'startDescent' });
    descentT = 0;
  }
  // ?descent=1 deep-link → jump straight to the EDL act once the profile loads
  // (mirrors ?launch=1). Deterministic entry for browser/e2e checks + a direct
  // "watch the landing" link.
  const wantDescentDeep = launchDeepParams?.get('descent') === '1';
  let descentAutoStarted = false;
  $effect(() => {
    if (
      wantDescentDeep &&
      !descentAutoStarted &&
      descentProfile != null &&
      (deepMissionId == null || mission.id === deepMissionId)
    ) {
      descentAutoStarted = true;
      dispatchPhase({ type: 'startDescent' });
      descentT = 0;
    }
  });

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
  // Default-collapse on touch devices (viewport.isTouch = coarse pointer / no
  // hover, so touch-laptops + iPad-with-trackpad keep the desktop default). The
  // store is seeded at module load, so this is valid here at script-init.
  if (viewport.isTouch) {
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

  // Mobile: which HUD panel the bottom tab accordion currently shows
  // (null = none, the 3D scene is the hero). Ties into hudHidden so the
  // existing touch scene-hero default cooperates — opening a tab reveals
  // its panel, closing returns to the clean canvas.
  let mobilePanel: 'mission' | 'events' | 'phase' | null = $state(null);
  function setMobilePanel(p: 'mission' | 'events' | 'phase') {
    mobilePanel = mobilePanel === p ? null : p;
    hudHidden = mobilePanel === null;
  }
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
  // PhaseMarkerRenderState imported from $lib/fly/fly-frame-projections (WS-B/B4).
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
  // FdStage imported from $lib/fly/fly-frame-projections (WS-B/B4). FD_STAGES stays
  // here — its labels call the component's i18n m.* messages.
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
  // FdPhaseMarkerRender imported from $lib/fly/fly-frame-projections (WS-B/B4).
  let fdPhaseMarkerScreens = $state.raw<FdPhaseMarkerRender[]>([]);

  /** Milestone overlay (#306-companion) — labeled `flight.events[]`
   *  entries surface as teal chips on the trajectory. Distinct from
   *  the gold FD stage markers above: FD stages are the 7-stage
   *  cinematic cadence (INJECTION → CRUISE → APPROACH → ARRIVAL × 2
   *  legs) shared by every mission, milestones are the per-mission
   *  historical narrative beats backfilled from /explore's labeled
   *  trajectory waypoints (Cassini's "Venus #1 — gravity assist",
   *  Voyager 2's "Neptune closest approach", etc.). */
  // MilestoneRender imported from $lib/fly/fly-frame-projections (WS-B/B4).
  let milestoneScreens = $state.raw<MilestoneRender[]>([]);

  // defaultEventLabel: extracted to $lib/fly-event-labels (W9 / #279).
  let simSpeed = $state(7); // days/sec
  // Mobile: collapse the speed pills into a single tap-to-reveal slot so the
  // scrubber track can reclaim the freed horizontal space (matches /explore).
  let speedPopoverOpen = $state(false);
  // DEV-only live-camera mirror for the FlybyDebugViewer 2D plot — the
  // real scene camera (camera.position + flyCam.camTarget) is closure-local in
  // the animate loop, so we mirror it into $state each frame (DEV builds
  // only) so the debug plot can draw the camera MOVING with the flight
  // instead of frozen at the iconic-shot position.
  let debugCamWorld = $state<{ x: number; y: number; z: number } | null>(null);
  let debugCamTargetWorld = $state<{ x: number; y: number; z: number } | null>(null);
  // Active montage shot kind, surfaced to the FLY debug panel (#371).
  let debugMontageShot = $state<ShotKind | null>(null);
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

  // ─── Unified master clock (RFC-034 §4 · §11) ──────────────────────
  // The launch act and the cruise are one continuous timeline on one scrubber.
  // The launch owns `[0, ascentScrubberFraction)`; the cruise owns the rest.
  // `simDay` stays the cruise source of truth — the master fraction is DERIVED
  // from whichever phase is live, and the shared control writes back to the
  // right one. When no launch profile is loaded, the bar is the cruise-only
  // `arcProgress`, unchanged.
  let launchSummaryFly = $derived(launchProfile ? integrateAscent(launchProfile) : null);
  // The ascent slice of the unified scrubber spans pad → SECO → (injection beat).
  // When the mission has an injection burn, extend the ascent duration by the
  // coast + burn window so the seam lands after injection, not at SECO.
  let launchDurationS = $derived(
    launchSummaryFly
      ? launchSummaryFly.totalDurationS +
          (launchInjectionBurn ? INJECTION_COAST_S + INJECTION_BURN_S : 0)
      : 540,
  );
  // ─── Orbit-insertion beat (RFC-034 §12) — the arrival mirror of the launch
  // injection burn: an ORBITER's capture burn at the destination (MOI/VOI/SOI/
  // JOI…). Shown as a callout in the arrival window for missions that go into
  // orbit (an authored orbit_insertion_dv) rather than land.
  let orbitInsertion = $derived(
    descentProfile
      ? null // landers descend; they don't capture into orbit
      : resolveOrbitInsertion(mission.dest, mission.flight?.arrival?.orbit_insertion_dv_km_s),
  );
  const OI_WINDOW_DAYS = 5; // the capture-burn window straddling arrival
  let oiBeatActive = $derived(
    !!orbitInsertion &&
      !showLaunch &&
      !showDescent &&
      simDay >= arcTimeline.arr_day - OI_WINDOW_DAYS &&
      simDay <= arcTimeline.arr_day + 1,
  );
  /** Burn firing — the last half of the window into arrival (the retro burn). */
  let oiFiring = $derived(
    !!orbitInsertion &&
      simDay >= arcTimeline.arr_day - OI_WINDOW_DAYS / 2 &&
      simDay <= arcTimeline.arr_day + 0.5,
  );

  // The descent act (RFC-034 §9): integrate the EDL profile and give it the
  // scrubber TAIL. 0 duration / fraction when the mission doesn't land — the
  // bar stays the 2-segment ascent→cruise, unchanged for orbiters.
  let descentSummaryFly = $derived(descentProfile ? integrateDescent(descentProfile) : null);
  let descentDurationS = $derived(descentSummaryFly ? descentSummaryFly.totalDurationS : 0);
  // Separation-event times for the cinematic slow-mo beat (item 3) — the play-
  // clock eases into slow-motion as it passes each. Ascent times are already in
  // the launch clock's base; descent times are in *trajectory* time, so they're
  // unwarped into raw-scrubber time to align with where the sep actually renders
  // (the descent scene warps its sample clock — descent-timewarp.ts).
  let launchSepTimes = $derived(
    launchSummaryFly
      ? launchSummaryFly.events
          .filter((e) => e.type === 'staging' || e.type === 'fairing_jettison' || e.type === 'seco')
          .map((e) => e.t)
      : [],
  );
  let descentSepTimes = $derived.by(() => {
    if (!descentSummaryFly) return [] as number[];
    const dur = descentSummaryFly.totalDurationS;
    const tB = terminalStartTime(descentSummaryFly.states, dur);
    const beats = new Set([
      'entry_flip',
      'parachute_deploy',
      'heatshield_sep',
      'backshell_sep',
      'skycrane_lower',
      'skycrane_flyaway',
      'retro_ignition',
      'airbag_deploy',
      'touchdown',
    ]);
    return descentSummaryFly.events
      .filter((e) => beats.has(e.type))
      .map((e) => unwarpDescentTime(e.t, dur, tB));
  });
  // Compressive coast-band width (RFC-034 §13): a 1-orbit hop and an 84-day
  // marathon shouldn't own the same slice of the scrubber. Shrink the ascent
  // fraction with log(coast hours) so the coast band *widens* with real duration
  // (~0.71 for one orbit → ~0.80 for months), bounded so the launch stays
  // scrubbable. Interplanetary missions keep the default 0.15.
  let coastAscentFrac = $derived(
    earthCoast
      ? Math.max(0.1, Math.min(0.2, 0.2 - 0.03 * Math.log10(Math.max(1, coastDurationDays * 24))))
      : 0.15,
  );
  let masterTimeline: JourneyTimeline = $derived(
    makeTimeline(
      launchDurationS,
      // Earth-orbit missions: the "cruise" act IS the orbit-coast, so its duration
      // is the on-orbit time (days). Interplanetary: the transfer arc.
      earthCoast ? Math.max(0.01, coastDurationDays) : Math.max(1, arcTotalDays),
      coastAscentFrac,
      descentDurationS,
      // The descent owns a wider band of the master scrubber (was 0.1) so the
      // terminal EDL — parachute, skycrane, touchdown — is actually reachable by
      // scrubbing, not crushed into a sliver next to the huge cruise.
      descentProfile ? 0.2 : 0,
    ),
  );
  let hasLaunchAct = $derived(!!launchProfile);
  // Ascent real-time × pills · descent real-time × pills · cruise day/s pills —
  // swapped at each seam.
  let speedPills = $derived(
    showLaunch
      ? [...ASCENT_SPEED_MULTIPLIERS]
      : showDescent
        ? [...DESCENT_SPEED_MULTIPLIERS]
        : isMoonMission
          ? [0.1, 0.5, 1, 3]
          : [1, 7, 30, 90],
  );
  let activeSpeed = $derived(showLaunch ? launchSpeed : showDescent ? descentSpeed : simSpeed);
  // The scrubber fraction for the live phase (∈ [0,1]).
  let masterU = $derived(
    showLaunch
      ? pointToScrubber(
          { phase: 'ascent', ascentT: Math.max(0, launchT), cruiseMetDays: 0 },
          masterTimeline,
        )
      : showDescent
        ? pointToScrubber(
            {
              phase: 'descent',
              ascentT: launchDurationS,
              cruiseMetDays: earthCoast ? coastDurationDays : arcTotalDays,
              descentT: Math.max(0, descentT),
            },
            masterTimeline,
          )
        : showCoast
          ? pointToScrubber(
              { phase: 'cruise', ascentT: launchDurationS, cruiseMetDays: coastMetDays },
              masterTimeline,
            )
          : pointToScrubber(
              {
                phase: 'cruise',
                ascentT: launchDurationS,
                cruiseMetDays: Math.max(0, simDay - arcTimeline.dep_day),
              },
              masterTimeline,
            ),
  );
  // The value the scrubber input + fill render: the master fraction once a
  // launch act exists, else the plain cruise progress (unchanged).
  let scrubValue = $derived(hasLaunchAct ? masterU : Math.max(0, Math.min(1, arcProgress)));
  // A cruise MET (days) → its % position on the ACTIVE bar. On the unified bar
  // the cruise occupies `[seam, 1]`; on the cruise-only bar it is `[0, 1]`.
  function cruiseTickPct(metDays: number): number {
    const frac = arcTotalDays > 0 ? metDays / arcTotalDays : 0;
    const seam = hasLaunchAct ? masterTimeline.ascentScrubberFraction : 0;
    return Math.max(0, Math.min(100, (seam + (1 - seam) * frac) * 100));
  }
  function masterTogglePlay() {
    if (showLaunch || showDescent) {
      isPlaying = !isPlaying;
      track('mission-play-toggle', { id: mission?.name ?? 'unknown', playing: isPlaying });
    } else {
      togglePlay();
    }
  }
  function masterSetSpeed(v: number) {
    if (showLaunch) {
      launchSpeed = v;
      isPlaying = true;
    } else if (showDescent) {
      descentSpeed = v;
      isPlaying = true;
    } else {
      setSpeed(v);
    }
  }
  function onMasterScrub(event: Event) {
    const u = Number((event.target as HTMLInputElement).value);
    const pt = scrubberToPoint(u, masterTimeline);
    if (pt.phase === 'ascent') {
      // Scrubbing back into the ascent re-mounts LaunchScene fresh (resets any
      // completed warp) and drives it to the scrubbed MET.
      dispatchPhase({ type: 'scrubTo', phase: 'ascent' });
      launchT = pt.ascentT;
    } else if (pt.phase === 'descent') {
      // Scrubbing into the tail enters the descent act at the scrubbed EDL time.
      dispatchPhase({ type: 'scrubTo', phase: 'descent' });
      descentT = pt.descentT ?? 0;
    } else if (earthCoast) {
      // Cruise band of a Tier-1 Earth-orbit flight = the orbit-coast act (the
      // reducer maps the cruise band → coast when earthCoast is set).
      dispatchPhase({ type: 'scrubTo', phase: 'cruise' });
      coastMetDays = pt.cruiseMetDays;
    } else {
      dispatchPhase({ type: 'scrubTo', phase: 'cruise' });
      simDay = arcTimeline.dep_day + pt.cruiseMetDays;
    }
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
    dispatchPhase({ type: 'enterOpening' });
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
    // The reducer forks skipOpening on earthCoast: earth-orbit → ascent (the
    // LaunchScene stays gated on launchProfile until the async load below lands,
    // so no blank flash), everything else → the cruise transfer scene.
    dispatchPhase({ type: 'skipOpening' });
    openingTitleOpacity = 0;
    openingContextOpacity = 0;
    openingFleetOpacity = 0;
    // Earth-orbit missions (Mercury/Vostok/Voskhod/Gemini…) have no interplanetary
    // cruise — their arc is launch → LEO/suborbital coast → reentry. Load the
    // launch profile (the reducer already put us in ascent); the launch's
    // onComplete hands off to CoastScene.
    if (earthCoast && launchAvailable) {
      startLaunch();
      return;
    }
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
  // openingActive is derived from flyAct (see the flight-act block above).
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
  // Hero sonification — the mission-arc velocity tone (PRD-017). Starts/stops with
  // AUDIO; pitch is fed the live heliocentric speed each frame (see onFrame).
  $effect(() => {
    if (sensory.active('audio')) flyVelocitySon.start();
    else flyVelocitySon.stop();
    return () => flyVelocitySon.stop();
  });

  function jumpToMet(metDays: number) {
    if (!Number.isFinite(metDays) || metDays < 0) return;
    cue('select');
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
      dispatchPhase({ type: 'enterOpening' });
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
          x: flyCam.cislunarCamTarget.x,
          y: flyCam.cislunarCamTarget.y,
          z: flyCam.cislunarCamTarget.z,
        },
        camR: flyCam.cislunarCamR,
        autoZoomActive: flyCam.autoZoomActive,
        lastAutoZoomPhase: flyCam.lastAutoZoomPhase,
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
      // Tier-1 Earth-orbit re-entry diagnostic (RFC-034 §13) — the pad→coast→
      // re-entry counterpart of __flyCislunarDebug, for chrome-devtools + e2e.
      (window as Window & { __flyReentryDebug?: () => unknown }).__flyReentryDebug = () => ({
        phase: showLaunch
          ? 'launch'
          : showCoast
            ? 'coast'
            : showDescent
              ? 'descent'
              : showRecovery
                ? 'recovery'
                : 'idle',
        earthCoast: earthCoast
          ? {
              capsuleId: earthCoast.capsuleId,
              suborbital: !!earthCoast.suborbital,
              apogeeKm: earthCoast.apogeeKm,
              perigeeKm: earthCoast.perigeeKm,
              inclinationDeg: earthCoast.inclinationDeg,
              revolutions: earthCoast.revolutions,
              coastDurationDays,
            }
          : null,
        coastFrac,
        coastMetDays,
        liveRev: earthCoast
          ? Math.min(earthCoast.revolutions, Math.floor(coastFrac * earthCoast.revolutions) + 1)
          : 0,
        renderedLoops: earthCoast
          ? earthCoast.suborbital
            ? 0
            : Math.min(LEO_LOOP_CAP, earthCoast.revolutions)
          : 0,
        masterU,
        coastAscentFrac,
        descent: descentSummaryFly
          ? {
              t: descentT,
              durationS: descentDurationS,
              peakG: descentSummaryFly.peakDecel.g,
              touchdownMs: descentSummaryFly.touchdownVelocityMs,
              success: descentSummaryFly.touchdownSuccess,
            }
          : null,
        recovery: showRecovery ? recoveryOutcome.eyebrow : null,
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
    // Base FOV to restore when a montage shot (which may set its own FOV)
    // is not active. Captured from the scene's camera at setup. (#371)
    const baseFov = camera.fov;
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
      // __MOBILE__: 4K earth/moon are pruned off-device (ADR-079 D3). Passing
      // undefined makes fly-cislunar-scene skip the LOD upgrade and stay at 2K.
      earthTextureUrl4k: __MOBILE__ ? undefined : `${base}/textures/4k_earth_daymap.jpg`,
      moonTextureUrl: `${base}/textures/2k_moon.jpg`,
      moonTextureUrl4k: __MOBILE__ ? undefined : `${base}/textures/4k_moon.jpg`,
    });
    const cislunarScene = cislunarHandles.scene;
    const cislunarCamera = cislunarHandles.camera;
    const SCALE_CISLUNAR = cislunarHandles.scaleCislunar;
    const cislunarMoon = cislunarHandles.moon;
    const cislunarEarthSoI = cislunarHandles.earthSoI;
    const cislunarMoonSoI = cislunarHandles.moonSoI;

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

    // The cislunar reactive overlay layer — the science-layer listeners, the
    // per-phase trajectory tubes (+ ensureCislunarPhaseLine + the moon-frame group),
    // the ∆v annotations, the spacecraft marker, and the per-frame updaters — now
    // live in $lib/three/fly-cislunar-reactive (RFC-036 WS-B), byte-identical. The
    // updaters + refs destructure back into the same names the frame loop +
    // mission-swap effect use; live reactive reads (arcTimeline/mission) thread as
    // getter deps. The static overlay refs above stay (the frame loop mutates them).
    const cisReactive = buildCislunarReactiveOverlays({
      scene: cislunarScene,
      moon: cislunarMoon,
      scaleCislunar: SCALE_CISLUNAR,
      earthSoI: cislunarEarthSoI,
      moonSoI: cislunarMoonSoI,
      overlays: cislunarHandles.overlays,
      getArcTimeline: () => arcTimeline,
      getMission: () => mission,
    });
    const {
      cislunarMoonFrameGroup,
      cislunarSpacecraft,
      cislunarPhaseLines,
      rebuildCislunarLines,
      updateCislunarLineProgress,
      updateCislunarSpacecraft,
      rebuildCislunarAnnotations,
    } = cisReactive;

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
    // The per-mission helio overlays — trajectory tubes, the spacecraft model
    // (applyMissionSpacecraftModel), the LAUNCH/ARRIVAL/RETURN anchor rings, the
    // moon orbit ring, and the anchor label sprites (refreshSpriteTextures) — now
    // live in $lib/three/fly-helio-mission (RFC-036 WS-B), byte-identical. The refs
    // are assigned into the component-scope `let`s the mission-swap $effects already
    // reference; helioMission.scModel + the two swap methods are read via the handle.
    const helioMission = buildHelioMissionOverlays({ scene, outPts, retPts });
    outLine = helioMission.outLine;
    retLine = helioMission.retLine;
    depMarker = helioMission.depMarker;
    arrMarker = helioMission.arrMarker;
    retMarker = helioMission.retMarker;
    moonOrbitRing = helioMission.moonOrbitRing;
    depLabelSprite = helioMission.depLabelSprite;
    arrLabelSprite = helioMission.arrLabelSprite;
    retLabelSprite = helioMission.retLabelSprite;

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
    // Helio reactive overlay layer (SoI rings, gravity/velocity/centripetal arrows,
    // coast line, apsides markers, moon mesh) + its science-layer listeners + the
    // three frame-shared flags (soiLayerOn / cinemaForceMoons / lastLayerMoonsOn)
    // now live in $lib/three/fly-helio-reactive (RFC-036 WS-B) — byte-identical. The
    // mesh refs destructure back into the same names the frame loop already uses; the
    // shared flags stay on `helioReactive` (accessed via the handle in the loop).
    const helioReactive = buildHelioReactiveOverlays({
      scene,
      setHillSpheresVisible: helioHandles.setHillSpheresVisible,
      setLagrangePointsVisible: helioHandles.setLagrangePointsVisible,
      setMagnetospheresVisible: helioHandles.setMagnetospheresVisible,
      setMoonsVisible: helioHandles.setMoonsVisible,
      base,
      getIsMoonMission: () => isMoonMission,
      getActiveDestination: () => activeDestination,
      getSimDay: () => simDay,
      getOutPts: () => outPts,
    });
    const {
      earthSoI,
      marsSoI,
      moonSoI,
      gravArrowEarth,
      gravArrowSun,
      velocityArrow,
      centripetalArrow,
      coastLine,
      moonMesh,
      recomputeApsides,
    } = helioReactive;

    // (The layer listeners, coast line, apsides markers + recomputeApsides, the
    // hill/lagrange/magnetosphere/moons overlays, and the moon mesh all moved into
    // buildHelioReactiveOverlays above — RFC-036 WS-B. The soiLayerOn /
    // cinemaForceMoons / lastLayerMoonsOn flags live on `helioReactive`.)

    // Spacecraft — small camera-facing sprite glyph at sc.pos. Satellite
    // billboard: red rounded body + two gold solar-panel wings + a tiny
    // white antenna stub, surrounded by a soft red glow halo. Rendered
    // as a THREE.Sprite so it's always face-camera — no orbital
    // rotation math, sidestepping the chevron's "wrong direction"
    // problem on curved arcs. The red body preserves the visibility
    // the prior circle gave; the gold wings carry the spacecraft
    // identity, matching the FD banner palette.
    // The glyph drawing + sprite construction now live in buildSpacecraftSprite()
    // ($lib/three/fly-helio-overlays, RFC-036 WS-B/B2a) — byte-identical (same 64px
    // canvas, same scale 2.5 / renderOrder 999 / depthTest:false).
    const { sprite: scSprite } = buildSpacecraftSprite();
    scene.add(scSprite);

    // #1 Engine plume — directed cone at the spacecraft position
    // during burn events. Geometry tip along -Z so THREE.Object3D.lookAt
    // orients tip at any world-space target. Shader paints a base→tip
    // orange→yellow-white gradient with squared falloff toward the tip
    // (visually narrow tapering exhaust). Hidden between burns. Per-
    // event orientation + scale + opacity in the animate loop below.
    // The plume cone + gradient shader now live in buildEnginePlume()
    // ($lib/three/fly-helio-overlays, RFC-036 WS-B/B2a) — byte-identical (same
    // ConeGeometry, same shader, additive, hidden, renderOrder 998). plumeMat's
    // uOpacity + plumeMesh transform are driven per burn-event in the animate loop.
    const { mesh: plumeMesh, material: plumeMat } = buildEnginePlume();
    scene.add(plumeMesh);

    // Camera + cinematic-camera subsystem extracted to
    // $lib/three/fly-camera-controller (RFC-036 WS-B). The controller owns the
    // camera-orbit state + the auto-zoom / cinematic-camera drivers; the frame loop
    // + input handlers read/write its state via the handle (flyCam.camR etc.) and
    // call flyCam.updateCam() / flyCam.panActiveCamera() etc.
    const flyCam = createFlyCameraController({
      camera,
      cislunarCamera,
      cislunarSpacecraft,
      cislunarHandles,
      helioHandles,
      helioReactive,
      cine,
      getSimDay: () => simDay,
      getSimSpeed: () => simSpeed,
      getViewMode: () => viewMode,
      getIsMoonMission: () => isMoonMission,
      getActiveDestination: () => activeDestination,
      getMission: () => mission,
      getArcTimeline: () => arcTimeline,
      getOutPts: () => outPts,
      getRetPts: () => retPts,
      getCislunarTrajectory: () => cislunarTrajectory,
      getEpilogueActive: () => epilogueActive,
      getOpeningActive: () => openingActive,
      getOpeningStartedAt: () => openingStartedAt,
      getOpeningDurationMs: () => openingDurationMs,
      getCamSnapUntil: () => camSnapUntil,
      getCurrentDestMeshId: () => currentDestMeshId,
      setCurrentDestMeshId: (id: DestinationId) => (currentDestMeshId = id),
      getFlyUpdaters: () => flyUpdaters,
    });
    // Page-owned state that lived in the old camera block but belongs with the
    // frame loop / input handlers (montage cut-detection, flyby constants, drag).
    let lastMontageShotKind: ShotKind | null = null;
    const FLYBY_PEAK_DAYS = 4;
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
    const el3d = renderer.domElement;
    let isDrag = false;
    let dragMode: 'orbit' | 'pan' = 'orbit';
    let lmx = 0;
    let lmy = 0;
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
        flyCam.panActiveCamera(dx, dy);
        return;
      }
      if (viewMode === 'cislunar') {
        flyCam.cislunarCamT -= dx * 0.005;
        flyCam.cislunarCamP = Math.max(
          0.08,
          Math.min(Math.PI * 0.48, flyCam.cislunarCamP + dy * 0.005),
        );
        flyCam.updateCislunarCam();
      } else {
        flyCam.camT -= dx * 0.005;
        flyCam.camP = Math.max(0.08, Math.min(Math.PI * 0.48, flyCam.camP + dy * 0.005));
        flyCam.updateCam();
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
        flyCam.cislunarCamR = Math.max(minR, Math.min(maxR, flyCam.cislunarCamR + e.deltaY * 0.05));
        // User-initiated zoom wins over auto-zoom for the rest of this
        // phase. Next phase transition re-arms flyCam.autoZoomActive.
        flyCam.autoZoomActive = false;
        flyCam.updateCislunarCam();
      } else {
        flyCam.camR = Math.max(80, Math.min(4000, flyCam.camR + e.deltaY * 0.5));
        // User-initiated zoom wins over auto-zoom for the rest of this
        // sub-phase. Next sub-phase transition re-arms flyCam.helioAutoZoomActive.
        flyCam.helioAutoZoomActive = false;
        flyCam.updateCam();
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
          flyCam.cislunarCamR = Math.max(minR, Math.min(maxR, flyCam.cislunarCamR * ratio));
          flyCam.autoZoomActive = false;
        } else {
          flyCam.camR = Math.max(80, Math.min(4000, flyCam.camR * ratio));
          flyCam.helioAutoZoomActive = false;
        }
        // Midpoint drift → pan.
        const dx = midX - pinchMidX;
        const dy = midY - pinchMidZ;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          flyCam.panActiveCamera(dx, dy);
        } else if (viewMode === 'cislunar') {
          flyCam.updateCislunarCam();
        } else {
          flyCam.updateCam();
        }
        pinchPrev = dist;
        pinchMidX = midX;
        pinchMidZ = midY;
        return;
      }
      if (!touchActive || e.touches.length !== 1) return;
      flyCam.camT -= (e.touches[0].clientX - lmx) * 0.005;
      flyCam.camP = Math.max(
        0.08,
        Math.min(Math.PI * 0.48, flyCam.camP + (e.touches[0].clientY - lmy) * 0.005),
      );
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      flyCam.updateCam();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchPrev = 0;
      if (e.touches.length === 0) touchActive = false;
      // T-B: pause + re-home gyro for 200ms after a drag (RFC-020 §6).
      gyro.recordTouchEnd();
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


    // W9 wave B: assemble the typed updater handle. Mirrors the 9
    // freestanding `*Ref` assignments above so callers can address
    // one typed object instead of nine nullable refs. Future commits
    // migrate callers off the freestanding refs onto flyUpdaters.*.
    flyUpdaters = {
      helio: {
        rebuildTubeGeometry: buildTubeGeometry,
        apsidesRecompute: recomputeApsides,
        resetCamera: flyCam.helioResetCamera,
        applyDestination: applyDestinationVisuals,
        setContextPlanetsVisible: helioHandles.setContextPlanetsVisible,
        setHillSpheresVisible: helioHandles.setHillSpheresVisible,
        setLagrangePointsVisible: helioHandles.setLagrangePointsVisible,
        updateHillSphereForBody: helioHandles.updateHillSphereForBody,
        setMagnetospheresVisible: helioHandles.setMagnetospheresVisible,
        updateMagnetosphereForBody: helioHandles.updateMagnetosphereForBody,
        setMoonsVisible: helioHandles.setMoonsVisible,
        updateMoonsForParent: helioHandles.updateMoonsForParent,
        setSpacecraftModel: helioMission.applyMissionSpacecraftModel,
        refreshLabelSprites: helioMission.refreshSpriteTextures,
      },
      cislunar: {
        rebuildLines: rebuildCislunarLines,
        rebuildAnnotations: rebuildCislunarAnnotations,
        updateSpacecraft: updateCislunarSpacecraft,
        updateLineProgress: updateCislunarLineProgress,
      },
    };

    // RFC-036 WS-B/1b — the per-frame runner lives in $lib/three/fly-frame-runner.
    // The frame reads AND writes component $state the template binds to; a module
    // can't touch component $state, so those thread through `frameBridge` (get/set
    // accessors; $derived are read-only getters). Every scene ref / handle / updater
    // passes by reference via `frameRefs`. Byte-identical to the old inline onFrame.
    const frameBridge = {
      get activeDestination() { return activeDestination; },
      set activeDestination(v) { activeDestination = v; },
      get arcTimeline() { return arcTimeline; },
      set arcTimeline(v) { arcTimeline = v; },
      get cislunarTrajectory() { return cislunarTrajectory; },
      set cislunarTrajectory(v) { cislunarTrajectory = v; },
      get coastMetDays() { return coastMetDays; },
      set coastMetDays(v) { coastMetDays = v; },
      get conicStateCislunar() { return conicStateCislunar; },
      set conicStateCislunar(v) { conicStateCislunar = v; },
      get container() { return container; },
      set container(v) { container = v; },
      get cutBlackOpacity() { return cutBlackOpacity; },
      set cutBlackOpacity(v) { cutBlackOpacity = v; },
      get debugCamTargetWorld() { return debugCamTargetWorld; },
      set debugCamTargetWorld(v) { debugCamTargetWorld = v; },
      get debugCamWorld() { return debugCamWorld; },
      set debugCamWorld(v) { debugCamWorld = v; },
      get debugMontageShot() { return debugMontageShot; },
      set debugMontageShot(v) { debugMontageShot = v; },
      get descentProfile() { return descentProfile; },
      set descentProfile(v) { descentProfile = v; },
      get descentSpeed() { return descentSpeed; },
      set descentSpeed(v) { descentSpeed = v; },
      get descentT() { return descentT; },
      set descentT(v) { descentT = v; },
      get epilogueActive() { return epilogueActive; },
      set epilogueActive(v) { epilogueActive = v; },
      get epilogueCaptionOpacity() { return epilogueCaptionOpacity; },
      set epilogueCaptionOpacity(v) { epilogueCaptionOpacity = v; },
      get fdPhaseMarkerScreens() { return fdPhaseMarkerScreens; },
      set fdPhaseMarkerScreens(v) { fdPhaseMarkerScreens = v; },
      get finaleBlackOpacity() { return finaleBlackOpacity; },
      set finaleBlackOpacity(v) { finaleBlackOpacity = v; },
      get finaleCaptionOpacity() { return finaleCaptionOpacity; },
      set finaleCaptionOpacity(v) { finaleCaptionOpacity = v; },
      get inCinematicHeldBeat() { return inCinematicHeldBeat; },
      set inCinematicHeldBeat(v) { inCinematicHeldBeat = v; },
      get inMissionFinale() { return inMissionFinale; },
      set inMissionFinale(v) { inMissionFinale = v; },
      get isMoonMission() { return isMoonMission; },
      set isMoonMission(v) { isMoonMission = v; },
      get isPlaying() { return isPlaying; },
      set isPlaying(v) { isPlaying = v; },
      get launchSpeed() { return launchSpeed; },
      set launchSpeed(v) { launchSpeed = v; },
      get launchT() { return launchT; },
      set launchT(v) { launchT = v; },
      get milestoneScreens() { return milestoneScreens; },
      set milestoneScreens(v) { milestoneScreens = v; },
      get mission() { return mission; },
      set mission(v) { mission = v; },
      get openingContextOpacity() { return openingContextOpacity; },
      set openingContextOpacity(v) { openingContextOpacity = v; },
      get openingFleetOpacity() { return openingFleetOpacity; },
      set openingFleetOpacity(v) { openingFleetOpacity = v; },
      get openingTitleOpacity() { return openingTitleOpacity; },
      set openingTitleOpacity(v) { openingTitleOpacity = v; },
      get outPts() { return outPts; },
      set outPts(v) { outPts = v; },
      get phaseMarkerScreens() { return phaseMarkerScreens; },
      set phaseMarkerScreens(v) { phaseMarkerScreens = v; },
      get reducedMotion() { return reducedMotion; },
      set reducedMotion(v) { reducedMotion = v; },
      get retPts() { return retPts; },
      set retPts(v) { retPts = v; },
      get simDay() { return simDay; },
      set simDay(v) { simDay = v; },
      get simSpeed() { return simSpeed; },
      set simSpeed(v) { simSpeed = v; },
      get view() { return view; },
      set view(v) { view = v; },
      get canvas2d() { return canvas2d; },
      set canvas2d(v) { canvas2d = v; },
      get camSnapUntil() { return camSnapUntil; },
      set camSnapUntil(v) { camSnapUntil = v; },
      get epilogueStartedAt() { return epilogueStartedAt; },
      set epilogueStartedAt(v) { epilogueStartedAt = v; },
      get openingStartedAt() { return openingStartedAt; },
      set openingStartedAt(v) { openingStartedAt = v; },
      get openingDurationMs() { return openingDurationMs; },
      set openingDurationMs(v) { openingDurationMs = v; },
      get launchDwellUntil() { return launchDwellUntil; },
      set launchDwellUntil(v) { launchDwellUntil = v; },
      get currentDestMeshId() { return currentDestMeshId; },
      set currentDestMeshId(v) { currentDestMeshId = v; },
      get lastMontageShotKind() { return lastMontageShotKind; },
      set lastMontageShotKind(v) { lastMontageShotKind = v; },
      get isDrag() { return isDrag; },
      set isDrag(v) { isDrag = v; },
      get touchActive() { return touchActive; },
      set touchActive(v) { touchActive = v; },
      get coastDurationDays() { return coastDurationDays; },
      get descentDurationS() { return descentDurationS; },
      get descentSepTimes() { return descentSepTimes; },
      get earthCoast() { return earthCoast; },
      get heliocentricKms() { return heliocentricKms; },
      get interplanetaryPhaseMarkers() { return interplanetaryPhaseMarkers; },
      get launchDurationS() { return launchDurationS; },
      get launchSepTimes() { return launchSepTimes; },
      get phaseMarkers() { return phaseMarkers; },
      get viewMode() { return viewMode; },
      get showLaunch() { return showLaunch; },
      get showCoast() { return showCoast; },
      get showDescent() { return showDescent; },
      get openingActive() { return openingActive; },
      get hasPhaseMarkers() { return hasPhaseMarkers; },
      get cruiseHoldTriggerSimDay() { return cruiseHoldTriggerSimDay; },
    };
    const frameRefs = {
      scene,
      camera,
      renderer,
      cislunarScene,
      cislunarCamera,
      flyCam,
      helioHandles,
      helioReactive,
      cine,
      outLine,
      retLine,
      scSprite,
      plumeMesh,
      plumeMat,
      earthMesh,
      marsMesh,
      moonMesh,
      earthSoI,
      marsSoI,
      moonSoI,
      gravArrowEarth,
      gravArrowSun,
      velocityArrow,
      centripetalArrow,
      coastLine,
      moonOrbitRing,
      depMarker,
      arrMarker,
      retMarker,
      depLabelSprite,
      arrLabelSprite,
      retLabelSprite,
      sunCore,
      sunGlow,
      earthOrbitLine,
      cislunarMoonMeshRef,
      cislunarMoonFrameGroupRef,
      cislunarPhaseLines,
      cisCoastLine,
      cisGravEarthArrow,
      cisGravMoonArrow,
      cisVelocityArrow,
      cisCentripetalArrow,
      cisPeriMarker,
      cisApoMarker,
      helioMission,
      baseFov,
      frameMonitor,
      quality,
      FD_STAGES,
      flyUpdaters,
      dispatchPhase,
      startDescent,
      FLYBY_OVERRIDES,
      FLYBY_PEAK_DAYS,
      SCALE_CISLUNAR,
    };
    const frameRunner = createFlyFrameRunner(frameBridge, frameRefs);
    const loop = createAnimateLoop({ onFrame: frameRunner.frame });
    lifecycle.add(loop.cleanup);
    loop.start();

    // Disposables that aren't a listener live in the same chain. LIFO
    // drain so renderer / el3d teardowns run last; layer-stop watches
    // are only present when their corresponding overlay registered.
    lifecycle.add(() => frameMonitor.stop());
    // Helio + cislunar science-layer listeners unsubscribe via the reactive-layer
    // dispose() handles (RFC-036 WS-B) — including the cislunar lens watch.
    lifecycle.add(helioReactive.dispose);
    lifecycle.add(cisReactive.dispose);
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

<!-- Launch pre-roll overlay (opt-in ?launch=1). Self-contained; dismisses to reveal the transfer scene. -->
{#if showLaunch && launchProfile}
  <LaunchScene
    profile={launchProfile}
    mission={launchDossier}
    {hudHidden}
    onToggleHud={toggleHud}
    bind:t={launchT}
    bind:playing={isPlaying}
    bind:speed={launchSpeed}
    externalClock={true}
    onComplete={() => {
      // ascent → coast (Tier-1 Earth-orbit: loop Earth → re-entry) or → cruise
      // (interplanetary transfer). The reducer forks on earthCoast; showCoast /
      // the cruise fallback follow flyAct. Keep playing so the one continuous
      // timeline from MET 0 flows across the seam.
      dispatchPhase({ type: 'launchComplete' });
      if (earthCoast) coastMetDays = 0;
      isPlaying = true;
    }}
  />
{/if}

{#if showCoast && earthCoast}
  <CoastScene
    coast={earthCoast}
    missionName={mission.name}
    agency={mission.agency ?? mission.agency_full ?? ''}
    {hudHidden}
    onToggleHud={toggleHud}
    externalClock={true}
    t={coastFrac}
    onComplete={() => {
      // Deorbit burn → re-entry act. startDescent() dispatches coast→descent
      // (showCoast falls to false via the reducer).
      startDescent();
    }}
  />
{/if}

{#if showRecovery && descentProfile}
  <div class="recovery-card" role="dialog" aria-label="Recovery">
    <div class="recovery-inner" class:fail={recoveryOutcome.fail}>
      <div class="recovery-eyebrow">{recoveryOutcome.eyebrow}</div>
      <div class="recovery-name">{mission.name}</div>
      <div class="recovery-line">
        {descentProfile.landingSite.lat.toFixed(2)}° {descentProfile.landingSite.lat >= 0
          ? 'N'
          : 'S'},
        {Math.abs(descentProfile.landingSite.lon).toFixed(2)}° {descentProfile.landingSite.lon >= 0
          ? 'E'
          : 'W'}
      </div>
      {#if mission.id && RECOVERY_CAPTIONS[mission.id]}
        <div class="recovery-caption">{RECOVERY_CAPTIONS[mission.id]()}</div>
      {/if}
      <button class="recovery-close" onclick={() => dispatchPhase({ type: 'closeRecovery' })}
        >CLOSE</button
      >
    </div>
  </div>
{/if}

{#if showDescent && descentProfile && descentDossier}
  <DescentScene
    profile={descentProfile}
    mission={descentDossier}
    {hudHidden}
    onToggleHud={toggleHud}
    bind:t={descentT}
    bind:playing={isPlaying}
    bind:speed={descentSpeed}
    externalClock={true}
    onComplete={handleTouchdown}
  />
{/if}

<!-- Segment-transition seam: fade-through-black (see seamFadeOpacity effect). -->
<div
  class="seam-fade"
  class:snap={seamSnap}
  style="opacity:{seamFadeOpacity}"
  aria-hidden="true"
></div>

<!-- Orbit-insertion beat (RFC-034 §12) — an orbiter's capture burn at arrival,
     the mirror of the launch injection burn. Top-center amber callout. -->
{#if oiBeatActive && orbitInsertion && !hudHidden}
  <div class="oi-callout" class:firing={oiFiring}>
    <div class="oi-tag">{orbitInsertion.tag}</div>
    <div class="oi-label">{orbitInsertion.label}</div>
    <div class="oi-status">
      {oiFiring ? 'CAPTURE BURN' : 'APPROACH'}{orbitInsertion.dvKms != null
        ? ` · Δv ${orbitInsertion.dvKms.toFixed(2)} km/s`
        : ''}<ScienceChip tab="mission-phases" section="aerobraking" label="Aerobraking" />
    </div>
  </div>
{/if}

{#snippet flyDebugContent()}
  {#if earthCoast}
    <!-- Tier-1 Earth-orbit re-entry (RFC-034 §13) — pad→coast→re-entry phase state,
         the counterpart of the flyby/cislunar debug for the launch/descent acts. -->
    {@const phase = showLaunch
      ? 'LAUNCH'
      : showCoast
        ? 'COAST'
        : showDescent
          ? 'DESCENT'
          : showRecovery
            ? 'RECOVERY'
            : 'IDLE'}
    {@const renderedLoops = earthCoast.suborbital
      ? 0
      : Math.min(LEO_LOOP_CAP, earthCoast.revolutions)}
    {@const liveRev = Math.min(
      earthCoast.revolutions,
      Math.floor(coastFrac * earthCoast.revolutions) + 1,
    )}
    {@const coastBand = 1 - coastAscentFrac - (descentProfile ? 0.1 : 0)}
    <div class="tier1-debug">
      <div class="t1-header">TIER-1 EARTH-ORBIT · {phase}</div>
      <div class="t1-row">
        <strong>capsule</strong>
        {earthCoast.capsuleId}{earthCoast.suborbital ? ' · SUBORBITAL' : ''}
      </div>
      <div class="t1-row">
        <strong>orbit</strong>
        {earthCoast.perigeeKm}×{earthCoast.apogeeKm} km · {earthCoast.inclinationDeg}° · {earthCoast.revolutions}
        rev · {(earthCoast.coastDurationS / 86400).toFixed(2)}d
      </div>
      <div class="t1-row">
        <strong>coast</strong>
        frac {coastFrac.toFixed(3)} · met {coastMetDays.toFixed(3)}d · REV {liveRev}/{earthCoast.revolutions}
        · rendered {renderedLoops} loops
      </div>
      <div class="t1-row">
        <strong>scrubber</strong>
        u {masterU.toFixed(3)} · ascentFrac {coastAscentFrac.toFixed(3)} · coastBand {coastBand.toFixed(
          3,
        )}
      </div>
      {#if descentSummaryFly}
        <div class="t1-row">
          <strong>re-entry</strong>
          t {descentT.toFixed(0)}/{descentDurationS.toFixed(0)}s · peak {descentSummaryFly.peakDecel.g.toFixed(
            1,
          )}g · TD {descentSummaryFly.touchdownVelocityMs.toFixed(1)} m/s · {descentSummaryFly.touchdownSuccess
            ? 'SURVIVE'
            : 'IMPACT'}
        </div>
      {/if}
      {#if showRecovery}<div class="t1-row">
          <strong>recovery</strong>
          {recoveryOutcome.eyebrow}
        </div>{/if}
    </div>
  {:else if mission.flight?.events && outPts.length > 0}
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
      {@const planetRadiusForDebug = PLANET_SIZES[planetIdGuess] ?? 2.5}
      <FlybyDebugViewer
        planetId={planetIdGuess}
        planetPos={{ x: planetPosForDebug.x * SCALE_3D, z: planetPosForDebug.z * SCALE_3D }}
        planetRadius={planetRadiusForDebug}
        {peakMet}
        liveMet={simDay - arcTimeline.dep_day}
        liveCameraPos={debugCamWorld}
        liveCameraTarget={debugCamTargetWorld}
        activeShot={debugMontageShot}
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
        {#each cislunarHeroEvents as e (e)}
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
  <!-- Mobile top-left: 2D/3D view toggle. The remaining toggles fold into
       the bottom tab accordion, so the canonical view switch lives here. -->
  <div class="fly-top-mobile">
    <button
      type="button"
      class="toggle"
      data-testid="fly-view-toggle-mobile"
      onclick={toggleView}
      aria-pressed={view === '2d'}
    >
      {view === '3d' ? m.fly_label_view_2d() : m.fly_label_view_3d()}
    </button>
  </div>
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
    {@const depYear = mission.dep_label?.match(/\d{4}/)?.[0] ?? ''}
    {@const arrYear = mission.arr_label?.match(/\d{4}/)?.[0] ?? ''}
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
      <div class="opening-actions">
        {#if launchAvailable}
          <button
            type="button"
            class="opening-launch"
            data-testid="fly-opening-launch"
            onclick={startLaunch}
          >
            <span aria-hidden="true">▲</span>
            <span>{m.fly_start_with_launch()}</span>
          </button>
        {/if}
        {#if descentProfile}
          <button
            type="button"
            class="opening-descent"
            data-testid="fly-opening-descent"
            onclick={startDescent}
          >
            <span aria-hidden="true">▼</span>
            <span>{m.fly_skip_to_landing()}</span>
          </button>
        {/if}
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
    class:m-open={mobilePanel === 'mission'}
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
    class:launch-active={showLaunch || showCoast || showDescent}
    aria-label={m.fly_scrub_label()}
  >
    <button
      type="button"
      class="play-btn"
      data-audio-stage="fly-play"
      onclick={masterTogglePlay}
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
           (no zigzag, no escaping the row). Once a launch act is loaded the
           value is the unified pad→arrival master fraction (RFC-034 §4). -->
      <div class="scrub-visual" aria-hidden="true">
        <div class="scrub-fill" style="width: {scrubValue * 100}%"></div>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={scrubValue}
        oninput={hasLaunchAct ? onMasterScrub : onScrub}
        onpointerdown={onScrubStart}
        onpointerup={onScrubEnd}
        onpointercancel={onScrubEnd}
        class="scrub"
        aria-label={m.fly_scrub_label()}
      />
      {#if arcTotalDays > 0 && mission.flight?.events && !showLaunch}
        <div class="milestone-track" data-testid="milestone-track">
          {#each mission.flight.events as evt, idx (idx + '@' + evt.met_days + '@' + (evt.label ?? ''))}
            {#if evt.label && evt.met_days != null}
              {@const pct = cruiseTickPct(evt.met_days)}
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
      {#if arcTotalDays > 0 && fdScrubberTicks.length > 0 && !showLaunch}
        <div class="fd-stage-track" data-testid="fd-stage-track">
          {#each fdScrubberTicks as t (t.id)}
            {@const past = t.met_days < simDay - arcTimeline.dep_day}
            <button
              type="button"
              class="fd-stage-tick-button"
              class:past
              style="left: {cruiseTickPct(t.met_days)}%;"
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
      <!-- Mobile: single active-speed slot; tap to reveal all speeds stacked
           above so the scrubber track reclaims the horizontal space. -->
      <div class="speed-slot">
        <button
          type="button"
          class="speed-pill"
          class:active={isPlaying}
          aria-expanded={speedPopoverOpen}
          aria-haspopup="listbox"
          aria-label="{activeSpeed}× — {m.fly_speed_label()}"
          onclick={() => (speedPopoverOpen = !speedPopoverOpen)}>{activeSpeed}×</button
        >
        {#if speedPopoverOpen}
          <div class="speed-popover" role="listbox" aria-label={m.fly_speed_label()}>
            {#each speedPills as sp (sp)}
              <button
                type="button"
                class="speed-pill"
                class:active={activeSpeed === sp}
                role="option"
                aria-selected={activeSpeed === sp}
                onclick={() => {
                  masterSetSpeed(sp);
                  speedPopoverOpen = false;
                }}>{sp}×</button
              >
            {/each}
          </div>
        {/if}
      </div>
      <!-- Desktop: all speed pills visible inline. -->
      {#each speedPills as sp (sp)}
        <button
          type="button"
          class="speed-pill speed-desktop-pill"
          class:active={activeSpeed === sp}
          onclick={() => masterSetSpeed(sp)}
        >
          {sp}×
        </button>
      {/each}
    </div>
  </div>

  <!-- Toggle controls shared between desktop inline and mobile drawer.
       Single snippet avoids double-rendering (S6 mobile de-clutter). -->
  {#snippet flyToggles()}
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
  {/snippet}

  <!-- Desktop (≥768 px): inline fixed clusters, hidden on mobile via CSS. -->
  <div class="fly-toggle-rows-desktop">
    {@render flyToggles()}
  </div>

  <!-- Mobile (≤767 px): the toggle drawer is replaced by the bottom tab
       accordion below (hidden on phones via CSS). -->
  <div class="fly-mobile-view-drawer" style="--mcd-bottom:88px">
    <MobileControlsDrawer label="View" children={flyToggles} />
  </div>

  <!-- Mobile (≤767 px): bottom tab accordion — one HUD panel open at a time
       so the 3D scene stays the hero. MISSION / EVENTS / PHASE fold in the
       free-floating panels; PHASE is lens-gated. -->
  <div class="fly-mtabs" role="group" aria-label={m.fly_view_toggles_aria()}>
    <button
      type="button"
      class="fly-mtab"
      class:active={mobilePanel === 'mission'}
      aria-pressed={mobilePanel === 'mission'}
      onclick={() => setMobilePanel('mission')}
    >
      MISSION
    </button>
    <button
      type="button"
      class="fly-mtab"
      class:active={mobilePanel === 'events'}
      aria-pressed={mobilePanel === 'events'}
      onclick={() => setMobilePanel('events')}
    >
      EVENTS
    </button>
    {#if lensOnState}
      <button
        type="button"
        class="fly-mtab"
        class:active={mobilePanel === 'phase'}
        aria-pressed={mobilePanel === 'phase'}
        onclick={() => setMobilePanel('phase')}
      >
        PHASE
      </button>
    {/if}
  </div>

  <!-- CAPCOM panel: shown when a mission is loaded AND the user hasn't
       dismissed it via the CAP toggle in the top-right row. -->
  {#if mission && showCapcom}
    <aside
      class="capcom-panel"
      class:cinematic-hidden={inCinematicHeldBeat}
      class:m-open={mobilePanel === 'events'}
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
    available={availableLayers}
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
  <div
    class="fly-bottom-strips"
    class:cinematic-hidden={inCinematicHeldBeat}
    class:m-open={mobilePanel === 'phase'}
  >
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
  <div class="fly-bottom-strips" class:m-open={mobilePanel === 'phase'}>
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
  /* Orbit-insertion beat (RFC-034 §12) — top-center amber capture-burn callout
     at an orbiter's arrival, mirroring the launch injection-burn callout. */
  /* Segment-transition seam pulse — a brief dark dip that softens the instant
     launch/coast/descent overlay swap into a clean beat. */
  .seam-fade {
    position: fixed;
    inset: 0;
    z-index: 250;
    pointer-events: none;
    background: #03040a;
    transition: opacity 0.42s ease-out;
  }
  .seam-fade.snap {
    transition: none;
  }
  .oi-callout {
    position: fixed;
    top: 74px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 60;
    text-align: center;
    padding: 8px 20px;
    border: 1px solid rgba(255, 190, 74, 0.45);
    border-radius: 6px;
    background: rgba(20, 12, 4, 0.6);
    backdrop-filter: blur(6px);
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .oi-callout.firing {
    border-color: rgba(255, 190, 74, 0.9);
    box-shadow: 0 0 24px rgba(255, 160, 40, 0.4);
    animation: oi-pulse 1.1s ease-in-out infinite;
  }
  @keyframes oi-pulse {
    0%,
    100% {
      box-shadow: 0 0 18px rgba(255, 160, 40, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(255, 180, 60, 0.55);
    }
  }
  .oi-tag {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 4px;
    color: #ffcf6a;
    line-height: 1;
  }
  .oi-label {
    font-size: 11px;
    letter-spacing: 2px;
    color: #ffe0b0;
    margin-top: 3px;
  }
  .oi-status {
    font-size: 10px;
    letter-spacing: 2px;
    color: #ffbe7a;
    margin-top: 3px;
  }

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
  /* Tier-1 Earth-orbit re-entry debug (RFC-034 §13). */
  .tier1-debug {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.82rem;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .t1-header {
    font-weight: 600;
    letter-spacing: 0.05em;
    opacity: 0.75;
  }
  .t1-row strong {
    display: inline-block;
    min-width: 5.5rem;
    opacity: 0.6;
    font-weight: 500;
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
      0 0 10px rgba(127, 212, 255, 0.95),
      0 0 4px rgba(255, 255, 255, 0.7);
    animation: milestone-pulse 1.6s ease-in-out infinite;
  }
  @keyframes milestone-pulse {
    0%,
    100% {
      transform: translate(-50%, -50%) rotate(45deg) scale(1);
      box-shadow:
        0 0 10px rgba(127, 212, 255, 0.95),
        0 0 4px rgba(255, 255, 255, 0.7);
    }
    50% {
      transform: translate(-50%, -50%) rotate(45deg) scale(1.35);
      box-shadow:
        0 0 18px rgba(127, 212, 255, 1),
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(45, 212, 168, 0.85);
    text-shadow:
      0 0 4px rgba(8, 10, 22, 0.95),
      0 0 8px rgba(8, 12, 24, 0.42);
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
      0 0 6px rgba(127, 212, 255, 0.55),
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
    color: rgba(127, 212, 255, 0.98);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 5px;
    color: rgba(127, 212, 255, 0.85);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 5px;
    color: rgba(127, 212, 255, 0.85);
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
    color: rgba(127, 212, 255, 0.95);
    outline: none;
  }
  .opening-years {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    border-top: 1px solid rgba(127, 212, 255, 0.18);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2.5px;
    color: rgba(127, 212, 255, 0.7);
    text-transform: uppercase;
  }
  .opening-stat-val {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    border-top: 1px solid rgba(127, 212, 255, 0.18);
    padding-top: 14px;
  }
  .opening-fleet-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    background: rgba(8, 12, 24, 0.42);
    border: 1px solid rgba(127, 212, 255, 0.35);
    border-radius: 4px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .opening-fleet-role {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(127, 212, 255, 0.8);
    text-transform: uppercase;
  }
  .opening-fleet-id {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    border: 1px solid rgba(127, 212, 255, 0.35);
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
    border: 1px solid rgba(127, 212, 255, 0.5);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.92);
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    background: rgba(127, 212, 255, 0.15);
    border-color: rgba(127, 212, 255, 0.9);
    color: #fff;
    outline: none;
  }
  .opening-skip-arrow {
    font-size: 14px;
    color: rgba(127, 212, 255, 0.85);
  }
  .opening-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 4px;
  }
  /* Earth re-entry recovery card (RFC-034 §13) — the Tier-1 splashdown terminus. */
  /* 2026 clean recovery terminus — a subtle scrim (the flight has ended) + a
     top accent hairline, no bordered panel. Matches the coast/descent language. */
  .recovery-card {
    position: fixed;
    inset: 0;
    z-index: 260;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 42%, rgba(8, 18, 30, 0.35), rgba(0, 0, 0, 0.55));
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .recovery-inner {
    text-align: center;
    color: #eaf3ff;
    display: grid;
    gap: 0.55rem;
    padding: 1.4rem 2.6rem 2rem;
    border-top: 1px solid rgba(127, 212, 255, 0.4);
    max-width: 30rem;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  }
  .recovery-inner.fail {
    border-top-color: rgba(255, 120, 96, 0.55);
  }
  .recovery-eyebrow {
    color: #7fd4ff;
    letter-spacing: 0.24em;
    font-size: 0.7rem;
  }
  .recovery-inner.fail .recovery-eyebrow {
    color: #ff8a6a;
  }
  .recovery-caption {
    color: #a9c0d8;
    font-size: 0.82rem;
    line-height: 1.5;
    margin-top: 0.4rem;
  }
  .recovery-name {
    font-size: 1.6rem;
    letter-spacing: 0.03em;
  }
  .recovery-line {
    color: #8ba2ba;
    font-size: 0.9rem;
  }
  .recovery-close {
    margin-top: 0.8rem;
    justify-self: center;
    background: transparent;
    color: #7fd4ff;
    border: 1px solid rgba(127, 212, 255, 0.45);
    border-radius: 4px;
    padding: 0.45rem 1.3rem;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    cursor: pointer;
  }
  .recovery-close:hover {
    border-color: rgba(127, 212, 255, 0.8);
  }
  /* START WITH LAUNCH — the launch-act entry point (amber accent). */
  .opening-launch {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 22px;
    background: rgba(22, 14, 6, 0.55);
    border: 1px solid rgba(255, 190, 74, 0.55);
    border-radius: 4px;
    color: rgba(255, 236, 200, 0.95);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
  }
  .opening-launch:hover,
  .opening-launch:focus-visible {
    background: rgba(255, 190, 74, 0.18);
    border-color: rgba(255, 190, 74, 0.95);
    color: #fff;
    outline: none;
  }
  /* Descent CTA (landing missions) — the EDL counterpart of START WITH LAUNCH,
     tinted the descent copper/salmon so it reads as the opposite bookend. */
  .opening-descent {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 22px;
    background: rgba(20, 12, 8, 0.55);
    border: 1px solid rgba(216, 168, 130, 0.55);
    border-radius: 4px;
    color: rgba(240, 216, 191, 0.95);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
  }
  .opening-descent:hover,
  .opening-descent:focus-visible {
    background: rgba(216, 168, 130, 0.18);
    border-color: rgba(216, 168, 130, 0.95);
    color: #fff;
    outline: none;
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
    border: 1px solid rgba(127, 212, 255, 0.25);
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
    border-color: rgba(127, 212, 255, 0.65);
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
    color: rgba(127, 212, 255, 0.75);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  /* During the launch act the LaunchScene overlay sits at z-index 200; the
     unified master scrubber must out-stack it so pad→arrival is one control. */
  .scrubber.launch-active {
    z-index: 210;
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  @media (hover: hover) and (pointer: fine) {
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  @media (hover: hover) and (pointer: fine) {
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #fff;
    text-transform: uppercase;
  }
  .milestone-tooltip-met {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  /* Mobile: single active-speed slot + tap-to-reveal stacked popover (matches
     /explore) so the scrubber track reclaims the horizontal space. */
  .speed-slot {
    display: none;
    position: relative;
  }
  .speed-popover {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(8, 10, 22, 0.95);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 5px;
    padding: 3px;
    min-width: 48px;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  @media (hover: none), (pointer: coarse) {
    .speed-slot {
      display: block;
    }
    .speed-desktop-pill {
      display: none;
    }
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
  /* New mobile-only chrome (tab accordion + top-left view toggle) — hidden
     on desktop; revealed at ≤767 below. */
  .fly-top-mobile,
  .fly-mtabs {
    display: none;
  }

  /* ─── ≤ 767 px — HUD folds into the bottom tab accordion ────────── */
  @media (hover: none), (pointer: coarse) {
    .fly-toggle-rows-desktop {
      display: none;
    }
    /* The single "Show HUD" pile-reveal + the toggle drawer are replaced by
       the bottom tab accordion (MISSION / EVENTS / PHASE). */
    .hud-collapse,
    .fly-mobile-view-drawer {
      display: none;
    }
    /* Top-left: 2D/3D view toggle (rest of the toggles fold into the tabs). */
    .fly-top-mobile {
      display: flex;
      position: fixed;
      top: calc(var(--nav-height) + 8px);
      left: 8px;
      gap: 6px;
      z-index: 45;
    }
    /* Bottom tab bar — mirrors the MobileDrawerGroup look used on the other
       routes. Sits just above the scrubber. */
    .fly-mtabs {
      display: flex;
      position: fixed;
      bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      left: 8px;
      right: 8px;
      gap: 5px;
      z-index: 41;
    }
    .fly-mtab {
      flex: 1 1 0;
      min-width: 0;
      min-height: 40px;
      background: rgba(8, 10, 22, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: rgba(255, 255, 255, 0.6);
      font-family: var(--font-mono, 'Space Mono', monospace);
      font-size: 10px;
      letter-spacing: 1.5px;
      border-radius: 6px;
      cursor: pointer;
      backdrop-filter: blur(6px);
    }
    .fly-mtab.active {
      background: rgba(68, 102, 255, 0.18);
      border-color: rgba(68, 102, 255, 0.7);
      color: #dde4ff;
    }
    /* Landscape inline row — parity with explore's bottomInline drawer: the
       view-switch pills drop to the scrubber's line and right-align to
       content-width; the scrubber yields room on the right so both share ONE
       bottom row instead of stacking. Same chosen side everywhere (strip left,
       buttons right). */
    :global(html[data-touch][data-orientation='landscape']) .fly-mtabs {
      bottom: 14px;
      left: auto;
      right: 16px;
      gap: 5px;
    }
    :global(html[data-touch][data-orientation='landscape']) .fly-mtab {
      flex: 0 0 auto;
      min-width: 0;
      min-height: 34px;
      padding: 6px 14px;
    }
    :global(html[data-touch][data-orientation='landscape']) .scrubber {
      right: 280px;
    }
    /* HUD panels hidden by default (scene = hero); the active tab reveals ONE
       as a bottom sheet above the tab bar + scrubber. */
    .hud-stack:not(.m-open),
    .capcom-panel:not(.m-open),
    .fly-bottom-strips:not(.m-open) {
      display: none;
    }
    .hud-stack.m-open,
    .capcom-panel.m-open,
    .fly-bottom-strips.m-open {
      position: fixed;
      top: auto;
      bottom: calc(132px + env(safe-area-inset-bottom, 0px));
      left: 8px;
      right: 8px;
      width: auto;
      max-width: none;
      max-height: 44vh;
      overflow-y: auto;
      z-index: 39;
    }
    .hud-stack.m-open {
      gap: 8px;
      pointer-events: auto;
    }
    /* MISSION tab: surface the panels hidden on mobile by default + let each
       fill the sheet width instead of the fixed 220px rail width. */
    .hud-stack.m-open .hud {
      width: auto;
      min-width: 0;
    }
    .hud-stack.m-open .hud-navigation,
    .hud-stack.m-open .hud-systems,
    .hud-stack.m-open .hud-flight-params {
      display: flex;
    }
    /* PHASE tab: the FD + conic strips are centered rows on desktop; let them
       stack full-width in the sheet. */
    .fly-bottom-strips.m-open {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: rgba(255, 255, 255, 0.85);
  }
  .capcom-header {
    flex-shrink: 0;
  }
  /* ─── ≥ 768 px — capcom-panel becomes right-pinned 320 px column ─
     Mobile-first inversion: phone bottom-sheet is the base; desktop
     restores the historical "tall right column" layout. */
  @media (hover: hover) and (pointer: fine) {
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
