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

    // SpaceX feed titles are terse ("Starship Test Flight Mission"), so a full
    // enriched query ("starship demo SpaceX mars spacecraft") never substring-
    // matches. Match instead on any DISTINCTIVE token of the mission name/query
    // (drop generic craft/agency words). Precise-or-nothing: no token hit → [].
    const STOP = new Set([
      'spacex',
      'spacecraft',
      'mission',
      'rocket',
      'launch',
      'mars',
      'moon',
      'earth',
      'orbit',
      'orbiter',
      'lander',
      'rover',
      'crewed',
      'nasa',
    ]);
    const tokens = `${opts.name ?? ''} ${opts.query ?? ''}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !STOP.has(t));
    const matched = tokens.length
      ? items.filter((it) => {
          const title = (it.title ?? '').toLowerCase();
          return tokens.some((t) => title.includes(t));
        })
      : items;
    const chosen = matched.slice(0, opts.limit);

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
