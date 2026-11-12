import { get, type FetchLike } from './core';
import {
  getCultureDoors,
  type BlackHole,
  type BlackHoleOverlay,
  type LocalizedCultureDoor,
} from './universe';

/** The only black hole with a picture in the repo: the Event Horizon Telescope image of M87*. */
const HERO: Record<string, string> = { 'm87-star': '/images/science/black-holes-m87.webp' };

/** What a /explore/black-holes/<id> page shows. */
export interface BlackHoleEntity {
  id: string;
  name: string;
  kind: BlackHole['kind'];
  /** Mass, distance and Schwarzschild radius, shown for the three real holes only. */
  massSolar: number | null;
  distLy: number | null;
  rsKm: number | null;
  fact?: string;
  bio?: string;
  discovery: string;
  scienceSection: string;
  cultureDoors: LocalizedCultureDoor[];
  /** The served image path and its localized alt text, or null. */
  hero: { src: string; alt: string } | null;
}

/**
 * One black hole for its page: the catalogue record + locale overlay (en-US fallback) +
 * culture doors. Gargantua is fiction: its mass, distance, spin and radius are model
 * parameters with no source, so the page carries none of them. Spin is left off the real
 * holes too (no source for any of the three). Takes the prerender `fetch`.
 */
export async function getBlackHoleEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
): Promise<BlackHoleEntity | null> {
  const doc = await get<{ objects: BlackHole[] }>('universe/black-holes.json', fetchFn);
  const hole = doc.objects.find((h) => h.id === id);
  if (!hole) return null;

  const overlay = async <T>(dir: string, key: string): Promise<T | null> =>
    (await get<T>(`i18n/${locale}/${dir}/${key}.json`, fetchFn).catch(() => null)) ??
    (locale === 'en-US'
      ? null
      : await get<T>(`i18n/en-US/${dir}/${key}.json`, fetchFn).catch(() => null));

  const [o, doors, hero] = await Promise.all([
    overlay<BlackHoleOverlay>('universe/black-holes', id),
    getCultureDoors(id, locale, fetchFn),
    HERO[id] ? heroFor(HERO[id], locale, fetchFn) : null,
  ]);

  const real = hole.kind !== 'fictional';
  return {
    id,
    name: o?.name ?? hole.name,
    kind: hole.kind,
    massSolar: real ? hole.mass_solar : null,
    distLy: real ? hole.dist_ly : null,
    rsKm: real ? hole.rs_km : null,
    fact: o?.fact,
    bio: o?.bio,
    discovery: o?.discovery ?? hole.discovery,
    scienceSection: hole.science_section,
    cultureDoors: doors,
    hero,
  };
}

async function heroFor(src: string, locale: string, fetchFn: FetchLike) {
  const alts = async (l: string) =>
    (await get<Record<string, string>>(`image-alt-text/${l}.json`, fetchFn).catch(() => null)) ??
    {};
  const alt = (await alts(locale))[src] || (locale === 'en-US' ? '' : (await alts('en-US'))[src]);
  return { src, alt: alt || '' };
}
