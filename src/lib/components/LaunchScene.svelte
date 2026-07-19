<!--
  LaunchScene — the /fly launch pre-roll (RFC-034 · epic #412 · Track A).

  A self-contained, props-driven player: it integrates the ascent physics for a
  LaunchProfile and renders Scene 0 (Three.js) with the broadcast HUD — T-minus
  countdown → mission dossier → SPEED/ALTITUDE + event-timeline strip. When the
  ascent reaches orbit (or the user clicks CONTINUE), it fires `onComplete` so
  /fly can hand off to the heliocentric / cislunar transfer.

  Deliberately isolated from /fly's helio/cislunar rendering — it owns its own
  renderer + container, mounts, plays, and disposes.
-->
<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { createAscentScene, VEHICLE_LENGTH_KM, type AscentScene } from '$lib/three/ascent-scene';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { resolveLaunchGround } from '$lib/three/launch-ground';
  import LaunchTelemetry from '$lib/components/LaunchTelemetry.svelte';
  import AscentLosses from '$lib/components/AscentLosses.svelte';
  import {
    integrateAscent,
    sampleAscentAt,
    type AscentSummary,
    type AscentState,
    type LaunchProfile,
  } from '$lib/orbital/ascent-physics';
  import {
    IGNITION_T_S,
    T_MINUS_S,
    INJECTION_COAST_S,
    INJECTION_BURN_S,
    buildAscentBeats,
    ascentStatus,
    countdownSeconds,
    injectionPhaseStatus,
    padState,
  } from '$lib/orbital/ascent-hud';
  import { injectionBurnLabel, type InjectionBurnParams } from '$lib/orbital/injection-burn';
  import { formatAscentClock } from '$lib/orbital/ascent-clock';
  import { buildShotSchedule, defaultTuning } from '$lib/orbital/ascent-cameras';
  import AscentCameraDebug from '$lib/components/AscentCameraDebug.svelte';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import { onLayerChange } from '$lib/science-layers';
  import { LAUNCH_FORCE_LAYER_ENTRIES } from '$lib/orbital/launch-force-layers';

  interface MissionDossier {
    name: string;
    agency: string;
    site: string;
    destination: string;
    /** Mission id → the payload's dedicated spacecraft model (else a generic bus). */
    spacecraftId?: string;
    /** The post-SECO injection burn (RFC-034 §3.1); null when the mission has no
     *  kick/upper injection stage — the beat is then absent. */
    injectionBurn?: InjectionBurnParams | null;
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
    /** Mission time (s), negative during countdown. Bindable — the /fly master
     *  clock drives this when `externalClock` is set (RFC-034 §4 unified clock);
     *  otherwise LaunchScene self-advances it. */
    t?: number;
    /** Play/pause. Bindable so the shared /fly control bar governs it. */
    playing?: boolean;
    /** Ascent real-time multiplier (×). Bindable — driven by the shared speed pills. */
    speed?: number;
    /** When true, LaunchScene does NOT self-advance `t` — the parent's master
     *  clock owns time (the extensibility seam a future DescentScene reuses). */
    externalClock?: boolean;
  }
  let {
    profile,
    mission,
    onComplete,
    hudHidden = false,
    onToggleHud,
    t = $bindable(-T_MINUS_S),
    playing = $bindable(true),
    speed = $bindable(5),
    externalClock = false,
  }: Props = $props();

  const tuning = $state(defaultTuning()); // live per-shot camera tuning (debug sliders → scene)
  const debugMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  const summary: AscentSummary = $derived(integrateAscent(profile));
  const duration = $derived(summary.totalDurationS);
  const schedule = $derived(
    buildShotSchedule({ events: summary.events, maxQt: summary.maxQ.t, duration }),
  );

  // Post-SECO injection beat (RFC-034 §3.1): a parking-orbit coast then the kick
  // stage firing, appended to the ascent before the warp. Absent when the
  // mission has no injection stage.
  const injection = $derived(mission.injectionBurn ?? null);
  const injectionBurnStart = $derived(duration + INJECTION_COAST_S);
  const injectionEnd = $derived(duration + INJECTION_COAST_S + INJECTION_BURN_S);
  /** End of the launch phase — SECO, or the injection-burn end when present. */
  const ascentEnd = $derived(injection ? injectionEnd : duration);
  /** Kick stage actually firing (drives the plume). */
  const injectionFiring = $derived(!!injection && t >= injectionBurnStart && t < injectionEnd);
  /** The whole post-SECO injection window (coast + burn) — drives the HUD panel. */
  const injectionBeatActive = $derived(!!injection && t >= duration && t < injectionEnd);
  /** Injection-burn completion (%): 0 through the parking coast, fills 0→100 as
   *  the kick stage fires. NOT stage fuel — the ascent telemetry already shows
   *  the (spent) ascent stages; per-kick-stage propellant masses aren't modelled. */
  const injectionBurnProgress = $derived(
    !injection || t < injectionBurnStart
      ? 0
      : Math.min(1, (t - injectionBurnStart) / INJECTION_BURN_S) * 100,
  );

  const vehStats: [string, string][] = $derived([
    ['STAGES', String(profile.stages.length)],
    [
      'LIFTOFF THRUST',
      `${(profile.stages[0].thrustSlKN ?? profile.stages[0].thrustVacKN).toLocaleString()} kN`,
    ],
    ['IDEAL ΔV', `${summary.idealDvKms.toFixed(2)} km/s`],
    ['PAYLOAD', `${profile.payloadKg.toLocaleString()} kg`],
  ]);

  const beats = $derived(buildAscentBeats(summary));

  let container: HTMLDivElement;
  let done = $state(false);
  let showLosses = $state(false); // ascent-losses lens layer → AscentLosses panel

  let ar: AscentRenderer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  let hud = $state({ altKm: 0, velKms: 0, stage: 'S1', met: 'T-00:12' });
  // Seeded once from the initial state, then reassigned every frame by applyState().
  let liveState = $state<AscentState>(untrack(() => summary.states[0]));
  // Re-basing warp: on completion the camera pulls back hard (Earth → a dot) +
  // a flash, then onComplete reveals the transfer scene (RFC-034 §11.3).
  let warping = $state(false);
  let warpProgress = $state(0);
  const WARP_S = 1.6;

  const stageLabel = (i: number): string => (i < 0 ? 'COAST' : (profile.stages[i]?.name ?? '—'));
  const countdown = $derived(countdownSeconds(t));
  const speedKmh = $derived(Math.round(hud.velKms * 3600));
  const dossierOpen = $derived(!warping); // keep the mission panel up through the whole launch
  const progressPct = $derived(Math.max(0, Math.min(1, t / duration)) * 100);
  const status = $derived(
    injection
      ? (injectionPhaseStatus(t, duration, injectionBurnLabel(injection.burnType)) ??
          ascentStatus(t, beats))
      : ascentStatus(t, beats),
  );

  // Begin the re-basing warp. The real handoff (onComplete) fires when it ends.
  const complete = () => {
    if (done || warping) return;
    warping = true;
    playing = false;
  };

  onMount(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    // ?debug=1 pad-calibration overrides: let a developer swing the launch
    // site, texture-seam offset, downrange yaw, and launcher model from the URL
    // without editing the profile. Inert in production — `debugMode` is false
    // unless ?debug=1 is present.
    const dbg = debugMode ? new URLSearchParams(window.location.search) : null;
    const dbgNum = (key: string): number | undefined => {
      const v = dbg?.get(key);
      return v != null && v !== '' ? +v : undefined;
    };
    const dbgLat = dbgNum('lat');
    const dbgLon = dbgNum('lon');
    const dbgSite = dbgLat != null && dbgLon != null ? { lat: dbgLat, lon: dbgLon } : undefined;
    const launchSite = dbgSite ?? profile.launchSite;

    sceneObj = createAscentScene({
      aspect: w / h,
      earthDayUrl: `${base}/textures/4k_earth_daymap.jpg`,
      earthNightUrl: `${base}/textures/2k_earth_nightmap.jpg`,
      launchSite,
      lonTextureOffsetDeg: dbgNum('off'),
      siteYawDeg: dbgNum('yaw'),
      vehicleLengthKm: VEHICLE_LENGTH_KM,
      schedule,
      tuning,
      events: summary.events,
      spacecraftId: mission.spacecraftId,
      launcherId: dbg?.get('launcher') || profile.id,
      boosterCount: profile.boosters?.count ?? 0,
      groundSite: (() => {
        const g = resolveLaunchGround(launchSite);
        return g ? { ...g, textureUrl: `${base}${g.textureUrl}` } : undefined;
      })(),
    });

    ar = createAscentRenderer(container, sceneObj);

    // Science-Lens force vectors — the lens panel's thrust / drag / gravity /
    // velocity layers drive the scene's force arrows (RFC-034 §11.2); the lens
    // panel is the force legend. onLayerChange fires immediately with the
    // current state, so this also seeds the initial vector visibility.
    const forceLayerStops = LAUNCH_FORCE_LAYER_ENTRIES.map(([layer, force]) =>
      onLayerChange(layer, (on) => sceneObj?.setForceVisible(force, on)),
    );
    // Ascent Δv-loss ledger (RFC-034 §11.2 · S8) — its own lens layer toggles
    // the AscentLosses panel (live from state.loss*Kms).
    const lossesStop = onLayerChange('ascent-losses', (on) => (showLosses = on));

    // ?debug=1 test hooks, DEV-only so production builds tree-shake the whole
    // block away. `__ascentSetT` freezes the
    // timeline at an exact MET for deterministic screenshots; `__ascentDebug`
    // exposes the schedule/events for the e2e harness; `__topDownKm` /
    // `__camOverride` are read each frame in applyState() to reposition the
    // camera for pad-geography + model inspection.
    const winDbg = window as unknown as Record<string, unknown>;
    if (import.meta.env.DEV && debugMode) {
      winDbg.__ascentDebug = { schedule, events: summary.events, maxQ: summary.maxQ, duration };
      winDbg.__ascentSetT = (nt: number) => {
        playing = false;
        t = nt;
        sceneObj?.snapCamera();
      };
    }

    // Debug camera overrides read per-frame: `__topDownKm` looks straight down
    // at the pad to verify the launch-site geography; `__camOverride` frees the
    // camera to inspect the vehicle model from any pose.
    const applyDebugCamera = (): void => {
      if (!sceneObj) return;
      const topDown = winDbg.__topDownKm as number | undefined;
      if (topDown) {
        sceneObj.camera.position.set(0, topDown, 0.001);
        sceneObj.camera.lookAt(0, 0, 0);
        sceneObj.camera.fov = 50;
        sceneObj.camera.updateProjectionMatrix();
      }
      const cam = winDbg.__camOverride as
        | { px: number; py: number; pz: number; tx: number; ty: number; tz: number; fov?: number }
        | undefined;
      if (cam) {
        sceneObj.camera.position.set(cam.px, cam.py, cam.pz);
        sceneObj.camera.lookAt(cam.tx, cam.ty, cam.tz);
        sceneObj.camera.fov = cam.fov ?? 40;
        sceneObj.camera.updateProjectionMatrix();
      }
    };

    const applyState = () => {
      // Past SECO, sampleAscentAt clamps to the final state — the vehicle coasts
      // in parking orbit through the injection beat; the MET keeps advancing off
      // the real clock `t`, and the kick-stage plume is driven by injectionFiring.
      const s = t < 0 ? padState(summary, t) : sampleAscentAt(summary.states, t);
      sceneObj!.setState(s);
      sceneObj!.setInjectionBurn(injectionFiring);
      if (import.meta.env.DEV && debugMode) applyDebugCamera();
      liveState = s;
      hud = {
        altKm: s.altKm,
        velKms: s.speedKms,
        stage: injectionBeatActive ? (injection?.stageName ?? 'COAST') : stageLabel(s.stageIndex),
        met: formatAscentClock(t),
      };
    };
    applyState();

    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          // externalClock: the /fly master clock owns `t` (it advances launchT
          // and binds it in) — LaunchScene only renders + still triggers the
          // orbit-reached warp when time crosses the seam (after injection).
          if (!externalClock) t = Math.min(ascentEnd, t + dt * speed);
          if (t >= ascentEnd) complete();
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
        ar!.render();
      },
    });
    loop.start();

    const onResize = () => ar?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      forceLayerStops.forEach((stop) => stop?.());
      lossesStop?.();
      if (import.meta.env.DEV && debugMode) {
        delete winDbg.__ascentDebug;
        delete winDbg.__ascentSetT;
      }
    };
  });

  onDestroy(() => {
    loop?.cleanup();
    sceneObj?.dispose();
    ar?.dispose();
  });
