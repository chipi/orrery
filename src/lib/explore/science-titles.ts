/**
 * Section titles for `tab/section` slugs, in the reader's language, from the science index
 * (`static/data/science-index.<locale>.json`, English when that one cannot be loaded). One fetch
 * per locale, kept for the session; the level card reads its links' titles from it.
 */
import { base } from '$app/paths';

type IndexEntry = { tab: string; section: string; title: string };

const cache = new Map<string, Promise<Map<string, string>>>();

export function loadScienceTitles(
  locale: string,
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, string>> {
  let p = cache.get(locale);
  if (!p) {
    p = (async () => {
      const urls = [
        ...(locale === 'en-US' ? [] : [`${base}/data/science-index.${locale}.json`]),
        `${base}/data/science-index.json`,
      ];
      for (const url of urls) {
        try {
          const res = await fetchFn(url);
          if (!res.ok) continue;
          const entries = (await res.json()) as IndexEntry[];
          return new Map(entries.map((e) => [`${e.tab}/${e.section}`, e.title]));
        } catch {
          // try the next one
        }
      }
      return new Map<string, string>();
    })();
    cache.set(locale, p);
  }
  return p;
}
