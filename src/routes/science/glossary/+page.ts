import { get } from '$lib/data/core';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const prerender = true;

export type GlossaryLink = { href: string; title: string };
export type GlossaryTerm = {
  id: string;
  name: string;
  definition: string;
  readMore: GlossaryLink | null;
  usedOn: GlossaryLink[];
};

// static/data/glossary/<locale>.json is written by scripts/build-glossary.mjs (npm run build).
export const load: PageLoad = async ({ fetch }) => {
  const data = await get<{ terms: GlossaryTerm[] }>(`glossary/${getLocale()}.json`, fetch).catch(
    () => get<{ terms: GlossaryTerm[] }>('glossary/en-US.json', fetch),
  );
  return { terms: data.terms };
};
