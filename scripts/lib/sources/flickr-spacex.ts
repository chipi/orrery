// SpaceX Flickr adapter — public photostream feed (id 130608600@N05).
// No API key needed: the public feed endpoint returns the ~20 most-recent
// photos. SpaceX dedicates all its Flickr imagery to the public domain (CC0).

export interface SourceCandidate {
  imageUrl: string; // direct, fetchable, highest-res image URL
  sourceUrl: string; // human page URL (provenance source_url)
  title: string;
  author?: string; // credit / photographer / agency
  license_short: string; // e.g. 'CC0', 'PD-USGov', 'Unsplash-License'
  license_url?: string;
  source: string; // the adapter key
}

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const FEED =
  'https://www.flickr.com/services/feeds/photos_public.gne?id=130608600@N05&format=json&nojsoncallback=1';

interface FeedItem {
  title?: string;
  link?: string;
  media?: { m?: string };
}

export async function fetchSpacexFlickr(opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}): Promise<SourceCandidate[]> {
  // Feed only carries SpaceX imagery — skip unless SpaceX is the agency.
  if (opts.agency && opts.agency.toLowerCase() !== 'spacex') return [];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(FEED, {
      headers: { 'User-Agent': UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    // Feed sometimes serves invalid-escape JSON; parse text defensively.
    const text = await res.text();
    let items: FeedItem[] = [];
    try {
      items = (JSON.parse(text)?.items ?? []) as FeedItem[];
    } catch {
      return [];
    }

    const term = opts.query?.trim().toLowerCase() ?? '';
    const matched = term
      ? items.filter((it) => (it.title ?? '').toLowerCase().includes(term))
      : items;
    // SpaceX titles are terse — if the query matched nothing, fall back to the
    // newest N so the caller still gets real candidates.
    const chosen = (matched.length ? matched : items).slice(0, opts.limit);

    return chosen
      .map((it): SourceCandidate | null => {
        const m = it.media?.m;
        if (!m || !it.link) return null;
        // Upsize the thumbnail: '_m.jpg' (small) -> '_b.jpg' (large 1024).
        const imageUrl = m.replace(/_m\.jpg$/i, '_b.jpg');
        return {
          imageUrl,
          sourceUrl: it.link,
          title: it.title?.trim() || 'SpaceX',
          author: 'SpaceX',
          license_short: 'CC0',
          license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
          source: 'flickr-spacex',
        };
      })
      .filter((c): c is SourceCandidate => c !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
