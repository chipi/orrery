<!--
  Dev-only Scene 0 harness for the /fly launch act (PRD-031 / RFC-033 / epic #412).

  Plays the REAL ascent engine (integrateAscent over the Falcon 9 sample) through
  the Three.js Scene-0 render with a NASA/SpaceX-broadcast-style HUD: a T-minus
  countdown that surfaces the mission dossier, big SPEED/ALTITUDE readouts, and an
  event-timeline strip. Screenshot-loop surface for locking the broadcast look
  before wiring into /fly (S6).

  Prod-guarded by /dev/+layout.ts (404 + no SSR/prerender). /fly untouched.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createAscentScene, type AscentScene } from '$lib/three/ascent-scene';
  import { integrateAscent, sampleAscentAt, type AscentSummary, type AscentState } from '$lib/orbital/ascent-physics';
  import { FALCON9_SAMPLE } from '$lib/orbital/ascent-profiles';
  import { formatAscentClock } from '$lib/orbital/ascent-clock';
  import { buildShotSchedule } from '$lib/orbital/ascent-cameras';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';

  const summary: AscentSummary = integrateAscent(FALCON9_SAMPLE);
  const duration = summary.states.at(-1)!.t;
  const schedule = buildShotSchedule({ events: summary.events, maxQt: summary.maxQ.t, duration });

  // Countdown: begin on the pad at T-minus; engines light at ignition.
  const T_MINUS = 12;
  const IGNITION_T = -3;

  // Mission dossier (harness placeholder — comes from the real mission + profile once wired to /fly).
  const mission = {
    name: 'DEMO ASCENT',
    agency: 'SpaceX',
    vehicle: FALCON9_SAMPLE.name,
    site: 'SLC-40 · Cape Canaveral',
    destination: 'Low Earth Orbit',
    payload: `${FALCON9_SAMPLE.payloadKg.toLocaleString()} kg`,
  };
  const vehStats: [string, string][] = [
    ['STAGES', String(FALCON9_SAMPLE.stages.length)],
    ['LIFTOFF THRUST', `${(FALCON9_SAMPLE.stages[0].thrustSlKN ?? 0).toLocaleString()} kN`],
    ['IDEAL ΔV', `${summary.idealDvKms.toFixed(2)} km/s`],
    ['PROPELLANT', 'RP-1 / LOX'],
  ];

  // Event-timeline markers (Max-Q + staging beats), de-duped when they coincide.
  const BEAT_LABEL: Record<string, string> = {
    meco: 'MECO',
    staging: 'STAGE SEP',
    fairing_jettison: 'FAIRING',
    seco: 'SECO',
    orbit: 'ORBIT',
  };
  const beats = (() => {
    const raw = [
      { label: 'MAX-Q', t: summary.maxQ.t },
      ...summary.events.filter((e) => BEAT_LABEL[e.type]).map((e) => ({ label: BEAT_LABEL[e.type], t: e.t })),
    ].filter((b) => b.t > 0 && b.t <= duration);
    // Drop MECO when STAGE SEP lands within 2 s (they coincide in the model).
    const hasSepNear = (t: number) => raw.some((b) => b.label === 'STAGE SEP' && Math.abs(b.t - t) < 2);
    return raw.filter((b) => !(b.label === 'MECO' && hasSepNear(b.t))).sort((a, b) => a.t - b.t);
  })();

  let container: HTMLDivElement;
  let playing = $state(true);
  let speed = $state(5);
  let t = $state(-T_MINUS);
  let forcesOn = $state(false);

  let renderer: THREE.WebGLRenderer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  let hud = $state({
    altKm: 0,
    velKms: 0,
    twr: 0,
    qkPa: 0,
    downrangeKm: 0,
    stage: 'S1',
    stageIndex: 0,
    propRemainingKg: 0,
    met: 'T-00:12',
  });

  const stageLabel = (i: number): string => (i < 0 ? 'COAST' : FALCON9_SAMPLE.stages[i]?.name ?? '—');

  // ── Launch-console derived values (grounded in the /science articles) ──
  const ORBIT_TARGET_KMS = 7.8; // circular LEO speed — the "will it make it" line (dv-budget)
  const liftoffMass = summary.states[0].massKg;
  const stageProps = FALCON9_SAMPLE.stages.map((s) => Math.max(1, s.wetKg - s.dryKg));
  const totalProp = stageProps.reduce((a, b) => a + b, 0);
  const propPct = Math.round((totalProp / liftoffMass) * 100); // the "~88% is fuel" story
  const payloadPct = ((FALCON9_SAMPLE.payloadKg / liftoffMass) * 100).toFixed(1);
  const maxQpeak = summary.maxQ.qPa / 1000;

  // Per-stage fuel %: full on the pad, spent stages 0, future stages full,
  // active stage drains live.
  const stageFuelPct = (i: number): number => {
    if (t < 0) return 100; // tanks loaded through the countdown
    if (hud.stageIndex < 0) return 0;
    if (i < hud.stageIndex) return 0;
    if (i > hud.stageIndex) return 100;
    return Math.round((hud.propRemainingKg / stageProps[i]) * 100);
  };
  const activeEngines = $derived(hud.stageIndex >= 0 ? (FALCON9_SAMPLE.stages[hud.stageIndex].engines ?? 1) : 0);
  const twrPct = $derived(Math.min(1, hud.twr / 2.5) * 100);

  // ── Live strip charts (real-telemetry style): each series is the full
  //    flight profile; the traversed portion draws bright over a ghost. ──
  const CHART_W = 214;
  const CHART_H = 30;
  type Pt = [number, number];
  const seriesFor = (acc: (s: (typeof summary.states)[number]) => number, maxV: number): Pt[] =>
    summary.states.map((s) => [
      (s.t / duration) * CHART_W,
      CHART_H - Math.min(1, Math.max(0, acc(s)) / maxV) * CHART_H,
    ]);
  const altMax = Math.max(...summary.states.map((s) => s.altKm)) * 1.05;
  const heatPeak = Math.max(...summary.states.map((s) => s.aeroHeatFlux)) || 1;
  const altPts = seriesFor((s) => s.altKm, altMax);
  const velPts = seriesFor((s) => s.speedKms, ORBIT_TARGET_KMS * 1.05);
  const qPts = seriesFor((s) => s.qPa / 1000, maxQpeak * 1.12);
  const heatPts = seriesFor((s) => s.aeroHeatFlux, heatPeak * 1.05);
  const poly = (pts: Pt[]): string => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  // Temperature readouts.
  let hudTemp = $state({ chamberK: 0, heatPct: 0 });
  const nowIdx = $derived.by(() => {
    const tt = Math.max(0, t);
    let idx = 0;
    for (let i = 0; i < summary.states.length; i++) {
      if (summary.states[i].t <= tt) idx = i;
      else break;
    }
    return idx;
  });
  const trace = (pts: Pt[], n: number): string => poly(pts.slice(0, n + 1));
  const area = (pts: Pt[], n: number): string => {
    const seg = pts.slice(0, n + 1);
    if (seg.length === 0) return '';
    return `M ${seg[0][0].toFixed(1)},${CHART_H} L ${trace(pts, n)} L ${seg[seg.length - 1][0].toFixed(1)},${CHART_H} Z`;
  };

  // Derived broadcast readouts.
  const countdown = $derived(t < 0 ? Math.max(0, Math.ceil(-t)) : null);
  const speedKmh = $derived(Math.round(hud.velKms * 3600));
  const dossierOpen = $derived(t < 3);
  const progressPct = $derived(Math.max(0, Math.min(1, t / duration)) * 100);
  const status = $derived.by(() => {
    if (t <= -10) return 'GO FOR LAUNCH';
    if (t < IGNITION_T) return 'TERMINAL COUNT';
    if (t < 0) return 'IGNITION SEQUENCE';
    if (t < 10) return 'LIFTOFF';
    const passed = beats.filter((b) => b.t <= t);
    return passed.length ? passed[passed.length - 1].label : 'ASCENT';
  });

  const padState = (tt: number): AscentState => ({
    ...summary.states[0],
    t: tt,
    altKm: 0,
    downrangeKm: 0,
    speedKms: 0,
    velUpKms: 0,
    qPa: 0,
    stageIndex: tt < IGNITION_T ? -1 : 0, // engines light at ignition
    thrustN: tt < IGNITION_T ? 0 : summary.states[0].thrustN,
    dragN: 0,
  });

  onMount(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    // eslint-disable-next-line svelte/no-dom-manipulating
    container.appendChild(renderer.domElement);

    sceneObj = createAscentScene({
      aspect: w / h,
      earthDayUrl: `${base}/textures/2k_earth_daymap.jpg`,
      earthNightUrl: `${base}/textures/2k_earth_nightmap.jpg`,
      schedule,
    });

    (window as unknown as Record<string, unknown>).__ascentDebug = { schedule, events: summary.events, maxQ: summary.maxQ, duration };

    const applyState = () => {
      const s = t < 0 ? padState(t) : sampleAscentAt(summary.states, t);
      sceneObj!.setState(s);
      hud = {
        altKm: s.altKm,
        velKms: s.speedKms,
        twr: s.twr,
        qkPa: s.qPa / 1000,
        downrangeKm: s.downrangeKm,
        stage: stageLabel(s.stageIndex),
        stageIndex: s.stageIndex,
        propRemainingKg: s.propRemainingKg,
        met: formatAscentClock(s.t),
      };
      hudTemp = {
        chamberK: t < 0 ? 0 : s.chamberTempK,
        heatPct: t < 0 ? 0 : Math.round((s.aeroHeatFlux / heatPeak) * 100),
      };
    };
    applyState();

    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          t = Math.min(duration, t + dt * speed);
          if (t >= duration) playing = false;
        }
        applyState();
        renderer!.render(sceneObj!.scene, sceneObj!.camera);
      },
    });
    loop.start();

    const onResize = () => {
      if (!renderer || !sceneObj) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      sceneObj.setAspect(cw / ch);
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    loop?.cleanup();
    sceneObj?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  });

  const restart = () => {
    sceneObj?.reset();
    t = -T_MINUS;
    playing = true;
  };

  // Science-Lens force vectors follow the toggle.
  $effect(() => {
    sceneObj?.setForcesVisible(forcesOn);
  });
