<!--
  CraftViewer — a craft's true-size 3D model (src/lib/three/showcase/) on its fleet page and on the
  pages of the missions it flew. Loads three.js and the model's family only when the viewer nears
  the screen; pauses off screen; still under prefers-reduced-motion. Renders nothing when the craft
  has no model or WebGL is unavailable.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { localHref } from '$lib/locale';
  import { hasShowcaseModel } from '$lib/three/showcase-index';
  import type { CraftViewer } from '$lib/three/craft-viewer';

  let { fleetId, name }: { fleetId: string; name: string } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let failed = $state(false);
  let loaded = $state(false);

  onMount(() => {
    if (!canvas || !hasShowcaseModel(fleetId)) return;
    let viewer: CraftViewer | null = null;
    let cancelled = false;
    let started = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !started) {
          started = true;
          import('$lib/three/craft-viewer')
            .then(({ mountCraftViewer }) =>
              canvas ? mountCraftViewer(canvas, fleetId, { reducedMotion }) : null,
            )
            .then((v) => {
              if (cancelled) v?.dispose();
              else if (!v) failed = true;
              else {
                viewer = v;
                loaded = true;
              }
            })
            .catch(() => (failed = true));
        }
        viewer?.setActive(visible);
      },
      { rootMargin: '200px' },
    );
    io.observe(canvas);
    return () => {
      cancelled = true;
      io.disconnect();
      viewer?.dispose();
    };
  });
</script>

{#if hasShowcaseModel(fleetId) && !failed}
  <section class="craft-viewer" aria-label={m.craft_viewer_aria({ name })}>
    <h2 class="page-section-label">{m.craft_viewer_heading()}</h2>
    <div class="stage" class:loaded>
      <canvas bind:this={canvas}></canvas>
    </div>
    <p class="note">
      {m.craft_viewer_hint()} ·
      <a href={localHref('/colophon#sec-models')}>{m.craft_viewer_how()}</a>
    </p>
  </section>
{/if}

<style>
  .craft-viewer {
    margin: 1.5rem 0;
  }
  .stage {
    position: relative;
    aspect-ratio: 4 / 3;
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    background: #0b0f17;
  }
  @media (min-width: 720px) {
    .stage {
      aspect-ratio: 16 / 9;
    }
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
    /* Vertical swipes still scroll the page; horizontal drags turn the craft. */
    touch-action: pan-y;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .loaded canvas {
    opacity: 1;
  }
  canvas:active {
    cursor: grabbing;
  }
  .note {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    color: var(--color-text-label);
  }
</style>
