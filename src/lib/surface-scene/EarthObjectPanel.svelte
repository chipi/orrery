<script lang="ts">
  /**
   * Reusable EarthObject detail panel — overview / gallery / learn
   * tabs, with hero image, mission cross-link, and lightbox. Pulled out
   * of EarthOrbitalScene (#290 Slice 6b) so SurfaceScene can mount the
   * same UI when an EarthObject is selected on the unified /earth
   * route. EarthOrbitalScene keeps using this component during the
   * Slice 7 transition; once Slice 7 ships, EarthOrbitalScene goes
   * away and SurfaceScene becomes the sole consumer.
   *
   * The component owns all panel-local state (tab, gallery, lightbox)
   * so callers only feed in the EarthObject and the open/close flag.
   * Gallery fetch + reset-on-selection-change is handled internally
   * via $effect — same behaviour as the original EarthOrbitalScene
   * implementation.
   */
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import Panel from '$lib/components/Panel.svelte';
  import PanelTabRow from '$lib/components/PanelTabRow.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import LearnLink from '$lib/components/LearnLink.svelte';
  import ImageCredit from '$lib/components/ImageCredit.svelte';
  import { getEarthObjectGallery } from '$lib/data';
  import { panelGalleryCredit } from '$lib/image-credits';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import type { EarthObject } from '$types/earth-object';

  interface Props {
    selected: EarthObject | null;
    open: boolean;
    onClose: () => void;
    /** Mission ids that exist in the mission index — drives the "FULL
     *  MISSION CARD →" cross-link visibility. */
    missionIds: Set<string>;
  }
  let { selected, open, onClose, missionIds }: Props = $props();

  type PanelTab = 'overview' | 'gallery' | 'learn';
  let panelTab: PanelTab = $state('overview');
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  let lastSelectedId = $state<string | null>(null);

  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      panelLightbox = null;
      panelGallery = [];
      lastSelectedId = selected.id;
      // Earth-object ids often match a mission id (e.g. "lro",
      // "hubble", "jwst", "chandrayaan1") so getEarthObjectGallery's
      // built-in mission-gallery fallback is enough.
      void getEarthObjectGallery(selected.id).then((urls: string[]) => {
        if (selected && selected.id === lastSelectedId) panelGallery = urls;
      });
    }
  });

  type PanelLinks = NonNullable<EarthObject['links']>;
  let panelLinksByTier = $derived.by(() => {
    const links = selected?.links;
    if (!links) return { intro: [] as PanelLinks, core: [] as PanelLinks, deep: [] as PanelLinks };
    const out = {
      intro: [] as PanelLinks,
      core: [] as PanelLinks,
      deep: [] as PanelLinks,
    };
    for (const link of links) out[link.t].push(link);
    return out;
  });
  // The `as EarthObject | null` cast guards against a Svelte 5 flow-
  // analysis quirk where `selected` is narrowed to `never` after the
  // earlier $derived.by reads it inside another closure. The cast
  // restores the union type for length-checking.
  let panelHasLinks = $derived.by(() => {
    const sel = selected as EarthObject | null;
    return sel != null && sel.links.length > 0;
  });
</script>

