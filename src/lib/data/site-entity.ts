import { get, type FetchLike } from './core';
import { getSiteStory, type SiteStory } from './site-stories';
import type { SurfaceSite } from '$types/surface-site';

export type SiteBody = 'moon' | 'mars' | 'venus';

/** A surface site's localized text fields (the overlay; base names are English). */
export interface SiteText {
  name?: string;
  site_name?: string;
  mission_type?: string;
  crew?: string;
  left?: string;
  fact?: string;
  capability?: string;
}

export interface SiteEntity {
  site: SurfaceSite;
  text: SiteText;
  story: SiteStory | null;
}

/**
 * One surface site for its /<body>/<id> page (0.9.8 SEO): the base record, its
 * locale overlay (en-US fallback) and site story. Reads only what the page
 * shows — the map's list loaders also merge hotspot sidecars it does not need —
 * and takes the prerender `fetch`.
 */
export async function getSiteEntity(
  body: SiteBody,
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
): Promise<SiteEntity | null> {
  const sites = await get<SurfaceSite[]>(`${body}-sites.json`, fetchFn);
  const site = sites.find((s) => s.id === id);
  if (!site) return null;
  const overlay = (path: string) => get<SiteText>(path, fetchFn).catch(() => null);
  const text =
    (await overlay(`i18n/${locale}/${body}-sites/${id}.json`)) ??
    (locale === 'en-US' ? null : await overlay(`i18n/en-US/${body}-sites/${id}.json`)) ??
    {};
  const story = await getSiteStory(id, locale, fetchFn);
  return { site, text, story };
}
