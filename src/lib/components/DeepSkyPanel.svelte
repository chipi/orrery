<!--
  DeepSkyPanel — detail panel for a deep-sky object in the /explore v2 immersive
  view (Slice 4). On the shared UniversePanelBody (B3): the object's photo as the hero
  (the same photo is the immersive main area), type / distance / telescope + the curated
  gallery caption, a link back to the /gallery/deep-sky wall, and — for star-forming
  regions — a "forming-system" gateway action into an exoplanet BodyScene. Gallery text is
  English-only (matching the #391 gallery); only the chrome is localized.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import Chip from './Chip.svelte';
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
  let facts = $derived(
    object
      ? [
          ...(distance
            ? [
                {
                  label: m.explore_ds_distance(),
                  value: distance,
                  accent: true,
                  source: distSrc ?? undefined,
                },
              ]
            : []),
          ...(object.mag !== null && magSrc
            ? [
                {
                  label: `${m.star_label_apparent_mag()} (V)`,
                  value: object.mag.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                  source: magSrc,
                },
              ]
            : []),
          ...(image?.telescope
            ? [{ label: m.explore_ds_telescope(), value: image.telescope }]
            : []),
          ...(object.con
            ? [{ label: m.explore_ds_constellation(), value: deepSkyConstellation(object.con) }]
            : []),
        ]
      : [],
  );
  let hero = $derived(
    object?.photoKey && image
      ? {
          src: `/images/deep-sky/${object.photoKey}.thumb.jpg`,
          full: `/images/deep-sky/${object.photoKey}.jpg`,
        }
      : null,
  );
</script>

<UniversePanelBody
  {open}
  {onClose}
  {title}
  entityId={object?.id ?? ''}
  {hero}
  kind={object ? `${categoryLabel} · ${object.designation}` : undefined}
  name={object ? title : undefined}
  lead={[overlay?.fact, overlay?.bio, image?.caption].filter((t): t is string => !!t)}
  {facts}
>
  {#snippet actions()}
    {#if object?.gatewaySystem && onGateway}
      <Chip kind="action" onclick={() => onGateway?.(object.gatewaySystem!)}
        >{m.explore_ds_gateway()} →</Chip
      >
    {/if}
    {#if object}<Chip kind="link" href={galleryHref}>{m.explore_ds_gallery_link()} →</Chip>{/if}
  {/snippet}
  {#snippet extra()}
    {#if object}
      {#if object.gatewaySystem && onGateway}<p class="gateway-note">
          {m.explore_ds_gateway_note()}
        </p>{/if}
      <DataSources variant="panel" items={sources} links={recordLinks(object.records)} />
      {#if children}<div class="doors">{@render children()}</div>{/if}
    {/if}
  {/snippet}
</UniversePanelBody>

<style>
  .gateway-note {
    font-size: var(--size-meta);
    line-height: 1.4;
    color: var(--color-text-label);
    margin: 0 0 12px;
  }
</style>
