<!--
  Yellow rings at the true ground position of annotated hardware (landers,
  rovers, experiment packages) on the surface close-ups. Rings keep a FIXED
  screen size (annotation-rings.ts); the caller projects the positions each
  frame, so the same overlay serves the flat ground view and the 3D detail
  patch. A ring is a button (44 px tap target, 16 px drawn ring); a tap opens a
  popover with the explanation + source links. Labels sit beside the rings and
  are dropped where they would collide; the rings never are.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { dataLoadFailed } from '$lib/data/core';
  import { annotationUi } from '$lib/surface-scene/annotation-ui.svelte';
  import {
    HIT_PX,
    LEADER_PX,
    RING_STROKE_PX,
    layoutLabels,
    ringDiameter,
    type PlacedRing,
    ringInView,
  } from '$lib/surface-scene/annotation-rings';

  let {
    rings,
    width,
    height,
    onWheel,
    onOpenPhoto,
    safeBottom = 0,
  }: {
    rings: PlacedRing[];
    width: number;
    height: number;
    /** Forwarded so scrolling over a ring's tap target still zooms the view. */
    onWheel?: (e: WheelEvent) => void;
    /** A tap on the popover photo opens it full-size (the page's lightbox). */
    onOpenPhoto?: (src: string) => void;
    /** Px at the bottom a popover must stay clear of (the phone's context card). */
    safeBottom?: number;
  } = $props();

  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);

  const POP_W = 264;
  let root: HTMLDivElement | undefined = $state();

  const ringPx = $derived(ringDiameter(width));
  const visible = $derived(rings.filter((r) => ringInView(r.x, r.y, width, height)));
  const labels = $derived(
    layoutLabels(
      visible.map((r) => ({ id: r.annotation.id, label: r.annotation.label, x: r.x, y: r.y })),
      { w: width, h: height },
      ringPx,
    ),
  );
  const open = $derived(visible.find((r) => r.annotation.id === annotationUi.openId));

  const popLeft = $derived(open ? Math.max(8, Math.min(open.x - POP_W / 2, width - POP_W - 8)) : 0);
  // Side with room for a photo popover (~330 px); otherwise the roomier side, scrolling.
  const spaceBelow = $derived(open ? height - safeBottom - open.y - HIT_PX / 2 - 8 : 0);
  const spaceAbove = $derived(open ? open.y - HIT_PX / 2 - 8 : 0);
  const popRoom = $derived(Math.max(spaceBelow, spaceAbove));
  const popBelow = $derived(spaceBelow >= 330 || spaceBelow >= spaceAbove);

  function toggle(id: string): void {
    annotationUi.openId = annotationUi.openId === id ? null : id;
    annotationUi.highlightId = annotationUi.openId;
  }

  onMount(() => {
    // Capture phase: Escape closes the popover first and never reaches the flat
    // view's own Escape handler (which would leave the ground view).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !annotationUi.openId) return;
      e.stopPropagation();
      annotationUi.openId = null;
    };
    const onDown = (e: PointerEvent) => {
      if (annotationUi.openId && !root?.contains(e.target as Node)) annotationUi.openId = null;
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
      annotationUi.openId = null;
    };
  });
</script>

<div
  class="rings"
  bind:this={root}
  data-testid="annotation-rings"
  style:--ring-px="{ringPx}px"
  style:--ring-stroke="{RING_STROKE_PX}px"
  style:--hit-px="{HIT_PX}px"
  onwheel={onWheel}
