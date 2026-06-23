<script lang="ts">
  import Panel from './Panel.svelte';
  import AgencyRow from './AgencyRow.svelte';
  import { base } from '$app/paths';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import { page } from '$app/stores';
  import type { StationModule } from '$types/station';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import ImageCredit from './ImageCredit.svelte';
  import LearnLink from './LearnLink.svelte';
  import WhyPopover from './WhyPopover.svelte';
  import { spacecraftDiagramPath } from '$lib/spacecraft-diagrams';

  type StationLinks = NonNullable<StationModule['links']>;
  type Tab = 'overview' | 'gallery' | 'anatomy' | 'learn';

  type Props = {
    module: StationModule | null;
    open: boolean;
    onClose: () => void;
    galleryFetcher: (id: string) => Promise<string[]>;
  };
  let { module: mod, open, onClose, galleryFetcher }: Props = $props();

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
      void galleryFetcher(mod.id).then((urls) => {
        if (mod && mod.id === lastId) gallery = urls;
      });
    }
  });

  let diagramPath = $derived(mod ? spacecraftDiagramPath(mod.id) : null);
  let hasDiagram = $derived(diagramPath !== null);

  let linksByTier = $derived.by(() => {
    if (!mod?.links)
      return { intro: [] as StationLinks, core: [] as StationLinks, deep: [] as StationLinks };
    const out = { intro: [] as StationLinks, core: [] as StationLinks, deep: [] as StationLinks };
    for (const link of mod.links) out[link.t].push(link);
    return out;
  });
  let hasLinks = $derived((mod?.links?.length ?? 0) > 0);

  const loc = $derived(localeFromPage($page));
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
  {#if mod}
    <div class="head">
      <AgencyRow agency={mod.agency}>
        <span
          class="status"
          class:status-active={mod.status === 'ACTIVE'}
          class:status-retired={mod.status === 'RETIRED'}>{statusLabel}</span
        >
      </AgencyRow>
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
        id="station-tab-overview"
        data-audio-stage="station-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="station-tabpanel">{m.panel_tab_overview()}</button
      >
      {#if gallery.length > 0}
        <button
          type="button"
          id="station-tab-gallery"
          data-audio-stage="station-tab-gallery"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}
          aria-controls="station-tabpanel">{m.panel_tab_gallery()}</button
        >
      {/if}
      {#if hasDiagram}
        <button
          type="button"
          id="station-tab-anatomy"
          data-audio-stage="station-tab-anatomy"
          class:active={tab === 'anatomy'}
          onclick={() => (tab = 'anatomy')}
          role="tab"
          aria-selected={tab === 'anatomy'}
          aria-controls="station-tabpanel">ANATOMY</button
        >
      {/if}
      {#if hasLinks}
        <button
          type="button"
          id="station-tab-learn"
          data-audio-stage="station-tab-learn"
          class:active={tab === 'learn'}
          onclick={() => (tab = 'learn')}
          role="tab"
          aria-selected={tab === 'learn'}
          aria-controls="station-tabpanel">{m.panel_tab_learn()}</button
        >
      {/if}
    </div>

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
          <div class="gallery-grid" aria-label={m.panel_gallery_aria({ name: mod.name })}>
            {#each galleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label={mod.name}
              >
                <img {src} alt="" loading="lazy" decoding="async" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{panelGalleryCredit(mod.agency)}</p>
        {/if}
      {:else if tab === 'anatomy'}
        {#if diagramPath}
          <div class="anatomy-frame">
            <img
              src={diagramPath}
              alt="{mod.name} anatomy diagram"
              class="anatomy-svg"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p class="anatomy-caption">
            Hand-drawn schematic showing the spacecraft's named subsystems. Not to scale —
            proportions adjusted for label legibility.
          </p>
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
                    <LearnLink entityId={mod.id} url={link.u} label={link.l} />
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
                    <LearnLink entityId={mod.id} url={link.u} label={link.l} />
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
                    <LearnLink entityId={mod.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
        <!--
          Related crew + life-support topics — issue #303 close-out.
          Module-agnostic cross-link cluster covering the seven
          life-in-space + 2 space-stations articles that lacked a
          natural anchor elsewhere. Always rendered; complements the
          tier-driven external-link rails above.
        -->
        <section class="related-science">
          <h3>{m.panel_related_science_heading()}</h3>
          <ul>
            <li>
              <a href="{base}/science/space-stations/pressurized-volume"
                >{m.chip_label_pressurized_volume()}</a
              >
            </li>
            <li>
              <a href="{base}/science/space-stations/node-module">{m.chip_label_node_module()}</a>
            </li>
            <li>
              <a href="{base}/science/life-in-space/crewed-station-design"
                >{m.chip_label_crewed_station_design()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/eclss-life-support"
                >{m.chip_label_eclss_life_support()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/crew-selection"
                >{m.chip_label_crew_selection()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/pre-flight-training"
                >{m.chip_label_pre_flight_training()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/crew-dynamics-psychology"
                >{m.chip_label_crew_dynamics_psychology()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/sleep-nutrition-circadian"
                >{m.chip_label_sleep_nutrition_circadian()}</a
              >
            </li>
            <li>
              <a href="{base}/science/life-in-space/suit-lineage">{m.chip_label_suit_lineage()}</a>
            </li>
          </ul>
        </section>
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
    <img src={lightboxSrc} alt="" loading="lazy" decoding="async" />
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
  /* .agency-row / .agency-badge / .status base now come from AgencyRow.svelte. */
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
  .anatomy-frame {
    background: rgba(4, 8, 15, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.18);
    border-radius: 4px;
    padding: 8px;
    margin: 0 0 10px;
  }
  .anatomy-svg {
    display: block;
    width: 100%;
    height: auto;
  }
  /* Related-science cross-link cluster (life-in-space + space-stations
     articles, always-on under the link tiers). The bare <h3> + <ul>
     + <a> renders with browser defaults — huge dark heading, oversize
     blue underlined links — which clashes with the rest of the panel.
     Style it to match the .link-tier visual language: small Space
     Mono header, padded chip-style anchors. */
  .related-science {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .related-science h3 {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    /* Muted accent, distinct from INTRO teal / CORE blue / DEEP gold
       so the related-science cluster reads as a footer cross-link,
       not a fourth link-tier. */
    color: rgba(255, 255, 255, 0.45);
    margin: 0 0 6px;
    text-transform: uppercase;
  }
  .related-science ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .related-science li {
    margin: 0;
  }
  .related-science a {
    display: block;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.75);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    text-decoration: none;
    line-height: 1.5;
    min-height: 44px;
    transition: all 0.15s;
  }
  .related-science a:hover,
  .related-science a:focus-visible {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    outline: none;
  }
  .anatomy-caption {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
    margin: 0 0 12px;
  }
</style>
