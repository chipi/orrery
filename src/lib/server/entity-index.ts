import { readFileSync } from 'node:fs';
import {
  getBlackHoles,
  getCosmicWeb,
  getCultureObjectIds,
  getDeepSkyObjects,
  getExoplanetSystems,
  getFleet,
  getLaniakea,
  getLocalGroup,
  getLocalSheet,
  getMilkyWaySchematic,
  getMission,
  getNamedStars,
  getVirgo,
} from '$lib/data';
import { get } from '$lib/data/core';
import { buildScaleIndexRows, type ScaleIndexRows } from '$lib/explore/scale-index';
import { getBodyEntity } from '$lib/data/body-entity';
import { getSiteEntity, type SiteBody } from '$lib/data/site-entity';
import { getStarEntity } from '$lib/data/star-entity';
import { getBlackHoleEntity } from '$lib/data/black-hole-entity';
import type { FleetCategory } from '$types/fleet';
import missionIndex from '$data/missions/index.json';
import fleetIndex from '$data/fleet/index.json';
import {
  DEEP_SKY_ALIAS,
  blackHolePageIds,
  collectCanonicalRoutes,
  deepSkyPageIds,
  starPageIds,
} from '../../../scripts/site-routes.mjs';

export type EntityHub = 'missions' | 'fleet' | 'moon' | 'mars' | 'venus' | 'explore';

export interface EntityLink {
  id: string;
  name: string;
}

type FetchFn = typeof fetch;

const GLOSSARY = (
  JSON.parse(readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')) as {
    body: Record<string, Record<string, string>>;
  }
).body;

/** Every id the hub's entity pages prerender — scripts/site-routes.mjs is the one source. */
function hubIds(hub: EntityHub): string[] {
  const prefix = `/${hub}/`;
  return collectCanonicalRoutes()
    .filter((r) => r.startsWith(prefix) && !r.slice(prefix.length).includes('/'))
    .map((r) => r.slice(prefix.length))
    .filter(
      (id) => !(hub === 'explore' && id === 'hub') && !(hub === 'missions' && id === 'launches'),
    );
}

async function nameOf(
  hub: EntityHub,
  id: string,
  locale: string,
  fetchFn: FetchFn,
): Promise<string | null> {
  if (hub === 'missions') {
    const row = (missionIndex as { id: string; dest: string }[]).find((m) => m.id === id);
    const mission = row && (await getMission(id, row.dest, locale, fetchFn));
    return mission ? (mission.name ?? id) : null;
  }
  if (hub === 'fleet') {
    const row = (fleetIndex as { id: string; category: FleetCategory }[]).find((f) => f.id === id);
    const entry = row && (await getFleet(id, row.category, locale, fetchFn));
    return entry ? entry.name : null;
  }
  if (hub === 'explore') {
    const body = await getBodyEntity(id, locale, fetchFn);
    if (!body) return null;
    return body.kind === 'planet' ? body.name : (GLOSSARY[body.name]?.[locale] ?? body.name);
  }
  const entity = await getSiteEntity(hub as SiteBody, id, locale, fetchFn);
  return entity ? (entity.text.name ?? id) : null;
}

/**
 * The A–Z index of a hub (0.9.8 SEO): every entity page the hub prerenders,
 * named as the entity page names it, sorted by the reader's locale. Server-only
 * so the entity data never reaches the route's client JS.
 */
export async function getEntityIndex(
  hub: EntityHub,
  locale: string,
  fetchFn: FetchFn,
): Promise<EntityLink[]> {
  const links = (
    await Promise.all(
      hubIds(hub).map(async (id) => {
        const name = await nameOf(hub, id, locale, fetchFn);
        return name === null ? null : { id, name };
      }),
    )
  ).filter((l): l is EntityLink => l !== null);
  const collator = new Intl.Collator(locale);
  return links.sort((a, b) => collator.compare(a.name, b.name));
}

async function sortedLinks(
  ids: string[],
  name: (id: string) => Promise<string | null>,
  locale: string,
): Promise<EntityLink[]> {
  const links = (await Promise.all(ids.map(async (id) => ({ id, name: await name(id) })))).filter(
    (l): l is EntityLink => l.name !== null,
  );
  const collator = new Intl.Collator(locale);
  return links.sort((a, b) => collator.compare(a.name, b.name));
}

/** Every /explore/stars/<id> page (named stars + exoplanet hosts), named as the page names it. */
function getStarLinks(locale: string, fetchFn: FetchFn): Promise<EntityLink[]> {
  return sortedLinks(
    starPageIds() as string[],
    async (id) => (await getStarEntity(id, locale, fetchFn))?.name ?? null,
    locale,
  );
}

