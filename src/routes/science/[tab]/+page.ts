import { error } from '@sveltejs/kit';
import { SCIENCE_TABS, getScienceTabIntro } from '$lib/data';
import type { ScienceTabId } from '$types/science';
import type { PageLoad, EntryGenerator } from './$types';

/** Prerender every tab page at build time (ADR-034 / adapter-static). */
export const prerender = true;

export const entries: EntryGenerator = () => SCIENCE_TABS.map((tab) => ({ tab }));

export const load: PageLoad = async ({ params, fetch }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  const intro = await getScienceTabIntro(tab, 'en-US', fetch).catch(() => null);
  return { tab, intro };
};
