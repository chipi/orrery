<!--
  Full-screen image preview overlay (#42), shared by every detail panel.

  `src` opens it; `images` (the panel's whole gallery, hero first) lets the
  viewer step through the gallery: ‹ › buttons, ← → keys, swipe on touch, and
  a thumbnail strip on desktop (hidden on phones, where arrows + swipe are
  enough). A `src` that is not in `images` (insignia, diagram, cutaway) opens
  alone, without navigation. Arrows, keys and swipe follow the reading
  direction, so they mirror in RTL locales.

  `button.lightbox` is the full-area backdrop (click closes); the image and
  the controls sit above it. The credit strip follows the image shown.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import ImageCredit from '$lib/components/ImageCredit.svelte';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import type { getImageAlt } from '$lib/image-alt';
  import { getLocale } from '$lib/paraglide/runtime';
  import { holdSceneCover } from '$lib/three/animate-loop';

  interface Props {
    src: string | null;
    /** The panel's gallery; enables previous / next / thumbnails when it holds `src`. */
    images?: readonly string[];
    onClose: () => void;
  }
  let { src, images = [], onClose }: Props = $props();

  // Panels hand some urls through assetUrl() (stream origin prefixed) and
  // others root-relative; compare on the path from /images/ on.
  const pathKey = (u: string) => {
    const i = u.indexOf('/images/');
    return i >= 0 ? u.slice(i) : u;
  };

  let list = $state<string[]>([]);
  let index = $state(0);

  $effect(() => {
    if (!src) return;
    const i = images.findIndex((u) => u === src || pathKey(u) === pathKey(src));
    if (i >= 0) {
      list = [...images];
      index = i;
    } else {
      list = [src];
      index = 0;
    }
  });

  // Alt text loads with the first open: a static import put image-alt and SvelteMap in every
  // panel route's JS and took /fleet over its budget.
  let altOf = $state<typeof getImageAlt | null>(null);
  $effect(() => {
    if (src && !altOf) void import('$lib/image-alt').then((mod) => (altOf = mod.getImageAlt));
  });
  // The viewer covers the page; 3D scenes behind it stop rendering while open.
  $effect(() => {
    if (!src) return;
    return holdSceneCover();
  });

  const current = $derived(src ? (list[index] ?? src) : null);
  const many = $derived(list.length > 1);
  // The image's description in the reader's language (#257): its alt text, also shown
  // as the visible caption — the credit line below keeps the original work's title.
  const caption = $derived(
    current
      ? (altOf?.(current.slice(Math.max(0, current.indexOf('/images/'))), getLocale()) ?? '')
      : '',
  );

  function step(delta: number) {
    if (!many) return;
    index = (index + delta + list.length) % list.length;
  }

  const rtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  function onKey(e: KeyboardEvent) {
    if (!src) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (zoomed) zoomTo(1);
      else onClose();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomTo(scale * 1.5);
    } else if (e.key === '-') {
      e.preventDefault();
      zoomTo(scale / 1.5);
    } else if (e.key === '0') {
      e.preventDefault();
      zoomTo(1);
    } else if (zoomed && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const d = 60;
      if (e.key === 'ArrowLeft') tx += d;
      if (e.key === 'ArrowRight') tx -= d;
      if (e.key === 'ArrowUp') ty += d;
      if (e.key === 'ArrowDown') ty -= d;
      clampPan();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const forward = e.key === 'ArrowRight' ? 1 : -1;
      step(rtl() ? -forward : forward);
    }
  }

  // Zoom + pan, for studying a drawing's fine labels at full resolution: wheel or +/− zoom
  // around the pointer, double-click / double-tap toggles, drag pans, two fingers pinch.
  // Swipe and arrow-key stepping only act at scale 1.
  const MAX_ZOOM = 8;
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  let imgEl = $state<HTMLImageElement | null>(null);
  const zoomed = $derived(scale > 1.01);
  $effect(() => {
    void current;
    scale = 1;
    tx = 0;
    ty = 0;
  });
  function clampPan() {
    if (!imgEl) return;
    const w = imgEl.offsetWidth;
    const h = imgEl.offsetHeight;
    const mx = Math.max(0, (w * scale - w) / 2);
    const my = Math.max(0, (h * scale - h) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  }
  /** Zoom to `next` keeping the image point under (cx, cy) (client coords) still. */
  function zoomTo(next: number, cx?: number, cy?: number) {
    next = Math.min(MAX_ZOOM, Math.max(1, next));
    if (imgEl && cx !== undefined && cy !== undefined) {
      const r = imgEl.getBoundingClientRect();
      const px = cx - (r.left + r.width / 2);
      const py = cy - (r.top + r.height / 2);
      const k = next / scale;
      tx = tx - px * (k - 1);
      ty = ty - py * (k - 1);
    }
    scale = next;
    if (scale === 1) {
      tx = 0;
      ty = 0;
    }
    clampPan();
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomTo(scale * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }
  function onDblClick(e: MouseEvent) {
    zoomTo(zoomed ? 1 : 3, e.clientX, e.clientY);
  }
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; s: number } | null = null;
  let lastTap = 0;
  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), s: scale };
    } else if (e.pointerType === 'touch') {
      const now = Date.now();
      if (now - lastTap < 300) zoomTo(zoomed ? 1 : 3, e.clientX, e.clientY);
      lastTap = now;
    }
  }
  function onPointerMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoomTo(
        (pinch.s * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.d,
        (a!.x + b!.x) / 2,
        (a!.y + b!.y) / 2,
      );
    } else if (zoomed && pointers.size === 1) {
      tx += e.clientX - prev.x;
      ty += e.clientY - prev.y;
      clampPan();
    }
  }
  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  }
  // Zoomed in, ask the srcset for a rung that fills the zoomed size (up to the 3072 base).
  const zoomSizes = $derived(zoomed ? `${Math.ceil(scale) * 100}vw` : undefined);

  let touchX: number | null = null;
  function onTouchStart(e: TouchEvent) {
    touchX = e.touches.length === 1 && !zoomed ? e.touches[0]!.clientX : null;
  }
  function onTouchEnd(e: TouchEvent) {
    if (touchX === null || zoomed) return;
    const dx = e.changedTouches[0]!.clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 40) return;
    // Swipe left brings the next image (LTR); mirrored in RTL.
    const forward = dx < 0 ? 1 : -1;
    step(rtl() ? -forward : forward);
  }

  // Warm the neighbours so stepping shows the next image at once.
  $effect(() => {
    if (!src || !many) return;
    for (const d of [1, -1]) {
      const u = list[(index + d + list.length) % list.length]!;
      const r = responsive(u, IMAGE_SIZES.full);
      const img = new Image();
      if (r.sizes) img.sizes = r.sizes;
      if (r.srcset) img.srcset = r.srcset;
      img.src = r.src ?? u;
    }
  });

  // Mounted on <body>: a panel's own stacking context (aside.panel,
  // z-index 30) would otherwise trap the overlay under the site nav
  // (z-index 40), hiding the close button on /explore.
  function toBody(node: HTMLElement) {
    document.body.appendChild(node);
    node.focus();
    return { destroy: () => node.remove() };
  }

  // Keep the active thumbnail in view as the index moves.
  function activeThumb(node: HTMLElement, active: boolean) {
    const reveal = (on: boolean) => {
      if (on) node.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    };
    reveal(active);
    return { update: reveal };
  }
