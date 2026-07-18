<!--
  DescentScene — the /fly Entry, Descent & Landing act (RFC-034 §9), the inverse
  of LaunchScene. A self-contained, props-driven player: it integrates the
  descent physics for a DescentProfile and renders the descent scene (Three.js)
  with the EDL HUD — E+ clock, phase strip (ENTRY → CHUTE → POWERED → TOUCHDOWN),
  altitude / velocity / deceleration readouts, and parachute + retro indicators.
  At touchdown it flashes and fires `onComplete` so /fly can hand off to the
  destination body's SurfaceScene, closing the flight circle.

  Isolated from /fly's helio/cislunar rendering — it owns its own renderer +
  container, mounts, plays, and disposes, exactly like LaunchScene.
-->
<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import {
    createDescentScene,
    DESCENT_VEHICLE_LENGTH_KM,
    type DescentScene,
  } from '$lib/three/descent-scene';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import {
    integrateDescent,
    sampleDescentAt,
    type DescentBody,
    type DescentProfile,
    type DescentState,
    type DescentSummary,
  } from '$lib/orbital/descent-physics';
  import {
    buildDescentBeats,
    descentStatus,
    formatDescentAltitude,
  } from '$lib/orbital/descent-hud';
  import { formatDescentClock } from '$lib/orbital/ascent-clock';
  import { onLayerChange } from '$lib/science-layers';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import { DESCENT_FORCE_LAYER_ENTRIES } from '$lib/orbital/descent-force-layers';

  interface DescentDossier {
    name: string;
    agency: string;
    body: DescentBody;
    siteId: string;
    siteName: string;
    edlSystem: string;
    entryVelocityKms?: number;
  }

  interface Props {
    profile: DescentProfile;
    mission: DescentDossier;
    /** Fired at touchdown (or SKIP) → /fly hands off to the SurfaceScene. */
    onComplete?: () => void;
    hudHidden?: boolean;
    onToggleHud?: () => void;
    /** Descent time (s) from the entry interface. Bindable — the /fly master
     *  clock drives this when `externalClock` is set; else self-advanced. */
    t?: number;
    playing?: boolean;
    /** Descent real-time multiplier (×). Bindable — driven by the speed pills. */
    speed?: number;
    /** When true, DescentScene does NOT self-advance `t` — the master clock owns it. */
    externalClock?: boolean;
  }
  let {
    profile,
    mission,
    onComplete,
    hudHidden = false,
    onToggleHud,
    t = $bindable(0),
    playing = $bindable(true),
    speed = $bindable(3),
    externalClock = false,
  }: Props = $props();

  const summary: DescentSummary = $derived(integrateDescent(profile));
  const duration = $derived(summary.totalDurationS);
  const beats = $derived(buildDescentBeats(summary));

  const bodyTexName = $derived(mission.body === 'venus' ? 'venus_atmosphere' : mission.body);

  const dossierRows: [string, string][] = $derived([
    ['BODY', mission.body[0].toUpperCase() + mission.body.slice(1)],
    ['SITE', mission.siteName],
    ['EDL SYSTEM', mission.edlSystem],
    ...(mission.entryVelocityKms != null
      ? ([['ENTRY VELOCITY', `${mission.entryVelocityKms.toFixed(2)} km/s`]] as [string, string][])
      : []),
    ['DESCENT', `${Math.round(duration)} s`],
  ]);

  let container: HTMLDivElement;
  let done = $state(false);
  let ar: AscentRenderer | undefined;
  let sceneObj: DescentScene | undefined;
  let loop: AnimateLoop | undefined;

  let liveState = $state<DescentState>(untrack(() => summary.states[0]));
  let flashing = $state(false);
  let flashProgress = $state(0);
  const FLASH_S = 1.2;

  const status = $derived(descentStatus(liveState, summary));
  const alt = $derived(formatDescentAltitude(liveState.altKm));
  const progressPct = $derived(Math.max(0, Math.min(1, duration > 0 ? t / duration : 0)) * 100);
  const chuteOut = $derived(
    liveState.phaseKind === 'parachute' || liveState.phaseKind === 'aeroshell_descent',
  );
  const retroOn = $derived(
    liveState.phaseKind === 'powered_retro' || liveState.phaseKind === 'skycrane',
  );

  // Begin the touchdown flash. The real handoff (onComplete) fires when it ends.
  const complete = () => {
    if (done || flashing) return;
    flashing = true;
    playing = false;
  };

  onMount(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    sceneObj = createDescentScene({
      aspect: w / h,
      body: mission.body,
      bodyTextureUrl: `${base}/textures/2k_${bodyTexName}.jpg`,
      landingSite: profile.landingSite,
      vehicleLengthKm: DESCENT_VEHICLE_LENGTH_KM,
      siteId: mission.siteId,
      events: summary.events,
    });
    ar = createAscentRenderer(container, sceneObj);

    // Science-Lens force vectors — the lens layers drive the scene's arrows.
    const forceLayerStops = DESCENT_FORCE_LAYER_ENTRIES.map(([layer, force]) =>
      onLayerChange(layer, (on) => sceneObj?.setForceVisible(force, on)),
    );

    const applyState = () => {
      const s = sampleDescentAt(summary.states, t);
      sceneObj!.setState(s);
      liveState = s;
    };
    applyState();

    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          if (!externalClock) t = Math.min(duration, t + dt * speed);
          if (t >= duration) complete();
        }
        applyState();
        if (flashing) {
          flashProgress = Math.min(1, flashProgress + dt / FLASH_S);
          if (flashProgress >= 1 && !done) {
            done = true;
            onComplete?.();
          }
        }
        ar!.render();
      },
    });
    loop.start();

    const onResize = () => ar?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      forceLayerStops.forEach((stop) => stop?.());
    };
  });

  onDestroy(() => {
    loop?.cleanup();
    sceneObj?.dispose();
    ar?.dispose();
  });
