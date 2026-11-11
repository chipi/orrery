import { readFileSync } from 'node:fs';
import { getFleet, getMission } from '$lib/data';
import { getBodyEntity } from '$lib/data/body-entity';
import { getSiteEntity, type SiteBody } from '$lib/data/site-entity';
import type { FleetCategory } from '$types/fleet';
import missionIndex from '$data/missions/index.json';
import fleetIndex from '$data/fleet/index.json';
import { collectCanonicalRoutes } from '../../../scripts/site-routes.mjs';

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
