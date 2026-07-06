/**
 * First-party image-source registry (0.7.3). Routes a mission/fleet entity to
 * the official sources that cover it (Unsplash, SpaceX Flickr, NASA galleries,
 * ESA photo library), tried BEFORE the Commons keyword-search failover. Each
 * adapter returns SourceCandidate[] with real credit + license; the caller
 * runs them through pHash-dedup + the vision quality-gate before landing.
 */
import { fetchUnsplash } from './unsplash.ts';
import { fetchSpacexFlickr } from './flickr-spacex.ts';
import { fetchNasaGallery, hasNasaGallerySlug } from './nasa-gallery.ts';
import { fetchEsaPortal } from './esa-portal.ts';

export interface SourceCandidate {
  imageUrl: string;
  sourceUrl: string;
  title: string;
  author?: string;
  license_short: string;
  license_url?: string;
  source: string;
}

type FetchFn = (opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}) => Promise<SourceCandidate[]>;

interface Adapter {
  name: string;
  fetch: FetchFn;
  /** Does this source cover the given agency / mission? */
  covers: (agency?: string, missionId?: string) => boolean;
}

const has = (agency: string | undefined, needle: string) =>
  (agency ?? '').toLowerCase().includes(needle);

// Order = preference. Agency-official first, then the broad ones.
const ADAPTERS: Adapter[] = [
  {
    name: 'esa-portal',
    fetch: fetchEsaPortal,
    covers: (a) => has(a, 'esa') || has(a, 'european space'),
  },
  { name: 'flickr-spacex', fetch: fetchSpacexFlickr, covers: (a) => has(a, 'spacex') },
  {
    name: 'nasa-gallery',
    fetch: fetchNasaGallery,
    // NASA hosts galleries for missions it flies even when the operating
    // agency isn't NASA (Blue Origin CLPS lander) — cover those by known slug.
    covers: (a, id) => has(a, 'nasa') || (id ? hasNasaGallerySlug(id) : false),
  },
  { name: 'unsplash', fetch: fetchUnsplash, covers: (a) => has(a, 'nasa') || has(a, 'spacex') },
];

/** Adapters that cover this agency/mission, in preference order. */
export function sourcesFor(agency?: string, missionId?: string): Adapter[] {
  return ADAPTERS.filter((a) => a.covers(agency, missionId));
}

/**
 * Gather candidates from every first-party source covering `agency`, in
 * preference order, up to `limit` each. Never throws — a failing adapter
 * contributes nothing. Deduped by imageUrl.
 */
export async function gatherFromSources(opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}): Promise<SourceCandidate[]> {
  const adapters = sourcesFor(opts.agency, opts.missionId);
  const out: SourceCandidate[] = [];
  const seen = new Set<string>();
  for (const a of adapters) {
    let got: SourceCandidate[] = [];
    try {
      got = await a.fetch(opts);
    } catch {
      got = [];
    }
    for (const c of got) {
      if (seen.has(c.imageUrl)) continue;
      seen.add(c.imageUrl);
      out.push(c);
    }
  }
  return out;
}
