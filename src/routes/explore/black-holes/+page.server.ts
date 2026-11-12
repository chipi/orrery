import { getLocale } from '$lib/paraglide/runtime';
import { getBlackHoleEntity } from '$lib/data/black-hole-entity';
import { blackHolePageIds } from '../../../../scripts/site-routes.mjs';
import type { PageServerLoad } from './$types';

/**
 * /explore/black-holes — the static A–Z of every black-hole page (ADR-096 item 11): the star
 * INDEX panel only exists once the neighbourhood scene is mounted, so this server-rendered
 * list is what links every /explore/black-holes/<id> page in the prerendered HTML.
 */
export const load: PageServerLoad = async ({ fetch }) => {
  const locale = getLocale();
  const holes = (
    await Promise.all(
      (blackHolePageIds() as string[]).map(async (id) => {
        const h = await getBlackHoleEntity(id, locale, fetch);
        return h ? { id, name: h.name, kind: h.kind, fact: h.fact } : null;
      }),
    )
  ).filter((h) => h !== null);
  const collator = new Intl.Collator(locale);
  return { holes: holes.sort((a, b) => collator.compare(a.name, b.name)) };
};
