import { error } from '@sveltejs/kit';
import { SCIENCE_TABS, getScienceTab } from '$lib/data';
import type { ScienceTabId } from '$types/science';
import type { PageLoad, EntryGenerator } from './$types';

/** Prerender every tab page at build time (ADR-034 / adapter-static). */
export const prerender = true;

/**
 * Returns the static set of tab slugs SvelteKit should prerender —
 * one HTML page per top-level science tab.
 */
export const entries: EntryGenerator = () => SCIENCE_TABS.map((tab) => ({ tab }));

export const load: PageLoad = async ({ params, fetch }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  // The data-layer get<T> helper wraps fetch — pass SvelteKit's fetch
  // through so prerender can reach static/data/ during build.
  const sections = await getScienceTab(tab, 'en-US').catch((): never[] => []);
  return { tab, sections };
};
