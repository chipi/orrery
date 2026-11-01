/**
 * Drop utm_* tracking parameters from a URL. Commons' imageinfo API appends
 * ?utm_source=commons.wikimedia.org&utm_campaign=imageinfo… to the URLs it
 * returns; we neither pass someone else's tracking on to readers nor let it
 * leak into a filename (a filename ending "?utm_…" fails the API lookup and
 * the credit falls back to defaults). Unparseable values pass through.
 */
export function stripTracking<T extends string | undefined | null>(url: T): T {
  if (!url) return url;
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    return u.toString() as T;
  } catch {
    return url;
  }
}
