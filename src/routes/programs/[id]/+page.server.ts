import { getProgram } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import { thumbOf } from '$lib/entity-thumb';
import type { PageServerLoad } from './$types';

/**
 * The round photo of each roster row, resolved here so the page does not ship the thumbs manifest
 * to the browser (~4.6 KB brotli with the thumb component's ring helper). Keyed `<ref>:<linked_id>`
 * like the page's badges map; a row with no photo has no key.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
  const program = await getProgram(params.id, getLocale(), fetch);
  const thumbs: Record<string, string> = {};
  for (const r of program?.roster ?? []) {
    if (!r.linked_id || (r.ref && r.ref !== 'mission' && r.ref !== 'fleet')) continue;
    const kind = r.ref === 'fleet' ? 'fleet' : 'mission';
    const t = thumbOf(kind === 'fleet' ? 'fleet' : 'missions', r.linked_id);
    if (t) thumbs[`${kind}:${r.linked_id}`] = t;
  }
  return { thumbs };
};
