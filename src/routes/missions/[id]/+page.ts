import { error } from '@sveltejs/kit';
import { getMission, getMissionIndex } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import { entityHero } from '$lib/entity-hero';
import missionIndex from '$data/missions/index.json';
import galleryCounts from '$data/mission-galleries.json';
import heroOverrides from '$data/missions-hero-overrides.json';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * /missions/<id> — one mission's indexable page (0.9.8 SEO item 0): the text
 * the /missions?id= panel shows, prerendered in every locale so search engines
 * can rank it. The panel stays the in-app view; this page links to it.
 */
export const prerender = true;

export const entries: EntryGenerator = () =>
  (missionIndex as { id: string }[]).map(({ id }) => ({ id }));

export const load: PageLoad = async ({ params, fetch }) => {
  const entry = (await getMissionIndex(fetch)).find((m) => m.id === params.id);
  if (!entry) throw error(404, `Unknown mission: ${params.id}`);
  const mission = await getMission(entry.id, entry.dest, getLocale(), fetch);
  if (!mission) throw error(404, `Unknown mission: ${params.id}`);
  return {
    mission,
    hero: entityHero(
      'missions',
      entry.id,
      galleryCounts as Record<string, number>,
      heroOverrides as { overrides: Record<string, { slot?: string }> },
    ),
  };
};
