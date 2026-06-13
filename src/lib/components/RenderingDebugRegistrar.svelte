<!--
  RenderingDebugRegistrar (#334).

  Mounts a 3D route's renderer + live QualityConfig + quality-source
  attribution into the DebugPanel context so the "Rendering" tab can
  surface tier readouts, renderer.info, and (slice 29) per-feature
  toggles.

  Usage in a 3D route:

    <script>
      import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
      // …after `const quality = resolveQualitySync(url);`
      const qualitySource = resolveQualitySource(url);
    </script>

    {#if renderer}
      <RenderingDebugRegistrar {renderer} {quality} {qualitySource} />
    {/if}

  Non-3D routes simply don't mount it; the "Rendering" tab stays
  hidden.
-->
<script lang="ts">
  import type * as THREE from 'three';
  import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import type { QualityConfig } from '$lib/quality/quality-tier';
  import { setRenderingDebugRegistration, type QualitySource } from './debug-panel-context';

  let {
    renderer,
    quality,
    qualitySource,
    bloomPass = null,
  }: {
    renderer: THREE.WebGLRenderer;
    quality: QualityConfig;
    qualitySource: QualitySource;
    bloomPass?: UnrealBloomPass | null;
  } = $props();

  $effect(() => {
    setRenderingDebugRegistration({ renderer, quality, qualitySource, bloomPass });
    return () => setRenderingDebugRegistration(null);
  });
</script>
