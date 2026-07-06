/**
 * Unsplash source adapter — NASA + SpaceX official streams.
 *
 * The Unsplash search endpoint returns 0 results without an API key,
 * so we BROWSE the agency's photo stream (napi/users/<user>/photos)
 * across a few pages and keyword-filter locally against the query.
 * This needs no key and is the only reliable no-auth path.
 */

export interface SourceCandidate {
  imageUrl: string;
  sourceUrl: string;
  title: string;
  author?: string;
  license_short: string;
  license_url?: string;
  source: string;
}

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// Only NASA + SpaceX run official verified Unsplash accounts.
const USER_BY_AGENCY: Record<string, string> = { NASA: 'nasa', SpaceX: 'spacex' };

interface UnsplashPhoto {
  urls?: { raw?: string; full?: string };
  description?: string | null;
  alt_description?: string | null;
  slug?: string;
  user?: { name?: string };
  links?: { html?: string };
}

export async function fetchUnsplash(opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}): Promise<SourceCandidate[]> {
  const user = opts.agency ? USER_BY_AGENCY[opts.agency] : undefined;
  if (!user) return [];

  // Split query into lowercase terms; an item matches if it contains ANY term.
  const terms = opts.query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const out: SourceCandidate[] = [];
  for (let page = 1; page <= 4 && out.length < opts.limit; page++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const url = `https://unsplash.com/napi/users/${user}/photos?per_page=30&page=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      if (!res.ok) break;
      const photos = (await res.json()) as UnsplashPhoto[];
      if (!Array.isArray(photos) || photos.length === 0) break;

      for (const p of photos) {
        const hay =
          `${p.description ?? ''} ${p.alt_description ?? ''} ${p.slug ?? ''}`.toLowerCase();
        if (!terms.some((t) => hay.includes(t))) continue;
        const imageUrl = p.urls?.raw ?? p.urls?.full;
        const sourceUrl = p.links?.html;
        if (!imageUrl || !sourceUrl) continue;
        out.push({
          imageUrl,
          sourceUrl,
          title: (p.description ?? p.alt_description ?? p.slug ?? 'Untitled').trim(),
          author: p.user?.name,
          license_short: 'Unsplash-License',
          license_url: 'https://unsplash.com/license',
          source: 'unsplash',
        });
        if (out.length >= opts.limit) break;
      }
    } catch {
      // Timeout / network / parse error — abandon this source, never throw.
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  return out;
}