/** Every /explore/black-holes/<id> page, named as the page names it. */
function getBlackHoleLinks(locale: string, fetchFn: FetchFn): Promise<EntityLink[]> {
  return sortedLinks(
    blackHolePageIds() as string[],
    async (id) => (await getBlackHoleEntity(id, locale, fetchFn))?.name ?? null,
    locale,
  );
}

/** A `name` from an overlay file of the reader's language, else en-US, else null. */
async function overlayName(path: string, locale: string, fetchFn: FetchFn): Promise<string | null> {
  const read = (l: string) =>
    get<{ name?: string }>(`i18n/${l}/${path}.json`, fetchFn).catch(() => null);
  return (
    (await read(locale))?.name ?? (locale === 'en-US' ? null : (await read('en-US'))?.name) ?? null
  );
}

const nameMap = (links: EntityLink[]): Record<string, string> =>
  Object.fromEntries(links.map((l) => [l.id, l.name]));

/**
 * The INDEX rows of all eight /explore scales (UXD-017). Names are the ones the entity pages
 * show, so a row and its page cannot drift; objects with no page keep the data's name, as the
 * scene's panels do. Server-only: the rows ride the route's server data, so the prerendered
 * HTML links every page and the client needs no fetch before the INDEX opens.
 */
export async function getScaleIndexRows(locale: string, fetchFn: FetchFn): Promise<ScaleIndexRows> {
  const json = <T>(path: string) => get<T>(path, fetchFn);
  const [
    bodyLinks,
    starLinks,
    blackHoleLinks,
    sunName,
    asteroidName,
    kuiperName,
    planets,
    smallBodies,
    satellites,
    belts,
    namedStars,
    systems,
    deepSky,
    cultureIds,
    milkyWay,
    localGroup,
    localSheet,
    virgo,
    laniakea,
    cosmicWeb,
    blackHoles,
  ] = await Promise.all([
    getEntityIndex('explore', locale, fetchFn),
    getStarLinks(locale, fetchFn),
    getBlackHoleLinks(locale, fetchFn),
    overlayName('sun', locale, fetchFn),
    overlayName('belts/asteroid', locale, fetchFn),
    overlayName('belts/kuiper', locale, fetchFn),
    json<{ planets: { name: string }[] }>('planets.json'),
    json<{ bodies: { id: string; name: string; type: string }[] }>('small-bodies.json'),
    json<{
      satellites: {
        id: string;
        name: string;
        parent_planet_id: string;
        parent_planet_name: string;
      }[];
    }>('satellites.json'),
    json<{ belts: { id: string; name: string }[] }>('belts.json'),
    getNamedStars(fetchFn),
    getExoplanetSystems(fetchFn),
    getDeepSkyObjects(fetchFn),
    getCultureObjectIds(fetchFn),
    getMilkyWaySchematic(fetchFn),
    getLocalGroup(fetchFn),
    getLocalSheet(fetchFn),
    getVirgo(fetchFn),
    getLaniakea(fetchFn),
    getCosmicWeb(fetchFn),
    getBlackHoles(fetchFn),
  ]);
  if (!milkyWay || !localGroup || !localSheet || !virgo || !laniakea || !cosmicWeb)
    throw new Error('universe data is missing: the scale INDEX cannot be built');
  return buildScaleIndexRows({
    locale,
    names: {
      body: nameMap(bodyLinks),
      star: nameMap(starLinks),
      blackHole: nameMap(blackHoleLinks),
      belt: {
        ...(asteroidName ? { asteroid: asteroidName } : {}),
        ...(kuiperName ? { kuiper: kuiperName } : {}),
      },
      sun: sunName ?? undefined,
    },
    pages: {
      body: new Set(bodyLinks.map((l) => l.id)),
      star: new Set(starLinks.map((l) => l.id)),
      blackHole: new Set(blackHoleLinks.map((l) => l.id)),
      deepSky: new Set<string>(deepSkyPageIds()),
    },
    deepSkyAlias: DEEP_SKY_ALIAS,
    planets: planets.planets,
    smallBodies: smallBodies.bodies,
    satellites: satellites.satellites,
    belts: belts.belts,
    namedStars,
    hostSystems: systems,
    deepSky: deepSky.map((o) => ({
      id: o.id,
      designation: o.designation,
      name: o.name,
      category: o.category,
    })),
    cultureIds,
    milkyWay,
    localGroup: localGroup.members,
    localSheet: localSheet.members,
    virgo: virgo.members,
    laniakea: laniakea.members,
    cosmicWeb: cosmicWeb.members,
    blackHoles,
  });
}
