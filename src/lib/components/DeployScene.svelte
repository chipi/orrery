<!--
  DeployScene — the /fly Shuttle deploy (W10). The IUS tilt-table release (Galileo, Magellan,
  Ulysses, Chandra: the bay doors open, the IUS tilts up and springs out, the orbiter backs away, the
  IUS fires; three/fly-deploy-scene.ts) or the robotic arm's release (Hubble, Compton: the arm lifts
  the observatory out, its appendages deploy, it lets go; three/fly-rms-deploy-scene.ts).
  It also plays the crewed dockings (W9: Demo-2 to the ISS; three/fly-docking-scene.ts), which take
  the deploy's slot after the launch.
  Self-clocked in compressed scene time with the real MET on the HUD ("~" before the release, whose
  time is the first one sourced); Skip (or the end) fires `onComplete`, and /fly goes on.

  Owns its renderer + container, like ReturnScene.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import { resolveQualitySync } from '$lib/quality/quality-tier';
  import {
    beatsFor,
    createFlyDeploy,
    metIsEstimate,
    type DeployBeat,
  } from '$lib/three/fly-deploy-scene';
  import { rmsBeatsFor, rmsMetIsEstimate, type RmsBeat } from '$lib/three/fly-rms-deploy-scene';
  import {
    dockingBeatsFor,
    dockingMetIsEstimate,
    type DockingBeat,
  } from '$lib/three/fly-docking-scene';
  import { formatGet } from '$lib/fly/return-profile';
  import { isRmsDeploy, type AnyDeployProfile } from '$lib/fly/deploy-profile';
  import { isDockingProfile, type DockingProfile } from '$lib/fly/docking-profile';
  import { flyCraft, preloadFlyCraft } from '$lib/three/fly-craft';
  import { orbiterLook } from '$lib/three/showcase/orbiter-stance';

  interface Props {
    profile: AnyDeployProfile | DockingProfile;
    missionName: string;
    hudHidden?: boolean;
    onComplete?: () => void;
  }
  let { profile, missionName, hudHidden = false, onComplete }: Props = $props();

  let container: HTMLDivElement;
  let ar: AscentRenderer | undefined;
  /** Either scene: both take (t, aspect) and return the beat and the real MET. */
  interface Driver {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    end: number;
    update: (t: number, aspect: number) => { t: number; met: number; beat: string };
    dispose: () => void;
  }
  let scene: Driver | undefined;
  let loop: AnimateLoop | undefined;
  let t = $state(0);
  let end = $state(60);
  let playing = $state(true);
  let finished = false;
  let pose = $state<{ t: number; met: number; beat: string } | null>(null);

  const tiltDeg = (last: boolean) =>
    isDockingProfile(profile) || isRmsDeploy(profile)
      ? ''
      : String(profile.tilt[last ? profile.tilt.length - 1 : 0].deg);
  const holdM = (id: string) =>
    isDockingProfile(profile) ? String(profile.holds.find((h) => h.id === id)?.rangeM ?? '') : '';
  const dockLabel: Record<DockingBeat, () => string> = {
    establish: m.fly_docking_beat_establish,
    burn: m.fly_docking_beat_burn,
    wp0: () => m.fly_docking_beat_wp0({ m: holdM('wp0') }),
    wp1: () => m.fly_docking_beat_wp1({ m: holdM('wp1') }),
    wp2: () => m.fly_docking_beat_wp2({ m: holdM('wp2') }),
    hold: m.fly_docking_beat_hold,
    final: m.fly_docking_beat_final,
    capture: m.fly_docking_beat_capture,
    hardDock: m.fly_docking_beat_hard_dock,
    latches: m.fly_docking_beat_latches,
    uturn: m.fly_docking_beat_uturn,
    parking: () => m.fly_docking_beat_parking({ m: holdM('parking') }),
    hover: () => m.fly_docking_beat_hover({ m: holdM('hover') }),
  };
  const rmsLabel: Record<RmsBeat, () => string> = {
    establish: m.fly_deploy_rms_establish,
    grapple: m.fly_deploy_rms_grapple,
    unberth: m.fly_deploy_rms_unberth,
    arrays: m.fly_deploy_rms_arrays,
    arrayStuck: m.fly_deploy_rms_array_stuck,
    arrayRetry: m.fly_deploy_rms_array_retry,
    antennas: m.fly_deploy_rms_antennas,
    antennaStuck: m.fly_deploy_rms_antenna_stuck,
    eva: m.fly_deploy_rms_eva,
    release: m.fly_deploy_rms_release,
    separation: m.fly_deploy_beat_separation,
  };
  const iusLabel: Record<DeployBeat, () => string> = {
    establish: m.fly_deploy_beat_establish,
    doors: m.fly_deploy_beat_doors,
    tilt: () => m.fly_deploy_beat_tilt({ deg: tiltDeg(false) }),
    deployAngle: () => m.fly_deploy_beat_tilt({ deg: tiltDeg(true) }),
    release: m.fly_deploy_beat_release,
    separation: m.fly_deploy_beat_separation,
    coast: m.fly_deploy_beat_coast,
    stage1: m.fly_deploy_beat_stage1,
    stage2: m.fly_deploy_beat_stage2,
    spin: m.fly_deploy_beat_spin,
    pamS: m.fly_deploy_beat_pam,
  };
  const beatText = (beat: string): string =>
    isDockingProfile(profile)
      ? (dockLabel[beat as DockingBeat]?.() ?? '')
      : isRmsDeploy(profile)
        ? rmsLabel[beat as RmsBeat]()
        : iusLabel[beat as DeployBeat]();
  const beats = $derived(
    isDockingProfile(profile)
      ? dockingBeatsFor(profile)
      : isRmsDeploy(profile)
        ? rmsBeatsFor(profile)
        : beatsFor(profile),
  );
  const estimate = (t: number) =>
    isDockingProfile(profile)
      ? dockingMetIsEstimate(t, profile)
      : isRmsDeploy(profile)
        ? rmsMetIsEstimate(t, profile)
        : metIsEstimate(t);
  const title = () => (isDockingProfile(profile) ? m.fly_docking_title() : m.fly_deploy_title());
  const metText = $derived(pose ? `${estimate(pose.t) ? '~' : ''}${formatGet(pose.met)}` : '');
  const progressPct = $derived(Math.min(100, (t / end) * 100));
  const fade = $derived(Math.max(0, Math.min(1, (t - (end - 1.5)) / 1.5)));

  function finish() {
    if (finished) return;
    finished = true;
    onComplete?.();
  }

  onMount(() => {
    let unmounted = false;
    let stop: (() => void) | undefined;
    const earthTextureUrl = `${base}/textures/2k_earth_daymap.jpg`;
    const p = profile;
    // The models load on demand: /fly's first load stays free of them.
    if (isDockingProfile(p)) {
      const models =
        p.target === 'tiangong'
          ? Promise.all([
              import('$lib/three/tiangong-docking-end'),
              import('$lib/three/showcase/station-freighters'),
            ]).then(([tg, fr]) => ({
              models: {
                station: tg.buildTianhe2021(),
                chaser: fr.SHOWCASE[p.chaser].build(),
                visitor: (id: string) => fr.SHOWCASE[id]?.build(),
              },
              epochs: undefined,
            }))
          : Promise.all([
              import('$lib/iss-proxy-model'),
              // the Soyuz is a classic capsule, Crew Dragon a commercial one
              p.chaser.startsWith('soyuz')
                ? import('$lib/three/showcase/capsules-classic')
                : import('$lib/three/showcase/capsules-commercial'),
              import('$lib/ar/ar-assembly').then((a) => a.loadStationEpochs('iss')),
            ]).then(([iss, caps, epochs]) => ({
              models: {
                station: iss.buildIssProxyStation(),
                chaser: caps.SHOWCASE[p.chaser].build(),
                visitor: (id: string) => iss.buildIssVisitor(id as 'soyuz_ms' | 'progress_ms'),
              },
              epochs,
            }));
      void Promise.all([models, import('$lib/three/fly-docking-scene')]).then(
        ([{ models: mdl, epochs }, dock]) => {
          if (unmounted) return;
          const d = dock.createFlyDocking(p, mdl, { earthTextureUrl, epochs });
          stop = start(d);
        },
      );
      return () => {
        unmounted = true;
        stop?.();
      };
    }
    const look = orbiterLook(p.orbiter, p.launchZeroUtc);
    if (isRmsDeploy(p)) {
      void Promise.all([
        import('$lib/three/showcase/winged'),
        import('$lib/three/showcase/observatories'),
        import('$lib/three/fly-rms-deploy-scene'),
      ]).then(([winged, obs, rms]) => {
        if (unmounted) return;
        const build = p.payload === 'compton-gro' ? obs.buildCompton : obs.buildHubble;
        const d = rms.createFlyRmsDeploy(
          p,
          {
            orbiter: winged.buildOrbiterOpenable(look.variant, look.silts),
            payload: build({ asLaunched: true }),
          },
          { earthTextureUrl },
        );
        stop = start(d);
      });
    } else {
      // The payload: the observatory's showcase model when the mission's own /fly craft is the
      // orbiter (Chandra), else the mission's craft (the probes).
      const craftId = p.payload ?? p.missionId;
      const preload = p.payload
        ? import('$lib/three/showcase/observatories').then((o) => () => {
            const s = o.SHOWCASE[craftId];
            return s ? s.build() : null;
          })
        : preloadFlyCraft(craftId).then(() => () => flyCraft(craftId));
      void Promise.all([
        import('$lib/three/showcase/winged'),
        import('$lib/three/showcase/ius'),
        preload,
      ]).then(([winged, iusMod, payloadOf]) => {
        if (unmounted) return;
        const payload = payloadOf() ?? new THREE.Group();
        const orbiter = winged.buildOrbiterOpenable(look.variant, look.silts);
        const ius = iusMod.buildIusStack({ payload, pamS: !!p.upperStage.pamS });
        stop = start(createFlyDeploy(p, { orbiter, ius }, { earthTextureUrl }));
      });
    }
    return () => {
      unmounted = true;
      stop?.();
    };
  });

  function start(driver: Driver): () => void {
    scene = driver;
    end = scene.end;
    const aspectOf = () => container.clientWidth / Math.max(1, container.clientHeight);
    const sceneRef = scene;
    ar = createAscentRenderer(
      container,
      {
        scene: sceneRef.scene,
        camera: sceneRef.camera,
        setAspect: (a: number) => {
          sceneRef.camera.aspect = a;
          sceneRef.camera.updateProjectionMatrix();
        },
      } as unknown as Parameters<typeof createAscentRenderer>[1],
      { iblEnabled: resolveQualitySync().iblEnabled },
    );
    const apply = () => {
      pose = sceneRef.update(t, aspectOf());
    };
    apply();
    // Debug-only seek for screenshots: the pose is a pure function of t, so a jump is exact.
    const dbg = import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1';
    const w = window as unknown as Record<string, unknown>;
    if (dbg) {
      w.__flyDeployT = (v: number) => {
        playing = false;
        t = Math.max(0, Math.min(end, v));
        apply();
        ar?.render();
      };
      w.__flyDeployDuration = () => end;
    }
    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          t = Math.min(end, t + dt);
          if (t >= end) finish();
        }
        apply();
        ar!.render();
      },
      // The scene's clock is what the visitor came to watch, not a passive drift: reduced motion
      // must not freeze it on the first frame (the coast does the same).
      reducedMotion: () => false,
    });
    loop.start();
    const onResize = () => ar?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      delete w.__flyDeployT;
      delete w.__flyDeployDuration;
    };
  }

  onDestroy(() => {
    loop?.cleanup();
    scene?.dispose();
    ar?.dispose();
  });
