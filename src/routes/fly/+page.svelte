<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import * as THREE from 'three';
  import {
    earthPos,
    marsPos,
    outboundArc,
    returnArc,
    spacecraftPos,
    spacecraftHeading,
    type MissionTimeline,
  } from '$lib/mission-arc';
  import { R_EARTH_AU, R_MARS_AU } from '$lib/lambert-grid.constants';
  import { getMission, getScenario } from '$lib/data';
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

  // ─── Arc geometries — anchored to the canonical scenario's timeline ─
  // Per-mission trajectories aren't in the data layer for historical
  // missions (real Mars landings aren't free-returns; their detailed
  // flight profiles belong in slice 5+ if added). The arc renders
  // the canonical free-return shape regardless of which mission is
  // loaded; HUDs surface the loaded record's identity strings around it.
  const ARC_STEPS = 200;
  const ARC_TIMELINE: MissionTimeline = {
    dep_day: defaultScenarioBase.dep_day,
    flyby_day: defaultScenarioBase.flyby_day,
    arr_day: defaultScenarioBase.arr_day,
  };
  const earthDep = earthPos(ARC_TIMELINE.dep_day);
  const marsArr = marsPos(ARC_TIMELINE.flyby_day);
  const earthRet = earthPos(ARC_TIMELINE.arr_day);
  const OUT_PTS = outboundArc(earthDep, ARC_STEPS);
  const RET_PTS = returnArc(marsArr, earthRet, ARC_STEPS);

  // ─── State ───────────────────────────────────────────────────────
  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let simDay = $state(ARC_TIMELINE.dep_day);
  let simSpeed = $state(7); // days/sec
  let isPlaying = $state(true);
  let cleanup: (() => void) | undefined;

  // Animation always rides the free-return arc; HUDs surface the
  // loaded mission's identity strings around it.
  let scState = $derived(spacecraftPos(simDay, ARC_TIMELINE, OUT_PTS, RET_PTS));
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
  const ARC_TOTAL_DAYS = ARC_TIMELINE.arr_day - ARC_TIMELINE.dep_day;
  let arcProgress = $derived((simDay - ARC_TIMELINE.dep_day) / ARC_TOTAL_DAYS);
  let totalDays = $derived(mission.timeline.arr_day - mission.timeline.dep_day);
  let met = $derived(Math.max(0, arcProgress * totalDays));
  // Naive ∆v ledger: full burn at TMI plus a small TCM allocation; we
  // surface the prototype's headline numbers without re-running an
  // optimal-burn schedule. 4a-5 will refine.
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
    simDay = ARC_TIMELINE.dep_day + t * ARC_TOTAL_DAYS;
  }

  // ─── Mission loading from URL (?mission=id) ──────────────────────
  // Race-guarded by a monotonic loadId — if a newer URL change comes
  // in while a previous load is in flight, the older promise resolves
  // into a no-op rather than overwriting the newer state.
  let loadFailed = $state(false);
  let currentLoadId = 0;

  function applyMissionAsLoaded(m: Mission) {
    // Real historical missions don't carry a free-return geometry, so
    // we surface their identity in the HUDs while the spacecraft rides
    // the canonical free-return arc geometry. The "flyby day" for a
    // landing is approximated as 95% of the transit time so the arc's
    // closest-approach marker still fires somewhere meaningful.
    const totalT = m.transit_days || 250;
    const flybyOffset = Math.floor(totalT * 0.95);
    const dvTotal = parseDeltaV(m.delta_v);
    mission = {
      name: m.name ?? m.id,
      vehicle: m.vehicle ?? '—',
      payload: m.payload ?? '—',
      dv_total: dvTotal,
      dv_used: dvTotal * 0.94,
      dep_label: m.departure_date ?? defaultScenarioOverlay.dep_label,
      arr_label: m.arrival_date ?? defaultScenarioOverlay.arr_label,
      timeline: {
        dep_day: ARC_TIMELINE.dep_day,
        flyby_day: ARC_TIMELINE.dep_day + flybyOffset,
        arr_day: ARC_TIMELINE.dep_day + totalT,
      },
      isFromData: true,
    };
    simDay = mission.timeline.dep_day;
    if (m.events && m.events.length > 0) {
      missionEvents = m.events;
    }
  }

  function applyScenarioAsLoaded(s: LocalizedScenario) {
    mission = {
      name: s.name,
      vehicle: s.vehicle,
      payload: s.payload,
      dv_total: s.dv_total_km_s,
      dv_used: s.dv_used_km_s,
      dep_label: s.dep_label,
      arr_label: s.arr_label,
      timeline: { dep_day: s.dep_day, flyby_day: s.flyby_day, arr_day: s.arr_day },
      isFromData: true,
    };
    simDay = mission.timeline.dep_day;
    missionEvents = s.events;
  }

  /**
   * Best-effort numeric parse of the `delta_v` string field on
   * historical Mission records. Falls back to the default scenario's
   * dv_total when malformed. Replaces the inline regex from before;
   * extracted so we can unit-test it (Batch 5).
   */
  function parseDeltaV(raw: string | undefined): number {
    if (!raw) return defaultScenarioBase.dv_total_km_s;
    const match = raw.match(/[0-9]+(?:\.[0-9]+)?/);
    if (!match) return defaultScenarioBase.dv_total_km_s;
    const v = parseFloat(match[0]);
    return Number.isFinite(v) && v > 0 ? v : defaultScenarioBase.dv_total_km_s;
  }

  async function loadMissionFromUrl(url: URL): Promise<void> {
    loadFailed = false;
    const id = url.searchParams.get('mission');
    const myLoadId = ++currentLoadId;

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
    // 3D — Three.js scene. Units = AU × SCALE_3D.
    // ──────────────────────────────────────────────────────────────
    const SCALE_3D = 80;
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
    const outVecs = OUT_PTS.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    const retVecs = RET_PTS.map((p) => new THREE.Vector3(p.x * SCALE_3D, 0, p.z * SCALE_3D));
    const outLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(outVecs),
      new THREE.LineBasicMaterial({ color: 0x4466ff, transparent: true, opacity: 0.7 }),
    );
    const retLine = new THREE.Line(
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

    // Spacecraft cone — points along velocity
    const scGeo = new THREE.ConeGeometry(0.9, 2.4, 12);
    scGeo.rotateZ(-Math.PI / 2);
    const scMesh = new THREE.Mesh(scGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scene.add(scMesh);

    // Flyby ring
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
    el3d.style.cursor = 'grab';
    el3d.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el3d.addEventListener('wheel', onWheel, { passive: true });

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
      function drawSplit(pts: typeof OUT_PTS, t: number, past: string, future: string) {
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

      const sc = spacecraftPos(simDay, ARC_TIMELINE, OUT_PTS, RET_PTS);
      drawSplit(OUT_PTS, Math.min(1, sc.progress / 0.5), '#4466ff', 'rgba(68,102,255,0.2)');
      drawSplit(
        RET_PTS,
        Math.max(0, (sc.progress - 0.5) / 0.5),
        '#9966ff',
        'rgba(153,102,255,0.2)',
      );

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
      const heading = spacecraftHeading(simDay, ARC_TIMELINE, OUT_PTS, RET_PTS);
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

      // Flyby ring near Mars
      if (sc.progress >= 0.45 && sc.progress <= 0.55) {
        const pulse = 0.5 + 0.5 * Math.sin(simDay * 0.5);
        ctx2.beginPath();
        ctx2.arc(
          cx + marsArr.x * SCALE_2D,
          cy + marsArr.z * SCALE_2D,
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
        if (simDay > ARC_TIMELINE.arr_day + 30) simDay = ARC_TIMELINE.dep_day;
      }

      const ePos = earthPos(simDay);
      const mPos = marsPos(simDay);
      earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      marsMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);

      const sc = spacecraftPos(simDay, ARC_TIMELINE, OUT_PTS, RET_PTS);
      scMesh.position.set(sc.pos.x * SCALE_3D, 0, sc.pos.z * SCALE_3D);
      const h = spacecraftHeading(simDay, ARC_TIMELINE, OUT_PTS, RET_PTS);
      scMesh.lookAt(scMesh.position.x + h.x * SCALE_3D, 0, scMesh.position.z + h.z * SCALE_3D);

      const splitOut = Math.max(
        2,
        Math.min(outVecs.length, Math.floor(Math.min(1, sc.progress / 0.5) * outVecs.length)),
      );
      outLine.geometry.setDrawRange(0, splitOut);
      const splitRet = Math.max(
        2,
        Math.min(
          retVecs.length,
          Math.floor(Math.max(0, (sc.progress - 0.5) / 0.5) * retVecs.length),
        ),
      );
      retLine.geometry.setDrawRange(0, splitRet);

      flybyRing.position.set(marsArr.x * SCALE_3D, 0, marsArr.z * SCALE_3D);
      flybyRing.visible = sc.progress >= 0.45 && sc.progress <= 0.55;

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

  onDestroy(() => cleanup?.());
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

  <!-- Identity HUD (top-left) -->
  <aside class="hud hud-identity" aria-label={m.fly_panel_identity()} data-testid="mission-name">
    <span class="hud-title">{mission.name}</span>
    <span class="hud-phase phase-{phase}">{phaseLabel}</span>
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

  <!-- Navigation HUD (top-right, but we also have toggle there) -->
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
      <span class="hud-val">{m.fly_hud_eta_value({ day: Math.round(totalDays).toString() })}</span>
    </div>
  </aside>

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

  .hud {
    position: fixed;
    z-index: 30;
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hud-identity {
    top: calc(var(--nav-height) + 12px);
    left: 16px;
  }
  .hud-navigation {
    top: calc(var(--nav-height) + 12px);
    right: 70px;
  }
  .hud-systems {
    bottom: 70px;
    right: 16px;
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
    right: 240px;
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
    right: 70px;
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
  /* Hide the navigation HUD when CAPCOM is open + at the same right
     position; CAPCOM takes priority. */
  @media (min-width: 768px) {
    .capcom-toggle {
      right: 130px;
    }
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
