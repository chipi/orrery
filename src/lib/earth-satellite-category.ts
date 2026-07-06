/**
 * Categorise an Earth-orbiting object into one of five icon archetypes
 * for the /earth 3D scene.
 *
 * Categories chosen by visual distinctiveness, not strict orbital
 * mechanics:
 *
 *   station     — crewed orbital habitat (ISS, Tiangong)
 *   constellation — multi-satellite navigation cluster (GPS, Galileo,
 *                  GLONASS, BeiDou) rendered as 6 dots on a ring
 *   telescope   — astronomy observatory (Hubble, Chandra, XMM, JWST,
 *                  Gaia)
 *   comsat      — geostationary communications cluster (the GEO entry)
 *   moon-orbiter — lunar probe whose orbit is around the Moon, not
 *                  Earth (LRO). Rendered near Moon position.
 */
export type EarthSatelliteCategory =
  'station' | 'constellation' | 'telescope' | 'comsat' | 'moon-orbiter';

export function categoriseEarthSatellite(id: string): EarthSatelliteCategory {
  switch (id) {
    case 'iss':
    case 'tiangong':
      return 'station';
    // Navigation + GH #83 constellations (LEO comms, LEO imaging,
    // HEO early-warning, MEO comms) all share the visual archetype of
    // "multi-satellite cluster" until they need separate icons.
    case 'gps':
    case 'galileo':
    case 'glonass':
    case 'beidou':
    case 'starlink':
    case 'oneweb':
    case 'iridium-next':
    case 'kuiper':
    case 'planet-labs':
    case 'sentinel-copernicus':
    case 'landsat':
    case 'tundra-molniya':
    case 'o3b':
      return 'constellation';
    case 'hubble':
    case 'chandra':
    case 'xmm':
    case 'jwst':
    case 'gaia':
      return 'telescope';
    // GEO comms cluster — generic 'geo' marker + GH #83 additions
    case 'geo':
    case 'goes':
    case 'inmarsat':
      return 'comsat';
    case 'lro':
    case 'luna10':
    case 'clementine':
    case 'lunar-prospector':
    case 'smart-1':
    case 'change1':
    case 'change2':
    case 'chandrayaan1':
      return 'moon-orbiter';
    default:
      // Unknown id — treat as a generic telescope-style probe.
      return 'telescope';
  }
}
