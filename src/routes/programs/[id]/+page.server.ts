import { getProgram, getProgramIndex } from '$lib/data';
import { getFleet } from '$lib/data/fleet';
import { get } from '$lib/data/core';
import type { FleetIndexEntry } from '$types/fleet';
import { getLocale } from '$lib/paraglide/runtime';
import { thumbOf, siteHeroOf, fleetHeroOf } from '$lib/entity-thumb';
import { reuseHeroPath } from '$lib/program-page';
import type { PageServerLoad } from './$types';

/**
 * Everything the page draws from a manifest, resolved here so the browser does not ship the thumbs
 * manifest (~4.6 KB brotli with the thumb component's ring helper) or the programs index: the round
 * photo of each mission row (keyed `mission:<id>`), the hero of each hardware card (`heroes`, keyed
 * by fleet id), the name of each hardware card (`fleetNames`), and the cards of the two rails (surface sites, related programs), each with its
 * entity's existing hero. A card with no hero has `hero: null`.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const program = await getProgram(params.id, locale, fetch);
  const thumbs: Record<string, string> = {};
  const heroes: Record<string, string> = {};
  for (const r of program?.roster ?? []) {
    if (!r.linked_id) continue;
    if (r.ref === 'fleet') {
      const h = fleetHeroOf(r.linked_id);
      if (h) heroes[r.linked_id] = h;
    } else if (!r.ref || r.ref === 'mission') {
      const t = thumbOf('missions', r.linked_id);
      if (t) thumbs[`mission:${r.linked_id}`] = t;
    }
  }

  // The craft name of each hardware card, in the page's locale (an id such as `long-march-3b` or
  // `pslv-xl` does not read as a name). A card whose entry cannot be read falls back to its id.
  const fleetNames: Record<string, string> = {};
  const hardwareIds = (program?.roster ?? []).flatMap((r) =>
    r.ref === 'fleet' && r.linked_id ? [r.linked_id] : [],
  );
  if (hardwareIds.length) {
    const category = new Map(
      (await get<FleetIndexEntry[]>('fleet/index.json', fetch)).map((e) => [e.id, e.category]),
    );
    await Promise.all(
      hardwareIds.map(async (id) => {
        const cat = category.get(id);
        const entry = cat ? await getFleet(id, cat, locale, fetch) : null;
        if (entry?.name) fleetNames[id] = entry.name;
      }),
    );
  }

  const siteCards = (program?.surface_sites ?? []).map((s) => ({
    surface: s.surface,
    site: s.site,
    label: s.label,
    hero: siteHeroOf(s.surface === 'earth' ? 'earth-objects' : s.surface, s.site),
  }));

  const index = program?.related_programs?.length ? await getProgramIndex(locale, fetch) : [];
  const byId = new Map(index.map((e) => [e.id, e]));
  const related = (program?.related_programs ?? []).flatMap((id) => {
    const e = byId.get(id);
    return e
      ? [
          {
            id,
            name: e.name,
            agency: e.agency,
            start_year: e.start_year ?? null,
            end_year: e.end_year ?? null,
            hero: reuseHeroPath(e.hero),
          },
        ]
      : [];
  });

  return { thumbs, heroes, fleetNames, siteCards, related };
};
