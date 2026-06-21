<script lang="ts">
  /**
   * SatellitePanel — detail panel for natural satellites on /explore
   * (#304). Mirrors SmallBodyPanel + SunPanel typography + layout so
   * the satellite panel reads as a peer of the existing detail
   * panels. Tabs: overview / gallery / technical / library.
   *
   * Slice 1 ships the picker → panel chain with hardcoded Moon
   * content. Slice 2 extracts the data layer into satellites.json
   * and widens to all 10 currently-rendered moons. Slice 3 adds
   * Uranus + Neptune (16 total). Slice 6 wires the per-locale
   * overlay loader for translated content.
   */
  import Panel from './Panel.svelte';
  import { page } from '$app/stores';
  import { formatKm } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import {
    getSatellites,
    getSatelliteGallery,
    getSatelliteI18n,
    type SatelliteEntry,
    type SatelliteI18n,
  } from '$lib/data';
  import { linkifyMission, loadMissionIndex } from '$lib/missions-linkify';
  import { base } from '$app/paths';

  const loc = $derived(localeFromPage($page));

  type Tab = 'overview' | 'gallery' | 'technical' | 'missions' | 'library';

  type Props = {
    satelliteKey: string | null;
    open: boolean;
    onClose: () => void;
  };
  let { satelliteKey, open, onClose }: Props = $props();

  let satellites: SatelliteEntry[] = $state([]);
  let loaded = $state(false);
  $effect(() => {
    if (!loaded) {
      void getSatellites().then((sats) => {
        satellites = sats;
        loaded = true;
      });
    }
  });

  let tab: Tab = $state('overview');
  let lastKey = $state<string | null>(null);
  let gallery: string[] = $state([]);
  let overlay: SatelliteI18n | null = $state(null);
  let baseEntry = $derived<SatelliteEntry | null>(
    satelliteKey
      ? (satellites.find((s) => `${s.parent_planet_id}:${s.id}` === satelliteKey) ?? null)
      : null,
  );
  function mergeOverlay(base: SatelliteEntry, ov: SatelliteI18n | null): SatelliteEntry {
    return {
      ...base,
      description: ov?.description ?? base.description,
      surface_composition: ov?.surface_composition ?? base.surface_composition,
      mission_visits: ov?.mission_visits ?? base.mission_visits,
      library: base.library?.map((l) => ({
        ...l,
        label: ov?.library_labels?.[l.id] ?? l.label,
      })),
    };
  }
  let entry = $derived<SatelliteEntry | null>(baseEntry ? mergeOverlay(baseEntry, overlay) : null);

  $effect(() => {
    if (baseEntry && baseEntry.id !== lastKey) {
      tab = 'overview';
      lastKey = baseEntry.id;
      gallery = [];
      overlay = null;
      const id = baseEntry.id;
      void getSatelliteGallery(id).then((urls) => {
        if (baseEntry && baseEntry.id === lastKey) gallery = urls;
      });
      void getSatelliteI18n(loc, id).then((o) => {
        if (baseEntry && baseEntry.id === lastKey) overlay = o;
      });
      void loadMissionIndex();
    }
  });
</script>

