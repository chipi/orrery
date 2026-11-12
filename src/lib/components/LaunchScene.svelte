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
  import { streamedUrl } from '$lib/asset-url';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import { createAscentScene, VEHICLE_LENGTH_KM, type AscentScene } from '$lib/three/ascent-scene';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { resolveQualitySync } from '$lib/quality/quality-tier';
  import { resolveLaunchGround } from '$lib/three/launch-ground';
  import LaunchTelemetry from '$lib/components/LaunchTelemetry.svelte';
  import FlightPlan from '$lib/components/FlightPlan.svelte';
  import AscentLosses from '$lib/components/AscentLosses.svelte';
  import {
    integrateAscent,
    sampleAscentAt,
    type AscentSummary,
    type AscentState,
    type LaunchProfile,
  } from '$lib/physics/ascent/ascent-physics';
  import {
    IGNITION_T_S,
    T_MINUS_S,
    INJECTION_COAST_S,
    INJECTION_BURN_S,
    INJECTION_BEAT_S,
    injectionSepT,
    payloadSepTFor,
    buildAscentBeats,
    ascentStatus,
    countdownSeconds,
    injectionPhaseStatus,
    padState,
  } from '$lib/orbital/ascent-hud';
  import {
    injectionBurnLabel,
    type InjectionBurnParams,
  } from '$lib/physics/transfer/injection-burn';
  import { formatAscentClock } from '$lib/orbital/ascent-clock';
  import * as m from '$lib/paraglide/messages';
  import Chip from '$lib/components/Chip.svelte';
  import { hudLabel } from '$lib/orbital/hud-labels';
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
    launcherHeightM?: number;
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

  // Post-SECO injection beat (RFC-034 §3.1): a parking-orbit coast, the kick stage
  // firing with the spacecraft still on it, then the spacecraft separating — appended
  // to the ascent before the warp. Absent when the mission has no injection stage.
  const injection = $derived(mission.injectionBurn ?? null);
  const injectionBurnStart = $derived(duration + INJECTION_COAST_S);
  /** The burn's end. */
  const injectionBurnEnd = $derived(injectionSepT(duration));
  const injectionEnd = $derived(duration + INJECTION_BEAT_S);
  /** End of the launch phase — SECO, or the end of the injection beat when present. */
  const ascentEnd = $derived(injection ? injectionEnd : duration);
  /** When the spacecraft separates, if not at SECO. */
  const payloadSepT = $derived(payloadSepTFor(duration, injection));
  const schedule = $derived(
    buildShotSchedule({
      events: summary.events,
      maxQt: summary.maxQ.t,
      duration,
      payloadSepT,
      endT: ascentEnd,
    }),
  );
  /** Kick stage actually firing (drives the plume). */
  const injectionFiring = $derived(!!injection && t >= injectionBurnStart && t < injectionBurnEnd);
  /** The whole post-SECO injection window (coast, burn, separation) — the HUD stage line. */
  const injectionBeatActive = $derived(!!injection && t >= duration && t < injectionEnd);
  /** The injection callout: parking coast and burn. Once the burn ends the status line
   *  carries the separation; the callout's "stage armed" would be stale. */
  const injectionCalloutActive = $derived(!!injection && t >= duration && t < injectionBurnEnd);
  /** Injection-burn completion (%): 0 through the parking coast, fills 0→100 as
   *  the kick stage fires. NOT stage fuel — the ascent telemetry already shows
   *  the (spent) ascent stages; per-kick-stage propellant masses aren't modelled. */
  const injectionBurnProgress = $derived(
    !injection || t < injectionBurnStart
      ? 0
      : Math.min(1, (t - injectionBurnStart) / INJECTION_BURN_S) * 100,
  );

  const vehStats: [string, string][] = $derived([
    [m.hud_stages(), String(profile.stages.length)],
    [
      m.hud_liftoff_thrust(),
      // The published figure when the profile carries one (solids are modelled at their
      // burn average); else core plus every strap-on lit on the pad — an air-lit core and
      // air-lit strap-ons light later. It once read the core alone (SLS 7,440 kN).
      m.unit_kn_value({
        value: (
          profile.liftoffThrustKN ??
          (profile.stages[0].ignitionS
            ? 0
            : (profile.stages[0].thrustSlKN ?? profile.stages[0].thrustVacKN)) +
            (profile.boosters
              ? (profile.boosters.count - (profile.boosters.airLitCount ?? 0)) *
                (profile.boosters.thrustSlKN ?? profile.boosters.thrustVacKN)
              : 0)
        ).toLocaleString(),
      }),
    ],
    [m.hud_ideal_dv(), m.mp_flight_unit_kms({ value: summary.idealDvKms.toFixed(2) })],
    [m.hud_payload(), m.mp_flight_unit_kg({ value: profile.payloadKg.toLocaleString() })],
  ]);

  const beats = $derived(buildAscentBeats(summary));
  // The flight plan: liftoff, the ascent beats, then the parking orbit, injection burn and
  // spacecraft separation when the mission leaves orbit.
  const planBeats = $derived([
    { label: 'LIFTOFF', t: 0 },
    // ORBIT and SECO land on the same second: the cutoff is the beat.
    ...beats.filter(
      (b) =>
        !(b.label === 'ORBIT' && beats.some((x) => x.label === 'SECO' && Math.abs(x.t - b.t) < 2)),
    ),
    ...(injection
      ? [
          { label: 'PARKING ORBIT', t: duration, untimed: true },
          {
            label: injectionBurnLabel(injection.burnType),
            t: injectionBurnStart,
            untimed: true,
          },
          { label: 'SPACECRAFT SEP', t: injectionBurnEnd, untimed: true },
        ]
      : []),
  ]);

  let container: HTMLDivElement;

  // The telemetry console fits the window instead of scrolling: scale it down to the room
  // there is (its box is capped at 100vh − 210 px). Below TEL_MIN_SCALE it would be too
  // small to read, so it scrolls instead.
  const TEL_MIN_SCALE = 0.6;
  let telBox = $state<HTMLDivElement>();
  let telInner = $state<HTMLDivElement>();
  let telScale = $state(1);
  $effect(() => {
    const box = telBox;
    const inner = telInner;
    if (!box || !inner) return;
    const fit = () => {
      const room = window.innerHeight - 210;
      const need = inner.scrollHeight;
      telScale = need > 0 ? Math.max(TEL_MIN_SCALE, Math.min(1, room / need)) : 1;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(inner);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  });
  let done = $state(false);
  let showLosses = $state(false); // ascent-losses lens layer → AscentLosses panel

  let ar: AscentRenderer | undefined;
  let sceneObj: AscentScene | undefined;
  let loop: AnimateLoop | undefined;

  let hud = $state({ altKm: 0, velKms: 0, stage: 'S1', met: 'T-00:12' });
  // HUD-scrim strength: full on the pad (bright blue sky), gone by ~55 km where
  // the sky has already faded to space-black and the panel-free HUD reads fine.
  let scrimOpacity = $derived(Math.max(0, Math.min(1, 1 - hud.altKm / 55)));
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
      launcherHeightM: mission.launcherHeightM,
      launcherId: dbg?.get('launcher') || profile.id,
      boosterCount: profile.boosters?.count ?? 0,
      boosterAirLitCount: profile.boosters?.airLitCount ?? 0,
      payloadSepT,
      kickStage: injection?.kickStage === true,
      injectionBurnEndT: injection ? injectionBurnEnd : undefined,
      groundSite: (() => {
        const g = resolveLaunchGround(launchSite);
        return g ? { ...g, textureUrl: streamedUrl(`${base}${g.textureUrl}`) } : undefined;
      })(),
    });

    // Hero IBL only on capable GPUs (high+); software-GL / weak renderers skip
    // the per-frame reflection cost. quality-tier.ts iblEnabled.
    ar = createAscentRenderer(container, sceneObj, {
      iblEnabled: resolveQualitySync().iblEnabled,
    });

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
      const sampled = t < 0 ? padState(summary, t) : sampleAscentAt(summary.states, t);
      // Past the last state the physics holds, but the clock runs on: the scene times the
      // injection-beat animations (spacecraft separation) off s.t.
      const s = t > sampled.t ? { ...sampled, t } : sampled;
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

