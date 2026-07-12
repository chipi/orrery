import { getProgramIndex, getBadges } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const [programs, badges] = await Promise.all([
    getProgramIndex(getLocale(), fetch),
    getBadges(fetch),
  ]);
  return { programs, badges };
};
