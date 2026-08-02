<!--
  Dev-only mock harness for the Slice 8 Local Group scene. Renders the schematic
  fullscreen with a slow auto-orbit so the look can be screenshotted + reviewed
  before wiring the real MilkyWay↔LocalGroup crossing into /explore. Not linked in
  nav; /dev/* is the review-surface convention.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { base } from '$app/paths';
  import { createLocalGroupScene, LG_SCENE_RADIUS } from '$lib/universe/local-group-scene';
  import type { LocalGroupData } from '$lib/data';

  let canvas: HTMLCanvasElement;

  onMount(() => {
    let raf = 0;
    let disposed = false;
    let dispose = () => {};

    (async () => {
      const data = (await (
        await fetch(`${base}/data/universe/local-group.json`)
      ).json()) as LocalGroupData;
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      const resize = () => renderer.setSize(window.innerWidth, window.innerHeight, false);
      resize();

      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        6000,
      );
      const target = new THREE.Vector3(0, 0, 0);

      const lg = createLocalGroupScene(data);
      lg.setSize(window.innerWidth, window.innerHeight);

      const onResize = () => {
        resize();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        lg.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      let angle = 0.35;
      // Portrait needs a pulled-back entry pose so the MW↔Andromeda pair fits the
      // narrow width (the real crossing tunes this per-viewport, like the MW scene).
      const portrait = window.innerHeight > window.innerWidth;
      const R = LG_SCENE_RADIUS * (portrait ? 1.75 : 1.02);
      const loop = () => {
        angle += 0.0016;
        camera.position.set(
          target.x + Math.cos(angle) * R,
          target.y + LG_SCENE_RADIUS * 0.34,
          target.z + Math.sin(angle) * R,
        );
        camera.lookAt(target);
        lg.update(camera);
        lg.render(renderer, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      dispose = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        lg.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      dispose();
    };
  });
</script>

<svelte:head><title>dev · Local Group mock</title></svelte:head>
<canvas bind:this={canvas} class="lg-canvas"></canvas>
<div class="lg-badge">Local Group · schematic · not to scale</div>

<style>
  .lg-canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    background: #04060d;
  }
  .lg-badge {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #b4c6eb;
    background: rgba(10, 14, 26, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 20px;
  }
</style>
