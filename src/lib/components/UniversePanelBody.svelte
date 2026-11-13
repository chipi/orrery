<!--
  UniversePanelBody — the planet panel's skeleton for every star, outer-scale and black-hole panel
  (B3, UXD-023): the shell with the one-row header, the action row, ONE hero, the tab row, then
  Overview as lead text, facts, extras and the science and learn links.

  - Hero: an image (PanelHeroImage + the lightbox) when there is one, else `heroArt` (the star's
    drawn portrait), else nothing: no hero, no slot, no empty frame. A photo of a part of the
    entity names the part in the caption; the author comes from the provenance row of the full image.
  - Tabs: OVERVIEW; GALLERY second and only with two or more images (the grid is all but the hero);
    then the caller's own tabs. One tab draws no tab row.
  - Nothing here carries a colour or a size of its own: tokens, the .editorial lead rule and the
    planet panel's cell look (UniverseFacts).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Panel from './Panel.svelte';
  import PanelActions from './PanelActions.svelte';
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import UniverseFacts, { type Fact } from './UniverseFacts.svelte';
  import { assetUrl } from '$lib/asset-url';
  import { dataLoadFailed } from '$lib/data/core';
  import {
    getImageProvenance,
    getUniverseHero,
    type UniverseHero,
    type UniverseLevel,
  } from '$lib/data';
  import { loadHeroOverrides } from '$lib/image-hero';
  import { getLocale } from '$lib/paraglide/runtime';
  import * as m from '$lib/paraglide/messages';

  type ExtraTab = { id: string; label: string; visible?: boolean; testid?: string };

  type Props = {
    open: boolean;
    onClose: () => void;
    title: string;
    covered?: boolean;
    mobileSheet?: 'full' | 'partial';
    /** The kind line; `eyebrow` replaces it where the line has more than text (a star's swatch). */
    kind?: string;
    eyebrow?: Snippet;
    name?: string;
    /** The entity this panel is for; the tab and the lightbox reset when it changes. */
    entityId: string;
    /** An outer-scale or black-hole entity whose hero comes from panel-heroes.json. */
    heroOf?: { level: UniverseLevel; id: string };
    /** A hero the caller already has (a star's photo, a deep-sky photo). */
    hero?: UniverseHero | null;
    /** What the hero's image is, e.g. the star photo's "Real image" label. */
    heroCaption?: string;
    /** Drawn in the hero slot when there is no image hero (the star portrait). */
    heroArt?: Snippet;
    /** Every image of the entity, the hero first; GALLERY shows from two. Root-relative paths. */
    gallery?: string[];
    tabs?: ExtraTab[];
    /** The content of the caller's own tabs; gets the active tab id. */
    tabContent?: Snippet<[string]>;
    lead?: string[];
    /** Overview content after the lead, before the facts. */
    overview?: Snippet;
    facts?: Fact[];
    /** After the facts: data sources, culture doors. */
    extra?: Snippet;
    science?: Snippet;
    learn?: { href: string; label: string };
    /** The panel's action row: Chip kind action | link, at most three. */
    actions?: Snippet;
    idPrefix?: string;
  };
  let {
    open,
    onClose,
    title,
    covered = false,
    mobileSheet = 'partial',
    kind,
    eyebrow: eyebrowSnippet,
    name,
    entityId,
    heroOf,
    hero: heroGiven = null,
    heroCaption,
    heroArt,
    gallery = [],
    tabs = [],
    tabContent,
    lead = [],
    overview,
    facts = [],
    extra,
    science,
    learn,
    actions,
    idPrefix = 'up',
  }: Props = $props();

  let tab = $state('overview');
  let lightboxSrc = $state<string | null>(null);
  // A tap that opens the panel must not also open the lightbox through the hero beneath it.
  let openedAt = $state(0);
  let lastId = $state<string | null>(null);
  $effect(() => {
    if (entityId !== lastId) {
      lastId = entityId;
      tab = 'overview';
      lightboxSrc = null;
      openedAt = Date.now();
    }
  });
  // Re-opening the same entity after × arms the guard again (no entityId change then).
  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) openedAt = Date.now();
    wasOpen = open;
  });

  let looked = $state<UniverseHero | null>(null);
  let overridesReady = $state(false);
  $effect(() => {
    void Promise.all([loadHeroOverrides('stars'), loadHeroOverrides('black-holes')]).then(
      () => (overridesReady = true),
      () => (overridesReady = true),
    );
  });
  $effect(() => {
    const want = heroOf;
    looked = null;
    if (!want) return;
    void getUniverseHero(want.level, want.id, getLocale())
      .then((h) => {
        if (heroOf?.id === want.id && heroOf.level === want.level) looked = h;
      })
      .catch(dataLoadFailed);
  });
  let hero = $derived(heroGiven ?? looked);

  let author = $state<string | null>(null);
  $effect(() => {
    const full = hero?.full;
    author = null;
    if (!full) return;
    void getImageProvenance(full)
      .then((e) => {
        if (hero?.full === full) author = e ? (e.author ?? e.agency) : null;
      })
      .catch(dataLoadFailed);
  });
  let caption = $derived(
    [
      heroCaption,
      hero?.pictured && name ? m.panel_hero_pictured({ part: hero.pictured }) : null,
      author,
    ]
      .filter(Boolean)
      .join(' · '),
  );
  let lightboxImages = $derived(
    gallery.length > 0 ? gallery.map(assetUrl) : hero ? [assetUrl(hero.full)] : [],
  );
  let galleryGrid = $derived(gallery.slice(1).map(assetUrl));
  let hasGallery = $derived(gallery.length >= 2);
  let allTabs = $derived([
    { id: 'overview', label: m.panel_tab_overview() },
    { id: 'gallery', label: m.panel_tab_gallery(), visible: hasGallery },
    ...tabs,
  ]);
  let tabCount = $derived(allTabs.filter((t) => t.visible !== false).length);
  // An extra tab that disappears (a star with no system) must not leave its panel blank.
  $effect(() => {
    const t = allTabs.find((x) => x.id === tab);
    if (t && t.visible === false) tab = 'overview';
  });
