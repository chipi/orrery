/**
 * How far through a scroll container the reader is, 0-100 (#521 read depth).
 * Content that fits without scrolling counts as fully read (100).
 */
export function readDepthPct(
  el: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>,
): number {
  const scrollable = el.scrollHeight - el.clientHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((el.scrollTop / scrollable) * 100)));
}
