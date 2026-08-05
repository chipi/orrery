<!--
  CoastScene — the /fly orbit-coast act (RFC-034 §13 · Tier-1 Earth-orbit).

  The middle beat between LaunchScene (ascent) and DescentScene (re-entry): the
  capsule coasts in low Earth orbit, looping the planet before the deorbit burn.
  Renders `fly-leo-coast-scene` (Earth + orbit ring + capsule) and plays the
  hybrid coast rule — a few representative loops while the HUD counters carry the
  real MET + revolution count. Self-contained: owns its renderer + container,
  mounts, plays a compressed coast, and fires `onComplete` to hand off to the
  re-entry act.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import {
    createLeoCoastScene,
    type LeoCoastScene,
    type CoastCamDebug,
  } from '$lib/three/fly-leo-coast-scene';
  import { onLayerChange } from '$lib/science-layers';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { buildCapsuleById } from '$lib/three/capsule-models';
  import { coastAltitudeKm, type EarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';

  interface Props {
    coast: EarthOrbitCoast;
    missionName: string;
    agency: string;
    onComplete?: () => void;
    hudHidden?: boolean;
    onToggleHud?: () => void;
    /** Coast fraction [0,1]. Bindable — when `externalClock` is set, /fly's master
     *  scrubber drives this (unified pad→orbit→re-entry timeline); otherwise the
     *  scene self-advances it and writes it back. */
    t?: number;
    externalClock?: boolean;
  }
  let {
    coast,
    missionName,
    agency,
    onComplete,
    hudHidden = false,
    onToggleHud,
    t = $bindable(0),
    externalClock = false,
  }: Props = $props();

  /** Wall-clock seconds to play the whole compressed coast. */
  const PLAY_S = 22;

  let container: HTMLDivElement;
  let sceneObj: LeoCoastScene | null = null;
  let ar: AscentRenderer | null = null;
  let animLoop: AnimateLoop | null = null;
  let done = false;
  let layerStops: Array<(() => void) | undefined> = [];

  // The coast is a scrubbable player: `coastFraction` (0..1) is the single source
  // of truth — auto-advanced while `playing`, set by dragging the scrubber, or
  // (externalClock) driven by /fly's master scrubber via `t`. Everything (capsule
  // position, REV counter, MET/date clock) derives from it, so scrubbing "moves
  // the day" — Marko's ask.
  let coastFraction = $state(0);
  let playing = $state(true);

  // Camera-debug overlay (?debug=1): the coast analogue of the ascent camera
  // debug, so this flight type's shot rig is visible + inspectable like the
  // others. Mirrors the scene's live camera + active shot each frame.
  const debugOn =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';
  let camDbg = $state<CoastCamDebug | null>(null);
  const fmt3 = (v: [number, number, number]): string => v.map((n) => n.toFixed(0)).join(', ');
  // When /fly's master clock drives us, mirror `t` into the render fraction.
  $effect(() => {
    if (externalClock) coastFraction = Math.min(1, Math.max(0, t));
  });

  const altKm = coastAltitudeKm(coast);
  // Real elapsed seconds + revolution the counters read (the honest scale).
  let metS = $derived(coastFraction * coast.coastDurationS);
  let rev = $derived(
    Math.min(coast.revolutions, Math.floor(coastFraction * coast.revolutions) + 1),
  );
  let deorbitInS = $derived((1 - coastFraction) * coast.coastDurationS);

  function onScrub(e: Event) {
    playing = false;
    coastFraction = Number((e.currentTarget as HTMLInputElement).value) / 1000;
  }

  function fmtClock(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function finish() {
    if (done) return;
    done = true;
    onComplete?.();
  }

  onMount(() => {
    sceneObj = createLeoCoastScene({
      container,
      aspect: container.clientWidth / container.clientHeight,
      altitudeKm: altKm,
      inclinationDeg: coast.inclinationDeg,
      totalRevs: coast.revolutions,
      suborbital: coast.suborbital,
      buildCapsule: () => buildCapsuleById(coast.capsuleId),
      earthTextureUrl: `${base}/textures/2k_earth_daymap.jpg`,
    });
    ar = createAscentRenderer(container, sceneObj);

    if (debugOn && typeof window !== 'undefined') {
      (
        window as unknown as { __flyCoastCamDebug?: () => CoastCamDebug | null }
      ).__flyCoastCamDebug = () => sceneObj?.getCameraDebug() ?? null;
    }

    // Science-Lens force vectors — the orbit trio. Free-fall coast has no thrust
    // or drag, so only gravity (weight, inward), velocity (tangent), and the
    // centripetal acceleration gravity supplies are meaningful here.
    layerStops = [
      onLayerChange('gravity', (on) => sceneObj?.setForceVisible('weight', on)),
      onLayerChange('velocity', (on) => sceneObj?.setForceVisible('velocity', on)),
      onLayerChange('centripetal', (on) => sceneObj?.setCentripetalVisible(on)),
    ];

    animLoop = createAnimateLoop({
      onFrame: ({ dt }) => {
        // externalClock: /fly's master scrubber owns the fraction (via `t`); we only
        // render. Standalone: advance the playhead while playing / scrubbing.
        if (!externalClock && playing) coastFraction = Math.min(1, coastFraction + dt / PLAY_S);
        sceneObj!.setState({ coastFraction, metS: coastFraction * coast.coastDurationS, rev });
        ar!.render();
        if (debugOn) camDbg = sceneObj!.getCameraDebug();
        if (!externalClock && playing && coastFraction >= 1) {
          finish();
          animLoop?.stop();
          return;
        }
      },
      reducedMotion: () => false,
    });
    animLoop.start();

    const onResize = () => ar?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    animLoop?.cleanup();
    layerStops.forEach((stop) => stop?.());
    ar?.dispose();
    sceneObj?.dispose();
  });
</script>

<div class="coast" class:hud-hidden={hudHidden}>
  <div class="canvas" bind:this={container}></div>

  {#if debugOn && camDbg}
    <div class="cam-debug">
      <div class="cd-title">COAST CAMERA · {camDbg.suborbital ? 'SUBORBITAL' : 'ORBITAL'}</div>
      <div class="cd-row">
        <span>SHOT</span><b>{camDbg.shot}</b><span>{camDbg.shotIndex + 1}/{camDbg.shotCount}</span>
      </div>
      <div class="cd-strip">
        {#each Array(camDbg.shotCount) as _, i (i)}
          <span class="cd-seg" class:active={i === camDbg.shotIndex}></span>
        {/each}
      </div>
      <div class="cd-row"><span>FRAC</span><b>{(camDbg.fraction * 100).toFixed(1)}%</b></div>
      <div class="cd-row"><span>CAM</span><b>{fmt3(camDbg.camPos)}</b></div>
      <div class="cd-row"><span>LOOK</span><b>{fmt3(camDbg.lookAt)}</b></div>
      <div class="cd-row"><span>DIST</span><b>{camDbg.camDistKm.toFixed(0)} km</b></div>
    </div>
  {/if}

  {#if !hudHidden}
    <div class="hud">
      <!-- 2026 HUD frame — thin corner brackets, no panel. -->
      <span class="frame tl"></span>
      <span class="frame tr"></span>
      <span class="frame bl"></span>
      <span class="frame br"></span>
      <div class="title">
        <span class="phase"
          ><span class="live-dot"></span>{coast.suborbital ? 'SUBORBITAL' : 'ON ORBIT'}</span
        >
        <span class="name">{missionName}</span>
        {#if agency}<span class="agency">{agency}</span>{/if}
      </div>

      <div class="readouts">
        <div class="ro">
          <span class="k"
            >MET<ScienceChip
              tab="mission-phases"
              section="met"
              label="Mission Elapsed Time"
            /></span
          ><span class="v">T+{fmtClock(metS)}</span>
        </div>
        {#if !coast.suborbital}
          <div class="ro rev">
            <span class="k"
              >REV<ScienceChip tab="orbits" section="orbit-regimes" label="Orbit regimes" /></span
            ><span class="v">{rev} / {coast.revolutions}</span>
          </div>
          <div class="ro">
            <span class="k"
              >ORBIT<ScienceChip tab="orbits" section="apsides" label="Apogee & perigee" /></span
            ><span class="v">{coast.perigeeKm}×{coast.apogeeKm} km · {coast.inclinationDeg}°</span>
          </div>
          <div class="ro">
            <span class="k"
              >DEORBIT&nbsp;IN<ScienceChip
                tab="mission-phases"
                section="deorbit-corridor"
                label="Deorbit & the re-entry corridor"
              /></span
            ><span class="v">{fmtClock(deorbitInS)}</span>
          </div>
        {:else}
          <div class="ro">
            <span class="k"
              >APOGEE<ScienceChip tab="orbits" section="apsides" label="Apogee & perigee" /></span
            ><span class="v">{coast.apogeeKm} km</span>
          </div>
          <div class="ro">
            <span class="k"
              >SPLASHDOWN&nbsp;IN<ScienceChip
                tab="mission-phases"
                section="deorbit-corridor"
                label="Deorbit & the re-entry corridor"
              /></span
            ><span class="v">{fmtClock(deorbitInS)}</span>
          </div>
        {/if}
      </div>

      {#if !externalClock}
        <div class="scrub">
          <div class="scrub-fill" style="width:{coastFraction * 100}%"></div>
          <input
            class="scrub-input"
            type="range"
            min="0"
            max="1000"
            value={Math.round(coastFraction * 1000)}
            oninput={onScrub}
            aria-label="Scrub the orbit coast"
          />
        </div>
      {/if}
    </div>

    {#if !externalClock}
      <div class="controls">
        <button
          class="ctl"
          onclick={() => (playing = !playing)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        {#if onToggleHud}
          <button class="ctl" onclick={onToggleHud} aria-label="Hide HUD">HUD</button>
        {/if}
        <button class="ctl skip" onclick={finish}>SKIP TO DE-ORBIT →</button>
      </div>
    {/if}
  {:else if onToggleHud}
    <button class="ctl show-hud" onclick={onToggleHud} aria-label="Show HUD">HUD</button>
  {/if}
</div>

<style>
  .coast {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: #000;
  }
  .canvas {
    width: 100%;
    height: 100%;
  }
  /* Coast camera-debug overlay (?debug=1) — the coast analogue of AscentCameraDebug. */
  .cam-debug {
    position: absolute;
    top: 4.5rem;
    left: 1.2rem;
    z-index: 300;
    pointer-events: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    color: #9fe0ff;
    background: rgba(6, 12, 22, 0.72);
    border: 1px solid rgba(127, 212, 255, 0.3);
    border-radius: 4px;
    padding: 0.5rem 0.65rem;
    display: grid;
    gap: 0.22rem;
    min-width: 190px;
  }
  .cd-title {
    color: #7fd4ff;
    font-weight: 600;
    letter-spacing: 0.14em;
    margin-bottom: 0.15rem;
  }
  .cd-row {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }
  .cd-row span {
    color: #6b7d94;
  }
  .cd-row b {
    color: #eaf3ff;
    font-weight: 500;
  }
  .cd-strip {
    display: flex;
    gap: 3px;
    margin: 0.15rem 0;
  }
  .cd-seg {
    flex: 1;
    height: 4px;
    background: rgba(127, 212, 255, 0.2);
    border-radius: 2px;
  }
  .cd-seg.active {
    background: #7fd4ff;
  }
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #cfe4ff;
  }
  .title {
    position: absolute;
    top: 1.1rem;
    left: 1.2rem;
    display: flex;
    align-items: baseline;
    gap: 0.8rem;
  }
  .phase {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #7fd4ff;
    letter-spacing: 0.22em;
    font-weight: 600;
    font-size: 0.72rem;
  }
  /* Live pulse — the "on air" tell of a broadcast HUD. */
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7fd4ff;
    box-shadow: 0 0 8px rgba(127, 212, 255, 0.9);
    animation: live-pulse 1.6s ease-in-out infinite;
  }
  @keyframes live-pulse {
    50% {
      opacity: 0.3;
    }
  }
  .name {
    font-size: 1.05rem;
    letter-spacing: 0.04em;
    color: #eaf3ff;
  }
  .agency {
    color: #7f93ad;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }
  /* Readout stack — hairline accent rail on the right, no panel. */
  .readouts {
    position: absolute;
    top: 1.1rem;
    right: 1.2rem;
    display: grid;
    gap: 0.4rem;
    text-align: right;
    padding-right: 0.7rem;
    border-right: 1px solid rgba(127, 212, 255, 0.35);
  }
  .ro {
    display: flex;
    gap: 0.8rem;
    justify-content: flex-end;
    align-items: baseline;
  }
  .ro .k {
    color: #6b7d94;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
  }
  .ro .v {
    font-size: 0.98rem;
    color: #eaf3ff;
    font-variant-numeric: tabular-nums;
  }
  .ro.rev .v {
    color: #7fd4ff;
    font-weight: 600;
  }
  /* 2026 corner-bracket frame — thin cyan L's, no fill. */
  .frame {
    position: absolute;
    width: 16px;
    height: 16px;
    border: 1px solid rgba(127, 212, 255, 0.4);
    pointer-events: none;
  }
  .frame.tl {
    top: 0.7rem;
    left: 0.7rem;
    border-right: none;
    border-bottom: none;
  }
  .frame.tr {
    top: 0.7rem;
    right: 0.7rem;
    border-left: none;
    border-bottom: none;
  }
  .frame.bl {
    bottom: 0.7rem;
    left: 0.7rem;
    border-right: none;
    border-top: none;
  }
  .frame.br {
    bottom: 0.7rem;
    right: 0.7rem;
    border-left: none;
    border-top: none;
  }
  .scrub {
    position: absolute;
    left: 1.2rem;
    right: 1.2rem;
    bottom: 3.2rem;
    height: 3px;
    background: rgba(143, 208, 255, 0.18);
    border-radius: 2px;
  }
  .scrub-fill {
    height: 100%;
    background: #6fb7ff;
    border-radius: 2px;
  }
  .scrub-input {
    position: absolute;
    inset: -9px 0;
    width: 100%;
    height: 21px;
    margin: 0;
    pointer-events: auto;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .scrub-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #cfe4ff;
    border: 2px solid #6fb7ff;
    cursor: pointer;
  }
  .scrub-input::-moz-range-thumb {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #cfe4ff;
    border: 2px solid #6fb7ff;
    cursor: pointer;
  }
  .controls {
    position: absolute;
    bottom: 1rem;
    right: 1.2rem;
    display: flex;
    gap: 0.6rem;
  }
  .ctl {
    pointer-events: auto;
    background: rgba(20, 32, 50, 0.72);
    color: #cfe4ff;
    border: 1px solid rgba(111, 183, 255, 0.35);
    border-radius: 4px;
    padding: 0.4rem 0.7rem;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .ctl:hover {
    border-color: rgba(111, 183, 255, 0.7);
  }
  .ctl.skip {
    color: #ffd9a3;
    border-color: rgba(255, 217, 163, 0.4);
  }
  .show-hud {
    position: absolute;
    bottom: 1rem;
    right: 1.2rem;
    pointer-events: auto;
    background: rgba(20, 32, 50, 0.72);
    color: #cfe4ff;
    border: 1px solid rgba(111, 183, 255, 0.35);
    border-radius: 4px;
    padding: 0.4rem 0.7rem;
    font-size: 0.72rem;
  }
  /* Portrait phones: the title + top-right readouts collide at ~393px. Drop the
     mission name/agency (the phase chip carries the context) + shrink the
     readouts so the two top corners never meet. Landscape (>640px) is unaffected. */
  @media (max-width: 640px) {
    .title {
      top: 0.7rem;
      left: 0.8rem;
    }
    .name,
    .agency {
      display: none;
    }
    .readouts {
      top: 0.7rem;
      right: 0.8rem;
      gap: 0.22rem;
    }
    .ro .k {
      font-size: 0.56rem;
      letter-spacing: 0.08em;
    }
    .ro .v {
      font-size: 0.78rem;
    }
    .controls {
      bottom: 0.7rem;
      right: 0.8rem;
    }
  }
</style>
