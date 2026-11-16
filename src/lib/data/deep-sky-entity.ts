import type { FetchLike } from './core';
import type { CatalogueMap } from '$lib/catalogue';
import { findDeepSkyImage } from '$lib/deep-sky';
import {
  getCultureDoors,
  getDeepSkyGallery,
  getDeepSkyI18n,
  getDeepSkyObject,
  getPageHero,
  getUniverseHero,
  deepSkyPhotoHero,
  type DeepSkyCategory,
  type DeepSkyTextOverlay,
  type LocalizedCultureDoor,
  type PageHero,
  type UniverseHero,
} from './universe';
import { DEEP_SKY_ALIAS } from '../../../scripts/site-routes.mjs';

type Link = NonNullable<DeepSkyTextOverlay['links']>[number];

/** What a /explore/deep-sky/<id> page shows. */
export interface DeepSkyEntity {
  id: string;
  /** Catalogue designation ("M13") and the data's own name: English in every locale. */
  designation: string;
  name: string;
  category: DeepSkyCategory;
  distLy: number | null;
  mag: number | null;
  /** IAU constellation code. */
  con: string;
  fact: string;
  bio: string;
  links: Link[];
  /** Curated exoplanet host this star-forming region gateways to, or null. */
  gatewaySystem: string | null;
  /** Source and record link per catalogue-derived value, for the page's source lines and Data sources block. */
  catalogue: CatalogueMap;
  /** The object's SIMBAD / NED pages. */
  records: { simbad?: string; ned?: string };
  cultureDoors: LocalizedCultureDoor[];
  /** The gallery photograph's telescope, caption and credit; null for an object with no photo. */
  gallery: { telescope: string; caption: string; credit: string } | null;
  /** The object's photo, else its Local Group / Milky Way twin's panel hero (M33: NGC 604); or null. */
  hero: PageHero | null;
}

/** The panel hero of the scene ids that name this object (DEEP_SKY_ALIAS): M33's is its twin `triangulum`'s. */
async function twinHero(id: string, locale: string, fetchFn: FetchLike): Promise<UniverseHero | null> {
  for (const [alias, target] of Object.entries(DEEP_SKY_ALIAS)) {
    if (target !== id) continue;
    for (const level of ['local-group', 'milky-way'] as const) {
      const hero = await getUniverseHero(level, alias, locale, fetchFn);
      if (hero) return hero;
    }
  }
  return null;
}

/**
 * One deep-sky object for its /explore/deep-sky/<id> page: the catalogue record + locale
 * overlay (en-US fallback) + culture doors + the gallery fields of a photographed object.
 * An object with no overlay has no page, so it is null. Takes the prerender `fetch`.
 */
export async function getDeepSkyEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
): Promise<DeepSkyEntity | null> {
  const obj = await getDeepSkyObject(id, fetchFn);
  if (!obj || obj.id !== id) return null;
  const [o, doors, gallery] = await Promise.all([
    getDeepSkyI18n(locale, id, fetchFn),
    getCultureDoors(id, locale, fetchFn),
    obj.photoKey ? getDeepSkyGallery(fetchFn, locale) : [],
  ]);
  if (!o?.fact || !o.bio) return null;
  const image = findDeepSkyImage(gallery, obj.photoKey);
  const hero = await getPageHero(
    image ? deepSkyPhotoHero(image.key) : await twinHero(id, locale, fetchFn),
    locale,
    fetchFn,
  );
  return {
    id,
    designation: obj.designation,
    name: obj.name,
    category: obj.category,
    distLy: obj.dist_ly,
    mag: obj.mag,
    con: obj.con,
    fact: o.fact,
    bio: o.bio,
    links: o.links ?? [],
    gatewaySystem: obj.gatewaySystem,
    catalogue: obj.catalogue ?? {},
    records: obj.records ?? {},
    cultureDoors: doors,
    gallery: image
      ? { telescope: image.telescope, caption: image.caption, credit: image.credit }
      : null,
    hero,
  };
}
