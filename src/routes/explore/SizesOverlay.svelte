<script lang="ts">
  import SizesCanvas from '$lib/components/SizesCanvas.svelte';
  import { distanceWithUnit, planetName } from '$lib/explore/format';
  import { PLANET_SIZES, planetDiameterKm } from '$lib/explore/planet-sizes';
  import { formatNumber } from '$lib/format';
  import { activeLocale } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

  let { highlightId, onClose }: { highlightId: string | null; onClose: () => void } = $props();

  // The legend cell under the pointer or focus rings its body in the canvas; a tap pins it
  // (a phone has no hover).
  let hoverId = $state<string | null>(null);
  let pinnedId = $state<string | null>(null);
  const diameter = (km: number): string => distanceWithUnit(formatNumber(km, activeLocale()), 'km');
</script>

<!-- Size comparison overlay — modal-style, mirrors selected planet
     (if any) so the user keeps context. ESC + backdrop click close. The canvas draws the
     bodies only; names and diameters are the aligned legend grid under it, in the reader's
     language (UXD-021). -->
<button type="button" class="sizes-backdrop" aria-label={m.explore_sizes_close()} onclick={onClose}
></button>
<div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
  <button type="button" class="sizes-close" aria-label={m.explore_sizes_close()} onclick={onClose}
    >×</button
  >
  <h2 class="sizes-heading">{m.sizes_header()}</h2>
  <div class="sizes-canvas-wrap">
    <SizesCanvas {highlightId} hoverId={hoverId ?? pinnedId} />
  </div>
  <ul class="sizes-legend" data-testid="sizes-legend">
    {#each PLANET_SIZES as p (p.id)}
      <li class="sizes-cell-item">
        <button
          type="button"
          class="sizes-cell"
          class:current={highlightId === p.id}
          aria-current={highlightId === p.id ? 'true' : undefined}
          aria-pressed={pinnedId === p.id}
          data-testid="sizes-cell-{p.id}"
          onpointerenter={() => (hoverId = p.id)}
          onpointerleave={() => (hoverId = null)}
          onfocus={() => (hoverId = p.id)}
          onblur={() => (hoverId = null)}
          onclick={() => (pinnedId = pinnedId === p.id ? null : p.id)}
        >
          <span class="sizes-swatch" style:background={p.col} aria-hidden="true"></span>
          <span class="sizes-name">{planetName(p.id, p.id)}</span>
          <span class="sizes-km">{diameter(planetDiameterKm(p))}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="sizes-source">{m.sizes_source()}</p>
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
    border: 1px solid var(--color-accent-edge);
    border-radius: 8px;
    padding: 18px 18px 14px;
    width: min(640px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    overflow-y: auto;
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
  .sizes-heading {
    margin: 0 36px 10px 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    font-weight: 700;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.7);
  }
  .sizes-canvas-wrap {
    width: 100%;
    /* Bodies only: Jupiter is ~135 px tall at the card's full width. */
    aspect-ratio: 16 / 5;
    min-height: 140px;
    max-height: calc(100vh - 260px);
  }
  .sizes-canvas-wrap :global(canvas) {
    width: 100%;
    height: 100%;
  }
  /* One grid, one top edge: eight cells in the canvas's left-to-right order (4 x 2 on a phone). */
  .sizes-legend {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 4px;
  }
  .sizes-cell-item {
    display: flex;
  }
  .sizes-cell {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 6px 5px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.85);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-align: start;
    cursor: pointer;
  }
  .sizes-cell:hover,
  .sizes-cell:focus-visible,
  .sizes-cell[aria-pressed='true'] {
    background: rgba(255, 255, 255, 0.06);
    outline: none;
  }
  .sizes-cell.current {
    border-color: rgba(255, 255, 255, 0.5);
    color: #fff;
  }
  .sizes-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .sizes-name {
    max-width: 100%;
    overflow-wrap: anywhere;
    font-weight: 700;
    text-transform: uppercase;
  }
  .sizes-km {
    color: rgba(255, 255, 255, 0.6);
  }
  .sizes-source {
    margin: 10px 0 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: rgba(255, 255, 255, 0.6);
  }
  @media (max-width: 559px) {
    .sizes-legend {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
