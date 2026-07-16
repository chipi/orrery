<!--
  Dev-only Scene 0 harness for the /fly launch act (PRD-031 / RFC-033 / epic #412).

  Plays the REAL ascent engine (integrateAscent over the Falcon 9 sample) through
  the Three.js Scene-0 render + the multi-scale clock's readouts. Screenshot-loop
  surface for locking the broadcast-grade look against docs/wip/2026-07-16-launch-
  mockups before wiring into /fly (S6).

  Prod-guarded by /dev/+layout.ts (404 + no SSR/prerender). /fly untouched.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { createAscentScene, type AscentScene } from '$lib/three/ascent-scene';
  import { integrateAscent, sampleAscentAt, type AscentSummary } from '$lib/orbital/ascent-physics';
  import { FALCON9_SAMPLE } from '$lib/orbital/ascent-profiles';
  import { formatAscentClock } from '$lib/orbital/ascent-clock';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';

  const summary: AscentSummary = integrateAscent(FALCON9_SAMPLE);
  const duration = summary.states.at(-1)!.t;

  let container: HTMLDivElement;
  let playing = $state(true);
  let speed = $state(5);
  let t = $state(0); // seconds since liftoff

  let renderer: THREE.WebGLRenderer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  // Live telemetry (derived from the sampled state).
  let hud = $state({ altKm: 0, velKms: 0, twr: 0, qkPa: 0, downrangeKm: 0, stage: 'S1', met: 'T+00:00' });

  const stageLabel = (i: number): string => (i < 0 ? 'COAST' : FALCON9_SAMPLE.stages[i]?.name ?? '—');

  onMount(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h);
    // eslint-disable-next-line svelte/no-dom-manipulating
    container.appendChild(renderer.domElement);

    sceneObj = createAscentScene({ aspect: w / h });

    const applyState = () => {
      const s = sampleAscentAt(summary.states, t);
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
    t = 0;
    playing = true;
  };
</script>

<svelte:head><title>/fly launch · Scene 0 (dev)</title></svelte:head>

<div class="wrap">
  <div class="stage" bind:this={container}></div>

  <!-- Broadcast-register telemetry HUD (locked S0 direction). -->
  <div class="hud-top">
    <span class="met">{hud.met}</span>
    <span class="stage-chip">{hud.stage}</span>
  </div>

  <div class="hud-left">
    <div class="row"><span>ALT</span><b>{hud.altKm.toFixed(1)}</b>km</div>
    <div class="row"><span>VEL</span><b>{hud.velKms.toFixed(2)}</b>km/s</div>
    <div class="row"><span>TWR</span><b>{hud.twr.toFixed(2)}</b></div>
    <div class="row"><span>Q</span><b>{hud.qkPa.toFixed(1)}</b>kPa</div>
    <div class="row"><span>DR</span><b>{hud.downrangeKm.toFixed(1)}</b>km</div>
  </div>

  <div class="controls">
    <button onclick={() => (playing = !playing)}>{playing ? '❚❚' : '►'}</button>
    <button onclick={restart}>↺</button>
    <input type="range" min="0" max={duration} step="0.1" bind:value={t} />
    <div class="speeds">
      {#each [1, 5, 20] as sp (sp)}
        <button class:active={speed === sp} onclick={() => (speed = sp)}>{sp}×</button>
      {/each}
    </div>
  </div>

  <p class="tag">Scene 0 · Falcon 9 · ideal Δv {summary.idealDvKms.toFixed(2)} km/s · vehicle scale exaggerated · dev harness</p>
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    background: #03050c;
    color: #dfe8ff;
    font-family: 'Space Mono', monospace;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .hud-top {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .met {
    font-size: 26px;
    letter-spacing: 3px;
    color: #eafaff;
    text-shadow: 0 0 12px rgba(90, 200, 255, 0.4);
  }
  .stage-chip {
    font-size: 11px;
    letter-spacing: 2px;
    color: #7fdfff;
    border: 1px solid rgba(127, 223, 255, 0.5);
    border-radius: 3px;
    padding: 2px 7px;
    align-self: center;
  }
  .hud-left {
    position: absolute;
    top: 70px;
    left: 22px;
    display: grid;
    gap: 6px;
  }
  .row {
    font-size: 12px;
    color: rgba(200, 225, 255, 0.65);
    letter-spacing: 1px;
  }
  .row span {
    display: inline-block;
    width: 34px;
    color: #6ea6cc;
  }
  .row b {
    color: #eafaff;
    font-weight: 700;
    margin-right: 4px;
    min-width: 54px;
    display: inline-block;
    text-align: right;
  }
  .controls {
    position: absolute;
    left: 22px;
    right: 22px;
    bottom: 26px;
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
  .tag {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 10px;
    color: rgba(200, 225, 255, 0.4);
    letter-spacing: 1px;
  }
</style>
