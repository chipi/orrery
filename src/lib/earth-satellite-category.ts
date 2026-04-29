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
  | 'station'
  | 'constellation'
  | 'telescope'
  | 'comsat'
  | 'moon-orbiter';

export function categoriseEarthSatellite(id: string): EarthSatelliteCategory {
  switch (id) {
    case 'iss':
    case 'tiangong':
      return 'station';
    case 'gps':
    case 'galileo':
    case 'glonass':
    case 'beidou':
      return 'constellation';
    case 'hubble':
    case 'chandra':
    case 'xmm':
    case 'jwst':
    case 'gaia':
      return 'telescope';
    case 'geo':
      return 'comsat';
    case 'lro':
      return 'moon-orbiter';
    default:
      // Unknown id — treat as a generic telescope-style probe. The
      // schema only validates the existing 13, so this only fires for
      // future additions that bypass the schema (shouldn't happen).
      return 'telescope';
  }
}
