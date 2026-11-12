import dataSources from '$data/data-sources.json';
import type { PageServerLoad } from './$types';

/** The astrophysics catalogues and papers behind the star, deep-sky, black-hole and Local
 *  Group values (#658), in reading order; names and links come from data-sources.json. */
const ASTRO_SOURCE_IDS = [
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

export const load: PageServerLoad = () => {
  const byId = new Map(dataSources.entries.map((e) => [e.id, e]));
  const source = (id: string) => {
    const e = byId.get(id);
    if (!e) throw new Error(`data-sources.json has no entry ${id}`);
    return { id, name: e.name, url: e.source_url };
  };
  return {
    astroSources: ASTRO_SOURCE_IDS.map(source),
    // JPL's approximate Keplerian elements: the planet positions (ADR-095, the Lab ephemeris).
    jpl: source('jpl-iau-constants'),
  };
};