</script>

<svelte:head><title>/fly launch · Scene 0 (dev)</title></svelte:head>

<div class="wrap">
  <div class="stage" bind:this={container}></div>

  <!-- Mission header (broadcast lower-third, top-left) -->
  <div class="header">
    <div class="mission">{mission.name}</div>
    <div class="sub">{mission.vehicle} · {mission.agency}</div>
  </div>

  <!-- Master clock + status (top-center) -->
  <div class="clock">
    <span class="met">{hud.met}</span>
    <span class="status" class:hot={t >= IGNITION_T && t < 6}>{status}</span>
  </div>

  <!-- T-minus countdown number -->
  {#if countdown !== null}
    {#key countdown}
      <div class="count">{countdown}</div>
    {/key}
  {/if}

  <!-- Mission dossier (surfaces during the countdown, fades at liftoff) -->
  <div class="dossier" class:open={dossierOpen}>
    <div class="dossier-title">MISSION DOSSIER</div>
    <dl>
      <dt>VEHICLE</dt><dd>{mission.vehicle}</dd>
      <dt>LAUNCH SITE</dt><dd>{mission.site}</dd>
      <dt>DESTINATION</dt><dd>{mission.destination}</dd>
      <dt>PAYLOAD</dt><dd>{mission.payload}</dd>
    </dl>
    <div class="dossier-title">LAUNCH VEHICLE</div>
    <dl>
      {#each vehStats as [k, v] (k)}
        <dt>{k}</dt><dd>{v}</dd>
      {/each}
    </dl>
  </div>

  <!-- Launch console — telemetry cluster grounded in the /science articles -->
  {#snippet chartRow(label: string, sci: string, pts: Pt[], color: string, val: string)}
    <section class="chart-row">
      <header>{label}<em>{sci}</em></header>
      <div class="chart-wrap">
        <svg class="chart" viewBox="0 0 {CHART_W} {CHART_H}" preserveAspectRatio="none">
          <line class="grid" x1="0" y1={CHART_H * 0.5} x2={CHART_W} y2={CHART_H * 0.5} />
          <polyline class="ghost" points={poly(pts)} />
          <path class="carea" d={area(pts, nowIdx)} style="fill:{color}" />
          <polyline class="cline" points={trace(pts, nowIdx)} style="stroke:{color}" />
          <circle class="cdot" cx={pts[nowIdx][0]} cy={pts[nowIdx][1]} r="1.8" style="fill:{color}" />
        </svg>
        <span class="chart-val" style="color:{color}">{val}</span>
      </div>
    </section>
  {/snippet}

  <div class="console">
    <div class="console-title">LAUNCH TELEMETRY<em>{mission.vehicle}</em></div>

    <!-- PROPELLANT — the "tyranny of the rocket equation" made kinetic -->
    <section>
      <header>PROPELLANT<em>tsiolkovsky</em></header>
      <div class="fuel-headline"><b>{propPct}%</b> fuel by mass · payload {payloadPct}%</div>
      {#each FALCON9_SAMPLE.stages as st, i (st.name)}
        <div class="reservoir">
          <span class="rlabel">{st.name}</span>
          <div class="rbar"><div class="rfill" style="width:{stageFuelPct(i)}%"></div></div>
          <span class="rpct">{stageFuelPct(i)}%</span>
        </div>
      {/each}
    </section>

    {@render chartRow('ALTITUDE', 'launch', altPts, '#5ac8ff', `${hud.altKm.toFixed(0)} km`)}
    {@render chartRow('VELOCITY', 'dv-budget', velPts, '#7fe0ff', `${hud.velKms.toFixed(2)} km/s`)}
    {@render chartRow('DYNAMIC PRESSURE', 'max-q', qPts, '#9a8bff', `${hud.qkPa.toFixed(1)} kPa`)}
    {@render chartRow('AERO HEATING', 'launch', heatPts, '#ff8a4a', `${hudTemp.heatPct}%`)}

    <!-- THRUST/WEIGHT + CHAMBER TEMP -->
    <section class="dual">
      <div>
        <header>T/W<em>twr</em></header>
        <div class="gauge">
          <div class="gfill" class:go={hud.twr >= 1} style="width:{twrPct}%"></div>
          <div class="gmark" style="left:40%"></div>
          <span class="gval">{hud.twr.toFixed(2)}</span>
        </div>
      </div>
      <div>
        <header>CHAMBER<em>engine-types</em></header>
        <div class="gauge">
          <div class="gfill temp" style="width:{hudTemp.chamberK > 0 ? 100 : 0}%"></div>
          <span class="gval">{hudTemp.chamberK > 0 ? `${hudTemp.chamberK} K` : '— cold'}</span>
        </div>
      </div>
    </section>

    <!-- ENGINES — clustering + engine-out (all online) -->
    <section>
      <header>ENGINES · {activeEngines} ONLINE<em>engine-clustering</em></header>
      <div class="engines">
        {#each Array(activeEngines) as _, i (i)}
          <i class="eng"></i>
        {/each}
      </div>
    </section>

    <!-- GO / NO-GO status -->
    <section class="status-lights">
      {#each ['GUIDANCE', 'GIMBAL', 'SENSORS', 'PRESS', 'RANGE'] as lg (lg)}
        <span class="light" class:armed={t < IGNITION_T && (lg === 'PRESS' || lg === 'RANGE')}>
          <i></i>{lg}
        </span>
      {/each}
    </section>
  </div>

  <!-- Event-timeline strip -->
  <div class="timeline">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each beats as b, i (b.label + b.t)}
      <div class="beat" class:done={t >= b.t} class:alt={i % 2 === 1} style="left:{(b.t / duration) * 100}%">
        <span class="tick"></span><span class="lbl">{b.label}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <!-- Big SPEED / ALTITUDE (SpaceX-style) -->
  <div class="readouts">
    <div class="ro">
      <span class="rl">SPEED</span>
      <span class="rv">{speedKmh.toLocaleString()}</span><span class="ru">KM/H</span>
    </div>
    <div class="ro">
      <span class="rl">ALTITUDE</span>
      <span class="rv">{hud.altKm.toFixed(0)}</span><span class="ru">KM</span>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <button onclick={() => (playing = !playing)}>{playing ? '❚❚' : '►'}</button>
    <button onclick={restart}>↺</button>
    <input type="range" min={-T_MINUS} max={duration} step="0.1" bind:value={t} />
    <div class="speeds">
      {#each [1, 5, 20] as sp (sp)}
        <button class:active={speed === sp} onclick={() => (speed = sp)}>{sp}×</button>
      {/each}
    </div>
    <button class="forces-btn" class:active={forcesOn} onclick={() => (forcesOn = !forcesOn)}>
      SCIENCE LENS · FORCES
    </button>
  </div>

  <!-- Force legend (Science Lens) -->
  {#if forcesOn}
    <div class="legend">
      <span><i style="background:#54e08a"></i>THRUST</span>
      <span><i style="background:#ff5a5a"></i>WEIGHT</span>
      <span><i style="background:#5aa0ff"></i>DRAG</span>
      <span><i style="background:#7fe0ff"></i>VELOCITY</span>
    </div>
  {/if}
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    background: #03050c;
    color: #eaf2ff;
    font-family: 'Space Mono', monospace;
  }
  .stage {
    position: absolute;
    inset: 0;
  }

  /* Mission header */
  .header {
    position: absolute;
    top: 66px;
    left: 22px;
  }
  .mission {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 30px;
    letter-spacing: 3px;
    line-height: 1;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  }
  .sub {
    font-size: 11px;
    letter-spacing: 2px;
    color: #8fbfe0;
    margin-top: 3px;
  }

  /* Master clock */
  .clock {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .met {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 34px;
    letter-spacing: 4px;
    color: #eafaff;
    text-shadow: 0 0 14px rgba(90, 200, 255, 0.45);
  }
  .status {
    font-size: 11px;
    letter-spacing: 3px;
    color: #7fdfff;
    border: 1px solid rgba(127, 223, 255, 0.4);
    border-radius: 3px;
    padding: 2px 9px;
    background: rgba(3, 8, 18, 0.45);
  }
  .status.hot {
    color: #ffcf6a;
    border-color: rgba(255, 207, 106, 0.6);
    text-shadow: 0 0 10px rgba(255, 180, 60, 0.5);
  }

  /* Countdown number */
  .count {
    position: absolute;
    top: 22%;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 150px;
    line-height: 1;
    color: #fff;
    text-shadow: 0 0 40px rgba(90, 200, 255, 0.6);
    animation: pop 1s ease-out;
  }
  @keyframes pop {
    0% {
      transform: translateX(-50%) scale(1.35);
      opacity: 0.25;
    }
    30% {
      opacity: 1;
    }
    100% {
      transform: translateX(-50%) scale(1);
      opacity: 0.9;
    }
  }

  /* Dossier */
  .dossier {
    position: absolute;
    top: 120px;
    right: 22px;
    width: 260px;
    padding: 14px 16px;
    background: rgba(4, 9, 20, 0.72);
    border: 1px solid rgba(127, 223, 255, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(6px);
    opacity: 0;
    transform: translateX(20px);
    transition:
      opacity 0.5s ease,
      transform 0.5s ease;
    pointer-events: none;
  }
  .dossier.open {
    opacity: 1;
    transform: translateX(0);
  }
  .dossier-title {
    font-size: 10px;
    letter-spacing: 2px;
    color: #5ac8ff;
    margin: 4px 0 8px;
  }
  .dossier dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
    margin: 0 0 12px;
  }
  .dossier dt {
    font-size: 10px;
    letter-spacing: 1px;
    color: #7d99b5;
  }
  .dossier dd {
    margin: 0;
    font-size: 11px;
    text-align: right;
    color: #eaf2ff;
  }

  /* Launch console */
  .console {
    position: absolute;
    top: 116px;
    left: 22px;
    width: 250px;
    max-height: calc(100vh - 208px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 11px;
    padding: 13px 14px;
    background: linear-gradient(180deg, rgba(6, 12, 24, 0.82), rgba(4, 9, 18, 0.72));
    border: 1px solid rgba(127, 223, 255, 0.22);
    border-radius: 7px;
    backdrop-filter: blur(7px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
    scrollbar-width: thin;
    scrollbar-color: rgba(127, 223, 255, 0.35) transparent;
  }
  .console-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 2px;
    color: #eafaff;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(127, 223, 255, 0.15);
  }
  .console-title em {
    font-family: 'Space Mono', monospace;
    font-style: normal;
    font-size: 9px;
    letter-spacing: 1px;
    color: #6ea6cc;
  }
  /* Strip charts */
  .chart-row header {
    margin-bottom: 3px;
  }
  .chart-wrap {
    position: relative;
  }
  .chart {
    width: 100%;
    height: 30px;
    display: block;
    background: rgba(255, 255, 255, 0.03);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .chart .grid {
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 0.5;
    stroke-dasharray: 2 2;
  }
  .chart .ghost {
    fill: none;
    stroke: rgba(180, 210, 240, 0.22);
    stroke-width: 0.8;
  }
  .chart .carea {
    opacity: 0.16;
    stroke: none;
  }
  .chart .cline {
    fill: none;
    stroke-width: 1.4;
    filter: drop-shadow(0 0 2px currentColor);
  }
  .chart-val {
    position: absolute;
    top: 1px;
    right: 4px;
    font-size: 10px;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
  }
  .dual {
    flex-direction: row;
    gap: 12px;
  }
  .dual > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .gfill.temp {
    background: linear-gradient(90deg, #ff5a2a, #ffd36a);
  }
  .console section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .console header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: #8fbfe0;
  }
  .console header em {
    font-style: normal;
    font-size: 8px;
    letter-spacing: 1px;
    color: #4d7fa0;
  }
  .console header em::before {
    content: '▸ ';
  }
  .fuel-headline {
    font-size: 10px;
    color: #cfe3f5;
    line-height: 1.3;
  }
  .fuel-headline b {
    color: #ffcf6a;
    font-size: 15px;
  }
  .reservoir {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rlabel {
    font-size: 10px;
    color: #7d99b5;
    width: 20px;
  }
  .rbar {
    flex: 1;
    height: 9px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .rfill {
    height: 100%;
    background: linear-gradient(90deg, #ff8a3c, #ffd36a);
    transition: width 0.12s linear;
  }
  .rpct {
    font-size: 10px;
    color: #eaf2ff;
    width: 34px;
    text-align: right;
  }
  .gauge {
    position: relative;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .gfill {
    height: 100%;
    background: #ff7a5a;
    transition: width 0.12s linear;
  }
  .gfill.go {
    background: linear-gradient(90deg, #54e08a, #9ff5c2);
  }
  .gfill.q {
    background: linear-gradient(90deg, #5aa0ff, #a9d0ff);
  }
  .gfill.orbit {
    background: linear-gradient(90deg, #5ac8ff, #eafaff);
  }
  .gmark {
    position: absolute;
    top: -1px;
    width: 2px;
    height: 14px;
    background: #fff;
    opacity: 0.7;
  }
  .gval {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 9px;
    color: #eaf2ff;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
  }
  .engines {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .eng {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #9ff5c2, #2ea86a);
    box-shadow: 0 0 5px rgba(84, 224, 138, 0.6);
  }
  .status-lights {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .status-lights .light {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    letter-spacing: 1px;
    color: #a9c6dc;
  }
  .status-lights .light i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #54e08a;
    box-shadow: 0 0 5px rgba(84, 224, 138, 0.7);
  }
  .status-lights .light.armed i {
    background: #ffbe4a;
    box-shadow: 0 0 5px rgba(255, 190, 74, 0.7);
  }

  /* Event timeline */
  .timeline {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 96px;
    height: 30px;
  }
  .track {
    position: absolute;
    top: 22px;
    left: 0;
    right: 0;
    height: 2px;
    background: rgba(255, 255, 255, 0.15);
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #5ac8ff, #eafaff);
    box-shadow: 0 0 8px rgba(90, 200, 255, 0.6);
  }
  .beat {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    text-align: center;
  }
  .beat .tick {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 10px;
    background: rgba(255, 255, 255, 0.35);
  }
  .beat .lbl {
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(200, 225, 255, 0.5);
    white-space: nowrap;
    display: inline-block;
  }
  .beat.alt .lbl {
    transform: translateY(20px);
  }
  .beat.alt .tick {
    height: 20px;
  }
  .beat.done .lbl {
    color: #7fdfff;
  }
  .beat.done .tick {
    background: #5ac8ff;
  }
  .head {
    position: absolute;
    top: 16px;
    width: 3px;
    height: 14px;
    background: #fff;
    transform: translateX(-50%);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
  }

  /* Big readouts */
  .readouts {
    position: absolute;
    bottom: 58px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 64px;
  }
  .ro {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .rl {
    font-size: 11px;
    letter-spacing: 2px;
    color: #7d99b5;
  }
  .rv {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 44px;
    line-height: 1;
    color: #fff;
    text-shadow: 0 0 16px rgba(90, 200, 255, 0.35);
  }
  .ru {
    font-size: 12px;
    letter-spacing: 1px;
    color: #7d99b5;
  }

  /* Controls */
  .controls {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .controls input[type='range'] {
    flex: 1;
    accent-color: #5ac8ff;
  }
  .controls button {
    background: rgba(10, 20, 34, 0.8);
    border: 1px solid rgba(127, 223, 255, 0.4);
    color: #cfeaff;
    border-radius: 4px;
    padding: 4px 9px;
    cursor: pointer;
    font-family: inherit;
  }
  .speeds {
    display: flex;
    gap: 4px;
  }
  .speeds button.active {
    background: rgba(90, 200, 255, 0.25);
    border-color: #5ac8ff;
    color: #fff;
  }
  .forces-btn {
    font-size: 10px;
    letter-spacing: 1px;
  }
  .forces-btn.active {
    background: rgba(84, 224, 138, 0.2);
    border-color: #54e08a;
    color: #cffce0;
  }

  /* Force legend */
  .legend {
    position: absolute;
    left: 22px;
    bottom: 130px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    background: rgba(4, 9, 20, 0.7);
    border: 1px solid rgba(127, 223, 255, 0.2);
    border-radius: 5px;
  }
  .legend span {
    font-size: 10px;
    letter-spacing: 1px;
    color: #cfe3f5;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .legend i {
    width: 14px;
    height: 3px;
    border-radius: 2px;
    display: inline-block;
  }
</style>
