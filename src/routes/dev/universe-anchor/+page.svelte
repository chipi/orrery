<!--
  Dev-only visual anchor for /explore v2 · Slice 0 (PRD-030 / RFC-032 / UXS-014).

  The boundary-crossing "signature moment": pull back from the Sun until it
  collapses to a single luminous dot and the REAL nearby-star field (HYG, spectral
  colours, true positions) fades in around it. Built with the actual Slice-0 engine
  — selectVisibleStars + createPointField + the star budget — over the real tiled
  data, NOT a photoshop. It gates the /explore integration (Part 3): the transition
  is only wired into the sacred v1 route after this is signed off.

  Prod-guarded by /dev/+layout.ts (404 + no SSR/prerender). v1 /explore untouched.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import {
    loadNeighborhoodShells,
    createNeighborhoodScene,
    type NeighborhoodScene,
  } from '$lib/universe/neighborhood-scene';
  import { AU_PER_PARSEC } from '$lib/universe/context-graph';

  const PC_TO_LY = 3.26156;

  let container: HTMLDivElement;
  let cross = $state(0); // 0 = at the solar-system edge, 1 = out in the neighborhood
  let autoRotate = $state(true);
  let starCount = $state(0);
  let status = $state('loading the real HYG neighborhood…');

  let renderer: THREE.WebGLRenderer | undefined;
  let nb: NeighborhoodScene | undefined;
  let raf = 0;

  // Log-scale camera distance (pc) driven by the cross slider: from just outside
  // the solar system (~0.03 pc ≈ 6000 AU) out to ~40 pc into the neighborhood.
  const NEAR_PC = 0.03;
  const FAR_PC = 40;
  const camDistPc = (t: number): number => NEAR_PC * Math.pow(FAR_PC / NEAR_PC, t);

  onMount(() => {
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.001,
      5000,
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(container.clientWidth, container.clientHeight);
    // Three.js renderer must live in the DOM; this dev route owns the container.
    // eslint-disable-next-line svelte/no-dom-manipulating
    container.appendChild(renderer.domElement);

    let disposed = false;

    // Build the SAME neighborhood scene /explore uses — cinematic budget for the
    // anchor (the whole real catalogue).
    void loadNeighborhoodShells(fetch, base)
      .then((shells) => {
        if (disposed) return;
        nb = createNeighborhoodScene({
          shells,
          tier: 'cinematic',
          pixelRatio: renderer!.getPixelRatio(),
        });
        starCount = nb.starCount;
        status = `${nb.starCount.toLocaleString()} real stars · HYG v4.1`;
      })
      .catch((err) => {
        status = `failed to load star data: ${err instanceof Error ? err.message : String(err)}`;
      });

    let angle = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const d = camDistPc(cross);
      if (autoRotate) angle += 0.0009;
      camera.position.set(Math.sin(angle) * d, d * 0.12, Math.cos(angle) * d);
      camera.lookAt(0, 0, 0);
      if (nb) {
        nb.update(d, camera);
        renderer!.render(nb.scene, camera);
      }
    };
    tick();

    const onResize = () => {
      if (!renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    nb?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  });

  let distPc = $derived(camDistPc(cross));
</script>

<svelte:head><title>/explore v2 · boundary anchor (dev)</title></svelte:head>

<div class="wrap">
  <div class="stage" bind:this={container}></div>

  <div class="hud">
    <h1>The Known Universe — boundary crossing <span class="tag">Slice 0 anchor</span></h1>
    <p class="status">{status}</p>

    <label class="ctl">
      <span>Cross the boundary — Sun → dot, real stars fade in</span>
      <input type="range" min="0" max="1" step="0.001" bind:value={cross} />
    </label>

    <label class="ctl inline">
      <input type="checkbox" bind:checked={autoRotate} /> auto-rotate
    </label>

    <p class="readout">
      camera ≈ {distPc < 0.1 ? distPc.toFixed(3) : distPc.toFixed(2)} pc ({(
        distPc * PC_TO_LY
      ).toFixed(2)} ly · {Math.round(distPc * AU_PER_PARSEC).toLocaleString()} AU) · {starCount.toLocaleString()}
      stars
    </p>
    <p class="note">
      Real HYG v4.1 positions + B−V spectral colour. Honest distances; warp captions land in later
      slices. Screenshot-only prototype — not wired into /explore yet.
    </p>
  </div>
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    background: #05070f;
  }
  .stage {
    position: absolute;
    inset: 0;
  }
  .hud {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    max-width: 560px;
    padding: 16px 18px;
    background: rgba(6, 10, 22, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #dde4ff;
    backdrop-filter: blur(6px);
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .hud h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    margin: 0 0 6px;
    color: #fff;
  }
  .tag {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 1px;
    color: #4ecdc4;
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 3px;
    padding: 1px 5px;
    vertical-align: middle;
  }
  .status {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 12px;
  }
  .ctl {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.75);
    margin: 0 0 10px;
  }
  .ctl span {
    display: block;
    margin-bottom: 5px;
  }
  .ctl input[type='range'] {
    width: 100%;
    accent-color: #4ecdc4;
  }
  .ctl.inline {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .readout {
    font-size: 12px;
    color: #9fe8e2;
    margin: 4px 0 8px;
  }
  .note {
    font-size: 10px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }
</style>
