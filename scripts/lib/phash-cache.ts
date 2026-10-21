/** The near-dupe scan only sees images that have a cached hash: a master with no
 *  entry is silently skipped — that is how 440 images went unchecked until
 *  2026-10-21. Scripts that replace an image drop its entry, so a changed image
 *  shows up here as missing. (Freshness by mtime is not used: a checkout
 *  re-stamps every file.) */
export function cacheGaps(
  cache: { phashes: Record<string, string> },
  masterUrls: Iterable<string>,
): string[] {
  const missing: string[] = [];
  for (const url of masterUrls) if (!(url in cache.phashes)) missing.push(url);
  return missing;
}
