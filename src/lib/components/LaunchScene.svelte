<!--
  LaunchScene — the /fly launch pre-roll (RFC-033 · epic #412 · Track A).

  A self-contained, props-driven player: it integrates the ascent physics for a
  LaunchProfile and renders Scene 0 (Three.js) with the broadcast HUD — T-minus
  countdown → mission dossier → SPEED/ALTITUDE + event-timeline strip. When the
  ascent reaches orbit (or the user clicks CONTINUE), it fires `onComplete` so
  /fly can hand off to the heliocentric / cislunar transfer.

  Deliberately isolated from /fly's helio/cislunar rendering — it owns its own
  renderer + container, mounts, plays, and disposes. The dev harness
  (/dev/ascent) keeps the full telemetry console + camera-debug toolkit; this is
  the shipping-facing subset.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
  import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
  import { createAscentScene, type AscentScene } from '$lib/three/ascent-scene';
  import {
    integrateAscent,
    sampleAscentAt,
    type AscentSummary,
    type AscentState,
    type LaunchProfile,
  } from '$lib/orbital/ascent-physics';
  import { formatAscentClock } from '$lib/orbital/ascent-clock';
  import { buildShotSchedule } from '$lib/orbital/ascent-cameras';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';

  interface MissionDossier {
    name: string;
    agency: string;
    site: string;
    destination: string;
  }

  interface Props {
    profile: LaunchProfile;
    mission: MissionDossier;
    /** Fired when the ascent reaches orbit or the user clicks CONTINUE. */
    onComplete?: () => void;
    /** Shared with /fly — hides the launch HUD set (same toggle as the sim HUD). */
    hudHidden?: boolean;
    /** Flip the shared HUD-hidden state. */
    onToggleHud?: () => void;
  }
  let { profile, mission, onComplete, hudHidden = false, onToggleHud }: Props = $props();

  const VEH_LEN = 1.2;
  const T_MINUS = 12;
  const IGNITION_T = -3;
  const ORBIT_TARGET_KMS = 7.8;

  const summary: AscentSummary = integrateAscent(profile);
  const duration = summary.states.at(-1)!.t;
  const schedule = buildShotSchedule({ events: summary.events, maxQt: summary.maxQ.t, duration });

  const vehStats: [string, string][] = [
    ['STAGES', String(profile.stages.length)],
    ['LIFTOFF THRUST', `${(profile.stages[0].thrustSlKN ?? profile.stages[0].thrustVacKN).toLocaleString()} kN`],
    ['IDEAL ΔV', `${summary.idealDvKms.toFixed(2)} km/s`],
    ['PAYLOAD', `${profile.payloadKg.toLocaleString()} kg`],
  ];

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
    const hasSepNear = (t: number) => raw.some((b) => b.label === 'STAGE SEP' && Math.abs(b.t - t) < 2);
    return raw.filter((b) => !(b.label === 'MECO' && hasSepNear(b.t))).sort((a, b) => a.t - b.t);
  })();

  let container: HTMLDivElement;
  let playing = $state(true);
  let speed = $state(5);
  let t = $state(-T_MINUS);
  let done = $state(false);

  let renderer: THREE.WebGLRenderer | undefined;
  let composer: EffectComposer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  let hud = $state({ altKm: 0, velKms: 0, stage: 'S1', met: 'T-00:12' });
  // Re-basing warp: on completion the camera pulls back hard (Earth → a dot) +
  // a flash, then onComplete reveals the transfer scene (RFC-033 §11.3).
  let warping = $state(false);
  let warpProgress = $state(0);
  const WARP_S = 1.6;

  const stageLabel = (i: number): string => (i < 0 ? 'COAST' : profile.stages[i]?.name ?? '—');
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
    stageIndex: tt < IGNITION_T ? -1 : 0,
    thrustN: tt < IGNITION_T ? 0 : summary.states[0].thrustN,
    dragN: 0,
  });

  // Begin the re-basing warp. The real handoff (onComplete) fires when it ends.
  const complete = () => {
    if (done || warping) return;
    warping = true;
    playing = false;
  };

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
      earthDayUrl: `${base}/textures/4k_earth_daymap.jpg`,
      earthNightUrl: `${base}/textures/2k_earth_nightmap.jpg`,
      launchSite: profile.launchSite,
      vehicleLengthKm: VEH_LEN,
      schedule,
    });

    composer = new EffectComposer(renderer);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(sceneObj.scene, sceneObj.camera));
    composer.addPass(new FilmPass(0.1));
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms['offset'].value = 0.95;
    vignette.uniforms['darkness'].value = 0.55;
    composer.addPass(vignette);

    const applyState = () => {
      const s = t < 0 ? padState(t) : sampleAscentAt(summary.states, t);
      sceneObj!.setState(s);
      hud = {
        altKm: s.altKm,
        velKms: s.speedKms,
        stage: stageLabel(s.stageIndex),
        met: formatAscentClock(s.t),
      };
    };
    applyState();

    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          t = Math.min(duration, t + dt * speed);
          if (t >= duration) complete();
        }
        applyState();
        // Re-basing warp — camera accelerates backward so Earth recedes to a
        // dot; when the flash peaks, hand off to the transfer scene.
        if (warping && sceneObj) {
          warpProgress = Math.min(1, warpProgress + dt / WARP_S);
          sceneObj.camera.translateZ(dt * (600 + warpProgress * 45000));
          if (warpProgress >= 1 && !done) {
            done = true;
            onComplete?.();
          }
        }
        composer!.render();
      },
    });
    loop.start();

    const onResize = () => {
      if (!renderer || !sceneObj || !composer) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      sceneObj.setAspect(cw / ch);
      renderer.setSize(cw, ch);
      composer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    loop?.cleanup();
    composer?.dispose();
    sceneObj?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  });
