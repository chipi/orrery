import { getLocale } from '$lib/paraglide/runtime';
import { getScaleIndexRows } from '$lib/server/entity-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  return { scaleIndex: await getScaleIndexRows(getLocale(), fetch) };
};
