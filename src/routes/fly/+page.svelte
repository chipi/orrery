<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import {
    earthPos,
    marsPos,
    destinationPos,
    outboundArc,
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
  import { getMission, getScenario } from '$lib/data';
  import { parseDeltaV } from '$lib/parse-delta-v';
  import { dateToSimDay } from '$lib/sim-day';
  import { onReducedMotionChange, prefersReducedMotion } from '$lib/reduced-motion';
  import type { Mission, MissionEvent } from '$types/mission';
  import type { LocalizedScenario } from '$types/scenario';
  import * as m from '$lib/paraglide/messages';

  // ─── Default scenario (ORRERY-1 free-return per ADR-009) ─────────
  // Static-imported so the Three.js scene can initialise synchronously
  // at onMount. The runtime fetch via `getScenario()` happens too,
  // pulling in the editorial overlay for whichever locale the user
  // has — when other locales ship, the overlay swap is a one-line
  // change without restructuring the scene.
  import defaultScenarioBase from '$data/scenarios/orrery-1.json';
  import defaultScenarioOverlay from '$data/i18n/en-US/scenarios/orrery-1.json';

  const DEFAULT_SCENARIO_ID = 'orrery-1';

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
  let capcomOpen = $state(false);

  // ─── Arc geometries — recomputed per loaded mission ──────────────
  // Each mission gets its own outbound arc anchored to *its* actual
  // launch window (Earth/Mars phases at the mission's departure date).
  // Free-return scenarios additionally render a long-CCW return arc;
  // historical Mars-bound missions land there and don't return, so
  // their retPts is empty (no return arc rendered).
  const ARC_STEPS = 200;

  function buildArcs(
    timeline: MissionTimeline,
    isFreeReturn: boolean,
    destinationId: DestinationId = 'mars',
  ): { out: Vec2[]; ret: Vec2[] } {
    const earthDep = earthPos(timeline.dep_day);
    const destA = DESTINATIONS[destinationId].a;
    const out = outboundArc(earthDep, ARC_STEPS, destA);
    if (!isFreeReturn) return { out, ret: [] };
    // Free-return is Mars-only by design (ORRERY DEMO scenario):
    // the long-CCW return arc has no analogue for other destinations.
    const marsArr = marsPos(timeline.flyby_day);
    const earthRet = earthPos(timeline.arr_day);
    const ret = returnArc(marsArr, earthRet, ARC_STEPS);
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
  let outPts: Vec2[] = $state(INITIAL_ARCS.out);
  let retPts: Vec2[] = $state(INITIAL_ARCS.ret);

  // ─── State ───────────────────────────────────────────────────────
  let view: '3d' | '2d' = $state('3d');
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
  // changes triggered by mission loading. Holding the Line refs at
  // component scope lets a $effect mutate their geometry without
  // tearing down the whole scene.
  let outLine: THREE.Line | undefined;
  let retLine: THREE.Line | undefined;
  const SCALE_3D = 80;

  // Update the Three.js Line geometry whenever the arc-point arrays
  // change. The Line objects are created in onMount, so this effect
  // is a no-op on first run (outLine/retLine still undefined). Once
  // mounted, every mission load re-uploads new vertex positions.
  $effect(() => {
    if (!outLine || !retLine) return;
    const outVecs = outPts.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    const retVecs = retPts.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    outLine.geometry.dispose();
    outLine.geometry = new THREE.BufferGeometry().setFromPoints(outVecs);
    // setDrawRange resets when geometry swaps; the per-frame animate
    // tick will re-clamp it next paint.
    retLine.geometry.dispose();
    retLine.geometry = new THREE.BufferGeometry().setFromPoints(retVecs);
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
  // Heliocentric speed using vis-viva on the Hohmann transfer ellipse.
  // The arcs are not perfectly Keplerian (return arc uses a cosine
  // radius profile) so we report a smooth approximation: linear
  // interpolation between Earth and Mars circular speeds based on
  // current heliocentric distance.
  const MU_SUN_AU3_YR2 = 4 * Math.PI * Math.PI;
  const AU_PER_YR_TO_KMS = 4.7404;
  const AU_TO_KM = 149_597_870.7;
  const C_LIGHT_KM_S = 299_792.458;

  let scR = $derived(Math.hypot(scState.pos.x, scState.pos.z));
  let heliocentricKms = $derived(
    Math.sqrt(MU_SUN_AU3_YR2 * (2 / scR - 1 / ((R_EARTH_AU + R_MARS_AU) / 2))) * AU_PER_YR_TO_KMS,
  );

  let earthNow = $derived(earthPos(simDay));
  let marsNow = $derived(marsPos(simDay));
  let distFromEarthAu = $derived(
    Math.hypot(scState.pos.x - earthNow.x, scState.pos.z - earthNow.z),
  );
  let distFromMarsAu = $derived(Math.hypot(scState.pos.x - marsNow.x, scState.pos.z - marsNow.z));
  let distFromEarthMkm = $derived((distFromEarthAu * AU_TO_KM) / 1_000_000);
  let distFromMarsMkm = $derived((distFromMarsAu * AU_TO_KM) / 1_000_000);
  let signalDelayMin = $derived((distFromEarthAu * AU_TO_KM) / C_LIGHT_KM_S / 60);

  // Mission elapsed time = days since the simulation departed the arc's
  // start, mapped to the loaded mission's apparent transit time so the
  // user-visible "DAY 138" feels right whether they loaded Curiosity
  // (254 days) or the default ORRERY-1 (509 days).
  let arcTotalDays = $derived(arcTimeline.arr_day - arcTimeline.dep_day);
  let arcProgress = $derived((simDay - arcTimeline.dep_day) / arcTotalDays);
  let totalDays = $derived(mission.timeline.arr_day - mission.timeline.dep_day);
  let met = $derived(Math.max(0, arcProgress * totalDays));
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

  function toggleCapcom() {
    capcomOpen = !capcomOpen;
  }

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }
  function togglePlay() {
    isPlaying = !isPlaying;
  }
  function setSpeed(v: number) {
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
    // launch matches reality. transit_days drives arr_day; flyby_day
    // is 95% of transit (closest approach for landers).
    //
    // Historical Mars missions don't return to Earth — we render only
    // the outbound arc. Free-return scenarios get both arcs (handled
    // by applyScenarioAsLoaded).
    const totalT = m.transit_days || 250;
    const flybyOffset = Math.floor(totalT * 0.95);
    const dvTotal = parseDeltaV(m.delta_v, defaultScenarioBase.dv_total_km_s);
    // Fall back to the default scenario's dep_day if the mission's
    // departure_date is missing or unparseable (defence in depth —
    // schema requires the field, but the helper returns null on
    // anything that doesn't match YYYY-MM-DD).
    const depDay = dateToSimDay(m.departure_date) ?? defaultScenarioBase.dep_day;
    const newTimeline: MissionTimeline = {
      dep_day: depDay,
      flyby_day: depDay + flybyOffset,
      arr_day: depDay + totalT,
    };
    arcTimeline = newTimeline;
    isFreeReturn = false;
    const arcs = buildArcs(newTimeline, false);
    outPts = arcs.out;
    retPts = arcs.ret;
    mission = {
      name: m.name ?? m.id,
      vehicle: m.vehicle ?? '—',
      payload: m.payload ?? '—',
      dv_total: dvTotal,
      dv_used: dvTotal * 0.94,
      dep_label: m.departure_date ?? defaultScenarioOverlay.dep_label,
      arr_label: m.arrival_date ?? defaultScenarioOverlay.arr_label,
      timeline: newTimeline,
      isFromData: true,
    };
    simDay = mission.timeline.dep_day;
    if (m.events && m.events.length > 0) {
      missionEvents = m.events;
    }
  }

  function applyScenarioAsLoaded(s: LocalizedScenario) {
    const newTimeline: MissionTimeline = {
      dep_day: s.dep_day,
      flyby_day: s.flyby_day,
      arr_day: s.arr_day,
    };
    arcTimeline = newTimeline;
    isFreeReturn = true; // ORRERY DEMO + future free-return scenarios
    const arcs = buildArcs(newTimeline, true);
    outPts = arcs.out;
    retPts = arcs.ret;
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
  function applyPlanSelection(
    dest: DestinationId,
    type: 'LANDING' | 'FLYBY',
    depDay: number,
    tofDays: number,
  ) {
    const flybyOffset = Math.floor(tofDays * 0.95);
    const newTimeline: MissionTimeline = {
      dep_day: depDay,
      flyby_day: depDay + flybyOffset,
      arr_day: depDay + tofDays,
    };
    arcTimeline = newTimeline;
    isFreeReturn = false;
    activeDestination = dest;
    const arcs = buildArcs(newTimeline, false, dest);
    outPts = arcs.out;
    retPts = arcs.ret;
    const destLabel = dest.charAt(0).toUpperCase() + dest.slice(1);
    mission = {
      name: `EARTH → ${destLabel.toUpperCase()} · ${type}`,
      vehicle: '—',
      payload: '—',
      dv_total: defaultScenarioBase.dv_total_km_s,
      dv_used: defaultScenarioBase.dv_total_km_s * 0.94,
      dep_label: `Day ${depDay}`,
      arr_label: `Day ${depDay + tofDays}`,
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

    // /plan-driven entry: dest + dep + tof set, no mission. Synthesise
    // an outbound-only arc to the chosen destination.
    if (!id && destParam && destParam in DESTINATIONS && depParam !== null && tofParam !== null) {
      const dest = destParam as DestinationId;
      const type = typeParam === 'FLYBY' ? 'FLYBY' : 'LANDING';
      const depDay = Number(depParam);
      const tofDays = Number(tofParam);
      if (Number.isFinite(depDay) && Number.isFinite(tofDays) && tofDays > 0) {
        applyPlanSelection(dest, type, depDay, tofDays);
        return;
      }
    }

    if (!id) {
      // No ?mission= param → fetch the locale overlay for the default
      // scenario (so non-en-US locales get translated strings); fall
      // back to the static import if even that fails.
      const s = await getScenario(DEFAULT_SCENARIO_ID);
      if (myLoadId !== currentLoadId) return; // newer load superseded us
      if (s) applyScenarioAsLoaded(s);
      return;
    }

    // Try scenarios first (synthesized teaching trajectories), then
    // historical missions on Mars, then Moon.
    const scenario = await getScenario(id);
    if (myLoadId !== currentLoadId) return;
    if (scenario) {
      applyScenarioAsLoaded(scenario);
      return;
    }

    const mars = await getMission(id, 'mars');
    if (myLoadId !== currentLoadId) return;
    if (mars) {
      applyMissionAsLoaded(mars);
      return;
    }

    const moon = await getMission(id, 'moon');
    if (myLoadId !== currentLoadId) return;
    if (moon) {
      applyMissionAsLoaded(moon);
      return;
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

    // Sun
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(8, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
      ),
    );
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(20, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff9922,
          transparent: true,
          opacity: 0.06,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );

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

    // Earth orbit + Mars orbit
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
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 }),
      );
    };
    scene.add(orbit(R_EARTH_AU, 0x4b9cd3));
    scene.add(orbit(R_MARS_AU, 0xc1440e));

    // Outbound + return arcs as Lines whose drawRange we trim each
    // frame to fade the future part. Past = solid full-opacity, future
    // = nothing in 3D (the 2D mode has the dashed-future treatment;
    // 3D keeps it cleaner without dashed segments since LineDashedMaterial
    // requires geometry.computeLineDistances which is awkward to update).
    const outVecs = outPts.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    const retVecs = retPts.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    outLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(outVecs),
      new THREE.LineBasicMaterial({ color: 0x4466ff, transparent: true, opacity: 0.7 }),
    );
    retLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(retVecs),
      new THREE.LineBasicMaterial({ color: 0x9966ff, transparent: true, opacity: 0.7 }),
    );
    scene.add(outLine);
    scene.add(retLine);

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

    // Spacecraft — composite per UXS-003: nose cone + cylindrical body
    // + inverted nozzle cone, all grouped so we can rotate the group
    // along velocity. Default tip points along +X; lookAt() in the
    // animation loop orients per heading.
    const scGroup = new THREE.Group();
    const scMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const noseGeo = new THREE.ConeGeometry(0.7, 1.4, 12);
    noseGeo.rotateZ(-Math.PI / 2);
    noseGeo.translate(1.4, 0, 0);
    const nose = new THREE.Mesh(noseGeo, scMaterial);
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12);
    bodyGeo.rotateZ(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, scMaterial);
    const nozzleGeo = new THREE.ConeGeometry(0.85, 0.7, 12);
    nozzleGeo.rotateZ(Math.PI / 2); // point against velocity (back-end nozzle)
    nozzleGeo.translate(-1.0, 0, 0);
    const nozzle = new THREE.Mesh(nozzleGeo, scMaterial);
    scGroup.add(nose, body, nozzle);
    scene.add(scGroup);

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

    // Camera
    let camR = 360;
    let camP = 1.05;
    let camT = 0.6;
    const updateCam = () => {
      camera.position.set(
        camR * Math.sin(camP) * Math.sin(camT),
        camR * Math.cos(camP),
        camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCam();

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
      camT -= (e.clientX - lmx) * 0.005;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + (e.clientY - lmy) * 0.005));
      lmx = e.clientX;
      lmy = e.clientY;
      updateCam();
    };
    const onMouseUp = () => {
      isDrag = false;
      el3d.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
      camR = Math.max(80, Math.min(900, camR + e.deltaY * 0.5));
      updateCam();
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
        camR = Math.max(80, Math.min(900, camR * ratio));
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
      const SCALE_2D = Math.min(W, H) / 4;

      for (let i = 0; i < 150; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      // Earth + Mars orbits
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

      // Sun glow + core
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

      // Past/future split — past solid, future dashed at low opacity.
      function drawSplit(pts: Vec2[], t: number, past: string, future: string) {
        const split = Math.max(0, Math.min(pts.length - 1, Math.floor(t * (pts.length - 1))));
        if (split > 0) {
          ctx2.beginPath();
          ctx2.moveTo(cx + pts[0].x * SCALE_2D, cy + pts[0].z * SCALE_2D);
          for (let i = 1; i <= split; i++) {
            ctx2.lineTo(cx + pts[i].x * SCALE_2D, cy + pts[i].z * SCALE_2D);
          }
          ctx2.strokeStyle = past;
          ctx2.lineWidth = 2;
          ctx2.setLineDash([]);
          ctx2.stroke();
        }
        ctx2.beginPath();
        ctx2.moveTo(cx + pts[split].x * SCALE_2D, cy + pts[split].z * SCALE_2D);
        for (let i = split + 1; i < pts.length; i++) {
          ctx2.lineTo(cx + pts[i].x * SCALE_2D, cy + pts[i].z * SCALE_2D);
        }
        ctx2.strokeStyle = future;
        ctx2.lineWidth = 1.5;
        ctx2.setLineDash([4, 6]);
        ctx2.stroke();
        ctx2.setLineDash([]);
      }

      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      drawSplit(outPts, Math.min(1, sc.progress / 0.5), '#4466ff', 'rgba(68,102,255,0.2)');
      drawSplit(retPts, Math.max(0, (sc.progress - 0.5) / 0.5), '#9966ff', 'rgba(153,102,255,0.2)');

      // Earth + Mars at simDay
      const ePos = earthPos(simDay);
      const mPos = marsPos(simDay);
      ctx2.beginPath();
      ctx2.arc(cx + ePos.x * SCALE_2D, cy + ePos.z * SCALE_2D, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#4b9cd3';
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(cx + mPos.x * SCALE_2D, cy + mPos.z * SCALE_2D, 4, 0, Math.PI * 2);
      ctx2.fillStyle = '#c1440e';
      ctx2.fill();

      // Spacecraft chevron
      const heading = spacecraftHeading(simDay, arcTimeline, outPts, retPts);
      const sx = cx + sc.pos.x * SCALE_2D;
      const sy = cy + sc.pos.z * SCALE_2D;
      ctx2.save();
      ctx2.translate(sx, sy);
      ctx2.rotate(Math.atan2(heading.z, heading.x));
      ctx2.beginPath();
      ctx2.moveTo(7, 0);
      ctx2.lineTo(-5, 4);
      ctx2.lineTo(-3, 0);
      ctx2.lineTo(-5, -4);
      ctx2.closePath();
      ctx2.fillStyle = '#fff';
      ctx2.fill();
      ctx2.restore();

      // Flyby ring near Mars — recompute per-mission arrival position
      // from the live arcTimeline.
      if (sc.progress >= 0.45 && sc.progress <= 0.55) {
        const marsArrLive = destinationPos(arcTimeline.flyby_day, activeDestination);
        const pulse = 0.5 + 0.5 * Math.sin(simDay * 0.5);
        ctx2.beginPath();
        ctx2.arc(
          cx + marsArrLive.x * SCALE_2D,
          cy + marsArrLive.z * SCALE_2D,
          14 + pulse * 3,
          0,
          Math.PI * 2,
        );
        ctx2.strokeStyle = `rgba(255,200,80,${0.5 + pulse * 0.3})`;
        ctx2.lineWidth = 1.5;
        ctx2.stroke();
      }
    }

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
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

      const ePos = earthPos(simDay);
      const mPos = marsPos(simDay);
      earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      marsMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);

      const sc = spacecraftPos(simDay, arcTimeline, outPts, retPts);
      scGroup.position.set(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);
      const h = spacecraftHeading(simDay, arcTimeline, outPts, retPts);
      scGroup.lookAt(scGroup.position.x + h.x * SCALE_3D, 0, scGroup.position.z + h.z * SCALE_3D);

      // Geometry length tracks the live outPts/retPts arrays (which
      // change when a new mission loads). Guard against the ts-narrowing
      // case where outLine/retLine are still being created on first tick.
      if (outLine) {
        const splitOut = Math.max(
          2,
          Math.min(outPts.length, Math.floor(Math.min(1, sc.progress / 0.5) * outPts.length)),
        );
        outLine.geometry.setDrawRange(0, splitOut);
      }
      if (retLine) {
        const splitRet = Math.max(
          2,
          Math.min(
            retPts.length,
            Math.floor(Math.max(0, (sc.progress - 0.5) / 0.5) * retPts.length),
          ),
        );
        retLine.geometry.setDrawRange(0, splitRet);
      }

      // marsArr / earthRet are recomputed per-frame from the live
      // arcTimeline so these markers track per-mission launch windows.
      const marsArrLive = destinationPos(arcTimeline.flyby_day, activeDestination);
      const earthRetLive = earthPos(arcTimeline.arr_day);
      flybyRing.position.set(marsArrLive.x * SCALE_3D, 0, marsArrLive.z * SCALE_3D);
      flybyRing.visible = sc.progress >= 0.45 && sc.progress <= 0.55;
      // RETURN marker — fades in once we're past the flyby and on the
      // return leg, fades back out at the very end (last 5% of the
      // progress so the marker doesn't overlap with the rendered
      // spacecraft mesh at touchdown).
      returnRing.position.set(earthRetLive.x * SCALE_3D, 0, earthRetLive.z * SCALE_3D);
      returnRing.visible = isFreeReturn && sc.progress >= 0.5 && sc.progress <= 0.95;

      if (view === '3d') renderer.render(scene, camera);
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
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
      renderer.dispose();
      el3d.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
    stopReducedMotionWatch();
  });
