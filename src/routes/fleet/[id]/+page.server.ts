import { error } from '@sveltejs/kit';
import { getFleet, getMission, getMissionIndex, getMuseums, museumsForObject } from '$lib/data';
import { get } from '$lib/data/core';
import { enginesForLauncher, launchersForEngine } from '$lib/physics/propulsion/engine-registry';
import { getLocale } from '$lib/paraglide/runtime';
import { entityHero } from '$lib/entity-hero';
import { thumbOf } from '$lib/entity-thumb';
import { fleetMissionRows } from '$lib/fleet-missions';
import { agencyRingColor } from '$lib/surface-map/nation-palette';
import fleetIndex from '$data/fleet/index.json';
import galleryCounts from '$data/fleet-galleries.json';
import heroOverrides from '$data/fleet-hero-overrides.json';
import cardsManifest from '../../../../static/images/cards/cards-manifest.json';
import { SITE_ORIGIN } from '$lib/seo';
import type { FleetCategory, FleetSiteLink } from '$types/fleet';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /fleet/<id> — one spacecraft, launcher, engine, suit or site as an indexable
 * page (0.9.8 SEO item 0): the /fleet?id= panel's overview text, prerendered in
 * every locale. The panel stays the in-app view; this page links to it.
 */
export const prerender = true;

const INDEX = fleetIndex as {
  id: string;
  category: FleetCategory;
  agency: string;
  first_flight: string;
}[];

const year = (iso: string) => Number.parseInt(iso, 10) || 9999;

type Overlay = { name?: string; site_name?: string; fact?: string; description?: string };

/** A linked site's name and text in this locale (en-US fallback); null when nothing is localized. */
async function siteText(ls: FleetSiteLink, locale: string, fetchFn: typeof fetch) {
  const dir = ls.type === 'earth-object' ? 'earth-objects' : `${ls.type}-sites`;
  const read = (l: string) =>
    get<Overlay>(`i18n/${l}/${dir}/${ls.site_id}.json`, fetchFn).catch(() => null);
  const o = (await read(locale)) ?? (locale === 'en-US' ? null : await read('en-US'));
  if (!o?.name) return null;
  const href = ls.type === 'earth-object' ? `/earth?id=${ls.site_id}` : `/${ls.type}/${ls.site_id}`;
  return { type: ls.type, href, name: o.name, place: o.site_name, text: o.fact ?? o.description };
}

export const entries: EntryGenerator = () => INDEX.map(({ id }) => ({ id }));

export const load: PageServerLoad = async ({ params, fetch }) => {
  const row = INDEX.find((e) => e.id === params.id);
  if (!row) throw error(404, `Unknown fleet entry: ${params.id}`);
  const locale = getLocale();
  const entry = await getFleet(row.id, row.category, locale, fetch);
  if (!entry) throw error(404, `Unknown fleet entry: ${params.id}`);

  // One list of missions (flights and linked missions, as the panel's Missions tab): names in this
  // locale, a link to /missions/<id> only where the mission exists.
  const missionIndex = await getMissionIndex(fetch);
  const catalogued = fleetMissionRows(entry, missionIndex, () => undefined).flatMap((r) =>
    r.missionId ? [r.missionId] : [],
  );
  const loaded = (
    await Promise.all(
      catalogued.map(async (id) => {
        const m = missionIndex.find((x) => x.id === id)!;
        const full = await getMission(m.id, m.dest, locale, fetch);
        return {
          id,
          name: full?.name ?? id,
          first: full?.first ?? null,
          ring: agencyRingColor(m.agency),
          refs: (full?.fleet_refs ?? []).map((r) => r.id),
        };
      }),
    )
  ).map((m) => ({ ...m, linked: (entry.linked_missions ?? []).includes(m.id) }));
  const loadedById = new Map(loaded.map((m) => [m.id, m]));
  const missions = fleetMissionRows(entry, missionIndex, (id) => loadedById.get(id)?.name).map(
    (r) => ({
      ...r,
      first: (r.missionId && loadedById.get(r.missionId)?.first) || null,
      thumb: r.missionId ? thumbOf('missions', r.missionId) : null,
      ring: r.missionId ? loadedById.get(r.missionId)!.ring : null,
    }),
  );

  // Other hardware: what flew on the same missions, and the engine / launcher cross-reference.
  const hardware = async (ids: string[]) =>
    (
      await Promise.all(
        [...new Set(ids)].map(async (id) => {
          const r = INDEX.find((x) => x.id === id);
          const e = r && (await getFleet(r.id, r.category, locale, fetch));
          return e
            ? {
                id,
                name: e.name ?? id,
                tagline: e.tagline ?? null,
                thumb: thumbOf('fleet', id),
                ring: agencyRingColor(e.agency),
              }
            : null;
        }),
      )
    ).filter((h): h is NonNullable<typeof h> => h !== null);
  const alongside = await hardware(
    loaded
      .filter((m) => m.linked)
      .flatMap((m) => m.refs)
      .filter((id) => id !== row.id),
  );
  const engines = await hardware(
    entry.category === 'launcher' ? enginesForLauncher(row.id).map((e) => e.id) : [],
  );
  const usedOn = await hardware(
    entry.category === 'engine' ? launchersForEngine(row.id).map((l) => l.launcherId) : [],
  );

  // The same kind of hardware, same agency first, nearest first flight first.
  const kin = await hardware(
    INDEX.filter((x) => x.category === row.category && x.id !== row.id)
      .sort(
        (a, b) =>
          Number(b.agency === row.agency) - Number(a.agency === row.agency) ||
          Math.abs(year(a.first_flight) - year(entry.first_flight)) -
            Math.abs(year(b.first_flight) - year(entry.first_flight)),
      )
      .slice(0, 6)
      .map((x) => x.id),
  );

  const sites = (
    await Promise.all((entry.linked_sites ?? []).map((ls) => siteText(ls, locale, fetch)))
  ).filter((x) => x !== null);

  const museums = museumsForObject(await getMuseums(locale, fetch), row.id).map(
    ({ museum, item }) => ({
      id: museum.id,
      name: museum.name,
      city: museum.city,
      item,
    }),
  );

  // The entry's collectible card as share image; entries without one get the default.
  const hasCard =
    `fleet/${row.id}` in (cardsManifest as { entries: Record<string, string> }).entries;

  return {
    card: hasCard ? `${SITE_ORIGIN}/images/cards/fleet/${row.id}.jpg` : null,
    entry,
    missions,
    alongside,
    kin,
    engines,
    usedOn,
    sites,
    museums,
    hero: entityHero(
      'fleet-galleries',
      row.id,
      galleryCounts as Record<string, number>,
      heroOverrides as { overrides: Record<string, { slot?: string }> },
    ),
  };
};