</script>

<div
  class="deploy"
  class:hud-hidden={hudHidden}
  data-testid="deploy-scene"
  role="region"
  aria-label={title()}
>
  <div class="stage" bind:this={container}></div>
  <div class="scrim" aria-hidden="true"></div>
  <div class="blackout" style="opacity:{fade}" aria-hidden="true"></div>
  <div class="header">
    <div class="mission">
      {missionName}{missionName.includes(profile.flight) ? '' : ` · ${profile.flight}`}
    </div>
    <div class="sub"><span class="live-dot"></span>{title()}</div>
  </div>
  <div class="clock">
    <span class="met-label">{m.fly_hud_met()}</span><span class="met" data-testid="deploy-met"
      >{metText}</span
    >
    <span class="compressed">{m.fly_return_compressed()}</span>
  </div>
  {#if pose}
    <div class="beat-label" data-testid="deploy-beat" data-beat={pose.beat} aria-live="polite">
      {beatText(pose.beat)}
    </div>
  {/if}
  <div class="timeline" aria-hidden="true">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each beats as b (b.id)}
      <span class="tick" style="left:{(b.t / end) * 100}%"></span>
    {/each}
  </div>
  <button class="skip" onclick={finish} data-testid="deploy-skip">{m.fly_return_skip()} →</button>
