<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    projectModules,
    drawBlueprint,
    hitTest,
    type BlueprintModule,
    type BlueprintView,
    type ProjectedModule,
  } from '$lib/station-blueprint';

  interface Props {
    modules: BlueprintModule[];
    view: BlueprintView;
    selectedId: string | null;
    onModuleClick: (id: string) => void;
    ariaLabel?: string;
  }

  let {
    modules,
    view,
    selectedId,
    onModuleClick,
    ariaLabel = 'Station blueprint',
  }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let container: HTMLDivElement | undefined = $state();
  let projected: ProjectedModule[] = [];
  let hoveredId: string | null = $state(null);
  let resizeObserver: ResizeObserver | undefined;

  function redraw() {
    if (!canvas || !container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    projected = projectModules(modules, view, w, h);
    drawBlueprint(ctx, projected, selectedId, hoveredId, view, w, h);
  }

  $effect(() => {
    // Re-draw whenever modules / view / selection / hover changes.
    void modules;
    void view;
    void selectedId;
    void hoveredId;
    redraw();
  });

  onMount(() => {
    if (!container) return;
    resizeObserver = new ResizeObserver(() => redraw());
    resizeObserver.observe(container);
    redraw();
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
  });

  function getCanvasCoords(e: MouseEvent): { x: number; y: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onClick(e: MouseEvent) {
    const c = getCanvasCoords(e);
    if (!c) return;
    const id = hitTest(projected, c.x, c.y);
    if (id) onModuleClick(id);
  }

  function onMove(e: MouseEvent) {
    const c = getCanvasCoords(e);
    if (!c) return;
    const id = hitTest(projected, c.x, c.y);
    if (id !== hoveredId) hoveredId = id;
  }

  function onLeave() {
    hoveredId = null;
  }
</script>

<div bind:this={container} class="blueprint-container" aria-label={ariaLabel} role="img">
  <canvas
    bind:this={canvas}
    onclick={onClick}
    onmousemove={onMove}
    onmouseleave={onLeave}
    style:cursor={hoveredId ? 'pointer' : 'default'}
  ></canvas>
</div>

<style>
  .blueprint-container {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
