<script lang="ts">
  import Panel from './Panel.svelte';
  import { getIssModuleGallery } from '$lib/data';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import { page } from '$app/stores';
  import type { IssModule } from '$types/iss-module';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import ImageCredit from './ImageCredit.svelte';

  type IssLinks = NonNullable<IssModule['links']>;
  type Tab = 'overview' | 'gallery' | 'learn';

  type Props = {
    module: IssModule | null;
    open: boolean;
    onClose: () => void;
  };
  let { module: mod, open, onClose }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);

  let lastId = $state<string | null>(null);
  $effect(() => {
    if (mod && mod.id !== lastId) {
      tab = 'overview';
      lastId = mod.id;
      lightboxSrc = null;
      gallery = [];
      void getIssModuleGallery(mod.id).then((urls) => {
        if (mod && mod.id === lastId) gallery = urls;
      });
    }
  });

  let linksByTier = $derived.by(() => {
    if (!mod?.links) return { intro: [] as IssLinks, core: [] as IssLinks, deep: [] as IssLinks };
    const out = { intro: [] as IssLinks, core: [] as IssLinks, deep: [] as IssLinks };
    for (const link of mod.links) out[link.t].push(link);
    return out;
  });
  let hasLinks = $derived((mod?.links?.length ?? 0) > 0);

  const loc = $derived(localeFromPage($page));
  let statusLabel = $derived(
    !mod ? '' : mod.status === 'ACTIVE' ? m.iss_status_active() : m.iss_status_retired(),
  );
</script>

<Panel {open} {onClose} title={mod?.name ?? mod?.id ?? ''}>
  {#if mod}
    <div class="head">
      <div class="agency-row">
        <span class="agency-badge">{mod.agency}</span>
        <span
          class="status"
          class:status-active={mod.status === 'ACTIVE'}
          class:status-retired={mod.status === 'RETIRED'}>{statusLabel}</span
        >
      </div>
      <h1 class="name">{mod.name}</h1>
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (lightboxSrc = gallery[0]!)}
          aria-label={m.panel_hero_aria({ name: mod.name })}
        >
          <img src={gallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="iss-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="iss-tabpanel">{m.panel_tab_overview()}</button
      >
      {#if gallery.length > 0}
        <button
          type="button"
          id="iss-tab-gallery"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}
          aria-controls="iss-tabpanel">{m.panel_tab_gallery()}</button
        >
      {/if}
      {#if hasLinks}
        <button
          type="button"
          id="iss-tab-learn"
          class:active={tab === 'learn'}
          onclick={() => (tab = 'learn')}
          role="tab"
          aria-selected={tab === 'learn'}
          aria-controls="iss-tabpanel">{m.panel_tab_learn()}</button
        >
      {/if}
    </div>

    <div class="tab-content" role="tabpanel" id="iss-tabpanel" aria-labelledby="iss-tab-{tab}">
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
            <div class="cell-label">{m.iss_label_mass()}</div>
            <div class="cell-value">{formatNumber(mod.mass_kg, loc)} kg</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.iss_label_length()}</div>
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
          <div class="gallery-grid" aria-label={m.panel_gallery_aria({ name: mod.name })}>
            {#each galleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label={mod.name}
              >
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{panelGalleryCredit(mod.agency)}</p>
        {/if}
      {:else if tab === 'learn'}
        {#if !hasLinks}
          <p class="empty-tab">{m.panel_no_links()}</p>
        {:else}
          {#if linksByTier.intro.length > 0}
            <section class="link-tier tier-intro">
              <h3>{m.panel_links_intro()}</h3>
              <ul>
                {#each linksByTier.intro as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer">{link.l} ↗</a>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if linksByTier.core.length > 0}
            <section class="link-tier tier-core">
              <h3>{m.panel_links_core()}</h3>
              <ul>
                {#each linksByTier.core as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer">{link.l} ↗</a>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if linksByTier.deep.length > 0}
            <section class="link-tier tier-deep">
              <h3>{m.panel_links_deep()}</h3>
              <ul>
                {#each linksByTier.deep as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer">{link.l} ↗</a>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

{#if lightboxSrc}
  <button
    type="button"
    class="lightbox"
    aria-label={m.panel_lightbox_close()}
    onclick={() => (lightboxSrc = null)}
  >
    <img src={lightboxSrc} alt="" />
    <span class="lightbox-close" aria-hidden="true">×</span>
  </button>
  <div class="lightbox-meta">
    <ImageCredit src={lightboxSrc} />
  </div>
{/if}

<style>
  .head {
    flex-shrink: 0;
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    color: #fff;
    background: #4466ff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-retired {
    color: rgba(255, 255, 255, 0.5);
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
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .function-block {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid #4ecdc4;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.5;
  }
  .first {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 12px;
    background: rgba(68, 102, 255, 0.08);
    border-left: 3px solid #4466ff;
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
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.short {
    font-size: 9px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.65);
  }
  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
    margin: 0;
  }
</style>
