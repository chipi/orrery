import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getSiteEntity } from '$lib/data/site-entity';
import type { EntryGenerator, PageServerLoad } from './$types';

/** /moon/<id> — one moon site as an indexable page (0.9.8 SEO); see SiteEntityPage. */
export const prerender = true;

export const entries: EntryGenerator = () =>
  (JSON.parse(readFileSync('static/data/moon-sites.json', 'utf8')) as { id: string }[]).map(
    ({ id }) => ({ id }),
  );

export const load: PageServerLoad = async ({ params, fetch }) => {
  const entity = await getSiteEntity('moon', params.id, getLocale(), fetch);
  if (!entity) throw error(404, `Unknown moon site: ${params.id}`);
  return { entity };
};
