import { get, type FetchLike } from './core';

/** One illustrated site map (static/data/site-illustrations.json). */
export interface SiteIllustration {
  siteId: string;
  body: 'moon' | 'mars';
  title: string;
  /** The image description (alt text); localized from i18n-src/<locale>/site-illustrations.json. */
  alt?: string;
  /** Path under static/, e.g. images/illustrations/sites/apollo15.webp. */
  file: string;
  model: string;
  tool: string;
  generated: string;
  made_from: string;
}

/** Locale overlay (i18n-src/<locale>/site-illustrations.json): alt text by siteId. */
type SiteIllustrationOverlay = Record<string, { alt?: string }>;

/**
 * The site's illustration, or null (most sites have none). A missing sidecar is not an error;
 * a missing overlay leaves the English alt.
 */
export async function getSiteIllustration(
  siteId: string,
  locale: string = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<SiteIllustration | null> {
  const doc = await get<{ illustrations: SiteIllustration[] }>(
    'site-illustrations.json',
    fetchFn,
  ).catch(() => null);
  const base = doc?.illustrations.find((i) => i.siteId === siteId) ?? null;
  if (!base || locale === 'en-US') return base;
  const overlay = await get<SiteIllustrationOverlay>(
    `i18n/${locale}/site-illustrations.json`,
    fetchFn,
  ).catch(() => null);
  const alt = overlay?.[siteId]?.alt;
  return alt ? { ...base, alt } : base;
}
