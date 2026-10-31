<script lang="ts">
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import PanelLinkTiers from './PanelLinkTiers.svelte';
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import Panel from './Panel.svelte';
  import { getSunGallery } from '$lib/data';
  import { linkifyMission, loadMissionIndex } from '$lib/missions-linkify';
  import type { LocalizedSun } from '$types/sun';
  import * as m from '$lib/paraglide/messages';
  import ScienceCard from './ScienceCard.svelte';
  import WhyPopover from './WhyPopover.svelte';
  import type { ScienceTabId } from '$types/science';
  import { dataLoadFailed } from '$lib/data/core';

  // LEARN folds into SCIENCE — Phase 4 cleanup, less crowded tab strip.
  // 2026-06-21 — SCIENCE tab removed. Chips → overview bottom;
  // library tiers → technical bottom. Same B2 pattern as PlanetPanel /
  // SmallBodyPanel.
  type Tab = 'overview' | 'gallery' | 'technical' | 'missions';

  /** /science cross-sections relevant to the Sun: it's the central focus of
   * every heliocentric orbit, so vis-viva and Kepler's laws sit on it. */
  const SUN_SCIENCE_SECTIONS: { tab: ScienceTabId; section: string; why?: string }[] = [
    { tab: 'orbits', section: 'keplerian-orbit' },
    { tab: 'orbits', section: 'vis-viva' },
    { tab: 'orbits', section: 'keplers-laws' },
    { tab: 'scales-time', section: 'au' },
    { tab: 'scales-time', section: 'ecliptic-plane' },
    { tab: 'scales-time', section: 'frames' },
  ];

  type Props = {
    sun: LocalizedSun | null;
    open: boolean;
    onClose: () => void;
  };
  let { sun, open, onClose }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let galleryLoaded = $state(false);
  let lightboxSrc = $state<string | null>(null);

  // Load gallery on first open. Sun is a singleton, so this fires once.
  // Guard with `galleryLoaded` so the empty-result case doesn't re-fire
  // the effect (assigning gallery=[] would re-trigger the read on
  // gallery.length and cause an infinite loop).
  $effect(() => {
    if (sun && !galleryLoaded) {
      galleryLoaded = true;
      void getSunGallery()
        .then((urls) => {
          gallery = urls;
        })
        .catch(dataLoadFailed);
      // Warm the /missions + /fleet index for the MISSIONS tab linkifier.
      void loadMissionIndex();
    }
  });

  // Derived presentation values (no source of truth lives here).
  let solarMassesEarth = $derived(sun ? sun.mass_kg / 5.972e24 : 0);
  let radiusEarth = $derived(sun ? sun.radius_km / 6371 : 0);
  let luminositySolar = $derived(sun ? sun.luminosity_w / 3.828e26 : 0);
  let remainingGyr = $derived(sun ? Math.max(0, 10 - sun.age_gyr) : 0);

  let hasLinks = $derived((sun?.links?.length ?? 0) > 0);
</script>

