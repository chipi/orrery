<script lang="ts">
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import PanelLinkTiers from './PanelLinkTiers.svelte';
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import Panel from './Panel.svelte';
  import AgencyRow from './AgencyRow.svelte';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import { page } from '$app/state';
  import type { StationModule } from '$types/station';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import WhyPopover from './WhyPopover.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import { pickScienceLinks, refsFromSlugs } from '$lib/science-links';
  import type { ScienceTabId } from '$types/science';
  import { spacecraftDiagramPath } from '$lib/spacecraft-diagrams';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { dataLoadFailed } from '$lib/data/core';

  type Tab = 'overview' | 'gallery' | 'anatomy' | 'learn';

  type Props = {
    module: StationModule | null;
    open: boolean;
    onClose: () => void;
    galleryFetcher: (id: string) => Promise<string[]>;
  };
  let { module: mod, open, onClose, galleryFetcher }: Props = $props();
  let scienceLinks = $derived(pickScienceLinks(refsFromSlugs(mod?.science)));

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);

  // Re-load the gallery whenever the selected module changes. Depends only on
  // `mod.id` (read synchronously at the top) — no `$state` guard variable, which
  // is what broke the close→re-open flow on mobile: the read+write `lastId`
  // signal left the effect not re-running for the 2nd module. An effect cleanup
  // cancels a stale in-flight fetch so a fast switch can't clobber the new one.
  $effect(() => {
    const id = mod?.id ?? null;
    tab = 'overview';
    lightboxSrc = null;
    gallery = [];
    if (!id) return;
    let active = true;
    void galleryFetcher(id)
      .then((urls) => {
        if (active) gallery = urls;
      })
      .catch(dataLoadFailed);
    return () => {
      active = false;
    };
  });

  let diagramPath = $derived(mod ? spacecraftDiagramPath(mod.id) : null);
  let hasDiagram = $derived(diagramPath !== null);

  // Responsive WebP ladder for the anatomy diagram once the manifest loads;
  // plain webp until then / when no ladder exists (RFC-030 Slice 3).
  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);
  let diagramLadder = $derived(ladderReady && diagramPath ? ladderSources(diagramPath) : null);

  let hasLinks = $derived((mod?.links?.length ?? 0) > 0);

  const loc = $derived(localeFromPage(page));
  // Status + label vocabulary is shared between /iss and /tiangong; the
  // existing iss_* Paraglide keys are reused as the station vocabulary.
  // A follow-up rename to station_* is tracked under PRD-011 cleanup.
  let statusLabel = $derived(
    !mod ? '' : mod.status === 'ACTIVE' ? m.iss_status_active() : m.iss_status_retired(),
  );
</script>

<!-- grabFocus={false}: keep focus on the triggering module-list row so
     arrow-key list nav works immediately after the first click. -->