</script>

<svelte:head><title>Mission Arc · Orrery</title></svelte:head>

<div class="fly">
  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    role="region"
    aria-label="3D mission arc. Drag to orbit, scroll to zoom."
  ></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label="2D mission arc top-down view."
  ></canvas>

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
        <span class="hud-key">{m.fly_hud_met()}</span>
        <span class="hud-val">{m.fly_hud_met_value({ day: Math.round(met).toString() })}</span>
      </div>
    </aside>

    <!-- Navigation HUD (left stack, below identity) -->
    <aside class="hud hud-navigation" aria-label={m.fly_panel_navigation()}>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_velocity()}</span>
        <span class="hud-val">{m.fly_hud_kms({ value: heliocentricKms.toFixed(2) })}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_dist_earth()}</span>
        <span class="hud-val">{m.fly_hud_mkm({ value: distFromEarthMkm.toFixed(0) })}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">·</span>
        <span class="hud-val dim">{m.fly_hud_lmin({ value: signalDelayMin.toFixed(1) })}</span>
      </div>
      <div class="hud-row">
        <span class="hud-key">{m.fly_hud_dist_mars()}</span>
        <span class="hud-val">{m.fly_hud_mkm({ value: distFromMarsMkm.toFixed(0) })}</span>
      </div>
    </aside>

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
      {#each [1, 7, 30, 90] as sp}
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

  <button
    class="capcom-toggle"
    class:active={capcomOpen}
    type="button"
    onclick={toggleCapcom}
    aria-pressed={capcomOpen}
    aria-label={m.fly_capcom_toggle()}
  >
    {m.fly_capcom_toggle()}
  </button>

  <button class="toggle" type="button" onclick={toggleView} aria-pressed={view === '2d'}>
    {view === '3d' ? m.fly_label_view_2d() : m.fly_label_view_3d()}
  </button>

  {#if capcomOpen}
    <aside class="capcom-panel" aria-label={m.fly_capcom_panel_label()}>
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
  /* Systems HUD pinned to the bottom of the stack so it sits just
     above the scrubber instead of crowding identity/navigation. */
  .hud-systems {
    margin-top: auto;
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
    .hud-systems {
      display: none;
    }
    .hud-stack {
      bottom: auto;
    }
    .scrubber {
      right: 16px;
    }
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

  .capcom-toggle {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 76px;
    z-index: 35;
    min-width: 56px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: #4ecdc4;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    font-weight: 700;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .capcom-toggle.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
    color: #fff;
  }
  .capcom-toggle:hover,
  .capcom-toggle:focus-visible {
    border-color: #4ecdc4;
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
    overflow-y: auto;
    font-family: 'Space Mono', monospace;
    color: rgba(255, 255, 255, 0.85);
  }
  /* Desktop — right drawer above the systems HUD */
  @media (min-width: 768px) {
    .capcom-panel {
      top: calc(var(--nav-height) + 12px);
      right: 16px;
      width: 320px;
      max-height: calc(100vh - var(--nav-height) - 30px);
    }
  }
  /* Mobile — bottom sheet */
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
