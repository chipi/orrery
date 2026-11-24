<!--
  ReturnScene — the /fly "way home" scene (Apollo 11 first): the LM ascent, the rendezvous, the
  docking with its close-ups, the LM jettison and trans-Earth injection, in one full-frame scene
  (three/fly-return-scene.ts). Self-clocked in compressed scene time with the real GET on the HUD;
  Skip (or the end) fires `onComplete`, and /fly resumes the cruise at TEI.

  Owns its renderer + container, like DescentScene.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import { resolveQualitySync } from '$lib/quality/quality-tier';
  import { applyGroundDetail, makeGroundTexture } from '$lib/three/descent-ground';
  import {
    BEATS,
    RT,
    createFlyReturn,
    type FlyReturn,
    type ReturnBeat,
    type ReturnPose,
  } from '$lib/three/fly-return-scene';
  import { formatGet, type ReturnProfile } from '$lib/fly/return-profile';

  interface Props {
    profile: ReturnProfile;
    missionName: string;
    site?: { lat: number; lon: number };
    hudHidden?: boolean;
    onComplete?: () => void;
  }
  let { profile, missionName, site, hudHidden = false, onComplete }: Props = $props();

  let container: HTMLDivElement;
  let ar: AscentRenderer | undefined;
  let scene: FlyReturn | undefined;
  let loop: AnimateLoop | undefined;
  let t = $state(0);
  let playing = $state(true);
  let finished = false;
  let pose = $state<ReturnPose | null>(null);

  const beatLabel: Record<ReturnBeat, () => string> = {
    surface: m.fly_return_beat_liftoff,
    liftoff: m.fly_return_beat_liftoff,
    ascent: m.fly_return_beat_ascent,
    insertion: m.fly_return_beat_insertion,
    csi: () => `${m.fly_return_beat_rendezvous()} · CSI`,
    cdh: () => `${m.fly_return_beat_rendezvous()} · CDH`,
    tpi: () => `${m.fly_return_beat_rendezvous()} · TPI`,
    terminal: () => `${m.fly_return_beat_rendezvous()} · TPF`,
    dock_wide: m.fly_return_beat_approach,
    dock_approach: m.fly_return_beat_approach,
    dock_closeup: m.fly_return_beat_approach,
    soft_capture: m.fly_return_beat_soft_capture,
    hard_dock: m.fly_return_beat_hard_dock,
    dock_pullback: m.fly_return_beat_hard_dock,
    jettison: m.fly_return_beat_jettison,
    tei_coast: m.fly_return_beat_tei,
    tei_burn: m.fly_return_beat_tei,
    fade: m.fly_return_beat_tei,
  };
  const getText = $derived(pose ? formatGet(pose.get) : formatGet(profile.liftoffS));
  const progressPct = $derived(Math.min(100, (t / RT.end) * 100));
  const fade = $derived(pose?.fade ?? 0);

  function finish() {
    if (finished) return;
    finished = true;
    onComplete?.();
  }

  onMount(() => {
    let unmounted = false;
    let stop: (() => void) | undefined;
    // The two craft load on demand: /fly's first load stays free of the showcase families.
    void Promise.all([
      import('$lib/three/showcase/lunar-module'),
      import('$lib/three/showcase/station-freighters'),
    ]).then(([lmMod, csmMod]) => {
      if (unmounted) return;
      stop = start(
        lmMod.SHOWCASE['apollo-lm'].build(),
        csmMod.SHOWCASE['apollo-csm-block-ii'].build(),
      );
    });
    return () => {
      unmounted = true;
      stop?.();
    };
  });

  function start(lm: import('three').Group, csm: import('three').Group): () => void {
    scene = createFlyReturn(
      profile,
      { lm, csm },
      {
        moonTextureUrl: `${base}/textures/2k_moon.jpg`,
        site,
        groundTexture: makeGroundTexture('moon'),
        applyGround: (mat, tex, k) => applyGroundDetail(mat, 'moon', tex, k),
      },
    );
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
      w.__flyReturnT = (v: number) => {
        playing = false;
        t = Math.max(0, Math.min(RT.end, v));
        apply();
        ar?.render();
      };
      w.__flyReturnDuration = () => RT.end;
    }
    loop = createAnimateLoop({
      onFrame: ({ dt }) => {
        if (playing) {
          t = Math.min(RT.end, t + dt);
          if (t >= RT.end) finish();
        }
        apply();
        ar!.render();
      },
    });
    loop.start();
    const onResize = () => ar?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      delete w.__flyReturnT;
      delete w.__flyReturnDuration;
    };
  }

  onDestroy(() => {
    loop?.cleanup();
    scene?.dispose();
    ar?.dispose();
  });
</script>

<div
  class="return"
  class:hud-hidden={hudHidden}
  data-testid="return-scene"
  role="region"
  aria-label={m.fly_return_title()}
>
  <div class="stage" bind:this={container}></div>
  <div class="scrim" aria-hidden="true"></div>
  <div class="blackout" style="opacity:{fade}" aria-hidden="true"></div>

  <div class="header">
    <div class="mission">{missionName}</div>
    <div class="sub"><span class="live-dot"></span>{m.fly_return_title()}</div>
  </div>

  <div class="clock">
    <span class="get-label">GET</span><span class="met" data-testid="return-get">{getText}</span>
    <span class="compressed">{m.fly_return_compressed()}</span>
  </div>

  {#if pose}
    <div class="beat-label" data-testid="return-beat" data-beat={pose.beat} aria-live="polite">
      {beatLabel[pose.beat]()}
    </div>
  {/if}

  <div class="timeline" aria-hidden="true">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each BEATS as b (b.id)}
      <span class="tick" style="left:{(b.t / RT.end) * 100}%"></span>
    {/each}
  </div>

  <button class="skip" onclick={finish} data-testid="return-skip">{m.fly_return_skip()} →</button>
</div>

<style>
  .return {
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
  .return.hud-hidden .header,
  .return.hud-hidden .timeline {
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
  .get-label {
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
    .met {
      font-size: 17px;
    }
    .skip {
      bottom: 84px;
    }
  }
</style>
