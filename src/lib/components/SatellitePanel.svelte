<script lang="ts">
  /**
   * SatellitePanel — detail panel for natural satellites on /explore
   * (#304 Slice 1). Modelled after SmallBodyPanel; tabs: overview /
   * gallery / technical / library.
   *
   * Slice 1 ships with hardcoded Moon content + a placeholder lookup
   * so the picker → panel chain is verifiable end-to-end. Slice 2
   * extracts the data layer into `static/data/satellites.json` and
   * widens content to all 10 currently-rendered moons. Localized
   * description text + library labels land in Slice 6 via the
   * existing wave23 translation pipeline.
   */
  import Panel from './Panel.svelte';
  import { page } from '$app/stores';
  import { formatKm } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getSatellites, type SatelliteEntry } from '$lib/data';

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
  let entry = $derived<SatelliteEntry | null>(
    satelliteKey
      ? (satellites.find((s) => `${s.parent_planet_id}:${s.id}` === satelliteKey) ?? null)
      : null,
  );

  $effect(() => {
    if (entry && entry.id !== lastKey) {
      tab = 'overview';
      lastKey = entry.id;
    }
  });
</script>

<Panel {open} {onClose} title={entry?.name ?? ''}>
  {#if entry}
    <div class="head">
      <div class="parent-row">
        <span class="parent-label">orbits</span>
        <span class="parent-name">{entry.parent_planet_name}</span>
      </div>
    </div>

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
          <p class="composition">
            <span class="prop-label">Composition</span>
            <span>{entry.surface_composition}</span>
          </p>
        {/if}
      {:else if tab === 'gallery'}
        <p class="empty">Gallery images land in #304 Slice 4.</p>
      {:else if tab === 'technical'}
        <dl class="tech">
          <div>
            <dt>Radius</dt>
            <dd>{formatKm(entry.radius_km, loc)}</dd>
          </div>
          <div>
            <dt>Orbit semi-major axis</dt>
            <dd>{formatKm(entry.semi_major_axis_km, loc)}</dd>
          </div>
          <div>
            <dt>Orbital period</dt>
            <dd>{entry.orbital_period_days.toFixed(2)} days</dd>
          </div>
          <div>
            <dt>Discovered</dt>
            <dd>{entry.discovered}</dd>
          </div>
          {#if entry.mission_visits.length > 0}
            <div>
              <dt>Visited by</dt>
              <dd>
                <ul>
                  {#each entry.mission_visits as mission}
                    <li>{mission}</li>
                  {/each}
                </ul>
              </dd>
            </div>
          {/if}
        </dl>
      {:else if tab === 'library'}
        <p class="empty">Library entries land in #304 Slice 5.</p>
        {#if entry.wiki}
          <p class="wiki-temp">
            <a href={entry.wiki} target="_blank" rel="noopener noreferrer external">
              Wikipedia: {entry.name} ↗
            </a>
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .head {
    padding: 4px 0 12px;
  }
  .parent-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }
  .parent-label {
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
  }
  .parent-name {
    color: rgba(160, 200, 255, 0.95);
  }
  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
  }
  .tabs button {
    background: transparent;
    border: 0;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tabs button.active {
    color: #fff;
    border-bottom-color: rgba(160, 200, 255, 0.85);
  }
  .tab-content {
    color: rgba(255, 255, 255, 0.88);
    font-size: 13.5px;
    line-height: 1.55;
  }
  .editorial {
    margin: 0 0 12px;
  }
  .composition {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0 0;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .prop-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  .empty {
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
  .tech {
    margin: 0;
    display: grid;
    gap: 12px;
  }
  .tech > div {
    display: grid;
    gap: 2px;
  }
  .tech dt {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  .tech dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.92);
  }
  .tech ul {
    margin: 0;
    padding-left: 16px;
  }
  .wiki-temp {
    margin: 12px 0 0;
  }
  .wiki-temp a {
    color: rgba(160, 200, 255, 0.95);
  }
</style>
