<!--
  RenderingDebugRegistrar (#334).

  Mounts a 3D route's renderer + live QualityConfig + quality-source
  attribution + optional pass / scene-object refs into the DebugPanel
  context so the "Rendering" tab can surface tier readouts,
  renderer.info, live bloom sliders, and per-pass enable toggles.

  Usage in a 3D route:

    <script>
      import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
      // …after `const quality = resolveQualitySync(url);`
      const qualitySource = resolveQualitySource(url);
    </script>

    {#if renderer}
      <RenderingDebugRegistrar
        {renderer}
        {quality}
        {qualitySource}
        bloomPass={someBloomPass}
      />
    {/if}

  Routes that don't build a given pass leave its prop unset / null
  and the Rendering tab degrades gracefully (falls back to the static
  quality-config readout for that pass).
-->
<script lang="ts">
  import type * as THREE from 'three';
  import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import type { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
  import type { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
  import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import type { QualityConfig } from '$lib/quality/quality-tier';
  import { setRenderingDebugRegistration, type QualitySource } from './debug-panel-context';

  let {
    renderer,
    quality,
    qualitySource,
    bloomPass = null,
    bokehPass = null,
    filmPass = null,
    vignettePass = null,
    skydomeMesh = null,
    sunLensFlareGroup = null,
  }: {
    renderer: THREE.WebGLRenderer;
    quality: QualityConfig;
    qualitySource: QualitySource;
    bloomPass?: UnrealBloomPass | null;
    bokehPass?: BokehPass | null;
    filmPass?: FilmPass | null;
    vignettePass?: ShaderPass | null;
    skydomeMesh?: THREE.Object3D | null;
    sunLensFlareGroup?: THREE.Object3D | null;
  } = $props();

  $effect(() => {
    setRenderingDebugRegistration({
      renderer,
      quality,
      qualitySource,
      bloomPass,
      bokehPass,
      filmPass,
      vignettePass,
      skydomeMesh,
      sunLensFlareGroup,
    });
    return () => setRenderingDebugRegistration(null);
  });
</script>
