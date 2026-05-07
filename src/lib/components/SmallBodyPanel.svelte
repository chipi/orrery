<script lang="ts">
  import { page } from '$app/stores';
  import Panel from './Panel.svelte';
  import { getSmallBodyGallery } from '$lib/data';
  import { formatKm } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import ImageCredit from './ImageCredit.svelte';

  // Mirrors the SmallBody type used in /explore. Kept inline because
  // the data file is the only consumer outside this component.
  type SmallBody = {
    id: string;
    name: string;
    type: 'dwarf' | 'comet' | 'interstellar';
    a: number;
    e: number;
    T: number;
    L0: number;
    incl: number;
    color: string;
    radius_km?: number;
    discovered?: string;
    mission_visited?: string | null;
    next_perihelion?: string;
    description?: string;
    wiki?: string;
    note?: string;
  };

  type Tab = 'overview' | 'technical' | 'gallery' | 'learn';

  type Props = {
    body: SmallBody | null;
    open: boolean;
    onClose: () => void;
  };
  let { body, open, onClose }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);

  let lastId = $state<string | null>(null);
  $effect(() => {
    if (body && body.id !== lastId) {
      tab = 'overview';
      lastId = body.id;
      lightboxSrc = null;
      gallery = [];
      void getSmallBodyGallery(body.id).then((urls) => {
        if (body && body.id === lastId) gallery = urls;
      });
    }
  });

  // Period in years (T is days in the data file).
  let periodYears = $derived(body ? body.T / 365.25 : 0);
  // Apsides — perihelion and aphelion distances in AU. For interstellar
  // hyperbolic trajectories, perihelion = |a|(e²-1)/(1+e); no aphelion.
  let perihelion = $derived(
    body
      ? body.type === 'interstellar'
        ? Math.abs(body.a) * (body.e + 1)
        : body.a * (1 - body.e)
      : 0,
  );
  let aphelion = $derived(body ? body.a * (1 + body.e) : 0);

  let typeLabel = $derived(
    !body
      ? ''
      : body.type === 'dwarf'
        ? m.sbp_kind_dwarf()
        : body.type === 'comet'
          ? m.sbp_kind_comet()
          : m.sbp_kind_interstellar(),
  );
</script>

