import { error } from '@sveltejs/kit';
import { getEssay } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

// Hardcoded slugs for the base prerender (universal module — no node:fs).
// The localized × slug expansion lives in svelte.config.js (essaysRoutes),
// same split as /programs.
const ESSAY_SLUGS = [
  'navigation',
  'delta-v',
  'comms',
  'reusable-launchers',
  'new-propulsion',
  'seven-minutes',
];

export const entries: EntryGenerator = () => ESSAY_SLUGS.map((slug) => ({ slug }));

export const load: PageLoad = async ({ params, fetch }) => {
  const essay = await getEssay(params.slug, getLocale(), fetch);
  if (!essay) error(404, `Essay not found: ${params.slug}`);
  return { essay };
};
