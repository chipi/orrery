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
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import {
    createDescentScene,
    DESCENT_VEHICLE_LENGTH_KM,
    type DescentScene,
  } from '$lib/three/descent-scene';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { resolveQualitySync } from '$lib/quality/quality-tier';
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
  import {
    ENTRY_TIMELINE_FRAC,
    terminalStartTime,
    warpDescentTime as warpTime,
    unwarpDescentTime as unwarpTime,
  } from '$lib/orbital/descent-timewarp';
  import { BODY_LABEL } from '$lib/orbital/descent-physics-constants';
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

  // Rocky rubble-pile small bodies (no bespoke map yet) borrow Phobos — a real
  // asteroid-like rocky surface — as an honest stand-in rather than a blank sphere.
  const ROCKY_BODIES = new Set(['itokawa', 'ryugu', 'bennu', 'eros', 'comet_67p']);
  const bodyTexName = $derived(
    mission.body === 'venus'
      ? 'venus_atmosphere'
      : ROCKY_BODIES.has(mission.body)
        ? 'phobos'
        : mission.body,
  );

  const dossierRows: [string, string][] = $derived([
    ['BODY', BODY_LABEL[mission.body] ?? mission.body[0].toUpperCase() + mission.body.slice(1)],
    ['SITE', mission.siteName],
    ['EDL SYSTEM', mission.edlSystem],
    ...(mission.entryVelocityKms != null
      ? ([['ENTRY VELOCITY', `${mission.entryVelocityKms.toFixed(2)} km/s`]] as [string, string][])
      : []),
    // Earth re-entry shows the nominal ~14 min entry→splashdown, not the 1-DOF
    // model's inflated path time (RFC-034 §13).
    ['DESCENT', `${Math.round(profile.body === 'earth' ? 840 : duration)} s`],
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
  // Earth capsule re-entry indicators (RFC-034 §13): the plasma comms-blackout
  // during the hypersonic entry, and the drogue → main canopy sequence.
  const isEarthReentry = $derived(profile.body === 'earth');
  const inBlackout = $derived(
    isEarthReentry && liveState.phaseKind === 'ballistic_entry' && liveState.velocityMs > 2000,
  );
  const drogueOut = $derived(isEarthReentry && chuteOut && liveState.altKm >= 3.2);
  const mainOut = $derived(isEarthReentry && chuteOut && liveState.altKm < 3.2);
  // ── Terminal-EDL re-pacing ────────────────────────────────────────────
  // The 1-DOF entry model runs unphysically long, so a linear timeline leaves
  // the terminal EDL — parachute, heat-shield jettison, backshell / skycrane,
  // touchdown (the "seven minutes of terror" money shots) — an unreachable
  // sliver at the very end. We warp the SAMPLE time so the entry owns the first
  // ~45% of the scrubber and the terminal owns the rest; the clock + timeline
  // markers derive from the same warp so everything stays in sync.
  // Entry/terminal warp lives in a shared pure module so the /fly play-clock can
  // find where a sep event lands in raw scrubber time (descent-timewarp.ts).
  const terminalStartT = $derived.by(() => terminalStartTime(summary.states, duration));
  const warpDescentTime = (rawT: number): number =>
    warpTime(rawT, duration, terminalStartT, ENTRY_TIMELINE_FRAC);
  const unwarpDescentTime = (trajT: number): number =>
    unwarpTime(trajT, duration, terminalStartT, ENTRY_TIMELINE_FRAC);

  // The 1-DOF shallow-corridor model yields an unphysically long path (~100 min);
  // a real capsule entry-interface → splashdown is ~14 min. For Earth we display a
  // clock scaled to that nominal so the E+ readout is realistic (the underlying
  // physics — peak-g, sequence, outcome — is unchanged). RFC-034 §13.
  const NOMINAL_EARTH_REENTRY_S = 840;
  const clockT = $derived(
    isEarthReentry && duration > 0
      ? warpDescentTime(t) * (NOMINAL_EARTH_REENTRY_S / duration)
      : warpDescentTime(t),
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
      peakHeatFlux: summary.peakHeat.flux,
    });
    // Hero IBL only on capable GPUs (high+); software-GL / weak renderers skip
    // the per-frame reflection cost. quality-tier.ts iblEnabled.
    ar = createAscentRenderer(container, sceneObj, {
      iblEnabled: resolveQualitySync().iblEnabled,
    });

    // Science-Lens force vectors — the lens layers drive the scene's arrows.
    const forceLayerStops = DESCENT_FORCE_LAYER_ENTRIES.map(([layer, force]) =>
      onLayerChange(layer, (on) => sceneObj?.setForceVisible(force, on)),
    );

    const applyState = () => {
      const s = sampleDescentAt(summary.states, warpDescentTime(t));
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

  {#if !flashing && !hudHidden}
    <!-- 2026 HUD frame — thin cyan corner brackets, no panel. -->
    <span class="frame tl"></span>
    <span class="frame tr"></span>
    <span class="frame bl"></span>
    <span class="frame br"></span>
  {/if}

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
    <div class="sub"><span class="live-dot"></span>EDL · {mission.agency}</div>
  </div>

  <div class="clock">
    <span class="met">{formatDescentClock(clockT)}</span>
    <span
      class="status"
      class:hot={retroOn}
      class:land={liveState.altM <= 0}
      data-testid="descent-status">{status}</span
    >
  </div>

  <!-- EDL indicators — parachute + retro lamps (planetary), or the Earth capsule
       blackout → drogue → main sequence (RFC-034 §13). -->
  <div class="lamps">
    {#if isEarthReentry}
      <span class="lamp blackout" class:on={inBlackout}
        >BLACKOUT<ScienceChip
          tab="mission-phases"
          section="comms-blackout"
          label="Communications blackout"
        /></span
      >
      <span class="lamp" class:on={drogueOut}>DROGUE</span>
      <span class="lamp" class:on={mainOut}>MAIN</span>
    {:else}
      <span class="lamp" class:on={chuteOut}>CHUTE</span>
      <span class="lamp" class:on={retroOn}
        >RETRO<ScienceChip
          tab="mission-phases"
          section="propulsive-landing"
          label="Propulsive landing"
        /></span
      >
    {/if}
  </div>

  <div class="dossier">
    <div class="dossier-title">
      <span
        >{m.fly_descent_dossier_title()}<ScienceChip
          tab="mission-phases"
          section="edl"
          label="Entry, Descent & Landing"
        />{#if isEarthReentry}<ScienceChip
            tab="mission-phases"
            section="deorbit-corridor"
            label="Deorbit & the re-entry corridor"
          />{/if}{#if mission.edlSystem === 'Sky-crane'}<ScienceChip
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
        class:done={warpDescentTime(t) >= b.t}
        class:alt={i % 2 === 1}
        style="left:{duration > 0 ? (unwarpDescentTime(b.t) / duration) * 100 : 0}%"
      >
        <span class="tick"></span><span class="lbl">{b.label}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <div class="readouts">
    <div class="ro">
      <span class="rl"
        >ALTITUDE<ScienceChip
          tab="mission-phases"
          section="ballistic-coefficient"
          label="Ballistic coefficient"
        /></span
      ><span class="rv">{alt.value}</span><span class="ru">{alt.unit}</span>
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
    <button class="continue" onclick={complete}>{m.fly_skip_to_surface()} →</button>
  {/if}

  <!-- Compact always-on mobile strip — phase + altitude + velocity, shown on
       touch viewports where the full HUD is decluttered so mobile still gets
       the key EDL telemetry. -->
  <div class="descent-mstrip" data-testid="descent-mstrip">
    <span class="ms-phase">{status}</span>
    <span class="ms-val">{alt.value}<i>{alt.unit}</i></span>
    <span class="ms-val">{liveState.velocityMs.toFixed(0)}<i>M/S</i></span>
  </div>
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
    color: #7fd4ff;
    margin-top: 3px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
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
  /* 2026 clean phase chip — no panel, just the accent word. */
  .status {
    font-size: 11px;
    letter-spacing: 3px;
    color: #7fd4ff;
  }
  .status.hot {
    color: #ffcf6a;
  }
  .status.land {
    color: #6ff0a0;
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
    color: #7fd4ff;
    border-color: rgba(127, 212, 255, 0.7);
    box-shadow: 0 0 12px rgba(127, 212, 255, 0.3);
  }
  /* Plasma comms-blackout — hotter, pulsing amber-red. */
  .lamp.blackout.on {
    color: #ff8a5a;
    border-color: rgba(255, 110, 60, 0.8);
    box-shadow: 0 0 14px rgba(255, 90, 40, 0.5);
    animation: blackout-pulse 0.9s ease-in-out infinite;
  }
  @keyframes blackout-pulse {
    50% {
      opacity: 0.55;
    }
  }
  /* 2026 corner-bracket frame — thin cyan L's, no fill. */
  .frame {
    position: absolute;
    width: 16px;
    height: 16px;
    border: 1px solid rgba(127, 212, 255, 0.4);
    pointer-events: none;
    z-index: 5;
  }
  .frame.tl {
    top: 12px;
    left: 12px;
    border-right: none;
    border-bottom: none;
  }
  .frame.tr {
    top: 12px;
    right: 12px;
    border-left: none;
    border-bottom: none;
  }
  .frame.bl {
    bottom: 12px;
    left: 12px;
    border-right: none;
    border-top: none;
  }
  .frame.br {
    bottom: 12px;
    right: 12px;
    border-left: none;
    border-top: none;
  }
  /* 2026 clean dossier — no panel; hangs off a single hairline accent rail. */
  .dossier {
    position: absolute;
    top: 90px;
    right: 22px;
    width: 250px;
    padding: 2px 14px 2px 0;
    border-right: 1px solid rgba(127, 212, 255, 0.35);
    text-align: right;
  }
  .dossier-title {
    font-size: 10px;
    letter-spacing: 2px;
    color: #7fd4ff;
    margin: 0 0 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .rep {
    font-size: 8px;
    letter-spacing: 1px;
    color: #7fd4ff;
    border: 1px solid rgba(127, 212, 255, 0.4);
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
  /* Mobile-only compact telemetry strip — shown on touch viewports (where the
     full HUD is decluttered), always visible during descent so mobile keeps the
     key EDL readouts. Not gated by hud-hidden. */
  .descent-mstrip {
    display: none;
  }
  @media (hover: none), (pointer: coarse) {
    .descent-mstrip {
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: baseline;
      gap: 14px;
      padding: 4px 0;
      z-index: 10;
      pointer-events: none;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
    }
  }
  .descent-mstrip .ms-phase {
    font-size: 11px;
    letter-spacing: 1.5px;
    color: #ffcf8a;
  }
  .descent-mstrip .ms-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    color: #fff;
  }
  .descent-mstrip .ms-val i {
    font-size: 9px;
    font-style: normal;
    color: #7d99b5;
    margin-left: 2px;
  }
</style>