</script>

<div
  class="descent"
  class:hud-hidden={hudHidden}
  class:external={externalClock}
  data-testid="descent-scene"
>
  <div class="stage" bind:this={container}></div>

  {#if flashing}
    <div class="flash" style="opacity:{Math.min(1, flashProgress / 0.7)}"></div>
  {/if}

  {#if !flashing}
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
    <div class="mission" data-testid="descent-mission">{mission.name}</div>
    <div class="sub">EDL · {mission.agency}</div>
  </div>

  <div class="clock">
    <span class="met">{formatDescentClock(t)}</span>
    <span
      class="status"
      class:hot={retroOn}
      class:land={liveState.altM <= 0}
      data-testid="descent-status">{status}</span
    >
  </div>

  <!-- EDL indicators — parachute + retro lamps. -->
  <div class="lamps">
    <span class="lamp" class:on={chuteOut}>CHUTE</span>
    <span class="lamp" class:on={retroOn}>RETRO</span>
  </div>

  <div class="dossier">
    <div class="dossier-title">
      <span
        >DESCENT DOSSIER<ScienceChip
          tab="mission-phases"
          section="edl"
          label="Entry, Descent & Landing"
        />{#if mission.edlSystem === 'Sky-crane'}<ScienceChip
            tab="mission-phases"
            section="skycrane"
            label="Sky-crane"
          />{/if}</span
      >
      {#if profile.source_tier === 'generic'}<span class="rep">REPRESENTATIVE</span>{/if}
    </div>
    <dl>
      {#each dossierRows as [k, v] (k)}
        <dt>{k}</dt>
        <dd>{v}</dd>
      {/each}
    </dl>
  </div>

  <div class="timeline">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each beats as b, i (b.label + b.t)}
      <div
        class="beat"
        class:done={t >= b.t}
        class:alt={i % 2 === 1}
        style="left:{duration > 0 ? (b.t / duration) * 100 : 0}%"
      >
        <span class="tick"></span><span class="lbl">{b.label}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <div class="readouts">
    <div class="ro">
      <span class="rl">ALTITUDE</span><span class="rv">{alt.value}</span><span class="ru"
        >{alt.unit}</span
      >
    </div>
    <div class="ro">
      <span class="rl"
        >VELOCITY<ScienceChip
          tab="mission-phases"
          section="terminal-velocity"
          label="Terminal velocity"
        /></span
      ><span class="rv">{liveState.velocityMs.toFixed(0)}</span><span class="ru">M/S</span>
    </div>
    <div class="ro">
      <span class="rl"
        >DECEL<ScienceChip
          tab="mission-phases"
          section="entry-heating"
          label="Entry heating"
        /></span
      ><span class="rv">{liveState.decelG.toFixed(1)}</span><span class="ru">G</span>
    </div>
  </div>

  {#if !flashing}
    <button class="continue" onclick={complete}>SKIP TO SURFACE →</button>
  {/if}
</div>

<style>
  .descent {
    position: fixed;
    inset: 0;
    background: #03050c;
    color: #eaf2ff;
    font-family: 'Space Mono', monospace;
    z-index: 200;
  }
  /* Driven by the shared /fly master scrubber (externalClock): hide the local
     transport strip + skip + big readouts to avoid a parallel timeline. */
  .descent.external .timeline,
  .descent.external .readouts,
  .descent.external .continue,
  .descent.external .hud-collapse {
    display: none;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .header,
  .clock,
  .lamps,
  .dossier,
  .timeline,
  .readouts {
    transition: opacity 0.3s ease;
  }
  .descent.hud-hidden .header,
  .descent.hud-hidden .clock,
  .descent.hud-hidden .lamps,
  .descent.hud-hidden .dossier,
  .descent.hud-hidden .timeline,
  .descent.hud-hidden .readouts {
    opacity: 0;
    pointer-events: none;
  }
  .flash {
    position: absolute;
    inset: 0;
    z-index: 30;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 60%,
      rgba(255, 240, 210, 0.96) 0%,
      rgba(220, 180, 130, 0.55) 30%,
      rgba(80, 50, 30, 0.2) 62%,
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
    color: #d0a884;
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
  .status.land {
    color: #6ff0a0;
    border-color: rgba(111, 240, 160, 0.6);
  }
  .lamps {
    position: absolute;
    top: 92px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
  }
  .lamp {
    font-size: 10px;
    letter-spacing: 2px;
    color: #55606e;
    border: 1px solid rgba(120, 130, 145, 0.3);
    border-radius: 3px;
    padding: 2px 8px;
  }
  .lamp.on {
    color: #ffcf6a;
    border-color: rgba(255, 190, 74, 0.7);
    box-shadow: 0 0 12px rgba(255, 160, 40, 0.3);
  }
  .dossier {
    position: absolute;
    top: 90px;
    right: 22px;
    width: 250px;
    padding: 14px 16px;
    background: rgba(4, 9, 20, 0.72);
    border: 1px solid rgba(216, 168, 130, 0.28);
    border-radius: 6px;
    backdrop-filter: blur(6px);
  }
  .dossier-title {
    font-size: 10px;
    letter-spacing: 2px;
    color: #d0a884;
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
    background: linear-gradient(90deg, #d99a44, #ffe0b0);
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
    color: rgba(240, 220, 200, 0.5);
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
    color: #ffcf8a;
  }
  .beat.done .tick {
    background: #d99a44;
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
    gap: 46px;
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
  .hud-collapse {
    position: absolute;
    left: 22px;
    bottom: 26px;
    z-index: 6;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(10, 20, 34, 0.82);
    border: 1px solid rgba(216, 168, 130, 0.4);
    color: #f0d8bf;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .hud-collapse:hover {
    background: rgba(216, 168, 130, 0.25);
    color: #fff;
  }
  .continue {
    position: absolute;
    right: 22px;
    bottom: 26px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    color: #f0d8bf;
    background: rgba(10, 20, 34, 0.85);
    border: 1px solid rgba(216, 168, 130, 0.5);
    border-radius: 5px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .continue:hover {
    background: rgba(216, 168, 130, 0.25);
    color: #fff;
  }
</style>
