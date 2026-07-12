import { getBadges, getBadgeProvenance } from '$lib/data';
import type { PageLoad } from './$types';

export const prerender = true;

// Chronological reading order for the program insignia; anything unlisted
// falls to the end, alpha.
const PROGRAM_ORDER = ['mercury', 'gemini', 'apollo', 'skylab', 'space-shuttle', 'iss'];

export const load: PageLoad = async ({ fetch }) => {
  const [map, prov] = await Promise.all([getBadges(fetch), getBadgeProvenance(fetch)]);
  const byPath = new Map(prov.map((p) => [p.path, p]));

  const items = Object.entries(map).map(([key, img]) => {
    const [kind, id] = key.split(':');
    const cr = byPath.get(img) ?? null;
    const name = (cr?.title ?? id).replace(/\s+insignia$/i, '');
    return { key, kind, id, name, img, credit: cr };
  });

  const programs = items
    .filter((i) => i.kind === 'program')
    .sort((a, b) => {
      const ia = PROGRAM_ORDER.indexOf(a.id);
      const ib = PROGRAM_ORDER.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  const missions = items
    .filter((i) => i.kind === 'mission')
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  return { programs, missions };
};
