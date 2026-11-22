/**
 * The /science articles a deep-sky, galaxy or structure page links (plan C5a, 2026-11-19), the way
 * a star page links the H–R article. Only articles that cover the object's kind: nebulae and
 * star-forming regions link the nebulae article, planetary nebulae and supernova remnants the one on
 * how stars end (C5b), open and globular clusters the star-clusters article and the H–R one (0.9.11
 * C5).
 */
import { loadScienceTitles } from '$lib/explore/science-titles';
import type { LocalGroupKind } from '$lib/data/universe';

export type ScienceRef = { tab: string; section: string };

const HR: ScienceRef = { tab: 'observation', section: 'hertzsprung-russell' };
const GALAXY_TYPES: ScienceRef = { tab: 'observation', section: 'galaxy-types' };
const LOCAL_GROUP: ScienceRef = { tab: 'observation', section: 'local-group' };
const DWARF_SPHEROIDALS: ScienceRef = { tab: 'observation', section: 'dwarf-spheroidals' };
const NEBULAE: ScienceRef = { tab: 'observation', section: 'nebulae' };
const STARS_END: ScienceRef = { tab: 'observation', section: 'how-stars-end' };
const STAR_CLUSTERS: ScienceRef = { tab: 'observation', section: 'star-clusters' };
const LARGE_SCALE: ScienceRef = { tab: 'cosmology', section: 'large-scale-structure' };
const LANIAKEA: ScienceRef = { tab: 'cosmology', section: 'laniakea-and-the-great-attractor' };

/** By the deep-sky catalogue's `category`. */
export function scienceForDeepSky(category: string | null | undefined): ScienceRef[] {
  switch (category) {
    case 'galaxy':
      return [GALAXY_TYPES];
    case 'globular-cluster':
    case 'star-cluster':
      return [STAR_CLUSTERS, HR];
    case 'star':
      return [HR];
    case 'galaxy-cluster':
      return [LARGE_SCALE];
    case 'nebula':
    case 'dark-nebula':
    case 'star-forming-region':
      return [NEBULAE];
    case 'planetary-nebula':
    case 'supernova-remnant':
      return [STARS_END];
    default:
      return [];
  }
}

/** A Local Group member page. */
export function scienceForGalaxy(kind: LocalGroupKind): ScienceRef[] {
  return kind === 'dwarf-spheroidal'
    ? [LOCAL_GROUP, DWARF_SPHEROIDALS]
    : [LOCAL_GROUP, GALAXY_TYPES];
}

/** A structure page, by the scale it is shown at. */
export function scienceForStructure(scale: string): ScienceRef[] {
  return scale === 'laniakea' ? [LARGE_SCALE, LANIAKEA] : [LARGE_SCALE];
}

/** The refs as links with their titles in the reader's language (the science index). */
export async function scienceLinks(
  refs: ScienceRef[],
  locale: string,
  fetchFn: typeof fetch,
): Promise<{ tab: string; section: string; title: string }[]> {
  if (refs.length === 0) return [];
  const titles = await loadScienceTitles(locale, fetchFn);
  return refs.flatMap((r) => {
    const title = titles.get(`${r.tab}/${r.section}`);
    return title ? [{ ...r, title }] : [];
  });
}
