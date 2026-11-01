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

  const current = $derived(src ? (list[index] ?? src) : null);
  const many = $derived(list.length > 1);

  function step(delta: number) {
    if (!many) return;
    index = (index + delta + list.length) % list.length;
  }

  const rtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  function onKey(e: KeyboardEvent) {
    if (!src) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const forward = e.key === 'ArrowRight' ? 1 : -1;
      step(rtl() ? -forward : forward);
    }
  }

  let touchX: number | null = null;
  function onTouchStart(e: TouchEvent) {
    touchX = e.touches.length === 1 ? e.touches[0]!.clientX : null;
  }
  function onTouchEnd(e: TouchEvent) {
    if (touchX === null) return;
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
          class="lightbox-img"
          {...responsive(current, IMAGE_SIZES.full)}
          alt=""
          decoding="async"
        />
      {/key}
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
  /* Thumbnails on desktop only; phones step with the arrows and swipe. */
  .lightbox-thumbs {
    display: none;
  }
  @media (min-width: 768px) {
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
