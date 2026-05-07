// Adapter-static + GitHub Pages — every /science route is statically
// prerendered at build time so KaTeX runs once in Node and the client
// receives plain HTML (ADR-034).
import { SCIENCE_TABS, getScienceTab } from '$lib/data';
import type { ScienceSection, ScienceTabId } from '$types/science';
import type { LayoutLoad } from './$types';

export const prerender = true;

/**
 * Loads the active tab's section list (when the URL points into one)
 * so /science/+layout.svelte can render the right-rail in-tab nav.
 * Returns null railSections when on the /science landing.
 */
export const load: LayoutLoad = async ({ url, fetch }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  // ['science'] on landing; ['science', tab] on tab page; ['science', tab, section] on section page.
  // base path may prepend extra segments; drop everything before the literal 'science'.
  const sciIdx = segments.indexOf('science');
  const tabSlug = sciIdx >= 0 ? segments[sciIdx + 1] : undefined;
  const sectionSlug = sciIdx >= 0 ? segments[sciIdx + 2] : undefined;
  const railTab =
    tabSlug && SCIENCE_TABS.includes(tabSlug as ScienceTabId) ? (tabSlug as ScienceTabId) : null;
  const railSection = railTab && sectionSlug ? sectionSlug : null;
  const railSections: ScienceSection[] | null = railTab
    ? await getScienceTab(railTab, 'en-US', fetch).catch(() => [])
    : null;
  return { railTab, railSection, railSections };
};
