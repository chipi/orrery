/**
 * Greedy label placement for a small map (the Moon's 2D discs): each label goes right of its dot,
 * else left; a label that would overlap one already placed, or leave the canvas, is dropped. Items
 * are placed in the given order, so the caller puts the selected site first. On a phone the two
 * discs are ~60 px across and every site drew its name, so the names lay on top of each other and
 * ran off the right edge (operator 2026-11-23).
 */
export interface LabelItem {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface PlacedLabel {
  /** Left edge of the text; null when the label is dropped. */
  left: number | null;
}

export function declutterLabels(
  items: LabelItem[],
  canvasW: number,
  gap = 6,
  margin = 4,
): PlacedLabel[] {
  const taken: Array<[number, number, number, number]> = [];
  const hits = (r: [number, number, number, number]) =>
    taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1]);
  return items.map((it) => {
    const top = it.y - it.h / 2;
    for (const left of [it.x + gap, it.x - gap - it.w]) {
      const r: [number, number, number, number] = [left, top, left + it.w, top + it.h];
      if (r[0] < margin || r[2] > canvasW - margin || hits(r)) continue;
      taken.push(r);
      return { left };
    }
    return { left: null };
  });
}