</div>

<style>
  .deploy {
    position: fixed;
    inset: 0;
    background: #000;
    color: #eaf2ff;
    font-family: var(--font-mono, 'Space Mono', monospace);
    z-index: 200;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(3, 6, 14, 0.62) 0px, transparent 150px),
      linear-gradient(0deg, rgba(3, 6, 14, 0.62) 0px, transparent 130px);
  }
  .blackout {
    position: absolute;
    inset: 0;
    background: #000;
    pointer-events: none;
  }
  .deploy.hud-hidden .header,
  .deploy.hud-hidden .timeline {
    opacity: 0;
  }
  .header {
    position: absolute;
    top: 18px;
    left: 22px;
    transition: opacity 0.3s ease;
  }
  .mission {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .sub {
    margin-top: 4px;
    font-size: 11px;
    letter-spacing: 2px;
    color: #9fc6ff;
    text-transform: uppercase;
  }
  .live-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 8px;
    border-radius: 50%;
    background: #6fd6ff;
  }
  .clock {
    position: absolute;
    top: 18px;
    right: 22px;
    text-align: right;
    transition: opacity 0.3s ease;
  }
  .met-label {
    margin-right: 8px;
    font-size: 11px;
    letter-spacing: 2px;
    color: #9fc6ff;
  }
  .met {
    font-size: 22px;
    letter-spacing: 2px;
    font-variant-numeric: tabular-nums;
  }
  .compressed {
    display: block;
    margin-top: 4px;
    font-size: 10px;
    letter-spacing: 2px;
    color: #f0d8bf;
  }
  .beat-label {
    position: absolute;
    left: 50%;
    bottom: 54px;
    transform: translateX(-50%);
    max-width: 90vw;
    text-align: center;
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #f4f8ff;
    text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
  }
  .timeline {
    position: absolute;
    left: 22px;
    right: 22px;
    bottom: 30px;
    height: 10px;
    transition: opacity 0.3s ease;
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    top: 4px;
    height: 2px;
    background: rgba(159, 198, 255, 0.25);
  }
  .fill {
    height: 100%;
    background: #6fd6ff;
  }
  .tick {
    position: absolute;
    top: 1px;
    width: 1px;
    height: 8px;
    background: rgba(159, 198, 255, 0.55);
  }
  .skip {
    position: absolute;
    right: 22px;
    bottom: 52px;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 2px;
    color: #f0d8bf;
    background: rgba(10, 20, 34, 0.85);
    border: 1px solid rgba(216, 168, 130, 0.5);
    border-radius: 5px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .skip:hover {
    background: rgba(216, 168, 130, 0.25);
    color: #fff;
  }
  @media (max-width: 640px) {
    /* the caption sits higher on a phone: the dark band reaches up behind it */
    .scrim {
      background:
        linear-gradient(180deg, rgba(3, 6, 14, 0.62) 0px, transparent 150px),
        linear-gradient(
          0deg,
          rgba(3, 6, 14, 0.72) 0px,
          rgba(3, 6, 14, 0.5) 170px,
          transparent 240px
        );
    }
    .met {
      font-size: 17px;
    }
    .beat-label {
      bottom: 120px;
    }
    .skip {
      bottom: 84px;
    }
  }
</style>
