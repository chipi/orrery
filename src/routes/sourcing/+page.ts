import { getSourcingGaps } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const data = await getSourcingGaps(getLocale(), fetch);
  return { gaps: data?.gaps ?? [], note: data?.note ?? '' };
};
