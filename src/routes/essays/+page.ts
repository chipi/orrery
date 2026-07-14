import { getEssayIndex } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const all = await getEssayIndex(getLocale(), fetch);
  return { essays: all.filter((e) => e.status === 'published') };
};