</script>

<div class="launch" class:hud-hidden={hudHidden}>
  <div class="stage" bind:this={container}></div>

  {#if warping}
    <div class="warp" style="opacity:{Math.min(1, warpProgress / 0.75)}"></div>
  {/if}

  <!-- HUD collapse — the shared toggle (same one that manages the sim HUD). -->
  {#if !warping}
    <button
      class="hud-collapse"
      onclick={() => onToggleHud?.()}
      aria-label={hudHidden ? 'Show HUD panels' : 'Hide HUD panels'}
      aria-pressed={hudHidden}
      title={hudHidden ? 'Show HUD' : 'Hide HUD'}
    >
      {hudHidden ? '◐' : '◑'}
    </button>
  {/if}

  <div class="header">
    <div class="mission">{mission.name}</div>
    <div class="sub">{profile.name} · {mission.agency}</div>
  </div>

  <div class="clock">
    <span class="met">{hud.met}</span>
    <span class="status" class:hot={t >= IGNITION_T && t < 6}>{status}</span>
  </div>

  {#if countdown !== null}
    {#key countdown}
      <div class="count">{countdown}</div>
    {/key}
  {/if}

  <div class="dossier" class:open={dossierOpen}>
    <div class="dossier-title">
      MISSION DOSSIER
      {#if profile.source_tier === 'generic'}<span class="rep">REPRESENTATIVE</span>{/if}
    </div>
    <dl>
      <dt>VEHICLE</dt><dd>{profile.name}</dd>
      <dt>LAUNCH SITE</dt><dd>{mission.site}</dd>
      <dt>DESTINATION</dt><dd>{mission.destination}</dd>
      {#each vehStats as [k, v] (k)}
        <dt>{k}</dt><dd>{v}</dd>
      {/each}
    </dl>
  </div>

  <div class="timeline">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each beats as b, i (b.label + b.t)}
      <div class="beat" class:done={t >= b.t} class:alt={i % 2 === 1} style="left:{(b.t / duration) * 100}%">
        <span class="tick"></span><span class="lbl">{b.label}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <div class="readouts">
    <div class="ro"><span class="rl">SPEED</span><span class="rv">{speedKmh.toLocaleString()}</span><span class="ru">KM/H</span></div>
    <div class="ro"><span class="rl">ALTITUDE</span><span class="rv">{hud.altKm.toFixed(0)}</span><span class="ru">KM</span></div>
  </div>

  {#if !warping}
    <button class="continue" onclick={complete}>SKIP TO CRUISE →</button>
  {/if}
</div>

<style>
  .launch {
    position: fixed;
    inset: 0;
    background: #03050c;
    color: #eaf2ff;
    font-family: 'Space Mono', monospace;
    z-index: 200;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  /* HUD-hidden — the shared toggle collapses the launch HUD set (matches the
     sim HUD's hudHidden), leaving just the scene + the collapse + skip buttons. */
  .header,
  .clock,
  .count,
  .dossier,
  .timeline,
  .readouts {
    transition: opacity 0.3s ease;
  }
  .launch.hud-hidden .header,
  .launch.hud-hidden .clock,
  .launch.hud-hidden .count,
  .launch.hud-hidden .dossier,
  .launch.hud-hidden .timeline,
  .launch.hud-hidden .readouts {
    opacity: 0;
    pointer-events: none;
  }
  .hud-collapse {
    position: absolute;
    left: 22px;
    bottom: 26px;
    z-index: 6;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(10, 20, 34, 0.82);
    border: 1px solid rgba(127, 223, 255, 0.4);
    color: #cfeaff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .hud-collapse:hover {
    background: rgba(90, 200, 255, 0.25);
    color: #fff;
  }
  .warp {
    position: absolute;
    inset: 0;
    z-index: 30;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 45%,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(180, 220, 255, 0.6) 28%,
      rgba(30, 60, 120, 0.25) 58%,
      transparent 100%
    );
  }
  .header {
    position: absolute;
    top: 20px;
    left: 22px;
  }
  .mission {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  }
  .sub {
    font-size: 11px;
    letter-spacing: 2px;
    color: #8fbfe0;
    margin-top: 3px;
  }
  .clock {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .met {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 4px;
    color: #eafaff;
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
  }
  .count {
    position: absolute;
    top: 22%;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 140px;
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
  .dossier {
    position: absolute;
    top: 90px;
    right: 22px;
    width: 250px;
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
  }
  .dossier.open {
    opacity: 1;
    transform: translateX(0);
  }
  .dossier-title {
    font-size: 10px;
    letter-spacing: 2px;
    color: #5ac8ff;
    margin: 0 0 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .rep {
    font-size: 8px;
    letter-spacing: 1px;
    color: #ffbe4a;
    border: 1px solid rgba(255, 190, 74, 0.5);
    border-radius: 3px;
    padding: 1px 4px;
  }
  .dossier dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
    margin: 0;
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
  .timeline {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 78px;
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
  }
  .readouts {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 56px;
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
    font-size: 40px;
    line-height: 1;
    color: #fff;
  }
  .ru {
    font-size: 12px;
    letter-spacing: 1px;
    color: #7d99b5;
  }
  .continue {
    position: absolute;
    right: 22px;
    bottom: 26px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    color: #cfeaff;
    background: rgba(10, 20, 34, 0.85);
    border: 1px solid rgba(127, 223, 255, 0.5);
    border-radius: 5px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .continue:hover {
    background: rgba(90, 200, 255, 0.25);
    color: #fff;
  }
</style>
