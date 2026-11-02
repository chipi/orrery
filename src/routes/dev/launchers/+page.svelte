<!--
  /dev/launchers — every launcher model side by side, side-on, at one scale: the review
  sheet for stage joints (a real rocket is one connected stack), proportions and colours.
  ?ids=a,b,c picks models; ?y0=&y1= crops the height band (vehicle lengths, 0 = base);
  ?cell= sets the column width (px). Dev-only, like all of /dev.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { buildLauncherModel, LAUNCHER_MODEL_IDS } from '$lib/three/launcher-models';

  let canvas: HTMLCanvasElement;
  let ids = $state<string[]>([]);
  let cell = $state(200);
  let ready = $state(false);

  onMount(() => {
    const q = new URLSearchParams(location.search);
    ids = q.get('ids')?.split(',') ?? LAUNCHER_MODEL_IDS;
    const y0 = Number(q.get('y0') ?? 0);
    const y1 = Number(q.get('y1') ?? 1.3);
    cell = Number(q.get('cell') ?? 200);
    const H = window.innerHeight - 24;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(cell * ids.length, H);
    renderer.setScissorTest(true);
    ids.forEach((id, i) => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1b2230);
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(1, 1, 2);
      scene.add(sun);
      scene.add(buildLauncherModel(id, 1, 2).root);
      const half = (y1 - y0) / 2;
      const a = cell / H;
      const cam = new THREE.OrthographicCamera(-half * a, half * a, half, -half, -10, 10);
      cam.position.set(0, (y0 + y1) / 2, 5);
      cam.lookAt(0, (y0 + y1) / 2, 0);
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
    {#each ids as id (id)}<span style="width:{cell}px">{id}</span>{/each}
  </div>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .sheet {
    background: #1b2230;
    color: #fff;
    font: 12px monospace;
    min-height: 100vh;
    overflow-x: auto;
  }
  .labels {
    display: flex;
    height: 24px;
    align-items: center;
  }
  .labels span {
    text-align: center;
    flex: none;
  }
</style>
