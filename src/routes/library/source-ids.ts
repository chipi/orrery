/** The data-sources.json entries /library draws in its header blocks, in reading order; names,
 *  links and descriptions come from the entries, so /credits and /library cannot drift.
 *  (A plain module: SvelteKit allows only `load` and friends as exports of +page.server.ts.) */

/** The astrophysics catalogues and papers behind the star, deep-sky, black-hole and Local
 *  Group values (#658). */
export const ASTRO_SOURCE_IDS = [
  'hyg-v41',
  'gaia-dpac',
  'nasa-exoplanet-archive',
  'cds-simbad-vizier',
  'ned',
  'openngc',
  'open-cluster-catalogues',
  'globular-cluster-catalogues',
  'cosmicflows-4',
  'mcconnachie-2012',
  'black-hole-parameters',
  'gravity-eht-galactic-centre',
];

/** NASA JPL's planetary data: positions (ADR-095), physical parameters, satellite parameters, and
 *  the Horizons Sun table behind the deep-sky IN THE SKY months. */
export const PLANETARY_SOURCE_IDS = [
  'jpl-keplerian-elements',
  'jpl-planetary-parameters',
  'jpl-satellite-parameters',
  'jpl-horizons-sun',
];

/** The Moon and Mars landing and rover-track sources the route files credit. */
export const SURFACE_SOURCE_IDS = [
  'lroc-nac-traverses',
  'usgs-apollo17-traverse',
  'nasa-mmgis-rover-traverses',
  'pds-mer-traverses',
  'hirise-zhurong-traverse',
  'wan2014-yutu-traverse',
  'vadawale2024-pragyan-stops',
];
