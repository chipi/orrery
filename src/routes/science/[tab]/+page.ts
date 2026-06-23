import { error } from '@sveltejs/kit';
import { SCIENCE_TABS, getScienceTabIntro } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { ScienceTabId } from '$types/science';
import type { PageLoad, EntryGenerator } from './$types';

/** Prerender every tab page at build time (ADR-034 / adapter-static). */
export const prerender = true;

export const entries: EntryGenerator = () => SCIENCE_TABS.map((tab) => ({ tab }));

export const load: PageLoad = async ({ params, fetch }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  // getLocale() is bound to the request locale by the Paraglide server
  // middleware so each prerendered /<locale> tab page is localized.
  const intro = await getScienceTabIntro(tab, getLocale(), fetch).catch(() => null);
  return { tab, intro };
};
