<!--
  Yellow rings at the true ground position of annotated hardware (landers,
  rovers, experiment packages) on the surface close-ups. Rings keep a FIXED
  screen size (annotation-rings.ts); the caller projects the positions each
  frame, so the same overlay serves the flat ground view and the 3D detail
  patch.

  Hover (or keyboard focus) turns a ring cyan, brings it to the front,
  highlights its label chip and shows a small preview card (name + thumbnail,
  same look as the traverse route-photo card). A click / tap opens the full
  popover; on a coarse pointer that is a bottom sheet, kept clear of the HUD.
  Three or more rings that overlap at the current zoom merge into one count
  badge: a click zooms in until they separate, or fans them out at the zoom
  limit. Labels sit beside the rings, flip away from view edges and the side
  panel, and are dropped where they would collide; the rings never are.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { dataLoadFailed } from '$lib/data/core';
  import { viewport } from '$lib/viewport.svelte';
  import { annotationUi } from '$lib/surface-scene/annotation-ui.svelte';
  import {
    AREA_HANDLE_PX,
    HIT_PX,
    LEADER_PX,
    RING_STROKE_PX,
    clusterRings,
    fanOutPositions,
    interactivePosition,
    layoutLabels,
    ringDiameter,
    ringFootprint,
    nestedRingPx,
    ringPxFor,
    placeCard,
    ringInView,
    separationFactor,
    type PlacedRing,
    type Rect,
    type RingCluster,
  } from '$lib/surface-scene/annotation-rings';

  let {
    rings,
    width,
    height,
    onWheel,
    onOpenPhoto,
    onZoomTo,
    onRingTap,
    blocked = [],
  }: {
    rings: PlacedRing[];
    width: number;
    height: number;
    /** Forwarded so scrolling over a ring's tap target still zooms the view. */
    onWheel?: (e: WheelEvent) => void;
    /** A tap on the popover photo opens it full-size (the page's lightbox). */
    onOpenPhoto?: (src: string) => void;
    /** Zoom the view in by `factor` around a screen point; false when already at the zoom limit. */
    onZoomTo?: (x: number, y: number, factor: number) => boolean;
    /** First look at a tap on a ring (`id`) or badge at (x, y) in overlay px: true when the page handled it (no popover, no zoom). */
    onRingTap?: (x: number, y: number, id?: string) => boolean;
    /** Screen rectangles (e.g. WebGL traverse stop pills) that ring labels keep clear of. */
    blocked?: Rect[];
  } = $props();

  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);

  const POP_W = 264;
  const CARD_W = 224;
  // 200 px photo at 4:3 + name line + padding / name lines only
  const CARD_H_PHOTO = 188;
  const CARD_H_LINE = 16;
  let root: HTMLDivElement | undefined = $state();

  const coarse = $derived(viewport.isCoarsePointer);
  // Narrow screens: the curated short name instead of an ellipsis-cut one.
  const chipText = (a: PlacedRing['annotation']): string =>
    viewport.isNarrow && a.label_short ? a.label_short : a.label;
  const ringPx = $derived(ringDiameter(width));
  // An area is tapped and labelled at the top of its dashed outline (interactivePosition).
  const visible = $derived(
    rings.map(interactivePosition).filter((r) => ringInView(r.x, r.y, width, height)),
  );
  const areas = $derived(rings.filter((r) => r.radiusPx && r.radiusPx >= 2));
  const isArea = (r: PlacedRing): boolean => !!r.radiusPx;
  // Own drawn size: smaller for craters, a small handle for an area, else the shared ring size.
  const pxOf = (r: PlacedRing): number =>
    isArea(r) ? AREA_HANDLE_PX : nestedRingPx(r, rings, ringPxFor(r.annotation, ringPx));
  const grouped = $derived(clusterRings(visible, ringPx));

  // A fanned-out cluster: its rings move onto a circle round the badge until
  // the zoom changes the grouping (the key then no longer matches).
  let fanKey: string | null = $state(null);
  const fanned = $derived(grouped.clusters.find((c) => c.key === fanKey));
  const fanPos = $derived(fanned ? fanOutPositions(fanned, ringPx) : null);
  const badges = $derived(grouped.clusters.filter((c) => c !== fanned));
  const singles = $derived(
    [...grouped.singles, ...(fanned?.members ?? [])].map((r) => {
      const p = fanPos?.get(r.annotation.id);
      return p ? { ...r, ...p } : r;
    }),
  );

  // HUD + side panel rectangles (relative to this overlay): labels keep clear of
  // them; a bottom sheet sits above the bottom ones.
  const HUD_SELECTOR =
    'nav, footer, aside.panel, .tier-context-card, .hud-controls, .hud-top-mobile, .hud-layers, .hud-back, .hud-context-banner, .legend-3d, .surface-index-handle, .sidx, .hud-scale, .hud-latlon, .hud-bottom, .surface-bottom-bar, .locate-me';
  let hudBlocked: Rect[] = $state([]);
  let sheetBottom = $state(0);
  function measureHud(): void {
    if (!root) return;
    const o = root.getBoundingClientRect();
    const blocked: Rect[] = [];
    let bottom = 0;
    for (const el of document.querySelectorAll(HUD_SELECTOR)) {
      const b = el.getBoundingClientRect();
      const x = Math.max(0, b.left - o.left);
      const y = Math.max(0, b.top - o.top);
      const w = Math.min(o.width, b.right - o.left) - x;
      const h = Math.min(o.height, b.bottom - o.top) - y;
      if (w <= 0 || h <= 0) continue;
      blocked.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      if (y > o.height * 0.6) bottom = Math.max(bottom, o.height - y + 6);
    }
    if (JSON.stringify(blocked) !== JSON.stringify(hudBlocked)) hudBlocked = blocked;
    if (Math.abs(bottom - sheetBottom) > 0.5) sheetBottom = bottom;
  }

  const labels = $derived(
    layoutLabels(
      singles.map((r) => ({
        id: r.annotation.id,
        label: chipText(r.annotation),
        short: r.annotation.label_short,
        x: r.x,
        y: r.y,
        ringPx: pxOf(r),
      })),
      { w: width, h: height },
      ringPx,
      [...hudBlocked, ...blocked, ...badges.map((c) => ringFootprint(c, ringPx))],
    ),
  );
  // A ring inside a cluster badge opens from the list too: anchored at its true spot.
  const open = $derived(
    singles.find((r) => r.annotation.id === annotationUi.openId) ??
      visible.find((r) => r.annotation.id === annotationUi.openId),
  );

  const popLeft = $derived(open ? Math.max(8, Math.min(open.x - POP_W / 2, width - POP_W - 8)) : 0);
  // Side with room for a photo popover (~330 px); otherwise the roomier side, scrolling.
  const spaceBelow = $derived(open ? height - open.y - HIT_PX / 2 - 8 : 0);
  const spaceAbove = $derived(open ? open.y - HIT_PX / 2 - 8 : 0);
  const popBelow = $derived(spaceBelow >= 330 || spaceBelow >= spaceAbove);
  // Bottom sheet (coarse pointer): full width above the bottom HUD, never taller
  // than the room under the ring so the ring stays visible.
  const sheetMax = $derived(
    open
      ? Math.max(150, Math.min(height * 0.55, height - sheetBottom - (open.y + HIT_PX / 2 + 8)))
      : 0,
  );
  const sheetW = $derived(Math.min(480, width - 16));
  const popRoom = $derived(coarse ? sheetMax : Math.max(spaceBelow, spaceAbove));

  // Preview card: mouse / pen hover or keyboard focus only, never on touch.
  let previewId: string | null = $state(null);
  let previewCluster: string | null = $state(null);
  const preview = $derived.by(() => {
    if (coarse) return null;
    if (previewCluster) {
      const c = badges.find((b) => b.key === previewCluster);
      if (c) {
        return {
          x: c.x,
          y: c.y,
          side: 'right' as const,
          names: c.members.map((r) => r.annotation.label),
          annotation: undefined,
        };
      }
    }
    const r = singles.find((x) => x.annotation.id === previewId);
    if (!r || annotationUi.openId === r.annotation.id) return null;
    return {
      x: r.x,
      y: r.y,
      // the card goes on the side opposite the label chip so both stay readable
      side: labels.get(r.annotation.id)?.side === 'right' ? ('left' as const) : ('right' as const),
      names: undefined,
      annotation: r.annotation,
    };
  });
  const cardPos = $derived.by(() => {
    if (!preview) return null;
    const h = preview.names
      ? 20 + preview.names.length * CARD_H_LINE
      : preview.annotation?.photo
        ? CARD_H_PHOTO
        : 34;
    const p = placeCard(
      preview,
      { w: CARD_W, h },
      preview.side,
      { w: width, h: height },
      hudBlocked,
    );
    return { left: p.x, top: p.y };
  });

  const isLit = (id: string): boolean =>
    annotationUi.highlightId === id || annotationUi.openId === id || previewId === id;

  function toggle(id: string): void {
    annotationUi.openId = annotationUi.openId === id ? null : id;
    annotationUi.highlightId = annotationUi.openId;
  }

  /** Rings a few metres apart (the Apollo 15 flag beside the LM) overlap their tap targets; the
   *  button on top would take a tap aimed at its neighbour's centre. The ring whose centre is
   *  nearest the tap wins. Keyboard activation (no pointer position) keeps the focused ring. */
  function tappedRing(e: MouseEvent, fallback: string): string {
    if (!root || e.detail === 0) return fallback;
    const box = root.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    let best = fallback;
    let bestD = Infinity;
    for (const r of singles) {
      const d = Math.hypot(r.x - x, r.y - y);
      if (d <= HIT_PX / 2 && d < bestD) {
        bestD = d;
        best = r.annotation.id;
      }
    }
    return best;
  }

  function clickCluster(c: RingCluster): void {
    if (fanKey === c.key) {
      fanKey = null;
      return;
    }
    if (!onZoomTo?.(c.x, c.y, separationFactor(c.members, ringPx))) fanKey = c.key;
  }

  function enter(e: PointerEvent, id: string): void {
    if (e.pointerType === 'touch') return;
    annotationUi.highlightId = id;
    previewId = id;
  }
  function leave(id: string): void {
    if (previewId === id) previewId = null;
    if (annotationUi.highlightId === id && annotationUi.openId !== id)
      annotationUi.highlightId = null;
  }
  function focus(e: FocusEvent, id: string): void {
    if (!(e.currentTarget as HTMLElement).matches(':focus-visible')) return;
    annotationUi.highlightId = id;
    previewId = id;
  }

  onMount(() => {
    // Capture phase: Escape closes the popover first and never reaches the flat
    // view's own Escape handler (which would leave the ground view).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (annotationUi.openId) {
        e.stopPropagation();
        annotationUi.openId = null;
      } else if (fanKey) {
        e.stopPropagation();
        fanKey = null;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (annotationUi.openId && !root?.contains(e.target as Node)) annotationUi.openId = null;
      if (fanKey && !(e.target as Element).closest?.('[data-testid^="annotation-"]')) fanKey = null;
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    measureHud();
    const timer = setInterval(measureHud, 300);
    return () => {
      clearInterval(timer);
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
  style:--hl="#889fe7"
>
  {#if fanned}
    <svg class="fan" {width} {height} aria-hidden="true">
      {#each fanned.members as r (r.annotation.id)}
        {@const p = fanPos?.get(r.annotation.id)}
        {#if p}<line x1={fanned.x} y1={fanned.y} x2={p.x} y2={p.y} />{/if}
      {/each}
    </svg>
  {/if}

  {#if areas.length > 0}
    <svg class="areas" {width} {height} aria-hidden="true" data-testid="annotation-areas">
      {#each areas as r (r.annotation.id)}
        <circle
          class:lit={isLit(r.annotation.id)}
          cx={r.x}
          cy={r.y}
          r={r.radiusPx}
          data-annotation-id={r.annotation.id}
          data-radius-px={Math.round(r.radiusPx ?? 0)}
        />
      {/each}
    </svg>
  {/if}

  {#each badges as c, i (c.key)}
    <button
      type="button"
      class="ring cluster"
      class:active={previewCluster === c.key ||
        c.members.some((r) => annotationUi.highlightId === r.annotation.id)}
      style:left="{c.x}px"
      style:top="{c.y}px"
      style:--delay="{-i * 0.8}s"
      aria-label={c.members.map((r) => r.annotation.label).join(', ')}
      data-testid="annotation-cluster"
      data-count={c.members.length}
      onclick={() => !onRingTap?.(c.x, c.y) && clickCluster(c)}
      onpointerenter={(e) => e.pointerType !== 'touch' && (previewCluster = c.key)}
      onpointerleave={() => previewCluster === c.key && (previewCluster = null)}
      onfocus={(e) =>
        (e.currentTarget as HTMLElement).matches(':focus-visible') && (previewCluster = c.key)}
      onblur={() => previewCluster === c.key && (previewCluster = null)}
    >
      <span class="dot"><span class="count mono">{c.members.length}</span></span>
    </button>
  {/each}

  {#each singles as r, i (r.annotation.id)}
    {@const id = r.annotation.id}
    {@const lab = labels.get(id)}
    {@const lit = isLit(id)}
    {@const rpx = pxOf(r)}
    <button
      type="button"
      class="ring"
      class:active={lit}
      class:area={isArea(r)}
      style:left="{r.x}px"
      style:top="{r.y}px"
      style:--ring-px="{rpx}px"
      style:--delay="{-i * 0.8}s"
      aria-label={r.annotation.label}
      aria-haspopup="dialog"
      aria-expanded={annotationUi.openId === id}
      data-testid="annotation-ring"
      data-annotation-id={id}
      onclick={(e) => {
        const hit = tappedRing(e, id);
        const h = singles.find((s) => s.annotation.id === hit) ?? r;
        if (!onRingTap?.(h.x, h.y, hit)) toggle(hit);
      }}
      onpointerenter={(e) => enter(e, id)}
      onpointerleave={() => leave(id)}
      onfocus={(e) => focus(e, id)}
      onblur={() => leave(id)}
    >
      <span class="dot"></span>
    </button>
    {#if lab}
      <span
        class="leader"
        class:active={lit}
        class:vertical={lab.side === 'top' || lab.side === 'bottom'}
        style:left={lab.side === 'top' || lab.side === 'bottom'
          ? `${r.x}px`
          : `${lab.side === 'right' ? r.x + rpx / 2 : r.x - rpx / 2 - LEADER_PX}px`}
        style:top={lab.side === 'top'
          ? `${r.y - rpx / 2 - LEADER_PX}px`
          : lab.side === 'bottom'
            ? `${r.y + rpx / 2}px`
            : `${r.y}px`}
        style:width={lab.side === 'top' || lab.side === 'bottom' ? undefined : `${LEADER_PX}px`}
        style:height={lab.side === 'top' || lab.side === 'bottom' ? `${LEADER_PX}px` : undefined}
        aria-hidden="true"
      ></span>
      <span
        class="chip mono"
        class:active={lit}
        class:left={lab.side === 'left'}
        class:top={lab.side === 'top' || lab.side === 'bottom'}
        style:left="{lab.rect.x}px"
        style:top="{lab.rect.y}px"
        style:width="{lab.rect.w}px"
        aria-hidden="true">{lab.text}</span
      >
    {/if}
  {/each}

  {#if preview && cardPos}
    <div
      class="card"
      data-testid="annotation-preview"
      style:left="{cardPos.left}px"
      style:top="{cardPos.top}px"
      style:width={preview.names ? undefined : `${CARD_W}px`}
      aria-hidden="true"
    >
      {#if preview.names}
        {#each preview.names as name (name)}
          <span class="name mono">{name}</span>
        {/each}
      {:else if preview.annotation}
        {#if preview.annotation.photo}
          <img class="photo-thumb" src={preview.annotation.photo.thumb} alt="" />
        {/if}
        <span class="name mono">{preview.annotation.label}</span>
      {/if}
    </div>
  {/if}

  {#if open}
    <div
      class="pop"
      class:sheet={coarse}
      role="dialog"
      aria-label={open.annotation.label}
      data-testid="annotation-popover"
      style:--photo-h="{popRoom < 330 ? 88 : 140}px"
      style:left={coarse ? `${(width - sheetW) / 2}px` : `${popLeft}px`}
      style:width="{coarse ? sheetW : POP_W}px"
      style:max-height="{coarse ? sheetMax : Math.max(120, popBelow ? spaceBelow : spaceAbove)}px"
      style:top={coarse ? undefined : popBelow ? `${open.y + HIT_PX / 2}px` : undefined}
      style:bottom={coarse
        ? `${sheetBottom}px`
        : popBelow
          ? undefined
          : `${height - open.y + HIT_PX / 2}px`}
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
      {#if open.annotation.position_lroc_only}
        <p class="position-note mono" data-testid="annotation-position-note">
          {m.surface_annotation_position_lroc()}
        </p>
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
  /* --hl (set inline, #889fe7): the site's --color-tier-core #7b9cff blended 65/35 toward
     a neutral grey, so it reads as a calm blue against the ring yellow, not cyan. */
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
    z-index: 2;
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
  /* hover / focus / list highlight: cyan accent, thicker stroke, brighter glow, in front */
  .ring.active .dot,
  .ring:hover .dot,
  .ring:focus-visible .dot {
    transform: scale(1.15);
    border-width: 5px;
    border-color: var(--hl);
    background: rgba(136, 159, 231, 0.28);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.6),
      0 0 22px 6px rgba(136, 159, 231, 0.85),
      inset 0 0 0 1px rgba(0, 0, 0, 0.35);
  }
  .ring.active .dot::after,
  .ring:hover .dot::after {
    border-color: var(--hl);
  }
  .ring.active,
  .ring:hover,
  .ring:focus-visible {
    z-index: 6;
  }
  /* an area is a dashed outline at true size; its tap handle is a small solid dot on the outline */
  .areas {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .areas circle {
    fill: rgba(255, 200, 80, 0.06);
    stroke: var(--color-gold, #ffc850);
    stroke-width: 2.5;
    stroke-dasharray: 9 7;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.9));
    transition: stroke 160ms;
  }
  .areas circle.lit {
    stroke: var(--hl);
    stroke-width: 3.5;
    fill: rgba(136, 159, 231, 0.12);
  }
  .ring.area .dot {
    border: 2px solid rgba(0, 0, 0, 0.65);
    background: var(--color-gold, #ffc850);
    box-shadow: 0 0 6px 1px rgba(255, 200, 80, 0.5);
  }
  .ring.area .dot::after {
    display: none;
  }
  .ring.area.active .dot,
  .ring.area:hover .dot,
  .ring.area:focus-visible .dot {
    border-width: 2px;
    border-color: rgba(0, 0, 0, 0.65);
    background: var(--hl);
    box-shadow: 0 0 10px 3px rgba(136, 159, 231, 0.85);
  }
  .cluster .dot {
    display: grid;
    place-items: center;
  }
  .count {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-shadow: 0 0 3px #000;
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
    z-index: 1;
  }
  .leader.vertical {
    width: 1px;
    height: auto;
  }
  .leader.active {
    background: var(--hl);
    z-index: 5;
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
    z-index: 1;
    transition:
      border-color 160ms,
      background-color 160ms;
  }
  .chip.left {
    text-align: right;
  }
  .chip.top {
    text-align: center;
  }
  .chip.active {
    z-index: 5;
    border-color: var(--hl);
    background: rgba(14, 20, 44, 0.96);
    box-shadow: 0 0 10px rgba(136, 159, 231, 0.55);
  }
  .fan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .fan line {
    stroke: rgba(255, 200, 80, 0.7);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  /* same look as the route-photo hover card (SurfaceScene .traverse-stop-tooltip) */
  .card {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 240px;
    padding: 6px 10px;
    background: rgba(5, 5, 20, 0.92);
    border: 1px solid rgba(136, 159, 231, 0.55);
    border-radius: 4px;
    color: var(--color-text-on-dark, #fff);
    font-size: 11px;
    letter-spacing: 0.02em;
    backdrop-filter: blur(4px);
    pointer-events: none;
    z-index: 8;
  }
  .card .photo-thumb {
    display: block;
    width: 200px;
    max-width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 2px;
    margin-bottom: 4px;
  }
  .card .name {
    font-size: var(--size-label);
    letter-spacing: 0.08em;
    color: rgba(255, 220, 140, 0.95);
    text-transform: uppercase;
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
    z-index: 9;
  }
  /* coarse pointer: a bottom sheet above the bottom HUD (left / width / bottom set inline) */
  .pop.sheet {
    max-width: none;
    border-radius: 10px;
    padding: 14px 16px 14px;
    font-size: 13px;
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
  .pop .position-note {
    font-size: var(--size-label);
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.65);
  }
  .pop .sources {
    margin: 8px 0 0;
    font-size: var(--size-label);
    letter-spacing: 0.06em;
  }
  .pop a {
    color: var(--hl);
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
