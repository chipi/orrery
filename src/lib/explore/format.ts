import * as m from '$lib/paraglide/messages';
import type { ExploreContextId } from '$lib/three/explore-scene-host';

// Localised label for an anonymous star's catalogue colour (enum → message).
export const anonColorLabel = (c: string): string => {
  switch (c) {
    case 'blue-white':
      return m.star_color_blue_white();
    case 'white':
      return m.star_color_white();
    case 'yellow-white':
      return m.star_color_yellow_white();
    case 'yellow':
      return m.star_color_yellow();
    case 'orange':
      return m.star_color_orange();
    case 'red':
      return m.star_color_red();
    default:
      return c;
  }
};

export const fmtScale = (value: number): string =>
  value >= 1000 || value < 0.01
    ? value.toLocaleString(undefined, { maximumSignificantDigits: 3 })
    : String(value);
// Localize the light-travel unit words emitted by scale-readout (the km/AU/ly/pc
// symbols stay universal).
export const lightUnitLabel = (unit: string): string => {
  switch (unit) {
    case 'light-seconds':
      return m.explore_light_seconds();
    case 'light-minutes':
      return m.explore_light_minutes();
    case 'light-hours':
      return m.explore_light_hours();
    case 'light-days':
      return m.explore_light_days();
    default:
      return m.explore_light_years();
  }
};
export const contextLabel = (contextId: ExploreContextId, bodyHostName: string): string =>
  contextId === 'body-scene'
    ? bodyHostName
    : contextId === 'neighborhood'
      ? m.explore_ctx_stellar_neighborhood()
      : contextId === 'milky-way'
        ? m.explore_ctx_milky_way()
        : contextId === 'local-group'
          ? m.explore_ctx_local_group()
          : m.explore_ctx_solar_system();

// Satellite stats for the Earth-for-scale widget when a moon is
// selected. Real diameters in km. Keyed by satellite id (without
// the parent-planet prefix used in selectedSatelliteKey). Only
// diameter info is needed today — the tactical-scan overlay still
// gates on `cameraState.focusedOnPlanet` so the gravity / atmo / temp rows
// stay planet-only. Earth = 12 742 km.
export const SATELLITE_STATS: Record<string, { diameterKm: number; diameterRatioEarth: number }> = {
  moon: { diameterKm: 3474, diameterRatioEarth: 0.273 },
  phobos: { diameterKm: 22.4, diameterRatioEarth: 0.00176 },
  deimos: { diameterKm: 12.4, diameterRatioEarth: 0.00097 },
  io: { diameterKm: 3643, diameterRatioEarth: 0.286 },
  europa: { diameterKm: 3122, diameterRatioEarth: 0.245 },
  ganymede: { diameterKm: 5268, diameterRatioEarth: 0.413 },
  callisto: { diameterKm: 4821, diameterRatioEarth: 0.378 },
  titan: { diameterKm: 5150, diameterRatioEarth: 0.404 },
  enceladus: { diameterKm: 504, diameterRatioEarth: 0.04 },
  miranda: { diameterKm: 471, diameterRatioEarth: 0.037 },
  ariel: { diameterKm: 1158, diameterRatioEarth: 0.091 },
  umbriel: { diameterKm: 1169, diameterRatioEarth: 0.092 },
  titania: { diameterKm: 1577, diameterRatioEarth: 0.124 },
  oberon: { diameterKm: 1523, diameterRatioEarth: 0.12 },
  triton: { diameterKm: 2706, diameterRatioEarth: 0.212 },
};

// Time-dilation readout: √(1 − rₛ/r) at r = k·rₛ, as a percentage of a far clock.
export const dilationPct = (k: number): string => `${Math.round(Math.sqrt(1 - 1 / k) * 100)}%`;
