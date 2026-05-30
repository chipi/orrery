<!--
  Full-screen image preview overlay (#42).

  /moon and /mars previously inlined the same markup. /moon read styles
  from `$lib/styles/panel-tabs.css`; /mars carried its own (older,
  less-polished) `:global(.lightbox)` block inside the route. Both lose
  their lightbox-specific CSS once they swap to this component, and
  /mars picks up the polished styling for free.

  The close-button uses the surrounding `<button class="lightbox">` so
  the entire overlay area is click-to-close — the visible `×` glyph
  inside is purely decorative (aria-hidden). The bottom credit strip
  sits in its own `<div>` above the button (z-index 101) so per-image
  attribution links remain clickable without dismissing the overlay.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import ImageCredit from '$lib/components/ImageCredit.svelte';

  interface Props {
    src: string | null;
    onClose: () => void;
  }
  let { src, onClose }: Props = $props();
</script>

{#if src}
  <button type="button" class="lightbox" aria-label={m.panel_lightbox_close()} onclick={onClose}>
    <img {src} alt="" loading="lazy" decoding="async" />
    <span class="lightbox-close" aria-hidden="true">×</span>
  </button>
  <div class="lightbox-meta">
    <ImageCredit {src} />
  </div>
{/if}

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(2, 4, 12, 0.92);
    backdrop-filter: blur(8px);
    cursor: zoom-out;
    border: none;
    padding: 0;
  }
  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 4px;
  }
  .lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.05);
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
  .lightbox-close:hover,
  .lightbox-close:focus-visible {
    border-color: rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .lightbox-meta {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 101;
    padding: 10px 16px max(10px, env(safe-area-inset-bottom)) 16px;
    background: rgba(2, 4, 12, 0.88);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    max-height: 35vh;
    overflow-y: auto;
  }
</style>
