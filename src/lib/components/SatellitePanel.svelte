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
  import { base } from '$app/paths';

  const loc = $derived(localeFromPage($page));

  type Tab = 'overview' | 'gallery' | 'technical' | 'library';

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
    }
  });
</script>

<Panel {open} {onClose} title={entry?.name ?? ''}>
  {#if entry}
    <div class="head">
      <div class="kind-row">
        <span class="kind">NATURAL SATELLITE · ORBITS {entry.parent_planet_name.toUpperCase()}</span
        >
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
      <button
        type="button"
        id="sat-tab-library"
        class:active={tab === 'library'}
        onclick={() => (tab = 'library')}
        role="tab"
        aria-selected={tab === 'library'}
        aria-controls="sat-tabpanel">LIBRARY</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="sat-tabpanel" aria-labelledby="sat-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{entry.description}</p>
        {#if entry.surface_composition}
          <div class="composition">
            <div class="cell-label">COMPOSITION</div>
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
          <p class="editorial empty">No gallery images sourced yet for this satellite.</p>
        {/if}
      {:else if tab === 'technical'}
        <div class="grid">
          <div>
            <div class="cell-label">RADIUS</div>
            <div class="cell-value">{formatKm(entry.radius_km, loc)}</div>
          </div>
          <div>
            <div class="cell-label">ORBIT</div>
            <div class="cell-value">{formatKm(entry.semi_major_axis_km, loc)}</div>
          </div>
          <div>
            <div class="cell-label">PERIOD</div>
            <div class="cell-value">{entry.orbital_period_days.toFixed(2)} days</div>
          </div>
          <div>
            <div class="cell-label">DISCOVERED</div>
            <div class="cell-value">{entry.discovered}</div>
          </div>
        </div>
        {#if entry.mission_visits.length > 0}
          <div class="mission-block">
            <div class="cell-label">VISITED BY</div>
            <ul class="mission-list">
              {#each entry.mission_visits as mission}
                <li>{mission}</li>
              {/each}
            </ul>
          </div>
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
          <p class="editorial empty">No library entries yet for this satellite.</p>
        {/if}
      {/if}
    </div>
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
  .mission-block {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
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
</style>