<Panel {open} {onClose} grabFocus={false} title={mod?.name ?? mod?.id ?? ''}>
  {#snippet eyebrow()}
    {#if mod}
      <AgencyRow agency={mod.agency}>
        <span
          class="status"
          class:status-active={mod.status === 'ACTIVE'}
          class:status-retired={mod.status === 'RETIRED'}>{statusLabel}</span
        >
      </AgencyRow>
    {/if}
  {/snippet}
  {#snippet heading()}
    {#if mod}
      <h1 class="name">{mod.name}</h1>
    {/if}
  {/snippet}

  {#if mod}
    {#if gallery.length > 0}
      <PanelHeroImage src={gallery[0]} name={mod.name} onOpen={() => (lightboxSrc = gallery[0]!)} />
    {/if}

    <PanelTabRow
      idPrefix="station"
      tabs={[
        { id: 'overview', label: m.panel_tab_overview(), audioStage: 'station-tab-overview' },
        {
          id: 'gallery',
          label: m.panel_tab_gallery(),
          visible: gallery.length > 0,
          audioStage: 'station-tab-gallery',
        },
        {
          id: 'anatomy',
          label: m.panel_tab_anatomy(),
          visible: hasDiagram,
          audioStage: 'station-tab-anatomy',
        },
        {
          id: 'learn',
          label: m.panel_tab_learn(),
          visible: hasLinks,
          audioStage: 'station-tab-learn',
        },
      ]}
      bind:active={tab}
    />

    <div
      class="tab-content"
      role="tabpanel"
      id="station-tabpanel"
      aria-labelledby="station-tab-{tab}"
    >
      {#if tab === 'overview'}
        <p class="editorial">{mod.description}</p>
        <p class="function-block">{mod.function_detail}</p>
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.iss_label_builder()}</div>
            <div class="cell-value short">{mod.builder}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_country()}</div>
            <div class="cell-value short">{mod.builder_country}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_agency()}</div>
            <div class="cell-value short">{mod.agency}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_vehicle()}</div>
            <div class="cell-value short">{mod.launch_vehicle}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_launch()}</div>
            <div class="cell-value">{mod.launch_date}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_designation()}</div>
            <div class="cell-value short">{mod.flight_designation}</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.iss_label_mass()}<WhyPopover
                title={m.why_module_mass_title()}
                body={m.why_module_mass_body()}
                tab="space-stations"
                section="pressurized-volume"
              />
            </div>
            <div class="cell-value">{formatNumber(mod.mass_kg, loc)} kg</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.iss_label_length()}<WhyPopover
                title={m.why_module_length_title()}
                body={m.why_module_length_body()}
                tab="space-stations"
                section="node-module"
              />
            </div>
            <div class="cell-value">{formatNumber(mod.length_m, loc, 1)} m</div>
          </div>
        </div>
        {#if mod.year_first_of}
          <p class="first">{mod.year_first_of}</p>
        {/if}
        <p class="credit">{mod.credit}</p>
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <PanelGalleryGrid
            images={galleryGrid}
            gridLabel={m.panel_gallery_aria({ name: mod.name })}
            thumbLabel={mod.name}
            onOpen={(src) => (lightboxSrc = src)}
          />
          <p class="gallery-credit">{panelGalleryCredit(mod.agency)}</p>
        {/if}
      {:else if tab === 'anatomy'}
        {#if diagramPath}
          <div class="anatomy-frame">
            {#if diagramLadder}
              <img
                src={diagramLadder.src}
                srcset={diagramLadder.srcset}
                sizes="(max-width: 640px) 100vw, 640px"
                alt={m.station_anatomy_alt({ name: mod.name })}
                class="anatomy-svg"
                loading="lazy"
                decoding="async"
              />
            {:else}
              <img
                src={diagramPath}
                alt={m.station_anatomy_alt({ name: mod.name })}
                class="anatomy-svg"
                loading="lazy"
                decoding="async"
              />
            {/if}
          </div>
          <p class="anatomy-caption">
            {m.station_anatomy_caption()}
          </p>
        {/if}
      {:else if tab === 'learn'}
        {#if !hasLinks}
          <p class="empty-tab">{m.panel_no_links()}</p>
        {:else}
          <PanelLinkTiers links={mod.links} entityId={mod.id} />
        {/if}
        {#if scienceLinks.length > 0}
          <section class="related-science">
            <h3>{m.panel_related_science_heading()}</h3>
            {#each scienceLinks as r (r.tab + r.section)}
              <ScienceCard tab={r.tab as ScienceTabId} section={r.section} expanded={false} />
            {/each}
          </section>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

<PanelLightbox src={lightboxSrc} images={gallery} onClose={() => (lightboxSrc = null)} />

<style>
  /* .agency-row / .agency-badge / .status base now come from AgencyRow.svelte. */
  .status-active {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .status-retired {
    color: var(--color-text-label);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
  }
  .function-block {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--color-accent);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-size: var(--size-meta);
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.5;
  }
  .first {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 12px;
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border-left: 3px solid var(--color-accent);
    border-radius: 2px;
    margin: 0 0 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 14px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.short {
    font-size: var(--size-label);
    font-weight: 400;
    color: rgba(255, 255, 255, 0.65);
  }
  .credit {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text-label);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
    margin: 0;
  }
  .anatomy-frame {
    background: rgba(4, 8, 15, 0.85);
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-radius: 4px;
    padding: 8px;
    margin: 0 0 10px;
  }
  .anatomy-svg {
    display: block;
    width: 100%;
    height: auto;
  }
  /* The module's science cards (module `science` slugs, at most five), under the link tiers. */
  .related-science {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .related-science h3 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    /* Muted accent, distinct from INTRO accent blue / CORE blue / DEEP gold
       so the related-science cluster reads as a footer cross-link,
       not a fourth link-tier. */
    color: var(--color-text-label);
    margin: 0 0 6px;
    text-transform: uppercase;
  }
  .anatomy-caption {
    font-family: 'Crimson Pro', serif;
    font-style: italic; /* a1-keep: caption */
    font-size: var(--size-caption);
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
    margin: 0 0 12px;
  }
</style>
