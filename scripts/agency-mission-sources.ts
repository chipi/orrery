/**
 * ADR-046 — agency-normalised routing for mission gallery primary URLs.
 * Used by `scripts/fetch-assets.ts` at build time only.
 */

export type AgencyKey =
  | 'NASA'
  | 'ROSCOSMOS'
  | 'ESA'
  | 'CNSA'
  | 'ISRO'
  | 'JAXA'
  | 'UAESA'
  | 'SPACEX'
  | 'BLUE_ORIGIN'
  | 'INSPIRATION_MARS'
  | 'UNKNOWN';

/** Maps `static/data/missions/index.json` `agency` strings to a closed key. */
export function normalizeAgency(agency: string): AgencyKey {
  const a = agency.trim();
  switch (a) {
    case 'NASA':
      return 'NASA';
    case 'ROSCOSMOS':
      return 'ROSCOSMOS';
    case 'ESA':
      return 'ESA';
    case 'CNSA':
      return 'CNSA';
    case 'ISRO':
      return 'ISRO';
    case 'JAXA':
      return 'JAXA';
    case 'UAESA':
      return 'UAESA';
    case 'SpaceX':
      return 'SPACEX';
    case 'Blue Origin':
      return 'BLUE_ORIGIN';
    case 'Inspiration Mars':
      return 'INSPIRATION_MARS';
    default:
      return 'UNKNOWN';
  }
}

export type FetchNasaGalleryUrlsFn = (
  query: string,
  max: number,
  missionId?: string,
) => Promise<string[]>;

export type AgencyPrimarySourceTag = 'nasa-api' | 'nasa-api-empty' | 'none';

/**
 * Returns **direct image** preview URLs (same contract as NASA Images API
 * `links[].href`). Non-NASA keys return `[]` here — editorial “primary” for
 * those operators is the curated Wikimedia pass in `fetch-assets.ts`.
 */
export async function fetchAgencyPrimaryImageUrls(params: {
  agencyKey: AgencyKey;
  missionId: string;
  query: string;
  max: number;
  fetchNasaGalleryUrls: FetchNasaGalleryUrlsFn;
}): Promise<{ urls: string[]; sourceTag: AgencyPrimarySourceTag }> {
  if (params.agencyKey === 'NASA') {
    try {
      const urls = await params.fetchNasaGalleryUrls(params.query, params.max, params.missionId);
      return { urls, sourceTag: urls.length > 0 ? 'nasa-api' : 'nasa-api-empty' };
    } catch {
      return { urls: [], sourceTag: 'nasa-api-empty' };
    }
  }
  return { urls: [], sourceTag: 'none' };
}
