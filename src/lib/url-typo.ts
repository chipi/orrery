/**
 * The `/route&param=value` typo (a literal `&` where `?` was meant), as shown on
 * the not-found page. Returns the corrected URL, or null when the path has no `&`
 * after its first character.
 *
 * `pathname` is the full URL path, so it already carries the app's base (staging's
 * `/orrery`); it must not be prefixed again. A real query string, if present, is
 * kept and the mistyped params are appended to it with `&`.
 */
export function suggestedCorrection(pathname: string, search: string): string | null {
  const ampIdx = pathname.indexOf('&');
  if (ampIdx <= 0) return null;
  const route = pathname.slice(0, ampIdx);
  const params = pathname.slice(ampIdx + 1);
  return search ? `${route}${search}&${params}` : `${route}?${params}`;
}
