import dataSources from '$data/data-sources.json';
import type { PageServerLoad } from './$types';
import { ASTRO_SOURCE_IDS, PLANETARY_SOURCE_IDS, SURFACE_SOURCE_IDS } from './source-ids';

export const load: PageServerLoad = () => {
  const byId = new Map(dataSources.entries.map((e) => [e.id, e]));
  const source = (id: string) => {
    const e = byId.get(id);
    if (!e) throw new Error(`data-sources.json has no entry ${id}`);
    return { id, name: e.name, url: e.source_url };
  };
  return {
    astroSources: ASTRO_SOURCE_IDS.map(source),
    planetarySources: PLANETARY_SOURCE_IDS.map(source),
    surfaceSources: SURFACE_SOURCE_IDS.map(source),
  };
};
