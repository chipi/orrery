<!--
  Sky-preview harness (#488) — dev-only visual check for the AR sky (RFC-041).
  Renders the REAL sky-scene from a chosen location + heading + elevation via a
  mock SkyView (no device, no camera feed) on a black sky, so we can screenshot
  "you're in French Polynesia facing north" and see how the constellations, stars
  and planets actually land. URL params (all optional):
    ?lat=-17.53&lon=-149.57  observer (default: Tahiti, French Polynesia)
    ?az=0                    heading in degrees, 0 = due north
    ?el=25                   camera elevation above the horizon, degrees
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { page } from '$app/stores';
  import { createSkyScene, type SkySceneHandle } from '$lib/ar/sky-scene';
  import type { SkyView } from '$lib/ar/sky-view';

  let canvas: HTMLCanvasElement;
  let handle: SkySceneHandle | null = null;
  let info = $state('');

  onMount(async () => {
    const p = $page.url.searchParams;
    const num = (k: string, d: number) => {
      const raw = p.get(k);
      const v = Number(raw);
      return raw !== null && Number.isFinite(v) ? v : d;
    };
    const lat = num('lat', -17.53); // Tahiti, French Polynesia
    const lon = num('lon', -149.57);
    const az = num('az', 0); // heading: 0 = due north
    const el = num('el', 25); // camera elevation above the horizon
    info = `${lat}°, ${lon}° · facing ${az}° az, ${el}° up · ${new Date().toUTCString()}`;

    // Fixed camera in the render ENU frame [East, Up, −North]: look along (az, el).
    const DEG = Math.PI / 180;
    const a = az * DEG;
    const e = el * DEG;
    const fwd = new THREE.Vector3(
      Math.sin(a) * Math.cos(e),
      Math.sin(e),
      -Math.cos(a) * Math.cos(e),
    );
    const mock: SkyView = {
      kind: 'camera',
      needsInterfaceRoll: false, // no interface roll for a fixed test camera
      async start() {
        return true;
      },
      updateCamera(camera) {
        camera.position.set(0, 0, 0);
        camera.up.set(0, 1, 0);
        camera.lookAt(fwd);
      },
      toWorldDir() {
        /* identity — the mock camera already lives in the ENU frame */
      },
      onEnded() {},
      stop() {},
    };

    handle = createSkyScene(canvas, {
      view: mock,
      location: { latDeg: lat, lonDeg: lon, source: 'default' },
    });
    await handle.start();
    // Signal for a screenshot driver to wait on.
    (window as unknown as { __skyPreviewReady?: boolean }).__skyPreviewReady = true;
  });

  onDestroy(() => handle?.stop());
</script>

<div class="sky-preview">
  <canvas bind:this={canvas}></canvas>
  <div class="info">{info}</div>
</div>

<style>
  .sky-preview {
    position: fixed;
    inset: 0;
    background: #01030a;
    overflow: hidden;
  }
  canvas {
    width: 100vw;
    height: 100vh;
    display: block;
  }
  .info {
    position: fixed;
    left: 10px;
    bottom: 10px;
    color: #7f8db0;
    font:
      12px 'Space Mono',
      monospace;
    pointer-events: none;
  }
</style>
