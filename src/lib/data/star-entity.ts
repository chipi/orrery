import { get, type FetchLike } from './core';
import {
  getCultureDoors,
  type ExoplanetOverlay,
  type ExoplanetPlanet,
  type ExoplanetSystem,
  type LocalizedCultureDoor,
  type NamedStar,
  type NamedStarOverlay,
} from './universe';

type Link = NonNullable<NamedStarOverlay['links']>[number];

/** A planet of the host star's system: the NASA record plus its overlay text. */
export interface StarPlanet extends ExoplanetPlanet {
  fact?: string;
  bio?: string;
  links: Link[];
  cultureDoors: LocalizedCultureDoor[];
}

/** What a /explore/stars/<id> page shows: the star, and its planetary system if it has one. */
export interface StarEntity {
  id: string;
  name: string;
  hip: number | null;
  /** Spectral class, constellation code, B−V and distance: the TECHNICAL rows. */
  spect: string | null;
  con: string | null;
  bv: number | null;
  distPc: number;
  /** Magnitudes exist only for the named-star catalogue; the four host-only stars have none. */
  mag?: number;
  absmag?: number;
  fact?: string;
  bio?: string;
  cultural?: string;
  links: Link[];
  cultureDoors: LocalizedCultureDoor[];
  /** The system's planets, empty for a star with none. */
  planets: StarPlanet[];
  /** Named stars open in the scene by ?goto=<id>; host-only stars only by ?system=<id>. */
  named: boolean;
}

/**
 * One star for its /explore/stars/<id> page: the named-star record + locale overlay
 * (en-US fallback), or, for the four host stars that are not in the named-star
 * catalogue (trappist-1, 51-pegasi, toi-700, kepler-16), the system record's `star`.
 * A host's planets carry their own overlay text. Takes the prerender `fetch`.
 */
export async function getStarEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
): Promise<StarEntity | null> {
  const overlay = async <T>(dir: string, key: string): Promise<T | null> =>
    (await get<T>(`i18n/${locale}/${dir}/${key}.json`, fetchFn).catch(() => null)) ??
    (locale === 'en-US'
      ? null
      : await get<T>(`i18n/en-US/${dir}/${key}.json`, fetchFn).catch(() => null));

  const [{ stars }, { systems }] = await Promise.all([
    get<{ stars: NamedStar[] }>('universe/named-stars.json', fetchFn),
    get<{ systems: ExoplanetSystem[] }>('universe/exoplanet-systems.json', fetchFn),
  ]);
  const star = stars.find((s) => s.id === id);
  const system = systems.find((s) => s.hostId === id);
  if (!star && !system) return null;

  const [o, doors, planets] = await Promise.all([
    star ? overlay<NamedStarOverlay>('universe/named-stars', id) : null,
    getCultureDoors(id, locale, fetchFn),
    Promise.all(
      (system?.planets ?? []).map(async (p): Promise<StarPlanet> => {
        const [po, pd] = await Promise.all([
          overlay<ExoplanetOverlay>('universe/exoplanets', p.id),
          getCultureDoors(p.id, locale, fetchFn),
        ]);
        return { ...p, fact: po?.fact, bio: po?.bio, links: po?.links ?? [], cultureDoors: pd };
      }),
    ),
  ]);

  const base = star ?? system!.star;
  return {
    id,
    name: o?.name ?? (star ? star.proper : system!.star.name),
    hip: star ? star.hip : (system!.hip ?? null),
    spect: base.spect,
    con: base.con,
    bv: base.bv,
    distPc: base.dist_pc,
    mag: star?.mag,
    absmag: star?.absmag,
    fact: o?.fact,
    bio: o?.bio,
    cultural: o?.cultural,
    links: o?.links ?? [],
    cultureDoors: doors,
    planets,
    named: !!star,
  };
}
