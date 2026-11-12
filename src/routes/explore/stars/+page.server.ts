import { getLocale } from '$lib/paraglide/runtime';
import { getStarEntity } from '$lib/data/star-entity';
import { starPageIds } from '../../../../scripts/site-routes.mjs';
import type { PageServerLoad } from './$types';

/**
 * /explore/stars — the static A–Z of every star page (ADR-096 item 11): the neighbourhood's
 * INDEX panel only exists once that scene is mounted, so this server-rendered list is what
 * links every /explore/stars/<id> page in the prerendered HTML.
 */
export const load: PageServerLoad = async ({ fetch }) => {
  const locale = getLocale();
  const stars = (
    await Promise.all(
      (starPageIds() as string[]).map(async (id) => {
        const s = await getStarEntity(id, locale, fetch);
        return s ? { id, name: s.name, fact: s.fact, planets: s.planets.length } : null;
      }),
    )
  ).filter((s) => s !== null);
  const collator = new Intl.Collator(locale);
  return { stars: stars.sort((a, b) => collator.compare(a.name, b.name)) };
};
