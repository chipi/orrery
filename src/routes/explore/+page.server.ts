import { getLocale } from '$lib/paraglide/runtime';
import { getBlackHoleLinks, getEntityIndex, getStarLinks } from '$lib/server/entity-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const locale = getLocale();
  const [entityIndex, starLinks, blackHoleLinks] = await Promise.all([
    getEntityIndex('explore', locale, fetch),
    getStarLinks(locale, fetch),
    getBlackHoleLinks(locale, fetch),
  ]);
  return { entityIndex, starLinks, blackHoleLinks };
};
