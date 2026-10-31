<script lang="ts">
  import SizesCanvas from '$lib/components/SizesCanvas.svelte';
  import * as m from '$lib/paraglide/messages';

  let { highlightId, onClose }: { highlightId: string | null; onClose: () => void } = $props();
</script>

<!-- Size comparison overlay — modal-style, mirrors selected planet
     (if any) so the user keeps context. ESC + backdrop click close. -->
<button type="button" class="sizes-backdrop" aria-label={m.explore_sizes_close()} onclick={onClose}
></button>
<div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
  <button type="button" class="sizes-close" aria-label={m.explore_sizes_close()} onclick={onClose}
    >×</button
  >
  <div class="sizes-canvas-wrap">
    <SizesCanvas {highlightId} />
  </div>
</div>

<style>
  .sizes-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 4, 12, 0.78);
    backdrop-filter: blur(4px);
    z-index: 60;
    border: 0;
    cursor: pointer;
    /* Reset button defaults so it behaves as a click target only. */
    padding: 0;
    margin: 0;
  }
  .sizes-card {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(8, 10, 22, 0.96);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 8px;
    padding: 18px 18px 14px;
    width: min(640px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  }
  .sizes-close {
    position: absolute;
    top: 8px;
    right: 10px;
    background: transparent;
    border: 0;
    color: rgba(255, 255, 255, 0.6);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
  .sizes-close:hover,
  .sizes-close:focus-visible {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    outline: none;
  }
  .sizes-canvas-wrap {
    width: 100%;
    /* The diorama renders Jupiter at maxVR ≈ 70 px tall; total
       content fills ~320 px (header + bodies + 2 label rows + source).
       A rectangular 16:9-ish frame avoids the bottom-half emptiness
       that came with the previous 540 px container. */
    aspect-ratio: 16 / 7;
    max-height: calc(100vh - 110px);
  }
  .sizes-canvas-wrap :global(canvas) {
    width: 100%;
    height: 100%;
  }
</style>