<div
  class="launch"
  class:hud-hidden={hudHidden}
  class:external={externalClock}
  data-testid="launch-scene"
>
  <div class="stage" bind:this={container}></div>

  <!-- HUD legibility scrim: the 2026 HUD is panel-free, which reads perfectly
       against dark space but washes the dim mono labels out against the bright
       daytime launch sky. A soft edge-vignette darkens the frame corners where
       the HUD sits and fades to nothing as the vehicle climbs into space. -->
  <div class="hud-scrim" style="opacity:{scrimOpacity}" aria-hidden="true"></div>

  <!-- Left telemetry console -->
  {#if !warping}
    <div class="telemetry" bind:this={telBox} class:tel-scroll={telScale <= TEL_MIN_SCALE}>
      <div class="tel-fit" bind:this={telInner} style:transform="scale({telScale})">
        <LaunchTelemetry {profile} {summary} {t} state={liveState} />
      </div>
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
    <Chip
      kind="toggle"
      class="hud-collapse"
      active={hudHidden}
      onclick={() => onToggleHud?.()}
      aria-label={hudHidden ? m.hud_show_panels_aria() : m.hud_hide_panels_aria()}
      title={hudHidden ? m.coast_show_hud() : m.coast_hide_hud()}
    >
      {hudHidden ? '◐' : '◑'}
    </Chip>
  {/if}

  <div class="header">
    <div class="mission" data-testid="launch-mission">{mission.name}</div>
    <div class="sub">{profile.name} · {mission.agency}</div>
  </div>

  <div class="clock">
    <span class="met">{hud.met}</span>
    <span class="status" class:hot={t >= IGNITION_T_S && t < 6}>{hudLabel(status)}</span>
    <span class="plan-next"
      ><FlightPlan beats={planBeats} {t} clock={formatAscentClock} compact /></span
    >
  </div>

  <!-- Post-SECO injection-burn callout (RFC-034 §3.1): the kick/upper stage
       fires to leave parking orbit onto the transfer. -->
  {#if injectionCalloutActive && injection && !warping}
    <div class="injection" class:firing={injectionFiring}>
      <div class="inj-type">
        {hudLabel(injectionBurnLabel(injection.burnType))}<ScienceChip
          tab="mission-phases"
          section="orbit-insertion"
          label={m.chip_label_orbit_insertion()}
        />
      </div>
      <div class="inj-stage">{injection.stageName}</div>
      {#if injectionFiring}
        <div class="inj-fuel" aria-label={m.hud_injection_progress_aria()}>
          <span class="inj-fuel-label">{m.hud_burn()}</span>
          <div class="inj-fuel-bar">
            <div class="inj-fuel-fill" style="width:{injectionBurnProgress}%"></div>
          </div>
          <span class="inj-fuel-pct">{Math.round(injectionBurnProgress)}%</span>
        </div>
        <div class="inj-dv">
          {injection.dvKms != null
            ? `Δv ${m.mp_flight_unit_kms({ value: injection.dvKms.toFixed(2) })}`
            : m.hud_ignition()}
        </div>
      {:else}
        <div class="inj-dv">{m.hud_parking_armed()}</div>
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
      {m.fly_launch_dossier_title()}
      {#if profile.source_tier === 'generic'}<span class="rep"
          >{m.fly_launch_dossier_representative()}</span
        >{/if}
    </div>
    <dl>
      <dt>{m.fly_launch_dossier_vehicle()}</dt>
      <dd>{profile.name}</dd>
      <dt>{m.fly_launch_dossier_site()}</dt>
      <dd>{mission.site}</dd>
      <dt>{m.fly_launch_dossier_destination()}</dt>
      <dd>{mission.destination}</dd>
      {#each vehStats as [k, v] (k)}
        <dt>{k}</dt>
        <dd>{v}</dd>
      {/each}
    </dl>
    <div class="plan">
      <FlightPlan beats={planBeats} {t} clock={formatAscentClock} />
    </div>
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
        <span class="tick"></span><span class="lbl">{hudLabel(b.label)}</span>
      </div>
    {/each}
    <div class="head" style="left:{progressPct}%"></div>
  </div>

  <div class="readouts">
    <div class="ro">
      <span class="rl">{m.fly_speed_label()}</span><span class="rv"
        >{speedKmh.toLocaleString()}</span
      ><span class="ru">{m.hud_unit_kmh()}</span>
    </div>
    <div class="ro">
      <span class="rl">{m.earth_panel_alt()}</span><span class="rv">{hud.altKm.toFixed(0)}</span
      ><span class="ru">{m.hud_unit_km()}</span>
    </div>
  </div>

  {#if !warping}
    <button class="continue" onclick={complete}>{m.fly_launch_skip_cta()}</button>
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    z-index: 200;
  }
  /* Driven by the shared /fly master scrubber (externalClock): the launch's own
     bottom transport strip + skip + big readouts are replaced by the unified
     control bar, so hide them here to avoid a parallel timeline (RFC-034 §11). */
  .launch.external .timeline,
  .launch.external .readouts,
  .launch.external .continue,
  .launch.external :global(.hud-collapse) {
    display: none;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .plan-next {
    display: none;
  }
  /* Legibility scrim — corner-weighted so the centre (the vehicle) stays clear
     while the frame edges where the HUD lives get a soft darken. Sits above the
     canvas, below the z-6 HUD text. Opacity is altitude-driven (inline). */
  .hud-scrim {
    position: absolute;
    inset: 0;
    /* 0, not above: the HUD blocks have no z-index, so they paint over this in DOM order
       (stage → scrim → HUD). At z-index 2 the scrim covered the text it was meant to back. */
    z-index: 0;
    pointer-events: none;
    /* Side bands behind the telemetry (left) and dossier (right) consoles plus a top band
       behind the title + clock: the corner vignette alone left the panels on bare daylight sky,
       where their dim mono labels could not be read. */
    background:
      linear-gradient(
        90deg,
        rgba(3, 6, 14, 0.72) 0px,
        rgba(3, 6, 14, 0.5) 290px,
        transparent 440px
      ),
      linear-gradient(
        270deg,
        rgba(3, 6, 14, 0.72) 0px,
        rgba(3, 6, 14, 0.5) 290px,
        transparent 440px
      ),
      linear-gradient(180deg, rgba(3, 6, 14, 0.55) 0px, transparent 150px),
      radial-gradient(ellipse 130% 90% at 50% 42%, transparent 46%, rgba(3, 6, 14, 0.62) 100%);
    transition: opacity 0.4s linear;
  }
  .launch.hud-hidden .hud-scrim {
    opacity: 0 !important;
  }
  .telemetry {
    position: absolute;
    top: 116px;
    left: 22px;
    max-height: calc(100vh - 210px);
    overflow: hidden;
    transition: opacity 0.3s ease;
  }
  .tel-fit {
    transform-origin: top left;
  }
  /* Only when even the smallest readable scale doesn't fit (very short windows). */
  .telemetry.tel-scroll {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--color-accent-edge) transparent;
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
  /* Phones start with the HUD collapsed; instead of nothing, keep a minimal set — mission,
     clock + phase, speed + altitude — compact and on its own dark backing. */
  @media (hover: none), (pointer: coarse) {
    .launch.hud-hidden .header,
    .launch.hud-hidden .clock,
    .launch.hud-hidden .readouts {
      opacity: 1;
    }
    .launch.hud-hidden .header,
    .launch.hud-hidden .clock,
    .launch.hud-hidden .readouts {
      padding: 5px 10px;
      border-radius: 8px;
      background: rgba(3, 8, 18, 0.62);
    }
    .launch.hud-hidden .header {
      top: 12px;
      left: 12px;
    }
    .launch.hud-hidden .mission {
      font-size: 20px;
      letter-spacing: 2px;
    }
    .launch.hud-hidden .sub {
      display: none;
    }
    .launch.hud-hidden .clock {
      top: 12px;
      left: auto;
      right: 12px;
      transform: none;
      align-items: flex-end;
    }
    .launch.hud-hidden .met {
      font-size: 22px;
      letter-spacing: 2px;
    }
    /* With the dossier collapsed, the flight plan shrinks to its next beat under the clock. */
    .launch.hud-hidden .plan-next {
      display: block;
      margin-top: 4px;
    }
    .launch.hud-hidden .readouts {
      bottom: calc(104px + env(safe-area-inset-bottom, 0px));
      gap: 24px;
    }
    /* /fly hides these under its shared control bar (.external); with the panels collapsed
       on a phone they are the only speed + altitude on screen, so bring them back. */
    .launch.external.hud-hidden .readouts {
      display: flex;
    }
    .launch.hud-hidden .rv {
      font-size: 26px;
    }
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
    font-size: var(--size-label);
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
    font-size: var(--size-label);
    color: #ffcf6a;
    width: 30px;
    text-align: left;
  }
  .inj-dv {
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: #ffbe7a;
    margin-top: 3px;
  }
  .launch :global(.hud-collapse) {
    position: absolute;
    left: 22px;
    bottom: 26px;
    z-index: 6;
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
    color: var(--color-accent-hover);
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
    color: var(--color-state);
    border: 1px solid var(--color-accent-edge);
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
    text-shadow: 0 0 40px var(--color-accent-strong);
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
  /* 2026 clean dossier — no panel; hangs off a hairline blue accent rail. */
  .dossier {
    position: absolute;
    top: 90px;
    right: 22px;
    width: 250px;
    padding: 2px 14px 2px 0;
    border-right: 1px solid color-mix(in srgb, var(--color-state) 35%, transparent);
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
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-state);
    margin: 0 0 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .rep {
    font-size: var(--size-label);
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
  .dossier .plan {
    margin: 16px -14px 0 0;
    text-align: left;
  }
  .dossier dt {
    font-size: var(--size-label);
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
    background: linear-gradient(90deg, var(--color-accent), #eafaff);
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
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: rgba(200, 225, 255, 0.6);
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
    color: var(--color-state);
  }
  .beat.done .tick {
    background: var(--color-accent);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 2px;
    color: #cfeaff;
    background: rgba(10, 20, 34, 0.85);
    border: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
    border-radius: 5px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .continue:hover {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
    color: #fff;
  }
</style>