<Panel {open} {onClose} title={entry?.name ?? ''}>
  {#if entry}
    <div class="head">
      <div class="kind-row">
        <span class="kind">{m.panel_satellite_kind({ planet: entry.parent_planet_name })}</span>
      </div>
      <div class="name">{entry.name}</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">{m.panel_label_orbital_period()}</div>
          <div class="stat-value">
            {m.panel_satellite_period_unit_days({ value: entry.orbital_period_days.toFixed(2) })}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">{m.panel_satellite_orbit_label()}</div>
          <div class="stat-value">{formatKm(entry.semi_major_axis_km, loc)}</div>
        </div>
      </div>
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <img src={`${base}${gallery[0]}`} alt="" fetchpriority="high" decoding="async" />
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="sat-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="sat-tabpanel">{m.panel_tab_overview()}</button
      >
      <button
        type="button"
        id="sat-tab-gallery"
        class:active={tab === 'gallery'}
        onclick={() => (tab = 'gallery')}
        role="tab"
        aria-selected={tab === 'gallery'}
        aria-controls="sat-tabpanel">{m.panel_tab_gallery()}</button
      >
      <button
        type="button"
        id="sat-tab-technical"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}
        aria-controls="sat-tabpanel">{m.panel_tab_technical()}</button
      >
      {#if (entry.mission_visits ?? []).length > 0}
        <button
          type="button"
          id="sat-tab-missions"
          class:active={tab === 'missions'}
          onclick={() => (tab = 'missions')}
          role="tab"
          aria-selected={tab === 'missions'}
          aria-controls="sat-tabpanel">MISSIONS</button
        >
      {/if}
      <button
        type="button"
        id="sat-tab-library"
        class:active={tab === 'library'}
        onclick={() => (tab = 'library')}
        role="tab"
        aria-selected={tab === 'library'}
        aria-controls="sat-tabpanel">{m.panel_tab_library()}</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="sat-tabpanel" aria-labelledby="sat-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{entry.description}</p>
        {#if entry.surface_composition}
          <div class="composition">
            <div class="cell-label">{m.panel_satellite_composition_label()}</div>
            <div class="cell-value">{entry.surface_composition}</div>
          </div>
        {/if}
      {:else if tab === 'gallery'}
        {#if gallery.length > 0}
          <ul class="gallery-grid">
            {#each gallery as src (src)}
              <li>
                <img src={`${base}${src}`} alt="" loading="lazy" decoding="async" />
              </li>
            {/each}
          </ul>
        {:else}
          <p class="editorial empty">{m.panel_satellite_gallery_empty()}</p>
        {/if}
      {:else if tab === 'technical'}
        <div class="grid">
          <div>
            <div class="cell-label">{m.panel_satellite_radius_label()}</div>
            <div class="cell-value">{formatKm(entry.radius_km, loc)}</div>
          </div>
          <div>
            <div class="cell-label">{m.panel_satellite_orbit_label()}</div>
            <div class="cell-value">{formatKm(entry.semi_major_axis_km, loc)}</div>
          </div>
          <div>
            <div class="cell-label">{m.panel_satellite_period_label()}</div>
            <div class="cell-value">
              {m.panel_satellite_period_unit_days({ value: entry.orbital_period_days.toFixed(2) })}
            </div>
          </div>
          <div>
            <div class="cell-label">{m.panel_satellite_discovered_label()}</div>
            <div class="cell-value">{entry.discovered}</div>
          </div>
        </div>
      {:else if tab === 'missions'}
        {#if (entry.mission_visits ?? []).length === 0}
          <p class="empty-tab">No spacecraft have visited this body.</p>
        {:else}
          <ul class="mission-list">
            {#each entry.mission_visits as visit (visit)}
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
      {:else if tab === 'library'}
        {#if entry.library && entry.library.length > 0}
          <ul class="learn-list">
            {#each entry.library as link (link.id)}
              <li>
                <a href={link.url} target="_blank" rel="noopener noreferrer external">
                  {link.label} ↗
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="editorial empty">{m.panel_satellite_library_empty()}</p>
        {/if}
      {/if}
    </div>
    {#if entry?.id === 'moon'}
      <div class="cta-bar">
        <a class="cta cta-secondary" href="{base}/moon">
          {m.panel_explore_surface_cta({ name: entry.name.toUpperCase() })}
        </a>
      </div>
    {/if}
  {/if}
</Panel>

<style>
  /* Identical font + colour tokens to SmallBodyPanel + SunPanel so
     the SatellitePanel reads as a peer of the existing detail
     panels rather than a one-off (#304 sub-slice C feedback,
     2026-06-04). */
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
    color: rgba(160, 200, 255, 0.85);
    text-transform: uppercase;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 12px;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .stat-value {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: var(--color-text);
  }
  .panel-hero {
    margin: 0 0 14px;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
  }
  .panel-hero img {
    display: block;
    width: 100%;
    height: auto;
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
  .composition {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.92);
    line-height: 1.45;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 16px;
  }
  .mission-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.45;
  }
  .gallery-grid {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .gallery-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    aspect-ratio: 4 / 3;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: block;
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
    border-left: 2px solid rgba(78, 205, 196, 0.5);
    display: block;
  }
  .learn-list a:hover,
  .learn-list a:focus-visible {
    background: rgba(78, 205, 196, 0.12);
    outline: none;
  }
  .cta-bar {
    padding: 12px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    margin-top: 12px;
  }
  .cta {
    width: 100%;
    min-height: 44px;
    padding: 12px;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .cta-secondary {
    background: transparent;
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #dde4ff;
    text-decoration: none;
  }
  .cta-secondary:hover,
  .cta-secondary:focus-visible {
    background: rgba(68, 102, 255, 0.15);
    border-color: #4466ff;
    color: #fff;
    outline: none;
  }
</style>