<Panel {open} {onClose} title={body?.name ?? ''}>
  {#if body}
    <div class="head" style:--accent={body.color}>
      <div class="kind-row">
        <span class="kind">{typeLabel}</span>
      </div>
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (lightboxSrc = gallery[0]!)}
          aria-label={m.panel_hero_aria({ name: body.name })}
        >
          <img src={gallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="sbp-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="sbp-tabpanel">{m.panel_tab_overview()}</button
      >
      <button
        type="button"
        id="sbp-tab-technical"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}
        aria-controls="sbp-tabpanel">{m.panel_tab_technical()}</button
      >
      {#if gallery.length > 0}
        <button
          type="button"
          id="sbp-tab-gallery"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}
          aria-controls="sbp-tabpanel">{m.panel_tab_gallery()}</button
        >
      {/if}
      {#if body.wiki || body.mission_visited}
        <button
          type="button"
          id="sbp-tab-learn"
          class:active={tab === 'learn'}
          onclick={() => (tab = 'learn')}
          role="tab"
          aria-selected={tab === 'learn'}
          aria-controls="sbp-tabpanel">{m.panel_tab_learn()}</button
        >
      {/if}
    </div>

    <div class="tab-content" role="tabpanel" id="sbp-tabpanel" aria-labelledby="sbp-tab-{tab}">
      {#if tab === 'overview'}
        {#if body.description}
          <p class="editorial">{body.description}</p>
        {:else}
          <p class="editorial empty">{m.sbp_empty_description()}</p>
        {/if}
        {#if body.note}
          <p class="note">{body.note}</p>
        {/if}
      {:else if tab === 'technical'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.panel_label_semi_major_axis()}</div>
            <div class="cell-value">{body.a.toFixed(3)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_eccentricity()}</div>
            <div class="cell-value">e = {body.e.toFixed(4)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_inclination()}</div>
            <div class="cell-value teal">{body.incl.toFixed(2)}°</div>
          </div>
          {#if body.type !== 'interstellar'}
            <div class="cell">
              <div class="cell-label">{m.panel_label_orbital_period()}</div>
              <div class="cell-value">
                {m.sbp_years({
                  value:
                    periodYears < 100 ? periodYears.toFixed(2) : String(Math.round(periodYears)),
                })}
              </div>
            </div>
          {/if}
          <div class="cell">
            <div class="cell-label">{m.panel_label_perihelion()}</div>
            <div class="cell-value">{perihelion.toFixed(3)} AU</div>
          </div>
          {#if body.type !== 'interstellar'}
            <div class="cell">
              <div class="cell-label">{m.panel_label_aphelion()}</div>
              <div class="cell-value">{aphelion.toFixed(3)} AU</div>
            </div>
          {/if}
          {#if body.radius_km}
            <div class="cell">
              <div class="cell-label">{m.sbp_label_radius()}</div>
              <div class="cell-value">
                {formatKm(body.radius_km, localeFromPage($page))}
              </div>
            </div>
          {/if}
          {#if body.discovered}
            <div class="cell">
              <div class="cell-label">{m.sbp_label_discovered()}</div>
              <div class="cell-value">{body.discovered}</div>
            </div>
          {/if}
        </div>
        {#if body.next_perihelion}
          <div class="dist-row">
            <span>{m.sbp_next_perihelion_prefix()} <strong>{body.next_perihelion}</strong></span>
          </div>
        {/if}
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <div class="gallery-grid" aria-label={m.panel_gallery_aria({ name: body.name })}>
            {#each galleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label={body.name}
              >
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      {:else if tab === 'learn'}
        <ul class="learn-list">
          {#if body.mission_visited}
            <li class="learn-mission">
              <div class="learn-key">{m.sbp_visited_by()}</div>
              <div class="learn-val">{body.mission_visited}</div>
            </li>
          {/if}
          {#if body.wiki}
            <li>
              <a href={body.wiki} target="_blank" rel="noopener noreferrer">
                {m.sbp_wikipedia_link({ name: body.name })}
              </a>
            </li>
          {/if}
        </ul>
      {/if}
    </div>

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
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .kind-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kind {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: var(--accent, rgba(255, 255, 255, 0.6));
  }
  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 14px;
  }
  .tabs button {
    background: transparent;
    border: 0;
    border-bottom: 2px solid transparent;
    color: rgba(255, 255, 255, 0.45);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    padding: 8px 12px;
    cursor: pointer;
  }
  .tabs button.active {
    color: #fff;
    border-bottom-color: #4466ff;
  }
  .tabs button:hover:not(.active),
  .tabs button:focus-visible {
    color: rgba(255, 255, 255, 0.8);
    outline: none;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
  }
  .editorial.empty {
    color: rgba(255, 255, 255, 0.4);
  }
  .note {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.8);
    margin-top: 12px;
    padding: 8px 10px;
    border-left: 2px solid rgba(255, 200, 80, 0.5);
    background: rgba(255, 200, 80, 0.06);
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 2px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.92);
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
  .dist-row {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }
  .learn-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .learn-list a {
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    padding: 8px 10px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 3px;
    display: block;
  }
  .learn-list a:hover,
  .learn-list a:focus-visible {
    background: rgba(78, 205, 196, 0.14);
    border-color: rgba(78, 205, 196, 0.5);
    outline: none;
  }
  .learn-mission {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 3px;
  }
  .learn-key {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 4px;
  }
  .learn-val {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.9);
  }

  /* .panel-hero, .gallery-grid, .lightbox → src/lib/styles/panel-tabs.css */
</style>
