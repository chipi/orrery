import { error } from '@sveltejs/kit';
import { getEssay } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

// Every published essay is a prerender entry through scripts/site-routes.mjs
// (essaysRoutes reads essays/index.json), so no `entries` list here.
export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
  const essay = await getEssay(params.slug, getLocale(), fetch);
  if (!essay) error(404, `Essay not found: ${params.slug}`);
  return { essay };
};
