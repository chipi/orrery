<!--
  /dev/launchers — every launcher model side by side, side-on: the review sheet for stage
  joints (a real rocket is one connected stack), proportions and colours, and the source of
  docs/screenshots/launcher-lineup.png (npm run screenshots:launchers).
  ?ids=a,b,c picks models; ?cell= sets the column width (px); ?scale=fit draws every model
  the same height (for checking joints) instead of at true relative height; ?y0=&y1= crops
  the height band in fit mode (vehicle lengths, 0 = base). Dev-only, like all of /dev.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { buildLauncherModel, LAUNCHER_MODEL_IDS } from '$lib/three/launcher-models';

  // Overall height (m) of each vehicle as flown in Orrery's missions — public figures,
  // rounded, for the true-scale line-up only (a model is drawn 1 unit tall).
  const HEIGHT_M: Record<string, number> = {
    'falcon-9': 70,
    starship: 121,
    'saturn-v': 110.6,
    'saturn-ib': 68,
    'vostok-k': 30.8,
    'voskhod-11a57': 30.8,
    soyuz: 49.5,
    'atlas-v': 58.3,
    'proton-k': 57,
    'titan-ii-glv': 33.2,
    'atlas-lv-3b': 28.7,
    'mercury-redstone': 25.4,
    'ariane-5': 52,
    'h-iia': 53,
    'space-shuttle-stack': 56.1,
    'sls-block-1': 98,
    'long-march-2f': 58.3,
    'long-march-3a': 52.5,
    'long-march-3b': 56.3,
    'long-march-5': 57,
    pslv: 44,
    lvm3: 43.5,
    'm-v': 30.8,
    h3: 63,
    'ariane-1': 47.4,
    'delta-ii': 38.9,
    'atlas-centaur': 34.4,
    'atlas-agena': 36,
    'titan-ii-g': 36,
    'titan-iiie-centaur': 48.8,
    'titan-ivb-centaur': 55.9,
    'falcon-heavy': 70,
  };

  let canvas: HTMLCanvasElement;
  let ids = $state<string[]>([]);
  let cell = $state(200);
  let ready = $state(false);

  onMount(() => {
    const q = new URLSearchParams(location.search);
    ids = q.get('ids')?.split(',') ?? LAUNCHER_MODEL_IDS;
    cell = Number(q.get('cell') ?? 200);
    const fit = q.get('scale') === 'fit';
    const y0 = fit ? Number(q.get('y0') ?? 0) : 0;
    const y1 = fit ? Number(q.get('y1') ?? 1.32) : 1.32;
    const tallest = Math.max(...ids.map((id) => HEIGHT_M[id] ?? 50));
    const H = window.innerHeight - 40;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(cell * ids.length, H);
    renderer.setScissorTest(true);
    // One shared frame: in true scale the tallest model fills the height.
    const half = (y1 - y0) / 2;
    const a = cell / H;
    const cam = new THREE.OrthographicCamera(-half * a, half * a, half, -half, -20, 20);
    cam.position.set(0, y0 + half - 0.04, 10);
    cam.lookAt(0, y0 + half - 0.04, 0);
    ids.forEach((id, i) => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1b2230);
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(1, 1, 2);
      scene.add(sun);
      const model = buildLauncherModel(id, 1, 2).root;
      if (!fit) model.scale.setScalar((HEIGHT_M[id] ?? 50) / tallest);
      scene.add(model);
      renderer.setViewport(i * cell, 0, cell, H);
      renderer.setScissor(i * cell, 0, cell, H);
      renderer.render(scene, cam);
    });
    ready = true;
    return () => renderer.dispose();
  });
</script>

<div class="sheet" data-ready={ready}>
  <div class="labels">
    {#each ids as id (id)}<span style="width:{cell}px"
        >{id}{#if HEIGHT_M[id]}<em>{HEIGHT_M[id]} m</em>{/if}</span
      >{/each}
  </div>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  /* Over the site chrome: the sheet is the whole page. */
  .sheet {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: #1b2230;
    color: #fff;
    font: 12px monospace;
    overflow-x: auto;
  }
  .labels {
    display: flex;
    height: 40px;
    align-items: center;
  }
  .labels span {
    text-align: center;
    flex: none;
    display: flex;
    flex-direction: column;
  }
  .labels em {
    font-style: normal;
    opacity: 0.6;
  }
</style>
