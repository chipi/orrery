<script lang="ts">
  import Panel from './Panel.svelte';
  import type { LocalizedSun } from '$types/sun';
  import * as m from '$lib/paraglide/messages';

  type Tab = 'overview' | 'technical';

  type Props = {
    sun: LocalizedSun | null;
    open: boolean;
    onClose: () => void;
  };
  let { sun, open, onClose }: Props = $props();

  let tab: Tab = $state('overview');

  // Derived presentation values (no source of truth lives here).
  let solarMassesEarth = $derived(sun ? sun.mass_kg / 5.972e24 : 0);
  let radiusEarth = $derived(sun ? sun.radius_km / 6371 : 0);
  let luminositySolar = $derived(sun ? sun.luminosity_w / 3.828e26 : 0);
  let remainingGyr = $derived(sun ? Math.max(0, 10 - sun.age_gyr) : 0);
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

    <div class="tabs" role="tablist">
      <button
        type="button"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}>{m.panel_tab_overview()}</button
      >
      <button
        type="button"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}>{m.panel_tab_technical()}</button
      >
    </div>

    <div class="tab-content">
      {#if tab === 'overview'}
        <p class="editorial">{sun.fact}</p>
        <p class="editorial">{sun.bio}</p>
      {:else}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.sun_label_radius()}</div>
            <div class="cell-value">{(sun.radius_km / 1000).toFixed(0)},700 km</div>
            <div class="cell-sub">{m.sun_radius_earth({ value: radiusEarth.toFixed(0) })}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.sun_label_mass()}</div>
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
            <div class="cell-label">{m.panel_label_axial_tilt()}</div>
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
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .type {
    font-family: 'Space Mono', monospace;
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
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .stat-value,
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.gold {
    color: #ffc850;
  }
  .cell-sub {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 2px;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    margin-bottom: 14px;
    flex-shrink: 0;
  }
  .tabs button {
    padding: 10px 14px;
    min-height: 44px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    margin-bottom: -1px;
  }
  .tabs button.active {
    color: var(--color-text);
    border-bottom-color: #ffc850;
  }

  .tab-content {
    flex: 1;
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
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.15);
    line-height: 1.8;
  }
</style>
