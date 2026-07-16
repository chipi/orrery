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

  let renderer: THREE.WebGLRenderer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  let hud = $state({ altKm: 0, velKms: 0, twr: 0, qkPa: 0, downrangeKm: 0, stage: 'S1', met: 'T-00:12' });

  const stageLabel = (i: number): string => (i < 0 ? 'COAST' : FALCON9_SAMPLE.stages[i]?.name ?? '—');

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
        met: formatAscentClock(s.t),
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

  <!-- Secondary telemetry (compact, left) -->
  <div class="telem-side">
    <div><span>TWR</span><b>{hud.twr.toFixed(2)}</b></div>
    <div><span>Q</span><b>{hud.qkPa.toFixed(1)}</b><i>kPa</i></div>
    <div><span>DR</span><b>{hud.downrangeKm.toFixed(0)}</b><i>km</i></div>
    <div><span>STAGE</span><b>{hud.stage}</b></div>
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
  </div>
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

  /* Secondary telemetry */
  .telem-side {
    position: absolute;
    top: 120px;
    left: 22px;
    display: grid;
    gap: 6px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  }
  .telem-side div {
    font-size: 12px;
    color: rgba(200, 225, 255, 0.7);
    letter-spacing: 1px;
  }
  .telem-side span {
    display: inline-block;
    width: 46px;
    color: #6ea6cc;
  }
  .telem-side b {
    color: #eafaff;
    min-width: 44px;
    display: inline-block;
    text-align: right;
  }
  .telem-side i {
    font-style: normal;
    color: #6ea6cc;
    margin-left: 3px;
    font-size: 10px;
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
</style>
