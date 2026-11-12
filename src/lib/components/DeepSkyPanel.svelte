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
  import type { DeepSkyObject, DeepSkyTextOverlay } from '$lib/data';
  import type { DeepSkyImage } from '$lib/deep-sky';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import {
    deepSkyCategoryLabel,
    deepSkyConstellation,
    deepSkyDistance,
    deepSkyTitle,
  } from '$lib/explore/format';
  import { dataSourceItems, recordLinks, sourceLink } from '$lib/catalogue';
  import DataSources from './DataSources.svelte';

  type Props = {
    object: DeepSkyObject | null;
    image?: DeepSkyImage | undefined;
    /** The object's reviewed fact + bio in the reader's locale (null until loaded or when none exists). */
    overlay?: DeepSkyTextOverlay | null;
    galleryHref: string;
    open: boolean;
    onClose: () => void;
    /** Called when the forming-system gateway CTA is used (star-forming only). */
    onGateway?: (hostId: string) => void;
    /** Optional extra content — e.g. a culture door (#410: the Arecibo message
     *  was beamed at M13). */
    children?: Snippet;
  };
  let {
    object,
    image,
    overlay = null,
    galleryHref,
    open,
    onClose,
    onGateway,
    children,
  }: Props = $props();

  let categoryLabel = $derived(object ? deepSkyCategoryLabel(object.category) : '');
  let title = $derived(object ? deepSkyTitle(object) : '');
  let distance = $derived(
    object?.dist_ly != null ? deepSkyDistance(object.dist_ly, getLocale()) : object?.dist_label,
  );
  let distSrc = $derived(sourceLink(object?.catalogue?.dist_ly));
  let magSrc = $derived(sourceLink(object?.catalogue?.mag));
  let sources = $derived(
    dataSourceItems(object?.catalogue, (k) =>
      k === 'dist_ly'
        ? m.explore_ds_distance()
        : k === 'mag'
          ? `${m.star_label_apparent_mag()} (V)`
          : null,
    ),
  );
</script>

<Panel {open} {onClose} {title} mobileSheet="partial">
  {#if object}
    <div class="head">
      <div class="kind">{categoryLabel} · {object.designation}</div>
      <div class="name">{title}</div>
    </div>

    {#if overlay?.fact}<p class="editorial">{overlay.fact}</p>{/if}
    {#if overlay?.bio}<p class="prose">{overlay.bio}</p>{/if}
    {#if image?.caption}<p class="prose">{image.caption}</p>{/if}

    <div class="grid">
      {#if distance}
        <div class="cell">
          <div class="cell-label">{m.explore_ds_distance()}</div>
          <div class="cell-value accent">{distance}</div>
          {#if distSrc}
            <a class="src" href={distSrc.url} target="_blank" rel="noopener noreferrer external"
              >{distSrc.label}</a
            >
          {/if}
        </div>
      {/if}
      {#if object.mag !== null && magSrc}
        <div class="cell">
          <div class="cell-label">{m.star_label_apparent_mag()} (V)</div>
          <div class="cell-value">
            {object.mag.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <a class="src" href={magSrc.url} target="_blank" rel="noopener noreferrer external"
            >{magSrc.label}</a
          >
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
          <div class="cell-value">{deepSkyConstellation(object.con)}</div>
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

    <DataSources variant="panel" items={sources} links={recordLinks(object.records)} />

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
    color: var(--color-text-label);
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
    font-size: var(--size-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-label);
  }
  .cell-value {
    font-size: 0.82rem;
    font-weight: 600;
  }
  .cell-value.accent {
    color: var(--color-state);
  }
  .src {
    display: block;
    margin-top: 2px;
    font-size: var(--size-label);
    font-weight: 400;
    color: var(--color-text-label);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .gateway {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.6rem;
    margin-bottom: 0.6rem;
  }
  .gateway-note {
    font-size: 0.75rem;
    color: var(--color-text-label);
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
    font-size: var(--size-label);
    color: var(--color-text-label);
    margin: 0.4rem 0;
  }
  .gallery-link {
    display: inline-block;
    font-size: 0.8rem;
    color: var(--color-state);
    text-decoration: none;
    font-weight: 600;
  }
  .gallery-link:hover {
    text-decoration: underline;
  }
</style>
