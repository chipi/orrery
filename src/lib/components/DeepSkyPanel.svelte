<!--
  DeepSkyPanel — detail panel for a deep-sky object in the /explore v2 immersive
  view (Slice 4). Mirrors the shared Panel + detail-panel family. Shows the
  object's type / distance / telescope + the curated gallery caption & credit,
  a link back to the /gallery/deep-sky wall, and — for star-forming regions — a
  "forming-system" gateway CTA into an exoplanet BodyScene. Gallery text is
  English-only (matching the #391 gallery); only the chrome is localized.
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import type { DeepSkyObject, DeepSkyCategory } from '$lib/data';
  import type { DeepSkyImage } from '$lib/deep-sky';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    object: DeepSkyObject | null;
    image?: DeepSkyImage | undefined;
    galleryHref: string;
    open: boolean;
    onClose: () => void;
    /** Called when the forming-system gateway CTA is used (star-forming only). */
    onGateway?: (hostId: string) => void;
    /** Optional extra content — e.g. a culture door (#410: the Arecibo message
     *  was beamed at M13). */
    children?: Snippet;
  };
  let { object, image, galleryHref, open, onClose, onGateway, children }: Props = $props();

  const CAT_LABEL: Record<DeepSkyCategory, () => string> = {
    galaxy: m.explore_ds_cat_galaxy,
    'galaxy-cluster': m.explore_ds_cat_galaxy_cluster,
    nebula: m.explore_ds_cat_nebula,
    'planetary-nebula': m.explore_ds_cat_planetary_nebula,
    'supernova-remnant': m.explore_ds_cat_supernova_remnant,
    'star-forming-region': m.explore_ds_cat_star_forming_region,
    'dark-nebula': m.explore_ds_cat_dark_nebula,
    'star-cluster': m.explore_ds_cat_star_cluster,
    'globular-cluster': m.explore_ds_cat_globular_cluster,
    star: m.explore_ds_cat_star,
    other: m.explore_ds_cat_other,
  };
  let categoryLabel = $derived(object ? CAT_LABEL[object.category]() : '');
  let title = $derived(object?.name ?? '');
</script>

<Panel {open} {onClose} {title} mobileSheet="partial">
  {#if object}
    <div class="head">
      <div class="kind">{categoryLabel} · {object.designation}</div>
      <div class="name">{object.name}</div>
    </div>

    {#if image?.caption}<p class="prose">{image.caption}</p>{/if}

    <div class="grid">
      {#if object.dist_label}
        <div class="cell">
          <div class="cell-label">{m.explore_ds_distance()}</div>
          <div class="cell-value teal">{object.dist_label}</div>
        </div>
      {/if}
      {#if image?.telescope}
        <div class="cell">
          <div class="cell-label">{m.explore_ds_telescope()}</div>
          <div class="cell-value">{image.telescope}</div>
        </div>
      {/if}
      {#if object.con}
        <div class="cell">
          <div class="cell-label">{m.explore_ds_constellation()}</div>
          <div class="cell-value">{object.con}</div>
        </div>
      {/if}
    </div>

    {#if object.gatewaySystem && onGateway}
      <div class="gateway">
        <p class="gateway-note">{m.explore_ds_gateway_note()}</p>
        <button
          type="button"
          class="gateway-btn"
          onclick={() => onGateway?.(object.gatewaySystem!)}
        >
          {m.explore_ds_gateway()} →
        </button>
      </div>
    {/if}

    {#if children}<div class="doors">{@render children()}</div>{/if}

    {#if image?.credit}<p class="credit">{image.credit}</p>{/if}

    <a class="gallery-link" href={galleryHref}>{m.explore_ds_gallery_link()} →</a>
  {/if}
</Panel>

<style>
  .head {
    margin-bottom: 0.5rem;
  }
  .kind {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted, #9aa4bf);
  }
  .name {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .prose {
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text, #e9eefc);
    margin: 0.5rem 0 0.75rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .cell {
    min-width: 0;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
    padding: 0.4rem 0.55rem;
  }
  .cell-label {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted, #9aa4bf);
  }
  .cell-value {
    font-size: 0.82rem;
    font-weight: 600;
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
  .gateway {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.6rem;
    margin-bottom: 0.6rem;
  }
  .gateway-note {
    font-size: 0.75rem;
    color: var(--muted, #9aa4bf);
    margin: 0 0 0.45rem;
    line-height: 1.4;
  }
  .gateway-btn {
    display: inline-block;
    background: linear-gradient(135deg, #ff9bb0, #ffc850);
    color: #1a1030;
    font-weight: 700;
    font-size: 0.8rem;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 0.85rem;
    cursor: pointer;
  }
  .gateway-btn:hover {
    filter: brightness(1.08);
  }
  .credit {
    font-size: 0.68rem;
    color: var(--muted, #9aa4bf);
    margin: 0.4rem 0;
  }
  .gallery-link {
    display: inline-block;
    font-size: 0.8rem;
    color: #4ecdc4;
    text-decoration: none;
    font-weight: 600;
  }
  .gallery-link:hover {
    text-decoration: underline;
  }
</style>
