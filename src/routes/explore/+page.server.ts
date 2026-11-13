import { getLocale } from '$lib/paraglide/runtime';
import { getOuterOverlayIds } from '$lib/data/outer-entity';
import { getScaleIndexRows } from '$lib/server/entity-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  return {
    scaleIndex: await getScaleIndexRows(getLocale(), fetch),
    // The ids whose fact and bio the panels of the five outer scales may load, so no panel asks for
    // a file that is not there.
    outerOverlays: await getOuterOverlayIds(fetch),
  };
};
