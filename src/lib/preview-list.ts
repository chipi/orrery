/**
 * The one length rule of the long text pages (/credits, /colophon; /library follows):
 * a list draws its first PREVIEW rows and a "Show all N" chip (`ShowAll.svelte`); the
 * headers stay open. A full scroll of /colophon loaded ~63 MB of images before the rule
 * (image-weight.spec, 2026-11-07), /credits 43 MB.
 *
 * The expanded flag is runtime state held by the page, never stored.
 */
export const PREVIEW = 10;

export function previewList<T>(
  list: readonly T[],
  expanded: boolean | undefined,
  n: number = PREVIEW,
): readonly T[] {
  return expanded ? list : list.slice(0, n);
}

/** True while the chip is needed: more rows than the cap, and not yet expanded. */
export function isCapped(
  count: number,
  expanded: boolean | undefined,
  n: number = PREVIEW,
): boolean {
  return count > n && !expanded;
}
