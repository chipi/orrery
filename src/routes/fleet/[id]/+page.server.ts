import { error } from '@sveltejs/kit';
import { getFleet, getMission, getMissionIndex } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import { entityHero } from '$lib/entity-hero';
import fleetIndex from '$data/fleet/index.json';
import galleryCounts from '$data/fleet-galleries.json';
import heroOverrides from '$data/fleet-hero-overrides.json';
import cardsManifest from '../../../../static/images/cards/cards-manifest.json';
import { SITE_ORIGIN } from '$lib/seo';
import type { FleetCategory } from '$types/fleet';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /fleet/<id> — one spacecraft, launcher, engine, suit or site as an indexable
 * page (0.9.8 SEO item 0): the /fleet?id= panel's overview text, prerendered in
 * every locale. The panel stays the in-app view; this page links to it.
 */
export const prerender = true;

const INDEX = fleetIndex as { id: string; category: FleetCategory }[];

export const entries: EntryGenerator = () => INDEX.map(({ id }) => ({ id }));

export const load: PageServerLoad = async ({ params, fetch }) => {
  const row = INDEX.find((e) => e.id === params.id);
  if (!row) throw error(404, `Unknown fleet entry: ${params.id}`);
  const locale = getLocale();
  const entry = await getFleet(row.id, row.category, locale, fetch);
  if (!entry) throw error(404, `Unknown fleet entry: ${params.id}`);

  // Linked missions with their names in this locale, for links to /missions/<id>.
  const missionIndex = await getMissionIndex(fetch);
  const missions = (
    await Promise.all(
      (entry.linked_missions ?? []).map(async (id) => {
        const m = missionIndex.find((x) => x.id === id);
        if (!m) return null;
        const full = await getMission(m.id, m.dest, locale, fetch);
        return { id, name: full?.name ?? id, year: m.year };
      }),
    )
  ).filter((m): m is { id: string; name: string; year: number } => m !== null);

  // The entry's collectible card as share image; entries without one get the default.
  const hasCard =
    `fleet/${row.id}` in (cardsManifest as { entries: Record<string, string> }).entries;

  return {
    card: hasCard ? `${SITE_ORIGIN}/images/cards/fleet/${row.id}.jpg` : null,
    entry,
    missions,
    hero: entityHero(
      'fleet-galleries',
      row.id,
      galleryCounts as Record<string, number>,
      heroOverrides as { overrides: Record<string, { slot?: string }> },
    ),
  };
};