<Panel {open} title={selected?.name ?? selected?.short ?? selected?.id ?? ''} {onClose}>
  {#if selected}
    <div class="head">
      <div class="agency-row">
        <span class="agency-badge" style:background-color={selected.color}>
          {selected.agencies.join(' · ')}
        </span>
        <span class="status status-{selected.status.toLowerCase()}">{selected.status}</span>
      </div>
      <h1 class="name">{selected.name ?? selected.id}</h1>
    </div>

    {#if panelGallery.length > 0}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (panelLightbox = panelGallery[0]!)}
          aria-label={m.panel_hero_aria({ name: selected.name ?? selected.id })}
        >
          <img src={panelGallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <PanelTabRow
      tabs={[
        { id: 'overview', label: m.panel_tab_overview() },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: panelGallery.length > 0 },
        { id: 'learn', label: m.panel_tab_learn(), visible: panelHasLinks },
      ]}
      bind:active={panelTab}
    />

    {#if panelTab === 'overview'}
      <div class="grid">
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_alt()}<WhyPopover
              title={m.why_earth_altitude_title()}
              body={m.why_earth_altitude_body()}
              tab="orbits"
              section="orbit-regimes"
            />
          </div>
          <div class="cell-value">
            {m.earth_alt_km({
              value: formatNumber(
                selected.altitude_km ?? selected.earth_distance_km,
                localeFromPage($page),
              ),
            })}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_period()}<WhyPopover
              title={m.why_earth_period_title()}
              body={m.why_earth_period_body()}
              tab="orbits"
              section="keplers-laws"
            />
          </div>
          <div class="cell-value">
            {selected.period_min
              ? m.earth_period_min({ value: selected.period_min.toFixed(0) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_inclination()}<WhyPopover
              title={m.why_earth_inclination_title()}
              body={m.why_earth_inclination_body()}
              tab="orbits"
              section="inclination"
            />
          </div>
          <div class="cell-value">
            {selected.inclination !== undefined
              ? m.earth_inclination_deg({ value: selected.inclination.toFixed(1) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_launched()}</div>
          <div class="cell-value">{selected.launched}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_count()}</div>
          <div class="cell-value">{selected.count}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_crew()}</div>
          <div class="cell-value">{selected.crew}</div>
        </div>
      </div>

      {#if selected.scale_fact}
        <div class="scale-fact" style:--accent={selected.color}>
          {selected.scale_fact}
        </div>
      {/if}

      {#if selected.description}
        <p class="editorial">{selected.description}</p>
      {/if}

      {#if missionIds.has(selected.id)}
        <a
          class="mission-link"
          href="{base}/missions?id={selected.id}"
          data-testid="mission-card-link"
        >
          FULL MISSION CARD →
        </a>
      {/if}

      <!--
        Related orbital concepts — five PRD-024 cross-link chips covering
        the Earth-orbital topics not already linked from the cell rows
        (orbit-regimes, keplers-laws, inclination are pinned above).
        Each row is a label + tiny info chip; the label is the click
        target (anchor wraps the text). Issue #303 close-out.
      -->
      <ul class="related-orbital-concepts">
        <li>
          <a href="{base}/science/orbits/cislunar-orbits">{m.chip_label_cislunar_orbits()}</a
          ><ScienceChip
            tab="orbits"
            section="cislunar-orbits"
            label={m.chip_label_cislunar_orbits()}
          />
        </li>
        <li>
          <a href="{base}/science/orbits/sun-synchronous">{m.chip_label_sun_synchronous()}</a
          ><ScienceChip
            tab="orbits"
            section="sun-synchronous"
            label={m.chip_label_sun_synchronous()}
          />
        </li>
        <li>
          <a href="{base}/science/orbits/special-orbits">{m.chip_label_special_orbits()}</a
          ><ScienceChip
            tab="orbits"
            section="special-orbits"
            label={m.chip_label_special_orbits()}
          />
        </li>
        <li>
          <a href="{base}/science/orbits/space-debris">{m.chip_label_space_debris()}</a><ScienceChip
            tab="orbits"
            section="space-debris"
            label={m.chip_label_space_debris()}
          />
        </li>
        <li>
          <a href="{base}/science/orbits/disposal-end-of-life"
            >{m.chip_label_disposal_end_of_life()}</a
          ><ScienceChip
            tab="orbits"
            section="disposal-end-of-life"
            label={m.chip_label_disposal_end_of_life()}
          />
        </li>
      </ul>

      {#if selected.credit}
        <div class="credit">{selected.credit}</div>
      {/if}
    {:else if panelTab === 'gallery'}
      {#if panelGallery.length === 0}
        <p class="empty-tab">{m.panel_gallery_empty()}</p>
      {:else}
        <div
          class="gallery-grid"
          aria-label={m.panel_gallery_aria({ name: selected.name ?? selected.id })}
        >
          {#each panelGalleryGrid as src (src)}
            <button
              type="button"
              class="gallery-thumb"
              onclick={() => (panelLightbox = src)}
              aria-label={selected.name ?? selected.id}
            >
              <img {src} alt="" loading="lazy" decoding="async" />
            </button>
          {/each}
        </div>
        <p class="gallery-credit">
          {panelGalleryCredit(selected.agencies?.join(' / '))}
        </p>
      {/if}
    {:else if panelTab === 'learn'}
      {#if !panelHasLinks}
        <p class="empty-tab">{m.panel_no_links()}</p>
      {:else}
        {#if panelLinksByTier.intro.length > 0}
          <section class="link-tier tier-intro">
            <h3>{m.panel_links_intro()}</h3>
            <ul>
              {#each panelLinksByTier.intro as link (link.u)}
                <li>
                  <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                </li>
              {/each}
            </ul>
          </section>
        {/if}
        {#if panelLinksByTier.core.length > 0}
          <section class="link-tier tier-core">
            <h3>{m.panel_links_core()}</h3>
            <ul>
              {#each panelLinksByTier.core as link (link.u)}
                <li>
                  <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                </li>
              {/each}
            </ul>
          </section>
        {/if}
        {#if panelLinksByTier.deep.length > 0}
          <section class="link-tier tier-deep">
            <h3>{m.panel_links_deep()}</h3>
            <ul>
              {#each panelLinksByTier.deep as link (link.u)}
                <li>
                  <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/if}
    {/if}
  {/if}
</Panel>

{#if panelLightbox}
  <button
    type="button"
    class="lightbox"
    aria-label={m.panel_lightbox_close()}
    onclick={() => (panelLightbox = null)}
  >
    <img src={panelLightbox} alt="" loading="lazy" decoding="async" />
    <span class="lightbox-close" aria-hidden="true">×</span>
  </button>
  <div class="lightbox-meta">
    <ImageCredit src={panelLightbox} />
  </div>
{/if}

<style>
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
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
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
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
  .scale-fact {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--accent, #4466ff);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
  }
  .mission-link {
    align-self: flex-start;
    display: inline-block;
    margin: 4px 0 10px;
    padding: 8px 12px;
    background: rgba(68, 102, 255, 0.18);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    background: rgba(68, 102, 255, 0.32);
    border-color: #4466ff;
    outline: none;
  }
  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }
  .related-orbital-concepts {
    list-style: none;
    margin: 12px 0 0;
    padding: 8px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
  }
  .related-orbital-concepts li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .related-orbital-concepts a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    line-height: 1.4;
  }
  .related-orbital-concepts a:hover,
  .related-orbital-concepts a:focus-visible {
    color: rgba(120, 220, 200, 0.95);
    outline: none;
  }
  /* Detail-panel tabs / gallery / learn / lightbox CSS in src/lib/styles/panel-tabs.css (v0.1.10) */
</style>