</script>

<svelte:window onkeydown={onKey} />

{#if src && current}
  <div
    class="lightbox-root"
    role="dialog"
    aria-modal="true"
    aria-label={m.panel_lightbox_close()}
    tabindex="-1"
    use:toBody
  >
    <button
      type="button"
      class="lightbox"
      aria-label={m.panel_lightbox_close()}
      onclick={onClose}
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
    ></button>

    <div class="lightbox-stage" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
      {#key current}
        <img
          bind:this={imgEl}
          class="lightbox-img"
          class:zoomed
          data-testid="lightbox-img"
          {...responsive(current, IMAGE_SIZES.full)}
          sizes={zoomSizes ?? responsive(current, IMAGE_SIZES.full).sizes}
          alt={caption}
          decoding="async"
          draggable="false"
          style:transform={zoomed ? `translate(${tx}px, ${ty}px) scale(${scale})` : undefined}
          onwheel={onWheel}
          ondblclick={onDblClick}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
        />
      {/key}
    </div>

    <div class="lightbox-zoom" role="group" aria-label={m.panel_lightbox_zoom_group()}>
      <button
        type="button"
        aria-label={m.panel_lightbox_zoom_out()}
        disabled={!zoomed}
        onclick={() => zoomTo(scale / 1.5)}>−</button
      >
      <button
        type="button"
        class="lightbox-zoom-level"
        aria-label={m.panel_lightbox_zoom_reset()}
        data-testid="lightbox-zoom-level"
        disabled={!zoomed}
        onclick={() => zoomTo(1)}>{Math.round(scale * 100)}%</button
      >
      <button
        type="button"
        aria-label={m.panel_lightbox_zoom_in()}
        data-testid="lightbox-zoom-in"
        disabled={scale >= MAX_ZOOM}
        onclick={() => zoomTo(scale * 1.5)}>+</button
      >
    </div>

    <button
      type="button"
      class="lightbox-close"
      aria-label={m.panel_lightbox_close()}
      onclick={onClose}>×</button
    >

    {#if many}
      <div class="lightbox-count" aria-live="polite">
        <span class="sr-only"
          >{m.panel_lightbox_position({ n: index + 1, total: list.length })}</span
        >
        <span aria-hidden="true">{index + 1} / {list.length}</span>
      </div>
      <button
        type="button"
        class="lightbox-nav lightbox-prev"
        aria-label={m.panel_lightbox_prev()}
        onclick={() => step(-1)}>‹</button
      >
      <button
        type="button"
        class="lightbox-nav lightbox-next"
        aria-label={m.panel_lightbox_next()}
        onclick={() => step(1)}>›</button
      >
    {/if}

    <div class="lightbox-meta">
      {#if many}
        <div class="lightbox-thumbs">
          {#each list as u, i (u)}
            <button
              type="button"
              class="lightbox-thumb"
              class:active={i === index}
              aria-label={m.panel_lightbox_thumb({ n: i + 1 })}
              aria-current={i === index ? 'true' : undefined}
              onclick={() => (index = i)}
              use:activeThumb={i === index}
            >
              <img
                {...responsive(u, IMAGE_SIZES.panelThumb)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
          {/each}
        </div>
      {/if}
      <!-- Same text as the image's alt: hidden from screen readers so it is not read twice. -->
      {#if caption}<p class="lightbox-caption" aria-hidden="true">{caption}</p>{/if}
      <ImageCredit src={current} />
    </div>
  </div>
{/if}

<style>
  .lightbox-root {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    outline: none;
  }
  /* z-index 0 overrides the global .lightbox { z-index: 100 } in panel-tabs.css,
     which would put the backdrop over the arrows. */
  .lightbox {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: rgba(2, 4, 12, 0.92);
    backdrop-filter: blur(8px);
    cursor: zoom-out;
    border: none;
    padding: 0;
  }
  .lightbox-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px 16px 12px;
    pointer-events: none;
  }
  .lightbox-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
    pointer-events: auto;
    cursor: zoom-in;
    /* the viewer handles pinch and drag itself */
    touch-action: none;
    user-select: none;
    transform-origin: center center;
    will-change: transform;
  }
  .lightbox-img.zoomed {
    cursor: grab;
  }
  .lightbox-img.zoomed:active {
    cursor: grabbing;
  }
  .lightbox-zoom {
    position: absolute;
    z-index: 2;
    top: 16px;
    inset-inline-start: 16px;
    display: flex;
    gap: 6px;
  }
  .lightbox-zoom button {
    min-width: 44px;
    height: 44px;
    padding: 0 10px;
    background: rgba(2, 4, 12, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 20px;
    border-radius: 22px;
    cursor: pointer;
  }
  .lightbox-zoom .lightbox-zoom-level {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .lightbox-zoom button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .lightbox-zoom button:hover:not(:disabled),
  .lightbox-zoom button:focus-visible {
    border-color: rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .lightbox-close,
  .lightbox-nav {
    position: absolute;
    z-index: 2;
    width: 44px;
    height: 44px;
    background: rgba(2, 4, 12, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 24px;
    line-height: 1;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* panel-tabs.css still carries a global .lightbox-close { right: 16px }: reset it,
     or the × would stay on the right in RTL. */
  .lightbox-close {
    top: 16px;
    right: auto;
    inset-inline-end: 16px;
  }
  .lightbox-nav {
    top: 50%;
    transform: translateY(-50%);
    font-size: 30px;
  }
  .lightbox-prev {
    inset-inline-start: 12px;
  }
  .lightbox-next {
    inset-inline-end: 12px;
  }
  /* The glyphs point the reading direction: mirror them in RTL. */
  :global([dir='rtl']) .lightbox-nav {
    transform: translateY(-50%) scaleX(-1);
  }
  .lightbox-close:hover,
  .lightbox-close:focus-visible,
  .lightbox-nav:hover,
  .lightbox-nav:focus-visible {
    border-color: rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .lightbox-count {
    position: absolute;
    z-index: 2;
    top: 26px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  :global([dir='rtl']) .lightbox-count {
    transform: translateX(50%);
  }
  .lightbox-meta {
    position: relative;
    inset: auto;
    z-index: 2;
    padding: 10px 16px max(10px, env(safe-area-inset-bottom)) 16px;
    background: rgba(2, 4, 12, 0.88);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    max-height: 35vh;
    overflow-y: auto;
  }
  /* Thumbnails on desktop only; phones step with the arrows and swipe. Width
     alone let a landscape phone (851 px wide) show them, so a fine pointer is
     required too. */
  .lightbox-caption {
    max-width: 60ch;
    margin: 8px auto 0;
    padding: 0 16px;
    font-size: 13px;
    line-height: 1.45;
    text-align: center;
    color: rgba(255, 255, 255, 0.82);
  }
  .lightbox-thumbs {
    display: none;
  }
  @media (min-width: 768px) and (hover: hover) and (pointer: fine) {
    .lightbox-thumbs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 6px;
    }
  }
  .lightbox-thumb {
    flex: 0 0 auto;
    width: 72px;
    height: 54px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 3px;
    background: none;
    cursor: pointer;
    opacity: 0.6;
  }
  .lightbox-thumb.active {
    border-color: #fff;
    opacity: 1;
  }
  .lightbox-thumb:hover,
  .lightbox-thumb:focus-visible {
    opacity: 1;
    outline: none;
  }
  .lightbox-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
