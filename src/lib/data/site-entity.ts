import { get, type FetchLike } from './core';
import { getSiteStory, type SiteStory } from './site-stories';
import { getMission, getMissionIndex } from './missions';
import { getFleet } from './fleet';
import { getSiteIllustration, type SiteIllustration } from './site-illustrations';
import type { FleetIndexEntry } from '$types/fleet';
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

/** The mission that flew to the site: its name and one-liner in the locale, and its hardware. */
export interface SiteMission {
  id: string;
  name: string;
  first: string | null;
  hardware: { id: string; name: string; tagline: string | null; agency: string }[];
}

export interface SiteEntity {
  site: SurfaceSite;
  text: SiteText;
  story: SiteStory | null;
  illustration: SiteIllustration | null;
  mission: SiteMission | null;
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
  const illustration = await getSiteIllustration(id, locale, fetchFn);
  return {
    site,
    text,
    story,
    illustration,
    mission: await siteMission(site.mission_id, locale, fetchFn),
  };
}

async function siteMission(
  missionId: string | undefined,
  locale: string,
  fetchFn: FetchLike,
): Promise<SiteMission | null> {
  if (!missionId) return null;
  const entry = (await getMissionIndex(fetchFn)).find((x) => x.id === missionId);
  const mission = entry && (await getMission(entry.id, entry.dest, locale, fetchFn));
  if (!mission) return null;
  const fleet = await get<FleetIndexEntry[]>('fleet/index.json', fetchFn);
  const hardware = (
    await Promise.all(
      [...new Set((mission.fleet_refs ?? []).map((r) => r.id))].map(async (refId) => {
        const row = fleet.find((x) => x.id === refId);
        const e = row && (await getFleet(row.id, row.category, locale, fetchFn));
        return e
          ? { id: refId, name: e.name ?? refId, tagline: e.tagline ?? null, agency: e.agency }
          : null;
      }),
    )
  ).filter((h) => h !== null);
  return { id: missionId, name: mission.name ?? missionId, first: mission.first ?? null, hardware };
}
