<!--
  WingedReturnScene — the /fly winged return (W12, STS-1 first): the deorbit burn, the entry with
  its roll reversals, the turn onto final, the steep approach, the flare, touchdown and the rollout
  (three/fly-winged-return-scene.ts). Self-clocked in compressed scene time with the MET on the HUD
  ("~" except at the flown touchdown); Skip (or the end) fires `onComplete`, and /fly shows the
  landing card.

  Owns its renderer + container, like DeployScene.
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
    createFlyWinged,
    metIsEstimate,
    reversalAt,
    type FlyWinged,
    type WingedBeat,
    type WingedPose,
  } from '$lib/three/fly-winged-return-scene';
  import { formatGet } from '$lib/fly/return-profile';
  import type { WingedProfile } from '$lib/fly/winged-profile';

  interface Props {
    profile: WingedProfile;
    missionName: string;
    hudHidden?: boolean;
    onComplete?: () => void;
  }
  let { profile, missionName, hudHidden = false, onComplete }: Props = $props();

  let container: HTMLDivElement;
  let ar: AscentRenderer | undefined;
  let scene: FlyWinged | undefined;
  let loop: AnimateLoop | undefined;
  let t = $state(0);
  let end = $state(100);
  let playing = $state(true);
  let finished = false;
  let pose = $state<WingedPose | null>(null);

  const beatLabel: Record<WingedBeat, () => string> = {
    deorbit: m.fly_winged_beat_deorbit,
    coast: m.fly_winged_beat_coast,
    entry: m.fly_winged_beat_entry,
    reversal: () =>
      m.fly_winged_beat_reversal({
        // "about" Mach 18.5 and so on: a secondary source, so the HUD says "~"
        mach: `~${profile.entry.reversalsMach[Math.max(0, reversalAt(t, profile))] ?? ''}`,
      }),
    taem: m.fly_winged_beat_taem,
    hac: m.fly_winged_beat_hac,
    // the press kit's plan: the flown glideslope was not found
    final: () => m.fly_winged_beat_final({ deg: `~${profile.approach.outerGlideDeg}` }),
    preflare: m.fly_winged_beat_preflare,
    gear: m.fly_winged_beat_gear,
    touchdown: () => m.fly_winged_beat_touchdown({ keas: String(profile.touchdown.keas) }),
    nose: m.fly_winged_beat_nose,
    rollout: m.fly_winged_beat_rollout,
  };
  const metText = $derived(pose ? `${metIsEstimate(pose.t) ? '~' : ''}${formatGet(pose.met)}` : '');
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
    // The orbiter and the runway load on demand: /fly's first load stays free of them.
    void Promise.all([
      import('$lib/three/showcase/winged'),
      import('$lib/three/showcase/runway'),
    ]).then(([winged, runwayMod]) => {
      if (unmounted) return;
      const variant = profile.orbiter === 'columbia' ? 'columbia' : 'shuttle';
      stop = start(winged.buildOrbiterOpenable(variant), runwayMod.buildRunway(profile.runway));
    });
    return () => {
      unmounted = true;
      stop?.();
    };
  });

  function start(orbiter: THREE.Group, runway: THREE.Group): () => void {
    scene = createFlyWinged(
      profile,
      { orbiter, runway },
      { earthTextureUrl: `${base}/textures/2k_earth_daymap.jpg` },
    );
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
      w.__flyWingedT = (v: number) => {
        playing = false;
        t = Math.max(0, Math.min(end, v));
        apply();
        ar?.render();
      };
      w.__flyWingedDuration = () => end;
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
      delete w.__flyWingedT;
      delete w.__flyWingedDuration;
    };
  }

  onDestroy(() => {
    loop?.cleanup();
    scene?.dispose();
    ar?.dispose();
  });
</script>

<div
  class="winged"
  class:hud-hidden={hudHidden}
  data-testid="winged-scene"
  role="region"
  aria-label={m.fly_winged_title()}
>
  <div class="stage" bind:this={container}></div>
  <div class="scrim" aria-hidden="true"></div>
  <div class="blackout" style="opacity:{fade}" aria-hidden="true"></div>
  <div class="header">
    <div class="mission">
      {missionName}{profile.flight !== missionName ? ` · ${profile.flight}` : ''}
    </div>
    <div class="sub"><span class="live-dot"></span>{m.fly_winged_title()}</div>
  </div>
  <div class="clock">
    <span class="met-label">{m.fly_hud_met()}</span><span class="met" data-testid="winged-met"
      >{metText}</span
    >
    <span class="compressed">{m.fly_return_compressed()}</span>
  </div>
  {#if pose}
    <div class="beat-label" data-testid="winged-beat" data-beat={pose.beat} aria-live="polite">
      {beatLabel[pose.beat]()}
    </div>
  {/if}
  <div class="timeline" aria-hidden="true">
    <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
    {#each beatsFor() as b (b.id)}
      <span class="tick" style="left:{(b.t / end) * 100}%"></span>
    {/each}
  </div>
  <button class="skip" onclick={finish} data-testid="winged-skip">{m.fly_return_skip()} →</button>
</div>

<style>
  .winged {
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
  .winged.hud-hidden .header,
  .winged.hud-hidden .timeline {
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
