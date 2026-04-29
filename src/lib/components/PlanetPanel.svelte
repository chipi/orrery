<script lang="ts">
  import Panel from './Panel.svelte';
  import SizesCanvas from './SizesCanvas.svelte';
  import type { LocalizedPlanet } from '$types/planet';
  import * as m from '$lib/paraglide/messages';

  type Tab = 'overview' | 'technical' | 'sizes';

  type Props = {
    planet: LocalizedPlanet | null;
    open: boolean;
    onClose: () => void;
    onPlanMission?: () => void;
  };
  let { planet, open, onClose, onPlanMission }: Props = $props();

  let tab: Tab = $state('overview');

  // Reset to overview each time a different planet is selected.
  let lastId = $state<string | null>(null);
  $effect(() => {
    if (planet && planet.id !== lastId) {
      tab = 'overview';
      lastId = planet.id;
    }
  });

  // ─── Derived technical figures (canonical, IAU-grounded) ─────────
  // mu_sun ≈ 4π² in AU³/yr², AU/yr → km/s = 4.7404 (IAU 2012).
  const MU_SUN = 4 * Math.PI ** 2;
  const AUPYR_TO_KMS = 4.7404;
  const AU_TO_MKM = 149.5978707;

  let perihelion = $derived(planet ? planet.a * (1 - planet.e) : 0);
  let aphelion = $derived(planet ? planet.a * (1 + planet.e) : 0);
  let meanVelKms = $derived(
    planet ? Math.sqrt(MU_SUN * (2 / planet.a - 1 / planet.a)) * AUPYR_TO_KMS : 0,
  );
  let speedRatio = $derived(planet ? (1 + planet.e) / (1 - planet.e) : 1);
  let orbitShape = $derived(
    !planet
      ? ''
      : planet.e < 0.05
        ? m.panel_orbit_shape_circular()
        : planet.e < 0.1
          ? m.panel_orbit_shape_slightly()
          : planet.e < 0.2
            ? m.panel_orbit_shape_notably()
            : m.panel_orbit_shape_highly(),
  );
  let mkmFromSun = $derived(planet ? planet.a * AU_TO_MKM : 0);
  let auLabel = $derived(planet ? `${planet.a.toFixed(2)} AU` : '');
  let periodLabel = $derived(
    !planet
      ? ''
      : planet.T < 365.25 * 1.5
        ? `${planet.T.toFixed(1)} days`
        : `${(planet.T / 365.25).toFixed(1)} yrs`,
  );
</script>

<Panel {open} {onClose} title={planet?.name ?? ''}>
  {#if planet}
    <div class="head">
      <div class="type">{planet.type.toUpperCase()}</div>
      <div class="name">{planet.name}</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">{m.panel_label_from_sun()}</div>
          <div class="stat-value">{auLabel}</div>
        </div>
        <div class="stat">
          <div class="stat-label">{m.panel_label_orbital_period()}</div>
          <div class="stat-value">{periodLabel}</div>
        </div>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="pp-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="pp-tabpanel">{m.panel_tab_overview()}</button
      >
      <button
        type="button"
        id="pp-tab-technical"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}
        aria-controls="pp-tabpanel">{m.panel_tab_technical()}</button
      >
      <button
        type="button"
        id="pp-tab-sizes"
        class:active={tab === 'sizes'}
        onclick={() => (tab = 'sizes')}
        role="tab"
        aria-selected={tab === 'sizes'}
        aria-controls="pp-tabpanel">{m.panel_tab_sizes()}</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="pp-tabpanel" aria-labelledby="pp-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{planet.fact}</p>
        <p class="editorial">{planet.bio}</p>
      {:else if tab === 'technical'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.panel_label_semi_major_axis()}</div>
            <div class="cell-value">{planet.a.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_orbital_period()}</div>
            <div class="cell-value">{planet.T.toFixed(1)} days</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_eccentricity()}</div>
            <div class="cell-value">e = {planet.e.toFixed(4)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_inclination()}</div>
            <div class="cell-value teal">{planet.incl.toFixed(2)}°</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_perihelion()}</div>
            <div class="cell-value">{perihelion.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_aphelion()}</div>
            <div class="cell-value">{aphelion.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_axial_tilt()}</div>
            <div class="cell-value" class:gold={planet.axialTilt > 10}>
              {planet.axialTilt.toFixed(2)}°
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_mean_velocity()}</div>
            <div class="cell-value">{meanVelKms.toFixed(2)} km/s</div>
          </div>
        </div>

        <div class="shape-row">
          <div class="shape-meta">
            {m.panel_orbit_shape_meta({ e: planet.e.toFixed(3), ratio: speedRatio.toFixed(2) })}
          </div>
          <div class="shape-display">
            <div
              class="shape-ellipse"
              style:--shape-w="{Math.max(50, 70 - Math.round(planet.e * 180))}px"
            ></div>
            <span>{orbitShape}</span>
          </div>
        </div>

        <div class="dist-row">
          <span>
            {m.panel_dist_row({
              mkm: mkmFromSun.toFixed(0),
              rot: planet.rotPeriod.toFixed(2),
            })}
          </span>
        </div>

        <div class="src">{m.panel_source_iau()}</div>
      {:else if tab === 'sizes'}
        <SizesCanvas highlightId={planet.id} />
      {/if}
    </div>

    {#if planet.missionable && onPlanMission}
      <div class="cta-bar">
        <button type="button" class="cta" onclick={onPlanMission}>
          {m.panel_plan_mission_cta({ name: planet.name.toUpperCase() })}
        </button>
      </div>
    {/if}
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
    color: rgba(255, 255, 255, 0.25);
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
  .cell-value.teal {
    color: #4ecdc4;
  }
  .cell-value.gold {
    color: #ffc850;
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
    transition:
      color 120ms,
      border-color 120ms;
  }
  .tabs button.active {
    color: var(--color-text);
    border-bottom-color: #4466ff;
  }
  .tabs button:hover {
    color: rgba(255, 255, 255, 0.65);
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

  .shape-row {
    margin-bottom: 12px;
    padding: 10px 11px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  .shape-meta {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.22);
    margin-bottom: 6px;
  }
  .shape-display {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.4);
  }
  .shape-ellipse {
    width: var(--shape-w, 70px);
    height: 26px;
    border: 1.5px solid #4466ff;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dist-row {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 10px;
  }

  .src {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.15);
    line-height: 1.8;
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
    background: #1a33bb;
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .cta:hover,
  .cta:focus-visible {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
  }
</style>
