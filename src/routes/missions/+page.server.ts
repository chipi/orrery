import { getLocale } from '$lib/paraglide/runtime';
import { getEntityIndex } from '$lib/server/entity-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({
  entityIndex: await getEntityIndex('missions', getLocale(), fetch),
});