</script>

<Panel {open} {onClose} {covered} {title} {mobileSheet}>
  {#snippet eyebrow()}
    {#if eyebrowSnippet}{@render eyebrowSnippet()}{:else if kind}<div class="type">{kind}</div>{/if}
  {/snippet}
  {#snippet heading()}
    {#if name}<div class="name">{name}</div>{/if}
  {/snippet}

  {#if actions}<PanelActions>{@render actions()}</PanelActions>{/if}

  {#if hero}
    {#key overridesReady}
      <PanelHeroImage
        src={assetUrl(hero.src)}
        name={name ?? title}
        position={hero.position}
        onOpen={() => {
          if (Date.now() - openedAt < 400) return;
          lightboxSrc = assetUrl(hero.full);
        }}
      />
    {/key}
    {#if caption}<p class="hero-caption">{caption}</p>{/if}
  {:else if heroArt}
    <div class="panel-hero">
      {@render heroArt()}
      {#if heroCaption}<p class="hero-caption">{heroCaption}</p>{/if}
    </div>
  {/if}

  {#if tabCount > 1}
    <PanelTabRow {idPrefix} tabs={allTabs} bind:active={tab} />
  {/if}

  <div
    class="tab-content"
    role="tabpanel"
    id="{idPrefix}-tabpanel"
    aria-labelledby="{idPrefix}-tab-{tab}"
  >
    {#if tab === 'overview'}
      {#each lead as para, i (i)}<p class="editorial">{para}</p>{/each}
      {@render overview?.()}
      <UniverseFacts {facts} />
      {@render extra?.()}
      {@render science?.()}
      {#if learn}<a class="learn-link" href={learn.href}>{learn.label} →</a>{/if}
    {:else if tab === 'gallery'}
      <PanelGalleryGrid
        images={galleryGrid}
        gridLabel={m.panel_gallery_aria({ name: name ?? title })}
        thumbLabel={name ?? title}
        onOpen={(src) => (lightboxSrc = src)}
      />
    {:else}
      {@render tabContent?.(tab)}
    {/if}
  </div>

  <PanelLightbox src={lightboxSrc} images={lightboxImages} onClose={() => (lightboxSrc = null)} />
</Panel>

<style>
  .type {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 3px;
    color: var(--color-text-label);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
  }
  .hero-caption {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
    margin: -6px 0 12px;
  }
  .learn-link {
    display: inline-block;
    margin-bottom: 12px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: var(--color-state);
    text-decoration: none;
  }
  .learn-link:hover,
  .learn-link:focus-visible {
    text-decoration: underline;
  }
</style>