</script>

<div class="launch" class:hud-hidden={hudHidden} class:external={externalClock}>
  <div class="stage" bind:this={container}></div>

  <!-- Left telemetry console -->
  {#if !warping}
    <div class="telemetry">
      <LaunchTelemetry {profile} {summary} {t} state={liveState} />
    </div>
  {/if}

  <!-- Ascent Δv-loss ledger (ascent-losses Science-Lens layer) -->
  {#if showLosses && !warping}
    <div class="losses">
      <AscentLosses state={liveState} />
    </div>
  {/if}

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
    <span class="status" class:hot={t >= IGNITION_T_S && t < 6}>{status}</span>
  </div>

  <!-- Post-SECO injection-burn callout (RFC-034 §3.1): the kick/upper stage
       fires to leave parking orbit onto the transfer. -->
  {#if injectionBeatActive && injection && !warping}
    <div class="injection" class:firing={injectionFiring}>
      <div class="inj-type">{injectionBurnLabel(injection.burnType)}</div>
      <div class="inj-stage">{injection.stageName}</div>
      {#if injectionFiring}
        <div class="inj-fuel" aria-label="injection burn progress">
          <span class="inj-fuel-label">BURN</span>
          <div class="inj-fuel-bar">
            <div class="inj-fuel-fill" style="width:{injectionBurnProgress}%"></div>
          </div>
          <span class="inj-fuel-pct">{Math.round(injectionBurnProgress)}%</span>
        </div>
        <div class="inj-dv">
          {injection.dvKms != null ? `Δv ${injection.dvKms.toFixed(2)} km/s` : 'IGNITION'}
        </div>
      {:else}
        <div class="inj-dv">PARKING ORBIT · STAGE ARMED</div>
      {/if}
    </div>
  {/if}

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
      <dt>VEHICLE</dt>
      <dd>{profile.name}</dd>
      <dt>LAUNCH SITE</dt>
      <dd>{mission.site}</dd>
      <dt>DESTINATION</dt>
      <dd>{mission.destination}</dd>
      {#each vehStats as [k, v] (k)}
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
        style="left:{(b.t / duration) * 100}%"
      >
        <span class="tick"></span><span class="lbl">{b.label}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <div class="readouts">
    <div class="ro">
      <span class="rl">SPEED</span><span class="rv">{speedKmh.toLocaleString()}</span><span
        class="ru">KM/H</span
      >
    </div>
    <div class="ro">
      <span class="rl">ALTITUDE</span><span class="rv">{hud.altKm.toFixed(0)}</span><span class="ru"
        >KM</span
      >
    </div>
  </div>

  {#if !warping}
    <button class="continue" onclick={complete}>SKIP TO CRUISE →</button>
  {/if}

  <!-- Launch camera-debug (?debug=1): shot timeline, live camera plot,
       per-shot tuning sliders. -->
  {#if debugMode && !warping}
    <div class="cam-debug">
      <AscentCameraDebug
        {summary}
        {schedule}
        vehLen={VEHICLE_LENGTH_KM}
        {t}
        {tuning}
        onJump={(jt) => {
          t = jt;
          playing = false;
          sceneObj?.snapCamera();
        }}
      />
    </div>
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
  /* Driven by the shared /fly master scrubber (externalClock): the launch's own
     bottom transport strip + skip + big readouts are replaced by the unified
     control bar, so hide them here to avoid a parallel timeline (RFC-034 §11). */
  .launch.external .timeline,
  .launch.external .readouts,
  .launch.external .continue,
  .launch.external .hud-collapse {
    display: none;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .telemetry {
    position: absolute;
    top: 116px;
    left: 22px;
    max-height: calc(100vh - 210px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(127, 223, 255, 0.35) transparent;
    transition: opacity 0.3s ease;
  }
  .launch.hud-hidden .telemetry {
    opacity: 0;
    pointer-events: none;
  }
  .losses {
    position: absolute;
    right: 22px;
    top: 360px;
    z-index: 6;
    transition: opacity 0.3s ease;
  }
  .launch.hud-hidden .losses {
    opacity: 0;
    pointer-events: none;
  }
  .cam-debug {
    position: absolute;
    right: 22px;
    bottom: 108px;
    z-index: 6;
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
  .launch.hud-hidden .readouts,
  .launch.hud-hidden .injection {
    opacity: 0;
    pointer-events: none;
  }
  /* Post-SECO injection-burn callout — centered under the clock, amber theme
     matching the /fly TLI/TMI event markers; pulses while the stage fires. */
  .injection {
    position: absolute;
    top: 128px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    padding: 8px 18px;
    border: 1px solid rgba(255, 190, 74, 0.45);
    border-radius: 6px;
    background: rgba(20, 12, 4, 0.55);
    backdrop-filter: blur(6px);
    transition: opacity 0.3s ease;
  }
  .injection.firing {
    border-color: rgba(255, 190, 74, 0.85);
    box-shadow: 0 0 22px rgba(255, 160, 40, 0.35);
  }
  .inj-type {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 3px;
    color: #ffcf6a;
  }
  .inj-stage {
    font-size: 11px;
    letter-spacing: 1px;
    color: #eaf2ff;
    margin-top: 2px;
  }
  .inj-fuel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 6px;
  }
  .inj-fuel-label {
    font-size: 9px;
    letter-spacing: 1px;
    color: #b58a4a;
  }
  .inj-fuel-bar {
    width: 120px;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 190, 74, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }
  .inj-fuel-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff8a3c, #ffd36a);
    transition: width 0.12s linear;
  }
  .inj-fuel-pct {
    font-size: 9px;
    color: #ffcf6a;
    width: 30px;
    text-align: left;
  }
  .inj-dv {
    font-size: 10px;
    letter-spacing: 2px;
    color: #ffbe7a;
    margin-top: 3px;
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
  /* 2026 clean dossier — no panel; hangs off a hairline cyan accent rail. */
  .dossier {
    position: absolute;
    top: 90px;
    right: 22px;
    width: 250px;
    padding: 2px 14px 2px 0;
    border-right: 1px solid rgba(127, 212, 255, 0.35);
    text-align: right;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
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
