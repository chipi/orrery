<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import {
    earthPos,
    marsPos,
    destinationPos,
    transferEllipse,
    returnArc,
    spacecraftPos,
    spacecraftHeading,
    type MissionTimeline,
    type Vec2,
  } from '$lib/mission-arc';
  import {
    DESTINATIONS,
    R_EARTH_AU,
    R_MARS_AU,
    type DestinationId,
  } from '$lib/lambert-grid.constants';
  import { getMission, getMissionIndex, getScenario } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { parseDeltaV } from '$lib/parse-delta-v';
  import { dateToSimDay } from '$lib/sim-day';
  import { mergeFlightEvents } from '$lib/mission-event-merge';
  import {
    missionDestToDataFolder,
    missionDestToHeliocentricDestinationId,
  } from '$lib/mission-dest';
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
    buildCislunarTrajectory,
    moonEciPos,
    type CislunarTrajectory,
    type Vec3Km,
  } from '$lib/cislunar-geometry';
  import { AU_TO_KM, MOON_VISUAL_DISTANCE } from '$lib/fly-physics-constants';
  import { onReducedMotionChange, prefersReducedMotion } from '$lib/reduced-motion';
  import type { FlightDataQuality, FlightParams, Mission, MissionEvent } from '$types/mission';
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
    integrateCoast,
    classifyConic,
  } from '$lib/orbit-overlays';
  import ConicSectionPanel from '$lib/components/ConicSectionPanel.svelte';
  import { isLayerOn, onLayerChange } from '$lib/science-layers';
  import { isScienceLensOn, onScienceLensChange } from '$lib/science-lens';

  // Polyline curve: getPoint(t) returns piecewise-linear interp
  // between control points — exactly mirrors lerpPoint(out, t)
  // used to position the spacecraft. Replaces CatmullRomCurve3
  // (centripetal parameterisation: getPoint(t) drifts off the
  // control-point lerp because adjacent-chord lengths vary on a
  // ν-uniformly-sampled ellipse). The mismatch made the 3D past-
  // tube drawRange run ahead of the spacecraft sprite.
  class PolylineCurve3 extends THREE.Curve<THREE.Vector3> {
    points: THREE.Vector3[];
    constructor(points: THREE.Vector3[]) {
      super();
      this.points = points;
    }
    getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
      const last = this.points.length - 1;
      const f = Math.max(0, Math.min(1, t)) * last;
      const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
      return target.lerpVectors(this.points[i], this.points[i + 1], f - i);
    }
  }

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

  type LoadedMission = {
    name: string;
    vehicle: string;
    payload: string;
    dv_total: number;
    dv_used: number;
    dep_label: string;
    arr_label: string;
    timeline: MissionTimeline;
    isFromData: boolean;
    /** Real flight params from the mission JSON (ADR-027). Optional;
     *  surfaces in the FLIGHT PARAMS HUD group when present. */
    flight?: FlightParams;
    flight_data_quality?: FlightDataQuality;
  };

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
  // 600 segments: enough that the linear-interp spacecraft position
  // sits visually on the CatmullRom-splined tube (chord-vs-spline gap
  // is sub-pixel between adjacent waypoints at this density).
  const ARC_STEPS = 600;

  // Moon's heliocentric visual orbit radius around Earth, in AU. Real
  // is 0.0026 AU (~0.21 scene units) — too small to see at the same
  // SCALE_3D where Mars sits 80 units from the Sun. Exaggerated to
  // 0.4 AU (~32 scene units) so the cislunar trip occupies roughly the
  // same visual span as Earth→Mars (≈40 units) and the trajectory has
  // room to read as a real journey rather than a compressed arc next
  // to a fat Earth mesh. Earth's heliocentric orbit ring (radius 80u)
  // still encloses the Moon, just with more visible breathing room
  // around it.
  const MOON_FLY_RADIUS_AU = 0.4;
  // Sidereal lunar month — Moon's heliocentric visual orbit period.
  const MOON_PERIOD_DAYS = 27.32;

  /** Heliocentric position of the Moon at simDay (live), with the
   *  exaggerated MOON_FLY_RADIUS_AU offset. */
  function moonHelioPos(day: number): Vec2 {
    const earth = earthPos(day);
    const angle = ((day % MOON_PERIOD_DAYS) / MOON_PERIOD_DAYS) * Math.PI * 2;
    return {
      x: earth.x + Math.cos(angle) * MOON_FLY_RADIUS_AU,
      z: earth.z + Math.sin(angle) * MOON_FLY_RADIUS_AU,
    };
  }

  /** Cislunar trajectory in heliocentric AU. Both endpoints are
   *  pinned exactly (start at depDay, end at arrDay); intermediate
   *  points ride Earth's orbital motion + linearly blend the
   *  Earth-relative offset from start-offset to end-offset. For 4-day
   *  Apollo this is essentially a slow drift along Earth's orbit + a
   *  small hop, which reads correctly at the heliocentric scale used
   *  by the rest of /fly. Symmetric: pass start=Earth, end=Moon for
   *  outbound; start=Moon, end=Earth for return. */
  function moonHelioArc(
    depDay: number,
    arrDay: number,
    start: Vec2,
    end: Vec2,
    steps: number,
  ): Vec2[] {
    const startOffX = start.x - earthPos(depDay).x;
    const startOffZ = start.z - earthPos(depDay).z;
    const endOffX = end.x - earthPos(arrDay).x;
    const endOffZ = end.z - earthPos(arrDay).z;
    const pts: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const earthAtT = earthPos(depDay + t * (arrDay - depDay));
      const offX = startOffX + (endOffX - startOffX) * t;
      const offZ = startOffZ + (endOffZ - startOffZ) * t;
      pts.push({ x: earthAtT.x + offX, z: earthAtT.z + offZ });
    }
    return pts;
  }

  function buildArcs(
    timeline: MissionTimeline,
    isFreeReturn: boolean,
    destinationId: DestinationId = 'mars',
    arrivalVInfKms?: number | null,
  ): { out: Vec2[]; ret: Vec2[] } {
    // Outbound: true two-point Keplerian ellipse with Sun at one focus.
    // Both endpoints land EXACTLY on live planet positions — Earth at
    // dep_day, destination at arr_day (or flyby_day for free-return).
    // Replaces the older outboundArc + post-hoc rotation, which could
    // only pin one endpoint.
    const earthDep = earthPos(timeline.dep_day);
    // Outbound terminates at flyby_day for free-return AND round-trip
    // Mars / Moon (the destination rendezvous is mid-mission). For
    // one-way landings flyby_day == arr_day so this is also the
    // landing day. Always using flyby_day keeps the math uniform.
    const destArr =
      destinationId === 'mars'
        ? marsPos(timeline.flyby_day)
        : destinationPos(timeline.flyby_day, destinationId);
    const out = transferEllipse(earthDep, destArr, ARC_STEPS, arrivalVInfKms);
    if (!isFreeReturn) return { out, ret: [] };
    // Free-return Mars: return arc starts at the outbound terminus
    // (== Mars at flyby_day) and ends at live Earth at arr_day, so
    // re-entry visually meets Earth.
    const earthRet = earthPos(timeline.arr_day);
    const ret = returnArc(out[out.length - 1], earthRet, ARC_STEPS);
    return { out, ret };
  }

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
  let simSpeed = $state(7); // days/sec
  // ADR-025: reduced-motion users start paused. They can press play
  // to step forward manually. We also subscribe to changes so an
  // OS-level toggle mid-session pauses the sim live (post-v1.0
  // audit — /explore + /moon already did this; /fly was init-only).
  let isPlaying = $state(!prefersReducedMotion());
  const stopReducedMotionWatch = onReducedMotionChange((reduced) => {
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
  // v0.1.10: each arc is rendered as a pair of tubes — "future" is the
  // full dim path, "past" is the bright path whose drawRange grows
  // each frame from 0 → end as the spacecraft progresses. The
  // resulting visual is a glowing trail behind the spacecraft over a
  // muted preview of the path ahead.
  let outLineFuture: THREE.Mesh | undefined;
  let retLineFuture: THREE.Mesh | undefined;
  let rebuildTubeGeometry: ((pts: Vec2[], radius: number) => THREE.BufferGeometry) | undefined;
  /** Apsides marker recompute (Phase H.4). Hoisted from startThree
   * so the outPts $effect can refresh marker positions when the
   * mission changes. */
  let apsidesRecompute: (() => void) | undefined;
  // Camera reset callback assigned inside onMount; applyMissionAsLoaded /
  // applyPlanSelection call it so each new mission gets a fresh frame
  // showing the new launch + arrival positions.
  let resetCamera: (() => void) | undefined;
  // Departure + arrival markers — per-mission fixed rings at Earth's
  // position on dep_day and Mars's (or destination's) position on
  // arr_day. Updated whenever a new mission loads so each mission has
  // a visibly distinct anchor pair, not just a different arc curve.
  let depMarker: THREE.Mesh | undefined;
  let arrMarker: THREE.Mesh | undefined;
  let depLabelSprite: THREE.Sprite | undefined;
  let arrLabelSprite: THREE.Sprite | undefined;
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
  let rebuildCislunarLinesRef: ((traj: CislunarTrajectory | null) => void) | undefined;
  let rebuildCislunarAnnotationsRef:
    | ((
        traj: CislunarTrajectory | null,
        profile: import('$lib/cislunar-geometry').CislunarProfile | undefined,
      ) => void)
    | undefined;
  let updateCislunarSpacecraftRef:
    | ((traj: CislunarTrajectory | null, met_days: number) => void)
    | undefined;
  // Refresh-callback for the LAUNCH / ARRIVAL sprite textures. Assigned
  // in onMount; called from a $effect whenever the mission or its
  // dates change so each mission shows its actual launch/arrival
  // labels — e.g. "LAUNCH · 2011-11-26" and "MARS · 2012-08-06".
  let refreshLabelSprites:
    | ((
        depLine1: string,
        depLine2: string,
        depColor: string,
        arrLine1: string,
        arrLine2: string,
        arrColor: string,
      ) => void)
    | undefined;
  const SCALE_3D = 80;

  /** ADR-028: direct-Hohmann caveat for giants + Pluto on /plan-driven flights. */
  const GRAVITY_ASSIST_CAVEAT_DESTINATIONS: DestinationId[] = [
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ];

  // Per-destination accent for the ARRIVAL sprite. Earth blue (#4b9cd3)
  // is reserved for LAUNCH so the two sprites always read as a pair.
  const DESTINATION_LABEL_COLORS: Record<DestinationId | 'moon', string> = {
    mercury: '#b8b8b8',
    venus: '#e8d175',
    mars: '#c1440e',
    jupiter: '#d4a373',
    saturn: '#e8c890',
    uranus: '#7de8e8',
    neptune: '#6b8cff',
    pluto: '#c8a98a',
    ceres: '#7c8b9a',
    moon: '#cfcfcf',
  };

  let showPlanOuterTrajectoryCaveat = $derived(
    !isMoonMission &&
      mission.name.startsWith('EARTH →') &&
      GRAVITY_ASSIST_CAVEAT_DESTINATIONS.includes(activeDestination),
  );

  // Per-destination camera reset distance, scene units. Tuned so the
  // destination's orbit ring fills a comfortable fraction of the view.
  // Scene scale: 1 AU = SCALE_3D = 80 units. Moon-mode is a separate
  // Earth-Moon scale where the Moon sits at MOON_VISUAL_DISTANCE = 100.
  function cameraDistanceFor(destinationId: DestinationId, moonMode: boolean): number {
    // Moon-mode: framed for the Earth+Moon pair (Apollo arc now spans
    // ~32 scene units after the MOON_FLY_RADIUS_AU bump from 0.15 →
    // 0.4 AU). Camera at ~100u gives both planets + the full arc room
    // to breathe — Sun stays off-camera unless the user pans out.
    if (moonMode) return 100;
    const orbitUnits = DESTINATIONS[destinationId].a * SCALE_3D;
    return Math.max(180, orbitUnits * 2.0);
  }

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
    if (!outLine || !retLine || !outLineFuture || !retLineFuture || !rebuildTubeGeometry) return;
    // Moon-mode tubes get a thinner radius — the cislunar arc spans
    // ~32 scene units (Earth-Moon at exaggerated 0.4 AU, vs ~40 for an
    // Earth→Mars Hohmann), and the camera sits closer (≈100u vs
    // ≈200u). 0.25u keeps the arc legible while restoring the
    // proportional sense of distance between Earth and the Moon —
    // the 0.6u heliocentric radius read as a fat sausage. Same scale
    // factor re-applies to dep / arr markers + label sprites below.
    const outRadius = isMoonMission ? 0.25 : 0.6;
    const retRadius = isMoonMission ? 0.2 : 0.5;
    outLine.geometry.dispose();
    outLine.geometry = rebuildTubeGeometry(outArc, outRadius);
    outLineFuture.geometry.dispose();
    outLineFuture.geometry = rebuildTubeGeometry(outArc, outRadius);
    retLine.geometry.dispose();
    retLine.geometry = rebuildTubeGeometry(retArc, retRadius);
    retLineFuture.geometry.dispose();
    retLineFuture.geometry = rebuildTubeGeometry(retArc, retRadius);
    apsidesRecompute?.();
    const hasReturn = retArc.length >= 2;
    retLine.visible = hasReturn;
    retLineFuture.visible = hasReturn;
  });

  // Position the per-mission DEPARTURE + ARRIVAL anchor rings + their
  // labels whenever arcTimeline or activeDestination changes. The
  // rings + sprites are created in onMount; this effect is a no-op
  // until they exist. Sprites float ~6u above the marker rings so
  // they don't z-fight with the ring geometry.
  $effect(() => {
    // Read state FIRST so Svelte 5 tracks outPts + isMoonMission as
    // deps even on the bail-out path (refs not yet defined). Same
    // tracking-bug shape as the arc-rebuild $effect: the initial run
    // early-returns before reading either, so subsequent mission
    // loads never re-run this effect and the markers stay invisible.
    const arc = outPts;
    const moonMode = isMoonMission;
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
    const arrLabel = mission.arr_label || '—';
    if (!refreshLabelSprites) return;
    // Label both ends "LAUNCH" / "ARRIVAL" to match the 2D canvas
    // anchor labels — the destination is already implied by the arc
    // colour (Mars-red torus etc.) and the date stamp on line 2.
    const arrName = 'ARRIVAL';
    const arrColor = moonMode ? DESTINATION_LABEL_COLORS.moon : DESTINATION_LABEL_COLORS[dest];
    refreshLabelSprites('LAUNCH', depLabel, '#4b9cd3', arrName, arrLabel, arrColor);
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

  /** Earth-centric conic classifier — same energy/angular-momentum
   *  math as classifyConic() but with μ_earth in km³/s². Used for the
   *  cislunar Conics overlay when a Moon mission is active. */
  function classifyConicEarth(
    r: { x: number; y: number; z: number },
    v: { x: number; y: number; z: number },
  ): {
    shape: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
    a: number;
    e: number;
    epsilon: number;
  } {
    const MU = 398600.4418; // km³/s²
    const rMag = Math.hypot(r.x, r.y, r.z);
    const vMag2 = v.x * v.x + v.y * v.y + v.z * v.z;
    const epsilon = vMag2 / 2 - MU / rMag;
    const hx = r.y * v.z - r.z * v.y;
    const hy = r.z * v.x - r.x * v.z;
    const hz = r.x * v.y - r.y * v.x;
    const h2 = hx * hx + hy * hy + hz * hz;
    const eSquared = 1 + (2 * epsilon * h2) / (MU * MU);
    const e = Math.sqrt(Math.max(0, eSquared));
    const a = epsilon !== 0 ? -MU / (2 * epsilon) : Infinity;
    const refScale = MU / rMag;
    let shape: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
    if (Math.abs(epsilon) < 0.005 * refScale) shape = 'parabola';
    else if (epsilon > 0) shape = 'hyperbola';
    else if (e < 0.001) shape = 'circle';
    else shape = 'ellipse';
    return { shape, a, e, epsilon };
  }
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
  function onScrub(event: Event) {
    const t = parseFloat((event.target as HTMLInputElement).value);
    simDay = arcTimeline.dep_day + t * arcTotalDays;
  }

  // ─── Mission loading from URL (?mission=id) ──────────────────────
  // Race-guarded by a monotonic loadId — if a newer URL change comes
  // in while a previous load is in flight, the older promise resolves
  // into a no-op rather than overwriting the newer state.
  let loadFailed = $state(false);
  let currentLoadId = 0;

  function applyMissionAsLoaded(m: Mission) {
    // Per-mission arc geometry: parse the mission's actual departure
    // date into a sim-day count so Earth's heliocentric phase at
    // launch matches reality. transit_days drives arr_day. For
    // one-way landings flyby_day == arr_day (landing IS arrival,
    // there is no separate flyby waypoint); for sample-return /
    // crewed round-trips flyby_day is 95% of transit (closest
    // approach before the return burn). The previous unconditional
    // 0.95*tof flyby left one-way missions with a "rocket waits"
    // gap between scrub 0.95 and 1.0 — the spacecraft hit the arc
    // terminus at flyby_day and idled there until arr_day.
    //
    // Historical Mars missions don't return to Earth — we render only
    // the outbound arc. Free-return scenarios get both arcs (handled
    // by applyScenarioAsLoaded).
    const totalT = m.transit_days || 250;
    const dvTotal = parseDeltaV(m.delta_v, defaultScenarioBase.dv_total_km_s);
    // Fall back to the default scenario's dep_day if the mission's
    // departure_date is missing or unparseable (defence in depth —
    // schema requires the field, but the helper returns null on
    // anything that doesn't match YYYY-MM-DD).
    const depDay = dateToSimDay(m.departure_date) ?? defaultScenarioBase.dep_day;
    const missionType = (m.type ?? '').toUpperCase();
    const isReturnTrip = missionType.includes('SAMPLE RETURN') || missionType.includes('CREWED');
    // For one-way landings (Curiosity, Chandrayaan-3, etc.) the mission
    // ends at destination touchdown — flyby_day == arr_day so the
    // spacecraft doesn't idle between scrub 0.95 and 1.0. For round-
    // trips (Apollo, Luna 24) transit_days is the one-way leg, so the
    // full mission spans 2× transit_days: arrives at destination at
    // flyby_day = dep + transit, returns to Earth at arr_day = dep +
    // 2*transit. The scrub bar then maps cleanly: scrub 0..0.5 outbound,
    // 0.5..1.0 return.
    const flybyOffset = totalT;
    const arrOffset = isReturnTrip ? totalT * 2 : totalT;
    const newTimeline: MissionTimeline = {
      dep_day: depDay,
      flyby_day: depDay + flybyOffset,
      arr_day: depDay + arrOffset,
    };
    arcTimeline = newTimeline;
    isFreeReturn = false;
    isMoonMission = m.dest === 'MOON';
    activeDestination = missionDestToHeliocentricDestinationId(m.dest) ?? ('mars' as DestinationId);
    // isReturnTrip is computed above (it gates flybyOffset). Sample-
    // return missions: Luna 24, Chang'e 5/6. Crewed: Apollo, Artemis 3.
    // Drives the second tube-mesh rendering of the return arc below.
    if (isMoonMission) {
      // ADR-058: build the Earth-centred cislunar trajectory from the
      // mission's flight.cislunar_profile and auto-switch the view.
      // The heliocentric moonHelioArc below is still rendered so the
      // "Solar context" inset (Stage 1) and the toggle-back path
      // continue to work.
      cislunarTrajectory = buildCislunarTrajectory(m.flight?.cislunar_profile, {
        dep_day_sim: newTimeline.dep_day,
        transit_days: m.transit_days ?? 0,
        is_return_trip: isReturnTrip,
      });
      rebuildCislunarLinesRef?.(cislunarTrajectory);
      rebuildCislunarAnnotationsRef?.(cislunarTrajectory, m.flight?.cislunar_profile);

      // Apollo / cislunar: heliocentric arc from live Earth at dep_day
      // to live Moon at flyby_day (Moon arrival). The trajectory
      // rides Earth's orbital motion + adds a small lateral hop to
      // the Moon, so it reads at the same heliocentric scale as Mars
      // missions (Sun + Earth orbit visible, Moon orbiting Earth at
      // MOON_FLY_RADIUS_AU). Replaces the prior Earth-centred Bezier
      // which hid the Sun and lost heliocentric context.
      const earthAtDep = earthPos(newTimeline.dep_day);
      const moonAtFlyby = moonHelioPos(newTimeline.flyby_day);
      outPts = moonHelioArc(
        newTimeline.dep_day,
        newTimeline.flyby_day,
        earthAtDep,
        moonAtFlyby,
        ARC_STEPS,
      );
      // Crewed / sample-return cislunar return leg: Moon-at-flyby →
      // live Earth at arr_day. Timeline math sets arr_day = dep +
      // 2*transit_days for round-trips, so this leg has the same
      // duration as outbound and arrives at the live Earth heliocentric
      // position eight days after launch (Apollo) or longer for sample-
      // return cadence missions.
      const earthAtReturnArr = earthPos(newTimeline.arr_day);
      retPts = isReturnTrip
        ? moonHelioArc(
            newTimeline.flyby_day,
            newTimeline.arr_day,
            moonAtFlyby,
            earthAtReturnArr,
            ARC_STEPS,
          )
        : [];
    } else {
      // Non-Moon mission: clear cislunar state and snap back to
      // heliocentric view.
      cislunarTrajectory = null;
      rebuildCislunarLinesRef?.(null);
      rebuildCislunarAnnotationsRef?.(null, undefined);

      // Pass real arrival V∞ when the mission has flight data so the
      // outbound arc shape reflects the mission's actual transfer
      // energy (v0.1.10). Falls back to the Hohmann baseline geometry
      // when V∞ is absent.
      const vInfKms = m.flight?.arrival?.v_infinity_km_s;
      const arcs = buildArcs(newTimeline, false, activeDestination, vInfKms);
      outPts = arcs.out;
      // Return arc for round-trip Mars missions (e.g., MMX which
      // returns from Phobos): mirror the outbound arc back to Earth.
      // For now, no Mars sample-return missions are FLOWN; MMX is
      // PLANNED. The branch is here for completeness.
      if (isReturnTrip) {
        // Round-trip Mars (e.g. MMX): return arc starts at outbound
        // terminus (= live Mars at flyby_day) and ends at live Earth
        // at arr_day (= dep + 2*transit_days for round-trips).
        const earthRet = earthPos(newTimeline.arr_day);
        retPts = returnArc(arcs.out[arcs.out.length - 1], earthRet, ARC_STEPS);
      } else {
        retPts = arcs.ret;
      }
    }
    resetCamera?.();
    // Prefer the structured `flight.totals.total_dv_km_s` when present
    // (per ADR-027 backward-compat shim); fall back to parseDeltaV().
    const dvTotalCanonical = m.flight?.totals?.total_dv_km_s ?? dvTotal;
    mission = {
      name: m.name ?? m.id,
      vehicle: m.vehicle ?? '—',
      payload: m.payload ?? '—',
      dv_total: dvTotalCanonical,
      dv_used: dvTotalCanonical * 0.94,
      dep_label: m.departure_date ?? defaultScenarioOverlay.dep_label,
      arr_label: m.arrival_date ?? defaultScenarioOverlay.arr_label,
      timeline: newTimeline,
      isFromData: true,
      flight: m.flight,
      flight_data_quality: m.flight_data_quality,
    };
    simDay = mission.timeline.dep_day;
    // Moon missions are 4-12 days vs Mars's 200+. Default speed at 0.4×
    // (was 1×) so the auto-zoom on lunar phases has time to read — at
    // 1× Apollo 11's 0.6-day lunar-orbit window only got 0.6 s of
    // playback, shorter than the ~1 s zoom transition itself, so the
    // camera move looked glitchy. 0.4× stretches a typical lunar phase
    // to ~1.5–2 s of playback — enough to see the zoom complete, the
    // orbit detail, and the zoom back out. Users can still pick faster
    // pills (1×, 3×) if they want.
    simSpeed = isMoonMission ? 0.4 : 7;
    // v0.1.13 — fuse editorial overlay events with structural flight
    // events from mission.flight.events[]. Missions with measured /
    // sparse flight data (issue #31) now contribute TCMs, EDL, etc.
    // to the CAPCOM ticker even if their editorial overlay is sparse.
    missionEvents = mergeFlightEvents(m.events, m.flight?.events);
  }

  function applyScenarioAsLoaded(s: LocalizedScenario) {
    const newTimeline: MissionTimeline = {
      dep_day: s.dep_day,
      flyby_day: s.flyby_day,
      arr_day: s.arr_day,
    };
    arcTimeline = newTimeline;
    isFreeReturn = true; // ORRERY DEMO + future free-return scenarios
    activeDestination = 'mars';
    isMoonMission = false;
    const arcs = buildArcs(newTimeline, true);
    outPts = arcs.out;
    retPts = arcs.ret;
    resetCamera?.();
    mission = {
      name: s.name,
      vehicle: s.vehicle,
      payload: s.payload,
      dv_total: s.dv_total_km_s,
      dv_used: s.dv_used_km_s,
      dep_label: s.dep_label,
      arr_label: s.arr_label,
      timeline: newTimeline,
      isFromData: true,
    };
    simDay = mission.timeline.dep_day;
    missionEvents = s.events;
  }

  /**
   * /plan-driven entry: when /fly receives `?dest=...&type=...&dep=N&tof=N`
   * (no `?mission=`), we synthesise a one-way trajectory for the
   * chosen destination instead of falling through to the ORRERY DEMO
   * scenario. Per ADR-026 §FLY-button experience.
   */
  /** Closest-approach moment as a fraction of total transit time. The
   *  arc renders the spacecraft's flyby position at this offset. 0.95
   *  is a teaching simplification — actual closest-approach varies
   *  per Lambert solution but isn't returned by the pre-computed grid
   *  or the synthesised /plan-driven path. Document'd here so a future
   *  improvement (real closest-approach from the solver) has a single
   *  knob to update. */
  const FLYBY_OFFSET_FRACTION = 0.95;

  function applyPlanSelection(
    dest: DestinationId,
    type: 'LANDING' | 'FLYBY',
    depDay: number,
    tofDays: number,
  ) {
    // FLYBY = free-return: outbound terminates at the destination
    // encounter (flyby_day == depDay + tofDays — the porkchop's TOF is
    // the time-to-target), and the return leg sweeps back to Earth at
    // a synthesised arr_day. We don't have a precise return-leg ToF
    // from the porkchop (it solves outbound only), so we approximate
    // total mission duration as 2× outbound — close enough for the
    // educational visual; the returnArc geometry adjusts to whatever
    // Earth position arr_day picks out.
    //
    // LANDING = one-way: outbound terminates at flyby_day = 0.95·tof
    // for the visual flyby waypoint, arr_day = dep + tof for landing.
    const isFlyby = type === 'FLYBY';
    const flybyOffset = isFlyby ? tofDays : Math.floor(tofDays * FLYBY_OFFSET_FRACTION);
    const arrOffset = isFlyby ? tofDays * 2 : tofDays;
    const newTimeline: MissionTimeline = {
      dep_day: depDay,
      flyby_day: depDay + flybyOffset,
      arr_day: depDay + arrOffset,
    };
    arcTimeline = newTimeline;
    isFreeReturn = isFlyby;
    activeDestination = dest;
    isMoonMission = false;
    const arcs = buildArcs(newTimeline, isFlyby, dest);
    outPts = arcs.out;
    retPts = arcs.ret;
    resetCamera?.();
    const destLabel = dest.charAt(0).toUpperCase() + dest.slice(1);
    mission = {
      name: `EARTH → ${destLabel.toUpperCase()} · ${type}`,
      vehicle: '—',
      payload: '—',
      dv_total: defaultScenarioBase.dv_total_km_s,
      dv_used: defaultScenarioBase.dv_total_km_s * 0.94,
      dep_label: `Day ${depDay}`,
      arr_label: `Day ${depDay + arrOffset}`,
      timeline: newTimeline,
      isFromData: true,
    };
    simDay = newTimeline.dep_day;
    missionEvents = [];
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
        applyMissionAsLoaded(m);
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
    // 3D — Three.js scene. Units = AU × SCALE_3D (component scope).
    // ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.5,
      4000,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2000, 1.2));
    scene.add(new THREE.AmbientLight(0x111133, 0.8));

    // ──────────────────────────────────────────────────────────────
    // Cislunar scene (ADR-058) — Earth-centred, units = km × SCALE_CISLUNAR.
    // Lives alongside the heliocentric scene; the active scene/camera
    // is picked in the render loop based on viewMode. Object meshes
    // are built once here and updated each frame from cislunarTrajectory.
    // ──────────────────────────────────────────────────────────────
    const SCALE_CISLUNAR = 1 / 10000; // 1 km → 1e-4 units. 384,400 km → 38.44 u.
    const cislunarScene = new THREE.Scene();
    const cislunarCamera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.01,
      4000,
    );
    cislunarScene.add(new THREE.AmbientLight(0xeeeeff, 0.7));
    const cislunarSun = new THREE.DirectionalLight(0xfff4d0, 1.6);
    cislunarSun.position.set(1000, 200, 1000);
    cislunarScene.add(cislunarSun);

    // Earth at origin — visually exaggerated 3× so the planet reads at
    // the same on-screen size as the Moon while the Earth-Moon distance
    // stays geometrically true.
    // Earth + Moon are dual-layered:
    //   - Inner core: SOLID at TRUE physical radius (R_BODY × SCALE),
    //     full opacity, strong colour. This is "the planet" — clearly
    //     readable, not fuzzy. Earth's true radius is 0.638u at this
    //     scale, Moon's is 0.174u.
    //   - Outer hint: FAINT translucent shell at 3× radius, low alpha,
    //     no strong colour. Suggests body presence at wide zoom
    //     without overwhelming the rest of the scene.
    // The orbit ring + spacecraft sprite read clearly between the two
    // layers when zoomed in on the Moon.
    const cislunarTexLoader = new THREE.TextureLoader();
    const cislunarEarthTex = cislunarTexLoader.load(`${base}/textures/2k_earth_daymap.jpg`);
    const cislunarEarth = new THREE.Mesh(
      new THREE.SphereGeometry(R_EARTH_KM * SCALE_CISLUNAR, 32, 32),
      new THREE.MeshStandardMaterial({
        map: cislunarEarthTex,
        color: 0xffffff,
        roughness: 0.6,
      }),
    );
    cislunarScene.add(cislunarEarth);

    // Moon — position updated each frame from moonEciPos(simDay).
    const cislunarMoonTex = cislunarTexLoader.load(`${base}/textures/2k_moon.jpg`);
    const cislunarMoon = new THREE.Mesh(
      new THREE.SphereGeometry(R_MOON_KM * SCALE_CISLUNAR, 24, 24),
      new THREE.MeshStandardMaterial({
        map: cislunarMoonTex,
        color: 0xffffff,
        roughness: 0.95,
      }),
    );
    cislunarScene.add(cislunarMoon);

    // SoI (Sphere-of-Influence) rings — wired to the Science Lens
    // 'soi' layer toggle. Earth SoI = 924,000 km radius, Moon SoI =
    // 66,100 km. In cislunar scale these come out to ~92u and ~6.6u
    // respectively — both visible in the wide view. The Moon ring is
    // child of cislunarMoon so it tracks the Moon's motion.
    const cislunarEarthSoI = new THREE.Mesh(
      new THREE.TorusGeometry(924_000 * SCALE_CISLUNAR, 0.08, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0x6aa9ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    cislunarEarthSoI.rotation.x = Math.PI / 2;
    cislunarEarthSoI.visible = false;
    cislunarScene.add(cislunarEarthSoI);

    const cislunarMoonSoI = new THREE.Mesh(
      new THREE.TorusGeometry(66_100 * SCALE_CISLUNAR, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff9b6a,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    cislunarMoonSoI.rotation.x = Math.PI / 2;
    cislunarMoonSoI.visible = false;
    cislunarMoon.add(cislunarMoonSoI);

    // Subscribe to the 'soi' layer toggle so checking/unchecking in
    // the Science Layers panel actually flips visibility.
    const stopSoiLayerCislunar = onLayerChange('soi', (on) => {
      cislunarEarthSoI.visible = on;
      cislunarMoonSoI.visible = on;
    });

    // ─── Cislunar Science Layers (ADR-058 follow-up) ─────────────────
    // Gravity / velocity / centripetal arrows + apsides markers + coast
    // preview rendered in the cislunar scene, mirroring the heliocentric
    // overlays but anchored to ECI km coords and using Earth/Moon as
    // central bodies. Conics state is derived separately (Earth-frame
    // classifyConic) and fed into the existing ConicSectionPanel.

    // Gravity arrows: Earth (blue) + Moon (gray). Anchored at the
    // spacecraft, point at the body, length log-scaled.
    const cisGravEarthArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4,
      0x6aa9ff,
      0.7,
      0.4,
    );
    cisGravEarthArrow.visible = false;
    cislunarScene.add(cisGravEarthArrow);

    const cisGravMoonArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4,
      0xcfcfcf,
      0.7,
      0.4,
    );
    cisGravMoonArrow.visible = false;
    cislunarScene.add(cisGravMoonArrow);

    // Velocity tangent arrow (teal).
    const cisVelocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4,
      0x4ecdc4,
      0.7,
      0.4,
    );
    cisVelocityArrow.visible = false;
    cislunarScene.add(cisVelocityArrow);

    // Centripetal arrow (red), points toward the dominant body.
    const cisCentripetalArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4,
      0xff6b6b,
      0.7,
      0.4,
    );
    cisCentripetalArrow.visible = false;
    cislunarScene.add(cisCentripetalArrow);

    // Apsides markers — pink perigee + blue apogee. Placed each frame
    // at min/max distance from the current phase's central body.
    const cisPeriMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.85 }),
    );
    cisPeriMarker.visible = false;
    cislunarScene.add(cisPeriMarker);
    const cisApoMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x6aa9ff, transparent: true, opacity: 0.85 }),
    );
    cisApoMarker.visible = false;
    cislunarScene.add(cisApoMarker);

    // Coast preview — dashed yellow line projecting the spacecraft's
    // future trajectory under Earth gravity (Tier 1: simple two-body
    // integrator, ignores Moon gravity outside Moon SoI).
    const cisCoastLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.75,
        dashSize: 0.5,
        gapSize: 0.3,
      }),
    );
    cisCoastLine.visible = false;
    cislunarScene.add(cisCoastLine);

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
    function ensureCislunarPhaseLine(type: string): THREE.Line {
      const existing = cislunarPhaseLines.get(type);
      if (existing) return existing;
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color: CISLUNAR_PHASE_COLORS[type] ?? 0xffffff,
          linewidth: 2,
          transparent: true,
          opacity: 0.95,
        }),
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
        const verts = new Float32Array(phase.points.length * 3);
        for (let i = 0; i < phase.points.length; i++) {
          const p = phase.points[i];
          const x = lunarLocal ? p.x - moonAtFlybyRef.x : p.x;
          const y = lunarLocal ? p.y - moonAtFlybyRef.y : p.y;
          const z = lunarLocal ? p.z - moonAtFlybyRef.z : p.z;
          verts[i * 3] = x * SCALE_CISLUNAR;
          verts[i * 3 + 1] = y * SCALE_CISLUNAR;
          verts[i * 3 + 2] = z * SCALE_CISLUNAR;
        }
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry();
        line.geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        line.visible = true;
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
    rebuildCislunarLinesRef = rebuildCislunarLines;
    rebuildCislunarAnnotationsRef = rebuildCislunarAnnotations;
    updateCislunarSpacecraftRef = updateCislunarSpacecraft;
    cislunarMoonMeshRef = cislunarMoon;
    cislunarMoonFrameGroupRef = cislunarMoonFrameGroup;

    // Sun (named so Moon-mode can hide it — the cislunar scene is
    // Earth-centred with the Moon at scaled distance, no Sun reference).
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
    );
    scene.add(sunCore);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff9922,
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(sunGlow);

    // Stars
    const STAR_COUNT = 2000;
    const starsArr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 1500 + Math.random() * 500;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starsArr[i * 3] = r * Math.sin(p) * Math.cos(t);
      starsArr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starsArr[i * 3 + 2] = r * Math.cos(p);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsArr, 3));
    scene.add(
      new THREE.Points(
        starsGeo,
        new THREE.PointsMaterial({
          color: 0xdde4ff,
          size: 1.0,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );

    // Earth orbit + Mars orbit. Opacity 0.4 reads clearly against the
    // dark background — was 0.18 before but on monitors with high
    // ambient light the rings disappeared into the starfield.
    const orbit = (radius: number, color: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(Math.cos(a) * radius * SCALE_3D, 0, Math.sin(a) * radius * SCALE_3D),
        );
      }
      return new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
      );
    };
    const earthOrbitLine = orbit(R_EARTH_AU, 0x4b9cd3);
    const marsOrbitLine = orbit(R_MARS_AU, 0xc1440e);
    scene.add(earthOrbitLine);
    scene.add(marsOrbitLine);

    // Outbound + return arcs as Lines whose drawRange we trim each
    // frame to fade the future part. Past = solid full-opacity, future
    // = nothing in 3D (the 2D mode has the dashed-future treatment;
    // 3D keeps it cleaner without dashed segments since LineDashedMaterial
    // requires geometry.computeLineDistances which is awkward to update).
    /** Build a TubeGeometry from arc points (in AU). Returns null
     *  when the arc has too few points — caller falls back to an
     *  empty placeholder geometry so the Mesh refs stay non-null. */
    const buildTubeGeometry = (pts: Vec2[], radius: number): THREE.BufferGeometry => {
      if (pts.length < 2) return new THREE.BufferGeometry();
      const vecs = pts.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
      const curve = new PolylineCurve3(vecs);
      // tubularSegments == waypoint count - 1 so each segment of the
      // tube spans exactly one input chord — drawRange now maps 1:1
      // to the lerpPoint index space the spacecraft uses.
      return new THREE.TubeGeometry(curve, pts.length - 1, radius, 8, false);
    };
    // v0.1.10: each arc is a pair of tube meshes. The *future* mesh is
    // a dim full-length preview; the *past* mesh is bright and its
    // drawRange grows each frame from 0 → full so the spacecraft
    // leaves a glowing wake behind it. Both pairs share the same
    // CatmullRom curve so they stay perfectly co-linear.
    const outMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.95,
    });
    const outFutureMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const retMat = new THREE.MeshBasicMaterial({
      color: 0x9966ff,
      transparent: true,
      opacity: 0.9,
    });
    const retFutureMat = new THREE.MeshBasicMaterial({
      color: 0x9966ff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    outLineFuture = new THREE.Mesh(buildTubeGeometry(outPts, 0.6), outFutureMat);
    outLine = new THREE.Mesh(buildTubeGeometry(outPts, 0.6), outMat);
    retLineFuture = new THREE.Mesh(buildTubeGeometry(retPts, 0.5), retFutureMat);
    retLine = new THREE.Mesh(buildTubeGeometry(retPts, 0.5), retMat);
    scene.add(outLineFuture);
    scene.add(outLine);
    scene.add(retLineFuture);
    scene.add(retLine);
    // Hoist the builder so the $effect can re-use it on mission swap.
    rebuildTubeGeometry = buildTubeGeometry;

    // Earth + Mars meshes
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 24, 24),
      new THREE.MeshPhongMaterial({ color: 0x3a8fcc, emissive: 0x3a8fcc, emissiveIntensity: 0.2 }),
    );
    scene.add(earthMesh);
    const marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 24, 24),
      new THREE.MeshPhongMaterial({ color: 0xc1440e, emissive: 0xc1440e, emissiveIntensity: 0.2 }),
    );
    scene.add(marsMesh);

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
      marsSoI.visible = on && !isMoonMission;
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
      new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.85 }),
    );
    const apoMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x6aa9ff, transparent: true, opacity: 0.85 }),
    );
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
    apsidesRecompute = recomputeApsides;

    const stopApsidesLayer = onLayerChange('apsides', (on) => {
      periMarker.visible = on;
      apoMarker.visible = on;
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

    // Spacecraft — small camera-facing sprite glyph at sc.pos. Solid
    // red filled circle with a thin dark outline + soft glow halo:
    // - The chevron previous design was rotation-dependent and read
    //   "wrong direction" against curved arcs. A circle has no
    //   orientation, so it always reads cleanly.
    // - Red (#ff3a4c) is distinct from every phase colour (yellow
    //   tli_coast, blue parking/spiral_earth, purple lunar_orbit/
    //   spiral_lunar, green tei_coast, pink-red descent/ascent) so
    //   the spacecraft never blends into its trail.
    const SC_GLYPH_PX = 64;
    const SC_COLOR = '#ff3a4c';
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
      glow.addColorStop(0, 'rgba(255,58,76,0.4)');
      glow.addColorStop(1, 'rgba(255,58,76,0)');
      tctx.fillStyle = glow;
      tctx.fillRect(0, 0, SC_GLYPH_PX, SC_GLYPH_PX);
      // Outline (dark) — gives definition against bright phases too.
      tctx.beginPath();
      tctx.arc(cx, cy, SC_GLYPH_PX * 0.22, 0, Math.PI * 2);
      tctx.fillStyle = 'rgba(20,8,12,0.9)';
      tctx.fill();
      // Core disc — solid red.
      tctx.beginPath();
      tctx.arc(cx, cy, SC_GLYPH_PX * 0.18, 0, Math.PI * 2);
      tctx.fillStyle = SC_COLOR;
      tctx.shadowColor = 'rgba(255,58,76,0.8)';
      tctx.shadowBlur = 4;
      tctx.fill();
      // Inner highlight — slight gradient for depth.
      const innerGlow = tctx.createRadialGradient(
        cx - SC_GLYPH_PX * 0.05,
        cy - SC_GLYPH_PX * 0.05,
        0,
        cx,
        cy,
        SC_GLYPH_PX * 0.18,
      );
      innerGlow.addColorStop(0, 'rgba(255,200,200,0.7)');
      innerGlow.addColorStop(1, 'rgba(255,200,200,0)');
      tctx.shadowBlur = 0;
      tctx.fillStyle = innerGlow;
      tctx.beginPath();
      tctx.arc(cx, cy, SC_GLYPH_PX * 0.18, 0, Math.PI * 2);
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
    scSprite.scale.set(4, 4, 1);
    scSprite.renderOrder = 999;
    scene.add(scSprite);

    // Flyby ring — gold torus around Mars at closest approach
    const flybyRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.0, 0.18, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffc850,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    flybyRing.rotation.x = Math.PI / 2;
    flybyRing.visible = false;
    scene.add(flybyRing);

    // RETURN marker — cyan crosshair ring at Earth-arrival position so
    // the user can see where the spacecraft is heading on the return
    // leg. Visible during the return phase only (progress ≥ 0.5).
    const returnRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.16, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    returnRing.rotation.x = Math.PI / 2;
    returnRing.visible = false;
    scene.add(returnRing);

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
    depLabelSprite = dep.sprite;
    arrLabelSprite = arr.sprite;
    const depCanvas = dep.canvas;
    const arrCanvas = arr.canvas;
    drawLabelTexture(depCanvas, 'LAUNCH', '—', '#4b9cd3');
    drawLabelTexture(arrCanvas, 'ARRIVAL', '—', '#c1440e');
    (depLabelSprite.material.map as THREE.Texture).needsUpdate = true;
    (arrLabelSprite.material.map as THREE.Texture).needsUpdate = true;
    scene.add(depLabelSprite);
    scene.add(arrLabelSprite);

    // Hoist the refresh callback so the $effect (defined at component
    // scope) can re-render the sprite textures on every mission swap.
    refreshLabelSprites = (depLine1, depLine2, depColor, arrLine1, arrLine2, arrColor) => {
      drawLabelTexture(depCanvas, depLine1, depLine2, depColor);
      drawLabelTexture(arrCanvas, arrLine1, arrLine2, arrColor);
      const depTex = (depLabelSprite!.material as THREE.SpriteMaterial).map;
      const arrTex = (arrLabelSprite!.material as THREE.SpriteMaterial).map;
      if (depTex) depTex.needsUpdate = true;
      if (arrTex) arrTex.needsUpdate = true;
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
    function updateHelioAutoZoomTargets(): void {
      if (isMoonMission) return; // cislunar handles its own auto-zoom
      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      const wide = cameraDistanceFor(activeDestination, false);
      const ePos = earthPos(simDay);
      const earthScene = new THREE.Vector3(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      const dPosLive = destinationPos(simDay, activeDestination);
      const destScene = new THREE.Vector3(dPosLive.x * SCALE_3D, 0, dPosLive.z * SCALE_3D);

      let sub: string;
      let centerX: number;
      let centerZ: number;
      let targetR: number;
      if (sc.phase === 'pre-launch') {
        sub = 'prelaunch';
        centerX = earthScene.x;
        centerZ = earthScene.z;
        targetR = HELIO_CLOSEUP_R;
      } else if (sc.phase === 'arrived') {
        sub = 'arrived';
        // Round-trip missions end at Earth; one-way ends at destination.
        const endAtEarth = retPts.length > 0;
        centerX = endAtEarth ? earthScene.x : destScene.x;
        centerZ = endAtEarth ? earthScene.z : destScene.z;
        targetR = HELIO_CLOSEUP_R;
      } else if (sc.phase === 'outbound') {
        const t = sc.progress * 2; // 0→1 across outbound
        if (t < 0.15) {
          sub = 'depart';
          centerX = earthScene.x;
          centerZ = earthScene.z;
          targetR = HELIO_CLOSEUP_R;
        } else if (t > 0.85) {
          sub = 'approach';
          centerX = destScene.x;
          centerZ = destScene.z;
          targetR = HELIO_CLOSEUP_R;
        } else {
          sub = 'cruise-out';
          centerX = (earthScene.x + destScene.x) / 2;
          centerZ = (earthScene.z + destScene.z) / 2;
          targetR = wide;
        }
      } else {
        // return
        const t = (sc.progress - 0.5) * 2; // 0→1 across return
        if (t < 0.15) {
          sub = 'depart-return';
          centerX = destScene.x;
          centerZ = destScene.z;
          targetR = HELIO_CLOSEUP_R;
        } else if (t > 0.85) {
          sub = 'approach-earth';
          centerX = earthScene.x;
          centerZ = earthScene.z;
          targetR = HELIO_CLOSEUP_R;
        } else {
          sub = 'cruise-back';
          centerX = (earthScene.x + destScene.x) / 2;
          centerZ = (earthScene.z + destScene.z) / 2;
          targetR = wide;
        }
      }
      if (sub !== lastHelioSubPhase) {
        lastHelioSubPhase = sub;
        helioAutoZoomActive = true;
      }
      helioAutoZoomTargetR = targetR;
      helioAutoZoomTargetCenter.set(centerX, 0, centerZ);
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
        // Same dual-rate pattern as cislunar: stronger lerp during
        // sub-phase transitions, gentle drift otherwise so the camera
        // keeps tracking Earth/destination as they orbit.
        if (helioAutoZoomActive) {
          const LERP = 0.022;
          camR += (helioAutoZoomTargetR - camR) * LERP;
          camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * LERP;
          camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * LERP;
          if (Math.abs(camR - helioAutoZoomTargetR) < 0.5) helioAutoZoomActive = false;
        } else {
          const TRACK = 0.015;
          camTarget.x += (helioAutoZoomTargetCenter.x - camTarget.x) * TRACK;
          camTarget.z += (helioAutoZoomTargetCenter.z - camTarget.z) * TRACK;
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
      // Only re-arm the auto-zoom on phase transitions — leaves the
      // user's manual mouse-wheel zoom intact for the duration of a
      // phase. Each transition retargets the camera; in between, the
      // user is in control.
      const phaseChanged = activePhase.type !== lastAutoZoomPhase;
      if (phaseChanged) {
        lastAutoZoomPhase = activePhase.type;
        autoZoomActive = true;
      }
      // Always update the target POSITION because the Moon drifts each
      // frame; that keeps the close-up tracking the Moon during the
      // lunar phase. Only the lerp toward this target is gated by
      // autoZoomActive.
      const moonPos = moonEciPos(simDay);
      const moonInScene = {
        x: moonPos.x * SCALE_CISLUNAR,
        z: moonPos.z * SCALE_CISLUNAR,
      };
      if (LUNAR_PHASE_TYPES.has(activePhase.type)) {
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
    resetCamera = () => {
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
      // Heliocentric: re-arm sub-phase tracking. Start framed on Earth
      // so the departure close-up reads immediately instead of lerping
      // from wide.
      lastHelioSubPhase = null;
      if (!isMoonMission) {
        const ePos = earthPos(simDay);
        camTarget.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
        camR = HELIO_CLOSEUP_R;
        helioAutoZoomActive = true;
      }
      updateCam();
      updateCislunarCam();
    };

    const el3d = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;
    const onMouseDown = (e: MouseEvent) => {
      isDrag = true;
      lmx = e.clientX;
      lmy = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      if (viewMode === 'cislunar') {
        cislunarCamT -= (e.clientX - lmx) * 0.005;
        cislunarCamP = Math.max(
          0.08,
          Math.min(Math.PI * 0.48, cislunarCamP + (e.clientY - lmy) * 0.005),
        );
        lmx = e.clientX;
        lmy = e.clientY;
        updateCislunarCam();
      } else {
        camT -= (e.clientX - lmx) * 0.005;
        camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + (e.clientY - lmy) * 0.005));
        lmx = e.clientX;
        lmy = e.clientY;
        updateCam();
      }
    };
    const onMouseUp = () => {
      isDrag = false;
      el3d.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
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
    // Touch — single-finger orbit + two-finger pinch-zoom per
    // CLAUDE.md mobile rules. Same pattern as /explore.
    let touchActive = false;
    let pinchPrev = 0;
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
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchPrev > 0) {
        const dist = touchDist(e.touches[0], e.touches[1]);
        const ratio = pinchPrev / dist;
        camR = Math.max(80, Math.min(4000, camR * ratio));
        updateCam();
        pinchPrev = dist;
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
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el3d.addEventListener('wheel', onWheel, { passive: true });
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
      if (isPlaying) {
        simDay += dt * simSpeed;
        if (simDay > arcTimeline.arr_day + 30) simDay = arcTimeline.dep_day;
      }
      // Moon-mode: re-aim the camera at the live Earth heliocentric
      // position each frame so the Earth+Moon system stays centred as
      // Earth orbits the Sun. Mars-mode keeps the static Sun-centred
      // framing — early-bail to avoid the heliocentric position recompute.
      if (isMoonMission) updateCam();

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
        marsOrbitLine.visible = false;
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
        sunGlow.visible = true;
        earthOrbitLine.visible = true;
        marsOrbitLine.visible = true;
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
        const mPos = marsPos(simDay);
        earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
        marsMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);
      }

      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      // Sprite glyph sits at sc.pos. No lookAt — sprites face the
      // camera by construction so the glyph is always centred on the
      // arc regardless of curvature.
      scSprite.position.set(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);

      // Phase-based visibility: once the spacecraft has launched, the
      // LAUNCH marker becomes redundant clutter; once it has arrived,
      // the ARRIVAL marker and the entire arc are mission-history —
      // the scene "freezes" to just the planets continuing their orbits.
      // Spacecraft sprite also hides on arrival.
      const phaseNow = sc.phase;
      const beforeLaunch = phaseNow === 'pre-launch';
      const afterArrival = phaseNow === 'arrived';
      if (depMarker) depMarker.visible = beforeLaunch;
      if (depLabelSprite) depLabelSprite.visible = beforeLaunch;
      if (arrMarker) arrMarker.visible = !afterArrival;
      if (arrLabelSprite) arrLabelSprite.visible = !afterArrival;
      if (outLine) outLine.visible = !afterArrival;
      if (outLineFuture) outLineFuture.visible = !afterArrival;
      if (retLine) retLine.visible = !afterArrival && retPts.length >= 2;
      if (retLineFuture) retLineFuture.visible = !afterArrival && retPts.length >= 2;
      scSprite.visible = !afterArrival;

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
      marsSoI.visible = soiLayerOn && !isMoonMission;
      moonSoI.visible = soiLayerOn && isMoonMission;
      if (earthSoI.visible) earthSoI.position.copy(earthWorld);
      if (marsSoI.visible) marsSoI.position.copy(marsWorld);
      if (moonSoI.visible) moonSoI.position.copy(moonMesh.position);

      // Coast preview: integrate forward from current (r, v). Velocity
      // estimated by finite-difference between two adjacent simDays so
      // the result reflects the spacecraft's actual current motion on
      // the planned arc (which is itself a coast outside burn windows).
      if (coastLine.visible) {
        const sc1 = spacecraftPos(simDay + 0.5, arcTimeline, outPts, retPts).pos;
        const r0 = { x: sc.pos.x, y: 0, z: sc.pos.z };
        const v0 = {
          x: (sc1.x - sc.pos.x) / 0.5,
          y: 0,
          z: (sc1.z - sc.pos.z) / 0.5,
        };
        const auPositions = integrateCoast(r0, v0, 200, 80);
        const scenePositions = new Float32Array(auPositions.length);
        for (let i = 0; i < auPositions.length; i++) {
          scenePositions[i] = auPositions[i] * SCALE_3D;
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

      // v0.1.10: drawRange-driven progress trail on the *past* tube of
      // each arc. The *future* tubes always render full at low
      // opacity so the user sees the full mission path; the past
      // tubes overlay them at high opacity, growing from 0 → end as
      // the spacecraft progresses. For free-return scenarios the
      // overall progress 0→0.5 spans outbound, 0.5→1 spans return.
      // For one-way missions outPts is the only arc; retPts is empty.
      // sc.progress goes 0 → 0.5 across outbound and 0.5 → 1 across
      // return, so the bright/dim split for the outbound tube must
      // map [0, 0.5] → [0, 1] (i.e. sc.progress * 2). The previous
      // formula used a hasReturn ternary that left one-way missions
      // showing only half the tube as "visited" at arrival. Using the
      // doubled formula uniformly covers both cases.
      const outFraction = Math.min(1, sc.progress * 2);
      const retFraction = Math.max(0, (sc.progress - 0.5) * 2);
      // Ceil-snap to whole-segment boundaries so the tube tip always
      // sits at or past the spacecraft sprite. Round-to-nearest used to
      // truncate at a fractional-segment index that didn't map to a
      // complete tube ring, leaving the sprite a few pixels beyond the
      // visible tube tip (visible on Viking 1 etc.).
      if (outLine && outLine.geometry.index && outPts.length > 1) {
        const total = outLine.geometry.index.count;
        const segs = outPts.length - 1;
        const segIndices = total / segs;
        const targetSeg = Math.min(segs, Math.ceil(outFraction * segs));
        outLine.geometry.setDrawRange(0, Math.max(0, targetSeg * segIndices));
      }
      if (retLine && retLine.geometry.index && retPts.length > 1) {
        const total = retLine.geometry.index.count;
        const segs = retPts.length - 1;
        const segIndices = total / segs;
        const targetSeg = Math.min(segs, Math.ceil(retFraction * segs));
        retLine.geometry.setDrawRange(0, Math.max(0, targetSeg * segIndices));
      }

      // marsArr / earthRet are recomputed per-frame from the live
      // arcTimeline so these markers track per-mission launch windows.
      // Moon-mode uses Earth-centred fake-AU coords so a heliocentric
      // marsArr / earthRet would render the rings off in heliocentric
      // space (visible because the camera is also looking at origin).
      // Hide them entirely for Moon missions — Earth + Moon meshes
      // already mark the start/end of the cislunar trajectory.
      // Flyby + return rings now anchor to the *arc's own waypoints*
      // (outPts at the flyby index, retPts terminus for return),
      // instead of recomputing heliocentric Mars/Earth per frame. The
      // previous formula made the gold ring "blink near Mars" while
      // neither the spacecraft nor the arc was actually there — the
      // V∞-shaped arc and Mars's live position diverge by ~0.05 AU.
      if (outPts.length > 0) {
        const flybyIdx = Math.floor(0.95 * (outPts.length - 1));
        const fp = outPts[flybyIdx];
        flybyRing.position.set(fp.x * SCALE_3D, 0, fp.z * SCALE_3D);
      }
      flybyRing.visible = !isMoonMission && sc.progress >= 0.45 && sc.progress <= 0.55;
      if (retPts.length > 0) {
        const rp = retPts[retPts.length - 1];
        returnRing.position.set(rp.x * SCALE_3D, 0, rp.z * SCALE_3D);
      }
      returnRing.visible =
        !isMoonMission && isFreeReturn && sc.progress >= 0.5 && sc.progress <= 0.95;

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
        updateCislunarSpacecraftRef?.(cislunarTrajectory, metDays);

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
      } else draw2d();
    };
    animate(performance.now());

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
      el3d.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el3d.removeEventListener('wheel', onWheel);
      el3d.removeEventListener('touchstart', onTouchStart);
      el3d.removeEventListener('touchmove', onTouchMove);
      el3d.removeEventListener('touchend', onTouchEnd);
      el3d.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
          else (obj.material as THREE.Material | undefined)?.dispose();
        }
      });
      // ADR-058: dispose the cislunar scene's GPU resources too.
      cislunarScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
          else (obj.material as THREE.Material | undefined)?.dispose();
        }
      });
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
       that conflicted with the CAPCOM toggle. -->
  <div class="hud-stack">
    <aside
      class="hud hud-identity"
      role="status"
      aria-live="polite"
      aria-label={m.fly_panel_identity()}
      data-testid="mission-name"
    >
      <span class="hud-title">{mission.name}</span>
      <span class="hud-phase phase-{phase}">{phaseLabel}</span>
      {#if mission.name === 'ORRERY DEMO'}
        <p class="hud-demo-hint">{m.fly_demo_hint()}</p>
        <a href="{base}/plan" class="hud-demo-cta">{m.fly_demo_cta()}</a>
        <a href="{base}/missions" class="hud-demo-cta hud-demo-cta-secondary"
          >{m.fly_demo_replay_cta()}</a
        >
      {/if}
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
        <span class="hud-key">{m.fly_hud_dist_earth()}</span>
        <span class="hud-val"
          >{m.fly_hud_mkm({
            value: distFromEarthMkm < 1 ? distFromEarthMkm.toFixed(2) : distFromEarthMkm.toFixed(0),
          })}</span
        >
      </div>
      <div class="hud-row">
        <span class="hud-key"
          >·<ScienceChip
            tab="scales-time"
            section="light-minute"
            label={m.chip_label_light_minute()}
          /></span
        >
        <span class="hud-val dim"
          >{m.fly_hud_lmin({
            value: signalDelayMin < 1 ? signalDelayMin.toFixed(2) : signalDelayMin.toFixed(1),
          })}</span
        >
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

  <button class="toggle" type="button" onclick={toggleView} aria-pressed={view === '2d'}>
    {view === '3d' ? m.fly_label_view_2d() : m.fly_label_view_3d()}
  </button>

  <!-- CAPCOM panel is always present when a mission is loaded
       (v0.1.7 — toggle removed; the panel sits permanently to the
       right under the 2D/3D button so it can never overlap it). -->
  {#if mission}
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
            {#each pastEvents as event (event.met + event.label)}
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

<!-- Flight Director narration replaces the static Science Lens banner
     on /fly. Tied to arcProgress, so the title/body/link rotate as the
     simulation moves through DEPARTURE → INJECTION → CRUISE → APPROACH
     → ARRIVAL. Only renders when the global Science Lens is on. -->
<FlightDirectorBanner arcProgress={Math.max(0, Math.min(1, arcProgress))} />

<!-- /fly Layers panel — every layer wired into both scenes (cislunar
     for Moon missions, heliocentric otherwise). -->
<ScienceLayersPanel
  available={['hover', 'soi', 'gravity', 'velocity', 'centripetal', 'apsides', 'coast', 'conics']}
/>

<!-- Conic-section family side panel — Phase I. Lens + 'conics' layer
     gated. Reads the live conicState derive. -->
<ConicSectionPanel
  shape={conicState.shape}
  a={conicState.a}
  e={conicState.e}
  epsilon={conicState.epsilon}
/>

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
    align-self: flex-start;
    padding: 6px 10px;
    margin-bottom: 4px;
    background: rgba(68, 102, 255, 0.18);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #fff;
    text-decoration: none;
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
  .scrub {
    flex: 1;
    accent-color: #4466ff;
    height: 36px;
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

  .toggle {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 16px;
    z-index: 35;
    min-width: 44px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
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