>
  {#each visible as r, i (r.annotation.id)}
    {@const id = r.annotation.id}
    {@const lab = labels.get(id)}
    <button
      type="button"
      class="ring"
      class:active={annotationUi.highlightId === id || annotationUi.openId === id}
      style:left="{r.x}px"
      style:top="{r.y}px"
      style:--delay="{-i * 0.8}s"
      aria-label={r.annotation.label}
      aria-haspopup="dialog"
      aria-expanded={annotationUi.openId === id}
      data-testid="annotation-ring"
      data-annotation-id={id}
      onclick={() => toggle(id)}
      onpointerenter={() => (annotationUi.highlightId = id)}
      onpointerleave={() => {
        if (annotationUi.highlightId === id && annotationUi.openId !== id)
          annotationUi.highlightId = null;
      }}
    >
      <span class="dot"></span>
    </button>
    {#if lab}
      <span
        class="leader"
        style:left="{lab.side === 'right' ? r.x + ringPx / 2 : r.x - ringPx / 2 - LEADER_PX}px"
        style:top="{r.y}px"
        style:width="{LEADER_PX}px"
        aria-hidden="true"
      ></span>
      <span
        class="chip mono"
        class:left={lab.side === 'left'}
        style:left="{lab.rect.x}px"
        style:top="{lab.rect.y}px"
        style:width="{lab.rect.w}px"
        aria-hidden="true">{r.annotation.label}</span
      >
    {/if}
  {/each}

  {#if open}
    <div
      class="pop"
      role="dialog"
      aria-label={open.annotation.label}
      data-testid="annotation-popover"
      style:--photo-h="{popRoom < 330 ? 88 : 140}px"
      style:left="{popLeft}px"
      style:width="{POP_W}px"
      style:max-height="{Math.max(120, popBelow ? spaceBelow : spaceAbove)}px"
      style:top={popBelow ? `${open.y + HIT_PX / 2}px` : undefined}
      style:bottom={popBelow ? undefined : `${height - open.y + HIT_PX / 2}px`}
    >
      <button
        type="button"
        class="pop-close"
        aria-label={m.drawer_close_panel_aria()}
        onclick={() => (annotationUi.openId = null)}>×</button
      >
      {#if open.annotation.photo}
        {@const photo = open.annotation.photo}
        {@const ladder = ladderReady ? ladderSources(photo.image) : null}
        <button
          type="button"
          class="pop-photo"
          data-testid="annotation-photo"
          aria-label={photo.alt ?? open.annotation.label}
          onclick={() => onOpenPhoto?.(photo.image)}
        >
          <img
            src={ladder?.src ?? photo.thumb}
            srcset={ladder?.srcset}
            sizes="{POP_W}px"
            alt={photo.alt ?? open.annotation.label}
            loading="lazy"
            decoding="async"
          />
        </button>
      {/if}
      <h4>{open.annotation.label}</h4>
      {#if open.annotation.explain}
        <p>{open.annotation.explain}</p>
      {/if}
      {#if open.annotation.source?.length}
        <p class="sources mono">
          {#each open.annotation.source as s, i (s.url)}
            {#if i > 0}<span aria-hidden="true"> · </span>{/if}<a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={m.source_open_new_tab_title()}>{s.label} ↗</a
            >
          {/each}
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .rings {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    overflow: hidden;
  }
  .ring {
    position: absolute;
    width: var(--hit-px);
    height: var(--hit-px);
    margin: calc(var(--hit-px) / -2) 0 0 calc(var(--hit-px) / -2);
    padding: 0;
    border: 0;
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
  }
  .dot {
    position: relative;
    width: var(--ring-px);
    height: var(--ring-px);
    box-sizing: border-box;
    border-radius: 50%;
    border: var(--ring-stroke) solid var(--color-gold, #ffc850);
    /* faint fill keeps the object visible inside; dark edge + soft glow lift the
       ring off bright regolith and off the dark sky alike */
    background: rgba(255, 200, 80, 0.1);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.55),
      0 0 12px 2px rgba(255, 200, 80, 0.5),
      inset 0 0 0 1px rgba(0, 0, 0, 0.35);
    transition:
      transform 160ms,
      background-color 160ms,
      border-color 160ms,
      box-shadow 160ms;
  }
  /* one slow ring-out every ~2.5 s, staggered so neighbours do not pulse together */
  .dot::after {
    content: '';
    position: absolute;
    inset: calc(var(--ring-stroke) * -1);
    border-radius: 50%;
    border: 2px solid var(--color-gold, #ffc850);
    opacity: 0;
    animation: ring-out 2.5s ease-out infinite;
    animation-delay: var(--delay, 0s);
    pointer-events: none;
  }
  @keyframes ring-out {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    70%,
    100% {
      transform: scale(1.7);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot::after {
      animation: none;
    }
  }
  .ring.active .dot,
  .ring:hover .dot,
  .ring:focus-visible .dot {
    transform: scale(1.1);
    border-color: #ffe08a;
    background: rgba(255, 200, 80, 0.26);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.6),
      0 0 18px 4px rgba(255, 210, 100, 0.75),
      inset 0 0 0 1px rgba(0, 0, 0, 0.35);
  }
  .ring.active,
  .ring:hover {
    z-index: 2;
  }
  .ring:focus-visible {
    outline: none;
  }
  .ring:focus-visible .dot {
    outline: 2px solid #fff;
    outline-offset: 4px;
  }
  .leader {
    position: absolute;
    height: 1px;
    background: rgba(255, 200, 80, 0.85);
    box-shadow: 0 0 2px #000;
    pointer-events: none;
  }
  .chip {
    position: absolute;
    box-sizing: border-box;
    height: 22px;
    line-height: 20px;
    padding: 0 8px;
    font-size: 11px;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
    background: var(--color-hud-bg, rgba(5, 5, 20, 0.88));
    border: 1px solid rgba(255, 200, 80, 0.6);
    border-radius: 11px;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  .chip.left {
    text-align: right;
  }
  .mono {
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .pop {
    position: absolute;
    box-sizing: border-box;
    max-width: calc(100% - 16px);
    padding: 12px 14px 12px;
    background: var(--color-hud-bg, rgba(5, 5, 20, 0.88));
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    color: #fff;
    pointer-events: auto;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.45;
  }
  .pop-photo {
    display: block;
    width: 100%;
    margin: 0 0 8px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05);
    cursor: zoom-in;
  }
  .pop-photo img {
    display: block;
    width: 100%;
    height: var(--photo-h, 140px);
    object-fit: cover;
  }
  .pop h4 {
    margin: 0 28px 6px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-gold, #ffc850);
  }
  .pop p {
    margin: 0 0 6px;
  }
  .pop .sources {
    margin: 8px 0 0;
    font-size: 10px;
    letter-spacing: 0.06em;
  }
  .pop a {
    color: var(--color-teal, #4ecdc4);
  }
  .pop-close {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-size: 20px;
    cursor: pointer;
  }
</style>
