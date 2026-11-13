/**
 * Which filter chips of an INDEX stay on the one line and which fold behind the FILTERS button
 * (UXD-017, C6-F). Pure: the component measures the chips and passes the widths.
 *
 * Chip 0 is All and always stays. When every chip fits the line there is no fold and no button;
 * otherwise the line is All plus the chips taken in `priority` order while they fit. The first chip
 * that does not fit ends the walk, so which chips are visible does not jump around with a width a
 * few pixels apart. (The button is not on this line: it sits beside the count, so it reserves no
 * width here.)
 */
export function fitChips(
  widths: number[],
  gap: number,
  available: number,
  priority: number[],
): { visible: number[]; folded: number[] } {
  const all = widths.map((_, i) => i);
  const total = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, widths.length - 1);
  if (widths.length <= 1 || total <= available) return { visible: all, folded: [] };
  const taken = new Set<number>([0]);
  let used = widths[0];
  for (const i of priority) {
    if (i <= 0 || i >= widths.length || taken.has(i)) continue;
    if (used + gap + widths[i] > available) break;
    taken.add(i);
    used += gap + widths[i];
  }
  return {
    visible: all.filter((i) => taken.has(i)),
    folded: all.filter((i) => !taken.has(i)),
  };
}