<Panel {open} {onClose} title={sun?.name ?? ''}>
  {#if sun}
    <div class="head">
      <div class="type">{sun.type.toUpperCase()}</div>
      <div class="name">{sun.name}</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">{m.sun_label_spectral_class()}</div>
          <div class="stat-value">{sun.spectral_class}</div>
        </div>
        <div class="stat">
          <div class="stat-label">{m.sun_label_system_mass()}</div>
          <div class="stat-value">{sun.mass_fraction_pct.toFixed(2)}%</div>
        </div>
      </div>
    </div>

    {#if gallery.length > 0}
      <PanelHeroImage src={gallery[0]} name={sun.name} onOpen={() => (lightboxSrc = gallery[0]!)} />
    {/if}

    <PanelTabRow
      rowClass="tabs sun-tabs"
      idPrefix="sp"
      tabs={[
        { id: 'overview', label: m.panel_tab_overview() },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: gallery.length > 0 },
        { id: 'technical', label: m.panel_tab_technical() },
        {
          id: 'missions',
          label: m.panel_tab_missions(),
          visible: (sun.mission_visits ?? []).length > 0,
        },
      ]}
      bind:active={tab}
    />

    <div class="tab-content" role="tabpanel" id="sp-tabpanel" aria-labelledby="sp-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{sun.fact}</p>
        <p class="editorial">{sun.bio}</p>
        {#if (sun.science_sections ?? SUN_SCIENCE_SECTIONS).length > 0}
          <div class="science-section">
            <h3 class="library-heading">{m.panel_tab_science()}</h3>
            {#each sun.science_sections ?? SUN_SCIENCE_SECTIONS as entry (entry.tab + entry.section)}
              <ScienceCard
                tab={entry.tab as ScienceTabId}
                section={entry.section}
                why={entry.why}
              />
            {/each}
          </div>
        {/if}
      {:else if tab === 'technical'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.sun_label_radius()}</div>
            <div class="cell-value">{(sun.radius_km / 1000).toFixed(0)},700 km</div>
            <div class="cell-sub">{m.sun_radius_earth({ value: radiusEarth.toFixed(0) })}</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.sun_label_mass()}<WhyPopover
                title={m.why_solar_mass_title()}
                body={m.why_solar_mass_body()}
                tab="orbits"
                section="keplers-laws"
              />
            </div>
            <div class="cell-value">2 × 10³⁰ kg</div>
            <div class="cell-sub">
              {m.sun_mass_earth({ value: solarMassesEarth.toExponential(2) })}
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_surface_temp()}</div>
            <div class="cell-value gold">{sun.surface_temp_k.toFixed(0)} K</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_core_temp()}</div>
            <div class="cell-value gold">{(sun.core_temp_k / 1e6).toFixed(1)} M K</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_luminosity()}</div>
            <div class="cell-value">{luminositySolar.toFixed(2)} L☉</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_age()}</div>
            <div class="cell-value">{sun.age_gyr.toFixed(1)} Gyr</div>
            <div class="cell-sub">{m.sun_age_remaining({ value: remainingGyr.toFixed(1) })}</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_axial_tilt()}<WhyPopover
                title={m.why_axial_tilt_title()}
                body={m.why_axial_tilt_body()}
                tab="orbits"
                section="inclination"
              />
            </div>
            <div class="cell-value">{sun.axial_tilt.toFixed(2)}°</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_rotation()}</div>
            <div class="cell-value">{sun.equatorial_rot_days.toFixed(1)} d</div>
            <div class="cell-sub">
              {m.sun_rot_diff({ value: sun.polar_rot_days.toFixed(1) })}
            </div>
          </div>
        </div>

        <div class="src">{m.sun_source_nasa({ mag: sun.absolute_magnitude.toString() })}</div>
        {#if hasLinks}
          <div class="science-library">
            <h3 class="library-heading">{m.panel_tab_learn()}</h3>
            <PanelLinkTiers links={sun.links} entityId="sun" />
          </div>
        {/if}
      {:else if tab === 'missions'}
        {#if (sun.mission_visits ?? []).length === 0}
          <p class="empty-tab">{m.panel_sun_no_observatory()}</p>
        {:else}
          <ul class="mission-list">
            {#each sun.mission_visits ?? [] as visit (visit)}
              {@const link = linkifyMission(visit)}
              <li>
                {#if link}
                  <a href={link.href} class="mission-link">{link.label}</a><span>{link.rest}</span>
                {:else}
                  {visit}
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <PanelGalleryGrid
            images={galleryGrid}
            gridLabel={m.panel_gallery_aria({ name: sun.name })}
            thumbLabel={sun.name}
            onOpen={(src) => (lightboxSrc = src)}
            gridClass="sun-gallery"
          />
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      {/if}
    </div>
    <PanelLightbox src={lightboxSrc} onClose={() => (lightboxSrc = null)} />
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .type {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 8px;
    letter-spacing: 3px;
    color: rgba(255, 220, 100, 0.5);
    margin-bottom: 4px;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-top: 12px;
  }
  .stat {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .stat-label,
  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .stat-value,
  .cell-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.gold {
    color: #ffc850;
  }
  .cell-sub {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 7px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 2px;
  }

  /* .tabs base styles in src/lib/styles/panel-tabs.css.
   * Sun overrides the active-tab border to its theme gold (#ffc850). */
  :global(.tabs.sun-tabs button.active) {
    border-bottom-color: #ffc850;
  }

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 12px 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 12px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .src {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 7px;
    color: rgba(255, 255, 255, 0.15);
    line-height: 1.8;
  }

  /* GALLERY + LEARN tab CSS in src/lib/styles/panel-tabs.css.
   * Sun overrides the gallery-thumb hover border to gold to match
   * its theme. */
  :global(.sun-gallery .gallery-thumb:hover),
  :global(.sun-gallery .gallery-thumb:focus-visible) {
    border-color: rgba(255, 200, 80, 0.6);
  }
</style>
