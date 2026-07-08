<script lang="ts">
  /**
   * Tactical-Scan HUD (PRD-023 Slice E.4, amended #382). A sci-fi
   * "scan" panel of body-level facts — gravity, pressure, atmosphere,
   * temp, wind, rotation, diameter, escape velocity, surface, radiation,
   * light-time. Shared by /explore (planet focus) and the surface routes
   * (/moon /mars /earth via SurfaceScene) so the same facts read
   * identically wherever a body appears.
   *
   * Self-gates on the `planet-stats` science-lens layer; the caller adds
   * any extra gate via `focusGate` (/explore passes camera-focused; the
   * surface routes leave it true — the body is always "in focus").
   *
   * DOM-only: mobile-first, hidden on phones, shown at ≥ 601 px (the
   * surface HUD is already busy on small screens).
   */
  import { onMount } from 'svelte';
  import { onLayerChange } from '$lib/science-layers';
  import type { PlanetStats, LightTime } from '$lib/planet-stats';
  import AtmosphereWaveform from '$lib/components/AtmosphereWaveform.svelte';
  import * as m from '$lib/paraglide/messages';

  let {
    stats,
    bodyLabel,
    rotationHours = null,
    lightTime = null,
    focusGate = true,
    placement = 'bottom-center',
  }: {
    stats: PlanetStats | null;
    /** Upper-cased body name for the eyebrow, e.g. "MARS". */
    bodyLabel: string;
    /** Sidereal rotation in hours; negative = retrograde. */
    rotationHours?: number | null;
    lightTime?: LightTime | null;
    /** Extra caller-side gate ANDed with the layer + data. */
    focusGate?: boolean;
    /** Where the panel anchors. `bottom-center` for /explore; the
     *  surface routes use `above-altitude` — pinned to the right edge,
     *  stacked above the altitude chip so it sits beside the body. */
    placement?: 'bottom-center' | 'above-altitude';
  } = $props();

  let layerOn = $state(false);

  onMount(() => {
    const stop = onLayerChange('planet-stats', (on) => {
      layerOn = on;
    });
    return () => stop?.();
  });
</script>

{#if layerOn && focusGate && stats}
  <div
    class="tactical-scan"
    class:above-altitude={placement === 'above-altitude'}
    aria-hidden="true"
  >
    <div class="scan-eyebrow">{m.explore_scan_eyebrow({ planet: bodyLabel })}</div>
    <!-- PROTOTYPE hero tile (#385 diagram A) — the atmosphere's voice. -->
    <AtmosphereWaveform bodyKey={bodyLabel.toLowerCase()} />
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_gravity()}</span>
      <span class="scan-value">{stats.surfaceGravityG.toFixed(2)} g</span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_pressure()}</span>
      <span class="scan-value">
        {stats.atmoBar === 0
          ? m.explore_scan_value_pressure_none()
          : stats.atmoBar < 0.01
            ? `${(stats.atmoBar * 1000).toFixed(2)} mbar`
            : stats.atmoBar < 10
              ? `${stats.atmoBar.toFixed(2)} bar`
              : `${stats.atmoBar.toFixed(0)} bar`}
      </span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_atmosphere()}</span>
      <span class="scan-value scan-value-wrap">{stats.atmoComposition}</span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_temp()}</span>
      <span class="scan-value">
        {m.explore_scan_value_temp_format({
          k: stats.surfaceTempK.toString(),
          c: (stats.surfaceTempK - 273).toFixed(0),
        })}
      </span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_wind()}</span>
      <span class="scan-value">
        {stats.maxWindMs === 0
          ? m.explore_scan_value_wind_none()
          : m.explore_scan_value_wind_up_to({ ms: stats.maxWindMs.toString() })}
      </span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_rotation()}</span>
      <span class="scan-value">
        {#if rotationHours !== null}
          {Math.abs(rotationHours) < 48
            ? `${Math.abs(rotationHours).toFixed(2)} h`
            : `${(Math.abs(rotationHours) / 24).toFixed(1)} d`}
          {rotationHours < 0 ? `· ${m.explore_scan_value_rotation_retrograde()}` : ''}
        {/if}
      </span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_diameter()}</span>
      <span class="scan-value">{stats.diameterKm.toLocaleString()} km</span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_escape_v()}</span>
      <span class="scan-value">{stats.escapeKms.toFixed(1)} km/s</span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_surface()}</span>
      <span class="scan-value">
        {#if stats.surfaceKind === 'rocky'}{m.explore_scan_value_surface_rocky()}
        {:else if stats.surfaceKind === 'rocky-liquid'}{m.explore_scan_value_surface_rocky_liquid()}
        {:else if stats.surfaceKind === 'rocky-ice'}{m.explore_scan_value_surface_rocky_ice()}
        {:else if stats.surfaceKind === 'gas-giant'}{m.explore_scan_value_surface_gas_giant()}
        {:else}{m.explore_scan_value_surface_ice_giant()}{/if}
      </span>
    </div>
    <div class="scan-row">
      <span class="scan-label">{m.explore_scan_label_radiation()}</span>
      <span class="scan-value">
        {#if stats.radiation === 'shielded'}{m.explore_scan_value_radiation_shielded()}
        {:else if stats.radiation === 'moderate'}{m.explore_scan_value_radiation_moderate()}
        {:else if stats.radiation === 'high'}{m.explore_scan_value_radiation_high()}
        {:else}{m.explore_scan_value_radiation_extreme()}
        {/if}
      </span>
    </div>
    {#if lightTime}
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_light_time()}</span>
        <span class="scan-value">
          {lightTime.fromSunMin < 60
            ? m.explore_scan_value_light_time_sun_min({
                value: lightTime.fromSunMin.toFixed(1),
              })
            : m.explore_scan_value_light_time_sun_hr({
                value: (lightTime.fromSunMin / 60).toFixed(2),
              })}
          {#if lightTime.fromEarthMin !== null && lightTime.fromEarthMin > 0}
            · {lightTime.fromEarthMin < 60
              ? m.explore_scan_value_light_time_earth_min({
                  value: lightTime.fromEarthMin.toFixed(1),
                })
              : m.explore_scan_value_light_time_earth_hr({
                  value: (lightTime.fromEarthMin / 60).toFixed(2),
                })}
          {/if}
        </span>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Bottom-center, between the layer chips and the detail panel on
     desktop. Mobile-first: hidden on phones; visible at ≥ 601 px. */
  .tactical-scan {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    min-width: 320px;
    max-width: 420px;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(78, 205, 196, 0.35);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
    font-family: 'Space Mono', monospace;
    display: none;
  }
  .scan-value-wrap {
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  .scan-eyebrow {
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(78, 205, 196, 0.15);
  }
  .scan-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 2px 0;
    font-size: 11px;
    /* Long-locale guard (#342): the label flexbox needs min-width: 0 so
       a wide DE label truncates instead of overflowing the envelope. */
    min-width: 0;
  }
  .scan-label {
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1.3px;
    font-size: 9px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scan-value {
    color: rgba(255, 255, 255, 0.92);
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Surface routes (#382): pin to the right edge, stacked above the
     altitude chip (which sits at right:12px / bottom:56px in
     SurfaceScene) so the scan reads beside the body instead of over
     the bottom-center chrome. */
  .tactical-scan.above-altitude {
    left: auto;
    right: 12px;
    bottom: 84px;
    transform: none;
    min-width: 260px;
    max-width: 340px;
  }
  @media (min-width: 601px) {
    .tactical-scan {
      display: block;
    }
  }
</style>
