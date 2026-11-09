import { get, type FetchLike } from './core';

/** One illustrated site map (static/data/site-illustrations.json). */
export interface SiteIllustration {
  siteId: string;
  body: 'moon' | 'mars';
  title: string;
  /** Path under static/, e.g. images/illustrations/sites/apollo15.webp. */
  file: string;
  model: string;
  tool: string;
  generated: string;
  made_from: string;
}

/** The site's illustration, or null (most sites have none). A missing sidecar is not an error. */
export async function getSiteIllustration(
  siteId: string,
  fetchFn: FetchLike = fetch,
): Promise<SiteIllustration | null> {
  const doc = await get<{ illustrations: SiteIllustration[] }>(
    'site-illustrations.json',
    fetchFn,
  ).catch(() => null);
  return doc?.illustrations.find((i) => i.siteId === siteId) ?? null;
}
