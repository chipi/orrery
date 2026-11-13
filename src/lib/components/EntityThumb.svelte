<!--
  EntityThumb — the small round photo of a list row's own thing (L45, UXD-025).

  Decorative: the row's name is beside it, so `alt=""` and no text, no message key. It is not a
  Chip. `src` is a root-relative path from `$lib/entity-thumb` (`thumbOf`); a row with none, or
  whose file fails to load, shows the centred 8 px dot in the same slot so labels line up and no
  broken-image icon appears. `ring` is the row's identity colour (agency, nation, planet); a
  teal or cyan one is drawn neutral (UXD-001), the fallback dot keeps the data colour.
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import { ringColor, THUMB_NEUTRAL_RING } from '$lib/entity-thumb-ring';

  interface Props {
    src: string | null;
    ring?: string | null;
    size?: number;
    fallback?: 'dot' | 'none';
  }
  let { src, ring = null, size = 28, fallback = 'dot' }: Props = $props();

  let failed = $state<string | null>(null);
  const showImage = $derived(src != null && failed !== src);
</script>

{#if showImage && src}
  <img
    class="entity-thumb"
    src={assetUrl(src)}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    style:border-color={ringColor(ring)}
    onerror={() => (failed = src)}
  />
{:else if fallback === 'dot'}
  <span class="entity-thumb-slot" style:width="{size}px" style:height="{size}px" aria-hidden="true"
    ><span class="entity-thumb-dot" style:background={ring ?? THUMB_NEUTRAL_RING}></span></span
  >
{/if}

<style>
  .entity-thumb {
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid;
    box-sizing: border-box;
    flex-shrink: 0;
  }
  .entity-thumb-slot {
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .entity-thumb-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
</style>
